# Migrando do jQuery

A Voodoo.js tem uma coleção encadeável com a mesma ergonomia do jQuery, então boa parte do seu
código continua parecido. A diferença de fundo é outra: no jQuery você **manda o DOM mudar**, na
Voodoo você **descreve o estado** e o DOM acompanha.

Você pode migrar aos poucos. As duas bibliotecas convivem na mesma página.

## Seleção e percurso

| jQuery | Voodoo.js |
| --- | --- |
| `$('#app')` | `V('#app')` |
| `$('.item', contexto)` | `V('.item', contexto)` |
| `$(elemento)` | `V(elemento)` |
| `$('<li>novo</li>')` | `V('<li>novo</li>')` ou `V.fromHtml('<li>novo</li>')` |
| `$(function () {})` | `V(function () {})` ou `V.ready(fn)` |
| `.find('.x')` | `.find('.x')` |
| `.closest('.card')` | `.closest('.card')` |
| `.parent()`, `.parents()` | iguais |
| `.children()`, `.siblings()` | iguais |
| `.next()`, `.prev()` | iguais |
| `.first()`, `.last()`, `.eq(2)` | iguais |
| `.filter()`, `.not()`, `.has()`, `.is()` | iguais |
| `.add()`, `.slice()` | iguais |
| `.each(fn)` | `.each(fn)` |
| `.get()`, `.toArray()` | iguais |
| `.length` | `.length` |
| `$(...)[0]` | `V(...)[0]` |

A coleção da Voodoo é iterável com `for...of` e com espalhamento:

```js
for (const el of V('.item')) console.log(el);
const lista = [...V('.item')];
```

## Conteúdo e atributos

| jQuery | Voodoo.js |
| --- | --- |
| `.text()`, `.text('x')` | iguais |
| `.html()`, `.html('<b>x</b>')` | iguais |
| `.val()`, `.val('x')` | iguais |
| `.attr('href')`, `.attr('href', '/x')` | iguais |
| `.attr({ a: 1, b: 2 })` | igual |
| `.removeAttr('x')` | igual |
| `.prop('checked', true)` | igual |
| `.data()`, `.data('id')`, `.data('id', 7)` | iguais |

## Classes e estilo

| jQuery | Voodoo.js |
| --- | --- |
| `.addClass('a b')` | igual |
| `.removeClass('a')` | igual |
| `.toggleClass('a', force)` | igual |
| `.hasClass('a')` | igual |
| `.css('color')`, `.css('color', 'red')` | iguais |
| `.css({ color: 'red' })` | igual |
| `.width()`, `.height()` | iguais |
| `.offset()`, `.position()` | iguais |
| `.scrollTop()`, `.scrollTop(0)` | iguais |

## Estrutura

| jQuery | Voodoo.js |
| --- | --- |
| `.append()`, `.prepend()` | iguais |
| `.before()`, `.after()` | iguais |
| `.appendTo()`, `.prependTo()` | iguais |
| `.replaceWith()` | igual |
| `.wrap()`, `.unwrap()` | iguais |
| `.remove()`, `.empty()` | iguais |
| `.clone()` | igual |

`.remove()` e `.empty()` da Voodoo também desmontam os efeitos reativos dos elementos removidos,
o que evita vazamento.

## Eventos

| jQuery | Voodoo.js |
| --- | --- |
| `.on('click', fn)` | `.on('click', fn)` |
| `.on('click', '.botao', fn)` | `.on('click', '.botao', fn)` (delegação) |
| `.one('click', fn)` | `.once('click', fn)` |
| `.off('click')` | `.off('click')` |
| `.trigger('click')` | `.trigger('click')` |
| `.trigger('meu:evento', dados)` | `.emit('meu:evento', dados)` |
| `.click()`, `.focus()`, `.blur()` | `.trigger('click')`, `.focus()`, `.blur()` |

Dentro do handler, `this` é o elemento, como no jQuery.

## Efeitos

| jQuery | Voodoo.js |
| --- | --- |
| `.show()`, `.hide()`, `.toggle()` | iguais |
| `.fadeIn()`, `.fadeOut()` | iguais |
| `.slideUp()`, `.slideDown()`, `.slideToggle()` | iguais |
| `.animate({...}, 400)` | `.animate({...}, 400)` |

## AJAX

| jQuery | Voodoo.js |
| --- | --- |
| `$.get(url)` | `V.http.get(url)` |
| `$.post(url, dados)` | `V.http.post(url, dados)` |
| `$.getJSON(url)` | `V.http.get(url)` |
| `$.ajax({ url, method, data })` | `V.http.request({ url, method, body })` |
| `$('#form').serialize()` | `V('#form').serialize()` |
| `$('#form').serializeArray()` | `V('#form').serializeObject()` |
| `$.ajaxSetup({ headers })` | `V.http.setHeader(nome, valor)` |

