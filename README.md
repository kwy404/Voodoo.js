<div align="center">

<img src="brand/logo/voodoo-logo.svg#gh-light-mode-only" alt="Voodoo.js" width="380">
<img src="brand/logo/voodoo-logo-dark.svg#gh-dark-mode-only" alt="Voodoo.js" width="380">

### JavaScript feels like magic.

**O micro framework que faz quase tudo direto pelo HTML.**
Reatividade de verdade, componentes, requisições, formulários, gráficos e interface,
em uma tag `<script>`. Sem build, sem npm, sem configuração.

[![npm](https://img.shields.io/npm/v/voodoojs?color=6D3BF5&label=npm)](https://www.npmjs.com/package/voodoojs)
[![gzip](https://img.shields.io/badge/gzip-36%20KB-2ED9A5)](#tamanho-real)
[![dependencias](https://img.shields.io/badge/depend%C3%AAncias-0-9B7BFF)](#zero-dependencias)
[![testes](https://img.shields.io/badge/testes-177%20passando-2ED9A5)](#testes)
[![TypeScript](https://img.shields.io/badge/TypeScript-completo-3178C6)](#typescript)
[![licenca](https://img.shields.io/badge/licen%C3%A7a-MIT-FFB35C)](LICENSE)

<img src="brand/mascot/vudu-wave.svg" alt="Vudu, o mascote da Voodoo.js" width="140">

[Documentação](docs/) · [Demos](examples/) · [Início rápido](#inicio-rapido) · [Directives](#referencia-de-directives) · [English](README.en.md)

</div>

---

> **Voodoo.js in one line:** a zero dependency, no build step JavaScript micro framework that turns plain HTML into a reactive application through `v-*` attributes. A modern alternative to jQuery, a lighter alternative to Vue and React, and a batteries included alternative to Alpine.js and HTMX. [Read this in English](README.en.md).

## O gancho

Este arquivo HTML funciona. Não tem build, não tem npm, não tem passo de configuração.

```html
<!doctype html>
<script src="https://cdn.jsdelivr.net/npm/voodoojs" defer></script>

<div v-data="{ nome: '', tarefas: [] }">

  <input v-model="nome" placeholder="O que precisa ser feito?"
         @keyup.enter="tarefas.push({ id: Date.now(), texto: nome, feita: false }); nome = ''">

  <ul>
    <li v-for="t in tarefas" :key="t.id" :class="{ feita: t.feita }">
      <input type="checkbox" v-model="t.feita">
      { t.texto }
      <button @click="tarefas = tarefas.filter(x => x.id !== t.id)">remover</button>
    </li>
  </ul>

  <p v-show="tarefas.length">
    { tarefas.filter(t => !t.feita).length } de { tarefas.length } pendentes
  </p>

</div>
```

Uma lista de tarefas reativa, com filtro, contador e ligação de dois sentidos, em HTML puro.
Quando `tarefas` muda, **apenas os nós que dependem de `tarefas` são atualizados**. Não existe Virtual DOM.

## O mesmo recurso, três bibliotecas

Um contador com botões e um texto que reage.

<table>
<tr><th width="33%">jQuery</th><th width="33%">Vue 3</th><th width="33%">Voodoo.js</th></tr>
<tr valign="top">
<td>

```html
<div>
  <button id="menos">-</button>
  <b id="valor">0</b>
  <button id="mais">+</button>
</div>
<script>
let n = 0;
const $v = $('#valor');
function render() {
  $v.text(n);
}
$('#mais').on('click', () => {
  n++; render();
});
$('#menos').on('click', () => {
  n--; render();
});
render();
</script>
```

**16 linhas.** O estado vive
separado do HTML.

</td>
<td>

```html
<div id="app">
  <button @click="n--">-</button>
  <b>{{ n }}</b>
  <button @click="n++">+</button>
</div>
<script type="module">
import { createApp, ref }
  from 'vue';

createApp({
  setup() {
    const n = ref(0);
    return { n };
  }
}).mount('#app');
</script>
```

**14 linhas.** Precisa de
bundler ou import map.

</td>
<td>

```html
<div v-data="{ n: 0 }">
  <button @click="n--">-</button>
  <b>{ n }</b>
  <button @click="n++">+</button>
</div>
```

<br>

**4 linhas.**
Só a tag do CDN no topo
da página.

</td>
</tr>
</table>

## Índice

- [Por que Voodoo](#por-que-voodoo)
- [Instalação](#instalacao)
- [Início rápido](#inicio-rapido)
- [Conceitos](#conceitos)
- [Referência de directives](#referencia-de-directives)
- [Componentes](#componentes)
- [Componentes prontos](#componentes-prontos)
- [HTTP declarativo](#http-declarativo)
- [Formulários e validação](#formularios-e-validacao)
- [Estado global](#estado-global)
- [Gráficos e animações](#graficos-e-animacoes)
- [Recursos exclusivos](#recursos-exclusivos)
- [API em JavaScript](#api-em-javascript)
- [Linha de comando](#linha-de-comando)
- [Comparativo honesto](#comparativo-honesto)
- [Quando não usar a Voodoo](#quando-nao-usar-a-voodoo)
- [Migrando](#migrando)
- [Segurança](#seguranca)
- [Tamanho real](#tamanho-real)
- [Demos](#demos)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)

## Por que Voodoo

**O problema.** Você quer uma página dinâmica: uma lista que filtra, um formulário que valida e envia por AJAX, um modal, um aviso de sucesso. Com jQuery isso vira um monte de listener e manipulação manual do DOM. Com Vue ou React isso vira `npm install`, bundler, passo de build e uma pasta `node_modules` de centenas de megabytes. Para uma página. Que já é HTML.

**A resposta da Voodoo.** Os atributos descrevem o comportamento, e a biblioteca cuida do resto.

| O que você quer | O que você escreve |
| --- | --- |
| Contador que reage | `<button @click="n++">` |
| Mostrar quando logado | `<div v-show="logado">` |
| Repetir uma lista | `<li v-for="u in usuarios">` |
| Campo ligado ao estado | `<input v-model="busca">` |
| Carregar dados da API | `<div v-get="/api/users" v-target="#lista">` |
| Formulário AJAX validado | `<form v-submit="/api/users" v-validate>` |
| Máscara de CPF | `<input v-mask="cpf">` |
| Confirmar antes de excluir | `<button v-delete="/api/x" v-confirm="Excluir?">` |
| Aviso de sucesso | `<button v-toast-success="Salvo!">` |
| Gráfico de linha | `<div v-chart="{ type: 'line', data: vendas }">` |
| Estado que sobrevive ao F5 | `<div v-data="{...}" v-persist>` |

Em destaque:

- <a id="zero-dependencias"></a>**Zero dependências.** Nada de React, Vue, lodash, jQuery ou Axios por baixo. Só APIs do navegador.
- **Sem passo de build.** Uma tag `<script>` e acabou. Também funciona com bundler e TypeScript quando você quiser.
- **Sem `eval` e sem `new Function`.** A Voodoo tem um analisador de expressões próprio, então funciona com Content Security Policy restritiva, sem `unsafe-eval`.
- **HTML limpo no final.** Depois de processados, os atributos `v-*` saem do DOM. O inspetor do navegador mostra HTML normal, sem sujeira de framework.
- **Atualizações granulares.** Rastreamento de dependência por chave. Mudou `count`, só quem leu `count` é reexecutado.
- <a id="typescript"></a>**TypeScript completo**, com autocompletar em todo o objeto `V`.
- <a id="testes"></a>**177 testes automatizados** cobrindo reatividade, analisador, DOM, componentes, HTTP e utilitários.

## Instalação

### CDN, o caminho mais curto

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs" defer></script>
```

A biblioteca inicializa sozinha. Não precisa chamar `V.init()`.

Escolha o pacote conforme o que a página usa:

```html
<!-- Essencial: reatividade, directives, componentes, DOM, HTTP,
     formularios, validacao, mascaras, interface, arrastar e soltar -->
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>

<!-- Completo: soma graficos, animacoes com fisica, roteador,
     idiomas, inspetor de reatividade e 29 componentes prontos -->
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>
```

### npm

```bash
npm install voodoojs
```

```js
import V from 'voodoojs';
V.start();
```

Ou importando só o que usa, com tree shaking:

```js
import { reactive, computed, http, toast } from 'voodoojs';
```

### Configuração pela própria tag

```html
<script src="voodoo.min.js"
        data-prefix="data-v-"
        data-base-url="https://api.exemplo.com"
        data-locale="pt-BR"
        data-devtools
        defer></script>
```

Para configurar antes de iniciar, use `data-manual` e chame `V.start()` você mesmo.

## Início rápido

Um arquivo, do zero ao funcionando:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/voodoojs" defer></script>
</head>
<body>

<div v-data="{ nome: '', count: 0 }">

  <input v-model="nome" placeholder="Seu nome">
  <h1>Olá, { nome || 'estranho' }!</h1>

  <button @click="count--">-</button>
  <strong>{ count }</strong>
  <button @click="count++">+</button>

  <p v-show="count > 5">Você clicou bastante.</p>

</div>

</body>
</html>
```

Três coisas acontecendo aqui:

1. `v-data` cria um escopo reativo com as variáveis daquele trecho.
2. `{ nome }` interpola o valor no texto e se atualiza sozinho.
3. `@click` executa a expressão e dispara a atualização de quem depende.

## Conceitos

### Escopo

Cada `v-data` cria um escopo. Elementos filhos enxergam as variáveis do pai, e a escrita vai
para o dono da variável, não para uma cópia.

```html
<div v-data="{ tema: 'escuro' }">
  <div v-data="{ aberto: false }">
    <!-- enxerga tema e aberto -->
    <button @click="aberto = !aberto">{ tema }</button>
  </div>
</div>
```

### Expressões

Dentro dos atributos você escreve JavaScript de verdade: operadores, ternário, template
literal, funções de seta, encadeamento opcional, objetos e listas.

```html
<span>{ produtos.filter(p => p.ativo).length } ativos</span>
<span>{ total > 0 ? `R$ ${total.toFixed(2)}` : 'vazio' }</span>
<span>{ usuario?.endereco?.cidade ?? 'sem cidade' }</span>
```

Não é `eval`. A Voodoo tem um analisador próprio, e identificadores fora do escopo só
resolvem contra uma lista fechada de globais (`Math`, `JSON`, `Date`, `Number`, `Intl` e
alguns outros). `window`, `document` e `fetch` não são alcançáveis a partir de um atributo.

### Reatividade

O sistema é baseado em `Proxy` com rastreamento por chave e fila em microtask.

```js
const estado = V.reactive({ count: 0, itens: [] });

V.effect(() => console.log(estado.count));   // roda agora e a cada mudanca
const dobro = V.computed(() => estado.count * 2);
V.watch(() => estado.count, (novo, antigo) => console.log(novo, antigo));

estado.count++;
await V.nextTick();  // o DOM ja refletiu
```

## Referência de directives

São **253 atributos** registrados. Os principais, por categoria.
A referência completa está em [docs/directives.md](docs/directives.md).

### Estado e renderização

| Directive | O que faz |
| --- | --- |
| `v-data="{ ... }"` | Cria um escopo reativo |
| `{ expressao }` | Interpola texto. `{{ }}` também funciona |
| `v-text="valor"` | Escreve texto, escapando HTML |
| `v-html="conteudo"` | Insere HTML e inicializa as directives dentro |
| `v-show="cond"` | Alterna `display` sem tirar do DOM |
| `v-if` / `v-else-if` / `v-else` | Insere e remove do DOM |
| `v-for="item in lista"` | Repete, com diferença por chave via `:key` |
| `v-once="valor"` | Renderiza uma vez e não observa mais |
| `v-teleport="body"` | Move o elemento para outro lugar do documento |
| `v-cloak` | Esconde até a Voodoo assumir |
| `v-ignore` / `v-pre` | Desliga a Voodoo naquela subárvore |

`v-for` aceita índice, objetos, `Map`, `Set`, número e string:

```html
<li v-for="(usuario, i) in usuarios" :key="usuario.id">{ i }: { usuario.nome }</li>
<li v-for="(valor, chave) in configuracoes">{ chave } = { valor }</li>
<li v-for="n in 5">Item { n }</li>
<template v-for="p in produtos"><dt>{ p.nome }</dt><dd>{ p.preco }</dd></template>
```

### Atributos, classes e estilos

| Directive | Exemplo |
| --- | --- |
| `v-bind:attr` ou `:attr` | `:href="url"`, `:disabled="carregando"` |
| `:class` | `:class="{ ativo: selecionado, erro: temErro }"` |
| `:style` | `:style="{ color: cor, width: largura + 'px' }"` |
| `v-bind="objeto"` | Aplica vários atributos de uma vez |
| `.prop` | `.value="texto"` escreve na propriedade, não no atributo |

### Eventos

| Directive | Exemplo |
| --- | --- |
| `@evento` ou `v-on:evento` | `@click`, `@input`, `@keyup` |
| `v-click`, `v-input`, `v-keyup` | Atalhos diretos |
| `@hover`, `@tap`, `@press` | Apelidos amigáveis |
| `@hold.1s` | Segurar pressionado por um tempo |
| `@outside` | Clique fora do elemento |
| `@visible` | Entrou na área visível |
| `@swipeleft`, `@swiperight` | Gestos de arrastar |
| `v-hotkey="ctrl+k"` | Atalho global de teclado |

Modificadores: `.prevent`, `.stop`, `.once`, `.self`, `.capture`, `.passive`, `.window`,
`.document`, `.debounce=300`, `.throttle=250`, e filtros de tecla como `.enter`, `.esc`,
`.ctrl`, `.shift`.

```html
<form @submit.prevent="salvar">
<input @keyup.enter="buscar">
<button @click.once="apenasUmaVez">Só uma vez</button>
<div @click.outside="fecharMenu">
<button @hold.1s="apagarTudo">Segure para apagar</button>
```

### Formulário

`v-model` faz ligação de dois sentidos em texto, número, checkbox (booleano ou lista),
radio, select simples e múltiplo, textarea e arquivo.

```html
<input v-model="nome">
<input v-model.number="idade">
<input v-model.trim="email">
<input v-model.lazy="bio">
<input type="checkbox" v-model="aceito">
<input type="checkbox" value="js" v-model="tags">
<select v-model="uf" multiple>
```

### Ciclo de vida e referências

| Directive | O que faz |
| --- | --- |
| `v-init="carregar"` | Executa quando o elemento é inicializado |
| `v-ref="campoBusca"` | Guarda o elemento em `$refs` |
| `v-effect="..."` | Executa a expressão sempre que as dependências mudarem |
| `v-watch="acao"` | Reage à mudança do `v-model` do mesmo elemento |

### Interface

`v-modal`, `v-drawer`, `v-dropdown`, `v-tooltip`, `v-popover`, `v-tabs`, `v-accordion`,
`v-collapse`, `v-toggle`, `v-command` (paleta estilo Ctrl+K), `v-sortable`, `v-draggable`,
`v-droppable`, `v-focus-trap`, `v-scrollspy`, `v-sticky`, `v-lazy-src`, `v-copy`,
`v-share`, `v-print`, `v-fullscreen`, `v-theme-toggle`.

## Componentes

Registre uma vez, use como tag.

```js
V.component('cartao-usuario', {
  props: { nome: { type: 'string', default: 'sem nome' }, idade: { type: 'number' } },
  state: (props) => ({ curtidas: 0 }),
  computed: {
    resumo() { return `${this.nome}, ${this.idade} anos`; }
  },
  methods: {
    curtir() { this.curtidas++; this.emit('curtido', this.curtidas); }
  },
  mounted() { console.log('montado', this.nome); },
  template: `
    <article>
      <h3>{ resumo }</h3>
      <slot></slot>
      <button v-click="curtir">Curtir ({ curtidas })</button>
    </article>
  `
});
```

```html
<CartaoUsuario nome="Ana" :idade="idadeDaAna" @curtido="registrar">
  <p>Este conteúdo entra no slot.</p>
</CartaoUsuario>

<!-- as tres formas funcionam -->
<cartao-usuario nome="Bia"></cartao-usuario>
<div v-component="cartao-usuario" nome="Cris"></div>
```

Props estáticas vêm por atributo, props dinâmicas por `:prop`. O componente tem
`this.$el`, `this.$refs`, `this.$props`, `this.emit()`, e os ganchos `beforeMount`,
`mounted`, `updated`, `beforeUnmount` e `unmounted`.

## Componentes prontos

O build completo registra **29 componentes** com aparência própria, acessíveis e
alinhados ao tema. Nenhum usa a aparência padrão do navegador.

```html
<VButton variant="primary" size="lg">Salvar</VButton>
<VInput label="E-mail" type="email" hint="Nunca compartilhamos">
<VSelect label="Estado" :options="estados" v-model="uf" searchable>
<VTable :rows="usuarios" :columns="colunas" sortable>
<VBadge tone="success">Ativo</VBadge>
<VStat label="Receita" value="128400" trend="12.5">
```

Lista completa: `VButton`, `VIconButton`, `VCard`, `VLabel`, `VField`, `VInput`,
`VTextarea`, `VSelect`, `VCheckbox`, `VRadio`, `VSwitch`, `VBadge`, `VTag`, `VAlert`,
`VAvatar`, `VSpinner`, `VSkeleton`, `VProgress`, `VDivider`, `VTable`, `VPagination`,
`VBreadcrumb`, `VStat`, `VEmptyState`, `VTimeline`, `VSteps`, `VRating`,
`VTooltipButton`, `VCodeBlock`.

A paleta inteira é configurável, e a escala de tons é gerada a partir das suas cores:

```js
V.palette({ primary: '#0F766E', accent: '#F59E0B', radius: '10px' });
V.palette({ preset: 'oceano' });
```

## HTTP declarativo

O recurso que mais diferencia a Voodoo. Requisição sem escrever JavaScript.

```html
<!-- carrega e injeta o resultado -->
<button v-get="/api/usuarios" v-target="#lista">Carregar</button>

<!-- envia dados -->
<button v-post="/api/carrinho" v-body="{ produtoId: 15 }">Adicionar</button>

<!-- exclui com confirmacao e aviso -->
<button v-delete="'/api/usuarios/' + u.id"
        v-confirm="Excluir usuário?"
        v-toast-success="Usuário excluído!">Excluir</button>

<!-- busca enquanto digita -->
<input v-search="/api/produtos" v-param="q" v-target="#resultados" v-debounce="300">

<!-- atualiza sozinho a cada 5 segundos -->
<div v-get="/api/status" v-poll="5s" v-target="#status"></div>

<!-- carrega quando aparece na tela -->
<div v-load-visible="/api/comentarios"></div>
```

Quando a resposta é JSON, a Voodoo transforma em HTML legível automaticamente:
uma lista de objetos vira tabela, um objeto vira lista de definições. Se preferir controlar,
use um `<template>` da página com `v-template`, ou guarde o resultado no estado com `v-as`.

### `v-resource`: dados, carregando e erro em uma linha

```html
<div v-resource="produtos: /api/produtos">

  <p v-if="produtos.loading">Carregando...</p>
  <p v-else-if="produtos.error">Falhou: { produtos.error.message }</p>

  <ul v-else>
    <li v-for="p in produtos.data" :key="p.id">{ p.nome }</li>
  </ul>

  <button @click="produtos.reload()">Atualizar</button>
</div>
```

Atributos de apoio: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-loading`,
`v-loading-class`, `v-disable-loading`, `v-on-success`, `v-on-error`, `v-on-complete`,
`v-cache`, `v-retry`, `v-timeout`, `v-headers`, `v-params`, `v-json-path`,
`v-offline-queue`.

`v-swap` aceita `innerHTML`, `outerHTML`, `textContent`, `beforebegin`, `afterbegin`,
`beforeend`, `afterend`, `append`, `prepend`, `replace`, `delete` e `none`.

Em JavaScript, o cliente completo:

```js
const usuarios = await V.http.get('/api/users', { params: { pagina: 2 }, cache: 60000 });
await V.http.post('/api/users', { nome: 'Ana' });
await V.http.upload('/api/arquivos', formData, { onProgress: (p) => console.log(p) });

V.http.setToken('meu-token');
V.http.interceptors.response.use((r) => r);
```

## Formulários e validação

```html
<form v-submit="/api/usuarios"
      v-method="POST"
      v-validate
      v-toast-success="Usuário cadastrado!"
      v-toast-error="Não foi possível cadastrar."
      v-reset-success
      v-redirect="/usuarios">

  <input name="nome" v-required v-minlength="3">
  <input name="email" v-required v-email>
  <input name="cpf" v-mask="cpf" v-cpf>
  <input name="telefone" v-mask="phone">
  <input name="senha" type="password" v-strong-password>
  <input name="senha2" type="password" v-match="senha">

  <button type="submit" v-disable-loading>Salvar</button>
</form>
```

Sem uma linha de JavaScript: valida, mostra o erro embaixo de cada campo, envia por AJAX,
mostra o aviso, limpa o formulário e redireciona. Erros 422 do servidor preenchem os campos
automaticamente.

**Regras disponíveis:** `required`, `email`, `url`, `number`, `integer`, `decimal`, `alpha`,
`alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `same`,
`different`, `in`, `notin`, `regex`, `date`, `after`, `before`, `accepted`, `phone`, `cpf`,
`cnpj`, `cep`, `creditcard`, `strongpassword`, `unique` (assíncrona, consulta uma URL).

CPF e CNPJ conferem os dígitos verificadores de verdade, e cartão passa por Luhn.

**Regra própria:**

```js
V.validator('par', (valor) => Number(valor) % 2 === 0 || 'Precisa ser um número par');
```

```html
<input v-validate-par v-error-message="Escolha um número par">
```

**Máscaras:** `cpf`, `cnpj`, `cpfcnpj`, `phone`, `cep`, `date`, `time`, `datetime`,
`currency`, `percent`, `card`, `cvv`, `plate`, `hex`, `ip`, ou um padrão próprio como
`v-mask="999.999.999-99"`.

Outras directives de formulário: `v-upload` com barra de progresso, `v-dropzone` para
arrastar arquivos, `v-autosave` com debounce, e `v-guard` que avisa antes de sair da página
com alterações não salvas.

## Estado global

```js
V.store('carrinho', {
  itens: [],
  get total() { return this.itens.reduce((s, i) => s + i.preco, 0); },
  adicionar(produto) { this.itens.push(produto); }
});
```

```html
<span>{ $store.carrinho.itens.length } itens</span>
<button @click="$store.carrinho.adicionar(produto)">Adicionar</button>
```

## Gráficos e animações

Gráficos em SVG puro, sem biblioteca externa, reativos e com tema:

```html
<div v-chart="{ type: 'line', data: vendas, labels: meses, smooth: true }"></div>
<div v-chart="{ type: 'donut', data: categorias, showLegend: true }"></div>
<div v-chart="receita" v-chart-type="bar"></div>
```

Tipos: `line`, `area`, `bar`, `column`, `stacked`, `pie`, `donut`, `sparkline`, `radar`,
`scatter`, `progress`. Mudou o dado no estado, o gráfico se redesenha.

Animações com física de mola, no espírito do Framer Motion:

```html
<div v-motion="fadeUp">Entra suave</div>
<div v-motion-scroll="fadeUp">Anima ao entrar na tela</div>
<button v-motion-hover="{ scale: 1.05 }" v-motion-tap="{ scale: 0.96 }">Botão vivo</button>
<span v-count="1250" v-count-duration="800">0</span>
<h1 v-typewriter="JavaScript feels like magic."></h1>
<ul v-motion-stagger="60"><li v-motion="fadeUp">um</li><li v-motion="fadeUp">dois</li></ul>
```

Tudo respeita `prefers-reduced-motion`.

## Recursos exclusivos

### Estado que sobrevive ao recarregar

```html
<div v-data="{ tema: 'escuro', rascunho: '' }" v-persist="editor">
  <textarea v-model="rascunho"></textarea>
</div>
```

### Estado sincronizado entre abas, ao vivo

```html
<div v-data="{ carrinho: [] }" v-sync="loja">
```

Abra a página em duas abas. Mudou em uma, muda na outra. Usa `BroadcastChannel`, sem servidor.

### Desfazer e refazer de graça

```html
<div v-data="{ texto: '' }" v-history>
  <textarea v-model="texto"></textarea>
  <button v-undo :disabled="!$history.canUndo">Desfazer</button>
  <button v-redo :disabled="!$history.canRedo">Refazer</button>
</div>
```

### Raio-x da reatividade

```js
V.xray();  // ou Ctrl + Shift + X
```

Um inspetor dentro da própria página, sem extensão. Contorna todo elemento com directive,
mostra o escopo e os valores atuais, deixa editar o estado e ver a página reagir na hora, e
faz o elemento piscar quando um valor do qual ele depende muda. Tem abas de estado,
componentes, stores, eventos, rede e desempenho.

### Fila offline

```html
<button v-post="/api/pedidos" v-offline-queue>Enviar</button>
```

Sem conexão, a requisição fica guardada e é reenviada quando a rede voltar.

### Variáveis mágicas

São **39**, disponíveis em qualquer expressão sem declarar nada:

```html
<button @click="$toast.success('Salvo!')">Salvar</button>
<div v-show="$screen.mobile">Você está no celular</div>
<div v-show="!$network.online">Você está offline.</div>
<button @click="$refs.busca.focus()">Focar</button>
<button @click="$clipboard.copy('PROMO10')">Copiar cupom</button>
```

Lista: `$el`, `$refs`, `$data`, `$root`, `$parent`, `$self`, `$store`, `$http`, `$toast`,
`$modal`, `$dialog`, `$alert`, `$confirm`, `$prompt`, `$clipboard`, `$storage`, `$session`,
`$cookie`, `$cache`, `$url`, `$theme`, `$device`, `$screen`, `$network`, `$route`,
`$router`, `$t`, `$locale`, `$i18n`, `$n`, `$c`, `$d`, `$rt`, `$nextTick`, `$watch`,
`$dispatch`, `$log`, `$history`, `$form`.

## API em JavaScript

```js
// Reatividade
V.reactive(obj)  V.ref(v)  V.computed(fn)  V.effect(fn)  V.watch(src, cb)  V.nextTick()

// DOM encadeavel
V('#lista .item').addClass('ativo').on('click', fn).fadeIn()

// HTTP
V.http.get(url)  .post(url, body)  .put()  .patch()  .delete()  .upload()  .sse()  .stream()

// Interface
V.toast.success('Salvo!')   V.toast.promise(p, { loading, success, error })
await V.confirm('Tem certeza?')   await V.prompt('Seu nome')   V.modal.open('#login')

// Estado
V.store('carrinho', { ... })   V.data({ usuario: null })

// Extensao
V.directive('destaque', { mounted(el, b) { el.style.background = b.value } })
V.component('meu-card', { ... })
V.magic('$agora', () => new Date())
V.use(meuPlugin)

// Tema e aparencia
V.theme.toggle()   V.palette({ primary: '#6D3BF5' })

// Utilitarios
V.debounce(fn, 300)  V.formatCurrency(1234.5)  V.formatDate(d, 'DD/MM/YYYY')
V.relativeTime(d)  V.slugify(s)  V.groupBy(lista, 'tipo')  V.uuid()  V.clone(o)
```

## Linha de comando

```bash
npx voodoo init minha-pagina    # cria um projeto pronto para abrir no navegador
npx voodoo build                # monta um bundle so com os modulos que voce escolher
npx voodoo add card             # copia um componente para o seu codigo, para voce editar
npx voodoo info                 # mostra os modulos e o tamanho de cada um
```

O `build` abre um menu com os 17 módulos disponíveis. Escolhendo apenas núcleo, directives e
DOM, o resultado fica em **36 KB gzip**.

```bash
npx voodoo build --modules=core,directives,dom,http --out=voodoo.custom.min.js
```

## Comparativo honesto

| | Voodoo.js | Alpine.js | HTMX | Vue 3 | React 19 | jQuery |
| --- | --- | --- | --- | --- | --- | --- |
| Tamanho gzip | 36 a 120 KB | 15 KB | 14 KB | 34 KB | 45 KB | 30 KB |
| Precisa de build | Não | Não | Não | Recomendado | Sim | Não |
| Reatividade | Sim | Sim | Não | Sim | Sim | Não |
| Componentes | Sim | Limitado | Não | Sim | Sim | Não |
| HTTP declarativo | Sim | Não | Sim | Não | Não | Não |
| Formulário e validação | Incluído | Não | Não | Biblioteca | Biblioteca | Plugin |
| Máscaras de campo | Incluído | Não | Não | Biblioteca | Biblioteca | Plugin |
| Componentes de interface | 29 prontos | Não | Não | Biblioteca | Biblioteca | jQuery UI |
| Gráficos | Incluído | Não | Não | Biblioteca | Biblioteca | Plugin |
| Animação com mola | Incluído | Não | Não | Biblioteca | Biblioteca | Básico |
| Roteador | Incluído | Não | Parcial | Oficial | Biblioteca | Não |
| Funciona com CSP restritiva | Sim | Não | Sim | Com build | Sim | Sim |
| Ecossistema | Novo | Médio | Médio | Enorme | Enorme | Enorme |

A leitura honesta: Alpine e HTMX são menores porque fazem menos. Vue e React têm
ecossistema, ferramental e comunidade que a Voodoo não tem. A Voodoo entrega, em um arquivo,
o conjunto que normalmente exige juntar cinco bibliotecas.

## Quando não usar a Voodoo

Vale dizer com clareza:

- **Aplicação muito grande, com dezenas de telas e um time grande.** Vue, React, Angular e
  Svelte têm ferramental, padrões e mercado de trabalho que a Voodoo não tem.
- **Você precisa de renderização no servidor com hidratação.** A Voodoo roda no cliente.
  Ela convive bem com HTML vindo do servidor, mas não faz hidratação.
- **Aplicativo móvel nativo.** Não existe equivalente ao React Native aqui.
- **Seu time já domina outro framework e o projeto já está em pé.** Trocar por trocar não paga.
- **Você quer o menor arquivo possível e só precisa de dois ou três comportamentos.**
  Alpine.js pode ser a escolha melhor.

A Voodoo brilha em: painéis administrativos, páginas de produto, formulários, sites
institucionais dinâmicos, protótipos, aplicações internas, e projetos com Rails, Laravel,
Django ou PHP que só precisam de interatividade sem virar uma SPA.

## Migrando

### Do jQuery

| jQuery | Voodoo.js |
| --- | --- |
| `$('#a').text(v)` | `V('#a').text(v)` ou `<b v-text="v">` |
| `$('#a').on('click', fn)` | `<button @click="fn">` |
| `$('#a').addClass('x')` | `:class="{ x: cond }"` |
| `$('#a').show()` | `v-show="cond"` |
| `$.get(url, cb)` | `<div v-get="url" v-target="#alvo">` |
| `$('form').submit(...)` | `<form v-submit="/api">` |
| `$.each(lista, fn)` | `<li v-for="i in lista">` |

### Do Alpine.js

Quase tudo tem o mesmo nome. `x-data` vira `v-data`, `x-show` vira `v-show`, `x-for` vira
`v-for`. As diferenças: a Voodoo aceita `{ valor }` no texto, traz HTTP, validação,
máscaras, gráficos e componentes prontos embutidos, e não usa `eval`.

### Do Vue

`v-if`, `v-for`, `v-model`, `v-bind`, `v-on`, `:atalho` e `@atalho` funcionam igual.
A diferença é que não existe passo de build nem arquivo `.vue`, e a interpolação padrão é
`{ x }` em vez de `{{ x }}`, embora as duas sejam aceitas.

## Segurança

- **Sem `eval` e sem `new Function`.** Analisador próprio, compatível com CSP sem `unsafe-eval`.
- **Globais em lista fechada.** De dentro de um atributo você não alcança `window`, `document`,
  `fetch`, `localStorage` nem `globalThis`.
- **`v-text` escapa HTML.** Use `v-html` apenas com conteúdo em que você confia, porque ele
  insere markup sem escapar e pode abrir espaço para XSS.
- **Token CSRF automático.** O cliente HTTP lê `<meta name="csrf-token">` e envia no cabeçalho.

## Tamanho real

Medido com `node scripts/size.mjs` neste repositório:

| Bundle | Cru | Gzip | Brotli | O que inclui |
| --- | --- | --- | --- | --- |
| Sob medida (núcleo, directives, DOM) | 108 KB | **36 KB** | 31 KB | Reatividade, directives, componentes, DOM |
| `voodoo.min.js` | 235 KB | **75 KB** | 64 KB | O anterior mais HTTP, formulários, validação, máscaras, interface, arrastar e soltar, avisos |
| `voodoo.full.min.js` | 399 KB | **120 KB** | 100 KB | Tudo, mais gráficos, animações, roteador, idiomas, inspetor e 29 componentes |

Importando por bundler, o tree shaking derruba o que você não usa: importar apenas
`reactive` e `http` traz cerca de 9 KB gzip.

## Demos

Aplicações completas em [`examples/`](examples/):

| Demo | O que mostra |
| --- | --- |
| [Lista de tarefas](examples/todo/) | `v-for` com chave, `v-model`, filtros, persistência, reordenar arrastando |
| [Pokédex](examples/pokedex/) | API real, busca com debounce, rolagem infinita, modal, gráfico de atributos |
| [Painel](examples/dashboard/) | Quatro tipos de gráfico, tabela ordenável, filtro de período, tema |
| [CRUD](examples/crud/) | Formulário validado, CPF e telefone com máscara, aviso, confirmação |
| [Loja](examples/ecommerce/) | Catálogo, filtros, carrinho em store global, cupom, finalização |
| [Kanban](examples/kanban/) | Arrastar cartões entre colunas, modal de edição, persistência |
| [Chat](examples/chat/) | Lista de mensagens, indicador de digitando, rolagem automática |

Para rodar tudo localmente:

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js
npm install
npm run build
node scripts/serve.mjs
```

## Roadmap

Já implementado e testado: reatividade, analisador seguro, motor de DOM, componentes,
directives de estado e renderização, eventos, formulários, validação, máscaras, HTTP
declarativo, interface, arrastar e soltar, animações, gráficos, roteador, idiomas, stores,
persistência, sincronia entre abas, desfazer e refazer, inspetor e linha de comando.

Ainda não implementado, sem data marcada:

- Renderização no servidor com hidratação
- Compilador opcional para pré-compilar expressões
- Extensão de navegador dedicada, além do inspetor embutido
- Plugin de Vite para recarregamento a quente
- Pacote de tempo real com WebSocket
- Componentes avançados: carrossel, seletor de data, tabela com dados remotos

## Contribuindo

```bash
npm install
npm test          # 177 testes
npm run typecheck
npm run build
node scripts/size.mjs
```

Leia [CONTRIBUTING.md](CONTRIBUTING.md). Toda contribuição é bem-vinda: código, documentação,
tradução, exemplo, reporte de erro.

## Licença

MIT. Veja [LICENSE](LICENSE).

<div align="center">
<br>
<img src="brand/mascot/vudu.svg" alt="Vudu" width="110">
<br>
<strong>JavaScript feels like magic.</strong>
<br><br>
Se a Voodoo te poupou tempo, deixe uma estrela. Ajuda mais gente a encontrar o projeto.
</div>

<!--
  Sugestao de topics para cadastrar no GitHub:
  javascript, framework, frontend, no-build, html-first, reactive, vanilla-js,
  micro-framework, alpinejs-alternative, htmx-alternative, jquery-alternative,
  vue-alternative, cdn, zero-dependencies, typescript, reactivity, web,
  ui-components, form-validation, spa

  Descricao sugerida do repositorio:
  JavaScript feels like magic. Micro framework sem build que transforma HTML em
  aplicacao reativa por atributos. Reatividade, componentes, HTTP, formularios,
  graficos e UI em uma tag script. Zero dependencias.
-->
