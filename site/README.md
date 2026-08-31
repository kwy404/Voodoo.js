# Landing page da Voodoo.js

> **JavaScript feels like magic.**

Esta pasta e a pagina oficial da Voodoo.js. Ela e um site estatico, sem framework
de build e sem passo de compilacao, construida com a propria biblioteca. Cada
contador, cada aba, cada acordeao e cada minigame desta pagina roda em atributos
`v-*`, exatamente como a documentacao promete. Se a landing funciona, a
biblioteca funciona.

---

## Arquivos

```
site/
  index.html               a pagina inteira
  favicon.svg              icone da aba
  voodoo.full.min.js       a biblioteca, copiada de packages/voodoojs/dist
  voodoo.full.min.js.map   mapa de origem, util para depurar em producao
  robots.txt               liberacao total, com o sitemap declarado
  sitemap.xml              as cinco URLs de idioma e a pasta de exemplos
  vercel.json              cabecalhos, cache e redirecionamentos
  README.md                este arquivo
  assets/
    styles.css             estilos da landing, com tokens --vd-*
    voodoo-ui.css          tokens e reset do design system do repositorio
    app.js                 idioma, tema, SEO, realce de codigo e auxiliares
    i18n.js                dicionarios dos cinco idiomas
    playground.js          o componente vd-playground, com os exemplos
    flags/                 bandeiras em SVG do seletor de idioma
    brand/                 logo, mascote, ilustracoes e padroes da marca
  docs/
    index.html             capa da documentacao
    guia/                  as 26 paginas do guia, na ordem do menu
    referencia/            as 16 paginas de referencia
    assets/
      docs.css             estilo proprio da documentacao
      docs.js              menu, busca, indice lateral, realce e exemplos ao vivo
      busca.js             indice de busca, gerado por scripts/docs-index.mjs
```

---

## Como rodar localmente

Na raiz do repositorio:

```bash
npm run build          # gera os bundles em packages/voodoojs/dist
node scripts/serve.mjs 5181
```

Abra `http://localhost:5181/site/`.

O servidor de `scripts/serve.mjs` nao tem dependencias e serve a raiz do
repositorio, entao a pasta `/examples/` tambem fica disponivel a partir do mesmo
endereco.

---

## Como atualizar a biblioteca dentro da pagina

A landing carrega o **build completo**, porque ela mostra graficos, animacao com
fisica de mola, roteador, idiomas e os componentes prontos. Depois de qualquer
mudanca no pacote:

```bash
npm run build
cp packages/voodoojs/dist/voodoo.full.min.js     site/voodoo.full.min.js
cp packages/voodoojs/dist/voodoo.full.min.js.map site/voodoo.full.min.js.map
```

No Windows, com PowerShell:

```powershell
npm run build
Copy-Item packages\voodoojs\dist\voodoo.full.min.js     site\voodoo.full.min.js
Copy-Item packages\voodoojs\dist\voodoo.full.min.js.map site\voodoo.full.min.js.map
```

Os numeros mostrados na barra de estatisticas e no comparativo saem de
`node scripts/size.mjs`. Quando o tamanho do bundle mudar, atualize os valores em
`assets/app.js`, no objeto `stats`, e a resposta `faq.a3` nos cinco idiomas de
`assets/i18n.js`. O numero de directives e o de componentes nao precisam de
manutencao: a pagina le `V.directives.size` e `V.components.size` em tempo de
execucao.

---

## Como publicar na Vercel

A pasta `site/` ja e o resultado final. Nao existe comando de build a rodar na
Vercel, apenas arquivos estaticos.

### Pelo painel

1. Em vercel.com, escolha **Add New** e depois **Project**.
2. Importe o repositorio do GitHub.
3. Em **Framework Preset**, escolha **Other**.
4. Em **Root Directory**, escolha `site`.
5. Deixe **Build Command** vazio e marque a opcao de sobrescrever o padrao.
6. Em **Output Directory**, escreva `.` e marque a opcao de sobrescrever.
7. Clique em **Deploy**.

### Pela linha de comando

```bash
npm i -g vercel
cd site
vercel            # pre visualizacao
vercel --prod     # producao
```

### Se a Vercel precisar gerar o bundle no deploy

