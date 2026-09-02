# Router

> This module only comes in `voodoo.full.min.js` or in a custom build.

Single-page application router with no external dependencies. Two modes: `history`, which uses
the History API and clean URLs, and `hash`, which stores the route after `#` and works even
opening the file directly from disk.

## Configuring

```js
V.router({
  mode: 'history',
  base: '/',
  routes: {
    '/': { component: 'home', title: 'Início' },
    '/usuarios': { component: 'usuarios', title: 'Usuários' },
    '/usuarios/:id': { component: 'usuario-detalhe' },
    '/posts/:slug?': { view: '/parciais/post.html' },
    '/admin': { component: 'admin', meta: { requerLogin: true } },
    '/antigo': { redirect: '/novo' },
    '*': { component: 'nao-encontrado', title: 'Página não encontrada' },
  },
  beforeEach(to, from) {
    if (to.meta.requerLogin && !estaLogado()) return '/login';
    return true;
  },
  afterEach(to) {
    console.log('chegou em', to.path);
  },
});
```

```html
<nav>
  <a v-link href="/">Início</a>
  <a v-link href="/usuarios">Usuários</a>
</nav>

<main v-router-view>Carregando...</main>
```

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `mode` | `history` | `history` or `hash` |
| `base` | `/` | Common prefix of routes in `history` mode |
| `routes` | | Map of pattern to definition |
| `beforeEach` | | Global guard before each navigation |
| `afterEach` | | Global hook after each navigation |
| `linkActiveClass` | `v-link-active` | Class of `v-link` when the route starts with the destination |
| `linkExactActiveClass` | `v-link-exact-active` | Class of `v-link` when the route exactly matches the destination |
| `transition` | `true` | Uses View Transitions API on screen change |
| `titleTemplate` | `%s` | Title template, with `%s` in place of the route title |
| `scrollBehavior` | | Fine-grained control of scrolling after navigation |

## Route definition

| Field | What it does |
| --- | --- |
| `component` | Name of a registered component, mounted inside `v-router-view` |
| `view` | URL of remote HTML, loaded and inserted in place |
| `title` | Applied to `document.title` on entering |
| `name` | Route name, available in `$route.name` |
| `meta` | Free data, available in `$route.meta` |
| `redirect` | Redirects as soon as the route matches |
| `beforeEnter` | Guard exclusive to this route, executed before the global one |

## Patterns and specificity

```
/usuarios          fixed segment
/usuarios/:id      required parameter
/posts/:slug?      optional parameter
*                  wildcard, matches when nothing else does
```

The most specific route always wins: `/usuarios/novo` beats `/usuarios/:id`, and `*` only matches
last. You don't need to worry about the order you declared them.

## $route

The current route state is reactive. Any expression that reads `$route` updates by itself.

```html
<h1>User { $route.params.id }</h1>
<p v-show="$route.query.new">Account just created</p>
<small>{ $route.path } · { $route.name }</small>
```

| Field | What it is |
| --- | --- |
| `path` | Path without query and without hash |
| `fullPath` | Complete path |
| `params` | Pattern parameters, like `{ id: '42' }` |
| `query` | Query string converted to object |
| `hash` | Anchor, without the `#` |
| `name` | Name declared in the route |
| `meta` | Route metadata |
| `matched` | The pattern that matched, or `null` |

Via JavaScript, the same object is at `V.route`.

## v-router-view

```html
<main v-router-view>Carregando...</main>
<main v-router-view.no-transition></main>
```

Route with `component` mounts the registered component. Route with `view` fetches the remote HTML
and inserts it with directives already attached, caching the result. The element's original
content returns when no route matches.

The switch uses View Transitions API when the browser provides it. `.no-transition` turns it off.

## v-link

Transforms any `<a href>` into internal navigation.

```html
<a v-link href="/usuarios">Users</a>
<a v-link="'/usuarios/' + user.id">Detail</a>
<a v-link.replace href="/login">Sign in</a>
<a v-link.no-scroll href="/list">Don't scroll to top</a>
```

They keep the browser's native behavior: clicks with Ctrl, Command, Shift or Alt, clicks that
aren't with the primary button, links with `target`, with `download`, with `rel="external"` and
links to another domain.

The active link receives the configured classes and `aria-current="page"` when it exactly matches
the current route.

## v-route-active

Applies a class when the current route matches a path. Useful for menu items that aren't the
link itself.

```html
<li v-route-active="/usuarios">
  <a v-link href="/usuarios">Users</a>
</li>

<li v-route-active:highlight.exact="/">Home</li>
```

The argument is the class name, with default `active`. `.exact` requires the path to be identical.

## Navigating via JavaScript

```js
await V.navigate('/usuarios/42');
await V.navigate('/login', { replace: true });
await V.navigate('/lista', { scroll: false });
await V.navigate('/mesma-rota', { force: true });

V.router.push('/usuarios');
V.router.replace('/login');
V.router.back();
V.router.forward();
V.router.go(-2);
```

`navigate` returns `true` when navigation happened, and `false` when a guard cancelled it.

Inside HTML you have `$router` and `$route`:

```html
<button v-click="$router.push('/carrinho')">Ir ao carrinho</button>
<button v-click="$router.back()">Voltar</button>
```

## Resolving without navigating

```js
V.router.resolve('/usuarios/7').params.id;   // '7'
V.router.resolve('/x').matched;              // padrão casado, ou null
```

## Dynamic routes

```js
V.router.addRoute('/relatorios/:tipo', { component: 'relatorio' });
V.router.removeRoute('/relatorios/:tipo');
V.router.patterns;   // padrões registrados
V.router.ready;      // true depois de configurado
V.router.stop();     // desliga o roteador
V.router.clearViewCache();
```

## Guards

```js
V.router({
  routes: { ... },
  beforeEach(to, from) {
    if (to.meta.requerLogin && !usuario.logado) return '/login';
    if (to.path === '/admin' && !usuario.admin) return false;
    return true;
  },
});
```

The guard can return:

| Value | Effect |
| --- | --- |
| `true`, `undefined`, nothing | Allows navigation |
| `false` | Cancels navigation |
| a string | Redirects to that path |
| a `Promise` of any of the above | The same, asynchronously |

Per-route guards run before the global one:

```js
routes: {
  '/pedidos/:id': {
    component: 'pedido',
    async beforeEnter(to) {
      const existe = await V.http.get(`/api/pedidos/${to.params.id}/existe`);
      return existe ? true : '/404';
    },
  },
}
```

Chained redirects have a limit, so an accidental loop stops with a warning instead of freezing
the tab.

## Scrolling

By default: new route goes to top, going back in history restores the saved position, and a hash
scrolls to the anchor. To control:

```js
V.router({
  routes: { ... },
  scrollBehavior(to, from, saved) {
    if (to.hash) return false;          // you take over scrolling
    if (saved !== null) return saved;   // restore position
    return 0;                            // top
  },
});
```

## Page title

```js
V.router({
  titleTemplate: '%s · My Store',
  routes: {
    '/': { component: 'home', title: 'Home' },   // "Home · My Store"
  },
});
```

## Hash mode

```js
V.router({ mode: 'hash', routes: { '/': { component: 'home' } } });
```

URLs become `/index.html#/usuarios/7`. Requires no server configuration, and works even with the
file opened directly from disk.

## Server configuration for history mode

Every route must return the same `index.html`.

**nginx**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

Previous: [Charts](graficos.md) · Next: [Languages](idiomas.md)
