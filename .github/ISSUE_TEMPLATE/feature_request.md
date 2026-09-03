---
name: Propose a feature
about: Suggest an idea for the library
title: ''
labels: enhancement
assignees: ''
---

## The problem

What did you run into? Describe the actual situation, before any solution.

## The proposal

What you would like to exist. If it involves HTML, show how it would read:

```html
<div v-my-idea="something"></div>
```

If it involves JavaScript, show the call:

```js
V.myIdea({ option: true });
```

## What you do today

The workaround you use instead, and why it is not enough.

## Alternatives considered

Other ways to solve the same problem, and why the proposal above looks better.

## If the proposal is a directive

The project's rule is "do not turn everything into an attribute". A directive
earns its place only when it solves a genuinely declarative problem. Check it
against the four criteria in
[CONVENTIONS.md](https://github.com/kwy404/Voodoo.js/blob/main/CONVENTIONS.md):

- [ ] It binds behaviour to an element. If it needs no element, it is a `V.*` function
- [ ] It replaces repetitive code, not a single line of JavaScript
- [ ] The HTML reads better than the equivalent JavaScript
- [ ] It is not just a configuration value belonging to another directive

## Fit

- [ ] Works with no build step
- [ ] Needs neither `eval` nor `new Function`
- [ ] Brings no runtime dependency
- [ ] Fits the essential build, or belongs in the full build
- [ ] Is not on the "out of scope" list in
      [ROADMAP.md](https://github.com/kwy404/Voodoo.js/blob/main/ROADMAP.md)
- [ ] Is not already listed as planned in the roadmap

## Impact

- **Build affected:** core, essential or full
- **Breaks compatibility:** yes or no. If yes, explain what
- **Proposed name:** and why it collides with nothing that already exists

Size is a real constraint here, not a formality. The full build is already
129 KB gzipped, which the README says out loud is the largest in its comparison
table. A feature that grows the core build is paid for by everyone who installs
the library, including the people who will never call it.

## Extra context

Links, images, how other libraries solve it, whatever helps.

---

Issues in Portuguese are welcome. English simply reaches more people who can
help.
