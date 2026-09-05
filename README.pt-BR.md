<div align="center">

<img src="brand/logo/voodoo-logo.svg#gh-light-mode-only" alt="Voodoo.js" width="380">
<img src="brand/logo/voodoo-logo-dark.svg#gh-dark-mode-only" alt="Voodoo.js" width="380">

### JSX rodando direto de um arquivo `.html`.

**Escreva JSX. Salve o arquivo. Abra no navegador. Não existe nada no meio.**

Sem bundler · Sem transform de JSX · Sem dependências em tempo de execução · Sem configuração

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-FFB35C.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-completo-3178C6.svg)](#typescript)
[![npm](https://img.shields.io/npm/v/voodoojs.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![downloads](https://img.shields.io/npm/dm/voodoojs.svg?label=downloads&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![voodoo.full.min.js](https://img.shields.io/github/size/kwy404/Voodoo.js/packages%2Fvoodoojs%2Fdist%2Fvoodoo.full.min.js?branch=main&label=voodoo.full.min.js)](packages/voodoojs/dist/voodoo.full.min.js)

<img src="brand/mascot/vudu-wave.svg" alt="Vudu, o mascote da Voodoo.js" width="120">

*JavaScript feels like magic.*

**[Site](https://kwy404.github.io/Voodoo.js/) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [Componentes](https://kwy404.github.io/Voodoo.js/components.html) · [Exemplos](https://kwy404.github.io/Voodoo.js/examples/) · [Documentação](https://kwy404.github.io/Voodoo.js/docs/)**

Tudo acima roda no navegador, e foi feito com a própria Voodoo.js.

[JSX em HTML puro](#jsx-em-html-puro) · [Instalação](#instalação) · [Início rápido](#início-rápido) · [Benchmarks](#desempenho) · [Contribuir](#contribuindo) · [English](README.md)

</div>

## JSX em HTML puro

Salve como `index.html` e abra. Não tem passo de build, não tem bundler, não tem
compilador e não tem transform de JSX.

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js" defer></script>
</head>
<body>

{
  const usuario = 'Ana';
  const frutas = ['maçã', 'pera', 'uva'];
}

<h1>Olá, {usuario}!</h1>

<ul>
  {frutas.map((fruta) => (
    <li>{fruta}</li>
  ))}
</ul>

</body>
</html>
```

Esse é o diferencial. Qualquer outro jeito de escrever JSX precisa de uma
ferramenta entre o arquivo que você edita e o arquivo que o navegador carrega.
Aqui *é* o arquivo que o navegador carrega.

| Para renderizar a lista acima | O que é preciso |
| --- | --- |
| React | npm install, um bundler, Babel ou SWC, um build, um dev server |
| Preact | npm install, um bundler, um transform de JSX — ou `htm`, que não é JSX |
| Solid | npm install, um bundler, o compilador próprio; JSX não é opcional |
| Vue | npm install, um bundler, `@vitejs/plugin-vue` — ou render functions na mão |
| Svelte | npm install, um bundler, o compilador do Svelte — e não é JSX |
| **Voodoo.js** | **uma tag `<script>`** |

O custo honesto, dito logo de cara: essas ferramentas compilam o JSX para
chamadas diretas de DOM antes de rodar, e a Voodoo lê o JSX em tempo de
execução. Um compilador vence um interpretador em throughput de atualização, e
sempre vai vencer — os [benchmarks](#desempenho) abaixo mostram exatamente onde
e por quanto. O que você recebe em troca é um arquivo que dá para abrir, editar
e mandar para alguém sem que exista um `node_modules` em lugar nenhum da
história.

Condicionais devolvem elementos como no JSX, e de um jeito que o JSX não tem:

```html
<p>{logado ? <b>Bem-vindo de volta</b> : <b>Faça login</b>}</p>
<p>{logado && <b>Só quando é verdadeiro</b>}</p>

<p>
  {if (nivel === 1) (<b>um</b>)
   else if (nivel === 2) (<b>dois</b>)
   else (<b>outro</b>)}
</p>
```

Um `if / else if / else` de verdade devolvendo elementos é coisa que o próprio
JSX não oferece.

Callbacks têm corpo de verdade, então ramificar por item se escreve como em
qualquer outro lugar:

```html
<ul>
  {produtos.map(item => {

    if (item.estoque === 0) {
      return (<li>{item.nome}: sem estoque</li>);
    }

    const rotulo = item.estoque > 6 ? 'bastante' : 'pouco';
    return (<li>{item.nome}: {rotulo}</li>);

  })}
</ul>
```

E é reativo. Uma região é um efeito, então `itens.push(...)` re-renderiza a
lista, e tudo compõe com o resto: `v-data`, `@click`, `v-model`, stores.

### Como isso é possível

O navegador já parseou a página, e o que sobra dá para recuperar. Para a lista
acima o DOM são três irmãos: o texto `{frutas.map((fruta) => (`, o elemento
`<li>{fruta}</li>`, e o texto `))}`. O elemento não é um estrago a contornar, é
o template. Juntar o texto de volta com um marcador onde o elemento estava
reconstrói a expressão exatamente como foi digitada, e ela passa pelo mesmo
lexer, parser e interpretador de qualquer outra expressão. Nada é compilado e
nada é avaliado como string, então continua funcionando sob uma Content Security
Policy estrita.

### As duas regras que mantêm isso fora do seu caminho

Uma região só é reivindicada quando existe um **elemento** dentro das chaves.
`{ contador }` sozinho é interpolação comum, e um `{` solto na prosa nunca
fecha.

E `script`, `style`, `pre`, `code`, `samp`, `kbd`, `textarea`, `template` e
`noscript` nunca são varridos, então uma página cheia de código de exemplo
continua sendo uma página cheia de código de exemplo.

### Não existe `style={{ ... }}`. Use o bind do atributo

```html
<div :style="{ backgroundColor: cor }">    <!-- é assim -->

<div style="{{ backgroundColor: cor }}">   <!-- não faz nada -->
<div style={{ backgroundColor: cor }}>     <!-- não faz nada -->
```

Uma versão anterior deste arquivo marcava a linha do meio como funcionando. Ela
não funciona: um atributo `style` comum nunca é tratado como expressão, porque
só atributos `v-*`, `:` e `@` são lidos. As chaves sobrevivem literalmente como
uma declaração CSS sem sentido e o elemento aparece sem estilo. Com dois-pontos
na frente, o bind normal faz exatamente o que se queria.

A última linha falha por dois motivos, e o segundo vale para qualquer atributo:
valor sem aspas termina no primeiro espaço, então o navegador o transforma em
seis atributos separados antes de qualquer script rodar, passando os nomes para
minúsculo no caminho. Ponha aspas nos valores.

**[Teste os dez exemplos no playground](https://kwy404.github.io/Voodoo.js/playground.html)**

---

## A versão de 30 segundos

Salve este arquivo. Abra no navegador. Funciona.

```html
<script src="voodoo.full.min.js" defer></script>

<div v-data="{ contador: 0 }">
  <button @click="contador--">-</button>
  <strong>{ contador }</strong>
  <button @click="contador++">+</button>
</div>
```

Sem bundler, sem passo de build, sem arquivo de configuração, sem JSX. Só HTML que pensa.

### A mesma ideia, fazendo trabalho de verdade

Estado reativo, uma requisição HTTP ao vivo, um formulário validado e uma notificação — ainda em
uma tag de script, ainda sem passo de build:

```html
<div v-data="{ }">

  <!-- Uma requisição com estado próprio de carregamento, erro e dados, declarada no HTML -->
  <div v-resource="usuarios: /api/usuarios">
    <p v-if="usuarios.loading">Carregando…</p>
    <p v-else-if="usuarios.error">{ usuarios.error.message }</p>
    <ul v-else>
      <li v-for="u in usuarios.data" :key="u.id">{ u.nome }</li>
    </ul>
    <button @click="usuarios.reload()">Atualizar</button>
  </div>

  <!-- Um formulário que valida, envia por AJAX e devolve o resultado -->
  <form v-submit="/api/usuarios" v-method="POST" v-validate
        v-toast-success="Usuário criado" v-reset-success>
    <input name="nome" v-required>
    <input name="email" type="email" v-required v-email>
    <button type="submit" :disabled="$form.loading">
      { $form.loading ? 'Salvando…' : 'Salvar' }
    </button>
  </form>

</div>
```

Essa é a aplicação inteira. Não existe um `app.js` ao lado fazendo a ligação.

## O que é a Voodoo?

React e Vue começam pelo JavaScript: você descreve a interface em uma linguagem de componentes, e o
HTML é o que o framework produz no final.

**A Voodoo começa pelo HTML.** A página que você já tem *é* a aplicação. Você acrescenta atributos a
ela, cada atributo é ligado ao estado reativo, e quando esse estado muda apenas os nós do DOM que
dependem dele são atualizados — nada mais é tocado, e não existe Virtual DOM no meio do caminho.

Quando o HTML não basta, a API `V` está ali: `V.reactive`, `V.component`, `V.http`, `V.store`,
`V.router` e uma coleção de DOM encadeável através de `V('#seletor')`. Se preferir, dá para
escrever a aplicação inteira em JavaScript com `V.createApp().mount('#app')`. É o mesmo runtime, e
os dois modos convivem livremente na mesma página.

Isto não é um "matador de React". É um ponto de partida diferente para um tipo de projeto
diferente: painéis administrativos gerados no servidor, sites de conteúdo, protótipos, páginas
legadas e qualquer coisa em que montar um pipeline de build custa mais do que o problema que você
está resolvendo.

## Por que a Voodoo?

- **JSX sem ferramenta nenhuma.** `{items.map(i => <li>{i}</li>)}` renderiza a partir de um
  `.html` aberto direto do disco. Sem bundler, sem transform, sem build.
- **HTML-first.** O comportamento fica ao lado da marcação a que pertence. Um arquivo, não três.
- **Reatividade granular.** `reactive` / `ref` / `computed` / `effect` sobre Proxy. Uma escrita
  reexecuta apenas os efeitos que de fato leram aquele valor.
- **Sem passo de build obrigatório.** Uma tag `<script>` já é a instalação completa. O build existe
  quando você quiser, nunca por obrigação.
- **Zero dependências em tempo de execução.** Os bundles de navegador não carregam nada além da
  própria Voodoo.
- **Atualização direta do DOM.** Sem Virtual DOM: cada effect escreve no nó que é dele. Listas
  são o único lugar onde um diff é inevitável, e o `v-for` usa a mutação que você fez — `push`,
  `splice`, `shift` — para tocar só nas linhas que mudaram. Veja [desempenho](#desempenho).
- **Parser de expressões seguro.** As expressões dos atributos passam por um lexer de verdade, um
  parser Pratt e um interpretador de AST. Sem `eval`, sem `new Function` — por isso a Voodoo roda
  sob uma Content Security Policy sem `unsafe-eval`.
- **Melhoria progressiva.** A Voodoo nunca toma conta da página: ela enriquece os elementos que
  você marca e deixa o resto em paz, então entra em bases de código existentes sem reescrita.
- **Tudo incluído.** Reatividade, componentes, roteador, HTTP, formulários, validação, máscaras,
  interface, arrastar e soltar, animação, gráficos, i18n e stores vêm na caixa — e não em doze
  pacotes.
- **TypeScript.** O código inteiro é TypeScript e todo ponto de entrada publica declarações.
- **Ferramentas opcionais.** Existe uma CLI para criar projetos e builds sob medida. Você nunca é
  obrigado a usar.

## Duas formas de escrever

**Modo 1 — HTML.** Estado declarado onde ele é usado:

```html
<div v-data="{ contador: 0 }">
  <button @click="contador++">Cliques: { contador }</button>
</div>
```

**Modo 2 — JavaScript.** O mesmo motor de reatividade, guiado pelo seu código:

```js
const estado = V.reactive({ contador: 0 })
V.effect(() => { document.title = `Cliques: ${estado.contador}` })
estado.contador++
```

## Tudo incluído

Cada linha abaixo faz parte do runtime publicado.

| Pilar | O que você tem |
| --- | --- |
| **Reatividade** | `reactive`, `ref`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`, `effectScope`, `flushSync` |
| **Expressões** | Lexer + parser Pratt + interpretador de AST próprios. Sem `eval`, compatível com CSP |
| **Directives** | Texto, condicionais, listas, ligação, classes, estilos, eventos, refs, transições e mais |
| **Componentes** | Props, estado, computados, métodos, watchers, template, estilo próprio, slots nomeados, `provide`/`inject`, ciclo de vida |
| **Modo aplicação** | `V.createApp({…}).mount('#app')` com `use`, `provide`, componentes locais e `unmount` |
| **DOM** | Coleção encadeável via `V('#seletor')`, mais utilitários de transição |
| **HTTP** | Interceptors, timeout, retry exponencial, cache, CSRF, progresso de upload, SSE, stream NDJSON, fila offline |
| **Requisições declarativas** | `v-get`/`v-post`/`v-put`/`v-patch`/`v-delete`, `v-resource`, `v-load`, `v-load-visible`, `v-search`, polling |
| **Formulários** | Envio por AJAX, serialização, upload, dropzone, autosave, aviso ao sair, estado reativo `$form` |
| **Validação e máscaras** | Conjunto completo de regras, regras assíncronas, regras e mensagens próprias, máscaras de entrada |
| **Stores** | `V.store(nome, def, { persist })` e a mágica `$store`, com persistência opcional no `localStorage` |
| **Armazenamento** | `storage`, `session`, `cookie`, `cache`, `url`, `theme` |
| **Interface** | Toast, modal, alert, confirm, prompt, dialog, paleta de comandos, mais directives de abas, dropdown, tooltip, gaveta, popover e acordeão |
| **Arrastar e soltar** | `v-draggable`, `v-droppable`, `v-sortable`, grupos, suporte a teclado |
| **Roteador** | Modos history e hash, params, query, guards, restauração de rolagem, cache de view, `v-link`, `v-router-view`, rotas dinâmicas |
| **i18n** | Mensagens por idioma, `V.t`, `v-t`, pluralização, troca de idioma em tempo de execução |
| **Animação** | Física de mola, stagger, `inView`, progresso de rolagem, presets |
| **Gráficos** | Desenhados em SVG puro, sem dependência de biblioteca de gráficos |
| **Tempo real** | `V.socket` com WebSocket nativo e protocolo Socket.IO, salas publicas e privadas, reconexao com espera progressiva, heartbeat e fila de envio. Declarativo com `v-socket`, `v-room` e `v-on-socket:` |
| **GPU** | `V.gpu` sobre WebGPU com reflexao de WGSL, e a directive `v-shader`. Sem WebGPU, cai no conteudo alternativo do canvas |
| **Devtools** | Inspetor de reatividade `V.xray` e um barramento de eventos |
| **CLI** | `voodoojs-cli`: `init`, `build --modules=…`, `add`, `info` |

## Instalação

**Uma tag script, e nada para instalar**

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js" defer></script>
```

Essa é a instalação inteira. A biblioteca começa sozinha assim que a página fica pronta. O
[unpkg](https://unpkg.com/voodoojs@0.12.5/dist/voodoo.full.min.js) serve o mesmo arquivo, se você preferir.

A tag acima nomeia uma versão exata, então o que você carrega não muda sozinho e a página diz qual
build é. Use a linha `0.11` se preferir que as correções de patch cheguem sem edição. É o build
COMPLETO, que é o que tem JSX; tire o `.full` para o essencial, 84 KB gzip contra 132, se você não
precisar.

**npm**

```bash
npm install voodoojs
```

```js
import V from 'voodoojs'
V.start()

// ou importe só o que precisa — pontos de entrada separados, em ESM e CJS, com tipos
import { reactive, computed } from 'voodoojs/reactivity'
import { http } from 'voodoojs/http'
import { debounce } from 'voodoojs/utils'
```

**Hospedar o arquivo, ou compilar você mesmo**

Para páginas que não podem depender de um host de terceiros, ou uma rede isolada:

```bash
curl -O https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js
# ou compile a partir do código
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install && npm run build   # os bundles saem em packages/voodoojs/dist/
```

```html
<script src="voodoo.full.min.js" defer></script>
```

**CLI**

```bash
npx voodoojs-cli init minha-pagina                     # cria um projeto pronto para abrir
npx voodoojs-cli build --modules=core,directives,http  # bundle sob medida, só com o que você usa
npx voodoojs-cli add card                              # copia um componente para o seu projeto
npx voodoojs-cli info                                  # lista os módulos e o tamanho de cada um
```

**Qual bundle escolher?**

| Arquivo | O que vem dentro |
| --- | --- |
| `voodoo.core.min.js` | Build mínimo: reatividade, expressões, directives, componentes, DOM, requisições |
| `voodoo.min.js` | **Build essencial — o padrão.** Soma formulários, validação, máscaras, interface, arrastar e soltar |
| `voodoo.full.min.js` | Tudo: gráficos, animação, roteador, i18n, devtools, componentes prontos |

Os tamanhos são dinâmicos — veja o badge acima, ou rode `npm run size` / `npx voodoojs-cli info`.

## Início rápido

**Estado, eventos e ligação de dois sentidos.** A interpolação usa chave simples:
`{ expressão }`. `{{ expressão }}` também é aceita, para quem vem do Vue.

```html
<div v-data="{ nome: 'Mundo', email: '' }">
  <p>Olá, { nome }!</p>
  <button @click="nome = 'Voodoo'">Trocar</button>

  <input v-model="email" type="email">
  <p v-show="email">Você digitou: { email }</p>
</div>
```

**Condicionais, listas, classes e estilos.**

```html
<div v-data="{ status: 'pronto', itens: ['um', 'dois'], largura: 60 }">
  <p v-if="status === 'carregando'">Carregando…</p>
  <p v-else-if="status === 'erro'">Alguma coisa deu errado.</p>
  <p v-else>Pronto.</p>

  <li v-for="(item, i) in itens" :key="i">{ i + 1 }. { item }</li>

  <span :class="{ 'ativo': status === 'pronto' }" :style="{ width: largura + '%' }"></span>
</div>
```

**HTTP sem escrever fetch, e um componente.**

```html
<button v-get="/api/estatisticas" v-target="#painel" v-swap="innerHTML">Carregar</button>
<div id="painel"></div>

<script>
  V.component('cartao-usuario', {
    props: { nome: { type: 'string', default: 'Anônimo' } },
    template: `<div class="cartao"><strong v-text="nome"></strong></div>`
  })
</script>

<cartao-usuario nome="Ada"></cartao-usuario>
```

## Componentes

Um componente é um escopo com estado, métodos, computados, watchers, props, slots e ciclo de vida,
montado sobre um elemento. Sem passo de compilação, sem formato de arquivo único.

```js
V.component('contador', {
  props: {
    inicio: { type: 'number', default: 0 },
    rotulo: { type: 'string', required: true }
  },

  state(props) { return { valor: props.inicio } },

  computed: { dobro() { return this.valor * 2 } },

  methods: {
    somar() {
      this.valor++
      this.emit('mudou', this.valor)   // um CustomEvent de verdade, que sobe pela árvore
    }
  },

  watch: { valor(v) { console.log('agora', v) } },

  template: `
    <button @click="somar()">{ rotulo }: { valor }</button>
    <small>dobro: { dobro }</small>
    <slot name="rodape"></slot>
  `,

  style: `.contador { font-weight: 600 }`,

  mounted() { /* o elemento já está no DOM */ }
})
```

Três formas equivalentes de usar, e ouvir o que ele emite é um listener comum:

```html
<div v-component="contador" rotulo="Cliques"></div>
<contador rotulo="Cliques" :inicio="10" @mudou="console.log($event.detail)"></contador>
<Contador rotulo="Cliques"></Contador>
```

Atributos estáticos viram props de texto, convertidas para o `type` declarado. Atributos escritos
com `:` são ligações reativas avaliadas no escopo do pai, e o conteúdo dos slots também; slots
nomeados casam por `slot="nome"`. Dentro da instância você ainda tem `$el`, `$props`, `$refs`,
`$parent`, `$name`, `$emit`, `$watch` e `$nextTick`, mais `provide` / `inject` para injeção de
dependência.

**Modo aplicação** — se preferir descrever tudo em JavaScript:

```js
V.createApp({
  data: () => ({ n: 0 }),
  computed: { dobro() { return this.n * 2 } },
  methods: { somar() { this.n++ } },
  template: `<button @click="somar()">Cliques: { n }</button><p>Dobro: { dobro }</p>`
}).mount('#app')
```

O `mount` aceita um alvo que ainda não existe — ele espera, então não há corrida com o carregamento
da página. O `unmount` devolve o HTML original do container em vez de deixá-lo vazio.

## HTTP

**Declarativo.** Ligue uma requisição a um elemento e diga para onde vai a resposta:

```html
<button v-get="/api/relatorio" v-target="#saida" v-swap="innerHTML">Carregar</button>

<button v-delete="'/api/usuarios/' + usuario.id"
        v-confirm="Excluir este usuário?"
        v-toast-success="Usuário excluído">Excluir</button>

<div v-get="/api/feed" v-trigger="visible" v-poll="30s"></div>

<input v-search="/api/busca" v-param="q" v-debounce="300ms" v-target="#resultados">
```

A URL pode ser um literal (`/api/usuarios`) ou uma expressão (`'/api/usuarios/' + id`). Os
atributos de apoio incluem `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-body`, `v-params`,
`v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`, `v-template`, `v-offline-queue`,
`v-redirect`, `v-scroll-to`, `v-toast-success`, `v-toast-error`, `v-on-success`, `v-on-error` e
`v-on-complete`.

O `v-resource` é a versão que entrega o estado da requisição como dado reativo em vez de trocar
HTML. Ele expõe `data`, `loading`, `error`, `loaded`, `reload()` e `set()` — veja a demonstração no
começo deste arquivo.

**Programático.**

```js
const usuarios = await V.http.get('/api/usuarios')
const criado   = await V.http.post('/api/usuarios', { nome: 'Ada' })

// Resposta completa, com status e cabeçalhos
const res = await V.http.request({ url: '/api/usuarios', retry: 2, timeout: 5000, cache: 60000 })

// Upload com progresso real
await V.http.upload('/api/arquivos', formData, { onProgress: (pct) => console.log(pct + '%') })

// Server-Sent Events e stream NDJSON
V.http.sse('/api/eventos', { message: (dados) => console.log(dados) })
await V.http.stream('/api/tokens', (linha) => console.log(linha))
```

Padrões, interceptors, URL base, cabeçalho de CSRF e cache ficam em `V.http.defaults` e
`V.http.interceptors`.

## Formulários

Enviar, validar, mostrar o carregamento e reportar o resultado — tudo declarado no próprio
formulário:

```html
<form v-submit="/api/contato" v-method="POST" v-validate
      v-toast-success="Mensagem enviada" v-toast-error="Não foi possível enviar" v-reset-success>

  <input name="nome" v-required>
  <input name="email" type="email" v-required v-email>
  <input name="telefone" v-mask="phone">
  <textarea name="mensagem" v-minlength="20"></textarea>

  <p v-if="$form.errors.email">{ $form.errors.email }</p>

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Enviando…' : 'Enviar' }
  </button>
</form>
```

`$form` é reativo e carrega `loading`, `saving`, `success`, `errors`, `message`, `data`, `status`,
`dirty` e `progress`. O conjunto de regras cobre o esperado — `required`, `email`, `url`, `number`,
`min`, `max`, `minlength`, `maxlength`, `between`, `match`, `regex`, `date`, `same`, `different`,
`in`, `strongpassword`, `cpf`, `cnpj`, `cep` e mais — além de regras assíncronas e das suas
próprias, via `V.validator()`.

## Construindo aplicações completas

A Voodoo cresce além de uma página sem mudar o modelo.

- **Componentes** — registre uma vez, use como tag em qualquer lugar da página.
- **Stores** — `V.store('carrinho', { itens: [] }, { persist: true })`, lido em qualquer lugar como
  `$store.carrinho`.
- **Roteador** — `V.router({ mode: 'history', routes: { '/usuarios/:id': { component: 'pagina-usuario' } } })`,
  com guards, params, comportamento de rolagem, `v-link` e `v-router-view`.
- **Plugins** — `V.use(plugin)` ou `app.use(plugin)` para registrar directives, componentes e
  serviços.
- **Carregamento sob demanda** — `v-load-visible` e rotas com `view` buscam o HTML só quando ele é
  necessário.
- **i18n** — `V.i18n({ locale: 'pt-BR', messages })`, depois `v-t` na marcação e `V.t()` no código.

Cada um deles tem o seu guia em [`docs/`](docs/).

## DevTools

O build completo traz o `xray`, um inspetor visual de reatividade: ele mostra a árvore de escopos,
o estado ao vivo, quais efeitos estão rodando, e os registros de eventos e de rede.

**Aperte `Ctrl+Shift+F2`.** É toda a configuração. Carregue o build completo e o atalho já está
escutando, tendo você pedido devtools ou não.

Uma página completa. Salve, abra, clique algumas vezes no botão, aperte as teclas e veja o
`count` mudar no painel enquanto o botão pisca a cada escrita.

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.12.5/dist/voodoo.full.min.js" defer></script>
</head>
<body>
  <div v-data="{ count: 0, items: ['a', 'b'] }">
    <button @click="count++">cliquei { count } vezes</button>
    <button @click="items.push('c')">adicionar item</button>
    <ul><li v-for="i in items">{ i }</li></ul>
  </div>
</body>
</html>
```

Tem que ser o `voodoo.full.min.js`. O inspetor não está nos builds core e essencial, e esses dois
avisam no console em vez de falhar em silêncio.

### Abrindo por código

```js
V.xray()        // alterna o painel
V.xray(true)    // abre
V.xray(false)   // fecha
```

### Trocando ou removendo o atalho

Nenhuma combinação está livre em toda máquina, então esta é configurável:

```html
<script src="voodoo.full.min.js" data-xray-shortcut="alt+shift+d" defer></script>
<script src="voodoo.full.min.js" data-xray-shortcut="false" defer></script>
```

```js
V.config.xrayShortcut = 'ctrl+shift+f9';
V.config.xrayShortcut = false;
```

A última parte nomeia a tecla **física**, então o atalho se comporta igual em qualquer layout de
teclado. `Ctrl+Shift+F2` é o terceiro default: o `Ctrl+Shift+X` fecha a aba no Opera, e o
`Alt+Shift+V` é o alternador de layout de teclado do Windows, que pega as teclas antes da página
ver. `Ctrl+Alt` está fora pelo mesmo motivo, sendo AltGr no ABNT2 e na maioria dos layouts
europeus.

### Os avisos detalhados são outra coisa

O `data-devtools` é uma chave diferente. Ele liga os avisos detalhados no console e monta o widget
na tela; não é necessário para o atalho.

```html
<script src="voodoo.full.min.js" data-devtools defer></script>
```

## Arquitetura

```
  atributos HTML ─▶  Walker + MutationObserver      acha os atributos v-*, monta os escopos
                            │
  expressões     ─▶  Lexer → parser Pratt → interpretador de AST   sem eval, sem new Function
                            │
                     Reatividade: alvos em Proxy + efeitos   leituras rastreadas, escritas na fila
                            │
                     Directives atualizam os nós reais do DOM   sem Virtual DOM, sem diff

  Por cima: componentes · stores · roteador · HTTP · formulários · interface · i18n · animação · gráficos
```

A versão longa, com as fronteiras de cada módulo e o modelo de escopos, está em
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Desempenho

Os benchmarks são reproduzíveis: versões de dependência fixadas, builds de produção, metodologia
publicada e ambiente registrado. O relatório completo — incluindo os casos em que a Voodoo *perde*
— está em [`benchmarks/README.md`](benchmarks/README.md), com a metodologia, o ambiente e como
reproduzir cada medição.

O JavaScript puro é o teto aqui, e a Voodoo cobra um custo real pela produtividade que entrega. A
função destes números é mostrar o tamanho desse custo, não fingir que ele é zero.

### Listas: quanto custa uma mudança, de verdade

Um `v-for` é um único effect sobre uma coleção inteira, e por isso é o único lugar da Voodoo onde
existe um diff. Quando a coleção muda, o effect roda de novo e alguma coisa precisa descobrir o que
isso significa para `n` linhas.

Até a 0.13 essa decisão custava o mesmo, tivesse acontecido o que tivesse. A `:key` de cada linha
passava pelo interpretador de expressões, o `normalizeSource` alocava um objeto por linha, três
estruturas de hash do tamanho da lista eram montadas e jogadas fora, e uma passada de posicionamento
lia uma propriedade do DOM para cada linha. Ler as linhas através do proxy reativo ainda inscrevia a
lista em todos os `n` índices e na propriedade que a chave tocava em todos os `n` itens, então cada
re-renderização primeiro removia o effect desses conjuntos de dependência e o colocava de volta —
cerca de `4n` operações de hash antes de o reconciliador ter olhado para qualquer coisa. Remover uma
linha de dez mil fazia tudo isso para concluir que 9.999 linhas não tinham saído do lugar.

A 0.13 parte de outra pergunta: **o que já se sabe?**

`push`, `pop`, `shift`, `unshift` e `splice` são interceptados onde acontecem. Agora rodam contra o
array cru — um `splice` no meio não dispara mais um trap de proxy e uma notificação de dependência
por elemento que ele desloca — e registram o que fizeram. Quando a lista re-renderiza, ela lê esse
registro em vez de redescobrir. `rows.splice(5000, 1)` em dez mil linhas diz que saiu exatamente uma
linha, no índice 5000, e nada mais é examinado.

Quando não há registro para ler — um array novo foi atribuído — a região que mudou é encontrada
comparando chaves das duas pontas para dentro, com a expressão da chave compilada uma vez para uma
leitura de propriedade em vez de interpretada por linha. Isso custa uma leitura de propriedade por
linha e **não dá para ficar mais barato**: para saber que a linha 9.999 não mudou é preciso olhar
para a linha 9.999. Nenhum fingerprint, hash de bloco ou rolling hash evita isso, porque calcular o
fingerprint da lista nova significa ler todas as chaves dela antes.

![Reconciliação de listas: antes e depois](docs/media/reconcile-before-after.svg)

| caso | antes | depois | ganho | chaves avaliadas | alocações |
| --- | ---: | ---: | ---: | ---: | ---: |
| criar 1.000 linhas | 81.5 ms | 84.4 ms | — | 1,000 → 1,000 | 1,010 → 0 |
| criar 10.000 linhas | 809 ms | 809 ms | — | 10,000 → 10,000 | 10,010 → 0 |
| criar 50.000 linhas | 4049 ms | 3840 ms | — | 50,000 → 50,000 | 50,010 → 0 |
| acrescentar 1 em 10.000 — array novo | 40.9 ms | 11.6 ms | **3.5x** | 20,001 → 20,001 | 20,011 → 0 |
| push de 1 em 10.000 — no lugar | 34.2 ms | 1.94 ms | **17.6x** | 20,001 → 1 | 20,011 → 0 |
| acrescentar 5.000 a 5.000 | 470 ms | 418 ms | **1.1x** | 15,000 → 15,000 | 15,010 → 0 |
| inserir 1 no início de 10.000 — array novo | 38.6 ms | 8.40 ms | **4.6x** | 20,001 → 20,003 | 20,011 → 0 |
| unshift de 1 em 10.000 — no lugar | 56.0 ms | 0.297 ms | **188.7x** | 20,001 → 1 | 20,011 → 0 |
| inserir 5.000 no início de 5.000 | 530 ms | 412 ms | **1.3x** | 15,000 → 15,002 | 15,010 → 0 |
| remover a primeira de 10.000 — array novo | 40.9 ms | 9.28 ms | **4.4x** | 19,999 → 20,001 | 20,009 → 0 |
| remover a do meio de 10.000 — array novo | 41.7 ms | 10.2 ms | **4.1x** | 19,999 → 20,001 | 20,009 → 0 |
| remover a última de 10.000 — array novo | 39.4 ms | 11.2 ms | **3.5x** | 19,999 → 19,999 | 20,009 → 0 |
| splice da linha do meio de 10.000 — no lugar | 45.3 ms | 0.853 ms | **53.1x** | 19,999 → 1 | 20,009 → 0 |
| shift da primeira de 10.000 — no lugar | 61.6 ms | 0.096 ms | **641.1x** | 19,999 → 1 | 20,009 → 0 |
| pop da última de 10.000 — no lugar | 37.5 ms | 1.51 ms | **24.8x** | 19,999 → 1 | 20,009 → 0 |
| inserir 1 no meio de 10.000 — array novo | 42.5 ms | 10.7 ms | **4.0x** | 20,001 → 20,003 | 20,011 → 0 |
| splice de 1 no meio de 10.000 — no lugar | 48.6 ms | 0.684 ms | **71.0x** | 20,001 → 1 | 20,011 → 0 |
| trocar 1 de 10.000 por outra chave | 40.1 ms | 11.7 ms | **3.4x** | 20,000 → 20,006 | 20,010 → 6 |
| mudar 1 rótulo em 10.000 | 0.116 ms | 0.111 ms | — | 0 → 0 | 0 → 0 |
| reatribuir um array idêntico de 10.000 | 52.4 ms | 9.57 ms | **5.5x** | 10,000 → 10,000 | 10,005 → 0 |
| trocar 2 linhas de lugar em 10.000 | 9585 ms | 16.6 ms | **575.9x** | 20,000 → 20,004 | 20,010 → 6 |
| inverter 10.000 linhas | 3989 ms | 4130 ms | — | 20,000 → 20,004 | 20,010 → 6 |
| embaralhar 10.000 linhas | 7890 ms | 7690 ms | — | 20,000 → 20,004 | 20,010 → 6 |
| limpar uma lista de 10.000 | 144 ms | 134 ms | — | 10,000 → 10,000 | 10,010 → 0 |

O tempo é o sintoma; os contadores são a causa. O reconciliador conta o que faz — linhas visitadas,
chaves avaliadas, escritas que passaram por um proxy reativo, nós criados, removidos e movidos — e o
benchmark coleta isso em uma segunda passada com os cronômetros desligados, para que a instrumentação
nunca entre em um número medido.

![Quantas vezes a chave de uma linha foi calculada, por edição](docs/media/reconcile-work.svg)

As duas famílias merecem ser lidas separadamente, porque têm pisos diferentes. Uma lista mutada no
lugar recebe uma resposta que não depende do tamanho dela; uma lista substituída inteira paga uma
leitura de chave por linha, por mais esperto que seja o algoritmo. Mesma edição, mesmo DOM,
informação diferente disponível.

![O custo de uma edição contra o tamanho da lista](docs/media/reconcile-scaling.svg)

Qual caminho uma edição toma não é algo que um teste de correção mostre — um caminho rápido que cai
para o lento em silêncio passa em todos eles. Então isso também é contado, inclusive nos formatos em
que o caminho rápido não se aplica:

![Qual caminho cada edição tomou](docs/media/reconcile-paths.svg)

E o que chega ao DOM. Um reconciliador que reaproveita todos os elementos ainda pode ser lento se
arrastar todos eles pela lista até o lugar certo; uma passada de maior subsequência crescente sobre
as linhas sobreviventes decide quais podem ficar onde estão, e ela só roda quando linhas realmente
se cruzaram, então nenhuma inserção, remoção ou append paga por ela.

![Nós criados, removidos e movidos por edição](docs/media/reconcile-dom-ops.svg)

**Quanto custa cada caminho.** `n` é o tamanho da lista, `k` as linhas que a edição tocou, `r` o
tamanho da região que mudou.

| Caminho | Quando | Custo |
| --- | --- | --- |
| mutação, inserção ou remoção | `push` / `pop` / `shift` / `unshift` / `splice` em lista com chave | O(k) |
| mutação, em lote | várias mutações no mesmo tick | O(r), r = a faixa que elas cobrem juntas |
| varredura, depois inserir ou remover | array novo, uma edição localizada | O(n) leituras de chave + O(k) de trabalho |
| varredura, depois reordenar | array novo, linhas se cruzaram | O(n) leituras de chave + O(r log r) |
| sem chave, qualquer mudança | sem `:key` | O(n) — a posição *é* a identidade, então toda linha depois da edição mudou de verdade |
| `reverse` / `sort` no lugar | nenhuma faixa descreve o resultado | O(n) + O(n log n) |

O maior número daquela tabela não é ganho algorítmico nenhum — é um bug que os contadores acharam.
Trocar duas linhas de lugar em dez mil levava **9.585 ms**, e o motivo eram 19.994 movimentos de DOM:
a passada de posicionamento antiga percorria a lista de trás para frente, e a primeira linha que não
batia fazia todas as seguintes falharem no mesmo teste, então uma troca de duas linhas arrastava a
lista inteira junto. Agora move 2 linhas e leva 16,6 ms.

**Onde não ajuda, dito sem rodeio.**

*Inverter e embaralhar não mudaram* — 3.989 ms contra 4.130 ms, e 7.890 contra 7.690. Os dois já
moviam perto do mínimo: inverter uma lista exige mover todas as linhas menos uma, seja qual for o
diff, e o que o cronômetro mede ali é `insertBefore` dentro de um pai com dez mil filhos, não o
reconciliador. Um algoritmo melhor não economiza trabalho que o DOM faz questão de fazer.

*Criar uma lista não mudou* pelo mesmo motivo. O `create 50.000` é o custo de inserir 50.000 nós; o
reconciliador é erro de arredondamento do lado disso.

*Duas edições em pontas opostas custam o que comparar custa.* A região que mudou é uma faixa
contígua única, então dar `push` em uma linha e `shift` em outra — o formato de um log rolante —
produz uma faixa que cobre tudo entre elas. Correto, e não mais rápido que a varredura. Quebrar isso
em várias regiões disjuntas resolveria; não está implementado, porque é complexidade real para um
formato que nenhum destes benchmarks mede.

*Listas sem `:key` identificam linhas pela posição*, então remover a primeira muda de verdade todas
as seguintes e não há o que pular.

O método completo, os contadores e como reproduzir qualquer coisa disso estão em
[`benchmarks/README.md`](benchmarks/README.md); o algoritmo e suas invariantes, em
[`ARCHITECTURE.md`](ARCHITECTURE.md#5-list-reconciliation).

### Desmontar uma lista

O `v-if` e o `v-for` tiram o elemento do documento e passam a
usá-lo como o modelo que clonam. A limpeza desse elemento — o escopo de efeito que segurava o
modelo, cada bloco renderizado e cada nó dentro deles — estava indexada por ele, e o `destroy()` só
percorre filhos vivos. Depois de destacado, nada mais o alcançava: o escopo nunca parava e segurava
tudo que a lista já tinha renderizado.

![Desmontagem do v-for: antes e depois](docs/media/vfor-teardown.svg)

O número antigo crescia com a lista, porque era proporcional ao que tinha sido renderizado: 394 KB
retidos por montagem com 50 linhas, 750 KB com 100, 1,5 MB com 200. O novo não cresce, e o que
sobra é ruído, não retenção. O benchmark de memória do próprio projeto não conseguia terminar antes
disso — estourava um heap de 3,8 GB e derrubava o resto do suite junto — e o caso de alternância do
`v-if` caiu de 5.683 ms para 3.079 ms quando o lixo parou de se acumular, ou seja, o vazamento
custava tempo além de memória.

Medido no Node 24 com jsdom, cinquenta ciclos de montar e destruir por tamanho, com coleta forçada
entre as amostras, em uma máquina só. Leia como a forma da mudança, e não como número absoluto: o
seu navegador não é o jsdom. Reproduza com `node --expose-gc scripts/measure-teardown.mjs`, que
constrói as duas versões, mede e devolve o fonte ao estado original.

Uma ressalva honesta da mesma medição: a *criação* da lista nesse tamanho é dominada pelo próprio
DOM. Inserir 4.000 nós sem framework nenhum levou mais tempo no jsdom do que a renderização inteira
da Voodoo, então os números de criação dizem mais sobre o ambiente do que sobre o framework.

### Contra outros frameworks

Sete implementações da mesma lista de 1.000 linhas,
todas empacotadas em produção e minificadas, rodando em sequência no mesmo processo contra o
mesmo documento jsdom. Depois de cada cenário o DOM de cada framework é reduzido à lista de
textos dos `<li>` e comparado com o vanilla escrito à mão: quem produzir saída diferente é
excluído, e não creditado com um tempo rápido.

![Comparação entre frameworks](docs/media/framework-comparison.svg)

Mediana de 30 amostras, em milissegundos, menor é melhor. Voodoo.js em negrito:

| | criar 1k | atualizar 1 em 10 | limpar 1k | minificado |
| --- | ---: | ---: | ---: | ---: |
| vanilla JS | 39,51 | 6,65 | 20,04 | 0,6 KB |
| Preact 10.29.8 | 71,03 | 2,73 | 30,68 | 10,7 KB |
| **Voodoo.js** | **77,47** | **4,69** | **30,14** | **435,2 KB** |
| Vue 3.5.42 | 78,72 | 14,29 | 32,84 | 62,5 KB |
| Solid 1.9.15 | 80,13 | 0,90 | 21,85 | 16,7 KB |
| React 19.2.8 | 81,22 | 4,65 | 33,55 | 189,3 KB |
| Alpine 3.17.1 | 157,06 | 111,29 | 32,76 | 55,2 KB |

Leia a diferença antes da ordem. Na criação, Preact, Voodoo e Vue terminam a **7,7 ms uma da
outra** numa lista de mil linhas, e Solid e React ficam pouco atrás; é um pelotão de cinco que a
coluna de classificação não consegue expressar. O vanilla escrito à mão ainda monta a lista quase
duas vezes mais rápido que qualquer framework aqui, e esse é o teto honesto.

Na limpeza vale o mesmo para o meio do pelotão: Voodoo, Preact, Alpine e Vue ficam dentro de
2,7 ms. Vanilla e Solid ganham essa com folga.

A atualização é onde a 0.13 mudou o desenho. A Voodoo agora atualiza uma linha em cada dez **mais
rápido que a linha de base escrita à mão em vanilla** — 4,69 ms contra 6,65 — e empatada com o
React em 4,65, o que está dentro do ruído. Fica cerca de **24x à frente do Alpine**, e essa é a
comparação que carrega significado: o Alpine também é HTML-first e também interpreta as expressões
em tempo de execução em vez de compilá-las. O Solid ainda ganha com folga, em 0,90 ms, e o Preact
em 2,73 — os dois chegam lá com um compilador, que é a troca que a Voodoo se recusa a fazer.

Estes números são ruidosos e o relatório diz isso: o coeficiente de variação na atualização chegou
a 50% para a Voodoo e 134% para o Preact nesta execução. Leia como pelotão, não como pódio.

**De onde veio o ganho.** Um harness pareado carregou os dois builds no mesmo processo e intercalou
as amostras, alternando a ordem a cada rodada, para que a variação de 20% a 40% da máquina entre
execuções se cancele. Um A/B nulo, com código idêntico dos dois lados, mediu +-0,5 ms, que é o piso
de ruído que tudo abaixo supera:

| | antes | depois | |
| --- | ---: | ---: | --- |
| criar 1k | 129,98 ms | **82,98 ms** | **-36,2%**, venceu 45 de 45 rodadas |
| limpar 1k | 28,14 ms | **15,59 ms** | **-44,6%**, venceu 38 de 45 |
| atualizar | 2,60 ms | 2,71 ms | sem mudança mensurável |

Quatro mudanças respondem por quase tudo: ler `getAttributeNames()` em vez de indexar a coleção viva
`attributes`, o `v-for` remover o atributo de chave do template da linha para que cada cópia pare de
analisar um atributo só para não fazer nada com ele, campos de classe declarados em vez de emitidos
como chamadas de `Object.defineProperty` sob `useDefineForClassFields`, e montar o escopo de efeito
de uma directive apenas quando alguma coisa realmente precisa dele.

Outras seis otimizações "óbvias" foram medidas e **revertidas** por caírem dentro do piso de ruído.
Elas estão listadas em [`benchmarks/reports/comparison.md`](benchmarks/reports/comparison.md) junto
com as que funcionaram, porque a lista do que não ajudou vale tanto para a próxima pessoa quanto a
lista do que ajudou.

Velocidade e tamanho são duas colunas da mesma decisão, e uma tabela é um instrumento ruim para
segurar as duas ao mesmo tempo. Postas uma contra a outra, a troca que cada projeto fez é o formato
do desenho:

![Quanto cada projeto cobra, e o que entrega](docs/media/size-vs-speed.svg)

Vale dizer com todas as letras: **a Voodoo é de longe o maior bundle desta tabela.** Se tamanho é
a sua principal restrição, Alpine e Preact são a recomendação honesta. O método, os adaptadores de
cada framework e as estatísticas completas estão em
[`benchmarks/reports/comparison.md`](benchmarks/reports/comparison.md); o jsdom não tem layout nem
pintura, então leia isto como formato relativo, e não como verdade absoluta.

### Tamanho dos bundles

![Tamanho dos bundles entre frameworks](docs/media/bundle-sizes.svg)

A Voodoo é o maior bundle daquele gráfico e não há como ler de outro jeito. O que o número de
tamanho não consegue dizer é que os projetos não estão entregando a mesma coisa: roteador,
cliente HTTP, formulários, validação, máscaras, kit de interface, gráficos, i18n, stores,
animação e drag-and-drop estão neste arquivo, e na maioria dos outros são pacotes que você
acrescenta depois.

![O que vem junto com o download](docs/media/batteries.svg)

Os dois gráficos são verdade ao mesmo tempo. Se tamanho de bundle é a sua restrição decisiva,
Alpine e Preact continuam sendo a recomendação honesta, e o `voodoo.core.min.js`, com 48 KB em
gzip, existe para páginas que querem as directives e mais nada.

Medido sobre os builds versionados:

| Build | Minificado | Gzip | Brotli |
| --- | --- | --- | --- |
| `voodoo.core.min.js` | 141.20 KB | 48.28 KB | 42.04 KB |
| `voodoo.min.js` | 265.00 KB | 85.26 KB | 72.12 KB |
| `voodoo.full.min.js` | 442.18 KB | 133.66 KB | 111.09 KB |

Rode você mesmo: o arcabouço de medição e as versões exatas testadas estão em
[`benchmarks/`](benchmarks/).

## Comparação

Uma comparação honesta. Toda ferramenta aqui é boa naquilo para que foi desenhada.

| | Voodoo.js | Alpine.js | HTMX | Vue 3 | React | jQuery |
| --- | --- | --- | --- | --- | --- | --- |
| Ponto de partida | HTML | HTML | HTML | JavaScript | JavaScript | JavaScript |
| Roda por uma tag de CDN | nativo | nativo | nativo | nativo | nativo | nativo |
| Passo de build | possível | possível | possível | recomendado | recomendado | possível |
| JSX sem passo de build | nativo | — | — | — | — | — |
| Renderização | DOM direto | DOM direto | HTML do servidor | Virtual DOM | Virtual DOM | manual |
| Estado reativo | nativo | nativo | — | nativo | nativo | — |
| Componentes | nativo | via pacote do ecossistema | — | nativo | nativo | — |
| Cliente HTTP | nativo | via pacote do ecossistema | nativo | via pacote do ecossistema | via pacote do ecossistema | nativo |
| Formulários + validação | nativo | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema |
| Roteador | nativo | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema |
| Interface (toast, modal, abas) | nativo | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema |
| Gráficos / i18n | nativo | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema | via pacote do ecossistema |
| Renderização no servidor | — | — | nativo (quem renderiza é o servidor) | nativo | nativo | — |
| Tamanho do ecossistema | jovem | crescendo | crescendo | grande | muito grande | muito grande |

A diferença real é filosófica. O **HTMX** diz que o HTML é do servidor e o navegador apenas o
encaixa. O **Alpine** dá ao HTML uma pitada de estado reativo e para por aí, de propósito. **Vue e
React** pedem que você descreva a interface em JavaScript e geram o HTML. A **Voodoo** mantém o
HTML como fonte da verdade *e* entrega a caixa de ferramentas completa — assim você raramente
precisa sair dele, e a API `V` espera pelos momentos em que precisar.

## Quando usar a Voodoo

Encaixa bem em: painéis administrativos gerados no servidor (Laravel, Rails, Django, Spring, PHP
puro); sites de conteúdo e landing pages que precisam de comportamento sem um pipeline de
front-end; protótipos, em que abrir um arquivo vale mais do que qualquer arquitetura; times
pequenos que não querem manter um build só para mostrar uma tabela; páginas legadas, em que a
Voodoo convive com o código existente porque nunca toma conta do documento; e aplicações de página
única completas, com componentes, stores e roteador.

### Limitações atuais

Ditas com clareza, para que nada surpreenda depois:

- **Sem renderização no servidor nem hidratação.** A Voodoo roda no navegador. Os módulos puros
  (reatividade, HTTP, utilitários) funcionam em Node, mas não existe hidratação.
- **Sem alvo nativo em celular.** Não existe equivalente ao React Native.
- **Ecossistema jovem.** Menos plugins de terceiros, integrações e respostas na internet do que os
  frameworks estabelecidos. Essa distância é real e leva tempo para diminuir.
- **Integrações de terceiros limitadas.** Bibliotecas de componentes e ferramentas feitas para
  React ou Vue não vêm junto.
- **Sem tipagem estática dentro dos templates.** As expressões dos atributos são texto; os erros
  aparecem em tempo de execução, não de compilação.
- **Sem virtualização de listas.** O `v-for` reaproveita elementos por chave, mas listas muito
  grandes ainda renderizam todas as linhas.

## Documentação

A documentação existe em dois idiomas: português em [`docs/`](docs/) (completa) e inglês em
[`docs/en/`](docs/en/).

| Onde | O quê |
| --- | --- |
| [`docs/`](docs/) | Índice do guia completo e da referência |
| [`docs/introducao.md`](docs/introducao.md) | O que é, para quem serve, quando não usar |
| [`docs/instalacao.md`](docs/instalacao.md) | Bundles, CDN, npm, configuração pela tag script |
| [`docs/inicio-rapido.md`](docs/inicio-rapido.md) | Do arquivo vazio ao primeiro app |
| [`docs/directives.md`](docs/directives.md) | Referência completa de directives |
| [`docs/api.md`](docs/api.md) | Referência completa da API `V` |
| [`site/`](site/) | Código do site de documentação |

## Exemplos

Cada exemplo é um único arquivo HTML que você pode abrir direto no navegador. Comece por
[`examples/index.html`](site/examples/index.html), ou sirva o repositório inteiro e navegue por eles:

```bash
npm run build && npm run serve
# depois abra http://localhost:5173/examples/
```

O mesmo servidor também hospeda o site da documentação e o playground ao vivo em
[`site/index.html`](site/index.html) (`http://localhost:5173/site/#playground`), onde dá para editar
marcação Voodoo e ver rodando na hora.

**Aplicações**

| Exemplo | O que mostra |
| --- | --- |
| [Tarefas](site/examples/todo/) | Estado, listas, edição no lugar, filtros, reordenação |
| [CRUD](site/examples/crud/) | Um componente, formulários, validação, máscaras, toasts, atualização otimista |
| [Painel](site/examples/dashboard/) | Gráficos, valores computados reativos, atualização periódica |
| [Kanban](site/examples/kanban/) | Arrastar e soltar entre colunas, estado persistido |
| [Chat](site/examples/chat/) | Atualização ao vivo, comportamento de rolagem, composição de mensagem |
| [Chat em tempo real](site/examples/chat-tempo-real/) | `v-socket` e `v-room` sobre WebSocket de verdade, salas públicas, mensagem privada, presença e volta automática às salas depois de reconectar. Vem com um servidor de teste sem dependência |
| [E-commerce](site/examples/ecommerce/) | Catálogo, filtros, store do carrinho, fluxo de compra |
| [Pokédex](site/examples/pokedex/) | Consumo de API real, busca, paginação, carregamento sob demanda |
| [DevTools](site/examples/devtools/) | Ligar o inspetor por um único atributo na tag do script |

**Gráficos e jogos**

Eles existem para provar um ponto: a interface inteira é Voodoo declarativo, e o canvas cuida só do
que realmente precisa de canvas.

| Exemplo | O que mostra |
| --- | --- |
| [Mundo aberto 3D](site/examples/mundo-aberto/) | Uma cidade gerada por código em WebGL2 puro, sem biblioteca nenhuma. Ciclo de dia e noite, sombras, névoa, minimapa e velocímetro, com o HUD e os controles ao vivo escritos como marcação Voodoo comum |
| [Breakout](site/examples/jogos/breakout/) | Cinco níveis, cápsulas de poder que caem, combo, vidas, recorde persistido e som. Jogável por teclado e por toque |
| [Tetris](site/examples/jogos/tetris/) | Saco de sete peças, peça fantasma, guardar peça, wall kick. O tabuleiro é canvas; a fila de próximas é uma grade de spans feita por `v-for` aninhado |
| [Shaders](site/examples/shaders/) | Quatro cenas de raymarching em WebGL2 — Mandelbulb, túnel infinito, metaballs e oceano — com o painel de controle inteiro gerado por `v-for` sobre os uniforms de cada cena, e `v-model` ligado direto na GPU |

## Ecossistema

| Pacote | Para que serve |
| --- | --- |
| [`voodoojs`](packages/voodoojs/) | O framework: runtime, directives, componentes, HTTP, formulários, interface, roteador, i18n |
| [`voodoojs-cli`](packages/cli/) | Criação de projetos, builds sob medida, cópia de componentes, informação de módulos |

## TypeScript

O código inteiro é TypeScript, e todo ponto de entrada publica declarações `.d.ts`.

```ts
import V, { reactive, computed, type HttpResponse } from 'voodoojs'

const estado = reactive({ contador: 0 })
const dobro = computed(() => estado.contador * 2)
```

## Roadmap

O foco de curto prazo é a documentação em inglês, mais exemplos, uma superfície maior de plugins e
a publicação no npm. O plano acompanhado fica em [`ROADMAP.md`](ROADMAP.md); o que já foi entregue
está registrado no [`CHANGELOG.md`](CHANGELOG.md).

## Contribuindo

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install
```

Um monorepo com npm workspaces: [`packages/voodoojs`](packages/voodoojs/) é o framework,
[`packages/cli`](packages/cli/) é a CLI, mais [`docs/`](docs/), [`site/`](site/) e
[`examples/`](site/examples/).

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda a suíte inteira uma vez (vitest + jsdom) |
| `npm run test:watch` | A mesma suíte, reexecutando enquanto você edita |
| `npm run coverage` | Rodada de testes com relatório de cobertura |
| `npm run typecheck` | `tsc --noEmit` sobre o pacote do framework |
| `npm run build` | Gera todos os bundles do `voodoojs` e do `voodoojs-cli` |
| `npm run size` | Informa o tamanho de cada bundle gerado |
| `npm run serve` | Servidor estático local para os exemplos e o site |
| `npm run format` | Prettier sobre o repositório |

Novos scripts entram com o tempo — o `package.json` da raiz é a lista definitiva.

**O ciclo.** Crie um branch a partir da `main`, faça a mudança, rode `npm test` e
`npm run typecheck` antes de abrir o PR, e escreva as mensagens de commit no estilo
[Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `docs:`). O CI
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) roda typecheck, testes, build e a
checagem de tamanho dos bundles no Node 20 e no 22.

**Onde mexer.** Bug no runtime → `src/runtime/`. Reatividade → `src/reactivity/`. Expressões →
`src/parser/`. Directive nova → `src/directives/`. Componente de interface → `src/ui/`.
Documentação → `docs/` e `site/docs/`.

### Como acrescentar uma directive

As directives internas são registradas com `defineDirective(nome, setup, { priority, terminal })`,
de `src/runtime/registry.ts`, no arquivo correspondente dentro de `src/directives/`. A função
`setup` recebe um `DirectiveContext` com `el`, `scope`, `expression`, `arg`, `modifiers`,
`evaluate()`, `effect()`, `cleanup()` e `walk()`. O `priority` define a ordem de execução (maior
roda primeiro, veja a tabela `PRIORITY`); `terminal: true` impede o walker de descer nos filhos,
como fazem o `v-for` e o `v-if`.

```ts
import { defineDirective } from '../runtime/registry';

// <p v-shout="mensagem">  →  mostra o valor em caixa alta
defineDirective('shout', ({ el, effect, evaluate, cleanup }) => {
  effect(() => {
    el.textContent = String(evaluate() ?? '').toUpperCase();
  });

  // Sempre libere o que você prendeu: listeners, timers, observers.
  const aoClicar = () => el.classList.toggle('alto');
  el.addEventListener('click', aoClicar);
  cleanup(() => el.removeEventListener('click', aoClicar));
});
```

Essa é a API interna. A pública é `V.directive(nome, hooks)`, que embrulha o mesmo mecanismo em
hooks de ciclo de vida no estilo do Vue (`created`, `mounted`, `updated`, `unmounted`) e entrega a
cada hook um `binding` com o `value` já avaliado, `oldValue`, `arg` e `modifiers`. Use
`V.directive` no código da aplicação; use `defineDirective` dentro do framework.

### Como acrescentar um teste

Os testes ficam em [`packages/voodoojs/test/`](packages/voodoojs/test/) como `*.test.ts`, e rodam
em vitest com jsdom. Um teste de directive monta o HTML, percorre com um escopo e verifica o DOM:

```ts
import { describe, it, expect } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

describe('v-shout', () => {
  it('mostra o valor em caixa alta', async () => {
    const dados = reactive({ mensagem: 'ola' });
    const raiz = document.createElement('div');
    raiz.innerHTML = '<p v-shout="mensagem"></p>';
    document.body.appendChild(raiz);
    walk(raiz, new Scope(dados));

    expect(raiz.textContent).toBe('OLA');

    dados.mensagem = 'tchau';
    await nextTick();
    await nextTick();
    expect(raiz.textContent).toBe('TCHAU');
  });
});
```

**A regra de ouro: toda correção de bug entra junto com um teste de regressão.** Se quebrou uma
vez pode quebrar de novo, e o teste é o que impede.

O detalhe completo está no [`CONTRIBUTING.md`](CONTRIBUTING.md), e todo mundo deve seguir o
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## Licença

[MIT](LICENSE) © contribuidores da Voodoo.js.

---

<div align="center">

**Prefer to read in English?** → [README.md](README.md)

<sub>JavaScript feels like magic.</sub>

</div>
