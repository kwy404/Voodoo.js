# Plugin specification

This is the official contract for those writing third-party plugins for Voodoo.js. It
describes the actual behavior of `usePlugin`
(`packages/voodoojs/src/runtime/registry.ts`), what a plugin can register, naming rules,
and what's still missing in the runtime.

If you want to learn to use plugins, read [Plugins](plugins.md) first. This page is
more formal and serves as a reference for authors.

Version described: `0.1.0`.

---

## 1. The contract

A plugin is **an object with an `install` method** or **a function**. Both forms are
equivalent for the runtime.

### Object form

```js
export const myPlugin = {
  name: 'my-plugin',

  install(V, options) {
    // register here
  },
};
```

| Field     | Type                                             | Required | Usage today |
| --------- | ------------------------------------------------ | -------- | -------- |
| `name`    | `string`                                          | no       | **Not used by the runtime.** Exists in the `VoodooPlugin` type and serves for documentation and debugging. |
| `install` | `(V, options?: Record<string, unknown>) => void`  | **yes**  | Called once, at install time. |

The return value of `install` is ignored. If it throws, the error bubbles up to whoever called `V.use`; there
is no internal handling.

### Function form

```js
export function myPlugin(V, options) {
  // register here
}
```

Identical in practice. Use when the plugin doesn't need a name or other fields.

### Installation

```js
V.use(myPlugin, { key: 'abc123' });
```

What happens internally:

```ts
const installedPlugins = new Set<VoodooPlugin | Function>();

export function usePlugin(V, plugin, options) {
  if (installedPlugins.has(plugin)) return;
  installedPlugins.add(plugin);
  if (typeof plugin === 'function') plugin(V, options);
  else plugin.install(V, options);
}
```

Four facts that follow directly from this.

**1. Installing twice is silently ignored.**

```js
V.use(myPlugin, { a: 1 });
V.use(myPlugin, { a: 2 });  // does nothing, no warning
```

The second call does not install and **options are discarded**. There is no option merging and
no warning. If your plugin needs to accept reconfiguration, expose a method for it:

```js
install(V, options) {
  V.myPlugin = {
    configure(newOpts) { Object.assign(config, newOpts); },
  };
}
```

**2. Deduplication is by object identity, not by name.**

```js
V.use({ name: 'analytics', install: a });
V.use({ name: 'analytics', install: b });  // also installs
```

Two different objects, so both install. The `name` field does not participate in the
decision. This matters when two versions of the same plugin come through different paths.

**3. The `V` received is the real application object.** It's not a copy, not a proxy, not a
restricted context. A plugin can read and write anything in `V`, including
`V.config` and `V.http.defaults`. There is no sandbox.

**4. `app.use()` installs in the global `V`.** In application mode:

```js
const app = V.createApp({ /* ... */ });
app.use(myPlugin);
```

`app.use` calls `usePlugin(V_global, plugin, options)`. **The plugin is not restricted to the
application.** A directive registered by it works across the entire page, even outside the
mounted container. This is different from Vue and is intentional in the current runtime state.

---

## 2. What a plugin can register

### Directive

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

Short form, installed as `mounted` **and** `updated` at the same time:

```js
V.directive('highlight', (el, binding) => {
  el.style.background = binding.value;
});
```

The `binding` brings `el`, `value`, `oldValue`, `arg`, `modifiers`, `expression`, `scope`, and
`instance`.

`priority` decides the order among directives on the same element; higher runs first. The
constants are in `V.PRIORITY`. The default is `PRIORITY.DEFAULT`, which is `0`.

`raw: true` delivers the expression text without evaluation, for directives that receive a selector
or name instead of a value.

**Limitation:** `V.directive` does not pass `terminal` to `defineDirective`. A plugin cannot
declare a directive that assumes the entire subtree, like `v-if` and `v-for` do.
See section 7.

### Component

```js
V.component('my-plugin-viewer', {
  props: { value: { type: 'number', default: 0 } },
  state: (props) => ({ internal: props.value }),
  computed: { double() { return this.internal * 2; } },
  methods: { add() { this.internal++; } },
  template: `<button @click="add()">{ double }</button>`,
  style: `.my-plugin-viewer { color: var(--v-primary); }`,
  mounted() {},
  beforeUnmount() {},
});
```

