# GPU

> This module has its own entry: `voodoojs/dist/gpu.js`. It **does not** come in `voodoo.min.js`,
> nor in `voodoo.core.min.js`, nor in `voodoo.full.min.js`. The reason is in [Size and
> distribution](#size-and-distribution).

A WebGPU layer for Voodoo, in two heights.

On top, HTML: a `<canvas v-shader>` solves the common case without a line of JavaScript. Below,
the `V.gpu` API, loose functions that take the context as the first argument — no hidden global
state, no class to instantiate, no secret initialization order. You write in HTML as far as HTML
can go, and drop to JavaScript exactly where you need control.

The rule that rules everything: **nothing breaks when WebGPU doesn't exist.** `supported()` returns
`false`, `init()` returns `null`, and everything else accepts `null` in place of context and
becomes an empty operation. A page that uses GPU for decoration cannot crash on a browser that
doesn't yet have GPU.

## Installation

```js
import V from 'voodoojs';
import 'voodoojs/dist/gpu.js'; // registers v-shader and enables V.gpu
```

Or as a plugin, if you prefer to declare:

```js
import { voodooGpu } from 'voodoojs/dist/gpu.js';
V.use(voodooGpu);
```

To use just the API, without the directive, `import { gpu } from 'voodoojs'` is enough and is
removed by tree shaking when you don't use it.

## v-shader

```html
<canvas v-shader="waves.wgsl" :set="{ speed: speed, tint: color }"></canvas>
```

The attribute value accepts three sources, decided by elimination:

| Writing | Source |
| --- | --- |
| `v-shader="waves.wgsl"` | address, fetched with `V.http` |
| `v-shader="#my-shader"` | element selector; text inside is the shader |
| `v-shader="@fragment fn f() { ... }"` | WGSL written right there |

```html
<canvas v-shader="#meu-shader"></canvas>

<script type="x-shader/wgsl" id="meu-shader">
  struct Uniforms {
    time: f32,
    speed: f32,
    resolution: vec2<f32>,
    tint: vec3<f32>,
  };
  @group(0) @binding(0) var<uniform> u: Uniforms;

  @fragment
  fn pintar(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let onda = sin(uv.x * 12.0 + u.time * u.speed) * 0.5 + 0.5;
    return vec4<f32>(u.tint * onda, 1.0);
  }
</script>
```

Notice what **didn't** need to be written: no `createBuffer`, no `bindGroupLayout`, no byte
offsets. Voodoo reads the WGSL and builds everything from it.

The `@vertex` also doesn't appear: when the source doesn't bring one, Voodoo adds a triangle that
covers the entire screen and delivers `@location(0) uv` to the fragment, with the Y axis down,
which is how everyone expects to read an image. If you declare your own `@vertex`, it's used instead.

### :set binds uniforms to state

```html
<div v-data="{ speed: 1, color: '#ff3d8b' }">
  <canvas v-shader="waves.wgsl" :set="{ speed: speed, tint: color }"></canvas>
  <input type="range" min="0" max="4" step="0.1" v-model.number="speed" />
</div>
```

When `speed` changes, the uniform is rewritten to the buffer and nothing else happens: the pipeline
isn't recreated, the shader isn't recompiled, the canvas doesn't flicker. Hex colors (`#ff3d8b`,
`#f0a`, `#ff00aa80`) become a vector of channels 0 to 1 automatically, and a bare number fills the
whole vector — `scale: 2` arrives as `vec3(2, 2, 2)`.

> `:set` is `v-bind:set`, so Voodoo's `v-bind` also mirrors the value to a `set` attribute on the
> canvas. It's inert, but appears in the inspector. If that bothers you, use `v-shader-set="{ ... }"`,
> which does exactly the same thing without touching the DOM.

### Implicit clock

A shader that declares any of these fields in the uniforms `struct` receives the value every
frame, with no configuration:

| Field | Type | Value |
| --- | --- | --- |
| `time` | `f32` | seconds since the first frame |
| `delta` | `f32` | seconds since the previous frame, capped at 0.25 |
| `frame` | `u32` or `f32` | frame number |
| `resolution` | `vec2<f32>` | canvas buffer size, in actual pixels |

