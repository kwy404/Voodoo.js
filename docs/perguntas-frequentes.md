# FAQ

## General

### Does Voodoo.js need a build?

No. A `<script>` tag and the HTML already work. The npm package exists for those who prefer to
import via bundler, but nothing requires it.

### Which bundle do I choose?

Start with `voodoo.min.js`. It already brings reactivity, directives, components, HTTP, forms,
validation, masks, interface, drag and drop, notifications, dialogs, and storage. Switch to
`voodoo.full.min.js` the day you need a chart, spring animation, router, languages, inspector,
or the 29 ready-made components.

### Why does interpolation use single braces?

Because that's what most people try to write first. `{ name }` is Voodoo's standard form.
`{{ name }}` also works, for those coming from Vue and for text that needs literal braces around it.

### Where did my `v-*` attributes go?

They're removed from HTML after processing, on purpose, to keep the DOM clean in the inspector.
Behavior keeps working because values are stored in the runtime. To keep them:

```js
V.config.cleanAttributes = false;
```

Or use `data-keep-attributes` on the `<script>` tag.

### My CSS stopped working after updating

It probably depended on an attribute selector like `[v-tab] { ... }`. Since attributes leave the
HTML, those selectors stop matching. Use classes. Interface directives already apply their own
classes: `v-tab`, `v-active`, `v-drawer-panel`, `v-dropzone`, and so on.

### `el.getAttribute('v-something')` returns null

Same reason. If you need to read the original value from inside a custom directive, use the
runtime's read functions, which consult the cache. From outside, store the value in a common
`data-` attribute.

### Does it work with restrictive Content Security Policy?

Yes, without `unsafe-eval`. Expressions go through a custom parser and interpreter. Only
`style-src` needs `'unsafe-inline'`, because of injected CSS, and that can be dispensed with
`data-no-styles`. See [Security](seguranca.md).

### Which browsers are supported?

The builds target `es2018` and use modern APIs like `Proxy`, `fetch`, `IntersectionObserver`,
`MutationObserver`, and `AbortController`. In practice: any updated browser from the last few
years. No Internet Explorer support, and there won't be.

### Does it work in Node?

Pure modules do: reactivity, HTTP, utilities, and the parser don't touch the DOM. What depends on
DOM only runs in the browser. There is no server-side rendering.

### Does the library have dependencies?

None at runtime. In development there are `tsup`, `typescript`, `vitest`, `jsdom`, and
`prettier`.

## Everyday use

### How do I do something as soon as the page loads?

```html
<div v-data="{ data: null }" v-init="load()"></div>
```

Or `V.ready(fn)` in JavaScript, or the `voodoo:ready` event.

### How do I access an element?

```html
<input v-ref="search">
<button v-click="$refs.search.focus()">Focus</button>
```

Inside handlers, `$el` is the element that declared the directive.

### How do I make a request without writing JavaScript?

```html
<button v-get="/api/users" v-target="#list">Load</button>
<div id="list"></div>
```

To store in state instead of writing to the DOM, use `v-as`. To have full state with loading and
error, use `v-resource`.

### How do I know if a request is in progress?

With `v-resource`, it's `resource.loading`. In forms, it's `$form.loading`. In verb directives,
use `v-loading="#spinner"` and `v-disable-loading`.

### My `v-for` loses focus when the list changes

Missing `:key`. Without a key, blocks are identified by position and recreated. With a key they're
reused.

```html
<li v-for="item in items" :key="item.id">...</li>
```

### `v-if` and `v-for` on the same element don't work

Both are terminal, so one takes control and the other doesn't run. Put `v-if` in a child:

```html
<div v-for="n in list">
  <span v-if="n % 2 === 0">{ n }</span>
</div>
```

### How do I write a multi-line function in an attribute?

Don't. The parser accepts expressions, not blocks. Put the logic in a method:

```js
V.data({ clear() { this.items = []; this.total = 0; } });
```

```html
<button v-click="clear">Clear</button>
```

### `window`, `document`, and `fetch` are `undefined` in expressions

Intentional. Only a closed list of globals is allowed. To reach the DOM and services, use magics:
`$el`, `$refs`, `$http`, `$storage`, `$clipboard`. To release something of your own:

```js
V.config.globals.myFunction = myFunction;
```

### How do I debounce with a different time than 250 ms?

