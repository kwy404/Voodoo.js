/**
 * @module jsx
 *
 * JSX written directly in ordinary HTML, with no build step and no compiler.
 *
 * ```html
 * <ul>
 *   {frutas.map((fruta) => (
 *     <li>{fruta}</li>
 *   ))}
 * </ul>
 * ```
 *
 * The trick is that the browser has already parsed the page before any of this
 * runs, and what it leaves behind is recoverable. For the block above the DOM is
 * three siblings:
 *
 *   text     "{frutas.map((fruta) => ("
 *   element  <li>{fruta}</li>
 *   text     "))}"
 *
 * The element is not a mistake to be worked around, it is the template. Joining
 * the text back together with a placeholder where the element sat reconstructs
 * the expression exactly as it was typed:
 *
 *   frutas.map((fruta) => ($t(0, $__jsx)))
 *
 * `$t` returns a handle to that `<li>` together with the scope the call was made
 * in, so the arrow returns one clone per item, each rendered where `fruta` is
 * bound. Nothing is compiled, nothing is evaluated as a string, and the whole
 * thing goes through the same lexer, parser and interpreter as every other
 * expression, which is what keeps it working under a strict Content Security
 * Policy.
 *
 * ATTRIBUTE VALUES MUST BE QUOTED
 *
 *   style="{{ backgroundColor: cor }}"     works
 *   style={{ backgroundColor: cor }}       does not
 *
 * This one is not a decision, it is the order things happen in. An unquoted
 * attribute value ends at the first space, so the browser turns the second line
 * into six separate attributes, `style="{{"`, `backgroundcolor:=""`, `cor,=""`
 * and so on, before a single line of JavaScript has run.
 *
 * The pieces do survive in order, so they could in principle be rejoined. What
 * does not survive is case: the browser lowercases every attribute NAME, so
 * `backgroundColor` comes back as `backgroundcolor` and any identifier with a
 * capital in it is gone. Quoting costs two characters and has no such rule.
 */

import { effect, reactive } from '../reactivity';
import { magic, rootScope } from '../runtime/scope';
import { evaluate, unwrap } from '../parser/interpreter';
import { parse, type Node as AstNode } from '../parser/parser';
import { Scope } from '../runtime/scope';
import { config } from '../runtime/registry';
import { addCleanup, findScope, getScope, onStart, walk } from '../runtime/walker';

/**
 * Elements whose contents are never scanned.
 *
 * This is the rule that keeps `{ ... }` from colliding with ordinary
 * JavaScript. A page is full of braces that are nobody's business here: a
 * `<script>` block is JavaScript, a `<style>` block is CSS, and `<pre>`,
 * `<code>`, `<samp>` and `<template>` exist precisely to hold text that must not
 * be interpreted, which on this project's own site means pages of example code
 * containing `{`.
 *
 * The second rule matters just as much and lives in `applyRegions`: a region is
 * only claimed when an ELEMENT sits inside the braces. `{ count }` on its own is
 * plain interpolation and is left to the core renderer, and a stray `{` in prose
 * never balances, so it is left alone too.
 */
const OPAQUE = /* @__PURE__ */ new Set([
  'SCRIPT',
  'STYLE',
  'PRE',
  'CODE',
  'SAMP',
  'KBD',
  'TEXTAREA',
  'TEMPLATE',
  'NOSCRIPT',
]);

/**
 * Resolves to whichever scope the expression is being evaluated in.
 *
 * Registered at module level, not inside `jsx()`. `applyRegions` is exported and
 * works on its own, and when the registration lived in `jsx()` every template
 * rendered by a direct `applyRegions` call received `undefined` for its scope
 * and fell back to the region's, so `map` produced the right number of elements
 * with every interpolation inside them unresolved.
 */
magic('$__jsx', (scope) => scope);

/**
 * Hooks into `V.start()` itself, not into the bootstrap.
 *
 * The bootstrap returns early for `data-manual`, so a page that configures the
 * library and calls `V.start()` on its own used to get no JSX at all. The
 * project's own playground does exactly that, and rendered every JSX example as
 * literal text while reporting the right version.
 */
onStart((root, after) => {
  if (after) activateJsx();
  else extractJsx(root);
});

/** A handle to one element that was written inline inside an expression. */
interface Template {
  readonly __voodooTemplate: number;
}

