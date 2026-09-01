# State and stores

There are three places to store state in Voodoo.js, from most local to most global:

1. **`v-data`**, a scope tied to a piece of HTML;
2. **`V.data()`**, the root scope, visible to the entire page;
3. **`V.store()`**, named stores, accessible via `$store`.

## v-data and the scope chain

```html
<div v-data="{ open: false, items: [] }">
  <button v-click="open = !open">Toggle</button>
  <ul v-show="open">
    <li v-for="item in items">{ item }</li>
  </ul>
</div>
```

Each `v-data` creates a reactive child scope. Scopes nest:

```html
<div v-data="{ title: 'Shop' }">
  <h1>{ title }</h1>

  <div v-data="{ product: 'Mug' }">
    <p>{ title }: { product }</p>   <!-- Shop: Mug -->
  </div>

  <p>{ product }</p>                 <!-- empty, child doesn't leak -->
</div>
```

Sibling scopes are independent. A `v-for` also creates a scope per item, with loop variables.

### Reading and writing

Reading climbs the chain until it finds the key. Writing goes to the **scope that already
contains the key**:

```html
<div v-data="{ total: 0 }">
  <div v-for="n in 3">
    <button v-click="total += n">+{ n }</button>   <!-- writes to outer scope -->
  </div>
</div>
```

A key that doesn't exist anywhere is created in the local scope.

### Functions in scope

Put functions right in `v-data` for cleaner expressions:

```html
<div v-data="{ items: [], add(text) { this.items.push(text) } }">
  <button v-click="add('new')">Add</button>
</div>
```

The parser doesn't accept `function`, so declare the function in a `<script>` and put it in the
root scope:

```js
V.data({
  formatCurrency(value) {
    return V.formatCurrency(value);
  },
});
```

```html
<span>{ formatCurrency(order.total) }</span>
```

## The root scope

`V.data()` puts values in the root scope, visible to any expression on the page:

```js
V.data({
  user: null,
  loading: false,
  login(email) {
    this.loading = true;
    return V.http.post('/api/login', { email }).finally(() => { this.loading = false; });
  },
});
```

```html
<span v-show="user">Hello, { user.name }</span>
<button v-click="login(email)" :disabled="loading">Log in</button>
```

The root scope is reactive, so any value put there updates the page by itself. It's also
available as `$root` in any expression, and as `V.scope` in JavaScript.

## Stores

A store is a named reactive object, accessible from any expression via `$store`:

```js
V.store('cart', {
  items: [],
  total() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  },
  add(product) {
    this.items.push(product);
  },
  clear() {
    this.items = [];
  },
});
```

```html
<span>{ $store.cart.items.length } items</span>
<span>{ $store.cart.total() }</span>
<button v-click="$store.cart.add(product)">Add</button>
<button v-click="$store.cart.clear()">Clear</button>
```

Methods declared in the store receive `this` pointing to the store itself. For derived values,
use a method like the `total()` above: properties with `get` are resolved once at creation
and don't track changes.

### Persistence

```js
V.store('preferences', { theme: 'system', language: 'en-US' }, { persist: true });
```

The store is written to `localStorage` on each change and restored on next load. Pass a string
in `persist` to choose the key: `{ persist: 'app:prefs' }`.

Functions are not written. The default key is `voodoo:store:<name>`.

### Store API

```js
V.store('cart');            // retrieves the existing store
V.store('cart', { ... });   // creates, or updates values keeping the reference
V.stores;                   // object with all stores, same as $store
V.storeNames();             // ['cart', 'preferences']
V.removeStore('cart');      // removes and stops persistence
```

## v-persist

Saves a `v-data` scope to `localStorage` and restores it on next load:

```html
<div v-data="{ theme: 'dark', draft: '' }" v-persist="editor">
  <textarea v-model="draft"></textarea>
</div>
```

Details:

- the key becomes `voodoo:persist:editor`;
- without a value, the key is derived from the page path and element position;
- only keys that the current state declares are restored, so adding a new field to
  `v-data` doesn't break what was already saved;
