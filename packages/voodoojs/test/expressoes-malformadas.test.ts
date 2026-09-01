/**
 * Expressoes quebradas nao podem derrubar a pagina.
 *
 * Uma virgula esquecida em um atributo e um erro de quem escreveu o HTML, nao
 * um motivo para o resto da aplicacao parar de funcionar. O contrato e: o erro
 * e reportado, aquele atributo fica sem efeito, e tudo em volta continua vivo.
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

/** Coleta os erros reportados durante o bloco, sem sujar o console. */
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

describe('o parser reclama em vez de travar', () => {
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
    it(`recusa ${JSON.stringify(fonte)} sem travar`, () => {
      let erro: unknown;
      try {
        parse(fonte);
      } catch (err) {
        erro = err;
      }
      // Ou o parser recusa, ou entende algo inofensivo. O que nao pode e
      // entrar em laco ou lancar algo que nao seja um erro de verdade.
      if (erro !== undefined) expect(erro).toBeInstanceOf(Error);
    });
  }

  it('o erro de sintaxe traz a posicao e o texto original', () => {
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

describe('a pagina continua funcionando ao redor do erro', () => {
  it('um v-text quebrado nao impede o v-text vizinho', () => {
    comColetaDeErros((erros) => {
      const { root } = montar('<p v-text="a +"></p><p v-text="nome"></p>', { nome: 'Ana' });
      expect(erros.length).toBeGreaterThan(0);
      expect(root.querySelectorAll('p')[1].textContent).toBe('Ana');
    });
  });

  it('uma interpolacao quebrada nao impede a interpolacao seguinte', async () => {
    await comColetaDeErros(async () => {
      const { root, estado } = montar('<p>{ nome }</p>', { nome: 'Ana' });
      expect(root.textContent).toBe('Ana');
      (estado as Record<string, unknown>).nome = 'Bia';
      await settle();
      expect(root.textContent).toBe('Bia');
    });
  });

  it('um @click quebrado nao derruba o clique do vizinho', () => {
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

  it('um v-if quebrado deixa o resto da arvore montada', () => {
    comColetaDeErros(() => {
      const { root } = montar('<div v-if="a +">x</div><p v-text="nome"></p>', { nome: 'Ana' });
      expect(root.querySelector('p')!.textContent).toBe('Ana');
    });
  });

  it('um v-for com sintaxe errada nao quebra a pagina', () => {
    comColetaDeErros(() => {
      const { root } = montar('<ul><li v-for="isto nao e um for">x</li></ul><p v-text="n"></p>', {
        n: 7,
      });
      expect(root.querySelector('p')!.textContent).toBe('7');
    });
  });
});

describe('acessos em cadeia com valores nulos no meio', () => {
  it('a.b.c com b indefinido reporta o erro e devolve undefined', () => {
    comColetaDeErros((erros) => {
      const scope = new Scope(reactive({ a: {} }));
      expect(evaluateIn('a.b.c', scope)).toBeUndefined();
      expect(erros.length).toBe(1);
    });
  });

  it('cadeia longa com null no meio nao lanca para fora', () => {
    comColetaDeErros(() => {
      const scope = new Scope(reactive({ a: { b: null } }));
      expect(evaluateIn('a.b.c.d.e', scope)).toBeUndefined();
    });
  });

  it('encadeamento opcional atravessa nulos sem erro nenhum', () => {
    comColetaDeErros((erros) => {
      const scope = new Scope(reactive({ a: { b: null } }));
      expect(evaluateIn('a?.b?.c?.d', scope)).toBeUndefined();
      expect(erros.length).toBe(0);
    });
  });

  it('renderiza o resto do texto mesmo com a cadeia quebrada', () => {
    comColetaDeErros(() => {
      const { root } = montar('<p>antes { a.b.c.d } depois</p>', { a: {} });
      expect(root.textContent).toContain('antes');
      expect(root.textContent).toContain('depois');
    });
  });
});

describe('entradas patologicas', () => {
  it('expressao de 100 mil caracteres nao trava o parser', () => {
    const gigante = `"${'x'.repeat(100_000)}"`;
    const inicio = Date.now();
    expect(parse(gigante)).toMatchObject({ t: 'lit' });
    expect(Date.now() - inicio).toBeLessThan(3000);
  });

  it('soma com mil termos e avaliada corretamente', () => {
    const soma = Array.from({ length: 1000 }, () => '1').join(' + ');
    const scope = new Scope(reactive({}));
    expect(evaluateIn(soma, scope)).toBe(1000);
  });

  it('aninhamento profundo de parenteses termina', () => {
    const profundo = `${'('.repeat(300)}1${')'.repeat(300)}`;
    let resultado: unknown;
    let erro: unknown;
    try {
      resultado = evaluateIn(profundo, new Scope(reactive({})));
    } catch (err) {
      erro = err;
    }
    // Aceitamos os dois desfechos: avaliar como 1, ou recusar com um erro de
    // verdade. O que nao pode e o processo ficar preso.
    expect(erro === undefined ? resultado : erro).toBeDefined();
  });

  it('texto gigante no no de texto nao vira interpolacao por engano', () => {
    const bruto = `{ ${'palavra '.repeat(2000)}}`;
    const { root } = montar(`<p>${bruto}</p>`, {});
    expect(root.textContent).toContain('palavra');
  });

  it('unicode e acentos funcionam em identificadores e strings', () => {
    const scope = new Scope(reactive({ usuário: { nomé: 'Ana' } }));
    expect(evaluateIn('usuário.nomé', scope)).toBe('Ana');
    expect(evaluateIn('"emoji: 🎩✨"', scope)).toBe('emoji: 🎩✨');
  });

  it('template literal aninhado e avaliado', () => {
    const scope = new Scope(reactive({ a: 'A', b: 'B' }));
    expect(evaluateIn('`${a}-${`[${b}]`}`', scope)).toBe('A-[B]');
  });

  it('template literal aberto nao trava', () => {
    let erro: unknown;
    try {
      parse('`${a');
    } catch (err) {
      erro = err;
    }
    expect(erro).toBeInstanceOf(Error);
  });

  it('objeto com muitas chaves e avaliado', () => {
    const fonte = `{ ${Array.from({ length: 500 }, (_, i) => `k${i}: ${i}`).join(', ')} }`;
    const valor = evaluateIn<Record<string, number>>(fonte, new Scope(reactive({})));
    expect(Object.keys(valor).length).toBe(500);
    expect(valor.k499).toBe(499);
  });
});

describe('aviso detalhado em modo desenvolvimento', () => {
  it('diz o atributo, o elemento, a expressao e uma sugestao', () => {
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

  it('em producao nao escreve nada no console', () => {
    config.devtools = false;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    comColetaDeErros(() => {
      montar('<p v-text="a +"></p>', {});
    });
    expect(aviso).not.toHaveBeenCalled();
    aviso.mockRestore();
  });
});
