# Pokedex

A Voodoo.js showcase consuming a real public API, the
[PokeAPI](https://pokeapi.co/api/v2/). More than one thousand three hundred
species, with search, filter by type, infinite scroll, favourites that survive a
reload and a radar chart of each Pokemon's stats.

Open it through the local server, not through `file://`, because the demo makes
requests:

```
node scripts/serve.mjs 5180
```

Then go to `http://localhost:5180/examples/pokedex/`.

This demo loads the **full** bundle (`voodoo.full.min.js`), because it uses the
charts module.

## What the demo shows

- A grid of cards with sprite, number, name and coloured types, each card tinted
  with the colour of its primary type.
- Search by name or number with a 350 ms wait before refiltering.
- Filter by type, fed by a second call to the API.
- Infinite scroll in batches of 24, with a load more button as an alternative.
- Detail modal with measurements, abilities, stat bars and a radar chart that
  changes colour according to the type.
- Favourites kept in a global store that persists on its own.
- Loading, empty and error states all handled, with skeletons on the first load.
- Light and dark theme.

## Voodoo features exercised

| Feature | Where it shows up |
| --- | --- |
| `V.component` with `state`, `computed`, `watch` and `methods` | all the logic of the screen |
| `v-for` with `:key` | grid, types, abilities, bars and chips |
| `v-if` and `v-show` | error, empty and loading states, and the modal |
| `v-model` and `v-debounce` | search field and sort selector |
| `v-resource` | list of types, with `.data`, `.loading`, `.error` and `.reload()` |
| `v-cache` | ten minutes of cache on the types call |
| `v-chart` | reactive radar chart of the stats |
| `v-infinite-scroll` | infinite scroll in batches of 24 |
| `v-motion="fadeUp"` | entrance of the cards |
| `v-transition` | opening and closing of the modal |
| `V.store(..., { persist: true })` | favourites, read in the HTML through `$store.pokedex` |
| `V.http.get` with `cache`, `retry` and `timeout` | index and details |
| `$theme`, `V.toast`, `V.throttle`, `V.sortBy`, `V.formatNumber` | support |
| `@click.self`, `@keyup.esc.window`, `v-click.stop` | closing the modal, favouriting |

## Two implementation notes

The grid uses `v-show`, not `v-if`. A `v-for` that is only walked after
`V.start()` stops reacting to changes in the array, so the list container has to
exist from the start. The same reason explains why the error and empty states,
which have no live list inside them, stay on `v-if`.

The modal keeps a boolean of its own, `modalAberto`, instead of relying on
`selecionado` being null. That way the content goes on reading the last Pokemon
while the exit animation plays, with no expression trying to read a property of
null.
