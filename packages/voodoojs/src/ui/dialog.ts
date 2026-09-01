/**
 * @module ui/dialog
 *
 * Accessible dialog engine: generic modal, `alert`, `confirm`, and `prompt`.
 *
 * All share the same core: darkened backdrop, scroll lock, focus trapped
 * within the panel, focus restored on close, closing via Escape or backdrop
 * click, entrance and exit animations, and stacking of multiple open dialogs
 * at the same time.
 *
 * ```js
 * V.modal.open('#login')
 * await V.alert('File uploaded.')
 * if (await V.confirm('Delete the order?')) remove()
 * const name = await V.prompt('What should we call you?')
 * ```
 *
 * ```html
 * <button v-modal="#login">Sign in</button>
 * <div id="login" v-modal-content>
 *   <h2>Sign in</h2>
 *   <button v-modal-close>Close</button>
 * </div>
 * <button v-confirm="Delete for real?" v-click="remove()">Delete</button>
 * ```
 */

import { ensureTokens, injectStyle } from '../dom/style';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { readAttr } from '../runtime/walker';
import { magic } from '../runtime/scope';
import { uid } from '../utils';
import { ensurePalette } from './palette';

// ---------------------------------------------------------------------------
// Default text
// ---------------------------------------------------------------------------

/** Button texts and default messages, all configurable. */
export interface DialogLabels {
  confirm: string;
  cancel: string;
  ok: string;
  close: string;
  /** Message used by `v-confirm` when the attribute is empty. */
  confirmQuestion: string;
  /** Error shown by `prompt` when the required field is empty. */
  required: string;
}

const labels: DialogLabels = {
  confirm: 'Confirm',
  cancel: 'Cancel',
  ok: 'OK',
  close: 'Close',
  confirmQuestion: 'Are you sure?',
  required: 'Please fill in this field.',
};

const settings = {
  /** Duration of entrance and exit animation, in milliseconds. */
  duration: 220,
  /** Default size of dialogs created by `dialog()`. */
  size: 'md' as DialogSize,
};

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

