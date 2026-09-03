# Real-time chat with Voodoo.js

A simulated messenger, with a sidebar of conversations, message bubbles, a
typing indicator and automatic replies. It runs entirely in the browser.

## How to open

Open `examples/chat/index.html`. The demo uses the essential bundle
`packages/voodoojs/dist/voodoo.min.js` with `data-manual`, so the component is
registered before `V.theme.init()` and `V.start()`.

## What the demo shows

- `v-for` on the conversations, on the messages and on the emoji grid, always with `:key`.
- `v-show` on the counters, on the typing indicator and on the emoji picker.
- `v-transition` with the `fade` and `scale` animations the library already injects.
- `V.nextTick` before adjusting `scrollTop`, so the scrolling happens after the
  list has already been updated in the DOM.
- `@keyup.enter` on the text field and `@outside` to close the emoji picker.
- `v-model`, `v-click`, `v-ref` and `:class` across the rest of the screen.
- Message states that move along on their own: sending, sent and read.

## Details

All the logic lives in `V.component('chat-app', ...)`. The look combines design
system classes (`v-avatar`, `v-badge`, `v-input`, `v-btn`) with CSS of its own
written only in the `--v-*` tokens, so both themes come out of the same code.
Two columns on the desktop, one on the phone, and the animations respect
`prefers-reduced-motion`.
