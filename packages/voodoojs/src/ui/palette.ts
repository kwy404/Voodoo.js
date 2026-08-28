/**
 * @module ui/palette
 *
 * Paleta configuravel da Voodoo. A partir de poucas cores base a funcao gera a
 * escala completa de tons (50 a 900), a versao de tema escuro e a cor de texto
 * com melhor contraste sobre cada cor, tudo escrito como variaveis CSS no
 * `:root`.
 *
 * O calculo acontece em OKLCH, um espaco perceptualmente uniforme: degraus com
 * a mesma diferenca de luminancia parecem igualmente distantes para o olho, o
 * que nao acontece em HSL. A cor de texto usa o calculo real de luminancia
 * relativa da WCAG, entao o resultado e sempre legivel.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * V.palette({ preset: 'oceano' })
 * ```
 */

import { ensureTokens } from '../dom/style';
import { config } from '../runtime/registry';
import { storage } from '../storage';

// ---------------------------------------------------------------------------
// Tipos de cor
// ---------------------------------------------------------------------------

/** Cor no espaco sRGB, com canais de 0 a 255. */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/** Cor em OKLCH: luminancia perceptual (0 a 1), croma e matiz em graus. */
export interface OklchColor {
  l: number;
  c: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Leitura de cores escritas pelo usuario
// ---------------------------------------------------------------------------

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]?$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i;
const RGB_FUNCTION = /^rgba?\(([^)]+)\)$/i;
const HSL_FUNCTION = /^hsla?\(([^)]+)\)$/i;

function numbers(body: string): number[] {
  return body
    .split(/[\s,/]+/)
    .map((part) => parseFloat(part))
    .filter((value) => !Number.isNaN(value));
}

/** Converte HSL (matiz em graus, saturacao e luminancia em porcentagem) em sRGB. */
function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s / 100, 0, 1);
  const lig = clamp(l / 100, 0, 1);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  const sector = Math.floor(hue / 60) % 6;
  const table: Array<[number, number, number]> = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = table[sector];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

/**
 * Le uma cor escrita como `#abc`, `#aabbcc`, `rgb(...)` ou `hsl(...)`.
 * Devolve `null` quando o texto nao descreve uma cor conhecida.
 */
export function parseColor(input: string): RgbColor | null {
  const text = String(input ?? '').trim();
  if (!text) return null;

  const short = HEX_SHORT.exec(text);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    };
  }

  const long = HEX_LONG.exec(text);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
    };
  }

  const rgb = RGB_FUNCTION.exec(text);
  if (rgb) {
    const [r, g, b] = numbers(rgb[1]);
    if (r === undefined || g === undefined || b === undefined) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) };
  }

  const hsl = HSL_FUNCTION.exec(text);
  if (hsl) {
    const [h, s, l] = numbers(hsl[1]);
    if (h === undefined || s === undefined || l === undefined) return null;
    return hslToRgb(h, s, l);
  }

  return null;
}

// ---------------------------------------------------------------------------
// sRGB, luz linear e OKLCH
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Remove a curva gama do sRGB, entregando energia luminosa linear. */
function toLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Reaplica a curva gama do sRGB sobre um valor linear de 0 a 1. */
function toGamma(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return v;
}

