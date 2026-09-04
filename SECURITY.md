# Security Policy

This document has two parts: how to report a vulnerability, and the technical security
model of the library. The second part is the more important one for most readers, because
it defines what Voodoo.js protects against and, just as explicitly, what it does not.

Version described: `0.1.0`.

---

## Part 1: Reporting a vulnerability

### Do not open a public issue

Use GitHub's private vulnerability reporting:

**<https://github.com/kwy404/Voodoo.js/security/advisories/new>**

If that page is unavailable to you, open a normal issue that contains only "I would like to
report a security issue privately, please contact me" and nothing else. Do not include
details.

### What to include

- A description of the vulnerability and its impact.
- The affected version and which bundle (`voodoo.core.min.js`, `voodoo.min.js`,
  `voodoo.full.min.js`, or an npm import).
- A minimal, self-contained HTML reproduction.
- Whether the issue requires attacker-controlled data to reach a specific attribute or API,
  and which one.
- Any suggested fix, if you have one.

### What to expect

| Stage                          | Target                                    |
| ------------------------------ | ----------------------------------------- |
| Acknowledgement                | within 72 hours                            |
| Initial assessment             | within 7 days                              |
| Fix or documented mitigation   | depends on severity, communicated in the assessment |
| Public advisory and credit     | after the fix ships, unless you prefer otherwise |

This is a volunteer-maintained project. These are targets, not contractual SLAs.

### Supported versions

While the project is pre-1.0, only the latest release receives security fixes. There are no
backports.

| Version | Supported |
| ------- | --------- |
| `0.1.x` | yes       |
| `< 0.1` | no        |

### Safe harbour

Good-faith security research on your own deployment of Voodoo.js is welcome. Do not test
against systems you do not own, do not access other people's data, and give the project
reasonable time to fix an issue before disclosing it.

---

## Part 2: Security model

### 2.1 No `eval`, no `new Function`

This is the central design decision and it is verifiable in three files.

Most libraries that evaluate expressions inside HTML attributes compile them:

```js
new Function('scope', `with (scope) { return ${expression} }`);
```

That is fast to write and it works, but it has two consequences. The page needs
`unsafe-eval` in its Content Security Policy, and any string that reaches an attribute
becomes executable code with access to everything the page can reach.

Voodoo.js instead runs every expression through a hand-written pipeline:

```
text  ->  parser/lexer.ts       tokens
      ->  parser/parser.ts      AST (Pratt parser)
      ->  parser/interpreter.ts value (tree-walking evaluator)
```

No `eval`. No `new Function`. No `setTimeout` with a string body. No dynamic `import()` of
a data URL. You can confirm this yourself:

```bash
grep -rn "eval(\|new Function\|setTimeout(['\"\`]" packages/voodoojs/src --include=*.ts
```

Because no string is ever compiled into code, the bundles run under a policy without
`unsafe-eval`.

### 2.2 What the expression evaluator can reach

An identifier inside an expression resolves in this order (`parser/interpreter.ts`,
`case 'id'`):

1. The scope chain, walking from the current scope to the root.
2. Registered `$magic` variables, if the name starts with `$`.
3. The `allowedGlobals` allowlist.
4. Otherwise `undefined`.

There is **no step that falls through to `window`, `globalThis` or `document`.**

The default `allowedGlobals`:

```
Math   JSON   Date   Number   String   Boolean   Array   Object   Intl   RegExp
Promise   parseInt   parseFloat   isNaN   isFinite
encodeURIComponent   decodeURIComponent   console
```

Notably absent, and absent on purpose: `window`, `globalThis`, `document`, `fetch`,
`XMLHttpRequest`, `localStorage`, `eval`, `Function`, `setTimeout`, `setInterval`,
`navigator`, `location`, `history`, `WebSocket`, `Worker`, `import`.

An application extends the list through configuration:

```js
V.config.globals.APP_VERSION = '2.1.0';
V.config.globals.formatMoney = (n) => n.toFixed(2);
```

