# Components

A component is a scope with state, props, computed values, methods, watchers, slots and
lifecycle hooks, mounted onto an element that already exists. There is no compilation step
and no render function.

Implementation: `packages/voodoojs/src/runtime/component.ts`.

---

## Registration

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

  watch: {
    expanded(value, old) { console.log(value, old); },
  },

  template: `
    <article>
      <h3 @click="toggle()">{ label }</h3>
      <div v-show="expanded"><slot></slot></div>
    </article>
  `,

  style: `.user-card { border: 1px solid var(--v-border); }`,

  mounted() {},
});
```

Register with **kebab-case**. `normalizeComponentName` converts `UserCard`, `userCard` and
`user_card` all to `user-card`, and a hyphen-free alias (`usercard`) is registered so that a
PascalCase tag resolves after the HTML parser lowercases it.

### Three ways to use it

```html
<div v-component="user-card" name="Ana" :age="30"></div>
<user-card name="Ana" :age="30"></user-card>
<UserCard name="Ana" :age="30"></UserCard>
```

### Registering after the page loaded

This works, and it is the normal case. The CDN script with `defer` runs before your
application script, so components are always registered after the page has been walked.

`defineComponent` scans the document for tags waiting on the name it just registered and
mounts them. If such an element was already walked because of some other attribute, it is
destroyed, its attributes are restored from the internal cache, and it is walked again.

---

## Definition reference

| Key            | Type | Meaning |
| -------------- | ---- | ------- |
| `state`        | `(props) => object` | Initial state. Receives resolved props. |
| `data`         | `(props) => object` | Alias of `state`, for people coming from Vue. `state` wins if both are present. |
| `props`        | `string[]` or `Record<string, PropDefinition>` | Accepted props. |
| `computed`     | `Record<string, () => any>` | Cached derived values. |
| `methods`      | `Record<string, Function>` | Bound to the instance. |
| `watch`        | `Record<string, (value, old) => void>` | Watchers on instance keys. Not deep. |
| `template`     | `string` | HTML. Use `<slot>` for the original content. |
| `style`        | `string` | CSS, injected once per component name. |
| `inheritScope` | `boolean` | Inherit the parent scope instead of isolating. Default `false`. |
| `provide`      | `object` or `() => object` | Values handed to descendants. |
| `inject`       | `string[]` or `Record<string, { from?, default? }>` | Values pulled from an ancestor's `provide`. |
| `beforeMount`  | `() => void` | Before the template is applied. |
| `mounted`      | `() => void` | After the DOM has been written. |
| `updated`      | `() => void` | After any state change. See the warning below. |
| `beforeUnmount`| `() => void` | Before teardown. |
| `unmounted`    | `() => void` | After teardown. |
| `destroyed`    | `() => void` | Alias of `unmounted`. **Both fire if both are declared.** |

Any other function on the definition that is not a lifecycle hook, `state` or `data`
automatically becomes a method. This lets you write:

```js
V.component('counter', {
  state: () => ({ n: 0 }),
  add() { this.n++; },              // becomes a method
  template: `<button @click="add()">{ n }</button>`,
});
```

---

## Props

```js
props: {
  name:     { type: 'string', required: true },
  age:      { type: 'number', default: 0 },
  active:   { type: 'boolean', default: false },
  tags:     { type: 'array', default: [] },
  config:   { type: 'object' },
  anything: { type: 'any' },
}
```

Short form, all typed `any`:

```js
props: ['name', 'age']
```

Types: `'string'` `'number'` `'boolean'` `'array'` `'object'` `'any'`.

### Static versus bound

```html
<user-card name="Ana" :age="user.age" :config="{ compact: true }"></user-card>
```

- A **static attribute** is a string, coerced to the declared type. An empty string,
  `'true'` or `'1'` all count as `true` for a boolean prop.
- A **`:` binding** creates a reactive effect evaluated in the **parent scope**. Change the
  parent's value and the prop updates.

Name matching accepts kebab-case, camelCase and lowercase at the HTML boundary:

```html
<user-card user-name="Ana"></user-card>   <!-- prop userName -->
```

Defaults are applied before `state()` runs, so the initial state never sees `undefined`.

A missing required prop logs a development warning naming the component and the prop.

If the component declares **no** props at all, every non-directive attribute becomes a prop
with its raw string value.

---

## The instance

Inside methods, computed values, watchers and hooks, `this` is a proxy. Reads resolve in
this order:

```
$refs -> special -> computed -> methods -> props -> state
```

Specials:

| Key         | Value |
| ----------- | ----- |
| `$el`       | The host element |
| `$props`    | The reactive props object |
| `$refs`     | Merged refs from the scope chain |
| `$scope`    | The component's `Scope` |
| `$parent`   | The nearest ancestor component instance, or `null` |
| `$name`     | The registered name, or `'inline'` |
| `emit`, `$emit` | Dispatch a bubbling `CustomEvent` on `$el` |
| `$nextTick` | Resolve after the DOM is written |
| `$watch`    | `(expressionString, cb)` |

Writes go to a computed setter if one exists, then to props, then to state.

In the template, the same instance is the scope, so `label`, `toggle()` and `name` are all
directly available without a prefix.

---

## Events

```js
methods: {
  save() {
    this.emit('saved', { id: this.id });
  },
}
```

```html
<user-card @saved="lastSaved = $event"></user-card>
```

`emit` dispatches a bubbling, cancelable `CustomEvent`. For events that came from `emit`,
`$event` in the handler is the **payload**, not the event object. The raw event is in
`$rawEvent`.

**Attributes written on a component tag belong to the outer scope.** That is why
`@saved="lastSaved = $event"` writes to the parent's state and not into the component. The
component's own scope applies to its children.

---

## Slots

```js
V.component('panel', {
  template: `
    <section>
      <header><slot name="title">Untitled</slot></header>
      <div><slot></slot></div>
      <footer><slot name="actions"></slot></footer>
    </section>
  `,
});
```

```html
<panel>
  <h2 slot="title">Reports</h2>
  <p>Body content goes to the default slot.</p>
  <button slot="actions">Export</button>
