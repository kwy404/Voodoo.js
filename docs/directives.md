# Directives

Referência completa. Toda directive é um atributo com o prefixo `v-` (configurável em
`V.config.prefix`). A grafia `data-v-nome` é sempre aceita, mesmo quando o prefixo é outro.

## Como um atributo é lido

```
v-on:click.prevent.once="salvar()"
│  │  │     │              └── expressão
│  │  │     └── modificadores, separados por ponto
│  │  └── argumento, depois dos dois pontos
│  └── nome da directive
└── prefixo
```

Atalhos:

| Escrita | Equivale a |
| --- | --- |
| `@click="..."` | `v-on:click="..."` |
| `:href="..."` | `v-bind:href="..."` |
| `.value="..."` | `v-bind:value.prop="..."` |

Modificadores são sempre nomes soltos, porque um `=` dentro do nome do atributo não sobrevive ao
parser de HTML. Quando uma directive precisa de um número, ela oferece um atributo próprio
(`v-debounce`, `v-autosave-delay`, `v-mask-decimals`) ou aceita o valor como modificador direto,
como em `@hold.2s`.

## Ordem de execução

Em um mesmo elemento a ordem é fixa, e não depende de como você escreveu os atributos:

1. `v-ignore` e `v-pre` cancelam tudo naquela subárvore;
2. directives terminais (`v-for`, `v-if`, `v-else-if`, `v-else`) assumem o controle;
3. `v-data` e `v-component` criam o escopo usado pelo resto;
4. as demais rodam por prioridade decrescente: `v-ref`, `v-mask`, `v-model`, `v-bind`, o resto,
   `v-init` e por fim as classes de transição;
5. os filhos são percorridos com o escopo resultante.

## Os atributos somem do HTML

Depois que uma directive é processada, o atributo sai do documento. Isso deixa o DOM limpo no
inspetor, do mesmo jeito que um framework com compilador faria:

```html
<!-- você escreve -->
<button v-click="salvar()" :disabled="carregando">Salvar</button>

<!-- o inspetor mostra -->
<button disabled>Salvar</button>
```

Os valores continuam guardados no runtime, então o comportamento não muda. Duas consequências:

- **nunca escreva CSS apoiado em seletores como `[v-tab]`**, use classes;
- `el.getAttribute('v-alguma-coisa')` devolve `null` depois da montagem.

Para desligar, use `V.config.cleanAttributes = false` ou o atributo `data-keep-attributes` na tag
`<script>`.

---

# Conteúdo e visibilidade

## v-text

Escreve texto no elemento. HTML é escapado.

```html
<span v-text="usuario.nome"></span>
<span v-text="'Total: ' + total"></span>
```

## v-html

Insere HTML e inicializa as directives que vierem dentro dele.

```html
<div v-html="conteudoDoEditor"></div>
```

> **Atenção.** Nunca use `v-html` com texto vindo do usuário sem sanitizar. Veja
> [Segurança](seguranca.md).

## v-show

Alterna `display`. O elemento continua no documento.

```html
<div v-show="usuario.logado">Bem-vindo</div>
<div v-show="aberto" v-transition="fade">Com animação</div>
```

## v-if, v-else-if, v-else

Insere e remove do DOM de verdade.

```html
<p v-if="nota >= 9">ótimo</p>
<p v-else-if="nota >= 6">bom</p>
<p v-else>precisa melhorar</p>
```

`v-else-if` e `v-else` precisam ser irmãos imediatos do `v-if`. Um `<template>` funciona quando
você quer condicionar vários elementos sem um contêiner extra:

```html
<template v-if="carregado">
  <h2>Título</h2>
  <p>Texto</p>
</template>
```

## v-once

Avalia uma única vez, escreve o resultado e não cria efeito reativo.

```html
<span v-once="dataDeCriacao"></span>
```

## v-cloak

Remove o próprio atributo quando a biblioteca inicia. Combine com CSS para evitar o piscar do
conteúdo:

```html
<style>[v-cloak] { display: none !important; }</style>
<div v-cloak v-data="{ pronto: true }">...</div>
```

## v-pre e v-ignore

Desligam a Voodoo naquela subárvore. Nada é processado, nem interpolação.

```html
<pre v-pre>{ isto fica literal }</pre>
```

---

# Listas

## v-for

```html
<li v-for="item in itens">{ item }</li>
<li v-for="(item, i) in itens">{ i }: { item }</li>
<li v-for="(valor, chave) in objeto">{ chave } = { valor }</li>
<li v-for="(valor, chave, i) in objeto">{ i }. { chave }</li>
<li v-for="n in 3">{ n }</li>              <!-- 1, 2, 3 -->
<li v-for="letra in 'abc'">{ letra }</li>
```

