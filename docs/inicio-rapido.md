# Início rápido

Do arquivo em branco até um app com estado, lista, formulário e requisição. Cada passo é um
arquivo que abre direto no navegador, sem servidor e sem build.

## Passo 1: o esqueleto

Crie `index.html`:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Minha primeira Voodoo</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
  <style>[v-cloak] { display: none !important; }</style>
</head>
<body>
  <h1>Olá</h1>
</body>
</html>
```

Abra o arquivo. Nada acontece ainda, e é isso mesmo. A biblioteca já iniciou e está esperando o
primeiro atributo.

## Passo 2: estado e interpolação

`v-data` cria um escopo com estado reativo. Dentro dele, `{ expressao }` escreve valores no texto.

```html
<div v-data="{ nome: 'mundo' }">
  <h1>Olá, { nome }!</h1>
  <input v-model="nome">
</div>
```

Digite no campo. O título muda a cada tecla, sem uma linha de JavaScript.

A forma `{{ nome }}`, com chave dupla, também funciona. A chave simples é a padrão da Voodoo.

## Passo 3: eventos

`v-click` liga o clique a uma expressão. `@click` é o mesmo atalho, para quem prefere.

```html
<div v-data="{ contador: 0 }">
  <button v-click="contador--">menos</button>
  <strong>{ contador }</strong>
  <button v-click="contador++">mais</button>

  <p v-show="contador > 5">Já passou de cinco.</p>
</div>
```

`v-show` alterna o `display`. O elemento continua no documento.

## Passo 4: condição e lista

`v-if` insere e remove do DOM. `v-for` repete um elemento por item.

```html
<div v-data="{ tarefas: ['Estudar', 'Correr'], nova: '' }">
  <form @submit.prevent="tarefas.push(nova); nova = ''">
    <input v-model="nova" placeholder="Nova tarefa">
    <button>Adicionar</button>
  </form>

  <p v-if="tarefas.length === 0">Nenhuma tarefa por aqui.</p>
  <ul v-else>
    <li v-for="(tarefa, i) in tarefas">
      { i + 1 }. { tarefa }
      <button v-click="tarefas.splice(i, 1)">remover</button>
    </li>
  </ul>

  <small>{ tarefas.length } tarefa(s)</small>
</div>
```

Repare em três coisas:

- `@submit.prevent` já chama `preventDefault()` para você;
- `v-else` precisa ser o elemento irmão imediato do `v-if`;
- a expressão aceita várias instruções separadas por ponto e vírgula.

## Passo 5: atributos, classes e estilos

Prefixe qualquer atributo com dois pontos para ligá-lo ao estado.

```html
<div v-data="{ ativo: false, cor: '#6D3BF5', carregando: false }">
  <button
    :class="{ ativo: ativo, 'em-espera': carregando }"
    :style="{ borderColor: cor }"
    :disabled="carregando"
    v-click="ativo = !ativo"
  >
    { ativo ? 'Ligado' : 'Desligado' }
  </button>
</div>
```

As classes que já estavam no atributo `class` são preservadas. `:class` só acrescenta e remove as
que você declarou.

## Passo 6: buscar dados do servidor

`v-resource` cria um objeto reativo com `data`, `loading`, `error`, `loaded`, `reload()` e `set()`.

```html
<div v-resource="usuarios: https://jsonplaceholder.typicode.com/users">
  <p v-if="usuarios.loading">Carregando...</p>
  <p v-else-if="usuarios.error">{ usuarios.error.message }</p>
  <ul v-else>
    <li v-for="u in usuarios.data">{ u.name } ({ u.email })</li>
  </ul>

  <button v-click="usuarios.reload()">Atualizar</button>
</div>
```

Se você só quer jogar HTML dentro de um alvo, `v-get` resolve:

```html
<button v-get="/parciais/tabela.html" v-target="#area">Carregar tabela</button>
<div id="area"></div>
```

## Passo 7: um formulário completo

```html
<form v-submit="/api/contato" v-validate
      v-toast-success="Mensagem enviada!" v-reset-success v-disable-loading>
  <label>
    Nome
    <input name="nome" v-required v-minlength="3">
  </label>

  <label>
    E-mail
    <input name="email" type="email" v-required v-email>
  </label>

  <label>
    Telefone
    <input name="telefone" v-mask="phone" v-phone>
  </label>

  <button type="submit" :disabled="$form.loading">
    { $form.loading ? 'Enviando...' : 'Enviar' }
  </button>
</form>
```

O que acontece sozinho:

- os campos são validados ao sair do foco e a mensagem aparece embaixo de cada um;
- o telefone ganha máscara enquanto você digita;
- o envio vira uma requisição AJAX com o corpo serializado;
- `$form.loading` fica verdadeiro durante o envio;
- erros 422 do servidor voltam para os campos certos;
- uma notificação de sucesso aparece e o formulário é limpo.

## Passo 8: componentes

Componentes ficam melhores em um bloco de script, porque envolvem lógica de verdade.

```html
<script>
  V.component('contador', {
    props: { inicio: { type: 'number', default: 0 } },
    state(props) {
      return { valor: props.inicio };
    },
    computed: {
      dobro() { return this.valor * 2; },
    },
    methods: {
      somar() { this.valor++; this.emit('mudou', this.valor); },
    },
    template: `
      <button v-click="somar">Somar</button>
      <span>{ valor } (dobro: { dobro })</span>
    `,
  });
</script>

<contador inicio="10" @mudou="console.log($detail)"></contador>
<Contador inicio="3"></Contador>
```

As duas escritas funcionam: `<contador>` e `<Contador>`.

## Passo 9: notificações e diálogos

```html
<button v-click="$toast.success('Salvo com sucesso!')">Salvar</button>

<button v-click="$confirm('Excluir o pedido?').then(ok => ok && $toast.error('Excluído'))">
  Excluir
</button>
```

Ou de forma declarativa, com o guarda de confirmação:

```html
<button v-confirm="Excluir o pedido?" v-click="excluirPedido(7)">Excluir</button>
```

## O app completo

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lista de tarefas</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
  <style>
    [v-cloak] { display: none !important; }
    body { font-family: system-ui, sans-serif; max-width: 34rem; margin: 3rem auto; }
    .feita { text-decoration: line-through; opacity: .55; }
  </style>
</head>
<body>
  <div v-cloak v-data="{ itens: [], texto: '' }" v-persist="tarefas">
    <h1>Tarefas</h1>

    <form @submit.prevent="itens.push({ id: Date.now(), texto: texto, feita: false }); texto = ''">
      <input v-model.trim="texto" placeholder="O que precisa ser feito?" required>
      <button>Adicionar</button>
    </form>

    <ul>
      <li v-for="item in itens" :key="item.id" :class="{ feita: item.feita }">
        <input type="checkbox" v-model="item.feita">
        { item.texto }
        <button v-click="itens.splice(itens.indexOf(item), 1)">x</button>
      </li>
    </ul>

    <p v-show="itens.length">
      { itens.filter(i => !i.feita).length } de { itens.length } pendentes
    </p>
  </div>
</body>
</html>
```

`v-persist="tarefas"` guarda o estado no `localStorage`. Recarregue a página: a lista continua lá.

## Para onde ir agora

- [Directives](directives.md) para a referência completa dos atributos.
- [Reatividade](reatividade.md) para entender o que acontece por baixo.
- [Formulários](formularios.md) e [Validação](validacao.md) para trabalho de verdade com dados.
- [Componentes](componentes.md) quando um bloco de HTML começar a se repetir.

---

Anterior: [Instalação](instalacao.md) · Próximo: [Reatividade](reatividade.md)
