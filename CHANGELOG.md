# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adopts [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.7.0] - 2026-09-03

A minor rather than a patch, because a documented keyboard shortcut changed.

### Changed

- **The devtools shortcut is `Alt+Shift+V`, not `Ctrl+Shift+X`.** Opera closes
  the tab with Ctrl+Shift+X, and browsers claim most of that range for
  themselves; a shortcut the browser gets to first is not a shortcut. It is
  matched on `event.code` as well as `event.key`, because Alt composes a
  different character on some layouts. Changed everywhere it is documented, not
  only where it is implemented.

### Fixed

- The documentation's live-example frames paint their own background. They were
  transparent, so their text was drawn with the frame's `--ink` over the card's
  background, and those two resolve their themes separately: when they disagreed
  the result was dark text on a dark card.
- The theme toggle inside those frames does something. They styled themselves
  from `data-tema`, which the shell stamps, while the library writes
  `data-theme` when something inside the frame changes it — so the
  `v-theme-toggle` example flipped a state nothing was listening to.

### Internal

- Site asset URLs are keyed on a content hash rather than the package version.
  Assets change between releases: docs.js was fixed three times inside 0.6.2 and
  kept the URL `?v=0.6.2` throughout, so nobody who had already loaded a page
  received any of it. Each fix was deployed, verified on the server, and
  correctly reported as still broken by someone whose browser held an older copy.
- CI downloads the browser before running the browser suite. Without it all 53
  specs failed with "Executable doesn't exist" and the quality report scored that
  check 2.0 — red for a reason unrelated to any change, which trains everyone to
  scroll past it.


## [0.6.2] - 2026-09-03

### Fixed

- **The router fallback no longer navigates the page away.** 0.6.1 stopped the
  router throwing in a document with an opaque origin, but the fallback it added
  called `location.replace(url)` for a replacing navigation. `buildUrl` returns
  pathname + search + hash, and in an `about:srcdoc` document `location.pathname`
  is the bare string `srcdoc`, which resolves against the parent: the frame left
  for `/docs/guia/srcdoc` and the live example was replaced by a 404 page. An
  exception was bad; walking off the page was worse.

  The fallback now touches the hash and nothing else. Replace semantics cannot be
  honoured in a document that refuses the History API, and one extra history
  entry is a lesser wrong than leaving the page.

- Nine browser tests cover this, in a real Chromium against a real
  `about:srcdoc` frame, and all nine fail against 0.6.1. They live in the browser
  suite because neither bug is reachable from jsdom: it has no opaque origins, so
  `pushState` never refuses, and `location.replace` is a no-op there, so the
  escape cannot happen either. A jsdom test for either passes whether the fix is
  present or not, which is worse than no test.

### Changed

- The published package README is no longer a stub. It carries the site links,
  the component list, the benchmark table with its honest reading, and the CSP
  and attribute-cleanup properties that are the reasons to pick this over the
  alternatives.


## [0.6.1] - 2026-09-03

### Fixed

