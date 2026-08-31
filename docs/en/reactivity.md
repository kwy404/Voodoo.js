# Reactivity

The reactivity system lives in `packages/voodoojs/src/reactivity/index.ts`. It imports
nothing: no DOM, no globals. You can use it on its own, in a browser or on a server.

```js
import { reactive, computed, watch } from 'voodoojs/reactivity';
```

---

## The model

A `Proxy` tracks reads by key. Each read inside a running effect records a dependency.
A write looks up the effects that read that exact key and queues them. The queue drains in
a microtask.

```js
const state = V.reactive({ a: 1, b: 2 });

V.effect(() => console.log('A is', state.a));  // logs immediately: A is 1

state.a = 5;   // queues the effect
state.b = 9;   // nothing depends on b, nothing queued

await V.nextTick();  // A is 5
```

Two properties follow:

- **Granularity.** Only effects that read the changed key run. `state.b = 9` above does
  nothing at all.
- **Batching.** Many writes in one synchronous task produce one flush.

There is no virtual DOM, no diffing and no component re-render. When a directive's effect
runs, it writes one DOM property.

---

## `reactive`

Deep reactivity for objects, arrays, `Map` and `Set`.

```js
const state = V.reactive({
  user: { name: 'Ana' },
  tags: [],
  seen: new Set(),
});

state.user.name = 'Bia';   // nested objects are reactive too
state.tags.push('new');     // array mutation triggers
state.seen.add('x');        // Set operations trigger
```

### What is not made reactive

`canObserve` refuses:

- primitives;
- frozen objects;
- DOM nodes;
- anything marked with `markRaw`;
- `Date`, `RegExp`, `Promise`, `Error`, `File`, `FileList`, `Blob`, `FormData`, `URL`,
  `URLSearchParams`, `ArrayBuffer`, `DataView`;
- class instances in general. Only plain objects, arrays, `Map` and `Set` are proxied.

Those values are stored and read normally; they just do not track.

```js
V.markRaw(bigThirdPartyInstance);   // never proxy this
V.toRaw(state);                      // the original object behind a proxy
V.isReactive(state);                 // true
```

Calling `reactive()` twice on the same object returns the same proxy.

### Arrays

`includes`, `indexOf` and `lastIndexOf` are instrumented to track every index and to retry
with raw values, so searching for an object you hold a reference to works:

```js
const item = { id: 1 };
const state = V.reactive({ list: [item] });
state.list.includes(item);   // true
```

`push`, `pop`, `shift`, `unshift` and `splice` run with tracking paused, which prevents a
length read inside the mutation from creating a self-triggering dependency.

Adding an integer key triggers effects that read `length`. Shrinking `length` triggers
effects that read any index at or beyond the new length.

---

## `ref`

A reactive box for a single value, including primitives.

```js
const count = V.ref(0);

V.effect(() => console.log(count.value));
count.value++;
```

`ref` makes object values reactive on the way in. `shallowRef` does not:

```js
const a = V.ref({ n: 1 });
a.value.n = 2;         // triggers

const b = V.shallowRef({ n: 1 });
b.value.n = 2;         // does not trigger
b.value = { n: 2 };    // triggers
```

`V.unref(x)` returns `x.value` if `x` is a ref, otherwise `x`.

### Automatic unwrapping

A ref stored as a property of a reactive object is unwrapped on read and on write:

```js
const state = V.reactive({ count: V.ref(0) });

state.count;       // 0, not the ref
state.count = 5;   // writes through to the ref
```

The one exception is a ref stored at an **integer index of an array**, which is returned as
the ref itself.

---

## `computed`

A derived value with a cache and a dirty flag.

```js
const state = V.reactive({ first: 'Ada', last: 'Lovelace' });

const full = V.computed(() => `${state.first} ${state.last}`);

full.value;   // computes
full.value;   // cached, does not recompute

state.first = 'Grace';
full.value;   // recomputes once
```

The mechanics: the getter runs inside an effect whose scheduler only marks the value dirty.
The recomputation happens on the next read. If nobody reads it, it never recomputes.

Writable form:

```js
const celsius = V.ref(0);

const fahrenheit = V.computed({
  get: () => celsius.value * 9 / 5 + 32,
  set: (f) => { celsius.value = (f - 32) * 5 / 9; },
});

fahrenheit.value = 212;   // celsius.value is now 100
```

Assigning to a computed with no setter logs a warning and does nothing.

**Use `computed` for anything the template reads.** A `watch` that assigns to state is
almost always a `computed` in disguise, and it costs more. See
[performance](../performance.md) (Portuguese).

---

## `effect`

Runs immediately and re-runs whenever anything it read changes.

```js
const runner = V.effect(() => {
  document.title = `${state.unread} unread`;
});

V.stop(runner);   // stop tracking
```

Options:

```js
V.effect(fn, {
  lazy: true,          // do not run on creation
  scheduler: () => {}, // run this instead of the effect when a dependency changes
  onStop: () => {},    // called when stopped
  scope: someScope,    // owned by an EffectScope
});
```

Direct self-recursion is prevented: an effect that writes a value it also reads will not
re-enter itself. Indirect loops are caught by the scheduler; see below.

### `watchEffect`

Same as `effect`, plus a cleanup callback that runs before each re-run and on stop:

```js
const stop = V.watchEffect((onInvalidate) => {
  const id = setInterval(poll, state.interval);
  onInvalidate(() => clearInterval(id));
});
```

---

## `watch`

Watches a source and calls a callback when it changes. The callback receives the new value,
the old value, and an `onInvalidate` registrar.

