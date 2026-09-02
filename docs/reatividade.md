# Reactivity

Voodoo.js's reactive core is a `Proxy` with dependency tracking per key and microtask scheduling.
No Virtual DOM. When `count` changes, only effects that read `count` run again, and each effect
updates only the DOM node it created.

The module doesn't touch the DOM and doesn't assume `window`, so it works the same in Node, Bun,
and Deno.

## reactive

Makes an object reactive in depth.

```js
const state = V.reactive({ user: { name: 'Ana' }, tags: [] });

state.user.name = 'Bia';  // triggers whoever read user.name
state.tags.push('new');     // triggers whoever read tags
```

Nested objects become proxies on read, on demand. Arrays, `Map`, and `Set` are supported.

Details that matter:

- writing the same value triggers nothing;
- reading a key inside an effect creates dependency only for that key;
- `delete` and `in` are also tracked;
- the same object always returns the same proxy.

## ref

Reactive reference for primitive values. The value lives in `.value`.

```js
const counter = V.ref(0);

V.effect(() => console.log(counter.value));
counter.value++;  // triggers the effect
```

`V.shallowRef` creates a reference that doesn't make content reactive in depth. Useful for storing
a large object you replace whole instead of edit inside.

`V.unref(x)` returns `x.value` when `x` is a ref, and `x` when not.

## computed

Derived value with cache. Only recalculates when a dependency changes.

```js
const state = V.reactive({ first: 'Ana', last: 'Souza' });
const full = V.computed(() => `${state.first} ${state.last}`);

full.value;             // 'Ana Souza'
state.last = 'Lima';
full.value;             // 'Ana Lima', recalculated on demand
```

Computed accepts getter and setter:

```js
const celsius = V.ref(25);
const fahrenheit = V.computed({
  get: () => celsius.value * 1.8 + 32,
  set: (value) => { celsius.value = (value - 32) / 1.8; },
});

fahrenheit.value = 212;
celsius.value;  // 100
```

## effect

Creates a reactive effect. Runs once on creation and reruns whenever any state read inside it
changes.

```js
const state = V.reactive({ count: 0 });

const runner = V.effect(() => {
  document.title = `Clicks: ${state.count}`;
});

state.count++;      // schedules rerun
V.stop(runner);      // stops the effect
```

Accepted options:

| Option | What it does |
| --- | --- |
| `lazy` | Does not run on creation. You call the runner when you want |
| `scheduler` | Receives control of rerun instead of scheduling itself |
| `scope` | Ties the effect to an `EffectScope`, to stop everything at once |

## watch

Observes a reactive source and calls the callback when it changes.

```js
const state = V.reactive({ search: '', page: 1 });

const stop = V.watch(
  () => state.search,
  (newVal, oldVal) => console.log('from', oldVal, 'to', newVal)
);

stop();  // cancels
```

The source can be a function, a `ref`, or a reactive object:

```js
V.watch(counter, (n) => console.log(n));          // ref
V.watch(state, () => save(), { deep: true });   // entire object
```

Options:

| Option | Default | What it does |
| --- | --- | --- |
| `immediate` | `false` | Calls callback on creation |
| `deep` | `false` | Walks entire structure to observe any change |
| `flush` | `'pre'` | Moment of execution: `'pre'`, `'post'`, or `'sync'` |

The callback's third argument is `onInvalidate`, called before next run. Serves to cancel pending
work:

```js
V.watch(
  () => state.search,
  (term, _oldVal, onInvalidate) => {
    const controller = new AbortController();
    onInvalidate(() => controller.abort());
    V.http.get('/api/search', { params: { q: term }, signal: controller.signal });
  }
);
```

## watchEffect

Runs the function immediately and reruns when read dependencies change. It's `effect` with
automatic cleanup between runs.

```js
const stop = V.watchEffect((onInvalidate) => {
  const id = setInterval(() => console.log(state.count), 1000);
  onInvalidate(() => clearInterval(id));
});
```

## nextTick

Updates are scheduled in microtask and applied in batch. `nextTick` resolves after the DOM
reflects the change.

```js
state.items.push('new');
await V.nextTick();
document.querySelectorAll('li').length;  // already has the new item
```

Also accepts a callback: `V.nextTick(() => focus())`.

`V.flushSync()` immediately applies everything pending. Use in tests, where waiting for a
microtask hurts code readability.

## effectScope

Bundles several effects in a scope and stops all with one call.

```js
const scope = V.effectScope();

scope.run(() => {
  V.effect(() => updateHeader(state.user));
  V.watch(() => state.theme, applyTheme);
});

scope.stop();  // stops both at once
```

Each Voodoo directive already runs inside its own `EffectScope`, tied to element removal. So
removing a DOM node stops all effects on that node, with no leaks.

## toRaw, markRaw, and isReactive

```js
V.toRaw(state);           // returns the original object behind the proxy
V.markRaw(googleMap);   // this object never becomes a proxy
V.isReactive(state);      // true
```

`markRaw` is the way to store instances of external libraries, DOM elements, or anything that
shouldn't be observed.

## How it appears in HTML

HTML uses the same machine. Each `v-text`, each `{ interpolation }`, and each `:attribute` is its
own reactive effect:

```html
<div v-data="{ name: 'Ana', age: 30 }">
  <p v-text="name"></p>       <!-- effect 1, depends on name -->
  <p v-text="age"></p>      <!-- effect 2, depends on age -->
</div>
```

Changing `name` reruns only effect 1. The second paragraph is untouched, not compared, not
recreated.

To observe values in HTML itself there are two tools:

```html
<div v-data="{ search: '' }">
  <!-- runs the expression whenever the dependency changes -->
  <div v-effect="console.log('search now:', search)"></div>

  <!-- observes the v-model of the same element -->
  <input v-model="search" v-watch="perform($value, $old)">
</div>
```

Inside `v-watch` you receive `$value` and `$old`. There's also the `$watch` magic, which accepts a
text expression:

```html
<div v-data="{ total: 0 }" v-init="$watch('total', (newVal) => console.log(newVal))"></div>
```

## Errors

An error inside an effect doesn't crash the page. It's delivered to the global handler:

```js
V.onError((err, context) => {
  console.error('[app]', context, err);
  V.toast.error('Something went wrong');
});
```

The context tells where it came from: `directive v-click`, `interpolation`, `hook mounted`,
`click event`, and so on.

## Infinite loops

If an effect writes to the same key it reads, the scheduler detects the repetition and stops with
a console warning, instead of hanging the tab. Fix the expression instead of working around the
warning.

---

Previous: [Quick Start](inicio-rapido.md) · Next: [Expressions](expressoes.md)
