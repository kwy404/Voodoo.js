/**
 * @module http/resource
 *
 * Reactive resource: a request with loading state, error, and data ready to be
 * read directly in HTML.
 *
 * It's the same core used by `v-resource`. The directive just reads the
 * configuration from attributes and calls this function, so the behavior of
 * both is always the same, with no duplicated logic.
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
  /** HTTP verb. Default `GET`. */
  method?: HttpMethod;
  /** Query parameters. A function is re-evaluated on each request. */
  params?:
    | Record<string, string | number | boolean | null | undefined>
    | (() => Record<string, string | number | boolean | null | undefined> | undefined);
  /** Response cache duration in ms. */
  cache?: number;
  /** Extra attempts on failure. */
  retry?: number;
  /** Milliseconds before aborting. */
  timeout?: number;
  headers?: Record<string, string>;
  /** Path within the JSON response, like `data.items`. */
  jsonPath?: string | null;
  /** Don't fire the first request automatically. */
  manual?: boolean;
  /** Repeat request every N ms while the tab is visible. */
  poll?: number;
  /** Called after each successful response. */
  onSuccess?(data: unknown): void;
  /** Called when request fails, with message already extracted. */
  onError?(err: unknown, message: string): void;
}

export interface Resource<T = unknown> {
  /** Response body, already sliced by `jsonPath` if present. */
  data: T | null;
  /** `true` while request is in progress. */
  loading: boolean;
  /** Error from last attempt, or `null`. */
  error: (Error & { message: string }) | null;
  /** `true` after first successful response. */
  loaded: boolean;
  /** Redo the request. */
  reload(): Promise<void>;
  /** Change data locally, useful for optimistic updates. */
  set(value: T): void;
  /** Cancel in-progress request and stop automatic repetition. */
  stop(): void;
}

/** Walk through JSON using a dot-separated path. */
export function pick(value: unknown, path: string | null | undefined): unknown {
  if (!path) return value;
  let current: any = value;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/** Search for the message the API wrote in the error body. */
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
 * Creates a reactive resource.
 *
 * @param url fixed address, or function that returns the address on each call.
 *   Returning empty postpones the request, useful while a parameter doesn't exist.
 * @param options request and lifecycle configuration
 */
export function createResource<T = unknown>(
  url: string | (() => string),
  options: ResourceOptions = {}
): Resource<T> {
  const resolveUrl = (): string => (typeof url === 'function' ? url() : url);
  const resolveParams = ():
    | Record<string, string | number | boolean | null | undefined>
    | undefined => (typeof options.params === 'function' ? options.params() : options.params);

  // Each `reload` cancels the previous one: without this, an old response that
  // took longer would overwrite the new one when it arrives later.
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
        // A response from an already-canceled request won't touch state.
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
      // Stopping mid-request can't leave the screen stuck on "loading".
      resource.loading = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  }) as Resource<T>;

  if (options.poll && options.poll > 0) {
    timer = setInterval(() => {
      // Hidden tab doesn't need to keep polling the server.
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void resource.reload();
      }
    }, options.poll);
  }

  if (!options.manual) void resource.reload();

  return resource;
}
