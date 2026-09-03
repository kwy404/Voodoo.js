/**
 * Regression: getters flattened in `V.store` and `V.data`, and `terminal`
 * ignored by `V.directive`.
 *
 * The store copied the definition with `{ ...definition }`, and `V.data` used
 * `Object.assign`. Both forms READ the getter at copy time and keep the result,
 * so `get total() { return this.itens.length }` became a fixed number: the
 * value at the moment of creation, frozen forever. And the module's own
 * documentation example used that very form.
 *
 * The fix copies by descriptor, which preserves the getter. The reactive proxy
 * runs it on every read and tracks the dependencies inside it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import { removeStore, store } from '../src/store';
import { core } from '../src/core';
import { directives } from '../src/runtime/registry';
import { rootScope } from '../src/runtime/scope';
import { effect, nextTick } from '../src/reactivity';

beforeEach(() => {
  localStorage.clear();
  for (const chave of Object.keys(rootScope.data)) delete rootScope.data[chave];
});

afterEach(() => {
  removeStore('carrinho');
  removeStore('salvo');
  directives.delete('teste-estrutural');
  directives.delete('teste-comum');
});

describe('getters in the store', () => {
  it('keeps the getter alive instead of freezing the value', () => {
    const carrinho = store('carrinho', {
      itens: [] as number[],
      get total() {
        return this.itens.length;
      },
    });

    expect(carrinho.total).toBe(0);
    carrinho.itens.push(1, 2, 3);
    // Before the fix this stayed 0 forever.
    expect(carrinho.total).toBe(3);
  });

  it('the getter is reactive: an effect that reads total runs again', async () => {
    const carrinho = store('carrinho', {
      itens: [] as number[],
      get total() {
        return this.itens.length;
      },
    });

    const vistos: number[] = [];
    effect(() => vistos.push(carrinho.total));
    expect(vistos).toEqual([0]);

    carrinho.itens.push(1);
    await nextTick();
    expect(vistos).toEqual([0, 1]);
  });

  it('methods stay bound to the store itself', () => {
    const carrinho = store('carrinho', {
      itens: [] as number[],
      adicionar(n: number) {
        this.itens.push(n);
      },
      get total() {
        return this.itens.length;
      },
    });

    carrinho.adicionar(7);
    expect(carrinho.itens).toEqual([7]);
    expect(carrinho.total).toBe(1);
  });

  it('persistence saves no derived value and does not write over the getter', async () => {
    const salvo = store(
      'salvo',
      {
        itens: [] as number[],
        get total() {
          return this.itens.length;
        },
      },
      { persist: true }
    );

    salvo.itens.push(1, 2);
    await nextTick();
    await nextTick();

    const bruto = localStorage.getItem('voodoo:store:salvo');
    expect(bruto).toBeTruthy();
    const gravado = JSON.parse(bruto!) as Record<string, unknown>;

    // `total` is derived: it does not go into what was saved.
    expect(gravado).toHaveProperty('itens');
    expect(gravado).not.toHaveProperty('total');
  });
});

describe('getters in V.data', () => {
  it('keeps the getter alive in the root scope', () => {
    core.data({
      itens: [1, 2] as number[],
      get quantos() {
        return (rootScope.data.itens as number[]).length;
      },
    });

    expect(rootScope.data.quantos).toBe(2);
    (rootScope.data.itens as number[]).push(3);
    expect(rootScope.data.quantos).toBe(3);
  });
});

describe('V.directive and structural directives', () => {
  it('passes terminal along, so a plugin can take over the subtree', () => {
    core.directive('teste-estrutural', {
      terminal: true,
      mounted() {
        // no effect: what matters here is the registration
      },
    });

    expect(directives.get('teste-estrutural')?.terminal).toBe(true);
  });

  it('with no terminal declared, it stays an ordinary directive', () => {
    core.directive('teste-comum', {
      mounted() {
        // same as above
      },
    });

    expect(directives.get('teste-comum')?.terminal).toBe(false);
  });
});
