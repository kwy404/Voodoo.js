/**
 * The list reconciler, exercised through every path it has.
 *
 * `v-for` now reaches the same DOM by three different routes, and which one it
 * takes depends on what it can prove:
 *
 *   mutation  the array was mutated in place, so the mutation itself says
 *             which range changed and nothing else is examined
 *   scan      a different array arrived, so the region that changed is found by
 *             comparing keys from both ends
 *   region    whichever route found it, the changed region is reconciled by
 *             key, with a longest-increasing-subsequence pass when rows crossed
 *
 * A fast path that is only correct on the cases someone thought to benchmark is
 * worse than no fast path, so the assertions here are about the DOM: what it
 * contains, in what order, and which elements survived. Every case is written
 * twice where it can be — once mutating the array in place, once handing over a
 * new one — because those take different routes to the same answer and both
 * have to arrive.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { reactive, flushSync, effect } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import '../src/core';

interface Row {
  id: unknown;
  label: string;
}

const ROW_TEMPLATE = '<ul><li v-for="r in list" :key="r.id"><span v-text="r.label"></span></li></ul>';

function mount(html: string, data: Record<string, unknown>): { root: HTMLElement; state: any } {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  const state = reactive(data);
  walk(root, new Scope(state));
  flushSync();
  return { root, state };
}

const rows = (ids: number[]): Row[] => ids.map((id) => ({ id, label: 'r' + id }));
const labels = (root: Element): string[] =>
  [...root.querySelectorAll('li')].map((li) => (li.textContent ?? '').trim());
const items = (root: Element): HTMLElement[] => [...root.querySelectorAll('li')];

beforeEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// The same edit, reached two different ways
// ---------------------------------------------------------------------------

describe('an in-place mutation and a replacement array reach the same DOM', () => {
  /**
   * Runs one edit twice over: once by mutating the reactive array, once by
   * assigning a fresh array with the same contents. The first goes down the
   * mutation path, the second down the scan path, and the DOM they produce has
   * to be indistinguishable.
   */
  const bothWays = (
    start: number[],
    mutate: (list: Row[]) => void,
    expected: string[]
  ): void => {
    const inPlace = mount(ROW_TEMPLATE, { list: rows(start) });
    mutate(inPlace.state.list);
    flushSync();
    expect(labels(inPlace.root)).toEqual(expected);

    const replaced = mount(ROW_TEMPLATE, { list: rows(start) });
    const copy = replaced.state.list.slice();
    mutate(copy);
    replaced.state.list = copy;
    flushSync();
    expect(labels(replaced.root)).toEqual(expected);
  };

  it('push', () => {
    bothWays([1, 2, 3], (l) => void l.push({ id: 4, label: 'r4' }), ['r1', 'r2', 'r3', 'r4']);
  });

  it('push of several at once', () => {
    bothWays([1], (l) => void l.push(...rows([2, 3, 4])), ['r1', 'r2', 'r3', 'r4']);
  });

  it('pop', () => {
    bothWays([1, 2, 3], (l) => void l.pop(), ['r1', 'r2']);
  });

  it('shift', () => {
    bothWays([1, 2, 3], (l) => void l.shift(), ['r2', 'r3']);
  });

  it('unshift', () => {
    bothWays([2, 3], (l) => void l.unshift({ id: 1, label: 'r1' }), ['r1', 'r2', 'r3']);
  });

  it('splice that only removes', () => {
    bothWays([1, 2, 3, 4], (l) => void l.splice(1, 2), ['r1', 'r4']);
  });

  it('splice that only inserts', () => {
    bothWays([1, 4], (l) => void l.splice(1, 0, ...rows([2, 3])), ['r1', 'r2', 'r3', 'r4']);
  });

  it('splice that removes and inserts', () => {
    bothWays([1, 2, 5], (l) => void l.splice(1, 1, ...rows([3, 4])), ['r1', 'r3', 'r4', 'r5']);
  });

  it('splice with a negative index', () => {
    bothWays([1, 2, 3, 4], (l) => void l.splice(-2, 1), ['r1', 'r2', 'r4']);
  });

  it('reverse', () => {
    bothWays([1, 2, 3, 4], (l) => void l.reverse(), ['r4', 'r3', 'r2', 'r1']);
  });

  it('sort', () => {
    bothWays([3, 1, 2], (l) => void l.sort((a, b) => (a.id as number) - (b.id as number)), [
      'r1',
      'r2',
      'r3',
    ]);
  });

  it('writing one element', () => {
    bothWays([1, 2, 3], (l) => void (l[1] = { id: 9, label: 'r9' }), ['r1', 'r9', 'r3']);
  });

  it('writing past the end', () => {
    bothWays([1, 2], (l) => void (l[2] = { id: 3, label: 'r3' }), ['r1', 'r2', 'r3']);
  });

  it('truncating with length', () => {
    bothWays([1, 2, 3, 4], (l) => void (l.length = 2), ['r1', 'r2']);
  });

  it('emptying with length', () => {
    bothWays([1, 2, 3], (l) => void (l.length = 0), []);
  });

  it('a full reorder', () => {
    bothWays([1, 2, 3, 4, 5], (l) => void l.splice(0, 5, ...rows([3, 5, 1, 4, 2])), [
      'r3',
      'r5',
      'r1',
      'r4',
      'r2',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Mutations that arrive together
// ---------------------------------------------------------------------------

describe('several mutations in one tick', () => {
  it('two pushes', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1]) });
    state.list.push({ id: 2, label: 'r2' });
    state.list.push({ id: 3, label: 'r3' });
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r2', 'r3']);
  });

  it('two unshifts — the order the caller wrote them, not the order they were logged', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([3]) });
    state.list.unshift({ id: 2, label: 'r2' });
    state.list.unshift({ id: 1, label: 'r1' });
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r2', 'r3']);
  });

  it('a push and a shift', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2]) });
    state.list.push({ id: 3, label: 'r3' });
    state.list.shift();
    flushSync();
    expect(labels(root)).toEqual(['r2', 'r3']);
  });

  it('splices at opposite ends', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4, 5, 6]) });
    state.list.splice(1, 1);
    state.list.splice(3, 1);
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r3', 'r4', 'r6']);
  });

  it('overlapping splices', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4, 5]) });
    state.list.splice(1, 2, { id: 9, label: 'r9' });
    state.list.splice(1, 1, { id: 8, label: 'r8' }, { id: 7, label: 'r7' });
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r8', 'r7', 'r4', 'r5']);
  });

  it('a burst longer than the log keeps still lands correctly', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1]) });
    // The log is bounded; past its limit the reconciler has to fall back to
    // comparing the lists, and the answer must not change.
    for (let i = 2; i <= 120; i++) state.list.push({ id: i, label: 'r' + i });
    flushSync();
    expect(labels(root)).toEqual(rows(Array.from({ length: 120 }, (_, i) => i + 1)).map((r) => r.label));
  });

  it('a mutation and then a replacement in the same tick', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    state.list.push({ id: 4, label: 'r4' });
    state.list = rows([7, 8]);
    flushSync();
    expect(labels(root)).toEqual(['r7', 'r8']);
  });
});

