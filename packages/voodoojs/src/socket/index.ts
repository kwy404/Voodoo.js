/**
 * @module socket
 *
 * Tempo real com a mesma ergonomia do modulo `http`: padroes em um lugar so,
 * interceptadores, reconexao com espera progressiva e nenhuma dependencia.
 * Onde o `http` tem `retry`, aqui existe `reconnect`; onde ele tem
 * `interceptors.request/response`, aqui existem `interceptors.outgoing/incoming`.
 *
 * ```js
 * const s = V.socket('wss://exemplo.com')                 // WebSocket nativo
 * const chat = V.socket('/', { transport: 'socket.io' })  // protocolo Socket.IO
 *
 * chat.on('mensagem', (dados) => console.log(dados))
 * chat.emit('entrar', { sala: 'geral' })
 * chat.state       // reativo
 * chat.connected   // reativo
 * chat.close()
 * V.socket.close() // fecha todos
 * ```
 *
 * ## Duas convencoes que precisam ficar claras
 *
 * 1. **Eventos sobre WebSocket nativo.** O WebSocket cru nao tem conceito de
 *    evento nomeado: ele carrega texto. Para `emit`/`on` funcionarem nos dois
 *    transportes, o transporte nativo usa um envelope JSON,
 *    `{"event":"nome","data":...}`, na ida e na volta. Quem fala com um servidor
 *    que nao usa esse formato tem `send()` e `on('message')`, que passam o
 *    conteudo cru sem interpretar nome nenhum.
 * 2. **Heartbeat no transporte nativo.** O `readyState` mente: quando a rede cai
 *    sem FIN, ele continua dizendo `OPEN` por minutos. Entao o modulo manda um
 *    `ping` de tempos em tempos e derruba a conexao quando nada volta. O texto
 *    do ping e configuravel e `heartbeat: 0` desliga tudo. No transporte
 *    Socket.IO nada disso e usado: quem manda o ping ali e o servidor, e o
 *    protocolo ja define os tempos.
 */

import { reactive } from '../reactivity';
import { devtoolsBus } from '../devtools/bus';
import { avisarUmaVez } from '../runtime/avisos';
import {
  decodeEngine,
  encodeSocketIo,
  engineURL,
  ENGINE,
  SIO,
  type EngineHandshake,
} from './protocol';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Estados possiveis da conexao, na ordem natural do ciclo de vida. */
export type SocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';

export type SocketTransport = 'ws' | 'socket.io';

/** Ciclo de vida de uma sala, do pedido de entrada ate a saida. */
export type RoomState = 'joining' | 'joined' | 'left';

/**
 * Ouvinte de um evento. O segundo parametro so aparece quando o servidor pediu
 * confirmacao (ack) daquele evento, e chama-lo responde ao servidor.
 */
export type SocketListener = (data: unknown, ack?: (resposta: unknown) => void) => void;

/** Uma mensagem entrando ou saindo, no formato visto pelos interceptadores. */
export interface SocketMessage {
  /** Nome do evento. `message` quando a mensagem nao carrega nome. */
  event: string;
  /** Carga da mensagem. */
  data: unknown;
  /** Endereco do socket, para identificar a conexao dentro do interceptador. */
  url: string;
  /** Texto exatamente como veio do fio. Ausente nas mensagens de saida. */
  raw?: string;
}

/**
 * Interceptador de mensagem. Devolver um objeto troca a mensagem, devolver
 * `null` a descarta, e nao devolver nada mantem a original.
 */
export type SocketInterceptor = (
  message: SocketMessage
) => SocketMessage | null | void;

/**
 * Minimo que o modulo usa de um WebSocket. Existe para que um duplo de teste
 * possa entrar no lugar do nativo por `socket.defaults.WebSocket`, sem precisar
 * de rede nenhuma.
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
  /** `ws` fala WebSocket puro. `socket.io` fala o protocolo Engine.IO/Socket.IO. */
  transport?: SocketTransport;
  /** Subprotocolos do handshake, repassados ao construtor nativo. */
  protocols?: string | string[];
  /** Reconecta sozinho quando a conexao cai sem ter sido fechada por `close()`. */
  reconnect?: boolean;
  /** Primeira espera antes de reconectar, em ms. Dobra a cada tentativa. */
  reconnectDelay?: number;
  /** Teto da espera entre tentativas, em ms. */
  reconnectMaxDelay?: number;
  /** Numero maximo de tentativas. `Infinity` tenta para sempre. */
  reconnectMaxAttempts?: number;
  /** Fracao de 0 a 1 sorteada em cima da espera, para nao sincronizar clientes. */
  jitter?: number;
  /** Intervalo entre pings do transporte nativo, em ms. `0` desliga. */
  heartbeat?: number;
  /** Tempo sem nenhuma resposta ate considerar a conexao morta, em ms. */
  heartbeatTimeout?: number;
  /** Texto enviado como ping. `null` observa o silencio sem mandar nada. */
  pingPayload?: string | null;
  /** Texto que o servidor devolve como pong, ignorado na entrega das mensagens. */
  pongPayload?: string | null;
  /** Quantas mensagens ficam guardadas enquanto a conexao nao abre. */
  queueLimit?: number;
  /** Converte JSON automaticamente, com volta para texto puro quando falha. */
  json?: boolean;
  /** Caminho do endpoint Engine.IO. So vale para `transport: 'socket.io'`. */
  path?: string;
  /** Namespace Socket.IO. Esta implementacao so fala o padrao. */
  namespace?: string;
  /** Dados de autenticacao enviados no pacote CONNECT do Socket.IO. */
  auth?: Record<string, unknown> | null;
  /** Implementacao de WebSocket usada no lugar da global. */
  WebSocket?: WebSocketCtor | null;
  /** Cria a conexao fechada. Quem abre e `open()`. */
  manual?: boolean;

  /** Evento enviado ao servidor para pedir entrada numa sala. */
  joinEvent?: string;
  /** Evento enviado ao servidor para pedir saida de uma sala. */
  leaveEvent?: string;
  /** Evento em que o servidor manda a lista completa de membros de uma sala. */
  presenceEvent?: string;
  /** Evento em que o servidor avisa que alguem entrou. */
  memberJoinEvent?: string;
  /** Evento em que o servidor avisa que alguem saiu. */
  memberLeaveEvent?: string;
  /** Quantas mensagens cada sala guarda em `mensagens`. */
  roomBuffer?: number;
}

