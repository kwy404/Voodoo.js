/**
 * Comparacao BEFORE/AFTER entre `results/baseline.json` e `results/latest.json`.
 *
 * ```
 * node benchmarks/compare.mjs                       # baseline vs latest
 * node benchmarks/compare.mjs --gate                # sai com codigo 1 se regrediu
 * node benchmarks/compare.mjs a.json b.json         # dois arquivos quaisquer
 * ```
 *
 * Sobre os portoes.
 *
 * Um portao fixo de 5% e uma armadilha. Se um caso tem coeficiente de variacao
 * de 8%, uma diferenca de 5% entre duas execucoes acontece o tempo todo sem
 * nenhuma mudanca de codigo — o portao reprovaria builds boas e ensinaria todo
 * mundo a ignora-lo. Por isso o portao de CADA caso e derivado da variabilidade
 * medida DAQUELE caso: `max(5%, 3 x CV)`, tomando o maior CV entre a baseline e
 * a execucao nova, com piso de 5% e teto de 60%.
 *
 * Tres desvios padrao correspondem a cerca de 99,7% da distribuicao: um caso
 * estavel dispara raramente por acaso, e um caso ruidoso ganha um portao largo
 * o bastante para so disparar quando algo real acontece. Casos que nem assim se
 * estabilizam sao listados como "nao confiaveis" e NAO reprovam a build.
 */

import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, reportsDir, benchRoot } from './harness/paths.mjs';

const PISO_PCT = 5;
const TETO_PCT = 60;
const RSD_INSTAVEL = 15;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const arquivos = argv.filter((a) => !a.startsWith('--'));

const baseFile = arquivos[0] ?? path.join(resultsDir, 'baseline.json');
const novoFile = arquivos[1] ?? path.join(resultsDir, 'latest.json');

for (const f of [baseFile, novoFile]) {
  if (!fs.existsSync(f)) {
    console.error(`nao encontrei ${f}.`);
    console.error('Rode `node benchmarks/run.mjs --baseline` para congelar uma baseline primeiro.');
    process.exit(2);
  }
}

const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const novo = JSON.parse(fs.readFileSync(novoFile, 'utf8'));

const porId = (run) => new Map(run.results.map((r) => [r.id, r]));
const mapaBase = porId(base);
const mapaNovo = porId(novo);

/** Portao deste caso, derivado da variabilidade real dos dois lados. */
function gateFor(a, b) {
  const cv = Math.max(a?.stats?.rsd ?? 0, b?.stats?.rsd ?? 0);
  return Math.min(TETO_PCT, Math.max(PISO_PCT, Math.ceil(cv * 3)));
}

const linhas = [];
const regressoes = [];
const melhorias = [];
const instaveis = [];
const sumiram = [];
const novos = [];

for (const [id, b] of mapaBase) {
  const n = mapaNovo.get(id);
  if (!n) {
    sumiram.push(id);
    continue;
  }
  if (!b.stats || !n.stats) continue;

  const antes = b.stats.median;
  const depois = n.stats.median;
  const deltaPct = antes ? ((depois - antes) / antes) * 100 : 0;
  const gate = gateFor(b, n);
  const cv = Math.max(b.stats.rsd, n.stats.rsd);
  const confiavel = cv <= RSD_INSTAVEL;

  const registro = { id, antes, depois, deltaPct, gate, cv, confiavel, unit: n.unit ?? 'ms' };
  linhas.push(registro);

  if (!confiavel) {
    instaveis.push(registro);
  } else if (deltaPct > gate) {
    regressoes.push(registro);
  } else if (deltaPct < -gate) {
    melhorias.push(registro);
  }

  // Um caso que passou a produzir DOM errado e uma regressao qualquer que seja
  // o tempo. Velocidade sem correcao nao e velocidade.
  if (b.status === 'ok' && n.status !== 'ok') {
    regressoes.push({ ...registro, correctness: `passou de ${b.status} para ${n.status}: ${n.verifyMessage ?? n.error}` });
  }
}

for (const id of mapaNovo.keys()) if (!mapaBase.has(id)) novos.push(id);

