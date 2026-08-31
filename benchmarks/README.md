# Voodoo.js Benchmarks

An honest measurement suite. Every number in `results/` and `reports/` was produced by running the
code on this machine. Nothing here is estimated, extrapolated, or copied from someone else's chart.

If something could not be measured in this environment, it is listed as **NOT RUN** with the reason,
not quietly omitted and not filled in with a plausible-looking guess.

---

## Quick start

```bash
# From the repo root.
node --expose-gc benchmarks/run.mjs              # the whole suite
node --expose-gc benchmarks/run.mjs core lists   # only these groups
node benchmarks/run.mjs --quick                  # fewer samples, for iterating
node benchmarks/run.mjs --baseline               # also freeze results/baseline.json

npm run build && node benchmarks/bundle.mjs      # bundle sizes + tree-shaking
node benchmarks/compare.mjs                      # baseline.json vs latest.json
```

Always prefer `node --expose-gc`. Without it the memory suite cannot force a collection, so its
numbers are advisory and the report says so on every run.

For the cross-framework comparison, which lives in its own package on purpose:

```bash
cd benchmarks/competitors
npm install
node --expose-gc run-competitors.mjs
```

---

## Methodology

**Timing.** `process.hrtime.bigint()`, converted to milliseconds. Every case runs a warm-up phase
first (JIT, expression caches, object shapes) and only then starts recording.

**Sampling is adaptive.** Each case declares a sample count, but the runner keeps sampling — up to a
per-case ceiling of time and iterations — until the relative standard deviation settles under 8%. A
case that never settles is reported with its CV and explicitly marked **not reliable for regression
gating**. Admitting that a number is noisy is more useful than presenting it as precise.

**Correctness is checked after every case, and it is not optional.** A case that asks for 10,000 rows
counts the nodes in the DOM and compares every label it claims to have written. If the output is
wrong, the case is reported as `INVALID` and its timing is discarded. A benchmark that produced the
wrong result is not fast — it is broken. Cases without an assertion are counted and listed separately
as `unverified` so they cannot hide.

**Isolation.** Cases run sequentially, never in parallel — two cases sharing a CPU and a document
would each measure the other. Between cases the runner forces a GC (when available) and yields the
event loop so one case's garbage is not billed to the next.

**No benchmark mode.** There is no `if (benchmarkMode)` anywhere in `packages/voodoojs/src`, and no
shortcut path. The suite compiles `src/index.ts` with the esbuild already in `node_modules` and
measures the same code the published build ships.

**Determinism.** Row data comes from a seeded linear congruential generator, never `Math.random`.
Two runs do exactly the same work. Stress cases have fixed iteration counts and a guaranteed end —
there is no `while (true)` in this directory.

**Reproducibility.** `run.mjs` measures the working tree by default. If the working tree does not
compile it falls back to `HEAD`, says so loudly, and records `measuredSource` in the result JSON so
nobody can mistake one for the other. `--ref=<commit>` measures a specific commit via `git archive`.

---

## How to read the results

Each case is rated:

| Rating | Meaning |
| --- | --- |
| **Excellent** | Within 2x of the hand-written vanilla JS baseline for the same scenario, or under half its declared budget. |
| **Competitive** | Within 5x of vanilla, or inside its budget. |
| **Needs improvement** | Beyond that. |
| **Unrated** | No vanilla pair and no declared budget. This is a gap in the suite, not a pass. |
| **INVALID** | Produced the wrong DOM or state. The timing is meaningless. |

The comparison that matters is the `vanilla/` group: the same scenario written by hand with no
framework, running in the same process, on the same machine, in the same second. "2.4x the cost of
writing the DOM yourself" is a claim that can be checked. "3x faster than React" measured on someone
else's laptop in some other year is not.

**Growth curves.** Cases sharing a `curve` name are fitted against `log(time) = a + b·log(n)`. The
exponent `b` names the complexity, and the table also prints the raw factors so you can read it
without trusting the fit: if `n` grows 100x and time grows ~100x it is O(n); if time grows ~10,000x
it is O(n²).

