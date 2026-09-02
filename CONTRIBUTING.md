# Contributing to Voodoo.js

Thank you for wanting to help. This file is the quick reference. The narrative guide with more
examples is in [docs/contribuindo.md](docs/contribuindo.md).

## Getting Started

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js
npm install
npm test
```

Requirements: Node 18 or newer, and npm. CI runs on Node 20 and 22.

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Runs the full suite with Vitest |
| `npm run test:watch` | Runs in watch mode |
| `npm run coverage` | Runs with coverage report |
| `npm run typecheck` | Checks types with `tsc --noEmit` |
| `npm run build` | Generates bundles with tsup |
| `npm run dev` | Build in watch mode |
| `npm run size` | Measures bundles and fails if any exceed the target |
| `npm run quality` | Runs twelve criteria and writes `QUALITY_REPORT.md`. Checks live in `scripts/quality/` and are still being completed; checks not yet implemented report `SKIP` |
| `npm run serve` | Starts a local server for examples |
| `npm run format` | Applies Prettier |

To run benchmarks:

```bash
node benchmarks/run.mjs
```

## Code Map

```
packages/voodoojs/src/
├── parser/      lexer, Pratt parser, tree interpreter
├── reactivity/  Proxy, effects, scopes, scheduler
├── runtime/     walker, scopes, components, registry, boot, magics
├── directives/  core, http, forms, ui, state, dnd
├── http/ store/ storage/ forms/ ui/ dom/ router/ i18n/ motion/ charts/ sound/ devtools/ utils/
├── core.ts      assembles the V object
└── index.ts essential.ts minimo.ts browser*.ts   entry points
```

The full picture, with the upgrade path and module boundaries, is in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Repository Rules

- Brazilian Portuguese in code comments and documentation in `docs/`.
- English in root files (`ARCHITECTURE.md`, `CONVENTIONS.md`, `SECURITY.md`,
  `BROWSER_SUPPORT.md`, `QUALITY.md`, `ROADMAP.md`, `README.pt-BR.md`) and in `docs/en/`.
- **Never use dashes.** Not `—` nor `–`. Use commas, colons, or periods instead.
- Strict TypeScript, no implicit `any`, with JSDoc on exported functions.
- Zero external runtime dependencies.
- Never use `eval` or `new Function`.
- No empty files, empty functions, or placeholders.
- All injected CSS must work in light and dark themes and respect
  `prefers-reduced-motion`.
- All UI components must handle ARIA roles, focus, and keyboard navigation.
- Never write bundle size numbers, benchmark numbers, or test count numbers directly in
  documentation. Point to `npm run size`, `benchmarks/`, and `npm test` instead.

Public API naming conventions, stability levels, and deprecation policy are in
[CONVENTIONS.md](CONVENTIONS.md).

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat` `fix` `perf` `refactor` `docs` `test` `build` `ci` `chore`.

Scopes follow the folders in `src/`: `reactivity`, `parser`, `runtime`, `walker`,
`component`, `directives`, `http`, `forms`, `ui`, `router`, `i18n`, `motion`, `charts`,
`store`, `storage`, `dom`, `utils`, `devtools`, `build`, `docs`.

Subject in imperative mood, lowercase, no period, up to 72 characters.

A breaking change includes `!` after the scope **and** a `BREAKING CHANGE:` footer:

```
feat(component)!: remove `destroyed` hook

BREAKING CHANGE: `destroyed` no longer runs. Use `unmounted`, which has fired
alongside it since 0.1.0.
```

## How to Add a Directive

Before writing code, check the "don't turn everything into an attribute" rule in
[CONVENTIONS.md](CONVENTIONS.md). A directive only exists when it solves a real
declarative problem.

1. **Choose the file.** `directives/core.ts` for fundamentals,
   `directives/ui.ts` for UI, `directives/forms.ts` for forms,
   `directives/http.ts` for requests, `directives/state.ts` for state,
   `directives/dnd.ts` for drag and drop. A large feature deserves its own module.

2. **Register it.**

   ```ts
   import { defineDirective, PRIORITY } from '../runtime/registry';

   defineDirective(
     'my-thing',
     ({ el, scope, expression, arg, modifiers, evaluate, effect, cleanup, walk }) => {
       effect(() => {
         el.dataset.value = String(evaluate());
       });

       const onClick = () => { /* ... */ };
       el.addEventListener('click', onClick);
       cleanup(() => el.removeEventListener('click', onClick));
     },
     { priority: PRIORITY.DEFAULT, terminal: false }
   );
   ```

3. **Use `ctx.effect` and `ctx.cleanup`.** Effects created with `ctx.effect` belong to
   the element's scope and die with it. Any listener, timer, or observer you create
   outside of `ctx.effect` needs `ctx.cleanup`.

