/**
 * @module sound
 *
 * Native sound, no files, no dependencies.
 *
 * Effects are synthesized on the fly with the Web Audio API, so there is no
 * download, no audio folder, and the cost in bytes is nearly zero.
 * You can also play your own file whenever you want.
 *
 * ```html
 * <button v-sound="click">Save</button>
 * <button v-sound="success" v-post="/api/orders">Complete</button>
 * <a v-sound:mouseenter="hover" href="/prices">Prices</a>
 * <input v-sound:input="type">
 * ```
 *
 * ```js
 * V.sound.play('success')
 * V.sound.note('do', 300)
 * V.sound.melody(['do', 'mi', 'sol'], 140)
 * V.sound.volume(0.4)
 * V.sound.mute()
 * ```
 *
 * Rules of good behavior that the module follows on its own:
 *
 * - no browser lets audio play before the user interacts, so the
 *   context is only created on the first gesture;
 * - those who enable `prefers-reduced-motion` usually prefer less stimulation, so the
 *   default volume drops by half in that case;
 * - the mute preference is saved and applies on future visits.
 */

import { defineDirective } from '../runtime/registry';
import { magic } from '../runtime/scope';
import { storage } from '../storage';
import { ref } from '../reactivity';
import { injectStyle } from '../dom/style';

// ---------------------------------------------------------------------------
// Audio context
// ---------------------------------------------------------------------------

type AudioContextType = AudioContext & { resume(): Promise<void> };

let audioContext: AudioContextType | null = null;
let masterVolume = 0.35;
let isMuted = false;
let hasLoadedPreference = false;

const VOLUME_KEY = 'voodoo:sound:volume';
const MUTE_KEY = 'voodoo:sound:muted';

/** Bumped on every mute change, so expressions reading `muted` re-run. */
const muteRevision = ref(0);

function loadPreference(): void {
  if (hasLoadedPreference) return;
  hasLoadedPreference = true;

  const savedVolume = storage.get<number>(VOLUME_KEY);
  if (typeof savedVolume === 'number' && savedVolume >= 0 && savedVolume <= 1) masterVolume = savedVolume;

  const savedMute = storage.get<boolean>(MUTE_KEY);
  if (typeof savedMute === 'boolean') isMuted = savedMute;

  // Reduced motion usually means less stimulation. Lower the volume, but do not
  // mute, so users who requested sound can still hear the action feedback.
  if (
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches &&
    storage.get<number>(VOLUME_KEY) === undefined
  ) {
    masterVolume = 0.18;
  }
}

/**
 * Returns the audio context, creating it the first time.
 * Returns `null` when the browser does not support it.
 */
function getAudioContext(): AudioContextType | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) {
    // The browser suspends the context when the tab loses focus.
    if (audioContext.state === 'suspended') void audioContext.resume();
    return audioContext;
  }

  const Constructor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Constructor) return null;

  try {
    audioContext = new Constructor() as AudioContextType;
    return audioContext;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Synthesis
// ---------------------------------------------------------------------------

export type WaveformShape = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Layer {
  /** Initial frequency in hertz. */
  frequencia: number;
  /** Final frequency, for the sound to slide. Absent keeps the initial. */
  ate?: number;
  /** Duration in seconds. */
  duracao: number;
  /** Relative volume of the layer, from 0 to 1. */
  volume?: number;
  forma?: WaveformShape;
  /** Delay in seconds from the start of the effect. */
  atraso?: number;
  /** Volume rise time, in seconds. */
  ataque?: number;
}

/** Plays an isolated layer. */
function playLayer(ctx: AudioContextType, layer: Layer, effectVolume: number): void {
  const start = ctx.currentTime + (layer.atraso ?? 0);
  const end = start + layer.duracao;

  const oscillator = ctx.createOscillator();
  oscillator.type = layer.forma ?? 'sine';
  oscillator.frequency.setValueAtTime(layer.frequencia, start);
  if (layer.ate !== undefined && layer.ate !== layer.frequencia) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, layer.ate), end);
  }

  const gain = ctx.createGain();
  const peak = masterVolume * effectVolume * (layer.volume ?? 1);
  const attack = layer.ataque ?? 0.008;

  // Simple envelope: rises quickly and falls smoothly, avoiding the click that
  // happens when the volume cuts off at once.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

// ---------------------------------------------------------------------------
// Ready-made effects
// ---------------------------------------------------------------------------

export interface Effect {
  camadas: Layer[];
  /** Volume of the entire effect, from 0 to 1. */
  volume?: number;
}

/**
 * Library of effects. Each one was designed to be short and discrete:
 * interface sound exists to confirm an action, not to draw attention.
 */
