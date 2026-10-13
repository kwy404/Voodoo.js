<div align="center">

<a href="https://kwy404.github.io/Voodoo.js/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg" alt="Voodoo.js: JSX in plain HTML, no build step" width="760">
  </picture>
</a>

# voodoojs-cli

**Scaffold, customize and inspect Voodoo.js pages: JSX in plain HTML, no build step.**

[![npm version](https://img.shields.io/npm/v/voodoojs-cli.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs-cli)
[![npm downloads per month](https://img.shields.io/npm/dm/voodoojs-cli.svg?label=downloads&color=CB3837)](https://www.npmjs.com/package/voodoojs-cli)
[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-FFB35C.svg)](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)

**[Website](https://kwy404.github.io/Voodoo.js/) · [Docs](https://kwy404.github.io/Voodoo.js/docs/) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [voodoojs on npm](https://www.npmjs.com/package/voodoojs) · [GitHub](https://github.com/kwy404/Voodoo.js/tree/main/packages/cli)**

</div>

Command line for [Voodoo.js](https://github.com/kwy404/Voodoo.js), the HTML-first
JavaScript framework.

```bash
npx voodoojs-cli init my-page
```

That writes a working page and nothing else: no build step, no config file, no
dependencies to install. Open the file in a browser and it runs.

## Why the name

`npx voodoo` runs a different package. `voodoo` on npm belongs to an unrelated,
abandoned project from 2012 and crashes on any modern Node with
`TypeError: path.existsSync is not a function`. This CLI has always been a
separate thing; it is `voodoojs-cli`, matching `voodoojs`, the library.

## Commands

```bash
npx voodoojs-cli init my-page                          # a ready-to-open project
npx voodoojs-cli build --modules=core,directives,http  # a bundle with only what you use
npx voodoojs-cli add card                              # copy a component into your project
npx voodoojs-cli info                                  # list the modules and their sizes
npx voodoojs-cli --version                             # print the version
```

Installed in a project (`npm install --save-dev voodoojs-cli`), the same commands
run as `npx voodoo init`, `npx voodoo build` and so on.

Every command exits with code 0 on success and 1 on any error, with the error on
stderr, so it can run in scripts and CI. Quote paths that contain spaces:
`npx voodoojs-cli init "my page"`.

## init

```bash
npx voodoojs-cli init my-page
npx voodoojs-cli init .            # in the current folder
npx voodoojs-cli init my-page --force
```

Writes `index.html` and a `README.md`. The page loads the full build of the same
version as the CLI from jsDelivr, so JSX works in it, and comes with a light and
dark theme: a `v-theme-toggle` button, colors for both themes, and a small script
in `<head>` that applies the saved choice (`localStorage`, key `voodoo:theme`)
before the first paint. `init` will not overwrite an existing `index.html` or
`README.md` unless you pass `--force`.

## add

```bash
npx voodoojs-cli add tabs
npx voodoojs-cli add tabs --force   # overwrite components/tabs.html
```

Copies a component into `./components/`. The code is yours from then on: paste
it into a page that loads Voodoo.js and edit it freely. Available components:
`accordion`, `card`, `drawer`, `dropdown`, `modal`, `tabs` and `theme-toggle`.
Run `npx voodoojs-cli --help` to see the list your version ships.

## build

Assembles a bundle from the modules you name, with esbuild.

```bash
npx voodoojs-cli build --modules=core,directives
npx voodoojs-cli build --modules=core,directives,jsx,http,forms --out=dist/app.js
npx voodoojs-cli build --all --format=esm --no-minify
```

| Option | What it does |
| --- | --- |
| `--modules=a,b,c` | The modules to include. `core` and `directives` are always added |
| `--all` | Every module |
| `--out=path.js` | Output file, `voodoo.custom.min.js` by default. A source map is written next to it |
| `--no-minify` | Keeps the code readable |
| `--format=iife\|esm` | `iife` (the default) for a script tag, `esm` for `import` |

Without `--modules` or `--all`, `build` asks in the terminal. In CI, pass one of
them. JSX is the `jsx` module; leave it out and the bundle does not read JSX.

The point is size. The published builds carry everything, and a page that only
needs reactivity and a few directives does not have to pay for charts, the router
and the inspector. Run `npx voodoojs-cli info` to see what each module costs
before choosing.

**`build` compiles the library from its TypeScript source**, so it needs a copy of
`voodoojs` that includes the `src/` folder: inside a clone of the
[repository](https://github.com/kwy404/Voodoo.js), it uses the workspace copy.
When the copy it finds ships only `dist/`, it says so and exits with code 1.

## info

Lists every module with the size of its source and the size of the three
published bundles, raw and gzipped. It looks for `voodoojs` in `node_modules`,
walking up from the current folder; with a copy that ships only `dist/`, it shows
the bundle sizes.

## Requirements

Node 18 or newer; an older Node gets a message saying so instead of a stack
trace. `esbuild` is the only dependency, and only `build` uses it.

## Links

- [Website](https://kwy404.github.io/Voodoo.js/)
- [Documentation](https://kwy404.github.io/Voodoo.js/docs/)
- [Playground](https://kwy404.github.io/Voodoo.js/playground.html)
- [The library on npm](https://www.npmjs.com/package/voodoojs)
- [Main README](https://github.com/kwy404/Voodoo.js#readme)
- [Source of this CLI](https://github.com/kwy404/Voodoo.js/tree/main/packages/cli)
- [Changelog](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md)

## Author

Created by **Alexandre Kohler** ([GitHub](https://github.com/kwy404) and [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).

## License

[MIT](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)
