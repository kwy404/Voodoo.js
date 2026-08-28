/**
 * @module directives/state
 *
 * Recursos de estado que nenhuma biblioteca do mesmo porte oferece de forma
 * declarativa:
 *
 * - `v-persist`: o estado sobrevive ao recarregar a pagina.
 * - `v-sync`: o estado acompanha as outras abas abertas, ao vivo.
 * - `v-history`: desfazer e refazer de graca, com `v-undo` e `v-redo`.
 *
 * ```html
 * <div v-data="{ tema: 'escuro', rascunho: '' }" v-persist="editor" v-sync>
 *   <textarea v-model="rascunho"></textarea>
 * </div>
 * ```
 */

import { reactive, watch, toRaw, handleError } from '../reactivity';
import { defineDirective, PRIORITY } from '../runtime/registry';
import { magic } from '../runtime/scope';
import { storage } from '../storage';
import { debounce, parseDuration } from '../utils';

/** Remove funcoes e valores nao serializaveis antes de gravar. */
function serializable(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') continue;
    if (key.startsWith('$')) continue;
    try {
      JSON.stringify(value);
      out[key] = toRaw(value);
    } catch {
      // Valor circular ou exotico: fica de fora do que e salvo.
    }
  }
  return out;
}

/** Chave estavel para um elemento, quando nenhuma foi informada. */
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

    // Restaura o que foi salvo, sem apagar chaves que o estado declarou agora.
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

    cleanup(() => {
      save.flush();
      stopWatching();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);

// ---------------------------------------------------------------------------
// v-sync: estado compartilhado entre abas
// ---------------------------------------------------------------------------

defineDirective(
  'sync',
  ({ el, scope, expression, cleanup }) => {
    if (typeof BroadcastChannel === 'undefined') return;

    const name = expression.trim() || autoKey(el, 'voodoo:sync');
    const channel = new BroadcastChannel(name);
    // Identifica esta aba, para nao reagir ao proprio envio.
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
      // Libera no proximo ciclo, depois que os efeitos rodarem.
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
// v-history, v-undo e v-redo
// ---------------------------------------------------------------------------

export interface HistoryController {
  canUndo: boolean;
  canRedo: boolean;
  /** Quantidade de estados guardados. */
  size: number;
  undo(): void;
  redo(): void;
  /** Apaga o historico e recomeca do estado atual. */
  clear(): void;
}

const controllers = new WeakMap<HTMLElement, HistoryController>();

/** Controlador de historico mais proximo, subindo pelos ancestrais. */
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

      // Escrever depois de desfazer descarta o futuro, como em qualquer editor.
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
// v-storage: liga um campo direto ao localStorage
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

// A variavel magica so existe quando ha um `v-history` acima na arvore.
magic('$history', (scope) => (scope.el ? findController(scope.el as HTMLElement) : null));
