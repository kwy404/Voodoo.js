# API

Reference of the `V` object, grouped by area. What is marked with **(full)** only exists in
`voodoo.full.min.js` or in a custom build that includes the module.

`V` is both a function and an object:

```js
V('#list .item').addClass('active');   // chainable collection
V.toast.success('Ready');              // services
```

`window.Voodoo` is the same object.

---

## Core

| Member | Description |
| --- | --- |
| `V.version` | Published version |
| `V.config` | Global configuration. See [Installation](installation.md) |
| `V.start(root?)` | Walks and initializes. Called by itself in browser builds |
| `V.walk(node, scope?)` | Initializes a piece of DOM |
| `V.refresh(root?)` | Reinitializes a root |
| `V.destroy(node)` | Unmounts, stopping effects and removing listeners |
| `V.stopObserving()` | Turns off the `MutationObserver` |
| `V.getScope(node)` | Scope associated with the node, if any |
| `V.findScope(node)` | Effective scope, climbing ancestors |
| `V.addCleanup(node, fn)` | Registers cleanup for node removal |
| `V.parseAttribute(name, value)` | Converts an attribute to directive description |
| `V.onError(fn)` | Sets error handling for the entire app |

## Reactivity

| Member | Description |
| --- | --- |
| `V.reactive(object)` | Deep reactive object |
| `V.ref(value)` | Reactive reference, in `.value` |
| `V.shallowRef(value)` | Shallow reference |
| `V.computed(getter)` | Derived value with cache. Accepts `{ get, set }` |
| `V.effect(fn, options?)` | Reactive effect |
| `V.watch(source, cb, options?)` | Observes and calls on change |
| `V.watchEffect(fn)` | Effect with cleanup between runs |
| `V.nextTick(fn?)` | Waits for DOM to reflect |
| `V.flushSync()` | Applies everything pending, now |
| `V.stop(runner)` | Stops an effect |
| `V.effectScope(detached?)` | Creates an effect scope |
| `V.EffectScope` | The class |
| `V.toRaw(value)` | Original object behind the proxy |
| `V.markRaw(value)` | Marks an object to never become a proxy |
| `V.unref(value)` | `value.value` when it's a ref |

See [Reactivity](reactivity.md).

## State

| Member | Description |
| --- | --- |
| `V.data(values)` | Puts values in the root scope |
| `V.scope` | The root scope |
| `V.store(name, definition?, options?)` | Creates or retrieves a store |
| `V.stores` | Object with all stores |
| `V.storeNames()` | Lists the names |
| `V.removeStore(name)` | Removes and stops persistence |

## Components and directives

| Member | Description |
| --- | --- |
| `V.component(name, definition)` | Registers a component |
| `V.components` | `Map` with definitions |
| `V.instances` | `Set` with mounted instances |
| `V.directive(name, definition)` | Registers a directive with lifecycle |
| `V.directives` | `Map` with registered directives |
| `V.magic(name, getter)` | Registers a magic variable |
| `V.magics` | `Map` with magics |
| `V.use(plugin, options?)` | Installs a plugin |
| `V.PRIORITY` | Priority constants |
| `V.Scope` | The scope class |

See [Components](components.md) and [Plugins](plugins.md).

## Expressions

| Member | Description |
| --- | --- |
| `V.parse(text)` | Parses and returns the tree |
| `V.tokenize(text)` | List of tokens |
| `V.evaluate(node, scope)` | Evaluates a tree |
| `V.evaluateIn(text, scope, context?)` | Parses and evaluates, without throwing |
| `V.stringify(value)` | Conversion used in interpolation |
| `V.clearParseCache()` | Clears expression cache |
| `V.globals` | List of allowed globals |
| `V.VoodooSyntaxError`, `V.VoodooRuntimeError` | Error classes |

See [Expressions](expressions.md).

## Chainable DOM

`V(selector)` and `V.query(selector, context?)` return a collection.

**Traversal:** `find`, `closest`, `parent`, `parents`, `children`, `siblings`, `next`, `prev`,
`first`, `last`, `eq`, `filter`, `not`, `has`, `is`, `add`, `slice`, `each`, `get`, `toArray`.

