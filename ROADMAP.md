# Roadmap

The path from `0.1.0` to `1.0`, organized by theme rather than by date. Dates would be
fiction; the themes are real and each item has a status you can check against the
repository.

| Status          | Meaning                                                            |
| --------------- | ------------------------------------------------------------------ |
| `done`          | Shipped and working in the current source tree                      |
| `in progress`   | Being worked on now; partially present in the repository            |
| `investigating` | An open question. May end in "we are not doing this"                |
| `planned`       | Agreed direction, not started                                       |

Nothing here is a promise with a date attached. Items move down the list when the work
lands, not when a milestone passes.

---

## What `1.0` means

`1.0` is not a feature count. It is the point at which:

1. Every public symbol carries a stability tier from [CONVENTIONS.md](CONVENTIONS.md), and
   those tiers become binding under SemVer.
2. The API inconsistencies documented in `CONVENTIONS.md` section 7 are resolved, with
   aliases and deprecation warnings in place.
3. The twelve quality dimensions in [QUALITY.md](QUALITY.md) all report `PASS` or a
   deliberate, documented `WARN`.
4. English documentation covers the same ground as the Portuguese documentation for the
   core surface.

Everything below serves one of those four.

---

## 1. API stabilization

The largest blocker for `1.0`, and the least glamorous.

