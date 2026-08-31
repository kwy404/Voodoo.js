# Migrando do Vue

A sintaxe de template da Voodoo.js foi desenhada para ser familiar a quem vem do Vue. Directives,
modificadores, `v-model` e o modelo de componentes seguem os mesmos nomes. A diferença de fundo é
que **não existe compilação**: a Voodoo interpreta o HTML que já está na página.

Isso muda o que é possível. Vale a pena ler a seção de limites antes de decidir.

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

## O que não existe, e por quê

A Voodoo.js interpreta o HTML da página. Sem compilação, algumas coisas do Vue não têm como
existir:

- **componentes de arquivo único** (`.vue`), que dependem de um compilador;
- **JSX e funções de render**;
- **`setup()` e a Composition API** dentro de componentes;
- **`<script setup>`**;
- **renderização no servidor com hidratação**;
- **slots com escopo**, que passam dados do filho para o conteúdo do pai;
- **`provide` e `inject`**, substituídos por stores;
- **`<KeepAlive>` e `<Suspense>`**;
- **`v-memo`** e otimizações de compilador em geral;
- **desembrulho automático de `ref` no template**;
- **checagem de tipos no template**.

As expressões também aceitam um subconjunto de JavaScript: sem `function`, `class`, `new`,
`delete`, `await`, laços e desestruturação. Veja [Expressões](expressoes.md).

## O que você ganha

- **nenhum passo de build.** Nada de Vite, nada de configuração, nada de `node_modules` para
  colocar uma página no ar;
- **um arquivo só**, que funciona por CDN;
- **muita coisa embutida**: HTTP declarativo, formulários com validação e máscaras, interface,
  arrastar e soltar, armazenamento, notificações, e no build completo gráficos, animações,
  roteador e idiomas;
- **funciona com CSP restritiva**, sem `unsafe-eval`;
- **convive com HTML gerado no servidor**, sem precisar assumir a página inteira.

## Quando não trocar

Se o seu projeto tem dezenas de telas, um time grande, testes de componente e tipagem estrita nos
templates, o Vue continua sendo a escolha certa. A Voodoo.js foi feita para o outro lado da
balança: páginas geradas no servidor, painéis administrativos, protótipos e times pequenos.

## Convivendo

As duas podem rodar na mesma página, em áreas diferentes. Marque a região do Vue com `v-ignore`
para que a Voodoo não toque nela:

```html
<div id="app-vue" v-ignore></div>

<div v-data="{ n: 0 }">
  <button v-click="n++">{ n }</button>
</div>
```

---

Anterior: [Migrando do Alpine](migrando-do-alpine.md) · Próximo: [Perguntas frequentes](perguntas-frequentes.md)
