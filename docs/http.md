# HTTP

Duas camadas: um cliente completo em `V.http`, e directives que resolvem a maior parte dos casos
sem uma linha de JavaScript.

---

# Directives

## v-get, v-post, v-put, v-patch, v-delete

```html
<button v-get="/api/usuarios" v-target="#lista">Carregar</button>

<div id="lista"></div>
```

Cada verbo dispara no **gatilho natural** do elemento:

| Elemento | Gatilho |
| --- | --- |
| `<form>` | `submit` |
| `<input>`, `<select>`, `<textarea>` | `change` (ou `click` em botões) |
| qualquer outro | `click` |

Se a resposta for HTML, ela entra direto no alvo. Se for JSON, vira uma tabela ou uma lista de
definições legível, com tudo escapado. Se você preferir guardar em vez de renderizar, use `v-as`.

A URL pode ser literal ou uma expressão:

```html
<button v-delete="/api/pedidos/7">Excluir</button>
<button v-delete="'/api/pedidos/' + pedido.id">Excluir</button>
```

## v-target e v-swap

`v-target` é o seletor do elemento que recebe o resultado. Sem ele, o próprio elemento é o alvo.

`v-swap` escolhe como o conteúdo entra:

| Modo | O que faz |
| --- | --- |
| `innerHTML` | Substitui o conteúdo do alvo. Padrão |
| `outerHTML`, `replace` | Substitui o alvo inteiro |
| `textContent` | Escreve como texto puro |
| `beforebegin` | Insere antes do alvo |
| `afterbegin`, `prepend` | Insere como primeiro filho |
| `beforeend`, `append` | Insere como último filho |
| `afterend` | Insere depois do alvo |
| `delete` | Remove o alvo |
| `none` | Não mexe no DOM |

```html
<button v-get="/api/comentarios?pagina=2" v-target="#comentarios" v-swap="append">
  Carregar mais
</button>
```

O HTML inserido é percorrido pela Voodoo, então ele pode trazer novas directives.

## v-trigger

Troca o gatilho padrão:

```html
<div v-get="/api/status" v-trigger="load">...</div>
<div v-get="/api/banner" v-trigger="visible">...</div>
<input v-get="/api/buscar" v-trigger="keyup" v-debounce="300">
<div v-get="/api/feed" v-trigger="visible.repeat">...</div>
<button v-get="/api/x" v-trigger="click.once">Só uma vez</button>
```

Gatilhos especiais: `load` e `ready` disparam na montagem, `visible` e `revealed` disparam quando
o elemento chega perto da tela. Modificadores aceitos no texto: `once` e `repeat`.

## v-poll

Repete a requisição em intervalo fixo. Pausa quando a aba não está visível.

```html
<div v-get="/api/notificacoes" v-poll="10s" v-target="#sino"></div>
```

## v-load e v-load-visible

Atalhos para carregar conteúdo sem escrever gatilho:

```html
<div v-load="/parciais/rodape.html"></div>
<section v-load-visible="/parciais/depoimentos.html">Carregando...</section>
```

`v-load-visible` só busca quando o elemento chega a 120 pixels da área visível.

## v-search

Busca enquanto o usuário digita, com debounce e comprimento mínimo:

```html
<input v-search="/api/produtos" v-target="#resultados" v-param="q"
       v-min-length="3" v-debounce="400" placeholder="Buscar produtos">

<div id="resultados"></div>
```

| Atributo | Padrão |
| --- | --- |
| `v-param` | o `name` do input, ou `q` |
| `v-debounce` | 300 ms |
| `v-min-length` | 0 |

## v-resource

Cria um objeto reativo com o estado inteiro da requisição:

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

| Campo | O que é |
| --- | --- |
| `data` | Corpo da resposta, ou `null` |
| `loading` | `true` durante a requisição |
| `error` | `{ name, message }`, ou `null` |
| `loaded` | `true` depois do primeiro sucesso |
| `reload()` | Refaz a requisição |
| `set(valor)` | Troca os dados localmente, útil em atualização otimista |

A sintaxe é `nome: url`. Sem nome, o recurso se chama `resource`. Você também pode usar `v-as`:

```html
<div v-resource="/api/pedidos" v-as="pedidos"></div>
```

