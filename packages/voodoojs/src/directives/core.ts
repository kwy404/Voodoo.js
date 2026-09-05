/**
 * @module directives/core
 *
 * Core directives: text, HTML, conditionals, lists, form, attributes,
 * classes, styles, events, refs and teleport.
 */

import {
  ArrayOp,
  arrayVersion,
  handleError,
  ITERATE_KEY,
  mutationsSince,
  nextTick,
  queuePostFlush,
  toRaw,
  track,
} from '../reactivity';
import { evaluate, stringify } from '../parser/interpreter';
// `AstNode` avoids conflict with DOM `Node`, used throughout this file.
import { parse, type Node as AstNode } from '../parser/parser';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { warn, warnDuplicateKey, describeElement } from '../runtime/avisos';
import { Scope } from '../runtime/scope';
import {
  addCleanup,
  destroy,
  evaluateIn,
  markInitialized,
  markSkipChildren,
  markNodeScope,
  removeQuietly,
  walk,
} from '../runtime/walker';
import { enter, leave, type TransitionOptions } from '../dom/transition';
import { metrics as M, countPath } from '../runtime/metrics';
import { debounce, parseDuration, throttle } from '../utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Writes a value to an assignable expression, like `form.email`. */
function setValue(expression: string, scope: Scope, value: unknown): void {
  try {
    const target = parse(expression);
    const assignment = {
      t: 'assign',
      op: '=',
      target,
      value: { t: 'lit', v: value as never },
    } as AstNode;
    evaluate(assignment, scope);
  } catch (err) {
    handleError(err, `assignment in "${expression}"`);
  }
}

