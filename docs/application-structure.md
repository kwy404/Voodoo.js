# Estrutura de aplicação

> **Nada nesta página é obrigatório.**
>
> Um `index.html` com uma tag `<script>` continua sendo uma aplicação Voodoo.js completa e
> legítima. Esta página descreve uma convenção opcional, para quando o projeto cresceu a
> ponto de um arquivo só ter virado incômodo. Se o seu projeto ainda cabe em um arquivo,
> pare de ler aqui e volte a programar.

## O que esta página resolve

Existe um momento, que chega em uns projetos e nunca em outros, em que você abre o
`index.html`, rola por trezentas linhas de `<script>` e não acha mais a função que queria
mudar. É o momento em que separar arquivos passa a economizar tempo em vez de custar.

O que vem abaixo é uma forma de separar que funciona bem com a Voodoo.js, testada contra o
jeito que a biblioteca de fato carrega as coisas. Não é uma arquitetura, é um lugar
previsível para guardar cada tipo de coisa.

## O mesmo app, das duas formas

Um app pequeno: uma lista de tarefas com contador, salva no navegador.

### Forma 1: um arquivo

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Tarefas</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
</head>
<body>
  <main v-data="{ nova: '', tarefas: [] }" v-persist="tarefas">
    <form @submit.prevent="tarefas.push({ id: Date.now(), texto: nova, feita: false }); nova = ''">
      <input v-model="nova" placeholder="O que precisa ser feito?" required>
      <button>Adicionar</button>
    </form>

    <ul>
      <li v-for="tarefa in tarefas" :key="tarefa.id">
        <input type="checkbox" v-model="tarefa.feita">
        <span :class="{ feita: tarefa.feita }">{ tarefa.texto }</span>
        <button @click="tarefas = tarefas.filter(t => t.id !== tarefa.id)">Remover</button>
      </li>
    </ul>

    <p>{ tarefas.filter(t => !t.feita).length } de { tarefas.length } pendentes</p>
  </main>
</body>
</html>
```

Isso é uma aplicação inteira. Funciona, é reativa, persiste entre recarregamentos, não
precisa de build, de servidor de desenvolvimento nem de `npm install`. **Se o seu projeto
é assim, ele está pronto.**

### Forma 2: estruturado

O mesmo comportamento, quando a lista de tarefas virou parte de um sistema maior.

```
projeto/
├── index.html
└── src/
    ├── app.js
    ├── components/
    │   └── lista-tarefas.js
    └── stores/
        └── tarefas.js
```

```html
<!-- index.html -->
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Tarefas</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>
  <script type="module" src="/src/app.js"></script>
</head>
<body>
  <lista-tarefas></lista-tarefas>
</body>
</html>
```

```js
// src/stores/tarefas.js
export function registrar() {
  V.store('tarefas', {
    itens: [],

    adicionar(texto) {
      this.itens.push({ id: Date.now(), texto, feita: false });
    },

    remover(id) {
      this.itens = this.itens.filter((t) => t.id !== id);
    },

    pendentes() {
      return this.itens.filter((t) => !t.feita).length;
    },
  }, { persist: true });
}
```

```js
// src/components/lista-tarefas.js
export function registrar() {
  V.component('lista-tarefas', {
    state: () => ({ nova: '' }),

    methods: {
      enviar() {
        if (!this.nova.trim()) return;
        V.stores.tarefas.adicionar(this.nova);
        this.nova = '';
      },
    },

    template: `
      <form @submit.prevent="enviar()">
        <input v-model="nova" placeholder="O que precisa ser feito?">
        <button>Adicionar</button>
      </form>

      <ul>
        <li v-for="tarefa in $store.tarefas.itens" :key="tarefa.id">
          <input type="checkbox" v-model="tarefa.feita">
          <span :class="{ feita: tarefa.feita }">{ tarefa.texto }</span>
          <button @click="$store.tarefas.remover(tarefa.id)">Remover</button>
        </li>
      </ul>

      <p>{ $store.tarefas.pendentes() } de { $store.tarefas.itens.length } pendentes</p>
    `,
  });
}
```

```js
// src/app.js
import { registrar as registrarTarefasStore } from './stores/tarefas.js';
import { registrar as registrarListaTarefas } from './components/lista-tarefas.js';

