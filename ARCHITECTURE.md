# Voodoo.js Architecture

This document describes how Voodoo.js is built: the conceptual layers, the path a state
change takes from a mutation to a DOM write, the lifecycle of the DOM walker, the scope
and component models, the directive system, the boot loop, and the security model of the
expression evaluator.

Everything here is derived from the source in `packages/voodoojs/src`. Where a claim is
about a specific behaviour, the file that implements it is named.

- Version described: `0.1.0`
- License: MIT
- Repository: <https://github.com/kwy404/Voodoo.js>

---

## 1. Design constraints

Four constraints shape every decision in the codebase.

1. **No build step is required.** A single `<script>` tag must be enough to run a real
   application. This rules out template compilation and any syntax that a browser's HTML
   parser would reject.
2. **No `eval`, no `new Function`.** Expressions inside attributes are tokenized, parsed
   into an AST, and evaluated by a tree-walking interpreter. This keeps the library usable
   under a Content Security Policy that does not allow `unsafe-eval`.
3. **No Virtual DOM.** The DOM that the author wrote *is* the tree. Reactive effects write
   directly into the nodes they own.
4. **No runtime dependencies.** The published bundles contain only Voodoo.js code.

---

## 2. Conceptual layers

```
                          +-----------------------------------------+
                          |            DX / TOOLING                 |
                          |  devtools/bus  devtools/xray            |
                          +-----------------------------------------+
                                            ^
                                            | observes
+-------------------------------------------+-----------------------------------------+
|                                  PLATFORM SERVICES                                   |
|  http/     store/     storage/    i18n/     router/    sound/    motion/   charts/   |
|  fetch,    named      local/      messages, history    Web       spring,   inline    |
|  SSE,      reactive   session,    plural,   API,       Audio     stagger,  SVG       |
|  upload,   state      cookie,     locale    guards,                        rendering |
|  cache     bags       cache, url  switch    view cache                               |
+--------------------------------------------------------------------------------------+
                                            ^
                                            | used by
+--------------------------------------------------------------------------------------+
|                                     UI LAYER                                          |
|  ui/toast   ui/dialog   ui/palette   ui/components   forms/validate   forms/mask      |
+--------------------------------------------------------------------------------------+
                                            ^
                                            | exposed through
+--------------------------------------------------------------------------------------+
|                                  DIRECTIVE LAYER                                      |
|  directives/core   directives/http   directives/forms                                 |
|  directives/ui     directives/state  directives/dnd    directives/shared              |
|                                                                                       |
|  Every declarative behaviour in the HTML is a directive. Nothing else reads attributes.|
+--------------------------------------------------------------------------------------+
                                            ^
                                            | driven by
+--------------------------------------------------------------------------------------+
|                                     DOM LAYER                                         |
|  runtime/walker   runtime/scope   runtime/component   runtime/registry                |
|  runtime/app      runtime/boot    runtime/magics                                      |
|  dom/query        dom/style       dom/transition                                      |
+--------------------------------------------------------------------------------------+
                                            ^
                                            | subscribes to
+--------------------------------------------------------------------------------------+
|                                    STATE LAYER                                        |
|  reactivity/  -  Proxy tracking, ReactiveEffect, EffectScope, ref, computed, watch,    |
|                  microtask scheduler with a post-flush queue                           |
+--------------------------------------------------------------------------------------+
                                            ^
                                            | evaluates in
+--------------------------------------------------------------------------------------+
|                                    CORE LAYER                                         |
|  parser/lexer  ->  parser/parser  ->  parser/interpreter                               |
|  tokens             Pratt AST          tree-walking evaluator, closed global allowlist  |
|  utils/  -  pure helpers, no DOM, no globals                                            |
+--------------------------------------------------------------------------------------+
```

Read the diagram bottom-up. The core layer knows nothing about the DOM. The state layer
knows nothing about the DOM. Only from the DOM layer upward does `document` appear.

`reactivity/index.ts` and `utils/index.ts` both carry an explicit note that they run
unchanged in Node, Bun and Deno. `core.ts` deliberately does not start anything: the
`browser*.ts` entry points are the only files that touch the page on import.

---

## 3. The update path

This is the complete journey of one state change. There is no diffing step anywhere in it.