/** Reads the transition configuration declared on the element. */
export function transitionOptions(el: Element): TransitionOptions | null {
  const p = config.prefix;
  const has = el.hasAttribute(`${p}transition`);
  const custom =
    el.hasAttribute(`${p}enter-class`) ||
    el.hasAttribute(`${p}leave-class`) ||
    el.hasAttribute(`${p}enter-active-class`) ||
    el.hasAttribute(`${p}leave-active-class`);
  if (!has && !custom) return null;

  const name = el.getAttribute(`${p}transition`) || 'fade';
  return {
    name: name.startsWith('v-') ? name : `v-${name}`,
    enterFrom: el.getAttribute(`${p}enter-class`) || undefined,
    enterActive: el.getAttribute(`${p}enter-active-class`) || undefined,
    enterTo: el.getAttribute(`${p}enter-to-class`) || undefined,
    leaveFrom: el.getAttribute(`${p}leave-class`) || undefined,
    leaveActive: el.getAttribute(`${p}leave-active-class`) || undefined,
    leaveTo: el.getAttribute(`${p}leave-to-class`) || undefined,
    duration: el.hasAttribute(`${p}duration`)
      ? parseDuration(el.getAttribute(`${p}duration`)!)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// v-text
// ---------------------------------------------------------------------------

defineDirective('text', ({ el, effect, evaluate: ev }) => {
  // The content written here is result, not template. Mark text nodes
  // to prevent the walk from treating a value like "{ a: 1 }" as interpolation.
  effect(() => {
    el.textContent = stringify(ev());
    const first = el.firstChild;
    if (first && first.nodeType === 3) markInitialized(first);
  });
});

// ---------------------------------------------------------------------------
// v-html
// ---------------------------------------------------------------------------

defineDirective('html', (ctx) => {
  const { el, effect, evaluate: ev, scope } = ctx;
  markSkipChildren(el);
  effect(() => {
    const value = ev();
    // Unmount previous content before replacing, avoiding leaks.
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? '' : String(value);
    // Inserted HTML also gains directives.
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});

// ---------------------------------------------------------------------------
// v-show
// ---------------------------------------------------------------------------

defineDirective('show', ({ el, effect, evaluate: ev }) => {
  const original = el.style.display === 'none' ? '' : el.style.display;
  let first = true;
  const options = transitionOptions(el);

  effect(() => {
    const visible = !!ev();
    if (first) {
      first = false;
      el.style.display = visible ? original : 'none';
      return;
    }
    if (!options) {
      el.style.display = visible ? original : 'none';
      return;
    }
    if (visible) {
      el.style.display = original;
      void enter(el, options);
    } else {
      void leave(el, options).then(() => {
        el.style.display = 'none';
      });
    }
  });
});

// ---------------------------------------------------------------------------
// v-if / v-else-if / v-else
// ---------------------------------------------------------------------------

interface Branch {
  expression: string | null;
  template: Element;
}

defineDirective(
  'if',
  ({ el, scope, expression, effect }) => {
    const p = config.prefix;
    const branches: Branch[] = [{ expression, template: el }];

    // Collects the chain of `v-else-if` and `v-else` siblings.
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.hasAttribute(`${p}else-if`)) {
        branches.push({
          expression: sibling.getAttribute(`${p}else-if`) || 'false',
          template: sibling,
        });
        sibling = sibling.nextElementSibling;
      } else if (sibling.hasAttribute(`${p}else`)) {
        branches.push({ expression: null, template: sibling });
        sibling = sibling.nextElementSibling;
        break;
      } else {
        break;
      }
    }

    const anchor = document.createComment(config.devtools ? ` v-if: ${expression} ` : '');
    el.parentNode?.insertBefore(anchor, el);

    // Removes templates from the document and cleans up control attributes.
    for (const branch of branches) {
      removeQuietly(branch.template);
      branch.template.removeAttribute(`${p}if`);
      branch.template.removeAttribute(`${p}else-if`);
      branch.template.removeAttribute(`${p}else`);
      // The template leaves the scene and should never be traversed. The walk of the
      // parent element already had this node in the list, and without the mark it would
      // enter here and initialize directives within the template itself.
      markInitialized(branch.template);
    }

    const options = transitionOptions(el);
    let activeIndex = -1;
    let activeNodes: Node[] = [];

    const removeActive = (): void => {
      const nodes = activeNodes;
      activeNodes = [];
      if (!nodes.length) return;
      const finish = (): void => {
        for (const node of nodes) {
          destroy(node);
          (node as ChildNode).remove();
        }
      };
      if (options && nodes[0] instanceof HTMLElement) {
        void leave(nodes[0] as HTMLElement, options).then(finish);
      } else {
        finish();
      }
    };

    effect(() => {
      let matched = -1;
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (branch.expression === null || evaluateIn(branch.expression, scope, 'v-if')) {
          matched = i;
          break;
        }
      }

      if (matched === activeIndex) return;
      activeIndex = matched;
      removeActive();
      if (matched === -1) return;

      const source = branches[matched].template;
      const nodes = renderTemplate(source, anchor, scope);
      activeNodes = nodes;
      if (options && nodes[0] instanceof HTMLElement) void enter(nodes[0] as HTMLElement, options);
    });

    addCleanup(el, removeActive);
  },
  { priority: PRIORITY.IF, terminal: true }
);

/**
 * Clones a template, inserts before the anchor and initializes. Supports
 * `<template>` with multiple children.
 */
function renderTemplate(source: Element, anchor: Node, scope: Scope): Node[] {
  const parent = anchor.parentNode;
  if (!parent) return [];

  const nodes: Node[] = [];

  if (source.tagName === 'TEMPLATE') {
    const fragment = (source as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
    const children = Array.from(fragment.childNodes);
    parent.insertBefore(fragment, anchor);
    for (const node of children) {
      nodes.push(node);
      if (node.nodeType === 1) {
        markNodeScope(node, scope);
        walk(node, scope);
      }
    }
  } else {
    const clone = source.cloneNode(true) as Element;
    if (M.on) M.domCreates++;
    nodes.push(clone);
    markNodeScope(clone, scope);
    parent.insertBefore(clone, anchor);
    walk(clone, scope);
  }

  return nodes;
}

// `v-else-if` and `v-else` are consumed by `v-if`. Registered to not
// appear as unknown directives.
defineDirective('else-if', () => undefined, { priority: PRIORITY.IF, terminal: true });
defineDirective('else', () => undefined, { priority: PRIORITY.IF, terminal: true });

// ---------------------------------------------------------------------------
// v-for
// ---------------------------------------------------------------------------

const FOR_PATTERN = /^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+?)\s*$/;

/** A `:key` that is nothing but a path: `item`, `row.id`, `a.b.c`. */
const KEY_PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;

interface ForBlock {
  key: unknown;
  scope: Scope;
  nodes: Node[];
  data: Record<string, unknown>;
}

const NO_BLOCKS: ForBlock[] = [];

/**
 * Whether a row's stored variable already holds the incoming value.
 *
 * The two are not always the same object even when they are the same value.
 * Writing through the reactive proxy stores `toRaw(value)`, while the list a
 * caller hands back can perfectly well hold proxies — `[...state.rows]` reads
 * every element through the array proxy and so copies out proxies, and
 * assigning that array back does not unwrap them.
 *
 * Comparing only by identity, every row of such a list looks changed on every
 * render, is written again, is stored raw again, and looks changed again on the
 * next one: ten thousand proxy writes per render to say nothing had happened.
 * The identity test still answers first and costs one comparison; unwrapping is
 * only reached when the values genuinely differ.
 */
function sameStored(stored: unknown, incoming: unknown): boolean {
  if (stored === incoming) return true;
  return incoming !== null && typeof incoming === 'object' && stored === toRaw(incoming);
}

/**
 * Whether two keys name the same row.
 *
 * `NaN === NaN` is false, so a list keyed on something that can be NaN would
 * otherwise tear down and rebuild that row on every single render.
 */
function sameKey(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

/**
 * Longest increasing subsequence of `arr`, as indices into `arr`. Entries equal
 * to zero mean "this row is new" and take no part.
 *
 * Used for one thing: deciding which rows may stay put during a reorder. Rows
 * whose old positions already form an increasing run are, by definition,
 * already in the right order relative to each other; everything else has to
 * move. Taking the LONGEST such run is what makes the number of DOM moves
 * minimal — reversing ten thousand rows moves 9.999 of them because no longer
 * run exists, while sliding one row from the end to the front moves exactly one.
 *
 * Patience sorting with a binary search over the tails array: O(n log n).
 */
function longestIncreasing(arr: Int32Array): Int32Array {
  const length = arr.length;
  // `previous[i]` is the index that precedes `i` in the best run ending at `i`.
  const previous = new Int32Array(length);
  // Indices of the smallest possible tail for each run length found so far.
  const tails: number[] = [];

  for (let i = 0; i < length; i++) {
    const value = arr[i];
    if (value === 0) continue;

    if (tails.length === 0) {
      tails.push(i);
      continue;
    }

    const last = tails[tails.length - 1];
    if (arr[last] < value) {
      previous[i] = last;
      tails.push(i);
      continue;
    }

    let low = 0;
    let high = tails.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (arr[tails[mid]] < value) low = mid + 1;
      else high = mid;
    }
    if (value < arr[tails[low]]) {
      if (low > 0) previous[i] = tails[low - 1];
      tails[low] = i;
    }
  }

  // Walk the chain back from the last tail to recover the actual run.
  let cursor = tails.length;
  const out = new Int32Array(cursor);
  let node = tails[cursor - 1];
  while (cursor-- > 0) {
    out[cursor] = node;
    node = previous[node];
  }
  return out;
}

defineDirective(
  'for',
  ({ el, scope, expression, effect }) => {
    const match = FOR_PATTERN.exec(expression);
    if (!match) {
      handleError(
        new Error(`Invalid syntax in v-for="${expression}". Use "item in items".`),
        'v-for'
      );
      return;
    }

    const aliases = match[1].split(',').map((s) => s.trim()).filter(Boolean);
    const sourceExpression = match[2];
    const [itemAlias, indexAlias, thirdAlias] = aliases;

    const p = config.prefix;
    const keyExpression =
      el.getAttribute(':key') || el.getAttribute(`${p}bind:key`) || el.getAttribute(`${p}key`);

    const anchor = document.createComment(config.devtools ? ` v-for: ${expression} ` : '');
    el.parentNode?.insertBefore(anchor, el);

    const template = el.cloneNode(true) as Element;
    template.removeAttribute(`${p}for`);
    // The key expression was just read off the original element, and `v-bind`
    // treats `key` as a no-op precisely because `v-for` is the one that consumes
    // it. Left on the template it was pure freight: every row cloned the
    // attribute, parsed it, built a directive context to run a binding that
    // returns immediately, and then removed the attribute again. A row whose
    // only attribute was the key now carries no directive at all, so the walker
    // takes it down its cheap path.
    template.removeAttribute(':key');
    template.removeAttribute(`${p}bind:key`);
    template.removeAttribute(`${p}key`);
    // Silent removal: the original element becomes a template, is not leaving the
    // scene, so the observer should not unmount the list's effect.
    removeQuietly(el);

    const isTemplateRow = template.tagName === 'TEMPLATE';

    // -----------------------------------------------------------------------
    // Reading the key, decided once instead of once per row
    // -----------------------------------------------------------------------
    //
    // `:key="row.id"` is read once per row, so a ten-thousand-row list reads it
    // ten thousand times. Sending that through the expression interpreter means
    // a parse-cache lookup, an AST walk and a scope-chain lookup, per row, to
    // do what a property read does. When the expression IS just a path rooted at
    // the item — `item`, `row.id`, `a.b.c`, which is very nearly every list ever
    // written — it is turned into that property read here, once.
    //
    // Anything else still goes through the interpreter, in one shared scope.
    let keyIsItem = false;
    let keyIsIndex = false;
    let keyProp: string | null = null;
    let keyPath: string[] | null = null;

    if (keyExpression && KEY_PATH.test(keyExpression)) {
      const parts = keyExpression.split('.');
      if (parts[0] === itemAlias) {
        if (parts.length === 1) keyIsItem = true;
        else if (parts.length === 2) keyProp = parts[1];
        else keyPath = parts.slice(1);
      } else if (indexAlias && parts.length === 1 && parts[0] === indexAlias) {
        keyIsIndex = true;
      }
    }

    // -----------------------------------------------------------------------
    // Per-pass state
    // -----------------------------------------------------------------------
    //
    // Held here rather than passed between the helpers below, so that the loops
    // that run once per row do not build argument objects or close over
    // anything. The helpers are created once, when the directive is set up, not
    // once per render.
    let blocks: ForBlock[] = [];
    let rows: unknown[] = [];
    let entries: Array<Record<string, unknown>> | null = null;
    let count = 0;
    let keyScope: Scope | null = null;

    /** The raw array rendered last time, and how many mutations it had seen. */
    let lastSource: unknown[] | null = null;
    let lastVersion = 0;

    /** Rows built this pass, walked once every one of them is connected. */
    const pending: Array<[Node, Scope]> = [];
    /** Where each run of newly built rows starts inside `pending`. */
    const pendingRuns: number[] = [];

    const varsAt = (i: number): Record<string, unknown> => {
      if (entries) return entries[i];
      const vars: Record<string, unknown> = { [itemAlias]: rows[i] };
      if (indexAlias) vars[indexAlias] = i;
      return vars;
    };

    const keyAt = (i: number): unknown => {
      if (M.on) M.keyEvaluations++;
      if (keyIsIndex) return i;
      if (!keyExpression) {
        // No key: position IS the identity. Returning the index makes the
        // prefix scan below match every row up to the shorter length, which is
        // exactly what "reuse by position" means, at one integer compare a row.
        return i;
      }
      const item = entries ? entries[i][itemAlias] : rows[i];
      if (keyIsItem) return item;
      if (keyProp !== null) return item == null ? undefined : (item as any)[keyProp];
      if (keyPath !== null) {
        let value: any = item;
        for (let d = 0; d < keyPath.length; d++) {
          if (value == null) return undefined;
          value = value[keyPath[d]];
        }
        return value;
      }
      if (!keyScope) keyScope = scope.child({});
      keyScope.data = varsAt(i);
      return evaluateIn(keyExpression, keyScope, ':key');
    };

    /**
     * Writes into a reused row only what actually differs.
     *
     * The comparison reads the raw object on purpose: reading through the proxy
     * would make this effect depend on every row's data, and re-render the
     * whole list whenever any single row changed.
     */
    const syncData = (block: ForBlock, i: number): void => {
      const raw = toRaw(block.data);
      if (entries) {
        const vars = entries[i];
        for (const name in vars) {
          if (!sameStored(raw[name], vars[name])) {
            if (M.on) M.proxyWrites++;
            block.data[name] = vars[name];
          }
        }
        return;
      }
      const item = rows[i];
      if (!sameStored(raw[itemAlias], item)) {
        if (M.on) M.proxyWrites++;
        block.data[itemAlias] = item;
      }
      if (indexAlias !== undefined && raw[indexAlias] !== i) {
        if (M.on) M.proxyWrites++;
        block.data[indexAlias] = i;
      }
    };

    /**
     * Builds rows `[from, to)` and puts them in the document before `before`.
     *
     * They travel together in one fragment: a thousand new rows arrive in one
     * `insertBefore` rather than a thousand, each of which would make the DOM
     * redo its child-list bookkeeping.
     */
    const buildRange = (from: number, to: number, before: Node, out: ForBlock[]): void => {
      if (from >= to) return;
      const parent = anchor.parentNode;
      if (!parent) return;

      pendingRuns.push(pending.length);

      if (isTemplateRow) {
        // A `<template>` row is several nodes; `renderTemplate` inserts and
        // walks them itself, one row at a time.
        for (let i = from; i < to; i++) {
          const childScope = scope.reactiveChild(varsAt(i));
          if (M.on) {
            M.scopeAllocations++;
            M.itemsVisited++;
          }
          const nodes = renderTemplate(template, before, childScope);
          out.push({ key: keyAt(i), scope: childScope, nodes, data: childScope.data });
        }
        return;
      }

      const fragment = document.createDocumentFragment();
      for (let i = from; i < to; i++) {
        const childScope = scope.reactiveChild(varsAt(i));
        const clone = template.cloneNode(true) as Element;
        markNodeScope(clone, childScope);
        fragment.appendChild(clone);
        // Walked only once every row is connected, because a directive may
        // depend on being in the document.
        pending.push([clone, childScope]);
        out.push({ key: keyAt(i), scope: childScope, nodes: [clone], data: childScope.data });
        if (M.on) {
          M.scopeAllocations++;
          M.domCreates++;
          M.itemsVisited++;
        }
      }
      if (M.on) M.domInserts++;
      parent.insertBefore(fragment, before);
    };

    const destroyBlock = (block: ForBlock): void => {
      const nodes = block.nodes;
      for (let j = 0; j < nodes.length; j++) {
        if (M.on) M.domRemoves++;
        destroy(nodes[j]);
        (nodes[j] as ChildNode).remove();
      }
    };

    /** Moves an already-placed row so that it sits just before `before`. */
    const moveBlock = (block: ForBlock, before: Node): void => {
      const parent = anchor.parentNode;
      if (!parent) return;
      const nodes = block.nodes;
      if (nodes[nodes.length - 1].nextSibling === before) return;
      for (let j = 0; j < nodes.length; j++) {
        if (M.on) M.domMoves++;
        parent.insertBefore(nodes[j], before);
      }
    };

    /** The node a row placed at new index `i` must sit before. */
    const nodeAfter = (oldIndex: number): Node =>
      oldIndex < blocks.length ? blocks[oldIndex].nodes[0] : anchor;

    const spliceBlocks = (index: number, remove: number, added: ForBlock[]): void => {
      const addCount = added.length;
      if (remove === 0 && addCount === 0) return;
      if (blocks.length === 0) {
        blocks = added;
        return;
      }
      if (addCount === 0) {
        blocks.splice(index, remove);
        return;
      }
      // `splice` takes its inserts as arguments, and tens of thousands of them
      // overflow the call stack. Rebuilding costs one pointer copy per row and
      // never breaks.
      if (addCount <= 1024) {
        blocks.splice(index, remove, ...added);
        return;
      }
      const out: ForBlock[] = new Array(blocks.length - remove + addCount);
      let w = 0;
      for (let k = 0; k < index; k++) out[w++] = blocks[k];
      for (let k = 0; k < addCount; k++) out[w++] = added[k];
      for (let k = index + remove; k < blocks.length; k++) out[w++] = blocks[k];
      blocks = out;
    };

    const flushPending = (): void => {
      // Runs are built back to front, so walking them in reverse order of
      // collection walks the document front to back, as it always did.
      for (let r = pendingRuns.length - 1; r >= 0; r--) {
        const start = pendingRuns[r];
        const end = r + 1 < pendingRuns.length ? pendingRuns[r + 1] : pending.length;
        for (let k = start; k < end; k++) walk(pending[k][0], pending[k][1]);
      }
      pending.length = 0;
      pendingRuns.length = 0;
    };

    // -----------------------------------------------------------------------
    // The changed region
    // -----------------------------------------------------------------------
    //
    // Everything below works on three numbers:
    //
    //   lo      first index where the old and new lists may differ
    //   oldHi   end of the changed region in the OLD list
    //   newHi   end of the changed region in the NEW list
    //
    // with the guarantee that old[0, lo) === new[0, lo) and that
    // old[oldHi, oldLen) === new[newHi, newLen), element for element. Rows
    // outside the region are not looked at, not written to, and not moved.
    let lo = 0;
    let oldHi = 0;
    let newHi = 0;

    /**
     * Derives the region from what the mutating calls recorded, without
     * comparing a single key.
     *
     * A splice already says where it happened and how much it took and gave.
     * Composing a batch of them is just widening a range: whatever any of them
     * touched is inside, everything else is provably untouched. `push` on ten
     * thousand rows gives back a region of length one at the end, whatever the
     * list around it is doing.
     *
     * Returns false when the log cannot answer and the lists have to be
     * compared instead.
     */
    const regionFromMutations = (source: unknown[]): boolean => {
      const ops = mutationsSince(source, lastVersion);
      if (!ops) return false;

      const oldLen = blocks.length;
      lo = 0;
      oldHi = 0;
      newHi = 0;
      let current = oldLen;

      for (let k = 0; k < ops.length; k++) {
        const op = ops[k];
        const index = op.index;
        const removed = op.type === ArrayOp.SET ? 1 : op.removed;
        const added = op.type === ArrayOp.SET ? 1 : op.added;
        const end = index + removed;

        if (k === 0) {
          lo = index;
          oldHi = end;
          newHi = index + added;
        } else if (end <= newHi) {
          // Entirely inside what is already known to have changed.
          if (index < lo) lo = index;
          newHi += added - removed;
        } else {
          // Reaches past the region into what was untouched. Positions at or
          // after `newHi` map onto the old list by a fixed offset, which is
          // what turns `end` back into an old index.
          if (index < lo) lo = index;
          oldHi = end - newHi + oldHi;
          newHi = index + added;
        }

        if (oldHi < lo) oldHi = lo;
        if (newHi < lo) newHi = lo;
        current += added - removed;
      }

      // The log described a list of a different length than the one in hand, so
      // something happened that never reached it. Comparing is the safe answer.
      if (current !== count) return false;
      if (lo > oldHi || lo > newHi) return false;
      if (oldHi > oldLen || newHi > count) return false;

      if (M.on) countPath(ops.length === 0 ? 'unchanged' : 'mutation');

      // Rows after the region kept their values but not their positions. When
      // nothing reads the index there is nothing to write; when something does,
      // this is the cost of asking for it.
      if (indexAlias !== undefined && oldHi - newHi !== 0) {
        for (let i = newHi; i < count; i++) syncData(blocks[i - newHi + oldHi], i);
      }
      return true;
    };

    /** Derives the region by comparing keys from both ends. */
    const regionFromScan = (): void => {
      const oldLen = blocks.length;
      const newLen = count;

      let i = 0;
      const shared = oldLen < newLen ? oldLen : newLen;
      while (i < shared) {
        const block = blocks[i];
        if (!sameKey(block.key, keyAt(i))) break;
        syncData(block, i);
        i++;
      }
      if (M.on) {
        M.prefixScanned += i;
        M.itemsVisited += i;
      }

      let oe = oldLen - 1;
      let ne = newLen - 1;
      while (oe >= i && ne >= i) {
        const block = blocks[oe];
        if (!sameKey(block.key, keyAt(ne))) break;
        syncData(block, ne);
        oe--;
        ne--;
      }
      if (M.on) {
        const scanned = oldLen - 1 - oe;
        M.suffixScanned += scanned;
        M.itemsVisited += scanned;
        countPath('scan');
      }

      lo = i;
      oldHi = oe + 1;
      newHi = ne + 1;
    };

    /**
     * Reconciles old[lo, oldHi) against new[lo, newHi) by key, moving as few
     * rows as the order allows.
     */
    const reconcileRegion = (): void => {
      const toPatch = newHi - lo;

      // Only new rows in the region: nothing to match, nothing to move.
      if (lo >= oldHi) {
        if (toPatch > 0) {
          const created: ForBlock[] = [];
          buildRange(lo, newHi, nodeAfter(lo), created);
          spliceBlocks(lo, 0, created);
        }
        return;
      }

      // Only departures in the region. Arrivals are counted as they are built.
      if (toPatch === 0) {
        if (M.on) M.itemsVisited += oldHi - lo;
        for (let j = lo; j < oldHi; j++) destroyBlock(blocks[j]);
        spliceBlocks(lo, oldHi - lo, NO_BLOCKS);
        return;
      }

      // The general case. Everything from here on is proportional to the size
      // of the REGION, not of the list.
      if (M.on) {
        M.arrayAllocations += 3;
        M.middleReconciled += toPatch;
        // Rows matched here are looked at from both sides: every old row in the
        // region is checked against the key map, and every new position is
        // decided. Leaving them out of `itemsVisited` made a full reorder look
        // like it had examined nothing at all.
        M.itemsVisited += toPatch + (oldHi - lo);
      }

      const keyToNew = new Map<unknown, number>();
      for (let n = lo; n < newHi; n++) {
        const key = keyAt(n);
        if (keyExpression && keyToNew.has(key)) warnDuplicateKey(el, key, expression);
        keyToNew.set(key, n);
      }

      // `0` means "no old row claimed this position"; anything else is an old
      // index, offset by one so that zero can carry that meaning.
      const oldOfNew = new Int32Array(toPatch);
      const reused: Array<ForBlock | undefined> = new Array(toPatch);
      let matched = 0;
      let moved = false;
      let highestSoFar = 0;

      for (let o = lo; o < oldHi; o++) {
        const block = blocks[o];
        if (M.on) M.keyMapLookups++;
        const target = matched >= toPatch ? undefined : keyToNew.get(block.key);
        // A key that appears twice in the new list can only host one old row;
        // the second is a row that has genuinely left.
        if (target === undefined || reused[target - lo] !== undefined) {
          destroyBlock(block);
          continue;
        }
        oldOfNew[target - lo] = o + 1;
        reused[target - lo] = block;
        if (target >= highestSoFar) highestSoFar = target;
        else moved = true;
        syncData(block, target);
        matched++;
      }

      // The rows that may stay where they are. Skipped entirely when the
      // surviving rows never crossed each other, which is the case for every
      // pure insertion and every pure removal.
      const stay = moved ? longestIncreasing(oldOfNew) : (null as Int32Array | null);
      if (M.on && moved) {
        M.lisRuns++;
        M.lisElements += toPatch;
      }
      let s = stay ? stay.length - 1 : -1;

      const region: ForBlock[] = new Array(toPatch);
      // Backwards, so the node each row is placed before is already in place.
      let before: Node = nodeAfter(oldHi);
      let runEnd = -1;

      for (let n = toPatch - 1; n >= 0; n--) {
        const newIndex = lo + n;
        const block = reused[n];

        if (block === undefined) {
          if (runEnd < 0) runEnd = newIndex + 1;
          continue;
        }

        if (runEnd >= 0) {
          const created: ForBlock[] = [];
          buildRange(newIndex + 1, runEnd, before, created);
          for (let c = 0; c < created.length; c++) region[n + 1 + c] = created[c];
          // Empty only when the list was detached mid-render and there was
          // nowhere to insert into; the reference node then stays as it was.
          if (created.length) before = created[0].nodes[0];
          runEnd = -1;
        }

        region[n] = block;
        if (moved && (s < 0 || n !== stay![s])) moveBlock(block, before);
        else if (moved) s--;
        before = block.nodes[0];
      }

      if (runEnd >= 0) {
        const created: ForBlock[] = [];
        buildRange(lo, runEnd, before, created);
        for (let c = 0; c < created.length; c++) region[c] = created[c];
      }

      spliceBlocks(lo, oldHi - lo, region);
    };

    const clearAll = (): void => {
      for (const block of blocks) destroyBlock(block);
      blocks = [];
      lastSource = null;
      lastVersion = 0;
    };

    addCleanup(anchor, clearAll);

    effect(() => {
      const source = evaluateIn<unknown>(sourceExpression, scope, 'v-for');
      const raw = toRaw(source) as unknown[];

      let fromMutations = false;

      if (Array.isArray(raw)) {
        // Subscribe to the COLLECTION, once, instead of to every element.
        //
        // Reading the rows through the proxy subscribed this effect to all n
        // indices, and to whatever property the key touched on all n items.
        // Every re-render then had to remove the effect from those 2n
        // dependency sets and add it back, which is 4n hash operations spent
        // before the reconciler had looked at anything. `trigger` sends element
        // writes to `ITERATE_KEY`, so a write to any index still arrives.
        track(raw, 'length');
        track(raw, ITERATE_KEY);
        rows = raw;
        entries = null;
        count = raw.length;

        const version = arrayVersion(raw);
        // Only a list with keys of its own can act on a mutation directly.
        // Without `:key` — or with the index AS the key — a row's identity IS
        // its position, so removing the row at 5.000 renumbers every row after
        // it. Acting on the range would leave the stored keys describing
        // positions the rows no longer occupy. Positional lists take the scan
        // path, where the comparison is one integer per row and the numbering
        // stays true by construction.
        if (raw === lastSource && keyExpression && !keyIsIndex) {
          fromMutations = regionFromMutations(raw);
        }
        lastSource = raw;
        lastVersion = version;
      } else {
        entries = normalizeSource(source, itemAlias, indexAlias, thirdAlias);
        rows = entries as unknown as unknown[];
        count = entries.length;
        lastSource = null;
        lastVersion = 0;
        if (M.on) M.arrayAllocations += count + 1;
      }

      if (!fromMutations) regionFromScan();

      reconcileRegion();
      flushPending();
    });
  },
  { priority: PRIORITY.FOR, terminal: true }
);

/** Converts object, number, string, Map or Set into a list of item scopes. */
function normalizeSource(
  source: unknown,
  itemAlias: string,
  indexAlias?: string,
  thirdAlias?: string
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];

  if (typeof source === 'number') {
    for (let i = 1; i <= source; i++) {
      const vars: Record<string, unknown> = { [itemAlias]: i };
      if (indexAlias) vars[indexAlias] = i - 1;
      out.push(vars);
    }
    return out;
  }

  if (typeof source === 'string') {
    Array.from(source).forEach((ch, index) => {
      const vars: Record<string, unknown> = { [itemAlias]: ch };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }

  if (source && typeof source === 'object') {
    const iterable =
      source instanceof Map
        ? Array.from(source.entries())
        : source instanceof Set
          ? Array.from(source).map((v, i) => [i, v] as [unknown, unknown])
          : Object.entries(source as Record<string, unknown>);

    iterable.forEach(([key, value], index) => {
      const vars: Record<string, unknown> = { [itemAlias]: value };
      if (indexAlias) vars[indexAlias] = key;
      if (thirdAlias) vars[thirdAlias] = index;
      out.push(vars);
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// v-bind, :attribute, v-class, v-style
// ---------------------------------------------------------------------------

const BOOLEAN_ATTRIBUTES = new Set([
  'disabled',
  'checked',
  'readonly',
  'required',
  'selected',
  'hidden',
  'open',
  'multiple',
  'autofocus',
  'novalidate',
  'inert',
]);

/**
 * Attributes that the browser treats as addresses to follow. A value from
 * state may have originated from external data, so the scheme needs to be
 * checked before it becomes `href` or `src`.
 */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'ping',
  'poster',
]);

/** Whitespace and control characters that the browser discards when reading the scheme. */
const SCHEME_NOISE = /[\s\x00-\x1f]/g;

/**
 * `true` when the address uses a scheme that executes code. `data:text/html`
 * is in the list because it opens a document with its own origin and active script.
 */
export function isDangerousUrl(value: string): boolean {
  // An address can bring a line break in the middle of `javascript:` and the
  // browser still executes it, so the check cleans the noise before comparing,
  // the same way it does.
  const clean = value.replace(SCHEME_NOISE, '').toLowerCase();
  return (
    clean.startsWith('javascript:') ||
    clean.startsWith('vbscript:') ||
    clean.startsWith('data:text/html') ||
    clean.startsWith('data:application/xhtml')
  );
}

/**
 * Applies a value to an attribute, handling special cases.
 *
 * `allowDangerous` comes from the `.dangerous` modifier and enables bindings
 * that write executable markup, currently only `srcdoc`.
 */
export function applyBinding(
  el: HTMLElement,
  name: string,
  value: unknown,
  asProp = false,
  allowDangerous = false
): void {
  if (name === 'class') return applyClass(el, value);
  if (name === 'style') return applyStyle(el, value);

  // `srcdoc` writes an entire document inside the iframe, with active script.
  // It's like the iframe's `v-html`, but written as if it were just a binding,
  // so the danger doesn't show in the HTML reading. Here it needs to be stated out loud:
  // `:srcdoc.dangerous="..."` at the point of use, or `V.config.sanitizeUrls = false`
  // for the entire application.
  if (config.sanitizeUrls && !allowDangerous && name === 'srcdoc') {
    warn(
      `:srcdoc refused in ${describeElement(el)}: the value becomes a document ` +
        'with active script inside the iframe, the same way v-html becomes markup. ' +
        'If the content is trusted, write :srcdoc.dangerous="..."; to turn off ' +
        'this protection on the entire application, set V.config.sanitizeUrls = false.'
    );
    el.removeAttribute(name);
    return;
  }

  if (config.sanitizeUrls && !asProp) {
    // Address with executable scheme: attribute doesn't reach the DOM.
    if (URL_ATTRIBUTES.has(name) && typeof value === 'string' && isDangerousUrl(value)) {
      warn(
        `value refused in :${name} of ${describeElement(el)}: ` +
          `"${value.slice(0, 60)}" uses a scheme that executes code. ` +
          'Use an http(s) or relative address. To turn off this protection, ' +
          'set V.config.sanitizeUrls = false.'
      );
      el.removeAttribute(name);
      return;
    }
    // `:onerror="..."` would become an inline handler, which runs as script.
    // Events are declared with `@event`, which never passes through this path.
    if (name.length > 2 && /^on[a-z]/.test(name)) {
      warn(
        `attribute "${name}" refused in ${describeElement(el)}: linking event by ` +
          `attribute creates an inline handler. Use @${name.slice(2)}="..." instead.`
      );
      el.removeAttribute(name);
      return;
    }
  }

  if (asProp) {
    (el as any)[name] = value;
    return;
  }

  if (BOOLEAN_ATTRIBUTES.has(name)) {
    if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, '');
    // Keeps the property in sync, important for inputs.
    if (name in el) (el as any)[name] = !!value;
    return;
  }

  if (name === 'value' && 'value' in el) {
    (el as any).value = value == null ? '' : value;
    return;
  }

  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? '' : String(value));
}

/** Original classes of the element, preserved between updates. */
const baseClasses = new WeakMap<Element, string[]>();

export function applyClass(el: HTMLElement, value: unknown): void {
  let base = baseClasses.get(el);
  if (!base) {
    base = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    baseClasses.set(el, base);
  }

  const next = new Set(base);
  collectClasses(value, next);
  el.setAttribute('class', Array.from(next).join(' '));
  if (!el.getAttribute('class')) el.removeAttribute('class');
}

function collectClasses(value: unknown, out: Set<string>): void {
  if (!value) return;
  if (typeof value === 'string') {
    for (const cls of value.split(/\s+/)) if (cls) out.add(cls);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, out);
    return;
  }
  if (typeof value === 'object') {
    for (const [cls, active] of Object.entries(value as Record<string, unknown>)) {
      if (active) for (const c of cls.split(/\s+/)) if (c) out.add(c);
    }
  }
}

export function applyStyle(el: HTMLElement, value: unknown): void {
  if (!value) return;
  if (typeof value === 'string') {
    el.style.cssText = value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) applyStyle(el, item);
    return;
  }
  for (const [prop, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw == null || raw === false) {
      el.style.removeProperty(prop);
      continue;
    }
    const name = prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const text = String(raw);
    if (name.startsWith('--')) el.style.setProperty(name, text);
    else el.style.setProperty(name, text);
  }
}