`in` e `of` funcionam igual. As fontes aceitas são array, número, texto, objeto, `Map` e `Set`.

**Sempre use `:key` quando a lista puder ser reordenada ou filtrada.** Com chave, os elementos são
reaproveitados em vez de recriados, e o estado interno (foco, valor digitado, rolagem) sobrevive:

```html
<li v-for="produto in produtos" :key="produto.id">
  { produto.nome }
</li>
```

`<template v-for>` repete vários filhos sem contêiner:

```html
<template v-for="linha in linhas" :key="linha.id">
  <dt>{ linha.termo }</dt>
  <dd>{ linha.definicao }</dd>
</template>
```

`v-for` e `v-if` no mesmo elemento não combinam, porque os dois são terminais. Ponha o `v-if` no
filho:

```html
<div v-for="n in lista">
  <span v-if="n % 2 === 0">{ n }</span>
</div>
```

---

# Atributos, classes e estilos

## v-bind e o atalho `:`

```html
<a :href="link" :title="titulo">Ir</a>
<button :disabled="carregando">Salvar</button>
<input :value="nome">
<img :src="foto" :alt="nome">
```

Atributos booleanos (`disabled`, `checked`, `readonly`, `required`, `selected`, `hidden`, `open`,
`multiple`, `autofocus`, `novalidate`, `inert`) são adicionados e removidos conforme o valor.

Sem argumento, aplica um objeto inteiro:

```html
<input v-bind="{ placeholder: 'Nome', maxlength: '10', required: true }">
```

O modificador `.prop` escreve na propriedade do elemento em vez do atributo. O atalho `.` faz o
mesmo:

```html
<video :current-time.prop="segundos"></video>
<video .currentTime="segundos"></video>
```

## v-class

Aceita texto, array e objeto. As classes originais do elemento são sempre preservadas.

```html
<div class="card" :class="{ ativo: selecionado, erro: temErro }"></div>
<div :class="['base', tema, { grande: expandido }]"></div>
<div v-class="statusCss"></div>
```

## v-style

```html
<div :style="{ color: cor, backgroundColor: fundo }"></div>
<div :style="'width: ' + largura + 'px'"></div>
<div :style="{ '--v-primary': corDaMarca }"></div>
```

Nomes em camelCase viram traço-hífen. Propriedades customizadas (`--algo`) passam intactas.

---

# Formulário

## v-model

Liga um campo ao estado nos dois sentidos.

```html
<input v-model="nome">
<textarea v-model="bio"></textarea>
<select v-model="uf"><option>SP</option><option>RJ</option></select>
<input type="checkbox" v-model="aceito">
<input type="checkbox" value="a" v-model="tags">
<input type="radio" value="pix" v-model="pagamento">
<select multiple v-model="selecionados"></select>
<input type="file" v-model="arquivos">
```

Comportamento por tipo:

| Campo | Valor no estado |
| --- | --- |
| texto, textarea | string |
| number, range | número (conversão automática) |
| checkbox sozinho | booleano |
| checkbox ligado a um array | o array com os `value` marcados |
| radio | o `value` do escolhido |
| select simples | string |
| select múltiplo | array de strings |
| file | `FileList`, ou o primeiro arquivo com `.single` |

Modificadores:

| Modificador | Efeito |
| --- | --- |
| `.lazy` | Atualiza no `change` em vez de no `input` |
| `.number` | Converte para número |
| `.trim` | Remove espaços nas pontas |
| `.debounce` | Espera antes de escrever. O atributo `v-debounce` define o tempo |
| `.single` | Em `type="file"`, guarda um arquivo em vez da lista |

---

# Eventos

Cobertos em detalhe em [Eventos](eventos.md). O resumo:

```html
<button v-on:click="salvar()">Salvar</button>
<button @click="salvar()">Salvar</button>
<button v-click="salvar()">Salvar</button>
```

Atalhos com nome próprio: `v-click`, `v-dblclick`, `v-input`, `v-change`, `v-keyup`, `v-keydown`,
`v-keypress`, `v-mouseenter`, `v-mouseleave`, `v-mouseover`, `v-mousedown`, `v-mouseup`,
`v-contextmenu`, `v-wheel`, `v-paste`, `v-dragstart`, `v-dragover`, `v-dragleave`, `v-drop`.

Modificadores: `.prevent`, `.stop`, `.self`, `.once`, `.capture`, `.passive`, `.window`,
`.document`, `.outside`, `.debounce`, `.throttle`, teclas (`.enter`, `.esc`, `.space`, `.tab`,
`.delete`, `.up`, `.down`, `.left`, `.right`, letras e dígitos) e teclas de sistema (`.ctrl`,
`.shift`, `.alt`, `.meta`).

