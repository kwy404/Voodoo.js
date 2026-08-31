# API

Referência do objeto `V`, agrupada por área. O que estiver marcado com **(completo)** só existe no
`voodoo.full.min.js` ou em um build sob medida que inclua o módulo.

`V` é ao mesmo tempo uma função e um objeto:

```js
V('#lista .item').addClass('ativo');   // coleção encadeável
V.toast.success('Pronto');             // serviços
```

`window.Voodoo` é o mesmo objeto.

---

## Núcleo

| Membro | Descrição |
| --- | --- |
| `V.version` | Versão publicada |
| `V.config` | Configuração global. Veja [Instalação](instalacao.md) |
| `V.start(raiz?)` | Percorre e inicializa. Chamado sozinho nos builds de navegador |
| `V.walk(no, escopo?)` | Inicializa um trecho de DOM |
| `V.refresh(raiz?)` | Reinicializa uma raiz |
| `V.destroy(no)` | Desmonta, parando efeitos e removendo ouvintes |
| `V.stopObserving()` | Desliga o `MutationObserver` |
| `V.getScope(no)` | Escopo associado ao nó, se houver |
| `V.findScope(no)` | Escopo efetivo, subindo os ancestrais |
| `V.addCleanup(no, fn)` | Registra limpeza para a remoção do nó |
| `V.parseAttribute(nome, valor)` | Converte um atributo na descrição de uma directive |
| `V.onError(fn)` | Define o tratamento de erros da aplicação inteira |

## Reatividade

| Membro | Descrição |
| --- | --- |
| `V.reactive(objeto)` | Objeto reativo em profundidade |
| `V.ref(valor)` | Referência reativa, em `.value` |
| `V.shallowRef(valor)` | Referência sem profundidade |
| `V.computed(getter)` | Valor derivado com cache. Aceita `{ get, set }` |
| `V.effect(fn, opcoes?)` | Efeito reativo |
| `V.watch(fonte, cb, opcoes?)` | Observa e chama no que mudar |
| `V.watchEffect(fn)` | Efeito com limpeza entre execuções |
| `V.nextTick(fn?)` | Espera o DOM refletir |
| `V.flushSync()` | Aplica tudo que estiver pendente, agora |
| `V.stop(runner)` | Encerra um efeito |
| `V.effectScope(detached?)` | Cria um escopo de efeitos |
| `V.EffectScope` | A classe |
| `V.toRaw(valor)` | Objeto original por trás do proxy |
| `V.markRaw(valor)` | Marca um objeto para nunca virar proxy |
| `V.unref(valor)` | `valor.value` quando é ref |

Veja [Reatividade](reatividade.md).

## Estado

| Membro | Descrição |
| --- | --- |
| `V.data(valores)` | Coloca valores no escopo raiz |
| `V.scope` | O escopo raiz |
| `V.store(nome, definicao?, opcoes?)` | Cria ou recupera um store |
| `V.stores` | Objeto com todos os stores |
| `V.storeNames()` | Lista os nomes |
| `V.removeStore(nome)` | Remove e para a persistência |

## Componentes e directives

| Membro | Descrição |
| --- | --- |
| `V.component(nome, definicao)` | Registra um componente |
| `V.components` | `Map` com as definições |
| `V.instances` | `Set` com as instâncias montadas |
| `V.directive(nome, definicao)` | Registra uma directive com ciclo de vida |
| `V.directives` | `Map` com as directives registradas |
| `V.magic(nome, getter)` | Registra uma variável mágica |
| `V.magics` | `Map` com as magias |
| `V.use(plugin, opcoes?)` | Instala um plugin |
| `V.PRIORITY` | Constantes de prioridade |
| `V.Scope` | A classe de escopo |

Veja [Componentes](componentes.md) e [Plugins](plugins.md).

## Expressões

| Membro | Descrição |
| --- | --- |
| `V.parse(texto)` | Analisa e devolve a árvore |
| `V.tokenize(texto)` | Lista de tokens |
| `V.evaluate(no, escopo)` | Avalia uma árvore |
| `V.evaluateIn(texto, escopo, contexto?)` | Analisa e avalia, sem lançar |
| `V.stringify(valor)` | Conversão usada na interpolação |
| `V.clearParseCache()` | Limpa o cache de expressões |
| `V.globals` | Lista de globais permitidos |
| `V.VoodooSyntaxError`, `V.VoodooRuntimeError` | Classes de erro |

Veja [Expressões](expressoes.md).

## DOM encadeável

`V(seletor)` e `V.query(seletor, contexto?)` devolvem uma coleção.

