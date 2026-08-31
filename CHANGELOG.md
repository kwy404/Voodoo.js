# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto adota o
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

## [0.1.0] - 2026-08-28

Primeira versão pública. Tudo abaixo entrou nesta versão.

### Adicionado

#### Núcleo reativo

- `reactive`, `ref`, `shallowRef`, `computed`, `effect`, `watch`, `watchEffect`, `nextTick`,
  `flushSync`, `stop`, `toRaw`, `markRaw`, `unref`, `isReactive` e `EffectScope`.
- Rastreamento de dependências por chave, com Proxy e agendamento em microtask.
- Detecção de laço infinito, que interrompe a repetição com aviso em vez de travar a aba.
- Tratador global de erros com `V.onError`.

#### Expressões

- Lexer, parser Pratt e interpretador de árvore próprios. Nenhum uso de `eval` ou `new Function`,
  o que permite rodar com Content Security Policy restritiva.
- Suporte a literais, template literals, spread, encadeamento opcional, arrow functions,
  ternário, atribuição composta, incremento e sequências.
- Lista fechada de globais permitidos, extensível por `V.config.globals`.
- Cache de análise por expressão.
- Interpolação de texto com chave simples `{ valor }`, aceitando também a chave dupla.

#### Directives essenciais

- `v-text`, `v-html`, `v-show`, `v-if`, `v-else-if`, `v-else`, `v-for`, `v-bind`, `v-class`,
  `v-style`, `v-on`, `v-model`, `v-init`, `v-ref`, `v-effect`, `v-watch`, `v-cloak`, `v-once`,
  `v-teleport`, `v-transition`, `v-ignore`, `v-pre`, `v-data` e `v-component`.
- Atalhos `:atributo`, `@evento`, `.propriedade` e directives de evento com nome próprio, de
  `v-click` a `v-drop`.
- Modificadores de evento: `prevent`, `stop`, `self`, `once`, `capture`, `passive`, `window`,
  `document`, `outside`, `debounce`, `throttle`, teclas e teclas de sistema.
- Eventos sintéticos: `hold`, `outside`, `visible`, `swipeleft`, `swiperight`, `swipeup` e
  `swipedown`.
- Apelidos de evento: `hover`, `unhover`, `tap`, `press`, `release`, `rightclick`, `type`,
  `enterkey` e `submitform`.
- Reaproveitamento de elementos no `v-for` por `:key`, com reordenação por cursor.

#### Runtime

- Walker com prioridade de directives, directives terminais e observação do DOM por
  `MutationObserver`.
- Limpeza automática de efeitos, ouvintes e observadores na remoção de um nó.
- **Limpeza dos atributos `v-*` depois da renderização**, controlada por
  `V.config.cleanAttributes`, com índice interno para que as directives continuem se encontrando.
- Configuração pela tag `<script>`: `data-manual`, `data-prefix`, `data-base-url`, `data-locale`,
  `data-devtools`, `data-no-styles`, `data-no-observer` e `data-keep-attributes`.

#### Componentes

- `V.component` com props tipadas, `state`, `computed`, `methods`, `watch`, `template`, `style`,
  slots nomeados, `emit` e ciclo de vida completo.
- Três formas de montar: `v-component`, tag registrada e tag em PascalCase.
- Isolamento de escopo por padrão, com `inheritScope` para herdar o do pai.

#### Estado

- `V.data` para o escopo raiz e `V.store` para stores nomeados, com persistência opcional.
- `v-persist`, que guarda o escopo no `localStorage`.
- `v-sync`, que sincroniza o escopo entre abas por `BroadcastChannel`.
- `v-history`, `v-undo` e `v-redo`, com o controlador exposto em `$history`.
- `v-storage`, que liga um campo isolado ao `localStorage`.
- Barramento de eventos global com `V.on`, `V.once`, `V.off` e `V.emit`.

#### HTTP

- Cliente `V.http` sobre `fetch`, com interceptadores, timeout, retry com espera progressiva,
  cache de resposta, cancelamento, upload com progresso, Server-Sent Events, leitura em streaming
  e fila offline.
- Envio automático do token CSRF lido de uma meta tag.
- Directives `v-get`, `v-post`, `v-put`, `v-patch`, `v-delete`, `v-load`, `v-load-visible`,
  `v-search` e `v-resource`.
