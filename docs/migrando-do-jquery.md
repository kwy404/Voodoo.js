# Migrating from jQuery

Voodoo.js has a chainable collection with the same ergonomics as jQuery, so much of your
code looks similar. The fundamental difference is this: in jQuery you **command the DOM to change**, in
Voodoo you **describe the state** and the DOM follows.

You can migrate gradually. The two libraries coexist on the same page.

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

## The leap: stop commanding, start describing

This is the point that changes everything. A counter in jQuery:

```html
<div id="counter">
  <button class="less">-</button>
  <span class="value">0</span>
  <button class="more">+</button>
</div>
```

```js
let value = 0;
$('#counter .more').on('click', function () {
  value++;
  $('#counter .value').text(value);
  $('#counter .less').prop('disabled', value === 0);
});
$('#counter .less').on('click', function () {
  value--;
  $('#counter .value').text(value);
  $('#counter .less').prop('disabled', value === 0);
});
```

The same in Voodoo.js:

```html
<div v-data="{ value: 0 }">
  <button v-click="value--" :disabled="value === 0">-</button>
  <span>{ value }</span>
  <button v-click="value++">+</button>
</div>
```

The rule "the minus button is disabled at zero" appears **once**, where it matters. In jQuery it had to be
repeated everywhere that changed the value, and forgetting one repetition was the classic bug.

## A list

```js
// jQuery
function render(items) {
  const $ul = $('#list').empty();
  items.forEach((item) => {
    $ul.append(`<li data-id="${item.id}">${item.name} <button class="x">remove</button></li>`);
  });
}
$('#list').on('click', '.x', function () {
  const id = $(this).closest('li').data('id');
  items = items.filter((i) => i.id !== id);
  render(items);
});
```

```html
<!-- Voodoo.js -->
<ul v-data="{ items: [] }">
  <li v-for="item in items" :key="item.id">
    { item.name }
    <button v-click="items.splice(items.indexOf(item), 1)">remove</button>
  </li>
</ul>
```

There's no render function. No delegation. No `data-id` just to find the item
back.

## An AJAX form

```js
// jQuery
$('#form').on('submit', function (e) {
  e.preventDefault();
  const $btn = $(this).find('button').prop('disabled', true).text('Sending...');
  $.post('/api/contact', $(this).serialize())
    .done(() => { alert('Sent!'); this.reset(); })
    .fail((xhr) => { $('#error').text(xhr.responseJSON.message); })
    .always(() => { $btn.prop('disabled', false).text('Send'); });
});
```

```html
<!-- Voodoo.js -->
<form v-submit="/api/contact" v-validate v-reset-success v-disable-loading
      v-toast-success="Sent!">
  <input name="name" v-required>
  <input name="email" type="email" v-required v-email>
  <button>{ $form.loading ? 'Sending...' : 'Send' }</button>
</form>
```

Validation, loading state, field errors and notification come together.

## jQuery plugins

A plugin that needs an element becomes a directive:

```js
// jQuery
$('.date').datepicker({ format: 'dd/mm/yyyy' });

// Voodoo.js
V.directive('datepicker', {
  mounted(el, binding) {
    el.__picker = new YourDatepicker(el, { format: binding.value || 'dd/mm/yyyy' });
  },
  unmounted(el) {
    el.__picker.destroy();
  },
});
```

```html
<input v-datepicker="'dd/mm/yyyy'">
```

The advantage: elements created later, by `v-for` or a request, are already initialized.
With jQuery you'd need to call the plugin again on each render.

## Coexisting with jQuery

```html
<script src="jquery.min.js"></script>
<script src="voodoo.full.min.js" defer></script>
```

The two use standard DOM, so they don't fight. A common migration path:

1. swap `$.ajax` for `V.http` in new requests;
2. swap blocks that render HTML in JavaScript with `v-for` and `v-if`;
3. swap forms with `v-submit`;
4. leave old plugins for last, turning them into directives when you have time.

When no `$` is left, remove jQuery.

---

Previous: [Performance](desempenho.md) · Next: [Migrating from Alpine](migrando-do-alpine.md)