Quando o `voodoo.full.min.js` nao estiver versionado no repositorio, aponte a
raiz do projeto para a raiz do monorepo e use:

- **Install Command:** `npm install`
- **Build Command:**
  `npm run build && cp packages/voodoojs/dist/voodoo.full.min.js* site/ && cp -r examples site/examples`
- **Output Directory:** `site`

### A pasta de exemplos

A pagina aponta para `/examples/` na chamada final e no rodape. Essa pasta vive
na raiz do repositorio, e nao dentro de `site/`. Escolha um dos dois caminhos:

- use o **Build Command** acima, que copia `examples/` para dentro de `site/`
  antes da publicacao; ou
- publique a raiz do repositorio inteira, deixando `site/` como a pagina inicial
  por um `rewrite` no `vercel.json`.

Localmente, com `node scripts/serve.mjs 5181`, a raiz do repositorio e servida
inteira, entao `http://localhost:5181/examples/` ja funciona.

### Dominio

Depois do primeiro deploy, ligue o dominio em **Settings**, **Domains**. As URLs
canonicas escritas em `index.html`, em `sitemap.xml` e no JSON-LD apontam para
`https://voodoojs.dev`. Se o dominio for outro, troque essas tres ocorrencias.

O `vercel.json` ja cuida de:

- cabecalhos de seguranca em todas as respostas;
- cache de um ano para `voodoo.full.min.js`, que tem nome estavel por versao;
- cache de uma semana para `assets/` e de um mes para os SVG;
- `index.html` sempre revalidado, para que uma publicacao apareca na hora;
- `Access-Control-Allow-Origin` no bundle, para que ele possa ser usado como CDN;
- atalhos `/docs`, `/github` e `/npm`.

---

## A documentacao

A pasta `docs/` e a documentacao do projeto em HTML, servida em `/docs/`. Ela nao tem passo de
build: cada pagina e um arquivo estatico com um `<article class="doc-artigo">` dentro, e o
`assets/docs.js` monta em volta o cabecalho, o menu, o indice lateral, a navegacao anterior e
proxima, o realce de sintaxe e os exemplos ao vivo.

**O menu e a unica fonte de verdade.** A lista `NAVEGACAO`, no comeco de `docs/assets/docs.js`,
define quais paginas existem, em que ordem e em que grupo. Uma pagina nova entra em tres passos:

1. acrescente `{ id: 'guia/nome', titulo: 'Titulo da pagina' }` no grupo certo de `NAVEGACAO`;
2. crie `docs/guia/nome.html` copiando o cabecalho de qualquer pagina vizinha, trocando
   `<title>`, a descricao e o `canonical`;
3. rode `npm run docs:index` para regerar a busca.

**Os exemplos ao vivo** sao os blocos `<div data-exemplo>` com um `<pre data-lang="html">` dentro.
O `docs.js` copia o codigo para um `<iframe>` com a biblioteca carregada, entao o que a pagina
mostra e exatamente o que o codigo faz. Eles carregam por `IntersectionObserver`, so quando
chegam perto da tela, e herdam o tema da pagina.

Tres cuidados ao escrever um exemplo, todos aprendidos errando:

- **interpolacao aceita objeto e quebra de linha,** e o que nao analisa como expressao continua
  sendo texto. Um `{` solto no meio de uma frase nao vira erro.
- **tag propria precisa de fechamento explicito.** `<VInput ... />` nao fecha nada em HTML, e o
  resto do bloco vira filho do componente.
- **o valor de `v-data` e uma expressao, nao um bloco.** Metodos com corpo, `function` e `new`
  nao passam pelo parser. O que precisar disso vive em um `<script>` do proprio exemplo.

**O indice de busca** e `docs/assets/busca.js`, gerado por `scripts/docs-index.mjs` a partir das
proprias paginas: ele quebra cada arquivo nos titulos com `id` e guarda titulo, secao e um trecho
de texto. O arquivo e carregado sob demanda, no primeiro foco do campo de busca. Regere sempre que
o texto mudar:

```bash
npm run docs:index
```

**Publicacao.** As URLs canonicas nao levam `.html`, porque o `vercel.json` liga `cleanUrls`. Os
links internos podem continuar com a extensao: a Vercel redireciona. O `sitemap.xml` lista as 43
paginas.

---

## Idiomas