```
  user code / event handler
          |
          v
  state.count = 5                                    reactivity/index.ts
          |
          |  baseHandlers.set()
          |    - toRaw(value)
          |    - hasChanged(value, oldValue)?  --no--> stop, nothing happens
          |    - yes: trigger(target, SET, 'count')
          v
  trigger()                                          reactivity/index.ts
          |
          |  targetMap : WeakMap<object, Map<key, Set<ReactiveEffect>>>
          |  collect only the effects registered under the key 'count'
          |  (plus ITERATE_KEY / 'length' effects for ADD, DELETE and array length)
          v
  for each effect:  effect.scheduler ? scheduler() : queueJob(effect)
          |
          v
  queueJob()  ->  queue.push(job)  ->  queueFlush()
          |
          |  queueFlush() schedules exactly one flush per tick:
          |  flushPromise = Promise.resolve().then(flushJobs)
          v
  ---------------- microtask boundary ----------------
          |
          v
  flushJobs()                                        reactivity/index.ts
          |
          |  runs every queued effect once
          |  counts re-entries; more than RECURSION_LIMIT (100) for the same
          |  effect in one flush logs an infinite-loop warning and skips it
          |
          |  each effect.run():
          |    - runs its own registered cleanups
          |    - clears its dependency links (cleanupDeps)
          |    - re-executes the directive body, re-tracking what it reads
          v
  directive effect body                              directives/*.ts
          |
          |  ctx.evaluate()  ->  evaluateIn()        runtime/walker.ts
          |     parse(expression)  (AST cache hit)   parser/parser.ts
          |     evaluate(node, scope)                parser/interpreter.ts
          |        scope.lookup walks the scope chain, then magics, then allowedGlobals
          v
  direct DOM write
          |
          |  el.textContent = ...      (v-text)
          |  el.style.display = ...    (v-show)
          |  el.setAttribute(...)      (v-bind)
          |  node.textContent = ...    (interpolation, only if the string changed)
          v
  ---------------- post-flush queue -----------------
          |
          |  postQueue drains after the DOM is written:
          |  component `mounted` / `updated` hooks, watch(flush:'post'), v-init
          v
  done
```

Two properties fall out of this shape:

- **Granularity.** An effect is created per directive per element, and one per interpolated
  text node. A sibling element that does not read the changed key is never visited, never
  compared and never touched.
- **Batching.** Many mutations in the same synchronous task collapse into one flush,
  because `queueFlush` is a no-op while a flush is already pending.

`nextTick()` resolves off the same `flushPromise`, so awaiting it means the DOM has been
written. `flushSync()` drains the queue immediately and exists mainly for tests.

### Why there is no Virtual DOM

A Virtual DOM exists to answer the question "given a new tree, what changed?". Voodoo.js
never produces a new tree, so the question never comes up.

The trade is explicit:

| Virtual DOM                                  | Voodoo.js                                        |
| -------------------------------------------- | ------------------------------------------------ |
| Re-runs a render function, diffs, patches    | Re-runs one small effect, writes one property     |
| Cost scales with component size              | Cost scales with the number of dependent effects  |
| Needs a compiler for good ergonomics         | Needs no compiler                                 |
| Owns the whole subtree it renders            | Coexists with server-rendered and foreign HTML    |
| Keys are a diffing hint                      | Keys (`:key` in `v-for`) identify reusable blocks |

Lists are the exception that proves the rule: `v-for` is one effect over a whole collection, so
it is the only place a diff exists at all. Section 5 covers how it avoids paying for the rows that
did not change.

The cost is that Voodoo.js pays for tracking at read time and holds one `ReactiveEffect`
per bound piece of DOM. Very large lists of very small bindings are therefore the shape
where a Virtual DOM would win. `docs/performance.md` (pt-BR) covers how to stay on the
good side of that line.

---

## 4. Walker lifecycle

`runtime/walker.ts` is the engine that turns HTML into an application. `walk(node, scope)`
is recursive and the ordering rules inside a single element are fixed.

```
walk(node, scope)
  |
  +-- DocumentFragment (11)? -> walk each child, return
  +-- Text node (3)?          -> bindTextNode(node, scope), return
  +-- Not an element (1)?     -> return
  |
  +-- already in `initialized` WeakSet?      -> return
  +-- SCRIPT / STYLE / NOSCRIPT?             -> return
  +-- has v-ignore or v-pre?                 -> mark initialized, return
  |
  +-- collectDirectives(el)
  |     reads live attributes, or the attribute cache when the HTML was already
  |     cleaned; indexes each directive name in `directiveIndex`;
  |     sorts by descending directive priority
  |
  +-- no directives and no component tag? -> walkChildren, return
  |
  +-- mark element initialized
  |
  +-- STEP 1  terminal directive (v-for, v-if, v-else-if, v-else)
  |             runs and takes over the whole subtree; walk returns here
  |
  +-- STEP 2  scope creation
  |             component tag or v-component -> componentMounter() creates the scope
  |             otherwise v-data             -> scope.reactiveChild(value)
  |             the new scope is stored in `nodeScopes`
  |
  +-- STEP 3  remaining directives, in priority order
  |             NOTE: attributes written on a component tag are evaluated in the
  |             OUTER scope, so `@saved="last = $event"` writes to the parent.
  |             The component's own scope applies to its children (step 5).
  |
  +-- STEP 4  stripAttributes(el)
  |             when V.config.cleanAttributes is on, every v-* / : / @ / .prop
  |             attribute is copied into a WeakMap cache and removed from the DOM
  |
  +-- STEP 5  walkChildren(el, currentScope)
                a child that already has its own scope (slot content) keeps it
```

