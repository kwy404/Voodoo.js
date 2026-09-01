/**
 * @module motion
 *
 * Custom animation engine, in the spirit of Framer Motion, written in vanilla JavaScript.
 *
 * The core is a single `requestAnimationFrame` loop shared by all active
 * animations. There are two progress modes:
 *
 * - tween, with fixed duration and easing curve;
 * - spring, with real numerical integration of `stiffness`, `damping`, and `mass`.
 *
 * The properties `x`, `y`, `z`, `scale`, `rotate`, and `skew` are not rendered as
 * separate styles: they feed into per-element state that is recomposed into a single
 * `transform`, so multiple animations coexist without overwriting each other.
 *
 * ```js
 * V.animate(button, { scale: [1, 1.1], opacity: [0, 1] }, { spring: true })
 * V.spring(0, 100, { stiffness: 210, onUpdate: (v) => console.log(v) })
 * ```
 *
 * Everything respects `prefers-reduced-motion: reduce`. In that case, the final state
 * is applied immediately, with no intermediate frames.
 */

import { warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { device, parseDuration } from '../utils';

/**
 * User preference for reduced motion. Test and server-side rendering environments
 * do not have `matchMedia`, so the response is always `false` there.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return device.reducedMotion;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Animatable element. SVG is included because it also has `style` and a box model. */
export type MotionElement = HTMLElement | SVGElement;

/** Target accepted by `animate` and `stagger`. */
export type MotionTarget = Element | ArrayLike<Element> | string | null | undefined;

/** Value of an animated property. */
export type MotionValue = number | string;

/**
 * Map of animated properties. A single value uses the current state as the
 * starting point. A pair `[from, to]` defines both extremes.
 */
export type MotionKeyframes = Record<string, MotionValue | [MotionValue, MotionValue]>;

/** Progress curve. Takes and returns numbers normally between 0 and 1. */
export type EasingFunction = (t: number) => number;

/** Control returned by any animation. */
export interface AnimationControl {
  /** Stops the animation at the current point, without firing `onComplete`. */
  stop(): void;
  /** Resolves when the animation finishes or is interrupted. */
  finished: Promise<void>;
}

/** Physical parameters of the spring. */
export interface SpringConfig {
  /** Spring stiffness. Higher = faster. Default 170. */
  stiffness?: number;
  /** Damping. Higher = less oscillation. Default 26. */
  damping?: number;
  /** Mass of the body. Higher = slower and heavier. Default 1. */
  mass?: number;
  /** Initial velocity, in units per second. */
  velocity?: number;
  /** Distance considered at rest. */
  restDelta?: number;
  /** Velocity considered at rest. */
  restSpeed?: number;
}

/** Options for `animate`. */
export interface AnimateOptions {
  /** Duration in milliseconds. Ignored when `spring` is active. Default 400. */
  duration?: number;
  /** Wait before starting, in milliseconds. */
  delay?: number;
  /** Name of a known easing or custom function. */
  easing?: EasingName | EasingFunction | string;
  /** Use spring physics instead of tween. `true` accepts defaults. */
  spring?: boolean | SpringConfig;
  /** Extra repetitions. `2` plays three times total. */
  repeat?: number;
  /** Behavior of each repetition. */
  repeatType?: 'loop' | 'reverse' | 'mirror';
  /** Ignores `prefers-reduced-motion`. Reserve for essential animations. */
  force?: boolean;
  /** Called each frame with progress, which can exceed 1 for springs. */
  onUpdate?(progress: number): void;
  /** Called when the animation finishes naturally. */
  onComplete?(): void;
}

/** Options for `stagger`. */
export interface StaggerOptions extends AnimateOptions {
  /** Delay added to each list item, in milliseconds. Default 60. */
  delay?: number;
  /** Where the wave starts. Default `first`. */
  from?: 'first' | 'last' | 'center';
  /** Delay applied before the first item in the wave. */
  start?: number;
}

/** Options for `spring`. */
export interface SpringOptions extends SpringConfig {
  /** Receives the interpolated value each frame. */
  onUpdate?(value: number): void;
  /** Called when the spring comes to rest. */
  onComplete?(): void;
}

/** Options for `inView`. */
export interface InViewOptions {
  /** Turns off the observer after the first entry. Default `true`. */
  once?: boolean;
  /** Observer margin, in the format of `rootMargin`. */
  margin?: string;
  /** Visible fraction required, or `any` and `all`. Default 0.25. */
  amount?: number | 'any' | 'all';
  /** Observer root. Default is the viewport. */
  root?: Element | null;
}

/**
 * Object that mixes animated properties and animation options, in the format
 * used by presets and directives.
 */
export interface MotionVariant extends AnimateOptions {
  [property: string]: unknown;
}

// ---------------------------------------------------------------------------
// Shared frame loop
// ---------------------------------------------------------------------------

type FrameCallback = (now: number) => void;

const frameCallbacks = new Set<FrameCallback>();
let frameHandle = 0;

function runFrame(now: number): void {
  frameHandle = 0;
  // Copy the list because a callback can register or remove others.
  const pending = Array.from(frameCallbacks);
  for (const callback of pending) {
    if (frameCallbacks.has(callback)) callback(now);
  }
  if (frameCallbacks.size > 0) frameHandle = requestAnimationFrame(runFrame);
}

/** Registers a callback in the shared loop. */
function addFrame(callback: FrameCallback): void {
  if (typeof requestAnimationFrame !== 'function') return;
  frameCallbacks.add(callback);
  if (!frameHandle) frameHandle = requestAnimationFrame(runFrame);
}

/** Removes a callback from the shared loop. */
function removeFrame(callback: FrameCallback): void {
  frameCallbacks.delete(callback);
  if (frameCallbacks.size === 0 && frameHandle) {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
}

/** Maximum animation duration, for springs that never reach rest. */
const MAX_DURATION = 12_000;

// ---------------------------------------------------------------------------
// Easings
// ---------------------------------------------------------------------------

function backIn(t: number): number {
  return t * t * (2.70158 * t - 1.70158);
}

/**
 * Ready-made progress curves. All take and return values between 0 and 1,
 * except `easeOutBack` and `anticipate`, which exceed the range on purpose
 * to give a sense of weight.
 */
export const easings = {
  /** Constant progress. */
  linear(t: number): number {
    return t;
  },
  /** Starts slow and accelerates. */
  easeIn(t: number): number {
    return t * t * t;
  },
  /** Starts fast and decelerates. The default choice for entries. */
  easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  },
  /** Accelerates at the start and brakes at the end. */
  easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  /** Overshoots the target and comes back, giving a slight exaggeration at the end. */
  easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  /** Very long deceleration, good for large entries. */
  easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },
  /** Pulls back slightly before advancing, like taking a running start. */
  anticipate(t: number): number {
    const doubled = t * 2;
    if (doubled < 1) return 0.5 * backIn(doubled);
    return 0.5 * (2 - Math.pow(2, -10 * (doubled - 1)));
  },
  /** Bounces when reaching the target. */
  bounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    let time = t;
    if (time < 1 / d1) return n1 * time * time;
    if (time < 2 / d1) {
      time -= 1.5 / d1;
      return n1 * time * time + 0.75;
    }
    if (time < 2.5 / d1) {
      time -= 2.25 / d1;
      return n1 * time * time + 0.9375;
    }
    time -= 2.625 / d1;
    return n1 * time * time + 0.984375;
  },
};

