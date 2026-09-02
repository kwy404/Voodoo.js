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
 * 42["mensagem",{"texto":"oi"}]                              event
 * 421["salvar",{...}]                                        event requesting ack 1
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

/** Codigos de pacote do Engine.IO v4. */
export const ENGINE = {
  OPEN: '0',
  CLOSE: '1',
  PING: '2',
  PONG: '3',
  MESSAGE: '4',
  UPGRADE: '5',
  NOOP: '6',
} as const;

/** Tipos de pacote do Socket.IO v5 (protocolo do servidor v4). */
export const SIO = {
  CONNECT: 0,
  DISCONNECT: 1,
  EVENT: 2,
  ACK: 3,
  CONNECT_ERROR: 4,
  BINARY_EVENT: 5,
  BINARY_ACK: 6,
} as const;

/** Data the server sends in the open packet. */
export interface EngineHandshake {
  sid: string;
  /** Interval between server pings, in ms. */
  pingInterval: number;
  /** How long the server waits for pong before giving up, in ms. */
  pingTimeout: number;
  upgrades?: string[];
  maxPayload?: number;
}

/** Socket.IO packet already split into its parts. */
export interface SocketIoPacket {
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
export type EnginePacket =
  | { kind: 'open'; handshake: EngineHandshake }
  | { kind: 'close' }
  | { kind: 'ping' }
  | { kind: 'pong' }
  | { kind: 'message'; packet: SocketIoPacket }
  | { kind: 'noop' }
  /** Frame this client can't read: binary, upgrade or garbage. */
  | { kind: 'unknown'; raw: string };

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Broken body can't tear down the entire connection.
    return undefined;
  }
}

/**
 * Reads the body of an Engine.IO `4` (message) packet.
 *
 * The order of parts is fixed and each only appears when it exists, so
 * reading is positional: type, optional namespace ending in comma, optional ack
 * in digits, and the rest is JSON.
 */
export function decodeSocketIo(body: string): SocketIoPacket | null {
  if (!body) return null;
  const type = Number(body[0]);
  if (!Number.isInteger(type) || type < 0 || type > 6) return null;

  let i = 1;
  let namespace = '/';
  if (body[i] === '/') {
    const comma = body.indexOf(',', i);
    if (comma === -1) {
      // `4/admin` without comma is a connect to the namespace, no body.
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, comma);
    i = comma + 1;
  }

  let ack: number | undefined;
  const ackStart = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > ackStart) ack = Number(body.slice(ackStart, i));

  const rest = body.slice(i);
  return { type, namespace, ack, data: parseJson(rest) };
}

/**
 * Classifies a text frame received from the server.
 *
 * Binary frames arrive as `Blob` or `ArrayBuffer` and become `unknown`: they're
 * valid in the protocol, this implementation just doesn't read them.
 */
export function decodeEngine(raw: unknown): EnginePacket {
  if (typeof raw !== 'string' || !raw) return { kind: 'unknown', raw: String(raw ?? '') };

  const code = raw[0];
  const body = raw.slice(1);

  switch (code) {
    case ENGINE.OPEN: {
      const data = parseJson(body) as Partial<EngineHandshake> | undefined;
      return {
        kind: 'open',
        handshake: {
          sid: data?.sid ?? '',
          // Server values take precedence. The defaults here are from Engine.IO
          // v4 and only come into play if the handshake is incomplete.
          pingInterval: Number(data?.pingInterval) || 25_000,
          pingTimeout: Number(data?.pingTimeout) || 20_000,
          upgrades: data?.upgrades,
          maxPayload: data?.maxPayload,
        },
      };
    }
    case ENGINE.CLOSE:
      return { kind: 'close' };
    case ENGINE.PING:
      return { kind: 'ping' };
    case ENGINE.PONG:
      return { kind: 'pong' };
    case ENGINE.MESSAGE: {
      const packet = decodeSocketIo(body);
      return packet ? { kind: 'message', packet } : { kind: 'unknown', raw };
    }
    case ENGINE.NOOP:
      return { kind: 'noop' };
    default:
      return { kind: 'unknown', raw };
  }
}

/**
 * Builds a `4` (message) packet ready for the wire.
 *
 * `encodeSocketIo({ type: SIO.EVENT, data: ['oi', 1] })` returns `42["oi",1]`.
 */
export function encodeSocketIo(packet: SocketIoPacket): string {
  let out = ENGINE.MESSAGE + String(packet.type);
  // The namespace only travels when it's not the default, as the protocol mandates.
  if (packet.namespace && packet.namespace !== '/') out += `${packet.namespace},`;
  if (packet.ack !== undefined) out += String(packet.ack);
  if (packet.data !== undefined) out += JSON.stringify(packet.data);
  return out;
}

/**
 * Builds the Engine.IO endpoint URL.
 *
 * The path becomes `<path>?EIO=4&transport=websocket`, because this implementation
 * opens directly in WebSocket and never uses polling.
 */
export function engineURL(base: string, path = '/socket.io/'): string {
  const pathname = `/${path.replace(/^\/+|\/+$/g, '')}/`;
  const query = 'EIO=4&transport=websocket';
  try {
    const u = new URL(base);
    u.pathname = pathname;
    u.search = query;
    return u.toString();
  } catch {
    // No usable `URL` (relative base in environment without `location`), concatenate.
    return `${base.replace(/\/+$/, '')}${pathname}?${query}`;
  }
}
