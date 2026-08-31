/**
 * @module reactivity
 *
 * Nucleo reativo da Voodoo.js.
 *
 * Modelo: Proxy + rastreamento de dependencias por chave, com agendamento em
 * microtask. Nao existe Virtual DOM. Quando `count` muda, apenas os efeitos que
 * leram `count` sao reexecutados, e cada efeito atualiza somente o no do DOM
 * que ele mesmo escreveu.
 *
 * Este modulo nao toca no DOM e nao assume `window`, entao funciona em Node,
 * Bun e Deno sem adaptacao.
 */

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

export type Dep = Set<ReactiveEffect>;
export type EffectScheduler = () => void;

export interface EffectOptions {
  /** Executa em vez do proprio efeito quando uma dependencia muda. */
  scheduler?: EffectScheduler;
  /** Nao executa imediatamente na criacao. */
  lazy?: boolean;
  /** Chamado quando o efeito e parado. */
  onStop?: () => void;
  /** Escopo dono do efeito, para limpeza automatica. */
  scope?: EffectScope;
}

export interface Ref<T = any> {
  value: T;
  readonly __v_isRef: true;
}

export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T;
  readonly effect: ReactiveEffect;
}

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: 'pre' | 'post' | 'sync';
}

export type WatchStopHandle = () => void;

// ---------------------------------------------------------------------------
// Agendador (scheduler)
// ---------------------------------------------------------------------------

const resolvedPromise = /* @__PURE__ */ Promise.resolve();

let queue: ReactiveEffect[] = [];
let postQueue: Array<() => void> = [];
let isFlushing = false;
let isFlushPending = false;
let flushPromise: Promise<void> | null = null;

/** Numero maximo de reexecucoes do mesmo efeito em um flush, para achar loops. */
const RECURSION_LIMIT = 100;

/**
 * Resolve depois que a fila de atualizacoes for aplicada ao DOM.
 *
 * ```js
 * count.value++
 * await V.nextTick()
 * // o DOM ja refletiu a mudanca
 * ```
 */
export function nextTick<T = void>(fn?: () => T): Promise<T | void> {
  const p = flushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}

export function queueJob(job: ReactiveEffect): void {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}

/** Agenda um callback para rodar depois que o DOM foi atualizado. */
export function queuePostFlush(cb: () => void): void {
  postQueue.push(cb);
  queueFlush();
}

function queueFlush(): void {
  if (isFlushing || isFlushPending) return;
  isFlushPending = true;
  flushPromise = resolvedPromise.then(flushJobs);
}

function flushJobs(): void {
  isFlushPending = false;
  isFlushing = true;
  const counts = new Map<ReactiveEffect, number>();

  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      if (!job.active) continue;

      const count = (counts.get(job) || 0) + 1;
      counts.set(job, count);
      if (count > RECURSION_LIMIT) {
        warn(
          'Loop infinito de atualizacao detectado. Um efeito reativo esta se ' +
            'disparando de novo sem parar. Verifique se alguma expressao escreve ' +
            'em um estado que ela mesma le.'
        );
        continue;
      }
      try {
        job.run();
      } catch (err) {
        handleError(err, 'effect');
      }
    }
  } finally {
    queue = [];
    isFlushing = false;

    const posts = postQueue;
    postQueue = [];
    for (const cb of posts) {
      try {
        cb();
      } catch (err) {
        handleError(err, 'post-flush');
      }
    }

    // Efeitos enfileirados durante o post flush entram em um novo ciclo.
    if (queue.length || postQueue.length) {
      flushPromise = resolvedPromise.then(flushJobs);
      isFlushPending = true;
    } else {
      flushPromise = null;
    }
  }
}

/** Aplica imediatamente tudo que estiver pendente. Util em testes. */
export function flushSync(): void {
  if (isFlushing) return;
  isFlushPending = false;
  flushJobs();
}

// ---------------------------------------------------------------------------
// Tratamento de erro
// ---------------------------------------------------------------------------

type ErrorHandler = (err: unknown, context: string) => void;

let errorHandler: ErrorHandler | null = null;

