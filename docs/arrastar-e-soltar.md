# Arrastar e soltar

Sistema completo de arrastar e soltar, construído sobre eventos de ponteiro. A Drag and Drop API
do HTML5 foi deixada de lado de propósito: ela não funciona bem no toque, não deixa customizar a
imagem arrastada e não ajuda em listas ordenáveis.

Tudo funciona com mouse, caneta, toque e teclado.

## v-sortable

Lista reordenável.

```html
<ul v-sortable>
  <li data-id="1">Primeiro</li>
  <li data-id="2">Segundo</li>
  <li data-id="3">Terceiro</li>
</ul>
```

Os filhos diretos viram itens arrastáveis. Ao soltar, a lista dispara `voodoo:sorted`:

```html
<ul v-sortable @voodoo:sorted="salvarOrdem($detail.order)">
  <li v-for="tarefa in tarefas" :key="tarefa.id" :data-id="tarefa.id">{ tarefa.titulo }</li>
</ul>
```

O `detail` traz:

| Campo | O que é |
| --- | --- |
| `item` | O elemento movido |
| `oldIndex`, `newIndex` | Posições antes e depois |
| `from`, `to` | Listas de origem e destino |
| `order` | Array com as chaves na ordem atual |

A chave de cada item é o `data-id`, ou o `id`, ou a posição.

### Alça de arraste

Sem alça, o item inteiro é arrastável. Com alça, só a parte escolhida:

```html
<ul v-sortable v-sortable-handle=".alca">
  <li>
    <span class="alca">≡</span>
    <span>Item com alça</span>
  </li>
</ul>
```

O seletor também pode vir no valor da própria directive: `v-sortable=".alca"`.

## Grupos

Listas do mesmo grupo trocam itens entre si:

```html
<div v-dnd-group="kanban">
  <ul v-sortable><li>A fazer</li></ul>
  <ul v-sortable><li>Fazendo</li></ul>
  <ul v-sortable><li>Feito</li></ul>
</div>
```

`v-dnd-group` define o grupo de todos os descendentes. Para declarar caso a caso, use
`v-sortable-group`, `v-draggable-group` e `v-droppable-group`:

```html
<ul v-sortable v-sortable-group="tarefas">...</ul>
<ul v-sortable v-sortable-group="tarefas">...</ul>
<ul v-sortable v-sortable-group="arquivos">...</ul>
```

Um item só entra em uma lista do mesmo grupo. Listas sem grupo não recebem itens de fora.

Quando um item muda de lista, o evento `voodoo:sorted` é disparado nas duas, cada uma com a
própria ordem.

## v-draggable

Item que é arrastado até uma área de soltura, sem reordenar nada.

```html
<div v-draggable v-draggable-data="produto">
  { produto.nome }
</div>
```

| Atributo | O que faz |
| --- | --- |
| `v-draggable-data` | Expressão avaliada no momento do arraste. Chega ao destino |
| `v-draggable-handle` | Seletor da alça |
| `v-draggable-axis` | `x` ou `y`, para travar o movimento em um eixo |
| `v-draggable-group` | Grupo do item |

O valor da própria directive também vale como expressão de dados: `v-draggable="produto"`.

## v-droppable

Área que recebe itens.

```html
<div v-droppable="adicionarAoCarrinho($detail.data)" v-droppable-accept=".produto">
  Solte um produto aqui
</div>
```

A expressão recebe:

| Variável | O que é |
| --- | --- |
| `$detail.item` | O elemento solto |
| `$detail.data` | O valor de `v-draggable-data` |
| `$detail.from` | Lista ou elemento de origem |
| `$detail.to` | A própria área |
| `$detail.index` | Posição do item na lista de destino |
| `$event` | O `CustomEvent` `voodoo:drop` |

| Atributo | O que faz |
| --- | --- |
| `v-droppable-accept` | Seletor CSS que o item precisa casar para ser aceito |
| `v-droppable-group` | Grupo aceito |

## Classes de estado

