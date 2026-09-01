# Plugins

Everything Voodoo.js does internally is available to you: register directives, create
magic variables, add components, extend the `V` object, and package it all into a plugin.

## V.use

```js
const myPlugin = {
  name: 'analytics',
  install(V, options) {
    V.track = (event, data) => send(options.key, event, data);

    V.directive('track', (el, binding) => {
      el.addEventListener('click', () => V.track(binding.value));
    });

    V.magic('$track', () => V.track);
  },
};

V.use(myPlugin, { key: 'abc123' });
```

The short function form also works:

```js
V.use((V, options) => {
  V.config.globals.APP = options;
}, { version: '2.0' });
```

Installing the same plugin twice is ignored the second time.

## Custom directives

### Full lifecycle form

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
<div v-highlight="'yellow'">Highlight</div>
<div v-highlight="statusColor">Reactive</div>
```

The `binding` brings:

| Field | What it is |
| --- | --- |
| `el` | The element |
| `value` | The already-evaluated value |
| `oldValue` | The previous value, in `updated` |
| `arg` | The argument after the colon |
| `modifiers` | The modifiers after the dots |
| `expression` | The original text |
| `scope` | The active scope |
| `instance` | The nearest component instance, or `null` |

`priority` defines the order: higher runs first. `raw: true` delivers the expression as text, without
evaluation, which is useful for directives that receive selectors or names.

### Short form

Works for `mounted` and `updated` at the same time:

```js
V.directive('size', (el, binding) => {
  el.style.fontSize = `${binding.value}px`;
});
```

```html
<p v-size="18">Large text</p>
```

### Real example: a date picker

```js
V.directive('datepicker', {
  mounted(el, binding) {
    const picker = new SomeDateLibrary(el, {
      format: binding.arg || 'dd/mm/yyyy',
      initial: binding.value,
      onChange: (value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
    });
    el.__picker = picker;
  },
  updated(el, binding) {
    el.__picker.setValue(binding.value);
  },
  unmounted(el) {
    el.__picker.destroy();
  },
});
```

```html
<input v-datepicker:dd-mm-yyyy="form.birthDate" v-model="form.birthDate">
```

Notice the `dispatchEvent`: that's how an external integration tells `v-model`.

## Internal directives, with fine control

For cases that need their own effects, explicit cleanup, or subtree control, use
`defineDirective`:

```js
import { defineDirective, PRIORITY } from 'voodoojs';

defineDirective(
  'countdown',
  ({ el, evaluate, effect, cleanup }) => {
    let timer = null;

    effect(() => {
      const target = new Date(evaluate());
      clearInterval(timer);
      timer = setInterval(() => {
        const remaining = Math.max(0, target - Date.now());
        el.textContent = `${Math.floor(remaining / 1000)}s`;
        if (remaining === 0) clearInterval(timer);
      }, 1000);
    });

    cleanup(() => clearInterval(timer));
  },
  { priority: PRIORITY.DEFAULT }
);
```

The provided context:

| Field | What it is |
| --- | --- |
| `el` | The element that declared the attribute |
| `scope` | The active scope |
| `expression` | The attribute text |
| `arg` | The argument after the colon |
| `modifiers` | The modifiers |
| `raw` | The full attribute name, useful in error messages |
| `evaluate(expr?)` | Evaluates the expression. Never throws |
| `effect(fn)` | Creates a reactive effect already tied to element cleanup |
| `cleanup(fn)` | Runs when the element leaves the DOM |
| `walk(node, scope)` | Initializes HTML created by the directive |

Registration options:

| Option | What it does |
| --- | --- |
| `priority` | Execution order. Higher runs first |
| `terminal` | Prevents the walker from descending into children, like `v-for` and `v-if` |

Priorities available in `V.PRIORITY`: `IGNORE` (100), `FOR` (90), `IF` (80), `DATA` (70),
`COMPONENT` (65), `REF` (60), `MODEL` (40), `BIND` (30), `DEFAULT` (0), `INIT` (-10),
`TRANSITION` (-20).

The registered name does not include the prefix: `defineDirective('toggle', ...)` responds to `v-toggle`.

### Already-occupied names

Do not register these names: `text`, `html`, `show`, `if`, `else`, `else-if`, `for`, `model`, `bind`,
`class`, `style`, `on`, `click`, `dblclick`, `input`, `change`, `keyup`, `keydown`, `keypress`,
`mouseenter`, `mouseleave`, `mouseover`, `mousedown`, `mouseup`, `contextmenu`, `wheel`, `paste`,
`dragstart`, `dragover`, `dragleave`, `drop`, `init`, `ref`, `effect`, `watch`, `cloak`, `once`,
`teleport`, `transition`, `duration`, `key`, `slot`, `ignore`, `pre`, `data`, `component`, plus
all names used by HTTP, forms, validation, masks, UI, state, animation, charts, router, and i18n modules.

`V.directives` is the `Map` with everything that's already registered, if you want to check first.

## Custom magic variables

```js
V.magic('$user', () => loggedInUser);
V.magic('$format', () => (value) => V.formatCurrency(value));
V.magic('$height', (scope) => scope.el.offsetHeight);
```

```html
<span>{ $user.name }</span>
<span>{ $format(order.total) }</span>
```

The getter receives the active scope, so the magic can depend on where it was used. The dollar sign is
added automatically when you don't write it.

Magics are read-only, except for those that expose their own `set` method.

## Components in a plugin

```js
const formKit = {
  name: 'form-kit',
  install(V) {
    V.component('cpf-field', {
      props: { label: { type: 'string', default: 'CPF' }, name: { type: 'string', default: 'cpf' } },
      template: `
        <label>
          <span>{ label }</span>
          <input :name="name" v-mask="cpf" v-cpf v-required>
        </label>
      `,
    });
  },
};

V.use(formKit);
```

## Validation rules and masks

```js
const brazilPlus = {
  install(V) {
    V.validator('voter-id', (value) => V.unmask(value).length === 12, 'Invalid ID.');
    V.registerMask('voter', '9999 9999 9999');
  },
};

V.use(brazilPlus);
```

## Extending the V object

Inside `install` you receive `V` itself and can add whatever you want:

```js
V.use((V) => {
  V.api = {
    users: () => V.http.get('/api/users'),
    save: (u) => V.http.post('/api/users', u),
  };
});
```

```html
<button v-click="$http.get('/api/x')">Direct</button>
```

To call `V.api` within HTML, expose it as global:

```js
V.config.globals.api = V.api;
```

```html
<button v-click="api.save(form)">Save</button>
```

## HTTP interceptors in a plugin

```js
V.use((V, { token }) => {
  V.http.setToken(token);
  V.http.interceptors.error.use((error) => {
    if (error.status === 401) V.navigate('/login');
    if (error.status >= 500) V.toast.error('Server error, try again.');
  });
}, { token: localStorage.getItem('jwt') });
```

## Publishing a plugin

A plugin is a regular module:

```js
// voodoo-plugin-x/index.js
export default {
  name: 'x',
  install(V, options = {}) { /* ... */ },
};
```

```js
import V from 'voodoojs';
import pluginX from 'voodoo-plugin-x';

V.use(pluginX, { key: 'abc' });
V.start();
```

For CDN usage, publish an IIFE that registers itself:

```js
(function () {
  if (!window.V) return console.warn('Voodoo.js not found.');
  window.V.use({ name: 'x', install(V) { /* ... */ } });
})();
```

```html
<script src="voodoo.min.js" defer></script>
<script src="voodoo-plugin-x.js" defer></script>
```

Recommendations for publishers:

- prefix directives with something of yours, like `v-x-table`, to avoid collision;
- don't inject CSS unnecessarily, and use `V.injectStyle('unique-id', css)` when you do;
- use `--v-*` variables instead of fixed colors, to follow theme and palette;
- always register cleanup in `cleanup` or `unmounted`.

---

Previous: [Devtools](devtools.md) · Next: [Utilities](utilitarios.md)
