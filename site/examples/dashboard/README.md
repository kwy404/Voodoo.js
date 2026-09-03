# Admin dashboard

A complete sales dashboard, with animated metrics, three charts wired to the same
period filter and a table with search and sorting. There is no server: the 420
orders are generated in the browser itself by a draw with a fixed seed, so the
numbers always come out the same and one period can be compared with another.

This demo loads the **full** bundle (`voodoo.full.min.js`), because it uses the
charts module.

## What the demo shows

- Four metric cards with numbers that count up in an animation and a comparison
  with the previous period, in green or red.
- Area chart of revenue over time, with a smooth curve.
- Bar chart by category comparing the current period with the previous one.
- Doughnut chart with the split by sales channel.
- A single period selector, from 7 days to 6 months, that recalculates the
  metrics, the three charts and the table all at once.
- Table with sorting by any column and search with a 250 ms wait.
- Empty state when the search finds nothing.
- Light and dark theme, and a layout that rearranges itself on the phone.

## Voodoo features exercised

| Feature | Where it shows up |
| --- | --- |
| `V.component` with `state`, `computed` and `methods` | all the logic of the dashboard |
| chained `computed` | `pedidos` feeds the metrics, the charts and the table |
| `v-chart` | the three charts, reactive to the period |
| `v-count` | the metric numbers, with `v-count-format` bound through `:` |
| `v-for` with `:key` | metrics, columns, table rows and period buttons |
| `v-show` and `v-if` | table and empty state |
| `v-model` and `v-debounce` | search field |
| `v-theme-toggle` | theme button, without a line of JavaScript |
| `:class` and `:style` | colour of the change, colour of the status, colour of each card |
| `V.sortBy`, `V.unique`, `V.formatCurrency`, `V.formatDate` | support |

## One implementation note

The table container uses `v-show`, not `v-if`. A `v-for` that is only walked
after `V.start()` stops reacting to changes in the array, so the table has to
exist in the DOM from the start. The empty state, which has no live list inside
it, stays on `v-if`.

Worth noting too that in this charts library `type: 'bar'` draws the bars
standing up and `type: 'column'` draws them lying down, the opposite of what the
name suggests at first sight.
