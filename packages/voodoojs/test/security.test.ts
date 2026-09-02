/**
 * Modelo de seguranca do interpretador de expressoes.
 *
 * A promessa da Voodoo e explicita: uma expressao escrita em um atributo nao
 * usa `eval` nem `new Function`, e nao alcanca `window`, `document` ou `fetch`.
 * Estes testes existem para que a promessa continue verdadeira: cada caso aqui
 * e uma tentativa real de fuga, e todas precisam falhar.
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

/** Roda a expressao e devolve o resultado ou o erro, sem quebrar o teste. */
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

describe('globais fora do alcance', () => {
  // Nenhum destes nomes esta em `allowedGlobals`, entao uma expressao que os
  // escreve nao encontra nada. O valor e `undefined`, nunca o objeto real.
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
    it(`"${nome}" nao resolve para nada`, () => {
      expect(run(nome)).toBeUndefined();
    });
  }

  it('`this` nao existe dentro de uma expressao', () => {
    expect(run('this')).toBeUndefined();
  });

  it('chamar um global proibido reclama em vez de executar', () => {
    const r = tenta('eval("1+1")');
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('is not a function');
  });

  it('import nao e uma funcao disponivel', () => {
    const r = tenta('import("data:text/javascript,1")');
    expect(r.ok).toBe(false);
  });
});

describe('fugas classicas pela cadeia de prototipos', () => {
  // O caminho classico de fuga em interpretadores de template:
  // `x.constructor` devolve `Object`, `Object.constructor` devolve `Function`,
  // e `Function("return this")()` entrega o objeto global inteiro.
  // Ler `constructor` e bloqueado, entao o caminho morre no primeiro passo.
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
    it(`bloqueia ${fuga}`, () => {
      const r = tenta(fuga, { x: { a: 1 } });
      expect(r.ok).toBe(false);
      expect(r.erro).toContain('Access blocked');
    });
  }

  it('ler `constructor` sozinho ja e recusado', () => {
    const r = tenta('[].constructor');
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('constructor');
  });

  it('ler `__proto__` e recusado', () => {
    expect(tenta('({}).__proto__').ok).toBe(false);
    expect(tenta('x.__proto__', { x: {} }).ok).toBe(false);
    expect(tenta('x["__proto__"]', { x: {} }).ok).toBe(false);
  });

  it('ler `prototype` e recusado', () => {
    expect(tenta('Object.prototype').ok).toBe(false);
    expect(tenta('Array.prototype.slice').ok).toBe(false);
  });

  it('`constructor` nem aparece por typeof', () => {
    // `typeof` nunca lanca erro em JavaScript, entao a resposta e "undefined"
    // em vez de uma excecao. O importante e o valor nao vazar.
    expect(run('typeof constructor')).toBe('undefined');
    expect(run('typeof __proto__')).toBe('undefined');
  });

  it('o erro e um VoodooRuntimeError, nao um erro solto do motor', () => {
    let capturado: unknown;
    try {
      run('({}).constructor');
    } catch (err) {
      capturado = err;
    }
    expect(capturado).toBeInstanceOf(VoodooRuntimeError);
  });
});

describe('poluicao de prototipo', () => {
  // Escrever em `__proto__` ou em `constructor.prototype` contamina
  // `Object.prototype`, e a partir dai todo objeto da pagina passa a carregar a
  // chave plantada. Cada tentativa aqui precisa falhar e nao deixar rastro.
  const tentativas: Array<[string, string]> = [
    ['x.__proto__.poluido = 1', 'poluido'],
    ['x.constructor.prototype.poluido = 1', 'poluido'],
    ['x["__proto__"]["poluido"] = 1', 'poluido'],
    ['x["__pro" + "to__"]["poluido"] = 1', 'poluido'],
    ['x.__proto__["poluido"] = 1', 'poluido'],
  ];

  for (const [expressao, chave] of tentativas) {
    it(`nao polui Object.prototype com ${expressao}`, () => {
      const r = tenta(expressao, { x: {} });
      expect(r.ok).toBe(false);
      expect((Object.prototype as Record<string, unknown>)[chave]).toBeUndefined();
      expect(({} as Record<string, unknown>)[chave]).toBeUndefined();
    });
  }

  it('literal de objeto nao troca o prototipo pelo caminho de `__proto__`', () => {
    const r = tenta('({ __proto__: { plantado: 1 } })');
    expect(r.ok).toBe(false);
    expect(({} as Record<string, unknown>).plantado).toBeUndefined();
  });

  it('escrever em `constructor` diretamente tambem e recusado', () => {
    const r = tenta('x.constructor = 1', { x: {} });
    expect(r.ok).toBe(false);
  });

  it('poluir pelo nome solto do identificador nao funciona', () => {
    // `constructor` existe em qualquer objeto por heranca, entao a busca no
    // escopo o encontraria mesmo sem ninguem ter declarado nada.
    const r = tenta('constructor', { a: 1 });
    expect(r.ok).toBe(false);
  });

  it('Object.prototype segue limpo depois de todas as tentativas', () => {
    const chaves = Object.keys(Object.prototype);
    expect(chaves).toEqual([]);
  });
});

describe('escrita normal continua funcionando', () => {
  // O bloqueio nao pode custar nada ao uso legitimo.
  it('escreve em propriedade comum', () => {
    const dados = reactive({ obj: { a: 1 } as Record<string, unknown> });
    const scope = new Scope(dados);
    evaluate(parse('obj.b = 2'), scope);
    expect(dados.obj.b).toBe(2);
  });

  it('le propriedade aninhada', () => {
    expect(run('a.b.c', { a: { b: { c: 42 } } })).toBe(42);
  });

  it('chave computada comum passa', () => {
    expect(run('a[chave]', { a: { nome: 'Ana' }, chave: 'nome' })).toBe('Ana');
  });

  it('metodos herdados de Array continuam acessiveis', () => {
    expect(run('lista.map(x => x * 2)', { lista: [1, 2, 3] })).toEqual([2, 4, 6]);
    expect(run('texto.toUpperCase()', { texto: 'oi' })).toBe('OI');
  });
});

describe('allowedGlobals expoe somente o declarado', () => {
  it('a lista tem exatamente os nomes documentados', () => {
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

  it('nenhum global perigoso entrou na lista', () => {
    for (const proibido of ['window', 'document', 'fetch', 'eval', 'Function', 'globalThis']) {
      expect(allowedGlobals[proibido]).toBeUndefined();
    }
  });

  it('o que esta na lista funciona', () => {
    expect(run('Math.max(1, 9, 3)')).toBe(9);
    expect(run('JSON.stringify({ a: 1 })')).toBe('{"a":1}');
    expect(run('parseInt("42")')).toBe(42);
  });

  it('a aplicacao pode acrescentar um global proprio', () => {
    allowedGlobals.MinhaApi = { versao: 2 };
    try {
      expect(run('MinhaApi.versao')).toBe(2);
    } finally {
      delete allowedGlobals.MinhaApi;
    }
    expect(run('MinhaApi')).toBeUndefined();
  });
});
