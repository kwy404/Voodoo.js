# Voodoo.js API Conventions

This document defines the naming rules, the stability tiers and the deprecation policy for
the public API. Part of it describes what the code already does; part of it formalizes
rules that were implicit. Where the current code disagrees with the rule, that is called
out in [section 7](#7-known-inconsistencies) rather than hidden.

Applies from `0.1.0` onward.

---

## 1. The four namespaces

Voodoo.js has exactly four ways to expose a capability. Every new API must pick one.

| Shape          | Meaning                                    | Example                                  |
| -------------- | ------------------------------------------ | ---------------------------------------- |
| `V.thing()`    | programmatic API, called from JavaScript   | `V.toast.success('Saved')`               |
| `v-thing`      | declarative behaviour, written in HTML     | `<div v-show="open">`                    |
| `@event`       | event binding, shorthand for `v-on:event`  | `<button @click="save()">`               |
| `:attribute`   | attribute binding, shorthand for `v-bind:` | `<img :src="user.avatar">`               |
| `$magic`       | ambient value inside an expression         | `<span>{ $store.cart.total }</span>`     |

Three additional attribute spellings exist and are equivalent, handled by `parseAttribute`
in `runtime/walker.ts`:

- `data-v-thing` - always accepted, for strictly valid HTML and for HTML validators.
- `.prop="expr"` - binds to the DOM property instead of the attribute; equivalent to
  `:prop.prop`.
- a configurable prefix - `V.config.prefix` defaults to `'v-'`.

### `V.thing()`

- `V` is both a function and an object. `V('#list .item')` returns a chainable collection;
  `V.toast` is a service.
- Services are objects with methods (`V.http.get`, `V.toast.success`, `V.storage.set`).
- Factories and one-shot actions are functions (`V.reactive`, `V.component`, `V.animate`).
- Registries are plural and are the underlying `Map` or object
  (`V.directives`, `V.components`, `V.magics`, `V.stores`).

The pairing rule: **a singular verb registers, the plural noun is the registry.**

```js
V.directive('highlight', hooks);   // register
V.directives;                       // Map<string, DirectiveDefinition>

V.component('counter', def);        // register
V.components;                       // Map<string, ComponentDefinition>

V.magic('$now', () => Date.now());  // register
V.magics;                           // Map<string, MagicGetter>
```

### `v-thing`

A directive is a behaviour that only makes sense declaratively, attached to an element.

### `@event` and `:attribute`

`@` is only ever `v-on`. `:` is only ever `v-bind`. Never introduce a third sigil.

### `$magic`

`$` marks a value that is not in scope and was not declared by the author: it comes from
the runtime. Magics are read-only unless the value they return exposes its own `set`
(`runtime/scope.ts`, `magicContainer`).

Reserved: any identifier starting with `$` inside an expression. Plugins that register
magics must namespace them (see [section 6](#6-plugin-namespacing)).

---

## 2. The "not everything is an attribute" rule

The library ships a large number of attribute names, and that is exactly why this rule
matters more here than elsewhere.

**A directive exists only when it solves a genuinely declarative problem.** Concretely, a
proposal for `v-something` must satisfy all four:

1. **It binds behaviour to an element.** If it does not need an element, it is a `V.*`
   function, not a directive.
2. **The alternative is boilerplate, not one line.** `v-model` replaces an event listener
   plus a reactive write plus type coercion. A directive that wraps a single
   `el.addEventListener` earns nothing.
3. **The HTML reads better than the JavaScript would.** `<div v-show="open">` states an
   intent. `<div v-set-color="'red'">` states an implementation.
4. **It is not a configuration value for another directive.** Those are registered through
   `defineOption` in `directives/shared.ts` and are documented as *options*, not as
   directives. `v-tooltip-position` configures `v-tooltip`; it is not a feature on its own.

Anti-patterns, stated plainly:

```html
<!-- No. This is a style, not a behaviour. -->
<div v-background="'red'"></div>

<!-- No. This is one line of JavaScript with extra steps. -->
<div v-log="value"></div>

<!-- Yes. Declarative lifecycle that would otherwise need observers and cleanup. -->
<img v-lazy-src="photo.url">
```

When in doubt, ship it as a `V.*` function first. Promoting a function to a directive later
is additive; removing a directive is a breaking change.

---

## 3. Naming

| Context                     | Case          | Example                            |
| --------------------------- | ------------- | ---------------------------------- |
| JavaScript identifiers      | `camelCase`   | `V.clearParseCache`, `scrollProgress` |
| Classes and constructors    | `PascalCase`  | `Scope`, `EffectScope`, `HttpError`, `VoodooSyntaxError` |
| Constants                   | `SCREAMING_SNAKE` | `PRIORITY`, `CHART_COLORS`, `BASE_TOKENS` |
| HTML attributes             | `kebab-case`  | `v-load-visible`, `v-click-outside` |
| Component registration name | `kebab-case`  | `V.component('user-card', ...)`     |
| Component usage in HTML     | `kebab-case` or `PascalCase` | `<user-card>` or `<UserCard>` |
| Directive modifiers         | `camelCase` if multiword | `@input.debounce=300` |
| CSS custom properties       | `--v-` prefix | `--v-primary`, `--v-radius`         |
| Injected `<style>` marker   | `data-voodoo` | `<style data-voodoo="tokens">`      |
| Store keys                  | `camelCase`   | `V.store('shoppingCart', ...)`      |
| Global events on `V`        | `colon:path`  | `V.emit('cart:updated', payload)`   |
| DOM CustomEvents from Voodoo| `voodoo:` prefix | `voodoo:ready`, `voodoo:share`, `voodoo:field-validated` |

`normalizeComponentName` in `runtime/registry.ts` converts `UserCard`, `userCard` and
`user_card` all to `user-card`, and `defineComponent` additionally registers the
hyphen-free alias `usercard` so that a `<UserCard>` tag (which the HTML parser lowercases)
resolves. **Register with kebab-case.** The other spellings are conveniences at the call
site, not alternative canonical names.

Prop names accept kebab-case, camelCase and lowercase at the HTML boundary
(`resolveProps` in `runtime/component.ts`), and are camelCase inside the component.

---

## 4. Stability tiers

Every public symbol carries exactly one tier. The tier is documented next to the symbol in
`docs/en/api-reference.md`.

| Tier           | Meaning                                                                 | Breaking change allowed in |
| -------------- | ----------------------------------------------------------------------- | -------------------------- |
| `stable`       | Covered by SemVer. Behaviour and signature are contractual.             | major only                 |
| `experimental` | Shipped, documented, usable, but the shape may still change.            | minor                      |
| `deprecated`   | Still works, warns in dev builds, has a documented replacement.         | removed in the next major  |
| `internal`     | Exported for the runtime's own use or for tooling. Not a contract.      | any release                |

### What is `internal` today

These are reachable from `V` but exist to serve the runtime, the devtools or the test
suite. Using them is allowed, but nothing about them is promised:

`V.walk`, `V.refresh`, `V.destroy`, `V.stopObserving`, `V.getScope`, `V.findScope`,
`V.addCleanup`, `V.parseAttribute`, `V.parse`, `V.tokenize`, `V.evaluate`, `V.evaluateIn`,
`V.stringify`, `V.clearParseCache`, `V.instances`, `V.Scope`, `V.PRIORITY`,
`V.directives`, `V.components`, `V.magics`, `V.globals`, `V.flushSync`, `V.injectStyle`,
`V.ensureTokens`, `V.devtools`, `V.xray`, `V.enableXrayShortcut`.

Everything else on `V` is intended as `stable` or `experimental`. Until every symbol is
individually tagged (tracked in [ROADMAP.md](ROADMAP.md), *API stabilization*), treat the
list above as the only guaranteed-unstable surface.

### Marking a symbol

In source, use a JSDoc tag on the export:

```ts
/**
 * Renders a chart into an element.
 *
 * @stability experimental
 */
export function renderChart(el: HTMLElement, options: ChartOptions): ChartInstance {
```

In `docs/en/api-reference.md`, the tier goes in the table row. Anything undocumented is
`internal` by default.

---

## 5. Deprecation policy

Removing or renaming a `stable` symbol follows three steps, and never skips one.

**Step 1 - introduce the replacement.** The new name ships alongside the old one. Both
work. The old name is now an alias, implemented by delegating to the new one, never by
duplicating the body.

```ts
/** @stability stable */
export function validateForm(form: HTMLElement): Promise<FormValidationResult> { /* ... */ }

/** @deprecated Use `validateForm`. Removed in 2.0. */
export const checkForm = validateForm;
```

**Step 2 - warn in development.** The alias warns once per session, only when
`V.config.devtools` is on, so production pages stay silent. Use `avisarAlias` from
`runtime/avisos.ts`, which already handles the once-per-key deduplication and the
`[Voodoo]` prefix:

```ts
import { avisarAlias } from '../runtime/avisos';

export function checkForm(form: HTMLElement) {
  avisarAlias('V.checkForm', 'V.validateForm');
  return validateForm(form);
}
```

For a message that also needs to name the removal version, use `avisarUmaVez` with an
explicit key. Every deprecation warning must name the replacement; a warning that does not
say what to do instead is noise.

Note that `avisarAlias` currently states only that the canonical name is preferred. When
a removal version is decided, extend the message rather than adding a second mechanism.

**Step 3 - remove in a major.** Never in a patch. Never in a minor. The `CHANGELOG.md`
entry for that major lists every removal with its replacement.

For directives, the same three steps apply. A renamed directive keeps the old attribute
name registered as an alias that warns, because HTML in the wild cannot be codemodded.

**Minimum lifetime.** A deprecated symbol lives through at least one full minor release
line before the major that removes it. Deprecating and removing in consecutive releases is
not allowed.

---

## 6. Plugin namespacing

Third-party plugins share the same registries as the core, so names must not collide.

| What the plugin registers | Rule                                      | Example                       |
| ------------------------- | ----------------------------------------- | ----------------------------- |
| Directive                 | prefix with the plugin name               | `v-charts-pro-render`         |
| Component                 | prefix with the plugin name               | `<charts-pro-legend>`         |
| Magic                     | `$` + plugin name, single object          | `$chartsPro.theme`            |
| Property on `V`           | one property, the plugin's own namespace  | `V.chartsPro.render()`        |
| Validation rule           | prefix with the plugin name               | `v-validate-chartspro-range`  |
| Global event              | `pluginName:event`                        | `V.emit('chartsPro:ready')`   |

A plugin should claim **one** name on `V` and hang everything under it. Adding several
top-level properties is how the core's own surface became crowded.

Reserved for the core: every name currently on `V`, every `$magic` listed in
`runtime/magics.ts`, and every attribute name registered by the bundled modules.

See [docs/plugin-spec.md](docs/plugin-spec.md) for the full plugin contract.

---

## 7. Known inconsistencies

These are real, present in `0.1.0`, and listed so that nobody has to rediscover them. Each
one names the canonical form. Aliases stay until a major release, following section 5.

### 7.1 `V.validate` and `V.validateForm` are the same function

`packages/voodoojs/src/index.ts` and `essential.ts` both do:

```ts
validate,
validateForm: validate,
```

`validate` (in `forms/validate.ts`) is polymorphic: given a form it validates the form,
given a field it validates the field. The module also exports a distinct, narrower
`validateForm`, but **that function is not what `V.validateForm` points to** and it is not
re-exported from the package index either.

- Canonical: `V.validate(target)` - accepts a form or a field.
- Alias: `V.validateForm` - identical behaviour, misleading name.
- Recommendation: keep `V.validate` as the public API; deprecate `V.validateForm`, or
  repoint it at the real `validateForm` in a major. Do not do both silently.

### 7.2 `V.chart` and `V.renderChart` are the same function

```ts
chart: renderChart,
renderChart,
```

- Canonical: `V.renderChart(el, options)` - matches the exported name and the type
  `ChartInstance`.
- Alias: `V.chart`.
- Note that `v-chart` is a directive and `V.charts` is the instance registry, so three
  similar names mean three different things. The alias makes this worse, not better.

### 7.3 `V.once` shadows the `once` utility

`core.ts` spreads `...utils` first, then defines `once: onceEvent`. Two different functions
share the name:

| Access                          | What it is                                     |
| ------------------------------- | ---------------------------------------------- |
| `V.once(name, handler)`         | global event bus, subscribe for one occurrence |
| `import { once } from 'voodoojs'` | function wrapper, calls the wrapped fn once  |

- Canonical for the event bus: `V.once`.
- Canonical for the wrapper: the named import. It is unreachable through `V`.
- Recommendation: rename the event-bus method to `V.onceEvent` (it already has that name
  internally) or rename the utility to `V.onceFn`, and alias the old spelling.

### 7.4 Component `state` and `data`

`ComponentDefinition` in `runtime/registry.ts` declares both. `mountComponent` uses
`definition.state ?? definition.data`.

- Canonical: `state(props)`. The JSDoc calls `data` "an alias, for people coming from Vue".
- Alias: `data(props)`.
- Note the collision with `V.data(values)`, which writes into the **root scope** and is a
  completely unrelated operation, and with the `v-data` attribute, which creates a child
  scope. Three meanings of "data" is one too many; `V.data()` is the weakest of the three
  and is the candidate for renaming (`V.rootData` / `V.globalState`).

### 7.5 `destroyed` and `unmounted` both fire

The cleanup registered by `mountComponent` calls, in order:

```
beforeUnmount -> owner.stop() -> unmounted -> destroyed
```

If a definition declares both hooks, **both run**, one after the other.

- Canonical: `unmounted`.
- Alias: `destroyed` (Vue 2 spelling).
- Recommendation: deprecate `destroyed` with a dev warning when both are present.

### 7.6 `V.evaluate` and `V.evaluateIn` take different first arguments

```ts
V.evaluate(node, scope);        // node is an AST node from V.parse()
V.evaluateIn(expression, scope) // expression is a string
```

Passing a string to `V.evaluate` fails at the `switch (node.t)` with an unhelpful error.
Both are `internal`, but if either is ever promoted, the names must be fixed:
`evaluateNode` / `evaluate`.

### 7.7 `V.ready` and `V.whenReady` wait for different things

| Symbol                       | Condition                                          |
| ---------------------------- | -------------------------------------------------- |
| `V.ready(fn?)`               | body exists (`whenBodyReady`)                       |
| `V.whenReady(fn)`            | body exists **and** the tree has stopped changing   |
| `documentReady` (named import) | the same as `whenReady`, promise form             |

Both are legitimate and both are used internally. The naming does not say which is which.
Recommendation: document the difference prominently (done in `docs/en/api-reference.md`)
and consider `V.whenStable` for the stricter one.

### 7.8 `V.emit` and component `emit` are unrelated mechanisms

- `V.emit(name, payload)` - the in-memory global bus in `core.ts`. Handlers are registered
  with `V.on`. Nothing touches the DOM.
- `this.emit(event, detail)` inside a component - dispatches a bubbling `CustomEvent` on
  the component's element, caught with `@event` in the parent's markup.

Both names are correct in their own context, but a reader seeing `emit` cannot tell which
is meant. Always qualify in documentation and in examples.

### 7.9 Repository URL

The canonical remote is `https://github.com/kwy404/Voodoo.js`. `packages/voodoojs/package.json`
previously pointed at `voodoojs/voodoo`; `repository` and `bugs` have since been corrected.
`homepage` still reads `https://voodoojs.dev`, which is intentional if that domain is live
and wrong otherwise. The GitHub issue templates and `CONTRIBUTING.md` have been updated to
the correct remote.

### 7.10 `V.directive` accepts two shapes with different semantics

```js
V.directive('name', { mounted, updated, ... });   // lifecycle hooks
V.directive('name', (el, binding) => { ... });     // shorthand
```

The shorthand is installed as **both** `mounted` and `updated`, so it runs once on mount and
again on every value change. This is correct and documented, but the two forms are not
interchangeable: a shorthand cannot express `beforeUnmount` cleanup. Use the object form
whenever the directive allocates anything.

Separately, `DirectiveHooks.raw` and `DirectiveDefinition.terminal` are not the same
concept and only the first is reachable from `V.directive`. Third-party directives cannot
currently declare themselves terminal; see [docs/plugin-spec.md](docs/plugin-spec.md).

---

## 8. Versioning

Voodoo.js follows [Semantic Versioning 2.0.0](https://semver.org/).

| Change                                                          | Bump  |
| --------------------------------------------------------------- | ----- |
| Removing or renaming a `stable` symbol                          | major |
| Changing the meaning of an existing attribute                   | major |
| Changing a default in `V.config`                                | major |
| Changing directive priority in a way that reorders execution    | major |
| Removing a `deprecated` symbol                                  | major |
| Adding a directive, component, magic, or `V.*` member           | minor |
| Adding an optional parameter or an optional config field        | minor |
| Marking something `deprecated`                                  | minor |
| Adding a new bundle variant                                     | minor |
| Bug fix with no API change                                      | patch |
| Documentation, comments, internal refactor                      | patch |
| Bundle size change with no behaviour change                     | patch |

While the version is `0.x`, minor releases may contain breaking changes. The `1.0` release
is defined by [ROADMAP.md](ROADMAP.md) as the point where the tiers in section 4 become
binding.

**Bundle size is not a semver-relevant contract**, but a size-budget overrun fails CI. See
`scripts/size.mjs`.

---

## 9. Commit convention

[Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:

| Type       | Use for                                              | Release effect |
| ---------- | ---------------------------------------------------- | -------------- |
| `feat`     | new capability                                       | minor          |
| `fix`      | bug fix                                              | patch          |
| `perf`     | performance, no behaviour change                     | patch          |
| `refactor` | internal change, no behaviour change                 | patch          |
| `docs`     | documentation only                                   | none           |
| `test`     | tests only                                           | none           |
| `build`    | build config, bundling, dependencies                 | none           |
| `ci`       | CI configuration                                     | none           |
| `chore`    | anything else with no user-visible effect            | none           |

Scopes match the source layout: `reactivity`, `parser`, `runtime`, `walker`, `component`,
`directives`, `http`, `forms`, `ui`, `router`, `i18n`, `motion`, `charts`, `store`,
`storage`, `dom`, `utils`, `devtools`, `build`, `docs`.

A breaking change is marked with `!` after the scope **and** a `BREAKING CHANGE:` footer:

```
feat(component)!: remove the `destroyed` lifecycle hook

BREAKING CHANGE: `destroyed` no longer runs. Use `unmounted`, which has
fired alongside it since 0.1.0.
```

Subject line: imperative mood, lowercase, no trailing period, 72 characters or less.

---

## 10. Documentation conventions

- Everything is written in English: source comments, root `*.md`, and the site
  documentation under `site/docs/`. The source has been entirely English since
  0.6.0.
- Portuguese lives in exactly two places, both of them translations of an English
  original rather than originals themselves: `README.pt-BR.md`, and the
  Portuguese locale of the site. When the English changes, the translation is
  stale until someone updates it, and a stale translation is a bug.
- **No em dashes or en dashes** anywhere, in either language. Use a comma, a colon, or a
  full stop. This rule is enforced in review.
- Every exported function carries JSDoc with at least one runnable example.
- A code example in documentation must be copy-pasteable and must actually run.
- Never state a bundle size, a benchmark number, or a test count in prose. Point at
  `npm run size`, `benchmarks/`, or `npm test` instead.