**Percurso:** `find`, `closest`, `parent`, `parents`, `children`, `siblings`, `next`, `prev`,
`first`, `last`, `eq`, `filter`, `not`, `has`, `is`, `add`, `slice`, `each`, `get`, `toArray`.

**Conteúdo:** `text`, `html`, `val`, `attr`, `removeAttr`, `prop`, `data`.

**Estilo:** `css`, `width`, `height`, `offset`, `position`, `scrollTop`, `addClass`,
`removeClass`, `toggleClass`, `hasClass`.

**Estrutura:** `append`, `prepend`, `before`, `after`, `appendTo`, `prependTo`, `replaceWith`,
`wrap`, `unwrap`, `remove`, `empty`, `clone`.

**Eventos:** `on`, `off`, `once`, `trigger`, `emit`.

**Visibilidade e animação:** `show`, `hide`, `toggle`, `fadeIn`, `fadeOut`, `slideUp`,
`slideDown`, `slideToggle`, `animate`, `scrollIntoView`.

**Formulário:** `serialize`, `serializeObject`, `focus`, `blur`, `select`.

**Runtime:** `walk`, `destroy`.

| Membro | Descrição |
| --- | --- |
| `V.query(entrada, contexto?)` | Cria a coleção |
| `V.ready(fn)` | Executa quando o DOM estiver pronto |
| `V.fromHtml(html)` | Cria elementos sem inserir no documento |
| `V.Collection` | A classe `VoodooCollection` |

Veja [Migrando do jQuery](migrando-do-jquery.md).

## HTTP

| Membro | Descrição |
| --- | --- |
| `V.http.get(url, opcoes?)` | Devolve os dados |
| `V.http.post(url, corpo?, opcoes?)` | |
| `V.http.put`, `V.http.patch`, `V.http.delete`, `V.http.head` | |
| `V.http.request(config)` | Resposta completa |
| `V.http.upload(url, formData, opcoes?)` | Envio com progresso |
| `V.http.sse(url, handlers)` | Server-Sent Events |
| `V.http.stream(url, onLine, opcoes?)` | Leitura linha a linha |
| `V.http.interceptors.request.use(fn)` | |
| `V.http.interceptors.response.use(fn)` | |
| `V.http.interceptors.error.use(fn)` | |
| `V.http.setBaseURL(url)` | |
| `V.http.setHeader(nome, valor)` | |
| `V.http.setToken(token, esquema?)` | |
| `V.http.clearCache(padrao?)` | |
| `V.http.flushOfflineQueue()` | |
| `V.http.defaults` | Configuração padrão |
| `V.request(config)` | O mesmo que `V.http.request` |
| `V.HttpError` | Classe de erro |

Veja [HTTP](http.md).

## Formulários e validação

| Membro | Descrição |
| --- | --- |
| `V.validate(alvo)` | Valida um formulário ou um campo |
| `V.validateForm(form)` | Alias de `V.validate` |
| `V.validator(nome, fn, mensagem?)` | Registra uma regra |
| `V.messages` | Mensagens padrão |
| `V.serializeForm(form, opcoes?)` | Objeto ou `FormData` |
| `V.showFormErrors(form, erros)` | Aplica erros do servidor |
| `V.showFieldError(campo, mensagem)` | |
| `V.clearErrors(form)` | |

| Membro | Descrição |
| --- | --- |
| `V.mask(valor, padrao)` | Aplica uma máscara |
| `V.applyMask(valor, padrao)` | O mesmo |
| `V.unmask(valor, padrao?)` | Remove a formatação |
| `V.registerMask(nome, padraoOuFn)` | Registra uma máscara |
| `V.masks` | `Map` com as máscaras |

Veja [Formulários](formularios.md), [Validação](validacao.md) e [Máscaras](mascaras.md).

## Interface

| Membro | Descrição |
| --- | --- |
| `V.toast(mensagem, opcoes?)` | Notificação |
| `V.toast.success`, `.error`, `.warning`, `.info`, `.loading` | |
| `V.toast.promise(promessa, mensagens)` | |
| `V.toast.clear()`, `V.toast.configure(opcoes)` | |
| `V.modal.open/close/toggle/closeAll/isOpen` | Modais |
| `V.modal.opened`, `V.modal.count` | |
| `V.modal.configure(opcoes)`, `V.modal.labels(textos)` | |
| `V.dialog(opcoes)` | Diálogo genérico com botões |
| `V.alert(mensagem, opcoes?)` | |
| `V.confirm(mensagem, opcoes?)` | |
| `V.prompt(rotulo, opcoes?)` | |
| `V.hotkey(combo, handler, opcoes?)` | Atalho global de teclado |
| `V.palette(opcoes?)` | Aplica a paleta |
| `V.palette.use/reset/scale/contrastText/contrastRatio/luminance/convert` | |
| `V.theme.current/resolved/set/toggle/apply/init` | Tema claro e escuro |
| `V.injectStyle(id, css)` | Injeta CSS uma única vez |
| `V.ensureTokens()` | Garante as variáveis `--v-*` |

