/**
 * @module directives/core
 *
 * Core directives: text, HTML, conditionals, lists, form, attributes,
 * classes, styles, events, refs and teleport.
 */

import { handleError, nextTick, queuePostFlush } from '../reactivity';
import { evaluate, stringify } from '../parser/interpreter';
// `AstNode` avoids conflict with DOM `Node`, used throughout this file.
import { parse, type Node as AstNode } from '../parser/parser';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { warn, warnDuplicateKey, describeElement } from '../runtime/avisos';
import { Scope } from '../runtime/scope';
import {
  addCleanup,
  destroy,
  evaluateIn,
  markInitialized,
  markSkipChildren,
  markNodeScope,
  removeQuietly,
  walk,
} from '../runtime/walker';
import { enter, leave, type TransitionOptions } from '../dom/transition';
import { debounce, parseDuration, throttle } from '../utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Writes a value to an assignable expression, like `form.email`. */
function setValue(expression: string, scope: Scope, value: unknown): void {
  try {
    const target = parse(expression);
    const assignment = {
      t: 'assign',
      op: '=',
      target,
      value: { t: 'lit', v: value as never },
    } as AstNode;
    evaluate(assignment, scope);
  } catch (err) {
    handleError(err, `assignment in "${expression}"`);
  }
}

