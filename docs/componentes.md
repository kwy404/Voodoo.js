# Components

A Voodoo component is a scope with state, methods, computed, watchers, props, slots, and
lifecycle, mounted on an element that already exists. There's no compilation step, no
`.vue` file, and no JSX.

## Registering

```js
V.component('counter', {
  props: { start: { type: 'number', default: 0 } },
  state(props) {
    return { value: props.start };
  },
  computed: {
    double() { return this.value * 2; },
  },
  methods: {
    add() { this.value++; },
    reset() { this.value = 0; this.emit('reset'); },
  },
  watch: {
    value(newVal, oldVal) { console.log(oldVal, '->', newVal); },
  },
  template: `
    <button v-click="add">+1</button>
    <strong>{ value }</strong>
    <small>double: { double }</small>
  `,
  style: `strong { font-size: 1.4rem; }`,
  mounted() { console.log('mounted on', this.$el); },
});
```

## Three ways to use

```html
<!-- 1. attribute -->
<div v-component="counter" start="10"></div>

<!-- 2. own tag -->
<counter start="10"></counter>

<!-- 3. PascalCase tag -->
<Counter start="10"></Counter>
```

The name is normalized: `UserCard`, `userCard`, and `user-card` point to the same component. The
PascalCase form works because HTML delivers the tag in lowercase (`usercard`) and the library
keeps a map of hyphen-free names.

Choose a hyphen name when registering: that's what the custom elements standard expects and
what avoids collision with native tags.

## Props

Two ways to write. The short one, with a list of names:

```js
V.component('greeting', {
  props: ['name', 'age'],
  template: '<p>{ name } is { age } years old</p>',
});
```

And the complete one, with type, default value, and required flag:

```js
V.component('card', {
  props: {
    title: { type: 'string', default: 'Untitled' },
    total: { type: 'number', default: 0 },
    active: { type: 'boolean', default: false },
    tags: { type: 'array', default: [] },
    user: { type: 'object' },
    any: { type: 'any' },
    id: { type: 'string', required: true },
  },
});
```

Accepted types: `string`, `number`, `boolean`, `array`, `object`, `any`. A required prop that
doesn't arrive generates a console warning.

### Static and reactive

```html
<!-- fixed value, converted to the declared type -->
<card title="Revenue" total="1200" active></card>

<!-- tied to parent state, updates by itself -->
<card :title="panel.name" :total="panel.revenue" :active="panel.enabled"></card>
```

Boolean props accept empty attribute (`active`), text (`active="true"`), and reactive binding
(`:active="enabled"`).

Names are resolved flexibly: `user-name`, `username`, and `userName` all arrive as
`userName`.

When the component **doesn't declare any props**, all common attributes become props with
camelCase names. When it does, unknown attributes are ignored.

## State

`state(props)` returns the initial object. It receives props already resolved:

```js
V.component('editor', {
  props: { text: { type: 'string', default: '' } },
  state(props) {
    return { draft: props.text, saving: false };
  },
});
```

`data(props)` is an alias, for those coming from Vue.

`v-data` on the same element complements the state:

```html
<div v-component="editor" v-data="{ advancedMode: true }"></div>
```

## Methods

Inside methods, `this` is the instance. State, props, computed, and other methods are read
and written directly:

```js
methods: {
  async save() {
    this.saving = true;
    try {
      const data = await V.http.post('/api/texts', { text: this.draft });
      this.emit('saved', data);
      V.toast.success('Saved!');
    } finally {
      this.saving = false;
    }
  },
}
```

Functions loose in the definition also become methods, which shortens small components:

```js
V.component('clock', {
  state: () => ({ now: new Date() }),
  format() { return this.now.toLocaleTimeString(); },
  template: '<time>{ format() }</time>',
});
```

## Computed

```js
computed: {
  full() { return `${this.first} ${this.last}`; },
  hasError() { return Object.keys(this.errors).length > 0; },
}
```

Computed have cache and only recalculate when a dependency changes.

## Watchers

