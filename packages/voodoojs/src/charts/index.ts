/**
 * @module charts
 *
 * Charts in pure SVG, with no external dependencies. All drawing is
 * generated as text and delivered to the container at once, which keeps
 * redrawing cheap even with data changing every frame.
 *
 * The module follows three commitments:
 *
 * - responsive, with `viewBox`, `preserveAspectRatio`, and `ResizeObserver`;
 * - accessible, with `role="img"`, descriptive `aria-label`, and `<title>` per shape;
 * - themeable, using `--v-*` variables to work in light and dark modes.
 *
 * ```html
 * <div v-chart="{ type: 'line', data: sales, labels: months, smooth: true }"></div>
 * <div v-chart="sales" v-chart-type="bar"></div>
 * ```
 */

import { ensureTokens, injectStyle } from '../dom/style';
import { config, defineDirective } from '../runtime/registry';
import { readAttr } from '../runtime/walker';
import { device, escapeHtml } from '../utils';

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

/** Supported chart types. */
export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'column'
  | 'stacked'
  | 'pie'
  | 'donut'
  | 'sparkline'
  | 'radar'
  | 'scatter'
  | 'progress';

/** Format applied to displayed values. */
export type ChartFormat = 'number' | 'currency' | 'percent';

/** Named point. `x` and `y` are used only by `scatter`. */
export interface ChartPoint {
  label?: string;
  value?: number;
  x?: number;
  y?: number;
}

/** Named series, used in charts with multiple lines or bars. */
export interface ChartSeriesInput {
  name: string;
  data: number[];
  color?: string;
}

/** Formats accepted in `options.data`. */
export type ChartData = number | number[] | ChartPoint[] | ChartSeriesInput[];

/** Configuration of a chart. */
export interface ChartOptions {
  /** Chart type. Default `line`. */
  type?: ChartType;
  /** Data, in any of the accepted formats. */
  data: ChartData;
  /** Category axis labels. */
  labels?: string[];
  /** Name of the single series, used in legend and tooltip. */
  name?: string;
  /** Palette. When absent, uses brand colors. */
  colors?: string[];
  /** Height in pixels. Varies by type when absent. */
  height?: number;
  /** Width used when the container has no measurement yet. */
  width?: number;
  /** Grid lines and value axis labels. Default `true`. */
  showGrid?: boolean;
  /** Clickable legend. Default `true` when it makes sense for the type. */
  showLegend?: boolean;
  /** Writes the value of each point, bar, or slice. */
  showValues?: boolean;
  /** Animates drawing on entry. Default `true`. */
  animate?: boolean;
  /** Smooth curves in lines and areas, with Catmull-Rom to Bezier. */
  smooth?: boolean;
  /** Scale ceiling. In `progress` defines the value equivalent to 100 percent. */
  max?: number;
  /** Scale floor. */
  min?: number;
  /** Value formatting. Default `number`. */
  format?: ChartFormat;
  /** Tooltip on mouse over. Default `true`. */
  tooltip?: boolean;
}