/** Reads the transition configuration declared on the element. */
export function transitionOptions(el: Element): TransitionOptions | null {
  const p = config.prefix;
  const has = el.hasAttribute(`${p}transition`);
  const custom =
    el.hasAttribute(`${p}enter-class`) ||
    el.hasAttribute(`${p}leave-class`) ||
    el.hasAttribute(`${p}enter-active-class`) ||
    el.hasAttribute(`${p}leave-active-class`);
  if (!has && !custom) return null;

  const name = el.getAttribute(`${p}transition`) || 'fade';
  return {
    name: name.startsWith('v-') ? name : `v-${name}`,
    enterFrom: el.getAttribute(`${p}enter-class`) || undefined,
    enterActive: el.getAttribute(`${p}enter-active-class`) || undefined,
    enterTo: el.getAttribute(`${p}enter-to-class`) || undefined,
    leaveFrom: el.getAttribute(`${p}leave-class`) || undefined,
    leaveActive: el.getAttribute(`${p}leave-active-class`) || undefined,
    leaveTo: el.getAttribute(`${p}leave-to-class`) || undefined,
    duration: el.hasAttribute(`${p}duration`)
      ? parseDuration(el.getAttribute(`${p}duration`)!)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// v-text
// ---------------------------------------------------------------------------

defineDirective('text', ({ el, effect, evaluate: ev }) => {
  // The content written here is result, not template. Mark text nodes
  // to prevent the walk from treating a value like "{ a: 1 }" as interpolation.
  effect(() => {
    el.textContent = stringify(ev());
    const first = el.firstChild;
    if (first && first.nodeType === 3) markInitialized(first);
  });
});

// ---------------------------------------------------------------------------
// v-html
// ---------------------------------------------------------------------------

defineDirective('html', (ctx) => {
  const { el, effect, evaluate: ev, scope } = ctx;
  markSkipChildren(el);
  effect(() => {
    const value = ev();
    // Unmount previous content before replacing, avoiding leaks.
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? '' : String(value);
    // Inserted HTML also gains directives.
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});

// ---------------------------------------------------------------------------
// v-show
// ---------------------------------------------------------------------------

defineDirective('show', ({ el, effect, evaluate: ev }) => {
  const original = el.style.display === 'none' ? '' : el.style.display;
  let first = true;
  const options = transitionOptions(el);

  effect(() => {
    const visible = !!ev();
    if (first) {
      first = false;
      el.style.display = visible ? original : 'none';
      return;
    }
    if (!options) {
      el.style.display = visible ? original : 'none';
      return;
    }
    if (visible) {
      el.style.display = original;
      void enter(el, options);
    } else {
      void leave(el, options).then(() => {
        el.style.display = 'none';
      });
    }
  });
});

// ---------------------------------------------------------------------------
// v-if / v-else-if / v-else
// ---------------------------------------------------------------------------

interface Branch {
  expression: string | null;
  template: Element;
}

defineDirective(
  'if',
  ({ el, scope, expression, effect }) => {
    const p = config.prefix;
    const branches: Branch[] = [{ expression, template: el }];

    // Collects the chain of `v-else-if` and `v-else` siblings.
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.hasAttribute(`${p}else-if`)) {
        branches.push({
          expression: sibling.getAttribute(`${p}else-if`) || 'false',
          template: sibling,
        });
        sibling = sibling.nextElementSibling;
      } else if (sibling.hasAttribute(`${p}else`)) {
        branches.push({ expression: null, template: sibling });
        sibling = sibling.nextElementSibling;
        break;
      } else {
        break;
      }
    }

    const anchor = document.createComment(config.devtools ? ` v-if: ${expression} ` : '');
    el.parentNode?.insertBefore(anchor, el);

    // Removes templates from the document and cleans up control attributes.
    for (const branch of branches) {
      removeQuietly(branch.template);
      branch.template.removeAttribute(`${p}if`);
      branch.template.removeAttribute(`${p}else-if`);
      branch.template.removeAttribute(`${p}else`);
      // The template leaves the scene and should never be traversed. The walk of the
      // parent element already had this node in the list, and without the mark it would
      // enter here and initialize directives within the template itself.
      markInitialized(branch.template);
    }

    const options = transitionOptions(el);
    let activeIndex = -1;
    let activeNodes: Node[] = [];

    const removeActive = (): void => {
      const nodes = activeNodes;
      activeNodes = [];
      if (!nodes.length) return;
      const finish = (): void => {
        for (const node of nodes) {
          destroy(node);
          (node as ChildNode).remove();
        }
      };
      if (options && nodes[0] instanceof HTMLElement) {
        void leave(nodes[0] as HTMLElement, options).then(finish);
      } else {
        finish();
      }
    };

    effect(() => {
      let matched = -1;
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (branch.expression === null || evaluateIn(branch.expression, scope, 'v-if')) {
          matched = i;
          break;
        }
      }

      if (matched === activeIndex) return;
      activeIndex = matched;
      removeActive();
      if (matched === -1) return;

      const source = branches[matched].template;
      const nodes = renderTemplate(source, anchor, scope);
      activeNodes = nodes;
      if (options && nodes[0] instanceof HTMLElement) void enter(nodes[0] as HTMLElement, options);
    });

    addCleanup(el, removeActive);
  },
  { priority: PRIORITY.IF, terminal: true }
);

/**
 * Clones a template, inserts before the anchor and initializes. Supports
 * `<template>` with multiple children.
 */
function renderTemplate(
  source: Element,
  anchor: Node,
  scope: Scope,
  batch?: { fragment: DocumentFragment; pending: Array<[Node, Scope]> }
): Node[] {
  const parent = anchor.parentNode;
  if (!parent) return [];

  const nodes: Node[] = [];

  if (source.tagName === 'TEMPLATE') {
    const fragment = (source as HTMLTemplateElement).content.cloneNode(true) as DocumentFragment;
    const children = Array.from(fragment.childNodes);
    parent.insertBefore(fragment, anchor);
    for (const node of children) {
      nodes.push(node);
      if (node.nodeType === 1) {
        markNodeScope(node, scope);
        walk(node, scope);
      }
    }
  } else {
    const clone = source.cloneNode(true) as Element;
    nodes.push(clone);
    markNodeScope(clone, scope);

    if (batch) {
      // Batched: the row goes into the fragment, outside the document.
      // Inserting a thousand rows one at a time makes the DOM redo the child
      // list's index bookkeeping on every call, which the CPU profile showed
      // dominating creation. The fragment turns that into a single insert.
      //
      // Walking still happens AFTER the node is connected, in the same order
      // as before, because a directive may depend on being in the document.
      batch.fragment.appendChild(clone);
      batch.pending.push([clone, scope]);
    } else {
      parent.insertBefore(clone, anchor);
      walk(clone, scope);
    }
  }

  return nodes;
}

// `v-else-if` and `v-else` are consumed by `v-if`. Registered to not
// appear as unknown directives.
defineDirective('else-if', () => undefined, { priority: PRIORITY.IF, terminal: true });
defineDirective('else', () => undefined, { priority: PRIORITY.IF, terminal: true });

// ---------------------------------------------------------------------------
// v-for
// ---------------------------------------------------------------------------

const FOR_PATTERN = /^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+?)\s*$/;

interface ForBlock {
  key: unknown;
  scope: Scope;
  nodes: Node[];
  data: Record<string, unknown>;
}

