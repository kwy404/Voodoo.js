# Migrando do Alpine

A Voodoo.js e o Alpine partem da mesma ideia: comportamento declarado no HTML, sem passo de build.
A conversão costuma ser quase mecânica. As diferenças reais aparecem no que a Voodoo traz junto,
que no Alpine mora em plugins ou no seu próprio código.

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

## Três diferenças que valem atenção

### 1. Interpolação com chave simples

```html
<!-- Alpine -->
<span x-text="nome"></span>

<!-- Voodoo -->
<span>{ nome }</span>
<span v-text="nome"></span>
```

A Voodoo interpola texto direto. `{{ nome }}` também funciona.

### 2. Os atributos somem do HTML

Depois de processada, a directive sai do documento. Se você tem CSS ou scripts que dependem de
seletores como `[x-show]`, adapte para classes, ou desligue a limpeza:

```js
V.config.cleanAttributes = false;
```

### 3. v-if não precisa de template

```html
<!-- Alpine -->
<template x-if="logado"><p>Bem-vindo</p></template>

<!-- Voodoo -->
<p v-if="logado">Bem-vindo</p>
```

O `<template>` continua funcionando quando você quer condicionar vários elementos sem um
contêiner.

## O que você ganha na troca

Coisas que no Alpine exigem plugin, biblioteca externa ou código próprio, e que aqui já vêm
prontas:

- requisições declarativas: `v-get`, `v-post`, `v-resource`, `v-poll`, `v-search`;
- formulário AJAX completo com `v-submit`, validação, máscaras, upload e autosave;
- interface: modal, gaveta, abas, dropdown, tooltip, acordeão, paleta de comandos;
- notificações e diálogos com promessa;
- arrastar e soltar acessível;
- armazenamento, cookies, cache e query string;
- no build completo: gráficos, animações com mola, roteador, idiomas e o inspetor `xray`.

## O que você perde

- o ecossistema de plugins do Alpine, que é maior e mais antigo;
- `x-modelable`, que na Voodoo vira props com `emit`;
- `x-transition` com sintaxe de classes utilitárias direto no atributo, que aqui usa
  `v-enter-class` e companhia;
- os modificadores `.camel` e `.dot` do `x-bind`.

## Migração gradual

As duas bibliotecas usam prefixos diferentes, então convivem sem colisão na mesma página. Migre
tela por tela, trocando `x-` por `v-`, e remova o Alpine quando não sobrar nenhum.

---

Anterior: [Migrando do jQuery](migrando-do-jquery.md) · Próximo: [Migrando do Vue](migrando-do-vue.md)
