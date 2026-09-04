/**
 * Regression: `v-table` rendered every cell empty for positional rows.
 *
 * Cells were only ever read by column key, so a row given as an array found
 * nothing. The documentation's own example on the components page passes
 * `[['Ada', 'Engineer']]` against columns `['Name', 'Role']`, and it rendered
 * the header row correctly, created the right number of body rows, and left
 * all of them blank — a failure shaped so that everything around it looks
 * right, which is why it survived.
 *
 * Both shapes are supported now: an object keyed by column, and an array read
 * by position.
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

/** The table body, as a grid of trimmed strings. */
function grid(root: Element): string[][] {
  return [...root.querySelectorAll('tbody tr')]
    .map((tr) => [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').trim()))
    .filter((row) => row.length > 0);
}

function headers(root: Element): string[] {
  return [...root.querySelectorAll('thead th')].map((th) => (th.textContent ?? '').trim());
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('rows given as positional arrays', () => {
  it('fills the cells in column order', async () => {
    const root = mount(
      '<div v-data="{ cols: [\'Name\', \'Role\'], people: [[\'Ada\', \'Engineer\'], [\'Grace\', \'Admiral\']] }">' +
        '<v-table :columns="cols" :rows="people"></v-table>' +
        '</div>'
    );
    await settle();

    expect(headers(root)).toEqual(['Name', 'Role']);
    expect(grid(root)).toEqual([
      ['Ada', 'Engineer'],
      ['Grace', 'Admiral'],
    ]);
  });

  it('does not silently render blanks when a row is short', async () => {
    const root = mount(
      '<div v-data="{ cols: [\'A\', \'B\', \'C\'], rows: [[1, 2]] }">' +
        '<v-table :columns="cols" :rows="rows"></v-table>' +
        '</div>'
    );
    await settle();

    // The missing third value is genuinely absent, so an empty cell is right.
    expect(grid(root)).toEqual([['1', '2', '']]);
  });
});

describe('rows given as objects', () => {
  it('still reads by column key', async () => {
    const root = mount(
      '<div v-data="{ cols: [\'name\', \'role\'], people: [{ name: \'Ada\', role: \'Engineer\' }] }">' +
        '<v-table :columns="cols" :rows="people"></v-table>' +
        '</div>'
    );
    await settle();

    expect(grid(root)).toEqual([['Ada', 'Engineer']]);
  });

  it('reads a nested path', async () => {
    const root = mount(
      '<div v-data="{ cols: [{ key: \'user.name\', label: \'Who\' }], rows: [{ user: { name: \'Ada\' } }] }">' +
        '<v-table :columns="cols" :rows="rows"></v-table>' +
        '</div>'
    );
    await settle();

    expect(grid(root)).toEqual([['Ada']]);
  });
});
