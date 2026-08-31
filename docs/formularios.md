# Formulários

Um formulário completo, com envio por AJAX, validação, estado de carregamento, tratamento de erro
do servidor e notificação, cabe em um bloco de HTML:

```html
<form v-submit="/api/usuarios" v-validate
      v-toast-success="Usuário salvo!" v-reset-success v-disable-loading>
  <input name="nome" v-required>
  <input name="email" type="email" v-required v-email>
  <button type="submit" :disabled="$form.loading">Salvar</button>
</form>
```

## v-submit

Intercepta o `submit`, serializa os campos e envia por AJAX. O método padrão é `POST`, e ele pode
vir do atributo `method` do formulário ou de `v-method`.

```html
<form v-submit="/api/usuarios/7" v-method="PUT">...</form>
```

A URL aceita interpolação de estado com chaves:

```html
<div v-data="{ usuario: { id: 7 } }">
  <form v-submit="/api/usuarios/{ usuario.id }" v-method="PUT">...</form>
</div>
```

Quando `V.config.baseURL` está definido, ele é aplicado a URLs relativas.

## $form

Dentro de um formulário com `v-submit`, `v-upload`, `v-dropzone` ou `v-autosave`, a magia `$form`
descreve o estado atual:

| Campo | O que é |
| --- | --- |
| `loading` | `true` enquanto a requisição corre |
| `saving` | `true` enquanto o autosave grava |
| `success` | `true` depois de uma resposta bem sucedida |
| `errors` | Objeto com os erros por `name` de campo |
| `message` | Mensagem devolvida pelo servidor |
| `data` | Corpo da última resposta |
| `status` | Status HTTP da última resposta |
| `dirty` | `true` quando há alterações não enviadas |
| `progress` | Progresso do upload, de 0 a 100 |

```html
<form v-submit="/api/contato">
  <button :disabled="$form.loading">
    { $form.loading ? 'Enviando...' : 'Enviar' }
  </button>

  <p v-show="$form.success">{ $form.message || 'Recebemos sua mensagem.' }</p>
  <p v-show="$form.errors.email">{ $form.errors.email }</p>
</form>
```

## Opções

Todas podem ser declaradas no próprio formulário. Elementos dentro do formulário herdam o valor.

| Atributo | O que faz |
| --- | --- |
| `v-method` | Verbo HTTP. Padrão `POST` |
| `v-validate` | Liga a validação automática dos campos |
| `v-confirm` | Pergunta antes de enviar. Veja o aviso no fim desta seção |
| `v-toast-success` | Notificação de sucesso. Vazio usa a mensagem do servidor |
| `v-toast-error` | Notificação de erro |
| `v-reset-success` | Limpa o formulário depois do sucesso |
| `v-redirect` | Navega depois do sucesso. Vazio usa `redirect` ou `url` da resposta |
| `v-disable-loading` | Desabilita os botões de envio durante a requisição |
| `v-loading-class` | Classes extras aplicadas ao formulário durante a requisição |
| `v-loading` | Seletor de um elemento que só aparece durante a requisição |
| `v-on-success` | Expressão executada no sucesso |
| `v-on-error` | Expressão executada no erro |
| `v-on-complete` | Expressão executada sempre, no fim |
| `v-target` e `v-swap` | Troca um pedaço da página com o HTML devolvido |
| `v-form-data` | Força o envio como `FormData`, mesmo sem arquivo |

Dentro de `v-on-success` e `v-on-error` você tem `$data`, `$response`, `$form` e `$el`:

```html
<form v-submit="/api/pedidos"
      v-on-success="pedidos.unshift($data); $toast.success('Pedido ' + $data.id)"
      v-on-error="console.warn($data)">
</form>
```

> **Aviso sobre `v-confirm`.** Hoje a pergunta aparece duas vezes quando `v-confirm` está no mesmo
> elemento de um `v-submit`: uma pela guarda de confirmação, que intercepta o clique, e outra pela
> própria rotina de envio. Enquanto isso não é corrigido, deixe o atributo de fora e peça a
> confirmação no botão:
>
> ```html
> <form v-submit="/api/pedidos">
>   <input name="quantidade" type="number" v-required>
>   <button type="button"
>           v-click="$confirm('Confirmar o pedido?').then(ok => ok && $el.form.requestSubmit())">
>     Enviar
>   </button>
> </form>
> ```

## Serialização

O corpo é montado a partir dos campos com `name`. Nomes com colchetes viram estruturas:

```html
<input name="usuario[nome]">
<input name="usuario[endereco][rua]">
<input name="tags[]" value="a">
<input name="tags[]" value="b">
```

vira

```json
{ "usuario": { "nome": "...", "endereco": { "rua": "..." } }, "tags": ["a", "b"] }
```

Regras:

- campos desabilitados ficam de fora;
- textos passam por `trim`;
- `type="number"` e `type="range"` viram número;
- um checkbox sozinho vira booleano; vários com o mesmo `name` viram lista dos marcados;
- radio envia apenas o escolhido;
- select múltiplo vira lista;
- quando existe arquivo selecionado, o corpo inteiro vira `FormData`.

Por JavaScript:

