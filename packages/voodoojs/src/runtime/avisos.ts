/**
 * @module runtime/avisos
 *
 * Development warnings. Everything here only runs when
 * `V.config.devtools` is enabled; in production the cost is a single
 * boolean comparison and nothing more.
 *
 * Each message follows the same form: what was found, where it was found,
 * and what to do about it. A warning that doesn't say how to fix it is noise.
 */

import { config } from './registry';

/** `true` when detailed warnings are enabled. */
export function inDevelopment(): boolean {
  return config.devtools === true;
}

/** Describe an element briefly, in the style of a CSS selector. */
export function describeElement(el: Element | null): string {
  if (!el) return '(no element)';
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join('.')}`;
  return `<${out}>`;
}

/** Emit a warning only in development. */
export function warn(message: string): void {
  if (!inDevelopment()) return;
  // eslint-disable-next-line no-console
  console.warn(`[Voodoo] ${message}`);
}

/**
 * Warn once per key. Prevents filling the console when the same warning
 * arises inside a `v-for` with hundreds of items.
 */
const alreadyWarned = new Set<string>();

export function warnOnce(key: string, message: string): void {
  if (!inDevelopment()) return;
  if (alreadyWarned.has(key)) return;
  alreadyWarned.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[Voodoo] ${message}`);
}

/** Clear the memory of already-emitted warnings. Used in tests. */
export function clearWarnings(): void {
  alreadyWarned.clear();
}

/**
 * `v-*` attributes that Voodoo reads directly from HTML, without going through a
 * registered directive. Without this list, they would appear as "unknown directive".
 */
const AUXILIARY_ATTRIBUTES = new Set([
  'confirm-title',
  'confirm-label',
  'confirm-cancel',
  'hold-duration',
]);

/** Warn about a `v-something` that no one registered. */
export function warnUnknownDirective(el: Element, raw: string, name: string): void {
  if (!inDevelopment()) return;
  if (AUXILIARY_ATTRIBUTES.has(name)) return;
  warnOnce(
    `unknown-directive:${name}`,
    `unknown directive "${raw}" at ${describeElement(el)}. ` +
      `No directive named "${name}" was registered. ` +
      `Check the spelling or register with V.directive("${name}", ...).`
  );
}

/** Warn about a component tag that no one registered. */
export function warnUnknownComponent(el: Element, name: string): void {
  warnOnce(
    `unknown-component:${name}`,
    `component "${name}" not registered at ${describeElement(el)}. ` +
      `Register with V.component("${name}", { ... }) before using the tag, ` +
      'or remove the attribute to leave the element as plain HTML.'
  );
}

/** Warn about an expression that cannot be evaluated. */
export function warnInvalidExpression(
  el: Element | null,
  raw: string,
  expression: string,
  err: unknown
): void {
  if (!inDevelopment()) return;
  const reason = err instanceof Error ? err.message.split('\n')[0] : String(err);
  warn(
    `invalid expression in ${raw}="${expression}" on element ${describeElement(el)}.\n` +
      `Reason: ${reason}\n` +
      'Suggestion: attribute expressions accept a single value. If the logic spans more ' +
      'than one line, move it to a component method and call the method here.'
  );
}

/** Warn about a duplicate key in `v-for`. */
export function warnDuplicateKey(el: Element, key: unknown, expression: string): void {
  if (!inDevelopment()) return;
  warn(
    `duplicate key "${String(key)}" in v-for="${expression}" on element ` +
      `${describeElement(el)}. Two rows with the same key cause the list to ` +
      'reuse the wrong block when reordering. Use a unique key, like the item id.'
  );
}

/** Warn about a required prop that was not passed. */
export function warnRequiredProp(el: Element, component: string, prop: string): void {
  if (!inDevelopment()) return;
  warn(
    `required prop "${prop}" missing from component "${component}" at ` +
      `${describeElement(el)}. Pass the value on the tag with ${prop}="..." for a ` +
      `fixed value or :${prop}="expression" for a state value.`
  );
}

/** Warn that an old name still works, but is no longer the official one. */
export function warnAlias(alias: string, canonical: string): void {
  warnOnce(
    `alias:${alias}`,
    `"${alias}" is an alias for "${canonical}" and still works, ` +
      `but the official name is "${canonical}". Prefer "${canonical}" in new code.`
  );
}