/** Control returned by `renderChart`. */
export interface ChartInstance {
  /** Container where the chart was drawn. */
  el: HTMLElement;
  /** Options currently in use. */
  readonly options: ChartOptions;
  /** Applies new options and redraws. */
  update(next: Partial<ChartOptions>): void;
  /** Removes listeners, observers, and generated content. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

/** Official brand palette, used when `options.colors` is not filled. */
export const CHART_COLORS = [
  '#6D3BF5',
  '#FF3D8B',
  '#2ED9A5',
  '#FFB35C',
  '#9B7BFF',
  '#FF4D4D',
  '#14111F',
  '#3BB6F5',
];

const CSS = `
.v-chart{position:relative;display:block;width:100%;color:var(--v-text,#14111F);
  font:500 12px/1.35 var(--v-font-sans,system-ui,-apple-system,'Segoe UI',sans-serif)}
.v-chart-svg{display:block;width:100%;overflow:visible;touch-action:pan-y}
.v-chart-grid{stroke:var(--v-border,#E6E0F0);stroke-width:1;shape-rendering:crispEdges}
.v-chart-axis{fill:var(--v-text-muted,#6B6580);font-size:11px}
.v-chart-empty{fill:var(--v-text-muted,#6B6580);font-size:13px}
.v-chart-line{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.v-chart-area{stroke:none}
.v-chart-point{stroke:var(--v-surface,#fff);stroke-width:2}
.v-chart-value{fill:var(--v-text,#14111F);font-size:11px;font-weight:600}
.v-chart-center{fill:var(--v-text,#14111F);font-size:20px;font-weight:700}
.v-chart-center-sub{fill:var(--v-text-muted,#6B6580);font-size:11px;font-weight:500}
.v-chart-track{fill:none;stroke:var(--v-border,#E6E0F0)}
.v-chart-radar-web{fill:none;stroke:var(--v-border,#E6E0F0);stroke-width:1}
.v-chart-radar-area{stroke-width:2}

.v-chart-legend{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;margin-top:10px}
.v-chart-key{display:inline-flex;align-items:center;gap:6px;padding:3px 6px;border:0;cursor:pointer;
  background:none;color:inherit;font:inherit;border-radius:var(--v-radius-sm,8px)}
.v-chart-key:hover{background:var(--v-surface-2,#FBF7F2)}
.v-chart-key:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-chart-key[aria-pressed="false"]{opacity:.42;text-decoration:line-through}
.v-chart-dot{width:10px;height:10px;border-radius:3px;flex:0 0 auto}

.v-chart-tip{position:absolute;left:0;top:0;pointer-events:none;z-index:var(--v-z-tooltip,1200);
  transform:translate(-50%,calc(-100% - 12px));background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-sm,8px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));padding:8px 10px;min-width:96px;
  font-size:12px;line-height:1.4;white-space:nowrap}
.v-chart-tip-title{font-weight:700;margin-bottom:4px}
.v-chart-tip-row{display:flex;align-items:center;gap:6px}
.v-chart-tip-row b{margin-left:auto;font-variant-numeric:tabular-nums}

.v-chart-animate .v-chart-line{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-line{stroke-dashoffset:1}
.v-chart-animate .v-chart-area,.v-chart-animate .v-chart-point,.v-chart-animate .v-chart-value{transition:opacity .5s ease}
.v-chart-animate:not(.v-chart-in) .v-chart-area,
.v-chart-animate:not(.v-chart-in) .v-chart-point,
.v-chart-animate:not(.v-chart-in) .v-chart-value{opacity:0}
.v-chart-animate .v-chart-bar{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-bar{transform:scaleY(0)}
.v-chart-animate .v-chart-barh{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-barh{transform:scaleX(0)}
.v-chart-animate .v-chart-slice{transition:opacity .4s ease,transform .5s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-slice{opacity:0;transform:scale(.86)}
.v-chart-ring{stroke-dashoffset:var(--v-ring-offset,0)}
.v-chart-animate .v-chart-ring{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-ring{stroke-dashoffset:var(--v-ring-full,0)}

@media (prefers-reduced-motion: reduce){
  .v-chart *{transition:none !important}
}
`;

// ---------------------------------------------------------------------------
// Numbers and formatting
// ---------------------------------------------------------------------------

/** Rounds to two decimal places, sufficient for SVG coordinates. */
function r(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function numberFormatter(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const cacheKey = `${config.locale}|${config.currency}|${key}`;
  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat(config.locale, options);
    formatterCache.set(cacheKey, formatter);
  }
  return formatter;
}

/**
 * Formats a value according to `options.format`. The `percent` format only
 * adds the symbol, because in a dashboard the data usually already comes in the 0 to 100 scale.
 */
export function formatChartValue(value: number, format: ChartFormat = 'number'): string {
  if (!Number.isFinite(value)) return '';
  if (format === 'currency') {
    return numberFormatter('currency', {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
  const plain = numberFormatter('number', { maximumFractionDigits: 2 }).format(value);
  return format === 'percent' ? `${plain}%` : plain;
}

// ---------------------------------------------------------------------------
// Data normalization
// ---------------------------------------------------------------------------

interface ChartSeries {
  name: string;
  values: number[];
  /** Own horizontal coordinates, used only by `scatter`. */
  xs: number[] | null;
  color: string;
}

interface ChartDataset {
  series: ChartSeries[];
  labels: string[];
  /** When `true`, each item has its own color and the legend lists categories. */
  categorical: boolean;
}

interface LegendItem {
  key: string;
  name: string;
  color: string;
}

function isSeriesInput(value: unknown): value is ChartSeriesInput {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as ChartSeriesInput).data)
  );
}

function labelAt(labels: string[], index: number): string {
  const label = labels[index];
  return label === undefined || label === '' ? `#${index + 1}` : label;
}

/** Converts any accepted `data` format into series with defined colors. */
function normalize(options: ChartOptions, type: ChartType): ChartDataset {
  const palette = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const fromOptions = Array.isArray(options.labels);
  const labels: string[] = fromOptions ? options.labels!.map((label) => String(label)) : [];
  const series: ChartSeries[] = [];
  const raw = options.data;
  const singleName = options.name ?? 'Value';

  if (typeof raw === 'number') {
    series.push({ name: singleName, values: [raw], xs: null, color: palette[0] });
  } else if (Array.isArray(raw) && raw.length > 0) {
    const first: unknown = raw[0];
    if (typeof first === 'number') {
      series.push({
        name: singleName,
        values: (raw as unknown[]).map(toNumber),
        xs: null,
        color: palette[0],
      });
    } else if (isSeriesInput(first)) {
      (raw as ChartSeriesInput[]).forEach((entry, index) => {
        series.push({
          name: entry.name || `Serie ${index + 1}`,
          values: (entry.data || []).map(toNumber),
          xs: null,
          color: entry.color || palette[index % palette.length],
        });
      });
    } else {
      const points = raw as ChartPoint[];
      const values: number[] = [];
      const xs: number[] = [];
      let hasX = false;
      points.forEach((point, index) => {
        values.push(toNumber(point.value !== undefined ? point.value : point.y));
        if (typeof point.x === 'number') {
          hasX = true;
          xs.push(point.x);
        } else {
          xs.push(index);
        }
        if (!fromOptions && point.label !== undefined) labels[index] = String(point.label);
      });
      series.push({ name: singleName, values, xs: hasX ? xs : null, color: palette[0] });
    }
  }

  const categorical = type === 'pie' || type === 'donut';
  if (categorical) {
    for (let i = 0; i < (series[0]?.values.length ?? 0); i++) {
      if (labels[i] === undefined) labels[i] = labelAt(labels, i);
    }
  }

  return { series, labels, categorical };
}

/** Builds the legend from series or categories. */
function buildLegend(dataset: ChartDataset, palette: string[]): LegendItem[] {
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return [];
    return first.values.map((_, index) => ({
      key: labelAt(dataset.labels, index),
      name: labelAt(dataset.labels, index),
      color: palette[index % palette.length],
    }));
  }
  return dataset.series.map((entry) => ({ key: entry.name, name: entry.name, color: entry.color }));
}

/** Removes series or categories turned off in the legend. */
function applyHidden(dataset: ChartDataset, hidden: Set<string>, palette: string[]): ChartDataset {
  if (hidden.size === 0) return dataset;
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return dataset;
    const values: number[] = [];
    const labels: string[] = [];
    const colors: string[] = [];
    first.values.forEach((value, index) => {
      const key = labelAt(dataset.labels, index);
      if (hidden.has(key)) return;
      values.push(value);
      labels.push(key);
      colors.push(palette[index % palette.length]);
    });
    return {
      series: [{ ...first, values, xs: null, color: colors[0] ?? first.color }],
      labels,
      categorical: true,
    };
  }
  return {
    series: dataset.series.filter((entry) => !hidden.has(entry.name)),
    labels: dataset.labels,
    categorical: false,
  };
}

// ---------------------------------------------------------------------------
// Scales
// ---------------------------------------------------------------------------

interface Scale {
  min: number;
  max: number;
  ticks: number[];
}

/** Nearest "round" number, basis of the classic tick algorithm. */
function niceNumber(range: number, round: boolean): number {
  const safe = Math.abs(range) || 1;
  const exponent = Math.floor(Math.log10(safe));
  const fraction = safe / Math.pow(10, exponent);
  let nice: number;
  if (round) {
    if (fraction < 1.5) nice = 1;
    else if (fraction < 3) nice = 2;
    else if (fraction < 7) nice = 5;
    else nice = 10;
  } else {
    if (fraction <= 1) nice = 1;
    else if (fraction <= 2) nice = 2;
    else if (fraction <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exponent);
}

/** Generates readable limits and marks for the value axis. */
function niceScale(min: number, max: number, count = 5): Scale {
  if (min === max) {
    const spread = Math.abs(min) || 1;
    return niceScale(min - spread * 0.5, max + spread * 0.5, count);
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(1, count - 1), true);
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(step)) + 2));
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = niceMin; value <= niceMax + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return { min: niceMin, max: niceMax, ticks };
}