defineDirective(
  'for',
  ({ el, scope, expression, effect }) => {
    const match = FOR_PATTERN.exec(expression);
    if (!match) {
      handleError(
        new Error(`Invalid syntax in v-for="${expression}". Use "item in items".`),
        'v-for'
      );
      return;
    }

    const aliases = match[1].split(',').map((s) => s.trim()).filter(Boolean);
    const sourceExpression = match[2];
    const [itemAlias, indexAlias, thirdAlias] = aliases;

    const p = config.prefix;
    const keyExpression = el.getAttribute(':key') || el.getAttribute(`${p}bind:key`) || el.getAttribute(`${p}key`);

    const anchor = document.createComment(config.devtools ? ` v-for: ${expression} ` : '');
    el.parentNode?.insertBefore(anchor, el);

    const template = el.cloneNode(true) as Element;
    template.removeAttribute(`${p}for`);
    // The key expression was just read off the original element, and `v-bind`
    // treats `key` as a no-op precisely because `v-for` is the one that consumes
    // it. Left on the template it was pure freight: every row cloned the
    // attribute, parsed it, built a directive context to run a binding that
    // returns immediately, and then removed the attribute again. A row whose
    // only attribute was the key now carries no directive at all, so the walker
    // takes it down its cheap path.
    template.removeAttribute(':key');
    template.removeAttribute(`${p}bind:key`);
    template.removeAttribute(`${p}key`);
    // Silent removal: the original element becomes a template, is not leaving the
    // scene, so the observer should not unmount the list's effect.
    removeQuietly(el);

    let blocks: ForBlock[] = [];

    const clearAll = (): void => {
      for (const block of blocks) {
        for (const node of block.nodes) {
          destroy(node);
          (node as ChildNode).remove();
        }
      }
      blocks = [];
    };

    addCleanup(anchor, clearAll);

    effect(() => {
      const source = evaluateIn<unknown>(sourceExpression, scope, 'v-for');
      const entries = normalizeSource(source, itemAlias, indexAlias, thirdAlias);

      const previous = new Map<unknown, ForBlock>();
      for (const block of blocks) previous.set(block.key, block);

      const next: ForBlock[] = [];
      const used = new Set<unknown>();
      const batch = {
        fragment: document.createDocumentFragment(),
        pending: [] as Array<[Node, Scope]>,
      };

      entries.forEach((vars, index) => {
        const key = keyExpression
          ? evaluateIn(keyExpression, scope.child(vars), ':key')
          : `__index_${index}`;

        // Repeated key causes the list to reuse the wrong block when reordering.
        if (keyExpression && used.has(key)) warnDuplicateKey(el, key, expression);

        const existing = previous.get(key);
        if (existing && !used.has(key)) {
          used.add(key);
          // Reuses the block: only updates the scope variables.
          for (const [name, value] of Object.entries(vars)) existing.data[name] = value;
          next.push(existing);
          return;
        }

        const childScope = scope.reactiveChild(vars);
        const nodes = renderTemplate(template, anchor, childScope, batch);
        used.add(key);
        next.push({ key, scope: childScope, nodes, data: childScope.data });
      });

      // One insert for every new row, and only then the walk.
      if (batch.fragment.firstChild) anchor.parentNode?.insertBefore(batch.fragment, anchor);
      for (const [node, rowScope] of batch.pending) walk(node, rowScope);

      // Removes blocks that left the list.
      // The set keeps track of who was reused by identity. Previously this was
      // `next.includes(block)`, a scan inside a loop that already iterates the list:
      // on ten thousand lines it gave a hundred million comparisons.
      const reused = new Set<ForBlock>(next);
      for (const block of blocks) {
        if (used.has(block.key) && reused.has(block)) continue;
        for (const node of block.nodes) {
          destroy(node);
          (node as ChildNode).remove();
        }
      }

      // Reorders the DOM by traversing backwards with a cursor.
      let cursor: Node = anchor;
      for (let i = next.length - 1; i >= 0; i--) {
        const block = next[i];
        const last = block.nodes[block.nodes.length - 1];
        if (last && last.nextSibling !== cursor) {
          for (const node of block.nodes) anchor.parentNode?.insertBefore(node, cursor);
        }
        cursor = block.nodes[0] ?? cursor;
      }

      blocks = next;
    });
  },
  { priority: PRIORITY.FOR, terminal: true }
);

