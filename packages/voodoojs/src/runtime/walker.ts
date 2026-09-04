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

import {
  effect as createEffect,
  EffectScope,
  handleError,
  queuePostFlush,
  warn,
} from '../reactivity';
import { evaluate, allowedGlobals, stringify as stringifyValue } from '../parser/interpreter';
import { parse } from '../parser/parser';
import { config, directives, components, type DirectiveContext } from './registry';
import {
  warnUnknownDirective,
  warnInvalidExpression,
  inDevelopment,
} from './avisos';
import { Scope, rootScope } from './scope';

// ---------------------------------------------------------------------------
// State per node
// ---------------------------------------------------------------------------

const nodeScopes = new WeakMap<Node, Scope>();
const nodeCleanups = new WeakMap<Node, Array<() => void>>();
const initialized = new WeakSet<Node>();
const nodeEffectScopes = new WeakMap<Node, EffectScope[]>();

/** Marks an element as already processed. */
export function isInitialized(node: Node): boolean {
  return initialized.has(node);
}

/**
 * Marks a node as already handled, so the walker never descends into it.
 *
 * Used on templates that `v-if` keeps outside the document. Without this mark,
 * the parent element's walk, having the child list in hand, would enter the
 * template and initialize the `v-for` inside it, corrupting the template for
 * all subsequent renders.
 */
export function markInitialized(node: Node): void {
  initialized.add(node);
}

/** Scope associated with a node, if any. */
export function getScope(node: Node): Scope | undefined {
  return nodeScopes.get(node);
}

/** Effective scope of a node, walking up through ancestors. */
export function findScope(node: Node | null): Scope {
  let current: Node | null = node;
  while (current) {
    const scope = nodeScopes.get(current);
    if (scope) return scope;
    current = current.parentNode;
  }
  return rootScope;
}

/**
 * Stores the effect scope created for a node. Serves devtools, which need to
 * know how many reactive effects depend on each element.
 */
export function trackEffectScope(node: Node, scope: EffectScope): void {
  let list = nodeEffectScopes.get(node);
  if (!list) nodeEffectScopes.set(node, (list = []));
  list.push(scope);
}

/**
 * Effect scopes linked to a node, one per directive plus one per interpolated
 * text. Used by the `xray` inspector to count and instrument effects.
 */
export function getEffectScopes(node: Node): EffectScope[] {
  return nodeEffectScopes.get(node) ?? [];
}

/**
 * Nodes that Voodoo itself removes from the document on purpose, like the
 * template element for `v-for` and branches of `v-if`.
 *
 * Without this mark, MutationObserver would see the removal as leaving the
 * screen and call `destroy`, which would stop the reactive effect that was just
 * created to control the list.
 */
const ignoredRemovals = new WeakSet<Node>();

/** Removes a node from the document without the observer treating it as unmounting. */
export function removeQuietly(node: ChildNode): void {
  ignoredRemovals.add(node);
  node.remove();
}
/** Registers a function executed when the node is removed from the DOM. */
export function addCleanup(node: Node, fn: () => void): void {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, (list = []));
  list.push(fn);
}

/**
 * Unmounts a node and all descendants: stops effects, removes listeners, and
 * fires the `beforeUnmount` and `unmounted` hooks.
 */
export function destroy(node: Node): void {
  if (node.nodeType === 1) {
    // Walk children first, to unmount inside-out.
    //
    // Walking is by siblings, not `childNodes`. The child list is live: the
    // browser reconstructs it on each access and invalidates it on each tree
    // change. In a large list being unmounted, indexing that list inside the
    // loop dominated the entire cleanup cost, as the CPU profile showed.
    // `firstChild` and `nextSibling` read the same thing without materializing
    // any collection.
    const children: Node[] = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 || child.nodeType === 3) children.push(child);
    }
    for (let i = children.length - 1; i >= 0; i--) destroy(children[i]);
  }
  const list = nodeCleanups.get(node);
  if (list) {
    nodeCleanups.delete(node);
    for (let i = list.length - 1; i >= 0; i--) {
      try {
        list[i]();
      } catch (err) {
        handleError(err, 'cleanup');
      }
    }
  }
  if (node.nodeType === 1) unindexElement(node as Element);
  nodeScopes.delete(node);
  nodeEffectScopes.delete(node);
  initialized.delete(node);
}

