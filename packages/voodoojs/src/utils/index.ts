/**
 * @module utils
 *
 * Utilitarios puros. Nenhum deles toca no DOM, entao o modulo roda igual em
 * navegador, Node, Bun e Deno. Tudo aqui e tree shakeable.
 */

// ---------------------------------------------------------------------------
// Identificadores e tempo
// ---------------------------------------------------------------------------

/** UUID v4. Usa `crypto.randomUUID` quando disponivel. */
export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Identificador curto, util para ids de elementos. */
export function uid(prefix = 'v'): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

/** Pausa a execucao. `await V.sleep(500)`. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converte `"300"`, `"300ms"`, `"1.5s"` e `"2m"` em milissegundos.
 * Aceita `null` porque a origem mais comum e `getAttribute`, que devolve null.
 */
export function parseDuration(value: string | number | null | undefined, fallback = 0): number {
  if (value == null || value === '') return fallback;
  if (typeof value === 'number') return value;
  const match = /^\s*([\d.]+)\s*(ms|s|m|h)?\s*$/i.exec(String(value));
  if (!match) return fallback;
  const amount = parseFloat(match[1]);
  switch ((match[2] || 'ms').toLowerCase()) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 3_600_000;
    default:
      return amount;
  }
}

// ---------------------------------------------------------------------------
// Funcoes de ordem superior
// ---------------------------------------------------------------------------

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): void;
}

/**
 * Adia a execucao ate parar de ser chamada por `wait` ms.
 *
 * ```js
 * const buscar = V.debounce(fetchProdutos, 300)
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 250,
  immediate = false
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    lastThis = this;
    const callNow = immediate && timer === null;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate && lastArgs) fn.apply(lastThis, lastArgs);
    }, wait);
    if (callNow) fn.apply(this, args);
  } as DebouncedFunction<T>;

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

/** Limita a no maximo uma execucao a cada `wait` ms. */
export function throttle<T extends (...args: any[]) => any>(fn: T, wait = 250): DebouncedFunction<T> {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: unknown, ...args: Parameters<T>) {
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
  } as DebouncedFunction<T>;

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

/** Executa a funcao uma unica vez e memoriza o retorno. */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  } as T;
}

/** Cache de resultado por argumento. */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T & { cache: Map<string, ReturnType<T>> } {
  const cache = new Map<string, ReturnType<T>>();
  const memoized = function (this: unknown, ...args: Parameters<T>) {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key)!;
    const value = fn.apply(this, args);
    cache.set(key, value);
    return value;
  } as T & { cache: Map<string, ReturnType<T>> };
  memoized.cache = cache;
  return memoized;
}

// ---------------------------------------------------------------------------
// Objetos e arrays
// ---------------------------------------------------------------------------

/** Copia profunda. Usa `structuredClone` quando existir. */
export function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Objetos com funcoes caem no caminho manual.
    }
  }
  if (Array.isArray(value)) return value.map((v) => clone(v)) as unknown as T;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, clone(v)])) as unknown as T;
  if (value instanceof Set) return new Set([...value].map((v) => clone(v))) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clone(v);
  return out as T;
}

/** Mescla objetos em profundidade. Arrays sao substituidos, nao concatenados. */
export function merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T {
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      const current = (target as Record<string, any>)[key];
      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        current &&
        typeof current === 'object' &&
        !Array.isArray(current)
      ) {
        (target as Record<string, any>)[key] = merge({ ...current }, value);
      } else {
        (target as Record<string, any>)[key] = value;
      }
    }
  }
  return target;
}

/** Agrupa por chave ou por funcao. */
export function groupBy<T>(
  list: T[],
  key: string | ((item: T) => string | number)
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  const getKey = typeof key === 'function' ? key : (item: T) => (item as any)?.[key];
  for (const item of list) {
    const k = String(getKey(item));
    (out[k] ||= []).push(item);
  }
  return out;
}

/** Remove duplicados. Aceita chave para objetos. */
export function unique<T>(list: T[], key?: string | ((item: T) => unknown)): T[] {
  if (!key) return [...new Set(list)];
  const getKey = typeof key === 'function' ? key : (item: T) => (item as any)?.[key];
  const seen = new Set<unknown>();
  const out: T[] = [];
  for (const item of list) {
    const k = getKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/** Divide em blocos de tamanho fixo. */
export function chunk<T>(list: T[], size = 10): T[][] {
  if (size < 1) return [list];
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Ordena por chave sem alterar o array original. */
export function sortBy<T>(
  list: T[],
  key: string | ((item: T) => any),
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  const getKey = typeof key === 'function' ? key : (item: T) => (item as any)?.[key];
  const factor = direction === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const va = getKey(a);
    const vb = getKey(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb, undefined, { numeric: true }) * factor;
    }
    return (va > vb ? 1 : va < vb ? -1 : 0) * factor;
  });
}

/** Le um caminho aninhado com seguranca: `get(obj, 'a.b.0.c')`. */
export function get<T = unknown>(object: unknown, path: string, fallback?: T): T | undefined {
  const parts = path.split('.');
  let current: any = object;
  for (const part of parts) {
    if (current == null) return fallback;
    current = current[part];
  }
  return (current ?? fallback) as T | undefined;
}

/** Escreve em um caminho aninhado, criando os objetos do meio. */
export function set(object: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = object;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[key];
  }
  current[parts[parts.length - 1]] = value;
}

