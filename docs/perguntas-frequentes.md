# Perguntas frequentes

## Geral

### A Voodoo.js precisa de build?

Não. Uma tag `<script>` e o HTML já funcionam. O pacote no npm existe para quem prefere importar
por bundler, mas nada obriga.

### Qual bundle eu escolho?

Comece pelo `voodoo.min.js`. Ele já traz reatividade, directives, componentes, HTTP, formulários,
validação, máscaras, interface, arrastar e soltar, notificações, diálogos e armazenamento. Troque
para `voodoo.full.min.js` no dia em que precisar de gráfico, animação com mola, roteador, idiomas,
inspetor ou os 29 componentes prontos.

### Por que a interpolação usa chave simples?

Porque é o que a maioria das pessoas tenta escrever primeiro. `{ nome }` é a forma padrão da
Voodoo. `{{ nome }}` também funciona, para quem vem do Vue e para textos que precisam de chaves
literais em volta.

### Onde os meus atributos `v-*` foram parar?

Eles são removidos do HTML depois de processados, de propósito, para deixar o DOM limpo no
inspetor. O comportamento continua funcionando porque os valores ficam guardados no runtime. Para
manter:

```js
V.config.cleanAttributes = false;
```

Ou use `data-keep-attributes` na tag `<script>`.

### Meu CSS parou de funcionar depois de atualizar

Provavelmente ele dependia de um seletor de atributo, como `[v-tab] { ... }`. Como os atributos
saem do HTML, esses seletores deixam de casar. Use classes. As directives de interface já aplicam
classes próprias: `v-tab`, `v-active`, `v-drawer-panel`, `v-dropzone` e assim por diante.

### `el.getAttribute('v-algo')` devolve null

Mesmo motivo. Se você precisa ler o valor original de dentro de uma directive própria, use as
funções de leitura do runtime, que consultam o cache. De fora, guarde o valor em um `data-`
comum.

### Funciona com Content Security Policy restritiva?

Sim, sem `unsafe-eval`. As expressões passam por um parser e um interpretador próprios. Só o
`style-src` precisa de `'unsafe-inline'`, por causa do CSS injetado, e isso pode ser dispensado
com `data-no-styles`. Veja [Segurança](seguranca.md).

### Quais navegadores são suportados?

Os builds têm alvo `es2018` e usam APIs modernas como `Proxy`, `fetch`, `IntersectionObserver`,
`MutationObserver` e `AbortController`. Na prática: qualquer navegador atualizado dos últimos
anos. Não há suporte a Internet Explorer, e nem haverá.

### Funciona em Node?

Os módulos puros sim: reatividade, HTTP, utilitários e o parser não tocam no DOM. O que depende de
DOM só roda no navegador. Não existe renderização no servidor.

### A biblioteca tem dependências?

Nenhuma em tempo de execução. Em desenvolvimento existem `tsup`, `typescript`, `vitest`, `jsdom` e
`prettier`.

## Uso do dia a dia

### Como faço algo assim que a página carrega?

```html
<div v-data="{ dados: null }" v-init="carregar()"></div>
```

Ou `V.ready(fn)` em JavaScript, ou o evento `voodoo:ready`.

### Como acesso um elemento?

```html
<input v-ref="busca">
<button v-click="$refs.busca.focus()">Focar</button>
```

Dentro de manipuladores, `$el` é o elemento que declarou a directive.

### Como faço uma requisição sem escrever JavaScript?

```html
<button v-get="/api/usuarios" v-target="#lista">Carregar</button>
<div id="lista"></div>
```

Para guardar no estado em vez de escrever no DOM, use `v-as`. Para ter estado completo com
carregando e erro, use `v-resource`.

### Como sei se uma requisição está em andamento?

Com `v-resource`, é `recurso.loading`. Em formulários, é `$form.loading`. Nas directives de verbo,
use `v-loading="#spinner"` e `v-disable-loading`.

### Meu `v-for` perde o foco do campo quando a lista muda

Falta `:key`. Sem chave os blocos são identificados pela posição e recriados. Com chave eles são
reaproveitados.

```html
<li v-for="item in itens" :key="item.id">...</li>
```

### `v-if` e `v-for` no mesmo elemento não funcionam

Os dois são terminais, então um assume o controle e o outro não roda. Coloque o `v-if` em um
filho:

```html
<div v-for="n in lista">
  <span v-if="n % 2 === 0">{ n }</span>
</div>
```

### Como escrevo uma função com várias linhas em um atributo?

Não escreva. O parser aceita expressões, não blocos. Coloque a lógica em um método:

```js
V.data({ limpar() { this.itens = []; this.total = 0; } });
```

```html
<button v-click="limpar">Limpar</button>
```

### `window`, `document` e `fetch` são `undefined` nas expressões

É proposital. Apenas uma lista fechada de globais é liberada. Para chegar ao DOM e a serviços, use
as magias: `$el`, `$refs`, `$http`, `$storage`, `$clipboard`. Para liberar algo seu:

```js
V.config.globals.minhaFuncao = minhaFuncao;
```

### Como faço debounce com um tempo diferente de 250 ms?

