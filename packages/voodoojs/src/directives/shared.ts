/**
 * @module directives/shared
 *
 * Base common to interface directives. Lives in its own module so that
 * `directives/ui` and `directives/dnd` can use the same helpers without
 * creating circular dependency between them.
 */

import { injectStyle } from '../dom/style';
import { defineDirective, PRIORITY, config } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import {
  evaluateIn,
  closestDirective,
  queryDirective,
  readAttr,
  hasAttr as hasCachedAttr,
} from '../runtime/walker';

// ---------------------------------------------------------------------------
// Reading attributes and registering options
// ---------------------------------------------------------------------------

const optionValues = new WeakMap<Element, Record<string, string>>();

/**
 * Reads a Voodoo attribute accepting both `v-name` and `data-v-name` spellings.
 *
 * Queries the walker cache, so it continues returning the original value even
 * after the attribute left the HTML through automatic cleanup.
 */
export function attrOf(el: Element, name: string): string | null {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}

/** Checks for the presence of a Voodoo attribute, in both spellings. */
export function hasAttrOf(el: Element, name: string): boolean {
  return hasCachedAttr(el, `${config.prefix}${name}`) || hasCachedAttr(el, `data-v-${name}`);
}

/** CSS selector that matches the two accepted spellings of an attribute. */
export function selectorFor(name: string): string {
  return `[${config.prefix}${name}],[data-v-${name}]`;
}

/** Reads the value of an option, first from the registry and then from the raw attribute. */
export function readOption(el: Element, name: string): string | null {
  const bag = optionValues.get(el);
  if (bag && name in bag) return bag[name];
  return attrOf(el, name);
}

/** Stores the value of an option read directly by another directive. */
export function storeOption(el: Element, name: string, value: string): void {
  const bag = optionValues.get(el) ?? {};
  bag[name] = value;
  optionValues.set(el, bag);
}

/**
 * Registers an attribute that exists only to configure another directive, like
 * `v-tooltip-position` or `v-drawer-side`. The value goes into the options
 * registry, which avoids rereading the DOM and leaves the attribute declared
 * in the runtime.
 */
export function defineOption(name: string): void {
  defineDirective(
    name,
    ({ el, expression }) => {
      storeOption(el, name, expression);
    },
    { priority: PRIORITY.BIND }
  );
}

// ---------------------------------------------------------------------------
// Events and expressions
// ---------------------------------------------------------------------------

/** Fires a custom event that bubbles up the tree. */
export function dispatch(el: HTMLElement, type: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

/**
 * Evaluates the expression of an interface directive and returns the result.
 * When the expression is just the name of a function, the function is called
 * with the detail, in the same style as `v-on`.
 *
 * @param expression attribute text
 * @param scope active scope
 * @param el element that declared the directive, exposed as `$el`
 * @param event source event, exposed as `$event`
 * @param detail payload delivered to the function and exposed as `$detail`
 */
export function callExpression(
  expression: string,
  scope: Scope,
  el: HTMLElement,
  event?: Event,
  detail?: unknown
): unknown {
  if (!expression.trim()) return undefined;
  const local = scope.child({ $el: el, $event: event ?? null, $detail: detail });
  const value = evaluateIn<unknown>(expression, local, 'directive de UI');
  if (typeof value === 'function') {
    return (value as (payload?: unknown) => unknown).call(scope.data, detail ?? event);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Announcement for screen readers
// ---------------------------------------------------------------------------

const LIVE_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

let liveRegion: HTMLElement | null = null;

/**
 * Announces a short message in an `aria-live` region. Used by directives that
 * change the interface without a corresponding visible text, such as copy,
 * reorder and drop items.
 */
export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  injectStyle('ui-live', LIVE_CSS);

  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'v-visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }

  const region = liveRegion;
  region.textContent = '';
  // The text enters in a second step, otherwise screen readers ignore repeated messages.
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}

/**
 * Descendants of `root` that declared `childName` and whose closest owner with
 * `ownerName` is `root` itself. Useful for tabs within tabs.
 *
 * Uses the directive index of the runtime, so it continues working after `v-*`
 * attributes leave the HTML.
 */
export function ownedByDirective(
  root: HTMLElement,
  childName: string,
  ownerName: string
): HTMLElement[] {
  return queryDirective(root, childName).filter(
    (el) => closestDirective(el, ownerName) === root
  );
}

export { closestDirective, queryDirective };
