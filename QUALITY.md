# Quality Criteria

Voodoo.js measures itself across twelve core dimensions, plus a thirteenth hygiene check.
This document defines what each one measures, what makes it pass, warn or fail, and how to
run it.

The checks live in `scripts/quality/`, one module per dimension, and are run with:

```bash
npm run quality
npm run quality -- --report      # also writes the report file
```

The report is written to **`QUALITY_REPORT.md`** at the repository root. That file is
generated output: it is regenerated on every run and should never be edited by hand.

The runner is still being wired in, so the `quality` entry may not yet be present in
`package.json`; until it is, invoke `scripts/quality/scorecard.mjs` directly. Any dimension
whose tooling is unavailable reports `SKIP` rather than a made-up result. Run the command to
see the current state.

**This document describes criteria, not results.** It contains no scores, no percentages
and no counts. To know the current state of the project, run the command and read the
generated report.

---

## Status values

Every dimension reports one of four statuses.

| Status | Meaning                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| `PASS` | The criterion is met.                                                        |
| `WARN` | Something is worth attention but does not block a release.                   |
| `FAIL` | The criterion is not met. Blocks a release.                                  |
| `SKIP` | The check could not run, for example because a tool is not installed.        |

`SKIP` is deliberately a distinct status and not a silent pass. A check that cannot run
tells you so, along with what to install to enable it. The overall result is the worst
status across all dimensions, ordered `FAIL` > `WARN` > `SKIP` > `PASS`.

A `SKIP` never masquerades as a `PASS`. An honest `SKIP` is worth more than an invented
`PASS`, and the report says which is which.

---

## 1. Correctness

**Measures:** whether the whole test suite passes.

Runs `vitest run` for real and reads its JSON report. Nothing is inferred from exit codes
alone; the report is parsed so that individual failures can be named.

| Status | Condition                                                        |
| ------ | ---------------------------------------------------------------- |
| `PASS` | Every test passes.                                               |
| `FAIL` | Any test fails, or vitest ran but produced no readable report.   |
| `SKIP` | vitest is not installed.                                         |

There is no `WARN` here. A failing test is a failing test.

```bash
npm test
```

---

## 2. Unit Tests

**Measures:** coverage of the units that carry the most risk, and whether unit tests
actually behave like unit tests.

A unit test here exercises a module in isolation: the reactivity primitives, the lexer, the
parser, the interpreter, the scope chain, the utility functions. It should not need a DOM
tree of any depth.

Looks at:

- whether every module under `packages/voodoojs/src` has a corresponding test file;
- line and branch coverage from `vitest run --coverage`;
- whether modules classified as high-risk (`reactivity/`, `parser/`, `runtime/scope.ts`)
  are covered more thoroughly than the average.

| Status | Condition                                                                       |
| ------ | ------------------------------------------------------------------------------- |
| `PASS` | Coverage is at or above the project floor and the high-risk modules are covered. |
| `WARN` | Coverage is below the floor, or a module has no test file at all.               |
| `FAIL` | A high-risk module has no test coverage.                                        |
| `SKIP` | Coverage tooling is unavailable.                                                |

```bash
npm run coverage
```

---

## 3. Integration

**Measures:** whether the layers work together, not just in isolation.

An integration test drives real HTML through the walker and asserts on the resulting DOM:
a `v-for` inside a `v-if` inside a component, a form that validates and submits, a
component that emits an event caught by a parent's `@handler`, state that survives a
`v-for` reorder.

This is where the interesting bugs live, because every layer is individually simple and the
seams are where the assumptions differ.

| Status | Condition                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| `PASS` | Integration tests exist for each major seam and all pass.                     |
| `WARN` | A seam has no integration test.                                               |
| `FAIL` | An integration test fails.                                                    |
| `SKIP` | The suite cannot run.                                                         |

The seams that must be covered:

- walker to directive
- walker to component
- component to scope, including slots keeping the parent scope
- scope to interpreter
- reactivity to DOM write
- directive to service (`v-submit` to `http`, `v-toast` to `ui/toast`)
- MutationObserver to walker, for dynamically inserted HTML

---

## 4. Browser Tests

**Measures:** behaviour that jsdom cannot represent.

The unit suite runs under jsdom, which has no layout, no real `IntersectionObserver`, no
`ResizeObserver`, no Web Animations API, no View Transitions and no real focus model. That
is useful, because it means the fallback paths documented in
[BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) section 3 are exercised on every run. It also
means a whole category of behaviour is untested.

