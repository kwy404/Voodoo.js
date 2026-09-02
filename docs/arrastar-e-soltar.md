# Drag and drop

Complete drag and drop system built on pointer events. The HTML5 Drag and Drop API was deliberately
left aside: it doesn't work well with touch, doesn't let you customize the drag image, and doesn't
help with sortable lists.

Everything works with mouse, pen, touch, and keyboard.

## v-sortable

Reorderable list.

```html
<ul v-sortable>
  <li data-id="1">First</li>
  <li data-id="2">Second</li>
  <li data-id="3">Third</li>
</ul>
```

Direct children become draggable items. On drop, the list fires `voodoo:sorted`:

```html
<ul v-sortable @voodoo:sorted="saveOrder($detail.order)">
  <li v-for="tarefa in tarefas" :key="tarefa.id" :data-id="tarefa.id">{ tarefa.titulo }</li>
</ul>
```

The `detail` carries:

| Field | What it is |
| --- | --- |
| `item` | The moved element |
| `oldIndex`, `newIndex` | Positions before and after |
| `from`, `to` | Source and destination lists |
| `order` | Array with keys in current order |

Each item's key is its `data-id`, or `id`, or position.

### Drag handle

Without a handle, the entire item is draggable. With a handle, only the chosen part:

```html
<ul v-sortable v-sortable-handle=".handle">
  <li>
    <span class="handle">≡</span>
    <span>Item with handle</span>
  </li>
</ul>
```

The selector can also go in the directive's value: `v-sortable=".handle"`.

## Groups

Lists in the same group exchange items with each other:

```html
<div v-dnd-group="kanban">
  <ul v-sortable><li>To do</li></ul>
  <ul v-sortable><li>Doing</li></ul>
  <ul v-sortable><li>Done</li></ul>
</div>
```

`v-dnd-group` defines the group for all descendants. To declare case by case, use
`v-sortable-group`, `v-draggable-group`, and `v-droppable-group`:

```html
<ul v-sortable v-sortable-group="tasks">...</ul>
<ul v-sortable v-sortable-group="tasks">...</ul>
<ul v-sortable v-sortable-group="files">...</ul>
```

An item only goes into a list in the same group. Lists without a group don't receive items from outside.

When an item moves between lists, the `voodoo:sorted` event fires on both, each with its own
order.

## v-draggable

Item that is dragged to a drop area, without reordering anything.

```html
<div v-draggable v-draggable-data="produto">
  { produto.nome }
</div>
```

| Attribute | What it does |
| --- | --- |
| `v-draggable-data` | Expression evaluated at drag time. Reaches the destination |
| `v-draggable-handle` | Handle selector |
| `v-draggable-axis` | `x` or `y`, to lock movement to one axis |
| `v-draggable-group` | Item's group |

The directive's value also works as a data expression: `v-draggable="produto"`.

## v-droppable

Area that receives items.

```html
<div v-droppable="addToCart($detail.data)" v-droppable-accept=".product">
  Drop a product here
</div>
```

The expression receives:

| Variable | What it is |
| --- | --- |
| `$detail.item` | The dropped element |
| `$detail.data` | The value of `v-draggable-data` |
| `$detail.from` | Source list or element |
| `$detail.to` | The drop area itself |
| `$detail.index` | Item position in destination list |
| `$event` | The `CustomEvent` `voodoo:drop` |

| Attribute | What it does |
| --- | --- |
| `v-droppable-accept` | CSS selector the item must match to be accepted |
| `v-droppable-group` | Accepted group |

## State classes

| Class | When |
| --- | --- |
| `v-draggable`, `v-sortable`, `v-droppable` | Applied on mount |
| `v-drag-handle` | On item or handle, sets cursor |
| `v-dragging` | On item while it's being dragged |
| `v-drag-ghost` | On the clone that follows the cursor |
| `v-drag-invalid` | On clone when current destination doesn't accept the item |
| `v-drop-active` | On all compatible destinations during drag |
| `v-drop-over` | On destination under cursor |
| `v-grabbed` | On item grabbed by keyboard |

All use `--v-*` variables, so they follow the palette and theme.

## Events

| Event | Where | `detail` |
| --- | --- | --- |
| `voodoo:drag-start` | On item | `{ item, data, group }` |
| `voodoo:drag-end` | On item | `{ item, data }` |
| `voodoo:drag-cancel` | On item | `{ item }` |
| `voodoo:sorted` | On list | `{ item, oldIndex, newIndex, from, to, order }` |
| `voodoo:drop` | On drop area | `{ item, data, from, to, index }` |

## Accessibility

Dragging works entirely by keyboard with announcements in an `aria-live` region:

| Key | What it does |
| --- | --- |
| Space | Grab item. Press again to drop |
| Arrows | In `v-sortable`, move item in list. In `v-draggable`, cycle through destinations |
| Side arrows | In vertical lists of a group, switch lists |
| Escape | Cancel drag and return item to place |

Each item gets `tabindex="0"` and `aria-grabbed`. Drop areas get `aria-dropeffect`.
Lists get `aria-label` when they don't have one. Give each list its own `aria-label` so the
announcement "moved to list 2 of 3" is clearer:

```html
<div v-dnd-group="kanban">
  <ul v-sortable aria-label="To do">...</ul>
  <ul v-sortable aria-label="Doing">...</ul>
</div>
```

## Auto-scroll

When the cursor gets near the edge of a scrollable container, or the window, scrolling happens
on its own during drag. The nearest scrollable container is detected by `overflow`.

## Complete example: a kanban board

```html
<div v-data="{ colunas: { fazer: [], fazendo: [], feito: [] } }" v-dnd-group="kanban">
  <div class="board">
    <section>
      <h3>To do</h3>
      <ul v-sortable aria-label="To do" @voodoo:sorted="save($detail)">
        <li v-for="c in colunas.fazer" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>

    <section>
      <h3>Doing</h3>
      <ul v-sortable aria-label="Doing" @voodoo:sorted="save($detail)">
        <li v-for="c in colunas.fazendo" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>

    <section>
      <h3>Done</h3>
      <ul v-sortable aria-label="Done" @voodoo:sorted="save($detail)">
        <li v-for="c in colunas.feito" :key="c.id" :data-id="c.id">{ c.titulo }</li>
      </ul>
    </section>
  </div>
</div>
```

```js
V.data({
  save(detail) {
    V.http.post('/api/board/order', {
      list: detail.to.getAttribute('aria-label'),
      order: detail.order,
    });
  },
});
```

> Important detail: `v-sortable` moves elements in the DOM but doesn't reorder the `v-for` array.
> Save the new order to the server or reorder the array yourself inside
> `voodoo:sorted`, or the next render will return to the old order.

## Example: dropping in a trash

```html
<div v-data="{ files: [{ id: 1, nome: 'nota.pdf' }] }">
  <ul>
    <li v-for="a in files" :key="a.id" class="file" v-draggable v-draggable-data="a">
      { a.nome }
    </li>
  </ul>

  <div class="trash"
       v-droppable="files = files.filter(x => x.id !== $detail.data.id)"
       v-droppable-accept=".file"
       aria-label="Trash">
    Drop here to delete
  </div>
</div>
```

---

Previous: [Interface](interface.md) · Next: [Animations](animacoes.md)
