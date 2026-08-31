/**
 * @module benchmarks/harness/report
 * Gera markdown e JSON a partir dos resultados.
 */

import fs from 'node:fs';
import path from 'node:path';
import { envMarkdown } from './env.mjs';
import { resultsDir, reportsDir } from './paths.mjs';

const fmt = (v, d = 3) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—');
const kb = (b) => (typeof b === 'number' ? (b / 1024).toFixed(1) : '—');

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return file;
}

/**
 * Grava o resultado como `latest.json` e como um arquivo datado por commit,
 * que e o historico que sobrevive a proxima execucao.
 */
export function persist(run, { asBaseline = false, suffix = '' } = {}) {
  const written = [];
  written.push(writeJSON(path.join(resultsDir, 'latest.json'), run));

  const date = run.env.timestamp.slice(0, 10);
  const sha = run.env.commitShort ?? 'nosha';
  written.push(writeJSON(path.join(resultsDir, `${date}-${sha}${suffix}.json`), run));

  if (asBaseline) written.push(writeJSON(path.join(resultsDir, 'baseline.json'), run));
  return written;
}

const RATING_ICON = {
  Excellent: 'Excellent',
  Competitive: 'Competitive',
  'Needs improvement': 'Needs improvement',
  Unrated: 'Unrated',
  INVALID: '**INVALID**',
  FAILED: '**FAILED**',
};

/** Tabela principal de um grupo de casos. */
function caseTable(results) {
  const unit = results[0]?.unit === 'ms' || !results[0]?.unit ? 'ms' : results[0].unit;
  const head = [
    `| Case | n | samples | median (${unit}) | mean | p95 | p99 | min | max | stddev | CV % | gate | outliers | verified | rating (basis) |`,
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: | --- |',
  ];
  const rows = results.map((r) => {
    if (!r.stats) {
      return `| \`${r.id}\` | ${r.n ?? '—'} | 0 | — | — | — | — | — | — | — | — | — | — | — | ${RATING_ICON[r.rating] ?? r.rating} — ${r.ratingBasis ?? ''} |`;
    }
    const s = r.stats;
    const d = r.unit && r.unit !== 'ms' ? 0 : 3;
    const cv = `${fmt(s.rsd, 1)}${r.stable === false ? ' !' : ''}`;
    return (
      `| \`${r.id}\` | ${r.n ?? '—'} | ${s.samples} | **${fmt(s.median, d)}** | ${fmt(s.mean, d)} | ` +
      `${fmt(s.p95, d)} | ${fmt(s.p99, d)} | ${fmt(s.min, d)} | ${fmt(s.max, d)} | ${fmt(s.stddev, d)} | ` +
      `${cv} | ±${r.suggestedGatePct ?? '—'}% | ${s.outlierCount} | ${r.verified ? 'yes' : 'NO'} | ` +
      `${RATING_ICON[r.rating] ?? r.rating} — ${r.ratingBasis ?? ''} |`
    );
  });
  const notes = results.filter((r) => r.notes).map((r) => `- \`${r.id}\`: ${r.notes}`);
  const out = [...head, ...rows];
  if (notes.length) out.push('', 'Notes:', '', ...notes);
  return out.join('\n');
}

function memoryTable(results) {
  const rows = results.filter((r) => r.heap);
  if (!rows.length) return null;
  const head = [
    '| Case | samples | median heap delta | mean | max | GC forced |',
    '| --- | ---: | ---: | ---: | ---: | :---: |',
  ];
  return [
    ...head,
    ...rows.map(
      (r) =>
        `| \`${r.id}\` | ${r.heap.samples} | ${kb(r.heap.median)} KB | ${kb(r.heap.mean)} KB | ${kb(r.heap.max)} KB | ${r.heap.gcForced ? 'yes' : 'NO'} |`
    ),
  ].join('\n');
}

function curveTable(curveList) {
  if (!curveList.length) return null;
  const head = [
    '| Curve | points (n → median ms) | n grew | time grew | fitted exponent | verdict |',
    '| --- | --- | ---: | ---: | ---: | --- |',
  ];
  return [
    ...head,
    ...curveList.map((c) => {
      const pts = c.points.map((p) => `${p.n} → ${fmt(p.t, 2)}`).join('; ');
      return `| ${c.curve} | ${pts} | ${fmt(c.nFactor, 0)}x | ${fmt(c.timeFactor, 1)}x | ${fmt(c.exponent, 2)} | **${c.complexity}** |`;
    }),
  ].join('\n');
}