### Directive priorities

Declared in `runtime/registry.ts`. Higher runs first.

| Constant     | Value | Used by                                            |
| ------------ | ----- | -------------------------------------------------- |
| `IGNORE`     | 100   | reserved for skip semantics                        |
| `FOR`        | 90    | `v-for` (terminal)                                 |
| `IF`         | 80    | `v-if`, `v-else-if`, `v-else` (terminal)           |
| `DATA`       | 70    | `v-data`, `v-teleport`, `v-resource`               |
| `COMPONENT`  | 65    | `v-component`                                      |
| `REF`        | 60    | `v-ref`                                            |
| `MODEL`      | 40    | `v-model`                                          |
| `BIND`       | 30    | `v-bind`, option attributes registered via `defineOption` |
| `DEFAULT`    | 0     | everything else, including user directives         |
| `INIT`       | -10   | `v-init` (runs last, after bindings are in place)  |
| `TRANSITION` | -20   | inert marker attributes (`v-transition`, `v-key`, HTTP option attributes) |

Terminal directives (`terminal: true`) stop the walker from descending: `v-for` and the
`v-if` family own their subtree and call `ctx.walk()` themselves on the nodes they render.

### Attribute stripping and the directive index

`V.config.cleanAttributes` defaults to `true`. After an element is processed, its Voodoo
attributes are moved out of the DOM into a `WeakMap<Element, Map<name, value>>` and removed
from the markup. This leaves the inspector clean, the way a compiler-based framework would.

Two consequences are handled explicitly in the code:

- `document.querySelectorAll('[v-tab]')` would stop working. `walker.ts` therefore keeps a
  `directiveIndex: Map<string, Set<Element>>` and exposes `hasDirective`, `queryDirective`
  and `closestDirective`. Structural directives (tabs, accordion, drawer, sortable groups)
  use those instead of CSS selectors.
- Reading an attribute after mount must go through `readAttr` / `hasAttr` /
  `originalAttributes`, never `el.getAttribute`. `restoreAttributes` puts back what
  `setAttribute` will accept, for the case where an element has to be remounted (see
  "late component registration" below).

### MutationObserver

When `V.config.autoDiscover` is on (the default), `start()` attaches a `MutationObserver`
with `{ childList: true, subtree: true }` to the root.

- **Added nodes** that are not already initialized are walked with the scope found by
  climbing their parents (`findScope`).
- **Removed nodes** that are no longer connected are destroyed, which runs cleanups
  bottom-up, stops effects and fires `beforeUnmount` / `unmounted`.

Nodes that Voodoo itself detaches on purpose (the `v-for` template element, `v-if`
branches) go through `removeQuietly`, which registers them in a `WeakSet` so the observer
does not mistake an internal move for an unmount.

### Text interpolation

`bindTextNode` supports both `{ expr }` and `{{ expr }}`. The single-brace form has to
coexist with prose, so the parser itself is the arbiter:

- `fecharChave` finds the matching `}`, counting nesting and skipping quoted strings, which
  is what makes `{ $t('items', { n: total }) }` work.
- `pareceExpressao` tries to `parse()` the contents. Anything that fails, or that parses as
  a `seq` node (several statements in a row, which is what human prose looks like to the
  parser), stays literal text.
- Results are memoized in a `Map<string, boolean>`.
- Single-brace expressions longer than 500 characters are rejected outright, so a stray
  `{` cannot make the scanner try to parse an entire paragraph.
- `PRE`, `CODE`, `SCRIPT`, `STYLE` and `TEXTAREA` are skipped, and the check climbs
  ancestors so that syntax-highlighted code inside `<span>`s is still protected.

---

## 5. List reconciliation

Everything in section 3 says a write re-runs one small effect and touches one node. Lists are the
one place where that is not enough. `v-for` is a single effect over a whole collection: when the
collection changes, the effect re-runs and has to work out what to do about `n` rows. Getting from
"something changed" to "these two rows changed" is the reconciler's job, and it is the only diff in
the framework.

The design principle is one sentence: **do not rediscover a change that the caller already
described.**

### The changed region

Every path produces the same three numbers, and everything downstream reads only those:

```
lo      first index where the old and new lists may differ
oldHi   end of the changed region in the OLD list
newHi   end of the changed region in the NEW list
```

with two guarantees: `old[0, lo)` equals `new[0, lo)`, and `old[oldHi, oldLen)` equals
`new[newHi, newLen)`, element for element. Rows outside the region are not read, not written to and
not moved. What differs between the paths is only how much it costs to *find* those numbers.

### Path A — the mutation said what happened

