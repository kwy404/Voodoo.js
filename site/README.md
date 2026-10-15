# Voodoo.js website

> **JavaScript feels like magic.**

This folder is the official Voodoo.js site, published at
[kwy404.github.io/Voodoo.js](https://kwy404.github.io/Voodoo.js/). It is static, with no build
step, and it is built with the library itself: the spell book on the home page, the presets, the
language picker, the theme toggle, the Ctrl+K palette and the copy buttons are directives on plain
HTML. The styling is [Monsoon](https://kwy404.github.io/monsoon/) 0.2.0 from the CDN, themed with
the Voodoo purple seed and a candle amber accent.

The concept is **magic, playground first**: the home page opens straight into a live split editor,
an `.html` file on the left and the running result on the right, with Vudu, the mascot, floating
beside it and sparkles when a spell is cast.

---

## Files

```
site/
  index.html               home: the spell book, then the sections
  learn.html               the 10 minute lesson: eight steps that check themselves
  playground.html          the full playground: five starters and the example library
  components.html          the built-in components (generated, see below)
  404.html                 the page GitHub Pages serves for a missing path
  favicon.svg              Vudu v2
  voodoo*.min.js           the library, copied from packages/voodoojs/dist
  robots.txt, sitemap.xml
  assets/
    site.css               the layer on top of Monsoon: palette, fonts, code frames,
                           Shiki colours, theme toggle icons, spell effects
    home.css, home.js      the home page and its v-spellbook directive
    i18n.js                the home page dictionaries (en, pt-BR, es, ko)
    learn*.js, learn.css   the lesson, its text in four languages and its styles
    seasons.js             the special dates; seasons-fx.js draws their particles
    seasons/<id>/          Vudu in costume, the hero garland and four icons per date
    playground*.js/.css    the playground and its examples
    art/                   icons.svg (sprite) and light/dark illustrations
    brand/vudu/            the mascot, copied from brand/mascot-v2
    og.png                 the social preview
  docs/                    the documentation (see below)
  examples/                thirteen standalone applications
  design-system/           the stylesheet the examples use
  promo/                   a timed launch piece, for screen recording
```

---

## Running it locally

From the repository root:

```bash
npm run build
node scripts/serve.mjs 5181
```

Open `http://localhost:5181/`. `scripts/serve.mjs` serves `site/` as the root, exactly what the
Pages workflow publishes, plus the `/brand` and `/packages` mounts the workflow copies in.

Monsoon is loaded from `https://cdn.jsdelivr.net/npm/monsooncss@0.2.0/dist/monsoon.min.css`. The
pages load Voodoo from the local `voodoo.full.min.js` next to them, never from the CDN, so the site
always runs the library that was just built; `npm run check:site` fails when the copies drift.
The example applications are the exception on purpose: they load the pinned CDN tag, so a file
copied out of `examples/` keeps working on its own.

---

## The scripts behind the site

All of them run from the repository root, and all of them are idempotent.

| Script | What it does |
| --- | --- |
| `node scripts/site-chrome.mjs` | Writes the shared header and footer between the `<!-- chrome:header -->`, `<!-- chrome:footer -->` and `<!-- chrome:credit -->` markers. `--check` reports drift. |
| `node scripts/components-page.mjs` | Regenerates `components.html` from `register()` in the library source. |
| `node scripts/highlight-site.mjs` | Pre-renders every `<pre data-lang>` sample with Shiki, VS Code Light+ and Dark+. `--check` needs no Shiki. |
| `node scripts/site-art.mjs` | Draws the arcane illustrations (light and dark) and the icon sprite. |
| `node scripts/stamp-version.mjs` | Stamps the version and the `?v=` content hash on every asset URL. |
| `npm run docs:index` | Regenerates the documentation search index. |

Shiki is not a dependency of this repository: `highlight-site.mjs` finds it through `SHIKI_PATH`
or a sibling checkout, and its output is committed, so CI never needs it. After editing a code
sample, or regenerating the components page, run it again.

---

## The documentation

`docs/` is the documentation in HTML. Each page is a static file with an
`<article class="doc-artigo">` inside, and `docs/assets/docs.js` builds the shell around it: the
header, the sidebar, the "On this page" index, the previous and next cards, the search dialog, the
code frames and the live examples.

**The menu is the single source of truth.** `NAVEGACAO`, at the top of `docs/assets/docs.js`,
defines which pages exist, in what order and in what group. A new page goes in in three steps:

1. add `{ id: 'guia/name', titulo: 'Page title' }` to the right group in `NAVEGACAO`;
2. create `docs/guia/name.html` by copying the head of a neighbouring page, changing the `<title>`,
   the description and the `canonical`;
3. run `npm run docs:index` and `node scripts/highlight-site.mjs site/docs`.

**Live examples** are `<div data-exemplo>` blocks with a `<pre data-lang="html">` inside. `docs.js`
copies the code into a frame with the library loaded, so what the page shows is exactly what the
code does. Things to watch:

- a custom tag needs an explicit closing tag: `<VInput ... />` closes nothing in HTML;
- the value of `v-data` is an expression, not a block: anything that needs `function` or `new`
  lives in a `<script>` in the example itself;
- the frame height is measured from the body, never from the root element, or it grows on every
  click. `npm run check:frame` pins that.

---

## Languages

The home page ships in English (the default), Brazilian Portuguese, Spanish and Korean.

- The text lives in `assets/i18n.js` and enters the library through `V.i18n({ ... })`.
- The HTML carries the English text as the real content of each tag and `v-t` swaps it at runtime,
  which serves readers without JavaScript and search engines alike.
- The choice persists in `localStorage` under `voodoo:locale`, and `lang` on `<html>` follows it.

---

## Special dates

`assets/seasons.js` picks a season from the visitor's local date and sets `data-season` on `<html>`:
New Year (Dec 30 to Jan 2), Carnival (the Saturday before Ash Wednesday through Ash Wednesday),
Easter (Good Friday to Sunday), Valentine's Day (Feb 14, and June 12 in Brazilian Portuguese), Festa
Junina or Midsummer (June 13 to 29), Halloween (Oct 24 to 31) and Christmas (Dec 18 to 26). Easter is
computed, never typed in.

- On the home page and the lesson Vudu wears a costume; every page with a hero gets a garland, three
  icons and, unless reduced motion is on, a light particle canvas that pauses off screen.
- A chip at the bottom right turns the season off, remembered per season in `localStorage`.
- `?season=halloween` previews a season, `?season=off` hides it.
- The art comes from `node scripts/site-seasons-art.mjs`, and `npm run test:seasons` tests the dates.

## Theme

Every page shares one theme, the one `V.theme` keeps: the `voodoo:theme` key in `localStorage`,
holding `light`, `dark` or `system`, and `data-theme` on `<html>` for an explicit choice. Monsoon
reads the same attribute, so the whole stylesheet follows it.

- Each page carries the same inline script at the top of `<head>`, which puts the saved choice on
  the root before the first paint.
- The header button is `v-theme-toggle.cycle`: system, light, dark. Its icon follows
  `data-voodoo-theme-mode`, which the library writes on the button. The documentation shell
  implements the same contract by hand.
- Every dark rule in `site.css` is written twice: under `prefers-color-scheme: dark` for
  `:root:not([data-theme="light"])`, and for `:root[data-theme="dark"]`.
- Artwork swaps with `.when-light` and `.when-dark`.

---

## Details worth knowing before you edit

**The library loads with `data-manual` on the home page.** The dictionaries and the `v-spellbook`
directive must be registered before the first render, so the order is the library, then
`assets/home.js`, then `assets/i18n.js`, which calls `V.start()` last.

**The `v-*` attributes disappear from the HTML** once Voodoo has processed an element. No CSS rule
can depend on `[v-...]`: use classes or `data-*`.

**Braces in text are expressions.** Voodoo does not interpolate inside `<pre>` and `<code>`, and
every code sample also carries `v-ignore`, so the Shiki spans are left alone.

**404.html** is served for a missing path at any depth, so it resolves its links through
`<base href="/Voodoo.js/">`, switched to `/` when the site is served from a root of its own.
