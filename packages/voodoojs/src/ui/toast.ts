/**
 * @module ui/toast
 *
 * Temporary notifications. No dependencies, with queue, mouse-over pause,
 * progress bar, optional action, and promise support.
 *
 * ```js
 * V.toast.success('User saved!')
 * V.toast.promise(save(), { loading: 'Saving', success: 'Done', error: 'Failed' })
 * ```
 */

import { injectStyle, ensureTokens } from '../dom/style';
import { uid } from '../utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';
export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastOptions {
  title?: string;
  description?: string;
  type?: ToastType;
  /** Milliseconds until close. `0` keeps it open until the user closes it. */
  duration?: number;
  position?: ToastPosition;
  /** Action button inside the notification. */
  action?: { label: string; onClick: () => void };
  /** Show the close button. */
  closable?: boolean;
  /** Custom HTML in place of default content. Use with caution. */
  html?: string;
  onClose?: () => void;
}

export interface ToastHandle {
  id: string;
  close(): void;
  update(options: Partial<ToastOptions>): void;
}

const CSS = `
.v-toaster{position:fixed;z-index:var(--v-z-toast,1100);display:flex;flex-direction:column;gap:10px;padding:16px;pointer-events:none;max-width:min(420px,calc(100vw - 32px))}
.v-toaster[data-pos^="top"]{top:0}
.v-toaster[data-pos^="bottom"]{bottom:0;flex-direction:column-reverse}
.v-toaster[data-pos$="right"]{right:0;align-items:flex-end}
.v-toaster[data-pos$="left"]{left:0;align-items:flex-start}
.v-toaster[data-pos$="center"]{left:50%;transform:translateX(-50%);align-items:center}

.v-toast{pointer-events:auto;position:relative;display:flex;gap:12px;align-items:flex-start;
  min-width:280px;max-width:100%;padding:14px 16px;border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  font:500 14px/1.45 var(--v-font-sans,system-ui,sans-serif);
  opacity:0;transform:translateY(-8px) scale(.98);
  transition:opacity .22s var(--v-ease,ease),transform .22s var(--v-ease,ease)}
.v-toaster[data-pos^="bottom"] .v-toast{transform:translateY(8px) scale(.98)}
.v-toast.v-in{opacity:1;transform:none}
.v-toast.v-out{opacity:0;transform:translateY(-8px) scale(.98)}

.v-toast-icon{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;
  font-size:12px;font-weight:700;color:#fff;margin-top:1px}
.v-toast-body{flex:1;min-width:0}
.v-toast-title{font-weight:650}
.v-toast-desc{margin-top:2px;font-weight:450;color:var(--v-text-muted,#6B6580);font-size:13px;overflow-wrap:anywhere}
.v-toast-action{flex:none;background:transparent;border:1px solid var(--v-border,#E6E0F0);
  border-radius:8px;padding:5px 10px;font:600 12px/1 inherit;color:var(--v-primary,#6D3BF5);cursor:pointer}
.v-toast-action:hover{background:var(--v-surface-2,#FBF7F2)}
.v-toast-close{flex:none;background:none;border:0;cursor:pointer;color:var(--v-text-muted,#6B6580);
  font-size:18px;line-height:1;padding:0 2px;opacity:.7}
.v-toast-close:hover{opacity:1}

.v-toast-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;transform-origin:left;
  border-radius:0 0 var(--v-radius,12px) var(--v-radius,12px);opacity:.55}
.v-toast:hover .v-toast-bar{animation-play-state:paused}
@keyframes v-toast-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}

.v-toast[data-type="success"] .v-toast-icon,.v-toast[data-type="success"] .v-toast-bar{background:var(--v-success,#2ED9A5)}
.v-toast[data-type="error"] .v-toast-icon,.v-toast[data-type="error"] .v-toast-bar{background:var(--v-danger,#FF4D4D)}
.v-toast[data-type="warning"] .v-toast-icon,.v-toast[data-type="warning"] .v-toast-bar{background:var(--v-warning,#FFB35C)}
.v-toast[data-type="info"] .v-toast-icon,.v-toast[data-type="info"] .v-toast-bar{background:var(--v-info,#9B7BFF)}
.v-toast[data-type="default"] .v-toast-icon,.v-toast[data-type="default"] .v-toast-bar{background:var(--v-primary,#6D3BF5)}
.v-toast[data-type="loading"] .v-toast-icon{background:transparent;border:2px solid var(--v-border,#E6E0F0);
  border-top-color:var(--v-primary,#6D3BF5);animation:v-spin .7s linear infinite}
@keyframes v-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.v-toast{transition:none}}
`;

const ICONS: Record<ToastType, string> = {
  success: 'ok',
  error: '!',
  warning: '!',
  info: 'i',
  loading: '',
  default: '',
};

const containers = new Map<ToastPosition, HTMLElement>();

const settings = {
  duration: 4000,
  position: 'top-right' as ToastPosition,
  max: 6,
};

function container(position: ToastPosition): HTMLElement {
  ensureTokens();
  injectStyle('toast', CSS);
  let element = containers.get(position);
  if (element && element.isConnected) return element;

  element = document.createElement('div');
  element.className = 'v-toaster';
  element.setAttribute('data-pos', position);
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(element);
  containers.set(position, element);
  return element;
}

