/**
 * @module runtime/app
 *
 * Application mode: `createApp(...).mount('#app')`.
 *
 * Voodoo's traditional mode binds attributes to existing HTML. This module adds
 * the alternative path used by Vue and React: the entire application is described
 * in JavaScript, has its own root, and HTML comes from the template.
 *
 * ```js
 * const app = V.createApp({
 *   data: () => ({ n: 0 }),
 *   computed: { dobro() { return this.n * 2 } },
 *   methods: { somar() { this.n++ } },
 *   template: `
 *     <button @click="somar()">Cliques: { n }</button>
 *     <p>Dobro: { dobro }</p>
 *   `
 * })
 *
 * app.mount('#app')
 * ```
 *
 * Two intentional differences from Vue:
 *
 * 1. `mount` accepts a target that doesn't exist yet. No race with page loading,
 *    because Voodoo's own scheduler waits, not `DOMContentLoaded`.
 * 2. `unmount` restores the container to original HTML instead of leaving it empty.
 */

import { handleError } from '../reactivity';
import {
  components,
  config,
  normalizeComponentName,
  usePlugin,
  type ComponentDefinition,
  type VoodooPlugin,
} from './registry';
import { defineComponent, type ComponentInstance } from './component';
import { destroy, getScope, walk } from './walker';
import { rootScope } from './scope';
import { whenElement } from './boot';
import { allowedGlobals } from '../parser/interpreter';

export interface AppOptions extends ComponentDefinition {
  /** Components visible only within this application. */
  components?: Record<string, ComponentDefinition>;
  /** Values delivered to the entire tree, read with `inject`. */
  provide?: Record<string, unknown> | (() => Record<string, unknown>);
}

export interface AppConfig {
  /** Values allowed inside this application's expressions. */
  globalProperties: Record<string, unknown>;
}

export interface App {
  /** Internal name of the root component, useful in messages and inspector. */
  readonly name: string;
  readonly config: AppConfig;
  /** Root instance, or `null` until the application is mounted. */
  readonly instance: ComponentInstance | null;
  /** Element that received the application, or `null`. */
  readonly container: Element | null;
  readonly isMounted: boolean;

  component(name: string): ComponentDefinition | undefined;
  component(name: string, definition: ComponentDefinition): App;
  directive(name: string, definition: unknown): App;
  use(plugin: VoodooPlugin | Function, options?: Record<string, unknown>): App;
  provide(key: string, value: unknown): App;

  /**
   * Mounts the application. The target can be a selector or element, and may
   * not exist yet: in that case mounting happens as soon as it appears.
   */
  mount(target: string | Element): ComponentInstance | null;
  /** Promise resolved with the root instance when mounting happens. */
  whenMounted(): Promise<ComponentInstance>;
  /** Unmount and restore the container to its original content. */
  unmount(): void;
}

let counter = 0;

/** Directive registry, injected by `core.ts` to avoid circular dependency. */
let directiveRegistrar: ((name: string, definition: any) => void) | null = null;

export function setDirectiveRegistrar(fn: (name: string, definition: any) => void): void {
  directiveRegistrar = fn;
}

/**
 * Creates an application. Options are the same as for a component, plus
 * `components` and `provide`.
 */
export function createApp(options: AppOptions = {}): App {
  const name = `voodoo-app-${++counter}`;
  const { components: local, ...root } = options;

  const config_: AppConfig = { globalProperties: {} };
  const provided: Record<string, unknown> = {};
  const registeredByThisApp: string[] = [];

  let container: Element | null = null;
  let originalHTML = '';
  let instance: ComponentInstance | null = null;
  let waiting: Array<(i: ComponentInstance) => void> = [];

  /** Register in global registry what doesn't exist yet, and note what we created. */
  function registerLocal(): void {
    if (!local) return;
    for (const [name, definition] of Object.entries(local)) {
      const normalized = normalizeComponentName(name);
      if (components.has(normalized)) continue;
      defineComponent(normalized, definition);
      registeredByThisApp.push(normalized);
    }
  }

  function mountOn(el: Element): ComponentInstance | null {
    if (instance) return instance;

    container = el;
    originalHTML = el.innerHTML;

    Object.assign(allowedGlobals, config_.globalProperties);
    registerLocal();

    // The root component enters the registry with its own name, and the walker does
    // the rest: template, slots, props, lifecycle, and traversing children.
    const definition: ComponentDefinition = { ...root };
    if (Object.keys(provided).length) {
      const previous = definition.provide;
      definition.provide = () => ({
        ...(typeof previous === 'function' ? previous() : previous ?? {}),
        ...provided,
      });
    }
    defineComponent(name, definition);

    el.setAttribute(`${config.prefix}component`, name);

    try {
      walk(el, rootScope);
    } catch (err) {
      handleError(err, `application mounting "${name}"`);
      return null;
    }

    instance = (getScope(el)?.component as ComponentInstance) ?? null;

    if (instance) {
      const queue = waiting;
      waiting = [];
      for (const resolver of queue) resolver(instance);
    }

    return instance;
  }

  const app: App = {
    name,
    config: config_,

    get instance() {
      return instance;
    },
    get container() {
      return container;
    },
    get isMounted() {
      return instance !== null;
    },

    component(name: string, definition?: ComponentDefinition): any {
      const normalized = normalizeComponentName(name);
      if (definition === undefined) {
        return (local && local[name]) ?? components.get(normalized);
      }
      if (local) local[name] = definition;
      else (options as AppOptions).components = { [name]: definition };
      // After mounting, register immediately: the walker mounts tags that
      // were already waiting for this component.
      if (instance && !components.has(normalized)) {
        defineComponent(normalized, definition);
        registeredByThisApp.push(normalized);
      }
      return app;
    },

    directive(name: string, definition: unknown): App {
      directiveRegistrar?.(name, definition);
      return app;
    },

    use(plugin: VoodooPlugin | Function, options?: Record<string, unknown>): App {
      usePlugin(globalThis_V(), plugin as any, options);
      return app;
    },

    provide(key: string, value: unknown): App {
      provided[key] = value;
      return app;
    },

    mount(target: string | Element): ComponentInstance | null {
      if (instance) return instance;

      if (typeof target !== 'string') return mountOn(target);

      let result: ComponentInstance | null = null;
      whenElement(
        target,
        (el) => {
          result = mountOn(el);
        },
        () => {
          // eslint-disable-next-line no-console
          console.warn(
            `[Voodoo] createApp().mount("${target}") did not find the element. ` +
              'The application remains unmounted.'
          );
        }
      );
      return result;
    },

    whenMounted(): Promise<ComponentInstance> {
      if (instance) return Promise.resolve(instance);
      return new Promise((resolve) => waiting.push(resolve));
    },

    unmount(): void {
      if (!container) return;

      destroy(container);
      container.removeAttribute(`${config.prefix}component`);
      container.innerHTML = originalHTML;

      components.delete(name);
      for (const name of registeredByThisApp) components.delete(name);
      registeredByThisApp.length = 0;

      instance = null;
      container = null;
    },
  };

  return app;
}

/** The `V` object, published by `core.ts`. Avoids circular import. */
let objectV: any = null;
export function setAppHost(V: any): void {
  objectV = V;
}
function globalThis_V(): any {
  return objectV;
}
