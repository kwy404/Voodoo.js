/**
 * @module store
 *
 * Estado global reativo. Um store e um objeto reativo nomeado, acessivel de
 * qualquer expressao pela variavel magica `$store`.
 *
 * ```js
 * V.store('carrinho', { itens: [], get total() { return this.itens.length } })
 * ```
 *
 * ```html
 * <span>{ $store.carrinho.total }</span>
 * <button v-click="$store.carrinho.itens.push(produto)">Adicionar</button>
 * ```
 */

import { reactive, ref, watch, type WatchStopHandle } from '../reactivity';

export type StoreDefinition = Record<string, any>;

const stores = new Map<string, Record<string, any>>();

/**
 * Versao do conjunto de stores. Ler esta referencia dentro do proxy `$store`
 * faz com que criar um store novo atualize quem ja estava na tela esperando
 * por ele, mesmo que o registro aconteca depois do carregamento.
 */
const versao = ref(0);
const persistHandles = new Map<string, WatchStopHandle>();

export interface StoreOptions {
  /** Salva o store no localStorage e restaura no proximo carregamento. */
  persist?: boolean | string;
}

/**
 * Cria ou recupera um store.
 *
 * Passando apenas o nome, devolve o store existente. Passando a definicao,
 * cria o store. Metodos declarados na definicao recebem `this` apontando para
 * o proprio store.
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
    // Redefinir um store existente atualiza os valores sem trocar a referencia.
    Object.assign(existing, definition);
    return existing as T;
  }

  const key = typeof options.persist === 'string' ? options.persist : `voodoo:store:${name}`;

  let initial: Record<string, any> = { ...definition };
  if (options.persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) Object.assign(initial, JSON.parse(saved));
    } catch {
      // Dados corrompidos: mantem o estado inicial da definicao.
    }
  }

  const created = reactive(initial) as T;

  // Liga os metodos ao proprio store.
  for (const [prop, value] of Object.entries(definition)) {
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
          // Cota excedida: o store continua funcionando em memoria.
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
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') continue;
    out[key] = value;
  }
  return out;
}

/** Todos os stores registrados, usado por `$store` e pelas devtools. */
export const allStores: Record<string, Record<string, any>> = new Proxy(
  {},
  {
    get: (_t, key: string) => {
      void versao.value; // assina a criacao de stores novos
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

/** Remove um store e para a persistencia associada. */
export function removeStore(name: string): void {
  persistHandles.get(name)?.();
  persistHandles.delete(name);
  stores.delete(name);
}

/** Lista os nomes dos stores existentes. */
export function storeNames(): string[] {
  return [...stores.keys()];
}
