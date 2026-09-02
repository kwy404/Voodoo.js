/**
 * @module devtools/xray
 *
 * Visual reactivity inspector for Voodoo. Runs inside the page itself, without
 * browser extension or server.
 *
 * When enabled, it outlines every element with directives, shows a card with
 * that element's scope, opens a panel with tabs for state, components, stores,
 * events, network and performance, and flashes the element every time a
 * reactive effect writes to it. That's the x-ray effect: you can see reactivity
 * happening.
 *
 * ```js
 * V.xray()            // toggle
 * V.xray(true)        // force enable
 * ```
 *
 * The module registers nothing when imported. No listeners, no styles, and no
 * timers exist before the first call, so it's tree-shakeable and costs nothing
 * in production.
 */

import type { EffectScope, ReactiveEffect } from '../reactivity';
import { config } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import {
  collectDirectives,
  findScope,
  getEffectScopes,
  getScope,
  hadDirectives,
} from '../runtime/walker';
import { instances, type ComponentInstance } from '../runtime/component';
import { allStores, storeNames } from '../store';
import { ensureTokens, injectStyle } from '../dom/style';
import { http, type HttpError } from '../http';
import { truncate } from '../utils';
import { devtoolsBus } from './bus';

export { devtoolsBus } from './bus';
export type {
  DevtoolsBus,
  DevtoolsDomEvent,
  DevtoolsEventMap,
  DevtoolsEventType,
  DevtoolsLocaleEvent,
  DevtoolsNavigationEvent,
  DevtoolsNetworkEvent,
  DevtoolsUpdateEvent,
} from './bus';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type TabName = 'estado' | 'componentes' | 'stores' | 'eventos' | 'rede' | 'desempenho';

interface EventEntry {
  at: number;
  type: string;
  target: string;
  detail: string;
  source: string;
}

interface NetworkEntry {
  at: number;
  method: string;
  url: string;
  status: number;
  ok: boolean;
  duration: number;
  source: string;
}

interface PanelRefs {
  root: HTMLElement;
  overlay: HTMLElement;
  card: HTMLElement;
  panel: HTMLElement;
  tabs: HTMLElement;
  body: HTMLElement;
  status: HTMLElement;
}

interface ScopeEntry {
  el: Element;
  scope: Scope;
  depth: number;
}

// ---------------------------------------------------------------------------
// Inspector state
// ---------------------------------------------------------------------------

const FLASH_CLASS = 'v-xray-flash';
const MAX_LOG = 200;
const MAX_OUTLINES = 400;

let enabled = false;
let shortcutInstalled = false;
let refs: PanelRefs | null = null;
let activeTab: TabName = 'estado';
let theme: 'light' | 'dark' | 'auto' = 'auto';

const eventLog: EventEntry[] = [];
const networkLog: NetworkEntry[] = [];
const patchedEffects = /* @__PURE__ */ new Map<ReactiveEffect, () => unknown>();
const flashing = /* @__PURE__ */ new Set<Element>();
const flashTimers = /* @__PURE__ */ new Map<Element, number>();
const outlined: Array<{ el: Element; box: HTMLElement }> = [];
const requestStarts = /* @__PURE__ */ new WeakMap<object, number>();

const metrics = {
  effects: 0,
  mutations: 0,
  effectsPerSecond: 0,
  updatesPerSecond: 0,
  history: [] as Array<{ effects: number; updates: number }>,
};

const disposers: Array<() => void> = [];
let refreshTimer = 0;
let metricsTimer = 0;
let scanTimer = 0;
let frameRequest = 0;
let hoverTarget: Element | null = null;

// ---------------------------------------------------------------------------
// Panel CSS
// ---------------------------------------------------------------------------

