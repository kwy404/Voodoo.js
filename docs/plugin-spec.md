# Especificação de plugin

Este é o contrato oficial para quem escreve plugins de terceiros para a Voodoo.js. Ele
descreve o comportamento real de `usePlugin`
(`packages/voodoojs/src/runtime/registry.ts`), o que um plugin pode registrar, as regras de
nome e o que ainda falta no runtime.

Se você quer aprender a usar plugins, leia [Plugins](plugins.md) primeiro. Esta página é
mais formal e serve de referência para autores.

Versão descrita: `0.1.0`.

---

## 1. O contrato

Um plugin é **um objeto com um método `install`** ou **uma função**. As duas formas são
equivalentes para o runtime.

### Forma de objeto

```js
export const meuPlugin = {
  name: 'meu-plugin',

  install(V, opcoes) {
    // registre aqui
  },
};
```

| Campo     | Tipo                                             | Obrigatório | Uso hoje |
| --------- | ------------------------------------------------ | ----------- | -------- |
| `name`    | `string`                                          | não         | **Não é usado pelo runtime.** Existe no tipo `VoodooPlugin` e serve para documentação e depuração. |
| `install` | `(V, options?: Record<string, unknown>) => void`  | **sim**     | Chamado uma vez, no momento da instalação. |

O retorno de `install` é ignorado. Se ele lançar, o erro sobe para quem chamou `V.use`; não
existe tratamento interno.

### Forma de função

```js
export function meuPlugin(V, opcoes) {
  // registre aqui
}
```

Idêntica na prática. Use quando o plugin não precisa de nome nem de outros campos.

### Instalação

```js
V.use(meuPlugin, { chave: 'abc123' });
```

O que acontece por dentro:

```ts
const installedPlugins = new Set<VoodooPlugin | Function>();

export function usePlugin(V, plugin, options) {
  if (installedPlugins.has(plugin)) return;
  installedPlugins.add(plugin);
  if (typeof plugin === 'function') plugin(V, options);
  else plugin.install(V, options);
}
```

Quatro fatos que decorrem diretamente disso.

**1. Instalar duas vezes é ignorado, em silêncio.**

```js
V.use(meuPlugin, { a: 1 });
V.use(meuPlugin, { a: 2 });  // nao faz nada, nem avisa
```

A segunda chamada não instala e **as opções são descartadas**. Não existe merge de opções e
não existe aviso. Se o seu plugin precisa aceitar reconfiguração, exponha um método para
isso:

```js
install(V, opcoes) {
  V.meuPlugin = {
    configurar(novas) { Object.assign(config, novas); },
  };
}
```

**2. A deduplicação é por identidade do objeto, não por nome.**

```js
V.use({ name: 'analytics', install: a });
V.use({ name: 'analytics', install: b });  // instala tambem
```

São dois objetos diferentes, então os dois instalam. O campo `name` não participa da
decisão. Isso importa quando duas versões do mesmo plugin chegam por caminhos diferentes.

**3. O `V` recebido é o objeto real da aplicação.** Não é uma cópia, não é um proxy, não é
um contexto restrito. Um plugin pode ler e escrever qualquer coisa em `V`, inclusive
`V.config` e `V.http.defaults`. Não existe sandbox.

**4. `app.use()` instala no `V` global.** Em modo aplicação:

```js
const app = V.createApp({ /* ... */ });
app.use(meuPlugin);
```

`app.use` chama `usePlugin(V_global, plugin, opcoes)`. **O plugin não fica restrito à
aplicação.** Uma directive registrada por ele vale na página inteira, inclusive fora do
container montado. Isso é diferente do Vue e é intencional no estado atual do runtime.

---

## 2. O que um plugin pode registrar

### Directive

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

Forma curta, instalada como `mounted` **e** `updated` ao mesmo tempo:

```js
V.directive('destaque', (el, binding) => {
  el.style.background = binding.value;
});
```

O `binding` traz `el`, `value`, `oldValue`, `arg`, `modifiers`, `expression`, `scope` e
`instance`.

