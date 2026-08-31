# HTTP

Two ways to make a request: an attribute in the HTML, or the `V.http` client in JavaScript.
Both go through the same code in `packages/voodoojs/src/http/index.ts`.

---

## The client

```js
const users = await V.http.get('/api/users');
const user  = await V.http.get('/api/users/1');
const saved = await V.http.post('/api/users', { name: 'Ana' });
await V.http.put('/api/users/1', { name: 'Bia' });
await V.http.patch('/api/users/1', { active: false });
await V.http.delete('/api/users/1');
await V.http.head('/api/users');
```

The shortcut methods return the **parsed body**. When you need status and headers, use
`request`:

```js
const response = await V.http.request({ url: '/api/users', method: 'GET' });

response.data;        // parsed body
response.status;      // 200
response.statusText;
response.headers;     // Headers
response.ok;          // boolean
response.raw;         // the Response object
response.config;      // the request config
```

### Options

```js
await V.http.get('/api/search', {
  params:  { q: 'test', page: 2 },
  headers: { 'X-Custom': 'value' },
  timeout: 5000,
  signal:  controller.signal,
});
```

### Defaults

```js
V.http.defaults.baseURL;      // ''
V.http.defaults.headers;      // { Accept: 'application/json, text/html, */*' }
V.http.defaults.timeout;      // 30000
V.http.defaults.retry;        // 0
V.http.defaults.retryDelay;   // 500
V.http.defaults.credentials;  // 'same-origin'
V.http.defaults.csrfMeta;     // 'csrf-token'
V.http.defaults.csrfHeader;   // 'X-CSRF-TOKEN'
```

Helpers:

```js
V.http.setBaseURL('/api');
V.http.setHeader('X-App-Version', '2.1');
V.http.setHeader('X-App-Version', null);     // removes it
V.http.setToken('abc123');                    // Authorization: Bearer abc123
V.http.setToken('abc123', 'Token');           // Authorization: Token abc123
V.http.setToken(null);                        // removes it
```

`V.config.baseURL` and the `data-base-url` script attribute both set the base URL at boot.

### CSRF

If the page has `<meta name="csrf-token" content="...">`, the token is sent automatically as
`X-CSRF-TOKEN` on every request, including uploads. It is not sent if the caller already set
that header. Both names are configurable through `V.http.defaults`.

---

## Errors

A non-2xx response rejects with an `HttpError`:

```js
try {
  await V.http.post('/api/users', data);
} catch (err) {
  if (err instanceof V.HttpError) {
    err.status;    // HTTP status
    err.data;      // parsed error body
    err.message;
  }
}
```

---

## Interceptors

```js
const removeRequest = V.http.interceptors.request.use((config) => {
  const token = V.storage.get('token');
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

const removeResponse = V.http.interceptors.response.use((response) => {
  console.log(response.status, response.config.url);
  return response;
});

const removeError = V.http.interceptors.error.use((error) => {
  if (error.status === 401) V.navigate('/login');
  else V.toast.error('Something went wrong.');
});
```

`use` returns the function that removes the interceptor. **Keep the return value**, because
it is the only cleanup path.

An interceptor sees every request and every response in the application. Audit any plugin
that installs one.

---

## Upload with progress

Uses `XMLHttpRequest`, because `fetch` cannot report upload progress.

```js
const form = new FormData();
form.append('file', fileInput.files[0]);

await V.http.upload('/api/upload', form, {
  method: 'POST',
  onProgress: (percent, loaded, total) => {
    bar.style.width = `${percent}%`;
  },
  signal: controller.signal,
});
```

`Content-Type` is deliberately not set, so the browser can build the multipart boundary.

---

## Server-Sent Events

```js
const source = V.http.sse('/api/events', {
  message: (data, event) => console.log(data),
  error:   (e) => console.error(e),
});

source.close();
```

JSON payloads are parsed; anything else arrives as text. Reconnection is handled by the
browser's own `EventSource`.

`EventSource` is not feature-detected. Calling `V.http.sse` in an environment without it
throws; nothing else in the library is affected.

---

## Streaming (NDJSON)

```js
await V.http.stream('/api/logs', (line) => {
  console.log(JSON.parse(line));
});
```

Reads the response body with a `ReadableStream` reader and calls back per line.

---

## Response cache

