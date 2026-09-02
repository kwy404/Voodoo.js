# Contributing

Thank you for wanting to help. This guide covers how to run the project, what we expect from a change and
how to submit it.

The summary in four commands:

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Requirements

- Node 18 or newer. CI runs on 20 and 22.
- npm. The project uses npm workspaces.

## Running

```bash
git clone https://github.com/voodoojs/voodoo.git
cd voodoo
npm install
```

| Command | What it does |
| --- | --- |
| `npm test` | Runs the entire suite with Vitest |
| `npm run test:watch` | Runs in watch mode |
| `npm run coverage` | Runs with coverage report |
| `npm run typecheck` | Checks types without generating files |
| `npm run build` | Generates all bundles in `packages/voodoojs/dist` |
| `npm run dev` | Build in watch mode |
| `npm run size` | Measures bundles and fails if any exceed the target |
| `npm run serve` | Starts a local server to open the examples |
| `npm run format` | Applies Prettier |

To see a change working in the browser:

```bash
npm run build
npm run serve
```

## Structure

```
packages/voodoojs/src/
  reactivity/index.ts     reactive, ref, computed, effect, watch, nextTick, EffectScope
  parser/lexer.ts         tokenize
  parser/parser.ts        parse, with cache
  parser/interpreter.ts   evaluate, stringify, allowedGlobals
  runtime/scope.ts        Scope, magic, magics
  runtime/registry.ts     config, defineDirective, PRIORITY, components, directives
  runtime/walker.ts       walk, destroy, addCleanup, evaluateIn, findScope, parseAttribute
  runtime/component.ts    defineComponent, mountComponent
  runtime/magics.ts       $screen, $network, $clipboard and magic registry
  dom/query.ts            chainable collection
  dom/style.ts            injectStyle, ensureTokens
  dom/transition.ts       enter, leave, slideUp, slideDown, fadeIn, fadeOut, viewTransition
  http/index.ts           HTTP client
  store/index.ts          store, allStores
  storage/index.ts        storage, session, cookie, url, cache, theme
  forms/validate.ts       validation engine
  forms/mask.ts           masks
  directives/core.ts      v-text, v-html, v-show, v-if, v-for, v-model, v-bind, v-on
  directives/http.ts      v-get, v-post, v-resource and friends
  directives/forms.ts     v-submit, v-upload, v-dropzone, v-autosave, v-guard
  directives/ui.ts        declarative UI
  directives/dnd.ts       drag and drop
  directives/shared.ts    common base for UI directives
  directives/state.ts     v-persist, v-sync, v-history
  ui/toast.ts             notifications
  ui/dialog.ts            modal, alert, confirm, prompt
  ui/palette.ts           OKLCH palette generation
  ui/components.ts        29 ready-made components
  motion/index.ts         animations
  charts/index.ts         SVG charts
  router/index.ts         router
  i18n/index.ts           languages
  devtools/bus.ts         event bus
  devtools/xray.ts        visual inspector
  utils/index.ts          pure utilities
  core.ts                 builds the V object
  essential.ts            essential build
  index.ts                complete build for bundlers
  browser.ts              entry for complete browser build
  browser-essential.ts    entry for essential browser build
  bootstrap.ts            script tag config reading and startup
```

`packages/cli` brings the command line: `voodoo init`, `build`, `add` and `info`.

## Repository style rules

These rules apply to all code and all documentation:

- **Brazilian Portuguese** in comments and documentation;
- **never use em dash.** Not `—` nor `–`. Use comma, colon or period;
- **strict TypeScript**, no implicit `any`, with JSDoc on exported functions;
- **zero runtime external dependencies**;
- **never use `eval` or `new Function`**;
- **no empty files, empty functions or placeholders**;
- all injected CSS must work in light and dark themes and respect
  `prefers-reduced-motion`;
- every UI component must care for ARIA roles, focus and keyboard.

Prettier handles formatting:

```bash
npm run format
```

## Writing a directive

```ts
import { defineDirective, PRIORITY } from '../runtime/registry';

defineDirective(
  'my-directive',
  ({ el, scope, expression, arg, modifiers, evaluate, effect, cleanup, walk }) => {
    effect(() => {
      el.textContent = String(evaluate());
    });
    cleanup(() => {
      // undo everything the directive created
    });
  },
  { priority: PRIORITY.DEFAULT, terminal: false }
);
```

Three points that review always checks:

1. **cleanup.** Every listener, observer and timer needs to be removed in `cleanup`.
2. **reading attributes after mounting.** `v-*` attributes leave the HTML, so use
   runtime read functions that consult the cache, never `el.getAttribute` inside an
   event handler or an effect that runs later.
3. **accessibility.** If the directive creates UI, it cares for ARIA, focus and keyboard.

The registered name doesn't include the prefix, and can't collide with already occupied names. See the list
in [Plugins](plugins.md).

## Tests

Tests live in `packages/voodoojs/test`, run with Vitest in jsdom environment, and are written in
Portuguese.

```ts
import { describe, it, expect } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/directives/core';

function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

describe('my directive', () => {
  it('writes the value to the element', async () => {
    const root = mount('<b v-my-directive="value"></b>', { value: 'hi' });
    await nextTick();
    expect(root.querySelector('b')!.textContent).toBe('hi');
  });
});
```

Every behavior change needs a test. Bug fixes need a test that fails
before the fix.

## Size

The project has a size target per bundle, declared in `scripts/size.mjs`. CI runs:

```bash
npm run size
```

and fails when any file exceeds the limit. If your change increases size significantly,
explain why in the pull request. Large features should enter only the complete build,
not the essential one.

## Documentation

Documentation lives in `docs/`. When changing a public API:

- update the guide for that area;
- update the table in `docs/api.md`;
- add a line to `CHANGELOG.md`;
- verify that every new example actually works.

An example that doesn't run is worse than no example.

## Commits

Short message, in imperative, in Portuguese:

```
Adiciona v-clipboard-read para ler a area de transferencia
Corrige v-for que perdia foco ao reordenar sem chave
Documenta os modificadores de v-model
```

Don't use em dash in the message.

## Pull requests

Before opening:

1. `npm test` passes;
2. `npm run typecheck` passes;
3. `npm run build` passes;
4. `npm run size` passes;
5. documentation was updated;
6. `CHANGELOG.md` has the change line.

In the description, tell what changes and why. If the change is visual, include an image or minimal HTML
that demonstrates it.

Large changes are better when they start with a proposal issue. It's frustrating to write
a thousand lines and discover the direction doesn't match the project.

## Reporting bugs

What really helps:

- HTML of a single page that reproduces the problem;
- what you expected and what happened;
- library version, browser and OS;
- which bundle you use, essential or complete;
- the console message, if any.

## Reporting vulnerabilities

Don't open a public issue. Use the private contact indicated in the repository.

## Code of conduct

This project follows the [Code of Conduct](../CODE_OF_CONDUCT.md). By participating, you agree to
respect it.

## License

By contributing, you agree that your contribution is licensed under the project's MIT license.

---

Previous: [FAQ](perguntas-frequentes.md) · [Back to index](README.md)
