# Performance in practice

This page is about writing fast applications with Voodoo.js. Everything here describes the
actual behavior of code, with the file that implements each thing named, so you
can verify it.

If you want to understand **why** the model is fast, read
[Performance](desempenho.md) first. This page assumes you already know there's no
Virtual DOM and want to know what to do with that information.

> **Before optimizing, measure.** The project's benchmarks are in `benchmarks/`, with scenarios
> for reactive primitives, DOM binding, large lists and the parser, plus a
> baseline in pure JavaScript. Run with `node benchmarks/run.mjs`. Comparing
> numbers between different machines is noise.

---

## 1. Use key in large lists

The most important rule on this page.

`v-for` without `:key` uses `__index_0`, `__index_1` and so on as the key
(`directives/core.ts`). The block at position zero is always reused for the item at
position zero, whatever it is.

While the list only grows at the end, this works. When you sort, filter, remove from
the middle or insert at the start, each block gets data from a different item. The DOM doesn't break,
but every effect of every block re-executes.

```html
<!-- Bad for list that changes order -->
<li v-for="product in products">{ product.name }</li>

<!-- Good -->
<li v-for="product in products" :key="product.id">{ product.name }</li>
```

With a stable key, `v-for` finds the previous block by the key `Map`, updates only the
scope variables of that block and repositions the nodes with a cursor. Blocks whose data
hasn't changed don't trigger any effect.

The impact shows up when the block has internal state:

```html
<!-- Without key, sorting the list shuffles which checkbox was checked. -->
<div v-for="task in tasks" :key="task.id">
  <input type="checkbox" v-model="task.done">
  <input v-model="task.text">
</div>
```

**The key must be stable and unique.** `:key="item.id"` is right. `:key="index"` is the same
as having no key. `:key="Math.random()"` recreates everything on each update, which is the worst case
possible.

Duplicate key makes the list reuse the wrong block when reordering. Enable
`V.config.devtools = true` during development to get the warning.

---

## 2. Prefer `computed` over watcher

`computed` has cache and a dirty mark (`reactivity/index.ts`, `ComputedRefImpl`). It
recalculates on the first read after a dependency changes, and never before. If
no one reads the value, it doesn't recalculate.

```js
// Good: recalculates only when items change, and only if someone reads.
V.component('cart', {
  computed: {
    total() {
      return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },
  },
});
```

```js
// Bad: recalculates always, even if total doesn't appear on screen.
V.component('cart', {
  watch: {
    items() {
      this.total = this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },
  },
});
```

The second form has three problems. It runs even when the total isn't visible, it
stores a derived value in state (which can now become out of sync), and it creates one
more effect.

**Watcher is for side effects**, not for derived values: trigger a request,
save to `localStorage`, call a third-party library. If the result is a value that
the template reads, use `computed`.

The same applies to expressions in HTML. An expression inside `{ }` or `v-text` runs
on each dependency update, without cache:

```html
<!-- Recalculates reduce every time any item changes -->
<p>{ items.reduce((s, i) => s + i.price, 0) }</p>

<!-- Calculates once, and only when items changes -->
<p>{ total }</p>
```

For small lists this doesn't matter. For a list of a thousand items inside a `v-for`,
it matters a lot, because the expression runs once per row.

---

## 3. Be careful with `watch` deep

`watch(source, cb, { deep: true })` uses `traverse` (`reactivity/index.ts`), which walks through the
entire object recursively and **reads every key**. Reading means tracking: the watcher starts
depending on each property of each nested object.

On a small object, it's imperceptible. On an array of a thousand objects with ten fields each, each
trigger does ten thousand tracked reads.

```js
// Expensive: any field of any order triggers.
V.watch(() => this.orders, update, { deep: true });

// Cheap: only what matters.
V.watch(() => this.orders.length, update);
V.watch(() => this.orders.filter((p) => p.status === 'pending').length, update);
```

Watchers declared in a component definition (`watch: { ... }`) are **not** deep.
They observe `proxy[key]`, so changes inside a nested object only trigger if the
reference changes. This is the right behavior in most cases, and it's good to know
this before trying to understand why the watcher "didn't trigger".

`V.store(name, def, { persist: true })` uses `watch` deep internally, to know when
to save. It's the right choice there, but it means that **a large persisted store costs more
than a small persisted store**. Persist what needs to survive reload, not
the entire application cache.

