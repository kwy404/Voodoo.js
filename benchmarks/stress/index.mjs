/**
 * @module benchmarks/stress
 *
 * Casos extremos. Todos DETERMINISTICOS e com fim garantido: numero fixo de
 * iteracoes, nenhum `while (true)`, nenhum `Math.random`, nenhum temporizador.
 * Um benchmark que nao termina nao e um teste de estresse, e um travamento.
 */

import { buildRows } from '../harness/kit.mjs';

export default function stressSuite(V) {
  const { reactive, Scope, walk, destroy, flushSync } = V;
  const cases = [];

  const host = (html) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };
  const teardown = (ctx) => {
    if (!ctx?.root) return;
    destroy(ctx.root);
    ctx.root.remove();
  };

  // -------------------------------------------------------------------------
  // Estado grande: 20.000 chaves, 2.000 efeitos, 2.000 escritas.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'stress/large-state-20k-keys',
    name: '20.000 chaves reativas, 2.000 efeitos, 2.000 escritas',
    group: 'stress',
    n: 20000,
    samples: 6,
    warmup: 1,
    maxTotalMs: 60_000,
    budgetMs: 400,
    setup: () => {
      const seed = {};
      for (let i = 0; i < 20000; i++) seed['k' + i] = i;
      const state = reactive(seed);
      const scope = V.effectScope(true);
      let runs = 0;
      scope.run(() => {
        for (let i = 0; i < 2000; i++) {
          const key = 'k' + i;
          V.effect(() => { runs++; return state[key]; }, { scope });
        }
      });
      return { state, scope, base: runs, runs: () => runs };
    },
    run: (ctx) => {
      for (let i = 0; i < 2000; i++) ctx.state['k' + i] = i + 1000000;
      flushSync();
      return ctx.runs() - ctx.base;
    },
    verify: (_c, extra) => (extra === 2000 ? true : `esperava 2000 reexecucoes, contou ${extra}`),
    teardown: (ctx) => ctx.scope.stop(),
  });

  // -------------------------------------------------------------------------
  // DOM enorme: 20.000 nos, metade com directive.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'stress/massive-dom-20k-nodes',
    name: 'percorrer 20.000 nos, 10.000 com directive',
    group: 'stress',
    n: 20000,
    samples: 4,
    warmup: 1,
    maxTotalMs: 90_000,
    gcBetweenSamples: true,
    setup: () => {
      let html = '';
      for (let i = 0; i < 10000; i++) {
        html += `<div><span v-text="'n' + ${i}"></span></div>`;
      }
      return { root: host(html), state: reactive({}) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root.querySelectorAll('span').length;
    },
    verify: (ctx, count) => {
      if (count !== 10000) return `esperava 10000 spans, encontrou ${count}`;
      const spans = ctx.root.querySelectorAll('span');
      if (spans[0].textContent !== 'n0') return `primeiro "${spans[0].textContent}"`;
      if (spans[9999].textContent !== 'n9999') return `ultimo "${spans[9999].textContent}"`;
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // Tortura: 100 rodadas de mutacao mista sobre uma lista de 500.
  //
  // A sequencia e fixa e o resultado final e conhecido de antemao, entao o caso
  // consegue afirmar que o DOM ficou certo depois de 100 rodadas de troca,
  // insercao, remocao, inversao e atualizacao.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'stress/torture-mixed-mutations',
    name: '100 rodadas de mutacao mista sobre uma lista de 500',
    group: 'stress',
    n: 100,
    samples: 5,
    warmup: 1,
    maxTotalMs: 90_000,
    gcBetweenSamples: true,
    notes: 'Sequencia fixa: swap, prepend, remove, reverse, update. Fim garantido.',
    setup: () => {
      const root = host(`<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>`);
      const state = reactive({ rows: buildRows(500) });
      walk(root, new Scope(state));
      flushSync();
      return { root, state, proximoId: 1000000 };
    },
    run: (ctx) => {
      for (let rodada = 0; rodada < 100; rodada++) {
        const atual = [...ctx.state.rows];

        switch (rodada % 5) {
          case 0: {
            // swap deterministico
            const a = rodada % atual.length;
            const b = (atual.length - 1 - a + atual.length) % atual.length;
            const t = atual[a];
            atual[a] = atual[b];
            atual[b] = t;
            break;
          }
          case 1:
            // prepend de 5 linhas novas
            atual.unshift(
              ...Array.from({ length: 5 }, (_, i) => ({
                id: ctx.proximoId++,
                label: `novo ${rodada}-${i}`,
              }))
            );
            break;
          case 2:
            // remove 5 do meio
            atual.splice(Math.floor(atual.length / 2), 5);
            break;
          case 3:
            atual.reverse();
            break;
          default:
            // atualiza 1 a cada 50
            for (let i = 0; i < atual.length; i += 50) {
              atual[i] = { ...atual[i], label: `mod ${rodada}-${i}` };
            }
        }

        ctx.state.rows = atual;
        flushSync();
      }
      return ctx.state.rows.length;
    },
    verify: (ctx, tamanhoEstado) => {
      const lis = ctx.root.querySelectorAll('li');
      if (lis.length !== tamanhoEstado) {
        return `o DOM ficou com ${lis.length} <li> mas o estado tem ${tamanhoEstado} linhas`;
      }
      // Conferencia rotulo a rotulo: depois de 100 mutacoes, cada no do DOM
      // precisa corresponder exatamente a sua linha no estado.
      const rows = ctx.state.rows;
      for (let i = 0; i < rows.length; i++) {
        if (lis[i].textContent !== rows[i].label) {
          return `linha ${i}: DOM "${lis[i].textContent}" != estado "${rows[i].label}"`;
        }
      }
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // Cascata de computed: profundidade 100, 500 invalidacoes.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'stress/computed-cascade-100x500',
    name: 'cadeia de 100 computed, 500 invalidacoes',
    group: 'stress',
    n: 500,
    samples: 10,
    maxTotalMs: 40_000,
    budgetMs: 60,
    setup: () => {
      const s = reactive({ base: 0 });
      let node = V.computed(() => s.base + 1);
      for (let i = 0; i < 99; i++) {
        const prev = node;
        node = V.computed(() => prev.value + 1);
      }
      node.value;
      return { s, node };
    },
    run: (ctx) => {
      let ultimo = 0;
      for (let i = 0; i < 500; i++) {
        ctx.s.base = i;
        ultimo = ctx.node.value;
      }
      return ultimo;
    },
    verify: (_c, ultimo) =>
      ultimo === 499 + 100 ? true : `valor final ${ultimo}, esperava ${499 + 100}`,
  });

  return cases;
}
