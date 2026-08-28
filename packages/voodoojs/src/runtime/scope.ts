/**
 * @module runtime/scope
 *
 * Cadeia de escopos. Cada `v-data`, cada componente e cada iteracao de `v-for`
 * cria um escopo filho. A busca de um identificador sobe a cadeia ate a raiz e,
 * se nada for encontrado, cai nas variaveis magicas (`$store`, `$el`, ...).
 */

import type { EvalScope } from '../parser/interpreter';
import { reactive } from '../reactivity';

export type MagicGetter = (scope: Scope) => unknown;

/** Registro global de variaveis magicas, preenchido pelos modulos. */
export const magics = new Map<string, MagicGetter>();

/** Registra uma variavel magica disponivel em qualquer expressao. */
export function magic(name: string, getter: MagicGetter): void {
  magics.set(name.startsWith('$') ? name : `$${name}`, getter);
}

export class Scope implements EvalScope {
  /** Dados proprios deste escopo, normalmente um proxy reativo. */
  data: Record<string, any>;
  parent: Scope | null;
  /** Elemento que criou o escopo. Usado por `$el` e `$refs`. */
  el: Element | null;
  /** Referencias declaradas com `v-ref` dentro deste escopo. */
  refs: Record<string, Element> = {};
  /** Instancia de componente, quando este escopo pertence a um. */
  component: any = null;

  private magicCache: Map<string, Record<string, unknown>> | null = null;

  constructor(data: Record<string, any> = {}, parent: Scope | null = null, el: Element | null = null) {
    this.data = data;
    this.parent = parent;
    this.el = el;
  }

  /** Escopo raiz da cadeia. */
  get root(): Scope {
    let s: Scope = this;
    while (s.parent) s = s.parent;
    return s;
  }

  /** Escopo de componente mais proximo, subindo a cadeia. */
  get owner(): Scope | null {
    let s: Scope | null = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }

  /** Conjunto de refs visiveis, mesclando os escopos ancestrais. */
  get allRefs(): Record<string, Element> {
    const chain: Scope[] = [];
    let s: Scope | null = this;
    while (s) {
      chain.unshift(s);
      s = s.parent;
    }
    const out: Record<string, Element> = {};
    for (const scope of chain) Object.assign(out, scope.refs);
    return out;
  }

  lookup(name: string): Record<string, any> | undefined {
    let s: Scope | null = this;
    while (s) {
      if (name in s.data) return s.data;
      s = s.parent;
    }
    if (name.charCodeAt(0) === 36 /* $ */ && magics.has(name)) {
      return this.magicContainer(name);
    }
    return undefined;
  }

  has(name: string): boolean {
    return this.lookup(name) !== undefined;
  }

  get(name: string): unknown {
    const owner = this.lookup(name);
    return owner ? owner[name] : undefined;
  }

  set(name: string, value: unknown): void {
    let s: Scope | null = this;
    while (s) {
      if (name in s.data) {
        s.data[name] = value;
        return;
      }
      s = s.parent;
    }
    // Chave nova: cria no escopo atual para manter a reatividade local.
    this.data[name] = value;
  }

  child(vars: Record<string, unknown> = {}, el: Element | null = null): Scope {
    return new Scope(vars, this, el ?? this.el);
  }

  /** Cria um escopo filho reativo, usado por `v-data` e por `v-for`. */
  reactiveChild(vars: Record<string, unknown>, el: Element | null = null): Scope {
    return new Scope(reactive(vars), this, el ?? this.el);
  }

  private magicContainer(name: string): Record<string, unknown> {
    if (!this.magicCache) this.magicCache = new Map();
    const cached = this.magicCache.get(name);
    if (cached) return cached;

    const getter = magics.get(name)!;
    const scope = this;
    const container = {};
    Object.defineProperty(container, name, {
      get: () => getter(scope),
      set: (value: unknown) => {
        // Magias sao somente leitura, com excecao das que expoem `set` proprio.
        const target = getter(scope);
        if (target && typeof target === 'object' && 'set' in (target as object)) {
          (target as { set: (v: unknown) => void }).set(value);
        }
      },
      enumerable: true,
      configurable: true,
    });
    this.magicCache.set(name, container);
    return container;
  }
}

/**
 * Escopo raiz global, compartilhado por elementos sem `v-data`.
 * Os dados sao reativos, entao qualquer valor colocado aqui por `V.data()`
 * ou por `v-resource` atualiza a pagina sozinho.
 */
export const rootScope = new Scope(reactive({}));
