import { HttpMethod, HttpDefaults, request, RequestInterceptor, ResponseInterceptor, ErrorInterceptor, clearCache, flushOfflineQueue, HttpError } from './http.cjs';
import { reactive, ref, shallowRef, computed, effect, watch, watchEffect, nextTick, toRaw, markRaw, unref, stop, effectScope, EffectScope, flushSync } from './reactivity.cjs';
import { parseDuration, DebouncedFunction, FormatOptions } from './utils.cjs';

/**
 * @module parser/lexer
 *
 * Tokenizer for the JavaScript subset accepted within `v-*` attributes.
 *
 * Voodoo does not use `eval` or `new Function`. All expression text
 * goes through this lexer, then the parser, and finally through a tree
 * interpreter. This keeps the library compatible with restrictive Content
 * Security Policy, without `unsafe-eval`.
 */
type TokenType = 'num' | 'str' | 'tpl' | 'ident' | 'punct' | 'eof';
interface TemplatePart {
    /** Literal chunks between interpolations. Always has 1 more item than `exprs`. */
    quasis: string[];
    /** Source code of each `${...}`. */
    exprs: string[];
}
interface Token {
    type: TokenType;
    value: string;
    /** Value already converted to number or string, when applicable. */
    parsed?: number | string;
    tpl?: TemplatePart;
    start: number;
    end: number;
}
/** Syntax error with position within the original expression. */
declare class VoodooSyntaxError extends Error {
    readonly source: string;
    readonly position: number;
    constructor(message: string, source: string, position: number);
}
/**
 * Converts an expression to a list of tokens.
 *
 * @throws {VoodooSyntaxError} when it encounters an invalid character.
 */
declare function tokenize(source: string): Token[];

/**
 * @module parser/parser
 *
 * Pratt parser (operator precedence) that transforms tokens to AST.
 *
 * Supports the subset of JavaScript that makes sense within an attribute:
 * literals, identifiers, member access, function calls, unary and binary
 * operators, ternary, assignment, increment, objects, arrays, arrow functions,
 * template literals, spread, optional chaining and sequences with `;`.
 *
 * Does not support, by design decision: `function`, `class`, `new`, `delete`,
 * `import`, `await`, `for` loop, `while`, `try` and complex destructuring.
 * Attribute expressions should be short. Larger logic lives in methods.
 */

type Node$1 = {
    t: 'lit';
    v: string | number | boolean | null | undefined;
} | {
    t: 'tpl';
    quasis: string[];
    exprs: Node$1[];
} | {
    t: 'id';
    n: string;
} | {
    t: 'member';
    o: Node$1;
    p: Node$1;
    computed: boolean;
    opt: boolean;
} | {
    t: 'call';
    callee: Node$1;
    args: Node$1[];
    opt: boolean;
} | {
    t: 'new';
    callee: Node$1;
    args: Node$1[];
} | {
    t: 'unary';
    op: string;
    a: Node$1;
} | {
    t: 'update';
    op: string;
    a: Node$1;
    prefix: boolean;
} | {
    t: 'bin';
    op: string;
    l: Node$1;
    r: Node$1;
} | {
    t: 'logic';
    op: string;
    l: Node$1;
    r: Node$1;
} | {
    t: 'cond';
    test: Node$1;
    cons: Node$1;
    alt: Node$1;
} | {
    t: 'assign';
    op: string;
    target: Node$1;
    value: Node$1;
} | {
    t: 'arrow';
    params: Param[];
    body: Node$1;
} | {
    t: 'method';
    params: Param[];
    body: Node$1;
} | {
    t: 'if';
    test: Node$1;
    cons: Node$1;
    alt: Node$1 | null;
} | {
    t: 'obj';
    props: ObjectProperty[];
} | {
    t: 'arr';
    els: Array<Node$1 | {
        spread: Node$1;
    }>;
} | {
    t: 'seq';
    body: Node$1[];
} | {
    t: 'return';
    a: Node$1 | null;
};
interface ObjectProperty {
    /** Fixed key name, or `null` when the key is computed. */
    key: string | null;
    keyExpr?: Node$1;
    value?: Node$1;
    spread?: Node$1;
    /** `true` for `{ get name() { ... } }`, evaluated on every read. */
    getter?: boolean;
}
/**
 * One parameter of an arrow function or an object method.
 *
 * Parameters used to be plain strings, which meant only the simplest form
 * worked. `((x = 1) => x)()`, `((...xs) => xs)(1, 2)` and
 * `people.map(({ name }) => name)` all failed to parse, and the last of those
 * is how anybody actually writes that line.
 *
 * `def` carries a default for every shape, because JavaScript allows one
 * wherever a binding appears, including inside a pattern.
 */
type Param = {
    kind: 'id';
    name: string;
    def?: Node$1;
} | {
    kind: 'rest';
    name: string;
} | {
    kind: 'obj';
    props: Array<{
        key: string;
        value: Param;
    }>;
    rest?: string;
    def?: Node$1;
} | {
    kind: 'arr';
    elements: Array<Param | null>;
    rest?: string;
    def?: Node$1;
};
/**
 * Converts text to AST, with caching.
 *
 * ```js
 * parse('count + 1')
 * // { t: 'bin', op: '+', l: { t: 'id', n: 'count' }, r: { t: 'lit', v: 1 } }
 * ```
 */
declare function parse(source: string): Node$1;
/** Clears the expression cache. Used in tests and hot reload. */
declare function clearParseCache(): void;

/**
 * @module parser/interpreter
 *
 * AST interpreter. Takes a node and a scope and returns the value.
 *
 * Security: there is no implicit access to `window`, `globalThis`, `document`,
 * `fetch` or `eval`. Identifiers not in scope are looked up in a closed list of
 * allowed globals, configurable by the application.
 */

/** Minimum contract that a scope must fulfill to be evaluated. */
interface EvalScope {
    /** Returns the object containing the key, walking up the scope chain. */
    lookup(name: string): Record<string, any> | undefined;
    /** Reads a value from the scope chain. */
    get(name: string): unknown;
    /** Writes to the scope chain, in the key owner when it exists. */
    set(name: string, value: unknown): void;
    /** Creates a child scope with local variables, used by arrow functions and `v-for`. */
    child(vars: Record<string, unknown>): EvalScope;
}
declare const allowedGlobals: Record<string, unknown>;
/** Runtime error for an expression, with original text attached. */
declare class VoodooRuntimeError extends Error {
    readonly expression?: string | undefined;
    constructor(message: string, expression?: string | undefined);
}
/**
 * Evaluates an AST node.
 *
 * @param node node generated by `parse()`
 * @param scope read and write scope
 */
declare function evaluate(node: Node$1, scope: EvalScope): any;
/** Converts any value to text that will be written to the DOM. */
declare function stringify(value: unknown): string;

/**
 * @module runtime/scope
 *
 * Scope chain. Each `v-data`, each component, and each iteration of `v-for`
 * creates a child scope. Identifier lookup travels up the chain to the root, and
 * if nothing is found, falls back to magic variables (`$store`, `$el`, ...).
 */

