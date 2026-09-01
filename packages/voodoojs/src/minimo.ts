/**
 * Minimal build of Voodoo.js.
 *
 * Includes what makes HTML into an application: reactivity, the safe expression
 * evaluator, the DOM engine, components, all state and rendering directives,
 * events, attribute-based requests, and the chainable collection.
 *
 * Excluded: forms with validation and masks, interface components, drag and drop,
 * charts, animations, router, internationalization, inspector, and the ready-to-use
 * component library. For these, use `voodoo.min.js` or `voodoo.full.min.js`.
 */

import { core } from './core';
import { query, ready, VoodooCollection, fromHtml } from './dom/query';
import { magic } from './runtime/scope';

export interface VoodooMinimo extends Omit<typeof core, never> {
  (input?: unknown, context?: unknown): VoodooCollection;
}

const V = ((input?: unknown, context?: unknown) =>
  query(input as never, context as never)) as unknown as VoodooMinimo;

Object.assign(V, core, {
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,
  magic,
});

export default V;
export { V };
