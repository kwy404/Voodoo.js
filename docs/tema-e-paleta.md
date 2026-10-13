# Theme and palette

Voodoo.js has two complementary systems: the **theme**, which alternates between light and dark, and the
**palette**, which generates all interface colors from a few base colors.

---

# Light and dark theme

Three states: `light`, `dark` and `system`, which follows the operating system, including when it
changes while the page is open. An explicit choice is applied to the root element with the
`data-theme` attribute:

```html
<html data-theme="dark">
```

With `system`, or when the visitor has never chosen, the attribute doesn't exist and the system
preference is used, read via `prefers-color-scheme`. A page nobody configured is never written to:
including the script does not repaint your site.

## In HTML

```html
<!-- Switches between light and dark, as it always has. -->
<button v-theme-toggle>Toggle theme</button>

<!-- Walks system, light, dark and back to system. -->
<button v-theme-toggle.cycle>Theme</button>

<!-- One button per state, pressed while it is the current choice. -->
<button v-theme-toggle:system>System</button>
<button v-theme-toggle:light>Light</button>
<button v-theme-toggle:dark>Dark</button>
```

The button receives:

- `aria-pressed` (except with `.cycle`, which has three states rather than two);
- a descriptive `aria-label`, kept up to date, unless you wrote one yourself;
- `data-voodoo-theme`, the theme on screen (`light` or `dark`);
- `data-voodoo-theme-mode`, the choice (`system`, `light` or `dark`), so CSS can pick an icon.

```css
.theme-icon { display: none; }
[data-voodoo-theme-mode="system"] .theme-icon--system,
[data-voodoo-theme-mode="light"] .theme-icon--light,
[data-voodoo-theme-mode="dark"] .theme-icon--dark { display: inline; }
```

Before 1.0 the button wrote `data-v-theme`. That is the valid-HTML spelling of a `v-theme`
directive, so attribute cleanup removed it as soon as the button mounted; use the two attributes
above instead.

## Via JavaScript

```js
V.theme.current;    // 'light', 'dark', or 'system'
V.theme.resolved;   // 'light' or 'dark', resolving 'system'
V.theme.chosen;     // true once the visitor picked one, 'system' included
V.theme.set('dark');
V.theme.set('system');
V.theme.toggle();   // light and dark only; returns the applied theme
V.theme.cycle();    // system, light, dark; returns the new choice
V.theme.apply();    // reapplies the current theme
V.theme.init();     // applies the saved one and starts following the system and other tabs
```

`set()` ignores anything other than the three names, with a warning. The choice is saved in
`localStorage` under the key `voodoo:theme` as the plain string `light`, `dark` or `system`; the
JSON spelling `"dark"` written by older builds is read too. A change made in another tab, or in a
same-origin frame, reaches the page without a reload. `init()` runs on its own: the script-tag
build calls it when it loads, and a page built from the ES modules gets it from `start()`,
`v-theme-toggle` or `$theme`. Calling it more than once is safe.

## No flash on load

The library restores the choice as soon as it runs, but a script loaded with `defer` runs after
the first paint, so a visitor who chose dark on a light system would see the page open light and
then switch. Put this in the `<head>`, before any stylesheet. It reads the same key and writes
exactly what `V.theme` writes, so the two never disagree:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('voodoo:theme');
      if (t && t.charAt(0) === '"') t = JSON.parse(t);
      var r = document.documentElement;
      if (t === 'light' || t === 'dark') {
        r.setAttribute('data-theme', t);
        r.style.colorScheme = t;
      } else if (t === 'system') {
        r.removeAttribute('data-theme');
      }
    } catch (e) {}
  })();
</script>
```

A server-rendered page can emit the same block. Without JavaScript, or before the script arrives,
the page follows the visitor's system as long as the CSS writes the dark theme for both cases:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark tokens */ }
}
:root[data-theme="dark"] { /* dark tokens */ }
```

## Reacting to changes

```js
document.addEventListener('voodoo:theme', (e) => {
  console.log(e.detail.theme, e.detail.resolved);
});
```

The event fires for every change, including a system change on a page where nobody chose a theme.

```html
<div v-show="$theme.resolved === 'dark'">You are in dark theme</div>
```

## Writing CSS that follows the theme

```css
.minha-caixa {
  background: var(--v-surface);
  color: var(--v-text);
  border: 1px solid var(--v-border);
  border-radius: var(--v-radius);
  box-shadow: var(--v-shadow);
}
```

Since the variables already change with the theme, you don't need to write two versions of the rule.

---

# Palette

`V.palette()` generates, from a few base colors, the complete scale of tones from 50 to 900, the
dark theme version, and the text color with the best contrast over each color, all written as CSS
variables on `:root`.

The calculation happens in OKLCH, a perceptually uniform color space: steps with the same
luminance difference appear equally distant to the eye, which doesn't happen in HSL. Text color uses
the real WCAG relative luminance calculation, so the result is always readable.

## Applying

```js
V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' });
V.palette({ preset: 'oceano' });
```