---

## 4. Component `updated` hook is expensive

It's worth reading the code for this, because the implication isn't obvious (`runtime/component.ts`):

```js
queuePostFlush(() => {
  callHook(definition, proxy, 'mounted');
  if (definition.updated) {
    owner.run(() =>
      createEffect(() => {
        // Read all state to react to any change.
        for (const key of Object.keys(state)) void state[key];
        callHook(definition, proxy, 'updated');
      })
    );
  }
});
```

Declaring `updated` creates an effect that **reads all state keys**, and therefore depends
on all of them. Any change in any field triggers the hook.

This is exactly what "updated" means, so it's correct. But it's the opposite of
the rest of the library, which is granular. If you only need to react to one field, use `watch`:

```js
// Runs when anything changes
updated() { this.reposition(); }

// Runs when what matters changes
watch: {
  items() { this.reposition(); }
}
```

---

## 5. Clean up external integrations

Each directive receives a `cleanup` that runs when the element leaves the DOM
(`runtime/walker.ts`, `runDirective`). Effects created with `ctx.effect` and listeners
registered by native directives clean up themselves. **What you created outside, doesn't.**

```js
V.directive('map', {
  mounted(el, binding) {
    el._map = new MyMapLibrary(el, binding.value);
  },
  beforeUnmount(el) {
    el._map?.destroy();
    delete el._map;
  },
});
```

The same in components:

```js
V.component('clock', {
  state: () => ({ now: new Date() }),

  mounted() {
    this._timer = setInterval(() => { this.now = new Date(); }, 1000);
    this._onResize = () => this.recalculate();
    window.addEventListener('resize', this._onResize);
  },

  beforeUnmount() {
    clearInterval(this._timer);
    window.removeEventListener('resize', this._onResize);
  },
});
```

Without this, a component mounted and unmounted several times leaves a timer behind in each
cycle. In an SPA that changes pages, this becomes a real leak.

`V.watch` and `V.effect` called outside a directive or component also aren't cleaned up
by anyone. Store the return and call it:

```js
const stop = V.watch(() => state.search, search);
// later
stop();
```

Or group in a scope:

```js
const scope = V.effectScope();
scope.run(() => {
  V.watch(/* ... */);
  V.effect(/* ... */);
});
// one call cleans everything
scope.stop();
```

---

## 6. `v-cloak`, and what it solves

Between the HTML appearing on screen and Voodoo.js walking the page, there's a moment when
`{ name }` is visible as literal text. `v-cloak` hides the element until that moment
passes.

The CSS comes in `BASE_TOKENS` (`dom/style.ts`):

```css
[v-cloak]{display:none !important}
```

The directive simply removes the attribute when the element is processed
(`directives/core.ts`).

```html
<div v-data="{ name: 'Ana' }" v-cloak>
  <p>Hi, { name }</p>
</div>
```

Two details that save a debugging session:

- **If `V.config.injectStyles` is `false`, CSS isn't injected** and `v-cloak` doesn't hide
  anything. Declare the rule yourself in that case.
- **The selector is literally `[v-cloak]`.** If you changed `V.config.prefix`, the rule
  needs to match.

Alternative that avoids layout jump, for large blocks: use `v-show` on a skeleton
instead of hiding the entire content.

---

## 7. `V.config.autoDiscover` and the cost of MutationObserver

By default Voodoo.js observes the document with a `MutationObserver`
(`{ childList: true, subtree: true }`) and initializes any new element
(`runtime/walker.ts`, `observeDOM`). This is what makes HTML inserted after loading
gain its directives without any manual call.

The cost is real and proportional to the number of mutations, not to page size. For each
node added the observer checks if it was already initialized and, if not, walks up the tree with
`findScope` until it finds the scope. For each node removed, it checks if the removal was internal and
calls `destroy`.

On a normal page this is imperceptible. On a page that inserts thousands of nodes per
second (a terminal, a live log, a node canvas), it starts appearing in the profile.

Two ways out.

**Disable and call by hand.** You only pay the cost when you want:

```html
<script src="voodoo.min.js" data-no-observer defer></script>
```

```js
list.insertAdjacentHTML('beforeend', html);
V.refresh(list);
```

**Limit the observed root.** If Voodoo only governs part of the page, say so:

