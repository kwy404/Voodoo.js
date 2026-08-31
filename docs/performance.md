# Desempenho na prática

Esta página é sobre como escrever aplicações rápidas com a Voodoo.js. Tudo aqui descreve o
comportamento real do código, com o arquivo que implementa cada coisa nomeado, para você
poder conferir.

Se você quer entender **por que** o modelo é rápido, leia
[Desempenho](desempenho.md) primeiro. Esta página assume que você já sabe que não existe
Virtual DOM e quer saber o que fazer com essa informação.

> **Antes de otimizar, meça.** Os benchmarks do projeto ficam em `benchmarks/`, com cenários
> para as primitivas reativas, ligação de DOM, listas grandes e o parser, além de uma
> linha de base em JavaScript puro. Rode com `node benchmarks/run.mjs`. Comparação de
> número entre máquinas diferentes é ruído.

---

## 1. Use chave em listas grandes

A regra mais importante desta página.

`v-for` sem `:key` usa `__index_0`, `__index_1` e assim por diante como chave
(`directives/core.ts`). O bloco da posição zero é sempre reaproveitado para o item da
posição zero, seja ele qual for.

Enquanto a lista só cresce no fim, isso funciona. Quando você ordena, filtra, remove do
meio ou insere no começo, cada bloco recebe dados de um item diferente. O DOM não quebra,
mas todo efeito de todo bloco reexecuta.

```html
<!-- Ruim em lista que muda de ordem -->
<li v-for="produto in produtos">{ produto.nome }</li>

<!-- Bom -->
<li v-for="produto in produtos" :key="produto.id">{ produto.nome }</li>
```

Com chave estável, o `v-for` acha o bloco anterior pelo `Map` de chaves, atualiza só as
variáveis do escopo daquele bloco e reposiciona os nós com um cursor. Blocos cujos dados
não mudaram não disparam efeito nenhum.

O impacto aparece de verdade quando o bloco tem estado interno:

```html
<!-- Sem chave, ordenar a lista embaralha qual checkbox estava marcado. -->
<div v-for="tarefa in tarefas" :key="tarefa.id">
  <input type="checkbox" v-model="tarefa.feita">
  <input v-model="tarefa.texto">
</div>
```

**A chave precisa ser estável e única.** `:key="item.id"` é certo. `:key="index"` é o mesmo
que não ter chave. `:key="Math.random()"` recria tudo a cada atualização, que é o pior caso
possível.

Chave duplicada faz a lista reaproveitar o bloco errado ao reordenar. Ligue
`V.config.devtools = true` durante o desenvolvimento para receber o aviso.

---

## 2. Prefira `computed` a watcher

`computed` tem cache e uma marca de sujo (`reactivity/index.ts`, `ComputedRefImpl`). Ele
recalcula na primeira leitura depois de uma dependência mudar, e nunca antes disso. Se
ninguém ler o valor, ele não recalcula.

```js
// Bom: só recalcula quando itens muda, e só se alguém ler.
V.component('carrinho', {
  computed: {
    total() {
      return this.itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
    },
  },
});
```

```js
// Ruim: recalcula sempre, mesmo que o total não apareça na tela.
V.component('carrinho', {
  watch: {
    itens() {
      this.total = this.itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
    },
  },
});
```

A segunda forma tem três problemas. Ela roda mesmo quando o total não está visível, ela
guarda um valor derivado no estado (que agora pode ficar dessincronizado), e ela cria um
efeito a mais.

**Watcher é para efeito colateral**, não para valor derivado: disparar uma requisição,
salvar no `localStorage`, chamar uma biblioteca de terceiros. Se o resultado é um valor que
o template lê, use `computed`.

O mesmo vale para expressões no HTML. Uma expressão dentro de `{ }` ou de `v-text` roda a
cada atualização das dependências dela, sem cache:

```html
<!-- Recalcula o reduce toda vez que qualquer item mudar -->
<p>{ itens.reduce((s, i) => s + i.preco, 0) }</p>

<!-- Recalcula uma vez, e só quando itens mudar -->
<p>{ total }</p>
```

Para listas pequenas isso não importa. Para uma lista de mil itens dentro de um `v-for`,
importa muito, porque a expressão roda uma vez por linha.

