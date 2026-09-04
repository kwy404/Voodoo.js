/**
 * Chat server for the demo `examples/chat-tempo-real/`.
 *
 * Serves the project's static files and speaks WebSocket on the same port, with no
 * dependencies: the RFC 6455 handshake and framing are written here, using `node:crypto`
 * for `Sec-WebSocket-Accept` and nothing else.
 *
 * Usage:
 *   node scripts/chat-servidor.mjs          port 5174
 *   node scripts/chat-servidor.mjs 8080     choose the port
 *
 * Then open http://localhost:5174/examples/chat-tempo-real/ in two tabs.
 *
 * The server speaks the envelope of Voodoo's `socket` module, described in
 * `docs/websocket.md`:
 *
 *   { "event": "join",     "data": { "room": "geral", "private": false } }
 *   { "event": "mensagem", "data": { "room": "geral", "data": { ... } } }
 *   { "event": "mensagem", "data": { "room": "geral", "to": "id", "data": {...} } }
 *
 * And the point that the documentation repeats and this file demonstrates: **it is
 * the server that decides what is private**. The `podeEntrar` function below is the place
 * where room authorization would actually happen; here it is permissive on purpose,
 * because this is a demo and it is marked as such.
 */

import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const porta = Number(process.argv[2] || 5174);
const raiz = resolve('.');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
};

// ---------------------------------------------------------------------------
// RFC 6455 framing, only what's needed for text
// ---------------------------------------------------------------------------

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** Assembles a text frame. Payloads larger than 64 KB do not appear here. */
function enquadrar(texto, opcode = 0x1) {
  const carga = Buffer.from(texto, 'utf8');
  const tamanho = carga.length;

  let cabecalho;
  if (tamanho < 126) {
    cabecalho = Buffer.alloc(2);
    cabecalho[1] = tamanho;
  } else if (tamanho < 65_536) {
    cabecalho = Buffer.alloc(4);
    cabecalho[1] = 126;
    cabecalho.writeUInt16BE(tamanho, 2);
  } else {
    cabecalho = Buffer.alloc(10);
    cabecalho[1] = 127;
    cabecalho.writeBigUInt64BE(BigInt(tamanho), 2);
  }
  cabecalho[0] = 0x80 | opcode; // FIN + opcode
  return Buffer.concat([cabecalho, carga]);
}

/**
 * Reads complete frames from the accumulated buffer.
 *
 * TCP does not respect message boundaries: one frame can arrive split into three
 * pieces or three frames can arrive together. That is why the buffer is accumulated
 * and only complete frames are consumed.
 */
function lerQuadros(estado) {
  const quadros = [];

  for (;;) {
    const b = estado.buffer;
    if (b.length < 2) break;

    const opcode = b[0] & 0x0f;
    const mascarado = (b[1] & 0x80) === 0x80;
    let tamanho = b[1] & 0x7f;
    let i = 2;

    if (tamanho === 126) {
      if (b.length < 4) break;
      tamanho = b.readUInt16BE(2);
      i = 4;
    } else if (tamanho === 127) {
      if (b.length < 10) break;
      tamanho = Number(b.readBigUInt64BE(2));
      i = 10;
    }

    let mascara = null;
    if (mascarado) {
      if (b.length < i + 4) break;
      mascara = b.subarray(i, i + 4);
      i += 4;
    }
    if (b.length < i + tamanho) break;

    const carga = Buffer.from(b.subarray(i, i + tamanho));
    // The client always masks. Unmasking is an XOR with a 4-byte key.
    if (mascara) for (let k = 0; k < carga.length; k++) carga[k] ^= mascara[k % 4];

    estado.buffer = b.subarray(i + tamanho);
    quadros.push({ opcode, carga });
  }

  return quadros;
}

// ---------------------------------------------------------------------------
// Chat state
// ---------------------------------------------------------------------------

/** id -> { socket, estado, nome, salas: Set<string> } */
const clientes = new Map();
/** room name -> Set<id> */
const salas = new Map();

/**
 * Room authorization. **This is where privacy actually happens.**
 *
 * In a real application, session checks, invitations, and blocks would go here.
 * In this demo anyone enters any room, and that is a deliberate choice of a demo,
 * not a pattern to copy.
 */
function podeEntrar(cliente, sala) {
  // Regra de exemplo: uma sala `dm:<a>+<b>` so aceita `<a>` e `<b>`.
  if (sala.startsWith('dm:')) {
    const partes = sala.slice(3).split('+');
    return partes.includes(cliente.nome);
  }
  return true;
}

function enviar(cliente, evento, dados) {
  if (cliente.socket.destroyed) return;
  cliente.socket.write(enquadrar(JSON.stringify({ event: evento, data: dados })));
}

function paraSala(nomeSala, evento, dados, exceto = null) {
  for (const id of salas.get(nomeSala) ?? []) {
    if (id === exceto) continue;
    const c = clientes.get(id);
    if (c) enviar(c, evento, dados);
  }
}