/** Names accepted in the `easing` option. */
export type EasingName = keyof typeof easings;

/** Converts the `easing` option value into a function. */
function resolveEasing(easing?: EasingName | EasingFunction | string): EasingFunction {
  if (typeof easing === 'function') return easing;
  if (typeof easing === 'string') {
    const found = (easings as Record<string, EasingFunction | undefined>)[easing];
    if (found) return found;
  }
  return easings.easeOut;
}

// ---------------------------------------------------------------------------
// Transform and filter state per element
// ---------------------------------------------------------------------------

const TRANSFORM_DEFAULTS: Record<string, number> = {
  x: 0,
  y: 0,
  z: 0,
  parallax: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  skewY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
};

const TRANSFORM_UNITS: Record<string, string> = {
  x: 'px',
  y: 'px',
  z: 'px',
  parallax: 'px',
  rotate: 'deg',
  rotateX: 'deg',
  rotateY: 'deg',
  skewX: 'deg',
  skewY: 'deg',
  scale: '',
  scaleX: '',
  scaleY: '',
};

/** Alternative names accepted in keyframes. */
const TRANSFORM_ALIASES: Record<string, string> = {
  translateX: 'x',
  translateY: 'y',
  translateZ: 'z',
  rotateZ: 'rotate',
};

const FILTER_DEFAULTS: Record<string, number> = {
  blur: 0,
  brightness: 1,
  saturate: 1,
  grayscale: 0,
  contrast: 1,
};

const FILTER_UNITS: Record<string, string> = {
  blur: 'px',
  brightness: '',
  saturate: '',
  grayscale: '',
  contrast: '',
};

/** Numeric CSS properties that do not take a unit. */
const UNITLESS = new Set([
  'opacity',
  'z-index',
  'font-weight',
  'line-height',
  'flex-grow',
  'flex-shrink',
  'order',
  'zoom',
  'fill-opacity',
  'stroke-opacity',
  'stroke-width',
  'stroke-dashoffset',
  'stroke-dasharray',
]);

const transformState = new WeakMap<MotionElement, Record<string, number>>();
const filterState = new WeakMap<MotionElement, Record<string, number>>();

/** Element's transform state, created with neutral values. */
function getTransformState(el: MotionElement): Record<string, number> {
  let state = transformState.get(el);
  if (!state) {
    state = { ...TRANSFORM_DEFAULTS };
    transformState.set(el, state);
  }
  return state;
}

