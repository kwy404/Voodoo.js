# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adopts [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.11.1] - 2026-09-04

### Fixed

- **A `{ const ... }` block above a table works.** 0.11.0 taught JSX regions to
  survive a table, and this is the case it still got wrong: the block and the
  table's own expression end up in a single text node, because foster parenting
  moves `{rows.map(r => ( ))}` out of the `tbody` and the browser joins it onto
  whatever text is already there.

  The block reader tested "starts with `{` and ends with `}`", which that merged
  node satisfies, so it swallowed the map along with the declarations and
  neither one ran. It takes only the first balanced group now, respecting
  strings, and leaves the rest of the node behind for the region pass. Both
  forms are verified in a browser: the table with `v-data` and the table with
  the data in a `const` block.

- **The README that ships to npm carries the right version.** Stamping happens
  during the release, before the version reaches the registry, so the pin guard
  correctly refused to move it and the tarball went out pointing at the previous
  line. The npm page for 0.11.0 told everyone to load 0.10, and every release
  before it had the same fault.

  Files that ship in the tarball now pin unconditionally. The guard is right for
  a page on GitHub Pages, which goes live immediately and must not name a
  version the CDN cannot serve; it is wrong for a file that only becomes visible
  by being published, where the version is guaranteed to exist by the time
  anyone reads it. `packages/cli/README.md` was never stamped at all and is now.

