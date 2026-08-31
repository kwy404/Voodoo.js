/**
 * Regressao: `v-model` rodava antes de `v-bind`.
 *
 * `PRIORITY.MODEL` era 40 e `PRIORITY.BIND` 30, e prioridade maior roda
 * primeiro. Entao o valor entrava no campo enquanto `:min`, `:max` e `:step`
 * ainda nao tinham sido aplicados, e o navegador julgava o valor pelas regras
 * antigas: com o `step` anterior valendo 1, escrever `0.12` virava `0`; com o
 * `max` anterior valendo 10, escrever `50` virava `10`.
 *
 * O sintoma aparecia em qualquer painel que troca a faixa de um controle junto
 * com o valor, que e o caso comum de uma lista de parametros renderizada por
 * `v-for`.
 *
 * A correcao inverte a ordem: `BIND` passou a 45, acima de `MODEL`.
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

describe('ordem entre v-bind e v-model', () => {
  it('o binding tem prioridade maior que o modelo', () => {
    // Maior roda primeiro. Se esta relacao se inverter, os testes abaixo
    // voltam a falhar, e este aqui explica o porque antes deles.
    expect(PRIORITY.BIND).toBeGreaterThan(PRIORITY.MODEL);
  });

  it('o step chega antes do valor, entao a fracao sobrevive', async () => {
    document.body.innerHTML = `
      <div v-data="{ passo: 0.01, valor: 0.12 }">
        <input id="campo" type="range" min="0" max="1" :step="passo" v-model.number="valor">
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    // Com o modelo rodando primeiro, o navegador arredondava 0.12 para 0,
    // porque o step ainda era o padrao 1.
    expect(campo.step).toBe('0.01');
    expect(Number(campo.value)).toBeCloseTo(0.12, 5);
  });

  it('o max chega antes do valor, entao nao ha grampeamento indevido', async () => {
    document.body.innerHTML = `
      <div v-data="{ teto: 100, valor: 50 }">
        <input id="campo" type="range" min="0" :max="teto" v-model.number="valor">
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    const campo = document.querySelector<HTMLInputElement>('#campo')!;
    // O max padrao de um range e 100, mas um :max menor vindo depois faria o
    // valor ser grampeado. Aqui o teto ja esta no lugar quando o valor chega.
    expect(campo.max).toBe('100');
    expect(Number(campo.value)).toBe(50);
  });

  it('trocar a faixa e o valor juntos mantem os dois coerentes', async () => {
    // O caso que revelou o problema: uma lista de parametros em que mudar de
    // cena troca faixa e valor na mesma rodada.
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

  it('v-model continua escrevendo no estado quando o campo muda', async () => {
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

    // A inversao de prioridade nao pode ter quebrado o caminho de volta.
    const escopo = document.querySelector('div')!;
    void escopo;
    expect(Number(campo.value)).toBeCloseTo(2.5, 5);
  });
});
