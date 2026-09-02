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

import { reactive } from '../reactivity';
import { devtoolsBus } from '../devtools/bus';
import { warnOnce } from '../runtime/avisos';
import {
  decodeEngine,
  encodeSocketIo,
  engineURL,
  ENGINE,
  SIO,
  type EngineHandshake,
} from './protocol';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Possible connection states, in natural cycle order. */
export type SocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';

export type SocketTransport = 'ws' | 'socket.io';

/** Room lifecycle, from join request to exit. */
export type RoomState = 'joining' | 'joined' | 'left';

/**
 * Event listener. The second parameter only appears when the server requested
 * acknowledgment (ack) for that event, and calling it sends the response to the server.
 */
export type SocketListener = (data: unknown, ack?: (resposta: unknown) => void) => void;

/** A message coming in or going out, in the format seen by interceptors. */
export interface SocketMessage {
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
export type SocketInterceptor = (
  message: SocketMessage
) => SocketMessage | null | void;

/**
 * Minimum of what the module needs from a WebSocket. Exists so a test double
 * can take the place of the native one via `socket.defaults.WebSocket`, without
 * needing any network.
 */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((event?: unknown) => void) | null;
  onclose: ((event?: unknown) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export type WebSocketCtor = new (url: string, protocols?: string | string[]) => WebSocketLike;

export interface SocketOptions {
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
export interface RoomOptions {
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
export interface SocketRoom {
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
  to(destino: string): { emit(event: string, data?: unknown): boolean };
  /** Leave the room, clear listeners, and stop rejoining on reconnect. */
  leave(): void;
  sair(): void;
}

/** Real-time connection returned by `V.socket()`. */
export interface VoodooSocket {
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
  to(destino: string): { emit(event: string, data?: unknown): boolean };
}

// ---------------------------------------------------------------------------
// Defaults and interceptors, in the same format as the http module
// ---------------------------------------------------------------------------

export interface SocketDefaults extends Required<Omit<SocketOptions, 'protocols' | 'auth' | 'WebSocket'>> {
  /** Prefix applied to relative addresses, like the `baseURL` of http. */
  baseURL: string;
  auth: Record<string, unknown> | null;
  WebSocket: WebSocketCtor | null;
}

const defaults: SocketDefaults = {
  baseURL: '',
  transport: 'ws',
  reconnect: true,
  reconnectDelay: 500,
  reconnectMaxDelay: 30_000,
  reconnectMaxAttempts: Infinity,
  jitter: 0.3,
  heartbeat: 25_000,
  heartbeatTimeout: 10_000,
  pingPayload: 'ping',
  pongPayload: 'pong',
  queueLimit: 64,
  json: true,
  path: '/socket.io/',
  namespace: '/',
  auth: null,
  WebSocket: null,
  manual: false,
  joinEvent: 'join',
  leaveEvent: 'leave',
  presenceEvent: 'room:members',
  memberJoinEvent: 'room:joined',
  memberLeaveEvent: 'room:left',
  roomBuffer: 50,
};

const incomingInterceptors: SocketInterceptor[] = [];
const outgoingInterceptors: SocketInterceptor[] = [];

function use(list: SocketInterceptor[], fn: SocketInterceptor): () => void {
  list.push(fn);
  return () => {
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
}

/** Runs the interceptor chain. `null` means message is discarded. */
function apply(list: SocketInterceptor[], message: SocketMessage): SocketMessage | null {
  let current: SocketMessage | null = message;
  for (const fn of list) {
    if (!current) return null;
    const result = fn(current);
    if (result === null) return null;
    if (result) current = result;
  }
  return current;
}

/** Active connections, for `V.socket.close()` to tear down all at once. */
const openConnections = new Set<VoodooSocket>();

/**
 * Compares two room members.
 *
 * The server can send `"ana"` or `{ id: "ana", nome: "Ana" }`, and both
 * need to count as the same person when the `id` matches.
 */
function sameMember(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const ida = a && typeof a === 'object' ? (a as { id?: unknown }).id : a;
  const idb = b && typeof b === 'object' ? (b as { id?: unknown }).id : b;
  return ida !== undefined && ida === idb;
}

// ---------------------------------------------------------------------------
// Address
// ---------------------------------------------------------------------------

/** Resolves `/chat` to `ws://host/chat` and `https://x` to `wss://x`. */
export function resolveSocketURL(url: string, baseURL = defaults.baseURL): string {
  let address = url || '/';

  if (baseURL && !/^(wss?|https?):\/\//i.test(address) && !address.startsWith('//')) {
    address = `${baseURL.replace(/\/$/, '')}/${address.replace(/^\//, '')}`;
  }
  if (/^wss?:\/\//i.test(address)) return address;
  if (/^https?:\/\//i.test(address)) return address.replace(/^http/i, 'ws');

  if (typeof location === 'undefined' || !location.host) return address;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}${address.startsWith('/') ? address : `/${address}`}`;
}

/** WebSocket constructor in use, or `null` when the environment doesn't have one. */
function constructor(options: SocketOptions): WebSocketCtor | null {
  const chosen =
    options.WebSocket ??
    defaults.WebSocket ??
    (globalThis as { WebSocket?: WebSocketCtor }).WebSocket;
  return typeof chosen === 'function' ? chosen : null;
}

/** `true` when some WebSocket implementation is available. */
export function socketSupported(): boolean {
  return constructor({}) !== null;
}

// ---------------------------------------------------------------------------
// Creating a connection
// ---------------------------------------------------------------------------

/**
 * Creates a real-time connection.
 *
 * Without WebSocket in the environment (SSR, or a jsdom without the API), nothing is thrown: returns
 * an inert socket, permanently `closed`, with `error` filled. A page
 * rendered on the server cannot break because of a `v-socket`.
 */
export function createSocket(url: string, options: SocketOptions = {}): VoodooSocket {
  const opts = { ...defaults, ...options };
  const Impl = constructor(options);

  const base = resolveSocketURL(url, opts.baseURL);
  const socketIo = opts.transport === 'socket.io';
  const address = socketIo ? engineURL(base, opts.path) : base;

  // Reactivity in its own object, not on the entire socket: this way `on`,
  // `emit` and the rest stay as regular functions, and only what the view reads goes
  // through the proxy. Reading `state.state` inside an effect is what makes
  // `v-show="$socket.connected"` react on its own.
  const state = reactive({
    state: 'closed' as SocketState,
    connected: false,
    attempts: 0,
    queued: 0,
    error: null as string | null,
  });

  const listeners = new Map<string, Set<SocketListener>>();
  const queue: string[] = [];
  const acks = new Map<number, (resposta: unknown) => void>();
  const rooms = new Map<string, InternalRoom>();

  let ws: WebSocketLike | null = null;
  let nextAck = 1;
  let closedPurposefully = false;
  let handshake: EngineHandshake | null = null;
  let openedAt = 0;

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Listeners
  // -------------------------------------------------------------------------

  function on(event: string, listener: SocketListener): () => void {
    let set = listeners.get(event);
    if (!set) listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  function once(event: string, listener: SocketListener): () => void {
    const cancel = on(event, (data, ack) => {
      cancel();
      listener(data, ack);
    });
    return cancel;
  }

  function off(event?: string, listener?: SocketListener): void {
    if (!event) {
      listeners.clear();
      return;
    }
    if (!listener) {
      listeners.delete(event);
      return;
    }
    listeners.get(event)?.delete(listener);
  }

  /** Deliver to listeners of the event and to `message` listeners, always. */
  function deliver(event: string, data: unknown, ack?: (r: unknown) => void): void {
    for (const name of event === 'message' ? [event] : [event, 'message']) {
      const set = listeners.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          // A broken listener never tears down the connection or other listeners.
          // eslint-disable-next-line no-console
          console.error('[Voodoo] error in socket listener:', err);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  function changeState(newState: SocketState): void {
    if (state.state === newState) return;
    state.state = newState;
    state.connected = newState === 'open';
    deliver(`state:${newState}`, newState);
  }

  function registerError(message: string): void {
    state.error = message;
    deliver('error', message);
    devtoolsBus.emit('network', {
      method: 'WS',
      url: address,
      ok: false,
      error: message,
      source: 'socket',
    });
  }

  // -------------------------------------------------------------------------
  // Timers
  // -------------------------------------------------------------------------

  function stopTimers(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (watchdogTimer !== null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  }

  /**
   * Arm the dead connection watchdog.
   *
   * Any frame that arrives restarts the countdown: traffic is better proof of life
   * than any pong. If it times out, the connection is considered dead even though
   * `readyState` swears it's open.
   */
  function armWatchdog(ms: number): void {
    if (watchdogTimer !== null) clearTimeout(watchdogTimer);
    watchdogTimer = null;
    if (!ms || ms <= 0) return;
    watchdogTimer = setTimeout(() => {
      watchdogTimer = null;
      registerError('connection unresponsive');
      tearDown();
    }, ms);
  }

  /** How much silence still counts as an active connection. */
  function silenceWindow(): number {
    if (socketIo) {
      // In Socket.IO the server sends the ping, so the window comes from the
      // handshake: one full interval plus the tolerance it declared.
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opts.heartbeat > 0 ? opts.heartbeat + opts.heartbeatTimeout : 0;
  }

  function markAlive(): void {
    armWatchdog(silenceWindow());
  }

  function startHeartbeat(): void {
    if (socketIo || opts.heartbeat <= 0) return;
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (opts.pingPayload == null) return;
      sendText(opts.pingPayload);
    }, opts.heartbeat);
  }

  // -------------------------------------------------------------------------
  // Reconnection
  // -------------------------------------------------------------------------

  /**
   * Progressive backoff with jitter.
   *
   * The classic mistake here is reconnecting in a loop: a thousand tabs drop together, all
   * come back in the same millisecond and crash the server again. Wait time doubles
   * with each attempt up to the cap, and jitter spreads tabs across the window.
   */
  function attemptDelay(n: number): number {
    const raw = opts.reconnectDelay * 2 ** Math.max(0, n - 1);
    const cap = Math.min(raw, opts.reconnectMaxDelay);
    const deviation = cap * Math.min(Math.max(opts.jitter, 0), 1);
    return Math.max(0, Math.round(cap - deviation + Math.random() * deviation * 2));
  }

  function scheduleReconnect(): void {
    if (closedPurposefully || !opts.reconnect) {
      changeState('closed');
      return;
    }
    if (state.attempts >= opts.reconnectMaxAttempts) {
      registerError(`reconnection gave up after ${state.attempts} attempts`);
      changeState('closed');
      return;
    }

    state.attempts += 1;
    changeState('reconnecting');
    const delay = attemptDelay(state.attempts);
    deliver('reconnecting', { attempt: state.attempts, delay });

    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      // A `close()` during the wait cancels the attempt: closing on purpose
      // needs to stop completely, not just skip one round.
      if (closedPurposefully) return;
      connect();
    }, delay);
  }

  // -------------------------------------------------------------------------
  // Send queue
  // -------------------------------------------------------------------------

  /**
   * Stores a message until the connection opens.
   *
   * The queue has a cap because a connection that never opens would turn `emit` into
   * a silent leak. When full, the oldest goes out: in real-time new data
   * is worth more than old.
   */
  function enqueue(text: string): void {
    if (opts.queueLimit <= 0) return;
    if (queue.length >= opts.queueLimit) {
      queue.shift();
      warnOnce(
        `socket-queue:${address}`,
        `The send queue for ${address} reached the limit of ${opts.queueLimit} messages and started discarding the oldest. Increase "queueLimit" or send less while the connection is closed.`
      );
    }
    queue.push(text);
    state.queued = queue.length;
  }

  function drainQueue(): void {
    if (!queue.length) return;
    const pending = queue.splice(0, queue.length);
    state.queued = 0;
    for (const text of pending) sendText(text);
  }

  /** Write to the wire, or enqueue if not ready yet. */
  function sendText(text: string): boolean {
    // `readyState === 1` is OPEN in any WebSocket implementation.
    if (ws && ws.readyState === 1 && (!socketIo || state.connected)) {
      try {
        ws.send(text);
        return true;
      } catch (err) {
        registerError((err as Error)?.message ?? 'send failed');
        return false;
      }
    }
    enqueue(text);
    return false;
  }

  // -------------------------------------------------------------------------
  // Sending with event name
  // -------------------------------------------------------------------------

  function emit(event: string, data?: unknown, ack?: (resposta: unknown) => void): boolean {
    const message = apply(outgoingInterceptors, { event, data, url: address });
    if (!message) return false;

    devtoolsBus.emit('event', {
      type: `socket:${message.event}`,
      detail: message.data,
      source: 'socket:out',
    });

    if (socketIo) {
      let num: number | undefined;
      if (ack) {
        num = nextAck++;
        acks.set(num, ack);
      }
      const args =
        message.data === undefined ? [message.event] : [message.event, message.data];
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          ack: num,
          data: args,
        })
      );
    }

    // Native transport: the `{event,data}` envelope is the module convention.
    return sendText(
      opts.json
        ? JSON.stringify({ event: message.event, data: message.data })
        : String(message.data ?? message.event)
    );
  }

  function send(data: unknown): boolean {
    const message = apply(outgoingInterceptors, { event: 'message', data, url: address });
    if (!message) return false;

    const payload = message.data;
    const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (socketIo) {
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          data: ['message', payload],
        })
      );
    }
    return sendText(text);
  }

  // -------------------------------------------------------------------------
  // Reception
  // -------------------------------------------------------------------------

  /** Passes through incoming interceptors and delivers to listeners. */
  function receive(event: string, data: unknown, raw?: string, ack?: (r: unknown) => void): void {
    const message = apply(incomingInterceptors, {
      event,
      data,
      url: address,
      raw,
    });
    if (!message) return;

    devtoolsBus.emit('event', {
      type: `socket:${message.event}`,
      detail: message.data,
      source: 'socket:in',
    });

    // Room presence and messages are routed before common delivery. Socket
    // listeners still see everything: a room is a slice, not a redirect.
    routePresence(message.event, message.data);
    routeRoom(message.event, message.data, ack);

    deliver(message.event, message.data, ack);
  }

  // -------------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------------

  interface InternalRoom {
    public: SocketRoom;
    /** Reactive state read by HTML. */
    state: { state: RoomState; members: unknown[]; messages: unknown[] };
    listeners: Map<string, Set<SocketListener>>;
    private: boolean;
    buffer: number;
  }

  /** Reads the room name from a payload, accepting both languages. */
  function roomName(data: unknown): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const obj = data as Record<string, unknown>;
    const name = obj.room ?? obj.sala;
    return typeof name === 'string' && name ? name : null;
  }

  /** Strips the room envelope and returns only what the server meant to send. */
  function roomPayload(data: unknown): unknown {
    const obj = data as Record<string, unknown>;
    if ('data' in obj) return obj.data;
    if ('dados' in obj) return obj.dados;
    return obj;
  }

  function deliverInRoom(room: InternalRoom, event: string, data: unknown, ack?: (r: unknown) => void): void {
    for (const name of event === 'message' ? [event] : [event, 'message']) {
      const set = room.listeners.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Voodoo] error in room listener:', err);
        }
      }
    }
  }

  function routeRoom(event: string, data: unknown, ack?: (r: unknown) => void): void {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;

    // Presence events are already handled and don't become room messages.
    if (
      event === opts.presenceEvent ||
      event === opts.memberJoinEvent ||
      event === opts.memberLeaveEvent
    ) {
      return;
    }

    const payload = roomPayload(data);
    room.state.messages.push(payload);
    // Capped buffer: a busy room can't become a slow leak.
    if (room.state.messages.length > room.buffer) {
      room.state.messages.splice(0, room.state.messages.length - room.buffer);
    }
    deliverInRoom(room, event, payload, ack);
  }

  /**
   * Presence comes entire from the server.
   *
   * The client can't know who's in a room: it only sees its own
   * socket. So if the server sends nothing, `members` stays empty. Making up
   * presence on the client would give a nice but false list.
   */
  function routePresence(event: string, data: unknown): void {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;
    const obj = data as Record<string, unknown>;

    if (event === opts.presenceEvent) {
      const list = obj.members ?? obj.membros;
      if (Array.isArray(list)) room.state.members = [...list];
      return;
    }

    const member = obj.member ?? obj.membro ?? obj.id;
    if (member === undefined) return;

    if (event === opts.memberJoinEvent) {
      if (!room.state.members.some((m) => sameMember(m, member))) {
        room.state.members.push(member);
      }
      deliverInRoom(room, 'entrou', member);
      return;
    }
    if (event === opts.memberLeaveEvent) {
      const i = room.state.members.findIndex((m) => sameMember(m, member));
      if (i > -1) room.state.members.splice(i, 1);
      deliverInRoom(room, 'saiu', member);
    }
  }

  /** Asks the server to join the room. Redone on each reconnect. */
  function requestJoin(room: InternalRoom, name: string): void {
    room.state.state = 'joining';
    emit(opts.joinEvent, { room: name, private: room.private });
  }

  /**
   * Rejoin all rooms after the connection comes back.
   *
   * This is the detail almost every implementation forgets: the socket reconnects,
   * the interface shows "online" again and the user stays out of the rooms,
   * not receiving anything. Rejoining here is what closes that gap.
   */
  function rejoinRooms(): void {
    for (const [name, room] of rooms) {
      if (room.state.state === 'left') continue;
      requestJoin(room, name);
    }
  }

  function join(name: string, config: RoomOptions = {}): SocketRoom {
    // Intentionally idempotent: joining twice with the same name returns the same
    // object, without duplicating listeners or requesting entry again.
    const existing = rooms.get(name);
    if (existing && existing.state.state !== 'left') return existing.public;

    const isPrivate = config.privada ?? config.private ?? false;
    const roomState = reactive({
      state: 'joining' as RoomState,
      members: [] as unknown[],
      messages: [] as unknown[],
    });

    const roomListeners = new Map<string, Set<SocketListener>>();

    const sendInRoom = (event: string, data?: unknown, target?: string): boolean =>
      emit(event, target ? { room: name, to: target, data } : { room: name, data });

    const public_: SocketRoom = {
      get name() {
        return name;
      },
      get private() {
        return isPrivate;
      },
      get privada() {
        return isPrivate;
      },
      get state() {
        return roomState.state;
      },
      get estado() {
        return roomState.state;
      },
      get members() {
        return roomState.members;
      },
      get membros() {
        return roomState.members;
      },
      get messages() {
        return roomState.messages;
      },
      get mensagens() {
        return roomState.messages;
      },
      on(event, listener) {
        let set = roomListeners.get(event);
        if (!set) roomListeners.set(event, (set = new Set()));
        set.add(listener);
        return () => {
          set?.delete(listener);
        };
      },
      off(event, listener) {
        if (!event) roomListeners.clear();
        else if (!listener) roomListeners.delete(event);
        else roomListeners.get(event)?.delete(listener);
      },
      emit: (event, data) => sendInRoom(event, data),
      enviar: (event, data) => sendInRoom(event, data),
      to: (target: string) => ({
        emit: (event: string, data?: unknown) => sendInRoom(event, data, target),
      }),
      leave: () => leave(name),
      sair: () => leave(name),
    };

    const internal: InternalRoom = {
      public: public_,
      state: roomState,
      listeners: roomListeners,
      private: isPrivate,
      buffer: config.buffer ?? opts.roomBuffer,
    };
    rooms.set(name, internal);

    // Without open connection the request enters the queue and exits when it opens.
    requestJoin(internal, name);
    if (state.connected) roomState.state = 'joined';
    return public_;
  }

  function leave(name: string): void {
    const room = rooms.get(name);
    if (!room) return;
    rooms.delete(name);
    room.state.state = 'left';
    room.listeners.clear();
    room.state.members = [];
    if (state.connected) emit(opts.leaveEvent, { room: name });
  }

  function to(target: string): { emit(event: string, data?: unknown): boolean } {
    return {
      emit: (event: string, data?: unknown) => emit(event, { to: target, data }),
    };
  }

  /**
   * Reads a message from native transport.
   *
   * Automatic JSON with fallback to plain text, like `responseType: 'auto'`
   * in http: what looks like JSON is converted, everything else stays text.
   */
  function receiveNative(raw: unknown): void {
    if (typeof raw !== 'string') {
      receive('message', raw);
      return;
    }
    // The heartbeat pong is conversation between module and server, not an event.
    if (opts.pongPayload != null && raw === opts.pongPayload) return;

    let payload: unknown = raw;
    if (opts.json) {
      const start = raw.trimStart()[0];
      if (start === '{' || start === '[') {
        try {
          payload = JSON.parse(raw);
        } catch {
          // Broken JSON still counts as text, without breaking anything.
        }
      }
    }

    // `{event,data}` envelope: name becomes event, rest becomes payload.
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const obj = payload as Record<string, unknown>;
      const name = obj.event ?? obj.type;
      if (typeof name === 'string' && name) {
        receive(name, 'data' in obj ? obj.data : obj, raw);
        return;
      }
    }
    receive('message', payload, raw);
  }

  /** Reads a frame from Socket.IO transport. */
  function receiveSocketIo(raw: unknown): void {
    const packet = decodeEngine(raw);

    switch (packet.kind) {
      case 'open':
        handshake = packet.handshake;
        // Handshake complete: now enter the namespace. Only after CONNECT
        // accepted does the connection count as open.
        sendHandshakeConnect();
        markAlive();
        return;

      case 'ping':
        // Server is asking. Responding is mandatory: without pong it disconnects.
        ws?.send(ENGINE.PONG);
        markAlive();
        return;

      case 'pong':
      case 'noop':
        markAlive();
        return;

      case 'close':
        // Disconnection requested by server. Reconnecting still counts.
        tearDown();
        return;

      case 'message':
        break;

      default:
        // Binary or unknown frame: counts as a sign of life and nothing more.
        markAlive();
        warnOnce(
          `socket-frame:${address}`,
          `The server sent a frame this Socket.IO client cannot read (binary or upgrade). Binary attachments are not implemented; send data as JSON or base64.`
        );
        return;
    }

    const { packet: socketPacket } = packet;

    switch (socketPacket.type) {
      case SIO.CONNECT:
        confirmOpen();
        return;

      case SIO.CONNECT_ERROR: {
        const data = socketPacket.data as { message?: string } | undefined;
        registerError(data?.message ?? 'connection refused by server');
        // Handshake refusal doesn't resolve by retrying fast: tear down and let
        // progressive backoff handle the pace.
        tearDown();
        return;
      }

      case SIO.DISCONNECT:
        tearDown();
        return;

      case SIO.ACK: {
        const response = Array.isArray(socketPacket.data) ? socketPacket.data[0] : socketPacket.data;
        if (socketPacket.ack !== undefined) {
          const callback = acks.get(socketPacket.ack);
          acks.delete(socketPacket.ack);
          callback?.(response);
        }
        return;
      }

      case SIO.EVENT: {
        const args = Array.isArray(socketPacket.data) ? socketPacket.data : [];
        const name = typeof args[0] === 'string' ? (args[0] as string) : 'message';
        const payload = args.length > 2 ? args.slice(1) : args[1];

        // Event that requests confirmation: the listener gets the response function.
        let responder: ((r: unknown) => void) | undefined;
        if (socketPacket.ack !== undefined) {
          const num = socketPacket.ack;
          responder = (response: unknown) => {
            sendText(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opts.namespace,
                ack: num,
                data: [response],
              })
            );
          };
        }
        receive(name, payload, typeof raw === 'string' ? raw : undefined, responder);
        return;
      }

      default:
        warnOnce(
          `socket-packet:${address}`,
          `Socket.IO packet type ${socketPacket.type} ignored: binary attachments are not implemented in this client.`
        );
    }
  }

  function sendHandshakeConnect(): void {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opts.namespace,
        data: options.auth ?? defaults.auth ?? undefined,
      })
    );
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  /** Marks the connection as truly ready and drains what was waiting. */
  function confirmOpen(): void {
    state.attempts = 0;
    state.error = null;
    openedAt = Date.now();
    changeState('open');
    startHeartbeat();
    markAlive();
    // Order matters: rejoin before drain puts the room request ahead of waiting
    // messages, so they arrive in the right room instead of hitting a connection
    // still outside of it.
    rejoinRooms();
    drainQueue();
    for (const room of rooms.values()) {
      if (room.state.state === 'joining') room.state.state = 'joined';
    }
    deliver('open', { url: address });
    devtoolsBus.emit('network', {
      method: 'WS',
      url: address,
      status: 101,
      ok: true,
      source: 'socket',
    });
  }

  /** Releases the current WebSocket without leaving any callbacks dangling. */
  function releaseWs(): WebSocketLike | null {
    const prev = ws;
    if (prev) {
      prev.onopen = null;
      prev.onclose = null;
      prev.onerror = null;
      prev.onmessage = null;
    }
    ws = null;
    return prev;
  }

  /**
   * Tears down the current connection and decides whether to reconnect.
   *
   * Used both by dead-connection detection and server-requested shutdown: in both cases
   * the native `onclose` might never arrive.
   */
  function tearDown(): void {
    const prev = releaseWs();
    handshake = null;
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (watchdogTimer !== null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    state.connected = false;
    try {
      prev?.close();
    } catch {
      // Closing an already-dead socket can throw. Doesn't matter.
    }
    deliver('close', { url: address });
    scheduleReconnect();
  }

  function connect(): void {
    if (!Impl) return;
    if (ws) return;

    changeState(state.attempts > 0 ? 'reconnecting' : 'connecting');

    let newWs: WebSocketLike;
    try {
      newWs = new Impl(address, opts.protocols);
    } catch (err) {
      registerError((err as Error)?.message ?? 'failed to open connection');
      scheduleReconnect();
      return;
    }
    ws = newWs;

    newWs.onopen = () => {
      if (ws !== newWs) return;
      // In Socket.IO, TCP opening is just the start: the logical connection only exists
      // after the Engine.IO handshake and accepted CONNECT.
      if (socketIo) markAlive();
      else confirmOpen();
    };

    newWs.onmessage = (event) => {
      if (ws !== newWs) return;
      markAlive();
      if (socketIo) receiveSocketIo(event?.data);
      else receiveNative(event?.data);
    };

    newWs.onerror = () => {
      if (ws !== newWs) return;
      // The WebSocket error event carries no reason, by spec decision.
      registerError('connection failed');
    };

    newWs.onclose = (event) => {
      if (ws !== newWs) return;
      releaseWs();
      handshake = null;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      state.connected = false;
      const detail = event as { code?: number; reason?: string } | undefined;
      deliver('close', { url: address, code: detail?.code, reason: detail?.reason });
      devtoolsBus.emit('network', {
        method: 'WS',
        url: address,
        status: detail?.code,
        ok: true,
        duration: openedAt ? Date.now() - openedAt : undefined,
        source: 'socket',
      });
      scheduleReconnect();
    };
  }

  function openConnection(): void {
    closedPurposefully = false;
    if (!Impl) return;
    openConnections.add(instance);
    if (ws || reconnectTimer !== null) return;
    connect();
  }

  function closeConnection(code?: number, reason?: string): void {
    // From here on nothing reconnects. This is the only way to stop completely.
    closedPurposefully = true;
    stopTimers();
    changeState('closing');

    const prev = releaseWs();
    handshake = null;
    acks.clear();
    queue.length = 0;
    state.queued = 0;
    state.attempts = 0;
    // Closing on purpose tears down rooms too: no room listener
    // survives the connection that fed it.
    for (const [name, room] of rooms) {
      room.state.state = 'left';
      room.listeners.clear();
      room.state.members = [];
      rooms.delete(name);
    }
    try {
      prev?.close(code, reason);
    } catch {
      // Same: closing twice is not the caller's problem.
    }
    openConnections.delete(instance);
    changeState('closed');
    deliver('close', { url: address, code, reason });
  }

  const instance: VoodooSocket = {
    get url() {
      return address;
    },
    get state() {
      return state.state;
    },
    get connected() {
      return state.connected;
    },
    get attempts() {
      return state.attempts;
    },
    get queued() {
      return state.queued;
    },
    get error() {
      return state.error;
    },
    get raw() {
      return ws;
    },
    get rooms() {
      return [...rooms.values()].map((r) => r.public);
    },
    on,
    once,
    off,
    emit,
    send,
    open: openConnection,
    close: closeConnection,
    join,
    leave,
    to,
  };

  if (!Impl) {
    // Environment without WebSocket: the socket exists, never opens, never throws.
    state.error = 'WebSocket unavailable in this environment';
    return instance;
  }

  if (!opts.manual) openConnection();
  else openConnections.add(instance);
  return instance;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SocketFactory {
  (url: string, options?: SocketOptions): VoodooSocket;
  /** Defaults applied to every new connection, like `http.defaults`. */
  defaults: SocketDefaults;
  /** Message interceptors, in the format of `http.interceptors`. */
  interceptors: {
    incoming: { use(fn: SocketInterceptor): () => void };
    outgoing: { use(fn: SocketInterceptor): () => void };
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

const factory = ((url: string, options: SocketOptions = {}): VoodooSocket =>
  createSocket(url, options)) as SocketFactory;

Object.assign(factory, {
  defaults,
  interceptors: {
    incoming: { use: (fn: SocketInterceptor) => use(incomingInterceptors, fn) },
    outgoing: { use: (fn: SocketInterceptor) => use(outgoingInterceptors, fn) },
  },
  close(): void {
    for (const s of [...openConnections]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl: WebSocketCtor | null): void {
    defaults.WebSocket = impl;
  },
});

// `open` needs to stay a getter, not a value. `Object.assign` copies the
// result of a getter, not the getter itself: in the object above the list would come out
// frozen and empty forever.
Object.defineProperty(factory, 'open', {
  get: () => [...openConnections],
  enumerable: true,
});

export const socket: SocketFactory = factory;

export type Socket = typeof socket;
export { decodeEngine, decodeSocketIo, encodeSocketIo, engineURL, ENGINE, SIO } from './protocol';
export type { EngineHandshake, EnginePacket, SocketIoPacket } from './protocol';