/** Configuracao de uma sala especifica. */
export interface RoomOptions {
  /**
   * Marca a sala como privada. Isto e um pedido, nao uma garantia: quem decide
   * quem entra e o que trafega e sempre o servidor. Veja `docs/websocket.md`.
   */
  privada?: boolean;
  /** Mesmo que `privada`, para quem escreve a API em ingles. */
  private?: boolean;
  /** Quantas mensagens esta sala guarda. Padrao `defaults.roomBuffer`. */
  buffer?: number;
}

/**
 * Uma sala (ou canal) dentro de uma conexao.
 *
 * Os nomes existem em portugues e em ingles porque a directive expoe `$room` em
 * portugues no HTML e a API programatica segue o ingles do resto do modulo.
 */
export interface SocketRoom {
  /** Nome da sala, como foi pedido ao servidor. */
  readonly name: string;
  /** `true` quando a sala foi pedida como privada. */
  readonly private: boolean;
  readonly privada: boolean;
  /** Estado reativo da sala. */
  readonly state: RoomState;
  readonly estado: RoomState;
  /** Quem o servidor diz que esta na sala. Vazio se ele nao mandar nada. */
  readonly members: unknown[];
  readonly membros: unknown[];
  /** Ultimas mensagens recebidas na sala, ate o limite do buffer. */
  readonly messages: unknown[];
  readonly mensagens: unknown[];

  /** Escuta um evento desta sala. Devolve a funcao que cancela. */
  on(event: string, listener: SocketListener): () => void;
  /** Cancela um ouvinte, todos de um evento, ou todos da sala. */
  off(event?: string, listener?: SocketListener): void;
  /** Envia para todos os membros da sala. */
  emit(event: string, data?: unknown): boolean;
  enviar(event: string, data?: unknown): boolean;
  /** Envia so para um destinatario dentro desta sala. */
  to(destino: string): { emit(event: string, data?: unknown): boolean };
  /** Sai da sala, limpa os ouvintes e para de reentrar na reconexao. */
  leave(): void;
  sair(): void;
}

/** Conexao de tempo real devolvida por `V.socket()`. */
export interface VoodooSocket {
  /** Endereco final, ja resolvido e com o endpoint do transporte. */
  readonly url: string;
  /** Estado reativo da conexao. */
  readonly state: SocketState;
  /** `true` enquanto a conexao esta aberta. Reativo. */
  readonly connected: boolean;
  /** Quantas reconexoes seguidas foram tentadas sem sucesso. Reativo. */
  readonly attempts: number;
  /** Quantas mensagens estao esperando a conexao abrir. Reativo. */
  readonly queued: number;
  /** Ultimo erro, ja em texto. Reativo. */
  readonly error: string | null;
  /** WebSocket em uso, para casos avancados. `null` enquanto fechado. */
  readonly raw: WebSocketLike | null;

  /** Escuta um evento. Devolve a funcao que cancela a assinatura. */
  on(event: string, listener: SocketListener): () => void;
  /** Escuta apenas a proxima ocorrencia. */
  once(event: string, listener: SocketListener): () => void;
  /** Cancela um ouvinte, todos de um evento, ou todos de todos. */
  off(event?: string, listener?: SocketListener): void;
  /** Envia um evento nomeado. Antes de abrir, entra na fila. */
  emit(event: string, data?: unknown, ack?: (resposta: unknown) => void): boolean;
  /** Envia uma carga crua, sem nome de evento. */
  send(data: unknown): boolean;
  /** Abre a conexao. Usado por `manual` e depois de um `close()`. */
  open(): void;
  /** Fecha de proposito: nao reconecta, limpa timers e esvazia a fila. */
  close(code?: number, reason?: string): void;

