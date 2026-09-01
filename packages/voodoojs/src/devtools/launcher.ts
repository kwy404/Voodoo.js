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
const POSICAO_KEY = 'voodoo:devtools:widget-position';

/** Marks that the developer hid the widget in this tab. */
const ESCONDIDO_KEY = 'voodoo:devtools:widget-hidden';

/** Minimum distance in pixels for the gesture to count as drag, not click. */
const LIMIAR_ARRASTO = 4;

interface Refs {
  raiz: HTMLElement;
  botao: HTMLButtonElement;
  pulso: HTMLElement;
  contador: HTMLElement;
  fechar: HTMLButtonElement;
}

let refs: Refs | null = null;
let montado = false;
let timerContador = 0;
let timerPulso = 0;
let desligar: Array<() => void> = [];

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
const MARCA = `<svg class="v-devtools-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
<path d="M4 4l8 16 8-16" stroke="#6D3BF5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="12" cy="7.5" r="2" fill="#FF3D8B"/>
</svg>`;

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

interface Posicao {
  x: number;
  y: number;
}

function lerPosicao(): Posicao | null {
  try {
    const bruto = localStorage.getItem(POSICAO_KEY);
    if (!bruto) return null;
    const valor = JSON.parse(bruto) as Posicao;
    if (typeof valor?.x !== 'number' || typeof valor?.y !== 'number') return null;
    return valor;
  } catch {
    return null;
  }
}

function gravarPosicao(pos: Posicao): void {
  try {
    localStorage.setItem(POSICAO_KEY, JSON.stringify(pos));
  } catch {
    // Storage blocked: the widget just won't remember the position.
  }
}

/** Keeps the widget inside the window, even after resizing. */
function aplicarPosicao(raiz: HTMLElement, pos: Posicao): void {
  const largura = raiz.offsetWidth || 120;
  const altura = raiz.offsetHeight || 38;
  const x = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - largura - 8));
  const y = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - altura - 8));
  raiz.style.left = `${x}px`;
  raiz.style.top = `${y}px`;
  raiz.style.right = 'auto';
  raiz.style.bottom = 'auto';
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

