# Directives

A directive is a behaviour attached to an element by an attribute. This guide covers the
attribute grammar and every directive in the core and essential builds. The full build adds
more, documented in the Portuguese [directives reference](../directives.md).

---

## Attribute grammar

`parseAttribute` in `runtime/walker.ts` normalizes five spellings:

| Written                       | Directive | Arg      | Modifiers            |
| ----------------------------- | --------- | -------- | -------------------- |
| `v-on:click.prevent="save()"` | `on`      | `click`  | `{ prevent: true }`  |
| `@click.prevent="save()"`     | `on`      | `click`  | `{ prevent: true }`  |
| `:disabled="loading"`         | `bind`    | `disabled` | `{}`               |
| `.value="text"`               | `bind`    | `value`  | `{ prop: true }`     |
| `data-v-text="name"`          | `text`    | -        | `{}`                 |

A modifier can carry a value with `=`:

```html
<input v-model.debounce=300>
<button @click.throttle=1s>Save</button>
```

The `v-` prefix comes from `V.config.prefix`. `data-v-` is always accepted regardless of the
prefix setting.

### Priority

When one element carries several directives, they run in descending priority order
(`PRIORITY` in `runtime/registry.ts`):

| Constant     | Value | Directives                                       |
| ------------ | ----- | ------------------------------------------------ |
| `IGNORE`     | 100   | reserved                                          |
| `FOR`        | 90    | `v-for` (terminal)                                |
| `IF`         | 80    | `v-if`, `v-else-if`, `v-else` (terminal)          |
| `DATA`       | 70    | `v-data`, `v-teleport`, `v-resource`              |
| `COMPONENT`  | 65    | `v-component`                                     |
| `REF`        | 60    | `v-ref`                                           |
| `MODEL`      | 40    | `v-model`                                         |
| `BIND`       | 30    | `v-bind`, option attributes                       |
| `DEFAULT`    | 0     | everything else, including your own directives    |
| `INIT`       | -10   | `v-init`                                          |
| `TRANSITION` | -20   | inert marker attributes                           |

Terminal directives take over their subtree: the walker does not descend past them.

---

## Rendering

### `v-text`

Sets `textContent`. Safe with untrusted values.

```html
<p v-text="user.name"></p>
```

### `{ expression }` and `{{ expression }}`

Text interpolation. Both forms work.

```html
<p>Hello, { user.name }! You have { messages.length } messages.</p>
<p>Hello, {{ user.name }}!</p>
```

The single-brace form has to coexist with prose, so the parser decides: text between braces
that does not parse as a single expression stays literal text. `{ some words here }` is
left alone, because it parses as a sequence of identifiers rather than one value.

The scanner counts nested braces and skips quoted strings, so this works:

```html
<span>{ $t('items', { n: total }) }</span>
```

Not interpolated: the contents of `PRE`, `CODE`, `SCRIPT`, `STYLE` and `TEXTAREA`, and
anything inside a `v-pre` or `v-ignore` subtree. Single-brace expressions longer than 500
characters are rejected.

### `v-html`

Sets `innerHTML`, then walks the inserted markup so directives inside it become live.

```html
<div v-html="article.body"></div>
```

> **There is no sanitization.** The value goes to `innerHTML` verbatim and any `v-*`, `@` or
> `:` attribute inside it is evaluated in the surrounding scope. Only pass HTML you produced
> or sanitized. See [Security](security.md).

### `v-show`

Toggles `display`. The element stays in the DOM.

```html
<p v-show="user.isAdmin">Admin panel</p>
```

Honours transition attributes on the same element (`v-transition`, `v-enter-class`, and so
on). Never animates on the first render.

### `v-if`, `v-else-if`, `v-else`

Adds and removes the element. Sibling branches form a chain.

```html
<p v-if="status === 'loading'">Loading...</p>
<p v-else-if="error">{ error }</p>
<p v-else>Ready</p>
```

Terminal: the walker does not descend into a branch that is not rendered. Use `v-if` when
the element is expensive or rarely shown; use `v-show` when it toggles often.

### `v-for`

```html
<li v-for="item in items">{ item.name }</li>
<li v-for="(item, index) in items">{ index }: { item.name }</li>
<li v-for="n in 5">Item { n }</li>
<li v-for="char in 'abc'">{ char }</li>
<li v-for="(value, key) in object">{ key }: { value }</li>
```

Both `in` and `of` are accepted.

**Always give large or reorderable lists a key:**

```html
<li v-for="user in users" :key="user.id">{ user.name }</li>
```

