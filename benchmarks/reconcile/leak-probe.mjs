/**
 * Does tearing a list down actually give the memory back?
 *
 *   node --expose-gc benchmarks/reconcile/leak-probe.mjs [rows] [rounds]
 *
 * Mounts a list, destroys it, collects, and reports the resident heap after
 * each round. A flat line means teardown releases; a staircase means something
 * is still holding the rows.
 *
 * This exists because the reconciliation benchmark ran out of an 8 GB heap
 * while building 50.000 rows ten times over, with a forced collection between
 * every round — which is not a number of rows problem.
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { installDom } from '../harness/dom.mjs';
import { buildDir, repoRoot, resultsDir } from '../harness/paths.mjs';
import { buildRows } from './cases.mjs';

const ROWS = Number(process.argv[2] || 5000);
const ROUNDS = Number(process.argv[3] || 8);

const TEMPLATE = `<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>`;

const want = (process.argv.find((a) => a.startsWith('--bundle=')) || '').slice(9);
const bundles = fs
  .readdirSync(buildDir)
  .filter((f) => f.startsWith('reconcile-') && f.endsWith('.mjs') && (!want || f.includes(want)));
if (!bundles.length) {
  console.error('no bundle in .build — run the benchmark once first');
  process.exit(2);
}
const file = path.join(buildDir, bundles[0]);

installDom();
const V = await import(pathToFileURL(file).href);
V.config.autoDiscover = false;

const mb = () => Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

console.log(`${ROWS} rows x ${ROUNDS} rounds — bundle ${bundles[0]}\n`);
console.log(`round  heap after teardown`);

const rounds = [];

// Sharing one array of row objects across rounds is deliberate: it is what the
// `create` benchmark does, and it is the case where a dependency set that
// outlives the list would pin every list ever built on it.
const shared = buildRows(ROWS);

for (let round = 1; round <= ROUNDS; round++) {
  const root = document.createElement('div');
  root.innerHTML = TEMPLATE;
  document.body.appendChild(root);
  const state = V.reactive({ rows: [] });
  V.walk(root, new V.Scope(state));
  V.flushSync();

  state.rows = shared;
  V.flushSync();
  if (root.querySelectorAll('li').length !== ROWS) {
    console.error('list did not render');
    process.exit(1);
  }

  V.destroy(root);
  root.remove();

  globalThis.gc?.();
  globalThis.gc?.();
  const heap = mb();
  rounds.push({ round, heapMB: heap });
  console.log(`${String(round).padStart(5)}  ${String(heap).padStart(6)} MB`);
}

const out = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6);
if (out) {
  const file = path.isAbsolute(out) ? out : path.join(resultsDir, out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ schemaVersion: 1, kind: 'vfor-teardown-memory', rows: ROWS, bundle: bundles[0], rounds }, null, 2),
    'utf8'
  );
  console.log(`
written: ${path.relative(repoRoot, file)}`);
}
