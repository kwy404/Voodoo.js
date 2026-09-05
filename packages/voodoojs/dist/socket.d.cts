export { R as RoomOptions, a as RoomState, h as Socket, i as SocketDefaults, j as SocketFactory, k as SocketInterceptor, l as SocketListener, S as SocketMessage, b as SocketOptions, c as SocketRoom, d as SocketState, e as SocketTransport, V as VoodooSocket, W as WebSocketCtor, m as WebSocketLike, f as createSocket, r as resolveSocketURL, s as socket, g as socketSupported } from './index-DTllqUtj.cjs';

/**
 * @module socket/protocol
 *
 * The Engine.IO/Socket.IO protocol written by hand, without the library.
 *
 * It's worth explaining why this file exists. `socket.io-client` weighs over 30
 * KB compressed, and Voodoo has no runtime dependencies. It happens
 * that the piece of the protocol a page actually uses is small: one
 * handshake, six packet codes and some JSON. This fits in plain text over
 * native WebSocket, and that's exactly what's here.
 *
 * An Engine.IO v4 text frame has the form `<code><body>`:
 *
 * ```text
 * 0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}   open
 * 2                                                          server ping
 * 3                                                          client pong
 * 40                                                         enter namespace
 * 42["message",{"text":"hi"}]                                event
 * 421["save",{...}]                                          event requesting ack 1
 * 431[{"ok":true}]                                           ack 1 response
 * ```
 *
 * The body of a `4` (message) packet is a Socket.IO packet, which in turn has
 * the form `<type>[<namespace>,][<ack>]<JSON>`. The two layers are decoded
 * here, in pure functions, because pure-function protocol is testable protocol.
 *
 * What **is not** implemented is declared in `docs/websocket.md`, and the
 * short list is: binary attachments (`45`/`46`), polling transport and upgrade,
 * and namespaces other than `/`.
 */
/** Engine.IO v4 packet codes. */
declare const ENGINE: {
    readonly OPEN: "0";
    readonly CLOSE: "1";
    readonly PING: "2";
    readonly PONG: "3";
    readonly MESSAGE: "4";
    readonly UPGRADE: "5";
    readonly NOOP: "6";
};
/** Socket.IO v5 packet types (v4 server protocol). */
declare const SIO: {
    readonly CONNECT: 0;
    readonly DISCONNECT: 1;
    readonly EVENT: 2;
    readonly ACK: 3;
    readonly CONNECT_ERROR: 4;
    readonly BINARY_EVENT: 5;
    readonly BINARY_ACK: 6;
};
/** Data the server sends in the open packet. */
interface EngineHandshake {
    sid: string;
    /** Interval between server pings, in ms. */
    pingInterval: number;
    /** How long the server waits for pong before giving up, in ms. */
    pingTimeout: number;
    upgrades?: string[];
    maxPayload?: number;
}
/** Socket.IO packet already split into its parts. */
interface SocketIoPacket {
    /** One of the values of `SIO`. */
    type: number;
    /** Namespace. This implementation only supports `/`. */
    namespace: string;
    /** Ack number, when the packet requests or responds with acknowledgment. */
    ack?: number;
    /** Body already converted from JSON. For events, `[name, ...args]`. */
    data?: unknown;
}
/** Engine.IO packet already classified. */
type EnginePacket = {
    kind: 'open';
    handshake: EngineHandshake;
} | {
    kind: 'close';
} | {
    kind: 'ping';
} | {
    kind: 'pong';
} | {
    kind: 'message';
    packet: SocketIoPacket;
} | {
    kind: 'noop';
}
/** Frame this client can't read: binary, upgrade or garbage. */
 | {
    kind: 'unknown';
    raw: string;
};
/**
 * Reads the body of an Engine.IO `4` (message) packet.
 *
 * The order of parts is fixed and each only appears when it exists, so
 * reading is positional: type, optional namespace ending in comma, optional ack
 * in digits, and the rest is JSON.
 */
declare function decodeSocketIo(body: string): SocketIoPacket | null;
/**
 * Classifies a text frame received from the server.
 *
 * Binary frames arrive as `Blob` or `ArrayBuffer` and become `unknown`: they're
 * valid in the protocol, this implementation just doesn't read them.
 */
declare function decodeEngine(raw: unknown): EnginePacket;
/**
 * Builds a `4` (message) packet ready for the wire.
 *
 * `encodeSocketIo({ type: SIO.EVENT, data: ['oi', 1] })` returns `42["oi",1]`.
 */
declare function encodeSocketIo(packet: SocketIoPacket): string;
/**
 * Builds the Engine.IO endpoint URL.
 *
 * The path becomes `<path>?EIO=4&transport=websocket`, because this implementation
 * opens directly in WebSocket and never uses polling.
 */
declare function engineURL(base: string, path?: string): string;

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

/**
 * Plugin in the format accepted by `V.use()`.
 *
 * ```js
 * import { voodooSocket } from 'voodoojs/dist/socket.js'
 * V.use(voodooSocket)
 * ```
 */
declare const voodooSocket: {
    name: string;
    install(V: Record<string, unknown>): void;
};

export { ENGINE, type EngineHandshake, type EnginePacket, SIO, type SocketIoPacket, decodeEngine, decodeSocketIo, voodooSocket as default, encodeSocketIo, engineURL, voodooSocket };
