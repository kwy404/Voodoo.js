/**
 * @module directives/http
 *
 * Requisicoes HTTP declaradas no HTML. Substitui o par "escrever fetch a mao +
 * montar o HTML na unha" por atributos.
 *
 * ```html
 * <button v-get="/api/usuarios" v-target="#lista">Carregar</button>
 *
 * <div v-resource="produtos: /api/produtos">
 *   <p v-if="produtos.loading">Carregando...</p>
 *   <p v-else-if="produtos.error">{ produtos.error.message }</p>
 *   <ul v-else>
 *     <li v-for="p in produtos.data">{ p.nome }</li>
 *   </ul>
 *   <button v-click="produtos.reload()">Atualizar</button>
 * </div>
 * ```
 */

import { handleError, reactive } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import {
  addCleanup,
  destroy,
  evaluateIn,
  hasAttr as hasCachedAttr,
  readAttr,
  walk,
} from '../runtime/walker';
import { http, HttpError, type HttpMethod, type HttpResponse } from '../http';
import { escapeHtml, parseDuration, debounce } from '../utils';
import { toast } from '../ui/toast';

// ---------------------------------------------------------------------------
// Leitura da configuracao declarada no elemento
// ---------------------------------------------------------------------------

const p = (): string => config.prefix;

/**
 * Le um atributo de configuracao. Usa o cache do walker, entao continua
 * funcionando depois que os atributos saem do HTML.
 */
function attr(el: Element, name: string): string | null {
  return readAttr(el, `${p()}${name}`);
}

function hasAttr(el: Element, name: string): boolean {
  return hasCachedAttr(el, `${p()}${name}`);
}

export type SwapMode =
  | 'innerHTML'
  | 'outerHTML'
  | 'textContent'
  | 'beforebegin'
  | 'afterbegin'
  | 'beforeend'
  | 'afterend'
  | 'append'
  | 'prepend'
  | 'replace'
  | 'delete'
  | 'none';

interface RequestSettings {
  target: HTMLElement | null;
  swap: SwapMode;
  loadingTarget: HTMLElement | null;
  loadingClass: string;
  disableWhileLoading: boolean;
  confirmMessage: string | null;
  toastSuccess: string | null;
  toastError: string | null;
  onSuccess: string | null;
  onError: string | null;
  onComplete: string | null;
  cacheMs: number;
  retry: number;
  timeout: number;
  storeAs: string | null;
  jsonPath: string | null;
  templateSelector: string | null;
  offlineQueue: boolean;
  headers: Record<string, string>;
  redirect: string | null;
  scrollTo: string | null;
}

function readSettings(el: HTMLElement, scope: Scope): RequestSettings {
  const targetSelector = attr(el, 'target');
  const loadingSelector = attr(el, 'loading');

  let headers: Record<string, string> = {};
  const headersExpression = attr(el, 'headers');
  if (headersExpression) {
    const parsed = evaluateIn<Record<string, string>>(headersExpression, scope, 'v-headers');
    if (parsed && typeof parsed === 'object') headers = parsed;
  }

  return {
    target: targetSelector ? document.querySelector<HTMLElement>(targetSelector) : null,
    swap: ((attr(el, 'swap') || 'innerHTML') as SwapMode),
    loadingTarget: loadingSelector ? document.querySelector<HTMLElement>(loadingSelector) : null,
    loadingClass: attr(el, 'loading-class') || 'v-loading',
    disableWhileLoading: hasAttr(el, 'disable-loading'),
    confirmMessage: attr(el, 'confirm'),
    toastSuccess: attr(el, 'toast-success'),
    toastError: attr(el, 'toast-error'),
    onSuccess: attr(el, 'on-success'),
    onError: attr(el, 'on-error'),
    onComplete: attr(el, 'on-complete'),
    cacheMs: parseDuration(attr(el, 'cache') ?? undefined, 0),
    retry: Number(attr(el, 'retry') ?? 0),
    timeout: parseDuration(attr(el, 'timeout') ?? undefined, http.defaults.timeout),
    storeAs: attr(el, 'as'),
    jsonPath: attr(el, 'json-path'),
    templateSelector: attr(el, 'template'),
    offlineQueue: hasAttr(el, 'offline-queue'),
    headers,
    redirect: attr(el, 'redirect'),
    scrollTo: attr(el, 'scroll-to'),
  };
}