export function setErrorHandler(fn: ErrorHandler | null): void {
  errorHandler = fn;
}

export function handleError(err: unknown, context: string): void {
  if (errorHandler) {
    errorHandler(err, context);
    return;
  }
  // eslint-disable-next-line no-console
  console.error(`[Voodoo] erro em ${context}:`, err);
}

export function warn(msg: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(`[Voodoo] ${msg}`, ...args);
}

// ---------------------------------------------------------------------------
// Efeitos
// ---------------------------------------------------------------------------

let activeEffect: ReactiveEffect | undefined;
let shouldTrack = true;
const trackStack: boolean[] = [];

export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function enableTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

export function resetTracking(): void {
  shouldTrack = trackStack.pop() ?? true;
}

export function getActiveEffect(): ReactiveEffect | undefined {
  return activeEffect;
}

let effectId = 0;

export class ReactiveEffect<T = any> {
  readonly id = effectId++;
  active = true;
  deps: Dep[] = [];
  parent: ReactiveEffect | undefined = undefined;
  scheduler: EffectScheduler | undefined;
  onStop: (() => void) | undefined;
  /** Callbacks de limpeza registrados pelo proprio efeito. */
  cleanups: Array<() => void> = [];

  constructor(public fn: () => T, options?: EffectOptions) {
    this.scheduler = options?.scheduler;
    this.onStop = options?.onStop;
    const scope = options?.scope ?? activeScope;
    if (scope) scope.effects.push(this);
  }

  run(): T | undefined {
    if (!this.active) return this.fn();

    // Impede recursao direta do mesmo efeito.
    let parent: ReactiveEffect | undefined = activeEffect;
    while (parent) {
      if (parent === this) return undefined;
      parent = parent.parent;
    }

    this.runCleanups();

    try {
      this.parent = activeEffect;
      activeEffect = this;
      enableTracking();
      cleanupDeps(this);
      return this.fn();
    } finally {
      resetTracking();
      activeEffect = this.parent;
      this.parent = undefined;
    }
  }

  /** Registra uma funcao chamada antes da proxima execucao e ao parar. */
  onInvalidate(fn: () => void): void {
    this.cleanups.push(fn);
  }

  private runCleanups(): void {
    if (!this.cleanups.length) return;
    const list = this.cleanups;
    this.cleanups = [];
    for (const fn of list) {
      try {
        fn();
      } catch (err) {
        handleError(err, 'effect cleanup');
      }
    }
  }

  stop(): void {
    if (!this.active) return;
    cleanupDeps(this);
    this.runCleanups();
    this.active = false;
    this.onStop?.();
  }
}

function cleanupDeps(effect: ReactiveEffect): void {
  const { deps } = effect;
  for (let i = 0; i < deps.length; i++) deps[i].delete(effect);
  deps.length = 0;
}

export interface EffectRunner<T = any> {
  (): T | undefined;
  effect: ReactiveEffect<T>;
}

/**
 * Cria um efeito reativo. Executa uma vez na criacao e reexecuta sempre que
 * qualquer estado lido dentro dele mudar.
 *
 * ```js
 * const state = V.reactive({ count: 0 })
 * V.effect(() => console.log(state.count))
 * state.count++ // dispara o log
 * ```
 */
export function effect<T = any>(fn: () => T, options?: EffectOptions): EffectRunner<T> {
  const e = new ReactiveEffect(fn, options);
  if (!options?.lazy) e.run();
  const runner = (() => e.run()) as EffectRunner<T>;
  runner.effect = e;
  return runner;
}

export function stop(runner: EffectRunner | ReactiveEffect): void {
  if (runner instanceof ReactiveEffect) runner.stop();
  else runner.effect.stop();
}

// ---------------------------------------------------------------------------
// Escopos de efeito (limpeza em lote)
// ---------------------------------------------------------------------------

let activeScope: EffectScope | undefined;

export class EffectScope {
  effects: ReactiveEffect[] = [];
  cleanups: Array<() => void> = [];
  children: EffectScope[] = [];
  active = true;
  parent: EffectScope | undefined;

