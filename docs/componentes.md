# Componentes

Um componente da Voodoo é um escopo com estado, métodos, computados, watchers, props, slots e
ciclo de vida, montado sobre um elemento que já existe. Não há passo de compilação, nem arquivo
`.vue`, nem JSX.

## Registrando

```js
V.component('contador', {
  props: { inicio: { type: 'number', default: 0 } },
  state(props) {
    return { valor: props.inicio };
  },
  computed: {
    dobro() { return this.valor * 2; },
  },
  methods: {
    somar() { this.valor++; },
    zerar() { this.valor = 0; this.emit('zerado'); },
  },
  watch: {
    valor(novo, antigo) { console.log(antigo, '->', novo); },
  },
  template: `
    <button v-click="somar">+1</button>
    <strong>{ valor }</strong>
    <small>dobro: { dobro }</small>
  `,
  style: `strong { font-size: 1.4rem; }`,
  mounted() { console.log('montado em', this.$el); },
});
```

## Três formas de usar

```html
<!-- 1. atributo -->
<div v-component="contador" inicio="10"></div>

<!-- 2. tag própria -->
<contador inicio="10"></contador>

<!-- 3. tag em PascalCase -->
<Contador inicio="10"></Contador>
```

O nome é normalizado: `UserCard`, `userCard` e `user-card` apontam para o mesmo componente. A
forma PascalCase funciona porque o HTML entrega a tag em minúsculas (`usercard`) e a biblioteca
mantém um mapa de nomes sem hífen.

Escolha um nome com hífen quando registrar: é o que o padrão de elementos customizados espera e o
que evita colisão com tags nativas.

## Props

Duas escritas. A curta, com uma lista de nomes:

```js
V.component('saudacao', {
  props: ['nome', 'idade'],
  template: '<p>{ nome } tem { idade } anos</p>',
});
```

E a completa, com tipo, valor padrão e obrigatoriedade:

```js
V.component('cartao', {
  props: {
    titulo: { type: 'string', default: 'Sem título' },
    total: { type: 'number', default: 0 },
    ativo: { type: 'boolean', default: false },
    tags: { type: 'array', default: [] },
    usuario: { type: 'object' },
    qualquer: { type: 'any' },
    id: { type: 'string', required: true },
  },
});
```

Tipos aceitos: `string`, `number`, `boolean`, `array`, `object`, `any`. Uma prop obrigatória que
não chega gera um aviso no console.

### Estático e reativo

```html
<!-- valor fixo, convertido para o tipo declarado -->
<cartao titulo="Faturamento" total="1200" ativo></cartao>

<!-- ligado ao estado do pai, atualiza sozinho -->
<cartao :titulo="painel.nome" :total="painel.receita" :ativo="painel.ligado"></cartao>
```

Props booleanas aceitam o atributo vazio (`ativo`), o texto (`ativo="true"`) e a ligação reativa
(`:ativo="ligado"`).

Os nomes são resolvidos de forma flexível: `user-name`, `username` e `userName` chegam todos em
`userName`.

Quando o componente **não declara nenhuma prop**, todos os atributos comuns viram props com nome
em camelCase. Quando declara, atributos desconhecidos são ignorados.

## Estado

`state(props)` devolve o objeto inicial. Ele recebe as props já resolvidas:

```js
V.component('editor', {
  props: { texto: { type: 'string', default: '' } },
  state(props) {
    return { rascunho: props.texto, salvando: false };
  },
});
```

`data(props)` é um alias, para quem vem do Vue.

`v-data` no mesmo elemento complementa o estado:

```html
<div v-component="editor" v-data="{ modoAvancado: true }"></div>
```

## Métodos

Dentro dos métodos, `this` é a instância. Estado, props, computados e outros métodos são lidos e
escritos direto:

```js
methods: {
  async salvar() {
    this.salvando = true;
    try {
      const dados = await V.http.post('/api/textos', { texto: this.rascunho });
      this.emit('salvo', dados);
      V.toast.success('Salvo!');
    } finally {
      this.salvando = false;
    }
  },
}
```

Funções soltas na definição também viram métodos, o que encurta componentes pequenos:

```js
V.component('relogio', {
  state: () => ({ agora: new Date() }),
  formatar() { return this.agora.toLocaleTimeString(); },
  template: '<time>{ formatar() }</time>',
});
```

## Computados

```js
computed: {
  completo() { return `${this.primeiro} ${this.ultimo}`; },
  temErro() { return Object.keys(this.erros).length > 0; },
}
```

Computados têm cache e só recalculam quando uma dependência muda.

## Watchers

```js
watch: {
  busca(novo, antigo) {
    if (novo.length >= 3) this.buscar(novo);
  },
}
```

