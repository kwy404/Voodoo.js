# Painel administrativo

Painel de vendas completo, com metricas animadas, tres graficos ligados ao mesmo
filtro de periodo e uma tabela com busca e ordenacao. Nao existe servidor: os
420 pedidos sao gerados no proprio navegador por um sorteio com semente fixa,
entao os numeros nascem sempre iguais e da para comparar um periodo com o outro.

Esta demo carrega o bundle **completo** (`voodoo.full.min.js`), porque usa o
modulo de graficos.

## O que a demo mostra

- Quatro cartoes de metrica com numeros que sobem animados e comparacao com o
  periodo anterior, em verde ou vermelho.
- Grafico de area da receita ao longo do tempo, com curva suave.
- Grafico de barras por categoria comparando o periodo atual com o anterior.
- Grafico de rosca com a divisao por canal de venda.
- Um unico seletor de periodo, de 7 dias a 6 meses, que recalcula metricas,
  os tres graficos e a tabela ao mesmo tempo.
- Tabela com ordenacao por qualquer coluna e busca com espera de 250 ms.
- Estado vazio quando a busca nao encontra nada.
- Tema claro e escuro, e layout que se reorganiza no celular.

## Recursos da Voodoo exercitados

| Recurso | Onde aparece |
| --- | --- |
| `V.component` com `state`, `computed` e `methods` | toda a logica do painel |
| `computed` encadeados | `pedidos` alimenta metricas, graficos e tabela |
| `v-chart` | os tres graficos, reativos ao periodo |
| `v-count` | numeros das metricas, com `v-count-format` ligado por `:` |
| `v-for` com `:key` | metricas, colunas, linhas da tabela e botoes de periodo |
| `v-show` e `v-if` | tabela e estado vazio |
| `v-model` e `v-debounce` | campo de busca |
| `v-theme-toggle` | botao de tema, sem uma linha de JavaScript |
| `:class` e `:style` | cor da variacao, cor do status, cor de cada cartao |
| `V.sortBy`, `V.unique`, `V.formatCurrency`, `V.formatDate` | apoio |

## Uma anotacao de implementacao

O container da tabela usa `v-show`, e nao `v-if`. Um `v-for` que so e percorrido
depois do `V.start()` para de reagir a mudancas no array, entao a tabela precisa
existir no DOM desde o inicio. O estado vazio, que nao tem lista viva dentro,
continua com `v-if`.

Vale notar tambem que nesta biblioteca de graficos `type: 'bar'` desenha as
barras em pe e `type: 'column'` desenha deitadas, o contrario do que o nome
sugere a primeira vista.