const XRAY_CSS = `
.v-xray-root{
  all: initial;
  --vx-accent:#6D3BF5;
  --vx-accent-2:#FF3D8B;
  --vx-bg:#ffffff;
  --vx-bg-2:#F6F3FC;
  --vx-text:#14111F;
  --vx-muted:#6B6580;
  --vx-border:#E6E0F0;
  --vx-shadow:0 12px 40px rgba(20,17,31,.22);
  position:fixed;
  inset:0;
  z-index:2147483000;
  pointer-events:none;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1.45;
  color:var(--vx-text);
  -webkit-font-smoothing:antialiased;
}
@media (prefers-color-scheme: dark){
  .v-xray-root:not([data-v-xray-theme="light"]){
    --vx-bg:#1C1830;
    --vx-bg-2:#14111F;
    --vx-text:#F4F1FB;
    --vx-muted:#A9A2C4;
    --vx-border:#332C50;
    --vx-shadow:0 12px 40px rgba(0,0,0,.55);
  }
}
.v-xray-root[data-v-xray-theme="dark"]{
  --vx-bg:#1C1830;
  --vx-bg-2:#14111F;
  --vx-text:#F4F1FB;
  --vx-muted:#A9A2C4;
  --vx-border:#332C50;
  --vx-shadow:0 12px 40px rgba(0,0,0,.55);
}
.v-xray-root *,.v-xray-root *::before,.v-xray-root *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  outline:0;
  background:transparent;
  font:inherit;
  color:inherit;
  text-align:left;
  text-transform:none;
  letter-spacing:normal;
  list-style:none;
  text-decoration:none;
  min-width:0;
  float:none;
}
.v-xray-box{
  position:absolute;
  border:1px dashed rgba(109,59,245,.85);
  border-radius:4px;
  background:rgba(109,59,245,.06);
  pointer-events:none;
}
.v-xray-box[data-kind="component"]{
  border-color:rgba(46,217,165,.9);
  background:rgba(46,217,165,.07);
}
.v-xray-tag{
  position:absolute;
  top:-16px;
  left:-1px;
  max-width:280px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  padding:1px 5px;
  border-radius:4px;
  background:#6D3BF5;
  color:#fff;
  font-size:10px;
  font-weight:600;
}
.v-xray-box[data-kind="component"] .v-xray-tag{background:#159C77}
.v-xray-card{
  position:absolute;
  display:none;
  width:320px;
  max-height:60vh;
  overflow:auto;
  padding:10px 12px;
  border:1px solid var(--vx-border);
  border-radius:10px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:none;
}
.v-xray-card[data-open="1"]{display:block}
.v-xray-card-title{
  display:block;
  margin-bottom:6px;
  font-size:12px;
  font-weight:700;
  color:var(--vx-accent);
}
.v-xray-section{
  display:block;
  margin-top:8px;
  padding-top:6px;
  border-top:1px solid var(--vx-border);
  font-size:10px;
  font-weight:700;
  text-transform:uppercase;
  color:var(--vx-muted);
}
.v-xray-panel{
  position:absolute;
  right:16px;
  bottom:16px;
  display:flex;
  flex-direction:column;
  width:400px;
  max-width:calc(100vw - 32px);
  max-height:70vh;
  border:1px solid var(--vx-border);
  border-radius:12px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:auto;
  overflow:hidden;
}
.v-xray-header{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border-bottom:1px solid var(--vx-border);
  background:var(--vx-bg-2);
}
.v-xray-brand{
  flex:1;
  font-size:12px;
  font-weight:700;
  letter-spacing:.02em;
}
.v-xray-dot{
  display:inline-block;
  width:8px;
  height:8px;
  margin-right:6px;
  border-radius:50%;
  background:linear-gradient(135deg,#6D3BF5,#FF3D8B);
}
.v-xray-btn{
  padding:3px 8px;
  border:1px solid var(--vx-border);
  border-radius:6px;
  background:var(--vx-bg);
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-btn:hover{color:var(--vx-text);border-color:var(--vx-accent)}
.v-xray-tabs{
  display:flex;
  flex-wrap:wrap;
  gap:2px;
  padding:6px 8px;
  border-bottom:1px solid var(--vx-border);
}
.v-xray-tab{
  padding:3px 8px;
  border-radius:99px;
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-tab:hover{color:var(--vx-text)}
.v-xray-tab[data-active="1"]{
  background:var(--vx-accent);
  color:#fff;
  font-weight:600;
}
.v-xray-body{
  flex:1;
  overflow:auto;
  padding:8px 10px 12px;
}
.v-xray-status{
  padding:5px 10px;
  border-top:1px solid var(--vx-border);
  background:var(--vx-bg-2);
  color:var(--vx-muted);
  font-size:10px;
}
.v-xray-group{
  display:block;
  margin-bottom:8px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  overflow:hidden;
}
.v-xray-group-head{
  display:flex;
  align-items:center;
  gap:6px;
  padding:5px 8px;
  background:var(--vx-bg-2);
  font-size:11px;
  font-weight:600;
  cursor:pointer;
}
.v-xray-badge{
  padding:0 5px;
  border-radius:99px;
  background:var(--vx-accent);
  color:#fff;
  font-size:9px;
  font-weight:700;
}
.v-xray-badge[data-tone="alt"]{background:var(--vx-accent-2)}
.v-xray-badge[data-tone="mute"]{background:var(--vx-muted)}
.v-xray-rows{display:block;padding:4px 8px 6px}
.v-xray-row{
  display:flex;
  align-items:center;
  gap:6px;
  padding:2px 0;
}
.v-xray-key{
  flex:0 0 38%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:var(--vx-muted);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-val{
  flex:1;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-input{
  flex:1;
  padding:2px 5px;
  border:1px solid var(--vx-border);
  border-radius:5px;
  background:var(--vx-bg-2);
  color:var(--vx-text);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
  cursor:text;
}
.v-xray-input:focus{border-color:var(--vx-accent)}
.v-xray-input[data-error="1"]{border-color:#FF4D4D}
.v-xray-empty{
  display:block;
  padding:14px 4px;
  color:var(--vx-muted);
  text-align:center;
}
.v-xray-log{
  display:flex;
  gap:6px;
  padding:3px 4px;
  border-bottom:1px solid var(--vx-border);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;
}
.v-xray-log-time{flex:0 0 58px;color:var(--vx-muted)}
.v-xray-log-main{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-xray-ok{color:#159C77}
.v-xray-fail{color:#FF4D4D}
.v-xray-metric{
  display:flex;
  align-items:baseline;
  gap:8px;
  padding:4px 0;
}
.v-xray-metric-value{font-size:20px;font-weight:700;color:var(--vx-accent)}
.v-xray-chart{
  display:flex;
  align-items:flex-end;
  gap:2px;
  height:56px;
  margin-top:8px;
  padding:4px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  background:var(--vx-bg-2);
}
.v-xray-bar{
  flex:1;
  min-height:2px;
  border-radius:2px 2px 0 0;
  background:linear-gradient(180deg,#FF3D8B,#6D3BF5);
}
.v-xray-hint{display:block;margin-top:6px;color:var(--vx-muted);font-size:10px}
@keyframes v-xray-pulse{
  0%{box-shadow:0 0 0 2px rgba(255,61,139,.95),0 0 16px rgba(255,61,139,.5)}
  100%{box-shadow:0 0 0 2px rgba(255,61,139,0),0 0 0 rgba(255,61,139,0)}
}
.${FLASH_CLASS}{animation:v-xray-pulse .45s ease-out}
@media (prefers-reduced-motion: reduce){
  .${FLASH_CLASS}{animation:none;outline:2px solid rgba(255,61,139,.9)}
}
@media (max-width: 640px){
  .v-xray-panel{right:8px;left:8px;width:auto;max-height:60vh}
}
`;

