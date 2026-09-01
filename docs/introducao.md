# Introduction

Voodoo.js is an HTML-first JavaScript framework: you build reactive applications directly in HTML.
Page behavior lives inside the HTML itself. You write attributes, the library connects each one to
reactive state, and the screen updates automatically.

```html
<div v-data="{ name: '' }">
  <input v-model="name" placeholder="Your name">
  <p v-show="name">Hello, { name }!</p>
</div>
```

There's no compilation step, no config file, no JSX. You open the HTML in the browser and it works.

## What comes in the box

The essential build (`voodoo.min.js`) brings:

- reactivity with Proxy and granular effects;
- directives for text, condition, list, form, attribute, class, style, and event;
- components with props, slots, computed, watchers, and lifecycle;
- chainable DOM collection, in the spirit of jQuery;
- declarative HTTP: `v-get`, `v-post`, `v-resource`, and a complete client in `V.http`;
- forms with AJAX submission, validation, masks, upload, and autosave;
- ready-made interface: modal, drawer, tabs, dropdown, tooltip, accordion, command palette;
- drag and drop with mouse, touch, and keyboard;
- notifications, dialogs, storage, and configurable color palette.

The full build (`voodoo.full.min.js`) adds:

- charts in pure SVG;
- animations with spring physics;
- single-page router;
- internationalization;
- reactivity inspector (`xray`);
- 29 ready-made components, from `VButton` to `VCodeBlock`.

## For whom is it

Voodoo.js was made for people building pages that need interactivity without becoming a whole
JavaScript application:

- **admin panels** generated on the server with Laravel, Rails, Django, Spring, or plain PHP;
- **landing pages and content sites** that need some interactivity without loading 200 KB of
  framework;
- **prototypes**, where opening a file and seeing the result is worth more than any architecture;
- **small teams** that don't want to maintain a build pipeline just to show a table;
- **legacy projects**, where the library coexists with existing code, because it never takes over
  the whole page.

## For whom it isn't

It's better to choose another tool when:

- **the app has hundreds of screens and a large team.** Single-file components, nested routing,
  and compile-time type tools are real advantages of Vue, React, and Svelte at that scale.
- **you need server-side rendering with hydration.** Voodoo.js runs in the browser. Pure modules
  (reactivity, HTTP, utilities) work in Node, but there is no hydration.
- **the project depends on a specific ecosystem**, like React Native, React component libraries,
  or testing tools from a particular framework.
- **lists with tens of thousands of rows updating at the same time.** `v-for` reuses elements by
  key, but does not virtualize.
- **you need static typing in templates.** Attribute expressions are text and only fail at
  runtime.

## What makes Voodoo different

**Single-brace interpolation.** `{ variable }` is the standard form. `{{ variable }}` is also
accepted, for those coming from Vue.

**Clean HTML.** After a directive is processed, the `v-*` attribute leaves the document. In the
inspector you see `<button>Save</button>`, not `<button v-click="save()" v-loading="#spin">`.
Behavior keeps working because values are stored in the runtime. This is controlled by
`V.config.cleanAttributes`, on by default. Practical consequence: never write CSS or
`querySelectorAll` relying on selectors like `[v-tab]`.

**No `eval`, no `new Function`.** Expressions go through a hand-written lexer, Pratt parser, and
tree interpreter. The library runs under restrictive Content Security Policy, no `unsafe-eval`.

**Zero runtime dependencies.** No third-party packages are bundled.

**Granular updates.** No Virtual DOM. When `count` changes, only effects that read `count` run
again, and each effect writes only to the node it created.

## Project numbers

| Item | Value |
| --- | --- |
| Essential bundle (`voodoo.min.js`) | about 75 KB gzip |
| Full bundle (`voodoo.full.min.js`) | about 120 KB gzip |
| Runtime dependencies | zero |
| Use of `eval` or `new Function` | none |
| Automated tests | more than 190, all passing |
| Ready-made components | 29 |

Sizes and test counts change with each version. Run `npm run size` and `npm test` in the repository
to see the exact numbers of what you're using.

## Roadmap

These items do not yet exist in the code. They are listed here so no one looks for them in the
documentation thinking they have already been delivered.

- **Server-side rendering and hydration.** Today the library only mounts in the browser.
- **List virtualization.** `v-for` renders all source items.
- **Browser extension for devtools.** The `xray` inspector runs inside the page itself and doesn't
  talk to a dedicated extension.
- **Route transitions with enter and exit control.** The router uses the View Transitions API when
  the browser offers it, but does not expose custom transition classes per route.
- **Nested routes.** `v-router-view` renders a single output, no view hierarchy.
- **Date mask with built-in calendar validation.** `v-mask="date"` formats, and validation is up
  to the `v-date` rule.
- **Ready-made date and upload components.** The library brings `VInput` and `VSelect`, but not yet
  a date picker or visual file manager.
- **Generated types for templates.** Attribute expressions have no static type checking.

Four known details that need fixing, worth remembering meanwhile:

- `v-confirm` on the same element as `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, or
  `v-submit` asks twice. Use `v-confirm` with `v-click`, or ask for confirmation with
  `$confirm(...)` inside the expression itself.
- `v-t-params` is only read on first render. After switching language, prefer reactive
  interpolation `{ $t('items', { n: total }) }`.
- `v-chart-type` and other `v-chart-*` attributes work for static charts. When data is reactive,
  declare everything in the object: `v-chart="{ type: 'bar', data: sales }"`.
- Extra text for `v-confirm` (`v-confirm-title` and such) only works with
  `V.config.cleanAttributes = false`.

---

Previous: [Index](README.md) · Next: [Installation](instalacao.md)