const CSS = `
[v-modal-content]:not(.v-dialog-open),[data-v-modal-content]:not(.v-dialog-open){display:none}

.v-dialog-root{position:fixed;inset:0;z-index:calc(var(--v-z-modal,1000) + var(--v-dialog-layer,0));
  display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;
  overscroll-behavior:contain;font-family:var(--v-font-sans,system-ui,sans-serif)}
.v-dialog-root[data-position="top"]{align-items:flex-start;padding-top:min(12vh,96px)}

.v-dialog-backdrop{position:fixed;inset:0;background:var(--v-overlay,rgba(20,17,31,.45));
  opacity:0;transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-backdrop{opacity:1}
.v-dialog-root.is-closing>.v-dialog-backdrop{opacity:0}

.v-dialog-panel{position:relative;z-index:1;width:100%;max-width:var(--v-dialog-w,32rem);
  max-height:calc(100vh - 32px);display:flex;flex-direction:column;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-lg,18px);
  box-shadow:var(--v-shadow-lg,0 24px 60px rgba(20,17,31,.2));
  opacity:0;transform:translateY(14px) scale(.975);
  transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease),transform var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-panel{opacity:1;transform:none}
.v-dialog-root.is-closing>.v-dialog-panel{opacity:0;transform:translateY(10px) scale(.985)}
.v-dialog-panel:focus{outline:none}
.v-dialog-panel.is-plain{background:none;border:0;box-shadow:none}

.v-dialog-root[data-size="sm"]{--v-dialog-w:24rem}
.v-dialog-root[data-size="md"]{--v-dialog-w:32rem}
.v-dialog-root[data-size="lg"]{--v-dialog-w:46rem}
.v-dialog-root[data-size="xl"]{--v-dialog-w:64rem}
.v-dialog-root[data-size="full"]{--v-dialog-w:calc(100vw - 32px)}

.v-dialog-head{display:flex;gap:14px;align-items:flex-start;padding:22px 22px 0}
.v-dialog-icon{flex:none;width:38px;height:38px;border-radius:var(--v-radius-full,999px);
  display:grid;place-items:center;background:var(--v-primary-soft,#EEE9FF);color:var(--v-primary-soft-text,#4B21B8)}
.v-dialog-icon svg{width:20px;height:20px}
.v-dialog-icon[data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-dialog-icon[data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text)}
.v-dialog-icon[data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-dialog-heading{flex:1;min-width:0}
.v-dialog-title{margin:0;font-size:17px;font-weight:650;line-height:1.35;color:var(--v-text,#14111F)}
.v-dialog-desc{margin:6px 0 0;font-size:14px;line-height:1.55;color:var(--v-text-muted,#6B6580)}

.v-dialog-body{padding:16px 22px;overflow:auto;font-size:14px;line-height:1.6;color:var(--v-text,#14111F)}
.v-dialog-head+.v-dialog-body{padding-top:14px}
.v-dialog-body>p{margin:0 0 10px}
.v-dialog-body>p:last-child{margin-bottom:0}

.v-dialog-foot{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding:6px 22px 20px}

.v-dialog-x{position:absolute;top:12px;right:12px;width:32px;height:32px;display:grid;place-items:center;
  border:0;border-radius:var(--v-radius-sm,8px);background:transparent;color:var(--v-text-muted,#6B6580);
  cursor:pointer;transition:background .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dialog-x:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text,#14111F)}
.v-dialog-x:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dialog-x svg{width:16px;height:16px}

.v-dlg-btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;
  gap:8px;min-height:38px;padding:0 16px;border-radius:var(--v-radius-sm,8px);border:1px solid transparent;
  font-family:inherit;font-size:14px;font-weight:600;line-height:1;cursor:pointer;
  transition:background .15s var(--v-ease,ease),border-color .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dlg-btn:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dlg-btn[disabled]{opacity:.55;cursor:not-allowed}

.v-dlg-btn[data-variant="primary"]{background:var(--v-primary);color:var(--v-primary-contrast);border-color:var(--v-primary)}
.v-dlg-btn[data-variant="primary"]:hover{background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-dlg-btn[data-variant="danger"]{background:var(--v-danger);color:var(--v-danger-contrast);border-color:var(--v-danger)}
.v-dlg-btn[data-variant="danger"]:hover{background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-dlg-btn[data-variant="success"]{background:var(--v-success);color:var(--v-success-contrast);border-color:var(--v-success)}
.v-dlg-btn[data-variant="success"]:hover{background:var(--v-success-hover);border-color:var(--v-success-hover);color:var(--v-success-contrast-hover)}
.v-dlg-btn[data-variant="secondary"]{background:var(--v-surface);color:var(--v-text);border-color:var(--v-border-strong,#CFC6E4)}
.v-dlg-btn[data-variant="secondary"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}
.v-dlg-btn[data-variant="ghost"]{background:transparent;color:var(--v-text-muted);border-color:transparent}
.v-dlg-btn[data-variant="ghost"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}

.v-dialog-field{display:flex;flex-direction:column;gap:6px}
.v-dialog-label{font-size:13px;font-weight:600;color:var(--v-text,#14111F)}
.v-dialog-input{appearance:none;-webkit-appearance:none;width:100%;min-height:40px;padding:9px 12px;
  font-family:inherit;font-size:14px;line-height:1.4;color:var(--v-text,#14111F);
  background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius-sm,8px);transition:border-color .15s var(--v-ease,ease),box-shadow .15s var(--v-ease,ease)}
textarea.v-dialog-input{min-height:96px;resize:vertical}
.v-dialog-input::placeholder{color:var(--v-text-soft,#9A93B4)}
.v-dialog-input:focus{outline:none;border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring,rgba(109,59,245,.32))}
.v-dialog-input[aria-invalid="true"]{border-color:var(--v-danger)}
.v-dialog-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px var(--v-danger-ring)}
.v-dialog-hint{font-size:12.5px;line-height:1.45;color:var(--v-text-muted,#6B6580)}
.v-dialog-error{font-size:12.5px;line-height:1.45;font-weight:600;color:var(--v-danger)}

@media (max-width:520px){
  .v-dialog-root{padding:12px}
  .v-dialog-foot{flex-direction:column-reverse}
  .v-dlg-btn{width:100%}
}
@media (prefers-reduced-motion: reduce){
  .v-dialog-backdrop,.v-dialog-panel{transition:none}
}
`;