## Template e slots

O `template` substitui o conteúdo do elemento. Para receber o conteúdo original, use `<slot>`:

```js
V.component('painel', {
  props: { titulo: { type: 'string', default: '' } },
  template: `
    <section class="painel">
      <header>
        <slot name="cabecalho"><h3>{ titulo }</h3></slot>
      </header>
      <div class="corpo"><slot></slot></div>
      <footer><slot name="rodape"></slot></footer>
    </section>
  `,
});
```

```html
<painel titulo="Relatório">
  <h3 slot="cabecalho">Cabeçalho customizado</h3>
  <p>Este parágrafo cai no slot padrão.</p>
  <button slot="rodape">Fechar</button>
</painel>
```

Regras dos slots:

- o slot sem nome recebe todo o conteúdo que não foi endereçado;
- o conteúdo escrito dentro de `<slot>` é o padrão, usado quando ninguém preenche;
- **o conteúdo do slot é avaliado no escopo do pai**, como no Vue. Ele não enxerga o estado
  interno do componente.

Um componente sem `template` mantém o próprio HTML e apenas envolve tudo em um escopo:

```html
<div v-component="filtro">
  <input v-model="termo">
  <p>{ resultados.length } resultados para "{ termo }"</p>
</div>
```

## Estilo

`style` injeta CSS uma única vez, na primeira vez que o componente é usado:

```js
V.component('aviso', {
  style: `.aviso { padding: 12px; border-radius: 8px; background: var(--v-surface-2); }`,
  template: '<div class="aviso"><slot></slot></div>',
});
```

O CSS **não** é isolado por escopo. Use nomes de classe próprios ou o prefixo do componente.

## Eventos com emit

```js
methods: {
  confirmar() { this.emit('confirmado', { id: this.id }); },
}
```

```html
<dialogo @confirmado="registrar($detail)"></dialogo>
<dialogo v-on:confirmado="aoConfirmar"></dialogo>
```

O evento é um `CustomEvent` que sobe pela árvore. O `detail` chega como `$detail` na expressão e
como primeiro argumento quando você passa apenas o nome de uma função.

`$emit` é um alias de `emit`.

## Ciclo de vida

| Hook | Quando roda |
| --- | --- |
| `beforeMount` | Antes de o template substituir o conteúdo |
| `mounted` | Depois de o DOM da rodada ter sido aplicado |
| `updated` | Após qualquer mudança no estado, quando o hook está declarado |
| `beforeUnmount` | Antes de o elemento sair do DOM |
| `unmounted` | Depois da remoção |
| `destroyed` | Alias de `unmounted` |

```js
V.component('relogio', {
  state: () => ({ agora: new Date() }),
  mounted() {
    this.timer = setInterval(() => { this.agora = new Date(); }, 1000);
  },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  template: '<time>{ agora.toLocaleTimeString() }</time>',
});
```

## Propriedades da instância

| Propriedade | O que é |
| --- | --- |
| `this.$el` | Elemento hospedeiro |
| `this.$props` | Objeto reativo com as props |
| `this.$refs` | Elementos marcados com `v-ref` dentro do componente |
| `this.$scope` | Escopo do componente |
| `this.$parent` | Instância do componente pai, ou `null` |
| `this.$name` | Nome normalizado |
| `this.emit(nome, detalhe)` | Dispara um evento |
| `this.$watch(expressao, callback)` | Observa uma expressão do escopo |
| `this.$nextTick()` | Espera o DOM refletir |

Dentro do HTML do componente, `$self` aponta para a instância.

## Isolamento de escopo

Por padrão o componente **não** enxerga o `v-data` que o envolve. Ele fala com o escopo raiz e com
as próprias props. Isso evita que um componente dependa por acidente do contexto onde foi colado.

Para herdar o escopo do pai:

```js
V.component('linha-da-tabela', {
  inheritScope: true,
  template: '<td>{ item.nome }</td>',
});
```

## Comunicação entre componentes

**De pai para filho:** props.

**De filho para pai:** `emit`.

**Entre irmãos distantes:** um store global ou o barramento de eventos.

```js
V.store('carrinho', { itens: [] });
```

```js
V.on('produto:adicionado', (produto) => console.log(produto));
V.emit('produto:adicionado', { id: 7 });
```

## Inspecionando

`V.components` é o `Map` com todas as definições registradas. `V.instances` é o `Set` com as
instâncias montadas, útil em depuração e nas devtools.

```js
V.components.has('contador');  // true
V.instances.size;              // quantos estão montados agora
```

---

Anterior: [Directives](directives.md) · Próximo: [Componentes prontos](componentes-prontos.md)