/** Element's filter state, created with neutral values. */
function getFilterState(el: MotionElement): Record<string, number> {
  let state = filterState.get(el);
  if (!state) {
    state = { ...FILTER_DEFAULTS };
    filterState.set(el, state);
  }
  return state;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Recomposes the entire `transform` from the element's state. */
function applyTransform(el: MotionElement): void {
  const state = transformState.get(el);
  if (!state) return;
  const parts: string[] = [];
  const y = state.y + state.parallax;
  if (state.x || y || state.z) {
    parts.push(`translate3d(${round(state.x)}px, ${round(y)}px, ${round(state.z)}px)`);
  }
  if (state.rotateX) parts.push(`rotateX(${round(state.rotateX)}deg)`);
  if (state.rotateY) parts.push(`rotateY(${round(state.rotateY)}deg)`);
  if (state.rotate) parts.push(`rotate(${round(state.rotate)}deg)`);
  if (state.skewX || state.skewY) {
    parts.push(`skew(${round(state.skewX)}deg, ${round(state.skewY)}deg)`);
  }
  const scaleX = state.scale * state.scaleX;
  const scaleY = state.scale * state.scaleY;
  if (scaleX !== 1 || scaleY !== 1) parts.push(`scale(${round(scaleX)}, ${round(scaleY)})`);

  if (parts.length > 0) el.style.transform = parts.join(' ');
  else el.style.removeProperty('transform');
}

/** Recomposes the entire `filter` from the element's state. */
function applyFilter(el: MotionElement): void {
  const state = filterState.get(el);
  if (!state) return;
  const parts: string[] = [];
  if (state.blur) parts.push(`blur(${round(state.blur)}px)`);
  if (state.brightness !== 1) parts.push(`brightness(${round(state.brightness)})`);
  if (state.saturate !== 1) parts.push(`saturate(${round(state.saturate)})`);
  if (state.grayscale) parts.push(`grayscale(${round(state.grayscale)})`);
  if (state.contrast !== 1) parts.push(`contrast(${round(state.contrast)})`);

  if (parts.length > 0) el.style.filter = parts.join(' ');
  else el.style.removeProperty('filter');
}

// ---------------------------------------------------------------------------
// Numbers, units, and colors
// ---------------------------------------------------------------------------

const NUMBER_UNIT = /^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;
const HEX_COLOR = /^#([0-9a-f]{3,8})$/i;

type Rgba = [number, number, number, number];

function isColorValue(value: MotionValue): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  return (
    text === 'transparent' ||
    HEX_COLOR.test(text) ||
    text.startsWith('rgb') ||
    text.startsWith('hsl')
  );
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const h = ((hue % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

/** Parses `#fff`, `#112233aa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, and `transparent`. */
function parseColor(input: string): Rgba {
  const text = input.trim().toLowerCase();
  if (text === 'transparent') return [0, 0, 0, 0];

  const hex = HEX_COLOR.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    const value = parseInt(digits.slice(0, 6), 16);
    const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
  }

  const tokens = text.match(/-?(?:\d+\.?\d*|\.\d+)%?/g) ?? [];
  const at = (index: number, scale: number): number => {
    const raw = tokens[index] ?? '0';
    const amount = parseFloat(raw);
    return raw.endsWith('%') ? (amount / 100) * scale : amount;
  };

  if (text.startsWith('hsl')) {
    // Saturation and lightness come as `50%` or as `0.5`. Both become
    // fractions from 0 to 1 before conversion.
    const ratio = (index: number): number => {
      const raw = tokens[index] ?? '0';
      const amount = parseFloat(raw);
      return raw.endsWith('%') || amount > 1 ? amount / 100 : amount;
    };
    const rgb = hslToRgb(parseFloat(tokens[0] ?? '0'), ratio(1), ratio(2));
    return [rgb[0], rgb[1], rgb[2], tokens.length > 3 ? at(3, 1) : 1];
  }

  return [at(0, 255), at(1, 255), at(2, 255), tokens.length > 3 ? at(3, 1) : 1];
}

function formatRgba(color: Rgba): string {
  const alpha = Math.max(0, Math.min(1, color[3]));
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${round(alpha)})`;
}

/** Converts `backgroundColor` to `background-color`. */
function kebabCase(name: string): string {
  if (name.startsWith('--')) return name;
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ---------------------------------------------------------------------------
// Animation tracks
// ---------------------------------------------------------------------------

type TrackKind = 'transform' | 'filter' | 'style';
type TrackMode = 'number' | 'color' | 'discrete';

interface Track {
  kind: TrackKind;
  /** Normalized name, already without aliases. */
  prop: string;
  /** CSS property name, used when `kind` is `style`. */
  cssName: string;
  mode: TrackMode;
  unit: string;
  from: number;
  to: number;
  fromColor: Rgba;
  toColor: Rgba;
  fromText: string;
  toText: string;
}

/** Reads the current value of a property, whether transform, filter, or CSS. */
function readCurrent(el: MotionElement, kind: TrackKind, prop: string, cssName: string): MotionValue {
  if (kind === 'transform') return getTransformState(el)[prop];
  if (kind === 'filter') return getFilterState(el)[prop];
  if (typeof getComputedStyle !== 'function') return el.style.getPropertyValue(cssName).trim();
  const computed = getComputedStyle(el).getPropertyValue(cssName);
  return computed ? computed.trim() : '';
}

/** Builds a property's track, resolving type, unit, and extremes. */
function buildTrack(
  el: MotionElement,
  name: string,
  spec: MotionValue | [MotionValue, MotionValue]
): Track | null {
  const prop = TRANSFORM_ALIASES[name] ?? name;
  const kind: TrackKind =
    prop in TRANSFORM_DEFAULTS ? 'transform' : prop in FILTER_DEFAULTS ? 'filter' : 'style';
  const cssName = kind === 'style' ? kebabCase(prop) : prop;

  const fallbackUnit =
    kind === 'transform'
      ? TRANSFORM_UNITS[prop]
      : kind === 'filter'
        ? FILTER_UNITS[prop]
        : UNITLESS.has(cssName)
          ? ''
          : 'px';

  const pair: [MotionValue, MotionValue] = Array.isArray(spec)
    ? [spec[0], spec[1]]
    : [readCurrent(el, kind, prop, cssName), spec];

  const track: Track = {
    kind,
    prop,
    cssName,
    mode: 'number',
    unit: fallbackUnit,
    from: 0,
    to: 0,
    fromColor: [0, 0, 0, 1],
    toColor: [0, 0, 0, 1],
    fromText: String(pair[0]),
    toText: String(pair[1]),
  };

  if (isColorValue(pair[0]) || isColorValue(pair[1])) {
    if (kind !== 'style') return null;
    track.mode = 'color';
    track.fromColor = isColorValue(pair[0]) ? parseColor(String(pair[0])) : [0, 0, 0, 0];
    track.toColor = isColorValue(pair[1]) ? parseColor(String(pair[1])) : [0, 0, 0, 0];
    return track;
  }

  const from = readNumeric(pair[0], fallbackUnit);
  const to = readNumeric(pair[1], fallbackUnit);
  if (!from || !to) {
    if (kind !== 'style') return null;
    track.mode = 'discrete';
    return track;
  }

  track.from = from.value;
  track.to = to.value;
  track.unit = to.unit || from.unit || fallbackUnit;
  return track;
}

function readNumeric(value: MotionValue, fallbackUnit: string): { value: number; unit: string } | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { value, unit: fallbackUnit } : null;
  }
  const match = NUMBER_UNIT.exec(value.trim());
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2] || fallbackUnit };
}

/** Writes the state of tracks to the element for any given progress. */
function applyTracks(el: MotionElement, tracks: Track[], progress: number): void {
  let touchedTransform = false;
  let touchedFilter = false;

  for (const track of tracks) {
    if (track.kind === 'transform') {
      getTransformState(el)[track.prop] = track.from + (track.to - track.from) * progress;
      touchedTransform = true;
      continue;
    }
    if (track.kind === 'filter') {
      getFilterState(el)[track.prop] = track.from + (track.to - track.from) * progress;
      touchedFilter = true;
      continue;
    }
    if (track.mode === 'color') {
      const mixed: Rgba = [
        track.fromColor[0] + (track.toColor[0] - track.fromColor[0]) * progress,
        track.fromColor[1] + (track.toColor[1] - track.fromColor[1]) * progress,
        track.fromColor[2] + (track.toColor[2] - track.fromColor[2]) * progress,
        track.fromColor[3] + (track.toColor[3] - track.fromColor[3]) * progress,
      ];
      el.style.setProperty(track.cssName, formatRgba(mixed));
      continue;
    }
    if (track.mode === 'discrete') {
      el.style.setProperty(track.cssName, progress >= 1 ? track.toText : track.fromText);
      continue;
    }
    const value = track.from + (track.to - track.from) * progress;
    el.style.setProperty(track.cssName, `${round(value)}${track.unit}`);
  }

  if (touchedTransform) applyTransform(el);
  if (touchedFilter) applyFilter(el);
}

function buildTracks(el: MotionElement, keyframes: MotionKeyframes): Track[] {
  const tracks: Track[] = [];
  for (const [name, spec] of Object.entries(keyframes)) {
    if (spec === undefined || spec === null) continue;
    const track = buildTrack(el, name, spec as MotionValue | [MotionValue, MotionValue]);
    if (track) tracks.push(track);
  }
  return tracks;
}

/**
 * Applies the initial state of a set of keyframes without animating. Used by
 * directives that need to hide the element before it enters.
 */
export function applyInitial(target: MotionTarget, keyframes: MotionKeyframes): void {
  for (const el of resolveTargets(target)) {
    applyTracks(el, buildTracks(el, keyframes), 0);
  }
}

/**
 * Reads the current state of the properties mentioned in keyframes. Used to save
 * the return point for hover and touch animations.
 */
export function captureState(el: MotionElement, keyframes: MotionKeyframes): MotionKeyframes {
  const out: MotionKeyframes = {};
  for (const name of Object.keys(keyframes)) {
    const prop = TRANSFORM_ALIASES[name] ?? name;
    const kind: TrackKind =
      prop in TRANSFORM_DEFAULTS ? 'transform' : prop in FILTER_DEFAULTS ? 'filter' : 'style';
    out[name] = readCurrent(el, kind, prop, kind === 'style' ? kebabCase(prop) : prop);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

function isMotionElement(value: unknown): value is MotionElement {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return true;
  return typeof SVGElement !== 'undefined' && value instanceof SVGElement;
}

/** Normalizes selectors, lists, and loose elements into a list of elements. */
function resolveTargets(target: MotionTarget): MotionElement[] {
  if (!target) return [];
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll(target)).filter(isMotionElement);
  }
  if (isMotionElement(target)) return [target];
  const list = target as ArrayLike<Element>;
  if (typeof list.length !== 'number') return [];
  const out: MotionElement[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (isMotionElement(item)) out.push(item);
  }
  return out;
}

/**
 * Control of an animation that is already complete at birth. Appears when the target does not
 * exist or when `prefers-reduced-motion` applied the final state immediately.
 */
function instantControl(onStop?: () => void): AnimationControl {
  return {
    finished: Promise.resolve(),
    stop(): void {
      onStop?.();
    },
  };
}

// ---------------------------------------------------------------------------
// animate
// ---------------------------------------------------------------------------

function animateOne(
  el: MotionElement,
  keyframes: MotionKeyframes,
  options: AnimateOptions
): AnimationControl {
  const tracks = buildTracks(el, keyframes);

  if (prefersReducedMotion() && !options.force) {
    applyTracks(el, tracks, 1);
    options.onUpdate?.(1);
    options.onComplete?.();
    return instantControl();
  }

  const duration = Math.max(0, options.duration ?? 400);
  const delay = Math.max(0, options.delay ?? 0);
  const ease = resolveEasing(options.easing);
  const repeat = Math.max(0, Math.floor(options.repeat ?? 0));
  const repeatType = options.repeatType ?? 'loop';
  const springConfig: SpringConfig | null =
    options.spring === true ? {} : options.spring ? options.spring : null;

  let settle!: () => void;
  const finished = new Promise<void>((resolve) => {
    settle = resolve;
  });

  let running = true;
  let startedAt = -1;
  let previous = -1;
  let springPosition = 0;
  let springVelocity = springConfig?.velocity ?? 0;

  function frame(now: number): void {
    if (!running) return;
    if (startedAt < 0) {
      startedAt = now;
      previous = now;
    }
    const elapsed = now - startedAt - delay;
    if (elapsed < 0) return;
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;

    if (elapsed > MAX_DURATION) {
      complete(1);
      return;
    }

    if (springConfig) {
      const stiffness = springConfig.stiffness ?? 170;
      const damping = springConfig.damping ?? 26;
      const mass = springConfig.mass ?? 1;
      const steps = Math.max(1, Math.round(delta));
      const step = delta / steps / 1000;
      for (let i = 0; i < steps; i++) {
        const acceleration =
          (-stiffness * (springPosition - 1) - damping * springVelocity) / mass;
        springVelocity += acceleration * step;
        springPosition += springVelocity * step;
      }
      const restDelta = springConfig.restDelta ?? 0.001;
      const restSpeed = springConfig.restSpeed ?? 0.01;
      if (Math.abs(1 - springPosition) < restDelta && Math.abs(springVelocity) < restSpeed) {
        complete(1);
        return;
      }
      applyTracks(el, tracks, springPosition);
      options.onUpdate?.(springPosition);
      return;
    }

    if (duration === 0) {
      complete(1);
      return;
    }

    const total = repeat + 1;
    let iteration = Math.floor(elapsed / duration);
    let local = (elapsed - iteration * duration) / duration;
    let last = false;
    if (iteration >= total) {
      iteration = total - 1;
      local = 1;
      last = true;
    }

    let progress: number;
    if (iteration % 2 === 1 && repeatType === 'reverse') progress = ease(1 - local);
    else if (iteration % 2 === 1 && repeatType === 'mirror') progress = 1 - ease(local);
    else progress = ease(local);

    if (last) {
      complete(progress);
      return;
    }
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
  }

  function complete(progress: number): void {
    if (!running) return;
    running = false;
    removeFrame(frame);
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
    settle();
    options.onComplete?.();
  }

  // Apply the starting point in this frame to avoid flickering.
  applyTracks(el, tracks, springConfig ? springPosition : ease(0));
  addFrame(frame);

  return {
    finished,
    stop(): void {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    },
  };
}

/**
 * Animates one or multiple elements.
 *
 * ```js
 * V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 })
 * const control = V.animate(el, { scale: 1.2 }, { spring: { stiffness: 300 } })
 * await control.finished
 * ```
 *
 * @param target element, list of elements, or CSS selector
 * @param keyframes animated properties, with single value or `[from, to]` pair
 * @param options duration, delay, easing, spring, and repetition
 */
export function animate(
  target: MotionTarget,
  keyframes: MotionKeyframes,
  options: AnimateOptions = {}
): AnimationControl {
  const elements = resolveTargets(target);
  if (elements.length === 0) return instantControl();
  if (elements.length === 1) return animateOne(elements[0], keyframes, options);

  const controls = elements.map((el) => animateOne(el, keyframes, options));
  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => undefined),
    stop(): void {
      for (const control of controls) control.stop();
    },
  };
}

// ---------------------------------------------------------------------------
// spring
// ---------------------------------------------------------------------------

/**
 * Integrates a real spring between two numbers and delivers the value each frame.
 * Does not touch the DOM, so it works for both styles and counters,
 * smooth scrolling, or any other numeric value.
 *
 * ```js
 * V.spring(0, 320, { stiffness: 210, damping: 22, onUpdate: (v) => bar.style.width = v + 'px' })
 * ```
 */
export function spring(from: number, to: number, options: SpringOptions = {}): AnimationControl {
  if (prefersReducedMotion()) {
    options.onUpdate?.(to);
    options.onComplete?.();
    return instantControl();
  }

  const stiffness = options.stiffness ?? 170;
  const damping = options.damping ?? 26;
  const mass = options.mass ?? 1;
  const range = Math.abs(to - from) || 1;
  const restDelta = options.restDelta ?? range * 0.001;
  const restSpeed = options.restSpeed ?? range * 0.01;

  let position = from;
  let velocity = options.velocity ?? 0;
  let running = true;
  let previous = -1;
  let elapsed = 0;

  let settle!: () => void;
  const finished = new Promise<void>((resolve) => {
    settle = resolve;
  });

  function frame(now: number): void {
    if (!running) return;
    if (previous < 0) {
      previous = now;
      options.onUpdate?.(position);
      return;
    }
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;
    elapsed += delta;

    const steps = Math.max(1, Math.round(delta));
    const step = delta / steps / 1000;
    for (let i = 0; i < steps; i++) {
      const acceleration = (-stiffness * (position - to) - damping * velocity) / mass;
      velocity += acceleration * step;
      position += velocity * step;
    }

    const rested = Math.abs(to - position) < restDelta && Math.abs(velocity) < restSpeed;
    if (rested || elapsed > MAX_DURATION) {
      running = false;
      removeFrame(frame);
      position = to;
      options.onUpdate?.(to);
      settle();
      options.onComplete?.();
      return;
    }
    options.onUpdate?.(position);
  }

  addFrame(frame);

  return {
    finished,
    stop(): void {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    },
  };
}

// ---------------------------------------------------------------------------
// stagger
// ---------------------------------------------------------------------------

/** Calculates the delay of an item within the wave. */
function staggerDelay(
  index: number,
  total: number,
  step: number,
  from: 'first' | 'last' | 'center'
): number {
  if (from === 'last') return (total - 1 - index) * step;
  if (from === 'center') return Math.abs(index - (total - 1) / 2) * step;
  return index * step;
}

/**
 * Animates an entire list with progressive delay between items.
 *
 * ```js
 * V.stagger('.card', V.motionPresets.fadeUp, { delay: 70, from: 'center' })
 * ```
 *
 * @param targets elements, list, or CSS selector
 * @param keyframes animated properties
 * @param options `delay` is the step between items and `start` is the delay for the entire wave
 */
export function stagger(
  targets: MotionTarget,
  keyframes: MotionKeyframes,
  options: StaggerOptions = {}
): AnimationControl {
  const elements = resolveTargets(targets);
  if (elements.length === 0) return instantControl();

  const step = options.delay ?? 60;
  const start = options.start ?? 0;
  const from = options.from ?? 'first';

  const controls = elements.map((el, index) =>
    animateOne(el, keyframes, {
      ...options,
      delay: start + staggerDelay(index, elements.length, step, from),
    })
  );

  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => undefined),
    stop(): void {
      for (const control of controls) control.stop();
    },
  };
}

// ---------------------------------------------------------------------------
// inView and scrollProgress
// ---------------------------------------------------------------------------

function thresholdOf(amount: InViewOptions['amount']): number {
  if (amount === 'all') return 0.99;
  if (amount === 'any') return 0;
  if (typeof amount === 'number') return Math.max(0, Math.min(1, amount));
  return 0.25;
}

/**
 * Fires a callback when the element enters the viewport.
 *
 * The callback can return a cleanup function, executed when the element
 * leaves the viewport. This allows mounting and unmounting effects effortlessly.
 *
 * ```js
 * const stop = V.inView(section, () => section.classList.add('active'), { once: true })
 * ```
 *
 * @returns function that stops the observation
 */
export function inView(
  el: Element,
  callback: (entry: IntersectionObserverEntry) => void | (() => void),
  options: InViewOptions = {}
): () => void {
  const once = options.once ?? true;
  let leaveHandler: (() => void) | void;

  if (typeof IntersectionObserver === 'undefined') {
    // No support, content still needs to appear anyway.
    leaveHandler = callback({
      target: el,
      isIntersecting: true,
      intersectionRatio: 1,
    } as IntersectionObserverEntry);
    return (): void => {
      if (typeof leaveHandler === 'function') leaveHandler();
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          leaveHandler = callback(entry);
          if (once) observer.disconnect();
        } else if (typeof leaveHandler === 'function') {
          leaveHandler();
          leaveHandler = undefined;
        }
      }
    },
    {
      root: options.root ?? null,
      rootMargin: options.margin ?? '0px',
      threshold: thresholdOf(options.amount),
    }
  );

  observer.observe(el);

  return (): void => {
    observer.disconnect();
    if (typeof leaveHandler === 'function') leaveHandler();
  };
}

/**
 * Reports from 0 to 1 as the element crosses the screen. Equals 0 when the top
 * of the element touches the bottom of the viewport and 1 when its bottom exits the top.
 *
 * ```js
 * V.scrollProgress(section, (p) => bar.style.width = (p * 100) + '%')
 * ```
 *
 * @returns function that stops the observation
 */
export function scrollProgress(el: Element, callback: (progress: number) => void): () => void {
  let stopped = false;
  let queued = false;

  if (typeof window === 'undefined') {
    // No window means no scrolling, so progress stays at the beginning.
    callback(0);
    return (): void => {
      stopped = true;
    };
  }

  const measure = (): void => {
    queued = false;
    if (stopped) return;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const span = viewport + rect.height || 1;
    const raw = (viewport - rect.top) / span;
    callback(Math.max(0, Math.min(1, raw)));
  };

  const schedule = (): void => {
    if (queued || stopped) return;
    queued = true;
    requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  measure();

  return (): void => {
    stopped = true;
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

// ---------------------------------------------------------------------------
// Preset variants
// ---------------------------------------------------------------------------

/** Simple appearance, opacity only. */
export const fadeIn: MotionVariant = { opacity: [0, 1], duration: 420, easing: 'easeOut' };

/** Rises a few pixels while appearing. The most used preset in lists. */
export const fadeUp: MotionVariant = {
  opacity: [0, 1],
  y: [24, 0],
  duration: 520,
  easing: 'easeOutExpo',
};

/** Descends a few pixels while appearing. */
export const fadeDown: MotionVariant = {
  opacity: [0, 1],
  y: [-24, 0],
  duration: 520,
  easing: 'easeOutExpo',
};

/** Grows from inside out. */
export const scaleIn: MotionVariant = {
  opacity: [0, 1],
  scale: [0.92, 1],
  duration: 460,
  easing: 'easeOutBack',
};

/** Enters by sliding from right to left. */
export const slideLeft: MotionVariant = {
  opacity: [0, 1],
  x: [36, 0],
  duration: 500,
  easing: 'easeOutExpo',
};

/** Enters by sliding from left to right. */
export const slideRight: MotionVariant = {
  opacity: [0, 1],
  x: [-36, 0],
  duration: 500,
  easing: 'easeOutExpo',
};

/** Bursts in place with a lively spring. */
export const pop: MotionVariant = {
  opacity: [0, 1],
  scale: [0.6, 1],
  spring: { stiffness: 420, damping: 18 },
};

/** Emerges from blur to sharp. */
export const blurIn: MotionVariant = {
  opacity: [0, 1],
  blur: [10, 0],
  duration: 560,
  easing: 'easeOut',
};

/** Rotates on the horizontal axis when entering, like a card flipping. */
export const flip: MotionVariant = {
  opacity: [0, 1],
  rotateX: [-80, 0],
  duration: 620,
  easing: 'easeOutBack',
};

/** All presets gathered for lookup by name. */
export const motionPresets: Record<string, MotionVariant> = {
  fadeIn,
  fadeUp,
  fadeDown,
  scaleIn,
  slideLeft,
  slideRight,
  pop,
  blurIn,
  flip,
};

// ---------------------------------------------------------------------------
// Reading variants from HTML
// ---------------------------------------------------------------------------

/** Keys of a variant object that are options, not animated properties. */
const OPTION_KEYS = new Set([
  'duration',
  'delay',
  'easing',
  'spring',
  'repeat',
  'repeatType',
  'force',
  'from',
  'start',
  'onUpdate',
  'onComplete',
]);

/** Separates a variant object into keyframes and options. */
export function splitVariant(variant: MotionVariant): {
  keyframes: MotionKeyframes;
  options: AnimateOptions;
} {
  const keyframes: MotionKeyframes = {};
  const options: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(variant)) {
    if (value === undefined || value === null) continue;
    if (OPTION_KEYS.has(key)) options[key] = value;
    else keyframes[key] = value as MotionValue | [MotionValue, MotionValue];
  }
  return { keyframes, options: options as AnimateOptions };
}

/**
 * Decides whether attribute text should be evaluated as an expression or used
 * as literal text. `user.name` is an expression, `Welcome back` is not.
 */
function looksLikeExpression(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (/^['"`]/.test(value)) return true;
  if (/^[[{(]/.test(value)) return true;
  return /^[$A-Za-z_][\w$]*(?:\.[$A-Za-z_][\w$]*|\[[^\]]*\])*$/.test(value);
}

type Evaluator = <T = unknown>(expression?: string) => T;

/** Resolves `v-motion="fadeUp"` or `v-motion="{ ... }"` into a variant. */
function resolveVariant(expression: string, evaluate: Evaluator): MotionVariant | null {
  const text = expression.trim();
  if (!text) return null;
  if (motionPresets[text]) return motionPresets[text];
  if (!looksLikeExpression(text)) return null;

  const value = evaluate<unknown>();
  if (typeof value === 'string' && motionPresets[value]) return motionPresets[value];
  if (value && typeof value === 'object') return value as MotionVariant;
  return null;
}

/** Reads a Voodoo attribute accepting the configured prefix and `data-v-`. */
function readAttr(el: Element, name: string): string | null {
  return el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
}

function hasAttr(el: Element, name: string): boolean {
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}

// ---------------------------------------------------------------------------
// Stagger orchestration in HTML
// ---------------------------------------------------------------------------

interface StaggerSetup {
  step: number;
  from: 'first' | 'last' | 'center';
}

const staggerSetups = new WeakMap<Element, StaggerSetup>();

function readStaggerFrom(el: Element): 'first' | 'last' | 'center' {
  const raw = readAttr(el, 'motion-stagger-from');
  if (raw === 'last' || raw === 'center') return raw;
  return 'first';
}

function isStaggerChild(el: Element): boolean {
  return hasAttr(el, 'motion') || hasAttr(el, 'motion-scroll');
}

/**
 * Calculates the delay that a child receives when the parent declares `v-motion-stagger`.
 * The index is determined on the fly, so children created later by `v-for` also
 * enter the wave.
 */
function inheritedStaggerDelay(el: Element): number {
  const parent = el.parentElement;
  if (!parent) return 0;

  let setup = staggerSetups.get(parent);
  if (!setup) {
    const raw = readAttr(parent, 'motion-stagger');
    if (raw === null) return 0;
    setup = { step: parseDuration(raw, 60), from: readStaggerFrom(parent) };
  }

  const siblings = Array.from(parent.children).filter(isStaggerChild);
  const index = siblings.indexOf(el);
  if (index < 0) return 0;
  return staggerDelay(index, siblings.length, setup.step, setup.from);
}

// ---------------------------------------------------------------------------
// Entry directives
// ---------------------------------------------------------------------------

/**
 * `v-motion="fadeUp"` or `v-motion="{ opacity: [0,1], y: [20,0], duration: 400 }"`.
 * Animates the element as soon as it is initialized.
 */
defineDirective('motion', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion did not recognize the variant "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;

  const control = animate(el, keyframes, options);
  cleanup(() => control.stop());
});