With a key, blocks are matched to items by key and reused: only the scope variables are
updated and the DOM node is repositioned. Without a key, the index is used, so reordering
makes every block receive different data and every effect re-runs.

`:key`, `v-bind:key` and `v-key` are all read.

Terminal. The original element becomes an off-document template; a comment node anchors the
list.

---

## Binding

### `v-bind` and `:`

```html
<img :src="user.avatar" :alt="user.name">
<button :disabled="loading">Save</button>
<a :href="'/users/' + user.id">Profile</a>
```

Without an argument, applies an object of attributes:

```html
<input v-bind="{ type: 'email', required: true, placeholder: label }">
```

Behaviour:

- Boolean attributes (`disabled`, `checked`, `readonly`, and so on) are removed when the
  value is `false` or `null`, and set to `''` when truthy. The matching DOM property is kept
  in sync.
- `value` is written as a property, so inputs behave correctly.
- `null` and `false` remove the attribute. `true` sets it to `''`.
- `class` and `style` are handled by their own logic; see below.

**Refused bindings.** When `V.config.sanitizeUrls` is on (the default):

- A value using `javascript:`, `vbscript:`, `data:text/html` or `data:application/xhtml` in
  `href`, `src`, `action`, `formaction`, `xlink:href`, `ping` or `poster` is refused, the
  attribute is removed, and a warning is logged.
- Any `:on*` binding is refused, because it would create an inline event handler. Use
  `@event` instead.

### `.prop`

Binds the DOM property directly, bypassing attribute semantics:

```html
<input .value="text">
<video .currentTime="position">
```

Equivalent to `:prop.prop`. The URL scheme check does not apply to property bindings.

### `v-class` and `:class`

```html
<div :class="{ active: isActive, disabled: !enabled }"></div>
<div :class="['card', theme]"></div>
<div :class="isActive ? 'on' : 'off'"></div>
```

Classes written in the original `class` attribute are preserved across updates.

### `v-style` and `:style`

```html
<div :style="{ color: textColor, width: pct + '%' }"></div>
<div :style="'color: red'"></div>
<div :style="[base, override]"></div>
```

Numeric values get `px` where appropriate. Custom properties work: `{ '--brand': color }`.

---

## Events

### `v-on` and `@`

```html
<button @click="count++">Increment</button>
<form @submit.prevent="save()">
<input @keyup.enter="search()">
```

If the expression is a bare identifier or member access that evaluates to a function, that
function is called with the event:

```html
<button @click="save">Save</button>       <!-- calls save(event) -->
<button @click="save()">Save</button>      <!-- calls save() -->
```

Inside a handler expression you get `$event`, `$rawEvent`, `$el` and `$detail`. For an event
dispatched by a component's `emit`, `$event` is the payload rather than the event object;
the raw event is still in `$rawEvent`.

### Shortcut directives

Nineteen events have a `v-` shorthand:

`v-click` `v-dblclick` `v-input` `v-change` `v-keyup` `v-keydown` `v-keypress`
`v-mouseenter` `v-mouseleave` `v-mouseover` `v-mousedown` `v-mouseup` `v-contextmenu`
`v-wheel` `v-paste` `v-dragstart` `v-dragover` `v-dragleave` `v-drop`

```html
<button v-click="save()">Save</button>
```

### Event aliases

| Alias         | Real event      |
| ------------- | --------------- |
| `@hover`      | `mouseenter`    |
| `@unhover`    | `mouseleave`    |
| `@tap`        | `click`         |
| `@press`      | `pointerdown`   |
| `@release`    | `pointerup`     |
| `@rightclick` | `contextmenu`   |
| `@enterkey`   | `keydown`       |
| `@type`       | `input`         |
| `@submitform` | `submit`        |

### Synthetic events

Built on top of native events:

| Event          | Fires when |
| -------------- | ---------- |
| `@hold`        | The pointer is held down. Duration via modifier: `@hold.1s`, default 800ms. |
| `@outside`     | A click lands outside the element. |
| `@visible`     | The element enters the viewport. Modifiers: `.threshold=0.5`, `.margin=100px`, `.repeat`. |
| `@swipeleft` `@swiperight` `@swipeup` `@swipedown` | A pointer drag exceeds 40px in that direction. |

`@visible` falls back to firing immediately when `IntersectionObserver` is missing.

### Modifiers

| Modifier      | Effect |
| ------------- | ------ |
| `.prevent`    | `event.preventDefault()` |
| `.stop`       | `event.stopPropagation()` |
| `.self`       | Only when `event.target` is the element itself |
| `.once`       | Listener removed after the first call |
| `.capture`    | Capture phase |
| `.passive`    | Passive listener |
| `.window`     | Listen on `window` |
| `.document`   | Listen on `document` |
| `.outside`    | Listen on `document`, ignore events inside the element |
| `.debounce`   | Debounce. `.debounce=300` or `.debounce=1s`; default 250ms |
| `.throttle`   | Throttle, same value syntax |