What belongs here:

- lazy loading actually triggering on scroll
- sticky and scrollspy positioning
- focus trapping and focus restoration in modals and drawers
- keyboard navigation in tabs, accordion, dropdown and the command palette
- transitions completing and their classes being removed
- chart rendering and resizing
- the router changing the URL and restoring scroll

| Status | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `PASS` | A real-browser suite exists and passes.                                     |
| `WARN` | No real-browser suite exists yet.                                           |
| `FAIL` | The suite exists and fails.                                                 |
| `SKIP` | No browser runner is installed in this environment.                         |

Real-browser testing is tracked as `planned` in [ROADMAP.md](ROADMAP.md).

---

## 5. TypeScript

**Measures:** whether the type checker is satisfied, and whether the types are honest.

Runs `tsc --noEmit` against `packages/voodoojs/tsconfig.json`, which inherits `strict: true`
from `tsconfig.base.json`.

Beyond compilation, this dimension also looks at type quality:

- explicit `any` in public signatures (as opposed to internal plumbing);
- `@ts-ignore` and `@ts-expect-error` comments;
- exported functions without a declared return type;
- generated `.d.ts` files being produced by the build.

| Status | Condition                                                             |
| ------ | --------------------------------------------------------------------- |
| `PASS` | `tsc --noEmit` is clean and public signatures avoid `any`.            |
| `WARN` | Compilation is clean but `any` or suppression comments appear in public API surface. |
| `FAIL` | Any type error.                                                       |
| `SKIP` | TypeScript is not installed.                                          |

```bash
npm run typecheck
```

Note that `any` is legitimate in a few places by nature, notably `DirectiveBinding<T = any>`
and the component instance proxy, where the value genuinely is not knowable in advance.
Those are documented; new ones need a reason.

---

## 6. Security

**Measures:** the invariants from [SECURITY.md](SECURITY.md), checked mechanically rather
than trusted.

Scans the source for:

- `eval(`, `new Function`, `setTimeout` / `setInterval` with a string first argument;
- `innerHTML` assignments outside the small set of places that are documented as
  developer-trust (`v-html`, `fromHtml`, `.html()`, component templates, HTML swaps);
- the prototype-chain key blocklist still being applied on every path in
  `parser/interpreter.ts`: identifier reads, member reads, call targets, object literal
  keys and assignment targets;
- the URL scheme check and the `:on*` refusal still being present in `applyBinding`;
- the `allowedGlobals` list not having grown to include a capability
  (`window`, `fetch`, `document`, `globalThis`, `Function`);
- zero runtime dependencies in `packages/voodoojs/package.json`;
- `npm audit` on the development dependency tree.

| Status | Condition                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| `PASS` | Every invariant holds and there are no known vulnerable dependencies.         |
| `WARN` | A moderate or low advisory in a development dependency, or a new undocumented `innerHTML` site. |
| `FAIL` | `eval` or `new Function` appears anywhere in `src/`; a prototype-chain guard is missing; a capability was added to `allowedGlobals`; a runtime dependency appeared; a high or critical advisory. |
| `SKIP` | `npm audit` cannot reach the registry.                                        |

The `FAIL` conditions are absolute. There is no configuration under which Voodoo.js
compiles a string into code.

---

## 7. Accessibility

**Measures:** whether the UI directives and the component library produce accessible
markup.

Checks:

- every interactive element created by a directive has a role, an accessible name and a
  reachable keyboard path;
- `aria-expanded`, `aria-selected`, `aria-controls` and `aria-modal` are kept in sync with
  the visual state;
- focus is trapped inside modals and drawers, and restored on close;
- `prefers-reduced-motion` is honoured by every animated path;
- injected CSS defines colours for both light and dark, with an explicit `data-theme`
  overriding the system preference in both directions;
- text has a defined contrast against its token background.

| Status | Condition                                                                    |
| ------ | ---------------------------------------------------------------------------- |
| `PASS` | No violations in the automated pass and the manual checklist is complete.    |
| `WARN` | A minor issue: a missing label on a decorative control, an unlabelled region.|
| `FAIL` | A keyboard trap, an element that cannot be reached by keyboard, a missing role on a widget, or an animation that ignores `prefers-reduced-motion`. |
| `SKIP` | The accessibility runner is not installed.                                   |

Automated tooling catches roughly a third of real accessibility problems. A `PASS` here
means "no automated violations", not "accessible". The manual audit tracked in
[ROADMAP.md](ROADMAP.md) is the other two thirds.