`push`, `pop`, `shift`, `unshift` and `splice` are intercepted in `reactivity/index.ts`. They run
against the raw array — so they do not fire one proxy trap per element they shuffle — and record
what they did: an index, how many rows left, how many arrived. A bounded log per array keeps the
last few, each `v-for` remembers the version it last rendered, and a batch of mutations composes
into one region by widening a range.

`rows.splice(5000, 1)` on ten thousand rows therefore yields `lo = 5000, oldHi = 5001, newHi = 5000`
without a single key being read. One row is destroyed. Nothing else is examined.

This path is taken only when the source is the same array object as last render, the log can still
answer, and the list has keys of its own. A list without `:key` — or keyed on the index — identifies
rows *by position*, so removing row 5.000 renumbers everything after it; acting on the range would
leave the stored keys describing positions the rows no longer occupy. Those lists take path B, where
the numbering stays true by construction.

### Path B — a different array arrived

With a new array there is no history, so the region is found by comparing keys inward from both
ends: forward while `old[i].key === new[i].key`, then backward from both tails. What is left in the
middle is the region.

This costs one key read per row and **cannot be made cheaper**. To know that row 9.999 did not
change you have to look at row 9.999; no fingerprint, block hash or rolling hash avoids that,
because computing the fingerprint of the new list means reading every key in it. The scan therefore
does the minimum a correct answer allows, and does it with a compiled key accessor rather than the
expression interpreter: `:key="row.id"` becomes a property read, once, when the directive is set up.

### The region itself

- Region empty — nothing to do.
- Only new rows — build them into one fragment, insert once.
- Only departures — destroy them.
- Both — build a key map over the new region, match the old rows against it, and move only what has
  to move. A longest-increasing-subsequence pass over the surviving rows' old positions decides
  which may stay where they are; it runs **only** when some rows actually crossed each other, so no
  insertion, removal or append ever pays for it.

### Complexity

`n` is the length of the list, `k` the number of rows the edit actually touched, `r` the size of
the region.

| Path | When | Cost |
| --- | --- | --- |
| mutation, insert or remove | `push` / `pop` / `shift` / `unshift` / `splice` on a keyed list | O(k) |
| mutation, batch | several mutations in one tick | O(r), r = the range they jointly span |
| scan, then insert/remove | a new array, one localised edit | O(n) key reads + O(k) work |
| scan, then reorder | a new array, rows crossed | O(n) key reads + O(r log r) |
| unkeyed, any change | no `:key` | O(n) — position is the identity, so every row after the edit genuinely changed |
| `reverse` / `sort` in place | no range describes the result | O(n) + O(n log n) |

The gap between line one and line three is the point: the same edit costs O(k) when the caller
mutated the array and O(n) when they handed over a copy. Both are correct; one is cheaper because
more was known.

### What the row scope is spared

A reused row is not rewritten. The reconciler compares what the row's data already holds against
what it should hold, and writes only on a difference — including the case where the incoming value
is a reactive proxy of the object already stored, which is what `[...state.rows]` produces and which
a plain identity test reports as changed on every render forever. The index is written only when
`v-for` actually declares an index alias.

The measurements, the counters behind them and the reproduction steps are in
[`benchmarks/README.md`](benchmarks/README.md).

---

## 6. Scope model

`runtime/scope.ts`. A `Scope` is a node in a chain, holding its own `data` object (usually
a reactive proxy) and a pointer to its parent.

```
  rootScope                    reactive({}) - V.data() writes here
      |
      +-- <div v-data="{ user }">           reactiveChild
      |        |
      |        +-- <li v-for="item in list">   reactiveChild per iteration
      |        |        vars: { item, index }
      |        |
      |        +-- <my-card>                  component scope
      |                 parent is rootScope, NOT the v-data scope,
      |                 unless the definition sets inheritScope: true
      |
      +-- arrow function body                 child() - plain, non-reactive
```

Resolution of an identifier:

1. Walk up the chain; the first scope whose `data` has the name as an own or inherited key
   wins (`name in s.data`).
2. If the name starts with `$` and is registered in `magics`, return a lazy container whose
   getter calls the magic with the current scope.
3. Otherwise the interpreter falls back to `allowedGlobals`.
4. Otherwise `undefined`.

Writing follows the same walk: the scope that owns the key is written. A brand new key is
created on the current scope, which keeps it local and reactive.

Per-scope extras:

- `refs` - elements registered by `v-ref`. `allRefs` merges the whole ancestor chain, so
  `$refs` sees everything visible from where the expression lives.
- `provides` - values from a component's `provide`. `inject(key, fallback)` climbs the
  chain, which is why provide/inject works across component boundaries.
- `component` - set when the scope belongs to a component instance. `owner` returns the
  nearest such scope.

Component scopes deliberately attach to `parentScope.root` instead of `parentScope`. That
isolation is the default; `inheritScope: true` opts out of it.

---

## 7. Component model