```html
<script src="voodoo.min.js" data-manual defer></script>
<script>
  V.config.root = document.querySelector('#app');
  V.start();
</script>
```

The observer is attached to the root passed to `start()`, so mutations outside it
cost nothing.

---

## 8. `v-pre`, `v-ignore`, `v-once`: what each one actually does

The three look like similar optimizations and **they are not the same**. Worth reading carefully,
because one of them doesn't do what the name suggests to someone coming from Vue.

### `v-pre` and `v-ignore`

Identical. The walker finds the attribute, marks the element as initialized and **returns
immediately** (`runtime/walker.ts`, `walk`). The entire subtree is left out: no
directive, no interpolation, no effect.

```html
<pre v-pre>
  Code example: { this } stays pure text.
</pre>
```

Use on documentation blocks, code examples and third-party HTML that Voodoo shouldn't
touch. It's the most efficient optimization that exists, because cost drops to zero.

`bindTextNode` also walks up ancestors looking for `v-pre` and `v-ignore`, so the
protection applies even when a script rewrites content after mounting.

### `v-once`

Here's the difference. In Vue, `v-once` freezes a subtree. In Voodoo.js **it evaluates an
expression once and writes the result to `textContent`**:

```js
defineDirective('once', ({ el, effect, evaluate: ev }) => {
  void effect;
  const value = ev();
  if (value !== undefined) el.textContent = stringify(value);
});
```

Three consequences:

- It's a `v-text` without reactivity, not a subtree freezer.
- **Children are still walked.** Interpolations inside the element stay
  reactive, because `v-once` overwrites `textContent` before that.
- The name is misleading for someone coming from Vue. This is registered as an open issue in
  [ROADMAP.md](../ROADMAP.md).

To truly freeze a rendered section with data that doesn't change, use `v-pre` after
the value is already in the HTML, or don't put the expression there in the first place.

---

## 9. Expression caching

Every expression becomes an AST once. The cache is a `Map<string, Node>` in
`parser/parser.ts`, with `MAX_CACHE = 2000`.

This means **repeated expressions are free from the second time on**. A thousand lines
of a `v-for` with the same expression `product.name` share the same AST.

Two practical implications.

**Repeating the same expression is better than varying.** These two blocks cost differently:

```html
<!-- One cache entry, reused a thousand times -->
<li v-for="p in products" :key="p.id">{ p.name }</li>

<!-- Also one entry: the expression is the same string in all lines -->
<li v-for="p in products" :key="p.id">{ p.price > 100 ? 'expensive' : 'cheap' }</li>
```

What generates different entries is HTML generated with different expressions per line, which
almost never happens in practice.

**The cache is cleared entirely when it overflows.** Not LRU: when it reaches 2000 entries, it
calls `clear()`. An application that exceeds that number keeps re-analyzing expressions
periodically. Two thousand distinct expressions is a lot, but if you generate HTML
dynamically it's good to know. `V.clearParseCache()` clears by hand, and exists for tests.

The same applies to interpolation memoization (`expressionValid` in `runtime/walker.ts`), which
stores "is this text between braces an expression?" by text. This has no limit, and grows
with the number of distinct text fragments between braces on the page.

---

## 10. Update in batches

The scheduler groups everything that happens in the same synchronous task in one flush only
(`reactivity/index.ts`).

```js
state.a = 1;
state.b = 2;
state.c = 3;
// affected effects run once, in the microtask
```

This already happens automatically. What **doesn't** happen automatically is when you mix layout reads
with state writes:

```js
// Bad: forces layout on each iteration
for (const item of items) {
  state.height = element.offsetHeight;
  state.items.push(item);
}

// Good: one read, one write
const height = element.offsetHeight;
state.items.push(...items);
state.height = height;
```

To replace an entire array, swap the reference instead of changing item by item:

```js
// Triggers once
state.items = newItems;

// Triggers many times
state.items.length = 0;
for (const item of newItems) state.items.push(item);
```

The methods `push`, `pop`, `shift`, `unshift` and `splice` already run with tracking paused
internally, so they're not the problem. The problem is the number of triggers.

`await V.nextTick()` resolves after the DOM is written, when you need to measure something
right after.

---

## 11. Debounce on text input

Every typed character in a `v-model` writes to state and triggers effects that depend
on it. When this feeds a search, it's one request per keystroke.

