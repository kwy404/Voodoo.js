## What changes

Describe the change in a sentence or two.

## Why

What problem it solves. If there is an issue, reference it: `Closes #123`.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation
- [ ] Internal refactor, no behaviour change
- [ ] Performance or size
- [ ] Security

## Scope

- **Modules touched:** (e.g. `runtime/walker`, `directives/ui`)
- **Builds affected:** core, essential, full, ESM/CJS
- **Public surface changed:** no new symbol, new symbol, renamed symbol, removed symbol

If a public symbol changed, follow the deprecation policy in
[CONVENTIONS.md](../CONVENTIONS.md): the old name stays as an alias, warns in
development through `avisarAlias`, and disappears only in a major release.

## How to test

Steps, or a minimal HTML file that demonstrates the change working.

```html
```

## Checks

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run size` passes
- [ ] `npm run quality` did not get worse
- [ ] `npm run check:links` passes
- [ ] I added a test for the new behaviour, or a test that failed before the fix

On that last one: run the new test against the *unfixed* code and watch it fail.
A regression test that passes either way records confidence it never earned, and
this repository has shipped three of them.

- [ ] I updated the documentation under `site/docs/`
- [ ] I added the matching line to `CHANGELOG.md`

## Repository rules

- [ ] Code, comments and documentation in English
- [ ] No em dash anywhere in the text, neither `—` nor `–`
- [ ] No `eval` and no `new Function`
- [ ] No runtime dependency
- [ ] No size number, benchmark figure or test count written into prose that will
      go stale
- [ ] Injected CSS works in light and dark and respects `prefers-reduced-motion`
- [ ] Interface components handle ARIA, focus and the keyboard
- [ ] Commits follow Conventional Commits

## If you added a directive

- [ ] It passes the four "do not turn everything into an attribute" criteria in
      [CONVENTIONS.md](../CONVENTIONS.md)
- [ ] It uses `ctx.effect` and `ctx.cleanup`, with no loose listener or timer
- [ ] It reads attributes through `readAttr` or `attrOf`, never `getAttribute`
      after mounting
- [ ] It does not use a `[v-name]` attribute selector; it uses `queryDirective`
      or `closestDirective`

Those last two are the same rule seen twice: installing a directive removes its
attribute from the element, so the DOM no longer knows it was ever there.

- [ ] It is registered in the entry point of the right build
- [ ] The name collides with nothing that already exists

## Size impact

Paste the output of `npm run size` when the change affects what ships in a bundle.

```
```

## Notes

Anything that helps the review: design decisions, alternatives you discarded,
places worth a closer look.
