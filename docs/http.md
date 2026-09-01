# HTTP

Two layers: a complete client in `V.http`, and directives that solve most cases without a single
line of JavaScript.

---

# Directives

## v-get, v-post, v-put, v-patch, v-delete

```html
<button v-get="/api/usuarios" v-target="#lista">Carregar</button>

<div id="lista"></div>
```

Each verb triggers on the **element's natural trigger**:

| Element | Trigger |
| --- | --- |
| `<form>` | `submit` |
| `<input>`, `<select>`, `<textarea>` | `change` (or `click` on buttons) |
| any other | `click` |

If the response is HTML, it goes straight into the target. If it's JSON, it becomes a readable table
or definition list with everything escaped. If you'd rather store it than render it, use `v-as`.

The URL can be literal or an expression:

```html
<button v-delete="/api/pedidos/7">Excluir</button>
<button v-delete="'/api/pedidos/' + pedido.id">Excluir</button>
```

## v-target e v-swap

`v-target` is the selector of the element that receives the result. Without it, the element itself
is the target.

`v-swap` chooses how the content enters:

| Mode | What it does |
| --- | --- |
| `innerHTML` | Replaces the target's content. Default |
| `outerHTML`, `replace` | Replaces the entire target |
| `textContent` | Writes as plain text |
| `beforebegin` | Inserts before the target |
| `afterbegin`, `prepend` | Inserts as first child |
| `beforeend`, `append` | Inserts as last child |
| `afterend` | Inserts after the target |
| `delete` | Removes the target |
| `none` | Doesn't touch the DOM |

```html
<button v-get="/api/comentarios?pagina=2" v-target="#comentarios" v-swap="append">
  Carregar mais
</button>
```

The inserted HTML is walked by Voodoo, so it can bring new directives.

## v-trigger

Changes the default trigger:

```html
<div v-get="/api/status" v-trigger="load">...</div>
<div v-get="/api/banner" v-trigger="visible">...</div>
<input v-get="/api/buscar" v-trigger="keyup" v-debounce="300">
<div v-get="/api/feed" v-trigger="visible.repeat">...</div>
<button v-get="/api/x" v-trigger="click.once">Só uma vez</button>
```

Special triggers: `load` and `ready` fire on mount, `visible` and `revealed` fire when the element
comes close to the viewport. Modifiers accepted in the text: `once` and `repeat`.

## v-poll

Repeats the request at fixed intervals. Pauses when the tab is not visible.

```html
<div v-get="/api/notificacoes" v-poll="10s" v-target="#sino"></div>
```

## v-load e v-load-visible

Shortcuts to load content without writing a trigger:

```html
<div v-load="/parciais/rodape.html"></div>
<section v-load-visible="/parciais/depoimentos.html">Carregando...</section>
```

`v-load-visible` only fetches when the element comes within 120 pixels of the viewport.

## v-search

Searches as the user types, with debounce and minimum length:

```html
<input v-search="/api/produtos" v-target="#resultados" v-param="q"
       v-min-length="3" v-debounce="400" placeholder="Buscar produtos">

<div id="resultados"></div>
```

| Attribute | Default |
| --- | --- |
| `v-param` | the input's `name`, or `q` |
| `v-debounce` | 300 ms |
| `v-min-length` | 0 |

## v-resource

Creates a reactive object with the entire request state:

```html
<div v-resource="produtos: /api/produtos">
  <p v-if="produtos.loading">Carregando...</p>
  <p v-else-if="produtos.error">{ produtos.error.message }</p>
  <ul v-else>
    <li v-for="p in produtos.data" :key="p.id">{ p.nome }</li>
  </ul>

  <button v-click="produtos.reload()">Atualizar</button>
</div>
```

| Field | What it is |
| --- | --- |
| `data` | Response body, or `null` |
| `loading` | `true` during the request |
| `error` | `{ name, message }`, or `null` |
| `loaded` | `true` after first success |
| `reload()` | Repeats the request |
| `set(value)` | Changes the data locally, useful for optimistic updates |

The syntax is `name: url`. Without a name, the resource is called `resource`. You can also use `v-as`:

```html
<div v-resource="/api/pedidos" v-as="pedidos"></div>
```

Accepted attributes: `v-method`, `v-params`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`,
`v-poll` and `v-manual` (doesn't fetch on mount, waits for `reload()`).

```html
<div v-resource="usuarios: /api/usuarios"
     v-params="{ pagina: pagina, busca: termo }"
     v-cache="30s"
     v-poll="60s">
</div>
```

## Renderizando com um template

To control the HTML of the list, point to a `<template>` on the page:

```html
<button v-get="/api/usuarios" v-target="#lista" v-template="#linha">Carregar</button>

<template id="linha">
  <li>
    <strong>{ nome }</strong>
    <small>{ email }</small>
    <em>item { index + 1 }</em>
  </li>
</template>

<ul id="lista"></ul>
```

Inside the template you have `item` (the entire object), `index`, and each key of the object as
a direct variable.

## Guardando no estado

`v-as` stores the response in the scope instead of writing to the DOM:

```html
<div v-data="{ usuarios: [] }">
  <button v-get="/api/usuarios" v-as="usuarios">Carregar</button>
  <li v-for="u in usuarios">{ u.nome }</li>