const TEMPLATE = Symbol('voodoo.jsx.template');

function isTemplate(value: unknown): value is Template {
  return typeof value === 'object' && value !== null && TEMPLATE in value;
}

/**
 * Splits a run of sibling nodes into the expression they spell out.
 *
 * Returns the source text with `$t(n)` where each element sat, plus the
 * elements themselves in the same order.
 */
interface Collected {
  source: string;
  templates: Element[];
  nodes: ChildNode[];
  /** Where the region ends inside the last text node, if it ends mid-node. */
  tail: { node: Text; offset: number } | null;
}

/**
 * Reads one `{ ... }` region starting at `start`, following siblings until the
 * braces balance.
 *
 * Brace counting ignores anything inside a string or a template literal, since
 * `{ label: "}" }` is a perfectly ordinary object and closing on that `}` would
 * cut the expression in half.
 */
function collect(start: Text, offset: number): Collected | null {
  const templates: Element[] = [];
  const nodes: ChildNode[] = [];
  let source = '';
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  let node: ChildNode | null = start;
  let index = offset;
  let closed = false;
  let tail: { node: Text; offset: number } | null = null;

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      for (; index < text.length; index++) {
        const ch = text[index];

        if (escaped) {
          escaped = false;
          source += ch;
          continue;
        }
        if (quote) {
          if (ch === '\\') escaped = true;
          else if (ch === quote) quote = null;
          source += ch;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
          quote = ch;
          source += ch;
          continue;
        }

        if (ch === '{') {
          depth++;
          // The outermost brace opens the region and is not part of the
          // expression; every inner one is, because it belongs to an object
          // literal or a template interpolation.
          if (depth > 1) source += ch;
          continue;
        }
        if (ch === '}') {
          depth--;
          if (depth === 0) {
            index++;
            closed = true;
            break;
          }
          source += ch;
          continue;
        }
        source += ch;
      }

      nodes.push(node as ChildNode);
      if (closed) {
        // Where the region ends inside this node, recorded but NOT acted on.
        //
        // Splitting here was a real bug: `collect` runs on every `{` it meets,
        // including the plain interpolations it goes on to decline, and it was
        // cutting those text nodes in half on the way past. `<li>{p.n}: {p.q}</li>`
        // came out empty because the node had been split behind the core
        // renderer's back. The split now happens in `install`, which only runs
        // once the region is actually claimed.
        tail = { node: node as Text, offset: index };
        break;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (depth === 0) return null;
      // `$__jsx` is a magic, and a magic getter receives the scope it was
      // resolved in. Inside `map(f => (<li>{f}</li>))` that is the scope where
      // `f` is bound, which is exactly what the clone has to render against.
      // Without it the clone renders in the region's scope and every
      // interpolation inside reads a name that does not exist there.
      source += `$t(${templates.length}, $__jsx)`;
      templates.push(node as Element);
      nodes.push(node as ChildNode);
    } else {
      nodes.push(node as ChildNode);
    }

    index = 0;
    node = node.nextSibling as ChildNode | null;
  }

  if (!closed) return null;
  return { source, templates, nodes, tail };
}

/** Renders one evaluated value into the fragment that will replace the region. */
function render(value: unknown, templates: Element[], scope: Scope, out: Node[]): void {
  if (value == null || value === false || value === true) return;

  if (Array.isArray(value)) {
    for (const item of value) render(item, templates, scope, out);
    return;
  }

  if (isTemplate(value)) {
    const handle = value as unknown as { index: number; scope?: Scope };
    const source = templates[handle.index];
    const clone = source.cloneNode(true) as Element;
    // The scope captured when `$t` was called, so a template produced inside a
    // `map` callback sees that callback's parameter.
    const at = handle.scope ?? scope;
    // The clone carries its own `{ ... }` regions and any ordinary directive on
    // it, so it goes through the same processing as the page did.
    applyRegions(clone, at);
    // And those regions have to be activated here, not left in the queue. The
    // page-wide activation pass has already finished by the time a clone is
    // made, so anything `applyRegions` just queued would sit there forever: a
    // `map` inside a `map` produced the outer elements with the inner list
    // missing from every one of them.
    activateJsx();
    walk(clone, at);
    out.push(clone);
    return;
  }

  out.push(document.createTextNode(String(value)));
}

