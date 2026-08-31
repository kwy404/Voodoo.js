/**
 * @module benchmarks/vanilla
 *
 * Linha de base em JavaScript puro para os MESMOS cenarios.
 *
 * Este e o unico numero de comparacao honesto disponivel neste ambiente: roda
 * no mesmo jsdom, na mesma maquina, no mesmo processo, no mesmo instante. Um
 * "3x mais rapido que o React" medido em outra maquina, em outro ano, nao diz
 * nada. "2,4x o custo de escrever o DOM na mao" diz tudo.
 *
 * O codigo aqui e o que uma pessoa competente escreveria sem framework: sem
 * diffing, sem reatividade, sem abstracao. E o teto de desempenho.
 */

import { buildRows, samplesFor } from '../harness/kit.mjs';

export default function vanillaSuite() {
  const cases = [];

  const container = () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    return root;
  };
  const drop = (root) => root.remove();

  // -------------------------------------------------------------------------
  // Objeto simples, para comparar com o Proxy reativo
  // -------------------------------------------------------------------------
  const KEYS = Array.from({ length: 100 }, (_, i) => 'k' + i);
  const flatSeed = () => {
    const o = {};
    for (let i = 0; i < 100; i++) o['k' + i] = i;
    return o;
  };

  cases.push({
    id: 'vanilla/plain-object-read',
    name: '100.000 leituras em objeto simples',
    group: 'vanilla',
    n: 100000,
    setup: () => ({ state: flatSeed() }),
    run: (ctx) => {
      const s = ctx.state;
      let sum = 0;
      for (let i = 0; i < 100000; i++) sum += s[KEYS[i % 100]];
      return sum;
    },
    verify: (_c, sum) => (sum === 4950 * 1000 ? true : `soma errada: ${sum}`),
  });

  cases.push({
    id: 'vanilla/plain-object-write',
    name: '100.000 escritas em objeto simples',
    group: 'vanilla',
    n: 100000,
    setup: () => ({ state: flatSeed() }),
    run: (ctx) => {
      const s = ctx.state;
      for (let i = 0; i < 100000; i++) s[KEYS[i % 100]] = i;
      return s.k0;
    },
    verify: (ctx) => (ctx.state.k0 === 99900 ? true : `k0 = ${ctx.state.k0}`),
  });

  // -------------------------------------------------------------------------
  // DOM na mao
  // -------------------------------------------------------------------------
  cases.push({
    id: 'vanilla/dom-create-1000',
    name: 'createElement + appendChild x1.000',
    group: 'vanilla',
    n: 1000,
    setup: () => ({ root: container() }),
    run: (ctx) => {
      for (let i = 0; i < 1000; i++) {
        const d = document.createElement('div');
        d.textContent = 'item ' + i;
        ctx.root.appendChild(d);
      }
      return ctx.root.children.length;
    },
    verify: (_c, n) => (n === 1000 ? true : `criou ${n}`),
    teardown: (ctx) => drop(ctx.root),
  });

  cases.push({
    id: 'vanilla/dom-set-text-1000',
    name: 'textContent x1.000 em nos existentes',
    group: 'vanilla',
    n: 1000,
    setup: () => {
      const root = container();
      const nodes = [];
      for (let i = 0; i < 1000; i++) {
        const d = document.createElement('div');
        root.appendChild(d);
        nodes.push(d);
      }
      return { root, nodes };
    },
    run: (ctx) => {
      for (let i = 0; i < 1000; i++) ctx.nodes[i].textContent = 'novo ' + i;
      return ctx.nodes[999].textContent;
    },
    verify: (_c, t) => (t === 'novo 999' ? true : `texto final "${t}"`),
    teardown: (ctx) => drop(ctx.root),
  });

  cases.push({
    id: 'vanilla/dom-set-attribute-1000',
    name: 'setAttribute x1.000',
    group: 'vanilla',
    n: 1000,
    setup: () => {
      const root = container();
      const nodes = [];
      for (let i = 0; i < 1000; i++) {
        const d = document.createElement('div');
        root.appendChild(d);
        nodes.push(d);
      }
      return { root, nodes };
    },
    run: (ctx) => {
      for (let i = 0; i < 1000; i++) ctx.nodes[i].setAttribute('data-x', String(i));
      return ctx.nodes[999].getAttribute('data-x');
    },
    verify: (_c, v) => (v === '999' ? true : `valor final ${v}`),
    teardown: (ctx) => drop(ctx.root),
  });

  cases.push({
    id: 'vanilla/dom-add-listener-1000',
    name: 'addEventListener x1.000',
    group: 'vanilla',
    n: 1000,
    setup: () => {
      const root = container();
      const nodes = [];
      for (let i = 0; i < 1000; i++) {
        const b = document.createElement('button');
        root.appendChild(b);
        nodes.push(b);
      }
      return { root, nodes, hits: 0 };
    },
    run: (ctx) => {
      for (const n of ctx.nodes) n.addEventListener('click', () => { ctx.hits++; });
      ctx.nodes[0].dispatchEvent(new window.Event('click'));
      return ctx.hits;
    },
    verify: (_c, hits) => (hits === 1 ? true : `handler disparou ${hits} vezes`),
    teardown: (ctx) => drop(ctx.root),
  });

  // -------------------------------------------------------------------------
  // Listas na mao — os mesmos cenarios da suite `lists/`
  // -------------------------------------------------------------------------
  const renderRows = (root, rows) => {
    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = row.label;
      li.appendChild(span);
      frag.appendChild(li);
    }
    root.appendChild(frag);
  };

  for (const n of [100, 1000, 5000, 10000]) {
    cases.push({
      id: `vanilla/list-create-${n}`,
      name: `montar ${n} linhas na mao`,
      group: 'vanilla',
      n,
      samples: samplesFor(n),
      setup: () => ({ root: container(), rows: buildRows(n) }),
      run: (ctx) => {
        const ul = document.createElement('ul');
        ctx.root.appendChild(ul);
        renderRows(ul, ctx.rows);
        return ul;
      },
      verify: (ctx, ul) => {
        const count = ul.querySelectorAll('li').length;
        if (count !== n) return `esperava ${n} <li>, encontrou ${count}`;
        const first = ul.querySelector('li span').textContent;
        return first === ctx.rows[0].label ? true : `primeiro texto "${first}"`;
      },
      teardown: (ctx) => drop(ctx.root),
    });

    cases.push({
      id: `vanilla/list-clear-${n}`,
      name: `remover ${n} linhas na mao`,
      group: 'vanilla',
      n,
      samples: samplesFor(n),
      setup: () => {
        const root = container();
        const ul = document.createElement('ul');
        root.appendChild(ul);
        renderRows(ul, buildRows(n));
        return { root, ul };
      },
      run: (ctx) => {
        ctx.ul.textContent = '';
        return ctx.ul.querySelectorAll('li').length;
      },
      verify: (_c, left) => (left === 0 ? true : `sobraram ${left} <li>`),
      teardown: (ctx) => drop(ctx.root),
    });
  }

  cases.push({
    id: 'vanilla/list-update-every-10th-1000',
    name: 'atualizar 1 a cada 10 textos, 1.000 linhas, na mao',
    group: 'vanilla',
    n: 1000,
    setup: () => {
      const root = container();
      const ul = document.createElement('ul');
      root.appendChild(ul);
      renderRows(ul, buildRows(1000));
      return { root, ul, spans: ul.querySelectorAll('li span') };
    },
    run: (ctx) => {
      for (let i = 0; i < 1000; i += 10) ctx.spans[i].textContent = '!!! ' + i;
      return ctx.spans[10].textContent;
    },
    verify: (_c, t) => (t === '!!! 10' ? true : `texto "${t}"`),
    teardown: (ctx) => drop(ctx.root),
  });

  return cases;
}