/** Relatorio completo em markdown. */
export function toMarkdown(run) {
  const lines = [];
  lines.push('# Voodoo.js — Benchmark Report');
  lines.push('');
  lines.push(`Generated ${run.env.timestamp} by \`benchmarks/run.mjs\`.`);
  lines.push('');
  lines.push('## Environment');
  lines.push('');
  lines.push(envMarkdown(run.env));
  lines.push('');

  const failed = run.results.filter((r) => r.status === 'failed');
  const invalid = run.results.filter((r) => r.status === 'invalid');
  const unverified = run.results.filter((r) => r.status === 'ok' && !r.verified);

  lines.push('## Run summary');
  lines.push('');
  lines.push(`- Cases run: **${run.results.length}**`);
  lines.push(`- Correctness-verified: **${run.results.filter((r) => r.verified).length}**`);
  lines.push(`- Invalid (produced wrong output — NOT a speed result): **${invalid.length}**`);
  lines.push(`- Failed (threw): **${failed.length}**`);
  lines.push(`- Unverified (no assertion — treat with suspicion): **${unverified.length}**`);
  lines.push(`- Total wall time: **${fmt(run.wallMs / 1000, 1)} s**`);
  lines.push('');

  if (invalid.length) {
    lines.push('### Invalid results');
    lines.push('');
    for (const r of invalid) lines.push(`- \`${r.id}\`: ${r.verifyMessage}`);
    lines.push('');
  }
  if (failed.length) {
    lines.push('### Failures');
    lines.push('');
    for (const r of failed) lines.push(`- \`${r.id}\`: ${r.error}`);
    lines.push('');
  }

  const leaks = run.results.filter((r) => r.leaking);
  lines.push('### Memory leaks found');
  lines.push('');
  if (!run.env.gcExposed) {
    lines.push('Run was NOT started with `--expose-gc`, so no leak claim can be made. Re-run with `node --expose-gc`.');
  } else if (!leaks.length) {
    lines.push('None above the declared per-cycle budgets.');
  } else {
    lines.push('| Case | retained per cycle | budget | over by |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const r of leaks) {
      lines.push(
        `| \`${r.id}\` | **${kb(r.stats.median)} KB** | ${kb(r.leakBudgetBytes)} KB | ${(r.stats.median / r.leakBudgetBytes).toFixed(1)}x |`
      );
    }
  }
  lines.push('');

  const unstable = run.results.filter((r) => r.stable === false);
  if (unstable.length) {
    lines.push('### Not reliable for regression gating');
    lines.push('');
    lines.push('These cases did not settle below the RSD target even after extra samples. Their medians are');
    lines.push('reported, but a regression gate built on them would fire on noise.');
    lines.push('');
    lines.push('| Case | samples | CV % | suggested gate |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const r of unstable) {
      lines.push(`| \`${r.id}\` | ${r.stats.samples} | ${fmt(r.stats.rsd, 1)} | ±${r.suggestedGatePct}% |`);
    }
    lines.push('');
  }

  const groups = [...new Set(run.results.map((r) => r.group))];
  for (const g of groups) {
    const rows = run.results.filter((r) => r.group === g);
    lines.push(`## ${g}`);
    lines.push('');
    lines.push(caseTable(rows));
    lines.push('');
    const mem = memoryTable(rows);
    if (mem) {
      lines.push('Heap:');
      lines.push('');
      lines.push(mem);
      lines.push('');
    }
  }

  if (run.curves?.length) {
    lines.push('## Growth curves (complexity)');
    lines.push('');
    lines.push(curveTable(run.curves));
    lines.push('');
    lines.push(
      '> Read: if `n` grows 100x and time grows ~100x, the operation is O(n). If time grows ~10000x, it is O(n^2).'
    );
    lines.push('');
  }

  if (run.bundle) {
    lines.push('## Bundle');
    lines.push('');
    lines.push(run.bundle.markdown);
    lines.push('');
  }

  lines.push('## How to read the ratings');
  lines.push('');
  lines.push('- **Excellent** — within 2x of the hand-written vanilla JS baseline for the same scenario, or under half the declared budget.');
  lines.push('- **Competitive** — within 5x of vanilla, or inside the budget.');
  lines.push('- **Needs improvement** — beyond that.');
  lines.push('- **Unrated** — no vanilla pair and no budget. Not a pass.');
  lines.push('- **INVALID** — the case produced the wrong DOM/state. Any timing it produced is meaningless.');
  lines.push('');

  return lines.join('\n');
}

export function writeReport(run, name = 'latest.md') {
  fs.mkdirSync(reportsDir, { recursive: true });
  const file = path.join(reportsDir, name);
  fs.writeFileSync(file, toMarkdown(run), 'utf8');
  return file;
}

/** Linha curta para o terminal. */
export function consoleLine(r) {
  if (r.status === 'failed') return `  FAIL  ${r.id} — ${r.error}`;
  if (r.status === 'invalid') return `  INVALID  ${r.id} — ${r.verifyMessage}`;
  const s = r.stats;
  return `  ok    ${r.id.padEnd(40)} ${fmt(s.median, 3).padStart(10)} ms  (cv ${fmt(s.rsd, 1)}%, n=${s.samples})`;
}