Cinco idiomas completos: portugues do Brasil (padrao), ingles, espanhol, frances
e alemao. Cada um tem as 375 chaves do dicionario preenchidas, sem excecao.

- O texto vive em `assets/i18n.js` e entra na biblioteca por `V.i18n({ ... })`.
- O HTML escreve o texto em portugues como conteudo real da tag e deixa a
  directive `v-t` trocar em tempo de execucao. Isso serve a dois donos: quem le
  sem JavaScript, e o buscador, que indexa texto de verdade.
- A escolha persiste em `localStorage`, na chave `voodoo:locale`.
- O atributo `lang` do `<html>`, o `og:locale` e o parametro `?lang=` da URL
  acompanham o idioma ativo, o que deixa qualquer link compartilhavel.
- O seletor do cabecalho usa bandeiras em SVG proprias, e nao emoji: emoji de
  bandeira nao tem glifo no Windows.

Para acrescentar um idioma:

1. copie um dos blocos de `assets/i18n.js` e traduza as 375 chaves;
2. acrescente o codigo em `LOCALES`, no fim do mesmo arquivo, com o caminho de
   uma bandeira nova em `assets/flags/`;
3. acrescente o `<link rel="alternate" hreflang="...">` no `index.html` e a URL
   no `sitemap.xml`.

---

## Tema

O tema escuro e o padrao da marca. Um script embutido no `<head>` grava e aplica
a escolha antes da primeira pintura, entao a pagina nunca pisca no tema errado.
O alternador do cabecalho usa `V.theme`, que guarda a preferencia em
`localStorage`, na chave `voodoo:theme`.

Os quadros de pre visualizacao herdam o tema da pagina.

---

## Detalhes que valem conhecer antes de editar

**Os atributos `v-*` somem do HTML.** Depois que a Voodoo.js processa um
elemento, ela guarda os atributos em memoria e os retira do documento. Nenhuma
regra de CSS pode depender de `[v-...]`. Use classes, ou `data-*`, que
permanecem. A propria pagina tem uma secao explicando isso.

**A biblioteca carrega com `data-manual`.** Com `defer`, o `document.readyState`
ja e `interactive` quando a biblioteca avalia, e o inicio automatico aconteceria
antes de `i18n.js`, `playground.js` e `app.js` registrarem os dados, os exemplos
e o componente do playground. Por isso a ordem e:

```html
<script src="voodoo.full.min.js" data-manual defer></script>
<script src="assets/i18n.js" defer></script>
<script src="assets/playground.js" defer></script>
<script src="assets/app.js" defer></script>
```

e quem chama `V.start()` e a ultima linha de `app.js`. Qualquer script novo que
registre componentes, directives ou dados precisa entrar **antes** de `app.js`.

**Interpolacao aceita chaves aninhadas e varias linhas.** `{ $t('chave', { n: 1 }) }` funciona,
porque a varredura conta os niveis de chave. O que nao analisa como expressao fica como texto.

**Chaves dentro de texto que nao e expressao.** A Voodoo.js nao interpola dentro
de `<pre>` e `<code>`. Todo bloco de codigo da pagina fica em
`<pre v-ignore><code data-hl="...">`, e o `v-ignore` impede que o walker desca
na arvore depois que o realce de sintaxe cria os `<span>`.

**Realce de sintaxe.** `assets/app.js` percorre os elementos com `data-hl` e
troca o conteudo por `<span>` coloridos. Isso acontece antes de `V.start()`, de
proposito.

---

## SEO

- Titulo e descricao proprios por idioma, trocados em tempo de execucao.
- Open Graph completo, Twitter Card `summary_large_image`.
- `canonical` e `hreflang` para os cinco idiomas, mais `x-default`.
- JSON-LD com `SoftwareApplication`, `FAQPage` e `BreadcrumbList`.
- Um unico `<h1>`, com a hierarquia de titulos em ordem.
- `robots.txt` e `sitemap.xml` validos.
- CSS critico embutido, fontes com `font-display: swap`, imagens com `alt`,
  `loading="lazy"` e dimensoes declaradas.
- Acessibilidade: foco visivel, navegacao por teclado, `aria-label` onde falta
  texto, contraste conferido nos dois temas e `prefers-reduced-motion`
  respeitado.
