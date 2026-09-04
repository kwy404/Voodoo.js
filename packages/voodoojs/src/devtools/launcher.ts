/**
 * @module devtools/launcher
 *
 * Floating widget for devtools.
 *
 * The `xray` inspector always existed, but only opened via console call. This
 * module adds a button to the page itself: it appears when devtools are on,
 * shows live activity, and opens the full panel with a click.
 *
 * Enable via HTML without writing any JavaScript:
 *
 * ```html
 * <script src="voodoo.full.min.js" devtools defer></script>
 * ```
 *
 * Equivalent forms also work: `data-devtools`, `devtools="true"` and
 * `window.VOODOO_DEVTOOLS = true` before loading.
 *
 * Enable via JavaScript:
 *
 * ```js
 * V.devtoolsWidget()       // toggle
 * V.devtoolsWidget(true)   // show
 * V.devtoolsWidget(false)  // hide
 * ```
 *
 * The module does nothing when imported: no listeners, no styles, and
 * no timers exist before the first call to `mountDevtoolsWidget()`.
 */

import { injectStyle } from '../dom/style';
import { instances } from '../runtime/component';
import { devtoolsBus } from './bus';
import { isXrayEnabled, xray } from './xray';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Where the dragged position is saved between reloads. */
const POSITION_KEY = 'voodoo:devtools:widget-position';

/** Marks that the developer hid the widget in this tab. */
const HIDDEN_KEY = 'voodoo:devtools:widget-hidden';

/** Minimum distance in pixels for the gesture to count as drag, not click. */
const DRAG_THRESHOLD = 4;

interface Refs {
  root: HTMLElement;
  button: HTMLButtonElement;
  pulse: HTMLElement;
  counter: HTMLElement;
  close: HTMLButtonElement;
}

let refs: Refs | null = null;
let mounted = false;
let counterTimer = 0;
let pulseTimer = 0;
let teardown: Array<() => void> = [];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const WIDGET_CSS = `
.v-devtools-widget{
  all: initial;
  --vw-accent:#6D3BF5;
  --vw-accent-2:#FF3D8B;
  --vw-bg:#ffffff;
  --vw-text:#14111F;
  --vw-muted:#6B6580;
  --vw-border:#E6E0F0;
  --vw-shadow:0 8px 28px rgba(20,17,31,.24);
  position:fixed;
  z-index:2147482900;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1;
  color:var(--vw-text);
  -webkit-font-smoothing:antialiased;
  touch-action:none;
}
@media (prefers-color-scheme: dark){
  .v-devtools-widget:not([data-theme="light"]){
    --vw-bg:#1C1830;
    --vw-text:#F4F1FB;
    --vw-muted:#A9A2C4;
    --vw-border:#332C50;
    --vw-shadow:0 8px 28px rgba(0,0,0,.55);
  }
}
.v-devtools-widget[data-theme="dark"]{
  --vw-bg:#1C1830;
  --vw-text:#F4F1FB;
  --vw-muted:#A9A2C4;
  --vw-border:#332C50;
  --vw-shadow:0 8px 28px rgba(0,0,0,.55);
}
.v-devtools-widget *,.v-devtools-widget *::before,.v-devtools-widget *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  background:transparent;
  font:inherit;
  color:inherit;
  list-style:none;
  text-decoration:none;
}
.v-devtools-btn{
  display:flex;
  align-items:center;
  gap:8px;
  height:38px;
  padding:0 12px 0 10px;
  border:1px solid var(--vw-border);
  border-radius:999px;
  background:var(--vw-bg);
  box-shadow:var(--vw-shadow);
  cursor:grab;
  user-select:none;
  transition:transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s;
}
.v-devtools-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 12px 34px rgba(109,59,245,.3);
}
.v-devtools-btn:active{cursor:grabbing}
.v-devtools-btn:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:2px;
}
.v-devtools-widget[data-active="true"] .v-devtools-btn{
  border-color:var(--vw-accent);
  box-shadow:0 0 0 3px rgba(109,59,245,.22), var(--vw-shadow);
}
.v-devtools-mark{
  flex:0 0 auto;
  width:20px;
  height:20px;
  display:block;
}
.v-devtools-label{
  font-weight:600;
  letter-spacing:.2px;
  white-space:nowrap;
}
.v-devtools-count{
  padding:2px 6px;
  border-radius:999px;
  background:rgba(109,59,245,.12);
  color:var(--vw-accent);
  font-variant-numeric:tabular-nums;
  font-weight:600;
  white-space:nowrap;
}
.v-devtools-pulse{
  flex:0 0 auto;
  width:7px;
  height:7px;
  border-radius:50%;
  background:var(--vw-border);
  transition:background .2s, box-shadow .2s;
}
.v-devtools-pulse[data-on="true"]{
  background:var(--vw-accent-2);
  box-shadow:0 0 0 4px rgba(255,61,139,.18);
}
.v-devtools-close{
  position:absolute;
  top:-7px;
  right:-7px;
  width:18px;
  height:18px;
  border-radius:50%;
  border:1px solid var(--vw-border);
  background:var(--vw-bg);
  color:var(--vw-muted);
  font-size:11px;
  line-height:1;
  cursor:pointer;
  opacity:0;
  transition:opacity .15s;
}
.v-devtools-widget:hover .v-devtools-close,
.v-devtools-close:focus-visible{opacity:1}
.v-devtools-close:focus-visible{
  outline:2px solid var(--vw-accent);
  outline-offset:1px;
}
@media (prefers-reduced-motion: reduce){
  .v-devtools-btn,.v-devtools-pulse,.v-devtools-close{transition:none}
  .v-devtools-btn:hover{transform:none}
}
`;

