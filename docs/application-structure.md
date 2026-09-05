# Application structure

> **Nothing on this page is required.**
>
> An `index.html` with a `<script>` tag continues to be a complete and
> legitimate Voodoo.js application. This page describes an optional convention, for when the project grew
> to the point where one file became inconvenient. If your project still fits in one file,
> stop reading here and go back to coding.

## What this page solves

There's a moment, that comes in some projects and never in others, when you open
`index.html`, scroll through three hundred lines of `<script>` and can't find the function you wanted
to change. It's the moment when splitting files starts saving time instead of costing it.

What follows is a way to split that works well with Voodoo.js, tested against how
the library actually loads things. It's not an architecture, it's a predictable place to store each type of thing.

## The same app, two ways

A small app: a to-do list with counter, saved in the browser.

### Way 1: one file

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tasks</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.13.0/dist/voodoo.full.min.js" defer></script>
</head>
<body>
  <main v-data="{ new: '', tasks: [] }" v-persist="tasks">
    <form @submit.prevent="tasks.push({ id: Date.now(), text: new, done: false }); new = ''">
      <input v-model="new" placeholder="What needs to be done?" required>
      <button>Add</button>
    </form>

    <ul>
      <li v-for="task in tasks" :key="task.id">
        <input type="checkbox" v-model="task.done">
        <span :class="{ done: task.done }">{ task.text }</span>
        <button @click="tasks = tasks.filter(t => t.id !== task.id)">Remove</button>
      </li>
    </ul>

    <p>{ tasks.filter(t => !t.done).length } of { tasks.length } pending</p>
  </main>
</body>
</html>
```

This is an entire application. It works, it's reactive, it persists between reloads, it doesn't
need a build, a dev server or `npm install`. **If your project is like this, it's ready.**

### Way 2: structured

The same behavior, when the to-do list became part of a larger system.

```
projeto/
├── index.html
└── src/
    ├── app.js
    ├── components/
    │   └── lista-tarefas.js
    └── stores/
        └── tarefas.js
```

```html
<!-- index.html -->
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Tarefas</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.13.0/dist/voodoo.full.min.js" defer></script>
  <script type="module" src="/src/app.js"></script>
</head>
<body>
  <lista-tarefas></lista-tarefas>
</body>
</html>
```

```js
// src/stores/tarefas.js
export function registrar() {
  V.store('tarefas', {
    itens: [],

    adicionar(texto) {
      this.itens.push({ id: Date.now(), texto, feita: false });
    },

    remover(id) {
      this.itens = this.itens.filter((t) => t.id !== id);
    },

    pendentes() {
      return this.itens.filter((t) => !t.feita).length;
    },
  }, { persist: true });
}
```

```js
// src/components/lista-tarefas.js
export function registrar() {
  V.component('lista-tarefas', {
    state: () => ({ nova: '' }),

    methods: {
      enviar() {
        if (!this.nova.trim()) return;
        V.stores.tarefas.adicionar(this.nova);
        this.nova = '';
      },
    },

    template: `
      <form @submit.prevent="enviar()">
        <input v-model="nova" placeholder="O que precisa ser feito?">
        <button>Adicionar</button>
      </form>

      <ul>
        <li v-for="tarefa in $store.tarefas.itens" :key="tarefa.id">
          <input type="checkbox" v-model="tarefa.feita">
          <span :class="{ feita: tarefa.feita }">{ tarefa.texto }</span>
          <button @click="$store.tarefas.remover(tarefa.id)">Remover</button>
        </li>
      </ul>

      <p>{ $store.tarefas.pendentes() } de { $store.tarefas.itens.length } pendentes</p>
    `,
  });
}
```

```js
// src/app.js
import { registrar as registrarTarefasStore } from './stores/tarefas.js';
import { registrar as registrarListaTarefas } from './components/lista-tarefas.js';

