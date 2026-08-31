# Utilitários

Funções puras, sem nenhuma dependência do DOM, então o módulo roda igual em navegador, Node, Bun e
Deno. Tudo aqui é tree shakeable.

Elas estão no objeto `V` e também no ponto de entrada dedicado:

```js
import { debounce, formatCurrency, slugify } from 'voodoojs/utils';
```

---

## Identificadores e tempo

### uuid

```js
V.uuid();  // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

UUID v4. Usa `crypto.randomUUID` quando disponível, com dois planos B.

### uid

```js
V.uid();          // 'vk3f9a2'
V.uid('campo-');  // 'campo-k3f9a2'
```

Identificador curto, útil para ids de elementos.

### sleep

```js
await V.sleep(500);
```

### parseDuration

```js
V.parseDuration(300);      // 300
V.parseDuration('300');    // 300
V.parseDuration('300ms');  // 300
V.parseDuration('1.5s');   // 1500
V.parseDuration('2m');     // 120000
V.parseDuration('1h');     // 3600000
V.parseDuration(null, 99); // 99
```

Aceita `null` porque a origem mais comum é `getAttribute`.

---

## Funções de ordem superior

### debounce

Adia a execução até parar de ser chamada.

```js
const buscar = V.debounce(carregarProdutos, 300);
buscar('cane');
buscar('caneca');   // só esta executa

buscar.cancel();    // descarta a chamada pendente
buscar.flush();     // executa agora, sem esperar
```

O terceiro argumento executa na borda de entrada em vez da de saída:

```js
const salvarAgora = V.debounce(salvar, 1000, true);
```

### throttle

No máximo uma execução por intervalo.

```js
const acompanhar = V.throttle(medirRolagem, 100);
window.addEventListener('scroll', acompanhar, { passive: true });
acompanhar.cancel();
```

### once

Executa uma única vez e memoriza o retorno.

```js
const iniciar = V.once(() => criarConexao());
iniciar();
iniciar();  // devolve a mesma conexão
```

> Cuidado com o nome: `V.once` no objeto global é o barramento de eventos
> (`V.once('evento', handler)`). O utilitário está disponível no import direto:
> `import { once } from 'voodoojs/utils'`.

### memoize

Cache de resultado por argumento.

```js
const calcular = V.memoize((a, b) => operacaoCara(a, b));
calcular(1, 2);
calcular(1, 2);       // vem do cache
calcular.cache.clear();

const porId = V.memoize(buscar, (id) => String(id));  // chave própria
```

---

## Objetos e arrays

### clone

Cópia profunda. Usa `structuredClone` quando existir, com caminho manual para objetos com funções.
Entende `Date`, `Map` e `Set`.

```js
const copia = V.clone(estadoOriginal);
```

### merge

Mescla em profundidade. Arrays são substituídos, não concatenados.

```js
V.merge({ a: { b: 1 } }, { a: { c: 2 } });  // { a: { b: 1, c: 2 } }
V.merge(padroes, doUsuario, deQuery);
```

O primeiro objeto é modificado. Passe `{}` na frente quando quiser preservar.

### groupBy

```js
V.groupBy(pedidos, 'status');
V.groupBy(pessoas, (p) => p.idade >= 18 ? 'adulto' : 'menor');
```

### unique

```js
V.unique([1, 2, 2, 3]);              // [1, 2, 3]
V.unique(usuarios, 'id');
V.unique(pontos, (p) => `${p.x},${p.y}`);
```

### chunk

```js
V.chunk([1, 2, 3, 4, 5], 2);  // [[1, 2], [3, 4], [5]]
```

### sortBy

Ordena sem alterar o array original. Textos usam `localeCompare` com ordenação numérica, o que
resolve `item 2` antes de `item 10`. Valores nulos vão para o fim.

```js
V.sortBy(produtos, 'preco');
V.sortBy(produtos, 'preco', 'desc');
V.sortBy(usuarios, (u) => u.perfil.nome);
```

### get e set

Leitura e escrita de caminhos aninhados, com segurança.

```js
V.get(dados, 'usuario.endereco.cidade');
V.get(dados, 'lista.0.nome', 'sem nome');