**Regression gates are derived from measured noise, not chosen.** Each case's gate is
`max(5%, 3 × CV)`, capped at 60%, using the larger CV of the two runs being compared. A 5% gate on a
case whose own run-to-run variation is 8% fires constantly without any code change, and a gate that
cries wolf is a gate everyone learns to ignore. Three standard deviations covers ~99.7% of the
distribution: stable cases rarely fire by accident, noisy cases get a gate wide enough that firing
means something. Cases above 15% CV do not fail a build at all — they are listed as unjudgeable.

---

## Limitations — please read before quoting anything

- **jsdom is not a browser.** No layout, no paint, no compositor, no real event loop pressure. These
  numbers measure JavaScript and DOM-API work only. Absolute times and cross-framework ranking can
  and do differ in a real browser.
- **`config.autoDiscover` is off during the suite.** The global MutationObserver would turn every row
  insertion into extra asynchronous work and make the measurement non-deterministic. The suites call
  `walk()` directly, which is the same code path the observer would invoke.
- **Windows, single machine, no CPU pinning.** No isolated CPU, no disabled turbo, no throttling
  control. That is why the CV is reported for every case and why gates are derived from it.
- **Not measured here:** real-browser timings, Lighthouse, Core Web Vitals, network/parse/download
  cost, CPU throttling, mobile hardware, and the official
  [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) harness. The `lists/`
  scenarios mirror its cases in jsdom, but this is not that benchmark and should not be reported as
  a result from it.

---

## Layout

```
benchmarks/
  run.mjs              main runner
  bundle.mjs           bundle sizes, module composition, tree-shaking
  compare.mjs          BEFORE/AFTER against a frozen baseline
  harness/
    runner.mjs         warm-up, adaptive sampling, verification, isolation
    stats.mjs          mean/median/min/max/stddev/CV/p75/p95/p99, IQR outliers
    env.mjs            OS, CPU, RAM, Node, commit, timestamp, build mode
    dom.mjs            jsdom setup, esbuild bundling, git-ref materialisation
    report.mjs         markdown + JSON output
    kit.mjs            shared mount/verify helpers, deterministic row data
    paths.mjs          absolute paths
  core/ parser/ dom/ directives/ lists/ components/ startup/ memory/ stress/
  vanilla/             hand-written baselines for the same scenarios
  bundle/              size + composition + tree-shaking analysis
  competitors/         isolated package: Alpine, Vue, React, Preact, Solid
  results/             latest.json, baseline.json, YYYY-MM-DD-<sha>.json
  reports/             generated markdown
```

`competitors/` has its own `package.json` and is deliberately **not** a workspace member. Its
dependencies are pinned to exact versions, and nothing at the repo root — `npm test`,
`npm run build`, `npm run typecheck` — needs them installed.

---

## Adding a benchmark

A case is a plain object. `setup` and `teardown` are outside the measurement; only `run` is timed.

```js
{
  id: 'lists/create-1000',        // stable: this is the key used for comparison
  name: 'criar 1000 linhas',
  group: 'lists',
  n: 1000,                        // feeds the growth curve
  samples: 25,                    // a floor; the runner adds more if noisy
  vanillaOf: 'vanilla/list-create-1000',  // or budgetMs, for the rating
  setup: () => ({ /* ... */ }),
  run: (ctx) => { /* measured */ },
  verify: (ctx, result) => count === 1000 ? true : `encontrou ${count}`,
  teardown: (ctx) => { /* ... */ },
}
```

Rules for a new case:

1. **Write `verify` first.** Without it the case is `unverified` and worth little. Assert node counts
   and actual text, not just that nothing threw.
2. **Add a `vanilla/` pair or a `budgetMs`.** Otherwise the case is `Unrated`, which is a gap.
3. **Make it deterministic.** Use `buildRows(n, seed)` from `harness/kit.mjs`.
4. **Give it a `maxTotalMs`** if it is expensive, so the suite still finishes.
5. **Register the suite** in the `SUITES` map in `run.mjs`.

## Updating the baseline

```bash
node --expose-gc --max-old-space-size=8192 benchmarks/run.mjs --baseline
```

This writes `results/baseline.json` plus a dated `results/YYYY-MM-DD-<sha>-baseline.json` that
survives the next run. Freeze a baseline **before** an optimisation, never after — a baseline
measured on the optimised code makes the improvement invisible. Only compare baselines captured on
the same machine and Node version; `compare.mjs` prints a warning when they differ, because a
cross-machine comparison is not a comparison.
