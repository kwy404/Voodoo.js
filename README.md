<div align="center">

<img src="brand/logo/voodoo-logo.svg#gh-light-mode-only" alt="Voodoo.js" width="380">
<img src="brand/logo/voodoo-logo-dark.svg#gh-dark-mode-only" alt="Voodoo.js" width="380">

### JavaScript feels like magic.

**O micro framework que faz quase tudo direto pelo HTML.**
Reatividade de verdade, componentes, requisições, formulários, gráficos e interface,
em uma tag `<script>`. Sem build, sem instalação, sem configuração.

[![download](https://img.shields.io/badge/download-voodoo.min.js-6D3BF5)](https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.min.js)
[![gzip](https://img.shields.io/badge/gzip-41%20a%20122%20KB-2ED9A5)](#tamanho-real)
[![dependencias](https://img.shields.io/badge/depend%C3%AAncias-0-9B7BFF)](#zero-dependencias)
[![testes](https://img.shields.io/badge/testes-223%20passando-2ED9A5)](#testes)
[![TypeScript](https://img.shields.io/badge/TypeScript-completo-3178C6)](#typescript)
[![release](https://img.shields.io/badge/release-v0.1.0-6D3BF5)](https://github.com/kwy404/Voodoo.js/releases/tag/v0.1.0)
[![licenca](https://img.shields.io/badge/licen%C3%A7a-MIT-FFB35C)](LICENSE)

<img src="brand/mascot/vudu-wave.svg" alt="Vudu, o mascote da Voodoo.js" width="140">

[Comece aqui](#instalação) · [Guia completo](#índice) · [Referência](#referência-de-directives) · [Demos](examples/)

</div>

---

> **Voodoo.js in one line:** a zero dependency, no build step, single file JavaScript micro framework that turns plain HTML into a reactive application through `v-*` attributes. Download one file, add one script tag, done. A modern alternative to jQuery, a lighter alternative to Vue and React, and a batteries included alternative to Alpine.js and HTMX.

## O gancho

Este arquivo HTML funciona. Não tem build, não tem instalação, não tem passo de configuração.

```html
<!doctype html>
<script src="voodoo.min.js" defer></script>

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
Só uma tag `<script>`
com o arquivo baixado.

</td>
</tr>
</table>

## Índice

**Comece por aqui**

- [Por que a Voodoo existe](#por-que-a-voodoo-existe)
- [Instalação](#instalação)
- [Seu primeiro arquivo](#seu-primeiro-arquivo)

**O guia, do começo ao fim**

- [Guardando informação](#guardando-informação)
- [Mostrando na tela](#mostrando-na-tela)
- [Escondendo e mostrando](#escondendo-e-mostrando)
- [Repetindo coisas](#repetindo-coisas)
- [Reagindo ao clique](#reagindo-ao-clique)
- [Ligando campos de formulário](#ligando-campos-de-formulário)
- [Mudando atributos, classes e estilos](#mudando-atributos-classes-e-estilos)
- [Pegando o elemento e rodando código na hora certa](#pegando-o-elemento-e-rodando-código-na-hora-certa)
- [Falando com um servidor](#falando-com-um-servidor)
- [Um formulário que valida e envia sozinho](#um-formulário-que-valida-e-envia-sozinho)
- [Reaproveitando pedaços com componentes](#reaproveitando-pedaços-com-componentes)
- [Componentes prontos](#componentes-prontos)
- [Compartilhando estado entre partes da página](#compartilhando-estado-entre-partes-da-página)
- [Coisas que só a Voodoo faz](#coisas-que-só-a-voodoo-faz)
- [Enfeitando com animação e gráficos](#enfeitando-com-animação-e-gráficos)
- [Dando retorno sonoro](#dando-retorno-sonoro)
- [Quando a página cresce](#quando-a-página-cresce)
- [Ajustando tudo pela própria tag](#ajustando-tudo-pela-própria-tag)

**Para consultar depois**

- [Referência de directives](#referência-de-directives)
- [Variáveis mágicas](#variáveis-mágicas)
- [API do objeto V](#api-do-objeto-v)
- [O que a expressão aceita](#o-que-a-expressão-aceita)
- [Comparativo honesto](#comparativo-honesto)
- [Quando não usar a Voodoo](#quando-não-usar-a-voodoo)
- [Migrando](#migrando)
- [Segurança](#segurança)
- [Tamanho real](#tamanho-real)
- [Demos](#demos)
- [Roadmap](#roadmap)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Por que a Voodoo existe

**O problema.** Você quer uma página dinâmica: uma lista que filtra, um formulário que valida
e envia por AJAX, um modal, um aviso de sucesso. Com jQuery isso vira um monte de listener e
manipulação manual do DOM. Com Vue ou React isso vira um passo de build, um bundler e uma
pasta de dependências com centenas de megabytes. Para uma página. Que já é HTML.

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
| Aviso de sucesso | `<button @click="$toast.success('Salvo!')">` |
| Som no clique | `<button v-sound="click">` |
| Gráfico de linha | `<div v-chart="{ type: 'line', data: vendas }">` |
| Estado que sobrevive ao F5 | `<div v-data="{...}" v-persist="rascunho">` |

Em destaque:

- <a id="zero-dependencias"></a>**Zero dependências.** Nada de React, Vue, lodash, jQuery ou Axios por baixo. Só APIs do navegador.
- **Sem passo de build.** Uma tag `<script>` e acabou. Nada para instalar, nada para compilar, nada para configurar.
- **Sem `eval` e sem `new Function`.** A Voodoo tem um analisador de expressões próprio, então funciona com Content Security Policy restritiva, sem `unsafe-eval`.
- **HTML limpo no final.** Depois de processados, os atributos `v-*` saem do DOM. O inspetor do navegador mostra HTML normal, sem sujeira de framework.
- **Atualizações granulares.** Rastreamento de dependência por chave. Mudou `count`, só quem leu `count` é reexecutado.
- <a id="typescript"></a>**TypeScript completo**, com autocompletar em todo o objeto `V`.
- <a id="testes"></a>**223 testes automatizados** cobrindo reatividade, analisador, DOM, componentes, HTTP, som e utilitários.

## Instalação

A Voodoo.js é um arquivo pronto. Você baixa, coloca junto do seu HTML, e acabou.

### 1. Escolha e baixe o arquivo

| Arquivo | O que vem dentro | Gzip | Download |
| --- | --- | --- | --- |
| **voodoo.core.min.js** | Reatividade, expressões, componentes, DOM encadeável, directives de estado, renderização, eventos e requisições por atributo | **41 KB** | [baixar](https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.core.min.js) |
| **voodoo.min.js** | O anterior, mais formulários com validação, máscaras, interface completa, arrastar e soltar, diálogos, avisos e som | **78 KB** | [baixar](https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.min.js) |
| **voodoo.full.min.js** | Tudo, mais gráficos, animações com física, roteador, idiomas, inspetor de reatividade e 29 componentes prontos | **122 KB** | [baixar](https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.full.min.js) |

Na dúvida, comece pelo **voodoo.min.js**. Ele cobre a maioria das páginas.
Troque pelo completo quando precisar de gráfico, animação, roteador ou dos componentes prontos.

Pelo terminal:

```bash
curl -L -o voodoo.min.js https://github.com/kwy404/Voodoo.js/raw/main/packages/voodoojs/dist/voodoo.min.js
```

Ou baixe o repositório inteiro pelo botão **Code**, ou pela
[release v0.1.0](https://github.com/kwy404/Voodoo.js/releases/tag/v0.1.0), e pegue os arquivos
de `packages/voodoojs/dist/`.

### 2. Aponte uma tag para o arquivo

```html
<script src="voodoo.min.js" defer></script>
```

Acabou. Não existe `V.init()` para chamar: a biblioteca começa sozinha assim que a página
fica pronta, e publica o objeto global `V`.

### 3. Escreva HTML

```html
<div v-data="{ n: 0 }">
  <button @click="n++">Clicou { n } vezes</button>
</div>
```

Abra o arquivo no navegador. Clique. O número muda.

## Seu primeiro arquivo

Vamos do HTML vazio até algo funcionando, explicando cada linha.

Crie um arquivo `index.html` ao lado do `voodoo.min.js` que você baixou:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Meu primeiro Voodoo</title>
  <script src="voodoo.min.js" defer></script>
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

Linha por linha:

1. `<script src="voodoo.min.js" defer>` carrega a biblioteca. O `defer` faz o navegador
   esperar o HTML terminar antes de executar.
2. `v-data="{ nome: '', count: 0 }"` cria um **escopo**: duas variáveis que valem para
   aquele `<div>` e para tudo que estiver dentro dele.
3. `v-model="nome"` liga o campo à variável `nome` nos dois sentidos. Digitou, mudou a variável.
4. `{ nome || 'estranho' }` é **interpolação**: escreve o valor no texto e se atualiza sozinho.
5. `@click="count++"` executa a expressão no clique e avisa quem depende de `count`.
6. `v-show="count > 5"` mostra o parágrafo apenas quando a condição é verdadeira.

**O que observar:** você não escreveu uma linha de JavaScript solto. Não existe `querySelector`,
não existe `addEventListener`, não existe uma função de renderizar. O HTML descreve o que deve
acontecer, e a Voodoo faz.

Abra o inspetor do navegador depois de carregar a página. Os atributos `v-model`, `@click` e
`v-show` sumiram. Sobrou HTML limpo.

## Guardando informação

**O problema.** Toda página interativa precisa lembrar de alguma coisa: se o menu está aberto,
o que foi digitado, quais itens estão na lista.

Na Voodoo isso mora em um `v-data`.

```html
<div v-data="{ aberto: false, itens: ['pão', 'leite'] }">
  <button @click="aberto = !aberto">Alternar menu</button>
  <p v-show="aberto">{ itens.length } itens na lista</p>
</div>
```

Cada `v-data` cria um **escopo**. Elementos filhos enxergam as variáveis do pai, e você pode
aninhar quantos quiser.

```html
<div v-data="{ tema: 'escuro' }">
  <div v-data="{ aberto: false }">
    <!-- este botão enxerga tema e aberto -->
    <button @click="aberto = !aberto">Tema atual: { tema }</button>
  </div>
</div>
```

Duas regras que evitam surpresa:

- **A leitura sobe a cadeia.** A Voodoo procura a variável no `v-data` mais próximo, depois nos
  ancestrais, depois na raiz.
- **A escrita vai para quem já tem a chave.** Escrever em `tema` de dentro do `v-data` interno
  altera o `tema` do `v-data` externo, não uma cópia. Uma chave que não existe em lugar nenhum
  é criada no escopo local.

**O que é reativo.** Tudo que está dentro de um `v-data` vira um objeto observado. Trocar um
valor, empurrar um item em uma lista, apagar uma chave: qualquer uma dessas coisas reexecuta
apenas os pedaços da página que leram aquele valor.

```html
<div v-data="{ carrinho: [] }">
  <button @click="carrinho.push({ nome: 'Caneca', preco: 39 })">Adicionar</button>
  <p>{ carrinho.length } itens</p>
</div>
```

**O que observar:** o `<p>` se atualiza porque leu `carrinho.length`. Um outro parágrafo que
não leia nada de `carrinho` nem é visitado.

## Mostrando na tela

**O problema.** Você tem o valor no estado. Falta colocá-lo na página.

### Interpolação

A forma mais curta é escrever a expressão entre chaves, direto no texto:

```html
<div v-data="{ usuario: { nome: 'Ana' }, total: 1234.5 }">
  <p>Bem-vinda, { usuario.nome }.</p>
  <p>Total: { total.toFixed(2) }</p>
  <p>{ total > 1000 ? 'Compra grande' : 'Compra normal' }</p>
</div>
```

A Voodoo usa **chave simples**: `{ variavel }`. A forma dupla `{{ variavel }}`, do Vue, também
funciona, para quem já tem o costume.

A interpolação é ignorada dentro de `<pre>`, `<code>`, `<script>`, `<style>` e `<textarea>`.
Assim você pode mostrar exemplos de código na página sem que a biblioteca tente avaliar as chaves.

### v-text

Quando você quer o texto inteiro do elemento vindo do estado, `v-text` é mais direto:

```html
<span v-text="usuario.nome"></span>
<span v-text="'Total: ' + total"></span>
```

`v-text` escreve **texto**. Se o valor tiver `<b>` dentro, aparece a palavra `<b>`, não um negrito.

### v-html

Quando o valor é HTML de verdade e você confia nele:

```html
<div v-html="conteudoDoEditor"></div>
```

O HTML inserido é percorrido pela Voodoo, então ele pode trazer directives dentro.
Isso é poderoso e perigoso ao mesmo tempo: nunca coloque conteúdo escrito por outra pessoa
em um `v-html` sem limpar antes.

**O que observar:** interpolação e `v-text` escapam o HTML sozinhos. `v-html` não escapa nada.
Essa é a única diferença que importa entre os três.

## Escondendo e mostrando

**O problema.** Um trecho da página só deve aparecer em certas situações.

Existem dois caminhos, e a escolha entre eles muda o desempenho.

### v-show alterna o CSS

```html
<div v-data="{ aberto: false }">
  <button @click="aberto = !aberto">Detalhes</button>
  <div v-show="aberto">Este bloco continua no DOM o tempo todo.</div>
</div>
```

`v-show` só mexe no `display`. O elemento nunca sai do documento.

### v-if insere e remove

```html
<div v-data="{ nota: 7 }">
  <p v-if="nota >= 9">Ótimo</p>
  <p v-else-if="nota >= 6">Bom</p>
  <p v-else>Precisa melhorar</p>
</div>
```

`v-if` cria e destrói o elemento de verdade. `v-else-if` e `v-else` precisam ser **irmãos
imediatos** do `v-if`, sem nada no meio.

Para condicionar um grupo de elementos sem inventar uma `<div>`, use `<template>`:

```html
<template v-if="carregado">
  <h2>Título</h2>
  <p>Texto</p>
</template>
```

### Qual usar

| Situação | Use |
| --- | --- |
| Alterna muitas vezes, como um acordeão | `v-show` |
| Quase nunca aparece, ou é pesado | `v-if` |
| Precisa desmontar o que está dentro | `v-if` |
| Precisa manter o estado do que está dentro | `v-show` |

**O que observar:** com `v-if`, um `<input>` escondido perde o que foi digitado, porque o
elemento deixou de existir. Com `v-show`, ele lembra.

## Repetindo coisas

**O problema.** Você tem uma lista e quer um elemento para cada item.

```html
<div v-data="{ produtos: [{ id: 1, nome: 'Caneca' }, { id: 2, nome: 'Camiseta' }] }">
  <ul>
    <li v-for="p in produtos" :key="p.id">{ p.nome }</li>
  </ul>
</div>
```

`v-for` aceita mais do que arrays:

```html
<li v-for="(usuario, i) in usuarios" :key="usuario.id">{ i }: { usuario.nome }</li>
<li v-for="(valor, chave) in configuracoes">{ chave } = { valor }</li>
<li v-for="n in 5">Item { n }</li>
<li v-for="letra in 'abc'">{ letra }</li>

<template v-for="p in produtos" :key="p.id">
  <dt>{ p.nome }</dt>
  <dd>{ p.preco }</dd>
</template>
```

Arrays, números, textos, objetos, `Map` e `Set` funcionam. `in` e `of` são equivalentes.

### Por que a chave importa

`:key` diz à Voodoo como reconhecer o mesmo item entre duas atualizações.

```html
<li v-for="tarefa in tarefas" :key="tarefa.id">
  <input v-model="tarefa.texto">
</li>
```

Sem chave, reordenar ou filtrar a lista recria os elementos. O campo perde o foco, o texto em
edição some, a rolagem pula. Com chave, os elementos são reaproveitados e movidos de lugar.

**Regra prática:** sempre que a lista puder ser reordenada, filtrada ou ter itens removidos do
meio, coloque `:key`.

Uma limitação para saber desde já: `v-for` e `v-if` **não funcionam no mesmo elemento**, porque
os dois assumem o controle daquele nó. Coloque o `v-if` em um filho.

```html
<div v-for="n in lista">
  <span v-if="n % 2 === 0">{ n }</span>
</div>
```

## Reagindo ao clique

**O problema.** O usuário clica, digita, envia. Alguma coisa precisa acontecer.

```html
<div v-data="{ n: 0 }">
  <button @click="n++">Somar</button>
  <button v-on:click="n = 0">Zerar</button>
  <button v-click="n--">Subtrair</button>
</div>
```

As três escritas fazem a mesma coisa. `@evento` é a mais curta, `v-on:evento` é a completa, e
`v-click`, `v-input`, `v-keyup` e outros atalhos existem para quem prefere um nome único por linha.

### Modificadores

Depois do nome do evento, um ponto liga comportamentos comuns:

```html
<form @submit.prevent="salvar()">Não recarrega a página</form>
<div class="overlay" @click.self="fechar()">Só o clique no próprio overlay conta</div>
<button @click.once="comecar()">Roda uma vez e desliga</button>
<div @keydown.escape.window="fechar()">Escuta no window inteiro</div>
<div @click.outside="fecharMenu()">Clique em qualquer lugar fora daqui</div>
```

Os modificadores disponíveis: `.prevent`, `.stop`, `.self`, `.once`, `.capture`, `.passive`,
`.window`, `.document`, `.outside`, `.debounce` e `.throttle`.

### Teclas

```html
<input @keyup.enter="buscar()">
<input @keydown.esc="limpar()">
<input @keydown.ctrl.enter="enviar()">
<div @keydown.meta.k.window.prevent="abrirBusca()"></div>
```

Nomes aceitos: `.enter`, `.esc` ou `.escape`, `.space`, `.tab`, `.delete`, `.backspace`,
`.up`, `.down`, `.left`, `.right`, qualquer letra de `.a` a `.z` e qualquer dígito de `.0` a `.9`.
As teclas de sistema são `.ctrl`, `.shift`, `.alt` e `.meta`.

### Eventos que o navegador não tem

A Voodoo inventa alguns que aparecem o tempo todo em interface:

```html
<button @hold.2s="apagarTudo()">Segure dois segundos para apagar</button>
<div @visible="carregarMais()">Dispara quando entra na área visível</div>
<div @swipeleft="proximo()" @swiperight="anterior()">Gestos de arrastar</div>
<button v-hotkey="ctrl+k" @click="abrirPaleta()">Atalho global de teclado</button>
```

E alguns apelidos mais legíveis: `@hover` para `mouseenter`, `@unhover` para `mouseleave`,
`@tap` para `click`, `@press` para `pointerdown`, `@release` para `pointerup`,
`@rightclick` para `contextmenu`, `@type` para `input`.

### Dentro do handler

Três variáveis estão sempre disponíveis na expressão do evento:

```html
<input @input="busca = $event.target.value">
<button @click="$el.classList.add('clicado')">Uso o próprio elemento</button>
<section @filtro="aplicar($detail)">Recebo o detalhe de um evento customizado</section>
```

`$event` é o evento, `$el` é o elemento e `$detail` é o `detail` de um `CustomEvent`.

**O que observar:** todo ouvinte instalado por uma directive é removido sozinho quando o
elemento sai do DOM, inclusive os que foram registrados em `window` ou `document`.

## Ligando campos de formulário

**O problema.** Um campo precisa refletir o estado, e o estado precisa refletir o campo.

`v-model` faz os dois sentidos de uma vez:

```html
<div v-data="{ nome: '', aceito: false, uf: 'SP', tags: [] }">
  <input v-model="nome">
  <textarea v-model="bio"></textarea>

  <input type="checkbox" v-model="aceito">

  <select v-model="uf">
    <option>SP</option>
    <option>RJ</option>
  </select>

  <input type="checkbox" value="js" v-model="tags">
  <input type="checkbox" value="css" v-model="tags">

  <input type="radio" value="pix" v-model="pagamento">
</div>
```

O que chega ao estado depende do tipo do campo:

| Campo | Valor no estado |
| --- | --- |
| texto, textarea | texto |
| `number`, `range` | número, convertido sozinho |
| checkbox sozinho | verdadeiro ou falso |
| checkbox ligado a uma lista | a lista com os `value` marcados |
| radio | o `value` do escolhido |
| select simples | texto |
| select múltiplo | lista de textos |
| `file` | a `FileList`, ou o primeiro arquivo com `.single` |

Modificadores ajustam a conversão:

```html
<input v-model.number="idade">
<input v-model.trim="email">
<input v-model.lazy="bio">
<input v-model.debounce="busca" v-debounce="600">
<input type="file" v-model.single="foto">
```

`.number` converte para número, `.trim` remove os espaços das pontas, `.lazy` só escreve no
`change` em vez de a cada tecla, e `.debounce` espera o usuário parar de digitar. O tempo da
espera vem do atributo `v-debounce`.

**O que observar:** `v-model` funciona em qualquer expressão atribuível, não só em uma variável
solta. `v-model="form.endereco.cidade"` escreve no lugar certo do objeto.

## Mudando atributos, classes e estilos

**O problema.** Não é só o texto que muda. O `href`, o `src`, o `disabled`, a classe e a cor
também precisam acompanhar o estado.

Um dois pontos na frente do nome liga **qualquer atributo de qualquer tag** ao estado.

```html
<img :src="foto" :alt="descricao" :width="largura">
<a :href="'/produto/' + id" :target="novaAba ? '_blank' : '_self'">Ver</a>
<input :placeholder="'Buscar entre ' + produtos.length + ' itens'">
<div :aria-label="rotulo" :data-estado="situacao" :title="dica"></div>
<circle :r="raio" :fill="cor"></circle>
<minha-tag :dado="valor"></minha-tag>
```

Vale para atributos comuns, de acessibilidade, de dados, de SVG e de tags próprias.

### Atributos que são ligados ou desligados

```html
<button :disabled="carregando">Salvar</button>
<input :readonly="travado">
<details :open="aberto"></details>
```

Quando o valor é falso, o atributo **some do HTML** em vez de virar a palavra `false`.
A Voodoo trata assim `disabled`, `checked`, `readonly`, `required`, `selected`, `hidden`,
`open`, `multiple`, `autofocus`, `novalidate` e `inert`.

### Classes

```html
<div class="card" :class="{ ativo: selecionado, erro: temErro }"></div>
<div :class="['base', tema, { grande: expandido }]"></div>
```

As classes que já estavam escritas no `class` são sempre preservadas. O `:class` só acrescenta
e remove as que ele mesmo controla.

### Estilos

```html
<div :style="{ color: cor, width: largura + 'px' }"></div>
<div :style="'width: ' + largura + 'px'"></div>
<div :style="{ '--v-primary': corDaMarca }"></div>
```

Nomes em camelCase viram traço, e propriedades customizadas passam intactas.

### Vários de uma vez, e propriedades

```html
<input v-bind="{ placeholder: 'Nome', maxlength: '10', required: true }">
<video .currentTime="segundos"></video>
```

`v-bind` sem argumento aplica um objeto inteiro. O ponto na frente do nome escreve na
propriedade do elemento em vez do atributo, útil para coisas como `currentTime` e `value`.

**O que observar:** depois que a página monta, esses atributos saem do HTML. Isso significa que
você nunca deve escrever CSS apoiado em seletores como `[v-show]`. Use classes.

## Pegando o elemento e rodando código na hora certa

**O problema.** Às vezes você precisa do elemento em si, ou precisa rodar algo assim que a
página monta.

```html
<div v-data="{ dados: null }" v-init="carregar()">
  <input v-ref="busca">
  <button @click="$refs.busca.focus()">Focar o campo</button>
</div>
```

- `v-ref="busca"` guarda o elemento em `$refs.busca`.
- `v-init` executa a expressão depois que o DOM daquela rodada já foi aplicado.

Para reagir a mudanças sem escrever no HTML:

```html
<div v-effect="document.title = 'Carrinho (' + itens.length + ')'"></div>
<input v-model="busca" v-watch="buscar($value)">
```

`v-effect` roda de novo sempre que alguma dependência que ele leu mudar. `v-watch` observa o
`v-model` do mesmo elemento e entrega `$value` e `$old`.

E quando um elemento precisa aparecer fora do lugar onde foi escrito:

```html
<div v-teleport="body">Este bloco vai para o final do body</div>
<div v-teleport="#area-de-modais">Este vai para um container específico</div>
```

O elemento muda de lugar no documento, mas continua enxergando o escopo de onde veio.

**O que observar:** `v-cloak` esconde um trecho até a Voodoo assumir, o que evita ver as chaves
cruas por um instante em páginas grandes.

```html
<style>[v-cloak] { display: none !important; }</style>
<div v-cloak v-data="{ pronto: true }">...</div>
```

## Falando com um servidor

**O problema.** Buscar dados, enviar um formulário, excluir um registro. Normalmente isso vira
`fetch`, `then`, montagem manual de HTML e tratamento de erro repetido em toda tela.

Na Voodoo é um atributo.

```html
<button v-get="/api/usuarios" v-target="#lista">Carregar</button>

<div id="lista"></div>
```

Existem cinco verbos: `v-get`, `v-post`, `v-put`, `v-patch` e `v-delete`.
Cada elemento tem um gatilho natural: um `<form>` dispara no `submit`, um campo dispara no
`change`, e todo o resto dispara no `click`.

A URL pode ser fixa ou uma expressão:

```html
<button v-delete="'/api/usuarios/' + u.id"
        v-confirm="Excluir usuário?"
        v-toast-success="Usuário excluído!">Excluir</button>
```

### O que acontece com a resposta

Se o servidor devolve HTML, ele entra direto no alvo. Se devolve JSON, a Voodoo transforma em
HTML legível: uma lista de objetos vira tabela, um objeto vira lista de definições, e todos os
valores são escapados.

Se você prefere controlar o formato, aponte um `<template>` da própria página:

```html
<button v-get="/api/usuarios" v-target="#lista" v-template="#linha">Carregar</button>

<template id="linha">
  <li><strong>{ nome }</strong> <small>{ email }</small></li>
</template>

<ul id="lista"></ul>
```

E se você não quer HTML nenhum, só o dado no estado:

```html
<div v-data="{ usuarios: [] }">
  <button v-get="/api/usuarios" v-as="usuarios">Carregar</button>
  <li v-for="u in usuarios" :key="u.id">{ u.nome }</li>
</div>
```

### Onde o resultado é colocado

`v-target` é o seletor do elemento que recebe. Sem ele, o alvo é o próprio elemento.
`v-swap` decide como:

```html
<button v-get="/api/comentarios?pagina=2" v-target="#comentarios" v-swap="append">
  Carregar mais
</button>
```

Modos aceitos: `innerHTML` (o padrão), `outerHTML`, `replace`, `textContent`, `beforebegin`,
`afterbegin`, `beforeend`, `afterend`, `append`, `prepend`, `delete` e `none`.

### Outros gatilhos

```html
<div v-get="/api/status" v-poll="5s" v-target="#status"></div>
<div v-load-visible="/api/comentarios"></div>
<input v-search="/api/produtos" v-param="q" v-target="#resultados" v-debounce="300">
<div v-get="/api/banner" v-trigger="visible"></div>
```

`v-poll` repete em intervalo fixo e pausa quando a aba não está visível.
`v-load-visible` busca quando o elemento chega perto da tela.
`v-search` faz busca enquanto o usuário digita, com `v-param` para o nome do parâmetro e
`v-min-length` para o mínimo de caracteres.

### Carregando, erro, e o que fazer depois

```html
<button v-get="/api/relatorio"
        v-target="#saida"
        v-loading="#spinner"
        v-disable-loading
        v-on-success="$toast.success('Pronto!')"
        v-on-error="console.warn($detail)">
  Gerar
</button>

<div id="spinner">Gerando relatório...</div>
```

Durante a requisição o elemento ganha a classe `v-loading` e o atributo `aria-busy="true"`.
Uma nova requisição do mesmo elemento cancela a anterior que ainda estiver pendente.

### v-resource: dados, carregando e erro em uma linha

Quando você quer o estado da requisição disponível no HTML, e não só o resultado:

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

A sintaxe é `nome: url`. O objeto criado tem `data`, `loading`, `error`, `loaded`, `reload()` e
`set()`. Ele aceita `v-method`, `v-params`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`,
`v-poll` e `v-manual`, que segura a primeira busca até você chamar `reload()`.

### Atributos de apoio

`v-body`, `v-params`, `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-json-path`,
`v-redirect`, `v-scroll-to`, `v-loading-class`, `v-on-complete` e `v-offline-queue`, que guarda
a requisição quando não há rede e reenvia quando a conexão volta.

### O mesmo, em JavaScript

```js
const usuarios = await V.http.get('/api/users', { params: { pagina: 2 }, cache: 60000 });
await V.http.post('/api/users', { nome: 'Ana' });
await V.http.upload('/api/arquivos', formData, { onProgress: (p) => console.log(p) });

V.http.setBaseURL('https://api.exemplo.com');
V.http.setToken('meu-jwt');
V.http.interceptors.response.use((r) => r);
```

**O que observar:** métodos que escrevem levam o token CSRF de `<meta name="csrf-token">` no
cabeçalho `X-CSRF-TOKEN`, sem você configurar nada.

## Um formulário que valida e envia sozinho

**O problema.** Um cadastro comum precisa de validação, mensagem de erro por campo, máscara,
envio por AJAX, aviso de sucesso e tratamento do erro que o servidor devolve. Isso costuma ser
o trecho mais chato de qualquer página.

```html
<form v-submit="/api/usuarios"
      v-method="POST"
      v-validate
      v-toast-success="Usuário cadastrado!"
      v-toast-error="Não foi possível cadastrar."
      v-reset-success
      v-redirect="/usuarios">

  <input name="nome" v-required v-minlength="3">
  <input name="email" type="email" v-required v-email>
  <input name="cpf" v-mask="cpf" v-cpf>
  <input name="telefone" v-mask="phone" v-phone>
  <input name="senha" type="password" v-strong-password>
  <input name="senha2" type="password" v-match="senha">

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Enviando...' : 'Salvar' }
  </button>
</form>
```

Sem uma linha de JavaScript: valida, mostra o erro embaixo de cada campo, envia por AJAX,
mostra o aviso, limpa o formulário e redireciona.

### O estado do formulário

Todo formulário com `v-submit` publica a variável `$form` para o que estiver dentro dele:

```html
<form v-submit="/api/contato">
  <input name="email" v-required v-email>

  <p v-show="$form.errors.email">{ $form.errors.email }</p>
  <p v-show="$form.success">{ $form.message || 'Recebemos sua mensagem.' }</p>

  <button :disabled="$form.loading">Enviar</button>
</form>
```

`$form` tem `loading`, `saving`, `success`, `errors`, `message`, `data`, `status`, `dirty` e
`progress`.

### Erros vindos do servidor

Uma resposta `422`, ou qualquer resposta com um mapa de erros, é distribuída de volta para os
campos certos. Os três formatos abaixo são entendidos:

```json
{ "errors": { "email": "Já cadastrado" } }
{ "email": ["Já cadastrado"] }
{ "message": "Dados inválidos", "errors": { "cpf": "Inválido" } }
```

Mensagens sem campo correspondente viram um resumo no topo. O foco vai para o primeiro campo
com problema.

### As regras disponíveis

Como atributo curto: `v-required`, `v-email`, `v-url`, `v-number`, `v-integer`, `v-minlength`,
`v-maxlength`, `v-min`, `v-max`, `v-match`, `v-regex`, `v-cpf`, `v-cnpj`, `v-cep`, `v-phone`,
`v-date`, `v-accepted` e `v-strong-password`.

Na forma longa `v-validate-<nome>`, todas as anteriores mais `decimal`, `alpha`,
`alphanumeric`, `between`, `same`, `different`, `in`, `notin`, `after`, `before`, `creditcard`
e `unique`, que é assíncrona e consulta uma URL.

```html
<input v-validate-between="10,100">
<input v-date v-validate-before="hoje">
<input name="email" v-validate-unique="/api/checar-email">
```

CPF e CNPJ conferem os dígitos verificadores de verdade, e cartão passa por Luhn.

### Mensagem própria e regra própria

```html
<input v-cpf v-error-message="Este CPF não confere.">
<input v-required v-error-target="#erro-do-nome">
```

```js
V.validator('par', (valor) => Number(valor) % 2 === 0, 'Informe um número par.');
```

```html
<input v-validate-par>
```

Registrar uma regra cria automaticamente a directive `v-validate-par`.

### Máscaras

```html
<input v-mask="cpf">
<input v-mask="(99) 99999-9999">
<input v-mask.unmask="cpf" v-model="form.cpf">
<input v-mask-currency>
```

Nomes prontos: `cpf`, `cnpj`, `cpfcnpj`, `cep`, `phone`, `date`, `time`, `datetime`,
`currency`, `percent`, `card`, `cvv`, `plate`, `hex` e `ip`. Um padrão próprio usa `9` para
dígito, `A` para letra, `S` para letra ou dígito e `*` para qualquer caractere.

O modificador `.unmask` manda o valor limpo para o estado, o que é o que o servidor costuma
querer receber.

### Arquivos, rascunho automático e proteção contra sair

```html
<input type="file" name="anexo" v-upload="/api/upload" v-progress="#barra">

<div v-dropzone="/api/upload" v-field="anexos" accept="image/*" multiple>
  Arraste imagens aqui
</div>

<form v-autosave="/api/rascunhos/7" v-method="PUT" v-guard="Você tem alterações não salvas.">
  <textarea name="corpo"></textarea>
</form>
```

**O que observar:** `v-validate` desliga a validação nativa do navegador e assume o controle.
O campo reprovado ganha a classe `v-invalid` e `aria-invalid="true"`, e a mensagem entra logo
depois dele com `role="alert"`.

## Reaproveitando pedaços com componentes

**O problema.** O mesmo cartão aparece em cinco lugares da página. Copiar e colar HTML não
escala.

Registre uma vez, use como tag.

```js
V.component('cartao-usuario', {
  props: {
    nome: { type: 'string', default: 'sem nome' },
    idade: { type: 'number', default: 0 }
  },
  state(props) {
    return { curtidas: 0 };
  },
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
      <button @click="curtir()">Curtir ({ curtidas })</button>
    </article>
  `
});
```

```html
<CartaoUsuario nome="Ana" :idade="idadeDaAna" @curtido="registrar($detail)">
  <p>Este conteúdo entra no slot.</p>
</CartaoUsuario>

<!-- as três formas funcionam -->
<cartao-usuario nome="Bia"></cartao-usuario>
<div v-component="cartao-usuario" nome="Cris"></div>
```

### Props

Props estáticas vêm por atributo, props dinâmicas por `:prop`. Os tipos aceitos são `string`,
`number`, `boolean`, `array`, `object` e `any`, e o valor do atributo é convertido sozinho.

```html
<cartao titulo="Faturamento" total="1200" ativo></cartao>
<cartao :titulo="painel.nome" :total="painel.receita" :ativo="painel.ligado"></cartao>
```

`user-name`, `username` e `userName` chegam todos como `userName`.

Para a forma curta, quando você não se importa com tipo:

```js
V.component('saudacao', {
  props: ['nome', 'idade'],
  template: '<p>{ nome } tem { idade } anos</p>'
});
```

### Slots

```js
V.component('painel', {
  template: `
    <section>
      <header><slot name="cabecalho"><h3>Sem título</h3></slot></header>
      <div><slot></slot></div>
      <footer><slot name="rodape"></slot></footer>
    </section>
  `
});
```

```html
<painel>
  <h3 slot="cabecalho">Relatório</h3>
  <p>Este parágrafo cai no slot padrão.</p>
  <button slot="rodape">Fechar</button>
</painel>
```

O conteúdo escrito dentro de um `<slot>` no template é o valor padrão, usado quando ninguém
preenche. O conteúdo do slot é avaliado no escopo de quem escreveu a tag, não no do componente.

### Eventos

```js
methods: {
  confirmar() { this.emit('confirmado', { id: this.id }); }
}
```

```html
<dialogo @confirmado="registrar($detail)"></dialogo>
```

### Ciclo de vida e instância

Os ganchos são `beforeMount`, `mounted`, `updated`, `beforeUnmount` e `unmounted`.
Dentro dos métodos, `this` tem `$el`, `$props`, `$refs`, `$scope`, `$parent`, `$name`,
`emit()`, `$watch()` e `$nextTick()`.

```js
V.component('relogio', {
  state: () => ({ agora: new Date() }),
  mounted() {
    this.timer = setInterval(() => { this.agora = new Date(); }, 1000);
  },
  beforeUnmount() { clearInterval(this.timer); },
  template: '<time>{ agora.toLocaleTimeString() }</time>'
});
```

**O que observar:** por padrão um componente **não** enxerga o `v-data` que o envolve. Isso é
proposital, para o componente não depender de onde foi colocado. Quando você quer o contrário,
declare `inheritScope: true` na definição.

## Componentes prontos

O build completo registra **29 componentes** com aparência própria, acessíveis e alinhados ao
tema. Nenhum deles usa a aparência padrão do navegador.

```html
<VButton variant="primary" size="lg" icon="check">Salvar</VButton>
<VInput label="E-mail" type="email" icon="mail" hint="Nunca compartilhamos" v-model="email">
<VSelect label="Estado" options="estados" searchable clearable v-model="uf">
<VTable columns="nome:Nome, total:Total:right" :rows="pedidos" striped>
<VBadge tone="success">Ativo</VBadge>
<VStat label="Receita" value="R$ 128.400" delta="12.4" icon="chart">
<VAlert tone="warning" title="Atenção" closable>A cobrança vence em três dias.</VAlert>
```

Lista completa: `VButton`, `VIconButton`, `VTooltipButton`, `VCard`, `VDivider`, `VEmptyState`,
`VLabel`, `VField`, `VInput`, `VTextarea`, `VSelect`, `VCheckbox`, `VRadio`, `VSwitch`,
`VRating`, `VBadge`, `VTag`, `VAlert`, `VAvatar`, `VSpinner`, `VSkeleton`, `VProgress`,
`VStat`, `VTable`, `VPagination`, `VBreadcrumb`, `VSteps`, `VTimeline`, `VCodeBlock`.

Cada um aceita as duas escritas, `<VButton>` e `<v-button>`. As props booleanas aceitam o
atributo vazio, o texto `true` e a ligação reativa `:loading="salvando"`.

Eles funcionam dentro de um formulário com `v-submit` sem nenhuma adaptação:

```html
<form v-submit="/api/inscricoes" v-validate v-toast-success="Inscrição enviada!">
  <VInput label="Nome" name="nome" required />
  <VInput label="E-mail" name="email" type="email" required />
  <VSelect label="Plano" name="plano" options="Mensal, Anual" required />
  <VCheckbox name="termos" label="Aceito os termos" required />
  <VButton type="submit" :loading="$form.loading">Enviar</VButton>
</form>
```

A paleta inteira é configurável, e a escala de tons é gerada a partir das suas cores:

```js
V.palette({ primary: '#0F766E', accent: '#F59E0B', radius: '10px' });
```

**O que observar:** nenhuma cor está fixa no CSS dos componentes. Tudo vem das variáveis que
`V.palette()` gera, então trocar a cor da marca troca a interface inteira.

## Compartilhando estado entre partes da página

**O problema.** O carrinho aparece no cabeçalho e na lateral. Os dois precisam do mesmo dado, e
eles não são vizinhos no HTML.

Um `v-data` resolve dentro de um trecho. Para a página inteira, use um store.

```js
V.store('carrinho', {
  itens: [],
  total() {
    return this.itens.reduce((soma, item) => soma + item.preco, 0);
  },
  adicionar(produto) {
    this.itens.push(produto);
  },
  limpar() {
    this.itens = [];
  }
});
```

```html
<span>{ $store.carrinho.itens.length } itens</span>
<span>{ $store.carrinho.total() }</span>
<button @click="$store.carrinho.adicionar(produto)">Adicionar</button>
```

Os métodos recebem `this` apontando para o próprio store. Para valores derivados use um método,
como o `total()` acima, e não uma propriedade com `get`: um getter é resolvido uma vez só, na
criação, e não acompanha as mudanças.

Para o store sobreviver ao recarregar:

```js
V.store('preferencias', { tema: 'system', idioma: 'pt-BR' }, { persist: true });
```

Existe ainda um nível intermediário, o escopo raiz, que vale para a página toda sem virar um
store nomeado:

```js
V.data({ usuario: null, versao: '2.1' });
```

Ele aparece como `$root` em qualquer expressão.

**O que observar:** um store criado depois que a página carregou atualiza quem já estava na
tela esperando por ele. Você não precisa se preocupar com a ordem dos scripts.

## Coisas que só a Voodoo faz

### Estado que sobrevive ao recarregar

```html
<div v-data="{ tema: 'escuro', rascunho: '' }" v-persist="editor">
  <textarea v-model="rascunho"></textarea>
</div>
```

Escreva alguma coisa e aperte F5. O texto continua lá. A chave `editor` vira
`voodoo:persist:editor` no `localStorage`, e só as chaves declaradas no `v-data` são restauradas.

### Estado sincronizado entre abas, ao vivo

```html
<div v-data="{ carrinho: [] }" v-sync="loja">
  <button @click="carrinho.push('item')">Adicionar</button>
  <p>{ carrinho.length } itens</p>
</div>
```

Abra a página em duas abas. Mudou em uma, muda na outra. Usa `BroadcastChannel`, sem servidor
e sem WebSocket.

### Desfazer e refazer de graça

```html
<div v-data="{ texto: '' }" v-history>
  <textarea v-model="texto"></textarea>
  <button v-undo :disabled="!$history.canUndo">Desfazer</button>
  <button v-redo :disabled="!$history.canRedo">Refazer</button>
</div>
```

`v-history` guarda um instantâneo pouco depois de cada mudança. O limite padrão é 50, e
`v-history="200"` aumenta. Escrever depois de desfazer descarta o futuro, como em qualquer editor.

### Raio-x da reatividade

```js
V.xray();
```

Ou aperte `Ctrl + Shift + X` na página.

É um inspetor dentro da própria página, sem extensão. Ele contorna todo elemento com directive,
mostra o escopo e os valores atuais, deixa editar o estado e ver a página reagir na hora, e faz
o elemento piscar quando um valor do qual ele depende muda. Tem abas de estado, componentes,
stores, eventos, rede e desempenho.

### Fila offline

```html
<button v-post="/api/pedidos" v-offline-queue>Enviar</button>
```

Sem conexão, a requisição fica guardada e é reenviada quando a rede voltar.

### Um campo isolado no armazenamento

```html
<textarea v-storage="rascunho-do-comentario"></textarea>
```

Sem `v-data`, sem estado, sem nada. O campo lembra do que foi digitado.

## Enfeitando com animação e gráficos

### Gráficos

Em SVG puro, sem biblioteca externa, reativos e alinhados ao tema:

```html
<div v-data="{ vendas: [12, 19, 8, 25, 30], meses: ['Jan','Fev','Mar','Abr','Mai'] }">
  <div v-chart="{ type: 'line', data: vendas, labels: meses, smooth: true }"></div>
  <div v-chart="{ type: 'donut', data: categorias, showLegend: true }"></div>
</div>
```

Tipos: `line`, `area`, `bar`, `column`, `stacked`, `pie`, `donut`, `sparkline`, `radar`,
`scatter` e `progress`. Mudou o dado no estado, o gráfico se redesenha.

Os dados aceitam quatro formatos: lista de números, lista de `{ label, value }`, lista de
séries `{ name, data }` e lista de `{ x, y }` para dispersão.

Opções úteis: `labels`, `colors`, `height`, `showGrid`, `showLegend`, `showValues`, `smooth`,
`min`, `max`, `format` (`number`, `currency` ou `percent`) e `tooltip`.

### Animações

Com física de mola, no espírito do Framer Motion:

```html
<div v-motion="fadeUp">Entra suave</div>
<div v-motion-scroll="fadeUp">Anima quando entra na tela</div>
<button v-motion-hover="{ scale: 1.05 }" v-motion-tap="{ scale: 0.96 }">Botão vivo</button>
<span v-count="1250" v-count-duration="800">0</span>
<h1 v-typewriter="JavaScript feels like magic."></h1>

<ul v-motion-stagger="60">
  <li v-motion="fadeUp">um</li>
  <li v-motion="fadeUp">dois</li>
</ul>
```

Presets prontos: `fadeIn`, `fadeUp`, `fadeDown`, `scaleIn`, `slideLeft`, `slideRight`, `pop`,
`blurIn` e `flip`. Você também pode escrever a animação na mão:

```html
<div v-motion="{ opacity: [0, 1], y: [24, 0], duration: 400 }"></div>
<div v-motion="{ scale: [0.8, 1], spring: { stiffness: 300, damping: 20 } }"></div>
```

Tudo respeita `prefers-reduced-motion`.

**O que observar:** gráficos e animações só existem no `voodoo.full.min.js`.

## Dando retorno sonoro

**O problema.** A pessoa clica no botão e não sabe se aconteceu alguma coisa. Um toque curto
resolve isso melhor do que qualquer animação. Só que colocar som em uma página costuma virar
uma pasta de arquivos `.mp3`, uma tag `<audio>` para cada um e um monte de download.

Na Voodoo os efeitos são sintetizados na hora, com a Web Audio API. Não existe arquivo para
baixar, não existe pasta de sons, e o módulo inteiro custa cerca de 2 KB.

```html
<button v-sound="click">Salvar</button>
<button v-sound="success" v-post="/api/pedidos">Finalizar</button>
<a v-sound:mouseenter="hover" href="/precos">Preços</a>
<input v-sound:input="type">

<button v-mute>Som</button>
```

Sem argumento, `v-sound` toca no clique. Com argumento, você escolhe o evento, como em
`v-sound:mouseenter`. E `v-mute` dá ao visitante o botão de silenciar, que é a primeira coisa
que ele vai procurar.

São quinze efeitos prontos: `click`, `pop`, `hover`, `success`, `complete`, `error`, `warning`,
`notify`, `type`, `open`, `close`, `deny`, `coin`, `levelup` e `drop`.

Em JavaScript, ou pela variável mágica `$sound`:

```js
V.sound.play('success');
V.sound.play('/audio/ding.mp3');    // também aceita um arquivo
V.sound.note('la', 300);            // nota musical, com oitava opcional: 'la5'
V.sound.melody(['do', 'mi', 'sol'], 140);
V.sound.tone(440, 200);             // frequência em hertz
V.sound.volume(0.4);
V.sound.mute();
V.sound.toggle();
V.sound.define('meuAviso', { volume: 0.5, camadas: [{ frequencia: 700, duracao: 0.1 }] });
```

```html
<button @click="$sound.play('coin')">Resgatar cupom</button>
```

Três cuidados o módulo já toma sozinho:

- O contexto de áudio só nasce no primeiro gesto da pessoa. Navegador nenhum permite antes, e a
  Voodoo não tenta.
- Quem liga a preferência de menos movimento no sistema recebe um volume mais baixo.
- A escolha de volume e de silêncio fica guardada entre as visitas.

**O que observar:** som de interface serve para **confirmar**, não para chamar atenção.
Um `click` de 40 milissegundos passa despercebido e ainda assim faz a interface parecer sólida.
Um som longo em cada ação cansa na terceira vez. Na dúvida, use menos.

O módulo de som vem no `voodoo.min.js` e no `voodoo.full.min.js`.

## Quando a página cresce

### Roteador

Quando a página vira várias telas sem recarregar:

```js
V.router({
  mode: 'history',
  routes: {
    '/': { component: 'home', title: 'Início' },
    '/usuarios': { component: 'usuarios', title: 'Usuários' },
    '/usuarios/:id': { component: 'usuario-detalhe' },
    '/posts/:slug?': { view: '/parciais/post.html' },
    '*': { component: 'nao-encontrado' }
  },
  beforeEach(to, from) {
    if (to.meta.requerLogin && !estaLogado()) return '/login';
    return true;
  }
});
```

```html
<nav>
  <a v-link href="/">Início</a>
  <a v-link href="/usuarios">Usuários</a>
</nav>

<main v-router-view>Carregando...</main>
```

`v-link` transforma qualquer `<a href>` em navegação interna, mantendo o comportamento nativo
em cliques com Ctrl, Command ou Shift, em links externos e em links com `target` ou `download`.
O link ativo ganha uma classe e `aria-current="page"`.

Dentro das expressões você tem `$route`, com `path`, `params`, `query`, `hash`, `name` e `meta`,
e `$router`, com `push`, `replace`, `back`, `forward` e `go`.

```html
<h1>Usuário { $route.params.id }</h1>
<button @click="$router.back()">Voltar</button>
```

### Idiomas

```js
V.i18n({
  locale: 'pt-BR',
  fallback: 'en',
  messages: {
    'pt-BR': { ola: 'Olá, {nome}!', itens: 'nenhum item | {n} item | {n} itens' },
    en: { ola: 'Hello, {nome}!', itens: 'no items | {n} item | {n} items' }
  }
});
```

```html
<button v-t="comum.salvar"></button>
<span>{ $t('ola', { nome: usuario.nome }) }</span>
<span>{ $t('itens', carrinho.length) }</span>

<button v-locale="pt-BR">Português</button>
<button v-locale="en">English</button>
```

Junto vêm os formatadores, que respeitam o idioma ativo:

```html
<span>{ $n(1234.5) }</span>
<span>{ $c(1234.5) }</span>
<span>{ $d(pedido.criadoEm) }</span>
<span>{ $rt(pedido.criadoEm) }</span>
```

**O que observar:** roteador e idiomas só existem no `voodoo.full.min.js`.

## Ajustando tudo pela própria tag

Dá para configurar a biblioteca sem escrever uma linha de JavaScript:

```html
<script src="voodoo.min.js"
        data-prefix="data-v-"
        data-base-url="https://api.exemplo.com"
        data-locale="pt-BR"
        data-devtools
        defer></script>
```

| Atributo | O que faz |
| --- | --- |
| `data-prefix` | Troca `v-` por outro prefixo, útil em HTML validado com rigor |
| `data-base-url` | URL base das requisições feitas por atributo e por `V.http` |
| `data-locale` | Idioma dos formatadores de data, número e moeda |
| `data-devtools` | Liga os avisos detalhados no console e nomeia os comentários âncora |
| `data-no-styles` | Não injeta o CSS dos componentes de interface |
| `data-no-observer` | Desliga o observador que inicializa HTML criado depois |
| `data-keep-attributes` | Mantém os atributos `v-*` no HTML depois de processados |
| `data-manual` | Não começa sozinho. Você chama `V.start()` quando quiser |

Com `data-manual` você configura antes de começar:

```html
<script src="voodoo.min.js" data-manual defer></script>
<script>
  V.config.prefix = 'data-v-';
  V.palette({ primary: '#0F766E' });
  V.start();
</script>
```

A grafia `data-v-nome` sempre é aceita, mesmo quando o prefixo é outro. Isso ajuda quando o
HTML precisa passar por um validador rígido.

---

# Referência

## Referência de directives

São **257 atributos** registrados. Os principais, por categoria.
A lista completa sai com `V.directives` no console do navegador.

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
| `v-component="nome"` | Monta um componente registrado sobre o elemento |

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
| `v-click`, `v-input`, `v-keyup` | Atalhos diretos, um por linha |
| `@hover`, `@tap`, `@press` | Apelidos amigáveis |
| `@hold.2s` | Segurar pressionado por um tempo |
| `@outside` | Clique fora do elemento |
| `@visible` | Entrou na área visível |
| `@swipeleft`, `@swiperight` | Gestos de arrastar |
| `v-hotkey="ctrl+k"` | Atalho global de teclado |

Modificadores: `.prevent`, `.stop`, `.once`, `.self`, `.capture`, `.passive`, `.window`,
`.document`, `.outside`, `.debounce`, `.throttle`, e filtros de tecla como `.enter`, `.esc`,
`.ctrl` e `.shift`.

### Formulário e validação

| Directive | O que faz |
| --- | --- |
| `v-model` | Ligação de dois sentidos, com `.number`, `.trim`, `.lazy`, `.debounce` e `.single` |
| `v-submit="/api/x"` | Envia o formulário por AJAX |
| `v-method="PUT"` | Verbo HTTP do envio |
| `v-validate` | Liga a validação automática dos campos |
| `v-required`, `v-email`, `v-cpf`, ... | Regras de campo |
| `v-validate-<regra>` | Qualquer regra registrada, inclusive as suas |
| `v-error-message`, `v-error-target` | Mensagem e onde mostrar |
| `v-mask="cpf"` | Máscara de digitação, com `.unmask` |
| `v-mask-currency` | Moeda, digitando da direita para a esquerda |
| `v-upload`, `v-dropzone` | Envio de arquivo com barra de progresso |
| `v-autosave` | Salva o rascunho sozinho |
| `v-guard` | Avisa antes de sair com alterações não salvas |
| `v-reset-success`, `v-redirect` | O que fazer depois do sucesso |

### Requisições

| Directive | O que faz |
| --- | --- |
| `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` | Dispara a requisição |
| `v-target`, `v-swap` | Onde e como colocar o resultado |
| `v-trigger`, `v-poll` | Quando disparar |
| `v-body`, `v-params`, `v-headers` | O que enviar |
| `v-as`, `v-json-path`, `v-template` | Como tratar a resposta |
| `v-loading`, `v-loading-class`, `v-disable-loading` | Estado de carregamento |
| `v-on-success`, `v-on-error`, `v-on-complete` | Callbacks |
| `v-confirm`, `v-toast-success`, `v-toast-error` | Pergunta e aviso |
| `v-cache`, `v-retry`, `v-timeout`, `v-offline-queue` | Rede |
| `v-resource="nome: /url"` | Dados, carregando e erro em um objeto |
| `v-search`, `v-param`, `v-min-length`, `v-debounce` | Busca enquanto digita |
| `v-load`, `v-load-visible` | Carrega um pedaço de HTML |

### Ciclo de vida e referências

| Directive | O que faz |
| --- | --- |
| `v-init="carregar()"` | Executa depois que o DOM da rodada foi aplicado |
| `v-ref="campoBusca"` | Guarda o elemento em `$refs` |
| `v-effect="..."` | Executa a expressão sempre que as dependências mudarem |
| `v-watch="acao"` | Reage à mudança do `v-model` do mesmo elemento |

### Estado especial

| Directive | O que faz |
| --- | --- |
| `v-persist="chave"` | O estado sobrevive ao recarregar |
| `v-sync="canal"` | O estado acompanha as outras abas, ao vivo |
| `v-history` | Desfazer e refazer, com `v-undo` e `v-redo` |
| `v-storage="chave"` | Liga um campo direto ao armazenamento local |

### Interface

`v-modal`, `v-modal-content`, `v-modal-close`, `v-drawer`, `v-dropdown`, `v-tooltip`,
`v-popover`, `v-tabs`, `v-accordion`, `v-collapse`, `v-toggle`, `v-command`, `v-sortable`,
`v-draggable`, `v-droppable`, `v-focus-trap`, `v-scrollspy`, `v-sticky`, `v-lazy-src`,
`v-lazy-bg`, `v-skeleton`, `v-copy`, `v-share`, `v-print`, `v-download`, `v-fullscreen`,
`v-resizable`, `v-infinite-scroll`, `v-theme-toggle`, `v-idle`, `v-online`, `v-offline`.

A gaveta lateral leva o painel para o corpo do documento enquanto está aberta, então ela
funciona mesmo quando o `v-drawer` mora dentro de um contêiner com `filter`, `transform` ou
`backdrop-filter`, que quebrariam o posicionamento fixo.

### Som

| Directive | O que faz |
| --- | --- |
| `v-sound="click"` | Toca um efeito no clique |
| `v-sound:mouseenter="hover"` | Escolhe outro evento como gatilho |
| `v-mute` | Botão que liga e desliga o som, com `aria-pressed` |

### Animação, gráficos, rotas e idiomas

Só no `voodoo.full.min.js`: `v-motion`, `v-motion-scroll`, `v-motion-hover`, `v-motion-tap`,
`v-motion-stagger`, `v-parallax`, `v-flip`, `v-count`, `v-typewriter`, `v-chart`,
`v-router-view`, `v-link`, `v-route-active`, `v-t`, `v-t-params`, `v-locale`.

## Variáveis mágicas

São **40**, disponíveis em qualquer expressão sem declarar nada.

```html
<button @click="$toast.success('Salvo!')">Salvar</button>
<div v-show="$screen.mobile">Você está no celular</div>
<div v-show="!$network.online">Você está offline.</div>
<button @click="$refs.busca.focus()">Focar</button>
<button @click="$clipboard.copy('PROMO10')">Copiar cupom</button>
```

**Contexto:** `$el`, `$refs`, `$data`, `$root`, `$parent`, `$self`

**Estado e serviços:** `$store`, `$http`, `$toast`, `$modal`, `$dialog`, `$alert`, `$confirm`,
`$prompt`, `$clipboard`, `$storage`, `$session`, `$cookie`, `$cache`, `$url`, `$theme`,
`$sound`, `$form`, `$history`

**Ambiente:** `$screen`, `$network`, `$device`

**Fluxo:** `$nextTick`, `$watch`, `$dispatch`, `$log`

**Só no build completo:** `$route`, `$router`, `$t`, `$locale`, `$i18n`, `$n`, `$c`, `$d`, `$rt`

Além dessas, existem variáveis locais que aparecem em contextos específicos: `$event` e
`$detail` dentro de um evento, `$value` e `$old` em um `v-watch`, e `$data` e `$response` nos
callbacks de formulário.

## API do objeto V

`V` é ao mesmo tempo uma função e um objeto.

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

// Som
V.sound.play('success')  V.sound.note('la', 300)  V.sound.volume(0.4)  V.sound.toggle()

// Estado
V.store('carrinho', { ... })   V.data({ usuario: null })   V.storage.set('chave', valor)

// Extensao
V.directive('destaque', { mounted(el, b) { el.style.background = b.value } })
V.component('meu-card', { ... })
V.magic('$agora', () => new Date())
V.validator('par', (v) => Number(v) % 2 === 0)
V.use(meuPlugin)

// Tema e aparencia
V.theme.toggle()   V.palette({ primary: '#6D3BF5' })

// Utilitarios
V.debounce(fn, 300)  V.formatCurrency(1234.5)  V.formatDate(d, 'DD/MM/YYYY')
V.relativeTime(d)  V.slugify(s)  V.groupBy(lista, 'tipo')  V.uuid()  V.clone(o)

// Inspecao
V.xray()  V.instances  V.components  V.directives  V.magics  V.stores
```

A reatividade também funciona sozinha, fora do HTML:

```js
const estado = V.reactive({ count: 0, itens: [] });

V.effect(() => console.log(estado.count));   // roda agora e a cada mudanca
const dobro = V.computed(() => estado.count * 2);
V.watch(() => estado.count, (novo, antigo) => console.log(novo, antigo));

estado.count++;
await V.nextTick();  // o DOM ja refletiu
```

## O que a expressão aceita

Dentro dos atributos você escreve um subconjunto de JavaScript, escolhido de propósito.
Funciona: operadores, ternário, template literal, funções de seta de uma linha, encadeamento
opcional, coalescência nula, objetos, listas, chamadas de método e atribuição.

```html
<span>{ produtos.filter(p => p.ativo).length } ativos</span>
<span>{ total > 0 ? `R$ ${total.toFixed(2)}` : 'vazio' }</span>
<span>{ usuario?.endereco?.cidade ?? 'sem cidade' }</span>
```

Não funciona, e isso é intencional: `function`, `class`, `new`, `delete`, `import`, `await`,
`for`, `while`, `try`, `switch`, desestruturação e funções de seta com corpo em bloco.
Quando precisar de algo assim, escreva a função em um `<script>` e coloque no escopo raiz com
`V.data({ minhaFuncao })`.

Identificadores que não existem em nenhum escopo resolvem contra uma lista fechada de globais:

```text
Math  JSON  Date  Number  String  Boolean  Array  Object  Intl  RegExp  Promise
parseInt  parseFloat  isNaN  isFinite  encodeURIComponent  decodeURIComponent  console
```

Tudo fora dessa lista devolve `undefined`. `window`, `document`, `fetch`, `eval`,
`localStorage` e `globalThis` não são alcançáveis a partir de um atributo.

## Comparativo honesto

| | Voodoo.js | Alpine.js | HTMX | Vue 3 | React 19 | jQuery |
| --- | --- | --- | --- | --- | --- | --- |
| Tamanho gzip | 41 a 122 KB | 15 KB | 14 KB | 34 KB | 45 KB | 30 KB |
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

A leitura honesta: Alpine e HTMX são menores porque fazem menos. Vue e React têm ecossistema,
ferramental e comunidade que a Voodoo não tem. A Voodoo entrega, em um arquivo, o conjunto que
normalmente exige juntar cinco bibliotecas.

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
| `$('#a').on('click', fn)` | `<button @click="fn()">` |
| `$('#a').addClass('x')` | `:class="{ x: cond }"` |
| `$('#a').show()` | `v-show="cond"` |
| `$.get(url, cb)` | `<div v-get="url" v-target="#alvo">` |
| `$('form').submit(...)` | `<form v-submit="/api">` |
| `$.each(lista, fn)` | `<li v-for="i in lista">` |

O objeto `V` também é uma coleção encadeável, então `V('#lista .item').addClass('ativo')`
funciona igual ao que você já conhece. A diferença é que na maior parte das vezes você não
precisa mais dela.

### Do Alpine.js

Quase tudo tem o mesmo nome. `x-data` vira `v-data`, `x-show` vira `v-show`, `x-for` vira
`v-for`, `x-model` vira `v-model`. As diferenças: a Voodoo aceita `{ valor }` no texto, traz
HTTP, validação, máscaras, gráficos e componentes prontos embutidos, e não usa `eval`.

### Do Vue

`v-if`, `v-for`, `v-model`, `v-bind`, `v-on`, `:atalho` e `@atalho` funcionam igual.
Componentes têm `props`, `computed`, `methods`, `watch`, slots nomeados e os ganchos de ciclo
de vida com os mesmos nomes.

As diferenças: não existe passo de build nem arquivo `.vue`, a interpolação padrão é `{ x }` em
vez de `{{ x }}`, embora as duas sejam aceitas, e a expressão dentro do atributo aceita um
subconjunto de JavaScript em vez da linguagem inteira.

## Segurança

- **Sem `eval` e sem `new Function`.** A Voodoo tem um lexer, um parser e um interpretador de
  árvore próprios. Compatível com CSP sem `unsafe-eval`, em qualquer configuração.
- **Globais em lista fechada.** De dentro de um atributo você não alcança `window`, `document`,
  `fetch`, `localStorage` nem `globalThis`. Não é uma sandbox, mas fecha o caminho mais óbvio.
- **Escapa por padrão.** Interpolação, `v-text`, o JSON renderizado por `v-get`, as mensagens de
  validação e os rótulos dos gráficos são sempre escritos como texto.
- **`v-html` é a exceção.** Ele insere markup sem escapar e o conteúdo inserido é percorrido
  pela biblioteca, então pode trazer directives. Use apenas com conteúdo em que você confia, ou
  limpe antes com um sanitizador.
- **Token CSRF automático.** O cliente HTTP lê `<meta name="csrf-token">` e envia no cabeçalho
  `X-CSRF-TOKEN` em toda requisição que escreve.

Uma política que funciona sem ajuste nenhum:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

E se você quiser dispensar até o `'unsafe-inline'` do estilo, carregue o CSS dos componentes
como arquivo:

```html
<script src="voodoo.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

## Tamanho real

Medido com `node scripts/size.mjs` neste repositório:

| Arquivo | Cru | Gzip | Brotli | O que inclui |
| --- | --- | --- | --- | --- |
| `voodoo.core.min.js` | 119 KB | **41 KB** | 36 KB | Reatividade, expressões, componentes, DOM, directives e requisições |
| `voodoo.min.js` | 241 KB | **78 KB** | 66 KB | O anterior, mais formulários, validação, máscaras, interface, arrastar e soltar, som |
| `voodoo.full.min.js` | 406 KB | **122 KB** | 102 KB | Tudo, mais gráficos, animações, roteador, idiomas, inspetor e 29 componentes |

Os três arquivos são gerados a partir do mesmo código fonte. A diferença entre eles é apenas
quanta coisa vem junto.

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

Cada demo é um arquivo HTML que aponta para o bundle que já está no repositório. Baixe o
repositório pelo botão **Code**, abra a pasta `examples/` e clique em qualquer `index.html`.
Não precisa compilar nada para ver as demos rodando.

## Roadmap

Já implementado e testado: reatividade, analisador seguro, motor de DOM, componentes,
directives de estado e renderização, eventos, formulários, validação, máscaras, HTTP
declarativo, interface, arrastar e soltar, animações, gráficos, som, roteador, idiomas, stores,
persistência, sincronia entre abas, desfazer e refazer, inspetor e linha de comando.

Ainda não implementado, sem data marcada:

- Renderização no servidor com hidratação
- Compilador opcional para pré-compilar expressões
- Extensão de navegador dedicada, além do inspetor embutido
- Pacote de tempo real com WebSocket
- Componentes avançados: carrossel, seletor de data, tabela com dados remotos

## Contribuindo

Para **usar** a Voodoo.js você não precisa de nada além do arquivo baixado.
O que vem abaixo é só para quem vai mexer no código da própria biblioteca.

```bash
git clone https://github.com/kwy404/Voodoo.js.git
cd Voodoo.js
npm install
npm test          # 223 testes
npm run typecheck
npm run build
node scripts/size.mjs
```

Toda contribuição é bem-vinda: código, exemplo, tradução, reporte de erro.
Abra uma issue antes de mudanças grandes, para combinarmos o caminho.

A documentação longa, com um arquivo por assunto, está em [`docs/`](docs/).

## Licença

MIT.

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
  vue-alternative, zero-dependencies, typescript, reactivity, web,
  ui-components, form-validation, spa, javascript-framework

  Descricao sugerida do repositorio:
  JavaScript feels like magic. Micro framework sem build que transforma HTML em
  aplicacao reativa por atributos. Reatividade, componentes, HTTP, formularios,
  graficos e UI em uma tag script. Zero dependencias.
-->