function ensureStyles(): void {
  ensureTokens();
  ensurePalette();
  injectStyle('dialog', CSS);
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICONS: Record<string, string> = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.2 12.3 2.6 2.6 5-5.2"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.6 2.9 19.4h18.2z"/><path d="M12 10v4M12 17.2v.2"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.8.7-.8 1.3v.5M12 16.6v.2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type DialogTone = 'default' | 'success' | 'warning' | 'danger';
export type DialogIcon = 'info' | 'success' | 'warning' | 'danger' | 'question' | 'none';

/** Common options for any dialog. */
export interface ModalOptions {
  /** Close when clicking the darkened backdrop. Default `true`. */
  closeOnBackdrop?: boolean;
  /** Close when pressing Escape. Default `true`. */
  closeOnEscape?: boolean;
  /** Maximum width of the panel. Default `md`. */
  size?: DialogSize;
  /** Vertical alignment. Default `center`. */
  position?: 'center' | 'top';
  /** Lock page scrolling while open. Default `true`. */
  lockScroll?: boolean;
  /** Restore focus to the previous element on close. Default `true`. */
  restoreFocus?: boolean;
  /** Show the close button in the corner. Default `true`. */
  closable?: boolean;
  /** Remove background, border, and shadow from the panel. */
  plain?: boolean;
  /** Extra classes applied to the panel. */
  className?: string;
  /** Selector or element that receives initial focus. */
  initialFocus?: string | HTMLElement | null;
  /** Label read by screen readers when there is no visible title. */
  ariaLabel?: string;
  onOpen?(handle: DialogHandle): void;
  onClose?(result: unknown, handle: DialogHandle): void;
}

/** Control of an open dialog. */
export interface DialogHandle {
  id: string;
  /** Fixed layer covering the screen. */
  root: HTMLElement;
  /** Panel where the content appears. */
  panel: HTMLElement;
  /** Panel body, useful for injecting content after opening. */
  body: HTMLElement;
  /** Key used by `modal.close('#login')`. */
  key: string | null;
  /** Page element adopted by the dialog, if any. */
  source: HTMLElement | null;
  /** Close the dialog, resolving `closed` with the result. */
  close(result?: unknown): void;
  /** Resolved when the dialog finishes closing. */
  closed: Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Stack, scroll lock, and focus management
// ---------------------------------------------------------------------------

interface StackEntry {
  handle: DialogHandle;
  options: ModalOptions;
  previousFocus: Element | null;
  locked: boolean;
}

const stack: StackEntry[] = [];
const byRoot = new WeakMap<HTMLElement, StackEntry>();

let scrollLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function lockScroll(): void {
  if (scrollLocks++ > 0) return;
  const body = document.body;
  previousOverflow = body.style.overflow;
  previousPaddingRight = body.style.paddingRight;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = 'hidden';
  if (gap > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + gap}px`;
  }
}

function unlockScroll(): void {
  if (scrollLocks === 0) return;
  if (--scrollLocks > 0) return;
  document.body.style.overflow = previousOverflow;
  document.body.style.paddingRight = previousPaddingRight;
}

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,object,embed,' +
  '[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

function top(): StackEntry | undefined {
  return stack[stack.length - 1];
}

function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let listening = false;

function onKeydown(event: KeyboardEvent): void {
  const entry = top();
  if (!entry) return;

  if (event.key === 'Escape') {
    if (entry.options.closeOnEscape === false) return;
    event.preventDefault();
    entry.handle.close(undefined);
    return;
  }

  if (event.key !== 'Tab') return;
  // Trap focus: Tab on the last element returns to first, Shift+Tab on first
  // goes to the last.
  const items = focusableIn(entry.handle.panel);
  if (!items.length) {
    event.preventDefault();
    entry.handle.panel.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !entry.handle.panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onFocusIn(event: FocusEvent): void {
  const entry = top();
  if (!entry) return;
  const target = event.target as Node | null;
  if (target && entry.handle.root.contains(target)) return;
  // Focus escaped the dialog, typically via browser Tab. Bring it back.
  const items = focusableIn(entry.handle.panel);
  (items[0] ?? entry.handle.panel).focus();
}

function startListening(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('focusin', onFocusIn, true);
}

function stopListening(): void {
  if (!listening) return;
  listening = false;
  document.removeEventListener('keydown', onKeydown, true);
  document.removeEventListener('focusin', onFocusIn, true);
}

// ---------------------------------------------------------------------------
// Opening and closing
// ---------------------------------------------------------------------------

interface OpenRequest extends ModalOptions {
  /** Mounted content that becomes the panel body. */
  content?: Node | null;
  /** Page element to be adopted and returned on close. */
  source?: HTMLElement | null;
  key?: string | null;
  role?: 'dialog' | 'alertdialog';
  labelledBy?: string | null;
  describedBy?: string | null;
}

function openDialog(request: OpenRequest): DialogHandle {
  ensureStyles();

  const id = uid('v-dialog-');
  const duration = reducedMotion() ? 0 : settings.duration;

  const root = document.createElement('div');
  root.className = 'v-dialog-root';
  root.id = id;
  root.setAttribute('data-size', request.size ?? settings.size);
  root.setAttribute('data-position', request.position ?? 'center');
  root.style.setProperty('--v-dialog-ms', `${duration}ms`);
  // Cada dialogo empilhado sobe duas camadas acima do anterior, sem fixar o
  // valor do token `--v-z-modal`.
  root.style.setProperty('--v-dialog-layer', String(stack.length * 2));

  const backdrop = document.createElement('div');
  backdrop.className = 'v-dialog-backdrop';
  root.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'v-dialog-panel';
  if (request.plain) panel.classList.add('is-plain');
  if (request.className) panel.classList.add(...request.className.split(/\s+/).filter(Boolean));
  panel.setAttribute('role', request.role ?? 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.tabIndex = -1;
  if (request.labelledBy) panel.setAttribute('aria-labelledby', request.labelledBy);
  else if (request.ariaLabel) panel.setAttribute('aria-label', request.ariaLabel);
  if (request.describedBy) panel.setAttribute('aria-describedby', request.describedBy);
  root.appendChild(panel);

  const body = document.createElement('div');
  body.className = 'v-dialog-body';

  if (request.source) {
    // The page element becomes the content. The anchor saves the original location
    // to return it exactly where it was when the dialog closes.
    const anchor = document.createComment(' v-modal ');
    request.source.parentNode?.insertBefore(anchor, request.source);
    sourceAnchors.set(request.source, anchor);
    request.source.classList.add('v-dialog-open');
    request.source.removeAttribute('hidden');
    body.appendChild(request.source);
  } else if (request.content) {
    body.appendChild(request.content);
  }

  panel.appendChild(body);

  if (request.closable !== false) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'v-dialog-x';
    close.setAttribute('aria-label', labels.close);
    close.innerHTML = ICONS.close;
    close.addEventListener('click', () => handle.close(undefined));
    panel.appendChild(close);
  }

  let settled = false;
  let resolveClosed: (value: unknown) => void = () => undefined;
  const closed = new Promise<unknown>((resolve) => {
    resolveClosed = resolve;
  });

  const handle: DialogHandle = {
    id,
    root,
    panel,
    body,
    key: request.key ?? null,
    source: request.source ?? null,
    closed,
    close(result?: unknown): void {
      if (settled) return;
      settled = true;

      const index = stack.findIndex((item) => item.handle === handle);
      if (index > -1) stack.splice(index, 1);
      byRoot.delete(root);
      if (entry.locked) unlockScroll();
      if (!stack.length) stopListening();

      root.classList.remove('is-open');
      root.classList.add('is-closing');

      const finish = (): void => {
        // The adopted element is returned to its place before removing the layer,
        // otherwise the DOM observer would unmount its directives.
        const source = request.source;
        if (source) {
          const anchor = sourceAnchors.get(source);
          source.classList.remove('v-dialog-open');
          if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(source, anchor);
            anchor.remove();
          } else {
            source.remove();
          }
          sourceAnchors.delete(source);
          if (source.hasAttribute(`${config.prefix}modal-content`) || source.hasAttribute('data-v-modal-content')) {
            source.setAttribute('hidden', '');
          }
        }
        root.remove();
        request.onClose?.(result, handle);
        resolveClosed(result);

        if (request.restoreFocus !== false) {
          const previous = entry.previousFocus as HTMLElement | null;
          if (previous && typeof previous.focus === 'function' && previous.isConnected) {
            previous.focus();
          }
        }
      };

      if (duration > 0) setTimeout(finish, duration);
      else finish();
    },
  };

  const entry: StackEntry = {
    handle,
    options: request,
    previousFocus: document.activeElement,
    locked: request.lockScroll !== false,
  };

  // Close only when the entire click happens on the backdrop. A drag that
  // starts inside the panel generates a click on the root, not the backdrop,
  // and therefore does not close the dialog.
  backdrop.addEventListener('click', () => {
    if (request.closeOnBackdrop === false) return;
    handle.close(undefined);
  });

  if (entry.locked) lockScroll();
  stack.push(entry);
  byRoot.set(root, entry);
  startListening();

  document.body.appendChild(root);

  requestAnimationFrame(() => {
    root.classList.add('is-open');
    const target = resolveInitialFocus(request, panel);
    target?.focus();
  });

  request.onOpen?.(handle);
  return handle;
}

const sourceAnchors = new WeakMap<HTMLElement, Comment>();

function resolveInitialFocus(request: OpenRequest, panel: HTMLElement): HTMLElement | null {
  const wanted = request.initialFocus;
  if (wanted instanceof HTMLElement) return wanted;
  if (typeof wanted === 'string') {
    const found = panel.querySelector<HTMLElement>(wanted);
    if (found) return found;
  }
  const auto = panel.querySelector<HTMLElement>('[autofocus],[data-autofocus]');
  if (auto) return auto;
  const items = focusableIn(panel);
  return items[0] ?? panel;
}

// ---------------------------------------------------------------------------
// modal
// ---------------------------------------------------------------------------

function resolveTarget(target: string | HTMLElement): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  const selector = String(target ?? '').trim();
  if (!selector) return null;
  const query = /^[\w-]+$/.test(selector) ? `#${selector}` : selector;
  return document.querySelector<HTMLElement>(query);
}

function keyOf(target: string | HTMLElement): string | null {
  if (typeof target === 'string') return target.trim() || null;
  return target.id ? `#${target.id}` : null;
}

function findByKey(key: string): StackEntry | undefined {
  const normalized = /^[\w-]+$/.test(key) ? `#${key}` : key;
  return stack.find((entry) => {
    if (entry.handle.key === key || entry.handle.key === normalized) return true;
    const source = entry.handle.source;
    return !!source && source.matches?.(normalized);
  });
}

/**
 * Control of modals created from elements already on the page.
 *
 * ```js
 * V.modal.open('#login', { size: 'sm' })
 * V.modal.close('#login')
 * V.modal.isOpen()
 * ```
 */
export const modal = {
  /** Open a page element as a modal. Accepts a selector or the element itself. */
  open(target: string | HTMLElement, options: ModalOptions = {}): DialogHandle | null {
    const element = resolveTarget(target);
    if (!element) {
      // eslint-disable-next-line no-console
      console.warn(`[Voodoo] modal.open: target not found (${String(target)}).`);
      return null;
    }
    const key = keyOf(target) ?? (element.id ? `#${element.id}` : null);
    const existing = key ? findByKey(key) : undefined;
    if (existing) return existing.handle;

    // A title within the content becomes the accessible label of the dialog.
    const heading = element.querySelector<HTMLElement>('[data-dialog-title],h1,h2,h3');
    if (heading && !heading.id) heading.id = uid('v-dialog-title-');

    return openDialog({
      ...options,
      source: element,
      key,
      labelledBy: heading?.id ?? null,
    });
  },

  /** Close the indicated modal, or the one at the top of the stack. */
  close(target?: string | HTMLElement, result?: unknown): void {
    if (target === undefined) {
      top()?.handle.close(result);
      return;
    }
    const key = keyOf(target);
    const entry = key ? findByKey(key) : undefined;
    entry?.handle.close(result);
  },

  /** Close all open dialogs, from top to bottom. */
  closeAll(result?: unknown): void {
    for (const entry of [...stack].reverse()) entry.handle.close(result);
  },

  /** Open if closed, close if open. */
  toggle(target: string | HTMLElement, options: ModalOptions = {}): DialogHandle | null {
    const key = keyOf(target);
    const entry = key ? findByKey(key) : undefined;
    if (entry) {
      entry.handle.close(undefined);
      return null;
    }
    return this.open(target, options);
  },

  /** Check if a specific modal, or any, is open. */
  isOpen(target?: string | HTMLElement): boolean {
    if (target === undefined) return stack.length > 0;
    const key = keyOf(target);
    return !!(key && findByKey(key));
  },

  /** Open dialogs, from oldest to newest. */
  get opened(): DialogHandle[] {
    return stack.map((entry) => entry.handle);
  },

  /** Number of open dialogs. */
  get count(): number {
    return stack.length;
  },

  /** Adjust animation duration and default size. */
  configure(options: Partial<typeof settings>): void {
    Object.assign(settings, options);
  },

  /** Change the default button texts. */
  labels(next: Partial<DialogLabels>): DialogLabels {
    Object.assign(labels, next);
    return labels;
  },
};

// ---------------------------------------------------------------------------
// dialog()
// ---------------------------------------------------------------------------

/** Button shown in a dialog footer. */
export interface DialogButton {
  label: string;
  /** Value delivered by the promise when this button is clicked. */
  value?: unknown;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  /** Close the dialog on click. Default `true`. */
  close?: boolean;
  /** Receive focus as soon as the dialog opens. */
  autofocus?: boolean;
  /** Execute before closing. Return `false` to keep the dialog open. */
  onClick?(handle: DialogHandle): unknown;
}

/** Options for `V.dialog()`. */
export interface DialogOptions extends ModalOptions {
  title?: string;
  description?: string;
  /** Plain text body, inserted without interpreting HTML. */
  text?: string;
  /** Body HTML. Use only with your own content. */
  html?: string;
  /** Ready node to become the body, useful for hand-built forms. */
  node?: Node;
  buttons?: DialogButton[];
  icon?: DialogIcon;
  tone?: DialogTone;
}

/**
 * Generic dialog with title, description, content, and buttons.
 *
 * ```js
 * const choice = await V.dialog({
 *   title: 'Publish now?',
 *   description: 'The change will be visible to everyone.',
 *   buttons: [
 *     { label: 'Cancel', variant: 'secondary', value: null },
 *     { label: 'Publish', variant: 'primary', value: 'publish', autofocus: true }
 *   ]
 * })
 * ```
 *
 * @returns the `value` of the clicked button, or `null` when the dialog is dismissed
 */
export function dialog<T = unknown>(options: DialogOptions): Promise<T | null> {
  ensureStyles();

  const fragment = document.createDocumentFragment();
  const titleId = options.title ? uid('v-dialog-title-') : null;
  const descId = options.description ? uid('v-dialog-desc-') : null;

  let head: HTMLElement | null = null;
  if (options.title || options.description || options.icon) {
    head = document.createElement('div');
    head.className = 'v-dialog-head';

    const iconName = options.icon && options.icon !== 'none' ? options.icon : null;
    if (iconName && ICONS[iconName]) {
      const icon = document.createElement('div');
      icon.className = 'v-dialog-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.setAttribute('data-tone', options.tone ?? toneOfIcon(iconName));
      icon.innerHTML = ICONS[iconName];
      head.appendChild(icon);
    }

    const heading = document.createElement('div');
    heading.className = 'v-dialog-heading';
    if (options.title) {
      const title = document.createElement('h2');
      title.className = 'v-dialog-title';
      title.id = titleId as string;
      title.textContent = options.title;
      heading.appendChild(title);
    }
    if (options.description) {
      const desc = document.createElement('p');
      desc.className = 'v-dialog-desc';
      desc.id = descId as string;
      desc.textContent = options.description;
      heading.appendChild(desc);
    }
    head.appendChild(heading);
  }

  const content = document.createDocumentFragment();
  if (options.text) {
    for (const line of options.text.split('\n')) {
      const p = document.createElement('p');
      p.textContent = line;
      content.appendChild(p);
    }
  }
  if (options.html) {
    const holder = document.createElement('div');
    holder.innerHTML = options.html;
    while (holder.firstChild) content.appendChild(holder.firstChild);
  }
  if (options.node) content.appendChild(options.node);
  fragment.appendChild(content);

  const buttons = options.buttons ?? [
    { label: labels.ok, value: true, variant: 'primary' as const, autofocus: true },
  ];

  return new Promise<T | null>((resolve) => {
    const handle: DialogHandle = openDialog({
      ...options,
      content: fragment,
      role: options.tone === 'danger' ? 'alertdialog' : 'dialog',
      labelledBy: titleId,
      describedBy: descId,
      key: null,
      onClose(result) {
        options.onClose?.(result, handle);
        resolve((result === undefined ? null : result) as T | null);
      },
    });

    if (head) handle.panel.insertBefore(head, handle.body);

    if (buttons.length) {
      const foot = document.createElement('div');
      foot.className = 'v-dialog-foot';
      for (const button of buttons) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'v-dlg-btn';
        element.setAttribute('data-variant', button.variant ?? 'secondary');
        element.textContent = button.label;
        if (button.autofocus) element.setAttribute('data-autofocus', '');
        element.addEventListener('click', () => {
          const outcome = button.onClick?.(handle);
          if (outcome === false) return;
          if (button.close === false) return;
          handle.close(button.value ?? null);
        });
        foot.appendChild(element);
      }
      handle.panel.appendChild(foot);
    }

    // Empty body should not take space between title and buttons.
    if (!handle.body.childNodes.length) handle.body.remove();
  });
}

function toneOfIcon(icon: DialogIcon): string {
  if (icon === 'success' || icon === 'warning' || icon === 'danger') return icon;
  return 'default';
}

// ---------------------------------------------------------------------------
// alert, confirm, prompt
// ---------------------------------------------------------------------------

/** Options for `V.alert()`. */
export interface AlertOptions extends ModalOptions {
  title?: string;
  description?: string;
  icon?: DialogIcon;
  tone?: DialogTone;
  /** Text of the single button. Default `OK`. */
  confirmLabel?: string;
}

/**
 * Alert with a single button.
 *
 * ```js
 * await V.alert('Order sent successfully.', { icon: 'success' })
 * ```
 */
export function alert(message: string, options: AlertOptions = {}): Promise<void> {
  return dialog({
    icon: 'info',
    size: 'sm',
    ...options,
    text: message,
    buttons: [
      {
        label: options.confirmLabel ?? labels.ok,
        value: true,
        variant: options.tone === 'danger' ? 'danger' : 'primary',
        autofocus: true,
      },
    ],
  }).then(() => undefined);
}

/** Options for `V.confirm()`. */
export interface ConfirmOptions extends ModalOptions {
  title?: string;
  description?: string;
  icon?: DialogIcon;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shortcut for `tone: 'danger'`, with red button. */
  danger?: boolean;
}

/**
 * Yes or no question.
 *
 * ```js
 * if (await V.confirm('Delete the order?', { danger: true })) remove()
 * ```
 */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const tone: DialogTone = options.danger ? 'danger' : options.tone ?? 'default';
  return dialog<boolean>({
    icon: tone === 'danger' ? 'warning' : 'question',
    size: 'sm',
    ...options,
    tone,
    text: message,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: false, variant: 'secondary' },
      {
        label: options.confirmLabel ?? labels.confirm,
        value: true,
        variant: tone === 'danger' ? 'danger' : 'primary',
        autofocus: true,
      },
    ],
  }).then((result) => result === true);
}

