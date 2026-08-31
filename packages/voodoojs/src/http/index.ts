/**
 * @module http
 *
 * Cliente HTTP construido sobre `fetch`, com a ergonomia do Axios e nenhuma
 * dependencia. Suporta interceptadores, timeout, retry com espera progressiva,
 * cache de resposta, cancelamento, progresso de upload e fila offline.
 *
 * ```ts
 * const users = await V.http.get<User[]>('/api/users')
 * await V.http.post('/api/users', { name: 'Ana' })
 * ```
 */

import { parseDuration } from '../utils';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface RequestConfig {
  url: string;
  method?: HttpMethod;
  /** Corpo. Objetos viram JSON, `FormData` e enviado como esta. */
  body?: unknown;
  /** Parametros de query adicionados a URL. */
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  /** Milissegundos ate abortar. `0` desliga o timeout. */
  timeout?: number;
  /** Tentativas extras em caso de falha de rede ou erro 5xx. */
  retry?: number;
  /** Espera entre tentativas, dobrada a cada rodada. */
  retryDelay?: number;
  /** Tempo de cache da resposta, em ms. Somente para GET. */
  cache?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  /** Tipo esperado. `auto` decide pelo cabecalho de resposta. */
  responseType?: 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  /** Callback de progresso de download, quando o servidor informa o tamanho. */
  onProgress?: (loaded: number, total: number) => void;
  /** Guarda a requisicao quando o navegador esta offline e reenvia depois. */
  offlineQueue?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  /** Resposta original, para casos avancados. */
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

  /** `true` quando o erro foi de rede, timeout ou cancelamento. */
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
  /** Nome do meta tag lido para enviar o token CSRF automaticamente. */
  csrfMeta: string;
  /** Cabecalho usado para enviar o token CSRF. */
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
// Cache de resposta
// ---------------------------------------------------------------------------

interface CacheEntry {
  expires: number;
  value: HttpResponse;
}

const responseCache = new Map<string, CacheEntry>();

function cacheKey(config: RequestConfig): string {
  return `${config.method ?? 'GET'} ${buildURL(config)}`;
}

/** Limpa o cache inteiro ou apenas as entradas que combinam com o padrao. */
export function clearCache(pattern?: string | RegExp): void {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const test = typeof pattern === 'string' ? (k: string) => k.includes(pattern) : (k: string) => pattern.test(k);
  for (const key of [...responseCache.keys()]) if (test(key)) responseCache.delete(key);
}

// ---------------------------------------------------------------------------
// Fila offline
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
    // Armazenamento cheio ou bloqueado: a fila simplesmente nao persiste.
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

/** Reenvia tudo que foi guardado enquanto o navegador estava offline. */
export async function flushOfflineQueue(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  const list = readQueue();
  if (!list.length) return 0;
  writeQueue([]);

  let sent = 0;
  for (const item of list) {
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
      // Falhou de novo: devolve para a fila e para por aqui.
      const remaining = readQueue();
      remaining.push(item);
      writeQueue(remaining);
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
// Montagem da requisicao
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
 * Executa uma requisicao com toda a pipeline: interceptadores, timeout, retry,
 * cache e tratamento de erro.
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

  // Cache somente para leituras.
  if (config.cache && method === 'GET') {
    const entry = responseCache.get(cacheKey(config));
    if (entry && entry.expires > Date.now()) return entry.value as HttpResponse<T>;
  }

  // Offline: guarda e devolve resposta sintetica.
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
  const attempts = (config.retry ?? 0) + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();

    // Sinal vindo de quem chamou. `AbortSignal.any` nao existe em todo motor,
    // e o caminho de reserva antigo simplesmente ignorava o sinal externo, ou
    // seja, cancelar a requisicao nao cancelava nada. Repassar o aborto a mao
    // funciona em qualquer lugar.
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
        // 5xx merece nova tentativa. 4xx nao.
        if (response.status >= 500 && attempt < attempts - 1) {
          await wait((config.retryDelay ?? 500) * 2 ** attempt);
          continue;
        }
        const error = new HttpError(
          `Requisicao falhou com status ${response.status}`,
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
      ? `Tempo esgotado apos ${config.timeout}ms`
      : `Falha de rede ao acessar ${url}`;
  const error = new HttpError(message, undefined, config, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

type ShortcutOptions = Omit<RequestConfig, 'url' | 'method' | 'body'>;

/** Devolve apenas os dados. Use `http.request` quando precisar da resposta completa. */
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

  /** Requisicao completa, com status e cabecalhos. */
  request,

  /** Envia arquivos com progresso real, usando XMLHttpRequest. */
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
        if (key.toLowerCase() === 'content-type') continue; // o navegador define o boundary
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
            // Mantem o texto quando o JSON vier quebrado.
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new HttpError(`Upload falhou com status ${xhr.status}`));
      });

      xhr.addEventListener('error', () => reject(new HttpError('Falha de rede no upload')));
      xhr.addEventListener('abort', () => reject(new HttpError('Upload cancelado')));
      options.signal?.addEventListener('abort', () => xhr.abort());

      xhr.send(data);
    });
  },

  /** Server-Sent Events com reconexao automatica do proprio navegador. */
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
        // Mantem texto puro.
      }
      handlers.message?.(data, event);
    });
    if (handlers.error) source.addEventListener('error', handlers.error);
    return source;
  },

  /** Le uma resposta em streaming, linha a linha (NDJSON). */
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

  /** Define cabecalhos enviados em toda requisicao. */
  setHeader(name: string, value: string | null): void {
    if (value === null) delete defaults.headers[name];
    else defaults.headers[name] = value;
  },

  /** Atalho para autenticacao por token. */
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