  constructor(detached = false) {
    if (!detached && activeScope) {
      this.parent = activeScope;
      activeScope.children.push(this);
    }
  }

  run<T>(fn: () => T): T | undefined {
    if (!this.active) return undefined;
    const prev = activeScope;
    try {
      activeScope = this;
      return fn();
    } finally {
      activeScope = prev;
    }
  }

  onDispose(fn: () => void): void {
    this.cleanups.push(fn);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    for (const e of this.effects) e.stop();
    for (const c of this.children) c.stop();
    for (const fn of this.cleanups) {
      try {
        fn();
      } catch (err) {
        handleError(err, 'scope cleanup');
      }
    }
    this.effects.length = 0;
    this.children.length = 0;
    this.cleanups.length = 0;
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      if (i > -1) this.parent.children.splice(i, 1);
    }
  }
}

export function effectScope(detached = false): EffectScope {
  return new EffectScope(detached);
}

export function getActiveScope(): EffectScope | undefined {
  return activeScope;
}

// ---------------------------------------------------------------------------
// Rastreamento
// ---------------------------------------------------------------------------

export const ITERATE_KEY = Symbol('voodoo:iterate');

type TargetMap = WeakMap<object, Map<PropertyKey, Dep>>;
const targetMap: TargetMap = new WeakMap();

export function track(target: object, key: PropertyKey): void {
  if (!shouldTrack || !activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, (dep = new Set()));
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export const enum TriggerType {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
}

export function trigger(
  target: object,
  type: TriggerType,
  key?: PropertyKey,
  _newValue?: unknown
): void {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effects = new Set<ReactiveEffect>();
  const add = (dep: Dep | undefined): void => {
    if (!dep) return;
    for (const e of dep) if (e !== activeEffect || type === TriggerType.CLEAR) effects.add(e);
  };

  if (type === TriggerType.CLEAR) {
    depsMap.forEach(add);
  } else {
    if (key !== undefined) add(depsMap.get(key));

    const isArr = Array.isArray(target);
    if (type === TriggerType.ADD) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
      else if (isIntegerKey(key)) add(depsMap.get('length'));
    } else if (type === TriggerType.DELETE) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
    } else if (isArr && key === 'length') {
      const newLen = Number(_newValue);
      depsMap.forEach((dep, k) => {
        if (k === 'length' || (typeof k !== 'symbol' && Number(k) >= newLen)) add(dep);
      });
    }
  }

  for (const e of effects) {
    if (e.scheduler) e.scheduler();
    else queueJob(e);
  }
}

function isIntegerKey(key: PropertyKey | undefined): boolean {
  return (
    typeof key === 'string' && key !== 'NaN' && key[0] !== '-' && String(parseInt(key, 10)) === key
  );
}

// ---------------------------------------------------------------------------
// reactive()
// ---------------------------------------------------------------------------

const RAW = Symbol('voodoo:raw');
const IS_REACTIVE = Symbol('voodoo:isReactive');
const SKIP = Symbol('voodoo:skip');

const reactiveMap = new WeakMap<object, any>();

const arrayInstrumentations: Record<string, Function> = /* @__PURE__ */ (() => {
  const inst: Record<string, Function> = {};
  for (const key of ['includes', 'indexOf', 'lastIndexOf'] as const) {
    inst[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any[];
      for (let i = 0; i < arr.length; i++) track(arr, String(i));
      const res = (arr[key] as Function).apply(arr, args);
      if (res === -1 || res === false) {
        return (arr[key] as Function).apply(arr, args.map(toRaw));
      }
      return res;
    };
  }
  for (const key of ['push', 'pop', 'shift', 'unshift', 'splice'] as const) {
    inst[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking();
      try {
        return (toRaw(this) as any)[key].apply(this, args);
      } finally {
        resetTracking();
      }
    };
  }
  return inst;
})();

function isObject(val: unknown): val is Record<PropertyKey, any> {
  return val !== null && typeof val === 'object';
}

const NON_REACTIVE = /* @__PURE__ */ new Set([
  'Date',
  'RegExp',
  'Promise',
  'Error',
  'File',
  'FileList',
  'Blob',
  'FormData',
  'URL',
  'URLSearchParams',
  'ArrayBuffer',
  'DataView',
]);

