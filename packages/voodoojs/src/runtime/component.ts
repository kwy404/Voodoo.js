/**
 * @module runtime/component
 *
 * Modelo de componentes. Um componente da Voodoo e um escopo com estado,
 * metodos, computados, watchers, props, slots e ciclo de vida, montado sobre um
 * elemento existente. Nao existe passo de compilacao.
 *
 * Tres formas de uso:
 *
 * ```html
 * <div v-component="counter"></div>          <!-- registrado -->
 * <counter></counter>                        <!-- tag propria -->
 * <Counter start="10"></Counter>             <!-- tag em PascalCase -->
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
import { Scope } from './scope';
import {
  addCleanup,
  componentAliases,
  destroy as destroyElement,
  evaluateIn,
  findScope,
  getScope,
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

/** Componentes ja montados, para inspecao pelas devtools. */
export const instances = new Set<ComponentInstance>();

const injectedStyles = new Set<string>();

/**
 * Registra um componente.
 *
 * ```js
 * V.component('counter', {
 *   props: { start: { type: 'number', default: 0 } },
 *   state(props) { return { count: props.start } },
 *   computed: { dobro() { return this.count * 2 } },
 *   methods: { increment() { this.count++ } },
 *   template: `
 *     <button v-click="increment" v-text="count"></button>
 *     <small v-text="dobro"></small>
 *   `,
 *   mounted() { console.log('montado') }
 * })
 * ```
 */
export function defineComponent(name: string, definition: ComponentDefinition): void {
  const normalized = normalizeComponentName(name);
  components.set(normalized, definition);
  // Permite `<UserCard>`, que o HTML entrega como tag "usercard".
  componentAliases.set(normalized.replace(/-/g, ''), normalized);
  mountPending(normalized);
}

/**
 * Monta as tags que ja estavam na pagina esperando por este componente.
 *
 * Sem isso, registrar um componente depois que a pagina carregou nao teria
 * efeito nenhum, o que e justamente o caso mais comum: a tag do CDN com
 * `defer` roda antes do script da aplicacao.
 */
function mountPending(normalized: string): void {
  if (typeof document === 'undefined' || !document.body) return;

  const semHifen = normalized.replace(/-/g, '');
  const seletores = [normalized, semHifen, `[${config.prefix}component="${normalized}"]`];

  for (const seletor of seletores) {
    let encontrados: Element[];
    try {
      encontrados = Array.from(document.querySelectorAll(seletor));
    } catch {
      continue; // seletor invalido para nomes sem hifen
    }
    for (const el of encontrados) {
      // Ja e um componente montado: nada a fazer.
      if (getScope(el)?.component) continue;

      const escopo = findScope(el.parentNode);

      // O elemento pode ter sido percorrido antes do componente existir, por
      // causa de outros atributos como `@evento`. Nesse caso ele foi marcado
      // como pronto sem nunca ter sido montado, entao desmontamos e refazemos.
      if (isInitialized(el)) {
        destroyElement(el);
        // Os atributos ja tinham sido retirados do HTML pela limpeza, entao
        // precisam voltar para que o walker os enxergue de novo.
        restoreAttributes(el);
      }

      walkElement(el, escopo);
    }
  }
}

/** Converte o valor bruto de um atributo para o tipo declarado na prop. */
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

/** `user-name` e `username` viram `userName`. */
function camelize(name: string): string {
  return name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

/**
 * Le as props do elemento. Atributos estaticos entram como texto, atributos com
 * `:` viram efeitos reativos ligados ao escopo do pai.
 */
function resolveProps(
  el: HTMLElement,
  defs: Record<string, PropDefinition>,
  parentScope: Scope,
  owner: EffectScope
): Record<string, any> {
  const props = reactive<Record<string, any>>({});
  const known = Object.keys(defs);
  const lookup = new Map<string, string>();
  for (const key of known) {
    lookup.set(key.toLowerCase(), key);
    lookup.set(normalizeComponentName(key), key);
    lookup.set(camelize(key).toLowerCase(), key);
  }

  // Valores padrao primeiro, para que o estado inicial nunca veja `undefined`.
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

    if (parsed) continue; // demais directives nao sao props

    const target = lookup.get(attr.name.toLowerCase());
    if (target) props[target] = coerce(attr.value, defs[target]);
    else if (!known.length) props[camelize(attr.name)] = attr.value;
  }

  for (const key of known) {
    if (defs[key].required && props[key] === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`[Voodoo] prop obrigatoria ausente: "${key}"`);
    }
  }

  return props;
}

