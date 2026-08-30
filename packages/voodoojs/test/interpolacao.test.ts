/**
 * Interpolacao de texto.
 *
 * A chave simples convive com texto escrito por gente, entao ela nao pode
 * engolir qualquer coisa entre `{` e `}`. O criterio e analisar: o que o parser
 * aceita vira expressao, o resto continua sendo texto.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 3) {
  for (let i = 0; i < n; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('interpolacao de chave simples', () => {
  it('escreve o valor no meio do texto', () => {
    const { root } = montar('<p>Ola, { nome }!</p>', { nome: 'Ana' });
    expect(root.querySelector('p')!.textContent).toBe('Ola, Ana!');
  });

  it('aceita objeto dentro da expressao', () => {
    const { root } = montar('<p>{ JSON.stringify({ n: total, ok: true }) }</p>', { total: 3 });
    expect(root.querySelector('p')!.textContent).toBe('{"n":3,"ok":true}');
  });

  it('aceita a expressao quebrada em varias linhas', () => {
    const { root } = montar(
      `<p>Total: R$ {
         (precos.reduce((s, p) => s + p, 0) * (1 - desconto / 100)).toFixed(2)
       }</p>`,
      { precos: [10, 20, 70], desconto: 10 }
    );
    expect(root.querySelector('p')!.textContent!.trim()).toBe('Total: R$ 90.00');
  });

  it('deixa intacto o texto entre chaves que nao e expressao', () => {
    const { root } = montar('<p>Escreva assim: { um texto qualquer } e pronto</p>');
    expect(root.querySelector('p')!.textContent).toBe(
      'Escreva assim: { um texto qualquer } e pronto'
    );
  });

  it('deixa intacto um trecho de CSS colado no texto', () => {
    const { root } = montar('<p>.botao { color: red; background: blue }</p>');
    expect(root.querySelector('p')!.textContent).toBe('.botao { color: red; background: blue }');
  });

  it('deixa intacta uma chave sem fechamento', () => {
    const { root } = montar('<p>abre { e nunca fecha</p>');
    expect(root.querySelector('p')!.textContent).toBe('abre { e nunca fecha');
  });

  it('varias expressoes no mesmo no de texto', async () => {
    const { root, estado } = montar('<p>{ a } + { b } = { a + b }</p>', { a: 1, b: 2 });
    expect(root.querySelector('p')!.textContent).toBe('1 + 2 = 3');

    (estado as any).b = 5;
    await settle();
    expect(root.querySelector('p')!.textContent).toBe('1 + 5 = 6');
  });

  it('a forma dupla continua funcionando', () => {
    const { root } = montar('<p>{{ nome }}</p>', { nome: 'Bia' });
    expect(root.querySelector('p')!.textContent).toBe('Bia');
  });

  it('nao interpola dentro de pre, code, script, style e textarea', () => {
    const { root } = montar(
      '<pre>{ nome }</pre><code>{ nome }</code><textarea>{ nome }</textarea>',
      { nome: 'Ana' }
    );
    expect(root.querySelector('pre')!.textContent).toBe('{ nome }');
    expect(root.querySelector('code')!.textContent).toBe('{ nome }');
    expect(root.querySelector('textarea')!.textContent).toBe('{ nome }');
  });

  it('v-ignore protege a subarvore inteira', () => {
    const { root } = montar('<div v-ignore><p>{ nome }</p></div>', { nome: 'Ana' });
    expect(root.querySelector('p')!.textContent).toBe('{ nome }');
  });

  it('expressao gigante fica como texto, para nao engolir o paragrafo', () => {
    const enorme = 'a'.repeat(600);
    const { root } = montar(`<p>{ ${enorme} }</p>`);
    expect(root.querySelector('p')!.textContent).toContain('{ aaa');
  });
});
