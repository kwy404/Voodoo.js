/**
 * Text interpolation.
 *
 * The single brace lives alongside text written by people, so it cannot swallow
 * whatever happens to sit between `{` and `}`. The criterion is to parse: what
 * the parser accepts becomes an expression, the rest stays text.
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

describe('single-brace interpolation', () => {
  it('writes the value in the middle of the text', () => {
    const { root } = montar('<p>Ola, { nome }!</p>', { nome: 'Ana' });
    expect(root.querySelector('p')!.textContent).toBe('Ola, Ana!');
  });

  it('accepts an object inside the expression', () => {
    const { root } = montar('<p>{ JSON.stringify({ n: total, ok: true }) }</p>', { total: 3 });
    expect(root.querySelector('p')!.textContent).toBe('{"n":3,"ok":true}');
  });

  it('accepts an expression broken across several lines', () => {
    const { root } = montar(
      `<p>Total: R$ {
         (precos.reduce((s, p) => s + p, 0) * (1 - desconto / 100)).toFixed(2)
       }</p>`,
      { precos: [10, 20, 70], desconto: 10 }
    );
    expect(root.querySelector('p')!.textContent!.trim()).toBe('Total: R$ 90.00');
  });

  it('leaves untouched the text between braces that is not an expression', () => {
    const { root } = montar('<p>Escreva assim: { um texto qualquer } e pronto</p>');
    expect(root.querySelector('p')!.textContent).toBe(
      'Escreva assim: { um texto qualquer } e pronto'
    );
  });

  it('leaves untouched a snippet of CSS pasted into the text', () => {
    const { root } = montar('<p>.botao { color: red; background: blue }</p>');
    expect(root.querySelector('p')!.textContent).toBe('.botao { color: red; background: blue }');
  });

  it('leaves untouched a brace that is never closed', () => {
    const { root } = montar('<p>abre { e nunca fecha</p>');
    expect(root.querySelector('p')!.textContent).toBe('abre { e nunca fecha');
  });

  it('several expressions in the same text node', async () => {
    const { root, estado } = montar('<p>{ a } + { b } = { a + b }</p>', { a: 1, b: 2 });
    expect(root.querySelector('p')!.textContent).toBe('1 + 2 = 3');

    (estado as any).b = 5;
    await settle();
    expect(root.querySelector('p')!.textContent).toBe('1 + 5 = 6');
  });

  it('the double form keeps working', () => {
    const { root } = montar('<p>{{ nome }}</p>', { nome: 'Bia' });
    expect(root.querySelector('p')!.textContent).toBe('Bia');
  });

  it('does not interpolate inside pre, code, script, style and textarea', () => {
    const { root } = montar(
      '<pre>{ nome }</pre><code>{ nome }</code><textarea>{ nome }</textarea>',
      { nome: 'Ana' }
    );
    expect(root.querySelector('pre')!.textContent).toBe('{ nome }');
    expect(root.querySelector('code')!.textContent).toBe('{ nome }');
    expect(root.querySelector('textarea')!.textContent).toBe('{ nome }');
  });

  it('v-ignore protects the whole subtree', () => {
    const { root } = montar('<div v-ignore><p>{ nome }</p></div>', { nome: 'Ana' });
    expect(root.querySelector('p')!.textContent).toBe('{ nome }');
  });

  it('a huge expression stays as text, so it does not swallow the paragraph', () => {
    const enorme = 'a'.repeat(600);
    const { root } = montar(`<p>{ ${enorme} }</p>`);
    expect(root.querySelector('p')!.textContent).toContain('{ aaa');
  });
});