**Content:** `text`, `html`, `val`, `attr`, `removeAttr`, `prop`, `data`.

**Styling:** `css`, `width`, `height`, `offset`, `position`, `scrollTop`, `addClass`,
`removeClass`, `toggleClass`, `hasClass`.

**Structure:** `append`, `prepend`, `before`, `after`, `appendTo`, `prependTo`, `replaceWith`,
`wrap`, `unwrap`, `remove`, `empty`, `clone`.

**Events:** `on`, `off`, `once`, `trigger`, `emit`.

**Visibility and animation:** `show`, `hide`, `toggle`, `fadeIn`, `fadeOut`, `slideUp`,
`slideDown`, `slideToggle`, `animate`, `scrollIntoView`.

**Form:** `serialize`, `serializeObject`, `focus`, `blur`, `select`.

**Runtime:** `walk`, `destroy`.

| Member | Description |
| --- | --- |
| `V.query(input, context?)` | Creates the collection |
| `V.ready(fn)` | Executes when DOM is ready |
| `V.fromHtml(html)` | Creates elements without inserting in document |
| `V.Collection` | The `VoodooCollection` class |

See [Migrating from jQuery](migrating-from-jquery.md).

## HTTP

| Member | Description |
| --- | --- |
| `V.http.get(url, options?)` | Returns the data |
| `V.http.post(url, body?, options?)` | |
| `V.http.put`, `V.http.patch`, `V.http.delete`, `V.http.head` | |
| `V.http.request(config)` | Full response |
| `V.http.upload(url, formData, options?)` | Upload with progress |
| `V.http.sse(url, handlers)` | Server-Sent Events |
| `V.http.stream(url, onLine, options?)` | Line-by-line reading |
| `V.http.interceptors.request.use(fn)` | |
| `V.http.interceptors.response.use(fn)` | |
| `V.http.interceptors.error.use(fn)` | |
| `V.http.setBaseURL(url)` | |
| `V.http.setHeader(name, value)` | |
| `V.http.setToken(token, scheme?)` | |
| `V.http.clearCache(pattern?)` | |
| `V.http.flushOfflineQueue()` | |
| `V.http.defaults` | Default configuration |
| `V.request(config)` | Same as `V.http.request` |
| `V.HttpError` | Error class |

See [HTTP](http.md).

## Forms and validation

| Member | Description |
| --- | --- |
| `V.validate(target)` | Validates a form or field |
| `V.validateForm(form)` | Alias for `V.validate` |
| `V.validator(name, fn, message?)` | Registers a rule |
| `V.messages` | Default messages |
| `V.serializeForm(form, options?)` | Object or `FormData` |
| `V.showFormErrors(form, errors)` | Applies server errors |
| `V.showFieldError(field, message)` | |
| `V.clearErrors(form)` | |

| Member | Description |
| --- | --- |
| `V.mask(value, pattern)` | Applies a mask |
| `V.applyMask(value, pattern)` | Same |
| `V.unmask(value, pattern?)` | Removes formatting |
| `V.registerMask(name, patternOrFn)` | Registers a mask |
| `V.masks` | `Map` with masks |

See [Forms](forms.md), [Validation](validation.md), and [Masks](masks.md).

## Interface

| Member | Description |
| --- | --- |
| `V.toast(message, options?)` | Notification |
| `V.toast.success`, `.error`, `.warning`, `.info`, `.loading` | |
| `V.toast.promise(promise, messages)` | |
| `V.toast.clear()`, `V.toast.configure(options)` | |
| `V.modal.open/close/toggle/closeAll/isOpen` | Modals |
| `V.modal.opened`, `V.modal.count` | |
| `V.modal.configure(options)`, `V.modal.labels(texts)` | |
| `V.dialog(options)` | Generic dialog with buttons |
| `V.alert(message, options?)` | |
| `V.confirm(message, options?)` | |
| `V.prompt(label, options?)` | |
| `V.hotkey(combo, handler, options?)` | Global keyboard shortcut |
| `V.palette(options?)` | Applies the palette |
| `V.palette.use/reset/scale/contrastText/contrastRatio/luminance/convert` | |
| `V.theme.current/resolved/set/toggle/apply/init` | Light and dark theme |
| `V.injectStyle(id, css)` | Injects CSS once |
| `V.ensureTokens()` | Ensures `--v-*` variables |

