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
import { avisarAlias } from './runtime/avisos';

// Efeitos colaterais: registram as directives de cada modulo.
import './directives/ui';
import './directives/forms';
import './directives/state';
// Registra v-sound e v-mute, mais o efeito colateral do modulo de audio.
import './sound';
import './motion';
import './charts';
// Registra v-shader. So entra no build completo: nao existe no essencial nem no
// minimo, porque WebGPU e um recurso de nicho e o modulo tem custo em bytes.
import './directives/gpu';
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
import { sound } from './sound';
import { animate, spring, stagger, inView, scrollProgress, motionPresets, easings } from './motion';
import { renderChart, charts, CHART_COLORS } from './charts';
import { gpu } from './gpu';
import { xray, enableXrayShortcut } from './devtools/xray';
import { devtoolsWidget } from './devtools/launcher';

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

/**
 * Embrulha um nome antigo que continua valendo. A funcao original e chamada sem
 * mudanca nenhuma; em desenvolvimento o console diz qual e o nome oficial.
 */
function comAviso<T extends (...args: any[]) => any>(alias: string, canonico: string, fn: T): T {
  return ((...args: Parameters<T>) => {
    avisarAlias(alias, canonico);
    return fn(...args);
  }) as T;
}

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
  // Apelido antigo. O nome oficial e `V.validate`.
  validateForm: comAviso('V.validateForm', 'V.validate', validate),
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
  // Apelido antigo. O nome oficial e `V.renderChart`.
  chart: comAviso('V.chart', 'V.renderChart', renderChart),
  renderChart,
  charts,
  chartColors: CHART_COLORS,

  // GPU
  gpu,

  // Interface
  palette,
  hotkey,
  sound,

  // Ferramentas de inspecao
  xray,
  enableXrayShortcut,
  devtoolsWidget,
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
export { createResource, createResource as resource } from './http/resource';
export type { Resource, ResourceOptions } from './http/resource';
export type { HttpResponse, RequestConfig, HttpMethod } from './http';

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
export { classifyShaderSource, resolveShaderSource } from './directives/gpu';
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