defineDirective(
  'bind',
  ({ el, arg, modifiers, effect, evaluate: ev, expression }) => {
    // `v-bind="{ a: 1, b: 2 }"` without argument applies multiple attributes.
    if (!arg) {
      effect(() => {
        const values = ev<Record<string, unknown>>();
        if (values && typeof values === 'object') {
          for (const [name, value] of Object.entries(values)) applyBinding(el, name, value);
        }
      });
      return;
    }
    if (arg === 'key') return; // consumed by v-for
    const asProp = !!modifiers.prop;
    // `.dangerous` is the explicit way to request a binding that writes executable markup.
    // Without it, `:srcdoc` is refused.
    const allowDangerous = !!modifiers.dangerous;
    effect(() => {
      applyBinding(el, arg, ev(), asProp, allowDangerous);
    });
    void expression;
  },
  { priority: PRIORITY.BIND }
);

defineDirective('class', ({ el, effect, evaluate: ev }) => {
  effect(() => applyClass(el, ev()));
});

defineDirective('style', ({ el, effect, evaluate: ev }) => {
  effect(() => applyStyle(el, ev()));
});

// ---------------------------------------------------------------------------
// v-on, @event and shortcuts
// ---------------------------------------------------------------------------

const KEY_ALIASES: Record<string, string[]> = {
  enter: ['Enter'],
  esc: ['Escape'],
  escape: ['Escape'],
  space: [' ', 'Spacebar'],
  tab: ['Tab'],
  delete: ['Delete', 'Backspace'],
  backspace: ['Backspace'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
};

const SYSTEM_MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const;

/**
 * Executes the expression of an event. If the expression is just the name of a
 * function, it is called with the event (or with `detail`, when coming from `emit`).
 */
export function runHandler(expression: string, scope: Scope, event: Event, el: HTMLElement): void {
  const payload = (event as CustomEvent).detail;
  const isEmit = (event as any).__voodoo === true;
  // In an event coming from `emit`, `$event` delivers the payload directly, which
  // is what the person expects when writing `@saved="last = $event"`. The raw event
  // remains available in `$rawEvent`.
  const local = scope.child({
    $event: isEmit ? payload : event,
    $rawEvent: event,
    $el: el,
    $detail: payload,
  });

  try {
    const node = parse(expression);
    const value = evaluate(node, local);
    // `v-click="save"` calls the found function.
    if (typeof value === 'function' && (node.t === 'id' || node.t === 'member')) {
      value.call(scope.data, isEmit ? payload : event);
    }
  } catch (err) {
    handleError(err, `event ${event.type} ("${expression}")`);
  }
}

/**
 * Friendly aliases. `@hover` is more legible than `@mouseenter`, and `@tap`
 * works the same on touch and mouse.
 */
const EVENT_ALIASES: Record<string, string> = {
  hover: 'mouseenter',
  unhover: 'mouseleave',
  tap: 'click',
  press: 'pointerdown',
  release: 'pointerup',
  rightclick: 'contextmenu',
  enterkey: 'keydown',
  type: 'input',
  submitform: 'submit',
};

export type CustomEventInstaller = (
  el: HTMLElement,
  run: (event: Event) => void,
  modifiers: Record<string, string | true>,
  cleanup: (fn: () => void) => void
) => void;

/**
 * Events that Voodoo creates on top of natives: hold, click outside, swipe and
 * screen entry. Plugins can register theirs with `V.event()`.
 */
export const customEvents: Record<string, CustomEventInstaller> = {
  /** Hold pressed. Duration via modifier, like `@hold.1s`. */
  hold(el, run, modifiers, cleanup) {
    const holdFor = parseDuration(
      (typeof modifiers.duration === 'string' && modifiers.duration) ||
        Object.keys(modifiers).find((m) => /^[\d.]+(ms|s)?$/.test(m)) ||
        el.getAttribute(`${config.prefix}hold-duration`) ||
        800,
      800
    );

    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;

    const start = (event: Event): void => {
      fired = false;
      el.classList.add('v-holding');
      el.style.setProperty('--v-hold-duration', `${holdFor}ms`);
      timer = setTimeout(() => {
        fired = true;
        el.classList.remove('v-holding');
        run(event);
      }, holdFor);
    };
    const stopHold = (): void => {
      if (timer) clearTimeout(timer);
      timer = null;
      el.classList.remove('v-holding');
    };
    // Prevents normal click from firing right after a completed hold.
    const swallowClick = (event: Event): void => {
      if (fired) {
        event.preventDefault();
        event.stopPropagation();
        fired = false;
      }
    };

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stopHold);
    el.addEventListener('pointerleave', stopHold);
    el.addEventListener('pointercancel', stopHold);
    el.addEventListener('click', swallowClick, true);

    cleanup(() => {
      stopHold();
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointerup', stopHold);
      el.removeEventListener('pointerleave', stopHold);
      el.removeEventListener('pointercancel', stopHold);
      el.removeEventListener('click', swallowClick, true);
    });
  },

  /** Click anywhere outside the element. */
  outside(el, run, _modifiers, cleanup) {
    const handler = (event: Event): void => {
      if (!el.isConnected) return;
      if (el === event.target || el.contains(event.target as Node)) return;
      run(event);
    };
    document.addEventListener('click', handler, true);
    cleanup(() => document.removeEventListener('click', handler, true));
  },

  /** Element entered visible area. */
  visible(el, run, modifiers, cleanup) {
    if (typeof IntersectionObserver === 'undefined') {
      run(new CustomEvent('visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(new CustomEvent('visible', { detail: entry }));
          // Without the `.repeat` modifier, the event happens just once.
          if (modifiers.repeat !== true) observer.unobserve(el);
        }
      },
      { threshold: Number(modifiers.threshold ?? 0.1), rootMargin: String(modifiers.margin ?? '0px') }
    );
    observer.observe(el);
    cleanup(() => observer.disconnect());
  },
};