`V.start()` merges `V.config.globals` into `allowedGlobals`. **Anything you add here is
reachable from every expression on the page.** Adding `window` or `fetch` to this list
defeats the sandbox. Add values and pure functions, not capabilities.

The browser builds add one entry automatically, in `bootstrap.ts`:

```js
allowedGlobals.V = V;
allowedGlobals.Voodoo = V;
```

This is what makes `@click="V.palette()"` work. It means the whole public API is reachable
from any expression, including `V.http`, `V.storage` and `V.config`. That is a deliberate
convenience trade, and it is the reason section 2.6 matters.

### 2.3 What the parser refuses

The grammar in `parser/parser.ts` does not accept, and the parser throws
`VoodooSyntaxError` on:

- `function` declarations and function expressions
- `class`
- `new`
- `delete`
- `import` and `import()`
- `await` and `async`
- `for`, `while`, `do`, `switch`, `try`, `catch`, `throw`
- labelled statements, `with`
- destructuring in any position
- generators and `yield`
- regular expression literals
- getters and setters in object literals
- bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`) are absent from the precedence
  table, so `a & b` is a syntax error

The supported subset is deliberately small: literals, identifiers, member access, calls,
optional chaining, unary and binary operators, ternary, assignment, `++`/`--`, arrow
functions, object and array literals, spread, template literals, and `;`-separated
sequences. Attribute expressions are meant to be one value long. Anything larger belongs
in a component method.

### 2.4 Prototype chain access is blocked

A restricted grammar is not enough on its own. Reading `constructor` was sufficient to
escape the interpreter:

```js
({}).constructor            // -> Object
Object.constructor          // -> Function
Function("return this")()   // -> the global object, and eval with it
```

`parser/interpreter.ts` therefore rejects three keys outright, everywhere they can appear:

```
__proto__    constructor    prototype
```

The check (`chaveBloqueada` / `checarChave`) runs on:

- identifier reads (`constructor`), because these keys exist on every object by
  inheritance, so `name in scope.data` would find them even though nobody declared them
- member reads, both dotted and computed: `x.constructor`, `x['constructor']`
- call targets: `x.constructor(...)`
- object literal keys: `{ __proto__: attacker }`
- every assignment target: `x.__proto__.polluted = 1`

Attempting any of them throws a `VoodooRuntimeError` naming the blocked key. Because the
check lives in the interpreter, it covers every expression regardless of which directive
evaluated it, including `v-model` writes and `v-for` key expressions.

This closes both the sandbox escape and the prototype pollution class in one place.

### 2.5 URL scheme sanitization

`V.config.sanitizeUrls` defaults to `true`. When a bound value reaches an attribute the
browser treats as a navigable address, the scheme is checked first
(`applyBinding` in `directives/core.ts`).

Checked attributes: `href`, `src`, `action`, `formaction`, `xlink:href`, `ping`, `poster`.

Refused schemes: `javascript:`, `vbscript:`, `data:text/html`, `data:application/xhtml`.

The comparison strips whitespace and control characters (`/[\s\x00-\x1f]/g`) before
matching, because browsers do the same when reading a scheme, which is why
`java\nscript:alert(1)` executes in a naive implementation.

Additionally, any `:on*` binding is refused:

```html
<!-- Refused. Warns in dev, attribute removed, nothing is bound. -->
<div :onerror="payload"></div>

