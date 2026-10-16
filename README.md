<div align="center">

<a href="https://kwy404.github.io/Voodoo.js/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg" alt="Voodoo.js: JSX in plain HTML, no build step" width="760">
  </picture>
</a>

### JSX in plain HTML. No build step.

Write JSX and reactive attributes in a `.html` file, open it in the browser, and it runs.

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/voodoojs.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFB35C.svg)](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)

**[Website](https://kwy404.github.io/Voodoo.js/) · [Learn in 10 minutes](https://kwy404.github.io/Voodoo.js/learn.html) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [Docs](https://kwy404.github.io/Voodoo.js/docs/) · [Examples](https://kwy404.github.io/Voodoo.js/examples/) · [Português](https://github.com/kwy404/Voodoo.js/blob/main/README.pt-BR.md)**

</div>

## A first page

Save this as `index.html` and open it. There is nothing to install and nothing to build.

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.1.0/dist/voodoo.full.min.js" defer></script>
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

</body>
</html>
```

The same runtime reads attributes, and the two styles mix freely on one page:

```html
<div v-data="{ count: 0 }">
  <button @click="count--">-</button>
  <strong>{ count }</strong>
  <button @click="count++">+</button>
</div>
```

New to it? The **[10 minute lesson](https://kwy404.github.io/Voodoo.js/learn.html)** walks through state,
events, `v-model`, `v-if`, `v-for`, JSX and fetching data in a live editor.

## What it is

- **No toolchain.** The file you edit is the file the browser runs, even straight from your disk.
- **Fine-grained reactivity.** A change updates only the DOM nodes that read it. There is no virtual DOM.
- **No eval.** Expressions go through a parser and an interpreter, so pages run under a strict Content
  Security Policy.
- **In the box.** Components, HTTP, forms and validation, masks, a router, i18n, animation, charts and
  ready-made UI components, with no runtime dependencies.
- **TypeScript.** The source is TypeScript and every entry point ships declarations.

**The honest cost.** A compiler turns JSX into DOM calls ahead of time; Voodoo reads it at runtime, so a
compiled framework is faster at raw updates and ships less code. The
[benchmarks](https://github.com/kwy404/Voodoo.js/tree/main/benchmarks) show where and by how much. Voodoo
suits server-rendered pages, admin panels, content sites, prototypes, and pages where a build step costs
more than it gives.

## Install

**From a CDN:**

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@1.1.0/dist/voodoo.full.min.js" defer></script>
```

The library starts itself once the page is ready.

**From npm**, for a bundler or a server-rendered app:

```bash
npm install voodoojs
```

```js
import V from 'voodoojs'
V.start()
```

**Which file?**

| File | What it has |
| --- | --- |
| `voodoo.core.min.js` | Reactivity, expressions, directives, components and declarative requests |
| `voodoo.min.js` | Adds forms, validation, masks, UI directives and drag and drop |
| `voodoo.full.min.js` | Adds JSX in HTML, charts, motion, the router, i18n and 29 ready-made components |

JSX in HTML needs the full build. Sizes are in the
[bundle report](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md).

## A bit more

A request with its loading and error state, and a form that validates and submits, with no script:

```html
<div v-resource="users: /api/users">
  <p v-if="users.loading">Loading...</p>
  <p v-else-if="users.error">{ users.error.message }</p>
  <ul v-else>
    <li v-for="user in users.data" :key="user.id">{ user.name }</li>
  </ul>
</div>

<form v-submit="/api/users" v-method="POST" v-validate v-toast-success="User created">
  <input name="email" type="email" v-required v-email>
  <button type="submit" :disabled="$form.loading">Save</button>
</form>
```

When HTML is not enough, the `V` object offers the same from JavaScript: `V.reactive`, `V.component`,
`V.http`, `V.store` and `V.router`.

## Command line

```bash
npx voodoojs-cli init my-page                          # a ready-to-open page
npx voodoojs-cli add card                              # copy a component into your project
npx voodoojs-cli build --modules=core,directives,http  # a bundle with only what you use
```

Every command: [`packages/cli/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/packages/cli/README.md).

## Documentation

- **[The documentation site](https://kwy404.github.io/Voodoo.js/docs/)**: the guide, the reference and
  live examples.
- **[The playground](https://kwy404.github.io/Voodoo.js/playground.html)**: five starters and more than a
  hundred examples to edit in the browser.
- In this repository: [`docs/`](https://github.com/kwy404/Voodoo.js/tree/main/docs),
  [`ARCHITECTURE.md`](https://github.com/kwy404/Voodoo.js/blob/main/ARCHITECTURE.md),
  [`CHANGELOG.md`](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md) and
  [`ROADMAP.md`](https://github.com/kwy404/Voodoo.js/blob/main/ROADMAP.md).

## Contributing

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install
npm test            # the test suite
npm run typecheck   # types
npm run build       # every bundle
npm run serve       # the website and examples on a local server
```

Every bug fix ships with a regression test. The details are in
[`CONTRIBUTING.md`](https://github.com/kwy404/Voodoo.js/blob/main/CONTRIBUTING.md), and everyone is
expected to follow the [`CODE_OF_CONDUCT.md`](https://github.com/kwy404/Voodoo.js/blob/main/CODE_OF_CONDUCT.md).

## More from kwy404

[Monsoon](https://github.com/kwy404/monsoon),
[breakhound](https://github.com/kwy404/breakhound),
[vueleap](https://github.com/kwy404/vueleap),
[graphemely](https://github.com/kwy404/graphemely),
[numberparrot](https://github.com/kwy404/numberparrot),
[edgegoat](https://github.com/kwy404/edgegoat),
[cookieowl](https://github.com/kwy404/cookieowl),
[installkite](https://github.com/kwy404/installkite),
[a11ymedic](https://github.com/kwy404/a11ymedic),
[fontsketch](https://github.com/kwy404/fontsketch) and
[kastor](https://github.com/kwy404/kastor).

## Author

Made by **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).
The [website](https://kwy404.github.io/Voodoo.js/) is built with [Monsoon](https://kwy404.github.io/monsoon/),
and its interactive parts are built with Voodoo.js.

## License

[MIT](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)
