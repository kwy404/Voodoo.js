/**
 * Testes de `dom/transition`.
 *
 * Tudo aqui roda com timers falsos. `enter` e `leave` dependem de dois
 * `requestAnimationFrame` encadeados antes de agendar o `setTimeout` final, e o
 * vitest tambem finge o rAF, entao `advanceTimersByTimeAsync` percorre a
 * sequencia inteira de forma deterministica. Isso permite duas coisas que com
 * timer real seriam flaky: afirmar o estado intermediario das classes e cobrar
 * `vi.getTimerCount() === 0` no fim, que e o teste de vazamento.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enter,
  fadeIn,
  fadeOut,
  leave,
  slideDown,
  slideUp,
  viewTransition,
} from '../src/dom/transition';

/** Cria um elemento ligado ao documento. */
function elemento(tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

/** Finge `prefers-reduced-motion: reduce` ligado. */
function ligarReducedMotion(): void {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** Milissegundos suficientes para vencer os dois quadros do `nextFrame`. */
const DOIS_QUADROS = 5;

const rafOriginal = globalThis.requestAnimationFrame;

beforeEach(() => {
  document.body.innerHTML = '';
  // Nao deixamos o vitest fingir o `requestAnimationFrame`: o rAF do jsdom
  // depende do relogio interno dele e a combinacao com o relogio falso e
  // instavel entre testes. Aqui um quadro vira um `setTimeout(0)` do relogio
  // falso, o que torna a sequencia de `nextFrame` totalmente deterministica.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0) as unknown as number) as typeof requestAnimationFrame;
});

afterEach(() => {
  globalThis.requestAnimationFrame = rafOriginal;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Avanca o relogio falso ate a transicao terminar e espera a promessa. */
async function correr(p: Promise<void>, ms = 2000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await p;
}

describe('enter', () => {
  it('aplica from + active, troca para to no quadro seguinte e limpa no fim', async () => {
    const el = elemento();
    let terminou = false;
    void enter(el, { duration: 100 }).then(() => {
      terminou = true;
    });

    // Estado sincrono: ainda no quadro zero.
    expect(el.classList.contains('v-fade-enter-from')).toBe(true);
    expect(el.classList.contains('v-fade-enter-active')).toBe(true);
    expect(el.classList.contains('v-fade-enter-to')).toBe(false);

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(el.classList.contains('v-fade-enter-from')).toBe(false);
    expect(el.classList.contains('v-fade-enter-to')).toBe(true);
    expect(el.classList.contains('v-fade-enter-active')).toBe(true);
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(el.className).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('injeta o CSS embutido uma unica vez', async () => {
    await correr(enter(elemento(), { duration: 0 }));
    await correr(leave(elemento(), { duration: 0 }));
    const blocos = document.head.querySelectorAll('style[data-voodoo="transitions"]');
    expect(blocos.length).toBe(1);
    expect(blocos[0].textContent).toContain('.v-fade-enter-active');
    expect(blocos[0].textContent).toContain('prefers-reduced-motion');
  });

  it('usa o nome informado para montar as classes', async () => {
    const el = elemento();
    const p = enter(el, { name: 'v-slide-up', duration: 0 });
    expect(el.classList.contains('v-slide-up-enter-from')).toBe(true);
    expect(el.classList.contains('v-slide-up-enter-active')).toBe(true);

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    await p;
    expect(el.className).toBe('');
  });

  it('classes personalizadas vencem o nome e aceitam varias por campo', async () => {
    const el = elemento();
    const p = enter(el, {
      name: 'ignorado',
      enterFrom: 'de-fora opaco',
      enterActive: 'animando',
      enterTo: 'no-lugar',
      duration: 0,
    });
    expect(el.classList.contains('de-fora')).toBe(true);
    expect(el.classList.contains('opaco')).toBe(true);
    expect(el.classList.contains('animando')).toBe(true);
    expect(el.classList.contains('ignorado-enter-from')).toBe(false);

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    await p;
    expect(el.className).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('duration 0 termina no mesmo quadro, sem agendar timer', async () => {
    const el = elemento();
    let terminou = false;
    void enter(el, { duration: 0 }).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sem duration explicita, le a duracao do CSS computado', async () => {
    const el = elemento();
    // 300ms de transicao: nao pode terminar aos ~250ms e tem que terminar depois.
    el.style.transitionDuration = '300ms';
    let terminou = false;
    void enter(el).then(() => {
      terminou = true;
    });

    await vi.advanceTimersByTimeAsync(250);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('duracao em segundos e com varias entradas usa o maior valor', async () => {
    const el = elemento();
    el.style.setProperty('transition-duration', '0.05s, 0.4s');
    let terminou = false;
    void enter(el).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(terminou).toBe(true);
  });

  it('soma o delay a duracao da transicao', async () => {
    const el = elemento();
    el.style.transitionDuration = '100ms';
    el.style.transitionDelay = '300ms';
    let terminou = false;
    void enter(el).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
  });

  it('considera a animacao quando ela dura mais que a transicao', async () => {
    const el = elemento();
    el.style.transitionDuration = '10ms';
    el.style.animationDuration = '0.4s';
    let terminou = false;
    void enter(el).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
  });

  it('com reduced motion resolve na hora e nao toca nas classes', async () => {
    ligarReducedMotion();
    const el = elemento();
    el.className = 'original';
    await enter(el, { duration: 500 });
    expect(el.className).toBe('original');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('nao registra nenhum listener no elemento', async () => {
    const el = elemento();
    const espia = vi.spyOn(el, 'addEventListener');
    const p = enter(el, { duration: 10 });
    await vi.advanceTimersByTimeAsync(200);
    await p;
    expect(espia).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('leave', () => {
  it('aplica from + active, troca para to e limpa no fim', async () => {
    const el = elemento();
    let terminou = false;
    void leave(el, { duration: 100 }).then(() => {
      terminou = true;
    });

    expect(el.classList.contains('v-fade-leave-from')).toBe(true);
    expect(el.classList.contains('v-fade-leave-active')).toBe(true);

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(el.classList.contains('v-fade-leave-from')).toBe(false);
    expect(el.classList.contains('v-fade-leave-to')).toBe(true);
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(el.className).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('usa o nome informado e as classes personalizadas', async () => {
    const el = elemento();
    const p1 = leave(el, { name: 'v-blur', duration: 0 });
    expect(el.classList.contains('v-blur-leave-from')).toBe(true);
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    await p1;

    const outro = elemento();
    const p2 = leave(outro, { leaveFrom: 'saindo', leaveActive: 'a b', leaveTo: 'fora', duration: 0 });
    expect(outro.classList.contains('saindo')).toBe(true);
    expect(outro.classList.contains('a')).toBe(true);
    expect(outro.classList.contains('b')).toBe(true);
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    await p2;
    expect(outro.className).toBe('');
  });

  it('sem duration explicita, le a duracao do CSS computado', async () => {
    const el = elemento();
    el.style.transitionDuration = '300ms';
    let terminou = false;
    void leave(el).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(250);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('duration 0 encerra sem timer pendente', async () => {
    const el = elemento();
    let terminou = false;
    void leave(el, { duration: 0 }).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('com reduced motion resolve na hora e nao toca nas classes', async () => {
    ligarReducedMotion();
    const el = elemento();
    el.className = 'original';
    await leave(el, { duration: 500 });
    expect(el.className).toBe('original');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('fadeIn e fadeOut', () => {
  it('fadeIn sai de opacity 0, vai a 1 e devolve o elemento limpo', async () => {
    const el = elemento();
    let terminou = false;
    void fadeIn(el, 100).then(() => {
      terminou = true;
    });
    expect(el.style.opacity).toBe('0');
    expect(el.style.transition).toContain('opacity 100ms');

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(el.style.opacity).toBe('1');
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(el.style.opacity).toBe('');
    expect(el.style.transition).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fadeIn usa a duracao padrao quando nenhuma e informada', async () => {
    const el = elemento();
    let terminou = false;
    void fadeIn(el).then(() => {
      terminou = true;
    });
    expect(el.style.transition).toContain('220ms');
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(terminou).toBe(true);
  });

  it('fadeIn tira o display none herdado do CSS', async () => {
    // `script` tem `display:none` na folha padrao do documento, entao o ramo
    // que forca o display a voltar precisa rodar.
    const el = elemento('script');
    const p = fadeIn(el, 0);
    expect(el.style.display).toBe('');
    await vi.advanceTimersByTimeAsync(60);
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fadeOut termina com display none e sem estilos residuais', async () => {
    const el = elemento();
    let terminou = false;
    void fadeOut(el, 50).then(() => {
      terminou = true;
    });
    expect(el.style.opacity).toBe('0');
    expect(el.style.transition).toContain('opacity 50ms');
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(100);
    expect(terminou).toBe(true);
    expect(el.style.display).toBe('none');
    expect(el.style.opacity).toBe('');
    expect(el.style.transition).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('slideDown e slideUp', () => {
  it('slideDown zera altura e padding, depois devolve o elemento sem estilos de animacao', async () => {
    const el = elemento();
    el.style.paddingTop = '8px';
    el.style.paddingBottom = '8px';
    let terminou = false;
    void slideDown(el, 100).then(() => {
      terminou = true;
    });
    expect(el.style.height).toBe('0px');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.paddingTop).toBe('0px');
    expect(el.style.transition).toContain('height 100ms');

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    // No quadro seguinte o padding zerado sai e a altura vai para o alvo. A
    // volta e por `removeProperty`, entao o valor vem da folha de estilo: um
    // padding que estava inline no elemento nao e restaurado. E o preco de nao
    // guardar o estado anterior, e vale registrar para ninguem "consertar" sem
    // querer.
    expect(el.style.paddingTop).toBe('');
    expect(el.style.height).toBe('0px');
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(el.style.height).toBe('');
    expect(el.style.overflow).toBe('');
    expect(el.style.transition).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('slideDown reexibe elemento escondido pelo CSS', async () => {
    const el = elemento('script');
    const p = slideDown(el, 0);
    expect(el.style.display).toBe('block');
    await vi.advanceTimersByTimeAsync(60);
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('slideDown com duracao padrao', async () => {
    const el = elemento();
    let terminou = false;
    void slideDown(el).then(() => {
      terminou = true;
    });
    expect(el.style.transition).toContain('240ms');
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(120);
    expect(terminou).toBe(true);
  });

  it('slideUp fecha a altura e esconde o elemento no fim', async () => {
    const el = elemento();
    el.style.paddingTop = '8px';
    let terminou = false;
    void slideUp(el, 100).then(() => {
      terminou = true;
    });
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.transition).toContain('height 100ms');

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(el.style.height).toBe('0px');
    expect(el.style.paddingTop).toBe('0px');
    expect(terminou).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(true);
    expect(el.style.display).toBe('none');
    expect(el.style.height).toBe('');
    expect(el.style.paddingTop).toBe('');
    expect(el.style.overflow).toBe('');
    expect(el.style.transition).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('slideUp com duracao padrao', async () => {
    const el = elemento();
    let terminou = false;
    void slideUp(el).then(() => {
      terminou = true;
    });
    expect(el.style.transition).toContain('240ms');
    await vi.advanceTimersByTimeAsync(200);
    expect(terminou).toBe(false);
    await vi.advanceTimersByTimeAsync(120);
    expect(terminou).toBe(true);
  });
});

describe('viewTransition', () => {
  it('sem a API do navegador executa a mudanca direto', () => {
    // jsdom nao implementa `startViewTransition`: este e o caminho alternativo.
    expect((document as unknown as Record<string, unknown>).startViewTransition).toBeUndefined();
    let rodou = 0;
    expect(() => viewTransition(() => { rodou += 1; })).not.toThrow();
    expect(rodou).toBe(1);
  });

  it('com a API disponivel delega para o navegador', () => {
    const api = vi.fn((cb: () => void) => cb());
    (document as unknown as Record<string, unknown>).startViewTransition = api;
    try {
      let rodou = 0;
      viewTransition(() => { rodou += 1; });
      expect(api).toHaveBeenCalledTimes(1);
      expect(rodou).toBe(1);
    } finally {
      delete (document as unknown as Record<string, unknown>).startViewTransition;
    }
  });

  it('com reduced motion ignora a API e executa a mudanca direto', () => {
    ligarReducedMotion();
    const api = vi.fn();
    (document as unknown as Record<string, unknown>).startViewTransition = api;
    try {
      let rodou = 0;
      viewTransition(() => { rodou += 1; });
      expect(api).not.toHaveBeenCalled();
      expect(rodou).toBe(1);
    } finally {
      delete (document as unknown as Record<string, unknown>).startViewTransition;
    }
  });
});
