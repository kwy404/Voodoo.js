/**
 * @module storage
 *
 * Uniform access to localStorage, sessionStorage, cookies, query string, and an
 * in-memory cache with expiration. All reads and writes are safe: in private mode,
 * with full quota, or outside the browser, calls do not throw.
 */

import { ref, warn } from '../reactivity';

export interface StorageAdapter {
  get<T = unknown>(key: string, fallback?: T): T | undefined;
  set(key: string, value: unknown): boolean;
  remove(key: string): void;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
}

function createStorage(getStore: () => Storage | undefined, prefix = ''): StorageAdapter {
  const full = (key: string): string => prefix + key;

  return {
    get<T = unknown>(key: string, fallback?: T): T | undefined {
      try {
        const raw = getStore()?.getItem(full(key));
        if (raw === null || raw === undefined) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch {
        return fallback;
      }
    },
    set(key: string, value: unknown): boolean {
      try {
        getStore()?.setItem(full(key), typeof value === 'string' ? value : JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): void {
      try {
        getStore()?.removeItem(full(key));
      } catch {
        // Intentionally ignored.
      }
    },
    clear(): void {
      try {
        const store = getStore();
        if (!store) return;
        if (!prefix) {
          store.clear();
          return;
        }
        for (const key of Object.keys(store)) {
          if (key.startsWith(prefix)) store.removeItem(key);
        }
      } catch {
        // Intentionally ignored.
      }
    },
    has(key: string): boolean {
      try {
        return getStore()?.getItem(full(key)) !== null;
      } catch {
        return false;
      }
    },
    keys(): string[] {
      try {
        const store = getStore();
        if (!store) return [];
        return Object.keys(store)
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length));
      } catch {
        return [];
      }
    },
  };
}

/** `localStorage` with automatic JSON serialization. */
export const storage = createStorage(() =>
  typeof localStorage !== 'undefined' ? localStorage : undefined
);

/** `sessionStorage` with automatic JSON serialization. */
export const session = createStorage(() =>
  typeof sessionStorage !== 'undefined' ? sessionStorage : undefined
);

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export interface CookieOptions {
  /** Days until expiry, or a date. */
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export const cookie = {
  get(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const target = `${encodeURIComponent(name)}=`;
    for (const part of document.cookie.split('; ')) {
      if (part.startsWith(target)) return decodeURIComponent(part.slice(target.length));
    }
    return undefined;
  },

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (typeof document === 'undefined') return;
    let text = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.expires !== undefined) {
      const date =
        typeof options.expires === 'number'
          ? new Date(Date.now() + options.expires * 86_400_000)
          : options.expires;
      text += `; expires=${date.toUTCString()}`;
    }
    text += `; path=${options.path ?? '/'}`;
    if (options.domain) text += `; domain=${options.domain}`;
    if (options.secure) text += '; secure';
    text += `; samesite=${options.sameSite ?? 'Lax'}`;

    document.cookie = text;
  },

  remove(name: string, options: CookieOptions = {}): void {
    this.set(name, '', { ...options, expires: -1 });
  },

  has(name: string): boolean {
    return this.get(name) !== undefined;
  },
};

// ---------------------------------------------------------------------------
// Query string
// ---------------------------------------------------------------------------

export const url = {
  /** Reads a parameter from the current URL. */
  get(key: string, fallback?: string): string | undefined {
    if (typeof location === 'undefined') return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },

  /** Reads all parameters as an object. */
  all(): Record<string, string> {
    if (typeof location === 'undefined') return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },

  /** Writes a parameter without reloading the page. */
  set(key: string, value: string | number | null, replace = true): void {
    if (typeof location === 'undefined') return;
    const next = new URL(location.href);
    if (value === null || value === '') next.searchParams.delete(key);
    else next.searchParams.set(key, String(value));
    history[replace ? 'replaceState' : 'pushState']({}, '', next.toString());
  },

  remove(key: string, replace = true): void {
    this.set(key, null, replace);
  },

  /** Applies multiple parameters at once. */
  merge(params: Record<string, string | number | null>, replace = true): void {
    if (typeof location === 'undefined') return;
    const next = new URL(location.href);
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === '') next.searchParams.delete(key);
      else next.searchParams.set(key, String(value));
    }
    history[replace ? 'replaceState' : 'pushState']({}, '', next.toString());
  },
};

// ---------------------------------------------------------------------------
// In-memory cache with expiration
// ---------------------------------------------------------------------------

interface CacheEntry<T = unknown> {
  value: T;
  expires: number;
}

