/**
 * Voodoo.js
 * JavaScript feels like magic.
 *
 * Entry point for bundlers. Importing this module does not touch the DOM: the page
 * is initialized by `browser.ts`, used in the CDN build, or an explicit call to
 * `V.start()`.
 *
 * ```ts
 * import V from 'voodoojs'
 * V.start()
 * ```
 *
 * ```ts
 * import { reactive, http, toast } from 'voodoojs'
 * ```
 */

import { core } from './core';
import { query, ready, VoodooCollection, fromHtml } from './dom/query';
import { router, route, navigate, resolve as resolveRoute } from './router';
import { i18n, t, setLocale, getLocale } from './i18n';
import { devtoolsBus } from './devtools/bus';
import { magic } from './runtime/scope';
import { warnAlias } from './runtime/avisos';

// Side effects: register directives from each module.
import './directives/ui';
import './directives/forms';
import './directives/state';
// Registers v-sound and v-mute, plus the audio module side effect.
import './sound';
import './motion';
import './charts';
// Registers ready-to-use components: VButton, VCard, VInput, VSelect and others.
import './ui/components';

import { modal, alert, confirm, prompt, dialog } from './ui/dialog';
import { palette } from './ui/palette';
import { hotkey } from './directives/ui';
import {
  validator,
  validate,
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
} from './forms/validate';
import { mask, masks, applyMask, unmask, registerMask } from './forms/mask';
import { sound } from './sound';
import { animate, spring, stagger, inView, scrollProgress, motionPresets, easings } from './motion';
import { renderChart, charts, CHART_COLORS } from './charts';
import { xray, enableXrayShortcut } from './devtools/xray';
import { devtoolsWidget } from './devtools/launcher';

// ---------------------------------------------------------------------------
// Building the callable object
// ---------------------------------------------------------------------------

/**
 * `V` is at once a function and an object.
 *
 * ```js
 * V('#list .item').addClass('active')   // chainable collection
 * V.toast.success('Done')               // services
 * ```
 */
export interface Voodoo extends Omit<typeof core, never> {
  (input?: unknown, context?: unknown): VoodooCollection;
}

const V = ((input?: unknown, context?: unknown) =>
  query(input as never, context as never)) as unknown as Voodoo;

/**
 * Wraps an old name that still works. The original function is called unchanged;
 * in development the console shows which is the official name.
 */
function withWarning<T extends (...args: any[]) => any>(alias: string, canonical: string, fn: T): T {
  return ((...args: Parameters<T>) => {
    warnAlias(alias, canonical);
    return fn(...args);
  }) as T;
}

Object.assign(V, core, {
  // Chainable DOM
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,

  // Routes
  router,
  route,
  navigate,
  resolveRoute,

  // Languages
  i18n,
  t,
  setLocale,
  getLocale,

  // Dialogs
  modal,
  alert,
  confirm,
  prompt,
  dialog,

  // Forms
  validator,
  validate,
  // Old alias. The official name is `V.validate`.
  validateForm: withWarning('V.validateForm', 'V.validate', validate),
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
  mask,
  masks,
  applyMask,
  unmask,
  registerMask,

  // Animation
  animate,
  spring,
  stagger,
  inView,
  scrollProgress,
  motion: motionPresets,
  easings,

  // Charts
  // Old alias. The official name is `V.renderChart`.
  chart: withWarning('V.chart', 'V.renderChart', renderChart),
  renderChart,
  charts,
  chartColors: CHART_COLORS,

  // Interface
  palette,
  hotkey,
  sound,

  // Inspection tools
  xray,
  enableXrayShortcut,
  devtoolsWidget,
  devtools: devtoolsBus,

  magic,
});

export default V;
export { V };

// ---------------------------------------------------------------------------
// Named re-exports, for those who prefer to import only what they use
// ---------------------------------------------------------------------------

export {
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
  isReactive,
  flushSync,
} from './reactivity';

export { parse, clearParseCache } from './parser/parser';
export { tokenize, VoodooSyntaxError } from './parser/lexer';
export { evaluate, stringify, allowedGlobals, VoodooRuntimeError } from './parser/interpreter';

export { config, PRIORITY, defineDirective } from './runtime/registry';
export { Scope, magic, magics, rootScope } from './runtime/scope';
export { walk, destroy, refresh, start, findScope, getScope, addCleanup } from './runtime/walker';
export { defineComponent, mountComponent, instances } from './runtime/component';
export { screen, network, clipboard } from './runtime/magics';

export { http, request, HttpError } from './http';
export { createResource, createResource as resource } from './http/resource';
export type { Resource, ResourceOptions } from './http/resource';
export type { HttpResponse, RequestConfig, HttpMethod } from './http';

export { socket, createSocket, socketSupported } from './socket';
export type {
  VoodooSocket,
  SocketOptions,
  SocketRoom,
  SocketState,
  SocketTransport,
  SocketMessage,
  RoomOptions,
  RoomState,
} from './socket';

export { store, allStores, removeStore, storeNames } from './store';
export { storage, session, cookie, cache, url, theme } from './storage';
export { toast } from './ui/toast';
export { modal, alert, confirm, prompt, dialog } from './ui/dialog';
export { palette } from './ui/palette';
export { query, ready, VoodooCollection, fromHtml } from './dom/query';
export { createApp } from './runtime/app';
export { whenReady, whenElement, ready as documentReady } from './runtime/boot';
export type { App, AppOptions } from './runtime/app';
export { injectStyle, ensureTokens } from './dom/style';
export {
  enter,
  leave,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  viewTransition,
} from './dom/transition';

export { router, route, navigate } from './router';
export { i18n, t, setLocale, getLocale } from './i18n';
export { animate, spring, stagger, inView, scrollProgress, easings, motionPresets } from './motion';
export { renderChart, charts } from './charts';
export { gpu, reflectWgsl } from './gpu';
export type { GpuContext, GpuSurface, GpuEffect, GpuCompute, GpuUniforms, GpuClock } from './gpu';
export { validator, validate, serializeForm, showFormErrors, clearErrors } from './forms/validate';
export { mask, masks, applyMask, unmask, registerMask } from './forms/mask';
export { hotkey } from './directives/ui';
export { sound, efeitos as soundEffects } from './sound';
export { xray, enableXray, disableXray, isXrayEnabled } from './devtools/xray';
export {
  devtoolsWidget,
  mountDevtoolsWidget,
  unmountDevtoolsWidget,
  isDevtoolsWidgetMounted,
} from './devtools/launcher';
export { devtoolsBus } from './devtools/bus';

export * from './utils';

export type {
  ComponentDefinition,
  DirectiveHooks,
  DirectiveBinding,
  VoodooPlugin,
  VoodooConfig,
} from './runtime/registry';