4. **Read attributes with `readAttr`, never `getAttribute`.** After mounting,
   `v-*` attributes are removed from the HTML by automatic cleanup. Use `readAttr` and `hasAttr` from
   `runtime/walker.ts`, or `attrOf` and `readOption` from `directives/shared.ts`.

5. **Do not query elements by attribute selector.** `querySelectorAll('[v-tab]')` stops
   working for the same reason. Use `queryDirective`, `hasDirective`, and `closestDirective`.

6. **An attribute that only configures another directive** uses `defineOption('my-thing-position')`,
   and is documented as an option, not a directive.

7. **Priority.** Leave it at `PRIORITY.DEFAULT` unless order matters. Directives
   that create scope, that take over the subtree, or that must run last have
   their own constants in `runtime/registry.ts`.

8. **If the directive comes from an optional module**, import the module at the
   right entry point (`core.ts`, `essential.ts`, or `index.ts`), so it enters the right build.

9. **Document it** in `docs/directives.md` and, if it's part of the core, in
   `docs/en/directives.md`.

10. **Test it.**

## How to Add a Test

Tests live in `packages/voodoojs/test/`, running with Vitest over jsdom.

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import V from '../src/index';

describe('v-my-thing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    V.stopObserving();
    V.clearParseCache();
  });

  it('writes value to dataset', async () => {
    document.body.innerHTML = `
      <div v-data="{ n: 1 }">
        <span v-my-thing="n"></span>
      </div>
    `;

    V.start(document.body);
    await V.nextTick();

    const span = document.querySelector('span')!;
    expect(span.dataset.value).toBe('1');
  });

  it('reacts to state change', async () => {
    document.body.innerHTML = `<div v-data="{ n: 1 }"><span v-my-thing="n"></span></div>`;
    V.start(document.body);
    await V.nextTick();

    const scope = V.getScope(document.querySelector('div')!)!;
    scope.data.n = 2;
    await V.nextTick();

    expect(document.querySelector('span')!.dataset.value).toBe('2');
  });
});
```

Time-saving tips:

- Always `await V.nextTick()` after changing state. The scheduler runs on microtasks.
- Clean up between tests: `V.stopObserving()` and `V.clearParseCache()`.
- Remember that jsdom does not have `IntersectionObserver`, `ResizeObserver`, `BroadcastChannel`,
  `matchMedia`, or the Web Animations API. This is intentional: fallback paths stay
  tested each run. Behavior that depends on a real engine needs browser tests, which are still on
  the [ROADMAP.md](ROADMAP.md).
- A bug fix needs a test that fails before the fix.
- Every behavior change needs a test.

## Before Opening a Pull Request

1. `npm test` passes;
2. `npm run typecheck` passes;
3. `npm run build` passes;
4. `npm run size` passes;
5. `npm run quality` did not regress;
6. documentation in `docs/` has been updated, and `docs/en/` as well when the change touches the
   core;
7. `CHANGELOG.md` has the line for your change.

## Release Process

1. Confirm that `main` is green in CI.
2. `npm run quality` and read `QUALITY_REPORT.md`.
3. Update the version in `package.json`, in `packages/voodoojs/package.json`, in the
   `version` constant of `packages/voodoojs/src/core.ts`, and in the banner of
   `packages/voodoojs/tsup.config.ts`. All four must match.
4. Close the section in `CHANGELOG.md`: the version, date, and list of changes by type. Every
   removal must appear with its replacement.
5. `npm run build` and `npm run size`.
6. Check the package contents with `npm pack --dry-run --workspace=voodoojs`.
7. Commit `chore(release): vX.Y.Z`, tag `vX.Y.Z`, push with tags.
8. `npm publish --workspace=voodoojs`.
9. Publish the release on GitHub with the changelog notes and the integrity hash of
   `voodoo.min.js`.

Versioning rules: removing or renaming a `stable` symbol, changing the meaning of an attribute,
changing a `V.config` default, or changing directive priority are `major`. Adding a
directive, component, magic, or `V` member is `minor`. A fix with no API change is
`patch`. The full table is in [CONVENTIONS.md](CONVENTIONS.md).

While the version is `0.x`, `minor` releases may break compatibility.

## Reporting Bugs

Open an issue with the bug template. You need a single-page HTML that reproduces the
problem, what you expected, what happened, the library version, the browser, and which
bundle you use.

## Proposing Features

Open a feature proposal issue before writing code. Explain the problem before the solution.
What is already planned is in [ROADMAP.md](ROADMAP.md), including what is explicitly
out of scope.

## Security

Do not open a public issue. Use GitHub's private security report:
<https://github.com/kwy404/Voodoo.js/security/advisories/new>. The full procedure is
in [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree
to respect it.

## License

By contributing, you agree that your contribution is licensed under the project's MIT
license.
