# Chat em tempo real

Chat funcionando de verdade: WebSocket dos dois lados, sala pública, mensagem privada, presença ao
vivo e reconexão automática com reentrada na sala.

Diferente da demo em `examples/chat/`, que simula as respostas, esta conversa com um servidor real
— escrito em `scripts/chat-servidor.mjs`, sem nenhuma dependência: o handshake e o enquadramento do
RFC 6455 estão ali, à mão, em cerca de 80 linhas.

## Como rodar

```bash
# na raiz do projeto, com o dist já construído
npm run build --workspace=voodoojs
node scripts/chat-servidor.mjs
```

Abra <http://localhost:5174/examples/chat-tempo-real/> em **duas abas**. Para escolher o nome,
acrescente `?nome=ana`.

## O que dá para experimentar

- **Sala pública.** Escreva numa aba e veja aparecer na outra.
- **Mensagem privada.** Clique em `privado` ao lado de alguém na lista e mande. Só vocês dois veem,
  e a mensagem chega com a borda destacada.
- **Presença.** Feche uma aba e veja a lista encolher na outra.
- **Reconexão.** Derrube o servidor com `Ctrl+C`. O status vira "reconectando..." e a espera entre
  as tentativas cresce. Suba o servidor de novo: a conexão volta sozinha, **a sala é refeita** e a
  presença se reconstrói. É esse último passo que quase toda implementação esquece.
- **Autorização de sala.** Tente entrar numa sala privada de outra pessoa pelo console:
  `V.socket.open[0].join('dm:bia+caio')`. O servidor recusa, porque é ele quem decide.

## O ponto importante

Privacidade é responsabilidade do servidor. A etiqueta `privada` de uma sala e o destinatário de
uma mensagem são **pedidos** que o cliente faz. Quem recusa a entrada e quem escolhe para quem cada
mensagem sai é o `podeEntrar()` e o roteamento em `scripts/chat-servidor.mjs`.

Um "privado" que dependesse só desta página seria falso: quem abre o console entra na sala que
quiser e escuta o evento que quiser. Está tudo explicado em [`docs/websocket.md`](../../docs/websocket.md).

## Como a página está montada

```html
<div v-socket="ws://localhost:5174/chat" v-room="geral" v-on-socket:voce="eu = $event">
  <span v-text="$socket.conectado ? 'conectado' : 'reconectando...'"></span>
  <li v-for="m in $room.membros">{ m.nome }</li>
  <li v-for="m in $room.mensagens">{ m.autor }: { m.texto }</li>
  <form @submit.prevent="$room.enviar('mensagem', { texto: rascunho }, destino || undefined)">
</div>
```

A camada de tempo real tem entrada própria (`dist/socket.js`) e não vem nos bundles de CDN, então
esta demo carrega a Voodoo em ESM: assim os dois lados compartilham os mesmos chunks e, com eles, o
mesmo registro de directives.
