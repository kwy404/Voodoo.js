/**
 * @module runtime/magics
 *
 * Variaveis magicas: valores globais disponiveis dentro de qualquer expressao
 * `v-*`, sem precisar declarar nada.
 *
 * ```html
 * <button v-click="$toast.success('Salvo!')">Salvar</button>
 * <div v-show="$screen.mobile">Voce esta no celular</div>
 * <p v-show="!$network.online">Voce esta offline.</p>
 * <span>{ $store.carrinho.total }</span>
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
// $screen: pontos de quebra reativos
// ---------------------------------------------------------------------------

export const screen = reactive({
  width: 0,
  height: 0,
  mobile: false,
  tablet: false,
  desktop: false,
  portrait: false,
  landscape: false,
  /** Verifica uma media query arbitraria. */
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
// $network: estado da conexao
// ---------------------------------------------------------------------------

export const network = reactive({
  online: true,
  /** Tipo de conexao informado pelo navegador, quando disponivel. */
  type: 'unknown' as string,
  /** `true` quando o usuario pediu economia de dados. */
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
  /** Copia texto, com fallback para navegadores sem a API moderna. */
  async copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Cai no metodo antigo abaixo.
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

  /** Le o conteudo da area de transferencia, quando o usuario permitir. */
  async read(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  },
};

// ---------------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------------

let installed = false;

/** Registra todas as variaveis magicas e liga os observadores do navegador. */
export function installMagics(): void {
  if (installed) return;
  installed = true;

  // Contexto do elemento e do escopo.
  magic('$el', (scope: Scope) => scope.el);
  magic('$refs', (scope: Scope) => scope.allRefs);
  magic('$data', (scope: Scope) => scope.data);
  magic('$root', (scope: Scope) => scope.root.data);
  magic('$parent', (scope: Scope) => scope.parent?.data ?? null);
  magic('$self', (scope: Scope) => scope.owner?.component ?? scope.data);

  // Estado global.
  magic('$store', () => allStores);

  // Servicos.
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

  // Ambiente reativo.
  magic('$screen', () => screen);
  magic('$network', () => network);

  // Utilidades de fluxo.
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
