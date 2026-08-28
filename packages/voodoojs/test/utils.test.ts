import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  capitalize,
  chunk,
  clone,
  debounce,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatFileSize,
  formatNumber,
  get,
  groupBy,
  memoize,
  merge,
  once,
  parseDuration,
  random,
  relativeTime,
  set,
  slugify,
  sortBy,
  throttle,
  titleCase,
  truncate,
  unique,
  uuid,
} from '../src/utils';

describe('parseDuration', () => {
  it('entende numeros e sufixos', () => {
    expect(parseDuration(300)).toBe(300);
    expect(parseDuration('300')).toBe(300);
    expect(parseDuration('300ms')).toBe(300);
    expect(parseDuration('1.5s')).toBe(1500);
    expect(parseDuration('2m')).toBe(120_000);
    expect(parseDuration('1h')).toBe(3_600_000);
  });

  it('usa o valor padrao quando a entrada e invalida', () => {
    expect(parseDuration(undefined, 99)).toBe(99);
    expect(parseDuration('abc', 42)).toBe(42);
  });
});

describe('debounce e throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounce executa apenas na ultima chamada', () => {
    const spy = vi.fn();
    const fn = debounce(spy, 100);
    fn();
    fn();
    fn();
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('debounce pode ser cancelado', () => {
    const spy = vi.fn();
    const fn = debounce(spy, 100);
    fn();
    fn.cancel();
    vi.advanceTimersByTime(200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('throttle limita a frequencia', () => {
    const spy = vi.fn();
    const fn = throttle(spy, 100);
    fn();
    fn();
    fn();
    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('once e memoize', () => {
  it('once executa uma unica vez', () => {
    const spy = vi.fn(() => 7);
    const fn = once(spy);
    expect(fn()).toBe(7);
    expect(fn()).toBe(7);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('memoize guarda por argumento', () => {
    const spy = vi.fn((n: number) => n * 2);
    const fn = memoize(spy);
    expect(fn(2)).toBe(4);
    expect(fn(2)).toBe(4);
    expect(fn(3)).toBe(6);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('objetos e arrays', () => {
  it('clone faz copia profunda', () => {
    const original = { a: { b: [1, 2] } };
    const copia = clone(original);
    copia.a.b.push(3);
    expect(original.a.b).toEqual([1, 2]);
  });

  it('merge combina em profundidade', () => {
    const alvo = { a: 1, nested: { x: 1, y: 2 } };
    merge(alvo, { nested: { y: 9, z: 3 } } as never);
    expect(alvo).toEqual({ a: 1, nested: { x: 1, y: 9, z: 3 } });
  });

  it('groupBy agrupa por chave e por funcao', () => {
    const lista = [
      { tipo: 'a', n: 1 },
      { tipo: 'b', n: 2 },
      { tipo: 'a', n: 3 },
    ];
    expect(Object.keys(groupBy(lista, 'tipo'))).toEqual(['a', 'b']);
    expect(groupBy(lista, (i) => i.tipo).a.length).toBe(2);
  });

  it('unique remove duplicados', () => {
    expect(unique([1, 1, 2])).toEqual([1, 2]);
    expect(unique([{ id: 1 }, { id: 1 }, { id: 2 }], 'id').length).toBe(2);
  });

  it('chunk divide em blocos', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('sortBy ordena sem alterar o original', () => {
    const lista = [{ n: 3 }, { n: 1 }, { n: 2 }];
    const ordenada = sortBy(lista, 'n');
    expect(ordenada.map((i) => i.n)).toEqual([1, 2, 3]);
    expect(lista[0].n).toBe(3);
    expect(sortBy(lista, 'n', 'desc').map((i) => i.n)).toEqual([3, 2, 1]);
  });

  it('get e set trabalham com caminhos', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(get(obj, 'a.b.c')).toBe(1);
    expect(get(obj, 'a.x.y', 'padrao')).toBe('padrao');
    set(obj, 'a.b.d', 5);
    expect((obj as any).a.b.d).toBe(5);
  });

  it('random fica dentro do intervalo', () => {
    for (let i = 0; i < 50; i++) {
      const n = random(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });
});

describe('strings', () => {
  it('slugify remove acentos e simbolos', () => {
    expect(slugify('Meu Produto Legal')).toBe('meu-produto-legal');
    expect(slugify('Ação & Reação')).toBe('acao-reacao');
  });

  it('truncate corta e adiciona reticencias', () => {
    expect(truncate('abcdefghij', 5)).toBe('ab...');
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('capitalize e titleCase', () => {
    expect(capitalize('voodoo')).toBe('Voodoo');
    expect(titleCase('javascript feels like magic')).toBe('Javascript Feels Like Magic');
  });

  it('escapeHtml neutraliza tags', () => {
    expect(escapeHtml('<img onerror="x">')).toBe('&lt;img onerror=&quot;x&quot;&gt;');
  });
});

describe('formatadores', () => {
  it('formatCurrency usa o locale', () => {
    const texto = formatCurrency(1234.5, { locale: 'pt-BR', currency: 'BRL' });
    expect(texto).toContain('1.234,50');
  });

  it('formatNumber respeita as casas decimais', () => {
    expect(formatNumber(1234.567, { locale: 'pt-BR', maximumFractionDigits: 2 })).toBe('1.234,57');
  });

  it('formatDate aceita preset e mascara', () => {
    const data = new Date(2026, 0, 15, 14, 30);
    expect(formatDate(data, 'DD/MM/YYYY')).toBe('15/01/2026');
    expect(formatDate(data, 'HH:mm')).toBe('14:30');
  });

  it('relativeTime devolve texto relativo', () => {
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60_000);
    expect(relativeTime(cincoMinutosAtras, 'pt-BR')).toMatch(/5 min/);
  });

  it('formatFileSize converte bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1_048_576)).toBe('1.0 MB');
  });
});

describe('uuid', () => {
  it('gera identificadores unicos no formato v4', () => {
    const a = uuid();
    const b = uuid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
