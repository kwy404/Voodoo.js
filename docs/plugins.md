# Plugins

Tudo que a Voodoo.js faz por dentro está disponível para você: registrar directives, criar
variáveis mágicas, adicionar componentes, estender o objeto `V` e empacotar tudo isso em um
plugin.

## V.use

```js
const meuPlugin = {
  name: 'analytics',
  install(V, opcoes) {
    V.rastrear = (evento, dados) => enviar(opcoes.chave, evento, dados);

    V.directive('track', (el, binding) => {
      el.addEventListener('click', () => V.rastrear(binding.value));
    });

    V.magic('$rastrear', () => V.rastrear);
  },
};

V.use(meuPlugin, { chave: 'abc123' });
```

A forma curta em função também funciona:

```js
V.use((V, opcoes) => {
  V.config.globals.APP = opcoes;
}, { versao: '2.0' });
```

O mesmo plugin instalado duas vezes é ignorado na segunda.

## Directives personalizadas

### Forma com ciclo de vida

```js
V.directive('destaque', {
  created(el, binding) {},
  beforeMount(el, binding) {},
  mounted(el, binding) { el.style.background = binding.value; },
  updated(el, binding) { el.style.background = binding.value; },
  beforeUnmount(el, binding) {},
  unmounted(el, binding) {},
  priority: 0,
  raw: false,
});
```

```html
<div v-destaque="'yellow'">Destaque</div>
<div v-destaque="corDoStatus">Reativo</div>
```

O `binding` traz:

| Campo | O que é |
| --- | --- |
| `el` | O elemento |
| `value` | O valor já avaliado |
| `oldValue` | O valor anterior, em `updated` |
| `arg` | O argumento depois dos dois pontos |
| `modifiers` | Os modificadores depois dos pontos |
| `expression` | O texto original |
| `scope` | O escopo ativo |
| `instance` | A instância de componente mais próxima, ou `null` |

`priority` define a ordem: maior roda primeiro. `raw: true` entrega a expressão como texto, sem
avaliar, o que serve para directives que recebem seletores ou nomes.

### Forma curta

Vale para `mounted` e `updated` ao mesmo tempo:

```js
V.directive('tamanho', (el, binding) => {
  el.style.fontSize = `${binding.value}px`;
});
```

```html
<p v-tamanho="18">Texto grande</p>
```

### Exemplo real: um seletor de data

```js
V.directive('datepicker', {
  mounted(el, binding) {
    const picker = new AlgumaBibliotecaDeData(el, {
      formato: binding.arg || 'dd/mm/yyyy',
      inicial: binding.value,
      onChange: (valor) => {
        el.value = valor;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      },
    });
    el.__picker = picker;
  },
  updated(el, binding) {
    el.__picker.setValue(binding.value);
  },
  unmounted(el) {
    el.__picker.destroy();
  },
});
```

```html
<input v-datepicker:dd-mm-yyyy="form.nascimento" v-model="form.nascimento">
```

Repare no `dispatchEvent`: é assim que uma integração externa avisa o `v-model`.

## Directives internas, com controle fino

Para casos que precisam de efeitos próprios, limpeza explícita ou controle da subárvore, use
`defineDirective`:

```js
import { defineDirective, PRIORITY } from 'voodoojs';

defineDirective(
  'contador-regressivo',
  ({ el, evaluate, effect, cleanup }) => {
    let timer = null;

    effect(() => {
      const alvo = new Date(evaluate());
      clearInterval(timer);
      timer = setInterval(() => {
        const restante = Math.max(0, alvo - Date.now());
        el.textContent = `${Math.floor(restante / 1000)}s`;
        if (restante === 0) clearInterval(timer);
      }, 1000);
    });

    cleanup(() => clearInterval(timer));
  },
  { priority: PRIORITY.DEFAULT }
);
```

O contexto entregue:

| Campo | O que é |
| --- | --- |
| `el` | O elemento que declarou o atributo |
| `scope` | O escopo ativo |
| `expression` | O texto do atributo |
| `arg` | O argumento depois dos dois pontos |
| `modifiers` | Os modificadores |
| `raw` | O nome completo do atributo, útil em mensagens de erro |
| `evaluate(expr?)` | Avalia a expressão. Nunca lança |
| `effect(fn)` | Cria um efeito reativo já ligado à limpeza do elemento |
| `cleanup(fn)` | Roda quando o elemento sai do DOM |
| `walk(no, escopo)` | Inicializa HTML criado pela directive |

Opções do registro:

| Opção | O que faz |
| --- | --- |
| `priority` | Ordem de execução. Maior roda primeiro |
| `terminal` | Impede o walker de descer nos filhos, como em `v-for` e `v-if` |