In events, debounce in the function:

```js
V.data({ search: V.debounce((t) => load(t), 600) });
```

In `v-model`, use the attribute:

```html
<input v-model.debounce="search" v-debounce="600">
```

In HTTP directives, `v-debounce` works directly.

### Do elements created by JavaScript get directives?

Yes. A `MutationObserver` initializes what appears in the DOM after loading. If you turned it off
with `data-no-observer`, call `V.walk(element)` manually.

### How do I make a mask and send the clean value to the server?

```html
<input v-mask.unmask="cpf" v-model="form.cpf" v-cpf>
```

The screen shows `123.456.789-01` and the state stores `12345678901`.

### How do I change validation messages?

```js
Object.assign(V.messages, { required: 'Required field.' });
```

For a specific field, `v-error-message="..."`.

### How do I validate on the server and show the error on the right field?

Return 422 with `{ "errors": { "email": "Already registered" } }`. `v-submit` distributes
messages to fields by `name`, and ones with no corresponding field appear in a summary at the top.

### Does `v-sortable` reorder my array?

No. It moves elements in the DOM. Listen to `voodoo:sorted` and reorder the array, or save the
order on the server. Without this, the next render goes back to the old order.

### Can I use it together with Bootstrap, Tailwind, or my CSS?

Yes. Voodoo doesn't impose style. Interface directives inject only the minimum, and you can turn it
off with `data-no-styles`. For Tailwind, point the theme colors to `--v-*` variables and the two
work together.

### Can I use it together with jQuery, Alpine, or Vue?

Yes, they all use standard DOM. Mark the other library's region with `v-ignore` so Voodoo doesn't
touch it.

### How do I test?

The core works in jsdom. The project pattern is to mount a snippet, walk, and verify:

```js
import { walk } from 'voodoojs';

document.body.innerHTML = '<div v-data="{ n: 0 }"><b v-text="n"></b></div>';
V.start();
await V.nextTick();
expect(document.querySelector('b').textContent).toBe('0');
```

`V.flushSync()` applies everything pending without waiting for a microtask.

## Common errors

### Nothing happens, the HTML appears raw

Check if the script loaded and if it isn't set to `data-manual` without a call to `V.start()`.
Also check the console: syntax errors in expressions appear there with the exact position.

### Content flashes before rendering

Use `v-cloak` with the CSS rule:

```html
<style>[v-cloak] { display: none !important; }</style>
<div v-cloak v-data="{}">...</div>
```

### `Maximum call stack` or loop warning in console

Some effect is writing to the same key it reads. The scheduler stops the repetition and warns.
Review the expression, usually a `v-effect` that assigns to a variable it reads.

### The component doesn't see the surrounding `v-data`

It's default behavior: components isolate scope so they don't accidentally depend on where they're
pasted. Pass via props, or turn on `inheritScope: true` in the definition.

### The slot doesn't see the component's state

Also expected behavior, and same as Vue: slot content belongs to the parent's scope. Scoped slots
don't exist.

### Translation disappears when switching language

If you used `v-t-params`, values are only read on first render. Use reactive interpolation:

```html
<span>{ $t('items', { n: total }) }</span>
```

### Confirmation appears twice

This happens when `v-confirm` is on the same element as `v-get`, `v-post`, `v-put`, `v-patch`,
`v-delete`, or `v-submit`: both layers read the same attribute. Leave the prompt in one place:

```html
<button v-confirm="Delete?" v-click="$http.delete('/api/x').then(() => list.reload())">
  Delete
</button>
```

### Chart goes back to line when data changes

`v-chart-*` attributes are read on mount. With reactive data, declare everything in the object:

```html
<div v-chart="{ type: 'bar', data: sales }"></div>
```

## Project

### What's the license?

MIT.

### How do I report a bug?

Open an issue with a minimal example that reproduces the problem, preferably a single-page HTML.
See [Contributing](contribuindo.md).

### How do I request a new feature?

Open a proposal issue explaining the problem before the solution. What's out of scope today is
listed in the [Introduction](introducao.md)'s roadmap.

### How do I contribute code?

```bash
npm install
npm test
npm run typecheck
npm run build
npm run size
```

The full guide is in [Contributing](contribuindo.md).

---

Previous: [Migrating from Vue](migrando-do-vue.md) · Next: [Contributing](contribuindo.md)
