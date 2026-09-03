/**
 * Real-time layer.
 *
 * jsdom has a `WebSocket` class, but it opens a real socket: using the native
 * one here would mean a test depending on the network, and a test that depends
 * on the network is not a test. So the module gets a controllable double
 * through `socket.defaults.WebSocket`, and every case decides by hand when the
 * connection opens, what arrives and when it drops. The "environment without
 * WebSocket" path is the only one that touches the global, and it gives back
 * what it took.
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
// Registers the core directives (v-show, v-text, v-for) and the socket ones.
import '../src/core';
import '../src/directives/socket';

// ---------------------------------------------------------------------------
// WebSocket double
// ---------------------------------------------------------------------------

/** Imitates the WebSocket API without touching any network. */
class FakeWebSocket implements WebSocketLike {
  static abertos: FakeWebSocket[] = [];
  /** The last socket constructed, which is almost always the one the test wants. */
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

  // --- test controls ---

  /** Makes the handshake open. */
  abrir(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  /** Delivers a frame coming from the server. */
  receber(data: unknown): void {
    this.onmessage?.({ data });
  }

  /** Connection drop coming from outside, with no `close()` from the client. */
  cair(code = 1006): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  /** Disappears without warning: `readyState` keeps lying that it is open. */
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

/** Opens the native socket and returns the double ready to use. */
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
// Connection
// ---------------------------------------------------------------------------

describe('connection', () => {
  it('opens and stays connected', () => {
    const { s } = abrirNativo();
    expect(s.state).toBe('open');
    expect(s.connected).toBe(true);
    expect(s.url).toBe('wss://exemplo.com');
  });

  it('state and connected are reactive', async () => {
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

  it('an explicit close closes and does not reconnect', () => {
    vi.useFakeTimers();
    const { s } = abrirNativo();
    s.close();
    expect(s.state).toBe('closed');
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
  });

  it('resolves relative addresses against the page', () => {
    expect(resolveSocketURL('/chat')).toBe('ws://localhost:3000/chat');
    expect(resolveSocketURL('https://x.com/y')).toBe('wss://x.com/y');
    expect(resolveSocketURL('wss://x.com')).toBe('wss://x.com');
  });
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

describe('messages', () => {
  it('delivers the { event, data } envelope as a named event', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('nova', (d) => recebidas.push(d));

    ws.receber(JSON.stringify({ event: 'nova', data: { texto: 'oi' } }));
    expect(recebidas).toEqual([{ texto: 'oi' }]);
  });

  it('plain text falls into message without breaking', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('message', (d) => recebidas.push(d));

    ws.receber('nao sou json');
    ws.receber('{quebrado');
    expect(recebidas).toEqual(['nao sou json', '{quebrado']);
  });

  it('emit writes the envelope onto the wire', () => {
    const { s, ws } = abrirNativo();
    s.emit('entrar', { sala: 'geral' });
    expect(JSON.parse(ws.enviados[0])).toEqual({ event: 'entrar', data: { sala: 'geral' } });
  });

  it('incoming and outgoing interceptors follow the http format', () => {
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
// Send queue
// ---------------------------------------------------------------------------

describe('send queue', () => {
  it('an emit before opening queues up and is dispatched on open', () => {
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

  it('the queue has a ceiling and drops the oldest one', () => {
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
// Reconnection
// ---------------------------------------------------------------------------

describe('reconnection', () => {
  it('a growing wait between attempts, always within the ceiling', () => {
    vi.useFakeTimers();
    // Without jitter the wait is deterministic and can really be measured.
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
    // Each wait ended by opening a new socket.
    expect(FakeWebSocket.abertos.length).toBe(5);
    s.close();
  });

  it('the draw keeps the wait inside the jitter window', () => {
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

  it('stops reconnecting after close()', () => {
    vi.useFakeTimers();
    const { s } = abrirNativo('wss://exemplo.com', { reconnectDelay: 50, jitter: 0 });
    FakeWebSocket.ultimo.cair();
    // It drops, it schedules, and the close() arrives before the attempt is due.
    s.close();
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
    expect(s.state).toBe('closed');
  });

  it('gives up after the maximum number of attempts', () => {
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
    // 1 initial + 2 attempts, and nothing after that.
    expect(FakeWebSocket.abertos.length).toBe(3);
    expect(s.state).toBe('closed');
    expect(s.error).toContain('gave up after');
  });

  it('reconnecting successfully resets the counter', () => {
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
  it('sends a ping at the configured interval', () => {
    vi.useFakeTimers();
    const { s, ws } = abrirNativo('wss://exemplo.com', {
      heartbeat: 1000,
      heartbeatTimeout: 5000,
    });
    vi.advanceTimersByTime(1000);
    expect(ws.enviados).toEqual(['ping']);
    s.close();
  });

  it('drops the dead connection even with readyState saying it is open', () => {
    vi.useFakeTimers();
    const s = createSocket('wss://exemplo.com', {
      heartbeat: 1000,
      heartbeatTimeout: 500,
      reconnectDelay: 10,
      jitter: 0,
    });
    const ws = FakeWebSocket.ultimo;
    ws.abrir();
    // The network went down with no FIN: nothing else arrives, but the socket swears it is open.
    ws.sumir();
    expect(ws.readyState).toBe(1);

    vi.advanceTimersByTime(1600);
    expect(s.connected).toBe(false);
    expect(s.error).toContain('connection unresponsive');
    // And the reconnection comes on stage by itself.
    vi.advanceTimersByTime(50);
    expect(FakeWebSocket.abertos.length).toBe(2);
    s.close();
  });

  it('traffic counts as proof of life and postpones the drop', () => {
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

  it('the pong does not become an application message', () => {
    const { s, ws } = abrirNativo();
    const recebidas: unknown[] = [];
    s.on('message', (d) => recebidas.push(d));
    ws.receber('pong');
    expect(recebidas).toHaveLength(0);
    s.close();
  });
});

// ---------------------------------------------------------------------------
// Socket.IO protocol
// ---------------------------------------------------------------------------

describe('Socket.IO protocol', () => {
  it('reads the Engine.IO open packet', () => {
    const p = decodeEngine('0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}');
    expect(p.kind).toBe('open');
    if (p.kind === 'open') {
      expect(p.handshake.sid).toBe('abc');
      expect(p.handshake.pingInterval).toBe(25000);
    }
  });

  it('classifies ping, pong, close and noop', () => {
    expect(decodeEngine('2').kind).toBe('ping');
    expect(decodeEngine('3').kind).toBe('pong');
    expect(decodeEngine('1').kind).toBe('close');
    expect(decodeEngine('6').kind).toBe('noop');
    expect(decodeEngine(new ArrayBuffer(2)).kind).toBe('unknown');
  });

  it('separates type, namespace, ack and body', () => {
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

  it('assembles packets on the way back', () => {
    expect(encodeSocketIo({ type: 2, namespace: '/', data: ['oi', 1] })).toBe('42["oi",1]');
    expect(encodeSocketIo({ type: 3, namespace: '/', ack: 7, data: [true] })).toBe('437[true]');
    expect(encodeSocketIo({ type: 0, namespace: '/admin' })).toBe('40/admin,');
  });

  it('assembles the endpoint URL', () => {
    expect(engineURL('ws://localhost:3000')).toBe(
      'ws://localhost:3000/socket.io/?EIO=4&transport=websocket'
    );
    expect(engineURL('ws://x.com', 'rt')).toBe('ws://x.com/rt/?EIO=4&transport=websocket');
  });

  it('does the full handshake and only then counts as open', () => {
    const s = createSocket('/', { transport: 'socket.io' });
    const ws = FakeWebSocket.ultimo;
    expect(ws.url).toContain('/socket.io/?EIO=4&transport=websocket');

    ws.abrir();
    // An open TCP is not a Socket.IO connection yet.
    expect(s.connected).toBe(false);

    ws.receber('0{"sid":"abc","pingInterval":25000,"pingTimeout":20000}');
    expect(ws.enviados).toContain('40');
    expect(s.connected).toBe(false);

    ws.receber('40{"sid":"abc"}');
    expect(s.connected).toBe(true);
    s.close();
  });

  it('answers the server ping with a pong', () => {
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

  it('delivers events and resolves acks', () => {
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

  it('answers an event that asks for confirmation', () => {
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

  it('drops when the server refuses the connection', () => {
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
// Rooms
// ---------------------------------------------------------------------------

describe('rooms', () => {
  it('join asks to enter and leave asks to exit', () => {
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

  it('join is idempotent: same room, same object, a single request', () => {
    const { s, ws } = abrirNativo();
    const a = s.join('geral');
    const b = s.join('geral');
    expect(b).toBe(a);
    expect(ws.enviados).toHaveLength(1);
    expect(s.rooms).toHaveLength(1);

    // And the listener does not duplicate either.
    const vistas: unknown[] = [];
    a.on('mensagem', (d) => vistas.push(d));
    b.on('mensagem', (d) => vistas.push(d));
    FakeWebSocket.ultimo.receber(
      JSON.stringify({ event: 'mensagem', data: { room: 'geral', data: { texto: 'x' } } })
    );
    expect(vistas).toEqual([{ texto: 'x' }, { texto: 'x' }]);
  });

  it('leaving twice neither breaks nor sends two requests', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    ws.enviados.length = 0;
    sala.leave();
    sala.leave();
    expect(ws.enviados).toHaveLength(1);
  });

  it('room envelope on the native transport', () => {
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

  it('a message from another room does not enter this one', () => {
    const { s, ws } = abrirNativo();
    const geral = s.join('geral');
    const outra = s.join('outra');
    const vistas: string[] = [];
    geral.on('mensagem', () => vistas.push('geral'));
    outra.on('mensagem', () => vistas.push('outra'));

    ws.receber(JSON.stringify({ event: 'mensagem', data: { room: 'outra', data: 1 } }));
    expect(vistas).toEqual(['outra']);
  });

  it('Socket.IO rooms use the same envelope over the protocol', () => {
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

  it('rejoins the rooms after the reconnection', () => {
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

  it('an abandoned room does not come back on reconnection', () => {
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

  it('a private message goes addressed', () => {
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
// Presence
// ---------------------------------------------------------------------------

describe('presence', () => {
  it('the list comes from the server, and only from it', () => {
    const { s, ws } = abrirNativo();
    const sala = s.join('geral');
    // Before the server speaks, nobody is in the room. No making things up.
    expect(sala.membros).toEqual([]);

    ws.receber(
      JSON.stringify({
        event: 'room:members',
        data: { room: 'geral', members: ['ana', 'bia'] },
      })
    );
    expect(sala.membros).toEqual(['ana', 'bia']);
  });

  it('joined and left update the list and fire an event', () => {
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

  it('presence does not enter the room message list', () => {
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
  it('publishes $socket in the scope and reacts to the connection', async () => {
    const { root, estado } = montar(
      '<div v-socket="wss://exemplo.com"><p v-show="$socket.connected">on</p></div>'
    );
    await assentar();
    const p = root.querySelector('p')!;
    expect(p.style.display).toBe('none');

    FakeWebSocket.ultimo.abrir();
    await assentar();
    expect(p.style.display).not.toBe('none');
    void estado;
  });

  it('v-on-socket wires the event to an expression with $event', async () => {
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

  it('v-room publishes $room with messages and members', async () => {
    const { root } = montar(
      '<div v-socket="wss://exemplo.com" v-room="geral">' +
        '<span v-text="$room.members.length"></span>' +
        '<b v-text="$room.messages.length"></b>' +
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

  it('.manual does not connect on its own, and open() connects', () => {
    montar('<div v-socket.manual="wss://exemplo.com"></div>');
    // Not a single WebSocket was even constructed.
    expect(FakeWebSocket.abertos).toHaveLength(0);

    // The socket exists and is registered, it just did not open.
    expect(socket.open).toHaveLength(1);
    socket.open[0].open();
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('.no-reconnect does not reconnect when the connection drops', () => {
    vi.useFakeTimers();
    montar('<div v-socket.no-reconnect="wss://exemplo.com"></div>');
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('v-socket-reconnect="false" also switches it off, and it is the valid form in HTML', () => {
    vi.useFakeTimers();
    montar('<div v-socket="wss://exemplo.com" v-socket-reconnect="false"></div>');
    FakeWebSocket.ultimo.abrir();
    FakeWebSocket.ultimo.cair();
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.abertos).toHaveLength(1);
  });

  it('with no WebSocket in the environment it marks unsupported and does not throw', () => {
    const guardado = (globalThis as { WebSocket?: unknown }).WebSocket;
    socket.setWebSocket(null);
    delete (globalThis as { WebSocket?: unknown }).WebSocket;
    try {
      expect(socketSupported()).toBe(false);
      expect(() => createSocket('wss://x')).not.toThrow();
      const inerte = createSocket('wss://x');
      expect(inerte.state).toBe('closed');
      expect(inerte.error).toContain('unavailable');

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
// Cleanup
// ---------------------------------------------------------------------------

describe('cleanup', () => {
  it('destroying the element closes the connection and leaves no timer or listener', () => {
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
    // No callback stays hanging on the old socket.
    expect(ws.onmessage).toBeNull();
    expect(ws.onclose).toBeNull();
    expect(ws.onopen).toBeNull();
    expect(ws.onerror).toBeNull();

    // And no timer survives to reopen the connection later.
    const quantos = FakeWebSocket.abertos.length;
    vi.advanceTimersByTime(120_000);
    expect(FakeWebSocket.abertos.length).toBe(quantos);
  });

  it('destroying the element takes the socket off the open list', () => {
    const { root } = montar('<div v-socket="wss://exemplo.com"></div>');
    FakeWebSocket.ultimo.abrir();
    expect(socket.open.length).toBeGreaterThan(0);
    destroy(root);
    expect(socket.open).toHaveLength(0);
  });

  it('V.socket.close() drops every connection', () => {
    const a = createSocket('wss://a');
    const b = createSocket('wss://b');
    FakeWebSocket.abertos.forEach((w) => w.abrir());
    expect(socket.open).toHaveLength(2);
    socket.close();
    expect(a.state).toBe('closed');
    expect(b.state).toBe('closed');
    expect(socket.open).toHaveLength(0);
  });

  it('close() empties the queue and tears the rooms down', () => {
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
