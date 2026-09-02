# Validation

Validation happens in HTML, with automatic error presentation and support for async rules.

```html
<form v-submit="/api/users" v-validate>
  <label>Email <input name="email" v-required v-email></label>
  <label>CPF <input name="cpf" v-cpf v-error-message="Provide a real CPF."></label>
  <button>Save</button>
</form>
```

## How it works

`v-validate` on the form turns on automatic validation for all fields that declare a rule.
The browser's native validation is disabled so that the messages are yours.

Each field is validated when it loses focus. After the first error, it revalidates on each keystroke,
giving immediate feedback without bothering those still typing.

On submission, the entire form is validated. If anything fails, submission stops, focus goes to the
first field with a problem, and the `voodoo:invalid` event is fired.

An isolated field, outside a validated form, also works: just declare the rule or use
`v-validate` on the field itself.

## What appears on screen

When a field fails:

- it gains the `v-invalid` class and `aria-invalid="true"`;
- a message with `role="alert"` is inserted right after it, with the `v-field-error` class;
- `aria-describedby` points to the message.

When it passes, it gains `v-valid` and the message is removed. To send the message elsewhere:

```html
<input name="email" v-required v-email v-error-target="#email-error">
<span id="email-error"></span>
```

## Rules

All exist as directives (`v-name`) and as `v-validate-name`.

### Presence and format

| Rule | Accepts | What it validates |
| --- | --- | --- |
| `v-required` | | Field filled. On checkbox and radio, checked. On file, some chosen |
| `v-email` | | Email format |
| `v-url` | | Valid URL. Accepts without protocol |
| `v-number` | | Number, understanding decimal comma and thousands separator |
| `v-integer` | | Integer number |
| `v-validate-decimal` | places | Decimal, with at most N places |
| `v-validate-alpha` | | Letters only, with accents |
| `v-validate-alphanumeric` | | Letters and numbers only |
| `v-regex` | expression | Matches the regular expression |

```html
<input v-validate-decimal="2">
<input v-regex="^[A-Z]{3}-\d{4}$" v-regex-flags="i" v-error-message="Invalid plate.">
```

### Size and range

| Rule | Accepts | What it validates |
| --- | --- | --- |
| `v-minlength` | number | Minimum number of characters |
| `v-maxlength` | number | Maximum number of characters |
| `v-min` | number or date | Minimum value |
| `v-max` | number or date | Maximum value |
| `v-validate-between` | `min,max` | Value within range |

```html
<input v-minlength="3" v-maxlength="60">
<input type="number" v-min="1" v-max="99">
<input v-validate-between="10,100">
```

### Comparison

| Rule | Accepts | What it validates |
| --- | --- | --- |
| `v-match` | name, id or selector | Equal to another field |
| `v-validate-same` | name, id or selector | Equal to another field |
| `v-validate-different` | name, id or selector | Different from another field |
| `v-validate-in` | list | The value is among the options |
| `v-validate-notin` | list | The value is not among the options |

```html
<input type="password" name="password" v-required>
<input type="password" name="confirm" v-match="password" v-error-message="Passwords don't match.">
<input v-validate-in="small, medium, large">
```

### Dates

| Rule | Accepts | What it validates |
| --- | --- | --- |
| `v-date` | | Valid date in `dd/mm/yyyy`, `yyyy-mm-dd` or what the browser understands |
| `v-validate-after` | date, `today` or another field | After the reference |
| `v-validate-before` | date, `today` or another field | Before the reference |

```html
<input v-mask="date" v-date v-validate-before="today" v-label="Date of birth">
<input name="start" v-date>
<input name="end" v-date v-validate-after="start">
```

`today`, `now` are accepted as reference.

### Brazil

| Rule | What it validates |
| --- | --- |
| `v-cpf` | CPF with real check digit calculation |
| `v-cnpj` | CNPJ with real check digit calculation |
| `v-cep` | CEP with eight digits |
| `v-phone` | Landline or mobile phone, with valid area code |

```html
<input v-mask="cpf" v-cpf>
<input v-mask="cnpj" v-cnpj>
<input v-mask="cep" v-cep>
<input v-mask="phone" v-phone>
```

### Others

| Rule | Accepts | What it validates |
| --- | --- | --- |
| `v-accepted` | | Checked box, or value `1`, `true`, `on`, `yes` |
| `v-validate-creditcard` | | Card number by Luhn algorithm |
| `v-strong-password` | minimum characters | Uppercase, lowercase, number and symbol. Default 8 |
| `v-validate-unique` | URL | Queries the server to know if the value already exists |

```html
<input type="checkbox" name="terms" v-accepted v-error-message="You must accept the terms.">
<input v-mask="card" v-validate-creditcard>
<input type="password" v-strong-password="10">
```

