/**
 * Sondas focadas para os gargalos levantados na auditoria.
 *
 * ```
 * node --expose-gc benchmarks/profile/bottlenecks.mjs
 * ```
 *
 * Cada sonda isola UM suspeito, roda em 100 / 1.000 / 10.000 (e mais, quando o
 * sinal precisa) e devolve um veredito: CONFIRMADO ou REFUTADO, com a curva de
 * crescimento observada ao lado.
 *
 * A regra de leitura e sempre a mesma: quando `n` e multiplicado por 10, um
 * custo linear multiplica o tempo por ~10 e um custo quadratico multiplica por
 * ~100. O expoente ajustado por minimos quadrados aparece junto, mas os fatores
 * crus estao ali para quem preferir nao acreditar no ajuste.
 */

import { installDom, loadVoodoo } from '../harness/dom.mjs';
import { growthExponent, summarize } from '../harness/stats.mjs';
import { captureEnv } from '../harness/env.mjs';

installDom();
const V = await loadVoodoo();
V.config.autoDiscover = false;

const { reactive, effect, effectScope, Scope, walk, destroy, flushSync } = V;

const gc = () => {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    globalThis.gc();
  }
};
const now = () => Number(process.hrtime.bigint()) / 1e6;

/**
 * Mede `run` com aquecimento e amostras, devolvendo a mediana.
 * Setup e teardown ficam fora do relogio.
 */
function bench({ setup, run, teardown, samples = 12, warmup = 3 }) {
  for (let i = 0; i < warmup; i++) {
    const ctx = setup?.();
    run(ctx);
    teardown?.(ctx);
  }
  gc();
  const times = [];
  for (let i = 0; i < samples; i++) {
    const ctx = setup?.();
    const t0 = now();
    run(ctx);
    const t1 = now();
    times.push(t1 - t0);
    teardown?.(ctx);
    gc();
  }
  return summarize(times);
}

const linha = (n, s) => `      n=${String(n).padStart(6)}  median ${s.median.toFixed(3).padStart(10)} ms   cv ${s.rsd.toFixed(1)}%`;

/** Roda uma sonda em varios tamanhos e imprime o veredito. */
function sonda({ titulo, local, hipotese, sizes, make, esperadoLinear = true }) {
  console.log(`\n${'='.repeat(78)}`);
  console.log(titulo);
  console.log(`  local:     ${local}`);
  console.log(`  hipotese:  ${hipotese}`);
  const pontos = [];
  for (const n of sizes) {
    const s = bench(make(n));
    pontos.push({ n, t: s.median, cv: s.rsd });
    console.log(linha(n, s));
  }
  const g = growthExponent(pontos);
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const fatorN = ultimo.n / primeiro.n;
  const fatorT = ultimo.t / primeiro.t;
  console.log(
    `  crescimento: n x${fatorN.toFixed(0)} -> tempo x${fatorT.toFixed(1)}  ` +
      `(expoente ${g.exponent.toFixed(2)} => ${g.label})`
  );
  const quadratico = g.exponent >= 1.6;
  const veredito = esperadoLinear
    ? quadratico
      ? 'CONFIRMADO — cresce mais rapido que linear'
      : 'REFUTADO — cresce linear ou perto disso'
    : quadratico
      ? 'CONFIRMADO'
      : 'REFUTADO';
  console.log(`  VEREDITO:  ${veredito}`);
  return { titulo, local, hipotese, pontos, exponent: g.exponent, complexity: g.label, fatorN, fatorT, veredito };
}

const resultados = [];

// ---------------------------------------------------------------------------
// 1. scheduler: `queue.includes(job)` em queueJob
// ---------------------------------------------------------------------------
// A sonda mede a DIFERENCA entre duas cargas com o mesmo numero de escritas e
// de chamadas a trigger. Na primeira ha N efeitos distintos, entao a fila
// cresce ate N e cada enfileiramento a varre inteira. Na segunda ha 1 efeito,
// entao a fila tem sempre 1 item e `includes` e gratuito. O que sobra da
// subtracao e o custo da varredura, e nada mais.
const keysFor = (n) => Array.from({ length: n }, (_, i) => 'k' + i);