<!-- Correct. @ never produces an inline handler. -->
<div @error="handle($event)"></div>
```

Setting an `on*` attribute creates an inline event handler, which executes as script and
would also require `unsafe-inline` in `script-src`. `@event` binds through
`addEventListener` and never touches the attribute.

Two limits to be aware of:

- The check does not apply when binding to a **property** (`.href="..."`), because at that
  point the developer has explicitly opted out of attribute semantics.
- Turning `V.config.sanitizeUrls` off removes the protection entirely. Do that only if the
  application genuinely needs to generate those schemes, and sanitize the values yourself.

### 2.6 Content Security Policy

Voodoo.js is designed to run under a restrictive policy. The exact requirements:

| Directive     | Requirement                     | Why                                            |
| ------------- | ------------------------------- | ---------------------------------------------- |
| `script-src`  | `'self'` (or the CDN origin)    | No `eval`, no `new Function`, no inline handlers |
| `style-src`   | `'self' 'unsafe-inline'` **by default** | `injectStyle()` creates `<style>` elements at runtime |
| `connect-src` | your API origins                | `fetch`, `EventSource`, `XMLHttpRequest`        |
| `img-src`     | as your app needs               | `v-lazy-src`, `v-lazy-bg`                       |
| `media-src`   | as your app needs               | `V.sound` uses Web Audio, not media elements    |

**`unsafe-eval` is never required, in any configuration.**

#### The `style-src` requirement in detail

`dom/style.ts` implements `injectStyle(id, css)`, which creates a `<style data-voodoo="id">`
element and appends it to `<head>`. It is called lazily, once per feature, the first time
that feature is used: `tokens`, `transitions`, `forms-validate`, `ui-live`, `charts`, the
UI directive stylesheets, and one per component that declares a `style`.

A `<style>` element inserted through the DOM is subject to `style-src`. Under
`style-src 'self'` with no `'unsafe-inline'`, the browser refuses it and the UI components
render unstyled.

There are two ways to avoid `'unsafe-inline'`.

**Option A: disable injection and ship the CSS yourself.**

```html
<script src="voodoo.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

or in code, before `V.start()`:

```js
V.config.injectStyles = false;
```

The policy can then be:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

Note that `injectStyle` returns early when `injectStyles` is `false`, so **no** stylesheet
is injected, including the `--v-*` design tokens and the `[v-cloak]{display:none}` rule.
You must provide both. `BASE_TOKENS` in `packages/voodoojs/src/dom/style.ts` is the source
of truth for the token block.

**Option B: use a nonce or a hash.** Voodoo.js does not currently set a `nonce` attribute
on the elements it creates, so this only works with hashes, which is impractical for
dynamically composed CSS. Nonce support is tracked in [ROADMAP.md](ROADMAP.md).

#### What does *not* require `style-src`

Setting style **properties** through CSSOM is not restricted by CSP:

```js
el.style.display = 'none';        // v-show
el.style.setProperty('--x', '1'); // v-style
el.style.cssText = '...';         // v-style with a string
```

So `v-show`, `v-style`, transitions and animations work under `style-src 'self'` even with
injection disabled. Only the injected `<style>` blocks are affected.

#### Inline `style` attributes in your own HTML

Voodoo.js never writes a `style` attribute with `setAttribute`. If your own markup uses
`style="..."`, that is your requirement for `'unsafe-inline'`, not the library's.

### 2.7 XSS surface

This is the part to read carefully. Voodoo.js is a rendering library; it can protect the
paths it owns, and it cannot protect paths you deliberately open.

#### Safe by construction

These write text, never markup, and are safe with untrusted values:

| Path                   | Mechanism                          |
| ---------------------- | ---------------------------------- |
| `{ expression }` and `{{ expression }}` | `node.textContent = ...` |
| `v-text="expression"`  | `el.textContent = ...`             |
| `v-once`               | `el.textContent = ...`             |
| `v-model`              | reads and writes `input.value`     |
| `:attr="value"`        | `setAttribute`, with the scheme and `on*` checks from 2.5 |

`stringify()` in the interpreter converts non-strings for display; it never produces
markup.

#### `v-html` is developer trust, explicitly

`directives/core.ts`:

```ts
defineDirective('html', (ctx) => {
  const { el, effect, evaluate: ev, scope } = ctx;
  markSkipChildren(el);
  effect(() => {
    const value = ev();
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? '' : String(value);
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});
```

Three facts follow directly from that code:

1. **The value is assigned to `innerHTML` verbatim.** There is no sanitizer, no allowlist,
   no tag stripping. Voodoo.js does not bundle a sanitizer and does not intend to.
