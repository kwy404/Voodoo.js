# Forms

Submission, validation, masks, upload and serialization. Everything here ships in the
essential build (`voodoo.min.js`) and above.

Implementation: `packages/voodoojs/src/directives/forms.ts`,
`packages/voodoojs/src/forms/validate.ts`, `packages/voodoojs/src/forms/mask.ts`.

---

## `v-submit`

Turns a normal form into an AJAX form.

```html
<form v-submit="/api/users" v-toast-success="Saved!">
  <input name="name" v-required>
  <input name="email" type="email" v-required v-email>
  <button>Save</button>
</form>
```

What happens on submit:

1. `preventDefault()`.
2. Every field with a validation rule is validated.
3. If anything fails, submission stops and errors are shown.
4. Otherwise the form is serialized and sent.
5. Success and error options run.

### `$form`

The directive puts a reactive form state object into the scope, visible to the whole form:

```html
<form v-submit="/api/users">
  <input name="email" v-required v-email>
  <small v-show="$form.errors.email">{ $form.errors.email }</small>

  <button :disabled="$form.loading">
    { $form.loading ? 'Saving...' : 'Save' }
  </button>

  <p v-show="$form.success">Saved.</p>
</form>
```

`$form` carries at least `loading`, `errors` and `success`. Field-level validation results
arrive through the `voodoo:field-validated` event and are merged into `$form.errors` keyed
by field name.

### Options

Written on the form, or on the element carrying the request directive.

| Attribute            | Meaning |
| -------------------- | ------- |
| `v-method`           | HTTP method. Default `POST`. |
| `v-redirect`         | Navigate here on success |
| `v-reset-success`    | Reset the form on success |
| `v-disable-loading`  | Disable the submit button while in flight |
| `v-loading-class`    | Class applied to the form while in flight |
| `v-on-success`       | Expression run on success |
| `v-on-error`         | Expression run on failure |
| `v-on-complete`      | Expression run either way |
| `v-toast-success`    | Success toast message |
| `v-toast-error`      | Error toast message |
| `v-confirm`          | Ask for confirmation before sending |
| `v-form-data`        | Send as `FormData` instead of JSON |

Every option attribute from [HTTP](http.md) also applies: `v-target`, `v-headers`,
`v-timeout`, `v-retry`, `v-offline-queue`, and the rest.

An option written on a `<form>` is inherited by the request directives inside it.

---

## Validation

Add a rule attribute to a field. Validation binds itself; there is nothing to wire up.

```html
<input name="email" v-required v-email>
<input name="age" v-number v-min="18" v-max="120">
<input name="password" v-required v-minlength="8" v-strong-password>
<input name="confirm" v-match="password">
```

### Field rules

`v-required` `v-email` `v-url` `v-number` `v-integer` `v-minlength` `v-maxlength`
`v-min` `v-max` `v-match` `v-regex` `v-cpf` `v-cnpj` `v-cep` `v-phone` `v-date`
`v-accepted` `v-strong-password`

Configuration attributes that also switch validation on for the field:
`v-error-message` `v-error-target` `v-regex-flags` `v-unique-url`

```html
<input v-regex="^[A-Z]{3}-\d{4}$" v-regex-flags="i" v-error-message="Use the format ABC-1234">
```

### Rules available to the engine

Beyond the directive shorthands above, the rule registry also knows `decimal`, `alpha`,
`alphanumeric`, `between`, `after`, `before`, `same`, `different`, `in`, `notin`,
`creditcard` and `unique`. Each has a default message keyed by the same name.

Default messages ship in Brazilian Portuguese. Override them:

```js
Object.assign(V.messages, {
  required: 'This field is required.',
  email: 'Enter a valid email address.',
  minlength: 'Use at least {param} characters.',
});
```

Message placeholders: `{param}` `{field}` `{value}` `{min}` `{max}`.

### Programmatic validation

```js
const result = await V.validate(form);
// { valid: boolean, errors: Record<string, string> }

const field = await V.validate(input);
// { valid: boolean, message?: string }
```

`V.validate` decides by the element type: a form validates every field with a rule, a field
validates itself.

> `V.validateForm` is an **alias of `V.validate`**, not a separate function. See
> [CONVENTIONS.md](../../CONVENTIONS.md) section 7.

### Showing and clearing errors