const filaDistintos = (n) => ({
  samples: 10,
  warmup: 3,
  setup: () => {
    const keys = keysFor(n);
    const seed = {};
    for (const k of keys) seed[k] = 0;
    const state = reactive(seed);
    const scope = effectScope(true);
    scope.run(() => {
      for (const key of keys) effect(() => state[key], { scope });
    });
    return { state, keys, scope };
  },
  run: (ctx) => {
    const { state, keys } = ctx;
    for (let i = 0; i < keys.length; i++) state[keys[i]] = i + 1;
    flushSync();
  },
  teardown: (ctx) => ctx.scope.stop(),
});

resultados.push(
  sonda({
    titulo: '1. SCHEDULER — queue.includes(job) varre a fila a cada enfileiramento',
    local: 'packages/voodoojs/src/reactivity/index.ts:81  queueJob()',
    hipotese: 'N efeitos distintos no mesmo tick custam O(n^2) por causa da varredura linear da fila',
    sizes: [100, 1000, 10000, 20000, 40000],
    make: filaDistintos,
  })
);

// ---------------------------------------------------------------------------
// 2. v-for: `next.includes(block)` dentro do laco de remocao
// ---------------------------------------------------------------------------
// `reverse` e o pior caso possivel para essa linha: NENHUMA chave sai da lista,
// entao `used.has(block.key)` e sempre verdadeiro e o `includes` percorre o
// array `next` inteiro para cada um dos N blocos.
const TEMPLATE = '<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>';
const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, label: 'linha ' + i }));

const reverseCase = (n) => ({
  samples: 8,
  warmup: 2,
  setup: () => {
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);
    const state = reactive({ rows: rowsOf(n) });
    walk(root, new Scope(state));
    flushSync();
    return { root, state };
  },
  run: (ctx) => {
    ctx.state.rows = [...ctx.state.rows].reverse();
    flushSync();
  },
  teardown: (ctx) => {
    destroy(ctx.root);
    ctx.root.remove();
  },
});

resultados.push(
  sonda({
    titulo: '2. V-FOR — next.includes(block) dentro do laco de remocao',
    local: 'packages/voodoojs/src/directives/core.ts:354  if (used.has(block.key) && next.includes(block))',
    hipotese: 'reverse (todas as chaves sobrevivem) custa O(n^2) por causa do includes dentro do laco',
    sizes: [100, 1000, 5000, 10000],
    make: reverseCase,
  })
);

// ---------------------------------------------------------------------------
// 3. v-for: `scope.child(vars)` por item por render, so para avaliar :key
// ---------------------------------------------------------------------------
// Com `:key` cada render aloca um Scope descartavel por item. Sem `:key` a
// chave e o indice e nenhum Scope extra e criado. Os dois casos fazem o MESMO
// trabalho de DOM; a diferenca e a alocacao.
const TEMPLATE_SEM_KEY = '<ul><li v-for="r in rows"><span v-text="r.label"></span></li></ul>';

const swapCase = (tpl) => (n) => ({
  samples: 8,
  warmup: 2,
  setup: () => {
    const root = document.createElement('div');
    root.innerHTML = tpl;
    document.body.appendChild(root);
    const state = reactive({ rows: rowsOf(n) });
    walk(root, new Scope(state));
    flushSync();
    return { root, state, tick: 0 };
  },
  run: (ctx) => {
    // Troca duas linhas: trabalho de DOM O(1), render completo O(n).
    const copia = [...ctx.state.rows];
    const t = copia[1];
    copia[1] = copia[copia.length - 2];
    copia[copia.length - 2] = t;
    ctx.state.rows = copia;
    flushSync();
  },
  teardown: (ctx) => {
    destroy(ctx.root);
    ctx.root.remove();
  },
});

resultados.push(
  sonda({
    titulo: '3a. V-FOR com :key — scope.child(vars) alocado por item por render',
    local: 'packages/voodoojs/src/directives/core.ts:334  evaluateIn(keyExpression, scope.child(vars), ":key")',
    hipotese: 'cada render aloca um Scope descartavel por item, pressionando o coletor',
    sizes: [100, 1000, 5000, 10000],
    make: swapCase(TEMPLATE),
  })
);

