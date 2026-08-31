/**
 * Regressao: getters achatados em `V.store` e `V.data`, e `terminal` ignorado
 * por `V.directive`.
 *
 * O store copiava a definicao com `{ ...definition }`, e `V.data` usava
 * `Object.assign`. As duas formas LEEM o getter na hora da copia e guardam o
 * resultado, entao `get total() { return this.itens.length }` virava um numero
 * fixo: o valor do momento da criacao, congelado para sempre. E o proprio
 * exemplo da documentacao do modulo usava essa forma.
 *
 * A correcao copia por descritor, o que preserva o getter. O proxy reativo o
 * executa a cada leitura e rastreia as dependencias de dentro dele.
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

describe('getters no store', () => {
  it('mantem o getter vivo em vez de congelar o valor', () => {
    const carrinho = store('carrinho', {
      itens: [] as number[],
      get total() {
        return this.itens.length;
      },
    });

    expect(carrinho.total).toBe(0);
    carrinho.itens.push(1, 2, 3);
    // Antes da correcao isto continuava 0 para sempre.
    expect(carrinho.total).toBe(3);
  });

  it('o getter e reativo: um efeito que le total reexecuta', async () => {
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

  it('metodos continuam ligados ao proprio store', () => {
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

  it('persistencia nao grava valor derivado nem escreve por cima do getter', async () => {
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

    // `total` e derivado: nao entra no que foi salvo.
    expect(gravado).toHaveProperty('itens');
    expect(gravado).not.toHaveProperty('total');
  });
});

describe('getters em V.data', () => {
  it('mantem o getter vivo no escopo raiz', () => {
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

describe('V.directive e directives estruturais', () => {
  it('repassa terminal, para um plugin poder assumir a subarvore', () => {
    core.directive('teste-estrutural', {
      terminal: true,
      mounted() {
        // sem efeito: o que importa aqui e o registro
      },
    });

    expect(directives.get('teste-estrutural')?.terminal).toBe(true);
  });

  it('sem terminal declarado, continua sendo uma directive comum', () => {
    core.directive('teste-comum', {
      mounted() {
        // idem
      },
    });

    expect(directives.get('teste-comum')?.terminal).toBe(false);
  });
});
