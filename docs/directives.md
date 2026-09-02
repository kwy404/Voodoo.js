# Directives

Complete reference. Every directive is an attribute with the `v-` prefix (configurable in
`V.config.prefix`). The `data-v-name` spelling is always accepted, even when the prefix is different.

## How an attribute is read

```
v-on:click.prevent.once="save()"
│  │  │     │              └── expression
│  │  │     └── modifiers, separated by dot
│  │  └── argument, after the colon
│  └── directive name
└── prefix
```

Shortcuts:

| Write | Equals |
| --- | --- |
| `@click="..."` | `v-on:click="..."` |
| `:href="..."` | `v-bind:href="..."` |
| `.value="..."` | `v-bind:value.prop="..."` |

Modifiers are always plain names, because an `=` inside an attribute name doesn't survive the
HTML parser. When a directive needs a number, it offers its own attribute
(`v-debounce`, `v-autosave-delay`, `v-mask-decimals`) or accepts the value as a direct modifier,
like in `@hold.2s`.

## Execution order

On the same element the order is fixed and doesn't depend on how you wrote the attributes:

1. `v-ignore` and `v-pre` cancel everything in that subtree;
2. terminal directives (`v-for`, `v-if`, `v-else-if`, `v-else`) take control;
3. `v-data` and `v-component` create the scope used by the rest;
4. the rest run by decreasing priority: `v-ref`, `v-mask`, `v-model`, `v-bind`, the rest,
   `v-init`, and finally transition classes;
5. children are traversed with the resulting scope.

## Attributes disappear from HTML

After a directive is processed, the attribute leaves the document. This keeps the DOM clean in
the inspector, just like a framework with a compiler would:

```html
<!-- you write -->
<button v-click="save()" :disabled="loading">Save</button>

<!-- the inspector shows -->
<button disabled>Save</button>
```

The values stay stored in the runtime, so behavior doesn't change. Two consequences:

- **never write CSS based on selectors like `[v-tab]`**, use classes;
- `el.getAttribute('v-something')` returns `null` after mounting.

To turn it off, use `V.config.cleanAttributes = false` or the `data-keep-attributes` attribute on the
`<script>` tag.

---

# Content and visibility

## v-text

Writes text in the element. HTML is escaped.

```html
<span v-text="user.name"></span>
<span v-text="'Total: ' + total"></span>
```

## v-html

Inserts HTML and initializes directives that come inside.

```html
<div v-html="editorContent"></div>
```

> **Warning.** Never use `v-html` with text from the user without sanitizing. See
> [Security](seguranca.md).

## v-show

Toggles `display`. The element stays in the document.

```html
<div v-show="user.loggedIn">Welcome</div>
<div v-show="open" v-transition="fade">With animation</div>
```

## v-if, v-else-if, v-else

Actually inserts and removes from the DOM.

```html
<p v-if="grade >= 9">excellent</p>
<p v-else-if="grade >= 6">good</p>
<p v-else>needs improvement</p>
```

`v-else-if` and `v-else` need to be immediate siblings of `v-if`. A `<template>` works when
you want to condition multiple elements without an extra container:

```html
<template v-if="loaded">
  <h2>Title</h2>
  <p>Text</p>
</template>
```

## v-once

Evaluates once, writes the result, and doesn't create a reactive effect.

```html
<span v-once="createdDate"></span>
```

## v-cloak

Removes itself when the library starts. Combine with CSS to prevent content flashing:

```html
<style>[v-cloak] { display: none !important; }</style>
<div v-cloak v-data="{ ready: true }">...</div>
```

## v-pre and v-ignore

Turn off Voodoo in that subtree. Nothing is processed, not even interpolation.

```html
<pre v-pre>{ this stays literal }</pre>
```

---

# Lists

## v-for

```html
<li v-for="item in items">{ item }</li>
<li v-for="(item, i) in items">{ i }: { item }</li>
<li v-for="(value, key) in object">{ key } = { value }</li>
<li v-for="(value, key, i) in object">{ i }. { key }</li>
<li v-for="n in 3">{ n }</li>              <!-- 1, 2, 3 -->
<li v-for="letter in 'abc'">{ letter }</li>
```

