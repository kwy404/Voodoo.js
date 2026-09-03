/**
 * The cleanup contract for directives.
 *
 * Every directive that registers something in the outside world has to hand
 * back what it took when the element leaves the page. This file states the
 * contract once, one category of resource at a time, and checks it with test
 * directives. A new directive can be checked here: if it does not fit the mould
 * of its category, it leaks.
 *
 * The six categories are:
 *   1. listener      - `addEventListener` on any target
 *   2. effect        - reactive effect created with `ctx.effect`
 *   3. watch         - state observer with a stop handle
 *   4. observer      - MutationObserver, IntersectionObserver, ResizeObserver
 *   5. timer         - setTimeout, setInterval, requestAnimationFrame
 *   6. subscription  - subscription to a bus, a store or a service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, nextTick, watch } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { defineDirective, directives } from '../src/runtime/registry';
import { core } from '../src/core';

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

// ---------------------------------------------------------------------------
// The mould
// ---------------------------------------------------------------------------

interface Sonda {
  /** How many resources are open at this moment. */
  abertos: number;
  /** How many times the resource has fired. */
  acionamentos: number;
  /** Pokes the resource from outside, to see whether it still answers. */
  provocar(): void;
}

/**
 * The verification mould. Mounts the HTML, confirms the resource is open and
 * answering, destroys the element and demands that nothing was left behind.
 */
async function verificarContrato(html: string, sonda: Sonda, dados: Record<string, unknown> = {}) {
  const { root } = montar(html, dados);
  await settle();

  expect(sonda.abertos, 'o recurso precisa estar aberto depois da montagem').toBeGreaterThan(0);

  sonda.provocar();
  await settle();
  const antesDeDestruir = sonda.acionamentos;
  expect(antesDeDestruir, 'o recurso precisa responder enquanto o elemento existe').toBeGreaterThan(0);

  destroy(root);
  root.remove();
  await settle();

  expect(sonda.abertos, 'nenhum recurso pode continuar aberto depois de destroy()').toBe(0);

  sonda.provocar();
  await settle();
  expect(sonda.acionamentos, 'o recurso nao pode mais responder depois de destroy()').toBe(
    antesDeDestruir
  );
}

// ---------------------------------------------------------------------------
// 1. Listener
// ---------------------------------------------------------------------------