/** Smallest and largest value in the set, considering stacking and zero baseline. */
function extentOf(
  dataset: ChartDataset,
  options: ChartOptions,
  stacked: boolean,
  baselineZero: boolean
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  if (stacked) {
    let length = 0;
    for (const entry of dataset.series) length = Math.max(length, entry.values.length);
    for (let i = 0; i < length; i++) {
      let positive = 0;
      let negative = 0;
      for (const entry of dataset.series) {
        const value = toNumber(entry.values[i]);
        if (value >= 0) positive += value;
        else negative += value;
      }
      min = Math.min(min, negative);
      max = Math.max(max, positive);
    }
  } else {
    for (const entry of dataset.series) {
      for (const value of entry.values) {
        if (!Number.isFinite(value)) continue;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (baselineZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (options.min !== undefined) min = options.min;
  if (options.max !== undefined) max = options.max;
  if (min === max) max = min + (Math.abs(min) || 1);
  return { min, max };
}

// ---------------------------------------------------------------------------
// SVG paths
// ---------------------------------------------------------------------------

type Point = [number, number];

/** Straight path connecting the points. */
function straightPath(points: Point[]): string {
  if (points.length === 0) return '';
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${r(points[i][0])} ${r(points[i][1])}`);
  }
  return parts.join(' ');
}

/** Smooth path via Catmull-Rom converted to cubic Bezier. */
function smoothPath(points: Point[]): string {
  if (points.length < 3) return straightPath(points);
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    parts.push(`C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(p2[0])} ${r(p2[1])}`);
  }
  return parts.join(' ');
}

function linePath(points: Point[], smooth: boolean): string {
  return smooth ? smoothPath(points) : straightPath(points);
}

function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

/** Pie or donut sector, depending on whether `inner` is zero or not. */
function arcPath(
  cx: number,
  cy: number,
  radius: number,
  inner: number,
  start: number,
  end: number
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, radius, start);
  const [x2, y2] = polar(cx, cy, radius, end);
  if (inner <= 0) {
    return `M ${r(cx)} ${r(cy)} L ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} Z`;
  }
  const [ix1, iy1] = polar(cx, cy, inner, start);
  const [ix2, iy2] = polar(cx, cy, inner, end);
  return (
    `M ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} ` +
    `L ${r(ix2)} ${r(iy2)} A ${r(inner)} ${r(inner)} 0 ${large} 0 ${r(ix1)} ${r(iy1)} Z`
  );
}

// ---------------------------------------------------------------------------
// Drawing context
// ---------------------------------------------------------------------------

interface HitInfo {
  x: number;
  y: number;
  title: string;
  rows: Array<{ name: string; color: string; value: number }>;
}

interface RenderContext {
  type: ChartType;
  options: ChartOptions;
  dataset: ChartDataset;
  palette: string[];
  width: number;
  height: number;
  animated: boolean;
  format: ChartFormat;
  hits: HitInfo[];
}

interface Frame {
  left: number;
  top: number;
  innerW: number;
  innerH: number;
  min: number;
  max: number;
  ticks: number[];
  /** Converts a value to vertical coordinate. */
  y(value: number): number;
  /** Grid and value axis labels. */
  grid: string;
}

const AXIS_FONT = 7;

function longestLabelWidth(texts: string[]): number {
  let longest = 0;
  for (const text of texts) longest = Math.max(longest, text.length);
  return longest * AXIS_FONT + 12;
}

/** Builds the usable area and horizontal grid of a Cartesian chart. */
function buildFrame(
  ctx: RenderContext,
  settings: { stacked: boolean; baselineZero: boolean; bare: boolean }
): Frame {
  const { options, dataset, width, height } = ctx;
  const extent = extentOf(dataset, options, settings.stacked, settings.baselineZero);
  const scale =
    options.min !== undefined && options.max !== undefined
      ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) }
      : niceScale(extent.min, extent.max, 5);

  const tickTexts = scale.ticks.map((tick) => formatChartValue(tick, ctx.format));
  const showGrid = options.showGrid !== false && !settings.bare;
  const hasLabels = dataset.labels.length > 0 && !settings.bare;

  const top = settings.bare ? 3 : 16;
  const right = settings.bare ? 3 : 16;
  const left = settings.bare ? 3 : showGrid ? clamp(longestLabelWidth(tickTexts), 32, 140) : 8;
  const bottom = settings.bare ? 3 : hasLabels ? 26 : 10;

  const innerW = Math.max(1, width - left - right);
  const innerH = Math.max(1, height - top - bottom);
  const span = scale.max - scale.min || 1;
  const y = (value: number): number => top + innerH * (1 - (value - scale.min) / span);

  let grid = '';
  if (showGrid) {
    const lines: string[] = [];
    scale.ticks.forEach((tick, index) => {
      const py = r(y(tick));
      lines.push(`<line class="v-chart-grid" x1="${r(left)}" y1="${py}" x2="${r(left + innerW)}" y2="${py}"/>`);
      lines.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${py + 4}" text-anchor="end">${escapeHtml(tickTexts[index])}</text>`
      );
    });
    grid = `<g>${lines.join('')}</g>`;
  }

  return { left, top, innerW, innerH, min: scale.min, max: scale.max, ticks: scale.ticks, y, grid };
}

/** Evenly spaced marks, used when `min` and `max` are explicit. */
function evenTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / Math.max(1, count - 1);
  const ticks: number[] = [];
  for (let i = 0; i < count; i++) ticks.push(Number((min + step * i).toFixed(6)));
  return ticks;
}

/** Category axis labels, skipping items when space is tight. */
function categoryAxis(
  labels: string[],
  count: number,
  xAt: (index: number) => number,
  baseline: number,
  innerW: number
): string {
  if (labels.length === 0 || count === 0) return '';
  const maxLabels = Math.max(1, Math.floor(innerW / 56));
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const parts: string[] = [];
  for (let i = 0; i < count; i += step) {
    const text = labels[i];
    if (text === undefined || text === '') continue;
    parts.push(
      `<text class="v-chart-axis" x="${r(xAt(i))}" y="${r(baseline)}" text-anchor="middle">${escapeHtml(text)}</text>`
    );
  }
  return parts.join('');
}