| Classe | Quando |
| --- | --- |
| `v-draggable`, `v-sortable`, `v-droppable` | Aplicadas na montagem |
| `v-drag-handle` | No item ou na alça, define o cursor |
| `v-dragging` | No item enquanto ele é arrastado |
| `v-drag-ghost` | No clone que acompanha o cursor |
| `v-drag-invalid` | No clone quando o destino atual não aceita o item |
| `v-drop-active` | Em todos os destinos compatíveis durante o arraste |
| `v-drop-over` | No destino sob o cursor |
| `v-grabbed` | No item pego pelo teclado |

Todas usam as variáveis `--v-*`, então acompanham a paleta e o tema.

## Eventos

| Evento | Onde | `detail` |
| --- | --- | --- |
| `voodoo:drag-start` | No item | `{ item, data, group }` |
| `voodoo:drag-end` | No item | `{ item, data }` |
| `voodoo:drag-cancel` | No item | `{ item }` |
| `voodoo:sorted` | Na lista | `{ item, oldIndex, newIndex, from, to, order }` |
| `voodoo:drop` | Na área de soltura | `{ item, data, from, to, index }` |

## Acessibilidade

O arraste funciona inteiramente pelo teclado, com anúncio em uma região `aria-live`:

| Tecla | O que faz |
| --- | --- |
| Espaço | Pega o item. Pressione de novo para soltar |
| Setas | Em `v-sortable`, move o item na lista. Em `v-draggable`, percorre os destinos |
| Setas laterais | Em listas verticais de um grupo, muda de lista |
| Escape | Cancela o arraste e devolve o item ao lugar |

Cada item recebe `tabindex="0"` e `aria-grabbed`. Áreas de soltura recebem `aria-dropeffect`.
Listas ganham `aria-label` quando não têm um. Dê um `aria-label` próprio a cada lista, para que o
anúncio "movido para a lista 2 de 3" fique mais claro:

```html
<div v-dnd-group="kanban">
  <ul v-sortable aria-label="A fazer">...</ul>
  <ul v-sortable aria-label="Fazendo">...</ul>
</div>
```

## Rolagem automática

Quando o cursor chega perto da borda de um contêiner rolável, ou da janela, a rolagem acontece
sozinha durante o arraste. O contêiner rolável mais próximo é detectado pelo `overflow`.

## Exemplo completo: um quadro kanban

```html
<div v-data="{ colunas: { fazer: [], fazendo: [], feito: [] } }" v-dnd-group="kanban">
  <div class="quadro">
    <section>
      <h3>A fazer</h3>
      <ul v-sortable aria-label="A fazer" @voodoo:sorted="salvar($detail)">
        <li v-for="c in colunas.fazer" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>

    <section>
      <h3>Fazendo</h3>
      <ul v-sortable aria-label="Fazendo" @voodoo:sorted="salvar($detail)">
        <li v-for="c in colunas.fazendo" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>

    <section>
      <h3>Feito</h3>
      <ul v-sortable aria-label="Feito" @voodoo:sorted="salvar($detail)">
        <li v-for="c in colunas.feito" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>
  </div>
</div>
```

```js
V.data({
  salvar(detalhe) {
    V.http.post('/api/quadro/ordem', {
      lista: detalhe.to.getAttribute('aria-label'),
      ordem: detalhe.order,
    });
  },
});
```

> Um detalhe importante: `v-sortable` move os elementos no DOM, mas não reordena o array do
> `v-for`. Guarde a nova ordem no servidor ou reordene o array você mesmo dentro do
> `voodoo:sorted`, senão a próxima renderização volta à ordem antiga.

## Exemplo: soltar em uma lixeira

```html
<div v-data="{ arquivos: [{ id: 1, nome: 'nota.pdf' }] }">
  <ul>
    <li v-for="a in arquivos" :key="a.id" class="arquivo" v-draggable v-draggable-data="a">
      { a.nome }
    </li>
  </ul>

  <div class="lixeira"
       v-droppable="arquivos = arquivos.filter(x => x.id !== $detail.data.id)"
       v-droppable-accept=".arquivo"
       aria-label="Lixeira">
    Solte aqui para excluir
  </div>
</div>
```

---

Anterior: [Interface](interface.md) · Próximo: [Animações](animacoes.md)