/** Installs the four swipe directions using pointer events. */
for (const direction of ['left', 'right', 'up', 'down'] as const) {
  customEvents[`swipe${direction}`] = (el, run, _modifiers, cleanup) => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const down = (event: PointerEvent): void => {
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    };
    const up = (event: PointerEvent): void => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const threshold = 40;
      const matched =
        direction === 'left'
          ? dx < -threshold && Math.abs(dx) > Math.abs(dy)
          : direction === 'right'
            ? dx > threshold && Math.abs(dx) > Math.abs(dy)
            : direction === 'up'
              ? dy < -threshold && Math.abs(dy) > Math.abs(dx)
              : dy > threshold && Math.abs(dy) > Math.abs(dx);
      if (matched) run(new CustomEvent(`swipe${direction}`, { detail: { dx, dy } }));
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    cleanup(() => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    });
  };
}

function bindEvent(
  el: HTMLElement,
  rawEventName: string,
  expression: string,
  scope: Scope,
  modifiers: Record<string, string | true>,
  cleanup: (fn: () => void) => void
): void {
  const eventName = EVENT_ALIASES[rawEventName] ?? rawEventName;

  // Synthetic events have their own installation.
  const custom = customEvents[rawEventName];
  if (custom) {
    custom(
      el,
      (event) => {
        if (modifiers.prevent) event.preventDefault();
        if (modifiers.stop) event.stopPropagation();
        runHandler(expression, scope, event, el);
      },
      modifiers,
      cleanup
    );
    return;
  }

  const target: EventTarget = modifiers.window
    ? window
    : modifiers.document
      ? document
      : modifiers.outside
        ? document
        : el;

  let handler = (event: Event): void => {
    if (modifiers.self && event.target !== el) return;
    if (modifiers.outside) {
      if (el === event.target || el.contains(event.target as Node)) return;
      if (!el.isConnected) return;
    }

    // Key filter.
    if (event instanceof KeyboardEvent) {
      for (const mod of SYSTEM_MODIFIERS) {
        if (modifiers[mod] && !(event as any)[`${mod}Key`]) return;
      }
      const keyMods = Object.keys(modifiers).filter(
        (m) => m in KEY_ALIASES || /^[a-z0-9]$/.test(m)
      );
      if (keyMods.length) {
        const matched = keyMods.some((m) => {
          const aliases = KEY_ALIASES[m];
          if (aliases) return aliases.includes(event.key);
          return event.key.toLowerCase() === m;
        });
        if (!matched) return;
      }
    }

    if (modifiers.prevent) event.preventDefault();
    if (modifiers.stop) event.stopPropagation();

    runHandler(expression, scope, event, el);
  };

  const wait = modifiers.debounce;
  if (wait !== undefined) {
    handler = debounce(handler, parseDuration(wait === true ? 250 : wait, 250));
  }
  const throttleWait = modifiers.throttle;
  if (throttleWait !== undefined) {
    handler = throttle(handler, parseDuration(throttleWait === true ? 250 : throttleWait, 250));
  }

  const options: AddEventListenerOptions = {
    capture: !!modifiers.capture,
    once: !!modifiers.once,
    passive: !!modifiers.passive,
  };

  target.addEventListener(eventName, handler, options);
  cleanup(() => target.removeEventListener(eventName, handler, options));
}

