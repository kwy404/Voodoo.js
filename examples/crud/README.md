# CRUD de usuarios

Cadastro completo de usuarios em um unico arquivo HTML, com o bundle essencial da Voodoo.js
(`dist/voodoo.min.js`) mais o design system. Abra `index.html` no navegador, sem servidor.

## O que a demo mostra

- Tabela `v-table v-table--hover` dentro de `v-table-wrap`, montada com `v-for` e `:key`.
- Painel lateral com formulario validado por `v-validate` e regras por atributo:
  `v-required`, `v-email`, `v-minlength`, `v-cpf`, `v-phone` e `v-match="#crud-senha"`
  na confirmacao de senha. A biblioteca desenha sozinha o `<span class="v-field-error">`
  e marca `.v-invalid` no campo.
- Mascaras `v-mask="cpf"` e `v-mask="phone"`, que formatam antes do `v-model` gravar.
- Envio com `@submit.prevent="salvar()"` e `V.validateForm(this.$refs.formulario)` dentro
  do metodo. Nada e gravado enquanto `valid` for falso.
- Busca com `v-debounce="350"` no `v-model`, por nome, e-mail, CPF ou telefone.
- `V.toast` para sucesso e erro, `V.confirm` para a exclusao, computados para as metricas,
  estado de carregando com esqueleto e estado vazio para busca sem resultado.
- Tema claro e escuro pelos tokens `--v-*`, alternados por `v-theme-toggle`.

## Como a API foi simulada, e por que

Nao existe back-end aqui, entao um array em memoria (`BANCO`) faz o papel do banco de dados.
Cada operacao passa por `V.sleep(420)`, para a interface exercitar de verdade os estados de
carregando e de botao desabilitado, e tem 25 por cento de chance de falhar quando a chave
"Simular instabilidade da API" esta ligada. Foi a escolha mais honesta: `v-submit` e as
directives HTTP fariam requisicao real e quebrariam sem servidor, enquanto um array sincrono
esconderia justamente o que a demo precisa mostrar, que e o caminho de erro. Alem do sorteio,
o e-mail repetido devolve um erro de negocio, para provar o mesmo tratamento com uma falha
previsivel. A primeira carga nunca falha, para a pagina sempre abrir com dados.
