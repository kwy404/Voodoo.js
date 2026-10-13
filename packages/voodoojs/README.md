<div align="center">

<a href="https://kwy404.github.io/Voodoo.js/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg" alt="Voodoo.js: JSX in plain HTML, no build step" width="760">
  </picture>
</a>

### JSX in plain HTML. No build step.

**Write JSX in a `.html` file, open it in the browser, and it runs. Reactive HTML, components, HTTP, forms and a router in one script tag, with zero runtime dependencies.**

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/voodoojs.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![npm downloads per month](https://img.shields.io/npm/dm/voodoojs.svg?label=downloads&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![npm downloads total](https://img.shields.io/npm/dt/voodoojs.svg?label=total&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![bundle size](https://img.shields.io/github/size/kwy404/Voodoo.js/packages%2Fvoodoojs%2Fdist%2Fvoodoo.full.min.js?branch=main&label=voodoo.full.min.js)](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFB35C.svg)](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6.svg)](https://github.com/kwy404/Voodoo.js/blob/main/docs/en/typescript.md)

**[Website](https://kwy404.github.io/Voodoo.js/) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [Components](https://kwy404.github.io/Voodoo.js/components.html) · [Examples](https://kwy404.github.io/Voodoo.js/examples/) · [Docs](https://kwy404.github.io/Voodoo.js/docs/) · [GitHub](https://github.com/kwy404/Voodoo.js)**

</div>

## The 10 second example

Save this as `index.html` and open it. No bundler, no compiler, no JSX transform.

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
</head>
<body>

{
  const user = 'Ana';
  const fruits = ['apple', 'pear', 'grape'];
}

<h1>Hello, {user}!</h1>

<ul>
  {fruits.map((fruit) => (
    <li>{fruit}</li>
  ))}
</ul>

<div v-data="{ count: 0 }">
  <button @click="count++">Clicked { count } times</button>
</div>

</body>
</html>
```

JSX regions and `v-*` attributes are both reactive and mix freely in one page. Expressions run through a lexer, a Pratt parser and an interpreter, never `eval` or `new Function`, so the library works under a strict Content Security Policy with no `unsafe-eval`.

## Install

**CDN.** The tag above is the whole installation: the library starts itself once the page is ready. It names an exact version, so what you load never changes under you. [unpkg](https://unpkg.com/voodoojs@1.0.0/dist/voodoo.full.min.js) serves the same file. You do not need React, Vue, a bundler or Node.js.

**npm.**

```bash
npm install voodoojs
```

## Usage with a bundler

Importing the package does not touch the DOM. Call `V.start()` to process the page:

```js
import V from 'voodoojs'
V.start()
```

Or use the API directly; everything is also a named export:

```js
import { reactive, computed, effect, http, toast, store, theme } from 'voodoojs'

const state = reactive({ count: 0 })
effect(() => console.log(state.count))
state.count++
```

Entry points, each in ESM and CJS with TypeScript declarations:

| Import | What it is |
| --- | --- |
| `voodoojs` | The whole framework: default export `V` plus every named export |
| `voodoojs/essential` | The essential set, matching `voodoo.min.js` |
| `voodoojs/reactivity` | `reactive`, `ref`, `computed`, `effect`, `watch` and friends, on their own |
| `voodoojs/http` | The HTTP client on its own |
| `voodoojs/utils` | Utility functions (`debounce` and others) |
| `voodoojs/socket` | Realtime: `V.socket` and the `v-socket` / `v-room` directives |
| `voodoojs/gpu` | WebGPU: `V.gpu` and the `v-shader` directive |

The browser bundles are also importable as files, `voodoojs/dist/voodoo.full.min.js` and so on.

## The three builds

For a `<script>` tag, pick a file from `dist/`:

| File | Build | What it includes | JSX in HTML | Gzip |
| --- | --- | --- | --- | ---: |
| `voodoo.core.min.js` | Minimal | Reactivity, expressions, directives, components, DOM engine, declarative requests | No | about 51 KB |
| `voodoo.min.js` | Essential | Minimal plus forms, validation, masks, UI (toast, modal, tabs, dropdowns, tooltips), drag and drop, theme toggle | No | about 88 KB |
| `voodoo.full.min.js` | Full | Essential plus JSX, charts, motion, router, i18n, the `xray` devtools inspector and 29 ready-made components | **Yes** | about 136 KB |

JSX lives only in the full build; with the other two a JSX page shows its source as plain text. Realtime and WebGPU are in none of the three: load `dist/socket.js` or `dist/gpu.js` separately. Sizes move between releases, see the [bundle report](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md).

## What you get

Reactivity, components, a router, HTTP with retry, cache and streaming, forms with validation and masks, stores with persistence, a light and dark theme with three states (`$theme.set('system' | 'light' | 'dark')`), i18n, charts, motion, sound, a devtools inspector, and ready-made components where writing the tag is the whole usage:

```html
<v-button variant="primary">Save</v-button>
<v-input label="Email" type="email"></v-input>
<v-table :columns="cols" :rows="people"></v-table>
```

**Theme.** Three states, and nothing on the page changes until the visitor picks one:

```html
<button v-theme-toggle>Toggle theme</button>        <!-- light and dark -->
<button v-theme-toggle.cycle>Theme</button>         <!-- system, light, dark, system... -->
<button v-theme-toggle:dark>Dark</button>           <!-- also :light and :system -->
<p>{ $theme.current } ({ $theme.resolved } on screen)</p>
```

`V.theme.set('system' | 'light' | 'dark')`, `V.theme.cycle()`, `V.theme.toggle()` and `V.theme.chosen` do the same from code. The choice lands on `<html data-theme>`, is stored under the `localStorage` key `voodoo:theme` (raw or JSON), and the buttons carry `data-voodoo-theme` and `data-voodoo-theme-mode` for styling. The no-flash `<head>` snippet is in the [theming section of the main README](https://github.com/kwy404/Voodoo.js#theming-and-dark-mode).

Once a directive is installed its attribute is read into memory and removed from the document, so the page ends up as ordinary HTML. Turn it off with `V.config.cleanAttributes = false`.

## Performance, honestly

A 1,000-row keyed list, median of 30 samples, every framework bundled production and minified, in jsdom. Lower is better.

| | create 1k | update 1 in 10 | clear 1k |
| --- | ---: | ---: | ---: |
| vanilla JS | 39.51 | 6.65 | 20.04 |
| Preact 10.29.8 | 71.03 | 2.73 | 30.68 |
| **Voodoo.js** | **77.47** | **4.69** | **30.14** |
| Vue 3.5.42 | 78.72 | 14.29 | 32.84 |
| Solid 1.9.15 | 80.13 | 0.90 | 21.85 |
| React 19.2.8 | 81.22 | 4.65 | 33.55 |
| Alpine 3.17.1 | 157.06 | 111.29 | 32.76 |

Hand-written vanilla still builds a list about twice as fast, and Voodoo is by far the largest bundle in that table. If size is your main constraint, Alpine and Preact are the honest recommendation. Method, environment and per-framework adapters: [comparison report](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/comparison.md).

## Documentation

- **[Website and guide](https://kwy404.github.io/Voodoo.js/docs/)**: guide, API reference, a playground with runnable examples and the component gallery, built with Voodoo.js itself.
- **[README on GitHub](https://github.com/kwy404/Voodoo.js#readme)**: directives, components, HTTP, forms, stores, theming, DevTools, benchmarks and comparison.
- **[Getting started](https://github.com/kwy404/Voodoo.js/blob/main/docs/en/getting-started.md)**, **[API reference](https://github.com/kwy404/Voodoo.js/blob/main/docs/en/api-reference.md)**, **[directives](https://github.com/kwy404/Voodoo.js/blob/main/docs/directives.md)**.
- **[voodoojs-cli](https://www.npmjs.com/package/voodoojs-cli)**: `npx voodoojs-cli init my-page` scaffolds a ready-to-open page, `add` copies one of 7 components into your project, and `build` assembles a custom bundle. This package publishes its `src/` folder, so `build` works straight from npm.
- **[Changelog](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md)** and **[issues](https://github.com/kwy404/Voodoo.js/issues)**.

## More projects by kwy404

Other open source tools by the same author.

| | Project | What it does | npm | Docs |
| --- | --- | --- | --- | --- |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/monsoon@main/assets/mascot.svg" alt="Monsoon mascot" width="48"> | **[Monsoon](https://github.com/kwy404/monsoon)** | Utility-first CSS with no build step: a whole accessible theme from one `--seed` color, 116 native components | [![npm](https://img.shields.io/npm/v/monsooncss.svg?label=&color=CB3837)](https://www.npmjs.com/package/monsooncss) | [site](https://kwy404.github.io/monsoon/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/breakhound@main/assets/mascot.svg" alt="breakhound mascot" width="48"> | **[breakhound](https://github.com/kwy404/breakhound)** | Find bugs in any JavaScript library automatically, no tests required | [![npm](https://img.shields.io/npm/v/breakhound.svg?label=&color=CB3837)](https://www.npmjs.com/package/breakhound) | [site](https://kwy404.github.io/breakhound/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/vueleap@main/assets/mascot.svg" alt="vueleap mascot" width="48"> | **[vueleap](https://github.com/kwy404/vueleap)** | Migrate Vue 2 to Vue 3 with one command | [![npm](https://img.shields.io/npm/v/vueleap.svg?label=&color=CB3837)](https://www.npmjs.com/package/vueleap) | [site](https://kwy404.github.io/vueleap/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/graphemely@main/assets/mascot.svg" alt="graphemely mascot" width="48"> | **[graphemely](https://github.com/kwy404/graphemely)** | Truncate, slice and count strings with emoji safely | [![npm](https://img.shields.io/npm/v/%40kwy404%2Fgraphemely.svg?label=&color=CB3837)](https://www.npmjs.com/package/@kwy404/graphemely) | [site](https://kwy404.github.io/graphemely/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/numberparrot@main/assets/mascot.svg" alt="numberparrot mascot" width="48"> | **[numberparrot](https://github.com/kwy404/numberparrot)** | Parse localized numbers and currency strings in any locale | [![npm](https://img.shields.io/npm/v/numberparrot.svg?label=&color=CB3837)](https://www.npmjs.com/package/numberparrot) | [site](https://kwy404.github.io/numberparrot/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/edgegoat@main/assets/mascot.svg" alt="edgegoat mascot" width="48"> | **[edgegoat](https://github.com/kwy404/edgegoat)** | Edge case test inputs for JavaScript | [![npm](https://img.shields.io/npm/v/edgegoat.svg?label=&color=CB3837)](https://www.npmjs.com/package/edgegoat) | [site](https://kwy404.github.io/edgegoat/) |

## Author

Created by **Alexandre Kohler** ([GitHub](https://github.com/kwy404) and [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).

## License

[MIT](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE) © Voodoo.js contributors.

<sub>JavaScript feels like magic.</sub>
