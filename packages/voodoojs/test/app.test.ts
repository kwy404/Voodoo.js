/**
 * Modo aplicacao: `createApp(...).mount('#app')`.
 *
 * Cobre a paridade com o Vue que a API promete (estado, computados, metodos,
 * watch, ciclo de vida, componentes locais, provide e inject, plugins) e as
 * duas diferencas propositais: montar em um alvo que ainda nao existe, e
 * devolver o container ao HTML original no `unmount`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from '../src/reactivity';
import { createApp } from '../src/runtime/app';
import '../src/core';

async function settle(n = 4) {
  for (let i = 0; i < n; i++) await nextTick();
}

/** O agendador do mount espera um quadro; aqui o tempo passa de proposito. */
async function esperarMontagem(ms = 80) {
  await new Promise((r) => setTimeout(r, ms));
  await settle();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createApp', () => {
  it('monta o template no container e reage ao estado', async () => {
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

    const instancia = app.mount('#app');
    await settle();

    const botao = document.querySelector('#app button')!;
    expect(botao.textContent).toBe('Cliques: 0');

    (botao as HTMLButtonElement).click();
    await settle();
    expect(botao.textContent).toBe('Cliques: 1');
    expect(instancia).not.toBeNull();

    app.unmount();
  });

  it('aceita computados, watch e ciclo de vida, como no Vue', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const vistos: string[] = [];
    const observado: number[] = [];

    const app = createApp({
      data: () => ({ n: 2 }),
      computed: {
        dobro(this: any) {
          return this.n * 2;
        },
      },
      watch: {
        n(valor: number) {
          observado.push(valor);
        },
      },
      beforeMount() {
        vistos.push('beforeMount');
      },
      mounted() {
        vistos.push('mounted');
      },
      template: '<p>{ n } e { dobro }</p>',
    });

    const instancia = app.mount('#app') as any;
    await settle();

    expect(document.querySelector('#app p')!.textContent).toBe('2 e 4');
    expect(vistos).toEqual(['beforeMount', 'mounted']);

    instancia.n = 5;
    await settle();
    expect(document.querySelector('#app p')!.textContent).toBe('5 e 10');
    expect(observado).toEqual([5]);

    app.unmount();
  });

  it('registra componentes visiveis so dentro da aplicacao', async () => {
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
    // Sai do registro global junto com a aplicacao.
    expect(document.querySelector('#app article')).toBeNull();
  });

  it('entrega valores por provide e inject', async () => {
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

  it('app.provide funciona antes do mount', async () => {
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

  it('instala plugin com app.use', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const instalado = vi.fn();

    const app = createApp({ template: '<p>ok</p>' });
    app.use({ name: 'teste-app-use', install: instalado }, { valor: 1 });

    expect(instalado).toHaveBeenCalledTimes(1);
    app.mount('#app');
    await settle();
    app.unmount();
  });

  it('globalProperties entram nas expressoes', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({ template: '<p>{ saudar("Ana") }</p>' });
    app.config.globalProperties.saudar = (nome: string) => `Ola, ${nome}`;

    app.mount('#app');
    await settle();

    expect(document.querySelector('#app p')!.textContent).toBe('Ola, Ana');
    app.unmount();
  });

  it('monta em um elemento que so aparece depois', async () => {
    const app = createApp({
      data: () => ({ texto: 'chegou depois' }),
      template: '<p>{ texto }</p>',
    });

    // O elemento nao existe agora: a montagem fica com o agendador.
    expect(app.mount('#tardio')).toBeNull();
    expect(app.isMounted).toBe(false);

    const alvo = document.createElement('div');
    alvo.id = 'tardio';
    document.body.appendChild(alvo);

    const instancia = await app.whenMounted();
    await settle();

    expect(instancia).not.toBeNull();
    expect(app.isMounted).toBe(true);
    expect(document.querySelector('#tardio p')!.textContent).toBe('chegou depois');

    app.unmount();
  });

  it('unmount devolve o container ao HTML original', async () => {
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

  it('duas aplicacoes convivem na mesma pagina, com estados separados', async () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    const um = createApp({ data: () => ({ n: 1 }), template: '<p>{ n }</p>' });
    const dois = createApp({ data: () => ({ n: 9 }), template: '<p>{ n }</p>' });

    um.mount('#a');
    dois.mount('#b');
    await settle();

    expect(document.querySelector('#a p')!.textContent).toBe('1');
    expect(document.querySelector('#b p')!.textContent).toBe('9');

    (um.instance as any).n = 2;
    await settle();
    expect(document.querySelector('#a p')!.textContent).toBe('2');
    expect(document.querySelector('#b p')!.textContent).toBe('9');

    um.unmount();
    dois.unmount();
  });

  it('convive com o modo de atributos no HTML de fora', async () => {
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

  it('nao monta duas vezes no mesmo container', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    const app = createApp({ data: () => ({ n: 0 }), template: '<p>{ n }</p>' });
    const primeira = app.mount('#app');
    const segunda = app.mount('#app');
    await settle();

    expect(primeira).toBe(segunda);
    expect(document.querySelectorAll('#app p').length).toBe(1);

    app.unmount();
  });
});

describe('agendador proprio, sem DOMContentLoaded', () => {
  it('ready devolve promessa e roda o callback', async () => {
    const { ready } = await import('../src/dom/query');
    const visto: string[] = [];

    const promessa = ready(() => visto.push('callback'));
    await esperarMontagem();
    await promessa;

    expect(visto).toEqual(['callback']);
  });

  it('whenElement resolve um elemento criado depois', async () => {
    const { whenElement } = await import('../src/runtime/boot');
    const visto: string[] = [];

    whenElement('#depois', (el) => visto.push(el.id));
    expect(visto).toEqual([]);

    const el = document.createElement('div');
    el.id = 'depois';
    document.body.appendChild(el);

    await esperarMontagem();
    expect(visto).toEqual(['depois']);
  });

  it('whenElement resolve na hora quando o elemento ja existe', async () => {
    document.body.innerHTML = '<div id="agora"></div>';
    const { whenElement } = await import('../src/runtime/boot');

    let achado: Element | null = null;
    whenElement('#agora', (el) => {
      achado = el;
    });

    expect(achado).not.toBeNull();
  });
});