/** Types accepted by the `prompt` field. */
export type PromptType = 'text' | 'password' | 'email' | 'number' | 'textarea';

/** Options for `V.prompt()`. */
export interface PromptOptions extends ModalOptions {
  title?: string;
  description?: string;
  icon?: DialogIcon;
  type?: PromptType;
  /** Initial field value. */
  value?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return a message to block submission, or `null` to allow. */
  validate?(value: string): string | null | undefined;
}

/**
 * Question expecting text input. The field opens focused and validation keeps
 * the dialog open until the value is accepted.
 *
 * ```js
 * const email = await V.prompt('Contact email', {
 *   type: 'email',
 *   required: true,
 *   validate: (v) => v.includes('@') ? null : 'Please enter a valid email.'
 * })
 * ```
 *
 * @returns the typed text, or `null` when the user cancels
 */
export function prompt(label: string, options: PromptOptions = {}): Promise<string | null> {
  ensureStyles();

  const type = options.type ?? 'text';
  const fieldId = uid('v-prompt-');
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const field = document.createElement('div');
  field.className = 'v-dialog-field';

  const labelElement = document.createElement('label');
  labelElement.className = 'v-dialog-label';
  labelElement.htmlFor = fieldId;
  labelElement.textContent = label;
  field.appendChild(labelElement);

  const input =
    type === 'textarea'
      ? document.createElement('textarea')
      : (document.createElement('input') as HTMLInputElement);
  input.className = 'v-dialog-input';
  input.id = fieldId;
  if (input instanceof HTMLInputElement) input.type = type === 'textarea' ? 'text' : type;
  input.value = options.value ?? '';
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.required) input.required = true;
  input.setAttribute('data-autofocus', '');
  field.appendChild(input);

  if (options.hint) {
    const hint = document.createElement('p');
    hint.className = 'v-dialog-hint';
    hint.id = hintId;
    hint.textContent = options.hint;
    field.appendChild(hint);
    input.setAttribute('aria-describedby', hintId);
  }

  const error = document.createElement('p');
  error.className = 'v-dialog-error';
  error.id = errorId;
  error.hidden = true;
  error.setAttribute('role', 'alert');
  field.appendChild(error);

  const readValue = (): string => (type === 'number' ? input.value.trim() : input.value);

  const check = (handle: DialogHandle): boolean => {
    const value = readValue();
    let message: string | null | undefined = null;
    if (options.required && !value.trim()) message = labels.required;
    else message = options.validate?.(value) ?? null;

    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorId);
      input.focus();
      return false;
    }

    error.hidden = true;
    input.removeAttribute('aria-invalid');
    handle.close(value);
    return true;
  };

  let confirmHandle: DialogHandle | null = null;

  // Enter submits, except in textarea, where the key needs to break the line.
  const control: HTMLElement = input;
  control.addEventListener('keydown', (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.key !== 'Enter') return;
    if (type === 'textarea' && !key.ctrlKey && !key.metaKey) return;
    event.preventDefault();
    if (confirmHandle) check(confirmHandle);
  });

  return dialog<string>({
    icon: 'question',
    size: 'sm',
    ...options,
    node: field,
    text: undefined,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: null, variant: 'secondary' },
      {
        label: options.confirmLabel ?? labels.confirm,
        variant: 'primary',
        close: false,
        onClick(handle) {
          confirmHandle = handle;
          check(handle);
          return false;
        },
      },
    ],
    onOpen(handle) {
      confirmHandle = handle;
      options.onOpen?.(handle);
    },
  }).then((result) => (typeof result === 'string' ? result : null));
}

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/**
 * `v-modal="#login"` opens the modal on click.
 * Modifiers: `.close` closes instead of opening, `.toggle` toggles.
 */
