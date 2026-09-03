/**
 * Performance: compares the latest measurement with the recorded baseline.
 *
 * This check measures nothing on its own. `benchmarks/` is what measures. If
 * there is no measurement yet, the result is SKIP with the instructions, never
 * an invented number. A performance report with fabricated data is worse than
 * no report at all, because someone is going to make a decision based on it.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, STATUS, fail, note, readJson, rel, warn } from './lib.mjs';

export const meta = { label: 'Performance' };

const BENCH_DIR = join(ROOT, 'benchmarks');
const LATEST = join(BENCH_DIR, 'results', 'latest.json');
const BASELINE = join(BENCH_DIR, 'results', 'baseline.json');

/** Acceptable degradation before it becomes a warning, and before it becomes a failure. */
const BUDGET = { warnPercent: 10, failPercent: 25 };

/**
 * Extracts `{ name: measurement }` from a benchmark json.
 *
 * It understands this repository's `benchmarks/results/*.json` schema
 * (`{ results: [{ id, unit, stats: { median }, stable }] }`) and also the most
 * common formats from other tools, so that the check does not break if the
 * benchmark suite is swapped out.
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
      // The median resists outliers better than the mean; it is what the suite
      // itself uses to judge stability.
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
        // The suite itself marks what is not reliable enough to gate a
        // regression on. Ignoring that flag would turn noise into a failure.
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
    // Normalized to "how much worse": positive always means a regression.
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

    // The benchmark suite marks the measurements whose spread is too high to
    // serve as a gate. Failing on those would be failing on noise.
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
