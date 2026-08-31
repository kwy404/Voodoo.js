# Eventos

Três escritas equivalentes para o mesmo comportamento:

```html
<button v-on:click="salvar()">Salvar</button>
<button @click="salvar()">Salvar</button>
<button v-click="salvar()">Salvar</button>
```

A primeira é a forma completa e serve para qualquer evento. A segunda é o atalho, igual ao do Vue.
A terceira existe para os eventos mais comuns e deixa o HTML mais legível.

## Atalhos com nome próprio

`v-click`, `v-dblclick`, `v-input`, `v-change`, `v-keyup`, `v-keydown`, `v-keypress`,
`v-mouseenter`, `v-mouseleave`, `v-mouseover`, `v-mousedown`, `v-mouseup`, `v-contextmenu`,
`v-wheel`, `v-paste`, `v-dragstart`, `v-dragover`, `v-dragleave`, `v-drop`.

Qualquer outro evento usa `@nome` ou `v-on:nome`, inclusive eventos customizados:

```html
<div @pedido:criado="atualizar($detail)"></div>
<video @timeupdate="progresso = $event.target.currentTime"></video>
```

## Apelidos amigáveis

| Escrita | Evento real |
| --- | --- |
| `@hover` | `mouseenter` |
| `@unhover` | `mouseleave` |
| `@tap` | `click` |
| `@press` | `pointerdown` |
| `@release` | `pointerup` |
| `@rightclick` | `contextmenu` |
| `@type` | `input` |
| `@enterkey` | `keydown` |
| `@submitform` | `submit` |

## A expressão

Você pode escrever a ação inteira:

```html
<button v-click="contador++">+1</button>
<button v-click="itens.push(novo); novo = ''">Adicionar</button>
```

Ou apenas o nome de uma função, que é chamada com o evento:

```html
<button v-click="salvar">Salvar</button>
```

Dentro da expressão você tem três variáveis extras:

| Variável | O que é |
| --- | --- |
| `$event` | O objeto de evento |
| `$el` | O elemento que declarou a directive |
| `$detail` | O `detail` de um `CustomEvent`, incluindo o `emit` de componentes |

```html
<input @keyup="busca = $event.target.value">
<button @click="console.log($el.dataset.id)">Ver id</button>
<meu-componente @salvo="registrar($detail)"></meu-componente>
```

Quando o evento vem de `emit`, uma expressão que é só o nome de uma função recebe o `detail` em
vez do evento:

```html
<editor @salvo="aoSalvar"></editor>
```

```js
V.data({ aoSalvar(dados) { console.log(dados.id); } });
```

## Modificadores

### Controle do evento

| Modificador | O que faz |
| --- | --- |
| `.prevent` | `event.preventDefault()` |
| `.stop` | `event.stopPropagation()` |
| `.self` | Só dispara quando `event.target` é o próprio elemento |
| `.once` | Escuta apenas uma vez |
| `.capture` | Escuta na fase de captura |
| `.passive` | Marca o ouvinte como passivo, bom para `scroll` e `wheel` |

```html
<form @submit.prevent="enviar()">...</form>
<div class="overlay" @click.self="fechar()">...</div>
<button @click.once="comecar()">Começar</button>
<div @wheel.passive="acompanhar()">...</div>
```

### Onde escutar

| Modificador | Alvo |
| --- | --- |
| `.window` | `window` |
| `.document` | `document` |
| `.outside` | `document`, ignorando cliques dentro do elemento |

```html
<div @keydown.escape.window="fechar()">...</div>
<div @click.outside="fecharMenu()">...</div>
```

### Ritmo

| Modificador | O que faz |
| --- | --- |
| `.debounce` | Espera parar de disparar antes de executar. 250 ms |
| `.throttle` | No máximo uma execução a cada 250 ms |

```html
<input @input.debounce="buscar($event.target.value)">
<div @scroll.throttle.window="acompanhar()"></div>
```

Para um tempo diferente, faça o debounce na função:

```js
V.data({ buscar: V.debounce((termo) => carregar(termo), 600) });
```

O `v-model` tem um atalho próprio para isso, com o atributo `v-debounce`:

```html
<input v-model.debounce="busca" v-debounce="600">
```

### Teclas

| Modificador | Tecla |
| --- | --- |
| `.enter` | Enter |
| `.esc`, `.escape` | Escape |
| `.space` | Barra de espaço |
| `.tab` | Tab |
| `.delete` | Delete ou Backspace |
| `.backspace` | Backspace |
| `.up`, `.down`, `.left`, `.right` | Setas |
| `.a` até `.z`, `.0` até `.9` | A tecla correspondente |

```html
<input @keyup.enter="buscar()">
<input @keydown.esc="limpar()">
<div @keydown.down.window="proximo()"></div>
```

Teclas de sistema combinam com as demais:

```html
<input @keydown.ctrl.enter="enviar()">
<div @keydown.meta.k.window.prevent="abrirBusca()"></div>
```

Modificadores aceitos: `.ctrl`, `.shift`, `.alt`, `.meta`.

## Eventos sintéticos

A Voodoo constrói alguns eventos que o navegador não oferece.

### @hold

Dispara quando o usuário mantém pressionado. O tempo padrão é 800 ms e pode vir no modificador:

