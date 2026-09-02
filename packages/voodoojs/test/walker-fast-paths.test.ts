/**
 * The walk was made cheaper per element. These tests pin the behaviour those
 * shortcuts are allowed to keep, so a later "optimisation" that quietly changes
 * what the page does fails here instead of in someone's application.
 *
 * What is pinned, and why each one could break:
 *
 *   - Attributes are read through `getAttributeNames()` and filtered by name
 *     before their value is read. A filter that is narrower than what the
 *     attribute parser accepts would silently drop `.prop`, `@`, `:` or
 *     `data-v-` directives.
 *   - `v-for` strips the key attribute from the row template. If the key stopped
 *     being read from the original element first, keyed reuse would break.
 *   - A directive's effect scope is created on demand. A directive that does
 *     create effects must still be stopped when its element leaves.
 *   - Hot classes assign their fields in the constructor instead of declaring
 *     them. The properties must still be ordinary own properties.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import { config } from '../src/runtime/registry';
import { Scope } from '../src/runtime/scope';
import { EffectScope, ReactiveEffect, nextTick, reactive } from '../src/reactivity';
import {
  destroy,
  getEffectScopes,
  originalAttributes,
  readAttr,
  walk,
} from '../src/runtime/walker';

function mount(html: string, data: Record<string, unknown> = {}) {
  const state = reactive(data);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(state));
  return { root, state };
}

const settle = async (): Promise<void> => {
  await nextTick();
  await nextTick();
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  config.cleanAttributes = true;
});

describe('attributes are still all found when the walk reads names first', () => {
  it('binds a `.prop` shorthand, which is not a `v-` or `:` name', async () => {
    const { root } = mount('<input .value="text">', { text: 'written as a property' });
    await settle();
    const input = root.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('written as a property');
  });

  it('binds `@event`, `:attribute` and `data-v-*` forms', async () => {
    const { root, state } = mount(
      '<button @click="count = count + 1" :title="label" data-v-text="label"></button>',
      { count: 0, label: 'ready' }
    );
    await settle();
    const button = root.querySelector('button') as HTMLButtonElement;

    expect(button.getAttribute('title')).toBe('ready');
    expect(button.textContent).toBe('ready');

    button.click();
    await settle();
    expect(state.count).toBe(1);
  });

  it('keeps the original expression readable after cleanup removed it', async () => {
    const { root } = mount('<span v-text="label"></span>', { label: 'hello' });
    await settle();
    const span = root.querySelector('span') as HTMLElement;

    expect(span.hasAttribute('v-text')).toBe(false);
    expect(readAttr(span, 'v-text')).toBe('label');
    expect(originalAttributes(span).get('v-text')).toBe('label');
  });

  it('leaves attributes alone when cleanup is turned off', async () => {
    config.cleanAttributes = false;
    const { root } = mount('<span v-text="label"></span>', { label: 'hello' });
    await settle();
    const span = root.querySelector('span') as HTMLElement;

    expect(span.getAttribute('v-text')).toBe('label');
    expect(span.textContent).toBe('hello');
  });
});

describe('v-for does not carry the key attribute onto its rows', () => {
  for (const keyAttribute of [':key', 'v-bind:key', 'v-key']) {
    it(`drops \`${keyAttribute}\` from the rendered row`, async () => {
      config.cleanAttributes = false;
      const { root } = mount(
        `<ul><li v-for="row in rows" ${keyAttribute}="row.id"><span v-text="row.label"></span></li></ul>`,
        { rows: [{ id: 1, label: 'a' }, { id: 2, label: 'b' }] }
      );
      await settle();

      const rows = Array.from(root.querySelectorAll('li'));
      expect(rows.map((li) => li.textContent)).toEqual(['a', 'b']);
      for (const li of rows) {
        expect(li.hasAttribute(keyAttribute)).toBe(false);
        expect(li.hasAttribute(':key')).toBe(false);
        expect(li.hasAttribute('v-bind:key')).toBe(false);
        expect(li.hasAttribute('v-key')).toBe(false);
      }
    });
  }

  it('still reuses the same element for the same key when the list is reordered', async () => {
    const { root, state } = mount(
      '<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>',
      {
        rows: [
          { id: 1, label: 'one' },
          { id: 2, label: 'two' },
          { id: 3, label: 'three' },
        ],
      }
    );
    await settle();

    const before = Array.from(root.querySelectorAll('li'));
    expect(before.map((li) => li.textContent)).toEqual(['one', 'two', 'three']);

    // Reverse the list. Keys mean the same three elements come back, in the new
    // order, rather than three freshly built ones.
    (state.rows as unknown[]).reverse();
    await settle();

    const after = Array.from(root.querySelectorAll('li'));
    expect(after.map((li) => li.textContent)).toEqual(['three', 'two', 'one']);
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toBe(before[0]);
  });

  it('drops a row whose key left the list and keeps the rest', async () => {
    const { root, state } = mount(
      '<ul><li v-for="row in rows" :key="row.id" v-text="row.label"></li></ul>',
      {
        rows: [
          { id: 1, label: 'one' },
          { id: 2, label: 'two' },
        ],
      }
    );
    await settle();
    const kept = root.querySelectorAll('li')[1];

    state.rows = [{ id: 2, label: 'two' }];
    await settle();

    const rows = Array.from(root.querySelectorAll('li'));
    expect(rows.map((li) => li.textContent)).toEqual(['two']);
    expect(rows[0]).toBe(kept);
  });
});

describe('effect scopes are created only by directives that ask for one', () => {
  it('registers a scope for a directive with an effect, and stops it on destroy', async () => {
    const { root, state } = mount('<span v-text="label"></span>', { label: 'first' });
    await settle();
    const span = root.querySelector('span') as HTMLElement;

    expect(getEffectScopes(span).length).toBeGreaterThan(0);
    expect(span.textContent).toBe('first');

    destroy(span);
    state.label = 'second';
    await settle();

    // The effect is gone, so the text stays where it was.
    expect(span.textContent).toBe('first');
    expect(getEffectScopes(span).length).toBe(0);
  });

  it('registers no scope for a binding that does nothing', async () => {
    const { root } = mount('<span :key="1"></span>');
    await settle();
    const span = root.querySelector('span') as HTMLElement;

    expect(getEffectScopes(span).length).toBe(0);
  });
});

describe('hot classes still expose ordinary own properties', () => {
  const ordinary = (target: object, key: string): PropertyDescriptor | undefined =>
    Object.getOwnPropertyDescriptor(target, key);

  it('a Scope owns every field it declares, writable and enumerable', () => {
    const scope = new Scope({ a: 1 });
    for (const key of ['data', 'parent', 'el', 'refs', 'component', 'provides']) {
      const descriptor = ordinary(scope, key);
      expect(descriptor, key).toBeDefined();
      expect(descriptor!.writable, key).toBe(true);
      expect(descriptor!.enumerable, key).toBe(true);
      expect(descriptor!.configurable, key).toBe(true);
    }
    expect(scope.refs).toEqual({});
    expect(scope.component).toBeNull();
    expect(scope.provides).toBeNull();
    expect(scope.data).toEqual({ a: 1 });
  });

  it('an EffectScope and a ReactiveEffect start with the fields they always had', () => {
    const scope = new EffectScope(true);
    expect(scope.effects).toEqual([]);
    expect(scope.cleanups).toEqual([]);
    expect(scope.children).toEqual([]);
    expect(scope.active).toBe(true);
    expect(scope.parent).toBeUndefined();
    expect(ordinary(scope, 'active')!.enumerable).toBe(true);

    const first = new ReactiveEffect(() => undefined, { lazy: true } as never);
    const second = new ReactiveEffect(() => undefined, { lazy: true } as never);
    expect(second.id).toBe(first.id + 1);
    expect(first.active).toBe(true);
    expect(first.queued).toBe(false);
    expect(first.deps).toEqual([]);
    expect(first.parent).toBeUndefined();
    expect(typeof first.fn).toBe('function');
    expect(ordinary(first, 'deps')!.writable).toBe(true);
  });

  it('a scope built inside another still attaches to it', () => {
    const outer = new EffectScope(true);
    const inner = outer.run(() => new EffectScope())!;
    expect(inner.parent).toBe(outer);
    expect(outer.children).toContain(inner);

    outer.stop();
    expect(inner.active).toBe(false);
  });
});