// ---------------------------------------------------------------------------
// DOM utilities
// ---------------------------------------------------------------------------

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** `true` when the node is part of the inspector itself. */
function isXrayNode(node: Node | null): boolean {
  if (!node || !refs) return false;
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !!el && refs.root.contains(el);
}

/** Short description of an element, formatted like `div.card#top`. */
function describeElement(el: Element | null): string {
  if (!el) return '(no element)';
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className
    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : '';
  return `${tag}${id}${cls}`;
}

/** Short text to display any value without breaking the panel. */
function preview(value: unknown, max = 64): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const type = typeof value;
  if (type === 'function') return 'function()';
  if (type === 'string') return `"${truncate(value as string, max)}"`;
  if (type === 'number' || type === 'boolean') return String(value);
  if (type === 'symbol') return String(value);
  if (typeof Element !== 'undefined' && value instanceof Element) {
    return `<${(value as Element).tagName.toLowerCase()}>`;
  }
  try {
    return truncate(JSON.stringify(value) ?? String(value), max);
  } catch {
    return String(value);
  }
}

/** Value shown inside the editable field. */
function editable(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

/** Converts text typed in the panel back to a value. */
function parseEdited(raw: string, previous: unknown): unknown {
  if (typeof previous === 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function timeLabel(at: number): string {
  const date = new Date(at);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// ---------------------------------------------------------------------------
// Effects: counting and instrumentation
// ---------------------------------------------------------------------------

function collectEffects(scope: EffectScope, out: ReactiveEffect[]): void {
  for (const item of scope.effects) out.push(item);
  for (const child of scope.children) collectEffects(child, out);
}

/** Reactive effects bound to a node, including those from child scopes. */
function effectsOf(node: Node): ReactiveEffect[] {
  const out: ReactiveEffect[] = [];
  for (const scope of getEffectScopes(node)) collectEffects(scope, out);
  return out;
}

/**
 * How many reactive effects depend on an element. Counts effects from the
 * element's own directives and from text interpolations in direct children.
 */
export function countEffects(el: Element): number {
  let total = effectsOf(el).length;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) total += effectsOf(child).length;
  }
  return total;
}

/** Makes the element flash, making the reactive update visible. */
function flash(el: Element | null): void {
  if (!el || !enabled || isXrayNode(el)) return;
  const previous = flashTimers.get(el);
  if (previous) window.clearTimeout(previous);

  flashing.add(el);
  el.classList.add(FLASH_CLASS);

  const timer = window.setTimeout(() => {
    el.classList.remove(FLASH_CLASS);
    flashTimers.delete(el);
    // Leaves the set only in the next cycle, so the observer ignores the removal.
    window.setTimeout(() => flashing.delete(el), 0);
  }, 460);
  flashTimers.set(el, timer);
}

/**
 * Wraps each effect's function on a node to count executions and flash the
 * corresponding element. The original function is saved and returned when the
 * inspector is disabled.
 */
function instrument(node: Node, owner: Element): void {
  for (const item of effectsOf(node)) {
    if (patchedEffects.has(item)) continue;
    const original = item.fn;
    patchedEffects.set(item, original);
    item.fn = (): unknown => {
      metrics.effects++;
      flash(owner);
      return original();
    };
  }
}

function restoreEffects(): void {
  for (const [item, original] of patchedEffects) item.fn = original;
  patchedEffects.clear();
}

/** Scans the page instrumenting new effects and cleaning up dead ones. */
function scanDocument(): void {
  if (!enabled || typeof document === 'undefined') return;

  for (const [item] of patchedEffects) {
    if (!item.active) patchedEffects.delete(item);
  }

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );
  let node: Node | null = walker.currentNode;
  while (node) {
    if (node.nodeType === 1) {
      const el = node as Element;
      if (refs && refs.root.contains(el)) {
        // Don't inspect the inspector itself.
        node = skipSubtree(walker);
        continue;
      }
      instrument(el, el);
    } else if (node.nodeType === 3 && node.parentElement) {
      instrument(node, node.parentElement);
    }
    node = walker.nextNode();
  }

  refreshOutlines();
}

/** Skips the current subtree in the TreeWalker and returns the next node. */
function skipSubtree(walker: TreeWalker): Node | null {
  const current = walker.currentNode;
  let next = walker.nextSibling();
  if (next) return next;
  let parent = walker.parentNode();
  while (parent) {
    next = walker.nextSibling();
    if (next) return next;
    parent = walker.parentNode();
  }
  walker.currentNode = current;
  return null;
}

// ---------------------------------------------------------------------------
// Outlines
// ---------------------------------------------------------------------------

/** Lists inspectable elements: those that declare some directive. */
function inspectableElements(): Element[] {
  const out: Element[] = [];
  const all = document.body.querySelectorAll('*');
  for (let i = 0; i < all.length && out.length < MAX_OUTLINES; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    // `hadDirectives` not `hasDirectives`: with attribute cleanup enabled,
    // the HTML no longer has the `v-*`, and only the cache knows who had them.
    if (!hadDirectives(el)) continue;
    out.push(el);
  }
  return out;
}

/** Names of directives declared on an element, without prefix. */
function directiveNames(el: Element): string[] {
  return collectDirectives(el).map((attr) =>
    attr.arg ? `${attr.name}:${attr.arg}` : attr.name
  );
}

/** Recreates outline boxes from the current DOM. */
function refreshOutlines(): void {
  if (!enabled || !refs) return;
  const overlay = refs.overlay;
  overlay.textContent = '';
  outlined.length = 0;

  for (const el of inspectableElements()) {
    const box = h('div', 'v-xray-box');
    const isComponent = !!getScope(el)?.component;
    box.dataset.kind = isComponent ? 'component' : 'directive';
    const label = h('span', 'v-xray-tag', directiveNames(el).join(' '));
    box.appendChild(label);
    overlay.appendChild(box);
    outlined.push({ el, box });
  }

  positionOutlines();
}

/** Repositions boxes over elements. Called on scroll and resize. */
function positionOutlines(): void {
  if (!enabled) return;
  for (const item of outlined) {
    if (!item.el.isConnected) {
      item.box.style.display = 'none';
      continue;
    }
    const rect = item.el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      item.box.style.display = 'none';
      continue;
    }
    item.box.style.display = 'block';
    item.box.style.left = `${rect.left}px`;
    item.box.style.top = `${rect.top}px`;
    item.box.style.width = `${rect.width}px`;
    item.box.style.height = `${rect.height}px`;
  }
}