Register in kebab-case. Voodoo automatically creates the hyphen-less alias so the PascalCase tag
works.

Registering a component after the page loads **mounts the tags that were already waiting**.
A plugin installed at the end of `app.js` works.

`style` is injected once per component name and respects `V.config.injectStyles`.

### Magic variable

```js
V.magic('$analytics', () => V.myPlugin);
V.magic('$now', (scope) => new Date());
```

The signature is `(name: string, getter: (scope: Scope) => unknown) => void`. The `$` is
added if you don't write it.

The getter receives the scope at the point where the expression is, so you can expose context-sensitive things:

```js
V.magic('$form', (scope) => scope.el?.closest('form'));
```

Magics are read-only, unless the returned value exposes its own `set` method.

### Validation rule

```js
V.validator('even', (value) => Number(value) % 2 === 0, 'Provide an even number.');
```

Signature: `(name, fn, defaultMessage?)`. This does three things:

1. registers the rule in the internal rule registry, with the name in lowercase (this `Map` is not
   exposed in `V`);
2. sets the default message, if one doesn't already exist with that name;
3. **registers the `v-validate-even` directive** automatically.

```html
<input v-validate-even>
```

The validation function receives `(value, parameter, field)` and returns `boolean` or a string
with the error message.

### Mask

```js
V.registerMask('process', '9999999-99.9999.9.99.9999');
V.registerMask('reverse', (v) => v.split('').reverse().join(''));
```

Signature: `(name, patternOrFn)`. Pattern tokens: `9` digit, `A` letter, `S`
alphanumeric, `*` any character.

```html
<input v-mask="process">
```

### Service in `V`

```js
install(V, options) {
  V.myPlugin = {
    doSomething(x) { return x * 2; },
    configure(newOpts) { Object.assign(config, newOpts); },
  };
}
```

**Claim only one name.** See section 3.

### Translation messages

Available only in the full build:

```js
if (V.i18n) {
  V.i18n.addMessages('pt-BR', { myPlugin: { save: 'Salvar' } });
  V.i18n.addMessages('en', { myPlugin: { save: 'Save' } });
}
```

### HTTP interceptor

```js
const remove = V.http.interceptors.request.use((config) => {
  config.headers = { ...config.headers, 'X-My-Plugin': '1' };
  return config;
});
```

`use` returns the function that removes the interceptor. **Keep this return value.** It's the only
cleanup the runtime gives you for free, and you'll need it when `uninstall` exists.

An interceptor sees all requests and all responses in the application. A plugin that
installs one is asking for full trust, and its documentation should say so.

### Configuration and globals

```js
install(V, options) {
  V.config.globals.MY_PLUGIN_VERSION = '1.0.0';
}
```

`V.config.globals` enters `allowedGlobals` and becomes visible in **every expression on the page**.

> **Put values and pure functions here, never capabilities.** Adding `window`, `fetch`
> or `document` breaks the sandbox the expression evaluator runs in. See
> [SECURITY.md](../SECURITY.md).

Touching `V.config.prefix`, `V.config.autoDiscover`, or `V.config.injectStyles` from a
plugin is considered invasive. If the plugin needs it, document it and let the user
choose via option.

---

## 3. Namespace

Plugins share the same registries as the core. Name collision is the most common and
easiest problem to avoid.

| What registers         | Rule                                | Example                        |
| ---------------------- | ----------------------------------- | ------------------------------ |
| Directive              | prefix with the plugin name         | `v-charts-pro-render`          |
| Component              | prefix with the plugin name         | `<charts-pro-legend>`          |
| Magic                  | `$` plus the name, one object only  | `$chartsPro.theme`             |
| Property in `V`        | one only, the plugin namespace      | `V.chartsPro.render()`         |
| Validation rule        | prefix with the plugin name         | `v-validate-chartspro-range`   |
| Mask                   | prefix with the plugin name         | `V.registerMask('chartspro-range', ...)` |
| Global event           | `pluginName:event`                  | `V.emit('chartsPro:ready')`    |
| DOM event              | `pluginname:event`                  | `chartspro:rendered`           |
| `localStorage` key     | `pluginname:`                       | `chartspro:preferences`        |
| CSS class              | `.pluginname-`                      | `.chartspro-legend`            |
| CSS variable           | `--pluginname-`                     | `--chartspro-color`            |

