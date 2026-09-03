/**
 * The floating devtools widget.
 *
 * Covers what the developer actually touches: showing up, opening the
 * inspector, dragging, hiding, and leaving nothing behind when removed.
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

/** jsdom does not implement pointer capture; the widget calls it with `?.`. */
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

describe('the devtools widget', () => {
  it('appears on the page when mounted', () => {
    expect(widget()).toBeNull();
    mountDevtoolsWidget();
    expect(widget()).not.toBeNull();
    expect(isDevtoolsWidgetMounted()).toBe(true);
  });

  it('mounting twice does not duplicate the widget', () => {
    mountDevtoolsWidget();
    mountDevtoolsWidget();
    expect(document.querySelectorAll(SELETOR)).toHaveLength(1);
  });

  it('opens and closes the inspector with one click', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    // Pressing down and lifting at the same point counts as a click, not a drag.
    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointerup', 10, 10));

    expect(isXrayEnabled()).toBe(true);
    expect(alvo.getAttribute('aria-pressed')).toBe('true');

    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointerup', 10, 10));

    expect(isXrayEnabled()).toBe(false);
    expect(alvo.getAttribute('aria-pressed')).toBe('false');
  });

  it('is reachable from the keyboard', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    expect(alvo.tagName).toBe('BUTTON');
    expect(alvo.getAttribute('aria-label')).toBeTruthy();

    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(isXrayEnabled()).toBe(true);

    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(isXrayEnabled()).toBe(false);
  });

  it('dragging moves the widget and does not open the inspector', () => {
    mountDevtoolsWidget();
    const alvo = botao();

    alvo.dispatchEvent(pointer('pointerdown', 10, 10));
    alvo.dispatchEvent(pointer('pointermove', 200, 150));
    alvo.dispatchEvent(pointer('pointerup', 200, 150));

    // Past the threshold: it was a drag, so the panel stays closed.
    expect(isXrayEnabled()).toBe(false);
    expect(widget()!.style.left).not.toBe('');
  });

  it('remembers the position between mounts', () => {
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

  it('the hide button makes the widget disappear and respects the tab', () => {
    mountDevtoolsWidget();
    const fechar = document.querySelector<HTMLButtonElement>(`${SELETOR} .v-devtools-close`)!;
    fechar.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(widget()).toBeNull();

    // Hidden in this tab: mounting again on its own does not bring it back.
    mountDevtoolsWidget();
    expect(widget()).toBeNull();

    // But an explicit request wins.
    devtoolsWidget(true);
    expect(widget()).not.toBeNull();
  });

  it('lights the pulse when the bus reports activity', () => {
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

  it('unmounting removes the widget and cancels the bus subscriptions', () => {
    const antes = devtoolsBus.count('network');
    mountDevtoolsWidget();
    expect(devtoolsBus.count('network')).toBeGreaterThan(antes);

    unmountDevtoolsWidget();

    expect(widget()).toBeNull();
    expect(isDevtoolsWidgetMounted()).toBe(false);
    expect(devtoolsBus.count('network')).toBe(antes);
  });

  it('unmounting twice does not break', () => {
    mountDevtoolsWidget();
    unmountDevtoolsWidget();
    expect(() => unmountDevtoolsWidget()).not.toThrow();
  });

  it('devtoolsWidget() toggles and reports the state', () => {
    expect(devtoolsWidget(true)).toBe(true);
    expect(devtoolsWidget()).toBe(false);
    expect(devtoolsWidget()).toBe(true);
  });
});