defineDirective('on', ({ el, arg, expression, scope, modifiers, cleanup }) => {
  if (!arg) return;
  bindEvent(el, arg, expression, scope, modifiers, cleanup);
});

/** Shortcuts like `v-click`, which are equivalent to `v-on:click`. */
const EVENT_SHORTCUTS = [
  'click',
  'dblclick',
  'input',
  'change',
  'keyup',
  'keydown',
  'keypress',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mousedown',
  'mouseup',
  'contextmenu',
  'wheel',
  'paste',
  'dragstart',
  'dragover',
  'dragleave',
  'drop',
];

for (const name of EVENT_SHORTCUTS) {
  defineDirective(name, ({ el, expression, scope, modifiers, cleanup }) => {
    bindEvent(el, name, expression, scope, modifiers, cleanup);
  });
}

// ---------------------------------------------------------------------------
// v-model
// ---------------------------------------------------------------------------

defineDirective(
  'model',
  ({ el, expression, scope, modifiers, effect, cleanup }) => {
    const input = el as HTMLInputElement;
    const tag = input.tagName;
    const type = (input.getAttribute('type') || 'text').toLowerCase();

    const isCheckbox = tag === 'INPUT' && type === 'checkbox';
    const isRadio = tag === 'INPUT' && type === 'radio';
    const isSelect = tag === 'SELECT';
    const isMultiSelect = isSelect && (input as unknown as HTMLSelectElement).multiple;
    const isFile = tag === 'INPUT' && type === 'file';
    const isNumberInput = type === 'number' || type === 'range';

    const lazy = !!modifiers.lazy;
    const wantsNumber = !!modifiers.number || isNumberInput;
    const wantsTrim = !!modifiers.trim;
    const debounceMs = modifiers.debounce
      ? parseDuration(modifiers.debounce === true ? 250 : modifiers.debounce, 250)
      : el.getAttribute(`${config.prefix}debounce`)
        ? parseDuration(el.getAttribute(`${config.prefix}debounce`)!, 250)
        : 0;

    const eventName = lazy || isSelect || isCheckbox || isRadio || isFile ? 'change' : 'input';

    // DOM -> state
    let onInput = (): void => {
      let value: unknown;

      if (isCheckbox) {
        const current = evaluateIn(expression, scope, 'v-model');
        if (Array.isArray(current)) {
          const itemValue = input.value;
          const list = [...current];
          const index = list.indexOf(itemValue);
          if (input.checked && index === -1) list.push(itemValue);
          else if (!input.checked && index > -1) list.splice(index, 1);
          value = list;
        } else {
          value = input.checked;
        }
      } else if (isRadio) {
        if (!input.checked) return;
        value = input.value;
      } else if (isMultiSelect) {
        value = Array.from((input as unknown as HTMLSelectElement).selectedOptions).map(
          (option) => option.value
        );
      } else if (isFile) {
        value = modifiers.single ? input.files?.[0] ?? null : input.files;
      } else {
        value = input.value;
        if (wantsTrim && typeof value === 'string') value = value.trim();
        if (wantsNumber && typeof value === 'string') {
          const n = value === '' ? null : Number(value);
          value = n === null || Number.isNaN(n) ? value : n;
        }
      }

      setValue(expression, scope, value);
    };

    if (debounceMs > 0) onInput = debounce(onInput, debounceMs);

    input.addEventListener(eventName, onInput);
    cleanup(() => input.removeEventListener(eventName, onInput));

    // state -> DOM
    effect(() => {
      const value = evaluateIn(expression, scope, 'v-model');

      if (isCheckbox) {
        input.checked = Array.isArray(value) ? value.includes(input.value) : !!value;
        return;
      }
      if (isRadio) {
        input.checked = String(value) === input.value;
        return;
      }
      if (isMultiSelect) {
        const list = Array.isArray(value) ? value.map(String) : [];
        for (const option of Array.from((input as unknown as HTMLSelectElement).options)) {
          option.selected = list.includes(option.value);
        }
        return;
      }
      if (isFile) return; // file inputs are read-only

      const next = value == null ? '' : String(value);
      if (input.value !== next) input.value = next;

      // `<select>` may receive options later. Reapplies in the next cycle.
      if (isSelect && input.value !== next) {
        void nextTick(() => {
          if (input.value !== next) input.value = next;
        });
      }
    });
  },
  { priority: PRIORITY.MODEL }
);

