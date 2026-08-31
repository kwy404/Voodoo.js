# Browser Support

This document is derived from the source, not from a policy statement. Every browser API
used by Voodoo.js is listed with where it is used, whether the code feature-detects it, and
what happens when it is missing.

Version described: `0.1.0`.

---

## 1. Build targets

From `packages/voodoojs/tsup.config.ts`:

| Output group                                               | Format      | `target` |
| ---------------------------------------------------------- | ----------- | -------- |
| `voodoo.core(.min).js`, `voodoo(.min).js`, `voodoo.full(.min).js` | IIFE   | `es2018` |
| `index`, `essential`, `reactivity`, `http`, `utils`         | ESM + CJS   | `es2020` |

The TypeScript compiler target in `tsconfig.base.json` is `ES2020`, with
`lib: ["ES2021", "DOM", "DOM.Iterable"]`. That governs type checking; the emitted
JavaScript syntax level is what `tsup` sets above.

What `es2018` means in practice for the browser bundles: esbuild downlevels newer
**syntax** (optional chaining `?.`, nullish coalescing `??`, logical assignment `&&=`
`||=` `??=`, class fields) into ES2018-compatible output. It does **not** polyfill
**runtime APIs**. So syntax is not the binding constraint; the APIs in section 2 are.

If you consume the ESM or CJS entries through a bundler, your own build target governs the
syntax and the `es2020` level here is only the floor.

---

## 2. Required APIs, with no fallback

If any of these is missing, the library does not work. There is no feature detection
because there is no meaningful degraded mode.

| API                              | Used in                                                     | Minimum |
| -------------------------------- | ----------------------------------------------------------- | ------- |
| `Proxy`                          | `reactivity/index.ts` (`reactive`), `runtime/component.ts` (instance proxy), `store/index.ts` (`allStores`) | Chrome 49, Firefox 18, Safari 10, Edge 12 |
| `Reflect`                        | `reactivity/index.ts` proxy handlers                        | Chrome 49, Firefox 42, Safari 10 |
| `WeakMap` / `WeakSet`            | `reactivity` `targetMap`, `walker` node state, attribute cache | Chrome 36, Firefox 6, Safari 7.1 |
| `Symbol`                         | `RAW`, `IS_REACTIVE`, `SKIP`, `ITERATE_KEY`, `SPREAD`       | Chrome 38, Firefox 36, Safari 9 |
| `Map` / `Set`                    | registries, dependency sets, AST cache                      | Chrome 38, Firefox 13, Safari 8 |
| `Promise`                        | scheduler, `nextTick`, HTTP                                 | Chrome 32, Firefox 29, Safari 8 |
| `MutationObserver`               | `runtime/walker.ts` auto-discovery, `runtime/boot.ts` boot loop | Chrome 26, Firefox 14, Safari 6.1 |
| `CustomEvent` constructor        | component `emit`, `$dispatch`, `voodoo:*` events            | Chrome 15, Firefox 11, Safari 6 |
| `Element.closest`                | forms, UI directives                                        | Chrome 41, Firefox 35, Safari 9 |
| `Element.remove`                 | `v-for`, `v-if`, teleport                                   | Chrome 23, Firefox 23, Safari 7 |
| `classList`                      | `v-class`, transitions, UI directives                       | Chrome 8, Firefox 3.6, Safari 5.1 |
| CSS custom properties            | every injected stylesheet uses `--v-*` tokens               | Chrome 49, Firefox 31, Safari 9.1 |

`Proxy` and `MutationObserver` are the two that cannot be polyfilled well. `Proxy` in
particular has no faithful shim, which is what sets the hard floor.

There is **no Internet Explorer support**, and there is no support for legacy
(non-Chromium) Edge.

---

## 3. Required APIs, guarded, with a documented fallback

These are feature-detected. The behaviour when the API is absent is stated exactly as the
code implements it.

### `IntersectionObserver`

Used by `directives/core.ts` (`v-visible`), `directives/http.ts` (`v-load-visible` and the
`visible` / `revealed` triggers), `directives/ui.ts` (`v-scrollspy`, `v-sticky`,
`v-infinite-scroll`, `v-lazy-src`, `v-lazy-bg`), and `motion/index.ts` (`inView`).

Every call site is guarded with `typeof IntersectionObserver === 'undefined'`. The
fallback is uniform and deliberate: **the action fires immediately, as if the element were
already visible.** Lazy images load at once, infinite scroll loads its first page, reveal
animations run on mount. Nothing is silently skipped.

Native support: Chrome 51, Firefox 55, Safari 12.1, Edge 15.

### `ResizeObserver`

Used by `charts/index.ts` to keep an SVG chart in sync with its container.

