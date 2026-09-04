import { c as core, V as VoodooCollection } from './query-XooOh4vB.cjs';
import './http.cjs';
import './utils.cjs';
import './reactivity.cjs';

/**
 * Essential build of Voodoo.js, served by default on the CDN.
 *
 * Includes everything most pages need: reactivity, directives, components,
 * chainable DOM, declarative HTTP, forms with validation and masks, interface,
 * and notifications.
 *
 * Excluded to keep the file small: charts, physics-based animations, router,
 * internationalization, reactivity inspector, and the ready-to-use component
 * library. For these, use `voodoo.full.min.js` or build a custom version with
 * `npx voodoojs-cli build`.
 */

interface VoodooEssential extends Omit<typeof core, never> {
    (input?: unknown, context?: unknown): VoodooCollection;
}
declare const V: VoodooEssential;

export { V, type VoodooEssential, V as default };