// ---------------------------------------------------------------------------
// v-init, v-ref, v-effect, v-watch, v-cloak, v-once
// ---------------------------------------------------------------------------

defineDirective(
  'init',
  ({ el, expression, scope }) => {
    queuePostFlush(() => {
      const local = scope.child({ $el: el });
      const value = evaluateIn(expression, local, 'v-init');
      if (typeof value === 'function') value.call(scope.data);
    });
  },
  { priority: PRIORITY.INIT }
);

defineDirective(
  'ref',
  ({ el, expression, scope, cleanup }) => {
    const name = expression.trim();
    if (!name) return;
    const target = scope.owner ?? scope;
    target.refs[name] = el;
    cleanup(() => {
      if (target.refs[name] === el) delete target.refs[name];
    });
  },
  { priority: PRIORITY.REF }
);

defineDirective('effect', ({ effect, evaluate: ev }) => {
  effect(() => {
    ev();
  });
});

defineDirective('watch', ({ el, expression, scope, effect }) => {
  // Observes the value of `v-model` on the same element and calls the expression.
  const modelExpression = el.getAttribute(`${config.prefix}model`);
  let previous: unknown;
  let first = true;

  effect(() => {
    const value = modelExpression
      ? evaluateIn(modelExpression, scope, 'v-watch')
      : evaluateIn(expression, scope, 'v-watch');

    if (first) {
      first = false;
      previous = value;
      return;
    }
    if (value === previous) return;
    const old = previous;
    previous = value;

    if (modelExpression) {
      const local = scope.child({ $value: value, $old: old, $el: el });
      const result = evaluateIn(expression, local, 'v-watch');
      if (typeof result === 'function') result.call(scope.data, value, old);
    }
  });
});

