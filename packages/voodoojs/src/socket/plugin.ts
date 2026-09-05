/**
 * @module socket/plugin
 *
 * Separate entry for the real-time layer.
 *
 * The reason is measured, not aesthetic: with the module in the complete build,
 * the file went from 127.58 KB to 134.22 KB compressed, and the ceiling is 133. Instead
 * of raising the target, which is the same as having no target, the module became its own
 * entry, as the GPU layer already had for the same reason. Those using
 * WebSocket pay for WebSocket; those not using it keep the file the same size as before.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js" defer></script>
 * <script type="module">
 *   import 'https://cdn.jsdelivr.net/npm/voodoojs/dist/socket.js'
 * </script>
 * ```
 *
 * ```js
 * import V from 'voodoojs'
 * import 'voodoojs/dist/socket.js'   // registers v-socket, v-room and sets up V.socket
 * ```
 *
 * Importing this file has two effects: registers the `v-socket`,
 * `v-room` and `v-on-socket` directives, and makes `V.socket` available. In ESM builds
 * both sides share the same runtime, because common parts go out in
 * shared chunks.
 */

// Side effect: registers v-socket, v-room and v-on-socket.
import '../directives/socket';

import { socket } from './index';

export { socket };
export * from './index';

/**
 * Plugin in the format accepted by `V.use()`.
 *
 * ```js
 * import { voodooSocket } from 'voodoojs/dist/socket.js'
 * V.use(voodooSocket)
 * ```
 */
export const voodooSocket = {
  name: 'socket',
  install(V: Record<string, unknown>): void {
    if (!V.socket) V.socket = socket;
  },
};

// When the global object already exists, linking `V.socket` alone avoids one more
// configuration step for those who just want to use the directive.
const target = (globalThis as Record<string, any>).V;
if (target && typeof target === 'object' && !target.socket) target.socket = socket;

export default voodooSocket;