type MagicGetter = (scope: Scope) => unknown;
/** Global registry of magic variables, filled by modules. */
declare const magics: Map<string, MagicGetter>;
/** Register a magic variable available in any expression. */
declare function magic(name: string, getter: MagicGetter): void;
/**
 * Registry of helpers reached by a bare name, with no `$` in front.
 *
 * Kept apart from `magics` because that one prefixes `$` onto anything missing
 * it, which is the right default for `$store` and the wrong one for `useEffect`.
 * Data in scope still wins: `lookup` walks the scope chain first, so a variable
 * of your own named `useMemo` shadows the hook rather than colliding with it.
 */
declare const hooks: Map<string, MagicGetter>;
/** Register a helper callable by bare name inside any expression. */
declare function hook(name: string, getter: MagicGetter): void;
/**
 * Fields are `declare`d and assigned in the constructor, not initialised at the
 * declaration.
 *
 * With `useDefineForClassFields` and a build target below native class fields,
 * `refs = {}` compiles to an `Object.defineProperty` call. A list creates two of
 * these scopes per row, so a thousand rows meant thousands of defines before any
 * work happened. Plain assignment produces the same own, writable, enumerable,
 * configurable properties, in the same order.
 */
declare class Scope implements EvalScope {
    /** Data local to this scope, normally a reactive proxy. */
    data: Record<string, any>;
    parent: Scope | null;
    /** Element that created the scope. Used by `$el` and `$refs`. */
    el: Element | null;
    /** References declared with `v-ref` within this scope. */
    refs: Record<string, Element>;
    /** Component instance, when this scope belongs to one. */
    component: any;
    /** Values delivered by `provide`, visible to lower scopes. */
    provides: Record<string, unknown> | null;
    private magicCache;
    constructor(data?: Record<string, any>, parent?: Scope | null, el?: Element | null);
    /** Root scope of the chain. */
    get root(): Scope;
    /** Look up a `provide` value by traveling up the scope chain. */
    inject<T = unknown>(key: string, fallback?: T): T | undefined;
    /** Nearest component scope, traveling up the chain. */
    get owner(): Scope | null;
    /** Set of visible refs, merging ancestor scopes. */
    get allRefs(): Record<string, Element>;
    lookup(name: string): Record<string, any> | undefined;
    has(name: string): boolean;
    get(name: string): unknown;
    set(name: string, value: unknown): void;
    child(vars?: Record<string, unknown>, el?: Element | null): Scope;
    /** Create a reactive child scope, used by `v-data` and `v-for`. */
    reactiveChild(vars: Record<string, unknown>, el?: Element | null): Scope;
    private magicContainer;
}
/**
 * Global root scope, shared by elements without `v-data`.
 * The data is reactive, so any value placed here by `V.data()` or `v-resource`
 * automatically updates the page.
 */
declare const rootScope: Scope;

/**
 * @module runtime/registry
 *
 * Global registries: configuration, directives, components, and plugins.
 */

interface VoodooConfig {
    /** Attribute prefix. Change to `data-v-` for strictly valid HTML. */
    prefix: string;
    /** Initialize the DOM automatically when the script loads. */
    autoStart: boolean;
    /** Watch the DOM with MutationObserver and initialize new elements. */
    autoDiscover: boolean;
    /** Observed root. Default is `document.body`. */
    root: Element | null;
    /** Show detailed warnings in the console. */
    devtools: boolean;
    /**
     * Keyboard shortcut that opens the reactivity inspector, in the full build.
     *
     * Written as `'ctrl+shift+f2'`. The last part names the physical key, so it
     * behaves the same on every keyboard layout. Set to `false` to install no
     * listener at all.
     *
     * Read `xrayShortcut` in `devtools/xray.ts` before changing the default: the
     * previous two choices were both taken, one by Opera and one by the Windows
     * keyboard layout switcher.
     */
    xrayShortcut: string | false;
    /** Base URL for requests triggered by attributes. */
    baseURL: string;
    /** Globals allowed inside expressions. */
    globals: Record<string, unknown>;
    /** Locale used by date, number, and currency formatters. */
    locale: string;
    /** Default currency for `v-currency`. */
    currency: string;
    /** Inject UI component CSS automatically. */
    injectStyles: boolean;
    /**
     * Remove `v-*` attributes from HTML after processing, leaving the DOM clean
     * in the inspector. Values remain accessible internally.
     */
    cleanAttributes: boolean;
    /**
     * Reject `javascript:`, `vbscript:`, and `data:text/html` in attributes that
     * the browser navigates, like `href`, `src`, `action`, and `formaction`. Only
     * turn off if the application truly needs to generate those schemes.
     */
    sanitizeUrls: boolean;
}
declare const config: VoodooConfig;
interface DirectiveBinding<T = any> {
    el: HTMLElement;
    /** Already-evaluated value of the expression. */
    value: T;
    oldValue: T | undefined;
    /** Argument after the colon, like `click` in `v-on:click`. */
    arg?: string;
    /** Modifiers after the dots, like `.prevent.stop`. */
    modifiers: Record<string, string | true>;
    /** Original text of the expression. */
    expression: string;
    scope: Scope;
    /** Nearest component instance, when it exists. */
    instance: any;
}
/** Directive in lifecycle format, used by `V.directive()`. */
interface DirectiveHooks<T = any> {
    created?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    beforeMount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    mounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    updated?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    beforeUnmount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    unmounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    /** Execution order. Higher runs first. Default 0. */
    priority?: number;
    /** When `true`, the expression is not evaluated automatically. */
    raw?: boolean;
    /**
     * Takes over the entire subtree, as `v-if` and `v-for` do: the walker doesn't
     * descend into children, and the directive itself decides what to do with them.
     * Without this, a plugin can't write a structural directive.
     */
    terminal?: boolean;
}
/** Context delivered to internal directives, with fine-grained effect control. */
interface DirectiveContext {
    el: HTMLElement;
    scope: Scope;
    /** Expression text, exactly as written in the attribute. */
    expression: string;
    arg?: string;
    modifiers: Record<string, string | true>;
    /** Evaluate the attribute expression, or another passed as parameter. */
    evaluate<T = any>(expression?: string): T;
    /** Create a reactive effect with cleanup tied to the element. */
    effect(fn: () => void): void;
    /** Register cleanup executed when the element leaves the DOM. */
    cleanup(fn: () => void): void;
    /** Walk a subtree applying directives, used by `v-if` and `v-for`. */
    walk(node: Node, scope: Scope): void;
    /** Full attribute name, useful for error messages. */
    raw: string;
}
type DirectiveSetup = (ctx: DirectiveContext) => void;
interface DirectiveDefinition {
    name: string;
    setup: DirectiveSetup;
    /** Higher runs first. */
    priority: number;
    /** Prevents the walker from descending into children, as in `v-for` and `v-if`. */
    terminal: boolean;
}
/** Priorities of special cases. Higher values are processed first. */
declare const PRIORITY: {
    readonly IGNORE: 100;
    readonly FOR: 90;
    readonly IF: 80;
    readonly DATA: 70;
    readonly COMPONENT: 65;
    readonly REF: 60;
    readonly BIND: 45;
    readonly MODEL: 40;
    readonly DEFAULT: 0;
    readonly INIT: -10;
    readonly TRANSITION: -20;
};
interface RegisterDirectiveOptions {
    priority?: number;
    terminal?: boolean;
}
/** Internal registry, used by native directives. */
declare function defineDirective(name: string, setup: DirectiveSetup, options?: RegisterDirectiveOptions): void;
interface ComponentDefinition {
    /** Initial state. Receives already-resolved props. */
    state?: (this: any, props: Record<string, any>) => Record<string, any>;
    /** Alias for `state`, for those coming from Vue. */
    data?: (this: any, props: Record<string, any>) => Record<string, any>;
    /** Names of accepted props, or definition with type and default value. */
    props?: string[] | Record<string, PropDefinition>;
    methods?: Record<string, (this: any, ...args: any[]) => any>;
    computed?: Record<string, (this: any) => any>;
    watch?: Record<string, (this: any, value: any, oldValue: any) => void>;
    /** Component HTML. Use `<slot>` to receive the original content. */
    template?: string;
    /** CSS injected once when the component is used. */
    style?: string;
    /** Inherit parent scope instead of isolating. Default `false`. */
    inheritScope?: boolean;
    /** Values delivered to descendants, read with `inject`. */
    provide?: Record<string, unknown> | ((this: any) => Record<string, unknown>);
    /** Values looked up in a `provide` above, available as state. */
    inject?: string[] | Record<string, {
        from?: string;
        default?: unknown;
    }>;
    beforeMount?(this: any): void;
    mounted?(this: any): void;
    updated?(this: any): void;
    beforeUnmount?(this: any): void;
    destroyed?(this: any): void;
    unmounted?(this: any): void;
    [key: string]: any;
}
interface PropDefinition {
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
    default?: any;
    required?: boolean;
}
interface VoodooPlugin {
    name?: string;
    install(V: any, options?: Record<string, unknown>): void;
}

