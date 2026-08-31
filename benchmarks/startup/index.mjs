/**
 * @module benchmarks/startup
 *
 * Custo de partida: avaliar o modulo do zero e percorrer uma pagina com N
 * directives.
 *
 * O caso de cold start reimporta o bundle com uma chave de cache nova, o que
 * obriga o V8 a compilar e avaliar o modulo inteiro outra vez — registrar todas
 * as directives, montar as tabelas internas, criar o escopo raiz. E o que o
 * navegador paga ao carregar o script, menos o download e o parse do HTML.
 */

import { loadVoodoo } from '../harness/dom.mjs';
import { samplesFor, budgetFor } from '../harness/kit.mjs';
import { withCurve } from '../harness/runner.mjs';

export default function startupSuite(V) {
  const cases = [];

  cases.push({
    id: 'startup/cold-module-eval',
    name: 'avaliar o modulo da Voodoo do zero',
    group: 'startup',
    n: 1,
    unit: 'ms',
    samples: 12,
    warmup: 2,
    maxTotalMs: 30_000,
    budgetMs: 40,
    notes:
      'Reimporta o bundle com chave de cache nova: compila e avalia o modulo ' +
      'inteiro. Nao inclui download nem parse de HTML.',
    run: async () => {
      const mod = await loadVoodoo({ fresh: true });
      return mod;
    },
    verify: (_ctx, mod) => {
      if (typeof mod.reactive !== 'function') return 'o modulo recarregado nao expoe reactive()';
      if (typeof mod.walk !== 'function') return 'o modulo recarregado nao expoe walk()';
      // O registro de directives vive no objeto `V` padrao, e nao nos nomeados.
      const registro = mod.default?.directives;
      if (!registro || registro.size < 50) {
        return `o registro de directives ficou com ${registro?.size} entradas apos a reavaliacao`;
      }
      // Uma instancia recem-avaliada precisa reagir de verdade, e nao apenas
      // existir: aqui ela monta um no e confere o resultado.
      const el = document.createElement('div');
      el.innerHTML = '<span v-text="quem"></span>';
      mod.walk(el, new mod.Scope(mod.reactive({ quem: 'ok' })));
      mod.flushSync();
      const texto = el.querySelector('span').textContent;
      return texto === 'ok' ? true : `a instancia recarregada renderizou "${texto}"`;
    },
  });

  // -------------------------------------------------------------------------
  // Paginas com N directives: o custo de `start()` sobre um documento real.
  // A pagina mistura os tipos que aparecem juntos no mundo real.
  // -------------------------------------------------------------------------
  const pageHtml = (n) => {
    const partes = [];
    for (let i = 0; i < n; i++) {
      switch (i % 5) {
        case 0:
          partes.push(`<span v-text="k${i}"></span>`);
          break;
        case 1:
          partes.push(`<div :data-v="k${i}"></div>`);
          break;
        case 2:
          partes.push(`<button @click="k${i}"></button>`);
          break;
        case 3:
          partes.push(`<p v-show="ligado">texto { k${i} }</p>`);
          break;
        default:
          partes.push(`<em :class="{ on: ligado }" v-text="k${i}"></em>`);
      }
    }
    return partes.join('');
  };

  const pageState = (n) => {
    const s = { ligado: true };
    for (let i = 0; i < n; i++) s['k' + i] = 'v' + i;
    return s;
  };

  const pageCase = (n) => ({
    id: `startup/page-${n}-directives`,
    name: `percorrer uma pagina com ${n} directives`,
    group: 'startup',
    n,
    samples: samplesFor(n),
    maxTotalMs: budgetFor(n),
    warmup: 2,
    setup: () => {
      const root = document.createElement('div');
      root.innerHTML = pageHtml(n);
      document.body.appendChild(root);
      return { root, state: V.reactive(pageState(n)) };
    },
    run: (ctx) => {
      V.walk(ctx.root, new V.Scope(ctx.state));
      V.flushSync();
      return ctx.root;
    },
    verify: (ctx) => {
      const root = ctx.root;
      const spans = root.querySelectorAll('span');
      if (!spans.length) return 'nenhum <span> na pagina';
      if (spans[0].textContent !== 'v0') return `v-text nao rodou: "${spans[0].textContent}"`;
      const divs = root.querySelectorAll('div');
      if (divs[0].getAttribute('data-v') !== 'v1') return `:data-v nao rodou: "${divs[0].getAttribute('data-v')}"`;
      const ps = root.querySelectorAll('p');
      if (ps.length && !ps[0].textContent.includes('v3')) {
        return `a interpolacao nao rodou: "${ps[0].textContent}"`;
      }
      const ems = root.querySelectorAll('em');
      if (ems.length && !ems[0].classList.contains('on')) return ':class nao rodou';
      // Total de nos com directive precisa bater com o que foi escrito.
      const total = spans.length + divs.length + root.querySelectorAll('button').length + ps.length + ems.length;
      return total === n ? true : `esperava ${n} nos com directive, encontrou ${total}`;
    },
    teardown: (ctx) => {
      V.destroy(ctx.root);
      ctx.root.remove();
    },
  });

  cases.push(
    ...withCurve('startup: pagina com N directives', [10, 100, 1000, 5000, 10000].map(pageCase))
  );

  return cases;
}
