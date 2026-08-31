/**
 * Servidor de chat para a demo `examples/chat-tempo-real/`.
 *
 * Serve os arquivos estaticos do projeto e fala WebSocket na mesma porta, sem
 * nenhuma dependencia: o handshake e o enquadramento do RFC 6455 estao escritos
 * aqui, com `node:crypto` para o `Sec-WebSocket-Accept` e nada mais.
 *
 * Uso:
 *   node scripts/chat-servidor.mjs          porta 5174
 *   node scripts/chat-servidor.mjs 8080     escolhe a porta
 *
 * Depois abra http://localhost:5174/examples/chat-tempo-real/ em duas abas.
 *
 * O servidor fala o envelope do modulo `socket` da Voodoo, descrito em
 * `docs/websocket.md`:
 *
 *   { "event": "join",     "data": { "room": "geral", "private": false } }
 *   { "event": "mensagem", "data": { "room": "geral", "data": { ... } } }
 *   { "event": "mensagem", "data": { "room": "geral", "to": "id", "data": {...} } }
 *
 * E o ponto que a documentacao repete e que este arquivo demonstra: **quem
 * decide o que e privado e o servidor**. A funcao `podeEntrar` abaixo e o lugar
 * onde a autorizacao de sala aconteceria de verdade; aqui ela e permissiva de
 * proposito, porque isto e uma demo, e esta marcada como tal.
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
// Enquadramento do RFC 6455, so o necessario para texto
// ---------------------------------------------------------------------------

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** Monta um quadro de texto. Payloads maiores que 64 KB nao aparecem aqui. */
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
 * Le quadros completos do buffer acumulado.
 *
 * TCP nao respeita fronteira de mensagem: um quadro pode chegar partido em tres
 * pedaços ou tres quadros podem chegar juntos. Por isso o buffer e acumulado e
 * so os quadros inteiros sao consumidos.
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
    // O cliente sempre mascara. Desfazer e um XOR com a chave de 4 bytes.
    if (mascara) for (let k = 0; k < carga.length; k++) carga[k] ^= mascara[k % 4];

    estado.buffer = b.subarray(i + tamanho);
    quadros.push({ opcode, carga });
  }

  return quadros;
}

// ---------------------------------------------------------------------------
// Estado do chat
// ---------------------------------------------------------------------------

/** id -> { socket, estado, nome, salas: Set<string> } */
const clientes = new Map();
/** nome da sala -> Set<id> */
const salas = new Map();

/**
 * Autorizacao de sala. **Este e o lugar onde privacidade acontece de verdade.**
 *
 * Numa aplicacao real, aqui entraria a checagem de sessao, de convite, de
 * bloqueio. Nesta demo qualquer um entra em qualquer sala, e isso e uma escolha
 * consciente de uma demo, nao um padrao para copiar.
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
    enviar(cliente, 'erro', { room: nomeSala, message: 'sem permissao nesta sala' });
    return;
  }
  if (!salas.has(nomeSala)) salas.set(nomeSala, new Set());
  salas.get(nomeSala).add(cliente.id);
  cliente.salas.add(nomeSala);

  // Quem entrou recebe a lista inteira; quem ja estava recebe so o novato.
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
  // O heartbeat do transporte nativo e texto puro, nao JSON.
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

  // Mensagem direcionada: so o destinatario e o remetente veem. De novo: e o
  // servidor que garante isso, e nao o cliente que pediu.
  if (dados.to) {
    const destino = clientes.get(dados.to);
    const envelope = { room: sala, to: dados.to, data: { ...corpo, privada: true } };
    if (destino) enviar(destino, evento, envelope);
    enviar(cliente, evento, envelope);
    return;
  }

  if (!sala) return;
  if (!cliente.salas.has(sala)) return; // nao esta na sala, nao fala nela
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
      res.writeHead(403).end('Fora da raiz');
      return;
    }
    const info = await stat(caminho).catch(() => null);
    if (info?.isDirectory()) caminho = join(caminho, 'index.html');

    const conteudo = await readFile(caminho);
    res.writeHead(200, { 'content-type': MIME[extname(caminho)] ?? 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Nao encontrado');
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
    `Chat de tempo real no ar.\n` +
      `  Demo:      http://localhost:${porta}/examples/chat-tempo-real/\n` +
      `  WebSocket: ws://localhost:${porta}/chat\n` +
      `Abra em duas abas para ver a sala publica e a mensagem privada.`
  );
});
