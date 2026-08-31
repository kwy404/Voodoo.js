/**
 * @module benchmarks/parser
 *
 * Lexer, parser e o cache de AST.
 *
 * O ponto de atencao esta em `parser.ts`: quando o cache chega a MAX_CACHE
 * (2000) ele nao descarta a entrada mais velha — chama `cache.clear()` e joga
 * fora as 2000. Uma pagina com mais de 2000 expressoes distintas cai num ciclo
 * onde o cache se esvazia sozinho o tempo todo. Os casos abaixo medem os dois
 * regimes: dentro do teto e passando por cima dele.
 */

import { withCurve } from '../harness/runner.mjs';

const SIMPLE = 'count';
const MEDIUM = 'user.name + " " + user.last';
const COMPLEX =
  'items.filter(i => i.done && i.owner.id === user.id).map(i => ({ id: i.id, t: `${i.title} (${i.tags.length})` })).length > 0 ? "sim" : "nao"';

export default function parserSuite(V) {
  const { parse, clearParseCache, tokenize, evaluate, Scope, reactive } = V;
  const cases = [];

  cases.push({
    id: 'parser/tokenize-complex',
    name: 'tokenize() de expressao complexa x1.000',
    group: 'parser',
    n: 1000,
    budgetMs: 30,
    run: () => {
      let last;
      for (let i = 0; i < 1000; i++) last = tokenize(COMPLEX);
      return last;
    },
    verify: (_c, toks) => (Array.isArray(toks) && toks.length > 20 ? true : 'tokenize devolveu pouco'),
  });

  // --- Cache quente: a mesma expressao mil vezes. So o Map.get deve pesar. ---
  for (const [label, src, budget] of [
    ['simple', SIMPLE, 1],
    ['medium', MEDIUM, 1],
    ['complex', COMPLEX, 1],
  ]) {
    cases.push({
      id: `parser/cache-hit-${label}`,
      name: `parse() com cache quente, expressao ${label}, x10.000`,
      group: 'parser',
      n: 10000,
      budgetMs: budget,
      setup: () => {
        parse(src);
        return {};
      },
      run: () => {
        let last;
        for (let i = 0; i < 10000; i++) last = parse(src);
        return last;
      },
      verify: (_c, node) => (node && node.t ? true : 'parse nao devolveu um no'),
    });
  }

  // --- Cache frio: cada expressao e nova, entao paga lexer + parser. ---
  for (const [label, make, budget] of [
    ['simple', (i) => `count${i}`, 8],
    ['medium', (i) => `user${i}.name + " " + user${i}.last`, 25],
    ['complex', (i) => COMPLEX.replace(/items/g, `items${i}`), 120],
  ]) {
    cases.push({
      id: `parser/cache-miss-${label}`,
      name: `parse() de 1.000 expressoes ineditas, ${label}`,
      group: 'parser',
      n: 1000,
      budgetMs: budget,
      setup: () => {
        clearParseCache();
        return { sources: Array.from({ length: 1000 }, (_, i) => make(i)) };
      },
      run: (ctx) => {
        let last;
        for (const s of ctx.sources) last = parse(s);
        return last;
      },
      verify: (_c, node) => (node && node.t ? true : 'parse nao devolveu um no'),
      teardown: () => clearParseCache(),
    });
  }

  // -------------------------------------------------------------------------
  // O teto do cache: MAX_CACHE = 2000, e o overflow faz `cache.clear()`.
  //
  // Cenario A: 1.900 expressoes distintas relidas em ciclo — cabe no cache,
  //            todas as leituras seguintes sao acerto.
  // Cenario B: 2.100 expressoes distintas relidas em ciclo — a cada volta o
  //            cache estoura, se esvazia inteiro, e TUDO vira erro de cache.
  //
  // Se B for muito mais caro que A com apenas 10% mais expressoes, o descarte
  // total esta confirmado como penhasco de desempenho.
  // -------------------------------------------------------------------------
  const cliffCase = (count, id) => ({
    id,
    name: `${count} expressoes distintas, 3 passadas em ciclo`,
    group: 'parser',
    n: count,
    samples: 15,
    warmup: 2,
    setup: () => {
      clearParseCache();
      const sources = Array.from({ length: count }, (_, i) => `a${i}.b${i} + c${i} * ${i}`);
      // Primeira passada aquece o cache (ou o estoura) antes de medir.
      for (const s of sources) parse(s);
      return { sources };
    },
    run: (ctx) => {
      let last;
      for (let pass = 0; pass < 3; pass++) {
        for (const s of ctx.sources) last = parse(s);
      }
      return last;
    },
    verify: (_c, node) => (node && node.t ? true : 'parse nao devolveu um no'),
    teardown: () => clearParseCache(),
  });

  cases.push(
    cliffCase(1900, 'parser/cache-under-limit-1900'),
    cliffCase(2100, 'parser/cache-over-limit-2100'),
    cliffCase(4000, 'parser/cache-over-limit-4000')
  );

  // -------------------------------------------------------------------------
  // Avaliacao: parse ja feito, medindo so o interpretador.
  // -------------------------------------------------------------------------
  cases.push({
    id: 'parser/evaluate-medium-10k',
    name: 'evaluate() de AST media x10.000',
    group: 'parser',
    n: 10000,
    budgetMs: 25,
    setup: () => {
      const scope = new Scope(reactive({ user: { name: 'Ana', last: 'Souza' } }));
      return { ast: parse(MEDIUM), scope };
    },
    run: (ctx) => {
      let last;
      for (let i = 0; i < 10000; i++) last = evaluate(ctx.ast, ctx.scope);
      return last;
    },
    verify: (_c, v) => (v === 'Ana Souza' ? true : `resultado "${v}"`),
  });

  // -------------------------------------------------------------------------
  // Heuristica de interpolacao: `pareceExpressao` chama parse() para decidir se
  // `{ ... }` no texto e codigo ou prosa. Aqui o custo aparece por caminho.
  // -------------------------------------------------------------------------
  const interpCase = (n) => ({
    id: `parser/interpolation-decide-${n}`,
    name: `decidir expressao vs prosa em ${n} textos distintos`,
    group: 'parser',
    n,
    samples: 15,
    warmup: 2,
    setup: () => {
      clearParseCache();
      const root = document.createElement('div');
      let html = '';
      for (let i = 0; i < n; i++) {
        // Metade e expressao de verdade, metade e texto humano com chaves.
        html += i % 2 === 0 ? `<p>valor { v${i} } aqui</p>` : `<p>nota { um texto qualquer ${i} }</p>`;
      }
      root.innerHTML = html;
      document.body.appendChild(root);
      const data = {};
      for (let i = 0; i < n; i += 2) data['v' + i] = i;
      return { root, data };
    },
    run: (ctx) => {
      V.walk(ctx.root, new Scope(reactive(ctx.data)));
      V.flushSync();
      return ctx.root.querySelectorAll('p').length;
    },
    verify: (ctx) => {
      const ps = ctx.root.querySelectorAll('p');
      if (ps.length !== n) return `esperava ${n} <p>, encontrou ${ps.length}`;
      // O par indice 0 interpola; o impar continua sendo o texto original.
      if (ps[0].textContent !== 'valor 0 aqui') return `interpolacao falhou: "${ps[0].textContent}"`;
      if (!ps[1].textContent.includes('{')) return `prosa foi interpolada por engano: "${ps[1].textContent}"`;
      return true;
    },
    teardown: (ctx) => {
      V.destroy(ctx.root);
      ctx.root.remove();
      clearParseCache();
    },
  });

  cases.push(...withCurve('interpolacao: heuristica parse() por texto', [100, 1000, 5000].map(interpCase)));

  return cases;
}
