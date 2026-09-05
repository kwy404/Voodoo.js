/**
 * Which reconciliation path actually ran?
 *
 *   node benchmarks/reconcile/paths-probe.mjs
 *
 * A fast path that quietly falls back still passes every correctness test —
 * that is what makes it a fallback. The only way to know it is being taken is
 * to count, so this drives the same shapes the test suite fuzzes and prints the
 * path distribution the counters recorded.
 *
 * `mutation` means the edit was read off the mutating call. `scan` means the
 * lists had to be compared. A shape that should be O(k) and reports `scan` is a
 * fast path that is not firing.
 */

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { installDom } from '../harness/dom.mjs';
import { buildDir, repoRoot, resultsDir } from '../harness/paths.mjs';

const want = (process.argv.find((a) => a.startsWith('--bundle=')) || '--bundle=packages').slice(9);
const bundles = fs
  .readdirSync(buildDir)
  .filter((f) => f.startsWith('reconcile-') && f.endsWith('.mjs') && f.includes(want));
if (!bundles.length) {
  console.error('no bundle in .build — run benchmarks/reconcile/run.mjs once first');
  process.exit(2);
}

installDom();
const V = await import(pathToFileURL(path.join(buildDir, bundles[0])).href);
V.config.autoDiscover = false;
const M = V.metrics;

const TEMPLATE = '<ul><li v-for="r in list" :key="r.id"><span v-text="r.label"></span></li></ul>';

function mount(list) {
  const root = document.createElement('div');
  root.innerHTML = TEMPLATE;
  document.body.appendChild(root);
  const state = V.reactive({ list });
  V.walk(root, new V.Scope(state));
  V.flushSync();
  return { root, state };
}

let nextId = 1;
const make = () => ({ id: nextId, label: 'r' + nextId++ });
const many = (n) => Array.from({ length: n }, make);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const collected = [];

/** Runs one shape and reports which path handled it, plus what it cost. */
function probe(name, size, edit) {
  const ctx = mount(many(size));
  M.setListMetrics(true);
  M.resetListMetrics();
  edit(ctx.state, rng(42));
  V.flushSync();
  const m = M.readListMetrics();
  M.setListMetrics(false);

  const got = ctx.root.querySelectorAll('li').length;
  const want = ctx.state.list.length;
  V.destroy(ctx.root);
  ctx.root.remove();
  document.body.innerHTML = '';

  const paths = Object.entries(m.paths).map(([k, v]) => `${k}x${v}`).join(' ') || '(none)';
  collected.push({
    group: currentGroup,
    name,
    size,
    path: Object.keys(m.paths)[0] ?? 'none',
    itemsVisited: m.itemsVisited,
    keyEvaluations: m.keyEvaluations,
    proxyWrites: m.proxyWrites,
    domCreates: m.domCreates,
    domRemoves: m.domRemoves,
    domMoves: m.domMoves,
    correct: got === want,
  });
  console.log(
    `  ${name.padEnd(38)} ${paths.padEnd(16)} visited ${String(m.itemsVisited).padStart(7)}` +
      `  keyEvals ${String(m.keyEvaluations).padStart(7)}` +
      `  proxyWrites ${String(m.proxyWrites).padStart(6)}` +
      `  ${got === want ? '' : `  !! DOM ${got} vs ${want}`}`
  );
}

let currentGroup = '';
const group = (name) => {
  currentGroup = name;
  console.log(`\n${name}`);
};

console.log(`bundle: ${bundles[0]}`);
group('one mutation, list of 10.000');
probe('push 1', 10000, (s) => s.list.push(make()));
probe('unshift 1', 10000, (s) => s.list.unshift(make()));
probe('pop', 10000, (s) => s.list.pop());
probe('shift', 10000, (s) => s.list.shift());
probe('splice out 1 in the middle', 10000, (s) => s.list.splice(5000, 1));
probe('splice in 1 in the middle', 10000, (s) => s.list.splice(5000, 0, make()));
probe('write one element', 10000, (s) => void (s.list[5000] = make()));
probe('length = 9999', 10000, (s) => void (s.list.length = 9999));

group('several mutations in one tick, list of 10.000');
probe('two pushes', 10000, (s) => {
  s.list.push(make());
  s.list.push(make());
});
probe('two unshifts', 10000, (s) => {
  s.list.unshift(make());
  s.list.unshift(make());
});
probe('push then shift', 10000, (s) => {
  s.list.push(make());
  s.list.shift();
});
probe('splices at both ends', 10000, (s) => {
  s.list.splice(10, 1);
  s.list.splice(9980, 1);
});
probe('four splices in the middle', 10000, (s) => {
  s.list.splice(5000, 1);
  s.list.splice(5000, 0, make());
  s.list.splice(5002, 2);
  s.list.splice(5000, 0, make(), make());
});
probe('40 pushes (past the log limit)', 10000, (s) => {
  for (let i = 0; i < 40; i++) s.list.push(make());
});

group('no mutation to read — a new array arrives');
probe('same rows, new array', 10000, (s) => void (s.list = s.list.slice()));
probe('remove 1 in the middle', 10000, (s) => {
  const next = s.list.slice();
  next.splice(5000, 1);
  s.list = next;
});
probe('reverse in place', 10000, (s) => s.list.reverse());

const out = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6);
if (out) {
  const file = path.isAbsolute(out) ? out : path.join(resultsDir, out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      { schemaVersion: 1, kind: 'reconcile-paths', bundle: bundles[0], shapes: collected },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nwritten: ${path.relative(repoRoot, file)}`);
}

const wrong = collected.filter((c) => !c.correct);
if (wrong.length) {
  console.error(`\n${wrong.length} shapes produced the wrong DOM`);
  process.exit(1);
}