// ---------------------------------------------------------------------------
// Insercao do resultado no DOM
// ---------------------------------------------------------------------------

/** Aplica um pedaco de HTML no destino, respeitando o modo de troca. */
export function swapContent(
  target: HTMLElement,
  html: string,
  mode: SwapMode,
  scope: Scope
): void {
  const initialize = (nodes: Iterable<Node>): void => {
    for (const node of Array.from(nodes)) if (node.nodeType === 1) walk(node, scope);
  };

  switch (mode) {
    case 'none':
      return;

    case 'delete':
      destroy(target);
      target.remove();
      return;

    case 'textContent':
      target.textContent = html;
      return;

    case 'outerHTML':
    case 'replace': {
      const template = document.createElement('template');
      template.innerHTML = html;
      const nodes = Array.from(template.content.childNodes);
      destroy(target);
      target.replaceWith(template.content);
      initialize(nodes);
      return;
    }

    case 'beforebegin':
    case 'afterbegin':
    case 'beforeend':
    case 'afterend': {
      const before = new Set(Array.from(target.parentElement?.childNodes ?? []));
      target.insertAdjacentHTML(mode, html);
      const parent = mode === 'afterbegin' || mode === 'beforeend' ? target : target.parentElement;
      if (parent) {
        for (const node of Array.from(parent.childNodes)) {
          if (node.nodeType === 1 && !before.has(node)) walk(node, scope);
        }
      }
      return;
    }

    case 'append':
      target.insertAdjacentHTML('beforeend', html);
      initialize(target.childNodes);
      return;

    case 'prepend':
      target.insertAdjacentHTML('afterbegin', html);
      initialize(target.childNodes);
      return;

    default: {
      // innerHTML
      for (const child of Array.from(target.children)) destroy(child);
      target.innerHTML = html;
      initialize(target.childNodes);
    }
  }
}

