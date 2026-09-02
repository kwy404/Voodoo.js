/**
 * @module socket
 *
 * Real-time with the same ergonomics as the `http` module: patterns in one place,
 * interceptors, reconnection with progressive backoff, and no dependencies.
 * Where `http` has `retry`, here there's `reconnect`; where it has
 * `interceptors.request/response`, here there's `interceptors.outgoing/incoming`.
 *
 * ```js
 * const s = V.socket('wss://exemplo.com')                 // native WebSocket
 * const chat = V.socket('/', { transport: 'socket.io' })  // Socket.IO protocol
 *
 * chat.on('mensagem', (dados) => console.log(dados))
 * chat.emit('entrar', { sala: 'geral' })
 * chat.state       // reactive
 * chat.connected   // reactive
 * chat.close()
 * V.socket.close() // closes all
 * ```
 *
 * ## Two conventions that need to be clear
 *
 * 1. **Events over native WebSocket.** Raw WebSocket has no concept of
 *    named events: it carries text. For `emit`/`on` to work on both
 *    transports, the native transport uses a JSON envelope,
 *    `{"event":"nome","data":...}`, going and coming back. Those talking to a server
 *    that doesn't use this format have `send()` and `on('message')`, which pass
 *    raw content without interpreting any event name.
 * 2. **Heartbeat on native transport.** The `readyState` lies: when the network drops
 *    without FIN, it keeps saying `OPEN` for minutes. So the module sends a
 *    `ping` from time to time and tears down the connection when nothing comes back. The text
 *    of the ping is configurable and `heartbeat: 0` disables it all. In the
 *    Socket.IO transport none of this is used: the server sends the ping, and the
 *    protocol already defines the timings.
 */
/** Possible connection states, in natural cycle order. */
type SocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';
type SocketTransport = 'ws' | 'socket.io';
/** Room lifecycle, from join request to exit. */
type RoomState = 'joining' | 'joined' | 'left';
/**
 * Event listener. The second parameter only appears when the server requested
 * acknowledgment (ack) for that event, and calling it sends the response to the server.
 */
type SocketListener = (data: unknown, ack?: (resposta: unknown) => void) => void;
/** A message coming in or going out, in the format seen by interceptors. */
interface SocketMessage {
    /** Event name. `message` when the message carries no name. */
    event: string;
    /** Message payload. */
    data: unknown;
    /** Socket address, to identify the connection within the interceptor. */
    url: string;
    /** Text exactly as it came from the wire. Absent in outgoing messages. */
    raw?: string;
}
/**
 * Message interceptor. Returning an object modifies the message, returning
 * `null` discards it, and returning nothing keeps the original.
 */
type SocketInterceptor = (message: SocketMessage) => SocketMessage | null | void;
/**
 * Minimum of what the module needs from a WebSocket. Exists so a test double
 * can take the place of the native one via `socket.defaults.WebSocket`, without
 * needing any network.
 */
interface WebSocketLike {
    readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    onopen: ((event?: unknown) => void) | null;
    onclose: ((event?: unknown) => void) | null;
    onerror: ((event?: unknown) => void) | null;
    onmessage: ((event: {
        data: unknown;
    }) => void) | null;
}
type WebSocketCtor = new (url: string, protocols?: string | string[]) => WebSocketLike;
interface SocketOptions {
    /** `ws` uses pure WebSocket. `socket.io` uses the Engine.IO/Socket.IO protocol. */
    transport?: SocketTransport;
    /** Handshake subprotocols, passed to the native constructor. */
    protocols?: string | string[];
    /** Auto-reconnects when connection drops without being closed by `close()`. */
    reconnect?: boolean;
    /** Initial wait before reconnecting, in ms. Doubles with each attempt. */
    reconnectDelay?: number;
    /** Maximum wait between attempts, in ms. */
    reconnectMaxDelay?: number;
    /** Maximum number of attempts. `Infinity` retries forever. */
    reconnectMaxAttempts?: number;
    /** Fraction from 0 to 1 randomized on top of the wait, to prevent client sync. */
    jitter?: number;
    /** Interval between pings on native transport, in ms. `0` disables. */
    heartbeat?: number;
    /** Time without response before considering the connection dead, in ms. */
    heartbeatTimeout?: number;
    /** Text sent as ping. `null` observes silence without sending anything. */
    pingPayload?: string | null;
    /** Text the server returns as pong, ignored in message delivery. */
    pongPayload?: string | null;
    /** How many messages are buffered while the connection isn't open. */
    queueLimit?: number;
    /** Auto-converts JSON, falling back to plain text on parse failure. */
    json?: boolean;
    /** Path of the Engine.IO endpoint. Only for `transport: 'socket.io'`. */
    path?: string;
    /** Socket.IO namespace. This implementation only supports the default. */
    namespace?: string;
    /** Authentication data sent in the Socket.IO CONNECT packet. */
    auth?: Record<string, unknown> | null;
    /** WebSocket implementation used instead of the global one. */
    WebSocket?: WebSocketCtor | null;
    /** Creates the connection closed. `open()` is what opens it. */
    manual?: boolean;
    /** Event sent to the server to request joining a room. */
    joinEvent?: string;
    /** Event sent to the server to request leaving a room. */
    leaveEvent?: string;
    /** Event where the server sends the complete member list for a room. */
    presenceEvent?: string;
    /** Event where the server announces someone joined. */
    memberJoinEvent?: string;
    /** Event where the server announces someone left. */
    memberLeaveEvent?: string;
    /** How many messages each room buffers in `messages`. */
    roomBuffer?: number;
}
/** Configuration of a specific room. */
interface RoomOptions {
    /**
     * Marks the room as private. This is a request, not a guarantee: the server always
     * decides who enters and what's transmitted. See `docs/websocket.md`.
     */
    privada?: boolean;
    /** Same as `privada`, for those writing the API in English. */
    private?: boolean;
    /** How many messages this room buffers. Default `defaults.roomBuffer`. */
    buffer?: number;
}
/**
 * A room (or channel) within a connection.
 *
 * Names exist in Portuguese and English because the directive exposes `$room` in
 * Portuguese in HTML and the programmatic API follows the English of the rest of the module.
 */