Veja [Interface](interface.md) e [Tema e paleta](tema-e-paleta.md).

## Transições

| Membro | Descrição |
| --- | --- |
| `V.enter(el, opcoes?)` | Transição de entrada por classes |
| `V.leave(el, opcoes?)` | Transição de saída |
| `V.fadeIn(el, duracao?)`, `V.fadeOut(el, duracao?)` | |
| `V.slideDown(el, duracao?)`, `V.slideUp(el, duracao?)` | |
| `V.viewTransition(fn)` | Usa a View Transitions API quando existir |

## Armazenamento

| Membro | Descrição |
| --- | --- |
| `V.storage` | `localStorage` com JSON automático |
| `V.session` | `sessionStorage`, mesma API |
| `V.cookie` | `get`, `set`, `remove`, `has` |
| `V.cache` | Memória com expiração: `set`, `get`, `has`, `remove`, `clear`, `remember`, `size` |
| `V.url` | Query string: `get`, `all`, `set`, `remove`, `merge` |

## Eventos globais

| Membro | Descrição |
| --- | --- |
| `V.on(nome, handler)` | Assina. Devolve a função que cancela |
| `V.once(nome, handler)` | Assina só a próxima ocorrência |
| `V.off(nome, handler?)` | Cancela |
| `V.emit(nome, payload?)` | Dispara |

## Ambiente

| Membro | Descrição |
| --- | --- |
| `V.screen` | Objeto reativo com largura, altura e pontos de quebra |
| `V.network` | Objeto reativo com o estado da conexão |
| `V.clipboard` | `copy` e `read` |
| `V.device` | Getters de toque, tamanho, movimento e tema |
| `V.isBrowser` | Existe DOM? |

## Utilitários

`uuid`, `uid`, `sleep`, `parseDuration`, `debounce`, `throttle`, `memoize`, `clone`, `merge`,
`groupBy`, `unique`, `chunk`, `sortBy`, `get`, `set`, `random`, `sample`, `slugify`, `truncate`,
`capitalize`, `titleCase`, `escapeHtml`, `stripTags`, `formatCurrency`, `formatNumber`,
`formatDate`, `relativeTime`, `formatFileSize`, `formatPercent`, `setFormatDefaults`.

Veja [Utilitários](utilitarios.md).

> `V.once` é o barramento de eventos. O utilitário `once`, que executa uma função uma única vez,
> está no import direto: `import { once } from 'voodoojs/utils'`.

## Animação (completo)

| Membro | Descrição |
| --- | --- |
| `V.animate(alvo, keyframes, opcoes?)` | Anima elementos |
| `V.spring(de, para, opcoes?)` | Mola entre dois números |
| `V.stagger(alvos, keyframes, opcoes?)` | Onda entre itens |
| `V.inView(el, cb, opcoes?)` | Dispara ao entrar na tela |
| `V.scrollProgress(el, cb)` | Progresso de 0 a 1 na rolagem |
| `V.motion` | Os presets prontos |
| `V.easings` | As curvas prontas |

Veja [Animações](animacoes.md).

## Gráficos (completo)

| Membro | Descrição |
| --- | --- |
| `V.renderChart(el, opcoes)` | Desenha e devolve o controle |
| `V.chart` | Alias de `V.renderChart` |
| `V.charts` | `{ render, format, colors }` |
| `V.chartColors` | Paleta padrão dos gráficos |

Veja [Gráficos](graficos.md).

## Roteador (completo)

| Membro | Descrição |
| --- | --- |
| `V.router(opcoes)` | Configura o roteador |
| `V.router.push/replace/back/forward/go` | Navegação |
| `V.router.resolve/addRoute/removeRoute/patterns/stop/clearViewCache/ready/current` | |
| `V.navigate(destino, opcoes?)` | Navega |
| `V.route` | Rota atual, reativa |
| `V.resolveRoute(destino)` | Resolve sem navegar |

Veja [Roteador](roteador.md).

## Idiomas (completo)