function seriesLength(dataset: ChartDataset): number {
  let length = dataset.labels.length;
  for (const entry of dataset.series) length = Math.max(length, entry.values.length);
  return length;
}

function emptyChart(ctx: RenderContext): string {
  return `<text class="v-chart-empty" x="${r(ctx.width / 2)}" y="${r(ctx.height / 2)}" text-anchor="middle">No data</text>`;
}

function titleTag(label: string, value: number, format: ChartFormat): string {
  return `<title>${escapeHtml(label)}: ${escapeHtml(formatChartValue(value, format))}</title>`;
}

/** Summary of an entire series, used in the `<title>` of lines. */
function seriesSummary(entry: ChartSeries, format: ChartFormat): string {
  if (entry.values.length === 0) return entry.name;
  let min = Infinity;
  let max = -Infinity;
  for (const value of entry.values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const first = entry.values[0];
  const last = entry.values[entry.values.length - 1];
  return (
    `${entry.name}: from ${formatChartValue(first, format)} to ${formatChartValue(last, format)}, ` +
    `minimum ${formatChartValue(min, format)}, maximum ${formatChartValue(max, format)}`
  );
}

// ---------------------------------------------------------------------------
// Line, area, and sparkline
// ---------------------------------------------------------------------------

function renderLine(ctx: RenderContext): string {
  const bare = ctx.type === 'sparkline';
  const filled = ctx.type === 'area';
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);

  const frame = buildFrame(ctx, { stacked: false, baselineZero: filled, bare });
  const xAt = (index: number): number =>
    count <= 1 ? frame.left + frame.innerW / 2 : frame.left + (frame.innerW * index) / (count - 1);

  const smooth = ctx.options.smooth === true;
  const parts: string[] = [frame.grid];
  const baseY = frame.y(clamp(0, frame.min, frame.max));

  for (const entry of ctx.dataset.series) {
    const points: Point[] = [];
    for (let i = 0; i < count; i++) points.push([xAt(i), frame.y(toNumber(entry.values[i]))]);
    if (points.length === 0) continue;

    const path = linePath(points, smooth);
    if (filled) {
      const area = `${path} L ${r(points[points.length - 1][0])} ${r(baseY)} L ${r(points[0][0])} ${r(baseY)} Z`;
      parts.push(`<path class="v-chart-area" d="${area}" fill="${escapeHtml(entry.color)}" fill-opacity="0.16"/>`);
    }
    const dash = ctx.animated ? ' pathLength="1" stroke-dasharray="1"' : '';
    // The `<title>` on the entire line ensures accessible reading even in
    // sparkline, which does not draw individual points.
    parts.push(
      `<path class="v-chart-line" d="${path}" stroke="${escapeHtml(entry.color)}"${dash}>` +
        `<title>${escapeHtml(seriesSummary(entry, ctx.format))}</title></path>`
    );

    if (!bare && count <= 40) {
      points.forEach((point, index) => {
        parts.push(
          `<circle class="v-chart-point" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` +
            titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(entry.values[index]), ctx.format) +
            '</circle>'
        );
      });
    }

    if (ctx.options.showValues && !bare) {
      points.forEach((point, index) => {
        parts.push(
          `<text class="v-chart-value" x="${r(point[0])}" y="${r(point[1] - 10)}" text-anchor="middle">${escapeHtml(formatChartValue(toNumber(entry.values[index]), ctx.format))}</text>`
        );
      });
    }
  }

  if (!bare) {
    parts.push(
      categoryAxis(ctx.dataset.labels, count, xAt, frame.top + frame.innerH + 18, frame.innerW)
    );
  }

  collectBandHits(ctx, count, xAt, (index) => {
    let top = Infinity;
    for (const entry of ctx.dataset.series) top = Math.min(top, frame.y(toNumber(entry.values[index])));
    return Number.isFinite(top) ? top : frame.top;
  });

  return parts.join('');
}

/** Registers a tooltip point per category, with all series together. */
function collectBandHits(
  ctx: RenderContext,
  count: number,
  xAt: (index: number) => number,
  yAt: (index: number) => number
): void {
  for (let i = 0; i < count; i++) {
    ctx.hits.push({
      x: xAt(i),
      y: yAt(i),
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i]),
      })),
    });
  }
}

// ---------------------------------------------------------------------------
// Vertical and stacked bars
// ---------------------------------------------------------------------------