/** Numero aleatorio inteiro entre min e max, inclusive. */
export function random(min = 0, max = 1): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sorteia um item de uma lista. */
export function sample<T>(list: T[]): T | undefined {
  return list[Math.floor(Math.random() * list.length)];
}

// ---------------------------------------------------------------------------
// Strings
// ---------------------------------------------------------------------------

/** Converte texto em slug de URL, removendo acentos. */
export function slugify(text: string, separator = '-'): string {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`\\${separator}{2,}`, 'g'), separator)
    .replace(new RegExp(`^\\${separator}|\\${separator}$`, 'g'), '');
}

/** Corta o texto respeitando o limite e adiciona reticencias. */
export function truncate(text: string, length = 100, suffix = '...'): string {
  const value = String(text ?? '');
  if (value.length <= length) return value;
  return value.slice(0, Math.max(0, length - suffix.length)).trimEnd() + suffix;
}

/** Primeira letra maiuscula. */
export function capitalize(text: string): string {
  const value = String(text ?? '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Primeira letra de cada palavra em maiuscula. */
export function titleCase(text: string): string {
  return String(text ?? '').replace(/\w\S*/g, (word) => capitalize(word.toLowerCase()));
}

/** Escapa caracteres perigosos para interpolar texto em HTML. */
export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Remove todas as tags de um HTML, deixando somente o texto. */
export function stripTags(html: string): string {
  return String(html ?? '').replace(/<\/?[^>]+(>|$)/g, '');
}

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

export interface FormatOptions {
  locale?: string;
  currency?: string;
}

let defaultLocale = 'pt-BR';
let defaultCurrency = 'BRL';

/** Define o locale e a moeda usados pelos formatadores. */
export function setFormatDefaults(locale?: string, currency?: string): void {
  if (locale) defaultLocale = locale;
  if (currency) defaultCurrency = currency;
}

/** Formata como moeda: `formatCurrency(1234.5)` devolve `R$ 1.234,50`. */
export function formatCurrency(value: number | string, options: FormatOptions = {}): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return '';
  return new Intl.NumberFormat(options.locale ?? defaultLocale, {
    style: 'currency',
    currency: options.currency ?? defaultCurrency,
  }).format(n);
}

/** Formata numero com separadores locais. */
export function formatNumber(
  value: number | string,
  options: Intl.NumberFormatOptions & FormatOptions = {}
): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return '';
  const { locale, ...rest } = options;
  return new Intl.NumberFormat(locale ?? defaultLocale, rest).format(n);
}

/** Formata datas aceitando Date, timestamp ou string ISO. */
export function formatDate(
  value: Date | string | number,
  format: string | Intl.DateTimeFormatOptions = 'short',
  locale?: string
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const loc = locale ?? defaultLocale;

  if (typeof format === 'object') return new Intl.DateTimeFormat(loc, format).format(date);

  const presets: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: '2-digit', month: 'long', year: 'numeric' },
    full: { dateStyle: 'full' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  };
  if (presets[format]) return new Intl.DateTimeFormat(loc, presets[format]).format(date);

  // Formato por padrao textual: DD/MM/YYYY HH:mm:ss
  const pad = (n: number): string => String(n).padStart(2, '0');
  return format
    .replace(/YYYY/g, String(date.getFullYear()))
    .replace(/YY/g, String(date.getFullYear()).slice(-2))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()));
}

/** Tempo relativo legivel: `ha 5 minutos`, `em 2 dias`. */
export function relativeTime(value: Date | string | number, locale?: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000_000],
    ['month', 2_592_000_000],
    ['week', 604_800_000],
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
    ['second', 1000],
  ];

  const rtf = new Intl.RelativeTimeFormat(locale ?? defaultLocale, { numeric: 'auto' });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === 'second') {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return '';
}

/** Tamanho de arquivo legivel: `1.4 MB`. */
export function formatFileSize(bytes: number, decimals = 1): string {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Percentual formatado. */
export function formatPercent(value: number, decimals = 0, locale?: string): string {
  return new Intl.NumberFormat(locale ?? defaultLocale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

/** `true` quando existe DOM disponivel. */
export const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * Consulta uma media query com seguranca.
 *
 * `matchMedia` nao existe em todo lugar: falta no jsdom e em webviews antigas.
 * Sem esta guarda, ler `device.reducedMotion` lancava TypeError, e como as
 * directives de interface leem essa propriedade no meio de abrir e fechar
 * paineis, a excecao interrompia o metodo e deixava `aria-expanded` e o foco
 * no estado errado.
 */
export function matchesMedia(query: string): boolean {
  if (!isBrowser || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Informacoes do dispositivo, calculadas sob demanda. */
export const device = {
  get touch(): boolean {
    return isBrowser && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  },
  get mobile(): boolean {
    return matchesMedia('(max-width: 767px)');
  },
  get tablet(): boolean {
    return matchesMedia('(min-width: 768px) and (max-width: 1023px)');
  },
  get desktop(): boolean {
    return matchesMedia('(min-width: 1024px)');
  },
  get online(): boolean {
    return !isBrowser || navigator.onLine;
  },
  get reducedMotion(): boolean {
    return matchesMedia('(prefers-reduced-motion: reduce)');
  },
  get darkMode(): boolean {
    return matchesMedia('(prefers-color-scheme: dark)');
  },
};
