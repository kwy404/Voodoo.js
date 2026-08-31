import { socketSupported, createSocket, socket } from './chunk-2SDBGISE.js';
export { ENGINE, SIO, createSocket, decodeEngine, decodeSocketIo, encodeSocketIo, engineURL, resolveSocketURL, socket, socketSupported } from './chunk-2SDBGISE.js';
import { evaluateIn, readAttr } from './chunk-IW55VCGX.js';
import { reactive } from './chunk-VJA45L6K.js';
import './chunk-F3SPSSE3.js';
import { parseDuration } from './chunk-BTORMWLO.js';
import { defineDirective, PRIORITY, config } from './chunk-UNICRHSA.js';
import './chunk-LUEWHAC4.js';

/**
 * Voodoo.js v0.2.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/directives/socket.ts
function attr(el, nome) {
  return readAttr(el, `${config.prefix}${nome}`);
}
var conexoes = /* @__PURE__ */ new WeakMap();
var salasPorElemento = /* @__PURE__ */ new WeakMap();
function maisProximo(el, mapa) {
  let atual = el;
  while (atual) {
    const encontrado = mapa.get(atual);
    if (encontrado) return encontrado;
    atual = atual.parentElement;
  }
  return null;
}
function resolverTexto(expressao, scope, contexto) {
  const texto = expressao.trim();
  if (!texto) return "";
  if (/^[A-Za-z_$][\w$]*$/.test(texto)) {
    const valor2 = scope.has(texto) ? scope.get(texto) : void 0;
    return typeof valor2 === "string" && valor2 ? valor2 : texto;
  }
  if (/^(wss?|https?):\/\//i.test(texto) || /^[\w:.\-/]+$/.test(texto)) return texto;
  const valor = evaluateIn(texto, scope, contexto);
  return typeof valor === "string" && valor ? valor : texto;
}
function disparar(el, tipo, detalhe) {
  el.dispatchEvent(new CustomEvent(tipo, { detail: detalhe, bubbles: true }));
}
defineDirective(
  "socket",
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const nome = attr(el, "socket-as") || "$socket";
    if (!socketSupported()) {
      el.setAttribute("data-socket", "unsupported");
      scope.set(
        nome,
        reactive({
          conectado: false,
          estado: "closed",
          erro: "WebSocket indisponivel neste ambiente",
          tentativas: 0,
          mensagens: [],
          enviar: () => false,
          abrir: () => void 0,
          fechar: () => void 0,
          socket: null
        })
      );
      disparar(el, "voodoo:socket-unsupported", { url: expression });
      return;
    }
    const limite = Number(attr(el, "socket-buffer") ?? 50);
    const transporte = attr(el, "socket-transport") || "ws";
    const reconectar = !modifiers["no-reconnect"] && modifiers.reconnect !== "false" && attr(el, "socket-reconnect") !== "false";
    const opcoes = {
      transport: transporte === "socket.io" ? "socket.io" : "ws",
      manual: !!modifiers.manual,
      reconnect: reconectar
    };
    if (modifiers.json) opcoes.json = modifiers.json !== "false";
    const caminho = attr(el, "socket-path");
    if (caminho) opcoes.path = caminho;
    const batida = attr(el, "socket-heartbeat");
    if (batida !== null) opcoes.heartbeat = parseDuration(batida, 25e3);
    const s = createSocket(resolverTexto(expression, scope, "v-socket") || "/", opcoes);
    conexoes.set(el, s);
    el.setAttribute("data-socket", "ready");
    function enviar(evento, ...resto) {
      if (typeof evento !== "string") return s.send(evento);
      return resto.length ? s.emit(evento, resto[0]) : s.emit(evento);
    }
    const vista = reactive({
      conectado: s.connected,
      estado: s.state,
      erro: s.error,
      tentativas: s.attempts,
      mensagens: [],
      enviar,
      abrir: () => s.open(),
      fechar: () => s.close(),
      socket: s
    });
    scope.set(nome, vista);
    effect(() => {
      vista.conectado = s.connected;
      vista.estado = s.state;
      vista.erro = s.error;
      vista.tentativas = s.attempts;
    });
    const cancelar = [
      s.on("message", (dados) => {
        vista.mensagens.push(dados);
        if (vista.mensagens.length > limite) {
          vista.mensagens.splice(0, vista.mensagens.length - limite);
        }
      }),
      s.on("open", () => disparar(el, "voodoo:socket-open", { url: s.url })),
      s.on("close", (d) => disparar(el, "voodoo:socket-close", d)),
      s.on("error", (d) => disparar(el, "voodoo:socket-error", d))
    ];
    cleanup(() => {
      for (const parar of cancelar) parar();
      s.off();
      s.close();
      conexoes.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);
defineDirective(
  "room",
  ({ el, scope, expression, modifiers, cleanup, effect }) => {
    const s = maisProximo(el, conexoes);
    if (!s) return;
    const nomeSala = resolverTexto(expression, scope, "v-room");
    if (!nomeSala) return;
    const sala = s.join(nomeSala, {
      privada: !!modifiers.privada || !!modifiers.private,
      buffer: Number(attr(el, "room-buffer") ?? 50)
    });
    salasPorElemento.set(el, sala);
    const vista = reactive({
      nome: nomeSala,
      privada: sala.privada,
      estado: sala.estado,
      membros: sala.membros,
      mensagens: sala.mensagens,
      /** Envia para a sala. Com `para`, so para aquele destinatario. */
      enviar: (evento, dados, para) => para ? sala.to(para).emit(evento, dados) : sala.emit(evento, dados),
      sair: () => sala.leave(),
      sala
    });
    scope.set(attr(el, "room-as") || "$room", vista);
    effect(() => {
      vista.estado = sala.estado;
      vista.membros = sala.membros;
      vista.mensagens = sala.mensagens;
    });
    const cancelar = [
      sala.on("entrou", (m) => disparar(el, "voodoo:room-join", m)),
      sala.on("saiu", (m) => disparar(el, "voodoo:room-leave", m))
    ];
    cleanup(() => {
      for (const parar of cancelar) parar();
      sala.off();
      sala.leave();
      salasPorElemento.delete(el);
    });
  },
  // Depois de `v-socket`, para a conexao ja existir quando a sala pedir entrada.
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("on-socket", ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const alvo2 = maisProximo(el, salasPorElemento) ?? maisProximo(el, conexoes);
  if (!alvo2) return;
  const cancelar = alvo2.on(arg, (dados, ack) => {
    const local = scope.child({ $event: dados, $ack: ack, $el: el });
    const valor = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof valor === "function") valor.call(scope.data, dados);
  });
  cleanup(cancelar);
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
var alvo = globalThis.V;
if (alvo && typeof alvo === "object" && !alvo.socket) alvo.socket = socket;
var plugin_default = voodooSocket;

export { plugin_default as default, voodooSocket };
//# sourceMappingURL=socket.js.map
//# sourceMappingURL=socket.js.map