---

## 3. Cuidado com `watch` profundo

`watch(source, cb, { deep: true })` usa `traverse` (`reactivity/index.ts`), que percorre o
objeto inteiro recursivamente e **lê cada chave**. Ler significa rastrear: o watcher passa a
depender de cada propriedade de cada objeto aninhado.

Em um objeto pequeno, é imperceptível. Em um array de mil objetos com dez campos cada, cada
disparo faz dez mil leituras rastreadas.

```js
// Caro: qualquer campo de qualquer pedido dispara.
V.watch(() => this.pedidos, atualizar, { deep: true });

// Barato: só o que interessa.
V.watch(() => this.pedidos.length, atualizar);
V.watch(() => this.pedidos.filter((p) => p.status === 'pendente').length, atualizar);
```

Watchers declarados na definição de um componente (`watch: { ... }`) **não** são profundos.
Eles observam `proxy[chave]`, então mudanças dentro de um objeto aninhado só disparam se a
referência trocar. Isso é o comportamento certo na maior parte dos casos, e é bom saber
disso antes de tentar entender por que o watcher "não disparou".

`V.store(nome, def, { persist: true })` usa `watch` profundo internamente, para saber quando
salvar. É a escolha correta ali, mas significa que **um store persistido grande custa mais
que um store persistido pequeno**. Persista o que precisa sobreviver ao recarregamento, não
o cache inteiro da aplicação.

---

## 4. O hook `updated` de componente é caro

Vale ler o código deste, porque a implicação não é óbvia (`runtime/component.ts`):

```js
queuePostFlush(() => {
  callHook(definition, proxy, 'mounted');
  if (definition.updated) {
    owner.run(() =>
      createEffect(() => {
        // Le todo o estado para reagir a qualquer mudanca.
        for (const key of Object.keys(state)) void state[key];
        callHook(definition, proxy, 'updated');
      })
    );
  }
});
```

Declarar `updated` cria um efeito que **lê todas as chaves do estado**, e portanto depende
de todas elas. Qualquer mudança em qualquer campo dispara o hook.

Isso é exatamente o que "atualizou" quer dizer, então está correto. Mas é o oposto do
resto da biblioteca, que é granular. Se você só precisa reagir a um campo, use `watch`:

```js
// Roda quando qualquer coisa muda
updated() { this.reposicionar(); }

// Roda quando o que importa muda
watch: {
  itens() { this.reposicionar(); }
}
```

---

## 5. Faça limpeza de integrações externas

Cada directive recebe um `cleanup` que roda quando o elemento sai do DOM
(`runtime/walker.ts`, `runDirective`). Efeitos criados com `ctx.effect` e listeners
registrados pelas directives nativas são limpos sozinhos. **O que você criou por fora, não.**

```js
V.directive('mapa', {
  mounted(el, binding) {
    el._mapa = new MinhaBibliotecaDeMapa(el, binding.value);
  },
  beforeUnmount(el) {
    el._mapa?.destroy();
    delete el._mapa;
  },
});
```

O mesmo em componentes:

```js
V.component('relogio', {
  state: () => ({ agora: new Date() }),

  mounted() {
    this._timer = setInterval(() => { this.agora = new Date(); }, 1000);
    this._onResize = () => this.recalcular();
    window.addEventListener('resize', this._onResize);
  },

  beforeUnmount() {
    clearInterval(this._timer);
    window.removeEventListener('resize', this._onResize);
  },
});
```

Sem isso, um componente montado e desmontado várias vezes deixa um timer para trás em cada
ciclo. Em uma SPA que troca de página, isso vira vazamento de verdade.

`V.watch` e `V.effect` chamados fora de uma directive ou componente também não são limpos
por ninguém. Guarde o retorno e chame:

```js
const parar = V.watch(() => estado.busca, buscar);
// mais tarde
parar();
```

Ou agrupe em um escopo:

```js
const escopo = V.effectScope();
escopo.run(() => {
  V.watch(/* ... */);
  V.effect(/* ... */);
});
// uma chamada limpa tudo
escopo.stop();
```

---

## 6. `v-cloak`, e o que ele resolve

