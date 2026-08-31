# Pokedex

Vitrine da Voodoo.js consumindo uma API publica de verdade, a
[PokeAPI](https://pokeapi.co/api/v2/). Mais de mil e trezentas especies, com
busca, filtro por tipo, rolagem infinita, favoritos que sobrevivem ao
recarregar e um grafico de radar com os atributos de cada Pokemon.

Abra pelo servidor local, nao pelo `file://`, porque a demo faz requisicoes:

```
node scripts/serve.mjs 5180
```

E acesse `http://localhost:5180/examples/pokedex/`.

Esta demo carrega o bundle **completo** (`voodoo.full.min.js`), porque usa o
modulo de graficos.

## O que a demo mostra

- Grade de cartoes com sprite, numero, nome e tipos coloridos, cada cartao
  tingido pela cor do tipo principal.
- Busca por nome ou numero com espera de 350 ms antes de refiltrar.
- Filtro por tipo, alimentado por uma segunda chamada a API.
- Rolagem infinita em lotes de 24, com botao de carregar mais como alternativa.
- Modal de detalhe com medidas, habilidades, barras de atributo e um grafico de
  radar que muda de cor conforme o tipo.
- Favoritos guardados em um store global que persiste sozinho.
- Estados de carregando, vazio e erro tratados, com esqueletos na primeira carga.
- Tema claro e escuro.

## Recursos da Voodoo exercitados

| Recurso | Onde aparece |
| --- | --- |
| `V.component` com `state`, `computed`, `watch` e `methods` | toda a logica da tela |
| `v-for` com `:key` | grade, tipos, habilidades, barras e chips |
| `v-if` e `v-show` | estados de erro, vazio, carregando e o modal |
| `v-model` e `v-debounce` | campo de busca e seletor de ordenacao |
| `v-resource` | lista de tipos, com `.data`, `.loading`, `.error` e `.reload()` |
| `v-cache` | dez minutos de cache na chamada dos tipos |
| `v-chart` | grafico de radar dos atributos, reativo |
| `v-infinite-scroll` | rolagem infinita em lotes de 24 |
| `v-motion="fadeUp"` | entrada dos cartoes |
| `v-transition` | abertura e fechamento do modal |
| `V.store(..., { persist: true })` | favoritos, lidos no HTML por `$store.pokedex` |
| `V.http.get` com `cache`, `retry` e `timeout` | indice e detalhes |
| `$theme`, `V.toast`, `V.throttle`, `V.sortBy`, `V.formatNumber` | apoio |
| `@click.self`, `@keyup.esc.window`, `v-click.stop` | fechar o modal, favoritar |

## Duas anotacoes de implementacao

A grade usa `v-show`, e nao `v-if`. Um `v-for` que so e percorrido depois do
`V.start()` para de reagir a mudancas no array, entao o container da lista
precisa existir desde o inicio. O mesmo motivo explica por que os estados de
erro e vazio, que nao tem lista viva dentro, continuam com `v-if`.

O modal guarda um booleano proprio, `modalAberto`, em vez de depender de
`selecionado` ser nulo. Assim o conteudo continua lendo o ultimo Pokemon
enquanto a animacao de saida acontece, sem nenhuma expressao tentando ler
propriedade de nulo.
