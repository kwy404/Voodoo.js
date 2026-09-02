import { c as core, V as VoodooCollection } from './query-BeYufh-f.js';
export { A as App, a as AppOptions, C as ComponentDefinition, D as DirectiveBinding, b as DirectiveHooks, P as PRIORITY, R as Resource, d as ResourceOptions, S as Scope, e as VoodooConfig, f as VoodooPlugin, g as VoodooRuntimeError, h as VoodooSyntaxError, i as addCleanup, j as allStores, k as allowedGlobals, l as cache, m as clearParseCache, n as config, o as cookie, p as createApp, q as createResource, r as defineComponent, s as defineDirective, t as destroy, u as documentReady, v as ensureTokens, w as enter, x as evaluate, y as fadeIn, z as fadeOut, B as findScope, E as fromHtml, F as getScope, G as injectStyle, H as instances, I as leave, J as magic, K as magics, L as mountComponent, M as parse, N as query, O as ready, Q as refresh, T as removeStore, q as resource, U as rootScope, W as session, X as slideDown, Y as slideUp, Z as start, _ as storage, $ as store, a0 as storeNames, a1 as stringify, a2 as theme, a3 as toast, a4 as tokenize, a5 as url, a6 as viewTransition, a7 as walk, a8 as whenElement, a9 as whenReady } from './query-BeYufh-f.js';
export { EffectScope, computed, effect, effectScope, flushSync, isReactive, markRaw, nextTick, reactive, ref, shallowRef, stop, toRaw, unref, watch, watchEffect } from './reactivity.js';
export { HttpError, HttpMethod, HttpResponse, RequestConfig, http, request } from './http.js';
export { R as RoomOptions, a as RoomState, S as SocketMessage, b as SocketOptions, c as SocketRoom, d as SocketState, e as SocketTransport, V as VoodooSocket, f as createSocket, s as socket, g as socketSupported } from './index-DTllqUtj.js';
export { x as GpuClock, y as GpuCompute, A as GpuContext, C as GpuEffect, I as GpuSurface, M as GpuUniforms, a4 as gpu, ab as reflectWgsl } from './index-CaLD-0oh.js';
export { DebouncedFunction, FormatOptions, capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, matchesMedia, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, uuid } from './utils.js';

/**
 * @module directives/ui
 *
 * Declarative UI components. Everything here works by writing HTML only:
 * no JavaScript needed to have dropdowns, tabs, sidebars, tooltips, command palette and more.
 *
 * ```html
 * <button v-dropdown="#menu">Actions</button>
 * <div id="menu" v-dropdown-menu>
 *   <button v-copy="PROMO10">Copy coupon</button>
 * </div>
 * ```
 *
 * Accessibility is not optional in this module: each component manages ARIA roles,
 * keyboard navigation, focus visibility, and Escape key closure.
 */

interface HotkeyOptions {
    /** Fires even when focus is in a text field. Default `false`. */
    allowInInput?: boolean;
    /** Prevents browser default behavior. Default `true`. */
    preventDefault?: boolean;
}
/**
 * Registers a global keyboard shortcut.
 *
 * ```js
 * const stop = V.hotkey('ctrl+k', () => openSearch())
 * stop() // removes the shortcut
 * ```
 *
 * Accepts combinations (`ctrl+shift+p`, `alt+1`, `meta+k`, `mod+s`), isolated keys
 * (`?`, `Escape`) and multiple combos separated by comma. Unmodified combos don't
 * fire when focus is in a text field, to avoid interfering with typing.
 *
 * @param combo key combination
 * @param handler function executed when the shortcut is triggered
 * @param options behavior adjustments
 * @returns function that removes the shortcut
 */
declare function hotkey(combo: string, handler: (event: KeyboardEvent) => void, options?: HotkeyOptions): () => void;

/**
 * @module sound
 *
 * Native sound, no files, no dependencies.
 *
 * Effects are synthesized on the fly with the Web Audio API, so there is no
 * download, no audio folder, and the cost in bytes is nearly zero.
 * You can also play your own file whenever you want.
 *
 * ```html
 * <button v-sound="click">Save</button>
 * <button v-sound="success" v-post="/api/orders">Complete</button>
 * <a v-sound:mouseenter="hover" href="/prices">Prices</a>
 * <input v-sound:input="type">
 * ```
 *
 * ```js
 * V.sound.play('success')
 * V.sound.note('do', 300)
 * V.sound.melody(['do', 'mi', 'sol'], 140)
 * V.sound.volume(0.4)
 * V.sound.mute()
 * ```
 *
 * Rules of good behavior that the module follows on its own:
 *
 * - no browser lets audio play before the user interacts, so the
 *   context is only created on the first gesture;
 * - those who enable `prefers-reduced-motion` usually prefer less stimulation, so the
 *   default volume drops by half in that case;
 * - the mute preference is saved and applies on future visits.
 */
type WaveformShape = 'sine' | 'square' | 'sawtooth' | 'triangle';
interface Layer {
    /** Initial frequency in hertz. */
    frequencia: number;
    /** Final frequency, for the sound to slide. Absent keeps the initial. */
    ate?: number;
    /** Duration in seconds. */
    duracao: number;
    /** Relative volume of the layer, from 0 to 1. */
    volume?: number;
    forma?: WaveformShape;
    /** Delay in seconds from the start of the effect. */
    atraso?: number;
    /** Volume rise time, in seconds. */
    ataque?: number;
}
interface Effect {
    camadas: Layer[];
    /** Volume of the entire effect, from 0 to 1. */
    volume?: number;
}
/**
 * Library of effects. Each one was designed to be short and discrete:
 * interface sound exists to confirm an action, not to draw attention.
 */
