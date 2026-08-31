# Router

> **Full build only.** The router ships in `voodoo.full.min.js`, or through a bundler
> import. It is not in `voodoo.min.js` or `voodoo.core.min.js`.

Implementation: `packages/voodoojs/src/router/index.ts`.

---

## Setup

```js
V.router({
  routes: {
    '/':              { component: 'page-home', title: 'Home' },
    '/products':      { component: 'page-products', title: 'Products' },
    '/products/:id':  { component: 'page-product', name: 'product' },
    '/admin':         { component: 'page-admin', meta: { requiresAuth: true } },
    '/old-path':      { redirect: '/products' },
    '*':              { component: 'page-not-found' },
  },
});
```

```html
<nav>
  <a v-link="/">Home</a>
  <a v-link="/products">Products</a>
</nav>

<main v-router-view></main>
```

Each page is a normal component. The only difference is who decides when to mount it.

---

## Route records

| Field         | Type | Meaning |
| ------------- | ---- | ------- |
| `component`   | `string` | Registered component mounted inside `v-router-view` |
| `view`        | `string` | URL of remote HTML loaded in place of a component |
| `title`       | `string` | Applied to `document.title` on entry |
| `name`        | `string` | Route name, available as `$route.name` |
| `meta`        | `object` | Free-form data, available as `$route.meta` |
| `redirect`    | `string` | Redirect as soon as the route matches |
| `beforeEnter` | guard | Route-specific guard, run before the global `beforeEach` |

---

## Router options

| Option                 | Default | Meaning |
| ---------------------- | ------- | ------- |
| `mode`                 | `'history'` | `'history'` for clean URLs, `'hash'` for `#/path` |
| `base`                 | `'/'`   | Common prefix in history mode |
| `routes`               | required | Pattern to record map |
| `beforeEach`           | -       | Global guard before each navigation |
| `afterEach`            | -       | Global hook after each navigation |
| `linkActiveClass`      | `'v-link-active'` | Class on `v-link` when the route starts with the target |
| `linkExactActiveClass` | `'v-link-exact-active'` | Class on `v-link` when the route is exactly the target |
| `transition`           | `true`  | Use the View Transitions API for page changes |
| `titleTemplate`        | `'%s'`  | Title template, with `%s` for the route title |
| `scrollBehavior`       | -       | Fine-grained scroll control after navigation |

---

## Parameters

```js
V.router({
  routes: {
    '/users/:id':          { component: 'user-detail' },
    '/posts/:year/:month': { component: 'post-archive' },
  },
});
```

```html
<div v-component="user-detail">
  <p>User { $route.params.id }</p>
  <p>Query page: { $route.query.page }</p>
</div>
```

`$route` is reactive, so an expression reading it updates when the route changes.

| Field      | Value |
| ---------- | ----- |
| `path`     | Path without query or hash, always starting with `/` |
| `fullPath` | Path with query and hash |
| `params`   | Values pulled from the pattern, e.g. `{ id: '42' }` |
| `query`    | Query string as an object |
| `hash`     | Anchor, without the `#` |
| `name`     | The matched route's name |
| `meta`     | The matched route's metadata |
| `matched`  | The pattern that matched, or `null` |

Params are always strings. Convert them yourself.

---

## Navigation

```js
V.navigate('/products');
V.router.push('/products');
V.router.replace('/login');
V.router.back();
V.router.forward();
V.router.go(-2);
```

`push` and `replace` return a promise resolving to `true` when the navigation completed, or
`false` when a guard cancelled it.

```js
await V.navigate('/checkout', { replace: true, state: { from: 'cart' } });
```

Resolve without navigating:

```js
const location = V.router.resolve('/users/42');
location.params.id;   // '42'
```

Both `$route` and `$router` are available inside expressions:

```html
<button @click="$router.back()">Back</button>
<p>{ $route.path }</p>
```

---

## Guards

A guard returns `false` to cancel, a string to redirect, or `true` / `undefined` / nothing
to continue. It can be async.

### Global

