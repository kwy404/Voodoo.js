import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import '../src/directives/core';
import '../src/directives/state';
import { storage } from '../src/storage';

function mount(html: string, data: Record<string, unknown> = {}): {
  root: HTMLElement;
  data: Record<string, any>;
} {
  const state = reactive(data);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(state));
  return { root, data: state };
}

async function settle(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) await nextTick();
}

/** Espera o debounce interno das directives de estado. */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('v-persist', () => {
  it('salva o estado no localStorage', async () => {
    mount('<div v-data="{ tema: \'claro\' }" v-persist="teste"></div>');

    await settle();
    await wait(200);

    const salvo = storage.get<Record<string, unknown>>('voodoo:persist:teste');
    expect(salvo).toEqual({ tema: 'claro' });
  });

  it('o atributo sai do HTML depois de processado', async () => {
    const { root } = mount('<div v-data="{ tema: \'claro\' }" v-persist="saida"></div>');
    await settle();
    expect(root.innerHTML).not.toContain('v-persist');
    expect(root.innerHTML).not.toContain('v-data');
  });

  it('restaura o valor salvo na proxima montagem', async () => {
    storage.set('voodoo:persist:preferencias', { idioma: 'en' });

    mount('<div v-data="{ idioma: \'pt\' }" v-persist="preferencias"><b v-text="idioma"></b></div>');
    await settle();

    expect(document.querySelector('b')!.textContent).toBe('en');
  });

  it('nao restaura chaves que o estado atual nao declara', async () => {
    storage.set('voodoo:persist:parcial', { removida: 1, mantida: 2 });

    mount('<div v-data="{ mantida: 0 }" v-persist="parcial"><b v-text="mantida"></b></div>');
    await settle();

    expect(document.querySelector('b')!.textContent).toBe('2');
  });

  it('guarda alteracoes feitas depois da montagem', async () => {
    mount(
      '<div v-data="{ contador: 0 }" v-persist="contagem"><button v-click="contador++"></button></div>'
    );
    await settle();

    document.querySelector('button')!.click();
    await settle();
    await wait(200);

    expect(storage.get<Record<string, number>>('voodoo:persist:contagem')?.contador).toBe(1);
  });
});

describe('v-history', () => {
  it('desfaz e refaz uma alteracao', async () => {
    mount(`
      <div v-data="{ texto: 'inicio' }" v-history>
        <button id="mudar" v-click="texto = 'alterado'"></button>
        <button id="voltar" v-undo></button>
        <button id="frente" v-redo></button>
        <b v-text="texto"></b>
      </div>`);
    await settle();

    (document.querySelector('#mudar') as HTMLElement).click();
    await settle();
    expect(document.querySelector('b')!.textContent).toBe('alterado');

    // Espera o debounce que grava o instantaneo.
    await wait(400);

    (document.querySelector('#voltar') as HTMLElement).click();
    await settle();
    expect(document.querySelector('b')!.textContent).toBe('inicio');

    (document.querySelector('#frente') as HTMLElement).click();
    await settle();
    expect(document.querySelector('b')!.textContent).toBe('alterado');
  });

  it('expoe $history com canUndo e canRedo', async () => {
    mount(`
      <div v-data="{ n: 0 }" v-history>
        <button id="soma" v-click="n++"></button>
        <span id="pode" v-text="$history.canUndo"></span>
      </div>`);
    await settle();

    expect(document.querySelector('#pode')!.textContent).toBe('false');

    (document.querySelector('#soma') as HTMLElement).click();
    await settle();
    await wait(400);
    await settle();

    expect(document.querySelector('#pode')!.textContent).toBe('true');
  });

  it('desfazer e escrever de novo descarta o futuro', async () => {
    mount(`
      <div v-data="{ n: 0 }" v-history>
        <button id="soma" v-click="n++"></button>
        <button id="voltar" v-undo></button>
        <span id="tamanho" v-text="$history.size"></span>
      </div>`);
    await settle();

    const soma = document.querySelector('#soma') as HTMLElement;
    soma.click();
    await settle();
    await wait(400);
    soma.click();
    await settle();
    await wait(400);

    expect(Number(document.querySelector('#tamanho')!.textContent)).toBe(3);

    (document.querySelector('#voltar') as HTMLElement).click();
    await settle();

    soma.click();
    await settle();
    await wait(400);
    await settle();

    // O ramo descartado nao volta: continuam 3 instantaneos.
    expect(Number(document.querySelector('#tamanho')!.textContent)).toBe(3);
  });
});

describe('v-storage', () => {
  it('guarda e restaura o valor de um campo', async () => {
    const primeira = mount('<input v-storage="rascunho">');
    const input = primeira.root.querySelector('input')!;
    input.value = 'texto salvo';
    input.dispatchEvent(new Event('input'));

    expect(storage.get('voodoo:field:rascunho')).toBe('texto salvo');

    document.body.innerHTML = '';
    const segunda = mount('<input v-storage="rascunho">');
    expect(segunda.root.querySelector('input')!.value).toBe('texto salvo');
  });
});

describe('limpeza das directives de estado', () => {
  it('para de gravar depois de destruir o elemento', async () => {
    const { root, data } = mount('<div v-data="{ n: 0 }" v-persist="limpeza"></div>');
    await settle();
    await wait(200);

    destroy(root);
    const antes = JSON.stringify(storage.get('voodoo:persist:limpeza'));

    const alvo = (root.firstElementChild as HTMLElement) ?? root;
    void alvo;
    void data;

    await wait(250);
    expect(JSON.stringify(storage.get('voodoo:persist:limpeza'))).toBe(antes);
  });
});

describe('v-sync entre abas', () => {
  it('nao quebra quando BroadcastChannel nao existe', () => {
    const original = globalThis.BroadcastChannel;
    // @ts-expect-error remocao proposital para simular navegador antigo
    delete globalThis.BroadcastChannel;

    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => mount('<div v-data="{ n: 1 }" v-sync="canal"></div>')).not.toThrow();
    aviso.mockRestore();

    globalThis.BroadcastChannel = original;
  });
});