declare const efeitos: Record<string, Effect>;
interface PlayOptions {
    /** Relative volume, from 0 to 1. Multiplies the master volume. */
    volume?: number;
    /** Multiplies the frequency of all layers, making the sound higher. */
    tom?: number;
}
declare const sound: {
    /**
     * Plays an effect by name, or a file by path.
     *
     * ```js
     * V.sound.play('success')
     * V.sound.play('/audio/ding.mp3')
     * V.sound.play('click', { volume: 0.5 })
     * ```
     */
    play(name: string, options?: PlayOptions): void;
    /**
     * Plays a pure frequency.
     *
     * ```js
     * V.sound.tone(440, 300)
     * ```
     *
     * @param frequency hertz
     * @param duration milliseconds
     */
    tone(frequency: number, duration?: number, options?: PlayOptions & {
        forma?: WaveformShape;
    }): void;
    /**
     * Plays a note by name.
     *
     * ```js
     * V.sound.note('la', 300)
     * V.sound.note('do5', 200)
     * ```
     */
    note(name: string, duration?: number, options?: PlayOptions): void;
    /**
     * Plays a sequence of notes.
     *
     * ```js
     * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
     * ```
     *
     * @param notes note names, or frequencies in hertz
     * @param interval milliseconds between one note and the next
     */
    melody(notes: Array<string | number>, interval?: number, options?: PlayOptions): void;
    /**
     * Reads or adjusts the master volume, from 0 to 1. The choice is saved.
     *
     * ```js
     * V.sound.volume()      // read
     * V.sound.volume(0.6)   // adjust
     * ```
     */
    volume(value?: number): number;
    /** Mutes sound. Pass `false` to unmute. */
    mute(value?: boolean): void;
    /** Unmutes sound. */
    unmute(): void;
    /** Toggles between muted and unmuted, and returns the new state. */
    toggle(): boolean;
    /** `true` when muted. */
    readonly muted: boolean;
    /** Names of all available effects. */
    readonly names: string[];
    /**
     * Registers a custom effect.
     *
     * ```js
     * V.sound.define('myWarning', {
     *   volume: 0.5,
     *   camadas: [
     *     { frequencia: 700, duracao: 0.1 },
     *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
     *   ]
     * })
     * ```
     */
    define(name: string, effect: Effect): void;
    /** Preloads a file to avoid delay on first play. */
    preload(...urls: string[]): void;
};

/** Target accepted by `animate` and `stagger`. */
type MotionTarget = Element | ArrayLike<Element> | string | null | undefined;
/** Value of an animated property. */
type MotionValue = number | string;
/**
 * Map of animated properties. A single value uses the current state as the
 * starting point. A pair `[from, to]` defines both extremes.
 */
type MotionKeyframes = Record<string, MotionValue | [MotionValue, MotionValue]>;
/** Progress curve. Takes and returns numbers normally between 0 and 1. */
type EasingFunction = (t: number) => number;
/** Control returned by any animation. */
interface AnimationControl {
    /** Stops the animation at the current point, without firing `onComplete`. */
    stop(): void;
    /** Resolves when the animation finishes or is interrupted. */
    finished: Promise<void>;
}
/** Physical parameters of the spring. */
interface SpringConfig {
    /** Spring stiffness. Higher = faster. Default 170. */
    stiffness?: number;
    /** Damping. Higher = less oscillation. Default 26. */
    damping?: number;
    /** Mass of the body. Higher = slower and heavier. Default 1. */
    mass?: number;
    /** Initial velocity, in units per second. */
    velocity?: number;
    /** Distance considered at rest. */
    restDelta?: number;
    /** Velocity considered at rest. */
    restSpeed?: number;
}
/** Options for `animate`. */
interface AnimateOptions {
    /** Duration in milliseconds. Ignored when `spring` is active. Default 400. */
    duration?: number;
    /** Wait before starting, in milliseconds. */
    delay?: number;
    /** Name of a known easing or custom function. */
    easing?: EasingName | EasingFunction | string;
    /** Use spring physics instead of tween. `true` accepts defaults. */
    spring?: boolean | SpringConfig;
    /** Extra repetitions. `2` plays three times total. */
    repeat?: number;
    /** Behavior of each repetition. */
    repeatType?: 'loop' | 'reverse' | 'mirror';
    /** Ignores `prefers-reduced-motion`. Reserve for essential animations. */
    force?: boolean;
    /** Called each frame with progress, which can exceed 1 for springs. */
    onUpdate?(progress: number): void;
    /** Called when the animation finishes naturally. */
    onComplete?(): void;
}
/** Options for `stagger`. */
interface StaggerOptions extends AnimateOptions {
    /** Delay added to each list item, in milliseconds. Default 60. */
    delay?: number;
    /** Where the wave starts. Default `first`. */
    from?: 'first' | 'last' | 'center';
    /** Delay applied before the first item in the wave. */
    start?: number;
}
/** Options for `spring`. */
interface SpringOptions extends SpringConfig {
    /** Receives the interpolated value each frame. */
    onUpdate?(value: number): void;
    /** Called when the spring comes to rest. */
    onComplete?(): void;
}
/** Options for `inView`. */
interface InViewOptions {
    /** Turns off the observer after the first entry. Default `true`. */
    once?: boolean;
    /** Observer margin, in the format of `rootMargin`. */
    margin?: string;
    /** Visible fraction required, or `any` and `all`. Default 0.25. */
    amount?: number | 'any' | 'all';
    /** Observer root. Default is the viewport. */
    root?: Element | null;
}
/**
 * Object that mixes animated properties and animation options, in the format
 * used by presets and directives.
 */
interface MotionVariant extends AnimateOptions {
    [property: string]: unknown;
}
/**
 * Ready-made progress curves. All take and return values between 0 and 1,
 * except `easeOutBack` and `anticipate`, which exceed the range on purpose
 * to give a sense of weight.
 */
declare const easings: {
    /** Constant progress. */
    linear(t: number): number;
    /** Starts slow and accelerates. */
    easeIn(t: number): number;
    /** Starts fast and decelerates. The default choice for entries. */
    easeOut(t: number): number;
    /** Accelerates at the start and brakes at the end. */
    easeInOut(t: number): number;
    /** Overshoots the target and comes back, giving a slight exaggeration at the end. */
    easeOutBack(t: number): number;
    /** Very long deceleration, good for large entries. */
    easeOutExpo(t: number): number;
    /** Pulls back slightly before advancing, like taking a running start. */
    anticipate(t: number): number;
    /** Bounces when reaching the target. */
    bounce(t: number): number;
};
/** Names accepted in the `easing` option. */
type EasingName = keyof typeof easings;
/**
 * Animates one or multiple elements.
 *
 * ```js
 * V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 })
 * const control = V.animate(el, { scale: 1.2 }, { spring: { stiffness: 300 } })
 * await control.finished
 * ```
 *
 * @param target element, list of elements, or CSS selector
 * @param keyframes animated properties, with single value or `[from, to]` pair
 * @param options duration, delay, easing, spring, and repetition
 */
declare function animate(target: MotionTarget, keyframes: MotionKeyframes, options?: AnimateOptions): AnimationControl;
/**
 * Integrates a real spring between two numbers and delivers the value each frame.
 * Does not touch the DOM, so it works for both styles and counters,
 * smooth scrolling, or any other numeric value.
 *
 * ```js
 * V.spring(0, 320, { stiffness: 210, damping: 22, onUpdate: (v) => bar.style.width = v + 'px' })
 * ```
 */