function canObserve(value: unknown): boolean {
  if (!isObject(value)) return false;
  if ((value as any)[SKIP]) return false;
  if (Object.isFrozen(value)) return false;
  if (typeof Node !== 'undefined' && value instanceof Node) return false;
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  if (NON_REACTIVE.has(tag)) return false;
  return tag === 'Object' || tag === 'Array' || tag === 'Map' || tag === 'Set';
}

/** Marca um objeto para nunca ser transformado em proxy reativo. */
export function markRaw<T extends object>(value: T): T {
  Object.defineProperty(value, SKIP, { value: true, enumerable: false, configurable: true });
  return value;
}

/** Devolve o objeto original por tras de um proxy reativo. */
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as any)[RAW];
  return raw ? toRaw(raw) : observed;
}

export function isReactive(value: unknown): boolean {
  return !!(value && (value as any)[IS_REACTIVE]);
}

/**
 * Torna um objeto reativo em profundidade.
 *
 * ```js
 * const state = V.reactive({ user: { name: 'Ana' }, tags: [] })
 * state.user.name = 'Bia'  // dispara efeitos que leram user.name
 * state.tags.push('novo')  // dispara efeitos que leram tags
 * ```
 */
export function reactive<T extends object>(target: T): T {
  if (!isObject(target)) return target;
  if (isReactive(target)) return target;
  if (!canObserve(target)) return target;

  const existing = reactiveMap.get(target);
  if (existing) return existing;

  // `WeakMap` e `WeakSet` ficaram de fora de proposito. Eles nao expoem `size`,
  // iteracao nem `forEach`, entao nao existe leitura de conjunto para rastrear:
  // um efeito so poderia depender de uma chave que ele ja tem em maos. Alem
  // disso `canObserve()` nem deixa esses alvos chegarem aqui, o que fazia o
  // teste antigo por `instanceof WeakMap` ser codigo morto. Continua valendo o
  // contrato geral: o que nao da para observar volta como esta.
  const isMapOrSet = target instanceof Map || target instanceof Set;

  const proxy = new Proxy(
    target,
    isMapOrSet ? (collectionHandlers as ProxyHandler<T>) : (baseHandlers as ProxyHandler<T>)
  );
  reactiveMap.set(target, proxy);
  return proxy;
}

const baseHandlers: ProxyHandler<Record<PropertyKey, any>> = {
  get(target, key, receiver) {
    if (key === RAW) return target;
    if (key === IS_REACTIVE) return true;

    const isArr = Array.isArray(target);
    if (isArr && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }

    const res = Reflect.get(target, key, receiver);

    if (typeof key === 'symbol') return res;

    track(target, key);

    if (isRef(res)) return isArr && isIntegerKey(key) ? res : res.value;
    if (isObject(res)) return reactive(res);
    return res;
  },

  set(target, key, value, receiver) {
    const oldValue = (target as any)[key];
    value = toRaw(value);

    if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }

    const hadKey = Array.isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key);

    const result = Reflect.set(target, key, value, receiver);
    if (target === toRaw(receiver)) {
      if (!hadKey) trigger(target, TriggerType.ADD, key, value);
      else if (hasChanged(value, oldValue)) trigger(target, TriggerType.SET, key, value);
    }
    return result;
  },

  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) trigger(target, TriggerType.DELETE, key);
    return result;
  },

  has(target, key) {
    const result = Reflect.has(target, key);
    if (typeof key !== 'symbol') track(target, key);
    return result;
  },

  ownKeys(target) {
    track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
};

