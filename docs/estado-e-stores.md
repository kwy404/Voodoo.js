# Estado e stores

Existem três lugares para guardar estado na Voodoo.js, do mais local para o mais global:

1. **`v-data`**, um escopo ligado a um trecho de HTML;
2. **`V.data()`**, o escopo raiz, visível para a página inteira;
3. **`V.store()`**, stores nomeados, acessíveis por `$store`.

## v-data e a cadeia de escopos

```html
<div v-data="{ aberto: false, itens: [] }">
  <button v-click="aberto = !aberto">Alternar</button>
  <ul v-show="aberto">
    <li v-for="item in itens">{ item }</li>
  </ul>
</div>
```

Cada `v-data` cria um escopo reativo filho. Escopos aninham:

```html
<div v-data="{ titulo: 'Loja' }">
  <h1>{ titulo }</h1>

  <div v-data="{ produto: 'Caneca' }">
    <p>{ titulo }: { produto }</p>   <!-- Loja: Caneca -->
  </div>

  <p>{ produto }</p>                 <!-- vazio, o filho não vaza -->
</div>
```

Escopos irmãos são independentes. Um `v-for` também cria um escopo por item, com as variáveis do
laço.

### Leitura e escrita

A leitura sobe a cadeia até achar a chave. A escrita vai para o **escopo que já contém a chave**:

```html
<div v-data="{ total: 0 }">
  <div v-for="n in 3">
    <button v-click="total += n">+{ n }</button>   <!-- escreve no escopo de fora -->
  </div>
</div>
```

Uma chave que não existe em lugar nenhum é criada no escopo local.

### Funções no escopo

Coloque funções direto no `v-data` para expressões mais limpas:

```html
<div v-data="{ itens: [], adicionar(texto) { this.itens.push(texto) } }">
  <button v-click="adicionar('novo')">Adicionar</button>
</div>
```

O parser não aceita `function`, então declare a função em um `<script>` e coloque no escopo raiz:

```js
V.data({
  formatarMoeda(valor) {
    return V.formatCurrency(valor);
  },
});
```

```html
<span>{ formatarMoeda(pedido.total) }</span>
```

## O escopo raiz

`V.data()` coloca valores no escopo raiz, visíveis para qualquer expressão da página:

```js
V.data({
  usuario: null,
  carregando: false,
  entrar(email) {
    this.carregando = true;
    return V.http.post('/api/login', { email }).finally(() => { this.carregando = false; });
  },
});
```

```html
<span v-show="usuario">Olá, { usuario.nome }</span>
<button v-click="entrar(email)" :disabled="carregando">Entrar</button>
```

O escopo raiz é reativo, então qualquer valor colocado ali atualiza a página sozinho. Ele também
está disponível como `$root` dentro de qualquer expressão, e como `V.scope` no JavaScript.

## Stores

Um store é um objeto reativo nomeado, acessível de qualquer expressão por `$store`:

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
  },
});
```

```html
<span>{ $store.carrinho.itens.length } itens</span>
<span>{ $store.carrinho.total() }</span>
<button v-click="$store.carrinho.adicionar(produto)">Adicionar</button>
<button v-click="$store.carrinho.limpar()">Limpar</button>
```

Métodos declarados no store recebem `this` apontando para o próprio store. Para valores derivados
use um método, como o `total()` acima: propriedades com `get` são resolvidas uma única vez na
criação e não acompanham as mudanças.

### Persistência

```js
V.store('preferencias', { tema: 'system', idioma: 'pt-BR' }, { persist: true });
```

O store é gravado no `localStorage` a cada mudança e restaurado no próximo carregamento. Passe um
texto em `persist` para escolher a chave: `{ persist: 'app:prefs' }`.

Funções não são gravadas. A chave padrão é `voodoo:store:<nome>`.

### API dos stores

```js
V.store('carrinho');            // recupera o store existente
V.store('carrinho', { ... });   // cria, ou atualiza os valores mantendo a referência
V.stores;                       // objeto com todos os stores, o mesmo que $store
V.storeNames();                 // ['carrinho', 'preferencias']
V.removeStore('carrinho');      // remove e para a persistência
```

## v-persist

Guarda o escopo de um `v-data` no `localStorage` e restaura no próximo carregamento:

```html
<div v-data="{ tema: 'escuro', rascunho: '' }" v-persist="editor">
  <textarea v-model="rascunho"></textarea>