/** Converte sRGB em OKLab, passando pelo cone LMS com raiz cubica. */
function rgbToOklab(color: RgbColor): { l: number; a: number; b: number } {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  const lms1 = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lms2 = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lms3 = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(lms1);
  const m = Math.cbrt(lms2);
  const s = Math.cbrt(lms3);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Converte OKLab em canais sRGB continuos de 0 a 1, sem recorte. */
function oklabToRaw(lab: { l: number; a: number; b: number }): { r: number; g: number; b: number } {
  const l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  return {
    r: toGamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: toGamma(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: toGamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  };
}

/** Converte sRGB em OKLCH. */
export function rgbToOklch(color: RgbColor): OklchColor {
  const lab = rgbToOklab(color);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h: c < 0.00001 ? 0 : h };
}

function oklchToRaw(color: OklchColor): { r: number; g: number; b: number } {
  const rad = (color.h * Math.PI) / 180;
  return oklabToRaw({ l: color.l, a: Math.cos(rad) * color.c, b: Math.sin(rad) * color.c });
}

/**
 * Converte OKLCH em sRGB. Cores fora do gamut do monitor perdem croma aos
 * poucos ate caberem, o que preserva matiz e luminancia em vez de recortar os
 * canais e mudar a cor percebida.
 */
export function oklchToRgb(color: OklchColor): RgbColor {
  let chroma = Math.max(0, color.c);
  for (let i = 0; i < 32; i++) {
    const raw = oklchToRaw({ l: clamp(color.l, 0, 1), c: chroma, h: color.h });
    if (raw.r >= -0.001 && raw.r <= 1.001 && raw.g >= -0.001 && raw.g <= 1.001 && raw.b >= -0.001 && raw.b <= 1.001) {
      return {
        r: Math.round(clamp(raw.r, 0, 1) * 255),
        g: Math.round(clamp(raw.g, 0, 1) * 255),
        b: Math.round(clamp(raw.b, 0, 1) * 255),
      };
    }
    chroma *= 0.92;
  }
  const gray = oklchToRaw({ l: clamp(color.l, 0, 1), c: 0, h: color.h });
  return {
    r: Math.round(clamp(gray.r, 0, 1) * 255),
    g: Math.round(clamp(gray.g, 0, 1) * 255),
    b: Math.round(clamp(gray.b, 0, 1) * 255),
  };
}

function pad(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

/** Escreve uma cor sRGB como `#rrggbb`. */
export function toHex(color: RgbColor): string {
  return `#${pad(color.r)}${pad(color.g)}${pad(color.b)}`;
}

/** Escreve uma cor sRGB como `rgba(r, g, b, alpha)`. */
export function toRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(alpha.toFixed(3))})`;
}

function oklchToHex(color: OklchColor): string {
  return toHex(oklchToRgb(color));
}

// ---------------------------------------------------------------------------
// Contraste WCAG
// ---------------------------------------------------------------------------

/** Luminancia relativa da WCAG 2.1, de 0 (preto) a 1 (branco). */
export function relativeLuminance(color: RgbColor): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/** Razao de contraste da WCAG entre duas cores, de 1 a 21. */
export function contrastRatio(a: RgbColor | string, b: RgbColor | string): number {
  const first = typeof a === 'string' ? parseColor(a) : a;
  const second = typeof b === 'string' ? parseColor(b) : b;
  if (!first || !second) return 1;
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

const WHITE: RgbColor = { r: 255, g: 255, b: 255 };
const BLACK: RgbColor = { r: 0, g: 0, b: 0 };

/**
 * Escolhe preto ou branco para o texto sobre a cor informada, comparando a
 * razao de contraste real das duas opcoes.
 */
export function contrastText(color: RgbColor | string): string {
  const base = typeof color === 'string' ? parseColor(color) : color;
  if (!base) return '#ffffff';
  return contrastRatio(base, WHITE) >= contrastRatio(base, BLACK) ? '#ffffff' : '#000000';
}

// ---------------------------------------------------------------------------
// Escalas
// ---------------------------------------------------------------------------

/** Degraus gerados para cada cor base. */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// Luminancia alvo de cada degrau no tema claro. A curva e mais espacada nos
// tons claros porque o olho separa melhor as diferencas nessa faixa.
const LIGHT_L = [0.973, 0.941, 0.889, 0.819, 0.732, 0.638, 0.558, 0.478, 0.399, 0.327];
// Croma relativo ao da cor base. O degrau 500 usa exatamente o croma original.
const LIGHT_C = [0.14, 0.26, 0.46, 0.68, 0.88, 1, 0.97, 0.89, 0.78, 0.65];

// No tema escuro a escala inverte de papel: 50 vira o fundo suave e 900 vira o
// texto forte. Assim o mesmo CSS funciona nos dois temas sem trocar tokens.
const DARK_L = [0.244, 0.286, 0.343, 0.408, 0.484, 0.588, 0.668, 0.748, 0.836, 0.928];
const DARK_C = [0.3, 0.42, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.57, 0.33];

/** Escala de tons de uma cor, com os degraus de 50 a 900. */
export type ColorScale = Record<string, string>;

/**
 * Gera a escala de uma cor base.
 *
 * @param color cor base em qualquer formato aceito por `parseColor`
 * @param dark quando `true`, gera a escala do tema escuro (papeis invertidos)
 */
export function colorScale(color: string | RgbColor, dark = false): ColorScale {
  const rgb = typeof color === 'string' ? parseColor(color) ?? BLACK : color;
  const base = rgbToOklch(rgb);
  const lightness = dark ? DARK_L : LIGHT_L;
  const chroma = dark ? DARK_C : LIGHT_C;
  const out: ColorScale = {};
  SCALE_STEPS.forEach((step, index) => {
    out[String(step)] = oklchToHex({
      l: lightness[index],
      c: base.c * chroma[index],
      h: base.h,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Conjunto de cores base de um preset. */
export interface PaletteColors {
  primary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Cor que tinge fundos, textos e bordas. Padrao: matiz da primaria. */
  neutral?: string;
}

/** Nomes dos presets prontos. */
export type PresetName = 'violeta' | 'oceano' | 'floresta' | 'poente' | 'grafite';

/** Presets prontos, todos com contraste verificado nos dois temas. */
export const presets: Record<PresetName, PaletteColors> = {
  violeta: {
    primary: '#6D3BF5',
    accent: '#FF3D8B',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#E11D48',
    info: '#7C6BFF',
  },
  oceano: {
    primary: '#0E7BC4',
    accent: '#0FB5C9',
    success: '#0F9D6E',
    warning: '#D08700',
    danger: '#DC2F3E',
    info: '#3B82F6',
  },
  floresta: {
    primary: '#1F8A4C',
    accent: '#7FA80E',
    success: '#18A05A',
    warning: '#C97A0A',
    danger: '#C93A2E',
    info: '#2C8FA8',
  },
  poente: {
    primary: '#E4632A',
    accent: '#D62F63',
    success: '#3E9B52',
    warning: '#D99000',
    danger: '#D32F2F',
    info: '#B45FC0',
  },
  grafite: {
    primary: '#4C5A70',
    accent: '#2E7FD1',
    success: '#2F8F60',
    warning: '#B57A12',
    danger: '#C2453F',
    info: '#5B7A99',
  },
};

// ---------------------------------------------------------------------------
// Opcoes
// ---------------------------------------------------------------------------

/** Opcoes aceitas por `V.palette()`. */
export interface PaletteOptions extends Partial<PaletteColors> {
  /** Preset usado como ponto de partida. As cores informadas sobrescrevem. */
  preset?: PresetName;
  /** Raio das bordas, como `12px` ou `0.75rem`. */
  radius?: string;
  /** Familia principal. A pagina continua responsavel por carregar a fonte. */
  font?: string;
  /** Familia monoespacada usada por `VCodeBlock`. */
  monoFont?: string;
  /** Salva a escolha em localStorage. Padrao `true`. */
  persist?: boolean;
}

/** Paleta ja resolvida, com todas as escalas calculadas. */
export interface ResolvedPalette {
  colors: PaletteColors;
  radius: string;
  font: string;
  monoFont: string;
  /** Escalas do tema claro, por nome de cor. */
  light: Record<string, ColorScale>;
  /** Escalas do tema escuro, por nome de cor. */
  dark: Record<string, ColorScale>;
  /** Cor de texto sobre cada cor base, calculada pela WCAG. */
  contrast: Record<string, string>;
  css: string;
}

const ROLES = ['primary', 'accent', 'success', 'warning', 'danger', 'info'] as const;
type Role = (typeof ROLES)[number];

const STORAGE_KEY = 'voodoo:palette';
const STYLE_ID = 'voodoo-palette';

const DEFAULT_FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const DEFAULT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

// ---------------------------------------------------------------------------
// Geracao do CSS
// ---------------------------------------------------------------------------

function fontStack(font: string | undefined, fallback: string): string {
  const name = (font ?? '').trim();
  if (!name) return fallback;
  if (name.includes(',')) return name;
  const quoted = /^['"]/.test(name) ? name : `'${name}'`;
  return `${quoted}, ${fallback}`;
}

const RADIUS_PATTERN = /^([\d.]+)(px|rem|em)$/;

/** Deriva os raios menores e maiores a partir do raio base informado. */
function radiusScale(radius: string): Record<string, string> {
  const text = (radius || '12px').trim();
  const match = RADIUS_PATTERN.exec(text);
  if (!match) {
    return {
      '--v-radius': text,
      '--v-radius-sm': `calc(${text} * 0.6)`,
      '--v-radius-lg': `calc(${text} * 1.5)`,
      '--v-radius-xl': `calc(${text} * 2)`,
      '--v-radius-full': '999px',
    };
  }
  const value = parseFloat(match[1]);
  const unit = match[2];
  const round = (n: number): string => `${Math.round(n * 1000) / 1000}${unit}`;
  return {
    '--v-radius': round(value),
    '--v-radius-sm': round(Math.max(value * 0.55, 0)),
    '--v-radius-lg': round(value * 1.5),
    '--v-radius-xl': round(value * 2),
    '--v-radius-full': '999px',
  };
}

interface ThemeVars {
  vars: Record<string, string>;
  scales: Record<string, ColorScale>;
  contrast: Record<string, string>;
}

/** Monta todas as variaveis de um tema a partir das cores base. */
function buildTheme(colors: PaletteColors, dark: boolean): ThemeVars {
  const vars: Record<string, string> = {};
  const scales: Record<string, ColorScale> = {};
  const contrast: Record<string, string> = {};

  for (const role of ROLES) {
    const rgb = parseColor(colors[role]) ?? BLACK;
    const base = rgbToOklch(rgb);
    const scale = colorScale(rgb, dark);
    scales[role] = scale;

    for (const step of SCALE_STEPS) {
      vars[`--v-${role}-${step}`] = scale[String(step)];
    }

    // No tema escuro a cor principal sobe de luminancia para nao sumir sobre o
    // fundo. No tema claro ela permanece exatamente a cor pedida.
    const main: OklchColor = dark
      ? { l: Math.max(base.l, 0.62), c: base.c * 0.95, h: base.h }
      : base;
    const hover: OklchColor = dark
      ? { l: Math.min(main.l + 0.07, 0.94), c: main.c * 0.95, h: main.h }
      : { l: Math.max(main.l - 0.055, 0.12), c: main.c, h: main.h };
    const active: OklchColor = dark
      ? { l: Math.min(main.l + 0.13, 0.97), c: main.c * 0.88, h: main.h }
      : { l: Math.max(main.l - 0.105, 0.1), c: main.c, h: main.h };

    const mainRgb = oklchToRgb(main);
    const hoverRgb = oklchToRgb(hover);
    const activeRgb = oklchToRgb(active);

    vars[`--v-${role}`] = dark ? toHex(mainRgb) : toHex(rgb);
    vars[`--v-${role}-hover`] = toHex(hoverRgb);
    vars[`--v-${role}-active`] = toHex(activeRgb);

    // Cada estado ganha a propria cor de texto, porque escurecer ou clarear o
    // fundo pode virar a decisao entre preto e branco.
    vars[`--v-${role}-contrast`] = contrastText(dark ? mainRgb : rgb);
    vars[`--v-${role}-contrast-hover`] = contrastText(hoverRgb);
    vars[`--v-${role}-contrast-active`] = contrastText(activeRgb);

    // Superficie suave e o texto que fica legivel sobre ela.
    const soft = scale['50'];
    const softHover = scale['100'];
    const softText = dark ? scale['800'] : scale['700'];
    vars[`--v-${role}-soft`] = soft;
    vars[`--v-${role}-soft-hover`] = softHover;
    vars[`--v-${role}-soft-text`] = softText;
    vars[`--v-${role}-ring`] = toRgba(mainRgb, dark ? 0.45 : 0.32);
    vars[`--v-${role}-border`] = dark ? scale['300'] : scale['200'];

    contrast[role] = vars[`--v-${role}-contrast`];
  }

  // Neutros tingidos com a matiz escolhida, para a interface inteira parecer
  // parte da mesma paleta.
  const neutralRgb = parseColor(colors.neutral ?? colors.primary) ?? BLACK;
  const hue = rgbToOklch(neutralRgb).h;
  const neutral = (l: number, c: number): string => oklchToHex({ l, c, h: hue });
  const neutralScale: ColorScale = {};
  SCALE_STEPS.forEach((step, index) => {
    const lightnessList = dark ? DARK_L : LIGHT_L;
    neutralScale[String(step)] = neutral(lightnessList[index], 0.012);
    vars[`--v-neutral-${step}`] = neutralScale[String(step)];
  });
  scales.neutral = neutralScale;

  if (dark) {
    vars['--v-surface'] = neutral(0.248, 0.021);
    vars['--v-surface-2'] = neutral(0.196, 0.021);
    vars['--v-surface-3'] = neutral(0.305, 0.024);
    vars['--v-surface-inset'] = neutral(0.17, 0.02);
    vars['--v-text'] = neutral(0.965, 0.008);
    vars['--v-text-muted'] = neutral(0.748, 0.017);
    vars['--v-text-soft'] = neutral(0.63, 0.017);
    vars['--v-border'] = neutral(0.355, 0.023);
    vars['--v-border-strong'] = neutral(0.46, 0.026);
    vars['--v-overlay'] = 'rgba(0, 0, 0, 0.62)';
    vars['--v-shadow-sm'] = '0 1px 2px rgba(0, 0, 0, 0.5)';
    vars['--v-shadow'] = '0 10px 30px rgba(0, 0, 0, 0.5)';
    vars['--v-shadow-lg'] = '0 24px 60px rgba(0, 0, 0, 0.62)';
  } else {
    const inkRgb = oklchToRgb({ l: 0.24, c: 0.028, h: hue });
    vars['--v-surface'] = neutral(1, 0);
    vars['--v-surface-2'] = neutral(0.981, 0.006);
    vars['--v-surface-3'] = neutral(0.955, 0.009);
    vars['--v-surface-inset'] = neutral(0.968, 0.008);
    vars['--v-text'] = toHex(inkRgb);
    vars['--v-text-muted'] = neutral(0.53, 0.023);
    vars['--v-text-soft'] = neutral(0.655, 0.018);
    vars['--v-border'] = neutral(0.906, 0.012);
    vars['--v-border-strong'] = neutral(0.828, 0.016);
    vars['--v-overlay'] = toRgba(inkRgb, 0.45);
    vars['--v-shadow-sm'] = `0 1px 2px ${toRgba(inkRgb, 0.08)}`;
    vars['--v-shadow'] = `0 10px 30px ${toRgba(inkRgb, 0.14)}`;
    vars['--v-shadow-lg'] = `0 24px 60px ${toRgba(inkRgb, 0.2)}`;
  }

  vars['--v-focus-ring'] = vars['--v-primary-ring'];
  contrast.surface = contrastText(parseColor(vars['--v-surface']) ?? WHITE);

  return { vars, scales, contrast };
}

function block(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

// ---------------------------------------------------------------------------
// Aplicacao
// ---------------------------------------------------------------------------

let current: ResolvedPalette | null = null;
let currentOptions: PaletteOptions | null = null;

function resolveOptions(options: PaletteOptions): { colors: PaletteColors; radius: string; font: string; mono: string } {
  const preset = presets[options.preset as PresetName] ?? presets.violeta;
  const colors: PaletteColors = {
    primary: options.primary ?? preset.primary,
    accent: options.accent ?? preset.accent,
    success: options.success ?? preset.success,
    warning: options.warning ?? preset.warning,
    danger: options.danger ?? preset.danger,
    info: options.info ?? preset.info,
    neutral: options.neutral ?? preset.neutral,
  };

  for (const role of ROLES) {
    if (parseColor(colors[role])) continue;
    // eslint-disable-next-line no-console
    console.warn(`[Voodoo] cor invalida em palette.${role}: "${colors[role]}". Usando o preset.`);
    colors[role] = preset[role];
  }

  return {
    colors,
    radius: options.radius ?? '12px',
    font: fontStack(options.font, DEFAULT_FONT),
    mono: fontStack(options.monoFont, DEFAULT_MONO),
  };
}

function writeStyle(css: string): void {
  if (typeof document === 'undefined') return;
  if (!config.injectStyles) return;
  // Os tokens base entram primeiro para que a paleta, injetada depois, vença
  // pela ordem do documento sem precisar de seletores mais especificos.
  ensureTokens();

  let element = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!element) {
    element = document.createElement('style');
    element.id = STYLE_ID;
    element.setAttribute('data-voodoo', 'palette');
    document.head.appendChild(element);
  }
  element.textContent = css;
}

/**
 * Aplica uma paleta. Gera as escalas, escreve as variaveis CSS no `:root`,
 * cria as versoes de tema escuro e salva a escolha em localStorage.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * ```
 *
 * @returns a paleta resolvida, com as escalas e o CSS gerado
 */
