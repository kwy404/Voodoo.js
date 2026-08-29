import { __export } from './chunk-5V56KGIJ.js';

/**
 * Voodoo.js v0.1.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  capitalize: () => capitalize,
  chunk: () => chunk,
  clone: () => clone,
  debounce: () => debounce,
  device: () => device,
  escapeHtml: () => escapeHtml,
  formatCurrency: () => formatCurrency,
  formatDate: () => formatDate,
  formatFileSize: () => formatFileSize,
  formatNumber: () => formatNumber,
  formatPercent: () => formatPercent,
  get: () => get,
  groupBy: () => groupBy,
  isBrowser: () => isBrowser,
  memoize: () => memoize,
  merge: () => merge,
  once: () => once,
  parseDuration: () => parseDuration,
  random: () => random,
  relativeTime: () => relativeTime,
  sample: () => sample,
  set: () => set,
  setFormatDefaults: () => setFormatDefaults,
  sleep: () => sleep,
  slugify: () => slugify,
  sortBy: () => sortBy,
  stripTags: () => stripTags,
  throttle: () => throttle,
  titleCase: () => titleCase,
  truncate: () => truncate,
  uid: () => uid,
  unique: () => unique,
  uuid: () => uuid
});
function uuid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : r & 3 | 8).toString(16);
  });
}
function uid(prefix = "v") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
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
function debounce(fn, wait = 250, immediate = false) {
  let timer = null;
  let lastArgs = null;
  let lastThis;
  const debounced = function(...args) {
    lastArgs = args;
    lastThis = this;
    const callNow = immediate && timer === null;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate && lastArgs) fn.apply(lastThis, lastArgs);
    }, wait);
    if (callNow) fn.apply(this, args);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn.apply(lastThis, lastArgs);
    }
  };
  return debounced;
}
function throttle(fn, wait = 250) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  const throttled = function(...args) {
    const now = Date.now();
    lastArgs = args;
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) fn.apply(this, lastArgs);
      }, remaining);
    }
  };
  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  throttled.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn.apply(null, lastArgs);
    }
  };
  return throttled;
}
function once(fn) {
  let called = false;
  let result;
  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = /* @__PURE__ */ new Map();
  const memoized = function(...args) {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const value = fn.apply(this, args);
    cache.set(key, value);
    return value;
  };
  memoized.cache = cache;
  return memoized;
}
function clone(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
    }
  }
  if (Array.isArray(value)) return value.map((v) => clone(v));
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, clone(v)]));
  if (value instanceof Set) return new Set([...value].map((v) => clone(v)));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = clone(v);
  return out;
}
function merge(target, ...sources) {
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      const current = target[key];
      if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)) {
        target[key] = merge({ ...current }, value);
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}
function groupBy(list, key) {
  const out = {};
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  for (const item of list) {
    const k = String(getKey(item));
    (out[k] || (out[k] = [])).push(item);
  }
  return out;
}
function unique(list, key) {
  if (!key) return [...new Set(list)];
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of list) {
    const k = getKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
function chunk(list, size = 10) {
  if (size < 1) return [list];
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
function sortBy(list, key, direction = "asc") {
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  const factor = direction === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const va = getKey(a);
    const vb = getKey(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, void 0, { numeric: true }) * factor;
    }
    return (va > vb ? 1 : va < vb ? -1 : 0) * factor;
  });
}
function get(object, path, fallback) {
  const parts = path.split(".");
  let current = object;
  for (const part of parts) {
    if (current == null) return fallback;
    current = current[part];
  }
  return current ?? fallback;
}
function set(object, path, value) {
  const parts = path.split(".");
  let current = object;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}
function random(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}
function slugify(text, separator = "-") {
  return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`\\${separator}{2,}`, "g"), separator).replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");
}
function truncate(text, length = 100, suffix = "...") {
  const value = String(text ?? "");
  if (value.length <= length) return value;
  return value.slice(0, Math.max(0, length - suffix.length)).trimEnd() + suffix;
}
function capitalize(text) {
  const value = String(text ?? "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function titleCase(text) {
  return String(text ?? "").replace(/\w\S*/g, (word) => capitalize(word.toLowerCase()));
}
function escapeHtml(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function stripTags(html) {
  return String(html ?? "").replace(/<\/?[^>]+(>|$)/g, "");
}
var defaultLocale = "pt-BR";
var defaultCurrency = "BRL";
function setFormatDefaults(locale, currency) {
  if (locale) defaultLocale = locale;
  if (currency) defaultCurrency = currency;
}
function formatCurrency(value, options = {}) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(options.locale ?? defaultLocale, {
    style: "currency",
    currency: options.currency ?? defaultCurrency
  }).format(n);
}
function formatNumber(value, options = {}) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "";
  const { locale, ...rest } = options;
  return new Intl.NumberFormat(locale ?? defaultLocale, rest).format(n);
}
function formatDate(value, format = "short", locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const loc = locale ?? defaultLocale;
  if (typeof format === "object") return new Intl.DateTimeFormat(loc, format).format(date);
  const presets = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    long: { day: "2-digit", month: "long", year: "numeric" },
    full: { dateStyle: "full" },
    time: { hour: "2-digit", minute: "2-digit" },
    datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
  };
  if (presets[format]) return new Intl.DateTimeFormat(loc, presets[format]).format(date);
  const pad = (n) => String(n).padStart(2, "0");
  return format.replace(/YYYY/g, String(date.getFullYear())).replace(/YY/g, String(date.getFullYear()).slice(-2)).replace(/MM/g, pad(date.getMonth() + 1)).replace(/DD/g, pad(date.getDate())).replace(/HH/g, pad(date.getHours())).replace(/mm/g, pad(date.getMinutes())).replace(/ss/g, pad(date.getSeconds()));
}
function relativeTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units = [
    ["year", 31536e6],
    ["month", 2592e6],
    ["week", 6048e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3]
  ];
  const rtf = new Intl.RelativeTimeFormat(locale ?? defaultLocale, { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "";
}
function formatFileSize(bytes, decimals = 1) {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}
function formatPercent(value, decimals = 0, locale) {
  return new Intl.NumberFormat(locale ?? defaultLocale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
var device = {
  get touch() {
    return isBrowser && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  },
  get mobile() {
    return isBrowser && window.matchMedia("(max-width: 767px)").matches;
  },
  get tablet() {
    return isBrowser && window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
  },
  get desktop() {
    return isBrowser && window.matchMedia("(min-width: 1024px)").matches;
  },
  get online() {
    return !isBrowser || navigator.onLine;
  },
  get reducedMotion() {
    return isBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },
  get darkMode() {
    return isBrowser && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
};

export { capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, utils_exports, uuid };
//# sourceMappingURL=chunk-45K3USNK.js.map
//# sourceMappingURL=chunk-45K3USNK.js.map