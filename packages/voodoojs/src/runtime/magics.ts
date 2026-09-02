/**
 * @module runtime/magics
 *
 * Magic variables: global values available inside any `v-*` expression,
 * without needing to declare anything.
 *
 * ```html
 * <button v-click="$toast.success('Saved!')">Save</button>
 * <div v-show="$screen.mobile">You're on mobile</div>
 * <p v-show="!$network.online">You're offline.</p>
 * <span>{ $store.cart.total }</span>
 * ```
 */

import { nextTick, reactive, watch } from '../reactivity';
import { magic, type Scope } from './scope';
import { allStores } from '../store';
import { http } from '../http';
import { toast } from '../ui/toast';
import { cache, cookie, session, storage, theme, url } from '../storage';
import { device } from '../utils';
import { evaluateIn } from './walker';

// ---------------------------------------------------------------------------
// $screen: reactive breakpoints
// ---------------------------------------------------------------------------

export const screen = reactive({
  width: 0,
  height: 0,
  mobile: false,
  tablet: false,
  desktop: false,
  portrait: false,
  landscape: false,
  /** Check an arbitrary media query. */
  matches(query: string): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia(query).matches;
  },
});

function updateScreen(): void {
  if (typeof window === 'undefined') return;
  screen.width = window.innerWidth;
  screen.height = window.innerHeight;
  screen.mobile = window.innerWidth < 768;
  screen.tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  screen.desktop = window.innerWidth >= 1024;
  screen.portrait = window.innerHeight >= window.innerWidth;
  screen.landscape = !screen.portrait;
}

// ---------------------------------------------------------------------------
// $network: connection state
// ---------------------------------------------------------------------------

export const network = reactive({
  online: true,
  /** Connection type reported by the browser, when available. */
  type: 'unknown' as string,
  /** `true` when the user requested data saving mode. */
  saveData: false,
  slow: false,
});

function updateNetwork(): void {
  if (typeof navigator === 'undefined') return;
  network.online = navigator.onLine;
  const connection = (navigator as Navigator & { connection?: any }).connection;
  if (connection) {
    network.type = connection.effectiveType ?? 'unknown';
    network.saveData = !!connection.saveData;
    network.slow = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
  }
}

// ---------------------------------------------------------------------------
// $clipboard
// ---------------------------------------------------------------------------

export const clipboard = {
  /** Copy text, with fallback for browsers without the modern API. */
  async copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Falls back to the legacy method below.
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  },

  /** Read clipboard content, when the user allows. */
  async read(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let installed = false;

/** Register all magic variables and connect browser observers. */
export function installMagics(): void {
  if (installed) return;
  installed = true;

  // Element and scope context.
  magic('$el', (scope: Scope) => scope.el);
  magic('$refs', (scope: Scope) => scope.allRefs);
  magic('$data', (scope: Scope) => scope.data);
  magic('$root', (scope: Scope) => scope.root.data);
  magic('$parent', (scope: Scope) => scope.parent?.data ?? null);
  magic('$self', (scope: Scope) => scope.owner?.component ?? scope.data);

  // Global state.
  magic('$store', () => allStores);

  // Services.
  magic('$http', () => http);
  magic('$toast', () => toast);
  magic('$clipboard', () => clipboard);
  magic('$storage', () => storage);
  magic('$session', () => session);
  magic('$cookie', () => cookie);
  magic('$cache', () => cache);
  magic('$url', () => url);
  magic('$theme', () => theme);
  magic('$device', () => device);

  // Reactive environment.
  magic('$screen', () => screen);
  magic('$network', () => network);

  // Flow utilities.
  magic('$nextTick', () => nextTick);
  magic('$watch', (scope: Scope) => (expression: string, callback: (v: unknown, o: unknown) => void) =>
    watch(() => evaluateIn(expression, scope, '$watch'), callback)
  );
  magic('$dispatch', (scope: Scope) => (name: string, detail?: unknown) => {
    const target = scope.el ?? document;
    target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  });
  magic('$log', () => (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.log('[Voodoo]', ...args);
  });

  if (typeof window === 'undefined') return;

  updateScreen();
  updateNetwork();

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateScreen);
  });
  window.addEventListener('orientationchange', updateScreen);
  window.addEventListener('online', updateNetwork);
  window.addEventListener('offline', updateNetwork);
  (navigator as Navigator & { connection?: any }).connection?.addEventListener?.(
    'change',
    updateNetwork
  );
}