Full notes: [v0.11.1](https://github.com/kwy404/Voodoo.js/releases/tag/v0.11.1)

## [0.11.0] - 2026-09-04

**A JSX region works inside a table.** This was reported as broken, then written
off as impossible, and it was neither.

```html
<table>
  <tbody>
    {rows.map(r => (
      <tr>
        <td>{r.name}</td>
        <td>{r.score >= 60 ? <b>pass</b> : <b>fail</b>}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Added

- **Recovery from foster parenting.** Loose text is not allowed inside `<table>`
  or `<tbody>`, so the HTML parser moves it out and keeps the elements in. The
  text and its template land in different parents, which is why the sibling walk
  found a balanced region with nothing in it and declined, leaving the raw
  expression printed above the table.

  Nothing is lost, though, only moved, and moved predictably: the text keeps the
  empty parentheses where the element used to be, and the element is in the
  table alongside. Matching one against the other puts the expression back
  together, and the rendered rows are anchored in the `tbody` where they belong
  rather than beside the table, where a `<tr>` is dropped by the browser.

  The rule is deliberately narrow, because guessing would silently claim rows
  somebody wrote by hand. The region must be balanced, contain no element of its
  own, sit next to a table, and have exactly as many empty `()` groups as that
  table has `tbody` rows. A `thead` row is never taken.

  Both foster-parenting orders are accepted. The specification says the text is
  inserted immediately before the table, which is what Chrome does; jsdom puts
  it after and splits it into fragments. Neither is worth depending on.

- Three playground examples for it: the same table with `v-data`, the same table
  with the data declared in a `{ const ... }` block and no attribute anywhere,
  and the same idea as a plain list. Seventeen JSX examples in total.

### Known limitations

- A JSX region inside a `v-for` template does not render. The template is cloned
  once per row during the walk, and regions are taken out of the page before it,
  so each clone receives an anchor with nothing attached. Use `v-if` on the
  element, or a JSX region instead of `v-for`, not both on the same subtree.
- The nested-region-inside-a-recovered-row case is verified in a browser and
  skipped in the unit suite, because jsdom's non-conforming foster parenting
  cannot express it. Contorting the test to match jsdom would test jsdom.

Full notes: [v0.11.0](https://github.com/kwy404/Voodoo.js/releases/tag/v0.11.0)

## [0.10.1] - 2026-09-04

### Fixed

- **JSX works on a page that calls `V.start()` itself.** The two passes lived in
  `bootstrap.ts`, which returns early when the script tag carries `data-manual`,
  so any page that configures the library and starts it by hand got no JSX at
  all. The project's own playground does exactly that, and rendered every JSX
  example as literal text while correctly reporting version 0.10.0.

  They hook into `start` now, through an `onStart` registry in
  `runtime/walker.ts`. That is the only place both sides of the walk are
  guaranteed to run, whoever called it. A registry rather than a direct call,
  because `start` is core and JSX is only in the full build.

### Changed

- The core build's size budget moves from 47 KB to 48 KB gzipped. This is
  deliberate growth being paid for rather than a limit being dodged: between
  0.9.0 and 0.10.0 the expression language gained `new`, `delete`, octal
  literals, six bitwise operators, three shifts, `return`, and default, rest and
  destructured parameters, taking the core from 46.03 to 47.01. The differential
  suite records what that bought, with expressions answering differently from
  JavaScript going from 4 to 0 and unparseable valid JavaScript from 234 to 3.
  Compacting the new registry saved almost nothing, so the honest entry is that
  the feature costs what it costs.

Full notes: [v0.10.1](https://github.com/kwy404/Voodoo.js/releases/tag/v0.10.1)

## [0.10.0] - 2026-09-04

**JSX written directly in ordinary HTML, with no build step and no compiler.**

```html
<ul>
  {fruits.map((fruit) => (
    <li>{fruit}</li>
  ))}
</ul>
```

That is a plain `.html` file with a script tag. Every other way to write JSX
needs a toolchain between the file you edit and the file the browser loads.

### Added

- **The `jsx` module**, in the full build. It costs about 1 KB gzipped.

  It works because the browser has already parsed the page and what it leaves
  behind is recoverable. For that list the DOM is three siblings: the text
  `{fruits.map((fruit) => (`, the element `<li>{fruit}</li>`, and the text
  `))}`. The element is not damage to route around, it is the template.
  Rejoining the text with a placeholder where the element sat reconstructs the
  expression exactly as it was typed, and it then runs through the same lexer,
  parser and interpreter as every other expression. Nothing is compiled and
  nothing is evaluated as a string, so a strict Content Security Policy is
  unaffected.

  Verified in a browser: `map`, `filter` into `map`, `sort`, `slice`, `flatMap`,
  `reduce` with a block body, `Array.from`, `Object.entries`, destructured
  parameters with renaming, optional chaining with `??`, template literals, an
  IIFE, ternaries inside a `map`, and nested maps two levels deep.

- **Conditionals that return elements**, including one JSX itself does not have:
  a real `if / else if / else`. Ternaries and `&&` behave as they do in JSX,
  down to rendering nothing for `true`, `false`, `null` and `undefined`.

- **`return` in the expression language.** `x => { const d = x * 2; return d }`
  used to report `"return" was not found. Expressions cannot reach window`,
  which is a baffling thing to be told about a keyword.

- `V.jsx()`, `V.extractJsx()` and `V.activateJsx()`, plus ten JSX examples in the
  playground, in a group of their own at the top of the list.

### Fixed

- **The two-phase ordering, which is the whole design.** Templates leave the
  document before `V.start()` and the effects are created after it. Getting
  either half wrong produced a distinct failure, and each was found in a browser
  rather than reasoned about: running late meant the core walked a template,
  failed on the callback parameter with `Could not read "n" from undefined`, and
  rewrote the text in place, so every clone taken afterwards was poisoned and a
  counter read `c=0` forever; running both at once meant every region captured
  the root scope, where the names do not exist, and every list rendered empty.

- **`return` unwinds.** The first version yielded its value without unwinding,
  so `if (q === 0) { return 'empty' } return 'ok'` answered "ok" for every item.
  A wrong answer with no error is worse than the missing keyword was. It travels
  as a signal now, unwrapped at the function boundary and at the region
  boundary; the second of those is why a top-level
  `{if (a) return (<p>x</p>)}` had been rendering `[object Object]`.

- **One failing region no longer takes the rest of the page with it.** The
  activation loop had no guard, so the first expression that threw ended it and
  every region after that silently never rendered: two lists worked and the next
  fourteen were empty, with one unrelated error in the console.

- **A `map` inside a `map`.** A clone is not in the document when its own
  regions activate, so the scope walk reached nothing and fell back to the root.
  Every outer element rendered with its inner list missing.

- `collect` called `splitText` on every `{` it examined, including the plain
  interpolations it went on to decline, so `<li>{p.n}: {p.q}</li>` came out empty
  because its text node had been cut in half behind the core renderer's back.

### Known limitations

Stated rather than left to be discovered.

- **Attribute values must be quoted.** `style="{{ backgroundColor: color }}"`
  works and `style={{ backgroundColor: color }}` does not. This is the order
  things happen in, not a decision: an unquoted attribute value ends at the
  first space, so the browser turns the second form into six separate attributes
  before any script has run, lowercasing their names on the way. The pieces
  survive in order and could be rejoined, but `backgroundColor` comes back as
  `backgroundcolor` and any identifier with a capital in it is gone.
- **Fragments (`<>`) do not work.** The browser creates no element for `<>`, so
  there is no template to clone.
- **`for`, `while`, `do`/`while`, `break` and `continue` are not supported** in a
  region. The expression language has no loop statements. Use `map`, or
  `Array.from({ length: n })`.
- `forEach` renders nothing, because `forEach` returns `undefined`. That is
  JavaScript, and it is equally true in React.

Full notes: [v0.10.0](https://github.com/kwy404/Voodoo.js/releases/tag/v0.10.0)

## [0.9.0] - 2026-09-04

**The expression language stops disagreeing with JavaScript.**

Measured, not asserted. A differential suite runs 2324 expressions twice, once
through the interpreter and once through the host engine over identical inputs,
and compares.

| | 0.8.0 | 0.9.0 |
| --- | ---: | ---: |
| answers differently from JavaScript | 4 | **0** |
| valid JavaScript it will not parse | 234 | **3** |
| matching | 2075 | **2310** |

### Fixed

Four silent wrong answers, which is the dangerous kind: no error, just the wrong
value.

- **`new` did not exist**, in the lexer, the parser or the interpreter. So
  `new Date(0)` lexed as the identifier `new` followed by `Date(0)`, and `Date()`
  called without `new` returns a string of the current time. `new Date(0)` gave
  today's date as text, `new Date(0) instanceof Date` was `false`, and
  `new Date(0).getTime()` failed with "getTime is not a function". It works now,
  including `new a.b.C(x)`, where the argument list binds to the `new` rather
  than to a call. Constructors resolve exactly like any other value, so `new`
  reaches nothing an expression could not already reach, and `Function` is
  refused outright.
- **`0o17` was `undefined`**, not 15. Octal was the one radix the lexer never
  learned: it read `0`, stopped at the `o`, and left `o17` behind as an
  identifier.
- **`delete obj.a` returned `1`**, the value of the property, and deleted
  nothing. Reactivity came with the fix for free, because the reactive proxy
  already implements `deleteProperty`.

### Added

- **Bitwise operators and shifts.** 216 of the 234 gaps were this one thing: the
  lexer knew `<<=`, `>>=` and `>>>=` but not `<<`, `>>`, `>>>`, `&`, `|`, `^` or
  `~`, so `x <<= 1` parsed and `1 << 4` did not. All present, with JavaScript's
  precedence, including the wart where `&` binds looser than `===`.
- **Function parameter forms.** Arrows only accepted plain names, so
  `people.map(({ name }) => name)`, `((x = 1) => x)()`, `((...xs) => xs)(1, 2)`
  and `(([a, b]) => a + b)([1, 2])` all failed to parse. All work now, nested to
  any depth, on arrow functions and on object methods declared in `v-data`.
- `npm run conformance` and `npm run check:conformance`, which fail when a bug or
  a gap appears that was not there before.
- `npm run release`, which attaches the built bundles to the GitHub release.
  Releases v0.4.4 through v0.8.0 shipped with nothing but GitHub's source
  archives, so a release page had no `voodoo.min.js` on it.
- `voodoojs-cli` has a README, so its npm page is no longer blank.

### Known limitations

Three expressions of 2324, listed rather than hidden: `s.match(/l+/)` and
`s.search(/l/)` need regex literals, which the core build has no room for at
46.9 KB against a 47 KB ceiling; and `(1, 2, 3)`, the comma operator inside
parentheses. Note that `@click="a++, b++"` already works.

Full notes: [v0.9.0](https://github.com/kwy404/Voodoo.js/releases/tag/v0.9.0)

## [0.8.0] - 2026-09-04

A minor, because the inspector shortcut changed and a configuration option was
added.

### Fixed

- **The devtools shortcut works.** It never did. `enableXrayShortcut` was only
  ever called from inside `V.xray()`, so the listener came into existence only
  after somebody had already opened the inspector some other way. On every
  ordinary page, including this project's own site, pressing the documented keys
  did nothing, because nothing was listening. Verified in a browser before and
  after: on the landing page `V.config.devtools` is `false`, the script tag
  carries no `data-devtools`, and no keydown handler existed.

  The full build now installs it at startup, whether or not devtools were asked
  for. A page that loaded the full build has already shipped the inspector, so
  the cost is one listener that does nothing until the keys are pressed.

- **`V.config.xrayShortcut` can be changed after startup.** The listener read
  the setting once, when it was installed, so assigning a new combination later
  silently did nothing. It reads the setting on each press now.

### Changed

- **The shortcut is `Ctrl+Shift+F2`, and configurable.** This is the third
  default. `Ctrl+Shift+X` closes the tab in Opera. `Alt+Shift+V` replaced it and
  was worse: Alt+Shift is the Windows keyboard layout switcher, so on a machine
  with more than one layout installed the operating system takes the keys before
  the page sees them. `Ctrl+Alt` was never available either, being AltGr on the
  Brazilian ABNT2 layout and most European ones.

  The Windows layout switcher fires on Ctrl+Shift pressed and released with no
  other key, so a function key takes the combination out of contention, and no
  browser claims Ctrl+Shift+F2.

  No combination is free everywhere, which is the actual lesson after three
  attempts, so it is now a setting: `data-xray-shortcut="alt+shift+d"` on the
  script tag, or `V.config.xrayShortcut`, and `false` installs nothing.

- The shortcut matches the **physical** key through `event.code`, so it behaves
  the same on every keyboard layout rather than on the character a layout
  happens to compose.

### Added

- `xrayShortcut` in `V.config`, and `data-xray-shortcut` on the script tag.
- Both READMEs document how to turn the inspector on, with a complete page
  someone can save and open. `data-devtools` is explained as what it actually
  is, a separate switch for verbose console warnings and the on-screen widget,
  not a requirement for the shortcut.
- Eight tests in `test/devtools-shortcut.test.ts`. Five of them fail against the
  previous code, including the one that matters: pressing the keys on a page
  that never asked for devtools. The three that still pass are the negative
  cases, which pass trivially when no listener exists at all, and that is worth
  knowing about them.

## [Unreleased before 0.8.0]

Nothing here changed the library. This was the repository, the site and the
documentation.

### Fixed

- **The CLI is published under a name that is actually ours.** It was called
  `@voodoo/cli`, which was never published, and every README and doc told people
  to run `npx voodoo`. That name belongs to an unrelated, abandoned 2012 package
  on npm, so anyone following the instructions downloaded a stranger's code and got
  `TypeError: path.existsSync is not a function` from a Node API removed years
  ago. The package is now `voodoojs-cli`, matching `voodoojs` on the registry,
  and the command is `npx voodoojs-cli`. Verified by packing the tarball and
  running `init` from it before any of this was written down.
- The CLI speaks English. Its output was Portuguese, including the `info` table
  headings, which are user-facing because `console.table` draws object keys as
  column titles.
- `packages/cli/package.json` listed a `templates` directory in `files` that does
  not exist.


- **The documentation's live example cards stop growing.** Reported three times,
  disclosed as unfixed in 0.7.0, and now understood. The frame measured
  `Math.max(body.scrollHeight, documentElement.scrollHeight)`, and the second of
  those is an echo: the frame is a grid item stretched by the code pane beside
  it, so the inner document's root element fills whatever height the frame was
  last given and reports it straight back. Each pass therefore read the previous
  measurement, added the 8px margin, and wrote a frame 8px taller. Measured on
  the events page: an unchanging counter whose content is 108px sat in a frame
  that climbed from 144px to 192px over twelve clicks. It now measures the body
  alone, which is content-driven and cannot echo, and sits at 116px however long
  anyone clicks.

  The previous attempt collapsed the frame to `0px` before measuring. That never
  worked: the frame carries `min-height: 8rem` and is stretched by its grid row
  regardless, so `offsetHeight` stayed at 192 throughout. The fix looked right
  and changed nothing.

  `npm run check:frame` pins it, and fails against the old code by climbing from
  136px to 288px. The first version of that check passed against the old code,
  because its mock let the collapse succeed; a check that cannot fail is worse
  than no check, so the mock now models the echo the browser actually showed.

### Changed

- **English is the repository's language, and now the repository agrees.** The
  rule was already written down, and 50 of 150 source files, 11 of 44
  documentation pages, both issue templates, the pull request template and both
  CI workflows had not followed it. `CONTRACT.md`, the document a new
  contributor reads before writing a module, still instructed them to write
  their comments in Portuguese.
- `CONTRACT.md` rewritten. It listed 15 modules of the 58 that exist, and gave
  the directive priorities with `MODEL` above `BIND`, which is backwards: `BIND`
  is 45 and `MODEL` is 40, and the order is load-bearing, because a field that
  receives its value before its `:min` and `:step` are applied gets silently
  rounded by the browser.
- The issue and pull request templates point at the published site rather than
  at the markdown tree, and ask for the check that catches most of what has
  gone wrong here: run a new regression test against the unfixed code and watch
  it fail first.

### Added

- `npm run check:lang:docs` and `npm run check:lang:src`, which fail when
  documentation or source comments are not in English. The `lang` attribute was
  no use for this: it said `pt-BR` on eleven pages while being wrong in both
  directions elsewhere, so both checks read the prose instead.
- `npm run check:frame`, `npm run check:version` and `npm run check:links` now
  run in CI, in a job separate from the test matrix.

## [0.7.0] - 2026-09-03

A minor rather than a patch, because a documented keyboard shortcut changed.

### Changed

- **The devtools shortcut is `Alt+Shift+V`, not `Ctrl+Shift+X`.** Opera closes
  the tab with Ctrl+Shift+X, and browsers claim most of that range for
  themselves; a shortcut the browser gets to first is not a shortcut. It is
  matched on `event.code` as well as `event.key`, because Alt composes a
  different character on some layouts. Changed everywhere it is documented, not
  only where it is implemented.

### Fixed

- The documentation's live-example frames paint their own background. They were
  transparent, so their text was drawn with the frame's `--ink` over the card's
  background, and those two resolve their themes separately: when they disagreed
  the result was dark text on a dark card.
- The theme toggle inside those frames does something. They styled themselves
  from `data-tema`, which the shell stamps, while the library writes
  `data-theme` when something inside the frame changes it — so the
  `v-theme-toggle` example flipped a state nothing was listening to.

### Internal

- Site asset URLs are keyed on a content hash rather than the package version.
  Assets change between releases: docs.js was fixed three times inside 0.6.2 and
  kept the URL `?v=0.6.2` throughout, so nobody who had already loaded a page
  received any of it. Each fix was deployed, verified on the server, and
  correctly reported as still broken by someone whose browser held an older copy.
- CI downloads the browser before running the browser suite. Without it all 53
  specs failed with "Executable doesn't exist" and the quality report scored that
  check 2.0 — red for a reason unrelated to any change, which trains everyone to
  scroll past it.


## [0.6.2] - 2026-09-03

### Fixed

- **The router fallback no longer navigates the page away.** 0.6.1 stopped the
  router throwing in a document with an opaque origin, but the fallback it added
  called `location.replace(url)` for a replacing navigation. `buildUrl` returns
  pathname + search + hash, and in an `about:srcdoc` document `location.pathname`
  is the bare string `srcdoc`, which resolves against the parent: the frame left
  for `/docs/guia/srcdoc` and the live example was replaced by a 404 page. An
  exception was bad; walking off the page was worse.

  The fallback now touches the hash and nothing else. Replace semantics cannot be
  honoured in a document that refuses the History API, and one extra history
  entry is a lesser wrong than leaving the page.

- Nine browser tests cover this, in a real Chromium against a real
  `about:srcdoc` frame, and all nine fail against 0.6.1. They live in the browser
  suite because neither bug is reachable from jsdom: it has no opaque origins, so
  `pushState` never refuses, and `location.replace` is a no-op there, so the
  escape cannot happen either. A jsdom test for either passes whether the fix is
  present or not, which is worse than no test.

### Changed

- The published package README is no longer a stub. It carries the site links,
  the component list, the benchmark table with its honest reading, and the CSP
  and attribute-cleanup properties that are the reasons to pick this over the
  alternatives.


## [0.6.1] - 2026-09-03

### Fixed

- **The router no longer throws where the History API is refused**
  ([#2](https://github.com/kwy404/Voodoo.js/issues/2)). A document with an opaque
  origin — `about:srcdoc`, or a sandboxed iframe without `allow-same-origin` —
  raises `SecurityError` from `pushState` for any URL at all, including one that
  only changes the hash. The call was unconditional in both modes, so the first
  navigation threw and nothing moved. The documentation's own live examples run
  in exactly that kind of frame, which is where it was reported.

  Navigation never needed the History API. In hash mode the hash is now written
  directly, which an opaque document does allow, with the resulting `hashchange`
  suppressed so the transition does not run twice. In history mode the route
  still resolves and renders and only the address bar stays behind: a worse URL
  rather than a broken page. The refusal is asked once and remembered, since it
  is a property of the document, and forgotten by `stopRouter()`.

  Only `SecurityError` is treated as a refusal. Any other failure is a bug and
  is still thrown.

### Internal

- `scripts/check-refs.mjs` was silently checking half of what it claimed. Its
  pattern demanded a quote straight after the path, so once `stamp-version.mjs`
  appended `?v=` to every asset the count fell from 180 to 94 and it still
  reported zero broken. A check that fails quietly while saying yes is worse
  than no check.
- `.claude/` is untracked and ignored.


## [0.6.0] - 2026-09-02

A minor rather than a patch, because the default validation messages changed
language. Anything else here is a fix.

### Changed

- **The default validation messages are English.** They were Portuguese, which
  made them the one part of the library speaking a language the rest of it does
  not: a form built anywhere answered "Informe um e-mail valido". All 33 moved,
  along with the chart series label that defaulted to "Valor". The rule names
  `cpf`, `cnpj` and `cep` are untouched — those are Brazilian document formats
  and the names are API; only their text changed. Nothing is fixed in place: the
  `messages` object is exported and writable, and the i18n module translates
  `validation.<rule>`, so a Portuguese page restores its own wording in a line.
- The last Portuguese identifiers left the source: 68 of them across nine files,
  the devtools launcher holding most.

### Fixed

- **`theme.init()` no longer throws where `matchMedia` is absent.**
  `matchMedia?.(...)` reads as a guard and is not one: optional chaining protects
  against a null or undefined value, never against an identifier that was never
  declared. In jsdom, older webviews and some embedded browsers the bare name
  raised a ReferenceError and took the whole of init() with it, so the library
  did not start at all.
- **A chart fits the element it was given.** `draw()` measured the host for width
  but took a per-type constant of 260px for height, so a `<div v-chart>` with a
  150px height produced a 260px SVG that overflowed by 110px. Nothing clipped it,
  so stacked charts painted over each other.
- **A theme choice applies even where it cannot be persisted.** `storage`
  swallows its own failures, which is right, but the choice was discarded with
  them: `set()` wrote nothing, `chosen` stayed false, and `apply()` returned
  without touching the document. A `v-theme-toggle` inside a sandboxed iframe did
  nothing at all, silently.
- **`v-modal-content` is hidden again when the modal closes.** `dialog.ts` re-hid
  the adopted element only if the attribute was still present, but
  `cleanAttributes` strips every `v-*` attribute as soon as the directives
  install, so the condition never held. It asks the directive index now. The
  browser test that recorded this at full strength is un-marked: all 44 pass.

### Site

Published at [kwy404.github.io/Voodoo.js](https://kwy404.github.io/Voodoo.js/),
and built with the framework itself.

- A **playground** with an editor, a live preview and 26 examples, each one
  verified to render and to survive being clicked.
- A **component gallery** generated from the source, so it cannot drift from the
  API it documents. All 29 run on the page above the markup that produced them.
- The **examples and the design system moved inside `site/`**, so the repository
  and the thing it publishes finally agree. A link written as `examples/` used to
  resolve in production and 404 on disk.
- `scripts/check-refs.mjs` resolves every relative href and src and fails on the
  dead ones — written after that move silently unstyled eleven pages.


## [0.5.0] - 2026-09-02

First release published to the npm registry, as
[`voodoojs`](https://www.npmjs.com/package/voodoojs).

Versions 0.2.0 through 0.4.6 shipped as GitHub releases and were never written down here. This
entry covers the work in 0.5.0 only; the gap is left visible rather than reconstructed from memory.

### Added

- Published to npm. `npm install voodoojs`, or a script tag from
  `https://cdn.jsdelivr.net/npm/voodoojs@0.5/dist/voodoo.min.js`.
- 44 browser tests running in real Chromium via Playwright, covering what jsdom structurally
  cannot: hit-tested clicks against real layout, `v-for` node identity proven with external
  expandos, the modal focus trap (jsdom reports every element as zero-sized, so the trap could
  never be exercised there), and a CSP suite that loads the framework under
  `script-src 'self'` with no `unsafe-eval` and asserts zero policy violations.
- `scripts/chart-comparison.mjs` draws the benchmark chart directly from the benchmark JSON, so
  the picture can no longer drift from the table beside it.

### Changed

- **Performance.** Creating a 1,000-row keyed list is **36.2% faster** and clearing one is **44.6%
  faster**, measured with a paired harness that loads both builds in one process and interleaves
  their samples. Against other frameworks Voodoo moved from sixth of seven to third on create, and
  from last to fourth on clear. Update is unchanged; an earlier apparent gain there was noise.
  - `collectDirectives` and `stripAttributes` read `getAttributeNames()` instead of indexing the
    live `attributes` collection.
  - `v-for` strips the key attribute from its row template, so clones stop parsing an attribute
    only to no-op on it.
  - Reactive class fields are declared rather than emitted as `Object.defineProperty` calls under
    `useDefineForClassFields` — 33 of those per list row, in the shipped bundles.
  - A directive builds its `EffectScope` only when something needs one.
  - Six other optimisations were measured, found to sit inside the noise floor, and reverted. They
    are listed in `benchmarks/reports/comparison.md` alongside the ones that worked.
- The `voodoo.core.min.js` gzip budget moved from 46 KB to 47 KB. The reason is recorded in
  `scripts/size.mjs`: the performance work had spent the last of its headroom, and a zero-headroom
  budget was about to block a one-line accessibility fix over ten gzipped bytes.

### Fixed

- **Accessibility**, from 5.3/10 to 10/10 on the project's own scorecard. Drawers take their
  accessible name from a heading inside the panel and settle without animation under
  `prefers-reduced-motion`; dropdown items and triggers respond to Enter and Space; tooltips
  reach keyboard and touch users, not only a hovering mouse; tablists declare their orientation
  and their arrow keys follow it; accordion panels become labelled regions; the command palette
  traps focus against script and pointer escapes, not just Tab; toasts announce as a unit with
  `aria-atomic`, which the alert pattern requires because the body is replaced whole on update.
- `packages/voodoojs/src/runtime/walker.ts` held a raw NUL byte inside the `parseAttribute` cache
  key, which made git treat a TypeScript file as binary and undiffable. It is written as the ``
  escape now, producing a byte-identical string.
- `scripts/quality/browser.mjs` asserted at `waitUntil: 'load'`, before the boot loop mounts. No
  runner had ever been installed, so the check had never once executed; installing Playwright
  turned it straight from SKIP to FAIL against a correct build.

### Known issues

- `v-modal-content` stays visible in the page after the modal closes. `dialog.ts` re-hides the
  adopted element only when the `v-modal-content` attribute is still present, but
  `config.cleanAttributes` strips every `v-*` attribute right after the directives install, so the
  condition never holds. Recorded as a full-strength failing browser test rather than skipped.


## [0.1.0] - 2026-08-28

First public release. Everything below is included in this version.

### Added

#### Reactive Core

- `reactive`, `ref`, `shallowRef`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`,
  `flushSync`, `stop`, `toRaw`, `markRaw`, `unref`, `isReactive`, and `EffectScope`.
- Key-based dependency tracking with Proxy and microtask scheduling.
- Infinite loop detection that breaks the loop with a warning instead of freezing the page.
- Global error handler with `V.onError`.

#### Expressions

- Custom lexer, Pratt parser, and tree interpreter. No `eval` or `new Function`,
  allowing it to run with restrictive Content Security Policy.
- Support for literals, template literals, spread, optional chaining, arrow functions,
  ternary, compound assignment, increment, and sequences.
- Closed list of allowed globals, extensible via `V.config.globals`.
- Parse cache per expression.
- Text interpolation with single-brace `{ value }`, also accepting double-brace syntax.

#### Essential Directives

- `v-text`, `v-html`, `v-show`, `v-if`, `v-else-if`, `v-else`, `v-for`, `v-bind`, `v-class`,
  `v-style`, `v-on`, `v-model`, `v-init`, `v-ref`, `v-effect`, `v-watch`, `v-cloak`, `v-once`,
  `v-teleport`, `v-transition`, `v-ignore`, `v-pre`, `v-data`, and `v-component`.
- Shortcuts: `:attribute`, `@event`, `.property`, and event directives by name from
  `v-click` through `v-drop`.
- Event modifiers: `prevent`, `stop`, `self`, `once`, `capture`, `passive`, `window`,
  `document`, `outside`, `debounce`, `throttle`, keys, and system keys.
- Synthetic events: `hold`, `outside`, `visible`, `swipeleft`, `swiperight`, `swipeup`, and
  `swipedown`.
- Event aliases: `hover`, `unhover`, `tap`, `press`, `release`, `rightclick`, `type`,
  `enterkey`, and `submitform`.
- Element reuse in `v-for` by `:key`, with cursor-based reordering.

#### Runtime

- Walker with directive priority, terminal directives, and DOM observation via
  `MutationObserver`.
- Automatic cleanup of effects, listeners, and observers when a node is removed.
- **Cleanup of `v-*` attributes after rendering**, controlled by
  `V.config.cleanAttributes`, with internal indexing so directives can still find them.
- Configuration via `<script>` tag: `data-manual`, `data-prefix`, `data-base-url`, `data-locale`,
  `data-devtools`, `data-no-styles`, `data-no-observer`, and `data-keep-attributes`.

#### Components

- `V.component` with typed props, `state`, `computed`, `methods`, `watch`, `template`, `style`,
  named slots, `emit`, and full lifecycle.
- Three ways to mount: `v-component`, registered tag, and PascalCase tag.
- Scope isolation by default, with `inheritScope` to inherit from parent.

#### State

- `V.data` for root scope and `V.store` for named stores, with optional persistence.
- `v-persist`, which stores the scope in `localStorage`.
- `v-sync`, which syncs scope across tabs via `BroadcastChannel`.
- `v-history`, `v-undo`, and `v-redo`, with the controller exposed as `$history`.
- `v-storage`, which binds an isolated field to `localStorage`.
- Global event bus with `V.on`, `V.once`, `V.off`, and `V.emit`.

#### HTTP

- `V.http` client over `fetch`, with interceptors, timeout, exponential backoff retry,
  response caching, cancellation, upload with progress, Server-Sent Events, streaming reads,
  and offline queue.
- Automatic CSRF token submission from meta tag.
- Directives `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, `v-load`, `v-load-visible`,
  `v-search`, and `v-resource`.
- Configuration attributes: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-params`, `v-body`,
  `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-as`, `v-json-path`, `v-template`,
  `v-offline-queue`, `v-min-length`, `v-scroll-to`, `v-manual`, `v-debounce`, `v-redirect`,
  `v-loading`, `v-loading-class`, `v-disable-loading`, `v-toast-success`, `v-toast-error`,
  `v-on-success`, `v-on-error`, and `v-on-complete`.
- Automatic JSON rendering as table or definition list, with full escaping.
- Automatic cancellation of the previous request from the same element.

#### Forms

- `v-submit`, with nested field serialization, AJAX submission, loading state,
  redirection, HTML swap, and server error handling.
- Reactive state in `$form`, with `loading`, `saving`, `success`, `errors`, `message`, `data`,
  `status`, `dirty`, and `progress`.
- `v-upload` and `v-dropzone`, with real progress bar and keyboard accessibility.
- `v-autosave`, with state indicator.
- `v-guard`, which warns before leaving the page with unsaved changes.

#### Validation

- Engine with 29 rules: `required`, `email`, `url`, `number`, `integer`, `decimal`, `alpha`,
  `alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `same`, `different`,
  `regex`, `date`, `after`, `before`, `accepted`, `in`, `notin`, `phone`, `cpf`, `cnpj`, `cep`,
  `creditcard`, `strongpassword`, and `unique`.
- Real verification digit calculation for CPF and CNPJ, and Luhn algorithm for cards.
- Async validation, with the `unique` rule checking the server.
- Custom rules with `V.validator`, which create the `v-validate-<name>` directive automatically.
- Portuguese messages, configurable via `V.messages` and `v-error-message`.
- Automatic error presentation with `aria-invalid`, `aria-describedby`, `role="alert"`, and
  focus on the first problematic field.

#### Masks

- Named masks: `cpf`, `cnpj`, `cpfcnpj`, `cep`, `phone`, `date`, `time`, `datetime`,
  `currency`, `percent`, `card`, `cvv`, `plate`, `hex`, and `ip`.
- Pattern-based masking with tokens `9`, `A`, `S`, `*`, and escape.
- `v-mask` and `v-mask-currency`, with cursor position preservation and smart deletion
  over separators.
- `.unmask` modifier, which delivers the clean value to `v-model`.
- `V.registerMask` for custom masks.

#### UI

- `v-toggle`, `v-collapse`, `v-collapse-toggle`, `v-dropdown`, `v-dropdown-menu`, `v-popover`,
  `v-tooltip`, `v-tabs`, `v-accordion`, `v-drawer`, `v-offcanvas`, `v-modal`, `v-confirm`,
  `v-theme-toggle`, `v-focus`, `v-focus-trap`, `v-click-outside`, `v-escape`, `v-hotkey`,
  `v-scroll-to`, `v-scrollspy`, `v-sticky`, `v-visible`, `v-infinite-scroll`, `v-lazy-src`,
  `v-lazy-bg`, `v-skeleton`, `v-copy`, `v-copy-from`, `v-print`, `v-share`, `v-download`,
  `v-fullscreen`, `v-resizable`, `v-command`, `v-command-item`, `v-idle`, `v-online`, and
  `v-offline`.
- Notifications with queue, pause on hover, progress bar, action, and promise support.
- Accessible dialogs: `modal`, `alert`, `confirm`, `prompt`, and `dialog`, with stacking, focus
  trapping, and focus restoration.
- Command palette with accent-insensitive search and keyboard navigation.
- Global keyboard shortcuts with `V.hotkey`, understanding `mod` as Command on macOS.
- Floating positioning that flips sides when it doesn't fit and never leaves the screen.

#### Drag and Drop

- `v-sortable`, `v-draggable`, `v-droppable`, and `v-dnd-group`, built on pointer events,
  working with mouse, pen, and touch.
- Full keyboard drag, with announcement in `aria-live` region.
- Groups, selector filter, drag handle, axis lock, and auto-scroll.

#### Theme and Palette

- Light and dark theme with `V.theme`, applied before first render.
- `V.palette`, which generates 50–900 scales in OKLCH, dark version, and highest-contrast text
  color, with five ready presets.
- `--v-*` CSS tokens used by all components.
- Color utilities: scale, WCAG contrast, luminance, and conversions between sRGB and OKLCH.

#### Chainable DOM

- `V(selector)` with traversal, content, attributes, classes, styles, structure, events with
  delegation, effects, form serialization, and runtime integration.

#### Full Build

- **Charts** in pure SVG, with 11 types, clickable legend, tooltip, responsiveness via
  `ResizeObserver`, and accessible description generated from data.
- **Animations** with shared loop, tween and real spring physics, nine presets, eight curves,
  `stagger`, `inView`, `scrollProgress`, plus `v-motion`, `v-motion-scroll`,
  `v-motion-stagger`, `v-motion-hover`, `v-motion-tap`, `v-parallax`, `v-flip`, `v-count`, and
  `v-typewriter`.
- **Single-page router** with `history` and `hash` modes, required and optional parameters, wildcard,
  global and per-route guards, scroll control, per-route title, View Transitions, and directives
  `v-router-view`, `v-link`, and `v-route-active`.
- **Internationalization** with reactive translation, CLDR pluralization, lazy loading, number, currency,
  date, and relative time formatters, and directives `v-t`, `v-t-params`, and `v-locale`.
- **xray inspector**, which outlines elements with directives, shows scopes, components, stores,
  events, network, and performance, and flashes elements on every reactive update.
- **29 ready-made components**: `VButton`, `VIconButton`, `VCard`, `VLabel`, `VField`, `VInput`,
  `VTextarea`, `VSelect`, `VCheckbox`, `VRadio`, `VSwitch`, `VBadge`, `VTag`, `VAlert`,
  `VAvatar`, `VSpinner`, `VSkeleton`, `VProgress`, `VDivider`, `VTable`, `VPagination`,
  `VBreadcrumb`, `VStat`, `VEmptyState`, `VTimeline`, `VSteps`, `VRating`, `VTooltipButton`, and
  `VCodeBlock`.

#### Tooling

- Two browser bundles: essential and full, both publishing `window.V`.
- ESM, CJS, and TypeScript types builds, with dedicated entry points for reactivity, HTTP, and
  utilities.
- Command-line tool `@voodoo/cli`, with `init`, custom `build`, `add`, and `info`.
- Bundle size measurement script with targets per bundle.
- Suite with 190+ automated tests, covering reactivity, parser, directives, state, HTTP,
  UI, and utilities.

### Release Notes

- `v-*` attributes are removed from the HTML after processing. Do not write CSS that relies on
  selectors like `[v-tab]`.
- `v-confirm` on the same element as an HTTP verb directive or `v-submit` asks twice. Prefer
  `v-confirm` with `v-click`, or `$confirm(...)` inside an expression.
- `v-t-params` is read only on first render. For text that responds to locale changes, use
  interpolation `{ $t('key', { n: value }) }`.
- `v-chart-*` attributes are read at mount time. With reactive data, declare everything in the
  object: `v-chart="{ type: 'bar', data: sales }"`.
- Extra `v-confirm` text, like `v-confirm-title`, depends on
  `V.config.cleanAttributes = false`.

[Unreleased]: https://github.com/voodoojs/voodoo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/voodoojs/voodoo/releases/tag/v0.1.0
