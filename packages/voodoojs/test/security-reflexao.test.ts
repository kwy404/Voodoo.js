/**
 * Regressao: fuga do interpretador por reflexao (SEC-01).
 *
 * O bloqueio de chaves (`__proto__`, `constructor`, `prototype`) cobre o acesso
 * direto, como `x.constructor`. Mas os metodos reflexivos do `Object` nativo
 * recebem o alvo como ARGUMENTO, e argumento nao passa por aquele bloqueio.
 * A cadeia abaixo recuperava `Function` e executava codigo arbitrario, ou seja,
 * `eval` pela porta dos fundos, com alcance a `window`, `document` e `fetch`:
 *
 * ```js
 * Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object), 'constructor')
 *   .value('return this')()
 * ```
 *
 * A correcao inverte o padrao em vez de aumentar a lista de proibicoes: o
 * `Object` liberado dentro das expressoes passou a ser um subconjunto seguro.
 * Uma expressao pode chamar funcionalidades; ela nao recebe ferramentas para
 * inspecionar o runtime de JavaScript.
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser/parser';
import { allowedGlobals, evaluate } from '../src/parser/interpreter';
import { Scope } from '../src/runtime/scope';

/** Avalia uma expressao, devolvendo o erro em vez de deixar escapar. */
function tentar(fonte: string): { ok: boolean; valor?: unknown; erro?: string } {
  try {
    return { ok: true, valor: evaluate(parse(fonte), new Scope({ alvo: {}, lista: [1, 2] })) };
  } catch (err) {
    return { ok: false, erro: (err as Error).message.split('\n')[0] };
  }
}

describe('SEC-01: reflexao nao pode devolver Function', () => {
  it('a cadeia completa nao executa codigo', () => {
    const r = tentar(
      "Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object), 'constructor').value('return 1+1')"
    );
    // Nao importa se falha por erro ou por undefined; o que nao pode e virar funcao.
    expect(typeof r.valor).not.toBe('function');
  });

  it('nenhuma ferramenta de reflexao esta alcancavel', () => {
    const ferramentas = [
      'getPrototypeOf',
      'setPrototypeOf',
      'getOwnPropertyDescriptor',
      'getOwnPropertyDescriptors',
      'getOwnPropertyNames',
      'getOwnPropertySymbols',
      'defineProperty',
      'defineProperties',
      'create',
    ];
    for (const nome of ferramentas) {
      const r = tentar(`Object.${nome}`);
      expect(typeof r.valor, `Object.${nome} nao pode existir`).not.toBe('function');
    }
  });

  it('o Object liberado nao e o Object nativo', () => {
    expect(allowedGlobals.Object).not.toBe(Object);
    expect(Object.isFrozen(allowedGlobals.Object)).toBe(true);
  });

  it('Function e globalThis continuam inalcancaveis por qualquer caminho', () => {
    const tentativas = [
      'Function',
      'globalThis',
      'window',
      'eval',
      'Reflect',
      'Proxy',
      'process',
      'require',
      'import',
      "[].constructor",
      "''.constructor",
      '(0).constructor',
      'alvo.constructor',
      "alvo['constructor']",
      'alvo.__proto__',
      'lista.constructor.constructor',
    ];
    for (const fonte of tentativas) {
      const r = tentar(fonte);
      expect(typeof r.valor, `"${fonte}" nao pode devolver funcao`).not.toBe('function');
    }
  });

  it('callback de metodo nativo nao entrega o runtime', () => {
    // `this` nao existe dentro de uma arrow do interpretador, entao nem um
    // callback passado para um metodo nativo alcanca o contexto de fora.
    const r = tentar('lista.map(x => x * 2)');
    expect(r.valor).toEqual([2, 4]);

    const comThis = tentar('lista.map(x => this)');
    expect(typeof comThis.valor).not.toBe('function');
  });

  it('reviver de JSON.parse nao vaza o objeto dono', () => {
    const r = tentar('JSON.parse(\'{"a":1}\', (k, v) => v)');
    expect(r.valor).toEqual({ a: 1 });
  });
});

describe('o subconjunto seguro continua util', () => {
  const casos: Array<[string, unknown]> = [
    ["Object.keys({ a: 1, b: 2 })", ['a', 'b']],
    ['Object.values({ a: 1, b: 2 })', [1, 2]],
    ["Object.entries({ a: 1 })", [['a', 1]]],
    ["Object.fromEntries([['a', 1]])", { a: 1 }],
    ['Object.is(1, 1)', true],
    ["Object.hasOwn({ a: 1 }, 'a')", true],
    ['Object.assign({}, { a: 1 })', { a: 1 }],
  ];

  for (const [fonte, esperado] of casos) {
    it(`${fonte} continua funcionando`, () => {
      expect(tentar(fonte).valor).toEqual(esperado);
    });
  }
});