/**
 * @module runtime/component
 *
 * Component model. A Voodoo component is a scope with state, methods, computed
 * properties, watchers, props, slots and lifecycle, mounted on an existing
 * element. There is no compilation step.
 *
 * Three ways to use:
 *
 * ```html
 * <div v-component="counter"></div>          <!-- registered -->
 * <counter></counter>                        <!-- custom tag -->
 * <Counter start="10"></Counter>             <!-- PascalCase tag -->
 * ```
 */

interface ComponentInstance {
    $el: HTMLElement;
    $props: Record<string, any>;
    $refs: Record<string, Element>;
    $scope: Scope;
    $parent: ComponentInstance | null;
    $name: string;
    emit(event: string, detail?: unknown): void;
    [key: string]: any;
}
/** Already mounted components, for inspection by devtools. */
declare const instances: Set<ComponentInstance>;
/**
 * Registers a component.
 *
 * ```js
 * V.component('counter', {
 *   props: { start: { type: 'number', default: 0 } },
 *   state(props) { return { count: props.start } },
 *   computed: { double() { return this.count * 2 } },
 *   methods: { increment() { this.count++ } },
 *   template: `
 *     <button v-click="increment" v-text="count"></button>
 *     <small v-text="double"></small>
 *   `,
 *   mounted() { console.log('mounted') }
 * })
 * ```
 */
declare function defineComponent(name: string, definition: ComponentDefinition): void;
/**
 * Mounts a component on an element and returns the resulting scope.
 * Called by the walker when it finds `v-component` or a registered tag.
 */
declare function mountComponent(el: HTMLElement, name: string, parentScope: Scope): Scope | null;

/**
 * @module storage
 *
 * Uniform access to localStorage, sessionStorage, cookies, query string, and an
 * in-memory cache with expiration. All reads and writes are safe: in private mode,
 * with full quota, or outside the browser, calls do not throw.
 */