| Item | Status |
| ---- | ------ |
| Document the naming conventions and the four namespaces (`V.*`, `v-*`, `@`/`:`, `$magic`) | `done` - [CONVENTIONS.md](CONVENTIONS.md) |
| Document the deprecation policy and the alias mechanism | `done` |
| `avisarAlias` helper for once-per-session deprecation warnings in dev mode | `done` - `runtime/avisos.ts` |
| Audit the whole `V.*` surface and catalogue the inconsistencies | `done` - `CONVENTIONS.md` section 7 |
| Tag every exported symbol with `@stability stable` / `experimental` / `internal` | `planned` |
| Resolve `V.validate` vs `V.validateForm` (currently the same function, and the module's real `validateForm` is unreachable from `V`) | `planned` |
| Resolve `V.chart` vs `V.renderChart` (aliases) | `planned` |
| Resolve `V.once` shadowing the `once` utility from `utils/` | `planned` |
| Decide the canonical spelling for component `state` vs `data`, and warn on the alias | `planned` |
| Deprecate the `destroyed` lifecycle hook in favour of `unmounted` (both currently fire) | `planned` |
| Rename `V.data()` so it does not collide with the component `data` option and the `v-data` attribute | `investigating` |
| Freeze `V.config` shape; adding a field becomes minor, changing a default becomes major | `planned` |
| Publish a machine-readable API surface snapshot and diff it in CI | `planned` |

The last item is what makes the *API Compatibility* quality dimension meaningful: without a
recorded baseline there is nothing to compare a release against.

---

## 2. Rendering and reactivity

| Item | Status |
| ---- | ------ |
| Per-key dependency tracking with a microtask scheduler | `done` |
| `EffectScope` ownership so directives never leak listeners | `done` |
| Recursion limit with an actionable console message instead of a frozen tab | `done` |
| Keyed `v-for` with block reuse and cursor-based reordering | `done` |
| Map and Set reactivity | `done` |
| `watch` with `pre` / `post` / `sync` flush | `done` |
| **Getters are flattened by `V.store` and `V.data`** | `planned` - `store/index.ts` copies the definition with `{ ...definition }` and `V.data` uses `Object.assign`. Both **invoke** a getter and store its result, so `get total()` becomes a static value frozen at definition time instead of a live derived one. Getters survive `reactive()` itself, so the fix is to copy property descriptors instead of spreading. Documented as a limitation in [docs/en/state.md](docs/en/state.md) until then. |
| Duplicate-key warning in `v-for` | `in progress` - `avisarChaveDuplicada` exists in `runtime/avisos.ts` and needs wiring into the `v-for` effect |
| A real `v-once` that freezes a subtree | `investigating` - today `v-once` evaluates one expression once and writes `textContent`. It does not skip children, which is what people coming from Vue expect. Either the behaviour or the name should change. |
| `v-memo`-style conditional skipping | `investigating` |
| Fragment support so a component template can have several roots without a wrapper | `investigating` |
| Async components with a loading state | `planned` |

---

## 3. SSR and hydration

**This is an investigation, not a commitment.** It is listed because it is the single most
common request for a library of this shape, and because saying "we are looking at it" is
more useful than silence.

| Item | Status |
| ---- | ------ |
| Confirm the modules that already run outside a browser (`reactivity`, `parser`, `utils`, `store`, partially `http`) | `done` - documented in [ARCHITECTURE.md](ARCHITECTURE.md) section 11 |
| Decide whether SSR means "render HTML on the server" or "attach to server-rendered HTML" | `investigating` |
| Hydration mismatch semantics: what happens when the DOM does not match the state | `investigating` |
| A server-side `walk()` that produces HTML instead of mutating nodes | `investigating` |
| Streaming or partial hydration | `investigating` |

The honest position: Voodoo.js already attaches to HTML that someone else rendered, which
is most of what people want from hydration. It binds to existing markup rather than
replacing it, so a page rendered by Rails, Django, Laravel or Astro works today with no
hydration step at all. What does **not** exist is server-side rendering *of Voodoo
components*, and that is a genuinely large piece of work that would change the shape of the
component model. It will not be added casually.

---

## 4. Devtools

| Item | Status |
| ---- | ------ |
| `xray` reactivity inspector overlay | `done` - `devtools/xray.ts` |
| Internal event bus for tooling | `done` - `devtools/bus.ts` |
| Effect scopes tracked per node so the inspector can count them | `done` - `trackEffectScope` in `runtime/walker.ts` |
| In-page devtools widget with a launcher | `in progress` - `devtools/launcher.ts` |
| Enable devtools from the script tag (`devtools`, `data-devtools`, `window.VOODOO_DEVTOOLS`) | `done` - `bootstrap.ts` |
| Actionable dev-mode warnings: unknown directive, unregistered component, invalid expression, missing required prop | `in progress` - `runtime/avisos.ts` |
| A real browser extension panel | `planned` |
| Component tree view with editable state | `planned` |
| Time-travel over the store | `investigating` |
| Bridge protocol so the extension and the in-page widget share one data source | `planned` |

The devtools currently live inside the full bundle. A browser extension would let the
essential bundle stay small while still being inspectable, which is the main reason to do
it.

---

## 5. Plugin ecosystem

| Item | Status |
| ---- | ------ |
| `V.use(plugin, options)` accepting an object or a function | `done` - `usePlugin` in `runtime/registry.ts` |
| Double installation of the same plugin is ignored | `done` |
| `app.use()` for application mode | `done` - `runtime/app.ts` |
| Written plugin specification for third parties | `done` - [docs/plugin-spec.md](docs/plugin-spec.md) |
| Recommended namespacing rules | `done` - `CONVENTIONS.md` section 6 |
| **Plugin uninstall / cleanup** | `planned` - there is no `uninstall` hook and no way to unregister a directive, a component or a magic. `installedPlugins` is a `Set` that is never emptied. This blocks hot reload and clean teardown in tests. |
| Deduplicate by plugin `name`, not only by object identity | `planned` - two distinct objects with the same `name` both install today |
| Declared peer version range, so a plugin can state which Voodoo versions it supports | `planned` |
| Let a plugin declare a terminal directive | `planned` - `V.directive` does not forward `terminal` to `defineDirective` |
| Give a plugin a scoped registration handle instead of raw registry access | `investigating` |
| A `voodoo-plugin` package template and a listing of known plugins | `planned` |

The uninstall gap is the concrete blocker. Everything else in this theme is polish.

---

## 6. Test coverage

| Item | Status |
| ---- | ------ |
| Vitest suite under jsdom | `done` - `packages/voodoojs/test/` |
| Coverage reporting configured (`v8`, HTML + text) | `done` - `vitest.config.ts` |
| CI on Node 20 and 22 running typecheck, tests, build and size budget | `done` - `.github/workflows/ci.yml` |
| Test taxonomy: classify tests as unit / integration / regression | `in progress` - `scripts/quality/test-taxonomy.mjs` |
| A coverage floor enforced in CI | `planned` |
| Real-browser tests (Playwright or WebdriverIO) | `planned` - jsdom cannot cover layout, real `IntersectionObserver` timing, View Transitions, or focus behaviour |
| Visual regression for the UI component library | `planned` |
| A property-based test suite for the parser | `investigating` |
| Fuzzing the expression evaluator for sandbox escapes | `planned` - the `constructor` escape was found by reading; it should have been found by a fuzzer |

The fuzzing item is a direct consequence of the prototype-chain fix described in
[SECURITY.md](SECURITY.md) section 2.4. Finding that class of bug by inspection is luck.

---

## 7. Performance

| Item | Status |
| ---- | ------ |
| AST cache keyed by expression text | `done` - `parser/parser.ts`, `MAX_CACHE = 2000` |
| Interpolation validity memoized per text | `done` - `runtime/walker.ts` |
| Attribute cache so directives never re-read the DOM after mount | `done` |
| Directive index replacing `querySelectorAll('[v-name]')` | `done` |
| Size budgets enforced in CI | `done` - `scripts/size.mjs` |
| Benchmark harness | `in progress` - `benchmarks/` with core, DOM, lists, parser and vanilla baselines |
| Publish benchmark methodology and make results reproducible | `in progress` |
| A performance budget checked in CI, not only a size budget | `planned` |
| Bounded LRU for the AST cache instead of clearing it wholesale at 2000 entries | `planned` |
| Investigate the cost of one `EffectScope` per directive on very large lists | `investigating` |
| Compare against Alpine, petite-vue and vanilla on the same machine, published | `planned` |

Rule that applies to every item here: **no number gets written into documentation.**
Measure with `npm run size` and `benchmarks/`, and quote the run, not a remembered figure.

---

## 8. Accessibility

The UI directives and the component library create interactive widgets, which means they
own keyboard and screen reader behaviour.

| Item | Status |
| ---- | ------ |
| `aria-live` announcer for directives that change the page without visible text | `done` - `announce()` in `directives/shared.ts` |
| `prefers-reduced-motion` honoured across transitions, motion, sound and validation | `done` |
| `prefers-color-scheme` with an explicit `data-theme` override in both directions | `done` - `BASE_TOKENS` in `dom/style.ts` |
| Focus trapping for modal and drawer | `done` - `v-focus-trap`, `ui/dialog.ts` |
| Automated accessibility checks in the quality report | `in progress` - `scripts/quality/accessibility.mjs` |
| Full keyboard interaction audit against the WAI-ARIA Authoring Practices for tabs, accordion, dropdown, combobox and command palette | `planned` |
| `axe-core` run against every example page in CI | `planned` |
| Documented accessibility contract per UI directive: roles, states, keys | `planned` |
| Screen reader testing on NVDA, JAWS and VoiceOver | `planned` |

---

## 9. Documentation

| Item | Status |
| ---- | ------ |
| Complete Portuguese documentation | `done` - `docs/` |
| Documentation site | `done` - `site/` |
| Architecture, conventions, browser support, security, quality documents | `done` |
| Application structure guide | `done` - [docs/application-structure.md](docs/application-structure.md) |
| Performance guide | `done` - [docs/performance.md](docs/performance.md) |
| Plugin specification | `done` - [docs/plugin-spec.md](docs/plugin-spec.md) |
| English core documentation | `done` - [docs/en/](docs/en/) |
| English translation of the complete reference | `planned` - `docs/en/` is deliberately a focused subset, not a mirror of all 30 Portuguese files |
| A runnable example per directive | `planned` |
| Migration guides in English (from Alpine, jQuery, Vue) | `planned` |
| Video or interactive tutorial | `investigating` |

---

## 10. Build and distribution

| Item | Status |
| ---- | ------ |
| Three browser bundles: minimal, essential, full | `done` |
| ESM and CJS entries with types, tree-shakeable | `done` |
| Subpath exports: `voodoojs/reactivity`, `/http`, `/utils` | `done` |
| Custom builds via the CLI package | `in progress` - `packages/cli` |
| Published SRI hashes per release | `planned` |
| Provenance attestation on npm publish | `planned` |
| A documented, reproducible release process | `in progress` - see [CONTRIBUTING.md](CONTRIBUTING.md) |

---

## Explicitly out of scope

Not "later". Not planned. Listed so nobody spends time proposing them.

- **A required build step.** A single script tag must always be enough.
- **JSX or a template compiler.** The HTML is the template.
- **A Virtual DOM.** See [ARCHITECTURE.md](ARCHITECTURE.md) section 3 for the reasoning.
- **`eval` or `new Function`, under any flag.** This is not a performance trade that is
  open for discussion.
- **Runtime dependencies.** Zero, permanently.
- **A bundled HTML sanitizer.** `v-html` is developer trust by design. Use DOMPurify.
- **Internet Explorer support.** `Proxy` cannot be polyfilled faithfully.
- **A CSS framework.** The `--v-*` tokens exist so the UI components inherit your theme,
  not so Voodoo.js becomes one.
- **State management beyond `V.store`.** If an application needs more, it should use a
  dedicated library; `reactive` composes with anything.

---

## Contributing to the roadmap

Open a proposal issue before writing code. The feature request template asks the questions
that matter: what problem, how you solve it today, and whether it fits the four design
constraints. An item moves from `investigating` to `planned` when there is agreement on the
shape, not when there is agreement that the problem exists.

See [CONTRIBUTING.md](CONTRIBUTING.md).