Reserved for core: any name already in `V`, any magic listed in
`runtime/magics.ts`, any attribute name registered by built-in modules,
the `v-` prefix on directive names the core already uses, the `--v-` prefix on CSS
variables, and the `voodoo:` prefix on events.

**How to check before publishing:**

```js
console.log(V.directives.has('my-name'));   // should be false
console.log(V.components.has('my-name'));   // should be false
console.log(V.magics.has('$myName'));       // should be false
console.log('myName' in V);                 // should be false
```

The runtime **does not** warn when you overwrite an existing name. `defineDirective` does
`directives.set(name, ...)`, which overwrites silently.

---

## 4. Versioning

A plugin declares compatibility in `peerDependencies`:

```json
{
  "name": "voodoo-charts-pro",
  "version": "1.2.0",
  "peerDependencies": {
    "voodoojs": "^0.1.0"
  }
}
```

The runtime **does not check this**. If your plugin depends on something that might not exist,
check manually:

```js
install(V, options) {
  if (!V.renderChart) {
    console.warn(
      '[charts-pro] needs the full Voodoo.js build. ' +
        'Use voodoo.full.min.js or import voodoojs via bundler.'
    );
    return;
  }
  // ...
}
```

This is especially important because the three browser builds expose different surfaces.
`V.router`, `V.i18n`, `V.renderChart`, `V.animate`, and `V.xray` only exist in the
full build. `V.validate` and `V.modal` don't exist in the minimal build.

Package name: prefix with `voodoo-`. Suggested keywords in `package.json`:
`voodoojs`, `voodoo-plugin`.

Follow SemVer for the plugin itself. A change in the name of a directive you registered
is a breaking change, because the user's HTML will stop working.

---

## 5. Cleanup

The runtime **does not offer uninstallation**. This is a known gap, registered in
[ROADMAP.md](../ROADMAP.md). Until it exists, the plugin is responsible.

The recommended pattern is to expose an explicit cleanup function:

```js
export const myPlugin = {
  name: 'my-plugin',

  install(V, options) {
    const cleanups = [];

    // Save everything that can be undone.
    cleanups.push(V.http.interceptors.request.use(addHeader));
    cleanups.push(V.on('route:changed', onRouteChange));

    const onResize = () => recalculate();
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));

    const timer = setInterval(sync, 30_000);
    cleanups.push(() => clearInterval(timer));

    V.myPlugin = {
      // ...
      shutdown() {
        for (const fn of cleanups.reverse()) fn();
        cleanups.length = 0;
      },
    };
  },
};
```

What **is** cleaned up automatically:

- effects created with `ctx.effect` inside a directive;
- functions passed to `ctx.cleanup`;
- listeners registered by built-in directives;
- the effect scope of a component when the element leaves the DOM.

What **is not** cleaned up automatically:

- entries in `V.directives`, `V.components`, `V.magics`, `V.masks`, and the validation rule registry;
- properties the plugin put in `V`;
- entries in `V.config.globals`;
- HTTP interceptors;
- global bus subscriptions (`V.on`);
- listeners you registered on `window` or `document`;
- timers;
- injected `<style>`;
- the entry in the internal `installedPlugins` `Set`, which is never emptied.

Inside directives and components, always use the hooks the runtime provides:

```js
V.directive('my-widget', {
  mounted(el, binding) {
    el._widget = new Widget(el, binding.value);
  },
  beforeUnmount(el) {
    el._widget?.destroy();
    delete el._widget;
  },
});
```

---

## 6. Complete example plugin