Eventos sintéticos: `@hold`, `@outside`, `@visible`, `@swipeleft`, `@swiperight`, `@swipeup`,
`@swipedown`.

---

# Escopo e ciclo de vida

## v-data

Cria um escopo reativo.

```html
<div v-data="{ aberto: false, itens: [] }">
  <button v-click="aberto = !aberto">alternar</button>
</div>
```

Sem valor, cria um escopo vazio: `<div v-data>`.

## v-init

Executa uma expressão depois que o DOM da rodada foi aplicado.

```html
<div v-data="{ dados: null }" v-init="carregar()"></div>
<div v-data="{ n: 0 }" v-init="console.log('montado', $el)"></div>
```

Quando a expressão é o nome de uma função, ela é chamada com `this` apontando para o escopo.

## v-ref

Guarda o elemento em `$refs`.

```html
<div v-data="{}">
  <input v-ref="busca">
  <button v-click="$refs.busca.focus()">Focar</button>
</div>
```

## v-effect

Roda a expressão sempre que qualquer dependência lida por ela mudar.

```html
<div v-effect="document.title = 'Carrinho (' + itens.length + ')'"></div>
```

## v-watch

Observa o `v-model` do mesmo elemento e roda a expressão quando o valor muda. Dentro dela você
tem `$value` e `$old`.

```html
<input v-model="busca" v-watch="buscar($value)">
```

## v-teleport

Move o elemento para outro lugar do documento, mantendo o escopo de origem.

```html
<div v-teleport="body">Este bloco vai para o final do body</div>
<div v-teleport="#area-de-modais">...</div>
```

Ao ser removido, o elemento volta para o lugar original.

## v-component

Monta um componente registrado sobre o elemento. Veja [Componentes](componentes.md).

```html
<div v-component="cartao-usuario" :usuario="atual"></div>
```

## v-transition e classes auxiliares

Aplica classes CSS nas entradas e saídas de `v-if` e `v-show`.

```html
<div v-show="aberto" v-transition="fade" v-duration="300">...</div>

<div v-if="aberto"
     v-enter-class="opacity-0"
     v-enter-active-class="transition"
     v-enter-to-class="opacity-100"
     v-leave-class="opacity-100"
     v-leave-active-class="transition"
     v-leave-to-class="opacity-0">
</div>
```

Sem classes próprias, o nome vira o prefixo: `v-fade-enter-from`, `v-fade-enter-active`,
`v-fade-enter-to`, `v-fade-leave-from`, `v-fade-leave-active`, `v-fade-leave-to`.

---

# HTTP

Detalhado em [HTTP](http.md).

| Directive | O que faz |
| --- | --- |
| `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete` | Dispara a requisição no gatilho natural do elemento |
| `v-load` | Requisição GET na montagem |
| `v-load-visible` | Requisição GET quando o elemento chega perto da tela |
| `v-search` | Busca enquanto o usuário digita, com debounce |
| `v-resource` | Objeto reativo com `data`, `loading`, `error`, `loaded`, `reload()`, `set()` |

