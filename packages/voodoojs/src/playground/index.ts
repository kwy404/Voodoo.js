/**
 * @module playground
 *
 * A live, sandboxed Voodoo.js example that any page can embed.
 *
 * ```html
 * <div id="demo" style="height: 320px"></div>
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.playground.min.js"></script>
 * <script>
 *   const runner = VoodooPlayground.createRunner('#demo', { preset: 'counter' });
 *   runner.run('<p v-data="{ n: 2 }">{ n * 21 }</p>');
 * </script>
 * ```
 *
 * The code runs in an `<iframe sandbox>` without `allow-same-origin`, so it
 * gets an opaque origin of its own: it cannot read the embedding page, its
 * cookies or its storage, and it cannot navigate it. That is the property that
 * makes it safe to run whatever a visitor types, and `createRunner` refuses a
 * sandbox that would give it up.
 *
 * Nothing here depends on the rest of the library. The frame loads its own
 * copy of Voodoo.js, so this file stays small and can sit next to any version.
 */

import { presets, preset, type Preset } from './presets';

export { presets, preset, type Preset };

export type PreviewTheme = 'light' | 'dark';

export interface PreviewOptions {
  /**
   * The Voodoo.js build the frame loads. The full build next to this script
   * when it was loaded from a URL, the pinned CDN build otherwise.
   */
  runtime?: string;
  /** Stylesheets linked before the code, in order. */
  stylesheets?: string[];
  /** Scripts loaded after the runtime and before the code, in order. */
  scripts?: string[];
  /** CSS for the frame. Replaces the small default stylesheet; `''` for none. */
  css?: string;
  /** Forces a theme. Without one, the frame follows the operating system. */
  theme?: PreviewTheme | null;
  /** `lang` of the frame document. Default `en`. */
  lang?: string;
  /** Shows errors inside the frame as well as reporting them. Default `true`. */
  showErrors?: boolean;
}

export interface RunnerOptions extends PreviewOptions {
  /** Code to run straight away. */
  code?: string;
  /** Id of a preset to run straight away, when `code` is not given. */
  preset?: string;
  /** Accessible name of the frame. Default `Live preview`. */
  title?: string;
  /**
   * The frame's sandbox tokens. Default
   * `allow-scripts allow-forms allow-modals allow-popups`.
   * `allow-same-origin` is refused.
   */
  sandbox?: string;
  /** Called once per distinct error in a run, with a plain message. */
  onError?: (message: string, runner: Runner) => void;
  /** Called when a run has loaded and started, with its error count. */
  onReady?: (errors: number, runner: Runner) => void;
}

export interface Runner {
  /** The frame the code runs in. */
  readonly frame: HTMLIFrameElement;
  /** The code of the latest run. */
  readonly code: string;
  /** The errors reported by the latest run. */
  readonly errors: readonly string[];
  /** Runs new code, or the same code again when called without any. */
  run(code?: string): void;
  /** Switches the theme of the running code without running it again. */
  setTheme(theme: PreviewTheme | null): void;
  /** Removes the frame and stops listening. */
  destroy(): void;
}

/** Set by the build to the version being built. Absent when the source is used directly. */
declare const __VOODOO_VERSION__: string | undefined;

/** Kept on the latest published version by `scripts/stamp-version.mjs`. */
const PINNED_RUNTIME = 'https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js';

/**
 * The CDN build used when nothing better is known: the version this file was
 * built as. The stamped pin alone would be one release behind in every
 * published package, because releases are stamped before they reach npm.
 */
