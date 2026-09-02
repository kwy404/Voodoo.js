# Migrating from Alpine

Voodoo.js and Alpine start from the same idea: behavior declared in HTML, with no build step.
The conversion is usually almost mechanical. The real differences appear in what Voodoo brings along,
which in Alpine lives in plugins or your own code.

## Tabela de equivalência

| Alpine | Voodoo.js | Observação |
| --- | --- | --- |
| `x-data="{ n: 0 }"` | `v-data="{ n: 0 }"` | |
| `x-text="n"` | `v-text="n"` | |
| `x-html="conteudo"` | `v-html="conteudo"` | |
| `x-show="aberto"` | `v-show="aberto"` | |
| `x-if` em `<template>` | `v-if` em qualquer elemento | Não precisa de `<template>` |
| não existe | `v-else-if`, `v-else` | |
| `x-for` em `<template>` | `v-for` em qualquer elemento | |
| `:key` | `:key` | |
| `x-bind:href` ou `:href` | `v-bind:href` ou `:href` | |
| `x-on:click` ou `@click` | `v-on:click`, `@click` ou `v-click` | |
| `x-model` | `v-model` | |
| `x-init` | `v-init` | |
| `x-ref="campo"` | `v-ref="campo"` | |
| `$refs.campo` | `$refs.campo` | |
| `x-effect` | `v-effect` | |
| `x-cloak` | `v-cloak` | |
| `x-ignore` | `v-ignore` ou `v-pre` | |
| `x-teleport="body"` | `v-teleport="body"` | |
| `x-transition` | `v-transition="fade"` | |
| `x-transition:enter="..."` | `v-enter-active-class="..."` | |
| `x-modelable` | não existe | Use props e `emit` em um componente |
| `x-id` e `$id()` | `V.uid()` | |
| `{{ n }}` | `{ n }` | A chave dupla também funciona |

## Modificadores de evento

| Alpine | Voodoo.js |
| --- | --- |
| `.prevent`, `.stop`, `.self`, `.once`, `.capture`, `.passive` | iguais |
| `.window`, `.document` | iguais |
| `.outside` | `.outside` ou o evento sintético `@outside` |
| `.debounce`, `.throttle` | iguais, com 250 ms fixos |
| `.enter`, `.escape`, `.space`, `.tab`, teclas | iguais |
| `.ctrl`, `.shift`, `.alt`, `.meta`, `.cmd` | `.ctrl`, `.shift`, `.alt`, `.meta` |
| `.camel`, `.dot` | não existem |

## Modificadores de v-model

| Alpine | Voodoo.js |
| --- | --- |
| `.lazy` | `.lazy` |
| `.number` | `.number` |
| `.debounce` | `.debounce`, com o tempo em `v-debounce` |
| `.throttle` | não existe |
| não existe | `.trim` |
| não existe | `.single` para arquivo |

## Variáveis mágicas

| Alpine | Voodoo.js |
| --- | --- |
| `$el` | `$el` |
| `$refs` | `$refs` |
| `$store` | `$store` |
| `$watch('n', cb)` | `$watch('n', cb)` |
| `$dispatch('nome', dados)` | `$dispatch('nome', dados)` |
| `$nextTick` | `$nextTick` |
| `$root` | `$root` |
| `$data` | `$data` |
| `$event` | `$event` |
| `$id` | `V.uid()` |
| `$persist` (plugin) | a directive `v-persist` |
| não existe | `$parent`, `$self`, `$detail` |
| não existe | `$http`, `$toast`, `$modal`, `$form`, `$storage`, `$cookie`, `$url`, `$cache` |
| não existe | `$screen`, `$network`, `$device`, `$theme`, `$clipboard` |
| não existe | `$route`, `$router`, `$t`, `$locale` |

## Store

```js
// Alpine
Alpine.store('carrinho', {
  itens: [],
  adicionar(p) { this.itens.push(p); },
});
Alpine.store('carrinho').adicionar(produto);
```

