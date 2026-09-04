/**
 * @module runtime/registry
 *
 * Global registries: configuration, directives, components, and plugins.
 */

import type { Scope } from './scope';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface VoodooConfig {
  /** Attribute prefix. Change to `data-v-` for strictly valid HTML. */
  prefix: string;
  /** Initialize the DOM automatically when the script loads. */
  autoStart: boolean;
  /** Watch the DOM with MutationObserver and initialize new elements. */
  autoDiscover: boolean;
  /** Observed root. Default is `document.body`. */
  root: Element | null;
  /** Show detailed warnings in the console. */
  devtools: boolean;
  /**
   * Keyboard shortcut that opens the reactivity inspector, in the full build.
   *
   * Written as `'ctrl+shift+f2'`. The last part names the physical key, so it
   * behaves the same on every keyboard layout. Set to `false` to install no
   * listener at all.
   *
   * Read `xrayShortcut` in `devtools/xray.ts` before changing the default: the
   * previous two choices were both taken, one by Opera and one by the Windows
   * keyboard layout switcher.
   */
  xrayShortcut: string | false;
  /** Base URL for requests triggered by attributes. */
  baseURL: string;
  /** Globals allowed inside expressions. */
  globals: Record<string, unknown>;
  /** Locale used by date, number, and currency formatters. */
  locale: string;
  /** Default currency for `v-currency`. */
  currency: string;
  /** Inject UI component CSS automatically. */
  injectStyles: boolean;
  /**
   * Remove `v-*` attributes from HTML after processing, leaving the DOM clean
   * in the inspector. Values remain accessible internally.
   */
  cleanAttributes: boolean;
  /**
   * Reject `javascript:`, `vbscript:`, and `data:text/html` in attributes that
   * the browser navigates, like `href`, `src`, `action`, and `formaction`. Only
   * turn off if the application truly needs to generate those schemes.
   */
  sanitizeUrls: boolean;
}

export const config: VoodooConfig = {
  prefix: 'v-',
  autoStart: true,
  autoDiscover: true,
  root: null,
  devtools: false,
  xrayShortcut: 'ctrl+shift+f2',
  baseURL: '',
  globals: {},
  locale: typeof navigator !== 'undefined' ? navigator.language || 'pt-BR' : 'pt-BR',
  currency: 'BRL',
  injectStyles: true,
  cleanAttributes: true,
  sanitizeUrls: true,
};

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

export interface DirectiveBinding<T = any> {
  el: HTMLElement;
  /** Already-evaluated value of the expression. */
  value: T;
  oldValue: T | undefined;
  /** Argument after the colon, like `click` in `v-on:click`. */
  arg?: string;
  /** Modifiers after the dots, like `.prevent.stop`. */
  modifiers: Record<string, string | true>;
  /** Original text of the expression. */
  expression: string;
  scope: Scope;
  /** Nearest component instance, when it exists. */
  instance: any;
}

/** Directive in lifecycle format, used by `V.directive()`. */
export interface DirectiveHooks<T = any> {
  created?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  beforeMount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  mounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  updated?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  beforeUnmount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  unmounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  /** Execution order. Higher runs first. Default 0. */
  priority?: number;
  /** When `true`, the expression is not evaluated automatically. */
  raw?: boolean;
  /**
   * Takes over the entire subtree, as `v-if` and `v-for` do: the walker doesn't
   * descend into children, and the directive itself decides what to do with them.
   * Without this, a plugin can't write a structural directive.
   */
  terminal?: boolean;
}

/** Context delivered to internal directives, with fine-grained effect control. */
export interface DirectiveContext {
  el: HTMLElement;
  scope: Scope;
  /** Expression text, exactly as written in the attribute. */
  expression: string;
  arg?: string;
  modifiers: Record<string, string | true>;
  /** Evaluate the attribute expression, or another passed as parameter. */
  evaluate<T = any>(expression?: string): T;
  /** Create a reactive effect with cleanup tied to the element. */
  effect(fn: () => void): void;
  /** Register cleanup executed when the element leaves the DOM. */
  cleanup(fn: () => void): void;
  /** Walk a subtree applying directives, used by `v-if` and `v-for`. */
  walk(node: Node, scope: Scope): void;
  /** Full attribute name, useful for error messages. */
  raw: string;
}

