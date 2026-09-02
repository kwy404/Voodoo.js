# Animations

> This module comes only in `voodoo.full.min.js` or in a custom build.

Custom animation engine in the spirit of Framer Motion, written in vanilla. The core is a single
`requestAnimationFrame` loop shared by all active animations, with two progress modes: tween, with
fixed duration and easing curve, and spring, with real numerical integration of stiffness, damping,
and mass.

Everything respects `prefers-reduced-motion: reduce`. In that case the final state is applied immediately,
without intermediate frames.

## v-motion

Animates the element as soon as it's initialized.

```html
<div v-motion="fadeUp">Appears moving up</div>
<div v-motion="{ opacity: [0, 1], y: [24, 0], duration: 400 }">With custom values</div>
<div v-motion="{ scale: [0.8, 1], spring: { stiffness: 300, damping: 20 } }">With spring</div>
```

## Presets

| Name | What it does |
| --- | --- |
| `fadeIn` | Opacity only |
| `fadeUp` | Moves up a few pixels while appearing. Most used in lists |
| `fadeDown` | Moves down while appearing |
| `scaleIn` | Grows from inside out, with slight overshoot at the end |
| `slideLeft` | Enters sliding from the right |
| `slideRight` | Enters sliding from the left |
| `pop` | Pops in place with lively spring |
| `blurIn` | Comes out of blur until sharp |
| `flip` | Rotates on the horizontal axis, like a card flipping |

The presets are also in `V.motion`:

```js
V.animate('.card', V.motion.fadeUp);
V.motion.pop;  // { opacity: [0,1], scale: [0.6,1], spring: { stiffness: 420, damping: 18 } }
```

## Animatable properties

Any numeric CSS property works. Beyond those, there are shortcuts that feed into a single
`transform` per element, so multiple animations coexist without overwriting each other:

```
x  y  z  scale  scaleX  scaleY  rotate  rotateX  rotateY  skewX  skewY
```

And filter shortcuts:

```
blur  brightness  contrast  grayscale  saturate
```

Colors are truly interpolated, understanding `#fff`, `#112233aa`, `rgb()`, `rgba()`, `hsl()`,
`hsla()`, and `transparent`.

```html
<div v-motion="{ x: [-40, 0], rotate: [-8, 0], backgroundColor: ['#fff', '#6D3BF5'] }"></div>
```

A single value uses the current state as the starting point. A `[from, to]` pair defines both
extremes.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `duration` | 400 | Duration in milliseconds. Ignored with spring |
| `delay` | 0 | Wait before starting |
| `easing` | `easeOut` | Name of an easing or custom function |
| `spring` | | `true` for defaults, or `{ stiffness, damping, mass, velocity }` |
| `repeat` | 0 | Extra repeats. `2` runs three times |
| `repeatType` | `loop` | `loop`, `reverse`, or `mirror` |
| `force` | `false` | Ignores `prefers-reduced-motion`. Reserve for essential animations |
| `onUpdate` | | Receives progress each frame |
| `onComplete` | | Called at the end |

Built-in curves: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeOutBack`, `easeOutExpo`,
`anticipate`, `bounce`. All are in `V.easings`.

## v-motion-scroll

Animates when the element enters the viewport.

```html
<section v-motion-scroll="fadeUp">Animate on appear</section>
<section v-motion-scroll.repeat="fadeIn">Animate every time it appears</section>
<section v-motion-scroll="scaleIn" v-motion-scroll-amount="0.5">Half visible</section>
<section v-motion-scroll="fadeUp" v-motion-scroll-margin="-100px">With margin</section>
```

The initial state is applied on mount, so the element is born hidden and doesn't flash.

## v-motion-stagger

Creates a wave among direct children that use `v-motion` or `v-motion-scroll`.

```html
<ul v-motion-stagger="80">
  <li v-motion="fadeUp">One</li>
  <li v-motion="fadeUp">Two</li>
  <li v-motion="fadeUp">Three</li>
</ul>

<ul v-motion-stagger="60" v-motion-stagger-from="center">
  <li v-for="item in itens" v-motion-scroll="fadeUp">{ item }</li>
</ul>
```

`v-motion-stagger-from` accepts `first` (default), `last`, and `center`. The index is computed on the fly,
so children created later by `v-for` are also included in the wave.

## v-motion-hover and v-motion-tap

```html
<button v-motion-hover="{ scale: 1.05, y: -2 }" v-motion-tap="{ scale: 0.96 }">
  Hover over me
