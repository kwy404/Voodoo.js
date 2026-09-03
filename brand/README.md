# Voodoo.js brand

> **JavaScript feels like magic.**

This directory gathers every official Voodoo.js visual asset: mascot, logo, illustrations and patterns. Everything is plain SVG, written by hand, with no libraries and no external dependencies.

To see all the assets side by side, open `preview.html` in the browser.

---

## Official palette

These are the only brand color values. Do not create new shades: if you need variation, use opacity over one of these colors.

| Name | Hex | Role in the brand |
| --- | --- | --- |
| Primary purple | `#6D3BF5` | The main color. Logo, links, primary buttons, energy lines. |
| Light purple | `#9B7BFF` | The purple's support. Gradients, glows, hover states, details. |
| Accent magenta | `#FF3D8B` | Highlight accent. Use it sparingly, only where the eye should stop. |
| Candle amber | `#FFB35C` | The spark of magic. Wand tips, glows, warnings. |
| Success mint | `#2ED9A5` | Success, confirmation, response received, reactive node updated. |
| Danger red | `#FF4D4D` | Destructive error, critical alert. |
| Dark ink | `#14111F` | Dark background, highest contrast text, the little holes in the buttons. |
| Mid ink | `#2A2440` | Outlines, stitching, dark surfaces, secondary text. |
| Parchment cream | `#FBF7F2` | Light background, the mascot's fabric, text on a dark background. |
| Sand | `#EDE4D8` | Fabric shadow, empty fields, neutral surfaces. |

### Suggested proportion

Purple dominates, magenta and amber appear in small doses. A good mix for a hero screen: around 60% neutrals (cream, sand, inks), 30% purple and light purple, 10% split between magenta and amber.

---

## Typography

| Use | Family | Full stack |
| --- | --- | --- |
| Display, headings, wordmark | Space Grotesk | `'Space Grotesk', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Body text, interface | Inter | `Inter, 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif` |
| Code, directives, tags | JetBrains Mono | `'JetBrains Mono', 'Fira Code', ui-monospace, monospace` |

The wordmark uses Space Grotesk **Bold (700)** with `letter-spacing: -1.2` at the 44px scale. In the SVGs the text was kept as `<text>` with the font stack declared, so it degrades gracefully on any machine. If you need absolute fidelity in print, convert the text to curves before sending it to the printer.

---

## The mascot: Vudu

Vudu is a little rag doll, cute and friendly, never scary. He is the face of the framework in documentation, UI states and promotional material.

**Fixed anatomy.** These traits do not change between poses:

- A sand colored fabric body with a gradient from cream to sand.
- A central zigzag seam down the torso and on the forehead.
- A purple button for the left eye, a magenta button for the right eye, always with four little holes and thread in an X.
- A smile embroidered as a dotted line.
- A square purple patch on the chest, slightly rotated.
- A tuft of hair made of three lines: purple, magenta and light purple.
- A magic pin with a magenta ball head and a glowing amber tip.

**The six poses and when to use each one:**

| Pose | When to use it |
| --- | --- |
| `vudu.svg` | The default. Presentations, README, page header. |
| `vudu-wave.svg` | Onboarding, first run, a welcome in the documentation. |
| `vudu-happy.svg` | Success, build finished, install completed. |
| `vudu-loading.svg` | Loading and waiting. Comes with CSS animation built in. |
| `vudu-error.svg` | Error, failed request, exception screen. |
| `vudu-sleeping.svg` | Idle, expired session, server stopped. |

---

## Using the logo

### Versions

- `voodoo-mark.svg`: the symbol on its own. Use it when the brand has already been introduced in the context, or in very small spaces.
- `voodoo-logo.svg`: symbol and wordmark, for light backgrounds.
- `voodoo-logo-dark.svg`: the same construction, for dark backgrounds.
- `voodoo-lockup.svg`: the logo with the tagline. Use it on covers, presentations and opening material.
- `favicon.svg`: a simplified symbol inside a rounded dark square.

### Minimum clear space

Reserve clear space around the logo equal to **half the height of the symbol**. Nothing enters that area: no text, no image, no card border.

```
        ↕ x
   ┌───────────────┐
 x │  V  Voodoo.js │ x        x = symbol height ÷ 2
   └───────────────┘
        ↕ x
