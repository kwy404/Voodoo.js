# Getting Started

## Installation

### CDN

One tag. Nothing else.

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
```

Pin an exact version in production:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.11.1/dist/voodoo.full.min.js" defer></script>
```

`defer` is recommended but not required. Voodoo.js runs its own boot loop rather than
listening for `DOMContentLoaded`, so a script in `<head>` without `defer` also works. See
[the boot loop](#the-boot-loop) below.

### npm

```bash
npm install voodoojs
```

```js
import V from 'voodoojs';

V.component('counter', { /* ... */ });
V.start();
```

Importing the package does **not** touch the DOM. Nothing happens until you call
`V.start()`. That is what makes the package safe to import in Node, Bun and Deno.

Subpath entries, for when you only want a piece:

```js
import { reactive, computed, watch } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
import { debounce, formatCurrency, uuid } from 'voodoojs/utils';
```

None of those three pull in the DOM layer.

---

## Which bundle

| File                    | Contains |
| ----------------------- | -------- |
| `voodoo.core.min.js`    | Reactivity, the expression evaluator, the DOM walker, components, all core directives, events, declarative HTTP, the chainable collection |
| `voodoo.min.js`         | The above plus forms, validation, masks, UI directives, dialogs, command palette, sound. **This is the default CDN file.** |
| `voodoo.full.min.js`    | The above plus charts, physics-based animation, the router, i18n, the reactivity inspector, and the ready-made component library |

Start with `voodoo.min.js`. Move down to `voodoo.core.min.js` if you do not use forms or UI
components; move up to `voodoo.full.min.js` when you need routing, charts or i18n.

Non-minified builds (`voodoo.js`, `voodoo.core.js`, `voodoo.full.js`) ship alongside each
minified one, with source maps, for debugging.

Check real sizes with `npm run size` in the repository. This documentation deliberately
states no numbers.

---

## Your first application

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tasks</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
</head>
<body>
  <main v-data="{ draft: '', tasks: [] }">
    <form @submit.prevent="tasks.push({ id: Date.now(), text: draft, done: false }); draft = ''">
      <input v-model="draft" placeholder="What needs doing?" required>
      <button>Add</button>
    </form>

    <ul>
      <li v-for="task in tasks" :key="task.id">
        <input type="checkbox" v-model="task.done">
        <span :class="{ done: task.done }">{ task.text }</span>
        <button @click="tasks = tasks.filter(t => t.id !== task.id)">Remove</button>
      </li>
    </ul>

    <p v-show="tasks.length">
      { tasks.filter(t => !t.done).length } of { tasks.length } remaining
    </p>
  </main>
</body>
</html>
```

Five things are happening.

**`v-data`** creates a reactive scope on the element. Everything inside can read and write
`draft` and `tasks`.

**`@submit.prevent`** binds a submit listener and calls `preventDefault()`. `@` is shorthand
for `v-on:`.

**`v-model`** two-way binds an input to a state value, with type coercion for numbers,
checkboxes, radios, multi-selects and files.

**`v-for` with `:key`** renders one block per item and reuses blocks by key when the list
changes.

**`{ expression }`** interpolates into text. `{{ expression }}` also works if you prefer the
double-brace form.

---

## The attribute grammar

Five spellings, all handled by the same parser.

| Written                       | Means                                    |
| ----------------------------- | ---------------------------------------- |
| `v-text="name"`               | the `text` directive                     |
| `v-on:click.prevent="save()"` | the `on` directive, arg `click`, modifier `prevent` |
| `@click.prevent="save()"`     | shorthand for the above                  |
| `:disabled="loading"`         | shorthand for `v-bind:disabled`          |
| `.value="text"`               | binds the DOM **property**, not the attribute |
| `data-v-text="name"`          | always valid HTML, same as `v-text`      |

The `v-` prefix is configurable. `data-v-` is always accepted, regardless.

---

## Reactive state, four ways

Pick the smallest scope that works.

```html
<!-- On one element -->
<div v-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <p v-show="open">Hello</p>
</div>
```

```js
// Page-wide, from JavaScript
V.data({ user: null, loading: false });
```

```js
// Component-local
V.component('counter', {
  state: () => ({ count: 0 }),
});
```

```js
// Application-wide, shared between components
V.store('cart', {
  items: [],
  total() { return this.items.length; },
});
```

Stores are reachable from any expression as `$store.cart` and from JavaScript as
`V.stores.cart`. See [State](state.md).

---

## Components

```js
V.component('user-card', {
  props: {
    name: { type: 'string', required: true },
    age: { type: 'number', default: 0 },
  },

  state: (props) => ({ expanded: false }),

  computed: {
    label() { return `${this.name} (${this.age})`; },
  },

  methods: {
    toggle() { this.expanded = !this.expanded; },
  },

  template: `
    <article>
      <h3 @click="toggle()">{ label }</h3>
      <div v-show="expanded"><slot></slot></div>
    </article>
  `,

  mounted() { console.log('mounted'); },
});
```

Three equivalent ways to use it:

```html
<div v-component="user-card" name="Ana" :age="30"></div>
<user-card name="Ana" :age="30"></user-card>
<UserCard name="Ana" :age="30"></UserCard>
```

Static attributes become props coerced to the declared type. `:attr` bindings become
reactive props evaluated in the **parent** scope. See [Components](components.md).

---

## HTTP

Declaratively:

```html
<form v-submit="/api/users" v-toast-success="Saved">
  <input name="email" type="email" required>
  <button>Save</button>
</form>

<div v-load="/api/stats" v-target="#stats"></div>
<div id="stats"></div>

<button v-delete="'/api/users/' + user.id" v-confirm="Delete this user?">Delete</button>
```

Or programmatically:

```js
const users = await V.http.get('/api/users');
await V.http.post('/api/users', { name: 'Ana' });
```

See [HTTP](http.md).

---

## Configuration

Every field on `V.config`:

| Field             | Default              | Meaning |
| ----------------- | -------------------- | ------- |
| `prefix`          | `'v-'`               | Attribute prefix. Set to `'data-v-'` for strictly valid HTML. |
| `autoStart`       | `true`               | Whether the browser build starts on its own. |
| `autoDiscover`    | `true`               | Watch the DOM and initialize inserted elements. |
| `root`            | `null`               | Root element to observe. Defaults to `document.body`. |
| `devtools`        | `false`              | Enable detailed development warnings. |
| `baseURL`         | `''`                 | Base URL for attribute-driven requests. |
| `globals`         | `{}`                 | Extra values reachable from expressions. |
| `locale`          | `navigator.language` | Used by date, number and currency formatting. |
| `currency`        | `'BRL'`              | Default currency. |
| `injectStyles`    | `true`               | Inject UI component CSS at runtime. |
| `cleanAttributes` | `true`               | Remove `v-*` attributes from the DOM once processed. |
| `sanitizeUrls`    | `true`               | Refuse `javascript:` and similar schemes in navigable attributes. |

### From the script tag

```html
<script src="voodoo.min.js"
        data-prefix="data-v-"
        data-base-url="/api"
        data-locale="en-US"
        data-devtools
        defer></script>
```

| Attribute               | Effect |
| ----------------------- | ------ |
| `data-manual`           | Do not start automatically. Call `V.start()` yourself. |
| `data-prefix`           | Sets `config.prefix`. |
| `data-base-url`         | Sets `config.baseURL` and `V.http` base URL. |
| `data-locale`           | Sets `config.locale`. |
| `data-devtools`         | Sets `config.devtools = true`. Also accepts `devtools` and `window.VOODOO_DEVTOOLS = true`. |
| `data-no-styles`        | Sets `config.injectStyles = false`. |
| `data-no-observer`      | Sets `config.autoDiscover = false`. |
| `data-keep-attributes`  | Sets `config.cleanAttributes = false`. |

### From JavaScript

Anything that must be set before the page is walked needs `data-manual`:

```html
<script src="voodoo.min.js" data-manual defer></script>
<script>
  V.config.prefix = 'data-v-';
  V.config.root = document.querySelector('#app');
  V.start();
</script>
```

---

## The boot loop

Voodoo.js does not use `DOMContentLoaded` or `document.readyState`. It runs its own
scheduler in `runtime/boot.ts`.

The reason is that load events answer the wrong question. `DOMContentLoaded` tells you the
HTML parser finished; it does not tell you that the tree you care about exists. For a page
rendered by another script, a fragment inserted later, or a container that appears on a
second screen, the event has either already fired or fires too early.

The loop asks the right question instead: *is what I need in the document, and has it
stopped changing?*

Three public conditions:

```js
V.whenReady(() => {});          // body exists AND the tree has been stable
V.ready(() => {});              // body exists, no stability wait; also returns a Promise
V.whenElement('#app', (el) => {});  // resolve a selector that may not exist yet
```

The practical consequences:

- `V.start()` runs when the page has settled, so a component registered by a later
  `defer` script is already available.
- `app.mount('#app')` works even if `#app` is created later by another script. There is no
  race with page load.
- Registering a component **after** the page has been walked mounts the tags that were
  waiting for it. The CDN script runs before your application script, and that is fine.

Everything times out after 10 seconds and proceeds anyway, so a page that never stops
changing still gets initialized.

---

## Application mode

The default style is attaching to HTML that already exists. If you prefer describing the
whole application in JavaScript, `createApp` does that with the same machinery:

```js
const app = V.createApp({
  state: () => ({ n: 0 }),
  computed: { double() { return this.n * 2; } },
  methods: { add() { this.n++; } },
  template: `
    <button @click="add()">Clicks: { n }</button>
    <p>Double: { double }</p>
  `,
  components: {
    'user-card': { /* ... */ },
  },
});

app.mount('#app');
```

Two deliberate differences from Vue:

- `mount()` accepts a target that does not exist yet.
- `unmount()` restores the container's original HTML instead of leaving it empty.

The app object is chainable:

```js
app.component('name', def).directive('name', hooks).provide('key', value).use(plugin);
```

`app.whenMounted()` returns a promise resolving with the root instance.

**Note:** `app.use(plugin)` installs into the **global** `V`, not into the app. There is no
per-application plugin registry yet. See [Plugins](plugins.md).

---

## Utilities

`V` is also callable, returning a chainable collection:

```js
V('#list .item').addClass('active').fadeIn();
V('.card').on('click', handler);
```

And it carries the utility helpers directly:

```js
V.formatCurrency(1234.5);        // locale-aware
V.formatDate(new Date(), 'DD/MM/YYYY');
V.debounce(fn, 300);
V.uuid();
V.slugify('Hello World');        // 'hello-world'
V.groupBy(items, 'category');
```

See [API reference](api-reference.md).

---

## Development warnings

Turn them on while building:

```js
V.config.devtools = true;
```

You then get actionable warnings for an unknown directive name, an unregistered component
tag, an expression that failed to evaluate, a missing required prop, and a duplicate key in
`v-for`. Each names the element and says what to do about it.

In production the cost is a boolean comparison; the messages are never formatted.

The full build also ships `V.xray`, a reactivity inspector overlay, and an in-page devtools
widget.

---

## Next

- [Reactivity](reactivity.md) - how state and effects actually work
- [Directives](directives.md) - the complete attribute reference
- [Components](components.md) - props, slots, lifecycle
- [State](state.md) - scopes, stores, persistence
- [Security](security.md) - read before using `v-html`
