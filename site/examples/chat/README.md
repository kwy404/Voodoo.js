# Chat em tempo real com Voodoo.js

Mensageiro simulado, com barra lateral de conversas, bolhas de mensagem,
indicador de digitando e respostas automaticas. Roda so no navegador.

## Como abrir

Abra `examples/chat/index.html`. A demo usa o bundle essencial
`packages/voodoojs/dist/voodoo.min.js` com `data-manual`, entao o componente e
registrado antes de `V.theme.init()` e `V.start()`.

## O que a demo mostra

- `v-for` nas conversas, nas mensagens e na grade de emojis, sempre com `:key`.
- `v-show` nos contadores, no indicador de digitando e no seletor de emojis.
- `v-transition` com as animacoes `fade` e `scale` que a lib ja injeta.
- `V.nextTick` antes de ajustar o `scrollTop`, para rolar depois que a lista
  ja foi atualizada no DOM.
- `@keyup.enter` no campo de texto e `@outside` para fechar o seletor de emojis.
- `v-model`, `v-click`, `v-ref` e `:class` no restante da tela.
- Estados da mensagem que evoluem sozinhos: enviando, enviado e lido.

## Detalhes

Toda a logica fica em `V.component('chat-app', ...)`. O visual combina classes
do design system (`v-avatar`, `v-badge`, `v-input`, `v-btn`) com CSS proprio
escrito so nos tokens `--v-*`, entao os dois temas saem do mesmo codigo. Sao
duas colunas no desktop, uma no celular, e as animacoes respeitam
`prefers-reduced-motion`.
