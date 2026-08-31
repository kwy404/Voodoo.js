/**
 * Widget flutuante das devtools.
 *
 * Cobre o que o desenvolvedor encosta: aparecer, abrir o inspetor, arrastar,
 * esconder, e nao deixar nada para tras ao ser removido.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  devtoolsWidget,
  isDevtoolsWidgetMounted,
  mountDevtoolsWidget,
  unmountDevtoolsWidget,
} from '../src/devtools/launcher';
import { devtoolsBus } from '../src/devtools/bus';
import { isXrayEnabled, xray } from '../src/devtools/xray';

const SELETOR = '[data-voodoo-devtools="widget"]';

function widget(): HTMLElement | null {
  return document.querySelector<HTMLElement>(SELETOR);
}

function botao(): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(`${SELETOR} .v-devtools-btn`);
  if (!el) throw new Error('botao do widget nao encontrado');
  return el;
}

/** jsdom nao implementa captura de ponteiro; o widget chama com `?.`. */
function pointer(tipo: string, x = 0, y = 0): PointerEvent {
  const evento = new MouseEvent(tipo, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  }) as unknown as PointerEvent;
  Object.defineProperty(evento, 'pointerId', { value: 1 });
  Object.defineProperty(evento, 'button', { value: 0 });
  return evento;
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  unmountDevtoolsWidget();
  xray(false);
  document.body.innerHTML = '';
});

describe('widget das devtools', () => {
  it('aparece na pagina quando montado', () => {
    expect(widget()).toBeNull();
    mountDevtoolsWidget();
    expect(widget()).not.toBeNull();
    expect(isDevtoolsWidgetMounted()).toBe(true);
  });

  it('montar duas vezes nao duplica o widget', () => {
    mountDevtoolsWidget();
    mountDevtoolsWidget();
    expect(document.querySelectorAll(SELETOR)).toHaveLength(1);
  });

  it('abre e fecha o inspetor com um clique', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    // Descer e subir no mesmo ponto conta como clique, nao como arrasto.
    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointerup', 10, 10));

    expect(isXrayEnabled()).toBe(true);
    expect(alvo.getAttribute('aria-pressed')).toBe('true');

    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointerup', 10, 10));

    expect(isXrayEnabled()).toBe(false);
    expect(alvo.getAttribute('aria-pressed')).toBe('false');
  });

  it('e acessivel pelo teclado', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    expect(alvo.tagName).toBe('BUTTON');
    expect(alvo.getAttribute('aria-label')).toBeTruthy();

    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isXrayEnabled()).toBe(true);

    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(isXrayEnabled()).toBe(false);
  });

  it('arrastar move o widget e nao abre o inspetor', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointermove', 200, 150));
    alvo.dispatchEvent(pointer('pointerup', 200, 150));

    // Passou do limiar: foi arrasto, entao o painel continua fechado.
    expect(isXrayEnabled()).toBe(false);
    expect(widget()!.style.left).not.toBe('');
  });

  it('lembra a posicao entre montagens', () => {
    mountDevtoolsWidget();
    const alvo = botao();
    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointermove', 120, 90));
    alvo.dispatchEvent(pointer('pointerup', 120, 90));

    unmountDevtoolsWidget();
    mountDevtoolsWidget();

    expect(widget()!.style.left).not.toBe('');
    expect(widget()!.style.top).not.toBe('');
  });

  it('o botao de esconder some com o widget e respeita a aba', () => {
    mountDevtoolsWidget();
    const fechar = document.querySelector<HTMLButtonElement>(`${SELETOR} .v-devtools-close`)!;
    fechar.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(widget()).toBeNull();

    // Escondido nesta aba: montar de novo por conta propria nao traz de volta.
    mountDevtoolsWidget();
    expect(widget()).toBeNull();

    // Mas o pedido explicito vence.
    devtoolsWidget(true);
    expect(widget()).not.toBeNull();
  });

  it('acende o pulso quando o barramento reporta atividade', () => {
    vi.useFakeTimers();
    mountDevtoolsWidget();
    const pulso = document.querySelector<HTMLElement>(`${SELETOR} .v-devtools-pulse`)!;

    expect(pulso.getAttribute('data-on')).toBe('false');
    devtoolsBus.emit('network', { method: 'GET', url: '/api/teste', status: 200, ok: true });
    expect(pulso.getAttribute('data-on')).toBe('true');

    vi.advanceTimersByTime(400);
    expect(pulso.getAttribute('data-on')).toBe('false');
    vi.useRealTimers();
  });

  it('desmontar remove o widget e cancela as assinaturas do barramento', () => {
    const antes = devtoolsBus.count('network');
    mountDevtoolsWidget();
    expect(devtoolsBus.count('network')).toBeGreaterThan(antes);

    unmountDevtoolsWidget();

    expect(widget()).toBeNull();
    expect(isDevtoolsWidgetMounted()).toBe(false);
    expect(devtoolsBus.count('network')).toBe(antes);
  });

  it('desmontar duas vezes nao quebra', () => {
    mountDevtoolsWidget();
    unmountDevtoolsWidget();
    expect(() => unmountDevtoolsWidget()).not.toThrow();
  });

  it('devtoolsWidget() alterna e informa o estado', () => {
    expect(devtoolsWidget(true)).toBe(true);
    expect(devtoolsWidget()).toBe(false);
    expect(devtoolsWidget()).toBe(true);
  });
});
