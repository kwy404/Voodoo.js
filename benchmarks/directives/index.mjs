/**
 * @module benchmarks/directives
 * Custo por directive: v-text, v-show, v-if, v-model, eventos e v-bind.
 */

import { budgetFor, samplesFor } from '../harness/kit.mjs';
import { withCurve } from '../harness/runner.mjs';

export default function directivesSuite(V) {
  const { reactive, Scope, walk, destroy, flushSync } = V;
  const cases = [];

  const host = (html) => {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    return root;
  };
  const teardown = (ctx) => {
    destroy(ctx.root);
    ctx.root.remove();
  };

  /** Fabrica um caso "montar N elementos com esta directive". */
  const bindCase = ({ id, name, markup, data, n, check, budgetMs }) => ({
    id: `directives/${id}-${n}`,
    name: `${name} x${n}`,
    group: 'directives',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    budgetMs,
    setup: () => {
      let html = '';
      for (let i = 0; i < n; i++) html += markup(i);
      return { root: host(html), state: reactive(typeof data === 'function' ? data() : { ...data }) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root;
    },
    verify: (ctx) => check(ctx, n),
    teardown,
  });

  // --- v-text ---
  cases.push(
    bindCase({
      id: 'v-text-mount',
      name: 'montar v-text',
      n: 1000,
      budgetMs: 30,
      markup: (i) => `<span v-text="'linha ' + ${i}"></span>`,
      data: {},
      check: (ctx, n) => {
        const s = ctx.root.querySelectorAll('span');
        if (s.length !== n) return `esperava ${n} spans, encontrou ${s.length}`;
        if (s[0].textContent !== 'linha 0') return `primeiro "${s[0].textContent}"`;
        if (s[n - 1].textContent !== `linha ${n - 1}`) return `ultimo "${s[n - 1].textContent}"`;
        return true;
      },
    })
  );

  // --- interpolacao de texto `{ x }` contra v-text ---
  cases.push(
    bindCase({
      id: 'interpolation-mount',
      name: 'montar interpolacao { x }',
      n: 1000,
      budgetMs: 40,
      markup: (i) => `<span>linha { k${i} }</span>`,
      data: () => {
        const d = {};
        for (let i = 0; i < 1000; i++) d['k' + i] = i;
        return d;
      },
      check: (ctx, n) => {
        const s = ctx.root.querySelectorAll('span');
        if (s.length !== n) return `esperava ${n} spans, encontrou ${s.length}`;
        if (s[0].textContent !== 'linha 0') return `primeiro "${s[0].textContent}"`;
        if (s[n - 1].textContent !== `linha ${n - 1}`) return `ultimo "${s[n - 1].textContent}"`;
        return true;
      },
    })
  );

  // --- v-show ---
  cases.push({
    id: 'directives/v-show-toggle-1000',
    name: 'alternar v-show em 1.000 elementos',
    group: 'directives',
    n: 1000,
    budgetMs: 15,
    samples: 25,
    setup: () => {
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div v-show="visivel"></div>`;
      const root = host(html);
      const state = reactive({ visivel: true });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.visivel = !ctx.state.visivel;
      flushSync();
      return ctx.state.visivel;
    },
    verify: (ctx, visivel) => {
      const d = ctx.root.querySelectorAll('div');
      if (d.length !== 1000) return `perdeu elementos: ${d.length}`;
      const escondido = d[0].style.display === 'none';
      if (visivel === escondido) return `v-show fora de sincronia: visivel=${visivel}, display="${d[0].style.display}"`;
      const ultimoEscondido = d[999].style.display === 'none';
      if (escondido !== ultimoEscondido) return 'o ultimo elemento nao acompanhou o primeiro';
      return true;
    },
    teardown,
  });

  // --- v-if: alterna a subarvore inteira, com destroy e remontagem ---
  const vIfCase = (n) => ({
    id: `directives/v-if-toggle-${n}`,
    name: `alternar v-if sobre ${n} elementos (destroi e remonta)`,
    group: 'directives',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    notes: 'Cada ciclo destroi N nos e monta N nos: exercita destroy() e o indice de directives.',
    setup: () => {
      let inner = '';
      for (let i = 0; i < n; i++) inner += `<span v-text="'x' + ${i}"></span>`;
      const root = host(`<div v-if="mostrar">${inner}</div>`);
      const state = reactive({ mostrar: true });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.mostrar = false;
      flushSync();
      const vazio = ctx.root.querySelectorAll('span').length;
      ctx.state.mostrar = true;
      flushSync();
      return { vazio, cheio: ctx.root.querySelectorAll('span').length };
    },
    verify: (_ctx, r) => {
      if (r.vazio !== 0) return `depois de esconder sobraram ${r.vazio} spans`;
      if (r.cheio !== n) return `depois de mostrar apareceram ${r.cheio} spans, esperava ${n}`;
      return true;
    },
    teardown,
  });

  cases.push(...withCurve('v-if: ciclo destroi+monta N nos', [100, 1000, 5000].map(vIfCase)));

  // --- v-model ---
  cases.push({
    id: 'directives/v-model-mount-1000',
    name: 'montar 1.000 inputs com v-model',
    group: 'directives',
    n: 1000,
    budgetMs: 40,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<input v-model="k${i}">`;
      const seed = {};
      for (let i = 0; i < 1000; i++) seed['k' + i] = 'v' + i;
      return { root: host(html), state: reactive(seed) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root.querySelectorAll('input');
    },
    verify: (ctx, inputs) => {
      if (inputs.length !== 1000) return `esperava 1000 inputs, encontrou ${inputs.length}`;
      if (inputs[0].value !== 'v0') return `primeiro value "${inputs[0].value}"`;
      if (inputs[999].value !== 'v999') return `ultimo value "${inputs[999].value}"`;
      return true;
    },
    teardown,
  });

  cases.push({
    id: 'directives/v-model-input-1000',
    name: '1.000 eventos de input propagando para o estado',
    group: 'directives',
    n: 1000,
    budgetMs: 40,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<input v-model="k${i}">`;
      const seed = {};
      for (let i = 0; i < 1000; i++) seed['k' + i] = '';
      const root = host(html);
      const state = reactive(seed);
      walk(root, new Scope(state));
      flushSync();
      return { root, state, inputs: root.querySelectorAll('input') };
    },
    run: (ctx) => {
      for (let i = 0; i < 1000; i++) {
        ctx.inputs[i].value = 'digitado ' + i;
        ctx.inputs[i].dispatchEvent(new window.Event('input', { bubbles: true }));
      }
      flushSync();
      return ctx.state.k999;
    },
    verify: (ctx, ultimo) => {
      if (ctx.state.k0 !== 'digitado 0') return `k0 = "${ctx.state.k0}"`;
      return ultimo === 'digitado 999' ? true : `k999 = "${ultimo}"`;
    },
    teardown,
  });

  // --- v-bind com muitos atributos no mesmo elemento ---
  cases.push({
    id: 'directives/v-bind-many-attrs-500',
    name: '500 elementos com 6 bindings cada',
    group: 'directives',
    n: 500,
    budgetMs: 60,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 500; i++) {
        html +=
          `<div :id="'d' + ${i}" :title="t" :data-a="a" :data-b="b" ` +
          `:class="{ on: a > 0 }" :style="{ width: b + 'px' }"></div>`;
      }
      return { root: host(html), state: reactive({ t: 'titulo', a: 1, b: 10 }) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root.querySelectorAll('div');
    },
    verify: (ctx, divs) => {
      if (divs.length !== 500) return `esperava 500 divs, encontrou ${divs.length}`;
      const d = divs[0];
      if (d.id !== 'd0') return `id = "${d.id}"`;
      if (d.getAttribute('title') !== 'titulo') return `title = "${d.getAttribute('title')}"`;
      if (d.getAttribute('data-b') !== '10') return `data-b = "${d.getAttribute('data-b')}"`;
      if (!d.classList.contains('on')) return 'a classe condicional nao foi aplicada';
      if (d.style.width !== '10px') return `width = "${d.style.width}"`;
      return true;
    },
    teardown,
  });

  // --- Eventos com modificadores ---
  cases.push({
    id: 'directives/event-modifiers-1000',
    name: '1.000 @click.prevent.stop disparados',
    group: 'directives',
    n: 1000,
    budgetMs: 30,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<button @click.prevent="n++"></button>`;
      const root = host(html);
      const state = reactive({ n: 0 });
      walk(root, new Scope(state));
      flushSync();
      return { root, state, buttons: root.querySelectorAll('button') };
    },
    run: (ctx) => {
      for (const b of ctx.buttons) b.dispatchEvent(new window.MouseEvent('click', { cancelable: true }));
      flushSync();
      return ctx.state.n;
    },
    verify: (_c, n) => (n === 1000 ? true : `contador = ${n}, esperava 1000`),
    teardown,
  });

  return cases;
}