Nos eventos, faça o debounce na função:

```js
V.data({ buscar: V.debounce((t) => carregar(t), 600) });
```

No `v-model`, use o atributo:

```html
<input v-model.debounce="busca" v-debounce="600">
```

Nas directives HTTP, `v-debounce` funciona direto.

### Elementos criados por JavaScript ganham directives?

Sim. Um `MutationObserver` inicializa o que aparece no DOM depois do carregamento. Se você
desligou com `data-no-observer`, chame `V.walk(elemento)` à mão.

### Como faço uma máscara e mando o valor limpo para o servidor?

```html
<input v-mask.unmask="cpf" v-model="form.cpf" v-cpf>
```

A tela mostra `123.456.789-01` e o estado guarda `12345678901`.

### Como troco as mensagens de validação?

```js
Object.assign(V.messages, { required: 'Campo obrigatório.' });
```

Para um campo específico, `v-error-message="..."`.

### Como valido no servidor e mostro o erro no campo certo?

Devolva 422 com `{ "errors": { "email": "Já cadastrado" } }`. O `v-submit` distribui as mensagens
para os campos pelo `name`, e as que não têm campo correspondente aparecem em um resumo no topo.

### O `v-sortable` reordena o meu array?

Não. Ele move os elementos no DOM. Escute `voodoo:sorted` e reordene o array, ou salve a ordem no
servidor. Sem isso, a próxima renderização volta à ordem antiga.

### Dá para usar junto com Bootstrap, Tailwind ou o meu CSS?

Sim. A Voodoo não impõe estilo. As directives de interface injetam apenas o mínimo, e você pode
desligar com `data-no-styles`. Para o Tailwind, aponte as cores do tema para as variáveis
`--v-*` e as duas coisas passam a andar juntas.

### Dá para usar junto com jQuery, Alpine ou Vue?

Sim, todas usam o DOM padrão. Marque a região de outra biblioteca com `v-ignore` para que a Voodoo
não toque nela.

### Como faço testes?

O núcleo funciona em jsdom. O padrão do projeto é montar um trecho, percorrer e conferir:

```js
import { walk } from 'voodoojs';

document.body.innerHTML = '<div v-data="{ n: 0 }"><b v-text="n"></b></div>';
V.start();
await V.nextTick();
expect(document.querySelector('b').textContent).toBe('0');
```

`V.flushSync()` aplica tudo que está pendente sem esperar microtask.

## Erros comuns

### Nada acontece, o HTML aparece cru

Confira se o script carregou e se ele não está com `data-manual` sem uma chamada a `V.start()`.
Confira também o console: erros de sintaxe em expressões aparecem lá com a posição exata.

### O conteúdo pisca antes de renderizar

Use `v-cloak` com a regra de CSS:

```html
<style>[v-cloak] { display: none !important; }</style>
<div v-cloak v-data="{}">...</div>
```

### `Maximum call stack` ou aviso de laço no console

Algum efeito está escrevendo na mesma chave que lê. O agendador para a repetição e avisa. Reveja
a expressão, geralmente um `v-effect` que atribui a uma variável que ele mesmo lê.

### O componente não enxerga o `v-data` que está em volta

É o comportamento padrão: componentes isolam o escopo, para não dependerem por acidente do lugar
onde foram colados. Passe por props, ou ligue `inheritScope: true` na definição.

### O slot não enxerga o estado do componente

Também é o comportamento esperado, e é igual ao do Vue: o conteúdo do slot pertence ao escopo do
pai. Slots com escopo não existem.

### A tradução some ao trocar de idioma

Se você usou `v-t-params`, os valores são lidos apenas na primeira renderização. Use a
interpolação reativa:

```html
<span>{ $t('itens', { n: total }) }</span>
```

### A confirmação aparece duas vezes

Isso acontece quando `v-confirm` está no mesmo elemento de um `v-get`, `v-post`, `v-put`,
`v-patch`, `v-delete` ou `v-submit`: as duas camadas leem o mesmo atributo. Deixe a pergunta em um
lugar só:

```html
<button v-confirm="Excluir?" v-click="$http.delete('/api/x').then(() => lista.reload())">
  Excluir
</button>
```

### O gráfico volta a ser de linha quando os dados mudam

Os atributos `v-chart-*` são lidos na montagem. Com dados reativos, declare tudo no objeto:

```html
<div v-chart="{ type: 'bar', data: vendas }"></div>
```

## Projeto

### Qual é a licença?

MIT.

### Como reporto um bug?

Abra uma issue com um exemplo mínimo que reproduza o problema, de preferência um HTML de uma
página só. Veja [Contribuindo](contribuindo.md).

### Como peço um recurso novo?

Abra uma issue de proposta explicando o problema antes da solução. O que está fora do escopo hoje
está listado no roadmap da [Introdução](introducao.md).

### Como contribuo com código?

```bash
npm install
npm test
npm run typecheck
npm run build
npm run size
```

O guia completo está em [Contribuindo](contribuindo.md).

---

Anterior: [Migrando do Vue](migrando-do-vue.md) · Próximo: [Contribuindo](contribuindo.md)