function renderBars(ctx: RenderContext): string {
  const stacked = ctx.type === 'stacked';
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);

  const frame = buildFrame(ctx, { stacked, baselineZero: true, bare: false });
  const band = frame.innerW / count;
  const groups = stacked ? 1 : Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 18);
  const barW = Math.max(2, (band - gap) / groups);
  const baseY = frame.y(clamp(0, frame.min, frame.max));
  const radius = Math.min(4, barW / 2);

  const parts: string[] = [frame.grid];
  const bandCenter = (index: number): number => frame.left + band * index + band / 2;

  for (let i = 0; i < count; i++) {
    let positive = 0;
    let negative = 0;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber(entry.values[i]);
      let top: number;
      let bottom: number;
      let x: number;

      if (stacked) {
        const start = value >= 0 ? positive : negative;
        const end = start + value;
        if (value >= 0) positive = end;
        else negative = end;
        top = Math.min(frame.y(start), frame.y(end));
        bottom = Math.max(frame.y(start), frame.y(end));
        x = frame.left + band * i + gap / 2;
      } else {
        top = Math.min(frame.y(value), baseY);
        bottom = Math.max(frame.y(value), baseY);
        x = frame.left + band * i + gap / 2 + seriesIndex * barW;
      }

      const width = stacked ? Math.max(2, band - gap) : barW * 0.86;
      const height = Math.max(value === 0 ? 0 : 1, bottom - top);
      parts.push(
        `<rect class="v-chart-bar" x="${r(x)}" y="${r(top)}" width="${r(width)}" height="${r(height)}" rx="${r(radius)}" ` +
          `fill="${escapeHtml(entry.color)}" style="transform-origin:${r(x + width / 2)}px ${r(baseY)}px;transition-delay:${i * 30}ms">` +
          titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) +
          '</rect>'
      );

      if (ctx.options.showValues && !stacked) {
        parts.push(
          `<text class="v-chart-value" x="${r(x + width / 2)}" y="${r(top - 6)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });
  }

  parts.push(
    categoryAxis(ctx.dataset.labels, count, bandCenter, frame.top + frame.innerH + 18, frame.innerW)
  );

  collectBandHits(ctx, count, bandCenter, (index) => {
    if (stacked) {
      let total = 0;
      for (const entry of ctx.dataset.series) total += Math.max(0, toNumber(entry.values[index]));
      return frame.y(total);
    }
    let top = baseY;
    for (const entry of ctx.dataset.series) top = Math.min(top, frame.y(toNumber(entry.values[index])));
    return top;
  });

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Horizontal bars
// ---------------------------------------------------------------------------

function renderColumns(ctx: RenderContext): string {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);

  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const scale =
    ctx.options.min !== undefined && ctx.options.max !== undefined
      ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) }
      : niceScale(extent.min, extent.max, 5);

  const labelWidth = clamp(
    longestLabelWidth(ctx.dataset.labels.length > 0 ? ctx.dataset.labels : ['']),
    24,
    ctx.width * 0.4
  );
  const left = ctx.dataset.labels.length > 0 ? labelWidth : 12;
  const top = 12;
  const bottom = ctx.options.showGrid === false ? 12 : 26;
  const innerW = Math.max(1, ctx.width - left - 20);
  const innerH = Math.max(1, ctx.height - top - bottom);
  const span = scale.max - scale.min || 1;
  const x = (value: number): number => left + (innerW * (value - scale.min)) / span;
  const baseX = x(clamp(0, scale.min, scale.max));

  const band = innerH / count;
  const groups = Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 16);
  const barH = Math.max(2, (band - gap) / groups);

  const parts: string[] = [];

  if (ctx.options.showGrid !== false) {
    for (const tick of scale.ticks) {
      const px = r(x(tick));
      parts.push(`<line class="v-chart-grid" x1="${px}" y1="${r(top)}" x2="${px}" y2="${r(top + innerH)}"/>`);
      parts.push(
        `<text class="v-chart-axis" x="${px}" y="${r(top + innerH + 16)}" text-anchor="middle">${escapeHtml(formatChartValue(tick, ctx.format))}</text>`
      );
    }
  }

  for (let i = 0; i < count; i++) {
    const label = ctx.dataset.labels[i];
    if (label) {
      parts.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${r(top + band * i + band / 2 + 4)}" text-anchor="end">${escapeHtml(label)}</text>`
      );
    }
    let tipX = baseX;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber(entry.values[i]);
      const start = Math.min(x(value), baseX);
      tipX = Math.max(tipX, x(value));
      const width = Math.max(value === 0 ? 0 : 1, Math.abs(x(value) - baseX));
      const y = top + band * i + gap / 2 + seriesIndex * barH;
      parts.push(
        `<rect class="v-chart-barh" x="${r(start)}" y="${r(y)}" width="${r(width)}" height="${r(barH * 0.86)}" rx="${r(Math.min(4, barH / 2))}" ` +
          `fill="${escapeHtml(entry.color)}" style="transform-origin:${r(baseX)}px ${r(y + barH / 2)}px;transition-delay:${i * 30}ms">` +
          titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) +
          '</rect>'
      );
      if (ctx.options.showValues) {
        parts.push(
          `<text class="v-chart-value" x="${r(start + width + 6)}" y="${r(y + barH * 0.6)}">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });

    ctx.hits.push({
      x: tipX,
      y: top + band * i + band / 2,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i]),
      })),
    });
  }

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Pie and donut
// ---------------------------------------------------------------------------

function renderPie(ctx: RenderContext): string {
  const first = ctx.dataset.series[0];
  if (!first || first.values.length === 0) return emptyChart(ctx);

  const donut = ctx.type === 'donut';
  const values = first.values.map((value) => Math.max(0, toNumber(value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return emptyChart(ctx);

  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(12, Math.min(ctx.width, ctx.height) / 2 - 14);
  const inner = donut ? radius * 0.62 : 0;
  const origin = `transform-origin:${r(cx)}px ${r(cy)}px`;
  const parts: string[] = [];
  let angle = -Math.PI / 2;

  values.forEach((value, index) => {
    const sweep = (value / total) * Math.PI * 2;
    const color = ctx.palette[index % ctx.palette.length];
    const label = labelAt(ctx.dataset.labels, index);
    const full = sweep >= Math.PI * 2 - 1e-6;

    const shape = full
      ? donut
        ? `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r((radius + inner) / 2)}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${r(radius - inner)}" style="${origin}">`
        : `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${escapeHtml(color)}" style="${origin}">`
      : `<path class="v-chart-slice" data-hit="${index}" d="${arcPath(cx, cy, radius, inner, angle, angle + sweep)}" fill="${escapeHtml(color)}" style="${origin};transition-delay:${index * 45}ms">`;

    parts.push(`${shape}${titleTag(label, value, ctx.format)}${full ? '</circle>' : '</path>'}`);

    const mid = angle + sweep / 2;
    const [hx, hy] = polar(cx, cy, (radius + inner) / 2, mid);
    ctx.hits.push({
      x: hx,
      y: hy,
      title: label,
      rows: [{ name: label, color, value }],
    });

    if (ctx.options.showValues && sweep > 0.3) {
      const [tx, ty] = polar(cx, cy, donut ? (radius + inner) / 2 : radius * 0.68, mid);
      const share = Math.round((value / total) * 100);
      parts.push(
        `<text class="v-chart-value" x="${r(tx)}" y="${r(ty + 4)}" text-anchor="middle">${share}%</text>`
      );
    }

    angle += sweep;
  });

  if (donut) {
    parts.push(
      `<text class="v-chart-center" x="${r(cx)}" y="${r(cy + 2)}" text-anchor="middle">${escapeHtml(formatChartValue(total, ctx.format))}</text>`,
      `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 20)}" text-anchor="middle">Total</text>`
    );
  }

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Radar
// ---------------------------------------------------------------------------

