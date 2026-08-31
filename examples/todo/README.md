# Lista de tarefas

Demo completa de uma lista de tarefas feita com a Voodoo.js. Abra o
`index.html` direto no navegador, sem servidor e sem passo de compilacao.
Ela usa o bundle essencial (`dist/voodoo.min.js`) com `data-manual`, entao o
componente e o store sao registrados antes de `V.theme.init()` e `V.start()`.

## O que a demo faz

- Adiciona tarefa pelo Enter ou pelo botao, e limpa o campo em seguida.
- Marca como concluida na caixa de selecao, com o texto riscado.
- Edita em linha com duplo clique: Enter salva, Esc cancela, sair do campo salva.
- Remove tarefa e limpa todas as concluidas de uma vez.
- Filtra entre todas, ativas e concluidas, com destaque no filtro escolhido.
- Conta as pendentes com singular e plural corretos e mostra a barra de progresso.
- Guarda tudo no localStorage, entao a lista volta ao recarregar a pagina.
- Reordena a lista arrastando pela alca, no mouse, no toque e pelo teclado.
- Anima a entrada e a saida dos itens, respeitando `prefers-reduced-motion`.
- Alterna entre tema claro e escuro pelos tokens `--v-*` do design system.

## Recursos da Voodoo que aparecem aqui

`V.component()` com `state`, `computed` e `methods`, `V.store()` global com
persistencia lido no HTML por `{ $store.estatisticas.criadas }`, `v-for` com
`:key`, `v-model` (no campo novo, no campo de edicao e direto em `t.feito`),
`v-if`, `v-show`, `v-click`, `v-dblclick`, `v-ref`, `v-theme-toggle`,
`:class`, `:style`, `:data-id`, interpolacao com chave simples, modificadores
de evento (`.enter`, `.esc`, `.space`, `.stop`) e `v-sortable` com
`v-sortable-handle`, que entrega a nova ordem em `$event.detail.order`.

## Detalhe que vale copiar

O `v-for` apaga o no do DOM assim que o item sai do array, o que mataria
qualquer animacao de saida. O metodo `remover()` resolve isso em tres passos:
marca o item com `saindo`, deixa a animacao CSS rodar e so entao tira o item
da lista com `setTimeout`. A espera vira zero quando o usuario pede menos
movimento.
