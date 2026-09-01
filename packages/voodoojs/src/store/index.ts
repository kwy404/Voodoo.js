/**
 * @module store
 *
 * Reactive global state. A store is a named reactive object, accessible from
 * any expression via the magic variable `$store`.
 *
 * ```js
 * V.store('cart', { items: [], get total() { return this.items.length } })
 * ```
 *
 * ```html
 * <span>{ $store.cart.total }</span>
 * <button v-click="$store.cart.items.push(product)">Add</button>
 * ```
 */

import { reactive, ref, toRaw, watch, type WatchStopHandle } from '../reactivity';

export type StoreDefinition = Record<string, any>;

const stores = new Map<string, Record<string, any>>();

/**
 * Version of the store set. Reading this reference inside the `$store` proxy
 * causes creating a new store to update anyone already on screen waiting for it,
 * even if registration happens after load.
 */
const versao = ref(0);
const persistHandles = new Map<string, WatchStopHandle>();

export interface StoreOptions {
  /** Saves the store to localStorage and restores on next load. */
  persist?: boolean | string;
}

/**
 * Creates or retrieves a store.
 *
 * Passing only the name returns the existing store. Passing the definition
 * creates the store. Methods declared in the definition receive `this` pointing
 * to the store itself.
 */
export function store<T extends StoreDefinition>(
  name: string,
  definition?: T,
  options: StoreOptions = {}
): T {
  const existing = stores.get(name);
  if (!definition) {
    if (!existing) {
      const created = reactive({}) as T;
      stores.set(name, created);
      return created;
    }
    return existing as T;
  }

  if (existing) {
    // Redefining an existing store updates values without changing the reference.
    Object.assign(existing, definition);
    return existing as T;
  }

  const key = typeof options.persist === 'string' ? options.persist : `voodoo:store:${name}`;

  // Copy by descriptor, not by spread.
  //
  // `{ ...definition }` calls the getter at copy time and stores the result,
  // so `get total() { return this.items.length }` would become a fixed number,
  // which is exactly opposite to what the person wrote. With descriptors, the
  // getter remains a getter, and the reactive proxy executes it on each read,
  // tracking dependencies inside it.
  const descritores = Object.getOwnPropertyDescriptors(definition);
  const initial: Record<string, any> = Object.defineProperties({}, descritores);

  if (options.persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const salvo = JSON.parse(saved) as Record<string, unknown>;
        // Only restores what is given. Writing over a getter without a setter
        // would fail, and derived values don't need to be restored: they
        // recalculate themselves from what was saved.
        for (const [chave, valor] of Object.entries(salvo)) {
          if (descritores[chave] && !('value' in descritores[chave])) continue;
          initial[chave] = valor;
        }
      }
    } catch {
      // Corrupted data: keep the initial state from the definition.
    }
  }

  const created = reactive(initial) as T;

  // Binds methods to the store itself. Reading is by descriptor to avoid
  // triggering getters unnecessarily.
  for (const [prop, descritor] of Object.entries(descritores)) {
    const value = descritor.value;
    if (typeof value === 'function') {
      (created as Record<string, any>)[prop] = (...args: unknown[]) => value.apply(created, args);
    }
  }

  stores.set(name, created);
  versao.value++;

  if (options.persist && typeof localStorage !== 'undefined') {
    const stop = watch(
      created,
      () => {
        try {
          localStorage.setItem(key, JSON.stringify(stripFunctions(created)));
        } catch {
          // Quota exceeded: the store keeps working in memory.
        }
      },
      { deep: true }
    );
    persistHandles.set(name, stop);
  }

  return created;
}

function stripFunctions(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  // Getter-derived values are left out: they recalculate themselves on next load,
  // and saving the result would only create a chance to get out of sync.
  const descritores = Object.getOwnPropertyDescriptors(toRaw(source));
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') continue;
    if (descritores[key] && !('value' in descritores[key])) continue;
    out[key] = value;
  }
  return out;
}

/** All registered stores, used by `$store` and devtools. */
export const allStores: Record<string, Record<string, any>> = new Proxy(
  {},
  {
    get: (_t, key: string) => {
      void versao.value; // subscribes to new store creation
      return stores.get(key);
    },
    has: (_t, key: string) => {
      void versao.value;
      return stores.has(key as string);
    },
    ownKeys: () => [...stores.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  }
);

/** Removes a store and stops its associated persistence. */
export function removeStore(name: string): void {
  persistHandles.get(name)?.();
  persistHandles.delete(name);
  stores.delete(name);
}

/** Lists the names of existing stores. */
export function storeNames(): string[] {
  return [...stores.keys()];
}