`priority` decide a ordem entre directives no mesmo elemento; maior roda primeiro. As
constantes ficam em `V.PRIORITY`. O padrão é `PRIORITY.DEFAULT`, que é `0`.

`raw: true` entrega o texto da expressão sem avaliar, para directives que recebem seletor
ou nome em vez de valor.

**Limitação:** `V.directive` não repassa `terminal` para `defineDirective`. Um plugin não
consegue declarar uma directive que assume a subárvore inteira, como `v-if` e `v-for` fazem.
Veja a seção 7.

### Componente

```js
V.component('meu-plugin-visor', {
  props: { valor: { type: 'number', default: 0 } },
  state: (props) => ({ interno: props.valor }),
  computed: { dobro() { return this.interno * 2; } },
  methods: { somar() { this.interno++; } },
  template: `<button @click="somar()">{ dobro }</button>`,
  style: `.meu-plugin-visor { color: var(--v-primary); }`,
  mounted() {},
  beforeUnmount() {},
});
```

Registre em kebab-case. A Voodoo cria sozinha o apelido sem hífen, para a tag em PascalCase
funcionar.

Registrar um componente depois da página carregar **monta as tags que já estavam
esperando**. Um plugin instalado no fim do `app.js` funciona.

`style` é injetado uma vez por nome de componente e respeita `V.config.injectStyles`.

### Variável mágica

```js
V.magic('$analytics', () => V.meuPlugin);
V.magic('$agora', (scope) => new Date());
```

A assinatura é `(name: string, getter: (scope: Scope) => unknown) => void`. O `$` é
acrescentado se você não escrever.

O getter recebe o escopo do ponto onde a expressão está, então dá para expor coisas
sensíveis ao contexto:

```js
V.magic('$formulario', (scope) => scope.el?.closest('form'));
```

Magias são somente leitura, a não ser que o valor devolvido exponha um `set` próprio.

### Regra de validação

```js
V.validator('par', (valor) => Number(valor) % 2 === 0, 'Informe um número par.');
```

Assinatura: `(name, fn, defaultMessage?)`. Isso faz três coisas:

1. registra a regra no registro interno de regras, com o nome em minúsculas (esse `Map` não
   é exposto em `V`);
2. define a mensagem padrão, se ainda não existir uma com esse nome;
3. **registra a directive `v-validate-par`** automaticamente.

```html
<input v-validate-par>
```

A função de validação recebe `(valor, parametro, campo)` e devolve `boolean` ou uma string
com a mensagem de erro.

### Máscara

```js
V.registerMask('processo', '9999999-99.9999.9.99.9999');
V.registerMask('reverso', (v) => v.split('').reverse().join(''));
```

Assinatura: `(name, patternOrFn)`. Tokens do padrão: `9` dígito, `A` letra, `S`
alfanumérico, `*` qualquer caractere.

```html
<input v-mask="processo">
```

### Serviço em `V`

```js
install(V, opcoes) {
  V.meuPlugin = {
    fazerAlgo(x) { return x * 2; },
    configurar(novas) { Object.assign(config, novas); },
  };
}
```

**Reivindique um nome só.** Veja a seção 3.

### Mensagens de tradução

Disponível apenas no build completo:

```js
if (V.i18n) {
  V.i18n.addMessages('pt-BR', { meuPlugin: { salvar: 'Salvar' } });
  V.i18n.addMessages('en', { meuPlugin: { salvar: 'Save' } });
}
```

### Interceptador HTTP

```js
const remover = V.http.interceptors.request.use((config) => {
  config.headers = { ...config.headers, 'X-Meu-Plugin': '1' };
  return config;
});
```

`use` devolve a função que remove o interceptador. **Guarde esse retorno.** É a única
limpeza que o runtime te dá de graça, e você vai precisar dela quando existir `uninstall`.

Um interceptador vê todas as requisições e todas as respostas da aplicação. Um plugin que
instala um está pedindo confiança total, e a documentação dele deve dizer isso.

### Configuração e globais

```js
install(V, opcoes) {
  V.config.globals.MEU_PLUGIN_VERSAO = '1.0.0';
}
```

