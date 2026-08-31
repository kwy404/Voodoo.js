/**
 * @module benchmarks/components
 *
 * Montagem, atualizacao, desmontagem, aninhamento e arvore profunda.
 *
 * Um caso e dedicado ao hook `updated`. Em `runtime/component.ts` ele cria um
 * efeito que le TODAS as chaves do estado a cada rodada para poder reagir a
 * qualquer mudanca. Os dois casos abaixo — mesmo componente, com e sem o hook —
 * medem quanto isso custa de verdade.
 */

import { samplesFor, budgetFor } from '../harness/kit.mjs';
import { withCurve } from '../harness/runner.mjs';

export default function componentsSuite(V) {
  const { reactive, Scope, walk, destroy, flushSync, component } = V;
  const cases = [];

  const define = component ?? V.defineComponent;

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

  // Registrados uma vez; registrar nao e o que se quer medir.
  define('bench-card', {
    props: { titulo: { type: 'string', default: 'sem titulo' } },
    state(props) {
      return { contador: 0, titulo: props.titulo };
    },
    computed: {
      dobro() {
        return this.contador * 2;
      },
    },
    methods: {
      inc() {
        this.contador++;
      },
    },
    template: `<h3 v-text="titulo"></h3><span class="c" v-text="contador"></span><span class="d" v-text="dobro"></span>`,
  });

  define('bench-card-updated', {
    props: { titulo: { type: 'string', default: 'sem titulo' } },
    state(props) {
      const s = { contador: 0, titulo: props.titulo };
      // Estado largo de proposito: o hook `updated` le TODAS as chaves.
      for (let i = 0; i < 50; i++) s['extra' + i] = i;
      return s;
    },
    template: `<h3 v-text="titulo"></h3><span class="c" v-text="contador"></span>`,
    updated() {
      /* corpo vazio: o custo medido e o do efeito que o hook obriga a criar */
    },
  });

  define('bench-card-plain', {
    props: { titulo: { type: 'string', default: 'sem titulo' } },
    state(props) {
      const s = { contador: 0, titulo: props.titulo };
      for (let i = 0; i < 50; i++) s['extra' + i] = i;
      return s;
    },
    template: `<h3 v-text="titulo"></h3><span class="c" v-text="contador"></span>`,
  });

  define('bench-leaf', {
    props: { valor: { type: 'number', default: 0 } },
    template: `<i v-text="valor"></i>`,
  });

  define('bench-branch', {
    props: { valor: { type: 'number', default: 0 } },
    template: `<b v-text="valor"></b><bench-leaf :valor="valor"></bench-leaf>`,
  });

  // -------------------------------------------------------------------------
  // mount
  // -------------------------------------------------------------------------
  const mountCase = (n) => ({
    id: `components/mount-${n}`,
    name: `montar ${n} componentes`,
    group: 'components',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    setup: () => {
      let html = '';
      for (let i = 0; i < n; i++) html += `<bench-card titulo="card ${i}"></bench-card>`;
      return { root: host(html) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(reactive({})));
      flushSync();
      return ctx.root.querySelectorAll('bench-card');
    },
    verify: (ctx, cards) => {
      if (cards.length !== n) return `esperava ${n} componentes, encontrou ${cards.length}`;
      const h = cards[0].querySelector('h3');
      if (!h) return 'o template nao foi aplicado (sem <h3>)';
      if (h.textContent !== 'card 0') return `titulo do primeiro = "${h.textContent}"`;
      if (cards[0].querySelector('.c').textContent !== '0') return 'o estado inicial nao renderizou';
      if (cards[0].querySelector('.d').textContent !== '0') return 'o computed nao renderizou';
      const ultimo = cards[n - 1].querySelector('h3');
      if (ultimo.textContent !== `card ${n - 1}`) return `titulo do ultimo = "${ultimo.textContent}"`;
      return true;
    },
    teardown,
  });

  cases.push(...withCurve('componentes: montar N', [10, 100, 500, 1000].map(mountCase)));

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  cases.push({
    id: 'components/update-500',
    name: 'atualizar o estado de 500 componentes montados',
    group: 'components',
    n: 500,
    budgetMs: 40,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 500; i++) html += `<bench-card titulo="c ${i}"></bench-card>`;
      const root = host(html);
      walk(root, new Scope(reactive({})));
      flushSync();
      const scopes = Array.from(root.querySelectorAll('bench-card')).map((el) => V.getScope(el));
      return { root, scopes, tick: 0 };
    },
    run: (ctx) => {
      const alvo = ++ctx.tick;
      for (const s of ctx.scopes) s.data.contador = alvo;
      flushSync();
      return alvo;
    },
    verify: (ctx, alvo) => {
      const cards = ctx.root.querySelectorAll('bench-card');
      if (cards.length !== 500) return `perdeu componentes: ${cards.length}`;
      if (cards[0].querySelector('.c').textContent !== String(alvo)) {
        return `primeiro contador = "${cards[0].querySelector('.c').textContent}", esperava ${alvo}`;
      }
      if (cards[499].querySelector('.d').textContent !== String(alvo * 2)) {
        return `ultimo computed = "${cards[499].querySelector('.d').textContent}", esperava ${alvo * 2}`;
      }
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // O custo do hook `updated`
  //
  // Mesmo componente, mesmo estado de 52 chaves, mesma atualizacao. A unica
  // diferenca e a presenca do hook, que obriga um efeito a ler todas as chaves.
  // -------------------------------------------------------------------------
  const updatedHookCase = (tag, id) => ({
    id,
    name: `atualizar 200 <${tag}> (estado de 52 chaves)`,
    group: 'components',
    n: 200,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 200; i++) html += `<${tag} titulo="c ${i}"></${tag}>`;
      const root = host(html);
      walk(root, new Scope(reactive({})));
      flushSync();
      const scopes = Array.from(root.querySelectorAll(tag)).map((el) => V.getScope(el));
      return { root, scopes, tag, tick: 0 };
    },
    run: (ctx) => {
      const alvo = ++ctx.tick;
      for (const s of ctx.scopes) s.data.contador = alvo;
      flushSync();
      return alvo;
    },
    verify: (ctx, alvo) => {
      const els = ctx.root.querySelectorAll(ctx.tag);
      if (els.length !== 200) return `perdeu componentes: ${els.length}`;
      const got = els[0].querySelector('.c').textContent;
      return got === String(alvo) ? true : `contador = "${got}", esperava ${alvo}`;
    },
    teardown,
  });

  cases.push(
    updatedHookCase('bench-card-plain', 'components/updated-hook-absent-200'),
    updatedHookCase('bench-card-updated', 'components/updated-hook-present-200')
  );

  // -------------------------------------------------------------------------
  // unmount
  // -------------------------------------------------------------------------
  cases.push({
    id: 'components/unmount-500',
    name: 'desmontar 500 componentes',
    group: 'components',
    n: 500,
    budgetMs: 40,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 500; i++) html += `<bench-card titulo="c ${i}"></bench-card>`;
      const root = host(html);
      walk(root, new Scope(reactive({})));
      flushSync();
      return { root };
    },
    run: (ctx) => {
      destroy(ctx.root);
      ctx.root.remove();
      ctx.desmontado = true;
      return V.instances.size;
    },
    verify: (ctx) => (ctx.desmontado ? true : 'nao desmontou'),
    teardown: (ctx) => {
      if (!ctx.desmontado) teardown(ctx);
    },
  });

  // -------------------------------------------------------------------------
  // Aninhamento e arvore profunda
  // -------------------------------------------------------------------------
  cases.push({
    id: 'components/nested-200',
    name: 'montar 200 componentes com filho aninhado',
    group: 'components',
    n: 200,
    budgetMs: 60,
    samples: 20,
    setup: () => {
      let html = '';
      for (let i = 0; i < 200; i++) html += `<bench-branch :valor="${i}"></bench-branch>`;
      return { root: host(html) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(reactive({})));
      flushSync();
      return ctx.root;
    },
    verify: (ctx) => {
      const branches = ctx.root.querySelectorAll('bench-branch');
      if (branches.length !== 200) return `esperava 200 bench-branch, encontrou ${branches.length}`;
      const leaves = ctx.root.querySelectorAll('bench-leaf');
      if (leaves.length !== 200) return `esperava 200 bench-leaf, encontrou ${leaves.length}`;
      const b = branches[7].querySelector('b');
      const i = leaves[7].querySelector('i');
      if (!b || b.textContent !== '7') return `pai 7 renderizou "${b?.textContent}"`;
      if (!i || i.textContent !== '7') return `filho 7 renderizou "${i?.textContent}" — a prop nao desceu`;
      return true;
    },
    teardown,
  });

  const deepCase = (depth) => ({
    id: `components/deep-tree-${depth}`,
    name: `arvore de ${depth} niveis de profundidade`,
    group: 'components',
    n: depth,
    samples: 25,
    setup: () => {
      let html = '<div v-text="folha"></div>';
      for (let i = 0; i < depth; i++) html = `<div class="n${i}">${html}</div>`;
      return { root: host(html), state: reactive({ folha: 'fundo' }) };
    },
    run: (ctx) => {
      walk(ctx.root, new Scope(ctx.state));
      flushSync();
      return ctx.root;
    },
    verify: (ctx, root) => {
      const alvo = root.querySelector(`.n0 > div`);
      if (!alvo) return 'o no mais profundo nao foi encontrado';
      if (alvo.textContent !== 'fundo') return `no profundo = "${alvo.textContent}"`;
      if (!root.querySelector(`.n${depth - 1}`)) return 'a arvore nao tem a profundidade esperada';
      return true;
    },
    teardown,
  });

  cases.push(...withCurve('arvore: profundidade N', [10, 50, 200].map(deepCase)));

  return cases;
}
