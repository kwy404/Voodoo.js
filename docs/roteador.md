# Roteador

> Este módulo vem apenas no `voodoo.full.min.js` ou em um build sob medida.

Roteador de aplicação de página única, sem nenhuma dependência externa. Dois modos: `history`, que
usa a History API e URLs limpas, e `hash`, que guarda a rota depois do `#` e funciona até abrindo
o arquivo direto do disco.

## Configurando

```js
V.router({
  mode: 'history',
  base: '/',
  routes: {
    '/': { component: 'home', title: 'Início' },
    '/usuarios': { component: 'usuarios', title: 'Usuários' },
    '/usuarios/:id': { component: 'usuario-detalhe' },
    '/posts/:slug?': { view: '/parciais/post.html' },
    '/admin': { component: 'admin', meta: { requerLogin: true } },
    '/antigo': { redirect: '/novo' },
    '*': { component: 'nao-encontrado', title: 'Página não encontrada' },
  },
  beforeEach(to, from) {
    if (to.meta.requerLogin && !estaLogado()) return '/login';
    return true;
  },
  afterEach(to) {
    console.log('chegou em', to.path);
  },
});
```

```html
<nav>
  <a v-link href="/">Início</a>
  <a v-link href="/usuarios">Usuários</a>
</nav>

<main v-router-view>Carregando...</main>
```

## Opções

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `mode` | `history` | `history` ou `hash` |
| `base` | `/` | Prefixo comum das rotas no modo `history` |
| `routes` | | Mapa de padrão para definição |
| `beforeEach` | | Guard global antes de cada navegação |
| `afterEach` | | Hook global depois de cada navegação |
| `linkActiveClass` | `v-link-active` | Classe do `v-link` quando a rota começa com o destino |
| `linkExactActiveClass` | `v-link-exact-active` | Classe do `v-link` quando a rota é exatamente o destino |
| `transition` | `true` | Usa a View Transitions API na troca de tela |
| `titleTemplate` | `%s` | Modelo do título, com `%s` no lugar do título da rota |
| `scrollBehavior` | | Controle fino da rolagem depois de navegar |

## Definição de rota

| Campo | O que faz |
| --- | --- |
| `component` | Nome de um componente registrado, montado dentro do `v-router-view` |
| `view` | URL de um HTML remoto, carregado e inserido no lugar |
| `title` | Aplicado em `document.title` ao entrar |
| `name` | Nome da rota, disponível em `$route.name` |
| `meta` | Dados livres, disponíveis em `$route.meta` |
| `redirect` | Redireciona assim que a rota casa |
| `beforeEnter` | Guard exclusivo desta rota, executado antes do global |

## Padrões e especificidade

```
/usuarios          segmento fixo
/usuarios/:id      parâmetro obrigatório
/posts/:slug?      parâmetro opcional
*                  curinga, entra quando nada mais casa
```

A rota mais específica sempre vence: `/usuarios/novo` ganha de `/usuarios/:id`, e `*` só entra por
último. Você não precisa se preocupar com a ordem em que declarou.

## $route

O estado da rota atual é reativo. Qualquer expressão que leia `$route` se atualiza sozinha.

```html
<h1>Usuário { $route.params.id }</h1>
<p v-show="$route.query.novo">Cadastro recém-criado</p>
<small>{ $route.path } · { $route.name }</small>
```

| Campo | O que é |
| --- | --- |
| `path` | Caminho sem query e sem hash |
| `fullPath` | Caminho completo |
| `params` | Parâmetros do padrão, como `{ id: '42' }` |
| `query` | Query string convertida em objeto |
| `hash` | Âncora, sem o `#` |
| `name` | Nome declarado na rota |
| `meta` | Metadados da rota |
| `matched` | O padrão que casou, ou `null` |

Por JavaScript, o mesmo objeto está em `V.route`.

## v-router-view

```html
<main v-router-view>Carregando...</main>
<main v-router-view.no-transition></main>
```

Rota com `component` monta o componente registrado. Rota com `view` busca o HTML remoto e o insere
já com as directives ligadas, guardando o resultado em cache. O conteúdo original do elemento
volta quando nenhuma rota casa.

A troca usa a View Transitions API quando o navegador oferece. `.no-transition` desliga isso.