function renderRadar(ctx: RenderContext): string {
  const axes = seriesLength(ctx.dataset);
  if (axes < 3) return emptyChart(ctx);

  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const max = extent.max || 1;
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(20, Math.min(ctx.width, ctx.height) / 2 - 28);
  const angleAt = (index: number): number => -Math.PI / 2 + (Math.PI * 2 * index) / axes;
  const parts: string[] = [];

  // Background web: rings and spokes.
  for (let ring = 1; ring <= 4; ring++) {
    const points: Point[] = [];
    for (let i = 0; i < axes; i++) points.push(polar(cx, cy, (radius * ring) / 4, angleAt(i)));
    parts.push(
      `<polygon class="v-chart-radar-web" points="${points.map((p) => `${r(p[0])},${r(p[1])}`).join(' ')}"/>`
    );
  }
  for (let i = 0; i < axes; i++) {
    const [ax, ay] = polar(cx, cy, radius, angleAt(i));
    parts.push(`<line class="v-chart-grid" x1="${r(cx)}" y1="${r(cy)}" x2="${r(ax)}" y2="${r(ay)}"/>`);
    const label = ctx.dataset.labels[i];
    if (label) {
      const [lx, ly] = polar(cx, cy, radius + 14, angleAt(i));
      const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
      parts.push(
        `<text class="v-chart-axis" x="${r(lx)}" y="${r(ly + 4)}" text-anchor="${anchor}">${escapeHtml(label)}</text>`
      );
    }
  }

  for (const entry of ctx.dataset.series) {
    const points: Point[] = [];
    for (let i = 0; i < axes; i++) {
      const value = clamp(toNumber(entry.values[i]) / max, 0, 1);
      points.push(polar(cx, cy, radius * value, angleAt(i)));
    }
    parts.push(
      `<polygon class="v-chart-radar-area v-chart-slice" points="${points.map((p) => `${r(p[0])},${r(p[1])}`).join(' ')}" ` +
        `fill="${escapeHtml(entry.color)}" fill-opacity="0.22" stroke="${escapeHtml(entry.color)}" style="transform-origin:${r(cx)}px ${r(cy)}px"/>`
    );
    points.forEach((point, index) => {
      parts.push(
        `<circle class="v-chart-point" data-hit="${index}" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` +
          titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(entry.values[index]), ctx.format) +
          '</circle>'
      );
    });
  }

  for (let i = 0; i < axes; i++) {
    const [hx, hy] = polar(cx, cy, radius * 0.7, angleAt(i));
    ctx.hits.push({
      x: hx,
      y: hy,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber(entry.values[i]),
      })),
    });
  }

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------

function renderScatter(ctx: RenderContext): string {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);

  const frame = buildFrame(ctx, { stacked: false, baselineZero: false, bare: false });

  let xMin = Infinity;
  let xMax = -Infinity;
  for (const entry of ctx.dataset.series) {
    const xs = entry.xs;
    if (!xs) continue;
    for (const value of xs) {
      xMin = Math.min(xMin, value);
      xMax = Math.max(xMax, value);
    }
  }
  const useOwnX = Number.isFinite(xMin) && Number.isFinite(xMax) && xMax > xMin;
  const xAt = (entry: ChartSeries, index: number): number => {
    if (useOwnX && entry.xs) {
      return frame.left + (frame.innerW * (entry.xs[index] - xMin)) / (xMax - xMin);
    }
    return count <= 1
      ? frame.left + frame.innerW / 2
      : frame.left + (frame.innerW * index) / (count - 1);
  };

  const parts: string[] = [frame.grid];
  let hitIndex = 0;

  for (const entry of ctx.dataset.series) {
    entry.values.forEach((value, index) => {
      const px = xAt(entry, index);
      const py = frame.y(toNumber(value));
      parts.push(
        `<circle class="v-chart-point v-chart-slice" data-hit="${hitIndex}" cx="${r(px)}" cy="${r(py)}" r="4.5" ` +
          `fill="${escapeHtml(entry.color)}" style="transform-origin:${r(px)}px ${r(py)}px">` +
          titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber(value), ctx.format) +
          '</circle>'
      );
      ctx.hits.push({
        x: px,
        y: py,
        title: labelAt(ctx.dataset.labels, index),
        rows: [{ name: entry.name, color: entry.color, value: toNumber(value) }],
      });
      hitIndex++;
    });
  }

  if (!useOwnX) {
    parts.push(
      categoryAxis(
        ctx.dataset.labels,
        count,
        (index) =>
          count <= 1
            ? frame.left + frame.innerW / 2
            : frame.left + (frame.innerW * index) / (count - 1),
        frame.top + frame.innerH + 18,
        frame.innerW
      )
    );
  }

  return parts.join('');
}

// ---------------------------------------------------------------------------
// Progress ring
// ---------------------------------------------------------------------------