function scheduleReposition(): void {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = 0;
    positionOutlines();
  });
}

// ---------------------------------------------------------------------------
// Inspection card
// ---------------------------------------------------------------------------

/** Variables visible in a scope, walking the entire chain to the root. */
function visibleVariables(scope: Scope, limit = 40): Array<[string, unknown]> {
  const seen = new Set<string>();
  const out: Array<[string, unknown]> = [];
  let current: Scope | null = scope;

  while (current && out.length < limit) {
    let keys: string[] = [];
    try {
      keys = Object.keys(current.data);
    } catch {
      keys = [];
    }
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      let value: unknown;
      try {
        value = current.data[key];
      } catch {
        value = '(read error)';
      }
      out.push([key, value]);
      if (out.length >= limit) break;
    }
    current = current.parent;
  }

  return out;
}

function buildCard(el: Element): void {
  if (!refs) return;
  const card = refs.card;
  card.textContent = '';

  const scope = findScope(el);
  const owner = scope.owner?.component as ComponentInstance | undefined;

  card.appendChild(h('strong', 'v-xray-card-title', describeElement(el)));

  card.appendChild(h('span', 'v-xray-section', 'Directives'));
  const names = collectDirectives(el);
  if (!names.length) {
    card.appendChild(h('div', 'v-xray-val', 'none'));
  } else {
    for (const attr of names) {
      const row = h('div', 'v-xray-row');
      row.appendChild(h('span', 'v-xray-key', attr.raw));
      row.appendChild(h('span', 'v-xray-val', attr.expression || '(no value)'));
      card.appendChild(row);
    }
  }

  card.appendChild(h('span', 'v-xray-section', 'Component'));
  card.appendChild(
    h('div', 'v-xray-val', owner ? `${owner.$name} in ${describeElement(owner.$el)}` : 'none')
  );

  card.appendChild(h('span', 'v-xray-section', 'Scope'));
  const variables = visibleVariables(scope);
  if (!variables.length) {
    card.appendChild(h('div', 'v-xray-val', 'root scope empty'));
  } else {
    for (const [key, value] of variables) {
      const row = h('div', 'v-xray-row');
      row.appendChild(h('span', 'v-xray-key', key));
      row.appendChild(h('span', 'v-xray-val', preview(value)));
      card.appendChild(row);
    }
  }

  card.appendChild(h('span', 'v-xray-section', 'Reactivity'));
  card.appendChild(
    h('div', 'v-xray-val', `${countEffects(el)} effect(s) depend on this element`)
  );
}

function positionCard(x: number, y: number): void {
  if (!refs) return;
  const card = refs.card;
  const width = 320;
  const height = Math.min(card.scrollHeight || 200, window.innerHeight * 0.6);
  const left = x + 16 + width > window.innerWidth ? Math.max(8, x - width - 16) : x + 16;
  const top = y + 16 + height > window.innerHeight ? Math.max(8, y - height - 16) : y + 16;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function onPointerMove(event: MouseEvent): void {
  if (!enabled || !refs) return;
  const target = event.target as Element | null;
  if (!target || isXrayNode(target)) {
    refs.card.dataset.open = '0';
    hoverTarget = null;
    return;
  }

  let candidate: Element | null = target;
  while (candidate && candidate !== document.body && !hadDirectives(candidate)) {
    candidate = candidate.parentElement;
  }
  if (!candidate || candidate === document.body) {
    refs.card.dataset.open = '0';
    hoverTarget = null;
    return;
  }

  if (candidate !== hoverTarget) {
    hoverTarget = candidate;
    buildCard(candidate);
  }
  refs.card.dataset.open = '1';
  positionCard(event.clientX, event.clientY);
}

// ---------------------------------------------------------------------------
// State tab
// ---------------------------------------------------------------------------

/** All scopes present on the page, in document order. */
function collectScopes(): ScopeEntry[] {
  const owners = new Map<Element, Scope>();
  const all = document.body.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    const scope = getScope(el);
    if (scope) owners.set(el, scope);
  }

  const out: ScopeEntry[] = [];
  for (const [el, scope] of owners) {
    let depth = 0;
    let parent = el.parentElement;
    while (parent) {
      if (owners.has(parent)) depth++;
      parent = parent.parentElement;
    }
    out.push({ el, scope, depth });
  }
  return out;
}

