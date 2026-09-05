/**
 * @module benchmarks/reconcile/cases
 *
 * The reconciliation scenarios, and nothing else.
 *
 * Every case is written the same way on purpose:
 *
 *   setup()      builds the list and brings it to its steady state — untimed
 *   prepare()    produces the payload for one iteration — untimed
 *   apply()      the ONE thing being measured: hand the change to the list
 *                and flush. Nothing that builds the payload lives in here.
 *   restore()    puts the list back to the steady state — untimed
 *   verify()     reads the real DOM afterwards
 *
 * Splitting `prepare` from `apply` is what makes the numbers mean anything. A
 * naive "remove one of ten thousand" benchmark times `[...rows]` plus `splice`
 * plus the reconciler and calls the total the reconciler's cost; the array copy
 * alone is O(n) and has nothing to do with the algorithm under test.
 *
 * The scenarios come in two families:
 *
 *   replace/*   a NEW array is assigned. The reconciler is handed two lists and
 *               no history: it has to work out what changed.
 *   inplace/*   the reactive array is mutated with push/pop/shift/unshift/
 *               splice. The mutation itself already says what changed.
 *
 * Both are real usage and they have different lower bounds, so they are
 * measured apart rather than averaged into one misleading number.
 */

const TEMPLATE = `<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>`;

const ADJ = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const COLOUR = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const NOUN = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];

/** Deterministic rows. Two runs must measure exactly the same work. */
export function buildRows(count, seed = 1, idBase = 1) {
  let s = seed >>> 0 || 1;
  const rand = (max) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s % max;
  };
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = { id: idBase + i, label: `${ADJ[rand(10)]} ${COLOUR[rand(10)]} ${NOUN[rand(10)]}` };
  }
  return rows;
}