const memoryCache = new Map<string, CacheEntry>();

export const cache = {
  /** Stores a value. `ttl` in milliseconds, `0` means no expiration. */
  set<T>(key: string, value: T, ttl = 0): T {
    memoryCache.set(key, { value, expires: ttl > 0 ? Date.now() + ttl : Infinity });
    return value;
  },

  get<T = unknown>(key: string, fallback?: T): T | undefined {
    const entry = memoryCache.get(key);
    if (!entry) return fallback;
    if (entry.expires < Date.now()) {
      memoryCache.delete(key);
      return fallback;
    }
    return entry.value as T;
  },

  has(key: string): boolean {
    return this.get(key) !== undefined;
  },

  remove(key: string): void {
    memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },

  /** Executes the function only when the value is not in cache. */
  async remember<T>(key: string, ttl: number, factory: () => Promise<T> | T): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  },

  get size(): number {
    return memoryCache.size;
  },
};

// ---------------------------------------------------------------------------
// Light and dark theme
// ---------------------------------------------------------------------------

export type ThemeName = 'light' | 'dark' | 'system';

const THEME_KEY = 'voodoo:theme';

/** The three states, in the order `cycle()` walks them. */
const THEME_MODES: readonly ThemeName[] = ['system', 'light', 'dark'];

/**
 * A theme name, or `null` for anything else.
 *
 * The stored value arrives through `storage.get()`, which parses JSON first, so
 * both spellings of the key reach here as the same string: `dark` written raw
 * by `set()`, and `"dark"` written as JSON by older builds or by hand. Anything
 * that is not one of the three names used to come straight back out of
 * `current`: a stale `auto` or a typo was reported as the theme, and `apply()`
 * wrote it into `data-theme`, where no stylesheet matched it.
 */
function asTheme(value: unknown): ThemeName | null {
  const name = typeof value === 'string' ? value.trim().toLowerCase() : value;
  return THEME_MODES.includes(name as ThemeName) ? (name as ThemeName) : null;
}

/** What is stored under the key, when it is a theme name. */
function storedTheme(): ThemeName | null {
  return asTheme(storage.get(THEME_KEY));
}

/**
 * The choice made during this page's life, independent of whether it could be
 * written down.
 *
 * `storage` swallows its own failures, which is right, but it meant a choice
 * made where localStorage is unavailable was silently discarded: `set()` wrote
 * nothing, `chosen` stayed false, and `apply()` returned without touching the
 * document. A sandboxed iframe has an opaque origin and throws on localStorage,
 * so a `v-theme-toggle` button inside one did nothing at all, with no error.
 * Persistence is a convenience; the visitor pressing the button is the decision.
 */
let picked: ThemeName | null = null;

/** Listeners are attached once per page, however many times `init()` runs. */
let listening = false;

/**
 * Bumped whenever the applied theme changes, so that effects reading the theme
 * re-run.
 *
 * Everything the theme is derived from — localStorage, a module variable, an
 * attribute on `<html>`, a media query — is invisible to the Proxy that drives
 * reactivity. `v-show="$theme.resolved === 'dark'"` therefore rendered once and
 * then stayed as it was, and the documentation's own example sat there saying
 * "You are on the dark theme" on a page the reader had just switched to light.
 * Reading this ref inside the getters is what subscribes those effects.
 */
const revision = ref(0);

/** Tells the page the theme may have changed, without writing anything. */
function notifyTheme(): void {
  revision.value++;
  if (typeof document === 'undefined') return;
  document.dispatchEvent(
    new CustomEvent('voodoo:theme', { detail: { theme: theme.current, resolved: theme.resolved } })
  );
}