- functions, values starting with dollar, and circular structures are left out;
- writing has 120 ms debounce;
- when the element is removed, any pending write is applied and the observer is ended.

## v-sync

Keeps the scope in sync with other open tabs, live, using `BroadcastChannel`:

```html
<div v-data="{ counter: 0 }" v-sync="panel">
  <button v-click="counter++">{ counter }</button>
</div>
```

Open the page in two tabs and click. Both change together.

Without a value, the channel name is derived from the element position. In browsers without
`BroadcastChannel`, the directive simply does nothing. Combine with `v-persist` when you want
sync between tabs **and** survival on reload:

```html
<div v-data="{ filter: '' }" v-persist="list" v-sync="list"></div>
```

## v-history, v-undo, and v-redo

Undo and redo for the entire scope:

```html
<div v-data="{ text: '', color: '#000' }" v-history="50">
  <textarea v-model="text"></textarea>
  <input type="color" v-model="color">

  <button v-undo :disabled="!$history.canUndo">Undo</button>
  <button v-redo :disabled="!$history.canRedo">Redo</button>
  <small>{ $history.size } states saved</small>
</div>
```

The value of `v-history` is the snapshot limit, default 50. A snapshot is recorded 300 ms
after the last change. Writing after undoing discards the future, like in any editor.

`$history` exposes:

| Field | What is it |
| --- | --- |
| `canUndo`, `canRedo` | Reactive booleans |
| `size` | Number of states saved |
| `undo()`, `redo()` | Navigate the history |
| `clear()` | Erase everything and restart from current state |

`v-undo` and `v-redo` link the click to the nearest controller in the tree.

## v-storage

Links a single field to `localStorage`, without going through a scope:

```html
<input v-storage="comment-draft" placeholder="Type something">
```

The value is saved on each keystroke at key `voodoo:field:<name>` and restored on load.

## Storage via JavaScript

```js
V.storage.set('user', { id: 1, name: 'Ana' });   // localStorage with JSON
V.storage.get('user', {});                       // with default value
V.storage.remove('user');
V.storage.has('user');
V.storage.keys();
V.storage.clear();

V.session.set('step', 2);                        // sessionStorage, same API

V.cookie.set('token', 'abc', { expires: 7, sameSite: 'Lax', secure: true });
V.cookie.get('token');
V.cookie.remove('token');

V.cache.set('products', list, 60_000);           // memory, with expiration
V.cache.get('products');
await V.cache.remember('zip:01001000', 3_600_000, () => V.http.get('/api/zip/01001000'));

V.url.get('page');                               // query string
V.url.set('page', 2);                            // without reloading
V.url.merge({ order: 'name', page: 1 });
V.url.all();
```

All reads and writes are safe: in private mode, with full quota, or outside the browser,
calls don't throw error.

Inside HTML, each has its corresponding magic: `$storage`, `$session`, `$cookie`, `$cache`,
`$url`.

```html
<button v-click="$storage.set('seen', true)">Don't show again</button>
<p v-show="!$storage.get('seen')">Important tip</p>
```

## Event bus

For loose conversations between distant parts of the page:

```js
const off = V.on('order:created', (order) => V.toast.success(`Order ${order.id} created`));
V.once('app:ready', () => console.log('only the first time'));
V.emit('order:created', { id: 42 });
off();                       // cancels a subscription
V.off('order:created');      // cancels all of the event
```

In HTML, `$dispatch` fires a `CustomEvent` that bubbles up the tree:

```html
<button v-click="$dispatch('filter:changed', { term: search })">Search</button>
<div @filter:changed="apply($detail)"></div>
```

## Which to use

| Situation | Choose |
| --- | --- |
| State of a block of HTML | `v-data` |
| Value used by the whole page | `V.data()` |
| Cart, logged-in user, preferences | `V.store()` |
| Needs to survive reload | `v-persist` or `store` with `persist` |
| Needs to track other tabs | `v-sync` |
| Needs undo | `v-history` |
| A single text field | `v-storage` |

---

Previous: [Ready-made components](ready-components.md) · Next: [Events](events.md)
