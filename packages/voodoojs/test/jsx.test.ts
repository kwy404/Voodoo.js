/**
 * JSX written directly in ordinary HTML.
 *
 * The thing under test is not a JSX parser. The browser parses the HTML before
 * any of this runs, and what it leaves behind is a run of siblings:
 *
 *   text     "{frutas.map((f) => ("
 *   element  <li>{f}</li>
 *   text     "))}"
 *
 * The module rejoins the text with a placeholder where the element sat and
 * evaluates the result through the ordinary expression pipeline. So the tests
 * that matter are about that reconstruction: does the region end where it
 * should, does a template see the loop variable it was written next to, and
 * does any of it touch text that was never meant for it.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { jsx, activateJsx, applyRegions, readDeclarationBlock } from '../src/jsx';
import { rootScope } from '../src/runtime/scope';
import { Scope } from '../src/runtime/scope';
import { reactive } from '../src/reactivity';

/**
 * Renders `html` with `data` in scope and returns the host element.
 *
 * Two calls, not one, and that mirrors what the bootstrap does around
 * `V.start()`. `applyRegions` takes the templates out of the document, and
 * `activateJsx` creates the effects that render them. They are separate because
 * the templates have to be gone before the core walks the page, and the effects
 * cannot be created until `v-data` has made its scopes.
 *
 * The data goes on the root scope, because a region resolves its names through
 * `findScope` at activation time and the root is what that falls back to. This
 * is the same place the declaration block puts its names.
 */
function render(html: string, data: Record<string, unknown> = {}): HTMLElement {
  Object.assign(rootScope.data, data);
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  applyRegions(host);
  activateJsx();
  return host;
}