/** Deterministic shuffle, so "random reorder" is the same reorder every time. */
function shuffle(list, seed) {
  const out = list.slice();
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

export default function buildCases(V) {
  const { reactive, Scope, walk, destroy, flushSync } = V;
  const cases = [];

  const mount = (rows) => {
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    document.body.appendChild(root);
    const state = reactive({ rows });
    walk(root, new Scope(state));
    flushSync();
    return { root, state };
  };

  const teardown = (ctx) => {
    if (!ctx.root) return;
    destroy(ctx.root);
    ctx.root.remove();
    ctx.root = null;
  };

  const lis = (root) => root.querySelectorAll('li');

  /** Full check: length, and every label in document order. */
  const checkAll = (ctx, expected) => {
    const nodes = lis(ctx.root);
    if (nodes.length !== expected.length) {
      return `expected ${expected.length} <li>, found ${nodes.length}`;
    }
    for (let i = 0; i < expected.length; i++) {
      if (nodes[i].textContent !== expected[i].label) {
        return `row ${i}: expected "${expected[i].label}", found "${nodes[i].textContent}"`;
      }
    }
    return true;
  };

  const add = (c) => cases.push(c);

  // -------------------------------------------------------------------------
  // create — from nothing to N rows
  // -------------------------------------------------------------------------
  for (const n of [1000, 10000, 50000]) {
    add({
      id: `create/${n}`,
      name: `create ${n} rows`,
      group: 'create',
      n,
      iterations: n >= 50000 ? 10 : n >= 10000 ? 30 : 100,
      // Each iteration builds N rows from nothing and throws the previous list
      // away. Without a collection between samples the heap climbs until a
      // mark-compact lands inside a measurement — or, at 50.000 rows, until the
      // process runs out of heap altogether.
      gcPerSample: true,
      setup: () => ({ rows: buildRows(n), root: null }),
      prepare: (ctx) => {
        // A fresh empty list per iteration: creating N rows can only be
        // measured once per mounted list.
        teardown(ctx);
        Object.assign(ctx, mount([]));
        return ctx.rows;
      },
      apply: (ctx, rows) => {
        ctx.state.rows = rows;
        flushSync();
      },
      verify: (ctx) => checkAll(ctx, ctx.rows),
      teardown,
    });
  }

  // -------------------------------------------------------------------------
  // append
  // -------------------------------------------------------------------------
  add({
    id: 'replace/append-1-to-10000',
    name: 'append 1 row to 10.000 (new array)',
    group: 'append',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(1, 7, 900001)[0];
      return ctx;
    },
    prepare: (ctx) => ctx.base.concat([ctx.extra]),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      if (nodes[10000].textContent !== ctx.extra.label) return 'appended row is not last';
      if (nodes[0].textContent !== ctx.base[0].label) return 'first row changed';
      return true;
    },
    teardown,
  });

  add({
    id: 'inplace/push-1-to-10000',
    name: 'push 1 row onto 10.000 (in place)',
    group: 'append',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.extra = buildRows(1, 7, 900001)[0];
      return ctx;
    },
    prepare: (ctx) => ctx.extra,
    apply: (ctx, extra) => {
      ctx.state.rows.push(extra);
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.pop();
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      return nodes[10000].textContent === ctx.extra.label ? true : 'pushed row is not last';
    },
    teardown,
  });

  add({
    id: 'replace/append-5000-to-5000',
    gcPerSample: true,
    name: 'append 5.000 rows to 5.000',
    group: 'append',
    n: 5000,
    iterations: 40,
    setup: () => {
      const ctx = mount(buildRows(5000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(5000, 99, 800001);
      return ctx;
    },
    prepare: (ctx) => ctx.base.concat(ctx.extra),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      return nodes[5000].textContent === ctx.extra[0].label ? true : 'first appended row misplaced';
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // prepend
  // -------------------------------------------------------------------------
  add({
    id: 'replace/prepend-1-to-10000',
    name: 'prepend 1 row to 10.000 (new array)',
    group: 'prepend',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(1, 11, 700001)[0];
      return ctx;
    },
    prepare: (ctx) => [ctx.extra].concat(ctx.base),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      if (nodes[0].textContent !== ctx.extra.label) return 'prepended row is not first';
      if (nodes[1].textContent !== ctx.base[0].label) return 'old first row was displaced';
      return true;
    },
    teardown,
  });

  add({
    id: 'inplace/unshift-1-to-10000',
    name: 'unshift 1 row onto 10.000 (in place)',
    group: 'prepend',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.extra = buildRows(1, 11, 700001)[0];
      return ctx;
    },
    prepare: (ctx) => ctx.extra,
    apply: (ctx, extra) => {
      ctx.state.rows.unshift(extra);
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.shift();
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      return nodes[0].textContent === ctx.extra.label ? true : 'unshifted row is not first';
    },
    teardown,
  });

  add({
    id: 'replace/prepend-5000-to-5000',
    gcPerSample: true,
    name: 'prepend 5.000 rows to 5.000',
    group: 'prepend',
    n: 5000,
    iterations: 40,
    setup: () => {
      const ctx = mount(buildRows(5000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(5000, 77, 600001);
      return ctx;
    },
    prepare: (ctx) => ctx.extra.concat(ctx.base),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      if (nodes[0].textContent !== ctx.extra[0].label) return 'prepended block is not first';
      if (nodes[5000].textContent !== ctx.base[0].label) return 'old rows were not preserved in order';
      return true;
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // remove one row — first, middle, last — both families
  // -------------------------------------------------------------------------
  const removeAt = (where, index) => {
    add({
      id: `replace/remove-${where}-of-10000`,
      name: `remove the ${where} row of 10.000 (new array)`,
      group: 'remove-one',
      n: 10000,
      setup: () => {
        const ctx = mount(buildRows(10000));
        ctx.base = ctx.state.rows.slice();
        ctx.at = index < 0 ? ctx.base.length - 1 : index;
        return ctx;
      },
      prepare: (ctx) => {
        const next = ctx.base.slice();
        next.splice(ctx.at, 1);
        return next;
      },
      apply: (ctx, next) => {
        ctx.state.rows = next;
        flushSync();
      },
      restore: (ctx) => {
        ctx.state.rows = ctx.base;
        flushSync();
      },
      verify: (ctx) => {
        const nodes = lis(ctx.root);
        if (nodes.length !== 9999) return `expected 9999 <li>, found ${nodes.length}`;
        const at = Math.min(ctx.at, nodes.length - 1);
        const expected = ctx.base[ctx.at + 1] ?? ctx.base[ctx.at - 1];
        if (nodes[at].textContent !== expected.label) {
          return `row ${at}: expected "${expected.label}", found "${nodes[at].textContent}"`;
        }
        return true;
      },
      teardown,
    });
  };
  removeAt('first', 0);
  removeAt('middle', 5000);
  removeAt('last', -1);

  add({
    id: 'inplace/splice-remove-middle-of-10000',
    name: 'splice out the middle row of 10.000 (in place)',
    group: 'remove-one',
    n: 10000,
    setup: () => mount(buildRows(10000)),
    prepare: () => null,
    apply: (ctx) => {
      ctx.removed = ctx.state.rows.splice(5000, 1)[0];
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.splice(5000, 0, ctx.removed);
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 9999) return `expected 9999 <li>, found ${nodes.length}`;
      const expected = ctx.state.rows[5000].label;
      return nodes[5000].textContent === expected ? true : `row 5000 should be "${expected}"`;
    },
    teardown,
  });

  add({
    id: 'inplace/shift-of-10000',
    name: 'shift the first row off 10.000 (in place)',
    group: 'remove-one',
    n: 10000,
    setup: () => mount(buildRows(10000)),
    prepare: () => null,
    apply: (ctx) => {
      ctx.removed = ctx.state.rows.shift();
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.unshift(ctx.removed);
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 9999) return `expected 9999 <li>, found ${nodes.length}`;
      return nodes[0].textContent === ctx.state.rows[0].label ? true : 'wrong first row';
    },
    teardown,
  });

  add({
    id: 'inplace/pop-of-10000',
    name: 'pop the last row off 10.000 (in place)',
    group: 'remove-one',
    n: 10000,
    setup: () => mount(buildRows(10000)),
    prepare: () => null,
    apply: (ctx) => {
      ctx.removed = ctx.state.rows.pop();
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.push(ctx.removed);
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 9999) return `expected 9999 <li>, found ${nodes.length}`;
      return nodes[9998].textContent === ctx.state.rows[9998].label ? true : 'wrong last row';
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // insert one row in the middle
  // -------------------------------------------------------------------------
  add({
    id: 'replace/insert-middle-of-10000',
    name: 'insert 1 row in the middle of 10.000 (new array)',
    group: 'insert-one',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(1, 13, 500001)[0];
      return ctx;
    },
    prepare: (ctx) => {
      const next = ctx.base.slice();
      next.splice(5000, 0, ctx.extra);
      return next;
    },
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      if (nodes[5000].textContent !== ctx.extra.label) return 'inserted row is in the wrong place';
      if (nodes[5001].textContent !== ctx.base[5000].label) return 'the row after the insert moved';
      return true;
    },
    teardown,
  });

  add({
    id: 'inplace/splice-insert-middle-of-10000',
    name: 'splice 1 row into the middle of 10.000 (in place)',
    group: 'insert-one',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.extra = buildRows(1, 13, 500001)[0];
      return ctx;
    },
    prepare: (ctx) => ctx.extra,
    apply: (ctx, extra) => {
      ctx.state.rows.splice(5000, 0, extra);
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.splice(5000, 1);
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10001) return `expected 10001 <li>, found ${nodes.length}`;
      return nodes[5000].textContent === ctx.extra.label ? true : 'inserted row is in the wrong place';
    },
    teardown,
  });

  // -------------------------------------------------------------------------
  // small changes inside a big list
  // -------------------------------------------------------------------------
  add({
    id: 'replace/replace-1-of-10000',
    name: 'replace 1 row of 10.000 with a new key',
    group: 'small-change',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      ctx.extra = buildRows(1, 17, 400001)[0];
      return ctx;
    },
    prepare: (ctx) => {
      const next = ctx.base.slice();
      next[5000] = ctx.extra;
      return next;
    },
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      if (nodes[5000].textContent !== ctx.extra.label) return 'the replaced row did not update';
      if (nodes[4999].textContent !== ctx.base[4999].label) return 'a neighbour changed';
      return true;
    },
    teardown,
  });

  add({
    id: 'inplace/update-label-1-of-10000',
    name: 'change 1 label in 10.000 (no structural change)',
    group: 'small-change',
    n: 10000,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.tick = 0;
      return ctx;
    },
    prepare: (ctx) => `CHANGED ${ctx.tick++}`,
    apply: (ctx, label) => {
      ctx.expected = label;
      ctx.state.rows[5000].label = label;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      if (nodes[5000].textContent !== ctx.expected) return 'the row did not update';
      if (nodes[4999].textContent.startsWith('CHANGED')) return 'a neighbour was rewritten';
      return true;
    },
    teardown,
  });

  add({
    id: 'replace/same-rows-new-array-10000',
    name: 're-assign an identical 10.000-row array',
    group: 'small-change',
    n: 10000,
    notes: 'Nothing changed. Everything measured here is pure reconciliation overhead.',
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      return ctx;
    },
    prepare: (ctx) => ctx.base.slice(),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    verify: (ctx) => checkAll(ctx, ctx.base),
    teardown,
  });

  // -------------------------------------------------------------------------
  // reorder
  // -------------------------------------------------------------------------
  add({
    id: 'replace/swap-2-of-10000',
    name: 'swap 2 rows in 10.000',
    group: 'reorder',
    n: 10000,
    // The change is O(1) and the new algorithm handles it in milliseconds, but
    // the old one turns it into a cascade of DOM moves that jsdom charges for
    // quadratically. A hundred samples of that does not finish.
    iterations: 12,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      return ctx;
    },
    prepare: (ctx) => {
      const next = ctx.base.slice();
      const t = next[1];
      next[1] = next[9998];
      next[9998] = t;
      return next;
    },
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      if (nodes[1].textContent !== ctx.base[9998].label) return 'row 1 was not swapped';
      if (nodes[9998].textContent !== ctx.base[1].label) return 'row 9998 was not swapped';
      return true;
    },
    teardown,
  });

  add({
    id: 'replace/reverse-10000',
    name: 'reverse 10.000 rows',
    group: 'reorder',
    n: 10000,
    iterations: 12,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      return ctx;
    },
    prepare: (ctx) => ctx.base.slice().reverse(),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => {
      const nodes = lis(ctx.root);
      if (nodes.length !== 10000) return `expected 10000 <li>, found ${nodes.length}`;
      if (nodes[0].textContent !== ctx.base[9999].label) return 'the list was not reversed';
      if (nodes[9999].textContent !== ctx.base[0].label) return 'the list was not reversed';
      return true;
    },
    teardown,
  });

  add({
    id: 'replace/random-reorder-10000',
    name: 'shuffle 10.000 rows',
    group: 'reorder',
    n: 10000,
    iterations: 12,
    setup: () => {
      const ctx = mount(buildRows(10000));
      ctx.base = ctx.state.rows.slice();
      ctx.shuffled = shuffle(ctx.base, 4242);
      return ctx;
    },
    prepare: (ctx) => ctx.shuffled,
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
    },
    verify: (ctx) => checkAll(ctx, ctx.shuffled),
    teardown,
  });

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------
  add({
    id: 'replace/clear-10000',
    gcPerSample: true,
    name: 'clear a 10.000-row list',
    group: 'clear',
    n: 10000,
    iterations: 40,
    setup: () => {
      const ctx = mount([]);
      ctx.base = buildRows(10000);
      return ctx;
    },
    prepare: (ctx) => {
      ctx.state.rows = ctx.base;
      flushSync();
      return [];
    },
    apply: (ctx, next) => {
      ctx.state.rows = next;
      flushSync();
    },
    verify: (ctx) => (lis(ctx.root).length === 0 ? true : `${lis(ctx.root).length} <li> left behind`),
    teardown,
  });

  return cases;
}
