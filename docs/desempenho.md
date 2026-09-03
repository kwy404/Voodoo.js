# Performance

## How granular updates work

There's no Virtual DOM. There's no tree comparison. There's no component rerender.

The model is: **a `Proxy` that tracks reads by key, and one effect per piece of DOM**.

```html
<div v-data="{ name: 'Ana', age: 30 }">
  <p v-text="name"></p>       <!-- effect 1, depends on "name" -->
  <p v-text="age"></p>        <!-- effect 2, depends on "age" -->
  <p>{ name } is { age }</p>   <!-- effect 3, depends on both -->
</div>
```

When `name` changes:

1. the proxy's `set` compares the new value with the old one, and stops if they're equal;
2. effects that read the key `name` are queued;
3. the queue is processed in a microtask, with each effect running only once;
4. effect 1 writes to `textContent`, and effect 3 recomposes its text.

Effect 2 is never executed. The second paragraph is not read, not compared, not touched.

The path from change to pixel is: `set` on proxy, queue, `textContent`. Nothing more.

## Batching and microtask

Multiple changes in the same task become a single pass:

```js
state.a = 1;
state.b = 2;
state.c = 3;
// affected effects run only once, in the microtask
await V.nextTick();
```

Duplicate effects are deduplicated within the run. If an effect re-executes too much in the same
run, the scheduler notices the loop and stops with a warning, instead of freezing the tab.

## Size

| File | Raw | gzip | brotli |
| --- | --- | --- | --- |
| `voodoo.min.js` | about 235 KB | about 75 KB | about 64 KB |
| `voodoo.full.min.js` | about 399 KB | about 120 KB | about 100 KB |

The numbers change with each release. The `npm run size` script measures the actual files and fails when
any exceeds the declared target, so size regressions are caught in CI.

For bundler imports, everything is tree-shakeable:

```js
import { debounce } from 'voodoojs/utils';   // only debounce goes into your build
import { reactive } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
```

For a custom browser bundle, with only the modules you use:

```bash
npx voodoojs-cli build
```

## Best practices

### Use `:key` in v-for

Without a key, blocks are identified by position. With a key, they are reused when the
list changes order, and internal state (focus, typed value, scroll, animation) survives.

```html
<li v-for="product in products" :key="product.id">{ product.name }</li>
```

### Prefer v-show to v-if for frequent toggling

`v-if` truly mounts and unmounts. `v-show` just switches `display`.

```html
<div v-show="activeTab === 'profile'">...</div>   <!-- toggles often -->
<div v-if="user.admin">...</div>                   <!-- decides once -->
```

### Keep expressions short

Every attribute expression is re-evaluated when a dependency changes. Expensive calculations are better
in a component computed or in a function.

```html
<!-- re-evaluates the entire list on each change -->
<span>{ orders.filter(p => p.paid).reduce((s, p) => s + p.total, 0) }</span>

<!-- calculates once and reuses -->
<span>{ totalPaid }</span>
```

```js
V.component('panel', {
  computed: {
    totalPaid() {
      return this.orders.filter((p) => p.paid).reduce((s, p) => s + p.total, 0);
    },
  },
});
```

### Don't create objects and arrays inside reactive expressions

```html
<!-- creates a new object on each evaluation -->
<div :style="{ width: width + 'px' }"></div>
```

For a simple case like this there's no problem. In a list with hundreds of items, prefer
to calculate in state.

### Mark what doesn't need to be reactive

```js
V.data({
  map: V.markRaw(new google.maps.Map(el)),
  editor: V.markRaw(createEditor()),
});
```

Instances of external libraries, DOM elements and large structures that you replace
entirely gain nothing from becoming a proxy.

### Use debounce on text inputs

```html
<input v-model.debounce="search" v-debounce="300">
<input v-search="/api/search" v-debounce="400" v-min-length="3">
```

### Request caching

```html
<div v-resource="countries: /api/countries" v-cache="1h"></div>
```

```js
await V.http.get('/api/config', { cache: 300_000 });
```

### Load images on demand

```html
<img v-lazy-src="/photos/large.jpg" alt="">
```

### Load page sections on demand

```html
<section v-load-visible="/partials/testimonials.html">Loading...</section>
```

### Prefer paginated lists

`v-for` renders all source items without virtualization. A list with ten thousand rows creates
ten thousand elements. Paginate, or use infinite scroll:

```html
<ul v-infinite-scroll="loadNext()">
  <li v-for="item in items" :key="item.id">{ item.name }</li>
</ul>
```

### Disable the observer when you don't need it

The `MutationObserver` that initializes HTML created later has low cost, but on pages that manipulate
the DOM extensively on their own it can be disabled:

```html
<script src="voodoo.min.js" data-no-observer defer></script>
```

```js
V.walk(newElement);  // initialize by hand when needed
```

### Choose the right bundle

If the page has no chart, router, translation or ready-made component, use `voodoo.min.js`. That's
tens of kilobytes difference per visit.

## What the library already does for you

- **Segmented interpolation.** A text node with three expressions becomes one effect that
  recomposes only that node.
- **Cursor-based reordering.** `v-for` moves existing blocks instead of recreating them.
- **Parser cache.** Each expression is analyzed once, and the tree is stored.
- **On-demand CSS.** A UI component's style only enters the document when that
  feature is used.
- **Canceled requests.** A new request from the same element aborts the previous one.
- **Single animation loop.** All active animations share the same
  `requestAnimationFrame`.
- **Automatic cleanup.** Removing an element from the DOM stops its effects, removes listeners and
  ends observers. No leaks from forgetfulness.
- **Cheap chart redraws.** SVG is generated as text and delivered at once.

## Measuring

```js
V.config.devtools = true;   // warnings and named anchors
V.xray();                   // performance tab, with effects per element
```

In the inspector's performance tab, each element shows how many effects depend on it and how many
times each re-executed. A high number in a small place usually means too many expressions in one
block.

To measure size in your own project:

```bash
npm run size
```

---

Previous: [Security](seguranca.md) · Next: [Migrating from jQuery](migrando-do-jquery.md)