registrarTarefasStore();
registrarListaTarefas();
```

Compare the two. The behavior is identical. The second has more files and more ceremony,
and gains something in return: the task logic lives in one place, the component can
appear on multiple pages, and anyone who arrives at the project knows where to look.

**The trade-off only makes sense when the project really grew.** Doing this in a thirty-line
app is bureaucracy.

## The folders

```
src/
├── app.js          entry point: imports and registers everything
├── components/     reusable components
├── pages/          screens, when the app has a router
├── stores/         global state
├── services/       talk to the outside world
├── plugins/        extensions to Voodoo itself
└── routes/         route map
```

None of these folders are automatically searched by Voodoo.js. There's no
magic convention, no autoload. The names work because they're predictable, and nothing more. Create
only the folders you need.

### `src/app.js`

The only file the page loads directly. It imports and registers everything else.

```js
import { registerComponents } from './components/index.js';
import { registerStores } from './stores/index.js';
import { installPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';

V.config.baseURL = '/api';
V.config.locale = 'en';

installPlugins();
registerStores();
registerComponents();
registerRoutes();
```

Two important things about order.

**Configuration comes before everything.** `V.config.prefix` and `V.config.autoDiscover` need
to be set before Voodoo walks the page. To guarantee this, use `data-manual`
on the script tag and call `V.start()` yourself:

```html
<script src="voodoo.full.min.js" data-manual defer></script>
<script type="module" src="/src/app.js"></script>
```

```js
// at the end of src/app.js
V.start();
```

**Registering a component after the page loads works.** Voodoo.js mounts the tags that
were already waiting for the name you just registered. This is intentional and is
implemented in `defineComponent`, exactly because the CDN script with `defer` runs before
your application script. You don't need to worry about the race.

### `src/components/`

Um arquivo por componente. Nome do arquivo igual ao nome registrado, em kebab-case.

```
components/
├── index.js
├── cartao-produto.js
├── barra-busca.js
└── tabela-pedidos.js
```

```js
// components/cartao-produto.js
export function registrar() {
  V.component('cartao-produto', {
    props: {
      produto: { type: 'object' },
      destaque: { type: 'boolean', default: false },
    },

    computed: {
      precoFormatado() {
        return V.formatCurrency(this.produto.preco);
      },
    },

    methods: {
      adicionar() {
        V.stores.carrinho.adicionar(this.produto);
        this.emit('adicionado', this.produto);
      },
    },

    template: `
      <article :class="{ destaque: destaque }">
        <h3>{ produto.nome }</h3>
        <p>{ precoFormatado }</p>
        <button @click="adicionar()">Adicionar</button>
      </article>
    `,
  });
}
```

```js
// components/index.js
import { registrar as cartaoProduto } from './cartao-produto.js';
import { registrar as barraBusca } from './barra-busca.js';
import { registrar as tabelaPedidos } from './tabela-pedidos.js';

export function registrarComponentes() {
  cartaoProduto();
  barraBusca();
  tabelaPedidos();
}
```

The `index.js` exists so `app.js` doesn't become a list of twenty imports. When there are
three components, import directly and skip `index.js`.

**When the template gets large**, take it out of JavaScript and put it in a `<template>` in
HTML:

```html
<template id="tpl-product-card">
  <article :class="{ highlight: highlight }">
    <h3>{ product.name }</h3>
    <p>{ priceFormatted }</p>
    <button @click="add()">Add</button>
  </article>
</template>
```

```js
V.component('product-card', {
  template: document.getElementById('tpl-product-card').innerHTML,
  // ...
});
```

You get editor syntax highlighting and HTML looks like HTML again.

### `src/stores/`

State that more than one component needs to see. State that only one component uses stays in
its `state()`.

```js
// stores/cart.js
export function register() {
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
      return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    },

    total() {
      return this.coupon ? this.subtotal() * (1 - this.coupon.discount) : this.subtotal();
    },
  }, { persist: true });
}
```

A store is visible in any page expression as `$store.cart`, and in
JavaScript as `V.stores.cart`. Methods declared in the definition receive `this`
pointing to the store itself, so `this.items` works.

`{ persist: true }` saves to `localStorage` and restores on the next load. Functions are not
saved, only data.

Practical rule to decide where state lives:

| Who needs to see | Where it lives                 |
| ---------------- | ------------------------------ |
| One element      | `v-data` on the element itself |
| One component    | `state()` of the component     |
| The whole page   | `V.data()`                     |
| The application  | `V.store()`                    |

### `src/services/`

Everything that talks to the outside world: API, WebSocket, third-party library integration.
A service is a plain module, with nothing Voodoo inside except the HTTP client.

```js
// services/products.js
export const products = {
  list(filters = {}) {
    return V.http.get('/products', { params: filters });
  },

  fetch(id) {
    return V.http.get(`/products/${id}`);
  },

  create(data) {
    return V.http.post('/products', data);
  },
};
```

```js
// components/product-list.js
import { products } from '../services/products.js';

V.component('product-list', {
  state: () => ({ items: [], loading: false, error: null }),

  methods: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        this.items = await products.list();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
  },

  mounted() {
    this.load();
  },
});
```

The gain is that the API URL appears in one place. When the backend changes the path, you
change one line.

Authentication and global error handling work well as interceptors, and they belong
here:

```js
// services/http.js
export function configure() {
  V.http.setBaseURL('/api');

  V.http.interceptors.request.use((config) => {
    const token = V.storage.get('token');
    if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return config;
  });

  V.http.interceptors.error.use((error) => {
    if (error.status === 401) V.navigate('/login');
    else V.toast.error('Could not complete the operation.');
  });
}
```

### `src/plugins/`

Extensions to Voodoo itself: directives, magics, validators, masks. The complete
specification is in [plugin-spec.md](plugin-spec.md).

```js
// plugins/analytics.js
export const analytics = {
  name: 'analytics',

  install(V, options) {
    function track(event, data) {
      navigator.sendBeacon(options.url, JSON.stringify({ event, data }));
    }

    V.analytics = { track };
    V.magic('$analytics', () => V.analytics);

    V.directive('analytics-track', (el, binding) => {
      el.addEventListener('click', () => track(binding.value));
    });
  },
};
```

```js
// plugins/index.js
import { analytics } from './analytics.js';

