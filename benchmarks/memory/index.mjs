/**
 * @module benchmarks/memory
 *
 * Vazamentos. Cada caso executa um ciclo COMPLETO — montar e desmontar — muitas
 * vezes e mede quanto do heap sobrevive.
 *
 * Metodologia:
 *   1. Um ciclo de aquecimento, para as estruturas internas nascerem.
 *   2. `global.gc()`, leitura do heap.
 *   3. N ciclos identicos.
 *   4. `global.gc()` de novo, leitura do heap.
 *   5. O que sobrou dividido por N e o vazamento por ciclo.
 *
 * Sem `--expose-gc` o numero e apenas indicativo, e o relatorio diz isso em
 * letras grandes. Rode `node --expose-gc benchmarks/run.mjs memory`.
 *
 * O criterio de vazamento e deliberadamente frouxo (bytes por ciclo, nao zero
 * absoluto): o V8 nao devolve tudo em uma coleta, e o proprio jsdom retem
 * estruturas. O que interessa e a ORDEM DE GRANDEZA e o crescimento com N.
 */

import { forceGC, gcAvailable } from '../harness/env.mjs';
import { buildRows } from '../harness/kit.mjs';

/** Roda `fn` N vezes e devolve o heap retido por ciclo, em bytes. */
function leakPerCycle(fn, cycles) {
  fn(); // aquecimento: primeira alocacao de estruturas internas
  forceGC();
  forceGC();
  const antes = process.memoryUsage().heapUsed;
  for (let i = 0; i < cycles; i++) fn();
  forceGC();
  forceGC();
  const depois = process.memoryUsage().heapUsed;
  return { antes, depois, perCycle: (depois - antes) / cycles, total: depois - antes };
}

