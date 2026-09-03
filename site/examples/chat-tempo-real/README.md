# Real-time chat

A chat that really works: WebSocket on both sides, a public room, private messages, live presence
and automatic reconnection that rejoins the room.

Unlike the demo in `examples/chat/`, which fakes the replies, this one talks to a real server,
written in `scripts/chat-servidor.mjs` with no dependencies at all: the RFC 6455 handshake and
framing are right there, by hand, in about 80 lines.

## How to run

```bash
# at the project root, with dist already built
npm run build --workspace=voodoojs
node scripts/chat-servidor.mjs
```

Open <http://localhost:5174/examples/chat-tempo-real/> in **two tabs**. To choose the name, add
`?nome=ana`.

## What you can try

- **Public room.** Type in one tab and watch it show up in the other.
- **Private message.** Click `privado` next to someone in the list and send. Only the two of you
  see it, and the message arrives with a highlighted border.
- **Presence.** Close one tab and watch the list shrink in the other.
- **Reconnection.** Kill the server with `Ctrl+C`. The status turns into "reconectando..." and the
  wait between attempts grows. Start the server again: the connection comes back on its own, **the
  room is rejoined** and presence rebuilds itself. That last step is the one almost every
  implementation forgets.
- **Room authorization.** Try to enter someone else's private room from the console:
  `V.socket.open[0].join('dm:bia+caio')`. The server refuses, because the server is the one that
  decides.

## The point that matters

Privacy is the server's responsibility. A room's `privada` flag and a message's recipient are
**requests** the client makes. What refuses entry and what chooses where each message goes is
`podeEntrar()` and the routing in `scripts/chat-servidor.mjs`.

A "private" that depended on this page alone would be a lie: anyone who opens the console joins
whatever room they want and listens to whatever event they want. It is all explained in
[`docs/websocket.md`](../../docs/websocket.md).

## How the page is put together

```html
<div v-socket="ws://localhost:5174/chat" v-room="geral" v-on-socket:voce="eu = $event">
  <span v-text="$socket.connected ? 'conectado' : 'reconectando...'"></span>
  <li v-for="m in $room.members">{ m.nome }</li>
  <li v-for="m in $room.messages">{ m.autor }: { m.texto }</li>
  <form @submit.prevent="$room.send('mensagem', { texto: rascunho }, destino || undefined)">
</div>
```

The real-time layer has an entry point of its own (`dist/socket.js`) and does not ship in the CDN
bundles, so this demo loads Voodoo as ESM: that way both sides share the same chunks and, with
them, the same directive registry.
