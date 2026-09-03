# User CRUD

A complete user directory in a single HTML file, using the core Voodoo.js bundle
(`dist/voodoo.min.js`) plus the design system. Open `index.html` in a browser, no server needed.

## What the demo shows

- A `v-table v-table--hover` table inside `v-table-wrap`, built with `v-for` and `:key`.
- A side drawer holding a form validated by `v-validate`, with the rules written as attributes:
  `v-required`, `v-email`, `v-minlength`, `v-cpf`, `v-phone`, and `v-match="#crud-password"`
  on the password confirmation. The library draws the `<span class="v-field-error">` on its own
  and marks the field with `.v-invalid`.
- The `v-mask="cpf"` and `v-mask="phone"` masks, which format the value before `v-model` writes it.
- Submitting through `@submit.prevent="save()"` with `V.validateForm(this.$refs.userForm)` inside
  the method. Nothing is written while `valid` is false.
- Search with `v-debounce="350"` on the `v-model`, by name, e-mail, CPF or phone.
- `V.toast` for success and failure, `V.confirm` for deletion, computed properties for the summary
  numbers, a skeleton loading state and an empty state for a search with no matches.
- Light and dark themes from the `--v-*` tokens, mapped onto the site palette and switched with
  `v-theme-toggle`. The page follows the operating system until someone picks a theme.

## How the API was simulated, and why

There is no back end here, so an in-memory array (`DATABASE`) stands in for the database.
Every operation goes through `V.sleep(420)`, so the interface really does exercise its loading and
disabled-button states, and each one has a 25 per cent chance of failing while the
"Simulate API instability" switch is on. That was the honest choice: `v-submit` and the HTTP
directives would fire a real request and break without a server, while a synchronous array would
hide exactly what the demo needs to show, which is the error path. Beyond the coin flip, a
duplicate e-mail returns a business error, to prove the same handling with a predictable failure.
The first load never fails, so the page always opens with data.