/**
 * `v-motion-scroll="fadeUp"`. Animates when the element enters the viewport.
 * The `.repeat` modifier re-runs the animation on each new entry and
 * `v-motion-scroll-amount` adjusts the required visible fraction.
 */
defineDirective('motion-scroll', ({ el, expression, evaluate, modifiers, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-scroll did not recognize the variant "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;

  const once = !modifiers.repeat;
  const amountAttr = readAttr(el, 'motion-scroll-amount');
  const amount = amountAttr === null ? 0.25 : parseFloat(amountAttr) || 0;

  if (!prefersReducedMotion()) applyInitial(el, keyframes);

  let control: AnimationControl | null = null;
  const stopWatching = inView(
    el,
    () => {
      control?.stop();
      control = animate(el, keyframes, options);
      if (once) return undefined;
      return (): void => {
        control?.stop();
        if (!prefersReducedMotion()) applyInitial(el, keyframes);
      };
    },
    { once, amount, margin: readAttr(el, 'motion-scroll-margin') ?? '0px' }
  );

  cleanup(() => {
    stopWatching();
    control?.stop();
  });
});

/**
 * `v-motion-stagger="60"`. Saves the wave step for direct children that
 * use `v-motion` or `v-motion-scroll`. Accepts `v-motion-stagger-from` with
 * `first`, `last`, or `center`.
 */
defineDirective(
  'motion-stagger',
  ({ el, expression, evaluate }) => {
    const value = evaluate<unknown>();
    const step =
      typeof value === 'number' && Number.isFinite(value)
        ? value
        : parseDuration(expression, 60);
    staggerSetups.set(el, { step, from: readStaggerFrom(el) });
  },
  { priority: PRIORITY.BIND }
);

// ---------------------------------------------------------------------------
// Interaction directives
// ---------------------------------------------------------------------------

/** Binds a variant to a pair of enter and leave events. */
function bindInteraction(
  el: HTMLElement,
  variant: MotionVariant,
  enterEvents: string[],
  leaveEvents: string[],
  defaults: AnimateOptions,
  cleanup: (fn: () => void) => void
): void {
  const { keyframes, options } = splitVariant(variant);
  const merged: AnimateOptions = { ...defaults, ...options };
  let base: MotionKeyframes | null = null;
  let control: AnimationControl | null = null;

  const goTo = (frames: MotionKeyframes): void => {
    control?.stop();
    control = animate(el, frames, merged);
  };

  const onEnter = (): void => {
    if (!base) base = captureState(el, keyframes);
    goTo(keyframes);
  };

  const onLeave = (): void => {
    if (!base) return;
    goTo(base);
  };

  for (const name of enterEvents) el.addEventListener(name, onEnter);
  for (const name of leaveEvents) el.addEventListener(name, onLeave);

  cleanup(() => {
    for (const name of enterEvents) el.removeEventListener(name, onEnter);
    for (const name of leaveEvents) el.removeEventListener(name, onLeave);
    control?.stop();
  });
}

/** `v-motion-hover="{ scale: 1.05 }"`. Animates on mouse and keyboard focus. */
defineDirective('motion-hover', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-hover did not recognize the variant "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ['mouseenter', 'focusin'],
    ['mouseleave', 'focusout'],
    { duration: 220, easing: 'easeOut' },
    cleanup
  );
});

