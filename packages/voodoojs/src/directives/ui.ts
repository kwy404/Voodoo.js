/**
 * @module directives/ui
 *
 * Componentes de interface declarativos. Tudo aqui funciona escrevendo apenas
 * HTML: nenhuma linha de JavaScript e necessaria para ter menu suspenso, abas,
 * gaveta lateral, tooltip, paleta de comandos e o resto.
 *
 * ```html
 * <button v-dropdown="#menu">Acoes</button>
 * <div id="menu" v-dropdown-menu>
 *   <button v-copy="PROMO10">Copiar cupom</button>
 * </div>
 * ```
 *
 * Acessibilidade nao e opcional neste modulo: cada componente cuida de papeis
 * ARIA, navegacao por teclado, foco visivel e fechamento por Escape.
 */

import { queuePostFlush } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import { evaluateIn } from '../runtime/walker';
import { ensureTokens, injectStyle } from '../dom/style';
import { fadeIn, fadeOut, slideDown, slideUp } from '../dom/transition';
import { theme, url } from '../storage';
import { device, escapeHtml, parseDuration, throttle, uid } from '../utils';

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const UI_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v-focus-ring:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px;
  border-radius:var(--v-radius-sm,8px)}
.v-scroll-lock{overflow:hidden !important}

.v-tooltip,.v-popover{position:fixed;z-index:var(--v-z-tooltip,1200);opacity:0;
  transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-tooltip{max-width:min(280px,80vw);padding:6px 10px;border-radius:var(--v-radius-sm,8px);
  background:var(--v-text,#14111F);color:var(--v-surface,#fff);pointer-events:none;
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,sans-serif);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}
.v-tooltip[data-placement="top"]{transform:translateY(4px)}
.v-tooltip[data-placement="bottom"]{transform:translateY(-4px)}
.v-tooltip[data-placement="left"]{transform:translateX(4px)}
.v-tooltip[data-placement="right"]{transform:translateX(-4px)}
.v-tooltip.v-in,.v-popover.v-in{opacity:1;transform:none}
.v-popover{z-index:var(--v-z-dropdown,900);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));transform:translateY(-4px)}
.v-popover[hidden],.v-dropdown-menu[hidden]{display:none !important}

