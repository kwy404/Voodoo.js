/**
 * @module benchmarks/harness/runner
 *
 * Executor dos benchmarks.
 *
 * Contrato de um caso:
 *
 * ```js
 * {
 *   id: 'lists/create-1000',      // estavel: e a chave usada na comparacao
 *   name: 'create 1000 rows',
 *   group: 'lists',
 *   n: 1000,                      // opcional, alimenta a curva de crescimento
 *   samples: 30,                  // opcional
 *   warmup: 5,                    // opcional
 *   budgetMs: 20,                 // opcional, usado quando nao ha vanilla
 *   vanillaOf: 'lists/create-1000-vanilla', // opcional, id do par em JS puro
 *   setup: async () => ctx,       // fora da medicao
 *   run: async (ctx) => resultado,// DENTRO da medicao
 *   verify: (ctx, resultado) => true | 'mensagem de erro',
 *   teardown: async (ctx) => {},  // fora da medicao
 *   measureMemory: false,         // mede heap em vez de so tempo
 * }
 * ```
 *
 * `verify` nao e opcional na pratica: um caso sem verificacao e marcado como
 * `unverified` no relatorio. Um benchmark que produziu o resultado errado nao e
 * rapido, e invalido.
 */

import { summarize, classify, growthExponent, stddev, mean } from './stats.mjs';
import { forceGC, gcAvailable } from './env.mjs';

const DEFAULTS = {
  samples: 30,
  warmup: 5,
  /** Casos caros pedem menos amostras; o proprio caso decide. */
  maxTotalMs: 30_000,
  /**
   * Alvo de desvio padrao relativo. Enquanto o RSD estiver acima disto e ainda
   * houver orcamento de amostras e de tempo, o runner continua amostrando.
   *
   * Um RSD de 60% com 8 amostras nao mede desempenho, mede o escalonador do
   * sistema operacional. Um portao de regressao construido sobre isso reprova
   * builds boas e aprova regressoes de verdade.
   */
  targetRsd: 8,
  maxSamples: 200,
};

/** `true` quando o caso e confiavel o bastante para servir de portao. */
export function isStable(result) {
  return result.status === 'ok' && !!result.stats && result.stats.rsd <= DEFAULTS.targetRsd * 1.25;
}

export const RUNNER_DEFAULTS = DEFAULTS;

/** Tempo em milissegundos com a melhor resolucao disponivel no Node. */
function now() {
  return Number(process.hrtime.bigint()) / 1e6;
}

/** Cede o event loop para o jsdom e os timers respirarem entre amostras. */
function breathe() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Roda um caso e devolve o resultado completo, incluindo falhas.
 * Nunca lanca: uma falha vira um resultado com `status: 'failed'`.
 */