```js
// jQuery
$.ajax({ url: '/api/x', method: 'POST', data: JSON.stringify(d), contentType: 'application/json' })
  .done((r) => console.log(r))
  .fail((e) => console.error(e));

// Voodoo.js
try {
  const r = await V.http.post('/api/x', d);
  console.log(r);
} catch (e) {
  console.error(e);
}
```

## Utilitários

| jQuery | Voodoo.js |
| --- | --- |
| `$.each(lista, fn)` | `lista.forEach(fn)` |
| `$.map(lista, fn)` | `lista.map(fn)` |
| `$.grep(lista, fn)` | `lista.filter(fn)` |
| `$.extend(true, a, b)` | `V.merge(a, b)` |
| `$.trim(s)` | `s.trim()` |
| `$.isArray(x)` | `Array.isArray(x)` |
| `$.param(obj)` | `new URLSearchParams(obj).toString()` |

## O salto: pare de mandar, comece a descrever

Este é o ponto que muda tudo. Um contador em jQuery:

```html
<div id="contador">
  <button class="menos">-</button>
  <span class="valor">0</span>
  <button class="mais">+</button>
</div>
```

```js
let valor = 0;
$('#contador .mais').on('click', function () {
  valor++;
  $('#contador .valor').text(valor);
  $('#contador .menos').prop('disabled', valor === 0);
});
$('#contador .menos').on('click', function () {
  valor--;
  $('#contador .valor').text(valor);
  $('#contador .menos').prop('disabled', valor === 0);
});
```

O mesmo em Voodoo.js:

```html
<div v-data="{ valor: 0 }">
  <button v-click="valor--" :disabled="valor === 0">-</button>
  <span>{ valor }</span>
  <button v-click="valor++">+</button>
</div>
```

A regra "o botão de menos fica desabilitado no zero" aparece **uma vez**, no lugar onde ela
importa. No jQuery ela precisava ser repetida em todo lugar que mexia no valor, e esquecer uma
repetição era o bug clássico.

## Uma lista

```js
// jQuery
function renderizar(itens) {
  const $ul = $('#lista').empty();
  itens.forEach((item) => {
    $ul.append(`<li data-id="${item.id}">${item.nome} <button class="x">remover</button></li>`);
  });
}
$('#lista').on('click', '.x', function () {
  const id = $(this).closest('li').data('id');
  itens = itens.filter((i) => i.id !== id);
  renderizar(itens);
});
```

```html
<!-- Voodoo.js -->
<ul v-data="{ itens: [] }">
  <li v-for="item in itens" :key="item.id">
    { item.nome }
    <button v-click="itens.splice(itens.indexOf(item), 1)">remover</button>
  </li>
</ul>
```

Não existe função de renderizar. Não existe delegação. Não existe `data-id` só para achar o item
de volta.

## Um formulário AJAX

```js
// jQuery
$('#form').on('submit', function (e) {
  e.preventDefault();
  const $btn = $(this).find('button').prop('disabled', true).text('Enviando...');
  $.post('/api/contato', $(this).serialize())
    .done(() => { alert('Enviado!'); this.reset(); })
    .fail((xhr) => { $('#erro').text(xhr.responseJSON.message); })
    .always(() => { $btn.prop('disabled', false).text('Enviar'); });
});
```

```html
<!-- Voodoo.js -->
<form v-submit="/api/contato" v-validate v-reset-success v-disable-loading
      v-toast-success="Enviado!">
  <input name="nome" v-required>
  <input name="email" type="email" v-required v-email>
  <button>{ $form.loading ? 'Enviando...' : 'Enviar' }</button>
</form>
```

Validação, estado de carregamento, erros por campo e notificação vêm juntos.

## Plugins do jQuery

Um plugin que precisa de um elemento vira uma directive:

```js
// jQuery
$('.data').datepicker({ format: 'dd/mm/yyyy' });

// Voodoo.js
V.directive('datepicker', {
  mounted(el, binding) {
    el.__picker = new SeuDatepicker(el, { format: binding.value || 'dd/mm/yyyy' });
  },
  unmounted(el) {
    el.__picker.destroy();
  },
});
```

```html
<input v-datepicker="'dd/mm/yyyy'">
```

A vantagem: elementos criados depois, por `v-for` ou por uma requisição, já nascem inicializados.
Com jQuery você precisaria chamar o plugin de novo a cada renderização.

## Convivendo com o jQuery

```html
<script src="jquery.min.js"></script>
<script src="voodoo.min.js" defer></script>
```

As duas usam o DOM padrão, então não brigam. Um caminho comum de migração:

1. troque `$.ajax` por `V.http` nas requisições novas;
2. troque blocos que renderizam HTML em JavaScript por `v-for` e `v-if`;
3. troque formulários por `v-submit`;
4. deixe os plugins antigos por último, virando directives quando sobrar tempo.

Quando não sobrar nenhum `$`, remova o jQuery.

---

Anterior: [Desempenho](desempenho.md) · Próximo: [Migrando do Alpine](migrando-do-alpine.md)