Atributos aceitos: `v-method`, `v-params`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`,
`v-poll` e `v-manual` (não busca na montagem, espera o `reload()`).

```html
<div v-resource="usuarios: /api/usuarios"
     v-params="{ pagina: pagina, busca: termo }"
     v-cache="30s"
     v-poll="60s">
</div>
```

## Renderizando com um template

Para controlar o HTML da lista, aponte um `<template>` da página:

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

Dentro do template você tem `item` (o objeto inteiro), `index` e cada chave do objeto como
variável direta.

## Guardando no estado

`v-as` guarda a resposta no escopo em vez de escrever no DOM:

```html
<div v-data="{ usuarios: [] }">
  <button v-get="/api/usuarios" v-as="usuarios">Carregar</button>
  <li v-for="u in usuarios">{ u.nome }</li>
</div>
```

`v-json-path` recorta um pedaço da resposta antes:

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

| Atributo | O que faz |
| --- | --- |
| `v-loading` | Seletor de um elemento que fica escondido até a requisição começar |
| `v-loading-class` | Classe aplicada ao elemento durante a requisição. Padrão `v-loading` |
| `v-disable-loading` | Desabilita o botão enquanto a requisição corre |

Durante a requisição o elemento também recebe `aria-busy="true"`.

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

| Atributo | O que faz |
| --- | --- |
| `v-confirm` | Pergunta antes de disparar. Veja o aviso abaixo |
| `v-toast-success` | Notificação de sucesso |
| `v-toast-error` | Notificação de erro. Sem ele, o erro do servidor vira a mensagem |
| `v-on-success` | Expressão executada no sucesso. Tem `$el`, `data` e `response` |
| `v-on-error` | Expressão executada no erro. Tem `$el`, `error` e `message` |
| `v-on-complete` | Expressão executada sempre, no fim |
| `v-redirect` | Navega para a URL depois do sucesso |
| `v-scroll-to` | Rola suavemente até o seletor depois do sucesso |

> **Aviso sobre `v-confirm` junto de uma requisição.** Hoje a pergunta é feita duas vezes quando
> `v-confirm` está no mesmo elemento de um `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` ou
> `v-submit`: uma pela guarda de confirmação, que intercepta o clique, e outra pela própria
> requisição. Enquanto isso não é corrigido, peça a confirmação em um lugar só:
>
> ```html
> <!-- confirmação pela guarda, requisição pela expressão -->
> <button v-confirm="Excluir este pedido?"
>         v-click="$http.delete('/api/pedidos/' + pedido.id).then(() => lista.reload())">
>   Excluir
> </button>
> ```
>
> Ou peça a confirmação dentro da própria expressão:
>
> ```html
> <button v-click="$confirm('Excluir este pedido?').then(ok => ok && excluir(pedido))">
>   Excluir
> </button>
> ```

## Outros atributos

| Atributo | O que faz |
| --- | --- |
| `v-params` | Objeto que vira query string |
| `v-body` | Expressão que vira o corpo da requisição |
| `v-headers` | Objeto de cabeçalhos |
| `v-cache` | Guarda a resposta por um tempo. Só para GET. Aceita `30s`, `5m` |
| `v-retry` | Tentativas extras em falha de rede e erro 5xx |
| `v-timeout` | Tempo até abortar |
| `v-offline-queue` | Guarda a requisição quando o navegador está offline e reenvia depois |

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

Os atalhos devolvem apenas os dados. Para a resposta completa, use `request`:

```js
const resposta = await V.http.request({ url: '/api/usuarios', method: 'GET' });
resposta.data;
resposta.status;
resposta.headers.get('x-total');
resposta.ok;
resposta.raw;     // o Response original
```

## Opções

| Opção | O que faz |
| --- | --- |
| `params` | Objeto que vira query string. Valores nulos e vazios são omitidos |
| `headers` | Cabeçalhos da requisição |
| `timeout` | Milissegundos até abortar. Padrão 30000. `0` desliga |
| `retry` | Tentativas extras em falha de rede e 5xx. A espera dobra a cada rodada. **Só vale sozinho em `GET`, `HEAD` e `OPTIONS`** |
| `retryUnsafe` | Libera o retry em `POST`, `PATCH`, `PUT` e `DELETE`. Leia o aviso abaixo antes de ligar |
| `retryDelay` | Espera inicial entre tentativas. Padrão 500 ms |

### Por que o retry não repete `POST` sozinho

Repetir uma requisição que muda estado pode executar a operação duas vezes. O caso clássico é o
pagamento: o servidor recebe e processa, a resposta se perde no caminho de volta, o cliente entende
como falha de rede e reenvia. O usuário é cobrado duas vezes.

Por isso o retry automático só vale para métodos idempotentes, aqueles em que repetir tem o mesmo
efeito de fazer uma vez: `GET`, `HEAD` e `OPTIONS`.

Para os demais existem dois caminhos, e os dois são explícitos de propósito:

```js
// 1. Você garante que repetir é seguro nesta rota.
V.http.post('/api/eventos', dados, { retry: 2, retryUnsafe: true })