| Option | What it does |
| --- | --- |
| `preset` | Starting point. Provided colors override |
| `primary`, `accent`, `success`, `warning`, `danger`, `info` | Base colors |
| `neutral` | Color that tints backgrounds, text, and borders. Default: the primary's hue |
| `radius` | Border radius, like `12px` or `0.75rem` |
| `font` | Main font family. The page is still responsible for loading the font |
| `monoFont` | Monospace family, used by `VCodeBlock` |
| `persist` | Saves the choice in `localStorage`. Default `true` |

## Presets

| Name | Primary | Accent |
| --- | --- | --- |
| `violeta` | `#6D3BF5` | `#FF3D8B` |
| `oceano` | `#0E7BC4` | `#0FB5C9` |
| `floresta` | `#1F8A4C` | `#7FA80E` |
| `poente` | `#E4632A` | `#D62F63` |
| `grafite` | `#4C5A70` | `#2E7FD1` |

All have verified contrast in both themes.

```js
V.palette.use('floresta');   // changes only the preset, keeping radius and font
V.palette.names;             // ['violeta', 'oceano', 'floresta', 'poente', 'grafite']
V.palette.reset();           // back to default and clears saved choice
V.palette.current;           // palette in use, with all scales
V.palette.options;           // options from the last application
```

## A palette selector

```html
<div v-data="{ presets: ['violeta', 'oceano', 'floresta', 'poente', 'grafite'] }">
  <button v-for="p in presets" v-click="trocarPaleta(p)">{ p }</button>
</div>
```

```js
V.data({ trocarPaleta: (nome) => V.palette.use(nome) });
```

## CSS tokens

Always present with built-in default values, even without calling `V.palette()`:

| Token | What it does |
| --- | --- |
| `--v-primary`, `--v-primary-hover`, `--v-primary-contrast` | Primary color |
| `--v-accent` | Accent color |
| `--v-success`, `--v-warning`, `--v-danger`, `--v-info` | States |
| `--v-surface`, `--v-surface-2` | Backgrounds |
| `--v-text`, `--v-text-muted` | Text colors |
| `--v-border` | Borders |
| `--v-radius`, `--v-radius-sm` | Radii |
| `--v-shadow` | Shadow |
| `--v-ease` | Transition curve |
| `--v-z-modal`, `--v-z-drawer`, `--v-z-dropdown`, `--v-z-toast`, `--v-z-tooltip` | Z-layers |

After `V.palette()`, the set grows:

| Token | What it does |
| --- | --- |
| `--v-surface-3`, `--v-surface-inset` | Intermediate backgrounds |
| `--v-text-soft` | Even softer text |
| `--v-border-strong` | Higher-contrast border |
| `--v-overlay` | Darkened dialog background |
| `--v-shadow-sm`, `--v-shadow-lg` | Smaller and larger shadows |
| `--v-radius-lg`, `--v-radius-xl`, `--v-radius-full` | Larger radii |
| `--v-focus-ring` | Focus ring color |
| `--v-font-sans`, `--v-font-mono` | Font families |
| Scales from 50 to 900 for each base color | Derived tones |

## Derived colors

```js
V.palette.scale('#6D3BF5')['700'];        // dark tone of the scale
V.palette.scale('#6D3BF5', true);         // dark theme scale
V.palette.contrastText('#6D3BF5');        // '#fff' or '#000', whichever reads better
V.palette.contrastRatio('#6D3BF5', '#fff');  // WCAG ratio, 1 to 21
V.palette.luminance('#6D3BF5');           // relative luminance

V.palette.convert.parseColor('rgb(109, 59, 245)');
V.palette.convert.rgbToOklch({ r: 109, g: 59, b: 245 });
V.palette.convert.oklchToRgb({ l: 0.5, c: 0.2, h: 280 });
V.palette.convert.toHex({ r: 109, g: 59, b: 245 });
V.palette.convert.toRgba({ r: 109, g: 59, b: 245 }, 0.4);
```

Use `contrastRatio` to check contrast during development: 4.5 is the WCAG AA minimum
for normal text, and 3 for large text.

## Persistence

By default the palette is saved in `localStorage` under the key `voodoo:palette` and reapplied on
the next load, before the first render. To not save:

```js
V.palette({ preset: 'oceano', persist: false });
```

## Reacting to changes

```js
document.addEventListener('voodoo:palette', (e) => {
  console.log(e.detail.colors, e.detail.css);
});
```

## Turning off injected CSS

If you prefer to write all the CSS yourself:

```html
<script src="voodoo.full.min.js" data-no-styles defer></script>
```

No styles are injected. The components keep working, but without appearance, and you're
responsible for writing the rules for the `v-*` classes.

## Tokens and Tailwind

If you use Tailwind, point the colors to the variables and the two work together:

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--v-primary)',
        accent: 'var(--v-accent)',
        surface: 'var(--v-surface)',
      },
      borderRadius: { DEFAULT: 'var(--v-radius)' },
    },
  },
};
```

---

Previous: [Languages](idiomas.md) · Next: [Devtools](devtools.md)
