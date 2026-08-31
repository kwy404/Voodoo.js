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
import { allowedGlobals } from './parser/interpreter';
import { theme } from './storage';
import { applySavedPalette } from './ui/palette';
import { whenReady } from './runtime/boot';

/**
 * Decide se as devtools foram pedidas.
 *
 * Aceita as formas curtas porque este e o caso em que a pessoa esta com pressa:
 * `devtools`, `devtools="true"`, `data-devtools`, ou a variavel global
 * `window.VOODOO_DEVTOOLS` definida antes do carregamento. Um `devtools="false"`
 * explicito desliga, para o atributo poder ser deixado no HTML e alternado.
 */
function readDevtoolsFlag(script: HTMLScriptElement): boolean {
  if ((window as unknown as Record<string, unknown>).VOODOO_DEVTOOLS === true) return true;

  for (const nome of ['devtools', 'data-devtools']) {
    if (!script.hasAttribute(nome)) continue;
    const valor = script.getAttribute(nome);
    // Atributo vazio e atributo booleano contam como ligado.
    return valor === null || valor === '' || valor.toLowerCase() !== 'false';
  }
  return false;
}

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

  if (readDevtoolsFlag(script)) config.devtools = true;
  if (script.hasAttribute('data-no-styles')) config.injectStyles = false;
  if (script.hasAttribute('data-no-observer')) config.autoDiscover = false;
  if (script.hasAttribute('data-keep-attributes')) config.cleanAttributes = false;

  return { manual };
}

/**
 * Coloca o widget das devtools na tela, quando o build carregado tiver um.
 *
 * A chamada e opcional de proposito. O widget e o inspetor vivem no build
 * completo; nos builds menor e essencial `V.devtoolsWidget` simplesmente nao
 * existe, e a pessoa recebe a instrucao no console em vez de um erro. E o que
 * mantem `bootstrap.ts` compartilhado pelos tres builds sem arrastar o
 * inspetor inteiro para dentro do menor deles.
 */
function mountDevtools(V: any): void {
  if (typeof V.devtoolsWidget === 'function') {
    V.devtoolsWidget(true);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(
    '[Voodoo] devtools pedidas, mas este build nao traz o inspetor. ' +
      'Use voodoo.full.min.js para ganhar o widget e o painel completo.'
  );
}

/** Publica o objeto global e agenda o inicio da Voodoo. */
export function bootstrap(V: any): void {
  if (typeof window === 'undefined') return;

  const options = readScriptOptions();

  const globalScope = window as unknown as Record<string, unknown>;
  globalScope.V = V;
  globalScope.Voodoo = V;

  // Deixa o proprio objeto alcancavel de dentro das expressoes. Sem isto,
  // escrever @click="V.palette({ preset: 1 })" falharia, porque o avaliador so
  // enxerga a lista fechada de globais.
  allowedGlobals.V = V;
  allowedGlobals.Voodoo = V;

  if (config.baseURL && V.http?.setBaseURL) V.http.setBaseURL(config.baseURL);

  if (options.manual || !config.autoStart) return;

  const boot = (): void => {
    // Tema e paleta primeiro, para a pagina nao piscar com as cores erradas.
    theme.init();
    applySavedPalette();
    V.start();
    if (config.devtools) mountDevtools(V);
  };

  // Quem decide a hora e o agendador da propria Voodoo, e nao os eventos de
  // carregamento do navegador. Ele espera duas condicoes: o corpo existir e a
  // arvore parar de crescer. Isso cobre sozinho os casos que o `readyState`
  // cobria mal: um script sem `defer` no `<head>`, outros scripts com `defer`
  // que ainda vao registrar componentes, e uma pagina montada por terceiros
  // depois que o evento ja passou.
  whenReady(boot);
}