// ---------------------------------------------------------------------------
// Element reuse
// ---------------------------------------------------------------------------

describe('rows are reused rather than rebuilt', () => {
  it('a push touches no existing element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    const before = items(root);
    state.list.push({ id: 4, label: 'r4' });
    flushSync();
    expect(items(root).slice(0, 3)).toEqual(before);
  });

  it('an unshift touches no existing element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([2, 3]) });
    const before = items(root);
    state.list.unshift({ id: 1, label: 'r1' });
    flushSync();
    expect(items(root).slice(1)).toEqual(before);
  });

  it('a middle removal keeps both sides', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4]) });
    const before = items(root);
    state.list.splice(1, 2);
    flushSync();
    expect(items(root)).toEqual([before[0], before[3]]);
  });

  it('a reversal reuses every element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4]) });
    const before = new Set(items(root));
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['r4', 'r3', 'r2', 'r1']);
    expect(items(root).every((li) => before.has(li))).toBe(true);
  });

  it('a new array holding the same objects reuses every element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    const before = items(root);
    state.list = state.list.slice();
    flushSync();
    expect(items(root)).toEqual(before);
  });

  it('a new array of clones with the same keys reuses every element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    const before = items(root);
    state.list = state.list.map((r: Row) => ({ ...r }));
    flushSync();
    expect(items(root)).toEqual(before);
    expect(labels(root)).toEqual(['r1', 'r2', 'r3']);
  });

  it('re-assigning the very same array reference changes nothing', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    const before = items(root);
    state.list = state.list;
    flushSync();
    expect(items(root)).toEqual(before);
  });

  it('a row that leaves and comes back is a new element', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2]) });
    const first = items(root)[0];
    state.list.shift();
    flushSync();
    state.list.unshift({ id: 1, label: 'r1' });
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r2']);
    expect(items(root)[0]).not.toBe(first);
  });
});

