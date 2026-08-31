/**
 * Camada de tempo real.
 *
 * O jsdom tem uma classe `WebSocket`, mas ela abre socket de verdade: usar a
 * nativa aqui significaria teste dependendo de rede, e teste que depende de rede
 * nao e teste. Entao o modulo recebe um duplo controlavel por
 * `socket.defaults.WebSocket`, e cada caso decide na mao quando a conexao abre,
 * o que chega e quando ela cai. O caminho "ambiente sem WebSocket" e o unico que
 * mexe na global, e devolve o que pegou.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import {
  socket,
  createSocket,
  socketSupported,
  decodeEngine,
  decodeSocketIo,
  encodeSocketIo,
  engineURL,
  resolveSocketURL,
  type WebSocketLike,
} from '../src/socket';
// Registra as directives nucleares (v-show, v-text, v-for) e as do socket.
import '../src/core';
import '../src/directives/socket';

// ---------------------------------------------------------------------------
// Duplo de WebSocket
// ---------------------------------------------------------------------------

/** Imita a API do WebSocket sem tocar em rede nenhuma. */
class FakeWebSocket implements WebSocketLike {
  static abertos: FakeWebSocket[] = [];
  /** Ultimo socket construido, que e quase sempre o que o teste quer. */
  static get ultimo(): FakeWebSocket {
    return FakeWebSocket.abertos[FakeWebSocket.abertos.length - 1];
  }
  static limpar(): void {
    FakeWebSocket.abertos = [];
  }

  readyState = 0;
  enviados: string[] = [];
  fechado = false;