/** `v-motion-tap="{ scale: 0.96 }"`. Animates while the element is pressed. */
defineDirective('motion-tap', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-tap did not recognize the variant "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ['pointerdown'],
    ['pointerup', 'pointercancel', 'pointerleave', 'blur'],
    { duration: 140, easing: 'easeOut' },
    cleanup
  );
});

// ---------------------------------------------------------------------------
// v-parallax
// ---------------------------------------------------------------------------

/**
 * `v-parallax="0.3"`. Offsets the element as the page scrolls, with the given
 * factor. Negative values reverse the direction of movement.
 */
defineDirective('parallax', ({ el, expression, evaluate, cleanup }) => {
  if (prefersReducedMotion() || typeof window === 'undefined') return;

  const value = evaluate<unknown>();
  const factor =
    typeof value === 'number' && Number.isFinite(value) ? value : parseFloat(expression) || 0.3;

  el.style.willChange = 'transform';
  let queued = false;

  const measure = (): void => {
    queued = false;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const center = rect.top + rect.height / 2;
    getTransformState(el).parallax = (viewport / 2 - center) * factor;
    applyTransform(el);
  };

  const schedule = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  measure();

  cleanup(() => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    getTransformState(el).parallax = 0;
    applyTransform(el);
    el.style.removeProperty('will-change');
  });
});

