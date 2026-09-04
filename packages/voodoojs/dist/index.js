import { core, sound, hotkey, palette, registerMask, unmask, applyMask, masks, mask, clearErrors, showFieldError, showFormErrors, messages, serializeForm, validate, validator, dialog, prompt, confirm, alert, modal, VoodooCollection, fromHtml, ready2, query, viewTransition, defineComponent, storage, ensurePalette, instances, storeNames, allStores } from './chunk-TUXGS7XW.js';
export { VoodooCollection, alert, allStores, applyMask, cache, clearErrors, clipboard, confirm, cookie, createApp, createResource, defineComponent, dialog, ready as documentReady, enter, fadeIn, fadeOut, fromHtml, hotkey, installHooks, instances, leave, mask, masks, modal, mountComponent, network, palette, prompt, query, ready2 as ready, registerMask, removeStore, createResource as resource, screen, serializeForm, session, showFormErrors, slideDown, slideUp, sound, efeitos as soundEffects, storage, store, storeNames, theme, toast, unmask, url, useContext, useEffect, useMemo, useRef, useState, validate, validator, viewTransition, whenElement, whenReady } from './chunk-TUXGS7XW.js';
export { gpu, reflectWgsl } from './chunk-JB72AX7G.js';
import { http } from './chunk-X3FZPWI6.js';
export { HttpError, http, request } from './chunk-X3FZPWI6.js';
import { devtoolsBus } from './chunk-L3JNHLTI.js';
export { createSocket, devtoolsBus, socket, socketSupported } from './chunk-L3JNHLTI.js';
import { magic, markSkipChildren, onStart, rootScope, findScope, destroy, readAttr, evaluate, parse, Scope, getScope, walk, unwrap, addCleanup, hadDirectives, collectDirectives, getEffectScopes, evaluateIn } from './chunk-6QFKV444.js';
export { Scope, VoodooRuntimeError, VoodooSyntaxError, addCleanup, allowedGlobals, clearParseCache, destroy, evaluate, findScope, getScope, hook, hooks, magic, magics, parse, refresh, rootScope, start, stringify, tokenize, walk } from './chunk-6QFKV444.js';
import { reactive, warn, handleError, effect, queuePostFlush, nextTick } from './chunk-PPT7RDKJ.js';
export { EffectScope, computed, effect, effectScope, flushSync, isReactive, markRaw, nextTick, reactive, ref, shallowRef, stop, toRaw, unref, watch, watchEffect } from './chunk-PPT7RDKJ.js';
import { warnAlias } from './chunk-YH3IDF6L.js';
import { parseDuration, formatNumber, formatCurrency, formatDate, relativeTime, device, setFormatDefaults, uid, merge, escapeHtml, truncate, get, titleCase } from './chunk-D45ZEXUO.js';
export { capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, matchesMedia, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, uuid } from './chunk-D45ZEXUO.js';
import { ensureTokens, injectStyle } from './chunk-IWHK6Y32.js';
export { ensureTokens, injectStyle } from './chunk-IWHK6Y32.js';
import { defineDirective, PRIORITY, config } from './chunk-OH6FIDTW.js';
export { PRIORITY, config, defineDirective } from './chunk-OH6FIDTW.js';
import './chunk-PO6REBDJ.js';