/** Converts array, object, number or string into a list of item scopes. */
function normalizeSource(
  source: unknown,
  itemAlias: string,
  indexAlias?: string,
  thirdAlias?: string
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];

  if (Array.isArray(source)) {
    source.forEach((item, index) => {
      const vars: Record<string, unknown> = { [itemAlias]: item };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }

  if (typeof source === 'number') {
    for (let i = 1; i <= source; i++) {
      const vars: Record<string, unknown> = { [itemAlias]: i };
      if (indexAlias) vars[indexAlias] = i - 1;
      out.push(vars);
    }
    return out;
  }

  if (typeof source === 'string') {
    Array.from(source).forEach((ch, index) => {
      const vars: Record<string, unknown> = { [itemAlias]: ch };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }

  if (source && typeof source === 'object') {
    const iterable =
      source instanceof Map
        ? Array.from(source.entries())
        : source instanceof Set
          ? Array.from(source).map((v, i) => [i, v] as [unknown, unknown])
          : Object.entries(source as Record<string, unknown>);

    iterable.forEach(([key, value], index) => {
      const vars: Record<string, unknown> = { [itemAlias]: value };
      if (indexAlias) vars[indexAlias] = key;
      if (thirdAlias) vars[thirdAlias] = index;
      out.push(vars);
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// v-bind, :attribute, v-class, v-style
// ---------------------------------------------------------------------------

const BOOLEAN_ATTRIBUTES = new Set([
  'disabled',
  'checked',
  'readonly',
  'required',
  'selected',
  'hidden',
  'open',
  'multiple',
  'autofocus',
  'novalidate',
  'inert',
]);

/**
 * Attributes that the browser treats as addresses to follow. A value from
 * state may have originated from external data, so the scheme needs to be
 * checked before it becomes `href` or `src`.
 */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'ping',
  'poster',
]);

/** Whitespace and control characters that the browser discards when reading the scheme. */
const SCHEME_NOISE = /[\s\x00-\x1f]/g;

/**
 * `true` when the address uses a scheme that executes code. `data:text/html`
 * is in the list because it opens a document with its own origin and active script.
 */
export function isDangerousUrl(value: string): boolean {
  // An address can bring a line break in the middle of `javascript:` and the
  // browser still executes it, so the check cleans the noise before comparing,
  // the same way it does.
  const clean = value.replace(SCHEME_NOISE, '').toLowerCase();
  return (
    clean.startsWith('javascript:') ||
    clean.startsWith('vbscript:') ||
    clean.startsWith('data:text/html') ||
    clean.startsWith('data:application/xhtml')
  );
}

/**
 * Applies a value to an attribute, handling special cases.
 *
 * `allowDangerous` comes from the `.dangerous` modifier and enables bindings
 * that write executable markup, currently only `srcdoc`.
 */
export function applyBinding(
  el: HTMLElement,
  name: string,
  value: unknown,
  asProp = false,
  allowDangerous = false
): void {
  if (name === 'class') return applyClass(el, value);
  if (name === 'style') return applyStyle(el, value);

  // `srcdoc` writes an entire document inside the iframe, with active script.
  // It's like the iframe's `v-html`, but written as if it were just a binding,
  // so the danger doesn't show in the HTML reading. Here it needs to be stated out loud:
  // `:srcdoc.dangerous="..."` at the point of use, or `V.config.sanitizeUrls = false`
  // for the entire application.
  if (config.sanitizeUrls && !allowDangerous && name === 'srcdoc') {
    warn(
      `:srcdoc refused in ${describeElement(el)}: the value becomes a document ` +
        'with active script inside the iframe, the same way v-html becomes markup. ' +
        'If the content is trusted, write :srcdoc.dangerous="..."; to turn off ' +
        'this protection on the entire application, set V.config.sanitizeUrls = false.'
    );
    el.removeAttribute(name);
    return;
  }

  if (config.sanitizeUrls && !asProp) {
    // Address with executable scheme: attribute doesn't reach the DOM.
    if (URL_ATTRIBUTES.has(name) && typeof value === 'string' && isDangerousUrl(value)) {
      warn(
        `value refused in :${name} of ${describeElement(el)}: ` +
          `"${value.slice(0, 60)}" uses a scheme that executes code. ` +
          'Use an http(s) or relative address. To turn off this protection, ' +
          'set V.config.sanitizeUrls = false.'
      );
      el.removeAttribute(name);
      return;
    }
    // `:onerror="..."` would become an inline handler, which runs as script.
    // Events are declared with `@event`, which never passes through this path.
    if (name.length > 2 && /^on[a-z]/.test(name)) {
      warn(
        `attribute "${name}" refused in ${describeElement(el)}: linking event by ` +
          `attribute creates an inline handler. Use @${name.slice(2)}="..." instead.`
      );
      el.removeAttribute(name);
      return;
    }
  }

  if (asProp) {
    (el as any)[name] = value;
    return;
  }

  if (BOOLEAN_ATTRIBUTES.has(name)) {
    if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, '');
    // Keeps the property in sync, important for inputs.
    if (name in el) (el as any)[name] = !!value;
    return;
  }

  if (name === 'value' && 'value' in el) {
    (el as any).value = value == null ? '' : value;
    return;
  }

  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? '' : String(value));
}

/** Original classes of the element, preserved between updates. */
const baseClasses = new WeakMap<Element, string[]>();

export function applyClass(el: HTMLElement, value: unknown): void {
  let base = baseClasses.get(el);
  if (!base) {
    base = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
    baseClasses.set(el, base);
  }

  const next = new Set(base);
  collectClasses(value, next);
  el.setAttribute('class', Array.from(next).join(' '));
  if (!el.getAttribute('class')) el.removeAttribute('class');
}

function collectClasses(value: unknown, out: Set<string>): void {
  if (!value) return;
  if (typeof value === 'string') {
    for (const cls of value.split(/\s+/)) if (cls) out.add(cls);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, out);
    return;
  }
  if (typeof value === 'object') {
    for (const [cls, active] of Object.entries(value as Record<string, unknown>)) {
      if (active) for (const c of cls.split(/\s+/)) if (c) out.add(c);
    }
  }
}

export function applyStyle(el: HTMLElement, value: unknown): void {
  if (!value) return;
  if (typeof value === 'string') {
    el.style.cssText = value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) applyStyle(el, item);
    return;
  }
  for (const [prop, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw == null || raw === false) {
      el.style.removeProperty(prop);
      continue;
    }
    const name = prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const text = String(raw);
    if (name.startsWith('--')) el.style.setProperty(name, text);
    else el.style.setProperty(name, text);
  }
}

defineDirective(
  'bind',
  ({ el, arg, modifiers, effect, evaluate: ev, expression }) => {
    // `v-bind="{ a: 1, b: 2 }"` without argument applies multiple attributes.
    if (!arg) {
      effect(() => {
        const values = ev<Record<string, unknown>>();
        if (values && typeof values === 'object') {
          for (const [name, value] of Object.entries(values)) applyBinding(el, name, value);
        }
      });
      return;
    }
    if (arg === 'key') return; // consumed by v-for
    const asProp = !!modifiers.prop;
    // `.dangerous` is the explicit way to request a binding that writes executable markup.
    // Without it, `:srcdoc` is refused.
    const allowDangerous = !!modifiers.dangerous;
    effect(() => {
      applyBinding(el, arg, ev(), asProp, allowDangerous);
    });
    void expression;
  },
  { priority: PRIORITY.BIND }
);

defineDirective('class', ({ el, effect, evaluate: ev }) => {
  effect(() => applyClass(el, ev()));
});

defineDirective('style', ({ el, effect, evaluate: ev }) => {
  effect(() => applyStyle(el, ev()));
});

// ---------------------------------------------------------------------------
// v-on, @event and shortcuts
// ---------------------------------------------------------------------------

const KEY_ALIASES: Record<string, string[]> = {
  enter: ['Enter'],
  esc: ['Escape'],
  escape: ['Escape'],
  space: [' ', 'Spacebar'],
  tab: ['Tab'],
  delete: ['Delete', 'Backspace'],
  backspace: ['Backspace'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
};

const SYSTEM_MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const;

/**
 * Executes the expression of an event. If the expression is just the name of a
 * function, it is called with the event (or with `detail`, when coming from `emit`).
 */
export function runHandler(expression: string, scope: Scope, event: Event, el: HTMLElement): void {
  const payload = (event as CustomEvent).detail;
  const isEmit = (event as any).__voodoo === true;
  // In an event coming from `emit`, `$event` delivers the payload directly, which
  // is what the person expects when writing `@saved="last = $event"`. The raw event
  // remains available in `$rawEvent`.
  const local = scope.child({
    $event: isEmit ? payload : event,
    $rawEvent: event,
    $el: el,
    $detail: payload,
  });

  try {
    const node = parse(expression);
    const value = evaluate(node, local);
    // `v-click="save"` calls the found function.
    if (typeof value === 'function' && (node.t === 'id' || node.t === 'member')) {
      value.call(scope.data, isEmit ? payload : event);
    }
  } catch (err) {
    handleError(err, `event ${event.type} ("${expression}")`);
  }
}

/**
 * Friendly aliases. `@hover` is more legible than `@mouseenter`, and `@tap`
 * works the same on touch and mouse.
 */
const EVENT_ALIASES: Record<string, string> = {
  hover: 'mouseenter',
  unhover: 'mouseleave',
  tap: 'click',
  press: 'pointerdown',
  release: 'pointerup',
  rightclick: 'contextmenu',
  enterkey: 'keydown',
  type: 'input',
  submitform: 'submit',
};

export type CustomEventInstaller = (
  el: HTMLElement,
  run: (event: Event) => void,
  modifiers: Record<string, string | true>,
  cleanup: (fn: () => void) => void
) => void;

/**
 * Events that Voodoo creates on top of natives: hold, click outside, swipe and
 * screen entry. Plugins can register theirs with `V.event()`.
 */
export const customEvents: Record<string, CustomEventInstaller> = {
  /** Hold pressed. Duration via modifier, like `@hold.1s`. */
  hold(el, run, modifiers, cleanup) {
    const holdFor = parseDuration(
      (typeof modifiers.duration === 'string' && modifiers.duration) ||
        Object.keys(modifiers).find((m) => /^[\d.]+(ms|s)?$/.test(m)) ||
        el.getAttribute(`${config.prefix}hold-duration`) ||
        800,
      800
    );

    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;

    const start = (event: Event): void => {
      fired = false;
      el.classList.add('v-holding');
      el.style.setProperty('--v-hold-duration', `${holdFor}ms`);
      timer = setTimeout(() => {
        fired = true;
        el.classList.remove('v-holding');
        run(event);
      }, holdFor);
    };
    const stopHold = (): void => {
      if (timer) clearTimeout(timer);
      timer = null;
      el.classList.remove('v-holding');
    };
    // Prevents normal click from firing right after a completed hold.
    const swallowClick = (event: Event): void => {
      if (fired) {
        event.preventDefault();
        event.stopPropagation();
        fired = false;
      }
    };

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stopHold);
    el.addEventListener('pointerleave', stopHold);
    el.addEventListener('pointercancel', stopHold);
    el.addEventListener('click', swallowClick, true);

    cleanup(() => {
      stopHold();
      el.removeEventListener('pointerdown', start);
      el.removeEventListener('pointerup', stopHold);
      el.removeEventListener('pointerleave', stopHold);
      el.removeEventListener('pointercancel', stopHold);
      el.removeEventListener('click', swallowClick, true);
    });
  },

  /** Click anywhere outside the element. */
  outside(el, run, _modifiers, cleanup) {
    const handler = (event: Event): void => {
      if (!el.isConnected) return;
      if (el === event.target || el.contains(event.target as Node)) return;
      run(event);
    };
    document.addEventListener('click', handler, true);
    cleanup(() => document.removeEventListener('click', handler, true));
  },

  /** Element entered visible area. */
  visible(el, run, modifiers, cleanup) {
    if (typeof IntersectionObserver === 'undefined') {
      run(new CustomEvent('visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(new CustomEvent('visible', { detail: entry }));
          // Without the `.repeat` modifier, the event happens just once.
          if (modifiers.repeat !== true) observer.unobserve(el);
        }
      },
      { threshold: Number(modifiers.threshold ?? 0.1), rootMargin: String(modifiers.margin ?? '0px') }
    );
    observer.observe(el);
    cleanup(() => observer.disconnect());
  },
};

/** Installs the four swipe directions using pointer events. */
for (const direction of ['left', 'right', 'up', 'down'] as const) {
  customEvents[`swipe${direction}`] = (el, run, _modifiers, cleanup) => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const down = (event: PointerEvent): void => {
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    };
    const up = (event: PointerEvent): void => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const threshold = 40;
      const matched =
        direction === 'left'
          ? dx < -threshold && Math.abs(dx) > Math.abs(dy)
          : direction === 'right'
            ? dx > threshold && Math.abs(dx) > Math.abs(dy)
            : direction === 'up'
              ? dy < -threshold && Math.abs(dy) > Math.abs(dx)
              : dy > threshold && Math.abs(dy) > Math.abs(dx);
      if (matched) run(new CustomEvent(`swipe${direction}`, { detail: { dx, dy } }));
    };

    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    cleanup(() => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    });
  };
}

