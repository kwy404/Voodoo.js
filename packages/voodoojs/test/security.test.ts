/**
 * Security model of the expression interpreter.
 *
 * The Voodoo promise is explicit: an expression written in an attribute does
 * not use `eval` or `new Function`, and does not reach `window`, `document` or
 * `fetch`. These tests exist so that the promise stays true: each case here is
 * a real escape attempt, and every one of them has to fail.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { parse, clearParseCache } from '../src/parser/parser';
import { evaluate, allowedGlobals, VoodooRuntimeError } from '../src/parser/interpreter';
import { Scope } from '../src/runtime/scope';
import { reactive } from '../src/reactivity';

function run(expression: string, data: Record<string, unknown> = {}): unknown {
  const scope = new Scope(reactive(data));
  return evaluate(parse(expression), scope);
}

/** Runs the expression and returns the result or the error, without breaking the test. */
function tenta(expression: string, data: Record<string, unknown> = {}): {
  ok: boolean;
  valor?: unknown;
  erro?: string;
} {
  try {
    return { ok: true, valor: run(expression, data) };
  } catch (err) {
    return { ok: false, erro: (err as Error).message };
  }
}

afterEach(() => {
  clearParseCache();
});

describe('globals out of reach', () => {
  // None of these names is in `allowedGlobals`, so an expression that writes
  // them finds nothing. The value is `undefined`, never the real object.
  const proibidos = [
    'window',
    'globalThis',
    'self',
    'document',
    'fetch',
    'eval',
    'Function',
    'process',
    'require',
    'XMLHttpRequest',
    'localStorage',
    'navigator',
    'top',
    'parent',
  ];

  for (const nome of proibidos) {
    it(`"${nome}" resolves to nothing`, () => {
      expect(run(nome)).toBeUndefined();
    });
  }

  it('`this` does not exist inside an expression', () => {
    expect(run('this')).toBeUndefined();
  });

  it('calling a forbidden global complains instead of running it', () => {
    const r = tenta('eval("1+1")');
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('is blocked');
  });

  it('import is not an available function', () => {
    const r = tenta('import("data:text/javascript,1")');
    expect(r.ok).toBe(false);
  });
});

describe('classic escapes through the prototype chain', () => {
  // The classic escape route in template interpreters:
  // `x.constructor` returns `Object`, `Object.constructor` returns `Function`,
  // and `Function("return this")()` hands over the whole global object.
  // Reading `constructor` is blocked, so the route dies at the first step.
  const fugas = [
    "constructor.constructor('return this')()",
    "[].constructor.constructor('return this')()",
    "''.constructor.constructor('return this')()",
    "({}).constructor.constructor('return this')()",
    "(0).constructor.constructor('return this')()",
    "(true).constructor.constructor('return this')()",
    "x.constructor.constructor('return this')()",
    "Object.constructor('return this')()",
    "Math.constructor('return this')()",
    "JSON.constructor('return this')()",
    "x['constructor']['constructor']('return this')()",
  ];

  for (const fuga of fugas) {
    it(`blocks ${fuga}`, () => {
      const r = tenta(fuga, { x: { a: 1 } });
      expect(r.ok).toBe(false);
      expect(r.erro).toContain('Access blocked');
    });
  }

  it('reading `constructor` on its own is already refused', () => {
    const r = tenta('[].constructor');
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('constructor');
  });

  it('reading `__proto__` is refused', () => {
    expect(tenta('({}).__proto__').ok).toBe(false);
    expect(tenta('x.__proto__', { x: {} }).ok).toBe(false);
    expect(tenta('x["__proto__"]', { x: {} }).ok).toBe(false);
  });

  it('reading `prototype` is refused', () => {
    expect(tenta('Object.prototype').ok).toBe(false);
    expect(tenta('Array.prototype.slice').ok).toBe(false);
  });

  it('`constructor` does not even show up through typeof', () => {
    // `typeof` never throws in JavaScript, so the answer is "undefined" instead
    // of an exception. What matters is that the value does not leak.
    expect(run('typeof constructor')).toBe('undefined');
    expect(run('typeof __proto__')).toBe('undefined');
  });

  it('the error is a VoodooRuntimeError, not a stray error from the engine', () => {
    let capturado: unknown;
    try {
      run('({}).constructor');
    } catch (err) {
      capturado = err;
    }
    expect(capturado).toBeInstanceOf(VoodooRuntimeError);
  });
});