function render(options: ToastOptions): ToastHandle {
  const position = options.position ?? settings.position;
  const type = options.type ?? 'default';
  const duration = options.duration ?? (type === 'loading' ? 0 : settings.duration);
  const parent = container(position);
  const id = uid('toast-');

  const element = document.createElement('div');
  element.className = 'v-toast';
  element.id = id;
  element.setAttribute('data-type', type);
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  // The body is replaced wholesale when a toast is updated, so the region has to
  // be announced as a unit. Without this a screen reader reads only the changed
  // node, which on a toast is often a fragment with no context.
  element.setAttribute('aria-atomic', 'true');

  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const close = (): void => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    element.classList.add('v-out');
    element.classList.remove('v-in');
    setTimeout(() => {
      element.remove();
      options.onClose?.();
      if (!parent.children.length) {
        parent.remove();
        containers.delete(position);
      }
    }, 220);
  };

  const paint = (current: ToastOptions): void => {
    const currentType = current.type ?? type;
    element.setAttribute('data-type', currentType);

    if (current.html) {
      element.innerHTML = current.html;
    } else {
      element.textContent = '';

      const icon = document.createElement('span');
      icon.className = 'v-toast-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ICONS[currentType] ?? '';
      element.appendChild(icon);

      const body = document.createElement('div');
      body.className = 'v-toast-body';

      const title = document.createElement('div');
      title.className = 'v-toast-title';
      title.textContent = current.title ?? '';
      body.appendChild(title);

      if (current.description) {
        const description = document.createElement('div');
        description.className = 'v-toast-desc';
        description.textContent = current.description;
        body.appendChild(description);
      }
      element.appendChild(body);

      if (current.action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'v-toast-action';
        button.textContent = current.action.label;
        button.addEventListener('click', () => {
          current.action?.onClick();
          close();
        });
        element.appendChild(button);
      }

      if (current.closable !== false && currentType !== 'loading') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'v-toast-close';
        button.setAttribute('aria-label', 'Close notification');
        button.innerHTML = '&times;';
        button.addEventListener('click', close);
        element.appendChild(button);
      }
    }

    const currentDuration = current.duration ?? duration;
    if (currentDuration > 0) {
      const bar = document.createElement('div');
      bar.className = 'v-toast-bar';
      bar.style.animation = `v-toast-bar ${currentDuration}ms linear forwards`;
      element.appendChild(bar);
    }
  };

  paint(options);
  parent.appendChild(element);
  requestAnimationFrame(() => element.classList.add('v-in'));

  // Limit the visible quantity.
  while (parent.children.length > settings.max) parent.firstElementChild?.remove();

  const schedule = (ms: number): void => {
    if (timer) clearTimeout(timer);
    if (ms > 0) timer = setTimeout(close, ms);
  };
  schedule(duration);

  // Pause the countdown while the cursor is over the notification.
  element.addEventListener('mouseenter', () => {
    if (timer) clearTimeout(timer);
  });
  element.addEventListener('mouseleave', () => schedule(duration));

  return {
    id,
    close,
    update(next: Partial<ToastOptions>): void {
      paint({ ...options, ...next });
      if (next.duration !== undefined) schedule(next.duration);
      else if ((next.type ?? type) !== 'loading') schedule(settings.duration);
    },
  };
}

function normalize(input: string | ToastOptions, type: ToastType): ToastOptions {
  return typeof input === 'string' ? { title: input, type } : { type, ...input };
}

export const toast = Object.assign(
  /** Neutral notification. */
  (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
    render({ ...normalize(message, 'default'), ...options }),
  {
    success: (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
      render({ ...normalize(message, 'success'), ...options }),
    error: (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
      render({ ...normalize(message, 'error'), ...options }),
    warning: (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
      render({ ...normalize(message, 'warning'), ...options }),
    info: (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
      render({ ...normalize(message, 'info'), ...options }),
    loading: (message: string | ToastOptions, options: Partial<ToastOptions> = {}): ToastHandle =>
      render({ ...normalize(message, 'loading'), duration: 0, ...options }),

    /**
     * Monitor a promise: show loading, then success or error.
     *
     * ```js
     * V.toast.promise(save(), {
     *   loading: 'Saving...',
     *   success: (data) => `Saved with id ${data.id}`,
     *   error: 'Failed to save'
     * })
     * ```
     */
    async promise<T>(
      promise: Promise<T>,
      messages: {
        loading?: string;
        success?: string | ((value: T) => string);
        error?: string | ((error: unknown) => string);
      } = {}
    ): Promise<T> {
      const handle = render({ title: messages.loading ?? 'Loading...', type: 'loading', duration: 0 });
      try {
        const value = await promise;
        handle.update({
          title:
            typeof messages.success === 'function'
              ? messages.success(value)
              : messages.success ?? 'Done',
          type: 'success',
          duration: settings.duration,
        });
        return value;
      } catch (err) {
        handle.update({
          title:
            typeof messages.error === 'function'
              ? messages.error(err)
              : messages.error ?? 'Something went wrong',
          type: 'error',
          duration: settings.duration,
        });
        throw err;
      }
    },

    /** Close all open notifications. */
    clear(): void {
      for (const [position, element] of containers) {
        element.remove();
        containers.delete(position);
      }
    },

    /** Adjust default duration, position, and limit. */
    configure(options: Partial<typeof settings>): void {
      Object.assign(settings, options);
    },

    settings,
  }
);

export type Toast = typeof toast;