`runtime/component.ts`. A component is a scope with state, props, computed values, methods,
watchers, slots and lifecycle hooks, mounted onto an element that already exists. There is
no compilation step and no separate render function.

```
mountComponent(el, name, parentScope)
  |
  +-- resolve definition from `components` (or the PascalCase alias map)
  +-- owner = new EffectScope(detached)      one scope owns every effect of this instance
  |
  +-- resolveProps(el, defs, parentScope, owner)
  |     static attributes  -> coerced by declared type ('number' | 'boolean' | 'string' |
  |                           'array' | 'object' | 'any'), defaults applied first
  |     `:attr` bindings   -> a reactive effect evaluated in the PARENT scope
  |     name matching accepts kebab-case, camelCase and lowercase
  |     required props missing -> console warning
  |
  +-- state = (definition.state ?? definition.data).call(instance, props)
  |     a `v-data` on the same element is merged on top
  |
  +-- provide / inject resolved against the scope chain
  +-- computed  -> one ComputedRef each, getter bound to the instance
  +-- methods   -> bound to the instance; bare functions in the definition
  |                that are not lifecycle hooks also become methods
  |
  +-- Proxy over the instance, resolution order on read:
  |       $refs -> special ($el $props $name $scope $parent emit $emit
  |                         $nextTick $watch) -> computed -> methods -> props -> state
  |     writes go to computed setter, then props, then state
  |
  +-- scope.data = proxy;  Object.setPrototypeOf(instance, proxy)
  |     so `this` inside methods and hooks resolves through the same proxy
  |
  +-- watchers registered inside `owner`
  +-- definition.style injected once per component name into <head>
  +-- beforeMount hook
  |
  +-- template? -> original children moved into a DocumentFragment,
  |                el.innerHTML = template,
  |                applySlots() distributes named and default slots.
  |                Slot content keeps the PARENT scope.
  |
  +-- queuePostFlush(() => { mounted(); if (updated) install an effect that reads
  |                          every state key and calls updated() })
  |
  +-- addCleanup(el, () => beforeUnmount -> owner.stop() -> unmounted -> destroyed)
```

Three ways to use a component, all equivalent:

```html
<div v-component="counter"></div>
<counter></counter>
<Counter start="10"></Counter>
```

The PascalCase form works because HTML lowercases tag names to `counter`, and
`defineComponent` registers a hyphen-free alias (`usercard` -> `user-card`) for that case.

### Late registration

The CDN script tag with `defer` runs before the application script that registers
components. `defineComponent` therefore calls `mountPending`, which scans the document for
tags waiting on the name it just registered. If such an element was already walked (because
of some other attribute, like `@click`), it is destroyed, its attributes are restored from
the cache, and it is walked again. This is why `restoreAttributes` exists.

### Application mode

`runtime/app.ts` adds `createApp(options).mount('#app')` on top of the same machinery: the
root options are registered as a component under a generated name, the container gets a
`v-component` attribute, and `walk()` does the rest. Two deliberate differences from Vue:

- `mount()` accepts a target that does not exist yet, because it waits on the boot loop
  rather than on a load event.
- `unmount()` restores the container's original HTML instead of leaving it empty.

---

## 8. Directive system

A directive is a name plus a `setup(ctx)` function, registered in the `directives` map.

```ts
defineDirective(name, setup, { priority, terminal });
```

The context handed to `setup` (`DirectiveContext` in `runtime/registry.ts`):

| Field                  | Meaning                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `el`                   | the element                                                   |
| `scope`                | the active scope                                              |
| `expression`           | raw attribute value                                           |
| `arg`                  | text after the colon, e.g. `click` in `v-on:click`            |
| `modifiers`            | text after the dots, `{ prevent: true, debounce: '300' }`     |
| `raw`                  | the full attribute name, for error messages                   |
| `evaluate(expr?)`      | evaluates in `scope`, reporting errors without throwing        |
| `effect(fn)`           | creates a reactive effect owned by this element               |
| `cleanup(fn)`          | runs when the element leaves the DOM                           |
| `walk(node, scope)`    | applies directives to a subtree, used by `v-if` and `v-for`   |

Each directive gets its own detached `EffectScope`, registered through `addCleanup` on the
element and tracked in `nodeEffectScopes` so the `xray` inspector can count effects per
node. When the element is destroyed, the scope is stopped and every effect inside it dies
with it. Directives never have to unsubscribe by hand.

### Attribute grammar

`parseAttribute` in `walker.ts` normalizes five spellings into the same shape:

| Written                     | Directive | Arg     | Modifiers            |
| --------------------------- | --------- | ------- | -------------------- |
| `v-on:click.prevent="save"` | `on`      | `click` | `{ prevent: true }`  |
| `@submit.prevent="save"`    | `on`      | `submit`| `{ prevent: true }`  |
| `:disabled="loading"`       | `bind`    | `disabled` | `{}`              |
| `.value="text"`             | `bind`    | `value` | `{ prop: true }`     |
| `data-v-text="name"`        | `text`    | -       | `{}`                 |

