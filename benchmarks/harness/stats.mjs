/**
 * @module benchmarks/harness/stats
 *
 * Estatistica descritiva das amostras de tempo.
 *
 * Regra da casa: outliers sao DETECTADOS e REPORTADOS, nunca removidos em
 * silencio. Um numero que some do relatorio e um numero que ninguem auditou.
 */

/** Ordena uma copia, sem mexer no array original. */
function sorted(values) {
  return [...values].sort((a, b) => a - b);
}

/**
 * Percentil por interpolacao linear (metodo R-7, o mesmo do Excel e do numpy).
 * @param {number[]} asc amostras ja ordenadas
 * @param {number} p 0..1
 */
export function percentile(asc, p) {
  if (asc.length === 0) return NaN;
  if (asc.length === 1) return asc[0];
  const idx = (asc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return asc[lo];
  return asc[lo] + (asc[hi] - asc[lo]) * (idx - lo);
}

export function mean(values) {
  if (!values.length) return NaN;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Desvio padrao amostral (denominador n-1). */
export function stddev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) ** 2;
  return Math.sqrt(acc / (values.length - 1));
}

/**
 * Outliers pelo criterio de Tukey: fora de [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
 * Devolve os indices e os valores, para o relatorio poder mostrar quais foram.
 */
export function outliers(values) {
  const asc = sorted(values);
  const q1 = percentile(asc, 0.25);
  const q3 = percentile(asc, 0.75);
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const found = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] < low || values[i] > high) found.push({ index: i, value: values[i] });
  }
  return { q1, q3, iqr, low, high, found };
}

/**
 * Resumo completo de uma serie de amostras (em milissegundos).
 *
 * `rsd` (desvio padrao relativo, em %) e o numero que interessa para calibrar
 * o portao de regressao: um budget menor que o rsd observado so detecta ruido.
 */
export function summarize(values) {
  const asc = sorted(values);
  const m = mean(values);
  const sd = stddev(values);
  const out = outliers(values);
  return {
    samples: values.length,
    mean: m,
    median: percentile(asc, 0.5),
    min: asc[0],
    max: asc[asc.length - 1],
    stddev: sd,
    rsd: m ? (sd / m) * 100 : 0,
    p75: percentile(asc, 0.75),
    p95: percentile(asc, 0.95),
    p99: percentile(asc, 0.99),
    outliers: out.found,
    outlierCount: out.found.length,
    iqrFence: { low: out.low, high: out.high },
    raw: values,
  };
}

/**
 * Classifica um caso.
 *
 * Quando existe uma linha de base em JS puro para o MESMO cenario, a nota vem
 * da razao contra ela: e a unica comparacao honesta, porque roda no mesmo
 * jsdom, na mesma maquina, no mesmo instante.
 *
 * Sem linha de base, a nota vem do orcamento absoluto declarado no proprio
 * caso (`budgetMs`). Sem nenhum dos dois, o caso fica `Unrated` — melhor um
 * buraco visivel do que uma nota inventada.
 */
export function classify({ medianMs, vanillaMedianMs, budgetMs }) {
  if (typeof vanillaMedianMs === 'number' && vanillaMedianMs > 0) {
    const ratio = medianMs / vanillaMedianMs;
    if (ratio <= 2) return { rating: 'Excellent', basis: `${ratio.toFixed(2)}x vanilla` };
    if (ratio <= 5) return { rating: 'Competitive', basis: `${ratio.toFixed(2)}x vanilla` };
    return { rating: 'Needs improvement', basis: `${ratio.toFixed(2)}x vanilla` };
  }
  if (typeof budgetMs === 'number' && budgetMs > 0) {
    const ratio = medianMs / budgetMs;
    if (ratio <= 0.5) return { rating: 'Excellent', basis: `${(ratio * 100).toFixed(0)}% do budget ${budgetMs}ms` };
    if (ratio <= 1) return { rating: 'Competitive', basis: `${(ratio * 100).toFixed(0)}% do budget ${budgetMs}ms` };
    return { rating: 'Needs improvement', basis: `${(ratio * 100).toFixed(0)}% do budget ${budgetMs}ms` };
  }
  return { rating: 'Unrated', basis: 'sem baseline vanilla e sem budget declarado' };
}

/**
 * Estima a ordem de crescimento a partir de pares (n, tempo).
 * Ajusta log(t) = a + b*log(n) por minimos quadrados; `b` e o expoente.
 */
export function growthExponent(points) {
  const usable = points.filter((p) => p.n > 0 && p.t > 0);
  if (usable.length < 2) return null;
  const xs = usable.map((p) => Math.log(p.n));
  const ys = usable.map((p) => Math.log(p.t));
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const b = num / den;
  return { exponent: b, label: complexityLabel(b) };
}

function complexityLabel(b) {
  if (b < 0.5) return 'O(1)';
  if (b < 1.25) return 'O(n)';
  if (b < 1.6) return 'O(n log n)';
  if (b < 2.5) return 'O(n^2)';
  return `O(n^${b.toFixed(1)})`;
}