defineDirective('cloak', ({ el }) => {
  el.removeAttribute(`${config.prefix}cloak`);
});

defineDirective('once', ({ el, effect, evaluate: ev }) => {
  // Evaluates once only and does not create reactive effect.
  void effect;
  const value = ev();
  if (value !== undefined) el.textContent = stringify(value);
});

// ---------------------------------------------------------------------------
// v-teleport
// ---------------------------------------------------------------------------

defineDirective(
  'teleport',
  ({ el, expression, cleanup }) => {
    const selector = expression.trim() || 'body';
    const target =
      selector === 'body' ? document.body : (document.querySelector(selector) as HTMLElement | null);
    if (!target) {
      handleError(new Error(`v-teleport destination not found: ${selector}`), 'v-teleport');
      return;
    }
    const placeholder = document.createComment(' v-teleport ');
    el.parentNode?.insertBefore(placeholder, el);
    target.appendChild(el);

    cleanup(() => {
      placeholder.parentNode?.insertBefore(el, placeholder);
      placeholder.remove();
    });
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// v-transition and auxiliary classes: registered to not generate warnings
// ---------------------------------------------------------------------------

for (const name of [
  'transition',
  'enter-class',
  'enter-active-class',
  'enter-to-class',
  'leave-class',
  'leave-active-class',
  'leave-to-class',
  'duration',
  'key',
  'slot',
  'ignore',
  'pre',
]) {
  defineDirective(name, () => undefined, { priority: PRIORITY.TRANSITION });
}

// ---------------------------------------------------------------------------
// v-data and v-component
// ---------------------------------------------------------------------------

// The walker handles these two directly, because they create the scope used by
// the rest of the element. The registration exists so that priority ordering,
// attribute cleanup and the inspector recognize them as real directives.
defineDirective('data', () => undefined, { priority: PRIORITY.DATA });
defineDirective('component', () => undefined, { priority: PRIORITY.COMPONENT });