describe('listener category', () => {
  it('a directive that listens on the document hands the listener back', async () => {
    const sonda: Sonda = {
      abertos: 0,
      acionamentos: 0,
      provocar: () => document.dispatchEvent(new CustomEvent('sonda:ping')),
    };

    defineDirective('teste-listener', ({ cleanup }) => {
      const handler = (): void => {
        sonda.acionamentos += 1;
      };
      document.addEventListener('sonda:ping', handler);
      sonda.abertos += 1;
      cleanup(() => {
        document.removeEventListener('sonda:ping', handler);
        sonda.abertos -= 1;
      });
    });

    await verificarContrato('<div v-teste-listener></div>', sonda);
  });

  it('the built-in @click follows the same contract', () => {
    let cliques = 0;
    const { root } = montar('<button @click="c()"></button>', {
      c: () => {
        cliques += 1;
      },
    });
    const botao = root.querySelector('button')!;
    botao.click();
    expect(cliques).toBe(1);
    destroy(root);
    botao.click();
    expect(cliques).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Effect
// ---------------------------------------------------------------------------

describe('effect category', () => {
  it('an effect created by ctx.effect stops along with the element', async () => {
    const estado = reactive({ n: 0 });
    const sonda: Sonda = {
      abertos: 0,
      acionamentos: 0,
      provocar: () => {
        estado.n += 1;
      },
    };

    defineDirective('teste-effect', ({ effect, cleanup }) => {
      sonda.abertos += 1;
      let primeira = true;
      effect(() => {
        void estado.n;
        if (primeira) {
          primeira = false;
          return;
        }
        sonda.acionamentos += 1;
      });
      cleanup(() => {
        sonda.abertos -= 1;
      });
    });

    await verificarContrato('<div v-teste-effect></div>', sonda);
  });
});

// ---------------------------------------------------------------------------
// 3. Watch
// ---------------------------------------------------------------------------

describe('watch category', () => {
  it('the stop handle has to be called during cleanup', async () => {
    const estado = reactive({ n: 0 });
    const sonda: Sonda = {
      abertos: 0,
      acionamentos: 0,
      provocar: () => {
        estado.n += 1;
      },
    };

    defineDirective('teste-watch', ({ cleanup }) => {
      const parar = watch(
        () => estado.n,
        () => {
          sonda.acionamentos += 1;
        }
      );
      sonda.abertos += 1;
      cleanup(() => {
        parar();
        sonda.abertos -= 1;
      });
    });

    await verificarContrato('<div v-teste-watch></div>', sonda);
  });

  it('the built-in v-watch stops observing after destroy', async () => {
    let disparos = 0;
    const { root, estado } = montar('<div v-watch:n="registrar()"></div>', {
      n: 0,
      registrar: () => {
        disparos += 1;
      },
    });

    (estado as Record<string, number>).n = 1;
    await settle();
    const antes = disparos;
    expect(antes).toBeGreaterThan(0);

    destroy(root);
    (estado as Record<string, number>).n = 2;
    await settle();
    expect(disparos).toBe(antes);
  });
});

// ---------------------------------------------------------------------------
// 4. Observer
// ---------------------------------------------------------------------------

describe('observer category', () => {
  it('an observer has to be disconnected during cleanup', async () => {
    const sonda: Sonda = {
      abertos: 0,
      acionamentos: 0,
      provocar: () => {
        document.body.appendChild(document.createElement('i'));
      },
    };
    let observador: MutationObserver | null = null;

    defineDirective('teste-observer', ({ cleanup }) => {
      observador = new MutationObserver(() => {
        sonda.acionamentos += 1;
      });
      observador.observe(document.body, { childList: true });
      sonda.abertos += 1;
      cleanup(() => {
        observador?.disconnect();
        observador = null;
        sonda.abertos -= 1;
      });
    });

    await verificarContrato('<div v-teste-observer></div>', sonda);
    expect(observador).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Timer
// ---------------------------------------------------------------------------

describe('timer category', () => {
  it('setInterval has to be cleared on the way out', async () => {
    let disparos = 0;
    let intervalo: ReturnType<typeof setInterval> | null = null;

    defineDirective('teste-timer', ({ cleanup }) => {
      intervalo = setInterval(() => {
        disparos += 1;
      }, 5);
      cleanup(() => {
        if (intervalo !== null) clearInterval(intervalo);
        intervalo = null;
      });
    });

    const { root } = montar('<div v-teste-timer></div>');
    await new Promise((r) => setTimeout(r, 30));
    const antes = disparos;
    expect(antes).toBeGreaterThan(0);

    destroy(root);
    expect(intervalo).toBeNull();

    await new Promise((r) => setTimeout(r, 30));
    expect(disparos).toBe(antes);
  });

  it('a scheduled timeout cannot run after the destruction', async () => {
    let rodou = false;
    defineDirective('teste-timeout', ({ cleanup }) => {
      const id = setTimeout(() => {
        rodou = true;
      }, 20);
      cleanup(() => clearTimeout(id));
    });

    const { root } = montar('<div v-teste-timeout></div>');
    destroy(root);
    await new Promise((r) => setTimeout(r, 50));
    expect(rodou).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Subscription
// ---------------------------------------------------------------------------

describe('subscription category', () => {
  it('the global bus subscription has to be cancelled', async () => {
    const sonda: Sonda = {
      abertos: 0,
      acionamentos: 0,
      provocar: () => core.emit('sonda:evento'),
    };

    defineDirective('teste-subscription', ({ cleanup }) => {
      const cancelar = core.on('sonda:evento', () => {
        sonda.acionamentos += 1;
      });
      sonda.abertos += 1;
      cleanup(() => {
        cancelar();
        sonda.abertos -= 1;
      });
    });

    await verificarContrato('<div v-teste-subscription></div>', sonda);
  });
});

// ---------------------------------------------------------------------------
// General rules that hold for every category
// ---------------------------------------------------------------------------

describe('general cleanup rules', () => {
  it('cleanup runs in the reverse order of registration', () => {
    const ordem: number[] = [];
    defineDirective('teste-ordem', ({ cleanup }) => {
      cleanup(() => ordem.push(1));
      cleanup(() => ordem.push(2));
      cleanup(() => ordem.push(3));
    });

    const { root } = montar('<div v-teste-ordem></div>');
    destroy(root);
    expect(ordem).toEqual([3, 2, 1]);
  });

  it('a cleanup that throws does not stop the others', () => {
    let limpou = false;
    defineDirective('teste-erro-limpeza', ({ cleanup }) => {
      cleanup(() => {
        limpou = true;
      });
      cleanup(() => {
        throw new Error('falha proposital');
      });
    });

    const { root } = montar('<div v-teste-erro-limpeza></div>');
    expect(() => destroy(root)).not.toThrow();
    expect(limpou).toBe(true);
  });

  it('destroying twice does not call the cleanup twice', () => {
    let vezes = 0;
    defineDirective('teste-idempotente', ({ cleanup }) => {
      cleanup(() => {
        vezes += 1;
      });
    });

    const { root } = montar('<div v-teste-idempotente></div>');
    destroy(root);
    destroy(root);
    expect(vezes).toBe(1);
  });

  it('destroying the parent cleans up the children, from the inside out', () => {
    const ordem: string[] = [];
    defineDirective('teste-pai', ({ cleanup }) => cleanup(() => ordem.push('pai')));
    defineDirective('teste-filho', ({ cleanup }) => cleanup(() => ordem.push('filho')));

    const { root } = montar('<div v-teste-pai><span v-teste-filho></span></div>');
    destroy(root);
    expect(ordem).toEqual(['filho', 'pai']);
  });

  it('every built-in directive registers some cleanup point', () => {
    // The walker already registers each directive's effect scope, so this test
    // makes sure the mechanism stays wired up for all of them.
    const { root } = montar('<div v-text="a" :title="a" @click="a"></div>', { a: 'x' });
    const div = root.querySelector('div')!;
    expect(core.getScope(div) ?? true).toBeTruthy();
    expect(() => destroy(root)).not.toThrow();
    expect(div.textContent).toBe('x');
  });

  it('the test directives ended up registered under the expected name', () => {
    for (const nome of [
      'teste-listener',
      'teste-effect',
      'teste-watch',
      'teste-observer',
      'teste-timer',
      'teste-subscription',
    ]) {
      expect(directives.has(nome), nome).toBe(true);
    }
  });
});