---

## 8. Bundle

**Measures:** size against the declared budgets, and the integrity of the build outputs.

Budgets are declared in `scripts/size.mjs` in gzipped kilobytes. The script measures raw,
gzip and brotli sizes for every built file and exits non-zero when a budget is exceeded.

Also checks:

- all expected outputs exist after `npm run build`;
- `.d.ts` files are generated for every ESM entry;
- the IIFE builds publish `window.V` and `window.Voodoo`;
- tree shaking works: importing `voodoojs/reactivity` does not pull in the DOM layer;
- `sideEffects` in `package.json` still matches the files that actually have side effects.

| Status | Condition                                                                    |
| ------ | ---------------------------------------------------------------------------- |
| `PASS` | Every file is within budget and every expected output exists.                |
| `WARN` | A file is within budget but grew noticeably since the previous measurement.  |
| `FAIL` | A budget is exceeded, or an expected output is missing.                      |
| `SKIP` | `dist/` is empty; run `npm run build` first.                                 |

```bash
npm run build && npm run size
```

**Never quote a size from documentation.** Run the command. The budgets live in
`scripts/size.mjs` and are the only numbers that are allowed to be written down, because
they are targets rather than measurements.

---

## 9. Performance

**Measures:** whether the operations that matter stayed fast.

Benchmarks live in `benchmarks/`, with harness code in `benchmarks/harness/` and scenario
suites for the core primitives, DOM binding, list rendering and the parser, plus a vanilla
JavaScript baseline for calibration.

Scenarios that matter:

- creating and updating a reactive object with many keys;
- one effect versus many effects reacting to the same change;
- rendering a large keyed list, then reordering it, then filtering it;
- parsing an expression cold versus warm from the AST cache;
- walking a large document tree;
- text interpolation throughput.

| Status | Condition                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| `PASS` | No scenario regressed beyond the noise threshold against the recorded baseline.|
| `WARN` | A scenario regressed measurably but within the tolerance band.                |
| `FAIL` | A scenario regressed beyond the tolerance band.                               |
| `SKIP` | No baseline has been recorded yet, or the harness is unavailable.             |

Two rules for this dimension:

1. **A benchmark result is only meaningful against a baseline measured on the same
   machine.** Cross-machine comparisons are noise.
2. **No benchmark number is ever written into documentation.** Link to `benchmarks/` and
   let the reader run it.

---

## 10. Memory

**Measures:** whether teardown actually tears down.

Voodoo.js has an explicit ownership model: every directive gets a detached `EffectScope`,
registered as a cleanup on its element; `destroy(node)` walks children first and runs
cleanups bottom-up; the MutationObserver calls `destroy` on disconnected nodes. If that
model has a hole, memory grows for as long as the page is open, which is exactly the
scenario a long-lived single-page application creates.

Checks:

- mount and unmount the same component many times and confirm `V.instances` returns to its
  starting size;
- confirm that after `destroy`, the element has no entries left in `nodeScopes`,
  `nodeCleanups`, `nodeEffectScopes`, `initialized` or `directiveIndex`;
- confirm every event listener added by a directive is removed by its cleanup;
- render a large `v-for`, empty the source array, and confirm all blocks are destroyed;
- confirm `EffectScope.stop()` empties `effects`, `children` and `cleanups` and detaches
  from its parent;
- confirm the AST cache is bounded (`MAX_CACHE`) and the interpolation memo does not grow
  without limit;
- confirm `targetMap` is a `WeakMap` so unreferenced state can be collected.

| Status | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `PASS` | No growth across repeated mount and unmount cycles; no orphaned registrations.|
| `WARN` | Growth that is bounded and explained, such as a cache that is intentionally retained. |
| `FAIL` | Unbounded growth, a listener that survives its element, or an effect that keeps running after `destroy`. |
| `SKIP` | The environment does not expose the measurement hooks needed.               |

Note one known unbounded structure: `installedPlugins` in `runtime/registry.ts` is a `Set`
that is never emptied, because there is no uninstall path. It holds one reference per
plugin, which is negligible in size but is the mechanism that blocks clean teardown. See
[ROADMAP.md](ROADMAP.md), *Plugin ecosystem*.

---

## 11. API Compatibility

**Measures:** whether a release keeps the promises made in
[CONVENTIONS.md](CONVENTIONS.md).

Compares the current public surface against a recorded baseline from the previous release:

- symbols on `V` that were removed or renamed;
- changed function arities or types;
- attribute names that stopped being registered;
- `V.config` fields that were removed, or whose default changed;
- directive priorities that changed in a way that reorders execution;
- component lifecycle hooks that were removed;
- magic variables that disappeared.

Each difference is classified against the version bump being prepared.

| Status | Condition                                                                     |
| ------ | ----------------------------------------------------------------------------- |
| `PASS` | No breaking change, or every breaking change is accompanied by a major bump, a deprecation period and a `CHANGELOG.md` entry. |
| `WARN` | A `deprecated` symbol was removed, or an `experimental` symbol changed shape. Both are allowed, both need to be visible. |
| `FAIL` | A `stable` symbol was removed or changed without a major bump.                |
| `SKIP` | No baseline snapshot exists to compare against.                               |

Recording a baseline snapshot is `planned`; see [ROADMAP.md](ROADMAP.md), *API
stabilization*. Until that lands this dimension reports `SKIP`, which is the honest answer.

---

## 12. Docs

**Measures:** whether the documentation matches the code.

Checks:

- every attribute name registered through `defineDirective` appears in the directive
  reference;
- every symbol on `V` appears in the API reference;
- every code example in `docs/` parses as valid JavaScript or HTML;
- internal links resolve;
- both `docs/` and `docs/en/` have an index that lists every file in their directory;
- no em dash or en dash appears in any documentation file, in either language;
- no bundle size, benchmark figure or test count is stated as a literal in prose;
- `CHANGELOG.md` has an entry for the version in `package.json`.

| Status | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `PASS` | Everything documented exists, everything public is documented, all links resolve. |
| `WARN` | A new symbol is undocumented, or a link is stale.                           |
| `FAIL` | Documentation describes an API that does not exist, or an example does not parse. |
| `SKIP` | Documentation sources are unavailable.                                      |

The `FAIL` condition is the important one. Documentation that describes an API that was
never implemented, or that was removed, is worse than no documentation, because it costs a
reader time before they discover it is wrong.

---

## 13. Dead Code

**Measures:** source that nothing reaches.

A thirteenth check, sitting alongside the twelve above. It looks for exported symbols that
nothing imports, modules that no entry point pulls in, directives registered but never
documented, and CSS blocks injected by code paths that cannot run.

Dead code is not a correctness problem, but in this project it is a size problem: everything
in `src/` that an entry point reaches ends up in a bundle, and every kilobyte counts against
the budgets in dimension 8.

| Status | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `PASS` | Nothing unreachable found.                                                  |
| `WARN` | Unreachable exports or modules found. Each is listed with its file and line.|
| `FAIL` | Reserved for a module that is dead **and** shipped in a bundle.             |
| `SKIP` | The analysis could not run.                                                 |

A deliberate `WARN` is acceptable for a symbol exported as part of the public API that the
library itself does not consume.

---

## Running the checks

```bash
npm run quality              # every dimension
npm run quality -- --report  # also writes QUALITY_REPORT.md
```

Individual pieces, which are also what CI runs today:

```bash
npm test                     # Correctness
npm run coverage             # Unit Tests
npm run typecheck            # TypeScript
npm run build && npm run size # Bundle
node benchmarks/run.mjs      # Performance
```

CI (`.github/workflows/ci.yml`) currently runs typecheck, tests, build and the size budget
on Node 20 and 22. Wiring the full quality report into CI is tracked in the roadmap.

---

## Reading `QUALITY_REPORT.md`

The generated report contains, for each dimension: the status, a one-line summary, the
individual findings with file and line where applicable, and, for a `SKIP`, what to install
or run to enable the check.

Two things the report will never contain:

- **An invented result.** A check that cannot run reports `SKIP` with the reason. A check
  that ran reports what it found.
- **A number that was not measured in that run.** Sizes, timings and counts come from the
  run that produced the report.

If a dimension reports `WARN` or `FAIL` and you believe it is wrong, fix the check. Do not
add an exception to make it green.

---

## Related documents

- [CONTRIBUTING.md](CONTRIBUTING.md) - how to run everything locally
- [CONVENTIONS.md](CONVENTIONS.md) - the API contract that dimension 11 verifies
- [SECURITY.md](SECURITY.md) - the invariants that dimension 6 verifies
- [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) - why dimension 4 exists
- [ROADMAP.md](ROADMAP.md) - which dimensions are not fully implemented yet
