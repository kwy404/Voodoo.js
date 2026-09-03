import { describe, it, expect, vi } from 'vitest';
import {
  reactive,
  ref,
  computed,
  effect,
  watch,
  nextTick,
  effectScope,
  toRaw,
  markRaw,
  isReactive,
  flushSync,
} from '../src/reactivity';

describe('reactive', () => {
  it('tracks reads and writes of properties', async () => {
    const state = reactive({ count: 0 });
    const seen: number[] = [];

    effect(() => seen.push(state.count));
    expect(seen).toEqual([0]);

    state.count = 1;
    await nextTick();
    expect(seen).toEqual([0, 1]);
  });

  it('does not fire when the value does not change', async () => {
    const state = reactive({ count: 0 });
    const spy = vi.fn(() => state.count);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    state.count = 0;
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('updates only the effects that depend on the changed key', async () => {
    const state = reactive({ a: 1, b: 1 });
    const effectA = vi.fn(() => state.a);
    const effectB = vi.fn(() => state.b);
    effect(effectA);
    effect(effectB);

    state.a = 2;
    await nextTick();

    expect(effectA).toHaveBeenCalledTimes(2);
    expect(effectB).toHaveBeenCalledTimes(1);
  });

  it('works in depth', async () => {
    const state = reactive({ user: { name: 'Ana', tags: ['a'] } });
    const seen: string[] = [];
    effect(() => seen.push(state.user.name));

    state.user.name = 'Bia';
    await nextTick();
    expect(seen).toEqual(['Ana', 'Bia']);
  });

  it('reacts to array methods', async () => {
    const state = reactive({ list: [1, 2] });
    const sizes: number[] = [];
    effect(() => sizes.push(state.list.length));

    state.list.push(3);
    await nextTick();
    expect(sizes).toEqual([2, 3]);
  });

  it('reacts to new and removed keys', async () => {
    const state = reactive<Record<string, number>>({});
    const keys: number[] = [];
    effect(() => keys.push(Object.keys(state).length));

    state.novo = 1;
    await nextTick();
    expect(keys).toEqual([0, 1]);

    delete state.novo;
    await nextTick();
    expect(keys).toEqual([0, 1, 0]);
  });

  it('groups several changes into a single update', async () => {
    const state = reactive({ a: 0, b: 0 });
    const spy = vi.fn(() => `${state.a}${state.b}`);
    effect(spy);

    state.a = 1;
    state.b = 1;
    state.a = 2;
    await nextTick();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('respects markRaw and returns the target with toRaw', () => {
    const raw = markRaw({ pesado: true });
    const state = reactive({ raw });
    expect(isReactive(state.raw)).toBe(false);

    const plain = { a: 1 };
    expect(toRaw(reactive(plain))).toBe(plain);
  });

  it('treats a Map as a reactive source', async () => {
    const map = reactive(new Map<string, number>());
    const sizes: number[] = [];
    effect(() => sizes.push(map.size));

    map.set('a', 1);
    await nextTick();
    expect(sizes).toEqual([0, 1]);
  });

  // WeakMap and WeakSet are not observable: with no `size`, no iteration and no
  // `forEach`, there is no collection read to track. The contract is to return
  // the target itself, with no proxy, rather than fake reactivity.
  it('returns WeakMap and WeakSet with no proxy', () => {
    const wm = new WeakMap<object, number>();
    const ws = new WeakSet<object>();
    expect(reactive(wm)).toBe(wm);
    expect(reactive(ws)).toBe(ws);
    expect(isReactive(reactive(wm))).toBe(false);
    expect(isReactive(reactive(ws))).toBe(false);
  });
});

describe('ref', () => {
  it('tracks .value', async () => {
    const count = ref(0);
    const seen: number[] = [];
    effect(() => seen.push(count.value));

    count.value = 5;
    await nextTick();
    expect(seen).toEqual([0, 5]);
  });

  it('unwraps refs inside reactive objects', () => {
    const count = ref(1);
    const state = reactive({ count });
    expect(state.count).toBe(1);
    state.count = 3;
    expect(count.value).toBe(3);
  });
});

describe('computed', () => {
  it('computes on demand and keeps the result', () => {
    const state = reactive({ a: 1, b: 2 });
    const getter = vi.fn(() => state.a + state.b);
    const total = computed(getter);

    expect(getter).not.toHaveBeenCalled();
    expect(total.value).toBe(3);
    expect(total.value).toBe(3);
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it('recomputes when a dependency changes', () => {
    const state = reactive({ a: 1 });
    const dobro = computed(() => state.a * 2);
    expect(dobro.value).toBe(2);
    state.a = 5;
    expect(dobro.value).toBe(10);
  });

  it('chains computed values', () => {
    const state = reactive({ n: 2 });
    const dobro = computed(() => state.n * 2);
    const quadruplo = computed(() => dobro.value * 2);
    expect(quadruplo.value).toBe(8);
    state.n = 3;
    expect(quadruplo.value).toBe(12);
  });
});

describe('watch', () => {
  it('receives the new value and the old one', async () => {
    const state = reactive({ busca: '' });
    const spy = vi.fn();
    watch(() => state.busca, spy);

    state.busca = 'voodoo';
    await nextTick();
    await nextTick();

    expect(spy).toHaveBeenCalledWith('voodoo', '', expect.any(Function));
  });

  it('accepts immediate', () => {
    const state = reactive({ n: 7 });
    const spy = vi.fn();
    watch(() => state.n, spy, { immediate: true });
    expect(spy).toHaveBeenCalledWith(7, undefined, expect.any(Function));
  });

  it('observes a whole object with deep', async () => {
    const state = reactive({ filtros: { cor: 'azul' } });
    const spy = vi.fn();
    watch(() => state.filtros, spy, { deep: true });

    state.filtros.cor = 'verde';
    await nextTick();
    await nextTick();
    expect(spy).toHaveBeenCalled();
  });

  it('stops observing after stop', async () => {
    const state = reactive({ n: 0 });
    const spy = vi.fn();
    const stopWatching = watch(() => state.n, spy);

    stopWatching();
    state.n = 1;
    await nextTick();
    await nextTick();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('effectScope', () => {
  it('stops every effect at once', async () => {
    const state = reactive({ n: 0 });
    const spy = vi.fn(() => state.n);
    const scope = effectScope();
    scope.run(() => effect(spy, { scope }));

    expect(spy).toHaveBeenCalledTimes(1);
    scope.stop();

    state.n = 1;
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('runs the cleanup callbacks', () => {
    const scope = effectScope();
    const spy = vi.fn();
    scope.onDispose(spy);
    scope.stop();
    expect(spy).toHaveBeenCalled();
  });
});

describe('scheduler', () => {
  it('flushSync applies the queue right away', () => {
    const state = reactive({ n: 0 });
    const seen: number[] = [];
    effect(() => seen.push(state.n));

    state.n = 1;
    flushSync();
    expect(seen).toEqual([0, 1]);
  });

  it('nextTick resolves after the updates', async () => {
    const state = reactive({ n: 0 });
    let visto = -1;
    effect(() => {
      visto = state.n;
    });
    state.n = 42;
    await nextTick();
    expect(visto).toBe(42);
  });
});
