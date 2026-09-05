# Security

## Why not eval

Many libraries that interpret expressions in attributes use `new Function('with(scope){ ... }')`.
It's quick to write and works well, but brings two consequences: the page needs
`unsafe-eval` in Content Security Policy, and any text that reaches an attribute becomes
executable code with access to everything.

Voodoo.js does not do this. Every expression goes through three hand-written stages inside the
library:

1. a **lexer**, which breaks the text into tokens;
2. a **Pratt parser**, which builds the syntax tree;
3. a **tree interpreter**, which evaluates node by node, within scope.

No `eval`, no `new Function`, no `setTimeout` with string.

## Content Security Policy

The library works with a restrictive policy:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

The `'unsafe-inline'` in `style-src` exists because CSS from UI components is injected at
runtime. To remove it, disable injection and load the CSS yourself:

```html
<script src="voodoo.full.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

Then the policy can be:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

`unsafe-eval` is never necessary, in any configuration.

## Expression access surface

An identifier within an expression is looked up in scope. When it doesn't exist in any
scope, the search falls to a closed list of globals:

```
Math  JSON  Date  Number  String  Boolean  Array  Object  Intl  RegExp  Promise
parseInt  parseFloat  isNaN  isFinite  encodeURIComponent  decodeURIComponent  console
```

Everything outside that list returns `undefined`:

```js
window       // undefined
document     // undefined
fetch        // undefined
eval         // undefined
globalThis   // undefined
localStorage // undefined
```

An attribute with `v-text="document.cookie"` reads nothing. This greatly reduces the damage possible
when an attribute is built from data you don't control, but **it's not a sandbox**.
The usual rule still applies: never put user content inside a `v-*` attribute
without escaping.

Access to services is explicit, through magic variables: `$el`, `$refs`, `$http`, `$storage`,
`$clipboard`. They are opt-in by design, so you can audit what a page can do
by reading the attributes themselves.

## v-html and XSS

`v-html` inserts HTML without escaping. It exists because content from a rich text editor
needs this, and there's no other honest way to solve it.

**Never use `v-html` with content from the user without sanitizing first.**

```html
<!-- dangerous -->
<div v-html="comment.text"></div>

<!-- safe -->
<div v-text="comment.text"></div>
```

When HTML is truly necessary, sanitize on the server or client with a dedicated library:

```js
import DOMPurify from 'dompurify';

V.config.globals.sanitize = (html) => DOMPurify.sanitize(html);
```

```html
<div v-html="sanitize(article.body)"></div>
```

An important detail: HTML inserted by `v-html` **is walked by Voodoo**, so it can
bring directives. A `v-html` with user content allows injecting `v-click`, `v-init` and
any other attribute. This reinforces the rule above.

The same applies to HTML responses from `v-get`, `v-post` and `v-target`: content is initialized
by the library. Trust only responses from your own server.

The `html` option of notifications (`V.toast({ html })`) also inserts without escaping. Use only with
your own content.

## srcdoc in iframe

`srcdoc` receives an entire HTML document and the browser executes it, with scripts. Binding a value there
is as dangerous as `v-html`, but the syntax didn't make it obvious: it looked like a common attribute.

For this reason, `:srcdoc` is rejected, and the attribute is removed from the element:

```html
<!-- rejected, with warning in console -->
<iframe :srcdoc="userHtml"></iframe>
```

When the content is truly yours and you want this, the danger must be explicit:

```html
<iframe :srcdoc.dangerous="myControlledHtml"></iframe>
```

The modifier doesn't sanitize anything. It exists so no one injects an executable document by
accident, and so code review can find all dangerous points by searching for one word.

The block also applies to `.prop` and the argument-less form, `v-bind="{ srcdoc }"`, and can be
disabled entirely with `V.config.sanitizeUrls = false` — which I don't recommend.

## What the library escapes automatically

| Situation | Behavior |
| --- | --- |
| `{ interpolation }` | Written as text, never as HTML |
| `v-text` | Written as text |
| JSON response rendered by `v-get` | All values pass through `escapeHtml` |
| Validation messages | Written as text |
| Content of toast, alert, confirm and prompt | Written as text, except when you use `html` |
| Labels and values of charts | Written as SVG text |
| `V.escapeHtml(text)` | Available when you build HTML by hand |

## CSRF

Write requests (`POST`, `PUT`, `PATCH`, `DELETE`) automatically send the token read from
a meta tag:

```html
<meta name="csrf-token" content="{{ token }}">
```

The header sent is `X-CSRF-TOKEN`. Both names are configurable:

```js
V.http.defaults.csrfMeta = 'my-token';
V.http.defaults.csrfHeader = 'X-My-Token';
```

Every request also carries `X-Requested-With: XMLHttpRequest`, which helps the server
distinguish AJAX calls.

The default for `credentials` is `same-origin`, so cookies don't leak to another origin unless you
ask for it.

## Sensitive data in storage

`V.storage`, `V.session` and `v-persist` write to browser storage, which is readable by
any script from the same origin. Don't store long-lived tokens, card data, or
anything that can't be read by an extension installed in the user's browser.

For tokens, prefer cookies with `HttpOnly` set by the server. When that's not possible,
use `V.session`, which dies with the tab, instead of `V.storage`.

```js
V.cookie.set('preference', 'dark', { secure: true, sameSite: 'Strict' });
```

Also remember that `v-sync` publishes scope state in a `BroadcastChannel`, visible to
any tab from the same origin. Don't sync sensitive data.

## Uploads

`v-upload` and `v-dropzone` send what the user chooses. All validations that matter
(type, size, actual file content) must happen on the server. The `accept` and
`multiple` attributes are interface convenience, not security.

## Third parties on CDN

When loading from CDN, pin the version and consider using subresource integrity:

```html
<script
  src="https://cdn.jsdelivr.net/npm/voodoojs@0.13.0/dist/voodoo.full.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
  defer
></script>
```

The correct hash comes with each published version. In environments with stricter policy, serve the
file from your own domain.

## Recommended headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Reporting a vulnerability

Don't open a public issue. Describe the problem, with steps to reproduce, in a private contact
with the project. See [Contributing](contribuindo.md).

---

Previous: [API](api.md) · Next: [Performance](desempenho.md)
