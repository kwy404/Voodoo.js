# Todo list

A complete todo list built with Voodoo.js. Open `index.html` straight in the
browser: no server, no build step. It loads the essential bundle
(`dist/voodoo.min.js`) with `data-manual`, so the component and the store are
registered before `V.theme.init()` and `V.start()`.

## What the demo does

- Adds a task with Enter or with the button, then clears the field.
- Marks a task done with the checkbox, and strikes the text through.
- Edits inline on double click: Enter saves, Esc cancels, leaving the field saves.
- Removes a task, and clears every completed one at once.
- Filters between all, active and completed, highlighting the chosen filter.
- Counts what is left with the right singular and plural, and shows a progress bar.
- Keeps everything in localStorage, so the list comes back on reload.
- Reorders the list by dragging the handle, with the mouse, by touch and by keyboard.
- Animates items in and out, respecting `prefers-reduced-motion`.
- Switches between the light and dark theme, in three states, together with the
  library's own built-in UI.

## Voodoo features on show here

`V.component()` with `state`, `computed` and `methods`, a global `V.store()`
with persistence read from the HTML as `{ $store.stats.created }`, `v-for` with
`:key`, `v-model` (on the new-task field, on the editing field and directly on
`task.done`), `v-if`, `v-show`, `v-click`, `v-dblclick`, `v-ref`,
`v-theme-toggle`, `:class`, `:style`, `:data-id`, single-brace interpolation,
event modifiers (`.enter`, `.esc`, `.space`, `.stop`) and `v-sortable` with
`v-sortable-handle`, which hands you the new order in `$event.detail.order`.

## The detail worth copying

`v-for` deletes the DOM node the moment an item leaves the array, which would
kill any exit animation. The `remove()` method solves that in three steps: it
marks the item as `leaving`, lets the CSS animation run, and only then takes the
item out of the list with `setTimeout`. The wait drops to zero when the visitor
asks for less motion.
