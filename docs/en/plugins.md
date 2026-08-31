# Plugins

Everything Voodoo.js does internally is available to you: register directives, components,
magic variables, validation rules and masks, and extend the `V` object.

The formal contract, including the recommended namespacing rules and the current runtime
gaps, is in [docs/plugin-spec.md](../plugin-spec.md). This page is the practical
introduction.

---

## Custom directives

### Lifecycle form

```js
V.directive('highlight', {
  created(el, binding) {},
  beforeMount(el, binding) {},
  mounted(el, binding) { el.style.background = binding.value; },
  updated(el, binding) { el.style.background = binding.value; },
  beforeUnmount(el, binding) {},
  unmounted(el, binding) {},
  priority: 0,
  raw: false,
});
```

```html
<div v-highlight="'yellow'">Static</div>
<div v-highlight="statusColor">Reactive</div>
```

### Short form

Installed as both `mounted` and `updated`:

```js
V.directive('size', (el, binding) => {
  el.style.fontSize = `${binding.value}px`;
});
```

It cannot express cleanup, so use the object form whenever the directive allocates anything.

### The binding

| Field        | Value |
| ------------ | ----- |
| `el`         | The element |
| `value`      | The evaluated expression |
| `oldValue`   | The previous value, in `updated` |
| `arg`        | Text after the colon, e.g. `top` in `v-tooltip:top` |
| `modifiers`  | Object of modifiers after the dots |
| `expression` | The raw attribute text |
| `scope`      | The active `Scope` |
| `instance`   | The nearest component instance, or `null` |

`priority` sets the order among directives on the same element; higher runs first. The
constants are in `V.PRIORITY`.

`raw: true` hands you the expression text without evaluating it, for directives that take a
selector or a name rather than a value.

### Cleanup

The runtime cleans up the effects it created. It does not clean up yours:

```js
V.directive('map', {
  mounted(el, binding) {
    el._map = new MapLibrary(el, binding.value);
  },
  beforeUnmount(el) {
    el._map?.destroy();
    delete el._map;
  },
});
```

### A useful example

```js
V.directive('autoresize', {
  mounted(el) {
    const resize = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    el.addEventListener('input', resize);
    el._autoresize = () => el.removeEventListener('input', resize);
    resize();
  },
  beforeUnmount(el) {
    el._autoresize?.();
    delete el._autoresize;
  },
});
```

```html
<textarea v-model="text" v-autoresize></textarea>
```

---

## Magic variables

```js
V.magic('$now', () => new Date());
V.magic('$uppercase', () => (s) => String(s).toUpperCase());
V.magic('$form', (scope) => scope.el?.closest('form'));
```

```html
<p>{ $now.getFullYear() }</p>
<p>{ $uppercase(name) }</p>
```

The getter receives the scope where the expression lives, so a magic can be
context-sensitive. The `$` is added if you leave it out.

Magics are read-only unless the value they return exposes its own `set` method.

---

## Validation rules and masks

```js
V.validator('even', (value) => Number(value) % 2 === 0, 'Enter an even number.');
V.registerMask('case-number', '9999999-99.9999.9.99.9999');
```

Registering a rule automatically creates the `v-validate-even` directive. See
[Forms](forms.md).

---

## The plugin contract

A plugin is an object with `install`, or a plain function.

```js
export const analytics = {
  name: 'analytics',

  install(V, options) {
    // register here
  },
};

V.use(analytics, { url: '/events' });
```

```js
export function analytics(V, options) { /* ... */ }

V.use(analytics, { url: '/events' });
```

### Behaviour you need to know

Read `usePlugin` in `runtime/registry.ts` and four things follow.

**Installing twice is silently ignored.** The second call does nothing, and its options are
discarded. There is no merge and no warning. If your plugin needs reconfiguration, expose a
method for it.

**Deduplication is by object identity, not by `name`.** Two distinct objects with the same
`name` both install. The `name` field is not used by the runtime at all.

**The `V` you receive is the real object.** Not a copy, not a proxy, not a restricted
context. A plugin can read and write anything, including `V.config` and
`V.http.defaults`. There is no sandbox.

**`app.use()` installs into the global `V`.** A plugin installed through an application is
not scoped to it; a directive it registers works on the whole page.

---

## Namespacing

Plugins share the core's registries. Claim one name and hang everything off it.