```js
const dados = V.serializeForm(document.forms[0]);
const comArquivos = V.serializeForm(form, { formData: true });
V.serializeForm(form, { includeDisabled: true, trim: false, numbers: false });
```

E na coleção de DOM:

```js
V('#formulario').serialize();        // 'nome=ana&email=a%40b.com'
V('#formulario').serializeObject();  // { nome: 'ana', email: 'a@b.com' }
```

## Erros do servidor

Uma resposta 422, ou qualquer resposta com um mapa de erros, é distribuída de volta para os campos
certos. Formatos entendidos:

```json
{ "errors": { "email": "Já cadastrado" } }
{ "email": ["Já cadastrado"] }
{ "message": "Dados inválidos", "errors": { "cpf": "Inválido" } }
```

Mensagens sem campo correspondente aparecem em um resumo no topo do formulário. O foco vai para o
primeiro campo com erro.

## Troca de HTML na resposta

Se o servidor devolve HTML em vez de JSON:

```html
<form v-submit="/api/comentarios" v-target="#comentarios" v-swap="append" v-reset-success>
  <textarea name="texto"></textarea>
  <button>Comentar</button>
</form>

<ul id="comentarios"></ul>
```

Modos de `v-swap`: `innerHTML` (padrão), `inner`, `outer`, `outerHTML`, `replace`, `append`,
`beforeend`, `prepend`, `afterbegin`, `beforebegin`, `afterend`, `text`, `none`.

O HTML recebido é percorrido pela Voodoo, então ele pode trazer novas directives.

## Upload de arquivo

```html
<form v-submit="/api/perfil">
  <input type="file" name="foto" v-upload="/api/upload">
</form>
```

`v-upload` envia assim que o arquivo é escolhido, com progresso real. Uma barra é criada logo
depois do input, a menos que você aponte a sua com `v-progress`:

```html
<input type="file" name="anexo" v-upload="/api/upload" v-progress="#barra">
<progress id="barra" max="100" value="0"></progress>
```

O progresso também está em `$form.progress`:

```html
<div class="barra" :style="{ width: $form.progress + '%' }"></div>
```

Campos comuns do formulário em volta acompanham o arquivo no envio.

## Dropzone

```html
<div v-dropzone="/api/upload" v-field="anexos" accept="image/*" multiple>
  Arraste imagens aqui ou clique para escolher
</div>
```

A área ganha papel de botão, foco por teclado (Enter e espaço abrem o seletor), destaque ao
arrastar por cima e as classes `v-dropzone-over`, `v-dropzone-busy` e `v-dropzone-error`.

| Atributo | O que faz |
| --- | --- |
| `v-field` | Nome do campo enviado. Padrão `file` |
| `accept` | Tipos aceitos, repassados ao seletor nativo |
| `multiple` | Permite vários arquivos |
| `v-progress` | Seletor da barra de progresso |

## Autosave

Salva sozinho enquanto o usuário digita:

```html
<form v-autosave="/api/rascunhos/7" v-method="PUT">
  <input name="titulo">
  <textarea name="corpo"></textarea>
</form>
```

Um indicador de estado é criado dentro do formulário, mostrando "Salvando...", "Alterações
salvas" ou "Não foi possível salvar". Aponte o seu com `v-autosave-status="#estado"`.

O intervalo padrão é 1000 ms. Para mudar:

```html
<form v-autosave="/api/rascunhos/7" v-autosave-delay="3s">...</form>
<form v-autosave.2s="/api/rascunhos/7">...</form>
```

## Aviso ao sair da página

```html
<form v-submit="/api/artigos" v-guard="Você tem alterações não salvas.">
  ...
</form>
```

`v-guard` marca o formulário como sujo a cada alteração e pede confirmação antes de fechar a aba.
O estado volta a limpo depois de um envio bem sucedido ou de um `reset`.

## Eventos

```html
<form v-submit="/api/x"
      @voodoo:submit="console.log('enviando', $detail.url)"
      @voodoo:invalid="console.log('erros', $detail.errors)"
      @voodoo:success="console.log($detail.data)"
      @voodoo:error="console.log($detail.status)"
      @voodoo:complete="console.log('fim')">
</form>
```

| Evento | Quando |
| --- | --- |
| `voodoo:submit` | Depois de validar, antes de enviar |
| `voodoo:invalid` | Validação reprovou |
| `voodoo:success` | Resposta bem sucedida |
| `voodoo:error` | Falha |
| `voodoo:complete` | Sempre, no fim |
| `voodoo:upload` | Início de um envio de arquivos |
| `voodoo:progress` | A cada avanço do upload |
| `voodoo:autosave` | Gravação automática concluída |
| `voodoo:field-validated` | Um campo foi validado |

## Formulário sem AJAX

`v-model` funciona em qualquer formulário, com ou sem `v-submit`:

```html
<div v-data="{ form: { nome: '', email: '' } }">
  <input v-model.trim="form.nome">
  <input v-model.trim="form.email">
  <pre>{ form }</pre>
  <button v-click="$http.post('/api/x', form)">Enviar à mão</button>
</div>
```

---

Anterior: [HTTP](http.md) · Próximo: [Validação](validacao.md)
