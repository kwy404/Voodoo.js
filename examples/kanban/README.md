# Quadro Kanban

Quadro Kanban completo com a Voodoo.js: quatro colunas, cartoes arrastaveis
entre elas, criacao e edicao em modal, filtros e persistencia local. Abra o
`index.html` por um servidor estatico, a partir da raiz do repositorio, para
que os caminhos do design system e do bundle resolvam. Nao precisa de back-end.

## O que a demo exercita

- `v-sortable` com `v-sortable-group` e `v-dnd-group`, no mouse, no toque e no
  teclado: Espaco pega o cartao, as setas movem, Espaco solta e Esc cancela.
- `v-for` com `:key`, `v-model`, `v-if`, `v-show`, computados e `V.component()`.
- `V.confirm` para excluir, `V.toast` para o retorno, `V.storage` para guardar o
  quadro e `V.theme` para o tema claro e escuro, tudo sobre os tokens `--v-*`.

## O ponto delicado: array e DOM em acordo

O `v-sortable` move o no no DOM antes de avisar. O evento `voodoo:sorted` chega
com `detail.order`, a lista dos `data-id` daquela lista na nova ordem, e por
isso cada cartao carrega `:data-id`. Quando o cartao troca de coluna o evento
acontece duas vezes, uma em cada lista, sempre com a ordem da lista que
disparou. O metodo `aoOrdenar` usa a lista que recebeu o evento, le o
`data-coluna` dela e remonta o array inteiro em `aplicarOrdem`.

O filtro esconde cartao com `v-show`, nunca tirando do `v-for`. Assim `order`
sempre descreve a coluna inteira e nenhum cartao escondido se perde. As quatro
colunas estao escritas na mao no HTML, e nao geradas por `v-for`, para que
todas as listas sejam percorridas na carga inicial da pagina.