// 2. Melhor: o servidor deduplica pela chave de idempotência.
V.http.post('/api/pagamentos', dados, {
  retry: 2,
  headers: { 'Idempotency-Key': V.uid('pag') },
})
```

A segunda forma é a correta quando a operação realmente importa. A chave precisa ser a mesma nas
tentativas repetidas e o servidor precisa reconhecê-la — sem isso ela não protege nada.

Em desenvolvimento, pedir `retry` num método inseguro sem nenhum dos dois gera aviso no console.
| `cache` | Milissegundos de cache. Só para GET |
| `signal` | `AbortSignal` para cancelar |
| `credentials` | Padrão `same-origin` |
| `responseType` | `auto`, `json`, `text`, `blob`, `arrayBuffer`, `formData` |
| `offlineQueue` | Guarda a requisição quando offline e reenvia ao voltar |

```js
const dados = await V.http.get('/api/produtos', {
  params: { pagina: 2, busca: 'caneca' },
  cache: 60_000,
  retry: 2,
  timeout: 8000,
});
```

## Corpo

Objetos viram JSON com o cabeçalho certo. `FormData`, `Blob`, `URLSearchParams`, `ArrayBuffer` e
texto passam como estão.

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

Erros 4xx não são repetidos. Erros 5xx e falhas de rede respeitam o `retry`.

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

Interceptadores podem ser assíncronos. O de requisição precisa devolver a configuração, e o de
resposta precisa devolver a resposta.

## Autenticação e cabeçalhos padrão

```js
V.http.setBaseURL('https://api.exemplo.com');
V.http.setToken('meu-jwt');                  // Authorization: Bearer meu-jwt
V.http.setToken('chave', 'Token');           // Authorization: Token chave
V.http.setToken(null);                       // remove
V.http.setHeader('Accept-Language', 'pt-BR');
V.http.setHeader('Accept-Language', null);   // remove
```

Toda requisição já leva `X-Requested-With: XMLHttpRequest`. Em métodos que escrevem, o token CSRF
é lido de `<meta name="csrf-token" content="...">` e enviado em `X-CSRF-TOKEN`. Os nomes são
configuráveis em `V.http.defaults.csrfMeta` e `V.http.defaults.csrfHeader`.

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

Usa `XMLHttpRequest` por baixo, porque só ele reporta progresso real de envio.

## Server-Sent Events

```js
const fonte = V.http.sse('/api/eventos', {
  message: (dados) => console.log(dados),
  error: (e) => console.warn('conexão caiu', e),
});

fonte.close();
```

O JSON é convertido automaticamente quando possível.

## Streaming linha a linha

```js
await V.http.stream('/api/logs', (linha) => {
  console.log(JSON.parse(linha));
});
```

Ideal para NDJSON e respostas longas.

## Cache

```js
await V.http.get('/api/config', { cache: 300_000 });
V.http.clearCache();               // limpa tudo
V.http.clearCache('/api/produtos');// limpa o que contém o texto
V.http.clearCache(/^GET \/api\//); // limpa pelo padrão
```

## Fila offline

Requisições com `offlineQueue: true` disparadas com o navegador offline são guardadas no
`localStorage` e reenviadas automaticamente quando a conexão volta.

```js
await V.http.post('/api/pedidos', pedido, { offlineQueue: true });
await V.http.flushOfflineQueue();   // força o reenvio
```

A resposta imediata é sintética, com `status: 0` e `statusText: 'offline-queued'`.

## No HTML

O cliente inteiro está disponível como `$http` dentro de qualquer expressão:

```html
<button v-click="$http.post('/api/curtidas', { id: post.id }).then(() => post.curtido = true)">
  Curtir
</button>
```

---

Anterior: [Eventos](eventos.md) · Próximo: [Formulários](formularios.md)
