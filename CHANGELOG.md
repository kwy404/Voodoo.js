# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adopts [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
