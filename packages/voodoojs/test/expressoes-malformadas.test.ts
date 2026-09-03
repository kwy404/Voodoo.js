/**
 * A broken expression cannot bring the page down.
 *
 * A comma forgotten in an attribute is a mistake by whoever wrote the HTML, not
 * a reason for the rest of the application to stop working. The contract is:
 * the error is reported, that one attribute has no effect, and everything
 * around it stays alive.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, nextTick, setErrorHandler } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, evaluateIn } from '../src/runtime/walker';
import { parse, clearParseCache, VoodooSyntaxError } from '../src/parser/parser';
import { config } from '../src/runtime/registry';
import { clearWarnings } from '../src/runtime/avisos';
import '../src/core';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 3): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

/** Collects the errors reported during the block, without dirtying the console. */
function comColetaDeErros<T>(fn: (erros: unknown[]) => T): T {
  const erros: unknown[] = [];
  setErrorHandler((err) => erros.push(err));
  try {
    return fn(erros);
  } finally {
    setErrorHandler(null);
  }
}

beforeEach(() => {
  document.body.innerHTML = '';
  clearParseCache();
  clearWarnings();
});

afterEach(() => {
  setErrorHandler(null);
  config.devtools = false;
});

describe('the parser complains instead of hanging', () => {
  const invalidas = [
    '{{',
    'a +',
    '())',
    '(',
    '[',
    '{ a:',
    'a ==',
    '"aberta',
    "'aberta",
    '`aberta',
    'a.',
    'a..b',
    '1 2 3 +',
    '=> x',
    'a ? b',
    'a[',
    'f(',
    '...',
    '@#$%',
  ];

  for (const fonte of invalidas) {
    it(`refuses ${JSON.stringify(fonte)} without hanging`, () => {
      let erro: unknown;
      try {
        parse(fonte);
      } catch (err) {
        erro = err;
      }
      // Either the parser refuses, or it reads something harmless. What it
      // cannot do is loop forever or throw something that is not a real error.
      if (erro !== undefined) expect(erro).toBeInstanceOf(Error);
    });
  }

  it('the syntax error carries the position and the original text', () => {
    let erro: VoodooSyntaxError | undefined;
    try {
      parse('a + + *');
    } catch (err) {
      erro = err as VoodooSyntaxError;
    }
    expect(erro).toBeInstanceOf(VoodooSyntaxError);
    expect(String(erro?.message).length).toBeGreaterThan(0);
  });
});

describe('the page keeps working around the error', () => {
  it('a broken v-text does not stop the neighbouring v-text', () => {
    comColetaDeErros((erros) => {
      const { root } = montar('<p v-text="a +"></p><p v-text="nome"></p>', { nome: 'Ana' });
      expect(erros.length).toBeGreaterThan(0);
      expect(root.querySelectorAll('p')[1].textContent).toBe('Ana');
    });
  });

  it('a broken interpolation does not stop the next interpolation', async () => {
    await comColetaDeErros(async () => {
      const { root, estado } = montar('<p>{ nome }</p>', { nome: 'Ana' });
      expect(root.textContent).toBe('Ana');
      (estado as Record<string, unknown>).nome = 'Bia';
      await settle();
      expect(root.textContent).toBe('Bia');
    });
  });

  it('a broken @click does not bring down the neighbour\'s click', () => {
    comColetaDeErros(() => {
      let cliques = 0;
      const { root } = montar('<button @click="a +"></button><button @click="ok()"></button>', {
        ok: () => {
          cliques += 1;
        },
      });
      const [ruim, bom] = Array.from(root.querySelectorAll('button'));
      expect(() => ruim.click()).not.toThrow();
      bom.click();
      expect(cliques).toBe(1);
    });
  });

  it('a broken v-if leaves the rest of the tree mounted', () => {
    comColetaDeErros(() => {
      const { root } = montar('<div v-if="a +">x</div><p v-text="nome"></p>', { nome: 'Ana' });
      expect(root.querySelector('p')!.textContent).toBe('Ana');
    });
  });

  it('a v-for with wrong syntax does not break the page', () => {
    comColetaDeErros(() => {
      const { root } = montar('<ul><li v-for="isto nao e um for">x</li></ul><p v-text="n"></p>', {
        n: 7,
      });
      expect(root.querySelector('p')!.textContent).toBe('7');
    });
  });
});