`in` and `of` work the same. Accepted sources are array, number, text, object, `Map`, and `Set`.

**Always use `:key` when the list can be reordered or filtered.** With a key, elements are
reused instead of recreated, and internal state (focus, typed value, scroll) survives:

```html
<li v-for="product in products" :key="product.id">
  { product.name }
</li>
```

`<template v-for>` repeats multiple children without a container:

```html
<template v-for="row in rows" :key="row.id">
  <dt>{ row.term }</dt>
  <dd>{ row.definition }</dd>
</template>
```

`v-for` and `v-if` on the same element don't combine, because both are terminal. Put `v-if` in
the child:

```html
<div v-for="n in list">
  <span v-if="n % 2 === 0">{ n }</span>
</div>
```

---

# Attributes, classes and styles

## v-bind and the `:` shortcut

```html
<a :href="link" :title="title">Go</a>
<button :disabled="loading">Save</button>
<input :value="name">
<img :src="photo" :alt="name">
```

Boolean attributes (`disabled`, `checked`, `readonly`, `required`, `selected`, `hidden`, `open`,
`multiple`, `autofocus`, `novalidate`, `inert`) are added and removed based on the value.

Without an argument, applies an entire object:

```html
<input v-bind="{ placeholder: 'Name', maxlength: '10', required: true }">
```

The `.prop` modifier writes to the element's property instead of the attribute. The `.` shortcut does
the same:

```html
<video :current-time.prop="seconds"></video>
<video .currentTime="seconds"></video>
```

## v-class

Accepts text, array, and object. The element's original classes are always preserved.

```html
<div class="card" :class="{ active: selected, error: hasError }"></div>
<div :class="['base', theme, { large: expanded }]"></div>
<div v-class="statusCss"></div>
```

## v-style

```html
<div :style="{ color: color, backgroundColor: background }"></div>
<div :style="'width: ' + width + 'px'"></div>
<div :style="{ '--v-primary': brandColor }"></div>
```

CamelCase names become hyphenated. Custom properties (`--something`) pass through unchanged.

---

# Form

## v-model

Links a field to state in both directions.

```html
<input v-model="name">
<textarea v-model="bio"></textarea>
<select v-model="state"><option>CA</option><option>NY</option></select>
<input type="checkbox" v-model="accepted">
<input type="checkbox" value="a" v-model="tags">
<input type="radio" value="pix" v-model="payment">
<select multiple v-model="selected"></select>
<input type="file" v-model="files">
```

Behavior by type:

| Field | Value in state |
| --- | --- |
| text, textarea | string |
| number, range | number (automatic conversion) |
| checkbox alone | boolean |
| checkbox tied to array | array with marked `value`s |
| radio | the chosen `value` |
| simple select | string |
| multiple select | array of strings |
| file | `FileList`, or first file with `.single` |

Modifiers:

| Modifier | Effect |
| --- | --- |
| `.lazy` | Updates on `change` instead of `input` |
| `.number` | Converts to number |
| `.trim` | Strips whitespace from ends |
| `.debounce` | Waits before writing. The `v-debounce` attribute sets the time |
| `.single` | On `type="file"`, stores one file instead of the list |

---

# Events

Covered in detail in [Events](eventos.md). Summary:

```html
<button v-on:click="save()">Save</button>
<button @click="save()">Save</button>
<button v-click="save()">Save</button>
```

Shortcuts with proper names: `v-click`, `v-dblclick`, `v-input`, `v-change`, `v-keyup`, `v-keydown`,
`v-keypress`, `v-mouseenter`, `v-mouseleave`, `v-mouseover`, `v-mousedown`, `v-mouseup`,
`v-contextmenu`, `v-wheel`, `v-paste`, `v-dragstart`, `v-dragover`, `v-dragleave`, `v-drop`.

Modifiers: `.prevent`, `.stop`, `.self`, `.once`, `.capture`, `.passive`, `.window`,
`.document`, `.outside`, `.debounce`, `.throttle`, keys (`.enter`, `.esc`, `.space`, `.tab`,
`.delete`, `.up`, `.down`, `.left`, `.right`, letters and digits) and system keys (`.ctrl`,
`.shift`, `.alt`, `.meta`).