/** Handlers para Map e Set. */
const collectionHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === RAW) return target;
    if (key === IS_REACTIVE) return true;

    const raw = target as Map<any, any> & Set<any>;

    if (key === 'size') {
      track(raw, ITERATE_KEY);
      return Reflect.get(raw, 'size', raw);
    }

    const methods: Record<string, Function> = {
      get(k: any) {
        track(raw, k);
        const v = raw.get(k);
        return isObject(v) ? reactive(v) : v;
      },
      has(k: any) {
        track(raw, k);
        return raw.has(k);
      },
      add(v: any) {
        v = toRaw(v);
        const had = raw.has(v);
        raw.add(v);
        if (!had) trigger(raw, TriggerType.ADD, v, v);
        return receiver;
      },
      set(k: any, v: any) {
        const had = raw.has(k);
        const old = raw.get(k);
        raw.set(k, toRaw(v));
        if (!had) trigger(raw, TriggerType.ADD, k, v);
        else if (hasChanged(v, old)) trigger(raw, TriggerType.SET, k, v);
        return receiver;
      },
      delete(k: any) {
        const had = raw.has(k);
        const res = raw.delete(k);
        if (had) trigger(raw, TriggerType.DELETE, k);
        return res;
      },
      clear() {
        const had = raw.size !== 0;
        const res = (raw as any).clear();
        if (had) trigger(raw, TriggerType.CLEAR);
        return res;
      },
      forEach(cb: Function, thisArg: any) {
        track(raw, ITERATE_KEY);
        return raw.forEach((v: any, k: any) => {
          cb.call(thisArg, isObject(v) ? reactive(v) : v, isObject(k) ? reactive(k) : k, receiver);
        });
      },
    };

    if (key in methods) return methods[key as string];

    if (key === Symbol.iterator || key === 'keys' || key === 'values' || key === 'entries') {
      track(raw, ITERATE_KEY);
      const method = (raw as any)[key];
      return typeof method === 'function' ? method.bind(raw) : method;
    }

    const res = Reflect.get(raw, key, raw);
    return typeof res === 'function' ? res.bind(raw) : res;
  },
};

export function hasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue);
}

// ---------------------------------------------------------------------------
// ref()
// ---------------------------------------------------------------------------

export function isRef<T>(r: unknown): r is Ref<T> {
  return !!(r && (r as any).__v_isRef === true);
}

class RefImpl<T> {
  readonly __v_isRef = true as const;
  private _value: T;
  private _rawValue: T;
  dep: Dep = new Set();

  constructor(value: T, private readonly shallow = false) {
    this._rawValue = toRaw(value);
    this._value = shallow ? value : (maybeReactive(value) as T);
  }

  get value(): T {
    trackRefValue(this);
    return this._value;
  }

  set value(newVal: T) {
    const raw = toRaw(newVal);
    if (hasChanged(raw, this._rawValue)) {
      this._rawValue = raw;
      this._value = this.shallow ? newVal : (maybeReactive(newVal) as T);
      triggerRefValue(this);
    }
  }
}

function maybeReactive(value: unknown): unknown {
  return isObject(value) ? reactive(value) : value;
}

function trackRefValue(ref: { dep: Dep }): void {
  if (!shouldTrack || !activeEffect) return;
  if (!ref.dep.has(activeEffect)) {
    ref.dep.add(activeEffect);
    activeEffect.deps.push(ref.dep);
  }
}

function triggerRefValue(ref: { dep: Dep }): void {
  for (const e of [...ref.dep]) {
    if (e.scheduler) e.scheduler();
    else queueJob(e);
  }
}

/**
 * Referencia reativa para valores primitivos.
 *
 * ```js
 * const count = V.ref(0)
 * V.effect(() => console.log(count.value))
 * count.value++
 * ```
 */
export function ref<T>(value: T): Ref<T> {
  return new RefImpl(value) as unknown as Ref<T>;
}

export function shallowRef<T>(value: T): Ref<T> {
  return new RefImpl(value, true) as unknown as Ref<T>;
}

export function unref<T>(value: T | Ref<T>): T {
  return isRef(value) ? value.value : value;
}

// ---------------------------------------------------------------------------
// computed()
// ---------------------------------------------------------------------------

class ComputedRefImpl<T> {
  readonly __v_isRef = true as const;
  private _value!: T;
  private _dirty = true;
  readonly effect: ReactiveEffect<T>;
  dep: Dep = new Set();

