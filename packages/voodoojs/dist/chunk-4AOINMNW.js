import { config } from './chunk-PZOS2NII.js';

/**
 * Voodoo.js v0.4.3
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/runtime/avisos.ts
function inDevelopment() {
  return config.devtools === true;
}
function describeElement(el) {
  if (!el) return "(no element)";
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join(".")}`;
  return `<${out}>`;
}
function warn(message) {
  if (!inDevelopment()) return;
  console.warn(`[Voodoo] ${message}`);
}
var alreadyWarned = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (!inDevelopment()) return;
  if (alreadyWarned.has(key)) return;
  alreadyWarned.add(key);
  console.warn(`[Voodoo] ${message}`);
}
var AUXILIARY_ATTRIBUTES = /* @__PURE__ */ new Set([
  "confirm-title",
  "confirm-label",
  "confirm-cancel",
  "hold-duration"
]);
function warnUnknownDirective(el, raw, name) {
  if (!inDevelopment()) return;
  if (AUXILIARY_ATTRIBUTES.has(name)) return;
  warnOnce(
    `unknown-directive:${name}`,
    `unknown directive "${raw}" at ${describeElement(el)}. No directive named "${name}" was registered. Check the spelling or register with V.directive("${name}", ...).`
  );
}
function warnUnknownComponent(el, name) {
  warnOnce(
    `unknown-component:${name}`,
    `component "${name}" not registered at ${describeElement(el)}. Register with V.component("${name}", { ... }) before using the tag, or remove the attribute to leave the element as plain HTML.`
  );
}
function warnInvalidExpression(el, raw, expression, err) {
  if (!inDevelopment()) return;
  const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
  warn(
    `invalid expression in ${raw}="${expression}" on element ${describeElement(el)}.
Reason: ${reason}
Suggestion: attribute expressions accept a single value. If the logic spans more than one line, move it to a component method and call the method here.`
  );
}
function warnDuplicateKey(el, key, expression) {
  if (!inDevelopment()) return;
  warn(
    `duplicate key "${String(key)}" in v-for="${expression}" on element ${describeElement(el)}. Two rows with the same key cause the list to reuse the wrong block when reordering. Use a unique key, like the item id.`
  );
}
function warnRequiredProp(el, component, prop) {
  if (!inDevelopment()) return;
  warn(
    `required prop "${prop}" missing from component "${component}" at ${describeElement(el)}. Pass the value on the tag with ${prop}="..." for a fixed value or :${prop}="expression" for a state value.`
  );
}
function warnAlias(alias, canonical) {
  warnOnce(
    `alias:${alias}`,
    `"${alias}" is an alias for "${canonical}" and still works, but the official name is "${canonical}". Prefer "${canonical}" in new code.`
  );
}

export { describeElement, inDevelopment, warn, warnAlias, warnDuplicateKey, warnInvalidExpression, warnOnce, warnRequiredProp, warnUnknownComponent, warnUnknownDirective };
//# sourceMappingURL=chunk-4AOINMNW.js.map
//# sourceMappingURL=chunk-4AOINMNW.js.map