  onopen: ((e?: unknown) => void) | null = null;
  onclose: ((e?: unknown) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;

  constructor(
    public url: string,
    public protocols?: string | string[]
  ) {
    FakeWebSocket.abertos.push(this);
  }

  send(data: string): void {
    this.enviados.push(data);
  }

  close(code?: number, reason?: string): void {
    this.fechado = true;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  // --- controles do teste ---

  /** Faz o handshake abrir. */
  abrir(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  /** Entrega um quadro vindo do servidor. */
  receber(data: unknown): void {
    this.onmessage?.({ data });
  }

  /** Queda da conexao vinda de fora, sem `close()` do cliente. */
  cair(code = 1006): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  /** Some sem avisar: `readyState` continua mentindo que esta aberto. */
  sumir(): void {
    this.onmessage = null;
  }
}

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function assentar(n = 3): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

/** Abre o socket nativo e devolve o duplo ja pronto. */
function abrirNativo(url = 'wss://exemplo.com', opcoes = {}) {
  const s = createSocket(url, opcoes);
  const ws = FakeWebSocket.ultimo;
  ws.abrir();
  return { s, ws };
}

beforeEach(() => {
  document.body.innerHTML = '';
  FakeWebSocket.limpar();
  socket.setWebSocket(FakeWebSocket as never);
  socket.close();
});

afterEach(() => {
  socket.close();
  socket.setWebSocket(null);
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Conexao
// ---------------------------------------------------------------------------

describe('conexao', () => {
  it('abre e fica conectado', () => {
    const { s } = abrirNativo();
    expect(s.state).toBe('open');
    expect(s.connected).toBe(true);
    expect(s.url).toBe('wss://exemplo.com');
  });

  it('estado e connected sao reativos', async () => {
    const { s, ws } = abrirNativo();
    const vistos: string[] = [];
    const parar = (await import('../src/reactivity')).effect(() => {
      vistos.push(s.state);
    });
    ws.cair();
    await assentar();
    expect(vistos[0]).toBe('open');
    expect(vistos).toContain('reconnecting');
    parar.stop?.();
  });

  it('close explicito fecha e nao reconecta', () => {
    vi.useFakeTimers();
    const { s } = abrirNativo();
    s.close();
    expect(s.state).toBe('closed');
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
  });

  it('resolve enderecos relativos contra a pagina', () => {
    expect(resolveSocketURL('/chat')).toBe('ws://localhost:3000/chat');
    expect(resolveSocketURL('https://x.com/y')).toBe('wss://x.com/y');
    expect(resolveSocketURL('wss://x.com')).toBe('wss://x.com');
  });
});

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

describe('mensagens', () => {
  it('entrega o envelope { event, data } como evento nomeado', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('nova', (d) => recebidas.push(d));

    ws.receber(JSON.stringify({ event: 'nova', data: { texto: 'oi' } }));
    expect(recebidas).toEqual([{ texto: 'oi' }]);
  });

  it('texto puro cai em message sem quebrar', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('message', (d) => recebidas.push(d));

    ws.receber('nao sou json');
    ws.receber('{quebrado');
    expect(recebidas).toEqual(['nao sou json', '{quebrado']);
  });

  it('emit escreve o envelope no fio', () => {
    const { s, ws } = abrirNativo();
    s.emit('entrar', { sala: 'geral' });
    expect(JSON.parse(ws.enviados[0])).toEqual({ event: 'entrar', data: { sala: 'geral' } });
  });

  it('interceptadores de entrada e saida seguem o formato do http', () => {
    const soltarSaida = socket.interceptors.outgoing.use((m) => ({
      ...m,
      data: { ...(m.data as object), assinado: true },
    }));
    const soltarEntrada = socket.interceptors.incoming.use((m) =>
      m.event === 'ignorar' ? null : m
    );

    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('message', (d) => recebidas.push(d));

    s.emit('salvar', { id: 1 });
    expect(JSON.parse(ws.enviados[0]).data).toEqual({ id: 1, assinado: true });

    ws.receber(JSON.stringify({ event: 'ignorar', data: 1 }));
    ws.receber(JSON.stringify({ event: 'passa', data: 2 }));
    expect(recebidas).toEqual([2]);

    soltarSaida();
    soltarEntrada();
  });
});

// ---------------------------------------------------------------------------
// Fila de envio
// ---------------------------------------------------------------------------

describe('fila de envio', () => {
  it('emit antes de abrir enfileira e despacha na abertura', () => {
    const s = createSocket('wss://exemplo.com');
    const ws = FakeWebSocket.ultimo;

    s.emit('a', 1);
    s.emit('b', 2);
    expect(ws.enviados).toHaveLength(0);
    expect(s.queued).toBe(2);

    ws.abrir();
    expect(ws.enviados).toHaveLength(2);
    expect(s.queued).toBe(0);
  });

  it('a fila tem teto e descarta a mais antiga', () => {
    const s = createSocket('wss://exemplo.com', { queueLimit: 2 });
    const ws = FakeWebSocket.ultimo;
    s.emit('a', 1);
    s.emit('b', 2);
    s.emit('c', 3);
    expect(s.queued).toBe(2);

    ws.abrir();
    const eventos = ws.enviados.map((t) => JSON.parse(t).event);
    expect(eventos).toEqual(['b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// Reconexao
// ---------------------------------------------------------------------------

describe('reconexao', () => {
  it('espera crescente entre tentativas, sempre dentro do teto', () => {
    vi.useFakeTimers();
    // Sem jitter a espera fica deterministica e da para medir de verdade.
    const s = createSocket('wss://exemplo.com', {
      reconnectDelay: 100,
      reconnectMaxDelay: 400,
      jitter: 0,
      heartbeat: 0,
    });
    FakeWebSocket.ultimo.abrir();

    const esperas: number[] = [];
    s.on('reconnecting', (d) => esperas.push((d as { delay: number }).delay));

    for (let i = 0; i < 4; i++) {
      FakeWebSocket.ultimo.cair();
      vi.advanceTimersByTime(1000);
    }

    expect(esperas).toEqual([100, 200, 400, 400]);
    // Cada espera terminou abrindo um socket novo.
    expect(FakeWebSocket.abertos.length).toBe(5);
    s.close();
  });

  it('o sorteio mantem a espera dentro da janela do jitter', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', {
      reconnectDelay: 1000,
      jitter: 0.5,
      heartbeat: 0,
    });
    FakeWebSocket.ultimo.abrir();
    let espera = -1;
    s.on('reconnecting', (d) => {
      espera = (d as { delay: number }).delay;
    });
    FakeWebSocket.ultimo.cair();
    expect(espera).toBeGreaterThanOrEqual(500);
    expect(espera).toBeLessThanOrEqual(1500);
    s.close();
  });

  it('para de reconectar depois de close()', () => {
    vi.useFakeTimers();
    const { s } = abrirNativo('wss://exemplo.com', { reconnectDelay: 50, jitter: 0 });
    FakeWebSocket.ultimo.cair();
    // Cai, agenda, e o close() chega antes da hora da tentativa.
    s.close();
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
    expect(s.state).toBe('closed');
  });

  it('desiste depois do numero maximo de tentativas', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', {
      reconnectDelay: 10,
      jitter: 0,
      reconnectMaxAttempts: 2,
      heartbeat: 0,
    });
    FakeWebSocket.ultimo.abrir();
    for (let i = 0; i < 5; i++) {
      FakeWebSocket.ultimo.cair();
      vi.advanceTimersByTime(500);
    }
    // 1 inicial + 2 tentativas, e nada depois disso.
    expect(FakeWebSocket.abertos.length).toBe(3);
    expect(s.state).toBe('closed');
    expect(s.error).toContain('desistiu');
  });

  it('reconectar com sucesso zera o contador', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', { reconnectDelay: 10, jitter: 0, heartbeat: 0 });
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.cair();
    expect(s.attempts).toBe(1);
    vi.advanceTimersByTime(50);
    FakeWebSocket.ultimo.abrir();
    expect(s.attempts).toBe(0);
    s.close();
  });
});

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

describe('heartbeat', () => {
  it('manda ping no intervalo configurado', () => {
    vi.useFakeTimers();
    const { s, ws } = abrirNativo('wss://exemplo.com', {
      heartbeat: 1000,
      heartbeatTimeout: 5000,
    });
    vi.advanceTimersByTime(1000);
    expect(ws.enviados).toEqual(['ping']);
    s.close();
  });

  it('derruba a conexao morta mesmo com readyState dizendo que esta aberta', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', {
      heartbeat: 1000,
      heartbeatTimeout: 500,
      reconnectDelay: 10,
      jitter: 0,
    });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    // A rede caiu sem FIN: nada mais chega, mas o socket jura estar aberto.
    ws.sumir();
    expect(ws.readyState).toBe(1);

    vi.advanceTimersByTime(1600);
    expect(s.connected).toBe(false);
    expect(s.error).toContain('sem resposta');
    // E a reconexao entra em cena sozinha.
    vi.advanceTimersByTime(50);
    expect(FakeWebSocket.abertos.length).toBe(2);
    s.close();
  });