### Key modifiers

On keyboard events:

```html
<input @keyup.enter="submit()">
<input @keydown.esc="cancel()">
<div @keydown.ctrl.s.prevent="save()">
```

Named keys: `enter` `esc` `escape` `space` `tab` `delete` `backspace` `up` `down` `left`
`right`. Any single letter or digit also works. System modifiers: `ctrl` `shift` `alt`
`meta`.

Several key modifiers on one binding are an OR; system modifiers are an AND.

---

## Forms

### `v-model`

Two-way binding, aware of the input type.

```html
<input v-model="form.email">
<textarea v-model="form.bio"></textarea>
<select v-model="form.country">...</select>
<select v-model="form.tags" multiple>...</select>
<input type="checkbox" v-model="form.agreed">
<input type="checkbox" value="a" v-model="form.selected">   <!-- array -->
<input type="radio" value="yes" v-model="form.answer">
<input type="file" v-model="form.upload">
<input type="file" v-model.single="form.avatar" multiple>
```

| Case                    | Value written |
| ----------------------- | ------------- |
| Checkbox, plain         | `boolean`     |
| Checkbox bound to array | the array, with `value` added or removed |
| Radio                   | `input.value` of the checked radio |
| Multi-select            | array of selected values |
| File                    | `FileList`, or the first `File` with `.single` |
| `number` / `range` input| coerced to a number |

Modifiers:

| Modifier     | Effect |
| ------------ | ------ |
| `.lazy`      | Update on `change` instead of `input` |
| `.number`    | Coerce to a number; automatic for `number` and `range` |
| `.trim`      | Trim whitespace |
| `.debounce`  | `.debounce=300`, default 250ms |
| `.single`    | File inputs: store one `File` rather than a `FileList` |

`v-debounce` on the same element is also read as a fallback source for the debounce value.

File inputs are write-protected: state changes do not push values back into the input,
because that is not allowed by the platform.

---

## Structure and scope

### `v-data`

Creates a reactive child scope.

```html
<div v-data="{ open: false, items: [] }">
  <button @click="open = !open">Toggle</button>
</div>
```

Scopes nest. An identifier resolves by walking up the chain; a write goes to whichever scope
owns the key, or creates it locally if nobody does.

### `v-component`

Mounts a registered component onto the element.

```html
<div v-component="user-card" name="Ana"></div>
```

Equivalent to using the tag directly. See [Components](components.md).

### `v-ref`

Registers an element reference on the nearest component scope, or the current scope.

```html
<input v-ref="email">
<button @click="$refs.email.focus()">Focus</button>
```

`$refs` merges references from the whole ancestor chain.

### `v-init`

Runs once, after the DOM has been written. Priority `INIT`, so it runs after every other
directive on the element is set up.

```html
<div v-data="{ items: [] }" v-init="items = JSON.parse($el.dataset.seed)">
```

`$el` is available. If the expression evaluates to a function, it is called with `this`
bound to the scope data.

### `v-effect`

Runs an expression as a reactive effect.

```html
<div v-effect="document.title = `${unread} unread`"></div>
```

Note that `document` is not in the expression allowlist, so this specific example needs
`V.config.globals.document = document`. Prefer a method on your component.

### `v-watch`

Watches the `v-model` value on the same element and runs the expression when it changes.

```html
<input v-model="query" v-watch="search($value)">
```

Inside the expression: `$value`, `$old` and `$el`.

### `v-teleport`

Moves the element to another container, leaving a comment placeholder. Restored on cleanup.

```html
<div v-teleport="body">...</div>
<div v-teleport="#modal-root">...</div>
```

### `v-cloak`

Hides the element until Voodoo.js processes it, so raw `{ expression }` text never flashes.

```html
<div v-data="{ name: 'Ana' }" v-cloak>
  <p>Hello, { name }</p>
</div>
```

The rule `[v-cloak]{display:none !important}` ships in the injected token stylesheet. If
`V.config.injectStyles` is `false`, or you changed `V.config.prefix`, declare it yourself.

### `v-once`

> **Not what Vue users expect.** In Voodoo.js, `v-once` evaluates its expression **once** and
> writes the result to `textContent`. It is a non-reactive `v-text`, not a subtree freeze,
> and children are still walked.

```html
<span v-once="expensiveInitialValue"></span>
```