  constructor(
    getter: () => T,
    private readonly setter?: (v: T) => void
  ) {
    this.effect = new ReactiveEffect(getter, {
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true;
          triggerRefValue(this);
        }
      },
    });
  }

  get value(): T {
    trackRefValue(this);
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run() as T;
    }
    return this._value;
  }

  set value(v: T) {
    if (this.setter) this.setter(v);
    else warn('computed e somente leitura quando nao ha setter.');
  }

  stop(): void {
    this.effect.stop();
  }
}

/**
 * Valor derivado com cache. So recalcula quando alguma dependencia muda.
 *
 * ```js
 * const full = V.computed(() => `${state.first} ${state.last}`)
 * full.value
 * ```
 */
export function computed<T>(
  getterOrOptions: (() => T) | { get: () => T; set: (v: T) => void }
): ComputedRef<T> {
  const isFn = typeof getterOrOptions === 'function';
  const getter = isFn ? getterOrOptions : getterOrOptions.get;
  const setter = isFn ? undefined : getterOrOptions.set;
  return new ComputedRefImpl(getter, setter) as unknown as ComputedRef<T>;
}

// ---------------------------------------------------------------------------
// watch()
// ---------------------------------------------------------------------------

export type WatchSource<T = any> = Ref<T> | (() => T) | object;
export type WatchCallback<T = any> = (
  value: T,
  oldValue: T | undefined,
  onInvalidate: (fn: () => void) => void
) => void;

/**
 * Observa uma fonte reativa e chama o callback quando ela muda.
 *
 * ```js
 * V.watch(() => state.search, (novo, antigo) => buscar(novo))
 * ```
 */
export function watch<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T>,
  options: WatchOptions = {}
): WatchStopHandle {
  const { immediate = false, deep = false, flush = 'pre' } = options;

  let getter: () => any;
  if (isRef(source)) getter = () => (source as Ref<T>).value;
  else if (typeof source === 'function') getter = source as () => T;
  else if (isReactive(source)) getter = () => traverse(source);
  else getter = () => source;

  if (deep) {
    const base = getter;
    getter = () => traverse(base());
  }

  let oldValue: any;
  let cleanupFn: (() => void) | undefined;
  const onInvalidate = (fn: () => void): void => {
    cleanupFn = fn;
  };

  const job = (): void => {
    if (!runner.effect.active) return;
    const newValue = runner();
    if (deep || hasChanged(newValue, oldValue)) {
      cleanupFn?.();
      cleanupFn = undefined;
      cb(newValue, oldValue, onInvalidate);
      oldValue = newValue;
    }
  };

  const scheduler =
    flush === 'sync' ? job : flush === 'post' ? () => queuePostFlush(job) : () => queueJob(runner.effect as any);

  // Para flush 'pre' o proprio efeito e reagendado e o job roda dentro dele.
  const runner =
    flush === 'pre'
      ? effect(getter, {
          lazy: true,
          scheduler: () => queuePostFlush(job),
        })
      : effect(getter, { lazy: true, scheduler });

  oldValue = runner();
  if (immediate) cb(oldValue, undefined, onInvalidate);

  return () => runner.effect.stop();
}

/** Executa o efeito imediatamente e reexecuta quando dependencias mudam. */
export function watchEffect(fn: (onInvalidate: (c: () => void) => void) => void): WatchStopHandle {
  let cleanupFn: (() => void) | undefined;
  const onInvalidate = (c: () => void): void => {
    cleanupFn = c;
  };
  const runner = effect(() => {
    cleanupFn?.();
    cleanupFn = undefined;
    fn(onInvalidate);
  });
  return () => {
    cleanupFn?.();
    runner.effect.stop();
  };
}

function traverse(value: unknown, seen = new Set<unknown>()): unknown {
  if (!isObject(value) || seen.has(value)) return value;
  seen.add(value);
  if (isRef(value)) traverse((value as Ref).value, seen);
  else if (Array.isArray(value)) for (const v of value) traverse(v, seen);
  else if (value instanceof Set || value instanceof Map)
    (value as Set<unknown>).forEach((v) => traverse(v, seen));
  else for (const key of Object.keys(value)) traverse((value as any)[key], seen);
  return value;
}
