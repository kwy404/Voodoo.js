# State

Voodoo.js has four places state can live. Picking the smallest one that works is most of
what "good state management" means here.

| Who needs to see it | Where it lives            |
| ------------------- | ------------------------- |
| One element         | `v-data` on that element  |
| One component       | `state()` in the definition |
| The whole page      | `V.data({ ... })`         |
| The whole app       | `V.store('name', { ... })` |

---

## The scope chain

Every `v-data`, every component and every `v-for` iteration creates a scope. Scopes form a
chain up to a single global root.

```
rootScope                              V.data() writes here
    |
    +-- <div v-data="{ user }">
    |        |
    |        +-- <li v-for="item in list">    one scope per iteration
    |        |        { item, index }
    |        |
    |        +-- <my-card>                    component scope
    |                 attaches to rootScope, NOT to the v-data scope,
    |                 unless inheritScope: true
    |
    +-- arrow function body                   plain child scope
```

Reading an identifier walks up the chain and stops at the first scope that has the key.
If nothing has it, magic variables are tried, then the global allowlist, then `undefined`.

Writing walks the same chain and writes to whichever scope owns the key. **A key that does
not exist anywhere is created on the current scope**, which keeps it local and reactive.

```html
<div v-data="{ count: 0 }">
  <div v-data="{ label: 'inner' }">
    <button @click="count++">{ label }: { count }</button>
    <!-- `count` resolves to the outer scope and is written there -->
  </div>
</div>
```

---

## `v-data`

```html
<div v-data="{ open: false, items: [], filter: '' }">
  <input v-model="filter">
  <button @click="open = !open">Toggle</button>
  <ul v-show="open">
    <li v-for="item in items.filter(i => i.includes(filter))" :key="item">{ item }</li>
  </ul>
</div>
```

The expression is evaluated once, in the parent scope, and the result is made reactive.

### What the object literal accepts

The expression grammar is a subset of JavaScript. Object literals support `key: value`,
shorthand `{ count }`, computed keys `{ [expr]: value }` and spread `{ ...other }`.

**Method shorthand and getters are syntax errors:**

```html
<!-- Syntax error: method shorthand is not in the grammar -->
<div v-data="{ n: 0, double() { return this.n * 2 } }">

<!-- Syntax error: getters are not in the grammar -->
<div v-data="{ items: [], get count() { return this.items.length } }">
```

For a derived value, either write the expression where you need it, or build the object in
JavaScript where the full language is available:

```html
<div v-data="{ items: [] }">
  <p>{ items.length }</p>
</div>
```

```html
<div v-data="buildInitialState()">
```

```js
V.config.globals.buildInitialState = () => ({
  items: [],
  get count() { return this.items.length },   // a real getter, built in JS
});
```

Arrow functions **are** supported inside the literal, but they have no `this`:

```html
<div v-data="{ items: [], byName: (a, b) => a.name.localeCompare(b.name) }">
```

For anything more involved, use a component, where `computed` and `methods` are real.

---

## `V.data`

Writes into the root scope, visible to every expression on the page.

```js
V.data({
  user: null,
  loading: false,
  notifications: [],
});
```

```html
<p v-show="user">Welcome, { user.name }</p>
```

Returns the root scope data object, so you can mutate it later:

```js
const app = V.data({ user: null });
app.user = await V.http.get('/api/me');
```

> Note the name collision documented in
> [CONVENTIONS.md](../../CONVENTIONS.md): `V.data()` (root scope), the component `data`
> option (an alias of `state`), and the `v-data` attribute (a child scope) are three
> different things.

---

## Component state

```js
V.component('counter', {
  state: (props) => ({ count: props.start ?? 0 }),
});
```

`state` receives the resolved props and returns the initial state object, which is made
reactive. `this` inside `state` is the instance, so you can read other props.

`data` is accepted as an alias, for people coming from Vue. `state` wins if both are
declared.

See [Components](components.md).

---

## Stores

A store is a named reactive object, reachable from anywhere.

```js
V.store('cart', {
  items: [],
  coupon: null,

  add(product) {
    const existing = this.items.find((i) => i.id === product.id);
    if (existing) existing.quantity++;
    else this.items.push({ ...product, quantity: 1 });
  },

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
  },

  subtotal() {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  },

  total() {
    return this.coupon ? this.subtotal() * (1 - this.coupon.discount) : this.subtotal();
  },
});
```

From HTML:

```html
<span>{ $store.cart.total() }</span>
<button @click="$store.cart.add(product)">Add</button>
<p v-show="!$store.cart.items.length">Your cart is empty</p>
```

> **Do not use getters in a store definition.** `V.store` copies the definition with an
> object spread before making it reactive, and a spread **invokes** a getter and stores its
> result. A `get total()` therefore becomes a static number frozen at definition time, not
> a live derived value. Use a method, as above, or a `V.computed` outside the store. This
> is a known limitation, not intended behaviour.

From JavaScript:

```js
V.stores.cart.add(product);
V.store('cart').items;        // same object
```

Functions declared in the definition are bound to the store, so `this.items` works inside a
method. Getters do not survive; see the warning above.

### API