```js
watch: {
  search(newVal, oldVal) {
    if (newVal.length >= 3) this.search(newVal);
  },
}
```

## Template and slots

The `template` replaces the element's content. To receive the original content, use `<slot>`:

```js
V.component('panel', {
  props: { title: { type: 'string', default: '' } },
  template: `
    <section class="panel">
      <header>
        <slot name="header"><h3>{ title }</h3></slot>
      </header>
      <div class="body"><slot></slot></div>
      <footer><slot name="footer"></slot></footer>
    </section>
  `,
});
```

```html
<panel title="Report">
  <h3 slot="header">Custom header</h3>
  <p>This paragraph goes in the default slot.</p>
  <button slot="footer">Close</button>
</panel>
```

Slot rules:

- the unnamed slot receives all content that wasn't addressed;
- content written inside `<slot>` is the default, used when nobody fills it;
- **slot content is evaluated in the parent's scope**, like in Vue. It doesn't see the
  component's internal state.

A component without `template` keeps its own HTML and just wraps everything in a scope:

```html
<div v-component="filter">
  <input v-model="term">
  <p>{ results.length } results for "{ term }"</p>
</div>
```

## Style

`style` injects CSS once, the first time the component is used:

```js
V.component('alert', {
  style: `.alert { padding: 12px; border-radius: 8px; background: var(--v-surface-2); }`,
  template: '<div class="alert"><slot></slot></div>',
});
```

CSS is **not** scope-isolated. Use unique class names or the component prefix.

## Events with emit

```js
methods: {
  confirm() { this.emit('confirmed', { id: this.id }); },
}
```

```html
<dialog @confirmed="register($detail)"></dialog>
<dialog v-on:confirmed="onConfirm"></dialog>
```

The event is a `CustomEvent` that bubbles up the tree. The `detail` arrives as `$detail` in the
expression and as the first argument when you pass just a function name.

`$emit` is an alias for `emit`.

## Lifecycle

| Hook | When it runs |
| --- | --- |
| `beforeMount` | Before the template replaces the content |
| `mounted` | After the round's DOM has been applied |
| `updated` | After any state change, when the hook is declared |
| `beforeUnmount` | Before the element leaves the DOM |
| `unmounted` | After removal |
| `destroyed` | Alias for `unmounted` |

```js
V.component('clock', {
  state: () => ({ now: new Date() }),
  mounted() {
    this.timer = setInterval(() => { this.now = new Date(); }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  template: '<time>{ now.toLocaleTimeString() }</time>',
});
```

## Instance properties

| Property | What is it |
| --- | --- |
| `this.$el` | Host element |
| `this.$props` | Reactive object with props |
| `this.$refs` | Elements marked with `v-ref` inside the component |
| `this.$scope` | Component scope |
| `this.$parent` | Parent component instance, or `null` |
| `this.$name` | Normalized name |
| `this.emit(name, detail)` | Fires an event |
| `this.$watch(expr, callback)` | Watches a scope expression |
| `this.$nextTick()` | Waits for DOM to reflect |

Inside the component's HTML, `$self` points to the instance.

## Scope isolation

By default the component **doesn't** see the `v-data` that wraps it. It talks to the root
scope and its own props. This prevents a component from accidentally depending on where it was pasted.

To inherit the parent's scope:

```js
V.component('table-row', {
  inheritScope: true,
  template: '<td>{ item.name }</td>',
});
```

## Communication between components

**Parent to child:** props.

**Child to parent:** `emit`.

**Between distant siblings:** a global store or the event bus.

```js
V.store('cart', { items: [] });
```

```js
V.on('product:added', (product) => console.log(product));
V.emit('product:added', { id: 7 });
```

## Inspecting

`V.components` is the `Map` with all registered definitions. `V.instances` is the `Set` with
mounted instances, useful for debugging and devtools.

```js
V.components.has('counter');  // true
V.instances.size;             // how many are mounted now
```

---

Previous: [Directives](directives.md) · Next: [Ready-made components](componentes-prontos.md)
