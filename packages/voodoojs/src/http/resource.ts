/**
 * @module http/resource
 *
 * Recurso reativo: uma requisicao com estado de carregamento, erro e dados
 * prontos para serem lidos direto no HTML.
 *
 * E o mesmo nucleo usado por `v-resource`. A directive apenas le a configuracao
 * dos atributos e chama esta funcao, entao o comportamento dos dois e sempre o
 * mesmo, sem logica duplicada.
 *
 * ```js
 * const produtos = V.resource('/api/produtos')
 * V.effect(() => console.log(produtos.loading, produtos.data))
 * await produtos.reload()
 * ```
 */

import { reactive } from '../reactivity';
import { http, HttpError, type HttpMethod } from './index';

export interface ResourceOptions {
  /** Verbo HTTP. Padrao `GET`. */
  method?: HttpMethod;
  /** Parametros de query. Uma funcao e reavaliada a cada requisicao. */
  params?:
    | Record<string, string | number | boolean | null | undefined>
    | (() => Record<string, string | number | boolean | null | undefined> | undefined);
  /** Tempo de cache da resposta, em ms. */
  cache?: number;
  /** Tentativas extras em caso de falha. */
  retry?: number;
  /** Milissegundos ate abortar. */
  timeout?: number;
  headers?: Record<string, string>;
  /** Caminho dentro do JSON da resposta, como `dados.itens`. */
  jsonPath?: string | null;
  /** Nao dispara a primeira requisicao sozinho. */
  manual?: boolean;
  /** Repete a requisicao a cada N ms enquanto a aba estiver visivel. */
  poll?: number;
  /** Chamado depois de cada resposta bem sucedida. */
  onSuccess?(data: unknown): void;
  /** Chamado quando a requisicao falha, com a mensagem ja extraida. */
  onError?(err: unknown, message: string): void;
}

export interface Resource<T = unknown> {
  /** Corpo da resposta, ja recortado por `jsonPath` quando houver. */
  data: T | null;
  /** `true` enquanto a requisicao esta em andamento. */
  loading: boolean;
  /** Erro da ultima tentativa, ou `null`. */
  error: (Error & { message: string }) | null;
  /** `true` depois da primeira resposta bem sucedida. */
  loaded: boolean;
  /** Refaz a requisicao. */
  reload(): Promise<void>;
  /** Troca os dados localmente, util para atualizacao otimista. */
  set(value: T): void;
  /** Cancela a requisicao em andamento e para a repeticao automatica. */
  stop(): void;
}

/** Caminha por um JSON usando um caminho com pontos. */
export function pick(value: unknown, path: string | null | undefined): unknown {
  if (!path) return value;
  let current: any = value;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/** Procura a mensagem que a API escreveu no corpo do erro. */
export function extractMessage(error: HttpError): string | null {
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return null;
  for (const key of ['message', 'error', 'detail', 'msg']) {
    const value = data[key];
    if (typeof value === 'string') return value;
  }
  return null;
}

/**
 * Cria um recurso reativo.
 *
 * @param url endereco fixo, ou funcao que devolve o endereco a cada chamada.
 *   Devolver vazio adia a requisicao, util enquanto um parametro nao existe.
 * @param options configuracao da requisicao e do ciclo de vida
 */
export function createResource<T = unknown>(
  url: string | (() => string),
  options: ResourceOptions = {}
): Resource<T> {
  const resolveUrl = (): string => (typeof url === 'function' ? url() : url);
  const resolveParams = ():
    | Record<string, string | number | boolean | null | undefined>
    | undefined => (typeof options.params === 'function' ? options.params() : options.params);

  // Cada `reload` cancela o anterior: sem isso, uma resposta antiga que
  // demorasse mais sobrescreveria a nova ao chegar depois.
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const resource = reactive({
    data: null,
    loading: false,
    error: null,
    loaded: false,

    async reload(): Promise<void> {
      const endereco = resolveUrl();
      if (!endereco) return;

      controller?.abort();
      const atual = (controller = new AbortController());

      resource.loading = true;
      resource.error = null;
      try {
        const response = await http.request({
          url: endereco,
          method: (options.method || 'GET').toUpperCase() as HttpMethod,
          params: resolveParams(),
          headers: options.headers,
          cache: options.cache || undefined,
          retry: options.retry ?? 0,
          timeout: options.timeout ?? http.defaults.timeout,
          signal: atual.signal,
        });
        // Uma resposta de requisicao ja cancelada nao mexe mais no estado.
        if (atual.signal.aborted) return;
        resource.data = pick(response.data, options.jsonPath) as never;
        resource.loaded = true;
        options.onSuccess?.(resource.data);
      } catch (err) {
        if (atual.signal.aborted) return;
        const message =
          err instanceof HttpError ? (extractMessage(err) ?? err.message) : (err as Error).message;
        resource.error = { name: 'ResourceError', message } as never;
        options.onError?.(err, message);
      } finally {
        if (!atual.signal.aborted) resource.loading = false;
        if (controller === atual) controller = null;
      }
    },

    set(value: unknown): void {
      resource.data = value as never;
    },

    stop(): void {
      controller?.abort();
      controller = null;
      // Parar no meio nao pode deixar a tela presa em "carregando".
      resource.loading = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  }) as Resource<T>;

  if (options.poll && options.poll > 0) {
    timer = setInterval(() => {
      // Aba escondida nao precisa continuar consultando o servidor.
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void resource.reload();
      }
    }, options.poll);
  }

  if (!options.manual) void resource.reload();

  return resource;
}
