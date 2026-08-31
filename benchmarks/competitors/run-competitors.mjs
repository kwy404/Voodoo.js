/**
 * Comparacao entre frameworks, com o MESMO trabalho logico e o MESMO DOM.
 *
 * ```
 * cd benchmarks/competitors
 * npm install
 * node --expose-gc run-competitors.mjs
 * ```
 *
 * Regras que este arquivo aplica sem excecao:
 *
 * 1. TODOS em build de producao e minificados. `process.env.NODE_ENV` e fixado
 *    em "production" no empacotamento e a resolucao usa a condicao `production`.
 *    Comparar um build de desenvolvimento com um de producao nao e comparacao,
 *    e propaganda.
 *
 * 2. MESMA SAIDA. Depois de cada cenario, o DOM de cada framework e reduzido a
 *    uma forma canonica — a lista de textos de cada `<li>` — e comparada com a
 *    do vanilla. Quem produzir DOM diferente e DESCLASSIFICADO daquele cenario
 *    e aparece no relatorio como tal. Um framework rapido porque fez menos
 *    trabalho nao entra na tabela.
 *
 * 3. Mesma maquina, mesmo processo, mesmo instante, mesmo jsdom.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const benchRoot = path.resolve(here, '..');
const repoRoot = path.resolve(benchRoot, '..');
const buildDir = path.join(here, '.build');
const reportsDir = path.join(benchRoot, 'reports');
const resultsDir = path.join(benchRoot, 'results');

const FRAMEWORKS = ['vanilla', 'voodoo', 'alpine', 'vue', 'preact', 'react', 'solid'];
const ROWS = 1000;
const SAMPLES = 30;
const WARMUP = 6;

// ---------------------------------------------------------------------------
// Dados: identicos para todos, deterministicos
// ---------------------------------------------------------------------------
const ADJ = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const COLOUR = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const NOUN = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];

function buildRows(count, seed = 1) {
  let s = seed >>> 0 || 1;
  const rand = (max) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s % max;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    label: `${ADJ[rand(10)]} ${COLOUR[rand(10)]} ${NOUN[rand(10)]}`,
  }));
}

// ---------------------------------------------------------------------------
// Empacotamento: um bundle de producao minificado por framework
// ---------------------------------------------------------------------------
async function bundleAll() {
  const esbuild = await import('esbuild');
  fs.mkdirSync(buildDir, { recursive: true });
  const out = {};

  for (const name of FRAMEWORKS) {
    const entry = path.join(here, 'frameworks', `${name}.mjs`);
    if (!fs.existsSync(entry)) {
      out[name] = { error: `frameworks/${name}.mjs nao existe` };
      continue;
    }
    const outfile = path.join(buildDir, `${name}.bundle.mjs`);
    try {
      const r = await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        minify: true,
        outfile,
        metafile: true,
        logLevel: 'silent',
        absWorkingDir: here,
        // Producao para todo mundo, sem excecao.
        define: { 'process.env.NODE_ENV': '"production"' },
        conditions: ['production', 'browser', 'import', 'module', 'default'],
        // O Voodoo entra pelo codigo-fonte do monorepo, compilado aqui do mesmo
        // jeito que os concorrentes: minificado e em producao.
        alias: { 'voodoojs-src': path.join(repoRoot, 'packages', 'voodoojs', 'src', 'index.ts') },
        loader: { '.ts': 'ts' },
      });
      out[name] = { file: outfile, bytes: fs.statSync(outfile).size, metafile: r.metafile };
    } catch (err) {
      out[name] = { error: err?.message?.split('\n').slice(0, 3).join(' ') ?? String(err) };
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// jsdom
// ---------------------------------------------------------------------------
const GLOBAL_KEYS = [
  'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTemplateElement', 'Node', 'Text', 'Comment',
  'DocumentFragment', 'NodeFilter', 'SVGElement', 'Event', 'CustomEvent', 'MouseEvent',
  'KeyboardEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'localStorage', 'sessionStorage', 'matchMedia', 'DOMParser',
  'XMLSerializer', 'FormData', 'Blob', 'File', 'location', 'history', 'CSSStyleDeclaration',
  'requestIdleCallback', 'cancelIdleCallback',
  // O Alpine consulta `ShadowRoot` ao percorrer a arvore; sem o global ele
  // lanca dentro do MutationObserver e o framework inteiro fica de fora.
  'ShadowRoot', 'HTMLSlotElement', 'ShadowRootInit', 'MessageChannel', 'MessagePort',
  'HTMLDocument', 'XPathResult', 'AbortController', 'AbortSignal',
];

function installDom() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://localhost/bench',
  });
  const w = dom.window;
  const define = (k, v) => {
    try {
      Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true });
    } catch { /* chaves protegidas do Node ficam como estao */ }
  };
  define('window', w);
  define('document', w.document);
  define('navigator', w.navigator);
  for (const k of GLOBAL_KEYS) if (k in w) define(k, w[k]);
  // React 19 usa `queueMicrotask` e `MessageChannel` do escopo global.
  if (typeof globalThis.MessageChannel === 'undefined' && w.MessageChannel) {
    define('MessageChannel', w.MessageChannel);
  }
  return dom;
}

