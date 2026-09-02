/**
 * @module i18n
 *
 * Reactive internationalization. Changing the language doesn't reload the page: all text
 * that went through `t()` and all number, currency, and date formatters update themselves
 * because everything reads the same reactive state.
 *
 * ```js
 * V.i18n({
 *   locale: 'pt-BR',
 *   fallback: 'en',
 *   messages: {
 *     'pt-BR': { comum: { salvar: 'Salvar' }, itens: 'nenhum item | {n} item | {n} itens' },
 *     'en': { comum: { salvar: 'Save' } }
 *   }
 * })
 * ```
 *
 * ```html
 * <button v-t="comum.salvar"></button>
 * <span v-t="itens" v-t-params="{ n: carrinho.length }"></span>
 * <abbr v-t:title="comum.dica">?</abbr>
 * <button v-locale="en">English</button>
 * <span>{ $t('comum.salvar') } em { $locale }</span>
 * ```
 */

import { handleError, reactive } from '../reactivity';
import { config, defineDirective } from '../runtime/registry';
import { readAttr } from '../runtime/walker';
import { magic } from '../runtime/scope';
import { http } from '../http';
import { storage } from '../storage';
import { devtoolsBus } from '../devtools/bus';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  merge,
  relativeTime,
  setFormatDefaults,
} from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Message tree for a language. Accepts nesting at any level. */
export interface MessageTree {
  [key: string]: string | MessageTree;
}

/** Values used in the interpolation of `{key}`. */
export type TranslateParams = Record<string, unknown> | number;

export interface I18nOptions {
  /** Initial language. Loses to the saved language and to the detected language. */
  locale?: string;
  /** Language used when the key doesn't exist in the current language. */
  fallback?: string;
  /** Messages per language. */
  messages?: Record<string, MessageTree>;
  /** Default currency of `c()`. Falls to `config.currency`. */
  currency?: string;
  /** Saves the chosen language in localStorage. Default `true`. */
  persist?: boolean | string;
  /** Detects the browser's language when nothing was saved. Default `true`. */
  detect?: boolean;
  /** URL template for on-demand loading, with `{locale}`. */
  loadPath?: string;
}