/**
 * Distribui o conteudo original do elemento nos `<slot>` do template.
 * O conteudo do slot continua avaliado no escopo do pai, como no Vue.
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
      // Mantem o conteudo padrao escrito dentro do proprio `<slot>`.
      while (slot.firstChild) frag.appendChild(slot.firstChild);
    }
    // O conteudo do slot pertence ao escopo do pai.
    Array.from(frag.childNodes).forEach((node) => {
      if (node.nodeType === 1) markScope(node, parentScope);
    });
    slot.replaceWith(frag);
  }
}

/** Associa um no a um escopo especifico antes do walker chegar nele. */
let scopeMarker: ((node: Node, scope: Scope) => void) | null = null;
export function setScopeMarker(fn: (node: Node, scope: Scope) => void): void {
  scopeMarker = fn;
}
function markScope(node: Node, scope: Scope): void {
  scopeMarker?.(node, scope);
}

/**
 * Monta um componente sobre um elemento e devolve o escopo resultante.
 * Chamado pelo walker quando encontra `v-component` ou uma tag registrada.
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
    // Componente inline: sem registro, apenas escopo isolado.
    if (config.devtools) {
      // eslint-disable-next-line no-console
      console.warn(`[Voodoo] componente "${name}" nao registrado, usando escopo inline.`);
    }
  }

  const owner = new EffectScope(true);
  const defs = propDefinitions(definition);
  const props = resolveProps(el, defs, parentScope, owner);

  // Estado inicial.
  const stateFactory = definition.state ?? definition.data;
  let stateRaw: Record<string, any> = {};

  const instance = {} as ComponentInstance;

  // O escopo do componente enxerga o pai apenas quando `inheritScope` e ligado.
  const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
  const scope = new Scope({}, scopeParent, el);
  scope.component = instance;

  try {
    stateRaw = stateFactory ? stateFactory.call(instance, props) ?? {} : {};
  } catch (err) {
    handleError(err, `state() do componente "${name}"`);
  }

  // `v-data` no mesmo elemento complementa o estado do componente.
  const dataAttr = el.getAttribute(`${config.prefix}data`);
  if (dataAttr) {
    const extra = evaluateIn<Record<string, unknown>>(dataAttr, parentScope, 'v-data');
    if (extra && typeof extra === 'object') Object.assign(stateRaw, extra);
  }

  const state = reactive(stateRaw);

  // Computados.
  const computedRefs: Record<string, { value: any }> = {};
  if (definition.computed) {
    for (const [key, getter] of Object.entries(definition.computed)) {
      computedRefs[key] = createComputed(() => getter.call(instance));
    }
  }

  // Metodos ligados a instancia.
  const methods: Record<string, Function> = {};
  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      methods[key] = (...args: unknown[]) => fn.apply(instance, args);
    }
  }
  // Funcoes soltas na definicao tambem viram metodos, para escrita mais curta.
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
  // A instancia publica e o proprio proxy, para que `this` funcione nos metodos.
  Object.setPrototypeOf(instance, proxy);

  // Watchers declarados.
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

  // Estilo do componente, injetado uma vez.
  if (definition.style && !injectedStyles.has(normalized)) {
    injectedStyles.add(normalized);
    const tag = document.createElement('style');
    tag.setAttribute('data-voodoo-component', normalized);
    tag.textContent = definition.style;
    document.head.appendChild(tag);
  }

  callHook(definition, proxy, 'beforeMount');

  // Template: o conteudo original vira slot.
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
          // Le todo o estado para reagir a qualquer mudanca.
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