</div>
```

Detalhes:

- a chave vira `voodoo:persist:editor`;
- sem valor, a chave é derivada do caminho da página e da posição do elemento;
- só as chaves que o estado atual declara são restauradas, então adicionar um campo novo ao
  `v-data` não quebra o que já estava salvo;
- funções, valores começando com cifrão e estruturas circulares ficam de fora;
- a gravação tem debounce de 120 ms;
- ao remover o elemento, a gravação pendente é aplicada e o observador é encerrado.

## v-sync

Mantém o escopo em sincronia com as outras abas abertas, ao vivo, usando `BroadcastChannel`:

```html
<div v-data="{ contador: 0 }" v-sync="painel">
  <button v-click="contador++">{ contador }</button>
</div>
```

Abra a página em duas abas e clique. As duas mudam juntas.

Sem valor, o nome do canal é derivado da posição do elemento. Em navegadores sem
`BroadcastChannel`, a directive simplesmente não faz nada. Combine com `v-persist` quando quiser
sincronia entre abas **e** sobrevivência ao recarregar:

```html
<div v-data="{ filtro: '' }" v-persist="lista" v-sync="lista"></div>
```

## v-history, v-undo e v-redo

Desfazer e refazer para o escopo inteiro:

```html
<div v-data="{ texto: '', cor: '#000' }" v-history="50">
  <textarea v-model="texto"></textarea>
  <input type="color" v-model="cor">

  <button v-undo :disabled="!$history.canUndo">Desfazer</button>
  <button v-redo :disabled="!$history.canRedo">Refazer</button>
  <small>{ $history.size } estados guardados</small>
</div>
```

O valor de `v-history` é o limite de instantâneos, com padrão 50. Um instantâneo é gravado 300 ms
depois da última mudança. Escrever depois de desfazer descarta o futuro, como em qualquer editor.

`$history` expõe:

| Campo | O que é |
| --- | --- |
| `canUndo`, `canRedo` | Booleanos reativos |
| `size` | Quantidade de estados guardados |
| `undo()`, `redo()` | Navega no histórico |
| `clear()` | Apaga tudo e recomeça do estado atual |

`v-undo` e `v-redo` ligam o clique ao controlador mais próximo na árvore.

## v-storage

Liga um campo isolado ao `localStorage`, sem passar por um escopo:

```html
<input v-storage="rascunho-do-comentario" placeholder="Escreva algo">
```

O valor é gravado a cada tecla na chave `voodoo:field:<nome>` e restaurado ao carregar.

## Armazenamento por JavaScript

```js
V.storage.set('usuario', { id: 1, nome: 'Ana' });   // localStorage com JSON
V.storage.get('usuario', {});                       // com valor padrão
V.storage.remove('usuario');
V.storage.has('usuario');
V.storage.keys();
V.storage.clear();

V.session.set('passo', 2);                          // sessionStorage, mesma API

V.cookie.set('token', 'abc', { expires: 7, sameSite: 'Lax', secure: true });
V.cookie.get('token');
V.cookie.remove('token');

V.cache.set('produtos', lista, 60_000);             // memória, com expiração
V.cache.get('produtos');
await V.cache.remember('cep:01001000', 3_600_000, () => V.http.get('/api/cep/01001000'));

V.url.get('pagina');                                 // query string
V.url.set('pagina', 2);                              // sem recarregar
V.url.merge({ ordem: 'nome', pagina: 1 });
V.url.all();
```

Todas as leituras e escritas são seguras: em modo privado, com cota cheia ou fora do navegador,
as chamadas não lançam erro.

Dentro do HTML, cada um tem a magia correspondente: `$storage`, `$session`, `$cookie`, `$cache`,
`$url`.

```html
<button v-click="$storage.set('visto', true)">Não mostrar de novo</button>
<p v-show="!$storage.get('visto')">Dica importante</p>
```

## Barramento de eventos

Para conversas soltas entre partes distantes da página:

```js
const off = V.on('pedido:criado', (pedido) => V.toast.success(`Pedido ${pedido.id} criado`));
V.once('app:pronto', () => console.log('só na primeira vez'));
V.emit('pedido:criado', { id: 42 });
off();                       // cancela uma assinatura
V.off('pedido:criado');      // cancela todas do evento
```

No HTML, `$dispatch` dispara um `CustomEvent` que sobe pela árvore:

```html
<button v-click="$dispatch('filtro:mudou', { termo: busca })">Buscar</button>
<div @filtro:mudou="aplicar($detail)"></div>
```

## Qual usar

| Situação | Escolha |
| --- | --- |
| Estado de um bloco de HTML | `v-data` |
| Valor usado por toda a página | `V.data()` |
| Carrinho, usuário logado, preferências | `V.store()` |
| Precisa sobreviver ao recarregar | `v-persist` ou `store` com `persist` |
| Precisa acompanhar outras abas | `v-sync` |
| Precisa de desfazer | `v-history` |
| Um único campo de texto | `v-storage` |

---

Anterior: [Componentes prontos](componentes-prontos.md) · Próximo: [Eventos](eventos.md)
