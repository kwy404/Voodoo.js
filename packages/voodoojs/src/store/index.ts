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

import { reactive, ref, toRaw, watch, type WatchStopHandle } from '../reactivity';

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

  // Copia por descritor, e nao por espalhamento.
  //
  // `{ ...definition }` chama o getter na hora da copia e guarda o resultado,
  // entao `get total() { return this.itens.length }` viraria um numero fixo,
  // que e exatamente o contrario do que a pessoa escreveu. Com os descritores o
  // getter continua sendo getter, e o proxy reativo o executa a cada leitura,
  // rastreando as dependencias de dentro dele.
  const descritores = Object.getOwnPropertyDescriptors(definition);
  const initial: Record<string, any> = Object.defineProperties({}, descritores);

  if (options.persist && typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const salvo = JSON.parse(saved) as Record<string, unknown>;
        // So repoe o que e dado. Escrever por cima de um getter sem setter
        // falharia, e valor derivado nao precisa ser restaurado: ele se
        // recalcula sozinho a partir do que foi.
        for (const [chave, valor] of Object.entries(salvo)) {
          if (descritores[chave] && !('value' in descritores[chave])) continue;
          initial[chave] = valor;
        }
      }
    } catch {
      // Dados corrompidos: mantem o estado inicial da definicao.
    }
  }

  const created = reactive(initial) as T;

  // Liga os metodos ao proprio store. A leitura e por descritor para nao
  // disparar os getters sem necessidade.
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
  // Valor derivado de getter fica de fora: ele se recalcula sozinho no proximo
  // carregamento, e gravar o resultado so criaria chance de ficar desatualizado.
  const descritores = Object.getOwnPropertyDescriptors(toRaw(source));
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'function') continue;
    if (descritores[key] && !('value' in descritores[key])) continue;
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
