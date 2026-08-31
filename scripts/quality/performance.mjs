/**
 * Performance: compara a ultima medicao com a baseline gravada.
 *
 * Este check nao mede nada por conta propria. Quem mede e `benchmarks/`. Se
 * ainda nao existe medicao, o resultado e SKIP com a instrucao — jamais um
 * numero inventado. Um relatorio de desempenho com dado fabricado e pior que
 * relatorio nenhum, porque alguem vai tomar decisao em cima dele.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, STATUS, fail, note, readJson, rel, warn } from './lib.mjs';

export const meta = { label: 'Performance' };

const BENCH_DIR = join(ROOT, 'benchmarks');
const LATEST = join(BENCH_DIR, 'results', 'latest.json');
const BASELINE = join(BENCH_DIR, 'results', 'baseline.json');

/** Piora aceitavel antes de virar aviso e antes de virar falha. */
const BUDGET = { warnPercent: 10, failPercent: 25 };

/**
 * Extrai `{ nome: medicao }` de um json de benchmark.
 *
 * Entende o schema de `benchmarks/results/*.json` deste repositorio
 * (`{ results: [{ id, unit, stats: { median }, stable }] }`) e tambem os
 * formatos mais comuns de outras ferramentas, para o check nao quebrar se a
 * suite de benchmark for trocada.
 */
function normalize(data) {
  if (!data || typeof data !== 'object') return null;

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.benchmarks)
        ? data.benchmarks
        : null;

  if (rows) {
    const out = {};
    for (const row of rows) {
      const name = row.id ?? row.name ?? row.title;
      // A mediana resiste melhor a outlier que a media; e o que a propria
      // suite usa para julgar estabilidade.
      const value =
        row.stats?.median ??
        row.stats?.mean ??
        row.hz ??
        row.opsPerSecond ??
        row.ops ??
        row.mean ??
        row.ms ??
        row.duration ??
        row.value;
      if (typeof name !== 'string' || typeof value !== 'number') continue;

      const unit = String(row.unit ?? '').toLowerCase();
      const higherIsBetter =
        unit === 'hz' || unit === 'ops' || unit.includes('ops/') || 'hz' in row || 'ops' in row;

      out[name] = {
        value,
        higherIsBetter,
        unit: row.unit ?? null,
        // A propria suite marca o que nao e confiavel para portao de
        // regressao. Ignorar esse aviso seria transformar ruido em falha.
        stable: row.stable !== false,
        status: row.status ?? 'ok',
        notes: row.notes ?? null,
      };
    }
    return Object.keys(out).length ? out : null;
  }

  const source = data.results ?? data.benchmarks ?? data;
  const out = {};
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'number') out[name] = { value, higherIsBetter: false };
    else if (value && typeof value === 'object') {
      const v = value.hz ?? value.mean ?? value.ms ?? value.duration ?? value.value;
      if (typeof v === 'number')
        out[name] = { value: v, higherIsBetter: 'hz' in value || 'ops' in value };
    }
  }
  return Object.keys(out).length ? out : null;
}

