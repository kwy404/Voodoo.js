<div align="center">

<img src="brand/logo/voodoo-logo.svg#gh-light-mode-only" alt="Voodoo.js" width="380">
<img src="brand/logo/voodoo-logo-dark.svg#gh-dark-mode-only" alt="Voodoo.js" width="380">

### The HTML-first JavaScript framework.

**Build reactive applications directly in HTML.**

No mandatory build step · No runtime dependencies · No Virtual DOM · No configuration required

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFB35C.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6.svg)](#typescript)
[![voodoo.min.js](https://img.shields.io/github/size/kwy404/Voodoo.js/packages%2Fvoodoojs%2Fdist%2Fvoodoo.min.js?branch=main&label=voodoo.min.js)](packages/voodoojs/dist/voodoo.min.js)

<img src="brand/mascot/vudu-wave.svg" alt="Vudu, the Voodoo.js mascot" width="120">

*JavaScript feels like magic.*

[Install](#installation) · [Quick start](#quick-start) · [Docs](#documentation) · [Examples](#examples) · [Português](README.md)

</div>

---

## The 30-second version

Save this file. Open it in a browser. It works.

```html
<script src="voodoo.min.js" defer></script>

<div v-data="{ count: 0 }">
  <button @click="count--">-</button>
  <strong>{ count }</strong>
  <button @click="count++">+</button>
</div>
```

No bundler, no `npm install`, no config file, no JSX. Just HTML that thinks.

### The same idea, doing real work

Reactive state, a live HTTP request, a validated form and a toast notification — still one script
tag, still no build step:

```html
<div v-data="{ }">

  <!-- A request with its own loading / error / data state, declared in HTML -->
  <div v-resource="users: /api/users">
    <p v-if="users.loading">Loading…</p>
    <p v-else-if="users.error">{ users.error.message }</p>
    <ul v-else>
      <li v-for="user in users.data" :key="user.id">{ user.name }</li>
    </ul>
    <button @click="users.reload()">Refresh</button>
  </div>

  <!-- A form that validates, submits over AJAX and reports back -->
  <form v-submit="/api/users" v-method="POST" v-validate
        v-toast-success="User created" v-reset-success>
    <input name="name" v-required>
    <input name="email" type="email" v-required v-email>
    <button type="submit" :disabled="$form.loading">
      { $form.loading ? 'Saving…' : 'Save' }
    </button>
  </form>

</div>
```

That is the whole application. There is no companion `app.js` doing the wiring.

## What is Voodoo?

React and Vue start from JavaScript: you describe the UI in a component language, and HTML is what
the framework produces at the end.

**Voodoo starts from HTML.** The page you already have *is* the application. You add attributes to
it, each attribute is bound to reactive state, and when that state changes only the DOM nodes that
depend on it are updated — nothing else is touched, and there is no Virtual DOM in between.

When HTML is not enough, the `V` API is right there: `V.reactive`, `V.component`, `V.http`,
`V.store`, `V.router`, and a chainable DOM collection through `V('#selector')`. You can write an
entire application in JavaScript with `V.createApp().mount('#app')` if you prefer. Same runtime,
and the two modes mix freely in one page.

This is not a "React killer". It is a different starting point for a different kind of project:
server-rendered admin panels, content sites, prototypes, legacy pages, and anything where adding a
build pipeline costs more than the problem you are solving.

## Why Voodoo?

- **HTML-first.** Behavior lives next to the markup it belongs to. One file, not three.
- **Fine-grained reactivity.** Proxy-based `reactive` / `ref` / `computed` / `effect`. A write
  re-runs only the effects that actually read that value.
- **No mandatory build step.** One `<script>` tag is a complete setup. A build is available when
  you want one, never required.
- **Zero runtime dependencies.** The browser bundles ship nothing but Voodoo.
- **Direct DOM updates.** No Virtual DOM, no diff pass, no reconciliation heuristics.
- **Secure expression parser.** Attribute expressions go through a real lexer, a Pratt parser and
  an AST interpreter. No `eval`, no `new Function` — so Voodoo runs under a Content Security
  Policy without `unsafe-eval`.
- **Progressive enhancement.** Voodoo never takes over the page: it enhances the elements you mark
  and leaves the rest alone, so it drops into existing codebases without a rewrite.
- **Batteries included.** Reactivity, components, router, HTTP, forms, validation, masks, UI,
  drag-and-drop, animation, charts, i18n and stores are in the box — not in twelve packages.
- **TypeScript.** The whole source is TypeScript and every entry point ships declarations.
- **Optional tooling.** A CLI exists for scaffolding and custom builds. You never have to use it.

## Two ways to write it

**Mode 1 — HTML.** State declared where it is used:

```html
<div v-data="{ count: 0 }">
  <button @click="count++">Clicked { count } times</button>
</div>
```

**Mode 2 — JavaScript.** The same reactivity engine, driven from your own code:

```js
const state = V.reactive({ count: 0 })
V.effect(() => { document.title = `Count: ${state.count}` })
state.count++
```

## Batteries included

Every row below is part of the shipped runtime.

| Pillar | What you get |
| --- | --- |
| **Reactivity** | `reactive`, `ref`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`, `effectScope`, `flushSync` |
| **Expressions** | Own lexer + Pratt parser + AST interpreter. No `eval`, CSP-friendly |
| **Directives** | Text, conditionals, lists, binding, classes, styles, events, refs, transitions and more |
| **Components** | Props, state, computed, methods, watchers, template, scoped style, named slots, `provide`/`inject`, lifecycle |
| **App mode** | `V.createApp({…}).mount('#app')` with `use`, `provide`, local components and `unmount` |
| **DOM** | Chainable collection via `V('#selector')`, plus transition helpers |
| **HTTP** | Interceptors, timeout, exponential retry, cache, CSRF, upload progress, SSE, NDJSON streaming, offline queue |
| **Declarative requests** | `v-get`/`v-post`/`v-put`/`v-patch`/`v-delete`, `v-resource`, `v-load`, `v-load-visible`, `v-search`, polling |
| **Forms** | AJAX submit, serialization, upload, dropzone, autosave, leave guard, reactive `$form` state |
| **Validation & masks** | Full rule set, async rules, custom rules and messages, input masks |
| **Stores** | `V.store(name, def, { persist })` and the `$store` magic, with optional `localStorage` persistence |
| **Storage** | `storage`, `session`, `cookie`, `cache`, `url`, `theme` |
| **UI** | Toast, modal, alert, confirm, prompt, dialog, command palette, plus directives for tabs, dropdowns, tooltips, drawers, popovers and accordions |
| **Drag and drop** | `v-draggable`, `v-droppable`, `v-sortable`, groups, keyboard support |
| **Router** | History and hash modes, params, query, guards, scroll restoration, view cache, `v-link`, `v-router-view`, dynamic routes |
| **i18n** | Locale messages, `V.t`, `v-t`, pluralization, runtime locale switching |
| **Motion** | Spring physics, stagger, `inView`, scroll progress, presets |
| **Charts** | Rendered as plain SVG, no charting dependency |
| **Realtime** | `V.socket` over native WebSocket and the Socket.IO protocol, public and private rooms, backoff reconnection, heartbeat and a send queue. Declarative via `v-socket`, `v-room` and `v-on-socket:` |
| **GPU** | `V.gpu` over WebGPU with WGSL reflection, plus the `v-shader` directive. Without WebGPU it falls back to the canvas content |
| **Devtools** | `V.xray` reactivity inspector and an event bus |
| **CLI** | `@voodoo/cli`: `init`, `build --modules=…`, `add`, `info` |

## Installation

> **Note on npm.** The `voodoojs` package is not published to the npm registry yet. The npm and CDN
> instructions below are written for the moment it is. Until then use the direct download or a
> local build — both work today.

**Direct download, or build it locally — both work right now**

```bash
curl -O https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.min.js
# or
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install && npm run build   # bundles land in packages/voodoojs/dist/
```

```html
<script src="voodoo.min.js" defer></script>
```

**CDN straight from the repository (works right now)**

```html
<script src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/packages/voodoojs/dist/voodoo.min.js" defer></script>
```

**CDN, npm and ES Modules (once published)**

The npm-backed CDN paths below do not resolve yet, because the package is not on the registry.

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
<script src="https://unpkg.com/voodoojs/dist/voodoo.min.js" defer></script>
```

```js
// npm install voodoojs   (planned, not on the registry yet)
import V from 'voodoojs'
V.start()

// or import only what you need — separate entry points, ESM and CJS, with types
import { reactive, computed } from 'voodoojs/reactivity'
import { http } from 'voodoojs/http'
import { debounce } from 'voodoojs/utils'
```

**CLI**

```bash
npx voodoo init my-page                          # scaffold a ready-to-open project
npx voodoo build --modules=core,directives,http  # custom bundle with only what you use
npx voodoo add card                              # copy a component into your project
npx voodoo info                                  # list modules and their sizes
```

**Which bundle?**

| File | Contents |
| --- | --- |
| `voodoo.core.min.js` | Minimal build: reactivity, expressions, directives, components, DOM, requests |
| `voodoo.min.js` | **Essential build — the default.** Adds forms, validation, masks, UI, drag-and-drop |
| `voodoo.full.min.js` | Everything: charts, motion, router, i18n, devtools, ready-made components |

Sizes are dynamic — see the badge above, or run `npm run size` / `npx voodoo info`.

## Quick start

**State, events and two-way binding.** Interpolation uses single braces: `{ expression }`.
`{{ expression }}` is accepted too, if you are coming from Vue.

```html
<div v-data="{ name: 'World', email: '' }">
  <p>Hello, { name }!</p>
  <button @click="name = 'Voodoo'">Change</button>

  <input v-model="email" type="email">
  <p v-show="email">You typed: { email }</p>
</div>
```

**Conditionals, lists, classes and styles.**

```html
<div v-data="{ status: 'ready', items: ['one', 'two'], width: 60 }">
  <p v-if="status === 'loading'">Loading…</p>
  <p v-else-if="status === 'error'">Something went wrong.</p>
  <p v-else>Done.</p>

  <li v-for="(item, index) in items" :key="index">{ index + 1 }. { item }</li>

  <span :class="{ 'is-active': status === 'ready' }" :style="{ width: width + '%' }"></span>
</div>
```

**HTTP without writing fetch, and a component.**

```html
<button v-get="/api/stats" v-target="#panel" v-swap="innerHTML">Load</button>
<div id="panel"></div>

<script>
  V.component('user-card', {
    props: { name: { type: 'string', default: 'Anonymous' } },
    template: `<div class="card"><strong v-text="name"></strong></div>`
  })
</script>

<user-card name="Ada"></user-card>
```

## Components

A component is a scope with state, methods, computed values, watchers, props, slots and lifecycle
hooks, mounted over an element. No compile step, no single-file component format.

```js
V.component('counter', {
  props: {
    start: { type: 'number', default: 0 },
    label: { type: 'string', required: true }
  },

  state(props) { return { count: props.start } },

  computed: { doubled() { return this.count * 2 } },

  methods: {
    increment() {
      this.count++
      this.emit('changed', this.count)   // a real bubbling CustomEvent
    }
  },

  watch: { count(value) { console.log('now', value) } },

  template: `
    <button @click="increment()">{ label }: { count }</button>
    <small>doubled: { doubled }</small>
    <slot name="footer"></slot>
  `,

  style: `.counter { font-weight: 600 }`,

  mounted() { /* the element is in the DOM */ }
})
```

Three equivalent ways to use it, and listening to what it emits is a plain event listener:

```html
<div v-component="counter" label="Clicks"></div>
<counter label="Clicks" :start="10" @changed="console.log($event.detail)"></counter>
<Counter label="Clicks"></Counter>
```

Static attributes become string props, coerced to the declared `type`. Attributes written with `:`
are reactive bindings evaluated in the parent scope, and so is slot content; named slots are
matched with `slot="name"`. Inside an instance you also get `$el`, `$props`, `$refs`, `$parent`,
`$name`, `$emit`, `$watch` and `$nextTick`, plus `provide` / `inject` for dependency injection.

**App mode** — if you would rather describe the whole application in JavaScript:

```js
V.createApp({
  data: () => ({ n: 0 }),
  computed: { doubled() { return this.n * 2 } },
  methods: { add() { this.n++ } },
  template: `<button @click="add()">Clicks: { n }</button><p>Doubled: { doubled }</p>`
}).mount('#app')
```

`mount` accepts a target that does not exist yet — it waits for it, so there is no race with page
load. `unmount` restores the container's original HTML instead of leaving it empty.

## HTTP

**Declarative.** Attach a request to an element and say where the response goes:

```html
<button v-get="/api/report" v-target="#out" v-swap="innerHTML">Load</button>

<button v-delete="'/api/users/' + user.id"
        v-confirm="Delete this user?"
        v-toast-success="User deleted">Delete</button>

<div v-get="/api/feed" v-trigger="visible" v-poll="30s"></div>

<input v-search="/api/search" v-param="q" v-debounce="300ms" v-target="#results">
```

The URL may be a literal (`/api/users`) or an expression (`'/api/users/' + id`). Supporting
attributes include `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-body`, `v-params`, `v-headers`,
`v-cache`, `v-retry`, `v-timeout`, `v-json-path`, `v-template`, `v-offline-queue`, `v-redirect`,
`v-scroll-to`, `v-toast-success`, `v-toast-error`, `v-on-success`, `v-on-error`, `v-on-complete`.

`v-resource` is the version that hands you the request state as reactive data instead of swapping
HTML. It exposes `data`, `loading`, `error`, `loaded`, `reload()` and `set()` — see the demo at the
top of this file.

**Programmatic.**

```js
const users   = await V.http.get('/api/users')
const created = await V.http.post('/api/users', { name: 'Ada' })

// Full response, with status and headers
const res = await V.http.request({ url: '/api/users', retry: 2, timeout: 5000, cache: 60000 })

// Upload with real progress
await V.http.upload('/api/files', formData, { onProgress: (pct) => console.log(pct + '%') })

// Server-Sent Events and NDJSON streaming
V.http.sse('/api/events', { message: (data) => console.log(data) })
await V.http.stream('/api/tokens', (line) => console.log(line))
```

Defaults, interceptors, base URL, CSRF header and cache all live on `V.http.defaults` and
`V.http.interceptors`.

## Forms

Submit, validate, show loading state and report the result — all declared on the form itself:

```html
<form v-submit="/api/contact" v-method="POST" v-validate
      v-toast-success="Message sent" v-toast-error="Could not send" v-reset-success>

  <input name="name" v-required>
  <input name="email" type="email" v-required v-email>
  <input name="phone" v-mask="phone">
  <textarea name="message" v-minlength="20"></textarea>

  <p v-if="$form.errors.email">{ $form.errors.email }</p>

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Sending…' : 'Send' }
  </button>
</form>
```

`$form` is reactive and carries `loading`, `saving`, `success`, `errors`, `message`, `data`,
`status`, `dirty` and `progress`. The rule set covers the usual ground — `required`, `email`,
`url`, `number`, `min`, `max`, `minlength`, `maxlength`, `between`, `match`, `regex`, `date`,
`same`, `different`, `in`, `strongpassword` and more — plus async rules and your own via
`V.validator()`.

## Building full applications

Voodoo scales past a single page without changing the model.

- **Components** — register once, use as tags anywhere on the page.
- **Stores** — `V.store('cart', { items: [] }, { persist: true })`, read anywhere as `$store.cart`.
- **Router** — `V.router({ mode: 'history', routes: { '/users/:id': { component: 'user-page' } } })`,
  with guards, params, scroll behavior, `v-link` and `v-router-view`.
- **Plugins** — `V.use(plugin)` or `app.use(plugin)` to register directives, components and services.
- **Lazy loading** — `v-load-visible` and route `view` records fetch HTML only when it is needed.
- **i18n** — `V.i18n({ locale: 'en', messages })`, then `v-t` in markup and `V.t()` in code.

Each of these has its own guide in [`docs/`](docs/).

## DevTools

The full build ships `xray`, a visual reactivity inspector: it shows the scope tree, live state,
which effects are running, and the event and network logs.

```js
V.xray()        // toggle the panel
V.xray(true)    // open it
V.xray(false)   // close it

V.enableXrayShortcut()   // install only the shortcut, without opening the panel
```

The first call also installs the `Ctrl+Shift+X` shortcut, so the inspector stays one keystroke
away during development at no cost while nobody presses it.

## Architecture

```
  HTML attributes ─▶  Walker + MutationObserver     finds v-* attributes, builds scopes
                             │
  expressions     ─▶  Lexer → Pratt parser → AST interpreter    no eval, no new Function
                             │
                      Reactivity: Proxy targets + effects       reads tracked, writes queued
                             │
                      Directives update the real DOM nodes      no Virtual DOM, no diff pass

  On top: components · stores · router · HTTP · forms · UI · i18n · motion · charts
```

The long version, including module boundaries and the scope model, is in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Performance

The benchmarks are reproducible: pinned dependency versions, production builds, a published
methodology and a recorded environment. The full write-up — including the cases where Voodoo
*loses* — is in [`benchmarks/README.md`](benchmarks/README.md), along with the methodology, the
environment and how to reproduce every measurement.

Vanilla JavaScript is the ceiling here, and Voodoo charges a real cost for the productivity it
buys. The point of these numbers is to show how large that cost is, not to pretend it is zero.

**Runtime.** <!--BENCH:methodology-caption--> (1,000-row workload; environment, sample count and
statistic are recorded in the report; medians shown).

| | Create 1k rows | Update 1k rows | Swap rows | Select row | Clear rows | Peak memory |
| --- | --- | --- | --- | --- | --- | --- |
| Vanilla JS | <!--BENCH:vanilla-create--> | <!--BENCH:vanilla-update--> | <!--BENCH:vanilla-swap--> | <!--BENCH:vanilla-select--> | <!--BENCH:vanilla-clear--> | <!--BENCH:vanilla-memory--> |
| **Voodoo.js** | <!--BENCH:voodoo-create--> | <!--BENCH:voodoo-update--> | <!--BENCH:voodoo-swap--> | <!--BENCH:voodoo-select--> | <!--BENCH:voodoo-clear--> | <!--BENCH:voodoo-memory--> |
| Alpine.js | <!--BENCH:alpine-create--> | <!--BENCH:alpine-update--> | <!--BENCH:alpine-swap--> | <!--BENCH:alpine-select--> | <!--BENCH:alpine-clear--> | <!--BENCH:alpine-memory--> |
| Vue | <!--BENCH:vue-create--> | <!--BENCH:vue-update--> | <!--BENCH:vue-swap--> | <!--BENCH:vue-select--> | <!--BENCH:vue-clear--> | <!--BENCH:vue-memory--> |
| React | <!--BENCH:react-create--> | <!--BENCH:react-update--> | <!--BENCH:react-swap--> | <!--BENCH:react-select--> | <!--BENCH:react-clear--> | <!--BENCH:react-memory--> |
| Preact | <!--BENCH:preact-create--> | <!--BENCH:preact-update--> | <!--BENCH:preact-swap--> | <!--BENCH:preact-select--> | <!--BENCH:preact-clear--> | <!--BENCH:preact-memory--> |
| Svelte | <!--BENCH:svelte-create--> | <!--BENCH:svelte-update--> | <!--BENCH:svelte-swap--> | <!--BENCH:svelte-select--> | <!--BENCH:svelte-clear--> | <!--BENCH:svelte-memory--> |
| Solid | <!--BENCH:solid-create--> | <!--BENCH:solid-update--> | <!--BENCH:solid-swap--> | <!--BENCH:solid-select--> | <!--BENCH:solid-clear--> | <!--BENCH:solid-memory--> |

**Bundle size**, measured on the committed builds at <!--BENCH:size-commit-->:

| Build | Minified | Gzip | Brotli |
| --- | --- | --- | --- |
| `voodoo.core.min.js` | <!--BENCH:core-min--> | <!--BENCH:core-gzip--> | <!--BENCH:core-brotli--> |
| `voodoo.min.js` | <!--BENCH:essential-min--> | <!--BENCH:essential-gzip--> | <!--BENCH:essential-brotli--> |
| `voodoo.full.min.js` | <!--BENCH:full-min--> | <!--BENCH:full-gzip--> | <!--BENCH:full-brotli--> |

Run them yourself: the harness and the exact versions under test live in
[`benchmarks/`](benchmarks/).

## Comparison

An honest one. Every tool here is good at what it was designed for.

| | Voodoo.js | Alpine.js | HTMX | Vue 3 | React | jQuery |
| --- | --- | --- | --- | --- | --- | --- |
| Starting point | HTML | HTML | HTML | JavaScript | JavaScript | JavaScript |
| Runs from a CDN tag | built-in | built-in | built-in | built-in | built-in | built-in |
| Build step | possible | possible | possible | recommended | recommended | possible |
| Rendering | direct DOM | direct DOM | server HTML | Virtual DOM | Virtual DOM | manual |
| Reactive state | built-in | built-in | — | built-in | built-in | — |
| Components | built-in | via ecosystem package | — | built-in | built-in | — |
| HTTP client | built-in | via ecosystem package | built-in | via ecosystem package | via ecosystem package | built-in |
| Forms + validation | built-in | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package |
| Router | built-in | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package |
| UI (toast, modal, tabs) | built-in | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package |
| Charts / i18n | built-in | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package | via ecosystem package |
| Server-side rendering | — | — | native (the server renders) | built-in | built-in | — |
| Ecosystem size | young | growing | growing | large | very large | very large |

The real difference is philosophical. **HTMX** says the server owns the HTML and the browser just
swaps it in. **Alpine** gives HTML a sprinkle of reactive state and stops there on purpose. **Vue
and React** ask you to describe the UI in JavaScript and generate the HTML. **Voodoo** keeps HTML
as the source of truth *and* gives it the full toolbox — so you rarely have to leave it, and the
`V` API is waiting for the moments when you do.

## When to use Voodoo

Good fits: server-rendered admin panels (Laravel, Rails, Django, Spring, plain PHP); content sites
and landing pages that need behavior without a front-end pipeline; prototypes, where opening a file
beats any architecture; small teams that do not want to maintain a build just to render a table;
legacy pages, where Voodoo coexists with existing code because it never takes over the document;
and full single-page applications, using components, stores and the router.

### Current limitations

Stated plainly, so nothing surprises you later:

- **No server-side rendering or hydration.** Voodoo runs in the browser. The pure modules
  (reactivity, HTTP, utils) work in Node, but there is no hydration story.
- **No mobile-native target.** There is no React Native equivalent.
- **Young ecosystem.** Fewer third-party plugins, integrations and answers online than the
  established frameworks. That gap is real and it takes time to close.
- **Limited third-party integrations.** Component libraries and tooling built for React or Vue do
  not transfer over.
- **No static typing inside templates.** Attribute expressions are strings; mistakes surface at
  runtime, not at compile time.
- **No list virtualization.** `v-for` reuses elements by key, but very large lists still render
  every row.

## Documentation

The documentation exists in two languages: Portuguese under [`docs/`](docs/) (complete) and English
under [`docs/en/`](docs/en/).

| Where | What |
| --- | --- |
| [`docs/`](docs/) | Index of the full guide and reference |
| [`docs/introducao.md`](docs/introducao.md) | What it is, who it is for, when not to use it |
| [`docs/instalacao.md`](docs/instalacao.md) | Bundles, CDN, npm, script-tag configuration |
| [`docs/inicio-rapido.md`](docs/inicio-rapido.md) | From an empty file to a working app |
| [`docs/directives.md`](docs/directives.md) | Full directive reference |
| [`docs/api.md`](docs/api.md) | Full `V` API reference |
| [`site/`](site/) | Source of the documentation website |

## Examples

Every example is a single HTML file you can open directly in a browser. Start at
[`examples/index.html`](examples/index.html).

| Example | What it shows |
| --- | --- |
| [Todo](examples/todo/) | State, lists, editing in place, filters, reordering |
| [CRUD](examples/crud/) | A component, forms, validation, masks, toasts, optimistic updates |
| [Dashboard](examples/dashboard/) | Charts, reactive computed values, periodic refresh |
| [Kanban](examples/kanban/) | Drag and drop between columns, persisted state |
| [Chat](examples/chat/) | Live updates, scroll behavior, message composition |
| [E-commerce](examples/ecommerce/) | Catalog, filters, cart store, checkout flow |
| [Pokédex](examples/pokedex/) | Real API consumption, search, pagination, lazy loading |

## Ecosystem

| Package | Purpose |
| --- | --- |
| [`voodoojs`](packages/voodoojs/) | The framework: runtime, directives, components, HTTP, forms, UI, router, i18n |
| [`@voodoo/cli`](packages/cli/) | Scaffolding, custom builds, component copying, module info |

## TypeScript

The entire source is TypeScript, and every entry point ships `.d.ts` declarations.

```ts
import V, { reactive, computed, type HttpResponse } from 'voodoojs'

const state = reactive({ count: 0 })
const doubled = computed(() => state.count * 2)
```

## Roadmap

The near-term focus is English documentation, more examples, a wider plugin surface and publishing
to npm. The tracked plan lives in [`ROADMAP.md`](ROADMAP.md); shipped changes are recorded in
[`CHANGELOG.md`](CHANGELOG.md).

## Contributing

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install
```

An npm workspaces monorepo: [`packages/voodoojs`](packages/voodoojs/) is the framework,
[`packages/cli`](packages/cli/) is the CLI, plus [`docs/`](docs/), [`site/`](site/) and
[`examples/`](examples/).

| Command | What it does |
| --- | --- |
| `npm test` | Runs the whole suite once (vitest + jsdom) |
| `npm run test:watch` | Same suite, re-running as you edit |
| `npm run coverage` | Test run with a coverage report |
| `npm run typecheck` | `tsc --noEmit` over the framework package |
| `npm run build` | Builds every bundle for `voodoojs` and `@voodoo/cli` |
| `npm run size` | Reports the size of each generated bundle |
| `npm run serve` | Local static server for the examples and the site |
| `npm run format` | Prettier over the repository |

More scripts get added over time — `package.json` at the repo root is the authoritative list.

**The cycle.** Branch off `main`, make the change, run `npm test` and `npm run typecheck` before
opening the PR, and write commit messages in [Conventional Commits](https://www.conventionalcommits.org/)
style (`fix:`, `feat:`, `docs:`). CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs
typecheck, tests, build and the bundle-size check on Node 20 and 22.

**Where things live.** Runtime bug → `src/runtime/`. Reactivity → `src/reactivity/`. Expression
parsing → `src/parser/`. New directive → `src/directives/`. UI component → `src/ui/`. Docs →
`docs/` and `site/docs/`.

### Adding a directive

Internal directives are registered with `defineDirective(name, setup, { priority, terminal })` from
`src/runtime/registry.ts`, in the matching file under `src/directives/`. The `setup` function
receives a `DirectiveContext` with `el`, `scope`, `expression`, `arg`, `modifiers`, `evaluate()`,
`effect()`, `cleanup()` and `walk()`. `priority` orders the run (higher first, see the `PRIORITY`
table); `terminal: true` stops the walker from descending into children, as `v-for` and `v-if` do.

```ts
import { defineDirective } from '../runtime/registry';

// <p v-shout="message">  →  renders the value in upper case
defineDirective('shout', ({ el, effect, evaluate, cleanup }) => {
  effect(() => {
    el.textContent = String(evaluate() ?? '').toUpperCase();
  });

  // Always release what you attach — listeners, timers, observers.
  const onClick = () => el.classList.toggle('loud');
  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));
});
```

That is the internal API. The public one is `V.directive(name, hooks)`, which wraps the same
mechanism in Vue-style lifecycle hooks (`created`, `mounted`, `updated`, `unmounted`) and gives
each hook a `binding` with the evaluated `value`, `oldValue`, `arg` and `modifiers`. Use
`V.directive` from application code; use `defineDirective` inside the framework.

### Adding a test

Tests live in [`packages/voodoojs/test/`](packages/voodoojs/test/) as `*.test.ts`, and run under
vitest with jsdom. A directive test mounts HTML, walks it with a scope, and asserts on the DOM:

```ts
import { describe, it, expect } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

describe('v-shout', () => {
  it('renders the value in upper case', async () => {
    const data = reactive({ message: 'hello' });
    const root = document.createElement('div');
    root.innerHTML = '<p v-shout="message"></p>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    expect(root.textContent).toBe('HELLO');

    data.message = 'bye';
    await nextTick();
    await nextTick();
    expect(root.textContent).toBe('BYE');
  });
});
```

**The golden rule: every bug fix ships with a regression test.** If it broke once it can break
again, and the test is what stops it.

The full detail is in [`CONTRIBUTING.md`](CONTRIBUTING.md), and everyone is expected to follow the
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © Voodoo.js contributors.

---

<div align="center">

**Prefere ler em português?** → [README.md](README.md)

<sub>JavaScript feels like magic.</sub>

</div>
