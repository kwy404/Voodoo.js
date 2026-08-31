# WebSocket e tempo real

> Este módulo tem entrada própria: `voodoojs/dist/socket.js`. Ele **não** vem no `voodoo.min.js`,
> nem no `voodoo.core.min.js`, nem no `voodoo.full.min.js`. O motivo está em
> [Tamanho e distribuição](#tamanho-e-distribuição).

Tempo real com a mesma filosofia do resto da Voodoo: o caso comum sai no HTML, o resto continua
disponível na API `V.socket`. Dois transportes vêm na caixa — **WebSocket nativo** e o **protocolo
Socket.IO**, este último implementado à mão sobre o WebSocket do navegador, sem
`socket.io-client` e sem nenhuma outra dependência.

A ergonomia é de propósito irmã da do módulo [HTTP](http.md): onde lá existe `retry`, aqui existe
`reconnect`; onde lá existem `interceptors.request` e `interceptors.response`, aqui existem
`interceptors.outgoing` e `interceptors.incoming`; `defaults` funciona igual nos dois.

---

## Leia isto antes de usar salas privadas

**Privacidade é responsabilidade do servidor. Sempre.**

O cliente não consegue impedir que outro cliente entre numa sala. Ele apenas *pede* para entrar, e
o servidor decide. Marcar uma sala como `privada: true` neste módulo não esconde nada de ninguém:
é uma etiqueta que viaja junto do pedido, para o servidor poder aplicar a regra dele.

Concretamente, isso significa que o **servidor** precisa:

- autenticar quem conecta (token no handshake, cookie de sessão, o que for);
- autorizar cada `join`, recusando quem não pode entrar naquela sala;
- filtrar o que sai, mandando cada mensagem só para quem tem direito de vê-la;
- validar o destinatário de toda mensagem direta.

Qualquer coisa "privada" que dependa só do cliente é falsa. Um `if` no navegador não protege dado
nenhum: quem abre o console do navegador entra na sala que quiser, escuta o evento que quiser e lê
tudo que o servidor mandar. Se o servidor mandar a mensagem, o cliente vai poder lê-la, ponto.

O mesmo vale para a lista de membros: `sala.membros` mostra o que o servidor mandou. Se o servidor
mandar mais do que devia, o vazamento já aconteceu antes de o dado chegar aqui.

---

## Instalação

Por bundler, em ESM:

```js
import V, { socket } from 'voodoojs';
import 'voodoojs/dist/socket.js'; // registra v-socket, v-room e v-on-socket

V.start();
socket('wss://exemplo.com'); // ou apenas use v-socket no HTML
```

Repare que em ESM o `V.socket` **não** aparece sozinho: `V.use()` instala no núcleo, e o `V` que
você importou já tinha sido montado. Use o `socket` importado, ou pendure você mesmo com
`V.socket = socket` se preferir o nome. Pelo CDN isso não é problema, porque aí existe uma global
para o módulo se pendurar:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/voodoojs/dist/socket.js';
  // agora V.socket existe
</script>
```

> **Atenção ao misturar os dois formatos.** O bundle IIFE (`voodoo.min.js`) e o módulo
> (`dist/socket.js`) são runtimes diferentes: as directives registradas pelo módulo não aparecem no
> registro do IIFE. Numa página, ou você usa os dois em ESM (`dist/index.js` + `dist/socket.js`,
> que compartilham chunks), ou usa `V.socket` do IIFE sem as directives. A demo em
> [`examples/chat-tempo-real/`](../examples/chat-tempo-real/) mostra o caminho ESM funcionando.

## Demo completa

`examples/chat-tempo-real/` é um chat de verdade — sala pública, mensagem privada, presença e
reconexão — falando com `scripts/chat-servidor.mjs`, um servidor WebSocket sem dependência nenhuma
(o RFC 6455 está escrito à mão ali):

```bash
npm run build --workspace=voodoojs
node scripts/chat-servidor.mjs
# abra http://localhost:5174/examples/chat-tempo-real/ em duas abas
```

---

# Directives

## v-socket

Abre a conexão e publica `$socket` no escopo.

```html
<div v-socket="wss://exemplo.com/chat">
  <p v-show="!$socket.conectado">Reconectando...</p>
  <ul>
    <li v-for="m in $socket.mensagens">{ m.texto }</li>
  </ul>
  <button @click="$socket.enviar('ola', { de: 'ana' })">Enviar</button>
</div>
```

O objeto `$socket` é reativo e traz:

| Campo | O que é |
| --- | --- |
| `conectado` | `true` enquanto a conexão está aberta |
| `estado` | `connecting`, `open`, `closing`, `closed` ou `reconnecting` |
| `mensagens` | As últimas N mensagens recebidas (padrão 50) |
| `erro` | Texto do último erro, ou `null` |
| `tentativas` | Reconexões seguidas sem sucesso |
| `enviar(evento, dados)` | Manda um evento. Com um argumento só, manda a carga crua |
| `abrir()`, `fechar()` | Controle manual |
| `socket` | A conexão completa, para descer para a API |

A URL pode ser literal (`wss://...`, `/chat`) ou uma expressão (`'wss://' + host`).

### Modificadores

| Modificador | O que faz |
| --- | --- |
| `.json` | Liga a conversão automática de JSON (já é o padrão) |
| `.manual` | Cria a conexão fechada. Quem abre é `$socket.abrir()` |
| `.no-reconnect` | Desliga a reconexão automática |

> **Sobre `.reconnect=false`:** o HTML não aceita `=` dentro do *nome* de um atributo, então
> `v-socket.reconnect=false="wss://..."` chega ao navegador quebrado — o valor vira
> `false="wss://..."`. A forma com `=` continua sendo aceita pelo parser de atributos (útil se você
> gera o atributo por template), mas em HTML escrito à mão use `.no-reconnect` ou o atributo
> auxiliar `v-socket-reconnect="false"`.

### Atributos auxiliares

| Atributo | O que faz |
| --- | --- |
| `v-socket-transport="socket.io"` | Troca o transporte. Padrão `ws` |
| `v-socket-as="chat"` | Nome no escopo. Padrão `$socket` |
| `v-socket-buffer="200"` | Quantas mensagens ficam em `$socket.mensagens` |
| `v-socket-path="/socket.io/"` | Caminho do endpoint Engine.IO |
| `v-socket-heartbeat="30s"` | Intervalo do ping. `0` desliga |
| `v-socket-reconnect="false"` | Desliga a reconexão |

### Sem WebSocket no ambiente

SSR, um jsdom sem a API, um navegador antigo: nada é lançado. O elemento ganha
`data-socket="unsupported"`, dispara `voodoo:socket-unsupported`, e `$socket` existe com
`conectado: false` e `erro` preenchido. Uma página renderizada no servidor não pode cair por causa
de um atributo.

## v-room

Entra numa sala da conexão mais próxima e publica `$room`.

```html
<div v-socket="wss://exemplo.com" v-room="geral">
  <p v-show="!$socket.conectado">Reconectando...</p>
  <li v-for="m in $room.mensagens">{ m.autor }: { m.texto }</li>
  <span>{ $room.membros.length } online</span>
  <form @submit.prevent="$room.enviar('mensagem', { texto: rascunho })">
    <input v-model="rascunho">
  </form>
</div>
```

| Campo de `$room` | O que é |
| --- | --- |
| `nome` | Nome da sala |
| `estado` | `joining`, `joined` ou `left` |
| `mensagens` | Últimas mensagens recebidas nesta sala |
| `membros` | Quem o servidor diz que está na sala |
| `privada` | `true` quando a sala foi pedida como privada |
| `enviar(evento, dados, para?)` | Manda para a sala, ou só para um destinatário |
| `sair()` | Sai da sala |
| `sala` | A sala completa, para descer para a API |

Modificador `.privada` marca a sala como privada — releia o
[aviso do começo](#leia-isto-antes-de-usar-salas-privadas). Atributos auxiliares:
`v-room-as="chat"` e `v-room-buffer="200"`.

Sair do elemento sai da sala, cancela os ouvintes e limpa o estado.

## v-on-socket

Liga um evento do socket a uma expressão, no mesmo espírito de `@evento`. A carga chega em
`$event`.

```html
<div v-socket="/" v-socket-transport="socket.io"
     v-on-socket:nova-mensagem="mensagens.push($event)"></div>
```

A assinatura é sempre na **conexão**, mesmo dentro de um `v-room` — o nome diz `on-socket`, e a
conexão vê tudo que chega, inclusive o que é de sala. Para o recorte já filtrado de uma sala, use
`$room.mensagens` no HTML ou `sala.on()` no JavaScript. Quando o servidor pede confirmação daquele
evento, a função de resposta chega em `$ack`.

## Eventos de DOM

| Evento | Quando |
| --- | --- |
| `voodoo:socket-open` | A conexão abriu |
| `voodoo:socket-close` | A conexão fechou |
| `voodoo:socket-error` | Deu erro |
| `voodoo:socket-unsupported` | O ambiente não tem WebSocket |
| `voodoo:room-join` | Alguém entrou na sala |
| `voodoo:room-leave` | Alguém saiu da sala |

---

# A API `V.socket`

```js
const s = V.socket('wss://exemplo.com');                 // WebSocket nativo
const io = V.socket('/', { transport: 'socket.io' });     // protocolo Socket.IO

s.on('mensagem', (dados) => console.log(dados));
s.emit('entrar', { sala: 'geral' });

s.state;      // reativo: connecting | open | closing | closed | reconnecting
s.connected;  // reativo
s.attempts;   // reativo
s.queued;     // reativo
s.error;      // reativo

s.close();
V.socket.close(); // fecha todas as conexões
```

`state` e `connected` são reativos de verdade: lê-los dentro de um `effect`, de um `computed` ou de
uma expressão do HTML registra a dependência, como qualquer outro estado da Voodoo.

## Métodos

| Método | O que faz |
| --- | --- |
| `on(evento, fn)` | Assina. Devolve a função que cancela |
| `once(evento, fn)` | Assina só a próxima ocorrência |
| `off(evento?, fn?)` | Cancela um, todos de um evento, ou todos |
| `emit(evento, dados, ack?)` | Manda um evento nomeado |
| `send(dados)` | Manda a carga crua, sem nome de evento |
| `open()` / `close()` | Abre e fecha |
| `join(nome, opções?)` | Entra numa sala |
| `leave(nome)` | Sai de uma sala |
| `to(destino)` | Envia direto para um destinatário |
| `rooms` | Salas ativas |

O evento `message` recebe **tudo** que chega, com nome ou sem. Além dele, o módulo emite
`open`, `close`, `error`, `reconnecting` e `state:<estado>`.

## Opções e `V.socket.defaults`

Os padrões valem para toda conexão nova, exatamente como em `V.http.defaults`.

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `transport` | `'ws'` | `ws` ou `socket.io` |
| `baseURL` | `''` | Prefixo dos endereços relativos |
| `reconnect` | `true` | Reconecta quando a conexão cai sozinha |
| `reconnectDelay` | `500` | Primeira espera, em ms |
| `reconnectMaxDelay` | `30000` | Teto da espera |
| `reconnectMaxAttempts` | `Infinity` | Quantas tentativas antes de desistir |
| `jitter` | `0.3` | Fração sorteada em cima da espera |
| `heartbeat` | `25000` | Intervalo do ping nativo, em ms. `0` desliga |
| `heartbeatTimeout` | `10000` | Silêncio tolerado antes de considerar morta |
| `pingPayload` | `'ping'` | Texto do ping. `null` só observa o silêncio |
| `pongPayload` | `'pong'` | Texto ignorado na entrega das mensagens |
| `queueLimit` | `64` | Mensagens guardadas antes de a conexão abrir |
| `json` | `true` | Converte JSON com volta para texto puro |
| `path` | `'/socket.io/'` | Endpoint Engine.IO |
| `auth` | `null` | Dados enviados no CONNECT do Socket.IO |
| `manual` | `false` | Cria a conexão fechada |
| `roomBuffer` | `50` | Mensagens guardadas por sala |
| `joinEvent` / `leaveEvent` | `'join'` / `'leave'` | Eventos de entrada e saída de sala |
| `presenceEvent` | `'room:members'` | Evento com a lista de membros |
| `memberJoinEvent` / `memberLeaveEvent` | `'room:joined'` / `'room:left'` | Presença |
| `WebSocket` | `null` | Implementação usada no lugar da global |

## Interceptadores

Mesmo formato do `http.interceptors`. Devolver um objeto troca a mensagem, devolver `null` a
descarta, não devolver nada mantém a original.

```js
V.socket.interceptors.outgoing.use((m) => ({ ...m, data: { ...m.data, token } }));

const soltar = V.socket.interceptors.incoming.use((m) => {
  if (m.event === 'debug') return null; // engole
  return m;
});
soltar(); // cancela
```

Cada mensagem chega como `{ event, data, url, raw }`. `raw` é o texto exatamente como veio do fio,
e só existe na entrada.

## Devtools

Toda mensagem que entra e que sai é publicada no barramento das [devtools](devtools.md) como evento
`socket:<nome>`, e a abertura e o fechamento da conexão aparecem na aba Rede como método `WS`.

---

# Salas e canais

```js
const sala = s.join('geral');                    // pública
const dm = s.join('dm:ana', { privada: true });  // privada

sala.on('mensagem', (m) => console.log(m));
sala.emit('mensagem', { texto: 'oi' });          // vai para todos da sala
sala.membros;                                    // reativo
sala.mensagens;                                  // reativo
sala.leave();
```

`join` e `leave` são **idempotentes**: entrar duas vezes na mesma sala devolve o mesmo objeto, sem
duplicar ouvinte e sem abrir conexão nova; sair duas vezes não manda dois pedidos.

Os nomes existem em português e em inglês: `membros`/`members`, `mensagens`/`messages`,
`estado`/`state`, `enviar`/`emit`, `sair`/`leave`.

## Reentrada automática depois da reconexão

Quando a conexão cai e volta, o módulo **refaz o `join` de todas as salas ativas**, antes de escoar
a fila de envio.

Isso não é detalhe: é o erro mais comum em cliente de tempo real escrito à mão. O socket reconecta,
a interface volta a mostrar "online", e o usuário fica fora de todas as salas — sem receber nada,
sem nenhum aviso, olhando para uma tela que parece funcionando. Uma sala de que você saiu com
`leave()` não volta.

## Público, privado e mensagem direta

| Forma | O que significa |
| --- | --- |
| `s.join('geral')` | Sala pública: broadcast para todos que estão nela |
| `s.join('dm:ana', { privada: true })` | Sala privada: o servidor decide quem entra |
| `s.to('ana').emit('cochicho', dados)` | Mensagem direcionada a um destinatário |
| `sala.to('ana').emit('mensagem', dados)` | Direcionada dentro de uma sala |

E, de novo: **isso tudo é pedido, não garantia.** Veja o
[aviso do começo](#leia-isto-antes-de-usar-salas-privadas).

## Presença

`sala.membros` é alimentado pelo que o servidor manda, e só por isso. **Se o servidor não mandar
nada, a lista fica vazia** — o cliente não inventa presença, porque um cliente só enxerga a si
mesmo e uma lista inventada seria bonita e mentirosa.

Os três eventos que o servidor precisa mandar:

```js
// lista completa
{ event: 'room:members', data: { room: 'geral', members: ['ana', 'bia'] } }
// alguém entrou
{ event: 'room:joined',  data: { room: 'geral', member: { id: 'ana' } } }
// alguém saiu
{ event: 'room:left',    data: { room: 'geral', member: 'ana' } }
```

Os nomes desses eventos são configuráveis em `V.socket.defaults`. Dentro da sala eles viram os
eventos `entrou` e `saiu`, e não entram em `sala.mensagens`.

---

# O que o servidor precisa fazer

Esta é a parte que **não é transparente**, e não adianta fingir que é.

## No transporte nativo

O WebSocket cru não tem conceito de evento nomeado nem de sala: ele carrega texto. Para `emit`,
`on` e as salas funcionarem, o módulo usa um envelope JSON, e **o seu servidor precisa falar esse
mesmo envelope**:

```jsonc
// cliente -> servidor
{ "event": "mensagem", "data": { "texto": "oi" } }

// dentro de uma sala
{ "event": "mensagem", "data": { "room": "geral", "data": { "texto": "oi" } } }

// direcionada
{ "event": "cochicho", "data": { "to": "ana", "data": { "texto": "oi" } } }

// entrar e sair
{ "event": "join",  "data": { "room": "geral", "private": false } }
{ "event": "leave", "data": { "room": "geral" } }
```

Na volta, o servidor precisa **etiquetar cada mensagem com a sala** (`room`, ou `sala`), senão o
cliente não tem como saber para qual sala rotear. Sem etiqueta, a mensagem ainda chega em
`s.on(...)` e em `$socket.mensagens`, mas não entra em nenhuma sala.

Quem fala com um servidor que não usa esse envelope tem `send()` e `on('message')`, que passam o
conteúdo cru sem interpretar nome nenhum. JSON continua sendo convertido automaticamente, com volta
para texto puro quando não é JSON — igual ao `responseType: 'auto'` do HTTP.

## No transporte Socket.IO

O envelope é o mesmo, viajando dentro de um evento Socket.IO comum (`42["mensagem",{...}]`). O
`join` chega como um evento `join` normal, e cabe ao servidor chamar `socket.join(room)` — que é o
que liga o envelope aos **rooms nativos** do Socket.IO. Um servidor mínimo:

```js
io.on('connection', (socket) => {
  socket.on('join', ({ room }) => {
    // autorize aqui. sempre.
    socket.join(room);
    io.to(room).emit('room:joined', { room, member: socket.id });
  });
  socket.on('leave', ({ room }) => socket.leave(room));
  socket.on('mensagem', ({ room, data }) => {
    io.to(room).emit('mensagem', { room, data });
  });
});
```

---

# O protocolo Socket.IO implementado à mão

`socket.io-client` pesa mais de 30 KB comprimidos, e a Voodoo não tem dependência de runtime
nenhuma. Acontece que o pedaço do protocolo que uma página usa de verdade é pequeno, e cabe em
texto puro sobre o WebSocket nativo.

## O que está implementado

- Handshake Engine.IO v4 direto em WebSocket (`?EIO=4&transport=websocket`).
- Pacotes Engine.IO `0` (open), `1` (close), `2` (ping), `3` (pong), `4` (message), `6` (noop).
- Resposta automática ao ping do servidor, com os tempos vindos do handshake.
- Pacotes Socket.IO `0` (CONNECT, com `auth`), `1` (DISCONNECT), `2` (EVENT), `3` (ACK) e
  `4` (CONNECT_ERROR).
- `emit` com ack, e resposta a eventos que pedem ack.
- Reconexão com espera progressiva, refazendo o handshake inteiro.

## O que **não** está implementado

Dito sem suavizar, porque prometer compatibilidade que não existe custa caro depois:

- **Anexos binários.** Os pacotes `5` (BINARY_EVENT) e `6` (BINARY_ACK) e os quadros binários do
  Engine.IO são ignorados, com aviso no console em modo desenvolvimento. Mande os dados como JSON
  ou base64.
- **Transporte por polling e upgrade.** A conexão abre direto em WebSocket. Sem WebSocket no
  ambiente, nada abre — não existe caminho de reserva por long-polling.
- **Namespaces.** Só o namespace padrão `/`. O decodificador *lê* o namespace de um pacote, mas o
  cliente não gerencia vários namespaces ao mesmo tempo.
- **Rooms do lado do cliente.** Rooms do Socket.IO são um conceito de servidor. O que existe aqui é
  a convenção de `join`/`leave` e o envelope descrito acima; quem realmente coloca o socket na room
  é o servidor.
- **Multiplexação de vários sockets sobre uma conexão** e a **recuperação de estado da conexão**
  (`connection state recovery`) do Socket.IO v4.

Se você precisa de qualquer item dessa lista, use `socket.io-client`. Este módulo é o suficiente
para `emit`, `on`, ack, salas e reconexão contra um servidor Socket.IO v4 — e nada além disso.

---

# Reconexão e conexão morta

## Espera progressiva com sorteio

A espera dobra a cada tentativa até o teto, e um sorteio (`jitter`) espalha os clientes dentro da
janela. Com os padrões: 500 ms, 1 s, 2 s, 4 s… até 30 s, cada uma variando ±30%.

O sorteio existe por um motivo prático: sem ele, mil abas que caem juntas voltam todas no mesmo
milissegundo e derrubam o servidor de novo, exatamente quando ele está se recuperando.

`close()` para de vez. Uma reconexão já agendada é cancelada, e nada volta a abrir sem um `open()`
explícito.

## Detecção de conexão morta

**O `readyState` mente.** Quando a rede cai sem FIN — cabo arrancado, Wi-Fi que sumiu, celular que
trocou de torre — o socket continua dizendo `OPEN` por minutos, e a página fica parecendo
conectada enquanto nada chega.

Então o módulo não confia nele:

- **Transporte nativo:** manda `pingPayload` a cada `heartbeat` ms e derruba a conexão se nada
  chegar em `heartbeat + heartbeatTimeout`. Qualquer quadro que chegue conta como prova de vida e
  reinicia a contagem — tráfego real é prova melhor que qualquer pong.
- **Transporte Socket.IO:** quem manda o ping é o servidor, e a janela sai do handshake
  (`pingInterval + pingTimeout`).

O `ping` do transporte nativo é uma convenção deste módulo, não do protocolo. Um servidor que não o
espera pode simplesmente ignorá-lo, mas se ele atrapalhar, use `heartbeat: 0` para desligar ou
`pingPayload` para trocar o texto. O `pongPayload` que voltar é engolido e nunca vira mensagem da
aplicação.

## Fila de envio

`emit` antes de a conexão abrir guarda a mensagem e despacha tudo na abertura. A fila tem teto
(`queueLimit`, padrão 64) porque uma conexão que nunca abre transformaria `emit` num vazamento
silencioso. Cheia, a mais antiga sai: em tempo real, o dado novo vale mais que o velho.

---

# Limpeza

Destruir o elemento fecha a conexão, sai das salas, remove **todos** os ouvintes e limpa todos os
timers. Não há exceção: uma conexão aberta por um elemento que já morreu é um vazamento que só
aparece semanas depois, em forma de conta de servidor.

`V.socket.close()` derruba todas as conexões vivas de uma vez, o que é útil ao trocar de rota ou ao
sair da aplicação.

---

# Tamanho e distribuição

Com o módulo dentro do build completo, o `voodoo.full.min.js` ia de 127.58 KB para 134.22 KB
comprimidos, contra um teto de 133 KB. Levantar a meta seria o mesmo que não ter meta, então o
módulo virou entrada própria — a mesma decisão, pelo mesmo motivo, que a [camada GPU](gpu.md) já
tinha tomado.

O resultado: `voodoo.core.min.js`, `voodoo.min.js` e `voodoo.full.min.js` continuam do tamanho de
antes, e quem usa WebSocket paga por WebSocket. Em ESM os dois lados compartilham o mesmo runtime,
porque as partes comuns saem em chunks compartilhados.