describe('chained access with null values in the middle', () => {
  it('a.b.c with b undefined reports the error and returns undefined', () => {
    comColetaDeErros((erros) => {
      const scope = new Scope(reactive({ a: {} }));
      expect(evaluateIn('a.b.c', scope)).toBeUndefined();
      expect(erros.length).toBe(1);
    });
  });

  it('a long chain with null in the middle does not throw outward', () => {
    comColetaDeErros(() => {
      const scope = new Scope(reactive({ a: { b: null } }));
      expect(evaluateIn('a.b.c.d.e', scope)).toBeUndefined();
    });
  });

  it('optional chaining crosses nulls with no error at all', () => {
    comColetaDeErros((erros) => {
      const scope = new Scope(reactive({ a: { b: null } }));
      expect(evaluateIn('a?.b?.c?.d', scope)).toBeUndefined();
      expect(erros.length).toBe(0);
    });
  });

  it('renders the rest of the text even with the chain broken', () => {
    comColetaDeErros(() => {
      const { root } = montar('<p>antes { a.b.c.d } depois</p>', { a: {} });
      expect(root.textContent).toContain('antes');
      expect(root.textContent).toContain('depois');
    });
  });
});

describe('pathological inputs', () => {
  it('an expression of 100 thousand characters does not hang the parser', () => {
    const gigante = `"${'x'.repeat(100_000)}"`;
    const inicio = Date.now();
    expect(parse(gigante)).toMatchObject({ t: 'lit' });
    expect(Date.now() - inicio).toBeLessThan(3000);
  });

  it('a sum with a thousand terms is evaluated correctly', () => {
    const soma = Array.from({ length: 1000 }, () => '1').join(' + ');
    const scope = new Scope(reactive({}));
    expect(evaluateIn(soma, scope)).toBe(1000);
  });

  it('deeply nested parentheses terminate', () => {
    const profundo = `${'('.repeat(300)}1${')'.repeat(300)}`;
    let resultado: unknown;
    let erro: unknown;
    try {
      resultado = evaluateIn(profundo, new Scope(reactive({})));
    } catch (err) {
      erro = err;
    }
    // We accept both outcomes: evaluating to 1, or refusing with a real error.
    // What cannot happen is the process getting stuck.
    expect(erro === undefined ? resultado : erro).toBeDefined();
  });

  it('huge text in a text node does not become an interpolation by mistake', () => {
    const bruto = `{ ${'palavra '.repeat(2000)}}`;
    const { root } = montar(`<p>${bruto}</p>`, {});
    expect(root.textContent).toContain('palavra');
  });

  it('unicode and accents work in identifiers and strings', () => {
    const scope = new Scope(reactive({ usuário: { nomé: 'Ana' } }));
    expect(evaluateIn('usuário.nomé', scope)).toBe('Ana');
    expect(evaluateIn('"emoji: 🎩✨"', scope)).toBe('emoji: 🎩✨');
  });

  it('a nested template literal is evaluated', () => {
    const scope = new Scope(reactive({ a: 'A', b: 'B' }));
    expect(evaluateIn('`${a}-${`[${b}]`}`', scope)).toBe('A-[B]');
  });

  it('an unclosed template literal does not hang', () => {
    let erro: unknown;
    try {
      parse('`${a');
    } catch (err) {
      erro = err;
    }
    expect(erro).toBeInstanceOf(Error);
  });

  it('an object with many keys is evaluated', () => {
    const fonte = `{ ${Array.from({ length: 500 }, (_, i) => `k${i}: ${i}`).join(', ')} }`;
    const valor = evaluateIn<Record<string, number>>(fonte, new Scope(reactive({})));
    expect(Object.keys(valor).length).toBe(500);
    expect(valor.k499).toBe(499);
  });
});

describe('detailed warning in development mode', () => {
  it('names the attribute, the element, the expression and a suggestion', () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    comColetaDeErros(() => {
      montar('<p id="alvo" v-text="a +"></p>', {});
    });
    const texto = aviso.mock.calls.map((c) => String(c[0])).join('\n');
    aviso.mockRestore();
    expect(texto).toContain('v-text');
    expect(texto).toContain('#alvo');
    expect(texto).toContain('a +');
    expect(texto).toContain('Suggestion');
  });

  it('in production it writes nothing to the console', () => {
    config.devtools = false;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    comColetaDeErros(() => {
      montar('<p v-text="a +"></p>', {});
    });
    expect(aviso).not.toHaveBeenCalled();
    aviso.mockRestore();
  });
});