```html
<button @hold="excluir()">Segure para excluir</button>
<button @hold.2s="excluir()">Segure dois segundos</button>
```

Enquanto o usuário segura, o elemento recebe a classe `v-holding` e a variável CSS
`--v-hold-duration`, o que permite desenhar uma barra de progresso só com CSS:

```css
.v-holding { background: linear-gradient(90deg, var(--v-primary) 0 0) left/0 100% no-repeat; }
.v-holding { animation: encher var(--v-hold-duration) linear forwards; }
@keyframes encher { to { background-size: 100% 100%; } }
```

O clique que viria logo depois de um hold concluído é engolido, então você não executa duas ações.

### @outside

Clique em qualquer lugar fora do elemento:

```html
<div class="menu" @outside="aberto = false">...</div>
```

### @visible

Dispara quando o elemento entra na área visível. Por padrão acontece uma vez só.

```html
<div @visible="carregarMais()">...</div>
<div @visible.repeat="animar()">...</div>
```

| Modificador | O que faz |
| --- | --- |
| `.repeat` | Dispara a cada nova entrada, em vez de uma vez só |

A fração visível necessária é 0.1 e a margem do observador é zero.

### @swipeleft, @swiperight, @swipeup, @swipedown

Gestos com ponteiro, funcionando no mouse e no toque. O limiar é de 40 pixels no eixo dominante.

```html
<div @swipeleft="proximo()" @swiperight="anterior()">
  <img :src="fotos[indice]">
</div>
```

O `detail` traz `{ dx, dy }`.

## Atalhos de teclado globais

### v-hotkey

Liga uma combinação global ao clique do elemento:

```html
<button v-hotkey="mod+s" v-click="salvar()">Salvar</button>
<button v-hotkey="ctrl+shift+p, meta+shift+p" v-click="abrirPaleta()">Comandos</button>
```

`mod` significa Command no macOS e Control no resto. O elemento ganha `aria-keyshortcuts`
automaticamente.

Combinações sem modificador não disparam quando o foco está em um campo de texto, para não
atrapalhar quem digita. O modificador `.force` remove essa proteção, e `.default` mantém o
comportamento padrão do navegador:

```html
<button v-hotkey.force="?" v-click="ajuda()">Ajuda</button>
```

### V.hotkey

O mesmo por JavaScript, devolvendo a função que remove:

```js
const parar = V.hotkey('ctrl+k', () => abrirBusca());
parar();

V.hotkey('escape', fechar, { allowInInput: true, preventDefault: false });
```

Nomes aceitos: `esc`, `space`, `enter`, `del`, `ins`, `up`, `down`, `left`, `right`, `plus`,
`minus`, `comma`, `period`, `slash`, `question`, letras, dígitos e qualquer `event.key`.
Modificadores: `ctrl`, `shift`, `alt`, `meta`, `cmd`, `option`, `mod`. Vários combos ao mesmo
tempo, separados por vírgula.

## Eventos da própria biblioteca

Directives disparam eventos customizados que sobem pela árvore. Você escuta com `@nome`:

| Evento | Quem dispara |
| --- | --- |
| `voodoo:ready` | Disparado em `document` quando a biblioteca inicia |
| `voodoo:before-request`, `voodoo:success`, `voodoo:error`, `voodoo:complete` | Directives HTTP |
| `voodoo:submit`, `voodoo:invalid`, `voodoo:upload`, `voodoo:progress`, `voodoo:autosave` | Formulários |
| `voodoo:field-validated` | Validação de campo |
| `voodoo:toggle`, `voodoo:collapse`, `voodoo:popup`, `voodoo:drawer`, `voodoo:tab` | Interface |
| `voodoo:copy`, `voodoo:share`, `voodoo:download`, `voodoo:resized`, `voodoo:scrollspy` | Interface |
| `voodoo:idle`, `voodoo:online`, `voodoo:offline` | Interface |
| `voodoo:drag-start`, `voodoo:drag-end`, `voodoo:drag-cancel`, `voodoo:sorted`, `voodoo:drop` | Arrastar e soltar |
| `voodoo:theme` | Disparado em `document` na troca de tema |
| `voodoo:palette` | Disparado em `document` quando `V.palette()` é aplicada |

```html
<form v-submit="/api/x" @voodoo:success="console.log($detail.data)"></form>
<ul v-sortable @voodoo:sorted="salvarOrdem($detail.order)"></ul>
```

## Barramento global

Para eventos que não têm um elemento no meio:

```js
const off = V.on('carrinho:mudou', atualizarBadge);
V.once('app:pronto', iniciar);
V.emit('carrinho:mudou', { total: 3 });
off();
V.off('carrinho:mudou');
```

E no HTML, `$dispatch` cria um `CustomEvent` a partir do elemento atual:

```html
<button v-click="$dispatch('filtro', { termo })">Filtrar</button>
<section @filtro="aplicar($detail)">...</section>
```

## Limpeza

Todo ouvinte registrado por uma directive é removido quando o elemento sai do DOM. Isso vale
também para os ouvintes instalados em `window` e `document` por `.window`, `.outside`,
`v-hotkey` e pelos eventos sintéticos. Você não precisa remover nada à mão.

---

Anterior: [Estado e stores](estado-e-stores.md) · Próximo: [HTTP](http.md)