</div>
```

`v-json-path` extracts a piece of the response first:

```html
<button v-get="/api/relatorio" v-as="linhas" v-json-path="dados.itens">Carregar</button>
```

## Estado de carregamento

```html
<button v-get="/api/relatorio"
        v-target="#saida"
        v-loading="#spinner"
        v-loading-class="ocupado"
        v-disable-loading>
  Gerar
</button>

<div id="spinner">Gerando relatório...</div>
```

| Attribute | What it does |
| --- | --- |
| `v-loading` | Selector of an element that stays hidden until the request starts |
| `v-loading-class` | Class applied to the element during the request. Default `v-loading` |
| `v-disable-loading` | Disables the button while the request is running |

During the request the element also receives `aria-busy="true"`.

## Confirmação, notificação e callbacks

```html
<button v-delete="'/api/pedidos/' + pedido.id"
        v-toast-success="Pedido excluído"
        v-toast-error="Não foi possível excluir"
        v-on-success="lista.reload()"
        v-target="#linha-do-pedido"
        v-swap="delete">
  Excluir
</button>
```

| Attribute | What it does |
| --- | --- |
| `v-confirm` | Asks before firing. See the warning below |
| `v-toast-success` | Success notification |
| `v-toast-error` | Error notification. Without it, the server error becomes the message |
| `v-on-success` | Expression executed on success. Has `$el`, `data` and `response` |
| `v-on-error` | Expression executed on error. Has `$el`, `error` and `message` |
| `v-on-complete` | Expression always executed at the end |
| `v-redirect` | Navigates to the URL after success |
| `v-scroll-to` | Smoothly scrolls to the selector after success |

> **Warning about `v-confirm` with a request.** Currently the question is asked twice when
> `v-confirm` is on the same element as `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` or
> `v-submit`: once by the confirmation guard, which intercepts the click, and once by the request
> itself. Until this is fixed, ask for confirmation in only one place:
>
> ```html
> <!-- confirmation by guard, request by expression -->
> <button v-confirm="Delete this order?"
>         v-click="$http.delete('/api/orders/' + order.id).then(() => list.reload())">
>   Delete
> </button>
> ```
>
> Or ask for confirmation inside the expression itself:
>
> ```html
> <button v-click="$confirm('Delete this order?').then(ok => ok && delete(order))">
>   Delete
> </button>
> ```

## Outros atributos

| Attribute | What it does |
| --- | --- |
| `v-params` | Object that becomes a query string |
| `v-body` | Expression that becomes the request body |
| `v-headers` | Object of headers |
| `v-cache` | Stores the response for a time. GET only. Accepts `30s`, `5m` |
| `v-retry` | Extra attempts on network failure and 5xx errors |
| `v-timeout` | Time to abort |
| `v-offline-queue` | Stores the request when the browser is offline and resends it later |

```html
<form v-post="/api/pedidos"
      v-body="{ produto: produtoId, quantidade: qtd }"
      v-headers="{ 'X-Origem': 'checkout' }"
      v-retry="2"
      v-timeout="10s"
      v-offline-queue>
</form>
```

## Eventos

```html
<div v-get="/api/x"
     @voodoo:before-request="console.log('indo')"
     @voodoo:success="console.log($detail.data)"
     @voodoo:error="console.log($detail.message)"
     @voodoo:complete="console.log('fim')">
</div>
```

## Cancelamento automático

Uma nova requisição do mesmo elemento cancela a anterior que ainda estiver pendente. Isso resolve
a corrida clássica da busca enquanto se digita, sem nenhuma configuração.

---

# O cliente V.http

```js
const usuarios = await V.http.get('/api/usuarios');
const criado   = await V.http.post('/api/usuarios', { nome: 'Ana' });
await V.http.put('/api/usuarios/1', { nome: 'Bia' });
await V.http.patch('/api/usuarios/1', { ativo: false });
await V.http.delete('/api/usuarios/1');
await V.http.head('/api/usuarios');
```

The shortcuts return only the data. For the complete response, use `request`:

```js
const resposta = await V.http.request({ url: '/api/usuarios', method: 'GET' });
resposta.data;
resposta.status;
resposta.headers.get('x-total');
resposta.ok;
resposta.raw;     // o Response original
```

## Opções

| Option | What it does |
| --- | --- |
| `params` | Object that becomes a query string. Null and empty values are omitted |
| `headers` | Request headers |
| `timeout` | Milliseconds to abort. Default 30000. `0` turns it off |
| `retry` | Extra attempts on network failure and 5xx. The wait doubles each round. **Only works alone on `GET`, `HEAD` and `OPTIONS`** |
| `retryUnsafe` | Enables retry on `POST`, `PATCH`, `PUT` and `DELETE`. Read the warning below before turning it on |
| `retryDelay` | Initial wait between attempts. Default 500 ms |

### Why retry doesn't repeat `POST` alone

Retrying a request that changes state can execute the operation twice. The classic case is payment:
the server receives and processes it, the response gets lost on the way back, the client thinks
it's a network failure and resends. The user gets charged twice.

That's why automatic retry only works for idempotent methods, those where repeating has the same
effect as doing it once: `GET`, `HEAD` and `OPTIONS`.

For the others there are two paths, and both are explicit on purpose:

```js
// 1. You guarantee that retrying is safe on this route.
V.http.post('/api/events', data, { retry: 2, retryUnsafe: true })