declare function spring(from: number, to: number, options?: SpringOptions): AnimationControl;
/**
 * Animates an entire list with progressive delay between items.
 *
 * ```js
 * V.stagger('.card', V.motionPresets.fadeUp, { delay: 70, from: 'center' })
 * ```
 *
 * @param targets elements, list, or CSS selector
 * @param keyframes animated properties
 * @param options `delay` is the step between items and `start` is the delay for the entire wave
 */
declare function stagger(targets: MotionTarget, keyframes: MotionKeyframes, options?: StaggerOptions): AnimationControl;
/**
 * Fires a callback when the element enters the viewport.
 *
 * The callback can return a cleanup function, executed when the element
 * leaves the viewport. This allows mounting and unmounting effects effortlessly.
 *
 * ```js
 * const stop = V.inView(section, () => section.classList.add('active'), { once: true })
 * ```
 *
 * @returns function that stops the observation
 */
declare function inView(el: Element, callback: (entry: IntersectionObserverEntry) => void | (() => void), options?: InViewOptions): () => void;
/**
 * Reports from 0 to 1 as the element crosses the screen. Equals 0 when the top
 * of the element touches the bottom of the viewport and 1 when its bottom exits the top.
 *
 * ```js
 * V.scrollProgress(section, (p) => bar.style.width = (p * 100) + '%')
 * ```
 *
 * @returns function that stops the observation
 */
declare function scrollProgress(el: Element, callback: (progress: number) => void): () => void;
/** All presets gathered for lookup by name. */
declare const motionPresets: Record<string, MotionVariant>;

/**
 * @module charts
 *
 * Charts in pure SVG, with no external dependencies. All drawing is
 * generated as text and delivered to the container at once, which keeps
 * redrawing cheap even with data changing every frame.
 *
 * The module follows three commitments:
 *
 * - responsive, with `viewBox`, `preserveAspectRatio`, and `ResizeObserver`;
 * - accessible, with `role="img"`, descriptive `aria-label`, and `<title>` per shape;
 * - themeable, using `--v-*` variables to work in light and dark modes.
 *
 * ```html
 * <div v-chart="{ type: 'line', data: sales, labels: months, smooth: true }"></div>
 * <div v-chart="sales" v-chart-type="bar"></div>
 * ```
 */
/** Supported chart types. */
type ChartType = 'line' | 'area' | 'bar' | 'column' | 'stacked' | 'pie' | 'donut' | 'sparkline' | 'radar' | 'scatter' | 'progress';
/** Format applied to displayed values. */
type ChartFormat = 'number' | 'currency' | 'percent';
/** Named point. `x` and `y` are used only by `scatter`. */
interface ChartPoint {
    label?: string;
    value?: number;
    x?: number;
    y?: number;
}
/** Named series, used in charts with multiple lines or bars. */
interface ChartSeriesInput {
    name: string;
    data: number[];
    color?: string;
}
/** Formats accepted in `options.data`. */
type ChartData = number | number[] | ChartPoint[] | ChartSeriesInput[];
/** Configuration of a chart. */
interface ChartOptions {
    /** Chart type. Default `line`. */
    type?: ChartType;
    /** Data, in any of the accepted formats. */
    data: ChartData;
    /** Category axis labels. */
    labels?: string[];
    /** Name of the single series, used in legend and tooltip. */
    name?: string;
    /** Palette. When absent, uses brand colors. */
    colors?: string[];
    /** Height in pixels. Varies by type when absent. */
    height?: number;
    /** Width used when the container has no measurement yet. */
    width?: number;
    /** Grid lines and value axis labels. Default `true`. */
    showGrid?: boolean;
    /** Clickable legend. Default `true` when it makes sense for the type. */
    showLegend?: boolean;
    /** Writes the value of each point, bar, or slice. */
    showValues?: boolean;
    /** Animates drawing on entry. Default `true`. */
    animate?: boolean;
    /** Smooth curves in lines and areas, with Catmull-Rom to Bezier. */
    smooth?: boolean;
    /** Scale ceiling. In `progress` defines the value equivalent to 100 percent. */
    max?: number;
    /** Scale floor. */
    min?: number;
    /** Value formatting. Default `number`. */
    format?: ChartFormat;
    /** Tooltip on mouse over. Default `true`. */
    tooltip?: boolean;
}
/** Control returned by `renderChart`. */
interface ChartInstance {
    /** Container where the chart was drawn. */
    el: HTMLElement;
    /** Options currently in use. */
    readonly options: ChartOptions;
    /** Applies new options and redraws. */
    update(next: Partial<ChartOptions>): void;
    /** Removes listeners, observers, and generated content. */
    destroy(): void;
}
/**
 * Formats a value according to `options.format`. The `percent` format only
 * adds the symbol, because in a dashboard the data usually already comes in the 0 to 100 scale.
 */
declare function formatChartValue(value: number, format?: ChartFormat): string;
/**
 * Draws a chart inside an element and returns instance control.
 *
 * ```js
 * const chart = V.renderChart(document.querySelector('#sales'), {
 *   type: 'area',
 *   data: [12, 19, 8, 25, 30],
 *   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
 *   smooth: true,
 * })
 * chart.update({ data: newData })
 * ```
 *
 * @param el container that receives the SVG. Previous content is replaced.
 * @param options type, data, and visual adjustments
 */
