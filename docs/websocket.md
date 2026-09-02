# WebSocket and realtime

> This module has its own entry: `voodoojs/dist/socket.js`. It **does not** come in `voodoo.min.js`,
> nor in `voodoo.core.min.js`, nor in `voodoo.full.min.js`. The reason is in
> [Size and distribution](#size-and-distribution).

Realtime with the same philosophy as the rest of Voodoo: the common case comes out in HTML, the
rest stays available in the `V.socket` API. Two transports come in the box — **native WebSocket**
and the **Socket.IO protocol**, the latter implemented by hand on the browser's WebSocket, without
`socket.io-client` and without any other dependencies.

The ergonomics are intentionally sister to the [HTTP](http.md) module: where there's `retry` there,
here there's `reconnect`; where there are `interceptors.request` and `interceptors.response` there,
here there are `interceptors.outgoing` and `interceptors.incoming`; `defaults` works the same on both.

---

## Read this before using private rooms

**Privacy is the server's responsibility. Always.**

The client cannot prevent another client from entering a room. It merely *asks* to enter, and
the server decides. Marking a room as `private: true` in this module hides nothing from anyone:
it's a tag that travels with the request, so the server can apply its rule.

Concretely, this means the **server** must:

- authenticate who connects (token in handshake, session cookie, whatever);
- authorize each `join`, refusing those who cannot enter that room;
- filter what goes out, sending each message only to those who have the right to see it;
- validate the recipient of every direct message.

Anything "private" that depends only on the client is false. An `if` in the browser protects no
data: whoever opens the browser console can enter the room they want, listen to the event they
want, and read everything the server sends. If the server sends the message, the client will be
able to read it, period.

The same goes for the member list: `room.members` shows what the server sent. If the server sends
more than it should, the leak already happened before the data gets here.

---

## Installation

Via bundler, in ESM:

```js
import V, { socket } from 'voodoojs';
import 'voodoojs/dist/socket.js'; // registers v-socket, v-room and v-on-socket

V.start();
socket('wss://example.com'); // or just use v-socket in HTML
```

Note that in ESM, `V.socket` **doesn't** appear on its own: `V.use()` installs it in the core,
and the `V` you imported was already mounted. Use the imported `socket`, or hang it yourself with
`V.socket = socket` if you prefer the name. Via CDN this is not a problem, because there's a global
there for the module to hang on:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/voodoojs/dist/socket.js';
  // now V.socket exists
</script>
```

> **Caution when mixing the two formats.** The IIFE bundle (`voodoo.min.js`) and the module
> (`dist/socket.js`) are different runtimes: directives registered by the module don't appear in
> the IIFE registry. On a page, you either use both in ESM (`dist/index.js` + `dist/socket.js`,
> which share chunks), or you use `V.socket` from the IIFE without directives. The demo in
> [`examples/chat-realtime/`](../examples/chat-realtime/) shows the ESM path working.

## Complete demo

`examples/chat-realtime/` is a real chat — public room, private message, presence and reconnect —
talking to `scripts/chat-server.mjs`, a WebSocket server with no dependencies (RFC 6455 is
written by hand there):

```bash
npm run build --workspace=voodoojs
node scripts/chat-server.mjs
# open http://localhost:5174/examples/chat-realtime/ in two tabs
```

---

# Directives

## v-socket

Opens the connection and publishes `$socket` in the scope.

```html
<div v-socket="wss://exemplo.com/chat">
  <p v-show="!$socket.connected">Reconectando...</p>
  <ul>
    <li v-for="m in $socket.messages">{ m.texto }</li>
  </ul>
  <button @click="$socket.send('ola', { de: 'ana' })">Enviar</button>
</div>
```

The `$socket` object is reactive and brings:

| Field | What it is |
| --- | --- |
| `connected` | `true` while the connection is open |
| `state` | `connecting`, `open`, `closing`, `closed` or `reconnecting` |
| `messages` | The last N received messages (default 50) |
| `error` | Text of the last error, or `null` |
| `attempts` | Consecutive reconnections without success |
| `send(event, data)` | Sends an event. With just one argument, sends the raw payload |
| `open()`, `close()` | Manual control |
| `socket` | The complete connection, to descend to the API |

The URL can be literal (`wss://...`, `/chat`) or an expression (`'wss://' + host`).

### Modifiers

| Modifier | What it does |
| --- | --- |
| `.json` | Enables automatic JSON conversion (already the default) |
| `.manual` | Creates the connection closed. `$socket.open()` opens it |
| `.no-reconnect` | Disables automatic reconnection |

> **About `.reconnect=false`:** HTML doesn't accept `=` inside an attribute *name*, so
> `v-socket.reconnect=false="wss://..."` reaches the browser broken — the value becomes
> `false="wss://..."`. The form with `=` is still accepted by the attribute parser (useful if you
> generate the attribute via template), but in hand-written HTML use `.no-reconnect` or the
> auxiliary attribute `v-socket-reconnect="false"`.

### Auxiliary attributes

| Attribute | What it does |
| --- | --- |
| `v-socket-transport="socket.io"` | Changes the transport. Default `ws` |
| `v-socket-as="chat"` | Name in scope. Default `$socket` |
| `v-socket-buffer="200"` | How many messages stay in `$socket.messages` |
| `v-socket-path="/socket.io/"` | Path of the Engine.IO endpoint |
| `v-socket-heartbeat="30s"` | Ping interval. `0` turns it off |
| `v-socket-reconnect="false"` | Disables reconnection |

### Without WebSocket in the environment

SSR, a jsdom without the API, an old browser: nothing is thrown. The element gets
`data-socket="unsupported"`, fires `voodoo:socket-unsupported`, and `$socket` exists with
`connected: false` and `error` filled. A server-rendered page cannot crash because of an attribute.

## v-room

Enters a room from the nearest connection and publishes `$room`.

```html
<div v-socket="wss://example.com" v-room="general">
  <p v-show="!$socket.connected">Reconnecting...</p>
  <li v-for="m in $room.messages">{ m.author }: { m.text }</li>
  <span>{ $room.members.length } online</span>
  <form @submit.prevent="$room.send('message', { text: draft })">
    <input v-model="draft">
  </form>
</div>
```

| Field of `$room` | What it is |
| --- | --- |
| `name` | Room name |
| `state` | `joining`, `joined` or `left` |
| `messages` | Latest messages received in this room |
| `members` | Who the server says is in the room |
| `private` | `true` when the room was requested as private |
| `send(event, data, to?)` | Sends to the room, or only to a recipient |
| `leave()` | Leaves the room |
| `room` | The complete room, to descend to the API |

The `.private` modifier marks the room as private — reread the
[warning at the beginning](#read-this-before-using-private-rooms). Auxiliary attributes:
`v-room-as="chat"` and `v-room-buffer="200"`.

Leaving the element leaves the room, cancels listeners and clears the state.

## v-on-socket

Links a socket event to an expression, in the same spirit as `@event`. The payload arrives in
`$event`.

```html
<div v-socket="/" v-socket-transport="socket.io"
     v-on-socket:new-message="messages.push($event)"></div>
```

The subscription is always on the **connection**, even inside a `v-room` — the name says `on-socket`,
and the connection sees everything that arrives, including room stuff. For the already-filtered slice
of a room, use `$room.messages` in HTML or `room.on()` in JavaScript. When the server asks for
confirmation of that event, the callback function arrives in `$ack`.

## DOM events

| Event | When |
| --- | --- |
| `voodoo:socket-open` | Connection opened |
| `voodoo:socket-close` | Connection closed |
| `voodoo:socket-error` | An error occurred |
| `voodoo:socket-unsupported` | The environment doesn't have WebSocket |
| `voodoo:room-join` | Someone entered the room |
| `voodoo:room-leave` | Someone left the room |

---

# The `V.socket` API

```js
const s = V.socket('wss://example.com');                 // Native WebSocket
const io = V.socket('/', { transport: 'socket.io' });     // Socket.IO protocol

s.on('message', (data) => console.log(data));
s.emit('join', { room: 'general' });

s.state;      // reactive: connecting | open | closing | closed | reconnecting
s.connected;  // reactive
s.attempts;   // reactive
s.queued;     // reactive
s.error;      // reactive

s.close();
V.socket.close(); // closes all connections
```

`state` and `connected` are truly reactive: reading them inside an `effect`, a `computed` or an
HTML expression registers the dependency, like any other Voodoo state.

## Methods

| Method | What it does |
| --- | --- |
| `on(event, fn)` | Subscribes. Returns the function that cancels |
| `once(event, fn)` | Subscribes only to next occurrence |
| `off(event?, fn?)` | Cancels one, all of an event, or all |
| `emit(event, data, ack?)` | Sends a named event |
| `send(data)` | Sends the raw payload, without event name |
| `open()` / `close()` | Opens and closes |
| `join(name, options?)` | Enters a room |
| `leave(name)` | Leaves a room |
| `to(destination)` | Sends directly to a recipient |
| `rooms` | Active rooms |

The `message` event receives **everything** that arrives, with or without name. Besides it, the
module emits `open`, `close`, `error`, `reconnecting` and `state:<state>`.

## Options and `V.socket.defaults`

The defaults apply to every new connection, exactly like `V.http.defaults`.

| Option | Default | What it does |
| --- | --- | --- |
| `transport` | `'ws'` | `ws` or `socket.io` |
| `baseURL` | `''` | Prefix for relative addresses |
| `reconnect` | `true` | Reconnects when connection drops on its own |
| `reconnectDelay` | `500` | First wait, in ms |
| `reconnectMaxDelay` | `30000` | Ceiling of wait |
| `reconnectMaxAttempts` | `Infinity` | How many attempts before giving up |
| `jitter` | `0.3` | Fraction randomly added on top of wait |
| `heartbeat` | `25000` | Native ping interval, in ms. `0` turns it off |
| `heartbeatTimeout` | `10000` | Silence tolerated before considering dead |
| `pingPayload` | `'ping'` | Text of the ping. `null` only observes silence |
| `pongPayload` | `'pong'` | Text ignored in message delivery |
| `queueLimit` | `64` | Messages stored before connection opens |
| `json` | `true` | Converts JSON with round-trip to plain text |
| `path` | `'/socket.io/'` | Engine.IO endpoint |
| `auth` | `null` | Data sent in Socket.IO CONNECT |
| `manual` | `false` | Creates the connection closed |
| `roomBuffer` | `50` | Messages stored per room |
| `joinEvent` / `leaveEvent` | `'join'` / `'leave'` | Room entry and exit events |
| `presenceEvent` | `'room:members'` | Event with the member list |
| `memberJoinEvent` / `memberLeaveEvent` | `'room:joined'` / `'room:left'` | Presence |
| `WebSocket` | `null` | Implementation used in place of the global |

## Interceptors

Same format as `http.interceptors`. Returning an object changes the message, returning `null`
discards it, returning nothing keeps the original.

```js
V.socket.interceptors.outgoing.use((m) => ({ ...m, data: { ...m.data, token } }));

const drop = V.socket.interceptors.incoming.use((m) => {
  if (m.event === 'debug') return null; // swallow
  return m;
});
drop(); // cancel
```

Each message arrives as `{ event, data, url, raw }`. `raw` is the text exactly as it came from
the wire, and only exists on input.

## Devtools

Every message that comes in and goes out is published on the [devtools](devtools.md) bus as a
`socket:<name>` event, and connection open and close appear in the Network tab as the `WS` method.

---

# Rooms and channels

```js
const room = s.join('general');                    // public
const dm = s.join('dm:ana', { private: true });  // private

room.on('message', (m) => console.log(m));
room.emit('message', { text: 'hi' });          // goes to everyone in the room
room.members;                                    // reactive
room.messages;                                  // reactive
room.leave();
```

`join` and `leave` are **idempotent**: entering the same room twice returns the same object, without
duplicating listeners or opening a new connection; leaving twice doesn't send two requests.

The names exist in Portuguese and English: `membros`/`members`, `mensagens`/`messages`,
`estado`/`state`, `enviar`/`emit`, `sair`/`leave`.

## Automatic re-entry after reconnection

When the connection drops and comes back, the module **redoes the `join` of all active rooms**,
before draining the send queue.

This is not a detail: it's the most common error in hand-written realtime clients. The socket
reconnects, the interface shows "online" again, and the user is out of all rooms — receiving nothing,
with no warning, looking at a screen that seems to work. A room you left with `leave()` won't come back.

## Public, private and direct message

| Form | What it means |
| --- | --- |
| `s.join('general')` | Public room: broadcast to everyone in it |
| `s.join('dm:ana', { private: true })` | Private room: the server decides who enters |
| `s.to('ana').emit('whisper', data)` | Message addressed to a recipient |
| `room.to('ana').emit('message', data)` | Addressed within a room |

And, again: **this is all request, not guarantee.** See the
[warning at the beginning](#read-this-before-using-private-rooms).

## Presence

`room.members` is fed by what the server sends, and only that. **If the server sends nothing, the
list stays empty** — the client doesn't invent presence, because a client only sees itself and an
invented list would be pretty and false.

The three events the server must send:

```js
// complete list
{ event: 'room:members', data: { room: 'general', members: ['ana', 'bia'] } }
// someone entered
{ event: 'room:joined',  data: { room: 'general', member: { id: 'ana' } } }
// someone left
{ event: 'room:left',    data: { room: 'general', member: 'ana' } }
```

The names of these events are configurable in `V.socket.defaults`. Inside the room they become
`joined` and `left` events, and they don't enter `room.messages`.

---

# What the server must do

This is the part that **is not transparent**, and there's no point pretending it is.

## On the native transport

Raw WebSocket has no concept of named event or room: it carries text. For `emit`, `on` and rooms to
work, the module uses a JSON envelope, and **your server must speak that same envelope**:

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

On the way back, the server must **tag each message with the room** (`room`, or `sala`), otherwise
the client can't know which room to route to. Without a tag, the message still arrives at
`s.on(...)` and `$socket.messages`, but doesn't enter any room.

Anyone talking to a server that doesn't use this envelope has `send()` and `on('message')`, which
pass the raw content without interpreting any name. JSON continues to be converted automatically,
round-tripping to plain text when it's not JSON — just like `responseType: 'auto'` in HTTP.

## On the Socket.IO transport

The envelope is the same, traveling inside a common Socket.IO event (`42["message",{...}]`). The
`join` arrives as a normal `join` event, and it's up to the server to call `socket.join(room)` —
that's what ties the envelope to **Socket.IO native rooms**. A minimal server:

```js
io.on('connection', (socket) => {
  socket.on('join', ({ room }) => {
    // authorize here. always.
    socket.join(room);
    io.to(room).emit('room:joined', { room, member: socket.id });
  });
  socket.on('leave', ({ room }) => socket.leave(room));
  socket.on('message', ({ room, data }) => {
    io.to(room).emit('message', { room, data });
  });
});
```

---

# Socket.IO protocol implemented by hand

`socket.io-client` weighs over 30 KB compressed, and Voodoo has no runtime dependencies. It turns
out the slice of protocol that a page really uses is small, and fits in plain text over native WebSocket.

## What is implemented

- Engine.IO v4 handshake directly on WebSocket (`?EIO=4&transport=websocket`).
- Engine.IO packets `0` (open), `1` (close), `2` (ping), `3` (pong), `4` (message), `6` (noop).
- Automatic response to server ping, with timings from handshake.
- Socket.IO packets `0` (CONNECT, with `auth`), `1` (DISCONNECT), `2` (EVENT), `3` (ACK) and
  `4` (CONNECT_ERROR).
- `emit` with ack, and response to events that ask for ack.
- Reconnection with progressive wait, redoing the entire handshake.

## What **is not** implemented

Said without sugar-coating, because promising compatibility that doesn't exist costs dearly later:

- **Binary attachments.** Packets `5` (BINARY_EVENT) and `6` (BINARY_ACK) and Engine.IO binary
  frames are ignored, with a warning on the console in development mode. Send data as JSON or base64.
- **Polling transport and upgrade.** The connection opens straight in WebSocket. Without WebSocket
  in the environment, nothing opens — there's no fallback path via long-polling.
- **Namespaces.** Only the default namespace `/`. The decoder *reads* the namespace from a packet,
  but the client doesn't manage multiple namespaces at once.
- **Client-side rooms.** Socket.IO rooms are a server concept. What exists here is the convention
  of `join`/`leave` and the envelope described above; the server is what actually puts the socket
  in a room.
- **Multiplexing multiple sockets over one connection** and **connection state recovery**
  (`connection state recovery`) from Socket.IO v4.

If you need any item from that list, use `socket.io-client`. This module is sufficient for `emit`,
`on`, ack, rooms and reconnection against a Socket.IO v4 server — and nothing else.

---

# Reconnection and dead connection

## Progressive wait with jitter

The wait doubles with each attempt up to the ceiling, and jitter spreads the clients within the
window. With defaults: 500 ms, 1 s, 2 s, 4 s… up to 30 s, each varying ±30%.

Jitter exists for a practical reason: without it, a thousand tabs that drop together all come back
in the same millisecond and bring the server down again, right when it's recovering.

`close()` stops for good. A scheduled reconnection is cancelled, and nothing opens back without
an explicit `open()`.

## Dead connection detection

**`readyState` lies.** When the network drops without FIN — cable pulled, WiFi gone, phone switched towers — the socket keeps saying `OPEN` for minutes, and the page looks connected while nothing arrives.

So the module doesn't trust it:

- **Native transport:** sends `pingPayload` every `heartbeat` ms and drops the connection if
  nothing arrives in `heartbeat + heartbeatTimeout`. Any frame that arrives counts as proof of life
  and restarts the count — real traffic is better proof than any pong.
- **Socket.IO transport:** the server sends the ping, and the window comes from the handshake
  (`pingInterval + pingTimeout`).

The `ping` of the native transport is a convention of this module, not of the protocol. A server
that doesn't expect it can simply ignore it, but if it gets in the way, use `heartbeat: 0` to turn
it off or `pingPayload` to change the text. The `pongPayload` that comes back is swallowed and
never becomes an application message.

## Send queue

`emit` before the connection opens stores the message and dispatches everything on opening. The queue
has a ceiling (`queueLimit`, default 64) because a connection that never opens would turn `emit`
into a silent leak. When full, the oldest goes out: in realtime, new data is worth more than old.

---

# Cleanup

Destroying the element closes the connection, leaves all rooms, removes **all** listeners and
clears all timers. No exception: a connection opened by an element that's already dead is a leak
that only shows up weeks later as a server bill.

`V.socket.close()` brings down all live connections at once, which is useful when switching routes
or leaving the application.

---

# Size and distribution

With the module inside the complete build, `voodoo.full.min.js` would go from 127.58 KB to 134.22 KB
compressed, against a ceiling of 133 KB. Raising the target would be the same as not having one, so
the module became its own entry — the same decision, for the same reason, that the [GPU layer](gpu.md)
had already made.

The result: `voodoo.core.min.js`, `voodoo.min.js` and `voodoo.full.min.js` stay the same size,
and whoever uses WebSocket pays for WebSocket. In ESM the two sides share the same runtime, because
common parts come out in shared chunks.
