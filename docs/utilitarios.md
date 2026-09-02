# Utilities

Pure functions, with no DOM dependencies, so the module runs the same in browser, Node, Bun, and
Deno. Everything here is tree-shakeable.

They are in the `V` object and also at the dedicated entry point:

```js
import { debounce, formatCurrency, slugify } from 'voodoojs/utils';
```

---

## Identifiers and time

### uuid

```js
V.uuid();  // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

UUID v4. Uses `crypto.randomUUID` when available, with two fallbacks.

### uid

```js
V.uid();          // 'vk3f9a2'
V.uid('field-');  // 'field-k3f9a2'
```

Short identifier, useful for element ids.

### sleep

```js
await V.sleep(500);
```

### parseDuration

```js
V.parseDuration(300);      // 300
V.parseDuration('300');    // 300
V.parseDuration('300ms');  // 300
V.parseDuration('1.5s');   // 1500
V.parseDuration('2m');     // 120000
V.parseDuration('1h');     // 3600000
V.parseDuration(null, 99); // 99
```

Accepts `null` because the most common source is `getAttribute`.

---

## Higher-order functions

### debounce

Delays execution until it stops being called.

```js
const search = V.debounce(loadProducts, 300);
search('cane');
search('mug');   // only this executes

search.cancel();    // discards the pending call
search.flush();     // executes now, without waiting
```

The third argument executes on the leading edge instead of the trailing edge:

```js
const saveNow = V.debounce(save, 1000, true);
```

### throttle

At most one execution per interval.

```js
const track = V.throttle(measureScroll, 100);
window.addEventListener('scroll', track, { passive: true });
track.cancel();
```

### once

Executes once and memoizes the return.

```js
const start = V.once(() => createConnection());
start();
start();  // returns the same connection
```

> Be careful with the name: `V.once` on the global object is the event bus
> (`V.once('event', handler)`). The utility is available at direct import:
> `import { once } from 'voodoojs/utils'`.

### memoize

Result cache by argument.

```js
const calculate = V.memoize((a, b) => expensiveOperation(a, b));
calculate(1, 2);
calculate(1, 2);       // comes from cache
calculate.cache.clear();

const byId = V.memoize(fetch, (id) => String(id));  // custom key
```

---

## Objects and arrays

### clone

Deep copy. Uses `structuredClone` when available, with manual path for objects with functions.
Understands `Date`, `Map`, and `Set`.

```js
const copy = V.clone(originalState);
```

### merge

Deep merge. Arrays are replaced, not concatenated.

```js
V.merge({ a: { b: 1 } }, { a: { c: 2 } });  // { a: { b: 1, c: 2 } }
V.merge(defaults, fromUser, fromQuery);
```

The first object is modified. Pass `{}` up front when you want to preserve it.

### groupBy

```js
V.groupBy(orders, 'status');
V.groupBy(people, (p) => p.age >= 18 ? 'adult' : 'minor');
```

### unique

```js
V.unique([1, 2, 2, 3]);              // [1, 2, 3]
V.unique(users, 'id');
V.unique(points, (p) => `${p.x},${p.y}`);
```

### chunk

```js
V.chunk([1, 2, 3, 4, 5], 2);  // [[1, 2], [3, 4], [5]]
```

### sortBy

Sorts without modifying the original array. Text uses `localeCompare` with numeric sorting, which
resolves `item 2` before `item 10`. Null values go to the end.

```js
V.sortBy(products, 'price');
V.sortBy(products, 'price', 'desc');
V.sortBy(users, (u) => u.profile.name);
```

### get and set

Reading and writing nested paths, safely.

```js
V.get(data, 'user.address.city');
V.get(data, 'list.0.name', 'no name');