The `v-` prefix is configurable (`V.config.prefix`); `data-v-` is always accepted, which is
the escape hatch for strictly valid HTML.

### Registration surface

Directives are registered in three ways, all funnelling into `defineDirective`:

- direct calls in `directives/*.ts`, `forms/*.ts`, `ui/*.ts`, `motion/`, `charts/`,
  `router/`, `i18n/`, `sound/`;
- `defineOption(name)` in `directives/shared.ts`, for attributes that only configure
  another directive (`v-tooltip-position`, `v-drawer-side`);
- loops over name lists: HTTP verbs, event shortcuts, validation field rules, and inert
  marker attributes that exist so the runtime recognises them instead of warning.

A static scan of the source finds **222 distinct attribute names** registered across the
full build, plus one `v-validate-<rule>` alias per registered validation rule. Not all of
them exist in every bundle: `v-chart`, `v-motion*`, `v-router-view`, `v-t` and `v-locale`
only ship in `voodoo.full`.

`V.directive(name, hooks)` in `core.ts` wraps the lifecycle-hook form
(`created` / `beforeMount` / `mounted` / `updated` / `beforeUnmount` / `unmounted`) on top
of the same primitive, so a third-party directive gets the Vue-shaped API while the runtime
keeps a single mechanism.

---

## 9. Boot loop

`runtime/boot.ts` does not use `DOMContentLoaded` or `document.readyState`. It runs its own
scheduler.

The reasoning in the source is that load events answer the wrong question.
`DOMContentLoaded` says "the HTML parser finished", not "the tree I care about exists". For
a page rendered by another script, a fragment inserted later, or a container that only
appears on the second screen, the event has either already fired or fires too early.

```
enqueue(task)
   |
   +-- try task.ready() immediately; if it returns a value, run the action now
   |
   +-- otherwise start a MutationObserver on document.documentElement that only
   |   increments a counter (`versaoDoDom`), and schedule a step
   |
   v
step()
   |
   +-- domVersion unchanged since last step? stableSteps++ : stableSteps = 0
   |
   +-- for each queued task:
   |      ready() truthy?              -> dequeue, run action
   |      waited longer than 10_000ms? -> dequeue, run onGiveUp
   |
   +-- queue not empty -> schedule the next step
```

A step is scheduled with `requestAnimationFrame` *and* a 32 ms `setTimeout`, whichever
fires first (a background tab does not paint frames). Without `requestAnimationFrame` it
falls back to `setTimeout(0)`.

Public conditions:

- `whenReady(fn)` - body exists **and** the tree has been unchanged for 2 consecutive
  steps. This is what `bootstrap.ts` uses to call `V.start()`. On timeout it starts anyway.
- `whenBodyReady(fn)` - body exists, without waiting for stability. Backs `V.ready()`. If
  nothing has changed since the loop started looking, it resolves on the next microtask.
- `whenElement(target, fn, onGiveUp)` - resolves a selector that may not exist yet. Backs
  `app.mount('#app')`.

`bootstrap.ts` also reads configuration off the `<script>` tag itself
(`data-manual`, `data-prefix`, `data-base-url`, `data-locale`, `data-devtools`,
`data-no-styles`, `data-no-observer`, `data-keep-attributes`), publishes `window.V` and
`window.Voodoo`, and adds `V` to `allowedGlobals` so `@click="V.palette()"` can work.

---

## 10. Expression evaluator and its security model

Three files, one direction of flow, no shortcuts.

```
  "user.name.toUpperCase()"
          |
          v
  tokenize()                 parser/lexer.ts
          |  numbers, strings, template literals, identifiers, punctuators
          |  errors carry the source and a caret position
          v
  Parser.parseProgram()      parser/parser.ts
          |  Pratt parser, precedence table for binary operators
          |  produces a small tagged-union AST
          |  cache: Map<string, Node>, MAX_CACHE = 2000, cleared wholesale on overflow
          v
  evaluate(node, scope)      parser/interpreter.ts
          |  switch over node.t, recursive
          v
  value
```

**Supported**: literals, template literals, identifiers, member access (dotted and
computed), calls, optional chaining (`?.`, `?.()`, `?.[]`), unary `!` `-` `+` `typeof`
`void`, `++` / `--`, binary arithmetic and comparison including `**`, `in` and `instanceof`,
`&&` `||` `??`, ternary, assignment including `+=` `-=` `*=` `/=` `%=` `**=` `&&=` `||=`
`??=`, arrow functions, object and array literals, spread, and `;`-separated sequences.

**Not supported, by design**: `function`, `class`, `new`, `delete`, `import`, `await`,
`for`, `while`, `try`, and destructuring. Attribute expressions are meant to be short;
larger logic belongs in a method.