```js
// Voodoo.js
V.store('carrinho', {
  itens: [],
  adicionar(p) { this.itens.push(p); },
});
V.store('carrinho').adicionar(produto);
```

No HTML os dois usam `$store.carrinho`. A Voodoo aceita persistência direto na criação:

```js
V.store('carrinho', { itens: [] }, { persist: true });
```

## Dados globais

```js
// Alpine
Alpine.data('dropdown', () => ({ aberto: false, alternar() { this.aberto = !this.aberto; } }));
```

```html
<div x-data="dropdown">...</div>
```

```js
// Voodoo.js: um componente
V.component('dropdown', {
  state: () => ({ aberto: false }),
  methods: { alternar() { this.aberto = !this.aberto; } },
});
```

```html
<div v-component="dropdown">...</div>
<dropdown></dropdown>
```

## Directives e magias personalizadas

```js
// Alpine
Alpine.directive('destaque', (el, { expression }, { evaluate }) => {
  el.style.background = evaluate(expression);
});
Alpine.magic('agora', () => new Date());
```

```js
// Voodoo.js
V.directive('destaque', (el, binding) => {
  el.style.background = binding.value;
});
V.magic('$agora', () => new Date());
```

## Plugins

```js
// Alpine
Alpine.plugin(meuPlugin);
```

```js
// Voodoo.js
V.use(meuPlugin, { opcao: true });
```

## Inicialização

```js
// Alpine
document.addEventListener('alpine:init', () => { Alpine.data(...); });
Alpine.start();
```

```js
// Voodoo.js
V.component('x', { ... });
V.start();
```

Com a tag `<script>` normal, `V.start()` é chamado sozinho. Use `data-manual` quando quiser
registrar tudo antes.

```html
<script src="voodoo.min.js" data-manual></script>
<script>
  V.component('x', { ... });
  V.start();
</script>
```

```js
document.addEventListener('voodoo:ready', () => console.log('pronto'));
```

## Three differences worth attention

### 1. Interpolation with single brace

```html
<!-- Alpine -->
<span x-text="name"></span>

<!-- Voodoo -->
<span>{ name }</span>
<span v-text="name"></span>
```

Voodoo interpolates text directly. `{{ name }}` also works.

### 2. Attributes disappear from HTML

After processing, the directive leaves the document. If you have CSS or scripts that depend on
selectors like `[x-show]`, adapt to classes, or disable cleanup:

```js
V.config.cleanAttributes = false;
```

### 3. v-if doesn't need template

```html
<!-- Alpine -->
<template x-if="loggedIn"><p>Welcome</p></template>

<!-- Voodoo -->
<p v-if="loggedIn">Welcome</p>
```

The `<template>` still works when you want to condition multiple elements without a
container.

## What you gain in the switch

Things that in Alpine require a plugin, external library or your own code, and which are already
ready here:

- declarative requests: `v-get`, `v-post`, `v-resource`, `v-poll`, `v-search`;
- complete AJAX form with `v-submit`, validation, masks, upload and autosave;
- UI: modal, drawer, tabs, dropdown, tooltip, accordion, command palette;
- notifications and dialogs with promises;
- accessible drag and drop;
- storage, cookies, cache and query string;
- in the complete build: charts, spring-based animations, router, languages and the `xray` inspector.

## What you lose

- Alpine's plugin ecosystem, which is larger and older;
- `x-modelable`, which in Voodoo becomes props with `emit`;
- `x-transition` with utility class syntax right in the attribute, which here uses
  `v-enter-class` and friends;
- the `.camel` and `.dot` modifiers of `x-bind`.

## Gradual migration

The two libraries use different prefixes, so they coexist without collision on the same page. Migrate
screen by screen, swapping `x-` for `v-`, and remove Alpine when none is left.

---

Previous: [Migrating from jQuery](migrando-do-jquery.md) · Next: [Migrating from Vue](migrando-do-vue.md)