See [Interface](interface.md) and [Theme and palette](theme-and-palette.md).

## Transitions

| Member | Description |
| --- | --- |
| `V.enter(el, options?)` | Entry transition via classes |
| `V.leave(el, options?)` | Exit transition |
| `V.fadeIn(el, duration?)`, `V.fadeOut(el, duration?)` | |
| `V.slideDown(el, duration?)`, `V.slideUp(el, duration?)` | |
| `V.viewTransition(fn)` | Uses View Transitions API when available |

## Storage

| Member | Description |
| --- | --- |
| `V.storage` | `localStorage` with automatic JSON |
| `V.session` | `sessionStorage`, same API |
| `V.cookie` | `get`, `set`, `remove`, `has` |
| `V.cache` | Memory with expiration: `set`, `get`, `has`, `remove`, `clear`, `remember`, `size` |
| `V.url` | Query string: `get`, `all`, `set`, `remove`, `merge` |

## Global events

| Member | Description |
| --- | --- |
| `V.on(name, handler)` | Subscribes. Returns function that cancels |
| `V.once(name, handler)` | Subscribes only the next time |
| `V.off(name, handler?)` | Cancels |
| `V.emit(name, payload?)` | Fires |

## Environment

| Member | Description |
| --- | --- |
| `V.screen` | Reactive object with width, height, and breakpoints |
| `V.network` | Reactive object with connection state |
| `V.clipboard` | `copy` and `read` |
| `V.device` | Getters for touch, size, motion, and theme |
| `V.isBrowser` | Does DOM exist? |

## Utilities

`uuid`, `uid`, `sleep`, `parseDuration`, `debounce`, `throttle`, `memoize`, `clone`, `merge`,
`groupBy`, `unique`, `chunk`, `sortBy`, `get`, `set`, `random`, `sample`, `slugify`, `truncate`,
`capitalize`, `titleCase`, `escapeHtml`, `stripTags`, `formatCurrency`, `formatNumber`,
`formatDate`, `relativeTime`, `formatFileSize`, `formatPercent`, `setFormatDefaults`.

See [Utilities](utilities.md).

> `V.once` is the event bus. The `once` utility, which executes a function only once,
> is in direct import: `import { once } from 'voodoojs/utils'`.

## Animation (full)

| Member | Description |
| --- | --- |
| `V.animate(target, keyframes, options?)` | Animates elements |
| `V.spring(from, to, options?)` | Spring between two numbers |
| `V.stagger(targets, keyframes, options?)` | Wave between items |
| `V.inView(el, cb, options?)` | Fires when entering screen |
| `V.scrollProgress(el, cb)` | Progress from 0 to 1 on scroll |
| `V.motion` | Ready presets |
| `V.easings` | Ready curves |

See [Animations](animations.md).

## Charts (full)

| Member | Description |
| --- | --- |
| `V.renderChart(el, options)` | Draws and returns control |
| `V.chart` | Alias for `V.renderChart` |
| `V.charts` | `{ render, format, colors }` |
| `V.chartColors` | Default chart palette |

See [Charts](charts.md).

## Router (full)

| Member | Description |
| --- | --- |
| `V.router(options)` | Configures the router |
| `V.router.push/replace/back/forward/go` | Navigation |
| `V.router.resolve/addRoute/removeRoute/patterns/stop/clearViewCache/ready/current` | |
| `V.navigate(destination, options?)` | Navigates |
| `V.route` | Current route, reactive |
| `V.resolveRoute(destination)` | Resolves without navigating |

See [Router](router.md).

## Languages (full)

| Member | Description |
| --- | --- |
| `V.i18n(options?)` | Configures |
| `V.i18n.t/te/n/c/d/rt` | Translation and formatters |
| `V.i18n.addMessages/loadMessages/messagesOf/detectLocale` | |
| `V.i18n.locale/fallback/locales` | |
| `V.t(key, params?)` | Translates |
| `V.setLocale(language)`, `V.getLocale()` | |

