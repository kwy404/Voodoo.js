/**
 * Measures what a `v-for` retains after its subtree is destroyed.
 *
 * Writes benchmarks/results/teardown.json, which scripts/chart-teardown.mjs
 * draws. The JSON is the only source, so the picture in the README cannot drift
 * from the numbers the way a hand-edited chart does.
 *
 * Two builds are compared. The "before" one is produced by removing the block
 * in runtime/walker.ts that destroys detached templates — the fix — rebuilding,
 * measuring, and putting the file back. Nothing is left modified.
 *
 *   node --expose-gc scripts/measure-teardown.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const WALKER = 'packages/voodoojs/src/runtime/walker.ts';
const OUT = 'benchmarks/results/teardown.json';
const SIZES = [50, 100, 200];
const CYCLES = 50;

/**
 * The fix, matched on its first and last line so a reworded comment is fine.
 *
 * `\r?\n` rather than `\n`: the repository is checked out with
 * `core.autocrlf=true` and carries no `.gitattributes`, so this file is CRLF in
 * a Windows working copy and LF on the Linux runner. A pattern that assumes one
 * of them silently matches nothing on the other, and this script refuses to
 * guess when it cannot find the block — which is how that was caught rather
 * than measured around.
 */
const FIX =
  /\r?\n  const detached = detachedTemplates\.get\(node\);\r?\n[\s\S]*?for \(const template of detached\) destroy\(template\);\r?\n  \}\r?\n/;

if (typeof global.gc !== 'function') {
  console.error('Run with --expose-gc, or the numbers are meaningless.');
  process.exit(1);
}

function build() {
  execSync('npm run build', { stdio: 'ignore' });
}

/** One measurement pass in a fresh jsdom, against the current build. */
async function measure() {
  const dom = new JSDOM('<!doctype html><body></body>', {
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  // `navigator` is a getter-only property on newer Node globals, so assigning
  // it throws rather than being ignored. defineProperty writes over it and
  // leaves the rest of the list to the plain path.
  for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'Text', 'Comment',
    'MutationObserver', 'CustomEvent', 'Event', 'requestAnimationFrame', 'cancelAnimationFrame',
    'getComputedStyle', 'matchMedia', 'navigator', 'localStorage']) {
    if (dom.window[key] === undefined) continue;
    try {
      globalThis[key] = dom.window[key];
    } catch {
      Object.defineProperty(globalThis, key, {
        value: dom.window[key],
        configurable: true,
        writable: true,
      });
    }
  }
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  // Cache-busted, because the two builds must not share a module instance.
  const V = await import(`../packages/voodoojs/dist/index.js?t=${Date.now()}`);
  const { reactive, flushSync, Scope, walk, destroy } = V;

  const settle = () => {
    global.gc();
    global.gc();
    return process.memoryUsage().heapUsed;
  };

  const out = {};
  for (const rows of SIZES) {
    const cycle = () => {
      const root = document.createElement('div');
      root.innerHTML =
        '<ul><li v-for="r in list" :key="r.id"><span v-text="r.label"></span></li></ul>';
      document.body.appendChild(root);
      walk(root, new Scope(reactive({
        list: Array.from({ length: rows }, (_, i) => ({ id: i, label: 'row ' + i })),
      })));
      flushSync();
      destroy(root);
      root.remove();
    };

    for (let i = 0; i < 5; i++) cycle();
    const before = settle();
    for (let i = 0; i < CYCLES; i++) cycle();
    const after = settle();

    out[rows] = Math.max(0, (after - before) / CYCLES / 1024);
    console.log(`  ${String(rows).padStart(4)} rows  ${out[rows].toFixed(2).padStart(8)} KB retained per cycle`);
  }
  return out;
}

const original = await readFile(WALKER, 'utf8');
if (!FIX.test(original)) {
  console.error(`Could not find the fix in ${WALKER}. Refusing to guess.`);
  process.exit(1);
}

console.log('with the fix:');
build();
const withFix = await measure();

console.log('\nwithout it:');
await writeFile(WALKER, original.replace(FIX, '\n'));
try {
  build();
  var withoutFix = await measure();
} finally {
  await writeFile(WALKER, original);
  build();
  console.log('\nsource restored and rebuilt.');
}

await mkdir('benchmarks/results', { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      what: 'kilobytes retained per mount-and-destroy cycle of a keyed v-for',
      cycles: CYCLES,
      node: process.version,
      commit: execSync('git rev-parse --short HEAD').toString().trim(),
      sizes: SIZES,
      before: withoutFix,
      after: withFix,
    },
    null,
    2
  ) + '\n'
);

console.log(`\nwrote ${OUT}`);
