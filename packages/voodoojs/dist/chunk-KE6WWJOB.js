import { warnOnce } from './chunk-TXWSOPF2.js';
import { parseDuration } from './chunk-OJDW7KXT.js';
import { __publicField } from './chunk-BEQEBFQ2.js';

/**
 * Voodoo.js v0.11.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/http/index.ts
var HttpError = class extends Error {
  constructor(message, response, config, cause) {
    super(message);
    __publicField(this, "response", response);
    __publicField(this, "config", config);
    __publicField(this, "cause", cause);
    this.name = "HttpError";
  }
  get status() {
    return this.response?.status ?? 0;
  }
  /** `true` when error is network, timeout, or cancellation. */
  get isNetworkError() {
    return !this.response;
  }
};
var defaults = {
  baseURL: "",
  headers: { Accept: "application/json, text/html, */*" },
  timeout: 3e4,
  retry: 0,
  retryDelay: 500,
  credentials: "same-origin",
  csrfMeta: "csrf-token",
  csrfHeader: "X-CSRF-TOKEN"
};
var requestInterceptors = [];
var responseInterceptors = [];
var errorInterceptors = [];
var responseCache = /* @__PURE__ */ new Map();
function cacheKey(config) {
  return `${config.method ?? "GET"} ${buildURL(config)}`;
}
function clearCache(pattern) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const test = typeof pattern === "string" ? (k) => k.includes(pattern) : (k) => pattern.test(k);
  for (const key of [...responseCache.keys()]) if (test(key)) responseCache.delete(key);
}
var OFFLINE_KEY = "voodoo:offline-queue";
function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(list) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
  } catch {
  }
}
function enqueueOffline(config) {
  if (typeof localStorage === "undefined") return;
  const list = readQueue();
  list.push({
    url: buildURL(config),
    method: config.method ?? "POST",
    body: config.body,
    headers: config.headers ?? {},
    at: Date.now()
  });
  writeQueue(list);
}
async function flushOfflineQueue() {
  if (typeof localStorage === "undefined") return 0;
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
        offlineQueue: false
      });
      sent++;
    } catch {
      const newItems = readQueue();
      writeQueue([...list.slice(index), ...newItems]);
      break;
    }
  }
  return sent;
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushOfflineQueue();
  });
}
function buildURL(config) {
  let url = config.url;
  const base = defaults.baseURL;
  if (base && !/^https?:\/\//i.test(url) && !url.startsWith("//")) {
    url = `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  }
  if (config.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value == null || value === "") continue;
      search.append(key, String(value));
    }
    const query = search.toString();
    if (query) url += (url.includes("?") ? "&" : "?") + query;
  }
  return url;
}
function csrfToken() {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector(`meta[name="${defaults.csrfMeta}"]`);
  return meta?.getAttribute("content") ?? null;
}
function prepareBody(body, headers) {
  if (body == null) return void 0;
  if (typeof FormData !== "undefined" && body instanceof FormData || typeof Blob !== "undefined" && body instanceof Blob || typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams || typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer || typeof body === "string") {
    return body;
  }
  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return JSON.stringify(body);
}
async function parseResponse(response, type) {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers.get("content-type") || "";
  switch (type) {
    case "json":
      return response.json();
    case "text":
      return response.text();
    case "blob":
      return response.blob();
    case "arrayBuffer":
      return response.arrayBuffer();
    case "formData":
      return response.formData();
    default:
      if (contentType.includes("application/json") || contentType.includes("+json")) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return response.text();
  }
}
var METODOS_SEGUROS = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
function temChaveDeIdempotencia(headers) {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "idempotency-key" && String(value).trim() !== "") return true;
  }
  return false;
}
function podeRepetir(method, config, headers, url) {
  if (METODOS_SEGUROS.has(method)) return true;
  if (config.retryUnsafe === true) return true;
  if (temChaveDeIdempotencia(headers)) return true;
  if ((config.retry ?? 0) > 0) {
    warnOnce(
      `http:retry-unsafe:${method} ${url}`,
      `retry ignored on ${method} ${url}: retrying a method that changes state may apply the same operation twice if the response is lost in transit. Allow with retryUnsafe: true or send an Idempotency-Key header.`
    );
  }
  return false;
}
async function request(input) {
  let config = {
    method: "GET",
    timeout: defaults.timeout,
    retry: defaults.retry,
    retryDelay: defaults.retryDelay,
    credentials: defaults.credentials,
    responseType: "auto",
    ...input,
    headers: { ...defaults.headers, ...input.headers }
  };
  for (const interceptor of requestInterceptors) {
    config = await interceptor(config);
  }
  const method = (config.method ?? "GET").toUpperCase();
  if (config.cache && method === "GET") {
    const entry = responseCache.get(cacheKey(config));
    if (entry && entry.expires > Date.now()) return entry.value;
  }
  if (config.offlineQueue && typeof navigator !== "undefined" && navigator.onLine === false && method !== "GET") {
    enqueueOffline(config);
    return {
      data: null,
      status: 0,
      statusText: "offline-queued",
      headers: new Headers(),
      ok: true,
      raw: new Response(null, { status: 202 }),
      config
    };
  }
  const headers = { ...config.headers };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token && !headers[defaults.csrfHeader]) headers[defaults.csrfHeader] = token;
  }
  headers["X-Requested-With"] || (headers["X-Requested-With"] = "XMLHttpRequest");
  const body = prepareBody(config.body, headers);
  const url = buildURL(config);
  const attempts = podeRepetir(method, config, headers, url) ? (config.retry ?? 0) + 1 : 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const externo = config.signal;
    let repassarAborto = null;
    if (externo) {
      if (externo.aborted) {
        controller.abort(externo.reason);
      } else {
        repassarAborto = () => controller.abort(externo.reason);
        externo.addEventListener("abort", repassarAborto, { once: true });
      }
    }
    const soltarSinal = () => {
      if (repassarAborto && externo) externo.removeEventListener("abort", repassarAborto);
      repassarAborto = null;
    };
    const timeoutId = config.timeout && config.timeout > 0 ? setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), config.timeout) : null;
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? void 0 : body,
        credentials: config.credentials,
        signal: controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      const data = await parseResponse(response, config.responseType);
      let result = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        raw: response,
        config
      };
      if (!response.ok) {
        if (response.status >= 500 && attempt < attempts - 1) {
          await wait((config.retryDelay ?? 500) * 2 ** attempt);
          continue;
        }
        const error2 = new HttpError(
          `Request failed with status ${response.status}`,
          result,
          config
        );
        for (const interceptor of errorInterceptors) interceptor(error2);
        throw error2;
      }
      for (const interceptor of responseInterceptors) {
        result = await interceptor(result);
      }
      if (config.cache && method === "GET") {
        responseCache.set(cacheKey(config), {
          expires: Date.now() + config.cache,
          value: result
        });
      }
      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      if (err instanceof HttpError) throw err;
      lastError = err;
      const aborted = err?.name === "AbortError" && config.signal?.aborted;
      if (aborted) break;
      if (attempt < attempts - 1) {
        await wait((config.retryDelay ?? 500) * 2 ** attempt);
        continue;
      }
    }
  }
  const message = lastError?.name === "TimeoutError" ? `Timeout after ${config.timeout}ms` : `Network failure accessing ${url}`;
  const error = new HttpError(message, void 0, config, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function shortcut(config) {
  const response = await request(config);
  return response.data;
}
var http = {
  defaults,
  get(url, options = {}) {
    return shortcut({ ...options, url, method: "GET" });
  },
  post(url, body, options = {}) {
    return shortcut({ ...options, url, method: "POST", body });
  },
  put(url, body, options = {}) {
    return shortcut({ ...options, url, method: "PUT", body });
  },
  patch(url, body, options = {}) {
    return shortcut({ ...options, url, method: "PATCH", body });
  },
  delete(url, options = {}) {
    return shortcut({ ...options, url, method: "DELETE" });
  },
  head(url, options = {}) {
    return shortcut({ ...options, url, method: "HEAD" });
  },
  /** Full request with status and headers. */
  request,
  /** Upload files with real progress using XMLHttpRequest. */
  upload(url, data, options = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const finalUrl = buildURL({ url });
      xhr.open(options.method ?? "POST", finalUrl);
      for (const [key, value] of Object.entries({ ...defaults.headers, ...options.headers })) {
        if (key.toLowerCase() === "content-type") continue;
        xhr.setRequestHeader(key, value);
      }
      const token = csrfToken();
      if (token) xhr.setRequestHeader(defaults.csrfHeader, token);
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        options.onProgress?.(
          Math.round(event.loaded / event.total * 100),
          event.loaded,
          event.total
        );
      });
      xhr.addEventListener("load", () => {
        const contentType = xhr.getResponseHeader("content-type") || "";
        let data2 = xhr.responseText;
        if (contentType.includes("json")) {
          try {
            data2 = JSON.parse(xhr.responseText);
          } catch {
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data2);
        else reject(new HttpError(`Upload failed with status ${xhr.status}`));
      });
      xhr.addEventListener("error", () => reject(new HttpError("Network failure during upload")));
      xhr.addEventListener("abort", () => reject(new HttpError("Upload canceled")));
      options.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(data);
    });
  },
  /** Server-Sent Events with automatic reconnection by the browser. */
  sse(url, handlers = {}) {
    const source = new EventSource(buildURL({ url }));
    source.addEventListener("message", (event) => {
      let data = event.data;
      try {
        data = JSON.parse(event.data);
      } catch {
      }
      handlers.message?.(data, event);
    });
    if (handlers.error) source.addEventListener("error", handlers.error);
    return source;
  },
  /** Read a streaming response line by line (NDJSON). */
  async stream(url, onLine, options = {}) {
    const response = await fetch(buildURL({ url, params: options.params }), {
      headers: { ...defaults.headers, ...options.headers },
      signal: options.signal
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onLine(line);
    }
    if (buffer.trim()) onLine(buffer);
  },
  interceptors: {
    request: {
      use(fn) {
        requestInterceptors.push(fn);
        return () => {
          const i = requestInterceptors.indexOf(fn);
          if (i > -1) requestInterceptors.splice(i, 1);
        };
      }
    },
    response: {
      use(fn) {
        responseInterceptors.push(fn);
        return () => {
          const i = responseInterceptors.indexOf(fn);
          if (i > -1) responseInterceptors.splice(i, 1);
        };
      }
    },
    error: {
      use(fn) {
        errorInterceptors.push(fn);
        return () => {
          const i = errorInterceptors.indexOf(fn);
          if (i > -1) errorInterceptors.splice(i, 1);
        };
      }
    }
  },
  /** Set headers sent on every request. */
  setHeader(name, value) {
    if (value === null) delete defaults.headers[name];
    else defaults.headers[name] = value;
  },
  /** Shortcut for token-based authentication. */
  setToken(token, scheme = "Bearer") {
    this.setHeader("Authorization", token ? `${scheme} ${token}` : null);
  },
  setBaseURL(url) {
    defaults.baseURL = url;
  },
  clearCache,
  flushOfflineQueue,
  parseDuration
};

export { HttpError, clearCache, flushOfflineQueue, http, request };
//# sourceMappingURL=chunk-KE6WWJOB.js.map
//# sourceMappingURL=chunk-KE6WWJOB.js.map