  /** Entra numa sala. Chamar duas vezes com o mesmo nome devolve a mesma sala. */
  join(name: string, options?: RoomOptions): SocketRoom;
  /** Sai de uma sala pelo nome. */
  leave(name: string): void;
  /** Salas em que esta conexao esta, ou entrando. */
  readonly rooms: SocketRoom[];
  /** Envia direto para um destinatario, fora de qualquer sala. */
  to(destino: string): { emit(event: string, data?: unknown): boolean };
}

// ---------------------------------------------------------------------------
// Padroes e interceptadores, no mesmo formato do modulo http
// ---------------------------------------------------------------------------

export interface SocketDefaults extends Required<Omit<SocketOptions, 'protocols' | 'auth' | 'WebSocket'>> {
  /** Prefixo aplicado a enderecos relativos, como o `baseURL` do http. */
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

function usar(lista: SocketInterceptor[], fn: SocketInterceptor): () => void {
  lista.push(fn);
  return () => {
    const i = lista.indexOf(fn);
    if (i > -1) lista.splice(i, 1);
  };
}

/** Roda a cadeia de interceptadores. `null` significa mensagem descartada. */
function aplicar(lista: SocketInterceptor[], mensagem: SocketMessage): SocketMessage | null {
  let atual: SocketMessage | null = mensagem;
  for (const fn of lista) {
    if (!atual) return null;
    const resultado = fn(atual);
    if (resultado === null) return null;
    if (resultado) atual = resultado;
  }
  return atual;
}

/** Conexoes vivas, para `V.socket.close()` derrubar todas de uma vez. */
const abertos = new Set<VoodooSocket>();

/**
 * Compara dois membros de sala.
 *
 * O servidor pode mandar `"ana"` ou `{ id: "ana", nome: "Ana" }`, e os dois
 * precisam contar como a mesma pessoa quando o `id` bate.
 */
function mesmoMembro(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const ida = a && typeof a === 'object' ? (a as { id?: unknown }).id : a;
  const idb = b && typeof b === 'object' ? (b as { id?: unknown }).id : b;
  return ida !== undefined && ida === idb;
}

// ---------------------------------------------------------------------------
// Endereco
// ---------------------------------------------------------------------------

/** Resolve `/chat` para `ws://host/chat` e `https://x` para `wss://x`. */
export function resolveSocketURL(url: string, baseURL = defaults.baseURL): string {
  let endereco = url || '/';

  if (baseURL && !/^(wss?|https?):\/\//i.test(endereco) && !endereco.startsWith('//')) {
    endereco = `${baseURL.replace(/\/$/, '')}/${endereco.replace(/^\//, '')}`;
  }
  if (/^wss?:\/\//i.test(endereco)) return endereco;
  if (/^https?:\/\//i.test(endereco)) return endereco.replace(/^http/i, 'ws');

  if (typeof location === 'undefined' || !location.host) return endereco;
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${location.host}${endereco.startsWith('/') ? endereco : `/${endereco}`}`;
}

/** Construtor de WebSocket em uso, ou `null` quando o ambiente nao tem nenhum. */
function construtor(opcoes: SocketOptions): WebSocketCtor | null {
  const escolhido =
    opcoes.WebSocket ??
    defaults.WebSocket ??
    (globalThis as { WebSocket?: WebSocketCtor }).WebSocket;
  return typeof escolhido === 'function' ? escolhido : null;
}

/** `true` quando existe alguma implementacao de WebSocket disponivel. */
export function socketSupported(): boolean {
  return construtor({}) !== null;
}

// ---------------------------------------------------------------------------
// Criacao de uma conexao
// ---------------------------------------------------------------------------

/**
 * Cria uma conexao de tempo real.
 *
 * Sem WebSocket no ambiente (SSR, ou um jsdom sem a API), nada e lancado: volta
 * um socket inerte, permanentemente `closed`, com `error` preenchido. Uma pagina
 * renderizada no servidor nao pode quebrar por causa de um `v-socket`.
 */
export function createSocket(url: string, options: SocketOptions = {}): VoodooSocket {
  const opcoes = { ...defaults, ...options };
  const Impl = construtor(options);

  const base = resolveSocketURL(url, opcoes.baseURL);
  const socketIo = opcoes.transport === 'socket.io';
  const endereco = socketIo ? engineURL(base, opcoes.path) : base;

  // Reatividade em um objeto proprio, e nao no socket inteiro: assim `on`,
  // `emit` e o resto continuam sendo funcoes comuns, e so o que a tela le passa
  // pelo proxy. Ler `estado.estado` dentro de um efeito e o que faz
  // `v-show="$socket.conectado"` reagir sozinho.
  const estado = reactive({
    estado: 'closed' as SocketState,
    conectado: false,
    tentativas: 0,
    enfileiradas: 0,
    erro: null as string | null,
  });

  const ouvintes = new Map<string, Set<SocketListener>>();
  const fila: string[] = [];
  const acks = new Map<number, (resposta: unknown) => void>();
  const salas = new Map<string, SalaInterna>();

  let ws: WebSocketLike | null = null;
  let proximoAck = 1;
  let fechadoDeProposito = false;
  let handshake: EngineHandshake | null = null;
  let abertoEm = 0;

  let timerReconexao: ReturnType<typeof setTimeout> | null = null;
  let timerHeartbeat: ReturnType<typeof setInterval> | null = null;
  let timerVigilancia: ReturnType<typeof setTimeout> | null = null;

  // -------------------------------------------------------------------------
  // Ouvintes
  // -------------------------------------------------------------------------

  function on(evento: string, ouvinte: SocketListener): () => void {
    let conjunto = ouvintes.get(evento);
    if (!conjunto) ouvintes.set(evento, (conjunto = new Set()));
    conjunto.add(ouvinte);
    return () => {
      conjunto?.delete(ouvinte);
    };
  }

  function once(evento: string, ouvinte: SocketListener): () => void {
    const cancelar = on(evento, (dados, ack) => {
      cancelar();
      ouvinte(dados, ack);
    });
    return cancelar;
  }

  function off(evento?: string, ouvinte?: SocketListener): void {
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

  /** Entrega para os ouvintes do evento e para os de `message`, sempre. */
  function entregar(evento: string, dados: unknown, ack?: (r: unknown) => void): void {
    for (const nome of evento === 'message' ? [evento] : [evento, 'message']) {
      const conjunto = ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          // Um ouvinte quebrado nunca derruba a conexao nem os outros ouvintes.
          // eslint-disable-next-line no-console
          console.error('[Voodoo] erro em ouvinte de socket:', err);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Estado
  // -------------------------------------------------------------------------

  function mudarEstado(novo: SocketState): void {
    if (estado.estado === novo) return;
    estado.estado = novo;
    estado.conectado = novo === 'open';
    entregar(`state:${novo}`, novo);
  }

  function registrarErro(mensagem: string): void {
    estado.erro = mensagem;
    entregar('error', mensagem);
    devtoolsBus.emit('network', {
      method: 'WS',
      url: endereco,
      ok: false,
      error: mensagem,
      source: 'socket',
    });
  }

  // -------------------------------------------------------------------------
  // Timers
  // -------------------------------------------------------------------------

  function pararTimers(): void {
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

  /**
   * Arma o relogio da conexao morta.
   *
   * Qualquer quadro que chegue reinicia a contagem: trafego e prova de vida
   * melhor que qualquer pong. Estourou, a conexao e considerada morta mesmo com
   * o `readyState` jurando que esta aberta.
   */
  function armarVigilancia(ms: number): void {
    if (timerVigilancia !== null) clearTimeout(timerVigilancia);
    timerVigilancia = null;
    if (!ms || ms <= 0) return;
    timerVigilancia = setTimeout(() => {
      timerVigilancia = null;
      registrarErro('conexao sem resposta');
      derrubar();
    }, ms);
  }

  /** Quanto tempo de silencio ainda conta como conexao viva. */
  function janelaDeSilencio(): number {
    if (socketIo) {
      // No Socket.IO quem manda o ping e o servidor, entao a janela sai do
      // handshake: um intervalo inteiro mais a tolerancia que ele mesmo declarou.
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opcoes.heartbeat > 0 ? opcoes.heartbeat + opcoes.heartbeatTimeout : 0;
  }

  function marcarVivo(): void {
    armarVigilancia(janelaDeSilencio());
  }

  function iniciarHeartbeat(): void {
    if (socketIo || opcoes.heartbeat <= 0) return;
    if (timerHeartbeat !== null) clearInterval(timerHeartbeat);
    timerHeartbeat = setInterval(() => {
      if (opcoes.pingPayload == null) return;
      enviarTexto(opcoes.pingPayload);
    }, opcoes.heartbeat);
  }

  // -------------------------------------------------------------------------
  // Reconexao
  // -------------------------------------------------------------------------

  /**
   * Espera progressiva com sorteio.
   *
   * O erro classico aqui e reconectar em laco: mil abas caem juntas, todas
   * voltam no mesmo milissegundo e derrubam o servidor de novo. A espera dobra a
   * cada tentativa ate o teto, e o sorteio espalha as abas dentro da janela.
   */
  function esperaDaTentativa(n: number): number {
    const cru = opcoes.reconnectDelay * 2 ** Math.max(0, n - 1);
    const teto = Math.min(cru, opcoes.reconnectMaxDelay);
    const desvio = teto * Math.min(Math.max(opcoes.jitter, 0), 1);
    return Math.max(0, Math.round(teto - desvio + Math.random() * desvio * 2));
  }

  function agendarReconexao(): void {
    if (fechadoDeProposito || !opcoes.reconnect) {
      mudarEstado('closed');
      return;
    }
    if (estado.tentativas >= opcoes.reconnectMaxAttempts) {
      registrarErro(`reconexao desistiu apos ${estado.tentativas} tentativas`);
      mudarEstado('closed');
      return;
    }

    estado.tentativas += 1;
    mudarEstado('reconnecting');
    const espera = esperaDaTentativa(estado.tentativas);
    entregar('reconnecting', { attempt: estado.tentativas, delay: espera });

    if (timerReconexao !== null) clearTimeout(timerReconexao);
    timerReconexao = setTimeout(() => {
      timerReconexao = null;
      // Um `close()` durante a espera cancela a tentativa: fechar de proposito
      // precisa parar de vez, e nao so pular uma rodada.
      if (fechadoDeProposito) return;
      conectar();
    }, espera);
  }

  // -------------------------------------------------------------------------
  // Fila de envio
  // -------------------------------------------------------------------------

  /**
   * Guarda uma mensagem ate a conexao abrir.
   *
   * A fila tem teto porque uma conexao que nunca abre transformaria `emit` num
   * vazamento silencioso. Cheia, a mais antiga sai: em tempo real o dado novo
   * vale mais que o velho.
   */
  function enfileirar(texto: string): void {
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

  function escoarFila(): void {
    if (!fila.length) return;
    const pendentes = fila.splice(0, fila.length);
    estado.enfileiradas = 0;
    for (const texto of pendentes) enviarTexto(texto);
  }

  /** Escreve no fio, ou enfileira quando ainda nao da. */
  function enviarTexto(texto: string): boolean {
    // `readyState === 1` e OPEN em qualquer implementacao de WebSocket.
    if (ws && ws.readyState === 1 && (!socketIo || estado.conectado)) {
      try {
        ws.send(texto);
        return true;
      } catch (err) {
        registrarErro((err as Error)?.message ?? 'falha ao enviar');
        return false;
      }
    }
    enfileirar(texto);
    return false;
  }

  // -------------------------------------------------------------------------
  // Envio com nome de evento
  // -------------------------------------------------------------------------

  function emit(evento: string, dados?: unknown, ack?: (resposta: unknown) => void): boolean {
    const mensagem = aplicar(outgoingInterceptors, { event: evento, data: dados, url: endereco });
    if (!mensagem) return false;

    devtoolsBus.emit('event', {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: 'socket:out',
    });

    if (socketIo) {
      let numero: number | undefined;
      if (ack) {
        numero = proximoAck++;
        acks.set(numero, ack);
      }
      const argumentos =
        mensagem.data === undefined ? [mensagem.event] : [mensagem.event, mensagem.data];
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          ack: numero,
          data: argumentos,
        })
      );
    }

    // Transporte nativo: o envelope `{event,data}` e a convencao do modulo.
    return enviarTexto(
      opcoes.json
        ? JSON.stringify({ event: mensagem.event, data: mensagem.data })
        : String(mensagem.data ?? mensagem.event)
    );
  }

  function send(dados: unknown): boolean {
    const mensagem = aplicar(outgoingInterceptors, { event: 'message', data: dados, url: endereco });
    if (!mensagem) return false;

    const carga = mensagem.data;
    const texto = typeof carga === 'string' ? carga : JSON.stringify(carga);
    if (socketIo) {
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          data: ['message', carga],
        })
      );
    }
    return enviarTexto(texto);
  }

  // -------------------------------------------------------------------------
  // Recepcao
  // -------------------------------------------------------------------------

  /** Passa pelos interceptadores de entrada e entrega aos ouvintes. */
  function receber(evento: string, dados: unknown, cru?: string, ack?: (r: unknown) => void): void {
    const mensagem = aplicar(incomingInterceptors, {
      event: evento,
      data: dados,
      url: endereco,
      raw: cru,
    });
    if (!mensagem) return;

    devtoolsBus.emit('event', {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: 'socket:in',
    });

    // Presenca e mensagem de sala sao roteadas antes da entrega comum. Os
    // ouvintes do socket continuam vendo tudo: a sala e um recorte, nao um
    // desvio.
    rotearPresenca(mensagem.event, mensagem.data);
    rotearSala(mensagem.event, mensagem.data, ack);

    entregar(mensagem.event, mensagem.data, ack);
  }

  // -------------------------------------------------------------------------
  // Salas
  // -------------------------------------------------------------------------

  interface SalaInterna {
    publica: SocketRoom;
    /** Estado reativo lido pelo HTML. */
    estado: { estado: RoomState; membros: unknown[]; mensagens: unknown[] };
    ouvintes: Map<string, Set<SocketListener>>;
    privada: boolean;
    buffer: number;
  }

  /** Le o nome da sala escrito numa carga, aceitando os dois idiomas. */
  function nomeDaSala(dados: unknown): string | null {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return null;
    const objeto = dados as Record<string, unknown>;
    const nome = objeto.room ?? objeto.sala;
    return typeof nome === 'string' && nome ? nome : null;
  }

  /** Tira o envelope de sala e devolve so o que o servidor quis mandar. */
  function cargaDaSala(dados: unknown): unknown {
    const objeto = dados as Record<string, unknown>;
    if ('data' in objeto) return objeto.data;
    if ('dados' in objeto) return objeto.dados;
    return objeto;
  }

  function entregarNaSala(sala: SalaInterna, evento: string, dados: unknown, ack?: (r: unknown) => void): void {
    for (const nome of evento === 'message' ? [evento] : [evento, 'message']) {
      const conjunto = sala.ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Voodoo] erro em ouvinte de sala:', err);
        }
      }
    }
  }

  function rotearSala(evento: string, dados: unknown, ack?: (r: unknown) => void): void {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;

    // Os eventos de presenca ja foram tratados e nao viram mensagem da sala.
    if (
      evento === opcoes.presenceEvent ||
      evento === opcoes.memberJoinEvent ||
      evento === opcoes.memberLeaveEvent
    ) {
      return;
    }

    const carga = cargaDaSala(dados);
    sala.estado.mensagens.push(carga);
    // Buffer com teto: uma sala movimentada nao pode virar um vazamento lento.
    if (sala.estado.mensagens.length > sala.buffer) {
      sala.estado.mensagens.splice(0, sala.estado.mensagens.length - sala.buffer);
    }
    entregarNaSala(sala, evento, carga, ack);
  }

  /**
   * Presenca vem inteira do servidor.
   *
   * O cliente nao tem como saber quem esta numa sala: ele so ve o proprio
   * socket. Entao se o servidor nao mandar nada, `membros` fica vazio. Inventar
   * presenca no cliente daria uma lista bonita e mentirosa.
   */
  function rotearPresenca(evento: string, dados: unknown): void {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;
    const objeto = dados as Record<string, unknown>;

    if (evento === opcoes.presenceEvent) {
      const lista = objeto.members ?? objeto.membros;
      if (Array.isArray(lista)) sala.estado.membros = [...lista];
      return;
    }

    const membro = objeto.member ?? objeto.membro ?? objeto.id;
    if (membro === undefined) return;

    if (evento === opcoes.memberJoinEvent) {
      if (!sala.estado.membros.some((m) => mesmoMembro(m, membro))) {
        sala.estado.membros.push(membro);
      }
      entregarNaSala(sala, 'entrou', membro);
      return;
    }
    if (evento === opcoes.memberLeaveEvent) {
      const i = sala.estado.membros.findIndex((m) => mesmoMembro(m, membro));
      if (i > -1) sala.estado.membros.splice(i, 1);
      entregarNaSala(sala, 'saiu', membro);
    }
  }

  /** Pede ao servidor a entrada na sala. Refeito a cada reconexao. */
  function pedirEntrada(sala: SalaInterna, nome: string): void {
    sala.estado.estado = 'joining';
    emit(opcoes.joinEvent, { room: nome, private: sala.privada });
  }

  /**
   * Reentra em todas as salas depois que a conexao volta.
   *
   * Este e o detalhe que quase toda implementacao esquece: o socket reconecta,
   * a interface mostra "online" de novo e o usuario continua fora das salas,
   * sem receber nada. Reentrar aqui e o que fecha esse buraco.
   */
  function reentrarNasSalas(): void {
    for (const [nome, sala] of salas) {
      if (sala.estado.estado === 'left') continue;
      pedirEntrada(sala, nome);
    }
  }

  function join(nome: string, config: RoomOptions = {}): SocketRoom {
    // Idempotente de proposito: entrar duas vezes na mesma sala devolve o mesmo
    // objeto, sem duplicar ouvinte nem pedir entrada de novo.
    const existente = salas.get(nome);
    if (existente && existente.estado.estado !== 'left') return existente.publica;

    const privada = config.privada ?? config.private ?? false;
    const estadoSala = reactive({
      estado: 'joining' as RoomState,
      membros: [] as unknown[],
      mensagens: [] as unknown[],
    });

    const ouvintesSala = new Map<string, Set<SocketListener>>();

    const enviarNaSala = (evento: string, dados?: unknown, destino?: string): boolean =>
      emit(evento, destino ? { room: nome, to: destino, data: dados } : { room: nome, data: dados });

    const publica: SocketRoom = {
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
        if (!conjunto) ouvintesSala.set(evento, (conjunto = new Set()));
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
      to: (destino: string) => ({
        emit: (evento: string, dados?: unknown) => enviarNaSala(evento, dados, destino),
      }),
      leave: () => leave(nome),
      sair: () => leave(nome),
    };

    const interna: SalaInterna = {
      publica,
      estado: estadoSala,
      ouvintes: ouvintesSala,
      privada,
      buffer: config.buffer ?? opcoes.roomBuffer,
    };
    salas.set(nome, interna);

    // Sem conexao aberta o pedido entra na fila e sai assim que ela abrir.
    pedirEntrada(interna, nome);
    if (estado.conectado) estadoSala.estado = 'joined';
    return publica;
  }

  function leave(nome: string): void {
    const sala = salas.get(nome);
    if (!sala) return;
    salas.delete(nome);
    sala.estado.estado = 'left';
    sala.ouvintes.clear();
    sala.estado.membros = [];
    if (estado.conectado) emit(opcoes.leaveEvent, { room: nome });
  }

  function to(destino: string): { emit(evento: string, dados?: unknown): boolean } {
    return {
      emit: (evento: string, dados?: unknown) => emit(evento, { to: destino, data: dados }),
    };
  }

  /**
   * Le uma mensagem do transporte nativo.
   *
   * JSON automatico com volta para texto puro, igual ao `responseType: 'auto'`
   * do http: o que parece JSON e convertido, o resto continua sendo texto.
   */
  function receberNativo(cru: unknown): void {
    if (typeof cru !== 'string') {
      receber('message', cru);
      return;
    }
    // O pong do heartbeat e conversa entre o modulo e o servidor, nao evento.
    if (opcoes.pongPayload != null && cru === opcoes.pongPayload) return;

    let carga: unknown = cru;
    if (opcoes.json) {
      const inicio = cru.trimStart()[0];
      if (inicio === '{' || inicio === '[') {
        try {
          carga = JSON.parse(cru);
        } catch {
          // JSON quebrado continua valendo como texto, sem derrubar nada.
        }
      }
    }

    // Envelope `{event,data}`: o nome vira evento, o resto vira carga.
    if (carga && typeof carga === 'object' && !Array.isArray(carga)) {
      const objeto = carga as Record<string, unknown>;
      const nome = objeto.event ?? objeto.type;
      if (typeof nome === 'string' && nome) {
        receber(nome, 'data' in objeto ? objeto.data : objeto, cru);
        return;
      }
    }
    receber('message', carga, cru);
  }

  /** Le um quadro do transporte Socket.IO. */
  function receberSocketIo(cru: unknown): void {
    const pacote = decodeEngine(cru);

    switch (pacote.kind) {
      case 'open':
        handshake = pacote.handshake;
        // Handshake fechado: agora entra no namespace. So depois do CONNECT
        // aceito e que a conexao conta como aberta.
        enviarHandshakeConnect();
        marcarVivo();
        return;

      case 'ping':
        // O servidor perguntou. Responder e obrigatorio: sem pong ele desliga.
        ws?.send(ENGINE.PONG);
        marcarVivo();
        return;

      case 'pong':
      case 'noop':
        marcarVivo();
        return;

      case 'close':
        // Desligamento pedido pelo servidor. Continua valendo reconectar.
        derrubar();
        return;

      case 'message':
        break;

      default:
        // Quadro binario ou desconhecido: conta como sinal de vida e nada mais.
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
        const dados = packet.data as { message?: string } | undefined;
        registrarErro(dados?.message ?? 'conexao recusada pelo servidor');
        // Recusa de handshake nao se resolve repetindo depressa: derruba e deixa
        // a espera progressiva cuidar do ritmo.
        derrubar();
        return;
      }

      case SIO.DISCONNECT:
        derrubar();
        return;

      case SIO.ACK: {
        const resposta = Array.isArray(packet.data) ? packet.data[0] : packet.data;
        if (packet.ack !== undefined) {
          const callback = acks.get(packet.ack);
          acks.delete(packet.ack);
          callback?.(resposta);
        }
        return;
      }

      case SIO.EVENT: {
        const argumentos = Array.isArray(packet.data) ? packet.data : [];
        const nome = typeof argumentos[0] === 'string' ? (argumentos[0] as string) : 'message';
        const carga = argumentos.length > 2 ? argumentos.slice(1) : argumentos[1];

        // Evento que pede confirmacao: o ouvinte ganha a funcao de responder.
        let responder: ((r: unknown) => void) | undefined;
        if (packet.ack !== undefined) {
          const numero = packet.ack;
          responder = (resposta: unknown) => {
            enviarTexto(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opcoes.namespace,
                ack: numero,
                data: [resposta],
              })
            );
          };
        }
        receber(nome, carga, typeof cru === 'string' ? cru : undefined, responder);
        return;
      }

      default:
        avisarUmaVez(
          `socket-pacote:${endereco}`,
          `Pacote Socket.IO tipo ${packet.type} ignorado: anexos binarios nao estao implementados neste cliente.`
        );
    }
  }

  function enviarHandshakeConnect(): void {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opcoes.namespace,
        data: options.auth ?? defaults.auth ?? undefined,
      })
    );
  }

  // -------------------------------------------------------------------------
  // Ciclo de vida da conexao
  // -------------------------------------------------------------------------

  /** Marca a conexao como pronta de verdade e escoa o que estava esperando. */
  function confirmarAbertura(): void {
    estado.tentativas = 0;
    estado.erro = null;
    abertoEm = Date.now();
    mudarEstado('open');
    iniciarHeartbeat();
    marcarVivo();
    // A ordem importa: reentrar antes de escoar coloca o pedido de sala na
    // frente das mensagens que estavam esperando, entao elas chegam na sala
    // certa em vez de baterem numa conexao que ainda esta fora dela.
    reentrarNasSalas();
    escoarFila();
    for (const sala of salas.values()) {
      if (sala.estado.estado === 'joining') sala.estado.estado = 'joined';
    }
    entregar('open', { url: endereco });
    devtoolsBus.emit('network', {
      method: 'WS',
      url: endereco,
      status: 101,
      ok: true,
      source: 'socket',
    });
  }

  /** Solta o WebSocket atual sem deixar nenhum callback pendurado nele. */
  function soltarWs(): WebSocketLike | null {
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

  /**
   * Encerra a conexao atual por conta propria e decide se reconecta.
   *
   * Usado tanto pela deteccao de conexao morta quanto pelo desligamento pedido
   * pelo servidor: nos dois casos o `onclose` nativo pode nunca chegar.
   */
  function derrubar(): void {
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
      // Fechar um socket ja morto pode lancar. Nao muda nada.
    }
    entregar('close', { url: endereco });
    agendarReconexao();
  }

  function conectar(): void {
    if (!Impl) return;
    if (ws) return;

    mudarEstado(estado.tentativas > 0 ? 'reconnecting' : 'connecting');

    let novo: WebSocketLike;
    try {
      novo = new Impl(endereco, opcoes.protocols);
    } catch (err) {
      registrarErro((err as Error)?.message ?? 'falha ao abrir a conexao');
      agendarReconexao();
      return;
    }
    ws = novo;

    novo.onopen = () => {
      if (ws !== novo) return;
      // No Socket.IO o TCP abrir e so o comeco: a conexao logica so existe
      // depois do handshake Engine.IO e do CONNECT aceito.
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
      // O evento de erro do WebSocket nao carrega motivo, por decisao do padrao.
      registrarErro('falha na conexao');
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
      const detalhe = evento as { code?: number; reason?: string } | undefined;
      entregar('close', { url: endereco, code: detalhe?.code, reason: detalhe?.reason });
      devtoolsBus.emit('network', {
        method: 'WS',
        url: endereco,
        status: detalhe?.code,
        ok: true,
        duration: abertoEm ? Date.now() - abertoEm : undefined,
        source: 'socket',
      });
      agendarReconexao();
    };
  }

  function open(): void {
    fechadoDeProposito = false;
    if (!Impl) return;
    abertos.add(instancia);
    if (ws || timerReconexao !== null) return;
    conectar();
  }

  function close(code?: number, reason?: string): void {
    // A partir daqui nada mais reconecta. Este e o unico jeito de parar de vez.
    fechadoDeProposito = true;
    pararTimers();
    mudarEstado('closing');

    const anterior = soltarWs();
    handshake = null;
    acks.clear();
    fila.length = 0;
    estado.enfileiradas = 0;
    estado.tentativas = 0;
    // Fechar de proposito desmonta as salas junto: nada de ouvinte de sala
    // sobrevivendo a conexao que o alimentava.
    for (const [nome, sala] of salas) {
      sala.estado.estado = 'left';
      sala.ouvintes.clear();
      sala.estado.membros = [];
      salas.delete(nome);
    }
    try {
      anterior?.close(code, reason);
    } catch {
      // Idem: fechar duas vezes nao e problema de quem chamou.
    }
    abertos.delete(instancia);
    mudarEstado('closed');
    entregar('close', { url: endereco, code, reason });
  }

  const instancia: VoodooSocket = {
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
    to,
  };

  if (!Impl) {
    // Ambiente sem WebSocket: o socket existe, nunca abre e nunca lanca.
    estado.erro = 'WebSocket indisponivel neste ambiente';
    return instancia;
  }

  if (!opcoes.manual) open();
  else abertos.add(instancia);
  return instancia;
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

export interface SocketFactory {
  (url: string, options?: SocketOptions): VoodooSocket;
  /** Padroes aplicados a toda conexao nova, como `http.defaults`. */
  defaults: SocketDefaults;
  /** Interceptadores de mensagem, no formato de `http.interceptors`. */
  interceptors: {
    incoming: { use(fn: SocketInterceptor): () => void };
    outgoing: { use(fn: SocketInterceptor): () => void };
  };
  /** Fecha todas as conexoes abertas. */
  close(): void;
  /** Conexoes vivas neste momento. */
  readonly open: VoodooSocket[];
  /** `true` quando o ambiente tem WebSocket. */
  supported(): boolean;
  /** Troca a implementacao de WebSocket usada por padrao. Util em teste. */
  setWebSocket(impl: WebSocketCtor | null): void;
}

const fabrica = ((url: string, options: SocketOptions = {}): VoodooSocket =>
  createSocket(url, options)) as SocketFactory;

Object.assign(fabrica, {
  defaults,
  interceptors: {
    incoming: { use: (fn: SocketInterceptor) => usar(incomingInterceptors, fn) },
    outgoing: { use: (fn: SocketInterceptor) => usar(outgoingInterceptors, fn) },
  },
  close(): void {
    for (const s of [...abertos]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl: WebSocketCtor | null): void {
    defaults.WebSocket = impl;
  },
});

// `open` precisa continuar sendo getter, e nao valor. `Object.assign` copia o
// resultado de um getter, nao o getter: dentro do objeto acima a lista sairia
// congelada e vazia para sempre.
Object.defineProperty(fabrica, 'open', {
  get: () => [...abertos],
  enumerable: true,
});

export const socket: SocketFactory = fabrica;

export type Socket = typeof socket;
export { decodeEngine, decodeSocketIo, encodeSocketIo, engineURL, ENGINE, SIO } from './protocol';
export type { EngineHandshake, EnginePacket, SocketIoPacket } from './protocol';