</button>
```

`v-motion-hover` also responds to keyboard focus, which maintains visual feedback for Tab navigation.
`v-motion-tap` animates while the element is pressed. Both preserve the original state and return to it on exit.

## v-parallax

Moves the element based on scroll.

```html
<img v-parallax="0.3" src="/fundo.jpg" alt="">
<img v-parallax="-0.2" src="/frente.png" alt="">
```

Negative values reverse the direction. With `prefers-reduced-motion`, the directive does nothing.

## v-flip

Saves the element's position and, when it changes between updates, smoothly animates from the old
to the new position. This is the FLIP technique.

```html
<li v-for="item in itensOrdenados" :key="item.id" v-flip>{ item.nome }</li>
<li v-flip="{ duration: 300, easing: 'easeInOut' }">...</li>
```

Without options, uses a spring with `stiffness: 340` and `damping: 34`. Combine with `:key` so
elements are reused instead of recreated.

## v-count

Animates a number to the value and writes it in the element.

```html
<span v-count="1250"></span>
<span v-count="receita" v-count-format="currency"></span>
<span v-count="taxa" v-count-format="percent" v-count-decimals="1"></span>
<span v-count="total" v-count-duration="2s" v-count-prefix="+" v-count-suffix=" sales"></span>
```

| Attribute | Default |
| --- | --- |
| `v-count-duration` | 1400 ms |
| `v-count-decimals` | 0 |
| `v-count-format` | `number`, `currency`, or `percent` |
| `v-count-prefix`, `v-count-suffix` | empty |

Format uses `V.config.locale` and `V.config.currency`. Reactive changes to the value re-animate from
the displayed number, not from zero.

## v-typewriter

```html
<h1 v-typewriter="JavaScript feels like magic."></h1>
<h1 v-typewriter="frase" v-typewriter-speed="30"></h1>
```

Types letter by letter. `v-typewriter-speed` is the time per character, defaulting to 45 ms. Loose
text is used as-is, and an expression is reactive.

## API via JavaScript

### animate

```js
const controle = V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 });
await controle.finished;
controle.stop();
```

The target can be an element, a list, a `NodeList`, or a CSS selector.

```js
V.animate(botao, { scale: 1.2 }, { spring: { stiffness: 300 } });
V.animate(barra, { width: ['0%', '100%'] }, { duration: 1000, easing: 'easeInOut' });
V.animate(el, { rotate: 360 }, { repeat: Infinity, easing: 'linear', duration: 2000 });
```

### spring

Integrates a real spring between two numbers and delivers the value each frame. Doesn't touch the DOM,
so it works for styles, counters, smooth scrolling, or any other numeric value.

```js
V.spring(0, 320, {
  stiffness: 210,
  damping: 22,
  onUpdate: (v) => { barra.style.width = `${v}px`; },
  onComplete: () => console.log('stopped'),
});
```

Defaults: `stiffness: 170`, `damping: 26`, `mass: 1`.

### stagger

```js
V.stagger('.card', V.motion.fadeUp, { delay: 70, from: 'center', start: 200 });
```

`delay` is the step between items, `start` is the delay for the entire wave, `from` is `first`, `last`, or
`center`.

### inView

```js
const parar = V.inView(secao, (entry) => {
  secao.classList.add('ativa');
  return () => secao.classList.remove('ativa');  // cleanup when leaving screen
}, { once: false, amount: 0.5, margin: '-80px' });

parar();
```

`amount` accepts a number from 0 to 1, `any`, or `all`.

### scrollProgress

Reports 0 to 1 as the element moves through the screen.

```js
const parar = V.scrollProgress(artigo, (p) => {
  barra.style.transform = `scaleX(${p})`;
});
```

## Combining with everything else

```html
<ul v-motion-stagger="60">
  <li v-for="produto in produtos" :key="produto.id" v-motion-scroll="fadeUp" v-flip>
    <img v-lazy-src="produto.foto" alt="">
    <strong>{ produto.nome }</strong>
    <span v-count="produto.preco" v-count-format="currency"></span>
  </li>
</ul>
```

## Accessibility

Never use animation to convey information that doesn't exist otherwise. People who enable
`prefers-reduced-motion: reduce` get the final state immediately, without intermediate frames,
and `v-parallax` simply doesn't run. Use `force: true` only when the animation is the content itself,
like a progress bar.

---

Previous: [Drag and drop](arrastar-e-soltar.md) · Next: [Charts](graficos.md)