registrarTarefasStore();
registrarListaTarefas();
```

Compare os dois. O comportamento é idêntico. O segundo tem mais arquivos e mais cerimônia,
e ganha alguma coisa em troca: a lógica das tarefas mora em um lugar só, o componente pode
aparecer em várias páginas, e quem chegar no projeto sabe onde procurar.

**A troca só compensa quando o projeto realmente cresceu.** Fazer isso em um app de trinta
linhas é burocracia.

## As pastas

```
src/
├── app.js          ponto de entrada: importa e registra tudo
├── components/     componentes reutilizáveis
├── pages/          telas, quando o app tem roteador
├── stores/         estado global
├── services/       conversa com o mundo externo
├── plugins/        extensões da própria Voodoo
└── routes/         mapa de rotas
```

Nenhuma dessas pastas é procurada automaticamente pela Voodoo.js. Não existe convenção
mágica, não existe autoload. Os nomes valem porque são previsíveis, e nada mais. Crie
apenas as pastas de que você precisa.

### `src/app.js`

O único arquivo que a página carrega diretamente. Ele importa e registra o resto.

```js
import { registrarComponentes } from './components/index.js';
import { registrarStores } from './stores/index.js';
import { instalarPlugins } from './plugins/index.js';
import { registrarRotas } from './routes/index.js';

V.config.baseURL = '/api';
V.config.locale = 'pt-BR';

instalarPlugins();
registrarStores();
registrarComponentes();
registrarRotas();
```

Duas coisas importantes sobre a ordem.

**Configuração vem antes de tudo.** `V.config.prefix` e `V.config.autoDiscover` precisam
estar definidos antes de a Voodoo percorrer a página. Para garantir isso, use `data-manual`
na tag do script e chame `V.start()` você mesmo:

```html
<script src="voodoo.min.js" data-manual defer></script>
<script type="module" src="/src/app.js"></script>
```

```js
// no fim de src/app.js
V.start();
```

**Registrar componente depois da página carregar funciona.** A Voodoo.js monta as tags que
já estavam esperando pelo nome que você acabou de registrar. Isso é intencional e está
implementado em `defineComponent`, exatamente porque o script do CDN com `defer` roda antes
do script da sua aplicação. Você não precisa se preocupar com a corrida.

### `src/components/`

Um arquivo por componente. Nome do arquivo igual ao nome registrado, em kebab-case.

```
components/
├── index.js
├── cartao-produto.js
├── barra-busca.js
└── tabela-pedidos.js
```

```js
// components/cartao-produto.js
export function registrar() {
  V.component('cartao-produto', {
    props: {
      produto: { type: 'object' },
      destaque: { type: 'boolean', default: false },
    },

    computed: {
      precoFormatado() {
        return V.formatCurrency(this.produto.preco);
      },
    },

    methods: {
      adicionar() {
        V.stores.carrinho.adicionar(this.produto);
        this.emit('adicionado', this.produto);
      },
    },

    template: `
      <article :class="{ destaque: destaque }">
        <h3>{ produto.nome }</h3>
        <p>{ precoFormatado }</p>
        <button @click="adicionar()">Adicionar</button>
      </article>
    `,
  });
}
```

```js
// components/index.js
import { registrar as cartaoProduto } from './cartao-produto.js';
import { registrar as barraBusca } from './barra-busca.js';
import { registrar as tabelaPedidos } from './tabela-pedidos.js';

export function registrarComponentes() {
  cartaoProduto();
  barraBusca();
  tabelaPedidos();
}
```

O `index.js` existe para o `app.js` não virar uma lista de vinte importações. Quando forem
três componentes, importe direto e pule o `index.js`.

**Quando o template ficar grande**, tire ele do JavaScript e coloque em um `<template>` no
HTML:

```html
<template id="tpl-cartao-produto">
  <article :class="{ destaque: destaque }">
    <h3>{ produto.nome }</h3>
    <p>{ precoFormatado }</p>
    <button @click="adicionar()">Adicionar</button>
  </article>
