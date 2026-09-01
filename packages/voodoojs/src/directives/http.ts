/**
 * @module directives/http
 *
 * Declarative HTTP requests in HTML. Replaces manual fetch writing and HTML
 * assembly with attributes.
 *
 * ```html
 * <button v-get="/api/users" v-target="#list">Load</button>
 *
 * <div v-resource="products: /api/products">
 *   <p v-if="products.loading">Loading...</p>
 *   <p v-else-if="products.error">{ products.error.message }</p>
 *   <ul v-else>
 *     <li v-for="p in products.data">{ p.name }</li>
 *   </ul>
 *   <button v-click="products.reload()">Refresh</button>
 * </div>
 * ```
 */

import { handleError } from '../reactivity';
import { config, defineDirective, directives, PRIORITY } from '../runtime/registry';
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
import { createResource, extractMessage, pick } from '../http/resource';
import { escapeHtml, parseDuration, debounce } from '../utils';
import { toast } from '../ui/toast';

// ---------------------------------------------------------------------------
// Reading the configuration declared in the element
// ---------------------------------------------------------------------------

const p = (): string => config.prefix;

/**
 * Reads a configuration attribute. Uses the walker's cache, so it continues
 * working after attributes are removed from the HTML.
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
// Inserting the result in the DOM
// ---------------------------------------------------------------------------

/** Applies a piece of HTML to the target, respecting the swap mode. */
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

/** Reads a path within JSON, like `data.items.0.name`. */

/**
 * Converts JSON to readable HTML when there's no template.
 *
 * Simple values become text. Lists of objects become a table. Objects become
 * a definition list. Everything is escaped, so the response never injects HTML.
 */
export function renderJSON(value: unknown, depth = 0): string {
  if (value == null) return '';
  if (typeof value !== 'object') return escapeHtml(String(value));

  if (Array.isArray(value)) {
    if (!value.length) return '<p class="v-json-empty">No results.</p>';

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

/** Renders a list using a `<template>` from the page, with `{ field }`. */
function renderWithTemplate(selector: string, data: unknown, scope: Scope, target: HTMLElement): void {
  const template = document.querySelector<HTMLTemplateElement>(selector);
  if (!template) {
    handleError(new Error(`Template not found: ${selector}`), 'v-template');
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
// Execution
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

/** Executes a complete declarative request, from confirmation to swap. */
export async function runRequest(options: RunOptions): Promise<void> {
  const { el, scope, method } = options;
  const settings = readSettings(el, scope);

  // When the dialog module is in the package, the `v-confirm` directive already
  // intercepts the click in the capture phase and asks on its own.
  // Asking again here would show two dialogs in a row.
  const dialogHandlesTheQuestion = directives.has(`confirm`);
  if (settings.confirmMessage && !dialogHandlesTheQuestion) {
    const confirmed = await askConfirmation(settings.confirmMessage);
    if (!confirmed) return;
  }

  // Cancels a previous pending request from the same element.
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

    // Stores in state instead of writing to the DOM.
    if (settings.storeAs) {
      scope.set(settings.storeAs, data);
    } else if (settings.templateSelector) {
      renderWithTemplate(settings.templateSelector, data, scope, target);
    } else if (typeof data === 'string') {
      // HTML response goes straight in.
      swapContent(target, data, settings.swap, scope);
    } else if (data !== undefined && data !== null) {
      // JSON response becomes readable HTML.
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
        : (err as Error)?.message ?? 'Unknown error';

    if (settings.toastError) toast.error(settings.toastError);
    else if (!settings.onError) toast.error(message);

    if (settings.onError) callHandler(settings.onError, scope, el, { error: err, message });
    dispatch(el, 'voodoo:error', { error: err, message });
    handleError(err, `request ${method} ${options.url}`);
  } finally {
    stopLoading();
    inFlight.delete(el);
    if (settings.onComplete) callHandler(settings.onComplete, scope, el, {});
    dispatch(el, 'voodoo:complete', {});
  }
}

/** Finds the error message within the response body. */

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
  const value = evaluateIn(expression, local, 'HTTP callback');
  if (typeof value === 'function') value.call(scope.data, extra.data ?? extra.error);
}

/** Uses the Voodoo dialog when available, or the browser's `confirm`. */
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
// Triggers
// ---------------------------------------------------------------------------

/** Natural trigger for each element, in the spirit of HTMX. */
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

/** Wires the request to the trigger declared in `v-trigger`. */
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
// Directives by HTTP verb
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
      // URL can be dynamic: v-delete="'/api/users/' + user.id"
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
 * The expression can be a literal URL or a JavaScript expression.
 * `/api/users` stays as is. `'/api/users/' + id` is evaluated.
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
// v-load and v-load-visible
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
// v-search: search-as-you-type
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
// v-resource: complete request state
// ---------------------------------------------------------------------------

/**
 * Creates a reactive resource and publishes it to the scope.
 *
 * Syntax: `v-resource="name: /url"` or `v-resource="/url"` with `v-as="name"`.
 * The default name, when none is given, is `resource`.
 *
 * The core is in `createResource`, which is what `V.resource()` uses. Here only
 * the configuration written in attributes is read.
 */
defineDirective(
  'resource',
  ({ el, scope, expression, cleanup }) => {
    const separator = expression.indexOf(':');
    let name = attr(el, 'as') || 'resource';
    let urlExpression = expression.trim();

    // `name: /url` only when what comes before the colon is an identifier.
    if (separator > -1) {
      const head = expression.slice(0, separator).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(head)) {
        name = head;
        urlExpression = expression.slice(separator + 1).trim();
      }
    }

    const resource = createResource(() => resolveURL(urlExpression, scope), {
      method: (attr(el, 'method') || 'GET').toUpperCase() as HttpMethod,
      params: () =>
        attr(el, 'params')
          ? (evaluateIn(attr(el, 'params')!, scope, 'v-params') as Record<string, string>)
          : undefined,
      cache: parseDuration(attr(el, 'cache') ?? undefined, 0) || undefined,
      retry: Number(attr(el, 'retry') ?? 0),
      timeout: parseDuration(attr(el, 'timeout') ?? undefined, http.defaults.timeout),
      jsonPath: attr(el, 'json-path'),
      poll: parseDuration(attr(el, 'poll') ?? undefined, 0),
      manual: hasAttr(el, 'manual'),
      onSuccess: (data) => dispatch(el, 'voodoo:success', { data }),
      onError: (err, message) => dispatch(el, 'voodoo:error', { error: err, message }),
    });

    scope.set(name, resource);
    // Leaving the DOM cancels the pending request and automatic repetition.
    cleanup(() => resource.stop());
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// Auxiliary attributes registered to not generate directive warnings
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
