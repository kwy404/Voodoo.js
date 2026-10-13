/**
 * Regression: a bound `true` became an empty attribute everywhere.
 *
 * `:data-on="isOn(index)"` wrote `data-on=""`, so none of the ready-made
 * components' `[data-...="true"]` rules ever matched: `v-rating value="4"`
 * showed five empty stars, a field with an error never looked like one, a
 * striped table was plain. The `="false"` rules could not match either, since
 * a bound `false` removes the attribute, so `v-divider` without a label drew a
 * gap in its line and an unclosable `v-tag` kept the padding of its missing
 * button.
 *
 * ARIA had the same problem with worse consequences: `:aria-expanded="open"`
 * wrote `""` when open and removed the attribute when closed, and an absent
 * `aria-expanded` says the control does not expand at all.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';
import '../src/ui/components';

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

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a bound boolean', () => {
  it('writes "true" on a data attribute, so [data-x="true"] matches', () => {
    const root = mount('<div id="t" :data-on="yes"></div>', { yes: true });
    expect(root.querySelector('#t')!.getAttribute('data-on')).toBe('true');
  });

  it('still removes a data attribute for false', () => {
    const root = mount('<div id="t" :data-on="no"></div>', { no: false });
    expect(root.querySelector('#t')!.hasAttribute('data-on')).toBe(false);
  });

  it('writes "true" and "false" on an ARIA state', async () => {
    const state = reactive({ open: true });
    const root = document.createElement('div');
    root.innerHTML = '<button id="b" :aria-expanded="open"></button>';
    document.body.appendChild(root);
    walk(root, new Scope(state));
    const button = root.querySelector('#b')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');

    state.open = false;
    await settle();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves real boolean attributes as they were', () => {
    const root = mount('<button id="b" :disabled="yes"></button>', { yes: true });
    expect(root.querySelector('#b')!.getAttribute('disabled')).toBe('');
  });

  it('leaves any other attribute as it was', () => {
    const root = mount('<div id="t" :title="yes"></div>', { yes: true });
    expect(root.querySelector('#t')!.getAttribute('title')).toBe('');
  });
});

describe('the ready-made components their stylesheet can now see', () => {
  it('v-rating marks the stars that are on', async () => {
    const root = mount('<v-rating value="4"></v-rating>');
    await settle();
    const on = [...root.querySelectorAll('.v-star')].map((star) => star.getAttribute('data-on'));
    expect(on).toEqual(['true', 'true', 'true', 'true', null]);
  });

  it('v-input says it has an error in a way [data-error="true"] matches', async () => {
    const root = mount('<v-input label="Email" error="Required"></v-input>');
    await settle();
    expect(root.querySelector('[data-error="true"]')).not.toBeNull();
  });

  it('v-divider without a label is marked so its second line can hide', async () => {
    const root = mount('<v-divider></v-divider><v-divider label="or"></v-divider>');
    await settle();
    const [plain, labelled] = [...root.querySelectorAll('.v-divider')];
    expect(plain.matches(':not([data-label="true"])')).toBe(true);
    expect(labelled.getAttribute('data-label')).toBe('true');
  });
});