</template>
```

```js
V.component('cartao-produto', {
  template: document.getElementById('tpl-cartao-produto').innerHTML,
  // ...
});
```

Você recupera destaque de sintaxe do editor e o HTML volta a parecer HTML.

### `src/stores/`

Estado que mais de um componente precisa enxergar. Estado que só um componente usa fica no
`state()` dele.

```js
// stores/carrinho.js
export function registrar() {
  V.store('carrinho', {
    itens: [],
    cupom: null,

    adicionar(produto) {
      const existente = this.itens.find((i) => i.id === produto.id);
      if (existente) existente.quantidade++;
      else this.itens.push({ ...produto, quantidade: 1 });
    },

    remover(id) {
      this.itens = this.itens.filter((i) => i.id !== id);
    },

    subtotal() {
      return this.itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
    },

    total() {
      return this.cupom ? this.subtotal() * (1 - this.cupom.desconto) : this.subtotal();
    },
  }, { persist: true });
}
```

Um store fica visível em qualquer expressão da página como `$store.carrinho`, e em
JavaScript como `V.stores.carrinho`. Métodos declarados na definição recebem `this`
apontando para o próprio store, então `this.itens` funciona.

`{ persist: true }` salva no `localStorage` e restaura no próximo carregamento. Funções não
são salvas, só os dados.

Regra prática para decidir onde o estado mora:

| Quem precisa ver | Onde fica                      |
| ---------------- | ------------------------------ |
| Um elemento      | `v-data` no próprio elemento   |
| Um componente    | `state()` do componente        |
| A página inteira | `V.data()`                     |
| A aplicação      | `V.store()`                    |

### `src/services/`

Tudo que fala com o mundo de fora: API, WebSocket, integração com biblioteca de terceiros.
Um serviço é um módulo comum, sem nada de Voodoo dentro além do cliente HTTP.

```js
// services/produtos.js
export const produtos = {
  listar(filtros = {}) {
    return V.http.get('/produtos', { params: filtros });
  },

  buscar(id) {
    return V.http.get(`/produtos/${id}`);
  },

  criar(dados) {
    return V.http.post('/produtos', dados);
  },
};
```

```js
// components/lista-produtos.js
import { produtos } from '../services/produtos.js';

V.component('lista-produtos', {
  state: () => ({ itens: [], carregando: false, erro: null }),

  methods: {
    async carregar() {
      this.carregando = true;
      this.erro = null;
      try {
        this.itens = await produtos.listar();
      } catch (err) {
        this.erro = err.message;
      } finally {
        this.carregando = false;
      }
    },
  },

  mounted() {
    this.carregar();
  },
});
```

O ganho é que a URL da API aparece em um lugar só. Quando o backend mudar o caminho, você
muda uma linha.

Autenticação e tratamento de erro global ficam bem como interceptadores, e o lugar deles é
aqui:

```js
// services/http.js
export function configurar() {
  V.http.setBaseURL('/api');

  V.http.interceptors.request.use((config) => {
    const token = V.storage.get('token');
    if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return config;
  });

  V.http.interceptors.error.use((erro) => {
    if (erro.status === 401) V.navigate('/entrar');
    else V.toast.error('Não foi possível completar a operação.');
  });
}
```

### `src/plugins/`

Extensões da própria Voodoo: directives, magics, validadores, máscaras. A especificação
completa está em [plugin-spec.md](plugin-spec.md).

```js
// plugins/analytics.js
export const analytics = {
  name: 'analytics',

  install(V, opcoes) {
    function rastrear(evento, dados) {
      navigator.sendBeacon(opcoes.url, JSON.stringify({ evento, dados }));
    }

    V.analytics = { rastrear };
    V.magic('$analytics', () => V.analytics);

    V.directive('analytics-track', (el, binding) => {
      el.addEventListener('click', () => rastrear(binding.value));
    });
  },
};
```

```js
// plugins/index.js
import { analytics } from './analytics.js';

export function instalarPlugins() {
  V.use(analytics, { url: '/eventos' });
}
```

Plugins são instalados **antes** dos componentes, porque um componente pode usar uma
directive que o plugin registrou.

### `src/routes/` e `src/pages/`

Só fazem sentido quando o app é uma SPA de verdade, com o roteador do build completo.

```
routes/
└── index.js
pages/
├── inicio.js
├── produtos.js
├── produto-detalhe.js
└── nao-encontrado.js
```

```js
// pages/produtos.js
import { produtos } from '../services/produtos.js';

export function registrar() {
  V.component('pagina-produtos', {
    state: () => ({ itens: [], carregando: true }),

    async mounted() {
      this.itens = await produtos.listar();
      this.carregando = false;
    },

    template: `
      <h1>Produtos</h1>
      <p v-show="carregando">Carregando...</p>
      <div v-for="p in itens" :key="p.id">
        <cartao-produto :produto="p"></cartao-produto>
      </div>
    `,
  });
}
```

```js
// routes/index.js
export function registrarRotas() {
  V.router({
    routes: {
      '/': { component: 'pagina-inicio', title: 'Início' },
      '/produtos': { component: 'pagina-produtos', title: 'Produtos' },
      '/produtos/:id': { component: 'pagina-produto-detalhe' },
      '*': { component: 'pagina-nao-encontrado' },
    },
  });
}
```

```html
<nav>
  <a v-link="/">Início</a>
  <a v-link="/produtos">Produtos</a>
