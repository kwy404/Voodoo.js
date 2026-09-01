/**
 * @module runtime/scope
 *
 * Scope chain. Each `v-data`, each component, and each iteration of `v-for`
 * creates a child scope. Identifier lookup travels up the chain to the root, and
 * if nothing is found, falls back to magic variables (`$store`, `$el`, ...).
 */

import type { EvalScope } from '../parser/interpreter';
import { reactive } from '../reactivity';

export type MagicGetter = (scope: Scope) => unknown;

/** Global registry of magic variables, filled by modules. */
export const magics = new Map<string, MagicGetter>();

/** Register a magic variable available in any expression. */
export function magic(name: string, getter: MagicGetter): void {
  magics.set(name.startsWith('$') ? name : `$${name}`, getter);
}

export class Scope implements EvalScope {
  /** Data local to this scope, normally a reactive proxy. */
  data: Record<string, any>;
  parent: Scope | null;
  /** Element that created the scope. Used by `$el` and `$refs`. */
  el: Element | null;
  /** References declared with `v-ref` within this scope. */
  refs: Record<string, Element> = {};
  /** Component instance, when this scope belongs to one. */
  component: any = null;
  /** Values delivered by `provide`, visible to lower scopes. */
  provides: Record<string, unknown> | null = null;

  private magicCache: Map<string, Record<string, unknown>> | null = null;

  constructor(data: Record<string, any> = {}, parent: Scope | null = null, el: Element | null = null) {
    this.data = data;
    this.parent = parent;
    this.el = el;
  }

  /** Root scope of the chain. */
  get root(): Scope {
    let s: Scope = this;
    while (s.parent) s = s.parent;
    return s;
  }

  /** Look up a `provide` value by traveling up the scope chain. */
  inject<T = unknown>(key: string, fallback?: T): T | undefined {
    let s: Scope | null = this;
    while (s) {
      if (s.provides && key in s.provides) return s.provides[key] as T;
      s = s.parent;
    }
    return fallback;
  }

  /** Nearest component scope, traveling up the chain. */
  get owner(): Scope | null {
    let s: Scope | null = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }

  /** Set of visible refs, merging ancestor scopes. */
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

  /** Create a reactive child scope, used by `v-data` and `v-for`. */
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
        // Magic variables are read-only, except those that expose their own `set`.
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
 * Global root scope, shared by elements without `v-data`.
 * The data is reactive, so any value placed here by `V.data()` or `v-resource`
 * automatically updates the page.
 */
export const rootScope = new Scope(reactive({}));