/** Voodoo mark drawn in SVG, so the widget doesn't depend on a file. */
const MARK = `<svg class="v-devtools-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M4 4l8 16 8-16" stroke="#6D3BF5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="7.5" r="2" fill="#FF3D8B"/>
</svg>`;

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

interface Position {
  x: number;
  y: number;
}

function readPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Position;
    if (typeof value?.x !== 'number' || typeof value?.y !== 'number') return null;
    return value;
  } catch {
    return null;
  }
}

function writePosition(pos: Position): void {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch {
    // Storage blocked: the widget just won't remember the position.
  }
}

/** Keeps the widget inside the window, even after resizing. */
function applyPosition(root: HTMLElement, pos: Position): void {
  const width = root.offsetWidth || 120;
  const height = root.offsetHeight || 38;
  const x = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - width - 8));
  const y = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - height - 8));
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  root.style.right = 'auto';
  root.style.bottom = 'auto';
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

function build(): Refs {
  const root = document.createElement('div');
  root.className = 'v-devtools-widget';
  root.setAttribute('data-voodoo-devtools', 'widget');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'v-devtools-btn';
  button.setAttribute('aria-label', 'Open Voodoo devtools (Ctrl+Shift+F2)');
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Voodoo devtools — click to inspect, drag to move (Ctrl+Shift+F2)';
  button.innerHTML = MARK;

  const label = document.createElement('span');
  label.className = 'v-devtools-label';
  label.textContent = 'Voodoo';

  const counter = document.createElement('span');
  counter.className = 'v-devtools-count';
  counter.textContent = '0';

  const pulse = document.createElement('span');
  pulse.className = 'v-devtools-pulse';
  pulse.setAttribute('data-on', 'false');

  button.append(label, counter, pulse);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'v-devtools-close';
  close.setAttribute('aria-label', 'Hide the devtools widget in this tab');
  close.title = 'Hide in this tab';
  close.textContent = '×';

  root.append(button, close);
  document.body.appendChild(root);

  const saved = readPosition();
  if (saved) {
    applyPosition(root, saved);
  } else {
    root.style.right = '16px';
    root.style.bottom = '16px';
  }

  return { root, button, pulse, counter, close };
}

// ---------------------------------------------------------------------------
// Dragging
// ---------------------------------------------------------------------------

/**
 * Enables widget dragging. Returns the cleanup function.
 *
 * The gesture only becomes a drag after passing the threshold; below that the
 * pointer releases as a normal click, so the button stays clickable.
 */
function enableDrag(refs: Refs, onClick: () => void): () => void {
  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;
  let startX = 0;
  let startY = 0;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const box = refs.root.getBoundingClientRect();
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    offsetX = event.clientX - box.left;
    offsetY = event.clientY - box.top;
    refs.button.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
    if (!moved && distance < DRAG_THRESHOLD) return;
    moved = true;
    event.preventDefault();
    applyPosition(refs.root, { x: event.clientX - offsetX, y: event.clientY - offsetY });
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    refs.button.releasePointerCapture?.(event.pointerId);

    if (!moved) {
      onClick();
      return;
    }
    const box = refs.root.getBoundingClientRect();
    writePosition({ x: box.left, y: box.top });
  };

  // Keyboard never goes through dragging: Enter and Space trigger native click.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onClick();
  };

  const onResize = (): void => {
    const box = refs.root.getBoundingClientRect();
    if (refs.root.style.left) applyPosition(refs.root, { x: box.left, y: box.top });
  };

  refs.button.addEventListener('pointerdown', onPointerDown);
  refs.button.addEventListener('pointermove', onPointerMove);
  refs.button.addEventListener('pointerup', onPointerUp);
  refs.button.addEventListener('pointercancel', onPointerUp);
  refs.button.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);

  return () => {
    refs.button.removeEventListener('pointerdown', onPointerDown);
    refs.button.removeEventListener('pointermove', onPointerMove);
    refs.button.removeEventListener('pointerup', onPointerUp);
    refs.button.removeEventListener('pointercancel', onPointerUp);
    refs.button.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onResize);
  };
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/**
 * Lights up the activity dot for a moment.
 *
 * The widget doesn't instrument anything on its own: it only listens to the
 * bus that modules already feed. Without activity, the cost is zero.
 */