`V.config.globals` entra em `allowedGlobals` e fica visível em **toda expressão da página**.

> **Coloque valores e funções puras aqui, nunca capacidades.** Adicionar `window`, `fetch`
> ou `document` desfaz a caixa em que o avaliador de expressões roda. Veja
> [SECURITY.md](../SECURITY.md).

Mexer em `V.config.prefix`, `V.config.autoDiscover` ou `V.config.injectStyles` a partir de
um plugin é considerado invasivo. Se o plugin precisa disso, documente e deixe o usuário
escolher por opção.

---

## 3. Namespace

Plugins dividem os mesmos registros que o núcleo. Colisão de nome é o problema mais comum e
o mais fácil de evitar.

| O que registra          | Regra                                | Exemplo                        |
| ----------------------- | ------------------------------------ | ------------------------------ |
| Directive               | prefixe com o nome do plugin         | `v-graficos-pro-render`        |
| Componente              | prefixe com o nome do plugin         | `<graficos-pro-legenda>`       |
| Magia                   | `$` mais o nome, um objeto só        | `$graficosPro.tema`            |
| Propriedade em `V`      | uma só, o namespace do plugin        | `V.graficosPro.render()`       |
| Regra de validação      | prefixe com o nome do plugin         | `v-validate-graficospro-faixa` |
| Máscara                 | prefixe com o nome do plugin         | `V.registerMask('graficospro-faixa', ...)` |
| Evento global           | `nomePlugin:evento`                  | `V.emit('graficosPro:pronto')` |
| Evento de DOM           | `nomeplugin:evento`                  | `graficospro:renderizado`      |
| Chave de `localStorage` | `nomeplugin:`                        | `graficospro:preferencias`     |
| Classe CSS              | `.nomeplugin-`                       | `.graficospro-legenda`         |
| Variável CSS            | `--nomeplugin-`                      | `--graficospro-cor`            |

Reservado para o núcleo: todo nome já presente em `V`, toda magia listada em
`runtime/magics.ts`, todo nome de atributo registrado pelos módulos que vêm na biblioteca,
o prefixo `v-` nos nomes de directive que o núcleo já usa, o prefixo `--v-` em variáveis
CSS e o prefixo `voodoo:` em eventos.

**Como verificar antes de publicar:**

```js
console.log(V.directives.has('meu-nome'));   // deve ser false
console.log(V.components.has('meu-nome'));   // deve ser false
console.log(V.magics.has('$meuNome'));       // deve ser false
console.log('meuNome' in V);                 // deve ser false
```

O runtime **não** avisa quando você sobrescreve um nome existente. `defineDirective` faz
`directives.set(name, ...)`, que substitui em silêncio.

---

## 4. Versionamento

Um plugin declara compatibilidade em `peerDependencies`:

```json
{
  "name": "voodoo-graficos-pro",
  "version": "1.2.0",
  "peerDependencies": {
    "voodoojs": "^0.1.0"
  }
}
```

O runtime **não verifica isso**. Se o seu plugin depende de algo que pode não existir,
cheque na mão:

```js
install(V, opcoes) {
  if (!V.renderChart) {
    console.warn(
      '[graficos-pro] precisa do build completo da Voodoo.js. ' +
        'Use voodoo.full.min.js ou importe voodoojs pelo bundler.'
    );
    return;
  }
  // ...
}
```

Isso é especialmente importante porque os três builds de navegador expõem superfícies
diferentes. `V.router`, `V.i18n`, `V.renderChart`, `V.animate` e `V.xray` só existem no
build completo. `V.validate` e `V.modal` não existem no build mínimo.

Nome do pacote: prefixe com `voodoo-`. Palavras-chave sugeridas no `package.json`:
`voodoojs`, `voodoo-plugin`.

Siga SemVer para o próprio plugin. Uma mudança no nome de uma directive que você registrou
é uma mudança que quebra, porque o HTML de quem usa vai parar de funcionar.

---

## 5. Limpeza