declare function renderChart(el: HTMLElement, options: ChartOptions): ChartInstance;
/** Everything from the module gathered, to expose as `V.charts`. */
declare const charts: {
    render: typeof renderChart;
    format: typeof formatChartValue;
    colors: string[];
};

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
declare const screen: {
    width: number;
    height: number;
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
    portrait: boolean;
    landscape: boolean;
    /** Check an arbitrary media query. */
    matches(query: string): boolean;
};
declare const network: {
    online: boolean;
    /** Connection type reported by the browser, when available. */
    type: string;
    /** `true` when the user requested data saving mode. */
    saveData: boolean;
    slow: boolean;
};
declare const clipboard: {
    /** Copy text, with fallback for browsers without the modern API. */
    copy(text: string): Promise<boolean>;
    /** Read clipboard content, when the user allows. */
    read(): Promise<string>;
};

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
/** Button texts and default messages, all configurable. */
interface DialogLabels {
    confirm: string;
    cancel: string;
    ok: string;
    close: string;
    /** Message used by `v-confirm` when the attribute is empty. */
    confirmQuestion: string;
    /** Error shown by `prompt` when the required field is empty. */
    required: string;
}
declare const settings: {
    /** Duration of entrance and exit animation, in milliseconds. */
    duration: number;
    /** Default size of dialogs created by `dialog()`. */
    size: DialogSize;
};
type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DialogTone = 'default' | 'success' | 'warning' | 'danger';
type DialogIcon = 'info' | 'success' | 'warning' | 'danger' | 'question' | 'none';
/** Common options for any dialog. */
interface ModalOptions {
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
interface DialogHandle {
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
/**
 * Control of modals created from elements already on the page.
 *
 * ```js
 * V.modal.open('#login', { size: 'sm' })
 * V.modal.close('#login')
 * V.modal.isOpen()
 * ```
 */
declare const modal: {
    /** Open a page element as a modal. Accepts a selector or the element itself. */
    open(target: string | HTMLElement, options?: ModalOptions): DialogHandle | null;
    /** Close the indicated modal, or the one at the top of the stack. */
    close(target?: string | HTMLElement, result?: unknown): void;
    /** Close all open dialogs, from top to bottom. */
    closeAll(result?: unknown): void;
    /** Open if closed, close if open. */
    toggle(target: string | HTMLElement, options?: ModalOptions): DialogHandle | null;
    /** Check if a specific modal, or any, is open. */
    isOpen(target?: string | HTMLElement): boolean;
    /** Open dialogs, from oldest to newest. */
    readonly opened: DialogHandle[];
    /** Number of open dialogs. */
    readonly count: number;
    /** Adjust animation duration and default size. */
    configure(options: Partial<typeof settings>): void;
    /** Change the default button texts. */
    labels(next: Partial<DialogLabels>): DialogLabels;
};
/** Button shown in a dialog footer. */
interface DialogButton {
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
interface DialogOptions extends ModalOptions {
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
declare function dialog<T = unknown>(options: DialogOptions): Promise<T | null>;
/** Options for `V.alert()`. */
interface AlertOptions extends ModalOptions {
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
declare function alert(message: string, options?: AlertOptions): Promise<void>;
/** Options for `V.confirm()`. */
interface ConfirmOptions extends ModalOptions {
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
declare function confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
/** Types accepted by the `prompt` field. */
type PromptType = 'text' | 'password' | 'email' | 'number' | 'textarea';
/** Options for `V.prompt()`. */
interface PromptOptions extends ModalOptions {
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
declare function prompt(label: string, options?: PromptOptions): Promise<string | null>;

/**
 * @module ui/palette
 *
 * Voodoo's configurable palette. From a few base colors, the function generates
 * the complete scale of tones (50 to 900), the dark theme version, and the text
 * color with the best contrast over each color, all written as CSS variables in
 * `:root`.
 *
 * The calculation happens in OKLCH, a perceptually uniform color space: steps with
 * the same difference in luminance appear equally distant to the eye, which does not
 * happen in HSL. The text color uses the real WCAG relative luminance calculation,
 * so the result is always readable.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * V.palette({ preset: 'ocean' })
 * ```
 */
/** Color in sRGB space, with channels from 0 to 255. */
interface RgbColor {
    r: number;
    g: number;
    b: number;
}
/** Color in OKLCH: perceptual luminance (0 to 1), chroma and hue in degrees. */
interface OklchColor {
    l: number;
    c: number;
    h: number;
}
/**
 * Read a color written as `#abc`, `#aabbcc`, `rgb(...)` or `hsl(...)`.
 * Returns `null` when the text does not describe a known color.
 */
declare function parseColor(input: string): RgbColor | null;
/** Convert sRGB to OKLCH. */
declare function rgbToOklch(color: RgbColor): OklchColor;
/**
 * Convert OKLCH to sRGB. Colors outside the monitor's gamut gradually lose chroma
 * until they fit, which preserves hue and luminance instead of clipping channels
 * and changing the perceived color.
 */
declare function oklchToRgb(color: OklchColor): RgbColor;
/** Write an sRGB color as `#rrggbb`. */
declare function toHex(color: RgbColor): string;
/** Write an sRGB color as `rgba(r, g, b, alpha)`. */
declare function toRgba(color: RgbColor, alpha: number): string;
/** WCAG contrast ratio between two colors, from 1 to 21. */
declare function contrastRatio(a: RgbColor | string, b: RgbColor | string): number;
/**
 * Choose black or white for text over the given color, comparing the real
 * contrast ratio of the two options.
 */
declare function contrastText(color: RgbColor | string): string;
/** Scale of tones for a color, with steps from 50 to 900. */
type ColorScale = Record<string, string>;
/**
 * Generate the scale for a base color.
 *
 * @param color base color in any format accepted by `parseColor`
 * @param dark when `true`, generates the dark theme scale (inverted roles)
 */
declare function colorScale(color: string | RgbColor, dark?: boolean): ColorScale;
/** Set of base colors for a preset. */
interface PaletteColors {
    primary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    /** Color that tints backgrounds, texts, and borders. Default: hue of primary. */
    neutral?: string;
}
/** Names of ready-made presets. */
type PresetName = 'violeta' | 'oceano' | 'floresta' | 'poente' | 'grafite';
/** Options accepted by `V.palette()`. */
interface PaletteOptions extends Partial<PaletteColors> {
    /** Preset used as starting point. Provided colors override it. */
    preset?: PresetName;
    /** Border radius, like `12px` or `0.75rem`. */
    radius?: string;
    /** Primary font family. The page remains responsible for loading the font. */
    font?: string;
    /** Monospaced font family used by `VCodeBlock`. */
    monoFont?: string;
    /** Save the choice in localStorage. Default `true`. */
    persist?: boolean;
}
/** Resolved palette, with all scales calculated. */
interface ResolvedPalette {
    colors: PaletteColors;
    radius: string;
    font: string;
    monoFont: string;
    /** Light theme scales, by color name. */
    light: Record<string, ColorScale>;
    /** Dark theme scales, by color name. */
    dark: Record<string, ColorScale>;
    /** Text color over each base color, calculated by WCAG. */
    contrast: Record<string, string>;
    css: string;
}
/**
 * Apply a palette. Generates the scales, writes CSS variables to `:root`,
 * creates dark theme versions, and saves the choice in localStorage.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * ```
 *
 * @returns the resolved palette, with scales and generated CSS
 */
declare function applyPalette(options?: PaletteOptions): ResolvedPalette;
/**
 * Apply the palette saved in localStorage, or the default preset when there is no
 * previous choice. Called automatically by UI components.
 */
declare function initPalette(): ResolvedPalette;
/** Ensure that palette variables exist before any component. */
declare function ensurePalette(): void;
/**
 * Voodoo's palette. Call as a function to apply, or use the attached utilities
 * to inspect colors and contrast.
 *
 * ```js
 * V.palette({ preset: 'oceano' })
 * V.palette.scale('#6D3BF5')['700']
 * V.palette.contrastText('#FFB35C')  // '#000000'
 * ```
 */
declare const palette: typeof applyPalette & {
    /** Ready-made presets, indexed by name. */
    presets: Record<PresetName, PaletteColors>;
    /** Names of available presets. */
    readonly names: PresetName[];
    /** Palette in use, or `null` before the first application. */
    readonly current: ResolvedPalette | null;
    /** Options used in the last application. */
    readonly options: PaletteOptions | null;
    /** Apply the saved palette, or the default when there is nothing saved. */
    init: typeof initPalette;
    /** Ensure variables exist, without overwriting what has already been applied. */
    ensure: typeof ensurePalette;
    /** Return to the default preset and clear the saved choice. */
    reset(): ResolvedPalette;
    /** Change only the preset, maintaining current radius and font. */
    use(name: PresetName): ResolvedPalette;
    /** Scale of tones for any color. */
    scale: typeof colorScale;
    /** Black or white, depending on the best WCAG contrast over the color. */
    contrastText: typeof contrastText;
    /** WCAG contrast ratio between two colors. */
    contrastRatio: typeof contrastRatio;
    /** WCAG relative luminance of a color. */
    luminance(color: string | RgbColor): number;
    /** Converters exposed for those who want to generate derived colors. */
    convert: {
        parseColor: typeof parseColor;
        rgbToOklch: typeof rgbToOklch;
        oklchToRgb: typeof oklchToRgb;
        toHex: typeof toHex;
        toRgba: typeof toRgba;
    };
};

/**
 * @module router
 *
 * Single-page application router with no external dependencies.
 *
 * Two modes: `history`, which uses the History API and clean URLs, and `hash`, which
 * stores the route after `#` and works even when opening the file directly from disk.
 *
 * ```js
 * V.router({
 *   mode: 'history',
 *   base: '/',
 *   routes: {
 *     '/': { component: 'home', title: 'Inicio' },
 *     '/usuarios': { component: 'users' },
 *     '/usuarios/:id': { component: 'user-detail' },
 *     '/posts/:slug?': { view: '/partials/post.html' },
 *     '*': { component: 'not-found' }
 *   },
 *   beforeEach(to, from) { return true },
 *   afterEach(to, from) {}
 * })
 * ```
 *
 * ```html
 * <nav>
 *   <a v-link href="/">Inicio</a>
 *   <a v-link href="/usuarios">Usuarios</a>
 * </nav>
 * <main v-router-view>Carregando...</main>
 * ```
 */
/** Definition of a route, associated with a pattern like `/usuarios/:id`. */
interface RouteRecord {
    /** Name of the registered component that will be mounted inside `v-router-view`. */
    component?: string;
    /** URL of remote HTML loaded and inserted in place of the component. */
    view?: string;
    /** Title applied to `document.title` when entering the route. */
    title?: string;
    /** Route name, useful for `$route.name` and for navigation by name. */
    name?: string;
    /** Free-form data of the route, available in `$route.meta`. */
    meta?: Record<string, unknown>;
    /** Redirects to another path as soon as the route matches. */
    redirect?: string;
    /** Guard exclusive to this route, executed before the global `beforeEach`. */
    beforeEnter?: NavigationGuard;
}
/** Current route state. It is the object exposed by `$route`. */
interface RouteLocation {
    /** Path without query and without hash, always starting with a slash. */
    path: string;
    /** Full path, with query and hash. */
    fullPath: string;
    /** Parameters extracted from the pattern, like `{ id: '42' }`. */
    params: Record<string, string>;
    /** Query string already converted to an object. */
    query: Record<string, string>;
    /** URL anchor, without the `#`. */
    hash: string;
    /** Name declared in the matched route. */
    name: string;
    /** Metadata declared in the matched route. */
    meta: Record<string, unknown>;
    /** Pattern that matched, like `/usuarios/:id`. `null` when nothing matched. */
    matched: string | null;
}
/**
 * Navigation guard. Return `false` to cancel, a string to redirect,
 * or `true`, `undefined`, or nothing to allow passage.
 */
type NavigationGuard = (to: RouteLocation, from: RouteLocation) => boolean | string | void | Promise<boolean | string | void>;
/** Hook executed after navigation is completed. */
type NavigationHook = (to: RouteLocation, from: RouteLocation) => void;
/**
 * Scroll control. Return the desired vertical position, or `false` to
 * handle scrolling manually.
 */
type ScrollBehavior = (to: RouteLocation, from: RouteLocation, saved: number | null) => number | false | void;
interface RouterOptions {
    /** `history` uses clean URLs, `hash` stores the route after `#`. */
    mode?: 'history' | 'hash';
    /** Common prefix for all routes in `history` mode. Default `/`. */
    base?: string;
    /** Map of pattern to route definition. */
    routes: Record<string, RouteRecord>;
    /** Global guard executed before each navigation. */
    beforeEach?: NavigationGuard;
    /** Global hook executed after each navigation. */
    afterEach?: NavigationHook;
    /** Class applied by `v-link` when the route starts with the target. */
    linkActiveClass?: string;
    /** Class applied by `v-link` when the route is exactly the target. */
    linkExactActiveClass?: string;
    /** Uses the View Transitions API when switching pages. Default `true`. */
    transition?: boolean;
    /** Title template, with `%s` in place of the route title. */
    titleTemplate?: string;
    /** Fine control of scrolling after each navigation. */
    scrollBehavior?: ScrollBehavior;
}
interface NavigateOptions {
    /** Replaces the current history entry instead of stacking a new one. */
    replace?: boolean;
    /** Extra state saved in the history entry. */
    state?: Record<string, unknown>;
    /** Disables automatic scrolling for this navigation. */
    scroll?: boolean;
    /** Navigates even when the target is the same as the current route. */
    force?: boolean;
}
/**
 * Current route, reactive. Any expression that reads `$route` updates itself
 * when navigation happens.
 */
declare const route: RouteLocation;
/**
 * Navigates to a path without reloading the page.
 *
 * ```js
 * await V.navigate('/usuarios/42')
 * await V.navigate('/login', { replace: true })
 * ```
 *
 * @returns `true` when navigation happened, `false` when a guard canceled.
 */
declare function navigate(target: string, options?: NavigateOptions): Promise<boolean>;
interface RouterApi {
    (options: RouterOptions): RouterApi;
    /** Current route, reactive. */
    readonly current: RouteLocation;
    /** Stacks a new entry in history. */
    push(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Replaces the current history entry. */
    replace(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Alias of `push`, same function exposed in `V.navigate`. */
    navigate(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Goes back one entry in history. */
    back(): void;
    /** Goes forward one entry in history. */
    forward(): void;
    /** Goes `delta` entries in history. */
    go(delta: number): void;
    /** Resolves a destination without navigating. */
    resolve(target: string): RouteLocation;
    addRoute(pattern: string, record: RouteRecord): void;
    removeRoute(pattern: string): void;
    /** Registered patterns, from most specific to least specific. */
    patterns(): string[];
    /** Disconnects the history listeners. */
    stop(): void;
    clearViewCache(url?: string): void;
    /** `true` after `V.router({...})` is called. */
    readonly ready: boolean;
}
declare const router: RouterApi;

/**
 * @module i18n
 *
 * Reactive internationalization. Changing the language doesn't reload the page: all text
 * that went through `t()` and all number, currency, and date formatters update themselves
 * because everything reads the same reactive state.
 *
 * ```js
 * V.i18n({
 *   locale: 'pt-BR',
 *   fallback: 'en',
 *   messages: {
 *     'pt-BR': { comum: { salvar: 'Salvar' }, itens: 'nenhum item | {n} item | {n} itens' },
 *     'en': { comum: { salvar: 'Save' } }
 *   }
 * })
 * ```
 *
 * ```html
 * <button v-t="comum.salvar"></button>
 * <span v-t="itens" v-t-params="{ n: carrinho.length }"></span>
 * <abbr v-t:title="comum.dica">?</abbr>
 * <button v-locale="en">English</button>
 * <span>{ $t('comum.salvar') } em { $locale }</span>
 * ```
 */
/** Message tree for a language. Accepts nesting at any level. */
interface MessageTree {
    [key: string]: string | MessageTree;
}
/** Values used in the interpolation of `{key}`. */
type TranslateParams = Record<string, unknown> | number;
interface I18nOptions {
    /** Initial language. Loses to the saved language and to the detected language. */
    locale?: string;
    /** Language used when the key doesn't exist in the current language. */
    fallback?: string;
    /** Messages per language. */
    messages?: Record<string, MessageTree>;
    /** Default currency of `c()`. Falls to `config.currency`. */
    currency?: string;
    /** Saves the chosen language in localStorage. Default `true`. */
    persist?: boolean | string;
    /** Detects the browser's language when nothing was saved. Default `true`. */
    detect?: boolean;
    /** URL template for on-demand loading, with `{locale}`. */
    loadPath?: string;
}
/**
 * Translates a key in the current language.
 *
 * The search tries the current language, then similar languages, then the fallback,
 * and if nothing exists, returns the key itself, which is always better than empty
 * text on the screen.
 *
 * ```js
 * t('comum.salvar')              // 'Salvar'
 * t('ola', { nome: 'Ana' })      // 'Ola, Ana!'
 * t('itens', { n: 3 })           // '3 itens'
 * t('itens', 3)                  // shortcut for the same case
 * ```
 */
declare function t(key: string, params?: TranslateParams): string;
/** `true` when the key exists in the current language or in the fallback. */
declare function te(key: string, locale?: string): boolean;
/** Formats a number in the current language. */
declare function n(value: number | string, options?: Intl.NumberFormatOptions): string;
/** Formats a value as currency in the current language. */
declare function c(value: number | string, currency?: string): string;
/** Formats a date in the current language. Accepts preset or text mask. */
declare function d(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions): string;
/** Relative time in the current language, like 'ha 5 minutos'. */
declare function rt(value: Date | string | number): string;
/** Active language. */
declare function getLocale(): string;
/** Messages of a language, or of the current language when none is provided. */
declare function messagesOf(locale?: string): MessageTree;
/**
 * Adds messages to a language, merging with what already exists.
 * Returns the language itself, for chaining.
 */
declare function addMessages(locale: string, messages: MessageTree): string;
/**
 * Loads messages on demand.
 *
 * ```js
 * await V.i18n.loadMessages('es', '/i18n/es.json')
 * await V.i18n.loadMessages('es', { comum: { salvar: 'Guardar' } })
 * ```
 */
declare function loadMessages(locale: string, source: string | MessageTree): Promise<void>;
/**
 * Changes the active language. The entire page updates immediately without reloading.
 *
 * When `loadPath` was configured and the language doesn't have messages yet, the file
 * is fetched in the background and the promise resolves when it arrives.
 */
declare function setLocale(locale: string): Promise<void>;
/**
 * Chooses the best browser language among those that exist.
 * Returns `null` when no browser language has messages.
 */
declare function detectLocale(): string | null;
interface I18nApi {
    (options?: I18nOptions): I18nApi;
    /** Active language, reactive when read within an effect. */
    readonly locale: string;
    /** Language used when the key doesn't exist in the current language. */
    readonly fallback: string;
    /** Languages with loaded messages. */
    readonly locales: string[];
    t: typeof t;
    te: typeof te;
    n: typeof n;
    c: typeof c;
    d: typeof d;
    rt: typeof rt;
    setLocale: typeof setLocale;
    getLocale: typeof getLocale;
    addMessages: typeof addMessages;
    loadMessages: typeof loadMessages;
    messagesOf: typeof messagesOf;
    detectLocale: typeof detectLocale;
}
/**
 * The i18n object is a callable function that also loads the API. Dynamic accesses
 * are copied with getOwnPropertyDescriptors, which keeps each getter alive. With
 * Object.assign they would be executed once and the language would be frozen at
 * the initial value.
 */
declare const i18n: I18nApi;

/**
 * @module forms/validate
 *
 * Validation engine with extensible rule registration, messages in Portuguese,
 * and automatic error presentation in HTML.
 *
 * ```html
 * <form v-submit="/api/users" v-validate>
 *   <input name="email" v-required v-email>
 *   <input name="cpf" v-cpf v-error-message="Informe um CPF real.">
 * </form>
 * ```
 */
/** Elements that validation understands as form fields. */
type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
/** Rule result: `true` approves, `false` rejects, text rejects with message. */
type ValidatorResult = boolean | string;
/** Rule function. Receives the value as text, parameter, and the field itself. */
type ValidatorFn = (value: string, param: string | undefined, el: FormField) => ValidatorResult | Promise<ValidatorResult>;
interface FieldValidationResult {
    valid: boolean;
    message?: string;
    rule?: string;
}
interface FormValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}
interface SerializeOptions {
    /** Force output as `FormData`, even without files. */
    formData?: boolean;
    /** Include disabled fields. Default `false`. */
    includeDisabled?: boolean;
    /** Remove spaces at text ends. Default `true`. */
    trim?: boolean;
    /** Convert numeric fields to `number`. Default `true`. */
    numbers?: boolean;
}
/**
 * Registers a validation rule and creates the `v-validate-<name>` directive.
 *
 * ```js
 * V.validator('par', (value) => Number(value) % 2 === 0, 'Informe um numero par.')
 * ```
 */
declare function validator(name: string, fn: ValidatorFn, defaultMessage?: string): void;
/** Clears all visible errors from a form. */
declare function clearErrors(form: HTMLElement): void;
/**
 * Applies server errors to the HTML. Messages without a corresponding field
 * appear in a summary at the top of the form.
 */
declare function showFormErrors(form: HTMLElement, errors: unknown): Record<string, string>;
/**
 * General shortcut: validates an entire form or a single field, deciding
 * based on the element type received.
 *
 * ```js
 * await V.validate(document.forms[0])          // { valid, errors }
 * await V.validate(document.querySelector('#email'))  // { valid, message }
 * ```
 */
declare function validate(target: HTMLElement | FormField): Promise<FormValidationResult | FieldValidationResult>;
/**
 * Transforms the form into a JavaScript object, respecting names like
 * `user[address][street]` and `tags[]`. Returns `FormData` when a file is
 * selected or when `options.formData` is true.
 */
declare function serializeForm(form: HTMLElement, options?: SerializeOptions): Record<string, unknown> | FormData;

/**
 * @module forms/mask
 *
 * Input masks that preserve cursor position, even when the user edits the middle
 * of text or deletes a separator.
 *
 * ```html
 * <input v-mask="cpf">
 * <input v-mask="(99) 99999-9999">
 * <input v-mask.unmask="cpf" v-model="form.cpf">
 * <input v-mask-currency="R$ " v-mask-decimals="2">
 * ```
 */
/** Function that formats a raw value. Used by dynamic masks. */
type MaskResolver = (value: string) => string;
/** A mask is either a character pattern or a formatting function. */
type MaskPattern = string | MaskResolver;
/** Named masks available for `v-mask` and `applyMask`. */
declare const masks: Map<string, MaskPattern>;
/**
 * Registers a named mask.
 *
 * ```js
 * V.registerMask('processo', '9999999-99.9999.9.99.9999')
 * V.registerMask('reverso', (v) => v.split('').reverse().join(''))
 * ```
 */
declare function registerMask(name: string, patternOrFn: MaskPattern): void;
interface CurrencyMaskOptions {
    /** Text before the number. Default `R$ `. */
    prefix?: string;
    /** Text after the number. */
    suffix?: string;
    /** Decimal places. Default `2`. */
    decimals?: number;
    /** Decimal separator. Default `,`. */
    decimal?: string;
    /** Thousands separator. Default `.`. */
    thousands?: string;
}
/**
 * Formats a value as currency, typing right-to-left.
 *
 * ```js
 * V.maskCurrency('123456')  // 'R$ 1.234,56'
 * ```
 */
declare function maskCurrency(value: string, options?: CurrencyMaskOptions): string;
/** Formats percentage with two decimal places in the same style as currency. */
declare function maskPercent(value: string, decimals?: number): string;
/**
 * Applies a mask to a value. The pattern can be a registered mask name or
 * a character pattern.
 *
 * Tokens: `9` digit, `A` letter, `S` alphanumeric, `*` any character, `\` escape.
 *
 * ```js
 * V.applyMask('12345678901', 'cpf')      // '123.456.789-01'
 * V.applyMask('1234', '99-99')           // '12-34'
 * ```
 */
declare function applyMask(value: string, pattern: string): string;
/**
 * Removes formatting. For numeric masks, returns the number as text,
 * ready to become a `Number`.
 *
 * ```js
 * V.unmask('123.456.789-01')             // '12345678901'
 * V.unmask('R$ 1.234,56', 'currency')    // '1234.56'
 * ```
 */
declare function unmask(value: string, pattern?: string): string;
/**
 * Public shortcut to masks. Can be called as a function and also loads the
 * module utilities.
 *
 * ```js
 * V.mask('12345678901', 'cpf')      // '123.456.789-01'
 * V.mask.register('placa', 'AAA9A99')
 * V.mask.currency('123456')         // 'R$ 1.234,56'
 * ```
 */
declare const mask: ((value: string, pattern: string) => string) & {
    apply: typeof applyMask;
    unmask: typeof unmask;
    register: typeof registerMask;
    currency: typeof maskCurrency;
    percent: typeof maskPercent;
    presets: Map<string, MaskPattern>;
};

/**
 * @module devtools/bus
 *
 * Event bus for devtools. Lives in a separate file from the inspector to remain
 * tree-shakeable: code that only reports activity pays minimal bytes, and the
 * visual panel only enters the bundle when `xray()` is actually imported.
 *
 * Emitting with no registered listeners costs a `Map` lookup and nothing more,
 * so any module can report activity safely.
 *
 * ```ts
 * import { devtoolsBus } from '../devtools/bus';
 *
 * // Reporting a network request from a directive:
 * const start = performance.now();
 * const data = await http.get('/api/users');
 * devtoolsBus.emit('network', {
 *   method: 'GET',
 *   url: '/api/users',
 *   status: 200,
 *   ok: true,
 *   duration: performance.now() - start,
 *   source: 'v-get',
 * });
 * ```
 */
/** Network request reported to the devtools Network tab. */
interface DevtoolsNetworkEvent {
    /** HTTP method in uppercase, like `GET` or `POST`. */
    method: string;
    /** Final URL of the request. */
    url: string;
    /** Status code, when the response arrived. */
    status?: number;
    /** `true` when the response was successful. */
    ok?: boolean;
    /** Duration in milliseconds. */
    duration?: number;
    /** Error message, when the request failed. */
    error?: string;
    /** Who triggered it, like `v-get`, `http` or `router`. */
    source?: string;
}
/** DOM event triggered by a directive, shown in the Events tab. */
interface DevtoolsDomEvent {
    /** Event name, like `click` or `submit`. */
    type: string;
    /** Element that received the event. */
    el?: Element | null;
    /** Expression or detail associated, for display purposes only. */
    detail?: unknown;
    /** Who reported it, like `v-on` or `component.emit`. */
    source?: string;
}
/** Route change reported by the router. */
interface DevtoolsNavigationEvent {
    from: string;
    to: string;
    /** `true` when a guard cancelled the navigation. */
    cancelled?: boolean;
    /** Matched route pattern, if any. */
    matched?: string | null;
}
/** Locale change reported by the i18n module. */
interface DevtoolsLocaleEvent {
    from: string;
    to: string;
}
/** Reactive update reported manually by a module. */
interface DevtoolsUpdateEvent {
    el?: Element | null;
    /** Name of the key that changed, when known. */
    key?: string;
    source?: string;
}
/** Map of event types accepted by the bus. */
interface DevtoolsEventMap {
    network: DevtoolsNetworkEvent;
    event: DevtoolsDomEvent;
    navigation: DevtoolsNavigationEvent;
    locale: DevtoolsLocaleEvent;
    update: DevtoolsUpdateEvent;
}
type DevtoolsEventType = keyof DevtoolsEventMap;
/**
 * Simple publish-subscribe bus used by devtools.
 *
 * To report a network request from another module, emit the `network` type
 * with `{ method, url, status, ok, duration, source }`. The devtools Network
 * tab lists everything that arrives through it, even when the request did not
 * go through Voodoo's `http` client.
 */
declare const devtoolsBus: {
    /** Publishes an event. With no listeners, the call is practically free. */
    emit<K extends DevtoolsEventType>(type: K, data: DevtoolsEventMap[K]): void;
    /** Subscribes to an event type. Returns the function that unsubscribes. */
    on<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): () => void;
    /** Cancels a specific subscription. */
    off<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): void;
    /** Removes all listeners of a type or all listeners. */
    clear(type?: DevtoolsEventType): void;
    /** Number of listeners registered for a type. */
    count(type: DevtoolsEventType): number;
};

/**
 * @module devtools/xray
 *
 * Visual reactivity inspector for Voodoo. Runs inside the page itself, without
 * browser extension or server.
 *
 * When enabled, it outlines every element with directives, shows a card with
 * that element's scope, opens a panel with tabs for state, components, stores,
 * events, network and performance, and flashes the element every time a
 * reactive effect writes to it. That's the x-ray effect: you can see reactivity
 * happening.
 *
 * ```js
 * V.xray()            // toggle
 * V.xray(true)        // force enable
 * ```
 *
 * The module registers nothing when imported. No listeners, no styles, and no
 * timers exist before the first call, so it's tree-shakeable and costs nothing
 * in production.
 */

/** Enables the inspector. Calling twice doesn't duplicate anything. */
declare function enableXray(): void;
/** Disables the inspector and returns the page to its original state. */
declare function disableXray(): void;
/** `true` when the inspector is enabled. */
declare function isXrayEnabled(): boolean;
/**
 * Enables and disables the visual reactivity inspector.
 *
 * ```js
 * V.xray()        // toggle
 * V.xray(true)    // enable
 * V.xray(false)   // disable
 * ```
 *
 * The first call also installs the `Ctrl+Shift+X` shortcut.
 *
 * @param force enable or disable explicitly. Without argument, toggles.
 * @returns the state after the call.
 */
declare function xray(force?: boolean): boolean;

/**
 * @module devtools/launcher
 *
 * Floating widget for devtools.
 *
 * The `xray` inspector always existed, but only opened via console call. This
 * module adds a button to the page itself: it appears when devtools are on,
 * shows live activity, and opens the full panel with a click.
 *
 * Enable via HTML without writing any JavaScript:
 *
 * ```html
 * <script src="voodoo.full.min.js" devtools defer></script>
 * ```
 *
 * Equivalent forms also work: `data-devtools`, `devtools="true"` and
 * `window.VOODOO_DEVTOOLS = true` before loading.
 *
 * Enable via JavaScript:
 *
 * ```js
 * V.devtoolsWidget()       // toggle
 * V.devtoolsWidget(true)   // show
 * V.devtoolsWidget(false)  // hide
 * ```
 *
 * The module does nothing when imported: no listeners, no styles, and
 * no timers exist before the first call to `mountDevtoolsWidget()`.
 */
/** Shows the floating widget. Calling twice doesn't duplicate anything. */
declare function mountDevtoolsWidget(): void;
/** Removes the widget and all listeners it created. */
declare function unmountDevtoolsWidget(): void;
/** `true` when the widget is on screen. */
declare function isDevtoolsWidgetMounted(): boolean;
/**
 * Shows and hides the devtools floating widget.
 *
 * ```js
 * V.devtoolsWidget()       // toggle
 * V.devtoolsWidget(true)   // show
 * V.devtoolsWidget(false)  // hide
 * ```
 *
 * @param force show or hide explicitly. Without argument, toggles.
 * @returns the state after the call.
 */
declare function devtoolsWidget(force?: boolean): boolean;

/**
 * Voodoo.js
 * JavaScript feels like magic.
 *
 * Entry point for bundlers. Importing this module does not touch the DOM: the page
 * is initialized by `browser.ts`, used in the CDN build, or an explicit call to
 * `V.start()`.
 *
 * ```ts
 * import V from 'voodoojs'
 * V.start()
 * ```
 *
 * ```ts
 * import { reactive, http, toast } from 'voodoojs'
 * ```
 */

/**
 * `V` is at once a function and an object.
 *
 * ```js
 * V('#list .item').addClass('active')   // chainable collection
 * V.toast.success('Done')               // services
 * ```
 */
interface Voodoo extends Omit<typeof core, never> {
    (input?: unknown, context?: unknown): VoodooCollection;
}
declare const V: Voodoo;

export { V, type Voodoo, VoodooCollection, alert, animate, applyMask, charts, clearErrors, clipboard, confirm, V as default, devtoolsBus, devtoolsWidget, dialog, disableXray, easings, enableXray, getLocale, hotkey, i18n, inView, isDevtoolsWidgetMounted, isXrayEnabled, mask, masks, modal, motionPresets, mountDevtoolsWidget, navigate, network, palette, prompt, registerMask, renderChart, route, router, screen, scrollProgress, serializeForm, setLocale, showFormErrors, sound, efeitos as soundEffects, spring, stagger, t, unmask, unmountDevtoolsWidget, validate, validator, xray };
