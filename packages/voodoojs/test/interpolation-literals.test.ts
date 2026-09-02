/**
 * Regression: single-brace interpolation used to delete prose.
 *
 * `{ count }` and `{ chaves }` are indistinguishable to the parser: both are one
 * valid identifier. Since an unknown name evaluates to undefined and undefined
 * stringifies to nothing, a paragraph reading `use { chaves } assim` rendered as
 * `use  assim`. The word was gone, with no error anywhere, and `\frac{1}{2}`
 * lost its braces the same way.
 *
 * Two cases now fall back to the literal text, single braces only: a bare
 * identifier that resolves nowhere, and a lone literal such as `{1}`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import { destroy, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';

/** Renders a fragment inside a scope and returns the resulting text. */
async function render(html: string, data = '{ count: 7 }'): Promise<string> {
  const host = document.createElement('div');
  host.setAttribute('v-data', data);
  host.innerHTML = html;
  document.body.appendChild(host);
  walk(host, rootScope);
  await nextTick();
  return (host.firstElementChild?.textContent ?? '').trim();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  destroy(document.body);
  document.body.innerHTML = '';
});

describe('prose keeps its braces', () => {
  it('an unknown word is not swallowed', async () => {
    expect(await render('<p>use { chaves } assim</p>')).toBe('use { chaves } assim');
  });

  it('a lone unknown word survives', async () => {
    expect(await render('<p>{ palavra }</p>')).toBe('{ palavra }');
  });

  it('LaTeX keeps its numeric groups', async () => {
    expect(await render('<p>\\frac{1}{2}</p>')).toBe('\\frac{1}{2}');
  });

  it('a lone literal is not treated as interpolation', async () => {
    expect(await render('<p>{42}</p>')).toBe('{42}');
    expect(await render("<p>{'texto'}</p>")).toBe("{'texto'}");
  });
});

describe('real interpolation still works', () => {
  it('a name in scope renders its value', async () => {
    expect(await render('<p>{ count }</p>')).toBe('7');
  });

  it('an expression renders its result', async () => {
    expect(await render('<p>{ count * 2 }</p>')).toBe('14');
  });

  it('a member access renders', async () => {
    expect(await render('<p>{ user.name }</p>', "{ user: { name: 'ana' } }")).toBe('ana');
  });

  it('a defined name that holds undefined still renders empty', async () => {
    // The name resolves, so the author meant to interpolate it. Only names that
    // resolve nowhere fall back to the literal.
    expect(await render('<p>[{ missing }]</p>', '{ missing: undefined }')).toBe('[]');
  });

  it('mixing prose and interpolation keeps both', async () => {
    expect(await render('<p>tem { count } itens e { chaves } aqui</p>')).toBe(
      'tem 7 itens e { chaves } aqui'
    );
  });
});

describe('the explicit double-brace form is untouched', () => {
  it('renders its value', async () => {
    expect(await render('<p>{{ count }}</p>')).toBe('7');
  });

  it('an unknown name renders empty, because the author asked explicitly', async () => {
    expect(await render('<p>[{{ unknown }}]</p>')).toBe('[]');
  });
});

describe('content that only looks like interpolation', () => {
  const cases: Array<[string, string]> = [
    ['a CSS rule', '.btn { color: red }'],
    ['a CSS custom property', 'a { --v-primary: #6D3BF5 }'],
    ['a media query', '@media (min-width: 700px) { .a { color: red } }'],
    ['JSON', '{ "name": "ana" }'],
    ['an unclosed brace', 'abre { e nunca fecha'],
    ['empty braces', 'vazio {} aqui'],
  ];

  for (const [name, text] of cases) {
    it(`${name} is left alone`, async () => {
      expect(await render(`<p>${text}</p>`)).toBe(text);
    });
  }
});
