import { parseDuration } from './utils.cjs';

/**
 * @module http
 *
 * Cliente HTTP construido sobre `fetch`, com a ergonomia do Axios e nenhuma
 * dependencia. Suporta interceptadores, timeout, retry com espera progressiva,
 * cache de resposta, cancelamento, progresso de upload e fila offline.
 *
 * O retry automatico so vale para `GET`, `HEAD` e `OPTIONS`. Nos metodos que
 * mudam estado ele exige opt-in explicito. Veja {@link podeRepetir}.
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
    /** Corpo. Objetos viram JSON, `FormData` e enviado como esta. */
    body?: unknown;
    /** Parametros de query adicionados a URL. */
    params?: Record<string, string | number | boolean | null | undefined>;
    headers?: Record<string, string>;
    /** Milissegundos ate abortar. `0` desliga o timeout. */
    timeout?: number;
    /**
     * Tentativas extras em caso de falha de rede ou erro 5xx.
     *
     * Vale sozinho apenas para `GET`, `HEAD` e `OPTIONS`. Nos demais metodos e
     * preciso liberar a repeticao com `retryUnsafe` ou com um cabecalho
     * `Idempotency-Key`. Veja {@link podeRepetir}.
     */
    retry?: number;
    /** Espera entre tentativas, dobrada a cada rodada. */
    retryDelay?: number;
    /**
     * Libera o `retry` em metodos que mudam estado (`POST`, `PATCH`, `PUT`,
     * `DELETE`). Use somente quando o servidor tratar a repeticao com seguranca,
     * seja porque a operacao e naturalmente idempotente, seja porque ela e
     * desduplicada por uma chave. Enviar `Idempotency-Key` tem o mesmo efeito.
     */
    retryUnsafe?: boolean;
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
interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    ok: boolean;
    /** Resposta original, para casos avancados. */
    raw: Response;
    config: RequestConfig;
}
declare class HttpError<T = unknown> extends Error {
    readonly response?: HttpResponse<T> | undefined;
    readonly config?: RequestConfig | undefined;
    readonly cause?: unknown | undefined;
    constructor(message: string, response?: HttpResponse<T> | undefined, config?: RequestConfig | undefined, cause?: unknown | undefined);
    get status(): number;
    /** `true` quando o erro foi de rede, timeout ou cancelamento. */
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
    /** Nome do meta tag lido para enviar o token CSRF automaticamente. */
    csrfMeta: string;
    /** Cabecalho usado para enviar o token CSRF. */
    csrfHeader: string;
}
/** Limpa o cache inteiro ou apenas as entradas que combinam com o padrao. */
declare function clearCache(pattern?: string | RegExp): void;
/** Reenvia tudo que foi guardado enquanto o navegador estava offline. */
declare function flushOfflineQueue(): Promise<number>;
/**
 * Executa uma requisicao com toda a pipeline: interceptadores, timeout, retry,
 * cache e tratamento de erro.
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
    /** Requisicao completa, com status e cabecalhos. */
    request: typeof request;
    /** Envia arquivos com progresso real, usando XMLHttpRequest. */
    upload<T = unknown>(url: string, data: FormData, options?: {
        method?: "POST" | "PUT" | "PATCH";
        headers?: Record<string, string>;
        onProgress?: (percent: number, loaded: number, total: number) => void;
        signal?: AbortSignal;
    }): Promise<T>;
    /** Server-Sent Events com reconexao automatica do proprio navegador. */
    sse(url: string, handlers?: {
        message?: (data: unknown, event: MessageEvent) => void;
        error?: (e: Event) => void;
    }): EventSource;
    /** Le uma resposta em streaming, linha a linha (NDJSON). */
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
    /** Define cabecalhos enviados em toda requisicao. */
    setHeader(name: string, value: string | null): void;
    /** Atalho para autenticacao por token. */
    setToken(token: string | null, scheme?: string): void;
    setBaseURL(url: string): void;
    clearCache: typeof clearCache;
    flushOfflineQueue: typeof flushOfflineQueue;
    parseDuration: typeof parseDuration;
};
type Http = typeof http;

export { type ErrorInterceptor, type Http, type HttpDefaults, HttpError, type HttpMethod, type HttpResponse, type RequestConfig, type RequestInterceptor, type ResponseInterceptor, clearCache, flushOfflineQueue, http, request };
