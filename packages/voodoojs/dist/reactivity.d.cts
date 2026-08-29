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
type Dep = Set<ReactiveEffect>;
type EffectScheduler = () => void;
interface EffectOptions {
    /** Executa em vez do proprio efeito quando uma dependencia muda. */
    scheduler?: EffectScheduler;
    /** Nao executa imediatamente na criacao. */
    lazy?: boolean;
    /** Chamado quando o efeito e parado. */
    onStop?: () => void;
    /** Escopo dono do efeito, para limpeza automatica. */
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
 * Resolve depois que a fila de atualizacoes for aplicada ao DOM.
 *
 * ```js
 * count.value++
 * await V.nextTick()
 * // o DOM ja refletiu a mudanca
 * ```
 */
declare function nextTick<T = void>(fn?: () => T): Promise<T | void>;
declare function queueJob(job: ReactiveEffect): void;
/** Agenda um callback para rodar depois que o DOM foi atualizado. */
declare function queuePostFlush(cb: () => void): void;
/** Aplica imediatamente tudo que estiver pendente. Util em testes. */
declare function flushSync(): void;
type ErrorHandler = (err: unknown, context: string) => void;
declare function setErrorHandler(fn: ErrorHandler | null): void;
declare function handleError(err: unknown, context: string): void;
declare function warn(msg: string, ...args: unknown[]): void;
declare function pauseTracking(): void;
declare function enableTracking(): void;
declare function resetTracking(): void;
declare function getActiveEffect(): ReactiveEffect | undefined;
declare class ReactiveEffect<T = any> {
    fn: () => T;
    readonly id: number;
    active: boolean;
    deps: Dep[];
    parent: ReactiveEffect | undefined;
    scheduler: EffectScheduler | undefined;
    onStop: (() => void) | undefined;
    /** Callbacks de limpeza registrados pelo proprio efeito. */
    cleanups: Array<() => void>;
    constructor(fn: () => T, options?: EffectOptions);
    run(): T | undefined;
    /** Registra uma funcao chamada antes da proxima execucao e ao parar. */
    onInvalidate(fn: () => void): void;
    private runCleanups;
    stop(): void;
}
interface EffectRunner<T = any> {
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
declare function effect<T = any>(fn: () => T, options?: EffectOptions): EffectRunner<T>;
declare function stop(runner: EffectRunner | ReactiveEffect): void;
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
/** Marca um objeto para nunca ser transformado em proxy reativo. */
declare function markRaw<T extends object>(value: T): T;
/** Devolve o objeto original por tras de um proxy reativo. */
declare function toRaw<T>(observed: T): T;
declare function isReactive(value: unknown): boolean;
/**
 * Torna um objeto reativo em profundidade.
 *
 * ```js
 * const state = V.reactive({ user: { name: 'Ana' }, tags: [] })
 * state.user.name = 'Bia'  // dispara efeitos que leram user.name
 * state.tags.push('novo')  // dispara efeitos que leram tags
 * ```
 */
declare function reactive<T extends object>(target: T): T;
declare function hasChanged(value: unknown, oldValue: unknown): boolean;
declare function isRef<T>(r: unknown): r is Ref<T>;
/**
 * Referencia reativa para valores primitivos.
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
 * Valor derivado com cache. So recalcula quando alguma dependencia muda.
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
 * Observa uma fonte reativa e chama o callback quando ela muda.
 *
 * ```js
 * V.watch(() => state.search, (novo, antigo) => buscar(novo))
 * ```
 */
declare function watch<T>(source: WatchSource<T>, cb: WatchCallback<T>, options?: WatchOptions): WatchStopHandle;
/** Executa o efeito imediatamente e reexecuta quando dependencias mudam. */
declare function watchEffect(fn: (onInvalidate: (c: () => void) => void) => void): WatchStopHandle;

export { type ComputedRef, type Dep, type EffectOptions, type EffectRunner, type EffectScheduler, EffectScope, ITERATE_KEY, ReactiveEffect, type Ref, TriggerType, type WatchCallback, type WatchOptions, type WatchSource, type WatchStopHandle, computed, effect, effectScope, enableTracking, flushSync, getActiveEffect, getActiveScope, handleError, hasChanged, isReactive, isRef, markRaw, nextTick, pauseTracking, queueJob, queuePostFlush, reactive, ref, resetTracking, setErrorHandler, shallowRef, stop, toRaw, track, trigger, unref, warn, watch, watchEffect };
