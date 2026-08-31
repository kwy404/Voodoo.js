# Loja

Catalogo, filtros, carrinho lateral e finalizacao em quatro etapas. Tudo roda no
navegador, sem servidor. O carrinho fica em um store global da Voodoo, e por isso
aparece direto no HTML por `$store.carrinho`, inclusive no contador do topo, que
esta fora do escopo de qualquer componente de carrinho.

## O que a demo mostra

- Catalogo em grade com 12 produtos, etiqueta de desconto, nota em estrelas e
  preco cheio riscado quando ha promocao.
- Filtro por categoria, faixa de preco por controle deslizante, ordenacao e
  busca com espera de 250 ms.
- Gaveta lateral do carrinho com quantidade por item, remover, subtotal,
  desconto, frete e total, todos formatados em reais.
- Cupom de desconto, com tres codigos validos: `VOODOO10`, `MAGIA20` e `VUDU5`.
- Frete gratis acima de R$ 399,00, recalculado junto com o cupom.
- Contador de itens no botao do carrinho.
- Carrinho persistido: recarregue a pagina e ele continua la.
- Finalizacao em quatro etapas, com identificacao, entrega, pagamento e
  confirmacao, cada etapa validada antes de deixar avancar.
- Tema claro e escuro.

## Recursos da Voodoo exercitados

| Recurso | Onde aparece |
| --- | --- |
| `V.store(..., { persist: true })` | carrinho inteiro, com metodos e totais |
| `$store` no HTML | contador do topo, itens, subtotal, desconto, frete e total |
| `V.component` com `state`, `computed` e `methods` | catalogo, filtros e etapas |
| `v-for` com `:key` | produtos, itens do carrinho, categorias e passos |
| `v-show` e `v-transition` | gaveta, fundo escuro e cada etapa |
| `v-model` e `v-model.number` | busca, categoria, ordenacao e faixa de preco |
| `v-mask` | telefone, CEP, cartao, validade e codigo de seguranca |
| `v-validate` e regras por atributo | `v-required`, `v-email`, `v-phone`, `v-cep`, `v-creditcard` |
| `V.validateForm` | valida a etapa atual antes de avancar |
| `v-theme-toggle` | botao de tema, sem JavaScript proprio |
| `V.toast` | produto adicionado, cupom aplicado ou invalido, pagamento |
| `@keyup.enter`, `@keyup.esc.window` | aplicar cupom, fechar a gaveta |
| `V.formatCurrency`, `V.sortBy`, `V.sleep`, `V.random` | apoio |

## Duas anotacoes de implementacao

Os totais sao gravados no proprio store por um metodo `recalcular`, em vez de
ficarem em getters. A definicao de store passa por uma copia rasa, o que
congelaria um getter no valor inicial, entao guardar o resultado calculado e o
caminho seguro e deixa o HTML bem mais simples de ler.

Cada etapa da finalizacao e um `<form>` separado com `v-validate`. Assim
`V.validateForm` valida somente os campos daquela etapa, e as mensagens de erro
aparecem abaixo de cada campo sem nenhum codigo de apresentacao na demo.