// ---------------------------------------------------------------------------
// v-flip
// ---------------------------------------------------------------------------

interface FlipEntry {
  el: MotionElement;
  rect: DOMRect;
  options: AnimateOptions;
  control: AnimationControl | null;
  animating: boolean;
}

const flipEntries = new Map<Element, FlipEntry>();
let flipObserver: MutationObserver | null = null;
let flipQueued = false;

function scheduleFlipPass(): void {
  if (flipQueued || typeof requestAnimationFrame !== 'function') return;
  flipQueued = true;
  requestAnimationFrame(runFlipPass);
}

/**
 * Compares the previous position with the current one, and when it changes, places the element
 * back in the old place via transform and animates to zero. This is the FLIP technique.
 */
function runFlipPass(): void {
  flipQueued = false;
  for (const entry of flipEntries.values()) {
    if (!entry.el.isConnected || entry.animating) continue;

    const next = entry.el.getBoundingClientRect();
    const previous = entry.rect;
    entry.rect = next;

    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    const sx = next.width > 0 ? previous.width / next.width : 1;
    const sy = next.height > 0 ? previous.height / next.height : 1;

    const moved = Math.abs(dx) >= 1 || Math.abs(dy) >= 1;
    const resized = Math.abs(sx - 1) >= 0.01 || Math.abs(sy - 1) >= 0.01;
    if (!moved && !resized) continue;

    entry.animating = true;
    entry.control?.stop();
    entry.control = animate(
      entry.el,
      { x: [dx, 0], y: [dy, 0], scaleX: [sx, 1], scaleY: [sy, 1] },
      entry.options
    );
    entry.control.finished.then(() => {
      entry.animating = false;
      if (entry.el.isConnected) entry.rect = entry.el.getBoundingClientRect();
    });
  }
}

