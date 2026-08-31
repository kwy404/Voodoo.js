#!/usr/bin/env node
/**
 * Fotografa a superficie publica da voodoojs.
 *
 *   node scripts/api-snapshot.mjs            imprime o snapshot atual
 *   node scripts/api-snapshot.mjs --update   regrava packages/voodoojs/api-snapshot.json
 *   node scripts/api-snapshot.mjs --json     so o json, sem texto em volta
 *
 * O metodo preferido e o de runtime: monta um DOM com jsdom, importa
 * `dist/index.js` de verdade e enumera o que existe. E a unica leitura que nao
 * mente, porque conta o que o usuario final realmente recebe — inclusive as
 * directives e magics que so aparecem por efeito colateral de import.
 *
 * Se o dist nao existe ou a importacao quebra, cai para uma leitura estatica do
 * `src`, e grava `method: "static"` no arquivo. Quem consome sabe que a foto
 * saiu de um caminho menos preciso, em vez de receber um resultado silencioso.
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { DIST_DIR, PKG_DIR, SRC_DIR, read, readJson, rel, walkFiles } from './quality/lib.mjs';

export const SNAPSHOT_PATH = join(PKG_DIR, 'api-snapshot.json');
const SNAPSHOT_VERSION = 1;

// ---------------------------------------------------------------------------
// Ambiente de DOM
// ---------------------------------------------------------------------------

/**
 * Globais do DOM que precisam sobrescrever os do Node mesmo quando ja existem.
 *
 * `Event`, `CustomEvent` e companhia sao o caso critico: o Node 21+ tem os
 * seus, mas um `new CustomEvent` do realm do Node despachado num elemento do
 * jsdom e rejeitado. Os intrinsecos de ECMAScript (Array, Object, Promise) NAO
 * entram nesta lista de proposito — troca-los pelos do outro realm quebraria
 * todo `instanceof` do codigo importado.
 */
const FORCED_DOM_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'screen',
  'localStorage',
  'sessionStorage',
  'customElements',
  'getComputedStyle',
  'matchMedia',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'getSelection',
  'DOMParser',
  'XMLHttpRequest',
  'MutationObserver',
  'Node',
  'NodeList',
  'Element',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLFormElement',
  'HTMLTemplateElement',
  'HTMLAnchorElement',
  'HTMLButtonElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLCollection',
  'SVGElement',
  'Text',
  'Comment',
  'DocumentFragment',
  'ShadowRoot',
  'EventTarget',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'InputEvent',
  'FocusEvent',
  'PointerEvent',
  'SubmitEvent',
  'AbortController',
  'AbortSignal',
  'FormData',
  'File',
  'FileList',
  'FileReader',
  'Blob',
  'Image',
  'CSS',
];

function define(name, value) {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
    return true;
  } catch {
    return false;
  }
}

/** Sobe um DOM com jsdom e instala os globais. Devolve `null` se nao der. */
async function installDom() {
  let JSDOM;
  try {
    ({ JSDOM } = await import('jsdom'));
  } catch (err) {
    return { ok: false, reason: `jsdom indisponivel: ${err && err.message}` };
  }

  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const w = dom.window;

  define('window', w);
  for (const name of FORCED_DOM_GLOBALS) {
    if (name === 'window') continue;
    let value;
    try {
      value = w[name];
    } catch {
      continue;
    }
    if (value === undefined) continue;
    define(name, typeof value === 'function' && !value.prototype ? value.bind(w) : value);
  }

  // O resto do window que o Node ainda nao tem, sem pisar nos intrinsecos.
  for (const name of Object.getOwnPropertyNames(w)) {
    if (name in globalThis) continue;
    let value;
    try {
      value = w[name];
    } catch {
      continue;
    }
    define(name, value);
  }

  // O jsdom nao implementa estes dois; o bundle so os toca sob demanda.
  const observerStub = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  if (!globalThis.IntersectionObserver) define('IntersectionObserver', observerStub);
  if (!globalThis.ResizeObserver) define('ResizeObserver', observerStub);
  if (!w.IntersectionObserver) w.IntersectionObserver = observerStub;
  if (!w.ResizeObserver) w.ResizeObserver = observerStub;

  if (!w.matchMedia) {
    const mm = () => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });
    w.matchMedia = mm;
    define('matchMedia', mm);
  }

  return { ok: true, dom };
}

