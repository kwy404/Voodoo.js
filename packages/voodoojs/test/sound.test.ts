/**
 * Tests for the sound module.
 *
 * jsdom does not implement the Web Audio API, so the context is replaced by a
 * stand-in that records what would have been played. That makes it possible to
 * check the frequencies, the durations and the envelope without depending on
 * real audio.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import { sound, efeitos, getFrequencyForNote } from '../src/sound';
import '../src/core';

interface Toque {
  forma: string;
  frequencia: number;
  inicio: number;
  fim: number;
  volume: number;
}

let tocados: Toque[] = [];

/** A make-believe audio context, enough for the module to work. */
function instalarAudioFalso(): void {
  tocados = [];

  class OsciladorFalso {
    type = 'sine';
    frequency = {
      valor: 0,
      setValueAtTime(v: number) {
        this.valor = v;
      },
      exponentialRampToValueAtTime() {
        // The ramp does not change what we need to check.
      },
    };
    private inicio = 0;
    private ganho: GanhoFalso | null = null;

    connect(destino: GanhoFalso): void {
      this.ganho = destino;
    }
    start(quando: number): void {
      this.inicio = quando;
    }
    stop(quando: number): void {
      tocados.push({
        forma: this.type,
        frequencia: this.frequency.valor,
        inicio: this.inicio,
        fim: quando,
        volume: this.ganho?.pico ?? 0,
      });
    }
  }

  class GanhoFalso {
    pico = 0;
    gain = {
      dono: this as GanhoFalso,
      setValueAtTime() {
        // starting value, of no interest to the test
      },
      exponentialRampToValueAtTime(valor: number) {
        if (valor > this.dono.pico) this.dono.pico = valor;
      },
    };
    connect(): void {
      // final destination, nothing to do
    }
  }

  class ContextoFalso {
    currentTime = 0;
    state = 'running';
    destination = {};
    createOscillator(): OsciladorFalso {
      return new OsciladorFalso();
    }
    createGain(): GanhoFalso {
      return new GanhoFalso();
    }
    resume(): Promise<void> {
      return Promise.resolve();
    }
  }

  (window as unknown as { AudioContext: unknown }).AudioContext =
    ContextoFalso as unknown as typeof AudioContext;
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  instalarAudioFalso();
  sound.unmute();
  sound.volume(0.5);
});

describe('ready-made effects', () => {
  it('the library ships the expected interface effects', () => {
    for (const nome of ['click', 'pop', 'success', 'error', 'notify', 'open', 'close']) {
      expect(sound.names).toContain(nome);
    }
  });

  it('playing an effect produces one layer per declared sound', () => {
    sound.play('success');
    expect(tocados.length).toBe(efeitos.success.camadas.length);
  });

  it('the success effect rises in pitch, and the error one falls', () => {
    sound.play('success');
    const subida = tocados.map((t) => t.frequencia);
    expect(subida[1]).toBeGreaterThan(subida[0]);

    tocados = [];
    sound.play('error');
    const descida = tocados.map((t) => t.frequencia);
    expect(descida[1]).toBeLessThan(descida[0]);
  });

  it('layers with a delay start later', () => {
    sound.play('complete');
    expect(tocados[1].inicio).toBeGreaterThan(tocados[0].inicio);
    expect(tocados[2].inicio).toBeGreaterThan(tocados[1].inicio);
  });
});

describe('notes and frequencies', () => {
  it('converts a note name into hertz', () => {
    expect(getFrequencyForNote('la')).toBeCloseTo(440, 1);
    expect(getFrequencyForNote('do')).toBeCloseTo(261.63, 1);
    expect(getFrequencyForNote('a')).toBeCloseTo(440, 1);
  });

  it('the octave doubles the frequency', () => {
    expect(getFrequencyForNote('la5')).toBeCloseTo(880, 1);
    expect(getFrequencyForNote('la3')).toBeCloseTo(220, 1);
  });

  it('an unknown name returns null', () => {
    expect(getFrequencyForNote('xyz')).toBeNull();
  });

  it('tone plays the requested frequency', () => {
    sound.tone(660, 100);
    expect(tocados[0].frequencia).toBe(660);
    // The oscillator stops 20 ms after the end of the envelope, a margin that
    // avoids the click you get when the volume is cut all at once.
    expect(tocados[0].fim - tocados[0].inicio).toBeCloseTo(0.12, 2);
  });

  it('note accepts the note name', () => {
    sound.note('sol');
    expect(tocados[0].frequencia).toBeCloseTo(392, 1);
  });

  it('play with a note name works with no effect registered', () => {
    sound.play('mi');
    expect(tocados[0].frequencia).toBeCloseTo(329.63, 1);
  });
});

