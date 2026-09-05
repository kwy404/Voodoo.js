---
name: Report a bug
about: Something does not work the way it should
title: ''
labels: bug
assignees: ''
---

## What happens

Describe the problem in a sentence or two.

## What you expected

Describe the correct behaviour.

## How to reproduce

Paste a single-page HTML file that reproduces it. The smaller the better.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js" defer></script>
</head>
<body>
  <div v-data="{ n: 0 }">
    <button v-click="n++">{ n }</button>
  </div>
</body>
</html>
```

A link to a live example works too. The
[playground](https://kwy404.github.io/Voodoo.js/playground.html) runs in the
browser with no account and no setup.

Steps, when the code alone does not make them obvious:

1. Open the page
2. Click on ...
3. Notice that ...

## Environment

- **Voodoo.js version:** (the value of `V.version` in the console)
- **Bundle:** core (`voodoo.core.min.js`), essential (`voodoo.min.js`) or full (`voodoo.full.min.js`)
- **Installed via:** CDN, npm or download
- **If npm:** which bundler, and which version
- **Browser and version:** (e.g. Chrome 131, Safari 17.4, Firefox 133)
- **Operating system:**
- **Device:** desktop or mobile

If your browser is older than the minimum in
[BROWSER_SUPPORT.md](https://github.com/kwy404/Voodoo.js/blob/main/BROWSER_SUPPORT.md),
say so here.

## Configuration

Paste anything you changed in `V.config`, or the attributes on the `<script>` tag:

```js
```

## Console output

Turn on the detailed warnings before reproducing:

```js
V.config.devtools = true;
```

or

```html
<script src="voodoo.min.js" data-devtools defer></script>
```

Paste any error or warning the browser console shows, including the ones that
start with `[Voodoo]`.

```
```

## Checks

- [ ] I tested against the latest version
- [ ] I searched for a similar issue before opening this one
- [ ] The example above reproduces it on a clean page, with no other scripts
- [ ] I turned on `V.config.devtools = true` and pasted the warnings it produced
- [ ] It also happens in a private window, with no extensions

---

Issues in Portuguese are welcome. English simply reaches more people who can
help.