function bindEvent(
  el: HTMLElement,
  rawEventName: string,
  expression: string,
  scope: Scope,
  modifiers: Record<string, string | true>,
  cleanup: (fn: () => void) => void
): void {
  const eventName = EVENT_ALIASES[rawEventName] ?? rawEventName;

  // Synthetic events have their own installation.
  const custom = customEvents[rawEventName];
  if (custom) {
    custom(
      el,
      (event) => {
        if (modifiers.prevent) event.preventDefault();
        if (modifiers.stop) event.stopPropagation();
        runHandler(expression, scope, event, el);
      },
      modifiers,
      cleanup
    );
    return;
  }

  const target: EventTarget = modifiers.window
    ? window
    : modifiers.document
      ? document
      : modifiers.outside
        ? document
        : el;

  let handler = (event: Event): void => {
    if (modifiers.self && event.target !== el) return;
    if (modifiers.outside) {
      if (el === event.target || el.contains(event.target as Node)) return;
      if (!el.isConnected) return;
    }

    // Key filter.
    if (event instanceof KeyboardEvent) {
      for (const mod of SYSTEM_MODIFIERS) {
        if (modifiers[mod] && !(event as any)[`${mod}Key`]) return;
      }
      const keyMods = Object.keys(modifiers).filter(
        (m) => m in KEY_ALIASES || /^[a-z0-9]$/.test(m)
      );
      if (keyMods.length) {
        const matched = keyMods.some((m) => {
          const aliases = KEY_ALIASES[m];
          if (aliases) return aliases.includes(event.key);
          return event.key.toLowerCase() === m;
        });
        if (!matched) return;
      }
    }

    if (modifiers.prevent) event.preventDefault();
    if (modifiers.stop) event.stopPropagation();

    runHandler(expression, scope, event, el);
  };

  const wait = modifiers.debounce;
  if (wait !== undefined) {
    handler = debounce(handler, parseDuration(wait === true ? 250 : wait, 250));
  }
  const throttleWait = modifiers.throttle;
  if (throttleWait !== undefined) {
    handler = throttle(handler, parseDuration(throttleWait === true ? 250 : throttleWait, 250));
  }

  const options: AddEventListenerOptions = {
    capture: !!modifiers.capture,
    once: !!modifiers.once,
    passive: !!modifiers.passive,
  };

  target.addEventListener(eventName, handler, options);
  cleanup(() => target.removeEventListener(eventName, handler, options));
}