The cap on `delta` exists so that coming back to the tab after a minute doesn't make the simulation
jump absurdly. The clock doesn't reset when the loop pauses and resumes: animation continues from
where it left off.

### Modifiers

| Modifier | Effect |
| --- | --- |
| `.once` | renders one frame only, no loop |
| `.visible` | only runs when the canvas is in the viewport, via `IntersectionObserver` |
| `.paused` | starts paused |

```html
<canvas v-shader.visible="background.wgsl"></canvas>
<canvas v-shader.once="poster.wgsl"></canvas>
```

`.visible` is the difference between an animated background and an empty battery: a fullscreen shader
running outside the viewport is wasted work. Use it whenever the canvas isn't the main focus of the
screen.

To pause from state, use `v-shader-paused`:

```html
<canvas v-shader="waves.wgsl" v-shader-paused="!playing"></canvas>
```

### Other attributes

| Attribute | Default | Effect |
| --- | --- | --- |
| `v-shader-set` | — | same as `:set`, without mirroring anything to the DOM |
| `v-shader-paused` | — | reactive expression that pauses the loop |
| `v-shader-dpr` | `1,2` | accepted range of `devicePixelRatio` |

### Canvas state

The directive writes the progress to `data-gpu`, which gives a CSS hook for free:

| Value | Meaning |
| --- | --- |
| `loading` | resolving the source and opening the device |
| `ready` | running |
| `paused` | paused, or outside viewport with `.visible` |
| `error` | source not found, or shader that didn't compile |
| `unsupported` | no WebGPU |

```css
canvas[data-gpu='loading'] { opacity: 0.4; }
canvas[data-gpu='error'] { outline: 2px solid var(--v-danger); }
```

## When there's no WebGPU

This is the most important path in the module, because it's what most people will see.

1. The canvas gets `data-gpu="unsupported"`.
2. The `voodoo:gpu-unsupported` event bubbles up the tree, with `{ reason, el }` in `detail`.
3. The content that was **inside** the `<canvas>` starts to appear.
4. Nothing is scheduled: no `requestAnimationFrame`, no observers, no requests. Not even the
   `.wgsl` is fetched — no point.
5. The console gets a warning only in development mode (`V.config.devtools = true`). In production,
   silence.

```html
<canvas v-shader="waves.wgsl">
  <img src="waves.png" alt="Colorful waves in motion" />
</canvas>
```

On point 3, it's worth explaining the trick: the browser only shows children of a `<canvas>` when it
can't draw canvas at all, and that's not the case here — the canvas works, what's missing is WebGPU.
So Voodoo moves the children to a `<div data-gpu-fallback>` right after the canvas and hides the
canvas. The revealed content is still Voodoo HTML: interpolation and directives inside work normally.
When destroying the element, everything goes back exactly where it was.

To offer something else instead:

```js
document.addEventListener('voodoo:gpu-unsupported', (e) => {
  V.toast.info('Your browser doesn\'t have WebGPU yet. Showing the video version.');
});
```

### Shader that doesn't compile

The error is reported by `handleError` — the same path as `V.onError` — with the WGSL log, the
element, and the line:

```
[Voodoo] error in V.gpu shader: Error: shader "v-shader <canvas#background>" did not compile:
  line 14: unresolved identifier 'sinn'
  > let wave = sinn(uv.x * 12.0);
```

The page doesn't crash. The canvas ends up in `data-gpu="error"`.

## The `V.gpu` API

```js
V.gpu.supported()                          // boolean, never throws
await V.gpu.init(options?)                 // -> context, or null if not supported
V.gpu.surface(gpu, canvas, { dpr?, format?, alpha? })
V.gpu.effect(gpu, wgsl, { set?, entry? })  // fullscreen shader; effect.set({ ... })
V.gpu.compute(gpu, wgsl, { set?, workgroups? })
V.gpu.uniforms(gpu, initialValues)         // .set({ ... }), .destroy()
V.gpu.clock(gpu)                           // { time, delta, frame }
V.gpu.target(gpu, { width, height, format })
V.gpu.frame(gpu, (frame) => { frame.pass(target, ...operations) })
V.gpu.frameLoop(gpu, (frame) => { ... })   // returns stop()
V.gpu.destroy(gpu)
V.gpu.reflect(wgsl)                        // pure WGSL reading, no GPU
```

