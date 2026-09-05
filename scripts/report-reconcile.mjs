/**
 * Prints the reconciliation before/after tables as markdown.
 *
 *   node scripts/report-reconcile.mjs            # English
 *   node scripts/report-reconcile.mjs --pt       # the pt-BR README
 *
 * The numbers in the READMEs are pasted from here rather than typed. A figure
 * typed by hand is a figure that drifts from the run it claims to describe, and
 * this repository has been bitten by exactly that before — which is why the
 * charts are generated too.
 */

import { readFile } from 'node:fs/promises';

const BEFORE = 'benchmarks/results/reconcile-before.json';
const AFTER = 'benchmarks/results/reconcile-after.json';

const pt = process.argv.includes('--pt');

const before = JSON.parse(await readFile(BEFORE, 'utf8'));
const after = JSON.parse(await readFile(AFTER, 'utf8'));
const afterById = new Map(after.results.map((r) => [r.id, r]));

const ms = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3));
const num = (v) => (v >= 1000 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 10) / 10));

/** Human names, so the table does not print benchmark ids. */
const NAME = {
  'create/1000': ['create 1.000 rows', 'criar 1.000 linhas'],
  'create/10000': ['create 10.000 rows', 'criar 10.000 linhas'],
  'create/50000': ['create 50.000 rows', 'criar 50.000 linhas'],
  'replace/append-1-to-10000': ['append 1 to 10.000 — new array', 'acrescentar 1 em 10.000 — array novo'],
  'inplace/push-1-to-10000': ['push 1 onto 10.000 — in place', 'push de 1 em 10.000 — no lugar'],
  'replace/append-5000-to-5000': ['append 5.000 to 5.000', 'acrescentar 5.000 a 5.000'],
  'replace/prepend-1-to-10000': ['prepend 1 to 10.000 — new array', 'inserir 1 no início de 10.000 — array novo'],
  'inplace/unshift-1-to-10000': ['unshift 1 onto 10.000 — in place', 'unshift de 1 em 10.000 — no lugar'],
  'replace/prepend-5000-to-5000': ['prepend 5.000 to 5.000', 'inserir 5.000 no início de 5.000'],
  'replace/remove-first-of-10000': ['remove the first of 10.000 — new array', 'remover a primeira de 10.000 — array novo'],
  'replace/remove-middle-of-10000': ['remove the middle of 10.000 — new array', 'remover a do meio de 10.000 — array novo'],
  'replace/remove-last-of-10000': ['remove the last of 10.000 — new array', 'remover a última de 10.000 — array novo'],
  'inplace/splice-remove-middle-of-10000': ['splice out the middle of 10.000 — in place', 'splice da linha do meio de 10.000 — no lugar'],
  'inplace/shift-of-10000': ['shift the first off 10.000 — in place', 'shift da primeira de 10.000 — no lugar'],
  'inplace/pop-of-10000': ['pop the last off 10.000 — in place', 'pop da última de 10.000 — no lugar'],
  'replace/insert-middle-of-10000': ['insert 1 in the middle of 10.000 — new array', 'inserir 1 no meio de 10.000 — array novo'],
  'inplace/splice-insert-middle-of-10000': ['splice 1 into the middle of 10.000 — in place', 'splice de 1 no meio de 10.000 — no lugar'],
  'replace/replace-1-of-10000': ['replace 1 of 10.000 with a new key', 'trocar 1 de 10.000 por outra chave'],
  'inplace/update-label-1-of-10000': ['change 1 label in 10.000', 'mudar 1 rótulo em 10.000'],
  'replace/same-rows-new-array-10000': ['re-assign an identical 10.000-row array', 'reatribuir um array idêntico de 10.000'],
  'replace/swap-2-of-10000': ['swap 2 rows in 10.000', 'trocar 2 linhas de lugar em 10.000'],
  'replace/reverse-10000': ['reverse 10.000 rows', 'inverter 10.000 linhas'],
  'replace/random-reorder-10000': ['shuffle 10.000 rows', 'embaralhar 10.000 linhas'],
  'replace/clear-10000': ['clear a 10.000-row list', 'limpar uma lista de 10.000'],
};

const label = (id) => (NAME[id] ? NAME[id][pt ? 1 : 0] : id);

const pairs = before.results
  .map((b) => ({ id: b.id, before: b, after: afterById.get(b.id) }))
  .filter((p) => p.after);

// ---------------------------------------------------------------------------

// The work column is `keyEvaluations`, not `itemsVisited`, and the difference
// matters. "Rows visited" is defined differently by the two implementations —
// the old one counted each row once in its main loop and never counted the
// rows it walked again to remove or to place, so it undercounted itself. "Times
// a row's :key was computed" means exactly the same thing in both, which is
// what a before/after column has to.
const head = pt
  ? '| caso | antes | depois | ganho | chaves avaliadas | alocações |'
  : '| case | before | after | speedup | keys evaluated | allocations |';
const rule = '| --- | ---: | ---: | ---: | ---: | ---: |';

console.log(head);
console.log(rule);
for (const p of pairs) {
  const b = p.before.stats.median;
  const a = p.after.stats.median;
  const speedup = b / a;
  const keysBefore = p.before.counters ? num(p.before.counters.keyEvaluations) : '-';
  const keysAfter = p.after.counters ? num(p.after.counters.keyEvaluations) : '-';
  const allocBefore = p.before.counters ? num(p.before.counters.arrayAllocations) : '-';
  const allocAfter = p.after.counters ? num(p.after.counters.arrayAllocations) : '-';
  const gain = speedup >= 1.1 ? `**${speedup.toFixed(1)}x**` : speedup <= 0.91 ? `${speedup.toFixed(2)}x` : '—';
  console.log(
    `| ${label(p.id)} | ${ms(b)} ms | ${ms(a)} ms | ${gain} | ` +
      `${keysBefore} → ${keysAfter} | ${allocBefore} → ${allocAfter} |`
  );
}

// ---------------------------------------------------------------------------

console.log('');
const wins = pairs
  .map((p) => ({ id: p.id, x: p.before.stats.median / p.after.stats.median }))
  .sort((a, b) => b.x - a.x);
console.log(pt ? '// maiores ganhos:' : '// biggest gains:');
for (const w of wins.slice(0, 6)) console.log(`//   ${w.id.padEnd(42)} ${w.x.toFixed(1)}x`);
console.log(pt ? '// menores / regressões:' : '// smallest / regressions:');
for (const w of wins.slice(-4)) console.log(`//   ${w.id.padEnd(42)} ${w.x.toFixed(2)}x`);

const env = after.env;
console.log('');
console.log(
  `// ${env.cpuModel}, ${env.node}, jsdom ${env.jsdom}, ${env.platform} — commit ${env.commitShort}`
);