defineDirective('on', ({ el, arg, expression, scope, modifiers, cleanup }) => {
  if (!arg) return;
  bindEvent(el, arg, expression, scope, modifiers, cleanup);
});

/** Shortcuts like `v-click`, which are equivalent to `v-on:click`. */
const EVENT_SHORTCUTS = [
  'click',
  'dblclick',
  'input',
  'change',
  'keyup',
  'keydown',
  'keypress',
  'mouseenter',
  'mouseleave',
  'mouseover',
  'mousedown',
  'mouseup',
  'contextmenu',
  'wheel',
  'paste',
  'dragstart',
  'dragover',
  'dragleave',
  'drop',
];

for (const name of EVENT_SHORTCUTS) {
  defineDirective(name, ({ el, expression, scope, modifiers, cleanup }) => {
    bindEvent(el, name, expression, scope, modifiers, cleanup);
  });
}

// ---------------------------------------------------------------------------
// v-model
// ---------------------------------------------------------------------------

defineDirective(
  'model',
  ({ el, expression, scope, modifiers, effect, cleanup }) => {
    const input = el as HTMLInputElement;
    const tag = input.tagName;
    const type = (input.getAttribute('type') || 'text').toLowerCase();

    const isCheckbox = tag === 'INPUT' && type === 'checkbox';
    const isRadio = tag === 'INPUT' && type === 'radio';
    const isSelect = tag === 'SELECT';
    const isMultiSelect = isSelect && (input as unknown as HTMLSelectElement).multiple;
    const isFile = tag === 'INPUT' && type === 'file';
    const isNumberInput = type === 'number' || type === 'range';

    const lazy = !!modifiers.lazy;
    const wantsNumber = !!modifiers.number || isNumberInput;
    const wantsTrim = !!modifiers.trim;
    const debounceMs = modifiers.debounce
      ? parseDuration(modifiers.debounce === true ? 250 : modifiers.debounce, 250)
      : el.getAttribute(`${config.prefix}debounce`)
        ? parseDuration(el.getAttribute(`${config.prefix}debounce`)!, 250)
        : 0;

    const eventName = lazy || isSelect || isCheckbox || isRadio || isFile ? 'change' : 'input';

    // DOM -> state
    let onInput = (): void => {
      let value: unknown;

      if (isCheckbox) {
        const current = evaluateIn(expression, scope, 'v-model');
        if (Array.isArray(current)) {
          const itemValue = input.value;
          const list = [...current];
          const index = list.indexOf(itemValue);
          if (input.checked && index === -1) list.push(itemValue);
          else if (!input.checked && index > -1) list.splice(index, 1);
          value = list;
        } else {
          value = input.checked;
        }
      } else if (isRadio) {
        if (!input.checked) return;
        value = input.value;
      } else if (isMultiSelect) {
        value = Array.from((input as unknown as HTMLSelectElement).selectedOptions).map(
          (option) => option.value
        );
      } else if (isFile) {
        value = modifiers.single ? input.files?.[0] ?? null : input.files;
      } else {
        value = input.value;
        if (wantsTrim && typeof value === 'string') value = value.trim();
        if (wantsNumber && typeof value === 'string') {
          const n = value === '' ? null : Number(value);
          value = n === null || Number.isNaN(n) ? value : n;
        }
      }

      setValue(expression, scope, value);
    };

    if (debounceMs > 0) onInput = debounce(onInput, debounceMs);

    input.addEventListener(eventName, onInput);
    cleanup(() => input.removeEventListener(eventName, onInput));

    // state -> DOM
    effect(() => {
      const value = evaluateIn(expression, scope, 'v-model');

      if (isCheckbox) {
        input.checked = Array.isArray(value) ? value.includes(input.value) : !!value;
        return;
      }
      if (isRadio) {
        input.checked = String(value) === input.value;
        return;
      }
      if (isMultiSelect) {
        const list = Array.isArray(value) ? value.map(String) : [];
        for (const option of Array.from((input as unknown as HTMLSelectElement).options)) {
          option.selected = list.includes(option.value);
        }
        return;
      }
      if (isFile) return; // file inputs are read-only

      const next = value == null ? '' : String(value);
      if (input.value !== next) input.value = next;

      // `<select>` may receive options later. Reapplies in the next cycle.
      if (isSelect && input.value !== next) {
        void nextTick(() => {
          if (input.value !== next) input.value = next;
        });
      }
    });
  },
  { priority: PRIORITY.MODEL }
);