resultados.push(
  sonda({
    titulo: '3b. V-FOR sem :key — contraprova, sem alocacao de Scope por item',
    local: 'mesmo caminho, com keyExpression ausente',
    hipotese: 'sem :key nao ha scope.child por item; a diferenca contra 3a e o custo da alocacao',
    sizes: [100, 1000, 5000, 10000],
    make: swapCase(TEMPLATE_SEM_KEY),
  })
);

// ---------------------------------------------------------------------------
// 4. walker: `unindexElement` percorre TODOS os Sets do indice
// ---------------------------------------------------------------------------
// Destruir N nos chama `unindexElement` N vezes, e cada chamada varre os ~86
// Sets do `directiveIndex`. O custo esperado e N x (numero de directives
// registradas) — linear em N, mas com uma constante enorme.
const destroyCase = (n) => ({
  samples: 8,
  warmup: 2,
  setup: () => {
    const root = document.createElement('div');
    let html = '';
    for (let i = 0; i < n; i++) html += `<div v-text="'x'"></div>`;
    root.innerHTML = html;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    flushSync();
    return { root };
  },
  run: (ctx) => {
    destroy(ctx.root);
  },
  teardown: (ctx) => ctx.root.remove(),
});

resultados.push(
  sonda({
    titulo: '4. WALKER — unindexElement varre todos os Sets do indice por no destruido',
    local: 'packages/voodoojs/src/runtime/walker.ts:256  for (const set of directiveIndex.values()) set.delete(el)',
    hipotese: 'destruir N nos custa N x (numero de directives registradas), com constante alta',
    sizes: [100, 1000, 10000],
    make: destroyCase,
  })
);

// Quantas directives existem no indice, que e a constante multiplicadora.
console.log(`\n  directives registradas no runtime: ${V.default?.directives?.size ?? '?'}`);

// ---------------------------------------------------------------------------
// 5. parser: cache.clear() total no estouro
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(78)}`);
console.log('5. PARSER — cache.clear() joga fora as 2000 entradas ao estourar MAX_CACHE');
console.log('  local:     packages/voodoojs/src/parser/parser.ts:436  if (cache.size >= MAX_CACHE) cache.clear()');
console.log('  hipotese:  passar de 2000 expressoes distintas derruba o cache a cada volta');

const cicloParser = (count) => {
  const sources = Array.from({ length: count }, (_, i) => `a${i}.b${i} + c${i} * ${i}`);
  return bench({
    samples: 10,
    warmup: 2,
    setup: () => {
      V.clearParseCache();
      for (const s of sources) V.parse(s);
      return { sources };
    },
    run: (ctx) => {
      for (let passe = 0; passe < 3; passe++) for (const s of ctx.sources) V.parse(s);
    },
    teardown: () => V.clearParseCache(),
  });
};

const parserPontos = [];
for (const count of [1000, 1900, 2000, 2100, 4000]) {
  const s = cicloParser(count);
  const porExpressao = (s.median / (count * 3)) * 1000; // microssegundos por parse
  parserPontos.push({ n: count, t: s.median, porExpressao });
  console.log(
    `      ${String(count).padStart(5)} expressoes  median ${s.median.toFixed(3).padStart(9)} ms   ` +
      `${porExpressao.toFixed(2).padStart(7)} us por parse   cv ${s.rsd.toFixed(1)}%`
  );
}
const abaixo = parserPontos.find((p) => p.n === 1900);
const acima = parserPontos.find((p) => p.n === 2100);
const salto = acima.porExpressao / abaixo.porExpressao;
console.log(`  penhasco:  1900 -> 2100 expressoes (+10%) multiplica o custo por parse por ${salto.toFixed(0)}x`);
console.log(`  VEREDITO:  ${salto > 5 ? 'CONFIRMADO — descarte total do cache cria um penhasco' : 'REFUTADO'}`);

resultados.push({
  titulo: '5. PARSER — cache.clear() total no estouro',
  local: 'packages/voodoojs/src/parser/parser.ts:436',
  pontos: parserPontos,
  saltoCliff: salto,
  veredito: salto > 5 ? 'CONFIRMADO' : 'REFUTADO',
});

// ---------------------------------------------------------------------------
// 6. componente: hook `updated` cria efeito que le TODAS as chaves do estado
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(78)}`);
console.log('6. COMPONENTE — o hook `updated` cria um efeito que le todas as chaves do estado');
console.log('  local:     packages/voodoojs/src/runtime/component.ts:488  for (const key of Object.keys(state)) void state[key]');
console.log('  hipotese:  o custo por atualizacao cresce com o TAMANHO DO ESTADO, e nao com o que mudou');

