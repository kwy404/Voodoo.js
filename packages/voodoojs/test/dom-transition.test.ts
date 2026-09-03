/**
 * Tests for `dom/transition`.
 *
 * Everything here runs with fake timers. `enter` and `leave` depend on two
 * chained `requestAnimationFrame` calls before scheduling the final
 * `setTimeout`, and the rAF is faked as well, so `advanceTimersByTimeAsync`
 * walks the whole sequence deterministically. That allows two things that with
 * a real timer would be flaky: asserting the intermediate state of the classes
 * and demanding `vi.getTimerCount() === 0` at the end, which is the leak test.
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

/** Creates an element attached to the document. */
function elemento(tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

/** Fakes `prefers-reduced-motion: reduce` being on. */
function ligarReducedMotion(): void {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** Milliseconds enough to get past the two frames of `nextFrame`. */
const DOIS_QUADROS = 5;

const rafOriginal = globalThis.requestAnimationFrame;

beforeEach(() => {
  document.body.innerHTML = '';
  // We do not let vitest fake the `requestAnimationFrame`: the jsdom rAF
  // depends on its own internal clock and the combination with the fake clock
  // is unstable across tests. Here a frame becomes a `setTimeout(0)` on the
  // fake clock, which makes the `nextFrame` sequence fully deterministic.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0) as unknown as number) as typeof requestAnimationFrame;
});

afterEach(() => {
  globalThis.requestAnimationFrame = rafOriginal;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Advances the fake clock until the transition ends and awaits the promise. */
async function correr(p: Promise<void>, ms = 2000): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await p;
}

describe('enter', () => {
  it('applies from + active, switches to the to class on the next frame and cleans up at the end', async () => {
    const el = elemento();
    let terminou = false;
    void enter(el, { duration: 100 }).then(() => {
      terminou = true;
    });

    // Synchronous state: still on frame zero.
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

  it('injects the built-in CSS exactly once', async () => {
    await correr(enter(elemento(), { duration: 0 }));
    await correr(leave(elemento(), { duration: 0 }));
    const blocos = document.head.querySelectorAll('style[data-voodoo="transitions"]');
    expect(blocos.length).toBe(1);
    expect(blocos[0].textContent).toContain('.v-fade-enter-active');
    expect(blocos[0].textContent).toContain('prefers-reduced-motion');
  });

  it('uses the given name to build the classes', async () => {
    const el = elemento();
    const p = enter(el, { name: 'v-slide-up', duration: 0 });
    expect(el.classList.contains('v-slide-up-enter-from')).toBe(true);
    expect(el.classList.contains('v-slide-up-enter-active')).toBe(true);

    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    await p;
    expect(el.className).toBe('');
  });

  it('custom classes beat the name and accept several per field', async () => {
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

  it('duration 0 finishes on the same frame, without scheduling a timer', async () => {
    const el = elemento();
    let terminou = false;
    void enter(el, { duration: 0 }).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with no explicit duration, it reads the duration from the computed CSS', async () => {
    const el = elemento();
    // 300ms of transition: it must not end at ~250ms and it has to end after that.
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

  it('a duration in seconds and with several entries uses the largest value', async () => {
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

  it('adds the delay to the duration of the transition', async () => {
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

  it('takes the animation into account when it lasts longer than the transition', async () => {
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

  it('with reduced motion it resolves right away and does not touch the classes', async () => {
    ligarReducedMotion();
    const el = elemento();
    el.className = 'original';
    await enter(el, { duration: 500 });
    expect(el.className).toBe('original');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not register any listener on the element', async () => {
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
  it('applies from + active, switches to the to class and cleans up at the end', async () => {
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

  it('uses the given name and the custom classes', async () => {
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

  it('with no explicit duration, it reads the duration from the computed CSS', async () => {
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

  it('duration 0 ends with no pending timer', async () => {
    const el = elemento();
    let terminou = false;
    void leave(el, { duration: 0 }).then(() => {
      terminou = true;
    });
    await vi.advanceTimersByTimeAsync(DOIS_QUADROS);
    expect(terminou).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('with reduced motion it resolves right away and does not touch the classes', async () => {
    ligarReducedMotion();
    const el = elemento();
    el.className = 'original';
    await leave(el, { duration: 500 });
    expect(el.className).toBe('original');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('fadeIn and fadeOut', () => {
  it('fadeIn starts at opacity 0, goes to 1 and gives the element back clean', async () => {
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

  it('fadeIn uses the default duration when none is given', async () => {
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

  it('fadeIn removes the display none inherited from the CSS', async () => {
    // `script` has `display:none` in the default stylesheet of the document, so
    // the branch that forces the display back has to run.
    const el = elemento('script');
    const p = fadeIn(el, 0);
    expect(el.style.display).toBe('');
    await vi.advanceTimersByTimeAsync(60);
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fadeOut ends with display none and with no leftover styles', async () => {
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

describe('slideDown and slideUp', () => {
  it('slideDown zeroes height and padding, then gives the element back without animation styles', async () => {
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
    // On the next frame the zeroed padding goes away and the height moves to
    // the target. The way back is through `removeProperty`, so the value comes
    // from the stylesheet: a padding that was inline on the element is not
    // restored. That is the price of not storing the previous state, and it is
    // worth recording so that nobody "fixes" it by accident.
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

  it('slideDown shows again an element hidden by the CSS', async () => {
    const el = elemento('script');
    const p = slideDown(el, 0);
    expect(el.style.display).toBe('block');
    await vi.advanceTimersByTimeAsync(60);
    await p;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('slideDown with the default duration', async () => {
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

  it('slideUp closes the height and hides the element at the end', async () => {
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

  it('slideUp with the default duration', async () => {
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
  it('with no browser API it runs the change directly', () => {
    // jsdom does not implement `startViewTransition`: this is the fallback path.
    expect((document as unknown as Record<string, unknown>).startViewTransition).toBeUndefined();
    let rodou = 0;
    expect(() => viewTransition(() => { rodou += 1; })).not.toThrow();
    expect(rodou).toBe(1);
  });

  it('with the API available it delegates to the browser', () => {
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

  it('with reduced motion it ignores the API and runs the change directly', () => {
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
