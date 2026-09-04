# Security

This is the practical guide for application authors. The complete threat model, the
vulnerability reporting policy and the non-goals are in
[SECURITY.md](../../SECURITY.md) at the repository root.

---

## What Voodoo.js protects by default

### No `eval`, no `new Function`

Expressions inside attributes are tokenized, parsed into an AST and evaluated by a
tree-walking interpreter. No string is ever compiled into code.

```
text -> lexer -> Pratt parser -> tree-walking interpreter -> value
```

You can verify it:

```bash
grep -rn "eval(\|new Function" packages/voodoojs/src --include=*.ts
```

The practical consequence: your page never needs `unsafe-eval` in its Content Security
Policy.

### Expressions cannot reach the page

An identifier resolves in this order: the scope chain, then `$magic` variables, then a
closed allowlist of globals. **There is no fall-through to `window`, `globalThis` or
`document`.** A name that is nowhere evaluates to `undefined`.

The allowlist is `Math`, `JSON`, `Date`, `Number`, `String`, `Boolean`, `Array`, `Object`,
`Intl`, `RegExp`, `Promise`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`,
`encodeURIComponent`, `decodeURIComponent` and `console`.

Not on it: `window`, `globalThis`, `document`, `fetch`, `XMLHttpRequest`, `localStorage`,
`eval`, `Function`, `setTimeout`, `navigator`, `location`, `history`.

### The prototype chain is blocked

`__proto__`, `constructor` and `prototype` are refused everywhere they can appear: reads,
member access, call targets, object literal keys and assignment targets.

Without this, `constructor.constructor("return this")()` would rebuild `eval` from inside a
supposedly sandboxed expression, and `x.__proto__.y = 1` would pollute `Object.prototype`
for the whole page.

### Dangerous URL schemes are refused

With `V.config.sanitizeUrls` on (the default), a bound value using `javascript:`,
`vbscript:`, `data:text/html` or `data:application/xhtml` is refused in `href`, `src`,
`action`, `formaction`, `xlink:href`, `ping` and `poster`. The attribute is removed and a
warning is logged.

Whitespace and control characters are stripped before the comparison, because browsers do
the same, which is why `java\nscript:alert(1)` runs in a naive implementation.

### Inline event attributes are refused

```html
<!-- Refused. Warns, attribute removed, nothing bound. -->
<div :onerror="payload"></div>

<!-- Correct. @ binds through addEventListener. -->
<div @error="handle($event)"></div>
```

### Zero runtime dependencies

Nothing in the published bundles comes from another package, so there is no transitive
supply chain at runtime.

---

## Content Security Policy

A policy that works out of the box:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.example.com
```

`unsafe-eval` is never needed.

### Removing `'unsafe-inline'` from `style-src`

`'unsafe-inline'` is there because Voodoo.js injects `<style>` elements at runtime, lazily,
one per feature, the first time that feature is used.

To drop it, disable injection and ship the CSS yourself:

```html
<script src="voodoo.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

Then:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

> Turning injection off suppresses **everything**, including the `--v-*` design tokens and
> the `[v-cloak]{display:none}` rule. You must provide both. `BASE_TOKENS` in
> `packages/voodoojs/src/dom/style.ts` is the source of truth for the token block.

### What does not require `style-src`

Setting style properties through CSSOM is not restricted by CSP:

```js
el.style.display = 'none';        // v-show
el.style.setProperty('--x', '1'); // v-style
```

So `v-show`, `v-style`, transitions and animations all work under `style-src 'self'` with
injection disabled. Only the injected `<style>` blocks are affected.

### Subresource Integrity

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.4/dist/voodoo.full.min.js"
        integrity="sha384-..."
        crossorigin="anonymous"
        defer></script>
```

Pin an exact version. A floating tag with SRI breaks on the next release, and without SRI it
is a supply-chain risk.

---

## What you must handle

### `v-html` is developer trust, explicitly

```js
defineDirective('html', (ctx) => {
  effect(() => {
    const value = ev();
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? '' : String(value);
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});
```

Three facts from that code:

1. The value goes to `innerHTML` **verbatim**. No sanitizer, no allowlist, no tag stripping.
2. The inserted HTML is then **walked**, so any `v-*`, `@` or `:` attribute inside it becomes
   live and evaluates in the surrounding scope.
3. The previous content is properly destroyed first, so effects and listeners do not leak.
   That is a correctness guarantee, not a security one.

> **`v-html` renders whatever you give it. Only pass HTML you produced or sanitized.**

If the value can come from a user, a database, a CMS, a URL parameter or an API you do not
fully control, sanitize it:

```js
import DOMPurify from 'dompurify';

V.component('profile', {
  props: { rawBio: { type: 'string', default: '' } },
  computed: {
    safeBio() { return DOMPurify.sanitize(this.rawBio); },
  },
  template: `<div v-html="safeBio"></div>`,
});
```

