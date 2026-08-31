/**
 * Vazamento de memoria e o defeito que ninguem ve ate a pagina ficar lenta
 * depois de meia hora aberta. Estes testes exercitam os ciclos de montagem e
 * desmontagem em volume e cobram o retorno ao estado inicial.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  reactive,
  ref,
  nextTick,
  effect,
  watch,
  stop as stopRunner,
  EffectScope,
  effectScope,
} from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy, getEffectScopes } from '../src/runtime/walker';
import { instances } from '../src/runtime/component';
import { store, removeStore, storeNames } from '../src/store';
import { core } from '../src/core';
import { http } from '../src/http';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 3): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('ciclo de vida de componentes em volume', () => {
  it('montar e desmontar 500 componentes zera instances', async () => {
    core.component('folha-teste', {
      props: { n: { type: 'number', default: 0 } },
      state(props) {
        return { valor: props.n };
      },
      template: '<span v-text="valor"></span>',
    });

    const antes = instances.size;

    for (let i = 0; i < 500; i++) {
      const host = document.createElement('div');
      host.innerHTML = `<div v-component="folha-teste" :n="${i}"></div>`;
      document.body.appendChild(host);
      walk(host, new Scope(reactive({})));
      destroy(host);
      host.remove();
    }
    await settle();

    expect(instances.size).toBe(antes);
  });

  it('desmontar chama beforeUnmount e unmounted uma vez por instancia', async () => {
    const chamadas: string[] = [];
    core.component('contador-hooks', {
      state: () => ({ n: 0 }),
      beforeUnmount() {
        chamadas.push('beforeUnmount');
      },
      unmounted() {
        chamadas.push('unmounted');
      },
    });

    for (let i = 0; i < 20; i++) {
      const { root } = montar('<div v-component="contador-hooks"></div>');
      destroy(root);
      root.remove();
    }
    await settle();

    expect(chamadas.filter((c) => c === 'beforeUnmount').length).toBe(20);
    expect(chamadas.filter((c) => c === 'unmounted').length).toBe(20);
  });
});

describe('v-if alternado nao acumula efeitos', () => {
  it('500 alternancias mantem um unico bloco vivo', async () => {
    const { root, estado } = montar(
      '<div><span v-if="ligado" v-text="n"></span></div>',
      { ligado: true, n: 1 }
    );
    const container = root.firstElementChild as HTMLElement;

    for (let i = 0; i < 500; i++) {
      (estado as Record<string, unknown>).ligado = i % 2 === 0;
      await nextTick();
    }
    await settle();

    (estado as Record<string, unknown>).ligado = true;
    await settle();

    // Um span renderizado, um comentario de ancora. Nada mais.
    expect(container.querySelectorAll('span').length).toBe(1);
    expect(container.childNodes.length).toBeLessThanOrEqual(3);
  });

  it('os efeitos do ramo saem junto com o ramo', async () => {
    let execucoes = 0;
    const { root, estado } = montar('<div><span v-if="ligado" v-text="conta()"></span></div>', {
      ligado: true,
      n: 0,
      conta() {
        execucoes += 1;
        return (estado as Record<string, number>).n;
      },
    });
    void root;
    await settle();
    const depoisDeMontar = execucoes;

    (estado as Record<string, unknown>).ligado = false;
    await settle();

    // Com o ramo fora de cena, mexer no estado nao pode reexecutar nada dele.
    (estado as Record<string, number>).n = 42;
    await settle();
    expect(execucoes).toBe(depoisDeMontar);
  });

  it('o elemento removido nao guarda mais escopos de efeito', async () => {
    const { root, estado } = montar('<div><span v-if="v" v-text="n"></span></div>', {
      v: true,
      n: 1,
    });
    await settle();
    const span = root.querySelector('span')!;
    expect(getEffectScopes(span).length).toBeGreaterThan(0);

    (estado as Record<string, unknown>).v = false;
    await settle();
    expect(getEffectScopes(span).length).toBe(0);
  });
});

describe('v-for com troca de lista nao acumula nos', () => {
  it('200 substituicoes do array mantem a contagem de itens', async () => {
    const { root, estado } = montar(
      '<ul><li v-for="item in itens" :key="item.id" v-text="item.nome"></li></ul>',
      { itens: [{ id: 1, nome: 'a' }] }
    );
    const ul = root.querySelector('ul')!;

    for (let rodada = 0; rodada < 200; rodada++) {
      (estado as Record<string, unknown>).itens = Array.from({ length: 3 }, (_, i) => ({
        id: `${rodada}-${i}`,
        nome: `item ${i}`,
      }));
      await nextTick();
    }
    await settle();

    expect(ul.querySelectorAll('li').length).toBe(3);
    // Tres itens mais a ancora de comentario.
    expect(ul.childNodes.length).toBe(4);
  });

  it('esvaziar a lista remove todos os nos', async () => {
    const { root, estado } = montar('<ul><li v-for="n in ns" v-text="n"></li></ul>', {
      ns: [1, 2, 3, 4, 5],
    });
    await settle();
    expect(root.querySelectorAll('li').length).toBe(5);

    (estado as Record<string, unknown>).ns = [];
    await settle();
    expect(root.querySelectorAll('li').length).toBe(0);
  });
});

describe('parar efeitos solta as dependencias', () => {
  it('V.effect com stop() nao roda mais', async () => {
    const estado = reactive({ n: 0 });
    let execucoes = 0;
    const runner = effect(() => {
      void estado.n;
      execucoes += 1;
    });
    expect(execucoes).toBe(1);

    estado.n = 1;
    await settle();
    expect(execucoes).toBe(2);

    stopRunner(runner);
    estado.n = 2;
    await settle();
    expect(execucoes).toBe(2);
  });

  it('V.watch devolve um handle que realmente para', async () => {
    const estado = reactive({ n: 0 });
    let chamadas = 0;
    const parar = watch(
      () => estado.n,
      () => {
        chamadas += 1;
      }
    );

    estado.n = 1;
    await settle();
    expect(chamadas).toBe(1);

    parar();
    estado.n = 2;
    await settle();
    expect(chamadas).toBe(1);
  });

  it('EffectScope.stop() derruba todos os efeitos de dentro', async () => {
    const estado = reactive({ a: 0, b: 0 });
    let ea = 0;
    let eb = 0;
    const escopo = new EffectScope(true);
    escopo.run(() => {
      effect(
        () => {
          void estado.a;
          ea += 1;
        },
        { scope: escopo }
      );
      effect(
        () => {
          void estado.b;
          eb += 1;
        },
        { scope: escopo }
      );
    });

    estado.a = 1;
    estado.b = 1;
    await settle();
    expect(ea).toBe(2);
    expect(eb).toBe(2);

    escopo.stop();
    estado.a = 2;
    estado.b = 2;
    await settle();
    expect(ea).toBe(2);
    expect(eb).toBe(2);
    expect(escopo.effects.length).toBe(0);
  });

  it('escopo aninhado morre junto com o pai', async () => {
    const estado = reactive({ n: 0 });
    let execucoes = 0;
    const pai = effectScope(true);
    pai.run(() => {
      const filho = effectScope();
      filho.run(() => {
        effect(() => {
          void estado.n;
          execucoes += 1;
        });
      });
    });

    estado.n = 1;
    await settle();
    expect(execucoes).toBe(2);

    pai.stop();
    estado.n = 2;
    await settle();
    expect(execucoes).toBe(2);
  });
});

describe('listeners saem com o elemento', () => {
  it('@click deixa de responder depois de V.destroy()', () => {
    let cliques = 0;
    const { root } = montar('<button @click="contar()">x</button>', {
      contar: () => {
        cliques += 1;
      },
    });
    const botao = root.querySelector('button')!;

    botao.click();
    expect(cliques).toBe(1);

    core.destroy(root);
    botao.click();
    expect(cliques).toBe(1);
  });

  it('@click.window remove o listener do window', () => {
    let disparos = 0;
    const { root } = montar('<div @click.window="contar()"></div>', {
      contar: () => {
        disparos += 1;
      },
    });

    window.dispatchEvent(new MouseEvent('click'));
    expect(disparos).toBe(1);

    core.destroy(root);
    window.dispatchEvent(new MouseEvent('click'));
    expect(disparos).toBe(1);
  });

  it('@click.outside remove o listener do document', () => {
    let fora = 0;
    const { root } = montar('<div id="alvo" @click.outside="contar()"></div>', {
      contar: () => {
        fora += 1;
      },
    });
    const externo = document.createElement('button');
    document.body.appendChild(externo);

    externo.click();
    expect(fora).toBe(1);

    core.destroy(root);
    externo.click();
    expect(fora).toBe(1);
  });

  it('500 ciclos de montagem e destruicao nao acumulam disparos', () => {
    let cliques = 0;
    const botoes: HTMLElement[] = [];
    for (let i = 0; i < 500; i++) {
      const { root } = montar('<button @click="contar()">x</button>', {
        contar: () => {
          cliques += 1;
        },
      });
      botoes.push(root.querySelector('button')!);
      core.destroy(root);
      root.remove();
    }
    for (const b of botoes) b.click();
    expect(cliques).toBe(0);
  });
});

describe('store com persistencia', () => {
  const NOME = 'teste-memoria';

  afterEach(() => {
    removeStore(NOME);
    localStorage.removeItem(`voodoo:store:${NOME}`);
  });

  it('grava no localStorage enquanto existe', async () => {
    const s = store(NOME, { n: 1 }, { persist: true });
    s.n = 2;
    await settle();
    expect(JSON.parse(localStorage.getItem(`voodoo:store:${NOME}`)!).n).toBe(2);
  });

  it('removeStore para o watcher de persistencia', async () => {
    const s = store(NOME, { n: 1 }, { persist: true });
    s.n = 2;
    await settle();

    removeStore(NOME);
    expect(storeNames()).not.toContain(NOME);

    const gravado = localStorage.getItem(`voodoo:store:${NOME}`);
    s.n = 999;
    await settle();
    // O store saiu do registro: nada mais e escrito no armazenamento.
    expect(localStorage.getItem(`voodoo:store:${NOME}`)).toBe(gravado);
  });
});

describe('HTTP cancelado nao deixa timer pendente', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('abortar a requisicao limpa o timeout', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        })
    ) as unknown as typeof fetch;

    const controller = new AbortController();
    const pendente = http
      .request({ url: '/lento', timeout: 60_000, signal: controller.signal })
      .catch((err) => err);

    controller.abort();
    const resultado = await pendente;
    expect(resultado).toBeInstanceOf(Error);

    // Nenhum timer sobrou: avancar o relogio nao dispara mais nada.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uma requisicao concluida tambem nao deixa timer', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async () =>
      new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    ) as unknown as typeof fetch;

    await http.request({ url: '/rapido', timeout: 30_000 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('V.resource parado cancela a requisicao pendente', async () => {
    let abortada = false;
    globalThis.fetch = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            abortada = true;
            reject(new DOMException('', 'AbortError'));
          });
        })
    ) as unknown as typeof fetch;

    const recurso = core.resource('/api/itens');
    await nextTick();
    recurso.stop();
    await settle();

    expect(abortada).toBe(true);
  });
});

describe('interpolacao de texto solta o efeito ao ser destruida', () => {
  it('o no de texto para de acompanhar o estado', async () => {
    const { root, estado } = montar('<p>{ n }</p>', { n: 1 });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe('1');

    core.destroy(root);
    (estado as Record<string, number>).n = 2;
    await settle();
    expect(p.textContent).toBe('1');
  });

  it('mil ciclos de montagem e destruicao nao deixam efeito vivo', async () => {
    const estado = reactive({ n: 0 });
    const paragrafos: HTMLElement[] = [];
    for (let i = 0; i < 1000; i++) {
      const host = document.createElement('div');
      host.innerHTML = '<p>{ n }</p>';
      document.body.appendChild(host);
      walk(host, new Scope(estado));
      paragrafos.push(host.querySelector('p')!);
      core.destroy(host);
      host.remove();
    }

    estado.n = 7;
    await settle();
    for (const p of paragrafos) expect(p.textContent).toBe('0');
  });
});

describe('ref e computed nao seguram efeitos parados', () => {
  it('o dep de um ref perde o efeito quando ele para', async () => {
    const contador = ref(0);
    let execucoes = 0;
    const runner = effect(() => {
      void contador.value;
      execucoes += 1;
    });

    contador.value = 1;
    await settle();
    expect(execucoes).toBe(2);

    stopRunner(runner);
    contador.value = 2;
    await settle();
    expect(execucoes).toBe(2);
    expect(runner.effect.deps.length).toBe(0);
  });
});
