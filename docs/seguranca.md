# Segurança

## Por que não usa eval

Muita biblioteca que interpreta expressões dentro de atributos usa `new Function('with(scope){ ... }')`.
É rápido de escrever e funciona bem, mas traz duas consequências: a página precisa de
`unsafe-eval` na Content Security Policy, e qualquer texto que chegue a um atributo vira código
executável com acesso a tudo.

A Voodoo.js não faz isso. Toda expressão passa por três etapas escritas à mão dentro da
biblioteca:

1. um **lexer**, que quebra o texto em tokens;
2. um **parser Pratt**, que monta a árvore sintática;
3. um **interpretador de árvore**, que avalia nó a nó, dentro do escopo.

Nenhum `eval`, nenhum `new Function`, nenhum `setTimeout` com string.

## Content Security Policy

A biblioteca funciona com uma política restritiva:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

O `'unsafe-inline'` em `style-src` existe porque o CSS dos componentes de interface é injetado em
tempo de execução. Para dispensá-lo, desligue a injeção e carregue o CSS por conta própria:

```html
<script src="voodoo.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

Com isso a política pode ficar assim:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
```

`unsafe-eval` nunca é necessário, em nenhuma configuração.

## Superfície de acesso das expressões

Um identificador dentro de uma expressão é procurado no escopo. Quando não existe em nenhum
escopo, a busca cai em uma lista fechada de globais:

```
Math  JSON  Date  Number  String  Boolean  Array  Object  Intl  RegExp  Promise
parseInt  parseFloat  isNaN  isFinite  encodeURIComponent  decodeURIComponent  console
```

Tudo fora dessa lista devolve `undefined`:

```js
window       // undefined
document     // undefined
fetch        // undefined
eval         // undefined
globalThis   // undefined
localStorage // undefined
```

Um atributo com `v-text="document.cookie"` não lê nada. Isso reduz bastante o estrago possível
quando um atributo é montado a partir de dados que você não controla, mas **não é uma sandbox**.
Continua valendo a regra de sempre: nunca coloque conteúdo de usuário dentro de um atributo `v-*`
sem escapar.

O acesso a serviços é explícito, pelas variáveis mágicas: `$el`, `$refs`, `$http`, `$storage`,
`$clipboard`. Elas são opt-in por design, então dá para auditar o que uma página consegue fazer
lendo os próprios atributos.

## v-html e XSS

`v-html` insere HTML sem escapar. Ele existe porque conteúdo vindo de um editor de texto rico
precisa disso, e não tem outro jeito honesto de resolver.

**Nunca use `v-html` com conteúdo que veio do usuário sem sanitizar antes.**

```html
<!-- perigoso -->
<div v-html="comentario.texto"></div>

<!-- seguro -->
<div v-text="comentario.texto"></div>
```

Quando o HTML é realmente necessário, sanitize no servidor ou no cliente com uma biblioteca
dedicada:

```js
import DOMPurify from 'dompurify';

V.config.globals.limpar = (html) => DOMPurify.sanitize(html);
```

```html
<div v-html="limpar(artigo.corpo)"></div>
```

Um detalhe importante: o HTML inserido por `v-html` **é percorrido pela Voodoo**, então ele pode
trazer directives. Um `v-html` com conteúdo de usuário permite injetar `v-click`, `v-init` e
qualquer outro atributo. Isso reforça a regra acima.

O mesmo vale para respostas HTML de `v-get`, `v-post` e `v-target`: o conteúdo é inicializado
pela biblioteca. Confie apenas em respostas do seu próprio servidor.

A opção `html` das notificações (`V.toast({ html })`) também insere sem escapar. Use só com
conteúdo próprio.

## O que a biblioteca escapa sozinha

| Situação | Comportamento |
| --- | --- |
| `{ interpolacao }` | Escrita como texto, nunca como HTML |
| `v-text` | Escrita como texto |
| Resposta JSON renderizada por `v-get` | Todos os valores passam por `escapeHtml` |
| Mensagens de validação | Escritas como texto |
| Conteúdo de toast, alert, confirm e prompt | Escrito como texto, salvo quando você usa `html` |
| Rótulos e valores dos gráficos | Escritos como texto do SVG |
| `V.escapeHtml(texto)` | Disponível quando você monta HTML na mão |

## CSRF

Requisições que escrevem (`POST`, `PUT`, `PATCH`, `DELETE`) enviam automaticamente o token lido de
uma meta tag:

```html
<meta name="csrf-token" content="{{ token }}">
```

O cabeçalho enviado é `X-CSRF-TOKEN`. Os dois nomes são configuráveis:

```js
V.http.defaults.csrfMeta = 'meu-token';
V.http.defaults.csrfHeader = 'X-Meu-Token';
```

Toda requisição também leva `X-Requested-With: XMLHttpRequest`, o que ajuda o servidor a
distinguir chamadas AJAX.

O padrão de `credentials` é `same-origin`, então cookies não vazam para outra origem sem que você
peça.

## Dados sensíveis no armazenamento

`V.storage`, `V.session` e `v-persist` gravam no armazenamento do navegador, que é legível por
qualquer script da mesma origem. Não guarde ali tokens de longa duração, dados de cartão ou
qualquer coisa que não possa ser lida por uma extensão instalada no navegador do usuário.

Para tokens, prefira cookies com `HttpOnly` definidos pelo servidor. Quando isso não for possível,
use `V.session`, que morre com a aba, em vez de `V.storage`.

```js
V.cookie.set('preferencia', 'escuro', { secure: true, sameSite: 'Strict' });
```

Lembre também que `v-sync` publica o estado do escopo em um `BroadcastChannel`, visível para
qualquer aba da mesma origem. Não sincronize dados sensíveis.

## Uploads

`v-upload` e `v-dropzone` enviam o que o usuário escolher. Todas as validações que importam
(tipo, tamanho, conteúdo real do arquivo) precisam acontecer no servidor. Os atributos `accept` e
`multiple` são conveniência de interface, não segurança.

## Terceiros no CDN

Ao carregar do CDN, fixe a versão e considere usar integridade de sub-recurso:

```html
<script
  src="https://cdn.jsdelivr.net/npm/voodoojs@0.1.0/dist/voodoo.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
  defer
></script>
```

O hash correto acompanha cada versão publicada. Em ambientes com política mais rígida, sirva o
arquivo do seu próprio domínio.

## Cabeçalhos recomendados

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Reportando uma vulnerabilidade

Não abra uma issue pública. Descreva o problema, com passos para reproduzir, em um contato privado
do projeto. Veja [Contribuindo](contribuindo.md).

---

Anterior: [API](api.md) · Próximo: [Desempenho](desempenho.md)