</nav>
<main v-router-view></main>
```

Uma página é um componente comum. A única diferença é quem decide quando montar: o
roteador, e não a tag no HTML. Por isso `pages/` e `components/` são pastas separadas: não
por serem coisas diferentes, mas por serem usadas de formas diferentes.

## Padrões que valem a pena

### Um componente, um arquivo

Não junte três componentes em um arquivo porque são pequenos. Eles crescem, e separar
depois dá mais trabalho do que separar agora.

### Nome de arquivo igual ao nome registrado

`components/cartao-produto.js` registra `cartao-produto`. Sem exceção. Isso deixa o
`Ctrl+P` do editor útil.

### Exporte uma função `registrar`, não execute na importação

```js
// Assim: quem importa decide a ordem.
export function registrar() {
  V.component('cartao-produto', { /* ... */ });
}

// Assim não: o registro acontece na hora da importação, e a ordem
// vira consequência do grafo de módulos em vez de uma decisão sua.
V.component('cartao-produto', { /* ... */ });
```

Importa quando um componente depende de um store, ou de uma directive vinda de um plugin.

### Serviços não conhecem componentes

Um serviço devolve dados. Ele não sabe quem vai usar, não mexe no DOM e não chama
`V.toast`. Isso mantém o serviço testável e reaproveitável.

### Estado global só quando for global mesmo

Store é conveniente e por isso é fácil abusar. Um store que só um componente usa é estado
local com passos a mais e um vazamento de encapsulamento de brinde.

### O template mora perto do componente

Ou como string na definição, ou em um `<template>` no HTML com um id que combina com o nome
do componente. Não espalhe pedaços de template por vários lugares.

## Burocracia que não vale a pena

Coisas que parecem organização e são só peso:

- **Uma pasta por componente**, com `index.js`, `template.html` e `style.css` para um
  componente de trinta linhas.
- **Uma camada de abstração sobre `V.http`** que só repassa as chamadas.
- **Barrel files em toda pasta.** O `index.js` existe para encurtar o `app.js`. Se a pasta
  tem dois arquivos, ele só atrapalha.
- **Separar em `models/`, `controllers/` e `views/`.** A Voodoo.js não é MVC e forçar essa
  divisão gera arquivos que existem só para ter a pasta preenchida.
- **Uma constante para cada string.** `'/produtos'` aparecendo duas vezes não é duplicação
  que precisa de arquivo de constantes.
- **Estruturar antes de precisar.** Comece com um arquivo. Separe quando doer.

## Servindo os arquivos

Módulos ES precisam ser servidos por HTTP; abrir o `index.html` com duplo clique não
funciona por causa do CORS. O repositório traz um servidor simples:

```bash
npm run serve
```

Qualquer servidor estático serve. Não existe passo de build:

```bash
npx serve .
python -m http.server 8000
php -S localhost:8000
```

Se você já usa um bundler, importe pelo npm em vez do CDN:

```bash
npm install voodoojs
```

```js
import V from 'voodoojs';

V.component('cartao-produto', { /* ... */ });
V.start();
```

Importar `voodoojs` não mexe no DOM sozinho. Quem inicializa é o build de navegador ou uma
chamada explícita a `V.start()`.

## Checklist para migrar de um arquivo para vários

Se você decidiu que chegou a hora, a ordem que dá menos trabalho:

1. Crie `src/app.js` e mova o `<script>` inteiro para lá. Troque por
   `<script type="module" src="/src/app.js"></script>`. Confirme que nada quebrou.
2. Extraia os stores. São os que menos dependem de outras coisas.
3. Extraia os serviços, junto com as chamadas HTTP espalhadas.
4. Extraia os componentes, um por vez, testando entre um e outro.
5. Só então crie `plugins/`, `routes/` e `pages/`, e apenas se o app precisar.

Pare em qualquer degrau que já esteja bom. A estrutura completa não é a meta, é o teto.

## Leia também

- [Componentes](componentes.md)
- [Estado e stores](estado-e-stores.md)
- [Roteador](roteador.md)
- [Plugins](plugins.md) e [Especificação de plugin](plugin-spec.md)
- [Desempenho](performance.md)