V.set(form, 'endereco.rua', 'Av. Paulista');
V.set(form, 'itens.0.qtd', 2);
```

`set` cria os objetos do meio, e usa array quando a próxima chave é numérica.

### random e sample

```js
V.random(1, 6);        // inteiro entre 1 e 6, inclusive
V.sample(['a', 'b']);  // um item qualquer
```

---

## Textos

### slugify

```js
V.slugify('Ação e Reação');       // 'acao-e-reacao'
V.slugify('Meu Post', '_');       // 'meu_post'
```

### truncate

```js
V.truncate('Um texto bem longo', 10);          // 'Um text...'
V.truncate('Um texto bem longo', 10, '…');     // 'Um texto…'
```

### capitalize e titleCase

```js
V.capitalize('voodoo');           // 'Voodoo'
V.titleCase('JAVASCRIPT feels');  // 'Javascript Feels'
```

### escapeHtml e stripTags

```js
V.escapeHtml('<b>oi</b>');   // '&lt;b&gt;oi&lt;/b&gt;'
V.stripTags('<b>oi</b>');    // 'oi'
```

`escapeHtml` é o caminho seguro para montar HTML na mão. `stripTags` remove tags de forma
simples, e **não** serve como sanitizador de segurança. Veja [Segurança](seguranca.md).

---

## Formatadores

Todos usam o locale e a moeda padrão, ajustáveis:

```js
V.setFormatDefaults('pt-BR', 'BRL');
```

O bootstrap já configura isso a partir de `V.config.locale` e `V.config.currency`.

### formatCurrency

```js
V.formatCurrency(1234.5);                              // 'R$ 1.234,50'
V.formatCurrency(99, { currency: 'USD', locale: 'en-US' });  // '$99.00'
```

### formatNumber

```js
V.formatNumber(1234.5678);                                    // '1.234,568'
V.formatNumber(0.75, { style: 'percent' });                   // '75%'
V.formatNumber(1234, { minimumFractionDigits: 2 });           // '1.234,00'
```

### formatDate

```js
V.formatDate(new Date());                     // '28/08/2026'
V.formatDate(pedido.criadoEm, 'long');        // '28 de agosto de 2026'
V.formatDate(pedido.criadoEm, 'full');
V.formatDate(pedido.criadoEm, 'time');        // '14:30'
V.formatDate(pedido.criadoEm, 'datetime');
V.formatDate(pedido.criadoEm, 'DD/MM/YYYY HH:mm:ss');
V.formatDate(pedido.criadoEm, { weekday: 'long', month: 'short' });
```

Aceita `Date`, timestamp ou string ISO. Uma data inválida devolve texto vazio.

Marcadores da máscara textual: `YYYY`, `YY`, `MM`, `DD`, `HH`, `mm`, `ss`.

### relativeTime

```js
V.relativeTime(Date.now() - 300_000);   // 'há 5 minutos'
V.relativeTime(Date.now() + 172_800_000); // 'em 2 dias'
```

### formatFileSize

```js
V.formatFileSize(1536);       // '1.5 KB'
V.formatFileSize(1_048_576);  // '1.0 MB'
V.formatFileSize(1234, 2);    // '1.21 KB'
```

### formatPercent

```js
V.formatPercent(0.256);     // '26%'
V.formatPercent(0.256, 1);  // '25,6%'
```

---

## Ambiente

### isBrowser

```js
if (V.isBrowser) { /* tem DOM */ }
```

### device

Objeto com getters calculados sob demanda:

```js
V.device.touch;          // aparelho com toque
V.device.mobile;         // largura até 767px
V.device.tablet;         // de 768px a 1023px
V.device.desktop;        // a partir de 1024px
V.device.online;
V.device.reducedMotion;  // prefers-reduced-motion: reduce
V.device.darkMode;       // prefers-color-scheme: dark
```

No HTML, use `$device`:

```html
<div v-show="$device.mobile">Versão para celular</div>
<div v-show="!$device.reducedMotion" v-motion="fadeUp">Com animação</div>
```

### screen e network

Diferente de `device`, estes dois são **reativos**: a página se atualiza sozinha quando a janela
muda de tamanho ou a conexão cai.

```html
<div v-show="$screen.mobile">Celular</div>
<div v-show="$screen.desktop">Computador</div>
<span>{ $screen.width } por { $screen.height }</span>
<div v-show="$screen.matches('(min-width: 1400px)')">Tela larga</div>

<div v-show="!$network.online">Você está offline</div>
<div v-show="$network.slow">Conexão lenta, carregando a versão leve</div>
<span>{ $network.type }</span>
```

| Campo de `$screen` | O que é |
| --- | --- |
| `width`, `height` | Dimensões da janela |
| `mobile` | Menos de 768px |
| `tablet` | De 768px a 1023px |
| `desktop` | 1024px ou mais |
| `portrait`, `landscape` | Orientação |
| `matches(query)` | Testa uma media query qualquer |

| Campo de `$network` | O que é |
| --- | --- |
| `online` | Estado da conexão |
| `type` | Tipo informado pelo navegador, como `4g` |
| `saveData` | O usuário pediu economia de dados |
| `slow` | `2g` ou `slow-2g` |

### clipboard

```js
await V.clipboard.copy('texto');   // devolve true quando deu certo
await V.clipboard.read();          // devolve '' quando o usuário não permite
```

No HTML, `$clipboard` ou a directive `v-copy`.

---

## Usando dentro do HTML

Utilitários não são globais nas expressões por padrão. Libere os que você usa:

```js
V.config.globals.formatCurrency = V.formatCurrency;
V.config.globals.formatDate = V.formatDate;
V.config.globals.relativeTime = V.relativeTime;
```

```html
<td>{ formatCurrency(pedido.total) }</td>
<td>{ relativeTime(pedido.criadoEm) }</td>
```

Ou coloque no escopo raiz, que já é visível de qualquer lugar:

```js
V.data({
  moeda: V.formatCurrency,
  data: V.formatDate,
});
```

```html
<td>{ moeda(pedido.total) }</td>
```

---

Anterior: [Plugins](plugins.md) · Próximo: [API](api.md)