// ---------------------------------------------------------------------------
// Keys that are not well-behaved integers
// ---------------------------------------------------------------------------

describe('awkward keys', () => {
  it('string keys', () => {
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    });
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['B', 'A']);
  });

  it('an undefined key still renders and still reorders', () => {
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: undefined, label: 'A' },
        { id: 2, label: 'B' },
      ],
    });
    expect(labels(root)).toEqual(['A', 'B']);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['B', 'A']);
  });

  it('a null key', () => {
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: null, label: 'A' },
        { id: 1, label: 'B' },
      ],
    });
    expect(labels(root)).toEqual(['A', 'B']);
    state.list.splice(0, 1);
    flushSync();
    expect(labels(root)).toEqual(['B']);
  });

  it('a NaN key keeps its own row instead of rebuilding it every render', () => {
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: NaN, label: 'A' },
        { id: 2, label: 'B' },
      ],
    });
    const before = items(root)[0];
    // NaN !== NaN, so a reconciler comparing keys with === alone throws this
    // row away and builds it again on every single render.
    state.list = state.list.slice();
    flushSync();
    expect(labels(root)).toEqual(['A', 'B']);
    expect(items(root)[0]).toBe(before);
  });

  it('symbol keys', () => {
    const a = Symbol('a');
    const b = Symbol('b');
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: a, label: 'A' },
        { id: b, label: 'B' },
      ],
    });
    const before = items(root);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['B', 'A']);
    expect(items(root)).toEqual([before[1], before[0]]);
  });

  it('an object used directly as the key', () => {
    const { root, state } = mount(
      '<ul><li v-for="r in list" :key="r"><span v-text="r.label"></span></li></ul>',
      { list: [{ label: 'A' }, { label: 'B' }] }
    );
    const before = items(root);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['B', 'A']);
    expect(items(root)).toEqual([before[1], before[0]]);
  });

  it('a key read through a deep path', () => {
    const { root, state } = mount(
      '<ul><li v-for="r in list" :key="r.meta.id"><span v-text="r.label"></span></li></ul>',
      {
        list: [
          { meta: { id: 1 }, label: 'A' },
          { meta: { id: 2 }, label: 'B' },
        ],
      }
    );
    const before = items(root);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['B', 'A']);
    expect(items(root)).toEqual([before[1], before[0]]);
  });

  it('a key that is an expression rather than a path', () => {
    const { root, state } = mount(
      '<ul><li v-for="r in list" :key="\'row-\' + r.id"><span v-text="r.label"></span></li></ul>',
      { list: rows([1, 2]) }
    );
    const before = items(root);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['r2', 'r1']);
    expect(items(root)).toEqual([before[1], before[0]]);
  });

  it('primitive items keyed by themselves', () => {
    const { root, state } = mount('<li v-for="n in list" :key="n" v-text="n"></li>', {
      list: [1, 2, 3],
    });
    const before = items(root);
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['3', '2', '1']);
    expect(items(root)).toEqual([before[2], before[1], before[0]]);
  });

  it('null items in the list', () => {
    const { root } = mount('<li v-for="n in list" :key="n" v-text="n"></li>', {
      list: [null, 1],
    });
    expect(items(root).length).toBe(2);
  });
});

