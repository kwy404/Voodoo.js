/**
 * Voodoo.js
 * JavaScript feels like magic.
 *
 * Ponto de entrada para bundlers. Importar este modulo nao mexe no DOM: quem
 * inicializa a pagina e `browser.ts`, usado no build de CDN, ou uma chamada
 * explicita a `V.start()`.
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

// Efeitos colaterais: registram as directives de cada modulo.
import './directives/ui';
import './directives/forms';
import './directives/state';
import './motion';
import './charts';
// Registra os componentes prontos: VButton, VCard, VInput, VSelect e os demais.
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
import { animate, spring, stagger, inView, scrollProgress, motionPresets, easings } from './motion';
import { renderChart, charts, CHART_COLORS } from './charts';
import { xray, enableXrayShortcut } from './devtools/xray';

// ---------------------------------------------------------------------------
// Montagem do objeto chamavel
// ---------------------------------------------------------------------------

/**
 * `V` e ao mesmo tempo uma funcao e um objeto.
 *
 * ```js
 * V('#lista .item').addClass('ativo')   // colecao encadeavel
 * V.toast.success('Pronto')             // servicos
 * ```
 */
export interface Voodoo extends Omit<typeof core, never> {
  (input?: unknown, context?: unknown): VoodooCollection;
}

const V = ((input?: unknown, context?: unknown) =>
  query(input as never, context as never)) as unknown as Voodoo;

Object.assign(V, core, {
  // DOM encadeavel
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,

  // Rotas
  router,
  route,
  navigate,
  resolveRoute,

  // Idiomas
  i18n,
  t,
  setLocale,
  getLocale,

  // Dialogos
  modal,
  alert,
  confirm,
  prompt,
  dialog,

  // Formularios
  validator,
  validate,
  validateForm: validate,
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

  // Animacao
  animate,
  spring,
  stagger,
  inView,
  scrollProgress,
  motion: motionPresets,
  easings,

  // Graficos
  chart: renderChart,
  renderChart,
  charts,
  chartColors: CHART_COLORS,

  // Interface
  palette,
  hotkey,

  // Ferramentas de inspecao
  xray,
  enableXrayShortcut,
  devtools: devtoolsBus,

  magic,
});

export default V;
export { V };

// ---------------------------------------------------------------------------
// Reexportacoes nomeadas, para quem prefere importar so o que usa
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
export type { HttpResponse, RequestConfig, HttpMethod } from './http';

export { store, allStores, removeStore, storeNames } from './store';
export { storage, session, cookie, cache, url, theme } from './storage';
export { toast } from './ui/toast';
export { modal, alert, confirm, prompt, dialog } from './ui/dialog';
export { palette } from './ui/palette';
export { query, ready, VoodooCollection, fromHtml } from './dom/query';
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
export { validator, validate, serializeForm, showFormErrors, clearErrors } from './forms/validate';
export { mask, masks, applyMask, unmask, registerMask } from './forms/mask';
export { hotkey } from './directives/ui';
export { xray } from './devtools/xray';
export { devtoolsBus } from './devtools/bus';

export * from './utils';

export type {
  ComponentDefinition,
  DirectiveHooks,
  DirectiveBinding,
  VoodooPlugin,
  VoodooConfig,
} from './runtime/registry';