defineDirective('modal', ({ el, expression, modifiers, cleanup }) => {
  const target = expression.trim();
  el.setAttribute('aria-haspopup', 'dialog');

  const handler = (event: Event): void => {
    event.preventDefault();
    if (modifiers.close) {
      modal.close(target || undefined);
      return;
    }
    if (modifiers.toggle) {
      if (target) modal.toggle(target);
      return;
    }
    if (target) modal.open(target);
  };

  el.addEventListener('click', handler);
  cleanup(() => el.removeEventListener('click', handler));
});

/**
 * `v-modal-content` marks a section of the page as modal content. The block
 * stays hidden until `modal.open()` adopts it.
 */
defineDirective(
  'modal-content',
  ({ el }) => {
    ensureStyles();
    if (!el.id) el.id = uid('v-modal-');
    if (!el.classList.contains('v-dialog-open')) el.setAttribute('hidden', '');
  },
  { priority: PRIORITY.REF }
);

/** `v-modal-close` closes the dialog containing the element. */
defineDirective('modal-close', ({ el, expression, cleanup }) => {
  const handler = (event: Event): void => {
    event.preventDefault();
    const root = el.closest('.v-dialog-root') as HTMLElement | null;
    const entry = root ? byRoot.get(root) : undefined;
    if (entry) entry.handle.close(expression.trim() || undefined);
    else modal.close(undefined, expression.trim() || undefined);
  };
  el.addEventListener('click', handler);
  cleanup(() => el.removeEventListener('click', handler));
});

