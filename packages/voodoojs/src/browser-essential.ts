/**
 * Entry point for the essential build for browsers.
 * Publishes `window.V` and initializes the page when the DOM is ready.
 */

import V from './essential';
import { bootstrap } from './bootstrap';

bootstrap(V);

export default V;
