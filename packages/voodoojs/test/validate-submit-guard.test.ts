/**
 * Regression: `v-validate` on a form without `v-submit` let invalid data through.
 *
 * The directive sets `noValidate`, which turns the browser's own check off, and
 * only `v-submit` validated before acting. So `<form v-validate
 * @submit.prevent="save()">` called `save()` with every required field empty,
 * and showed no message at all. The guard holds the submit, validates, and lets
 * it through only once the form is valid.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import '../src/core';
import '../src/directives/forms';

let root: HTMLElement;

function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

/** Validation is asynchronous: rules are awaited, then the submit is replayed a task later. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
  }
}

const FORM = `
  <form v-validate v-data="{ sent: 0 }" @submit.prevent="sent++">
    <input name="email" v-required v-email>
    <button type="submit">Send</button>
    <p id="sent">{ sent }</p>
  </form>`;

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  if (root) destroy(root);
});

describe('v-validate holds the submit of an invalid form', () => {
  it('does not run @submit while a required field is empty, and shows why', async () => {
    const host = mount(FORM);
    const form = host.querySelector('form')!;
    const input = host.querySelector('input')!;
    const invalid = vi.fn();
    form.addEventListener('voodoo:invalid', invalid);

    form.requestSubmit();
    await settle();

    expect(host.querySelector('#sent')!.textContent).toBe('0');
    expect(input.classList.contains('v-invalid')).toBe(true);
    expect(invalid).toHaveBeenCalledTimes(1);
    expect(Object.keys(invalid.mock.calls[0][0].detail.errors)).toEqual(['email']);
  });

  it('runs @submit exactly once when the form is valid', async () => {
    const host = mount(FORM);
    const form = host.querySelector('form')!;
    host.querySelector('input')!.value = 'ana@example.com';

    form.requestSubmit();
    await settle();

    expect(host.querySelector('#sent')!.textContent).toBe('1');
  });

  it('lets the corrected field clear its message while typing, after a failed submit', async () => {
    const host = mount(FORM);
    const form = host.querySelector('form')!;
    const input = host.querySelector('input')!;

    form.requestSubmit();
    await settle();
    expect(input.classList.contains('v-invalid')).toBe(true);

    input.value = 'ana@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(input.classList.contains('v-invalid')).toBe(false);
  });

  it('stops a plain form from being sent while invalid', async () => {
    const host = mount('<form v-validate action="/signup"><input name="name" v-required></form>');
    const form = host.querySelector('form')!;
    const event = new Event('submit', { bubbles: true, cancelable: true });

    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves v-submit to do its own validation', async () => {
    const host = mount(
      '<form v-validate v-submit="/api/users"><input name="name" v-required></form>'
    );
    const form = host.querySelector('form')!;
    const seen = vi.fn();
    form.addEventListener('submit', seen);

    form.requestSubmit();
    await settle();

    // The guard would have stopped the event before any listener saw it.
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('stops guarding once the form is destroyed', async () => {
    const host = mount('<form v-validate><input name="name" v-required></form>');
    const form = host.querySelector('form')!;
    destroy(host);

    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