// ---------------------------------------------------------------------------
// Leitura de runtime
// ---------------------------------------------------------------------------

/** Descreve um valor exportado de um jeito estavel entre execucoes. */
function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Map) return 'Map';
  if (value instanceof Set) return 'Set';
  const t = typeof value;
  if (t === 'function') {
    // Classes contam como forma diferente de funcao: trocar uma pela outra
    // quebra quem faz `new`.
    const src = Function.prototype.toString.call(value);
    return /^\s*class[\s{]/.test(src) ? 'class' : 'function';
  }
  return t;
}

function mapKeys(value) {
  if (value instanceof Map) return [...value.keys()].map(String).sort();
  if (value && typeof value === 'object') return Object.keys(value).sort();
  return [];
}

async function collectRuntime() {
  const entry = join(DIST_DIR, 'index.js');
  if (!existsSync(entry)) {
    return { ok: false, reason: `${rel(entry)} nao existe; rode npm run build` };
  }

  const dom = await installDom();
  if (!dom.ok) return { ok: false, reason: dom.reason };

  let mod;
  try {
    mod = await import(pathToFileURL(entry).href);
  } catch (err) {
    return { ok: false, reason: `falha ao importar ${rel(entry)}: ${err && err.message}` };
  }

  const V = mod.default;
  if (!V) return { ok: false, reason: 'dist/index.js nao tem export default' };

  const surface = {
    V: {},
    exports: {},
    directives: [],
    magics: [],
    components: [],
    allowedGlobals: [],
  };

  for (const key of Object.keys(V).sort()) {
    let value;
    try {
      value = V[key];
    } catch {
      continue;
    }
    surface.V[key] = describe(value);
  }

  for (const key of Object.keys(mod).sort()) {
    if (key === 'default') continue;
    let value;
    try {
      value = mod[key];
    } catch {
      continue;
    }
    surface.exports[key] = describe(value);
  }

  surface.directives = mapKeys(V.directives);
  surface.magics = mapKeys(V.magics);
  surface.components = mapKeys(V.components);
  surface.allowedGlobals = mapKeys(V.globals);

  return { ok: true, method: 'runtime', from: rel(entry), surface };
}

// ---------------------------------------------------------------------------
// Leitura estatica (plano B)
// ---------------------------------------------------------------------------

/** Extrai as chaves de primeiro nivel de um literal de objeto. */
function objectLiteralKeys(source, startIndex) {
  const open = source.indexOf('{', startIndex);
  if (open < 0) return [];
  let depth = 0;
  let end = open;
  for (; end < source.length; end++) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }

  const body = source.slice(open + 1, end);
  const keys = [];
  let level = 0;
  let line = '';
  let quote = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if ('([{'.includes(ch)) level++;
    else if (')]}'.includes(ch)) level--;
    if (level === 0 && (ch === ',' || ch === '\n')) {
      const m = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*(?::|\(|,|$)/.exec(line);
      if (m) keys.push(m[1]);
      line = '';
      continue;
    }
    line += ch;
  }
  const last = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*(?::|\(|,|$)/.exec(line);
  if (last) keys.push(last[1]);
  return [...new Set(keys)].sort();
}