describe('duplicate keys', () => {
  afterEach(() => {
    config.devtools = false;
    vi.restoreAllMocks();
  });

  it('renders one row per item even when two share a key', () => {
    const { root } = mount(ROW_TEMPLATE, {
      list: [
        { id: 1, label: 'A' },
        { id: 1, label: 'B' },
        { id: 2, label: 'C' },
      ],
    });
    expect(labels(root)).toEqual(['A', 'B', 'C']);
  });

  it('a reorder with duplicate keys still produces the right text', () => {
    const { root, state } = mount(ROW_TEMPLATE, {
      list: [
        { id: 1, label: 'A' },
        { id: 1, label: 'B' },
        { id: 2, label: 'C' },
      ],
    });
    state.list = [
      { id: 2, label: 'C' },
      { id: 1, label: 'A' },
      { id: 1, label: 'B' },
    ];
    flushSync();
    expect(labels(root)).toEqual(['C', 'A', 'B']);
  });

  it('warns in development', () => {
    config.devtools = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { state } = mount(ROW_TEMPLATE, { list: rows([1, 2]) });
    state.list = [
      { id: 5, label: 'A' },
      { id: 5, label: 'B' },
    ];
    flushSync();
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('duplicate key');
  });
});

// ---------------------------------------------------------------------------
// The index alias
// ---------------------------------------------------------------------------

describe('the index alias keeps up with the list', () => {
  const INDEXED = '<li v-for="(r, i) in list" :key="r.id">{ i }:{ r.label }</li>';

  it('after an unshift', () => {
    const { root, state } = mount(INDEXED, { list: rows([2, 3]) });
    expect(labels(root)).toEqual(['0:r2', '1:r3']);
    state.list.unshift({ id: 1, label: 'r1' });
    flushSync();
    expect(labels(root)).toEqual(['0:r1', '1:r2', '2:r3']);
  });

  it('after a middle removal', () => {
    const { root, state } = mount(INDEXED, { list: rows([1, 2, 3, 4]) });
    state.list.splice(1, 1);
    flushSync();
    expect(labels(root)).toEqual(['0:r1', '1:r3', '2:r4']);
  });

  it('after a reversal', () => {
    const { root, state } = mount(INDEXED, { list: rows([1, 2, 3]) });
    state.list.reverse();
    flushSync();
    expect(labels(root)).toEqual(['0:r3', '1:r2', '2:r1']);
  });

  it('after a replacement array', () => {
    const { root, state } = mount(INDEXED, { list: rows([1, 2, 3]) });
    const next = state.list.slice();
    next.splice(0, 1);
    state.list = next;
    flushSync();
    expect(labels(root)).toEqual(['0:r2', '1:r3']);
  });

  it('when the index is the key', () => {
    const { root, state } = mount('<li v-for="(r, i) in list" :key="i" v-text="r.label"></li>', {
      list: rows([1, 2, 3]),
    });
    state.list.splice(1, 1);
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r3']);
  });
});

// ---------------------------------------------------------------------------
// Lists without a key
// ---------------------------------------------------------------------------

