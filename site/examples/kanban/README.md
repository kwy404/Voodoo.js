# Kanban board

A complete Kanban board built with Voodoo.js: four columns, cards dragged
between them, create and edit in a modal, filters and local persistence. The
page is a single HTML file that needs no back end and no build step. Open
`index.html` directly, or through any static server.

## What the demo exercises

- `v-sortable` with `v-sortable-group` and `v-dnd-group`, on the mouse, on touch
  and on the keyboard: Space picks the card up, the arrow keys move it, Space
  drops it and Esc cancels.
- `v-for` with `:key`, `v-model`, `v-if`, `v-show`, computed values and
  `V.component()`.
- `V.confirm` to delete, `V.toast` for the acknowledgement, `V.storage` to keep
  the board and `V.theme` for the light and dark themes.

## The delicate part: keeping the array and the DOM in agreement

`v-sortable` moves the node in the DOM before it tells you. The `voodoo:sorted`
event arrives with `detail.order`, the list of `data-id` values for that list in
its new order, which is why every card carries `:data-id`. When a card changes
column the event fires twice, once per list, each time with the order of the
list that fired it. The `onSorted` method therefore uses the list that received
the event, reads its `data-column`, and rebuilds the whole array in
`applyOrder`.

The filter hides a card with `v-show`, it never removes it from the `v-for`.
That keeps `order` describing the whole column, so no hidden card is lost. The
four columns are written out by hand in the HTML rather than generated with
`v-for`, so every list is walked on the initial page load.

## Theme

The page carries the same three-state theme as the rest of the site: the system
preference decides unless the visitor picks one, and an explicit choice wins in
both directions. The library's own widgets — the confirm dialog, the toasts, the
drag ghost — are painted from `--v-*` variables, which the stylesheet maps onto
the page palette so the two can never disagree.