  it('trafego conta como prova de vida e adia a queda', () => {
    vi.useFakeTimers();
    const { s, ws } = abrirNativo('wss://exemplo.com', {
      heartbeat: 1000,
      heartbeatTimeout: 500,
    });
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
      ws.receber('oi');
    }
    expect(s.connected).toBe(true);
    s.close();
  });

  it('o pong nao vira mensagem da aplicacao', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('message', (d) => recebidas.push(d));
    ws.receber('pong');
    expect(recebidas).toHaveLength(0);
    s.close();
  });
});

// ---------------------------------------------------------------------------
// Protocolo Socket.IO
// ---------------------------------------------------------------------------

describe('protocolo Socket.IO', () => {
  it('le o pacote de abertura do Engine.IO', () => {
    const p = decodeEngine('0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}');
    expect(p.kind).toBe('open');
    if (p.kind === 'open') {
      expect(p.handshake.sid).toBe('abc');
      expect(p.handshake.pingInterval).toBe(25000);
    }
  });

  it('classifica ping, pong, close e noop', () => {
    expect(decodeEngine('2').kind).toBe('ping');
    expect(decodeEngine('3').kind).toBe('pong');
    expect(decodeEngine('1').kind).toBe('close');
    expect(decodeEngine('6').kind).toBe('noop');
    expect(decodeEngine(new ArrayBuffer(2)).kind).toBe('unknown');
  });

  it('separa tipo, namespace, ack e corpo', () => {
    expect(decodeSocketIo('2["oi",1]')).toEqual({
      type: 2,
      namespace: '/',
      ack: undefined,
      data: ['oi', 1],
    });
    expect(decodeSocketIo('212["salvar",{"a":1}]')).toEqual({
      type: 2,
      namespace: '/',
      ack: 12,
      data: ['salvar', { a: 1 }],
    });
    expect(decodeSocketIo('2/admin,3["x"]')).toEqual({
      type: 2,
      namespace: '/admin',
      ack: 3,
      data: ['x'],
    });
    expect(decodeSocketIo('0{"sid":"z"}')).toEqual({
      type: 0,
      namespace: '/',
      ack: undefined,
      data: { sid: 'z' },
    });
  });

  it('monta pacotes de volta', () => {
    expect(encodeSocketIo({ type: 2, namespace: '/', data: ['oi', 1] })).toBe('42["oi",1]');
    expect(encodeSocketIo({ type: 3, namespace: '/', ack: 7, data: [true] })).toBe('437[true]');
    expect(encodeSocketIo({ type: 0, namespace: '/admin' })).toBe('40/admin,');
  });

  it('monta a URL do endpoint', () => {
    expect(engineURL('ws://localhost:3000')).toBe(
      'ws://localhost:3000/socket.io/?EIO=4&transport=websocket'
    );
    expect(engineURL('ws://x.com', 'rt')).toBe('ws://x.com/rt/?EIO=4&transport=websocket');
  });

  it('faz o handshake completo e so entao conta como aberto', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    expect(ws.url).toContain('/socket.io/?EIO=4&transport=websocket');

    ws.abrir();
    // TCP aberto ainda nao e conexao Socket.IO.
    expect(s.connected).toBe(false);

    ws.receber('0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}');
    expect(ws.enviados).toContain('40');
    expect(s.connected).toBe(false);

    ws.receber('40{"sid":"abc"}');
    expect(s.connected).toBe(true);
    s.close();
  });

  it('responde o ping do servidor com pong', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    ws.receber('0{"sid":"a","pingInterval":25000,"pingTimeout":20000}');
    ws.receber('40{"sid":"a"}');
    ws.enviados.length = 0;

    ws.receber('2');
    expect(ws.enviados).toEqual(['3']);
    s.close();
  });

  it('entrega eventos e resolve acks', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    ws.receber('0{"sid":"a","pingInterval":25000,"pingTimeout":20000}');
    ws.receber('40{"sid":"a"}');
    ws.enviados.length = 0;

    const recebidas: unknown[] = [];
    s.on('mensagem', (d) => recebidas.push(d));
    ws.receber('42["mensagem",{"texto":"oi"}]');
    expect(recebidas).toEqual([{ texto: 'oi' }]);

    let resposta: unknown = null;
    s.emit('salvar', { id: 1 }, (r) => {
      resposta = r;
    });
    expect(ws.enviados[0]).toBe('421["salvar",{"id":1}]');
    ws.receber('431[{"ok":true}]');
    expect(resposta).toEqual({ ok: true });
    s.close();
  });

  it('responde um evento que pede confirmacao', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    ws.receber('0{"sid":"a","pingInterval":25000,"pingTimeout":20000}');
    ws.receber('40{"sid":"a"}');
    ws.enviados.length = 0;

    s.on('pergunta', (_d, ack) => ack?.('sim'));
    ws.receber('429["pergunta",{"q":1}]');
    expect(ws.enviados).toEqual(['439["sim"]']);
    s.close();
  });

  it('derruba quando o servidor recusa a conexao', () => {
    vi.useFakeTimers();
    const s = createSocket('/', { transport: 'socket.io', reconnectDelay: 10, jitter: 0 });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    ws.receber('0{"sid":"a","pingInterval":25000,"pingTimeout":20000}');
    ws.receber('44{"message":"sem permissao"}');
    expect(s.error).toBe('sem permissao');
    expect(s.connected).toBe(false);
    s.close();
  });
});

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

