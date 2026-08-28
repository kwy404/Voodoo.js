/**
 * @module i18n
 *
 * Internacionalizacao reativa. Trocar o idioma nao recarrega a pagina: todo
 * texto que passou por `t()` e todo formatador de numero, moeda ou data se
 * atualiza sozinho, porque tudo le o mesmo estado reativo.
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
// Tipos
// ---------------------------------------------------------------------------

/** Arvore de mensagens de um idioma. Aceita aninhamento em qualquer nivel. */
export interface MessageTree {
  [key: string]: string | MessageTree;
}

/** Valores usados na interpolacao de `{chave}`. */
export type TranslateParams = Record<string, unknown> | number;

export interface I18nOptions {
  /** Idioma inicial. Perde para o idioma salvo e para o detectado. */
  locale?: string;
  /** Idioma usado quando a chave nao existe no idioma atual. */
  fallback?: string;
  /** Mensagens por idioma. */
  messages?: Record<string, MessageTree>;
  /** Moeda padrao de `c()`. Cai em `config.currency`. */
  currency?: string;
  /** Guarda o idioma escolhido no localStorage. Padrao `true`. */
  persist?: boolean | string;
  /** Detecta o idioma do navegador quando nada foi salvo. Padrao `true`. */
  detect?: boolean;
  /** Modelo de URL para carregamento sob demanda, com `{locale}`. */
  loadPath?: string;
}

interface I18nState {
  locale: string;
  fallback: string;
  currency: string;
  messages: Record<string, MessageTree>;
}

// ---------------------------------------------------------------------------
// Estado reativo
// ---------------------------------------------------------------------------

/** Chave padrao usada para guardar o idioma escolhido. */
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
// Busca de mensagens
// ---------------------------------------------------------------------------

/**
 * Le uma chave aninhada por ponto dentro de um idioma. Aceita tanto a arvore
 * `{ comum: { salvar: 'Salvar' } }` quanto o mapa achatado
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

/** Idiomas parecidos com o pedido, do mais proximo para o mais distante. */
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
// Pluralizacao
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
 * Escolhe a forma correta em `nenhum item | {n} item | {n} itens`.
 *
 * Duas formas seguem direto a categoria do `Intl.PluralRules`. Tres formas
 * reservam a primeira para o zero, que e o costume em portugues e em ingles.
 * Quatro ou mais formas usam a ordem oficial das categorias do CLDR.
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
// Interpolacao
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
// API de traducao
// ---------------------------------------------------------------------------

/**
 * Traduz uma chave no idioma atual.
 *
 * A busca tenta o idioma atual, depois idiomas parecidos, depois o fallback e,
 * se nada existir, devolve a propria chave, que sempre e melhor do que texto
 * vazio na tela.
 *
 * ```js
 * t('comum.salvar')              // 'Salvar'
 * t('ola', { nome: 'Ana' })      // 'Ola, Ana!'
 * t('itens', { n: 3 })           // '3 itens'
 * t('itens', 3)                  // atalho do mesmo caso
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

/** `true` quando a chave existe no idioma atual ou no fallback. */
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
// Formatadores locais
// ---------------------------------------------------------------------------

/** Formata um numero no idioma atual. */
export function n(value: number | string, options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, { ...options, locale: state.locale });
}

/** Formata um valor como moeda no idioma atual. */
export function c(value: number | string, currency?: string): string {
  return formatCurrency(value, { locale: state.locale, currency: currency ?? state.currency });
}

/** Formata uma data no idioma atual. Aceita preset ou mascara textual. */
export function d(
  value: Date | string | number,
  format: string | Intl.DateTimeFormatOptions = 'short'
): string {
  return formatDate(value, format, state.locale);
}

/** Tempo relativo no idioma atual, como `ha 5 minutos`. */
export function rt(value: Date | string | number): string {
  return relativeTime(value, state.locale);
}

// ---------------------------------------------------------------------------
// Idiomas
// ---------------------------------------------------------------------------

/** Idioma ativo. */
export function getLocale(): string {
  return state.locale;
}

/** Idiomas com mensagens carregadas. */
export function availableLocales(): string[] {
  return Object.keys(state.messages);
}

/** Mensagens de um idioma, ou do idioma atual quando nenhum for informado. */
export function messagesOf(locale?: string): MessageTree {
  return state.messages[locale ?? state.locale] ?? {};
}

/**
 * Adiciona mensagens a um idioma, mesclando com o que ja existe.
 * Retorna o proprio idioma, para encadear.
 */
export function addMessages(locale: string, messages: MessageTree): string {
  const current = state.messages[locale];
  if (current) merge(current as Record<string, unknown>, messages as Record<string, unknown>);
  else state.messages[locale] = messages;
  return locale;
}

/**
 * Carrega mensagens sob demanda.
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
 * Troca o idioma ativo. A pagina inteira se atualiza na hora, sem recarregar.
 *
 * Quando `loadPath` foi configurado e o idioma ainda nao tem mensagens, o
 * arquivo e buscado em segundo plano e a promessa resolve quando ele chega.
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
 * Escolhe o melhor idioma do navegador entre os que existem.
 * Devolve `null` quando nenhum idioma do navegador tem mensagens.
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
// Configuracao
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

  // Ordem de escolha: idioma salvo, idioma do navegador, opcao, fallback.
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
  /** Idioma ativo, reativo quando lido dentro de um efeito. */
  readonly locale: string;
  /** Idioma usado quando a chave nao existe no idioma atual. */
  readonly fallback: string;
  /** Idiomas com mensagens carregadas. */
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
 * Modulo de internacionalizacao. Chamado como funcao configura o idioma e as
 * mensagens, e tambem carrega os utilitarios como metodos.
 *
 * ```js
 * V.i18n({ locale: 'pt-BR', messages: { 'pt-BR': { ola: 'Ola' } } })
 * V.i18n.setLocale('en')
 * V.i18n.t('ola')
 * ```
 */
export const i18n: I18nApi = Object.assign(configureI18n, {
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
}) as I18nApi;

// ---------------------------------------------------------------------------
// Variaveis magicas
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

/** Chave escrita direto no atributo, como `comum.salvar`. */
const LITERAL_KEY = /^[A-Za-z_$][\w$-]*(\.[A-Za-z_$][\w$-]*)*$/;

/**
 * Resolve o texto do atributo em uma chave. Caminho simples com pontos vale
 * como texto, qualquer outra coisa e tratada como expressao do escopo.
 */
function resolveKey(expression: string, evaluate: <T>(expr?: string) => T): string {
  const raw = expression.trim();
  if (!raw) return '';
  if (LITERAL_KEY.test(raw)) return raw;
  const value = evaluate<unknown>(raw);
  return typeof value === 'string' ? value : raw;
}

/** Le `v-t-params` do proprio elemento, mantendo a leitura reativa. */
function readParams(el: HTMLElement, evaluate: <T>(expr?: string) => T): Record<string, unknown> {
  const attr =
    el.getAttribute(`${config.prefix}t-params`) ?? el.getAttribute('data-v-t-params');
  if (!attr) return {};
  const value = evaluate<unknown>(attr);
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * `v-t` traduz o conteudo do elemento, e com argumento traduz um atributo.
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
 * `v-t-params` guarda os valores da interpolacao. Quem le e o `v-t` do mesmo
 * elemento, entao aqui basta existir para o walker nao estranhar o atributo.
 */
defineDirective('t-params', () => undefined);

/**
 * `v-locale` troca o idioma no clique e marca o botao ativo com a classe
 * `v-locale-active`.
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