// ---------------------------------------------------------------------------
// v-init, v-ref, v-effect, v-watch, v-cloak, v-once
// ---------------------------------------------------------------------------

defineDirective(
  'init',
  ({ el, expression, scope }) => {
    queuePostFlush(() => {
      const local = scope.child({ $el: el });
      const value = evaluateIn(expression, local, 'v-init');
      if (typeof value === 'function') value.call(scope.data);
    });
  },
  { priority: PRIORITY.INIT }
);

defineDirective(
  'ref',
  ({ el, expression, scope, cleanup }) => {
    const name = expression.trim();
    if (!name) return;
    const target = scope.owner ?? scope;
    target.refs[name] = el;
    cleanup(() => {
      if (target.refs[name] === el) delete target.refs[name];
    });
  },
  { priority: PRIORITY.REF }
);

defineDirective('effect', ({ effect, evaluate: ev }) => {
  effect(() => {
    ev();
  });
});

defineDirective('watch', ({ el, expression, scope, effect }) => {
  // Observes the value of `v-model` on the same element and calls the expression.
  const modelExpression = el.getAttribute(`${config.prefix}model`);
  let previous: unknown;
  let first = true;

  effect(() => {
    const value = modelExpression
      ? evaluateIn(modelExpression, scope, 'v-watch')
      : evaluateIn(expression, scope, 'v-watch');

    if (first) {
      first = false;
      previous = value;
      return;
    }
    if (value === previous) return;
    const old = previous;
    previous = value;

    if (modelExpression) {
      const local = scope.child({ $value: value, $old: old, $el: el });
      const result = evaluateIn(expression, local, 'v-watch');
      if (typeof result === 'function') result.call(scope.data, value, old);
    }
  });
});

