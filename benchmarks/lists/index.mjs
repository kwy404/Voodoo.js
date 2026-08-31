/**
 * @module benchmarks/lists
 *
 * Os cenarios do js-framework-benchmark, adaptados para rodar em jsdom com o
 * mesmo trabalho logico: create, append, prepend, update-every-10th,
 * update-one, remove, remove-all, replace-all, reverse, swap, clear.
 *
 * Todos usam `v-for` com `:key`, que e o caminho de reconciliacao keyed. Cada
 * caso confere o DOM depois: contagem de linhas e rotulo em posicoes
 * especificas. Um resultado rapido com o DOM errado e um resultado invalido.
 */

import { withCurve } from '../harness/runner.mjs';
import { buildRows, samplesFor, budgetFor } from '../harness/kit.mjs';

const TEMPLATE = `<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>`;

export default function listsSuite(V) {
  const { reactive, Scope, walk, destroy, flushSync } = V;
  const cases = [];

  /** Monta a lista com `n` linhas e devolve o contexto ja renderizado. */
  const build = (n, seed = 1) => {
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);
    const state = reactive({ rows: buildRows(n, seed) });
    walk(root, new Scope(state));
    flushSync();
    return { root, state };
  };

  const teardown = (ctx) => {
    destroy(ctx.root);
    ctx.root.remove();
  };

  const rowsIn = (root) => root.querySelectorAll('li');
  const labelAt = (root, i) => {
    const li = rowsIn(root)[i];
    return li ? li.textContent : null;
  };

  /** Conferencia comum: contagem e o rotulo do primeiro e do ultimo. */
  const checkList = (root, expected) => {
    const lis = rowsIn(root);
    if (lis.length !== expected.length) {
      return `esperava ${expected.length} <li>, encontrou ${lis.length}`;
    }
    for (const i of [0, Math.floor(expected.length / 2), expected.length - 1]) {
      if (i < 0) continue;
      const got = lis[i].textContent;
      if (got !== expected[i].label) {
        return `linha ${i}: esperava "${expected[i].label}", encontrou "${got}"`;
      }
    }
    return true;
  };

  // -------------------------------------------------------------------------
  // create — do zero ate n linhas no DOM
  // -------------------------------------------------------------------------
  const createCase = (n) => ({
    id: `lists/create-${n}`,
    name: `criar ${n} linhas`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    warmup: 3,
    vanillaOf: `vanilla/list-create-${n}`,
    setup: () => {
      const root = document.createElement('div');
      root.innerHTML = TEMPLATE;
      document.body.appendChild(root);
      return { root, state: reactive({ rows: [] }), pending: buildRows(n) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      ctx.state.rows = ctx.pending;
      flushSync();
      return ctx.root;
    },
    verify: (ctx) => checkList(ctx.root, ctx.pending),
    teardown,
  });

  cases.push(...withCurve('v-for: criar N linhas', [100, 1000, 5000, 10000].map(createCase)));

  // -------------------------------------------------------------------------
  // append — mil linhas somadas a uma lista que ja tem mil
  // -------------------------------------------------------------------------
  cases.push({
    id: 'lists/append-1000-to-1000',
    name: 'acrescentar 1.000 linhas a uma lista de 1.000',
    group: 'lists',
    n: 1000,
    samples: 20,
    setup: () => {
      const ctx = build(1000);
      ctx.extra = buildRows(1000, 99).map((r) => ({ ...r, id: r.id + 100000 }));
      return ctx;
    },
    run: (ctx) => {
      ctx.state.rows = [...ctx.state.rows, ...ctx.extra];
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== 2000) return `esperava 2000 <li>, encontrou ${count}`;
      if (labelAt(ctx.root, 1000) !== ctx.extra[0].label) return 'a primeira linha acrescentada esta errada';
      if (labelAt(ctx.root, 1999) !== ctx.extra[999].label) return 'a ultima linha acrescentada esta errada';
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // prepend — o caso que separa reconciliacao keyed de reconstrucao
  // -------------------------------------------------------------------------
  cases.push({
    id: 'lists/prepend-1000-to-1000',
    name: 'inserir 1.000 linhas no INICIO de uma lista de 1.000',
    group: 'lists',
    n: 1000,
    samples: 20,
    notes: 'Com reconciliacao keyed as 1.000 linhas antigas devem ser reaproveitadas, nao recriadas.',
    setup: () => {
      const ctx = build(1000);
      ctx.extra = buildRows(1000, 77).map((r) => ({ ...r, id: r.id + 200000 }));
      return ctx;
    },
    run: (ctx) => {
      ctx.state.rows = [...ctx.extra, ...ctx.state.rows];
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== 2000) return `esperava 2000 <li>, encontrou ${count}`;
      if (labelAt(ctx.root, 0) !== ctx.extra[0].label) return 'a primeira linha inserida nao ficou no inicio';
      if (labelAt(ctx.root, 999) !== ctx.extra[999].label) return 'a ordem das linhas inseridas esta errada';
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // update-every-10th e update-one
  // -------------------------------------------------------------------------
  const updateEvery10th = (n) => ({
    id: `lists/update-every-10th-${n}`,
    name: `atualizar 1 a cada 10 rotulos em ${n} linhas`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    vanillaOf: n === 1000 ? 'vanilla/list-update-every-10th-1000' : undefined,
    setup: () => build(n),
    run: (ctx) => {
      const rows = ctx.state.rows;
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== n) return `esperava ${n} <li>, encontrou ${count}`;
      const lis = rowsIn(ctx.root);
      let updated = 0;
      for (let i = 0; i < n; i++) {
        const should = i % 10 === 0;
        const has = lis[i].textContent.endsWith(' !!!');
        if (should !== has) return `linha ${i}: sufixo ${has ? 'presente' : 'ausente'} quando deveria ser o contrario`;
        if (has) updated++;
      }
      const expected = Math.ceil(n / 10);
      return updated === expected ? true : `atualizou ${updated} linhas, esperava ${expected}`;
    },
    teardown,
  });

  cases.push(...withCurve('v-for: update 1 a cada 10', [100, 1000, 5000, 10000].map(updateEvery10th)));

  cases.push({
    id: 'lists/update-one-of-10000',
    name: 'atualizar 1 rotulo entre 10.000 linhas',
    group: 'lists',
    n: 1,
    budgetMs: 1,
    samples: 40,
    // A lista de 10.000 e montada UMA vez: montar custa segundos, e o que se
    // quer medir e a escrita de um rotulo. Cada amostra escreve um valor novo,
    // entao continua havendo trabalho real a cada chamada.
    setupOnce: true,
    notes: 'Sem Virtual DOM, o custo deve ser independente do tamanho da lista.',
    setup: () => {
      const ctx = build(10000);
      ctx.tick = 0;
      return ctx;
    },
    run: (ctx) => {
      ctx.esperado = 'ALTERADO ' + ctx.tick++;
      ctx.state.rows[5000].label = ctx.esperado;
      flushSync();
      return labelAt(ctx.root, 5000);
    },
    verify: (ctx, label) => {
      if (label !== ctx.esperado) return `linha 5000 = "${label}", esperava "${ctx.esperado}"`;
      if (rowsIn(ctx.root).length !== 10000) return 'a lista mudou de tamanho';
      if (labelAt(ctx.root, 4999).startsWith('ALTERADO')) return 'o vizinho foi alterado junto';
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // remove — uma linha do meio
  // -------------------------------------------------------------------------
  cases.push({
    id: 'lists/remove-one-of-1000',
    name: 'remover 1 linha do meio de 1.000',
    group: 'lists',
    n: 1000,
    samples: 25,
    setup: () => build(1000),
    run: (ctx) => {
      const copia = [...ctx.state.rows];
      copia.splice(500, 1);
      ctx.state.rows = copia;
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== 999) return `esperava 999 <li>, encontrou ${count}`;
      const esperado = ctx.state.rows[500].label;
      return labelAt(ctx.root, 500) === esperado ? true : `a linha 500 deveria ser "${esperado}"`;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // clear / remove-all — o caminho de destruicao em massa
  // -------------------------------------------------------------------------
  const clearCase = (n) => ({
    id: `lists/clear-${n}`,
    name: `limpar uma lista de ${n} linhas`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    vanillaOf: `vanilla/list-clear-${n}`,
    setup: () => build(n),
    run: (ctx) => {
      ctx.state.rows = [];
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (_c, left) => (left === 0 ? true : `sobraram ${left} <li>`),
    teardown,
  });

  cases.push(...withCurve('v-for: limpar N linhas (destroy + unindex)', [100, 1000, 5000, 10000].map(clearCase)));

  // -------------------------------------------------------------------------
  // replace-all — todas as chaves mudam, nada e reaproveitado
  // -------------------------------------------------------------------------
  const replaceCase = (n) => ({
    id: `lists/replace-all-${n}`,
    name: `trocar todas as ${n} linhas por outras ${n}`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    setup: () => {
      const ctx = build(n);
      ctx.novas = buildRows(n, 555).map((r) => ({ ...r, id: r.id + 500000 }));
      return ctx;
    },
    run: (ctx) => {
      ctx.state.rows = ctx.novas;
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== n) return `esperava ${n} <li>, encontrou ${count}`;
      return checkList(ctx.root, ctx.novas);
    },
    teardown,
  });

  cases.push(...withCurve('v-for: replace-all (nenhuma chave reaproveitada)', [100, 1000, 5000].map(replaceCase)));

  // -------------------------------------------------------------------------
  // reverse — TODAS as chaves sobrevivem, todas mudam de posicao.
  //
  // Este e o caso que castiga `next.includes(block)` dentro do laco de
  // remocao: nenhum bloco sai da lista, entao a condicao `used.has(block.key)`
  // e sempre verdadeira e o `includes` roda por inteiro para cada bloco.
  // -------------------------------------------------------------------------
  const reverseCase = (n) => ({
    id: `lists/reverse-${n}`,
    name: `inverter a ordem de ${n} linhas (todas as chaves sobrevivem)`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    setup: () => build(n),
    run: (ctx) => {
      ctx.state.rows = [...ctx.state.rows].reverse();
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== n) return `esperava ${n} <li>, encontrou ${count}`;
      return checkList(ctx.root, ctx.state.rows);
    },
    teardown,
  });

  cases.push(...withCurve('v-for: reverse (todas as chaves sobrevivem)', [100, 1000, 5000, 10000].map(reverseCase)));

  // -------------------------------------------------------------------------
  // swap — duas linhas trocam de lugar. Trabalho logico O(1) sobre uma lista
  // grande: mede o custo fixo da reconciliacao, nao o da mudanca.
  // -------------------------------------------------------------------------
  const swapCase = (n) => ({
    id: `lists/swap-${n}`,
    name: `trocar 2 linhas de lugar em ${n}`,
    group: 'lists',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    notes: 'A mudanca e O(1). O que crescer aqui e overhead da reconciliacao.',
    setup: () => build(n),
    run: (ctx) => {
      const a = 1;
      const b = n - 2;
      const copia = [...ctx.state.rows];
      const t = copia[a];
      copia[a] = copia[b];
      copia[b] = t;
      ctx.state.rows = copia;
      flushSync();
      return rowsIn(ctx.root).length;
    },
    verify: (ctx, count) => {
      if (count !== n) return `esperava ${n} <li>, encontrou ${count}`;
      return checkList(ctx.root, ctx.state.rows);
    },
    teardown,
  });

  cases.push(...withCurve('v-for: swap de 2 linhas em N', [100, 1000, 5000, 10000].map(swapCase)));

  return cases;
}
