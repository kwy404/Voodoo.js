/**
 * @module bootstrap
 *
 * Shared initialization for browser builds. Reads the configuration declared
 * in the `<script>` tag itself, publishes the global object, and starts Voodoo
 * when the document is ready.
 *
 * ```html
 * <script src="voodoo.min.js" defer></script>
 * ```
 *
 * To configure before starting, use `data-manual`:
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
 * Determines whether devtools were requested.
 *
 * Accepts short forms because this is when someone is in a hurry:
 * `devtools`, `devtools="true"`, `data-devtools`, or the global
 * variable `window.VOODOO_DEVTOOLS` set before loading. An explicit
 * `devtools="false"` disables it, so the attribute can be left in HTML and toggled.
 */
function readDevtoolsFlag(script: HTMLScriptElement): boolean {
  if ((window as unknown as Record<string, unknown>).VOODOO_DEVTOOLS === true) return true;

  for (const name of ['devtools', 'data-devtools']) {
    if (!script.hasAttribute(name)) continue;
    const value = script.getAttribute(name);
    // Empty attribute and boolean attribute count as enabled.
    return value === null || value === '' || value.toLowerCase() !== 'false';
  }
  return false;
}

/** Reads configuration declared in the `<script>` tag attributes. */
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

  // `data-xray-shortcut="alt+shift+d"` picks another combination, and
  // `data-xray-shortcut="false"` installs no listener at all.
  const xrayShortcut = script.getAttribute('data-xray-shortcut');
  if (xrayShortcut !== null) {
    config.xrayShortcut = xrayShortcut === 'false' || xrayShortcut === '' ? false : xrayShortcut;
  }

  if (script.hasAttribute('data-no-styles')) config.injectStyles = false;
  if (script.hasAttribute('data-no-observer')) config.autoDiscover = false;
  if (script.hasAttribute('data-keep-attributes')) config.cleanAttributes = false;

  return { manual };
}

/**
 * Mounts the devtools widget on screen, if the loaded build has one.
 *
 * The call is intentionally optional. The widget and inspector live in the full
 * build; in the minimal and essential builds, `V.devtoolsWidget` simply doesn't
 * exist, and the user gets instructions in the console instead of an error. This
 * is what keeps `bootstrap.ts` shared across all three builds without dragging
 * the entire inspector into the smallest one.
 */
function mountDevtools(V: any): void {
  if (typeof V.devtoolsWidget === 'function') {
    V.devtoolsWidget(true);
    return;
  }
  // eslint-disable-next-line no-console
  console.info(
    '[Voodoo] devtools requested, but this build does not include the inspector. ' +
      'Use voodoo.full.min.js to get the widget and full devtools panel.'
  );
}

/** Publishes the global object and schedules Voodoo startup. */
export function bootstrap(V: any): void {
  if (typeof window === 'undefined') return;

  const options = readScriptOptions();

  const globalScope = window as unknown as Record<string, unknown>;
  globalScope.V = V;
  globalScope.Voodoo = V;

  // Makes the object reachable from within expressions. Without this, writing
  // @click="V.palette({ preset: 1 })" would fail, because the evaluator only
  // sees the closed list of globals.
  allowedGlobals.V = V;
  allowedGlobals.Voodoo = V;

  if (config.baseURL && V.http?.setBaseURL) V.http.setBaseURL(config.baseURL);

  // Giving the visitor back the theme they chose is not part of "starting" the
  // page, so it must not sit behind `data-manual` or `autoStart`. It used to,
  // and the effect was the report that led here: this project's own site loads
  // the library with `data-manual` — the dictionary has to be registered before
  // the first render — so `theme.init()` never ran on it. The saved choice was
  // in localStorage and read back correctly by `V.theme.current`, but nothing
  // ever wrote `data-theme` onto the root, so the page's own
  // `@media (prefers-color-scheme: dark)` block matched and a visitor on a dark
  // machine who had picked LIGHT got a dark page on every load. Worse, the
  // toggle then read that stored `light` and flipped it to `dark`: the first
  // click changed nothing on screen, and the site looked as though it had one
  // theme and a dead button.
  //
  // Safe to run unconditionally: `init()` writes nothing at all unless the
  // visitor actually picked a theme, which is what `tema-nao-invade` pins.
  // Earlier than `whenReady` on purpose, too — this is the call that decides
  // the colours of the first paint.
  theme.init();

  if (options.manual || !config.autoStart) {
    // A page that drives `V.start()` itself still saved its palette in the same
    // localStorage as any other, and had the same reason to expect it back.
    // Restored at the same moment an automatic page restores it, so an inline
    // script keeps the same window to change the configuration first.
    whenReady(() => {
      applySavedPalette();
    });
    return;
  }

  const boot = (): void => {
    // Palette first, to prevent the page from flashing with the wrong colors.
    applySavedPalette();

    // JSX needs work on both sides of the walk, and that lives inside `start`
    // now rather than here. Doing it in the bootstrap meant `data-manual` pages,
    // which return above and call `V.start()` themselves, silently got none of
    // it. See the `onStart` registry in `runtime/walker.ts`.
    V.start();

    // The inspector shortcut is installed whenever the build carries the
    // inspector, not only when `data-devtools` is present.
    //
    // It used to be installed by `V.xray()` alone, which meant it only ever
    // existed after someone had already opened the inspector some other way. On
    // every ordinary page, including this project's own site, pressing the
    // documented keys did nothing at all, because no listener had ever been
    // added. The keys were not the problem; the absence of a listener was.
    //
    // A page that loaded the full build has already shipped the inspector, so
    // the marginal cost here is one keydown listener that does nothing until
    // the combination is pressed. Set `data-xray-shortcut="false"`, or
    // `V.config.xrayShortcut = false`, to install nothing.
    if (typeof V.enableXrayShortcut === 'function') V.enableXrayShortcut();

    if (config.devtools) mountDevtools(V);
  };

  // Voodoo's own scheduler decides the timing, not browser load events. It waits
  // for two conditions: the body exists and the tree stops growing. This alone
  // handles the cases that `readyState` handled poorly: a script without `defer`
  // in `<head>`, other `defer` scripts that will still register components, and
  // a page mounted by third parties after the event has already passed.
  whenReady(boot);
}
