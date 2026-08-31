export { R as RoomOptions, a as RoomState, h as Socket, i as SocketDefaults, j as SocketFactory, k as SocketInterceptor, l as SocketListener, S as SocketMessage, b as SocketOptions, c as SocketRoom, d as SocketState, e as SocketTransport, V as VoodooSocket, W as WebSocketCtor, m as WebSocketLike, f as createSocket, r as resolveSocketURL, s as socket, g as socketSupported } from './index-smMSqTan.cjs';

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
declare const ENGINE: {
    readonly OPEN: "0";
    readonly CLOSE: "1";
    readonly PING: "2";
    readonly PONG: "3";
    readonly MESSAGE: "4";
    readonly UPGRADE: "5";
    readonly NOOP: "6";
};
/** Tipos de pacote do Socket.IO v5 (protocolo do servidor v4). */
declare const SIO: {
    readonly CONNECT: 0;
    readonly DISCONNECT: 1;
    readonly EVENT: 2;
    readonly ACK: 3;
    readonly CONNECT_ERROR: 4;
    readonly BINARY_EVENT: 5;
    readonly BINARY_ACK: 6;
};
/** Dados que o servidor manda no pacote de abertura. */
interface EngineHandshake {
    sid: string;
    /** Intervalo entre os pings do servidor, em ms. */
    pingInterval: number;
    /** Quanto o servidor espera pelo pong antes de desistir, em ms. */
    pingTimeout: number;
    upgrades?: string[];
    maxPayload?: number;
}
/** Pacote Socket.IO ja separado em suas partes. */
interface SocketIoPacket {
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
/** Quadro que este cliente nao sabe ler: binario, upgrade ou lixo. */
 | {
    kind: 'unknown';
    raw: string;
};
/**
 * Le o corpo de um pacote `4` (message) do Engine.IO.
 *
 * A ordem das partes e fixa e cada uma so aparece quando existe, entao a
 * leitura e posicional: tipo, namespace opcional terminado em virgula, ack
 * opcional em digitos, e o resto e JSON.
 */
declare function decodeSocketIo(body: string): SocketIoPacket | null;
/**
 * Classifica um quadro de texto recebido do servidor.
 *
 * Quadros binarios chegam como `Blob` ou `ArrayBuffer` e viram `unknown`: sao
 * validos no protocolo, esta implementacao apenas nao os le.
 */
declare function decodeEngine(raw: unknown): EnginePacket;
/**
 * Monta um pacote `4` (message) pronto para o fio.
 *
 * `encodeSocketIo({ type: SIO.EVENT, data: ['oi', 1] })` devolve `42["oi",1]`.
 */
declare function encodeSocketIo(packet: SocketIoPacket): string;
/**
 * Monta a URL do endpoint Engine.IO.
 *
 * O caminho vira `<path>?EIO=4&transport=websocket`, porque esta implementacao
 * abre direto em WebSocket e nunca passa por polling.
 */
declare function engineURL(base: string, path?: string): string;

/**
 * @module socket/plugin
 *
 * Entrada separada da camada de tempo real.
 *
 * O motivo e medido, nao estetico: com o modulo dentro do build completo o
 * arquivo foi de 127.58 KB para 134.22 KB comprimidos, e o teto e 133. Em vez
 * de levantar a meta, que e o mesmo que nao ter meta, o modulo virou entrada
 * propria, como a camada GPU ja tinha feito pelo mesmo motivo. Quem usa
 * WebSocket paga por WebSocket; quem nao usa continua com o arquivo do tamanho
 * de antes.
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
 * <script type="module">
 *   import 'https://cdn.jsdelivr.net/npm/voodoojs/dist/socket.js'
 * </script>
 * ```
 *
 * ```js
 * import V from 'voodoojs'
 * import 'voodoojs/dist/socket.js'   // registra v-socket, v-room e liga V.socket
 * ```
 *
 * Importar este arquivo tem dois efeitos: registra as directives `v-socket`,
 * `v-room` e `v-on-socket`, e deixa `V.socket` disponivel. Nos builds ESM os
 * dois lados compartilham o mesmo runtime, porque as partes comuns saem em
 * chunks compartilhados.
 */

/**
 * Plugin no formato aceito por `V.use()`.
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