export function installPlugins() {
  V.use(analytics, { url: '/events' });
}
```

Plugins are installed **before** components, because a component can use a
directive that the plugin registered.

### `src/routes/` and `src/pages/`

Only make sense when the app is a true SPA, with the router from the complete build.

```
routes/
└── index.js
pages/
├── home.js
├── products.js
├── product-detail.js
└── not-found.js
```

```js
// pages/products.js
import { products } from '../services/products.js';

export function register() {
  V.component('page-products', {
    state: () => ({ items: [], loading: true }),

    async mounted() {
      this.items = await products.list();
      this.loading = false;
    },

    template: `
      <h1>Products</h1>
      <p v-show="loading">Loading...</p>
      <div v-for="p in items" :key="p.id">
        <product-card :product="p"></product-card>
      </div>
    `,
  });
}
```

```js
// routes/index.js
export function registerRoutes() {
  V.router({
    routes: {
      '/': { component: 'page-home', title: 'Home' },
      '/products': { component: 'page-products', title: 'Products' },
      '/products/:id': { component: 'page-product-detail' },
      '*': { component: 'page-not-found' },
    },
  });
}
```

```html
<nav>
  <a v-link="/">Home</a>
  <a v-link="/products">Products</a>
</nav>
<main v-router-view></main>
```

A page is a common component. The only difference is who decides when to mount: the
router, not the tag in HTML. That's why `pages/` and `components/` are separate folders: not
because they're different things, but because they're used in different ways.

## Patterns that pay off

### One component, one file

Don't put three components in one file because they're small. They grow, and splitting
later takes more work than splitting now.

### Filename equals registered name

`components/product-card.js` registers `product-card`. No exceptions. This keeps
the editor's `Ctrl+P` useful.

### Export a `register` function, don't execute on import

```js
// This way: whoever imports decides the order.
export function register() {
  V.component('product-card', { /* ... */ });
}

// Not this way: registration happens at import time, and order
// becomes a consequence of the module graph instead of your decision.
V.component('product-card', { /* ... */ });
```

It matters when a component depends on a store, or a directive from a plugin.

### Services don't know components

A service returns data. It doesn't know who'll use it, doesn't touch the DOM and doesn't call
`V.toast`. This keeps the service testable and reusable.

### Global state only when it's truly global

Store is convenient and that's why it's easy to abuse. A store that only one component uses is
local state with extra steps and an encapsulation leak as a bonus.

### Template lives close to the component

Either as a string in the definition, or in a `<template>` in HTML with an id that matches the
component's name. Don't spread template pieces all over the place.

## Bureaucracy that's not worth it

Things that look like organization but are just overhead:

- **One folder per component**, with `index.js`, `template.html` and `style.css` for a
  thirty-line component.
- **An abstraction layer over `V.http`** that just passes calls through.
- **Barrel files in every folder.** `index.js` exists to shorten `app.js`. If the folder
  has two files, it just gets in the way.
- **Separating into `models/`, `controllers/` and `views/`.** Voodoo.js is not MVC and forcing that
  division creates files that exist only to fill the folder.
- **One constant for each string.** `'/products'` appearing twice is not duplication
  that needs a constants file.
- **Structure before you need it.** Start with one file. Split when it hurts.

## Serving the files

ES modules need to be served over HTTP; opening `index.html` with a double-click doesn't
work because of CORS. The repository brings a simple server:

```bash
npm run serve
```

Any static server works. There's no build step:

```bash
npx serve .
python -m http.server 8000
php -S localhost:8000
```

If you already use a bundler, import from npm instead of CDN:

```bash
npm install voodoojs
```

```js
import V from 'voodoojs';

V.component('product-card', { /* ... */ });
V.start();
```

Importing `voodoojs` doesn't touch the DOM by itself. What initializes it is the browser build or an
explicit call to `V.start()`.

## Checklist to migrate from one file to many

If you decided it's time, the order that requires the least work:

1. Create `src/app.js` and move the entire `<script>` there. Replace with
   `<script type="module" src="/src/app.js"></script>`. Confirm nothing broke.
2. Extract the stores. They depend on the least other things.
3. Extract the services, along with the scattered HTTP calls.
4. Extract the components, one at a time, testing between each one.
5. Only then create `plugins/`, `routes/` and `pages/`, and only if the app needs them.

Stop at any level that's already good. The complete structure is not the goal, it's the ceiling.

## Read also

- [Components](componentes.md)
- [State and stores](estado-e-stores.md)
- [Router](roteador.md)
- [Plugins](plugins.md) and [Plugin specification](plugin-spec.md)
- [Performance](performance.md)