describe('salas', () => {
  it('join pede entrada e leave pede saida', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    expect(JSON.parse(ws.enviados[0])).toEqual({
      event: 'join',
      data: { room: 'geral', private: false },
    });
    expect(sala.name).toBe('geral');
    expect(sala.estado).toBe('joined');

    ws.enviados.length = 0;
    sala.leave();
    expect(JSON.parse(ws.enviados[0])).toEqual({ event: 'leave', data: { room: 'geral' } });
    expect(sala.estado).toBe('left');
    expect(s.rooms).toHaveLength(0);
  });

  it('join e idempotente: mesma sala, mesmo objeto, um pedido so', () => {
    const { s, ws } = abrirNativo();
    const a = s.join('geral');
    const b = s.join('geral');
    expect(b).toBe(a);
    expect(ws.enviados).toHaveLength(1);
    expect(s.rooms).toHaveLength(1);

    // E o ouvinte tambem nao duplica.
    const vistas: unknown[] = [];
    a.on('mensagem', (d) => vistas.push(d));
    b.on('mensagem', (d) => vistas.push(d));
    FakeWebSocket.ultimo.receber(
      JSON.stringify({ event: 'mensagem', data: { room: 'geral', data: { texto: 'x' } } })
    );
    expect(vistas).toEqual([{ texto: 'x' }, { texto: 'x' }]);
  });

  it('leave duas vezes nao quebra nem manda dois pedidos', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    ws.enviados.length = 0;
    sala.leave();
    sala.leave();
    expect(ws.enviados).toHaveLength(1);
  });

  it('envelope de sala no transporte nativo', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    ws.enviados.length = 0;

    sala.emit('mensagem', { texto: 'oi' });
    expect(JSON.parse(ws.enviados[0])).toEqual({
      event: 'mensagem',
      data: { room: 'geral', data: { texto: 'oi' } },
    });

    const recebidas: unknown[] = [];
    sala.on('mensagem', (d) => recebidas.push(d));
    ws.receber(
      JSON.stringify({ event: 'mensagem', data: { room: 'geral', data: { texto: 'volta' } } })
    );
    expect(recebidas).toEqual([{ texto: 'volta' }]);
    expect(sala.mensagens).toEqual([{ texto: 'volta' }]);
  });

  it('mensagem de outra sala nao entra nesta', () => {
    const { s, ws } = abrirNativo();
    const geral = s.join('geral');
    const outra = s.join('outra');
    const vistas: string[] = [];
    geral.on('mensagem', () => vistas.push('geral'));
    outra.on('mensagem', () => vistas.push('outra'));

    ws.receber(JSON.stringify({ event: 'mensagem', data: { room: 'outra', data: 1 } }));
    expect(vistas).toEqual(['outra']);
  });

  it('rooms do Socket.IO usam o mesmo envelope sobre o protocolo', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    ws.receber('0{"sid":"a","pingInterval":25000,"pingTimeout":20000}');
    ws.receber('40{"sid":"a"}');
    ws.enviados.length = 0;

    const sala = s.join('geral');
    expect(ws.enviados[0]).toBe('42["join",{"room":"geral","private":false}]');

    const recebidas: unknown[] = [];
    sala.on('mensagem', (d) => recebidas.push(d));
    ws.receber('42["mensagem",{"room":"geral","data":{"texto":"oi"}}]');
    expect(recebidas).toEqual([{ texto: 'oi' }]);
    s.close();
  });

  it('reentra nas salas depois da reconexao', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', {
      reconnectDelay: 10,
      jitter: 0,
      heartbeat: 0,
    });
    FakeWebSocket.ultimo.abrir();
    s.join('geral');
    s.join('dm:ana', { privada: true });

    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(50);
    const novo = FakeWebSocket.ultimo;
    expect(novo).not.toBe(FakeWebSocket.abertos[0]);
    novo.abrir();

    const pedidos = novo.enviados.map((t) => JSON.parse(t));
    expect(pedidos).toEqual([
      { event: 'join', data: { room: 'geral', private: false } },
      { event: 'join', data: { room: 'dm:ana', private: true } },
    ]);
    s.close();
  });

  it('uma sala abandonada nao volta na reconexao', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', { reconnectDelay: 10, jitter: 0, heartbeat: 0 });
    FakeWebSocket.ultimo.abrir();
    s.join('geral').leave();

    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(50);
    const novo = FakeWebSocket.ultimo;
    novo.abrir();
    expect(novo.enviados).toHaveLength(0);
    s.close();
  });

  it('mensagem privada vai endereçada', () => {
    const { s, ws } = abrirNativo();
    ws.enviados.length = 0;
    s.to('ana').emit('cochicho', { texto: 'oi' });
    expect(JSON.parse(ws.enviados[0])).toEqual({
      event: 'cochicho',
      data: { to: 'ana', data: { texto: 'oi' } },
    });

    const dm = s.join('dm:ana', { privada: true });
    expect(dm.privada).toBe(true);
    ws.enviados.length = 0;
    dm.to('ana').emit('mensagem', 'oi');
    expect(JSON.parse(ws.enviados[0])).toEqual({
      event: 'mensagem',
      data: { room: 'dm:ana', to: 'ana', data: 'oi' },
    });
  });
});

