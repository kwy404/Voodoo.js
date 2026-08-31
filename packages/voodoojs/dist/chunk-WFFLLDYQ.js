import { reactive } from './chunk-QJCR6UKZ.js';
import { avisarUmaVez } from './chunk-S3U6BJNJ.js';

/**
 * Voodoo.js v0.3.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/devtools/bus.ts
var listeners = /* @__PURE__ */ new Map();
var devtoolsBus = {
  /** Publica um evento. Sem ouvintes, a chamada e praticamente gratuita. */
  emit(type, data) {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        listener(data);
      } catch (err) {
        console.error("[Voodoo] erro em ouvinte de devtools:", err);
      }
    }
  },
  /** Assina um tipo de evento. Devolve a funcao que cancela a assinatura. */
  on(type, callback) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, set = /* @__PURE__ */ new Set());
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  },
  /** Cancela uma assinatura especifica. */
  off(type, callback) {
    listeners.get(type)?.delete(callback);
  },
  /** Remove todos os ouvintes, de um tipo ou de todos. */
  clear(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
  /** Quantidade de ouvintes registrados em um tipo. */
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
    const virgula = body.indexOf(",", i);
    if (virgula === -1) {
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, virgula);
    i = virgula + 1;
  }
  let ack;
  const inicioAck = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > inicioAck) ack = Number(body.slice(inicioAck, i));
  const resto = body.slice(i);
  return { type, namespace, ack, data: parseJson(resto) };
}
function decodeEngine(raw) {
  if (typeof raw !== "string" || !raw) return { kind: "unknown", raw: String(raw ?? "") };
  const codigo = raw[0];
  const corpo = raw.slice(1);
  switch (codigo) {
    case ENGINE.OPEN: {
      const dados = parseJson(corpo);
      return {
        kind: "open",
        handshake: {
          sid: dados?.sid ?? "",
          // Os valores do servidor mandam. Os padroes aqui sao os do Engine.IO
          // v4 e so entram em cena se o handshake vier incompleto.
          pingInterval: Number(dados?.pingInterval) || 25e3,
          pingTimeout: Number(dados?.pingTimeout) || 2e4,
          upgrades: dados?.upgrades,
          maxPayload: dados?.maxPayload
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
      const packet = decodeSocketIo(corpo);
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
  const caminho = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const consulta = "EIO=4&transport=websocket";
  try {
    const u = new URL(base);
    u.pathname = caminho;
    u.search = consulta;
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}${caminho}?${consulta}`;
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
function usar(lista, fn) {
  lista.push(fn);
  return () => {
    const i = lista.indexOf(fn);
    if (i > -1) lista.splice(i, 1);
  };
}
function aplicar(lista, mensagem) {
  let atual = mensagem;
  for (const fn of lista) {
    if (!atual) return null;
    const resultado = fn(atual);
    if (resultado === null) return null;
    if (resultado) atual = resultado;
  }
  return atual;
}
var abertos = /* @__PURE__ */ new Set();
function mesmoMembro(a, b) {
  if (a === b) return true;
  const ida = a && typeof a === "object" ? a.id : a;
  const idb = b && typeof b === "object" ? b.id : b;
  return ida !== void 0 && ida === idb;
}
function resolveSocketURL(url, baseURL = defaults.baseURL) {
  let endereco = url || "/";
  if (baseURL && !/^(wss?|https?):\/\//i.test(endereco) && !endereco.startsWith("//")) {
    endereco = `${baseURL.replace(/\/$/, "")}/${endereco.replace(/^\//, "")}`;
  }
  if (/^wss?:\/\//i.test(endereco)) return endereco;
  if (/^https?:\/\//i.test(endereco)) return endereco.replace(/^http/i, "ws");
  if (typeof location === "undefined" || !location.host) return endereco;
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${location.host}${endereco.startsWith("/") ? endereco : `/${endereco}`}`;
}
function construtor(opcoes) {
  const escolhido = opcoes.WebSocket ?? defaults.WebSocket ?? globalThis.WebSocket;
  return typeof escolhido === "function" ? escolhido : null;
}
function socketSupported() {
  return construtor({}) !== null;
}
function createSocket(url, options = {}) {
  const opcoes = { ...defaults, ...options };
  const Impl = construtor(options);
  const base = resolveSocketURL(url, opcoes.baseURL);
  const socketIo = opcoes.transport === "socket.io";
  const endereco = socketIo ? engineURL(base, opcoes.path) : base;
  const estado = reactive({
    estado: "closed",
    conectado: false,
    tentativas: 0,
    enfileiradas: 0,
    erro: null
  });
  const ouvintes = /* @__PURE__ */ new Map();
  const fila = [];
  const acks = /* @__PURE__ */ new Map();
  const salas = /* @__PURE__ */ new Map();
  let ws = null;
  let proximoAck = 1;
  let fechadoDeProposito = false;
  let handshake = null;
  let abertoEm = 0;
  let timerReconexao = null;
  let timerHeartbeat = null;
  let timerVigilancia = null;
  function on(evento, ouvinte) {
    let conjunto = ouvintes.get(evento);
    if (!conjunto) ouvintes.set(evento, conjunto = /* @__PURE__ */ new Set());
    conjunto.add(ouvinte);
    return () => {
      conjunto?.delete(ouvinte);
    };
  }
  function once(evento, ouvinte) {
    const cancelar = on(evento, (dados, ack) => {
      cancelar();
      ouvinte(dados, ack);
    });
    return cancelar;
  }
  function off(evento, ouvinte) {
    if (!evento) {
      ouvintes.clear();
      return;
    }
    if (!ouvinte) {
      ouvintes.delete(evento);
      return;
    }
    ouvintes.get(evento)?.delete(ouvinte);
  }
  function entregar(evento, dados, ack) {
    for (const nome of evento === "message" ? [evento] : [evento, "message"]) {
      const conjunto = ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          console.error("[Voodoo] erro em ouvinte de socket:", err);
        }
      }
    }
  }
  function mudarEstado(novo) {
    if (estado.estado === novo) return;
    estado.estado = novo;
    estado.conectado = novo === "open";
    entregar(`state:${novo}`, novo);
  }
  function registrarErro(mensagem) {
    estado.erro = mensagem;
    entregar("error", mensagem);
    devtoolsBus.emit("network", {
      method: "WS",
      url: endereco,
      ok: false,
      error: mensagem,
      source: "socket"
    });
  }
  function pararTimers() {
    if (timerReconexao !== null) {
      clearTimeout(timerReconexao);
      timerReconexao = null;
    }
    if (timerHeartbeat !== null) {
      clearInterval(timerHeartbeat);
      timerHeartbeat = null;
    }
    if (timerVigilancia !== null) {
      clearTimeout(timerVigilancia);
      timerVigilancia = null;
    }
  }
  function armarVigilancia(ms) {
    if (timerVigilancia !== null) clearTimeout(timerVigilancia);
    timerVigilancia = null;
    if (!ms || ms <= 0) return;
    timerVigilancia = setTimeout(() => {
      timerVigilancia = null;
      registrarErro("conexao sem resposta");
      derrubar();
    }, ms);
  }
  function janelaDeSilencio() {
    if (socketIo) {
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opcoes.heartbeat > 0 ? opcoes.heartbeat + opcoes.heartbeatTimeout : 0;
  }
  function marcarVivo() {
    armarVigilancia(janelaDeSilencio());
  }
  function iniciarHeartbeat() {
    if (socketIo || opcoes.heartbeat <= 0) return;
    if (timerHeartbeat !== null) clearInterval(timerHeartbeat);
    timerHeartbeat = setInterval(() => {
      if (opcoes.pingPayload == null) return;
      enviarTexto(opcoes.pingPayload);
    }, opcoes.heartbeat);
  }
  function esperaDaTentativa(n) {
    const cru = opcoes.reconnectDelay * 2 ** Math.max(0, n - 1);
    const teto = Math.min(cru, opcoes.reconnectMaxDelay);
    const desvio = teto * Math.min(Math.max(opcoes.jitter, 0), 1);
    return Math.max(0, Math.round(teto - desvio + Math.random() * desvio * 2));
  }
  function agendarReconexao() {
    if (fechadoDeProposito || !opcoes.reconnect) {
      mudarEstado("closed");
      return;
    }
    if (estado.tentativas >= opcoes.reconnectMaxAttempts) {
      registrarErro(`reconexao desistiu apos ${estado.tentativas} tentativas`);
      mudarEstado("closed");
      return;
    }
    estado.tentativas += 1;
    mudarEstado("reconnecting");
    const espera = esperaDaTentativa(estado.tentativas);
    entregar("reconnecting", { attempt: estado.tentativas, delay: espera });
    if (timerReconexao !== null) clearTimeout(timerReconexao);
    timerReconexao = setTimeout(() => {
      timerReconexao = null;
      if (fechadoDeProposito) return;
      conectar();
    }, espera);
  }
  function enfileirar(texto) {
    if (opcoes.queueLimit <= 0) return;
    if (fila.length >= opcoes.queueLimit) {
      fila.shift();
      avisarUmaVez(
        `socket-fila:${endereco}`,
        `A fila de envio de ${endereco} chegou ao limite de ${opcoes.queueLimit} mensagens e comecou a descartar as mais antigas. Aumente "queueLimit" ou envie menos enquanto a conexao esta fechada.`
      );
    }
    fila.push(texto);
    estado.enfileiradas = fila.length;
  }
  function escoarFila() {
    if (!fila.length) return;
    const pendentes = fila.splice(0, fila.length);
    estado.enfileiradas = 0;
    for (const texto of pendentes) enviarTexto(texto);
  }
  function enviarTexto(texto) {
    if (ws && ws.readyState === 1 && (!socketIo || estado.conectado)) {
      try {
        ws.send(texto);
        return true;
      } catch (err) {
        registrarErro(err?.message ?? "falha ao enviar");
        return false;
      }
    }
    enfileirar(texto);
    return false;
  }
  function emit(evento, dados, ack) {
    const mensagem = aplicar(outgoingInterceptors, { event: evento, data: dados, url: endereco });
    if (!mensagem) return false;
    devtoolsBus.emit("event", {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: "socket:out"
    });
    if (socketIo) {
      let numero;
      if (ack) {
        numero = proximoAck++;
        acks.set(numero, ack);
      }
      const argumentos = mensagem.data === void 0 ? [mensagem.event] : [mensagem.event, mensagem.data];
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          ack: numero,
          data: argumentos
        })
      );
    }
    return enviarTexto(
      opcoes.json ? JSON.stringify({ event: mensagem.event, data: mensagem.data }) : String(mensagem.data ?? mensagem.event)
    );
  }
  function send(dados) {
    const mensagem = aplicar(outgoingInterceptors, { event: "message", data: dados, url: endereco });
    if (!mensagem) return false;
    const carga = mensagem.data;
    const texto = typeof carga === "string" ? carga : JSON.stringify(carga);
    if (socketIo) {
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          data: ["message", carga]
        })
      );
    }
    return enviarTexto(texto);
  }
  function receber(evento, dados, cru, ack) {
    const mensagem = aplicar(incomingInterceptors, {
      event: evento,
      data: dados,
      url: endereco,
      raw: cru
    });
    if (!mensagem) return;
    devtoolsBus.emit("event", {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: "socket:in"
    });
    rotearPresenca(mensagem.event, mensagem.data);
    rotearSala(mensagem.event, mensagem.data, ack);
    entregar(mensagem.event, mensagem.data, ack);
  }
  function nomeDaSala(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null;
    const objeto = dados;
    const nome = objeto.room ?? objeto.sala;
    return typeof nome === "string" && nome ? nome : null;
  }
  function cargaDaSala(dados) {
    const objeto = dados;
    if ("data" in objeto) return objeto.data;
    if ("dados" in objeto) return objeto.dados;
    return objeto;
  }
  function entregarNaSala(sala, evento, dados, ack) {
    for (const nome of evento === "message" ? [evento] : [evento, "message"]) {
      const conjunto = sala.ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          console.error("[Voodoo] erro em ouvinte de sala:", err);
        }
      }
    }
  }
  function rotearSala(evento, dados, ack) {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;
    if (evento === opcoes.presenceEvent || evento === opcoes.memberJoinEvent || evento === opcoes.memberLeaveEvent) {
      return;
    }
    const carga = cargaDaSala(dados);
    sala.estado.mensagens.push(carga);
    if (sala.estado.mensagens.length > sala.buffer) {
      sala.estado.mensagens.splice(0, sala.estado.mensagens.length - sala.buffer);
    }
    entregarNaSala(sala, evento, carga, ack);
  }
  function rotearPresenca(evento, dados) {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;
    const objeto = dados;
    if (evento === opcoes.presenceEvent) {
      const lista = objeto.members ?? objeto.membros;
      if (Array.isArray(lista)) sala.estado.membros = [...lista];
      return;
    }
    const membro = objeto.member ?? objeto.membro ?? objeto.id;
    if (membro === void 0) return;
    if (evento === opcoes.memberJoinEvent) {
      if (!sala.estado.membros.some((m) => mesmoMembro(m, membro))) {
        sala.estado.membros.push(membro);
      }
      entregarNaSala(sala, "entrou", membro);
      return;
    }
    if (evento === opcoes.memberLeaveEvent) {
      const i = sala.estado.membros.findIndex((m) => mesmoMembro(m, membro));
      if (i > -1) sala.estado.membros.splice(i, 1);
      entregarNaSala(sala, "saiu", membro);
    }
  }
  function pedirEntrada(sala, nome) {
    sala.estado.estado = "joining";
    emit(opcoes.joinEvent, { room: nome, private: sala.privada });
  }
  function reentrarNasSalas() {
    for (const [nome, sala] of salas) {
      if (sala.estado.estado === "left") continue;
      pedirEntrada(sala, nome);
    }
  }
  function join(nome, config = {}) {
    const existente = salas.get(nome);
    if (existente && existente.estado.estado !== "left") return existente.publica;
    const privada = config.privada ?? config.private ?? false;
    const estadoSala = reactive({
      estado: "joining",
      membros: [],
      mensagens: []
    });
    const ouvintesSala = /* @__PURE__ */ new Map();
    const enviarNaSala = (evento, dados, destino) => emit(evento, destino ? { room: nome, to: destino, data: dados } : { room: nome, data: dados });
    const publica = {
      get name() {
        return nome;
      },
      get private() {
        return privada;
      },
      get privada() {
        return privada;
      },
      get state() {
        return estadoSala.estado;
      },
      get estado() {
        return estadoSala.estado;
      },
      get members() {
        return estadoSala.membros;
      },
      get membros() {
        return estadoSala.membros;
      },
      get messages() {
        return estadoSala.mensagens;
      },
      get mensagens() {
        return estadoSala.mensagens;
      },
      on(evento, ouvinte) {
        let conjunto = ouvintesSala.get(evento);
        if (!conjunto) ouvintesSala.set(evento, conjunto = /* @__PURE__ */ new Set());
        conjunto.add(ouvinte);
        return () => {
          conjunto?.delete(ouvinte);
        };
      },
      off(evento, ouvinte) {
        if (!evento) ouvintesSala.clear();
        else if (!ouvinte) ouvintesSala.delete(evento);
        else ouvintesSala.get(evento)?.delete(ouvinte);
      },
      emit: (evento, dados) => enviarNaSala(evento, dados),
      enviar: (evento, dados) => enviarNaSala(evento, dados),
      to: (destino) => ({
        emit: (evento, dados) => enviarNaSala(evento, dados, destino)
      }),
      leave: () => leave(nome),
      sair: () => leave(nome)
    };
    const interna = {
      publica,
      estado: estadoSala,
      ouvintes: ouvintesSala,
      privada,
      buffer: config.buffer ?? opcoes.roomBuffer
    };
    salas.set(nome, interna);
    pedirEntrada(interna, nome);
    if (estado.conectado) estadoSala.estado = "joined";
    return publica;
  }
  function leave(nome) {
    const sala = salas.get(nome);
    if (!sala) return;
    salas.delete(nome);
    sala.estado.estado = "left";
    sala.ouvintes.clear();
    sala.estado.membros = [];
    if (estado.conectado) emit(opcoes.leaveEvent, { room: nome });
  }
  function to(destino) {
    return {
      emit: (evento, dados) => emit(evento, { to: destino, data: dados })
    };
  }
  function receberNativo(cru) {
    if (typeof cru !== "string") {
      receber("message", cru);
      return;
    }
    if (opcoes.pongPayload != null && cru === opcoes.pongPayload) return;
    let carga = cru;
    if (opcoes.json) {
      const inicio = cru.trimStart()[0];
      if (inicio === "{" || inicio === "[") {
        try {
          carga = JSON.parse(cru);
        } catch {
        }
      }
    }
    if (carga && typeof carga === "object" && !Array.isArray(carga)) {
      const objeto = carga;
      const nome = objeto.event ?? objeto.type;
      if (typeof nome === "string" && nome) {
        receber(nome, "data" in objeto ? objeto.data : objeto, cru);
        return;
      }
    }
    receber("message", carga, cru);
  }
  function receberSocketIo(cru) {
    const pacote = decodeEngine(cru);
    switch (pacote.kind) {
      case "open":
        handshake = pacote.handshake;
        enviarHandshakeConnect();
        marcarVivo();
        return;
      case "ping":
        ws?.send(ENGINE.PONG);
        marcarVivo();
        return;
      case "pong":
      case "noop":
        marcarVivo();
        return;
      case "close":
        derrubar();
        return;
      case "message":
        break;
      default:
        marcarVivo();
        avisarUmaVez(
          `socket-quadro:${endereco}`,
          `O servidor mandou um quadro que este cliente Socket.IO nao le (binario ou upgrade). Anexos binarios nao estao implementados; mande os dados como JSON ou base64.`
        );
        return;
    }
    const { packet } = pacote;
    switch (packet.type) {
      case SIO.CONNECT:
        confirmarAbertura();
        return;
      case SIO.CONNECT_ERROR: {
        const dados = packet.data;
        registrarErro(dados?.message ?? "conexao recusada pelo servidor");
        derrubar();
        return;
      }
      case SIO.DISCONNECT:
        derrubar();
        return;
      case SIO.ACK: {
        const resposta = Array.isArray(packet.data) ? packet.data[0] : packet.data;
        if (packet.ack !== void 0) {
          const callback = acks.get(packet.ack);
          acks.delete(packet.ack);
          callback?.(resposta);
        }
        return;
      }
      case SIO.EVENT: {
        const argumentos = Array.isArray(packet.data) ? packet.data : [];
        const nome = typeof argumentos[0] === "string" ? argumentos[0] : "message";
        const carga = argumentos.length > 2 ? argumentos.slice(1) : argumentos[1];
        let responder;
        if (packet.ack !== void 0) {
          const numero = packet.ack;
          responder = (resposta) => {
            enviarTexto(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opcoes.namespace,
                ack: numero,
                data: [resposta]
              })
            );
          };
        }
        receber(nome, carga, typeof cru === "string" ? cru : void 0, responder);
        return;
      }
      default:
        avisarUmaVez(
          `socket-pacote:${endereco}`,
          `Pacote Socket.IO tipo ${packet.type} ignorado: anexos binarios nao estao implementados neste cliente.`
        );
    }
  }
  function enviarHandshakeConnect() {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opcoes.namespace,
        data: options.auth ?? defaults.auth ?? void 0
      })
    );
  }
  function confirmarAbertura() {
    estado.tentativas = 0;
    estado.erro = null;
    abertoEm = Date.now();
    mudarEstado("open");
    iniciarHeartbeat();
    marcarVivo();
    reentrarNasSalas();
    escoarFila();
    for (const sala of salas.values()) {
      if (sala.estado.estado === "joining") sala.estado.estado = "joined";
    }
    entregar("open", { url: endereco });
    devtoolsBus.emit("network", {
      method: "WS",
      url: endereco,
      status: 101,
      ok: true,
      source: "socket"
    });
  }
  function soltarWs() {
    const anterior = ws;
    if (anterior) {
      anterior.onopen = null;
      anterior.onclose = null;
      anterior.onerror = null;
      anterior.onmessage = null;
    }
    ws = null;
    return anterior;
  }
  function derrubar() {
    const anterior = soltarWs();
    handshake = null;
    if (timerHeartbeat !== null) {
      clearInterval(timerHeartbeat);
      timerHeartbeat = null;
    }
    if (timerVigilancia !== null) {
      clearTimeout(timerVigilancia);
      timerVigilancia = null;
    }
    estado.conectado = false;
    try {
      anterior?.close();
    } catch {
    }
    entregar("close", { url: endereco });
    agendarReconexao();
  }
  function conectar() {
    if (!Impl) return;
    if (ws) return;
    mudarEstado(estado.tentativas > 0 ? "reconnecting" : "connecting");
    let novo;
    try {
      novo = new Impl(endereco, opcoes.protocols);
    } catch (err) {
      registrarErro(err?.message ?? "falha ao abrir a conexao");
      agendarReconexao();
      return;
    }
    ws = novo;
    novo.onopen = () => {
      if (ws !== novo) return;
      if (socketIo) marcarVivo();
      else confirmarAbertura();
    };
    novo.onmessage = (evento) => {
      if (ws !== novo) return;
      marcarVivo();
      if (socketIo) receberSocketIo(evento?.data);
      else receberNativo(evento?.data);
    };
    novo.onerror = () => {
      if (ws !== novo) return;
      registrarErro("falha na conexao");
    };
    novo.onclose = (evento) => {
      if (ws !== novo) return;
      soltarWs();
      handshake = null;
      if (timerHeartbeat !== null) {
        clearInterval(timerHeartbeat);
        timerHeartbeat = null;
      }
      if (timerVigilancia !== null) {
        clearTimeout(timerVigilancia);
        timerVigilancia = null;
      }
      estado.conectado = false;
      const detalhe = evento;
      entregar("close", { url: endereco, code: detalhe?.code, reason: detalhe?.reason });
      devtoolsBus.emit("network", {
        method: "WS",
        url: endereco,
        status: detalhe?.code,
        ok: true,
        duration: abertoEm ? Date.now() - abertoEm : void 0,
        source: "socket"
      });
      agendarReconexao();
    };
  }
  function open() {
    fechadoDeProposito = false;
    if (!Impl) return;
    abertos.add(instancia);
    if (ws || timerReconexao !== null) return;
    conectar();
  }
  function close(code, reason) {
    fechadoDeProposito = true;
    pararTimers();
    mudarEstado("closing");
    const anterior = soltarWs();
    handshake = null;
    acks.clear();
    fila.length = 0;
    estado.enfileiradas = 0;
    estado.tentativas = 0;
    for (const [nome, sala] of salas) {
      sala.estado.estado = "left";
      sala.ouvintes.clear();
      sala.estado.membros = [];
      salas.delete(nome);
    }
    try {
      anterior?.close(code, reason);
    } catch {
    }
    abertos.delete(instancia);
    mudarEstado("closed");
    entregar("close", { url: endereco, code, reason });
  }
  const instancia = {
    get url() {
      return endereco;
    },
    get state() {
      return estado.estado;
    },
    get connected() {
      return estado.conectado;
    },
    get attempts() {
      return estado.tentativas;
    },
    get queued() {
      return estado.enfileiradas;
    },
    get error() {
      return estado.erro;
    },
    get raw() {
      return ws;
    },
    get rooms() {
      return [...salas.values()].map((s) => s.publica);
    },
    on,
    once,
    off,
    emit,
    send,
    open,
    close,
    join,
    leave,
    to
  };
  if (!Impl) {
    estado.erro = "WebSocket indisponivel neste ambiente";
    return instancia;
  }
  if (!opcoes.manual) open();
  else abertos.add(instancia);
  return instancia;
}
var fabrica = ((url, options = {}) => createSocket(url, options));
Object.assign(fabrica, {
  defaults,
  interceptors: {
    incoming: { use: (fn) => usar(incomingInterceptors, fn) },
    outgoing: { use: (fn) => usar(outgoingInterceptors, fn) }
  },
  close() {
    for (const s of [...abertos]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl) {
    defaults.WebSocket = impl;
  }
});
Object.defineProperty(fabrica, "open", {
  get: () => [...abertos],
  enumerable: true
});
var socket = fabrica;

export { ENGINE, SIO, createSocket, decodeEngine, decodeSocketIo, devtoolsBus, encodeSocketIo, engineURL, resolveSocketURL, socket, socketSupported };
//# sourceMappingURL=chunk-WFFLLDYQ.js.map
//# sourceMappingURL=chunk-WFFLLDYQ.js.map