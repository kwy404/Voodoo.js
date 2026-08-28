/**
 * @module storage
 *
 * Acesso uniforme a localStorage, sessionStorage, cookies, query string e a um
 * cache em memoria com expiracao. Todas as leituras e escritas sao seguras: em
 * modo privado, com cota cheia ou fora do navegador, as chamadas nao lancam.
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
        // Ignorado de proposito.
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
        // Ignorado de proposito.
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

/** `localStorage` com serializacao JSON automatica. */
export const storage = createStorage(() =>
  typeof localStorage !== 'undefined' ? localStorage : undefined
);

/** `sessionStorage` com serializacao JSON automatica. */
export const session = createStorage(() =>
  typeof sessionStorage !== 'undefined' ? sessionStorage : undefined
);

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export interface CookieOptions {
  /** Dias ate expirar, ou uma data. */
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
  /** Le um parametro da URL atual. */
  get(key: string, fallback?: string): string | undefined {
    if (typeof location === 'undefined') return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },

  /** Le todos os parametros como objeto. */
  all(): Record<string, string> {
    if (typeof location === 'undefined') return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },

  /** Escreve um parametro sem recarregar a pagina. */
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

  /** Aplica varios parametros de uma vez. */
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
// Cache em memoria com expiracao
// ---------------------------------------------------------------------------

interface CacheEntry<T = unknown> {
  value: T;
  expires: number;
}

const memoryCache = new Map<string, CacheEntry>();

export const cache = {
  /** Guarda um valor. `ttl` em milissegundos, `0` significa sem expiracao. */
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

  /** Executa a funcao apenas quando o valor nao estiver em cache. */
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
// Tema claro e escuro
// ---------------------------------------------------------------------------

export type ThemeName = 'light' | 'dark' | 'system';

const THEME_KEY = 'voodoo:theme';

export const theme = {
  /** Tema escolhido pelo usuario, ou `system` quando nunca foi definido. */
  get current(): ThemeName {
    return (storage.get<ThemeName>(THEME_KEY) ?? 'system') as ThemeName;
  },

  /** Tema efetivamente aplicado, resolvendo `system`. */
  get resolved(): 'light' | 'dark' {
    const value = this.current;
    if (value !== 'system') return value;
    if (typeof matchMedia === 'undefined') return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  set(value: ThemeName): void {
    storage.set(THEME_KEY, value);
    this.apply();
  },

  toggle(): 'light' | 'dark' {
    const next = this.resolved === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  /** Escreve `data-theme` no elemento raiz e avisa a pagina. */
  apply(): void {
    if (typeof document === 'undefined') return;
    const value = this.current;
    const root = document.documentElement;
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
    root.style.colorScheme = this.resolved;
    document.dispatchEvent(
      new CustomEvent('voodoo:theme', { detail: { theme: value, resolved: this.resolved } })
    );
  },

  /** Aplica o tema salvo assim que a pagina carrega. */
  init(): void {
    if (typeof document === 'undefined') return;
    this.apply();
    matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.current === 'system') this.apply();
    });
  },
};
