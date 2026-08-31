/**
 * Resumo compacto de um arquivo de resultado, para consulta rapida e para
 * alimentar o PERFORMANCE_REPORT.md sem ninguem redigitar numero.
 *
 * ```
 * node benchmarks/summarize.mjs                       # results/baseline.json
 * node benchmarks/summarize.mjs results/latest.json
 * node benchmarks/summarize.mjs --unstable            # so os casos ruidosos
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';
import { resultsDir } from './harness/paths.mjs';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const file = argv.find((a) => !a.startsWith('--')) ?? path.join(resultsDir, 'baseline.json');

const run = JSON.parse(fs.readFileSync(file, 'utf8'));
const f = (v, d = 3) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');

console.log(`file:   ${file}`);
console.log(`commit: ${run.env.commitShort}${run.env.dirty ? ' (dirty)' : ''}   source: ${run.env.measuredSource}`);
console.log(`cpu:    ${run.env.cpuModel}  (${run.env.cpuCores} cores)   node ${run.env.node}   gc ${run.env.gcExposed}`);
console.log(`cases:  ${run.results.length}   wall ${(run.wallMs / 1000).toFixed(0)}s`);
console.log('');

const rows = flags.has('--unstable') ? run.results.filter((r) => r.stable === false) : run.results;

console.log('id'.padEnd(44) + 'median'.padStart(11) + 'p95'.padStart(11) + 'cv%'.padStart(8) + 'n'.padStart(6) + '  gate  rating');
for (const r of rows) {
  if (!r.stats) {
    console.log(r.id.padEnd(44) + '—'.padStart(11) + `   ${r.status}: ${r.verifyMessage ?? r.error ?? ''}`);
    continue;
  }
  const d = r.unit && r.unit !== 'ms' ? 0 : 3;
  console.log(
    r.id.padEnd(44) +
      f(r.stats.median, d).padStart(11) +
      f(r.stats.p95, d).padStart(11) +
      f(r.stats.rsd, 1).padStart(8) +
      String(r.stats.samples).padStart(6) +
      `  ±${String(r.suggestedGatePct).padStart(3)}%  ${r.rating}${r.overheadOverVanilla ? ` (${r.overheadOverVanilla.toFixed(2)}x vanilla)` : ''}` +
      (r.leaking ? '  LEAKING' : '')
  );
}

console.log('');
console.log('curvas:');
for (const c of run.curves ?? []) {
  console.log(
    `  ${c.curve}\n     n x${c.nFactor?.toFixed(0)} -> t x${c.timeFactor?.toFixed(1)}  exp ${c.exponent?.toFixed(2)}  => ${c.complexity}` +
      `\n     ${c.points.map((p) => `${p.n}:${p.t.toFixed(2)}ms`).join('  ')}`
  );
}

const invalid = run.results.filter((r) => r.status === 'invalid');
const failed = run.results.filter((r) => r.status === 'failed');
const unstable = run.results.filter((r) => r.stable === false);
const leaking = run.results.filter((r) => r.leaking);
console.log('');
console.log(`invalid: ${invalid.length}   failed: ${failed.length}   unstable(cv>10): ${unstable.length}   leaking: ${leaking.length}`);
for (const r of [...invalid, ...failed]) console.log(`  ! ${r.id}: ${r.verifyMessage ?? r.error}`);
for (const r of leaking) console.log(`  LEAK ${r.id}: ${(r.stats.median / 1024).toFixed(1)} KB/ciclo`);