Synthetic events: `@hold`, `@outside`, `@visible`, `@swipeleft`, `@swiperight`, `@swipeup`,
`@swipedown`.

---

# Scope and lifecycle

## v-data

Creates a reactive scope.

```html
<div v-data="{ open: false, items: [] }">
  <button v-click="open = !open">toggle</button>
</div>
```

Without a value, creates an empty scope: `<div v-data>`.

## v-init

Runs an expression after the round's DOM has been applied.

```html
<div v-data="{ data: null }" v-init="load()"></div>
<div v-data="{ n: 0 }" v-init="console.log('mounted', $el)"></div>
```

When the expression is a function name, it's called with `this` pointing to the scope.

## v-ref

Stores the element in `$refs`.

```html
<div v-data="{}">
  <input v-ref="search">
  <button v-click="$refs.search.focus()">Focus</button>
</div>
```

## v-effect

Runs the expression whenever any dependency read by it changes.

```html
<div v-effect="document.title = 'Cart (' + items.length + ')'"></div>
```

## v-watch

Watches the `v-model` of the same element and runs the expression when the value changes. Inside
it you have `$value` and `$old`.

```html
<input v-model="search" v-watch="search($value)">
```

## v-teleport

Moves the element to another place in the document, keeping the original scope.

```html
<div v-teleport="body">This block goes to the end of body</div>
<div v-teleport="#modals-area">...</div>
```

When removed, the element goes back to its original place.

## v-component

Mounts a registered component on the element. See [Components](componentes.md).

```html
<div v-component="user-card" :user="current"></div>
```

## v-transition and helper classes

Applies CSS classes on entries and exits of `v-if` and `v-show`.

```html
<div v-show="open" v-transition="fade" v-duration="300">...</div>

<div v-if="open"
     v-enter-class="opacity-0"
     v-enter-active-class="transition"
     v-enter-to-class="opacity-100"
     v-leave-class="opacity-100"
     v-leave-active-class="transition"
     v-leave-to-class="opacity-0">
</div>
```

Without custom classes, the name becomes the prefix: `v-fade-enter-from`, `v-fade-enter-active`,
`v-fade-enter-to`, `v-fade-leave-from`, `v-fade-leave-active`, `v-fade-leave-to`.

---

# HTTP

Detailed in [HTTP](http.md).

| Directive | What it does |
| --- | --- |
| `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` | Fires the request on the element's natural trigger |
| `v-load` | GET request on mount |
| `v-load-visible` | GET request when element gets close to screen |
| `v-search` | Search while user types, with debounce |
| `v-resource` | Reactive object with `data`, `loading`, `error`, `loaded`, `reload()`, `set()` |