interface StorageAdapter {
    get<T = unknown>(key: string, fallback?: T): T | undefined;
    set(key: string, value: unknown): boolean;
    remove(key: string): void;
    clear(): void;
    has(key: string): boolean;
    keys(): string[];
}
/** `localStorage` with automatic JSON serialization. */
declare const storage: StorageAdapter;
/** `sessionStorage` with automatic JSON serialization. */
declare const session: StorageAdapter;
interface CookieOptions {
    /** Days until expiry, or a date. */
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
declare const cookie: {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
    remove(name: string, options?: CookieOptions): void;
    has(name: string): boolean;
};
declare const url: {
    /** Reads a parameter from the current URL. */
    get(key: string, fallback?: string): string | undefined;
    /** Reads all parameters as an object. */
    all(): Record<string, string>;
    /** Writes a parameter without reloading the page. */
    set(key: string, value: string | number | null, replace?: boolean): void;
    remove(key: string, replace?: boolean): void;
    /** Applies multiple parameters at once. */
    merge(params: Record<string, string | number | null>, replace?: boolean): void;
};
declare const cache: {
    /** Stores a value. `ttl` in milliseconds, `0` means no expiration. */
    set<T>(key: string, value: T, ttl?: number): T;
    get<T = unknown>(key: string, fallback?: T): T | undefined;
    has(key: string): boolean;
    remove(key: string): void;
    clear(): void;
    /** Executes the function only when the value is not in cache. */
    remember<T>(key: string, ttl: number, factory: () => Promise<T> | T): Promise<T>;
    readonly size: number;
};
type ThemeName = 'light' | 'dark' | 'system';
declare const theme: {
    /** Theme chosen by the user, or `system` when never set. */
    readonly current: ThemeName;
    /** Theme effectively applied, resolving `system`. */
    readonly resolved: "light" | "dark";
    set(value: ThemeName): void;
    toggle(): "light" | "dark";
    /** `true` once the visitor has actually picked a theme. */
    readonly chosen: boolean;
    /** Writes `data-theme` on the root element and notifies the page. */
    apply(): void;
    /**
     * Applies the saved theme as soon as the page loads.
     *
     * Does nothing when the visitor never chose one, which is the common case on
     * a page that simply included the script.
     */
    init(): void;
};

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
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';
type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
interface ToastOptions {
    title?: string;
    description?: string;
    type?: ToastType;
    /** Milliseconds until close. `0` keeps it open until the user closes it. */
    duration?: number;
    position?: ToastPosition;
    /** Action button inside the notification. */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Show the close button. */
    closable?: boolean;
    /** Custom HTML in place of default content. Use with caution. */
    html?: string;
    onClose?: () => void;
}
interface ToastHandle {
    id: string;
    close(): void;
    update(options: Partial<ToastOptions>): void;
}
declare const settings: {
    duration: number;
    position: ToastPosition;
    max: number;
};
declare const toast: ((message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle) & {
    success: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    error: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    warning: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    info: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    loading: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
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
    promise<T>(promise: Promise<T>, messages?: {
        loading?: string;
        success?: string | ((value: T) => string);
        error?: string | ((error: unknown) => string);
    }): Promise<T>;
    /** Close all open notifications. */
    clear(): void;
    /** Adjust default duration, position, and limit. */
    configure(options: Partial<typeof settings>): void;
    settings: {
        duration: number;
        position: ToastPosition;
        max: number;
    };
};

/**
 * @module runtime/walker
 *
 * Walks the DOM, finds `v-*`, `:` and `@` attributes, and connects each to the
 * reactive system. This is the engine that turns HTML into an application.
 *
 * Order rules for a single element:
 *   1. `v-ignore` and `v-pre` cancel processing.
 *   2. Terminal directives (`v-for`, `v-if`) take control of the subtree.
 *   3. `v-data` and `v-component` create the scope used by the rest.
 *   4. Other directives run by descending priority.
 *   5. Children are walked with the resulting scope.
 */

/** Scope associated with a node, if any. */
declare function getScope(node: Node): Scope | undefined;
/** Effective scope of a node, walking up through ancestors. */
declare function findScope(node: Node | null): Scope;
/** Registers a function executed when the node is removed from the DOM. */
declare function addCleanup(node: Node, fn: () => void): void;
/**
 * Unmounts a node and all descendants: stops effects, removes listeners, and
 * fires the `beforeUnmount` and `unmounted` hooks.
 */
declare function destroy(node: Node): void;
interface ParsedAttribute {
    /** Attribute name as written in HTML. */
    raw: string;
    /** Directive name, without prefix, like `text`, `on`, `toast-success`. */
    name: string;
    /** Argument after the colon, like `click` in `v-on:click`. */
    arg?: string;
    modifiers: Record<string, string | true>;
    /** Attribute value. */
    expression: string;
}
/**
 * Converts an HTML attribute into a directive description.
 * Returns `null` when the attribute doesn't belong to Voodoo.
 *
 * ```
 * v-on:click.prevent="save"  ->  { name:'on', arg:'click', modifiers:{prevent:true} }
 * :disabled="loading"        ->  { name:'bind', arg:'disabled' }
 * @submit.prevent="save"     ->  { name:'on', arg:'submit', modifiers:{prevent:true} }
 * ```
 */
declare function parseAttribute(name: string, value: string): ParsedAttribute | null;
/**
 * Evaluates an expression in the given scope. Errors are reported without
 * breaking the page, because a problematic attribute shouldn't crash the rest
 * of the app.
 */
declare function evaluateIn<T = any>(expression: string, scope: Scope, context?: string, el?: Element | null): T;
/**
 * Walks a node applying the directives found.
 *
 * @param node root of the section to initialize
 * @param scope scope applied to the node. When absent, inferred from ancestors.
 */
declare function walk(node: Node, scope?: Scope): void;
/** Initializes Voodoo in a root. Called automatically in the browser. */
declare function start(root?: Element | Document): void;
/** Stops automatic DOM observation. */
declare function stopObserving(): void;
/** Reinitializes Voodoo within a root, useful in tests. */
declare function refresh(root?: Element): void;

/**
 * @module runtime/app
 *
 * Application mode: `createApp(...).mount('#app')`.
 *
 * Voodoo's traditional mode binds attributes to existing HTML. This module adds
 * the alternative path used by Vue and React: the entire application is described
 * in JavaScript, has its own root, and HTML comes from the template.
 *
 * ```js
 * const app = V.createApp({
 *   data: () => ({ n: 0 }),
 *   computed: { dobro() { return this.n * 2 } },
 *   methods: { somar() { this.n++ } },
 *   template: `
 *     <button @click="somar()">Cliques: { n }</button>
 *     <p>Dobro: { dobro }</p>
 *   `
 * })
 *
 * app.mount('#app')
 * ```
 *
 * Two intentional differences from Vue:
 *
 * 1. `mount` accepts a target that doesn't exist yet. No race with page loading,
 *    because Voodoo's own scheduler waits, not `DOMContentLoaded`.
 * 2. `unmount` restores the container to original HTML instead of leaving it empty.
 */

interface AppOptions extends ComponentDefinition {
    /** Components visible only within this application. */
    components?: Record<string, ComponentDefinition>;
    /** Values delivered to the entire tree, read with `inject`. */
    provide?: Record<string, unknown> | (() => Record<string, unknown>);
}
interface AppConfig {
    /** Values allowed inside this application's expressions. */
    globalProperties: Record<string, unknown>;
}
interface App {
    /** Internal name of the root component, useful in messages and inspector. */
    readonly name: string;
    readonly config: AppConfig;
    /** Root instance, or `null` until the application is mounted. */
    readonly instance: ComponentInstance | null;
    /** Element that received the application, or `null`. */
    readonly container: Element | null;
    readonly isMounted: boolean;
    component(name: string): ComponentDefinition | undefined;
    component(name: string, definition: ComponentDefinition): App;
    directive(name: string, definition: unknown): App;
    use(plugin: VoodooPlugin | Function, options?: Record<string, unknown>): App;
    provide(key: string, value: unknown): App;
    /**
     * Mounts the application. The target can be a selector or element, and may
     * not exist yet: in that case mounting happens as soon as it appears.
     */
    mount(target: string | Element): ComponentInstance | null;
    /** Promise resolved with the root instance when mounting happens. */
    whenMounted(): Promise<ComponentInstance>;
    /** Unmount and restore the container to its original content. */
    unmount(): void;
}
/**
 * Creates an application. Options are the same as for a component, plus
 * `components` and `provide`.
 */
declare function createApp(options?: AppOptions): App;

/**
 * @module runtime/boot
 *
 * Voodoo's custom initialization scheduler.
 *
 * The library doesn't use `DOMContentLoaded` or `document.readyState` to know
 * when to start. Instead it maintains its own loop: at each step it asks whether
 * a task's condition is met, and executes those that are.
 *
 * The reason is simple. Browser load events answer the wrong question.
 * `DOMContentLoaded` says the parser finished, not that the tree we care about
 * exists. A page rendered by another script, a fragment inserted later, a
 * container that only appears on the second viewport: in all these cases the
 * event already passed, or will pass too early.
 *
 * The loop here answers the right question: "do I have what I need in the
 * document and has it stopped changing?". This applies both to automatic startup
 * and to `app.mount('#app')` called before `#app` exists.
 *
 * ```js
 * whenReady(() => V.start())                    // document stable
 * whenElement('#app', (el) => mount(el))        // element, whether it exists or not
 * ```
 */
/**
 * Executes when the document has a body and stops changing.
 *
 * Replaces `DOMContentLoaded`. The practical difference appears in two cases:
 * a script without `defer` in `<head>`, where the body doesn't exist yet, and a
 * page rendered by another script, where the event already passed.
 */
declare function whenReady(action: () => void): void;
/**
 * Resolves an element that may not exist yet.
 *
 * ```js
 * whenElement('#app', (el) => app.mount(el))
 * ```
 */
declare function whenElement(target: string | Element, action: (el: Element) => void, onGiveUp?: () => void): void;
/** Promise resolved when the document is ready by the above criterion. */
declare function ready$1(): Promise<void>;

/**
 * @module http/resource
 *
 * Reactive resource: a request with loading state, error, and data ready to be
 * read directly in HTML.
 *
 * It's the same core used by `v-resource`. The directive just reads the
 * configuration from attributes and calls this function, so the behavior of
 * both is always the same, with no duplicated logic.
 *
 * ```js
 * const produtos = V.resource('/api/produtos')
 * V.effect(() => console.log(produtos.loading, produtos.data))
 * await produtos.reload()
 * ```
 */

interface ResourceOptions {
    /** HTTP verb. Default `GET`. */
    method?: HttpMethod;
    /** Query parameters. A function is re-evaluated on each request. */
    params?: Record<string, string | number | boolean | null | undefined> | (() => Record<string, string | number | boolean | null | undefined> | undefined);
    /** Response cache duration in ms. */
    cache?: number;
    /** Extra attempts on failure. */
    retry?: number;
    /** Milliseconds before aborting. */
    timeout?: number;
    headers?: Record<string, string>;
    /** Path within the JSON response, like `data.items`. */
    jsonPath?: string | null;
    /** Don't fire the first request automatically. */
    manual?: boolean;
    /** Repeat request every N ms while the tab is visible. */
    poll?: number;
    /** Called after each successful response. */
    onSuccess?(data: unknown): void;
    /** Called when request fails, with message already extracted. */
    onError?(err: unknown, message: string): void;
}
interface Resource<T = unknown> {
    /** Response body, already sliced by `jsonPath` if present. */
    data: T | null;
    /** `true` while request is in progress. */
    loading: boolean;
    /** Error from last attempt, or `null`. */
    error: (Error & {
        message: string;
    }) | null;
    /** `true` after first successful response. */
    loaded: boolean;
    /** Redo the request. */
    reload(): Promise<void>;
    /** Change data locally, useful for optimistic updates. */
    set(value: T): void;
    /** Cancel in-progress request and stop automatic repetition. */
    stop(): void;
}
/**
 * Creates a reactive resource.
 *
 * @param url fixed address, or function that returns the address on each call.
 *   Returning empty postpones the request, useful while a parameter doesn't exist.
 * @param options request and lifecycle configuration
 */
declare function createResource<T = unknown>(url: string | (() => string), options?: ResourceOptions): Resource<T>;

/**
 * @module store
 *
 * Reactive global state. A store is a named reactive object, accessible from
 * any expression via the magic variable `$store`.
 *
 * ```js
 * V.store('cart', { items: [], get total() { return this.items.length } })
 * ```
 *
 * ```html
 * <span>{ $store.cart.total }</span>
 * <button v-click="$store.cart.items.push(product)">Add</button>
 * ```
 */
type StoreDefinition = Record<string, any>;
interface StoreOptions {
    /** Saves the store to localStorage and restores on next load. */
    persist?: boolean | string;
}
/**
 * Creates or retrieves a store.
 *
 * Passing only the name returns the existing store. Passing the definition
 * creates the store. Methods declared in the definition receive `this` pointing
 * to the store itself.
 */
declare function store<T extends StoreDefinition>(name: string, definition?: T, options?: StoreOptions): T;
/** All registered stores, used by `$store` and devtools. */
declare const allStores: Record<string, Record<string, any>>;
/** Removes a store and stops its associated persistence. */
declare function removeStore(name: string): void;
/** Lists the names of existing stores. */
declare function storeNames(): string[];

/**
 * @module dom/style
 *
 * On-demand CSS injection. Each block enters the document only once, only
 * when the corresponding resource is actually used, avoiding dead CSS.
 *
 * All styles use CSS variables with built-in default values. If the project
 * loads Voodoo's design system, colors automatically follow the theme.
 */
/** Injects a CSS block identified by `id`. Repeating the call does not duplicate. */
declare function injectStyle(id: string, css: string): void;
/** Ensures tokens are present before any UI component. */
declare function ensureTokens(): void;

/**
 * @module dom/transition
 *
 * Entry and exit transitions based on CSS classes, in the same model as Vue,
 * but without a wrapper component: just use `v-transition` on the element.
 *
 * Entry cycle:
 *   `.{name}-enter-from` applied, next frame switches to `.{name}-enter-to`,
 *   both with `.{name}-enter-active`, removed when animation finishes.
 */
interface TransitionClasses {
    enterFrom?: string;
    enterActive?: string;
    enterTo?: string;
    leaveFrom?: string;
    leaveActive?: string;
    leaveTo?: string;
}
interface TransitionOptions extends TransitionClasses {
    /** Base name of the classes. Default `v-fade`. */
    name?: string;
    /** Forced duration in ms. When absent, read from computed CSS. */
    duration?: number;
}
/** Executes the entry transition and resolves when it finishes. */
declare function enter(el: HTMLElement, options?: TransitionOptions): Promise<void>;
/** Executes the exit transition and resolves when it finishes. */
declare function leave(el: HTMLElement, options?: TransitionOptions): Promise<void>;
/** Animates height from 0 to content. Used by `v-collapse`. */
declare function slideDown(el: HTMLElement, duration?: number): Promise<void>;
/** Animates height to zero and hides the element. */
declare function slideUp(el: HTMLElement, duration?: number): Promise<void>;
/** Appearance with fade. */
declare function fadeIn(el: HTMLElement, duration?: number): Promise<void>;
/** Disappearance with fade, ending in `display:none`. */
declare function fadeOut(el: HTMLElement, duration?: number): Promise<void>;
/**
 * Smooth layout transitions using the View Transitions API when available.
 * On browsers without support, the function just executes the change.
 */
declare function viewTransition(update: () => void): void;

type EventHandler = (payload?: any) => void;
/** Subscribes to a global event. Returns a function that cancels the subscription. */
declare function on(name: string, handler: EventHandler): () => void;
/** Subscribes to a global event for only the next occurrence. */
declare function onceEvent(name: string, handler: EventHandler): () => void;
/** Emits a global event. */
declare function emit(name: string, payload?: unknown): void;
declare function off(name: string, handler?: EventHandler): void;
/**
 * Registers a custom directive.
 *
 * ```js
 * V.directive('highlight', {
 *   mounted(el, binding) { el.style.background = binding.value },
 *   updated(el, binding) { el.style.background = binding.value }
 * })
 * ```
 *
 * ```html
 * <div v-highlight="'yellow'">Highlight</div>
 * ```
 *
 * Also accepts a short function, called in both `mounted` and `updated`:
 *
 * ```js
 * V.directive('highlight', (el, binding) => { el.style.background = binding.value })
 * ```
 */
declare function directive<T = any>(name: string, definition: DirectiveHooks<T> | ((el: HTMLElement, binding: DirectiveBinding<T>) => void)): void;
/**
 * Places values in the root scope, visible to any expression on the page.
 *
 * ```js
 * V.data({ user: null, loading: false })
 * ```
 */
declare function data<T extends Record<string, unknown>>(values: T): T;
/**
 * Core of Voodoo. The exported object is also callable: `V('#app')` returns
 * a chainable collection of elements.
 */
declare const core: {
    version: string;
    config: VoodooConfig;
    reactive: typeof reactive;
    ref: typeof ref;
    shallowRef: typeof shallowRef;
    computed: typeof computed;
    effect: typeof effect;
    watch: typeof watch;
    watchEffect: typeof watchEffect;
    nextTick: typeof nextTick;
    toRaw: typeof toRaw;
    markRaw: typeof markRaw;
    unref: typeof unref;
    stop: typeof stop;
    effectScope: typeof effectScope;
    EffectScope: typeof EffectScope;
    flushSync: typeof flushSync;
    data: typeof data;
    store: typeof store;
    stores: Record<string, Record<string, any>>;
    removeStore: typeof removeStore;
    storeNames: typeof storeNames;
    scope: Scope;
    component: typeof defineComponent;
    components: Map<string, ComponentDefinition>;
    directive: typeof directive;
    directives: Map<string, DirectiveDefinition>;
    magic: typeof magic;
    magics: Map<string, MagicGetter>;
    createApp: typeof createApp;
    start: typeof start;
    whenReady: typeof whenReady;
    whenElement: typeof whenElement;
    walk: typeof walk;
    refresh: typeof refresh;
    destroy: typeof destroy;
    stopObserving: typeof stopObserving;
    getScope: typeof getScope;
    findScope: typeof findScope;
    addCleanup: typeof addCleanup;
    parseAttribute: typeof parseAttribute;
    parse: typeof parse;
    tokenize: typeof tokenize;
    evaluate: typeof evaluate;
    evaluateIn: typeof evaluateIn;
    stringify: typeof stringify;
    clearParseCache: typeof clearParseCache;
    globals: Record<string, unknown>;
    http: {
        defaults: HttpDefaults;
        get<T = unknown>(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        post<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        put<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        patch<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        delete<T = unknown>(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        head(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<unknown>;
        request: typeof request;
        upload<T = unknown>(url: string, data: FormData, options?: {
            method?: "POST" | "PUT" | "PATCH";
            headers?: Record<string, string>;
            onProgress?: (percent: number, loaded: number, total: number) => void;
            signal?: AbortSignal;
        }): Promise<T>;
        sse(url: string, handlers?: {
            message?: (data: unknown, event: MessageEvent) => void;
            error?: (e: Event) => void;
        }): EventSource;
        stream(url: string, onLine: (line: string) => void, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<void>;
        interceptors: {
            request: {
                use(fn: RequestInterceptor): () => void;
            };
            response: {
                use(fn: ResponseInterceptor): () => void;
            };
            error: {
                use(fn: ErrorInterceptor): () => void;
            };
        };
        setHeader(name: string, value: string | null): void;
        setToken(token: string | null, scheme?: string): void;
        setBaseURL(url: string): void;
        clearCache: typeof clearCache;
        flushOfflineQueue: typeof flushOfflineQueue;
        parseDuration: typeof parseDuration;
    };
    request: typeof request;
    HttpError: typeof HttpError;
    /** Reactive resource via JavaScript, equivalent to `v-resource`. */
    resource: typeof createResource;
    toast: ((message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle) & {
        success: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        error: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        warning: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        info: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        loading: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        promise<T>(promise: Promise<T>, messages?: {
            loading?: string;
            success?: string | ((value: T) => string);
            error?: string | ((error: unknown) => string);
        }): Promise<T>;
        clear(): void;
        configure(options: Partial<{
            duration: number;
            position: ToastPosition;
            max: number;
        }>): void;
        settings: {
            duration: number;
            position: ToastPosition;
            max: number;
        };
    };
    storage: StorageAdapter;
    session: StorageAdapter;
    cookie: {
        get(name: string): string | undefined;
        set(name: string, value: string, options?: CookieOptions): void;
        remove(name: string, options?: CookieOptions): void;
        has(name: string): boolean;
    };
    cache: {
        set<T>(key: string, value: T, ttl?: number): T;
        get<T = unknown>(key: string, fallback?: T): T | undefined;
        has(key: string): boolean;
        remove(key: string): void;
        clear(): void;
        remember<T>(key: string, ttl: number, factory: () => Promise<T> | T): Promise<T>;
        readonly size: number;
    };
    url: {
        get(key: string, fallback?: string): string | undefined;
        all(): Record<string, string>;
        set(key: string, value: string | number | null, replace?: boolean): void;
        remove(key: string, replace?: boolean): void;
        merge(params: Record<string, string | number | null>, replace?: boolean): void;
    };
    theme: {
        readonly current: ThemeName;
        readonly resolved: "light" | "dark";
        set(value: ThemeName): void;
        toggle(): "light" | "dark";
        readonly chosen: boolean;
        apply(): void;
        init(): void;
    };
    clipboard: {
        copy(text: string): Promise<boolean>;
        read(): Promise<string>;
    };
    screen: {
        width: number;
        height: number;
        mobile: boolean;
        tablet: boolean;
        desktop: boolean;
        portrait: boolean;
        landscape: boolean;
        matches(query: string): boolean;
    };
    network: {
        online: boolean;
        type: string;
        saveData: boolean;
        slow: boolean;
    };
    enter: typeof enter;
    leave: typeof leave;
    fadeIn: typeof fadeIn;
    fadeOut: typeof fadeOut;
    slideUp: typeof slideUp;
    slideDown: typeof slideDown;
    viewTransition: typeof viewTransition;
    injectStyle: typeof injectStyle;
    ensureTokens: typeof ensureTokens;
    on: typeof on;
    once: typeof onceEvent;
    off: typeof off;
    emit: typeof emit;
    use(plugin: VoodooPlugin | ((V: any) => void), options?: Record<string, unknown>): void;
    /** Defines error handling for the entire application. */
    onError(handler: (err: unknown, context: string) => void): void;
    /** Mounted component instances for inspection. */
    instances: Set<ComponentInstance>;
    Scope: typeof Scope;
    PRIORITY: {
        readonly IGNORE: 100;
        readonly FOR: 90;
        readonly IF: 80;
        readonly DATA: 70;
        readonly COMPONENT: 65;
        readonly REF: 60;
        readonly BIND: 45;
        readonly MODEL: 40;
        readonly DEFAULT: 0;
        readonly INIT: -10;
        readonly TRANSITION: -20;
    };
    VoodooSyntaxError: typeof VoodooSyntaxError;
    VoodooRuntimeError: typeof VoodooRuntimeError;
    uuid(): string;
    uid(prefix?: string): string;
    sleep(ms: number): Promise<void>;
    parseDuration(value: string | number | null | undefined, fallback?: number): number;
    debounce<T extends (...args: any[]) => any>(fn: T, wait?: number, immediate?: boolean): DebouncedFunction<T>;
    throttle<T extends (...args: any[]) => any>(fn: T, wait?: number): DebouncedFunction<T>;
    memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T & {
        cache: Map<string, ReturnType<T>>;
    };
    clone<T>(value: T): T;
    merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T;
    groupBy<T>(list: T[], key: string | ((item: T) => string | number)): Record<string, T[]>;
    unique<T>(list: T[], key?: string | ((item: T) => unknown)): T[];
    chunk<T>(list: T[], size?: number): T[][];
    sortBy<T>(list: T[], key: string | ((item: T) => any), direction?: "asc" | "desc"): T[];
    get<T = unknown>(object: unknown, path: string, fallback?: T): T | undefined;
    set(object: Record<string, any>, path: string, value: unknown): void;
    random(min?: number, max?: number): number;
    sample<T>(list: T[]): T | undefined;
    slugify(text: string, separator?: string): string;
    truncate(text: string, length?: number, suffix?: string): string;
    capitalize(text: string): string;
    titleCase(text: string): string;
    escapeHtml(text: string): string;
    stripTags(html: string): string;
    setFormatDefaults(locale?: string, currency?: string): void;
    formatCurrency(value: number | string, options?: FormatOptions): string;
    formatNumber(value: number | string, options?: Intl.NumberFormatOptions & FormatOptions): string;
    formatDate(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions, locale?: string): string;
    relativeTime(value: Date | string | number, locale?: string): string;
    formatFileSize(bytes: number, decimals?: number): string;
    formatPercent(value: number, decimals?: number, locale?: string): string;
    matchesMedia(query: string): boolean;
    isBrowser: boolean;
    device: {
        readonly touch: boolean;
        readonly mobile: boolean;
        readonly tablet: boolean;
        readonly desktop: boolean;
        readonly online: boolean;
        readonly reducedMotion: boolean;
        readonly darkMode: boolean;
    };
};

/**
 * @module dom/query
 *
 * Chainable collection of elements. The idea is the same as jQuery: select,
 * traverse, and manipulate with few lines. The difference is in strict typing,
 * native iteration with `for...of`, zero dependencies, and integration with
 * Voodoo's runtime: removing or emptying elements unmounts the reactive effects
 * tied to them, preventing memory leaks.
 *
 * ```js
 * V.query('.card')
 *   .addClass('active')
 *   .on('click', '.button', function () { V.query(this).closest('.card').remove() })
 * ```
 */
/** Function executed when the document becomes ready. */
type ReadyCallback = () => void;
/** Event handler. `this` points to the element that matched the filter. */
type QueryEventHandler = (this: HTMLElement, event: Event) => unknown;
/** Everything that `query()` accepts as input. */
type QueryInput = string | Node | Element | Document | DocumentFragment | ArrayLike<Node> | VoodooCollection | ReadyCallback | null | undefined;
/** Filter accepted by `filter`, `not`, and `is`. */
type QueryFilter = string | ((el: HTMLElement, index: number) => boolean);
/** Coordinates returned by `offset` and `position`. */
interface QueryPoint {
    top: number;
    left: number;
}
/** Value accepted when writing simple attributes and properties. */
type QueryValue = string | number | boolean | null;
/**
 * Immutable list of elements with chainable methods. Instances are created
 * by `query()`, never with `new` in user code.
 */
declare class VoodooCollection implements Iterable<HTMLElement> {
    /** Indexed access, as in `collection[0]`. */
    [index: number]: HTMLElement;
    /** Number of elements in the collection. */
    readonly length: number;
    /** Elements of the collection, in the order they were found. */
    readonly elements: HTMLElement[];
    constructor(elements?: HTMLElement[]);
    /** Enables `for (const el of query('.item'))`. */
    [Symbol.iterator](): Iterator<HTMLElement>;
    /** Descendants that match the selector. */
    find(selector: string): VoodooCollection;
    /** Nearest ancestor, including the element itself. */
    closest(selector: string): VoodooCollection;
    /** Parent element of each item, optionally filtered. */
    parent(selector?: string): VoodooCollection;
    /** All ancestors, from nearest to farthest. */
    parents(selector?: string): VoodooCollection;
    /** Direct children, optionally filtered. */
    children(selector?: string): VoodooCollection;
    /** Siblings, excluding the elements themselves. */
    siblings(selector?: string): VoodooCollection;
    /** Next sibling of each element. */
    next(selector?: string): VoodooCollection;
    /** Previous sibling of each element. */
    prev(selector?: string): VoodooCollection;
    /** Only the first element. */
    first(): VoodooCollection;
    /** Only the last element. */
    last(): VoodooCollection;
    /** Element at the specified position. Negative indices count from the end. */
    eq(index: number): VoodooCollection;
    /** Keeps only elements that pass the filter. */
    filter(test: QueryFilter): VoodooCollection;
    /** Removes from the collection elements that pass the filter. */
    not(test: QueryFilter): VoodooCollection;
    /** Keeps elements that contain the specified descendant. */
    has(target: string | Element): VoodooCollection;
    /** Checks if at least one element matches the filter. */
    is(test: QueryFilter): boolean;
    /** Projects each element to a value and returns a regular array. */
    map<T>(fn: (el: HTMLElement, index: number) => T): T[];
    /** Iterates over the collection. Inside the function, `this` is the current element. */
    each(fn: (this: HTMLElement, el: HTMLElement, index: number) => unknown): this;
    /** Without arguments returns the array; with index returns an element. */
    get(): HTMLElement[];
    get(index: number): HTMLElement | undefined;
    /** Copy of elements as a regular array. */
    toArray(): HTMLElement[];
    /** Joins other elements to the collection without duplication. */
    add(input: QueryInput, context?: QueryInput): VoodooCollection;
    /** Slice of the collection with the same semantics as `Array.prototype.slice`. */
    slice(start?: number, end?: number): VoodooCollection;
    /** Reads the text of the first element or writes to all. */
    text(): string;
    text(value: string | number | null): this;
    /** Reads the inner HTML of the first element or writes to all. */
    html(): string;
    html(value: string | null): this;
    /** Reads the value of the first field or writes to all. */
    val(): string | string[];
    val(value: string | number | boolean | string[] | null): this;
    /** Reads an attribute of the first element, or writes one or more. */
    attr(name: string): string | undefined;
    attr(name: string, value: QueryValue): this;
    attr(values: Record<string, QueryValue>): this;
    /** Removes one or more space-separated attributes. */
    removeAttr(name: string): this;
    /** Reads a property of the first element or writes to all. */
    prop<T = unknown>(name: string): T | undefined;
    prop(name: string, value: unknown): this;
    /**
     * Reads and writes `dataset`. Reading converts JSON, numbers, and booleans,
     * so `data-config='{"a":1}'` comes back as an actual object.
     */
    data(): Record<string, unknown>;
    data(key: string): unknown;
    data(key: string, value: unknown): this;
    data(values: Record<string, unknown>): this;
    /** Reads a computed style or applies one or more styles. */
    css(property: string): string;
    css(property: string, value: string | number | null): this;
    css(values: Record<string, string | number | null>): this;
    /** Width in pixels of the first element, or writes to all. */
    width(): number;
    width(value: string | number): this;
    /** Height in pixels of the first element, or writes to all. */
    height(): number;
    height(value: string | number): this;
    /** Position of the first element relative to the document. */
    offset(): QueryPoint;
    /** Position of the first element relative to the positioned ancestor. */
    position(): QueryPoint;
    /** Reads the vertical scroll of the first element or writes to all. */
    scrollTop(): number;
    scrollTop(value: number): this;
    /** Adds one or more space-separated classes. */
    addClass(value: string): this;
    /** Removes one or more space-separated classes. */
    removeClass(value: string): this;
    /** Toggles classes. The second argument forces on or off. */
    toggleClass(value: string, force?: boolean): this;
    /** True when some element has all the specified classes. */
    hasClass(value: string): boolean;
    /**
     * Base of `append`, `prepend`, `before`, and `after`. When the collection has more
     * than one element, each destination receives a copy and the last gets the
     * original, which is the expected behavior for those coming from jQuery.
     */
    private insert;
    /** Inserts content at the end of each element. */
    append(content: QueryInput): this;
    /** Inserts content at the beginning of each element. */
    prepend(content: QueryInput): this;
    /** Inserts content before each element. */
    before(content: QueryInput): this;
    /** Inserts content after each element. */
    after(content: QueryInput): this;
    /** Moves the collection's elements into the target. */
    appendTo(target: QueryInput): this;
    /** Moves the collection's elements to the beginning of the target. */
    prependTo(target: QueryInput): this;
    /** Replaces each element with the provided content, unmounting the old one. */
    replaceWith(content: QueryInput): this;
    /** Wraps each element with the provided HTML or element. */
    wrap(wrapper: QueryInput): this;
    /** Removes the parent of each element, keeping children in place. */
    unwrap(): this;
    /** Removes elements from the document and unmounts reactive effects. */
    remove(): this;
    /** Empties elements, unmounting removed content. */
    empty(): this;
    /** Clones elements. The clone starts without directives initialized. */
    clone(deep?: boolean): VoodooCollection;
    /**
     * Listens for events. With the second argument as a string, uses delegation:
     * `on('click', '.item', fn)` continues to work for items created later.
     */
    on(types: string, handler: QueryEventHandler, options?: AddEventListenerOptions): this;
    on(types: string, selector: string, handler: QueryEventHandler, options?: AddEventListenerOptions): this;
    /**
     * Removes listeners registered by `on`. Without arguments removes all, with type
     * removes those for that event, and with selector or function refines further.
     */
    off(types?: string, selectorOrHandler?: string | QueryEventHandler, handler?: QueryEventHandler): this;
    /** Listens only once. Accepts delegation like `on`. */
    once(types: string, handler: QueryEventHandler): this;
    once(types: string, selector: string, handler: QueryEventHandler): this;
    /**
     * Dispatches an event. Native events with their own method, like `click` and
     * `focus`, use the element's method when there is no `detail`.
     */
    trigger(type: string, detail?: unknown): this;
    /** Dispatches a custom event that bubbles up the tree, component-style. */
    emit(type: string, detail?: unknown): this;
    /** Shows elements by restoring their previous display value. */
    show(): this;
    /** Hides elements while saving their current display value. */
    hide(): this;
    /** Toggles visibility. The argument forces show or hide. */
    toggle(force?: boolean): this;
    /** Appearance with fade. */
    fadeIn(duration?: number): this;
    /** Disappearance with fade, ending hidden. */
    fadeOut(duration?: number): this;
    /** Collapses height to zero. */
    slideUp(duration?: number): this;
    /** Expands height to content. */
    slideDown(duration?: number): this;
    /** Toggles between collapse and expand. */
    slideToggle(duration?: number): this;
    /** Animation via Web Animations API. */
    animate(keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: number | KeyframeAnimationOptions): this;
    /** Scrolls the page to the first element. */
    scrollIntoView(options?: boolean | ScrollIntoViewOptions): this;
    /** Serializes the first element's fields as a query string. */
    serialize(): string;
    /**
     * Serializes fields into an object. Repeated names and names ending in
     * `[]` become arrays, checkboxes become booleans, and numeric fields become numbers.
     */
    serializeObject(): Record<string, unknown>;
    /** Sets focus on the first element. */
    focus(options?: FocusOptions): this;
    /** Removes focus from all elements. */
    blur(): this;
    /** Selects the text of the collection's fields. */
    select(): this;
    /**
     * Initializes directives for the collection's elements, inheriting the parent's scope.
     * With `force`, unmounts first to restart from scratch.
     */
    walk(force?: boolean): this;
    /** Unmounts effects, listeners, and components while keeping elements in the DOM. */
    destroy(): this;
}
/**
 * Creates a collection from a CSS selector, element, list of elements,
 * HTML string, or function.
 *
 * ```js
 * V.query('#list li')           // selector
 * V.query(document.body)        // element
 * V.query('<li>new</li>')       // creates elements
 * V.query(() => start())        // equivalent to V.ready
 * ```
 *
 * @param input selector, node, list, HTML or initialization function
 * @param context optional search root, useful for local scopes
 */
declare function query(input?: QueryInput, context?: QueryInput): VoodooCollection;
/**
 * Executes the function when Voodoo considers the document ready, and returns a
 * promise for the same moment. Both forms work:
 *
 * ```js
 * V.ready(() => console.log('pronto'))
 * await V.ready()
 * ```
 *
 * The library's own scheduler decides the time, waiting for the body to exist
 * and the tree to stop growing. This does not listen to `DOMContentLoaded`.
 */
declare function ready(fn?: ReadyCallback): Promise<void>;
/** Creates elements from an HTML string without inserting them in the document. */
declare function fromHtml(html: string): VoodooCollection;

export { start as $, type App as A, findScope as B, type ComponentDefinition as C, type DirectiveBinding as D, fromHtml as E, getScope as F, hook as G, hooks as H, injectStyle as I, instances as J, leave as K, magic as L, magics as M, mountComponent as N, parse as O, PRIORITY as P, query as Q, type Resource as R, Scope as S, ready as T, refresh as U, VoodooCollection as V, removeStore as W, rootScope as X, session as Y, slideDown as Z, slideUp as _, type AppOptions as a, storage as a0, store as a1, storeNames as a2, stringify as a3, theme as a4, toast as a5, tokenize as a6, url as a7, viewTransition as a8, walk as a9, whenElement as aa, whenReady as ab, type DirectiveHooks as b, core as c, type ResourceOptions as d, type VoodooConfig as e, type VoodooPlugin as f, VoodooRuntimeError as g, VoodooSyntaxError as h, addCleanup as i, allStores as j, allowedGlobals as k, cache as l, clearParseCache as m, config as n, cookie as o, createApp as p, createResource as q, defineComponent as r, defineDirective as s, destroy as t, ready$1 as u, ensureTokens as v, enter as w, evaluate as x, fadeIn as y, fadeOut as z };
