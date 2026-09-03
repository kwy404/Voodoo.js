# 3D shaders

Four raymarching scenes in plain WebGL2, with a reactive control panel next to
them. No Three.js, no CDN, no external dependency at all: Voodoo has zero
runtime dependencies and the examples respect that.

Open it at `http://localhost:5173/examples/shaders/`.

## The scenes

| Scene | What it is |
| --- | --- |
| **Mandelbulb** | The classic 3D fractal, marched by distance. The power breathes with time and changes the whole topology of the solid. |
| **Infinite tunnel** | Polar coordinates become depth. The noise is sampled over a circle in the plane, and not over the raw angle, so the duct does not get a visible seam. |
| **Metaballs** | Spheres fused by a smooth union, with a soft shadow from a secondary march, a sky reflection and Fresnel. The floor has a discreet grid to give a sense of scale. |
| **Ocean** | A height field summing six waves. The surface is found by false position, the normal flattens with distance so it does not alias at the horizon, and the sun leaves a trail on the water. |

All of them share the same uniform header: `resolucao`, `tempo`, `camera` and
five generic parameters `p1..p5`, which each scene interprets in its own way.
That is what lets the panel be generic.

## What this demo shows of Voodoo.js

**The entire panel is born from a `v-for`.** Each scene declares its own list of
controls, with a label, a minimum, a maximum and a step. The HTML walks that
list and builds the sliders. Adding a new control means adding an object to the
array: there is no interface code to write.

**The sliders use `v-model`.** The value the person drags is written straight
into the same object that the render loop reads to send as a uniform. There is
not a single line of "take the value from the input and update the uniform".

**Switching scenes switches the list, and the interface rebuilds itself.** The
tabs, the highlight on the active tab, the caption about the scene and the
control panel all come from the computed `cena`.

**Native WebGL resources stay outside the reactive state.** The context, the
programs and the VAO live in `this.gpu`, a plain object created in `mounted`.
Native driver objects should not be wrapped in a proxy or observed.

## A directive of your own, in eight lines

An `<input type="range">` is born with `min 0`, `max 100` and `step 1`. Since
`v-model` runs at priority 40 and `v-bind` at 30, a plain `:min` would arrive
too late: the browser would round `0.12` down to `0` before the right range was
written. The demo solves that with a directive of its own:

```js
V.directive('faixa', {
  priority: V.PRIORITY.MODEL + 1,
  created: function (el, binding) {
    el.min = String(binding.value.min);
    el.max = String(binding.value.max);
    el.step = String(binding.value.passo);
  }
});
```

It is a small example of how Voodoo leaves the execution order of the directives
in the hands of whoever is using it.

## A mandatory fallback

Without WebGL2 there is nothing to draw, so the demo shows a message explaining
what happened instead of leaving a black rectangle behind. If the context does
exist but the driver refuses a shader, the demo puts the compiler report on the
screen.

## Behavior

- Drag over the scene to turn the camera; the arrow keys do the same, and
  `Space` pauses.
- The resolution slider is the honest performance control: in raymarching the
  cost is per pixel.
- Leaving the tab pauses time, so it does not burn GPU for nothing.
- The loop is canceled and the programs and the VAO are released on
  `beforeUnmount` and on `pagehide`.
- `prefers-reduced-motion` turns off the interface transitions; the scenes keep
  animating, but pause is one click away.