describe('volume and silence', () => {
  it('the overall volume goes into the peak calculation', () => {
    sound.volume(1);
    sound.tone(440, 50, { volume: 1 });
    const alto = tocados[0].volume;

    tocados = [];
    sound.volume(0.25);
    sound.tone(440, 50, { volume: 1 });
    const baixo = tocados[0].volume;

    expect(baixo).toBeLessThan(alto);
  });

  it('muted plays nothing', () => {
    sound.mute();
    sound.play('click');
    sound.tone(440, 50);
    sound.note('la');
    expect(tocados.length).toBe(0);
  });

  it('toggle flips and returns the new state', () => {
    expect(sound.muted).toBe(false);
    expect(sound.toggle()).toBe(true);
    expect(sound.muted).toBe(true);
    expect(sound.toggle()).toBe(false);
  });

  it('the volume preference is kept', () => {
    sound.volume(0.7);
    expect(localStorage.getItem('voodoo:sound:volume')).toContain('0.7');
  });
});

describe('effects of your own', () => {
  it('define registers a new effect and play finds it', () => {
    sound.define('meuAviso', {
      volume: 0.5,
      camadas: [{ frequencia: 700, duracao: 0.1 }],
    });
    expect(sound.names).toContain('meuAviso');

    sound.play('meuAviso');
    expect(tocados[0].frequencia).toBe(700);
  });
});

describe('directive v-sound', () => {
  function montar(html: string, dados: Record<string, unknown> = {}) {
    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.appendChild(root);
    walk(root, new Scope(reactive(dados)));
    return root;
  }

  it('plays on click, which is the default event', () => {
    const root = montar('<button v-sound="click">ok</button>');
    expect(tocados.length).toBe(0);

    root.querySelector('button')!.click();
    expect(tocados.length).toBeGreaterThan(0);
  });

  it('the argument picks another event', () => {
    const root = montar('<input v-sound:input="type">');
    const campo = root.querySelector('input')!;

    campo.click();
    expect(tocados.length).toBe(0);

    campo.dispatchEvent(new Event('input'));
    expect(tocados.length).toBe(1);
  });

  it('accepts a note name', () => {
    const root = montar('<button v-sound="la">nota</button>');
    root.querySelector('button')!.click();
    expect(tocados[0].frequencia).toBeCloseTo(440, 1);
  });

  it('stops playing once the element leaves', async () => {
    const root = montar('<button v-sound="click">ok</button>');
    const botao = root.querySelector('button')!;

    const { destroy } = await import('../src/runtime/walker');
    destroy(root);

    botao.click();
    expect(tocados.length).toBe(0);
  });
});

describe('directive v-mute', () => {
  it('toggles the mute and shows it on the button itself', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button v-mute>Som</button>';
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));

    const botao = root.querySelector('button')!;
    expect(botao.getAttribute('aria-pressed')).toBe('false');

    botao.click();
    expect(sound.muted).toBe(true);
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.classList.contains('v-muted')).toBe(true);

    botao.click();
    expect(sound.muted).toBe(false);
    expect(botao.classList.contains('v-muted')).toBe(false);
  });
});

describe('environment without support', () => {
  it('does not throw when the Web Audio API does not exist', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => sound.play('click')).not.toThrow();
    expect(() => sound.tone(440)).not.toThrow();

    aviso.mockRestore();
  });
});

/**
 * Regression: a page could not show whether it was muted.
 *
 * `sound.muted` reads a module variable and localStorage, both invisible to the
 * Proxy, so `v-show="$sound.muted"` rendered once and then never moved. With no
 * way to display the state, pressing the mute button looked like it did
 * nothing, and that is exactly how it was reported.
 */
describe('mute state is observable', () => {
  beforeEach(() => {
    sound.unmute();
  });

  it('an effect reading $sound.muted re-runs when it changes', async () => {
    const { effect, stop, nextTick } = await import('../src/reactivity');
    const seen: boolean[] = [];
    const runner = effect(() => seen.push(sound.muted));

    expect(seen).toEqual([false]);

    sound.mute();
    await nextTick();
    expect(seen).toEqual([false, true]);

    sound.unmute();
    await nextTick();
    expect(seen).toEqual([false, true, false]);

    stop(runner);
  });

  it('v-mute marks the element in both directions', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button v-mute>Sound</button>';
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));

    const button = root.querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('v-mute-on')).toBe(true);
    expect(button.classList.contains('v-muted')).toBe(false);

    button.click();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('v-muted')).toBe(true);
    expect(button.classList.contains('v-mute-on')).toBe(false);
  });

  it('the muted class is actually styled, so the button changes', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button v-mute>Sound</button>';
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));

    // The class existed and nothing styled it, which is why pressing the
    // button appeared to do nothing at all.
    const sheets = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '');
    expect(sheets.some((css) => css.includes('.v-muted'))).toBe(true);
  });
});