export const CDN_RUNTIME =
  typeof __VOODOO_VERSION__ === 'string'
    ? PINNED_RUNTIME.replace(/@[\d.]+\//, `@${__VOODOO_VERSION__}/`)
    : PINNED_RUNTIME;

/**
 * Where this file was loaded from, read once while it is being evaluated:
 * `document.currentScript` is only set during that first run.
 */
const ownScript =
  typeof document !== 'undefined' && document.currentScript
    ? (document.currentScript as HTMLScriptElement).src || ''
    : '';

/**
 * The full build next to this script, so a copy loaded from the CDN or from
 * a site's own folder runs the version it shipped with.
 */
export function defaultRuntime(scriptUrl: string = ownScript): string {
  const match = /^(.*\/)voodoo\.playground(?:\.min)?\.js(?:[?#].*)?$/.exec(scriptUrl);
  return match ? `${match[1]}voodoo.full.min.js` : CDN_RUNTIME;
}

export const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-modals allow-popups';

/**
 * Plain, readable defaults in light and dark. Enough for unstyled markup to
 * look intended; anything with its own styling simply overrides it.
 */
export const DEFAULT_CSS =
  ':root{color-scheme:light;--bg:#fff;--text:#14111f;--muted:#6b6580;--border:#d9d2e8;' +
  '--accent:#6d3bf5;--danger:#c0264b}' +
  ':root[data-theme="dark"]{color-scheme:dark;--bg:#14111f;--text:#f4f1fb;--muted:#a9a2c4;' +
  '--border:#3a3358;--accent:#9b7bff;--danger:#ff7a93}' +
  '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;' +
  '--bg:#14111f;--text:#f4f1fb;--muted:#a9a2c4;--border:#3a3358;--accent:#9b7bff;--danger:#ff7a93}}' +
  'body{margin:0;padding:16px;background:var(--bg);color:var(--text);' +
  'font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
  'h1,h2,h3{margin:0 0 .5em;line-height:1.2}' +
  'button,input,select,textarea{font:inherit;color:inherit;background:transparent;' +
  'padding:.4rem .75rem;border:1px solid var(--border);border-radius:.5rem}' +
  'input[type=checkbox],input[type=radio]{padding:0;accent-color:var(--accent)}' +
  'button{cursor:pointer}button:hover:not(:disabled){border-color:var(--accent)}' +
  'button:disabled{opacity:.5;cursor:default}' +
  ':focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
  'ul{padding-left:1.25rem}li{margin:.25rem 0}a{color:var(--accent)}s{color:var(--muted)}' +
  '.v-invalid{border-color:var(--danger)}.v-error-message{color:var(--danger);font-size:.875em}';

/** Text that will sit inside a double-quoted attribute. */
function attribute(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** A theme name, or `null` for "follow the system". Anything else is ignored. */
function themeName(value: unknown): PreviewTheme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/**
 * The script that runs before anything else in the frame: it answers theme
 * changes from the parent, collects errors, shows them, reports them up, and
 * starts the library once the code and its own scripts have run.
 *
 * Written as ES5 inside a string, because it runs in whatever browser opens
 * the page, without going through a build.
 */
function bridgeScript(channel: string, run: number, runtime: string, showErrors: boolean): string {
  const settings = JSON.stringify({ c: channel, r: run, u: runtime, s: showErrors });
  return (
    '(function(){var S=' + settings.replace(/</g, '\\u003c') + ',root=document.documentElement,' +
    'box=null,seen={},count=0,early=[];' +
    'function post(m){try{parent.postMessage(m,"*")}catch(e){}}' +
    'function report(msg){msg=String(msg||"Unknown error");if(seen[msg])return;seen[msg]=1;count++;' +
    'post({voodooPlayground:S.c,run:S.r,type:"error",message:msg});' +
    'if(!S.s)return;if(!document.body){early.push(msg);return;}show(msg);}' +
    // Errors raised before <body> exists wait for it.
    'function show(msg){if(!box){box=document.createElement("div");' +
    'box.setAttribute("role","alert");box.setAttribute("data-playground-errors","");' +
    'box.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;' +
    'max-height:45%;overflow:auto;padding:10px 12px;border-radius:8px;border:1px solid #c0264b;' +
    'background:#fff0f3;color:#5c0b1f;font:13px/1.45 system-ui,sans-serif";' +
    'var b=document.createElement("b");b.textContent="Something went wrong";box.appendChild(b);' +
    'document.body.appendChild(box);}var p=document.createElement("pre");' +
    'p.style.cssText="margin:4px 0 0;white-space:pre-wrap;font:12px/1.45 ui-monospace,monospace";' +
    'p.textContent=msg;box.appendChild(p);}' +
    'window.__voodooPlaygroundError=report;' +
    'addEventListener("message",function(e){var d=e.data;if(e.source!==parent||!d||' +
    'd.voodooPlayground!==S.c||d.type!=="theme")return;' +
    'if(d.theme==="light"||d.theme==="dark"){root.setAttribute("data-theme",d.theme);' +
    'root.style.colorScheme=d.theme;}else{root.removeAttribute("data-theme");root.style.colorScheme="";}});' +
    // A resource that fails to load fires `error` on its element, without
    // bubbling, so only a capturing listener on the window sees it.
    'addEventListener("error",function(e){var t=e.target;' +
    'if(t&&t!==window&&t.tagName){if(t.tagName==="SCRIPT")report("Could not load "+t.src);return;}' +
    'report(e.message||(e.error&&e.error.message))},true);' +
    'addEventListener("unhandledrejection",function(e){var r=e.reason;report(r&&r.message?r.message:r)});' +
    // The library reports a bad expression on the console and keeps
    // rendering, which is right for a page and silent in a playground.
    'var ce=console.error;console.error=function(a,b){ce.apply(console,arguments);' +
    'if(typeof a==="string"&&a.indexOf("[Voodoo]")===0)' +
    'report(a.replace(/^\\[Voodoo\\]\\s*/,"")+(b&&b.message?" "+b.message:""))};' +
    // After every inline script in the code has run, so V.store() and
    // V.component() calls written there are in place before the first render.
    'addEventListener("DOMContentLoaded",function(){var V=window.V;' +
    'while(early.length)show(early.shift());' +
    'if(V&&typeof V.start==="function"){try{V.start()}catch(e){report(e&&e.message?e.message:e)}}' +
    'else report("Voodoo.js did not load from "+S.u)});' +
    'addEventListener("load",function(){post({voodooPlayground:S.c,run:S.r,type:"ready",errors:count})});' +
    '})();'
  );
}

/**
 * The complete document a run loads into the frame.
 *
 * Exposed for pages that manage their own frame. The code is HTML and goes in
 * as it is: it is meant to run, and the sandbox, not escaping, is what keeps
 * it away from the embedding page.
 */
export function previewDocument(
  code: string,
  options: PreviewOptions & { channel?: string; run?: number } = {}
): string {
  const runtime = options.runtime || defaultRuntime();
  const theme = themeName(options.theme);
  const css = options.css ?? DEFAULT_CSS;
  const open = '<scr' + 'ipt';
  const close = '</scr' + 'ipt>';

  let head =
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    open + '>' +
    bridgeScript(options.channel ?? '', options.run ?? 0, runtime, options.showErrors !== false) +
    close;
  for (const href of options.stylesheets ?? []) head += `<link rel="stylesheet" href="${attribute(href)}">`;
  if (css) head += `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
  // `data-manual` holds the library until the bridge starts it.
  head += `${open} src="${attribute(runtime)}" data-manual>${close}`;
  for (const src of options.scripts ?? []) head += `${open} src="${attribute(src)}">${close}`;

  const rootAttributes =
    ` lang="${attribute(options.lang || 'en')}"` +
    (theme ? ` data-theme="${theme}" style="color-scheme:${theme}"` : '');

  return `<!doctype html><html${rootAttributes}><head>${head}</head><body>${String(code ?? '')}</body></html>`;
}

let runners = 0;

function resolveTarget(target: Element | string): Element {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`VoodooPlayground: nothing matches ${String(target)}.`);
  return el;
}

function checkSandbox(tokens: string): string {
  const list = tokens.split(/\s+/).filter(Boolean);
  if (list.includes('allow-same-origin')) {
    throw new Error(
      'VoodooPlayground: "allow-same-origin" would let the code read and change this page. ' +
        'Leave it out of the sandbox.'
    );
  }
  return list.join(' ');
}

/**
 * Puts a sandboxed frame inside `target` and runs code in it.
 *
 * The frame fills the target, so size the target. Every run replaces the
 * document, so state from the previous run never leaks into the next.
 */
export function createRunner(target: Element | string, options: RunnerOptions = {}): Runner {
  const host = resolveTarget(target);
  const sandbox = checkSandbox(options.sandbox ?? DEFAULT_SANDBOX);
  const channel = `vp${++runners}-${Math.random().toString(36).slice(2, 10)}`;

  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', sandbox);
  frame.setAttribute('title', options.title || 'Live preview');
  frame.setAttribute('referrerpolicy', 'no-referrer');
  frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent';

  let theme = themeName(options.theme);
  let code = '';
  let run = 0;
  let errors: string[] = [];
  let destroyed = false;

  const runner: Runner = {
    frame,
    get code() {
      return code;
    },
    get errors() {
      return errors.slice();
    },
    run(next?: string) {
      if (destroyed) return;
      if (typeof next === 'string') code = next;
      run++;
      errors = [];
      frame.srcdoc = previewDocument(code, { ...options, theme, channel, run });
    },
    setTheme(next: PreviewTheme | null) {
      theme = themeName(next);
      const win = frame.contentWindow;
      if (win) win.postMessage({ voodooPlayground: channel, type: 'theme', theme }, '*');
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener('message', onMessage);
      frame.remove();
    },
  };

  function onMessage(event: MessageEvent): void {
    if (event.source !== frame.contentWindow) return;
    const data = event.data as {
      voodooPlayground?: string;
      run?: number;
      type?: string;
      message?: unknown;
      errors?: unknown;
    } | null;
    if (!data || data.voodooPlayground !== channel || data.run !== run) return;
    if (data.type === 'error') {
      const message = String(data.message ?? 'Unknown error').slice(0, 2000);
      if (errors.includes(message)) return;
      errors.push(message);
      options.onError?.(message, runner);
    } else if (data.type === 'ready') {
      options.onReady?.(errors.length, runner);
    }
  }

  window.addEventListener('message', onMessage);
  host.appendChild(frame);

  const first = options.code ?? (options.preset ? preset(options.preset)?.code : undefined);
  if (options.preset && first === undefined) {
    runner.destroy();
    throw new Error(
      `VoodooPlayground: there is no preset named "${options.preset}". ` +
        `Available: ${presets.map((p) => p.id).join(', ')}.`
    );
  }
  if (first !== undefined) runner.run(first);

  return runner;
}