export function applyPalette(options: PaletteOptions = {}): ResolvedPalette {
  const { colors, radius, font, mono } = resolveOptions(options);

  const light = buildTheme(colors, false);
  const dark = buildTheme(colors, true);

  const shared: Record<string, string> = {
    ...radiusScale(radius),
    '--v-font-sans': font,
    '--v-font-mono': mono,
  };

  const css = [
    '/* Paleta gerada por V.palette(). Nao edite a mao. */',
    block(':root', { ...shared, ...light.vars }),
    `@media (prefers-color-scheme: dark) {\n${block(':root:not([data-theme="light"])', dark.vars)}\n}`,
    block(':root[data-theme="dark"]', dark.vars),
  ].join('\n');

  writeStyle(css);

  const resolved: ResolvedPalette = {
    colors,
    radius,
    font,
    monoFont: mono,
    light: light.scales,
    dark: dark.scales,
    contrast: light.contrast,
    css,
  };

  current = resolved;
  currentOptions = { ...options };

  if (options.persist !== false && typeof document !== 'undefined') {
    const saved: PaletteOptions = { ...options };
    delete saved.persist;
    storage.set(STORAGE_KEY, saved);
  }

  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('voodoo:palette', { detail: resolved }));
  }

  return resolved;
}

let initialized = false;

