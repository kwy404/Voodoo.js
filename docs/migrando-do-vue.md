# Migrating from Vue

Voodoo.js' template syntax was designed to be familiar to those coming from Vue. Directives,
modifiers, `v-model` and the component model follow the same names. The fundamental difference is
that **there's no compilation**: Voodoo interprets the HTML already on the page.

This changes what's possible. It's worth reading the limitations section before deciding.

## Template

| Vue | Voodoo.js | Observação |
| --- | --- | --- |
| `{{ nome }}` | `{ nome }` | A chave dupla também funciona |
| `v-text`, `v-html` | iguais | |
| `v-show` | igual | |
| `v-if`, `v-else-if`, `v-else` | iguais | |
| `v-for="item in itens"` | igual | |
| `v-for="(item, i) in itens"` | igual | |
| `v-for="(valor, chave) in obj"` | igual | |
| `:key` | `:key` | |
| `v-bind:x` e `:x` | iguais | |
| `v-bind="objeto"` | igual | |
| `.prop` | `.prop` e o atalho `.` | |
| `v-on:click` e `@click` | iguais, mais o atalho `v-click` | |
| `v-model` | igual | |
| `v-once` | igual | Avalia uma vez e escreve o resultado |
| `v-cloak` | igual | |
| `v-pre` | igual | |
| `v-memo` | não existe | |
| `v-slot` | atributo `slot="nome"` no filho | |
| `<Teleport>` | `v-teleport="#alvo"` | |
| `<Transition>` | `v-transition="fade"` | |
| `<KeepAlive>` | não existe | |
| `<Suspense>` | não existe | Use `v-resource` com `loading` |

## Modificadores

| Vue | Voodoo.js |
| --- | --- |
| `.prevent`, `.stop`, `.self`, `.once`, `.capture`, `.passive` | iguais |
| `.enter`, `.esc`, `.space`, `.tab`, `.delete`, setas | iguais |
| `.ctrl`, `.shift`, `.alt`, `.meta` | iguais |
| `.exact` | não existe |
| `.left`, `.right`, `.middle` de mouse | não existem |
| `.lazy`, `.number`, `.trim` do `v-model` | iguais |
| não existe | `.window`, `.document`, `.outside`, `.debounce`, `.throttle` |

## Componentes

| Vue (Options API) | Voodoo.js |
| --- | --- |
| `props: { x: { type: Number, default: 0 } }` | `props: { x: { type: 'number', default: 0 } }` |
| `props: ['a', 'b']` | igual |
| `data() { return {} }` | `state(props) { return {} }` ou `data(props)` |
| `computed: {}` | igual |
| `methods: {}` | igual |
| `watch: {}` | igual |
| `template: '...'` | igual |
| `emits: []` | não existe |
| `this.$emit('x', d)` | `this.emit('x', d)` ou `this.$emit` |
| `this.$refs` | igual |
| `this.$el` | igual |
| `this.$props` | igual |
| `this.$parent` | igual |
| `this.$nextTick()` | igual |
| `this.$watch(fonte, cb)` | `this.$watch('expressao', cb)` |
| `provide` e `inject` | não existem. Use um store |
| `<slot>`, `<slot name="x">` | iguais |
| `mounted`, `updated`, `beforeUnmount`, `unmounted` | iguais |
| `created`, `beforeCreate` | apenas `beforeMount` |
| `beforeUpdate`, `activated`, `deactivated` | não existem |
| `<style scoped>` | `style: '...'`, sem isolamento por escopo |

Registro e uso:

```js
// Vue
app.component('user-card', { props: ['nome'], template: '<p>{{ nome }}</p>' });
```

```js
// Voodoo.js
V.component('user-card', { props: ['nome'], template: '<p>{ nome }</p>' });
```

```html
<user-card nome="Ana"></user-card>
<UserCard nome="Ana"></UserCard>
```

As duas escritas funcionam, como no Vue com compilação.

## Reatividade

| Vue | Voodoo.js |
| --- | --- |
| `reactive(obj)` | `V.reactive(obj)` |
| `ref(v)` | `V.ref(v)` |
| `shallowRef(v)` | `V.shallowRef(v)` |
| `computed(fn)` | `V.computed(fn)` |
| `computed({ get, set })` | igual |
| `watch(fonte, cb, opcoes)` | igual |
| `watchEffect(fn)` | igual |
| `effectScope()` | `V.effectScope()` |
| `nextTick()` | `V.nextTick()` |
| `toRaw`, `markRaw`, `unref`, `isReactive` | iguais |
| `readonly`, `shallowReactive`, `toRefs`, `customRef` | não existem |
| desembrulho automático de ref no template | não existe. Use `.value` |

