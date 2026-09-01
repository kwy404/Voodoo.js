# Events

Three equivalent ways to write the same behavior:

```html
<button v-on:click="save()">Save</button>
<button @click="save()">Save</button>
<button v-click="save()">Save</button>
```

The first is the complete form and works for any event. The second is the shortcut, same as Vue.
The third exists for the most common events and makes HTML more readable.

## Shortcuts with proper names

`v-click`, `v-dblclick`, `v-input`, `v-change`, `v-keyup`, `v-keydown`, `v-keypress`,
`v-mouseenter`, `v-mouseleave`, `v-mouseover`, `v-mousedown`, `v-mouseup`, `v-contextmenu`,
`v-wheel`, `v-paste`, `v-dragstart`, `v-dragover`, `v-dragleave`, `v-drop`.

Any other event uses `@name` or `v-on:name`, including custom events:

```html
<div @order:created="update($detail)"></div>
<video @timeupdate="progress = $event.target.currentTime"></video>
```

## Friendly nicknames

| Write | Real event |
| --- | --- |
| `@hover` | `mouseenter` |
| `@unhover` | `mouseleave` |
| `@tap` | `click` |
| `@press` | `pointerdown` |
| `@release` | `pointerup` |
| `@rightclick` | `contextmenu` |
| `@type` | `input` |
| `@enterkey` | `keydown` |
| `@submitform` | `submit` |

## The expression

You can write the whole action:

```html
<button v-click="counter++">+1</button>
<button v-click="items.push(new); new = ''">Add</button>
```

Or just the name of a function, which is called with the event:

```html
<button v-click="save">Save</button>
```

Inside the expression you have three extra variables:

| Variable | What is it |
| --- | --- |
| `$event` | The event object |
| `$el` | The element that declared the directive |
| `$detail` | The `detail` of a `CustomEvent`, including component `emit` |

```html
<input @keyup="search = $event.target.value">
<button @click="console.log($el.dataset.id)">See id</button>
<my-component @saved="register($detail)"></my-component>
```

When the event comes from `emit`, an expression that is just a function name receives the
`detail` instead of the event:

```html
<editor @saved="onSave"></editor>
```

```js
V.data({ onSave(data) { console.log(data.id); } });
```

## Modifiers

### Event control

| Modifier | What it does |
| --- | --- |
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.self` | Only fires when `event.target` is the element itself |
| `.once` | Listen only once |
| `.capture` | Listen in capture phase |
| `.passive` | Mark the listener as passive, good for `scroll` and `wheel` |

```html
<form @submit.prevent="send()">...</form>
<div class="overlay" @click.self="close()">...</div>
<button @click.once="start()">Start</button>
<div @wheel.passive="track()">...</div>
```

### Where to listen

| Modifier | Target |
| --- | --- |
| `.window` | `window` |
| `.document` | `document` |
| `.outside` | `document`, ignoring clicks inside the element |

```html
<div @keydown.escape.window="close()">...</div>
<div @click.outside="closeMenu()">...</div>
```

### Timing

| Modifier | What it does |
| --- | --- |
| `.debounce` | Wait for firing to stop before executing. 250 ms |
| `.throttle` | At most one execution every 250 ms |

```html
<input @input.debounce="search($event.target.value)">
<div @scroll.throttle.window="track()"></div>
```

For a different timing, debounce in the function:

```js
V.data({ search: V.debounce((term) => load(term), 600) });
```

`v-model` has its own shortcut for this, with the `v-debounce` attribute:

```html
<input v-model.debounce="search" v-debounce="600">
```

### Keys

| Modifier | Key |
| --- | --- |
| `.enter` | Enter |
| `.esc`, `.escape` | Escape |
| `.space` | Space bar |
| `.tab` | Tab |
| `.delete` | Delete or Backspace |
| `.backspace` | Backspace |
| `.up`, `.down`, `.left`, `.right` | Arrows |
| `.a` to `.z`, `.0` to `.9` | The corresponding key |

```html
<input @keyup.enter="search()">
<input @keydown.esc="clear()">
<div @keydown.down.window="next()"></div>
```

System keys combine with others:

```html
<input @keydown.ctrl.enter="send()">
<div @keydown.meta.k.window.prevent="openSearch()"></div>
```

Accepted modifiers: `.ctrl`, `.shift`, `.alt`, `.meta`.

## Synthetic events

Voodoo builds some events that the browser doesn't offer.

### @hold

Fires when the user holds down. Default time is 800 ms and can come in the modifier:

```html
<button @hold="delete()">Hold to delete</button>
<button @hold.2s="delete()">Hold two seconds</button>
```

While the user holds, the element gets the `v-holding` class and the CSS variable
`--v-hold-duration`, which lets you draw a progress bar with CSS alone:

```css
.v-holding { background: linear-gradient(90deg, var(--v-primary) 0 0) left/0 100% no-repeat; }
.v-holding { animation: fill var(--v-hold-duration) linear forwards; }
@keyframes fill { to { background-size: 100% 100%; } }
```

The click that would come right after a completed hold is swallowed, so you don't execute two actions.

### @outside

Click anywhere outside the element:

```html
<div class="menu" @outside="open = false">...</div>
```

### @visible

Fires when the element enters the visible area. By default happens only once.

```html
<div @visible="loadMore()">...</div>
<div @visible.repeat="animate()">...</div>
```

| Modifier | What it does |
| --- | --- |
| `.repeat` | Fires on each new entry, instead of just once |

The required visible fraction is 0.1 and observer margin is zero.

### @swipeleft, @swiperight, @swipeup, @swipedown

Pointer gestures, working on mouse and touch. The threshold is 40 pixels on the dominant axis.

```html
<div @swipeleft="next()" @swiperight="previous()">
  <img :src="photos[index]">
