# voodoojs-cli

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
```

`init` works anywhere. **`build`, `add` and `info` read the library's own source,
so they need `voodoojs` present in the project:**

```bash
npm install voodoojs
npx voodoojs-cli info
```

Run inside the Voodoo.js repository, they find the workspace copy instead.

## build

Assembles a bundle from the modules you name, with esbuild.

```bash
npx voodoojs-cli build --modules=core,directives
npx voodoojs-cli build --modules=core,directives,http,forms --out=dist/app.js
```

The point is size. The published `voodoo.min.js` is 83 KB gzipped and the full
build is 130 KB, because they carry everything. A page that only needs
reactivity and a few directives does not have to pay for charts, the router and
the inspector.

Run `npx voodoojs-cli info` to see what each module costs before choosing.

## Requirements

Node 18 or newer. `esbuild` is the only dependency, and only `build` uses it.

## Links

- [Website](https://kwy404.github.io/Voodoo.js/)
- [Documentation](https://kwy404.github.io/Voodoo.js/docs/)
- [Playground](https://kwy404.github.io/Voodoo.js/playground.html)
- [The library on npm](https://www.npmjs.com/package/voodoojs)

## License

MIT