/** Collapsed text, so the assertions are not about whitespace. */
function text(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function items(el: Element): string[] {
  return [...el.querySelectorAll('li')].map((li) => text(li));
}

beforeEach(() => {
  document.body.innerHTML = '';
  for (const key of Object.keys(rootScope.data)) delete rootScope.data[key];
});

describe('a conditional that returns an element', () => {
  it('renders the branch that is taken', () => {
    const host = render('<div>{ok ? <p>yes</p> : <p>no</p>}</div>', { ok: true });
    expect(text(host)).toBe('yes');
  });

  it('renders the other branch', () => {
    const host = render('<div>{ok ? <p>yes</p> : <p>no</p>}</div>', { ok: false });
    expect(text(host)).toBe('no');
  });

  it('renders nothing when the expression is falsy', () => {
    // `{ok && <p>x</p>}` yields `false`, which React renders as nothing, and so
    // does this. Printing "false" into the page would be the obvious bug.
    const host = render('<div>{ok && <p>x</p>}</div>', { ok: false });
    expect(text(host)).toBe('');
  });
});

describe('map', () => {
  it('renders one element per item', () => {
    const host = render('<ul>{list.map((x) => (<li>{x}</li>))}</ul>', { list: ['a', 'b', 'c'] });
    expect(items(host)).toEqual(['a', 'b', 'c']);
  });

  it('gives the template the loop variable', () => {
    // The reason `$t` carries the scope it was called in. Without that, the
    // clone renders against the region's scope, where `f` does not exist, and
    // every item comes out as the literal text `{f.nome}`.
    const host = render('<ul>{list.map((f) => (<li>{f.nome}</li>))}</ul>', {
      list: [{ nome: 'ana' }, { nome: 'bo' }],
    });
    expect(items(host)).toEqual(['ana', 'bo']);
  });

  it('reads several fields of the same item', () => {
    const host = render('<ul>{list.map((f) => (<li>{f.a} e {f.b}</li>))}</ul>', {
      list: [{ a: 'x', b: 'y' }],
    });
    expect(items(host)).toEqual(['x e y']);
  });

  it('indexes a nested array', () => {
    const host = render('<ul>{rows.map((r) => (<li>{r[0]} + {r[1]} = {r[0] + r[1]}</li>))}</ul>', {
      rows: [
        [1, 2],
        [3, 4],
      ],
    });
    expect(items(host)).toEqual(['1 + 2 = 3', '3 + 4 = 7']);
  });

  it('chains filter into map', () => {
    const host = render(
      '<ul>{p.filter(x => x.on && x.n > 0).map(x => (<li>{x.name} - {x.n}</li>))}</ul>',
      {
        p: [
          { name: 'a', n: 5, on: true },
          { name: 'b', n: 0, on: true },
          { name: 'c', n: 9, on: false },
          { name: 'd', n: 2, on: true },
        ],
      }
    );
    expect(items(host)).toEqual(['a - 5', 'd - 2']);
  });

  it('renders an empty list as nothing', () => {
    const host = render('<ul>{list.map((x) => (<li>{x}</li>))}</ul>', { list: [] });
    expect(items(host)).toEqual([]);
  });

  it('accepts a destructured parameter', () => {
    const host = render('<ul>{list.map(({ nome }) => (<li>{nome}</li>))}</ul>', {
      list: [{ nome: 'ana' }, { nome: 'bo' }],
    });
    expect(items(host)).toEqual(['ana', 'bo']);
  });
});

describe('what it must never touch', () => {
  it('leaves a script alone', () => {
    // The whole reason `{ ... }` can live in ordinary HTML: a page is full of
    // braces that belong to somebody else.
    const host = render('<div><script>var a = { b: 1 };<\/script></div>');
    expect(host.querySelector('script')!.textContent).toBe('var a = { b: 1 };');
  });

  it('leaves pre and code alone', () => {
    const host = render('<div><pre>function f() { return 1 }</pre></div>');
    expect(text(host.querySelector('pre')!)).toBe('function f() { return 1 }');
  });

  it('leaves plain interpolation to the core renderer', () => {
    // No element inside the braces, so this module does not claim it. The text
    // is left exactly as it was for the core to handle.
    const host = render('<div>Ola, {nome}!</div>', { nome: 'ana' });
    expect(text(host)).toBe('Ola, {nome}!');
  });

  it('leaves an unbalanced brace alone', () => {
    const host = render('<div>a { b <span>c</span></div>');
    expect(text(host)).toBe('a { b c');
  });

  it('does not close on a brace inside a string', () => {
    // `{ label: "}" }` is an ordinary object. Closing the region on that `}`
    // would cut the expression in half and leave the rest in the page.
    const host = render('<ul>{list.map(x => (<li>{x}</li>))}</ul>', { list: ['}'] });
    expect(items(host)).toEqual(['}']);
  });

  it('keeps text that follows the closing brace', () => {
    const host = render('<div>{ok ? <b>x</b> : <b>y</b>} tail</div>', { ok: true });
    expect(text(host)).toBe('x tail');
  });
});

describe('the declaration block', () => {
  it('reads const declarations into state', () => {
    document.body.innerHTML = `{
      const nome = 'ana';
      const n = 2;
    }<h1>x</h1>`;
    const data = readDeclarationBlock(document.body);
    expect(data).toEqual({ nome: 'ana', n: 2 });
  });

  it('removes the block from the page', () => {
    document.body.innerHTML = `{ const a = 1; }<h1>x</h1>`;
    readDeclarationBlock(document.body);
    expect(text(document.body)).toBe('x');
  });

  it('ignores a block with no declaration in it', () => {
    document.body.innerHTML = `{ nothing here }`;
    expect(readDeclarationBlock(document.body)).toBeNull();
  });

  it('puts the names where plain interpolation can see them', () => {
    // The names have to land on the root scope, not on a private one. The core
    // renderer resolves against the root, so a scope of this module's own would
    // leave `<h1>Ola, {nome}!</h1>` reading an undefined name.
    document.body.innerHTML = `{ const nome = 'ana'; }<div id="t">{ok ? <b>{nome}</b> : <b>no</b>}</div>`;
    rootScope.data.ok = true;
    jsx(document.body);
    expect(text(document.getElementById('t')!)).toBe('ana');
  });
});