Entre o HTML aparecer na tela e a Voodoo.js percorrer a página, existe um instante em que
`{ nome }` está visível como texto literal. `v-cloak` esconde o elemento até esse instante
passar.

O CSS vem em `BASE_TOKENS` (`dom/style.ts`):

```css
[v-cloak]{display:none !important}
```

A directive apenas remove o atributo quando o elemento é processado
(`directives/core.ts`).

```html
<div v-data="{ nome: 'Ana' }" v-cloak>
  <p>Olá, { nome }</p>
</div>
```

Dois detalhes que economizam uma sessão de depuração:

- **Se `V.config.injectStyles` for `false`, o CSS não é injetado** e `v-cloak` não esconde
  nada. Declare a regra você mesmo nesse caso.
- **O seletor é literalmente `[v-cloak]`.** Se você trocou `V.config.prefix`, a regra
  precisa acompanhar.

Alternativa que evita o salto de layout, para blocos grandes: use `v-show` em um esqueleto
em vez de esconder o conteúdo inteiro.

---

## 7. `V.config.autoDiscover` e o custo do MutationObserver

Por padrão a Voodoo.js observa o documento com um `MutationObserver`
(`{ childList: true, subtree: true }`) e inicializa qualquer elemento novo
(`runtime/walker.ts`, `observeDOM`). É o que faz HTML inserido depois do carregamento
ganhar suas directives sem nenhuma chamada manual.

O custo é real e proporcional à quantidade de mutações, não ao tamanho da página. Para cada
nó adicionado o observador checa se já foi inicializado e, se não, sobe a árvore com
`findScope` até achar o escopo. Para cada nó removido, checa se a remoção foi interna e
chama `destroy`.

Em uma página normal isso é imperceptível. Em uma página que insere milhares de nós por
segundo (um terminal, um log ao vivo, um canvas de nós), passa a aparecer no perfil.

Duas saídas.

**Desligue e chame na mão.** Você paga o custo só quando quer:

```html
<script src="voodoo.min.js" data-no-observer defer></script>
```

```js
lista.insertAdjacentHTML('beforeend', html);
V.refresh(lista);
```

**Limite a raiz observada.** Se a Voodoo só governa uma parte da página, diga isso:

```html
<script src="voodoo.min.js" data-manual defer></script>
<script>
  V.config.root = document.querySelector('#app');
  V.start();
</script>
```

O observador é ligado sobre a raiz passada para `start()`, então mutações fora dela não
custam nada.

---

## 8. `v-pre`, `v-ignore`, `v-once`: o que cada um faz de verdade

Os três parecem otimizações parecidas e **não são a mesma coisa**. Vale ler com atenção,
porque um deles não faz o que o nome sugere para quem vem do Vue.

### `v-pre` e `v-ignore`

Idênticos. O walker encontra o atributo, marca o elemento como inicializado e **retorna
imediatamente** (`runtime/walker.ts`, `walk`). A subárvore inteira fica de fora: nenhuma
directive, nenhuma interpolação, nenhum efeito.

```html
<pre v-pre>
  Exemplo de código: { isto } continua texto puro.
</pre>
```

Use em blocos de documentação, exemplos de código e HTML de terceiros que a Voodoo não deve
tocar. É a otimização mais eficiente que existe, porque o custo cai a zero.

`bindTextNode` também sobe pelos ancestrais procurando `v-pre` e `v-ignore`, então a
proteção vale mesmo quando um script reescreve o conteúdo depois da montagem.

### `v-once`

Aqui a diferença. Em Vue, `v-once` congela uma subárvore. Na Voodoo.js **ele avalia uma
expressão uma vez e escreve o resultado em `textContent`**:

```js
defineDirective('once', ({ el, effect, evaluate: ev }) => {
  void effect;
  const value = ev();
  if (value !== undefined) el.textContent = stringify(value);
});
```

Três consequências:

- É um `v-text` sem reatividade, não um congelador de subárvore.
- **Os filhos continuam sendo percorridos.** Interpolações dentro do elemento continuam
  reativas, porque `v-once` sobrescreve o `textContent` antes disso.
- O nome é enganoso para quem vem do Vue. Isso está registrado como questão em aberto no
  [ROADMAP.md](../ROADMAP.md).