### Accepted aliases

`strong-password`, `credit-card`, `min-length`, `max-length`, `not-in` work as synonyms for the corresponding rules.

## Native attributes also count

The library reads standard HTML attributes and transforms them into rules:

```html
<input required minlength="3" maxlength="20" pattern="[a-z]+">
<input type="email" required>
<input type="number" min="1" max="10">
<input type="url">
```

## Turning off a rule

`v-required="false"` turns off the rule without requiring you to remove the attribute. This helps when the
HTML is generated on the server and the condition is known there:

```html
<input name="cnpj" v-cnpj v-required="false">
```

The value is read from the original attribute, so the decision is made at render time and doesn't change after.
For a rule that toggles in real time, write your own rule that consults the state:

```js
V.validator('cnpjWhenCompany', (value) => {
  if (V.scope.type !== 'company') return true;
  return value.trim() !== '' || 'Provide the company CNPJ.';
});
```

## Messages

Default messages are in `V.messages`, and can be changed one by one or in bulk:

```js
Object.assign(V.messages, {
  required: 'Required field.',
  email: 'Check the email you entered.',
  minlength: 'Write at least {param} characters.',
});
```

Inside the text you can use:

| Marker | Becomes |
| --- | --- |
| `{param}` | The rule parameter |
| `{field}` | The field label |
| `{value}` | The entered value |
| `{min}` and `{max}` | The two parts of a parameter like `10,100` |

The field label is discovered in this order: `v-label`, the corresponding `<label for>`, the text of the
`<label>` around it, `aria-label`, `placeholder`, and finally the `name`.

For a field-specific message:

```html
<input v-cpf v-error-message="This CPF is invalid.">
```

Full list of default messages: `required`, `email`, `url`, `number`, `integer`, `decimal`,
`alpha`, `alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `regex`,
`date`, `after`, `before`, `accepted`, `same`, `different`, `in`, `notin`, `phone`, `cpf`, `cnpj`,
`cep`, `creditcard`, `strongpassword`, `unique`, `invalid`.

## Async validation

The `unique` rule queries the server:

```html
<input name="email" type="email" v-required v-email v-validate-unique="/api/check-email">
```

Or with the dedicated attribute:

```html
<input name="nickname" v-validate-unique v-unique-url="/api/check-nickname">
```

The library calls `GET /api/check-email?value=...&field=email` and expects:

- `{ "available": true }` to pass;
- `{ "available": false }` to fail;
- empty response or `null` to pass;
- any other body to fail, understanding that the record exists;
- status 404 to pass.

Network failures never block submission: the rule passes and lets the server decide at POST time.

## Custom rules

```js
V.validator('even', (value) => Number(value) % 2 === 0, 'Provide an even number.');
```

```html
<input v-validate-even>
```

The function receives `(value, parameter, element)` and can return:

- `true` to pass;
- `false` to fail with the default message;
- text to fail with that message;
- a `Promise` of any of the three.

```js
V.validator('cnpjActive', async (value) => {
  if (!value) return true;
  const data = await V.http.get(`/api/cnpj/${V.unmask(value)}`);
  return data.active ? true : 'This CNPJ is inactive on the revenue service.';
});
```

```js
V.validator('after', (value, param, el) => {
  const other = document.querySelector(`[name="${param}"]`);
  return !other || value > other.value || 'Must be after ' + other.value;
});
```

Registering a rule automatically creates the `v-validate-<name>` directive.

## JavaScript API

```js
const result = await V.validate(document.forms[0]);
// { valid: true, errors: {} }

const field = await V.validate(document.querySelector('#email'));
// { valid: false, message: 'Provide a valid email.', rule: 'email' }

V.showFieldError(input, 'Specific message');
V.showFormErrors(form, { email: 'Already registered' });
V.clearErrors(form);
```

`V.validateForm` is an alias of `V.validate` for forms.

## Combining with masks

Mask and validation complement each other. The mask guides typing, the rule validates the content:

```html
<input v-mask="cpf" v-cpf v-required>
<input v-mask="phone" v-phone>
<input v-mask="cep" v-cep>
<input v-mask="date" v-date>
```

With the `.unmask` modifier, `v-model` receives the clean value while the screen shows the formatted one:

```html
<input v-mask.unmask="cpf" v-model="form.cpf" v-cpf>
```

## Accessibility

What the library does automatically:

- `aria-invalid` on the failed field;
- `aria-describedby` linking the field to the message;
- `role="alert"` and `aria-live="polite"` on the message;
- focus on the first field with error after a failed submission, with smooth scrolling that respects
  `prefers-reduced-motion`;
- summary with `role="alert"` at the top when a server error has no corresponding field.

---

Previous: [Forms](formularios.md) · Next: [Masks](mascaras.md)