// ---------------------------------------------------------------------------
// Presenca
// ---------------------------------------------------------------------------

describe('presenca', () => {
  it('a lista vem do servidor, e so dele', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    // Antes de o servidor falar, ninguem esta na sala. Nada de inventar.
    expect(sala.membros).toEqual([]);

    ws.receber(
      JSON.stringify({
        event: 'room:members',
        data: { room: 'geral', members: ['ana', 'bia'] },
      })
    );
    expect(sala.membros).toEqual(['ana', 'bia']);
  });

  it('entrou e saiu atualizam a lista e disparam evento', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    const entradas: unknown[] = [];
    const saidas: unknown[] = [];
    sala.on('entrou', (m) => entradas.push(m));
    sala.on('saiu', (m) => saidas.push(m));

    ws.receber(
      JSON.stringify({ event: 'room:joined', data: { room: 'geral', member: { id: 'ana' } } })
    );
    ws.receber(
      JSON.stringify({ event: 'room:joined', data: { room: 'geral', member: { id: 'ana' } } })
    );
    expect(sala.membros).toEqual([{ id: 'ana' }]);
    expect(entradas).toHaveLength(2);

    ws.receber(JSON.stringify({ event: 'room:left', data: { room: 'geral', member: 'ana' } }));
    expect(sala.membros).toEqual([]);
    expect(saidas).toEqual(['ana']);
  });

  it('presenca nao entra na lista de mensagens da sala', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    ws.receber(
      JSON.stringify({ event: 'room:members', data: { room: 'geral', members: ['ana'] } })
    );
    expect(sala.mensagens).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

describe('v-socket', () => {
  it('publica $socket no escopo e reage a conexao', async () => {
    const { root, estado } = montar(
      '<div v-socket="wss://exemplo.com"><p v-show="$socket.conectado">on</p></div>'
    );
    await assentar();
    const p = root.querySelector('p')!;
    expect(p.style.display).toBe('none');

    FakeWebSocket.ultimo.abrir();
    await assentar();
    expect(p.style.display).not.toBe('none');
    void estado;
  });

  it('v-on-socket liga o evento a uma expressao com $event', async () => {
    const { root, estado } = montar(
      '<div v-socket="wss://exemplo.com" v-on-socket:nova="itens.push($event)"></div>',
      { itens: [] }
    );
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.receber(JSON.stringify({ event: 'nova', data: 'oi' }));
    await assentar();
    expect((estado as { itens: unknown[] }).itens).toEqual(['oi']);
    void root;
  });

  it('v-room publica $room com mensagens e membros', async () => {
    const { root } = montar(
      '<div v-socket="wss://exemplo.com" v-room="geral">' +
        '<span v-text="$room.membros.length"></span>' +
        '<b v-text="$room.mensagens.length"></b>' +
        '</div>'
    );
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    await assentar();

    ws.receber(
      JSON.stringify({ event: 'room:members', data: { room: 'geral', members: ['ana'] } })
    );
    ws.receber(JSON.stringify({ event: 'mensagem', data: { room: 'geral', data: { t: 1 } } }));
    await assentar();

    expect(root.querySelector('span')!.textContent).toBe('1');
    expect(root.querySelector('b')!.textContent).toBe('1');
  });

  it('.manual nao conecta sozinho, e abrir() conecta', () => {
    montar('<div v-socket.manual="wss://exemplo.com"></div>');
    // Nenhum WebSocket foi sequer construido.
    expect(FakeWebSocket.abertos).toHaveLength(0);

    // O socket existe e esta registrado, so nao abriu.
    expect(socket.open).toHaveLength(1);
    socket.open[0].open();
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('.no-reconnect nao reconecta quando a conexao cai', () => {
    vi.useFakeTimers();
    montar('<div v-socket.no-reconnect="wss://exemplo.com"></div>');
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('v-socket-reconnect="false" tambem desliga, e e a forma valida em HTML', () => {
    vi.useFakeTimers();
    montar('<div v-socket="wss://exemplo.com" v-socket-reconnect="false"></div>');
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('sem WebSocket no ambiente marca unsupported e nao lanca', () => {
    const guardado = (globalThis as { WebSocket?: unknown }).WebSocket;
    socket.setWebSocket(null);
    delete (globalThis as { WebSocket?: unknown }).WebSocket;
    try {
      expect(socketSupported()).toBe(false);
      expect(() => createSocket('wss://x')).not.toThrow();
      const inerte = createSocket('wss://x');
      expect(inerte.state).toBe('closed');
      expect(inerte.error).toContain('indisponivel');

      const { root } = montar('<div v-socket="wss://x"></div>');
      const div = root.querySelector('div')!;
      expect(div.getAttribute('data-socket')).toBe('unsupported');
    } finally {
      (globalThis as { WebSocket?: unknown }).WebSocket = guardado;
      socket.setWebSocket(FakeWebSocket as never);
    }
  });
});

// ---------------------------------------------------------------------------
// Limpeza
// ---------------------------------------------------------------------------

describe('limpeza', () => {
  it('destruir o elemento fecha a conexao e nao deixa timer nem listener', () => {
    vi.useFakeTimers();
    const { root } = montar(
      '<div v-socket="wss://exemplo.com" v-room="geral" v-on-socket:nova="1"></div>'
    );
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    expect(ws.fechado).toBe(false);

    destroy(root);
    root.remove();

    expect(ws.fechado).toBe(true);
    // Nenhum callback continua pendurado no socket antigo.
    expect(ws.onmessage).toBeNull();
    expect(ws.onclose).toBeNull();
    expect(ws.onopen).toBeNull();
    expect(ws.onerror).toBeNull();

    // E nenhum timer sobrevive para reabrir a conexao depois.
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
  });

  it('destruir o elemento tira o socket da lista de abertos', () => {
    const { root } = montar('<div v-socket="wss://exemplo.com"></div>');
    FakeWebSocket.ultimo.abrir();
    expect(socket.open.length).toBeGreaterThan(0);
    destroy(root);
    expect(socket.open).toHaveLength(0);
  });

  it('V.socket.close() derruba todas as conexoes', () => {
    const a = createSocket('wss://a');
    const b = createSocket('wss://b');
    FakeWebSocket.abertos.forEach((w) => w.abrir());
    expect(socket.open).toHaveLength(2);
    socket.close();
    expect(a.state).toBe('closed');
    expect(b.state).toBe('closed');
    expect(socket.open).toHaveLength(0);
  });

  it('close() esvazia a fila e desmonta as salas', () => {
    const { s } = abrirNativo();
    s.join('geral');
    s.close();
    expect(s.rooms).toHaveLength(0);
    s.emit('x', 1);
    expect(s.queued).toBe(1);
    s.close();
    expect(s.queued).toBe(0);
  });
});
