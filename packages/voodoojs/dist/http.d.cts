import { parseDuration } from './utils.cjs';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
interface RequestConfig {
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
interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;
    /** Original response for advanced cases. */
    raw: Response;
    config: RequestConfig;
}
declare class HttpError<T = unknown> extends Error {
    readonly response?: HttpResponse<T> | undefined;
    readonly config?: RequestConfig | undefined;
    readonly cause?: unknown | undefined;
    constructor(message: string, response?: HttpResponse<T> | undefined, config?: RequestConfig | undefined, cause?: unknown | undefined);
    get status(): number;
    /** `true` when error is network, timeout, or cancellation. */
    get isNetworkError(): boolean;
}
type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
type ErrorInterceptor = (error: HttpError) => unknown;
interface HttpDefaults {
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
/** Clears entire cache or only entries matching the pattern. */
declare function clearCache(pattern?: string | RegExp): void;
/** Resends everything queued while the browser was offline. */
declare function flushOfflineQueue(): Promise<number>;
/**
 * Executes a request through the entire pipeline: interceptors, timeout, retry,
 * cache, and error handling.
 */
declare function request<T = unknown>(input: RequestConfig): Promise<HttpResponse<T>>;
type ShortcutOptions = Omit<RequestConfig, 'url' | 'method' | 'body'>;
declare const http: {
    defaults: HttpDefaults;
    get<T = unknown>(url: string, options?: ShortcutOptions): Promise<T>;
    post<T = unknown>(url: string, body?: unknown, options?: ShortcutOptions): Promise<T>;
    put<T = unknown>(url: string, body?: unknown, options?: ShortcutOptions): Promise<T>;
    patch<T = unknown>(url: string, body?: unknown, options?: ShortcutOptions): Promise<T>;
    delete<T = unknown>(url: string, options?: ShortcutOptions): Promise<T>;
    head(url: string, options?: ShortcutOptions): Promise<unknown>;
    /** Full request with status and headers. */
    request: typeof request;
    /** Upload files with real progress using XMLHttpRequest. */
    upload<T = unknown>(url: string, data: FormData, options?: {
        method?: "POST" | "PUT" | "PATCH";
        headers?: Record<string, string>;
        onProgress?: (percent: number, loaded: number, total: number) => void;
        signal?: AbortSignal;
    }): Promise<T>;
    /** Server-Sent Events with automatic reconnection by the browser. */
    sse(url: string, handlers?: {
        message?: (data: unknown, event: MessageEvent) => void;
        error?: (e: Event) => void;
    }): EventSource;
    /** Read a streaming response line by line (NDJSON). */
    stream(url: string, onLine: (line: string) => void, options?: ShortcutOptions): Promise<void>;
    interceptors: {
        request: {
            use(fn: RequestInterceptor): () => void;
        };
        response: {
            use(fn: ResponseInterceptor): () => void;
        };
        error: {
            use(fn: ErrorInterceptor): () => void;
        };
    };
    /** Set headers sent on every request. */
    setHeader(name: string, value: string | null): void;
    /** Shortcut for token-based authentication. */
    setToken(token: string | null, scheme?: string): void;
    setBaseURL(url: string): void;
    clearCache: typeof clearCache;
    flushOfflineQueue: typeof flushOfflineQueue;
    parseDuration: typeof parseDuration;
};
type Http = typeof http;

export { type ErrorInterceptor, type Http, type HttpDefaults, HttpError, type HttpMethod, type HttpResponse, type RequestConfig, type RequestInterceptor, type ResponseInterceptor, clearCache, flushOfflineQueue, http, request };
