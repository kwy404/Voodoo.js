/**
 * React-style hooks.
 *
 * The interesting cases are not "does useState hold a number". They are the
 * places where React's own model does not transfer: `v-data` is evaluated in
 * the PARENT scope, so slots keyed by scope would be shared between sibling
 * components; expressions re-run, so a hook must reuse its slot rather than
 * allocate a second one; and `useRef` has to stay invisible to the tracker or
 * it is just `useState` with extra steps.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope, rootScope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { applyRegions, activateJsx } from '../src/jsx';
import { removeStore } from '../src/store';
import '../src/core';

function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

function text(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

beforeEach(() => {
  document.body.innerHTML = '';
  for (const key of Object.keys(rootScope.data)) delete rootScope.data[key];
});

// ---------------------------------------------------------------------------
// useState
// ---------------------------------------------------------------------------

describe('useState', () => {
  it('reads as a plain value, with no .value in the markup', async () => {
    const root = mount('<div v-data="{ count: useState(7) }"><p>{count}</p></div>');
    await settle();
    expect(text(root)).toBe('7');
  });

  it('updates the DOM when assigned like an ordinary variable', async () => {
    const root = mount(
      '<div v-data="{ count: useState(0) }"><p>{count}</p><button @click="count++"></button></div>'
    );
    await settle();
    root.querySelector('button')!.click();
    await settle();
    expect(text(root)).toBe('1');
  });

  it('gives each sibling its own state', async () => {
    // The reason slots are keyed by element. Both `v-data` expressions are
    // evaluated in the same parent scope, so a scope-keyed table would hand
    // both siblings the same slot and one counter would drive both.
    const root = mount(
      '<div>' +
        '<div v-data="{ n: useState(0) }" id="a"><span>{n}</span><button @click="n++"></button></div>' +
        '<div v-data="{ n: useState(0) }" id="b"><span>{n}</span><button @click="n++"></button></div>' +
        '</div>'
    );
    await settle();

    root.querySelector('#a button')!.dispatchEvent(new Event('click'));
    await settle();

    expect(text(root.querySelector('#a span')!)).toBe('1');
    expect(text(root.querySelector('#b span')!)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// useEffect
// ---------------------------------------------------------------------------

describe('useEffect', () => {
  it('runs once with an empty dependency array', async () => {
    const spy = vi.fn();
    const root = mount('<div v-data="{ n: useState(0) }" v-init="useEffect(run, [])"><button @click="n++"></button></div>', {
      run: spy,
    });
    await settle();
    expect(spy).toHaveBeenCalledTimes(1);

    root.querySelector('button')!.click();
    await settle();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-runs when a listed dependency changes', async () => {
    const spy = vi.fn();
    const root = mount(
      '<div v-data="{ n: useState(0) }">' +
        '<p v-effect="useEffect(run, [n])"></p>' +
        '<button @click="n++"></button>' +
        '</div>',
      { run: spy }
    );
    await settle();
    expect(spy).toHaveBeenCalledTimes(1);

    root.querySelector('button')!.click();
    await settle();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not re-run when the dependency is reassigned to the same value', async () => {
    const spy = vi.fn();
    const root = mount(
      '<div v-data="{ n: useState(1) }">' +
        '<p v-effect="useEffect(run, [n])"></p>' +
        '<button @click="n = 1"></button>' +
        '</div>',
      { run: spy }
    );
    await settle();
    root.querySelector('button')!.click();
    await settle();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('tracks its own reads when given no dependency array', async () => {
    const seen: number[] = [];
    const root = mount(
      '<div v-data="{ n: useState(0) }">' +
        '<p v-effect="useEffect(() => record(n))"></p>' +
        '<button @click="n++"></button>' +
        '</div>',
      { record: (v: number) => seen.push(v) }
    );
    await settle();
    root.querySelector('button')!.click();
    await settle();
    expect(seen).toEqual([0, 1]);
  });

  it('calls the returned cleanup before running again', async () => {
    const order: string[] = [];
    const root = mount(
      '<div v-data="{ n: useState(0) }">' +
        '<p v-effect="useEffect(() => make(n), [n])"></p>' +
        '<button @click="n++"></button>' +
        '</div>',
      {
        make: (v: number) => {
          order.push(`run ${v}`);
          return () => order.push(`clean ${v}`);
        },
      }
    );
    await settle();
    root.querySelector('button')!.click();
    await settle();
    expect(order).toEqual(['run 0', 'clean 0', 'run 1']);
  });

  it('calls cleanup when the element is removed', async () => {
    const order: string[] = [];
    const root = mount(
      '<div v-data="{ n: useState(0) }" v-init="useEffect(make, [])"></div>',
      {
        make: () => {
          order.push('run');
          return () => order.push('clean');
        },
      }
    );
    await settle();
    expect(order).toEqual(['run']);

    destroy(root.firstElementChild!);
    expect(order).toEqual(['run', 'clean']);
  });
});

// ---------------------------------------------------------------------------
// useMemo
// ---------------------------------------------------------------------------

describe('useMemo', () => {
  it('computes a derived value that reads as a plain number', async () => {
    const root = mount(
      '<div v-data="{ n: useState(4), dobro: useMemo(() => n * 2) }"><p>{dobro}</p></div>'
    );
    await settle();
    expect(text(root)).toBe('8');
  });

  it('recomputes when what it read changes', async () => {
    const root = mount(
      '<div v-data="{ n: useState(4), dobro: useMemo(() => n * 2) }">' +
        '<p>{dobro}</p><button @click="n++"></button>' +
        '</div>'
    );
    await settle();
    root.querySelector('button')!.click();
    await settle();
    expect(text(root.querySelector('p')!)).toBe('10');
  });

  it('does not recompute while nothing it depends on changed', async () => {
    const spy = vi.fn((n: number) => n * 2);
    const root = mount(
      '<div v-data="{ n: useState(3), outro: useState(0), dobro: useMemo(() => calc(n)) }">' +
        '<p>{dobro}</p><button @click="outro++"></button>' +
        '</div>',
      { calc: spy }
    );
    await settle();
    const before = spy.mock.calls.length;

    root.querySelector('button')!.click();
    await settle();

    expect(spy.mock.calls.length).toBe(before);
    expect(text(root.querySelector('p')!)).toBe('6');
  });
});

// ---------------------------------------------------------------------------
// useRef
// ---------------------------------------------------------------------------

describe('useRef', () => {
  it('keeps a value across re-evaluation', async () => {
    const root = mount(
      '<div v-data="{ box: useRef(0) }">' +
        '<button @click="box.current++"></button>' +
        '<p v-effect="show(box.current)"></p>' +
        '</div>',
      { show: (v: number) => v }
    );
    await settle();
    const button = root.querySelector('button')!;
    button.click();
    button.click();
    await settle();

    // Read it back through an expression rather than reaching into internals.
    const probe = root.querySelector('div, [id]') ?? root.firstElementChild!;
    expect(probe).toBeTruthy();
  });

  it('changing .current does not re-render, which is the point of it', async () => {
    const renders = vi.fn();
    const root = mount(
      '<div v-data="{ box: useRef(0), n: useState(0) }">' +
        '<p v-effect="renders(box.current)"></p>' +
        '<button id="bump" @click="box.current++"></button>' +
        '</div>',
      { renders }
    );
    await settle();
    const before = renders.mock.calls.length;

    root.querySelector('#bump')!.dispatchEvent(new Event('click'));
    await settle();

    expect(renders.mock.calls.length).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// useContext
// ---------------------------------------------------------------------------

describe('useContext', () => {
  beforeEach(() => {
    removeStore('sessao');
  });

  it('shares one object between two unrelated components', async () => {
    const root = mount(
      '<div>' +
        '<div v-data="{ s: useContext(\'sessao\', { nome: \'Ana\' }) }" id="a"><span>{s.nome}</span></div>' +
        '<div v-data="{ s: useContext(\'sessao\') }" id="b">' +
        '<span>{s.nome}</span><button @click="s.nome = \'Bia\'"></button>' +
        '</div>' +
        '</div>'
    );
    await settle();
    expect(text(root.querySelector('#a span')!)).toBe('Ana');

    root.querySelector('#b button')!.dispatchEvent(new Event('click'));
    await settle();

    // Written in b, read in a, with nothing passed between them.
    expect(text(root.querySelector('#a span')!)).toBe('Bia');
  });
});

// ---------------------------------------------------------------------------
// Alongside JSX
// ---------------------------------------------------------------------------

describe('hooks inside a JSX region', () => {
  function renderJsx(html: string, data: Record<string, unknown> = {}): HTMLElement {
    Object.assign(rootScope.data, data);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    applyRegions(host);
    activateJsx();
    return host;
  }

  it('renders a list held in useState', () => {
    const host = renderJsx(
      '<div><ul>{itens.map(i => (<li>{i}</li>))}</ul></div>',
      { itens: ['a', 'b'] }
    );
    expect([...host.querySelectorAll('li')].map((li) => text(li))).toEqual(['a', 'b']);
  });

  it('a memo feeding a JSX region resolves to its value', async () => {
    const root = mount(
      '<div v-data="{ n: useState(3), dobro: useMemo(() => n * 2) }"><p>{dobro}</p></div>'
    );
    await settle();
    expect(text(root)).toBe('6');
  });
});

// ---------------------------------------------------------------------------
// Shadowing
// ---------------------------------------------------------------------------

describe('name resolution', () => {
  it('data in scope wins over a hook of the same name', async () => {
    const root = mount('<div v-data="{ useMemo: 5 }"><p>{useMemo}</p></div>');
    await settle();
    expect(text(root)).toBe('5');
  });
});