- **The router no longer throws where the History API is refused**
  ([#2](https://github.com/kwy404/Voodoo.js/issues/2)). A document with an opaque
  origin — `about:srcdoc`, or a sandboxed iframe without `allow-same-origin` —
  raises `SecurityError` from `pushState` for any URL at all, including one that
  only changes the hash. The call was unconditional in both modes, so the first
  navigation threw and nothing moved. The documentation's own live examples run
  in exactly that kind of frame, which is where it was reported.

  Navigation never needed the History API. In hash mode the hash is now written
  directly, which an opaque document does allow, with the resulting `hashchange`
  suppressed so the transition does not run twice. In history mode the route
  still resolves and renders and only the address bar stays behind: a worse URL
  rather than a broken page. The refusal is asked once and remembered, since it
  is a property of the document, and forgotten by `stopRouter()`.

  Only `SecurityError` is treated as a refusal. Any other failure is a bug and
  is still thrown.

### Internal

- `scripts/check-refs.mjs` was silently checking half of what it claimed. Its
  pattern demanded a quote straight after the path, so once `stamp-version.mjs`
  appended `?v=` to every asset the count fell from 180 to 94 and it still
  reported zero broken. A check that fails quietly while saying yes is worse
  than no check.
- `.claude/` is untracked and ignored.


## [0.6.0] - 2026-09-02

A minor rather than a patch, because the default validation messages changed
language. Anything else here is a fix.

### Changed

- **The default validation messages are English.** They were Portuguese, which
  made them the one part of the library speaking a language the rest of it does
  not: a form built anywhere answered "Informe um e-mail valido". All 33 moved,
  along with the chart series label that defaulted to "Valor". The rule names
  `cpf`, `cnpj` and `cep` are untouched — those are Brazilian document formats
  and the names are API; only their text changed. Nothing is fixed in place: the
  `messages` object is exported and writable, and the i18n module translates
  `validation.<rule>`, so a Portuguese page restores its own wording in a line.
- The last Portuguese identifiers left the source: 68 of them across nine files,
  the devtools launcher holding most.

### Fixed

- **`theme.init()` no longer throws where `matchMedia` is absent.**
  `matchMedia?.(...)` reads as a guard and is not one: optional chaining protects
  against a null or undefined value, never against an identifier that was never
  declared. In jsdom, older webviews and some embedded browsers the bare name
  raised a ReferenceError and took the whole of init() with it, so the library
  did not start at all.
- **A chart fits the element it was given.** `draw()` measured the host for width
  but took a per-type constant of 260px for height, so a `<div v-chart>` with a
  150px height produced a 260px SVG that overflowed by 110px. Nothing clipped it,
  so stacked charts painted over each other.
- **A theme choice applies even where it cannot be persisted.** `storage`
  swallows its own failures, which is right, but the choice was discarded with
  them: `set()` wrote nothing, `chosen` stayed false, and `apply()` returned
  without touching the document. A `v-theme-toggle` inside a sandboxed iframe did
  nothing at all, silently.
- **`v-modal-content` is hidden again when the modal closes.** `dialog.ts` re-hid
  the adopted element only if the attribute was still present, but
  `cleanAttributes` strips every `v-*` attribute as soon as the directives
  install, so the condition never held. It asks the directive index now. The
  browser test that recorded this at full strength is un-marked: all 44 pass.

### Site

Published at [kwy404.github.io/Voodoo.js](https://kwy404.github.io/Voodoo.js/),
and built with the framework itself.

- A **playground** with an editor, a live preview and 26 examples, each one
  verified to render and to survive being clicked.
- A **component gallery** generated from the source, so it cannot drift from the
  API it documents. All 29 run on the page above the markup that produced them.
- The **examples and the design system moved inside `site/`**, so the repository
  and the thing it publishes finally agree. A link written as `examples/` used to
  resolve in production and 404 on disk.
- `scripts/check-refs.mjs` resolves every relative href and src and fails on the
  dead ones — written after that move silently unstyled eleven pages.


## [0.5.0] - 2026-09-02

First release published to the npm registry, as
[`voodoojs`](https://www.npmjs.com/package/voodoojs).

Versions 0.2.0 through 0.4.6 shipped as GitHub releases and were never written down here. This
entry covers the work in 0.5.0 only; the gap is left visible rather than reconstructed from memory.

### Added

- Published to npm. `npm install voodoojs`, or a script tag from
  `https://cdn.jsdelivr.net/npm/voodoojs@0.5/dist/voodoo.min.js`.
- 44 browser tests running in real Chromium via Playwright, covering what jsdom structurally
  cannot: hit-tested clicks against real layout, `v-for` node identity proven with external
  expandos, the modal focus trap (jsdom reports every element as zero-sized, so the trap could
  never be exercised there), and a CSP suite that loads the framework under
  `script-src 'self'` with no `unsafe-eval` and asserts zero policy violations.
- `scripts/chart-comparison.mjs` draws the benchmark chart directly from the benchmark JSON, so
  the picture can no longer drift from the table beside it.

### Changed

- **Performance.** Creating a 1,000-row keyed list is **36.2% faster** and clearing one is **44.6%
  faster**, measured with a paired harness that loads both builds in one process and interleaves
  their samples. Against other frameworks Voodoo moved from sixth of seven to third on create, and
  from last to fourth on clear. Update is unchanged; an earlier apparent gain there was noise.
  - `collectDirectives` and `stripAttributes` read `getAttributeNames()` instead of indexing the
    live `attributes` collection.
  - `v-for` strips the key attribute from its row template, so clones stop parsing an attribute
    only to no-op on it.
  - Reactive class fields are declared rather than emitted as `Object.defineProperty` calls under
    `useDefineForClassFields` — 33 of those per list row, in the shipped bundles.
  - A directive builds its `EffectScope` only when something needs one.
  - Six other optimisations were measured, found to sit inside the noise floor, and reverted. They
    are listed in `benchmarks/reports/comparison.md` alongside the ones that worked.
- The `voodoo.core.min.js` gzip budget moved from 46 KB to 47 KB. The reason is recorded in
  `scripts/size.mjs`: the performance work had spent the last of its headroom, and a zero-headroom
  budget was about to block a one-line accessibility fix over ten gzipped bytes.

### Fixed

- **Accessibility**, from 5.3/10 to 10/10 on the project's own scorecard. Drawers take their
  accessible name from a heading inside the panel and settle without animation under
  `prefers-reduced-motion`; dropdown items and triggers respond to Enter and Space; tooltips
  reach keyboard and touch users, not only a hovering mouse; tablists declare their orientation
  and their arrow keys follow it; accordion panels become labelled regions; the command palette
  traps focus against script and pointer escapes, not just Tab; toasts announce as a unit with
  `aria-atomic`, which the alert pattern requires because the body is replaced whole on update.
- `packages/voodoojs/src/runtime/walker.ts` held a raw NUL byte inside the `parseAttribute` cache
  key, which made git treat a TypeScript file as binary and undiffable. It is written as the ` `
  escape now, producing a byte-identical string.
- `scripts/quality/browser.mjs` asserted at `waitUntil: 'load'`, before the boot loop mounts. No
  runner had ever been installed, so the check had never once executed; installing Playwright
  turned it straight from SKIP to FAIL against a correct build.

### Known issues

- `v-modal-content` stays visible in the page after the modal closes. `dialog.ts` re-hides the
  adopted element only when the `v-modal-content` attribute is still present, but
  `config.cleanAttributes` strips every `v-*` attribute right after the directives install, so the
  condition never holds. Recorded as a full-strength failing browser test rather than skipped.


## [0.1.0] - 2026-08-28

First public release. Everything below is included in this version.

### Added

#### Reactive Core

- `reactive`, `ref`, `shallowRef`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`,
  `flushSync`, `stop`, `toRaw`, `markRaw`, `unref`, `isReactive`, and `EffectScope`.
- Key-based dependency tracking with Proxy and microtask scheduling.
- Infinite loop detection that breaks the loop with a warning instead of freezing the page.
- Global error handler with `V.onError`.

#### Expressions

- Custom lexer, Pratt parser, and tree interpreter. No `eval` or `new Function`,
  allowing it to run with restrictive Content Security Policy.
- Support for literals, template literals, spread, optional chaining, arrow functions,
  ternary, compound assignment, increment, and sequences.
- Closed list of allowed globals, extensible via `V.config.globals`.
- Parse cache per expression.
- Text interpolation with single-brace `{ value }`, also accepting double-brace syntax.

#### Essential Directives

- `v-text`, `v-html`, `v-show`, `v-if`, `v-else-if`, `v-else`, `v-for`, `v-bind`, `v-class`,
  `v-style`, `v-on`, `v-model`, `v-init`, `v-ref`, `v-effect`, `v-watch`, `v-cloak`, `v-once`,
  `v-teleport`, `v-transition`, `v-ignore`, `v-pre`, `v-data`, and `v-component`.
- Shortcuts: `:attribute`, `@event`, `.property`, and event directives by name from
  `v-click` through `v-drop`.
- Event modifiers: `prevent`, `stop`, `self`, `once`, `capture`, `passive`, `window`,
  `document`, `outside`, `debounce`, `throttle`, keys, and system keys.
- Synthetic events: `hold`, `outside`, `visible`, `swipeleft`, `swiperight`, `swipeup`, and
  `swipedown`.
- Event aliases: `hover`, `unhover`, `tap`, `press`, `release`, `rightclick`, `type`,
  `enterkey`, and `submitform`.
- Element reuse in `v-for` by `:key`, with cursor-based reordering.

#### Runtime

- Walker with directive priority, terminal directives, and DOM observation via
  `MutationObserver`.
- Automatic cleanup of effects, listeners, and observers when a node is removed.
- **Cleanup of `v-*` attributes after rendering**, controlled by
  `V.config.cleanAttributes`, with internal indexing so directives can still find them.
- Configuration via `<script>` tag: `data-manual`, `data-prefix`, `data-base-url`, `data-locale`,
  `data-devtools`, `data-no-styles`, `data-no-observer`, and `data-keep-attributes`.

#### Components

- `V.component` with typed props, `state`, `computed`, `methods`, `watch`, `template`, `style`,
  named slots, `emit`, and full lifecycle.
- Three ways to mount: `v-component`, registered tag, and PascalCase tag.
- Scope isolation by default, with `inheritScope` to inherit from parent.

#### State

- `V.data` for root scope and `V.store` for named stores, with optional persistence.
- `v-persist`, which stores the scope in `localStorage`.
- `v-sync`, which syncs scope across tabs via `BroadcastChannel`.
- `v-history`, `v-undo`, and `v-redo`, with the controller exposed as `$history`.
- `v-storage`, which binds an isolated field to `localStorage`.
- Global event bus with `V.on`, `V.once`, `V.off`, and `V.emit`.

#### HTTP

- `V.http` client over `fetch`, with interceptors, timeout, exponential backoff retry,
  response caching, cancellation, upload with progress, Server-Sent Events, streaming reads,
  and offline queue.
- Automatic CSRF token submission from meta tag.
- Directives `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, `v-load`, `v-load-visible`,
  `v-search`, and `v-resource`.
- Configuration attributes: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-params`, `v-body`,
  `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-as`, `v-json-path`, `v-template`,
  `v-offline-queue`, `v-min-length`, `v-scroll-to`, `v-manual`, `v-debounce`, `v-redirect`,
  `v-loading`, `v-loading-class`, `v-disable-loading`, `v-toast-success`, `v-toast-error`,
  `v-on-success`, `v-on-error`, and `v-on-complete`.
- Automatic JSON rendering as table or definition list, with full escaping.
- Automatic cancellation of the previous request from the same element.

#### Forms

- `v-submit`, with nested field serialization, AJAX submission, loading state,
  redirection, HTML swap, and server error handling.
- Reactive state in `$form`, with `loading`, `saving`, `success`, `errors`, `message`, `data`,
  `status`, `dirty`, and `progress`.
- `v-upload` and `v-dropzone`, with real progress bar and keyboard accessibility.
- `v-autosave`, with state indicator.
- `v-guard`, which warns before leaving the page with unsaved changes.

#### Validation

- Engine with 29 rules: `required`, `email`, `url`, `number`, `integer`, `decimal`, `alpha`,
  `alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `same`, `different`,
  `regex`, `date`, `after`, `before`, `accepted`, `in`, `notin`, `phone`, `cpf`, `cnpj`, `cep`,
  `creditcard`, `strongpassword`, and `unique`.
- Real verification digit calculation for CPF and CNPJ, and Luhn algorithm for cards.
- Async validation, with the `unique` rule checking the server.
- Custom rules with `V.validator`, which create the `v-validate-<name>` directive automatically.
- Portuguese messages, configurable via `V.messages` and `v-error-message`.
- Automatic error presentation with `aria-invalid`, `aria-describedby`, `role="alert"`, and
  focus on the first problematic field.

#### Masks

- Named masks: `cpf`, `cnpj`, `cpfcnpj`, `cep`, `phone`, `date`, `time`, `datetime`,
  `currency`, `percent`, `card`, `cvv`, `plate`, `hex`, and `ip`.
- Pattern-based masking with tokens `9`, `A`, `S`, `*`, and escape.
- `v-mask` and `v-mask-currency`, with cursor position preservation and smart deletion
  over separators.
- `.unmask` modifier, which delivers the clean value to `v-model`.
- `V.registerMask` for custom masks.

#### UI

- `v-toggle`, `v-collapse`, `v-collapse-toggle`, `v-dropdown`, `v-dropdown-menu`, `v-popover`,
  `v-tooltip`, `v-tabs`, `v-accordion`, `v-drawer`, `v-offcanvas`, `v-modal`, `v-confirm`,
  `v-theme-toggle`, `v-focus`, `v-focus-trap`, `v-click-outside`, `v-escape`, `v-hotkey`,
  `v-scroll-to`, `v-scrollspy`, `v-sticky`, `v-visible`, `v-infinite-scroll`, `v-lazy-src`,
  `v-lazy-bg`, `v-skeleton`, `v-copy`, `v-copy-from`, `v-print`, `v-share`, `v-download`,
  `v-fullscreen`, `v-resizable`, `v-command`, `v-command-item`, `v-idle`, `v-online`, and
  `v-offline`.
- Notifications with queue, pause on hover, progress bar, action, and promise support.
- Accessible dialogs: `modal`, `alert`, `confirm`, `prompt`, and `dialog`, with stacking, focus
  trapping, and focus restoration.
- Command palette with accent-insensitive search and keyboard navigation.
- Global keyboard shortcuts with `V.hotkey`, understanding `mod` as Command on macOS.
- Floating positioning that flips sides when it doesn't fit and never leaves the screen.

#### Drag and Drop

- `v-sortable`, `v-draggable`, `v-droppable`, and `v-dnd-group`, built on pointer events,
  working with mouse, pen, and touch.
- Full keyboard drag, with announcement in `aria-live` region.
- Groups, selector filter, drag handle, axis lock, and auto-scroll.

#### Theme and Palette

- Light and dark theme with `V.theme`, applied before first render.
- `V.palette`, which generates 50–900 scales in OKLCH, dark version, and highest-contrast text
  color, with five ready presets.
- `--v-*` CSS tokens used by all components.
- Color utilities: scale, WCAG contrast, luminance, and conversions between sRGB and OKLCH.

#### Chainable DOM

- `V(selector)` with traversal, content, attributes, classes, styles, structure, events with
  delegation, effects, form serialization, and runtime integration.

#### Full Build

- **Charts** in pure SVG, with 11 types, clickable legend, tooltip, responsiveness via
  `ResizeObserver`, and accessible description generated from data.
- **Animations** with shared loop, tween and real spring physics, nine presets, eight curves,
  `stagger`, `inView`, `scrollProgress`, plus `v-motion`, `v-motion-scroll`,
  `v-motion-stagger`, `v-motion-hover`, `v-motion-tap`, `v-parallax`, `v-flip`, `v-count`, and
  `v-typewriter`.
- **Single-page router** with `history` and `hash` modes, required and optional parameters, wildcard,
  global and per-route guards, scroll control, per-route title, View Transitions, and directives
  `v-router-view`, `v-link`, and `v-route-active`.
- **Internationalization** with reactive translation, CLDR pluralization, lazy loading, number, currency,
  date, and relative time formatters, and directives `v-t`, `v-t-params`, and `v-locale`.
- **xray inspector**, which outlines elements with directives, shows scopes, components, stores,
  events, network, and performance, and flashes elements on every reactive update.
- **29 ready-made components**: `VButton`, `VIconButton`, `VCard`, `VLabel`, `VField`, `VInput`,
  `VTextarea`, `VSelect`, `VCheckbox`, `VRadio`, `VSwitch`, `VBadge`, `VTag`, `VAlert`,
  `VAvatar`, `VSpinner`, `VSkeleton`, `VProgress`, `VDivider`, `VTable`, `VPagination`,
  `VBreadcrumb`, `VStat`, `VEmptyState`, `VTimeline`, `VSteps`, `VRating`, `VTooltipButton`, and
  `VCodeBlock`.

#### Tooling

- Two browser bundles: essential and full, both publishing `window.V`.
- ESM, CJS, and TypeScript types builds, with dedicated entry points for reactivity, HTTP, and
  utilities.
- Command-line tool `@voodoo/cli`, with `init`, custom `build`, `add`, and `info`.
- Bundle size measurement script with targets per bundle.
- Suite with 190+ automated tests, covering reactivity, parser, directives, state, HTTP,
  UI, and utilities.

### Release Notes

- `v-*` attributes are removed from the HTML after processing. Do not write CSS that relies on
  selectors like `[v-tab]`.
- `v-confirm` on the same element as an HTTP verb directive or `v-submit` asks twice. Prefer
  `v-confirm` with `v-click`, or `$confirm(...)` inside an expression.
- `v-t-params` is read only on first render. For text that responds to locale changes, use
  interpolation `{ $t('key', { n: value }) }`.
- `v-chart-*` attributes are read at mount time. With reactive data, declare everything in the
  object: `v-chart="{ type: 'bar', data: sales }"`.
- Extra `v-confirm` text, like `v-confirm-title`, depends on
  `V.config.cleanAttributes = false`.

[Unreleased]: https://github.com/voodoojs/voodoo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/voodoojs/voodoo/releases/tag/v0.1.0