O runtime **não oferece desinstalação**. Isso é um vazio conhecido, registrado no
[ROADMAP.md](../ROADMAP.md). Enquanto ele existir, a responsabilidade é do plugin.

O padrão recomendado é expor uma função de limpeza explícita:

```js
export const meuPlugin = {
  name: 'meu-plugin',

  install(V, opcoes) {
    const limpezas = [];

    // Guarde tudo que da para desfazer.
    limpezas.push(V.http.interceptors.request.use(adicionarCabecalho));
    limpezas.push(V.on('rota:mudou', aoMudarRota));

    const aoRedimensionar = () => recalcular();
    window.addEventListener('resize', aoRedimensionar);
    limpezas.push(() => window.removeEventListener('resize', aoRedimensionar));

    const timer = setInterval(sincronizar, 30_000);
    limpezas.push(() => clearInterval(timer));

    V.meuPlugin = {
      // ...
      desligar() {
        for (const fn of limpezas.reverse()) fn();
        limpezas.length = 0;
      },
    };
  },
};
```

O que **é** limpo sozinho:

- efeitos criados com `ctx.effect` dentro de uma directive;
- funções passadas para `ctx.cleanup`;
- listeners registrados pelas directives nativas;
- o escopo de efeitos de um componente, quando o elemento sai do DOM.

O que **não** é limpo sozinho:

- entradas em `V.directives`, `V.components`, `V.magics`, `V.masks` e no registro de regras
  de validação;
- propriedades que o plugin colocou em `V`;
- entradas em `V.config.globals`;
- interceptadores de HTTP;
- assinaturas do barramento global (`V.on`);
- listeners que você registrou em `window` ou `document`;
- timers;
- `<style>` injetados;
- a entrada no `Set` interno `installedPlugins`, que nunca é esvaziada.

Dentro de directives e componentes, sempre use os ganchos que o runtime dá:

```js
V.directive('meu-widget', {
  mounted(el, binding) {
    el._widget = new Widget(el, binding.value);
  },
  beforeUnmount(el) {
    el._widget?.destroy();
    delete el._widget;
  },
});
```

---

## 6. Plugin completo de exemplo

```js
/**
 * voodoo-analytics
 *
 * Registra `v-track` para eventos de clique, a magia `$analytics` e o
 * serviço `V.analytics`.
 */

const PADRAO = {
  url: '/eventos',
  debug: false,
  fila: 10,
};

export const analytics = {
  name: 'analytics',

  install(V, opcoes = {}) {
    const config = { ...PADRAO, ...opcoes };
    const limpezas = [];
    let fila = [];

    function enviar() {
      if (!fila.length) return;
      const lote = fila;
      fila = [];
      if (config.debug) console.log('[analytics]', lote);
      navigator.sendBeacon(config.url, JSON.stringify(lote));
    }

    function rastrear(evento, dados = {}) {
      fila.push({ evento, dados, em: Date.now() });
      if (fila.length >= config.fila) enviar();
    }

    // Um namespace so em V.
    V.analytics = {
      rastrear,
      enviar,
      configurar(novas) { Object.assign(config, novas); },
      desligar() {
        enviar();
        for (const fn of limpezas.reverse()) fn();
        limpezas.length = 0;
        delete V.analytics;
      },
    };

    // Magia, apontando para o mesmo namespace.
    V.magic('$analytics', () => V.analytics);

    // Directive prefixada.
    V.directive('analytics-track', {
      mounted(el, binding) {
        const aoClicar = () => rastrear(binding.value, { texto: el.textContent?.trim() });
        el.addEventListener('click', aoClicar);
        el._analyticsOff = () => el.removeEventListener('click', aoClicar);
      },
      beforeUnmount(el) {
        el._analyticsOff?.();
        delete el._analyticsOff;
      },
    });

    // Interceptador, com a remocao guardada.
    limpezas.push(
      V.http.interceptors.error.use((erro) => {
        rastrear('http:erro', { status: erro.status, url: erro.config?.url });
      })
    );

    // Descarrega o que sobrou quando a aba sai.
    const aoSair = () => enviar();
    window.addEventListener('pagehide', aoSair);
    limpezas.push(() => window.removeEventListener('pagehide', aoSair));
  },
};
```