/** Le um caminho dentro do JSON, como `data.items.0.nome`. */
function pick(value: unknown, path: string | null): unknown {
  if (!path) return value;
  let current: any = value;
  for (const part of path.split('.')) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Converte JSON em HTML legivel quando nao existe template.
 *
 * Valores simples viram texto. Listas de objetos viram tabela. Objetos viram
 * uma lista de definicoes. Tudo escapado, entao a resposta nunca injeta HTML.
 */
export function renderJSON(value: unknown, depth = 0): string {
  if (value == null) return '';
  if (typeof value !== 'object') return escapeHtml(String(value));

  if (Array.isArray(value)) {
    if (!value.length) return '<p class="v-json-empty">Nenhum resultado.</p>';

    const allObjects = value.every((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (allObjects && depth === 0) {
      const columns = Array.from(
        value.reduce((set: Set<string>, item) => {
          for (const key of Object.keys(item as object)) set.add(key);
          return set;
        }, new Set<string>())
      );
      const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
      const body = value
        .map(
          (item) =>
            `<tr>${columns
              .map((c) => `<td>${renderJSON((item as Record<string, unknown>)[c], depth + 1)}</td>`)
              .join('')}</tr>`
        )
        .join('');
      return `<table class="v-json-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }

    return `<ul class="v-json-list">${value
      .map((item) => `<li>${renderJSON(item, depth + 1)}</li>`)
      .join('')}</ul>`;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return '';
  return `<dl class="v-json-object">${entries
    .map(
      ([key, val]) =>
        `<dt>${escapeHtml(key)}</dt><dd>${renderJSON(val, depth + 1)}</dd>`
    )
    .join('')}</dl>`;
}

/** Renderiza uma lista usando um `<template>` da pagina, com `{ campo }`. */
function renderWithTemplate(selector: string, data: unknown, scope: Scope, target: HTMLElement): void {
  const template = document.querySelector<HTMLTemplateElement>(selector);
  if (!template) {
    handleError(new Error(`Template nao encontrado: ${selector}`), 'v-template');
    return;
  }

  for (const child of Array.from(target.children)) destroy(child);
  target.innerHTML = '';

  const items = Array.isArray(data) ? data : [data];
  for (const [index, item] of items.entries()) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const nodes = Array.from(fragment.childNodes);
    target.appendChild(fragment);
    const itemScope = scope.reactiveChild({
      item,
      index,
      ...(item && typeof item === 'object' ? (item as Record<string, unknown>) : {}),
    });
    for (const node of nodes) if (node.nodeType === 1) walk(node, itemScope);
  }
}

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

const inFlight = new WeakMap<HTMLElement, AbortController>();

interface RunOptions {
  el: HTMLElement;
  scope: Scope;
  method: HttpMethod;
  url: string;
  body?: unknown;
  params?: Record<string, string>;
  event?: Event;
}

/** Executa uma requisicao declarativa completa, do confirm ate o swap. */
export async function runRequest(options: RunOptions): Promise<void> {
  const { el, scope, method } = options;
  const settings = readSettings(el, scope);

  if (settings.confirmMessage) {
    const confirmed = await askConfirmation(settings.confirmMessage);
    if (!confirmed) return;
  }

  // Cancela uma requisicao anterior ainda pendente do mesmo elemento.
  inFlight.get(el)?.abort();
  const controller = new AbortController();
  inFlight.set(el, controller);

  const target = settings.target ?? el;
  const submitButton =
    el instanceof HTMLFormElement
      ? el.querySelector<HTMLButtonElement>('[type="submit"], button:not([type])')
      : null;

  const startLoading = (): void => {
    el.classList.add(settings.loadingClass);
    el.setAttribute('aria-busy', 'true');
    if (settings.loadingTarget) settings.loadingTarget.style.removeProperty('display');
    if (settings.disableWhileLoading) {
      const button = submitButton ?? (el as HTMLButtonElement);
      if ('disabled' in button) (button as HTMLButtonElement).disabled = true;
    }
  };

  const stopLoading = (): void => {
    el.classList.remove(settings.loadingClass);
    el.removeAttribute('aria-busy');
    if (settings.loadingTarget) settings.loadingTarget.style.display = 'none';
    if (settings.disableWhileLoading) {
      const button = submitButton ?? (el as HTMLButtonElement);
      if ('disabled' in button) (button as HTMLButtonElement).disabled = false;
    }
  };

  startLoading();
  dispatch(el, 'voodoo:before-request', { method, url: options.url });

  try {
    const response: HttpResponse = await http.request({
      url: options.url,
      method,
      body: options.body,
      params: options.params,
      headers: settings.headers,
      timeout: settings.timeout,
      retry: settings.retry,
      cache: settings.cacheMs || undefined,
      signal: controller.signal,
      offlineQueue: settings.offlineQueue,
    });

    const data = pick(response.data, settings.jsonPath);

    // Guarda no estado em vez de escrever no DOM.
    if (settings.storeAs) {
      scope.set(settings.storeAs, data);
    } else if (settings.templateSelector) {
      renderWithTemplate(settings.templateSelector, data, scope, target);
    } else if (typeof data === 'string') {
      // Resposta HTML entra direto.
      swapContent(target, data, settings.swap, scope);
    } else if (data !== undefined && data !== null) {
      // Resposta JSON vira HTML legivel.
      injectJSONStyles();
      swapContent(target, renderJSON(data), settings.swap, scope);
    }

    if (settings.toastSuccess) toast.success(settings.toastSuccess);
    if (settings.onSuccess) {
      callHandler(settings.onSuccess, scope, el, { data, response });
    }
    dispatch(el, 'voodoo:success', { data, response });

    if (settings.scrollTo) {
      document.querySelector(settings.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
    }
    if (settings.redirect) {
      location.assign(settings.redirect);
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;

    const message =
      err instanceof HttpError
        ? extractMessage(err) ?? err.message
        : (err as Error)?.message ?? 'Erro desconhecido';

    if (settings.toastError) toast.error(settings.toastError);
    else if (!settings.onError) toast.error(message);

    if (settings.onError) callHandler(settings.onError, scope, el, { error: err, message });
    dispatch(el, 'voodoo:error', { error: err, message });
    handleError(err, `requisicao ${method} ${options.url}`);
  } finally {
    stopLoading();
    inFlight.delete(el);
    if (settings.onComplete) callHandler(settings.onComplete, scope, el, {});
    dispatch(el, 'voodoo:complete', {});
  }
}

/** Procura a mensagem de erro dentro do corpo da resposta. */
function extractMessage(error: HttpError): string | null {
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') return null;
  for (const key of ['message', 'error', 'detail', 'msg']) {
    const value = data[key];
    if (typeof value === 'string') return value;
  }
  return null;
}

function dispatch(el: HTMLElement, type: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

function callHandler(
  expression: string,
  scope: Scope,
  el: HTMLElement,
  extra: Record<string, unknown>
): void {
  const local = scope.child({ $el: el, ...extra });
  const value = evaluateIn(expression, local, 'callback HTTP');
  if (typeof value === 'function') value.call(scope.data, extra.data ?? extra.error);
}

/** Usa o dialogo da Voodoo quando disponivel, ou o `confirm` do navegador. */
async function askConfirmation(message: string): Promise<boolean> {
  const global = (globalThis as Record<string, any>).V;
  if (global && typeof global.confirm === 'function' && global.confirm !== globalThis.confirm) {
    return !!(await global.confirm(message));
  }
  return globalThis.confirm(message);
}

let jsonStylesInjected = false;
function injectJSONStyles(): void {
  if (jsonStylesInjected) return;
  jsonStylesInjected = true;
  void import('../dom/style').then(({ injectStyle }) => {
    injectStyle(
      'json-render',
      `
.v-json-table{width:100%;border-collapse:collapse;font:14px/1.5 var(--v-font-sans,system-ui,sans-serif)}
.v-json-table th,.v-json-table td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--v-border,#E6E0F0);vertical-align:top}
.v-json-table th{font-weight:650;color:var(--v-text-muted,#6B6580);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.v-json-list{margin:0;padding-left:18px}
.v-json-object{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
.v-json-object dt{font-weight:600;color:var(--v-text-muted,#6B6580)}
.v-json-object dd{margin:0}
.v-json-empty{color:var(--v-text-muted,#6B6580);font-style:italic}
`
    );
  });
}

// ---------------------------------------------------------------------------
// Gatilhos
// ---------------------------------------------------------------------------

/** Gatilho natural de cada elemento, no espirito do HTMX. */
function defaultTrigger(el: HTMLElement): string {
  const tag = el.tagName;
  if (tag === 'FORM') return 'submit';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
    const type = (el as HTMLInputElement).type;
    return type === 'button' || type === 'submit' ? 'click' : 'change';
  }
  return 'click';
}

interface TriggerOptions {
  el: HTMLElement;
  scope: Scope;
  cleanup: (fn: () => void) => void;
  run: (event?: Event) => void;
}

/** Liga a requisicao ao gatilho declarado em `v-trigger`. */
function installTrigger({ el, cleanup, run }: TriggerOptions): void {
  const declared = attr(el, 'trigger') || defaultTrigger(el);
  const [name, ...modifiers] = declared.split(/[.\s]+/);

  const pollEvery = parseDuration(attr(el, 'poll') ?? undefined, 0);
  if (pollEvery > 0) {
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') run();
    }, pollEvery);
    cleanup(() => clearInterval(timer));
    return;
  }

  if (name === 'load' || name === 'ready') {
    run();
    return;
  }

  if (name === 'visible' || name === 'revealed') {
    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run();
          if (!modifiers.includes('repeat')) observer.unobserve(el);
        }
      },
      { rootMargin: '80px' }
    );
    observer.observe(el);
    cleanup(() => observer.disconnect());
    return;
  }

  const once = modifiers.includes('once');
  const delay = parseDuration(attr(el, 'debounce') ?? undefined, 0);

  let handler = (event: Event): void => {
    if (el.tagName === 'FORM' || (el as HTMLAnchorElement).href) event.preventDefault();
    run(event);
  };
  if (delay > 0) handler = debounce(handler, delay);

  el.addEventListener(name, handler, { once });
  cleanup(() => el.removeEventListener(name, handler));
}

// ---------------------------------------------------------------------------
// Directives por verbo
// ---------------------------------------------------------------------------

const VERBS: Array<[string, HttpMethod]> = [
  ['get', 'GET'],
  ['post', 'POST'],
  ['put', 'PUT'],
  ['patch', 'PATCH'],
  ['delete', 'DELETE'],
];

for (const [name, method] of VERBS) {
  defineDirective(name, ({ el, scope, expression, cleanup }) => {
    const run = (event?: Event): void => {
      // A URL pode ser dinamica: v-delete="'/api/users/' + user.id"
      const url = resolveURL(expression, scope);
      if (!url) return;

      const bodyExpression = attr(el, 'body') || attr(el, 'data-body');
      const body = bodyExpression
        ? evaluateIn(bodyExpression, scope.child({ $event: event }), 'v-body')
        : undefined;

      const paramsExpression = attr(el, 'params');
      const params = paramsExpression
        ? (evaluateIn(paramsExpression, scope, 'v-params') as Record<string, string>)
        : undefined;

      void runRequest({ el, scope, method, url, body, params, event });
    };

    installTrigger({ el, scope, cleanup, run });
  });
}

/**
 * A expressao pode ser uma URL literal ou uma expressao JavaScript.
 * `/api/users` fica como esta. `'/api/users/' + id` e avaliado.
 */
function resolveURL(expression: string, scope: Scope): string {
  const trimmed = expression.trim();
  if (!trimmed) return '';
  const looksLiteral =
    /^[./#?]/.test(trimmed) || /^https?:\/\//i.test(trimmed) || /^[\w-]+\/[\w\-/.]*$/.test(trimmed);
  if (looksLiteral && !/[+`'"]|\$\{/.test(trimmed)) return trimmed;
  const value = evaluateIn<string>(trimmed, scope, 'URL');
  return typeof value === 'string' ? value : trimmed;
}

// ---------------------------------------------------------------------------
// v-load e v-load-visible
// ---------------------------------------------------------------------------

defineDirective('load', ({ el, scope, expression }) => {
  const url = resolveURL(expression, scope);
  if (url) void runRequest({ el, scope, method: 'GET', url });
});

defineDirective('load-visible', ({ el, scope, cleanup, expression }) => {
  const url = resolveURL(expression, scope);
  if (!url) return;

  if (typeof IntersectionObserver === 'undefined') {
    void runRequest({ el, scope, method: 'GET', url });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(el);
        void runRequest({ el, scope, method: 'GET', url });
      }
    },
    { rootMargin: '120px' }
  );
  observer.observe(el);
  cleanup(() => observer.disconnect());
});

// ---------------------------------------------------------------------------
// v-search: busca enquanto digita
// ---------------------------------------------------------------------------

defineDirective('search', ({ el, scope, expression, cleanup }) => {
  const input = el as HTMLInputElement;
  const url = resolveURL(expression, scope);
  const paramName = attr(el, 'param') || input.getAttribute('name') || 'q';
  const wait = parseDuration(attr(el, 'debounce') ?? undefined, 300);
  const minLength = Number(attr(el, 'min-length') ?? 0);

  const run = debounce(() => {
    const value = input.value.trim();
    if (value.length < minLength) return;
    void runRequest({
      el,
      scope,
      method: 'GET',
      url,
      params: { [paramName]: value },
    });
  }, wait);

  const handler = (): void => run();
  input.addEventListener('input', handler);
  cleanup(() => {
    input.removeEventListener('input', handler);
    run.cancel();
  });
});

// ---------------------------------------------------------------------------
// v-resource: estado completo de uma requisicao
// ---------------------------------------------------------------------------

export interface Resource<T = unknown> {
  data: T | null;
  loading: boolean;
  error: (Error & { message: string }) | null;
  loaded: boolean;
  /** Refaz a requisicao. */
  reload(): Promise<void>;
  /** Troca os dados localmente, util para atualizacao otimista. */
  set(value: T): void;
}

/**
 * Cria um recurso reativo e o publica no escopo.
 *
 * Sintaxe: `v-resource="nome: /url"` ou `v-resource="/url"` com `v-as="nome"`.
 * O padrao do nome, quando nada e informado, e `resource`.
 */
defineDirective(
  'resource',
  ({ el, scope, expression, cleanup }) => {
    const separator = expression.indexOf(':');
    let name = attr(el, 'as') || 'resource';
    let urlExpression = expression.trim();

    // `nome: /url` apenas quando o que vem antes dos dois pontos e um identificador.
    if (separator > -1) {
      const head = expression.slice(0, separator).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(head)) {
        name = head;
        urlExpression = expression.slice(separator + 1).trim();
      }
    }

    const resource = reactive({
      data: null,
      loading: false,
      error: null,
      loaded: false,
      async reload() {
        const url = resolveURL(urlExpression, scope);
        if (!url) return;
        resource.loading = true;
        resource.error = null;
        try {
          const params = attr(el, 'params')
            ? (evaluateIn(attr(el, 'params')!, scope, 'v-params') as Record<string, string>)
            : undefined;
          const cacheMs = parseDuration(attr(el, 'cache') ?? undefined, 0);
          const response = await http.request({
            url,
            method: (attr(el, 'method') || 'GET').toUpperCase() as HttpMethod,
            params,
            cache: cacheMs || undefined,
            retry: Number(attr(el, 'retry') ?? 0),
            timeout: parseDuration(attr(el, 'timeout') ?? undefined, http.defaults.timeout),
          });
          resource.data = pick(response.data, attr(el, 'json-path')) as never;
          resource.loaded = true;
          dispatch(el, 'voodoo:success', { data: resource.data });
        } catch (err) {
          const message =
            err instanceof HttpError ? extractMessage(err) ?? err.message : (err as Error).message;
          resource.error = { name: 'ResourceError', message } as never;
          dispatch(el, 'voodoo:error', { error: err, message });
        } finally {
          resource.loading = false;
        }
      },
      set(value: unknown) {
        resource.data = value as never;
      },
    }) as Resource;

    scope.set(name, resource);

    const pollEvery = parseDuration(attr(el, 'poll') ?? undefined, 0);
    if (pollEvery > 0) {
      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') void resource.reload();
      }, pollEvery);
      cleanup(() => clearInterval(timer));
    }

    if (!hasAttr(el, 'manual')) void resource.reload();
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// Atributos auxiliares registrados para nao gerarem aviso de directive
// ---------------------------------------------------------------------------

for (const name of [
  'target',
  'swap',
  'trigger',
  'poll',
  'param',
  'params',
  'body',
  'data-body',
  'headers',
  'cache',
  'retry',
  'timeout',
  'as',
  'json-path',
  'template',
  'offline-queue',
  'min-length',
  'scroll-to',
  'manual',
  'debounce',
  'throttle',
  'indicator',
]) {
  defineDirective(name, () => undefined, { priority: PRIORITY.TRANSITION });
}