To genuinely skip a subtree, use `v-pre` or `v-ignore`.

### `v-pre` and `v-ignore`

Identical. The walker marks the element as done and returns immediately. No directives, no
interpolation, no effects, anywhere in the subtree.

```html
<pre v-pre>
  Example: { this } stays literal text.
</pre>
```

The cheapest thing in the library, because the cost is zero.

---

## Transitions

Marker attributes read by `v-show`, `v-if` and `v-for`:

```html
<div v-show="open"
     v-transition="fade"
     v-duration="300">
</div>
```

| Attribute                | Meaning |
| ------------------------ | ------- |
| `v-transition`           | Transition name; class prefix. Default `fade`. |
| `v-enter-class`          | Class applied at the start of entering |
| `v-enter-active-class`   | Class applied during entering |
| `v-enter-to-class`       | Class applied at the end of entering |
| `v-leave-class`          | Class applied at the start of leaving |
| `v-leave-active-class`   | Class applied during leaving |
| `v-leave-to-class`       | Class applied at the end of leaving |
| `v-duration`             | Explicit duration, overriding the computed one |

All transitions are skipped when the user has `prefers-reduced-motion: reduce`.

---

## HTTP directives

Covered in [HTTP](http.md). Summary:

`v-get` `v-post` `v-put` `v-patch` `v-delete` `v-load` `v-load-visible` `v-search`
`v-resource`

with option attributes `v-target` `v-swap` `v-trigger` `v-poll` `v-params` `v-body`
`v-headers` `v-cache` `v-retry` `v-timeout` `v-as` `v-json-path` `v-template`
`v-offline-queue` `v-min-length` `v-scroll-to` `v-manual` `v-debounce` `v-throttle`
`v-indicator`.

## Form directives

Covered in [Forms](forms.md). Summary:

`v-submit` `v-loading` `v-upload` `v-dropzone` `v-autosave` `v-guard` `v-mask`
`v-mask-currency` `v-validate`

plus per-field rules (`v-required`, `v-email`, `v-min`, `v-cpf`, and more) and form options
(`v-method`, `v-redirect`, `v-toast-success`, `v-confirm`, and more).

## State directives

Covered in [State](state.md). Summary:

`v-persist` `v-sync` `v-history` `v-undo` `v-redo` `v-storage`

## UI directives

Essential build. Documented in the Portuguese [interface guide](../interface.md).

`v-modal` `v-modal-close` `v-drawer` `v-offcanvas` `v-tabs` `v-accordion` `v-collapse`
`v-dropdown` `v-dropdown-menu` `v-popover` `v-tooltip` `v-command` `v-toggle` `v-copy`
`v-share` `v-print` `v-download` `v-fullscreen` `v-focus` `v-focus-trap` `v-escape`
`v-click-outside` `v-hotkey` `v-sticky` `v-scrollspy` `v-scroll-to` `v-infinite-scroll`
`v-lazy-src` `v-lazy-bg` `v-skeleton` `v-visible` `v-idle` `v-online` `v-offline`
`v-theme-toggle` `v-typewriter` `v-count` `v-parallax` `v-resizable`

and drag-and-drop: `v-draggable` `v-droppable` `v-sortable` `v-dnd-group` `v-flip`.

Across the whole full build, a static scan of the source finds 222 distinct attribute names
registered, plus one `v-validate-<rule>` alias per registered validation rule.

---

## Writing your own

```js
V.directive('highlight', {
  created(el, binding) {},
  beforeMount(el, binding) {},
  mounted(el, binding) { el.style.background = binding.value; },
  updated(el, binding) { el.style.background = binding.value; },
  beforeUnmount(el, binding) {},
  unmounted(el, binding) {},
  priority: 0,
  raw: false,
});
```

```html
<div v-highlight="'yellow'">Static</div>
<div v-highlight="statusColor">Reactive</div>
```

Short form, installed as both `mounted` and `updated`:

```js
V.directive('size', (el, binding) => {
  el.style.fontSize = `${binding.value}px`;
});
```

The binding carries `el`, `value`, `oldValue`, `arg`, `modifiers`, `expression`, `scope` and
`instance` (the nearest component instance, or `null`).

`raw: true` hands you the expression text without evaluating it, for directives that take a
selector or a name.

Allocate anything? Release it in `beforeUnmount`. Effects created through the internal
context are cleaned up automatically; a `setInterval` you started is not.

See [Plugins](plugins.md) and [docs/plugin-spec.md](../plugin-spec.md).

---

## Next

- [Components](components.md)
- [State](state.md)
- [HTTP](http.md)
- [Forms](forms.md)
