# Idiomas

> Este módulo vem apenas no `voodoo.full.min.js` ou em um build sob medida.

Internacionalização reativa. Trocar o idioma não recarrega a página: todo texto que passou por
`t()` e todo formatador de número, moeda ou data se atualiza sozinho, porque tudo lê o mesmo
estado reativo.

## Configurando

```js
V.i18n({
  locale: 'pt-BR',
  fallback: 'en',
  messages: {
    'pt-BR': {
      comum: { salvar: 'Salvar', cancelar: 'Cancelar' },
      ola: 'Olá, {nome}!',
      itens: 'nenhum item | {n} item | {n} itens',
    },
    en: {
      comum: { salvar: 'Save', cancelar: 'Cancel' },
      ola: 'Hello, {nome}!',
      itens: 'no items | {n} item | {n} items',
    },
  },
});
```

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `locale` | `V.config.locale` | Idioma inicial |
| `fallback` | `en` | Idioma usado quando a chave não existe |
| `messages` | | Mensagens por idioma |
| `currency` | `V.config.currency` | Moeda padrão de `c()` |
| `persist` | `true` | Guarda o idioma escolhido no `localStorage` |
| `detect` | `true` | Detecta o idioma do navegador quando nada foi salvo |
| `loadPath` | | Modelo de URL para carregamento sob demanda, com `{locale}` |

A ordem de escolha do idioma é: o que estava salvo, o detectado no navegador, o declarado na
opção, e por fim o fallback. O idioma escolhido também vai para `document.documentElement.lang`.

## Mensagens

A árvore aceita aninhamento em qualquer nível, e a chave é lida por ponto:

```js
{ comum: { botoes: { salvar: 'Salvar' } } }   // t('comum.botoes.salvar')
```

O mapa achatado também funciona:

```js
{ 'comum.botoes.salvar': 'Salvar' }
```

Quando a chave não existe em lugar nenhum, `t()` devolve a própria chave. Isso é melhor do que
texto vazio na tela e facilita achar o que falta.

## v-t

```html
<button v-t="comum.salvar"></button>
<abbr v-t:title="comum.dica">?</abbr>
<span v-t="'menu.' + secao"></span>
```

Sem argumento, traduz o conteúdo do elemento. Com argumento, escreve no atributo indicado.

## Interpolação

```js
{ ola: 'Olá, {nome}!' }
```

```html
<span>{ $t('ola', { nome: usuario.nome }) }</span>
```

`v-t-params` também existe:

```html
<span v-t="ola" v-t-params="{ nome: usuario.nome }"></span>
```

> Um aviso honesto: `v-t-params` é lido apenas na primeira renderização. Se o texto precisa
> acompanhar a troca de idioma ou a mudança dos valores, use a interpolação com `$t`, que é
> totalmente reativa.

## Pluralização

As formas são separadas por barra vertical:

```js
{
  itens: 'nenhum item | {n} item | {n} itens',
  mensagens: '{n} mensagem | {n} mensagens',
}
```

```html
<span>{ $t('itens', { n: carrinho.length }) }</span>
<span>{ $t('itens', carrinho.length) }</span>     <!-- atalho do mesmo caso -->
```

Como as formas são escolhidas:

- **duas formas** seguem direto a categoria de `Intl.PluralRules` do idioma;
- **três formas** reservam a primeira para o zero, que é o costume em português e em inglês;
- **quatro ou mais** usam a ordem oficial das categorias do CLDR, o que cobre idiomas com dual e
  paucal.

A contagem é lida de `n` ou de `count`.

## Trocando o idioma

```html
<button v-locale="pt-BR">Português</button>
<button v-locale="en">English</button>
<button v-locale="idiomaEscolhido">Trocar</button>
```

O botão do idioma ativo recebe a classe `v-locale-active`.

Por JavaScript:

```js
await V.setLocale('en');
V.getLocale();       // 'en'
V.i18n.locales;      // idiomas com mensagens carregadas
```

Toda a tela se atualiza sozinha, incluindo números, moedas e datas.

## Carregando sob demanda

```js
V.i18n({
  locale: 'pt-BR',
  loadPath: '/i18n/{locale}.json',
  messages: { 'pt-BR': ptBR },
});

await V.i18n.loadMessages('es', '/i18n/es.json');
V.i18n.addMessages('es', { comum: { salvar: 'Guardar' } });
```

Com `loadPath`, trocar para um idioma sem mensagens carregadas busca o arquivo automaticamente.
Chamadas repetidas do mesmo idioma compartilham a mesma promessa, então não existe requisição
duplicada.

## Formatadores

Todos usam o idioma atual e são reativos.

```html
<span>{ $n(1234.5) }</span>                 <!-- 1.234,5 -->
<span>{ $n(0.75, { style: 'percent' }) }</span>
<span>{ $c(1234.5) }</span>                 <!-- R$ 1.234,50 -->
<span>{ $c(99, 'USD') }</span>              <!-- US$ 99,00 -->
<span>{ $d(pedido.criadoEm) }</span>        <!-- 28/08/2026 -->
<span>{ $d(pedido.criadoEm, 'long') }</span>
<span>{ $rt(pedido.criadoEm) }</span>       <!-- há 5 minutos -->
```

Presets de `$d`: `short`, `long`, `full`, `time`, `datetime`. Você também pode passar um objeto de
`Intl.DateTimeFormatOptions` ou uma máscara textual como `DD/MM/YYYY HH:mm`.

## Magias

| Magia | O que é |
| --- | --- |
| `$t` | Traduz |
| `$locale` | Idioma ativo, reativo |
| `$i18n` | O módulo inteiro |
| `$n` | Formata número |
| `$c` | Formata moeda |
| `$d` | Formata data |
| `$rt` | Tempo relativo |

```html
<p>Você está lendo em { $locale }</p>
<div :lang="$locale">...</div>
```

O atributo `lang` do elemento raiz já é atualizado sozinho a cada troca de idioma.

## API completa

```js
V.t('comum.salvar');
V.t('ola', { nome: 'Ana' });
V.setLocale('en');
V.getLocale();

V.i18n.te('comum.salvar');        // a chave existe?
V.i18n.messagesOf('pt-BR');
V.i18n.addMessages('fr', { ... });
V.i18n.loadMessages('fr', '/i18n/fr.json');
V.i18n.detectLocale();
V.i18n.locale;
V.i18n.fallback;
V.i18n.locales;
```

## Um exemplo completo

```html
<div v-data="{ carrinho: [] }">
  <header>
    <button v-locale="pt-BR">PT</button>
    <button v-locale="en">EN</button>
    <button v-locale="es">ES</button>
  </header>

  <h1 v-t="loja.titulo"></h1>
  <p>{ $t('carrinho.itens', carrinho.length) }</p>
  <p>{ $c(total) }</p>

  <button v-t="comum.finalizar" v-click="finalizar()"></button>
</div>
```

```js
V.i18n({
  locale: 'pt-BR',
  fallback: 'en',
  loadPath: '/i18n/{locale}.json',
  messages: {
    'pt-BR': {
      loja: { titulo: 'Nossa loja' },
      carrinho: { itens: 'carrinho vazio | {n} item no carrinho | {n} itens no carrinho' },
      comum: { finalizar: 'Finalizar compra' },
    },
  },
});
```

---

Anterior: [Roteador](roteador.md) · Próximo: [Tema e paleta](tema-e-paleta.md)