export default function memorySuite(V) {
  const { reactive, Scope, walk, destroy, flushSync, effect, effectScope, watch, ref } = V;
  const cases = [];

  const host = (html) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };

  /**
   * Um caso de memoria. `unit` vira bytes/ciclo, e o `run` devolve o proprio
   * numero medido para que a estatistica descreva a DISPERSAO do vazamento
   * entre repeticoes, e nao um unico palpite.
   */
  const leakCase = ({ id, name, cycles, cycle, budgetBytes, notes, verify }) => ({
    id: `memory/${id}`,
    name,
    group: 'memory',
    n: cycles,
    unit: 'bytes/ciclo',
    samples: 5,
    warmup: 1,
    maxTotalMs: 60_000,
    notes: `${notes ?? ''}${gcAvailable() ? '' : ' [SEM --expose-gc: numero apenas indicativo]'}`.trim(),
    setup: () => ({ leak: null }),
    run: (ctx) => {
      ctx.leak = leakPerCycle(cycle, cycles);
      return ctx.leak.perCycle;
    },
    // A conferencia de um caso de memoria e "o ciclo produziu o efeito que
    // deveria produzir", e nao "vazou pouco". Vazamento e um ACHADO, e nao um
    // benchmark invalido: marcar como invalido esconderia o resultado
    // justamente onde ele importa. O excesso sobre o teto vira `leaking: true`
    // e aparece na secao de vazamentos do relatorio.
    verify: verify ?? (() => true),
    budgetBytes,
    leakBudgetBytes: budgetBytes,
  });

  // -------------------------------------------------------------------------
  // Efeitos e watchers soltos
  // -------------------------------------------------------------------------
  cases.push(
    leakCase({
      id: 'effect-create-dispose',
      name: '1.000 ciclos de criar e parar um efeito',
      cycles: 1000,
      budgetBytes: 2048,
      notes: 'Um efeito parado nao pode continuar preso ao Set de dependencias.',
      cycle: () => {
        const state = reactive({ x: 0 });
        const scope = effectScope(true);
        scope.run(() => effect(() => state.x, { scope }));
        state.x++;
        scope.stop();
      },
    })
  );

  cases.push(
    leakCase({
      id: 'watch-create-stop',
      name: '1.000 ciclos de criar e parar um watch',
      cycles: 1000,
      budgetBytes: 2048,
      cycle: () => {
        const r = ref(0);
        const off = watch(r, () => {});
        r.value++;
        off();
      },
    })
  );

  // -------------------------------------------------------------------------
  // Ciclo de vida de elementos com directives
  // -------------------------------------------------------------------------
  cases.push(
    leakCase({
      id: 'mount-unmount-100-nodes',
      name: '200 ciclos de montar e desmontar 100 nos com directives',
      cycles: 200,
      budgetBytes: 8192,
      notes: 'Exercita walk(), o indice de directives e destroy().',
      cycle: () => {
        let html = '';
        for (let i = 0; i < 100; i++) html += `<div v-text="'x' + ${i}" :data-i="${i}" @click="n++"></div>`;
        const root = host(html);
        walk(root, new Scope(reactive({ n: 0 })));
        flushSync();
        destroy(root);
        root.remove();
      },
    })
  );

  cases.push(
    leakCase({
      id: 'v-if-toggle',
      name: '500 ciclos de alternar v-if sobre 50 nos',
      cycles: 500,
      budgetBytes: 8192,
      notes: 'Cada ciclo destroi e remonta a subarvore inteira.',
      cycle: () => {
        let inner = '';
        for (let i = 0; i < 50; i++) inner += `<span v-text="'x' + ${i}"></span>`;
        const root = host(`<div v-if="ver">${inner}</div>`);
        const state = reactive({ ver: true });
        walk(root, new Scope(state));
        flushSync();
        state.ver = false;
        flushSync();
        state.ver = true;
        flushSync();
        destroy(root);
        root.remove();
      },
    })
  );

  cases.push(
    leakCase({
      id: 'v-for-replace',
      name: '200 ciclos de trocar todas as linhas de um v-for de 50',
      cycles: 200,
      budgetBytes: 16384,
      notes: 'Cada troca destroi 50 blocos e cria 50 novos.',
      cycle: () => {
        const root = host(`<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>`);
        const state = reactive({ rows: buildRows(50) });
        walk(root, new Scope(state));
        flushSync();
        state.rows = buildRows(50, 42).map((r) => ({ ...r, id: r.id + 10000 }));
        flushSync();
        destroy(root);
        root.remove();
      },
    })
  );

  // -------------------------------------------------------------------------
  // O ciclo completo de um v-for: montar, encher, esvaziar, destruir a raiz.
  //
  // Este caso existe por uma razao especifica. Em `runtime/walker.ts`, o
  // `destroy()` de um elemento so desce em filhos de tipo 1 e 3. A ancora do
  // `v-for` e um COMENTARIO (tipo 8), e o elemento-modelo foi retirado do
  // documento por `removeQuietly`. Se a limpeza do efeito da lista estiver
  // presa a um desses dois nos, `destroy(raiz)` nunca a alcanca — e o efeito
  // do `v-for`, com a lista de blocos inteira, sobrevive ao desmonte.
  //
  // Se este caso retiver muito mais por ciclo do que `mount-unmount-100-nodes`,
  // a suspeita esta confirmada.
  // -------------------------------------------------------------------------
  cases.push(
    leakCase({
      id: 'v-for-full-lifecycle',
      name: '200 ciclos de montar v-for de 100 linhas e destruir a raiz',
      cycles: 200,
      budgetBytes: 16384,
      notes:
        'Sonda direta para a ancora de comentario e o elemento-modelo do v-for, ' +
        'que destroy() nao percorre.',
      cycle: () => {
        const root = host(`<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>`);
        const state = reactive({ rows: buildRows(100) });
        walk(root, new Scope(state));
        flushSync();
        destroy(root);
        root.remove();
      },
    })
  );

  // -------------------------------------------------------------------------
  // Prova A/B da causa raiz do vazamento de v-if e v-for.
  //
  // Hipotese: `runDirective` (runtime/walker.ts) registra a limpeza do efeito
  // com `addCleanup(el, ...)`, e as directives terminais registram a delas no
  // mesmo `el` (`addCleanup(el, removeActive)` em v-if). Mas v-if e v-for
  // tiram esse `el` do documento com `removeQuietly` e passam a usa-lo como
  // MODELO. Como `destroy()` so desce em filhos vivos de tipo 1 e 3, ela nunca
  // alcanca o modelo destacado — e o EffectScope da directive nunca para,
  // segurando modelo, blocos e nos ativos.
  //
  // Os dois casos abaixo sao IDENTICOS, exceto por uma linha: o segundo chama
  // `destroy(modelo)` no elemento destacado, simulando a correcao. A diferenca
  // entre eles e a medida direta do vazamento.
  // -------------------------------------------------------------------------
  const abPair = (id, name, cycles, montar) => [
    leakCase({
      id: `${id}-atual`,
      name: `${name} — destroy(raiz) apenas (comportamento atual)`,
      cycles,
      budgetBytes: 32768,
      notes: 'Metade A do par A/B que localiza a causa do vazamento.',
      cycle: () => montar(false),
    }),
    leakCase({
      id: `${id}-com-modelo`,
      name: `${name} — destroy(raiz) + destroy(modelo destacado)`,
      cycles,
      budgetBytes: 32768,
      notes:
        'Metade B: mesma carga, mais uma chamada a destroy() no elemento que ' +
        'a directive terminal tirou do documento. A diferenca contra a metade A ' +
        'e o vazamento atribuivel a limpeza inalcancavel.',
      cycle: () => montar(true),
    }),
  ];

  cases.push(
    ...abPair('leak-cause-v-if', 'v-if sobre 50 nos', 300, (limparModelo) => {
      let inner = '';
      for (let i = 0; i < 50; i++) inner += `<span v-text="'x' + ${i}"></span>`;
      const root = host(`<div v-if="ver">${inner}</div>`);
      const modelo = root.querySelector('div');
      const state = reactive({ ver: true });
      walk(root, new Scope(state));
      flushSync();
      state.ver = false;
      flushSync();
      state.ver = true;
      flushSync();
      if (limparModelo) destroy(modelo);
      destroy(root);
      root.remove();
    })
  );

  cases.push(
    ...abPair('leak-cause-v-for', 'v-for de 100 linhas', 200, (limparModelo) => {
      const root = host(`<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>`);
      const modelo = root.querySelector('li');
      const state = reactive({ rows: buildRows(100) });
      walk(root, new Scope(state));
      flushSync();
      if (limparModelo) destroy(modelo);
      destroy(root);
      root.remove();
    })
  );

  // -------------------------------------------------------------------------
  // Componentes
  // -------------------------------------------------------------------------
  V.defineComponent('mem-card', {
    props: { i: { type: 'number', default: 0 } },
    state(p) {
      return { n: p.i };
    },
    template: `<span v-text="n"></span>`,
  });

  cases.push(
    leakCase({
      id: 'component-mount-unmount',
      name: '300 ciclos de montar e desmontar 20 componentes',
      cycles: 300,
      budgetBytes: 12288,
      notes: 'Confere tambem se o Set `instances` volta ao tamanho original.',
      cycle: () => {
        let html = '';
        for (let i = 0; i < 20; i++) html += `<mem-card :i="${i}"></mem-card>`;
        const root = host(html);
        walk(root, new Scope(reactive({})));
        flushSync();
        destroy(root);
        root.remove();
      },
    })
  );

  cases.push({
    id: 'memory/component-instances-registry',
    name: 'o registro V.instances volta ao tamanho original apos desmontar',
    group: 'memory',
    n: 100,
    unit: 'instancias vazadas',
    samples: 5,
    setup: () => ({}),
    run: (ctx) => {
      ctx.antes = V.instances.size;
      for (let ciclo = 0; ciclo < 100; ciclo++) {
        let html = '';
        for (let i = 0; i < 10; i++) html += `<mem-card :i="${i}"></mem-card>`;
        const root = host(html);
        walk(root, new Scope(reactive({})));
        flushSync();
        destroy(root);
        root.remove();
      }
      ctx.depois = V.instances.size;
      return ctx.depois - ctx.antes;
    },
    verify: (_ctx, vazadas) =>
      vazadas === 0
        ? true
        : `${vazadas} instancias de componente continuam em V.instances depois do desmonte (1000 montadas)`,
    notes: 'Contagem exata, sem depender do coletor: ou o Set esvazia, ou nao esvazia.',
  });

  // -------------------------------------------------------------------------
  // Conferencia direta do indice de directives, sem depender do coletor.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'memory/directive-index-growth',
    name: 'o indice de directives esvazia depois de destroy()',
    group: 'memory',
    n: 200,
    unit: 'elementos retidos',
    samples: 5,
    notes:
      'directiveIndex e um Map FORTE de nome -> Set<Element>. O que ficar la ' +
      'dentro segura o elemento e toda a subarvore dele.',
    setup: () => ({}),
    run: (ctx) => {
      // Sem acesso direto ao Map interno, a sonda e indireta: `queryDirective`
      // so devolve elementos conectados, entao contamos pelo heap retido.
      forceGC();
      const antes = process.memoryUsage().heapUsed;
      for (let ciclo = 0; ciclo < 200; ciclo++) {
        let html = '';
        for (let i = 0; i < 50; i++) html += `<div v-text="'a'" v-show="s" :data-k="${i}"></div>`;
        const root = host(html);
        walk(root, new Scope(reactive({ s: true })));
        flushSync();
        destroy(root);
        root.remove();
      }
      forceGC();
      forceGC();
      const depois = process.memoryUsage().heapUsed;
      ctx.retido = depois - antes;
      return ctx.retido / (200 * 50);
    },
    verify: (ctx, porElemento) => {
      if (!gcAvailable()) return true;
      // 10.000 elementos passaram pelo indice. Se cada um custar mais que ~200
      // bytes retidos, algo esta segurando os nos.
      return porElemento < 200
        ? true
        : `${porElemento.toFixed(0)} bytes retidos por elemento apos destroy() — o indice pode nao estar limpando`;
    },
  });

  return cases;
}