| Call                              | Effect |
| --------------------------------- | ------ |
| `V.store(name, definition, opts?)`| Create the store and return it |
| `V.store(name)`                   | Return the existing store, creating an empty one if needed |
| `V.stores`                        | Proxy over all stores; also what `$store` exposes |
| `V.storeNames()`                  | Array of registered names |
| `V.removeStore(name)`             | Remove it and stop its persistence watcher |

Redefining an existing store merges the new values into it **without replacing the
reference**, so anything already bound keeps working.

### Late registration works

`V.stores` is a proxy that reads a version counter. Creating a store after the page rendered
updates the elements that were already waiting for it. You do not need to register stores
before `V.start()`.

### Persistence

```js
V.store('preferences', { theme: 'light', density: 'comfortable' }, { persist: true });
V.store('draft', { text: '' }, { persist: 'my-app:draft' });
```

`persist: true` uses the key `voodoo:store:<name>`. A string uses that key instead.

The store is restored from `localStorage` at creation and saved on every deep change.
Functions are stripped before saving. Corrupt saved data falls back to the definition's
initial values. A quota error is swallowed, so the store keeps working in memory.

> A deep watch reads every nested key on each pass. **A large persisted store costs more
> than a small one.** Persist what needs to survive a reload, not your entire cache.

### When to use a store

Use one when more than one component needs the same state, or when state must outlive the
element that created it. A store used by a single component is component state with extra
steps and a leak of encapsulation.

---

## State directives

### `v-persist`

Saves the surrounding scope to `localStorage` and restores it on the next load.

```html
<div v-data="{ name: '', email: '' }" v-persist="signup-form">
  <input v-model="name">
  <input v-model="email">
</div>
```

The key is `voodoo:persist:<value>`. With no value, a key is derived from the element.
Saving is debounced by 120ms and flushed on cleanup. Only keys the current state already
declares are restored, so adding a field later does not resurrect stale data.

### `v-sync`

Mirrors the scope across tabs on the same origin using `BroadcastChannel`.

```html
<div v-data="{ theme: 'light' }" v-sync="app-theme">
```

Each tab tags its messages so it does not react to its own. Only keys that already exist in
the local scope are applied. **No-op when `BroadcastChannel` is unavailable** (Safari below
15.4): local state still works, it just does not cross tabs.

> Anything you sync is readable by any same-origin script. Do not sync secrets.

### `v-history`, `v-undo`, `v-redo`

Undo and redo over the surrounding scope.

```html
<div v-data="{ text: '' }" v-history="50">
  <textarea v-model="text"></textarea>
  <button v-undo :disabled="!$history.canUndo">Undo</button>
  <button v-redo :disabled="!$history.canRedo">Redo</button>
</div>
```

The value is the snapshot limit (default 50). Snapshots are taken on a debounced deep watch
(300ms by default; `v-history-debounce` overrides it). Writing after an undo discards the
redo future, like any editor.

`$history` is available in the scope with `canUndo`, `canRedo`, `size`, `undo()`, `redo()`
and `clear()`. `v-undo` and `v-redo` find the nearest controller by climbing the DOM.

Snapshots are taken with `JSON.parse(JSON.stringify(...))`, so anything not
JSON-serializable is dropped.

### `v-storage`

Binds a single input to a `localStorage` key.

```html
<input v-model="draft" v-storage="draft-key">
```

---

## Magic variables

Available in every expression without declaring anything.

### Context

| Magic      | Value |
| ---------- | ----- |
| `$el`      | The element that created the scope |
| `$refs`    | Merged `v-ref` registrations from the whole chain |
| `$data`    | The current scope's data object |
| `$root`    | The root scope's data |
| `$parent`  | The parent scope's data, or `null` |
| `$self`    | The nearest component instance, or the scope data |

### State

| Magic     | Value |
| --------- | ----- |
| `$store`  | All stores |

### Services

`$http` `$toast` `$clipboard` `$storage` `$session` `$cookie` `$cache` `$url` `$theme`
`$device`

### Reactive environment

| Magic      | Value |
| ---------- | ----- |
| `$screen`  | `width` `height` `mobile` `tablet` `desktop` `portrait` `landscape` `matches(query)` |
| `$network` | `online` `type` `saveData` `slow` |

`$screen` updates on resize (throttled to an animation frame) and orientation change.
`$network` updates on `online`, `offline` and connection change. Breakpoints: mobile below
768px, tablet 768 to 1023, desktop 1024 and above.

```html
<div v-show="$screen.mobile">Mobile layout</div>
<p v-show="!$network.online">You are offline.</p>
```

### Flow

| Magic       | Value |
| ----------- | ----- |
| `$nextTick` | Resolve after the DOM is written |
| `$watch`    | `(expressionString, callback)` |
| `$dispatch` | `(name, detail?)` dispatches a bubbling `CustomEvent` |
| `$log`      | `console.log` with a `[Voodoo]` prefix |

Some modules add more: `$form` (forms), `$route` and `$router` (full build), `$history`
(from `v-history`).

### Registering your own

```js
V.magic('$now', () => new Date());
V.magic('$form', (scope) => scope.el?.closest('form'));
```

The getter receives the scope at the point of use. The `$` is added if you omit it. Magics
are read-only unless the returned value exposes its own `set`.

---

## Next

- [Reactivity](reactivity.md) - the primitives underneath
- [Components](components.md)
- [Directives](directives.md)
- [application-structure](../application-structure.md) (Portuguese)
