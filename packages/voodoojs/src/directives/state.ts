/**
 * @module directives/state
 *
 * State features that no library of the same size offers declaratively:
 *
 * - `v-persist`: state survives page reload.
 * - `v-sync`: state follows other open tabs in real-time.
 * - `v-history`: undo and redo for free, with `v-undo` and `v-redo`.
 *
 * ```html
 * <div v-data="{ theme: 'dark', draft: '' }" v-persist="editor" v-sync>
 *   <textarea v-model="draft"></textarea>
 * </div>
 * ```
 */

import { reactive, watch, toRaw, handleError } from '../reactivity';
import { defineDirective, PRIORITY } from '../runtime/registry';
import { magic } from '../runtime/scope';
import { storage } from '../storage';
import { debounce, parseDuration } from '../utils';

/** Removes functions and non-serializable values before saving. */
function serializable(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') continue;
    if (key.startsWith('$')) continue;
    try {
      JSON.stringify(value);
      out[key] = toRaw(value);
    } catch {
      // Circular or exotic value: stays out of what is saved.
    }
  }
  return out;
}

/** Stable key for an element, when none was provided. */
function autoKey(el: HTMLElement, prefix: string): string {
  if (el.id) return `${prefix}:${location.pathname}:#${el.id}`;
  const path: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.body) {
    const parent: Element | null = current.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current) : 0;
    path.unshift(`${current.tagName.toLowerCase()}${index}`);
    current = parent;
  }
  return `${prefix}:${location.pathname}:${path.join('>')}`;
}

// ---------------------------------------------------------------------------
// v-persist
// ---------------------------------------------------------------------------

defineDirective(
  'persist',
  ({ el, scope, expression, cleanup }) => {
    const key = expression.trim()
      ? `voodoo:persist:${expression.trim()}`
      : autoKey(el, 'voodoo:persist');

    // Restores what was saved, without deleting keys that state just declared.
    const saved = storage.get<Record<string, unknown>>(key);
    if (saved && typeof saved === 'object') {
      for (const [prop, value] of Object.entries(saved)) {
        if (prop in scope.data) scope.data[prop] = value;
      }
    }

    const save = debounce(() => {
      storage.set(key, serializable(scope.data));
    }, 120);

    const stopWatching = watch(scope.data, () => save(), { deep: true });

    // Also saves the initial state, so the key exists from the first
    // load, even if the user does not change anything.
    save();

    cleanup(() => {
      save.flush();
      stopWatching();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// v-sync: state shared between tabs
// ---------------------------------------------------------------------------

defineDirective(
  'sync',
  ({ el, scope, expression, cleanup }) => {
    if (typeof BroadcastChannel === 'undefined') return;

    const name = expression.trim() || autoKey(el, 'voodoo:sync');
    const channel = new BroadcastChannel(name);
    // Identifies this tab, so it doesn't react to its own send.
    const senderId = Math.random().toString(36).slice(2);
    let applyingRemote = false;

    const send = debounce(() => {
      if (applyingRemote) return;
      try {
        channel.postMessage({ from: senderId, state: serializable(scope.data) });
      } catch (err) {
        handleError(err, 'v-sync');
      }
    }, 60);

    channel.addEventListener('message', (event: MessageEvent) => {
      const payload = event.data as { from: string; state: Record<string, unknown> };
      if (!payload || payload.from === senderId) return;
      applyingRemote = true;
      for (const [prop, value] of Object.entries(payload.state)) {
        if (prop in scope.data && scope.data[prop] !== value) scope.data[prop] = value;
      }
      // Releases in the next cycle, after effects run.
      queueMicrotask(() => {
        applyingRemote = false;
      });
    });

    const stopWatching = watch(scope.data, () => send(), { deep: true });

    cleanup(() => {
      stopWatching();
      channel.close();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// v-history, v-undo, and v-redo
// ---------------------------------------------------------------------------

export interface HistoryController {
  canUndo: boolean;
  canRedo: boolean;
  /** Number of saved states. */
  size: number;
  undo(): void;
  redo(): void;
  /** Clears history and restarts from the current state. */
  clear(): void;
}

const controllers = new WeakMap<HTMLElement, HistoryController>();

/** Closest history controller, walking up ancestors. */
function findController(el: HTMLElement): HistoryController | null {
  let current: HTMLElement | null = el;
  while (current) {
    const found = controllers.get(current);
    if (found) return found;
    current = current.parentElement;
  }
  return null;
}

defineDirective(
  'history',
  ({ el, scope, expression, cleanup }) => {
    const limit = Number(expression) || 50;
    const snapshots: Array<Record<string, unknown>> = [
      JSON.parse(JSON.stringify(serializable(scope.data))),
    ];
    let position = 0;
    let restoring = false;

    const controller = reactive({
      canUndo: false,
      canRedo: false,
      size: 1,
      undo(): void {
        if (position <= 0) return;
        position--;
        apply();
      },
      redo(): void {
        if (position >= snapshots.length - 1) return;
        position++;
        apply();
      },
      clear(): void {
        snapshots.length = 0;
        snapshots.push(JSON.parse(JSON.stringify(serializable(scope.data))));
        position = 0;
        sync();
      },
    }) as HistoryController;

    function sync(): void {
      controller.canUndo = position > 0;
      controller.canRedo = position < snapshots.length - 1;
      controller.size = snapshots.length;
    }

    function apply(): void {
      restoring = true;
      const snapshot = snapshots[position];
      for (const [prop, value] of Object.entries(snapshot)) {
        scope.data[prop] = JSON.parse(JSON.stringify(value));
      }
      sync();
      queueMicrotask(() => {
        restoring = false;
      });
    }

    const record = debounce(() => {
      if (restoring) return;
      const current = JSON.stringify(serializable(scope.data));
      if (current === JSON.stringify(snapshots[position])) return;

      // Writing after undo discards the future, like any editor.
      snapshots.splice(position + 1);
      snapshots.push(JSON.parse(current));
      if (snapshots.length > limit) snapshots.shift();
      position = snapshots.length - 1;
      sync();
    }, parseDuration(el.getAttribute('v-history-debounce') ?? undefined, 300));

    const stopWatching = watch(scope.data, () => record(), { deep: true });

    controllers.set(el, controller);
    scope.set('$history', controller);

    cleanup(() => {
      stopWatching();
      record.cancel();
      controllers.delete(el);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);

defineDirective('undo', ({ el, cleanup }) => {
  const handler = (): void => findController(el)?.undo();
  el.addEventListener('click', handler);
  cleanup(() => el.removeEventListener('click', handler));
});

defineDirective('redo', ({ el, cleanup }) => {
  const handler = (): void => findController(el)?.redo();
  el.addEventListener('click', handler);
  cleanup(() => el.removeEventListener('click', handler));
});

// ---------------------------------------------------------------------------
// v-storage: wires a field directly to localStorage
// ---------------------------------------------------------------------------

defineDirective('storage', ({ el, expression, cleanup, scope }) => {
  const key = expression.trim();
  if (!key) return;
  const input = el as HTMLInputElement;

  const saved = storage.get<string>(`voodoo:field:${key}`);
  if (saved != null && 'value' in input) input.value = String(saved);

  const handler = (): void => {
    storage.set(`voodoo:field:${key}`, input.value);
  };
  input.addEventListener('input', handler);
  cleanup(() => input.removeEventListener('input', handler));
  void scope;
});

// The magic variable only exists when there is a `v-history` above in the tree.
magic('$history', (scope) => (scope.el ? findController(scope.el as HTMLElement) : null));
