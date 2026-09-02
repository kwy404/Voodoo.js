/**
 * @module benchmarks/harness/dom
 *
 * jsdom para os benchmarks, e o carregamento da Voodoo dentro dele.
 *
 * Duas coisas importam aqui:
 *
 * 1. O bundle e feito na hora, com o esbuild que ja esta em `node_modules`,
 *    direto de `src/index.ts`. Nao existe flag de benchmark, nao existe atalho:
 *    e o mesmo codigo que o `tsup` publica, so que sem minificacao.
 *
 * 2. A Voodoo guarda estado no proprio modulo (indice de directives, cache de
 *    expressoes, registro de componentes). Para um caso pedir uma instancia
 *    limpa de verdade, `loadVoodoo({ fresh: true })` reimporta o bundle com uma
 *    chave nova de cache, o que reavalia o modulo inteiro. E o que o benchmark
 *    de cold start precisa.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { buildDir, srcRoot, repoRoot } from './paths.mjs';

const BUNDLE = path.join(buildDir, 'voodoo.bench.mjs');

/**
 * Referencia de codigo medida.
 *
 * Por padrao o benchmark compila a arvore de trabalho, que e o que o
 * desenvolvedor tem na mao. Com `--ref=<commit>` (ou `VOODOO_BENCH_REF`) ele
 * materializa aquele commit em `.build/src-<ref>/` com `git archive` e mede
 * exatamente aquilo.
 *
 * Isto existe por um motivo concreto: uma baseline so vale se for reproduzivel.
 * Medir uma arvore de trabalho suja produz um numero que ninguem consegue
 * recriar depois.
 */
export function resolveRef() {
  const fromArgv = process.argv.find((a) => a.startsWith('--ref='));
  return (fromArgv ? fromArgv.slice('--ref='.length) : process.env.VOODOO_BENCH_REF) || null;
}

/** Extrai `packages/voodoojs/src` de um commit para uma pasta propria. */
function materializeRef(ref) {
  const sha = execFileSync('git', ['rev-parse', ref], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const dest = path.join(buildDir, `src-${sha.slice(0, 12)}`);
  const stamp = path.join(dest, '.stamp');
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === sha) {
    return { dir: path.join(dest, 'packages', 'voodoojs', 'src'), sha };
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  // Escrita arquivo a arquivo em vez de `git archive | tar`: o `tar` do Git for
  // Windows le `C:\...` como nome de host remoto e recusa o caminho.
  const listing = execFileSync('git', ['ls-tree', '-r', '--name-only', sha, '--', 'packages/voodoojs/src'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1 << 24,
  })
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const rel of listing) {
    const content = execFileSync('git', ['show', `${sha}:${rel}`], {
      cwd: repoRoot,
      maxBuffer: 1 << 26,
    });
    const target = path.join(dest, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  fs.writeFileSync(stamp, sha, 'utf8');
  return { dir: path.join(dest, 'packages', 'voodoojs', 'src'), sha, files: listing.length };
}

/** Globais do navegador que o runtime da Voodoo espera encontrar. */
const GLOBAL_KEYS = [
  'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement',
  'HTMLFormElement', 'HTMLTemplateElement', 'HTMLAnchorElement', 'HTMLImageElement',
  'Node', 'Text', 'Comment', 'DocumentFragment', 'NodeFilter', 'SVGElement',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'FocusEvent',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'localStorage', 'sessionStorage', 'matchMedia', 'CSS',
  'DOMParser', 'XMLSerializer', 'FormData', 'Blob', 'File', 'FileList',
  'location', 'history', 'screen', 'CSSStyleDeclaration',
];

let bundleStamp = null;
let lastBuild = null;

/** Descreve a fonte que o ultimo bundle usou. Vai para o bloco de ambiente. */
export function buildInfo() {
  return lastBuild;
}

/**
 * Diretorio `src` que esta efetivamente sendo medido: a arvore de trabalho, ou
 * a copia materializada do commit pedido em `--ref`.
 *
 * Existe para as sondas que precisam compilar um ponto de entrada proprio e
 * ainda assim medir exatamente o mesmo codigo que a suite mediu.
 */
export function measuredSrcDir(ref = resolveRef()) {
  if (!ref) return { dir: srcRoot, sha: null, source: 'working tree' };
  const { dir, sha } = materializeRef(ref);
  return { dir, sha, source: `git ref ${ref}` };
}

/**
 * Compila um ponto de entrada arbitrario para um ESM unico.
 *
 * `index.ts` nao reexporta tudo — `queryDirective` e o mapa de directives, por
 * exemplo, sao internos. Uma sonda que precise deles compila um ponto de
 * entrada proprio em vez de medir um substituto e chamar de equivalente.
 */
export async function compileEntry(entryFile, outfile) {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    outfile,
    sourcemap: false,
    minify: false,
    logLevel: 'silent',
  });
  return outfile;
}

