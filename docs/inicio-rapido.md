# Quick Start

From blank file to an app with state, list, form, and request. Each step is a file that opens
directly in the browser, no server and no build.

## Step 1: the skeleton

Create `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My first Voodoo</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.13.0/dist/voodoo.full.min.js" defer></script>
  <style>[v-cloak] { display: none !important; }</style>
</head>
<body>
  <h1>Hello</h1>
</body>
</html>
```

Open the file. Nothing happens yet, and that's by design. The library has started and is waiting
for the first attribute.

## Step 2: state and interpolation

`v-data` creates a scope with reactive state. Inside it, `{ expression }` writes values to text.

```html
<div v-data="{ name: 'world' }">
  <h1>Hello, { name }!</h1>
  <input v-model="name">
</div>
```

Type in the field. The title changes with every keystroke, without a line of JavaScript.

The `{{ name }}` form with double braces also works. Single braces are Voodoo's standard.

## Step 3: events

`v-click` ties click to an expression. `@click` is the same shortcut, for those who prefer.

```html
<div v-data="{ counter: 0 }">
  <button v-click="counter--">less</button>
  <strong>{ counter }</strong>
  <button v-click="counter++">more</button>

  <p v-show="counter > 5">Already over five.</p>
</div>
```

`v-show` toggles `display`. The element stays in the document.

## Step 4: condition and list

`v-if` inserts and removes from DOM. `v-for` repeats an element per item.

```html
<div v-data="{ tasks: ['Study', 'Run'], newTask: '' }">
  <form @submit.prevent="tasks.push(newTask); newTask = ''">
    <input v-model="newTask" placeholder="New task">
    <button>Add</button>
  </form>

  <p v-if="tasks.length === 0">No tasks here.</p>
  <ul v-else>
    <li v-for="(task, i) in tasks">
      { i + 1 }. { task }
      <button v-click="tasks.splice(i, 1)">remove</button>
    </li>
  </ul>

  <small>{ tasks.length } task(s)</small>
</div>
```

Notice three things:

- `@submit.prevent` already calls `preventDefault()` for you;
- `v-else` must be the immediate sibling of `v-if`;
- the expression accepts multiple statements separated by semicolons.

## Step 5: attributes, classes, and styles

Prefix any attribute with a colon to tie it to state.

```html
<div v-data="{ active: false, color: '#6D3BF5', loading: false }">
  <button
    :class="{ active: active, 'waiting': loading }"
    :style="{ borderColor: color }"
    :disabled="loading"
    v-click="active = !active"
  >
    { active ? 'On' : 'Off' }
  </button>
</div>
```

Classes already in the `class` attribute are preserved. `:class` only adds and removes the ones
you declared.

## Step 6: fetch data from server

`v-resource` creates a reactive object with `data`, `loading`, `error`, `loaded`, `reload()`, and
`set()`.

```html
<div v-resource="users: https://jsonplaceholder.typicode.com/users">
  <p v-if="users.loading">Loading...</p>
  <p v-else-if="users.error">{ users.error.message }</p>
  <ul v-else>
    <li v-for="u in users.data">{ u.name } ({ u.email })</li>
  </ul>

  <button v-click="users.reload()">Refresh</button>
</div>
```

If you just want to throw HTML into a target, `v-get` does it:

```html
<button v-get="/partials/table.html" v-target="#area">Load table</button>
<div id="area"></div>
```

## Step 7: a complete form

```html
<form v-submit="/api/contact" v-validate
      v-toast-success="Message sent!" v-reset-success v-disable-loading>
  <label>
    Name
    <input name="name" v-required v-minlength="3">
  </label>

  <label>
    Email
    <input name="email" type="email" v-required v-email>
  </label>

  <label>
    Phone
    <input name="phone" v-mask="phone" v-phone>
  </label>

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Sending...' : 'Send' }
  </button>
</form>
```

What happens automatically:

- fields are validated on blur and the message appears below each one;
- phone gets a mask as you type;
- submission becomes an AJAX request with serialized body;
- `$form.loading` is true during submission;
- 422 errors from server go back to the right fields;
- a success notification appears and the form is cleared.

## Step 8: components

Components are better in a script block, because they involve real logic.

```html
<script>
  V.component('counter', {
    props: { start: { type: 'number', default: 0 } },
    state(props) {
      return { value: props.start };
    },
    computed: {
      double() { return this.value * 2; },
    },
    methods: {
      add() { this.value++; this.emit('changed', this.value); },
    },
    template: `
      <button v-click="add">Add</button>
      <span>{ value } (double: { double })</span>
    `,
  });
</script>

<counter start="10" @changed="console.log($detail)"></counter>
<Counter start="3"></Counter>
```

Both forms work: `<counter>` and `<Counter>`.

## Step 9: notifications and dialogs

```html
<button v-click="$toast.success('Saved successfully!')">Save</button>

<button v-click="$confirm('Delete the order?').then(ok => ok && $toast.error('Deleted'))">
  Delete
</button>
```

Or declaratively, with the confirmation guard:

```html
<button v-confirm="Delete the order?" v-click="deleteOrder(7)">Delete</button>
```

## The complete app

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Task list</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.13.0/dist/voodoo.full.min.js" defer></script>
  <style>
    [v-cloak] { display: none !important; }
    body { font-family: system-ui, sans-serif; max-width: 34rem; margin: 3rem auto; }
    .done { text-decoration: line-through; opacity: .55; }
  </style>
</head>
<body>
  <div v-cloak v-data="{ items: [], text: '' }" v-persist="tasks">
    <h1>Tasks</h1>

    <form @submit.prevent="items.push({ id: Date.now(), text: text, done: false }); text = ''">
      <input v-model.trim="text" placeholder="What needs to be done?" required>
      <button>Add</button>
    </form>

    <ul>
      <li v-for="item in items" :key="item.id" :class="{ done: item.done }">
        <input type="checkbox" v-model="item.done">
        { item.text }
        <button v-click="items.splice(items.indexOf(item), 1)">x</button>
      </li>
    </ul>

    <p v-show="items.length">
      { items.filter(i => !i.done).length } of { items.length } pending
    </p>
  </div>
</body>
</html>
```

`v-persist="tasks"` stores state in `localStorage`. Reload the page: the list is still there.

## Where to go from here

- [Directives](directives.md) for the complete reference of attributes.
- [Reactivity](reatividade.md) to understand what happens underneath.
- [Forms](formularios.md) and [Validation](validacao.md) for real work with data.
- [Components](componentes.md) when an HTML block starts to repeat.

---

Previous: [Installation](instalacao.md) · Next: [Reactivity](reatividade.md)