/**
 * Finds and installs every `{ ... }` region inside one element's children.
 *
 * Text-only interpolation such as `<h1>Ola, {nome}!</h1>` is deliberately left
 * alone: the core already renders it, and taking it over here would mean two
 * implementations of the same thing disagreeing at some point. This module only
 * claims a region that spans an element, which is the part the core cannot do.
 */
export function applyRegions(root: Element, parentScope?: Scope): void {
  if (OPAQUE.has(root.tagName)) return;

  const scope = parentScope ?? findScope(root);

  let child = root.firstChild as ChildNode | null;
  while (child) {
    const next = child.nextSibling as ChildNode | null;

    if (child.nodeType === Node.ELEMENT_NODE) {
      // An element that declared `v-data` owns a scope, and everything inside
      // it must resolve against that one rather than against the page. Without
      // this, `<div v-data="{ list: [1] }">{list.map(...)}</div>` looked up
      // `list` at the root, found nothing, and rendered an empty region.
      applyRegions(child as Element, getScope(child) ?? scope);
      child = next;
      continue;
    }

    if (child.nodeType !== Node.TEXT_NODE) {
      child = next;
      continue;
    }

    const text = child.textContent ?? '';
    const open = text.indexOf('{');
    if (open < 0) {
      child = next;
      continue;
    }

    const collected = collect(child as Text, open);
    if (!collected || collected.templates.length === 0) {
      // No element inside, so this is plain interpolation and belongs to the
      // core renderer.
      child = next;
      continue;
    }

    install(root, collected, scope);
    child = collected.nodes[collected.nodes.length - 1]?.nextSibling as ChildNode | null;
  }
}

/**
 * Regions that have been taken out of the page but not yet made live.
 *
 * Extraction and activation are two separate passes, and the order is the whole
 * point. `V.start()` walks the document and renders every interpolation it
 * finds, and the elements written inside a `{ ... }` region are still ordinary
 * elements at that moment. Running afterwards meant the core had already
 * rewritten `<b>c={c}</b>` into `<b>c=0</b>` in place, so every clone taken from
 * it afterwards said 0 forever, no matter what `c` became.
 *
 * So the templates leave the DOM BEFORE start, which is the only way the core
 * never sees them, and the effects that render them are created AFTER start,
 * which is the only way `v-data` scopes exist yet.
 */
const pending: Array<() => void> = [];

/** Replaces a collected region with an anchor and keeps it up to date. */
function install(parent: Element, collected: Collected, hint?: Scope): void {
  const { source, templates, nodes, tail } = collected;

  let ast: AstNode;
  try {
    ast = parse(source);
  } catch (error) {
    if (config.devtools) {
      // eslint-disable-next-line no-console
      console.warn(`[Voodoo] could not parse the inline expression: ${source}`, error);
    }
    return;
  }

  // Now that the region is claimed, any page text that followed the closing
  // brace is split off and left where it was.
  if (tail && tail.offset < (tail.node.textContent ?? '').length) {
    tail.node.splitText(tail.offset);
  }

  const anchor = document.createComment('v-jsx');
  parent.insertBefore(anchor, nodes[0]);
  // Out of the document immediately, so `V.start()` never walks a template. A
  // template holds names that only exist inside a callback, such as the `p` of
  // `p.filter(...).map(p => ...)`, and the core walking it produced a console
  // full of `Could not read "n" from undefined` before rewriting the text in
  // place and poisoning every clone taken from it later.
  for (const node of nodes) node.remove();

  let rendered: Node[] = [];

  pending.push(() => activateRegion());

  function activateRegion(): void {
  // Resolved here and not at extraction time. Extraction runs before
  // `V.start()`, so a `v-data` element has no scope yet and every region inside
  // one captured the root instead, where the names do not exist: the console
  // filled with `Could not call "map" from undefined` and every list came out
  // empty. By activation the scopes exist, and walking up from the anchor finds
  // the nearest one.
  // `findScope` walks up parentNode, and a clone is not in the document yet
  // when its own regions are activated, so the walk reaches nothing and falls
  // back to the root. That is right for a region on the page and wrong for one
  // inside a template, where the names come from the callback that produced it:
  // a `map` inside a `map` rendered the outer elements with every inner list
  // empty. The hint is the scope the clone is being rendered in, and it wins
  // whenever the walk found nothing better.
  const found = findScope(anchor);
  const scope = found === rootScope && hint ? hint : found;
  const local = scope.child({
    $t: (index: number, at: Scope) => ({ [TEMPLATE]: true, index, scope: at }),
  });

  const runner = effect(() => {
    // A region is a function boundary too. Without unwrapping here, a
    // top-level `{if (a) return (<p>x</p>)}` handed the renderer the return
    // signal itself and the page showed "[object Object]".
    const value = unwrap(evaluate(ast, local));
    const out: Node[] = [];
    render(value, templates, local, out);

    for (const node of rendered) (node as ChildNode).remove();
    rendered = out;
    for (const node of out) parent.insertBefore(node, anchor);
  });

  addCleanup(anchor, () => {
    runner.effect.stop();
    for (const node of rendered) (node as ChildNode).remove();
  });
  }
}