defineDirective('cloak', ({ el }) => {
  el.removeAttribute(`${config.prefix}cloak`);
});

defineDirective('once', ({ el, effect, evaluate: ev }) => {
  // Evaluates once only and does not create reactive effect.
  void effect;
  const value = ev();
  if (value !== undefined) el.textContent = stringify(value);
});

// ---------------------------------------------------------------------------
// v-teleport
// ---------------------------------------------------------------------------

defineDirective(
  'teleport',
  ({ el, expression, cleanup }) => {
    const selector = expression.trim() || 'body';
    const target =
      selector === 'body' ? document.body : (document.querySelector(selector) as HTMLElement | null);
    if (!target) {
      handleError(new Error(`v-teleport destination not found: ${selector}`), 'v-teleport');
      return;
    }
    const placeholder = document.createComment(' v-teleport ');
    el.parentNode?.insertBefore(placeholder, el);
    target.appendChild(el);

    cleanup(() => {
      placeholder.parentNode?.insertBefore(el, placeholder);
      placeholder.remove();
    });
  },
  { priority: PRIORITY.DATA }
);

// ---------------------------------------------------------------------------
// v-transition and auxiliary classes: registered to not generate warnings
// ---------------------------------------------------------------------------

for (const name of [
  'transition',
  'enter-class',
  'enter-active-class',
  'enter-to-class',
  'leave-class',
  'leave-active-class',
  'leave-to-class',
  'duration',
  'key',
  'slot',
  'ignore',
  'pre',
]) {
  defineDirective(name, () => undefined, { priority: PRIORITY.TRANSITION });
}

// ---------------------------------------------------------------------------
// v-data and v-component
// ---------------------------------------------------------------------------

// The walker handles these two directly, because they create the scope used by
// the rest of the element. The registration exists so that priority ordering,
// attribute cleanup and the inspector recognize them as real directives.
defineDirective('data', () => undefined, { priority: PRIORITY.DATA });
defineDirective('component', () => undefined, { priority: PRIORITY.COMPONENT });