const comHook = (chaves) => {
  const tag = `probe-com-${chaves}`;
  V.defineComponent(tag, {
    state() {
      const s = { n: 0 };
      for (let i = 0; i < chaves; i++) s['e' + i] = i;
      return s;
    },
    template: '<span v-text="n"></span>',
    updated() {},
  });
  return tag;
};
const semHook = (chaves) => {
  const tag = `probe-sem-${chaves}`;
  V.defineComponent(tag, {
    state() {
      const s = { n: 0 };
      for (let i = 0; i < chaves; i++) s['e' + i] = i;
      return s;
    },
    template: '<span v-text="n"></span>',
  });
  return tag;
};

const hookCase = (tag) => ({
  samples: 12,
  warmup: 3,
  setup: () => {
    const root = document.createElement('div');
    let html = '';
    for (let i = 0; i < 100; i++) html += `<${tag}></${tag}>`;
    root.innerHTML = html;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    flushSync();
    const escopos = Array.from(root.querySelectorAll(tag)).map((el) => V.getScope(el));
    return { root, escopos, tick: 0 };
  },
  run: (ctx) => {
    const alvo = ++ctx.tick;
    for (const s of ctx.escopos) s.data.n = alvo;
    flushSync();
  },
  teardown: (ctx) => {
    destroy(ctx.root);
    ctx.root.remove();
  },
});

console.log('      100 componentes, uma escrita em `n` por componente:');
const hookPontos = [];
for (const chaves of [5, 50, 200]) {
  const com = bench(hookCase(comHook(chaves)));
  const sem = bench(hookCase(semHook(chaves)));
  hookPontos.push({ chaves, com: com.median, sem: sem.median });
  console.log(
    `      estado com ${String(chaves).padStart(3)} chaves   com hook ${com.median.toFixed(3).padStart(8)} ms   ` +
      `sem hook ${sem.median.toFixed(3).padStart(8)} ms   sobrecusto ${(com.median / sem.median).toFixed(2)}x`
  );
}
const cresce = hookPontos[hookPontos.length - 1].com / hookPontos[0].com;
console.log(`  o custo COM hook cresceu ${cresce.toFixed(1)}x quando o estado foi de 5 para 200 chaves`);
console.log(`  VEREDITO:  ${cresce > 2 ? 'CONFIRMADO — o custo segue o tamanho do estado' : 'REFUTADO'}`);

resultados.push({
  titulo: '6. COMPONENTE — efeito do hook updated',
  local: 'packages/voodoojs/src/runtime/component.ts:488',
  pontos: hookPontos,
  veredito: cresce > 2 ? 'CONFIRMADO' : 'REFUTADO',
});

console.log(`\n${'='.repeat(78)}`);
console.log('Ambiente:');
const env = captureEnv();
console.log(`  ${env.cpuModel}, ${env.cpuCores} cores, ${env.node}, ${env.platform}`);
console.log(`  commit ${env.commitShort}${env.dirty ? ' (dirty)' : ''}, gc ${env.gcExposed ? 'exposto' : 'NAO exposto'}`);

// Grava o JSON para o relatorio poder citar sem alguem redigitar numero.
const fs = await import('node:fs');
const path = await import('node:path');
const { resultsDir } = await import('../harness/paths.mjs');
fs.mkdirSync(resultsDir, { recursive: true });
fs.writeFileSync(
  path.join(resultsDir, 'bottlenecks.json'),
  JSON.stringify({ env, resultados }, null, 2),
  'utf8'
);
console.log(`\nwrote: results/bottlenecks.json`);