/**
 * Voodoo.js v0.12.5
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/router/index.ts
var settings = {
  mode: "history",
  base: "/",
  beforeEach: null,
  afterEach: null,
  linkActiveClass: "v-link-active",
  linkExactActiveClass: "v-link-exact-active",
  transition: true,
  titleTemplate: "%s",
  scrollBehavior: null
};
var HISTORY_KEY = "__voodooRoute";
var MAX_REDIRECTS = 10;
var compiled = [];
var scrollPositions = /* @__PURE__ */ new Map();
var viewCache = /* @__PURE__ */ new Map();
var currentKey = "inicial";
var listening = false;
var configured = false;
function emptyLocation() {
  return {
    path: "/",
    fullPath: "/",
    params: {},
    query: {},
    hash: "",
    name: "",
    meta: {},
    matched: null
  };
}
var route = reactive(emptyLocation());
function normalizePath(path) {
  let out = path || "/";
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/{2,}/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}
function parseQuery(search) {
  const out = {};
  if (!search) return out;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
function stringifyQuery(query2) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query2)) {
    if (value === void 0 || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}
function splitTarget(target) {
  let rest = target || "/";
  let hash = "";
  const hashIndex = rest.indexOf("#");
  if (hashIndex > -1) {
    hash = rest.slice(hashIndex + 1);
    rest = rest.slice(0, hashIndex);
  }
  let query2 = {};
  const queryIndex = rest.indexOf("?");
  if (queryIndex > -1) {
    query2 = parseQuery(rest.slice(queryIndex + 1));
    rest = rest.slice(0, queryIndex);
  }
  return { path: normalizePath(rest), query: query2, hash };
}
function stripBase(pathname) {
  const base = settings.base.replace(/\/$/, "");
  if (!base || base === "") return pathname;
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}
function readLocation() {
  if (typeof window === "undefined") return { path: "/", query: {}, hash: "" };
  if (settings.mode === "hash") {
    return splitTarget(window.location.hash.slice(1) || "/");
  }
  return {
    path: normalizePath(stripBase(window.location.pathname)),
    query: parseQuery(window.location.search),
    hash: window.location.hash.slice(1)
  };
}
function fullPathOf(path, query2, hash) {
  const qs = stringifyQuery(query2);
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}
function buildUrl(location) {
  const suffix = fullPathOf(location.path, location.query, location.hash);
  if (settings.mode === "hash") {
    const { pathname, search } = window.location;
    return `${pathname}${search}#${suffix}`;
  }
  const base = settings.base === "/" ? "" : settings.base.replace(/\/$/, "");
  return `${base}${suffix}` || "/";
}
var historyRefused = false;
var writingHash = false;
function writeUrl(state2, url2, replace) {
  if (!historyRefused) {
    try {
      if (replace) window.history.replaceState(state2, "", url2);
      else window.history.pushState(state2, "", url2);
      return;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "SecurityError") throw error;
      historyRefused = true;
    }
  }
  if (settings.mode !== "hash") return;
  const marker = url2.indexOf("#");
  if (marker < 0) return;
  const hash = url2.slice(marker);
  if (window.location.hash === hash) return;
  writingHash = true;
  try {
    window.location.hash = hash;
  } finally {
    setTimeout(() => {
      writingHash = false;
    }, 0);
  }
}
function compileRoute(pattern, record) {
  const clean = pattern === "*" ? "*" : normalizePath(pattern);
  const raw = clean === "*" ? ["*"] : clean.split("/").filter(Boolean);
  const segments = [];
  let score = raw.length * 10;
  for (const piece of raw) {
    if (piece === "*" || piece === "**") {
      segments.push({ type: "wildcard", value: "*", optional: true });
      score -= 30;
      continue;
    }
    if (piece.startsWith(":")) {
      const optional = piece.endsWith("?");
      const name = piece.slice(1, optional ? -1 : void 0);
      segments.push({ type: "param", value: name, optional });
      score += optional ? 1 : 2;
      continue;
    }
    segments.push({ type: "static", value: piece, optional: false });
    score += 4;
  }
  return { pattern: clean, segments, score, record };
}
function matchSegments(segments, parts) {
  const params = {};
  let index = 0;
  for (const segment of segments) {
    if (segment.type === "wildcard") {
      params["*"] = parts.slice(index).map(decodeSafe).join("/");
      return params;
    }
    if (index >= parts.length) {
      if (segment.optional) continue;
      return null;
    }
    const part = parts[index];
    if (segment.type === "static") {
      if (decodeSafe(part) !== segment.value) return null;
      index++;
      continue;
    }
    params[segment.value] = decodeSafe(part);
    index++;
  }
  return index === parts.length ? params : null;
}
function decodeSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function matchRoute(path) {
  const parts = path.split("/").filter(Boolean);
  let best = null;
  for (const candidate of compiled) {
    const params = matchSegments(candidate.segments, parts);
    if (!params) continue;
    if (!best || candidate.score > best.route.score) best = { route: candidate, params };
  }
  return best;
}
function findRecord(pattern) {
  if (!pattern) return null;
  return compiled.find((item) => item.pattern === pattern)?.record ?? null;
}
function resolve(target) {
  const { path, query: query2, hash } = splitTarget(target);
  return locationFor(path, query2, hash);
}
function locationFor(path, query2, hash) {
  const found = matchRoute(path);
  return {
    path,
    fullPath: fullPathOf(path, query2, hash),
    params: found ? found.params : {},
    query: query2,
    hash,
    name: found?.route.record.name ?? "",
    meta: found?.route.record.meta ?? {},
    matched: found ? found.route.pattern : null
  };
}
function snapshot() {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: { ...route.params },
    query: { ...route.query },
    hash: route.hash,
    name: route.name,
    meta: route.meta,
    matched: route.matched
  };
}
function applyLocation(location) {
  route.path = location.path;
  route.fullPath = location.fullPath;
  route.params = location.params;
  route.query = location.query;
  route.hash = location.hash;
  route.name = location.name;
  route.meta = location.meta;
  route.matched = location.matched;
  const record = findRecord(location.matched);
  if (record?.title && typeof document !== "undefined") {
    document.title = settings.titleTemplate.includes("%s") ? settings.titleTemplate.replace("%s", record.title) : record.title;
  }
}
async function runGuards(to, from) {
  const record = findRecord(to.matched);
  if (record?.redirect) return record.redirect;
  if (record?.beforeEnter) {
    const verdict = await record.beforeEnter(to, from);
    if (verdict === false) return false;
    if (typeof verdict === "string") return verdict;
  }
  if (settings.beforeEach) {
    const verdict = await settings.beforeEach(to, from);
    if (verdict === false) return false;
    if (typeof verdict === "string") return verdict;
  }
  return true;
}
function saveScroll() {
  if (typeof window === "undefined") return;
  scrollPositions.set(currentKey, window.scrollY);
}
function scheduleScroll(to, from, saved) {
  if (typeof window === "undefined") return;
  queuePostFlush(() => {
    requestAnimationFrame(() => {
      const moveTo = (top) => {
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
      };
      if (settings.scrollBehavior) {
        const custom = settings.scrollBehavior(to, from, saved);
        if (custom === false) return;
        if (typeof custom === "number") {
          moveTo(custom);
          return;
        }
      }
      if (to.hash) {
        const anchor = document.getElementById(to.hash) ?? (/^[\w-]+$/.test(to.hash) ? document.querySelector(`[name="${to.hash}"]`) : null);
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      moveTo(saved ?? 0);
    });
  });
}
async function navigate(target, options = {}) {
  if (typeof window === "undefined") return false;
  startListening();
  const from = snapshot();
  let destination = resolve(target);
  if (!options.force && destination.fullPath === from.fullPath) return true;
  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn(`Router: too many redirects when navigating to "${target}".`);
      return false;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) {
      devtoolsBus.emit("navigation", {
        from: from.fullPath,
        to: destination.fullPath,
        cancelled: true,
        matched: destination.matched
      });
      return false;
    }
    if (typeof verdict === "string") {
      destination = resolve(verdict);
      continue;
    }
    break;
  }
  saveScroll();
  const key = uid("rota");
  const historyState = { ...options.state ?? {}, [HISTORY_KEY]: key };
  const url2 = buildUrl(destination);
  writeUrl(historyState, url2, options.replace === true);
  currentKey = key;
  applyLocation(destination);
  if (options.scroll !== false) scheduleScroll(destination, from, null);
  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit("navigation", {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched
  });
  return true;
}
async function onHistoryChange(event) {
  if (writingHash) return;
  const { path, query: query2, hash } = readLocation();
  const destination = locationFor(path, query2, hash);
  const from = snapshot();
  if (destination.fullPath === from.fullPath) return;
  const verdict = await runGuards(destination, from);
  if (verdict === false) {
    writeUrl({ [HISTORY_KEY]: currentKey }, buildUrl(from), true);
    devtoolsBus.emit("navigation", {
      from: from.fullPath,
      to: destination.fullPath,
      cancelled: true,
      matched: destination.matched
    });
    return;
  }
  if (typeof verdict === "string") {
    void navigate(verdict, { replace: true });
    return;
  }
  saveScroll();
  const state2 = event.state;
  const key = state2 && state2[HISTORY_KEY] || uid("rota");
  currentKey = key;
  applyLocation(destination);
  scheduleScroll(destination, from, scrollPositions.get(key) ?? 0);
  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit("navigation", {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched
  });
}
function historyListener(event) {
  void onHistoryChange(event);
}
function startListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  window.addEventListener("popstate", historyListener);
  if (settings.mode === "hash") window.addEventListener("hashchange", historyListener);
  window.addEventListener("beforeunload", saveScroll);
}
function stopRouter() {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("popstate", historyListener);
  window.removeEventListener("hashchange", historyListener);
  window.removeEventListener("beforeunload", saveScroll);
  historyRefused = false;
  writingHash = false;
}
async function enterInitialRoute() {
  if (typeof window === "undefined") return;
  const { path, query: query2, hash } = readLocation();
  const from = snapshot();
  let destination = locationFor(path, query2, hash);
  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn("Router: too many redirects in the initial route.");
      return;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) return;
    if (typeof verdict === "string") {
      destination = resolve(verdict);
      continue;
    }
    break;
  }
  currentKey = uid("rota");
  writeUrl({ [HISTORY_KEY]: currentKey }, buildUrl(destination), true);
  applyLocation(destination);
  if (destination.hash) scheduleScroll(destination, from, null);
  settings.afterEach?.(snapshot(), from);
}
function addRoute(pattern, record) {
  const compiledRoute = compileRoute(pattern, record);
  const index = compiled.findIndex((item) => item.pattern === compiledRoute.pattern);
  if (index > -1) compiled.splice(index, 1, compiledRoute);
  else compiled.push(compiledRoute);
}
function removeRoute(pattern) {
  const clean = pattern === "*" ? "*" : normalizePath(pattern);
  const index = compiled.findIndex((item) => item.pattern === clean);
  if (index > -1) compiled.splice(index, 1);
}
function routePatterns() {
  return [...compiled].sort((a, b) => b.score - a.score).map((item) => item.pattern);
}
function clearViewCache(url2) {
  if (url2) viewCache.delete(url2);
  else viewCache.clear();
}
function configureRouter(options) {
  settings.mode = options.mode ?? "history";
  settings.base = normalizePath(options.base ?? "/");
  settings.beforeEach = options.beforeEach ?? null;
  settings.afterEach = options.afterEach ?? null;
  settings.linkActiveClass = options.linkActiveClass ?? "v-link-active";
  settings.linkExactActiveClass = options.linkExactActiveClass ?? "v-link-exact-active";
  settings.transition = options.transition ?? true;
  settings.titleTemplate = options.titleTemplate ?? "%s";
  settings.scrollBehavior = options.scrollBehavior ?? null;
  compiled.length = 0;
  for (const [pattern, record] of Object.entries(options.routes ?? {})) {
    compiled.push(compileRoute(pattern, record));
  }
  configured = true;
  startListening();
  void enterInitialRoute();
  return router;
}
var routerMembers = {
  get current() {
    return route;
  },
  push: (target, options = {}) => navigate(target, options),
  replace: (target, options = {}) => navigate(target, { ...options, replace: true }),
  navigate,
  back: () => {
    if (typeof window !== "undefined") window.history.back();
  },
  forward: () => {
    if (typeof window !== "undefined") window.history.forward();
  },
  go: (delta) => {
    if (typeof window !== "undefined") window.history.go(delta);
  },
  resolve,
  addRoute,
  removeRoute,
  patterns: routePatterns,
  stop: stopRouter,
  clearViewCache,
  get ready() {
    return configured;
  }
};
var router = Object.defineProperties(
  configureRouter,
  Object.getOwnPropertyDescriptors(routerMembers)
);
magic("$route", () => route);
magic("$router", () => router);
async function loadView(url2) {
  const cached = viewCache.get(url2);
  if (cached !== void 0) return cached;
  const html = await http.get(url2, { responseType: "text" });
  const text = typeof html === "string" ? html : String(html ?? "");
  viewCache.set(url2, text);
  return text;
}
function paramsSignature(params) {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join("&");
}
defineDirective(
  "router-view",
  ({ el, scope, modifiers, effect: effect2, cleanup }) => {
    markSkipChildren(el);
    const fallbackHtml = el.innerHTML;
    const useTransition = settings.transition && !modifiers["no-transition"];
    let token = 0;
    const unmount = () => {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = "";
    };
    const mount = (record, html) => {
      unmount();
      if (record?.component) {
        const host = document.createElement("div");
        host.setAttribute(`${config.prefix}component`, record.component);
        host.className = "v-router-page";
        el.appendChild(host);
        walk(host, scope);
        return;
      }
      el.innerHTML = html ?? fallbackHtml;
      for (const child of Array.from(el.childNodes)) walk(child, scope);
    };
    const render2 = async (record, current) => {
      let html = null;
      if (record?.view) {
        el.classList.add("v-router-loading");
        try {
          html = await loadView(record.view);
        } catch (err) {
          handleError(err, `v-router-view loading "${record.view}"`);
          html = "";
        } finally {
          el.classList.remove("v-router-loading");
        }
        if (current !== token) return;
      }
      if (useTransition) viewTransition(() => mount(record, html));
      else mount(record, html);
    };
    effect2(() => {
      const matched = route.matched;
      void paramsSignature(route.params);
      const record = findRecord(matched);
      void render2(record, ++token);
    });
    cleanup(() => {
      token++;
      unmount();
    });
  },
  { priority: PRIORITY.DEFAULT }
);
var EXTERNAL_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;
function isExternalHref(href) {
  if (!href) return true;
  if (href.startsWith("//")) return true;
  if (EXTERNAL_PROTOCOL.test(href)) return true;
  return false;
}
function linkTarget(el, expression, evaluate2) {
  const raw = expression.trim();
  if (raw) {
    if (raw.startsWith("/") || raw.startsWith("#")) return raw;
    const value = evaluate2(raw);
    if (typeof value === "string" && value) return value;
    return raw;
  }
  const href = el.getAttribute("href") ?? "";
  if (settings.mode === "hash" && href.startsWith("#")) return href.slice(1) || "/";
  return href;
}
function isActivePath(target, exact) {
  const { path } = splitTarget(target);
  if (path === "/" || exact) return route.path === path;
  return route.path === path || route.path.startsWith(`${path}/`);
}
defineDirective("link", ({ el, expression, modifiers, effect: effect2, cleanup, evaluate: evaluate2 }) => {
  const anchor = el;
  const onClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const target = anchor.getAttribute("target");
    if (target && target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    if ((anchor.getAttribute("rel") ?? "").split(/\s+/).includes("external")) return;
    const destination = linkTarget(el, expression, evaluate2);
    if (!destination) return;
    if (isExternalHref(destination)) return;
    if (settings.mode !== "hash" && destination.startsWith("#")) return;
    event.preventDefault();
    void navigate(destination, {
      replace: !!modifiers.replace,
      scroll: modifiers["no-scroll"] ? false : void 0
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
  effect2(() => {
    const destination = linkTarget(el, expression, evaluate2);
    if (!destination || isExternalHref(destination)) return;
    const exact = isActivePath(destination, true);
    const active = exact || isActivePath(destination, false);
    el.classList.toggle(settings.linkActiveClass, active);
    el.classList.toggle(settings.linkExactActiveClass, exact);
    if (exact) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
});
defineDirective("route-active", ({ el, expression, arg, modifiers, effect: effect2, evaluate: evaluate2 }) => {
  const className = arg || "active";
  effect2(() => {
    const raw = expression.trim();
    const target = raw.startsWith("/") || !raw ? raw : evaluate2(raw) ?? raw;
    const active = target ? isActivePath(String(target), !!modifiers.exact) : false;
    el.classList.toggle(className, active);
  });
});

// src/i18n/index.ts
var STORAGE_KEY = "voodoo:locale";
var state = reactive({
  locale: config.locale || "pt-BR",
  fallback: "en",
  currency: config.currency || "BRL",
  messages: {}
});
var persistKey = STORAGE_KEY;
var loadPath = "";
var loading = /* @__PURE__ */ new Map();
function lookupMessage(locale, key) {
  const tree = state.messages[locale];
  if (!tree) return null;
  const flat = tree[key];
  if (typeof flat === "string") return flat;
  let current = tree;
  for (const part of key.split(".")) {
    if (current == null || typeof current === "string") return null;
    current = current[part];
  }
  return typeof current === "string" ? current : null;
}
function candidateLocales(locale) {
  const out = [locale];
  const short = locale.split("-")[0];
  if (short && short !== locale) out.push(short);
  for (const available of Object.keys(state.messages)) {
    if (available !== locale && available.split("-")[0] === short) out.push(available);
  }
  return out;
}
var pluralRulesCache = /* @__PURE__ */ new Map();
function pluralCategory(locale, count) {
  try {
    let rules = pluralRulesCache.get(locale);
    if (!rules) pluralRulesCache.set(locale, rules = new Intl.PluralRules(locale));
    return rules.select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}
var CATEGORY_ORDER = ["zero", "one", "two", "few", "many", "other"];
function choosePlural(forms, count, locale) {
  if (forms.length <= 1) return forms[0] ?? "";
  const category = pluralCategory(locale, count);
  if (forms.length === 2) return category === "one" ? forms[0] : forms[1];
  if (forms.length === 3) {
    if (count === 0) return forms[0];
    return category === "one" ? forms[1] : forms[2];
  }
  const index = CATEGORY_ORDER.indexOf(category);
  return forms[Math.min(index < 0 ? forms.length - 1 : index, forms.length - 1)];
}
var PLACEHOLDER = /\{\s*([\w.$-]+)\s*\}/g;
function interpolate(message, params) {
  if (message.indexOf("{") === -1) return message;
  return message.replace(PLACEHOLDER, (whole, name) => {
    const value = params[name];
    if (value === void 0 || value === null) return whole;
    return String(value);
  });
}
function normalizeParams(params) {
  if (params == null) return {};
  if (typeof params === "number") return { n: params };
  return params;
}
function t(key, params) {
  if (!key) return "";
  const values = normalizeParams(params);
  const locale = state.locale;
  let message = null;
  for (const candidate of candidateLocales(locale)) {
    message = lookupMessage(candidate, key);
    if (message !== null) break;
  }
  if (message === null && state.fallback && state.fallback !== locale) {
    for (const candidate of candidateLocales(state.fallback)) {
      message = lookupMessage(candidate, key);
      if (message !== null) break;
    }
  }
  if (message === null) return key;
  if (message.includes("|")) {
    const count = Number(values.n ?? values.count ?? 0);
    const forms = message.split("|").map((form) => form.trim());
    message = choosePlural(forms, Number.isNaN(count) ? 0 : count, locale);
  }
  return interpolate(message, values);
}
function te(key, locale) {
  const target = locale ?? state.locale;
  for (const candidate of candidateLocales(target)) {
    if (lookupMessage(candidate, key) !== null) return true;
  }
  if (state.fallback && state.fallback !== target) {
    for (const candidate of candidateLocales(state.fallback)) {
      if (lookupMessage(candidate, key) !== null) return true;
    }
  }
  return false;
}
function n(value, options = {}) {
  return formatNumber(value, { ...options, locale: state.locale });
}
function c(value, currency) {
  return formatCurrency(value, { locale: state.locale, currency: currency ?? state.currency });
}
function d(value, format = "short") {
  return formatDate(value, format, state.locale);
}
function rt(value) {
  return relativeTime(value, state.locale);
}
function getLocale() {
  return state.locale;
}
function messagesOf(locale) {
  return state.messages[locale ?? state.locale] ?? {};
}
function addMessages(locale, messages2) {
  const current = state.messages[locale];
  if (current) merge(current, messages2);
  else state.messages[locale] = messages2;
  return locale;
}
async function loadMessages(locale, source) {
  if (typeof source !== "string") {
    addMessages(locale, source);
    return;
  }
  const pending2 = loading.get(locale);
  if (pending2) return pending2;
  const task = http.get(source, { responseType: "json" }).then((data) => {
    if (data && typeof data === "object") addMessages(locale, data);
  }).catch((err) => {
    handleError(err, `i18n ao carregar "${source}"`);
  }).finally(() => {
    loading.delete(locale);
  });
  loading.set(locale, task);
  return task;
}
function setLocale(locale) {
  const target = locale?.trim();
  if (!target || target === state.locale) return Promise.resolve();
  const previous = state.locale;
  state.locale = target;
  state.currency = state.currency || config.currency;
  config.locale = target;
  setFormatDefaults(target, state.currency);
  if (persistKey) storage.set(persistKey, target);
  if (typeof document !== "undefined") document.documentElement.lang = target;
  devtoolsBus.emit("locale", { from: previous, to: target });
  if (!state.messages[target] && loadPath) {
    return loadMessages(target, loadPath.replace("{locale}", target));
  }
  return Promise.resolve();
}
function detectLocale() {
  if (typeof navigator === "undefined") return null;
  const available = Object.keys(state.messages);
  if (!available.length) return null;
  const preferred = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
  for (const wanted of preferred) {
    if (!wanted) continue;
    const exact = available.find((item) => item.toLowerCase() === wanted.toLowerCase());
    if (exact) return exact;
    const short = wanted.split("-")[0].toLowerCase();
    const partial = available.find((item) => item.split("-")[0].toLowerCase() === short);
    if (partial) return partial;
  }
  return null;
}
function configureI18n(options = {}) {
  if (options.messages) {
    for (const [locale, messages2] of Object.entries(options.messages)) {
      addMessages(locale, messages2);
    }
  }
  state.fallback = options.fallback ?? state.fallback;
  state.currency = options.currency ?? config.currency ?? state.currency;
  loadPath = options.loadPath ?? loadPath;
  if (options.persist === false) persistKey = null;
  else if (typeof options.persist === "string") persistKey = options.persist;
  const saved = persistKey ? storage.get(persistKey) : void 0;
  const detected = options.detect === false ? null : detectLocale();
  const chosen = saved || detected || options.locale || state.locale || state.fallback;
  state.locale = chosen;
  config.locale = chosen;
  setFormatDefaults(chosen, state.currency);
  if (typeof document !== "undefined") document.documentElement.lang = chosen;
  if (!state.messages[chosen] && loadPath) {
    void loadMessages(chosen, loadPath.replace("{locale}", chosen));
  }
  return i18n;
}
var i18nDynamic = {
  get locale() {
    return state.locale;
  },
  get fallback() {
    return state.fallback;
  },
  get locales() {
    return Object.keys(state.messages);
  },
  t,
  te,
  n,
  c,
  d,
  rt,
  setLocale,
  getLocale,
  addMessages,
  loadMessages,
  messagesOf,
  detectLocale
};
var i18n = Object.defineProperties(
  configureI18n,
  Object.getOwnPropertyDescriptors(i18nDynamic)
);
magic("$t", () => t);
magic("$locale", () => state.locale);
magic("$i18n", () => i18n);
magic("$n", () => n);
magic("$c", () => c);
magic("$d", () => d);
magic("$rt", () => rt);
var LITERAL_KEY = /^[A-Za-z_$][\w$-]*(\.[A-Za-z_$][\w$-]*)*$/;
function resolveKey(expression, evaluate2) {
  const raw = expression.trim();
  if (!raw) return "";
  if (LITERAL_KEY.test(raw)) return raw;
  const value = evaluate2(raw);
  return typeof value === "string" ? value : raw;
}
function readParams(el, evaluate2) {
  const attr = readAttr(el, `${config.prefix}t-params`) ?? readAttr(el, "data-v-t-params");
  if (!attr) return {};
  const value = evaluate2(attr);
  return value && typeof value === "object" ? value : {};
}
defineDirective("t", ({ el, arg, expression, effect: effect2, evaluate: evaluate2 }) => {
  effect2(() => {
    const key = resolveKey(expression, evaluate2);
    if (!key) return;
    const text = t(key, readParams(el, evaluate2));
    if (arg) el.setAttribute(arg, text);
    else if (el.textContent !== text) el.textContent = text;
  });
});
defineDirective("t-params", () => void 0);
defineDirective("locale", ({ el, expression, effect: effect2, cleanup, evaluate: evaluate2 }) => {
  const target = () => {
    const raw = expression.trim();
    if (!raw) return "";
    if (/^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/.test(raw)) return raw.replace("_", "-");
    const value = evaluate2(raw);
    return typeof value === "string" ? value : raw;
  };
  const onClick = () => {
    const locale = target();
    if (locale) void setLocale(locale);
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
  effect2(() => {
    el.classList.toggle("v-locale-active", target() === state.locale);
  });
});

// src/motion/index.ts
function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return device.reducedMotion;
}
var frameCallbacks = /* @__PURE__ */ new Set();
var frameHandle = 0;
function runFrame(now) {
  frameHandle = 0;
  const pending2 = Array.from(frameCallbacks);
  for (const callback of pending2) {
    if (frameCallbacks.has(callback)) callback(now);
  }
  if (frameCallbacks.size > 0) frameHandle = requestAnimationFrame(runFrame);
}
function addFrame(callback) {
  if (typeof requestAnimationFrame !== "function") return;
  frameCallbacks.add(callback);
  if (!frameHandle) frameHandle = requestAnimationFrame(runFrame);
}
function removeFrame(callback) {
  frameCallbacks.delete(callback);
  if (frameCallbacks.size === 0 && frameHandle) {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
}
var MAX_DURATION = 12e3;
function backIn(t2) {
  return t2 * t2 * (2.70158 * t2 - 1.70158);
}
var easings = {
  /** Constant progress. */
  linear(t2) {
    return t2;
  },
  /** Starts slow and accelerates. */
  easeIn(t2) {
    return t2 * t2 * t2;
  },
  /** Starts fast and decelerates. The default choice for entries. */
  easeOut(t2) {
    return 1 - Math.pow(1 - t2, 3);
  },
  /** Accelerates at the start and brakes at the end. */
  easeInOut(t2) {
    return t2 < 0.5 ? 4 * t2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 3) / 2;
  },
  /** Overshoots the target and comes back, giving a slight exaggeration at the end. */
  easeOutBack(t2) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t2 - 1, 3) + c1 * Math.pow(t2 - 1, 2);
  },
  /** Very long deceleration, good for large entries. */
  easeOutExpo(t2) {
    return t2 >= 1 ? 1 : 1 - Math.pow(2, -10 * t2);
  },
  /** Pulls back slightly before advancing, like taking a running start. */
  anticipate(t2) {
    const doubled = t2 * 2;
    if (doubled < 1) return 0.5 * backIn(doubled);
    return 0.5 * (2 - Math.pow(2, -10 * (doubled - 1)));
  },
  /** Bounces when reaching the target. */
  bounce(t2) {
    const n1 = 7.5625;
    const d1 = 2.75;
    let time = t2;
    if (time < 1 / d1) return n1 * time * time;
    if (time < 2 / d1) {
      time -= 1.5 / d1;
      return n1 * time * time + 0.75;
    }
    if (time < 2.5 / d1) {
      time -= 2.25 / d1;
      return n1 * time * time + 0.9375;
    }
    time -= 2.625 / d1;
    return n1 * time * time + 0.984375;
  }
};
function resolveEasing(easing) {
  if (typeof easing === "function") return easing;
  if (typeof easing === "string") {
    const found = easings[easing];
    if (found) return found;
  }
  return easings.easeOut;
}
var TRANSFORM_DEFAULTS = {
  x: 0,
  y: 0,
  z: 0,
  parallax: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  skewY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1
};
var TRANSFORM_UNITS = {
  x: "px",
  y: "px",
  z: "px",
  parallax: "px",
  rotate: "deg",
  rotateX: "deg",
  rotateY: "deg",
  skewX: "deg",
  skewY: "deg",
  scale: "",
  scaleX: "",
  scaleY: ""
};
var TRANSFORM_ALIASES = {
  translateX: "x",
  translateY: "y",
  translateZ: "z",
  rotateZ: "rotate"
};
var FILTER_DEFAULTS = {
  blur: 0,
  brightness: 1,
  saturate: 1,
  grayscale: 0,
  contrast: 1
};
var FILTER_UNITS = {
  blur: "px",
  brightness: "",
  saturate: "",
  grayscale: "",
  contrast: ""
};
var UNITLESS = /* @__PURE__ */ new Set([
  "opacity",
  "z-index",
  "font-weight",
  "line-height",
  "flex-grow",
  "flex-shrink",
  "order",
  "zoom",
  "fill-opacity",
  "stroke-opacity",
  "stroke-width",
  "stroke-dashoffset",
  "stroke-dasharray"
]);
var transformState = /* @__PURE__ */ new WeakMap();
var filterState = /* @__PURE__ */ new WeakMap();
function getTransformState(el) {
  let state2 = transformState.get(el);
  if (!state2) {
    state2 = { ...TRANSFORM_DEFAULTS };
    transformState.set(el, state2);
  }
  return state2;
}
function getFilterState(el) {
  let state2 = filterState.get(el);
  if (!state2) {
    state2 = { ...FILTER_DEFAULTS };
    filterState.set(el, state2);
  }
  return state2;
}
function round(value) {
  return Math.round(value * 1e3) / 1e3;
}
function applyTransform(el) {
  const state2 = transformState.get(el);
  if (!state2) return;
  const parts = [];
  const y = state2.y + state2.parallax;
  if (state2.x || y || state2.z) {
    parts.push(`translate3d(${round(state2.x)}px, ${round(y)}px, ${round(state2.z)}px)`);
  }
  if (state2.rotateX) parts.push(`rotateX(${round(state2.rotateX)}deg)`);
  if (state2.rotateY) parts.push(`rotateY(${round(state2.rotateY)}deg)`);
  if (state2.rotate) parts.push(`rotate(${round(state2.rotate)}deg)`);
  if (state2.skewX || state2.skewY) {
    parts.push(`skew(${round(state2.skewX)}deg, ${round(state2.skewY)}deg)`);
  }
  const scaleX = state2.scale * state2.scaleX;
  const scaleY = state2.scale * state2.scaleY;
  if (scaleX !== 1 || scaleY !== 1) parts.push(`scale(${round(scaleX)}, ${round(scaleY)})`);
  if (parts.length > 0) el.style.transform = parts.join(" ");
  else el.style.removeProperty("transform");
}
function applyFilter(el) {
  const state2 = filterState.get(el);
  if (!state2) return;
  const parts = [];
  if (state2.blur) parts.push(`blur(${round(state2.blur)}px)`);
  if (state2.brightness !== 1) parts.push(`brightness(${round(state2.brightness)})`);
  if (state2.saturate !== 1) parts.push(`saturate(${round(state2.saturate)})`);
  if (state2.grayscale) parts.push(`grayscale(${round(state2.grayscale)})`);
  if (state2.contrast !== 1) parts.push(`contrast(${round(state2.contrast)})`);
  if (parts.length > 0) el.style.filter = parts.join(" ");
  else el.style.removeProperty("filter");
}
var NUMBER_UNIT = /^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;
var HEX_COLOR = /^#([0-9a-f]{3,8})$/i;
function isColorValue(value) {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return text === "transparent" || HEX_COLOR.test(text) || text.startsWith("rgb") || text.startsWith("hsl");
}
function hslToRgb(hue, saturation, lightness) {
  const h2 = (hue % 360 + 360) % 360;
  const c2 = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c2 * (1 - Math.abs(h2 / 60 % 2 - 1));
  const m = lightness - c2 / 2;
  let rgb;
  if (h2 < 60) rgb = [c2, x, 0];
  else if (h2 < 120) rgb = [x, c2, 0];
  else if (h2 < 180) rgb = [0, c2, x];
  else if (h2 < 240) rgb = [0, x, c2];
  else if (h2 < 300) rgb = [x, 0, c2];
  else rgb = [c2, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255)
  ];
}
function parseColor(input) {
  const text = input.trim().toLowerCase();
  if (text === "transparent") return [0, 0, 0, 0];
  const hex = HEX_COLOR.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split("").map((ch) => ch + ch).join("");
    }
    const value = parseInt(digits.slice(0, 6), 16);
    const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return [value >> 16 & 255, value >> 8 & 255, value & 255, alpha];
  }
  const tokens = text.match(/-?(?:\d+\.?\d*|\.\d+)%?/g) ?? [];
  const at = (index, scale) => {
    const raw = tokens[index] ?? "0";
    const amount = parseFloat(raw);
    return raw.endsWith("%") ? amount / 100 * scale : amount;
  };
  if (text.startsWith("hsl")) {
    const ratio = (index) => {
      const raw = tokens[index] ?? "0";
      const amount = parseFloat(raw);
      return raw.endsWith("%") || amount > 1 ? amount / 100 : amount;
    };
    const rgb = hslToRgb(parseFloat(tokens[0] ?? "0"), ratio(1), ratio(2));
    return [rgb[0], rgb[1], rgb[2], tokens.length > 3 ? at(3, 1) : 1];
  }
  return [at(0, 255), at(1, 255), at(2, 255), tokens.length > 3 ? at(3, 1) : 1];
}
function formatRgba(color) {
  const alpha = Math.max(0, Math.min(1, color[3]));
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${round(alpha)})`;
}
function kebabCase(name) {
  if (name.startsWith("--")) return name;
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
function readCurrent(el, kind, prop, cssName) {
  if (kind === "transform") return getTransformState(el)[prop];
  if (kind === "filter") return getFilterState(el)[prop];
  if (typeof getComputedStyle !== "function") return el.style.getPropertyValue(cssName).trim();
  const computed2 = getComputedStyle(el).getPropertyValue(cssName);
  return computed2 ? computed2.trim() : "";
}
function buildTrack(el, name, spec) {
  const prop = TRANSFORM_ALIASES[name] ?? name;
  const kind = prop in TRANSFORM_DEFAULTS ? "transform" : prop in FILTER_DEFAULTS ? "filter" : "style";
  const cssName = kind === "style" ? kebabCase(prop) : prop;
  const fallbackUnit = kind === "transform" ? TRANSFORM_UNITS[prop] : kind === "filter" ? FILTER_UNITS[prop] : UNITLESS.has(cssName) ? "" : "px";
  const pair = Array.isArray(spec) ? [spec[0], spec[1]] : [readCurrent(el, kind, prop, cssName), spec];
  const track = {
    kind,
    prop,
    cssName,
    mode: "number",
    unit: fallbackUnit,
    from: 0,
    to: 0,
    fromColor: [0, 0, 0, 1],
    toColor: [0, 0, 0, 1],
    fromText: String(pair[0]),
    toText: String(pair[1])
  };
  if (isColorValue(pair[0]) || isColorValue(pair[1])) {
    if (kind !== "style") return null;
    track.mode = "color";
    track.fromColor = isColorValue(pair[0]) ? parseColor(String(pair[0])) : [0, 0, 0, 0];
    track.toColor = isColorValue(pair[1]) ? parseColor(String(pair[1])) : [0, 0, 0, 0];
    return track;
  }
  const from = readNumeric(pair[0], fallbackUnit);
  const to = readNumeric(pair[1], fallbackUnit);
  if (!from || !to) {
    if (kind !== "style") return null;
    track.mode = "discrete";
    return track;
  }
  track.from = from.value;
  track.to = to.value;
  track.unit = to.unit || from.unit || fallbackUnit;
  return track;
}
function readNumeric(value, fallbackUnit) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, unit: fallbackUnit } : null;
  }
  const match = NUMBER_UNIT.exec(value.trim());
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2] || fallbackUnit };
}
function applyTracks(el, tracks, progress) {
  let touchedTransform = false;
  let touchedFilter = false;
  for (const track of tracks) {
    if (track.kind === "transform") {
      getTransformState(el)[track.prop] = track.from + (track.to - track.from) * progress;
      touchedTransform = true;
      continue;
    }
    if (track.kind === "filter") {
      getFilterState(el)[track.prop] = track.from + (track.to - track.from) * progress;
      touchedFilter = true;
      continue;
    }
    if (track.mode === "color") {
      const mixed = [
        track.fromColor[0] + (track.toColor[0] - track.fromColor[0]) * progress,
        track.fromColor[1] + (track.toColor[1] - track.fromColor[1]) * progress,
        track.fromColor[2] + (track.toColor[2] - track.fromColor[2]) * progress,
        track.fromColor[3] + (track.toColor[3] - track.fromColor[3]) * progress
      ];
      el.style.setProperty(track.cssName, formatRgba(mixed));
      continue;
    }
    if (track.mode === "discrete") {
      el.style.setProperty(track.cssName, progress >= 1 ? track.toText : track.fromText);
      continue;
    }
    const value = track.from + (track.to - track.from) * progress;
    el.style.setProperty(track.cssName, `${round(value)}${track.unit}`);
  }
  if (touchedTransform) applyTransform(el);
  if (touchedFilter) applyFilter(el);
}
function buildTracks(el, keyframes) {
  const tracks = [];
  for (const [name, spec] of Object.entries(keyframes)) {
    if (spec === void 0 || spec === null) continue;
    const track = buildTrack(el, name, spec);
    if (track) tracks.push(track);
  }
  return tracks;
}
function applyInitial(target, keyframes) {
  for (const el of resolveTargets(target)) {
    applyTracks(el, buildTracks(el, keyframes), 0);
  }
}
function captureState(el, keyframes) {
  const out = {};
  for (const name of Object.keys(keyframes)) {
    const prop = TRANSFORM_ALIASES[name] ?? name;
    const kind = prop in TRANSFORM_DEFAULTS ? "transform" : prop in FILTER_DEFAULTS ? "filter" : "style";
    out[name] = readCurrent(el, kind, prop, kind === "style" ? kebabCase(prop) : prop);
  }
  return out;
}
function isMotionElement(value) {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return true;
  return typeof SVGElement !== "undefined" && value instanceof SVGElement;
}
function resolveTargets(target) {
  if (!target) return [];
  if (typeof target === "string") {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll(target)).filter(isMotionElement);
  }
  if (isMotionElement(target)) return [target];
  const list = target;
  if (typeof list.length !== "number") return [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (isMotionElement(item)) out.push(item);
  }
  return out;
}
function instantControl(onStop) {
  return {
    finished: Promise.resolve(),
    stop() {
    }
  };
}
function animateOne(el, keyframes, options) {
  const tracks = buildTracks(el, keyframes);
  if (prefersReducedMotion() && !options.force) {
    applyTracks(el, tracks, 1);
    options.onUpdate?.(1);
    options.onComplete?.();
    return instantControl();
  }
  const duration = Math.max(0, options.duration ?? 400);
  const delay = Math.max(0, options.delay ?? 0);
  const ease = resolveEasing(options.easing);
  const repeat = Math.max(0, Math.floor(options.repeat ?? 0));
  const repeatType = options.repeatType ?? "loop";
  const springConfig = options.spring === true ? {} : options.spring ? options.spring : null;
  let settle;
  const finished = new Promise((resolve2) => {
    settle = resolve2;
  });
  let running = true;
  let startedAt = -1;
  let previous = -1;
  let springPosition = 0;
  let springVelocity = springConfig?.velocity ?? 0;
  function frame(now) {
    if (!running) return;
    if (startedAt < 0) {
      startedAt = now;
      previous = now;
    }
    const elapsed = now - startedAt - delay;
    if (elapsed < 0) return;
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;
    if (elapsed > MAX_DURATION) {
      complete(1);
      return;
    }
    if (springConfig) {
      const stiffness = springConfig.stiffness ?? 170;
      const damping = springConfig.damping ?? 26;
      const mass = springConfig.mass ?? 1;
      const steps = Math.max(1, Math.round(delta));
      const step = delta / steps / 1e3;
      for (let i = 0; i < steps; i++) {
        const acceleration = (-stiffness * (springPosition - 1) - damping * springVelocity) / mass;
        springVelocity += acceleration * step;
        springPosition += springVelocity * step;
      }
      const restDelta = springConfig.restDelta ?? 1e-3;
      const restSpeed = springConfig.restSpeed ?? 0.01;
      if (Math.abs(1 - springPosition) < restDelta && Math.abs(springVelocity) < restSpeed) {
        complete(1);
        return;
      }
      applyTracks(el, tracks, springPosition);
      options.onUpdate?.(springPosition);
      return;
    }
    if (duration === 0) {
      complete(1);
      return;
    }
    const total = repeat + 1;
    let iteration = Math.floor(elapsed / duration);
    let local = (elapsed - iteration * duration) / duration;
    let last = false;
    if (iteration >= total) {
      iteration = total - 1;
      local = 1;
      last = true;
    }
    let progress;
    if (iteration % 2 === 1 && repeatType === "reverse") progress = ease(1 - local);
    else if (iteration % 2 === 1 && repeatType === "mirror") progress = 1 - ease(local);
    else progress = ease(local);
    if (last) {
      complete(progress);
      return;
    }
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
  }
  function complete(progress) {
    if (!running) return;
    running = false;
    removeFrame(frame);
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
    settle();
    options.onComplete?.();
  }
  applyTracks(el, tracks, springConfig ? springPosition : ease(0));
  addFrame(frame);
  return {
    finished,
    stop() {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    }
  };
}
function animate(target, keyframes, options = {}) {
  const elements = resolveTargets(target);
  if (elements.length === 0) return instantControl();
  if (elements.length === 1) return animateOne(elements[0], keyframes, options);
  const controls = elements.map((el) => animateOne(el, keyframes, options));
  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => void 0),
    stop() {
      for (const control of controls) control.stop();
    }
  };
}
function spring(from, to, options = {}) {
  if (prefersReducedMotion()) {
    options.onUpdate?.(to);
    options.onComplete?.();
    return instantControl();
  }
  const stiffness = options.stiffness ?? 170;
  const damping = options.damping ?? 26;
  const mass = options.mass ?? 1;
  const range = Math.abs(to - from) || 1;
  const restDelta = options.restDelta ?? range * 1e-3;
  const restSpeed = options.restSpeed ?? range * 0.01;
  let position = from;
  let velocity = options.velocity ?? 0;
  let running = true;
  let previous = -1;
  let elapsed = 0;
  let settle;
  const finished = new Promise((resolve2) => {
    settle = resolve2;
  });
  function frame(now) {
    if (!running) return;
    if (previous < 0) {
      previous = now;
      options.onUpdate?.(position);
      return;
    }
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;
    elapsed += delta;
    const steps = Math.max(1, Math.round(delta));
    const step = delta / steps / 1e3;
    for (let i = 0; i < steps; i++) {
      const acceleration = (-stiffness * (position - to) - damping * velocity) / mass;
      velocity += acceleration * step;
      position += velocity * step;
    }
    const rested = Math.abs(to - position) < restDelta && Math.abs(velocity) < restSpeed;
    if (rested || elapsed > MAX_DURATION) {
      running = false;
      removeFrame(frame);
      position = to;
      options.onUpdate?.(to);
      settle();
      options.onComplete?.();
      return;
    }
    options.onUpdate?.(position);
  }
  addFrame(frame);
  return {
    finished,
    stop() {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    }
  };
}
function staggerDelay(index, total, step, from) {
  if (from === "last") return (total - 1 - index) * step;
  if (from === "center") return Math.abs(index - (total - 1) / 2) * step;
  return index * step;
}
function stagger(targets, keyframes, options = {}) {
  const elements = resolveTargets(targets);
  if (elements.length === 0) return instantControl();
  const step = options.delay ?? 60;
  const start2 = options.start ?? 0;
  const from = options.from ?? "first";
  const controls = elements.map(
    (el, index) => animateOne(el, keyframes, {
      ...options,
      delay: start2 + staggerDelay(index, elements.length, step, from)
    })
  );
  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => void 0),
    stop() {
      for (const control of controls) control.stop();
    }
  };
}
function thresholdOf(amount) {
  if (amount === "all") return 0.99;
  if (amount === "any") return 0;
  if (typeof amount === "number") return Math.max(0, Math.min(1, amount));
  return 0.25;
}
function inView(el, callback, options = {}) {
  const once2 = options.once ?? true;
  let leaveHandler;
  if (typeof IntersectionObserver === "undefined") {
    leaveHandler = callback({
      target: el,
      isIntersecting: true,
      intersectionRatio: 1
    });
    return () => {
      if (typeof leaveHandler === "function") leaveHandler();
    };
  }
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          leaveHandler = callback(entry);
          if (once2) observer2.disconnect();
        } else if (typeof leaveHandler === "function") {
          leaveHandler();
          leaveHandler = void 0;
        }
      }
    },
    {
      root: options.root ?? null,
      rootMargin: options.margin ?? "0px",
      threshold: thresholdOf(options.amount)
    }
  );
  observer2.observe(el);
  return () => {
    observer2.disconnect();
    if (typeof leaveHandler === "function") leaveHandler();
  };
}
function scrollProgress(el, callback) {
  let stopped = false;
  let queued = false;
  if (typeof window === "undefined") {
    callback(0);
    return () => {
      stopped = true;
    };
  }
  const measure = () => {
    queued = false;
    if (stopped) return;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const span = viewport + rect.height || 1;
    const raw = (viewport - rect.top) / span;
    callback(Math.max(0, Math.min(1, raw)));
  };
  const schedule = () => {
    if (queued || stopped) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  measure();
  return () => {
    stopped = true;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}
var fadeIn2 = { opacity: [0, 1], duration: 420, easing: "easeOut" };
var fadeUp = {
  opacity: [0, 1],
  y: [24, 0],
  duration: 520,
  easing: "easeOutExpo"
};
var fadeDown = {
  opacity: [0, 1],
  y: [-24, 0],
  duration: 520,
  easing: "easeOutExpo"
};
var scaleIn = {
  opacity: [0, 1],
  scale: [0.92, 1],
  duration: 460,
  easing: "easeOutBack"
};
var slideLeft = {
  opacity: [0, 1],
  x: [36, 0],
  duration: 500,
  easing: "easeOutExpo"
};
var slideRight = {
  opacity: [0, 1],
  x: [-36, 0],
  duration: 500,
  easing: "easeOutExpo"
};
var pop = {
  opacity: [0, 1],
  scale: [0.6, 1],
  spring: { stiffness: 420, damping: 18 }
};
var blurIn = {
  opacity: [0, 1],
  blur: [10, 0],
  duration: 560,
  easing: "easeOut"
};
var flip = {
  opacity: [0, 1],
  rotateX: [-80, 0],
  duration: 620,
  easing: "easeOutBack"
};
var motionPresets = {
  fadeIn: fadeIn2,
  fadeUp,
  fadeDown,
  scaleIn,
  slideLeft,
  slideRight,
  pop,
  blurIn,
  flip
};
var OPTION_KEYS = /* @__PURE__ */ new Set([
  "duration",
  "delay",
  "easing",
  "spring",
  "repeat",
  "repeatType",
  "force",
  "from",
  "start",
  "onUpdate",
  "onComplete"
]);
function splitVariant(variant) {
  const keyframes = {};
  const options = {};
  for (const [key, value] of Object.entries(variant)) {
    if (value === void 0 || value === null) continue;
    if (OPTION_KEYS.has(key)) options[key] = value;
    else keyframes[key] = value;
  }
  return { keyframes, options };
}
function looksLikeExpression(text) {
  const value = text.trim();
  if (!value) return false;
  if (/^['"`]/.test(value)) return true;
  if (/^[[{(]/.test(value)) return true;
  return /^[$A-Za-z_][\w$]*(?:\.[$A-Za-z_][\w$]*|\[[^\]]*\])*$/.test(value);
}
function resolveVariant(expression, evaluate2) {
  const text = expression.trim();
  if (!text) return null;
  if (motionPresets[text]) return motionPresets[text];
  if (!looksLikeExpression(text)) return null;
  const value = evaluate2();
  if (typeof value === "string" && motionPresets[value]) return motionPresets[value];
  if (value && typeof value === "object") return value;
  return null;
}
function readAttr2(el, name) {
  return el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
}
function hasAttr(el, name) {
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
var staggerSetups = /* @__PURE__ */ new WeakMap();
function readStaggerFrom(el) {
  const raw = readAttr2(el, "motion-stagger-from");
  if (raw === "last" || raw === "center") return raw;
  return "first";
}
function isStaggerChild(el) {
  return hasAttr(el, "motion") || hasAttr(el, "motion-scroll");
}
function inheritedStaggerDelay(el) {
  const parent = el.parentElement;
  if (!parent) return 0;
  let setup = staggerSetups.get(parent);
  if (!setup) {
    const raw = readAttr2(parent, "motion-stagger");
    if (raw === null) return 0;
    setup = { step: parseDuration(raw, 60), from: readStaggerFrom(parent) };
  }
  const siblings = Array.from(parent.children).filter(isStaggerChild);
  const index = siblings.indexOf(el);
  if (index < 0) return 0;
  return staggerDelay(index, siblings.length, setup.step, setup.from);
}
defineDirective("motion", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion did not recognize the variant "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;
  const control = animate(el, keyframes, options);
  cleanup(() => control.stop());
});
defineDirective("motion-scroll", ({ el, expression, evaluate: evaluate2, modifiers, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-scroll did not recognize the variant "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;
  const once2 = !modifiers.repeat;
  const amountAttr = readAttr2(el, "motion-scroll-amount");
  const amount = amountAttr === null ? 0.25 : parseFloat(amountAttr) || 0;
  if (!prefersReducedMotion()) applyInitial(el, keyframes);
  let control = null;
  const stopWatching = inView(
    el,
    () => {
      control?.stop();
      control = animate(el, keyframes, options);
      if (once2) return void 0;
      return () => {
        control?.stop();
        if (!prefersReducedMotion()) applyInitial(el, keyframes);
      };
    },
    { once: once2, amount, margin: readAttr2(el, "motion-scroll-margin") ?? "0px" }
  );
  cleanup(() => {
    stopWatching();
    control?.stop();
  });
});
defineDirective(
  "motion-stagger",
  ({ el, expression, evaluate: evaluate2 }) => {
    const value = evaluate2();
    const step = typeof value === "number" && Number.isFinite(value) ? value : parseDuration(expression, 60);
    staggerSetups.set(el, { step, from: readStaggerFrom(el) });
  },
  { priority: PRIORITY.BIND }
);
function bindInteraction(el, variant, enterEvents, leaveEvents, defaults, cleanup) {
  const { keyframes, options } = splitVariant(variant);
  const merged = { ...defaults, ...options };
  let base = null;
  let control = null;
  const goTo = (frames) => {
    control?.stop();
    control = animate(el, frames, merged);
  };
  const onEnter = () => {
    if (!base) base = captureState(el, keyframes);
    goTo(keyframes);
  };
  const onLeave = () => {
    if (!base) return;
    goTo(base);
  };
  for (const name of enterEvents) el.addEventListener(name, onEnter);
  for (const name of leaveEvents) el.addEventListener(name, onLeave);
  cleanup(() => {
    for (const name of enterEvents) el.removeEventListener(name, onEnter);
    for (const name of leaveEvents) el.removeEventListener(name, onLeave);
    control?.stop();
  });
}
defineDirective("motion-hover", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-hover did not recognize the variant "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ["mouseenter", "focusin"],
    ["mouseleave", "focusout"],
    { duration: 220, easing: "easeOut" },
    cleanup
  );
});
defineDirective("motion-tap", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-tap did not recognize the variant "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ["pointerdown"],
    ["pointerup", "pointercancel", "pointerleave", "blur"],
    { duration: 140, easing: "easeOut" },
    cleanup
  );
});
defineDirective("parallax", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  if (prefersReducedMotion() || typeof window === "undefined") return;
  const value = evaluate2();
  const factor = typeof value === "number" && Number.isFinite(value) ? value : parseFloat(expression) || 0.3;
  el.style.willChange = "transform";
  let queued = false;
  const measure = () => {
    queued = false;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const center = rect.top + rect.height / 2;
    getTransformState(el).parallax = (viewport / 2 - center) * factor;
    applyTransform(el);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  measure();
  cleanup(() => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    getTransformState(el).parallax = 0;
    applyTransform(el);
    el.style.removeProperty("will-change");
  });
});
var flipEntries = /* @__PURE__ */ new Map();
var flipObserver = null;
var flipQueued = false;
function scheduleFlipPass() {
  if (flipQueued || typeof requestAnimationFrame !== "function") return;
  flipQueued = true;
  requestAnimationFrame(runFlipPass);
}
function runFlipPass() {
  flipQueued = false;
  for (const entry of flipEntries.values()) {
    if (!entry.el.isConnected || entry.animating) continue;
    const next = entry.el.getBoundingClientRect();
    const previous = entry.rect;
    entry.rect = next;
    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    const sx = next.width > 0 ? previous.width / next.width : 1;
    const sy = next.height > 0 ? previous.height / next.height : 1;
    const moved = Math.abs(dx) >= 1 || Math.abs(dy) >= 1;
    const resized = Math.abs(sx - 1) >= 0.01 || Math.abs(sy - 1) >= 0.01;
    if (!moved && !resized) continue;
    entry.animating = true;
    entry.control?.stop();
    entry.control = animate(
      entry.el,
      { x: [dx, 0], y: [dy, 0], scaleX: [sx, 1], scaleY: [sy, 1] },
      entry.options
    );
    entry.control.finished.then(() => {
      entry.animating = false;
      if (entry.el.isConnected) entry.rect = entry.el.getBoundingClientRect();
    });
  }
}
function ensureFlipWatcher() {
  if (flipObserver || typeof MutationObserver === "undefined") return;
  const root = config.root ?? document.body;
  if (!root) return;
  flipObserver = new MutationObserver(scheduleFlipPass);
  flipObserver.observe(root, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleFlipPass);
}
defineDirective("flip", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  if (typeof document === "undefined") return;
  const variant = resolveVariant(expression, evaluate2);
  const options = variant ? splitVariant(variant).options : {};
  if (options.duration === void 0 && options.spring === void 0) {
    options.spring = { stiffness: 340, damping: 34 };
  }
  ensureFlipWatcher();
  flipEntries.set(el, {
    el,
    rect: el.getBoundingClientRect(),
    options,
    control: null,
    animating: false
  });
  cleanup(() => {
    flipEntries.get(el)?.control?.stop();
    flipEntries.delete(el);
  });
});
function countFormatter(format, decimals) {
  const numberOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  if (format === "currency") {
    numberOptions.style = "currency";
    numberOptions.currency = config.currency;
  }
  const formatter = new Intl.NumberFormat(config.locale, numberOptions);
  if (format === "percent") return (value) => `${formatter.format(value)}%`;
  return (value) => formatter.format(value);
}
defineDirective("count", ({ el, evaluate: evaluate2, effect: effect2, cleanup }) => {
  const duration = parseDuration(readAttr2(el, "count-duration") ?? void 0, 1400);
  const decimals = Math.max(0, Math.min(6, parseInt(readAttr2(el, "count-decimals") ?? "0", 10) || 0));
  const format = readAttr2(el, "count-format") ?? "number";
  const prefix = readAttr2(el, "count-prefix") ?? "";
  const suffix = readAttr2(el, "count-suffix") ?? "";
  const formatter = countFormatter(format, decimals);
  let current = 0;
  let control = null;
  effect2(() => {
    const raw = Number(evaluate2());
    const target = Number.isFinite(raw) ? raw : 0;
    const start2 = current;
    control?.stop();
    control = animate(
      el,
      {},
      {
        duration,
        easing: "easeOutExpo",
        onUpdate(progress) {
          current = start2 + (target - start2) * progress;
          el.textContent = `${prefix}${formatter(current)}${suffix}`;
        }
      }
    );
  });
  cleanup(() => control?.stop());
});
defineDirective("typewriter", ({ el, expression, evaluate: evaluate2, effect: effect2, cleanup }) => {
  const speed = parseDuration(readAttr2(el, "typewriter-speed") ?? void 0, 45);
  const dynamic = looksLikeExpression(expression);
  let control = null;
  effect2(() => {
    const text = dynamic ? String(evaluate2() ?? "") : expression;
    control?.stop();
    el.textContent = "";
    if (!text) return;
    let shown = -1;
    control = animate(
      el,
      {},
      {
        duration: Math.max(1, text.length * speed),
        easing: "linear",
        onUpdate(progress) {
          const count = Math.round(progress * text.length);
          if (count === shown) return;
          shown = count;
          el.textContent = text.slice(0, count);
        }
      }
    );
  });
  cleanup(() => control?.stop());
});