export const efeitos: Record<string, Effect> = {
  /** Dry confirmation tap, for common buttons. */
  click: {
    volume: 0.5,
    camadas: [{ frequencia: 660, ate: 440, duracao: 0.06, forma: 'triangle' }],
  },

  /** Short, high-pitched pop, good for toggling. */
  pop: {
    volume: 0.5,
    camadas: [{ frequencia: 880, ate: 1320, duracao: 0.07, forma: 'sine' }],
  },

  /** Gentle brush, for passing the mouse over. */
  hover: {
    volume: 0.22,
    camadas: [{ frequencia: 1200, duracao: 0.035, forma: 'sine' }],
  },

  /** Two rising notes, for success. */
  success: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: 'sine' },
      { frequencia: 783.99, duracao: 0.18, forma: 'sine', atraso: 0.09 },
    ],
  },

  /** Three rising notes, for flow completion. */
  complete: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: 'sine' },
      { frequencia: 659.25, duracao: 0.1, forma: 'sine', atraso: 0.09 },
      { frequencia: 1046.5, duracao: 0.22, forma: 'sine', atraso: 0.18 },
    ],
  },

  /** Two falling notes, for error. */
  error: {
    volume: 0.6,
    camadas: [
      { frequencia: 392, duracao: 0.12, forma: 'square', volume: 0.5 },
      { frequencia: 261.63, duracao: 0.24, forma: 'square', volume: 0.5, atraso: 0.1 },
    ],
  },

  /** Short warning alert. */
  warning: {
    volume: 0.55,
    camadas: [
      { frequencia: 587.33, duracao: 0.1, forma: 'triangle' },
      { frequencia: 587.33, duracao: 0.14, forma: 'triangle', atraso: 0.14 },
    ],
  },

  /** Discrete bell, for incoming notification. */
  notify: {
    volume: 0.5,
    camadas: [
      { frequencia: 987.77, duracao: 0.14, forma: 'sine' },
      { frequencia: 1318.51, duracao: 0.3, forma: 'sine', atraso: 0.08, volume: 0.6 },
    ],
  },

  /** Very short tap for typing. */
  type: {
    volume: 0.18,
    camadas: [{ frequencia: 2200, duracao: 0.018, forma: 'square' }],
  },

  /** Slide up for opening a panel, drawer, or modal. */
  open: {
    volume: 0.4,
    camadas: [{ frequencia: 330, ate: 660, duracao: 0.14, forma: 'sine' }],
  },

  /** Slide down for closing. */
  close: {
    volume: 0.4,
    camadas: [{ frequencia: 660, ate: 330, duracao: 0.14, forma: 'sine' }],
  },

  /** Short denial, for blocked action. */
  deny: {
    volume: 0.5,
    camadas: [
      { frequencia: 220, duracao: 0.08, forma: 'square', volume: 0.5 },
      { frequencia: 180, duracao: 0.12, forma: 'square', volume: 0.5, atraso: 0.07 },
    ],
  },

  /** Coin, for score and reward. */
  coin: {
    volume: 0.45,
    camadas: [
      { frequencia: 987.77, duracao: 0.06, forma: 'square' },
      { frequencia: 1318.51, duracao: 0.16, forma: 'square', atraso: 0.05 },
    ],
  },

  /** Level up, more festive. */
  levelup: {
    volume: 0.55,
    camadas: [
      { frequencia: 523.25, duracao: 0.08, forma: 'square' },
      { frequencia: 659.25, duracao: 0.08, forma: 'square', atraso: 0.07 },
      { frequencia: 783.99, duracao: 0.08, forma: 'square', atraso: 0.14 },
      { frequencia: 1046.5, duracao: 0.26, forma: 'square', atraso: 0.21 },
    ],
  },

  /** Deep hit, for drag and drop. */
  drop: {
    volume: 0.5,
    camadas: [{ frequencia: 180, ate: 90, duracao: 0.12, forma: 'triangle' }],
  },
};

// ---------------------------------------------------------------------------
// Musical notes
// ---------------------------------------------------------------------------

/** Frequency of fourth octave notes, in hertz. */
const NOTES: Record<string, number> = {
  do: 261.63,
  'do#': 277.18,
  re: 293.66,
  're#': 311.13,
  mi: 329.63,
  fa: 349.23,
  'fa#': 369.99,
  sol: 392.0,
  'sol#': 415.3,
  la: 440.0,
  'la#': 466.16,
  si: 493.88,
  // English names, for those who prefer.
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  g: 392.0,
  a: 440.0,
  b: 493.88,
};

/**
 * Converts a note name to frequency.
 * Accepts octave at the end, like `do5` or `la3`.
 */
