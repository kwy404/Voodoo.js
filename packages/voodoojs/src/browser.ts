/**
 * Build de navegador da Voodoo.js.
 *
 * Este arquivo e o unico ponto do pacote que mexe no documento sozinho. Ele
 * publica `window.V` e `window.Voodoo` e inicializa a pagina assim que o DOM
 * estiver pronto.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
 * ```
 *
 * Para adiar a inicializacao e configurar antes, use o atributo `data-manual`:
 *
 * ```html
 * <script src="voodoo.min.js" data-manual></script>
 * <script>
 *   V.config.prefix = 'data-v-'
 *   V.start()
 * </script>
 * ```
 */

import V from './index';
import { config } from './runtime/registry';
import { theme } from './storage';
import { applySavedPalette } from './ui/palette';

/** Le a configuracao declarada na propria tag `<script>`. */
function readScriptOptions(): { manual: boolean } {
  if (typeof document === 'undefined') return { manual: false };

  const script =
    (document.currentScript as HTMLScriptElement | null) ??
    document.querySelector<HTMLScriptElement>('script[src*="voodoo"]');

  if (!script) return { manual: false };

  const manual = script.hasAttribute('data-manual') || script.hasAttribute('data-defer-init');

  const prefix = script.getAttribute('data-prefix');
  if (prefix) config.prefix = prefix;

  const baseURL = script.getAttribute('data-base-url');
  if (baseURL) {
    config.baseURL = baseURL;
    V.http.setBaseURL(baseURL);
  }

  const locale = script.getAttribute('data-locale');
  if (locale) config.locale = locale;

  if (script.hasAttribute('data-devtools')) config.devtools = true;
  if (script.hasAttribute('data-no-styles')) config.injectStyles = false;
  if (script.hasAttribute('data-no-observer')) config.autoDiscover = false;

  return { manual };
}

const options = readScriptOptions();

if (typeof window !== 'undefined') {
  const globalScope = window as unknown as Record<string, unknown>;
  globalScope.V = V;
  globalScope.Voodoo = V;

  if (!options.manual && config.autoStart) {
    const boot = (): void => {
      // Tema e paleta primeiro, para a pagina nao piscar com as cores erradas.
      theme.init();
      applySavedPalette();
      V.start();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }
}

export default V;