```js
/**
 * voodoo-analytics
 *
 * Registers `v-track` for click events, the `$analytics` magic, and the
 * `V.analytics` service.
 */

const DEFAULTS = {
  url: '/events',
  debug: false,
  queue: 10,
};

export const analytics = {
  name: 'analytics',

  install(V, options = {}) {
    const config = { ...DEFAULTS, ...options };
    const cleanups = [];
    let queue = [];

    function send() {
      if (!queue.length) return;
      const batch = queue;
      queue = [];
      if (config.debug) console.log('[analytics]', batch);
      navigator.sendBeacon(config.url, JSON.stringify(batch));
    }

    function track(event, data = {}) {
      queue.push({ event, data, at: Date.now() });
      if (queue.length >= config.queue) send();
    }

    // One namespace in V.
    V.analytics = {
      track,
      send,
      configure(newOpts) { Object.assign(config, newOpts); },
      shutdown() {
        send();
        for (const fn of cleanups.reverse()) fn();
        cleanups.length = 0;
        delete V.analytics;
      },
    };

    // Magic, pointing to the same namespace.
    V.magic('$analytics', () => V.analytics);

    // Prefixed directive.
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

    // Interceptor, with removal saved.
    cleanups.push(
      V.http.interceptors.error.use((error) => {
        track('http:error', { status: error.status, url: error.config?.url });
      })
    );

    // Flush what's left when the tab closes.
    const onExit = () => send();
    window.addEventListener('pagehide', onExit);
    cleanups.push(() => window.removeEventListener('pagehide', onExit));
  },
};
```

```js
V.use(analytics, { url: '/api/events', debug: true });
```

```html
<button v-analytics-track="'purchase-clicked'">Buy</button>
<span>{ $analytics ? 'on' : 'off' }</span>
```

---

## 7. What's missing from the runtime

Documented here because plugin authors run into this, and because the specification is only
complete when these gaps close. All are in [ROADMAP.md](../ROADMAP.md).

| Gap | Consequence for plugin authors |
| ------ | ------------------------------------- |
| **No `uninstall`.** `usePlugin` only adds to the `Set`. | No plugin can be removed. Prevents hot reloading and clean teardown in tests. |
| **No `unregister` for directive, component, magic, rule, or mask.** | A registered name stays registered forever. Tests that install plugins contaminate each other. |
| **Deduplication by identity, not by `name`.** | Two copies of the same plugin from different paths both install and register the same name twice. |
| **The `name` field is not used.** | Can't list what's installed or detect name conflicts. |
| **No version checking.** | A plugin written for a future version installs silently and fails later, far from the cause. |
| **`V.directive` doesn't pass `terminal`.** | A plugin can't create a structural directive like `v-if` and `v-for`. |
| **Overwriting an existing name doesn't warn.** | A plugin can replace `v-text` without anyone noticing. |
| **`app.use()` installs in the global `V`.** | No per-application registration. Two apps on the same page share everything. |
| **`install` doesn't receive context.** | The plugin doesn't know if it was installed via `V.use` or `app.use`, or which app. |

One way to close this without breaking what exists would be to give `install` a second context
object with a logger that tracks everything, and use those annotations to undo:

```js
// Proposal, not yet implemented.
install(V, options, ctx) {
  ctx.directive('my-widget', hooks);   // registered and tracked
  ctx.onUninstall(() => { /* ... */ });
}

V.unuse(myPlugin);  // undoes everything ctx tracked
```

If you implement it, keep `install(V, options)` working exactly as today: the
third parameter is additive and won't break any existing plugin.

---

## 8. Publishing checklist

- [ ] `install(V, options)` exists and doesn't throw when `options` is `undefined`.
- [ ] The plugin claims **one** property in `V`.
- [ ] Every directive, component, magic, rule, and mask is prefixed with the
      plugin name.
- [ ] No name collides with the core (run the checks in section 3).
- [ ] Features that only exist in the full build are checked before use.
- [ ] There is a shutdown method that undoes interceptors, listeners, and timers.
- [ ] Directives and components clean up what they created in unmount hooks.
- [ ] Nothing is added to `V.config.globals` except values and pure functions.
- [ ] `peerDependencies` declares the `voodoojs` version range.
- [ ] The README documents options, everything that's registered, and the license.
- [ ] The plugin doesn't use `eval` or `new Function`, and doesn't bring runtime
      dependencies, to stay compatible with restrictive CSP.

## Read also

- [Plugins](plugins.md), the usage guide
- [Directives](directives.md)
- [Components](components.md)
- [Application structure](application-structure.md)
- [CONVENTIONS.md](../CONVENTIONS.md), naming rules and deprecation policy
- [SECURITY.md](../SECURITY.md), what a plugin can compromise
