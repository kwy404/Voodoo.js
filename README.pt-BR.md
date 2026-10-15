<div align="center">

<a href="https://kwy404.github.io/Voodoo.js/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/Voodoo.js@main/brand/mascot-v2/banner.svg" alt="Voodoo.js: JSX em HTML puro, sem passo de build" width="760">
  </picture>
</a>

### JSX em HTML puro. Sem passo de build.

Escreva JSX e atributos reativos num arquivo `.html`, abra no navegador, e ele roda.

[![CI](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml/badge.svg)](https://github.com/kwy404/Voodoo.js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/voodoojs.svg?label=npm&color=CB3837)](https://www.npmjs.com/package/voodoojs)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-FFB35C.svg)](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)

**[Site](https://kwy404.github.io/Voodoo.js/) · [Aprenda em 10 minutos](https://kwy404.github.io/Voodoo.js/learn.html) · [Playground](https://kwy404.github.io/Voodoo.js/playground.html) · [Documentação](https://kwy404.github.io/Voodoo.js/docs/) · [Exemplos](https://kwy404.github.io/Voodoo.js/examples/) · [English](https://github.com/kwy404/Voodoo.js/blob/main/README.md)**

</div>

## Uma primeira página

Salve como `index.html` e abra. Não há nada para instalar nem para compilar.

```html
<!doctype html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
</head>
<body>

{
  const user = 'Ana';
  const fruits = ['maçã', 'pera', 'uva'];
}

<h1>Olá, {user}!</h1>

<ul>
  {fruits.map((fruit) => (
    <li>{fruit}</li>
  ))}
</ul>

</body>
</html>
```

O mesmo runtime lê atributos, e os dois estilos se misturam livremente na mesma página:

```html
<div v-data="{ count: 0 }">
  <button @click="count--">-</button>
  <strong>{ count }</strong>
  <button @click="count++">+</button>
</div>
```

Começando agora? A **[aula de 10 minutos](https://kwy404.github.io/Voodoo.js/learn.html)** passa por estado,
eventos, `v-model`, `v-if`, `v-for`, JSX e busca de dados num editor ao vivo.

## O que é

- **Sem ferramentas.** O arquivo que você edita é o arquivo que o navegador roda, até direto do disco.
- **Reatividade granular.** Uma mudança atualiza só os nós do DOM que a leem. Não há DOM virtual.
- **Sem eval.** As expressões passam por um parser e um interpretador, então as páginas rodam sob uma
  Content Security Policy rígida.
- **Já vem junto.** Componentes, HTTP, formulários e validação, máscaras, roteador, i18n, animação, gráficos
  e componentes de interface prontos, sem dependências em tempo de execução.
- **TypeScript.** O código é TypeScript e cada ponto de entrada traz as declarações.

**O custo, dito com franqueza.** Um compilador transforma JSX em chamadas de DOM antes da hora; a Voodoo lê
o JSX em tempo de execução, então um framework compilado é mais rápido em atualizações brutas e entrega menos
código. Os [benchmarks](https://github.com/kwy404/Voodoo.js/tree/main/benchmarks) mostram onde e quanto. A
Voodoo combina com páginas renderizadas no servidor, painéis administrativos, sites de conteúdo, protótipos
e páginas em que um passo de build custa mais do que entrega.

## Instalação

**Por CDN:**

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js" defer></script>
```

A biblioteca começa sozinha quando a página fica pronta.

**Pelo npm**, para um bundler ou uma aplicação renderizada no servidor:

```bash
npm install voodoojs
```

```js
import V from 'voodoojs'
V.start()
```

**Qual arquivo?**

| Arquivo | O que tem |
| --- | --- |
| `voodoo.core.min.js` | Reatividade, expressões, diretivas, componentes e requisições declarativas |
| `voodoo.min.js` | Soma formulários, validação, máscaras, diretivas de interface e arrastar e soltar |
| `voodoo.full.min.js` | Soma JSX em HTML, gráficos, animação, roteador, i18n e 29 componentes prontos |

JSX em HTML precisa do build completo. Os tamanhos estão no
[relatório de bundles](https://github.com/kwy404/Voodoo.js/blob/main/benchmarks/reports/bundle.md).

## Um pouco mais

Uma requisição com estado de carregamento e de erro, e um formulário que valida e envia, sem script:

```html
<div v-resource="users: /api/users">
  <p v-if="users.loading">Carregando...</p>
  <p v-else-if="users.error">{ users.error.message }</p>
  <ul v-else>
    <li v-for="user in users.data" :key="user.id">{ user.name }</li>
  </ul>
</div>

<form v-submit="/api/users" v-method="POST" v-validate v-toast-success="Usuário criado">
  <input name="email" type="email" v-required v-email>
  <button type="submit" :disabled="$form.loading">Salvar</button>
</form>
```

Quando o HTML não basta, o objeto `V` oferece o mesmo em JavaScript: `V.reactive`, `V.component`,
`V.http`, `V.store` e `V.router`.

## Linha de comando

```bash
npx voodoojs-cli init minha-pagina                     # uma página pronta para abrir
npx voodoojs-cli add card                              # copia um componente para o seu projeto
npx voodoojs-cli build --modules=core,directives,http  # um bundle só com o que você usa
```

Todos os comandos: [`packages/cli/README.md`](https://github.com/kwy404/Voodoo.js/blob/main/packages/cli/README.md).

## Documentação

- **[O site de documentação](https://kwy404.github.io/Voodoo.js/docs/)**: o guia, a referência e exemplos
  ao vivo.
- **[O playground](https://kwy404.github.io/Voodoo.js/playground.html)**: cinco pontos de partida e mais de
  cem exemplos para editar no navegador.
- Neste repositório: [`docs/`](https://github.com/kwy404/Voodoo.js/tree/main/docs),
  [`ARCHITECTURE.md`](https://github.com/kwy404/Voodoo.js/blob/main/ARCHITECTURE.md),
  [`CHANGELOG.md`](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md) e
  [`ROADMAP.md`](https://github.com/kwy404/Voodoo.js/blob/main/ROADMAP.md).

## Contribuindo

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js && npm install
npm test            # a suíte de testes
npm run typecheck   # os tipos
npm run build       # todos os bundles
npm run serve       # o site e os exemplos num servidor local
```

Toda correção de bug vem com um teste de regressão. Os detalhes estão em
[`CONTRIBUTING.md`](https://github.com/kwy404/Voodoo.js/blob/main/CONTRIBUTING.md), e todos devem seguir o
[`CODE_OF_CONDUCT.md`](https://github.com/kwy404/Voodoo.js/blob/main/CODE_OF_CONDUCT.md).

## Mais de kwy404

[Monsoon](https://github.com/kwy404/monsoon),
[breakhound](https://github.com/kwy404/breakhound),
[vueleap](https://github.com/kwy404/vueleap),
[graphemely](https://github.com/kwy404/graphemely),
[numberparrot](https://github.com/kwy404/numberparrot),
[edgegoat](https://github.com/kwy404/edgegoat),
[cookieowl](https://github.com/kwy404/cookieowl),
[installkite](https://github.com/kwy404/installkite),
[a11ymedic](https://github.com/kwy404/a11ymedic),
[fontsketch](https://github.com/kwy404/fontsketch) e
[kastor](https://github.com/kwy404/kastor).

## Autor

Feito por **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).
O [site](https://kwy404.github.io/Voodoo.js/) é feito com [Monsoon](https://kwy404.github.io/monsoon/), e
suas partes interativas são feitas com Voodoo.js.

## Licença

[MIT](https://github.com/kwy404/Voodoo.js/blob/main/LICENSE)