export async function runCase(def, { onProgress } = {}) {
  const samples = def.samples ?? DEFAULTS.samples;
  const warmup = def.warmup ?? DEFAULTS.warmup;
  const targetRsd = def.targetRsd ?? DEFAULTS.targetRsd;
  // O teto de amostras extras respeita o custo do caso: um caso de 10.000
  // linhas nao pode ser amostrado 200 vezes dentro do orcamento de tempo.
  const maxSamples = def.maxSamples ?? Math.max(samples, Math.min(DEFAULTS.maxSamples, samples * 4));
  const started = now();

  const result = {
    id: def.id,
    name: def.name ?? def.id,
    group: def.group ?? def.id.split('/')[0],
    n: def.n ?? null,
    unit: def.unit ?? 'ms',
    status: 'ok',
    verified: false,
    verifyMessage: null,
    error: null,
    plannedSamples: samples,
    warmup,
    budgetMs: def.budgetMs ?? null,
    vanillaOf: def.vanillaOf ?? null,
    curve: def.curve ?? null,
    notes: def.notes ?? null,
  };

  const times = [];
  const heapDeltas = [];
  let ranSamples = 0;

  // `setupOnce` monta o cenario uma vez so e reaproveita entre amostras.
  // Existe para os casos em que a montagem custa ordens de grandeza mais que a
  // operacao medida — montar 10.000 linhas para depois medir a alteracao de UMA
  // delas. Nesses casos `run` precisa ser idempotente no sentido de continuar
  // fazendo trabalho de verdade a cada chamada; quem escreve o caso garante
  // isso variando o valor escrito.
  let sharedCtx;
  const acquire = async () => (def.setupOnce ? sharedCtx : def.setup ? await def.setup() : undefined);
  const release = async (ctx) => {
    if (!def.setupOnce && def.teardown) await def.teardown(ctx);
  };

  try {
    if (def.setupOnce && def.setup) sharedCtx = await def.setup();

    // --- Aquecimento: JIT, caches de expressao, forma dos objetos. ---
    for (let i = 0; i < warmup; i++) {
      const ctx = await acquire();
      await def.run(ctx);
      await release(ctx);
    }
    await breathe();

    // --- Medicao ---
    // O laco vai ate `maxSamples`, mas para assim que passar de `samples` E o
    // RSD ficar dentro do alvo. Casos estaveis terminam cedo; casos ruidosos
    // ganham amostras ate se acalmarem ou ate o orcamento acabar.
    for (let i = 0; i < maxSamples; i++) {
      const ctx = await acquire();

      if (def.measureMemory) forceGC();
      const heapBefore = def.measureMemory ? process.memoryUsage().heapUsed : 0;

      const t0 = now();
      const value = await def.run(ctx);
      const t1 = now();

      let heapAfter = 0;
      if (def.measureMemory) {
        forceGC();
        heapAfter = process.memoryUsage().heapUsed;
        heapDeltas.push(heapAfter - heapBefore);
      }

      times.push(t1 - t0);
      ranSamples++;

      // Verificacao de correcao na primeira amostra medida. Roda uma vez para
      // nao poluir o tempo das outras, mas roda sempre.
      if (i === 0 && def.verify) {
        const verdict = await def.verify(ctx, value);
        if (verdict === true || verdict === undefined) {
          result.verified = true;
        } else {
          result.status = 'invalid';
          result.verifyMessage = String(verdict);
        }
      }

      await release(ctx);
      // Casos grandes alocam dezenas de milhares de nos por amostra. Sem uma
      // coleta entre amostras o processo chega ao teto de heap antes de
      // terminar a suite — o que ja aconteceu de verdade neste projeto.
      if (def.gcBetweenSamples ?? (!def.setupOnce && (def.n ?? 0) >= 5000)) forceGC();

      if (result.status === 'invalid') break;

      // Parada preditiva: se a PROXIMA amostra estourar o orcamento, para
      // agora. Sem isto um caso de 6 s por amostra descobre o teto de 30 s
      // depois de ja ter gasto 36 s — e, pior, depois de ter alocado tudo de
      // novo. Este benchmark precisa caber na memoria da maquina.
      const elapsed = now() - started;
      const budget = def.maxTotalMs ?? DEFAULTS.maxTotalMs;
      const perSample = elapsed / Math.max(1, ranSamples);
      if (elapsed + perSample > budget) {
        if (ranSamples < 3) {
          result.notes =
            `${result.notes ? result.notes + '; ' : ''}apenas ${ranSamples} amostra(s): cada uma custa ` +
            `~${perSample.toFixed(0)} ms e o orcamento do caso e ${budget} ms`;
        } else {
          result.notes = `${result.notes ? result.notes + '; ' : ''}parou em ${ranSamples} amostras pelo teto de tempo`;
        }
        break;
      }
      if (ranSamples >= samples) {
        const sd = stddev(times);
        const m = mean(times);
        const rsd = m ? (sd / m) * 100 : 0;
        if (rsd <= targetRsd) break;
      }
      if (i % 10 === 9) await breathe();
    }
  } catch (err) {
    result.status = 'failed';
    result.error = `${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`;
    result.stack = err?.stack?.split('\n').slice(0, 6).join('\n') ?? null;
  } finally {
    if (def.setupOnce && def.teardown && sharedCtx !== undefined) {
      try {
        await def.teardown(sharedCtx);
      } catch (err) {
        result.notes = `${result.notes ? result.notes + '; ' : ''}teardown falhou: ${err?.message ?? err}`;
      }
    }
  }

  if (times.length) {
    result.stats = summarize(times);
    // O JSON guarda as amostras cruas para alguem poder refazer a estatistica
    // sem rodar de novo. `cv` e o mesmo numero que `rsd`, com o nome que a
    // literatura usa: coeficiente de variacao, em porcento.
    result.stats.cv = result.stats.rsd;
    result.targetRsd = targetRsd;
    result.stable = result.stats.rsd <= targetRsd * 1.25;
    if (!result.stable) {
      result.notes =
        `${result.notes ? result.notes + '; ' : ''}RSD ${result.stats.rsd.toFixed(1)}% acima do alvo ` +
        `${targetRsd}% depois de ${ranSamples} amostras — NAO confiavel para portao de regressao`;
    }
    // Portao derivado da variabilidade REAL deste caso, e nao de um numero
    // global escolhido no chute: 3 desvios padrao relativos, com piso de 5%.
    result.suggestedGatePct = Math.max(5, Math.ceil(result.stats.rsd * 3));

    // Casos de memoria medem bytes retidos por ciclo. Passar do teto nao
    // invalida o benchmark: e o achado.
    if (typeof def.leakBudgetBytes === 'number') {
      result.leakBudgetBytes = def.leakBudgetBytes;
      result.leaking = gcAvailable() && result.stats.median > def.leakBudgetBytes;
      result.gcVerified = gcAvailable();
    }
  }
  if (heapDeltas.length) {
    result.heap = summarize(heapDeltas);
    result.heap.gcForced = gcAvailable();
  }
  result.wallMs = now() - started;
  if (result.status === 'ok' && !def.verify) result.verified = false;

  onProgress?.(result);
  return result;
}