// 2. Better: the server deduplicates by idempotency key.
V.http.post('/api/payments', data, {
  retry: 2,
  headers: { 'Idempotency-Key': V.uid('pag') },
})
```

The second form is correct when the operation really matters. The key must be the same in repeated
attempts and the server must recognize it — without it, it doesn't protect anything.

In development, asking for `retry` on an unsafe method without either one generates a console warning.
| `cache` | Cache milliseconds. GET only |
| `signal` | `AbortSignal` to cancel |
| `credentials` | Default `same-origin` |
| `responseType` | `auto`, `json`, `text`, `blob`, `arrayBuffer`, `formData` |
| `offlineQueue` | Stores the request when offline and resends when back online |

```js
const dados = await V.http.get('/api/produtos', {
  params: { pagina: 2, busca: 'caneca' },
  cache: 60_000,
  retry: 2,
  timeout: 8000,
});
```

## Corpo

Objects become JSON with the correct header. `FormData`, `Blob`, `URLSearchParams`, `ArrayBuffer`
and text pass as-is.

```js
await V.http.post('/api/usuarios', { nome: 'Ana' });          // application/json
await V.http.post('/api/upload', formData);                    // multipart, o navegador decide
```

## Erros

```js
try {
  await V.http.get('/api/x');
} catch (err) {
  if (err instanceof V.HttpError) {
    err.status;            // 0 quando não houve resposta
    err.response?.data;    // corpo do erro
    err.isNetworkError;    // true em falha de rede, timeout ou cancelamento
    err.config;            // a configuração usada
  }
}
```

4xx errors are not retried. 5xx errors and network failures respect `retry`.

## Interceptadores

```js
const off = V.http.interceptors.request.use((config) => {
  config.headers = { ...config.headers, 'X-Tenant': tenantAtual() };
  return config;
});

V.http.interceptors.response.use((resposta) => {
  console.log(resposta.status, resposta.config.url);
  return resposta;
});

V.http.interceptors.error.use((erro) => {
  if (erro.status === 401) location.assign('/login');
});

off();  // remove o interceptador de requisição
```

Interceptors can be asynchronous. The request one must return the config, and the response one
must return the response.

## Autenticação e cabeçalhos padrão

```js
V.http.setBaseURL('https://api.exemplo.com');
V.http.setToken('meu-jwt');                  // Authorization: Bearer meu-jwt
V.http.setToken('chave', 'Token');           // Authorization: Token chave
V.http.setToken(null);                       // remove
V.http.setHeader('Accept-Language', 'pt-BR');
V.http.setHeader('Accept-Language', null);   // remove
```

Every request already carries `X-Requested-With: XMLHttpRequest`. On writing methods, the CSRF token
is read from `<meta name="csrf-token" content="...">` and sent as `X-CSRF-TOKEN`. The names are
configurable in `V.http.defaults.csrfMeta` and `V.http.defaults.csrfHeader`.

## Upload com progresso

```js
const dados = new FormData();
dados.append('arquivo', input.files[0]);

await V.http.upload('/api/arquivos', dados, {
  onProgress: (porcentagem, enviado, total) => {
    barra.style.width = `${porcentagem}%`;
  },
});
```

Uses `XMLHttpRequest` under the hood, because only it reports real upload progress.

## Server-Sent Events

```js
const fonte = V.http.sse('/api/eventos', {
  message: (dados) => console.log(dados),
  error: (e) => console.warn('conexão caiu', e),
});

fonte.close();
```

JSON is converted automatically when possible.

## Streaming linha a linha

```js
await V.http.stream('/api/logs', (linha) => {
  console.log(JSON.parse(linha));
});
```

Ideal for NDJSON and long responses.

## Cache

```js
await V.http.get('/api/config', { cache: 300_000 });
V.http.clearCache();               // limpa tudo
V.http.clearCache('/api/produtos');// limpa o que contém o texto
V.http.clearCache(/^GET \/api\//); // limpa pelo padrão
```

## Fila offline

Requests with `offlineQueue: true` fired with the browser offline are stored in `localStorage`
and automatically resent when the connection returns.

```js
await V.http.post('/api/pedidos', pedido, { offlineQueue: true });
await V.http.flushOfflineQueue();   // força o reenvio
```

The immediate response is synthetic, with `status: 0` and `statusText: 'offline-queued'`.

## No HTML

The entire client is available as `$http` inside any expression:

```html
<button v-click="$http.post('/api/curtidas', { id: post.id }).then(() => post.curtido = true)">
  Curtir
</button>
```

---

Previous: [Events](eventos.md) · Next: [Forms](formularios.md)
