# Voodoo.js Design System

> JavaScript feels like magic.

The official design system of **Voodoo.js**, written in plain CSS. No
dependencies, no build step, no framework. It is five text files that any
browser understands the moment you open them.

Open `index.html` to see the full showcase, with every component rendered and
the HTML behind each one.

---

## Contents

1. [Philosophy](#philosophy)
2. [Installation](#installation)
3. [File structure](#file-structure)
4. [Main tokens](#main-tokens)
5. [Naming convention](#naming-convention)
6. [How to extend it](#how-to-extend-it)
7. [Light and dark theme](#light-and-dark-theme)
8. [Accessibility checklist](#accessibility-checklist)

---

## Philosophy

The Voodoo.js Design System comes out of four decisions that hold for
everything living inside it.

**1. The token is the single source of truth.**
No component writes `#6D3BF5`, `16px` or `200ms`. Every value comes from a CSS
variable declared in `tokens.css`. Changing the visual identity of the entire
product means editing one file, not three hundred selectors.

**2. The platform before the library.**
The accordion is `<details>`. The checkbox is `<input type="checkbox">`. The
tabs use `role="tab"` with `aria-selected`. That means keyboard, screen reader,
browser find and printing all working for free, with no JavaScript required.

**3. The state CSS reads is the same state the screen reader reads.**
When an ARIA attribute can describe the situation, the selector uses the
attribute, not a parallel class. An open modal is
`.v-modal-root[aria-hidden="false"]`. That way it is impossible for the visuals
to say one thing and assistive technology to say another.

**4. Zero friction to adopt.**
One `<link>` and the interface is already standing, in light and dark theme,
responsive, with visible focus. Nothing to install, compile or configure.

---

## Installation

### Option A: a single file

```html
<link rel="stylesheet" href="design-system/voodoo-ui.css">
```

`voodoo-ui.css` runs `@import` on the four files in the correct order. It is
the shortest path, ideal for prototypes and internal pages.

### Option B: four files (recommended in production)

Each `@import` costs one request in series, so in production prefer linking the
files directly. The order is mandatory.

```html
<link rel="stylesheet" href="design-system/tokens.css">
<link rel="stylesheet" href="design-system/reset.css">
<link rel="stylesheet" href="design-system/components.css">
<link rel="stylesheet" href="design-system/utilities.css">
```

Why this order:

| Order | File | Reason |
| :--- | :--- | :--- |
| 1 | `tokens.css` | Defines the variables everything else consumes. |
| 2 | `reset.css` | Normalizes the browser already using the tokens. |
| 3 | `components.css` | Draws the components out of the tokens. |
| 4 | `utilities.css` | Comes last so it can beat the components. |

### Fonts (optional)

The brand fonts are optional. If you load none of them, the `system-ui` and
`ui-monospace` fallbacks take over and the page stays correct.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap">
```

### Theme script (optional, 8 lines)

Put it in the `<head>`, before the CSS, to avoid the color flash on load. Every
access to `localStorage` sits inside a `try/catch` because the browser may
block storage in a private window.

```html
<script>
  (function () {
    var escolha = null;
    try { escolha = localStorage.getItem("voodoo-theme"); } catch (e) {}
    if (escolha !== "light" && escolha !== "dark") {
      escolha = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", escolha);
  })();
</script>
```

---

## File structure

```
design-system/
├── tokens.css       Design tokens: color, typography, space, radius, shadow, time
├── reset.css        Modern browser normalization
├── components.css   23 component families prefixed with "v-"
├── utilities.css    Layout, spacing, typography and visibility utilities
├── voodoo-ui.css    Single bundle that imports the four above
├── index.html       Living showcase with examples and code for each component
└── README.md        This document
```

---

## Main tokens

### Semantic colors

These are the only colors that change with the theme, and the only ones
components should consume. The raw palette (`--v-purple-500`, `--v-ink-900` and
company) exists to feed these, not to be used straight in the interface.

| Token | Light theme | Dark theme | Use |
| :--- | :--- | :--- | :--- |
| `--v-color-bg` | `#FBF7F2` cream | `#14111F` dark ink | Page background |
| `--v-surface` | `#FFFFFF` | `#1C182B` | Cards, modals, fields |
| `--v-surface-2` | `#F6F0E8` | `#2A2440` mid ink | Footers, table headers |
| `--v-surface-3` | `#EDE4D8` sand | `#352E4F` | Progress and switch tracks |
| `--v-text` | `#14111F` | `#FBF7F2` | Main text |
| `--v-text-muted` | `#555066` | `#B9B0C4` | Supporting text |
| `--v-border` | `#E3D9CC` | `#372F52` | Borders and dividers |
| `--v-primary` | `#6D3BF5` purple | `#7B52F7` | Primary action |
| `--v-primary-hover` | `#5B2EDB` | `#8F6BFF` | Hover of the primary action |
| `--v-primary-contrast` | `#FFFFFF` | `#FFFFFF` | Text on top of the primary color |
| `--v-accent` | `#FF3D8B` magenta | `#FF3D8B` | Highlights and gradients |
| `--v-success` | `#0F7A57` | `#2ED9A5` mint | Confirmation |
| `--v-warning` | `#A35A08` | `#FFB35C` amber | Attention |
| `--v-danger` | `#C42A2A` | `#FF4D4D` | Error and destruction |
| `--v-info` | `#5B2EDB` | `#9B7BFF` | Neutral information |

Every state color has a `*-soft` companion for badge and alert backgrounds,
for example `--v-success-soft`.

### Raw scales

| Family | Steps | Brand reference |
| :--- | :--- | :--- |
| `--v-purple-*` | 50 to 900 | 500 is `#6D3BF5`, 400 is `#9B7BFF` |
| `--v-magenta-*` | 50 to 900 | 500 is `#FF3D8B` |
| `--v-ink-*` | 50 to 900 | 50 is cream, 100 is sand, 800 is mid ink, 900 is dark ink |
| `--v-mint-*` | 100 to 900 | 500 is `#2ED9A5` |
| `--v-amber-*` | 100 to 900 | 500 is `#FFB35C` |
| `--v-red-*` | 100 to 900 | 500 is `#FF4D4D` |

### Typography

| Token | Value |
| :--- | :--- |
| `--v-font-display` | `"Space Grotesk", "Inter", system-ui, sans-serif` |
| `--v-font-sans` | `"Inter", system-ui, sans-serif` |
| `--v-font-mono` | `"JetBrains Mono", ui-monospace, monospace` |
| `--v-text-xs` to `--v-text-4xl` | 12, 14, 16, 18, 22, 28, 36 and 48 pixels |
| `--v-weight-regular` to `--v-weight-bold` | 400, 500, 600, 700 |
| `--v-leading-tight` to `--v-leading-relaxed` | 1.15, 1.3, 1.6, 1.8 |
| `--v-tracking-tight`, `--v-tracking-wide` | `-0.02em`, `0.08em` |

### Spacing, radius, shadow and time

| Category | Tokens | Values |
| :--- | :--- | :--- |
| Space | `--v-space-1` to `--v-space-16` | 4px scale: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64 |
| Radius | `--v-radius-sm/md/lg/xl/full` | 6px, 10px, 16px, 24px, 999px |
| Shadow | `--v-shadow-sm/md/lg/glow` | `glow` is the brand's purple glow |
| Layer | `--v-z-dropdown/sticky/backdrop/modal/toast/tooltip` | 1000, 1100, 1200, 1300, 1400, 1500 |
| Duration | `--v-duration-fast/base/slow/slower` | 120ms, 200ms, 320ms, 600ms |
| Easing | `--v-ease-out/in-out/spring` | `spring` gives the switch and the checkbox their little hop |
| Container | `--v-container-sm/md/lg/xl/full` | 640, 768, 1024, 1280, 1440 pixels |

---

## Naming convention

### Tokens

```
--v-<category>-<variation>

--v-color-bg        semantic color
--v-purple-500      raw palette, step on the scale
--v-space-6         spacing scale
--v-radius-lg       radius
--v-z-modal         layer
```

The `v` prefix, for Voodoo, guarantees nothing here collides with other CSS
present on the page.

### Classes

The pattern is BEM with a prefix, plus a separate family for states.

```
.v-block                block:        .v-card, .v-btn, .v-toast
.v-block__element       element:      .v-card__header, .v-toast__progress
.v-block--modifier      modifier:     .v-btn--primary, .v-badge--success
.is-state               state:        .is-open, .is-loading, .is-active
```

Practical rules:

- A modifier **never** comes alone. Always `class="v-btn v-btn--primary"`.
- A state always travels with the block: `class="v-btn v-btn--primary is-loading"`.
- When an ARIA attribute already describes the state, the CSS uses the
  attribute instead of a class: `[aria-selected="true"]`, `[aria-current="page"]`,
  `[aria-invalid="true"]`, `[aria-hidden="false"]`, `[open]`, `:checked`,
  `:disabled`.
- A utility settles a one-off adjustment: `v-mt-4`, `v-text-muted`, `v-truncate`.
  If you repeat the same five utilities every time in the same arrangement,
  that has become a component and it belongs in `components.css`.

---

## How to extend it

### Create a new token

Declare it in the plain `:root`, in a file loaded **after** `tokens.css`. If
the token changes with the theme, it has to exist in all three places: `:root`,
the system preference block and the `data-theme="dark"` block.

```css
/* meu-produto.css, loaded after tokens.css */

:root {
  --v-brand-nebula: #7B2FF7;
  --v-surface-elevated: #FFFFFF;   /* changes with the theme */
  --v-space-20: 5rem;              /* stays on the 4px scale */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --v-surface-elevated: #241F38;
  }
}

:root[data-theme="dark"] {
  --v-surface-elevated: #241F38;
}
```

### Create a new component

Consume tokens only, never fixed values.

```css
.v-painel {
  display: flex;
  flex-direction: column;
  gap: var(--v-space-4);
  padding: var(--v-space-6);
  background-color: var(--v-surface-elevated);
  border: var(--v-border-width) solid var(--v-border);
  border-radius: var(--v-radius-lg);
  box-shadow: var(--v-shadow-md);
  transition: box-shadow var(--v-duration-base) var(--v-ease-out);
}

.v-painel--destaque { box-shadow: var(--v-shadow-glow); }
.v-painel.is-collapsed { padding-block: var(--v-space-3); }
```

### Swap the whole brand

Override the semantic colors alone. Every component follows along with no other
change.

```css
:root {
  --v-primary: #0F62FE;
  --v-primary-hover: #0043CE;
  --v-accent: #FF7EB6;
}
```

### Adjust one component here and there

Prefer a new variant over editing `components.css`, which is the file you will
want to update without conflicts in the future.

```css
.v-btn--marca {
  --v-btn-bg: var(--v-brand-nebula);
  --v-btn-bg-hover: var(--v-primary-hover);
  --v-btn-fg: var(--v-white);
  --v-btn-border: var(--v-brand-nebula);
}
```

Buttons expose `--v-btn-bg`, `--v-btn-fg`, `--v-btn-border`,
`--v-btn-bg-hover`, `--v-btn-height`, `--v-btn-padding` and `--v-btn-font` as
extension points. Alerts expose `--v-alert-accent` and `--v-alert-bg`, and
toasts expose `--v-toast-accent`.

---

## Light and dark theme

### How it works

The light theme lives in the plain `:root`. **No color exists only inside a
theme block**, so every variable always has a valid value, even in an old
browser that ignores the blocks below.

The dark theme is applied in two places, and only the semantic variables are
redefined:

```css
/* 1. Automatic: the system asks for dark and the user did not force light */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* ... */ }
}

/* 2. Manual: the user chose dark, the system does not matter */
:root[data-theme="dark"] { /* ... */ }
```

This pair is what makes the toggle work in both directions:

| `data-theme` on `<html>` | Light system | Dark system |
| :--- | :--- | :--- |
| absent | light | dark |
| `"light"` | light | light |
| `"dark"` | dark | dark |

### Rules for writing new CSS

1. Never use a raw palette color straight in a component. Use the semantic one.
2. Every new color has to be born in the plain `:root` before it shows up in
   any theme block.
3. If the color changes with the theme, declare it in all three places.
   Forgetting the `data-theme="dark"` block breaks the manual toggle on
   machines with a light system.
4. Do not count on `color-scheme` to paint your component. It only adjusts
   native controls and scrollbars.
5. Test the component in both themes before merging. The showcase has a toggle
   at the top for exactly that.

---

## Accessibility checklist

Run this list before publishing any screen built with the design system.

### Structure

- [ ] The page has an `<h1>` and the headings step down without skipping a level.
- [ ] There is a "skip to content" link (`.v-skip-link`) as the first focusable
      element of the `<body>`.
- [ ] Regions use semantic markup: `<header>`, `<nav>`, `<main>`,
      `<aside>`, `<footer>`.
- [ ] Each repeated `<nav>` has an `aria-label` of its own.

### Keyboard

- [ ] Everything clickable is reachable with `Tab`, in visual order.
- [ ] Focus is always visible. The `:focus-visible` ring was never removed
      without a replacement.
- [ ] Tabs respond to the arrow keys, `Home` and `End`.
- [ ] Modal, drawer and dropdown close with `Esc`.
- [ ] When a dialog opens, focus moves into it. When it closes, focus returns
      to the button that opened it.

### Forms

- [ ] Every control has a `<label>` tied by `for` or wrapping the field.
- [ ] Supporting text is connected through `aria-describedby`.
- [ ] A field with an error has `aria-invalid="true"` and an `aria-describedby`
      pointing at the `.v-field-error` message.
- [ ] The error is written in text, not only in border color.
- [ ] Required fields carry `required` on top of the visual asterisk from
      `.v-label--required`.

### Dynamic content

- [ ] The toast stack is a `role="region"` with `aria-live="polite"`.
- [ ] Errors that interrupt use `role="alert"`. Notices use `role="status"`.
- [ ] A loading button has `aria-busy="true"` and keeps its label in the DOM.
- [ ] The loading skeleton is `aria-hidden="true"` and comes with a piece of
      text in `.v-sr-only`.
- [ ] The progress bar has `role="progressbar"` with `aria-valuenow`,
      `aria-valuemin` and `aria-valuemax`, or just `aria-label` when it is
      indeterminate.

### Color and contrast

- [ ] Normal text has a minimum contrast of 4.5 to 1 against the background, in
      both themes. Every semantic text color in the system meets that floor in
      the resting state.
- [ ] Color is never the only carrier of information. A status badge carries
      the status text too.
- [ ] Purely decorative icons take `aria-hidden="true"`.
- [ ] Icon-only buttons take an `aria-label`.

### Motion and responsiveness

- [ ] `prefers-reduced-motion` is respected. The reset already cuts animations
      and transitions down to nearly zero.
- [ ] No screen produces horizontal scrolling. Tables sit in `.v-table-wrap`
      and code blocks in `.v-pre`, which scroll inside themselves.
- [ ] The layout stays readable at 200 percent zoom.
- [ ] Touch targets are at least 40 pixels tall. The medium button is 40 and
      the large one is 48.

---

## License and credits

Internal design system of Voodoo.js. Written in plain CSS, with no third party
dependencies. The Space Grotesk, Inter and JetBrains Mono fonts are optional
and distributed under their own licenses by their respective families.