function ensureFlipWatcher(): void {
  if (flipObserver || typeof MutationObserver === 'undefined') return;
  const root = config.root ?? document.body;
  if (!root) return;
  // Only `childList` because FLIP itself writes to the `style` attribute and
  // observing attributes would create an infinite loop of measurements.
  flipObserver = new MutationObserver(scheduleFlipPass);
  flipObserver.observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleFlipPass);
}

/**
 * `v-flip`. Saves the element's position, and when it changes between updates,
 * smoothly animates from the old place to the new one. Accepts options:
 * `v-flip="{ duration: 300, easing: 'easeInOut' }"`.
 */
defineDirective('flip', ({ el, expression, evaluate, cleanup }) => {
  if (typeof document === 'undefined') return;

  const variant = resolveVariant(expression, evaluate as Evaluator);
  const options: AnimateOptions = variant ? splitVariant(variant).options : {};
  if (options.duration === undefined && options.spring === undefined) {
    options.spring = { stiffness: 340, damping: 34 };
  }

  ensureFlipWatcher();
  flipEntries.set(el, {
    el,
    rect: el.getBoundingClientRect(),
    options,
    control: null,
    animating: false,
  });

  cleanup(() => {
    flipEntries.get(el)?.control?.stop();
    flipEntries.delete(el);
  });
});

