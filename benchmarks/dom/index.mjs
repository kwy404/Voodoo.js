/**
 * @module benchmarks/dom
 * Operacoes de DOM feitas pelo runtime: criar, atualizar texto, atributos,
 * classes e eventos. Cada caso tem um par em `vanilla/` com o mesmo resultado.
 */

import { mount, unmount } from '../harness/kit.mjs';

export default function domSuite(V) {
  const { reactive, Scope, walk, destroy, flushSync } = V;
  const cases = [];

  const host = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
  };

  // -------------------------------------------------------------------------
  // Criacao: 1.000 elementos com uma directive cada, montados pelo walker
  // -------------------------------------------------------------------------
  cases.push({
    id: 'dom/create-1000-bound',
    name: 'walk() sobre 1.000 <div v-text> ja no HTML',
    group: 'dom',
    n: 1000,
    vanillaOf: 'vanilla/dom-create-1000',
    samples: 20,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div v-text="'item ' + ${i}"></div>`;
      root.innerHTML = html;
      return { root, state: reactive({}) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root;
    },
    verify: (ctx) => {
      const divs = ctx.root.querySelectorAll('div');
      if (divs.length !== 1000) return `esperava 1000 divs, encontrou ${divs.length}`;
      if (divs[0].textContent !== 'item 0') return `primeiro texto "${divs[0].textContent}"`;
      if (divs[999].textContent !== 'item 999') return `ultimo texto "${divs[999].textContent}"`;
      return true;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  // -------------------------------------------------------------------------
  // Atualizacao de texto por reatividade
  // -------------------------------------------------------------------------
  cases.push({
    id: 'dom/update-text-1000',
    name: '1.000 nos v-text atualizados por uma escrita de estado',
    group: 'dom',
    n: 1000,
    vanillaOf: 'vanilla/dom-set-text-1000',
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div v-text="prefixo + ${i}"></div>`;
      root.innerHTML = html;
      const state = reactive({ prefixo: 'a' });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.prefixo = 'novo ';
      flushSync();
      return ctx.root.querySelector('div').textContent;
    },
    verify: (ctx) => {
      const divs = ctx.root.querySelectorAll('div');
      if (divs[0].textContent !== 'novo 0') return `primeiro "${divs[0].textContent}"`;
      if (divs[999].textContent !== 'novo 999') return `ultimo "${divs[999].textContent}"`;
      return true;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  cases.push({
    id: 'dom/update-one-of-1000',
    name: 'atualizar 1 no entre 1.000 (precisao do rastreamento)',
    group: 'dom',
    n: 1,
    budgetMs: 0.5,
    samples: 50,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div v-text="k${i}"></div>`;
      root.innerHTML = html;
      const seed = {};
      for (let i = 0; i < 1000; i++) seed['k' + i] = 'v' + i;
      const state = reactive(seed);
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.k500 = 'alterado';
      flushSync();
      return ctx.root.querySelectorAll('div')[500].textContent;
    },
    verify: (ctx, text) => {
      if (text !== 'alterado') return `no 500 = "${text}"`;
      const divs = ctx.root.querySelectorAll('div');
      if (divs[499].textContent !== 'v499') return 'vizinho 499 foi alterado sem precisar';
      if (divs[501].textContent !== 'v501') return 'vizinho 501 foi alterado sem precisar';
      return true;
    },
    notes: 'Mede o beneficio central de nao ter Virtual DOM: uma escrita toca um no.',
    teardown: (ctx) => unmount(V, ctx.root),
  });

  // -------------------------------------------------------------------------
  // Atributos e classes
  // -------------------------------------------------------------------------
  cases.push({
    id: 'dom/update-attributes-1000',
    name: '1.000 atributos :data-x atualizados',
    group: 'dom',
    n: 1000,
    vanillaOf: 'vanilla/dom-set-attribute-1000',
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div :data-x="base + ${i}"></div>`;
      root.innerHTML = html;
      const state = reactive({ base: 0 });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.base = 1000;
      flushSync();
      return ctx.root.querySelector('div').getAttribute('data-x');
    },
    verify: (ctx) => {
      const divs = ctx.root.querySelectorAll('div');
      if (divs[0].getAttribute('data-x') !== '1000') return `primeiro data-x = ${divs[0].getAttribute('data-x')}`;
      if (divs[999].getAttribute('data-x') !== '1999') return `ultimo data-x = ${divs[999].getAttribute('data-x')}`;
      return true;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  cases.push({
    id: 'dom/update-classes-1000',
    name: '1.000 elementos com :class de objeto, alternando',
    group: 'dom',
    n: 1000,
    budgetMs: 20,
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div class="base" :class="{ ativo: ligado, off: !ligado }"></div>`;
      root.innerHTML = html;
      const state = reactive({ ligado: false });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.ligado = true;
      flushSync();
      return ctx.root.querySelector('div').className;
    },
    verify: (ctx) => {
      const d = ctx.root.querySelectorAll('div');
      if (!d[0].classList.contains('ativo')) return `primeiro nao ganhou .ativo: "${d[0].className}"`;
      if (d[0].classList.contains('off')) return 'primeiro manteve .off';
      if (!d[0].classList.contains('base')) return 'a classe estatica base foi perdida';
      if (!d[999].classList.contains('ativo')) return 'ultimo nao ganhou .ativo';
      return true;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  cases.push({
    id: 'dom/update-style-1000',
    name: '1.000 elementos com :style de objeto',
    group: 'dom',
    n: 1000,
    budgetMs: 25,
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<div :style="{ width: w + 'px' }"></div>`;
      root.innerHTML = html;
      const state = reactive({ w: 10 });
      walk(root, new Scope(state));
      flushSync();
      return { root, state };
    },
    run: (ctx) => {
      ctx.state.w = 200;
      flushSync();
      return ctx.root.querySelector('div').style.width;
    },
    verify: (ctx) => {
      const d = ctx.root.querySelectorAll('div');
      if (d[0].style.width !== '200px') return `primeiro width = "${d[0].style.width}"`;
      if (d[999].style.width !== '200px') return `ultimo width = "${d[999].style.width}"`;
      return true;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  // -------------------------------------------------------------------------
  // Eventos
  // -------------------------------------------------------------------------
  cases.push({
    id: 'dom/bind-events-1000',
    name: 'ligar 1.000 @click pelo walker',
    group: 'dom',
    n: 1000,
    vanillaOf: 'vanilla/dom-add-listener-1000',
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<button @click="contador++"></button>`;
      root.innerHTML = html;
      return { root, state: reactive({ contador: 0 }) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      ctx.root.querySelector('button').dispatchEvent(new window.Event('click'));
      return ctx.state.contador;
    },
    verify: (ctx, contador) => {
      if (ctx.root.querySelectorAll('button').length !== 1000) return 'perdeu botoes';
      return contador === 1 ? true : `o clique incrementou para ${contador}, esperava 1`;
    },
    teardown: (ctx) => unmount(V, ctx.root),
  });

  cases.push({
    id: 'dom/dispatch-events-1000',
    name: 'disparar 1.000 cliques em elementos ja ligados',
    group: 'dom',
    n: 1000,
    budgetMs: 20,
    samples: 25,
    setup: () => {
      const root = host();
      let html = '';
      for (let i = 0; i < 1000; i++) html += `<button @click="contador++"></button>`;
      root.innerHTML = html;
      const state = reactive({ contador: 0 });
      walk(root, new Scope(state));
      flushSync();
      return { root, state, buttons: root.querySelectorAll('button') };
    },
    run: (ctx) => {
      for (const b of ctx.buttons) b.dispatchEvent(new window.Event('click'));
      flushSync();
      return ctx.state.contador;
    },
    verify: (_c, contador) => (contador === 1000 ? true : `contador = ${contador}, esperava 1000`),
    teardown: (ctx) => unmount(V, ctx.root),
  });

  return cases;
}