export async function run() {
  if (!existsSync(LATEST)) {
    return {
      status: STATUS.SKIP,
      summary: 'sem medicao gravada',
      findings: [],
      details: {
        expected: rel(LATEST),
        howToEnable:
          'gere benchmarks/results/latest.json (e um benchmarks/results/baseline.json para comparar). ' +
          'Sem esses arquivos este check nao tem dado nenhum e nao vai inventar um.',
        budget: BUDGET,
      },
    };
  }

  const latestRaw = readJson(LATEST);
  const latest = normalize(latestRaw);
  if (!latest) {
    return {
      status: STATUS.FAIL,
      summary: 'latest.json ilegivel',
      findings: [
        fail('Nao foi possivel extrair medicoes de latest.json', {
          file: rel(LATEST),
          expected: 'mapa nome->numero, ou { results: [{ name, hz|mean|ms }] }',
          actual: latestRaw ? 'json valido mas sem medicao reconhecivel' : 'json invalido',
        }),
      ],
      details: {},
    };
  }

  if (!existsSync(BASELINE)) {
    return {
      status: STATUS.SKIP,
      summary: `${Object.keys(latest).length} medicoes, sem baseline para comparar`,
      findings: [
        note('Ha medicao mas nao ha baseline; nao da para dizer se melhorou ou piorou', {
          file: rel(BASELINE),
          expected: 'benchmarks/results/baseline.json',
          actual: 'ausente',
        }),
      ],
      details: {
        measurements: Object.keys(latest).length,
        howToEnable: `copie ${rel(LATEST)} para ${rel(BASELINE)} num commit estavel`,
        latest,
      },
    };
  }

  const baseline = normalize(readJson(BASELINE));
  if (!baseline) {
    return {
      status: STATUS.FAIL,
      summary: 'baseline.json ilegivel',
      findings: [
        fail('Nao foi possivel extrair medicoes de baseline.json', { file: rel(BASELINE) }),
      ],
      details: {},
    };
  }

  const findings = [];
  const comparisons = [];

  for (const [name, current] of Object.entries(latest)) {
    const before = baseline[name];
    if (!before) {
      findings.push(note(`Medicao nova sem baseline: ${name}`, { file: rel(LATEST) }));
      comparisons.push({ name, baseline: null, latest: current.value, deltaPercent: null });
      continue;
    }

    const higherIsBetter = current.higherIsBetter || before.higherIsBetter;
    const raw = ((current.value - before.value) / before.value) * 100;
    // Normaliza para "quanto piorou": positivo sempre significa regressao.
    const regression = higherIsBetter ? -raw : raw;

    comparisons.push({
      name,
      unit: current.unit,
      baseline: before.value,
      latest: current.value,
      deltaPercent: Number(raw.toFixed(2)),
      regressionPercent: Number(regression.toFixed(2)),
      higherIsBetter,
      stable: current.stable,
      gated: current.stable,
    });

    // A suite de benchmark marca as medicoes cuja dispersao e alta demais para
    // servir de portao. Reprovar em cima delas seria falhar por ruido.
    if (!current.stable) {
      if (regression >= BUDGET.warnPercent) {
        findings.push(
          note(`"${name}" piorou ${regression.toFixed(1)}%, mas a medicao e instavel`, {
            file: rel(LATEST),
            expected: `medicao estavel para servir de portao`,
            actual: current.notes ?? 'marcada como stable: false pela propria suite',
          })
        );
      }
      continue;
    }

    if (regression >= BUDGET.failPercent) {
      findings.push(
        fail(`Regressao de desempenho em "${name}"`, {
          file: rel(LATEST),
          expected: `no maximo ${BUDGET.failPercent}% pior que a baseline (${before.value})`,
          actual: `${regression.toFixed(1)}% pior (${current.value})`,
        })
      );
    } else if (regression >= BUDGET.warnPercent) {
      findings.push(
        warn(`Desempenho piorando em "${name}"`, {
          file: rel(LATEST),
          expected: `no maximo ${BUDGET.warnPercent}% pior que a baseline (${before.value})`,
          actual: `${regression.toFixed(1)}% pior (${current.value})`,
        })
      );
    }
  }

  const missing = Object.keys(baseline).filter((n) => !(n in latest));
  for (const name of missing) {
    findings.push(
      warn(`Benchmark da baseline sumiu da medicao atual: ${name}`, {
        file: rel(LATEST),
        expected: `"${name}" presente`,
        actual: 'ausente; a comparacao ficou cega nesse ponto',
      })
    );
  }

  const failCount = findings.filter((f) => f.level === 'fail').length;
  const warnCount = findings.filter((f) => f.level === 'warn').length;

  return {
    status: failCount ? STATUS.FAIL : warnCount ? STATUS.WARN : STATUS.PASS,
    summary: failCount
      ? `${failCount} regressoes acima de ${BUDGET.failPercent}%`
      : warnCount
        ? `${warnCount} medicoes piorando`
        : `${comparisons.length} medicoes dentro do orcamento`,
    findings,
    details: { budget: BUDGET, comparisons },
  };
}
