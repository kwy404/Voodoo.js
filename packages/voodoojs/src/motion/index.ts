/**
 * @module motion
 *
 * Motor de animacao proprio, no espirito do Framer Motion, escrito em vanilla.
 *
 * O nucleo e um unico laco de `requestAnimationFrame` compartilhado por todas
 * as animacoes ativas. Existem dois modos de progresso:
 *
 * - tween, com duracao fixa e curva de easing;
 * - mola, com integracao numerica real de `stiffness`, `damping` e `mass`.
 *
 * As propriedades `x`, `y`, `z`, `scale`, `rotate` e `skew` nao viram estilos
 * separados: elas alimentam um estado por elemento que e recomposto em um unico
 * `transform`, entao varias animacoes convivem sem sobrescrever umas as outras.
 *
 * ```js
 * V.animate(botao, { scale: [1, 1.1], opacity: [0, 1] }, { spring: true })
 * V.spring(0, 100, { stiffness: 210, onUpdate: (v) => console.log(v) })
 * ```
 *
 * Tudo respeita `prefers-reduced-motion: reduce`. Nesse caso o estado final e
 * aplicado na hora, sem quadros intermediarios.
 */

import { warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { device, parseDuration } from '../utils';

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

/** Elemento animavel. SVG entra junto porque tambem tem `style` e caixa. */
export type MotionElement = HTMLElement | SVGElement;

/** Alvo aceito por `animate` e `stagger`. */
export type MotionTarget = Element | ArrayLike<Element> | string | null | undefined;

/** Valor de uma propriedade animada. */
export type MotionValue = number | string;

/**
 * Mapa de propriedades animadas. Um valor unico usa o estado atual como ponto
 * de partida. Um par `[de, para]` define os dois extremos.
 */
export type MotionKeyframes = Record<string, MotionValue | [MotionValue, MotionValue]>;

/** Curva de progresso. Recebe e devolve numeros normalmente entre 0 e 1. */
export type EasingFunction = (t: number) => number;

/** Controle devolvido por qualquer animacao. */
export interface AnimationControl {
  /** Interrompe a animacao no ponto atual, sem disparar `onComplete`. */
  stop(): void;
  /** Resolve quando a animacao termina ou quando e interrompida. */
  finished: Promise<void>;
}

/** Parametros fisicos da mola. */
export interface SpringConfig {
  /** Rigidez da mola. Quanto maior, mais rapido. Padrao 170. */
  stiffness?: number;
  /** Atrito. Quanto maior, menos oscilacao. Padrao 26. */
  damping?: number;
  /** Massa do corpo. Quanto maior, mais lento e pesado. Padrao 1. */
  mass?: number;
  /** Velocidade inicial, em unidades por segundo. */
  velocity?: number;
  /** Distancia considerada repouso. */
  restDelta?: number;
  /** Velocidade considerada repouso. */
  restSpeed?: number;
}

/** Opcoes de `animate`. */
export interface AnimateOptions {
  /** Duracao em milissegundos. Ignorada quando `spring` esta ativo. Padrao 400. */
  duration?: number;
  /** Espera antes de comecar, em milissegundos. */
  delay?: number;
  /** Nome de um easing conhecido ou funcao propria. */
  easing?: EasingName | EasingFunction | string;
  /** Usa fisica de mola no lugar do tween. `true` aceita os padroes. */
  spring?: boolean | SpringConfig;
  /** Repeticoes extras. `2` executa tres vezes ao todo. */
  repeat?: number;
  /** Comportamento de cada repeticao. */
  repeatType?: 'loop' | 'reverse' | 'mirror';
  /** Ignora `prefers-reduced-motion`. Reserve para animacoes essenciais. */
  force?: boolean;
  /** Chamado a cada quadro com o progresso, que pode passar de 1 na mola. */
  onUpdate?(progress: number): void;
  /** Chamado quando a animacao chega ao fim por conta propria. */
  onComplete?(): void;
}

/** Opcoes de `stagger`. */
export interface StaggerOptions extends AnimateOptions {
  /** Atraso somado a cada item da lista, em milissegundos. Padrao 60. */
  delay?: number;
  /** De onde a onda parte. Padrao `first`. */
  from?: 'first' | 'last' | 'center';
  /** Atraso aplicado antes do primeiro item da onda. */
  start?: number;
}

/** Opcoes de `spring`. */
export interface SpringOptions extends SpringConfig {
  /** Recebe o valor interpolado a cada quadro. */
  onUpdate?(value: number): void;
  /** Chamado quando a mola entra em repouso. */
  onComplete?(): void;
}

/** Opcoes de `inView`. */
export interface InViewOptions {
  /** Desliga o observador depois da primeira entrada. Padrao `true`. */
  once?: boolean;
  /** Margem do observador, no formato de `rootMargin`. */
  margin?: string;
  /** Fracao visivel necessaria, ou `any` e `all`. Padrao 0.25. */
  amount?: number | 'any' | 'all';
  /** Raiz do observador. Padrao a viewport. */
  root?: Element | null;
}

/**
 * Objeto que mistura propriedades animadas e opcoes de animacao, no formato
 * usado pelos presets e pelas directives.
 */
export interface MotionVariant extends AnimateOptions {
  [property: string]: unknown;
}

// ---------------------------------------------------------------------------
// Laco de quadros compartilhado
// ---------------------------------------------------------------------------

type FrameCallback = (now: number) => void;

const frameCallbacks = new Set<FrameCallback>();
let frameHandle = 0;

function runFrame(now: number): void {
  frameHandle = 0;
  // Copia a lista porque um callback pode registrar ou remover outros.
  const pending = Array.from(frameCallbacks);
  for (const callback of pending) {
    if (frameCallbacks.has(callback)) callback(now);
  }
  if (frameCallbacks.size > 0) frameHandle = requestAnimationFrame(runFrame);
}

/** Registra um callback no laco compartilhado. */
function addFrame(callback: FrameCallback): void {
  if (typeof requestAnimationFrame !== 'function') return;
  frameCallbacks.add(callback);
  if (!frameHandle) frameHandle = requestAnimationFrame(runFrame);
}

/** Remove um callback do laco compartilhado. */
function removeFrame(callback: FrameCallback): void {
  frameCallbacks.delete(callback);
  if (frameCallbacks.size === 0 && frameHandle) {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
}

/** Tempo maximo de uma animacao, para molas que nunca chegam ao repouso. */
const MAX_DURATION = 12_000;

// ---------------------------------------------------------------------------
// Easings
// ---------------------------------------------------------------------------

function backIn(t: number): number {
  return t * t * (2.70158 * t - 1.70158);
}

/**
 * Curvas de progresso prontas. Todas recebem e devolvem valores entre 0 e 1,
 * com excecao de `easeOutBack` e `anticipate`, que passam do intervalo de
 * proposito para dar a sensacao de peso.
 */
export const easings = {
  /** Progresso constante. */
  linear(t: number): number {
    return t;
  },
  /** Comeca devagar e acelera. */
  easeIn(t: number): number {
    return t * t * t;
  },
  /** Comeca rapido e desacelera. A escolha padrao para entradas. */
  easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  },
  /** Acelera no comeco e freia no fim. */
  easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  /** Passa do alvo e volta, dando um leve exagero no fim. */
  easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  /** Freada muito longa, boa para entradas grandes. */
  easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  },
  /** Recua um pouco antes de avancar, como quem toma impulso. */
  anticipate(t: number): number {
    const doubled = t * 2;
    if (doubled < 1) return 0.5 * backIn(doubled);
    return 0.5 * (2 - Math.pow(2, -10 * (doubled - 1)));
  },
  /** Quica ao chegar no alvo. */
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

/** Nomes aceitos na opcao `easing`. */
export type EasingName = keyof typeof easings;

/** Converte o valor da opcao `easing` em funcao. */
function resolveEasing(easing?: EasingName | EasingFunction | string): EasingFunction {
  if (typeof easing === 'function') return easing;
  if (typeof easing === 'string') {
    const found = (easings as Record<string, EasingFunction | undefined>)[easing];
    if (found) return found;
  }
  return easings.easeOut;
}

// ---------------------------------------------------------------------------
// Estado de transform e filter por elemento
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

/** Nomes alternativos aceitos nos keyframes. */
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

/** Propriedades CSS numericas que nao levam unidade. */
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

/** Estado de transform do elemento, criado com os valores neutros. */
function getTransformState(el: MotionElement): Record<string, number> {
  let state = transformState.get(el);
  if (!state) {
    state = { ...TRANSFORM_DEFAULTS };
    transformState.set(el, state);
  }
  return state;
}

/** Estado de filter do elemento, criado com os valores neutros. */
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

/** Recompoe o `transform` inteiro a partir do estado do elemento. */
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

/** Recompoe o `filter` inteiro a partir do estado do elemento. */
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
// Numeros, unidades e cores
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

/** Le `#fff`, `#112233aa`, `rgb()`, `rgba()`, `hsl()`, `hsla()` e `transparent`. */
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
    // Saturacao e luminosidade chegam como `50%` ou como `0.5`. Os dois viram
    // fracao de 0 a 1 antes da conversao.
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

/** Converte `backgroundColor` em `background-color`. */
function kebabCase(name: string): string {
  if (name.startsWith('--')) return name;
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ---------------------------------------------------------------------------
// Trilhas de animacao
// ---------------------------------------------------------------------------

type TrackKind = 'transform' | 'filter' | 'style';
type TrackMode = 'number' | 'color' | 'discrete';

interface Track {
  kind: TrackKind;
  /** Nome normalizado, ja sem alias. */
  prop: string;
  /** Nome da propriedade CSS, usado quando `kind` e `style`. */
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

/** Le o valor atual de uma propriedade, seja ela transform, filter ou CSS. */
function readCurrent(el: MotionElement, kind: TrackKind, prop: string, cssName: string): MotionValue {
  if (kind === 'transform') return getTransformState(el)[prop];
  if (kind === 'filter') return getFilterState(el)[prop];
  if (typeof getComputedStyle !== 'function') return el.style.getPropertyValue(cssName).trim();
  const computed = getComputedStyle(el).getPropertyValue(cssName);
  return computed ? computed.trim() : '';
}

/** Monta a trilha de uma propriedade, resolvendo tipo, unidade e extremos. */
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

/** Escreve o estado das trilhas no elemento para um progresso qualquer. */
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
 * Aplica o estado inicial de um conjunto de keyframes sem animar. Usado pelas
 * directives que precisam esconder o elemento antes da hora de entrar.
 */
export function applyInitial(target: MotionTarget, keyframes: MotionKeyframes): void {
  for (const el of resolveTargets(target)) {
    applyTracks(el, buildTracks(el, keyframes), 0);
  }
}

/**
 * Le o estado atual das propriedades citadas nos keyframes. Serve para guardar
 * o ponto de retorno de animacoes de hover e de toque.
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
// Alvos
// ---------------------------------------------------------------------------

function isMotionElement(value: unknown): value is MotionElement {
  if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return true;
  return typeof SVGElement !== 'undefined' && value instanceof SVGElement;
}

/** Normaliza seletores, listas e elementos soltos em uma lista de elementos. */
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
 * Controle de uma animacao que ja nasce concluida. Aparece quando o alvo nao
 * existe ou quando `prefers-reduced-motion` aplicou o estado final na hora.
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

  if (device.reducedMotion && !options.force) {
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

  // Aplica o ponto de partida ainda neste quadro para evitar piscada.
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
 * Anima um ou varios elementos.
 *
 * ```js
 * V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 })
 * const controle = V.animate(el, { scale: 1.2 }, { spring: { stiffness: 300 } })
 * await controle.finished
 * ```
 *
 * @param target elemento, lista de elementos ou seletor CSS
 * @param keyframes propriedades animadas, com valor unico ou par `[de, para]`
 * @param options duracao, atraso, easing, mola e repeticao
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
 * Integra uma mola real entre dois numeros e entrega o valor a cada quadro.
 * Nao toca no DOM, entao serve tanto para estilos quanto para contadores,
 * rolagem suave ou qualquer outro valor numerico.
 *
 * ```js
 * V.spring(0, 320, { stiffness: 210, damping: 22, onUpdate: (v) => barra.style.width = v + 'px' })
 * ```
 */
export function spring(from: number, to: number, options: SpringOptions = {}): AnimationControl {
  if (device.reducedMotion) {
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

/** Calcula o atraso de um item dentro da onda. */
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
 * Anima uma lista inteira com atraso progressivo entre os itens.
 *
 * ```js
 * V.stagger('.card', V.motionPresets.fadeUp, { delay: 70, from: 'center' })
 * ```
 *
 * @param targets elementos, lista ou seletor CSS
 * @param keyframes propriedades animadas
 * @param options `delay` e o passo entre itens e `start` o atraso da onda toda
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
// inView e scrollProgress
// ---------------------------------------------------------------------------

function thresholdOf(amount: InViewOptions['amount']): number {
  if (amount === 'all') return 0.99;
  if (amount === 'any') return 0;
  if (typeof amount === 'number') return Math.max(0, Math.min(1, amount));
  return 0.25;
}

/**
 * Dispara um callback quando o elemento entra na viewport.
 *
 * O callback pode devolver uma funcao de limpeza, executada quando o elemento
 * sai da viewport. Isso permite montar e desmontar efeitos sem esforco.
 *
 * ```js
 * const parar = V.inView(secao, () => secao.classList.add('ativa'), { once: true })
 * ```
 *
 * @returns funcao que encerra a observacao
 */
export function inView(
  el: Element,
  callback: (entry: IntersectionObserverEntry) => void | (() => void),
  options: InViewOptions = {}
): () => void {
  const once = options.once ?? true;
  let leaveHandler: (() => void) | void;

  if (typeof IntersectionObserver === 'undefined') {
    // Sem suporte, o conteudo precisa aparecer de qualquer jeito.
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
 * Reporta de 0 a 1 conforme o elemento atravessa a tela. Vale 0 quando o topo
 * do elemento encosta na base da viewport e 1 quando a base dele sai por cima.
 *
 * ```js
 * V.scrollProgress(secao, (p) => barra.style.width = (p * 100) + '%')
 * ```
 *
 * @returns funcao que encerra a observacao
 */
export function scrollProgress(el: Element, callback: (progress: number) => void): () => void {
  let stopped = false;
  let queued = false;

  if (typeof window === 'undefined') {
    // Sem janela nao existe rolagem, entao o progresso fica parado no inicio.
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
// Presets de variantes
// ---------------------------------------------------------------------------

/** Aparecimento simples, so opacidade. */
export const fadeIn: MotionVariant = { opacity: [0, 1], duration: 420, easing: 'easeOut' };

/** Sobe alguns pixels enquanto aparece. O preset mais usado em listas. */
export const fadeUp: MotionVariant = {
  opacity: [0, 1],
  y: [24, 0],
  duration: 520,
  easing: 'easeOutExpo',
};

/** Desce alguns pixels enquanto aparece. */
export const fadeDown: MotionVariant = {
  opacity: [0, 1],
  y: [-24, 0],
  duration: 520,
  easing: 'easeOutExpo',
};

/** Cresce de dentro para fora. */
export const scaleIn: MotionVariant = {
  opacity: [0, 1],
  scale: [0.92, 1],
  duration: 460,
  easing: 'easeOutBack',
};

/** Entra deslizando da direita para a esquerda. */
export const slideLeft: MotionVariant = {
  opacity: [0, 1],
  x: [36, 0],
  duration: 500,
  easing: 'easeOutExpo',
};

/** Entra deslizando da esquerda para a direita. */
export const slideRight: MotionVariant = {
  opacity: [0, 1],
  x: [-36, 0],
  duration: 500,
  easing: 'easeOutExpo',
};

/** Estoura no lugar, com mola bem viva. */
export const pop: MotionVariant = {
  opacity: [0, 1],
  scale: [0.6, 1],
  spring: { stiffness: 420, damping: 18 },
};

/** Sai do desfoque ate ficar nitido. */
export const blurIn: MotionVariant = {
  opacity: [0, 1],
  blur: [10, 0],
  duration: 560,
  easing: 'easeOut',
};

/** Gira no eixo horizontal ao entrar, como uma carta virando. */
export const flip: MotionVariant = {
  opacity: [0, 1],
  rotateX: [-80, 0],
  duration: 620,
  easing: 'easeOutBack',
};

/** Todos os presets reunidos, para busca por nome. */
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
// Leitura de variantes vindas do HTML
// ---------------------------------------------------------------------------

/** Chaves de um objeto de variante que sao opcoes, nao propriedades animadas. */
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

/** Separa um objeto de variante em keyframes e opcoes. */
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
 * Decide se o texto de um atributo deve ser avaliado como expressao ou usado
 * como texto literal. `usuario.nome` e expressao, `Bem vindo de volta` nao e.
 */
function looksLikeExpression(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (/^['"`]/.test(value)) return true;
  if (/^[[{(]/.test(value)) return true;
  return /^[$A-Za-z_][\w$]*(?:\.[$A-Za-z_][\w$]*|\[[^\]]*\])*$/.test(value);
}

type Evaluator = <T = unknown>(expression?: string) => T;

/** Resolve `v-motion="fadeUp"` ou `v-motion="{ ... }"` em uma variante. */
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

/** Le um atributo da Voodoo aceitando o prefixo configurado e `data-v-`. */
function readAttr(el: Element, name: string): string | null {
  return el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
}

function hasAttr(el: Element, name: string): boolean {
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}

// ---------------------------------------------------------------------------
// Orquestracao de stagger no HTML
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
 * Calcula o atraso que um filho recebe quando o pai declara `v-motion-stagger`.
 * O indice e apurado na hora, entao filhos criados depois por `v-for` tambem
 * entram na onda.
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
// Directives de entrada
// ---------------------------------------------------------------------------

/**
 * `v-motion="fadeUp"` ou `v-motion="{ opacity: [0,1], y: [20,0], duration: 400 }"`.
 * Anima o elemento assim que ele e inicializado.
 */
defineDirective('motion', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion nao reconheceu a variante "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;

  const control = animate(el, keyframes, options);
  cleanup(() => control.stop());
});

/**
 * `v-motion-scroll="fadeUp"`. Anima quando o elemento entra na viewport.
 * O modificador `.repeat` refaz a animacao a cada nova entrada e
 * `v-motion-scroll-amount` ajusta a fracao visivel necessaria.
 */
defineDirective('motion-scroll', ({ el, expression, evaluate, modifiers, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-scroll nao reconheceu a variante "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;

  const once = !modifiers.repeat;
  const amountAttr = readAttr(el, 'motion-scroll-amount');
  const amount = amountAttr === null ? 0.25 : parseFloat(amountAttr) || 0;

  if (!device.reducedMotion) applyInitial(el, keyframes);

  let control: AnimationControl | null = null;
  const stopWatching = inView(
    el,
    () => {
      control?.stop();
      control = animate(el, keyframes, options);
      if (once) return undefined;
      return (): void => {
        control?.stop();
        if (!device.reducedMotion) applyInitial(el, keyframes);
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
 * `v-motion-stagger="60"`. Guarda o passo da onda para os filhos diretos que
 * usam `v-motion` ou `v-motion-scroll`. Aceita `v-motion-stagger-from` com
 * `first`, `last` ou `center`.
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
// Directives de interacao
// ---------------------------------------------------------------------------

/** Liga uma variante a um par de eventos de entrada e de saida. */
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

/** `v-motion-hover="{ scale: 1.05 }"`. Anima no mouse e no foco de teclado. */
defineDirective('motion-hover', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-hover nao reconheceu a variante "${expression}".`);
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

/** `v-motion-tap="{ scale: 0.96 }"`. Anima enquanto o elemento esta pressionado. */
defineDirective('motion-tap', ({ el, expression, evaluate, cleanup }) => {
  const variant = resolveVariant(expression, evaluate as Evaluator);
  if (!variant) {
    warn(`v-motion-tap nao reconheceu a variante "${expression}".`);
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
 * `v-parallax="0.3"`. Desloca o elemento conforme a rolagem, com o fator
 * informado. Valores negativos invertem o sentido do movimento.
 */
defineDirective('parallax', ({ el, expression, evaluate, cleanup }) => {
  if (device.reducedMotion || typeof window === 'undefined') return;

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
 * Compara a posicao anterior com a atual e, quando muda, coloca o elemento de
 * volta no lugar antigo por transform e anima ate zero. Esta e a tecnica FLIP.
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
  // Apenas `childList` porque o proprio FLIP escreve no atributo `style` e
  // observar atributos criaria um laco infinito de medicoes.
  flipObserver = new MutationObserver(scheduleFlipPass);
  flipObserver.observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', scheduleFlipPass);
}

/**
 * `v-flip`. Guarda a posicao do elemento e, quando ela muda entre atualizacoes,
 * anima suavemente do lugar antigo para o novo. Aceita opcoes:
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
 * Monta o formatador de `v-count`. O formato `percent` apenas acrescenta o
 * simbolo, porque em painel o valor ja costuma vir na escala de 0 a 100.
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
 * `v-count="1250"`. Anima o numero de zero ate o valor e escreve no elemento.
 * Aceita `v-count-duration`, `v-count-decimals`, `v-count-format`
 * (`number`, `currency` ou `percent`), `v-count-prefix` e `v-count-suffix`.
 * Mudancas reativas no valor reanimam a partir do numero exibido.
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
 * `v-typewriter="Texto aqui"`. Escreve o texto letra por letra. Aceita
 * `v-typewriter-speed` com os milissegundos de cada caractere. O valor pode ser
 * um texto solto ou uma expressao reativa, como `v-typewriter="frase"`.
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
 * Tudo do modulo reunido em um objeto so, para expor como `V.motion` sem
 * colidir com nomes de outros modulos, como o `fadeIn` de `dom/transition`.
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