interface SocketRoom {
    /** Room name, as requested from the server. */
    readonly name: string;
    /** `true` when the room was requested as private. */
    readonly private: boolean;
    readonly privada: boolean;
    /** Reactive state of the room. */
    readonly state: RoomState;
    readonly estado: RoomState;
    /** Who the server says is in the room. Empty if it sends nothing. */
    readonly members: unknown[];
    readonly membros: unknown[];
    /** Latest messages received in the room, up to the buffer limit. */
    readonly messages: unknown[];
    readonly mensagens: unknown[];
    /** Listen to an event in this room. Returns the function that cancels it. */
    on(event: string, listener: SocketListener): () => void;
    /** Cancel a listener, all of an event, or all of the room. */
    off(event?: string, listener?: SocketListener): void;
    /** Send to all members of the room. */
    emit(event: string, data?: unknown): boolean;
    enviar(event: string, data?: unknown): boolean;
    /** Send only to a recipient within this room. */
    to(destino: string): {
        emit(event: string, data?: unknown): boolean;
    };
    /** Leave the room, clear listeners, and stop rejoining on reconnect. */
    leave(): void;
    sair(): void;
}
/** Real-time connection returned by `V.socket()`. */
interface VoodooSocket {
    /** Final address, already resolved with the transport endpoint. */
    readonly url: string;
    /** Reactive connection state. */
    readonly state: SocketState;
    /** `true` while the connection is open. Reactive. */
    readonly connected: boolean;
    /** How many consecutive reconnection attempts have failed. Reactive. */
    readonly attempts: number;
    /** How many messages are waiting for the connection to open. Reactive. */
    readonly queued: number;
    /** Last error, already as text. Reactive. */
    readonly error: string | null;
    /** WebSocket in use, for advanced cases. `null` while closed. */
    readonly raw: WebSocketLike | null;
    /** Listen to an event. Returns the function that cancels the subscription. */
    on(event: string, listener: SocketListener): () => void;
    /** Listen only to the next occurrence. */
    once(event: string, listener: SocketListener): () => void;
    /** Cancel a listener, all of an event, or all listeners. */
    off(event?: string, listener?: SocketListener): void;
    /** Send a named event. Before opening, enters the queue. */
    emit(event: string, data?: unknown, ack?: (resposta: unknown) => void): boolean;
    /** Send raw payload, without event name. */
    send(data: unknown): boolean;
    /** Open the connection. Used by `manual` and after `close()`. */
    open(): void;
    /** Close intentionally: doesn't reconnect, clears timers, and empties the queue. */
    close(code?: number, reason?: string): void;
    /** Join a room. Calling twice with the same name returns the same room. */
    join(name: string, options?: RoomOptions): SocketRoom;
    /** Leave a room by name. */
    leave(name: string): void;
    /** Rooms this connection is in or joining. */
    readonly rooms: SocketRoom[];
    /** Send directly to a recipient, outside any room. */
    to(destino: string): {
        emit(event: string, data?: unknown): boolean;
    };
}
interface SocketDefaults extends Required<Omit<SocketOptions, 'protocols' | 'auth' | 'WebSocket'>> {
    /** Prefix applied to relative addresses, like the `baseURL` of http. */
    baseURL: string;
    auth: Record<string, unknown> | null;
    WebSocket: WebSocketCtor | null;
}
/** Resolves `/chat` to `ws://host/chat` and `https://x` to `wss://x`. */
declare function resolveSocketURL(url: string, baseURL?: string): string;
/** `true` when some WebSocket implementation is available. */
declare function socketSupported(): boolean;
/**
 * Creates a real-time connection.
 *
 * Without WebSocket in the environment (SSR, or a jsdom without the API), nothing is thrown: returns
 * an inert socket, permanently `closed`, with `error` filled. A page
 * rendered on the server cannot break because of a `v-socket`.
 */
declare function createSocket(url: string, options?: SocketOptions): VoodooSocket;
interface SocketFactory {
    (url: string, options?: SocketOptions): VoodooSocket;
    /** Defaults applied to every new connection, like `http.defaults`. */
    defaults: SocketDefaults;
    /** Message interceptors, in the format of `http.interceptors`. */
    interceptors: {
        incoming: {
            use(fn: SocketInterceptor): () => void;
        };
        outgoing: {
            use(fn: SocketInterceptor): () => void;
        };
    };
    /** Closes all open connections. */
    close(): void;
    /** Active connections right now. */
    readonly open: VoodooSocket[];
    /** `true` when the environment has WebSocket. */
    supported(): boolean;
    /** Switches the WebSocket implementation used by default. Useful in testing. */
    setWebSocket(impl: WebSocketCtor | null): void;
}
declare const socket: SocketFactory;
type Socket = typeof socket;

export { type RoomOptions as R, type SocketMessage as S, type VoodooSocket as V, type WebSocketCtor as W, type RoomState as a, type SocketOptions as b, type SocketRoom as c, type SocketState as d, type SocketTransport as e, createSocket as f, socketSupported as g, type Socket as h, type SocketDefaults as i, type SocketFactory as j, type SocketInterceptor as k, type SocketListener as l, type WebSocketLike as m, resolveSocketURL as r, socket as s };
