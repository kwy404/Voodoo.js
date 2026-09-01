/**
 * Full build of Voodoo.js for browsers.
 *
 * In addition to everything in the essential build, includes charts, animations
 * with spring physics, router, internationalization, reactivity inspector, and
 * the ready-to-use component library.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>
 * ```
 */

import V from './index';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