// ---------------------------------------------------------------------------
// Forma canonica do DOM: e assim que "mesma saida" e verificado
// ---------------------------------------------------------------------------
function canonical(container) {
  const lis = container.querySelectorAll('li');
  return {
    count: lis.length,
    labels: Array.from(lis, (li) => li.textContent),
    spans: container.querySelectorAll('li span').length,
  };
}

function sameOutput(a, b) {
  if (a.count !== b.count) return `contagem de <li>: ${a.count} vs ${b.count} (referencia)`;
  if (a.spans !== b.spans) return `contagem de <li> <span>: ${a.spans} vs ${b.spans} (referencia)`;
  for (let i = 0; i < a.labels.length; i++) {
    if (a.labels[i] !== b.labels[i]) {
      return `rotulo ${i}: "${a.labels[i]}" vs "${b.labels[i]}" (referencia)`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Estatistica
// ---------------------------------------------------------------------------
const asc = (v) => [...v].sort((a, b) => a - b);
const median = (v) => {
  const s = asc(v);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (v, p) => {
  const s = asc(v);
  if (s.length === 1) return s[0];
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const cv = (v) => {
  const m = mean(v);
  if (!m || v.length < 2) return 0;
  const sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1));
  return (sd / m) * 100;
};

const now = () => Number(process.hrtime.bigint()) / 1e6;
const breathe = () => new Promise((r) => setImmediate(r));

// ---------------------------------------------------------------------------
// Cenarios: os tres que se equalizam de verdade entre todos os frameworks
// ---------------------------------------------------------------------------
const SCENARIOS = [
  {
    id: `create-${ROWS}`,
    label: `create ${ROWS} rows`,
    async run(app, rows) {
      await app.setRows(rows.map((r) => ({ ...r })));
    },
    async reset(app) {
      await app.clear();
    },
  },
  {
    id: `update-every-10th-${ROWS}`,
    label: `update every 10th of ${ROWS} rows`,
    async prepare(app, rows) {
      await app.setRows(rows.map((r) => ({ ...r })));
    },
    async run(app) {
      await app.updateEvery10th();
    },
    async reset(app) {
      await app.clear();
    },
  },
  {
    id: `clear-${ROWS}`,
    label: `clear ${ROWS} rows`,
    async prepare(app, rows) {
      await app.setRows(rows.map((r) => ({ ...r })));
    },
    async run(app) {
      await app.clear();
    },
  },
];

async function measure(name, mod, scenario, rows) {
  const times = [];
  let shape = null;
  let erro = null;

  try {
    for (let i = 0; i < WARMUP + SAMPLES; i++) {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const app = mod.create(container);
      await app.mount();
      if (scenario.prepare) await scenario.prepare(app, rows);

      const t0 = now();
      await scenario.run(app, rows);
      const t1 = now();

      if (i === WARMUP) shape = canonical(container);
      if (i >= WARMUP) times.push(t1 - t0);

      await app.unmount();
      container.remove();
      if (typeof globalThis.gc === 'function') globalThis.gc();
      if (i % 5 === 4) await breathe();
    }
  } catch (err) {
    erro = `${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`;
  }

  return {
    framework: name,
    version: mod.meta?.version ?? 'unknown',
    caveat: mod.meta?.caveat ?? null,
    error: erro,
    shape,
    samples: times.length,
    median: times.length ? median(times) : null,
    mean: times.length ? mean(times) : null,
    p95: times.length ? pct(times, 0.95) : null,
    cv: times.length ? cv(times) : null,
    raw: times,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const bundles = await bundleAll();
installDom();

const env = {
  timestamp: new Date().toISOString(),
  commit: git(['rev-parse', '--short', 'HEAD']),
  cpuModel: os.cpus()[0]?.model?.trim() ?? 'unknown',
  cpuCores: os.cpus().length,
  totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
  platform: `${os.platform()} ${os.release()}`,
  node: process.version,
  jsdom: JSON.parse(fs.readFileSync(path.join(here, 'node_modules', 'jsdom', 'package.json'), 'utf8')).version,
  gcExposed: typeof globalThis.gc === 'function',
  rows: ROWS,
  samples: SAMPLES,
  warmup: WARMUP,
  mode: 'all frameworks bundled production + minified (NODE_ENV=production, esbuild minify)',
};

console.log('Competitor comparison');
console.log('---------------------');
console.log(`${ROWS} rows, ${SAMPLES} samples, ${WARMUP} warmup, jsdom ${env.jsdom}, ${env.node}`);
if (!env.gcExposed) console.log('WARNING: no --expose-gc; GC noise is not controlled between samples.');
console.log('');

const loaded = {};
for (const name of FRAMEWORKS) {
  const b = bundles[name];
  if (b.error) {
    loaded[name] = { error: b.error };
    console.log(`  ${name.padEnd(10)} BUNDLE FAILED: ${b.error}`);
    continue;
  }
  try {
    const mod = await import(pathToFileURL(b.file).href);
    loaded[name] = { mod, bytes: b.bytes };
    console.log(`  ${name.padEnd(10)} loaded (${(b.bytes / 1024).toFixed(1)} KB minified bundle)`);
  } catch (err) {
    loaded[name] = { error: `${err?.name}: ${err?.message}` };
    console.log(`  ${name.padEnd(10)} IMPORT FAILED: ${err?.message}`);
  }
}
console.log('');

const rows = buildRows(ROWS);
const report = { env, bundles: {}, scenarios: [] };
for (const [name, l] of Object.entries(loaded)) {
  report.bundles[name] = { bytes: l.bytes ?? null, error: l.error ?? null, version: l.mod?.meta?.version ?? null };
}

for (const scenario of SCENARIOS) {
  console.log(`## ${scenario.label}`);
  const linhas = [];
  for (const name of FRAMEWORKS) {
    const l = loaded[name];
    if (l.error) {
      linhas.push({ framework: name, error: l.error, disqualified: 'nao carregou' });
      console.log(`  ${name.padEnd(10)} SKIPPED (${l.error})`);
      continue;
    }
    const r = await measure(name, l.mod, scenario, rows);
    linhas.push(r);
    if (r.error) console.log(`  ${name.padEnd(10)} FAILED: ${r.error}`);
    else console.log(`  ${name.padEnd(10)} ${r.median.toFixed(2).padStart(9)} ms  (p95 ${r.p95.toFixed(2)}, cv ${r.cv.toFixed(1)}%)`);
    await breathe();
  }

  // Referencia de correcao: o vanilla. Quem divergir sai do cenario.
  const ref = linhas.find((l) => l.framework === 'vanilla');
  for (const l of linhas) {
    if (l.error || !l.shape) {
      l.disqualified = l.disqualified ?? `nao produziu DOM: ${l.error ?? 'sem forma canonica'}`;
      continue;
    }
    if (!ref?.shape) continue;
    const diff = sameOutput(l.shape, ref.shape);
    if (diff) {
      l.disqualified = `DOM diferente do baseline vanilla — ${diff}`;
      console.log(`  ${l.framework.padEnd(10)} DISQUALIFIED: ${diff}`);
    }
  }

  const base = ref && !ref.disqualified ? ref.median : null;
  for (const l of linhas) {
    if (!l.disqualified && base && l.median != null) l.overVanilla = l.median / base;
  }

  report.scenarios.push({ id: scenario.id, label: scenario.label, results: linhas });
  console.log('');
}

// ---------------------------------------------------------------------------
// Relatorio
// ---------------------------------------------------------------------------
const f = (v, d = 2) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');

const md = [];
md.push('# Voodoo.js — Framework Comparison');
md.push('');
md.push(
  `All frameworks were bundled **production + minified** (\`NODE_ENV=production\`, esbuild \`minify: true\`) ` +
    'and run in the same process, on the same machine, against the same jsdom document, back to back.'
);
md.push('');
md.push('## Environment');
md.push('');
md.push('| Field | Value |');
md.push('| --- | --- |');
md.push(`| Date | ${env.timestamp} |`);
md.push(`| Commit | ${env.commit ?? '?'} |`);
md.push(`| CPU | ${env.cpuModel} (${env.cpuCores} logical cores) |`);
md.push(`| RAM | ${env.totalMemMB} MB |`);
md.push(`| OS | ${env.platform} |`);
md.push(`| Node | ${env.node} |`);
md.push(`| DOM | jsdom ${env.jsdom} (**not a real browser** — see caveats) |`);
md.push(`| Rows | ${env.rows} |`);
md.push(`| Samples | ${env.samples} (after ${env.warmup} warm-up) |`);
md.push(`| GC control | ${env.gcExposed ? 'yes (--expose-gc)' : 'NO'} |`);
md.push('');
md.push('## Versions');
md.push('');
md.push('| Framework | version | minified bundle |');
md.push('| --- | --- | ---: |');
for (const name of FRAMEWORKS) {
  const b = report.bundles[name];
  md.push(`| ${name} | ${b.version ?? (b.error ? 'FAILED' : 'n/a')} | ${b.bytes ? (b.bytes / 1024).toFixed(1) + ' KB' : '—'} |`);
}
md.push('');

for (const s of report.scenarios) {
  md.push(`## ${s.label}`);
  md.push('');
  md.push('| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |');
  md.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  const ok = s.results.filter((r) => !r.disqualified && r.median != null).sort((a, b) => a.median - b.median);
  for (const r of ok) {
    md.push(
      `| ${r.framework}${r.caveat ? ' \\*' : ''} | **${f(r.median)}** | ${f(r.p95)} | ${f(r.cv, 1)} | ` +
        `${r.overVanilla ? f(r.overVanilla) + 'x' : '—'} | ${r.samples} |`
    );
  }
  md.push('');
  const out = s.results.filter((r) => r.disqualified);
  if (out.length) {
    md.push('Excluded from this scenario:');
    md.push('');
    for (const r of out) md.push(`- **${r.framework}** — ${r.disqualified}`);
    md.push('');
  }
  const voodoo = ok.find((r) => r.framework === 'voodoo');
  const vanilla = ok.find((r) => r.framework === 'vanilla');
  if (voodoo && vanilla) {
    const piores = ok.filter((r) => r.median > voodoo.median && r.framework !== 'voodoo');
    const melhores = ok.filter((r) => r.median < voodoo.median);
    md.push(
      `In the ${s.label} benchmark, ${env.cpuModel}, jsdom ${env.jsdom}, Node ${env.node}, ` +
        `${env.samples} samples: Voodoo.js median **${f(voodoo.median)} ms**, ` +
        `**${f(voodoo.overVanilla)}x** the hand-written vanilla baseline. ` +
        (melhores.length
          ? `Faster than Voodoo here: ${melhores.map((m) => `${m.framework} (${f(m.median)} ms)`).join(', ')}. `
          : 'No framework in this set was faster here. ') +
        (piores.length ? `Slower than Voodoo here: ${piores.map((m) => `${m.framework} (${f(m.median)} ms)`).join(', ')}.` : '')
    );
    md.push('');
  }
}

md.push('## Caveats — read before quoting any of this');
md.push('');
md.push('- **jsdom is not a browser.** It has no layout, no paint, no compositor. Numbers here measure');
md.push('  JavaScript and DOM-API work only. Real browser ranking can differ, sometimes a lot.');
md.push('- **Same logical work, verified.** After every scenario each framework\'s DOM is reduced to the');
md.push('  list of `<li>` text contents and compared against the vanilla baseline. Any framework that');
md.push('  produced different output is excluded from that scenario rather than credited with a fast time.');
md.push('- **Synchronous flushing is forced** where a framework would otherwise defer work (React');
md.push('  `flushSync`, Vue `nextTick`, Alpine microtask drain). Without this the comparison would time');
md.push('  scheduling instead of rendering.');
md.push('- Frameworks marked \\* carry a caveat listed in the Versions table source; see');
md.push('  `benchmarks/competitors/frameworks/*.mjs` for exactly what each fixture does.');
md.push('- This is a **list-rendering** comparison. It says nothing about routing, forms, SSR, ecosystem,');
md.push('  or developer experience.');
md.push('');

fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });
const mdFile = path.join(reportsDir, 'comparison.md');
fs.writeFileSync(mdFile, md.join('\n'), 'utf8');
const jsonFile = path.join(resultsDir, 'competitors.json');
fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2), 'utf8');

console.log('wrote:');
console.log('  ' + path.relative(repoRoot, mdFile));
console.log('  ' + path.relative(repoRoot, jsonFile));