2. **The inserted HTML is then walked.** Any `v-*`, `@` or `:` attribute inside the
   injected markup becomes live and is evaluated in the surrounding scope. This is a
   feature for server-rendered fragments; it is an amplifier for injected content.
3. **The previous content is properly destroyed** before replacement, so effects and
   listeners do not leak. That is a correctness guarantee, not a security one.

The contract, stated plainly:

> **`v-html` renders whatever you give it. Only pass HTML you produced or have sanitized.**

If the value can come from a user, a database, a CMS, a URL parameter, or any API response
you do not fully control, sanitize it before it reaches the attribute:

```js
// Recommended: a real sanitizer.
import DOMPurify from 'dompurify';

V.data({
  get safeBio() {
    return DOMPurify.sanitize(this.rawBio);
  },
});
```

```html
<div v-html="safeBio"></div>
```

If you only need to display text, do not use `v-html` at all:

```html
<div v-text="bio"></div>
<div>{ bio }</div>
```

`V.escapeHtml(text)` and `V.stripTags(html)` exist in `utils/index.ts`. **Neither is a
sanitizer.** `escapeHtml` replaces `& < > " '` and is correct for building a text node by
hand. `stripTags` is a regular expression that removes tag-looking substrings and is
trivially bypassed; treat it as a formatting helper for plain-text previews, never as a
security control.

#### Other paths that insert markup

| Path                              | Trust level                                        |
| --------------------------------- | -------------------------------------------------- |
| Component `template`              | Developer-authored. Written by you at registration time, so it is trusted by definition. Never build a template from user input. |
| `V.fromHtml(html)`                | Same as `v-html`. Parses a string into nodes.       |
| `VoodooCollection.html(value)`    | Same as `v-html`.                                   |
| HTTP directives with `v-as="html"`| Inserts a **server response** as markup. Trusted only as far as the server is. |
| `v-resource` with an HTML template| Same.                                               |
| `V.toast`, `V.modal`, `V.alert`, `V.confirm`, `V.prompt` | Check `docs/interface.md` for which options accept HTML. Pass user content as text. |
| `V.renderChart` labels            | Rendered as SVG text nodes.                         |

The general rule: **any API whose name or option contains "html" inserts markup and
sanitizes nothing.**

### 2.8 Attributes that carry expressions

An expression is code. If an attacker controls the *text of an attribute*, they control
what the expression does within the sandbox described above.

This matters when a server template interpolates user data into markup:

```html
<!-- Dangerous: the user controls the expression, not just a value. -->
<div v-data="{ name: '{{ user_supplied }}' }"></div>
```

A value of `'} , evil: V.http.post("/steal", V.storage.get("token")) , x: {'` breaks out of
the string and runs inside the expression. The parser sandbox limits the damage to what
`allowedGlobals` exposes, but since `bootstrap.ts` exposes `V`, that includes the HTTP
client and the storage helpers.

The fix is the same as for any template injection: **never interpolate untrusted data into
attribute text.** Put the data in an element the client reads instead:

```html
<div id="boot" data-name="{{ user_supplied | escaped }}"></div>
<script>
  V.data({ name: document.getElementById('boot').dataset.name });
</script>
```

`document.cookie` is not reachable from an expression, but `V.cookie.get(name)` and
`V.storage.get(key)` are, which is the same thing through the front door. This is the
concrete cost of exposing `V` to expressions.

### 2.9 HTTP layer

`http/index.ts`:

- **CSRF.** A `<meta name="csrf-token" content="...">` tag is read automatically and sent
  as `X-CSRF-TOKEN` on every request, including `http.upload`. The meta name and the header
  name are configurable through `http.defaults.csrfMeta` and `http.defaults.csrfHeader`.
  The token is not sent if the caller already set that header.
- **Credentials.** `http.defaults.credentials` is `'same-origin'`. Cookies are not sent
  cross-origin unless you change it.
- **Base URL.** `V.config.baseURL` and `http.setBaseURL()` prefix relative URLs. Never build
  a base URL from user input.
