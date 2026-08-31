# Expressões

Tudo que você escreve dentro de um atributo `v-*` ou entre chaves é uma expressão. Ela não passa
por `eval` nem por `new Function`. O texto vai para um lexer, depois para um parser Pratt e por
fim para um interpretador de árvore, todos escritos à mão dentro da biblioteca.

Isso tem duas consequências diretas: a biblioteca funciona com Content Security Policy restritiva,
sem `unsafe-eval`, e a linguagem aceita apenas um subconjunto de JavaScript, escolhido de
propósito.

## Interpolação

A forma padrão é a chave simples:

```html
<p>Olá, { nome }! Você tem { itens.length } itens.</p>
```

A chave dupla também é aceita, para quem vem do Vue e para textos que precisam conter chaves
literais em volta:

```html
<p>{{ nome }}</p>
```

Regras:

- várias interpolações no mesmo nó de texto funcionam;
- qualquer expressão vale: `{ a + b }`, `{ total > 0 ? 'sim' : 'não' }`, `{ lista.join(', ') }`;
- dentro de `<pre>`, `<code>`, `<script>`, `<style>` e `<textarea>` a interpolação é ignorada,
  porque ali as chaves quase sempre são código.

Valores são convertidos assim:

| Valor | Vira |
| --- | --- |
| `null` e `undefined` | texto vazio |
| número e booleano | `String(valor)` |
| `Date` | `toLocaleString()` |
| objeto e array | `JSON.stringify(valor)` |
| qualquer outro | `String(valor)` |

## O que é aceito

**Literais**

```js
42
0x1f            // 31
1_000           // 1000
3.14
"texto"
'texto'
`Olá, ${nome}!`  // template literal com interpolação
true, false, null, undefined
[1, 2, 3]
{ a: 1, b: 'dois' }
{ count }        // atalho de chave, vira { count: count }
[...lista, 3]    // spread
{ ...base, b: 2 }
```

**Operadores**

```js
+  -  *  /  %  **                 // aritmética, com precedência correta
==  !=  ===  !==  <  >  <=  >=    // comparação
&&  ||  ??                        // lógica, com avaliação curta
!  -  +  typeof  void             // unários
? :                               // ternário
in  instanceof
++  --                            // prefixo e sufixo
=  +=  -=  *=  /=  %=  **=  &&=  ||=  ??=
,  ;                              // sequência de instruções
```

**Acesso e chamadas**

```js
usuario.nome
lista[1]
obj[chave]
usuario?.perfil?.nome     // encadeamento opcional
fn?.()
lista.filter(n => n > 1)
lista.map(n => n * 2).join('-')
lista.reduce((total, n) => total + n, 0)
```

**Arrow functions**

Só a forma de expressão, com corpo único:

```js
n => n * 2
(a, b) => a + b
```

Elas enxergam o escopo externo, como você espera.

## O que não é aceito

Por decisão de projeto, e não por falta de tempo:

- `function`, `class`, `new`, `delete`;
- `import`, `await`, `async`;
- `for`, `while`, `do`, `try`, `switch`;
- desestruturação em parâmetros e em atribuições;
- corpo de arrow function em bloco (`n => { ... }`).

A ideia é simples: expressões de atributo devem ser curtas. Lógica maior vive em um método de
componente, em uma função no escopo ou em um bloco `<script>`.

```html
<!-- em vez disto -->
<button v-click="itens = itens.filter(i => !i.feito); total = itens.length; salvar()">Limpar</button>

<!-- prefira isto -->
<button v-click="limparConcluidos">Limpar</button>
```

```js
V.data({
  limparConcluidos() {
    this.itens = this.itens.filter((i) => !i.feito);
    this.total = this.itens.length;
    salvar();
  },
});
```

## Escopo

Um identificador é procurado subindo a cadeia de escopos: o `v-data` mais próximo, depois os
ancestrais, depois a raiz. Só quando nada é encontrado a busca cai nas variáveis mágicas e na
lista de globais permitidos.

```html
<div v-data="{ titulo: 'Voodoo' }">
  <div v-data="{ item: 'x' }">
    <span>{ titulo }{ item }</span>   <!-- 'Voodoox' -->
  </div>
</div>
```

Escrever em um identificador escreve no escopo que já contém aquela chave:

```html
<div v-data="{ contador: 0 }">
  <div v-for="n in 3">
    <button v-click="contador++">+</button>   <!-- escreve no escopo de fora -->
  </div>
</div>
```

Uma chave nova é criada no escopo local, e não vaza para cima.

## Globais permitidos

Identificadores que não estão em nenhum escopo são procurados em uma lista fechada:

```
Math  JSON  Date  Number  String  Boolean  Array  Object  Intl  RegExp  Promise
parseInt  parseFloat  isNaN  isFinite  encodeURIComponent  decodeURIComponent  console
```

Tudo fora dessa lista devolve `undefined`:

```js
window       // undefined
document     // undefined
fetch        // undefined
eval         // undefined
globalThis   // undefined
localStorage // undefined
```

Isso é proposital. Um atributo vindo do banco de dados não consegue alcançar a API do navegador.
Para chegar ao DOM e a serviços, use as variáveis mágicas, que são explícitas: `$el`, `$refs`,
`$http`, `$storage`, `$clipboard`.

### Liberando os seus próprios globais

```js
V.config.globals.formatarCPF = (v) => V.applyMask(v, 'cpf');
V.config.globals.APP = { versao: '2.1', ambiente: 'producao' };
```

```html
<span>{ formatarCPF(usuario.cpf) }</span>
<small>v{ APP.versao }</small>
```

Os globais declarados em `V.config.globals` entram em vigor quando `V.start()` roda. Se você
adicionar depois, use a lista direto:

```js
import { allowedGlobals } from 'voodoojs';
allowedGlobals.MinhaLib = { versao: '1.0' };
```

## Variáveis mágicas

Nomes começando com cifrão existem em qualquer expressão, sem precisar declarar nada.

```html
<button v-click="$toast.success('Salvo')">Salvar</button>
<div v-show="$screen.mobile">Você está no celular</div>
<p v-show="!$network.online">Você está offline.</p>
<span>{ $store.carrinho.total }</span>
```

A lista completa está em [API](api.md#variáveis-mágicas). As principais:

| Magia | O que é |
| --- | --- |
| `$el` | Elemento que criou o escopo |
| `$refs` | Elementos marcados com `v-ref` |
| `$store` | Todos os stores globais |
| `$http` | Cliente HTTP |
| `$toast` | Notificações |
| `$event`, `$detail` | Dentro de manipuladores de evento |
| `$form` | Estado do formulário mais próximo |
| `$screen`, `$network`, `$device`, `$theme` | Ambiente reativo |

## Erros

Um erro em uma expressão nunca derruba a página. Ele é reportado ao tratador global com o texto
original anexado:

```
VoodooRuntimeError: "salvarr" nao e uma funcao

Expressao: salvarr()
```

Erros de sintaxe apontam a posição exata:

```
VoodooSyntaxError: Esperava ")" mas encontrou "fim da expressao"

lista.filter(n => n > 1
                       ^
```

Ligue `V.config.devtools = true` para ver mais detalhes no console.

## Cache

Cada expressão é analisada uma única vez e a árvore fica em cache. Reexecutar um efeito não
reanalisa o texto. `V.clearParseCache()` limpa o cache, o que só é útil em testes.

## Content Security Policy

A Voodoo.js funciona com uma política restritiva:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

O `'unsafe-inline'` em `style-src` é necessário porque a biblioteca injeta o CSS dos componentes
de interface em tempo de execução. Para dispensá-lo, desligue a injeção e carregue o CSS por
conta própria:

```html
<script src="voodoo.min.js" data-no-styles defer></script>
<link rel="stylesheet" href="/css/voodoo-ui.css">
```

Nenhum `unsafe-eval` é necessário em nenhuma configuração. Veja [Segurança](seguranca.md).

## API do parser

Para casos avançados, o parser está exposto:

```js
const arvore = V.parse('usuario.nome.toUpperCase()');
V.evaluate(arvore, V.scope);          // avalia na raiz
V.evaluateIn('a + b', escopo);        // analisa e avalia de uma vez
V.tokenize('1 + 2');                  // lista de tokens
V.stringify(valor);                   // conversão usada na interpolação
```

---

Anterior: [Reatividade](reatividade.md) · Próximo: [Directives](directives.md)
