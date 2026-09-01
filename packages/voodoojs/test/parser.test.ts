import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser/parser';
import { evaluate, allowedGlobals } from '../src/parser/interpreter';
import { tokenize, VoodooSyntaxError } from '../src/parser/lexer';
import { Scope } from '../src/runtime/scope';
import { reactive } from '../src/reactivity';

function run(expression: string, data: Record<string, unknown> = {}): unknown {
  const scope = new Scope(reactive(data));
  return evaluate(parse(expression), scope);
}

describe('lexer', () => {
  it('recognizes numbers, strings and identifiers', () => {
    const tokens = tokenize('count + 1.5 + "oi"');
    expect(tokens.map((t) => t.type)).toEqual([
      'ident',
      'punct',
      'num',
      'punct',
      'str',
      'eof',
    ]);
  });

  it('accepts accents in identifiers', () => {
    const tokens = tokenize('usuário');
    expect(tokens[0]).toMatchObject({ type: 'ident', value: 'usuário' });
  });

  it('complains about unclosed string', () => {
    expect(() => tokenize('"aberta')).toThrow(VoodooSyntaxError);
  });
});

describe('literals', () => {
  it('numbers, strings and booleans', () => {
    expect(run('42')).toBe(42);
    expect(run('0x1f')).toBe(31);
    expect(run('1_000')).toBe(1000);
    expect(run('"texto"')).toBe('texto');
    expect(run('true')).toBe(true);
    expect(run('null')).toBe(null);
    expect(run('undefined')).toBe(undefined);
  });

  it('arrays and objects', () => {
    expect(run('[1, 2, 3]')).toEqual([1, 2, 3]);
    expect(run('{ a: 1, b: "dois" }')).toEqual({ a: 1, b: 'dois' });
    expect(run('{ count }', { count: 9 })).toEqual({ count: 9 });
    expect(run('[...lista, 3]', { lista: [1, 2] })).toEqual([1, 2, 3]);
    expect(run('{ ...base, b: 2 }', { base: { a: 1 } })).toEqual({ a: 1, b: 2 });
  });

  it('template literal with interpolation', () => {
    expect(run('`Ola, ${nome}!`', { nome: 'Ana' })).toBe('Ola, Ana!');
    expect(run('`${a + b}`', { a: 1, b: 2 })).toBe('3');
  });
});

describe('operators', () => {
  it('arithmetic with correct precedence', () => {
    expect(run('2 + 3 * 4')).toBe(14);
    expect(run('(2 + 3) * 4')).toBe(20);
    expect(run('10 % 3')).toBe(1);
    expect(run('2 ** 3 ** 2')).toBe(512);
    expect(run('-5 + 3')).toBe(-2);
  });

  it('comparison and logic', () => {
    expect(run('1 < 2 && 3 > 2')).toBe(true);
    expect(run('1 === 1')).toBe(true);
    expect(run('1 !== 2')).toBe(true);
    expect(run('false || "padrao"')).toBe('padrao');
    expect(run('null ?? "padrao"')).toBe('padrao');
    expect(run('0 ?? "padrao"')).toBe(0);
    expect(run('!vazio', { vazio: false })).toBe(true);
  });

  it('ternary', () => {
    expect(run('logado ? "sim" : "nao"', { logado: true })).toBe('sim');
    expect(run('n > 5 ? n : 5', { n: 2 })).toBe(5);
  });

  it('short-circuit evaluation protects right side', () => {
    expect(run('user && user.nome', { user: null })).toBe(null);
  });
});

describe('member access', () => {
  it('dot and bracket notation', () => {
    expect(run('user.nome', { user: { nome: 'Ana' } })).toBe('Ana');
    expect(run('lista[1]', { lista: ['a', 'b'] })).toBe('b');
    expect(run('obj[chave]', { obj: { x: 10 }, chave: 'x' })).toBe(10);
  });

  it('optional chaining', () => {
    expect(run('user?.perfil?.nome', { user: null })).toBe(undefined);
    expect(run('user?.perfil?.nome', { user: { perfil: { nome: 'Bia' } } })).toBe('Bia');
    expect(run('fn?.()', {})).toBe(undefined);
  });

  it('throws clear error when accessing property of null', () => {
    expect(() => run('user.nome', { user: null })).toThrow(/null/);
  });
});

