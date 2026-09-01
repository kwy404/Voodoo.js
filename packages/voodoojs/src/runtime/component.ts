/**
 * @module runtime/component
 *
 * Component model. A Voodoo component is a scope with state, methods, computed
 * properties, watchers, props, slots and lifecycle, mounted on an existing
 * element. There is no compilation step.
 *
 * Three ways to use:
 *
 * ```html
 * <div v-component="counter"></div>          <!-- registered -->
 * <counter></counter>                        <!-- custom tag -->
 * <Counter start="10"></Counter>             <!-- PascalCase tag -->
 * ```
 */

import {
  computed as createComputed,
  EffectScope,
  effect as createEffect,
  handleError,
  queuePostFlush,
  reactive,
  watch as createWatch,
} from '../reactivity';
import {
  components,
  config,
  normalizeComponentName,
  type ComponentDefinition,
  type PropDefinition,
} from './registry';
import { warnAlias, warnUnknownComponent, warnRequiredProp } from './avisos';
import { Scope } from './scope';
import {
  addCleanup,
  componentAliases,
  destroy as destroyElement,
  evaluateIn,
  findScope,
  getScope,
  hasDirectives,
  isInitialized,
  parseAttribute,
  restoreAttributes,
  walk as walkElement,
} from './walker';

export interface ComponentInstance {
  $el: HTMLElement;
  $props: Record<string, any>;
  $refs: Record<string, Element>;
  $scope: Scope;
  $parent: ComponentInstance | null;
  $name: string;
  emit(event: string, detail?: unknown): void;
  [key: string]: any;
}

/** Already mounted components, for inspection by devtools. */
export const instances = new Set<ComponentInstance>();

const injectedStyles = new Set<string>();

/**
 * Registers a component.
 *
 * ```js
 * V.component('counter', {
 *   props: { start: { type: 'number', default: 0 } },
 *   state(props) { return { count: props.start } },
 *   computed: { double() { return this.count * 2 } },
 *   methods: { increment() { this.count++ } },
 *   template: `
 *     <button v-click="increment" v-text="count"></button>
 *     <small v-text="double"></small>
 *   `,
 *   mounted() { console.log('mounted') }
 * })
 * ```
 */
export function defineComponent(name: string, definition: ComponentDefinition): void {
  const normalized = normalizeComponentName(name);
  components.set(normalized, definition);
  // Allows `<UserCard>`, which HTML delivers as tag "usercard".
  componentAliases.set(normalized.replace(/-/g, ''), normalized);
  mountPending(normalized);
}

/**
 * Mounts tags that were already on the page waiting for this component.
 *
 * Without this, registering a component after the page loaded would have no
 * effect, which is exactly the most common case: the CDN tag with `defer`
 * runs before the application script.
 */
function mountPending(normalized: string): void {
  if (typeof document === 'undefined' || !document.body) return;

  const noHyphen = normalized.replace(/-/g, '');
  const selectors = [normalized, noHyphen, `[${config.prefix}component="${normalized}"]`];

  for (const selector of selectors) {
    let found: Element[];
    try {
      found = Array.from(document.querySelectorAll(selector));
    } catch {
      continue; // invalid selector for hyphen-free names
    }
    for (const el of found) {
      // Already a mounted component: nothing to do.
      if (getScope(el)?.component) continue;

      // An ancestor not yet processed means the main walk hasn't reached here.
      // Mounting now would bind the tag's attributes to the wrong scope, because
      // the `v-data` above doesn't exist yet: the component's `@event` would
      // write to the root instead of the parent's scope. And since the element
      // would be marked ready, the following walk would skip it and the error
      // would be permanent. Waiting costs nothing, because the walk will mount
      // this element itself, in the right order.
      if (hasPendingAncestor(el)) continue;

      const scope = findScope(el.parentNode);

      // The element may have been walked before the component existed, because
      // of other attributes like `@event`. In that case it was marked ready
      // without ever being mounted, so we unmount and redo.
      if (isInitialized(el)) {
        destroyElement(el);
        // Attributes were already removed from HTML by cleanup, so they need to
        // come back for the walker to see them again.
        restoreAttributes(el);
      }

      walkElement(el, scope);
    }
  }
}