function collectStatic() {
  const coreSource = read(join(SRC_DIR, 'core.ts')) ?? '';
  const indexSource = read(join(SRC_DIR, 'index.ts')) ?? '';

  const coreKeys = objectLiteralKeys(coreSource, coreSource.indexOf('export const core'));
  const assignKeys = objectLiteralKeys(indexSource, indexSource.indexOf('Object.assign(V, core,'));

  const exportNames = new Set();
  for (const m of indexSource.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) exportNames.add(name);
    }
  }

  const directives = new Set();
  const magics = new Set();
  for (const file of walkFiles(SRC_DIR, { filter: (f) => f.endsWith('.ts') })) {
    const source = read(file) ?? '';
    for (const m of source.matchAll(/defineDirective\(\s*['"]([\w-]+)['"]/g)) directives.add(m[1]);
    for (const m of source.matchAll(/\bmagic\(\s*['"](\$[\w]+)['"]/g)) magics.add(m[1]);
  }

  const surface = {
    V: Object.fromEntries([...new Set([...coreKeys, ...assignKeys])].sort().map((k) => [k, 'unknown'])),
    exports: Object.fromEntries([...exportNames].sort().map((k) => [k, 'unknown'])),
    directives: [...directives].sort(),
    magics: [...magics].sort(),
    components: [],
    allowedGlobals: [],
  };

  return { ok: true, method: 'static', from: 'packages/voodoojs/src', surface };
}

// ---------------------------------------------------------------------------
// API do modulo
// ---------------------------------------------------------------------------

/** Monta o snapshot atual da superficie publica. */
export async function collectSnapshot() {
  const pkg = readJson(join(PKG_DIR, 'package.json')) ?? {};
  const runtime = await collectRuntime();
  const source = runtime.ok ? runtime : collectStatic();

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    package: pkg.name ?? 'voodoojs',
    packageVersion: pkg.version ?? '0.0.0',
    method: source.method,
    generatedFrom: source.from,
    ...(runtime.ok ? {} : { runtimeFallbackReason: runtime.reason }),
    surface: source.surface,
  };
}

export function readSnapshot() {
  return readJson(SNAPSHOT_PATH);
}

export function writeSnapshot(snapshot) {
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return SNAPSHOT_PATH;
}

/** Compara duas fotos. Remocao e renomeacao sao quebra; adicao nao e. */
export function diffSnapshots(previous, current) {
  const removed = [];
  const added = [];
  const changed = [];

  const compareMap = (kind, before = {}, after = {}) => {
    for (const [name, shape] of Object.entries(before)) {
      if (!(name in after)) {
        removed.push({ kind, name, was: shape });
        continue;
      }
      if (shape !== 'unknown' && after[name] !== 'unknown' && shape !== after[name]) {
        changed.push({ kind, name, from: shape, to: after[name] });
      }
    }
    for (const name of Object.keys(after)) {
      if (!(name in before)) added.push({ kind, name, is: after[name] });
    }
  };

  const compareList = (kind, before = [], after = []) => {
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    for (const name of before) if (!afterSet.has(name)) removed.push({ kind, name });
    for (const name of after) if (!beforeSet.has(name)) added.push({ kind, name });
  };

  compareMap('V', previous.surface?.V, current.surface?.V);
  compareMap('export', previous.surface?.exports, current.surface?.exports);
  compareList('directive', previous.surface?.directives, current.surface?.directives);
  compareList('magic', previous.surface?.magics, current.surface?.magics);
  compareList('component', previous.surface?.components, current.surface?.components);
  compareList('allowedGlobal', previous.surface?.allowedGlobals, current.surface?.allowedGlobals);

  return { removed, added, changed };
}

// ---------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const args = process.argv.slice(2);
  const snapshot = await collectSnapshot();

  if (args.includes('--update')) {
    const previous = readSnapshot();
    const path = writeSnapshot(snapshot);
    console.log(`Snapshot gravado em ${rel(path)} (metodo: ${snapshot.method}).`);
    if (previous) {
      const diff = diffSnapshots(previous, snapshot);
      console.log(
        `Diferenca em relacao ao anterior: ${diff.removed.length} removidos, ` +
          `${diff.added.length} adicionados, ${diff.changed.length} com forma diferente.`
      );
      for (const r of diff.removed) console.log(`  - removido  ${r.kind}: ${r.name}`);
      for (const c of diff.changed) console.log(`  ~ mudou     ${c.kind}: ${c.name} ${c.from} -> ${c.to}`);
    }
  } else if (args.includes('--json')) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    const s = snapshot.surface;
    console.log(`voodoojs ${snapshot.packageVersion} — superficie publica (metodo: ${snapshot.method})`);
    if (snapshot.runtimeFallbackReason)
      console.log(`  aviso: leitura de runtime falhou (${snapshot.runtimeFallbackReason})`);
    console.log(`  chaves de V ........ ${Object.keys(s.V).length}`);
    console.log(`  exports nomeados ... ${Object.keys(s.exports).length}`);
    console.log(`  directives ......... ${s.directives.length}`);
    console.log(`  magics ............. ${s.magics.length}`);
    console.log(`  componentes ........ ${s.components.length}`);
    console.log(`  globais permitidos . ${s.allowedGlobals.length}`);
    console.log('\nUse --update para gravar packages/voodoojs/api-snapshot.json.');
  }
  process.exit(0);
}