export const theme = {
  /** Theme chosen by the user, or `system` when never set. */
  get current(): ThemeName {
    void revision.value;
    // This page's own decision first. Reading storage first meant that a choice
    // which could not be written, where reading still works (a full quota), lost
    // to the stale value already there, and the toggle looked dead.
    return picked ?? storedTheme() ?? 'system';
  },

  /** Theme effectively applied, resolving `system`. */
  get resolved(): 'light' | 'dark' {
    const value = this.current;
    if (value !== 'system') return value;

    // Nobody picked, so what the page is actually showing wins over what the
    // operating system prefers. `apply()` deliberately leaves an authored
    // `data-theme` alone, and without reading it back here `resolved` would
    // contradict the screen: a page written as light, on a machine set to
    // dark, reported "dark" while displaying light. That is what
    // `v-show="$theme.resolved === 'dark'"` was getting wrong.
    if (typeof document !== 'undefined') {
      const authored = document.documentElement.getAttribute('data-theme');
      if (authored === 'light' || authored === 'dark') return authored;
    }

    if (typeof matchMedia === 'undefined') return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  /**
   * Picks a theme and remembers it: `light`, `dark`, or `system` to follow the
   * operating system again, including its changes while the page is open.
   */
  set(value: ThemeName): void {
    const next = asTheme(value);
    if (!next) {
      warn(`theme.set() expects 'light', 'dark' or 'system', got ${String(value)}.`);
      return;
    }
    picked = next;
    storage.set(THEME_KEY, next);
    revision.value++;
    this.apply();
  },

  /** Switches between light and dark, whatever the current one came from. */
  toggle(): 'light' | 'dark' {
    const next = this.resolved === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  /** Walks the three states in turn: system, light, dark, and back to system. */
  cycle(): ThemeName {
    const next = THEME_MODES[(THEME_MODES.indexOf(this.current) + 1) % THEME_MODES.length];
    this.set(next);
    return next;
  },

  /** `true` once the visitor has actually picked a theme. */
  get chosen(): boolean {
    void revision.value;
    return picked !== null || storedTheme() !== null;
  },

  /** Writes `data-theme` on the root element and notifies the page. */
  apply(): void {
    if (typeof document === 'undefined') return;

    // Nobody picked a theme, so the page is left exactly as its author wrote
    // it. Importing a library must never repaint someone's site because the
    // visitor's operating system happens to be in dark mode, and it must not
    // strip a `data-theme` the author put in their own markup.
    //
    // Setting `colorScheme` was the worst of it: it makes the browser render
    // the background, the scrollbars and every form control dark, across the
    // whole document, for a page that asked for none of that.
    if (!this.chosen) return;

    const value = this.current;
    const root = document.documentElement;
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
    root.style.colorScheme = this.resolved;
    notifyTheme();
  },

  /**
   * Applies the saved theme as soon as the page loads, and keeps following it.
   *
   * Does nothing to the document when the visitor never chose one, which is
   * the common case on a page that simply included the script. Safe to call
   * more than once: the listeners are attached the first time only. Before
   * that, every call added another set, and a page that called it next to the
   * bootstrap ran each theme change twice.
   */
  init(): void {
    if (typeof document === 'undefined') return;
    this.apply();
    if (listening) return;
    listening = true;

    // Someone else may set `data-theme` on the root: a documentation shell
    // pushing its theme into an example frame, a server-rendered page, a
    // no-flash inline script. `resolved` reads that attribute, so a change to
    // it has to reach the effects that read `resolved`, and only an observer
    // can see a write the library did not make.
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        revision.value++;
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    // Another tab, or a same-origin frame such as a live example, changed the
    // choice. Without this the page kept the old theme until it was reloaded,
    // and the next press of its toggle wrote over the newer choice.
    if (typeof addEventListener !== 'undefined') {
      addEventListener('storage', (event: StorageEvent) => {
        if (event.key !== THEME_KEY && event.key !== null) return;
        picked = storedTheme();
        if (picked) this.apply();
        else notifyTheme();
      });
    }

    // `matchMedia?.()` reads as a guard and is not one: optional chaining only
    // protects against a null or undefined VALUE, never against an identifier
    // that was never declared. Where the global is absent -- jsdom, older
    // webviews, some embedded browsers -- the bare name threw a ReferenceError
    // and took the whole of init() down with it. `typeof` is the only check
    // that answers for an undeclared name.
    if (typeof matchMedia === 'undefined') return;
    const query = matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = (): void => {
      if (this.current !== 'system') return;
      // A visitor who chose `system` gets `color-scheme` rewritten; one who
      // never chose gets only the notification, so `v-theme-toggle` and
      // `$theme.resolved` stop describing the theme the system just left.
      // That used to be skipped entirely, and the button kept offering
      // "Switch to dark theme" on a page that had already gone dark.
      if (this.chosen) this.apply();
      else notifyTheme();
    };
    // Safari before 14 has only the older `addListener`.
    if (query.addEventListener) query.addEventListener('change', onSystemChange);
    else query.addListener?.(onSystemChange);
  },
};

/**
 * Starts following the theme, once, for code that reads or changes it.
 *
 * Only the script-tag bootstrap called `init()`. A page built from the ES
 * modules got `v-theme-toggle` and `$theme` without it: the saved choice was
 * never put back on reload, and neither a system change nor another tab ever
 * reached the button. Not part of the public API.
 */
export function watchTheme(): void {
  if (!listening) theme.init();
}