function construir(): Refs {
  const raiz = document.createElement('div');
  raiz.className = 'v-devtools-widget';
  raiz.setAttribute('data-voodoo-devtools', 'widget');

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'v-devtools-btn';
  botao.setAttribute('aria-label', 'Open Voodoo devtools (Ctrl+Shift+X)');
  botao.setAttribute('aria-pressed', 'false');
  botao.title = 'Voodoo devtools — click to inspect, drag to move (Ctrl+Shift+X)';
  botao.innerHTML = MARCA;

  const rotulo = document.createElement('span');
  rotulo.className = 'v-devtools-label';
  rotulo.textContent = 'Voodoo';

  const contador = document.createElement('span');
  contador.className = 'v-devtools-count';
  contador.textContent = '0';

  const pulso = document.createElement('span');
  pulso.className = 'v-devtools-pulse';
  pulso.setAttribute('data-on', 'false');

  botao.append(rotulo, contador, pulso);

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'v-devtools-close';
  fechar.setAttribute('aria-label', 'Hide the devtools widget in this tab');
  fechar.title = 'Hide in this tab';
  fechar.textContent = '×';

  raiz.append(botao, fechar);
  document.body.appendChild(raiz);

  const salva = lerPosicao();
  if (salva) {
    aplicarPosicao(raiz, salva);
  } else {
    raiz.style.right = '16px';
    raiz.style.bottom = '16px';
  }

  return { raiz, botao, pulso, contador, fechar };
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
function ligarArrasto(refs: Refs, aoClicar: () => void): () => void {
  let arrastando = false;
  let moveu = false;
  let deslocX = 0;
  let deslocY = 0;
  let inicioX = 0;
  let inicioY = 0;

  const aoDescer = (evento: PointerEvent): void => {
    if (evento.button !== 0) return;
    const caixa = refs.raiz.getBoundingClientRect();
    arrastando = true;
    moveu = false;
    inicioX = evento.clientX;
    inicioY = evento.clientY;
    deslocX = evento.clientX - caixa.left;
    deslocY = evento.clientY - caixa.top;
    refs.botao.setPointerCapture?.(evento.pointerId);
  };

  const aoMover = (evento: PointerEvent): void => {
    if (!arrastando) return;
    const distancia = Math.hypot(evento.clientX - inicioX, evento.clientY - inicioY);
    if (!moveu && distancia < LIMIAR_ARRASTO) return;
    moveu = true;
    evento.preventDefault();
    aplicarPosicao(refs.raiz, { x: evento.clientX - deslocX, y: evento.clientY - deslocY });
  };

  const aoSubir = (evento: PointerEvent): void => {
    if (!arrastando) return;
    arrastando = false;
    refs.botao.releasePointerCapture?.(evento.pointerId);

    if (!moveu) {
      aoClicar();
      return;
    }
    const caixa = refs.raiz.getBoundingClientRect();
    gravarPosicao({ x: caixa.left, y: caixa.top });
  };

  // Keyboard never goes through dragging: Enter and Space trigger native click.
  const aoTeclar = (evento: KeyboardEvent): void => {
    if (evento.key !== 'Enter' && evento.key !== ' ') return;
    evento.preventDefault();
    aoClicar();
  };

  const aoRedimensionar = (): void => {
    const caixa = refs.raiz.getBoundingClientRect();
    if (refs.raiz.style.left) aplicarPosicao(refs.raiz, { x: caixa.left, y: caixa.top });
  };

  refs.botao.addEventListener('pointerdown', aoDescer);
  refs.botao.addEventListener('pointermove', aoMover);
  refs.botao.addEventListener('pointerup', aoSubir);
  refs.botao.addEventListener('pointercancel', aoSubir);
  refs.botao.addEventListener('keydown', aoTeclar);
  window.addEventListener('resize', aoRedimensionar);

  return () => {
    refs.botao.removeEventListener('pointerdown', aoDescer);
    refs.botao.removeEventListener('pointermove', aoMover);
    refs.botao.removeEventListener('pointerup', aoSubir);
    refs.botao.removeEventListener('pointercancel', aoSubir);
    refs.botao.removeEventListener('keydown', aoTeclar);
    window.removeEventListener('resize', aoRedimensionar);
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
function piscar(): void {
  if (!refs) return;
  refs.pulso.setAttribute('data-on', 'true');
  window.clearTimeout(timerPulso);
  timerPulso = window.setTimeout(() => {
    refs?.pulso.setAttribute('data-on', 'false');
  }, 320);
}

function atualizarContador(): void {
  if (!refs) return;
  const total = instances.size;
  const texto = total === 1 ? '1 component' : `${total} components`;
  if (refs.contador.textContent !== texto) refs.contador.textContent = texto;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Shows the floating widget. Calling twice doesn't duplicate anything. */
export function mountDevtoolsWidget(): void {
  if (montado || typeof document === 'undefined' || !document.body) return;

  // Respects whoever hid the widget in this tab.
  try {
    if (sessionStorage.getItem(ESCONDIDO_KEY) === '1') return;
  } catch {
    // No sessionStorage: the widget simply appears.
  }

  montado = true;
  injectStyle('devtools-widget', WIDGET_CSS);
  refs = construir();

  const alternar = (): void => {
    const ligado = xray();
    refs?.raiz.setAttribute('data-active', String(ligado));
    refs?.botao.setAttribute('aria-pressed', String(ligado));
  };

  desligar.push(ligarArrasto(refs, alternar));

  const aoFechar = (evento: MouseEvent): void => {
    evento.stopPropagation();
    try {
      sessionStorage.setItem(ESCONDIDO_KEY, '1');
    } catch {
      // No sessionStorage: it disappears until the next navigation.
    }
    unmountDevtoolsWidget();
    // eslint-disable-next-line no-console
    console.info('[Voodoo] devtools widget hidden. Use V.devtoolsWidget(true) to bring back.');
  };
  refs.fechar.addEventListener('click', aoFechar);
  desligar.push(() => refs?.fechar.removeEventListener('click', aoFechar));

  // Keeps visual state up to date when the panel is opened via shortcut.
  const aoTeclarGlobal = (): void => {
    const ligado = isXrayEnabled();
    refs?.raiz.setAttribute('data-active', String(ligado));
    refs?.botao.setAttribute('aria-pressed', String(ligado));
  };
  document.addEventListener('keyup', aoTeclarGlobal);
  desligar.push(() => document.removeEventListener('keyup', aoTeclarGlobal));

  for (const tipo of ['network', 'event', 'navigation', 'update'] as const) {
    desligar.push(devtoolsBus.on(tipo, piscar));
  }

  atualizarContador();
  timerContador = window.setInterval(atualizarContador, 1000);
}

/** Removes the widget and all listeners it created. */
export function unmountDevtoolsWidget(): void {
  if (!montado) return;
  montado = false;

  for (const fn of desligar.splice(0)) {
    try {
      fn();
    } catch {
      // Broken cleanup must not prevent others.
    }
  }

  window.clearInterval(timerContador);
  window.clearTimeout(timerPulso);
  timerContador = 0;
  timerPulso = 0;

  refs?.raiz.remove();
  refs = null;
}

/** `true` when the widget is on screen. */
export function isDevtoolsWidgetMounted(): boolean {
  return montado;
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
  const alvo = force ?? !montado;
  if (alvo) {
    // An explicit call overrides "hidden in this tab".
    try {
      sessionStorage.removeItem(ESCONDIDO_KEY);
    } catch {
      // No sessionStorage: nothing to clean up.
    }
    mountDevtoolsWidget();
  } else {
    unmountDevtoolsWidget();
  }
  return montado;
}
