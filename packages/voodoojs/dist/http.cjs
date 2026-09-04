'use strict';

/**
 * Voodoo.js v0.12.5
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/utils/index.ts
function parseDuration(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return value;
  const match = /^\s*([\d.]+)\s*(ms|s|m|h)?\s*$/i.exec(String(value));
  if (!match) return fallback;
  const amount = parseFloat(match[1]);
  switch ((match[2] || "ms").toLowerCase()) {
    case "s":
      return amount * 1e3;
    case "m":
      return amount * 6e4;
    case "h":
      return amount * 36e5;
    default:
      return amount;
  }
}

// src/http/index.ts
var HttpError = class extends Error {
  constructor(message, response, config2, cause) {
    super(message);
    __publicField(this, "response", response);
    __publicField(this, "config", config2);
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
function cacheKey(config2) {
  return `${config2.method ?? "GET"} ${buildURL(config2)}`;
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
function enqueueOffline(config2) {
  if (typeof localStorage === "undefined") return;
  const list = readQueue();
  list.push({
    url: buildURL(config2),
    method: config2.method ?? "POST",
    body: config2.body,
    headers: config2.headers ?? {},
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
function buildURL(config2) {
  let url = config2.url;
  const base = defaults.baseURL;
  if (base && !/^https?:\/\//i.test(url) && !url.startsWith("//")) {
    url = `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  }
  if (config2.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(config2.params)) {
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
function podeRepetir(method, config2, headers, url) {
  if (METODOS_SEGUROS.has(method)) return true;
  if (config2.retryUnsafe === true) return true;
  if (temChaveDeIdempotencia(headers)) return true;
  if ((config2.retry ?? 0) > 0) ;
  return false;
}
async function request(input) {
  let config2 = {
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
    config2 = await interceptor(config2);
  }
  const method = (config2.method ?? "GET").toUpperCase();
  if (config2.cache && method === "GET") {
    const entry = responseCache.get(cacheKey(config2));
    if (entry && entry.expires > Date.now()) return entry.value;
  }
  if (config2.offlineQueue && typeof navigator !== "undefined" && navigator.onLine === false && method !== "GET") {
    enqueueOffline(config2);
    return {
      data: null,
      status: 0,
      statusText: "offline-queued",
      headers: new Headers(),
      ok: true,
      raw: new Response(null, { status: 202 }),
      config: config2
    };
  }
  const headers = { ...config2.headers };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token && !headers[defaults.csrfHeader]) headers[defaults.csrfHeader] = token;
  }
  headers["X-Requested-With"] || (headers["X-Requested-With"] = "XMLHttpRequest");
  const body = prepareBody(config2.body, headers);
  const url = buildURL(config2);
  const attempts = podeRepetir(method, config2, headers) ? (config2.retry ?? 0) + 1 : 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const externo = config2.signal;
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
    const timeoutId = config2.timeout && config2.timeout > 0 ? setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), config2.timeout) : null;
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? void 0 : body,
        credentials: config2.credentials,
        signal: controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      const data = await parseResponse(response, config2.responseType);
      let result = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        raw: response,
        config: config2
      };
      if (!response.ok) {
        if (response.status >= 500 && attempt < attempts - 1) {
          await wait((config2.retryDelay ?? 500) * 2 ** attempt);
          continue;
        }
        const error2 = new HttpError(
          `Request failed with status ${response.status}`,
          result,
          config2
        );
        for (const interceptor of errorInterceptors) interceptor(error2);
        throw error2;
      }
      for (const interceptor of responseInterceptors) {
        result = await interceptor(result);
      }
      if (config2.cache && method === "GET") {
        responseCache.set(cacheKey(config2), {
          expires: Date.now() + config2.cache,
          value: result
        });
      }
      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      if (err instanceof HttpError) throw err;
      lastError = err;
      const aborted = err?.name === "AbortError" && config2.signal?.aborted;
      if (aborted) break;
      if (attempt < attempts - 1) {
        await wait((config2.retryDelay ?? 500) * 2 ** attempt);
        continue;
      }
    }
  }
  const message = lastError?.name === "TimeoutError" ? `Timeout after ${config2.timeout}ms` : `Network failure accessing ${url}`;
  const error = new HttpError(message, void 0, config2, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function shortcut(config2) {
  const response = await request(config2);
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

exports.HttpError = HttpError;
exports.clearCache = clearCache;
exports.flushOfflineQueue = flushOfflineQueue;
exports.http = http;
exports.request = request;
//# sourceMappingURL=http.cjs.map
//# sourceMappingURL=http.cjs.map