/** Key-value row, editable when the value is simple. */
function valueRow(
  key: string,
  value: unknown,
  commit: (next: unknown) => void
): HTMLElement {
  const row = h('div', 'v-xray-row');
  row.appendChild(h('span', 'v-xray-key', key));

  if (typeof value === 'function') {
    row.appendChild(h('span', 'v-xray-val', 'function()'));
    return row;
  }

  const input = h('input', 'v-xray-input');
  input.type = 'text';
  input.value = editable(value);
  input.spellcheck = false;
  input.addEventListener('change', () => {
    try {
      commit(parseEdited(input.value, value));
      input.dataset.error = '0';
    } catch {
      input.dataset.error = '1';
    }
  });
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') input.blur();
  });
  row.appendChild(input);
  return row;
}

function renderStateTab(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const scopes = collectScopes();

  if (!scopes.length) {
    frag.appendChild(h('span', 'v-xray-empty', 'No scopes on the page. Use v-data or a component.'));
    return frag;
  }

  for (const entry of scopes) {
    const group = h('div', 'v-xray-group');
    group.style.marginLeft = `${Math.min(entry.depth, 4) * 8}px`;

    const head = h('div', 'v-xray-group-head');
    head.appendChild(h('span', 'v-xray-badge', entry.scope.component ? 'component' : 'scope'));
    head.appendChild(h('span', undefined, describeElement(entry.el)));
    head.addEventListener('click', () => highlight(entry.el));
    group.appendChild(head);

    const rows = h('div', 'v-xray-rows');
    let keys: string[] = [];
    try {
      keys = Object.keys(entry.scope.data);
    } catch {
      keys = [];
    }

    if (!keys.length) {
      rows.appendChild(h('span', 'v-xray-empty', 'no variables'));
    } else {
      for (const key of keys) {
        let value: unknown;
        try {
          value = entry.scope.data[key];
        } catch {
          value = undefined;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            entry.scope.set(key, next);
          })
        );
      }
    }

    group.appendChild(rows);
    frag.appendChild(group);
  }

  return frag;
}

// ---------------------------------------------------------------------------
// Components tab
// ---------------------------------------------------------------------------

function renderComponentsTab(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const list = [...instances];

  if (!list.length) {
    frag.appendChild(h('span', 'v-xray-empty', 'No components mounted.'));
    return frag;
  }

  for (const instance of list) {
    const group = h('div', 'v-xray-group');
    const head = h('div', 'v-xray-group-head');
    head.appendChild(h('span', 'v-xray-badge', instance.$name));
    head.appendChild(h('span', undefined, describeElement(instance.$el)));
    head.appendChild(
      h('span', 'v-xray-badge', `${countEffects(instance.$el)} effects`)
    );
    (head.lastChild as HTMLElement).dataset.tone = 'mute';
    head.addEventListener('click', () => highlight(instance.$el));
    group.appendChild(head);

    const rows = h('div', 'v-xray-rows');
    const props = instance.$props ?? {};
    const propKeys = Object.keys(props);
    if (propKeys.length) {
      rows.appendChild(h('span', 'v-xray-section', 'Props'));
      for (const key of propKeys) {
        rows.appendChild(
          valueRow(key, props[key], (next) => {
            props[key] = next;
          })
        );
      }
    }

    const scope = instance.$scope;
    let stateKeys: string[] = [];
    try {
      stateKeys = Object.keys(scope.data).filter((key) => !propKeys.includes(key));
    } catch {
      stateKeys = [];
    }
    if (stateKeys.length) {
      rows.appendChild(h('span', 'v-xray-section', 'State'));
      for (const key of stateKeys) {
        let value: unknown;
        try {
          value = scope.data[key];
        } catch {
          value = undefined;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            scope.set(key, next);
          })
        );
      }
    }

    group.appendChild(rows);
    frag.appendChild(group);
  }

  return frag;
}

// ---------------------------------------------------------------------------
// Stores tab
// ---------------------------------------------------------------------------

