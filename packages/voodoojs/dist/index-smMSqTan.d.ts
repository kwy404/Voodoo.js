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
/** Estados possiveis da conexao, na ordem natural do ciclo de vida. */
type SocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';
type SocketTransport = 'ws' | 'socket.io';
/** Ciclo de vida de uma sala, do pedido de entrada ate a saida. */
type RoomState = 'joining' | 'joined' | 'left';
/**
 * Ouvinte de um evento. O segundo parametro so aparece quando o servidor pediu
 * confirmacao (ack) daquele evento, e chama-lo responde ao servidor.
 */
type SocketListener = (data: unknown, ack?: (resposta: unknown) => void) => void;
/** Uma mensagem entrando ou saindo, no formato visto pelos interceptadores. */
interface SocketMessage {
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
type SocketInterceptor = (message: SocketMessage) => SocketMessage | null | void;
/**
 * Minimo que o modulo usa de um WebSocket. Existe para que um duplo de teste
 * possa entrar no lugar do nativo por `socket.defaults.WebSocket`, sem precisar
 * de rede nenhuma.
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
interface RoomOptions {
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
interface SocketRoom {
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
    to(destino: string): {
        emit(event: string, data?: unknown): boolean;
    };
    /** Sai da sala, limpa os ouvintes e para de reentrar na reconexao. */
    leave(): void;
    sair(): void;
}
/** Conexao de tempo real devolvida por `V.socket()`. */
interface VoodooSocket {
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
    to(destino: string): {
        emit(event: string, data?: unknown): boolean;
    };
}
interface SocketDefaults extends Required<Omit<SocketOptions, 'protocols' | 'auth' | 'WebSocket'>> {
    /** Prefixo aplicado a enderecos relativos, como o `baseURL` do http. */
    baseURL: string;
    auth: Record<string, unknown> | null;
    WebSocket: WebSocketCtor | null;
}
/** Resolve `/chat` para `ws://host/chat` e `https://x` para `wss://x`. */
declare function resolveSocketURL(url: string, baseURL?: string): string;
/** `true` quando existe alguma implementacao de WebSocket disponivel. */
declare function socketSupported(): boolean;
/**
 * Cria uma conexao de tempo real.
 *
 * Sem WebSocket no ambiente (SSR, ou um jsdom sem a API), nada e lancado: volta
 * um socket inerte, permanentemente `closed`, com `error` preenchido. Uma pagina
 * renderizada no servidor nao pode quebrar por causa de um `v-socket`.
 */
declare function createSocket(url: string, options?: SocketOptions): VoodooSocket;
interface SocketFactory {
    (url: string, options?: SocketOptions): VoodooSocket;
    /** Padroes aplicados a toda conexao nova, como `http.defaults`. */
    defaults: SocketDefaults;
    /** Interceptadores de mensagem, no formato de `http.interceptors`. */
    interceptors: {
        incoming: {
            use(fn: SocketInterceptor): () => void;
        };
        outgoing: {
            use(fn: SocketInterceptor): () => void;
        };
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
declare const socket: SocketFactory;
type Socket = typeof socket;

export { type RoomOptions as R, type SocketMessage as S, type VoodooSocket as V, type WebSocketCtor as W, type RoomState as a, type SocketOptions as b, type SocketRoom as c, type SocketState as d, type SocketTransport as e, createSocket as f, socketSupported as g, type Socket as h, type SocketDefaults as i, type SocketFactory as j, type SocketInterceptor as k, type SocketListener as l, type WebSocketLike as m, resolveSocketURL as r, socket as s };
