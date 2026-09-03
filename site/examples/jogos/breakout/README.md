# Breakout

A complete Breakout: five hand-drawn levels, bricks with one, two and three
layers, indestructible blocks, five power-ups that fall, combo, lives, pause, a
persisted high score and synthesized sound.

Open it at `http://localhost:5173/examples/jogos/breakout/`.

## What this demo shows of Voodoo.js

The point of the demo is the division of labor between declarative HTML and
canvas.

**The whole interface is Voodoo, written in the HTML itself.** Score, high
score, level, lives as hearts, combo, the list of active power-ups with the time
left on each, the start screen, the pause screen, the notice between levels and
the game over screen. None of that goes through `document.createElement`: they
are `{ interpolations }`, `v-show`, `v-for`, `:class`, `:style` and `@click`
reading the state of the component.

**The canvas only handles what needs pixels.** The `requestAnimationFrame` loop
draws bricks, ball, paddle, capsules and particles. It never touches the DOM.

**The bridge between the two is a single rule:** the physics lives in
`this.mundo`, a plain object created in `mounted` and left outside the reactive
state on purpose. Sixty times per second the loop moves dozens of numbers in
there at no reactivity cost at all. When something the interface displays really
does change (a brick broke, a life ran out, a power-up expired), the loop writes
to a state property and the HTML updates itself.

## Features used

| Feature | Where |
| --- | --- |
| `v-component` | the whole game is a component registered with `V.component` |
| `v-show` | the four overlaid screens, without taking the canvas out of the DOM |
| `v-for` | the strip of active power-ups |
| `v-ref` / `$refs` | access to the `<canvas>` from `mounted` |
| `@click`, `@pointerdown` | the menus and the large touch buttons |
| `:class`, `:style` | the screen shake and the color of each power-up |
| `computed` | the life hearts and the canvas description for screen readers |
| `V.storage` | a high score that survives a reload |
| `V.sound` | synthesized effects, including four defined with `V.sound.define` |
| `v-mute`, `v-theme-toggle` | mute and light/dark theme, with no JavaScript of your own |

## Behavior details

- **Keyboard and touch.** Arrows or `A`/`D` move, `Space` launches, `P` or `Esc`
  pauses, `R` restarts. On a phone, the finger drags the paddle directly on the
  stage, and there are three large buttons that only show up on a coarse
  pointer.
- **No leaks.** The loop is canceled on `beforeUnmount` and on `pagehide`, and
  every listener is removed with it. If the tab goes out of sight, the game
  pauses.
- **Reduced motion.** `prefers-reduced-motion` turns off the screen shake and
  the interface animations. The game itself keeps animating, otherwise there is
  no game.
- **Accessibility.** The canvas carries an `aria-label` that describes the state
  of the match, the score is `aria-live`, and every control is a real button
  reachable with `Tab`.
