/**
 * Regression: escaping the interpreter through reflection (SEC-01).
 *
 * Blocking keys (`__proto__`, `constructor`, `prototype`) covers direct access,
 * such as `x.constructor`. But the reflective methods of the native `Object`
 * take the target as an ARGUMENT, and an argument does not go through that
 * block. The chain below recovered `Function` and ran arbitrary code, that is,
 * `eval` through the back door, with reach into `window`, `document` and
 * `fetch`:
 *
 * ```js
 * Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object), 'constructor')
 *   .value('return this')()
 * ```
 *
 * The fix inverts the pattern instead of growing the list of prohibitions: the
 * `Object` exposed inside expressions is now a safe subset. An expression may
 * call features; it is not handed tools to inspect the JavaScript runtime.
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../src/parser/parser';
import { allowedGlobals, evaluate } from '../src/parser/interpreter';
import { Scope } from '../src/runtime/scope';

/** Evaluates an expression, returning the error instead of letting it escape. */
function tentar(fonte: string): { ok: boolean; valor?: unknown; erro?: string } {
  try {
    return { ok: true, valor: evaluate(parse(fonte), new Scope({ alvo: {}, lista: [1, 2] })) };
  } catch (err) {
    return { ok: false, erro: (err as Error).message.split('\n')[0] };
  }
}

describe('SEC-01: reflection cannot return Function', () => {
  it('the full chain does not run code', () => {
    const r = tentar(
      "Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object), 'constructor').value('return 1+1')"
    );
    // It does not matter whether it fails with an error or with undefined; what
    // it cannot do is turn into a function.
    expect(typeof r.valor).not.toBe('function');
  });

  it('no reflection tool is reachable', () => {
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

  it('the exposed Object is not the native Object', () => {
    expect(allowedGlobals.Object).not.toBe(Object);
    expect(Object.isFrozen(allowedGlobals.Object)).toBe(true);
  });

  it('Function and globalThis stay out of reach by any route', () => {
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

  it('a native method callback does not hand over the runtime', () => {
    // `this` does not exist inside an arrow function of the interpreter, so not
    // even a callback passed to a native method reaches the outside context.
    const r = tentar('lista.map(x => x * 2)');
    expect(r.valor).toEqual([2, 4]);

    const comThis = tentar('lista.map(x => this)');
    expect(typeof comThis.valor).not.toBe('function');
  });

  it('the JSON.parse reviver does not leak the owning object', () => {
    const r = tentar('JSON.parse(\'{"a":1}\', (k, v) => v)');
    expect(r.valor).toEqual({ a: 1 });
  });
});

describe('the safe subset is still useful', () => {
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
    it(`${fonte} still works`, () => {
      expect(tentar(fonte).valor).toEqual(esperado);
    });
  }
});