// src/charts/index.ts
function prefersReducedMotion2() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return device.reducedMotion;
}
var CHART_COLORS = [
  "#6D3BF5",
  "#FF3D8B",
  "#2ED9A5",
  "#FFB35C",
  "#9B7BFF",
  "#FF4D4D",
  "#14111F",
  "#3BB6F5"
];
var CSS = `
.v-chart{position:relative;display:block;width:100%;color:var(--v-text,#14111F);
  font:500 12px/1.35 var(--v-font-sans,system-ui,-apple-system,'Segoe UI',sans-serif)}
.v-chart-svg{display:block;width:100%;overflow:visible;touch-action:pan-y}
.v-chart-grid{stroke:var(--v-border,#E6E0F0);stroke-width:1;shape-rendering:crispEdges}
.v-chart-axis{fill:var(--v-text-muted,#6B6580);font-size:11px}
.v-chart-empty{fill:var(--v-text-muted,#6B6580);font-size:13px}
.v-chart-line{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.v-chart-area{stroke:none}
.v-chart-point{stroke:var(--v-surface,#fff);stroke-width:2}
.v-chart-value{fill:var(--v-text,#14111F);font-size:11px;font-weight:600}
.v-chart-center{fill:var(--v-text,#14111F);font-size:20px;font-weight:700}
.v-chart-center-sub{fill:var(--v-text-muted,#6B6580);font-size:11px;font-weight:500}
.v-chart-track{fill:none;stroke:var(--v-border,#E6E0F0)}
.v-chart-radar-web{fill:none;stroke:var(--v-border,#E6E0F0);stroke-width:1}
.v-chart-radar-area{stroke-width:2}

.v-chart-legend{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;margin-top:10px}
.v-chart-key{display:inline-flex;align-items:center;gap:6px;padding:3px 6px;border:0;cursor:pointer;
  background:none;color:inherit;font:inherit;border-radius:var(--v-radius-sm,8px)}
.v-chart-key:hover{background:var(--v-surface-2,#FBF7F2)}
.v-chart-key:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-chart-key[aria-pressed="false"]{opacity:.42;text-decoration:line-through}
.v-chart-dot{width:10px;height:10px;border-radius:3px;flex:0 0 auto}

.v-chart-tip{position:absolute;left:0;top:0;pointer-events:none;z-index:var(--v-z-tooltip,1200);
  transform:translate(-50%,calc(-100% - 12px));background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-sm,8px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));padding:8px 10px;min-width:96px;
  font-size:12px;line-height:1.4;white-space:nowrap}
.v-chart-tip-title{font-weight:700;margin-bottom:4px}
.v-chart-tip-row{display:flex;align-items:center;gap:6px}
.v-chart-tip-row b{margin-left:auto;font-variant-numeric:tabular-nums}

.v-chart-animate .v-chart-line{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-line{stroke-dashoffset:1}
.v-chart-animate .v-chart-area,.v-chart-animate .v-chart-point,.v-chart-animate .v-chart-value{transition:opacity .5s ease}
.v-chart-animate:not(.v-chart-in) .v-chart-area,
.v-chart-animate:not(.v-chart-in) .v-chart-point,
.v-chart-animate:not(.v-chart-in) .v-chart-value{opacity:0}
.v-chart-animate .v-chart-bar{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-bar{transform:scaleY(0)}
.v-chart-animate .v-chart-barh{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-barh{transform:scaleX(0)}
.v-chart-animate .v-chart-slice{transition:opacity .4s ease,transform .5s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-slice{opacity:0;transform:scale(.86)}
.v-chart-ring{stroke-dashoffset:var(--v-ring-offset,0)}
.v-chart-animate .v-chart-ring{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-ring{stroke-dashoffset:var(--v-ring-full,0)}

@media (prefers-reduced-motion: reduce){
  .v-chart *{transition:none !important}
}
`;
function r(value) {
  return Math.round(value * 100) / 100;
}
function toNumber(value) {
  const n2 = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n2) ? n2 : 0;
}
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
var formatterCache = /* @__PURE__ */ new Map();
function numberFormatter(key, options) {
  const cacheKey = `${config.locale}|${config.currency}|${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(config.locale, options);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}
function formatChartValue(value, format = "number") {
  if (!Number.isFinite(value)) return "";
  if (format === "currency") {
    return numberFormatter("currency", {
      style: "currency",
      currency: config.currency,
      maximumFractionDigits: 2
    }).format(value);
  }
  const plain = numberFormatter("number", { maximumFractionDigits: 2 }).format(value);
  return format === "percent" ? `${plain}%` : plain;
}
function isSeriesInput(value) {
  return !!value && typeof value === "object" && Array.isArray(value.data);
}
function labelAt(labels, index) {
  const label = labels[index];
  return label === void 0 || label === "" ? `#${index + 1}` : label;
}
function normalize(options, type) {
  const palette2 = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const fromOptions = Array.isArray(options.labels);
  const labels = fromOptions ? options.labels.map((label) => String(label)) : [];
  const series = [];
  const raw = options.data;
  const singleName = options.name ?? "Value";
  if (typeof raw === "number") {
    series.push({ name: singleName, values: [raw], xs: null, color: palette2[0] });
  } else if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "number") {
      series.push({
        name: singleName,
        values: raw.map(toNumber),
        xs: null,
        color: palette2[0]
      });
    } else if (isSeriesInput(first)) {
      raw.forEach((entry, index) => {
        series.push({
          name: entry.name || `Serie ${index + 1}`,
          values: (entry.data || []).map(toNumber),
          xs: null,
          color: entry.color || palette2[index % palette2.length]
        });
      });
    } else {
      const points = raw;
      const values = [];
      const xs = [];
      let hasX = false;
      points.forEach((point, index) => {
        values.push(toNumber(point.value !== void 0 ? point.value : point.y));
        if (typeof point.x === "number") {
          hasX = true;
          xs.push(point.x);
        } else {
          xs.push(index);
        }
        if (!fromOptions && point.label !== void 0) labels[index] = String(point.label);
      });
      series.push({ name: singleName, values, xs: hasX ? xs : null, color: palette2[0] });
    }
  }
  const categorical = type === "pie" || type === "donut";
  if (categorical) {
    for (let i = 0; i < (series[0]?.values.length ?? 0); i++) {
      if (labels[i] === void 0) labels[i] = labelAt(labels, i);
    }
  }
  return { series, labels, categorical };
}
function buildLegend(dataset, palette2) {
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return [];
    return first.values.map((_, index) => ({
      key: labelAt(dataset.labels, index),
      name: labelAt(dataset.labels, index),
      color: palette2[index % palette2.length]
    }));
  }
  return dataset.series.map((entry) => ({ key: entry.name, name: entry.name, color: entry.color }));
}
function applyHidden(dataset, hidden, palette2) {
  if (hidden.size === 0) return dataset;
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return dataset;
    const values = [];
    const labels = [];
    const colors = [];
    first.values.forEach((value, index) => {
      const key = labelAt(dataset.labels, index);
      if (hidden.has(key)) return;
      values.push(value);
      labels.push(key);
      colors.push(palette2[index % palette2.length]);
    });
    return {
      series: [{ ...first, values, xs: null, color: colors[0] ?? first.color }],
      labels,
      categorical: true
    };
  }
  return {
    series: dataset.series.filter((entry) => !hidden.has(entry.name)),
    labels: dataset.labels,
    categorical: false
  };
}
function niceNumber(range, round2) {
  const safe = Math.abs(range) || 1;
  const exponent = Math.floor(Math.log10(safe));
  const fraction = safe / Math.pow(10, exponent);
  let nice;
  if (round2) {
    if (fraction < 1.5) nice = 1;
    else if (fraction < 3) nice = 2;
    else if (fraction < 7) nice = 5;
    else nice = 10;
  } else {
    if (fraction <= 1) nice = 1;
    else if (fraction <= 2) nice = 2;
    else if (fraction <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exponent);
}
function niceScale(min, max, count = 5) {
  if (min === max) {
    const spread = Math.abs(min) || 1;
    return niceScale(min - spread * 0.5, max + spread * 0.5, count);
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(1, count - 1), true);
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(step)) + 2));
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = niceMin; value <= niceMax + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return { min: niceMin, max: niceMax, ticks };
}
function extentOf(dataset, options, stacked, baselineZero) {
  let min = Infinity;
  let max = -Infinity;
  if (stacked) {
    let length = 0;
    for (const entry of dataset.series) length = Math.max(length, entry.values.length);
    for (let i = 0; i < length; i++) {
      let positive = 0;
      let negative = 0;
      for (const entry of dataset.series) {
        const value = toNumber(entry.values[i]);
        if (value >= 0) positive += value;
        else negative += value;
      }
      min = Math.min(min, negative);
      max = Math.max(max, positive);
    }
  } else {
    for (const entry of dataset.series) {
      for (const value of entry.values) {
        if (!Number.isFinite(value)) continue;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (baselineZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (options.min !== void 0) min = options.min;
  if (options.max !== void 0) max = options.max;
  if (min === max) max = min + (Math.abs(min) || 1);
  return { min, max };
}
function straightPath(points) {
  if (points.length === 0) return "";
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${r(points[i][0])} ${r(points[i][1])}`);
  }
  return parts.join(" ");
}
function smoothPath(points) {
  if (points.length < 3) return straightPath(points);
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    parts.push(`C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(p2[0])} ${r(p2[1])}`);
  }
  return parts.join(" ");
}
function linePath(points, smooth) {
  return smooth ? smoothPath(points) : straightPath(points);
}
function polar(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}
function arcPath(cx, cy, radius, inner, start2, end) {
  const large = end - start2 > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, radius, start2);
  const [x2, y2] = polar(cx, cy, radius, end);
  if (inner <= 0) {
    return `M ${r(cx)} ${r(cy)} L ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} Z`;
  }
  const [ix1, iy1] = polar(cx, cy, inner, start2);
  const [ix2, iy2] = polar(cx, cy, inner, end);
  return `M ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} L ${r(ix2)} ${r(iy2)} A ${r(inner)} ${r(inner)} 0 ${large} 0 ${r(ix1)} ${r(iy1)} Z`;
}
var AXIS_FONT = 7;
function longestLabelWidth(texts) {
  let longest = 0;
  for (const text of texts) longest = Math.max(longest, text.length);
  return longest * AXIS_FONT + 12;
}
function buildFrame(ctx, settings2) {
  const { options, dataset, width, height } = ctx;
  const extent = extentOf(dataset, options, settings2.stacked, settings2.baselineZero);
  const scale = options.min !== void 0 && options.max !== void 0 ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) } : niceScale(extent.min, extent.max, 5);
  const tickTexts = scale.ticks.map((tick) => formatChartValue(tick, ctx.format));
  const showGrid = options.showGrid !== false && !settings2.bare;
  const hasLabels = dataset.labels.length > 0 && !settings2.bare;
  const top = settings2.bare ? 3 : 16;
  const right = settings2.bare ? 3 : 16;
  const left = settings2.bare ? 3 : showGrid ? clamp(longestLabelWidth(tickTexts), 32, 140) : 8;
  const bottom = settings2.bare ? 3 : hasLabels ? 26 : 10;
  const innerW = Math.max(1, width - left - right);
  const innerH = Math.max(1, height - top - bottom);
  const span = scale.max - scale.min || 1;
  const y = (value) => top + innerH * (1 - (value - scale.min) / span);
  let grid = "";
  if (showGrid) {
    const lines = [];
    scale.ticks.forEach((tick, index) => {
      const py = r(y(tick));
      lines.push(`<line class="v-chart-grid" x1="${r(left)}" y1="${py}" x2="${r(left + innerW)}" y2="${py}"/>`);
      lines.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${py + 4}" text-anchor="end">${escapeHtml(tickTexts[index])}</text>`
      );
    });
    grid = `<g>${lines.join("")}</g>`;
  }
  return { left, top, innerW, innerH, min: scale.min, max: scale.max, ticks: scale.ticks, y, grid };
}
function evenTicks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(Number((min + step * i).toFixed(6)));
  return ticks;
}
function categoryAxis(labels, count, xAt, baseline, innerW) {
  if (labels.length === 0 || count === 0) return "";
  const maxLabels = Math.max(1, Math.floor(innerW / 56));
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const parts = [];
  for (let i = 0; i < count; i += step) {
    const text = labels[i];
    if (text === void 0 || text === "") continue;
    parts.push(
      `<text class="v-chart-axis" x="${r(xAt(i))}" y="${r(baseline)}" text-anchor="middle">${escapeHtml(text)}</text>`
    );
  }
  return parts.join("");
}
function seriesLength(dataset) {
  let length = dataset.labels.length;
  for (const entry of dataset.series) length = Math.max(length, entry.values.length);
  return length;
}
function emptyChart(ctx) {
  return `<text class="v-chart-empty" x="${r(ctx.width / 2)}" y="${r(ctx.height / 2)}" text-anchor="middle">No data</text>`;
}
function titleTag(label, value, format) {
  return `<title>${escapeHtml(label)}: ${escapeHtml(formatChartValue(value, format))}</title>`;
}
function seriesSummary(entry, format) {
  if (entry.values.length === 0) return entry.name;
  let min = Infinity;
  let max = -Infinity;
  for (const value of entry.values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const first = entry.values[0];
  const last = entry.values[entry.values.length - 1];
  return `${entry.name}: from ${formatChartValue(first, format)} to ${formatChartValue(last, format)}, minimum ${formatChartValue(min, format)}, maximum ${formatChartValue(max, format)}`;
}
function renderLine(ctx) {
  const bare = ctx.type === "sparkline";
  const filled = ctx.type === "area";
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked: false, baselineZero: filled, bare });
  const xAt = (index) => count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1);
  const smooth = ctx.options.smooth === true;
  const parts = [frame.grid];
  const baseY = frame.y(clamp(0, frame.min, frame.max));
  for (const entry of ctx.dataset.series) {
    const points = [];
    for (let i = 0; i < count; i++) points.push([xAt(i), frame.y(toNumber(entry.values[i]))]);
    if (points.length === 0) continue;
    const path = linePath(points, smooth);
    if (filled) {
      const area = `${path} L ${r(points[points.length - 1][0])} ${r(baseY)} L ${r(points[0][0])} ${r(baseY)} Z`;
      parts.push(`<path class="v-chart-area" d="${area}" fill="${escapeHtml(entry.color)}" fill-opacity="0.16"/>`);
    }
    const dash = ctx.animated ? ' pathLength="1" stroke-dasharray="1"' : "";
    parts.push(
      `<path class="v-chart-line" d="${path}" stroke="${escapeHtml(entry.color)}"${dash}><title>${escapeHtml(seriesSummary(entry, ctx.format))}</title></path>`
    );
    if (!bare && count <= 40) {
      points.forEach((point, index) => {
        parts.push(
          `<circle class="v-chart-point" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(entry.values[index]), ctx.format) + "</circle>"
        );
      });
    }
    if (ctx.options.showValues && !bare) {
      points.forEach((point, index) => {
        parts.push(
          `<text class="v-chart-value" x="${r(point[0])}" y="${r(point[1] - 10)}" text-anchor="middle">${escapeHtml(formatChartValue(toNumber(entry.values[index]), ctx.format))}</text>`
        );
      });
    }
  }
  if (!bare) {
    parts.push(
      categoryAxis(ctx.dataset.labels, count, xAt, frame.top + frame.innerH + 18, frame.innerW)
    );
  }
  collectBandHits(ctx, count, xAt, (index) => {
    let top = Infinity;
    for (const entry of ctx.dataset.series) top = Math.min(top, frame.y(toNumber(entry.values[index])));
    return Number.isFinite(top) ? top : frame.top;
  });
  return parts.join("");
}
function collectBandHits(ctx, count, xAt, yAt) {
  for (let i = 0; i < count; i++) {
    ctx.hits.push({
      x: xAt(i),
      y: yAt(i),
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i])
      }))
    });
  }
}
function renderBars(ctx) {
  const stacked = ctx.type === "stacked";
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked, baselineZero: true, bare: false });
  const band = frame.innerW / count;
  const groups = stacked ? 1 : Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 18);
  const barW = Math.max(2, (band - gap) / groups);
  const baseY = frame.y(clamp(0, frame.min, frame.max));
  const radius = Math.min(4, barW / 2);
  const parts = [frame.grid];
  const bandCenter = (index) => frame.left + band * index + band / 2;
  for (let i = 0; i < count; i++) {
    let positive = 0;
    let negative = 0;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber(entry.values[i]);
      let top;
      let bottom;
      let x;
      if (stacked) {
        const start2 = value >= 0 ? positive : negative;
        const end = start2 + value;
        if (value >= 0) positive = end;
        else negative = end;
        top = Math.min(frame.y(start2), frame.y(end));
        bottom = Math.max(frame.y(start2), frame.y(end));
        x = frame.left + band * i + gap / 2;
      } else {
        top = Math.min(frame.y(value), baseY);
        bottom = Math.max(frame.y(value), baseY);
        x = frame.left + band * i + gap / 2 + seriesIndex * barW;
      }
      const width = stacked ? Math.max(2, band - gap) : barW * 0.86;
      const height = Math.max(value === 0 ? 0 : 1, bottom - top);
      parts.push(
        `<rect class="v-chart-bar" x="${r(x)}" y="${r(top)}" width="${r(width)}" height="${r(height)}" rx="${r(radius)}" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(x + width / 2)}px ${r(baseY)}px;transition-delay:${i * 30}ms">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) + "</rect>"
      );
      if (ctx.options.showValues && !stacked) {
        parts.push(
          `<text class="v-chart-value" x="${r(x + width / 2)}" y="${r(top - 6)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });
  }
  parts.push(
    categoryAxis(ctx.dataset.labels, count, bandCenter, frame.top + frame.innerH + 18, frame.innerW)
  );
  collectBandHits(ctx, count, bandCenter, (index) => {
    if (stacked) {
      let total = 0;
      for (const entry of ctx.dataset.series) total += Math.max(0, toNumber(entry.values[index]));
      return frame.y(total);
    }
    let top = baseY;
    for (const entry of ctx.dataset.series) top = Math.min(top, frame.y(toNumber(entry.values[index])));
    return top;
  });
  return parts.join("");
}
function renderColumns(ctx) {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const scale = ctx.options.min !== void 0 && ctx.options.max !== void 0 ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) } : niceScale(extent.min, extent.max, 5);
  const labelWidth = clamp(
    longestLabelWidth(ctx.dataset.labels.length > 0 ? ctx.dataset.labels : [""]),
    24,
    ctx.width * 0.4
  );
  const left = ctx.dataset.labels.length > 0 ? labelWidth : 12;
  const top = 12;
  const bottom = ctx.options.showGrid === false ? 12 : 26;
  const innerW = Math.max(1, ctx.width - left - 20);
  const innerH = Math.max(1, ctx.height - top - bottom);
  const span = scale.max - scale.min || 1;
  const x = (value) => left + innerW * (value - scale.min) / span;
  const baseX = x(clamp(0, scale.min, scale.max));
  const band = innerH / count;
  const groups = Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 16);
  const barH = Math.max(2, (band - gap) / groups);
  const parts = [];
  if (ctx.options.showGrid !== false) {
    for (const tick of scale.ticks) {
      const px = r(x(tick));
      parts.push(`<line class="v-chart-grid" x1="${px}" y1="${r(top)}" x2="${px}" y2="${r(top + innerH)}"/>`);
      parts.push(
        `<text class="v-chart-axis" x="${px}" y="${r(top + innerH + 16)}" text-anchor="middle">${escapeHtml(formatChartValue(tick, ctx.format))}</text>`
      );
    }
  }
  for (let i = 0; i < count; i++) {
    const label = ctx.dataset.labels[i];
    if (label) {
      parts.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${r(top + band * i + band / 2 + 4)}" text-anchor="end">${escapeHtml(label)}</text>`
      );
    }
    let tipX = baseX;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber(entry.values[i]);
      const start2 = Math.min(x(value), baseX);
      tipX = Math.max(tipX, x(value));
      const width = Math.max(value === 0 ? 0 : 1, Math.abs(x(value) - baseX));
      const y = top + band * i + gap / 2 + seriesIndex * barH;
      parts.push(
        `<rect class="v-chart-barh" x="${r(start2)}" y="${r(y)}" width="${r(width)}" height="${r(barH * 0.86)}" rx="${r(Math.min(4, barH / 2))}" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(baseX)}px ${r(y + barH / 2)}px;transition-delay:${i * 30}ms">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) + "</rect>"
      );
      if (ctx.options.showValues) {
        parts.push(
          `<text class="v-chart-value" x="${r(start2 + width + 6)}" y="${r(y + barH * 0.6)}">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });
    ctx.hits.push({
      x: tipX,
      y: top + band * i + band / 2,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i])
      }))
    });
  }
  return parts.join("");
}
function renderPie(ctx) {
  const first = ctx.dataset.series[0];
  if (!first || first.values.length === 0) return emptyChart(ctx);
  const donut = ctx.type === "donut";
  const values = first.values.map((value) => Math.max(0, toNumber(value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return emptyChart(ctx);
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(12, Math.min(ctx.width, ctx.height) / 2 - 14);
  const inner = donut ? radius * 0.62 : 0;
  const origin = `transform-origin:${r(cx)}px ${r(cy)}px`;
  const parts = [];
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    const sweep = value / total * Math.PI * 2;
    const color = ctx.palette[index % ctx.palette.length];
    const label = labelAt(ctx.dataset.labels, index);
    const full = sweep >= Math.PI * 2 - 1e-6;
    const shape = full ? donut ? `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r((radius + inner) / 2)}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${r(radius - inner)}" style="${origin}">` : `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${escapeHtml(color)}" style="${origin}">` : `<path class="v-chart-slice" data-hit="${index}" d="${arcPath(cx, cy, radius, inner, angle, angle + sweep)}" fill="${escapeHtml(color)}" style="${origin};transition-delay:${index * 45}ms">`;
    parts.push(`${shape}${titleTag(label, value, ctx.format)}${full ? "</circle>" : "</path>"}`);
    const mid = angle + sweep / 2;
    const [hx, hy] = polar(cx, cy, (radius + inner) / 2, mid);
    ctx.hits.push({
      x: hx,
      y: hy,
      title: label,
      rows: [{ name: label, color, value }]
    });
    if (ctx.options.showValues && sweep > 0.3) {
      const [tx, ty] = polar(cx, cy, donut ? (radius + inner) / 2 : radius * 0.68, mid);
      const share = Math.round(value / total * 100);
      parts.push(
        `<text class="v-chart-value" x="${r(tx)}" y="${r(ty + 4)}" text-anchor="middle">${share}%</text>`
      );
    }
    angle += sweep;
  });
  if (donut) {
    parts.push(
      `<text class="v-chart-center" x="${r(cx)}" y="${r(cy + 2)}" text-anchor="middle">${escapeHtml(formatChartValue(total, ctx.format))}</text>`,
      `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 20)}" text-anchor="middle">Total</text>`
    );
  }
  return parts.join("");
}
function renderRadar(ctx) {
  const axes = seriesLength(ctx.dataset);
  if (axes < 3) return emptyChart(ctx);
  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const max = extent.max || 1;
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(20, Math.min(ctx.width, ctx.height) / 2 - 28);
  const angleAt = (index) => -Math.PI / 2 + Math.PI * 2 * index / axes;
  const parts = [];
  for (let ring = 1; ring <= 4; ring++) {
    const points = [];
    for (let i = 0; i < axes; i++) points.push(polar(cx, cy, radius * ring / 4, angleAt(i)));
    parts.push(
      `<polygon class="v-chart-radar-web" points="${points.map((p) => `${r(p[0])},${r(p[1])}`).join(" ")}"/>`
    );
  }
  for (let i = 0; i < axes; i++) {
    const [ax, ay] = polar(cx, cy, radius, angleAt(i));
    parts.push(`<line class="v-chart-grid" x1="${r(cx)}" y1="${r(cy)}" x2="${r(ax)}" y2="${r(ay)}"/>`);
    const label = ctx.dataset.labels[i];
    if (label) {
      const [lx, ly] = polar(cx, cy, radius + 14, angleAt(i));
      const anchor = Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
      parts.push(
        `<text class="v-chart-axis" x="${r(lx)}" y="${r(ly + 4)}" text-anchor="${anchor}">${escapeHtml(label)}</text>`
      );
    }
  }
  for (const entry of ctx.dataset.series) {
    const points = [];
    for (let i = 0; i < axes; i++) {
      const value = clamp(toNumber(entry.values[i]) / max, 0, 1);
      points.push(polar(cx, cy, radius * value, angleAt(i)));
    }
    parts.push(
      `<polygon class="v-chart-radar-area v-chart-slice" points="${points.map((p) => `${r(p[0])},${r(p[1])}`).join(" ")}" fill="${escapeHtml(entry.color)}" fill-opacity="0.22" stroke="${escapeHtml(entry.color)}" style="transform-origin:${r(cx)}px ${r(cy)}px"/>`
    );
    points.forEach((point, index) => {
      parts.push(
        `<circle class="v-chart-point" data-hit="${index}" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(entry.values[index]), ctx.format) + "</circle>"
      );
    });
  }
  for (let i = 0; i < axes; i++) {
    const [hx, hy] = polar(cx, cy, radius * 0.7, angleAt(i));
    ctx.hits.push({
      x: hx,
      y: hy,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i])
      }))
    });
  }
  return parts.join("");
}
function renderScatter(ctx) {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked: false, baselineZero: false, bare: false });
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const entry of ctx.dataset.series) {
    const xs = entry.xs;
    if (!xs) continue;
    for (const value of xs) {
      xMin = Math.min(xMin, value);
      xMax = Math.max(xMax, value);
    }
  }
  const useOwnX = Number.isFinite(xMin) && Number.isFinite(xMax) && xMax > xMin;
  const xAt = (entry, index) => {
    if (useOwnX && entry.xs) {
      return frame.left + frame.innerW * (entry.xs[index] - xMin) / (xMax - xMin);
    }
    return count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1);
  };
  const parts = [frame.grid];
  let hitIndex = 0;
  for (const entry of ctx.dataset.series) {
    entry.values.forEach((value, index) => {
      const px = xAt(entry, index);
      const py = frame.y(toNumber(value));
      parts.push(
        `<circle class="v-chart-point v-chart-slice" data-hit="${hitIndex}" cx="${r(px)}" cy="${r(py)}" r="4.5" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(px)}px ${r(py)}px">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(value), ctx.format) + "</circle>"
      );
      ctx.hits.push({
        x: px,
        y: py,
        title: labelAt(ctx.dataset.labels, index),
        rows: [{ name: entry.name, color: entry.color, value: toNumber(value) }]
      });
      hitIndex++;
    });
  }
  if (!useOwnX) {
    parts.push(
      categoryAxis(
        ctx.dataset.labels,
        count,
        (index) => count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1),
        frame.top + frame.innerH + 18,
        frame.innerW
      )
    );
  }
  return parts.join("");
}
function renderProgress(ctx) {
  const first = ctx.dataset.series[0];
  const value = first ? toNumber(first.values[0]) : 0;
  const max = ctx.options.max ?? 100;
  const min = ctx.options.min ?? 0;
  const ratio = clamp((value - min) / (max - min || 1), 0, 1);
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(16, Math.min(ctx.width, ctx.height) / 2 - 16);
  const stroke = Math.max(8, radius * 0.2);
  const ringRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - ratio);
  const color = ctx.palette[0];
  ctx.hits.push({
    x: cx,
    y: cy - ringRadius,
    title: first?.name ?? "Progresso",
    rows: [{ name: first?.name ?? "Progresso", color, value }]
  });
  return `<circle class="v-chart-track" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" stroke-width="${r(stroke)}"/><circle class="v-chart-ring" data-hit="0" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${r(stroke)}" stroke-linecap="round" stroke-dasharray="${r(circumference)}" style="--v-ring-full:${r(circumference)};--v-ring-offset:${r(offset)};transform:rotate(-90deg);transform-origin:${r(cx)}px ${r(cy)}px">` + titleTag(first?.name ?? "Progresso", value, ctx.format) + `</circle><text class="v-chart-center" x="${r(cx)}" y="${r(cy + 4)}" text-anchor="middle">${Math.round(ratio * 100)}%</text>` + (first ? `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 22)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>` : "");
}
var SHAPE_HIT = /* @__PURE__ */ new Set(["pie", "donut", "scatter", "progress", "radar"]);
function defaultHeight(type) {
  if (type === "sparkline") return 56;
  if (type === "pie" || type === "donut" || type === "progress" || type === "radar") return 260;
  return 260;
}
function legendVisible(options, dataset) {
  if (options.showLegend === false) return false;
  if (options.showLegend === true) return true;
  return dataset.categorical || dataset.series.length > 1;
}
var TYPE_NAMES = {
  line: "line",
  area: "area",
  bar: "bar",
  column: "horizontal bar",
  stacked: "stacked bar",
  pie: "pie",
  donut: "donut",
  sparkline: "trend",
  radar: "radar",
  scatter: "scatter",
  progress: "progress"
};
function describe(type, dataset, format) {
  if (dataset.series.length === 0) return "Chart with no data.";
  const plural = dataset.series.length === 1 ? "series" : "series";
  const parts = [`${TYPE_NAMES[type]} chart with ${dataset.series.length} ${plural}.`];
  for (const entry of dataset.series) {
    if (entry.values.length === 0) continue;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const value of entry.values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    const average = sum / entry.values.length;
    parts.push(
      `${entry.name}: ${entry.values.length} points, minimum ${formatChartValue(min, format)}, maximum ${formatChartValue(max, format)}, average ${formatChartValue(average, format)}.`
    );
  }
  return parts.join(" ");
}
function renderBody(ctx) {
  switch (ctx.type) {
    case "bar":
    case "stacked":
      return renderBars(ctx);
    case "column":
      return renderColumns(ctx);
    case "pie":
    case "donut":
      return renderPie(ctx);
    case "radar":
      return renderRadar(ctx);
    case "scatter":
      return renderScatter(ctx);
    case "progress":
      return renderProgress(ctx);
    default:
      return renderLine(ctx);
  }
}
function legendHtml(items, hidden) {
  if (items.length === 0) return "";
  const buttons = items.map((item) => {
    const off = hidden.has(item.key);
    return `<button type="button" class="v-chart-key" data-key="${escapeHtml(item.key)}" aria-pressed="${off ? "false" : "true"}"><span class="v-chart-dot" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.name)}</button>`;
  });
  return `<div class="v-chart-legend">${buttons.join("")}</div>`;
}
function draw(state2) {
  const el = state2.el;
  const options = state2.options;
  const type = options.type ?? "line";
  const palette2 = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const format = options.format ?? "number";
  const width = Math.max(160, Math.round(el.clientWidth || options.width || 640));
  const height = Math.max(48, Math.round(options.height ?? (el.clientHeight || defaultHeight(type))));
  state2.lastWidth = width;
  state2.viewWidth = width;
  state2.viewHeight = height;
  const full = normalize(options, type);
  const legend = buildLegend(full, palette2);
  const dataset = applyHidden(full, state2.hidden, palette2);
  const animated = options.animate !== false && !prefersReducedMotion2();
  state2.hits = [];
  state2.shapeHits = SHAPE_HIT.has(type);
  state2.hitAxis = type === "column" ? "y" : "x";
  const ctx = {
    type,
    options,
    dataset,
    palette: palette2,
    width,
    height,
    animated,
    format,
    hits: state2.hits
  };
  const body = renderBody(ctx);
  const label = describe(type, dataset, format);
  el.classList.add("v-chart");
  el.classList.toggle("v-chart-animate", animated);
  el.classList.remove("v-chart-in");
  const html = [
    `<svg class="v-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" `,
    `style="height:${height}px" role="img" aria-label="${escapeHtml(label)}">`,
    body,
    "</svg>"
  ];
  if (legendVisible(options, full)) html.push(legendHtml(legend, state2.hidden));
  if (options.tooltip !== false) html.push('<div class="v-chart-tip" hidden></div>');
  el.innerHTML = html.join("");
  if (animated && typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add("v-chart-in"));
    });
  }
}
function tooltipHtml(hit, format) {
  const rows = hit.rows.map(
    (row) => `<div class="v-chart-tip-row"><span class="v-chart-dot" style="background:${escapeHtml(row.color)}"></span>${escapeHtml(row.name)}<b>${escapeHtml(formatChartValue(row.value, format))}</b></div>`
  );
  return `<div class="v-chart-tip-title">${escapeHtml(hit.title)}</div>${rows.join("")}`;
}
function hideTooltip(state2) {
  const tip = state2.el.querySelector(".v-chart-tip");
  if (tip) tip.hidden = true;
}
function showTooltip(state2, event) {
  if (state2.options.tooltip === false || state2.hits.length === 0) return;
  const tip = state2.el.querySelector(".v-chart-tip");
  const svg = state2.el.querySelector("svg");
  if (!tip || !svg) return;
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  let hit;
  if (state2.shapeHits) {
    const target = event.target;
    const node = target && typeof target.closest === "function" ? target.closest("[data-hit]") : null;
    const index = node ? Number(node.getAttribute("data-hit")) : -1;
    if (index >= 0) hit = state2.hits[index];
  } else if (state2.hitAxis === "y") {
    const py = (event.clientY - rect.top) / rect.height * state2.viewHeight;
    let best = Infinity;
    for (const candidate of state2.hits) {
      const distance = Math.abs(candidate.y - py);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  } else {
    const px = (event.clientX - rect.left) / rect.width * state2.viewWidth;
    let best = Infinity;
    for (const candidate of state2.hits) {
      const distance = Math.abs(candidate.x - px);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  }
  if (!hit) {
    hideTooltip(state2);
    return;
  }
  const container = state2.el.getBoundingClientRect();
  tip.innerHTML = tooltipHtml(hit, state2.options.format ?? "number");
  tip.style.left = `${rect.left - container.left + hit.x / state2.viewWidth * rect.width}px`;
  tip.style.top = `${rect.top - container.top + hit.y / state2.viewHeight * rect.height}px`;
  tip.hidden = false;
}
function attachEvents(state2) {
  const el = state2.el;
  const onClick = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const key = target.closest("[data-key]")?.getAttribute("data-key");
    if (key === null || key === void 0) return;
    if (state2.hidden.has(key)) state2.hidden.delete(key);
    else state2.hidden.add(key);
    draw(state2);
  };
  const onMove = (event) => showTooltip(state2, event);
  const onLeave = () => hideTooltip(state2);
  el.addEventListener("click", onClick);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  state2.teardown.push(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  });
}
function observeResize(state2) {
  if (typeof ResizeObserver === "undefined") return;
  const observer2 = new ResizeObserver(() => {
    const width = Math.round(state2.el.clientWidth);
    if (width === 0 || width === state2.lastWidth) return;
    if (state2.frame) cancelAnimationFrame(state2.frame);
    state2.frame = requestAnimationFrame(() => {
      state2.frame = 0;
      draw(state2);
    });
  });
  observer2.observe(state2.el);
  state2.observer = observer2;
}
function renderChart(el, options) {
  ensureTokens();
  injectStyle("charts", CSS);
  const state2 = {
    el,
    options: { ...options },
    hidden: /* @__PURE__ */ new Set(),
    hits: [],
    shapeHits: false,
    hitAxis: "x",
    viewWidth: 1,
    viewHeight: 1,
    lastWidth: 0,
    observer: null,
    frame: 0,
    teardown: []
  };
  attachEvents(state2);
  draw(state2);
  observeResize(state2);
  return {
    el,
    get options() {
      return state2.options;
    },
    update(next) {
      Object.assign(state2.options, next);
      draw(state2);
    },
    destroy() {
      if (state2.frame) cancelAnimationFrame(state2.frame);
      state2.frame = 0;
      state2.observer?.disconnect();
      state2.observer = null;
      for (const off of state2.teardown) off();
      state2.teardown.length = 0;
      el.classList.remove("v-chart", "v-chart-animate", "v-chart-in");
      el.innerHTML = "";
    }
  };
}
function readOption(el, name) {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function parseBool(raw, fallback) {
  if (raw === null) return fallback;
  if (raw === "" || raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}
function directiveOptions(el, value) {
  const isOptionsObject = !!value && typeof value === "object" && !Array.isArray(value) && "data" in value;
  const options = isOptionsObject ? { ...value } : { data: value ?? [] };
  const type = readOption(el, "chart-type");
  if (type) options.type = type;
  if (!options.type) options.type = "line";
  const height = readOption(el, "chart-height");
  if (height) options.height = parseFloat(height) || options.height;
  const format = readOption(el, "chart-format");
  if (format) options.format = format;
  const colors = readOption(el, "chart-colors");
  if (colors) {
    options.colors = colors.split(",").map((color) => color.trim()).filter(Boolean);
  }
  const max = readOption(el, "chart-max");
  if (max !== null && max !== "") options.max = parseFloat(max);
  const min = readOption(el, "chart-min");
  if (min !== null && min !== "") options.min = parseFloat(min);
  const smooth = readOption(el, "chart-smooth");
  if (smooth !== null) options.smooth = parseBool(smooth, true);
  const grid = readOption(el, "chart-grid");
  if (grid !== null) options.showGrid = parseBool(grid, true);
  const legend = readOption(el, "chart-legend");
  if (legend !== null) options.showLegend = parseBool(legend, true);
  const values = readOption(el, "chart-values");
  if (values !== null) options.showValues = parseBool(values, true);
  const tooltip = readOption(el, "chart-tooltip");
  if (tooltip !== null) options.tooltip = parseBool(tooltip, true);
  const animateAttr = readOption(el, "chart-animate");
  if (animateAttr !== null) options.animate = parseBool(animateAttr, true);
  return options;
}
function touchDeep(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 3) return 1;
  let count = 0;
  if (Array.isArray(value)) {
    for (const item of value) count += touchDeep(item, depth + 1);
    return count;
  }
  for (const item of Object.values(value)) {
    count += touchDeep(item, depth + 1);
  }
  return count;
}
defineDirective("chart", ({ el, evaluate: evaluate2, effect: effect2, cleanup }) => {
  let instance = null;
  effect2(() => {
    const value = evaluate2();
    touchDeep(value);
    const options = directiveOptions(el, value);
    if (instance) instance.update(options);
    else instance = renderChart(el, options);
  });
  cleanup(() => {
    instance?.destroy();
    instance = null;
  });
});
var charts = {
  render: renderChart,
  format: formatChartValue,
  colors: CHART_COLORS
};

// src/ui/components.ts
function flag(value) {
  if (value === true) return true;
  if (value === false || value === null || value === void 0) return false;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  return text === "" || text === "true" || text === "1" || text === "yes";
}
function flags(...names) {
  const out = {};
  for (const name of names) {
    const key = `is${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    out[key] = function() {
      return flag(this[name]);
    };
  }
  return out;
}
var BOOL = { type: "any", default: false };
var TEXT = { type: "string", default: "" };
function fromOuterScope(instance, raw) {
  if (raw == null || typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text) return null;
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  const head = text.split(/[.[(]/)[0].trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(head)) return null;
  const parent = instance.$scope?.parent;
  if (!parent || !parent.has(head)) return null;
  return evaluateIn(text, parent, "list attribute");
}
function splitList(text) {
  return String(text).split(",").map((part) => part.trim()).filter(Boolean);
}
function hostModel(instance, model) {
  const el = instance.$el;
  Object.defineProperty(el, "value", {
    configurable: true,
    enumerable: false,
    get: model.get,
    set: model.set
  });
}
function notify(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
var ICON_PATHS = {
  check: '<path d="m5 12.5 4.4 4.4L19 7.6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  "chevron-down": '<path d="m6 9.5 6 6 6-6"/>',
  "chevron-up": '<path d="m6 14.5 6-6 6 6"/>',
  "chevron-left": '<path d="m14.5 6-6 6 6 6"/>',
  "chevron-right": '<path d="m9.5 6 6 6-6 6"/>',
  "arrow-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
  "arrow-down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20a7.4 7.4 0 0 1 14.4 0"/>',
  users: '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.4 19.5a6.4 6.4 0 0 1 12.2 0M16 5.6a3.2 3.2 0 0 1 0 5.9M17.4 14.4a6.4 6.4 0 0 1 3.2 5.1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  eye: '<path d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  "eye-off": '<path d="M4 4l16 16M9.9 6.2A9.3 9.3 0 0 1 12 6c5.6 0 9.4 6 9.4 6a17 17 0 0 1-3.3 3.9M6.3 8.2A17 17 0 0 0 2.6 12S6.4 18 12 18c1 0 1.9-.2 2.7-.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 1.8"/>',
  star: '<path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 7.6v.2"/>',
  alert: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.5v5M12 16.4v.2"/>',
  warning: '<path d="M12 4.4 2.8 19.6h18.4z"/><path d="M12 10v3.8M12 16.9v.2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.6 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.8-12"/>',
  edit: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14 6.5 17.5 10"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 5.5A1.5 1.5 0 0 0 14 4H6a2 2 0 0 0-2 2v8a1.5 1.5 0 0 0 1.5 1.5"/>',
  download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M4.5 19.5h15"/>',
  upload: '<path d="M12 20V8.5M7.5 12.5 12 8l4.5 4.5M4.5 4.5h15"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.6 14.4a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.15 16.9l.06-.06a1.7 1.7 0 0 0 .34-1.87A1.7 1.7 0 0 0 3 13.94H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.08 4.08l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.3 1z"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.6 20.5v-6h4.8v6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5.2-2 6.5-2 6.5h16S18 14.2 18 9"/><path d="M13.7 19.5a2 2 0 0 1-3.4 0"/>',
  filter: '<path d="M4 5.5h16l-6.2 7.3v5.3l-3.6 2v-7.3z"/>',
  external: '<path d="M14 4.5h5.5V10M19 5l-8 8"/><path d="M18 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V7.5A1.5 1.5 0 0 1 6 6h4.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-13.7-4.8L4 8.4"/><path d="M4 4.5v4h4M4 13a8 8 0 0 0 13.7 4.8L20 15.6"/><path d="M20 19.5v-4h-4"/>',
  folder: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h3.7l2 2.4h7.3A1.5 1.5 0 0 1 20 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  file: '<path d="M13.5 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9z"/><path d="M13.5 4v5h5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.7"/><path d="m5 17 4.6-4.3 3.4 3 2.6-2.3L19 17"/>',
  link: '<path d="M10.6 13.4a3.6 3.6 0 0 0 5.1 0l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3"/><path d="M13.4 10.6a3.6 3.6 0 0 0-5.1 0l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  logout: '<path d="M14.5 8V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h7a1.5 1.5 0 0 0 1.5-1.5v-2"/><path d="M9.5 12h10.5M16.5 8.5 20 12l-3.5 3.5"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2.4"/><path d="M3 10h18"/>',
  chart: '<path d="M4.5 19.5h15"/><path d="M7.5 19.5V11M12 19.5V5.5M16.5 19.5v-6"/>',
  box: '<path d="M20 8.6 12 4 4 8.6v6.8L12 20l8-4.6z"/><path d="m4 8.6 8 4.6 8-4.6M12 13.2V20"/>',
  inbox: '<path d="M4 13.5h4l1.4 2.4h5.2l1.4-2.4h4"/><path d="M4.6 13.5 7 5.6A1.5 1.5 0 0 1 8.5 4.5h7A1.5 1.5 0 0 1 17 5.6l2.4 7.9V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18z"/>'
};
function iconSvg(name) {
  const key = String(name ?? "").trim();
  if (!key) return "";
  const body = ICON_PATHS[key];
  if (!body) return "";
  return `<svg class="v-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
var CSS2 = `
.v-ic{width:1em;height:1em;flex:none}
.v-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v-native-hidden{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;
  border:0;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes v-spin{to{transform:rotate(360deg)}}
@keyframes v-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes v-shimmer{0%{background-position:-180% 0}100%{background-position:180% 0}}
@keyframes v-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}

/* ----------------------------------------------------------------- button */
.v-btn{appearance:none;-webkit-appearance:none;position:relative;display:inline-flex;
  align-items:center;justify-content:center;gap:8px;vertical-align:middle;white-space:nowrap;
  font-family:var(--v-font-sans);font-weight:600;line-height:1;text-decoration:none;
  border:1px solid transparent;border-radius:var(--v-radius-sm);cursor:pointer;
  transition:background-color .15s var(--v-ease),border-color .15s var(--v-ease),
    color .15s var(--v-ease),box-shadow .15s var(--v-ease),transform .08s var(--v-ease)}
.v-btn:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-btn:active:not([disabled]){transform:translateY(1px)}
.v-btn[disabled]{cursor:not-allowed;opacity:.58}
.v-btn[data-block="true"]{width:100%;display:flex}
.v-btn[data-rounded="true"]{border-radius:var(--v-radius-full)}
.v-btn-label{display:inline-flex;align-items:center}
.v-btn-label:empty{display:none}

.v-btn[data-size="sm"]{min-height:32px;padding:0 12px;font-size:13px;gap:6px}
.v-btn[data-size="md"]{min-height:40px;padding:0 16px;font-size:14px}
.v-btn[data-size="lg"]{min-height:46px;padding:0 20px;font-size:15px}
.v-btn[data-size="xl"]{min-height:54px;padding:0 26px;font-size:16px}
.v-btn .v-ic{font-size:1.15em}

.v-btn[data-variant="primary"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-btn[data-variant="primary"]:hover:not([disabled]){background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-btn[data-variant="primary"]:active:not([disabled]){background:var(--v-primary-active);border-color:var(--v-primary-active);color:var(--v-primary-contrast-active)}
.v-btn[data-variant="accent"]{background:var(--v-accent);border-color:var(--v-accent);color:var(--v-accent-contrast)}
.v-btn[data-variant="accent"]:hover:not([disabled]){background:var(--v-accent-hover);border-color:var(--v-accent-hover);color:var(--v-accent-contrast-hover)}
.v-btn[data-variant="success"]{background:var(--v-success);border-color:var(--v-success);color:var(--v-success-contrast)}
.v-btn[data-variant="success"]:hover:not([disabled]){background:var(--v-success-hover);border-color:var(--v-success-hover);color:var(--v-success-contrast-hover)}
.v-btn[data-variant="warning"]{background:var(--v-warning);border-color:var(--v-warning);color:var(--v-warning-contrast)}
.v-btn[data-variant="warning"]:hover:not([disabled]){background:var(--v-warning-hover);border-color:var(--v-warning-hover);color:var(--v-warning-contrast-hover)}
.v-btn[data-variant="danger"]{background:var(--v-danger);border-color:var(--v-danger);color:var(--v-danger-contrast)}
.v-btn[data-variant="danger"]:hover:not([disabled]){background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-btn[data-variant="secondary"]{background:var(--v-surface-3);border-color:var(--v-border);color:var(--v-text)}
.v-btn[data-variant="secondary"]:hover:not([disabled]){background:var(--v-surface-2);border-color:var(--v-border-strong);color:var(--v-text)}
.v-btn[data-variant="outline"]{background:transparent;border-color:var(--v-primary-border);color:var(--v-primary-soft-text)}
.v-btn[data-variant="outline"]:hover:not([disabled]){background:var(--v-primary-soft);border-color:var(--v-primary);color:var(--v-primary-soft-text)}
.v-btn[data-variant="ghost"]{background:transparent;border-color:transparent;color:var(--v-text-muted)}
.v-btn[data-variant="ghost"]:hover:not([disabled]){background:var(--v-surface-3);color:var(--v-text)}
.v-btn[data-variant="link"]{background:transparent;border-color:transparent;color:var(--v-primary);padding:0 4px;min-height:auto}
.v-btn[data-variant="link"]:hover:not([disabled]){color:var(--v-primary-hover);text-decoration:underline}

.v-btn-spin{width:1em;height:1em;border-radius:50%;border:2px solid currentColor;
  border-top-color:transparent;animation:v-spin .7s linear infinite;flex:none}

/* ------------------------------------------------------------ icon button */
.v-icon-btn{appearance:none;-webkit-appearance:none;display:inline-grid;place-items:center;
  border:1px solid transparent;border-radius:var(--v-radius-sm);cursor:pointer;
  font-family:var(--v-font-sans);
  transition:background-color .15s var(--v-ease),border-color .15s var(--v-ease),color .15s var(--v-ease)}
.v-icon-btn:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-icon-btn[disabled]{cursor:not-allowed;opacity:.58}
.v-icon-btn[data-rounded="true"]{border-radius:var(--v-radius-full)}
.v-icon-btn[data-size="sm"]{width:30px;height:30px;font-size:15px}
.v-icon-btn[data-size="md"]{width:38px;height:38px;font-size:17px}
.v-icon-btn[data-size="lg"]{width:46px;height:46px;font-size:20px}
.v-icon-btn[data-variant="primary"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-icon-btn[data-variant="primary"]:hover:not([disabled]){background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-icon-btn[data-variant="danger"]{background:var(--v-danger);border-color:var(--v-danger);color:var(--v-danger-contrast)}
.v-icon-btn[data-variant="danger"]:hover:not([disabled]){background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-icon-btn[data-variant="secondary"]{background:var(--v-surface-3);border-color:var(--v-border);color:var(--v-text)}
.v-icon-btn[data-variant="secondary"]:hover:not([disabled]){background:var(--v-surface-2);border-color:var(--v-border-strong);color:var(--v-text)}
.v-icon-btn[data-variant="outline"]{background:transparent;border-color:var(--v-border-strong);color:var(--v-text)}
.v-icon-btn[data-variant="outline"]:hover:not([disabled]){background:var(--v-surface-3);border-color:var(--v-primary);color:var(--v-text)}
.v-icon-btn[data-variant="ghost"]{background:transparent;border-color:transparent;color:var(--v-text-muted)}
.v-icon-btn[data-variant="ghost"]:hover:not([disabled]){background:var(--v-surface-3);color:var(--v-text)}

/* ------------------------------------------------------------------ card */
.v-card{display:flex;flex-direction:column;background:var(--v-surface);color:var(--v-text);
  border:1px solid var(--v-border);border-radius:var(--v-radius);box-shadow:var(--v-shadow-sm);
  font-family:var(--v-font-sans);overflow:hidden;
  transition:box-shadow .18s var(--v-ease),border-color .18s var(--v-ease),transform .18s var(--v-ease)}
.v-card[data-hoverable="true"]:hover{box-shadow:var(--v-shadow);border-color:var(--v-border-strong);transform:translateY(-2px)}
.v-card-head{display:flex;gap:12px;align-items:flex-start;padding:18px 18px 0}
.v-card-icon{flex:none;width:36px;height:36px;display:grid;place-items:center;font-size:18px;
  border-radius:var(--v-radius-sm);background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-card-heading{flex:1;min-width:0}
.v-card-title{margin:0;font-size:15.5px;font-weight:650;line-height:1.35;color:var(--v-text)}
.v-card-sub{margin:4px 0 0;font-size:13.5px;line-height:1.5;color:var(--v-text-muted)}
.v-card-actions{flex:none;display:flex;gap:8px;align-items:center}
.v-card-actions:empty{display:none}
.v-card-body{padding:18px;font-size:14px;line-height:1.6;color:var(--v-text)}
.v-card-head+.v-card-body{padding-top:14px}
.v-card-body>:first-child{margin-top:0}
.v-card-body>:last-child{margin-bottom:0}
.v-card-body:empty{display:none}
.v-card-foot{padding:0 18px 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.v-card-foot:empty{display:none}
.v-card[data-padded="false"] .v-card-body{padding:0}

/* ------------------------------------------------------------------- form */
.v-field{display:flex;flex-direction:column;gap:6px;font-family:var(--v-font-sans);min-width:0}
.v-label{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:600;
  line-height:1.3;color:var(--v-text)}
.v-label[data-size="sm"]{font-size:12.5px}
.v-label[data-size="lg"]{font-size:14px}
.v-req{color:var(--v-danger);font-weight:700}
.v-hint{margin:0;font-size:12.5px;line-height:1.45;color:var(--v-text-muted)}
.v-error-text{margin:0;font-size:12.5px;line-height:1.45;font-weight:600;color:var(--v-danger)}

.v-control{position:relative;display:flex;align-items:center;gap:8px;
  background:var(--v-surface);border:1px solid var(--v-border);border-radius:var(--v-radius-sm);
  transition:border-color .15s var(--v-ease),box-shadow .15s var(--v-ease),background-color .15s var(--v-ease)}
.v-control:focus-within{border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-field[data-error="true"] .v-control{border-color:var(--v-danger)}
.v-field[data-error="true"] .v-control:focus-within{box-shadow:0 0 0 3px var(--v-danger-ring)}
.v-field[data-disabled="true"] .v-control{background:var(--v-surface-3);opacity:.72}
.v-control-ic{flex:none;display:grid;place-items:center;font-size:16px;color:var(--v-text-soft);padding-left:11px}
.v-control-ic+.v-input,.v-control-ic+.v-textarea{padding-left:2px}
.v-control[data-size="sm"]{--v-control-h:34px;font-size:13px}
.v-control[data-size="md"]{--v-control-h:40px;font-size:14px}
.v-control[data-size="lg"]{--v-control-h:46px;font-size:15px}

.v-input,.v-textarea{appearance:none;-webkit-appearance:none;flex:1;min-width:0;width:100%;
  background:transparent;border:0;outline:none;font-family:inherit;font-size:inherit;
  line-height:1.45;color:var(--v-text);padding:0 12px;min-height:calc(var(--v-control-h,40px) - 2px)}
.v-textarea{padding:10px 12px;resize:vertical;min-height:96px}
.v-textarea[data-resize="none"]{resize:none}
.v-input::placeholder,.v-textarea::placeholder{color:var(--v-text-soft);opacity:1}
.v-input:disabled,.v-textarea:disabled{cursor:not-allowed;color:var(--v-text-muted)}
.v-input::-webkit-outer-spin-button,.v-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.v-input[type="number"]{-moz-appearance:textfield}
.v-affix{flex:none;display:grid;place-items:center;padding-right:10px;color:var(--v-text-soft);font-size:16px}
.v-clear{appearance:none;background:none;border:0;cursor:pointer;color:var(--v-text-soft);
  display:grid;place-items:center;width:22px;height:22px;border-radius:var(--v-radius-full);
  margin-right:8px;font-size:14px;flex:none}
.v-clear:hover{background:var(--v-surface-3);color:var(--v-text)}
.v-clear:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:1px}
.v-counter{font-size:12px;color:var(--v-text-soft);text-align:right}

/* ----------------------------------------------------------- combobox */
.v-select{position:relative;font-family:var(--v-font-sans)}
.v-select-trigger{appearance:none;-webkit-appearance:none;width:100%;display:flex;align-items:center;
  gap:8px;text-align:left;cursor:pointer;background:var(--v-surface);color:var(--v-text);
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);font-family:inherit;
  min-height:var(--v-control-h,40px);padding:0 10px 0 12px;font-size:14px;
  transition:border-color .15s var(--v-ease),box-shadow .15s var(--v-ease)}
.v-select-trigger[data-size="sm"]{--v-control-h:34px;font-size:13px}
.v-select-trigger[data-size="lg"]{--v-control-h:46px;font-size:15px}
.v-select-trigger:hover:not([disabled]){border-color:var(--v-border-strong)}
.v-select-trigger:focus-visible{outline:none;border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-select.is-open>.v-select-trigger{border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-select-trigger[disabled]{cursor:not-allowed;background:var(--v-surface-3);color:var(--v-text-muted)}
.v-field[data-error="true"] .v-select-trigger{border-color:var(--v-danger)}
.v-select-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-select-value[data-placeholder="true"]{color:var(--v-text-soft)}
.v-select-arrow{flex:none;font-size:16px;color:var(--v-text-soft);transition:transform .18s var(--v-ease)}
.v-select.is-open .v-select-arrow{transform:rotate(180deg)}

.v-select-pop{position:absolute;z-index:var(--v-z-dropdown,900);top:calc(100% + 6px);left:0;right:0;
  background:var(--v-surface);border:1px solid var(--v-border);border-radius:var(--v-radius-sm);
  box-shadow:var(--v-shadow);overflow:hidden;display:flex;flex-direction:column;max-height:280px}
.v-select-search{padding:8px;border-bottom:1px solid var(--v-border);display:flex;align-items:center;gap:8px}
.v-select-input{appearance:none;-webkit-appearance:none;flex:1;min-width:0;background:var(--v-surface-2);
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);padding:7px 10px;
  font-family:inherit;font-size:13.5px;color:var(--v-text);outline:none}
.v-select-input:focus{border-color:var(--v-primary);box-shadow:0 0 0 2px var(--v-focus-ring)}
.v-select-input::placeholder{color:var(--v-text-soft)}
.v-select-list{list-style:none;margin:0;padding:5px;overflow-y:auto;overscroll-behavior:contain}
.v-select-opt{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--v-radius-sm);
  font-size:14px;line-height:1.35;color:var(--v-text);cursor:pointer;user-select:none}
.v-select-opt.is-active{background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-select-opt.is-selected{font-weight:600}
.v-select-opt.is-disabled{opacity:.45;cursor:not-allowed}
.v-select-check{flex:none;width:16px;height:16px;display:grid;place-items:center;
  color:var(--v-primary-soft-text);opacity:0}
.v-select-opt.is-selected .v-select-check{opacity:1}
.v-select-empty{padding:14px 10px;text-align:center;font-size:13.5px;color:var(--v-text-muted)}

/* --------------------------------------------- checkbox, radio and switch */
.v-check{display:inline-flex;align-items:flex-start;gap:9px;cursor:pointer;
  font-family:var(--v-font-sans);font-size:14px;line-height:1.45;color:var(--v-text)}
.v-check[data-disabled="true"]{cursor:not-allowed;opacity:.6}
.v-check-slot{position:relative;flex:none;display:inline-flex;margin-top:1px}
.v-check-native{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;
  appearance:none;-webkit-appearance:none;cursor:inherit}
.v-check-box{width:19px;height:19px;display:grid;place-items:center;background:var(--v-surface);
  border:1.5px solid var(--v-border-strong);border-radius:5px;color:var(--v-primary-contrast);
  transition:background-color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-check[data-shape="round"] .v-check-box{border-radius:var(--v-radius-full)}
.v-check-box .v-ic{font-size:13px;opacity:0;transform:scale(.6);
  transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-check-native:checked+.v-check-box{background:var(--v-primary);border-color:var(--v-primary)}
.v-check-native:checked+.v-check-box .v-ic{opacity:1;transform:none}
.v-check-native:focus-visible+.v-check-box{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-check-native:disabled+.v-check-box{background:var(--v-surface-3);border-color:var(--v-border)}
.v-check[data-error="true"] .v-check-box{border-color:var(--v-danger)}
.v-check-text{min-width:0}
.v-check-desc{display:block;margin-top:2px;font-size:12.5px;color:var(--v-text-muted)}

.v-radio-dot{width:9px;height:9px;border-radius:var(--v-radius-full);background:var(--v-primary-contrast);
  opacity:0;transform:scale(.4);transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-check-native:checked+.v-check-box .v-radio-dot{opacity:1;transform:none}

.v-switch-track{width:40px;height:23px;border-radius:var(--v-radius-full);background:var(--v-border-strong);
  display:flex;align-items:center;padding:2px;transition:background-color .18s var(--v-ease)}
.v-switch-thumb{width:19px;height:19px;border-radius:var(--v-radius-full);background:var(--v-surface);
  box-shadow:var(--v-shadow-sm);transition:transform .18s var(--v-ease)}
.v-check-native:checked+.v-switch-track{background:var(--v-primary)}
.v-check-native:checked+.v-switch-track .v-switch-thumb{transform:translateX(17px)}
.v-check-native:focus-visible+.v-switch-track{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-check-native:disabled+.v-switch-track{opacity:.6}
.v-check[data-size="sm"] .v-switch-track{width:34px;height:20px}
.v-check[data-size="sm"] .v-switch-thumb{width:16px;height:16px}
.v-check[data-size="sm"] .v-check-native:checked+.v-switch-track .v-switch-thumb{transform:translateX(14px)}

/* ------------------------------------------------------ badge, tag, alert */
.v-badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--v-font-sans);
  font-weight:600;line-height:1;border-radius:var(--v-radius-full);border:1px solid transparent;
  white-space:nowrap;vertical-align:middle}
.v-badge[data-size="sm"]{font-size:11px;padding:3px 8px}
.v-badge[data-size="md"]{font-size:12px;padding:4px 10px}
.v-badge[data-size="lg"]{font-size:13px;padding:6px 12px}
.v-badge-dot{width:6px;height:6px;border-radius:var(--v-radius-full);background:currentColor;flex:none}
.v-badge[data-variant="soft"][data-tone="neutral"]{background:var(--v-surface-3);color:var(--v-text-muted)}
.v-badge[data-variant="soft"][data-tone="primary"]{background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-badge[data-variant="soft"][data-tone="accent"]{background:var(--v-accent-soft);color:var(--v-accent-soft-text)}
.v-badge[data-variant="soft"][data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-badge[data-variant="soft"][data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text)}
.v-badge[data-variant="soft"][data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-badge[data-variant="soft"][data-tone="info"]{background:var(--v-info-soft);color:var(--v-info-soft-text)}
.v-badge[data-variant="solid"][data-tone="neutral"]{background:var(--v-text-muted);color:var(--v-surface)}
.v-badge[data-variant="solid"][data-tone="primary"]{background:var(--v-primary);color:var(--v-primary-contrast)}
.v-badge[data-variant="solid"][data-tone="accent"]{background:var(--v-accent);color:var(--v-accent-contrast)}
.v-badge[data-variant="solid"][data-tone="success"]{background:var(--v-success);color:var(--v-success-contrast)}
.v-badge[data-variant="solid"][data-tone="warning"]{background:var(--v-warning);color:var(--v-warning-contrast)}
.v-badge[data-variant="solid"][data-tone="danger"]{background:var(--v-danger);color:var(--v-danger-contrast)}
.v-badge[data-variant="solid"][data-tone="info"]{background:var(--v-info);color:var(--v-info-contrast)}
.v-badge[data-variant="outline"]{background:transparent}
.v-badge[data-variant="outline"][data-tone="neutral"]{border-color:var(--v-border-strong);color:var(--v-text-muted)}
.v-badge[data-variant="outline"][data-tone="primary"]{border-color:var(--v-primary-border);color:var(--v-primary-soft-text)}
.v-badge[data-variant="outline"][data-tone="accent"]{border-color:var(--v-accent-border);color:var(--v-accent-soft-text)}
.v-badge[data-variant="outline"][data-tone="success"]{border-color:var(--v-success-border);color:var(--v-success-soft-text)}
.v-badge[data-variant="outline"][data-tone="warning"]{border-color:var(--v-warning-border);color:var(--v-warning-soft-text)}
.v-badge[data-variant="outline"][data-tone="danger"]{border-color:var(--v-danger-border);color:var(--v-danger-soft-text)}
.v-badge[data-variant="outline"][data-tone="info"]{border-color:var(--v-info-border);color:var(--v-info-soft-text)}

.v-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--v-font-sans);font-size:12.5px;
  font-weight:600;line-height:1;padding:5px 6px 5px 10px;border-radius:var(--v-radius-sm);
  border:1px solid transparent;vertical-align:middle}
.v-tag[data-closable="false"]{padding-right:10px}
.v-tag-close{appearance:none;background:none;border:0;cursor:pointer;color:inherit;opacity:.65;
  display:grid;place-items:center;width:18px;height:18px;border-radius:var(--v-radius-full);font-size:12px}
.v-tag-close:hover{opacity:1;background:rgba(0,0,0,.08)}
.v-tag-close:focus-visible{outline:2px solid currentColor;outline-offset:1px}

.v-alert{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:var(--v-radius);
  border:1px solid transparent;font-family:var(--v-font-sans);font-size:14px;line-height:1.55}
.v-alert-icon{flex:none;font-size:18px;margin-top:1px}
.v-alert-body{flex:1;min-width:0}
.v-alert-title{margin:0 0 3px;font-size:14.5px;font-weight:650;line-height:1.4}
.v-alert-text>:first-child{margin-top:0}
.v-alert-text>:last-child{margin-bottom:0}
.v-alert-close{appearance:none;background:none;border:0;cursor:pointer;color:inherit;opacity:.6;
  flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:var(--v-radius-sm);font-size:14px}
.v-alert-close:hover{opacity:1}
.v-alert-close:focus-visible{outline:2px solid currentColor;outline-offset:1px}
.v-alert[data-tone="info"]{background:var(--v-info-soft);color:var(--v-info-soft-text);border-color:var(--v-info-border)}
.v-alert[data-tone="primary"]{background:var(--v-primary-soft);color:var(--v-primary-soft-text);border-color:var(--v-primary-border)}
.v-alert[data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text);border-color:var(--v-success-border)}
.v-alert[data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text);border-color:var(--v-warning-border)}
.v-alert[data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text);border-color:var(--v-danger-border)}
.v-alert[data-tone="neutral"]{background:var(--v-surface-2);color:var(--v-text);border-color:var(--v-border)}

/* -------------------------------------------------------------- avatar */
.v-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;
  font-family:var(--v-font-sans);font-weight:650;overflow:hidden;flex:none;
  border-radius:var(--v-radius-full);background:var(--v-primary-soft);color:var(--v-primary-soft-text);
  user-select:none;vertical-align:middle}
.v-avatar[data-shape="square"]{border-radius:var(--v-radius-sm);overflow:visible}
.v-avatar[data-shape="square"] .v-avatar-img{border-radius:var(--v-radius-sm)}
.v-avatar[data-size="xs"]{width:24px;height:24px;font-size:10px}
.v-avatar[data-size="sm"]{width:32px;height:32px;font-size:12px}
.v-avatar[data-size="md"]{width:40px;height:40px;font-size:14px}
.v-avatar[data-size="lg"]{width:52px;height:52px;font-size:18px}
.v-avatar[data-size="xl"]{width:68px;height:68px;font-size:23px}
.v-avatar-img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
.v-avatar-status{position:absolute;right:0;bottom:0;width:28%;height:28%;border-radius:var(--v-radius-full);
  border:2px solid var(--v-surface);background:var(--v-text-soft)}
.v-avatar-status[data-status="online"]{background:var(--v-success)}
.v-avatar-status[data-status="busy"]{background:var(--v-danger)}
.v-avatar-status[data-status="away"]{background:var(--v-warning)}

/* --------------------------------------------------- spinner and skeleton */
.v-spinner{display:inline-block;border-radius:50%;border-style:solid;border-color:var(--v-border);
  border-top-color:var(--v-primary);animation:v-spin .7s linear infinite;vertical-align:middle}
.v-spinner[data-tone="accent"]{border-top-color:var(--v-accent)}
.v-spinner[data-tone="success"]{border-top-color:var(--v-success)}
.v-spinner[data-tone="danger"]{border-top-color:var(--v-danger)}
.v-spinner[data-tone="current"]{border-color:currentColor;border-top-color:transparent;opacity:.65}
.v-spinner[data-size="sm"]{width:16px;height:16px;border-width:2px}
.v-spinner[data-size="md"]{width:22px;height:22px;border-width:2.5px}
.v-spinner[data-size="lg"]{width:32px;height:32px;border-width:3px}

.v-skeleton{display:block;background:var(--v-surface-3);border-radius:var(--v-radius-sm);
  background-image:linear-gradient(90deg,transparent 0%,var(--v-surface-2) 50%,transparent 100%);
  background-size:180% 100%;animation:v-shimmer 1.5s linear infinite}
.v-skeleton[data-circle="true"]{border-radius:var(--v-radius-full)}
.v-skeleton-stack{display:flex;flex-direction:column;gap:8px}

/* --------------------------------------------------------------- progress */
.v-progress{font-family:var(--v-font-sans);display:flex;flex-direction:column;gap:6px}
.v-progress-head{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--v-text-muted)}
.v-progress-value{font-weight:650;color:var(--v-text)}
.v-progress-track{position:relative;width:100%;background:var(--v-surface-3);border-radius:var(--v-radius-full);
  overflow:hidden}
.v-progress[data-size="sm"] .v-progress-track{height:5px}
.v-progress[data-size="md"] .v-progress-track{height:9px}
.v-progress[data-size="lg"] .v-progress-track{height:14px}
.v-progress-bar{height:100%;border-radius:inherit;background:var(--v-primary);
  transition:width .35s var(--v-ease)}
.v-progress[data-tone="accent"] .v-progress-bar{background:var(--v-accent)}
.v-progress[data-tone="success"] .v-progress-bar{background:var(--v-success)}
.v-progress[data-tone="warning"] .v-progress-bar{background:var(--v-warning)}
.v-progress[data-tone="danger"] .v-progress-bar{background:var(--v-danger)}
.v-progress[data-indeterminate="true"] .v-progress-bar{width:30% !important;animation:v-indeterminate 1.3s var(--v-ease) infinite}

/* ---------------------------------------------------------------- divider */
.v-divider{display:flex;align-items:center;gap:12px;color:var(--v-text-soft);
  font-family:var(--v-font-sans);font-size:12.5px;font-weight:600;margin:16px 0}
.v-divider::before,.v-divider::after{content:"";flex:1;height:1px;background:var(--v-border)}
.v-divider[data-label="false"]::after{display:none}
.v-divider[data-vertical="true"]{flex-direction:column;margin:0 16px;align-self:stretch;height:auto}
.v-divider[data-vertical="true"]::before,.v-divider[data-vertical="true"]::after{width:1px;height:auto;flex:1}

/* ------------------------------------------------------------------ table */
.v-table-wrap{width:100%;overflow-x:auto;background:var(--v-surface);border:1px solid var(--v-border);
  border-radius:var(--v-radius);font-family:var(--v-font-sans)}
.v-table{width:100%;border-collapse:collapse;font-size:14px;color:var(--v-text)}
.v-table th,.v-table td{padding:11px 14px;text-align:left;border-bottom:1px solid var(--v-border);
  vertical-align:middle}
.v-table thead th{background:var(--v-surface-2);font-size:12.5px;font-weight:650;letter-spacing:.02em;
  text-transform:uppercase;color:var(--v-text-muted);white-space:nowrap;position:sticky;top:0;z-index:1}
.v-table tbody tr:last-child td{border-bottom:0}
.v-table[data-striped="true"] tbody tr:nth-child(even){background:var(--v-surface-2)}
.v-table[data-hover="true"] tbody tr:hover{background:var(--v-primary-soft)}
.v-table[data-dense="true"] th,.v-table[data-dense="true"] td{padding:7px 12px}
.v-th{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;margin:0;
  font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit}
.v-th[data-sortable="true"]{cursor:pointer}
.v-th[data-sortable="true"]:hover{color:var(--v-text)}
.v-th:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px;border-radius:4px}
.v-th-arrow{font-size:12px;opacity:0;transition:opacity .15s var(--v-ease)}
.v-th[aria-sort="ascending"] .v-th-arrow,.v-th[aria-sort="descending"] .v-th-arrow{opacity:1;color:var(--v-primary)}
.v-table-empty{text-align:center;color:var(--v-text-muted);padding:34px 14px;font-size:14px}

/* ------------------------------------------------------------- pagination */
.v-pagination{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-family:var(--v-font-sans)}
.v-page{appearance:none;min-width:34px;height:34px;padding:0 9px;display:inline-grid;place-items:center;
  background:transparent;border:1px solid transparent;border-radius:var(--v-radius-sm);
  font-family:inherit;font-size:13.5px;font-weight:600;color:var(--v-text-muted);cursor:pointer;
  transition:background-color .14s var(--v-ease),color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-page:hover:not([disabled]):not([aria-current="page"]){background:var(--v-surface-3);color:var(--v-text)}
.v-page:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-page[disabled]{opacity:.4;cursor:not-allowed}
.v-page[aria-current="page"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-page-gap{min-width:24px;text-align:center;color:var(--v-text-soft);user-select:none}

/* ------------------------------------------------------------- breadcrumb */
.v-breadcrumb{font-family:var(--v-font-sans);font-size:13.5px}
.v-breadcrumb-list{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0;padding:0}
.v-breadcrumb-item{display:inline-flex;align-items:center;gap:6px;color:var(--v-text-muted)}
.v-breadcrumb-item a{color:inherit;text-decoration:none;border-radius:4px}
.v-breadcrumb-item a:hover{color:var(--v-primary);text-decoration:underline}
.v-breadcrumb-item a:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-breadcrumb-item[aria-current="page"]{color:var(--v-text);font-weight:600}
.v-breadcrumb-sep{color:var(--v-text-soft);user-select:none}

/* ------------------------------------------------------------------- stat */
.v-stat{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;background:var(--v-surface);
  border:1px solid var(--v-border);border-radius:var(--v-radius);font-family:var(--v-font-sans)}
.v-stat-icon{flex:none;width:40px;height:40px;display:grid;place-items:center;font-size:19px;
  border-radius:var(--v-radius-sm);background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-stat-body{flex:1;min-width:0}
.v-stat-label{font-size:12.5px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;
  color:var(--v-text-muted)}
.v-stat-value{margin-top:4px;font-size:26px;font-weight:700;line-height:1.15;color:var(--v-text);
  overflow-wrap:anywhere}
.v-stat-row{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}
.v-stat-delta{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:700;
  padding:2px 7px;border-radius:var(--v-radius-full)}
.v-stat-delta[data-dir="up"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-stat-delta[data-dir="down"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-stat-delta[data-dir="flat"]{background:var(--v-surface-3);color:var(--v-text-muted)}
.v-stat-hint{font-size:12.5px;color:var(--v-text-muted)}

/* ------------------------------------------------------------ empty state */
.v-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;
  padding:44px 22px;font-family:var(--v-font-sans);color:var(--v-text)}
.v-empty-icon{width:58px;height:58px;display:grid;place-items:center;font-size:27px;
  border-radius:var(--v-radius-full);background:var(--v-surface-3);color:var(--v-text-soft)}
.v-empty-title{margin:0;font-size:16px;font-weight:650}
.v-empty-desc{margin:0;font-size:14px;line-height:1.55;color:var(--v-text-muted);max-width:46ch}
.v-empty-actions{margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.v-empty-actions:empty{display:none}

/* --------------------------------------------------------------- timeline */
.v-timeline{list-style:none;margin:0;padding:0;font-family:var(--v-font-sans);
  display:flex;flex-direction:column}
.v-timeline-item{position:relative;display:flex;gap:14px;padding-bottom:20px}
.v-timeline-item:last-child{padding-bottom:0}
.v-timeline-rail{position:relative;flex:none;width:14px;display:flex;justify-content:center}
.v-timeline-dot{position:relative;z-index:1;width:12px;height:12px;margin-top:4px;
  border-radius:var(--v-radius-full);background:var(--v-primary);
  box-shadow:0 0 0 3px var(--v-primary-soft)}
.v-timeline-item[data-tone="success"] .v-timeline-dot{background:var(--v-success);box-shadow:0 0 0 3px var(--v-success-soft)}
.v-timeline-item[data-tone="warning"] .v-timeline-dot{background:var(--v-warning);box-shadow:0 0 0 3px var(--v-warning-soft)}
.v-timeline-item[data-tone="danger"] .v-timeline-dot{background:var(--v-danger);box-shadow:0 0 0 3px var(--v-danger-soft)}
.v-timeline-item[data-tone="muted"] .v-timeline-dot{background:var(--v-border-strong);box-shadow:0 0 0 3px var(--v-surface-3)}
.v-timeline-item:not(:last-child) .v-timeline-rail::after{content:"";position:absolute;top:14px;bottom:-20px;
  width:2px;background:var(--v-border)}
.v-timeline-body{flex:1;min-width:0;padding-bottom:2px}
.v-timeline-title{font-size:14px;font-weight:650;color:var(--v-text)}
.v-timeline-desc{margin:3px 0 0;font-size:13.5px;line-height:1.55;color:var(--v-text-muted)}
.v-timeline-time{display:block;margin-top:3px;font-size:12px;color:var(--v-text-soft)}

/* ------------------------------------------------------------------ steps */
.v-steps{display:flex;gap:0;font-family:var(--v-font-sans);list-style:none;margin:0;padding:0}
.v-steps[data-vertical="true"]{flex-direction:column;gap:4px}
.v-step{flex:1;display:flex;align-items:flex-start;gap:10px;min-width:0;position:relative;padding-right:12px}
.v-steps[data-vertical="true"] .v-step{padding:0 0 20px}
.v-step-mark{flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:var(--v-radius-full);
  font-size:13px;font-weight:700;background:var(--v-surface-3);color:var(--v-text-muted);
  border:1.5px solid transparent}
.v-step[data-state="current"] .v-step-mark{background:var(--v-primary);color:var(--v-primary-contrast)}
.v-step[data-state="done"] .v-step-mark{background:var(--v-success-soft);color:var(--v-success-soft-text);
  border-color:var(--v-success-border)}
.v-step-text{min-width:0;padding-top:4px}
.v-step-label{font-size:13.5px;font-weight:650;color:var(--v-text-muted);line-height:1.35}
.v-step[data-state="current"] .v-step-label,.v-step[data-state="done"] .v-step-label{color:var(--v-text)}
.v-step-line{position:absolute;left:28px;right:0;top:14px;height:2px;background:var(--v-border)}
.v-step[data-state="done"] .v-step-line{background:var(--v-success)}
.v-steps[data-vertical="true"] .v-step-line{left:13px;right:auto;top:30px;bottom:2px;width:2px;height:auto}
.v-step:last-child .v-step-line{display:none}

/* ----------------------------------------------------------------- rating */
.v-rating{display:inline-flex;align-items:center;gap:6px;font-family:var(--v-font-sans)}
.v-rating-stars{display:inline-flex;gap:2px}
.v-star{appearance:none;background:none;border:0;padding:2px;cursor:pointer;line-height:0;
  color:var(--v-border-strong);transition:color .13s var(--v-ease),transform .13s var(--v-ease)}
.v-star:hover:not([disabled]){transform:scale(1.12)}
.v-star:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px;border-radius:4px}
.v-star[data-on="true"]{color:var(--v-warning)}
.v-star[data-on="true"] .v-ic{fill:currentColor}
.v-star[disabled]{cursor:default}
.v-rating[data-size="sm"] .v-ic{font-size:15px}
.v-rating[data-size="md"] .v-ic{font-size:20px}
.v-rating[data-size="lg"] .v-ic{font-size:26px}
.v-rating-value{font-size:13px;font-weight:650;color:var(--v-text-muted)}

/* --------------------------------------------------------------- tooltip */
.v-tipwrap{position:relative;display:inline-flex}
.v-tip{position:absolute;z-index:var(--v-z-tooltip,1200);padding:6px 10px;border-radius:var(--v-radius-sm);
  background:var(--v-text);color:var(--v-surface);font-family:var(--v-font-sans);font-size:12.5px;
  font-weight:600;line-height:1.35;white-space:nowrap;pointer-events:none;opacity:0;
  transform:translateY(4px);transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-tip[data-placement="top"]{bottom:calc(100% + 8px);left:50%;translate:-50% 0}
.v-tip[data-placement="bottom"]{top:calc(100% + 8px);left:50%;translate:-50% 0}
.v-tip[data-placement="left"]{right:calc(100% + 8px);top:50%;translate:0 -50%}
.v-tip[data-placement="right"]{left:calc(100% + 8px);top:50%;translate:0 -50%}
.v-tipwrap:hover .v-tip,.v-tipwrap:focus-within .v-tip{opacity:1;transform:none}

/* ------------------------------------------------------------------- code */
.v-code{position:relative;background:var(--v-surface-inset);border:1px solid var(--v-border);
  border-radius:var(--v-radius);overflow:hidden;font-family:var(--v-font-mono)}
.v-code-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 10px 8px 14px;background:var(--v-surface-2);border-bottom:1px solid var(--v-border);
  font-family:var(--v-font-sans);font-size:12.5px;color:var(--v-text-muted)}
.v-code-name{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-code-copy{appearance:none;display:inline-flex;align-items:center;gap:6px;background:transparent;
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);padding:4px 9px;cursor:pointer;
  font-family:inherit;font-size:12px;font-weight:650;color:var(--v-text-muted);flex:none;
  transition:background-color .14s var(--v-ease),color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-code-copy:hover{background:var(--v-surface-3);color:var(--v-text);border-color:var(--v-border-strong)}
.v-code-copy:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-code-copy[data-copied="true"]{color:var(--v-success-soft-text);border-color:var(--v-success-border);
  background:var(--v-success-soft)}
.v-code-pre{margin:0;padding:14px;overflow-x:auto;font-size:13px;line-height:1.65;
  color:var(--v-text);tab-size:2}
.v-code[data-wrap="true"] .v-code-pre{white-space:pre-wrap;overflow-wrap:anywhere}
.v-code-pre code{font-family:inherit;background:none;padding:0}

@media (max-width:600px){
  .v-steps{flex-direction:column;gap:4px}
  .v-steps .v-step{padding:0 0 20px}
  .v-steps .v-step-line{left:13px;right:auto;top:30px;bottom:2px;width:2px;height:auto}
  .v-stat-value{font-size:22px}
}
@media (prefers-reduced-motion: reduce){
  .v-btn,.v-icon-btn,.v-card,.v-control,.v-select-trigger,.v-select-arrow,.v-check-box,
  .v-check-box .v-ic,.v-radio-dot,.v-switch-track,.v-switch-thumb,.v-progress-bar,.v-star,
  .v-tip,.v-page,.v-code-copy{transition:none}
  .v-skeleton,.v-spinner,.v-btn-spin{animation-duration:1.6s}
  .v-progress[data-indeterminate="true"] .v-progress-bar{animation-duration:2.4s}
}
`;
var stylesReady = false;
function ensureStyles() {
  if (stylesReady) return;
  stylesReady = true;
  ensureTokens();
  ensurePalette();
  injectStyle("components", CSS2);
}
function register(name, definition) {
  const original = definition.beforeMount;
  definition.methods = {
    svgIcon: (value) => iconSvg(value),
    hasFlag: (value) => flag(value),
    ...definition.methods ?? {}
  };
  definition.beforeMount = function() {
    ensureStyles();
    original?.call(this);
  };
  defineComponent(name, definition);
}
register("v-button", {
  props: {
    variant: { type: "string", default: "primary" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    iconRight: TEXT,
    type: { type: "string", default: "button" },
    loading: BOOL,
    disabled: BOOL,
    block: BOOL,
    rounded: BOOL,
    ariaLabel: TEXT
  },
  computed: {
    ...flags("loading", "disabled", "block", "rounded"),
    blocked() {
      return flag(this.disabled) || flag(this.loading);
    }
  },
  template: `
    <button class="v-btn" :type="type" :data-variant="variant" :data-size="size"
      :data-block="isBlock" :data-rounded="isRounded" :disabled="blocked"
      :aria-busy="isLoading" :aria-label="ariaLabel || null">
      <span class="v-btn-spin" v-if="isLoading" aria-hidden="true"></span>
      <span class="v-btn-ic" v-if="icon && !isLoading" v-html="svgIcon(icon)"></span>
      <span class="v-btn-label"><slot></slot></span>
      <span class="v-btn-ic" v-if="iconRight" v-html="svgIcon(iconRight)"></span>
    </button>
  `
});
register("v-icon-button", {
  props: {
    icon: { type: "string", default: "more" },
    label: TEXT,
    variant: { type: "string", default: "ghost" },
    size: { type: "string", default: "md" },
    type: { type: "string", default: "button" },
    disabled: BOOL,
    loading: BOOL,
    rounded: BOOL
  },
  computed: {
    ...flags("disabled", "loading", "rounded"),
    blocked() {
      return flag(this.disabled) || flag(this.loading);
    },
    accessibleName() {
      return this.label || this.icon || "Action";
    }
  },
  template: `
    <button class="v-icon-btn" :type="type" :data-variant="variant" :data-size="size"
      :data-rounded="isRounded" :disabled="blocked" :aria-label="accessibleName" :title="label || null">
      <span class="v-btn-spin" v-if="isLoading" aria-hidden="true"></span>
      <span v-if="!isLoading" v-html="svgIcon(icon)"></span>
    </button>
  `
});
register("v-card", {
  props: {
    title: TEXT,
    subtitle: TEXT,
    icon: TEXT,
    padded: { type: "any", default: true },
    hoverable: BOOL
  },
  computed: {
    ...flags("hoverable"),
    isPadded() {
      return this.padded === true || flag(this.padded);
    }
  },
  template: `
    <div class="v-card" :data-hoverable="isHoverable" :data-padded="isPadded">
      <div class="v-card-head" v-if="title || subtitle || icon">
        <span class="v-card-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
        <div class="v-card-heading">
          <h3 class="v-card-title" v-if="title" v-text="title"></h3>
          <p class="v-card-sub" v-if="subtitle" v-text="subtitle"></p>
        </div>
        <div class="v-card-actions"><slot name="actions"></slot></div>
      </div>
      <div class="v-card-body"><slot></slot></div>
      <div class="v-card-foot"><slot name="footer"></slot></div>
    </div>
  `
});
register("v-label", {
  props: {
    for: TEXT,
    size: { type: "string", default: "md" },
    required: BOOL
  },
  computed: { ...flags("required") },
  template: `
    <label class="v-label" :data-size="size" :for="for || null">
      <span><slot></slot></span>
      <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
    </label>
  `
});
register("v-field", {
  props: {
    label: TEXT,
    hint: TEXT,
    error: TEXT,
    for: TEXT,
    required: BOOL,
    disabled: BOOL
  },
  computed: { ...flags("required", "disabled") },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="for || null">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-field-control"><slot></slot></div>
      <p class="v-hint" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-input", {
  props: {
    label: TEXT,
    type: { type: "string", default: "text" },
    placeholder: TEXT,
    hint: TEXT,
    error: TEXT,
    value: TEXT,
    name: TEXT,
    id: TEXT,
    icon: TEXT,
    suffix: TEXT,
    size: { type: "string", default: "md" },
    autocomplete: TEXT,
    inputmode: TEXT,
    maxlength: TEXT,
    min: TEXT,
    max: TEXT,
    step: TEXT,
    required: BOOL,
    disabled: BOOL,
    readonly: BOOL,
    clearable: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-input-") };
  },
  computed: {
    ...flags("required", "disabled", "readonly", "clearable"),
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    }
  },
  methods: {
    clear() {
      this.value = "";
      notify(this.$el);
      this.emit("clear");
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.value,
      set: (next) => {
        this.value = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="fieldId">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-control" :data-size="size">
        <span class="v-control-ic" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
        <input class="v-input" :id="fieldId" :type="type" :name="name || null"
          :placeholder="placeholder || null" :autocomplete="autocomplete || null"
          :inputmode="inputmode || null" :maxlength="maxlength || null"
          :min="min || null" :max="max || null" :step="step || null"
          :required="isRequired" :disabled="isDisabled" :readonly="isReadonly"
          :aria-invalid="!!error" :aria-describedby="describedBy" v-model="value">
        <button type="button" class="v-clear" v-if="isClearable && value && !isDisabled"
          v-click="clear" aria-label="Clear field" v-html="svgIcon('x')"></button>
        <span class="v-affix" v-if="suffix" v-text="suffix"></span>
      </div>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-textarea", {
  props: {
    label: TEXT,
    placeholder: TEXT,
    hint: TEXT,
    error: TEXT,
    value: TEXT,
    name: TEXT,
    id: TEXT,
    rows: { type: "number", default: 4 },
    maxlength: TEXT,
    size: { type: "string", default: "md" },
    resize: { type: "string", default: "vertical" },
    required: BOOL,
    disabled: BOOL,
    readonly: BOOL,
    counter: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-textarea-") };
  },
  computed: {
    ...flags("required", "disabled", "readonly", "counter"),
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    },
    counterText() {
      const used = String(this.value ?? "").length;
      return this.maxlength ? `${used}/${this.maxlength}` : String(used);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.value,
      set: (next) => {
        this.value = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="fieldId">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-control" :data-size="size">
        <textarea class="v-textarea" :id="fieldId" :name="name || null" :rows="rows"
          :placeholder="placeholder || null" :maxlength="maxlength || null"
          :data-resize="resize" :required="isRequired" :disabled="isDisabled" :readonly="isReadonly"
          :aria-invalid="!!error" :aria-describedby="describedBy" v-model="value"></textarea>
      </div>
      <p class="v-counter" v-if="isCounter" v-text="counterText"></p>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
function normalizeOptions(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? splitList(raw) : [];
  return list.map((item) => {
    if (item != null && typeof item === "object") {
      const source = item;
      const value = source.value ?? source.id ?? source.key ?? source.label ?? "";
      const label = source.label ?? source.text ?? source.name ?? source.title ?? value;
      return { value: String(value), label: String(label), disabled: flag(source.disabled) };
    }
    return { value: String(item), label: String(item), disabled: false };
  });
}
register("v-select", {
  inheritScope: true,
  props: {
    label: TEXT,
    placeholder: { type: "string", default: "Select" },
    searchPlaceholder: { type: "string", default: "Search..." },
    emptyText: { type: "string", default: "No options found" },
    options: { type: "any", default: "" },
    value: { type: "any", default: "" },
    hint: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    size: { type: "string", default: "md" },
    multiple: BOOL,
    searchable: BOOL,
    clearable: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    const base = props.id || uid("v-select-");
    const initial = props.value;
    return {
      open: false,
      query: "",
      activeIndex: -1,
      selected: Array.isArray(initial) ? "" : initial == null ? "" : String(initial),
      selectedList: Array.isArray(initial) ? initial.map(String) : [],
      fieldId: base
    };
  },
  computed: {
    ...flags("multiple", "searchable", "clearable", "disabled", "required"),
    listId() {
      return `${this.fieldId}-list`;
    },
    labelId() {
      return `${this.fieldId}-label`;
    },
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    },
    allOptions() {
      return normalizeOptions(fromOuterScope(this, this.options) ?? this.options);
    },
    filtered() {
      const term = String(this.query ?? "").trim().toLowerCase();
      if (!term) return this.allOptions;
      return this.allOptions.filter(
        (option) => option.label.toLowerCase().includes(term)
      );
    },
    currentValue() {
      return flag(this.multiple) ? this.selectedList : this.selected;
    },
    hasSelection() {
      return flag(this.multiple) ? this.selectedList.length > 0 : this.selected !== "";
    },
    display() {
      if (!this.hasSelection) return this.placeholder;
      const labelOf = (value) => {
        const found = this.allOptions.find((option) => option.value === String(value));
        return found ? found.label : String(value);
      };
      if (flag(this.multiple)) return this.selectedList.map(labelOf).join(", ");
      return labelOf(this.selected);
    },
    activeId() {
      if (!this.open || this.activeIndex < 0) return null;
      if (this.activeIndex >= this.filtered.length) return null;
      return `${this.listId}-opt-${this.activeIndex}`;
    }
  },
  methods: {
    optionId(index) {
      return `${this.listId}-opt-${index}`;
    },
    isSelected(value) {
      if (flag(this.multiple)) return this.selectedList.indexOf(String(value)) > -1;
      return this.selected === String(value);
    },
    openList() {
      if (flag(this.disabled) || this.open) return;
      this.open = true;
      this.query = "";
      const index = this.filtered.findIndex((option) => this.isSelected(option.value));
      this.activeIndex = index > -1 ? index : 0;
      void nextTick(() => {
        const search = this.$refs.search;
        if (search) search.focus();
      });
    },
    closeList() {
      if (!this.open) return;
      this.open = false;
      this.activeIndex = -1;
    },
    closeAndFocus() {
      const wasOpen = this.open;
      this.closeList();
      if (!wasOpen) return;
      void nextTick(() => {
        const trigger = this.$refs.trigger;
        if (trigger) trigger.focus();
      });
    },
    toggleList() {
      if (this.open) this.closeAndFocus();
      else this.openList();
    },
    choose(option) {
      if (!option || option.disabled) return;
      if (flag(this.multiple)) {
        const list = [...this.selectedList];
        const index = list.indexOf(option.value);
        if (index > -1) list.splice(index, 1);
        else list.push(option.value);
        this.selectedList = list;
      } else {
        this.selected = option.value;
        this.closeAndFocus();
      }
      notify(this.$el);
      this.emit("change", this.currentValue);
    },
    clear() {
      this.selected = "";
      this.selectedList = [];
      notify(this.$el);
      this.emit("change", this.currentValue);
    },
    move(step) {
      const list = this.filtered;
      if (!list.length) return;
      let next = this.activeIndex + step;
      if (next < 0) next = list.length - 1;
      if (next >= list.length) next = 0;
      this.activeIndex = next;
    },
    onKey(event) {
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        this.closeAndFocus();
        return;
      }
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        if (!this.open) this.openList();
        else this.move(key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (key === "Home" || key === "End") {
        if (!this.open) return;
        event.preventDefault();
        this.activeIndex = key === "Home" ? 0 : this.filtered.length - 1;
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        if (!this.open) this.openList();
        else this.choose(this.filtered[this.activeIndex]);
        return;
      }
      if (key === " " && !flag(this.searchable)) {
        event.preventDefault();
        this.toggleList();
        return;
      }
      if (key === "Tab" && this.open) this.closeList();
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.currentValue,
      set: (next) => {
        if (flag(this.multiple)) {
          this.selectedList = Array.isArray(next) ? next.map(String) : splitList(String(next ?? ""));
          return;
        }
        this.selected = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" :id="labelId" v-if="label" v-click="openList">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-select" :class="{ 'is-open': open }" v-on:click.outside="closeList">
        <button type="button" class="v-select-trigger" :data-size="size" v-ref="trigger"
          :id="fieldId" :role="isSearchable ? 'button' : 'combobox'"
          aria-haspopup="listbox" :aria-expanded="open" :aria-controls="listId"
          :aria-labelledby="label ? labelId : null" :aria-describedby="describedBy"
          :aria-activedescendant="isSearchable ? null : activeId"
          :disabled="isDisabled" v-click="toggleList" v-keydown="onKey">
          <span class="v-select-value" :data-placeholder="!hasSelection" v-text="display"></span>
          <span class="v-clear" v-if="isClearable && hasSelection && !isDisabled"
            role="button" tabindex="0" aria-label="Clear selection"
            v-click.stop="clear" v-keydown.enter.stop="clear" v-html="svgIcon('x')"></span>
          <span class="v-select-arrow" aria-hidden="true" v-html="svgIcon('chevron-down')"></span>
        </button>
        <div class="v-select-pop" v-if="open">
          <div class="v-select-search" v-if="isSearchable">
            <input type="text" class="v-select-input" v-ref="search" v-model="query"
              role="combobox" aria-autocomplete="list" :aria-controls="listId"
              :aria-expanded="open" :aria-activedescendant="activeId"
              :placeholder="searchPlaceholder" aria-label="Search option" v-keydown="onKey">
          </div>
          <ul class="v-select-list" :id="listId" role="listbox"
            :aria-multiselectable="isMultiple" :aria-labelledby="label ? labelId : null">
            <li v-for="(option, index) in filtered" :key="option.value" class="v-select-opt"
              :id="optionId(index)" role="option" :aria-selected="isSelected(option.value)"
              :aria-disabled="option.disabled"
              :class="{ 'is-active': index === activeIndex, 'is-selected': isSelected(option.value), 'is-disabled': option.disabled }"
              v-click="choose(option)" v-mouseenter="activeIndex = index">
              <span class="v-select-check" v-html="svgIcon('check')" aria-hidden="true"></span>
              <span v-text="option.label"></span>
            </li>
            <li class="v-select-empty" v-if="!filtered.length" v-text="emptyText"></li>
          </ul>
        </div>
      </div>
      <select class="v-native-hidden" tabindex="-1" aria-hidden="true" :name="name || null"
        :multiple="isMultiple" :required="isRequired" :disabled="isDisabled">
        <option v-for="option in allOptions" :key="option.value" :value="option.value"
          :selected="isSelected(option.value)" v-text="option.label"></option>
      </select>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-checkbox", {
  props: {
    label: TEXT,
    description: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    value: { type: "string", default: "on" },
    checked: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-check-") };
  },
  computed: {
    ...flags("checked", "disabled", "required")
  },
  methods: {
    onToggle(event) {
      const input = event.target;
      this.checked = input.checked;
      this.emit("change", input.checked);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => flag(this.checked),
      set: (next) => {
        this.checked = flag(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" :data-disabled="isDisabled" :data-error="!!error">
      <span class="v-check-slot">
        <input type="checkbox" class="v-check-native" :id="fieldId" :name="name || null"
          :value="value" :checked="isChecked" :disabled="isDisabled" :required="isRequired"
          :aria-invalid="!!error" v-input="onToggle">
        <span class="v-check-box" aria-hidden="true" v-html="svgIcon('check')"></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-radio", {
  props: {
    label: TEXT,
    description: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    value: { type: "string", default: "" },
    checked: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    return {
      fieldId: props.id || uid("v-radio-"),
      selected: flag(props.checked) ? String(props.value ?? "") : ""
    };
  },
  computed: {
    ...flags("disabled", "required"),
    isChecked() {
      return this.selected !== "" && this.selected === String(this.value ?? "");
    }
  },
  methods: {
    onPick() {
      this.selected = String(this.value ?? "");
      this.emit("change", this.selected);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.selected,
      set: (next) => {
        this.selected = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" data-shape="round"
      :data-disabled="isDisabled" :data-error="!!error">
      <span class="v-check-slot">
        <input type="radio" class="v-check-native" :id="fieldId" :name="name || null"
          :value="value" :checked="isChecked" :disabled="isDisabled" :required="isRequired"
          :aria-invalid="!!error" v-input="onPick">
        <span class="v-check-box" aria-hidden="true"><span class="v-radio-dot"></span></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-switch", {
  props: {
    label: TEXT,
    description: TEXT,
    name: TEXT,
    id: TEXT,
    size: { type: "string", default: "md" },
    checked: BOOL,
    disabled: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-switch-") };
  },
  computed: { ...flags("checked", "disabled") },
  methods: {
    onToggle(event) {
      const input = event.target;
      this.checked = input.checked;
      this.emit("change", input.checked);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => flag(this.checked),
      set: (next) => {
        this.checked = flag(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" :data-size="size" :data-disabled="isDisabled">
      <span class="v-check-slot">
        <input type="checkbox" role="switch" class="v-check-native" :id="fieldId"
          :name="name || null" :checked="isChecked" :disabled="isDisabled"
          :aria-checked="isChecked" v-input="onToggle">
        <span class="v-switch-track" aria-hidden="true"><span class="v-switch-thumb"></span></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-badge", {
  props: {
    tone: { type: "string", default: "neutral" },
    variant: { type: "string", default: "soft" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    dot: BOOL
  },
  computed: { ...flags("dot") },
  template: `
    <span class="v-badge" :data-tone="tone" :data-variant="variant" :data-size="size">
      <span class="v-badge-dot" v-if="isDot" aria-hidden="true"></span>
      <span v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <span><slot></slot></span>
    </span>
  `
});
register("v-tag", {
  props: {
    tone: { type: "string", default: "neutral" },
    variant: { type: "string", default: "soft" },
    icon: TEXT,
    closable: BOOL,
    removeLabel: { type: "string", default: "Remove" }
  },
  computed: { ...flags("closable") },
  methods: {
    remove() {
      this.emit("remove", this.$el.textContent?.trim() ?? "");
    }
  },
  template: `
    <span class="v-tag v-badge" :data-tone="tone" :data-variant="variant" data-size="md"
      :data-closable="isClosable">
      <span v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <span><slot></slot></span>
      <button type="button" class="v-tag-close" v-if="isClosable" :aria-label="removeLabel"
        v-click="remove" v-html="svgIcon('x')"></button>
    </span>
  `
});
var ALERT_ICONS = {
  info: "info",
  primary: "info",
  success: "check",
  warning: "warning",
  danger: "alert",
  neutral: "info"
};
register("v-alert", {
  props: {
    tone: { type: "string", default: "info" },
    title: TEXT,
    icon: TEXT,
    closable: BOOL,
    closeLabel: { type: "string", default: "Close alert" }
  },
  state() {
    return { visible: true };
  },
  computed: {
    ...flags("closable"),
    resolvedIcon() {
      if (this.icon === "none") return "";
      return this.icon || ALERT_ICONS[this.tone] || "info";
    },
    liveRole() {
      return this.tone === "danger" ? "alert" : "status";
    }
  },
  methods: {
    dismiss() {
      this.visible = false;
      this.emit("close");
    }
  },
  template: `
    <div class="v-alert" v-show="visible" :data-tone="tone" :role="liveRole">
      <span class="v-alert-icon" v-if="resolvedIcon" v-html="svgIcon(resolvedIcon)" aria-hidden="true"></span>
      <div class="v-alert-body">
        <p class="v-alert-title" v-if="title" v-text="title"></p>
        <div class="v-alert-text"><slot></slot></div>
      </div>
      <button type="button" class="v-alert-close" v-if="isClosable" :aria-label="closeLabel"
        v-click="dismiss" v-html="svgIcon('x')"></button>
    </div>
  `
});
var AVATAR_TONES = ["primary", "accent", "success", "warning", "danger", "info"];
register("v-avatar", {
  props: {
    name: TEXT,
    src: TEXT,
    alt: TEXT,
    size: { type: "string", default: "md" },
    shape: { type: "string", default: "circle" },
    status: TEXT
  },
  state() {
    return { failed: false };
  },
  computed: {
    initials() {
      const parts = String(this.name ?? "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "?";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },
    tone() {
      const text = String(this.name ?? "");
      let sum = 0;
      for (let i = 0; i < text.length; i++) sum = (sum + text.charCodeAt(i)) % 9973;
      return AVATAR_TONES[sum % AVATAR_TONES.length];
    },
    toneStyle() {
      return {
        background: `var(--v-${this.tone}-soft)`,
        color: `var(--v-${this.tone}-soft-text)`
      };
    },
    showImage() {
      return !!this.src && !this.failed;
    },
    imageAlt() {
      return this.alt || this.name || "Avatar";
    }
  },
  methods: {
    onError() {
      this.failed = true;
    }
  },
  template: `
    <span class="v-avatar" :data-size="size" :data-shape="shape" :style="toneStyle"
      :title="name || null">
      <img class="v-avatar-img" v-if="showImage" :src="src" :alt="imageAlt" v-on:error="onError">
      <span v-if="!showImage" aria-hidden="true" v-text="initials"></span>
      <span class="v-sr" v-if="!showImage && name" v-text="name"></span>
      <span class="v-avatar-status" v-if="status" :data-status="status"
        :aria-label="status" role="img"></span>
    </span>
  `
});
register("v-spinner", {
  props: {
    size: { type: "string", default: "md" },
    tone: { type: "string", default: "primary" },
    label: { type: "string", default: "Loading" }
  },
  template: `
    <span class="v-spinner" :data-size="size" :data-tone="tone" role="status"
      :aria-label="label"></span>
  `
});
register("v-skeleton", {
  props: {
    width: { type: "string", default: "100%" },
    height: { type: "string", default: "14px" },
    radius: TEXT,
    lines: { type: "number", default: 1 },
    circle: BOOL
  },
  computed: {
    ...flags("circle"),
    count() {
      const value = Number(this.lines);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    },
    boxStyle() {
      const style = { width: this.width, height: this.height };
      if (this.radius) style.borderRadius = this.radius;
      if (flag(this.circle)) style.width = style.height = this.height;
      return style;
    },
    lastStyle() {
      return { ...this.boxStyle, width: "62%" };
    }
  },
  template: `
    <div class="v-skeleton-stack" role="status" aria-label="Loading content" aria-busy="true">
      <span class="v-skeleton" v-for="index in count" :key="index" :data-circle="isCircle"
        :style="index === count && count > 1 ? lastStyle : boxStyle"></span>
    </div>
  `
});
register("v-progress", {
  props: {
    value: { type: "number", default: 0 },
    max: { type: "number", default: 100 },
    tone: { type: "string", default: "primary" },
    size: { type: "string", default: "md" },
    label: TEXT,
    showValue: BOOL,
    indeterminate: BOOL
  },
  computed: {
    ...flags("showValue", "indeterminate"),
    percent() {
      const max = Number(this.max) || 100;
      const value = Number(this.value) || 0;
      const ratio = value / max * 100;
      return Math.min(100, Math.max(0, Math.round(ratio * 10) / 10));
    },
    barStyle() {
      return { width: `${this.percent}%` };
    },
    percentText() {
      return `${Math.round(this.percent)}%`;
    }
  },
  template: `
    <div class="v-progress" :data-tone="tone" :data-size="size" :data-indeterminate="isIndeterminate">
      <div class="v-progress-head" v-if="label || isShowValue">
        <span v-text="label"></span>
        <span class="v-progress-value" v-if="isShowValue" v-text="percentText"></span>
      </div>
      <div class="v-progress-track" role="progressbar" :aria-label="label || 'Progress'"
        :aria-valuenow="isIndeterminate ? null : percent" aria-valuemin="0" aria-valuemax="100">
        <div class="v-progress-bar" :style="barStyle"></div>
      </div>
    </div>
  `
});
register("v-divider", {
  props: {
    label: TEXT,
    vertical: BOOL,
    spacing: TEXT
  },
  computed: {
    ...flags("vertical"),
    spacingStyle() {
      if (!this.spacing) return {};
      return flag(this.vertical) ? { margin: `0 ${this.spacing}` } : { margin: `${this.spacing} 0` };
    }
  },
  template: `
    <div class="v-divider" role="separator" :data-vertical="isVertical" :data-label="!!label"
      :aria-orientation="isVertical ? 'vertical' : 'horizontal'" :style="spacingStyle">
      <span v-if="label" v-text="label"></span>
    </div>
  `
});
function parseColumns(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        const key2 = String(source.key ?? source.field ?? source.name ?? "");
        return {
          key: key2,
          label: String(source.label ?? source.title ?? titleCase(key2)),
          align: String(source.align ?? "left"),
          sortable: source.sortable === void 0 ? true : flag(source.sortable)
        };
      }
      const key = String(item);
      return { key, label: titleCase(key), align: "left", sortable: true };
    });
  }
  if (typeof raw !== "string") return [];
  return splitList(raw).map((spec) => {
    const parts = spec.split(":").map((part) => part.trim());
    const key = parts[0];
    return {
      key,
      label: parts[1] || titleCase(key),
      align: parts[2] || "left",
      sortable: parts[3] !== "fixed"
    };
  });
}
register("v-table", {
  inheritScope: true,
  props: {
    columns: { type: "any", default: "" },
    rows: { type: "any", default: "" },
    empty: { type: "string", default: "No records found" },
    sortable: { type: "any", default: true },
    dense: BOOL,
    striped: BOOL,
    hover: { type: "any", default: true },
    caption: TEXT
  },
  state() {
    return { sortKey: "", sortDir: "asc" };
  },
  computed: {
    ...flags("dense", "striped"),
    isSortable() {
      return this.sortable === true || flag(this.sortable);
    },
    isHover() {
      return this.hover === true || flag(this.hover);
    },
    cols() {
      return parseColumns(fromOuterScope(this, this.columns) ?? this.columns);
    },
    allRows() {
      const source = fromOuterScope(this, this.rows) ?? this.rows;
      return Array.isArray(source) ? source : [];
    },
    sorted() {
      const key = this.sortKey;
      if (!key || !this.isSortable) return this.allRows;
      const factor = this.sortDir === "desc" ? -1 : 1;
      return [...this.allRows].sort((a, b) => {
        const left = get(a, key);
        const right = get(b, key);
        if (left == null && right == null) return 0;
        if (left == null) return -factor;
        if (right == null) return factor;
        if (typeof left === "number" && typeof right === "number") {
          return (left - right) * factor;
        }
        return String(left).localeCompare(String(right), config.locale, { numeric: true }) * factor;
      });
    }
  },
  methods: {
    /**
     * A row may be an object keyed by column, or a positional array.
     *
     * Only the object form was ever read. The documentation's own example on
     * the components page passes `[['Ada', 'Engineer']]` against columns
     * `['Name', 'Role']`, and looking `'Name'` up on an array finds nothing, so
     * every cell rendered empty while the header row and the row count both
     * looked perfectly right — which is a hard failure to even notice, let
     * alone diagnose.
     *
     * The index comes from the template rather than `cols.indexOf(column)`,
     * because `cols` is a computed and identity is not guaranteed to survive a
     * recomputation.
     */
    cell(row, column, index) {
      const value = Array.isArray(row) && typeof index === "number" ? row[index] : get(row, column.key);
      if (value === null || value === void 0) return "";
      return String(value);
    },
    ariaSort(column) {
      if (!this.isSortable || !column.sortable) return null;
      if (this.sortKey !== column.key) return "none";
      return this.sortDir === "asc" ? "ascending" : "descending";
    },
    canSort(column) {
      return this.isSortable && column.sortable;
    },
    arrowFor(column) {
      if (this.sortKey !== column.key) return "chevron-down";
      return this.sortDir === "asc" ? "chevron-up" : "chevron-down";
    },
    toggleSort(column) {
      if (!this.canSort(column)) return;
      if (this.sortKey === column.key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = column.key;
        this.sortDir = "asc";
      }
      this.emit("sort", { key: this.sortKey, direction: this.sortDir });
    },
    alignStyle(column) {
      return { textAlign: column.align };
    }
  },
  template: `
    <div class="v-table-wrap">
      <table class="v-table" :data-dense="isDense" :data-striped="isStriped" :data-hover="isHover">
        <caption class="v-sr" v-if="caption" v-text="caption"></caption>
        <thead>
          <tr>
            <th v-for="column in cols" :key="column.key" :style="alignStyle(column)"
              scope="col" :aria-sort="ariaSort(column)">
              <button type="button" class="v-th" :data-sortable="canSort(column)"
                :aria-sort="ariaSort(column)" :disabled="!canSort(column)" v-click="toggleSort(column)">
                <span v-text="column.label"></span>
                <span class="v-th-arrow" v-if="canSort(column)" v-html="svgIcon(arrowFor(column))"></span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in sorted" :key="index">
            <td v-for="(column, ci) in cols" :key="column.key" :style="alignStyle(column)"
              v-text="cell(row, column, ci)"></td>
          </tr>
          <tr v-if="!sorted.length">
            <td class="v-table-empty" :colspan="cols.length || 1" v-text="empty"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
});
register("v-pagination", {
  props: {
    page: { type: "number", default: 1 },
    pages: { type: "number", default: 1 },
    total: { type: "number", default: 0 },
    perPage: { type: "number", default: 10 },
    siblings: { type: "number", default: 1 },
    previousLabel: { type: "string", default: "Previous" },
    nextLabel: { type: "string", default: "Next" },
    ariaLabel: { type: "string", default: "Pagination" }
  },
  computed: {
    lastPage() {
      const declared = Number(this.pages) || 0;
      if (declared > 0) return declared;
      const total = Number(this.total) || 0;
      const perPage = Number(this.perPage) || 10;
      return Math.max(1, Math.ceil(total / perPage));
    },
    currentPage() {
      const value = Number(this.page) || 1;
      return Math.min(Math.max(1, Math.round(value)), this.lastPage);
    },
    /** Visible page numbers, with `0` marking the ellipsis. */
    items() {
      const last = this.lastPage;
      const current = this.currentPage;
      const siblings = Math.max(0, Number(this.siblings) || 0);
      const window2 = siblings * 2 + 5;
      if (last <= window2) return Array.from({ length: last }, (_, i) => i + 1);
      const out = [1];
      const start2 = Math.max(2, current - siblings);
      const end = Math.min(last - 1, current + siblings);
      if (start2 > 2) out.push(0);
      for (let page = start2; page <= end; page++) out.push(page);
      if (end < last - 1) out.push(0);
      out.push(last);
      return out;
    }
  },
  methods: {
    go(page) {
      const target = Math.min(Math.max(1, page), this.lastPage);
      if (target === this.currentPage) return;
      this.page = target;
      notify(this.$el);
      this.emit("change", target);
    },
    isCurrent(page) {
      return page === this.currentPage ? "page" : null;
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.currentPage,
      set: (next) => {
        const value = Number(next);
        this.page = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
      }
    });
  },
  template: `
    <nav class="v-pagination" :aria-label="ariaLabel">
      <button type="button" class="v-page" :disabled="currentPage <= 1"
        :aria-label="previousLabel" v-click="go(currentPage - 1)" v-html="svgIcon('chevron-left')"></button>
      <template v-for="(item, index) in items" :key="index">
        <span class="v-page-gap" v-if="item === 0" aria-hidden="true">...</span>
        <button type="button" class="v-page" v-if="item !== 0" :aria-current="isCurrent(item)"
          :aria-label="'Page ' + item" v-click="go(item)" v-text="item"></button>
      </template>
      <button type="button" class="v-page" :disabled="currentPage >= lastPage"
        :aria-label="nextLabel" v-click="go(currentPage + 1)" v-html="svgIcon('chevron-right')"></button>
    </nav>
  `
});
function parseCrumbs(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        return {
          label: String(source.label ?? source.text ?? source.title ?? ""),
          href: String(source.href ?? source.url ?? source.to ?? "")
        };
      }
      return { label: String(item), href: "" };
    });
  }
  if (typeof raw !== "string") return [];
  return splitList(raw).map((spec) => {
    const separator = spec.indexOf(":");
    if (separator === -1) return { label: spec, href: "" };
    return { label: spec.slice(0, separator).trim(), href: spec.slice(separator + 1).trim() };
  });
}
register("v-breadcrumb", {
  inheritScope: true,
  props: {
    items: { type: "any", default: "" },
    separator: { type: "string", default: "/" },
    ariaLabel: { type: "string", default: "Breadcrumb" }
  },
  computed: {
    crumbs() {
      return parseCrumbs(fromOuterScope(this, this.items) ?? this.items);
    }
  },
  methods: {
    isLast(index) {
      return index === this.crumbs.length - 1;
    }
  },
  template: `
    <nav class="v-breadcrumb" :aria-label="ariaLabel">
      <ol class="v-breadcrumb-list">
        <li class="v-breadcrumb-item" v-for="(crumb, index) in crumbs" :key="index"
          :aria-current="isLast(index) ? 'page' : null">
          <a v-if="crumb.href && !isLast(index)" :href="crumb.href" v-text="crumb.label"></a>
          <span v-if="!crumb.href || isLast(index)" v-text="crumb.label"></span>
          <span class="v-breadcrumb-sep" v-if="!isLast(index)" aria-hidden="true" v-text="separator"></span>
        </li>
      </ol>
    </nav>
  `
});
register("v-stat", {
  props: {
    label: TEXT,
    value: TEXT,
    delta: { type: "any", default: "" },
    hint: TEXT,
    icon: TEXT,
    suffix: { type: "string", default: "%" },
    /** When `true`, a negative change counts as positive. */
    inverted: BOOL
  },
  computed: {
    ...flags("inverted"),
    deltaNumber() {
      if (this.delta === "" || this.delta === null || this.delta === void 0) return null;
      const value = Number(String(this.delta).replace(",", ".").replace("%", ""));
      return Number.isFinite(value) ? value : null;
    },
    hasDelta() {
      return this.deltaNumber !== null;
    },
    direction() {
      const value = this.deltaNumber;
      if (value === null || value === 0) return "flat";
      const positive = value > 0;
      const good = flag(this.inverted) ? !positive : positive;
      return good ? "up" : "down";
    },
    deltaIcon() {
      const value = this.deltaNumber;
      if (value === null || value === 0) return "minus";
      return value > 0 ? "arrow-up" : "arrow-down";
    },
    deltaText() {
      const value = this.deltaNumber;
      if (value === null) return "";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value}${this.suffix}`;
    }
  },
  template: `
    <div class="v-stat">
      <span class="v-stat-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <div class="v-stat-body">
        <div class="v-stat-label" v-text="label"></div>
        <div class="v-stat-value" v-text="value"></div>
        <div class="v-stat-row" v-if="hasDelta || hint">
          <span class="v-stat-delta" v-if="hasDelta" :data-dir="direction">
            <span v-html="svgIcon(deltaIcon)" aria-hidden="true"></span>
            <span v-text="deltaText"></span>
          </span>
          <span class="v-stat-hint" v-if="hint" v-text="hint"></span>
        </div>
        <div class="v-stat-row"><slot></slot></div>
      </div>
    </div>
  `
});
register("v-empty-state", {
  props: {
    icon: { type: "string", default: "inbox" },
    title: { type: "string", default: "Nothing here yet" },
    description: TEXT
  },
  template: `
    <div class="v-empty">
      <span class="v-empty-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <h3 class="v-empty-title" v-text="title"></h3>
      <p class="v-empty-desc" v-if="description" v-text="description"></p>
      <div class="v-empty-actions"><slot></slot></div>
    </div>
  `
});
function parseTimeline(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        return {
          title: String(source.title ?? source.label ?? ""),
          description: String(source.description ?? source.text ?? ""),
          time: String(source.time ?? source.date ?? ""),
          tone: String(source.tone ?? "primary")
        };
      }
      return { title: String(item), description: "", time: "", tone: "primary" };
    });
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const parts = entry.split("|").map((part) => part.trim());
    return {
      title: parts[0] ?? "",
      description: parts[1] ?? "",
      time: parts[2] ?? "",
      tone: parts[3] || "primary"
    };
  });
}
register("v-timeline", {
  inheritScope: true,
  props: {
    items: { type: "any", default: "" }
  },
  computed: {
    entries() {
      return parseTimeline(fromOuterScope(this, this.items) ?? this.items);
    }
  },
  template: `
    <ol class="v-timeline">
      <li class="v-timeline-item" v-for="(entry, index) in entries" :key="index" :data-tone="entry.tone">
        <span class="v-timeline-rail" aria-hidden="true"><span class="v-timeline-dot"></span></span>
        <div class="v-timeline-body">
          <div class="v-timeline-title" v-text="entry.title"></div>
          <p class="v-timeline-desc" v-if="entry.description" v-text="entry.description"></p>
          <time class="v-timeline-time" v-if="entry.time" v-text="entry.time"></time>
        </div>
      </li>
      <li class="v-timeline-item" v-if="!entries.length">
        <span class="v-timeline-rail" aria-hidden="true"><span class="v-timeline-dot"></span></span>
        <div class="v-timeline-body"><slot></slot></div>
      </li>
    </ol>
  `
});
register("v-steps", {
  inheritScope: true,
  props: {
    steps: { type: "any", default: "" },
    current: { type: "number", default: 0 },
    vertical: BOOL,
    ariaLabel: { type: "string", default: "Steps" }
  },
  computed: {
    ...flags("vertical"),
    list() {
      const source = fromOuterScope(this, this.steps) ?? this.steps;
      if (Array.isArray(source)) {
        return source.map(
          (item) => item != null && typeof item === "object" ? String(item.label ?? item.title ?? "") : String(item)
        );
      }
      return typeof source === "string" ? splitList(source) : [];
    },
    currentIndex() {
      const value = Number(this.current);
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    }
  },
  methods: {
    stateOf(index) {
      if (index < this.currentIndex) return "done";
      if (index === this.currentIndex) return "current";
      return "todo";
    }
  },
  template: `
    <ol class="v-steps" :data-vertical="isVertical" :aria-label="ariaLabel">
      <li class="v-step" v-for="(step, index) in list" :key="index" :data-state="stateOf(index)"
        :aria-current="index === currentIndex ? 'step' : null">
        <span class="v-step-line" aria-hidden="true"></span>
        <span class="v-step-mark" aria-hidden="true">
          <span v-if="stateOf(index) === 'done'" v-html="svgIcon('check')"></span>
          <span v-if="stateOf(index) !== 'done'" v-text="index + 1"></span>
        </span>
        <span class="v-step-text"><span class="v-step-label" v-text="step"></span></span>
      </li>
    </ol>
  `
});
register("v-rating", {
  props: {
    value: { type: "number", default: 0 },
    max: { type: "number", default: 5 },
    size: { type: "string", default: "md" },
    label: { type: "string", default: "Rating" },
    readonly: BOOL,
    disabled: BOOL,
    showValue: BOOL,
    allowClear: { type: "any", default: true }
  },
  state() {
    return { hovered: 0 };
  },
  computed: {
    ...flags("readonly", "disabled", "showValue"),
    locked() {
      return flag(this.readonly) || flag(this.disabled);
    },
    total() {
      const value = Number(this.max);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
    },
    score() {
      const value = Number(this.value);
      return Number.isFinite(value) ? Math.min(Math.max(0, value), this.total) : 0;
    },
    shown() {
      return this.hovered > 0 ? this.hovered : this.score;
    },
    valueText() {
      return `${this.score} of ${this.total}`;
    }
  },
  methods: {
    isOn(index) {
      return index <= this.shown;
    },
    pick(index) {
      if (this.locked) return;
      const clears = this.allowClear === true || flag(this.allowClear);
      const next = clears && this.score === index ? 0 : index;
      this.value = next;
      this.hovered = 0;
      notify(this.$el);
      this.emit("change", next);
    },
    preview(index) {
      if (this.locked) return;
      this.hovered = index;
    },
    reset() {
      this.hovered = 0;
    },
    onKey(event) {
      if (this.locked) return;
      const key = event.key;
      if (key === "ArrowRight" || key === "ArrowUp") {
        event.preventDefault();
        this.pick(Math.min(this.total, this.score + 1));
      } else if (key === "ArrowLeft" || key === "ArrowDown") {
        event.preventDefault();
        this.pick(Math.max(0, this.score - 1));
      } else if (key === "Home") {
        event.preventDefault();
        this.pick(1);
      } else if (key === "End") {
        event.preventDefault();
        this.pick(this.total);
      }
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.score,
      set: (next) => {
        const value = Number(next);
        this.value = Number.isFinite(value) ? value : 0;
      }
    });
  },
  template: `
    <div class="v-rating" :data-size="size" role="slider" :aria-label="label"
      aria-valuemin="0" :aria-valuemax="total" :aria-valuenow="score" :aria-valuetext="valueText"
      :tabindex="locked ? -1 : 0" :aria-readonly="locked" v-keydown="onKey" v-mouseleave="reset">
      <span class="v-rating-stars">
        <button type="button" class="v-star" v-for="index in total" :key="index"
          :data-on="isOn(index)" :disabled="locked" :aria-label="index + ' of ' + total"
          :tabindex="-1" v-click="pick(index)" v-mouseenter="preview(index)"
          v-html="svgIcon('star')"></button>
      </span>
      <span class="v-rating-value" v-if="isShowValue" v-text="valueText"></span>
    </div>
  `
});
register("v-tooltip-button", {
  props: {
    tooltip: TEXT,
    placement: { type: "string", default: "top" },
    variant: { type: "string", default: "ghost" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    type: { type: "string", default: "button" },
    disabled: BOOL,
    ariaLabel: TEXT
  },
  state() {
    return { tipId: uid("v-tip-") };
  },
  computed: {
    ...flags("disabled"),
    accessibleName() {
      return this.ariaLabel || null;
    }
  },
  template: `
    <span class="v-tipwrap">
      <button class="v-btn" :type="type" :data-variant="variant" :data-size="size"
        :disabled="isDisabled" :aria-describedby="tooltip ? tipId : null" :aria-label="accessibleName">
        <span class="v-btn-ic" v-if="icon" v-html="svgIcon(icon)"></span>
        <span class="v-btn-label"><slot></slot></span>
      </button>
      <span class="v-tip" v-if="tooltip" :id="tipId" role="tooltip"
        :data-placement="placement" v-text="tooltip"></span>
    </span>
  `
});
async function copyText(text) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const holder = document.createElement("textarea");
    holder.value = text;
    holder.setAttribute("readonly", "");
    holder.style.position = "fixed";
    holder.style.opacity = "0";
    document.body.appendChild(holder);
    holder.select();
    const ok = document.execCommand("copy");
    holder.remove();
    return ok;
  } catch {
    return false;
  }
}
register("v-code-block", {
  props: {
    code: TEXT,
    language: TEXT,
    filename: TEXT,
    copyLabel: { type: "string", default: "Copy" },
    copiedLabel: { type: "string", default: "Copied" },
    wrap: BOOL
  },
  state() {
    return { copied: false };
  },
  computed: {
    ...flags("wrap"),
    header() {
      return this.filename || this.language || "";
    },
    buttonLabel() {
      return this.copied ? this.copiedLabel : this.copyLabel;
    },
    buttonIcon() {
      return this.copied ? "check" : "copy";
    }
  },
  methods: {
    async copy() {
      const holder = this.$refs.code;
      const text = this.code || holder?.textContent || "";
      const ok = await copyText(String(text));
      if (!ok) return;
      this.copied = true;
      this.emit("copy", text);
      setTimeout(() => {
        this.copied = false;
      }, 1800);
    }
  },
  template: `
    <div class="v-code" :data-wrap="isWrap">
      <div class="v-code-head">
        <span class="v-code-name" v-text="header"></span>
        <button type="button" class="v-code-copy" :data-copied="copied"
          :aria-label="buttonLabel" v-click="copy">
          <span v-html="svgIcon(buttonIcon)" aria-hidden="true"></span>
          <span v-text="buttonLabel"></span>
        </button>
      </div>
      <pre class="v-code-pre"><code v-ref="code" :class="language ? 'language-' + language : null"
        v-text="code"><slot></slot></code></pre>
    </div>
  `
});

// src/devtools/xray.ts
var FLASH_CLASS = "v-xray-flash";
var MAX_LOG = 200;
var MAX_OUTLINES = 400;
var enabled = false;
var shortcutInstalled = false;
var refs = null;
var activeTab = "estado";
var theme2 = "auto";
var eventLog = [];
var networkLog = [];
var patchedEffects = /* @__PURE__ */ new Map();
var flashing = /* @__PURE__ */ new Set();
var flashTimers = /* @__PURE__ */ new Map();
var outlined = [];
var requestStarts = /* @__PURE__ */ new WeakMap();
var metrics = {
  effects: 0,
  mutations: 0,
  effectsPerSecond: 0,
  updatesPerSecond: 0,
  history: []
};
var disposers = [];
var refreshTimer = 0;
var metricsTimer = 0;
var scanTimer = 0;
var frameRequest = 0;
var hoverTarget = null;
var XRAY_CSS = `
.v-xray-root{
  all: initial;
  --vx-accent:#6D3BF5;
  --vx-accent-2:#FF3D8B;
  --vx-bg:#ffffff;
  --vx-bg-2:#F6F3FC;
  --vx-text:#14111F;
  --vx-muted:#6B6580;
  --vx-border:#E6E0F0;
  --vx-shadow:0 12px 40px rgba(20,17,31,.22);
  position:fixed;
  inset:0;
  z-index:2147483000;
  pointer-events:none;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1.45;
  color:var(--vx-text);
  -webkit-font-smoothing:antialiased;
}
@media (prefers-color-scheme: dark){
  .v-xray-root:not([data-v-xray-theme="light"]){
    --vx-bg:#1C1830;
    --vx-bg-2:#14111F;
    --vx-text:#F4F1FB;
    --vx-muted:#A9A2C4;
    --vx-border:#332C50;
    --vx-shadow:0 12px 40px rgba(0,0,0,.55);
  }
}
.v-xray-root[data-v-xray-theme="dark"]{
  --vx-bg:#1C1830;
  --vx-bg-2:#14111F;
  --vx-text:#F4F1FB;
  --vx-muted:#A9A2C4;
  --vx-border:#332C50;
  --vx-shadow:0 12px 40px rgba(0,0,0,.55);
}
.v-xray-root *,.v-xray-root *::before,.v-xray-root *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  outline:0;
  background:transparent;
  font:inherit;
  color:inherit;
  text-align:left;
  text-transform:none;
  letter-spacing:normal;
  list-style:none;
  text-decoration:none;
  min-width:0;
  float:none;
}
.v-xray-box{
  position:absolute;
  border:1px dashed rgba(109,59,245,.85);
  border-radius:4px;
  background:rgba(109,59,245,.06);
  pointer-events:none;
}
.v-xray-box[data-kind="component"]{
  border-color:rgba(46,217,165,.9);
  background:rgba(46,217,165,.07);
}
.v-xray-tag{
  position:absolute;
  top:-16px;
  left:-1px;
  max-width:280px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  padding:1px 5px;
  border-radius:4px;
  background:#6D3BF5;
  color:#fff;
  font-size:10px;
  font-weight:600;
}
.v-xray-box[data-kind="component"] .v-xray-tag{background:#159C77}
.v-xray-card{
  position:absolute;
  display:none;
  width:320px;
  max-height:60vh;
  overflow:auto;
  padding:10px 12px;
  border:1px solid var(--vx-border);
  border-radius:10px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:none;
}
.v-xray-card[data-open="1"]{display:block}
.v-xray-card-title{
  display:block;
  margin-bottom:6px;
  font-size:12px;
  font-weight:700;
  color:var(--vx-accent);
}
.v-xray-section{
  display:block;
  margin-top:8px;
  padding-top:6px;
  border-top:1px solid var(--vx-border);
  font-size:10px;
  font-weight:700;
  text-transform:uppercase;
  color:var(--vx-muted);
}
.v-xray-panel{
  position:absolute;
  right:16px;
  bottom:16px;
  display:flex;
  flex-direction:column;
  width:400px;
  max-width:calc(100vw - 32px);
  max-height:70vh;
  border:1px solid var(--vx-border);
  border-radius:12px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:auto;
  overflow:hidden;
}
.v-xray-header{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border-bottom:1px solid var(--vx-border);
  background:var(--vx-bg-2);
}
.v-xray-brand{
  flex:1;
  font-size:12px;
  font-weight:700;
  letter-spacing:.02em;
}
.v-xray-dot{
  display:inline-block;
  width:8px;
  height:8px;
  margin-right:6px;
  border-radius:50%;
  background:linear-gradient(135deg,#6D3BF5,#FF3D8B);
}
.v-xray-btn{
  padding:3px 8px;
  border:1px solid var(--vx-border);
  border-radius:6px;
  background:var(--vx-bg);
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-btn:hover{color:var(--vx-text);border-color:var(--vx-accent)}
.v-xray-tabs{
  display:flex;
  flex-wrap:wrap;
  gap:2px;
  padding:6px 8px;
  border-bottom:1px solid var(--vx-border);
}
.v-xray-tab{
  padding:3px 8px;
  border-radius:99px;
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-tab:hover{color:var(--vx-text)}
.v-xray-tab[data-active="1"]{
  background:var(--vx-accent);
  color:#fff;
  font-weight:600;
}
.v-xray-body{
  flex:1;
  overflow:auto;
  padding:8px 10px 12px;
}
.v-xray-status{
  padding:5px 10px;
  border-top:1px solid var(--vx-border);
  background:var(--vx-bg-2);
  color:var(--vx-muted);
  font-size:10px;
}
.v-xray-group{
  display:block;
  margin-bottom:8px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  overflow:hidden;
}
.v-xray-group-head{
  display:flex;
  align-items:center;
  gap:6px;
  padding:5px 8px;
  background:var(--vx-bg-2);
  font-size:11px;
  font-weight:600;
  cursor:pointer;
}
.v-xray-badge{
  padding:0 5px;
  border-radius:99px;
  background:var(--vx-accent);
  color:#fff;
  font-size:9px;
  font-weight:700;
}
.v-xray-badge[data-tone="alt"]{background:var(--vx-accent-2)}
.v-xray-badge[data-tone="mute"]{background:var(--vx-muted)}
.v-xray-rows{display:block;padding:4px 8px 6px}
.v-xray-row{
  display:flex;
  align-items:center;
  gap:6px;
  padding:2px 0;
}
.v-xray-key{
  flex:0 0 38%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:var(--vx-muted);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-val{
  flex:1;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-input{
  flex:1;
  padding:2px 5px;
  border:1px solid var(--vx-border);
  border-radius:5px;
  background:var(--vx-bg-2);
  color:var(--vx-text);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
  cursor:text;
}
.v-xray-input:focus{border-color:var(--vx-accent)}
.v-xray-input[data-error="1"]{border-color:#FF4D4D}
.v-xray-empty{
  display:block;
  padding:14px 4px;
  color:var(--vx-muted);
  text-align:center;
}
.v-xray-log{
  display:flex;
  gap:6px;
  padding:3px 4px;
  border-bottom:1px solid var(--vx-border);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;
}
.v-xray-log-time{flex:0 0 58px;color:var(--vx-muted)}
.v-xray-log-main{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-xray-ok{color:#159C77}
.v-xray-fail{color:#FF4D4D}
.v-xray-metric{
  display:flex;
  align-items:baseline;
  gap:8px;
  padding:4px 0;
}
.v-xray-metric-value{font-size:20px;font-weight:700;color:var(--vx-accent)}
.v-xray-chart{
  display:flex;
  align-items:flex-end;
  gap:2px;
  height:56px;
  margin-top:8px;
  padding:4px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  background:var(--vx-bg-2);
}
.v-xray-bar{
  flex:1;
  min-height:2px;
  border-radius:2px 2px 0 0;
  background:linear-gradient(180deg,#FF3D8B,#6D3BF5);
}
.v-xray-hint{display:block;margin-top:6px;color:var(--vx-muted);font-size:10px}
@keyframes v-xray-pulse{
  0%{box-shadow:0 0 0 2px rgba(255,61,139,.95),0 0 16px rgba(255,61,139,.5)}
  100%{box-shadow:0 0 0 2px rgba(255,61,139,0),0 0 0 rgba(255,61,139,0)}
}
.${FLASH_CLASS}{animation:v-xray-pulse .45s ease-out}
@media (prefers-reduced-motion: reduce){
  .${FLASH_CLASS}{animation:none;outline:2px solid rgba(255,61,139,.9)}
}
@media (max-width: 640px){
  .v-xray-panel{right:8px;left:8px;width:auto;max-height:60vh}
}
`;
function h(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== void 0) el.textContent = text;
  return el;
}
function isXrayNode(node) {
  if (!node || !refs) return false;
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!el && refs.root.contains(el);
}
function describeElement(el) {
  if (!el) return "(no element)";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}`;
}
function preview(value, max = 64) {
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  const type = typeof value;
  if (type === "function") return "function()";
  if (type === "string") return `"${truncate(value, max)}"`;
  if (type === "number" || type === "boolean") return String(value);
  if (type === "symbol") return String(value);
  if (typeof Element !== "undefined" && value instanceof Element) {
    return `<${value.tagName.toLowerCase()}>`;
  }
  try {
    return truncate(JSON.stringify(value) ?? String(value), max);
  } catch {
    return String(value);
  }
}
function editable(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}
function parseEdited(raw, previous) {
  if (typeof previous === "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
function timeLabel(at) {
  const date = new Date(at);
  const pad = (n2) => String(n2).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function collectEffects(scope, out) {
  for (const item of scope.effects) out.push(item);
  for (const child of scope.children) collectEffects(child, out);
}
function effectsOf(node) {
  const out = [];
  for (const scope of getEffectScopes(node)) collectEffects(scope, out);
  return out;
}
function countEffects(el) {
  let total = effectsOf(el).length;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) total += effectsOf(child).length;
  }
  return total;
}
function flash(el) {
  if (!el || !enabled || isXrayNode(el)) return;
  const previous = flashTimers.get(el);
  if (previous) window.clearTimeout(previous);
  flashing.add(el);
  el.classList.add(FLASH_CLASS);
  const timer = window.setTimeout(() => {
    el.classList.remove(FLASH_CLASS);
    flashTimers.delete(el);
    window.setTimeout(() => flashing.delete(el), 0);
  }, 460);
  flashTimers.set(el, timer);
}
function instrument(node, owner) {
  for (const item of effectsOf(node)) {
    if (patchedEffects.has(item)) continue;
    const original = item.fn;
    patchedEffects.set(item, original);
    item.fn = () => {
      metrics.effects++;
      flash(owner);
      return original();
    };
  }
}
function restoreEffects() {
  for (const [item, original] of patchedEffects) item.fn = original;
  patchedEffects.clear();
}
function scanDocument() {
  if (!enabled || typeof document === "undefined") return;
  for (const [item] of patchedEffects) {
    if (!item.active) patchedEffects.delete(item);
  }
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === 1) {
      const el = node;
      if (refs && refs.root.contains(el)) {
        node = skipSubtree(walker);
        continue;
      }
      instrument(el, el);
    } else if (node.nodeType === 3 && node.parentElement) {
      instrument(node, node.parentElement);
    }
    node = walker.nextNode();
  }
  refreshOutlines();
}
function skipSubtree(walker) {
  const current = walker.currentNode;
  let next = walker.nextSibling();
  if (next) return next;
  let parent = walker.parentNode();
  while (parent) {
    next = walker.nextSibling();
    if (next) return next;
    parent = walker.parentNode();
  }
  walker.currentNode = current;
  return null;
}
function inspectableElements() {
  const out = [];
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length && out.length < MAX_OUTLINES; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    if (!hadDirectives(el)) continue;
    out.push(el);
  }
  return out;
}
function directiveNames(el) {
  return collectDirectives(el).map(
    (attr) => attr.arg ? `${attr.name}:${attr.arg}` : attr.name
  );
}
function refreshOutlines() {
  if (!enabled || !refs) return;
  const overlay = refs.overlay;
  overlay.textContent = "";
  outlined.length = 0;
  for (const el of inspectableElements()) {
    const box = h("div", "v-xray-box");
    const isComponent = !!getScope(el)?.component;
    box.dataset.kind = isComponent ? "component" : "directive";
    const label = h("span", "v-xray-tag", directiveNames(el).join(" "));
    box.appendChild(label);
    overlay.appendChild(box);
    outlined.push({ el, box });
  }
  positionOutlines();
}
function positionOutlines() {
  if (!enabled) return;
  for (const item of outlined) {
    if (!item.el.isConnected) {
      item.box.style.display = "none";
      continue;
    }
    const rect = item.el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      item.box.style.display = "none";
      continue;
    }
    item.box.style.display = "block";
    item.box.style.left = `${rect.left}px`;
    item.box.style.top = `${rect.top}px`;
    item.box.style.width = `${rect.width}px`;
    item.box.style.height = `${rect.height}px`;
  }
}
function scheduleReposition() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = 0;
    positionOutlines();
  });
}
function visibleVariables(scope, limit = 40) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  let current = scope;
  while (current && out.length < limit) {
    let keys = [];
    try {
      keys = Object.keys(current.data);
    } catch {
      keys = [];
    }
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      let value;
      try {
        value = current.data[key];
      } catch {
        value = "(read error)";
      }
      out.push([key, value]);
      if (out.length >= limit) break;
    }
    current = current.parent;
  }
  return out;
}
function buildCard(el) {
  if (!refs) return;
  const card = refs.card;
  card.textContent = "";
  const scope = findScope(el);
  const owner = scope.owner?.component;
  card.appendChild(h("strong", "v-xray-card-title", describeElement(el)));
  card.appendChild(h("span", "v-xray-section", "Directives"));
  const names = collectDirectives(el);
  if (!names.length) {
    card.appendChild(h("div", "v-xray-val", "none"));
  } else {
    for (const attr of names) {
      const row = h("div", "v-xray-row");
      row.appendChild(h("span", "v-xray-key", attr.raw));
      row.appendChild(h("span", "v-xray-val", attr.expression || "(no value)"));
      card.appendChild(row);
    }
  }
  card.appendChild(h("span", "v-xray-section", "Component"));
  card.appendChild(
    h("div", "v-xray-val", owner ? `${owner.$name} in ${describeElement(owner.$el)}` : "none")
  );
  card.appendChild(h("span", "v-xray-section", "Scope"));
  const variables = visibleVariables(scope);
  if (!variables.length) {
    card.appendChild(h("div", "v-xray-val", "root scope empty"));
  } else {
    for (const [key, value] of variables) {
      const row = h("div", "v-xray-row");
      row.appendChild(h("span", "v-xray-key", key));
      row.appendChild(h("span", "v-xray-val", preview(value)));
      card.appendChild(row);
    }
  }
  card.appendChild(h("span", "v-xray-section", "Reactivity"));
  card.appendChild(
    h("div", "v-xray-val", `${countEffects(el)} effect(s) depend on this element`)
  );
}
function positionCard(x, y) {
  if (!refs) return;
  const card = refs.card;
  const width = 320;
  const height = Math.min(card.scrollHeight || 200, window.innerHeight * 0.6);
  const left = x + 16 + width > window.innerWidth ? Math.max(8, x - width - 16) : x + 16;
  const top = y + 16 + height > window.innerHeight ? Math.max(8, y - height - 16) : y + 16;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}
function onPointerMove(event) {
  if (!enabled || !refs) return;
  const target = event.target;
  if (!target || isXrayNode(target)) {
    refs.card.dataset.open = "0";
    hoverTarget = null;
    return;
  }
  let candidate = target;
  while (candidate && candidate !== document.body && !hadDirectives(candidate)) {
    candidate = candidate.parentElement;
  }
  if (!candidate || candidate === document.body) {
    refs.card.dataset.open = "0";
    hoverTarget = null;
    return;
  }
  if (candidate !== hoverTarget) {
    hoverTarget = candidate;
    buildCard(candidate);
  }
  refs.card.dataset.open = "1";
  positionCard(event.clientX, event.clientY);
}
function collectScopes() {
  const owners = /* @__PURE__ */ new Map();
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    const scope = getScope(el);
    if (scope) owners.set(el, scope);
  }
  const out = [];
  for (const [el, scope] of owners) {
    let depth = 0;
    let parent = el.parentElement;
    while (parent) {
      if (owners.has(parent)) depth++;
      parent = parent.parentElement;
    }
    out.push({ el, scope, depth });
  }
  return out;
}
function valueRow(key, value, commit) {
  const row = h("div", "v-xray-row");
  row.appendChild(h("span", "v-xray-key", key));
  if (typeof value === "function") {
    row.appendChild(h("span", "v-xray-val", "function()"));
    return row;
  }
  const input = h("input", "v-xray-input");
  input.type = "text";
  input.value = editable(value);
  input.spellcheck = false;
  input.addEventListener("change", () => {
    try {
      commit(parseEdited(input.value, value));
      input.dataset.error = "0";
    } catch {
      input.dataset.error = "1";
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
  });
  row.appendChild(input);
  return row;
}
function renderStateTab() {
  const frag = document.createDocumentFragment();
  const scopes = collectScopes();
  if (!scopes.length) {
    frag.appendChild(h("span", "v-xray-empty", "No scopes on the page. Use v-data or a component."));
    return frag;
  }
  for (const entry of scopes) {
    const group = h("div", "v-xray-group");
    group.style.marginLeft = `${Math.min(entry.depth, 4) * 8}px`;
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", entry.scope.component ? "component" : "scope"));
    head.appendChild(h("span", void 0, describeElement(entry.el)));
    head.addEventListener("click", () => highlight(entry.el));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    let keys = [];
    try {
      keys = Object.keys(entry.scope.data);
    } catch {
      keys = [];
    }
    if (!keys.length) {
      rows.appendChild(h("span", "v-xray-empty", "no variables"));
    } else {
      for (const key of keys) {
        let value;
        try {
          value = entry.scope.data[key];
        } catch {
          value = void 0;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            entry.scope.set(key, next);
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function renderComponentsTab() {
  const frag = document.createDocumentFragment();
  const list = [...instances];
  if (!list.length) {
    frag.appendChild(h("span", "v-xray-empty", "No components mounted."));
    return frag;
  }
  for (const instance of list) {
    const group = h("div", "v-xray-group");
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", instance.$name));
    head.appendChild(h("span", void 0, describeElement(instance.$el)));
    head.appendChild(
      h("span", "v-xray-badge", `${countEffects(instance.$el)} effects`)
    );
    head.lastChild.dataset.tone = "mute";
    head.addEventListener("click", () => highlight(instance.$el));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    const props = instance.$props ?? {};
    const propKeys = Object.keys(props);
    if (propKeys.length) {
      rows.appendChild(h("span", "v-xray-section", "Props"));
      for (const key of propKeys) {
        rows.appendChild(
          valueRow(key, props[key], (next) => {
            props[key] = next;
          })
        );
      }
    }
    const scope = instance.$scope;
    let stateKeys = [];
    try {
      stateKeys = Object.keys(scope.data).filter((key) => !propKeys.includes(key));
    } catch {
      stateKeys = [];
    }
    if (stateKeys.length) {
      rows.appendChild(h("span", "v-xray-section", "State"));
      for (const key of stateKeys) {
        let value;
        try {
          value = scope.data[key];
        } catch {
          value = void 0;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            scope.set(key, next);
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function renderStoresTab() {
  const frag = document.createDocumentFragment();
  const names = storeNames();
  if (!names.length) {
    frag.appendChild(h("span", "v-xray-empty", "No global stores. Create one with V.store()."));
    return frag;
  }
  for (const name of names) {
    const data = allStores[name];
    const group = h("div", "v-xray-group");
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", "store"));
    head.firstChild.dataset.tone = "alt";
    head.appendChild(h("span", void 0, name));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    const keys = data ? Object.keys(data) : [];
    if (!keys.length) {
      rows.appendChild(h("span", "v-xray-empty", "empty store"));
    } else {
      for (const key of keys) {
        rows.appendChild(
          valueRow(key, data[key], (next) => {
            data[key] = next;
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function logLine(time, main, tail, tone) {
  const row = h("div", "v-xray-log");
  row.appendChild(h("span", "v-xray-log-time", time));
  row.appendChild(h("span", "v-xray-log-main", main));
  if (tail !== void 0) {
    const badge = h("span", tone === "fail" ? "v-xray-fail" : tone === "ok" ? "v-xray-ok" : void 0, tail);
    row.appendChild(badge);
  }
  return row;
}
function renderEventsTab() {
  const frag = document.createDocumentFragment();
  const clear = h("button", "v-xray-btn", "clear log");
  clear.addEventListener("click", () => {
    eventLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);
  if (!eventLog.length) {
    frag.appendChild(h("span", "v-xray-empty", "No events yet. Interact with the page."));
    return frag;
  }
  for (const entry of [...eventLog].reverse()) {
    frag.appendChild(
      logLine(timeLabel(entry.at), `${entry.type} on ${entry.target}`, entry.detail || entry.source)
    );
  }
  return frag;
}
function renderNetworkTab() {
  const frag = document.createDocumentFragment();
  const clear = h("button", "v-xray-btn", "clear log");
  clear.addEventListener("click", () => {
    networkLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);
  if (!networkLog.length) {
    frag.appendChild(
      h("span", "v-xray-empty", "No requests yet. v-get, v-post and V.http show up here.")
    );
    return frag;
  }
  for (const entry of [...networkLog].reverse()) {
    frag.appendChild(
      logLine(
        timeLabel(entry.at),
        `${entry.method} ${entry.url}`,
        `${entry.status || "---"} ${Math.round(entry.duration)}ms`,
        entry.ok ? "ok" : "fail"
      )
    );
  }
  return frag;
}
function renderPerformanceTab() {
  const frag = document.createDocumentFragment();
  const updates = h("div", "v-xray-metric");
  updates.appendChild(h("span", "v-xray-metric-value", String(metrics.updatesPerSecond)));
  updates.appendChild(h("span", void 0, "DOM updates per second"));
  frag.appendChild(updates);
  const effects = h("div", "v-xray-metric");
  effects.appendChild(h("span", "v-xray-metric-value", String(metrics.effectsPerSecond)));
  effects.appendChild(h("span", void 0, "reactive effects triggered per second"));
  frag.appendChild(effects);
  const total = h("div", "v-xray-metric");
  total.appendChild(h("span", "v-xray-metric-value", String(metrics.effects)));
  total.appendChild(h("span", void 0, "effects triggered since x-ray was enabled"));
  frag.appendChild(total);
  const chart = h("div", "v-xray-chart");
  const peak = Math.max(1, ...metrics.history.map((item) => Math.max(item.effects, item.updates)));
  for (const item of metrics.history) {
    const bar = h("div", "v-xray-bar");
    const value = Math.max(item.effects, item.updates);
    bar.style.height = `${Math.max(2, Math.round(value / peak * 46))}px`;
    bar.title = `${item.effects} effects, ${item.updates} updates`;
    chart.appendChild(bar);
  }
  frag.appendChild(chart);
  frag.appendChild(
    h("span", "v-xray-hint", `${patchedEffects.size} effects instrumented, peak of ${peak} per second`)
  );
  return frag;
}
var TABS = [
  { id: "estado", label: "Estado" },
  { id: "componentes", label: "Componentes" },
  { id: "stores", label: "Stores" },
  { id: "eventos", label: "Eventos" },
  { id: "rede", label: "Rede" },
  { id: "desempenho", label: "Desempenho" }
];
function renderActiveTab() {
  if (!refs) return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && refs.body.contains(active)) return;
  refs.body.textContent = "";
  switch (activeTab) {
    case "estado":
      refs.body.appendChild(renderStateTab());
      break;
    case "componentes":
      refs.body.appendChild(renderComponentsTab());
      break;
    case "stores":
      refs.body.appendChild(renderStoresTab());
      break;
    case "eventos":
      refs.body.appendChild(renderEventsTab());
      break;
    case "rede":
      refs.body.appendChild(renderNetworkTab());
      break;
    case "desempenho":
      refs.body.appendChild(renderPerformanceTab());
      break;
  }
  for (const child of Array.from(refs.tabs.children)) {
    const tab = child;
    tab.dataset.active = tab.dataset.id === activeTab ? "1" : "0";
  }
  refs.status.textContent = `${outlined.length} elements with directives, ${instances.size} components, ${patchedEffects.size} effects observed`;
}
function highlight(el) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  flash(el);
}
function buildPanel() {
  const root = h("div", "v-xray-root");
  root.setAttribute(`${config.prefix}ignore`, "");
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Voodoo x-ray inspector");
  if (theme2 !== "auto") root.dataset.vXrayTheme = theme2;
  const overlay = h("div", "v-xray-overlay");
  root.appendChild(overlay);
  const card = h("div", "v-xray-card");
  card.dataset.open = "0";
  root.appendChild(card);
  const panel = h("div", "v-xray-panel");
  const header = h("div", "v-xray-header");
  const brand = h("div", "v-xray-brand");
  brand.appendChild(h("span", "v-xray-dot"));
  brand.appendChild(document.createTextNode("Voodoo x-ray"));
  header.appendChild(brand);
  const themeButton = h("button", "v-xray-btn", "theme");
  themeButton.addEventListener("click", () => {
    theme2 = theme2 === "auto" ? "dark" : theme2 === "dark" ? "light" : "auto";
    if (theme2 === "auto") delete root.dataset.vXrayTheme;
    else root.dataset.vXrayTheme = theme2;
  });
  header.appendChild(themeButton);
  const closeButton = h("button", "v-xray-btn", "close");
  closeButton.addEventListener("click", () => disableXray());
  header.appendChild(closeButton);
  panel.appendChild(header);
  const tabs = h("div", "v-xray-tabs");
  for (const tab of TABS) {
    const button = h("button", "v-xray-tab", tab.label);
    button.dataset.id = tab.id;
    button.dataset.active = tab.id === activeTab ? "1" : "0";
    button.addEventListener("click", () => {
      activeTab = tab.id;
      renderActiveTab();
    });
    tabs.appendChild(button);
  }
  panel.appendChild(tabs);
  const body = h("div", "v-xray-body");
  panel.appendChild(body);
  const status = h("div", "v-xray-status", "starting");
  panel.appendChild(status);
  root.appendChild(panel);
  document.body.appendChild(root);
  return { root, overlay, card, panel, tabs, body, status };
}
var BASE_EVENTS = [
  "click",
  "dblclick",
  "submit",
  "input",
  "change",
  "keydown",
  "keyup",
  "focus",
  "blur",
  "contextmenu",
  "drop",
  "paste"
];
function pushEvent(entry) {
  eventLog.push(entry);
  if (eventLog.length > MAX_LOG) eventLog.shift();
  if (activeTab === "eventos") renderActiveTab();
}
function pushNetwork(entry) {
  networkLog.push(entry);
  if (networkLog.length > MAX_LOG) networkLog.shift();
  if (activeTab === "rede") renderActiveTab();
}
function declaringElement(target, type) {
  let current = target;
  for (let depth = 0; current && depth < 6; depth++) {
    for (const attr of collectDirectives(current)) {
      if (attr.name === type) return current;
      if (attr.name === "on" && attr.arg === type) return current;
    }
    current = current.parentElement;
  }
  return null;
}
function declaredEventNames() {
  const names = new Set(BASE_EVENTS);
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    for (const attr of collectDirectives(el)) {
      if (attr.name === "on" && attr.arg) names.add(attr.arg);
    }
  }
  return [...names];
}
function listenEvents() {
  const handler = (event) => {
    if (!enabled) return;
    const target = event.target;
    if (!target || target.nodeType !== 1 || isXrayNode(target)) return;
    const owner = declaringElement(target, event.type);
    const custom = event.__voodoo === true;
    if (!owner && !custom) return;
    pushEvent({
      at: Date.now(),
      type: event.type,
      target: describeElement(owner ?? target),
      detail: custom ? "component emit" : "",
      source: custom ? "component" : "v-on"
    });
  };
  for (const name of declaredEventNames()) {
    document.addEventListener(name, handler, true);
    disposers.push(() => document.removeEventListener(name, handler, true));
  }
  disposers.push(
    devtoolsBus.on("event", (data) => {
      pushEvent({
        at: Date.now(),
        type: data.type,
        target: describeElement(data.el ?? null),
        detail: preview(data.detail),
        source: data.source ?? "bus"
      });
    })
  );
}
function listenNetwork() {
  disposers.push(
    http.interceptors.request.use((requestConfig) => {
      requestStarts.set(requestConfig, performance.now());
      return requestConfig;
    })
  );
  disposers.push(
    http.interceptors.response.use((response) => {
      const started = requestStarts.get(response.config) ?? performance.now();
      pushNetwork({
        at: Date.now(),
        method: (response.config.method ?? "GET").toUpperCase(),
        url: response.config.url,
        status: response.status,
        ok: response.ok,
        duration: performance.now() - started,
        source: "http"
      });
      return response;
    })
  );
  disposers.push(
    http.interceptors.error.use((error) => {
      const requestConfig = error.config;
      const started = requestConfig ? requestStarts.get(requestConfig) ?? performance.now() : performance.now();
      pushNetwork({
        at: Date.now(),
        method: (requestConfig?.method ?? "GET").toUpperCase(),
        url: requestConfig?.url ?? "(unknown)",
        status: error.status,
        ok: false,
        duration: performance.now() - started,
        source: "http"
      });
      return error;
    })
  );
  disposers.push(
    devtoolsBus.on("network", (data) => {
      pushNetwork({
        at: Date.now(),
        method: (data.method ?? "GET").toUpperCase(),
        url: data.url,
        status: data.status ?? 0,
        ok: data.ok ?? !data.error,
        duration: data.duration ?? 0,
        source: data.source ?? "bus"
      });
    })
  );
}
var observer = null;
function observeMutations() {
  observer = new MutationObserver((records) => {
    let structural = false;
    for (const record of records) {
      const target = record.target;
      if (isXrayNode(target)) continue;
      if (record.type === "attributes" && record.attributeName === "class" && target.nodeType === 1 && flashing.has(target)) {
        continue;
      }
      metrics.mutations++;
      if (record.type === "childList" && record.addedNodes.length) structural = true;
    }
    if (structural && !scanTimer) {
      scanTimer = window.setTimeout(() => {
        scanTimer = 0;
        scanDocument();
      }, 250);
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
}
function startTimers() {
  metricsTimer = window.setInterval(() => {
    metrics.effectsPerSecond = metrics.effects - lastEffectCount;
    metrics.updatesPerSecond = metrics.mutations - lastMutationCount;
    lastEffectCount = metrics.effects;
    lastMutationCount = metrics.mutations;
    metrics.history.push({
      effects: metrics.effectsPerSecond,
      updates: metrics.updatesPerSecond
    });
    if (metrics.history.length > 40) metrics.history.shift();
    if (activeTab === "desempenho") renderActiveTab();
  }, 1e3);
  refreshTimer = window.setInterval(() => {
    positionOutlines();
    if (activeTab === "estado" || activeTab === "componentes" || activeTab === "stores") {
      renderActiveTab();
    }
  }, 700);
}
var lastEffectCount = 0;
var lastMutationCount = 0;
function enableXray() {
  if (enabled || typeof document === "undefined" || !document.body) return;
  enabled = true;
  ensureTokens();
  injectStyle("xray", XRAY_CSS);
  refs = buildPanel();
  activeTab = activeTab || "estado";
  metrics.effects = 0;
  metrics.mutations = 0;
  lastEffectCount = 0;
  lastMutationCount = 0;
  metrics.history.length = 0;
  scanDocument();
  listenEvents();
  listenNetwork();
  observeMutations();
  startTimers();
  const onScroll = () => scheduleReposition();
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
  document.addEventListener("mousemove", onPointerMove, true);
  disposers.push(() => window.removeEventListener("scroll", onScroll, true));
  disposers.push(() => window.removeEventListener("resize", onScroll));
  disposers.push(() => document.removeEventListener("mousemove", onPointerMove, true));
  renderActiveTab();
}
function disableXray() {
  if (!enabled) return;
  enabled = false;
  for (const dispose of disposers.splice(0)) {
    try {
      dispose();
    } catch {
    }
  }
  observer?.disconnect();
  observer = null;
  if (metricsTimer) window.clearInterval(metricsTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (scanTimer) window.clearTimeout(scanTimer);
  if (frameRequest) cancelAnimationFrame(frameRequest);
  metricsTimer = refreshTimer = scanTimer = frameRequest = 0;
  for (const [el, timer] of flashTimers) {
    window.clearTimeout(timer);
    el.classList.remove(FLASH_CLASS);
  }
  flashTimers.clear();
  flashing.clear();
  restoreEffects();
  outlined.length = 0;
  hoverTarget = null;
  refs?.root.remove();
  refs = null;
}
function isXrayEnabled() {
  return enabled;
}
function parseShortcut(text) {
  const parts = text.toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const key = parts.pop();
  const shortcut = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    code: /^f\d{1,2}$/.test(key) ? key.toUpperCase() : key.length === 1 && key >= "a" && key <= "z" ? `Key${key.toUpperCase()}` : key.length === 1 && key >= "0" && key <= "9" ? `Digit${key}` : key.charAt(0).toUpperCase() + key.slice(1)
  };
  for (const part of parts) {
    if (part === "ctrl" || part === "control") shortcut.ctrl = true;
    else if (part === "alt" || part === "option") shortcut.alt = true;
    else if (part === "shift") shortcut.shift = true;
    else if (part === "meta" || part === "cmd" || part === "command" || part === "win")
      shortcut.meta = true;
    else return null;
  }
  return shortcut;
}
function enableXrayShortcut() {
  if (shortcutInstalled || typeof document === "undefined") return;
  shortcutInstalled = true;
  document.addEventListener("keydown", (event) => {
    const setting = config.xrayShortcut;
    if (setting === false) return;
    const wanted = parseShortcut(typeof setting === "string" ? setting : "ctrl+shift+f2");
    if (!wanted) return;
    if (event.ctrlKey !== wanted.ctrl || event.altKey !== wanted.alt || event.shiftKey !== wanted.shift || event.metaKey !== wanted.meta)
      return;
    if (event.code !== wanted.code && event.key.toUpperCase() !== wanted.code.replace(/^Key/, ""))
      return;
    event.preventDefault();
    xray();
  });
}
function xray(force) {
  enableXrayShortcut();
  const next = force ?? !enabled;
  if (next) enableXray();
  else disableXray();
  return enabled;
}

// src/jsx/index.ts
var OPAQUE = /* @__PURE__ */ new Set([
  "SCRIPT",
  "STYLE",
  "PRE",
  "CODE",
  "SAMP",
  "KBD",
  "TEXTAREA",
  "TEMPLATE",
  "NOSCRIPT"
]);
magic("$__jsx", (scope) => scope);
onStart((root, after) => {
  if (after) activateJsx();
  else extractJsx(root);
});
var TEMPLATE = /* @__PURE__ */ Symbol("voodoo.jsx.template");
function isTemplate(value) {
  return typeof value === "object" && value !== null && TEMPLATE in value;
}
function collect(start2, offset) {
  const templates = [];
  const nodes = [];
  let source = "";
  let depth = 0;
  let quote = null;
  let escaped = false;
  let node = start2;
  let index = offset;
  let closed = false;
  let tail = null;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      for (; index < text.length; index++) {
        const ch = text[index];
        if (escaped) {
          escaped = false;
          source += ch;
          continue;
        }
        if (quote) {
          if (ch === "\\") escaped = true;
          else if (ch === quote) quote = null;
          source += ch;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          quote = ch;
          source += ch;
          continue;
        }
        if (ch === "{") {
          depth++;
          if (depth > 1) source += ch;
          continue;
        }
        if (ch === "}") {
          depth--;
          if (depth === 0) {
            index++;
            closed = true;
            break;
          }
          source += ch;
          continue;
        }
        source += ch;
      }
      nodes.push(node);
      if (closed) {
        tail = { node, offset: index };
        break;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (depth === 0) return null;
      source += `$t(${templates.length}, $__jsx)`;
      templates.push(node);
      nodes.push(node);
    } else {
      nodes.push(node);
    }
    index = 0;
    node = node.nextSibling;
  }
  if (!closed) return null;
  return { source, templates, nodes, tail };
}
function recoverFromTable(collected) {
  const empties = collected.source.match(/\(\s*\)/g);
  if (!empties) return false;
  const first = collected.nodes[0];
  const last = collected.nodes[collected.nodes.length - 1];
  const table = [last?.nextSibling, first?.previousSibling].map((from) => {
    let node = from ?? null;
    while (node && node.nodeType === Node.TEXT_NODE && !(node.textContent ?? "").trim()) {
      node = node === last?.nextSibling ? node.nextSibling : node.previousSibling;
    }
    return node && node.nodeType === Node.ELEMENT_NODE ? node : null;
  }).find((el) => el?.tagName === "TABLE");
  if (!table) return false;
  const body = table.querySelector("tbody");
  if (!body) return false;
  const rows = Array.from(body.children).filter((el) => el.tagName === "TR");
  if (rows.length !== empties.length) return false;
  let index = 0;
  collected.source = collected.source.replace(/\(\s*\)/g, () => `($t(${index++}, $__jsx))`);
  collected.templates = rows;
  collected.host = body;
  collected.nodes.push(...rows);
  return true;
}
function render(value, templates, scope, out) {
  if (value == null || value === false || value === true) return;
  if (Array.isArray(value)) {
    for (const item of value) render(item, templates, scope, out);
    return;
  }
  if (isTemplate(value)) {
    const handle = value;
    const source = templates[handle.index];
    const clone2 = source.cloneNode(true);
    const at = handle.scope ?? scope;
    applyRegions(clone2, at);
    activateJsx();
    walk(clone2, at);
    out.push(clone2);
    return;
  }
  out.push(document.createTextNode(String(value)));
}
function applyRegions(root, parentScope) {
  if (OPAQUE.has(root.tagName)) return;
  const scope = parentScope ?? findScope(root);
  let child = root.firstChild;
  while (child) {
    const next = child.nextSibling;
    if (child.nodeType === Node.ELEMENT_NODE) {
      applyRegions(child, getScope(child) ?? scope);
      child = next;
      continue;
    }
    if (child.nodeType !== Node.TEXT_NODE) {
      child = next;
      continue;
    }
    const text = child.textContent ?? "";
    const open = text.indexOf("{");
    if (open < 0) {
      child = next;
      continue;
    }
    const collected = collect(child, open);
    if (!collected) {
      child = next;
      continue;
    }
    if (collected.templates.length === 0 && !recoverFromTable(collected)) {
      child = next;
      continue;
    }
    install(root, collected, scope);
    child = collected.nodes[collected.nodes.length - 1]?.nextSibling;
  }
}
var pending = [];
function install(parent, collected, hint) {
  const { source, templates, nodes, tail } = collected;
  let ast;
  try {
    ast = parse(source);
  } catch (error) {
    if (config.devtools) {
      console.warn(`[Voodoo] could not parse the inline expression: ${source}`, error);
    }
    return;
  }
  if (tail && tail.offset < (tail.node.textContent ?? "").length) {
    tail.node.splitText(tail.offset);
  }
  const target = collected.host ?? parent;
  const anchor = document.createComment("v-jsx");
  target.insertBefore(anchor, collected.host ? collected.host.firstChild : nodes[0]);
  for (const node of nodes) node.remove();
  let rendered = [];
  pending.push(() => activateRegion());
  function activateRegion() {
    const found = findScope(anchor);
    const scope = found === rootScope && hint ? hint : found;
    const local = scope.child({
      $t: (index, at) => ({ [TEMPLATE]: true, index, scope: at })
    });
    const runner = effect(() => {
      const value = unwrap(evaluate(ast, local));
      const out = [];
      render(value, templates, local, out);
      for (const node of rendered) node.remove();
      rendered = out;
      for (const node of out) target.insertBefore(node, anchor);
    });
    addCleanup(anchor, () => {
      runner.effect.stop();
      for (const node of rendered) node.remove();
    });
  }
}
function readDeclarationBlock(root = document.body) {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const raw = node.textContent ?? "";
    const open = raw.indexOf("{");
    if (open < 0) continue;
    const end = matchBrace(raw, open);
    if (end < 0) continue;
    const group = raw.slice(open, end + 1);
    if (!/\b(?:const|let|var)\s/.test(group)) continue;
    const body = group.slice(1, -1).replace(/\b(?:const|let|var)\s+/g, "");
    const data = reactive({});
    try {
      evaluate(parse(body), new Scope(data));
    } catch (error) {
      if (config.devtools) {
        console.warn("[Voodoo] could not read the declaration block", error);
      }
      return null;
    }
    node.textContent = raw.slice(0, open) + raw.slice(end + 1);
    return data;
  }
  return null;
}
function matchBrace(text, from) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return -1;
}
function activateJsx() {
  const work = pending.splice(0, pending.length);
  for (const run of work) {
    try {
      run();
    } catch (error) {
      console.error("[Voodoo] a JSX region failed to render", error);
    }
  }
}
function extractJsx(root = document.body) {
  const data = readDeclarationBlock(root);
  if (data) {
    Object.assign(rootScope.data, data);
  }
  applyRegions(root, findScope(root));
}
function jsx(root = document.body) {
  extractJsx(root);
  activateJsx();
}

// src/devtools/launcher.ts
var POSITION_KEY = "voodoo:devtools:widget-position";
var HIDDEN_KEY = "voodoo:devtools:widget-hidden";
var DRAG_THRESHOLD = 4;
var refs2 = null;
var mounted = false;
var counterTimer = 0;
var pulseTimer = 0;
var teardown = [];
var WIDGET_CSS = `
.v-devtools-widget{
  all: initial;
  --vw-accent:#6D3BF5;
  --vw-accent-2:#FF3D8B;
  --vw-bg:#ffffff;
  --vw-text:#14111F;
  --vw-muted:#6B6580;
  --vw-border:#E6E0F0;
  --vw-shadow:0 8px 28px rgba(20,17,31,.24);
  position:fixed;
  z-index:2147482900;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1;
  color:var(--vw-text);
  -webkit-font-smoothing:antialiased;
  touch-action:none;
}
@media (prefers-color-scheme: dark){
  .v-devtools-widget:not([data-theme="light"]){
    --vw-bg:#1C1830;
    --vw-text:#F4F1FB;
    --vw-muted:#A9A2C4;
    --vw-border:#332C50;
    --vw-shadow:0 8px 28px rgba(0,0,0,.55);
  }
}
.v-devtools-widget[data-theme="dark"]{
  --vw-bg:#1C1830;
  --vw-text:#F4F1FB;
  --vw-muted:#A9A2C4;
  --vw-border:#332C50;
  --vw-shadow:0 8px 28px rgba(0,0,0,.55);
}
.v-devtools-widget *,.v-devtools-widget *::before,.v-devtools-widget *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  background:transparent;
  font:inherit;
  color:inherit;
  list-style:none;
  text-decoration:none;
}
.v-devtools-btn{
  display:flex;
  align-items:center;
  gap:8px;
  height:38px;
  padding:0 12px 0 10px;
  border:1px solid var(--vw-border);
  border-radius:999px;
  background:var(--vw-bg);
  box-shadow:var(--vw-shadow);
  cursor:grab;
  user-select:none;
  transition:transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s;
}
.v-devtools-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 12px 34px rgba(109,59,245,.3);
}
.v-devtools-btn:active{cursor:grabbing}
.v-devtools-btn:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:2px;
}
.v-devtools-widget[data-active="true"] .v-devtools-btn{
  border-color:var(--vw-accent);
  box-shadow:0 0 0 3px rgba(109,59,245,.22), var(--vw-shadow);
}
.v-devtools-mark{
  flex:0 0 auto;
  width:20px;
  height:20px;
  display:block;
}
.v-devtools-label{
  font-weight:600;
  letter-spacing:.2px;
  white-space:nowrap;
}
.v-devtools-count{
  padding:2px 6px;
  border-radius:999px;
  background:rgba(109,59,245,.12);
  color:var(--vw-accent);
  font-variant-numeric:tabular-nums;
  font-weight:600;
  white-space:nowrap;
}
.v-devtools-pulse{
  flex:0 0 auto;
  width:7px;
  height:7px;
  border-radius:50%;
  background:var(--vw-border);
  transition:background .2s, box-shadow .2s;
}
.v-devtools-pulse[data-on="true"]{
  background:var(--vw-accent-2);
  box-shadow:0 0 0 4px rgba(255,61,139,.18);
}
.v-devtools-close{
  position:absolute;
  top:-7px;
  right:-7px;
  width:18px;
  height:18px;
  border-radius:50%;
  border:1px solid var(--vw-border);
  background:var(--vw-bg);
  color:var(--vw-muted);
  font-size:11px;
  line-height:1;
  cursor:pointer;
  opacity:0;
  transition:opacity .15s;
}
.v-devtools-widget:hover .v-devtools-close,
.v-devtools-close:focus-visible{opacity:1}
.v-devtools-close:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:1px;
}
@media (prefers-reduced-motion: reduce){
  .v-devtools-btn,.v-devtools-pulse,.v-devtools-close{transition:none}
  .v-devtools-btn:hover{transform:none}
}
`;
var MARK = `<svg class="v-devtools-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M4 4l8 16 8-16" stroke="#6D3BF5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="7.5" r="2" fill="#FF3D8B"/>
</svg>`;
function readPosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.x !== "number" || typeof value?.y !== "number") return null;
    return value;
  } catch {
    return null;
  }
}
function writePosition(pos) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
  }
}
function applyPosition(root, pos) {
  const width = root.offsetWidth || 120;
  const height = root.offsetHeight || 38;
  const x = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - width - 8));
  const y = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - height - 8));
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  root.style.right = "auto";
  root.style.bottom = "auto";
}
function build() {
  const root = document.createElement("div");
  root.className = "v-devtools-widget";
  root.setAttribute("data-voodoo-devtools", "widget");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v-devtools-btn";
  button.setAttribute("aria-label", "Open Voodoo devtools (Ctrl+Shift+F2)");
  button.setAttribute("aria-pressed", "false");
  button.title = "Voodoo devtools \u2014 click to inspect, drag to move (Ctrl+Shift+F2)";
  button.innerHTML = MARK;
  const label = document.createElement("span");
  label.className = "v-devtools-label";
  label.textContent = "Voodoo";
  const counter = document.createElement("span");
  counter.className = "v-devtools-count";
  counter.textContent = "0";
  const pulse = document.createElement("span");
  pulse.className = "v-devtools-pulse";
  pulse.setAttribute("data-on", "false");
  button.append(label, counter, pulse);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "v-devtools-close";
  close.setAttribute("aria-label", "Hide the devtools widget in this tab");
  close.title = "Hide in this tab";
  close.textContent = "\xD7";
  root.append(button, close);
  document.body.appendChild(root);
  const saved = readPosition();
  if (saved) {
    applyPosition(root, saved);
  } else {
    root.style.right = "16px";
    root.style.bottom = "16px";
  }
  return { root, button, pulse, counter, close };
}
function enableDrag(refs3, onClick) {
  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    const box = refs3.root.getBoundingClientRect();
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    offsetX = event.clientX - box.left;
    offsetY = event.clientY - box.top;
    refs3.button.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove2 = (event) => {
    if (!dragging) return;
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (!moved && distance < DRAG_THRESHOLD) return;
    moved = true;
    event.preventDefault();
    applyPosition(refs3.root, { x: event.clientX - offsetX, y: event.clientY - offsetY });
  };
  const onPointerUp = (event) => {
    if (!dragging) return;
    dragging = false;
    refs3.button.releasePointerCapture?.(event.pointerId);
    if (!moved) {
      onClick();
      return;
    }
    const box = refs3.root.getBoundingClientRect();
    writePosition({ x: box.left, y: box.top });
  };
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  };
  const onResize = () => {
    const box = refs3.root.getBoundingClientRect();
    if (refs3.root.style.left) applyPosition(refs3.root, { x: box.left, y: box.top });
  };
  refs3.button.addEventListener("pointerdown", onPointerDown);
  refs3.button.addEventListener("pointermove", onPointerMove2);
  refs3.button.addEventListener("pointerup", onPointerUp);
  refs3.button.addEventListener("pointercancel", onPointerUp);
  refs3.button.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);
  return () => {
    refs3.button.removeEventListener("pointerdown", onPointerDown);
    refs3.button.removeEventListener("pointermove", onPointerMove2);
    refs3.button.removeEventListener("pointerup", onPointerUp);
    refs3.button.removeEventListener("pointercancel", onPointerUp);
    refs3.button.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
  };
}
function blink() {
  if (!refs2) return;
  refs2.pulse.setAttribute("data-on", "true");
  window.clearTimeout(pulseTimer);
  pulseTimer = window.setTimeout(() => {
    refs2?.pulse.setAttribute("data-on", "false");
  }, 320);
}
function updateCounter() {
  if (!refs2) return;
  const total = instances.size;
  const text = total === 1 ? "1 component" : `${total} components`;
  if (refs2.counter.textContent !== text) refs2.counter.textContent = text;
}
function mountDevtoolsWidget() {
  if (mounted || typeof document === "undefined" || !document.body) return;
  try {
    if (sessionStorage.getItem(HIDDEN_KEY) === "1") return;
  } catch {
  }
  mounted = true;
  injectStyle("devtools-widget", WIDGET_CSS);
  refs2 = build();
  const toggle = () => {
    const enabled2 = xray();
    refs2?.root.setAttribute("data-active", String(enabled2));
    refs2?.button.setAttribute("aria-pressed", String(enabled2));
  };
  teardown.push(enableDrag(refs2, toggle));
  const onClose = (event) => {
    event.stopPropagation();
    try {
      sessionStorage.setItem(HIDDEN_KEY, "1");
    } catch {
    }
    unmountDevtoolsWidget();
    console.info("[Voodoo] devtools widget hidden. Use V.devtoolsWidget(true) to bring back.");
  };
  refs2.close.addEventListener("click", onClose);
  teardown.push(() => refs2?.close.removeEventListener("click", onClose));
  const onGlobalKeyUp = () => {
    const enabled2 = isXrayEnabled();
    refs2?.root.setAttribute("data-active", String(enabled2));
    refs2?.button.setAttribute("aria-pressed", String(enabled2));
  };
  document.addEventListener("keyup", onGlobalKeyUp);
  teardown.push(() => document.removeEventListener("keyup", onGlobalKeyUp));
  for (const type of ["network", "event", "navigation", "update"]) {
    teardown.push(devtoolsBus.on(type, blink));
  }
  updateCounter();
  counterTimer = window.setInterval(updateCounter, 1e3);
}
function unmountDevtoolsWidget() {
  if (!mounted) return;
  mounted = false;
  for (const fn of teardown.splice(0)) {
    try {
      fn();
    } catch {
    }
  }
  window.clearInterval(counterTimer);
  window.clearTimeout(pulseTimer);
  counterTimer = 0;
  pulseTimer = 0;
  refs2?.root.remove();
  refs2 = null;
}
function isDevtoolsWidgetMounted() {
  return mounted;
}
function devtoolsWidget(force) {
  const target = force ?? !mounted;
  if (target) {
    try {
      sessionStorage.removeItem(HIDDEN_KEY);
    } catch {
    }
    mountDevtoolsWidget();
  } else {
    unmountDevtoolsWidget();
  }
  return mounted;
}

// src/index.ts
var V = ((input, context) => query(input, context));
function withWarning(alias, canonical, fn) {
  return ((...args) => {
    warnAlias(alias, canonical);
    return fn(...args);
  });
}
Object.assign(V, core, {
  // Chainable DOM
  query,
  ready: ready2,
  fromHtml,
  jsx,
  extractJsx,
  activateJsx,
  Collection: VoodooCollection,
  // Routes
  router,
  route,
  navigate,
  resolveRoute: resolve,
  // Languages
  i18n,
  t,
  setLocale,
  getLocale,
  // Dialogs
  modal,
  alert,
  confirm,
  prompt,
  dialog,
  // Forms
  validator,
  validate,
  // Old alias. The official name is `V.validate`.
  validateForm: withWarning("V.validateForm", "V.validate", validate),
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
  mask,
  masks,
  applyMask,
  unmask,
  registerMask,
  // Animation
  animate,
  spring,
  stagger,
  inView,
  scrollProgress,
  motion: motionPresets,
  easings,
  // Charts
  // Old alias. The official name is `V.renderChart`.
  chart: withWarning("V.chart", "V.renderChart", renderChart),
  renderChart,
  charts,
  chartColors: CHART_COLORS,
  // Interface
  palette,
  hotkey,
  sound,
  // Inspection tools
  xray,
  enableXrayShortcut,
  devtoolsWidget,
  devtools: devtoolsBus,
  magic
});
var src_default = V;

export { V, activateJsx, animate, applyRegions, charts, src_default as default, devtoolsWidget, disableXray, easings, enableXray, extractJsx, getLocale, i18n, inView, isDevtoolsWidgetMounted, isXrayEnabled, jsx, motionPresets, mountDevtoolsWidget, navigate, readDeclarationBlock, renderChart, route, router, scrollProgress, setLocale, spring, stagger, t, unmountDevtoolsWidget, xray };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map