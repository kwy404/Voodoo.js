/**
 * @module storage
 *
 * Uniform access to localStorage, sessionStorage, cookies, query string, and an
 * in-memory cache with expiration. All reads and writes are safe: in private mode,
 * with full quota, or outside the browser, calls do not throw.
 */

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

export const theme = {
  /** Theme chosen by the user, or `system` when never set. */
  get current(): ThemeName {
    return (storage.get<ThemeName>(THEME_KEY) ?? picked ?? 'system') as ThemeName;
  },

  /** Theme effectively applied, resolving `system`. */
  get resolved(): 'light' | 'dark' {
    const value = this.current;
    if (value !== 'system') return value;
    if (typeof matchMedia === 'undefined') return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  set(value: ThemeName): void {
    picked = value;
    storage.set(THEME_KEY, value);
    this.apply();
  },

  toggle(): 'light' | 'dark' {
    const next = this.resolved === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  /** `true` once the visitor has actually picked a theme. */
  get chosen(): boolean {
    return picked !== null || storage.get<ThemeName>(THEME_KEY) != null;
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
    document.dispatchEvent(
      new CustomEvent('voodoo:theme', { detail: { theme: value, resolved: this.resolved } })
    );
  },

  /**
   * Applies the saved theme as soon as the page loads.
   *
   * Does nothing when the visitor never chose one, which is the common case on
   * a page that simply included the script.
   */
  init(): void {
    if (typeof document === 'undefined') return;
    this.apply();
    matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.current === 'system') this.apply();
    });
  },
};