Prioridades disponíveis em `V.PRIORITY`: `IGNORE` (100), `FOR` (90), `IF` (80), `DATA` (70),
`COMPONENT` (65), `REF` (60), `MODEL` (40), `BIND` (30), `DEFAULT` (0), `INIT` (-10),
`TRANSITION` (-20).

O nome registrado não inclui o prefixo: `defineDirective('toggle', ...)` responde a `v-toggle`.

### Nomes já ocupados

Não registre estes nomes: `text`, `html`, `show`, `if`, `else`, `else-if`, `for`, `model`, `bind`,
`class`, `style`, `on`, `click`, `dblclick`, `input`, `change`, `keyup`, `keydown`, `keypress`,
`mouseenter`, `mouseleave`, `mouseover`, `mousedown`, `mouseup`, `contextmenu`, `wheel`, `paste`,
`dragstart`, `dragover`, `dragleave`, `drop`, `init`, `ref`, `effect`, `watch`, `cloak`, `once`,
`teleport`, `transition`, `duration`, `key`, `slot`, `ignore`, `pre`, `data`, `component`, além de
todos os nomes usados pelos módulos de HTTP, formulários, validação, máscara, interface, estado,
animação, gráficos, roteador e idiomas.

`V.directives` é o `Map` com tudo que já está registrado, se você quiser conferir antes.

## Variáveis mágicas personalizadas

```js
V.magic('$usuario', () => usuarioLogado);
V.magic('$formatar', () => (valor) => V.formatCurrency(valor));
V.magic('$altura', (scope) => scope.el.offsetHeight);
```

```html
<span>{ $usuario.nome }</span>
<span>{ $formatar(pedido.total) }</span>
```

O getter recebe o escopo ativo, então a magia pode depender de onde foi usada. O cifrão é
adicionado automaticamente quando você não escreve.

Magias são somente leitura, com exceção das que expõem um método `set` próprio.

## Componentes em um plugin

```js
const kitDeFormulario = {
  name: 'kit-formulario',
  install(V) {
    V.component('campo-cpf', {
      props: { label: { type: 'string', default: 'CPF' }, name: { type: 'string', default: 'cpf' } },
      template: `
        <label>
          <span>{ label }</span>
          <input :name="name" v-mask="cpf" v-cpf v-required>
        </label>
      `,
    });
  },
};

V.use(kitDeFormulario);
```

## Regras de validação e máscaras

```js
const brasilPlus = {
  install(V) {
    V.validator('titulo-eleitor', (valor) => V.unmask(valor).length === 12, 'Título inválido.');
    V.registerMask('titulo', '9999 9999 9999');
  },
};

V.use(brasilPlus);
```

## Estendendo o objeto V

Dentro do `install` você recebe o próprio `V` e pode acrescentar o que quiser:

```js
V.use((V) => {
  V.api = {
    usuarios: () => V.http.get('/api/usuarios'),
    salvar: (u) => V.http.post('/api/usuarios', u),
  };
});
```

```html
<button v-click="$http.get('/api/x')">Direto</button>
```

Para chamar `V.api` dentro do HTML, libere como global:

```js
V.config.globals.api = V.api;
```

```html
<button v-click="api.salvar(form)">Salvar</button>
```

## Interceptadores HTTP em um plugin

```js
V.use((V, { token }) => {
  V.http.setToken(token);
  V.http.interceptors.error.use((erro) => {
    if (erro.status === 401) V.navigate('/login');
    if (erro.status >= 500) V.toast.error('Erro no servidor, tente novamente.');
  });
}, { token: localStorage.getItem('jwt') });
```

## Publicando um plugin

Um plugin é um módulo comum:

```js
// voodoo-plugin-x/index.js
export default {
  name: 'x',
  install(V, options = {}) { /* ... */ },
};
```

```js
import V from 'voodoojs';
import pluginX from 'voodoo-plugin-x';

V.use(pluginX, { chave: 'abc' });
V.start();
```

Para uso por CDN, publique um IIFE que se registre sozinho:

```js
(function () {
  if (!window.V) return console.warn('Voodoo.js não encontrada.');
  window.V.use({ name: 'x', install(V) { /* ... */ } });
})();
```

```html
<script src="voodoo.min.js" defer></script>
<script src="voodoo-plugin-x.js" defer></script>
```

Recomendações para quem publica:

- prefixe as directives com algo seu, como `v-x-tabela`, para evitar colisão;
- não injete CSS sem necessidade, e use `V.injectStyle('id-unico', css)` quando injetar;
- use as variáveis `--v-*` em vez de cores fixas, para acompanhar tema e paleta;
- registre limpeza em `cleanup` ou `unmounted`, sempre.

---

Anterior: [Devtools](devtools.md) · Próximo: [Utilitários](utilitarios.md)
