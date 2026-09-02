/**
 * @module http
 *
 * HTTP client built on `fetch`, with Axios ergonomics and no dependencies.
 * Supports interceptors, timeout, retry with progressive backoff, response
 * caching, cancellation, upload progress, and offline queue.
 *
 * Automatic retry only applies to `GET`, `HEAD`, and `OPTIONS`. For methods
 * that change state, it requires explicit opt-in. See {@link podeRepetir}.
 *
 * ```ts
 * const users = await V.http.get<User[]>('/api/users')
 * await V.http.post('/api/users', { name: 'Ana' })
 * ```
 */

import { parseDuration } from '../utils';
import { warnOnce } from '../runtime/avisos';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RequestConfig {
  url: string;
  method?: HttpMethod;
  /** Body. Objects become JSON, `FormData` is sent as-is. */
  body?: unknown;
  /** Query parameters added to the URL. */
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  /** Milliseconds before aborting. `0` disables timeout. */
  timeout?: number;
  /**
   * Extra attempts on network failure or 5xx errors.
   *
   * Works alone only for `GET`, `HEAD`, and `OPTIONS`. For other methods,
   * retry must be enabled with `retryUnsafe` or an `Idempotency-Key` header.
   * See {@link podeRepetir}.
   */
  retry?: number;
  /** Wait between attempts, doubled each round. */
  retryDelay?: number;
  /**
   * Enables `retry` on state-changing methods (`POST`, `PATCH`, `PUT`,
   * `DELETE`). Use only when the server handles repetition safely, either
   * because the operation is naturally idempotent or it is deduplicated by a
   * key. Sending `Idempotency-Key` has the same effect.
   */
  retryUnsafe?: boolean;
  /** Response cache duration in ms. GET only. */
  cache?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  /** Expected type. `auto` decides by response header. */
  responseType?: 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  /** Download progress callback when the server reports size. */
  onProgress?: (loaded: number, total: number) => void;
  /** Queue the request when browser is offline and resend later. */
  offlineQueue?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  /** Original response for advanced cases. */
  raw: Response;
  config: RequestConfig;
}

export class HttpError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly response?: HttpResponse<T>,
    public readonly config?: RequestConfig,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }

  get status(): number {
    return this.response?.status ?? 0;
  }

  /** `true` when error is network, timeout, or cancellation. */
  get isNetworkError(): boolean {
    return !this.response;
  }
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = (
  response: HttpResponse
) => HttpResponse | Promise<HttpResponse>;
export type ErrorInterceptor = (error: HttpError) => unknown;

export interface HttpDefaults {
  baseURL: string;
  headers: Record<string, string>;
  timeout: number;
  retry: number;
  retryDelay: number;
  credentials: RequestCredentials;
  /** Meta tag name read to send CSRF token automatically. */
  csrfMeta: string;
  /** Header used to send CSRF token. */
  csrfHeader: string;
}

const defaults: HttpDefaults = {
  baseURL: '',
  headers: { Accept: 'application/json, text/html, */*' },
  timeout: 30_000,
  retry: 0,
  retryDelay: 500,
  credentials: 'same-origin',
  csrfMeta: 'csrf-token',
  csrfHeader: 'X-CSRF-TOKEN',
};

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

// ---------------------------------------------------------------------------
// Response caching
// ---------------------------------------------------------------------------

interface CacheEntry {
  expires: number;
  value: HttpResponse;
}

const responseCache = new Map<string, CacheEntry>();

function cacheKey(config: RequestConfig): string {
  return `${config.method ?? 'GET'} ${buildURL(config)}`;
}

/** Clears entire cache or only entries matching the pattern. */
export function clearCache(pattern?: string | RegExp): void {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const test = typeof pattern === 'string' ? (k: string) => k.includes(pattern) : (k: string) => pattern.test(k);
  for (const key of [...responseCache.keys()]) if (test(key)) responseCache.delete(key);
}

// ---------------------------------------------------------------------------
// Offline queue
// ---------------------------------------------------------------------------

const OFFLINE_KEY = 'voodoo:offline-queue';

interface QueuedRequest {
  url: string;
  method: HttpMethod;
  body: unknown;
  headers: Record<string, string>;
  at: number;
}

function readQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') as QueuedRequest[];
  } catch {
    return [];
  }
}

function writeQueue(list: QueuedRequest[]): void {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the queue simply won't persist.
  }
}

function enqueueOffline(config: RequestConfig): void {
  if (typeof localStorage === 'undefined') return;
  const list = readQueue();
  list.push({
    url: buildURL(config),
    method: config.method ?? 'POST',
    body: config.body,
    headers: config.headers ?? {},
    at: Date.now(),
  });
  writeQueue(list);
}

