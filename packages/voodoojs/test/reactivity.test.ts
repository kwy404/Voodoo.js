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
  it('rastreia leitura e escrita de propriedades', async () => {
    const state = reactive({ count: 0 });
    const seen: number[] = [];

    effect(() => seen.push(state.count));
    expect(seen).toEqual([0]);

    state.count = 1;
    await nextTick();
    expect(seen).toEqual([0, 1]);
  });

  it('nao dispara quando o valor nao muda', async () => {
    const state = reactive({ count: 0 });
    const spy = vi.fn(() => state.count);
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);

    state.count = 0;
    await nextTick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('so atualiza os efeitos que dependem da chave alterada', async () => {
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

  it('funciona em profundidade', async () => {
    const state = reactive({ user: { name: 'Ana', tags: ['a'] } });
    const seen: string[] = [];
    effect(() => seen.push(state.user.name));

    state.user.name = 'Bia';
    await nextTick();
    expect(seen).toEqual(['Ana', 'Bia']);
  });

  it('reage a metodos de array', async () => {
    const state = reactive({ list: [1, 2] });
    const sizes: number[] = [];
    effect(() => sizes.push(state.list.length));

    state.list.push(3);
    await nextTick();
    expect(sizes).toEqual([2, 3]);
  });

  it('reage a chaves novas e removidas', async () => {
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

  it('agrupa varias mudancas em uma unica atualizacao', async () => {
    const state = reactive({ a: 0, b: 0 });
    const spy = vi.fn(() => `${state.a}${state.b}`);
    effect(spy);

    state.a = 1;
    state.b = 1;
    state.a = 2;
    await nextTick();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('respeita markRaw e devolve o alvo com toRaw', () => {
    const raw = markRaw({ pesado: true });
    const state = reactive({ raw });
    expect(isReactive(state.raw)).toBe(false);

    const plain = { a: 1 };
    expect(toRaw(reactive(plain))).toBe(plain);
  });

  it('trata Map como fonte reativa', async () => {
    const map = reactive(new Map<string, number>());
    const sizes: number[] = [];
    effect(() => sizes.push(map.size));

    map.set('a', 1);
    await nextTick();
    expect(sizes).toEqual([0, 1]);
  });
});

describe('ref', () => {
  it('rastreia .value', async () => {
    const count = ref(0);
    const seen: number[] = [];
    effect(() => seen.push(count.value));

    count.value = 5;
    await nextTick();
    expect(seen).toEqual([0, 5]);
  });

  it('desembrulha refs dentro de objetos reativos', () => {
    const count = ref(1);
    const state = reactive({ count });
    expect(state.count).toBe(1);
    state.count = 3;
    expect(count.value).toBe(3);
  });
});

describe('computed', () => {
  it('calcula sob demanda e guarda o resultado', () => {
    const state = reactive({ a: 1, b: 2 });
    const getter = vi.fn(() => state.a + state.b);
    const total = computed(getter);

    expect(getter).not.toHaveBeenCalled();
    expect(total.value).toBe(3);
    expect(total.value).toBe(3);
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it('recalcula quando uma dependencia muda', () => {
    const state = reactive({ a: 1 });
    const dobro = computed(() => state.a * 2);
    expect(dobro.value).toBe(2);
    state.a = 5;
    expect(dobro.value).toBe(10);
  });

  it('encadeia computados', () => {
    const state = reactive({ n: 2 });
    const dobro = computed(() => state.n * 2);
    const quadruplo = computed(() => dobro.value * 2);
    expect(quadruplo.value).toBe(8);
    state.n = 3;
    expect(quadruplo.value).toBe(12);
  });
});

describe('watch', () => {
  it('recebe valor novo e antigo', async () => {
    const state = reactive({ busca: '' });
    const spy = vi.fn();
    watch(() => state.busca, spy);

    state.busca = 'voodoo';
    await nextTick();
    await nextTick();

    expect(spy).toHaveBeenCalledWith('voodoo', '', expect.any(Function));
  });

  it('aceita immediate', () => {
    const state = reactive({ n: 7 });
    const spy = vi.fn();
    watch(() => state.n, spy, { immediate: true });
    expect(spy).toHaveBeenCalledWith(7, undefined, expect.any(Function));
  });

  it('observa objeto inteiro com deep', async () => {
    const state = reactive({ filtros: { cor: 'azul' } });
    const spy = vi.fn();
    watch(() => state.filtros, spy, { deep: true });

    state.filtros.cor = 'verde';
    await nextTick();
    await nextTick();
    expect(spy).toHaveBeenCalled();
  });

  it('para de observar depois de stop', async () => {
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
  it('para todos os efeitos de uma vez', async () => {
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

  it('executa callbacks de limpeza', () => {
    const scope = effectScope();
    const spy = vi.fn();
    scope.onDispose(spy);
    scope.stop();
    expect(spy).toHaveBeenCalled();
  });
});

describe('agendador', () => {
  it('flushSync aplica a fila na hora', () => {
    const state = reactive({ n: 0 });
    const seen: number[] = [];
    effect(() => seen.push(state.n));

    state.n = 1;
    flushSync();
    expect(seen).toEqual([0, 1]);
  });

  it('nextTick resolve depois das atualizacoes', async () => {
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
