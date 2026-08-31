/**
 * @module core
 *
 * Monta o objeto `V`, liga as pecas do runtime e expoe a API publica.
 *
 * Este arquivo nao inicializa nada por conta propria. Quem chama `start()` e o
 * `browser.ts`, que so roda quando existe DOM. Assim o pacote continua seguro
 * para importar em Node, Bun e Deno.
 */

import {
  computed,
  effect,
  EffectScope,
  effectScope,
  flushSync,
  handleError,
  markRaw,
  nextTick,
  reactive,
  ref,
  setErrorHandler,
  shallowRef,
  stop,
  toRaw,
  unref,
  watch,
  watchEffect,
  type Ref,
  type ComputedRef,
} from './reactivity';

import { parse, clearParseCache } from './parser/parser';
import { tokenize, VoodooSyntaxError } from './parser/lexer';
import { evaluate, allowedGlobals, stringify, VoodooRuntimeError } from './parser/interpreter';

import {
  config,
  defineDirective,
  components,
  directives,
  usePlugin,
  PRIORITY,
  type ComponentDefinition,
  type DirectiveHooks,
  type DirectiveBinding,
  type VoodooPlugin,
  type VoodooConfig,
} from './runtime/registry';
import { magic, magics, rootScope, Scope } from './runtime/scope';
import {
  addCleanup,
  destroy,
  evaluateIn,
  findScope,
  getScope,
  markNodeScope,
  parseAttribute,
  refresh,
  setComponentMounter,
  start,
  stopObserving,
  walk,
} from './runtime/walker';
import { defineComponent, instances, mountComponent, setScopeMarker } from './runtime/component';
import { createApp, setAppHost, setDirectiveRegistrar, type App } from './runtime/app';
import { whenElement, whenReady } from './runtime/boot';
import { installMagics, clipboard, network, screen } from './runtime/magics';

import { http, HttpError, request } from './http';
import { createResource } from './http/resource';
import { store, allStores, removeStore, storeNames } from './store';
import { cache, cookie, session, storage, theme, url } from './storage';
import { toast } from './ui/toast';
import { injectStyle, ensureTokens } from './dom/style';
import {
  enter,
  fadeIn,
  fadeOut,
  leave,
  slideDown,
  slideUp,
  viewTransition,
} from './dom/transition';
import * as utils from './utils';

// Efeitos colaterais: registram as directives nativas.
import './directives/core';
import './directives/http';

// ---------------------------------------------------------------------------
// Ligacao entre os modulos do runtime
// ---------------------------------------------------------------------------

setComponentMounter(mountComponent);
setScopeMarker(markNodeScope);
setDirectiveRegistrar(directive);
installMagics();

// ---------------------------------------------------------------------------
// Barramento de eventos
// ---------------------------------------------------------------------------

type EventHandler = (payload?: any) => void;
const eventBus = new Map<string, Set<EventHandler>>();

/** Assina um evento global. Devolve a funcao que cancela a assinatura. */
function on(name: string, handler: EventHandler): () => void {
  let set = eventBus.get(name);
  if (!set) eventBus.set(name, (set = new Set()));
  set.add(handler);
  return () => set!.delete(handler);
}

/** Assina um evento global apenas para a proxima ocorrencia. */
function onceEvent(name: string, handler: EventHandler): () => void {
  const off = on(name, (payload) => {
    off();
    handler(payload);
  });
  return off;
}

/** Dispara um evento global. */
function emit(name: string, payload?: unknown): void {
  const set = eventBus.get(name);
  if (!set) return;
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (err) {
      handleError(err, `evento "${name}"`);
    }
  }
}

function off(name: string, handler?: EventHandler): void {
  if (!handler) {
    eventBus.delete(name);
    return;
  }
  eventBus.get(name)?.delete(handler);
}

// ---------------------------------------------------------------------------
// Directives customizadas com ciclo de vida
// ---------------------------------------------------------------------------

/**
 * Registra uma directive personalizada.
 *
 * ```js
 * V.directive('highlight', {
 *   mounted(el, binding) { el.style.background = binding.value },
 *   updated(el, binding) { el.style.background = binding.value }
 * })
 * ```
 *
 * ```html
 * <div v-highlight="'yellow'">Destaque</div>
 * ```
 *
 * Tambem aceita uma funcao curta, chamada em `mounted` e em `updated`:
 *
 * ```js
 * V.directive('highlight', (el, binding) => { el.style.background = binding.value })
 * ```
 */
