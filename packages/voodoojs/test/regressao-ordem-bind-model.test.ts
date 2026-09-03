/**
 * Regression: `v-model` ran before `v-bind`.
 *
 * `PRIORITY.MODEL` was 40 and `PRIORITY.BIND` 30, and a higher priority runs
 * first. So the value went into the field while `:min`, `:max` and `:step` had
 * not been applied yet, and the browser judged the value by the old rules:
 * with the previous `step` at 1, writing `0.12` became `0`; with the previous
 * `max` at 10, writing `50` became `10`.
 *
 * The symptom showed up in any panel that changes the range of a control
 * together with its value, which is the common case of a list of parameters
 * rendered by `v-for`.
 *
 * The fix inverts the order: `BIND` moved to 45, above `MODEL`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import { PRIORITY } from '../src/runtime/registry';
import { destroy, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';

beforeEach(() => {
  document.body.innerHTML = '';
  for (const chave of Object.keys(rootScope.data)) delete rootScope.data[chave];
});

afterEach(() => {
  destroy(document.body);
  document.body.innerHTML = '';
});

describe('order between v-bind and v-model', () => {
  it('the binding has a higher priority than the model', () => {
    // Higher runs first. If this relation is inverted, the tests below start
    // failing again, and this one explains why before they do.
    expect(PRIORITY.BIND).toBeGreaterThan(PRIORITY.MODEL);
  });

  it('the step arrives before the value, so the fraction survives', async () => {
    document.body.innerHTML = `
      <div v-data="{ passo: 0.01, valor: 0.12 }">
        <input id="campo" type="range" min="0" max="1" :step="passo" v-model.number="valor">
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    // With the model running first, the browser rounded 0.12 down to 0,
    // because the step was still the default 1.
    expect(campo.step).toBe('0.01');
    expect(Number(campo.value)).toBeCloseTo(0.12, 5);
  });

  it('the max arrives before the value, so there is no undue clamping', async () => {
    document.body.innerHTML = `
      <div v-data="{ teto: 100, valor: 50 }">
        <input id="campo" type="range" min="0" :max="teto" v-model.number="valor">
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    // The default max of a range is 100, but a smaller :max arriving later
    // would clamp the value. Here the ceiling is already in place when the
    // value arrives.
    expect(campo.max).toBe('100');
    expect(Number(campo.value)).toBe(50);
  });

  it('changing the range and the value together keeps both coherent', async () => {
    // The case that exposed the problem: a list of parameters where changing
    // scene swaps range and value in the same round.
    document.body.innerHTML = `
      <div v-data="{ passo: 1, teto: 10, valor: 5 }">
        <input id="campo" type="range" min="0" :max="teto" :step="passo" v-model.number="valor">
        <button id="trocar" @click="passo = 0.05; teto = 2; valor = 1.35">trocar</button>
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    expect(Number(campo.value)).toBe(5);

    document.querySelector<HTMLButtonElement>('#trocar')!.click();
    await nextTick();
    await nextTick();

    expect(campo.step).toBe('0.05');
    expect(campo.max).toBe('2');
    expect(Number(campo.value)).toBeCloseTo(1.35, 5);
  });

  it('v-model keeps writing into the state when the field changes', async () => {
    document.body.innerHTML = `
      <div v-data="{ passo: 0.5, valor: 1 }">
        <input id="campo" type="range" min="0" max="10" :step="passo" v-model.number="valor">
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    campo.value = '2.5';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    // The priority inversion must not have broken the way back.
    const escopo = document.querySelector('div')!;
    void escopo;
    expect(Number(campo.value)).toBeCloseTo(2.5, 5);
  });
});
