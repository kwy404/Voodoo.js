/**
 * Application mode: `createApp(...).mount('#app')`.
 *
 * Covers Vue API parity promise (state, computed, methods, watch, lifecycle,
 * local components, provide and inject, plugins) and the two intentional
 * differences: mounting on a target that doesn't exist yet, and restoring
 * the container to original HTML on `unmount`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from '../src/reactivity';
import { createApp } from '../src/runtime/app';
import '../src/core';

async function settle(n = 4) {
  for (let i = 0; i < n; i++) await nextTick();
}

/** The mount scheduler waits one frame; here time passes on purpose. */
async function waitForMount(ms = 80) {
  await new Promise((r) => setTimeout(r, ms));
  await settle();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createApp', () => {
  it('mounts template in container and reacts to state', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({
      data: () => ({ n: 0 }),
      methods: {
        somar(this: any) {
          this.n++;
        },
      },
      template: '<button @click="somar()">Cliques: { n }</button>',
    });

    const instance = app.mount('#app');
    await settle();

    const button = document.querySelector('#app button')!;
    expect(button.textContent).toBe('Cliques: 0');

    (button as HTMLButtonElement).click();
    await settle();
    expect(button.textContent).toBe('Cliques: 1');
    expect(instance).not.toBeNull();

    app.unmount();
  });

  it('accepts computed, watch and lifecycle like Vue', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const seen: string[] = [];
    const observed: number[] = [];

    const app = createApp({
      data: () => ({ n: 2 }),
      computed: {
        dobro(this: any) {
          return this.n * 2;
        },
      },
      watch: {
        n(value: number) {
          observed.push(value);
        },
      },
      beforeMount() {
        seen.push('beforeMount');
      },
      mounted() {
        seen.push('mounted');
      },
      template: '<p>{ n } e { dobro }</p>',
    });

    const instance = app.mount('#app') as any;
    await settle();

    expect(document.querySelector('#app p')!.textContent).toBe('2 e 4');
    expect(seen).toEqual(['beforeMount', 'mounted']);

    instance.n = 5;
    await settle();
    expect(document.querySelector('#app p')!.textContent).toBe('5 e 10');
    expect(observed).toEqual([5]);

    app.unmount();
  });

  it('registers components visible only inside the application', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({
      components: {
        'cartao-do-app': {
          props: ['titulo'],
          template: '<article>{ titulo }</article>',
        },
      },
      template: '<cartao-do-app titulo="Oi"></cartao-do-app>',
    });

    app.mount('#app');
    await settle();

    expect(document.querySelector('#app article')!.textContent).toBe('Oi');

    app.unmount();
    // Removed from global registry along with the application.
    expect(document.querySelector('#app article')).toBeNull();
  });

  it('delivers values via provide and inject', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({
      provide: { usuario: 'Ana' },
      components: {
        'saudacao-app': {
          inject: ['usuario'],
          template: '<span>Ola, { usuario }</span>',
        },
      },
      template: '<saudacao-app></saudacao-app>',
    });

    app.mount('#app');
    await settle();

    expect(document.querySelector('#app span')!.textContent).toBe('Ola, Ana');
    app.unmount();
  });

  it('app.provide works before mount', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({
      components: {
        'tema-app': {
          inject: { tema: { default: 'claro' } },
          template: '<b>{ tema }</b>',
        },
      },
      template: '<tema-app></tema-app>',
    });

    app.provide('tema', 'escuro');
    app.mount('#app');
    await settle();

    expect(document.querySelector('#app b')!.textContent).toBe('escuro');
    app.unmount();
  });

  it('installs plugin with app.use', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const installed = vi.fn();

    const app = createApp({ template: '<p>ok</p>' });
    app.use({ name: 'teste-app-use', install: installed }, { valor: 1 });

    expect(installed).toHaveBeenCalledTimes(1);
    app.mount('#app');
    await settle();
    app.unmount();
  });

  it('globalProperties enter expressions', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({ template: '<p>{ saudar("Ana") }</p>' });
    app.config.globalProperties.saudar = (nome: string) => `Ola, ${nome}`;

    app.mount('#app');
    await settle();

    expect(document.querySelector('#app p')!.textContent).toBe('Ola, Ana');
    app.unmount();
  });

  it('mounts on element that appears later', async () => {
    const app = createApp({
      data: () => ({ texto: 'chegou depois' }),
      template: '<p>{ texto }</p>',
    });

    // Element doesn't exist now: mounting is scheduled.
    expect(app.mount('#tardio')).toBeNull();
    expect(app.isMounted).toBe(false);

    const target = document.createElement('div');
    target.id = 'tardio';
    document.body.appendChild(target);

    const instance = await app.whenMounted();
    await settle();

    expect(instance).not.toBeNull();
    expect(app.isMounted).toBe(true);
    expect(document.querySelector('#tardio p')!.textContent).toBe('chegou depois');

    app.unmount();
  });

  it('unmount restores container to original HTML', async () => {
    document.body.innerHTML = '<div id="app"><span>carregando</span></div>';

    const app = createApp({ template: '<p>pronto</p>' });
    app.mount('#app');
    await settle();

    expect(document.querySelector('#app p')!.textContent).toBe('pronto');

    app.unmount();
    expect(document.querySelector('#app')!.innerHTML).toBe('<span>carregando</span>');
    expect(app.isMounted).toBe(false);
    expect(app.instance).toBeNull();
  });

  it('two applications coexist on same page with separate states', async () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    const one = createApp({ data: () => ({ n: 1 }), template: '<p>{ n }</p>' });
    const two = createApp({ data: () => ({ n: 9 }), template: '<p>{ n }</p>' });

    one.mount('#a');
    two.mount('#b');
    await settle();

    expect(document.querySelector('#a p')!.textContent).toBe('1');
    expect(document.querySelector('#b p')!.textContent).toBe('9');

    (one.instance as any).n = 2;
    await settle();
    expect(document.querySelector('#a p')!.textContent).toBe('2');
    expect(document.querySelector('#b p')!.textContent).toBe('9');

    one.unmount();
    two.unmount();
  });

  it('coexists with attribute mode in outside HTML', async () => {
    document.body.innerHTML =
      '<div v-data="{ fora: 10 }"><b v-text="fora"></b></div><div id="app"></div>';

    const { walk } = await import('../src/runtime/walker');
    const { rootScope } = await import('../src/runtime/scope');
    walk(document.body, rootScope);

    const app = createApp({ data: () => ({ dentro: 20 }), template: '<i>{ dentro }</i>' });
    app.mount('#app');
    await settle();

    expect(document.querySelector('b')!.textContent).toBe('10');
    expect(document.querySelector('#app i')!.textContent).toBe('20');

    app.unmount();
  });

  it('does not mount twice on same container', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({ data: () => ({ n: 0 }), template: '<p>{ n }</p>' });
    const first = app.mount('#app');
    const second = app.mount('#app');
    await settle();

    expect(first).toBe(second);
    expect(document.querySelectorAll('#app p').length).toBe(1);

    app.unmount();
  });
});

describe('own scheduler without DOMContentLoaded', () => {
  it('ready returns promise and runs callback', async () => {
    const { ready } = await import('../src/dom/query');
    const seen: string[] = [];

    const promise = ready(() => seen.push('callback'));
    await waitForMount();
    await promise;

    expect(seen).toEqual(['callback']);
  });

  it('whenElement resolves element created later', async () => {
    const { whenElement } = await import('../src/runtime/boot');
    const seen: string[] = [];

    whenElement('#depois', (el) => seen.push(el.id));
    expect(seen).toEqual([]);

    const el = document.createElement('div');
    el.id = 'depois';
    document.body.appendChild(el);

    await waitForMount();
    expect(seen).toEqual(['depois']);
  });

  it('whenElement resolves immediately if element already exists', async () => {
    document.body.innerHTML = '<div id="agora"></div>';
    const { whenElement } = await import('../src/runtime/boot');

    let found: Element | null = null;
    whenElement('#agora', (el) => {
      found = el;
    });

    expect(found).not.toBeNull();
  });
});