V.set(form, 'address.street', 'Main St');
V.set(form, 'items.0.qty', 2);
```

`set` creates intermediate objects and uses array when the next key is numeric.

### random and sample

```js
V.random(1, 6);        // integer between 1 and 6, inclusive
V.sample(['a', 'b']);  // any item
```

---

## Text

### slugify

```js
V.slugify('Action and Reaction');       // 'action-and-reaction'
V.slugify('My Post', '_');       // 'my_post'
```

### truncate

```js
V.truncate('A very long text', 10);          // 'A very l...'
V.truncate('A very long text', 10, '…');     // 'A very lo…'
```

### capitalize and titleCase

```js
V.capitalize('voodoo');           // 'Voodoo'
V.titleCase('JAVASCRIPT feels');  // 'Javascript Feels'
```

### escapeHtml and stripTags

```js
V.escapeHtml('<b>hi</b>');   // '&lt;b&gt;hi&lt;/b&gt;'
V.stripTags('<b>hi</b>');    // 'hi'
```

`escapeHtml` is the safe way to build HTML by hand. `stripTags` removes tags simply, and **does not**
work as a security sanitizer. See [Security](seguranca.md).

---

## Formatters

All use the default locale and currency, adjustable:

```js
V.setFormatDefaults('pt-BR', 'BRL');
```

Bootstrap already sets this from `V.config.locale` and `V.config.currency`.

### formatCurrency

```js
V.formatCurrency(1234.5);                              // 'R$ 1.234,50'
V.formatCurrency(99, { currency: 'USD', locale: 'en-US' });  // '$99.00'
```

### formatNumber

```js
V.formatNumber(1234.5678);                                    // '1.234,568'
V.formatNumber(0.75, { style: 'percent' });                   // '75%'
V.formatNumber(1234, { minimumFractionDigits: 2 });           // '1.234,00'
```

### formatDate

```js
V.formatDate(new Date());                     // '28/08/2026'
V.formatDate(order.createdAt, 'long');        // '28 August 2026'
V.formatDate(order.createdAt, 'full');
V.formatDate(order.createdAt, 'time');        // '14:30'
V.formatDate(order.createdAt, 'datetime');
V.formatDate(order.createdAt, 'DD/MM/YYYY HH:mm:ss');
V.formatDate(order.createdAt, { weekday: 'long', month: 'short' });
```

Accepts `Date`, timestamp, or ISO string. An invalid date returns empty text.

Text mask markers: `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm`, `ss`.

### relativeTime

```js
V.relativeTime(Date.now() - 300_000);   // '5 minutes ago'
V.relativeTime(Date.now() + 172_800_000); // 'in 2 days'
```

### formatFileSize

```js
V.formatFileSize(1536);       // '1.5 KB'
V.formatFileSize(1_048_576);  // '1.0 MB'
V.formatFileSize(1234, 2);    // '1.21 KB'
```

### formatPercent

```js
V.formatPercent(0.256);     // '26%'
V.formatPercent(0.256, 1);  // '25.6%'
```

---

## Environment

### isBrowser

```js
if (V.isBrowser) { /* has DOM */ }
```

### device

Object with on-demand calculated getters:

```js
V.device.touch;          // device with touch
V.device.mobile;         // width up to 767px
V.device.tablet;         // 768px to 1023px
V.device.desktop;        // 1024px and up
V.device.online;
V.device.reducedMotion;  // prefers-reduced-motion: reduce
V.device.darkMode;       // prefers-color-scheme: dark
```

In HTML, use `$device`:

```html
<div v-show="$device.mobile">Mobile version</div>
<div v-show="!$device.reducedMotion" v-motion="fadeUp">With animation</div>
```

### screen and network

Unlike `device`, these two are **reactive**: the page updates itself when the window
resizes or the connection drops.

```html
<div v-show="$screen.mobile">Mobile</div>
<div v-show="$screen.desktop">Desktop</div>
<span>{ $screen.width } by { $screen.height }</span>
<div v-show="$screen.matches('(min-width: 1400px)')">Wide screen</div>

<div v-show="!$network.online">You are offline</div>
<div v-show="$network.slow">Slow connection, loading light version</div>
<span>{ $network.type }</span>
```

| `$screen` field | What it is |
| --- | --- |
| `width`, `height` | Window dimensions |
| `mobile` | Less than 768px |
| `tablet` | 768px to 1023px |
| `desktop` | 1024px or more |
| `portrait`, `landscape` | Orientation |
| `matches(query)` | Tests any media query |

| `$network` field | What it is |
| --- | --- |
| `online` | Connection state |
| `type` | Type reported by the browser, like `4g` |
| `saveData` | User requested data savings |
| `slow` | `2g` or `slow-2g` |

### clipboard

```js
await V.clipboard.copy('text');   // returns true when successful
await V.clipboard.read();          // returns '' when user doesn't allow
```

In HTML, `$clipboard` or the `v-copy` directive.

---

## Using within HTML

Utilities are not global in expressions by default. Enable the ones you use:

```js
V.config.globals.formatCurrency = V.formatCurrency;
V.config.globals.formatDate = V.formatDate;
V.config.globals.relativeTime = V.relativeTime;
```

```html
<td>{ formatCurrency(order.total) }</td>
<td>{ relativeTime(order.createdAt) }</td>
```

Or put it in the root scope, which is already visible from anywhere:

```js
V.data({
  currency: V.formatCurrency,
  date: V.formatDate,
});
```

```html
<td>{ currency(order.total) }</td>
```

---

Previous: [Plugins](plugins.md) · Next: [API](api.md)
