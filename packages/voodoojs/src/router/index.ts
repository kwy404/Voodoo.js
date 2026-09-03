/**
 * @module router
 *
 * Single-page application router with no external dependencies.
 *
 * Two modes: `history`, which uses the History API and clean URLs, and `hash`, which
 * stores the route after `#` and works even when opening the file directly from disk.
 *
 * ```js
 * V.router({
 *   mode: 'history',
 *   base: '/',
 *   routes: {
 *     '/': { component: 'home', title: 'Inicio' },
 *     '/usuarios': { component: 'users' },
 *     '/usuarios/:id': { component: 'user-detail' },
 *     '/posts/:slug?': { view: '/partials/post.html' },
 *     '*': { component: 'not-found' }
 *   },
 *   beforeEach(to, from) { return true },
 *   afterEach(to, from) {}
 * })
 * ```
 *
 * ```html
 * <nav>
 *   <a v-link href="/">Inicio</a>
 *   <a v-link href="/usuarios">Usuarios</a>
 * </nav>
 * <main v-router-view>Carregando...</main>
 * ```
 */

import { handleError, reactive, queuePostFlush, warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { magic } from '../runtime/scope';
import type { Scope } from '../runtime/scope';
import { destroy, markSkipChildren, walk } from '../runtime/walker';
import { viewTransition } from '../dom/transition';
import { http } from '../http';
import { devtoolsBus } from '../devtools/bus';
import { uid } from '../utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Definition of a route, associated with a pattern like `/usuarios/:id`. */
export interface RouteRecord {
  /** Name of the registered component that will be mounted inside `v-router-view`. */
  component?: string;
  /** URL of remote HTML loaded and inserted in place of the component. */
  view?: string;
  /** Title applied to `document.title` when entering the route. */
  title?: string;
  /** Route name, useful for `$route.name` and for navigation by name. */
  name?: string;
  /** Free-form data of the route, available in `$route.meta`. */
  meta?: Record<string, unknown>;
  /** Redirects to another path as soon as the route matches. */
  redirect?: string;
  /** Guard exclusive to this route, executed before the global `beforeEach`. */
  beforeEnter?: NavigationGuard;
}

/** Current route state. It is the object exposed by `$route`. */
export interface RouteLocation {
  /** Path without query and without hash, always starting with a slash. */
  path: string;
  /** Full path, with query and hash. */
  fullPath: string;
  /** Parameters extracted from the pattern, like `{ id: '42' }`. */
  params: Record<string, string>;
  /** Query string already converted to an object. */
  query: Record<string, string>;
  /** URL anchor, without the `#`. */
  hash: string;
  /** Name declared in the matched route. */
  name: string;
  /** Metadata declared in the matched route. */
  meta: Record<string, unknown>;
  /** Pattern that matched, like `/usuarios/:id`. `null` when nothing matched. */
  matched: string | null;
}

/**
 * Navigation guard. Return `false` to cancel, a string to redirect,
 * or `true`, `undefined`, or nothing to allow passage.
 */
export type NavigationGuard = (
  to: RouteLocation,
  from: RouteLocation
) => boolean | string | void | Promise<boolean | string | void>;

/** Hook executed after navigation is completed. */
export type NavigationHook = (to: RouteLocation, from: RouteLocation) => void;

/**
 * Scroll control. Return the desired vertical position, or `false` to
 * handle scrolling manually.
 */
export type ScrollBehavior = (
  to: RouteLocation,
  from: RouteLocation,
  saved: number | null
) => number | false | void;

export interface RouterOptions {
  /** `history` uses clean URLs, `hash` stores the route after `#`. */
  mode?: 'history' | 'hash';
  /** Common prefix for all routes in `history` mode. Default `/`. */
  base?: string;
  /** Map of pattern to route definition. */
  routes: Record<string, RouteRecord>;
  /** Global guard executed before each navigation. */
  beforeEach?: NavigationGuard;
  /** Global hook executed after each navigation. */
  afterEach?: NavigationHook;
  /** Class applied by `v-link` when the route starts with the target. */
  linkActiveClass?: string;
  /** Class applied by `v-link` when the route is exactly the target. */
  linkExactActiveClass?: string;
  /** Uses the View Transitions API when switching pages. Default `true`. */
  transition?: boolean;
  /** Title template, with `%s` in place of the route title. */
  titleTemplate?: string;
  /** Fine control of scrolling after each navigation. */
  scrollBehavior?: ScrollBehavior;
}

export interface NavigateOptions {
  /** Replaces the current history entry instead of stacking a new one. */
  replace?: boolean;
  /** Extra state saved in the history entry. */
  state?: Record<string, unknown>;
  /** Disables automatic scrolling for this navigation. */
  scroll?: boolean;
  /** Navigates even when the target is the same as the current route. */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface RouteSegment {
  type: 'static' | 'param' | 'wildcard';
  value: string;
  optional: boolean;
}

interface CompiledRoute {
  pattern: string;
  segments: RouteSegment[];
  score: number;
  record: RouteRecord;
}

interface RouterSettings {
  mode: 'history' | 'hash';
  base: string;
  beforeEach: NavigationGuard | null;
  afterEach: NavigationHook | null;
  linkActiveClass: string;
  linkExactActiveClass: string;
  transition: boolean;
  titleTemplate: string;
  scrollBehavior: ScrollBehavior | null;
}

const settings: RouterSettings = {
  mode: 'history',
  base: '/',
  beforeEach: null,
  afterEach: null,
  linkActiveClass: 'v-link-active',
  linkExactActiveClass: 'v-link-exact-active',
  transition: true,
  titleTemplate: '%s',
  scrollBehavior: null,
};

/** Key used to store the identity of the history entry. */
const HISTORY_KEY = '__voodooRoute';

/** Limit of chained redirects, to prevent freezing the page. */
const MAX_REDIRECTS = 10;

const compiled: CompiledRoute[] = [];
const scrollPositions = new Map<string, number>();
const viewCache = new Map<string, string>();

let currentKey = 'inicial';
let listening = false;
let configured = false;

function emptyLocation(): RouteLocation {
  return {
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    name: '',
    meta: {},
    matched: null,
  };
}

/**
 * Current route, reactive. Any expression that reads `$route` updates itself
 * when navigation happens.
 */
export const route: RouteLocation = reactive(emptyLocation());

// ---------------------------------------------------------------------------
// URL parsing and building
// ---------------------------------------------------------------------------

/** Normalizes the path: leading slash, no double slashes, no trailing slash. */
function normalizePath(path: string): string {
  let out = path || '/';
  if (!out.startsWith('/')) out = `/${out}`;
  out = out.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!search) return out;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function stringifyQuery(query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}

/** Separates a target like `/posts/1?tab=x#anchor` into path, query, and hash. */
function splitTarget(target: string): {
  path: string;
  query: Record<string, string>;
  hash: string;
} {
  let rest = target || '/';
  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex > -1) {
    hash = rest.slice(hashIndex + 1);
    rest = rest.slice(0, hashIndex);
  }
  let query: Record<string, string> = {};
  const queryIndex = rest.indexOf('?');
  if (queryIndex > -1) {
    query = parseQuery(rest.slice(queryIndex + 1));
    rest = rest.slice(0, queryIndex);
  }
  return { path: normalizePath(rest), query, hash };
}

function stripBase(pathname: string): string {
  const base = settings.base.replace(/\/$/, '');
  if (!base || base === '') return pathname;
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

/** Reads the browser URL according to the configured mode. */
function readLocation(): { path: string; query: Record<string, string>; hash: string } {
  if (typeof window === 'undefined') return { path: '/', query: {}, hash: '' };
  if (settings.mode === 'hash') {
    return splitTarget(window.location.hash.slice(1) || '/');
  }
  return {
    path: normalizePath(stripBase(window.location.pathname)),
    query: parseQuery(window.location.search),
    hash: window.location.hash.slice(1),
  };
}

function fullPathOf(path: string, query: Record<string, string>, hash: string): string {
  const qs = stringifyQuery(query);
  return `${path}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`;
}

/** Builds the URL that will be written to history. */
function buildUrl(location: RouteLocation): string {
  const suffix = fullPathOf(location.path, location.query, location.hash);
  if (settings.mode === 'hash') {
    const { pathname, search } = window.location;
    return `${pathname}${search}#${suffix}`;
  }
  const base = settings.base === '/' ? '' : settings.base.replace(/\/$/, '');
  return `${base}${suffix}` || '/';
}

/**
 * True once this document has refused a History API call.
 *
 * Checked rather than re-tried because the refusal is a property of the
 * document, not of the call: once it throws it will throw every time, and
 * catching in a loop would be a lot of exceptions for one answer.
 */
let historyRefused = false;

/** Set while we write the hash ourselves, so our own hashchange is ignored. */
let writingHash = false;

/**
 * Writes the URL for a navigation, and keeps going when it cannot.
 *
 * `history.pushState` is not available everywhere it appears to be. A document
 * with an opaque origin — `about:srcdoc`, or a sandboxed iframe without
 * `allow-same-origin` — throws `SecurityError` for any URL at all, including
 * one that only changes the hash. The documentation's own live examples run in
 * exactly that kind of frame, which is where this was reported: the router
 * threw on the first navigation and the example never changed page.
 *
 * Navigation itself does not need the History API. In hash mode the hash is
 * written directly, which an opaque document does allow. In history mode there
 * is no way to change the address, so the route still resolves and renders and
 * only the address bar stays behind — a worse URL, not a broken page.
 */
function writeUrl(state: Record<string, unknown>, url: string, replace: boolean): void {
  if (!historyRefused) {
    try {
      if (replace) window.history.replaceState(state, '', url);
      else window.history.pushState(state, '', url);
      return;
    } catch (error) {
      // Anything other than the browser refusing is a real bug, not a fallback.
      if (!(error instanceof Error) || error.name !== 'SecurityError') throw error;
      historyRefused = true;
    }
  }

  if (settings.mode !== 'hash') return;

  const hash = url.slice(url.indexOf('#'));
  if (window.location.hash === hash) return;

  writingHash = true;
  try {
    if (replace) window.location.replace(url);
    else window.location.hash = hash;
  } finally {
    // Cleared on the next task: assigning the hash fires hashchange
    // asynchronously, and it has to still be set when that arrives.
    setTimeout(() => {
      writingHash = false;
    }, 0);
  }
}

// ---------------------------------------------------------------------------
// Route compilation and matching
// ---------------------------------------------------------------------------

/**
 * Converts a pattern into segments and calculates specificity.
 *
 * Segment weights: static is worth more than parameter, parameter is worth more than
 * optional, and wildcard lowers the score to the end of the queue. Thus
 * `/usuarios/novo` always beats `/usuarios/:id`, and `*` only enters when nothing else matched.
 */
function compileRoute(pattern: string, record: RouteRecord): CompiledRoute {
  const clean = pattern === '*' ? '*' : normalizePath(pattern);
  const raw = clean === '*' ? ['*'] : clean.split('/').filter(Boolean);
  const segments: RouteSegment[] = [];
  let score = raw.length * 10;

  for (const piece of raw) {
    if (piece === '*' || piece === '**') {
      segments.push({ type: 'wildcard', value: '*', optional: true });
      score -= 30;
      continue;
    }
    if (piece.startsWith(':')) {
      const optional = piece.endsWith('?');
      const name = piece.slice(1, optional ? -1 : undefined);
      segments.push({ type: 'param', value: name, optional });
      score += optional ? 1 : 2;
      continue;
    }
    segments.push({ type: 'static', value: piece, optional: false });
    score += 4;
  }

  return { pattern: clean, segments, score, record };
}

/** Attempts to match a path with an already-compiled pattern. */
function matchSegments(
  segments: RouteSegment[],
  parts: string[]
): Record<string, string> | null {
  const params: Record<string, string> = {};
  let index = 0;

  for (const segment of segments) {
    if (segment.type === 'wildcard') {
      params['*'] = parts.slice(index).map(decodeSafe).join('/');
      return params;
    }
    if (index >= parts.length) {
      if (segment.optional) continue;
      return null;
    }
    const part = parts[index];
    if (segment.type === 'static') {
      if (decodeSafe(part) !== segment.value) return null;
      index++;
      continue;
    }
    params[segment.value] = decodeSafe(part);
    index++;
  }

  return index === parts.length ? params : null;
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Searches for the most specific route that matches the path. */
function matchRoute(path: string): { route: CompiledRoute; params: Record<string, string> } | null {
  const parts = path.split('/').filter(Boolean);
  let best: { route: CompiledRoute; params: Record<string, string> } | null = null;

  for (const candidate of compiled) {
    const params = matchSegments(candidate.segments, parts);
    if (!params) continue;
    if (!best || candidate.score > best.route.score) best = { route: candidate, params };
  }

  return best;
}

/** Returns the definition associated with an already-matched pattern. */
function findRecord(pattern: string | null): RouteRecord | null {
  if (!pattern) return null;
  return compiled.find((item) => item.pattern === pattern)?.record ?? null;
}

// ---------------------------------------------------------------------------
// Route resolution and application
// ---------------------------------------------------------------------------

/**
 * Resolves a target into a complete route without navigating.
 *
 * ```js
 * V.router.resolve('/usuarios/7').params.id // '7'
 * ```
 */
export function resolve(target: string): RouteLocation {
  const { path, query, hash } = splitTarget(target);
  return locationFor(path, query, hash);
}

function locationFor(
  path: string,
  query: Record<string, string>,
  hash: string
): RouteLocation {
  const found = matchRoute(path);
  return {
    path,
    fullPath: fullPathOf(path, query, hash),
    params: found ? found.params : {},
    query,
    hash,
    name: found?.route.record.name ?? '',
    meta: found?.route.record.meta ?? {},
    matched: found ? found.route.pattern : null,
  };
}

/** Simple copy of the current route, delivered to guards without a reactive proxy. */
function snapshot(): RouteLocation {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: { ...route.params },
    query: { ...route.query },
    hash: route.hash,
    name: route.name,
    meta: route.meta,
    matched: route.matched,
  };
}

function applyLocation(location: RouteLocation): void {
  route.path = location.path;
  route.fullPath = location.fullPath;
  route.params = location.params;
  route.query = location.query;
  route.hash = location.hash;
  route.name = location.name;
  route.meta = location.meta;
  route.matched = location.matched;

  const record = findRecord(location.matched);
  if (record?.title && typeof document !== 'undefined') {
    document.title = settings.titleTemplate.includes('%s')
      ? settings.titleTemplate.replace('%s', record.title)
      : record.title;
  }
}

// ---------------------------------------------------------------------------
// Navigation guards
// ---------------------------------------------------------------------------

async function runGuards(to: RouteLocation, from: RouteLocation): Promise<boolean | string> {
  const record = findRecord(to.matched);

  if (record?.redirect) return record.redirect;

  if (record?.beforeEnter) {
    const verdict = await record.beforeEnter(to, from);
    if (verdict === false) return false;
    if (typeof verdict === 'string') return verdict;
  }

  if (settings.beforeEach) {
    const verdict = await settings.beforeEach(to, from);
    if (verdict === false) return false;
    if (typeof verdict === 'string') return verdict;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Scrolling
// ---------------------------------------------------------------------------

function saveScroll(): void {
  if (typeof window === 'undefined') return;
  scrollPositions.set(currentKey, window.scrollY);
}

/**
 * Applies scrolling after the new screen is mounted. A new route goes to the top,
 * navigating back via history restores the saved position, and hash scrolls to the anchor.
 */
function scheduleScroll(to: RouteLocation, from: RouteLocation, saved: number | null): void {
  if (typeof window === 'undefined') return;

  queuePostFlush(() => {
    requestAnimationFrame(() => {
      // Scrolling to where the page already is would be wasted work.
      const moveTo = (top: number): void => {
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
      };

      if (settings.scrollBehavior) {
        const custom = settings.scrollBehavior(to, from, saved);
        if (custom === false) return;
        if (typeof custom === 'number') {
          moveTo(custom);
          return;
        }
      }

      if (to.hash) {
        // Anchors with strange characters would break the selector, so the `name`
        // attribute is only consulted when the text is simple.
        const anchor =
          document.getElementById(to.hash) ??
          (/^[\w-]+$/.test(to.hash) ? document.querySelector(`[name="${to.hash}"]`) : null);
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      moveTo(saved ?? 0);
    });
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Navigates to a path without reloading the page.
 *
 * ```js
 * await V.navigate('/usuarios/42')
 * await V.navigate('/login', { replace: true })
 * ```
 *
 * @returns `true` when navigation happened, `false` when a guard canceled.
 */
export async function navigate(target: string, options: NavigateOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
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
      devtoolsBus.emit('navigation', {
        from: from.fullPath,
        to: destination.fullPath,
        cancelled: true,
        matched: destination.matched,
      });
      return false;
    }
    if (typeof verdict === 'string') {
      destination = resolve(verdict);
      continue;
    }
    break;
  }

  saveScroll();

  const key = uid('rota');
  const historyState = { ...(options.state ?? {}), [HISTORY_KEY]: key };
  const url = buildUrl(destination);
  writeUrl(historyState, url, options.replace === true);
  currentKey = key;

  applyLocation(destination);
  if (options.scroll !== false) scheduleScroll(destination, from, null);

  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit('navigation', {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched,
  });
  return true;
}

/** Handles `popstate` and `hashchange`, i.e., the back and forward buttons. */
async function onHistoryChange(event: PopStateEvent | HashChangeEvent): Promise<void> {
  // Our own hash write fires this. Navigating on it would run the whole
  // transition twice, guards included.
  if (writingHash) return;

  const { path, query, hash } = readLocation();
  const destination = locationFor(path, query, hash);
  const from = snapshot();
  if (destination.fullPath === from.fullPath) return;

  const verdict = await runGuards(destination, from);
  if (verdict === false) {
    // Guard refused: returns the previous URL without creating a new entry.
    writeUrl({ [HISTORY_KEY]: currentKey }, buildUrl(from), true);
    devtoolsBus.emit('navigation', {
      from: from.fullPath,
      to: destination.fullPath,
      cancelled: true,
      matched: destination.matched,
    });
    return;
  }
  if (typeof verdict === 'string') {
    void navigate(verdict, { replace: true });
    return;
  }

  saveScroll();
  const state = (event as PopStateEvent).state as Record<string, unknown> | null;
  const key = (state && (state[HISTORY_KEY] as string)) || uid('rota');
  currentKey = key;

  applyLocation(destination);
  scheduleScroll(destination, from, scrollPositions.get(key) ?? 0);
  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit('navigation', {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched,
  });
}

function historyListener(event: PopStateEvent | HashChangeEvent): void {
  void onHistoryChange(event);
}

/** Connects the history listeners once. */
function startListening(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

  window.addEventListener('popstate', historyListener);
  if (settings.mode === 'hash') window.addEventListener('hashchange', historyListener);
  window.addEventListener('beforeunload', saveScroll);
}

/** Disconnects the history listeners. Useful in tests and when switching apps. */
export function stopRouter(): void {
  if (!listening || typeof window === 'undefined') return;
  listening = false;
  window.removeEventListener('popstate', historyListener);
  window.removeEventListener('hashchange', historyListener);
  window.removeEventListener('beforeunload', saveScroll);

  // Whether this document allows the History API is remembered so it is asked
  // once rather than on every navigation. Stopping the router means starting
  // over, so the answer is forgotten with it — otherwise a router restarted in
  // a document that does allow it would keep using the fallback forever.
  historyRefused = false;
  writingHash = false;
}

/** Applies the route from the current URL, executing guards for the initial entry. */
async function enterInitialRoute(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { path, query, hash } = readLocation();
  const from = snapshot();
  let destination = locationFor(path, query, hash);

  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn('Router: too many redirects in the initial route.');
      return;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) return;
    if (typeof verdict === 'string') {
      destination = resolve(verdict);
      continue;
    }
    break;
  }

  currentKey = uid('rota');
  writeUrl({ [HISTORY_KEY]: currentKey }, buildUrl(destination), true);
  applyLocation(destination);
  if (destination.hash) scheduleScroll(destination, from, null);
  settings.afterEach?.(snapshot(), from);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Registers or replaces a route after initial configuration. */
export function addRoute(pattern: string, record: RouteRecord): void {
  const compiledRoute = compileRoute(pattern, record);
  const index = compiled.findIndex((item) => item.pattern === compiledRoute.pattern);
  if (index > -1) compiled.splice(index, 1, compiledRoute);
  else compiled.push(compiledRoute);
}

/** Removes a route by pattern. */
export function removeRoute(pattern: string): void {
  const clean = pattern === '*' ? '*' : normalizePath(pattern);
  const index = compiled.findIndex((item) => item.pattern === clean);
  if (index > -1) compiled.splice(index, 1);
}

/** Lists the registered patterns, from most specific to least specific. */
export function routePatterns(): string[] {
  return [...compiled].sort((a, b) => b.score - a.score).map((item) => item.pattern);
}

/** Clears the remote HTML cache used by routes with `view`. */
export function clearViewCache(url?: string): void {
  if (url) viewCache.delete(url);
  else viewCache.clear();
}

function configureRouter(options: RouterOptions): RouterApi {
  settings.mode = options.mode ?? 'history';
  settings.base = normalizePath(options.base ?? '/');
  settings.beforeEach = options.beforeEach ?? null;
  settings.afterEach = options.afterEach ?? null;
  settings.linkActiveClass = options.linkActiveClass ?? 'v-link-active';
  settings.linkExactActiveClass = options.linkExactActiveClass ?? 'v-link-exact-active';
  settings.transition = options.transition ?? true;
  settings.titleTemplate = options.titleTemplate ?? '%s';
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

export interface RouterApi {
  (options: RouterOptions): RouterApi;
  /** Current route, reactive. */
  readonly current: RouteLocation;
  /** Stacks a new entry in history. */
  push(target: string, options?: NavigateOptions): Promise<boolean>;
  /** Replaces the current history entry. */
  replace(target: string, options?: NavigateOptions): Promise<boolean>;
  /** Alias of `push`, same function exposed in `V.navigate`. */
  navigate(target: string, options?: NavigateOptions): Promise<boolean>;
  /** Goes back one entry in history. */
  back(): void;
  /** Goes forward one entry in history. */
  forward(): void;
  /** Goes `delta` entries in history. */
  go(delta: number): void;
  /** Resolves a destination without navigating. */
  resolve(target: string): RouteLocation;
  addRoute(pattern: string, record: RouteRecord): void;
  removeRoute(pattern: string): void;
  /** Registered patterns, from most specific to least specific. */
  patterns(): string[];
  /** Disconnects the history listeners. */
  stop(): void;
  clearViewCache(url?: string): void;
  /** `true` after `V.router({...})` is called. */
  readonly ready: boolean;
}

/**
 * Voodoo's router. Called as a function configures the routes and brings
 * navigation commands as methods.
 *
 * ```js
 * V.router({ routes: { '/': { component: 'home' } } })
 * V.router.push('/sobre')
 * V.router.back()
 * ```
 */
/**
 * The members enter via `defineProperties`, not `Object.assign`, because
 * `Object.assign` reads each getter once and copies the value. With it,
 * `V.router.ready` would get stuck at the module's initial `false` and never change,
 * even after `V.router({...})`. It's the same trap that the i18n module already documents.
 */
const routerMembers = {
  get current(): RouteLocation {
    return route;
  },
  push: (target: string, options: NavigateOptions = {}) => navigate(target, options),
  replace: (target: string, options: NavigateOptions = {}) =>
    navigate(target, { ...options, replace: true }),
  navigate,
  back: (): void => {
    if (typeof window !== 'undefined') window.history.back();
  },
  forward: (): void => {
    if (typeof window !== 'undefined') window.history.forward();
  },
  go: (delta: number): void => {
    if (typeof window !== 'undefined') window.history.go(delta);
  },
  resolve,
  addRoute,
  removeRoute,
  patterns: routePatterns,
  stop: stopRouter,
  clearViewCache,
  get ready(): boolean {
    return configured;
  },
};

export const router: RouterApi = Object.defineProperties(
  configureRouter,
  Object.getOwnPropertyDescriptors(routerMembers)
) as unknown as RouterApi;

// ---------------------------------------------------------------------------
// Magic variables
// ---------------------------------------------------------------------------

magic('$route', () => route);
magic('$router', () => router);

// ---------------------------------------------------------------------------
// v-router-view
// ---------------------------------------------------------------------------

/** Loads and caches the HTML of a route declared with `view`. */
async function loadView(url: string): Promise<string> {
  const cached = viewCache.get(url);
  if (cached !== undefined) return cached;
  const html = await http.get<string>(url, { responseType: 'text' });
  const text = typeof html === 'string' ? html : String(html ?? '');
  viewCache.set(url, text);
  return text;
}

/** Signature of parameters, used to detect changes in `/usuarios/:id`. */
function paramsSignature(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join('&');
}

/**
 * `v-router-view` renders the current route.
 *
 * Route with `component` mounts the registered component. Route with `view` fetches
 * remote HTML and inserts it with directives already connected. The element's original
 * content is saved and restored when no route matches.
 *
 * ```html
 * <main v-router-view>Carregando...</main>
 * <main v-router-view.no-transition></main>
 * ```
 */
defineDirective(
  'router-view',
  ({ el, scope, modifiers, effect, cleanup }) => {
    markSkipChildren(el);

    const fallbackHtml = el.innerHTML;
    const useTransition = settings.transition && !modifiers['no-transition'];
    let token = 0;

    const unmount = (): void => {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = '';
    };

    const mount = (record: RouteRecord | null, html: string | null): void => {
      unmount();
      if (record?.component) {
        const host = document.createElement('div');
        host.setAttribute(`${config.prefix}component`, record.component);
        host.className = 'v-router-page';
        el.appendChild(host);
        walk(host, scope as Scope);
        return;
      }
      el.innerHTML = html ?? fallbackHtml;
      for (const child of Array.from(el.childNodes)) walk(child, scope as Scope);
    };

    const render = async (record: RouteRecord | null, current: number): Promise<void> => {
      let html: string | null = null;

      if (record?.view) {
        el.classList.add('v-router-loading');
        try {
          html = await loadView(record.view);
        } catch (err) {
          handleError(err, `v-router-view loading "${record.view}"`);
          html = '';
        } finally {
          el.classList.remove('v-router-loading');
        }
        if (current !== token) return;
      }

      if (useTransition) viewTransition(() => mount(record, html));
      else mount(record, html);
    };

    effect(() => {
      // Reads the matched route and parameters to react to both changes.
      const matched = route.matched;
      void paramsSignature(route.params);
      const record = findRecord(matched);
      void render(record, ++token);
    });

    cleanup(() => {
      token++;
      unmount();
    });
  },
  { priority: PRIORITY.DEFAULT }
);

// ---------------------------------------------------------------------------
// v-link
// ---------------------------------------------------------------------------

const EXTERNAL_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/** Decides if an href should keep the browser's native behavior. */
function isExternalHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith('//')) return true;
  if (EXTERNAL_PROTOCOL.test(href)) return true;
  return false;
}

/** Reads the destination declared in `v-link`, accepting href, text, or expression. */
function linkTarget(el: HTMLElement, expression: string, evaluate: <T>(e?: string) => T): string {
  const raw = expression.trim();
  if (raw) {
    // A literal path like `/sobre` is not a valid expression, so it counts as text.
    if (raw.startsWith('/') || raw.startsWith('#')) return raw;
    const value = evaluate<unknown>(raw);
    if (typeof value === 'string' && value) return value;
    return raw;
  }
  const href = el.getAttribute('href') ?? '';
  if (settings.mode === 'hash' && href.startsWith('#')) return href.slice(1) || '/';
  return href;
}

/** `true` when the current route is within the informed destination. */
function isActivePath(target: string, exact: boolean): boolean {
  const { path } = splitTarget(target);
  // The root is only active in itself, otherwise it would be active on all screens.
  if (path === '/' || exact) return route.path === path;
  return route.path === path || route.path.startsWith(`${path}/`);
}

/**
 * `v-link` transforms any `<a href>` into internal navigation.
 *
 * Clicks with ctrl, cmd, shift or alt, clicks that aren't with the main button,
 * links with `target`, with `download`, with `rel="external"` and links to another
 * domain continue with native behavior.
 *
 * ```html
 * <a v-link href="/usuarios">Usuarios</a>
 * <a v-link="'/usuarios/' + user.id">Detalhe</a>
 * <a v-link.replace href="/login">Entrar</a>
 * ```
 */
defineDirective('link', ({ el, expression, modifiers, effect, cleanup, evaluate }) => {
  const anchor = el as HTMLAnchorElement;

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === 'number' && event.button !== 0) return;

    const target = anchor.getAttribute('target');
    if (target && target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    if ((anchor.getAttribute('rel') ?? '').split(/\s+/).includes('external')) return;

    const destination = linkTarget(el, expression, evaluate);
    if (!destination) return;
    if (isExternalHref(destination)) return;
    if (settings.mode !== 'hash' && destination.startsWith('#')) return;

    event.preventDefault();
    void navigate(destination, {
      replace: !!modifiers.replace,
      scroll: modifiers['no-scroll'] ? false : undefined,
    });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));

  effect(() => {
    const destination = linkTarget(el, expression, evaluate);
    if (!destination || isExternalHref(destination)) return;

    const exact = isActivePath(destination, true);
    const active = exact || isActivePath(destination, false);

    el.classList.toggle(settings.linkActiveClass, active);
    el.classList.toggle(settings.linkExactActiveClass, exact);
    if (exact) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
});

// ---------------------------------------------------------------------------
// v-route-active
// ---------------------------------------------------------------------------

/**
 * `v-route-active` applies a class when the current route matches the path.
 *
 * ```html
 * <li v-route-active="/usuarios">Usuarios</li>
 * <li v-route-active:destaque.exact="/">Inicio</li>
 * ```
 */
defineDirective('route-active', ({ el, expression, arg, modifiers, effect, evaluate }) => {
  const className = arg || 'active';

  effect(() => {
    const raw = expression.trim();
    const target =
      raw.startsWith('/') || !raw ? raw : (evaluate<string>(raw) ?? raw);
    const active = target ? isActivePath(String(target), !!modifiers.exact) : false;
    el.classList.toggle(className, active);
  });
});