**Identifier resolution** is the security boundary. `case 'id'` in the interpreter:

```ts
const owner = scope.lookup(node.n);
if (owner) return owner[node.n];
if (node.n in allowedGlobals) return allowedGlobals[node.n];
return undefined;
```

There is no implicit fall-through to `window` or `globalThis`. A name that is neither in
scope nor in the allowlist evaluates to `undefined`.

**Prototype chain keys are blocked.** `checkKey` (`chaveBloqueada` / `checarChave` in the
source) rejects `__proto__`, `constructor` and `prototype` on identifier reads, member
reads, call targets, object literal keys and every assignment target. Without that check,
`constructor.constructor("return this")()` would reconstruct `eval` from inside a
supposedly sandboxed expression, and `x.__proto__.y = 1` would pollute `Object.prototype`
for the whole page. The check is inside `parser/interpreter.ts`, so it applies to every
expression regardless of which directive evaluates it.

The default allowlist is
`Math`, `JSON`, `Date`, `Number`, `String`, `Boolean`, `Array`, `Object`, `Intl`, `RegExp`,
`Promise`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `encodeURIComponent`,
`decodeURIComponent`, `console`. Applications extend it through `V.config.globals`, which
`start()` merges into `allowedGlobals`.

Because no string is ever compiled into code, the bundles run under a CSP without
`unsafe-eval`. See [SECURITY.md](SECURITY.md) for the full threat model, including the
`style-src` requirement created by `V.config.injectStyles` and the explicit
developer-trust contract of `v-html`.

---

## 11. Source map

Generated from `packages/voodoojs/src`.

```
src/
├── bootstrap.ts              reads <script> config, publishes window.V, schedules start
├── browser.ts                IIFE entry, full build
├── browser-essential.ts      IIFE entry, essential build (default CDN file)
├── browser-minimo.ts         IIFE entry, minimal build
├── core.ts                   assembles the V object, wires runtime modules together
├── index.ts                  bundler entry, full surface + named re-exports
├── essential.ts              bundler entry, essential surface
├── minimo.ts                 bundler entry, minimal surface
│
├── parser/
│   ├── lexer.ts              tokenizer, VoodooSyntaxError with caret position
│   ├── parser.ts             Pratt parser, AST types, AST cache (MAX_CACHE = 2000)
│   └── interpreter.ts        tree-walking evaluator, allowedGlobals, stringify
│
├── reactivity/
│   └── index.ts              Proxy tracking, ReactiveEffect, EffectScope, ref,
│                             computed, watch, watchEffect, microtask scheduler
│
├── runtime/
│   ├── registry.ts           config, directives map, components map, PRIORITY, usePlugin
│   ├── scope.ts              Scope chain, magics registry, rootScope
│   ├── walker.ts             DOM traversal, parseAttribute, attribute cache,
│   │                         directive index, MutationObserver, interpolation
│   ├── component.ts          props, slots, provide/inject, instance proxy, lifecycle
│   ├── app.ts                createApp / mount / unmount
│   ├── boot.ts               the boot loop (whenReady, whenBodyReady, whenElement)
│   ├── magics.ts             $el $refs $store $http $toast $screen $network ...
│   └── metrics.ts            reconciler counters, off by default, not public API
│
├── directives/
│   ├── core.ts               text, html, show, if/else-if/else, for, bind, class,
│   │                         style, on + event shortcuts, model, init, ref, effect,
│   │                         watch, cloak, once, teleport, data, component
│   ├── http.ts               get/post/put/patch/delete, load, load-visible, search,
│   │                         resource, and the request option attributes
│   ├── forms.ts              submit, loading, upload, dropzone, autosave, guard,
│   │                         and the form option attributes
│   ├── ui.ts                 modal, drawer, tabs, accordion, dropdown, popover,
│   │                         tooltip, command palette, copy, share, sticky, lazy, ...
│   ├── state.ts              persist, sync (BroadcastChannel), history, undo, redo, storage
│   ├── dnd.ts                draggable, droppable, sortable, dropzone groups
│   └── shared.ts             option registration, attribute reading, aria-live announcer
│
├── http/index.ts             fetch client, interceptors, cache, retry, offline queue,
│                             upload (XHR progress), SSE, NDJSON streaming
├── store/index.ts            named reactive stores, optional localStorage persistence
├── storage/index.ts          storage, session, cookie, cache, url, theme
├── forms/
│   ├── validate.ts           rules, messages, field/form validation, error rendering
│   └── mask.ts               input masks
├── ui/
│   ├── toast.ts              notifications
│   ├── dialog.ts             modal, alert, confirm, prompt
│   ├── palette.ts            command palette and colour palette
│   └── components.ts         the ready-made V* component library
├── dom/
│   ├── query.ts              chainable collection returned by V(selector)
│   ├── style.ts              injectStyle, BASE_TOKENS, ensureTokens
│   └── transition.ts         enter/leave, fade, slide, View Transitions wrapper
├── router/index.ts           History API routing, guards, view cache
├── i18n/index.ts             messages, pluralization, locale switching
├── motion/index.ts           animate, spring, stagger, inView, scrollProgress
├── charts/index.ts           inline SVG charts
├── sound/index.ts            Web Audio effects
├── devtools/
│   ├── bus.ts                internal event bus
│   └── xray.ts               reactivity inspector overlay
└── utils/index.ts            pure helpers: ids, timing, collections, formatting, device
```