Configuration attributes: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-params`, `v-param`,
`v-body`, `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-as`, `v-json-path`, `v-template`,
`v-offline-queue`, `v-min-length`, `v-scroll-to`, `v-manual`, `v-debounce`, `v-method`,
`v-redirect`, `v-loading`, `v-loading-class`, `v-disable-loading`, `v-toast-success`,
`v-toast-error`, `v-on-success`, `v-on-error`, `v-on-complete`.

---

# Forms

Detailed in [Forms](formularios.md).

| Directive | What it does |
| --- | --- |
| `v-submit` | Submits the form via AJAX |
| `v-upload` | Sends files from `<input type="file">` with progress |
| `v-dropzone` | File drop area |
| `v-autosave` | Saves the form by itself, with debounce |
| `v-guard` | Warns before leaving the page with pending changes |
| `v-loading` | Hides an element until the request starts |

---

# Validation

Detailed in [Validation](validacao.md).

`v-validate` on the form enables automatic validation. On fields:

`v-required`, `v-email`, `v-url`, `v-number`, `v-integer`, `v-minlength`, `v-maxlength`, `v-min`,
`v-max`, `v-match`, `v-regex`, `v-cpf`, `v-cnpj`, `v-cep`, `v-phone`, `v-date`, `v-accepted`,
`v-strong-password`, plus `v-validate-<rule>` for any registered rule.

Per-field configuration: `v-error-message`, `v-error-target`, `v-regex-flags`, `v-unique-url`,
`v-label`.

---

# Masks

Detailed in [Masks](mascaras.md).

```html
<input v-mask="cpf">
<input v-mask="(99) 99999-9999">
<input v-mask.unmask="cpf" v-model="form.cpf">
<input v-mask-currency v-mask-decimals="2">
```

---

# Interface

Detailed in [Interface](interface.md).

| Directive | What it does |
| --- | --- |
| `v-toggle` | Shows and hides a target, or toggles a class |
| `v-collapse`, `v-collapse-toggle` | Panel that opens and closes with height animation |
| `v-dropdown`, `v-dropdown-menu` | Dropdown menu with arrow navigation |
| `v-popover` | Floating layer with focus trapped |
| `v-tooltip` | Tip on hover or focus |
| `v-tabs`, `v-tab`, `v-tab-panel` | Accessible tabs |
| `v-accordion`, `v-accordion-item` | Accordion |
| `v-drawer`, `v-drawer-content`, `v-drawer-close`, `v-offcanvas` | Side drawer |
| `v-modal`, `v-modal-content`, `v-modal-close` | Modal |
| `v-confirm` | Asks for confirmation before letting the action proceed |
| `v-theme-toggle` | Toggles light and dark theme |
| `v-focus`, `v-focus-trap` | Auto focus and focus trap |
| `v-click-outside`, `v-escape` | Reacts to click outside and Escape key |
| `v-hotkey` | Keyboard shortcut that clicks the element |
| `v-scroll-to`, `v-scrollspy`, `v-sticky` | Scrolling |
| `v-visible`, `v-infinite-scroll` | Entry on screen and infinite scroll |
| `v-lazy-src`, `v-lazy-bg` | On-demand images |
| `v-skeleton` | Loading skeleton |
| `v-copy`, `v-copy-from` | Copy to clipboard |
| `v-print`, `v-share`, `v-download`, `v-fullscreen` | Browser actions |
| `v-resizable` | Resize with mouse and keyboard |
| `v-command`, `v-command-item` | Command palette |
| `v-idle` | Reacts to inactivity |
| `v-online`, `v-offline` | Reacts to connection |

---

# Drag and drop

Detailed in [Drag and drop](arrastar-e-soltar.md).

`v-sortable`, `v-draggable`, `v-droppable`, `v-dnd-group` and configuration attributes
`v-sortable-group`, `v-sortable-handle`, `v-draggable-handle`, `v-draggable-axis`,
`v-draggable-data`, `v-draggable-group`, `v-droppable-accept`, `v-droppable-group`.

---

# Advanced state

Detailed in [State and stores](estado-e-stores.md).

| Directive | What it does |
| --- | --- |
| `v-persist` | Saves the scope to `localStorage` and restores on reload |
| `v-sync` | Syncs the scope with other open tabs |
| `v-history` | Undo and redo, with `$history` |
| `v-undo`, `v-redo` | Undo and redo buttons |
| `v-storage` | Links a single field to `localStorage` |

---

# Full build only

## Animation

`v-motion`, `v-motion-scroll`, `v-motion-stagger`, `v-motion-stagger-from`, `v-motion-hover`,
`v-motion-tap`, `v-parallax`, `v-flip`, `v-count`, `v-typewriter`. See
[Animations](animacoes.md).

## Charts

`v-chart` and `v-chart-*` attributes. See [Charts](graficos.md).

## Router

`v-router-view`, `v-link`, `v-route-active`. See [Router](roteador.md).

## Languages

`v-t`, `v-t-params`, `v-locale`. See [Languages](idiomas.md).

---

# Creating your own

```js
V.directive('highlight', {
  mounted(el, binding) { el.style.background = binding.value; },
  updated(el, binding) { el.style.background = binding.value; },
});
```

```html
<div v-highlight="'yellow'">Highlight</div>
```

The short function form works for both `mounted` and `updated`:

```js
V.directive('mark', (el, binding) => {
  el.dataset.marked = binding.value;
});
```

See [Plugins](plugins.md) for the complete format, with priority, effects, and cleanup.

---

Previous: [Expressions](expressoes.md) · Next: [Components](componentes.md)