/**
 * Aplica a paleta salva em localStorage, ou o preset padrao quando nao existe
 * escolha anterior. Chamada automaticamente pelos componentes de UI.
 */
export function initPalette(): ResolvedPalette {
  if (current && initialized) return current;
  initialized = true;
  const saved = storage.get<PaletteOptions>(STORAGE_KEY);
  const options = saved && typeof saved === 'object' ? { ...saved, persist: false } : { persist: false };
  return applyPalette(options);
}

/** Garante que as variaveis da paleta existam antes de qualquer componente. */
export function ensurePalette(): void {
  if (current) return;
  initPalette();
}

/**
 * Reaplica a paleta guardada em localStorage. Chamada pelo build de navegador
 * antes de iniciar a pagina, para que as cores certas apareçam de primeira.
 */
export function applySavedPalette(): ResolvedPalette {
  return initPalette();
}

/**
 * Paleta da Voodoo. Chame como funcao para aplicar, ou use os utilitarios
 * anexados para inspecionar cores e contraste.
 *
 * ```js
 * V.palette({ preset: 'oceano' })
 * V.palette.scale('#6D3BF5')['700']
 * V.palette.contrastText('#FFB35C')  // '#000000'
 * ```
 */
export const palette = Object.assign(applyPalette, {
  /** Presets prontos, indexados pelo nome. */
  presets,
  /** Nomes dos presets disponiveis. */
  get names(): PresetName[] {
    return Object.keys(presets) as PresetName[];
  },
  /** Paleta em uso, ou `null` antes da primeira aplicacao. */
  get current(): ResolvedPalette | null {
    return current;
  },
  /** Opcoes usadas na ultima aplicacao. */
  get options(): PaletteOptions | null {
    return currentOptions;
  },
  /** Aplica a paleta salva, ou o padrao quando nao ha nada salvo. */
  init: initPalette,
  /** Garante que as variaveis existam, sem sobrescrever o que ja foi aplicado. */
  ensure: ensurePalette,
  /** Volta ao preset padrao e apaga a escolha salva. */
  reset(): ResolvedPalette {
    storage.remove(STORAGE_KEY);
    return applyPalette({ persist: false });
  },
  /** Troca apenas o preset, mantendo raio e fonte atuais. */
  use(name: PresetName): ResolvedPalette {
    return applyPalette({ ...(currentOptions ?? {}), preset: name, primary: undefined, accent: undefined });
  },
  /** Escala de tons de uma cor qualquer. */
  scale: colorScale,
  /** Preto ou branco, conforme o melhor contraste WCAG sobre a cor. */
  contrastText,
  /** Razao de contraste WCAG entre duas cores. */
  contrastRatio,
  /** Luminancia relativa WCAG de uma cor. */
  luminance(color: string | RgbColor): number {
    const rgb = typeof color === 'string' ? parseColor(color) : color;
    return rgb ? relativeLuminance(rgb) : 0;
  },
  /** Conversores expostos para quem quiser gerar cores derivadas. */
  convert: { parseColor, rgbToOklch, oklchToRgb, toHex, toRgba },
});

export type Palette = typeof palette;