---

## 12. Module boundaries

The rule the codebase actually follows, expressed as allowed import directions:

```
utils        -> (nothing)
parser       -> (nothing outside parser)
reactivity   -> (nothing)
store        -> reactivity
storage      -> (nothing)
http         -> utils
dom          -> reactivity, runtime, utils
runtime      -> parser, reactivity, utils     [+ documented exceptions, below]
directives   -> runtime, reactivity, parser, dom, utils, http, forms, ui, storage
forms        -> runtime, reactivity, dom, http, utils
ui           -> runtime, reactivity, dom, storage, utils
router       -> runtime, reactivity, dom, http, utils, devtools
i18n         -> runtime, reactivity, http, storage, utils, devtools
motion       -> runtime, reactivity, utils
charts       -> runtime, dom, utils
sound        -> runtime, storage
devtools     -> runtime, reactivity, dom, http, store, utils
core         -> everything below it
index /
essential /
minimo       -> core + the modules that build includes
browser*     -> the matching entry + bootstrap
```

Invariants worth keeping:

- **`parser/` imports nothing else.** It is a self-contained language front end. This is
  what makes the security argument auditable in three files.
- **`reactivity/` imports nothing.** No DOM, no globals. It is the only module that could
  be lifted out and published on its own, and `tsup.config.ts` does exactly that
  (`voodoojs/reactivity`).
- **`utils/` imports nothing** and is fully tree-shakeable.
- **Nothing below `runtime/` may import `runtime/`.**
- **Directives are leaves.** No module imports `directives/`; the entry points import them
  only for their registration side effects. This is what keeps build variants possible.

Two exceptions exist and are intentional:

1. `runtime/magics.ts` imports `http`, `store`, `storage`, `ui/toast` and `utils`, because
   the magic variables `$http`, `$store`, `$storage`, `$toast` and `$device` are precisely
   the bridge between the runtime and the services. It is the only file in `runtime/` that
   reaches upward.
2. `directives/shared.ts` exists so `directives/ui.ts` and `directives/dnd.ts` can share
   helpers without importing each other.

Circular imports between `core.ts`, `runtime/walker.ts`, `runtime/component.ts` and
`runtime/app.ts` are avoided with explicit injection instead of direct imports:

```ts
setComponentMounter(mountComponent);   // walker  <- component
setScopeMarker(markNodeScope);         // component <- walker
setDirectiveRegistrar(directive);      // app <- core
setAppHost(core);                      // app <- core
```

Any new cross-module link at that level should use the same pattern rather than adding an
import edge.

---

## 13. Build variants

`packages/voodoojs/tsup.config.ts` produces:

| Output                                    | Format    | Target   | Contents                                              |
| ----------------------------------------- | --------- | -------- | ----------------------------------------------------- |
| `index`, `essential`, `reactivity`, `http`, `utils` | ESM + CJS + `.d.ts` | `es2020` | tree-shakeable module entries for bundlers |
| `voodoo.core.js` / `.min.js`              | IIFE      | `es2018` | reactivity, parser, walker, components, core directives, HTTP directives, chainable DOM |
| `voodoo.js` / `voodoo.min.js`             | IIFE      | `es2018` | the above **plus** forms, validation, masks, UI directives, dialogs, palette, sound. Default CDN file |
| `voodoo.full.js` / `.min.js`              | IIFE      | `es2018` | the above **plus** charts, motion, router, i18n, xray, the `V*` component library |

All IIFE builds share a footer that publishes `window.V` and `window.Voodoo` after the
bundle evaluates.

Size budgets live in `scripts/size.mjs` and are enforced in CI. Measure with
`npm run size`; do not quote numbers from documentation, they change every release.

---

## 14. Related documents

- [CONVENTIONS.md](CONVENTIONS.md) - API naming rules, stability tiers, deprecation policy
- [SECURITY.md](SECURITY.md) - threat model, CSP, reporting
- [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) - required browser APIs and the support matrix
- [QUALITY.md](QUALITY.md) - the twelve quality dimensions and how they are measured
- [ROADMAP.md](ROADMAP.md) - what is planned, what is being investigated
- [docs/en/](docs/en/) - English user documentation
- `docs/` - complete Portuguese documentation