.v-dropdown-menu{position:fixed;z-index:var(--v-z-dropdown,900);min-width:180px;padding:6px;margin:0;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  opacity:0;transform:translateY(-4px);transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-dropdown-menu.v-in{opacity:1;transform:none}
.v-dropdown-menu [role="menuitem"]{display:block;width:100%;text-align:left;background:none;border:0;
  padding:8px 10px;border-radius:var(--v-radius-sm,8px);color:inherit;cursor:pointer;
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif);text-decoration:none}
.v-dropdown-menu [role="menuitem"]:hover,.v-dropdown-menu [role="menuitem"]:focus-visible{
  background:var(--v-surface-2,#FBF7F2);outline:none;color:var(--v-primary,#6D3BF5)}

.v-tab{cursor:pointer}
[role="tabpanel"][hidden]{display:none !important}

.v-accordion-header{display:flex;align-items:center;justify-content:space-between;gap:12px;
  width:100%;cursor:pointer;text-align:left}
.v-accordion-header::after{content:"";flex:none;width:8px;height:8px;border-right:2px solid currentColor;
  border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px);
  transition:transform .2s var(--v-ease,ease);opacity:.6}
.v-accordion-header[aria-expanded="true"]::after{transform:rotate(-135deg) translateY(-2px)}

.v-drawer-backdrop{position:fixed;inset:0;background:rgba(20,17,31,.45);opacity:0;
  z-index:var(--v-z-drawer,1000);transition:opacity .24s var(--v-ease,ease)}
.v-drawer-backdrop.v-in{opacity:1}
.v-drawer-panel{position:fixed;display:flex;flex-direction:column;overflow:auto;
  z-index:calc(var(--v-z-drawer,1000) + 1);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  transition:transform .28s var(--v-ease,ease)}
.v-drawer-panel[hidden]{display:none !important}
.v-drawer-panel[data-side="left"]{top:0;left:0;height:100%;width:min(360px,86vw);transform:translateX(-100%)}
.v-drawer-panel[data-side="right"]{top:0;right:0;height:100%;width:min(360px,86vw);transform:translateX(100%)}
.v-drawer-panel[data-side="top"]{top:0;left:0;width:100%;max-height:86vh;transform:translateY(-100%)}
.v-drawer-panel[data-side="bottom"]{bottom:0;left:0;width:100%;max-height:86vh;transform:translateY(100%)}
.v-drawer-panel.v-open{transform:none}

.v-skeleton{position:relative;min-height:1em;border-radius:var(--v-radius-sm,8px);color:transparent !important;
  background:linear-gradient(90deg,var(--v-surface-2,#FBF7F2) 25%,var(--v-border,#E6E0F0) 37%,var(--v-surface-2,#FBF7F2) 63%);
  background-size:400% 100%;animation:v-skeleton-wave 1.4s ease infinite}
.v-skeleton>*{visibility:hidden}
@keyframes v-skeleton-wave{0%{background-position:100% 50%}100%{background-position:0 50%}}

.v-lazy{opacity:0;transition:opacity .35s var(--v-ease,ease)}
.v-lazy-loaded{opacity:1}
.v-lazy-failed{opacity:1;filter:grayscale(1)}

.v-copied,.v-copy-failed{position:relative}
.v-copied::after,.v-copy-failed::after{content:attr(data-v-copy-label);position:absolute;left:50%;
  bottom:calc(100% + 6px);transform:translateX(-50%);padding:5px 8px;border-radius:6px;white-space:nowrap;
  pointer-events:none;color:#0B1F1A;background:var(--v-success,#2ED9A5);
  font:600 11px/1 var(--v-font-sans,system-ui,sans-serif)}
.v-copy-failed::after{background:var(--v-danger,#FF4D4D);color:#fff}

.v-sticky{position:sticky;top:var(--v-sticky-offset,0px);z-index:5}
.v-stuck{box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}

.v-sortable{position:relative}
.v-sort-dragging{position:fixed;z-index:var(--v-z-modal,1000);pointer-events:none;
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));opacity:.94;cursor:grabbing}
.v-sort-placeholder{border:2px dashed var(--v-primary,#6D3BF5);border-radius:var(--v-radius-sm,8px);
  background:var(--v-surface-2,#FBF7F2);box-sizing:border-box}
.v-sort-handle{cursor:grab;touch-action:none}

.v-resizable{position:relative}
.v-resize-handle{position:absolute;background:transparent;touch-action:none;padding:0;border:0}
.v-resize-handle:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:-2px}
.v-resize-handle[data-dir="right"]{top:0;right:-3px;width:8px;height:100%;cursor:ew-resize}
.v-resize-handle[data-dir="bottom"]{left:0;bottom:-3px;height:8px;width:100%;cursor:ns-resize}
.v-resize-handle[data-dir="corner"]{right:-3px;bottom:-3px;width:14px;height:14px;cursor:nwse-resize}

.v-command{position:fixed;inset:0;z-index:var(--v-z-modal,1000);display:flex;justify-content:center;
  align-items:flex-start;padding:12vh 16px 16px;background:rgba(20,17,31,.45)}
.v-command-box{width:min(560px,100%);background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));overflow:hidden}
.v-command-input{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--v-border,#E6E0F0);
  background:transparent;color:var(--v-text,#14111F);outline:none;
  font:500 15px/1.4 var(--v-font-sans,system-ui,sans-serif)}
.v-command-list{list-style:none;margin:0;padding:6px;max-height:min(46vh,340px);overflow:auto}
.v-command-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;
  border-radius:var(--v-radius-sm,8px);cursor:pointer;color:var(--v-text,#14111F);
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif)}
.v-command-option[aria-selected="true"]{background:var(--v-surface-2,#FBF7F2);color:var(--v-primary,#6D3BF5)}
.v-command-hint{color:var(--v-text-muted,#6B6580);font-size:12px}
.v-command-empty{padding:18px;text-align:center;color:var(--v-text-muted,#6B6580);
  font:500 14px/1.4 var(--v-font-sans,system-ui,sans-serif)}

@media (prefers-reduced-motion: reduce){
  .v-tooltip,.v-popover,.v-dropdown-menu,.v-drawer-panel,.v-drawer-backdrop,.v-lazy,.v-accordion-header::after{
    transition-duration:.01ms !important}
  .v-skeleton{animation-duration:.01ms !important}
}
`;

/** Garante tokens e CSS dos componentes de UI antes do primeiro uso. */
function ensureUi(): void {
  ensureTokens();
  injectStyle('ui', UI_CSS);
}

// ---------------------------------------------------------------------------
// Leitura de atributos e opcoes
// ---------------------------------------------------------------------------

const optionValues = new WeakMap<Element, Record<string, string>>();

/** Le um atributo da Voodoo aceitando `v-nome` e `data-v-nome`. */
function attrOf(el: Element, name: string): string | null {
  return el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
}

/** Verifica a presenca de um atributo da Voodoo. */
function hasAttrOf(el: Element, name: string): boolean {
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}

/** Seletor CSS que casa com as duas grafias aceitas de um atributo. */
function selectorFor(name: string): string {
  return `[${config.prefix}${name}],[data-v-${name}]`;
}

/** Le o valor de uma opcao, primeiro do registro e depois do atributo cru. */
function readOption(el: Element, name: string): string | null {
  const bag = optionValues.get(el);
  if (bag && name in bag) return bag[name];
  return attrOf(el, name);
}

/**
 * Registra um atributo que existe apenas para configurar outra directive.
 * O valor fica guardado no registro de opcoes, o que evita reler o DOM e deixa
 * o atributo declarado no runtime em vez de solto no HTML.
 */
function defineOption(name: string): void {
  defineDirective(
    name,
    ({ el, expression }) => {
      const bag = optionValues.get(el) ?? {};
      bag[name] = expression;
      optionValues.set(el, bag);
    },
    { priority: PRIORITY.BIND }
  );
}

// ---------------------------------------------------------------------------
// Auxiliares de DOM
// ---------------------------------------------------------------------------

/** Resolve o alvo de uma directive: seletor informado ou o irmao seguinte. */
function resolveTarget(el: HTMLElement, expression: string): HTMLElement | null {
  const text = expression.trim();
  if (text) {
    try {
      const found = document.querySelector(text);
      if (found) return found as HTMLElement;
    } catch {
      // Seletor invalido cai no irmao seguinte.
    }
  }
  return (el.nextElementSibling as HTMLElement | null) ?? null;
}

/** Garante que o elemento tenha um id, criando um estavel quando faltar. */
function ensureId(el: Element, prefix: string): string {
  if (!el.id) el.id = uid(`${prefix}-`);
  return el.id;
}

/** Descendentes que casam com o seletor e pertencem a esta raiz, sem aninhados. */
function ownedBy(root: HTMLElement, childSelector: string, ownerSelector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(childSelector)).filter(
    (el) => el.closest(ownerSelector) === root
  );
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,object,embed,summary,' +
  '[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

/** Elementos focaveis e visiveis dentro de uma raiz. */
function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
  );
}

/** Prende o foco dentro da raiz enquanto o usuario navega com Tab. */
function trapTab(root: HTMLElement, event: KeyboardEvent): void {
  const items = focusableIn(root);
  if (!items.length) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Torna clicavel por teclado um elemento que nao e botao nativo. */
function makeInteractive(el: HTMLElement, cleanup: (fn: () => void) => void): void {
  const tag = el.tagName;
  if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SUMMARY') {
    el.classList.add('v-focus-ring');
    return;
  }
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.classList.add('v-focus-ring');

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    el.click();
  };
  el.addEventListener('keydown', onKey);
  cleanup(() => el.removeEventListener('keydown', onKey));
}

let scrollLocks = 0;
let savedPaddingRight = '';

/** Trava a rolagem do body compensando a largura da barra de rolagem. */
function lockScroll(): void {
  if (scrollLocks++ > 0) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  savedPaddingRight = document.body.style.paddingRight;
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  document.body.classList.add('v-scroll-lock');
}

/** Libera a rolagem quando a ultima camada aberta fecha. */
function unlockScroll(): void {
  if (scrollLocks === 0) return;
  if (--scrollLocks > 0) return;
  document.body.classList.remove('v-scroll-lock');
  document.body.style.paddingRight = savedPaddingRight;
}

let liveRegion: HTMLElement | null = null;

/** Anuncia uma mensagem curta para leitores de tela. */
function announce(message: string): void {
  if (typeof document === 'undefined') return;
  ensureUi();
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'v-visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }
  const region = liveRegion;
  region.textContent = '';
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}

/** Verifica se um elemento esta escondido no momento. */
function isHidden(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.style.display === 'none') return true;
  return el.isConnected ? getComputedStyle(el).display === 'none' : false;
}

/** Mostra um elemento, com fade quando o usuario aceita animacao. */
function showElement(el: HTMLElement, animated = true): void {
  el.removeAttribute('hidden');
  if (animated && !device.reducedMotion) {
    void fadeIn(el);
    return;
  }
  el.style.removeProperty('display');
  if (getComputedStyle(el).display === 'none') el.style.display = 'block';
}

/** Esconde um elemento, com fade quando o usuario aceita animacao. */
function hideElement(el: HTMLElement, animated = true): void {
  if (animated && !device.reducedMotion) {
    void fadeOut(el);
    return;
  }
  el.style.display = 'none';
}

/**
 * Avalia a expressao de uma directive de UI e devolve o resultado. Quando a
 * expressao e apenas o nome de uma funcao, a funcao e chamada com o detalhe.
 */
function callExpression(
  expression: string,
  scope: Scope,
  el: HTMLElement,
  event?: Event,
  detail?: unknown
): unknown {
  if (!expression.trim()) return undefined;
  const local = scope.child({ $el: el, $event: event ?? null, $detail: detail });
  const value = evaluateIn<unknown>(expression, local, 'directive de UI');
  if (typeof value === 'function') {
    return (value as (payload?: unknown) => unknown).call(scope.data, detail ?? event);
  }
  return value;
}

/** Dispara um evento customizado que sobe pela arvore. */
function dispatch(el: HTMLElement, type: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

// ---------------------------------------------------------------------------
// Posicionamento flutuante
// ---------------------------------------------------------------------------

/** Lados aceitos por tooltip, popover e menu suspenso. */
export type FloatingPlacement = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Record<FloatingPlacement, FloatingPlacement> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Normaliza o texto de um atributo de posicao. */
function parsePlacement(value: string | null, fallback: FloatingPlacement): FloatingPlacement {
  const text = (value || '').trim().toLowerCase();
  if (text === 'top' || text === 'bottom' || text === 'left' || text === 'right') return text;
  return fallback;
}

/**
 * Posiciona um elemento flutuante junto de uma ancora. Se nao couber no lado
 * preferido, vira para o lado oposto, e no fim gruda dentro da tela.
 */
function placeFloating(
  anchor: HTMLElement,
  floating: HTMLElement,
  preferred: FloatingPlacement,
  align: 'center' | 'start' = 'center',
  gap = 8
): FloatingPlacement {
  floating.style.position = 'fixed';
  floating.style.left = '0px';
  floating.style.top = '0px';

  const a = anchor.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  const room: Record<FloatingPlacement, number> = {
    top: a.top,
    bottom: vh - a.bottom,
    left: a.left,
    right: vw - a.right,
  };
  const need: Record<FloatingPlacement, number> = {
    top: f.height + gap,
    bottom: f.height + gap,
    left: f.width + gap,
    right: f.width + gap,
  };

  let side = preferred;
  if (room[side] < need[side]) {
    const other = OPPOSITE[side];
    if (room[other] >= need[other]) {
      side = other;
    } else {
      // Nenhum lado cabe: fica com o que tem mais folga.
      for (const key of Object.keys(room) as FloatingPlacement[]) {
        if (room[key] - need[key] > room[side] - need[side]) side = key;
      }
    }
  }

  let top = 0;
  let left = 0;

  if (side === 'top' || side === 'bottom') {
    top = side === 'top' ? a.top - f.height - gap : a.bottom + gap;
    left = align === 'start' ? a.left : a.left + a.width / 2 - f.width / 2;
    if (align === 'start' && left + f.width > vw - gap) left = a.right - f.width;
  } else {
    left = side === 'left' ? a.left - f.width - gap : a.right + gap;
    top = align === 'start' ? a.top : a.top + a.height / 2 - f.height / 2;
  }

  left = Math.min(Math.max(gap, left), Math.max(gap, vw - f.width - gap));
  top = Math.min(Math.max(gap, top), Math.max(gap, vh - f.height - gap));

  floating.style.left = `${Math.round(left)}px`;
  floating.style.top = `${Math.round(top)}px`;
  floating.setAttribute('data-placement', side);
  return side;
}

// ---------------------------------------------------------------------------
// Atalhos de teclado globais
// ---------------------------------------------------------------------------

interface ParsedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
  hasModifier: boolean;
}

export interface HotkeyOptions {
  /** Dispara mesmo com o foco dentro de um campo de texto. Padrao `false`. */
  allowInInput?: boolean;
  /** Cancela o comportamento padrao do navegador. Padrao `true`. */
  preventDefault?: boolean;
}

interface HotkeyEntry {
  combos: ParsedCombo[];
  handler: (event: KeyboardEvent) => void;
  options: HotkeyOptions;
}

const hotkeyEntries: HotkeyEntry[] = [];
let hotkeyListening = false;

const KEY_NAMES: Record<string, string> = {
  esc: 'escape',
  space: ' ',
  spacebar: ' ',
  enter: 'enter',
  ret: 'enter',
  del: 'delete',
  ins: 'insert',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  plus: '+',
  minus: '-',
  comma: ',',
  period: '.',
  slash: '/',
  question: '?',
};

/** Verdadeiro em teclados Apple, onde `mod` significa a tecla Command. */
const IS_APPLE =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

/** Converte `ctrl+shift+p` na descricao usada na comparacao. */
function parseCombo(text: string): ParsedCombo | null {
  const parts = text
    .trim()
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const combo: ParsedCombo = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
    hasModifier: false,
  };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') combo.ctrl = true;
    else if (part === 'shift') combo.shift = true;
    else if (part === 'alt' || part === 'option') combo.alt = true;
    else if (part === 'meta' || part === 'cmd' || part === 'command' || part === 'super') combo.meta = true;
    else if (part === 'mod') {
      if (IS_APPLE) combo.meta = true;
      else combo.ctrl = true;
    } else {
      combo.key = KEY_NAMES[part] ?? part;
    }
  }

  if (!combo.key) return null;
  combo.hasModifier = combo.ctrl || combo.alt || combo.meta;
  return combo;
}

/** Compara a tecla pressionada com um combo ja interpretado. */
function comboMatches(combo: ParsedCombo, event: KeyboardEvent): boolean {
  if (combo.ctrl !== event.ctrlKey) return false;
  if (combo.alt !== event.altKey) return false;
  if (combo.meta !== event.metaKey) return false;
  if (event.key.toLowerCase() !== combo.key) return false;

  // Simbolos como `?` so existem com Shift, entao a checagem e relaxada.
  const shiftImplied = combo.key.length === 1 && !/^[a-z0-9 ]$/.test(combo.key);
  if (shiftImplied) return combo.shift ? event.shiftKey : true;
  return combo.shift === event.shiftKey;
}

/** Descobre se o foco esta em um campo onde digitar tem prioridade. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  return el.isContentEditable === true;
}

/** Texto para `aria-keyshortcuts`, no formato que os leitores de tela esperam. */
function ariaShortcut(combo: ParsedCombo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push('Control');
  if (combo.alt) parts.push('Alt');
  if (combo.shift) parts.push('Shift');
  if (combo.meta) parts.push('Meta');
  parts.push(combo.key === ' ' ? 'Space' : combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join('+');
}

function onGlobalKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;
  const typing = isTypingTarget(event.target);

  // Copia a lista porque um atalho pode registrar ou remover outro.
  for (const entry of [...hotkeyEntries]) {
    for (const combo of entry.combos) {
      if (!comboMatches(combo, event)) continue;
      if (typing && !entry.options.allowInInput && !combo.hasModifier) continue;
      if (entry.options.preventDefault !== false) event.preventDefault();
      entry.handler(event);
      break;
    }
  }
}

/**
 * Registra um atalho global de teclado.
 *
 * ```js
 * const parar = V.hotkey('ctrl+k', () => abrirBusca())
 * parar() // remove o atalho
 * ```
 *
 * Aceita combinacoes (`ctrl+shift+p`, `alt+1`, `meta+k`, `mod+s`), teclas
 * isoladas (`?`, `Escape`) e varios combos separados por virgula. Combos sem
 * modificador nao disparam quando o foco esta em um campo de texto, para nao
 * atrapalhar quem esta digitando.
 *
 * @param combo combinacao de teclas
 * @param handler funcao executada quando o atalho e acionado
 * @param options ajustes de comportamento
 * @returns funcao que remove o atalho
 */
export function hotkey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
): () => void {
  const combos = combo
    .split(',')
    .map((part) => parseCombo(part))
    .filter((parsed): parsed is ParsedCombo => parsed !== null);

  if (!combos.length || typeof document === 'undefined') return () => undefined;

  const entry: HotkeyEntry = { combos, handler, options };
  hotkeyEntries.push(entry);

  if (!hotkeyListening) {
    hotkeyListening = true;
    document.addEventListener('keydown', onGlobalKeyDown);
  }

  return () => {
    const index = hotkeyEntries.indexOf(entry);
    if (index > -1) hotkeyEntries.splice(index, 1);
  };
}

// ---------------------------------------------------------------------------
// v-toggle
// ---------------------------------------------------------------------------

defineDirective('toggle', ({ el, expression, modifiers, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;

  const className = typeof modifiers.class === 'string' ? modifiers.class : null;
  const animated = !modifiers.instant;

  el.setAttribute('aria-controls', ensureId(target, 'v-toggle'));
  makeInteractive(el, cleanup);

  const isOpen = (): boolean =>
    className ? target.classList.contains(className) : !isHidden(target);

  const sync = (): void => {
    el.setAttribute('aria-expanded', String(isOpen()));
  };

  const onClick = (event: Event): void => {
    event.preventDefault();
    if (className) target.classList.toggle(className);
    else if (isHidden(target)) showElement(target, animated);
    else hideElement(target, animated);
    sync();
    dispatch(el, 'voodoo:toggle', { target, open: isOpen() });
  };

  sync();
  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

// ---------------------------------------------------------------------------
// v-collapse e v-collapse-toggle
// ---------------------------------------------------------------------------

/** Controle de um painel que abre e fecha com animacao de altura. */
class Collapse {
  readonly panel: HTMLElement;
  readonly triggers = new Set<HTMLElement>();
  readonly listeners = new Set<(open: boolean) => void>();
  open: boolean;
  duration: number;

  constructor(panel: HTMLElement) {
    this.panel = panel;
    this.duration = parseDuration(readOption(panel, 'collapse-duration'), 240);
    const initial = (readOption(panel, 'collapse') || '').trim().toLowerCase();
    this.open = initial === 'open' || initial === 'true' || !isHidden(panel);
    panel.classList.add('v-collapse-panel');
    ensureId(panel, 'v-collapse');
    if (!this.open) panel.style.display = 'none';
    this.sync();
  }

  /** Atualiza `aria-expanded` dos gatilhos e avisa quem observa. */
  sync(): void {
    for (const trigger of this.triggers) {
      trigger.setAttribute('aria-expanded', String(this.open));
      trigger.setAttribute('aria-controls', this.panel.id);
    }
    for (const listener of this.listeners) listener(this.open);
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.panel.removeAttribute('hidden');
    if (device.reducedMotion) this.panel.style.removeProperty('display');
    else void slideDown(this.panel, this.duration);
    this.sync();
    dispatch(this.panel, 'voodoo:collapse', { open: true });
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    if (device.reducedMotion) this.panel.style.display = 'none';
    else void slideUp(this.panel, this.duration);
    this.sync();
    dispatch(this.panel, 'voodoo:collapse', { open: false });
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }
}

const collapses = new WeakMap<HTMLElement, Collapse>();

/** Devolve o controle do painel, criando na primeira chamada. */
function collapseOf(panel: HTMLElement): Collapse {
  let controller = collapses.get(panel);
  if (!controller) collapses.set(panel, (controller = new Collapse(panel)));
  return controller;
}

defineDirective('collapse', ({ el }) => {
  ensureUi();
  collapseOf(el);
});

defineDirective('collapse-toggle', ({ el, expression, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;

  const controller = collapseOf(target);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener('click', onClick);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    controller.triggers.delete(el);
  });
});

defineOption('collapse-duration');

// ---------------------------------------------------------------------------
// v-dropdown, v-dropdown-menu e v-popover
// ---------------------------------------------------------------------------

/** Camada flutuante ligada a um gatilho, base do menu e do popover. */
class Popup {
  readonly trigger: HTMLElement;
  readonly panel: HTMLElement;
  readonly kind: 'menu' | 'dialog';
  readonly placement: FloatingPlacement;
  open = false;
  private lastFocus: HTMLElement | null = null;

  constructor(trigger: HTMLElement, panel: HTMLElement, kind: 'menu' | 'dialog') {
    this.trigger = trigger;
    this.panel = panel;
    this.kind = kind;
    this.placement = parsePlacement(
      readOption(trigger, kind === 'menu' ? 'dropdown-position' : 'popover-position'),
      'bottom'
    );

    ensureId(panel, kind === 'menu' ? 'v-menu' : 'v-popover');
    panel.classList.add(kind === 'menu' ? 'v-dropdown-menu' : 'v-popover');
    panel.hidden = true;
    if (kind === 'menu') prepareMenu(panel);
    else panel.setAttribute('role', 'dialog');

    trigger.setAttribute('aria-haspopup', kind === 'menu' ? 'menu' : 'dialog');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
  }

  /** Itens navegaveis pelas setas, apenas no modo menu. */
  items(): HTMLElement[] {
    return Array.from(this.panel.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }

  reposition = (): void => {
    if (!this.open) return;
    placeFloating(this.trigger, this.panel, this.placement, this.kind === 'menu' ? 'start' : 'center');
  };

  private onDocumentPointerDown = (event: Event): void => {
    const target = event.target as Node | null;
    if (!target) return;
    if (this.panel.contains(target) || this.trigger.contains(target)) return;
    this.hide();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide(true);
      return;
    }
    if (this.kind !== 'menu') {
      if (event.key === 'Tab') trapTab(this.panel, event);
      return;
    }

    const items = this.items();
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = (current + step + items.length) % items.length;
      items[current === -1 && step === -1 ? items.length - 1 : next].focus();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
      return;
    }
    if (event.key === 'Tab') this.hide();
  };

  show(): void {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement as HTMLElement | null;

    if (this.panel.parentElement !== document.body) document.body.appendChild(this.panel);
    this.panel.hidden = false;
    this.reposition();
    requestAnimationFrame(() => this.panel.classList.add('v-in'));

    this.trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    window.addEventListener('resize', this.reposition);
    window.addEventListener('scroll', this.reposition, true);

    if (this.kind === 'dialog') focusableIn(this.panel)[0]?.focus();
    dispatch(this.trigger, 'voodoo:popup', { open: true, panel: this.panel });
  }

  hide(restoreFocus = false): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('v-in');
    this.trigger.setAttribute('aria-expanded', 'false');

    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('resize', this.reposition);
    window.removeEventListener('scroll', this.reposition, true);

    const finish = (): void => {
      if (!this.open) this.panel.hidden = true;
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 160);

    if (restoreFocus) (this.lastFocus ?? this.trigger).focus();
    dispatch(this.trigger, 'voodoo:popup', { open: false, panel: this.panel });
  }

  toggle(): void {
    if (this.open) this.hide(true);
    else this.show();
  }

  /** Remove listeners e devolve o painel para onde ele estava. */
  dispose(): void {
    this.hide();
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    window.removeEventListener('resize', this.reposition);
    window.removeEventListener('scroll', this.reposition, true);
  }
}

/** Prepara um menu suspenso: papeis ARIA e itens focaveis. */
function prepareMenu(menu: HTMLElement): void {
  ensureUi();
  menu.classList.add('v-dropdown-menu');
  if (!menu.hasAttribute('role')) menu.setAttribute('role', 'menu');
  for (const item of Array.from(menu.children)) {
    const child = item as HTMLElement;
    if (child.hasAttribute('role')) continue;
    if (child.matches('a,button,[tabindex]')) {
      child.setAttribute('role', 'menuitem');
      child.setAttribute('tabindex', '-1');
    }
  }
}

defineDirective('dropdown-menu', ({ el }) => {
  prepareMenu(el);
});

defineDirective('dropdown', ({ el, expression, cleanup }) => {
  ensureUi();
  const menu = resolveTarget(el, expression);
  if (!menu) return;

  const popup = new Popup(el, menu, 'menu');
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    popup.toggle();
  };
  const onTriggerKey = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    if (!popup.open) popup.show();
    const items = popup.items();
    if (items.length) items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus();
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onTriggerKey);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onTriggerKey);
    popup.dispose();
  });
});

defineDirective('popover', ({ el, expression, cleanup }) => {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;

  const popup = new Popup(el, panel, 'dialog');
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    popup.toggle();
  };
  el.addEventListener('click', onClick);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    popup.dispose();
  });
});

defineOption('dropdown-position');
defineOption('popover-position');

// ---------------------------------------------------------------------------
// v-tooltip
// ---------------------------------------------------------------------------

defineDirective('tooltip', ({ el, expression, cleanup }) => {
  ensureUi();
  const text = expression.trim();
  if (!text) return;

  const placement = parsePlacement(readOption(el, 'tooltip-position'), 'top');
  const delay = parseDuration(readOption(el, 'tooltip-delay'), 200);

  let bubble: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const build = (): HTMLElement => {
    const node = document.createElement('div');
    node.className = 'v-tooltip';
    node.setAttribute('role', 'tooltip');
    node.id = uid('v-tip-');
    node.textContent = text;
    document.body.appendChild(node);
    return node;
  };

  const reposition = (): void => {
    if (bubble) placeFloating(el, bubble, placement);
  };

  const open = (): void => {
    if (bubble) return;
    bubble = build();
    el.setAttribute('aria-describedby', bubble.id);
    reposition();
    requestAnimationFrame(() => bubble?.classList.add('v-in'));
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  };

  const close = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!bubble) return;
    const node = bubble;
    bubble = null;
    el.removeAttribute('aria-describedby');
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    node.classList.remove('v-in');
    if (device.reducedMotion) node.remove();
    else setTimeout(() => node.remove(), 160);
  };

  const schedule = (): void => {
    if (timer || bubble) return;
    timer = setTimeout(() => {
      timer = null;
      open();
    }, delay);
  };

  const onEscape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
  };

  el.addEventListener('mouseenter', schedule);
  el.addEventListener('focusin', open);
  el.addEventListener('mouseleave', close);
  el.addEventListener('focusout', close);
  el.addEventListener('keydown', onEscape);

  cleanup(() => {
    close();
    el.removeEventListener('mouseenter', schedule);
    el.removeEventListener('focusin', open);
    el.removeEventListener('mouseleave', close);
    el.removeEventListener('focusout', close);
    el.removeEventListener('keydown', onEscape);
  });
});

defineOption('tooltip-position');
defineOption('tooltip-delay');

// ---------------------------------------------------------------------------
// v-tabs, v-tab e v-tab-panel
// ---------------------------------------------------------------------------

defineDirective('tabs', ({ el, expression, cleanup }) => {
  ensureUi();
  const tabs = ownedBy(el, selectorFor('tab'), selectorFor('tabs'));
  const panels = ownedBy(el, selectorFor('tab-panel'), selectorFor('tabs'));
  if (!tabs.length) return;

  const idOf = (tab: HTMLElement, index: number): string => attrOf(tab, 'tab') || String(index);
  const list = tabs[0].parentElement;
  if (list && !list.hasAttribute('role')) list.setAttribute('role', 'tablist');

  const urlKey = hasAttrOf(el, 'tabs-url') ? attrOf(el, 'tabs-url') || 'tab' : null;

  tabs.forEach((tab, index) => {
    const id = idOf(tab, index);
    const panel = panels.find((item) => attrOf(item, 'tab-panel') === id);
    tab.classList.add('v-tab', 'v-focus-ring');
    tab.setAttribute('role', 'tab');
    ensureId(tab, 'v-tab');
    if (panel) {
      ensureId(panel, 'v-panel');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.setAttribute('aria-controls', panel.id);
    }
  });

  let activeId = '';

  const activate = (id: string, focusTab = false): void => {
    if (!tabs.some((tab, index) => idOf(tab, index) === id)) return;
    activeId = id;

    tabs.forEach((tab, index) => {
      const selected = idOf(tab, index) === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      tab.classList.toggle('v-active', selected);
      if (selected && focusTab) tab.focus();
    });

    for (const panel of panels) {
      panel.hidden = attrOf(panel, 'tab-panel') !== id;
    }

    if (urlKey) url.set(urlKey, id);
    dispatch(el, 'voodoo:tab', { id });
  };

  const onClick = (event: Event): void => {
    const tab = (event.target as Element | null)?.closest(selectorFor('tab')) as HTMLElement | null;
    if (!tab || !tabs.includes(tab)) return;
    event.preventDefault();
    activate(idOf(tab, tabs.indexOf(tab)));
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const tab = (event.target as Element | null)?.closest(selectorFor('tab')) as HTMLElement | null;
    if (!tab || !tabs.includes(tab)) return;

    const current = tabs.indexOf(tab);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % tabs.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next === -1) return;

    event.preventDefault();
    activate(idOf(tabs[next], next), true);
  };

  const onPopState = (): void => {
    if (!urlKey) return;
    const wanted = url.get(urlKey);
    if (wanted && wanted !== activeId) activate(wanted);
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKeyDown);
  window.addEventListener('popstate', onPopState);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('popstate', onPopState);
  });

  const fromUrl = urlKey ? url.get(urlKey) : undefined;
  const initial = fromUrl || expression.trim() || idOf(tabs[0], 0);
  activate(initial);
  if (!activeId) activate(idOf(tabs[0], 0));
});

defineOption('tab');
defineOption('tab-panel');
defineOption('tabs-url');

// ---------------------------------------------------------------------------
// v-accordion e v-accordion-item
// ---------------------------------------------------------------------------

defineDirective('accordion', ({ el, cleanup }) => {
  ensureUi();
  const items = ownedBy(el, selectorFor('accordion-item'), selectorFor('accordion'));
  if (!items.length) return;

  const single = hasAttrOf(el, 'accordion-single');
  const headers: HTMLElement[] = [];
  const controllers: Collapse[] = [];

  for (const item of items) {
    const header = item.firstElementChild as HTMLElement | null;
    const panel = item.lastElementChild as HTMLElement | null;
    if (!header || !panel || header === panel) continue;

    const state = (attrOf(item, 'accordion-item') || '').trim().toLowerCase();
    if (state !== 'open' && state !== 'true') panel.style.display = 'none';

    const controller = collapseOf(panel);
    controller.triggers.add(header);
    controller.sync();

    header.classList.add('v-accordion-header', 'v-focus-ring');
    if (!header.hasAttribute('role')) header.setAttribute('role', 'button');
    if (!header.hasAttribute('tabindex')) header.setAttribute('tabindex', '0');

    headers.push(header);
    controllers.push(controller);
  }

  const onClick = (event: Event): void => {
    const header = (event.target as Element | null)?.closest('.v-accordion-header') as HTMLElement | null;
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;
    event.preventDefault();

    const controller = controllers[index];
    if (single && !controller.open) {
      for (const other of controllers) if (other !== controller) other.hide();
    }
    controller.toggle();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const header = (event.target as Element | null)?.closest('.v-accordion-header') as HTMLElement | null;
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      header.click();
      return;
    }
    let next = -1;
    if (event.key === 'ArrowDown') next = (index + 1) % headers.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + headers.length) % headers.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = headers.length - 1;
    if (next === -1) return;

    event.preventDefault();
    headers[next].focus();
  };

  el.addEventListener('click', onClick);
  el.addEventListener('keydown', onKeyDown);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    el.removeEventListener('keydown', onKeyDown);
  });
});

defineOption('accordion-item');
defineOption('accordion-single');

// ---------------------------------------------------------------------------
// v-drawer, v-drawer-content, v-drawer-close e v-offcanvas
// ---------------------------------------------------------------------------

/** Gaveta lateral com backdrop, trava de rolagem e foco preso. */
class Drawer {
  readonly panel: HTMLElement;
  readonly triggers = new Set<HTMLElement>();
  open = false;
  private backdrop: HTMLElement | null = null;
  private lastFocus: HTMLElement | null = null;

  constructor(panel: HTMLElement) {
    this.panel = panel;
    const side = (readOption(panel, 'drawer-side') || 'right').trim().toLowerCase();
    panel.classList.add('v-drawer-panel');
    panel.setAttribute('data-side', ['left', 'right', 'top', 'bottom'].includes(side) ? side : 'right');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    ensureId(panel, 'v-drawer');
    panel.hidden = true;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
      return;
    }
    if (event.key === 'Tab') trapTab(this.panel, event);
  };

  private onPointerDown = (event: Event): void => {
    const target = event.target as Node | null;
    if (!target || this.panel.contains(target)) return;
    for (const trigger of this.triggers) if (trigger.contains(target)) return;
    this.hide();
  };

  /** Mantem `aria-expanded` dos gatilhos em dia. */
  sync(): void {
    for (const trigger of this.triggers) {
      trigger.setAttribute('aria-expanded', String(this.open));
      trigger.setAttribute('aria-controls', this.panel.id);
      trigger.setAttribute('aria-haspopup', 'dialog');
    }
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement as HTMLElement | null;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'v-drawer-backdrop';
    this.backdrop.addEventListener('click', () => this.hide());
    document.body.appendChild(this.backdrop);

    this.panel.hidden = false;
    lockScroll();
    requestAnimationFrame(() => {
      this.backdrop?.classList.add('v-in');
      this.panel.classList.add('v-open');
    });

    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('pointerdown', this.onPointerDown, true);

    (focusableIn(this.panel)[0] ?? this.panel).focus();
    this.sync();
    dispatch(this.panel, 'voodoo:drawer', { open: true });
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('v-open');
    this.backdrop?.classList.remove('v-in');

    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('pointerdown', this.onPointerDown, true);

    const finish = (): void => {
      if (this.open) return;
      this.panel.hidden = true;
      this.backdrop?.remove();
      this.backdrop = null;
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 300);

    unlockScroll();
    this.lastFocus?.focus();
    this.sync();
    dispatch(this.panel, 'voodoo:drawer', { open: false });
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }
}

const drawers = new WeakMap<HTMLElement, Drawer>();

/** Devolve o controle da gaveta, criando na primeira chamada. */
function drawerOf(panel: HTMLElement): Drawer {
  let controller = drawers.get(panel);
  if (!controller) drawers.set(panel, (controller = new Drawer(panel)));
  return controller;
}

defineDirective('drawer-content', ({ el }) => {
  ensureUi();
  drawerOf(el);
});

/** Instala um gatilho que abre e fecha uma gaveta. */
function setupDrawerTrigger(
  el: HTMLElement,
  expression: string,
  cleanup: (fn: () => void) => void
): void {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;

  const controller = drawerOf(panel);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener('click', onClick);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    controller.triggers.delete(el);
  });
}

defineDirective('drawer', ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});

defineDirective('offcanvas', ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});

defineDirective('drawer-close', ({ el, expression, cleanup }) => {
  const panel = expression.trim()
    ? resolveTarget(el, expression)
    : (el.closest('.v-drawer-panel') as HTMLElement | null) ??
      (el.closest(selectorFor('drawer-content')) as HTMLElement | null);
  if (!panel) return;

  makeInteractive(el, cleanup);
  if (!el.hasAttribute('aria-label') && !el.textContent?.trim()) {
    el.setAttribute('aria-label', 'Fechar');
  }

  const onClick = (event: Event): void => {
    event.preventDefault();
    drawerOf(panel).hide();
  };
  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineOption('drawer-side');

// ---------------------------------------------------------------------------
// v-theme-toggle
// ---------------------------------------------------------------------------

defineDirective('theme-toggle', ({ el, cleanup }) => {
  makeInteractive(el, cleanup);

  const sync = (): void => {
    const dark = theme.resolved === 'dark';
    el.setAttribute('aria-pressed', String(dark));
    el.dataset.vTheme = theme.resolved;
    if (!el.hasAttribute('aria-label')) {
      el.setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    }
  };

  const onClick = (event: Event): void => {
    event.preventDefault();
    theme.toggle();
    sync();
  };
  const onThemeChange = (): void => sync();

  sync();
  el.addEventListener('click', onClick);
  document.addEventListener('voodoo:theme', onThemeChange);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    document.removeEventListener('voodoo:theme', onThemeChange);
  });
});

// ---------------------------------------------------------------------------
// v-focus e v-focus-trap
// ---------------------------------------------------------------------------

defineDirective(
  'focus',
  ({ el, expression, modifiers, effect, evaluate }) => {
    const apply = (): void => {
      el.focus({ preventScroll: !!modifiers.quiet });
      const field = el as HTMLInputElement;
      if (modifiers.select && typeof field.select === 'function') field.select();
    };

    if (!expression.trim()) {
      queuePostFlush(apply);
      return;
    }
    effect(() => {
      if (evaluate()) queuePostFlush(apply);
    });
  },
  { priority: PRIORITY.INIT }
);

defineDirective('focus-trap', ({ el, expression, effect, evaluate, cleanup }) => {
  let active = !expression.trim();

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!active || event.key !== 'Tab') return;
    if (!el.isConnected) return;
    trapTab(el, event);
  };

  if (expression.trim()) {
    effect(() => {
      const next = !!evaluate();
      if (next && !active) queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
      active = next;
    });
  } else {
    queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
  }

  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  document.addEventListener('keydown', onKeyDown, true);
  cleanup(() => document.removeEventListener('keydown', onKeyDown, true));
});

// ---------------------------------------------------------------------------
// v-click-outside e v-escape
// ---------------------------------------------------------------------------

defineDirective('click-outside', ({ el, expression, scope, cleanup }) => {
  const onPointerDown = (event: Event): void => {
    if (!el.isConnected) return;
    const target = event.target as Node | null;
    if (!target || el === target || el.contains(target)) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  cleanup(() => document.removeEventListener('pointerdown', onPointerDown, true));
});

defineDirective('escape', ({ el, expression, scope, cleanup }) => {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !el.isConnected) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener('keydown', onKeyDown);
  cleanup(() => document.removeEventListener('keydown', onKeyDown));
});

// ---------------------------------------------------------------------------
// v-hotkey
// ---------------------------------------------------------------------------

defineDirective('hotkey', ({ el, expression, modifiers, cleanup }) => {
  const combo = expression.trim();
  if (!combo) return;

  const off = hotkey(combo, () => el.click(), {
    allowInInput: !!modifiers.force,
    preventDefault: modifiers.default !== true,
  });

  const parsed = parseCombo(combo.split(',')[0]);
  if (parsed && !el.hasAttribute('aria-keyshortcuts')) {
    el.setAttribute('aria-keyshortcuts', ariaShortcut(parsed));
  }
  cleanup(off);
});

// ---------------------------------------------------------------------------
// v-scroll-to e v-scrollspy
// ---------------------------------------------------------------------------

defineDirective('scroll-to', ({ el, expression, cleanup }) => {
  const onClick = (event: Event): void => {
    const selector = expression.trim() || el.getAttribute('href') || '';
    if (!selector) return;
    event.preventDefault();

    const offset = parseFloat(readOption(el, 'scroll-offset') || '0') || 0;
    const behavior: ScrollBehavior = device.reducedMotion ? 'auto' : 'smooth';

    if (selector === 'top' || selector === '#top') {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    if (selector === 'bottom') {
      window.scrollTo({ top: document.body.scrollHeight, behavior });
      return;
    }

    let target: Element | null = null;
    try {
      target = document.querySelector(selector);
    } catch {
      target = null;
    }
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior });
    // Move o foco para a secao, senao o teclado continua no menu.
    const focusTarget = target as HTMLElement;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineDirective('scrollspy', ({ el, cleanup }) => {
  const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  if (!links.length) return;

  const activeClass = readOption(el, 'scrollspy-class') || 'v-active';
  const offset = parseFloat(readOption(el, 'scroll-offset') || '0') || 0;

  const sections = links
    .map((link) => {
      const id = link.getAttribute('href') || '';
      const section = id.length > 1 ? document.querySelector(id) : null;
      return section ? { link, section } : null;
    })
    .filter((pair): pair is { link: HTMLAnchorElement; section: Element } => pair !== null);

  if (!sections.length) return;

  let current: HTMLAnchorElement | null = null;

  const update = (): void => {
    let found = sections[0];
    for (const pair of sections) {
      if (pair.section.getBoundingClientRect().top - offset <= 8) found = pair;
    }
    if (found.link === current) return;
    current = found.link;

    for (const pair of sections) {
      const active = pair.link === current;
      pair.link.classList.toggle(activeClass, active);
      if (active) pair.link.setAttribute('aria-current', 'true');
      else pair.link.removeAttribute('aria-current');
    }
    dispatch(el, 'voodoo:scrollspy', { id: found.section.id, link: found.link });
  };

  const onScroll = throttle(update, 100);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  queuePostFlush(update);

  cleanup(() => {
    onScroll.cancel();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
});

defineOption('scroll-offset');
defineOption('scrollspy-class');

// ---------------------------------------------------------------------------
// v-sticky
// ---------------------------------------------------------------------------

defineDirective('sticky', ({ el, expression, cleanup }) => {
  ensureUi();
  const offset = parseFloat(expression.trim() || readOption(el, 'sticky-offset') || '0') || 0;
  el.classList.add('v-sticky');
  el.style.setProperty('--v-sticky-offset', `${offset}px`);

  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const stuck = entry.intersectionRatio < 1 && entry.boundingClientRect.top <= offset + 1;
        el.classList.toggle('v-stuck', stuck);
      }
    },
    { threshold: [1], rootMargin: `-${offset + 1}px 0px 0px 0px` }
  );

  observer.observe(el);
  cleanup(() => observer.disconnect());
});

defineOption('sticky-offset');

// ---------------------------------------------------------------------------
// v-visible e v-infinite-scroll
// ---------------------------------------------------------------------------

defineDirective('visible', ({ el, expression, scope, modifiers, cleanup }) => {
  const repeat = !!modifiers.repeat;
  const threshold = Number(modifiers.threshold ?? 0.1) || 0.1;
  const margin = typeof modifiers.margin === 'string' ? modifiers.margin : '0px';

  if (typeof IntersectionObserver === 'undefined') {
    callExpression(expression, scope, el, undefined, { visible: true });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callExpression(expression, scope, el, undefined, entry);
        if (!repeat) observer.unobserve(el);
      }
    },
    { threshold, rootMargin: margin }
  );

  observer.observe(el);
  cleanup(() => observer.disconnect());
});

defineDirective('infinite-scroll', ({ el, expression, scope, cleanup }) => {
  const distance = readOption(el, 'infinite-distance') || '200px';
  let loading = false;

  const release = (): void => {
    loading = false;
  };

  const run = (): void => {
    if (loading) return;
    loading = true;
    el.setAttribute('aria-busy', 'true');

    const result = callExpression(expression, scope, el, undefined, { page: 'next' });
    const done = (): void => {
      el.removeAttribute('aria-busy');
      // Pequeno intervalo evita disparo duplo enquanto o DOM cresce.
      setTimeout(release, 120);
    };

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<unknown>).then(done, done);
    } else {
      setTimeout(done, 300);
    }
  };

  if (typeof IntersectionObserver === 'undefined') return;

  const sentinel = document.createElement('div');
  sentinel.className = 'v-infinite-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'width:100%;height:1px;pointer-events:none';
  el.appendChild(sentinel);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) run();
    },
    { rootMargin: `0px 0px ${distance} 0px` }
  );

  observer.observe(sentinel);
  cleanup(() => {
    observer.disconnect();
    sentinel.remove();
  });
});

defineOption('infinite-distance');

// ---------------------------------------------------------------------------
// v-lazy-src e v-lazy-bg
// ---------------------------------------------------------------------------

/** Carrega uma imagem quando o elemento chega perto da area visivel. */
function setupLazy(
  el: HTMLElement,
  source: string,
  cleanup: (fn: () => void) => void,
  asBackground: boolean
): void {
  ensureUi();
  if (!source) return;

  el.classList.add('v-lazy');
  const apply = (href: string): void => {
    if (asBackground) el.style.backgroundImage = `url("${href}")`;
    else (el as HTMLImageElement).src = href;
    el.classList.add('v-lazy-loaded');
  };

  const load = (): void => {
    const preload = new Image();
    preload.onload = () => apply(source);
    preload.onerror = () => {
      const fallback = readOption(el, 'lazy-error');
      el.classList.add('v-lazy-failed');
      if (fallback) apply(fallback);
      else el.classList.add('v-lazy-loaded');
    };
    preload.src = source;
  };

  if (!asBackground && el.tagName === 'IMG') {
    const image = el as HTMLImageElement;
    if (!image.hasAttribute('loading')) image.loading = 'lazy';
    if (!image.hasAttribute('decoding')) image.decoding = 'async';
  }

  if (typeof IntersectionObserver === 'undefined') {
    load();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();
        load();
      }
    },
    { rootMargin: '200px' }
  );

  observer.observe(el);
  cleanup(() => observer.disconnect());
}

defineDirective('lazy-src', ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, false);
});

defineDirective('lazy-bg', ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, true);
});

defineOption('lazy-error');

// ---------------------------------------------------------------------------
// v-skeleton
// ---------------------------------------------------------------------------

defineDirective('skeleton', ({ el, expression, effect, evaluate, cleanup }) => {
  ensureUi();

  const apply = (loading: boolean): void => {
    el.classList.toggle('v-skeleton', loading);
    if (loading) el.setAttribute('aria-busy', 'true');
    else el.removeAttribute('aria-busy');
  };

  if (expression.trim()) {
    effect(() => apply(!!evaluate()));
    return;
  }

  const hasContent = (): boolean =>
    (el.textContent ?? '').trim().length > 0 || el.querySelector('img,svg,video,canvas') !== null;

  if (hasContent()) {
    apply(false);
    return;
  }

  apply(true);
  if (typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver(() => {
    if (!hasContent()) return;
    apply(false);
    observer.disconnect();
  });
  observer.observe(el, { childList: true, subtree: true, characterData: true });
  cleanup(() => observer.disconnect());
});

// ---------------------------------------------------------------------------
// v-copy e v-copy-from
// ---------------------------------------------------------------------------

/** Copia texto usando a API moderna, com plano B para navegadores antigos. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Sem permissao ou fora de contexto seguro: cai no plano B.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Mostra a confirmacao visual e sonora da copia por um instante. */
function flashCopied(el: HTMLElement, ok: boolean): void {
  ensureUi();
  const label = readOption(el, 'copy-label') || (ok ? 'Copiado!' : 'Nao foi possivel copiar');
  el.dataset.vCopyLabel = label;
  el.classList.add(ok ? 'v-copied' : 'v-copy-failed');
  announce(label);
  setTimeout(() => el.classList.remove('v-copied', 'v-copy-failed'), 1600);
}

/** Le o texto que deve ir para a area de transferencia. */
function copySource(el: HTMLElement, expression: string): string {
  const from = readOption(el, 'copy-from');
  if (from) {
    const source = document.querySelector(from) as HTMLElement | null;
    if (source) {
      const field = source as HTMLInputElement;
      if (typeof field.value === 'string' && field.value) return field.value;
      return (source.textContent ?? '').trim();
    }
  }
  return expression.trim();
}

defineDirective('copy', ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    const text = copySource(el, expression);
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch(el, 'voodoo:copy', { text, ok });
    });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineDirective('copy-from', ({ el, expression, cleanup }) => {
  ensureUi();
  const bag = optionValues.get(el) ?? {};
  bag['copy-from'] = expression;
  optionValues.set(el, bag);

  // Sem `v-copy` no mesmo elemento, `v-copy-from` sozinho ja funciona.
  if (hasAttrOf(el, 'copy')) return;
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    const text = copySource(el, '');
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch(el, 'voodoo:copy', { text, ok });
    });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineOption('copy-label');

// ---------------------------------------------------------------------------
// v-print
// ---------------------------------------------------------------------------

/** Imprime somente o trecho informado, herdando o CSS da pagina. */
function printElement(target: HTMLElement, title: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', 'Impressao');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style'))
    .map((node) => node.outerHTML)
    .join('\n');

  frame.srcdoc =
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<title>${escapeHtml(title)}</title>${styles}</head>` +
    `<body>${target.outerHTML}</body></html>`;

  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  });

  document.body.appendChild(frame);
}

defineDirective('print', ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    const selector = expression.trim();
    const target = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
    if (!selector) {
      window.print();
      return;
    }
    if (target) printElement(target, document.title);
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

// ---------------------------------------------------------------------------
// v-share
// ---------------------------------------------------------------------------

defineDirective('share', ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    event.preventDefault();
    const link = expression.trim() || readOption(el, 'share-url') || location.href;
    const data: ShareData = {
      title: readOption(el, 'share-title') || document.title,
      url: link,
    };
    const text = readOption(el, 'share-text');
    if (text) data.text = text;

    const nav = navigator as Navigator & { share?: (payload: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') {
      void nav.share(data).then(
        () => dispatch(el, 'voodoo:share', { data, method: 'native' }),
        () => undefined
      );
      return;
    }

    void copyText(link).then((ok) => {
      flashCopied(el, ok);
      dispatch(el, 'voodoo:share', { data, method: 'clipboard', ok });
    });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineOption('share-title');
defineOption('share-url');
defineOption('share-text');

// ---------------------------------------------------------------------------
// v-fullscreen e v-download
// ---------------------------------------------------------------------------

defineDirective('fullscreen', ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const target = expression.trim()
    ? (document.querySelector(expression.trim()) as HTMLElement | null) ?? el
    : el;

  const sync = (): void => {
    el.setAttribute('aria-pressed', String(document.fullscreenElement === target));
  };

  const onClick = (event: Event): void => {
    event.preventDefault();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }
    const legacy = target as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (typeof target.requestFullscreen === 'function') {
      void target.requestFullscreen().catch(() => undefined);
    } else {
      legacy.webkitRequestFullscreen?.();
    }
  };

  sync();
  el.addEventListener('click', onClick);
  document.addEventListener('fullscreenchange', sync);
  cleanup(() => {
    el.removeEventListener('click', onClick);
    document.removeEventListener('fullscreenchange', sync);
  });
});

defineDirective('download', ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);

  const onClick = (event: Event): void => {
    const href = expression.trim() || el.getAttribute('href') || '';
    if (!href) return;
    event.preventDefault();

    const link = document.createElement('a');
    link.href = href;
    link.rel = 'noopener';
    link.download = readOption(el, 'download-name') || '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    dispatch(el, 'voodoo:download', { href, name: link.download });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});

defineOption('download-name');

// ---------------------------------------------------------------------------
// v-sortable
// ---------------------------------------------------------------------------

/** Identificador de um item da lista, usado no evento `voodoo:sorted`. */
function itemKey(item: HTMLElement, index: number): string {
  return item.getAttribute('data-id') ?? (item.id || String(index));
}

defineDirective('sortable', ({ el, expression, cleanup }) => {
  ensureUi();
  el.classList.add('v-sortable');
  const handleSelector = expression.trim();

  const items = (): HTMLElement[] =>
    Array.from(el.children).filter(
      (child) => !child.classList.contains('v-sort-placeholder')
    ) as HTMLElement[];

  for (const item of items()) {
    if (handleSelector) {
      const handle = item.querySelector<HTMLElement>(handleSelector);
      handle?.classList.add('v-sort-handle');
    } else {
      item.classList.add('v-sort-handle');
    }
    if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
  }
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Lista reordenavel');

  let dragging: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let startIndex = -1;
  let grabX = 0;
  let grabY = 0;
  let started = false;
  let pointerId = -1;

  const finishOrder = (item: HTMLElement, from: number): void => {
    const list = items();
    const to = list.indexOf(item);
    const order = list.map((child, index) => itemKey(child, index));
    dispatch(el, 'voodoo:sorted', { item, from, to, order });
    announce(`Item movido para a posicao ${to + 1} de ${list.length}`);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (handleSelector && !target.closest(handleSelector)) return;

    const item = target.closest(':scope > *') as HTMLElement | null;
    const list = items();
    const found = list.find((child) => child === item || child.contains(target));
    if (!found) return;

    dragging = found;
    startIndex = list.indexOf(found);
    const rect = found.getBoundingClientRect();
    grabX = event.clientX - rect.left;
    grabY = event.clientY - rect.top;
    started = false;
    pointerId = event.pointerId;

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const beginDrag = (event: PointerEvent): void => {
    if (!dragging) return;
    const rect = dragging.getBoundingClientRect();

    placeholder = document.createElement('div');
    placeholder.className = 'v-sort-placeholder';
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.width = `${rect.width}px`;
    placeholder.setAttribute('aria-hidden', 'true');
    dragging.parentNode?.insertBefore(placeholder, dragging);

    dragging.classList.add('v-sort-dragging');
    dragging.style.width = `${rect.width}px`;
    dragging.style.height = `${rect.height}px`;
    dragging.style.left = `${event.clientX - grabX}px`;
    dragging.style.top = `${event.clientY - grabY}px`;
    started = true;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== pointerId) return;
    if (!started) {
      if (Math.abs(event.clientY - (dragging.getBoundingClientRect().top + grabY)) < 4) {
        if (Math.abs(event.clientX - (dragging.getBoundingClientRect().left + grabX)) < 4) return;
      }
      beginDrag(event);
    }
    if (!placeholder) return;
    event.preventDefault();

    dragging.style.left = `${event.clientX - grabX}px`;
    dragging.style.top = `${event.clientY - grabY}px`;

    let reference: HTMLElement | null = null;
    for (const child of items()) {
      if (child === dragging) continue;
      const rect = child.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        reference = child;
        break;
      }
    }
    if (reference !== placeholder.nextElementSibling) {
      el.insertBefore(placeholder, reference);
    }
  };

  const onPointerUp = (): void => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);

    const item = dragging;
    dragging = null;
    pointerId = -1;
    if (!item) return;

    item.classList.remove('v-sort-dragging');
    item.style.removeProperty('width');
    item.style.removeProperty('height');
    item.style.removeProperty('left');
    item.style.removeProperty('top');

    if (placeholder) {
      el.insertBefore(item, placeholder);
      placeholder.remove();
      placeholder = null;
      finishOrder(item, startIndex);
    }
    started = false;
  };

  // Reordenacao por teclado, essencial para quem nao usa mouse.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const item = (event.target as Element | null)?.closest(':scope > *') as HTMLElement | null;
    const list = items();
    const found = list.find((child) => child === item || child.contains(event.target as Node));
    if (!found) return;

    const from = list.indexOf(found);
    const to = event.key === 'ArrowUp' ? from - 1 : from + 1;
    if (to < 0 || to >= list.length) return;

    event.preventDefault();
    if (event.key === 'ArrowUp') el.insertBefore(found, list[to]);
    else el.insertBefore(found, list[to].nextSibling);
    found.focus();
    finishOrder(found, from);
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('keydown', onKeyDown);
  cleanup(() => {
    onPointerUp();
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('keydown', onKeyDown);
  });
});

// ---------------------------------------------------------------------------
// v-resizable
// ---------------------------------------------------------------------------

defineDirective('resizable', ({ el, expression, cleanup }) => {
  ensureUi();
  const mode = (expression.trim() || 'both').toLowerCase();
  const horizontal = mode === 'both' || mode === 'horizontal';
  const vertical = mode === 'both' || mode === 'vertical';

  el.classList.add('v-resizable');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const handles: HTMLElement[] = [];
  const directions: string[] = [];
  if (horizontal) directions.push('right');
  if (vertical) directions.push('bottom');
  if (horizontal && vertical) directions.push('corner');

  const startResize = (handle: HTMLElement, direction: string): void => {
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    const onMove = (event: PointerEvent): void => {
      if (direction !== 'bottom') el.style.width = `${Math.max(32, startWidth + event.clientX - startX)}px`;
      if (direction !== 'right') el.style.height = `${Math.max(32, startHeight + event.clientY - startY)}px`;
    };
    const onUp = (event: PointerEvent): void => {
      handle.releasePointerCapture?.(event.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      dispatch(el, 'voodoo:resized', {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      });
    };

    handle.addEventListener('pointerdown', (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      handle.setPointerCapture?.(event.pointerId);
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });

    handle.addEventListener('keydown', (event: KeyboardEvent) => {
      const step = event.shiftKey ? 4 : 16;
      const rect = el.getBoundingClientRect();
      let handled = true;
      if (event.key === 'ArrowRight' && direction !== 'bottom') el.style.width = `${rect.width + step}px`;
      else if (event.key === 'ArrowLeft' && direction !== 'bottom') el.style.width = `${Math.max(32, rect.width - step)}px`;
      else if (event.key === 'ArrowDown' && direction !== 'right') el.style.height = `${rect.height + step}px`;
      else if (event.key === 'ArrowUp' && direction !== 'right') el.style.height = `${Math.max(32, rect.height - step)}px`;
      else handled = false;

      if (!handled) return;
      event.preventDefault();
      dispatch(el, 'voodoo:resized', {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      });
    });
  };

  for (const direction of directions) {
    const handle = document.createElement('div');
    handle.className = 'v-resize-handle';
    handle.setAttribute('data-dir', direction);
    handle.setAttribute('role', 'separator');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute(
      'aria-orientation',
      direction === 'bottom' ? 'horizontal' : 'vertical'
    );
    handle.setAttribute('aria-label', 'Redimensionar');
    startResize(handle, direction);
    el.appendChild(handle);
    handles.push(handle);
  }

  cleanup(() => {
    for (const handle of handles) handle.remove();
  });
});

// ---------------------------------------------------------------------------
// v-command e v-command-item
// ---------------------------------------------------------------------------

interface CommandOption {
  label: string;
  hint: string;
  el: HTMLElement;
}

let openPalette: (() => void) | null = null;

/** Remove acentos e caixa para comparar textos de busca. */
function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Reune os comandos declarados na pagina com `v-command-item`. */
function collectCommands(): CommandOption[] {
  const out: CommandOption[] = [];
  for (const item of Array.from(document.querySelectorAll<HTMLElement>(selectorFor('command-item')))) {
    const label = (attrOf(item, 'command-item') || item.textContent || '').trim();
    if (!label) continue;
    if (item.closest('[hidden]')) continue;
    out.push({ label, hint: readOption(item, 'command-hint') || '', el: item });
  }
  return out;
}

/** Abre a paleta de comandos e devolve a funcao que fecha. */
function showCommandPalette(): void {
  ensureUi();
  if (document.querySelector('.v-command')) return;

  const commands = collectCommands();
  const lastFocus = document.activeElement as HTMLElement | null;

  const overlay = document.createElement('div');
  overlay.className = 'v-command';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Paleta de comandos');

  const box = document.createElement('div');
  box.className = 'v-command-box';

  const input = document.createElement('input');
  input.className = 'v-command-input';
  input.type = 'search';
  input.placeholder = 'Buscar comando...';
  input.setAttribute('aria-label', 'Buscar comando');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('autocomplete', 'off');

  const list = document.createElement('ul');
  list.className = 'v-command-list';
  list.id = uid('v-cmd-list-');
  list.setAttribute('role', 'listbox');
  input.setAttribute('aria-controls', list.id);

  box.append(input, list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  lockScroll();

  let visible: CommandOption[] = commands;
  let cursor = 0;

  const close = (): void => {
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    unlockScroll();
    lastFocus?.focus();
  };

  const execute = (): void => {
    const option = visible[cursor];
    if (!option) return;
    close();
    option.el.click();
  };

  const render = (): void => {
    list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('li');
      empty.className = 'v-command-empty';
      empty.textContent = 'Nenhum comando encontrado';
      list.appendChild(empty);
      return;
    }

    visible.forEach((option, index) => {
      const row = document.createElement('li');
      row.className = 'v-command-option';
      row.id = `${list.id}-${index}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(index === cursor));

      const label = document.createElement('span');
      label.textContent = option.label;
      row.appendChild(label);

      if (option.hint) {
        const hint = document.createElement('span');
        hint.className = 'v-command-hint';
        hint.textContent = option.hint;
        row.appendChild(hint);
      }

      row.addEventListener('click', () => {
        cursor = index;
        execute();
      });
      row.addEventListener('pointermove', () => {
        if (cursor === index) return;
        cursor = index;
        render();
      });
      list.appendChild(row);
    });

    const active = list.children[cursor] as HTMLElement | undefined;
    if (active) {
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }
  };

  const filter = (): void => {
    const term = normalizeSearch(input.value.trim());
    visible = term
      ? commands.filter((option) => normalizeSearch(`${option.label} ${option.hint}`).includes(term))
      : commands;
    cursor = 0;
    render();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      cursor = visible.length ? (cursor + 1) % visible.length : 0;
      render();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      cursor = visible.length ? (cursor - 1 + visible.length) % visible.length : 0;
      render();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      execute();
      return;
    }
    if (event.key === 'Tab') trapTab(overlay, event);
  };

  overlay.addEventListener('pointerdown', (event: Event) => {
    if (event.target === overlay) close();
  });
  input.addEventListener('input', filter);
  document.addEventListener('keydown', onKeyDown, true);

  render();
  input.focus();
}

openPalette = showCommandPalette;

defineDirective('command', ({ el, expression, cleanup }) => {
  ensureUi();
  const combo = expression.trim() || readOption(el, 'command-key') || 'mod+k';

  const open = (): void => {
    openPalette?.();
  };
  const onClick = (event: Event): void => {
    event.preventDefault();
    open();
  };

  const off = hotkey(combo, open, { allowInInput: true });
  const parsed = parseCombo(combo.split(',')[0]);
  if (parsed && !el.hasAttribute('aria-keyshortcuts')) {
    el.setAttribute('aria-keyshortcuts', ariaShortcut(parsed));
  }

  makeInteractive(el, cleanup);
  el.addEventListener('click', onClick);
  cleanup(() => {
    off();
    el.removeEventListener('click', onClick);
  });
});

defineDirective('command-item', ({ el, expression }) => {
  const bag = optionValues.get(el) ?? {};
  bag['command-item'] = expression;
  optionValues.set(el, bag);
  if (!el.hasAttribute('data-v-command-label') && expression.trim()) {
    el.setAttribute('data-v-command-label', expression.trim());
  }
});

defineOption('command-key');
defineOption('command-hint');

// ---------------------------------------------------------------------------
// v-idle
// ---------------------------------------------------------------------------

const IDLE_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

defineDirective('idle', ({ el, expression, scope, cleanup }) => {
  const after = parseDuration(readOption(el, 'idle-after'), 60_000);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fired = false;

  const trigger = (): void => {
    fired = true;
    callExpression(expression, scope, el, undefined, { idle: true, after });
    dispatch(el, 'voodoo:idle', { after });
  };

  const reset = (): void => {
    if (timer) clearTimeout(timer);
    fired = false;
    timer = setTimeout(trigger, after);
  };

  const onActivity = (): void => {
    if (fired) {
      // Depois de disparar, so rearma quando o usuario volta a interagir.
      reset();
      return;
    }
    reset();
  };

  for (const type of IDLE_EVENTS) {
    window.addEventListener(type, onActivity, { passive: true });
  }
  reset();

  cleanup(() => {
    if (timer) clearTimeout(timer);
    for (const type of IDLE_EVENTS) window.removeEventListener(type, onActivity);
  });
});

defineOption('idle-after');

// ---------------------------------------------------------------------------
// v-online e v-offline
// ---------------------------------------------------------------------------

/** Instala a reacao a mudanca de conexao. */
function setupConnection(
  el: HTMLElement,
  expression: string,
  scope: Scope,
  cleanup: (fn: () => void) => void,
  wanted: 'online' | 'offline',
  immediate: boolean
): void {
  const handler = (event?: Event): void => {
    callExpression(expression, scope, el, event, { online: navigator.onLine });
    dispatch(el, `voodoo:${wanted}`, { online: navigator.onLine });
  };

  window.addEventListener(wanted, handler);
  cleanup(() => window.removeEventListener(wanted, handler));

  if (immediate && navigator.onLine === (wanted === 'online')) queuePostFlush(() => handler());
}

defineDirective('online', ({ el, expression, scope, modifiers, cleanup }) => {
  setupConnection(el, expression, scope, cleanup, 'online', !!modifiers.immediate);
});

defineDirective('offline', ({ el, expression, scope, modifiers, cleanup }) => {
  // Dispara na montagem por padrao. `.no-immediate` desliga esse primeiro disparo.
  setupConnection(el, expression, scope, cleanup, 'offline', modifiers['no-immediate'] !== true);
});