interface I18nState {
  locale: string;
  fallback: string;
  currency: string;
  messages: Record<string, MessageTree>;
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

/** Default key used to store the chosen language. */
const STORAGE_KEY = 'voodoo:locale';

const state: I18nState = reactive<I18nState>({
  locale: config.locale || 'pt-BR',
  fallback: 'en',
  currency: config.currency || 'BRL',
  messages: {},
});

let persistKey: string | null = STORAGE_KEY;
let loadPath = '';
const loading = new Map<string, Promise<void>>();

// ---------------------------------------------------------------------------
// Message lookup
// ---------------------------------------------------------------------------

/**
 * Reads a key nested by dot within a language. Accepts both the tree
 * `{ comum: { salvar: 'Salvar' } }` and the flattened map
 * `{ 'comum.salvar': 'Salvar' }`.
 */
function lookupMessage(locale: string, key: string): string | null {
  const tree = state.messages[locale];
  if (!tree) return null;

  const flat = tree[key];
  if (typeof flat === 'string') return flat;

  let current: string | MessageTree | undefined = tree;
  for (const part of key.split('.')) {
    if (current == null || typeof current === 'string') return null;
    current = current[part];
  }
  return typeof current === 'string' ? current : null;
}

/** Languages similar to the requested one, from closest to farthest. */
function candidateLocales(locale: string): string[] {
  const out = [locale];
  const short = locale.split('-')[0];
  if (short && short !== locale) out.push(short);
  for (const available of Object.keys(state.messages)) {
    if (available !== locale && available.split('-')[0] === short) out.push(available);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Pluralization
// ---------------------------------------------------------------------------

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function pluralCategory(locale: string, count: number): Intl.LDMLPluralRule {
  try {
    let rules = pluralRulesCache.get(locale);
    if (!rules) pluralRulesCache.set(locale, (rules = new Intl.PluralRules(locale)));
    return rules.select(count);
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

const CATEGORY_ORDER: Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Chooses the correct form in `nenhum item | {n} item | {n} itens`.
 *
 * Two forms follow directly from the `Intl.PluralRules` category. Three forms
 * reserve the first for zero, which is the custom in Portuguese and English.
 * Four or more forms use the official order of CLDR categories.
 */
function choosePlural(forms: string[], count: number, locale: string): string {
  if (forms.length <= 1) return forms[0] ?? '';
  const category = pluralCategory(locale, count);

  if (forms.length === 2) return category === 'one' ? forms[0] : forms[1];
  if (forms.length === 3) {
    if (count === 0) return forms[0];
    return category === 'one' ? forms[1] : forms[2];
  }

  const index = CATEGORY_ORDER.indexOf(category);
  return forms[Math.min(index < 0 ? forms.length - 1 : index, forms.length - 1)];
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

const PLACEHOLDER = /\{\s*([\w.$-]+)\s*\}/g;

function interpolate(message: string, params: Record<string, unknown>): string {
  if (message.indexOf('{') === -1) return message;
  return message.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) return whole;
    return String(value);
  });
}

function normalizeParams(params: TranslateParams | undefined): Record<string, unknown> {
  if (params == null) return {};
  if (typeof params === 'number') return { n: params };
  return params;
}

// ---------------------------------------------------------------------------
// Translation API
// ---------------------------------------------------------------------------

/**
 * Translates a key in the current language.
 *
 * The search tries the current language, then similar languages, then the fallback,
 * and if nothing exists, returns the key itself, which is always better than empty
 * text on the screen.
 *
 * ```js
 * t('comum.salvar')              // 'Salvar'
 * t('ola', { nome: 'Ana' })      // 'Ola, Ana!'
 * t('itens', { n: 3 })           // '3 itens'
 * t('itens', 3)                  // shortcut for the same case
 * ```
 */
export function t(key: string, params?: TranslateParams): string {
  if (!key) return '';
  const values = normalizeParams(params);
  const locale = state.locale;

  let message: string | null = null;
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

  if (message.includes('|')) {
    const count = Number(values.n ?? values.count ?? 0);
    const forms = message.split('|').map((form) => form.trim());
    message = choosePlural(forms, Number.isNaN(count) ? 0 : count, locale);
  }

  return interpolate(message, values);
}

/** `true` when the key exists in the current language or in the fallback. */
export function te(key: string, locale?: string): boolean {
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

// ---------------------------------------------------------------------------
// Local formatters
// ---------------------------------------------------------------------------

/** Formats a number in the current language. */
export function n(value: number | string, options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, { ...options, locale: state.locale });
}

/** Formats a value as currency in the current language. */
export function c(value: number | string, currency?: string): string {
  return formatCurrency(value, { locale: state.locale, currency: currency ?? state.currency });
}

/** Formats a date in the current language. Accepts preset or text mask. */
export function d(
  value: Date | string | number,
  format: string | Intl.DateTimeFormatOptions = 'short'
): string {
  return formatDate(value, format, state.locale);
}

/** Relative time in the current language, like 'ha 5 minutos'. */
export function rt(value: Date | string | number): string {
  return relativeTime(value, state.locale);
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

/** Active language. */
export function getLocale(): string {
  return state.locale;
}

/** Languages with loaded messages. */
export function availableLocales(): string[] {
  return Object.keys(state.messages);
}

/** Messages of a language, or of the current language when none is provided. */
export function messagesOf(locale?: string): MessageTree {
  return state.messages[locale ?? state.locale] ?? {};
}

/**
 * Adds messages to a language, merging with what already exists.
 * Returns the language itself, for chaining.
 */
export function addMessages(locale: string, messages: MessageTree): string {
  const current = state.messages[locale];
  if (current) merge(current as Record<string, unknown>, messages as Record<string, unknown>);
  else state.messages[locale] = messages;
  return locale;
}

/**
 * Loads messages on demand.
 *
 * ```js
 * await V.i18n.loadMessages('es', '/i18n/es.json')
 * await V.i18n.loadMessages('es', { comum: { salvar: 'Guardar' } })
 * ```
 */
export async function loadMessages(
  locale: string,
  source: string | MessageTree
): Promise<void> {
  if (typeof source !== 'string') {
    addMessages(locale, source);
    return;
  }

  const pending = loading.get(locale);
  if (pending) return pending;

  const task = http
    .get<MessageTree>(source, { responseType: 'json' })
    .then((data) => {
      if (data && typeof data === 'object') addMessages(locale, data);
    })
    .catch((err: unknown) => {
      handleError(err, `i18n ao carregar "${source}"`);
    })
    .finally(() => {
      loading.delete(locale);
    });

  loading.set(locale, task);
  return task;
}

/**
 * Changes the active language. The entire page updates immediately without reloading.
 *
 * When `loadPath` was configured and the language doesn't have messages yet, the file
 * is fetched in the background and the promise resolves when it arrives.
 */
export function setLocale(locale: string): Promise<void> {
  const target = locale?.trim();
  if (!target || target === state.locale) return Promise.resolve();

  const previous = state.locale;
  state.locale = target;
  state.currency = state.currency || config.currency;

  config.locale = target;
  setFormatDefaults(target, state.currency);
  if (persistKey) storage.set(persistKey, target);
  if (typeof document !== 'undefined') document.documentElement.lang = target;

  devtoolsBus.emit('locale', { from: previous, to: target });

  if (!state.messages[target] && loadPath) {
    return loadMessages(target, loadPath.replace('{locale}', target));
  }
  return Promise.resolve();
}

/**
 * Chooses the best browser language among those that exist.
 * Returns `null` when no browser language has messages.
 */
export function detectLocale(): string | null {
  if (typeof navigator === 'undefined') return null;
  const available = Object.keys(state.messages);
  if (!available.length) return null;

  const preferred = navigator.languages?.length
    ? [...navigator.languages]
    : [navigator.language];

  for (const wanted of preferred) {
    if (!wanted) continue;
    const exact = available.find((item) => item.toLowerCase() === wanted.toLowerCase());
    if (exact) return exact;
    const short = wanted.split('-')[0].toLowerCase();
    const partial = available.find((item) => item.split('-')[0].toLowerCase() === short);
    if (partial) return partial;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function configureI18n(options: I18nOptions = {}): I18nApi {
  if (options.messages) {
    for (const [locale, messages] of Object.entries(options.messages)) {
      addMessages(locale, messages);
    }
  }

  state.fallback = options.fallback ?? state.fallback;
  state.currency = options.currency ?? config.currency ?? state.currency;
  loadPath = options.loadPath ?? loadPath;

  if (options.persist === false) persistKey = null;
  else if (typeof options.persist === 'string') persistKey = options.persist;

  // Order of choice: saved language, browser language, option, fallback.
  const saved = persistKey ? storage.get<string>(persistKey) : undefined;
  const detected = options.detect === false ? null : detectLocale();
  const chosen = saved || detected || options.locale || state.locale || state.fallback;

  state.locale = chosen;
  config.locale = chosen;
  setFormatDefaults(chosen, state.currency);
  if (typeof document !== 'undefined') document.documentElement.lang = chosen;

  if (!state.messages[chosen] && loadPath) {
    void loadMessages(chosen, loadPath.replace('{locale}', chosen));
  }

  return i18n;
}

export interface I18nApi {
  (options?: I18nOptions): I18nApi;
  /** Active language, reactive when read within an effect. */
  readonly locale: string;
  /** Language used when the key doesn't exist in the current language. */
  readonly fallback: string;
  /** Languages with loaded messages. */
  readonly locales: string[];
  t: typeof t;
  te: typeof te;
  n: typeof n;
  c: typeof c;
  d: typeof d;
  rt: typeof rt;
  setLocale: typeof setLocale;
  getLocale: typeof getLocale;
  addMessages: typeof addMessages;
  loadMessages: typeof loadMessages;
  messagesOf: typeof messagesOf;
  detectLocale: typeof detectLocale;
}

/**
 * Internationalization module. Called as a function configures the language and
 * messages and also loads utilities as methods.
 *
 * ```js
 * V.i18n({ locale: 'pt-BR', messages: { 'pt-BR': { ola: 'Ola' } } })
 * V.i18n.setLocale('en')
 * V.i18n.t('ola')
 * ```
 */
/**
 * Dynamic accesses enter via `defineProperties`, not `Object.assign`, because
 * `Object.assign` would execute each getter once and copy the value, leaving
 * `V.i18n.locale` stuck in the initial language.
 */
const i18nDynamic = {
  get locale(): string {
    return state.locale;
  },
  get fallback(): string {
    return state.fallback;
  },
  get locales(): string[] {
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
  detectLocale,
};

/**
 * The i18n object is a callable function that also loads the API. Dynamic accesses
 * are copied with getOwnPropertyDescriptors, which keeps each getter alive. With
 * Object.assign they would be executed once and the language would be frozen at
 * the initial value.
 */
export const i18n: I18nApi = Object.defineProperties(
  configureI18n,
  Object.getOwnPropertyDescriptors(i18nDynamic)
) as unknown as I18nApi;

// ---------------------------------------------------------------------------
// Magic variables
// ---------------------------------------------------------------------------

magic('$t', () => t);
magic('$locale', () => state.locale);
magic('$i18n', () => i18n);
magic('$n', () => n);
magic('$c', () => c);
magic('$d', () => d);
magic('$rt', () => rt);

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/** Key written directly in the attribute, like `comum.salvar`. */
const LITERAL_KEY = /^[A-Za-z_$][\w$-]*(\.[A-Za-z_$][\w$-]*)*$/;

/**
 * Resolves the attribute text into a key. Simple path with dots counts as text,
 * anything else is treated as scope expression.
 */
function resolveKey(expression: string, evaluate: <T>(expr?: string) => T): string {
  const raw = expression.trim();
  if (!raw) return '';
  if (LITERAL_KEY.test(raw)) return raw;
  const value = evaluate<unknown>(raw);
  return typeof value === 'string' ? value : raw;
}

/** Reads `v-t-params` from the element itself, keeping the reading reactive. */
function readParams(el: HTMLElement, evaluate: <T>(expr?: string) => T): Record<string, unknown> {
  const attr =
    readAttr(el, `${config.prefix}t-params`) ?? readAttr(el, 'data-v-t-params');
  if (!attr) return {};
  const value = evaluate<unknown>(attr);
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * `v-t` translates the element's content, and with an argument translates an attribute.
 *
 * ```html
 * <button v-t="comum.salvar"></button>
 * <abbr v-t:title="comum.dica">?</abbr>
 * <span v-t="itens" v-t-params="{ n: 5 }"></span>
 * <span v-t="'menu.' + secao"></span>
 * ```
 */
defineDirective('t', ({ el, arg, expression, effect, evaluate }) => {
  effect(() => {
    const key = resolveKey(expression, evaluate);
    if (!key) return;
    const text = t(key, readParams(el, evaluate));
    if (arg) el.setAttribute(arg, text);
    else if (el.textContent !== text) el.textContent = text;
  });
});

/**
 * `v-t-params` stores the interpolation values. What reads it is the `v-t`
 * of the same element, so it just needs to exist here so the walker doesn't find
 * the attribute strange.
 */
defineDirective('t-params', () => undefined);

/**
 * `v-locale` changes the language on click and marks the button active with the
 * `v-locale-active` class.
 *
 * ```html
 * <button v-locale="pt-BR">Portugues</button>
 * <button v-locale="en">English</button>
 * ```
 */
defineDirective('locale', ({ el, expression, effect, cleanup, evaluate }) => {
  const target = (): string => {
    const raw = expression.trim();
    if (!raw) return '';
    if (/^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/.test(raw)) return raw.replace('_', '-');
    const value = evaluate<unknown>(raw);
    return typeof value === 'string' ? value : raw;
  };

  const onClick = (): void => {
    const locale = target();
    if (locale) void setLocale(locale);
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));

  effect(() => {
    el.classList.toggle('v-locale-active', target() === state.locale);
  });
});
