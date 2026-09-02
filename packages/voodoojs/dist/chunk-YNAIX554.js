import { reactive } from './chunk-3MG773JD.js';
import { warnOnce } from './chunk-3DK5HG37.js';

/**
 * Voodoo.js v0.4.2
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/devtools/bus.ts
var listeners = /* @__PURE__ */ new Map();
var devtoolsBus = {
  /** Publishes an event. With no listeners, the call is practically free. */
  emit(type, data) {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        listener(data);
      } catch (err) {
        console.error("[Voodoo] error in devtools listener:", err);
      }
    }
  },
  /** Subscribes to an event type. Returns the function that unsubscribes. */
  on(type, callback) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, set = /* @__PURE__ */ new Set());
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  },
  /** Cancels a specific subscription. */
  off(type, callback) {
    listeners.get(type)?.delete(callback);
  },
  /** Removes all listeners of a type or all listeners. */
  clear(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
  /** Number of listeners registered for a type. */
  count(type) {
    return listeners.get(type)?.size ?? 0;
  }
};

// src/socket/protocol.ts
var ENGINE = {
  OPEN: "0",
  CLOSE: "1",
  PING: "2",
  PONG: "3",
  MESSAGE: "4",
  UPGRADE: "5",
  NOOP: "6"
};
var SIO = {
  CONNECT: 0,
  DISCONNECT: 1,
  EVENT: 2,
  ACK: 3,
  CONNECT_ERROR: 4,
  BINARY_EVENT: 5,
  BINARY_ACK: 6
};
function parseJson(text) {
  if (!text) return void 0;
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function decodeSocketIo(body) {
  if (!body) return null;
  const type = Number(body[0]);
  if (!Number.isInteger(type) || type < 0 || type > 6) return null;
  let i = 1;
  let namespace = "/";
  if (body[i] === "/") {
    const comma = body.indexOf(",", i);
    if (comma === -1) {
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, comma);
    i = comma + 1;
  }
  let ack;
  const ackStart = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > ackStart) ack = Number(body.slice(ackStart, i));
  const rest = body.slice(i);
  return { type, namespace, ack, data: parseJson(rest) };
}
function decodeEngine(raw) {
  if (typeof raw !== "string" || !raw) return { kind: "unknown", raw: String(raw ?? "") };
  const code = raw[0];
  const body = raw.slice(1);
  switch (code) {
    case ENGINE.OPEN: {
      const data = parseJson(body);
      return {
        kind: "open",
        handshake: {
          sid: data?.sid ?? "",
          // Server values take precedence. The defaults here are from Engine.IO
          // v4 and only come into play if the handshake is incomplete.
          pingInterval: Number(data?.pingInterval) || 25e3,
          pingTimeout: Number(data?.pingTimeout) || 2e4,
          upgrades: data?.upgrades,
          maxPayload: data?.maxPayload
        }
      };
    }
    case ENGINE.CLOSE:
      return { kind: "close" };
    case ENGINE.PING:
      return { kind: "ping" };
    case ENGINE.PONG:
      return { kind: "pong" };
    case ENGINE.MESSAGE: {
      const packet = decodeSocketIo(body);
      return packet ? { kind: "message", packet } : { kind: "unknown", raw };
    }
    case ENGINE.NOOP:
      return { kind: "noop" };
    default:
      return { kind: "unknown", raw };
  }
}
function encodeSocketIo(packet) {
  let out = ENGINE.MESSAGE + String(packet.type);
  if (packet.namespace && packet.namespace !== "/") out += `${packet.namespace},`;
  if (packet.ack !== void 0) out += String(packet.ack);
  if (packet.data !== void 0) out += JSON.stringify(packet.data);
  return out;
}
function engineURL(base, path = "/socket.io/") {
  const pathname = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const query = "EIO=4&transport=websocket";
  try {
    const u = new URL(base);
    u.pathname = pathname;
    u.search = query;
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}${pathname}?${query}`;
  }
}

// src/socket/index.ts
var defaults = {
  baseURL: "",
  transport: "ws",
  reconnect: true,
  reconnectDelay: 500,
  reconnectMaxDelay: 3e4,
  reconnectMaxAttempts: Infinity,
  jitter: 0.3,
  heartbeat: 25e3,
  heartbeatTimeout: 1e4,
  pingPayload: "ping",
  pongPayload: "pong",
  queueLimit: 64,
  json: true,
  path: "/socket.io/",
  namespace: "/",
  auth: null,
  WebSocket: null,
  manual: false,
  joinEvent: "join",
  leaveEvent: "leave",
  presenceEvent: "room:members",
  memberJoinEvent: "room:joined",
  memberLeaveEvent: "room:left",
  roomBuffer: 50
};
var incomingInterceptors = [];
var outgoingInterceptors = [];
function use(list, fn) {
  list.push(fn);
  return () => {
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
}
function apply(list, message) {
  let current = message;
  for (const fn of list) {
    if (!current) return null;
    const result = fn(current);
    if (result === null) return null;
    if (result) current = result;
  }
  return current;
}
var openConnections = /* @__PURE__ */ new Set();
function sameMember(a, b) {
  if (a === b) return true;
  const ida = a && typeof a === "object" ? a.id : a;
  const idb = b && typeof b === "object" ? b.id : b;
  return ida !== void 0 && ida === idb;
}
function resolveSocketURL(url, baseURL = defaults.baseURL) {
  let address = url || "/";
  if (baseURL && !/^(wss?|https?):\/\//i.test(address) && !address.startsWith("//")) {
    address = `${baseURL.replace(/\/$/, "")}/${address.replace(/^\//, "")}`;
  }
  if (/^wss?:\/\//i.test(address)) return address;
  if (/^https?:\/\//i.test(address)) return address.replace(/^http/i, "ws");
  if (typeof location === "undefined" || !location.host) return address;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${address.startsWith("/") ? address : `/${address}`}`;
}
function constructor(options) {
  const chosen = options.WebSocket ?? defaults.WebSocket ?? globalThis.WebSocket;
  return typeof chosen === "function" ? chosen : null;
}
function socketSupported() {
  return constructor({}) !== null;
}
function createSocket(url, options = {}) {
  const opts = { ...defaults, ...options };
  const Impl = constructor(options);
  const base = resolveSocketURL(url, opts.baseURL);
  const socketIo = opts.transport === "socket.io";
  const address = socketIo ? engineURL(base, opts.path) : base;
  const state = reactive({
    state: "closed",
    connected: false,
    attempts: 0,
    queued: 0,
    error: null
  });
  const listeners2 = /* @__PURE__ */ new Map();
  const queue = [];
  const acks = /* @__PURE__ */ new Map();
  const rooms = /* @__PURE__ */ new Map();
  let ws = null;
  let nextAck = 1;
  let closedPurposefully = false;
  let handshake = null;
  let openedAt = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let watchdogTimer = null;
  function on(event, listener) {
    let set = listeners2.get(event);
    if (!set) listeners2.set(event, set = /* @__PURE__ */ new Set());
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }
  function once(event, listener) {
    const cancel = on(event, (data, ack) => {
      cancel();
      listener(data, ack);
    });
    return cancel;
  }
  function off(event, listener) {
    if (!event) {
      listeners2.clear();
      return;
    }
    if (!listener) {
      listeners2.delete(event);
      return;
    }
    listeners2.get(event)?.delete(listener);
  }
  function deliver(event, data, ack) {
    for (const name of event === "message" ? [event] : [event, "message"]) {
      const set = listeners2.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          console.error("[Voodoo] error in socket listener:", err);
        }
      }
    }
  }
  function changeState(newState) {
    if (state.state === newState) return;
    state.state = newState;
    state.connected = newState === "open";
    deliver(`state:${newState}`, newState);
  }
  function registerError(message) {
    state.error = message;
    deliver("error", message);
    devtoolsBus.emit("network", {
      method: "WS",
      url: address,
      ok: false,
      error: message,
      source: "socket"
    });
  }
  function stopTimers() {
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
  function armWatchdog(ms) {
    if (watchdogTimer !== null) clearTimeout(watchdogTimer);
    watchdogTimer = null;
    if (!ms || ms <= 0) return;
    watchdogTimer = setTimeout(() => {
      watchdogTimer = null;
      registerError("connection unresponsive");
      tearDown();
    }, ms);
  }
  function silenceWindow() {
    if (socketIo) {
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opts.heartbeat > 0 ? opts.heartbeat + opts.heartbeatTimeout : 0;
  }
  function markAlive() {
    armWatchdog(silenceWindow());
  }
  function startHeartbeat() {
    if (socketIo || opts.heartbeat <= 0) return;
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (opts.pingPayload == null) return;
      sendText(opts.pingPayload);
    }, opts.heartbeat);
  }
  function attemptDelay(n) {
    const raw = opts.reconnectDelay * 2 ** Math.max(0, n - 1);
    const cap = Math.min(raw, opts.reconnectMaxDelay);
    const deviation = cap * Math.min(Math.max(opts.jitter, 0), 1);
    return Math.max(0, Math.round(cap - deviation + Math.random() * deviation * 2));
  }
  function scheduleReconnect() {
    if (closedPurposefully || !opts.reconnect) {
      changeState("closed");
      return;
    }
    if (state.attempts >= opts.reconnectMaxAttempts) {
      registerError(`reconnection gave up after ${state.attempts} attempts`);
      changeState("closed");
      return;
    }
    state.attempts += 1;
    changeState("reconnecting");
    const delay = attemptDelay(state.attempts);
    deliver("reconnecting", { attempt: state.attempts, delay });
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (closedPurposefully) return;
      connect();
    }, delay);
  }
  function enqueue(text) {
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
  function drainQueue() {
    if (!queue.length) return;
    const pending = queue.splice(0, queue.length);
    state.queued = 0;
    for (const text of pending) sendText(text);
  }
  function sendText(text) {
    if (ws && ws.readyState === 1 && (!socketIo || state.connected)) {
      try {
        ws.send(text);
        return true;
      } catch (err) {
        registerError(err?.message ?? "send failed");
        return false;
      }
    }
    enqueue(text);
    return false;
  }
  function emit(event, data, ack) {
    const message = apply(outgoingInterceptors, { event, data, url: address });
    if (!message) return false;
    devtoolsBus.emit("event", {
      type: `socket:${message.event}`,
      detail: message.data,
      source: "socket:out"
    });
    if (socketIo) {
      let num;
      if (ack) {
        num = nextAck++;
        acks.set(num, ack);
      }
      const args = message.data === void 0 ? [message.event] : [message.event, message.data];
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          ack: num,
          data: args
        })
      );
    }
    return sendText(
      opts.json ? JSON.stringify({ event: message.event, data: message.data }) : String(message.data ?? message.event)
    );
  }
  function send(data) {
    const message = apply(outgoingInterceptors, { event: "message", data, url: address });
    if (!message) return false;
    const payload = message.data;
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (socketIo) {
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          data: ["message", payload]
        })
      );
    }
    return sendText(text);
  }
  function receive(event, data, raw, ack) {
    const message = apply(incomingInterceptors, {
      event,
      data,
      url: address,
      raw
    });
    if (!message) return;
    devtoolsBus.emit("event", {
      type: `socket:${message.event}`,
      detail: message.data,
      source: "socket:in"
    });
    routePresence(message.event, message.data);
    routeRoom(message.event, message.data, ack);
    deliver(message.event, message.data, ack);
  }
  function roomName(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const obj = data;
    const name = obj.room ?? obj.sala;
    return typeof name === "string" && name ? name : null;
  }
  function roomPayload(data) {
    const obj = data;
    if ("data" in obj) return obj.data;
    if ("dados" in obj) return obj.dados;
    return obj;
  }
  function deliverInRoom(room, event, data, ack) {
    for (const name of event === "message" ? [event] : [event, "message"]) {
      const set = room.listeners.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          console.error("[Voodoo] error in room listener:", err);
        }
      }
    }
  }
  function routeRoom(event, data, ack) {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;
    if (event === opts.presenceEvent || event === opts.memberJoinEvent || event === opts.memberLeaveEvent) {
      return;
    }
    const payload = roomPayload(data);
    room.state.messages.push(payload);
    if (room.state.messages.length > room.buffer) {
      room.state.messages.splice(0, room.state.messages.length - room.buffer);
    }
    deliverInRoom(room, event, payload, ack);
  }
  function routePresence(event, data) {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;
    const obj = data;
    if (event === opts.presenceEvent) {
      const list = obj.members ?? obj.membros;
      if (Array.isArray(list)) room.state.members = [...list];
      return;
    }
    const member = obj.member ?? obj.membro ?? obj.id;
    if (member === void 0) return;
    if (event === opts.memberJoinEvent) {
      if (!room.state.members.some((m) => sameMember(m, member))) {
        room.state.members.push(member);
      }
      deliverInRoom(room, "entrou", member);
      return;
    }
    if (event === opts.memberLeaveEvent) {
      const i = room.state.members.findIndex((m) => sameMember(m, member));
      if (i > -1) room.state.members.splice(i, 1);
      deliverInRoom(room, "saiu", member);
    }
  }
  function requestJoin(room, name) {
    room.state.state = "joining";
    emit(opts.joinEvent, { room: name, private: room.private });
  }
  function rejoinRooms() {
    for (const [name, room] of rooms) {
      if (room.state.state === "left") continue;
      requestJoin(room, name);
    }
  }
  function join(name, config = {}) {
    const existing = rooms.get(name);
    if (existing && existing.state.state !== "left") return existing.public;
    const isPrivate = config.privada ?? config.private ?? false;
    const roomState = reactive({
      state: "joining",
      members: [],
      messages: []
    });
    const roomListeners = /* @__PURE__ */ new Map();
    const sendInRoom = (event, data, target) => emit(event, target ? { room: name, to: target, data } : { room: name, data });
    const public_ = {
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
        if (!set) roomListeners.set(event, set = /* @__PURE__ */ new Set());
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
      to: (target) => ({
        emit: (event, data) => sendInRoom(event, data, target)
      }),
      leave: () => leave(name),
      sair: () => leave(name)
    };
    const internal = {
      public: public_,
      state: roomState,
      listeners: roomListeners,
      private: isPrivate,
      buffer: config.buffer ?? opts.roomBuffer
    };
    rooms.set(name, internal);
    requestJoin(internal, name);
    if (state.connected) roomState.state = "joined";
    return public_;
  }
  function leave(name) {
    const room = rooms.get(name);
    if (!room) return;
    rooms.delete(name);
    room.state.state = "left";
    room.listeners.clear();
    room.state.members = [];
    if (state.connected) emit(opts.leaveEvent, { room: name });
  }
  function to(target) {
    return {
      emit: (event, data) => emit(event, { to: target, data })
    };
  }
  function receiveNative(raw) {
    if (typeof raw !== "string") {
      receive("message", raw);
      return;
    }
    if (opts.pongPayload != null && raw === opts.pongPayload) return;
    let payload = raw;
    if (opts.json) {
      const start = raw.trimStart()[0];
      if (start === "{" || start === "[") {
        try {
          payload = JSON.parse(raw);
        } catch {
        }
      }
    }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const obj = payload;
      const name = obj.event ?? obj.type;
      if (typeof name === "string" && name) {
        receive(name, "data" in obj ? obj.data : obj, raw);
        return;
      }
    }
    receive("message", payload, raw);
  }
  function receiveSocketIo(raw) {
    const packet = decodeEngine(raw);
    switch (packet.kind) {
      case "open":
        handshake = packet.handshake;
        sendHandshakeConnect();
        markAlive();
        return;
      case "ping":
        ws?.send(ENGINE.PONG);
        markAlive();
        return;
      case "pong":
      case "noop":
        markAlive();
        return;
      case "close":
        tearDown();
        return;
      case "message":
        break;
      default:
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
        const data = socketPacket.data;
        registerError(data?.message ?? "connection refused by server");
        tearDown();
        return;
      }
      case SIO.DISCONNECT:
        tearDown();
        return;
      case SIO.ACK: {
        const response = Array.isArray(socketPacket.data) ? socketPacket.data[0] : socketPacket.data;
        if (socketPacket.ack !== void 0) {
          const callback = acks.get(socketPacket.ack);
          acks.delete(socketPacket.ack);
          callback?.(response);
        }
        return;
      }
      case SIO.EVENT: {
        const args = Array.isArray(socketPacket.data) ? socketPacket.data : [];
        const name = typeof args[0] === "string" ? args[0] : "message";
        const payload = args.length > 2 ? args.slice(1) : args[1];
        let responder;
        if (socketPacket.ack !== void 0) {
          const num = socketPacket.ack;
          responder = (response) => {
            sendText(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opts.namespace,
                ack: num,
                data: [response]
              })
            );
          };
        }
        receive(name, payload, typeof raw === "string" ? raw : void 0, responder);
        return;
      }
      default:
        warnOnce(
          `socket-packet:${address}`,
          `Socket.IO packet type ${socketPacket.type} ignored: binary attachments are not implemented in this client.`
        );
    }
  }
  function sendHandshakeConnect() {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opts.namespace,
        data: options.auth ?? defaults.auth ?? void 0
      })
    );
  }
  function confirmOpen() {
    state.attempts = 0;
    state.error = null;
    openedAt = Date.now();
    changeState("open");
    startHeartbeat();
    markAlive();
    rejoinRooms();
    drainQueue();
    for (const room of rooms.values()) {
      if (room.state.state === "joining") room.state.state = "joined";
    }
    deliver("open", { url: address });
    devtoolsBus.emit("network", {
      method: "WS",
      url: address,
      status: 101,
      ok: true,
      source: "socket"
    });
  }
  function releaseWs() {
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
  function tearDown() {
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
    }
    deliver("close", { url: address });
    scheduleReconnect();
  }
  function connect() {
    if (!Impl) return;
    if (ws) return;
    changeState(state.attempts > 0 ? "reconnecting" : "connecting");
    let newWs;
    try {
      newWs = new Impl(address, opts.protocols);
    } catch (err) {
      registerError(err?.message ?? "failed to open connection");
      scheduleReconnect();
      return;
    }
    ws = newWs;
    newWs.onopen = () => {
      if (ws !== newWs) return;
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
      registerError("connection failed");
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
      const detail = event;
      deliver("close", { url: address, code: detail?.code, reason: detail?.reason });
      devtoolsBus.emit("network", {
        method: "WS",
        url: address,
        status: detail?.code,
        ok: true,
        duration: openedAt ? Date.now() - openedAt : void 0,
        source: "socket"
      });
      scheduleReconnect();
    };
  }
  function openConnection() {
    closedPurposefully = false;
    if (!Impl) return;
    openConnections.add(instance);
    if (ws || reconnectTimer !== null) return;
    connect();
  }
  function closeConnection(code, reason) {
    closedPurposefully = true;
    stopTimers();
    changeState("closing");
    const prev = releaseWs();
    handshake = null;
    acks.clear();
    queue.length = 0;
    state.queued = 0;
    state.attempts = 0;
    for (const [name, room] of rooms) {
      room.state.state = "left";
      room.listeners.clear();
      room.state.members = [];
      rooms.delete(name);
    }
    try {
      prev?.close(code, reason);
    } catch {
    }
    openConnections.delete(instance);
    changeState("closed");
    deliver("close", { url: address, code, reason });
  }
  const instance = {
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
    to
  };
  if (!Impl) {
    state.error = "WebSocket unavailable in this environment";
    return instance;
  }
  if (!opts.manual) openConnection();
  else openConnections.add(instance);
  return instance;
}
var factory = ((url, options = {}) => createSocket(url, options));
Object.assign(factory, {
  defaults,
  interceptors: {
    incoming: { use: (fn) => use(incomingInterceptors, fn) },
    outgoing: { use: (fn) => use(outgoingInterceptors, fn) }
  },
  close() {
    for (const s of [...openConnections]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl) {
    defaults.WebSocket = impl;
  }
});
Object.defineProperty(factory, "open", {
  get: () => [...openConnections],
  enumerable: true
});
var socket = factory;

export { ENGINE, SIO, createSocket, decodeEngine, decodeSocketIo, devtoolsBus, encodeSocketIo, engineURL, resolveSocketURL, socket, socketSupported };
//# sourceMappingURL=chunk-YNAIX554.js.map
//# sourceMappingURL=chunk-YNAIX554.js.map