Guarded with `typeof ResizeObserver === 'undefined'`, in which case the observer is simply
not attached. Charts still render; they stop re-fitting on container resize. Because the
SVG uses `viewBox` and `preserveAspectRatio`, the visual result degrades gracefully rather
than breaking.

Native support: Chrome 64, Firefox 69, Safari 13.1.

### `AbortSignal.any`

Used in `http/index.ts` to combine a caller-supplied signal with the internal timeout
signal:

```ts
signal: signals.length > 1 && 'any' in AbortSignal
  ? AbortSignal.any(signals)
  : controller.signal,
```

Without it, the internal controller's signal is used, so **timeouts still work and manual
cancellation still works, but only one of the two signals is honoured per request** when
both are present.

Native support: Chrome 116, Firefox 124, Safari 17.4. `AbortController` itself
(Chrome 66, Firefox 57, Safari 12.1) is required unguarded by the HTTP layer.

### `document.startViewTransition`

Used in `dom/transition.ts` (`viewTransition`) and by the router when
`RouterOptions.viewTransition` is on.

```ts
if (typeof doc.startViewTransition === 'function' && !device.reducedMotion) { ... }
```

Without it, the update callback runs directly. The page changes instantly instead of
cross-fading. Also skipped when the user has `prefers-reduced-motion: reduce`.

Native support: Chrome 111, Safari 18, Firefox 144.

### `structuredClone`

Used in `utils/index.ts` (`clone`). Guarded with `typeof structuredClone === 'function'`
inside a `try`, falling back to a manual recursive clone.

Native support: Chrome 98, Firefox 94, Safari 15.4.

### `crypto.randomUUID`

Used in `utils/index.ts` (`uuid`). Three tiers: `randomUUID`, then
`crypto.getRandomValues` with manual v4 assembly, then `Math.random`. The last tier is not
cryptographically strong and is documented as such by its position in the chain.

Native support: Chrome 92, Firefox 95, Safari 15.4. `crypto.getRandomValues` goes back to
Chrome 11, Firefox 21, Safari 6.1.

### `navigator.clipboard`

Used in `runtime/magics.ts` (`$clipboard`), `directives/ui.ts` (`v-copy`) and
`ui/components.ts`.

`writeText` falls back to a hidden `<textarea>` plus `document.execCommand('copy')`, which
works in every browser in the matrix. `readText` falls back to returning an empty string,
because there is no equivalent legacy read path.

Native support: Chrome 66, Firefox 63, Safari 13.1. `readText` in Firefox: 125.

### `navigator.share`

Used by `v-share` in `directives/ui.ts`. Guarded with `typeof nav.share === 'function'`.
Without it, the directive copies the link to the clipboard and dispatches
`voodoo:share` with `{ method: 'clipboard' }` instead of `{ method: 'native' }`. The
`method` field in the event detail is the supported way to tell which path ran.

Native support: Chrome 89 (desktop), Safari 12.1, Firefox on Android only.

### `Element.animate` (Web Animations API)

Used by `VoodooCollection.animate` in `dom/query.ts`. Guarded per element with
`typeof el.animate !== 'function'`, in which case that element is skipped.

Note: `motion/index.ts` does **not** use WAAPI. It drives its own frame loop, so
`V.animate`, springs, stagger and the `v-motion*` directives do not depend on this API.

Native support: Chrome 36, Firefox 48, Safari 13.1.

### `BroadcastChannel`

Used by `v-sync` in `directives/state.ts` to mirror state across tabs. Guarded with
`typeof BroadcastChannel === 'undefined'`, in which case **the directive is a no-op**:
state still works locally, it just does not cross tabs.

Native support: Chrome 54, Firefox 38, Safari 15.4.

### `AudioContext` / `webkitAudioContext`

Used in `sound/index.ts`. Both spellings are tried, construction is wrapped in `try`, and
`null` disables the sound module. `v-sound` and `v-mute` become no-ops.

Native support: Chrome 35, Firefox 25, Safari 14.1 unprefixed (Safari 6 prefixed).

### `localStorage` / `sessionStorage`

Used in `storage/index.ts`, `store/index.ts` (`persist`), `ui/palette.ts` and
`directives/state.ts` (`v-persist`, `v-storage`).

Guarded twice: presence is checked with `typeof localStorage !== 'undefined'`, and every
read and write is wrapped in `try`/`catch`. This covers Safari private browsing quota
errors and blocked third-party storage. On failure the value lives in memory only for that
page load, and a quota error on a persisted store is swallowed so the store keeps working.

### `matchMedia`

Used in `runtime/magics.ts` (`$screen.matches`), `storage/index.ts` (`theme`),
`utils/index.ts` (`device`), `sound/`, `motion/`, `charts/`, `forms/validate.ts` and
`ui/dialog.ts`, mostly to read `prefers-reduced-motion` and `prefers-color-scheme`.