Atributos de configuração: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-params`, `v-param`,
`v-body`, `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-as`, `v-json-path`, `v-template`,
`v-offline-queue`, `v-min-length`, `v-scroll-to`, `v-manual`, `v-debounce`, `v-method`,
`v-redirect`, `v-loading`, `v-loading-class`, `v-disable-loading`, `v-toast-success`,
`v-toast-error`, `v-on-success`, `v-on-error`, `v-on-complete`.

---

# Formulários

Detalhado em [Formulários](formularios.md).

| Directive | O que faz |
| --- | --- |
| `v-submit` | Envia o formulário por AJAX |
| `v-upload` | Envia arquivos de um `<input type="file">` com progresso |
| `v-dropzone` | Área de soltar arquivos |
| `v-autosave` | Salva o formulário sozinho, com debounce |
| `v-guard` | Avisa antes de sair da página com alterações pendentes |
| `v-loading` | Esconde um elemento até a requisição começar |

---

# Validação

Detalhado em [Validação](validacao.md).

`v-validate` no formulário liga a validação automática. Nos campos:

`v-required`, `v-email`, `v-url`, `v-number`, `v-integer`, `v-minlength`, `v-maxlength`, `v-min`,
`v-max`, `v-match`, `v-regex`, `v-cpf`, `v-cnpj`, `v-cep`, `v-phone`, `v-date`, `v-accepted`,
`v-strong-password`, além de `v-validate-<regra>` para qualquer regra registrada.

Configuração por campo: `v-error-message`, `v-error-target`, `v-regex-flags`, `v-unique-url`,
`v-label`.

---

# Máscaras

Detalhado em [Máscaras](mascaras.md).

```html
<input v-mask="cpf">
<input v-mask="(99) 99999-9999">
<input v-mask.unmask="cpf" v-model="form.cpf">
<input v-mask-currency v-mask-decimals="2">
```

---

# Interface

Detalhado em [Interface](interface.md).

| Directive | O que faz |
| --- | --- |
| `v-toggle` | Mostra e esconde um alvo, ou alterna uma classe |
| `v-collapse`, `v-collapse-toggle` | Painel que abre e fecha com animação de altura |
| `v-dropdown`, `v-dropdown-menu` | Menu suspenso com navegação por setas |
| `v-popover` | Camada flutuante com foco preso |
| `v-tooltip` | Dica ao passar o mouse ou focar |
| `v-tabs`, `v-tab`, `v-tab-panel` | Abas acessíveis |
| `v-accordion`, `v-accordion-item` | Acordeão |
| `v-drawer`, `v-drawer-content`, `v-drawer-close`, `v-offcanvas` | Gaveta lateral |
| `v-modal`, `v-modal-content`, `v-modal-close` | Modal |
| `v-confirm` | Pede confirmação antes de deixar a ação seguir |
| `v-theme-toggle` | Alterna tema claro e escuro |
| `v-focus`, `v-focus-trap` | Foco automático e foco preso |
| `v-click-outside`, `v-escape` | Reage a clique fora e à tecla Escape |
| `v-hotkey` | Atalho de teclado que clica no elemento |
| `v-scroll-to`, `v-scrollspy`, `v-sticky` | Rolagem |
| `v-visible`, `v-infinite-scroll` | Entrada na tela e rolagem infinita |
| `v-lazy-src`, `v-lazy-bg` | Imagens sob demanda |
| `v-skeleton` | Esqueleto de carregamento |
| `v-copy`, `v-copy-from` | Copiar para a área de transferência |
| `v-print`, `v-share`, `v-download`, `v-fullscreen` | Ações do navegador |
| `v-resizable` | Redimensionar com mouse e teclado |
| `v-command`, `v-command-item` | Paleta de comandos |
| `v-idle` | Reage a inatividade |
| `v-online`, `v-offline` | Reage à conexão |

---

# Arrastar e soltar

Detalhado em [Arrastar e soltar](arrastar-e-soltar.md).

`v-sortable`, `v-draggable`, `v-droppable`, `v-dnd-group` e os atributos de configuração
`v-sortable-group`, `v-sortable-handle`, `v-draggable-handle`, `v-draggable-axis`,
`v-draggable-data`, `v-draggable-group`, `v-droppable-accept`, `v-droppable-group`.

---

# Estado avançado

Detalhado em [Estado e stores](estado-e-stores.md).

| Directive | O que faz |
| --- | --- |
| `v-persist` | Guarda o escopo no `localStorage` e restaura ao recarregar |
| `v-sync` | Sincroniza o escopo com as outras abas abertas |
| `v-history` | Desfazer e refazer, com `$history` |
| `v-undo`, `v-redo` | Botões de desfazer e refazer |
| `v-storage` | Liga um campo direto ao `localStorage` |

---

# Somente no build completo

## Animação

`v-motion`, `v-motion-scroll`, `v-motion-stagger`, `v-motion-stagger-from`, `v-motion-hover`,
`v-motion-tap`, `v-parallax`, `v-flip`, `v-count`, `v-typewriter`. Veja
[Animações](animacoes.md).

## Gráficos

`v-chart` e os atributos `v-chart-*`. Veja [Gráficos](graficos.md).

## Roteador

`v-router-view`, `v-link`, `v-route-active`. Veja [Roteador](roteador.md).

## Idiomas

`v-t`, `v-t-params`, `v-locale`. Veja [Idiomas](idiomas.md).

---

# Criando a sua própria

```js
V.directive('destaque', {
  mounted(el, binding) { el.style.background = binding.value; },
  updated(el, binding) { el.style.background = binding.value; },
});
```

```html
<div v-destaque="'yellow'">Destaque</div>
```

A forma curta em função vale para `mounted` e `updated` ao mesmo tempo:

```js
V.directive('marcar', (el, binding) => {
  el.dataset.marcado = binding.value;
});
```

Veja [Plugins](plugins.md) para o formato completo, com prioridade, efeitos e limpeza.

---

Anterior: [Expressões](expressoes.md) · Próximo: [Componentes](componentes.md)