function blink(): void {
  if (!refs) return;
  refs.pulse.setAttribute('data-on', 'true');
  window.clearTimeout(pulseTimer);
  pulseTimer = window.setTimeout(() => {
    refs?.pulse.setAttribute('data-on', 'false');
  }, 320);
}

function updateCounter(): void {
  if (!refs) return;
  const total = instances.size;
  const text = total === 1 ? '1 component' : `${total} components`;
  if (refs.counter.textContent !== text) refs.counter.textContent = text;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Shows the floating widget. Calling twice doesn't duplicate anything. */
export function mountDevtoolsWidget(): void {
  if (mounted || typeof document === 'undefined' || !document.body) return;

  // Respects whoever hid the widget in this tab.
  try {
    if (sessionStorage.getItem(HIDDEN_KEY) === '1') return;
  } catch {
    // No sessionStorage: the widget simply appears.
  }

  mounted = true;
  injectStyle('devtools-widget', WIDGET_CSS);
  refs = build();

  const toggle = (): void => {
    const enabled = xray();
    refs?.root.setAttribute('data-active', String(enabled));
    refs?.button.setAttribute('aria-pressed', String(enabled));
  };

  teardown.push(enableDrag(refs, toggle));

  const onClose = (event: MouseEvent): void => {
    event.stopPropagation();
    try {
      sessionStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // No sessionStorage: it disappears until the next navigation.
    }
    unmountDevtoolsWidget();
    // eslint-disable-next-line no-console
    console.info('[Voodoo] devtools widget hidden. Use V.devtoolsWidget(true) to bring back.');
  };
  refs.close.addEventListener('click', onClose);
  teardown.push(() => refs?.close.removeEventListener('click', onClose));

  // Keeps visual state up to date when the panel is opened via shortcut.
  const onGlobalKeyUp = (): void => {
    const enabled = isXrayEnabled();
    refs?.root.setAttribute('data-active', String(enabled));
    refs?.button.setAttribute('aria-pressed', String(enabled));
  };
  document.addEventListener('keyup', onGlobalKeyUp);
  teardown.push(() => document.removeEventListener('keyup', onGlobalKeyUp));

  for (const type of ['network', 'event', 'navigation', 'update'] as const) {
    teardown.push(devtoolsBus.on(type, blink));
  }

  updateCounter();
  counterTimer = window.setInterval(updateCounter, 1000);
}

/** Removes the widget and all listeners it created. */
export function unmountDevtoolsWidget(): void {
  if (!mounted) return;
  mounted = false;

  for (const fn of teardown.splice(0)) {
    try {
      fn();
    } catch {
      // Broken cleanup must not prevent others.
    }
  }

  window.clearInterval(counterTimer);
  window.clearTimeout(pulseTimer);
  counterTimer = 0;
  pulseTimer = 0;

  refs?.root.remove();
  refs = null;
}

/** `true` when the widget is on screen. */
export function isDevtoolsWidgetMounted(): boolean {
  return mounted;
}

/**
 * Shows and hides the devtools floating widget.
 *
 * ```js
 * V.devtoolsWidget()       // toggle
 * V.devtoolsWidget(true)   // show
 * V.devtoolsWidget(false)  // hide
 * ```
 *
 * @param force show or hide explicitly. Without argument, toggles.
 * @returns the state after the call.
 */
export function devtoolsWidget(force?: boolean): boolean {
  const target = force ?? !mounted;
  if (target) {
    // An explicit call overrides "hidden in this tab".
    try {
      sessionStorage.removeItem(HIDDEN_KEY);
    } catch {
      // No sessionStorage: nothing to clean up.
    }
    mountDevtoolsWidget();
  } else {
    unmountDevtoolsWidget();
  }
  return mounted;
}