Every call site guards with `typeof matchMedia === 'undefined'` or
`typeof window.matchMedia !== 'function'` and returns `false` / `'light'`. This is also
what makes the modules importable in Node.

Native support: Chrome 9, Firefox 6, Safari 5.1. `prefers-reduced-motion`: Chrome 74,
Firefox 63, Safari 10.1. `prefers-color-scheme`: Chrome 76, Firefox 67, Safari 12.1.

---

## 4. Required APIs used without a guard, worth knowing about

These are not feature-detected. They are all well within the matrix below, but they are the
places where a very old browser fails loudly rather than degrading.

| API                            | Used in                              | Minimum                                | Failure mode |
| ------------------------------ | ------------------------------------ | -------------------------------------- | ------------ |
| `fetch`                        | `http/index.ts`, all HTTP directives | Chrome 42, Firefox 39, Safari 10.1     | request throws |
| `AbortController`              | `http/index.ts` timeouts             | Chrome 66, Firefox 57, Safari 12.1     | request setup throws |
| `EventSource`                  | `http.sse`                           | Chrome 6, Firefox 6, Safari 5          | `V.http.sse` throws; nothing else affected |
| `ReadableStream` + `TextDecoder` | `http.stream` (NDJSON)             | Chrome 43, Firefox 65, Safari 10.1     | `V.http.stream` throws |
| `XMLHttpRequest.upload`        | `http.upload` progress               | universal                              | -            |
| `FormData` / `URLSearchParams` | HTTP bodies, `serializeForm`, `V.url`| Chrome 21 / 49, Firefox 4 / 29, Safari 8 / 10.1 | throws |
| `Object.fromEntries`           | `storage/index.ts` (`url.params`)    | Chrome 73, Firefox 63, Safari 12.1     | `V.url.params` throws |
| `globalThis`                   | `utils` (`crypto`), `forms/validate` (`CSS.escape`), `directives/http` (`confirm`) | Chrome 71, Firefox 65, Safari 12.1 | ReferenceError |
| `Intl.RelativeTimeFormat`      | `utils.relativeTime`, `V.rt`         | Chrome 71, Firefox 65, Safari 14       | throws on call |
| `Intl.NumberFormat` / `DateTimeFormat` | `utils` formatters, charts   | Chrome 24, Firefox 29, Safari 10       | -            |
| `CSS.escape`                   | `forms/validate.ts`                  | Chrome 46, Firefox 31, Safari 10       | accessed via `globalThis` and optional-chained |
| `History.pushState`            | `router/index.ts`                    | universal                              | -            |
| `requestAnimationFrame`        | `dom/transition.ts`, `boot.ts`, `magics.ts`, `ui/toast.ts` | Chrome 24, Firefox 23, Safari 6.1 | `boot.ts` has a `setTimeout` fallback; the others do not |
| `navigator.connection`         | `$network.type` / `.slow`            | Chromium only                          | optional-chained; `$network.online` still works everywhere |

`Intl.RelativeTimeFormat` is the tightest of these on Safari (14, released September 2020)
and it is the single API that pushes the practical Safari floor up if you use
`V.relativeTime` or `V.rt`.

---

## 5. APIs deliberately not used

Confirmed absent from `packages/voodoojs/src` at `0.1.0`:

- `eval`, `new Function`, `setTimeout` with a string body. See [SECURITY.md](SECURITY.md).
- `WeakRef` / `FinalizationRegistry`. Cleanup is explicit, driven by `EffectScope.stop()`
  and the walker's `destroy()`.
- `requestIdleCallback`.
- Custom Elements / Shadow DOM. Components are plain elements with a scope attached.
- The native `<dialog>` element and `showModal()`. `V.modal` and `v-modal` build their own
  overlay so behaviour is identical across the matrix. `ui/dialog.ts` manages focus,
  `aria-modal` and Escape by hand.
- The HTML `popover` attribute. `v-popover` is a Voodoo directive with its own positioning,
  unrelated to the platform feature of the same name.
- The `:has()` CSS selector.
- Any WebComponent, WASM, or Worker API.

---

## 6. Support matrix

Derived from sections 2 to 4. The **Core** column is what the minimal and essential bundles
need. The **Full** column adds charts, motion, router, i18n and the component library.