Para congelar de verdade um trecho renderizado com dados que não mudam, use `v-pre` depois
que o valor já estiver no HTML, ou não coloque a expressão ali para começo de conversa.

---

## 9. Cache de expressões

Toda expressão vira AST uma vez só. O cache é um `Map<string, Node>` em
`parser/parser.ts`, com `MAX_CACHE = 2000`.

Isso significa que **expressões repetidas são grátis a partir da segunda vez**. Mil linhas
de um `v-for` com a mesma expressão `produto.nome` compartilham a mesma AST.

Duas implicações práticas.

**Repetir a mesma expressão é melhor que variar.** Estes dois blocos custam diferente:

```html
<!-- Uma entrada no cache, reusada mil vezes -->
<li v-for="p in produtos" :key="p.id">{ p.nome }</li>

<!-- Também uma entrada: a expressao e a mesma string em todas as linhas -->
<li v-for="p in produtos" :key="p.id">{ p.preco > 100 ? 'caro' : 'barato' }</li>
```

O que gera entradas diferentes é HTML gerado com expressões diferentes por linha, o que
quase nunca acontece na prática.

**O cache é limpo por inteiro ao estourar.** Não é LRU: ao chegar em 2000 entradas, ele
chama `clear()`. Uma aplicação que passe desse número fica reanalisando expressões
periodicamente. Duas mil expressões distintas é muita coisa, mas se você gera HTML
dinamicamente vale saber. `V.clearParseCache()` limpa na mão, e existe para testes.

O mesmo vale para o memo de interpolação (`expressaoValida` em `runtime/walker.ts`), que
guarda "este texto entre chaves é uma expressão?" por texto. Esse não tem limite, e cresce
com a quantidade de trechos distintos entre chaves na página.

---

## 10. Atualize em lote

O agendador junta tudo que acontece na mesma tarefa síncrona em um flush só
(`reactivity/index.ts`).

```js
estado.a = 1;
estado.b = 2;
estado.c = 3;
// os efeitos afetados rodam uma vez, na microtask
```

Isso já acontece sozinho. O que **não** acontece sozinho é quando você intercala leitura de
layout com escrita de estado:

```js
// Ruim: força layout a cada volta
for (const item of itens) {
  estado.altura = elemento.offsetHeight;
  estado.itens.push(item);
}

// Bom: uma leitura, uma escrita
const altura = elemento.offsetHeight;
estado.itens.push(...itens);
estado.altura = altura;
```

Para substituir um array inteiro, troque a referência em vez de mexer item a item:

```js
// Dispara uma vez
estado.itens = novosItens;

// Dispara varias vezes
estado.itens.length = 0;
for (const item of novosItens) estado.itens.push(item);
```

Os métodos `push`, `pop`, `shift`, `unshift` e `splice` já rodam com o rastreamento pausado
internamente, então eles não são o problema. O problema é o número de disparos.

`await V.nextTick()` resolve depois que o DOM foi escrito, quando você precisa medir algo
logo em seguida.

---

## 11. Debounce em entrada de texto

Todo caractere digitado em um `v-model` escreve no estado e dispara os efeitos que dependem
dele. Quando isso alimenta uma busca, é uma requisição por tecla.

```html
<!-- Uma escrita de estado por tecla -->
<input v-model="busca">

<!-- Uma escrita a cada 300ms de silencio -->
<input v-model.debounce=300 v-search="/api/busca">

<!-- Escreve so ao sair do campo -->
<input v-model.lazy="busca">
```

`v-model` aceita `.debounce=<ms>`, `.lazy`, `.trim` e `.number`
(`directives/core.ts`). `.lazy` troca o evento de `input` para `change`.

Para um campo de busca que dispara requisição, `v-search` já tem debounce próprio e
`v-min-length`, e cancela a requisição anterior.

---

## 12. Escolha o bundle certo

Três arquivos, do menor para o maior:

| Arquivo                 | O que traz                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| `voodoo.core.min.js`    | Reatividade, expressões, walker, componentes, directives principais, HTTP declarativo, coleção encadeável |
| `voodoo.min.js`         | O anterior mais formulários, validação, máscaras, interface, diálogos, paleta, som |
| `voodoo.full.min.js`    | O anterior mais gráficos, animação com física, roteador, idiomas, inspetor, componentes prontos |

