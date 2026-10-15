/**
 * Ready examples for a playground, a lesson or a new project.
 *
 * Four small pages that each show one everyday job end to end: state and
 * events, a list, a validated form and a request. They are plain directive
 * syntax, so they run in every build, and they carry no styling of their own:
 * the runner's default stylesheet, or the page they are pasted into, decides
 * how they look.
 *
 * `voodoojs-cli init --example=<id>` writes the same code into a new project.
 * A test keeps the two copies identical.
 */
interface Preset {
    /** Stable id, used in URLs and by `voodoojs-cli init --example`. */
    id: string;
    /** A short title. */
    title: string;
    /** One sentence on what the example shows. */
    description: string;
    /** The markup, ready to run as the body of a page that loads Voodoo.js. */
    code: string;
}
declare const presets: readonly Preset[];
/** The preset with this id, or `undefined`. */
declare function preset(id: string): Preset | undefined;

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

type PreviewTheme = 'light' | 'dark';
interface PreviewOptions {
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
interface RunnerOptions extends PreviewOptions {
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
interface Runner {
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
/**
 * The CDN build used when nothing better is known: the version this file was
 * built as. The stamped pin alone would be one release behind in every
 * published package, because releases are stamped before they reach npm.
 */
declare const CDN_RUNTIME: string;
/**
 * The full build next to this script, so a copy loaded from the CDN or from
 * a site's own folder runs the version it shipped with.
 */
declare function defaultRuntime(scriptUrl?: string): string;
declare const DEFAULT_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
/**
 * Plain, readable defaults in light and dark. Enough for unstyled markup to
 * look intended; anything with its own styling simply overrides it.
 */
declare const DEFAULT_CSS: string;
/**
 * The complete document a run loads into the frame.
 *
 * Exposed for pages that manage their own frame. The code is HTML and goes in
 * as it is: it is meant to run, and the sandbox, not escaping, is what keeps
 * it away from the embedding page.
 */
declare function previewDocument(code: string, options?: PreviewOptions & {
    channel?: string;
    run?: number;
}): string;
/**
 * Puts a sandboxed frame inside `target` and runs code in it.
 *
 * The frame fills the target, so size the target. Every run replaces the
 * document, so state from the previous run never leaks into the next.
 */
declare function createRunner(target: Element | string, options?: RunnerOptions): Runner;

export { CDN_RUNTIME, DEFAULT_CSS, DEFAULT_SANDBOX, type Preset, type PreviewOptions, type PreviewTheme, type Runner, type RunnerOptions, createRunner, defaultRuntime, preset, presets, previewDocument };
