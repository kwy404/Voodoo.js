# Languages

> This module only comes in `voodoo.full.min.js` or in a custom build.

Reactive internationalization. Changing the language doesn't reload the page: all text that went
through `t()` and all number, currency, or date formatters update by themselves, because everything
reads from the same reactive state.

## Configuring

```js
V.i18n({
  locale: 'pt-BR',
  fallback: 'en',
  messages: {
    'pt-BR': {
      comum: { salvar: 'Salvar', cancelar: 'Cancelar' },
      ola: 'Olá, {nome}!',
      itens: 'nenhum item | {n} item | {n} itens',
    },
    en: {
      comum: { salvar: 'Save', cancelar: 'Cancel' },
      ola: 'Hello, {nome}!',
      itens: 'no items | {n} item | {n} items',
    },
  },
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `locale` | `V.config.locale` | Initial language |
| `fallback` | `en` | Language used when the key doesn't exist |
| `messages` | | Messages by language |
| `currency` | `V.config.currency` | Default currency for `c()` |
| `persist` | `true` | Saves the chosen language in `localStorage` |
| `detect` | `true` | Detects browser language when nothing was saved |
| `loadPath` | | URL template for on-demand loading, with `{locale}` |

The order of language selection is: what was saved, what's detected in the browser, what's declared
in the option, and finally the fallback. The chosen language also goes to `document.documentElement.lang`.

## Messages

The tree accepts nesting at any level, and the key is read by dot:

```js
{ common: { buttons: { save: 'Save' } } }   // t('common.buttons.save')
```

The flattened map also works:

```js
{ 'common.buttons.save': 'Save' }
```

When the key doesn't exist anywhere, `t()` returns the key itself. This is better than empty
text on screen and makes it easy to find what's missing.

## v-t

```html
<button v-t="comum.salvar"></button>
<abbr v-t:title="comum.dica">?</abbr>
<span v-t="'menu.' + secao"></span>
```

Without argument, translates the element's content. With argument, writes to the indicated attribute.

## Interpolation

```js
{ hello: 'Hello, {name}!' }
```

```html
<span>{ $t('hello', { name: user.name }) }</span>
```

`v-t-params` also exists:

```html
<span v-t="hello" v-t-params="{ name: user.name }"></span>
```

> A honest warning: `v-t-params` is read only on first render. If the text needs to follow
> language changes or value changes, use interpolation with `$t`, which is fully reactive.

## Pluralization

Forms are separated by pipe:

```js
{
  items: 'no items | {n} item | {n} items',
  messages: '{n} message | {n} messages',
}
```

```html
<span>{ $t('items', { n: cart.length }) }</span>
<span>{ $t('items', cart.length) }</span>     <!-- shortcut for the same case -->
```

How forms are chosen:

- **two forms** follow the language's `Intl.PluralRules` category directly;
- **three forms** reserve the first for zero, which is the custom in Portuguese and English;
- **four or more** use the official order of CLDR categories, covering languages with dual and
  paucal.

The count is read from `n` or `count`.

## Changing the language

```html
<button v-locale="pt-BR">Portuguese</button>
<button v-locale="en">English</button>
<button v-locale="chosenLanguage">Switch</button>
```

The active language button receives the `v-locale-active` class.

Via JavaScript:

```js
await V.setLocale('en');
V.getLocale();       // 'en'
V.i18n.locales;      // languages with loaded messages
```

The entire screen updates by itself, including numbers, currencies and dates.

## Loading on demand

```js
V.i18n({
  locale: 'pt-BR',
  loadPath: '/i18n/{locale}.json',
  messages: { 'pt-BR': ptBR },
});

await V.i18n.loadMessages('es', '/i18n/es.json');
V.i18n.addMessages('es', { common: { save: 'Save' } });
```

With `loadPath`, switching to a language without loaded messages fetches the file automatically.
Repeated calls for the same language share the same promise, so there's no duplicate request.

## Formatters

All use the current language and are reactive.

```html
<span>{ $n(1234.5) }</span>                 <!-- 1.234,5 -->
<span>{ $n(0.75, { style: 'percent' }) }</span>
<span>{ $c(1234.5) }</span>                 <!-- R$ 1.234,50 -->
<span>{ $c(99, 'USD') }</span>              <!-- US$ 99,00 -->
<span>{ $d(order.createdAt) }</span>        <!-- 28/08/2026 -->
<span>{ $d(order.createdAt, 'long') }</span>
<span>{ $rt(order.createdAt) }</span>       <!-- 5 minutes ago -->
```

Presets for `$d`: `short`, `long`, `full`, `time`, `datetime`. You can also pass an `Intl.DateTimeFormatOptions`
object or a text mask like `DD/MM/YYYY HH:mm`.

## Magics

| Magic | What it is |
| --- | --- |
| `$t` | Translates |
| `$locale` | Active language, reactive |
| `$i18n` | The entire module |
| `$n` | Formats number |
| `$c` | Formats currency |
| `$d` | Formats date |
| `$rt` | Relative time |

```html
<p>You are reading in { $locale }</p>
<div :lang="$locale">...</div>
```

The `lang` attribute of the root element is already updated by itself each time the language changes.

## Complete API

```js
V.t('common.save');
V.t('hello', { name: 'Ana' });
V.setLocale('en');
V.getLocale();

V.i18n.te('common.save');        // does the key exist?
V.i18n.messagesOf('pt-BR');
V.i18n.addMessages('fr', { ... });
V.i18n.loadMessages('fr', '/i18n/fr.json');
V.i18n.detectLocale();
V.i18n.locale;
V.i18n.fallback;
V.i18n.locales;
```

## A complete example

```html
<div v-data="{ cart: [] }">
  <header>
    <button v-locale="pt-BR">PT</button>
    <button v-locale="en">EN</button>
    <button v-locale="es">ES</button>
  </header>

  <h1 v-t="store.title"></h1>
  <p>{ $t('cart.items', cart.length) }</p>
  <p>{ $c(total) }</p>

  <button v-t="common.checkout" v-click="checkout()"></button>
</div>
```

```js
V.i18n({
  locale: 'pt-BR',
  fallback: 'en',
  loadPath: '/i18n/{locale}.json',
  messages: {
    'pt-BR': {
      store: { title: 'Our store' },
      cart: { items: 'empty cart | {n} item in cart | {n} items in cart' },
      common: { checkout: 'Complete purchase' },
    },
  },
});
```

---

Previous: [Router](roteador.md) · Next: [Theme and palette](tema-e-paleta.md)
