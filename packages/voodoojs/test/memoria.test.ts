/**
 * A memory leak is the defect nobody sees until the page turns sluggish after
 * half an hour open. These tests exercise the mount and unmount cycles in bulk
 * and demand a return to the starting state.
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

describe('component lifecycle in bulk', () => {
  it('mounting and unmounting 500 components leaves instances empty', async () => {
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

  it('unmounting calls beforeUnmount and unmounted once per instance', async () => {
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

describe('toggling v-if does not pile up effects', () => {
  it('500 toggles keep a single block alive', async () => {
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

    // One rendered span, one anchor comment. Nothing else.
    expect(container.querySelectorAll('span').length).toBe(1);
    expect(container.childNodes.length).toBeLessThanOrEqual(3);
  });

  it('the effects of a branch leave along with the branch', async () => {
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

    // With the branch off the page, touching the state cannot run anything of
    // it again.
    (estado as Record<string, number>).n = 42;
    await settle();
    expect(execucoes).toBe(depoisDeMontar);
  });

  it('the removed element no longer holds effect scopes', async () => {
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

describe('v-for swapping lists does not pile up nodes', () => {
  it('200 replacements of the array keep the item count', async () => {
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
    // Three items plus the comment anchor.
    expect(ul.childNodes.length).toBe(4);
  });

  it('emptying the list removes every node', async () => {
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

describe('stopping effects releases the dependencies', () => {
  it('V.effect with stop() runs no more', async () => {
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

  it('V.watch returns a handle that really stops', async () => {
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

  it('EffectScope.stop() brings down every effect inside it', async () => {
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

  it('a nested scope dies along with the parent', async () => {
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

describe('listeners leave with the element', () => {
  it('@click stops answering after V.destroy()', () => {
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

  it('@click.window removes the listener from the window', () => {
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

  it('@click.outside removes the listener from the document', () => {
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

  it('500 mount and destroy cycles do not pile up firings', () => {
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

describe('store with persistence', () => {
  const NOME = 'teste-memoria';

  afterEach(() => {
    removeStore(NOME);
    localStorage.removeItem(`voodoo:store:${NOME}`);
  });

  it('writes to localStorage while it exists', async () => {
    const s = store(NOME, { n: 1 }, { persist: true });
    s.n = 2;
    await settle();
    expect(JSON.parse(localStorage.getItem(`voodoo:store:${NOME}`)!).n).toBe(2);
  });

  it('removeStore stops the persistence watcher', async () => {
    const s = store(NOME, { n: 1 }, { persist: true });
    s.n = 2;
    await settle();

    removeStore(NOME);
    expect(storeNames()).not.toContain(NOME);

    const gravado = localStorage.getItem(`voodoo:store:${NOME}`);
    s.n = 999;
    await settle();
    // The store left the registry: nothing more is written to storage.
    expect(localStorage.getItem(`voodoo:store:${NOME}`)).toBe(gravado);
  });
});

describe('a cancelled HTTP call leaves no timer pending', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('aborting the request clears the timeout', async () => {
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

    // No timer was left over: moving the clock forward fires nothing else.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a completed request leaves no timer either', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async () =>
      new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    ) as unknown as typeof fetch;

    await http.request({ url: '/rapido', timeout: 30_000 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a stopped V.resource cancels the pending request', async () => {
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

describe('text interpolation releases the effect when destroyed', () => {
  it('the text node stops following the state', async () => {
    const { root, estado } = montar('<p>{ n }</p>', { n: 1 });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe('1');

    core.destroy(root);
    (estado as Record<string, number>).n = 2;
    await settle();
    expect(p.textContent).toBe('1');
  });

  it('a thousand mount and destroy cycles leave no effect alive', async () => {
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

describe('ref and computed do not hold on to stopped effects', () => {
  it('the dep of a ref loses the effect when it stops', async () => {
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