```js
V.router({
  routes: { /* ... */ },

  beforeEach(to, from) {
    if (to.meta.requiresAuth && !V.stores.auth.user) return '/login';
  },

  afterEach(to, from) {
    V.analytics?.track('pageview', { path: to.path });
  },
});
```

### Per route

```js
'/admin': {
  component: 'page-admin',
  async beforeEnter(to, from) {
    const ok = await checkPermission();
    return ok || '/forbidden';
  },
}
```

`beforeEnter` runs before the global `beforeEach`.

---

## Scroll behaviour

```js
V.router({
  routes: { /* ... */ },

  scrollBehavior(to, from, saved) {
    if (to.hash) return document.querySelector(to.hash)?.offsetTop ?? 0;
    return saved ?? 0;
  },
});
```

Return a vertical position, or `false` to take over scrolling entirely. `saved` is the
position recorded for that history entry, or `null`.

---

## Directives

### `v-router-view`

Where the matched component or view is mounted.

```html
<main v-router-view></main>
<main v-router-view.no-transition></main>
```

The subtree is owned by the directive: the previous page is destroyed before the next one
is mounted. The original `innerHTML` is the fallback when no route matches and no view is
loaded.

### `v-link`

An anchor that navigates without a page load.

```html
<a v-link="/products">Products</a>
<a v-link.replace="/login">Sign in</a>
<a v-link.no-scroll="/products#reviews">Reviews</a>
```

Modifiers: `.replace` replaces the history entry instead of pushing one; `.no-scroll`
skips the scroll behaviour.

The click is left alone (so the browser handles it normally) when a modifier key is held,
when it is not the primary button, when `target` is set to anything other than `_self`,
when the anchor has `download`, when `rel` contains `external`, and when the destination is
an external URL.

While the route matches, the anchor gets `linkActiveClass` when the current path starts with
the target and `linkExactActiveClass` when it matches exactly. An exact match also sets
`aria-current="page"`.

### `v-route-active`

Toggles a class while the route matches.

```html
<li v-route-active="/products">Products</li>
<li v-route-active:highlight.exact="/">Home</li>
```

The argument after the colon is the class name, defaulting to `active`. The `.exact`
modifier requires an exact match rather than a prefix match. A value that does not start
with `/` is evaluated as an expression.

---

## Dynamic routes

```js
V.router.addRoute('/reports/:id', { component: 'report-detail' });
V.router.removeRoute('/reports/:id');
V.router.patterns();     // registered patterns, most specific first
```

Useful when routes come from the server, or when a plugin contributes its own.

---

## Remote views

Instead of a component, a route can load HTML:

```js
'/about': { view: '/partials/about.html', title: 'About' }
```

The fetched HTML is inserted into `v-router-view` and walked, so directives inside it work.
Responses are cached; clear the cache with:

```js
V.router.clearViewCache();
V.router.clearViewCache('/partials/about.html');
```

> The HTML is inserted as markup. It is trusted exactly as far as the origin serving it.

---

## View Transitions

Enabled by default. When `document.startViewTransition` exists and the user has not asked
for reduced motion, page changes cross-fade. Everywhere else the update is instant. Nothing
breaks either way.

```js
V.router({ routes: { /* ... */ }, transition: false });   // opt out
```

Native support: Chrome 111, Safari 18, Firefox 144. See
[BROWSER_SUPPORT.md](../../BROWSER_SUPPORT.md).

---

## Other API

| Call                          | Effect |
| ----------------------------- | ------ |
| `V.router.current`            | The current `RouteLocation` |
| `V.router.ready`              | `true` after `V.router({...})` has been called |
| `V.router.stop()`             | Detach the history listeners |
| `V.route`                     | The same reactive location object, exported directly |

---

## Server configuration

In `history` mode the server must return your `index.html` for any path, so a deep link
works on a hard refresh.

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

If you cannot configure the server, use `mode: 'hash'`.

---

## Next

- [Components](components.md)
- [HTTP](http.md)
- [application-structure](../application-structure.md) (Portuguese) - organizing pages and routes
