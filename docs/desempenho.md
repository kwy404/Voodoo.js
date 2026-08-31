# Desempenho

## Como as atualizações granulares funcionam

Não existe Virtual DOM. Não existe comparação de árvores. Não existe rerender de componente.

O modelo é: **um `Proxy` que rastreia leitura por chave, e um efeito por pedaço de DOM**.

```html
<div v-data="{ nome: 'Ana', idade: 30 }">
  <p v-text="nome"></p>       <!-- efeito 1, depende de "nome" -->
  <p v-text="idade"></p>      <!-- efeito 2, depende de "idade" -->
  <p>{ nome } tem { idade }</p> <!-- efeito 3, depende dos dois -->
</div>
```

Quando `nome` muda:

1. o `set` do proxy compara o valor novo com o antigo, e para ali se forem iguais;
2. os efeitos que leram a chave `nome` são colocados em uma fila;
3. a fila é processada em uma microtask, com cada efeito rodando uma vez só;
4. o efeito 1 escreve em um `textContent`, e o efeito 3 recompõe o texto dele.

O efeito 2 nunca é executado. O segundo parágrafo não é lido, não é comparado e não é tocado.

O caminho da mudança até o pixel é: `set` no proxy, fila, `textContent`. Nada mais.

## Lote e microtask

Várias mudanças na mesma tarefa viram uma única passada:

```js
estado.a = 1;
estado.b = 2;
estado.c = 3;
// os efeitos afetados rodam uma vez só, na microtask
await V.nextTick();
```

Efeitos duplicados são deduplicados dentro da rodada. Se um efeito reexecutar demais na mesma
rodada, o agendador percebe o laço e para com um aviso, em vez de travar a aba.

## Tamanho

| Arquivo | Cru | gzip | brotli |
| --- | --- | --- | --- |
| `voodoo.min.js` | cerca de 235 KB | cerca de 75 KB | cerca de 64 KB |
| `voodoo.full.min.js` | cerca de 399 KB | cerca de 120 KB | cerca de 100 KB |

Os números mudam a cada versão. O script `npm run size` mede os arquivos reais e falha quando
algum estoura a meta declarada, então a regressão de tamanho é pega no CI.

Para importações por bundler, tudo é tree shakeable:

```js
import { debounce } from 'voodoojs/utils';   // só o debounce entra no seu build
import { reactive } from 'voodoojs/reactivity';
import { http } from 'voodoojs/http';
```

Para um bundle de navegador sob medida, com apenas os módulos que você usa:

```bash
npx voodoo build
```

## Boas práticas

### Use `:key` no v-for

Sem chave, os blocos são identificados pela posição. Com chave, eles são reaproveitados quando a
lista muda de ordem, e o estado interno (foco, valor digitado, rolagem, animação) sobrevive.

```html
<li v-for="produto in produtos" :key="produto.id">{ produto.nome }</li>
```

### Prefira v-show a v-if para alternância frequente

`v-if` monta e desmonta de verdade. `v-show` só troca o `display`.

```html
<div v-show="abaAtiva === 'perfil'">...</div>   <!-- alterna muito -->
<div v-if="usuario.admin">...</div>              <!-- decide uma vez -->
```

### Deixe as expressões curtas

Toda expressão de atributo é reavaliada quando uma dependência muda. Cálculos caros ficam melhores
em um computado de componente ou em uma função.

```html
<!-- reavalia a lista inteira a cada mudança -->
<span>{ pedidos.filter(p => p.pago).reduce((s, p) => s + p.total, 0) }</span>

<!-- calcula uma vez e reaproveita -->
<span>{ totalPago }</span>
```

```js
V.component('painel', {
  computed: {
    totalPago() {
      return this.pedidos.filter((p) => p.pago).reduce((s, p) => s + p.total, 0);
    },
  },
});
```

### Não crie objetos e arrays dentro de expressões reativas

```html
<!-- cria um objeto novo a cada avaliação -->
<div :style="{ width: largura + 'px' }"></div>
```

Para um caso simples como esse não há problema. Em uma lista com centenas de itens, prefira
calcular no estado.

### Marque o que não precisa ser reativo

```js
V.data({
  mapa: V.markRaw(new google.maps.Map(el)),
  editor: V.markRaw(criarEditor()),
});
```

Instâncias de bibliotecas externas, elementos de DOM e estruturas grandes que você substitui
inteiras não ganham nada em virar proxy.

### Use debounce em entradas de texto

```html
<input v-model.debounce="busca" v-debounce="300">
<input v-search="/api/buscar" v-debounce="400" v-min-length="3">
```

### Cachê de requisições

```html
<div v-resource="paises: /api/paises" v-cache="1h"></div>
```

```js
await V.http.get('/api/config', { cache: 300_000 });
```

### Carregue imagens sob demanda

```html
<img v-lazy-src="/fotos/grande.jpg" alt="">
```

### Carregue trechos da página sob demanda

```html
<section v-load-visible="/parciais/depoimentos.html">Carregando...</section>
```

### Prefira listas paginadas

O `v-for` renderiza todos os itens da fonte, sem virtualização. Uma lista com dez mil linhas cria
dez mil elementos. Pagine, ou use rolagem infinita:

```html
<ul v-infinite-scroll="carregarProxima()">
  <li v-for="item in itens" :key="item.id">{ item.nome }</li>
</ul>
```

### Desligue o observador quando não precisar

O `MutationObserver` que inicializa HTML criado depois custa pouco, mas em páginas que mexem muito
no DOM por conta própria ele pode ser dispensado:

```html
<script src="voodoo.min.js" data-no-observer defer></script>
```

```js
V.walk(novoElemento);  // inicialize à mão quando precisar
```

### Escolha o bundle certo

Se a página não tem gráfico, rota, tradução nem componente pronto, use `voodoo.min.js`. São
dezenas de kilobytes de diferença por visita.

## O que a biblioteca já faz por você

- **Interpolação segmentada.** Um nó de texto com três expressões vira um único efeito que
  recompõe apenas aquele nó.
- **Reordenação por cursor.** O `v-for` move os blocos existentes em vez de recriar.
- **Cache do parser.** Cada expressão é analisada uma vez, e a árvore fica guardada.
- **CSS sob demanda.** O estilo de um componente de interface só entra no documento quando aquele
  recurso é usado.
- **Requisições canceladas.** Uma nova requisição do mesmo elemento aborta a anterior.
- **Um único laço de animação.** Todas as animações ativas compartilham o mesmo
  `requestAnimationFrame`.
- **Limpeza automática.** Remover um elemento do DOM para os efeitos dele, remove os ouvintes e
  encerra observadores. Não existe vazamento por esquecimento.
- **Redesenho barato dos gráficos.** O SVG é gerado como texto e entregue de uma vez.

## Medindo

```js
V.config.devtools = true;   // avisos e âncoras nomeadas
V.xray();                   // aba de desempenho, com efeitos por elemento
```

Na aba de desempenho do inspetor, cada elemento mostra quantos efeitos dependem dele e quantas
vezes cada um reexecutou. Um número alto em um lugar pequeno costuma ser expressão demais em um
bloco só.

Para medir o tamanho no seu próprio projeto:

```bash
npm run size
```

---

Anterior: [Segurança](seguranca.md) · Próximo: [Migrando do jQuery](migrando-do-jquery.md)