- **Offline queue.** Failed mutating requests can be queued in `localStorage` and replayed.
  Request bodies therefore sit in `localStorage` in plain text. Do not queue requests
  containing secrets.
- **Response cache.** Cached responses are held in memory for the page lifetime, not
  persisted.
- **Interceptors** run for every request and response. An interceptor is the right place to
  attach auth headers; it is also a single point that sees every payload, so audit
  third-party plugins that install one.

### 2.10 Client-side storage

`storage/index.ts` and `store/index.ts` write to `localStorage`, `sessionStorage` and
cookies. `v-persist`, `v-storage` and `V.store(name, def, { persist: true })` all end up
there.

`localStorage` is readable by any script on the origin, including any XSS payload. Standard
rules apply:

- Do not store session tokens, API keys or personal data client-side.
- `V.cookie.set` accepts `SameSite`; there is no `HttpOnly` option, because a cookie set
  from JavaScript cannot be `HttpOnly` by definition. Authentication cookies must be set by
  the server with `HttpOnly` and `Secure`.
- `v-sync` broadcasts state through `BroadcastChannel` to other tabs **on the same origin**.
  Do not sync anything you would not want a same-origin script to read.

### 2.11 Your responsibilities

Voodoo.js handles:

- Never compiling a string into code.
- Blocking prototype chain access from expressions.
- Refusing `javascript:` and friends in navigable attributes.
- Refusing `:on*` bindings.
- Escaping nothing, because text paths never produce markup in the first place.
- Sending CSRF tokens when the meta tag is present.
- Defaulting to `same-origin` credentials.

You handle:

- Sanitizing every value that reaches `v-html`, `V.fromHtml`, `.html()`, or an HTML swap
  from an HTTP directive.
- Escaping data that a server template interpolates into any HTML attribute.
- Server-side validation. `forms/validate.ts` improves the user experience; it is not a
  security boundary, because everything it does can be bypassed with the developer console.
- Authentication and authorization, entirely server-side.
- Choosing what goes into `V.config.globals`. Add values, not capabilities.
- Auditing plugins. A plugin receives `V` and can register a directive, replace an HTTP
  interceptor, or add a global. `usePlugin` does not sandbox anything. See
  [docs/plugin-spec.md](docs/plugin-spec.md).
- Setting a Content Security Policy, and deciding between `'unsafe-inline'` in `style-src`
  and `data-no-styles`.
- Serving over HTTPS. Subresource Integrity on the CDN tag is recommended:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.4/dist/voodoo.full.min.js"
          integrity="sha384-..."
          crossorigin="anonymous"
          defer></script>
  ```

  Pin an exact version. A floating tag combined with SRI will break on the next release,
  and without SRI it is a supply-chain risk.

### 2.12 Non-goals

Stated so that nobody expects them:

- **Voodoo.js is not a sandbox for untrusted expressions.** The evaluator restricts what a
  developer's own expressions can reach; it is not designed to safely run attacker-supplied
  expression text.
- **Voodoo.js does not sanitize HTML.** Use a dedicated sanitizer.
- **Client-side validation is not authorization.**
- **There is no built-in protection against a malicious plugin.**

---

## Part 3: Dependencies

Voodoo.js ships **zero runtime dependencies**. Everything in the published bundles is
project code, which means there is no transitive supply chain at runtime.

Development dependencies (`jsdom`, `prettier`, `tsup`, `typescript`, `vitest`) never reach
the published `dist/`. `packages/voodoojs/package.json` restricts the published files to
`dist` and `README.md`.

To verify a published bundle:

```bash
npm pack voodoojs@0.12.4
grep -c "eval(\|new Function" package/dist/voodoo.min.js   # expect 0
```

---

## Related documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - the parser pipeline in context
- [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) - which APIs are used and where
- [docs/seguranca.md](docs/seguranca.md) - the same model in Portuguese
- [docs/en/security.md](docs/en/security.md) - the practical guide for application authors