| Membro | Descrição |
| --- | --- |
| `V.i18n(opcoes?)` | Configura |
| `V.i18n.t/te/n/c/d/rt` | Tradução e formatadores |
| `V.i18n.addMessages/loadMessages/messagesOf/detectLocale` | |
| `V.i18n.locale/fallback/locales` | |
| `V.t(chave, params?)` | Traduz |
| `V.setLocale(idioma)`, `V.getLocale()` | |

Veja [Idiomas](idiomas.md).

## Devtools (completo)

| Membro | Descrição |
| --- | --- |
| `V.xray(force?)` | Liga e desliga o inspetor |
| `V.enableXrayShortcut()` | Instala o `Ctrl+Shift+X` |
| `V.devtools` | Barramento de eventos das devtools |

Veja [Devtools](devtools.md).

---

## Variáveis mágicas

Disponíveis em qualquer expressão, sem declarar nada.

### Contexto

| Magia | O que é |
| --- | --- |
| `$el` | Elemento que criou o escopo |
| `$refs` | Elementos marcados com `v-ref`, mesclando os escopos ancestrais |
| `$data` | Dados do escopo atual |
| `$root` | Dados do escopo raiz |
| `$parent` | Dados do escopo pai |
| `$self` | Instância do componente mais próximo, ou os dados do escopo |

### Estado e serviços

| Magia | O que é |
| --- | --- |
| `$store` | Todos os stores globais |
| `$http` | Cliente HTTP |
| `$toast` | Notificações |
| `$modal`, `$dialog`, `$alert`, `$confirm`, `$prompt` | Diálogos |
| `$storage`, `$session`, `$cookie`, `$cache`, `$url` | Armazenamento |
| `$clipboard` | Copiar e ler a área de transferência |
| `$theme` | Tema claro e escuro |
| `$form` | Estado do formulário mais próximo |
| `$history` | Controlador de desfazer e refazer, quando há `v-history` acima |

### Ambiente

| Magia | O que é |
| --- | --- |
| `$screen` | Largura, altura e pontos de quebra, reativo |
| `$network` | Estado da conexão, reativo |
| `$device` | Toque, tamanho, movimento e tema |

### Fluxo

| Magia | O que é |
| --- | --- |
| `$nextTick` | Espera o DOM refletir |
| `$watch(expressao, cb)` | Observa uma expressão |
| `$dispatch(nome, detalhe?)` | Dispara um `CustomEvent` que sobe pela árvore |
| `$log(...)` | Escreve no console com prefixo |

### Somente no build completo

| Magia | O que é |
| --- | --- |
| `$route` | Rota atual |
| `$router` | Controle de navegação |
| `$t` | Traduz |
| `$locale` | Idioma ativo |
| `$i18n` | Módulo de idiomas |
| `$n`, `$c`, `$d`, `$rt` | Número, moeda, data e tempo relativo |

### Locais

Existem apenas dentro de certas expressões:

| Variável | Onde |
| --- | --- |
| `$event` | Manipuladores de evento |
| `$detail` | Manipuladores de evento, com o `detail` do `CustomEvent` |
| `$value`, `$old` | `v-watch` combinado com `v-model` |
| `$data`, `$response` | `v-on-success` e `v-on-error` de formulários |

---

## Importações nomeadas

Além do objeto `V`, tudo está disponível como importação nomeada:

```js
import {
  reactive, ref, computed, effect, watch, nextTick, effectScope,
  parse, evaluate, tokenize,
  config, PRIORITY, defineDirective,
  Scope, magic, rootScope,
  walk, destroy, refresh, start, findScope, getScope, addCleanup,
  defineComponent, mountComponent, instances,
  screen, network, clipboard,
  http, request, HttpError,
  store, allStores, removeStore, storeNames,
  storage, session, cookie, cache, url, theme,
  toast, modal, alert, confirm, prompt, dialog, palette,
  query, ready, VoodooCollection, fromHtml,
  injectStyle, ensureTokens,
  enter, leave, fadeIn, fadeOut, slideUp, slideDown, viewTransition,
  router, route, navigate,
  i18n, t, setLocale, getLocale,
  animate, spring, stagger, inView, scrollProgress, easings, motionPresets,
  renderChart, charts,
  validator, validate, serializeForm, showFormErrors, clearErrors,
  mask, masks, applyMask, unmask, registerMask,
  hotkey, xray, devtoolsBus,
} from 'voodoojs';
```

Os tipos TypeScript acompanham o pacote:

```ts
import type {
  ComponentDefinition, DirectiveHooks, DirectiveBinding,
  VoodooPlugin, VoodooConfig,
  HttpResponse, RequestConfig, HttpMethod,
} from 'voodoojs';
```

---

Anterior: [Utilitários](utilitarios.md) · Próximo: [Segurança](seguranca.md)
