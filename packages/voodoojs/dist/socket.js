import { socketSupported, createSocket, socket } from './chunk-HNM3CTBD.js';
export { ENGINE, SIO, createSocket, decodeEngine, decodeSocketIo, encodeSocketIo, engineURL, resolveSocketURL, socket, socketSupported } from './chunk-HNM3CTBD.js';
import { evaluateIn, readAttr } from './chunk-XTXSD4ZO.js';
import { reactive } from './chunk-LLNDLLKV.js';
import { warnAlias } from './chunk-72PMUUMT.js';
import { parseDuration } from './chunk-KN7NAKBL.js';
import { defineDirective, PRIORITY, config } from './chunk-T5ION5NG.js';
import './chunk-GXPNWCGE.js';

/**
 * Voodoo.js v0.12.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/directives/socket.ts
function aliasLegacy(view, pairs) {
  for (const [old, canonical] of pairs) {
    Object.defineProperty(view, old, {
      enumerable: false,
      configurable: true,
      get() {
        warnAlias(old, canonical);
        return view[canonical];
      },
      set(value) {
        warnAlias(old, canonical);
        view[canonical] = value;
      }
    });
  }
}
function attr(el, name) {
  return readAttr(el, `${config.prefix}${name}`);
}
var connections = /* @__PURE__ */ new WeakMap();
function closest(el, map) {
  let current = el;
  while (current) {
    const found = map.get(current);
    if (found) return found;
    current = current.parentElement;
  }
  return null;
}
function resolveText(expression, scope, context) {
  const text = expression.trim();
  if (!text) return "";
  if (/^[A-Za-z_$][\w$]*$/.test(text)) {
    const value2 = scope.has(text) ? scope.get(text) : void 0;
    return typeof value2 === "string" && value2 ? value2 : text;
  }
  if (/^(wss?|https?):\/\//i.test(text) || /^[\w:.\-/]+$/.test(text)) return text;
  const value = evaluateIn(text, scope, context);
  return typeof value === "string" && value ? value : text;
}
function dispatch(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
defineDirective(
  "socket",
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const name = attr(el, "socket-as") || "$socket";
    if (!socketSupported()) {
      el.setAttribute("data-socket", "unsupported");
      scope.set(
        name,
        reactive({
          connected: false,
          state: "closed",
          error: "WebSocket unavailable in this environment",
          attempts: 0,
          messages: [],
          send: () => false,
          open: () => void 0,
          close: () => void 0,
          socket: null
        })
      );
      dispatch(el, "voodoo:socket-unsupported", { url: expression });
      return;
    }
    const limit = Number(attr(el, "socket-buffer") ?? 50);
    const transport = attr(el, "socket-transport") || "ws";
    const reconnect = !modifiers["no-reconnect"] && modifiers.reconnect !== "false" && attr(el, "socket-reconnect") !== "false";
    const options = {
      transport: transport === "socket.io" ? "socket.io" : "ws",
      manual: !!modifiers.manual,
      reconnect
    };
    if (modifiers.json) options.json = modifiers.json !== "false";
    const path = attr(el, "socket-path");
    if (path) options.path = path;
    const heartbeat = attr(el, "socket-heartbeat");
    if (heartbeat !== null) options.heartbeat = parseDuration(heartbeat, 25e3);
    const s = createSocket(resolveText(expression, scope, "v-socket") || "/", options);
    connections.set(el, s);
    el.setAttribute("data-socket", "ready");
    function send(event, ...rest) {
      if (typeof event !== "string") return s.send(event);
      return rest.length ? s.emit(event, rest[0]) : s.emit(event);
    }
    const view = reactive({
      connected: s.connected,
      state: s.state,
      error: s.error,
      attempts: s.attempts,
      messages: [],
      send,
      open: () => s.open(),
      close: () => s.close(),
      socket: s
    });
    aliasLegacy(view, [
      ["conectado", "connected"],
      ["estado", "state"],
      ["mensagens", "messages"],
      ["erro", "error"],
      ["tentativas", "attempts"],
      ["enviar", "send"],
      ["abrir", "open"],
      ["fechar", "close"]
    ]);
    scope.set(name, view);
    effect(() => {
      view.connected = s.connected;
      view.state = s.state;
      view.error = s.error;
      view.attempts = s.attempts;
    });
    const unsubscribe = [
      s.on("message", (data) => {
        view.messages.push(data);
        if (view.messages.length > limit) {
          view.messages.splice(0, view.messages.length - limit);
        }
      }),
      s.on("open", () => dispatch(el, "voodoo:socket-open", { url: s.url })),
      s.on("close", (d) => dispatch(el, "voodoo:socket-close", d)),
      s.on("error", (d) => dispatch(el, "voodoo:socket-error", d))
    ];
    cleanup(() => {
      for (const stop of unsubscribe) stop();
      s.off();
      s.close();
      connections.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);
defineDirective(
  "room",
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const s = closest(el, connections);
    if (!s) return;
    const roomName = resolveText(expression, scope, "v-room");
    if (!roomName) return;
    const room = s.join(roomName, {
      private: !!modifiers.private || !!modifiers.privada,
      buffer: Number(attr(el, "room-buffer") ?? 50)
    });
    const view = reactive({
      name: roomName,
      private: room.private,
      state: room.state,
      members: room.members,
      messages: room.messages,
      /** Sends to the room. With `to`, only to that recipient. */
      send: (event, data, to) => to ? room.to(to).emit(event, data) : room.emit(event, data),
      leave: () => room.leave(),
      room
    });
    aliasLegacy(view, [
      ["membros", "members"],
      ["mensagens", "messages"],
      ["estado", "state"],
      ["nome", "name"],
      ["privada", "private"],
      ["enviar", "send"],
      ["sair", "leave"]
    ]);
    scope.set(attr(el, "room-as") || "$room", view);
    effect(() => {
      view.state = room.state;
      view.members = room.members;
      view.messages = room.messages;
    });
    const unsubscribe = [
      room.on("joined", (m) => dispatch(el, "voodoo:room-join", m)),
      room.on("left", (m) => dispatch(el, "voodoo:room-leave", m))
    ];
    cleanup(() => {
      for (const stop of unsubscribe) stop();
      room.off();
      room.leave();
    });
  },
  // After `v-socket`, so the connection exists when the room asks to join.
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("on-socket", ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const target2 = closest(el, connections);
  if (!target2) return;
  const unsubscribe = target2.on(arg, (data, ack) => {
    const local = scope.child({ $event: data, $ack: ack, $el: el });
    const value = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof value === "function") value.call(scope.data, data);
  });
  cleanup(unsubscribe);
});
for (const nome of [
  "socket-transport",
  "socket-as",
  "socket-buffer",
  "socket-path",
  "socket-heartbeat",
  "socket-reconnect",
  "room-as",
  "room-buffer"
]) {
  defineDirective(nome, () => void 0, { priority: PRIORITY.TRANSITION });
}

// src/socket/plugin.ts
var voodooSocket = {
  name: "socket",
  install(V) {
    if (!V.socket) V.socket = socket;
  }
};
var target = globalThis.V;
if (target && typeof target === "object" && !target.socket) target.socket = socket;
var plugin_default = voodooSocket;

export { plugin_default as default, voodooSocket };
//# sourceMappingURL=socket.js.map
//# sourceMappingURL=socket.js.map