## v-link

Transforma qualquer `<a href>` em navegação interna.

```html
<a v-link href="/usuarios">Usuários</a>
<a v-link="'/usuarios/' + user.id">Detalhe</a>
<a v-link.replace href="/login">Entrar</a>
<a v-link.no-scroll href="/lista">Sem rolar ao topo</a>
```

Continuam com o comportamento nativo do navegador: cliques com Ctrl, Command, Shift ou Alt,
cliques que não sejam com o botão principal, links com `target`, com `download`, com
`rel="external"` e links para outro domínio.

O link ativo recebe as classes configuradas e `aria-current="page"` quando é exatamente a rota
atual.

## v-route-active

Aplica uma classe quando a rota atual casa com um caminho. Útil em itens de menu que não são o
próprio link.

```html
<li v-route-active="/usuarios">
  <a v-link href="/usuarios">Usuários</a>
</li>

<li v-route-active:destaque.exact="/">Início</li>
```

O argumento é o nome da classe, com padrão `active`. `.exact` exige o caminho idêntico.

## Navegando por JavaScript

```js
await V.navigate('/usuarios/42');
await V.navigate('/login', { replace: true });
await V.navigate('/lista', { scroll: false });
await V.navigate('/mesma-rota', { force: true });

V.router.push('/usuarios');
V.router.replace('/login');
V.router.back();
V.router.forward();
V.router.go(-2);
```

`navigate` devolve `true` quando a navegação aconteceu, e `false` quando um guard cancelou.

Dentro do HTML você tem `$router` e `$route`:

```html
<button v-click="$router.push('/carrinho')">Ir ao carrinho</button>
<button v-click="$router.back()">Voltar</button>
```

## Resolvendo sem navegar

```js
V.router.resolve('/usuarios/7').params.id;   // '7'
V.router.resolve('/x').matched;              // padrão casado, ou null
```

## Rotas dinâmicas

```js
V.router.addRoute('/relatorios/:tipo', { component: 'relatorio' });
V.router.removeRoute('/relatorios/:tipo');
V.router.patterns;   // padrões registrados
V.router.ready;      // true depois de configurado
V.router.stop();     // desliga o roteador
V.router.clearViewCache();
```

## Guards

```js
V.router({
  routes: { ... },
  beforeEach(to, from) {
    if (to.meta.requerLogin && !usuario.logado) return '/login';
    if (to.path === '/admin' && !usuario.admin) return false;
    return true;
  },
});
```

O guard pode devolver:

| Valor | Efeito |
| --- | --- |
| `true`, `undefined`, nada | Deixa seguir |
| `false` | Cancela a navegação |
| uma string | Redireciona para aquele caminho |
| uma `Promise` de qualquer um dos anteriores | O mesmo, de forma assíncrona |

Guards por rota rodam antes do global:

```js
routes: {
  '/pedidos/:id': {
    component: 'pedido',
    async beforeEnter(to) {
      const existe = await V.http.get(`/api/pedidos/${to.params.id}/existe`);
      return existe ? true : '/404';
    },
  },
}
```

Redirecionamentos encadeados têm limite, então um laço acidental para com um aviso em vez de
travar a aba.

## Rolagem

Por padrão: rota nova volta ao topo, voltar pelo histórico restaura a posição guardada, e um hash
rola até a âncora. Para controlar:

```js
V.router({
  routes: { ... },
  scrollBehavior(to, from, salvo) {
    if (to.hash) return false;          // você assume a rolagem
    if (salvo !== null) return salvo;   // restaura a posição
    return 0;                            // topo
  },
});
```

## Título da página

```js
V.router({
  titleTemplate: '%s · Minha Loja',
  routes: {
    '/': { component: 'home', title: 'Início' },   // "Início · Minha Loja"
  },
});
```

## Modo hash

```js
V.router({ mode: 'hash', routes: { '/': { component: 'home' } } });
```

As URLs viram `/index.html#/usuarios/7`. Não exige nenhuma configuração no servidor, e funciona
até com o arquivo aberto direto do disco.

## Configuração de servidor para o modo history

Toda rota precisa devolver o mesmo `index.html`.

**nginx**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache**

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

Anterior: [Gráficos](graficos.md) · Próximo: [Idiomas](idiomas.md)