/** Resends everything queued while the browser was offline. */
export async function flushOfflineQueue(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  const list = readQueue();
  if (!list.length) return 0;
  writeQueue([]);

  let sent = 0;
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    try {
      await request({
        url: item.url,
        method: item.method,
        body: item.body,
        headers: item.headers,
        offlineQueue: false,
      });
      sent++;
    } catch {
      // Failed again: return the failed item to the queue plus all items that
      // haven't been attempted yet, then stop.
      //
      // Previously, only the current item was returned. Since flushing starts
      // by writing an empty queue, everything after it was silently deleted: a
      // queue of three requests failing on the second one would lose the third
      // forever.
      //
      // Anything added to the queue during flushing goes to the end because it
      // was enqueued after.
      const newItems = readQueue();
      writeQueue([...list.slice(index), ...newItems]);
      break;
    }
  }
  return sent;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushOfflineQueue();
  });
}

// ---------------------------------------------------------------------------
// Request building
// ---------------------------------------------------------------------------

function buildURL(config: RequestConfig): string {
  let url = config.url;
  const base = defaults.baseURL;
  if (base && !/^https?:\/\//i.test(url) && !url.startsWith('//')) {
    url = `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }
  if (config.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value == null || value === '') continue;
      search.append(key, String(value));
    }
    const query = search.toString();
    if (query) url += (url.includes('?') ? '&' : '?') + query;
  }
  return url;
}

function csrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector(`meta[name="${defaults.csrfMeta}"]`);
  return meta?.getAttribute('content') ?? null;
}

function prepareBody(
  body: unknown,
  headers: Record<string, string>
): BodyInit | null | undefined {
  if (body == null) return undefined;
  if (
    typeof FormData !== 'undefined' && body instanceof FormData ||
    typeof Blob !== 'undefined' && body instanceof Blob ||
    typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams ||
    typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer ||
    typeof body === 'string'
  ) {
    return body as BodyInit;
  }
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return JSON.stringify(body);
}

async function parseResponse(response: Response, type: RequestConfig['responseType']): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers.get('content-type') || '';

  switch (type) {
    case 'json':
      return response.json();
    case 'text':
      return response.text();
    case 'blob':
      return response.blob();
    case 'arrayBuffer':
      return response.arrayBuffer();
    case 'formData':
      return response.formData();
    default:
      if (contentType.includes('application/json') || contentType.includes('+json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return response.text();
  }
}

/**
 * Methods that the specification defines as idempotent with no write side effects:
 * repeating one of them reaches the same state as repeating zero times.
 */
const METODOS_SEGUROS = new Set<HttpMethod>(['GET', 'HEAD', 'OPTIONS']);

/** `true` when request carries a deduplication key. */
function temChaveDeIdempotencia(headers: Record<string, string>): boolean {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'idempotency-key' && String(value).trim() !== '') return true;
  }
  return false;
}

/**
 * Decides whether the request can retry automatically.
 *
 * Until version 0.2.1, `retry` applied to any method. That is silently
 * dangerous: on network failure the client doesn't know if the server processed
 * the request or only the response was lost. Retrying a `POST /payment` in that
 * situation charges twice. The cost of retrying too much exceeds not retrying
 * enough, so automatic retry is now limited to methods the specification
 * guarantees as idempotent.
 *
 * `PUT` and `DELETE` are idempotent on paper, but in practice many APIs
 * implement them with counters, audit logs, or side effects on each call.
 * They also require opt-in, though with lower risk margin.
 *
 * Opt-in has two forms: `retryUnsafe: true`, where the caller assumes
 * responsibility, or an `Idempotency-Key` header, where the server promises
 * deduplication. Code relying on the old behavior can pass `retryUnsafe: true`
 * to get exactly what it had.
 */
function podeRepetir(
  method: HttpMethod,
  config: RequestConfig,
  headers: Record<string, string>,
  url: string
): boolean {
  if (METODOS_SEGUROS.has(method)) return true;
  if (config.retryUnsafe === true) return true;
  if (temChaveDeIdempotencia(headers)) return true;
  if ((config.retry ?? 0) > 0) {
    warnOnce(
      `http:retry-unsafe:${method} ${url}`,
      `retry ignored on ${method} ${url}: retrying a method that changes state may ` +
        'apply the same operation twice if the response is lost in transit. ' +
        'Allow with retryUnsafe: true or send an Idempotency-Key header.'
    );
  }
  return false;
}

/**
 * Executes a request through the entire pipeline: interceptors, timeout, retry,
 * cache, and error handling.
 */
export async function request<T = unknown>(input: RequestConfig): Promise<HttpResponse<T>> {
  let config: RequestConfig = {
    method: 'GET',
    timeout: defaults.timeout,
    retry: defaults.retry,
    retryDelay: defaults.retryDelay,
    credentials: defaults.credentials,
    responseType: 'auto',
    ...input,
    headers: { ...defaults.headers, ...input.headers },
  };

  for (const interceptor of requestInterceptors) {
    config = await interceptor(config);
  }

  const method = (config.method ?? 'GET').toUpperCase() as HttpMethod;

  // Cache for reads only.
  if (config.cache && method === 'GET') {
    const entry = responseCache.get(cacheKey(config));
    if (entry && entry.expires > Date.now()) return entry.value as HttpResponse<T>;
  }

  // Offline: queue and return synthetic response.
  if (
    config.offlineQueue &&
    typeof navigator !== 'undefined' &&
    navigator.onLine === false &&
    method !== 'GET'
  ) {
    enqueueOffline(config);
    return {
      data: null as T,
      status: 0,
      statusText: 'offline-queued',
      headers: new Headers(),
      ok: true,
      raw: new Response(null, { status: 202 }),
      config,
    };
  }

  const headers: Record<string, string> = { ...config.headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const token = csrfToken();
    if (token && !headers[defaults.csrfHeader]) headers[defaults.csrfHeader] = token;
  }
  headers['X-Requested-With'] ||= 'XMLHttpRequest';

  const body = prepareBody(config.body, headers);
  const url = buildURL(config);
  const attempts = podeRepetir(method, config, headers, url) ? (config.retry ?? 0) + 1 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();

    // Signal from the caller. `AbortSignal.any` doesn't exist in all engines,
    // and the old fallback simply ignored the external signal—canceling the
    // request did nothing. Manually forwarding the abort works everywhere.
    const externo = config.signal;
    let repassarAborto: (() => void) | null = null;
    if (externo) {
      if (externo.aborted) {
        controller.abort((externo as { reason?: unknown }).reason);
      } else {
        repassarAborto = () => controller.abort((externo as { reason?: unknown }).reason);
        externo.addEventListener('abort', repassarAborto, { once: true });
      }
    }
    const soltarSinal = (): void => {
      if (repassarAborto && externo) externo.removeEventListener('abort', repassarAborto);
      repassarAborto = null;
    };

    const timeoutId =
      config.timeout && config.timeout > 0
        ? setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), config.timeout)
        : null;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
        credentials: config.credentials,
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();

      const data = (await parseResponse(response, config.responseType)) as T;
      let result: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        raw: response,
        config,
      };

      if (!response.ok) {
        // 5xx deserves a retry. 4xx does not.
        if (response.status >= 500 && attempt < attempts - 1) {
          await wait((config.retryDelay ?? 500) * 2 ** attempt);
          continue;
        }
        const error = new HttpError(
          `Request failed with status ${response.status}`,
          result as HttpResponse,
          config
        );
        for (const interceptor of errorInterceptors) interceptor(error);
        throw error;
      }

      for (const interceptor of responseInterceptors) {
        result = (await interceptor(result as HttpResponse)) as HttpResponse<T>;
      }

      if (config.cache && method === 'GET') {
        responseCache.set(cacheKey(config), {
          expires: Date.now() + config.cache,
          value: result as HttpResponse,
        });
      }

      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      if (err instanceof HttpError) throw err;
      lastError = err;

      const aborted = (err as Error)?.name === 'AbortError' && config.signal?.aborted;
      if (aborted) break;
      if (attempt < attempts - 1) {
        await wait((config.retryDelay ?? 500) * 2 ** attempt);
        continue;
      }
    }
  }

  const message =
    (lastError as Error)?.name === 'TimeoutError'
      ? `Timeout after ${config.timeout}ms`
      : `Network failure accessing ${url}`;
  const error = new HttpError(message, undefined, config, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type ShortcutOptions = Omit<RequestConfig, 'url' | 'method' | 'body'>;

/** Returns only the data. Use `http.request` when you need the full response. */
async function shortcut<T>(config: RequestConfig): Promise<T> {
  const response = await request<T>(config);
  return response.data;
}

export const http = {
  defaults,

  get<T = unknown>(url: string, options: ShortcutOptions = {}): Promise<T> {
    return shortcut<T>({ ...options, url, method: 'GET' });
  },
  post<T = unknown>(url: string, body?: unknown, options: ShortcutOptions = {}): Promise<T> {
    return shortcut<T>({ ...options, url, method: 'POST', body });
  },
  put<T = unknown>(url: string, body?: unknown, options: ShortcutOptions = {}): Promise<T> {
    return shortcut<T>({ ...options, url, method: 'PUT', body });
  },
  patch<T = unknown>(url: string, body?: unknown, options: ShortcutOptions = {}): Promise<T> {
    return shortcut<T>({ ...options, url, method: 'PATCH', body });
  },
  delete<T = unknown>(url: string, options: ShortcutOptions = {}): Promise<T> {
    return shortcut<T>({ ...options, url, method: 'DELETE' });
  },
  head(url: string, options: ShortcutOptions = {}): Promise<unknown> {
    return shortcut({ ...options, url, method: 'HEAD' });
  },

  /** Full request with status and headers. */
  request,

  /** Upload files with real progress using XMLHttpRequest. */
  upload<T = unknown>(
    url: string,
    data: FormData,
    options: {
      method?: 'POST' | 'PUT' | 'PATCH';
      headers?: Record<string, string>;
      onProgress?: (percent: number, loaded: number, total: number) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const finalUrl = buildURL({ url });
      xhr.open(options.method ?? 'POST', finalUrl);

      for (const [key, value] of Object.entries({ ...defaults.headers, ...options.headers })) {
        if (key.toLowerCase() === 'content-type') continue; // browser sets boundary
        xhr.setRequestHeader(key, value);
      }
      const token = csrfToken();
      if (token) xhr.setRequestHeader(defaults.csrfHeader, token);

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return;
        options.onProgress?.(
          Math.round((event.loaded / event.total) * 100),
          event.loaded,
          event.total
        );
      });

      xhr.addEventListener('load', () => {
        const contentType = xhr.getResponseHeader('content-type') || '';
        let data: unknown = xhr.responseText;
        if (contentType.includes('json')) {
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            // Keep text when JSON is malformed.
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new HttpError(`Upload failed with status ${xhr.status}`));
      });

      xhr.addEventListener('error', () => reject(new HttpError('Network failure during upload')));
      xhr.addEventListener('abort', () => reject(new HttpError('Upload canceled')));
      options.signal?.addEventListener('abort', () => xhr.abort());

      xhr.send(data);
    });
  },

  /** Server-Sent Events with automatic reconnection by the browser. */
  sse(
    url: string,
    handlers: { message?: (data: unknown, event: MessageEvent) => void; error?: (e: Event) => void } = {}
  ): EventSource {
    const source = new EventSource(buildURL({ url }));
    source.addEventListener('message', (event) => {
      let data: unknown = event.data;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Keep plain text.
      }
      handlers.message?.(data, event);
    });
    if (handlers.error) source.addEventListener('error', handlers.error);
    return source;
  },

  /** Read a streaming response line by line (NDJSON). */
  async stream(
    url: string,
    onLine: (line: string) => void,
    options: ShortcutOptions = {}
  ): Promise<void> {
    const response = await fetch(buildURL({ url, params: options.params }), {
      headers: { ...defaults.headers, ...options.headers },
      signal: options.signal,
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) if (line.trim()) onLine(line);
    }
    if (buffer.trim()) onLine(buffer);
  },

  interceptors: {
    request: {
      use(fn: RequestInterceptor): () => void {
        requestInterceptors.push(fn);
        return () => {
          const i = requestInterceptors.indexOf(fn);
          if (i > -1) requestInterceptors.splice(i, 1);
        };
      },
    },
    response: {
      use(fn: ResponseInterceptor): () => void {
        responseInterceptors.push(fn);
        return () => {
          const i = responseInterceptors.indexOf(fn);
          if (i > -1) responseInterceptors.splice(i, 1);
        };
      },
    },
    error: {
      use(fn: ErrorInterceptor): () => void {
        errorInterceptors.push(fn);
        return () => {
          const i = errorInterceptors.indexOf(fn);
          if (i > -1) errorInterceptors.splice(i, 1);
        };
      },
    },
  },

  /** Set headers sent on every request. */
  setHeader(name: string, value: string | null): void {
    if (value === null) delete defaults.headers[name];
    else defaults.headers[name] = value;
  },

  /** Shortcut for token-based authentication. */
  setToken(token: string | null, scheme = 'Bearer'): void {
    this.setHeader('Authorization', token ? `${scheme} ${token}` : null);
  },

  setBaseURL(url: string): void {
    defaults.baseURL = url;
  },

  clearCache,
  flushOfflineQueue,
  parseDuration,
};

export type Http = typeof http;
