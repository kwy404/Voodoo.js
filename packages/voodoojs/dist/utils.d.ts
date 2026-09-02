/**
 * @module utils
 *
 * Pure utilities. None of them touch the DOM, so the module works the same in
 * browser, Node, Bun, and Deno. Everything here is tree-shakeable.
 */
/** UUID v4. Uses `crypto.randomUUID` when available. */
declare function uuid(): string;
/** Short identifier, useful for element ids. */
declare function uid(prefix?: string): string;
/** Pauses execution. `await V.sleep(500)`. */
declare function sleep(ms: number): Promise<void>;
/**
 * Converts `"300"`, `"300ms"`, `"1.5s"`, and `"2m"` to milliseconds.
 * Accepts `null` because the most common source is `getAttribute`, which returns null.
 */
declare function parseDuration(value: string | number | null | undefined, fallback?: number): number;
interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
}
/**
 * Delays execution until it stops being called for `wait` ms.
 *
 * ```js
 * const search = V.debounce(fetchProducts, 300)
 * ```
 */
declare function debounce<T extends (...args: any[]) => any>(fn: T, wait?: number, immediate?: boolean): DebouncedFunction<T>;
/** Limits to at most one execution every `wait` ms. */
declare function throttle<T extends (...args: any[]) => any>(fn: T, wait?: number): DebouncedFunction<T>;
/** Executes the function once and memoizes the return value. */
declare function once<T extends (...args: any[]) => any>(fn: T): T;
/** Result cache by argument. */
declare function memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T & {
    cache: Map<string, ReturnType<T>>;
};
/** Deep copy. Uses `structuredClone` when available. */
declare function clone<T>(value: T): T;
/** Deep merges objects. Arrays are replaced, not concatenated. */
declare function merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T;
/** Groups by key or by function. */
declare function groupBy<T>(list: T[], key: string | ((item: T) => string | number)): Record<string, T[]>;
/** Removes duplicates. Accepts key for objects. */
declare function unique<T>(list: T[], key?: string | ((item: T) => unknown)): T[];
/** Divides into fixed-size chunks. */
declare function chunk<T>(list: T[], size?: number): T[][];
/** Sorts by key without altering the original array. */
declare function sortBy<T>(list: T[], key: string | ((item: T) => any), direction?: 'asc' | 'desc'): T[];
/** Safely reads a nested path: `get(obj, 'a.b.0.c')`. */
declare function get<T = unknown>(object: unknown, path: string, fallback?: T): T | undefined;
/** Writes to a nested path, creating intermediate objects. */
declare function set(object: Record<string, any>, path: string, value: unknown): void;
/** Random integer between min and max, inclusive. */
declare function random(min?: number, max?: number): number;
/** Randomly picks an item from a list. */
declare function sample<T>(list: T[]): T | undefined;
/** Converts text to URL slug, removing accents. */
declare function slugify(text: string, separator?: string): string;
/** Truncates text at limit and adds ellipsis. */
declare function truncate(text: string, length?: number, suffix?: string): string;
/** First letter uppercase. */
declare function capitalize(text: string): string;
/** First letter of each word uppercase. */
declare function titleCase(text: string): string;
/** Escapes dangerous characters for interpolating text in HTML. */
declare function escapeHtml(text: string): string;
/** Removes all tags from HTML, leaving only text. */
declare function stripTags(html: string): string;
interface FormatOptions {
    locale?: string;
    currency?: string;
}
/** Sets the locale and currency used by formatters. */
declare function setFormatDefaults(locale?: string, currency?: string): void;
/** Formats as currency: `formatCurrency(1234.5)` returns `R$ 1.234,50`. */
declare function formatCurrency(value: number | string, options?: FormatOptions): string;
/** Formats number with locale separators. */
declare function formatNumber(value: number | string, options?: Intl.NumberFormatOptions & FormatOptions): string;
/** Formats dates accepting Date, timestamp, or ISO string. */
declare function formatDate(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions, locale?: string): string;
/** Human-readable relative time: `5 minutes ago`, `in 2 days`. */
declare function relativeTime(value: Date | string | number, locale?: string): string;
/** Human-readable file size: `1.4 MB`. */
declare function formatFileSize(bytes: number, decimals?: number): string;
/** Formatted percentage. */
declare function formatPercent(value: number, decimals?: number, locale?: string): string;
/** `true` when DOM is available. */
declare const isBrowser: boolean;
/**
 * Safely queries a media query.
 *
 * `matchMedia` doesn't exist everywhere: it's missing in jsdom and old webviews.
 * Without this guard, reading `device.reducedMotion` would throw TypeError, and since
 * UI directives read this property while opening and closing panels, the exception
 * would interrupt the method and leave `aria-expanded` and focus in the wrong state.
 */
declare function matchesMedia(query: string): boolean;
/** Device information, calculated on demand. */
declare const device: {
    readonly touch: boolean;
    readonly mobile: boolean;
    readonly tablet: boolean;
    readonly desktop: boolean;
    readonly online: boolean;
    readonly reducedMotion: boolean;
    readonly darkMode: boolean;
};

export { type DebouncedFunction, type FormatOptions, capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, matchesMedia, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, uuid };