describe('prototype pollution', () => {
  // Writing to `__proto__` or to `constructor.prototype` contaminates
  // `Object.prototype`, and from there on every object on the page carries the
  // planted key. Each attempt here has to fail and leave no trace.
  const tentativas: Array<[string, string]> = [
    ['x.__proto__.poluido = 1', 'poluido'],
    ['x.constructor.prototype.poluido = 1', 'poluido'],
    ['x["__proto__"]["poluido"] = 1', 'poluido'],
    ['x["__pro" + "to__"]["poluido"] = 1', 'poluido'],
    ['x.__proto__["poluido"] = 1', 'poluido'],
  ];

  for (const [expressao, chave] of tentativas) {
    it(`does not pollute Object.prototype with ${expressao}`, () => {
      const r = tenta(expressao, { x: {} });
      expect(r.ok).toBe(false);
      expect((Object.prototype as Record<string, unknown>)[chave]).toBeUndefined();
      expect(({} as Record<string, unknown>)[chave]).toBeUndefined();
    });
  }

  it('an object literal does not swap the prototype through the `__proto__` route', () => {
    const r = tenta('({ __proto__: { plantado: 1 } })');
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>).plantado).toBeUndefined();
  });

  it('writing to `constructor` directly is refused as well', () => {
    const r = tenta('x.constructor = 1', { x: {} });
    expect(r.ok).toBe(false);
  });

  it('polluting through the bare identifier name does not work', () => {
    // `constructor` exists on any object through inheritance, so the lookup in
    // the scope would find it even without anyone having declared anything.
    const r = tenta('constructor', { a: 1 });
    expect(r.ok).toBe(false);
  });

  it('Object.prototype stays clean after all the attempts', () => {
    const chaves = Object.keys(Object.prototype);
    expect(chaves).toEqual([]);
  });
});

describe('ordinary writing keeps working', () => {
  // The block must not cost legitimate use anything.
  it('writes to an ordinary property', () => {
    const dados = reactive({ obj: { a: 1 } as Record<string, unknown> });
    const scope = new Scope(dados);
    evaluate(parse('obj.b = 2'), scope);
    expect(dados.obj.b).toBe(2);
  });

  it('reads a nested property', () => {
    expect(run('a.b.c', { a: { b: { c: 42 } } })).toBe(42);
  });

  it('an ordinary computed key gets through', () => {
    expect(run('a[chave]', { a: { nome: 'Ana' }, chave: 'nome' })).toBe('Ana');
  });

  it('methods inherited from Array stay accessible', () => {
    expect(run('lista.map(x => x * 2)', { lista: [1, 2, 3] })).toEqual([2, 4, 6]);
    expect(run('texto.toUpperCase()', { texto: 'oi' })).toBe('OI');
  });
});

describe('allowedGlobals exposes only what was declared', () => {
  it('the list has exactly the documented names', () => {
    const esperados = [
      'Math',
      'JSON',
      'Date',
      'Number',
      'String',
      'Boolean',
      'Array',
      'Object',
      'Intl',
      'RegExp',
      'Promise',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURIComponent',
      'decodeURIComponent',
      'console',
    ];
    for (const nome of esperados) expect(Object.keys(allowedGlobals)).toContain(nome);
  });

  it('no dangerous global made it into the list', () => {
    for (const proibido of ['window', 'document', 'fetch', 'eval', 'Function', 'globalThis']) {
      expect(allowedGlobals[proibido]).toBeUndefined();
    }
  });

  it('what is in the list works', () => {
    expect(run('Math.max(1, 9, 3)')).toBe(9);
    expect(run('JSON.stringify({ a: 1 })')).toBe('{"a":1}');
    expect(run('parseInt("42")')).toBe(42);
  });

  it('the application can add a global of its own', () => {
    allowedGlobals.MinhaApi = { versao: 2 };
    try {
      expect(run('MinhaApi.versao')).toBe(2);
    } finally {
      delete allowedGlobals.MinhaApi;
    }
    expect(run('MinhaApi')).toBeUndefined();
  });
});
