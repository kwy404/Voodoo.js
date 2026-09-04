# Installation

There are three ways: CDN, npm, and direct download. All deliver the same library.

## CDN, the shortest way

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
```

That's it. On load, the library publishes `window.V` (and `window.Voodoo`, the same object), applies
the saved theme, applies the saved palette, and walks `document.body` initializing `v-*` attributes
as soon as the DOM is ready.

For the full build, with charts, animations, router, languages, inspector, and ready-made
components:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>
```

`unpkg` also works:

```html
<script src="https://unpkg.com/voodoojs/dist/voodoo.min.js" defer></script>
```

Pin the version in production so a new release never changes your page without warning:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.11.2/dist/voodoo.full.min.js" defer></script>
```

## Which bundle to choose

| | `voodoo.min.js` | `voodoo.full.min.js` |
| --- | --- | --- |
| Approximate size | 75 KB gzip | 120 KB gzip |
| Reactivity, directives, components | yes | yes |
| Chainable DOM (`V('#app')`) | yes | yes |
| Declarative HTTP and `V.http` | yes | yes |
| Forms, validation, masks | yes | yes |
| Interface: modal, tabs, drawer, tooltip, command palette | yes | yes |
| Drag and drop | yes | yes |
| Notifications, dialogs, storage, color palette | yes | yes |
| SVG charts (`v-chart`) | no | yes |
| Spring animations (`v-motion`, `V.animate`) | no | yes |
| Router (`v-link`, `v-router-view`) | no | yes |
| Languages (`v-t`, `$t`) | no | yes |
| `xray` inspector | no | yes |
| 29 ready-made components (`VButton`, `VCard`, ...) | no | yes |

Practical rule: start with the essential. Switch to the full one the day you need a chart,
a route, or the ready-made components.

## npm

```bash
npm install voodoojs
```

Importing the package doesn't touch the DOM. You decide when to start:

```js
import V from 'voodoojs';

V.start();
```

You can also import only what you use, with tree shaking:

```js
import { reactive, watch } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
import { debounce, formatCurrency } from 'voodoojs/utils';
```

Or grab loose names from the main package:

```js
import { reactive, http, toast, store, validate, animate } from 'voodoojs';
```

Published entry points:

| Import | Content |
| --- | --- |
| `voodoojs` | Complete `V` object and all re-exports |
| `voodoojs/reactivity` | `reactive`, `ref`, `computed`, `effect`, `watch`, `nextTick`, `EffectScope` |
| `voodoojs/http` | `http`, `request`, `HttpError` |
| `voodoojs/utils` | `debounce`, `throttle`, formatters, array and text utilities |
| `voodoojs/dist/voodoo.min.js` | Browser file, if you want to serve it yourself |

The package publishes ESM (`import`), CJS (`require`), and TypeScript types.

## Direct download

Download `dist/voodoo.min.js` (or `dist/voodoo.full.min.js`), place it next to your HTML, and point
to it:

```html
<script src="/js/voodoo.min.js" defer></script>
```

Each file comes with its corresponding `.map`. Copy both if you want to debug the original code.

## Script tag configuration

The fastest way to configure is with attributes on the tag itself, without writing JavaScript:

```html
<script
  src="voodoo.min.js"
  data-base-url="https://api.example.com"
  data-locale="en-US"
  defer
></script>
```

| Attribute | Effect |
| --- | --- |
| `data-manual` | Does not start on its own. You call `V.start()` when you want |
| `data-defer-init` | Same as `data-manual` |
| `data-prefix` | Changes the attribute prefix, for example `data-v-` |
| `data-base-url` | Base URL for `V.http` and HTTP directive requests |
| `data-locale` | Locale used by date, number, and currency formatters |
| `data-devtools` | Enables detailed console warnings |
| `data-no-styles` | Does not inject interface component CSS |
| `data-no-observer` | Disables the `MutationObserver` that initializes HTML created later |
| `data-keep-attributes` | Keeps `v-*` attributes in HTML after processing |

## JavaScript configuration

To adjust before the first render, use `data-manual` and configure manually:

```html
<script src="voodoo.min.js" data-manual></script>
<script>
  V.config.prefix = 'data-v-';
  V.config.locale = 'en-US';
  V.config.currency = 'USD';
  V.config.globals.formatSlug = (text) => text.toLowerCase();
  V.http.setBaseURL('https://api.example.com');
  V.start();
</script>
```

All `V.config` options:

| Option | Default | What it does |
| --- | --- | --- |
| `prefix` | `'v-'` | Attribute prefix |
| `autoStart` | `true` | Starts the library when the script loads |
| `autoDiscover` | `true` | Watches the DOM and initializes elements created later |
| `root` | `null` | Observed root. No value means `document.body` |
| `devtools` | `false` | Detailed console warnings and named anchor comments |
| `baseURL` | `''` | Base URL for declarative requests |
| `globals` | `{}` | Extra values released inside expressions |
| `locale` | browser language | Locale of formatters |
| `currency` | `'USD'` | Default currency for formatters |
| `injectStyles` | `true` | Injects interface component CSS |
| `cleanAttributes` | `true` | Removes `v-*` attributes from HTML after processing |

## Valid prefix for strict HTML

If your HTML validator complains about `v-text`, change the prefix:

```html
<script src="voodoo.min.js" data-prefix="data-v-" defer></script>
```

```html
<div data-v-data="{ n: 0 }">
  <button data-v-click="n++">Add</button>
  <b data-v-text="n"></b>
</div>
```

The library always accepts `data-v-name`, even when the configured prefix is something else. The
shortcuts `:attribute` and `@event` keep working in both modes.

## Avoiding content flash

While the library hasn't started, raw HTML appears on screen for an instant. Use `v-cloak` with
a CSS rule:

```html
<style>
  [v-cloak] { display: none !important; }
</style>

<div v-cloak v-data="{ loading: true }">
  <p>{ loading ? 'Loading...' : 'Ready' }</p>
</div>
```

The `[v-cloak]` CSS comes built-in to the tokens injected by the library, but declaring it in your
own file ensures the rule exists before the first frame.

## Checking if it worked

```html
<script>
  document.addEventListener('voodoo:ready', (e) => {
    console.log('Voodoo', V.version, 'started at', e.detail.root);
  });
</script>
```

## CLI

The `voodoojs-cli` package builds custom bundles with only the modules you use:

```bash
npx voodoojs-cli init            # creates a new project ready to use
npx voodoojs-cli build           # builds a bundle choosing modules one by one
npx voodoojs-cli add card        # copies a component into your project
npx voodoojs-cli info            # shows what's installed and the size of each module
```

---

Previous: [Introduction](introducao.md) · Next: [Quick Start](inicio-rapido.md)
