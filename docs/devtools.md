# Devtools

> The inspector only comes in `voodoo.full.min.js` or in a custom build.

Three tools: the **floating widget**, which connects everything directly through HTML, the **xray
inspector**, visual, which runs inside the page itself, and the **event bus**, which any module can
use to report activity.

---

# Turning it on via HTML

The shortest way. An attribute on the `<script>` tag and the inspector is on the page:

```html
<script src="voodoo.full.min.js" devtools defer></script>
```

A button appears in the bottom right corner. Click it and the full panel opens.

The widget shows how many components are mounted and lights up a dot whenever activity happens: a
request, a directive event, a route change. It can be dragged to any corner, and the position is
saved for the next load.

## Equivalent ways to turn it on

| Way | When to use |
| --- | --- |
| `<script src="voodoo.full.min.js" devtools>` | The short way |
| `<script src="voodoo.full.min.js" data-devtools>` | When HTML needs to be strictly valid |
| `devtools="false"` | Leaves the attribute in HTML and turns it off without deleting the line |
| `window.VOODOO_DEVTOOLS = true` before the script | When the decision comes from the server |
| `V.config.devtools = true` + `V.devtoolsWidget(true)` | Control via JavaScript |

## Controlling the widget via JavaScript

```js
V.devtoolsWidget();       // toggle
V.devtoolsWidget(true);   // show
V.devtoolsWidget(false);  // hide
```

The `×` at the corner of the button hides the widget only on that tab. An explicit call to
`V.devtoolsWidget(true)` brings it back.

> The widget and panel live in the complete build. In the smaller and essential builds the `devtools`
> attribute still turns on detailed warnings in the console, and Voodoo warns there that the
> inspector didn't come along.

There's a ready page in [`examples/devtools/`](../site/examples/devtools/) with counter, list, store,
component and request, to see the panel tabs reacting to each of those things.

---

# The xray inspector

```js
V.xray();        // toggle
V.xray(true);    // force on
V.xray(false);   // force off
```

The `Alt+Shift+V` shortcut is installed on first call. To have the shortcut available from the
start, without turning anything on:

```js
V.enableXrayShortcut();
```

## What it shows

When on, the inspector outlines every element that has directives, shows a card with that element's
scope, opens a panel with tabs, and makes the element flicker every time a reactive effect writes
to it. That's the xray effect: you can see reactivity happening.

The panel tabs:

| Tab | What it brings |
| --- | --- |
| State | All scopes on the page, with visible variables in each. Simple values are editable right there |
| Components | Mounted instances, with props, state, and host element |
| Stores | Global stores and their contents |
| Events | Events fired by directives, with the source element |
| Network | Requests, with method, URL, status and duration |
| Performance | Effect count per element and how many times each reexecuted |

Clicking an element on the page selects the corresponding scope. Clicking an element in the panel
highlights it and scrolls the page to it.

## Production cost

The module doesn't register anything when imported. No listeners, no styles, and no timers exist
before the first call, so it's tree-shakeable and costs nothing while nobody turns it on. Still, in
production the safest path is to serve the essential build, or build a custom one without the
`devtools` module:

```bash
npx voodoo build
```

## How effect counting is done

The performance tab sums, for each element, the effects created by its directives plus the effects
of interpolated texts that are direct children. A high number in a small element usually means too
much interpolation in one place, and it's worth breaking the block.

---

# The event bus

```js
V.devtools.emit('network', {
  method: 'GET',
  url: '/api/users',
  status: 200,
  ok: true,
  duration: 128,
  source: 'my-plugin',
});

const off = V.devtools.on('network', (event) => console.log(event.url));
off();
```

Emitting with no listeners registered costs a `Map` lookup and nothing more, so any module can
report activity without fear.

## Event types

| Type | Fields |
| --- | --- |
| `network` | `method`, `url`, `status`, `ok`, `duration`, `error`, `source` |
| `event` | `type`, `el`, `detail`, `source` |
| `navigation` | `from`, `to`, `cancelled`, `matched` |
| `locale` | `from`, `to` |
| `update` | `el`, `key`, `source` |

## API

```js
V.devtools.emit(type, data);
V.devtools.on(type, callback);     // returns the function that cancels
V.devtools.off(type, callback);
V.devtools.clear(type);            // removes listeners of a type
V.devtools.clear();                // removes all
V.devtools.count(type);            // how many listeners exist
```

The Network tab of the inspector lists everything that comes via `network`, even when the request
didn't go through the `V.http` client. It's the hook to integrate your own client into the panel.

---

# Debugging without the inspector

## Detailed warnings

```js
V.config.devtools = true;
```

With this option, the anchor comments created by `v-if` and `v-for` get names, which makes the
tree much more readable in the browser inspector. Unregistered components also start warning in
the console.

## Global error handler

```js
V.onError((err, context) => {
  console.error('[app]', context, err);
  sendToMonitoring(err, context);
});
```

The context says where it came from: `directive v-click`, `interpolation`, `hook mounted`,
`request GET /api/x`, `event click ("save()")` and so on.

## Inspecting scope and instances

```js
V.scope.data;                                  // root scope
V.getScope(document.querySelector('#list'));   // element scope, if it created one
V.findScope(document.querySelector('li'));     // effective scope, walking up ancestors
V.instances;                                   // Set with mounted components
V.components;                                  // Map with registered definitions
V.directives;                                  // Map with registered directives
V.magics;                                      // Map with magic variables
V.stores;                                      // all stores
```

## Logging inside HTML

```html
<div v-effect="$log('state now', $data)"></div>
<button v-click="$log($event)">See the event</button>
```

`$log` writes to the console with the `[Voodoo]` prefix.

## Forcing and stopping processing

```js
V.start();                     // walks and initializes from body
V.start(document.querySelector('#area'));
V.walk(element, scope);        // initializes a section with a specific scope
V.refresh(element);            // reinitializes a root
V.destroy(element);            // unmounts, stopping effects and removing listeners
V.stopObserving();             // turns off the MutationObserver
```

---

Previous: [Theme and palette](tema-e-paleta.md) · Next: [Plugins](plugins.md)