- Atributos de configuração: `v-target`, `v-swap`, `v-trigger`, `v-poll`, `v-params`, `v-body`,
  `v-headers`, `v-cache`, `v-retry`, `v-timeout`, `v-as`, `v-json-path`, `v-template`,
  `v-offline-queue`, `v-min-length`, `v-scroll-to`, `v-manual`, `v-debounce`, `v-redirect`,
  `v-loading`, `v-loading-class`, `v-disable-loading`, `v-toast-success`, `v-toast-error`,
  `v-on-success`, `v-on-error` e `v-on-complete`.
- Renderização automática de JSON em tabela ou lista de definições, com tudo escapado.
- Cancelamento automático da requisição anterior do mesmo elemento.

#### Formulários

- `v-submit`, com serialização de nomes aninhados, envio AJAX, estado de carregamento,
  redirecionamento, troca de HTML e tratamento de erros do servidor.
- Estado reativo em `$form`, com `loading`, `saving`, `success`, `errors`, `message`, `data`,
  `status`, `dirty` e `progress`.
- `v-upload` e `v-dropzone`, com barra de progresso real e acessibilidade por teclado.
- `v-autosave`, com indicador de estado.
- `v-guard`, que avisa antes de sair da página com alterações pendentes.

#### Validação

- Motor com 29 regras: `required`, `email`, `url`, `number`, `integer`, `decimal`, `alpha`,
  `alphanumeric`, `minlength`, `maxlength`, `min`, `max`, `between`, `match`, `same`, `different`,
  `regex`, `date`, `after`, `before`, `accepted`, `in`, `notin`, `phone`, `cpf`, `cnpj`, `cep`,
  `creditcard`, `strongpassword` e `unique`.
- Cálculo real dos dígitos verificadores de CPF e CNPJ, e algoritmo de Luhn para cartão.
- Validação assíncrona, com a regra `unique` consultando o servidor.
- Regras próprias com `V.validator`, que criam a directive `v-validate-<nome>` automaticamente.
- Mensagens em português, configuráveis por `V.messages` e por `v-error-message`.
- Apresentação automática dos erros, com `aria-invalid`, `aria-describedby`, `role="alert"` e
  foco no primeiro campo com problema.

#### Máscaras

- Máscaras nomeadas: `cpf`, `cnpj`, `cpfcnpj`, `cep`, `phone`, `date`, `time`, `datetime`,
  `currency`, `percent`, `card`, `cvv`, `plate`, `hex` e `ip`.
- Máscara por padrão de caracteres, com os tokens `9`, `A`, `S`, `*` e escape.
- `v-mask` e `v-mask-currency`, com preservação da posição do cursor e apagamento inteligente
  sobre separadores.
- Modificador `.unmask`, que entrega o valor limpo ao `v-model`.
- `V.registerMask` para máscaras próprias.

#### Interface

- `v-toggle`, `v-collapse`, `v-collapse-toggle`, `v-dropdown`, `v-dropdown-menu`, `v-popover`,
  `v-tooltip`, `v-tabs`, `v-accordion`, `v-drawer`, `v-offcanvas`, `v-modal`, `v-confirm`,
  `v-theme-toggle`, `v-focus`, `v-focus-trap`, `v-click-outside`, `v-escape`, `v-hotkey`,
  `v-scroll-to`, `v-scrollspy`, `v-sticky`, `v-visible`, `v-infinite-scroll`, `v-lazy-src`,
  `v-lazy-bg`, `v-skeleton`, `v-copy`, `v-copy-from`, `v-print`, `v-share`, `v-download`,
  `v-fullscreen`, `v-resizable`, `v-command`, `v-command-item`, `v-idle`, `v-online` e
  `v-offline`.
- Notificações com fila, pausa ao passar o mouse, barra de progresso, ação e suporte a promessa.
- Diálogos acessíveis: `modal`, `alert`, `confirm`, `prompt` e `dialog`, com empilhamento, foco
  preso e devolução do foco.
- Paleta de comandos com busca sem acento e navegação por teclado.
- Atalhos globais de teclado com `V.hotkey`, entendendo `mod` como Command no macOS.
- Posicionamento flutuante que vira de lado quando não cabe e nunca sai da tela.

#### Arrastar e soltar

