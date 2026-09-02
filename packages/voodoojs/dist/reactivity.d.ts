/**
 * @module reactivity
 *
 * The reactive core of Voodoo.js.
 *
 * The model: a Proxy plus per-key dependency tracking, scheduled on a
 * microtask. There is no Virtual DOM. When `count` changes, only the effects
 * that read `count` re-run, and each effect updates only the DOM node it wrote
 * itself.
 *
 * This module never touches the DOM and never assumes `window`, so it runs on
 * Node, Bun and Deno with no adaptation.
 */
type Dep = Set<ReactiveEffect>;
type EffectScheduler = () => void;
interface EffectOptions {
    /** Runs instead of the effect itself when a dependency changes. */
    scheduler?: EffectScheduler;
    /** Does not run immediately on creation. */
    lazy?: boolean;
    /** Called when the effect is stopped. */
    onStop?: () => void;
    /** The scope that owns the effect, for automatic cleanup. */
    scope?: EffectScope;
}
interface Ref<T = any> {
    value: T;
    readonly __v_isRef: true;
}
interface ComputedRef<T = any> extends Ref<T> {
    readonly value: T;
    readonly effect: ReactiveEffect;
}
interface WatchOptions {
    immediate?: boolean;
    deep?: boolean;
    flush?: 'pre' | 'post' | 'sync';
}
type WatchStopHandle = () => void;
/**
 * Resolves once the queue of updates has been applied to the DOM.
 *
 * ```js
 * count.value++
 * await V.nextTick()
 * // the DOM already reflects the change
 * ```
 */
declare function nextTick<T = void>(fn?: () => T): Promise<T | void>;
declare function queueJob(job: ReactiveEffect): void;
/** Schedules a callback to run after the DOM has been updated. */
declare function queuePostFlush(cb: () => void): void;
/** Applies everything still pending right away. Useful in tests. */
declare function flushSync(): void;
type ErrorHandler = (err: unknown, context: string) => void;
declare function setErrorHandler(fn: ErrorHandler | null): void;
declare function handleError(err: unknown, context: string): void;
declare function warn(msg: string, ...args: unknown[]): void;
declare function pauseTracking(): void;
declare function enableTracking(): void;
declare function resetTracking(): void;
declare function getActiveEffect(): ReactiveEffect | undefined;
/**
 * Why every field here is `declare`d and then assigned in the constructor.
 *
 * The package compiles with `useDefineForClassFields`, and the build target is
 * below the level where class fields exist natively, so a field written as
 * `active = true` is emitted as an `Object.defineProperty` call. This class is
 * built once per binding on the page — one per row of a list, thousands of times
 * on a real screen — and the CPU profile of a thousand-row build showed the
 * define helper alone above one percent of total time. `declare` removes the
 * emitted definition, the constructor creates the same own, writable,
 * enumerable, configurable properties by plain assignment, and the assignment
 * order is kept identical so the object shape does not change.
 */
declare class ReactiveEffect<T = any> {
    readonly id: number;
    active: boolean;
    /** `true` while the effect is waiting in the scheduler queue. */
    queued: boolean;
    deps: Dep[];
    parent: ReactiveEffect | undefined;
    scheduler: EffectScheduler | undefined;
    onStop: (() => void) | undefined;
    /** Cleanup callbacks registered by the effect itself. */
    cleanups: Array<() => void>;
    fn: () => T;
    constructor(fn: () => T, options?: EffectOptions);
    run(): T | undefined;
    /** Registers a function called before the next run and on stop. */
    onInvalidate(fn: () => void): void;
    private runCleanups;
    stop(): void;
}
interface EffectRunner<T = any> {
    (): T | undefined;
    effect: ReactiveEffect<T>;
}
/**
 * Creates a reactive effect. Runs once on creation and re-runs whenever any
 * state read inside it changes.
 *
 * ```js
 * const state = V.reactive({ count: 0 })
 * V.effect(() => console.log(state.count))
 * state.count++ // triggers the log
 * ```
 */