```js
V.use(analytics, { url: '/api/eventos', debug: true });
```

```html
<button v-analytics-track="'comprar-clicado'">Comprar</button>
<span>{ $analytics ? 'ligado' : 'desligado' }</span>
```

---

## 7. O que falta no runtime

Registrado aqui porque quem escreve plugin esbarra nisso, e porque a especificação só fica
completa quando estas lacunas fecharem. Todas estão no [ROADMAP.md](../ROADMAP.md).

| Lacuna | Consequência para quem escreve plugin |
| ------ | ------------------------------------- |
| **Não existe `uninstall`.** `usePlugin` só adiciona ao `Set`. | Nenhum plugin pode ser removido. Impede recarregamento a quente e teardown limpo em teste. |
| **Não existe `unregister` para directive, componente, magia, regra ou máscara.** | Um nome registrado fica registrado para sempre. Testes que instalam plugins contaminam uns aos outros. |
| **Deduplicação por identidade, não por `name`.** | Duas cópias do mesmo plugin, vindas de caminhos diferentes, instalam as duas e registram o mesmo nome duas vezes. |
| **O campo `name` não é usado.** | Não dá para listar o que está instalado nem detectar conflito por nome. |
| **Não existe verificação de versão.** | Um plugin escrito para uma versão futura instala em silêncio e falha depois, longe da causa. |
| **`V.directive` não repassa `terminal`.** | Um plugin não consegue criar uma directive estrutural, do tipo de `v-if` e `v-for`. |
| **Sobrescrever um nome existente não avisa.** | Um plugin pode substituir `v-text` sem que ninguém perceba. |
| **`app.use()` instala no `V` global.** | Não existe registro por aplicação. Duas aplicações na mesma página dividem tudo. |
| **`install` não recebe contexto.** | O plugin não sabe se foi instalado por `V.use` ou por `app.use`, nem qual aplicação. |

Uma forma de fechar isso sem quebrar o que existe seria dar ao `install` um segundo objeto
de contexto com um registrador que anota tudo, e usar essas anotações para desfazer:

```js
// Proposta, ainda nao implementada.
install(V, opcoes, ctx) {
  ctx.directive('meu-widget', hooks);   // registrado e anotado
  ctx.onUninstall(() => { /* ... */ });
}

V.unuse(meuPlugin);  // desfaz tudo que ctx anotou
```

Se você for implementar, mantenha `install(V, options)` funcionando exatamente como hoje: o
terceiro parâmetro é aditivo e não quebra nenhum plugin existente.

---

## 8. Checklist de publicação

- [ ] `install(V, options)` existe e não lança quando `options` é `undefined`.
- [ ] O plugin reivindica **uma** propriedade em `V`.
- [ ] Toda directive, componente, magia, regra e máscara está prefixada com o nome do
      plugin.
- [ ] Nenhum nome colide com o núcleo (rode as checagens da seção 3).
- [ ] Recursos que só existem no build completo são verificados antes do uso.
- [ ] Existe um método de desligamento que desfaz interceptadores, listeners e timers.
- [ ] Directives e componentes limpam o que criaram nos ganchos de desmontagem.
- [ ] Nada é acrescentado a `V.config.globals` além de valores e funções puras.
- [ ] `peerDependencies` declara a faixa de versão da `voodoojs`.
- [ ] O README documenta as opções, tudo que é registrado e a licença.
- [ ] O plugin não usa `eval` nem `new Function`, e não traz dependência em tempo de
      execução, para continuar compatível com CSP restritiva.

## Leia também

- [Plugins](plugins.md), o guia de uso
- [Directives](directives.md)
- [Componentes](componentes.md)
- [Estrutura de aplicação](application-structure.md)
- [CONVENTIONS.md](../CONVENTIONS.md), regras de nome e política de depreciação
- [SECURITY.md](../SECURITY.md), o que um plugin pode comprometer