As opções de `watch` são as mesmas: `immediate`, `deep`, `flush` com `pre`, `post` e `sync`.

## Estado global

| Vue | Voodoo.js |
| --- | --- |
| Pinia: `defineStore('carrinho', { state, getters, actions })` | `V.store('carrinho', { ...estado, ...metodos })` |
| `useCarrinho()` | `V.store('carrinho')` |
| no template: `carrinho.itens` | `$store.carrinho.itens` |
| `provide` e `inject` | um store, ou `V.data()` no escopo raiz |

Getters de Pinia viram métodos:

```js
V.store('carrinho', {
  itens: [],
  total() {
    return this.itens.reduce((s, i) => s + i.preco, 0);
  },
});
```

```html
<span>{ $store.carrinho.total() }</span>
```

## Roteador

| Vue Router | Voodoo.js |
| --- | --- |
| `createRouter({ history, routes })` | `V.router({ mode, routes })` |
| `path: '/x', component: X` | `'/x': { component: 'x' }` |
| `<router-view>` | `<main v-router-view>` |
| `<router-link to="/x">` | `<a v-link href="/x">` |
| `router.push('/x')` | `V.router.push('/x')` ou `V.navigate('/x')` |
| `router.replace` | `V.router.replace` |
| `useRoute()` | `V.route`, e `$route` no HTML |
| `route.params`, `route.query`, `route.meta` | iguais |
| `beforeEach`, `afterEach` | iguais |
| `beforeEnter` | igual |
| rotas aninhadas | não existem |
| lazy loading de componente | rota com `view`, que busca um HTML remoto |

## Internacionalização

| vue-i18n | Voodoo.js |
| --- | --- |
| `createI18n({ locale, messages })` | `V.i18n({ locale, messages })` |
| `$t('chave')` | `$t('chave')` |
| `$t('chave', { n })` | igual |
| `$n`, `$d` | `$n`, `$c`, `$d`, `$rt` |
| pluralização com `\|` | igual |
| `locale.value = 'en'` | `V.setLocale('en')` |

## Transições

```html
<!-- Vue -->
<Transition name="fade">
  <p v-if="visivel">Olá</p>
</Transition>
```

```html
<!-- Voodoo.js -->
<p v-if="visivel" v-transition="fade">Olá</p>
```

As classes seguem o mesmo padrão: `v-fade-enter-from`, `v-fade-enter-active`, `v-fade-enter-to`,
`v-fade-leave-from`, `v-fade-leave-active`, `v-fade-leave-to`.

## What doesn't exist, and why

Voodoo.js interprets the page's HTML. Without compilation, some Vue things can't exist:

- **single-file components** (`.vue`), which depend on a compiler;
- **JSX and render functions**;
- **`setup()` and Composition API** inside components;
- **`<script setup>`**;
- **server-side rendering with hydration**;
- **scoped slots**, which pass data from child to parent content;
- **`provide` and `inject`**, replaced by stores;
- **`<KeepAlive>` and `<Suspense>`**;
- **`v-memo`** and compiler optimizations in general;
- **automatic ref unwrapping in templates**;
- **type checking in templates**.

Expressions also accept a subset of JavaScript: no `function`, `class`, `new`,
`delete`, `await`, loops and destructuring. See [Expressions](expressoes.md).

## What you gain

- **no build step.** No Vite, no configuration, no `node_modules` to get a page online;
- **a single file**, which works from CDN;
- **lots of things built-in**: declarative HTTP, forms with validation and masks, UI,
  drag and drop, storage, notifications, and in the complete build charts, animations,
  router and languages;
- **works with restrictive CSP**, no `unsafe-eval`;
- **coexists with server-generated HTML**, without having to take over the entire page.

## When not to switch

If your project has dozens of screens, a large team, component testing and strict types in
templates, Vue is still the right choice. Voodoo.js was made for the other side of
the balance: server-generated pages, admin panels, prototypes and small teams.

## Coexisting

The two can run on the same page, in different areas. Mark the Vue region with `v-ignore`
so Voodoo doesn't touch it:

```html
<div id="app-vue" v-ignore></div>

<div v-data="{ n: 0 }">
  <button v-click="n++">{ n }</button>
</div>
```

---

Previous: [Migrating from Alpine](migrando-do-alpine.md) · Next: [FAQ](perguntas-frequentes.md)
