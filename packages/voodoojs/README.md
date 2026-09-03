# Voodoo.js

**The HTML-first JavaScript framework.** Build reactive applications directly in HTML.

No mandatory build step · No runtime dependencies · No Virtual DOM · No configuration required

[Website](https://kwy404.github.io/Voodoo.js/) ·
[Playground](https://kwy404.github.io/Voodoo.js/playground.html) ·
[Components](https://kwy404.github.io/Voodoo.js/components.html) ·
[Examples](https://kwy404.github.io/Voodoo.js/examples/) ·
[Documentation](https://kwy404.github.io/Voodoo.js/docs/) ·
[GitHub](https://github.com/kwy404/Voodoo.js)

---

## Install

```bash
npm install voodoojs
```

Or drop it into a page, with nothing else:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.7/dist/voodoo.min.js" defer></script>

<div v-data="{ count: 0 }">
  <button @click="count++">Clicked { count } times</button>
</div>
```

That page is a complete application. There is no build step, no bundler and no
configuration. The tag is pinned to the `0.6` line, so patch releases arrive
without an edit; pin the exact version if you would rather approve each one.

## Two ways to write it

HTML, when the declarative form reads better:

```html
<input v-model="search">
<ul>
  <li v-for="user in users" :key="user.id">{ user.name }</li>
</ul>
```

JavaScript, when the logic belongs in JavaScript:

```js
import V, { reactive, effect } from 'voodoojs';

const state = reactive({ count: 0 });
effect(() => console.log(state.count));
state.count++;
```

## What you get

Reactivity, components, a router, HTTP, forms with validation and masks, input
masks, i18n, charts, motion, sound, a devtools inspector, and 29 ready-made
components that need no registration — writing the tag is the whole usage.

```html
<v-button variant="primary">Save</v-button>
<v-input label="Email" type="email"></v-input>
<v-table :columns="cols" :rows="people"></v-table>
```

## No eval, anywhere

Expressions run through a lexer, a Pratt parser and an interpreter, never `eval`
or `new Function`. That is why the library works under a strict Content Security
Policy with no `unsafe-eval`, which a browser test proves by loading it under
`script-src 'self'` and asserting no policy violation is raised.

## It cleans up after itself

Once a directive is installed, its attribute is read into memory and removed from
the document. What ships to the page is ordinary HTML, with no framework residue
in the inspector. Turn it off with `V.config.cleanAttributes = false` if you need
the attributes for something else.

## Builds

| File | What it carries | Gzip |
| --- | --- | --- |
| `dist/voodoo.core.min.js` | Reactivity, expressions, DOM engine, components, core directives | 46 KB |
| `dist/voodoo.min.js` | The above plus forms, validation, masks, UI and HTTP | 83 KB |
| `dist/voodoo.full.min.js` | Everything: charts, motion, router, i18n, sound, devtools | 129 KB |

Module entry points are published for bundlers, in ESM and CJS, with types:

```js
import { reactive } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
```

## Performance

A 1,000-row keyed list, median of 30 samples, against the same document, every
framework bundled production and minified. Lower is better.

| | create 1k | update 1 in 10 | clear 1k |
| --- | ---: | ---: | ---: |
| vanilla JS | 48.74 | 7.52 | 21.06 |
| Preact 10.29.8 | 91.62 | 2.59 | 29.48 |
| **Voodoo.js** | **97.70** | **5.42** | **30.44** |
| React 19.2.8 | 100.23 | 4.63 | 33.59 |
| Vue 3.5.42 | 110.56 | 19.21 | 31.65 |
| Solid 1.9.15 | 111.63 | 0.91 | 19.99 |
| Alpine 3.17.1 | 179.47 | 104.51 | 31.39 |

Read honestly: hand-written vanilla still builds a list twice as fast, and Voodoo
is by far the largest bundle in that table. If size is your main constraint,
Alpine and Preact are the honest recommendation. Method and per-framework
adapters are in the repository.

## Documentation

Everything lives at **[kwy404.github.io/Voodoo.js](https://kwy404.github.io/Voodoo.js/)**:
a guide, an API reference, 13 working example applications, a playground with 26
runnable examples, and the component gallery. The site is built with Voodoo.js
itself and has no build step of its own.

## License

MIT

*JavaScript feels like magic.*
