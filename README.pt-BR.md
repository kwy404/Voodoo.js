<div align="center">

<a href="https://kwy404.github.io/Voodoo.js/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg" alt="Voodoo.js: JSX em HTML puro, sem passo de build" width="760">
  </picture>
</a>

### JSX em HTML puro. Sem passo de build.

**Escreva JSX num arquivo `.html`, abra no navegador e pronto. HTML reativo, componentes, HTTP, formulários e roteador em uma tag de script.**

Sem bundler · Sem transform de JSX · Sem dependências em tempo de execução · Sem configuração

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/voodoojs.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![downloads por mês](https://img.shields.io/npm/dm/voodoojs.svg?label=downloads&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![downloads no total](https://img.shields.io/npm/dt/voodoojs.svg?label=total&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![tamanho do bundle](https://img.shields.io/github/size/kwy404/Voodoo.js/packages%2Fvoodoojs%2Fdist%2Fvoodoo.full.min.js?branch=main&label=voodoo.full.min.js)](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-FFB35C.svg)](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-completo-3178C6.svg)](#typescript)

**[Site](https://kwy404.github.io/Voodoo.js/) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [Componentes](https://kwy404.github.io/Voodoo.js/components.html) · [Exemplos](https://kwy404.github.io/Voodoo.js/examples/) · [Documentação](https://kwy404.github.io/Voodoo.js/docs/) · [English](https://github.com/kwy404/Voodoo.js/blob/main/README.md)**

<sub>Tudo acima roda no navegador e foi feito com a própria Voodoo.js. *JavaScript feels like magic.*</sub>

</div>

## Sumário

- [O exemplo de 10 segundos](#o-exemplo-de-10-segundos)
- [Por que a Voodoo](#por-que-a-voodoo)
- [Instalação](#instalação)
- [Início rápido](#início-rápido)
- Conceitos principais: [JSX em HTML](#jsx-em-html) · [Directives](#directives) · [Reatividade](#reatividade) · [Componentes](#componentes) · [HTTP](#http) · [Formulários e validação](#formulários-e-validação) · [Stores, roteador e aplicações completas](#stores-roteador-e-aplicações-completas) · [Tema e modo escuro](#tema-e-modo-escuro) · [TypeScript](#typescript)
- [O que vem na caixa](#o-que-vem-na-caixa)
- [CLI](#cli) · [DevTools](#devtools)
- [Desempenho](#desempenho) · [Comparação](#comparação) · [Quando usar a Voodoo](#quando-usar-a-voodoo)
- [Exemplos](#exemplos) · [Documentação](#documentação) · [Arquitetura](#arquitetura)
- [Roadmap](#roadmap) · [Contribuindo](#contribuindo) · [Outros projetos](#conheça-outros-projetos-de-kwy404) · [Licença](#licença)

## O exemplo de 10 segundos

Salve como `index.html` e abra. Não tem passo de build, não tem bundler, não tem compilador e não tem transform de JSX.

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
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

Prefere atributos a JSX? O mesmo runtime lê os dois, e eles convivem na mesma página:

```html
<div v-data="{ contador: 0 }">
  <button @click="contador--">-</button>
  <strong>{ contador }</strong>
  <button @click="contador++">+</button>
</div>
```

**[Teste dez exemplos de JSX no playground](https://kwy404.github.io/Voodoo.js/playground.html)**

## Por que a Voodoo

Qualquer outro jeito de escrever JSX precisa de uma ferramenta entre o arquivo que você edita e o arquivo que o navegador carrega. Com a Voodoo, o arquivo que você edita *é* o arquivo que o navegador carrega.

| Para renderizar a lista acima | O que é preciso |
| --- | --- |
| React | npm install, um bundler, Babel ou SWC, um build, um dev server |
| Preact | npm install, um bundler, um transform de JSX, ou `htm`, que não é JSX |
| Solid | npm install, um bundler, o compilador próprio; JSX não é opcional |
| Vue | npm install, um bundler, `@vitejs/plugin-vue`, ou render functions na mão |
| Svelte | npm install, um bundler, o compilador do Svelte, e não é JSX |
| **Voodoo.js** | **uma tag `<script>`** |

- **JSX sem ferramenta nenhuma.** `{items.map(i => <li>{i}</li>)}` renderiza a partir de um `.html` aberto direto do disco.
- **HTML primeiro.** A página que você já tem é a aplicação. O comportamento fica ao lado da marcação a que pertence: um arquivo, não três.
- **Reatividade granular.** `reactive`, `ref`, `computed` e `effect` sobre Proxy. Uma escrita reexecuta apenas os efeitos que leram aquele valor, e eles atualizam o nó real do DOM que é deles. Não existe Virtual DOM.
- **Sem eval, compatível com CSP.** As expressões passam por um lexer de verdade, um parser Pratt e um interpretador de AST. Sem `eval`, sem `new Function`, por isso a Voodoo roda sob uma Content Security Policy sem `unsafe-eval`.
- **Zero dependências em tempo de execução.** Os bundles de navegador não carregam nada além da própria Voodoo.
- **Melhoria progressiva.** A Voodoo enriquece os elementos que você marca e deixa o resto da página em paz, então entra em bases de código existentes sem reescrita.
- **Tudo incluído.** Reatividade, componentes, roteador, HTTP, formulários, validação, máscaras, interface, arrastar e soltar, animação, gráficos, i18n e stores vêm num arquivo só, e não em doze pacotes.
- **TypeScript.** O código inteiro é TypeScript e todo ponto de entrada publica declarações.
- **Ferramentas opcionais.** Existe uma [CLI](#cli) para criar projetos e builds sob medida. Você nunca é obrigado a usar.

**O custo honesto, dito logo de cara.** Essas ferramentas compilam o JSX para chamadas diretas de DOM antes de rodar, e a Voodoo lê o JSX em tempo de execução. Um compilador vence um interpretador em throughput de atualização, e os [benchmarks](#desempenho) mostram exatamente onde e por quanto. A Voodoo também é o maior bundle da sua tabela de comparação. O que você recebe em troca é um arquivo que dá para abrir, editar e mandar para alguém sem que exista um `node_modules` em lugar nenhum da história.

Isto não é um "matador de React". É um ponto de partida diferente para um tipo de projeto diferente: painéis administrativos gerados no servidor, sites de conteúdo, protótipos, páginas legadas e qualquer coisa em que acrescentar um bundler custa mais do que o problema que você está resolvendo.

## Instalação

Você não precisa de React, Vue, bundler nem Node.js para usar a Voodoo. Escolha um caminho:

**CDN, nada para instalar**

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
```

Essa é a instalação inteira; a biblioteca se inicia sozinha quando a página fica pronta. O [unpkg](https://unpkg.com/voodoojs@1.0.0/dist/voodoo.full.min.js) serve o mesmo arquivo. A tag fixa uma versão exata, então o que você carrega nunca muda sem você saber.

**npm, para um bundler ou uma aplicação renderizada no servidor**

```bash
npm install voodoojs
```

```js
import V from 'voodoojs'
V.start()

// ou importe só o que precisa: pontos de entrada separados, ESM e CJS, com tipos
import { reactive, computed } from 'voodoojs/reactivity'
import { http } from 'voodoojs/http'
import { debounce } from 'voodoojs/utils'
```

**Copiar o arquivo, ou compilar você mesmo**, para páginas que não podem acessar um host de terceiros ou para uma rede isolada:

```bash
curl -O https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js
# ou compile a partir do código; os bundles ficam em packages/voodoojs/dist/
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install && npm run build
```

**Qual build?**

| Arquivo | Conteúdo | JSX em HTML | Gzip |
| --- | --- | --- | ---: |
| `voodoo.core.min.js` | 147.92 KB | 51.04 KB | 44.46 KB |
| `voodoo.min.js` | 272.30 KB | 88.29 KB | 74.72 KB |
| `voodoo.full.min.js` | 451.65 KB | 137.08 KB | 114.04 KB |

O JSX existe só no build completo. Com o mínimo ou o essencial, uma página com JSX mostra o código como texto. Tempo real (`V.socket`) e WebGPU (`V.gpu`) têm entradas próprias, `dist/socket.js` e `dist/gpu.js`, e não vêm em nenhum bundle de navegador. Os tamanhos mudam entre versões: veja o badge acima, o [`benchmarks/reports/bundle.md`](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md), `npm run size` ou `npx voodoojs-cli info`.

## Início rápido

**Estado, eventos e two-way binding.** A interpolação usa chaves simples, `{ expressão }`. `{{ expressão }}` também é aceito, para quem vem do Vue.

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
  <p v-if="status === 'carregando'">Carregando...</p>
  <p v-else-if="status === 'erro'">Algo deu errado.</p>
  <p v-else>Pronto.</p>

  <li v-for="(item, indice) in itens" :key="indice">{ indice + 1 }. { item }</li>

  <span :class="{ 'is-active': status === 'pronto' }" :style="{ width: largura + '%' }"></span>
</div>
```

**A mesma ideia, fazendo trabalho de verdade.** Estado reativo, uma requisição HTTP ao vivo, um formulário validado e um toast, ainda em uma tag de script:

```html
<div v-data="{ }">

  <!-- Uma requisição com estado próprio de carregamento, erro e dados, declarada no HTML -->
  <div v-resource="usuarios: /api/usuarios">
    <p v-if="usuarios.loading">Carregando...</p>
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
      { $form.loading ? 'Salvando...' : 'Salvar' }
    </button>
  </form>

</div>
```

Essa é a aplicação inteira. Não existe um `app.js` ao lado fazendo a ligação. Próximos passos: [introdução](https://github.com/kwy404/Voodoo.js/blob/main/docs/introducao.md) e [início rápido passo a passo](https://github.com/kwy404/Voodoo.js/blob/main/docs/inicio-rapido.md).

## Conceitos principais

### JSX em HTML

Uma região é reativa: ela é um efeito, então `itens.push(...)` re-renderiza a lista, e tudo compõe com o resto (`v-data`, `@click`, `v-model`, stores). Condicionais devolvem elementos como no JSX, e também de um jeito que o JSX não oferece, um `if / else if / else` de verdade devolvendo elementos:

```html
<p>{logado ? <b>Bem-vindo de volta</b> : <b>Faça login</b>}</p>
<p>{logado && <b>Só quando é verdadeiro</b>}</p>

<p>
  {if (nivel === 1) (<b>um</b>)
   else if (nivel === 2) (<b>dois</b>)
   else (<b>outro</b>)}
</p>
```

Callbacks têm corpo de verdade, então ramificar por item se escreve como em qualquer outro lugar:

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

**As duas regras que mantêm isso fora do seu caminho.** Uma região só é reivindicada quando existe um **elemento** dentro das chaves: `{ contador }` sozinho é interpolação comum, e um `{` solto na prosa nunca fecha. E `script`, `style`, `pre`, `code`, `samp`, `kbd`, `textarea`, `template` e `noscript` nunca são varridos, então uma página cheia de código de exemplo continua sendo uma página cheia de código de exemplo.

**Não existe `style={{ ... }}`. Use o bind do atributo.**

```html
<div :style="{ backgroundColor: cor }">    <!-- é assim -->

<div style="{{ backgroundColor: cor }}">   <!-- não faz nada -->
<div style={{ backgroundColor: cor }}>     <!-- não faz nada -->
```

Um atributo `style` comum nunca é tratado como expressão, porque só atributos `v-*`, `:` e `@` são lidos; uma versão anterior deste arquivo marcava, por engano, a linha do meio como funcionando. As chaves sobrevivem literalmente como uma declaração CSS sem sentido e o elemento aparece sem estilo. A última linha falha por dois motivos, e o segundo vale para qualquer atributo: um valor sem aspas termina no primeiro espaço, então o navegador o transforma em seis atributos separados antes de qualquer script rodar, passando os nomes para minúsculo no caminho. Ponha aspas nos valores.

<details>
<summary><b>Como isso é possível</b></summary>

O navegador já parseou a página, e o que sobra dá para recuperar. Para a lista do exemplo de 10 segundos o DOM são três irmãos: o texto `{frutas.map((fruta) => (`, o elemento `<li>{fruta}</li>`, e o texto `))}`. O elemento não é um estrago a contornar, é o template. Juntar o texto de volta com um marcador onde o elemento estava reconstrói a expressão exatamente como foi digitada, e ela passa pelo mesmo lexer, parser e interpretador de qualquer outra expressão. Nada é compilado e nada é avaliado como string, então continua funcionando sob uma Content Security Policy estrita.

</details>

Guia completo: [JSX no site](https://kwy404.github.io/Voodoo.js/docs/guia/jsx.html).

### Directives

Atributos são ligados ao estado reativo, e quando esse estado muda apenas os nós do DOM que dependem dele são atualizados. As que você vai usar primeiro:

| Directive | O que faz |
| --- | --- |
| `v-data` | Declara estado reativo para um elemento e seus filhos |
| `{ expr }`, `v-text`, `v-html` | Interpolação de texto, conteúdo de texto, HTML confiável |
| `v-if`, `v-else-if`, `v-else`, `v-show` | Renderização condicional e visibilidade |
| `v-for` com `:key` | Listas com chave |
| `:attr` (`v-bind`), `v-class`, `v-style` | Bind de atributo, classe e estilo |
| `@evento` (`v-on`) | Eventos, com modificadores e filtros de tecla |
| `v-model` | Two-way binding para inputs, selects e checkboxes |
| `v-ref`, `v-init`, `v-effect`, `v-watch` | Referências a elementos e efeitos colaterais |
| `v-component`, `v-teleport`, `v-transition` | Componentes, portais e transições de entrada e saída |
| `v-cloak`, `v-once`, `v-pre`, `v-ignore` | Controle de renderização |
| `v-get`, `v-post`, `v-resource`, `v-load` | [HTTP](#http) declarativo |
| `v-submit`, `v-validate`, `v-mask` | [Formulários e validação](#formulários-e-validação) |

Depois que uma directive é instalada, o atributo é lido para a memória e removido do documento, então a página termina como HTML comum (desligue com `V.config.cleanAttributes = false`). A lista completa, com todos os modificadores: [referência de directives](https://github.com/kwy404/Voodoo.js/blob/main/docs/directives.md).

### Reatividade

O mesmo motor de reatividade está disponível no JavaScript:

```js
const estado = V.reactive({ contador: 0 })
V.effect(() => { document.title = `Cliques: ${estado.contador}` })
estado.contador++
```

`reactive`, `ref`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`, `effectScope` e `flushSync` são todos exportados. Guia: [reatividade](https://github.com/kwy404/Voodoo.js/blob/main/docs/reatividade.md).

### Componentes

Um componente é um escopo com estado, métodos, valores computados, watchers, props, slots e hooks de ciclo de vida, montado sobre um elemento. Sem passo de compilação, sem formato de componente de arquivo único.

```js
V.component('contador', {
  props: {
    inicio: { type: 'number', default: 0 },
    rotulo: { type: 'string', required: true }
  },
  state(props) { return { total: props.inicio } },
  computed: { dobro() { return this.total * 2 } },
  methods: {
    incrementar() {
      this.total++
      this.emit('mudou', this.total)   // um CustomEvent de verdade, que borbulha
    }
  },
  watch: { total(valor) { console.log('agora', valor) } },
  template: `
    <button @click="incrementar()">{ rotulo }: { total }</button>
    <small>dobro: { dobro }</small>
    <slot name="rodape"></slot>
  `,
  style: `.contador { font-weight: 600 }`,
  mounted() { /* o elemento está no DOM */ }
})
```

Três formas equivalentes de usar, e ouvir o que ele emite é um listener de evento comum:

```html
<div v-component="contador" rotulo="Cliques"></div>
<contador rotulo="Cliques" :inicio="10" @mudou="console.log($event.detail)"></contador>
<Contador rotulo="Cliques"></Contador>
```

<details>
<summary><b>Props, slots, recursos da instância e modo aplicação</b></summary>

Atributos estáticos viram props de texto, convertidas para o `type` declarado. Atributos escritos com `:` são binds reativos avaliados no escopo do pai, e o conteúdo dos slots também; slots nomeados são casados com `slot="nome"`. Dentro de uma instância você também tem `$el`, `$props`, `$refs`, `$parent`, `$name`, `$emit`, `$watch` e `$nextTick`, além de `provide` / `inject` para injeção de dependência.

**Modo aplicação**, se você preferir descrever a aplicação inteira em JavaScript:

```js
V.createApp({
  data: () => ({ n: 0 }),
  computed: { dobro() { return this.n * 2 } },
  methods: { somar() { this.n++ } },
  template: `<button @click="somar()">Cliques: { n }</button><p>Dobro: { dobro }</p>`
}).mount('#app')
```

O `mount` aceita um alvo que ainda não existe: ele espera, então não existe corrida com o carregamento da página. O `unmount` devolve o HTML original do contêiner em vez de deixá-lo vazio. O modo aplicação também tem `use`, `provide` e componentes locais.

O build completo traz 29 componentes prontos que não precisam de registro, então escrever a tag é todo o uso: `<v-button>`, `<v-input>`, `<v-table>` e outros, na [galeria de componentes](https://kwy404.github.io/Voodoo.js/components.html).

</details>

Guia: [componentes](https://github.com/kwy404/Voodoo.js/blob/main/docs/componentes.md).

### HTTP

**Declarativo.** Associe uma requisição a um elemento e diga para onde vai a resposta:

```html
<button v-get="/api/relatorio" v-target="#saida" v-swap="innerHTML">Carregar</button>

<button v-delete="'/api/usuarios/' + usuario.id"
        v-confirm="Excluir este usuário?"
        v-toast-success="Usuário excluído">Excluir</button>

<div v-get="/api/feed" v-trigger="visible" v-poll="30s"></div>

<input v-search="/api/busca" v-param="q" v-debounce="300ms" v-target="#resultados">
```

A URL pode ser literal (`/api/usuarios`) ou uma expressão (`'/api/usuarios/' + id`). O `v-resource` entrega o estado da requisição como dado reativo em vez de trocar HTML: `data`, `loading`, `error`, `loaded`, `reload()` e `set()`.

**Programático.**

```js
const usuarios = await V.http.get('/api/usuarios')
const criado   = await V.http.post('/api/usuarios', { nome: 'Ada' })

// Resposta completa, com status e cabeçalhos
const res = await V.http.request({ url: '/api/usuarios', retry: 2, timeout: 5000, cache: 60000 })

// Upload com progresso real
await V.http.upload('/api/arquivos', formData, { onProgress: (pct) => console.log(pct + '%') })

// Server-Sent Events e streaming NDJSON
V.http.sse('/api/eventos', { message: (dado) => console.log(dado) })
await V.http.stream('/api/tokens', (linha) => console.log(linha))
```

<details>
<summary><b>Todos os atributos de requisição e opções do cliente</b></summary>

Directives de requisição: `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, `v-resource`, `v-load`, `v-load-visible`, `v-search`, além de polling.

Atributos de apoio: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-body`, `v-params`, `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`, `v-template`, `v-offline-queue`, `v-redirect`, `v-scroll-to`, `v-toast-success`, `v-toast-error`, `v-on-success`, `v-on-error`, `v-on-complete`.

O cliente tem interceptors, timeout, retry exponencial, cache, CSRF, progresso de upload, SSE, streaming NDJSON e fila offline. Padrões, interceptors, URL base, cabeçalho CSRF e cache ficam em `V.http.defaults` e `V.http.interceptors`.

</details>

Guia: [HTTP](https://github.com/kwy404/Voodoo.js/blob/main/docs/http.md).

### Formulários e validação

Enviar, validar, mostrar carregamento e informar o resultado, tudo declarado no próprio formulário:

```html
<form v-submit="/api/contato" v-method="POST" v-validate
      v-toast-success="Mensagem enviada" v-toast-error="Não foi possível enviar" v-reset-success>

  <input name="nome" v-required>
  <input name="email" type="email" v-required v-email>
  <input name="telefone" v-mask="phone">
  <textarea name="mensagem" v-minlength="20"></textarea>

  <p v-if="$form.errors.email">{ $form.errors.email }</p>

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Enviando...' : 'Enviar' }
  </button>
</form>
```

O `$form` é reativo e traz `loading`, `saving`, `success`, `errors`, `message`, `data`, `status`, `dirty` e `progress`. As regras cobrem `required`, `email`, `url`, `number`, `min`, `max`, `minlength`, `maxlength`, `between`, `match`, `regex`, `date`, `same`, `different`, `in`, `strongpassword` e outras, além de regras assíncronas e regras suas via `V.validator()`. Formulários também fazem serialização, upload, dropzone, autosave e aviso ao sair da página. Guias: [formulários](https://github.com/kwy404/Voodoo.js/blob/main/docs/formularios.md), [validação](https://github.com/kwy404/Voodoo.js/blob/main/docs/validacao.md), [máscaras](https://github.com/kwy404/Voodoo.js/blob/main/docs/mascaras.md).

### Stores, roteador e aplicações completas

A Voodoo cresce além de uma página só sem mudar o modelo.

- **Stores.** `V.store('carrinho', { itens: [] }, { persist: true })`, lido em qualquer lugar como `$store.carrinho`, com persistência opcional em `localStorage`. Guia: [estado e stores](https://github.com/kwy404/Voodoo.js/blob/main/docs/estado-e-stores.md).
- **Roteador.** `V.router({ mode: 'history', routes: { '/usuarios/:id': { component: 'pagina-usuario' } } })`, com modos history e hash, parâmetros, query, guards, restauração de rolagem, cache de views, rotas dinâmicas, `v-link` e `v-router-view`. Guia: [roteador](https://github.com/kwy404/Voodoo.js/blob/main/docs/roteador.md).
- **Plugins.** `V.use(plugin)` ou `app.use(plugin)` registra directives, componentes e serviços. Guia: [plugins](https://github.com/kwy404/Voodoo.js/blob/main/docs/plugins.md).
- **Carregamento sob demanda.** `v-load-visible` e registros `view` nas rotas buscam HTML só quando ele é necessário.
- **i18n.** `V.i18n({ locale: 'pt-BR', messages })`, depois `v-t` na marcação e `V.t()` no código. Guia: [idiomas](https://github.com/kwy404/Voodoo.js/blob/main/docs/idiomas.md).

### Tema e modo escuro

O tema tem três estados: `system` (segue o sistema operacional), `light` e `dark`. Enquanto o visitante não escolhe, a Voodoo deixa a página exatamente como você escreveu: sem atributo `data-theme`, sem `color-scheme`, nada repintado.

```html
<button v-theme-toggle>Trocar tema</button>               <!-- claro e escuro -->
<button v-theme-toggle.cycle>Tema</button>                <!-- system, light, dark, system... -->
<button v-theme-toggle:system>Automático</button>         <!-- um botão por opção, pressionado enquanto é a atual -->

<button @click="$theme.set('dark')">Escuro</button>
<p>Escolha: { $theme.current }, na tela: { $theme.resolved }</p>
```

```js
V.theme.set('system' | 'light' | 'dark') // guarda a escolha; 'system' volta a seguir o sistema
V.theme.current    // 'system', 'light' ou 'dark'
V.theme.resolved   // 'light' ou 'dark', o que está de fato na tela
V.theme.toggle()   // light <-> dark
V.theme.cycle()    // system -> light -> dark -> system
V.theme.chosen     // true depois que o visitante escolheu
```

Uma escolha escreve `data-theme` no `<html>` (e o remove de novo para `system`), define `color-scheme`, é salva no `localStorage` na chave `voodoo:theme` (lida de volta esteja ela gravada crua, `dark`, ou como JSON, `"dark"`), acompanha mudanças do sistema enquanto está em `system`, sincroniza entre abas e dispara o evento `voodoo:theme` no `document`. Os botões de troca recebem `aria-pressed`, `data-voodoo-theme` e `data-voodoo-theme-mode` para os seus ícones. O `v-theme-toggle` está nos builds essencial e completo; o `$theme` está em todos.

**Sem piscar o tema errado.** Coloque isto no `<head>`, antes da tag de script da Voodoo, e escreva as cores dos dois temas:

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('voodoo:theme');
      if (t && t.charAt(0) === '"') t = JSON.parse(t);
      var r = document.documentElement;
      if (t === 'light' || t === 'dark') {
        r.setAttribute('data-theme', t);
        r.style.colorScheme = t;
      }
    } catch (e) {}
  })();
</script>
<style>
  :root { --bg: #fff; --text: #14111f; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #14111f; --text: #f4f1fb; }
  }
  :root[data-theme="dark"] { --bg: #14111f; --text: #f4f1fb; }
</style>
```

O `npx voodoojs-cli init` gera uma página com tudo isso pronto. O `V.palette()` gera uma escala completa de cores, e a versão escura, a partir de poucas cores base. Guia: [tema e paleta](https://github.com/kwy404/Voodoo.js/blob/main/docs/tema-e-paleta.md).

### TypeScript

O código inteiro é TypeScript, e todo ponto de entrada publica declarações `.d.ts`.

```ts
import V, { reactive, computed, type HttpResponse } from 'voodoojs'

const estado = reactive({ contador: 0 })
const dobro = computed(() => estado.contador * 2)
```

Guia (em inglês): [TypeScript](https://github.com/kwy404/Voodoo.js/blob/main/docs/en/typescript.md).

## O que vem na caixa

Cada linha abaixo faz parte do runtime publicado.

<details>
<summary><b>A tabela completa</b> (reatividade, expressões, directives, componentes, HTTP, formulários, stores, interface, roteador, i18n, animação, gráficos, tempo real, GPU, devtools, CLI)</summary>

| Pilar | O que você ganha |
| --- | --- |
| **Reatividade** | `reactive`, `ref`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`, `effectScope`, `flushSync` |
| **Expressões** | Lexer + parser Pratt + interpretador de AST próprios. Sem `eval`, compatível com CSP |
| **Directives** | Texto, condicionais, listas, bind, classes, estilos, eventos, refs, transições e mais |
| **Componentes** | Props, estado, computed, métodos, watchers, template, estilo com escopo, slots nomeados, `provide`/`inject`, ciclo de vida |
| **Modo aplicação** | `V.createApp({...}).mount('#app')` com `use`, `provide`, componentes locais e `unmount` |
| **DOM** | Coleção encadeável via `V('#seletor')`, mais utilitários de transição |
| **HTTP** | Interceptors, timeout, retry exponencial, cache, CSRF, progresso de upload, SSE, streaming NDJSON, fila offline |
| **Requisições declarativas** | `v-get`/`v-post`/`v-put`/`v-patch`/`v-delete`, `v-resource`, `v-load`, `v-load-visible`, `v-search`, polling |
| **Formulários** | Envio AJAX, serialização, upload, dropzone, autosave, aviso ao sair, estado reativo `$form` |
| **Validação e máscaras** | Conjunto completo de regras, regras assíncronas, regras e mensagens próprias, máscaras de input |
| **Stores** | `V.store(nome, def, { persist })` e a magia `$store`, com persistência opcional em `localStorage` |
| **Armazenamento** | `storage`, `session`, `cookie`, `cache`, `url`, `theme` |
| **Interface** | Toast, modal, alert, confirm, prompt, dialog, paleta de comandos, mais directives para abas, dropdowns, tooltips, drawers, popovers e accordions |
| **Arrastar e soltar** | `v-draggable`, `v-droppable`, `v-sortable`, grupos, suporte a teclado |
| **Roteador** | Modos history e hash, parâmetros, query, guards, restauração de rolagem, cache de views, `v-link`, `v-router-view`, rotas dinâmicas |
| **i18n** | Mensagens por idioma, `V.t`, `v-t`, pluralização, troca de idioma em tempo de execução |
| **Animação** | Física de mola, stagger, `inView`, progresso de rolagem, presets |
| **Gráficos** | Renderizados como SVG puro, sem dependência de biblioteca de gráficos |
| **Tempo real** | `V.socket` sobre WebSocket nativo e o protocolo do Socket.IO, salas públicas e privadas, reconexão com backoff, heartbeat e fila de envio. Declarativo via `v-socket`, `v-room` e `v-on-socket:` |
| **GPU** | `V.gpu` sobre WebGPU com reflexão de WGSL, mais a directive `v-shader`. Sem WebGPU, cai para o conteúdo do canvas |
| **Devtools** | Inspetor de reatividade `V.xray` e um barramento de eventos |
| **CLI** | `voodoojs-cli`: `init`, `build --modules=...`, `add`, `info` |

</details>

Quando o HTML não basta, a API `V` está ali: `V.reactive`, `V.component`, `V.http`, `V.store`, `V.router` e uma coleção de DOM encadeável através de `V('#seletor')`. Referência: [API](https://github.com/kwy404/Voodoo.js/blob/main/docs/api.md).

## CLI

```bash
npx voodoojs-cli init minha-pagina                     # cria uma página pronta para abrir
npx voodoojs-cli build --modules=core,directives,http  # bundle sob medida, só com o que você usa
npx voodoojs-cli add card                              # copia um componente para o seu projeto
npx voodoojs-cli info                                  # lista os módulos e seus tamanhos
npx voodoojs-cli --version                             # mostra a versão
```

O `add` traz 7 componentes que viram código seu depois de copiados: `accordion`, `card`, `drawer`, `dropdown`, `modal`, `tabs` e `theme-toggle`. O `build` compila a partir do código TypeScript, e o `voodoojs` publica a pasta `src/` no npm, então o `build` funciona a partir de um `npm install` comum e também dentro de um clone. O pacote é `voodoojs-cli`, não `voodoo`, que é um pacote sem relação no npm; instalado num projeto, os mesmos comandos também rodam como `npx voodoo ...`. Todos os comandos e opções: [`packages/cli/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/packages/cli/README.md).

## DevTools

O build completo traz o `xray`, um inspetor visual de reatividade: a árvore de escopos, o estado ao vivo, quais efeitos estão rodando e os logs de eventos e de rede. **Aperte `Ctrl+Shift+F2`.** Essa é a configuração inteira: carregue o build completo e o atalho já está ouvindo, tenha você pedido devtools ou não.

```js
V.xray()        // alterna o painel
V.xray(true)    // abre
V.xray(false)   // fecha
```

<details>
<summary><b>Uma página para testar, trocar o atalho, avisos detalhados</b></summary>

Salve esta página, abra, clique nos botões algumas vezes, depois aperte as teclas e veja `contador` mudar no painel enquanto o botão pisca a cada escrita.

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
</head>
<body>
  <div v-data="{ contador: 0, itens: ['a', 'b'] }">
    <button @click="contador++">cliquei { contador } vezes</button>
    <button @click="itens.push('c')">acrescentar um item</button>
    <ul><li v-for="i in itens">{ i }</li></ul>
  </div>
</body>
</html>
```

Precisa ser o `voodoo.full.min.js`. O inspetor não está nos builds mínimo e essencial, e eles escrevem uma linha no console dizendo isso em vez de falhar em silêncio.

**Trocando ou removendo o atalho.** Nenhuma combinação de teclas está livre em todas as máquinas, então esta é configurável:

```html
<script src="voodoo.full.min.js" data-xray-shortcut="alt+shift+d" defer></script>
<script src="voodoo.full.min.js" data-xray-shortcut="false" defer></script>
```

```js
V.config.xrayShortcut = 'ctrl+shift+f9';
V.config.xrayShortcut = false;
```

A última parte nomeia a tecla **física**, então o atalho se comporta igual em qualquer layout de teclado. `Ctrl+Shift+F2` é o terceiro padrão: `Ctrl+Shift+X` fecha a aba no Opera, e `Alt+Shift+V` é o alternador de layout de teclado do Windows, que pega as teclas antes de a página vê-las. `Ctrl+Alt` não serve pelo mesmo tipo de motivo, por ser o AltGr nos layouts brasileiro e na maioria dos europeus.

**Os avisos detalhados são outra coisa.** O `data-devtools` liga avisos detalhados no console e monta o widget na tela; ele não é necessário para o atalho.

```html
<script src="voodoo.full.min.js" data-devtools defer></script>
```

</details>

Guia: [devtools](https://github.com/kwy404/Voodoo.js/blob/main/docs/devtools.md).

## Desempenho

Os benchmarks são reproduzíveis: versões de dependências fixadas, builds de produção, metodologia publicada e ambiente registrado. JavaScript puro é o teto, e a Voodoo cobra um custo real pela produtividade que entrega. O objetivo destes números é mostrar o tamanho desse custo, não fingir que ele é zero. O relatório completo, incluindo os casos em que a Voodoo perde: [`benchmarks/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/README.md).

**Contra outros frameworks.** Sete implementações da mesma lista de 1.000 linhas, todas em build de produção minificado, rodando uma depois da outra no mesmo processo contra o mesmo documento jsdom. Depois de cada cenário o DOM de cada framework é comparado com a versão em JavaScript puro escrita à mão, e qualquer um que produza saída diferente é excluído em vez de ganhar crédito por um tempo rápido. Mediana de 30 amostras, em milissegundos, menor é melhor:

| | criar 1k | atualizar 1 a cada 10 | limpar 1k | minificado |
| --- | ---: | ---: | ---: | ---: |
| JS puro | 39.51 | 6.65 | 20.04 | 0.6 KB |
| Preact 10.29.8 | 71.03 | 2.73 | 30.68 | 10.7 KB |
| **Voodoo.js** | **77.47** | **4.69** | **30.14** | **435.2 KB** |
| Vue 3.5.42 | 78.72 | 14.29 | 32.84 | 62.5 KB |
| Solid 1.9.15 | 80.13 | 0.90 | 21.85 | 16.7 KB |
| React 19.2.8 | 81.22 | 4.65 | 33.55 | 189.3 KB |
| Alpine 3.17.1 | 157.06 | 111.29 | 32.76 | 55.2 KB |

- **Criar:** Preact, Voodoo e Vue terminam a até 7,7 ms um do outro, com Solid e React logo atrás. O JS puro escrito à mão ainda monta a lista quase duas vezes mais rápido que qualquer framework daqui, e esse é o teto honesto.
- **Atualizar:** a Voodoo atualiza uma linha a cada dez mais rápido que a versão em JS puro (4,69 ms contra 6,65) e empatada com o React (4,65, dentro do ruído). Fica cerca de 24x à frente do Alpine, que também é HTML primeiro e também interpreta expressões em tempo de execução. Solid (0,90 ms) e Preact (2,73 ms) vencem, os dois com compilador, que é a troca que a Voodoo recusa fazer.
- **Limpar:** Voodoo, Preact, Alpine e Vue ficam dentro de 2,7 ms; JS puro e Solid vencem com folga.
- **Tamanho:** a Voodoo é de longe o maior bundle desta tabela. Se tamanho é a sua principal restrição, Alpine e Preact são a recomendação honesta, e o `voodoo.core.min.js` existe para páginas que querem as directives e nada mais.
- **Ruído:** o coeficiente de variação na atualização chegou a 50% para a Voodoo e 134% para o Preact nesta rodada. Leia os números como um pelotão, não como um placar. O jsdom não tem layout nem pintura, então leia como forma relativa e não como verdade absoluta.

**Listas na 0.13.** `push`, `pop`, `shift`, `unshift` e `splice` num `v-for` com chave agora custam O(k) para as k linhas que tocam, em vez de O(n) para a lista inteira: `shift` em 10.000 linhas foi de 61,6 ms para 0,096 ms, e trocar 2 linhas de lugar foi de 9.585 ms para 16,6 ms. Um vazamento de memória ao desmontar o `v-for` também foi corrigido. Método, estatísticas e adaptadores por framework: [`benchmarks/reports/comparison.md`](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/comparison.md). Algoritmo e invariantes: [`ARCHITECTURE.md`](https://github.com/kwy404/Voodoo.js/blob/main/ARCHITECTURE.md#5-list-reconciliation).

<details>
<summary><b>Gráficos: comparação entre frameworks e tamanho contra velocidade</b></summary>

![Comparação entre frameworks](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/framework-comparison.svg)

Velocidade e tamanho são duas colunas da mesma decisão. Postos um contra o outro, a troca que cada projeto fez vira o formato do desenho:

![O que cada projeto cobra, e o que entrega](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/size-vs-speed.svg)

**De onde veio o ganho da 0.13.** Um harness pareado carregou os dois builds no mesmo processo e intercalou as amostras, alternando a ordem a cada rodada, então a variação de 20 a 40% da máquina entre execuções se cancela. Um A/B nulo de fontes idênticas mediu +-0,5 ms, que é o piso de ruído que tudo abaixo supera:

| | antes | depois | |
| --- | ---: | ---: | --- |
| criar 1k | 129.98 ms | **82.98 ms** | **-36,2%**, venceu 45 de 45 rodadas |
| limpar 1k | 28.14 ms | **15.59 ms** | **-44,6%**, venceu 38 de 45 |
| atualizar | 2.60 ms | 2.71 ms | nenhuma mudança mensurável |

Quatro mudanças respondem por quase tudo: ler `getAttributeNames()` em vez de indexar a coleção viva `attributes`, o `v-for` tirar o atributo de chave do template da linha para que cada clone pare de parsear um atributo só para ignorá-lo, campos de classe declarados em vez de emitidos como chamadas a `Object.defineProperty` sob `useDefineForClassFields`, e criar o escopo de efeitos de uma directive só quando algo de fato precisa dele.

Outras seis otimizações "óbvias" foram medidas e **revertidas** porque ficaram dentro do piso de ruído. Elas estão listadas em [`benchmarks/reports/comparison.md`](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/comparison.md) junto com as que funcionaram, porque uma lista do que não ajudou vale tanto para a próxima pessoa quanto a lista do que ajudou.

</details>

<details>
<summary><b>Listas: quanto custa uma mudança, de verdade</b> (o reconciliador da 0.13, todos os casos medidos)</summary>

Um `v-for` é um único efeito sobre uma coleção inteira, então é o único lugar da Voodoo onde existe diff. Quando a coleção muda o efeito roda de novo, e alguém precisa descobrir o que isso significa para `n` linhas.

Até a 0.13 essa decisão custava o mesmo, acontecesse o que acontecesse. A `:key` de cada linha passava pelo interpretador de expressões, o `normalizeSource` alocava um objeto por linha, três estruturas de hash do tamanho da lista eram montadas e jogadas fora, e uma passada de posicionamento lia uma propriedade do DOM para cada linha. Ler as linhas através do proxy reativo também inscrevia a lista em todos os `n` índices e em qualquer propriedade que a chave tocasse em todos os `n` itens, então cada nova renderização primeiro tirava o efeito desses conjuntos de dependência e o colocava de volta: cerca de `4n` operações de hash antes de o reconciliador olhar para qualquer coisa. Remover uma linha de dez mil fazia tudo isso para concluir que 9.999 linhas não tinham saído do lugar.

A 0.13 parte de outra pergunta: **o que já se sabe?**

`push`, `pop`, `shift`, `unshift` e `splice` são interceptados onde acontecem. Agora eles rodam sobre o array cru (um `splice` no meio não dispara mais uma armadilha do proxy e uma notificação de dependência por elemento que ele desloca) e registram o que fizeram. Quando a lista renderiza de novo, ela lê esse registro em vez de redescobri-lo. `linhas.splice(5000, 1)` em dez mil linhas diz exatamente que uma linha saiu, no índice 5000, e nada mais é examinado.

Quando não há registro para ler (um array novo foi atribuído) a região alterada é encontrada comparando chaves das duas pontas para dentro, com a expressão da chave compilada uma vez para uma leitura de propriedade em vez de interpretada a cada linha. Isso custa uma leitura de propriedade por linha e **não tem como ficar mais barato**: para saber que a linha 9.999 não mudou é preciso olhar para a linha 9.999. Nenhuma impressão digital, hash de bloco ou hash rolante evita isso, porque calcular a impressão digital da lista nova significa ler todas as chaves dela primeiro.

![Reconciliação de listas: antes e depois](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/reconcile-before-after.svg)

| caso | antes | depois | ganho | chaves avaliadas | alocações |
| --- | ---: | ---: | ---: | ---: | ---: |
| criar 1.000 linhas | 81.5 ms | 84.4 ms | n/a | 1,000 → 1,000 | 1,010 → 0 |
| criar 10.000 linhas | 809 ms | 809 ms | n/a | 10,000 → 10,000 | 10,010 → 0 |
| criar 50.000 linhas | 4049 ms | 3840 ms | n/a | 50,000 → 50,000 | 50,010 → 0 |
| acrescentar 1 a 10.000, array novo | 40.9 ms | 11.6 ms | **3.5x** | 20,001 → 20,001 | 20,011 → 0 |
| push de 1 em 10.000, no lugar | 34.2 ms | 1.94 ms | **17.6x** | 20,001 → 1 | 20,011 → 0 |
| acrescentar 5.000 a 5.000 | 470 ms | 418 ms | **1.1x** | 15,000 → 15,000 | 15,010 → 0 |
| inserir 1 no começo de 10.000, array novo | 38.6 ms | 8.40 ms | **4.6x** | 20,001 → 20,003 | 20,011 → 0 |
| unshift de 1 em 10.000, no lugar | 56.0 ms | 0.297 ms | **188.7x** | 20,001 → 1 | 20,011 → 0 |
| inserir 5.000 no começo de 5.000 | 530 ms | 412 ms | **1.3x** | 15,000 → 15,002 | 15,010 → 0 |
| remover a primeira de 10.000, array novo | 40.9 ms | 9.28 ms | **4.4x** | 19,999 → 20,001 | 20,009 → 0 |
| remover a do meio de 10.000, array novo | 41.7 ms | 10.2 ms | **4.1x** | 19,999 → 20,001 | 20,009 → 0 |
| remover a última de 10.000, array novo | 39.4 ms | 11.2 ms | **3.5x** | 19,999 → 19,999 | 20,009 → 0 |
| splice tirando a do meio de 10.000, no lugar | 45.3 ms | 0.853 ms | **53.1x** | 19,999 → 1 | 20,009 → 0 |
| shift da primeira de 10.000, no lugar | 61.6 ms | 0.096 ms | **641.1x** | 19,999 → 1 | 20,009 → 0 |
| pop da última de 10.000, no lugar | 37.5 ms | 1.51 ms | **24.8x** | 19,999 → 1 | 20,009 → 0 |
| inserir 1 no meio de 10.000, array novo | 42.5 ms | 10.7 ms | **4.0x** | 20,001 → 20,003 | 20,011 → 0 |
| splice inserindo 1 no meio de 10.000, no lugar | 48.6 ms | 0.684 ms | **71.0x** | 20,001 → 1 | 20,011 → 0 |
| substituir 1 de 10.000 por uma chave nova | 40.1 ms | 11.7 ms | **3.4x** | 20,000 → 20,006 | 20,010 → 6 |
| mudar 1 rótulo em 10.000 | 0.116 ms | 0.111 ms | n/a | 0 → 0 | 0 → 0 |
| reatribuir um array idêntico de 10.000 linhas | 52.4 ms | 9.57 ms | **5.5x** | 10,000 → 10,000 | 10,005 → 0 |
| trocar 2 linhas de lugar em 10.000 | 9585 ms | 16.6 ms | **575.9x** | 20,000 → 20,004 | 20,010 → 6 |
| inverter 10.000 linhas | 3989 ms | 4130 ms | n/a | 20,000 → 20,004 | 20,010 → 6 |
| embaralhar 10.000 linhas | 7890 ms | 7690 ms | n/a | 20,000 → 20,004 | 20,010 → 6 |
| limpar uma lista de 10.000 linhas | 144 ms | 134 ms | n/a | 10,000 → 10,000 | 10,010 → 0 |

O tempo é o sintoma; os contadores são a causa. O reconciliador conta o que faz (linhas visitadas, chaves avaliadas, escritas enviadas por um proxy reativo, nós criados, removidos e movidos) e o benchmark coleta isso numa segunda passada com os cronômetros desligados, então a instrumentação nunca cai dentro de um número medido.

![Quantas vezes a chave de uma linha foi calculada, por edição](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/reconcile-work.svg)

Vale ler as duas famílias separadas, porque elas têm pisos diferentes. Uma lista alterada no lugar recebe uma resposta que não depende do tamanho dela; uma lista trocada inteira paga uma leitura de chave por linha, por mais esperto que seja o algoritmo. Mesma edição, mesmo DOM, informação diferente disponível.

![O custo de uma edição contra o tamanho da lista](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/reconcile-scaling.svg)

Qual caminho uma edição toma não é algo que um teste de corretude mostre: um caminho rápido que cai em silêncio para o lento continua passando em todos eles. Então isso também é contado, incluindo os formatos em que o caminho rápido não se aplica:

![Qual caminho cada edição tomou](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/reconcile-paths.svg)

E o que chega ao DOM. Um reconciliador que reaproveita todos os elementos ainda pode ser lento se arrastar todos eles pela lista para chegar lá; uma passada de maior subsequência crescente sobre as linhas que sobreviveram decide quais podem ficar onde estão, e ela só roda quando linhas de fato se cruzaram, então nenhuma inserção, remoção ou acréscimo no fim paga por ela.

![Nós criados, removidos e movidos por edição](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/reconcile-dom-ops.svg)

**Quanto custa cada caminho.** `n` é o tamanho da lista, `k` as linhas que a edição tocou, `r` o tamanho da região alterada.

| Caminho | Quando | Custo |
| --- | --- | --- |
| mutação, inserir ou remover | `push` / `pop` / `shift` / `unshift` / `splice` numa lista com chave | O(k) |
| mutação, em lote | várias mutações no mesmo tick | O(r), r = o intervalo que elas cobrem juntas |
| varredura, depois inserir ou remover | um array novo, uma edição localizada | O(n) leituras de chave + O(k) de trabalho |
| varredura, depois reordenar | um array novo, linhas cruzadas | O(n) leituras de chave + O(r log r) |
| sem chave, qualquer mudança | sem `:key` | O(n): a posição *é* a identidade, então toda linha depois da edição mudou de verdade |
| `reverse` / `sort` no lugar | nenhum intervalo descreve o resultado | O(n) + O(n log n) |

O maior número daquela tabela não é uma vitória de algoritmo: é um bug que os contadores acharam. Trocar duas linhas de lugar em dez mil levava **9.585 ms**, e o motivo eram 19.994 movimentações no DOM: a passada de posicionamento antiga percorria a lista de trás para a frente, e a primeira linha fora do lugar fazia todas as linhas depois dela falharem na mesma verificação, então trocar duas linhas arrastava a lista inteira junto. Agora ela move 2 linhas e leva 16,6 ms.

**Onde não ajuda, dito com todas as letras.**

*Inverter e embaralhar não mudaram*: 3.989 ms contra 4.130 ms, e 7.890 contra 7.690. Os dois já moviam perto do mínimo: inverter uma lista exige mover todas as linhas menos uma, seja qual for o jeito de calcular o diff, e o que o relógio mede ali é o `insertBefore` num pai com dez mil filhos, não o reconciliador. Um algoritmo melhor não economiza trabalho que o DOM insiste em fazer.

*Criar uma lista não mudou* pelo mesmo motivo. `criar 50.000` é o custo de inserir 50.000 nós; o reconciliador é um erro de arredondamento ao lado disso.

*Duas edições em pontas opostas custam o que comparar custa.* A região alterada é um intervalo contínuo, então acrescentar uma linha no fim e tirar outra do começo (o formato de um log rolante) produz um intervalo que cobre tudo entre as duas. Correto, e não mais rápido que a varredura. Dividir em várias regiões disjuntas resolveria esse caso; isso não foi implementado, porque é complexidade real para um formato que nenhum destes benchmarks mediu.

*Listas sem `:key` identificam linhas pela posição*, então remover a primeira linha muda de verdade todas as linhas depois dela e não há nada para pular.

O método completo, os contadores e como reproduzir qualquer parte disso estão em [`benchmarks/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/README.md#the-reconciliation-suite); o algoritmo e seus invariantes estão em [`ARCHITECTURE.md`](https://github.com/kwy404/Voodoo.js/blob/main/ARCHITECTURE.md#5-list-reconciliation).

</details>

<details>
<summary><b>Desmontar uma lista</b> (o vazamento de memória do v-for corrigido na 0.13)</summary>

O `v-if` e o `v-for` tiram o próprio elemento do documento e o guardam como molde para clonar. A limpeza desse elemento (o escopo de efeitos que segura o template, cada bloco renderizado e cada nó dentro deles) era indexada por esse elemento, e o `destroy()` só percorre filhos vivos. Depois de destacado, nada mais o alcançava. O escopo nunca era parado e segurava tudo o que a lista já tinha renderizado.

![Desmontagem do v-for: antes e depois](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/vfor-teardown.svg)

O número antigo crescia com a lista, porque era proporcional ao que tinha sido renderizado: 394 KB retidos por montagem com 50 linhas, 750 KB com 100, 1,5 MB com 200. O novo não cresce, e o que sobra é ruído e não retenção. O próprio benchmark de memória do projeto não conseguia terminar antes disso (esgotava um heap de 3,8 GB e derrubava o resto da suíte junto) e o caso de alternar `v-if` caiu de 5.683 ms para 3.079 ms quando o lixo parou de se acumular, então o vazamento custava tempo além de memória.

Medido no Node 24 com jsdom, cinquenta ciclos de montar e destruir por tamanho, com o heap forçado entre amostras, numa máquina só. Trate como o formato da mudança, não como número absoluto: o seu navegador não é o jsdom. Reproduza com `node --expose-gc scripts/measure-teardown.mjs`, que compila as duas versões, mede e devolve o código ao lugar.

Uma ressalva honesta da mesma rodada: a *criação* de listas nesse tamanho é dominada pelo próprio DOM. Inserir 4.000 nós sem framework nenhum levou mais tempo no jsdom do que a renderização inteira da Voodoo, então os números de criação dizem mais sobre o ambiente do que sobre o framework.

</details>

<details>
<summary><b>Tamanho dos bundles</b></summary>

![Tamanho dos bundles entre frameworks](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/bundle-sizes.svg)

A Voodoo é o maior bundle desse gráfico e não há como ler de outro jeito. O que o número de tamanho não consegue dizer é que os projetos não entregam a mesma coisa: roteador, cliente HTTP, formulários, validação, máscaras, kit de interface, gráficos, i18n, stores, animação e arrastar e soltar estão neste arquivo, e na maioria dos outros são pacotes que você acrescenta depois.

![O que chega junto com o download](https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/docs/media/batteries.svg)

Os dois gráficos são verdade ao mesmo tempo. Se tamanho de bundle é a sua restrição principal, Alpine e Preact continuam sendo a recomendação honesta, e o `voodoo.core.min.js` existe para páginas que querem as directives e nada mais.

Medido nos builds 1.0.0 publicados na `main` (KiB):

| Build | Minificado | Gzip | Brotli |
| --- | --- | --- | --- |
| `voodoo.core.min.js` | 147.92 KB | 51.04 KB | 44.46 KB |
| `voodoo.min.js` | 272.30 KB | 88.29 KB | 74.72 KB |
| `voodoo.full.min.js` | 451.65 KB | 137.08 KB | 114.04 KB |

Rode você mesmo com `npm run size`; o harness e as versões exatas testadas ficam em [`benchmarks/`](https://github.com/kwy404/Voodoo.js/tree/main/benchmarks).

</details>

## Comparação

Uma comparação honesta. Cada ferramenta aqui é boa naquilo para que foi feita.

| | Voodoo.js | Alpine.js | HTMX | Vue 3 | React | jQuery |
| --- | --- | --- | --- | --- | --- | --- |
| Ponto de partida | HTML | HTML | HTML | JavaScript | JavaScript | JavaScript |
| Roda de uma tag de CDN | sim | sim | sim | sim | sim | sim |
| Passo de build | opcional | opcional | opcional | recomendado | recomendado | opcional |
| JSX sem passo de build | **sim** | não | não | não | não | não |
| Renderização | DOM direto | DOM direto | HTML do servidor | Virtual DOM | Virtual DOM | manual |
| Estado reativo | embutido | embutido | não | embutido | embutido | não |
| Componentes | embutido | pacote do ecossistema | não | embutido | embutido | não |
| Cliente HTTP | embutido | pacote do ecossistema | embutido | pacote do ecossistema | pacote do ecossistema | embutido |
| Formulários + validação | embutido | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema |
| Roteador | embutido | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema |
| Interface (toast, modal, abas) | embutido | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema |
| Gráficos / i18n | embutido | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema | pacote do ecossistema |
| Renderização no servidor | não | não | nativo (o servidor renderiza) | embutido | embutido | não |
| Tamanho do ecossistema | jovem | crescendo | crescendo | grande | muito grande | muito grande |

A diferença de verdade é de filosofia. O **HTMX** diz que o servidor é dono do HTML e o navegador só troca os pedaços. O **Alpine** dá ao HTML uma pitada de estado reativo e para por ali de propósito. **Vue e React** pedem que você descreva a interface em JavaScript e geram o HTML. A **Voodoo** mantém o HTML como fonte da verdade *e* dá a ele a caixa de ferramentas completa, então você raramente precisa sair dele, e a API `V` está esperando os momentos em que precisar. Vindo de outra biblioteca: tabelas de migração do [jQuery](https://github.com/kwy404/Voodoo.js/blob/main/docs/migrando-do-jquery.md), do [Alpine](https://github.com/kwy404/Voodoo.js/blob/main/docs/migrando-do-alpine.md) e do [Vue](https://github.com/kwy404/Voodoo.js/blob/main/docs/migrando-do-vue.md).

## Quando usar a Voodoo

Bons encaixes: painéis administrativos renderizados no servidor (Laravel, Rails, Django, Spring, PHP puro); sites de conteúdo e landing pages que precisam de comportamento sem um pipeline de front-end; protótipos, em que abrir um arquivo vence qualquer arquitetura; equipes pequenas que não querem manter um build só para renderizar uma tabela; páginas legadas, em que a Voodoo convive com o código existente porque nunca toma conta do documento; e aplicações de página única completas, com componentes, stores e o roteador.

**Limitações atuais**, ditas com todas as letras para nada te surpreender depois:

- **Sem renderização no servidor nem hidratação.** A Voodoo roda no navegador. Os módulos puros (reatividade, HTTP, utilitários) funcionam no Node, mas não existe uma história de hidratação.
- **Sem alvo mobile nativo.** Não existe um equivalente ao React Native.
- **Ecossistema jovem.** Menos plugins de terceiros, integrações e respostas na internet do que os frameworks estabelecidos. Essa diferença é real e leva tempo para fechar.
- **Integrações de terceiros limitadas.** Bibliotecas de componentes e ferramentas feitas para React ou Vue não servem aqui.
- **Sem tipagem estática dentro dos templates.** Expressões de atributo são strings; erros aparecem em tempo de execução, não de compilação.
- **Sem virtualização de listas.** O `v-for` reaproveita elementos pela chave, mas listas muito grandes ainda renderizam todas as linhas.

## Exemplos

Cada exemplo é um único arquivo HTML que você abre direto no navegador. Veja [ao vivo](https://kwy404.github.io/Voodoo.js/examples/), comece por [`site/examples/index.html`](https://github.com/kwy404/Voodoo.js/blob/main/site/examples/index.html), ou sirva o repositório inteiro:

```bash
npm run build && npm run serve
# depois abra http://localhost:5173/examples/
```

O mesmo servidor hospeda o site da documentação e o playground ao vivo em [`site/index.html`](https://github.com/kwy404/Voodoo.js/blob/main/site/index.html) (`http://localhost:5173/site/#playground`), onde você edita marcação Voodoo e vê rodar na hora.

<details>
<summary><b>Aplicações</b> (tarefas, CRUD, dashboard, kanban, chat, chat em tempo real, e-commerce, Pokédex, DevTools)</summary>

| Exemplo | O que mostra |
| --- | --- |
| [Tarefas](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/todo) | Estado, listas, edição no lugar, filtros, reordenação |
| [CRUD](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/crud) | Um componente, formulários, validação, máscaras, toasts, atualizações otimistas |
| [Dashboard](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/dashboard) | Gráficos, valores computados reativos, atualização periódica |
| [Kanban](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/kanban) | Arrastar e soltar entre colunas, estado persistido |
| [Chat](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/chat) | Atualizações ao vivo, comportamento de rolagem, composição de mensagens |
| [Chat em tempo real](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/chat-tempo-real) | `v-socket` e `v-room` sobre um WebSocket de verdade, salas públicas, mensagens privadas, presença e reentrada automática depois de reconectar. Vem com um servidor de teste sem dependências |
| [E-commerce](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/ecommerce) | Catálogo, filtros, store de carrinho, fluxo de checkout |
| [Pokédex](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/pokedex) | Consumo de API real, busca, paginação, carregamento sob demanda |
| [DevTools](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/devtools) | Ligar o inspetor a partir de um único atributo no script |

</details>

<details>
<summary><b>Gráficos e jogos</b> (mundo aberto 3D, Breakout, Tetris, shaders)</summary>

Estes existem para provar um ponto: a interface inteira é Voodoo declarativa, e o canvas só cuida do que precisa de verdade de um canvas.

| Exemplo | O que mostra |
| --- | --- |
| [Mundo aberto 3D](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/mundo-aberto) | Uma cidade gerada proceduralmente em WebGL2 puro, sem bibliotecas. Ciclo dia e noite, sombras, neblina, minimapa e velocímetro, com o HUD e os controles ao vivo escritos como marcação Voodoo comum |
| [Breakout](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/jogos/breakout) | Cinco fases, power-ups caindo, contador de combo, vidas, recorde persistido e som. Jogável com teclado e toque |
| [Tetris](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/jogos/tetris) | Sorteio em sacos de sete, peça fantasma, hold, wall kicks. O tabuleiro é canvas; a fila de próximas peças é uma grade de spans montada com `v-for` aninhado |
| [Shaders](https://github.com/kwy404/Voodoo.js/tree/main/site/examples/shaders) | Quatro cenas de raymarching em WebGL2 (Mandelbulb, túnel infinito, metaballs e um oceano) com o painel de controle inteiro gerado por `v-for` sobre os uniforms de cada cena, e `v-model` ligado direto na GPU |

</details>

## Documentação

O site em **[kwy404.github.io/Voodoo.js/docs](https://kwy404.github.io/Voodoo.js/docs/)** tem o guia, a referência da API e exemplos que rodam. No repositório, o guia completo fica em [`docs/`](https://github.com/kwy404/Voodoo.js/tree/main/docs) e uma trilha em inglês em [`docs/en/`](https://github.com/kwy404/Voodoo.js/tree/main/docs/en).

| Onde | O quê |
| --- | --- |
| [`docs/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/README.md) | Índice do guia completo e da referência |
| [`docs/introducao.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/introducao.md) | O que é, para quem é, quando não usar |
| [`docs/instalacao.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/instalacao.md) | Builds, CDN, npm, configuração pela tag de script |
| [`docs/inicio-rapido.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/inicio-rapido.md) | De um arquivo vazio a uma aplicação funcionando |
| [`docs/directives.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/directives.md) | Referência completa das directives |
| [`docs/api.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/api.md) | Referência completa da API `V` |
| [`docs/perguntas-frequentes.md`](https://github.com/kwy404/Voodoo.js/blob/main/docs/perguntas-frequentes.md) | Perguntas frequentes |
| [`site/`](https://github.com/kwy404/Voodoo.js/tree/main/site) | Código do site da documentação |

## Arquitetura

```
  atributos HTML  ─▶  Walker + MutationObserver     acha atributos v-*, monta escopos
                             │
  expressões      ─▶  Lexer → parser Pratt → interpretador de AST    sem eval, sem new Function
                             │
                      Reatividade: alvos Proxy + efeitos         leituras rastreadas, escritas em fila
                             │
                      Directives atualizam os nós reais do DOM   sem Virtual DOM, sem passada de diff

  Por cima: componentes · stores · roteador · HTTP · formulários · interface · i18n · animação · gráficos
```

A versão longa, com as fronteiras entre módulos e o modelo de escopos, está em [`ARCHITECTURE.md`](https://github.com/kwy404/Voodoo.js/blob/main/ARCHITECTURE.md).

| Pacote | Para que serve |
| --- | --- |
| [`voodoojs`](https://github.com/kwy404/Voodoo.js/tree/main/packages/voodoojs) | O framework: runtime, directives, componentes, HTTP, formulários, interface, roteador, i18n |
| [`voodoojs-cli`](https://github.com/kwy404/Voodoo.js/tree/main/packages/cli) | Criação de projetos, builds sob medida, cópia de componentes, informações dos módulos |

## Roadmap

O foco de curto prazo é documentação em inglês, mais exemplos e uma superfície maior para plugins. O plano acompanhado fica em [`ROADMAP.md`](https://github.com/kwy404/Voodoo.js/blob/main/ROADMAP.md); as mudanças publicadas ficam em [`CHANGELOG.md`](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md).

## Contribuindo

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install
```

Um monorepo com npm workspaces: [`packages/voodoojs`](https://github.com/kwy404/Voodoo.js/tree/main/packages/voodoojs) é o framework, [`packages/cli`](https://github.com/kwy404/Voodoo.js/tree/main/packages/cli) é a CLI, além de [`docs/`](https://github.com/kwy404/Voodoo.js/tree/main/docs), [`site/`](https://github.com/kwy404/Voodoo.js/tree/main/site) e [`site/examples/`](https://github.com/kwy404/Voodoo.js/tree/main/site/examples).

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda a suíte inteira uma vez (vitest + jsdom) |
| `npm run test:watch` | A mesma suíte, rodando de novo a cada edição |
| `npm run coverage` | Testes com relatório de cobertura |
| `npm run typecheck` | `tsc --noEmit` sobre o pacote do framework |
| `npm run build` | Gera todos os bundles de `voodoojs` e `voodoojs-cli` |
| `npm run size` | Mostra o tamanho de cada bundle gerado |
| `npm run serve` | Servidor estático local para os exemplos e o site |
| `npm run format` | Prettier no repositório |

Novos scripts aparecem com o tempo; o `package.json` da raiz é a lista oficial.

**O ciclo.** Crie uma branch a partir da `main`, faça a mudança, rode `npm test` e `npm run typecheck` antes de abrir o PR, e escreva as mensagens de commit no estilo [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `docs:`). A CI ([`.github/workflows/ci.yml`](https://github.com/kwy404/Voodoo.js/blob/main/.github/workflows/ci.yml)) roda typecheck, testes, build e a verificação de tamanho do bundle no Node 20 e 22.

**Onde as coisas ficam.** Bug de runtime: `src/runtime/`. Reatividade: `src/reactivity/`. Parser de expressões: `src/parser/`. Directive nova: `src/directives/`. Componente de interface: `src/ui/`. Documentação: `docs/` e `site/docs/`.

**A regra de ouro: toda correção de bug vem com um teste de regressão.** Se quebrou uma vez pode quebrar de novo, e o teste é o que impede.

<details>
<summary><b>Como acrescentar uma directive e um teste</b></summary>

Directives internas são registradas com `defineDirective(nome, setup, { priority, terminal })` de `src/runtime/registry.ts`, no arquivo correspondente em `src/directives/`. A função `setup` recebe um `DirectiveContext` com `el`, `scope`, `expression`, `arg`, `modifiers`, `evaluate()`, `effect()`, `cleanup()` e `walk()`. `priority` ordena a execução (maior primeiro, veja a tabela `PRIORITY`); `terminal: true` impede o walker de descer para os filhos, como fazem o `v-for` e o `v-if`.

```ts
import { defineDirective } from '../runtime/registry';

// <p v-grito="mensagem">  renderiza o valor em caixa alta
defineDirective('grito', ({ el, effect, evaluate, cleanup }) => {
  effect(() => {
    el.textContent = String(evaluate() ?? '').toUpperCase();
  });

  // Sempre libere o que você pendura: listeners, timers, observers.
  const aoClicar = () => el.classList.toggle('alto');
  el.addEventListener('click', aoClicar);
  cleanup(() => el.removeEventListener('click', aoClicar));
});
```

Essa é a API interna. A pública é `V.directive(nome, hooks)`, que envolve o mesmo mecanismo em hooks de ciclo de vida no estilo do Vue (`created`, `mounted`, `updated`, `unmounted`) e dá a cada hook um `binding` com o `value` avaliado, `oldValue`, `arg` e `modifiers`. Use `V.directive` no código da aplicação; use `defineDirective` dentro do framework.

Os testes ficam em [`packages/voodoojs/test/`](https://github.com/kwy404/Voodoo.js/tree/main/packages/voodoojs/test) como `*.test.ts`, e rodam no vitest com jsdom. Um teste de directive monta HTML, percorre com um escopo e verifica o DOM:

```ts
import { describe, it, expect } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

describe('v-grito', () => {
  it('renderiza o valor em caixa alta', async () => {
    const dados = reactive({ mensagem: 'olá' });
    const raiz = document.createElement('div');
    raiz.innerHTML = '<p v-grito="mensagem"></p>';
    document.body.appendChild(raiz);
    walk(raiz, new Scope(dados));

    expect(raiz.textContent).toBe('OLÁ');

    dados.mensagem = 'tchau';
    await nextTick();
    await nextTick();
    expect(raiz.textContent).toBe('TCHAU');
  });
});
```

</details>

Os detalhes completos estão em [`CONTRIBUTING.md`](https://github.com/kwy404/Voodoo.js/blob/main/CONTRIBUTING.md) ([como acrescentar uma directive](https://github.com/kwy404/Voodoo.js/blob/main/CONTRIBUTING.md#how-to-add-a-directive), [como acrescentar um teste](https://github.com/kwy404/Voodoo.js/blob/main/CONTRIBUTING.md#how-to-add-a-test)), e todo mundo deve seguir o [`CODE_OF_CONDUCT.md`](https://github.com/kwy404/Voodoo.js/blob/main/CODE_OF_CONDUCT.md).

## Conheça outros projetos de kwy404

Outras ferramentas open source do mesmo autor.

| | Projeto | O que faz | npm | Documentação |
| --- | --- | --- | --- | --- |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/monsoon@main/assets/mascot.svg" alt="Monsoon mascot" width="48"> | **[Monsoon](https://github.com/kwy404/monsoon)** | CSS utilitário sem passo de build: um tema acessível inteiro a partir de uma cor `--seed`, 167 componentes | [![npm](https://img.shields.io/npm/v/monsooncss.svg?label=&color=CB3837)](https://www.npmjs.com/package/monsooncss) | [site](https://kwy404.github.io/monsoon/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/breakhound@main/assets/mascot.svg" alt="breakhound mascot" width="48"> | **[breakhound](https://github.com/kwy404/breakhound)** | Encontra bugs em qualquer biblioteca JavaScript automaticamente, sem precisar de testes | [![npm](https://img.shields.io/npm/v/breakhound.svg?label=&color=CB3837)](https://www.npmjs.com/package/breakhound) | [site](https://kwy404.github.io/breakhound/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/vueleap@main/assets/mascot.svg" alt="vueleap mascot" width="48"> | **[vueleap](https://github.com/kwy404/vueleap)** | Migra Vue 2 para Vue 3 com um comando | [![npm](https://img.shields.io/npm/v/vueleap.svg?label=&color=CB3837)](https://www.npmjs.com/package/vueleap) | [site](https://kwy404.github.io/vueleap/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/graphemely@main/assets/mascot.svg" alt="graphemely mascot" width="48"> | **[graphemely](https://github.com/kwy404/graphemely)** | Trunca, corta e conta strings com emoji com segurança | [![npm](https://img.shields.io/npm/v/%40kwy404%2Fgraphemely.svg?label=&color=CB3837)](https://www.npmjs.com/package/@kwy404/graphemely) | [site](https://kwy404.github.io/graphemely/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/numberparrot@main/assets/mascot.svg" alt="numberparrot mascot" width="48"> | **[numberparrot](https://github.com/kwy404/numberparrot)** | Lê números e valores monetários localizados em qualquer idioma | [![npm](https://img.shields.io/npm/v/numberparrot.svg?label=&color=CB3837)](https://www.npmjs.com/package/numberparrot) | [site](https://kwy404.github.io/numberparrot/) |
| <img src="https://cdn.jsdelivr.net/gh/kwy404/edgegoat@main/assets/mascot.svg" alt="edgegoat mascot" width="48"> | **[edgegoat](https://github.com/kwy404/edgegoat)** | Entradas de teste para casos extremos em JavaScript | [![npm](https://img.shields.io/npm/v/edgegoat.svg?label=&color=CB3837)](https://www.npmjs.com/package/edgegoat) | [site](https://kwy404.github.io/edgegoat/) |

## Autor

Criado por **Alexandre Kohler** ([GitHub](https://github.com/kwy404) e [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).

O [site](https://kwy404.github.io/Voodoo.js/) é feito com [Monsoon](https://kwy404.github.io/monsoon/), e as partes interativas são feitas com o próprio Voodoo.js.

## Licença

[MIT](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE) © contribuidores da Voodoo.js.

---

<div align="center">

**Prefer English?** [README.md](https://github.com/kwy404/Voodoo.js/blob/main/README.md)

<sub>JavaScript feels like magic.</sub>

</div>