export function getFrequencyForNote(name: string): number | null {
  const clean = String(name).trim().toLowerCase();
  const match = /^([a-z]+#?)(\d)?$/.exec(clean);
  if (!match) return null;

  const base = NOTES[match[1]];
  if (base === undefined) return null;

  const octave = match[2] ? Number(match[2]) : 4;
  return base * 2 ** (octave - 4);
}

// ---------------------------------------------------------------------------
// Audio files
// ---------------------------------------------------------------------------

const audioFiles = new Map<string, HTMLAudioElement>();

/** Plays an audio file, reusing the element between calls. */
function playAudioFile(url: string, volume: number): void {
  let element = audioFiles.get(url);
  if (!element) {
    element = new Audio(url);
    element.preload = 'auto';
    audioFiles.set(url, element);
  }
  element.volume = Math.max(0, Math.min(1, masterVolume * volume));
  element.currentTime = 0;
  void element.play().catch(() => {
    // The browser refuses audio before the first gesture. No fanfare.
  });
}

function looksLikePath(value: string): boolean {
  return /^(https?:)?\/\//.test(value) || /^[./]/.test(value) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlayOptions {
  /** Relative volume, from 0 to 1. Multiplies the master volume. */
  volume?: number;
  /** Multiplies the frequency of all layers, making the sound higher. */
  tom?: number;
}

export const sound = {
  /**
   * Plays an effect by name, or a file by path.
   *
   * ```js
   * V.sound.play('success')
   * V.sound.play('/audio/ding.mp3')
   * V.sound.play('click', { volume: 0.5 })
   * ```
   */
  play(name: string, options: PlayOptions = {}): void {
    loadPreference();
    if (isMuted || !name) return;

    const value = String(name).trim();
    const volume = options.volume ?? 1;

    if (looksLikePath(value)) {
      playAudioFile(value, volume);
      return;
    }

    const effect = efeitos[value];
    if (!effect) {
      // Unknown name could be a note, like `la` or `do5`.
      const frequency = getFrequencyForNote(value);
      if (frequency !== null) this.tone(frequency, 200, { volume });
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const pitch = options.tom ?? 1;
    const effectVolume = (effect.volume ?? 1) * volume;

    for (const layer of effect.camadas) {
      playLayer(
        ctx,
        pitch === 1
          ? layer
          : {
              ...layer,
              frequencia: layer.frequencia * pitch,
              ate: layer.ate === undefined ? undefined : layer.ate * pitch,
            },
        effectVolume
      );
    }
  },

  /**
   * Plays a pure frequency.
   *
   * ```js
   * V.sound.tone(440, 300)
   * ```
   *
   * @param frequency hertz
   * @param duration milliseconds
   */
  tone(frequency: number, duration = 200, options: PlayOptions & { forma?: WaveformShape } = {}): void {
    loadPreference();
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    playLayer(
      ctx,
      { frequencia: frequency, duracao: duration / 1000, forma: options.forma ?? 'sine' },
      options.volume ?? 0.5
    );
  },

  /**
   * Plays a note by name.
   *
   * ```js
   * V.sound.note('la', 300)
   * V.sound.note('do5', 200)
   * ```
   */
  note(name: string, duration = 250, options: PlayOptions = {}): void {
    const frequency = getFrequencyForNote(name);
    if (frequency === null) return;
    this.tone(frequency, duration, options);
  },

  /**
   * Plays a sequence of notes.
   *
   * ```js
   * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
   * ```
   *
   * @param notes note names, or frequencies in hertz
   * @param interval milliseconds between one note and the next
   */
  melody(notes: Array<string | number>, interval = 150, options: PlayOptions = {}): void {
    loadPreference();
    if (isMuted) return;

    notes.forEach((note, index) => {
      const frequency = typeof note === 'number' ? note : getFrequencyForNote(note);
      if (frequency === null) return;
      setTimeout(() => this.tone(frequency, interval * 1.6, options), index * interval);
    });
  },

  /**
   * Reads or adjusts the master volume, from 0 to 1. The choice is saved.
   *
   * ```js
   * V.sound.volume()      // read
   * V.sound.volume(0.6)   // adjust
   * ```
   */
  volume(value?: number): number {
    loadPreference();
    if (value === undefined) return masterVolume;
    masterVolume = Math.max(0, Math.min(1, value));
    storage.set(VOLUME_KEY, masterVolume);
    return masterVolume;
  },

  /** Mutes sound. Pass `false` to unmute. */
  mute(value = true): void {
    loadPreference();
    isMuted = value;
    storage.set(MUTE_KEY, isMuted);
    muteRevision.value++;
  },

  /** Unmutes sound. */
  unmute(): void {
    this.mute(false);
  },

  /** Toggles between muted and unmuted, and returns the new state. */
  toggle(): boolean {
    loadPreference();
    this.mute(!isMuted);
    return isMuted;
  },

  /**
   * `true` when muted.
   *
   * Reads a revision ref first, so that an expression asking whether sound is
   * muted actually re-runs when it changes. The state lives in a module
   * variable and in localStorage, both invisible to the Proxy, so
   * `v-show="$sound.muted"` used to render once and then never move: a page had
   * no way to show whether it was muted, which made the mute button look like
   * it did nothing at all.
   */
  get muted(): boolean {
    void muteRevision.value;
    loadPreference();
    return isMuted;
  },

  /** Names of all available effects. */
  get names(): string[] {
    return Object.keys(efeitos);
  },

  /**
   * Registers a custom effect.
   *
   * ```js
   * V.sound.define('myWarning', {
   *   volume: 0.5,
   *   camadas: [
   *     { frequencia: 700, duracao: 0.1 },
   *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
   *   ]
   * })
   * ```
   */
  define(name: string, effect: Effect): void {
    efeitos[name] = effect;
  },

  /** Preloads a file to avoid delay on first play. */
  preload(...urls: string[]): void {
    for (const url of urls) {
      if (audioFiles.has(url)) continue;
      const element = new Audio(url);
      element.preload = 'auto';
      audioFiles.set(url, element);
    }
  },
};

export type Sound = typeof sound;

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/**
 * `v-sound` plays an effect when the element is triggered.
 *
 * ```html
 * <button v-sound="click">Save</button>
 * <button v-sound="success" v-post="/api/orders">Complete</button>
 * <a v-sound:mouseenter="hover" href="/prices">Prices</a>
 * <input v-sound:input="type">
 * <div v-sound:voodoo:success="complete" v-get="/api/data"></div>
 * ```
 *
 * The value can be the name of an effect, the path to a file, the name of a
 * note, or an expression that returns any of these.
 */
defineDirective('sound', ({ el, arg, expression, modifiers, scope, cleanup, evaluate }) => {
  const event = arg || 'click';

  const resolve = (): string => {
    const raw = expression.trim();
    if (!raw) return 'click';
    // Direct effect name, note, or file path does not need evaluation.
    if (efeitos[raw] || looksLikePath(raw) || getFrequencyForNote(raw) !== null) return raw;
    const value = evaluate<unknown>();
    return typeof value === 'string' ? value : raw;
  };

  const volume = modifiers.volume !== undefined ? Number(modifiers.volume) : undefined;

  const play = (): void => {
    sound.play(resolve(), volume === undefined ? {} : { volume });
  };

  el.addEventListener(event, play);
  cleanup(() => el.removeEventListener(event, play));
  void scope;
});

/**
 * Minimal styling for a muted `v-mute` button.
 *
 * The directive always set the `v-muted` class and nothing ever styled it, so
 * the button looked identical whether sound was on or off. Pressing it appeared
 * to do nothing at all, which is how it was reported: "I click and nothing
 * happens." A control that toggles state has to show the state.
 *
 * Deliberately small: opacity, a line through the label and the default
 * strike-through icon. Anything more would be imposing a look on a button whose
 * appearance belongs to the page.
 */
const MUTE_CSS = `
.v-muted{opacity:.55}
.v-muted::after{content:" \\1F507";font-size:.9em}
.v-mute-on::after{content:" \\1F50A";font-size:.9em}
`;

/**
 * `v-mute` toggles mute on click, and keeps the state on the element itself.
 *
 * ```html
 * <button v-mute>Sound</button>
 * ```
 *
 * The element receives `aria-pressed` and the `v-muted` class when muted, and
 * `v-mute-on` when it is not, so a page can style either state without asking
 * the library anything.
 */
defineDirective('mute', ({ el, cleanup }) => {
  injectStyle('mute', MUTE_CSS);

  const sync = (): void => {
    const isMuted = sound.muted;
    el.setAttribute('aria-pressed', String(isMuted));
    el.classList.toggle('v-muted', isMuted);
    el.classList.toggle('v-mute-on', !isMuted);
  };

  const toggle = (): void => {
    sound.toggle();
    sync();
    // A short tap confirms that sound is back.
    if (!sound.muted) sound.play('pop');
  };

  el.addEventListener('click', toggle);
  sync();
  cleanup(() => el.removeEventListener('click', toggle));
});

// ---------------------------------------------------------------------------
// Magic variable
// ---------------------------------------------------------------------------

magic('$sound', () => sound);