See [Languages](languages.md).

## Devtools (full)

| Member | Description |
| --- | --- |
| `V.xray(force?)` | Turns inspector on and off |
| `V.enableXrayShortcut()` | Installs `Ctrl+Shift+X` |
| `V.devtools` | Event bus for devtools |

See [Devtools](devtools.md).

---

## Magic variables

Available in any expression, without declaring anything.

### Context

| Magic | What is it |
| --- | --- |
| `$el` | Element that created the scope |
| `$refs` | Elements marked with `v-ref`, merging ancestor scopes |
| `$data` | Data of the current scope |
| `$root` | Data of the root scope |
| `$parent` | Data of the parent scope |
| `$self` | Nearest component instance, or the scope data |

### State and services

| Magic | What is it |
| --- | --- |
| `$store` | All global stores |
| `$http` | HTTP client |
| `$toast` | Notifications |
| `$modal`, `$dialog`, `$alert`, `$confirm`, `$prompt` | Dialogs |
| `$storage`, `$session`, `$cookie`, `$cache`, `$url` | Storage |
| `$clipboard` | Copy and read clipboard |
| `$theme` | Light and dark theme |
| `$form` | Nearest form state |
| `$history` | Undo/redo controller, when there's `v-history` above |

### Environment

| Magic | What is it |
| --- | --- |
| `$screen` | Width, height, and breakpoints, reactive |
| `$network` | Connection state, reactive |
| `$device` | Touch, size, motion, and theme |

### Flow

| Magic | What is it |
| --- | --- |
| `$nextTick` | Waits for DOM to reflect |
| `$watch(expr, cb)` | Watches an expression |
| `$dispatch(name, detail?)` | Fires a `CustomEvent` that bubbles up the tree |
| `$log(...)` | Writes to console with prefix |

### Full build only

| Magic | What is it |
| --- | --- |
| `$route` | Current route |
| `$router` | Navigation control |
| `$t` | Translates |
| `$locale` | Active language |
| `$i18n` | Language module |
| `$n`, `$c`, `$d`, `$rt` | Number, currency, date, and relative time |

### Local

Only exist inside certain expressions:

| Variable | Where |
| --- | --- |
| `$event` | Event handlers |
| `$detail` | Event handlers, with `CustomEvent` `detail` |
| `$value`, `$old` | `v-watch` combined with `v-model` |
| `$data`, `$response` | `v-on-success` and `v-on-error` of forms |

---

## Named imports

Besides the `V` object, everything is available as a named import:

```js
import {
  reactive, ref, computed, effect, watch, nextTick, effectScope,
  parse, evaluate, tokenize,
  config, PRIORITY, defineDirective,
  Scope, magic, rootScope,
  walk, destroy, refresh, start, findScope, getScope, addCleanup,
  defineComponent, mountComponent, instances,
  screen, network, clipboard,
  http, request, HttpError,
  store, allStores, removeStore, storeNames,
  storage, session, cookie, cache, url, theme,
  toast, modal, alert, confirm, prompt, dialog, palette,
  query, ready, VoodooCollection, fromHtml,
  injectStyle, ensureTokens,
  enter, leave, fadeIn, fadeOut, slideUp, slideDown, viewTransition,
  router, route, navigate,
  i18n, t, setLocale, getLocale,
  animate, spring, stagger, inView, scrollProgress, easings, motionPresets,
  renderChart, charts,
  validator, validate, serializeForm, showFormErrors, clearErrors,
  mask, masks, applyMask, unmask, registerMask,
  hotkey, xray, devtoolsBus,
} from 'voodoojs';
```

TypeScript types come with the package:

```ts
import type {
  ComponentDefinition, DirectiveHooks, DirectiveBinding,
  VoodooPlugin, VoodooConfig,
  HttpResponse, RequestConfig, HttpMethod,
} from 'voodoojs';
```

---

Previous: [Utilities](utilities.md) · Next: [Security](security.md)
