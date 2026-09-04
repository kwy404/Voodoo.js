/**
 * @module hooks
 *
 * React-style hooks, reachable by bare name inside any expression.
 *
 * These are a thin surface over primitives the library already had — `effect`,
 * `computed`, `ref` and `store`. The value is not new machinery, it is that
 * someone arriving from React can write what they already know and have it mean
 * the right thing here.
 *
 * Two differences from React are deliberate, and both are improvements rather
 * than gaps:
 *
 * 1. `deps` is optional everywhere. Voodoo tracks reads through a Proxy, so a
 *    hook with no dependency array re-runs exactly when something it actually
 *    read changes. The array is there for when you want to narrow that, not
 *    because the library cannot work it out.
 *
 * 2. There is no rule against calling a hook in a branch. Slots are keyed per
 *    scope in call order within one evaluation, and `v-data` and `v-init` each
 *    evaluate once per scope, so the order is stable without a rule asking you
 *    to keep it stable.
 *
 * `useState` and `useMemo` return refs, and `reactive()` unwraps refs on read,
 * so inside `v-data` they read as plain values with no `.value` anywhere.
 * `useRef` deliberately does not: it returns a raw `{ current }` box that no
 * effect subscribes to, which is the whole point of it.
 */

import {
  computed,
  effect,
  markRaw,
  ref,
  stop,
  type EffectRunner,
  type Ref,
} from '../reactivity';
import { store, allStores } from '../store';
import { hook, type Scope } from '../runtime/scope';
import { addCleanup, currentHookHost } from '../runtime/walker';

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

interface Slot {
  kind: 'state' | 'effect' | 'memo' | 'ref';
  deps: unknown[] | null;
  value: unknown;
  runner?: EffectRunner;
  dispose?: () => void;
}

interface SlotTable {
  slots: Slot[];
  index: number;
  scheduled: boolean;
  bound: boolean;
}

/**
 * Keyed by element, not by scope.
 *
 * `v-data` is evaluated in the PARENT scope, before the child scope it defines
 * exists. Keying on the scope would therefore give every sibling `v-data` on a
 * page one shared slot table, and they would read each other's state. The
 * element being walked is unique per component instance, which is what a hook
 * slot is actually about.
 */
const tables = new WeakMap<Element | Scope, SlotTable>();

/**
 * Hook slots are positional, so the counter has to go back to zero when an
 * expression is evaluated again. Evaluation is synchronous, so a microtask is
 * exactly the right boundary: every hook in one pass gets a distinct slot, and
 * the next pass lines up with the same slots in the same order. Re-running an
 * expression therefore reuses its state instead of piling up a second copy.
 */
function tableFor(scope: Scope): SlotTable {
  const host = currentHookHost() ?? scope.el ?? scope;
  let table = tables.get(host);
  if (!table) {
    table = { slots: [], index: 0, scheduled: false, bound: false };
    tables.set(host, table);
  }

  // Stop every effect this element owns when it leaves the document.
  const el = currentHookHost() ?? scope.el;
  if (!table.bound && el) {
    table.bound = true;
    const owned = table;
    addCleanup(el, () => {
      for (const slot of owned.slots) {
        if (slot.dispose) slot.dispose();
        if (slot.runner) stop(slot.runner);
      }
      owned.slots.length = 0;
    });
  }

  if (!table.scheduled) {
    table.scheduled = true;
    const pending = table;
    queueMicrotask(() => {
      pending.index = 0;
      pending.scheduled = false;
    });
  }
  return table;
}

function nextSlot(scope: Scope, kind: Slot['kind']): Slot {
  const table = tableFor(scope);
  const at = table.index++;
  let slot = table.slots[at];
  if (!slot || slot.kind !== kind) {
    // A slot whose kind changed means the expression itself changed shape.
    // Drop what was there rather than reinterpreting it as the new kind.
    if (slot) {
      if (slot.dispose) slot.dispose();
      if (slot.runner) stop(slot.runner);
    }
    slot = { kind, deps: null, value: undefined };
    table.slots[at] = slot;
  }
  return slot;
}

/** True when the dependency array differs from the one recorded last time. */
function depsChanged(previous: unknown[] | null, next: unknown[] | null): boolean {
  if (!previous || !next) return true;
  if (previous.length !== next.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (!Object.is(previous[i], next[i])) return true;
  }
  return false;
}