A complete example:

```js
const gpu = await V.gpu.init();
if (!gpu) return showVideoVersion();

const screen = V.gpu.surface(gpu, document.querySelector('#background'), { dpr: [1, 2], alpha: true });
const waves = V.gpu.effect(gpu, wgsl, { set: { speed: 1.4, tint: '#ff3d8b' } });

const stop = V.gpu.frameLoop(gpu, (frame) => {
  waves.set({ time: frame.clock.time });
  frame.pass(screen, waves);
});

// later
stop();
V.gpu.destroy(gpu);
```

### surface

`dpr: [min, max]` limits `devicePixelRatio`: `[1, 2]` means "follow the screen, but don't go over 2x".
The buffer size is the CSS size times that factor, always within the device's `maxTextureDimension2D`.
A `ResizeObserver` keeps it up to date on its own — you don't listen to `resize` or call anything.

`alpha: true` makes the canvas transparent (`alphaMode: 'premultiplied'`).

### effect and compute

Both compile from the source, build the bind group via reflection and return an object with
`set()`, `destroy()` and a `reflection` with everything read from the shader. `ok` says if the
pipeline came up; when it's `false`, drawing becomes an empty operation instead of an exception.

`entry` chooses the entry point when the shader has more than one. Without it, the first
`@fragment` (or `@compute`) found in the source wins.

### frame and frameLoop

`frame` records an encoder, calls your callback and sends it. `frame.pass(target, ...effects)` opens
a render pass on the target — a `surface` or a `target` — and executes the effects in order.
`frame.compute(...calculations)` does the same for compute. `frame.clear` is the clear color, `[r, g,
b, a]` from 0 to 1, transparent by default.

`frameLoop` is the same inside a `requestAnimationFrame`, and returns `stop()`.

## WGSL reflection

The heart of the module, and the reason you don't declare bindings by hand. `V.gpu.reflect(wgsl)`
is a pure function on text: it doesn't touch the DOM, doesn't need GPU, and runs anywhere.

```js
const info = V.gpu.reflect(source);
info.uniform.struct.fields; // [{ name: 'time', offset: 0, type: {...} }, ...]
info.bindings;              // [{ group: 0, binding: 0, kind: 'uniform', ... }]
info.entries;               // [{ stage: 'fragment', name: 'paint' }]
```

### What it covers

- `struct` declared in the file itself, with each field's offset calculated by WGSL `uniform`
  addressing rules. Including the classic gotcha: `vec3<f32>` takes 12 bytes but aligns to 16.
- Scalars (`f32`, `i32`, `u32`, `f16`, `bool`), vectors, `matCxR` matrices with padding between
  columns, and fixed-size arrays with stride multiple of 16.
- The short aliases: `vec3f`, `vec2u`, `mat4x4f`.
- `@group` and `@binding` in both orders, for `var<uniform>`, `var<storage, read>`,
  `var<storage, read_write>`, `sampler`, `sampler_comparison`, `texture_*` (with dimension, sampling
  type, depth and multisample) and `texture_storage_*`.
- Structs that reference other structs, resolved in successive passes.
- Entry points `@vertex`, `@fragment` and `@compute`, with `@workgroup_size` before or after
  `@compute`.
- Line and block comments, including nested ones, removed before everything — and without touching
  line count, so the compiler error number stays in sync with the file.

### What it doesn't cover

This is a real limit, not a promise for later:

- **`@align` and `@size` on struct members.** If you reposition fields by hand, the calculated
  offsets won't match. Don't use these attributes on structs that Voodoo fills.
- **Type aliases** (`alias Color = vec4<f32>;`). The type appears as unknown and the field is
  ignored. Write the type out in full.