// ---------------------------------------------------------------------------
// Attribute reading
// ---------------------------------------------------------------------------

export interface ParsedAttribute {
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
 * Parsed attributes, keyed by the exact text they came from.
 *
 * A `v-for` clones one template per row, so a thousand rows mean the same
 * `@click="remove(row)"` is taken apart a thousand times into the same result.
 * Nothing mutates a parsed attribute after the fact, checked across the whole
 * source, so the result is shared rather than rebuilt.
 *
 * The key includes the value because modifiers and the expression both come
 * from it. Bounded like the expression cache, since attribute text is
 * page-authored and a long-lived app should not grow this without limit.
 */
const parsedAttributes = new Map<string, ParsedAttribute | null>();
const MAX_PARSED_ATTRIBUTES = 4000;

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
export function parseAttribute(name: string, value: string): ParsedAttribute | null {
  const cacheKey = `${name}\0${value}`;
  const hit = parsedAttributes.get(cacheKey);
  if (hit !== undefined) return hit;
  const parsed = parseAttributeUncached(name, value);
  if (parsedAttributes.size >= MAX_PARSED_ATTRIBUTES) parsedAttributes.clear();
  parsedAttributes.set(cacheKey, parsed);
  return parsed;
}

function parseAttributeUncached(name: string, value: string): ParsedAttribute | null {
  const prefix = config.prefix;
  let body: string;

  if (name.startsWith('@')) {
    body = `on:${name.slice(1)}`;
  } else if (name.startsWith(':') && name.length > 1) {
    body = `bind:${name.slice(1)}`;
  } else if (name.startsWith('.') && name.length > 1) {
    // `.prop="x"` binds directly to the element property.
    body = `bind:${name.slice(1)}.prop`;
  } else if (name.startsWith(prefix)) {
    body = name.slice(prefix.length);
  } else if (name.startsWith('data-v-')) {
    body = name.slice('data-v-'.length);
  } else {
    return null;
  }

  if (!body) return null;

  const parts = body.split('.');
  const head = parts.shift() as string;
  const modifiers: Record<string, string | true> = {};
  for (const mod of parts) {
    const eq = mod.indexOf('=');
    if (eq > -1) modifiers[mod.slice(0, eq)] = mod.slice(eq + 1);
    else modifiers[mod] = true;
  }

  const colon = head.indexOf(':');
  const directiveName = colon > -1 ? head.slice(0, colon) : head;
  const arg = colon > -1 ? head.slice(colon + 1) : undefined;

  return { raw: name, name: directiveName, arg, modifiers, expression: value };
}

/**
 * Lists the directives of an element, already sorted by priority.
 *
 * When the element has already been through HTML cleanup, the read comes from
 * the cache. This allows remounting an element later, for example when its
 * component is registered after the page loads. Restoring attributes to the DOM
 * wouldn't work because names like `@click` are rejected by `setAttribute`.
 */
export function collectDirectives(el: Element): ParsedAttribute[] {
  const out: ParsedAttribute[] = [];
  const cache = attributeCache.get(el);

  if (cache && cache.size) {
    for (const [name, value] of cache) {
      const parsed = parseAttribute(name, value);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  } else {
    const names = attributeNames(el);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (!looksLikeDirective(name)) continue;
      const parsed = parseAttribute(name, el.getAttribute(name) as string);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  }

  if (out.length < 2) return out;
  return out.sort((a, b) => priorityOf(b) - priorityOf(a));
}

/**
 * Names of an element's attributes, as a plain array.
 *
 * `el.attributes` is a live collection, and reading `.length` and `[i]` from it
 * goes through the DOM's own property bookkeeping on every access. The CPU
 * profile of a thousand-row build showed that bookkeeping costing more than the
 * parsing it fed, and a snapshot is also what lets the caller remove attributes
 * while iterating. `getAttributeNames` sits one browser version above the
 * support floor `Proxy` sets, so the older road is still here; it is measured
 * once rather than per element.
 */
const canListAttributeNames =
  typeof Element !== 'undefined' && !!Element.prototype.getAttributeNames;

function attributeNames(el: Element): string[] {
  if (canListAttributeNames) return el.getAttributeNames();
  return Array.from(el.attributes, (a) => a.name);
}

/**
 * `true` when the name could be a directive, judged from the name alone.
 *
 * Mirrors what `parseAttribute` accepts, so filtering by this before reading a
 * value never hides an attribute the parser would have taken. That is every name
 * cleanup would strip, plus `.prop`, which binds to a property and is left in
 * the HTML on purpose.
 */
function looksLikeDirective(name: string): boolean {
  return isVoodooAttribute(name) || (name.charCodeAt(0) === 46 /* . */ && name.length > 1);
}

function priorityOf(attr: ParsedAttribute): number {
  return directives.get(attr.name)?.priority ?? 0;
}

/**
 * Index of which elements declared each directive.
 *
 * Since `v-*` attributes are removed from HTML after processing, CSS selectors
 * like `[v-tab]` would stop working. This index stores the information at
 * runtime, so structural directives remain discoverable.
 */
const directiveIndex = new Map<string, Set<Element>>();

/**
 * Names under which each element was indexed.
 *
 * Without this map, removing an element from the index would require walking
 * the Set of all registered directives, which now exceed eighty. Cleaning a
 * list of ten thousand lines cost nearly a million operations just to undo the
 * index. With it, cleanup only touches the names that element actually
 * declared, which are two or three.
 */
const directiveNamesOf = new WeakMap<Element, Set<string>>();

function indexDirective(el: Element, name: string): void {
  let set = directiveIndex.get(name);
  if (!set) directiveIndex.set(name, (set = new Set()));
  set.add(el);

  let names = directiveNamesOf.get(el);
  if (!names) directiveNamesOf.set(el, (names = new Set()));
  names.add(name);
}

function unindexElement(el: Element): void {
  const names = directiveNamesOf.get(el);
  if (!names) return;
  for (const name of names) directiveIndex.get(name)?.delete(el);
  directiveNamesOf.delete(el);
}

/** `true` when the element declared the directive, even if already removed from HTML. */
export function hasDirective(el: Element, name: string): boolean {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}

/**
 * Descendants of `root` that declared the given directive, in document order.
 * Replaces `root.querySelectorAll("[v-name]")`.
 */
export function queryDirective(root: ParentNode, name: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const set = directiveIndex.get(name);
  const root_ = root as Element;

  if (set) {
    for (const el of set) {
      if (!el.isConnected) continue;
      if (root_.contains && root_.contains(el) && el !== root_) out.push(el as HTMLElement);
    }
  }

  // Elements not yet processed still have the attribute in HTML.
  // The Set avoids the `includes` inside the loop, which was quadratic.
  const seen = new Set<Element>(out);
  for (const el of Array.from(
    root.querySelectorAll(`[${config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (seen.has(el)) continue;
    seen.add(el);
    out.push(el as HTMLElement);
  }

  // Document order, to keep keyboard navigation predictable.
  out.sort((a, b) =>
    a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}

/** Nearest ancestor that declared the directive, including the element itself. */
export function closestDirective(el: Element | null, name: string): HTMLElement | null {
  let current: Element | null = el;
  while (current) {
    if (hasDirective(current, name)) return current as HTMLElement;
    current = current.parentElement;
  }
  return null;
}
// ---------------------------------------------------------------------------
// Attribute cleanup after rendering
// ---------------------------------------------------------------------------

/**
 * Original value of each `v-*` attribute, stored before it leaves HTML.
 * Directives continue reading from the cache, so behavior doesn't change.
 */
const attributeCache = new WeakMap<Element, Map<string, string>>();

/** `true` when the attribute name belongs to Voodoo. */
export function isVoodooAttribute(name: string): boolean {
  return (
    name.startsWith(config.prefix) ||
    name.startsWith('data-v-') ||
    name.charCodeAt(0) === 64 /* @ */ ||
    (name.charCodeAt(0) === 58 /* : */ && name.length > 1)
  );
}

/**
 * Reads a Voodoo attribute even after it has been removed from HTML.
 *
 * Use this function instead of `el.getAttribute` whenever reading happens
 * after mounting, like inside an event handler or a repeated request.
 */
export function readAttr(el: Element, name: string): string | null {
  const cached = attributeCache.get(el)?.get(name);
  if (cached !== undefined) return cached;
  return el.getAttribute(name);
}

/** Boolean version of `readAttr`. */
export function hasAttr(el: Element, name: string): boolean {
  const map = attributeCache.get(el);
  if (map?.has(name)) return true;
  return el.hasAttribute(name);
}

/** All Voodoo attributes that the element originally declared. */
export function originalAttributes(el: Element): Map<string, string> {
  const map = attributeCache.get(el);
  if (map) return new Map(map);
  const out = new Map<string, string>();
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (isVoodooAttribute(attr.name)) out.set(attr.name, attr.value);
  }
  return out;
}

/**
 * Stores attributes in cache and removes them from HTML, leaving the page clean,
 * just like a framework with a compiler would do.
 * Controlled by `V.config.cleanAttributes`.
 */
function stripAttributes(el: Element): void {
  if (!config.cleanAttributes) return;

  // The names are a snapshot, so an attribute can be removed as the loop reaches
  // it instead of being collected into a second list first.
  const names = attributeNames(el);
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, (map = new Map()));

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!isVoodooAttribute(name)) continue;
    map.set(name, el.getAttribute(name) as string);
    el.removeAttribute(name);
  }
}

/**
 * Restores to HTML the attributes that cleanup had removed.
 *
 * Used to remount an element, for example when a component is registered after
 * the page has been walked. Without this, the element would be walked again
 * with no attributes to read.
 */
export function restoreAttributes(el: Element): void {
  const map = attributeCache.get(el);
  if (!map) return;
  for (const [name, value] of map) {
    if (el.hasAttribute(name)) continue;
    // Names with @ or : are rejected by `setAttribute`, and don't need to
    // return anyway: `collectDirectives` already reads from the cache.
    try {
      el.setAttribute(name, value);
    } catch {
      // Intentional silence: the cache remains the source of truth.
    }
  }
}
/**
 * `true` when the element declared some directive, even after cleanup has
 * removed the attributes from HTML.
 *
 * `hasDirectives` looks only at the DOM, so with `config.cleanAttributes` on
 * it returns `false` for every element already processed. Anyone needing the
 * true answer after mounting, like the inspector, should use this one: the
 * information remains in the attribute cache.
 */
export function hadDirectives(el: Element): boolean {
  const cache = attributeCache.get(el);
  if (cache && cache.size) return true;
  return hasDirectives(el);
}

/** Checks if the element has any Voodoo attributes. */
export function hasDirectives(el: Element): boolean {
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const n = attrs[i].name;
    if (
      n.startsWith(config.prefix) ||
      n.charCodeAt(0) === 64 /* @ */ ||
      n.charCodeAt(0) === 58 /* : */ ||
      n.startsWith('data-v-')
    ) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Expression evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates an expression in the given scope. Errors are reported without
 * breaking the page, because a problematic attribute shouldn't crash the rest
 * of the app.
 */
export function evaluateIn<T = any>(
  expression: string,
  scope: Scope,
  context?: string,
  el?: Element | null
): T {
  if (!expression) return undefined as T;
  try {
    return evaluate(parse(expression), scope) as T;
  } catch (err) {
    // In development the detailed warning says where the problem is; in
    // production the cost is just reading a boolean.
    if (inDevelopment()) {
      warnInvalidExpression(el ?? scope.el, context ?? 'expression', expression, err);
    }
    handleError(err, context ? `${context} ("${expression}")` : `expression "${expression}"`);
    return undefined as T;
  }
}

/** Evaluates an expression and propagates the error. Used where failure must show. */
export function evaluateStrict<T = any>(expression: string, scope: Scope): T {
  return evaluate(parse(expression), scope) as T;
}

// ---------------------------------------------------------------------------
// Directive execution
// ---------------------------------------------------------------------------

/** Signals that the walker should not descend into this element's children. */
const skipChildren = new WeakSet<Element>();

export function markSkipChildren(el: Element): void {
  skipChildren.add(el);
}

function runDirective(el: HTMLElement, attr: ParsedAttribute, scope: Scope): void {
  const def = directives.get(attr.name);
  if (!def) {
    // A misspelled name can't fail silently for whoever is mounting the page.
    // In production the warning is never even formatted.
    if (inDevelopment() && attr.raw.startsWith(config.prefix)) {
      warnUnknownDirective(el, attr.raw, attr.name);
    }
    return;
  }

  // The scope that owns this directive's effects is created the first time an
  // effect is actually asked for.
  //
  // Plenty of directives never ask. `v-else` and `v-else-if` are consumed by
  // `v-if` and do nothing themselves, `:key` is consumed by `v-for`, and any
  // directive that only reads its value once behaves the same way. Each of them
  // used to allocate an effect scope, a cleanup entry on the element and a
  // devtools record, all three left empty. A directive that does create effects
  // pays exactly what it paid before.
  let scopeOwner: EffectScope | null = null;
  const ownerScope = (): EffectScope => {
    if (!scopeOwner) {
      const created = (scopeOwner = new EffectScope(true));
      addCleanup(el, () => created.stop());
      trackEffectScope(el, created);
    }
    return scopeOwner;
  };

  const ctx: DirectiveContext = {
    el,
    scope,
    expression: attr.expression,
    arg: attr.arg,
    modifiers: attr.modifiers,
    raw: attr.raw,
    evaluate<T = any>(expression?: string): T {
      return evaluateIn<T>(expression ?? attr.expression, scope, attr.raw, el);
    },
    effect(fn: () => void): void {
      const owner = ownerScope();
      owner.run(() => createEffect(fn, { scope: owner }));
    },
    cleanup(fn: () => void): void {
      addCleanup(el, fn);
    },
    walk(node: Node, childScope: Scope): void {
      walk(node, childScope);
    },
  };

  try {
    def.setup(ctx);
  } catch (err) {
    handleError(err, `directive ${attr.raw}`);
  }
}

// ---------------------------------------------------------------------------
// Walker
// ---------------------------------------------------------------------------

/** Callback used by `v-component` to mount components. Injected later. */
let componentMounter:
  | ((el: HTMLElement, name: string, scope: Scope) => Scope | null)
  | null = null;

export function setComponentMounter(
  fn: (el: HTMLElement, name: string, scope: Scope) => Scope | null
): void {
  componentMounter = fn;
}

/**
 * Tags that Voodoo never walks. `TEMPLATE` is left out of the list on purpose:
 * it needs to accept `v-if` and `v-for`. A template's content lives in `content`,
 * so `walkChildren` naturally doesn't descend into it.
 */
const HTML_SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

/**
 * Walks a node applying the directives found.
 *
 * @param node root of the section to initialize
 * @param scope scope applied to the node. When absent, inferred from ancestors.
 */
export function walk(node: Node, scope?: Scope): void {
  const activeScope = scope ?? findScope(node.parentNode);

  if (node.nodeType === 11 /* DocumentFragment */) {
    const children = Array.from(node.childNodes);
    for (const child of children) walk(child, activeScope);
    return;
  }

  if (node.nodeType === 3) {
    bindTextNode(node as Text, activeScope);
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;

  if (initialized.has(el)) return;

  // Read once: `tagName` is not a stored string, it is computed on access.
  const tag = el.tagName;
  if (HTML_SKIP.has(tag)) return;

  // `v-ignore` and `v-pre` turn off Voodoo in that subtree.
  if (el.hasAttribute(`${config.prefix}ignore`) || el.hasAttribute(`${config.prefix}pre`)) {
    initialized.add(el);
    return;
  }

  let current = activeScope;
  const attrs = collectDirectives(el);
  // With nothing registered under a tag name, the answer is `null` whatever the
  // tag is, so neither the attribute lookup nor the lower-casing is worth doing.
  const tagComponent =
    components.size === 0 && componentAliases.size === 0
      ? null
      : el.hasAttribute(`${config.prefix}component`)
        ? null
        : resolveComponentTag(tag);

  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current);
    return;
  }

  initialized.add(el);

  // Step 1: terminal directives take control of the entire subtree.
  for (const attr of attrs) {
    const def = directives.get(attr.name);
    if (def?.terminal) {
      runDirective(el, attr, current);
      return;
    }
  }

  // Step 2: scope creation by `v-data` or component.
  const dataAttr = attrs.find((a) => a.name === 'data');
  const componentAttr = attrs.find((a) => a.name === 'component');
  const componentName: string = componentAttr
    ? componentAttr.expression || ''
    : tagComponent || '';

  let mountedComponent = false;

  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current);
    if (created) {
      current = created;
      mountedComponent = true;
      nodeScopes.set(el, current);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn<Record<string, unknown>>(dataAttr.expression || '{}', current, 'v-data') : {};
    current = current.reactiveChild(raw && typeof raw === 'object' ? raw : {}, el);
    nodeScopes.set(el, current);
  }

  // Step 3: other directives, in priority order.
  //
  // Attributes written in a component's tag belong to whoever wrote the tag,
  // that is, to the outer scope. This is what makes `@saved="last = $event"`
  // write to the parent state, not inside the component. The scope created by
  // the component applies to the internal content, handled in step 5.
  const attributeScope = mountedComponent ? activeScope : current;
  for (const attr of attrs) {
    if (attr.name === 'data' || attr.name === 'component') continue;
    runDirective(el, attr, attributeScope);
  }

  // Step 4: remove `v-*` attributes from HTML, now that they've served their purpose.
  // Values remain available via `readAttr`.
  stripAttributes(el);

  // Step 5: children.
  if (!skipChildren.has(el)) walkChildren(el, current);
}

function walkChildren(el: Element, scope: Scope): void {
  // Copy because directives can alter the list during the walk, and reading is
  // by siblings for the same reason as `destroy`: `childNodes` is a live list,
  // expensive to materialize and invalidated on each change.
  const list: Node[] = [];
  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child as Text, scope);
  }
  // A node with its own scope already set (slot content, for example) keeps
  // its original scope instead of inheriting from the parent.
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}

// ---------------------------------------------------------------------------
// Text interpolation with braces
// ---------------------------------------------------------------------------

/**
 * Maximum size of a single-brace interpolation.
 *
 * Exists for the pathological case: a page with a brace loose in text and
 * another brace much later. Without the cap, the scan would try to interpret
 * the whole paragraph as an expression.
 */
const EXPRESSION_LIMIT = 500;

/** Cache of "is this a valid expression?", by text. */
const validExpressions = new Map<string, boolean>();

/**
 * Decides whether text between braces is actually an expression.
 *
 * Single braces coexist with text written by humans, so they can't swallow
 * anything between `{` and `}`. The criterion is the only honest one: try to
 * parse it. What the parser accepts becomes interpolation, the rest stays text,
 * exactly as written.
 */
function looksLikeExpression(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const cached = validExpressions.get(trimmed);
  if (cached !== undefined) return cached;

  let valid = true;
  try {
    // An interpolation produces one value. The parser accepts multiple
    // instructions in sequence, and that's exactly what separates expression
    // from prose: `{ some arbitrary text }` parses as three identifiers in
    // sequence, and stays text that someone wrote.
    valid = parse(trimmed).t !== 'seq';
  } catch {
    valid = false;
  }
  validExpressions.set(trimmed, valid);
  return valid;
}

/**
 * Finds the `}` that closes the brace opened at `start`, counting levels and
 * skipping quoted strings.
 *
 * This allows `{ $t('items', { n: total }) }`, with objects inside the
 * expression, and also expressions broken across lines.
 */
function closeBrace(source: string, start: number): number {
  let level = 0;
  let quote: string | null = null;

  for (let i = start; i < source.length; i++) {
    const c = source[i];

    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '{') level++;
    else if (c === '}') {
      level--;
      if (level === 0) return i;
    }
  }
  return -1;
}

/**
 * Breaks text into literal pieces and expressions.
 *
 * Accepts both forms. The short one, `{ name }`, is Voodoo's standard. The
 * double one, `{{ name }}`, exists for those coming from Vue and for text that
 * needs to contain literal braces around. Both accept line breaks and objects
 * inside expressions; what doesn't parse as an expression stays in text, intact.
 */
function sliceText(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let literal = '';
  let i = 0;

  const saveLiteral = (): void => {
    if (literal) segments.push({ text: literal });
    literal = '';
  };

  while (i < raw.length) {
    const open = raw.indexOf('{', i);
    if (open === -1) {
      literal += raw.slice(i);
      break;
    }

    literal += raw.slice(i, open);

    const double = raw[open + 1] === '{';
    const close = double ? raw.indexOf('}}', open + 2) : closeBrace(raw, open);

    if (close === -1) {
      literal += raw[open];
      i = open + 1;
      continue;
    }

    const expression = double ? raw.slice(open + 2, close) : raw.slice(open + 1, close);
    const end = double ? close + 2 : close + 1;

    const fits = double || expression.length <= EXPRESSION_LIMIT;
    if (fits && looksLikeExpression(expression)) {
      saveLiteral();
      segments.push({
        expression: expression.trim(),
        raw: raw.slice(open, end),
        explicit: double,
      });
      i = end;
      continue;
    }

    // Not an expression: the brace returns to being a regular character.
    literal += raw[open];
    i = open + 1;
  }

  saveLiteral();
  return segments;
}

/** Elements where braces are almost always code, not interpolation. */
const NO_INTERPOLATION = new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

interface TextSegment {
  text?: string;
  expression?: string;
  /**
   * The original `{ ... }` source, kept so a single-brace segment can fall back
   * to the literal text it came from instead of rendering nothing.
   */
  raw?: string;
  /** `true` when written as `{{ ... }}`, which is an explicit interpolation. */
  explicit?: boolean;
}

/**
 * Decides whether a single-brace segment should stay as the text it was.
 *
 * `{ count }` and `{ chaves }` are indistinguishable to the parser: both are one
 * valid identifier. So prose like `use { chaves } assim` used to render as
 * `use  assim`, because the unknown name evaluated to undefined and undefined
 * stringifies to nothing. The paragraph lost a word with no error anywhere, and
 * `rac{1}{2}` lost its braces the same way.
 *
 * Two cases fall back to the literal, and only for single braces:
 *
 *   - A bare identifier that resolves nowhere, neither in the scope chain nor in
 *     the allowed globals. A real interpolation names something that exists.
 *   - A lone literal, as in `{1}`. Nobody writes `{ 1 }` to display "1", but
 *     LaTeX and templating syntaxes are full of them.
 *
 * `{{ ... }}` is left alone: it is Voodoo's explicit form, so an empty result
 * there is what the author asked for.
 *
 * The trade is action at a distance: text reading `{ total }` starts
 * interpolating the day something defines `total`. That is accepted because the
 * alternative is silently deleting text people wrote, which is worse and much
 * harder to notice.
 */
function keepsLiteral(segment: TextSegment, value: unknown, scope: Scope): boolean {
  if (segment.explicit || segment.raw === undefined) return false;

  let node;
  try {
    node = parse(segment.expression!);
  } catch {
    return true;
  }

  // A lone literal is checked before the value, because `{1}` evaluates to 1
  // perfectly well: the point is that nobody writes it meaning to print "1".
  if (node.t === 'lit') return true;

  if (value !== undefined) return false;
  if (node.t === 'id') return scope.lookup(node.n) === undefined && !(node.n in allowedGlobals);
  return false;
}

/**
 * Binds `{ expression }` inside a text node to reactive state.
 *
 * ```html
 * <p>Hello, { name }! You have { items.length } items.</p>
 * ```
 */
export function bindTextNode(node: Text, scope: Scope): void {
  const raw = node.textContent;
  if (!raw || raw.indexOf('{') === -1) return;
  if (initialized.has(node)) return;

  // Walk up through ancestors for two reasons. First, syntax-highlighted code
  // places text inside <span>, and the direct parent stops being <pre>. Second,
  // v-ignore and v-pre must apply to the entire subtree, even when the walk
  // enters through a child, which happens when a script rewrites the content
  // of a code block after mounting.
  let ancestor: Element | null = node.parentElement;
  while (ancestor) {
    if (NO_INTERPOLATION.has(ancestor.tagName)) return;
    if (
      ancestor.hasAttribute(`${config.prefix}ignore`) ||
      ancestor.hasAttribute(`${config.prefix}pre`) ||
      ancestor.hasAttribute('data-v-ignore') ||
      ancestor.hasAttribute('data-v-pre')
    ) {
      return;
    }
    ancestor = ancestor.parentElement;
  }

  const segments = sliceText(raw);
  if (!segments.some((s) => s.expression)) return;

  initialized.add(node);

  const owner = new EffectScope(true);
  addCleanup(node, () => owner.stop());
  trackEffectScope(node, owner);

  owner.run(() =>
    createEffect(() => {
      let out = '';
      for (const segment of segments) {
        if (segment.text !== undefined) {
          out += segment.text;
          continue;
        }
        const value = evaluateIn(segment.expression!, scope, 'interpolation');
        out += keepsLiteral(segment, value, scope)
          ? segment.raw!
          : stringifyValue(value);
      }
      if (node.textContent !== out) node.textContent = out;
    }, { scope: owner })
  );
}

/** Sets the scope of a node before the walker reaches it. */
export function markNodeScope(node: Node, scope: Scope): void {
  nodeScopes.set(node, scope);
}

/** Resolves `<UserCard>` and `<user-card>` to the registered name. */
export function resolveComponentTag(tagName: string): string | null {
  const lower = tagName.toLowerCase();
  if (components.has(lower)) return lower;
  const alias = componentAliases.get(lower);
  return alias ?? null;
}

/** Map of hyphen-free names, to accept PascalCase tags. */
export const componentAliases = new Map<string, string>();

// ---------------------------------------------------------------------------
// Scheduled lifecycle hooks
// ---------------------------------------------------------------------------

/** Executes after the current DOM round has been applied. */
export function onMounted(fn: () => void): void {
  queuePostFlush(fn);
}

// ---------------------------------------------------------------------------
// Initialization and observation
// ---------------------------------------------------------------------------

let started = false;
let observer: MutationObserver | null = null;

/**
 * Work that has to happen immediately before and after the walk.
 *
 * The JSX module needs both sides: its templates must leave the document before
 * `walk` sees them, because an element written inside a `{ ... }` region names
 * a callback parameter that does not exist yet, and its effects must be created
 * after, because `v-data` builds the scopes during the walk.
 *
 * A registry rather than a direct call, because `start` is core and JSX is only
 * in the full build. Importing one from the other would drag the whole module
 * into every bundle and make a cycle out of it.
 *
 * These used to live in `bootstrap.ts`, which was wrong in a way that took a
 * bug report to notice: `bootstrap` returns early for `data-manual`, so any page
 * that configures the library and calls `V.start()` itself got no JSX at all.
 * The project's own playground does exactly that, and rendered every JSX example
 * as literal text.
 */
/**
 * One list, with the phase passed in, rather than two lists and a helper.
 *
 * That is not style: the core build sits at 47 KB gzipped against a 47 KB
 * budget, and the first version of this registry went over it by ten bytes.
 * `npm run size` is a gate, so the shape had to earn its place.
 */
const startHooks: Array<(root: Element, after: boolean) => void> = [];

/** Registers work to run around every `start`, in registration order. */
export function onStart(hook: (root: Element, after: boolean) => void): void {
  startHooks.push(hook);
}

/** Runs one phase, where a failure costs that hook and nothing else. */
function runPhase(target: Element, after: boolean): void {
  for (const hook of startHooks) {
    try {
      hook(target, after);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Voodoo] a start hook failed', error);
    }
  }
}

/** Initializes Voodoo in a root. Called automatically in the browser. */
export function start(root?: Element | Document): void {
  if (typeof document === 'undefined') return;
  const target = (root ?? config.root ?? document.body) as Element;
  if (!target) return;

  Object.assign(allowedGlobals, config.globals);

  runPhase(target, false);

  walk(target, rootScope);

  runPhase(target, true);

  if (!started) {
    started = true;
    if (config.autoDiscover) observeDOM(target);
    document.dispatchEvent(new CustomEvent('voodoo:ready', { detail: { root: target } }));
  }
}

/**
 * Observes insertions and removals in the DOM. Elements created after loading
 * get their directives without any manual call.
 */
function observeDOM(target: Element): void {
  if (typeof MutationObserver === 'undefined') return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (let i = 0; i < mutation.removedNodes.length; i++) {
        const removed = mutation.removedNodes[i];
        if (ignoredRemovals.has(removed)) {
          ignoredRemovals.delete(removed);
          continue;
        }
        if (removed.nodeType === 1 && !removed.isConnected) destroy(removed);
      }
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const added = mutation.addedNodes[i];
        if (added.nodeType !== 1) continue;
        if (initialized.has(added)) continue;
        walk(added, findScope(added.parentNode));
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

/** Stops automatic DOM observation. */
export function stopObserving(): void {
  observer?.disconnect();
  observer = null;
  started = false;
}

/** Reinitializes Voodoo within a root, useful in tests. */
export function refresh(root?: Element): void {
  walk(root ?? document.body, root ? findScope(root.parentNode) : rootScope);
}

export { rootScope, warn };