| Registers        | Rule                            | Example                     |
| ---------------- | ------------------------------- | --------------------------- |
| Directive        | prefix with the plugin name     | `v-charts-pro-render`       |
| Component        | prefix with the plugin name     | `<charts-pro-legend>`       |
| Magic            | `$` + plugin name, one object   | `$chartsPro.theme`          |
| Property on `V`  | one, the plugin's namespace     | `V.chartsPro.render()`      |
| Validation rule  | prefix with the plugin name     | `v-validate-chartspro-range`|
| Global event     | `pluginName:event`              | `chartsPro:ready`           |

Check before publishing:

```js
V.directives.has('my-name');   // must be false
V.components.has('my-name');   // must be false
V.magics.has('$myName');       // must be false
'myName' in V;                  // must be false
```

The runtime does **not** warn when you overwrite an existing name.

---

## Full example

```js
export const analytics = {
  name: 'analytics',

  install(V, options = {}) {
    const config = { url: '/events', batch: 10, ...options };
    const teardown = [];
    let queue = [];

    function flush() {
      if (!queue.length) return;
      const batch = queue;
      queue = [];
      navigator.sendBeacon(config.url, JSON.stringify(batch));
    }

    function track(event, data = {}) {
      queue.push({ event, data, at: Date.now() });
      if (queue.length >= config.batch) flush();
    }

    // One namespace on V.
    V.analytics = {
      track,
      flush,
      configure(next) { Object.assign(config, next); },
      shutdown() {
        flush();
        for (const fn of teardown.reverse()) fn();
        teardown.length = 0;
        delete V.analytics;
      },
    };

    V.magic('$analytics', () => V.analytics);

    V.directive('analytics-track', {
      mounted(el, binding) {
        const onClick = () => track(binding.value, { text: el.textContent?.trim() });
        el.addEventListener('click', onClick);
        el._analyticsOff = () => el.removeEventListener('click', onClick);
      },
      beforeUnmount(el) {
        el._analyticsOff?.();
        delete el._analyticsOff;
      },
    });

    // Keep the remover.
    teardown.push(
      V.http.interceptors.error.use((err) => {
        track('http:error', { status: err.status, url: err.config?.url });
      })
    );

    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    teardown.push(() => window.removeEventListener('pagehide', onHide));
  },
};
```

```html
<button v-analytics-track="'checkout-clicked'">Checkout</button>
```

---

## Feature detection

The three browser builds expose different surfaces. `V.router`, `V.i18n`, `V.renderChart`,
`V.animate` and `V.xray` exist only in the full build; `V.validate` and `V.modal` do not
exist in the minimal build.

```js
install(V, options) {
  if (!V.renderChart) {
    console.warn('[charts-pro] requires voodoo.full.min.js.');
    return;
  }
  // ...
}
```

Declare the supported range in `peerDependencies`. The runtime does not check it.

---

## Cleanup, and what is missing

There is **no `uninstall`**. `usePlugin` only adds to an internal `Set`, and nothing removes
a directive, a component, a magic, a rule or a mask once registered.

Until that changes, expose an explicit shutdown method (as in the example above) and keep a
list of removers.

What the runtime cleans up for you:

- effects created through a directive's internal `effect`;
- functions passed to a directive's `cleanup`;
- listeners added by built-in directives;
- a component's effect scope when its element leaves the DOM.

What it does not:

- registry entries, properties on `V`, entries in `V.config.globals`;
- HTTP interceptors, `V.on` subscriptions;
- listeners on `window` or `document`, timers, injected `<style>` elements.

The full list of gaps, and a proposal for closing them, is in
[docs/plugin-spec.md](../plugin-spec.md) section 7.

---

## Publishing checklist

- [ ] `install(V, options)` does not throw when `options` is `undefined`.
- [ ] The plugin claims one property on `V`.
- [ ] Every registered name is prefixed with the plugin name.
- [ ] No name collides with the core.
- [ ] Full-build-only features are checked before use.
- [ ] A shutdown method undoes interceptors, listeners and timers.
- [ ] Directives and components clean up in their unmount hooks.
- [ ] `V.config.globals` gains only values and pure functions, never capabilities.
- [ ] `peerDependencies` declares the `voodoojs` range.
- [ ] No `eval`, no `new Function`, no runtime dependencies.

---

## Next

- [docs/plugin-spec.md](../plugin-spec.md) (Portuguese) - the formal specification
- [CONVENTIONS.md](../../CONVENTIONS.md) - naming rules and the deprecation policy
- [Directives](directives.md)
- [Security](security.md) - what a plugin can compromise