```js
V.showFieldError(input, 'Something is wrong');
V.showFormErrors(form, { email: 'Already registered' });
V.clearErrors(form);
```

`showFormErrors` normalizes several common server payload shapes into a flat
`{ field: message }` object, so a Laravel-style or a plain-object error response both work.

### Custom rules

```js
V.validator('even', (value) => Number(value) % 2 === 0, 'Enter an even number.');
```

```html
<input v-validate-even>
```

Registering a rule automatically creates the `v-validate-<name>` directive. The validator
receives `(value, param, field)` and returns a boolean or an error message string.

Async rules work:

```js
V.validator('available', async (value) => {
  const { free } = await V.http.get('/api/check', { params: { value } });
  return free || 'That name is taken.';
});
```

### Events

```html
<input name="email" v-email @voodoo:field-validated="onValidated($event)">
```

The detail carries `field`, `valid` and `message`.

> Client-side validation is a user-experience feature, not a security boundary. Validate on
> the server too. See [Security](security.md).

---

## Masks

```html
<input v-mask="cpf">
<input v-mask="phone">
<input v-mask="99/99/9999">
<input v-mask-currency>
```

Built-in masks: `cpf` `cnpj` `cpfcnpj` `cep` `phone` `date` `time` `datetime` `cvv`
`currency` `percent` `card` `plate` `hex` `ip`.

Pattern tokens:

| Token | Matches |
| ----- | ------- |
| `9`   | a digit |
| `A`   | a letter |
| `S`   | a letter or a digit |
| `*`   | any character |

`currency` and `percent` fill from the right, as numeric inputs should.

### Custom masks

```js
V.registerMask('case-number', '9999999-99.9999.9.99.9999');
V.registerMask('reversed', (v) => v.split('').reverse().join(''));
```

Programmatic use:

```js
V.applyMask('12345678901', 'cpf');   // '123.456.789-01'
V.unmask('123.456.789-01');           // '12345678901'
V.masks;                               // Map of registered masks
```

---

## Serialization

```js
const data = V.serializeForm(form);
```

Reads named fields, groups repeated names into arrays, and handles checkboxes, radios and
multi-selects. This is what `v-submit` uses internally.

---

## Upload

### `v-upload`

```html
<input type="file" v-upload="/api/upload" @voodoo:success="onDone($event)">
```

### `v-dropzone`

```html
<div v-dropzone="/api/upload">
  Drop files here
</div>
```

Both accept the HTTP option attributes. A progress bar is created automatically after the
element unless you point `v-progress` at your own, with `role="progressbar"` and the ARIA
value attributes already set.

Programmatically, see `V.http.upload` in [HTTP](http.md).

---

## Other directives

### `v-autosave`

Saves the form as the user types, debounced.

```html
<form v-autosave="/api/draft" v-debounce="1s">
  <textarea name="body"></textarea>
</form>
```

### `v-loading`

Marks an element as the loading indicator for the request on its form.

```html
<form v-submit="/api/users">
  <span v-loading>Saving...</span>
</form>
```

### `v-guard`

Warns before leaving a page with unsaved changes.

```html
<form v-submit="/api/users" v-guard="You have unsaved changes.">
```

### `v-focus`

Focuses the element on mount.

```html
<input v-focus>
```

---

## Complete example

```html
<form v-submit="/api/signup"
      v-toast-success="Account created"
      v-redirect="/welcome"
      v-disable-loading>

  <label>
    Name
    <input name="name" v-required v-minlength="2">
  </label>

  <label>
    Email
    <input name="email" type="email" v-required v-email v-unique-url="/api/check-email">
    <small v-show="$form.errors.email">{ $form.errors.email }</small>
  </label>

  <label>
    Phone
    <input name="phone" v-mask="phone" v-phone>
  </label>

  <label>
    Password
    <input name="password" type="password" v-required v-strong-password="8">
  </label>

  <label>
    Confirm
    <input name="confirm" type="password" v-match="password">
  </label>

  <label>
    <input type="checkbox" name="terms" v-accepted>
    I accept the terms
  </label>

  <button :disabled="$form.loading">
    { $form.loading ? 'Creating...' : 'Create account' }
  </button>
</form>
```

No JavaScript.

---

## Next

- [HTTP](http.md)
- [Directives](directives.md)
- [Security](security.md)