- `v-sortable`, `v-draggable`, `v-droppable` e `v-dnd-group`, construídos sobre eventos de
  ponteiro, funcionando no mouse, na caneta e no toque.
- Arraste completo pelo teclado, com anúncio em região `aria-live`.
- Grupos, filtro por seletor, alça de arraste, travamento de eixo e rolagem automática.

#### Tema e paleta

- Tema claro e escuro com `V.theme`, aplicado antes do primeiro render.
- `V.palette`, que gera escalas de 50 a 900 em OKLCH, a versão escura e a cor de texto de maior
  contraste, com cinco presets prontos.
- Tokens CSS `--v-*` usados por todos os componentes.
- Utilitários de cor: escala, contraste WCAG, luminância e conversões entre sRGB e OKLCH.

#### DOM encadeável

- `V(seletor)` com percurso, conteúdo, atributos, classes, estilo, estrutura, eventos com
  delegação, efeitos, serialização de formulário e integração com o runtime.

#### Build completo

- **Gráficos** em SVG puro, com 11 tipos, legenda clicável, tooltip, responsividade por
  `ResizeObserver` e descrição acessível gerada a partir dos dados.
- **Animações** com laço compartilhado, tween e física de mola real, nove presets, oito curvas,
  `stagger`, `inView`, `scrollProgress`, além de `v-motion`, `v-motion-scroll`,
  `v-motion-stagger`, `v-motion-hover`, `v-motion-tap`, `v-parallax`, `v-flip`, `v-count` e
  `v-typewriter`.
- **Roteador** de página única, com modos `history` e `hash`, parâmetros obrigatórios e
  opcionais, curinga, guards globais e por rota, controle de rolagem, título por rota, View
  Transitions e as directives `v-router-view`, `v-link` e `v-route-active`.
- **Idiomas** com tradução reativa, pluralização por CLDR, carregamento sob demanda, formatadores
  de número, moeda, data e tempo relativo, e as directives `v-t`, `v-t-params` e `v-locale`.
- **Inspetor xray**, que contorna elementos com directives, mostra escopos, componentes, stores,
  eventos, rede e desempenho, e faz o elemento piscar a cada atualização reativa.
- **29 componentes prontos**: `VButton`, `VIconButton`, `VCard`, `VLabel`, `VField`, `VInput`,
  `VTextarea`, `VSelect`, `VCheckbox`, `VRadio`, `VSwitch`, `VBadge`, `VTag`, `VAlert`,
  `VAvatar`, `VSpinner`, `VSkeleton`, `VProgress`, `VDivider`, `VTable`, `VPagination`,
  `VBreadcrumb`, `VStat`, `VEmptyState`, `VTimeline`, `VSteps`, `VRating`, `VTooltipButton` e
  `VCodeBlock`.

#### Ferramentas

- Dois bundles de navegador: essencial e completo, ambos publicando `window.V`.
- Builds ESM, CJS e tipos TypeScript, com pontos de entrada dedicados para reatividade, HTTP e
  utilitários.
- Linha de comando `@voodoo/cli`, com `init`, `build` sob medida, `add` e `info`.
- Script de medição de tamanho com metas por bundle.
- Suíte com mais de 190 testes automatizados, cobrindo reatividade, parser, directives, estado, HTTP,
  interface e utilitários.

### Notas desta versão

- Os atributos `v-*` são removidos do HTML depois de processados. Não escreva CSS apoiado em
  seletores como `[v-tab]`.
- `v-confirm` no mesmo elemento de uma directive de verbo HTTP ou de `v-submit` pergunta duas
  vezes. Prefira `v-confirm` com `v-click`, ou `$confirm(...)` dentro da expressão.
- `v-t-params` é lido apenas na primeira renderização. Para textos que acompanham a troca de
  idioma, use a interpolação `{ $t('chave', { n: valor }) }`.
- Os atributos `v-chart-*` são lidos na montagem. Com dados reativos, declare tudo no objeto:
  `v-chart="{ type: 'bar', data: vendas }"`.
- Os textos extras do `v-confirm`, como `v-confirm-title`, dependem de
  `V.config.cleanAttributes = false`.

[Não publicado]: https://github.com/voodoojs/voodoo/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/voodoojs/voodoo/releases/tag/v0.1.0
