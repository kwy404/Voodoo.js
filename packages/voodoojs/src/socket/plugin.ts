/**
 * @module socket/plugin
 *
 * Entrada separada da camada de tempo real.
 *
 * O motivo e medido, nao estetico: com o modulo dentro do build completo o
 * arquivo foi de 127.58 KB para 134.22 KB comprimidos, e o teto e 133. Em vez
 * de levantar a meta, que e o mesmo que nao ter meta, o modulo virou entrada
 * propria, como a camada GPU ja tinha feito pelo mesmo motivo. Quem usa
 * WebSocket paga por WebSocket; quem nao usa continua com o arquivo do tamanho
 * de antes.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
 * <script type="module">
 *   import 'https://cdn.jsdelivr.net/npm/voodoojs/dist/socket.js'
 * </script>
 * ```
 *
 * ```js
 * import V from 'voodoojs'
 * import 'voodoojs/dist/socket.js'   // registra v-socket, v-room e liga V.socket
 * ```
 *
 * Importar este arquivo tem dois efeitos: registra as directives `v-socket`,
 * `v-room` e `v-on-socket`, e deixa `V.socket` disponivel. Nos builds ESM os
 * dois lados compartilham o mesmo runtime, porque as partes comuns saem em
 * chunks compartilhados.
 */

// Efeito colateral: registra v-socket, v-room e v-on-socket.
import '../directives/socket';

import { socket } from './index';

export { socket };
export * from './index';

/**
 * Plugin no formato aceito por `V.use()`.
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

// Quando o objeto global ja existe, ligar `V.socket` sozinho evita um passo a
// mais de configuracao para quem so quer usar a directive.
const alvo = (globalThis as Record<string, any>).V;
if (alvo && typeof alvo === 'object' && !alvo.socket) alvo.socket = socket;

export default voodooSocket;