function renderStoresTab(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const names = storeNames();

  if (!names.length) {
    frag.appendChild(h('span', 'v-xray-empty', 'No global stores. Create one with V.store().'));
    return frag;
  }

  for (const name of names) {
    const data = allStores[name];
    const group = h('div', 'v-xray-group');
    const head = h('div', 'v-xray-group-head');
    head.appendChild(h('span', 'v-xray-badge', 'store'));
    (head.firstChild as HTMLElement).dataset.tone = 'alt';
    head.appendChild(h('span', undefined, name));
    group.appendChild(head);

    const rows = h('div', 'v-xray-rows');
    const keys = data ? Object.keys(data) : [];
    if (!keys.length) {
      rows.appendChild(h('span', 'v-xray-empty', 'empty store'));
    } else {
      for (const key of keys) {
        rows.appendChild(
          valueRow(key, data[key], (next) => {
            data[key] = next;
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }

  return frag;
}

// ---------------------------------------------------------------------------
// Log tabs: Events and Network
// ---------------------------------------------------------------------------

function logLine(time: string, main: string, tail?: string, tone?: 'ok' | 'fail'): HTMLElement {
  const row = h('div', 'v-xray-log');
  row.appendChild(h('span', 'v-xray-log-time', time));
  row.appendChild(h('span', 'v-xray-log-main', main));
  if (tail !== undefined) {
    const badge = h('span', tone === 'fail' ? 'v-xray-fail' : tone === 'ok' ? 'v-xray-ok' : undefined, tail);
    row.appendChild(badge);
  }
  return row;
}

function renderEventsTab(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const clear = h('button', 'v-xray-btn', 'clear log');
  clear.addEventListener('click', () => {
    eventLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);

  if (!eventLog.length) {
    frag.appendChild(h('span', 'v-xray-empty', 'No events yet. Interact with the page.'));
    return frag;
  }

  for (const entry of [...eventLog].reverse()) {
    frag.appendChild(
      logLine(timeLabel(entry.at), `${entry.type} on ${entry.target}`, entry.detail || entry.source)
    );
  }
  return frag;
}

function renderNetworkTab(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const clear = h('button', 'v-xray-btn', 'clear log');
  clear.addEventListener('click', () => {
    networkLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);

  if (!networkLog.length) {
    frag.appendChild(
      h('span', 'v-xray-empty', 'No requests yet. v-get, v-post and V.http show up here.')
    );
    return frag;
  }

  for (const entry of [...networkLog].reverse()) {
    frag.appendChild(
      logLine(
        timeLabel(entry.at),
        `${entry.method} ${entry.url}`,
        `${entry.status || '---'} ${Math.round(entry.duration)}ms`,
        entry.ok ? 'ok' : 'fail'
      )
    );
  }
  return frag;
}

// ---------------------------------------------------------------------------
// Performance tab
// ---------------------------------------------------------------------------

function renderPerformanceTab(): DocumentFragment {
  const frag = document.createDocumentFragment();

  const updates = h('div', 'v-xray-metric');
  updates.appendChild(h('span', 'v-xray-metric-value', String(metrics.updatesPerSecond)));
  updates.appendChild(h('span', undefined, 'DOM updates per second'));
  frag.appendChild(updates);

  const effects = h('div', 'v-xray-metric');
  effects.appendChild(h('span', 'v-xray-metric-value', String(metrics.effectsPerSecond)));
  effects.appendChild(h('span', undefined, 'reactive effects triggered per second'));
  frag.appendChild(effects);

  const total = h('div', 'v-xray-metric');
  total.appendChild(h('span', 'v-xray-metric-value', String(metrics.effects)));
  total.appendChild(h('span', undefined, 'effects triggered since x-ray was enabled'));
  frag.appendChild(total);

  const chart = h('div', 'v-xray-chart');
  const peak = Math.max(1, ...metrics.history.map((item) => Math.max(item.effects, item.updates)));
  for (const item of metrics.history) {
    const bar = h('div', 'v-xray-bar');
    const value = Math.max(item.effects, item.updates);
    bar.style.height = `${Math.max(2, Math.round((value / peak) * 46))}px`;
    bar.title = `${item.effects} effects, ${item.updates} updates`;
    chart.appendChild(bar);
  }
  frag.appendChild(chart);
  frag.appendChild(
    h('span', 'v-xray-hint', `${patchedEffects.size} effects instrumented, peak of ${peak} per second`)
  );

  return frag;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const TABS: Array<{ id: TabName; label: string }> = [
  { id: 'estado', label: 'Estado' },
  { id: 'componentes', label: 'Componentes' },
  { id: 'stores', label: 'Stores' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'rede', label: 'Rede' },
  { id: 'desempenho', label: 'Desempenho' },
];

function renderActiveTab(): void {
  if (!refs) return;
  const active = document.activeElement;
  // Don't redraw while someone is typing inside the panel.
  if (active instanceof HTMLInputElement && refs.body.contains(active)) return;

  refs.body.textContent = '';
  switch (activeTab) {
    case 'estado':
      refs.body.appendChild(renderStateTab());
      break;
    case 'componentes':
      refs.body.appendChild(renderComponentsTab());
      break;
    case 'stores':
      refs.body.appendChild(renderStoresTab());
      break;
    case 'eventos':
      refs.body.appendChild(renderEventsTab());
      break;
    case 'rede':
      refs.body.appendChild(renderNetworkTab());
      break;
    case 'desempenho':
      refs.body.appendChild(renderPerformanceTab());
      break;
  }

  for (const child of Array.from(refs.tabs.children)) {
    const tab = child as HTMLElement;
    tab.dataset.active = tab.dataset.id === activeTab ? '1' : '0';
  }

  refs.status.textContent =
    `${outlined.length} elements with directives, ${instances.size} components, ` +
    `${patchedEffects.size} effects observed`;
}

/** Highlights an element on the page and scrolls to it. */
function highlight(el: Element): void {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flash(el);
}

function buildPanel(): PanelRefs {
  const root = h('div', 'v-xray-root');
  root.setAttribute(`${config.prefix}ignore`, '');
  root.setAttribute('role', 'complementary');
  root.setAttribute('aria-label', 'Voodoo x-ray inspector');
  if (theme !== 'auto') root.dataset.vXrayTheme = theme;

  const overlay = h('div', 'v-xray-overlay');
  root.appendChild(overlay);

  const card = h('div', 'v-xray-card');
  card.dataset.open = '0';
  root.appendChild(card);

  const panel = h('div', 'v-xray-panel');

  const header = h('div', 'v-xray-header');
  const brand = h('div', 'v-xray-brand');
  brand.appendChild(h('span', 'v-xray-dot'));
  brand.appendChild(document.createTextNode('Voodoo x-ray'));
  header.appendChild(brand);

  const themeButton = h('button', 'v-xray-btn', 'theme');
  themeButton.addEventListener('click', () => {
    theme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto';
    if (theme === 'auto') delete root.dataset.vXrayTheme;
    else root.dataset.vXrayTheme = theme;
  });
  header.appendChild(themeButton);

  const closeButton = h('button', 'v-xray-btn', 'close');
  closeButton.addEventListener('click', () => disableXray());
  header.appendChild(closeButton);
  panel.appendChild(header);

  const tabs = h('div', 'v-xray-tabs');
  for (const tab of TABS) {
    const button = h('button', 'v-xray-tab', tab.label);
    button.dataset.id = tab.id;
    button.dataset.active = tab.id === activeTab ? '1' : '0';
    button.addEventListener('click', () => {
      activeTab = tab.id;
      renderActiveTab();
    });
    tabs.appendChild(button);
  }
  panel.appendChild(tabs);

  const body = h('div', 'v-xray-body');
  panel.appendChild(body);

  const status = h('div', 'v-xray-status', 'starting');
  panel.appendChild(status);

  root.appendChild(panel);
  document.body.appendChild(root);

  return { root, overlay, card, panel, tabs, body, status };
}

// ---------------------------------------------------------------------------
// Event and network capture
// ---------------------------------------------------------------------------

const BASE_EVENTS = [
  'click',
  'dblclick',
  'submit',
  'input',
  'change',
  'keydown',
  'keyup',
  'focus',
  'blur',
  'contextmenu',
  'drop',
  'paste',
];

function pushEvent(entry: EventEntry): void {
  eventLog.push(entry);
  if (eventLog.length > MAX_LOG) eventLog.shift();
  if (activeTab === 'eventos') renderActiveTab();
}

function pushNetwork(entry: NetworkEntry): void {
  networkLog.push(entry);
  if (networkLog.length > MAX_LOG) networkLog.shift();
  if (activeTab === 'rede') renderActiveTab();
}

/** Searches up a few levels to find who declared a directive for the event. */
function declaringElement(target: Element | null, type: string): Element | null {
  let current: Element | null = target;
  for (let depth = 0; current && depth < 6; depth++) {
    for (const attr of collectDirectives(current)) {
      if (attr.name === type) return current;
      if (attr.name === 'on' && attr.arg === type) return current;
    }
    current = current.parentElement;
  }
  return null;
}

/** Names of events mentioned in `v-on:` and `@` attributes on the page. */
function declaredEventNames(): string[] {
  const names = new Set(BASE_EVENTS);
  const all = document.body.querySelectorAll('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    for (const attr of collectDirectives(el)) {
      if (attr.name === 'on' && attr.arg) names.add(attr.arg);
    }
  }
  return [...names];
}

function listenEvents(): void {
  const handler = (event: Event): void => {
    if (!enabled) return;
    const target = event.target as Element | null;
    if (!target || target.nodeType !== 1 || isXrayNode(target)) return;

    const owner = declaringElement(target, event.type);
    const custom = (event as Event & { __voodoo?: boolean }).__voodoo === true;
    if (!owner && !custom) return;

    pushEvent({
      at: Date.now(),
      type: event.type,
      target: describeElement(owner ?? target),
      detail: custom ? 'component emit' : '',
      source: custom ? 'component' : 'v-on',
    });
  };

  for (const name of declaredEventNames()) {
    document.addEventListener(name, handler, true);
    disposers.push(() => document.removeEventListener(name, handler, true));
  }

  disposers.push(
    devtoolsBus.on('event', (data) => {
      pushEvent({
        at: Date.now(),
        type: data.type,
        target: describeElement(data.el ?? null),
        detail: preview(data.detail),
        source: data.source ?? 'bus',
      });
    })
  );
}

function listenNetwork(): void {
  disposers.push(
    http.interceptors.request.use((requestConfig) => {
      requestStarts.set(requestConfig, performance.now());
      return requestConfig;
    })
  );

  disposers.push(
    http.interceptors.response.use((response) => {
      const started = requestStarts.get(response.config) ?? performance.now();
      pushNetwork({
        at: Date.now(),
        method: (response.config.method ?? 'GET').toUpperCase(),
        url: response.config.url,
        status: response.status,
        ok: response.ok,
        duration: performance.now() - started,
        source: 'http',
      });
      return response;
    })
  );

  disposers.push(
    http.interceptors.error.use((error: HttpError) => {
      const requestConfig = error.config;
      const started = requestConfig ? requestStarts.get(requestConfig) ?? performance.now() : performance.now();
      pushNetwork({
        at: Date.now(),
        method: (requestConfig?.method ?? 'GET').toUpperCase(),
        url: requestConfig?.url ?? '(unknown)',
        status: error.status,
        ok: false,
        duration: performance.now() - started,
        source: 'http',
      });
      return error;
    })
  );

  disposers.push(
    devtoolsBus.on('network', (data) => {
      pushNetwork({
        at: Date.now(),
        method: (data.method ?? 'GET').toUpperCase(),
        url: data.url,
        status: data.status ?? 0,
        ok: data.ok ?? !data.error,
        duration: data.duration ?? 0,
        source: data.source ?? 'bus',
      });
    })
  );
}

// ---------------------------------------------------------------------------
// DOM observation and metrics
// ---------------------------------------------------------------------------

let observer: MutationObserver | null = null;

function observeMutations(): void {
  observer = new MutationObserver((records) => {
    let structural = false;
    for (const record of records) {
      const target = record.target;
      if (isXrayNode(target)) continue;
      if (
        record.type === 'attributes' &&
        record.attributeName === 'class' &&
        target.nodeType === 1 &&
        flashing.has(target as Element)
      ) {
        // Ignores the flash itself, otherwise the count loops.
        continue;
      }
      metrics.mutations++;
      if (record.type === 'childList' && record.addedNodes.length) structural = true;
    }
    if (structural && !scanTimer) {
      scanTimer = window.setTimeout(() => {
        scanTimer = 0;
        scanDocument();
      }, 250);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
}

function startTimers(): void {
  metricsTimer = window.setInterval(() => {
    metrics.effectsPerSecond = metrics.effects - lastEffectCount;
    metrics.updatesPerSecond = metrics.mutations - lastMutationCount;
    lastEffectCount = metrics.effects;
    lastMutationCount = metrics.mutations;
    metrics.history.push({
      effects: metrics.effectsPerSecond,
      updates: metrics.updatesPerSecond,
    });
    if (metrics.history.length > 40) metrics.history.shift();
    if (activeTab === 'desempenho') renderActiveTab();
  }, 1000);

  refreshTimer = window.setInterval(() => {
    positionOutlines();
    if (activeTab === 'estado' || activeTab === 'componentes' || activeTab === 'stores') {
      renderActiveTab();
    }
  }, 700);
}

let lastEffectCount = 0;
let lastMutationCount = 0;

// ---------------------------------------------------------------------------
// Enable and disable
// ---------------------------------------------------------------------------

/** Enables the inspector. Calling twice doesn't duplicate anything. */
export function enableXray(): void {
  if (enabled || typeof document === 'undefined' || !document.body) return;
  enabled = true;

  ensureTokens();
  injectStyle('xray', XRAY_CSS);

  refs = buildPanel();
  activeTab = activeTab || 'estado';

  metrics.effects = 0;
  metrics.mutations = 0;
  lastEffectCount = 0;
  lastMutationCount = 0;
  metrics.history.length = 0;

  scanDocument();
  listenEvents();
  listenNetwork();
  observeMutations();
  startTimers();

  const onScroll = (): void => scheduleReposition();
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
  document.addEventListener('mousemove', onPointerMove, true);
  disposers.push(() => window.removeEventListener('scroll', onScroll, true));
  disposers.push(() => window.removeEventListener('resize', onScroll));
  disposers.push(() => document.removeEventListener('mousemove', onPointerMove, true));

  renderActiveTab();
}

/** Disables the inspector and returns the page to its original state. */
export function disableXray(): void {
  if (!enabled) return;
  enabled = false;

  for (const dispose of disposers.splice(0)) {
    try {
      dispose();
    } catch {
      // Broken cleanup must not prevent others.
    }
  }

  observer?.disconnect();
  observer = null;

  if (metricsTimer) window.clearInterval(metricsTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (scanTimer) window.clearTimeout(scanTimer);
  if (frameRequest) cancelAnimationFrame(frameRequest);
  metricsTimer = refreshTimer = scanTimer = frameRequest = 0;

  for (const [el, timer] of flashTimers) {
    window.clearTimeout(timer);
    el.classList.remove(FLASH_CLASS);
  }
  flashTimers.clear();
  flashing.clear();

  restoreEffects();
  outlined.length = 0;
  hoverTarget = null;

  refs?.root.remove();
  refs = null;
}

/** `true` when the inspector is enabled. */
export function isXrayEnabled(): boolean {
  return enabled;
}

/**
 * Installs only the `Ctrl+Shift+X` shortcut, without opening the panel.
 * Useful for keeping the inspector one keystroke away in development, with no
 * cost at all while no one presses the keys.
 */
export function enableXrayShortcut(): void {
  if (shortcutInstalled || typeof document === 'undefined') return;
  shortcutInstalled = true;
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!event.ctrlKey || !event.shiftKey) return;
    if (event.key !== 'X' && event.key !== 'x') return;
    event.preventDefault();
    xray();
  });
}

/**
 * Enables and disables the visual reactivity inspector.
 *
 * ```js
 * V.xray()        // toggle
 * V.xray(true)    // enable
 * V.xray(false)   // disable
 * ```
 *
 * The first call also installs the `Ctrl+Shift+X` shortcut.
 *
 * @param force enable or disable explicitly. Without argument, toggles.
 * @returns the state after the call.
 */
export function xray(force?: boolean): boolean {
  enableXrayShortcut();
  const next = force ?? !enabled;
  if (next) enableXray();
  else disableXray();
  return enabled;
}