describe('function calls', () => {
  it('calls scope function with correct this', () => {
    const data = {
      count: 1,
      increment(this: { count: number }) {
        this.count++;
        return this.count;
      },
    };
    expect(run('increment()', data)).toBe(2);
  });

  it('calls array and string methods', () => {
    expect(run('lista.filter(n => n > 1)', { lista: [1, 2, 3] })).toEqual([2, 3]);
    expect(run('lista.map(n => n * 2).join("-")', { lista: [1, 2] })).toBe('2-4');
    expect(run('texto.toUpperCase()', { texto: 'oi' })).toBe('OI');
  });

  it('uses allowed globals', () => {
    expect(run('Math.max(1, 5)')).toBe(5);
    expect(run('JSON.stringify({ a: 1 })')).toBe('{"a":1}');
    expect(run('Number("42")')).toBe(42);
  });

  it('does not see globals outside the list', () => {
    expect(run('window')).toBe(undefined);
    expect(run('document')).toBe(undefined);
    expect(run('fetch')).toBe(undefined);
    expect(run('eval')).toBe(undefined);
    expect(run('globalThis')).toBe(undefined);
  });

  it('allows extending the globals list', () => {
    allowedGlobals.MinhaLib = { versao: '1.0' };
    expect(run('MinhaLib.versao')).toBe('1.0');
    delete allowedGlobals.MinhaLib;
  });
});

describe('assignment', () => {
  it('writes to scope variables', () => {
    const data = reactive({ count: 0 });
    const scope = new Scope(data);
    evaluate(parse('count = 5'), scope);
    expect(data.count).toBe(5);
  });

  it('supports compound operators and increment', () => {
    const data = reactive({ n: 1 });
    const scope = new Scope(data);
    evaluate(parse('n += 4'), scope);
    expect(data.n).toBe(5);
    evaluate(parse('n++'), scope);
    expect(data.n).toBe(6);
    evaluate(parse('--n'), scope);
    expect(data.n).toBe(5);
  });

  it('writes to nested properties', () => {
    const data = reactive({ form: { email: '' } });
    const scope = new Scope(data);
    evaluate(parse('form.email = "a@b.com"'), scope);
    expect(data.form.email).toBe('a@b.com');
  });

  it('executes multiple statements separated by semicolon', () => {
    const data = reactive({ a: 0, b: 0 });
    const scope = new Scope(data);
    evaluate(parse('a = 1; b = 2'), scope);
    expect(data).toMatchObject({ a: 1, b: 2 });
  });
});

describe('arrow functions', () => {
  it('with one and several parameters', () => {
    expect(run('lista.reduce((total, n) => total + n, 0)', { lista: [1, 2, 3] })).toBe(6);
    expect(run('dobrar(3)', { dobrar: (n: number) => n * 2 })).toBe(6);
  });

  it('sees the outer scope', () => {
    expect(run('lista.filter(n => n > minimo)', { lista: [1, 5, 9], minimo: 4 })).toEqual([5, 9]);
  });
});

describe('scope chain', () => {
  it('reads from parent scope', () => {
    const parent = new Scope(reactive({ titulo: 'Voodoo' }));
    const child = parent.child({ item: 'x' });
    expect(evaluate(parse('titulo + item'), child)).toBe('Voodoox');
  });

  it('writes to the scope that owns the variable', () => {
    const parentData = reactive({ count: 0 });
    const parent = new Scope(parentData);
    const child = parent.child({ item: 'x' });
    evaluate(parse('count = 10'), child);
    expect(parentData.count).toBe(10);
    expect('count' in (child.data as object)).toBe(false);
  });
});

describe('syntax errors', () => {
  it('points to the problem position', () => {
    expect(() => parse('count +')).toThrow(VoodooSyntaxError);
    expect(() => parse('a b c')).not.toThrow();
  });
});
