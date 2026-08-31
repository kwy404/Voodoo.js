/**
 * @module benchmarks/core
 * Nucleo reativo: reactive, ref, computed, effect, watch, rastreamento e o
 * agendamento em lote.
 */

import { withCurve } from '../harness/runner.mjs';
import { samplesFor } from '../harness/kit.mjs';

export default function coreSuite(V) {
  const { reactive, ref, computed, effect, watch, flushSync, stop, effectScope } = V;
  const cases = [];

  // -------------------------------------------------------------------------
  // reactive()
  // -------------------------------------------------------------------------
  const flatSeed = () => {
    const o = {};
    for (let i = 0; i < 100; i++) o['k' + i] = i;
    return o;
  };

  cases.push({
    id: 'core/reactive-create-100-keys',
    name: 'reactive() sobre objeto de 100 chaves x1000',
    group: 'core',
    n: 1000,
    budgetMs: 5,
    setup: () => ({ seeds: Array.from({ length: 1000 }, flatSeed) }),
    run: (ctx) => {
      let last;
      for (const s of ctx.seeds) last = reactive(s);
      return last;
    },
    verify: (_ctx, last) => (V.isReactive(last) ? true : 'reactive() nao devolveu um proxy reativo'),
  });

  // As chaves sao pre-calculadas de proposito. Montar `'k' + i` dentro do laco
  // mediria a concatenacao de strings do V8 junto com o proxy, e a concatenacao
  // domina. O par em `vanilla/` roda exatamente o mesmo laco sobre um objeto
  // simples, entao a diferenca e o custo do Proxy e nada mais.
  const KEYS = Array.from({ length: 100 }, (_, i) => 'k' + i);

  cases.push({
    id: 'core/reactive-read',
    name: '100.000 leituras de propriedade rastreada (fora de efeito)',
    group: 'core',
    n: 100000,
    vanillaOf: 'vanilla/plain-object-read',
    setup: () => ({ state: reactive(flatSeed()) }),
    run: (ctx) => {
      const s = ctx.state;
      let sum = 0;
      for (let i = 0; i < 100000; i++) sum += s[KEYS[i % 100]];
      return sum;
    },
    verify: (_ctx, sum) => (sum === 4950 * 1000 ? true : `soma errada: ${sum}`),
  });

  cases.push({
    id: 'core/reactive-write-no-subscriber',
    name: '100.000 escritas sem nenhum efeito inscrito',
    group: 'core',
    n: 100000,
    vanillaOf: 'vanilla/plain-object-write',
    setup: () => ({ state: reactive(flatSeed()) }),
    run: (ctx) => {
      const s = ctx.state;
      for (let i = 0; i < 100000; i++) s[KEYS[i % 100]] = i;
      return s.k0;
    },
    verify: (ctx) => (ctx.state.k0 === 99900 ? true : `k0 = ${ctx.state.k0}`),
  });

  cases.push({
    id: 'core/reactive-nested-deep-read',
    name: 'leitura em objeto aninhado 10 niveis x10.000',
    group: 'core',
    n: 10000,
    budgetMs: 30,
    setup: () => {
      let obj = { leaf: 1 };
      for (let i = 0; i < 10; i++) obj = { level: i, child: obj };
      return { state: reactive(obj) };
    },
    run: (ctx) => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        let node = ctx.state;
        while (node.child) node = node.child;
        sum += node.leaf;
      }
      return sum;
    },
    verify: (_ctx, sum) => (sum === 10000 ? true : `soma errada: ${sum}`),
  });

  // -------------------------------------------------------------------------
  // ref() e computed()
  // -------------------------------------------------------------------------
  cases.push({
    id: 'core/ref-create-10k',
    name: 'ref() x10.000',
    group: 'core',
    n: 10000,
    budgetMs: 5,
    run: () => {
      let last;
      for (let i = 0; i < 10000; i++) last = ref(i);
      return last;
    },
    verify: (_c, last) => (last.value === 9999 ? true : `ultimo ref = ${last.value}`),
  });

  cases.push({
    id: 'core/ref-write-read-100k',
    name: 'ref.value escrita+leitura x100.000',
    group: 'core',
    n: 100000,
    budgetMs: 15,
    setup: () => ({ r: ref(0) }),
    run: (ctx) => {
      for (let i = 0; i < 100000; i++) ctx.r.value = ctx.r.value + 1;
      return ctx.r.value;
    },
    verify: (_c, v) => (v === 100000 ? true : `valor final = ${v}`),
  });

  cases.push({
    id: 'core/computed-cached-read-100k',
    name: 'computed lido 100.000 vezes sem invalidar (cache)',
    group: 'core',
    n: 100000,
    budgetMs: 10,
    setup: () => {
      const s = reactive({ a: 2, b: 3 });
      const c = computed(() => s.a * s.b);
      c.value; // primeira avaliacao fora da medicao
      return { c };
    },
    run: (ctx) => {
      let sum = 0;
      for (let i = 0; i < 100000; i++) sum += ctx.c.value;
      return sum;
    },
    verify: (_c, sum) => (sum === 600000 ? true : `soma errada: ${sum}`),
  });

  cases.push({
    id: 'core/computed-invalidate-recompute-10k',
    name: 'computed invalidado e relido 10.000 vezes',
    group: 'core',
    n: 10000,
    budgetMs: 25,
    setup: () => {
      const s = reactive({ a: 1, b: 2 });
      const c = computed(() => s.a * s.b);
      c.value;
      return { s, c };
    },
    run: (ctx) => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) {
        ctx.s.a = i;
        sum += ctx.c.value;
      }
      return sum;
    },
    verify: (_c, sum) => (sum === 2 * ((9999 * 10000) / 2) ? true : `soma errada: ${sum}`),
  });

  cases.push({
    id: 'core/computed-chain-depth-50',
    name: 'cadeia de 50 computed encadeados, 1.000 invalidacoes',
    group: 'core',
    n: 1000,
    budgetMs: 40,
    setup: () => {
      const s = reactive({ base: 0 });
      let node = computed(() => s.base + 1);
      for (let i = 0; i < 49; i++) {
        const prev = node;
        node = computed(() => prev.value + 1);
      }
      node.value;
      return { s, node };
    },
    run: (ctx) => {
      let last = 0;
      for (let i = 0; i < 1000; i++) {
        ctx.s.base = i;
        last = ctx.node.value;
      }
      return last;
    },
    verify: (_c, last) => (last === 999 + 50 ? true : `valor final = ${last} (esperava ${999 + 50})`),
  });

  // -------------------------------------------------------------------------
  // effect() e rastreamento
  // -------------------------------------------------------------------------
  cases.push({
    id: 'core/effect-create-10k',
    name: 'criar 10.000 efeitos (cada um le 1 chave)',
    group: 'core',
    n: 10000,
    budgetMs: 20,
    setup: () => ({ state: reactive({ x: 0 }), scope: effectScope(true), runners: [] }),
    run: (ctx) => {
      ctx.scope.run(() => {
        for (let i = 0; i < 10000; i++) {
          ctx.runners.push(effect(() => ctx.state.x, { scope: ctx.scope }));
        }
      });
      return ctx.runners.length;
    },
    verify: (_c, n) => (n === 10000 ? true : `criou ${n}`),
    teardown: (ctx) => ctx.scope.stop(),
  });

  cases.push({
    id: 'core/effect-dispose-10k',
    name: 'parar 10.000 efeitos por EffectScope.stop()',
    group: 'core',
    n: 10000,
    budgetMs: 10,
    setup: () => {
      const state = reactive({ x: 0 });
      const scope = effectScope(true);
      scope.run(() => {
        for (let i = 0; i < 10000; i++) effect(() => state.x, { scope });
      });
      return { state, scope };
    },
    run: (ctx) => {
      ctx.scope.stop();
      return ctx.scope.effects.length;
    },
    verify: (_c, n) => (n === 0 ? true : `sobraram ${n} efeitos no escopo`),
  });

  cases.push({
    id: 'core/dependency-tracking-wide',
    name: '1 efeito lendo 1.000 chaves, reexecutado 100 vezes',
    group: 'core',
    n: 100,
    budgetMs: 40,
    setup: () => {
      const seed = {};
      for (let i = 0; i < 1000; i++) seed['k' + i] = i;
      const state = reactive(seed);
      let runs = 0;
      const scope = effectScope(true);
      let sum = 0;
      scope.run(() =>
        effect(
          () => {
            runs++;
            sum = 0;
            for (let i = 0; i < 1000; i++) sum += state['k' + i];
          },
          { scope }
        )
      );
      return { state, scope, get runs() { return runs; }, sums: () => sum };
    },
    run: (ctx) => {
      for (let i = 0; i < 100; i++) {
        ctx.state.k0 = i;
        flushSync();
      }
      return ctx.sums();
    },
    verify: (ctx, sum) => {
      const expected = 99 + (999 * 1000) / 2; // k0 = 99, demais 1..999
      return sum === expected ? true : `soma final ${sum}, esperava ${expected}`;
    },
    teardown: (ctx) => ctx.scope.stop(),
  });

  // -------------------------------------------------------------------------
  // watch()
  // -------------------------------------------------------------------------
  cases.push({
    id: 'core/watch-create-5k',
    name: 'criar 5.000 watchers',
    group: 'core',
    n: 5000,
    budgetMs: 20,
    setup: () => ({ state: reactive({ x: 0 }), stops: [] }),
    run: (ctx) => {
      for (let i = 0; i < 5000; i++) ctx.stops.push(watch(() => ctx.state.x, () => {}));
      return ctx.stops.length;
    },
    verify: (_c, n) => (n === 5000 ? true : `criou ${n}`),
    teardown: (ctx) => ctx.stops.forEach((s) => s()),
  });

  cases.push({
    id: 'core/watch-sync-fire-10k',
    name: 'watch flush:sync disparado 10.000 vezes',
    group: 'core',
    n: 10000,
    budgetMs: 20,
    setup: () => {
      const state = reactive({ x: 0 });
      let fired = 0;
      const off = watch(() => state.x, () => { fired++; }, { flush: 'sync' });
      return { state, off, count: () => fired };
    },
    run: (ctx) => {
      for (let i = 1; i <= 10000; i++) ctx.state.x = i;
      return ctx.count();
    },
    verify: (_c, fired) => (fired === 10000 ? true : `disparou ${fired} vezes, esperava 10000`),
    teardown: (ctx) => ctx.off(),
  });

  // -------------------------------------------------------------------------
  // Agendamento em lote — o alvo direto de `queueJob`
  //
  // Cenario: N efeitos DISTINTOS invalidados no mesmo tick. Cada invalidacao
  // chama `queueJob`, que faz `queue.includes(job)` — uma varredura linear da
  // fila que ja cresceu. Se o custo total crescer com o quadrado de N, o
  // gargalo esta confirmado.
  // -------------------------------------------------------------------------
  const keysFor = (n) => Array.from({ length: n }, (_, i) => 'k' + i);

  const schedulerCase = (n) => ({
    id: `core/scheduler-batch-${n}`,
    name: `${n} efeitos distintos invalidados no mesmo tick`,
    group: 'core',
    n,
    samples: samplesFor(n),
    warmup: 3,
    setup: () => {
      const keys = keysFor(n);
      const seed = {};
      for (const k of keys) seed[k] = 0;
      const state = reactive(seed);
      const scope = effectScope(true);
      let runs = 0;
      scope.run(() => {
        for (const key of keys) effect(() => { runs++; return state[key]; }, { scope });
      });
      const before = runs;
      return { state, scope, keys, before, runs: () => runs };
    },
    run: (ctx) => {
      // Uma escrita por chave: N chamadas a queueJob no mesmo tick, com a fila
      // crescendo de 0 ate N. Cada chamada varre a fila inteira.
      const { state, keys } = ctx;
      for (let i = 0; i < keys.length; i++) state[keys[i]] = i + 1;
      flushSync();
      return ctx.runs() - ctx.before;
    },
    verify: (_c, extra) =>
      extra === n ? true : `esperava ${n} reexecucoes de efeito, contou ${extra}`,
    teardown: (ctx) => ctx.scope.stop(),
  });

  cases.push(
    ...withCurve(
      'scheduler: N efeitos DISTINTOS por tick (fila cresce ate N)',
      [100, 1000, 10000, 20000].map(schedulerCase)
    )
  );

  // Contraprova. Mesmo numero de escritas, mesmo numero de chamadas a
  // `trigger`, mesma quantidade de trabalho reativo — mas UM unico efeito, o
  // que mantem a fila com 1 item e torna `queue.includes` gratuito.
  //
  // A diferenca entre as duas curvas isola `queue.includes(job)` e nada mais.
  const schedulerSameCase = (n) => ({
    id: `core/scheduler-same-effect-${n}`,
    name: `1 efeito invalidado por ${n} chaves no mesmo tick`,
    group: 'core',
    n,
    samples: samplesFor(n),
    warmup: 3,
    setup: () => {
      const keys = keysFor(n);
      const seed = {};
      for (const k of keys) seed[k] = 0;
      const state = reactive(seed);
      const scope = effectScope(true);
      let runs = 0;
      scope.run(() =>
        effect(
          () => {
            runs++;
            for (let i = 0; i < keys.length; i++) void state[keys[i]];
          },
          { scope }
        )
      );
      const before = runs;
      return { state, scope, keys, before, runs: () => runs };
    },
    run: (ctx) => {
      const { state, keys } = ctx;
      for (let i = 0; i < keys.length; i++) state[keys[i]] = i + 1;
      flushSync();
      return ctx.runs() - ctx.before;
    },
    verify: (_c, extra) => (extra >= 1 ? true : 'o efeito nao reexecutou'),
    teardown: (ctx) => ctx.scope.stop(),
  });

  cases.push(
    ...withCurve(
      'scheduler: 1 efeito, N invalidacoes (fila fica em 1)',
      [100, 1000, 10000, 20000].map(schedulerSameCase)
    )
  );

  // -------------------------------------------------------------------------
  // Map / Set reativos
  // -------------------------------------------------------------------------
  cases.push({
    id: 'core/reactive-map-set-get-10k',
    name: 'Map reativo: 10.000 set + 10.000 get',
    group: 'core',
    n: 10000,
    budgetMs: 25,
    setup: () => ({ m: reactive(new Map()) }),
    run: (ctx) => {
      for (let i = 0; i < 10000; i++) ctx.m.set('k' + i, i);
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += ctx.m.get('k' + i);
      return sum;
    },
    verify: (ctx, sum) =>
      sum === (9999 * 10000) / 2 && ctx.m.size === 10000 ? true : `soma ${sum}, size ${ctx.m.size}`,
  });

  // -------------------------------------------------------------------------
  // Arrays reativos e a instrumentacao de metodos
  // -------------------------------------------------------------------------
  cases.push({
    id: 'core/reactive-array-push-10k',
    name: 'push em array reativo x10.000',
    group: 'core',
    n: 10000,
    budgetMs: 15,
    setup: () => ({ arr: reactive([]) }),
    run: (ctx) => {
      for (let i = 0; i < 10000; i++) ctx.arr.push(i);
      return ctx.arr.length;
    },
    verify: (_c, len) => (len === 10000 ? true : `length = ${len}`),
  });

  cases.push({
    id: 'core/reactive-array-includes-1k',
    name: 'includes() instrumentado em array de 1.000, x1.000',
    group: 'core',
    n: 1000,
    budgetMs: 60,
    setup: () => ({ arr: reactive(Array.from({ length: 1000 }, (_, i) => i)) }),
    run: (ctx) => {
      let hits = 0;
      for (let i = 0; i < 1000; i++) if (ctx.arr.includes(i)) hits++;
      return hits;
    },
    verify: (_c, hits) => (hits === 1000 ? true : `encontrou ${hits}`),
  });

  return cases;
}