// ---------------------------------------------------------------------------
// v-count
// ---------------------------------------------------------------------------

/**
 * Sets up the formatter for `v-count`. The `percent` format only adds the
 * symbol, because in a dashboard the value usually already comes in the 0 to 100 scale.
 */
function countFormatter(format: string, decimals: number): (value: number) => string {
  const numberOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (format === 'currency') {
    numberOptions.style = 'currency';
    numberOptions.currency = config.currency;
  }
  const formatter = new Intl.NumberFormat(config.locale, numberOptions);
  if (format === 'percent') return (value: number): string => `${formatter.format(value)}%`;
  return (value: number): string => formatter.format(value);
}

/**
 * `v-count="1250"`. Animates the number from zero to the value and writes it to the element.
 * Accepts `v-count-duration`, `v-count-decimals`, `v-count-format`
 * (`number`, `currency`, or `percent`), `v-count-prefix`, and `v-count-suffix`.
 * Reactive changes to the value re-animate from the currently displayed number.
 */
defineDirective('count', ({ el, evaluate, effect, cleanup }) => {
  const duration = parseDuration(readAttr(el, 'count-duration') ?? undefined, 1400);
  const decimals = Math.max(0, Math.min(6, parseInt(readAttr(el, 'count-decimals') ?? '0', 10) || 0));
  const format = readAttr(el, 'count-format') ?? 'number';
  const prefix = readAttr(el, 'count-prefix') ?? '';
  const suffix = readAttr(el, 'count-suffix') ?? '';
  const formatter = countFormatter(format, decimals);

  let current = 0;
  let control: AnimationControl | null = null;

  effect(() => {
    const raw = Number(evaluate<unknown>());
    const target = Number.isFinite(raw) ? raw : 0;
    const start = current;
    control?.stop();
    control = animate(
      el,
      {},
      {
        duration,
        easing: 'easeOutExpo',
        onUpdate(progress) {
          current = start + (target - start) * progress;
          el.textContent = `${prefix}${formatter(current)}${suffix}`;
        },
      }
    );
  });

  cleanup(() => control?.stop());
});

// ---------------------------------------------------------------------------
// v-typewriter
// ---------------------------------------------------------------------------

/**
 * `v-typewriter="Text here"`. Writes the text letter by letter. Accepts
 * `v-typewriter-speed` with the milliseconds for each character. The value can be
 * plain text or a reactive expression, like `v-typewriter="message"`.
 */
defineDirective('typewriter', ({ el, expression, evaluate, effect, cleanup }) => {
  const speed = parseDuration(readAttr(el, 'typewriter-speed') ?? undefined, 45);
  const dynamic = looksLikeExpression(expression);
  let control: AnimationControl | null = null;

  effect(() => {
    const text = dynamic ? String(evaluate<unknown>() ?? '') : expression;
    control?.stop();
    el.textContent = '';
    if (!text) return;

    let shown = -1;
    control = animate(
      el,
      {},
      {
        duration: Math.max(1, text.length * speed),
        easing: 'linear',
        onUpdate(progress) {
          const count = Math.round(progress * text.length);
          if (count === shown) return;
          shown = count;
          el.textContent = text.slice(0, count);
        },
      }
    );
  });

  cleanup(() => control?.stop());
});

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------

/**
 * Everything from the module gathered in a single object, to expose as `V.motion` without
 * colliding with names from other modules, like the `fadeIn` from `dom/transition`.
 */
export const motion = {
  animate,
  spring,
  stagger,
  inView,
  scrollProgress,
  applyInitial,
  captureState,
  splitVariant,
  easings,
  presets: motionPresets,
};