Se a página não usa gráfico nem roteador, o build completo é peso morto que o usuário baixa,
analisa e executa.

Por um bundler, importe só o que usa:

```js
import { reactive, computed } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
import { debounce, formatCurrency } from 'voodoojs/utils';
```

Os pontos de entrada `reactivity`, `http` e `utils` não trazem nada do DOM.

Confira o tamanho real com `npm run size`. Os limites do projeto ficam em
`scripts/size.mjs` e o CI falha quando algum bundle passa da meta.

---

## 13. Limpeza de atributos

`V.config.cleanAttributes` é `true` por padrão. Depois que um elemento é processado, os
atributos `v-*`, `:`, `@` e `.prop` saem do HTML e vão para um cache em `WeakMap`
(`runtime/walker.ts`, `stripAttributes`).

O efeito é HTML limpo no inspetor e nós de DOM um pouco menores. O efeito colateral é que
`document.querySelectorAll('[v-tab]')` não acha mais nada.

A biblioteca resolve isso internamente com um índice de directives (`queryDirective`,
`hasDirective`, `closestDirective`). **Se o seu código depende de achar elementos por
atributo da Voodoo**, use uma classe ou um `data-` próprio:

```html
<div v-modal="aberto" data-papel="dialogo-principal"></div>
```

```js
document.querySelector('[data-papel="dialogo-principal"]');
```

Desligar a limpeza tem custo em memória, não em velocidade:

```html
<script src="voodoo.min.js" data-keep-attributes defer></script>
```

---

## 14. Quando o gargalo não é a Voodoo

Antes de otimizar a camada reativa, confirme que ela é o problema. No perfil do navegador,
procure:

- **Layout e paint dominando.** Uma lista de mil linhas é cara de desenhar em qualquer
  biblioteca. A resposta é virtualizar, não trocar de framework.
- **Requisições em série.** Três `await` seguidos custam três viagens. `Promise.all` custa
  uma.
- **Imagem sem dimensão.** Causa reflow em cascata e não tem nada a ver com reatividade.
  `v-lazy-src` ajuda no carregamento, não no layout.
- **CSS caro.** `box-shadow` e `filter` em muitos elementos animados custam mais que
  qualquer efeito reativo.
- **Biblioteca de terceiros.** Um gráfico ou um editor de texto pesado domina o perfil
  inteiro.

O sinal de que o problema é reatividade: muitas execuções curtas de efeito na mesma
microtask. O inspetor `xray` do build completo conta efeitos por elemento e é o caminho mais
rápido para achar o elemento que está reagindo demais.

---

## Resumo

| Faça                                                | Por quê |
| --------------------------------------------------- | ------- |
| `:key` estável em toda lista que reordena           | Evita reexecutar todos os efeitos de todos os blocos |
| `computed` para valor derivado                      | Tem cache; watcher não tem |
| `watch` só para efeito colateral                    | Watcher roda mesmo quando ninguém lê o resultado |
| Evite `deep: true`                                  | Percorre e rastreia o objeto inteiro |
| Prefira `watch` a `updated` em componente           | `updated` depende de todas as chaves do estado |
| Limpe timers, listeners e bibliotecas externas      | O runtime só limpa o que ele criou |
| `v-pre` em blocos que a Voodoo não precisa tocar    | Custo zero na subárvore inteira |
| Desligue `autoDiscover` em páginas com muita mutação| O observador custa por mutação |
| Troque a referência do array em vez de mutar item a item | Um disparo em vez de vários |
| `.debounce` em campos de busca                      | Uma requisição por pausa, não por tecla |
| Escolha o menor bundle que atende                   | O usuário baixa, analisa e executa tudo |
| Meça antes e depois                                 | `benchmarks/`, `npm run size`, o perfil do navegador |

## Leia também

- [Desempenho](desempenho.md), o modelo por dentro
- [Reatividade](reatividade.md)
- [Estrutura de aplicação](application-structure.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md), o caminho completo de uma atualização
- [QUALITY.md](../QUALITY.md), como o desempenho é medido no projeto