/**
 * Roda uma lista de casos em sequencia. Sequencia e proposital: dois casos em
 * paralelo disputariam o mesmo documento e a mesma CPU, e nenhum dos dois
 * numeros valeria nada.
 *
 * Entre casos o runner forca uma coleta (quando ha `--expose-gc`) e cede o
 * event loop, para que o lixo de um caso nao seja cobrado do proximo.
 */
export async function runSuite(cases, { onProgress } = {}) {
  const out = [];
  for (const def of cases) {
    out.push(await runCase(def, { onProgress }));
    forceGC();
    await breathe();
  }
  return out;
}

/**
 * Aplica a classificacao depois que todos os casos rodaram, porque a nota de um
 * caso pode depender do par em JS puro, que so existe no fim.
 */
export function rate(results) {
  const byId = new Map(results.map((r) => [r.id, r]));
  for (const r of results) {
    if (r.status !== 'ok' || !r.stats) {
      r.rating = r.status === 'invalid' ? 'INVALID' : 'FAILED';
      r.ratingBasis = r.verifyMessage ?? r.error ?? 'nao produziu amostras';
      continue;
    }
    const vanilla = r.vanillaOf ? byId.get(r.vanillaOf) : null;
    const { rating, basis } = classify({
      medianMs: r.stats.median,
      vanillaMedianMs: vanilla?.stats?.median,
      budgetMs: r.budgetMs,
    });
    r.rating = rating;
    r.ratingBasis = basis;
    if (vanilla?.stats?.median) r.overheadOverVanilla = r.stats.median / vanilla.stats.median;
  }
  return results;
}

/**
 * Agrupa casos que compartilham `curve` e calcula o expoente de crescimento.
 * E o que transforma "10.000 e lento" em "isto e O(n^2)".
 */
export function curves(results) {
  const groups = new Map();
  for (const r of results) {
    if (!r.curve || r.status !== 'ok' || !r.stats || !r.n) continue;
    if (!groups.has(r.curve)) groups.set(r.curve, []);
    groups.get(r.curve).push({ n: r.n, t: r.stats.median, id: r.id });
  }
  const out = [];
  for (const [name, points] of groups) {
    points.sort((a, b) => a.n - b.n);
    const g = growthExponent(points);
    // Fator observado entre o menor e o maior n, o numero que se le sem
    // precisar acreditar em regressao nenhuma.
    const first = points[0];
    const last = points[points.length - 1];
    out.push({
      curve: name,
      points,
      exponent: g?.exponent ?? null,
      complexity: g?.label ?? 'indeterminado',
      nFactor: first.n ? last.n / first.n : null,
      timeFactor: first.t ? last.t / first.t : null,
    });
  }
  return out;
}

/** Marca `curve` nos casos, para o runner poder agrupa-los depois. */
export function withCurve(curveName, cases) {
  for (const c of cases) c.curve = curveName;
  return cases;
}
