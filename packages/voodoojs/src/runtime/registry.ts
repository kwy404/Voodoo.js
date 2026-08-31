/**
 * @module runtime/registry
 *
 * Registros globais: configuracao, directives, componentes e plugins.
 */

import type { Scope } from './scope';

// ---------------------------------------------------------------------------
// Configuracao
// ---------------------------------------------------------------------------

export interface VoodooConfig {
  /** Prefixo dos atributos. Trocar para `data-v-` em HTML estritamente valido. */
  prefix: string;
  /** Inicializa o DOM automaticamente quando o script carrega. */
  autoStart: boolean;
  /** Observa o DOM com MutationObserver e inicializa novos elementos. */
  autoDiscover: boolean;
  /** Raiz observada. Por padrao `document.body`. */
  root: Element | null;
  /** Mostra avisos detalhados no console. */
  devtools: boolean;
  /** URL base das requisicoes disparadas por atributos. */
  baseURL: string;
  /** Globais liberados dentro das expressoes. */
  globals: Record<string, unknown>;
  /** Locale usado por formatadores de data, numero e moeda. */
  locale: string;
  /** Moeda padrao de `v-currency`. */
  currency: string;
  /** Injeta o CSS dos componentes de UI automaticamente. */
  injectStyles: boolean;
  /**
   * Retira os atributos `v-*` do HTML depois de processados, deixando o DOM
   * limpo no inspetor. Os valores continuam acessiveis internamente.
   */
  cleanAttributes: boolean;
  /**
   * Recusa `javascript:`, `vbscript:` e `data:text/html` em atributos que o
   * navegador navega, como `href`, `src`, `action` e `formaction`. Desligue
   * somente se a aplicacao precisar mesmo gerar esses esquemas.
   */
  sanitizeUrls: boolean;
}

export const config: VoodooConfig = {
  prefix: 'v-',
  autoStart: true,
  autoDiscover: true,
  root: null,
  devtools: false,
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
  /** Valor ja avaliado da expressao. */
  value: T;
  oldValue: T | undefined;
  /** Argumento depois dos dois pontos, como `click` em `v-on:click`. */
  arg?: string;
  /** Modificadores depois dos pontos, como `.prevent.stop`. */
  modifiers: Record<string, string | true>;
  /** Texto original da expressao. */
  expression: string;
  scope: Scope;
  /** Instancia de componente mais proxima, quando existir. */
  instance: any;
}

/** Directive no formato de ciclo de vida, usado por `V.directive()`. */
export interface DirectiveHooks<T = any> {
  created?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  beforeMount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  mounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  updated?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  beforeUnmount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  unmounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
  /** Ordem de execucao. Maior roda primeiro. Padrao 0. */
  priority?: number;
  /** Quando `true`, a expressao nao e avaliada automaticamente. */
  raw?: boolean;
  /**
   * Assume a subarvore inteira, como fazem `v-if` e `v-for`: o walker nao desce
   * nos filhos, e quem decide o que fazer com eles e a propria directive.
   * Sem isto, um plugin nao consegue escrever uma directive estrutural.
   */
  terminal?: boolean;
}

/** Contexto entregue as directives internas, com controle fino de efeitos. */
export interface DirectiveContext {
  el: HTMLElement;
  scope: Scope;
  /** Texto da expressao, exatamente como escrito no atributo. */
  expression: string;
  arg?: string;
  modifiers: Record<string, string | true>;
  /** Avalia a expressao do atributo, ou outra passada por parametro. */
  evaluate<T = any>(expression?: string): T;
  /** Cria um efeito reativo com limpeza ligada ao elemento. */
  effect(fn: () => void): void;
  /** Registra limpeza executada quando o elemento sai do DOM. */
  cleanup(fn: () => void): void;
  /** Percorre um subarvore aplicando as directives, usado por `v-if` e `v-for`. */
  walk(node: Node, scope: Scope): void;
  /** Nome completo do atributo, util para mensagens de erro. */
  raw: string;
}

export type DirectiveSetup = (ctx: DirectiveContext) => void;

export interface DirectiveDefinition {
  name: string;
  setup: DirectiveSetup;
  /** Maior roda primeiro. */
  priority: number;
  /** Impede que o walker desca nos filhos, como em `v-for` e `v-if`. */
  terminal: boolean;
}

export const directives = new Map<string, DirectiveDefinition>();

/** Prioridades dos casos especiais. Valores maiores sao processados antes. */
export const PRIORITY = {
  IGNORE: 100,
  FOR: 90,
  IF: 80,
  DATA: 70,
  COMPONENT: 65,
  REF: 60,
  MODEL: 40,
  BIND: 30,
  DEFAULT: 0,
  INIT: -10,
  TRANSITION: -20,
} as const;

export interface RegisterDirectiveOptions {
  priority?: number;
  terminal?: boolean;
}

/** Registro interno, usado pelas directives nativas. */
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
// Componentes
// ---------------------------------------------------------------------------

export interface ComponentDefinition {
  /** Estado inicial. Recebe as props ja resolvidas. */
  state?: (this: any, props: Record<string, any>) => Record<string, any>;
  /** Alias de `state`, para quem vem do Vue. */
  data?: (this: any, props: Record<string, any>) => Record<string, any>;
  /** Nomes das props aceitas, ou definicao com tipo e valor padrao. */
  props?: string[] | Record<string, PropDefinition>;
  methods?: Record<string, (this: any, ...args: any[]) => any>;
  computed?: Record<string, (this: any) => any>;
  watch?: Record<string, (this: any, value: any, oldValue: any) => void>;
  /** HTML do componente. Use `<slot>` para receber o conteudo original. */
  template?: string;
  /** CSS injetado uma unica vez quando o componente e usado. */
  style?: string;
  /** Herda o escopo do pai em vez de isolar. Padrao `false`. */
  inheritScope?: boolean;
  /** Valores entregues aos descendentes, lidos com `inject`. */
  provide?: Record<string, unknown> | ((this: any) => Record<string, unknown>);
  /** Valores buscados em um `provide` acima, disponiveis como estado. */
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

/** Converte `UserCard` e `userCard` em `user-card`. */
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