function directive<T = any>(
  name: string,
  definition: DirectiveHooks<T> | ((el: HTMLElement, binding: DirectiveBinding<T>) => void)
): void {
  const hooks: DirectiveHooks<T> =
    typeof definition === 'function' ? { mounted: definition, updated: definition } : definition;

  defineDirective(
    name,
    (ctx) => {
      let oldValue: T | undefined;
      let mounted = false;

      const makeBinding = (value: T): DirectiveBinding<T> => ({
        el: ctx.el,
        value,
        oldValue,
        arg: ctx.arg,
        modifiers: ctx.modifiers,
        expression: ctx.expression,
        scope: ctx.scope,
        instance: ctx.scope.owner?.component ?? null,
      });

      const initial = hooks.raw ? (ctx.expression as unknown as T) : ctx.evaluate<T>();
      hooks.created?.(ctx.el, makeBinding(initial));
      hooks.beforeMount?.(ctx.el, makeBinding(initial));

      ctx.effect(() => {
        const value = hooks.raw ? (ctx.expression as unknown as T) : ctx.evaluate<T>();
        if (!mounted) {
          mounted = true;
          oldValue = value;
          hooks.mounted?.(ctx.el, makeBinding(value));
          return;
        }
        if (value === oldValue) return;
        const binding = makeBinding(value);
        hooks.updated?.(ctx.el, binding);
        oldValue = value;
      });

      ctx.cleanup(() => {
        const binding = makeBinding(oldValue as T);
        hooks.beforeUnmount?.(ctx.el, binding);
        hooks.unmounted?.(ctx.el, binding);
      });
    },
    { priority: hooks.priority ?? PRIORITY.DEFAULT, terminal: hooks.terminal ?? false }
  );
}

// ---------------------------------------------------------------------------
// Estado global declarado por JavaScript
// ---------------------------------------------------------------------------

/**
 * Coloca valores no escopo raiz, visiveis para qualquer expressao da pagina.
 *
 * ```js
 * V.data({ usuario: null, carregando: false })
 * ```
 */
function data<T extends Record<string, unknown>>(values: T): T {
  // Copia por descritor pelo mesmo motivo do store: `Object.assign` chamaria o
  // getter e guardaria o resultado, transformando um valor derivado em numero
  // fixo. Com os descritores, `get total() { ... }` continua recalculando.
  Object.defineProperties(rootScope.data, Object.getOwnPropertyDescriptors(values));
  return rootScope.data as T;
}

// ---------------------------------------------------------------------------
// Objeto V
// ---------------------------------------------------------------------------

export interface VoodooStatic {
  (selector: unknown, context?: ParentNode): any;
  version: string;
  config: VoodooConfig;
}

/** Versao publicada. */
export const version = '0.2.0';

/**
 * Nucleo da Voodoo. O objeto exportado tambem e chamavel: `V('#app')` devolve
 * uma colecao encadeavel de elementos.
 */
export const core = {
  // Utilitarios primeiro: nomes proprios da Voodoo podem sobrescrever.
  ...utils,

  version,
  config,

  // Reatividade
  reactive,
  ref,
  shallowRef,
  computed,
  effect,
  watch,
  watchEffect,
  nextTick,
  toRaw,
  markRaw,
  unref,
  stop,
  effectScope,
  EffectScope,
  flushSync,

  // Estado
  data,
  store,
  stores: allStores,
  removeStore,
  storeNames,
  scope: rootScope,

  // Componentes e directives
  component: defineComponent,
  components,
  directive,
  directives,
  magic,
  magics,

  // Modo aplicacao
  createApp,

  // Ciclo de vida do DOM
  start,
  whenReady,
  whenElement,
  walk,
  refresh,
  destroy,
  stopObserving,
  getScope,
  findScope,
  addCleanup,
  parseAttribute,

  // Expressoes
  parse,
  tokenize,
  evaluate,
  evaluateIn,
  stringify,
  clearParseCache,
  globals: allowedGlobals,

  // Servicos
  http,
  request,
  HttpError,
  /** Recurso reativo por JavaScript, equivalente a `v-resource`. */
  resource: createResource,
  toast,
  storage,
  session,
  cookie,
  cache,
  url,
  theme,
  clipboard,
  screen,
  network,

  // Animacao
  enter,
  leave,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  viewTransition,

  // Estilo
  injectStyle,
  ensureTokens,

  // Eventos globais
  on,
  once: onceEvent,
  off,
  emit,

  // Plugins
  use(plugin: VoodooPlugin | ((V: any) => void), options?: Record<string, unknown>): void {
    usePlugin(core, plugin, options);
  },

  /** Define o tratamento de erros da aplicacao inteira. */
  onError(handler: (err: unknown, context: string) => void): void {
    setErrorHandler(handler);
  },

  /** Instancias de componente montadas, para inspecao. */
  instances,

  Scope,
  PRIORITY,
  VoodooSyntaxError,
  VoodooRuntimeError,
};

// A aplicacao criada por `createApp` precisa alcancar o proprio `V` para
// instalar plugins com `app.use(...)`.
setAppHost(core);

export type Core = typeof core;
export type {
  App,
  ComponentDefinition,
  DirectiveHooks,
  DirectiveBinding,
  VoodooPlugin,
  VoodooConfig,
  Ref,
  ComputedRef,
  Scope as ScopeType,
};