</panel>
```

The original children are moved into a fragment before the template is applied, then
distributed. Content inside a `<slot>` element is the fallback used when nothing was passed.

**Slot content keeps the parent scope.** An expression written inside a slot reads the
parent's state, not the component's, exactly as in Vue.

---

## Scope isolation

By default a component's scope attaches to the **root** scope, not to the surrounding
`v-data`. That isolation is deliberate.

```html
<div v-data="{ secret: 42 }">
  <my-widget></my-widget>   <!-- cannot see `secret` -->
</div>
```

Opt out when you want the surrounding scope visible:

```js
V.component('my-widget', { inheritScope: true });
```

A `v-data` on the same element as the component merges into the component's initial state.

---

## provide / inject

```js
V.component('data-table', {
  provide() {
    return { columns: this.columns, sort: (key) => this.sortBy(key) };
  },
});

V.component('table-header', {
  inject: ['columns', 'sort'],
  template: `<th v-for="c in columns" @click="sort(c.key)">{ c.label }</th>`,
});
```

With options:

```js
inject: {
  theme: { from: 'appTheme', default: 'light' },
}
```

`provide` can be an object or a function called with the instance as `this`. `inject`
resolves by climbing the scope chain and lands in the initial state, so an injected key is
readable as `this.columns`.

Values are resolved **once**, at mount. Reassigning the provider's value later does not
re-resolve the injection; mutating a provided object does propagate, because the object
itself is reactive.

---

## Lifecycle

```
beforeMount        state, props, computed, methods and watchers are ready;
                   the template has NOT been applied yet
   |
   v
template applied, slots distributed
   |
   v
children walked
   |
   v
--- post-flush, after the DOM is written ---
   |
   v
mounted            the DOM is real and measurable
   |
   v
updated            (only if declared; see the warning)
   |
   v
--- element leaves the DOM ---
   |
   v
beforeUnmount
   |
   v
effect scope stopped, instance removed from V.instances
   |
   v
unmounted
   |
   v
destroyed          (alias; fires in addition to unmounted)
```

### `updated` is expensive

Declaring `updated` installs an effect that **reads every key of the state object**, so it
depends on all of them and fires on any change. That is what "updated" means, and it is also
the opposite of how the rest of the library behaves.

If you only need to react to one field, use a watcher instead:

```js
// fires on any state change
updated() { this.reposition(); }

// fires only when it matters
watch: { items() { this.reposition(); } }
```

### Cleanup

Effects created by the runtime are cleaned up automatically. Anything you allocate is not:

```js
V.component('clock', {
  state: () => ({ now: new Date() }),

  mounted() {
    this._timer = setInterval(() => { this.now = new Date(); }, 1000);
    this._onResize = () => this.recalc();
    window.addEventListener('resize', this._onResize);
  },

  beforeUnmount() {
    clearInterval(this._timer);
    window.removeEventListener('resize', this._onResize);
  },
});
```

---

## Styles

```js
V.component('badge', {
  style: `
    .badge { background: var(--v-primary); color: var(--v-primary-contrast); }
  `,
});
```

Injected once per component name as `<style data-voodoo-component="badge">`. Respects
`V.config.injectStyles`. Not scoped: use a class prefix matching the component name.

Use the `--v-*` design tokens so the component follows the user's theme and dark mode.

---

## Application mode

```js
const app = V.createApp({
  state: () => ({ n: 0 }),
  computed: { double() { return this.n * 2; } },
  methods: { add() { this.n++; } },
  template: `<button @click="add()">Clicks: { n }</button> <p>{ double }</p>`,
  components: {
    'user-card': { /* ... */ },
  },
});

app.mount('#app');
```

The root options are registered as a component under a generated name, the container gets a
`v-component` attribute, and the walker does the rest.

| Method                      | Returns | Notes |
| --------------------------- | ------- | ----- |
| `mount(target)`             | instance or `null` | Target may not exist yet; mounting waits for it. |
| `unmount()`                 | `void`  | Restores the container's original HTML. |
| `whenMounted()`             | `Promise<instance>` | |
| `component(name)`           | definition | |
| `component(name, def)`      | `app`   | Chainable. |
| `directive(name, def)`      | `app`   | Chainable. Registers globally. |
| `use(plugin, options?)`     | `app`   | Chainable. **Installs into the global `V`.** |
| `provide(key, value)`       | `app`   | Chainable. |
| `app.config.globalProperties` | object | Merged into the expression allowlist at mount. |
| `app.instance`, `app.container`, `app.isMounted`, `app.name` | | Read-only. |

Components listed under `components` are registered globally at mount if the name is free,
and removed again on `unmount()`. There is no per-application component registry.

---

## Inspecting

```js
V.instances;             // Set of mounted instances
V.getScope(element);     // Scope owned by an element, if any
V.findScope(element);    // Effective scope, climbing ancestors
```

The full build also ships `V.xray`, a reactivity inspector overlay.

---

## Next

- [State](state.md)
- [Directives](directives.md)
- [Plugins](plugins.md)
- [application-structure](../application-structure.md) (Portuguese) - organizing a larger app