/**
 * Reads a top-level declaration block into state.
 *
 * ```html
 * {
 * const produtos = [...];
 * const ativo = true;
 * }
 * ```
 *
 * The block is a text node in `<body>`, and `const` is not part of the
 * expression language, so the keywords are stripped and what remains is a
 * sequence of assignments, which the parser already understands. The names land
 * on a reactive object that becomes the root scope's data, so everything below
 * sees them and updates when they change.
 */
export function readDeclarationBlock(root: ParentNode = document.body): Record<string, unknown> | null {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const text = (node.textContent ?? '').trim();
    if (!text.startsWith('{') || !text.endsWith('}')) continue;
    if (!/\b(const|let|var)\s/.test(text)) continue;

    const body = text.slice(1, -1).replace(/\b(?:const|let|var)\s+/g, '');
    const data = reactive({} as Record<string, unknown>);
    try {
      evaluate(parse(body), new Scope(data));
    } catch (error) {
      if (config.devtools) {
        // eslint-disable-next-line no-console
        console.warn('[Voodoo] could not read the declaration block', error);
      }
      return null;
    }
    node.remove();
    return data;
  }
  return null;
}

/**
 * Turns the whole page into one where JSX works.
 *
 * ```js
 * V.jsx();                  // the document
 * V.jsx(document.querySelector('#app'));
 * ```
 *
 * Reads the declaration block if there is one, puts its names in scope, and
 * then installs every `{ ... }` region below the root.
 */
/**
 * Makes every extracted region live.
 *
 * Separate from `jsx()` because it must run after `V.start()`, once `v-data`
 * has created the scopes a region may need to resolve against. `jsx()` takes
 * the templates out of the document; this puts the rendered result back.
 */
export function activateJsx(): void {
  const work = pending.splice(0, pending.length);
  for (const run of work) {
    // One region must not take the rest of the page with it.
    //
    // This loop had no guard, so the first expression that threw ended it, and
    // every region after that one silently never rendered. The symptom was
    // baffling from the outside: the first two lists on a page worked and the
    // remaining fourteen were empty, with a single unrelated error in the
    // console. A broken expression should cost its own region and nothing else.
    try {
      run();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Voodoo] a JSX region failed to render', error);
    }
  }
}

/**
 * Takes every region out of the document, without rendering anything yet.
 *
 * This is the half that must run BEFORE `V.start()`. `jsx()` is extract plus
 * activate in one call, which is right for a caller doing it by hand and wrong
 * for the bootstrap: calling `jsx()` there activated immediately, with the
 * `v-data` scopes not yet created, and the later `activateJsx()` found an empty
 * queue. Every list on the page came out blank.
 */
export function extractJsx(root: Element = document.body): void {
  const data = readDeclarationBlock(root);
  if (data) {
    // Merged into the root scope rather than kept in a scope of its own, so
    // that plain interpolation like `<h1>Ola, {nome}!</h1>` sees the same names.
    // The core renderer resolves against the root, and a private scope here
    // would leave half the page reading undefined.
    Object.assign(rootScope.data, data);
  }

  applyRegions(root, findScope(root));
}

/**
 * Extract and render in one call, for a caller doing this by hand.
 *
 * The bootstrap does not use this: it calls `extractJsx()` before `V.start()`
 * and `activateJsx()` after, because the two halves belong on opposite sides of
 * it.
 */
export function jsx(root: Element = document.body): void {
  extractJsx(root);
  activateJsx();
}