| Browser              | Core        | Full        | Notes |
| -------------------- | ----------- | ----------- | ----- |
| Chrome / Edge        | **66**      | **73**      | Core floor is `AbortController`. Full floor is `Object.fromEntries` and `ResizeObserver` (64). |
| Firefox              | **57**      | **69**      | Core floor is `AbortController`. Full floor is `ResizeObserver`. |
| Safari (macOS / iOS) | **12.1**    | **13.1**    | Core floor is `AbortController` and `IntersectionObserver`. Full floor is `ResizeObserver` and `Element.animate`. Add **14** if you use `V.relativeTime` / `V.rt`. |
| Opera                | **53**      | **60**      | Tracks Chromium. |
| Samsung Internet     | **9.0**     | **11.0**    | Tracks Chromium. |
| Internet Explorer    | not supported | not supported | No `Proxy`. |
| Legacy Edge (12-18)  | not supported | not supported | No `Proxy` semantics that `reactive()` relies on, no `AbortController`. |
| Node / Bun / Deno    | `reactivity`, `parser`, `utils`, `store`, `http` import cleanly | - | The DOM layers guard on `typeof document === 'undefined'` and return early. |

Practical reading: **a 2019 browser runs Voodoo.js.** Everything above the floor either
works or degrades in a way described in section 3.

### Recommended floor

For a project starting today, target **Chrome 111 / Firefox 124 / Safari 17.4** to get
every optional path natively: `AbortSignal.any`, `startViewTransition`, `structuredClone`,
`randomUUID`, `BroadcastChannel`, `navigator.clipboard.readText`. Nothing breaks below
that; you just take the documented fallbacks.

---

## 7. Graceful degradation summary

One table, for reviewers who need to answer "what happens if the user's browser is old".

| Missing                        | Result                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| `IntersectionObserver`         | Lazy content loads immediately. Reveal animations run at mount. Infinite scroll fetches its first page. |
| `ResizeObserver`               | Charts render but stop refitting on container resize.        |
| `AbortSignal.any`              | Only the internal timeout signal is honoured when a caller also passes one. |
| `startViewTransition`          | Page updates instantly instead of cross-fading.              |
| `structuredClone`              | `V.clone` uses a recursive JS clone.                          |
| `crypto.randomUUID`            | `V.uuid` falls back to `getRandomValues`, then `Math.random`. |
| `navigator.clipboard.writeText`| `v-copy` uses `execCommand('copy')`.                          |
| `navigator.clipboard.readText` | `$clipboard.read()` returns `''`.                             |
| `navigator.share`              | `v-share` copies the link; `voodoo:share` reports `method: 'clipboard'`. |
| `Element.animate`              | `V(sel).animate()` skips that element. `V.animate` is unaffected. |
| `BroadcastChannel`             | `v-sync` is a no-op; local state still works.                 |
| `AudioContext`                 | `v-sound`, `v-mute` and `V.sound` are no-ops.                 |
| `localStorage`                 | Persistence is in-memory for the page load. No exception escapes. |
| `matchMedia`                   | `$screen.matches()` returns `false`; theme falls back to light; reduced-motion is treated as off. |
| `prefers-reduced-motion`       | Treated as "no preference"; animations run.                   |
| `MutationObserver`             | `V.config.autoDiscover` has no effect and the boot loop falls back to `setTimeout`; call `V.start()` or `V.refresh()` after inserting HTML. |

---

## 8. Accessibility and motion preferences

Two preferences are honoured throughout, and both are part of the support contract:

- **`prefers-reduced-motion: reduce`** short-circuits `enter`/`leave` in
  `dom/transition.ts`, disables spring and scroll animation in `motion/`, skips
  `startViewTransition`, mutes sound effects, and disables the shake animation on
  validation errors.
- **`prefers-color-scheme: dark`** is handled by `BASE_TOKENS` in `dom/style.ts`, which
  redefines the `--v-*` tokens under
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` and
  again under `:root[data-theme="dark"]`, so an explicit `data-theme` always wins over the
  system preference in both directions.

---

## 9. Testing environment

The test suite runs under `jsdom` (`vitest.config.ts`, `environment: 'jsdom'`), which does
**not** implement `IntersectionObserver`, `ResizeObserver`, `matchMedia` by default,
`BroadcastChannel`, or the Web Animations API. That is a feature: it means the fallback
paths in section 3 are the ones under test on every run.

Behaviour that depends on a real engine (layout, painting, real `IntersectionObserver`
timing, View Transitions) is not covered by the unit suite. Real-browser testing is tracked
in [ROADMAP.md](ROADMAP.md) and in [QUALITY.md](QUALITY.md) under the *Browser Tests*
dimension.

---

## 10. Reporting a compatibility problem

Open an issue with the bug template and include:

- browser name and full version, plus the operating system;
- which bundle (`voodoo.core.min.js`, `voodoo.min.js`, `voodoo.full.min.js`, or an npm
  import through your own bundler);
- a single-file HTML reproduction;
- the console output, including any `[Voodoo]` warning.

If the browser is below the floor in section 6, say so in the issue; those reports are
still useful for deciding when to move the floor, but they will not be fixed by adding a
polyfill to the bundle. Voodoo.js does not ship polyfills.