describe('lists without a key reuse by position', () => {
  it('appending only builds the new rows', () => {
    const { root, state } = mount('<li v-for="n in list" v-text="n"></li>', { list: ['a', 'b'] });
    const before = items(root);
    state.list.push('c');
    flushSync();
    expect(labels(root)).toEqual(['a', 'b', 'c']);
    expect(items(root).slice(0, 2)).toEqual(before);
  });

  it('removing from the front rewrites the rows rather than moving them', () => {
    const { root, state } = mount('<li v-for="n in list" v-text="n"></li>', {
      list: ['a', 'b', 'c'],
    });
    const before = items(root);
    state.list.shift();
    flushSync();
    expect(labels(root)).toEqual(['b', 'c']);
    expect(items(root)).toEqual([before[0], before[1]]);
  });

  it('shrinking to nothing', () => {
    const { root, state } = mount('<li v-for="n in list" v-text="n"></li>', { list: [1, 2, 3] });
    state.list = [];
    flushSync();
    expect(labels(root)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Sources that are not arrays
// ---------------------------------------------------------------------------

describe('sources that are not arrays', () => {
  it('a number', () => {
    const { root } = mount('<li v-for="n in 3" v-text="n"></li>', {});
    expect(labels(root)).toEqual(['1', '2', '3']);
  });

  it('a string', () => {
    const { root } = mount('<li v-for="c in word" v-text="c"></li>', { word: 'abc' });
    expect(labels(root)).toEqual(['a', 'b', 'c']);
  });

  it('an object, and it follows edits', () => {
    const { root, state } = mount('<li v-for="(v, k) in obj">{ k }={ v }</li>', {
      obj: { a: 1, b: 2 },
    });
    expect(labels(root)).toEqual(['a=1', 'b=2']);
    state.obj.c = 3;
    flushSync();
    expect(labels(root)).toEqual(['a=1', 'b=2', 'c=3']);
  });

  it('a Map', () => {
    const { root } = mount('<li v-for="(v, k) in m">{ k }={ v }</li>', {
      m: new Map([
        ['a', 1],
        ['b', 2],
      ]),
    });
    expect(labels(root)).toEqual(['a=1', 'b=2']);
  });

  it('a Set', () => {
    const { root } = mount('<li v-for="v in s" v-text="v"></li>', { s: new Set([7, 8]) });
    expect(labels(root)).toEqual(['7', '8']);
  });

  it('switching from an array to an object', () => {
    const { root, state } = mount('<li v-for="v in src" v-text="v"></li>', { src: [1, 2] });
    state.src = { a: 3, b: 4 };
    flushSync();
    expect(labels(root)).toEqual(['3', '4']);
  });
});

// ---------------------------------------------------------------------------
// Rows keep their own reactivity
// ---------------------------------------------------------------------------

describe('a row stays reactive after the list moves around it', () => {
  it('mutating an item updates only that row', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    state.list[1].label = 'changed';
    flushSync();
    expect(labels(root)).toEqual(['r1', 'changed', 'r3']);
  });

  it('mutating an item still works after a reorder', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    state.list.reverse();
    flushSync();
    state.list[0].label = 'changed';
    flushSync();
    expect(labels(root)).toEqual(['changed', 'r2', 'r1']);
  });

  it('mutating an item still works after an in-place splice', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4]) });
    state.list.splice(1, 1);
    flushSync();
    state.list[2].label = 'changed';
    flushSync();
    expect(labels(root)).toEqual(['r1', 'r3', 'changed']);
  });

  it('a row removed by splice comes back reactive', () => {
    const { state } = mount(ROW_TEMPLATE, { list: rows([1, 2]) });
    const [removed] = state.list.splice(0, 1);
    flushSync();
    let seen = '';
    const stop = walkEffect(() => {
      seen = removed.label;
    });
    removed.label = 'after';
    flushSync();
    expect(seen).toBe('after');
    stop();
  });

  it('a row popped off comes back reactive', () => {
    const { state } = mount(ROW_TEMPLATE, { list: rows([1, 2]) });
    const removed = state.list.pop();
    flushSync();
    let seen = '';
    const stop = walkEffect(() => {
      seen = removed.label;
    });
    removed.label = 'after';
    flushSync();
    expect(seen).toBe('after');
    stop();
  });
});

// ---------------------------------------------------------------------------
// Nesting and teardown
// ---------------------------------------------------------------------------

describe('nesting and teardown', () => {
  it('a list inside a list', () => {
    const { root, state } = mount(
      '<div v-for="g in groups" :key="g.id"><span v-for="n in g.items" :key="n" v-text="n"></span></div>',
      { groups: [{ id: 1, items: [1, 2] }, { id: 2, items: [3] }] }
    );
    expect(root.textContent).toBe('123');

    state.groups[0].items.push(9);
    flushSync();
    expect(root.textContent).toBe('1293');

    state.groups.reverse();
    flushSync();
    expect(root.textContent).toBe('3129');
  });

  it('a template row with several children', () => {
    const { root, state } = mount(
      '<div><template v-for="n in list" :key="n"><i v-text="n"></i><b>-</b></template></div>',
      { list: [1, 2] }
    );
    expect(root.textContent).toBe('1-2-');
    state.list.unshift(0);
    flushSync();
    expect(root.textContent).toBe('0-1-2-');
    state.list.splice(1, 1);
    flushSync();
    expect(root.textContent).toBe('0-2-');
  });

  it('v-if inside a row', () => {
    const { root, state } = mount(
      '<div v-for="n in list" :key="n"><span v-if="n % 2 === 0" v-text="n"></span></div>',
      { list: [1, 2, 3, 4] }
    );
    expect(root.textContent).toBe('24');
    state.list.push(6);
    flushSync();
    expect(root.textContent).toBe('246');
  });

  it('destroying the tree releases the rows and stops the list', () => {
    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3]) });
    destroy(root);
    root.remove();

    // `destroy` unmounts the logic; it does not rewrite the markup, so the
    // three <li> are still sitting in the detached tree. What must be gone is
    // the list's appetite for work: a mutation after teardown that still
    // reached the reconciler would be a leak with a heartbeat.
    expect(root.querySelectorAll('li').length).toBe(3);
    expect(() => {
      state.list.push({ id: 4, label: 'r4' });
      flushSync();
    }).not.toThrow();
    expect(root.querySelectorAll('li').length).toBe(3);
  });
});