```html
<!-- One state write per keystroke -->
<input v-model="search">

<!-- One write every 300ms of silence -->
<input v-model.debounce=300 v-search="/api/search">

<!-- Writes only when leaving the field -->
<input v-model.lazy="search">
```

`v-model` accepts `.debounce=<ms>`, `.lazy`, `.trim` and `.number`
(`directives/core.ts`). `.lazy` switches the event from `input` to `change`.

For a search field that triggers requests, `v-search` already has its own debounce and
`v-min-length`, and cancels the previous request.

---

## 12. Choose the right bundle

Three files, from smallest to largest:

| File                    | What it brings                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| `voodoo.core.min.js`    | Reactivity, expressions, walker, components, main directives, declarative HTTP, chainable collection |
| `voodoo.min.js`         | The above plus forms, validation, masks, UI, dialogs, palette, sound |
| `voodoo.full.min.js`    | The above plus charts, physics-based animation, router, languages, inspector, ready-made components |

If the page doesn't use charts or router, the full build is dead weight that the user downloads,
parses and executes.

With a bundler, import only what you use:

```js
import { reactive, computed } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
import { debounce, formatCurrency } from 'voodoojs/utils';
```

The entry points `reactivity`, `http` and `utils` don't bring anything from the DOM.

Check the actual size with `npm run size`. The project's limits are in
`scripts/size.mjs` and CI fails when any bundle exceeds the target.

---

## 13. Attribute cleanup

`V.config.cleanAttributes` is `true` by default. After an element is processed, the
`v-*`, `:`, `@` and `.prop` attributes leave the HTML and go into a `WeakMap` cache
(`runtime/walker.ts`, `stripAttributes`).

The effect is clean HTML in the inspector and slightly smaller DOM nodes. The side effect is that
`document.querySelectorAll('[v-tab]')` finds nothing anymore.

The library solves this internally with a directive index (`queryDirective`,
`hasDirective`, `closestDirective`). **If your code depends on finding elements by
Voodoo attribute**, use a class or your own `data-` attribute:

```html
<div v-modal="open" data-role="main-dialog"></div>
```

```js
document.querySelector('[data-role="main-dialog"]');
```

Disabling cleanup has a memory cost, not a speed cost:

```html
<script src="voodoo.min.js" data-keep-attributes defer></script>
```

---

## 14. When the bottleneck isn't Voodoo

Before optimizing the reactive layer, confirm it's the problem. In the browser profile,
look for:

- **Layout and paint dominating.** A list of a thousand rows is expensive to draw in any
  library. The answer is to virtualize, not switch frameworks.
- **Requests in series.** Three `await` in a row cost three trips. `Promise.all` costs
  one.
- **Image without dimensions.** Causes cascading reflow and has nothing to do with reactivity.
  `v-lazy-src` helps with loading, not layout.
- **Expensive CSS.** `box-shadow` and `filter` on many animated elements cost more than
  any reactive effect.
- **Third-party library.** A chart or heavy text editor dominates the entire profile.

The sign that the problem is reactivity: many short effect executions in the same
microtask. The `xray` inspector in the full build counts effects per element and is the fastest way
to find the element that's reacting too much.

---

## Summary

| Do                                                  | Why |
| --------------------------------------------------- | --- |
| Stable `:key` in every reordering list              | Avoids re-executing all effects of all blocks |
| `computed` for derived values                      | Has cache; watcher doesn't |
| `watch` only for side effects                      | Watcher runs even when no one reads the result |
| Avoid `deep: true`                                 | Walks and tracks the entire object |
| Prefer `watch` to `updated` in component           | `updated` depends on all state keys |
| Clean up timers, listeners and external libraries  | The runtime only cleans what it created |
| `v-pre` on blocks Voodoo doesn't need to touch     | Zero cost in the entire subtree |
| Disable `autoDiscover` on pages with lots of mutations | Observer costs per mutation |
| Swap array reference instead of mutating item by item | One trigger instead of many |
| `.debounce` on search fields                       | One request per pause, not per keystroke |
| Choose the smallest bundle that fits               | User downloads, parses and executes everything |
| Measure before and after                           | `benchmarks/`, `npm run size`, browser profile |

## Read also

- [Performance](desempenho.md), the model inside
- [Reactivity](reatividade.md)
- [Application structure](application-structure.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md), the complete path of an update
- [QUALITY.md](../QUALITY.md), how performance is measured in the project
