/**
 * @module socket/protocol
 *
 * O protocolo Engine.IO/Socket.IO escrito a mao, sem a biblioteca.
 *
 * Vale explicar por que este arquivo existe. `socket.io-client` pesa mais de 30
 * KB comprimidos, e a Voodoo nao tem dependencia de runtime nenhuma. Acontece
 * que o pedaco do protocolo que uma pagina usa de verdade e pequeno: um
 * handshake, seis codigos de pacote e um JSON. Isso cabe em texto puro sobre o
 * WebSocket nativo, e e exatamente o que esta aqui.
 *
 * Um quadro de texto do Engine.IO v4 tem a forma `<codigo><corpo>`:
 *
 * ```text
 * 0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}   abertura
 * 2                                                          ping do servidor
 * 3                                                          pong do cliente
 * 40                                                         entrar no namespace
 * 42["mensagem",{"texto":"oi"}]                              evento
 * 421["salvar",{...}]                                        evento pedindo ack 1
 * 431[{"ok":true}]                                           resposta do ack 1
 * ```
 *
 * O corpo de um pacote `4` (message) e um pacote Socket.IO, que por sua vez tem
 * a forma `<tipo>[<namespace>,][<ack>]<JSON>`. As duas camadas sao decodificadas
 * aqui, em funcoes puras, porque protocolo em funcao pura e protocolo testavel.
 *
 * O que **nao** esta implementado esta declarado em `docs/websocket.md`, e a
 * lista curta e: anexos binarios (`45`/`46`), transporte por polling e upgrade,
 * e namespaces diferentes de `/`.
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

/** Dados que o servidor manda no pacote de abertura. */
export interface EngineHandshake {
  sid: string;
  /** Intervalo entre os pings do servidor, em ms. */
  pingInterval: number;
  /** Quanto o servidor espera pelo pong antes de desistir, em ms. */
  pingTimeout: number;
  upgrades?: string[];
  maxPayload?: number;
}

/** Pacote Socket.IO ja separado em suas partes. */
export interface SocketIoPacket {
  /** Um dos valores de `SIO`. */
  type: number;
  /** Namespace. Esta implementacao so fala `/`. */
  namespace: string;
  /** Numero do ack, quando o pacote pede ou responde confirmacao. */
  ack?: number;
  /** Corpo ja convertido de JSON. Para eventos, `[nome, ...argumentos]`. */
  data?: unknown;
}

/** Pacote Engine.IO ja classificado. */
export type EnginePacket =
  | { kind: 'open'; handshake: EngineHandshake }
  | { kind: 'close' }
  | { kind: 'ping' }
  | { kind: 'pong' }
  | { kind: 'message'; packet: SocketIoPacket }
  | { kind: 'noop' }
  /** Quadro que este cliente nao sabe ler: binario, upgrade ou lixo. */
  | { kind: 'unknown'; raw: string };

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Corpo quebrado nao pode derrubar a conexao inteira.
    return undefined;
  }
}

/**
 * Le o corpo de um pacote `4` (message) do Engine.IO.
 *
 * A ordem das partes e fixa e cada uma so aparece quando existe, entao a
 * leitura e posicional: tipo, namespace opcional terminado em virgula, ack
 * opcional em digitos, e o resto e JSON.
 */
export function decodeSocketIo(body: string): SocketIoPacket | null {
  if (!body) return null;
  const type = Number(body[0]);
  if (!Number.isInteger(type) || type < 0 || type > 6) return null;

  let i = 1;
  let namespace = '/';
  if (body[i] === '/') {
    const virgula = body.indexOf(',', i);
    if (virgula === -1) {
      // `4/admin` sem virgula e um connect ao namespace, sem corpo.
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, virgula);
    i = virgula + 1;
  }

  let ack: number | undefined;
  const inicioAck = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > inicioAck) ack = Number(body.slice(inicioAck, i));

  const resto = body.slice(i);
  return { type, namespace, ack, data: parseJson(resto) };
}

/**
 * Classifica um quadro de texto recebido do servidor.
 *
 * Quadros binarios chegam como `Blob` ou `ArrayBuffer` e viram `unknown`: sao
 * validos no protocolo, esta implementacao apenas nao os le.
 */
export function decodeEngine(raw: unknown): EnginePacket {
  if (typeof raw !== 'string' || !raw) return { kind: 'unknown', raw: String(raw ?? '') };

  const codigo = raw[0];
  const corpo = raw.slice(1);

  switch (codigo) {
    case ENGINE.OPEN: {
      const dados = parseJson(corpo) as Partial<EngineHandshake> | undefined;
      return {
        kind: 'open',
        handshake: {
          sid: dados?.sid ?? '',
          // Os valores do servidor mandam. Os padroes aqui sao os do Engine.IO
          // v4 e so entram em cena se o handshake vier incompleto.
          pingInterval: Number(dados?.pingInterval) || 25_000,
          pingTimeout: Number(dados?.pingTimeout) || 20_000,
          upgrades: dados?.upgrades,
          maxPayload: dados?.maxPayload,
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
      const packet = decodeSocketIo(corpo);
      return packet ? { kind: 'message', packet } : { kind: 'unknown', raw };
    }
    case ENGINE.NOOP:
      return { kind: 'noop' };
    default:
      return { kind: 'unknown', raw };
  }
}

/**
 * Monta um pacote `4` (message) pronto para o fio.
 *
 * `encodeSocketIo({ type: SIO.EVENT, data: ['oi', 1] })` devolve `42["oi",1]`.
 */
export function encodeSocketIo(packet: SocketIoPacket): string {
  let out = ENGINE.MESSAGE + String(packet.type);
  // O namespace so viaja quando nao e o padrao, como manda o protocolo.
  if (packet.namespace && packet.namespace !== '/') out += `${packet.namespace},`;
  if (packet.ack !== undefined) out += String(packet.ack);
  if (packet.data !== undefined) out += JSON.stringify(packet.data);
  return out;
}

/**
 * Monta a URL do endpoint Engine.IO.
 *
 * O caminho vira `<path>?EIO=4&transport=websocket`, porque esta implementacao
 * abre direto em WebSocket e nunca passa por polling.
 */
export function engineURL(base: string, path = '/socket.io/'): string {
  const caminho = `/${path.replace(/^\/+|\/+$/g, '')}/`;
  const consulta = 'EIO=4&transport=websocket';
  try {
    const u = new URL(base);
    u.pathname = caminho;
    u.search = consulta;
    return u.toString();
  } catch {
    // Sem `URL` utilizavel (base relativa em ambiente sem `location`), concatena.
    return `${base.replace(/\/+$/, '')}${caminho}?${consulta}`;
  }
}
