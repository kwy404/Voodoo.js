# Forms

A complete form, with AJAX submission, validation, loading state, server error handling
and notification, fits in a single HTML block:

```html
<form v-submit="/api/users" v-validate
      v-toast-success="User saved!" v-reset-success v-disable-loading>
  <input name="name" v-required>
  <input name="email" type="email" v-required v-email>
  <button type="submit" :disabled="$form.loading">Save</button>
</form>
```

## v-submit

Intercepts `submit`, serializes fields, and sends via AJAX. The default method is `POST`, and it can
come from the form's `method` attribute or from `v-method`.

```html
<form v-submit="/api/users/7" v-method="PUT">...</form>
```

The URL accepts state interpolation with braces:

```html
<div v-data="{ user: { id: 7 } }">
  <form v-submit="/api/users/{ user.id }" v-method="PUT">...</form>
</div>
```

When `V.config.baseURL` is defined, it is applied to relative URLs.

## $form

Inside a form with `v-submit`, `v-upload`, `v-dropzone` or `v-autosave`, the `$form` magic
describes the current state:

| Field | What it is |
| --- | --- |
| `loading` | `true` while the request is running |
| `saving` | `true` while autosave is writing |
| `success` | `true` after a successful response |
| `errors` | Object with errors by field `name` |
| `message` | Message returned by the server |
| `data` | Body of the last response |
| `status` | HTTP status of the last response |
| `dirty` | `true` when there are unsent changes |
| `progress` | Upload progress, from 0 to 100 |

```html
<form v-submit="/api/contact">
  <button :disabled="$form.loading">
    { $form.loading ? 'Sending...' : 'Send' }
  </button>

  <p v-show="$form.success">{ $form.message || 'We received your message.' }</p>
  <p v-show="$form.errors.email">{ $form.errors.email }</p>
</form>
```

## Options

All can be declared on the form itself. Elements inside the form inherit the value.

| Attribute | What it does |
| --- | --- |
| `v-method` | HTTP verb. Default `POST` |
| `v-validate` | Turns on automatic field validation |
| `v-confirm` | Ask before sending. See the warning at the end of this section |
| `v-toast-success` | Success notification. Empty uses the server message |
| `v-toast-error` | Error notification |
| `v-reset-success` | Clear the form after success |
| `v-redirect` | Navigate after success. Empty uses `redirect` or `url` from the response |
| `v-disable-loading` | Disable submit buttons during the request |
| `v-loading-class` | Extra classes applied to the form during the request |
| `v-loading` | Selector of an element that only appears during the request |
| `v-on-success` | Expression executed on success |
| `v-on-error` | Expression executed on error |
| `v-on-complete` | Expression executed always, at the end |
| `v-target` and `v-swap` | Replace a part of the page with the returned HTML |
| `v-form-data` | Force sending as `FormData`, even without files |

Inside `v-on-success` and `v-on-error` you have `$data`, `$response`, `$form` and `$el`:

```html
<form v-submit="/api/orders"
      v-on-success="orders.unshift($data); $toast.success('Order ' + $data.id)"
      v-on-error="console.warn($data)">
</form>
```

> **Warning about `v-confirm`.** Today the prompt appears twice when `v-confirm` is on the same
> element as `v-submit`: once by the confirmation guard, which intercepts the click, and once by
> the submission routine itself. Until this is fixed, leave the attribute out and ask for
> confirmation on the button:
>
> ```html
> <form v-submit="/api/orders">
>   <input name="quantity" type="number" v-required>
>   <button type="button"
>           v-click="$confirm('Confirm the order?').then(ok => ok && $el.form.requestSubmit())">
>     Send
>   </button>
> </form>
> ```

## Serialization

The body is built from fields with `name`. Names with brackets become nested structures:

```html
<input name="user[name]">
<input name="user[address][street]">
<input name="tags[]" value="a">
<input name="tags[]" value="b">
```

becomes

```json
{ "user": { "name": "...", "address": { "street": "..." } }, "tags": ["a", "b"] }
```

Rules:

- disabled fields are omitted;
- text goes through `trim`;
- `type="number"` and `type="range"` become numbers;
- a single checkbox becomes boolean; multiple with the same `name` become a list of checked items;
- radio sends only the selected one;
- multiple select becomes a list;
- when a file is selected, the entire body becomes `FormData`.

Via JavaScript:

```js
const data = V.serializeForm(document.forms[0]);
const withFiles = V.serializeForm(form, { formData: true });
V.serializeForm(form, { includeDisabled: true, trim: false, numbers: false });
```

And on the DOM collection:

```js
V('#form').serialize();        // 'name=ana&email=a%40b.com'
V('#form').serializeObject();  // { name: 'ana', email: 'a@b.com' }
```

## Server errors

A 422 response, or any response with an error map, is distributed back to the correct fields. Supported formats:

```json
{ "errors": { "email": "Already registered" } }
{ "email": ["Already registered"] }
{ "message": "Invalid data", "errors": { "cpf": "Invalid" } }
```

Messages without a corresponding field appear in a summary at the top of the form. Focus goes to the
first field with an error.

## HTML replacement in response

If the server returns HTML instead of JSON:

```html
<form v-submit="/api/comments" v-target="#comments" v-swap="append" v-reset-success>
  <textarea name="text"></textarea>
  <button>Comment</button>
</form>

<ul id="comments"></ul>
```

Modes for `v-swap`: `innerHTML` (default), `inner`, `outer`, `outerHTML`, `replace`, `append`,
`beforeend`, `prepend`, `afterbegin`, `beforebegin`, `afterend`, `text`, `none`.

The received HTML is walked through Voodoo, so it can bring new directives.

## File upload

```html
<form v-submit="/api/profile">
  <input type="file" name="photo" v-upload="/api/upload">
</form>
```

`v-upload` sends as soon as the file is chosen, with real progress. A progress bar is created right
after the input, unless you point to your own with `v-progress`:

```html
<input type="file" name="attachment" v-upload="/api/upload" v-progress="#bar">
<progress id="bar" max="100" value="0"></progress>
```

Progress is also in `$form.progress`:

```html
<div class="bar" :style="{ width: $form.progress + '%' }"></div>
```

Regular form fields around the upload accompany the file in sending.

## Dropzone

```html
<div v-dropzone="/api/upload" v-field="attachments" accept="image/*" multiple>
  Drag images here or click to select
</div>
```

The area gains button role, keyboard focus (Enter and space open the selector), highlight when dragging over,
and the classes `v-dropzone-over`, `v-dropzone-busy`, and `v-dropzone-error`.

| Attribute | What it does |
| --- | --- |
| `v-field` | Name of the field sent. Default `file` |
| `accept` | Accepted types, passed to the native selector |
| `multiple` | Allow multiple files |
| `v-progress` | Progress bar selector |

## Autosave

Saves automatically as the user types:

```html
<form v-autosave="/api/drafts/7" v-method="PUT">
  <input name="title">
  <textarea name="body"></textarea>
</form>
```

A status indicator is created inside the form, showing "Saving...", "Changes saved"
or "Failed to save". Point to yours with `v-autosave-status="#status"`.

The default interval is 1000 ms. To change:

```html
<form v-autosave="/api/drafts/7" v-autosave-delay="3s">...</form>
<form v-autosave.2s="/api/drafts/7">...</form>
```

## Warning when leaving the page

```html
<form v-submit="/api/articles" v-guard="You have unsaved changes.">
  ...
</form>
```

`v-guard` marks the form as dirty on each change and asks for confirmation before closing the tab.
The state returns to clean after a successful submission or a `reset`.

## Events

```html
<form v-submit="/api/x"
      @voodoo:submit="console.log('sending', $detail.url)"
      @voodoo:invalid="console.log('errors', $detail.errors)"
      @voodoo:success="console.log($detail.data)"
      @voodoo:error="console.log($detail.status)"
      @voodoo:complete="console.log('done')">
</form>
```

| Event | When |
| --- | --- |
| `voodoo:submit` | After validation, before sending |
| `voodoo:invalid` | Validation failed |
| `voodoo:success` | Successful response |
| `voodoo:error` | Failure |
| `voodoo:complete` | Always, at the end |
| `voodoo:upload` | Start of a file upload |
| `voodoo:progress` | On each upload progress |
| `voodoo:autosave` | Autosave completed |
| `voodoo:field-validated` | A field was validated |

## Form without AJAX

`v-model` works in any form, with or without `v-submit`:

```html
<div v-data="{ form: { name: '', email: '' } }">
  <input v-model.trim="form.name">
  <input v-model.trim="form.email">
  <pre>{ form }</pre>
  <button v-click="$http.post('/api/x', form)">Send manually</button>
</div>
```

---

Previous: [HTTP](http.md) · Next: [Validation](validacao.md)