function renderProgress(ctx: RenderContext): string {
  const first = ctx.dataset.series[0];
  const value = first ? toNumber(first.values[0]) : 0;
  const max = ctx.options.max ?? 100;
  const min = ctx.options.min ?? 0;
  const ratio = clamp((value - min) / (max - min || 1), 0, 1);

  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(16, Math.min(ctx.width, ctx.height) / 2 - 16);
  const stroke = Math.max(8, radius * 0.2);
  const ringRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - ratio);
  const color = ctx.palette[0];

  ctx.hits.push({
    x: cx,
    y: cy - ringRadius,
    title: first?.name ?? 'Progresso',
    rows: [{ name: first?.name ?? 'Progresso', color, value }],
  });

  return (
    `<circle class="v-chart-track" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" stroke-width="${r(stroke)}"/>` +
    `<circle class="v-chart-ring" data-hit="0" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" fill="none" ` +
    `stroke="${escapeHtml(color)}" stroke-width="${r(stroke)}" stroke-linecap="round" stroke-dasharray="${r(circumference)}" ` +
    `style="--v-ring-full:${r(circumference)};--v-ring-offset:${r(offset)};transform:rotate(-90deg);transform-origin:${r(cx)}px ${r(cy)}px">` +
    titleTag(first?.name ?? 'Progresso', value, ctx.format) +
    '</circle>' +
    `<text class="v-chart-center" x="${r(cx)}" y="${r(cy + 4)}" text-anchor="middle">${Math.round(ratio * 100)}%</text>` +
    (first
      ? `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 22)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
      : '')
  );
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const SHAPE_HIT = new Set<ChartType>(['pie', 'donut', 'scatter', 'progress', 'radar']);

function defaultHeight(type: ChartType): number {
  if (type === 'sparkline') return 56;
  if (type === 'pie' || type === 'donut' || type === 'progress' || type === 'radar') return 260;
  return 260;
}

function legendVisible(options: ChartOptions, dataset: ChartDataset): boolean {
  if (options.showLegend === false) return false;
  if (options.showLegend === true) return true;
  return dataset.categorical || dataset.series.length > 1;
}

const TYPE_NAMES: Record<ChartType, string> = {
  line: 'line',
  area: 'area',
  bar: 'bar',
  column: 'horizontal bar',
  stacked: 'stacked bar',
  pie: 'pie',
  donut: 'donut',
  sparkline: 'trend',
  radar: 'radar',
  scatter: 'scatter',
  progress: 'progress',
};

/** Generates the description read by screen readers from the data itself. */
function describe(type: ChartType, dataset: ChartDataset, format: ChartFormat): string {
  if (dataset.series.length === 0) return 'Chart with no data.';
  const plural = dataset.series.length === 1 ? 'series' : 'series';
  const parts = [`${TYPE_NAMES[type]} chart with ${dataset.series.length} ${plural}.`];
  for (const entry of dataset.series) {
    if (entry.values.length === 0) continue;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const value of entry.values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    const average = sum / entry.values.length;
    parts.push(
      `${entry.name}: ${entry.values.length} points, minimum ${formatChartValue(min, format)}, ` +
        `maximum ${formatChartValue(max, format)}, average ${formatChartValue(average, format)}.`
    );
  }
  return parts.join(' ');
}

function renderBody(ctx: RenderContext): string {
  switch (ctx.type) {
    case 'bar':
    case 'stacked':
      return renderBars(ctx);
    case 'column':
      return renderColumns(ctx);
    case 'pie':
    case 'donut':
      return renderPie(ctx);
    case 'radar':
      return renderRadar(ctx);
    case 'scatter':
      return renderScatter(ctx);
    case 'progress':
      return renderProgress(ctx);
    default:
      return renderLine(ctx);
  }
}

interface ChartState {
  el: HTMLElement;
  options: ChartOptions;
  hidden: Set<string>;
  hits: HitInfo[];
  /** When `true`, the tooltip comes from the shape under the cursor, not the position. */
  shapeHits: boolean;
  /** Axis compared to find the closest category to the cursor. */
  hitAxis: 'x' | 'y';
  viewWidth: number;
  viewHeight: number;
  lastWidth: number;
  observer: ResizeObserver | null;
  frame: number;
  teardown: Array<() => void>;
}

function legendHtml(items: LegendItem[], hidden: Set<string>): string {
  if (items.length === 0) return '';
  const buttons = items.map((item) => {
    const off = hidden.has(item.key);
    return (
      `<button type="button" class="v-chart-key" data-key="${escapeHtml(item.key)}" aria-pressed="${off ? 'false' : 'true'}">` +
      `<span class="v-chart-dot" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.name)}</button>`
    );
  });
  return `<div class="v-chart-legend">${buttons.join('')}</div>`;
}

function draw(state: ChartState): void {
  const el = state.el;
  const options = state.options;
  const type = options.type ?? 'line';
  const palette = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const format = options.format ?? 'number';

  const width = Math.max(160, Math.round(el.clientWidth || options.width || 640));
  // Height measured the same way width already was. Without this the SVG was
  // drawn at a fixed 260px no matter how tall the host element actually was, so
  // `<div v-chart style="height:150px">` overflowed its own box by 110px and
  // painted over whatever followed it. Three stacked charts drew on top of each
  // other. An explicit `height` option still wins; the element's own height is
  // the next best answer, and the per-type default is the last resort for a host
  // that has no height of its own.
  const height = Math.max(48, Math.round(options.height ?? (el.clientHeight || defaultHeight(type))));
  state.lastWidth = width;
  state.viewWidth = width;
  state.viewHeight = height;

  const full = normalize(options, type);
  const legend = buildLegend(full, palette);
  const dataset = applyHidden(full, state.hidden, palette);
  const animated = options.animate !== false && !prefersReducedMotion();

  state.hits = [];
  state.shapeHits = SHAPE_HIT.has(type);
  state.hitAxis = type === 'column' ? 'y' : 'x';

  const ctx: RenderContext = {
    type,
    options,
    dataset,
    palette,
    width,
    height,
    animated,
    format,
    hits: state.hits,
  };

  const body = renderBody(ctx);
  const label = describe(type, dataset, format);

  el.classList.add('v-chart');
  el.classList.toggle('v-chart-animate', animated);
  el.classList.remove('v-chart-in');

  const html = [
    `<svg class="v-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" `,
    `style="height:${height}px" role="img" aria-label="${escapeHtml(label)}">`,
    body,
    '</svg>',
  ];
  if (legendVisible(options, full)) html.push(legendHtml(legend, state.hidden));
  if (options.tooltip !== false) html.push('<div class="v-chart-tip" hidden></div>');
  el.innerHTML = html.join('');

  if (animated && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add('v-chart-in'));
    });
  }
}

// ---------------------------------------------------------------------------
// Interacao
// ---------------------------------------------------------------------------

function tooltipHtml(hit: HitInfo, format: ChartFormat): string {
  const rows = hit.rows.map(
    (row) =>
      `<div class="v-chart-tip-row"><span class="v-chart-dot" style="background:${escapeHtml(row.color)}"></span>` +
      `${escapeHtml(row.name)}<b>${escapeHtml(formatChartValue(row.value, format))}</b></div>`
  );
  return `<div class="v-chart-tip-title">${escapeHtml(hit.title)}</div>${rows.join('')}`;
}

function hideTooltip(state: ChartState): void {
  const tip = state.el.querySelector<HTMLElement>('.v-chart-tip');
  if (tip) tip.hidden = true;
}

function showTooltip(state: ChartState, event: PointerEvent): void {
  if (state.options.tooltip === false || state.hits.length === 0) return;
  const tip = state.el.querySelector<HTMLElement>('.v-chart-tip');
  const svg = state.el.querySelector('svg');
  if (!tip || !svg) return;

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  let hit: HitInfo | undefined;
  if (state.shapeHits) {
    const target = event.target as Element | null;
    const node = target && typeof target.closest === 'function' ? target.closest('[data-hit]') : null;
    const index = node ? Number(node.getAttribute('data-hit')) : -1;
    if (index >= 0) hit = state.hits[index];
  } else if (state.hitAxis === 'y') {
    const py = ((event.clientY - rect.top) / rect.height) * state.viewHeight;
    let best = Infinity;
    for (const candidate of state.hits) {
      const distance = Math.abs(candidate.y - py);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  } else {
    const px = ((event.clientX - rect.left) / rect.width) * state.viewWidth;
    let best = Infinity;
    for (const candidate of state.hits) {
      const distance = Math.abs(candidate.x - px);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  }

  if (!hit) {
    hideTooltip(state);
    return;
  }

  const container = state.el.getBoundingClientRect();
  tip.innerHTML = tooltipHtml(hit, state.options.format ?? 'number');
  tip.style.left = `${rect.left - container.left + (hit.x / state.viewWidth) * rect.width}px`;
  tip.style.top = `${rect.top - container.top + (hit.y / state.viewHeight) * rect.height}px`;
  tip.hidden = false;
}

function attachEvents(state: ChartState): void {
  const el = state.el;

  const onClick = (event: Event): void => {
    const target = event.target as Element | null;
    if (!target || typeof target.closest !== 'function') return;
    const key = target.closest('[data-key]')?.getAttribute('data-key');
    if (key === null || key === undefined) return;
    if (state.hidden.has(key)) state.hidden.delete(key);
    else state.hidden.add(key);
    draw(state);
  };
  const onMove = (event: Event): void => showTooltip(state, event as PointerEvent);
  const onLeave = (): void => hideTooltip(state);

  el.addEventListener('click', onClick);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);

  state.teardown.push(() => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  });
}

function observeResize(state: ChartState): void {
  if (typeof ResizeObserver === 'undefined') return;
  const observer = new ResizeObserver(() => {
    const width = Math.round(state.el.clientWidth);
    if (width === 0 || width === state.lastWidth) return;
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = requestAnimationFrame(() => {
      state.frame = 0;
      draw(state);
    });
  });
  observer.observe(state.el);
  state.observer = observer;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Draws a chart inside an element and returns instance control.
 *
 * ```js
 * const chart = V.renderChart(document.querySelector('#sales'), {
 *   type: 'area',
 *   data: [12, 19, 8, 25, 30],
 *   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
 *   smooth: true,
 * })
 * chart.update({ data: newData })
 * ```
 *
 * @param el container that receives the SVG. Previous content is replaced.
 * @param options type, data, and visual adjustments
 */
export function renderChart(el: HTMLElement, options: ChartOptions): ChartInstance {
  ensureTokens();
  injectStyle('charts', CSS);

  const state: ChartState = {
    el,
    options: { ...options },
    hidden: new Set<string>(),
    hits: [],
    shapeHits: false,
    hitAxis: 'x',
    viewWidth: 1,
    viewHeight: 1,
    lastWidth: 0,
    observer: null,
    frame: 0,
    teardown: [],
  };

  attachEvents(state);
  draw(state);
  observeResize(state);

  return {
    el,
    get options(): ChartOptions {
      return state.options;
    },
    update(next: Partial<ChartOptions>): void {
      Object.assign(state.options, next);
      draw(state);
    },
    destroy(): void {
      if (state.frame) cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.observer?.disconnect();
      state.observer = null;
      for (const off of state.teardown) off();
      state.teardown.length = 0;
      el.classList.remove('v-chart', 'v-chart-animate', 'v-chart-in');
      el.innerHTML = '';
    },
  };
}

// ---------------------------------------------------------------------------
// Directive v-chart
// ---------------------------------------------------------------------------

function readOption(el: Element, name: string): string | null {
  // Read from the runtime cache: this function runs inside the reactive effect, meaning
  // after the attributes have left the HTML.
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback;
  if (raw === '' || raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}

/**
 * Reads the expression and `v-chart-*` attributes and assembles the final options. The value
 * can be a complete options object or just the data.
 */
function directiveOptions(el: HTMLElement, value: unknown): ChartOptions {
  const isOptionsObject =
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'data' in (value as Record<string, unknown>);

  const options: ChartOptions = isOptionsObject
    ? { ...(value as ChartOptions) }
    : { data: (value ?? []) as ChartData };

  const type = readOption(el, 'chart-type');
  if (type) options.type = type as ChartType;
  if (!options.type) options.type = 'line';

  const height = readOption(el, 'chart-height');
  if (height) options.height = parseFloat(height) || options.height;

  const format = readOption(el, 'chart-format');
  if (format) options.format = format as ChartFormat;

  const colors = readOption(el, 'chart-colors');
  if (colors) {
    options.colors = colors
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean);
  }

  const max = readOption(el, 'chart-max');
  if (max !== null && max !== '') options.max = parseFloat(max);
  const min = readOption(el, 'chart-min');
  if (min !== null && min !== '') options.min = parseFloat(min);

  const smooth = readOption(el, 'chart-smooth');
  if (smooth !== null) options.smooth = parseBool(smooth, true);
  const grid = readOption(el, 'chart-grid');
  if (grid !== null) options.showGrid = parseBool(grid, true);
  const legend = readOption(el, 'chart-legend');
  if (legend !== null) options.showLegend = parseBool(legend, true);
  const values = readOption(el, 'chart-values');
  if (values !== null) options.showValues = parseBool(values, true);
  const tooltip = readOption(el, 'chart-tooltip');
  if (tooltip !== null) options.tooltip = parseBool(tooltip, true);
  const animateAttr = readOption(el, 'chart-animate');
  if (animateAttr !== null) options.animate = parseBool(animateAttr, true);

  return options;
}

/**
 * Walks the entire structure so the reactive effect subscribes to each value.
 * Without this, changing a number inside an array would not redraw the chart.
 *
 * @returns how many values were read, useful for debugging
 */
function touchDeep(value: unknown, depth = 0): number {
  if (!value || typeof value !== 'object' || depth > 3) return 1;
  let count = 0;
  if (Array.isArray(value)) {
    for (const item of value) count += touchDeep(item, depth + 1);
    return count;
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    count += touchDeep(item, depth + 1);
  }
  return count;
}

/**
 * `v-chart="{ type: 'line', data: sales }"` or `v-chart="sales"` combined
 * with `v-chart-type="bar"`. Redraws automatically when state data changes.
 */
defineDirective('chart', ({ el, evaluate, effect, cleanup }) => {
  let instance: ChartInstance | null = null;

  effect(() => {
    const value = evaluate<unknown>();
    touchDeep(value);
    const options = directiveOptions(el, value);
    if (instance) instance.update(options);
    else instance = renderChart(el, options);
  });

  cleanup(() => {
    instance?.destroy();
    instance = null;
  });
});

/** Everything from the module gathered, to expose as `V.charts`. */
export const charts = {
  render: renderChart,
  format: formatChartValue,
  colors: CHART_COLORS,
};