/** A tiny effect helper, so the tests above can watch a value without the DOM. */
function walkEffect(fn: () => void): () => void {
  const runner = effect(fn);
  return () => runner.effect.stop();
}

// ---------------------------------------------------------------------------
// Fuzz
// ---------------------------------------------------------------------------

/**
 * The region arithmetic is the part of this that cannot be checked by reading it.
 *
 * A single mutation gives an obvious range. A batch of them arriving in one
 * tick does not: each was recorded against the list as it stood at the time,
 * and they have to compose into one range over a list that has since moved
 * underneath them. Getting that composition subtly wrong produces a list that
 * is right for every case someone thought to write down and wrong for the one
 * they did not.
 *
 * So the cases are generated instead. A seeded generator applies random batches
 * of random mutations, and the only assertion is that the DOM says what the
 * array says. The seed is fixed, so a failure is reproducible rather than
 * "it went red once on CI".
 */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('fuzz: the DOM always says what the array says', () => {
  it('random batches of in-place mutations', () => {
    const random = rng(20260904);
    let nextId = 1000;
    const make = (): Row => ({ id: nextId, label: 'r' + nextId++ });

    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4, 5, 6]) });

    for (let round = 0; round < 400; round++) {
      const batch = 1 + Math.floor(random() * 4);
      for (let b = 0; b < batch; b++) {
        const list = state.list;
        const len = list.length;
        const pick = Math.floor(random() * 8);
        const at = len ? Math.floor(random() * len) : 0;

        if (pick === 0) list.push(make());
        else if (pick === 1) list.push(make(), make());
        else if (pick === 2) list.unshift(make());
        else if (pick === 3 && len) list.pop();
        else if (pick === 4 && len) list.shift();
        else if (pick === 5 && len) list.splice(at, 1 + Math.floor(random() * 2));
        else if (pick === 6) list.splice(at, Math.floor(random() * 2), make(), make());
        else if (len) list[at] = make();
      }

      flushSync();
      const expected = state.list.map((r: Row) => r.label);
      expect(labels(root)).toEqual(expected);

      // Never let the list run dry for long: an empty list makes most of the
      // operations above no-ops and the rounds stop testing anything.
      if (state.list.length === 0) state.list.push(make(), make(), make());
      if (state.list.length > 60) state.list.splice(0, 40);
      flushSync();
    }
  });

  it('random replacement arrays', () => {
    const random = rng(777);
    let nextId = 5000;
    const make = (): Row => ({ id: nextId, label: 'r' + nextId++ });

    const { root, state } = mount(ROW_TEMPLATE, { list: rows([1, 2, 3, 4, 5, 6, 7, 8]) });

    for (let round = 0; round < 300; round++) {
      // Keep a random subset of the current rows, in a random order, with a few
      // new ones dropped in: a shape that exercises the prefix scan, the suffix
      // scan, the key map and the move pass all at once.
      const kept = state.list.filter(() => random() > 0.3);
      for (let i = kept.length - 1; i > 0; i--) {
        if (random() > 0.7) {
          const j = Math.floor(random() * (i + 1));
          const t = kept[i];
          kept[i] = kept[j];
          kept[j] = t;
        }
      }
      const inserts = Math.floor(random() * 3);
      for (let i = 0; i < inserts; i++) {
        kept.splice(Math.floor(random() * (kept.length + 1)), 0, make());
      }

      state.list = kept;
      flushSync();
      expect(labels(root)).toEqual(kept.map((r: Row) => r.label));

      if (state.list.length < 3) state.list = rows([1, 2, 3, 4, 5]).map((r) => ({ ...r, id: nextId++ }));
      flushSync();
    }
  });
});