/**
 * `true` when some ancestor still has directives waiting for processing.
 *
 * The signal is the HTML itself: a processed element had its `v-*` attributes
 * removed, so keeping them means the walk didn't pass through there. The
 * `isInitialized` check covers the case where `config.cleanAttributes` is off,
 * where attributes stay in place even after processing.
 */
function hasPendingAncestor(el: Element): boolean {
  let current = el.parentElement;
  while (current && current !== document.body) {
    if (hasDirectives(current) && !isInitialized(current)) return true;
    current = current.parentElement;
  }
  return false;
}

/** Converts the raw attribute value to the type declared in the prop. */
function coerce(value: unknown, def: PropDefinition | undefined): unknown {
  if (!def || !def.type || def.type === 'any') return value;
  if (value == null || value === '') return def.default ?? value;
  switch (def.type) {
    case 'number': {
      const n = Number(value);
      return Number.isNaN(n) ? (def.default ?? value) : n;
    }
    case 'boolean':
      return value === '' || value === 'true' || value === true || value === '1';
    case 'string':
      return String(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    default:
      return value;
  }
}

function propDefinitions(def: ComponentDefinition): Record<string, PropDefinition> {
  const out: Record<string, PropDefinition> = {};
  if (Array.isArray(def.props)) {
    for (const name of def.props) out[name] = { type: 'any' };
  } else if (def.props) {
    Object.assign(out, def.props);
  }
  return out;
}

/** `user-name` and `username` become `userName`. */
function camelize(name: string): string {
  return name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

/**
 * Reads props from the element. Static attributes come in as text, attributes
 * with `:` become reactive effects linked to the parent scope.
 */
function resolveProps(
  el: HTMLElement,
  defs: Record<string, PropDefinition>,
  parentScope: Scope,
  owner: EffectScope,
  componentName: string
): Record<string, any> {
  const props = reactive<Record<string, any>>({});
  const known = Object.keys(defs);
  const lookup = new Map<string, string>();
  for (const key of known) {
    lookup.set(key.toLowerCase(), key);
    lookup.set(normalizeComponentName(key), key);
    lookup.set(camelize(key).toLowerCase(), key);
  }

  // Default values first, so initial state never sees `undefined`.
  for (const key of known) {
    if (defs[key].default !== undefined) props[key] = defs[key].default;
  }

  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    const parsed = parseAttribute(attr.name, attr.value);

    if (parsed && parsed.name === 'bind' && parsed.arg) {
      const target = lookup.get(parsed.arg.toLowerCase()) ?? camelize(parsed.arg);
      if (known.length && !lookup.has(parsed.arg.toLowerCase())) continue;
      owner.run(() =>
        createEffect(() => {
          props[target] = evaluateIn(parsed.expression, parentScope, `:${parsed.arg}`);
        })
      );
      continue;
    }

    if (parsed) continue; // other directives are not props

    const target = lookup.get(attr.name.toLowerCase());
    if (target) props[target] = coerce(attr.value, defs[target]);
    else if (!known.length) props[camelize(attr.name)] = attr.value;
  }

  for (const key of known) {
    if (defs[key].required && props[key] === undefined) {
      warnRequiredProp(el, componentName, key);
    }
  }

  return props;
}

/**
 * Distributes the element's original content into the template's `<slot>` tags.
 * The slot content remains evaluated in the parent scope, like in Vue.
 */
function applySlots(el: HTMLElement, original: DocumentFragment, parentScope: Scope): void {
  const slots = Array.from(el.querySelectorAll('slot'));
  if (!slots.length) return;

  const named = new Map<string, Node[]>();
  const fallback: Node[] = [];

  Array.from(original.childNodes).forEach((node) => {
    const slotName =
      node.nodeType === 1 ? (node as Element).getAttribute('slot') ?? null : null;
    if (slotName) {
      (node as Element).removeAttribute('slot');
      const list = named.get(slotName) ?? [];
      list.push(node);
      named.set(slotName, list);
    } else {
      fallback.push(node);
    }
  });

  for (const slot of slots) {
    const name = slot.getAttribute('name');
    const content = name ? named.get(name) : fallback;
    const frag = document.createDocumentFragment();
    if (content && content.length) {
      for (const node of content) frag.appendChild(node);
    } else {
      // Keeps the default content written inside the `<slot>` itself.
      while (slot.firstChild) frag.appendChild(slot.firstChild);
    }
    // The slot content belongs to the parent scope.
    Array.from(frag.childNodes).forEach((node) => {
      if (node.nodeType === 1) markScope(node, parentScope);
    });
    slot.replaceWith(frag);
  }
}

/** Associates a node with a specific scope before the walker reaches it. */
let scopeMarker: ((node: Node, scope: Scope) => void) | null = null;
export function setScopeMarker(fn: (node: Node, scope: Scope) => void): void {
  scopeMarker = fn;
}
function markScope(node: Node, scope: Scope): void {
  scopeMarker?.(node, scope);
}

/**
 * Mounts a component on an element and returns the resulting scope.
 * Called by the walker when it finds `v-component` or a registered tag.
 */
export function mountComponent(
  el: HTMLElement,
  name: string,
  parentScope: Scope
): Scope | null {
  const normalized = name ? normalizeComponentName(name) : '';
  const definition: ComponentDefinition = normalized
    ? components.get(normalized) ?? components.get(componentAliases.get(normalized) ?? '') ?? {}
    : {};

  if (normalized && !components.has(normalized) && !componentAliases.has(normalized)) {
    // Inline component: unregistered, just an isolated scope.
    warnUnknownComponent(el, name);
  }

  const owner = new EffectScope(true);
  const defs = propDefinitions(definition);
  const props = resolveProps(el, defs, parentScope, owner, normalized || 'inline');

  // Initial state.
  // `data` and `destroyed` still work; the official names are `state` and
  // `unmounted`, and the warning only appears in development.
  if (!definition.state && definition.data) warnAlias('data()', 'state()');
  if (definition.destroyed) warnAlias('destroyed()', 'unmounted()');

  const stateFactory = definition.state ?? definition.data;
  let stateRaw: Record<string, any> = {};

  const instance = {} as ComponentInstance;

  // The component's scope sees the parent only when `inheritScope` is on.
  const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
  const scope = new Scope({}, scopeParent, el);
  scope.component = instance;

  try {
    stateRaw = stateFactory ? stateFactory.call(instance, props) ?? {} : {};
  } catch (err) {
    handleError(err, `state() of component "${name}"`);
  }

  // `v-data` on the same element supplements the component's state.
  const dataAttr = el.getAttribute(`${config.prefix}data`);
  if (dataAttr) {
    const extra = evaluateIn<Record<string, unknown>>(dataAttr, parentScope, 'v-data');
    if (extra && typeof extra === 'object') Object.assign(stateRaw, extra);
  }

  // provide: lives in the scope, descendants find it by walking up the chain.
  if (definition.provide) {
    try {
      const provided =
        typeof definition.provide === 'function'
          ? definition.provide.call(instance)
          : definition.provide;
      if (provided && typeof provided === 'object') {
        scope.provides = { ...provided };
      }
    } catch (err) {
      handleError(err, `provide() of component "${name}"`);
    }
  }

  // inject: reads what an ancestor provided and delivers as initial state.
  if (definition.inject) {
    const requests = Array.isArray(definition.inject)
      ? definition.inject.map((key) => [key, { from: key }] as const)
      : Object.entries(definition.inject).map(
          ([key, options]) => [key, options ?? {}] as const
        );

    for (const [key, options] of requests) {
      const from = (options as { from?: string }).from ?? key;
      const value = parentScope.inject(from, (options as { default?: unknown }).default);
      if (!(key in stateRaw)) stateRaw[key] = value;
    }
  }

  const state = reactive(stateRaw);

  // Computed properties.
  const computedRefs: Record<string, { value: any }> = {};
  if (definition.computed) {
    for (const [key, getter] of Object.entries(definition.computed)) {
      computedRefs[key] = createComputed(() => getter.call(instance));
    }
  }

  // Methods bound to instance.
  const methods: Record<string, Function> = {};
  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      methods[key] = (...args: unknown[]) => fn.apply(instance, args);
    }
  }
  // Functions loose in the definition also become methods, for shorter writing.
  for (const [key, value] of Object.entries(definition)) {
    if (typeof value !== 'function') continue;
    if (LIFECYCLE.has(key) || key === 'state' || key === 'data') continue;
    if (!(key in methods)) methods[key] = (...args: unknown[]) => value.apply(instance, args);
  }

  const emit = (event: string, detail?: unknown): void => {
    const ev = new CustomEvent(event, { detail, bubbles: true, cancelable: true });
    (ev as any).__voodoo = true;
    el.dispatchEvent(ev);
  };

  const special: Record<string, any> = {
    $el: el,
    $props: props,
    $name: normalized || 'inline',
    $scope: scope,
    $parent: parentScope.owner?.component ?? null,
    emit,
    $emit: emit,
    $nextTick: (fn?: () => void) => import('../reactivity').then((m) => m.nextTick(fn)),
    $watch: (source: string, cb: (v: any, o: any) => void) =>
      createWatch(() => evaluateIn(source, scope), cb),
  };

  const handler: ProxyHandler<Record<string, any>> = {
    get(_t, key: string | symbol) {
      if (typeof key === 'symbol') return undefined;
      if (key === '$refs') return scope.allRefs;
      if (key in special) return special[key];
      if (key in computedRefs) return computedRefs[key].value;
      if (key in methods) return methods[key];
      if (key in props) return props[key];
      return state[key];
    },
    set(_t, key: string | symbol, value: unknown) {
      if (typeof key === 'symbol') return true;
      if (key in computedRefs) {
        computedRefs[key].value = value;
        return true;
      }
      if (key in props) {
        props[key] = value;
        return true;
      }
      state[key] = value;
      return true;
    },
    has(_t, key: string | symbol) {
      if (typeof key === 'symbol') return false;
      const k = key as string;
      return (
        k === '$refs' ||
        k in special ||
        k in computedRefs ||
        k in methods ||
        k in props ||
        k in state
      );
    },
    ownKeys() {
      return [
        ...new Set([
          ...Object.keys(state),
          ...Object.keys(props),
          ...Object.keys(methods),
          ...Object.keys(computedRefs),
        ]),
      ];
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  };

  const proxy = new Proxy(instance as Record<string, any>, handler);
  scope.data = proxy;
  // The public instance is the proxy itself, so `this` works in methods.
  Object.setPrototypeOf(instance, proxy);

  // Declared watchers.
  if (definition.watch) {
    for (const [key, cb] of Object.entries(definition.watch)) {
      owner.run(() =>
        createWatch(
          () => (proxy as any)[key],
          (value, old) => cb.call(proxy, value, old)
        )
      );
    }
  }

  // Component styles, injected once.
  if (definition.style && !injectedStyles.has(normalized)) {
    injectedStyles.add(normalized);
    const tag = document.createElement('style');
    tag.setAttribute('data-voodoo-component', normalized);
    tag.textContent = definition.style;
    document.head.appendChild(tag);
  }

  callHook(definition, proxy, 'beforeMount');

  // Template: original content becomes a slot.
  if (definition.template) {
    const original = document.createDocumentFragment();
    while (el.firstChild) original.appendChild(el.firstChild);
    el.innerHTML = definition.template;
    applySlots(el, original, parentScope);
  }

  instances.add(proxy as unknown as ComponentInstance);

  queuePostFlush(() => {
    callHook(definition, proxy, 'mounted');
    if (definition.updated) {
      owner.run(() =>
        createEffect(() => {
          // Read all state to react to any change.
          for (const key of Object.keys(state)) void state[key];
          callHook(definition, proxy, 'updated');
        })
      );
    }
  });

  addCleanup(el, () => {
    callHook(definition, proxy, 'beforeUnmount');
    owner.stop();
    instances.delete(proxy as unknown as ComponentInstance);
    callHook(definition, proxy, 'unmounted');
    callHook(definition, proxy, 'destroyed');
  });

  return scope;
}

const LIFECYCLE = new Set([
  'beforeMount',
  'mounted',
  'updated',
  'beforeUnmount',
  'unmounted',
  'destroyed',
]);

function callHook(def: ComponentDefinition, instance: any, name: string): void {
  const hook = def[name];
  if (typeof hook !== 'function') return;
  try {
    hook.call(instance);
  } catch (err) {
    handleError(err, `hook ${name}`);
  }
}