Or sanitize before the value ever reaches the state:

```js
const state = V.data({ safeBio: '' });
state.safeBio = DOMPurify.sanitize(await loadBio());
```

```html
<div v-html="safeBio"></div>
```

> Do not try to do this with a getter on the object you pass to `V.data`. `V.data` uses
> `Object.assign`, which **invokes** getters and stores their result, so the value would be
> computed once and frozen. Use a component `computed`, or `V.computed`.

If you only need text, do not use `v-html` at all:

```html
<div v-text="bio"></div>
<div>{ bio }</div>
```

### `V.escapeHtml` and `V.stripTags` are not sanitizers

`escapeHtml` replaces `& < > " '` and is correct for building a text node by hand.
`stripTags` is a regular expression that removes tag-looking substrings and is trivially
bypassed. Treat it as a formatting helper for plain-text previews, never as a security
control.

### Other paths that insert markup

| Path                                | Trust |
| ----------------------------------- | ----- |
| Component `template`                | Yours, written at registration time. Never build one from user input. |
| `V.fromHtml(html)`                  | Same as `v-html` |
| `V(sel).html(value)`                | Same as `v-html` |
| HTTP directives with `v-as="html"`  | Trusted as far as your server is |
| `v-resource` with an HTML template  | Same |
| Router routes using `view:`         | Same |
| Toast, modal, alert options that accept HTML | Pass user content as text |

General rule: **any API whose name or option contains "html" inserts markup and sanitizes
nothing.**

### Never interpolate user data into attribute text

An expression is code. If an attacker controls the *text of an attribute*, they control what
runs inside the sandbox.

```html
<!-- Dangerous: the user controls the expression, not just a value. -->
<div v-data="{ name: '{{ user_supplied }}' }"></div>
```

A value of `'} , evil: V.http.post("/steal", V.storage.get("token")) , x: {'` breaks out of
the string. The sandbox limits the damage to what the allowlist exposes, but the browser builds
put `V` on that list so that `@click="V.palette()"` can work, which means the HTTP client
and the storage helpers are reachable.

The fix is the same as for any template injection. Put the data in an element and read it:

```html
<div id="boot" data-name="{{ user_supplied|escaped }}"></div>
<script>
  V.data({ name: document.getElementById('boot').dataset.name });
</script>
```

### `V.config.globals` decides how big the sandbox is

```js
V.config.globals.APP_VERSION = '2.1.0';         // fine, a value
V.config.globals.formatMoney = (n) => ...;      // fine, a pure function

V.config.globals.window = window;                // never
V.config.globals.fetch = fetch;                  // never
```

Anything you add here is reachable from **every expression on the page**. Add values and
pure functions, not capabilities.

### Client-side validation is not a security boundary

`v-required`, `v-email`, `v-cpf` and every other rule improve the user experience. All of
them can be bypassed from the developer console in seconds. **Validate on the server.**

### Client-side storage

`localStorage` is readable by any script on the origin, including an XSS payload.

- Do not store session tokens, API keys or personal data client-side.
- `V.cookie.set` supports `SameSite`, but a cookie set from JavaScript cannot be `HttpOnly`.
  Authentication cookies must be set by the server with `HttpOnly` and `Secure`.
- The HTTP offline queue writes request bodies to `localStorage` in plain text. Do not queue
  requests carrying secrets.
- `v-sync` broadcasts state to other same-origin tabs. Do not sync anything a same-origin
  script should not read.

### Audit your plugins

A plugin receives the real `V`. It can register a directive, install an HTTP interceptor
that sees every request, or add an entry to `V.config.globals`. `usePlugin` sandboxes
nothing. See [Plugins](plugins.md).

---

## Checklist

- [ ] Every value reaching `v-html`, `V.fromHtml` or `.html()` is sanitized.
- [ ] Server templates escape data before it lands in any HTML attribute.
- [ ] `V.config.globals` contains only values and pure functions.
- [ ] A Content Security Policy is set, and `unsafe-eval` is not in it.
- [ ] `V.config.sanitizeUrls` is left on, or values are sanitized manually.
- [ ] Every form is validated server-side as well.
- [ ] No tokens or personal data in `localStorage`, `sessionStorage` or a persisted store.
- [ ] Auth cookies are set by the server with `HttpOnly` and `Secure`.
- [ ] Every plugin has been reviewed.
- [ ] The CDN tag pins an exact version and uses SRI.
- [ ] The page is served over HTTPS.

---

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting:

<https://github.com/kwy404/Voodoo.js/security/advisories/new>

See [SECURITY.md](../../SECURITY.md) for what to include and what to expect.

---

## Next

- [SECURITY.md](../../SECURITY.md) - the full model
- [Forms](forms.md)
- [HTTP](http.md)
- [Plugins](plugins.md)