// ---------------------------------------------------------------------------
// Saida
// ---------------------------------------------------------------------------
const f = (v, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const sinal = (v) => (v > 0 ? `+${f(v, 1)}` : f(v, 1));

const md = [];
md.push('# Voodoo.js — BEFORE / AFTER');
md.push('');
md.push('| | baseline | new |');
md.push('| --- | --- | --- |');
md.push(`| file | \`${path.relative(benchRoot, baseFile)}\` | \`${path.relative(benchRoot, novoFile)}\` |`);
md.push(`| commit | ${base.env.commitShort ?? '?'} | ${novo.env.commitShort ?? '?'} |`);
md.push(`| source | ${base.env.measuredSource ?? '?'} | ${novo.env.measuredSource ?? '?'} |`);
md.push(`| timestamp | ${base.env.timestamp} | ${novo.env.timestamp} |`);
md.push(`| CPU | ${base.env.cpuModel} | ${novo.env.cpuModel} |`);
md.push(`| Node | ${base.env.node} | ${novo.env.node} |`);
md.push('');

if (base.env.cpuModel !== novo.env.cpuModel || base.env.node !== novo.env.node) {
  md.push('> **WARNING** — the two runs come from different machines or Node versions.');
  md.push('> Cross-machine comparison is not valid. Re-measure the baseline here.');
  md.push('');
}

md.push('## Summary');
md.push('');
md.push(`- Cases compared: **${linhas.length}**`);
md.push(`- Regressions (beyond this case's gate): **${regressoes.length}**`);
md.push(`- Improvements: **${melhorias.length}**`);
md.push(`- Too noisy to judge (CV > ${RSD_INSTAVEL}%): **${instaveis.length}**`);
md.push(`- Dropped from the suite: **${sumiram.length}**`);
md.push(`- New in the suite: **${novos.length}**`);
md.push('');
md.push(
  `Per-case gate = \`max(${PISO_PCT}%, 3 x CV)\` capped at ${TETO_PCT}%, using the larger CV of the two runs. ` +
    'A gate below a case\'s own noise floor detects noise, not regressions.'
);
md.push('');

const tabela = (titulo, itens) => {
  if (!itens.length) return;
  md.push(`## ${titulo}`);
  md.push('');
  md.push('| Case | before | after | delta | gate | CV |');
  md.push('| --- | ---: | ---: | ---: | ---: | ---: |');
  for (const r of itens.sort((a, b) => b.deltaPct - a.deltaPct)) {
    md.push(
      `| \`${r.id}\` | ${f(r.antes)} | ${f(r.depois)} | **${sinal(r.deltaPct)}%** | ±${r.gate}% | ${f(r.cv, 1)}% |` +
        (r.correctness ? ` <!-- ${r.correctness} -->` : '')
    );
  }
  md.push('');
};

tabela('Regressions', regressoes.filter((r) => !r.correctness));
if (regressoes.some((r) => r.correctness)) {
  md.push('## Correctness regressions');
  md.push('');
  for (const r of regressoes.filter((x) => x.correctness)) md.push(`- \`${r.id}\`: ${r.correctness}`);
  md.push('');
}
tabela('Improvements', melhorias);
tabela('Too noisy to judge', instaveis);

md.push('## All cases');
md.push('');
md.push('| Case | before | after | delta | gate | CV | verdict |');
md.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');
for (const r of linhas.sort((a, b) => a.id.localeCompare(b.id))) {
  const veredito = !r.confiavel
    ? 'noisy'
    : r.deltaPct > r.gate
      ? '**REGRESSION**'
      : r.deltaPct < -r.gate
        ? 'improvement'
        : 'no change';
  md.push(
    `| \`${r.id}\` | ${f(r.antes)} | ${f(r.depois)} | ${sinal(r.deltaPct)}% | ±${r.gate}% | ${f(r.cv, 1)}% | ${veredito} |`
  );
}
md.push('');

if (sumiram.length) {
  md.push('## Dropped from the suite');
  md.push('');
  for (const id of sumiram) md.push(`- \`${id}\``);
  md.push('');
}
if (novos.length) {
  md.push('## New in the suite (no baseline)');
  md.push('');
  for (const id of novos) md.push(`- \`${id}\``);
  md.push('');
}

fs.mkdirSync(reportsDir, { recursive: true });
const out = path.join(reportsDir, 'comparison-before-after.md');
fs.writeFileSync(out, md.join('\n'), 'utf8');

console.log(`compared ${linhas.length} cases`);
console.log(`  regressions:  ${regressoes.length}`);
console.log(`  improvements: ${melhorias.length}`);
console.log(`  too noisy:    ${instaveis.length}`);
for (const r of regressoes) {
  console.log(`  REGRESSION ${r.id}: ${f(r.antes)} -> ${f(r.depois)} (${sinal(r.deltaPct)}%, gate ±${r.gate}%)`);
}
for (const r of melhorias.slice(0, 15)) {
  console.log(`  improved   ${r.id}: ${f(r.antes)} -> ${f(r.depois)} (${sinal(r.deltaPct)}%)`);
}
console.log('\nwrote: ' + path.relative(benchRoot, out));

if (flags.has('--gate') && regressoes.length) process.exit(1);