```

### Minimum sizes

| Asset | Minimum on screen | Minimum in print |
| --- | --- | --- |
| `voodoo-mark.svg` | 16 px wide | 6 mm |
| `favicon.svg` | 16 px | not applicable |
| `voodoo-logo.svg` and the dark version | 120 px wide | 30 mm |
| `voodoo-lockup.svg` | 200 px wide | 50 mm |

Below those sizes the wordmark closes up and the spark disappears. In that case switch to the symbol on its own.

### Backgrounds

There are two versions of the horizontal logo, one for each kind of background. Always use the one that matches the background:

| Background | File | Wordmark color |
| --- | --- | --- |
| Light: parchment cream, sand, white | `voodoo-logo.svg` | `#14111F` with `.js` in `#6D3BF5` |
| Dark: dark ink, mid ink | `voodoo-logo-dark.svg` | `#FBF7F2` with `.js` in `#9B7BFF` |

Never use the light file on a dark background, or the other way round: the wordmark disappears. Over a photo, put down a solid layer first, or a veil of dark ink at 60% opacity.

---

## Light and dark theme

The symbol, the mascot and the brand colors are the same in both themes. The only things that change are the neutrals: text, outlines and dark surfaces.

Each SVG carries an internal `<style>` block with these classes, and a `@media (prefers-color-scheme: dark)` that swaps only the neutrals:

| Class | What it controls | Light | Dark |
| --- | --- | --- | --- |
| `.vd-txt` | Neutral text and caption markers | `#2A2440` | `#FBF7F2` |
| `.vd-txt-forte` | Wordmark and highest contrast text | `#14111F` | `#FBF7F2` |
| `.vd-haste` | Thin stems drawn over the background | `#2A2440` | `#9B7BFF` |
| `.vd-rim` | A rescue outline on dark masses, such as the cauldron and the server | `transparent` | `#FBF7F2` |
| `.vd-decor` | Opacity of the runes and of the 404 in the background | `0.13` | `0.26` |

The original values remain in the SVG presentation attributes, so anything that does not interpret CSS still sees the drawing correctly in the light theme.

**One important detail.** When the SVG is loaded through `<img>`, the browser resolves that `@media` from the **system** preference, and not from your page's theme. If your site fixes the theme on its own, like the dark Voodoo.js landing page, you have two reliable routes:

1. Paste the SVG inline into the HTML, so it starts obeying the page's CSS.
2. Use the two separate versions of the logo and swap them with CSS, which is what `preview.html` does in its header.

The mascot does not depend on this: the body is light with a dark outline, so he stands out on any background.

---

## What NOT to do with the brand

1. Do not change the symbol's colors. The ball is always magenta and the tip is always amber.
2. Do not put the light logo on a light background, or the dark one on a dark background.
3. Do not rotate, tilt, mirror or distort the logo. Always resize it proportionally.
4. Do not recreate the wordmark in another font, and do not write "VoodooJS", "voodoo.js" or "Voodoo JS". The correct spelling is **Voodoo.js**.
5. Do not add a shadow, an outline, an outer glow or any effect to the logo.
6. Do not put the logo inside boxes, circles or badges other than `favicon.svg`.
7. Do not use the mascot in place of the logo in formal contexts, and do not mix different Vudu poses on the same screen.
8. Do not redraw Vudu, do not swap the button eyes around and do not make the face scary. He is a friendly little creature.
9. Do not stretch the illustrations. They have a `viewBox` and must scale keeping their proportions.
10. Do not use the palette outside the values in this table.

---

## File table