function normalizeDeps(deps: unknown): unknown[] | null {
  return Array.isArray(deps) ? deps.slice() : null;
}

// ---------------------------------------------------------------------------
// The hooks
// ---------------------------------------------------------------------------

/**
 * A value that survives re-evaluation and re-renders whatever reads it.
 *
 * Returns a ref. Written into `v-data` it reads and assigns as a plain value,
 * because reactive objects unwrap refs, so `count++` works with no `.value`.
 */
export function useState<T>(scope: Scope, initial: T): Ref<T> {
  const slot = nextSlot(scope, 'state');
  if (slot.value === undefined) slot.value = ref(initial);
  return slot.value as Ref<T>;
}

/**
 * Runs a side effect, and re-runs it when what it depends on changes.
 *
 * With no dependency array it tracks its own reads and re-runs when any of them
 * change. With `[]` it runs once. With `[a, b]` it re-runs only when one of
 * those differs from last time. Returning a function from `fn` registers
 * cleanup, called before the next run and again when the element is removed.
 */
export function useEffect(
  scope: Scope,
  fn: () => void | (() => void),
  deps?: unknown
): void {
  const slot = nextSlot(scope, 'effect');
  const next = normalizeDeps(deps);

  const runCleanup = (): void => {
    if (slot.dispose) {
      const dispose = slot.dispose;
      slot.dispose = undefined;
      dispose();
    }
  };

  // An explicit array means the caller is choosing when this re-runs, so the
  // body must not also subscribe to whatever it happens to read.
  if (next) {
    const first = slot.deps === null && !slot.runner;
    if (first || depsChanged(slot.deps, next)) {
      slot.deps = next;
      runCleanup();
      const result = fn();
      if (typeof result === 'function') slot.dispose = result as () => void;
    }
    return;
  }

  if (slot.runner) return;
  slot.deps = null;
  slot.runner = effect(() => {
    runCleanup();
    const result = fn();
    if (typeof result === 'function') slot.dispose = result as () => void;
  });
}

/**
 * Caches a computation.
 *
 * With no dependency array it becomes a `computed`: lazy, cached, and
 * recomputed only when something it read actually changed. With an array it
 * recomputes when that array changes. Returns a ref, so inside `v-data` it
 * reads as the value itself.
 */
export function useMemo<T>(scope: Scope, fn: () => T, deps?: unknown): Ref<T> {
  const slot = nextSlot(scope, 'memo');
  const next = normalizeDeps(deps);

  if (!next) {
    if (!slot.value) slot.value = computed(fn);
    return slot.value as Ref<T>;
  }

  if (!slot.value) {
    slot.value = ref(fn());
    slot.deps = next;
  } else if (depsChanged(slot.deps, next)) {
    slot.deps = next;
    (slot.value as Ref<T>).value = fn();
  }
  return slot.value as Ref<T>;
}

/**
 * A box that survives re-evaluation and that nothing subscribes to.
 *
 * Use it for a DOM element, a timer id, or a previous value — anything you want
 * to keep without the page reacting when it changes. Deliberately not a ref, so
 * reading `.current` inside an effect does not make that effect depend on it.
 */
export function useRef<T>(scope: Scope, initial: T): { current: T } {
  const slot = nextSlot(scope, 'ref');
  if (!slot.value) slot.value = markRaw({ current: initial });
  return slot.value as { current: T };
}

/**
 * Shared state, reachable from any component without threading it through the
 * markup by hand.
 *
 * Backed by the store registry, so `useContext('user')` and `$store.user` are
 * the same object. Passing a second argument creates the store on first use.
 */
export function useContext<T extends Record<string, any>>(
  name: string,
  initial?: T
): T {
  if (initial !== undefined && !(name in allStores)) {
    store(name, initial);
  }
  return allStores[name] as T;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function installHooks(): void {
  hook('useState', (scope) => (initial: unknown) => useState(scope, initial));
  hook('useEffect', (scope) => (fn: () => void, deps?: unknown) =>
    useEffect(scope, fn, deps)
  );
  hook('useMemo', (scope) => (fn: () => unknown, deps?: unknown) =>
    useMemo(scope, fn, deps)
  );
  hook('useRef', (scope) => (initial: unknown) => useRef(scope, initial));
  hook('useContext', () => (name: string, initial?: Record<string, any>) =>
    useContext(name, initial)
  );
}