export type DirectiveSetup = (ctx: DirectiveContext) => void;

export interface DirectiveDefinition {
  name: string;
  setup: DirectiveSetup;
  /** Higher runs first. */
  priority: number;
  /** Prevents the walker from descending into children, as in `v-for` and `v-if`. */
  terminal: boolean;
}

export const directives = new Map<string, DirectiveDefinition>();

/** Priorities of special cases. Higher values are processed first. */
export const PRIORITY = {
  IGNORE: 100,
  FOR: 90,
  IF: 80,
  DATA: 70,
  COMPONENT: 65,
  REF: 60,
  // Binding comes before model on purpose.
  //
  // `v-model` writes the value to the field, and `:min`, `:max`, `:step` change
  // what the browser accepts as a value. In reverse order, the field would receive
  // the value with the old rules still in place, and the browser itself would round
  // or clamp: `0.12` would become `0` if the previous `step` was `1`.
  BIND: 45,
  MODEL: 40,
  DEFAULT: 0,
  INIT: -10,
  TRANSITION: -20,
} as const;

export interface RegisterDirectiveOptions {
  priority?: number;
  terminal?: boolean;
}

/** Internal registry, used by native directives. */
export function defineDirective(
  name: string,
  setup: DirectiveSetup,
  options: RegisterDirectiveOptions = {}
): void {
  directives.set(name, {
    name,
    setup,
    priority: options.priority ?? PRIORITY.DEFAULT,
    terminal: options.terminal ?? false,
  });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export interface ComponentDefinition {
  /** Initial state. Receives already-resolved props. */
  state?: (this: any, props: Record<string, any>) => Record<string, any>;
  /** Alias for `state`, for those coming from Vue. */
  data?: (this: any, props: Record<string, any>) => Record<string, any>;
  /** Names of accepted props, or definition with type and default value. */
  props?: string[] | Record<string, PropDefinition>;
  methods?: Record<string, (this: any, ...args: any[]) => any>;
  computed?: Record<string, (this: any) => any>;
  watch?: Record<string, (this: any, value: any, oldValue: any) => void>;
  /** Component HTML. Use `<slot>` to receive the original content. */
  template?: string;
  /** CSS injected once when the component is used. */
  style?: string;
  /** Inherit parent scope instead of isolating. Default `false`. */
  inheritScope?: boolean;
  /** Values delivered to descendants, read with `inject`. */
  provide?: Record<string, unknown> | ((this: any) => Record<string, unknown>);
  /** Values looked up in a `provide` above, available as state. */
  inject?: string[] | Record<string, { from?: string; default?: unknown }>;
  beforeMount?(this: any): void;
  mounted?(this: any): void;
  updated?(this: any): void;
  beforeUnmount?(this: any): void;
  destroyed?(this: any): void;
  unmounted?(this: any): void;
  [key: string]: any;
}

export interface PropDefinition {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  default?: any;
  required?: boolean;
}

export const components = new Map<string, ComponentDefinition>();

/** Convert `UserCard` and `userCard` to `user-card`. */
export function normalizeComponentName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export interface VoodooPlugin {
  name?: string;
  install(V: any, options?: Record<string, unknown>): void;
}

const installedPlugins = new Set<VoodooPlugin | Function>();

export function usePlugin(
  V: any,
  plugin: VoodooPlugin | ((V: any, options?: Record<string, unknown>) => void),
  options?: Record<string, unknown>
): void {
  if (installedPlugins.has(plugin)) return;
  installedPlugins.add(plugin);
  if (typeof plugin === 'function') plugin(V, options);
  else plugin.install(V, options);
}