</div>
```

The `detail` brings `{ dx, dy }`.

## Global keyboard shortcuts

### v-hotkey

Links a global combination to the element's click:

```html
<button v-hotkey="mod+s" v-click="save()">Save</button>
<button v-hotkey="ctrl+shift+p, meta+shift+p" v-click="openPalette()">Commands</button>
```

`mod` means Command on macOS and Control elsewhere. The element gets `aria-keyshortcuts`
automatically.

Combinations without a modifier don't fire when focus is in a text field, to not interfere
with typing. The `.force` modifier removes this protection, and `.default` keeps the browser's
default behavior:

```html
<button v-hotkey.force="?" v-click="help()">Help</button>
```

### V.hotkey

The same via JavaScript, returning the function that removes it:

```js
const stop = V.hotkey('ctrl+k', () => openSearch());
stop();

V.hotkey('escape', close, { allowInInput: true, preventDefault: false });
```

Accepted names: `esc`, `space`, `enter`, `del`, `ins`, `up`, `down`, `left`, `right`, `plus`,
`minus`, `comma`, `period`, `slash`, `question`, letters, digits, and any `event.key`.
Modifiers: `ctrl`, `shift`, `alt`, `meta`, `cmd`, `option`, `mod`. Multiple combos at once,
separated by comma.

## Library events

Directives fire custom events that bubble up the tree. You listen with `@name`:

| Event | Who fires it |
| --- | --- |
| `voodoo:ready` | Fired on `document` when the library starts |
| `voodoo:before-request`, `voodoo:success`, `voodoo:error`, `voodoo:complete` | HTTP directives |
| `voodoo:submit`, `voodoo:invalid`, `voodoo:upload`, `voodoo:progress`, `voodoo:autosave` | Forms |
| `voodoo:field-validated` | Field validation |
| `voodoo:toggle`, `voodoo:collapse`, `voodoo:popup`, `voodoo:drawer`, `voodoo:tab` | Interface |
| `voodoo:copy`, `voodoo:share`, `voodoo:download`, `voodoo:resized`, `voodoo:scrollspy` | Interface |
| `voodoo:idle`, `voodoo:online`, `voodoo:offline` | Interface |
| `voodoo:drag-start`, `voodoo:drag-end`, `voodoo:drag-cancel`, `voodoo:sorted`, `voodoo:drop` | Drag and drop |
| `voodoo:theme` | Fired on `document` when theme changes |
| `voodoo:palette` | Fired on `document` when `V.palette()` is applied |

```html
<form v-submit="/api/x" @voodoo:success="console.log($detail.data)"></form>
<ul v-sortable @voodoo:sorted="saveOrder($detail.order)"></ul>
```

## Global bus

For events with no element in between:

```js
const off = V.on('cart:changed', updateBadge);
V.once('app:ready', start);
V.emit('cart:changed', { total: 3 });
off();
V.off('cart:changed');
```

And in HTML, `$dispatch` creates a `CustomEvent` from the current element:

```html
<button v-click="$dispatch('filter', { term })">Filter</button>
<section @filter="apply($detail)">...</section>
```

## Cleanup

Every listener registered by a directive is removed when the element leaves the DOM. This also
applies to listeners installed on `window` and `document` by `.window`, `.outside`,
`v-hotkey`, and synthetic events. You don't need to remove anything by hand.

---

Previous: [State and stores](state-and-stores.md) · Next: [HTTP](http.md)
