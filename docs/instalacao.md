# Instalação

Existem três caminhos: CDN, npm e download direto. Todos entregam a mesma biblioteca.

## CDN, o caminho mais curto

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
```

Isso é tudo. Ao carregar, a biblioteca publica `window.V` (e `window.Voodoo`, o mesmo objeto),
aplica o tema salvo, aplica a paleta salva e percorre o `document.body` inicializando os atributos
`v-*` assim que o DOM fica pronto.

Para o build completo, com gráficos, animações, roteador, idiomas, inspetor e os componentes
prontos:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.full.min.js" defer></script>
```

O `unpkg` também funciona:

```html
<script src="https://unpkg.com/voodoojs/dist/voodoo.min.js" defer></script>
```

Fixe a versão em produção, para que uma publicação nova nunca mude a sua página sem aviso:

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs@0.1.0/dist/voodoo.min.js" defer></script>
```

## Qual bundle escolher

| | `voodoo.min.js` | `voodoo.full.min.js` |
| --- | --- | --- |
| Tamanho aproximado | 75 KB gzip | 120 KB gzip |
| Reatividade, directives, componentes | sim | sim |
| DOM encadeável (`V('#app')`) | sim | sim |
| HTTP declarativo e `V.http` | sim | sim |
| Formulários, validação, máscaras | sim | sim |
| Interface: modal, abas, gaveta, tooltip, paleta de comandos | sim | sim |
| Arrastar e soltar | sim | sim |
| Notificações, diálogos, armazenamento, paleta de cores | sim | sim |
| Gráficos SVG (`v-chart`) | não | sim |
| Animações com mola (`v-motion`, `V.animate`) | não | sim |
| Roteador (`v-link`, `v-router-view`) | não | sim |
| Idiomas (`v-t`, `$t`) | não | sim |
| Inspetor `xray` | não | sim |
| 29 componentes prontos (`VButton`, `VCard`, ...) | não | sim |

Regra prática: comece pelo essencial. Troque para o completo no dia em que precisar de um gráfico,
de uma rota ou dos componentes prontos.

## npm

```bash
npm install voodoojs
```

Importar o pacote não mexe no DOM. Você decide quando iniciar:

```js
import V from 'voodoojs';

V.start();
```

Também dá para importar apenas o que usa, com tree shaking:

```js
import { reactive, watch } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
import { debounce, formatCurrency } from 'voodoojs/utils';
```

Ou pegar nomes soltos do pacote principal:

```js
import { reactive, http, toast, store, validate, animate } from 'voodoojs';
```

Pontos de entrada publicados:

| Import | Conteúdo |
| --- | --- |
| `voodoojs` | Objeto `V` completo e todas as reexportações |
| `voodoojs/reactivity` | `reactive`, `ref`, `computed`, `effect`, `watch`, `nextTick`, `EffectScope` |
| `voodoojs/http` | `http`, `request`, `HttpError` |
| `voodoojs/utils` | `debounce`, `throttle`, formatadores, utilitários de array e texto |
| `voodoojs/dist/voodoo.min.js` | Arquivo de navegador, caso queira servir por conta própria |

O pacote publica ESM (`import`), CJS (`require`) e tipos TypeScript.

## Download direto

Baixe `dist/voodoo.min.js` (ou `dist/voodoo.full.min.js`), coloque ao lado do seu HTML e aponte:

```html
<script src="/js/voodoo.min.js" defer></script>
```

Cada arquivo vem com o `.map` correspondente. Copie os dois se quiser depurar o código original.

## Configuração pela tag script

O jeito mais rápido de configurar é por atributos na própria tag, sem escrever JavaScript:

```html
<script
  src="voodoo.min.js"
  data-base-url="https://api.exemplo.com"
  data-locale="pt-BR"
  defer
></script>
```

| Atributo | Efeito |
| --- | --- |
| `data-manual` | Não inicia sozinho. Você chama `V.start()` quando quiser |
| `data-defer-init` | O mesmo que `data-manual` |
| `data-prefix` | Troca o prefixo dos atributos, por exemplo `data-v-` |
| `data-base-url` | URL base das requisições de `V.http` e das directives HTTP |
| `data-locale` | Idioma usado por formatadores de data, número e moeda |
| `data-devtools` | Liga avisos detalhados no console |
| `data-no-styles` | Não injeta o CSS dos componentes de interface |
| `data-no-observer` | Desliga o `MutationObserver` que inicializa HTML criado depois |
| `data-keep-attributes` | Mantém os atributos `v-*` no HTML depois de processados |

## Configuração por JavaScript

Para ajustar antes do primeiro render, use `data-manual` e configure na mão:

```html
<script src="voodoo.min.js" data-manual></script>
<script>
  V.config.prefix = 'data-v-';
  V.config.locale = 'pt-BR';
  V.config.currency = 'BRL';
  V.config.globals.formatarSlug = (texto) => texto.toLowerCase();
  V.http.setBaseURL('https://api.exemplo.com');
  V.start();
</script>
```

Todas as opções de `V.config`:

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `prefix` | `'v-'` | Prefixo dos atributos |
| `autoStart` | `true` | Inicia a biblioteca quando o script carrega |
| `autoDiscover` | `true` | Observa o DOM e inicializa elementos criados depois |
| `root` | `null` | Raiz observada. Sem valor, usa `document.body` |
| `devtools` | `false` | Avisos detalhados no console e comentários âncora nomeados |
| `baseURL` | `''` | URL base das requisições declarativas |
| `globals` | `{}` | Valores extras liberados dentro das expressões |
| `locale` | idioma do navegador | Locale dos formatadores |
| `currency` | `'BRL'` | Moeda padrão dos formatadores |
| `injectStyles` | `true` | Injeta o CSS dos componentes de interface |
| `cleanAttributes` | `true` | Retira os atributos `v-*` do HTML depois de processados |

## Prefixo válido para HTML estrito

Se o seu validador de HTML reclamar de `v-text`, troque o prefixo:

```html
<script src="voodoo.min.js" data-prefix="data-v-" defer></script>
```

```html
<div data-v-data="{ n: 0 }">
  <button data-v-click="n++">Somar</button>
  <b data-v-text="n"></b>
</div>
```

A biblioteca sempre aceita `data-v-nome`, mesmo quando o prefixo configurado é outro. Os atalhos
`:atributo` e `@evento` continuam funcionando nos dois modos.

## Evitando o piscar do conteúdo

Enquanto a biblioteca não iniciou, o HTML bruto aparece na tela por um instante. Use `v-cloak`
com uma regra de CSS:

```html
<style>
  [v-cloak] { display: none !important; }
</style>

<div v-cloak v-data="{ carregando: true }">
  <p>{ carregando ? 'Carregando...' : 'Pronto' }</p>
</div>
```

O CSS de `[v-cloak]` já vem embutido nos tokens injetados pela biblioteca, mas declarar no seu
próprio arquivo garante que a regra exista antes do primeiro quadro.

## Verificando se deu certo

```html
<script>
  document.addEventListener('voodoo:ready', (e) => {
    console.log('Voodoo', V.version, 'iniciada em', e.detail.root);
  });
</script>
```

## CLI

O pacote `@voodoo/cli` monta builds sob medida com apenas os módulos que você usa:

```bash
npx voodoo init            # cria um projeto novo pronto para usar
npx voodoo build           # monta um bundle escolhendo módulo por módulo
npx voodoo add card        # copia um componente para dentro do seu projeto
npx voodoo info            # mostra o que está instalado e o tamanho de cada módulo
```

---

Anterior: [Introdução](introducao.md) · Próximo: [Início rápido](inicio-rapido.md)
