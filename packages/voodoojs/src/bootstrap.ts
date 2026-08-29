/**
 * @module bootstrap
 *
 * Inicializacao compartilhada pelos builds de navegador. Le a configuracao
 * declarada na propria tag `<script>`, publica o objeto global e inicia a
 * Voodoo quando o documento estiver pronto.
 *
 * ```html
 * <script src="voodoo.min.js" defer></script>
 * ```
 *
 * Para configurar antes de iniciar, use `data-manual`:
 *
 * ```html
 * <script src="voodoo.min.js" data-manual></script>
 * <script>
 *   V.config.prefix = 'data-v-'
 *   V.start()
 * </script>
 * ```
 */

import { config } from './runtime/registry';
import { theme } from './storage';
import { applySavedPalette } from './ui/palette';

/** Le a configuracao declarada nos atributos da tag `<script>`. */
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
  if (baseURL) config.baseURL = baseURL;

  const locale = script.getAttribute('data-locale');
  if (locale) config.locale = locale;

  if (script.hasAttribute('data-devtools')) config.devtools = true;
  if (script.hasAttribute('data-no-styles')) config.injectStyles = false;
  if (script.hasAttribute('data-no-observer')) config.autoDiscover = false;
  if (script.hasAttribute('data-keep-attributes')) config.cleanAttributes = false;

  return { manual };
}

/** Publica o objeto global e agenda o inicio da Voodoo. */
export function bootstrap(V: any): void {
  if (typeof window === 'undefined') return;

  const options = readScriptOptions();

  const globalScope = window as unknown as Record<string, unknown>;
  globalScope.V = V;
  globalScope.Voodoo = V;

  if (config.baseURL && V.http?.setBaseURL) V.http.setBaseURL(config.baseURL);

  if (options.manual || !config.autoStart) return;

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