function membrosDe(nomeSala) {
  return [...(salas.get(nomeSala) ?? [])].map((id) => ({
    id,
    nome: clientes.get(id)?.nome ?? id,
  }));
}

function entrar(cliente, nomeSala) {
  if (!podeEntrar(cliente, nomeSala)) {
    enviar(cliente, 'erro', { room: nomeSala, message: 'no permission in this room' });
    return;
  }
  if (!salas.has(nomeSala)) salas.set(nomeSala, new Set());
  salas.get(nomeSala).add(cliente.id);
  cliente.salas.add(nomeSala);

  // The person who joined gets the full list; those already there get just the newcomer.
  enviar(cliente, 'room:members', { room: nomeSala, members: membrosDe(nomeSala) });
  paraSala(
    nomeSala,
    'room:joined',
    { room: nomeSala, member: { id: cliente.id, nome: cliente.nome } },
    cliente.id
  );
}

function sair(cliente, nomeSala) {
  salas.get(nomeSala)?.delete(cliente.id);
  cliente.salas.delete(nomeSala);
  paraSala(nomeSala, 'room:left', { room: nomeSala, member: { id: cliente.id } });
  if (!salas.get(nomeSala)?.size) salas.delete(nomeSala);
}

function tratarMensagem(cliente, texto) {
  // The heartbeat of the native transport is plain text, not JSON.
  if (texto === 'ping') {
    cliente.socket.write(enquadrar('pong'));
    return;
  }

  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    return;
  }
  const evento = pacote?.event;
  const dados = pacote?.data ?? {};

  if (evento === 'join') return entrar(cliente, dados.room);
  if (evento === 'leave') return sair(cliente, dados.room);

  if (evento === 'apresentar') {
    cliente.nome = String(dados?.nome || cliente.nome).slice(0, 24);
    enviar(cliente, 'voce', { id: cliente.id, nome: cliente.nome });
    for (const s of cliente.salas) {
      paraSala(s, 'room:members', { room: s, members: membrosDe(s) });
    }
    return;
  }

  const sala = dados.room;
  const corpo = {
    ...(typeof dados.data === 'object' && dados.data ? dados.data : { valor: dados.data }),
    autor: cliente.nome,
    de: cliente.id,
    em: Date.now(),
  };

  // Directed message: only the recipient and sender see it. Again, it is the
  // server that guarantees this, not the client that requested it.
  if (dados.to) {
    const destino = clientes.get(dados.to);
    const envelope = { room: sala, to: dados.to, data: { ...corpo, privada: true } };
    if (destino) enviar(destino, evento, envelope);
    enviar(cliente, evento, envelope);
    return;
  }

  if (!sala) return;
  if (!cliente.salas.has(sala)) return; // not in the room, cannot speak in it
  paraSala(sala, evento, { room: sala, data: corpo });
}

// ---------------------------------------------------------------------------
// HTTP + upgrade
// ---------------------------------------------------------------------------

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${porta}`);
    let caminho = join(raiz, normalize(decodeURIComponent(url.pathname)));
    if (!caminho.startsWith(raiz)) {
      res.writeHead(403).end('Outside root');
      return;
    }
    const info = await stat(caminho).catch(() => null);
    if (info?.isDirectory()) caminho = join(caminho, 'index.html');

    const conteudo = await readFile(caminho);
    res.writeHead(200, { 'content-type': MIME[extname(caminho)] ?? 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

servidor.on('upgrade', (req, socket) => {
  const chave = req.headers['sec-websocket-key'];
  if (!chave) {
    socket.destroy();
    return;
  }
  const aceite = createHash('sha1')
    .update(chave + GUID)
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${aceite}\r\n\r\n`
  );
  socket.setNoDelay(true);

  const id = randomUUID().slice(0, 8);
  const cliente = { id, socket, nome: `visitante-${id.slice(0, 4)}`, salas: new Set() };
  const estado = { buffer: Buffer.alloc(0) };
  clientes.set(id, cliente);
  enviar(cliente, 'voce', { id, nome: cliente.nome });

  socket.on('data', (pedaco) => {
    estado.buffer = Buffer.concat([estado.buffer, pedaco]);
    for (const { opcode, carga } of lerQuadros(estado)) {
      if (opcode === 0x8) return socket.end(); // close
      if (opcode === 0x9) {
        socket.write(enquadrar(carga.toString('utf8'), 0xa)); // ping -> pong
        continue;
      }
      if (opcode === 0x1) tratarMensagem(cliente, carga.toString('utf8'));
    }
  });

  const encerrar = () => {
    for (const s of [...cliente.salas]) sair(cliente, s);
    clientes.delete(id);
  };
  socket.on('close', encerrar);
  socket.on('error', encerrar);
});

servidor.listen(porta, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Real-time chat is up.\n` +
      `  Demo:      http://localhost:${porta}/examples/chat-tempo-real/\n` +
      `  WebSocket: ws://localhost:${porta}/chat\n` +
      `Open in two tabs to see the public room and private message.`
  );
});