declare function effect<T = any>(fn: () => T, options?: EffectOptions): EffectRunner<T>;
declare function stop(runner: EffectRunner | ReactiveEffect): void;
/** Fields are `declare`d and assigned in the constructor for the reason given on `ReactiveEffect`. */
declare class EffectScope {
    effects: ReactiveEffect[];
    cleanups: Array<() => void>;
    children: EffectScope[];
    active: boolean;
    parent: EffectScope | undefined;
    constructor(detached?: boolean);
    run<T>(fn: () => T): T | undefined;
    onDispose(fn: () => void): void;
    stop(): void;
}
declare function effectScope(detached?: boolean): EffectScope;
declare function getActiveScope(): EffectScope | undefined;
declare const ITERATE_KEY: unique symbol;
declare function track(target: object, key: PropertyKey): void;
declare const enum TriggerType {
    SET = "set",
    ADD = "add",
    DELETE = "delete",
    CLEAR = "clear"
}
declare function trigger(target: object, type: TriggerType, key?: PropertyKey, _newValue?: unknown): void;
/** Marks an object so it is never turned into a reactive proxy. */
declare function markRaw<T extends object>(value: T): T;
/** Returns the original object behind a reactive proxy. */
declare function toRaw<T>(observed: T): T;
declare function isReactive(value: unknown): boolean;
/**
 * Makes an object deeply reactive.
 *
 * ```js
 * const state = V.reactive({ user: { name: 'Ana' }, tags: [] })
 * state.user.name = 'Bia'  // triggers effects that read user.name
 * state.tags.push('novo')  // triggers effects that read tags
 * ```
 */
declare function reactive<T extends object>(target: T): T;
declare function hasChanged(value: unknown, oldValue: unknown): boolean;
declare function isRef<T>(r: unknown): r is Ref<T>;
/**
 * Reactive reference for primitive values.
 *
 * ```js
 * const count = V.ref(0)
 * V.effect(() => console.log(count.value))
 * count.value++
 * ```
 */
declare function ref<T>(value: T): Ref<T>;
declare function shallowRef<T>(value: T): Ref<T>;
declare function unref<T>(value: T | Ref<T>): T;
/**
 * Derived value with cache. Only recalculates when a dependency changes.
 *
 * ```js
 * const full = V.computed(() => `${state.first} ${state.last}`)
 * full.value
 * ```
 */
declare function computed<T>(getterOrOptions: (() => T) | {
    get: () => T;
    set: (v: T) => void;
}): ComputedRef<T>;
type WatchSource<T = any> = Ref<T> | (() => T) | object;
type WatchCallback<T = any> = (value: T, oldValue: T | undefined, onInvalidate: (fn: () => void) => void) => void;
/**
 * Watches a reactive source and calls the callback when it changes.
 *
 * ```js
 * V.watch(() => state.search, (newValue, oldValue) => search(newValue))
 * ```
 */
declare function watch<T>(source: WatchSource<T>, cb: WatchCallback<T>, options?: WatchOptions): WatchStopHandle;
/** Executes the effect immediately and re-executes when dependencies change. */
declare function watchEffect(fn: (onInvalidate: (c: () => void) => void) => void): WatchStopHandle;

export { type ComputedRef, type Dep, type EffectOptions, type EffectRunner, type EffectScheduler, EffectScope, ITERATE_KEY, ReactiveEffect, type Ref, TriggerType, type WatchCallback, type WatchOptions, type WatchSource, type WatchStopHandle, computed, effect, effectScope, enableTracking, flushSync, getActiveEffect, getActiveScope, handleError, hasChanged, isReactive, isRef, markRaw, nextTick, pauseTracking, queueJob, queuePostFlush, reactive, ref, resetTracking, setErrorHandler, shallowRef, stop, toRaw, track, trigger, unref, warn, watch, watchEffect };
