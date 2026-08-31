# Voodoo.js

**The HTML-first JavaScript framework.** Build reactive applications directly in HTML.

No mandatory build step · No runtime dependencies · No Virtual DOM · No configuration required

---

## Install

```bash
npm install voodoojs
```

Or drop it into a page, with nothing else:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>

<div v-data="{ count: 0 }">
  <button @click="count++">Clicked { count } times</button>
</div>
```

That page is a complete application. There is no build step, no bundler and no configuration.

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

## Builds

| File | What it carries |
| --- | --- |
| `dist/voodoo.core.min.js` | Reactivity, expressions, DOM engine, components, core directives |
| `dist/voodoo.min.js` | The above plus forms, validation, masks, UI and HTTP. Served by default on the CDN |
| `dist/voodoo.full.min.js` | Everything: charts, motion, router, i18n, sound and the devtools inspector |

Module entry points are also published for bundlers:

```js
import { reactive } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
```

TypeScript definitions ship with the package.

## Documentation

Full documentation, guides, examples and the API reference live in the repository:

**https://github.com/kwy404/Voodoo.js**

The documentation is written in Portuguese under `docs/`, with an English set under `docs/en/`.

## License

MIT

*JavaScript feels like magic.*
