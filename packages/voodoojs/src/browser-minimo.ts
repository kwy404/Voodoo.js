/**
 * Entry point for the minimal build for browsers.
 * Publishes `window.V` and initializes the page when the document is ready.
 */

import V from './minimo';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