```js
await V.http.get('/api/config', { cache: 60000 });   // reuse for 60s
V.http.clearCache();
V.http.clearCache('/api/config');
V.http.clearCache(/^\/api\/users/);
```

Cached entries are held in memory for the page lifetime. Nothing is persisted.

---

## Offline queue

Failed mutating requests can be queued and replayed:

```js
await V.http.flushOfflineQueue();   // returns how many were sent
```

Declaratively, per element:

```html
<form v-submit="/api/notes" v-offline-queue>
```

> The queue lives in `localStorage`, so request bodies sit there in plain text. Do not queue
> requests that carry secrets.

---

## Declarative requests

### Verb directives

```html
<button v-get="/api/users" v-target="#list">Load</button>
<button v-post="/api/like" v-body="{ id: post.id }">Like</button>
<button v-delete="'/api/users/' + user.id" v-confirm="Delete this user?">Delete</button>
```

The URL is an expression, so it can be dynamic. `v-target` names where the response goes.

### Trigger directives

| Directive        | Fires |
| ---------------- | ----- |
| `v-load`         | On mount |
| `v-load-visible` | When the element enters the viewport (immediately if `IntersectionObserver` is missing) |
| `v-search`       | As the user types, debounced, cancelling the previous request |
| `v-resource`     | On mount, into a named reactive resource object |

```html
<div v-load="/api/stats" v-target="#stats"></div>
<div id="stats"></div>

<div v-load-visible="/api/comments" v-target="#comments"></div>

<input v-search="/api/search" v-target="#results" v-min-length="3" v-debounce="300">
```

### `v-resource`

Puts a reactive resource object into the scope instead of swapping HTML.

```html
<div v-resource="users:/api/users" v-poll="30s">
  <p v-show="users.loading">Loading...</p>
  <p v-show="users.error">{ users.error }</p>
  <ul>
    <li v-for="u in users.data" :key="u.id">{ u.name }</li>
  </ul>
  <button @click="users.reload()">Refresh</button>
</div>
```

The syntax is `name:url`. The resource exposes `data`, `loading`, `error` and `reload()`.
It stops polling and cancels the pending request when the element leaves the DOM.

Add `v-manual` to skip the initial request.

### Option attributes

These configure the request directives on the same element, or on the enclosing `<form>`.

| Attribute          | Meaning |
| ------------------ | ------- |
| `v-target`         | Selector receiving the response |
| `v-swap`           | How to place it: `innerHTML`, `outerHTML`, `beforeend`, and so on |
| `v-trigger`        | Event that fires the request |
| `v-poll`           | Repeat interval, e.g. `30s` |
| `v-params`         | Query string values, as an expression |
| `v-body`           | Request body, as an expression |
| `v-headers`        | Extra headers, as an expression |
| `v-cache`          | Cache duration |
| `v-retry`          | Retry count |
| `v-timeout`        | Timeout |
| `v-as`             | Response handling: `json`, `text`, `html` |
| `v-json-path`      | Path into the JSON response |
| `v-template`       | Template used to render the response |
| `v-offline-queue`  | Queue the request when it fails |
| `v-min-length`     | Minimum input length before `v-search` fires |
| `v-scroll-to`      | Scroll to a selector after the swap |
| `v-manual`         | Do not fire automatically |
| `v-debounce`       | Debounce the trigger |
| `v-throttle`       | Throttle the trigger |
| `v-indicator`      | Selector shown while the request is in flight |

> `v-as="html"` inserts the server response as markup. That is trusted exactly as far as
> your server is. See [Security](security.md).

### Events

Request directives dispatch bubbling events you can listen to:

```html
<div v-load="/api/data"
     @voodoo:success="handleSuccess($event)"
     @voodoo:error="handleError($event)">
</div>
```

---

## Configuration recipe

```js
V.http.setBaseURL('/api');

V.http.interceptors.request.use((config) => {
  const token = V.storage.get('token');
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

V.http.interceptors.error.use((error) => {
  if (error.status === 401) {
    V.storage.remove('token');
    V.navigate('/login');
    return;
  }
  if (error.status >= 500) V.toast.error('Server error. Please try again.');
});
```

Put this in a module and call it once at startup. See
[application-structure](../application-structure.md) (Portuguese).

---

## Next

- [Forms](forms.md) - `v-submit` and validation
- [Router](router.md)
- [Security](security.md)