- **Only group 0.** Bindings in `@group(1)` and above are read and appear in `reflection`, but the
  automatically built bind group is only for group 0.
- **`storage` layout uses `uniform` rules.** WGSL is looser there (array stride without rounding to
  16). Reflection identifies the binding correctly, but don't write storage buffers from calculated
  offsets.
- **Unsized arrays** inside a uniform. WGSL doesn't allow that either, so this is more warning than
  limit.
- **Textures aren't bound automatically.** Reflection knows the shader asks for a texture; you say
  which one, in `effect(gpu, wgsl, { textures: { nameInWgsl: view } })`. The `sampler`, that yes,
  is created automatically, linear and `clamp-to-edge`.
- **Fixed format in `texture_storage`.** The generated layout assumes `rgba8unorm`.

When reflection can't handle a shader, the pipeline **is not refused**: it falls back to WebGPU's own
`layout: 'auto'` mode. You lose automatic uniform inference, but the shader runs. It's better to lose
the magic than to refuse a shader that the driver would accept without complaining.

## Cleanup model

Everything that allocates knows how to free itself, and the contract is the same as the rest of
Voodoo (`packages/voodoojs/test/cleanup-contract.test.ts`):

| Resource | How it frees |
| --- | --- |
| uniforms buffer | `uniforms.destroy()` |
| target texture | `target.destroy()` |
| surface `ResizeObserver` | `surface.destroy()` |
| pipeline and bind group | `effect.destroy()` / `compute.destroy()` |
| `requestAnimationFrame` | `stop()`, returned by `frameLoop` |
| `.visible` `IntersectionObserver` | directive cleanup |
| entire device | `V.gpu.destroy(gpu)` |

The context keeps track of everything it opened in `gpu.resources`, so `V.gpu.destroy(gpu)` doesn't
forget anything, even if you did. Calling twice doesn't hurt, and calling with `null` doesn't either.

When destroying a `v-shader` element, the loop stops, the observer closes, the effect and surface
free themselves, `data-gpu` disappears, and the DOM returns to its original state. The directive
registers cleanup before any allocation, so it applies equally to the GPU path, the fallback, and
the shader that didn't even compile.

The device is one per tab: ten canvases with `v-shader` on the same page share the same context.
If the device is lost — GPU switch, tab suspended —, the context starts behaving as if it never
existed, with a warning in development mode and nothing else.

## Browser support

Honestly, as of August 2026:

| Browser | Status |
| --- | --- |
| Chrome and Edge, desktop | since 113, on by default |
| Chrome, Android | since 121 |
| Safari 26, macOS and iOS | on by default |
| Firefox, Windows | since 141 |
| Firefox, macOS and Linux | behind flag in many versions |
| Browsers on machines without modern driver | no WebGPU, regardless of version |

That is: most have it, a real chunk doesn't, and that chunk isn't noise. That's why the fallback
isn't a finishing detail in this module — it's half the project.

## Size and distribution

Measured in the 0.2.0 build, compressed with gzip:

| File | With GPU | Without GPU |
| --- | --- | --- |
| `voodoo.core.min.js` | — | 44.25 KB |
| `voodoo.min.js` | — | 80.90 KB |
| `voodoo.full.min.js` | 135.99 KB | 127.58 KB |
| `dist/gpu.js` (ESM, own code) | 3.07 KB | — |

The layer costs **8.41 KB gzip**, and the complete build has a 133 KB ceiling. Putting WebGPU in
there would make every page using `voodoo.full.min.js` pay for a niche resource, and would blow
the budget. That's why it has its own entry: whoever uses it pays for it.

In ESM builds, common parts come out in shared chunks, so importing `voodoojs` and
`voodoojs/dist/gpu.js` together doesn't duplicate the runtime — it's one directive registry only,
one reactivity only.

The honest consequence: **in CDN bundles (`voodoo.min.js` and `voodoo.full.min.js`) the `v-shader`
directive doesn't exist.** To use it today you need a bundler. If the GPU layer ever becomes worth
the space in the complete build, the budget gets reviewed and it enters — but that's a decision to
make with numbers in hand, not on the fly.