| File | Base size | Purpose |
| --- | --- | --- |
| `mascot/vudu.svg` | 512 × 512 | The mascot's default pose, smiling and holding the wand. |
| `mascot/vudu-happy.svg` | 512 × 512 | Celebration, little arms up and sparks. Success states. |
| `mascot/vudu-loading.svg` | 512 × 512 | Loading, spinning wand and three dots. CSS animation built in, respecting `prefers-reduced-motion`. |
| `mascot/vudu-error.svg` | 512 × 512 | Sadness, a loose seam and a tear. Error screens. |
| `mascot/vudu-sleeping.svg` | 512 × 512 | Sleep, with "z z z" rising. Idle and expired session. |
| `mascot/vudu-wave.svg` | 512 × 512 | A welcoming wave. Onboarding and documentation. |
| `logo/voodoo-mark.svg` | 64 × 64 | The symbol on its own: a magic pin shaped like a V, with a spark. Legible at 16 px. |
| `logo/voodoo-logo.svg` | 340 × 88 | Horizontal logo for a light background. |
| `logo/voodoo-logo-dark.svg` | 340 × 88 | Horizontal logo for a dark background. |
| `logo/voodoo-lockup.svg` | 380 × 150 | The logo with the tagline, for covers and openings. |
| `logo/favicon.svg` | 32 × 32 | Tab and shortcut icon, a simplified symbol on dark ink. |
| `illustrations/hero.svg` | 800 × 500 | The hero scene: Vudu conjuring a button, a form and a card. |
| `illustrations/reactivity.svg` | 800 × 460 | How reactivity works: only the nodes that depend on the state are redrawn. |
| `illustrations/http.svg` | 800 × 460 | The request cycle with `v-get` and `v-post`, with HTML coming back from the server. |
| `illustrations/directives.svg` | 800 × 460 | A tag being enchanted, with `v-click`, `v-text` and `v-model` coming out of it. |
| `illustrations/empty-state.svg` | 600 × 480 | An empty cauldron, for states with no content. |
| `illustrations/404.svg` | 700 × 480 | Page not found, with Vudu lost and a map. |
| `patterns/runes-bg.svg` | 480 × 480 | A repeatable rune pattern, for the background of highlight sections. |
| `README.md` | text | This brand guide. |
| `preview.html` | page | A gallery of every asset. Opens in the dark theme, with a button to switch to the light one. |

---

## How to use it

Favicon:

```html
<link rel="icon" type="image/svg+xml" href="/brand/logo/favicon.svg">
```

The mascot on a page:

```html
<img src="/brand/mascot/vudu-wave.svg" alt="Vudu waving" width="180" height="180">
```

The rune pattern as a background:

```css
.hero {
  background-color: #FBF7F2;
  background-image: url("/brand/patterns/runes-bg.svg");
  background-repeat: repeat;
  background-size: 480px 480px;
}
```

Color tokens in CSS:

```css
:root {
  --vd-roxo: #6D3BF5;
  --vd-roxo-claro: #9B7BFF;
  --vd-magenta: #FF3D8B;
  --vd-ambar: #FFB35C;
  --vd-menta: #2ED9A5;
  --vd-vermelho: #FF4D4D;
  --vd-tinta: #14111F;
  --vd-tinta-media: #2A2440;
  --vd-creme: #FBF7F2;
  --vd-areia: #EDE4D8;
}
```

---

## Technical notes

- Every SVG has a `viewBox`, `role="img"`, a `<title>` and a `<desc>` tied together by `aria-labelledby`, so it works well with a screen reader.
- Every SVG has the theme block described in the "Light and dark theme" section, with the brand colors preserved in both modes.
- The internal gradient identifiers and the animation classes are prefixed per file, so it is safe to paste several SVGs inline on the same page without an `id` conflict.
- Only `mascot/vudu-loading.svg` has animation. It is pure CSS inside the file itself, and it stops on its own when the system asks for less motion.
- The files are UTF-8, with an explicit XML declaration.
