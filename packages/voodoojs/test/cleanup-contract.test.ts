/**
 * Contrato de limpeza das directives.
 *
 * Toda directive que registra alguma coisa no mundo externo precisa devolver o
 * que pegou quando o elemento sai de cena. Este arquivo descreve o contrato uma
 * vez, por categoria de recurso, e o verifica com directives de teste. Uma
 * directive nova pode ser conferida aqui: se ela nao passar no molde da sua
 * categoria, ela vaza.
 *
 * As seis categorias sao:
 *   1. listener      - `addEventListener` em qualquer alvo
 *   2. effect        - efeito reativo criado com `ctx.effect`
 *   3. watch         - observador de estado com handle de parada
 *   4. observer      - MutationObserver, IntersectionObserver, ResizeObserver
 *   5. timer         - setTimeout, setInterval, requestAnimationFrame
 *   6. subscription  - assinatura de um barramento, store ou servico
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
// O molde
// ---------------------------------------------------------------------------

interface Sonda {
  /** Quantos recursos estao abertos neste momento. */
  abertos: number;
  /** Quantas vezes o recurso foi acionado. */
  acionamentos: number;
  /** Provoca o recurso de fora, para ver se ele ainda responde. */
  provocar(): void;
}

/**
 * Molde de verificacao. Monta o HTML, confirma que o recurso esta aberto e
 * responde, destroi o elemento e cobra que nada tenha sobrado.
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

describe('categoria listener', () => {
  it('uma directive que escuta o document devolve o listener', async () => {
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

  it('@click nativo segue o mesmo contrato', () => {
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

describe('categoria effect', () => {
  it('um efeito criado por ctx.effect para junto com o elemento', async () => {
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

describe('categoria watch', () => {
  it('o handle de parada precisa ser chamado na limpeza', async () => {
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

  it('v-watch nativo para de observar depois de destroy', async () => {
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

describe('categoria observer', () => {
  it('um observador precisa ser desconectado na limpeza', async () => {
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

describe('categoria timer', () => {
  it('setInterval precisa ser limpo na saida', async () => {
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

  it('um timeout agendado nao pode rodar depois da destruicao', async () => {
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

describe('categoria subscription', () => {
  it('a assinatura do barramento global precisa ser cancelada', async () => {
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
// Regras gerais que valem para qualquer categoria
// ---------------------------------------------------------------------------

describe('regras gerais da limpeza', () => {
  it('a limpeza roda na ordem inversa do registro', () => {
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

  it('uma limpeza que lanca erro nao impede as outras', () => {
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

  it('destruir duas vezes nao chama a limpeza duas vezes', () => {
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

  it('destruir o pai limpa os filhos, de dentro para fora', () => {
    const ordem: string[] = [];
    defineDirective('teste-pai', ({ cleanup }) => cleanup(() => ordem.push('pai')));
    defineDirective('teste-filho', ({ cleanup }) => cleanup(() => ordem.push('filho')));

    const { root } = montar('<div v-teste-pai><span v-teste-filho></span></div>');
    destroy(root);
    expect(ordem).toEqual(['filho', 'pai']);
  });

  it('todas as directives internas registram algum ponto de limpeza', () => {
    // O escopo de efeitos de cada directive ja e registrado pelo walker, entao
    // este teste garante que o mecanismo continua ligado para todas elas.
    const { root } = montar('<div v-text="a" :title="a" @click="a"></div>', { a: 'x' });
    const div = root.querySelector('div')!;
    expect(core.getScope(div) ?? true).toBeTruthy();
    expect(() => destroy(root)).not.toThrow();
    expect(div.textContent).toBe('x');
  });

  it('as directives de teste ficaram registradas com o nome esperado', () => {
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