```js
V.watch(
  () => state.search,
  (next, prev, onInvalidate) => {
    const controller = new AbortController();
    onInvalidate(() => controller.abort());
    search(next, controller.signal);
  }
);
```

The source can be a getter function, a `ref`, or a reactive object.

### Options

```js
V.watch(source, cb, {
  immediate: false,   // call the callback once at setup
  deep: false,        // traverse the source and track every nested key
  flush: 'pre',       // 'pre' | 'post' | 'sync'
});
```

| `flush`  | When the callback runs                          |
| -------- | ----------------------------------------------- |
| `'pre'`  | Default. In the post-flush queue, after DOM writes. |
| `'post'` | Also in the post-flush queue.                   |
| `'sync'` | Immediately, inside the write that triggered it. |

Use `'sync'` sparingly. It runs before batching, so three writes give three calls.

`watch` returns a stop handle. **Call it** if the watcher was created outside a directive or
component, because nothing else will:

```js
const stop = V.watch(() => state.x, handler);
stop();
```

### `deep` is expensive

`deep: true` calls `traverse`, which walks the whole object recursively and **reads every
key**. Reading means tracking. On an array of a thousand objects with ten fields each, one
setup pass creates ten thousand tracked reads.

```js
V.watch(() => state.orders, fn, { deep: true });   // expensive
V.watch(() => state.orders.length, fn);             // cheap
```

Component `watch: { ... }` blocks are **not** deep. They watch `proxy[key]`, so a mutation
inside a nested object only fires if the reference changes.

`V.store(name, def, { persist: true })` uses a deep watch internally to know when to save.
That is the right call there, and it means a large persisted store costs more than a small
one.

---

## The scheduler

```js
state.a = 1;
state.b = 2;
state.c = 3;
// affected effects run once, in one microtask
await V.nextTick();
// the DOM now reflects all three
```

`nextTick(fn?)` resolves after the current flush. With no argument it returns a promise.

`V.flushSync()` drains everything pending immediately. It exists for tests; do not reach for
it in application code.

### Infinite loop detection

The scheduler counts how many times each effect re-runs within one flush. Past 100
(`RECURSION_LIMIT`), it logs:

> Loop infinito de atualizacao detectado...

and skips that effect instead of freezing the tab. If you see it, an expression is writing
to state that it also reads.

### Post-flush

Callbacks queued with `queuePostFlush` run after the DOM has been written. That is where
component `mounted` and `updated` hooks, `v-init`, and `watch` with `flush: 'post'` run.
Effects queued during the post-flush pass go into a new cycle.

---

## `EffectScope`

Groups effects so they can be stopped together. This is what the runtime uses internally:
every directive gets a detached scope, registered as a cleanup on its element.

```js
const scope = V.effectScope();

scope.run(() => {
  V.watch(() => state.a, handlerA);
  V.effect(() => sync(state.b));
});

scope.stop();   // stops both, and any child scope
```

`onDispose(fn)` registers extra cleanup:

```js
scope.run(() => {
  const socket = new WebSocket(url);
  V.getActiveScope().onDispose(() => socket.close());
});
```

A scope created inside a running scope attaches to it as a child, unless you pass
`effectScope(true)` for a detached one.

---

## Error handling

Errors inside an effect are caught and routed through a handler rather than breaking the
page.

```js
V.onError((err, context) => {
  console.error(context, err);
  reportToSentry(err, { context });
});
```

Without a handler, errors are logged as `[Voodoo] erro em <context>:`. Contexts you will
see: `effect`, `post-flush`, `cleanup`, `scope cleanup`, `effect cleanup`,
`directive <attribute>`, `hook <name>`, and the expression text for evaluation failures.

---

## Using it outside the DOM

The module has no browser dependency:

```js
import { reactive, computed, watch, effect } from 'voodoojs/reactivity';

const store = reactive({ items: [], total: 0 });

effect(() => {
  store.total = store.items.reduce((s, i) => s + i.price, 0);
});

store.items.push({ price: 10 });
```

This is why `voodoojs/reactivity` is a separate published entry. It works in Node, Bun and
Deno with no adaptation.

---

## API summary

| Symbol            | Signature                                              |
| ----------------- | ------------------------------------------------------ |
| `reactive`        | `<T extends object>(target: T) => T`                    |
| `ref`             | `<T>(value: T) => Ref<T>`                               |
| `shallowRef`      | `<T>(value: T) => Ref<T>`                               |
| `computed`        | `<T>(getter \| { get, set }) => ComputedRef<T>`          |
| `effect`          | `<T>(fn, options?) => EffectRunner<T>`                  |
| `watch`           | `(source, cb, options?) => WatchStopHandle`             |
| `watchEffect`     | `(fn) => WatchStopHandle`                               |
| `stop`            | `(runner \| effect) => void`                            |
| `nextTick`        | `(fn?) => Promise<void>`                                |
| `flushSync`       | `() => void`                                            |
| `toRaw`           | `<T>(observed: T) => T`                                 |
| `markRaw`         | `<T extends object>(value: T) => T`                     |
| `unref`           | `<T>(value: T \| Ref<T>) => T`                          |
| `isReactive`      | `(value: unknown) => boolean`                           |
| `effectScope`     | `(detached?: boolean) => EffectScope`                   |

---

## Next

- [State](state.md) - scopes, stores, and how reactivity reaches the HTML
- [Directives](directives.md) - what actually creates the effects
- [Components](components.md)
- [performance](../performance.md) (Portuguese) - the practical guide