async function compile(entryDir, outfile) {
  const esbuild = await import('esbuild');
  const t0 = process.hrtime.bigint();
  await esbuild.build({
    entryPoints: [path.join(entryDir, 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    outfile,
    sourcemap: false,
    minify: false,
    logLevel: 'silent',
    // A Voodoo nao importa nada de fora; o bundle e fechado.
  });
  return Number(process.hrtime.bigint() - t0) / 1e6;
}

/**
 * Compila `src/index.ts` para um unico ESM.
 *
 * Se a arvore de trabalho nao compilar — o que acontece enquanto alguem esta
 * editando — o benchmark NAO inventa um resultado nem mede um bundle velho:
 * ele cai para o ultimo commit, avisa em voz alta, e registra no ambiente
 * exatamente qual codigo foi medido.
 */
export async function buildBundle({ force = false, ref = resolveRef() } = {}) {
  fs.mkdirSync(buildDir, { recursive: true });

  if (ref) {
    const { dir, sha } = materializeRef(ref);
    const ms = await compile(dir, BUNDLE);
    lastBuild = { source: `git ref ${ref}`, sha, dirty: false, fallback: false };
    return { file: BUNDLE, rebuilt: true, bytes: fs.statSync(BUNDLE).size, buildMs: ms, ...lastBuild };
  }

  const newest = newestMtime(srcRoot);
  const current = fs.existsSync(BUNDLE) ? fs.statSync(BUNDLE).mtimeMs : 0;
  if (!force && current > newest && bundleStamp === newest && lastBuild) {
    return { file: BUNDLE, rebuilt: false, bytes: fs.statSync(BUNDLE).size, ...lastBuild };
  }

  try {
    const ms = await compile(srcRoot, BUNDLE);
    bundleStamp = newest;
    lastBuild = { source: 'working tree', sha: null, fallback: false };
    return { file: BUNDLE, rebuilt: true, bytes: fs.statSync(BUNDLE).size, buildMs: ms, ...lastBuild };
  } catch (err) {
    const first = err?.errors?.[0];
    const where = first ? `${first.location?.file}:${first.location?.line} ${first.text}` : String(err);
    console.warn(
      `\n!! A arvore de trabalho nao compila (${where}).\n` +
        `!! Caindo para HEAD para que a medicao continue reproduzivel.\n` +
        `!! O relatorio vai dizer que mediu HEAD, e nao os arquivos editados.\n`
    );
    const { dir, sha } = materializeRef('HEAD');
    const ms = await compile(dir, BUNDLE);
    lastBuild = { source: 'HEAD (working tree does not compile)', sha, fallback: true, compileError: where };
    return { file: BUNDLE, rebuilt: true, bytes: fs.statSync(BUNDLE).size, buildMs: ms, ...lastBuild };
  }
}

function newestMtime(dir) {
  let newest = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.ts')) {
        const m = fs.statSync(full).mtimeMs;
        if (m > newest) newest = m;
      }
    }
  }
  return newest;
}

let currentDom = null;

/**
 * Instala um documento jsdom limpo como ambiente global do processo.
 * Devolve a instancia, para o chamador poder fecha-la depois.
 */
export function installDom(html = '<!doctype html><html><head></head><body></body></html>') {
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/bench' });
  const w = dom.window;

  define('window', w);
  define('document', w.document);
  define('self', w);
  for (const key of GLOBAL_KEYS) {
    if (key in w) define(key, w[key]);
  }
  // `navigator` e somente leitura no Node moderno; entregamos o do jsdom por
  // descritor para o codigo que le `navigator.userAgent` nao quebrar.
  define('navigator', w.navigator);

  currentDom = dom;
  return dom;
}

function define(key, value) {
  try {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true, enumerable: false });
  } catch {
    /* Algumas chaves do Node sao intocaveis; seguir sem elas e melhor que abortar. */
  }
}

/** Fecha o documento atual e libera os timers do jsdom. */
export function closeDom(dom = currentDom) {
  try {
    dom?.window?.close();
  } catch {
    /* ignorado: fechar duas vezes nao e erro para o benchmark */
  }
  if (dom === currentDom) currentDom = null;
}

/** Limpa o corpo do documento sem trocar de instancia. */
export function resetBody() {
  if (!globalThis.document) return;
  globalThis.document.body.innerHTML = '';
}

let freshCounter = 0;

/**
 * Importa a Voodoo. Com `fresh: true` o modulo e reavaliado do zero, o que
 * custa tempo mas devolve todo o estado interno virgem.
 */
export async function loadVoodoo({ fresh = false } = {}) {
  await buildBundle();
  const url = pathToFileURL(BUNDLE).href + (fresh ? `?fresh=${++freshCounter}` : '');
  return import(url);
}

export const bundlePath = BUNDLE;