// While the confirmed click is replaying, the guard lets the event through.
let replaying = false;

/**
 * `v-confirm="Are you sure?"` intercepts the click, asks the question, and only
 * releases the original action after a yes. Works with `v-click`, `@click`, links,
 * and submit buttons on the same element, because the guard runs in the capture phase,
 * before any other listener.
 */
defineDirective(
  'confirm',
  ({ el, expression, modifiers, cleanup }) => {
    const message = expression.trim() || labels.confirmQuestion;

    const guard = (event: Event): void => {
      if (replaying) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const origin = (event.target instanceof HTMLElement ? event.target : el) as HTMLElement;
      // Read via cache, because the click happens after HTML cleanup.
      const title = readAttr(el, `${config.prefix}confirm-title`) ?? undefined;
      const confirmLabel = readAttr(el, `${config.prefix}confirm-label`) ?? undefined;
      const cancelLabel = readAttr(el, `${config.prefix}confirm-cancel`) ?? undefined;

      void confirm(message, {
        title,
        confirmLabel,
        cancelLabel,
        danger: !!modifiers.danger,
        size: 'sm',
      }).then((ok) => {
        if (!ok) return;
        replaying = true;
        try {
          origin.click();
        } finally {
          replaying = false;
        }
      });
    };

    el.addEventListener('click', guard, true);
    cleanup(() => el.removeEventListener('click', guard, true));
  },
  { priority: PRIORITY.REF }
);

// ---------------------------------------------------------------------------
// Magic variables
// ---------------------------------------------------------------------------

magic('$modal', () => modal);
magic('$dialog', () => dialog);
magic('$alert', () => alert);
magic('$confirm', () => confirm);
magic('$prompt', () => prompt);

export { labels as dialogLabels };
