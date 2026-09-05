/**
 * Regression: inserting at the top of a list moved every existing row.
 *
 * New rows were built into one fragment and dropped at the anchor, which sits
 * at the END of the list, and a reorder pass then dragged them wherever they
 * actually belonged. Appending cost nothing; anything else cost one DOM move
 * per row. Inserting a single row at the top of a thousand measured 1,000
 * `insertBefore` calls, and prepending a thousand to a thousand took 276 ms
 * against 112 ms for the same append.
 *
 * Rows are now gathered into runs — stretches of consecutive new rows — and
 * each run is inserted where it belongs. Prepending measures 103 ms, and the
 * append and single-removal paths are unchanged.
 *
 * The assertions are about DOM identity rather than timing, because timing is
 * too noisy to gate on: a row that was not moved is a row whose element is the
 * same object it was before.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, flushSync } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

interface Row {
  id: number;
  label: string;
}

const rows = (ids: number[]): Row[] => ids.map((id) => ({ id, label: 'r' + id }));

function mount(ids: number[]): { root: HTMLElement; state: { list: Row[] } } {
  const root = document.createElement('div');
  root.innerHTML = '<ul><li v-for="r in list" :key="r.id"><span v-text="r.label"></span></li></ul>';
  document.body.appendChild(root);
  const state = reactive({ list: rows(ids) });
  walk(root, new Scope(state));
  flushSync();
  return { root, state };
}

const labels = (root: Element): string[] =>
  [...root.querySelectorAll('li')].map((li) => (li.textContent ?? '').trim());

const items = (root: Element): HTMLElement[] => [...root.querySelectorAll('li')];

/**
 * Counts how many nodes already in the document get moved by `fn`.
 *
 * Identity assertions cannot catch what regressed here: the old code was
 * correct and reused every element, it just dragged them across the list
 * afterwards. The cost was the moving, so the moving is what has to be counted.
 * A first version of this file asserted on identity alone and passed against
 * the unfixed code.
 *
 * A fragment carries many nodes in one call and is the cheap path, so it is not
 * counted; a bare node that was already connected is a move being paid for.
 */
function countMoves(fn: () => void): number {
  let moves = 0;

  const insertBefore = Node.prototype.insertBefore;
  const appendChild = Node.prototype.appendChild;

  Node.prototype.insertBefore = function (this: Node, node: Node, ref: Node | null) {
    if (node.nodeType !== 11 && node.isConnected) moves++;
    return insertBefore.call(this, node, ref) as never;
  } as never;

  Node.prototype.appendChild = function (this: Node, node: Node) {
    if (node.nodeType !== 11 && node.isConnected) moves++;
    return appendChild.call(this, node) as never;
  } as never;

  try {
    fn();
    flushSync();
  } finally {
    Node.prototype.insertBefore = insertBefore;
    Node.prototype.appendChild = appendChild;
  }

  return moves;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('rows are placed where they belong, not dropped at the end', () => {
  it('inserting at the front keeps every existing element', () => {
    const { root, state } = mount([1, 2, 3]);
    const before = items(root);

    state.list.unshift({ id: 0, label: 'r0' });
    flushSync();

    const after = items(root);
    expect(labels(root)).toEqual(['r0', 'r1', 'r2', 'r3']);
    // The three originals are the same elements, in the same order, one place
    // along. Only the new row is new.
    expect(after.slice(1)).toEqual(before);
  });

  it('appending keeps every existing element', () => {
    const { root, state } = mount([1, 2, 3]);
    const before = items(root);

    state.list.push({ id: 4, label: 'r4' });
    flushSync();

    expect(labels(root)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(items(root).slice(0, 3)).toEqual(before);
  });

  it('inserting in the middle keeps the rows on both sides', () => {
    const { root, state } = mount([1, 2, 4]);
    const before = items(root);

    state.list.splice(2, 0, { id: 3, label: 'r3' });
    flushSync();

    const after = items(root);
    expect(labels(root)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect([after[0], after[1], after[3]]).toEqual(before);
  });

  it('two separate runs of new rows both land in place', () => {
    const { root, state } = mount([2, 5]);

    state.list.splice(0, state.list.length, ...rows([1, 2, 3, 4, 5, 6]));
    flushSync();

    expect(labels(root)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
  });

  it('a reorder still reuses every element', () => {
    const { root, state } = mount([1, 2, 3, 4]);
    const before = new Set(items(root));

    state.list.reverse();
    flushSync();

    expect(labels(root)).toEqual(['r4', 'r3', 'r2', 'r1']);
    expect(items(root).every((li) => before.has(li))).toBe(true);
  });

  it('removing keeps the survivors', () => {
    const { root, state } = mount([1, 2, 3, 4]);
    const before = items(root);

    state.list.splice(1, 2);
    flushSync();

    expect(labels(root)).toEqual(['r1', 'r4']);
    expect(items(root)).toEqual([before[0], before[3]]);
  });

  it('building the list from empty still works', () => {
    const { root, state } = mount([]);

    state.list.push(...rows([1, 2, 3]));
    flushSync();

    expect(labels(root)).toEqual(['r1', 'r2', 'r3']);
  });

  it('a row that leaves and comes back is a new element', () => {
    const { root, state } = mount([1, 2]);
    const first = items(root)[0];

    state.list.shift();
    flushSync();
    state.list.unshift({ id: 1, label: 'r1' });
    flushSync();

    expect(labels(root)).toEqual(['r1', 'r2']);
    expect(items(root)[0]).not.toBe(first);
  });
});

describe('inserting does not drag the rest of the list', () => {
  it('one row at the front costs one placement, not one per existing row', () => {
    const { state } = mount(Array.from({ length: 200 }, (_, i) => i));

    const moved = countMoves(() => state.list.unshift({ id: 999, label: 'r999' }));

    // Before the change this was 200 — every existing row was moved so the new
    // one could reach the front it had been created behind.
    expect(moved).toBeLessThan(5);
  });

  it('one row at the end costs nothing either', () => {
    const { state } = mount(Array.from({ length: 200 }, (_, i) => i));

    const moved = countMoves(() => state.list.push({ id: 999, label: 'r999' }));

    expect(moved).toBeLessThan(5);
  });

  it('a block at the front does not scale with the list behind it', () => {
    const { state } = mount(Array.from({ length: 200 }, (_, i) => i));

    const moved = countMoves(() => state.list.unshift(...rows([901, 902, 903])));

    expect(moved).toBeLessThan(5);
  });
});
