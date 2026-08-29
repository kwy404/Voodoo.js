import { c as core, V as VoodooCollection } from './query-B9GJK0Mo.cjs';
export { C as ComponentDefinition, D as DirectiveBinding, a as DirectiveHooks, P as PRIORITY, S as Scope, b as VoodooConfig, d as VoodooPlugin, e as VoodooRuntimeError, f as VoodooSyntaxError, g as addCleanup, h as allStores, i as allowedGlobals, j as cache, k as clearParseCache, l as config, m as cookie, n as defineComponent, o as defineDirective, p as destroy, q as ensureTokens, r as enter, s as evaluate, t as fadeIn, u as fadeOut, v as findScope, w as fromHtml, x as getScope, y as injectStyle, z as instances, A as leave, B as magic, E as magics, F as mountComponent, G as parse, H as query, I as ready, J as refresh, K as removeStore, L as rootScope, M as session, N as slideDown, O as slideUp, Q as start, R as storage, T as store, U as storeNames, W as stringify, X as theme, Y as toast, Z as tokenize, _ as url, $ as viewTransition, a0 as walk } from './query-B9GJK0Mo.cjs';
export { EffectScope, computed, effect, effectScope, flushSync, isReactive, markRaw, nextTick, reactive, ref, shallowRef, stop, toRaw, unref, watch, watchEffect } from './reactivity.cjs';
export { HttpError, HttpMethod, HttpResponse, RequestConfig, http, request } from './http.cjs';
export { DebouncedFunction, FormatOptions, capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, uuid } from './utils.cjs';

/**
 * @module directives/ui
 *
 * Componentes de interface declarativos. Tudo aqui funciona escrevendo apenas
 * HTML: nenhuma linha de JavaScript e necessaria para ter menu suspenso, abas,
 * gaveta lateral, tooltip, paleta de comandos e o resto.
 *
 * ```html
 * <button v-dropdown="#menu">Acoes</button>
 * <div id="menu" v-dropdown-menu>
 *   <button v-copy="PROMO10">Copiar cupom</button>
 * </div>
 * ```
 *
 * Acessibilidade nao e opcional neste modulo: cada componente cuida de papeis
 * ARIA, navegacao por teclado, foco visivel e fechamento por Escape.
 */

interface HotkeyOptions {
    /** Dispara mesmo com o foco dentro de um campo de texto. Padrao `false`. */
    allowInInput?: boolean;
    /** Cancela o comportamento padrao do navegador. Padrao `true`. */
    preventDefault?: boolean;
}
/**
 * Registra um atalho global de teclado.
 *
 * ```js
 * const parar = V.hotkey('ctrl+k', () => abrirBusca())
 * parar() // remove o atalho
 * ```
 *
 * Aceita combinacoes (`ctrl+shift+p`, `alt+1`, `meta+k`, `mod+s`), teclas
 * isoladas (`?`, `Escape`) e varios combos separados por virgula. Combos sem
 * modificador nao disparam quando o foco esta em um campo de texto, para nao
 * atrapalhar quem esta digitando.
 *
 * @param combo combinacao de teclas
 * @param handler funcao executada quando o atalho e acionado
 * @param options ajustes de comportamento
 * @returns funcao que remove o atalho
 */
declare function hotkey(combo: string, handler: (event: KeyboardEvent) => void, options?: HotkeyOptions): () => void;

/** Alvo aceito por `animate` e `stagger`. */
type MotionTarget = Element | ArrayLike<Element> | string | null | undefined;
/** Valor de uma propriedade animada. */
type MotionValue = number | string;
/**
 * Mapa de propriedades animadas. Um valor unico usa o estado atual como ponto
 * de partida. Um par `[de, para]` define os dois extremos.
 */
type MotionKeyframes = Record<string, MotionValue | [MotionValue, MotionValue]>;
/** Curva de progresso. Recebe e devolve numeros normalmente entre 0 e 1. */
type EasingFunction = (t: number) => number;
/** Controle devolvido por qualquer animacao. */
interface AnimationControl {
    /** Interrompe a animacao no ponto atual, sem disparar `onComplete`. */
    stop(): void;
    /** Resolve quando a animacao termina ou quando e interrompida. */
    finished: Promise<void>;
}
/** Parametros fisicos da mola. */
interface SpringConfig {
    /** Rigidez da mola. Quanto maior, mais rapido. Padrao 170. */
    stiffness?: number;
    /** Atrito. Quanto maior, menos oscilacao. Padrao 26. */
    damping?: number;
    /** Massa do corpo. Quanto maior, mais lento e pesado. Padrao 1. */
    mass?: number;
    /** Velocidade inicial, em unidades por segundo. */
    velocity?: number;
    /** Distancia considerada repouso. */
    restDelta?: number;
    /** Velocidade considerada repouso. */
    restSpeed?: number;
}
/** Opcoes de `animate`. */
interface AnimateOptions {
    /** Duracao em milissegundos. Ignorada quando `spring` esta ativo. Padrao 400. */
    duration?: number;
    /** Espera antes de comecar, em milissegundos. */
    delay?: number;
    /** Nome de um easing conhecido ou funcao propria. */
    easing?: EasingName | EasingFunction | string;
    /** Usa fisica de mola no lugar do tween. `true` aceita os padroes. */
    spring?: boolean | SpringConfig;
    /** Repeticoes extras. `2` executa tres vezes ao todo. */
    repeat?: number;
    /** Comportamento de cada repeticao. */
    repeatType?: 'loop' | 'reverse' | 'mirror';
    /** Ignora `prefers-reduced-motion`. Reserve para animacoes essenciais. */
    force?: boolean;
    /** Chamado a cada quadro com o progresso, que pode passar de 1 na mola. */
    onUpdate?(progress: number): void;
    /** Chamado quando a animacao chega ao fim por conta propria. */
    onComplete?(): void;
}
/** Opcoes de `stagger`. */
interface StaggerOptions extends AnimateOptions {
    /** Atraso somado a cada item da lista, em milissegundos. Padrao 60. */
    delay?: number;
    /** De onde a onda parte. Padrao `first`. */
    from?: 'first' | 'last' | 'center';
    /** Atraso aplicado antes do primeiro item da onda. */
    start?: number;
}
/** Opcoes de `spring`. */
interface SpringOptions extends SpringConfig {
    /** Recebe o valor interpolado a cada quadro. */
    onUpdate?(value: number): void;
    /** Chamado quando a mola entra em repouso. */
    onComplete?(): void;
}
/** Opcoes de `inView`. */
interface InViewOptions {
    /** Desliga o observador depois da primeira entrada. Padrao `true`. */
    once?: boolean;
    /** Margem do observador, no formato de `rootMargin`. */
    margin?: string;
    /** Fracao visivel necessaria, ou `any` e `all`. Padrao 0.25. */
    amount?: number | 'any' | 'all';
    /** Raiz do observador. Padrao a viewport. */
    root?: Element | null;
}
/**
 * Objeto que mistura propriedades animadas e opcoes de animacao, no formato
 * usado pelos presets e pelas directives.
 */
interface MotionVariant extends AnimateOptions {
    [property: string]: unknown;
}
/**
 * Curvas de progresso prontas. Todas recebem e devolvem valores entre 0 e 1,
 * com excecao de `easeOutBack` e `anticipate`, que passam do intervalo de
 * proposito para dar a sensacao de peso.
 */
declare const easings: {
    /** Progresso constante. */
    linear(t: number): number;
    /** Comeca devagar e acelera. */
    easeIn(t: number): number;
    /** Comeca rapido e desacelera. A escolha padrao para entradas. */
    easeOut(t: number): number;
    /** Acelera no comeco e freia no fim. */
    easeInOut(t: number): number;
    /** Passa do alvo e volta, dando um leve exagero no fim. */
    easeOutBack(t: number): number;
    /** Freada muito longa, boa para entradas grandes. */
    easeOutExpo(t: number): number;
    /** Recua um pouco antes de avancar, como quem toma impulso. */
    anticipate(t: number): number;
    /** Quica ao chegar no alvo. */
    bounce(t: number): number;
};
/** Nomes aceitos na opcao `easing`. */
type EasingName = keyof typeof easings;
/**
 * Anima um ou varios elementos.
 *
 * ```js
 * V.animate('.card', { opacity: [0, 1], y: [24, 0] }, { duration: 420 })
 * const controle = V.animate(el, { scale: 1.2 }, { spring: { stiffness: 300 } })
 * await controle.finished
 * ```
 *
 * @param target elemento, lista de elementos ou seletor CSS
 * @param keyframes propriedades animadas, com valor unico ou par `[de, para]`
 * @param options duracao, atraso, easing, mola e repeticao
 */
declare function animate(target: MotionTarget, keyframes: MotionKeyframes, options?: AnimateOptions): AnimationControl;
/**
 * Integra uma mola real entre dois numeros e entrega o valor a cada quadro.
 * Nao toca no DOM, entao serve tanto para estilos quanto para contadores,
 * rolagem suave ou qualquer outro valor numerico.
 *
 * ```js
 * V.spring(0, 320, { stiffness: 210, damping: 22, onUpdate: (v) => barra.style.width = v + 'px' })
 * ```
 */
declare function spring(from: number, to: number, options?: SpringOptions): AnimationControl;
/**
 * Anima uma lista inteira com atraso progressivo entre os itens.
 *
 * ```js
 * V.stagger('.card', V.motionPresets.fadeUp, { delay: 70, from: 'center' })
 * ```
 *
 * @param targets elementos, lista ou seletor CSS
 * @param keyframes propriedades animadas
 * @param options `delay` e o passo entre itens e `start` o atraso da onda toda
 */
declare function stagger(targets: MotionTarget, keyframes: MotionKeyframes, options?: StaggerOptions): AnimationControl;
/**
 * Dispara um callback quando o elemento entra na viewport.
 *
 * O callback pode devolver uma funcao de limpeza, executada quando o elemento
 * sai da viewport. Isso permite montar e desmontar efeitos sem esforco.
 *
 * ```js
 * const parar = V.inView(secao, () => secao.classList.add('ativa'), { once: true })
 * ```
 *
 * @returns funcao que encerra a observacao
 */
declare function inView(el: Element, callback: (entry: IntersectionObserverEntry) => void | (() => void), options?: InViewOptions): () => void;
/**
 * Reporta de 0 a 1 conforme o elemento atravessa a tela. Vale 0 quando o topo
 * do elemento encosta na base da viewport e 1 quando a base dele sai por cima.
 *
 * ```js
 * V.scrollProgress(secao, (p) => barra.style.width = (p * 100) + '%')
 * ```
 *
 * @returns funcao que encerra a observacao
 */
declare function scrollProgress(el: Element, callback: (progress: number) => void): () => void;
/** Todos os presets reunidos, para busca por nome. */
declare const motionPresets: Record<string, MotionVariant>;

/**
 * @module charts
 *
 * Graficos em SVG puro, sem nenhuma dependencia externa. Todo o desenho e
 * gerado como texto e entregue de uma vez ao container, o que mantem o
 * redesenho barato mesmo com dados mudando a cada quadro.
 *
 * O modulo segue tres compromissos:
 *
 * - responsivo, com `viewBox`, `preserveAspectRatio` e `ResizeObserver`;
 * - acessivel, com `role="img"`, `aria-label` descritivo e `<title>` por forma;
 * - tematico, usando as variaveis `--v-*` para funcionar em claro e escuro.
 *
 * ```html
 * <div v-chart="{ type: 'line', data: vendas, labels: meses, smooth: true }"></div>
 * <div v-chart="vendas" v-chart-type="bar"></div>
 * ```
 */
/** Tipos de grafico suportados. */
type ChartType = 'line' | 'area' | 'bar' | 'column' | 'stacked' | 'pie' | 'donut' | 'sparkline' | 'radar' | 'scatter' | 'progress';
/** Formato aplicado aos valores exibidos. */
type ChartFormat = 'number' | 'currency' | 'percent';
/** Ponto nomeado. `x` e `y` sao usados apenas por `scatter`. */
interface ChartPoint {
    label?: string;
    value?: number;
    x?: number;
    y?: number;
}
/** Serie nomeada, usada em graficos com mais de uma linha ou barra. */
interface ChartSeriesInput {
    name: string;
    data: number[];
    color?: string;
}
/** Formatos aceitos em `options.data`. */
type ChartData = number | number[] | ChartPoint[] | ChartSeriesInput[];
/** Configuracao de um grafico. */
interface ChartOptions {
    /** Tipo do grafico. Padrao `line`. */
    type?: ChartType;
    /** Dados, em qualquer um dos formatos aceitos. */
    data: ChartData;
    /** Rotulos do eixo de categorias. */
    labels?: string[];
    /** Nome da serie unica, usado na legenda e no tooltip. */
    name?: string;
    /** Paleta. Quando ausente, usa as cores da marca. */
    colors?: string[];
    /** Altura em pixels. Varia conforme o tipo quando ausente. */
    height?: number;
    /** Largura usada quando o container ainda nao tem medida. */
    width?: number;
    /** Linhas de grade e rotulos do eixo de valores. Padrao `true`. */
    showGrid?: boolean;
    /** Legenda clicavel. Padrao `true` quando faz sentido para o tipo. */
    showLegend?: boolean;
    /** Escreve o valor de cada ponto, barra ou fatia. */
    showValues?: boolean;
    /** Anima o desenho na entrada. Padrao `true`. */
    animate?: boolean;
    /** Curvas suaves em linhas e areas, com Catmull-Rom em Bezier. */
    smooth?: boolean;
    /** Teto da escala. Em `progress` define o valor equivalente a 100 por cento. */
    max?: number;
    /** Piso da escala. */
    min?: number;
    /** Formatacao dos valores. Padrao `number`. */
    format?: ChartFormat;
    /** Tooltip ao passar o mouse. Padrao `true`. */
    tooltip?: boolean;
}
/** Controle devolvido por `renderChart`. */
interface ChartInstance {
    /** Container onde o grafico foi desenhado. */
    el: HTMLElement;
    /** Opcoes em uso no momento. */
    readonly options: ChartOptions;
    /** Aplica novas opcoes e redesenha. */
    update(next: Partial<ChartOptions>): void;
    /** Remove listeners, observadores e o conteudo gerado. */
    destroy(): void;
}
/**
 * Formata um valor conforme `options.format`. O formato `percent` apenas
 * acrescenta o simbolo, porque em painel o dado ja chega na escala de 0 a 100.
 */
declare function formatChartValue(value: number, format?: ChartFormat): string;
/**
 * Desenha um grafico dentro de um elemento e devolve o controle da instancia.
 *
 * ```js
 * const grafico = V.renderChart(document.querySelector('#vendas'), {
 *   type: 'area',
 *   data: [12, 19, 8, 25, 30],
 *   labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
 *   smooth: true,
 * })
 * grafico.update({ data: novosDados })
 * ```
 *
 * @param el container que recebe o SVG. O conteudo anterior e substituido.
 * @param options tipo, dados e ajustes visuais
 */
declare function renderChart(el: HTMLElement, options: ChartOptions): ChartInstance;
/** Tudo do modulo reunido, para expor como `V.charts`. */
declare const charts: {
    render: typeof renderChart;
    format: typeof formatChartValue;
    colors: string[];
};

/**
 * @module runtime/magics
 *
 * Variaveis magicas: valores globais disponiveis dentro de qualquer expressao
 * `v-*`, sem precisar declarar nada.
 *
 * ```html
 * <button v-click="$toast.success('Salvo!')">Salvar</button>
 * <div v-show="$screen.mobile">Voce esta no celular</div>
 * <p v-show="!$network.online">Voce esta offline.</p>
 * <span>{ $store.carrinho.total }</span>
 * ```
 */
declare const screen: {
    width: number;
    height: number;
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
    portrait: boolean;
    landscape: boolean;
    /** Verifica uma media query arbitraria. */
    matches(query: string): boolean;
};
declare const network: {
    online: boolean;
    /** Tipo de conexao informado pelo navegador, quando disponivel. */
    type: string;
    /** `true` quando o usuario pediu economia de dados. */
    saveData: boolean;
    slow: boolean;
};
declare const clipboard: {
    /** Copia texto, com fallback para navegadores sem a API moderna. */
    copy(text: string): Promise<boolean>;
    /** Le o conteudo da area de transferencia, quando o usuario permitir. */
    read(): Promise<string>;
};

/**
 * @module ui/dialog
 *
 * Motor de dialogos acessiveis: modal generico, `alert`, `confirm` e `prompt`.
 *
 * Todos compartilham o mesmo nucleo: fundo escurecido, trava de rolagem, foco
 * preso dentro do painel, devolucao do foco ao fechar, fechamento por Escape ou
 * clique no fundo, animacao de entrada e saida e empilhamento de varios
 * dialogos abertos ao mesmo tempo.
 *
 * ```js
 * V.modal.open('#login')
 * await V.alert('Arquivo enviado.')
 * if (await V.confirm('Excluir o pedido?')) remover()
 * const nome = await V.prompt('Como devemos te chamar?')
 * ```
 *
 * ```html
 * <button v-modal="#login">Entrar</button>
 * <div id="login" v-modal-content>
 *   <h2>Entrar</h2>
 *   <button v-modal-close>Fechar</button>
 * </div>
 * <button v-confirm="Excluir mesmo?" v-click="excluir()">Excluir</button>
 * ```
 */
/** Textos dos botoes e mensagens padrao, todos configuraveis. */
interface DialogLabels {
    confirm: string;
    cancel: string;
    ok: string;
    close: string;
    /** Mensagem usada por `v-confirm` quando o atributo vem vazio. */
    confirmQuestion: string;
    /** Erro mostrado pelo `prompt` quando o campo obrigatorio fica vazio. */
    required: string;
}
declare const settings: {
    /** Duracao da animacao de entrada e saida, em milissegundos. */
    duration: number;
    /** Tamanho padrao dos dialogos criados por `dialog()`. */
    size: DialogSize;
};
type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DialogTone = 'default' | 'success' | 'warning' | 'danger';
type DialogIcon = 'info' | 'success' | 'warning' | 'danger' | 'question' | 'none';
/** Opcoes comuns a qualquer dialogo. */
interface ModalOptions {
    /** Fecha ao clicar no fundo escurecido. Padrao `true`. */
    closeOnBackdrop?: boolean;
    /** Fecha ao pressionar Escape. Padrao `true`. */
    closeOnEscape?: boolean;
    /** Largura maxima do painel. Padrao `md`. */
    size?: DialogSize;
    /** Alinhamento vertical. Padrao `center`. */
    position?: 'center' | 'top';
    /** Trava a rolagem da pagina enquanto estiver aberto. Padrao `true`. */
    lockScroll?: boolean;
    /** Devolve o foco ao elemento anterior ao fechar. Padrao `true`. */
    restoreFocus?: boolean;
    /** Mostra o botao de fechar no canto. Padrao `true`. */
    closable?: boolean;
    /** Remove fundo, borda e sombra do painel. */
    plain?: boolean;
    /** Classes extras aplicadas ao painel. */
    className?: string;
    /** Seletor ou elemento que recebe o foco inicial. */
    initialFocus?: string | HTMLElement | null;
    /** Rotulo lido por leitores de tela quando nao ha titulo visivel. */
    ariaLabel?: string;
    onOpen?(handle: DialogHandle): void;
    onClose?(result: unknown, handle: DialogHandle): void;
}
/** Controle de um dialogo aberto. */
interface DialogHandle {
    id: string;
    /** Camada fixa que cobre a tela. */
    root: HTMLElement;
    /** Painel onde o conteudo aparece. */
    panel: HTMLElement;
    /** Corpo do painel, util para injetar conteudo depois de aberto. */
    body: HTMLElement;
    /** Chave usada por `modal.close('#login')`. */
    key: string | null;
    /** Elemento da pagina adotado pelo dialogo, quando houver. */
    source: HTMLElement | null;
    /** Fecha o dialogo, resolvendo `closed` com o resultado. */
    close(result?: unknown): void;
    /** Resolvida quando o dialogo termina de fechar. */
    closed: Promise<unknown>;
}
/**
 * Controle dos modais montados a partir de elementos que ja existem na pagina.
 *
 * ```js
 * V.modal.open('#login', { size: 'sm' })
 * V.modal.close('#login')
 * V.modal.isOpen()
 * ```
 */
declare const modal: {
    /** Abre um elemento da pagina como modal. Aceita seletor ou o proprio elemento. */
    open(target: string | HTMLElement, options?: ModalOptions): DialogHandle | null;
    /** Fecha o modal indicado, ou o que estiver no topo da pilha. */
    close(target?: string | HTMLElement, result?: unknown): void;
    /** Fecha todos os dialogos abertos, do topo para a base. */
    closeAll(result?: unknown): void;
    /** Abre se estiver fechado, fecha se estiver aberto. */
    toggle(target: string | HTMLElement, options?: ModalOptions): DialogHandle | null;
    /** Informa se um modal especifico, ou qualquer um, esta aberto. */
    isOpen(target?: string | HTMLElement): boolean;
    /** Dialogos abertos, do mais antigo ao mais recente. */
    readonly opened: DialogHandle[];
    /** Quantidade de dialogos abertos. */
    readonly count: number;
    /** Ajusta duracao da animacao e tamanho padrao. */
    configure(options: Partial<typeof settings>): void;
    /** Troca os textos padrao dos botoes. */
    labels(next: Partial<DialogLabels>): DialogLabels;
};
/** Botao mostrado no rodape de um dialogo. */
interface DialogButton {
    label: string;
    /** Valor entregue pela promessa quando este botao e clicado. */
    value?: unknown;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    /** Fecha o dialogo ao clicar. Padrao `true`. */
    close?: boolean;
    /** Recebe o foco assim que o dialogo abre. */
    autofocus?: boolean;
    /** Executa antes de fechar. Devolver `false` mantem o dialogo aberto. */
    onClick?(handle: DialogHandle): unknown;
}
/** Opcoes de `V.dialog()`. */
interface DialogOptions extends ModalOptions {
    title?: string;
    description?: string;
    /** Texto simples do corpo, inserido sem interpretar HTML. */
    text?: string;
    /** HTML do corpo. Use apenas com conteudo proprio. */
    html?: string;
    /** No pronto para virar o corpo, util para formularios montados a mao. */
    node?: Node;
    buttons?: DialogButton[];
    icon?: DialogIcon;
    tone?: DialogTone;
}
/**
 * Dialogo generico com titulo, descricao, conteudo e botoes.
 *
 * ```js
 * const escolha = await V.dialog({
 *   title: 'Publicar agora?',
 *   description: 'A alteracao fica visivel para todo mundo.',
 *   buttons: [
 *     { label: 'Cancelar', variant: 'secondary', value: null },
 *     { label: 'Publicar', variant: 'primary', value: 'publicar', autofocus: true }
 *   ]
 * })
 * ```
 *
 * @returns o `value` do botao clicado, ou `null` quando o dialogo e dispensado
 */
declare function dialog<T = unknown>(options: DialogOptions): Promise<T | null>;
/** Opcoes de `V.alert()`. */
interface AlertOptions extends ModalOptions {
    title?: string;
    description?: string;
    icon?: DialogIcon;
    tone?: DialogTone;
    /** Texto do unico botao. Padrao `OK`. */
    confirmLabel?: string;
}
/**
 * Aviso com um unico botao.
 *
 * ```js
 * await V.alert('Pedido enviado com sucesso.', { icon: 'success' })
 * ```
 */
declare function alert(message: string, options?: AlertOptions): Promise<void>;
/** Opcoes de `V.confirm()`. */
interface ConfirmOptions extends ModalOptions {
    title?: string;
    description?: string;
    icon?: DialogIcon;
    tone?: DialogTone;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Atalho para `tone: 'danger'`, com botao vermelho. */
    danger?: boolean;
}
/**
 * Pergunta de sim ou nao.
 *
 * ```js
 * if (await V.confirm('Excluir o pedido?', { danger: true })) remover()
 * ```
 */
declare function confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
/** Tipos aceitos pelo campo do `prompt`. */
type PromptType = 'text' | 'password' | 'email' | 'number' | 'textarea';
/** Opcoes de `V.prompt()`. */
interface PromptOptions extends ModalOptions {
    title?: string;
    description?: string;
    icon?: DialogIcon;
    type?: PromptType;
    /** Valor inicial do campo. */
    value?: string;
    placeholder?: string;
    hint?: string;
    required?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Devolva uma mensagem para bloquear o envio, ou `null` para liberar. */
    validate?(value: string): string | null | undefined;
}
/**
 * Pergunta que espera um texto. O campo ja abre focado e a validacao mantem o
 * dialogo aberto enquanto o valor nao for aceito.
 *
 * ```js
 * const email = await V.prompt('E-mail para contato', {
 *   type: 'email',
 *   required: true,
 *   validate: (v) => v.includes('@') ? null : 'Informe um e-mail valido.'
 * })
 * ```
 *
 * @returns o texto digitado, ou `null` quando o usuario cancela
 */
declare function prompt(label: string, options?: PromptOptions): Promise<string | null>;

/**
 * @module ui/palette
 *
 * Paleta configuravel da Voodoo. A partir de poucas cores base a funcao gera a
 * escala completa de tons (50 a 900), a versao de tema escuro e a cor de texto
 * com melhor contraste sobre cada cor, tudo escrito como variaveis CSS no
 * `:root`.
 *
 * O calculo acontece em OKLCH, um espaco perceptualmente uniforme: degraus com
 * a mesma diferenca de luminancia parecem igualmente distantes para o olho, o
 * que nao acontece em HSL. A cor de texto usa o calculo real de luminancia
 * relativa da WCAG, entao o resultado e sempre legivel.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * V.palette({ preset: 'oceano' })
 * ```
 */
/** Cor no espaco sRGB, com canais de 0 a 255. */
interface RgbColor {
    r: number;
    g: number;
    b: number;
}
/** Cor em OKLCH: luminancia perceptual (0 a 1), croma e matiz em graus. */
interface OklchColor {
    l: number;
    c: number;
    h: number;
}
/**
 * Le uma cor escrita como `#abc`, `#aabbcc`, `rgb(...)` ou `hsl(...)`.
 * Devolve `null` quando o texto nao descreve uma cor conhecida.
 */
declare function parseColor(input: string): RgbColor | null;
/** Converte sRGB em OKLCH. */
declare function rgbToOklch(color: RgbColor): OklchColor;
/**
 * Converte OKLCH em sRGB. Cores fora do gamut do monitor perdem croma aos
 * poucos ate caberem, o que preserva matiz e luminancia em vez de recortar os
 * canais e mudar a cor percebida.
 */
declare function oklchToRgb(color: OklchColor): RgbColor;
/** Escreve uma cor sRGB como `#rrggbb`. */
declare function toHex(color: RgbColor): string;
/** Escreve uma cor sRGB como `rgba(r, g, b, alpha)`. */
declare function toRgba(color: RgbColor, alpha: number): string;
/** Razao de contraste da WCAG entre duas cores, de 1 a 21. */
declare function contrastRatio(a: RgbColor | string, b: RgbColor | string): number;
/**
 * Escolhe preto ou branco para o texto sobre a cor informada, comparando a
 * razao de contraste real das duas opcoes.
 */
declare function contrastText(color: RgbColor | string): string;
/** Escala de tons de uma cor, com os degraus de 50 a 900. */
type ColorScale = Record<string, string>;
/**
 * Gera a escala de uma cor base.
 *
 * @param color cor base em qualquer formato aceito por `parseColor`
 * @param dark quando `true`, gera a escala do tema escuro (papeis invertidos)
 */
declare function colorScale(color: string | RgbColor, dark?: boolean): ColorScale;
/** Conjunto de cores base de um preset. */
interface PaletteColors {
    primary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    /** Cor que tinge fundos, textos e bordas. Padrao: matiz da primaria. */
    neutral?: string;
}
/** Nomes dos presets prontos. */
type PresetName = 'violeta' | 'oceano' | 'floresta' | 'poente' | 'grafite';
/** Opcoes aceitas por `V.palette()`. */
interface PaletteOptions extends Partial<PaletteColors> {
    /** Preset usado como ponto de partida. As cores informadas sobrescrevem. */
    preset?: PresetName;
    /** Raio das bordas, como `12px` ou `0.75rem`. */
    radius?: string;
    /** Familia principal. A pagina continua responsavel por carregar a fonte. */
    font?: string;
    /** Familia monoespacada usada por `VCodeBlock`. */
    monoFont?: string;
    /** Salva a escolha em localStorage. Padrao `true`. */
    persist?: boolean;
}
/** Paleta ja resolvida, com todas as escalas calculadas. */
interface ResolvedPalette {
    colors: PaletteColors;
    radius: string;
    font: string;
    monoFont: string;
    /** Escalas do tema claro, por nome de cor. */
    light: Record<string, ColorScale>;
    /** Escalas do tema escuro, por nome de cor. */
    dark: Record<string, ColorScale>;
    /** Cor de texto sobre cada cor base, calculada pela WCAG. */
    contrast: Record<string, string>;
    css: string;
}
/**
 * Aplica uma paleta. Gera as escalas, escreve as variaveis CSS no `:root`,
 * cria as versoes de tema escuro e salva a escolha em localStorage.
 *
 * ```js
 * V.palette({ primary: '#6D3BF5', accent: '#FF3D8B', radius: '12px', font: 'Inter' })
 * ```
 *
 * @returns a paleta resolvida, com as escalas e o CSS gerado
 */
declare function applyPalette(options?: PaletteOptions): ResolvedPalette;
/**
 * Aplica a paleta salva em localStorage, ou o preset padrao quando nao existe
 * escolha anterior. Chamada automaticamente pelos componentes de UI.
 */
declare function initPalette(): ResolvedPalette;
/** Garante que as variaveis da paleta existam antes de qualquer componente. */
declare function ensurePalette(): void;
/**
 * Paleta da Voodoo. Chame como funcao para aplicar, ou use os utilitarios
 * anexados para inspecionar cores e contraste.
 *
 * ```js
 * V.palette({ preset: 'oceano' })
 * V.palette.scale('#6D3BF5')['700']
 * V.palette.contrastText('#FFB35C')  // '#000000'
 * ```
 */
declare const palette: typeof applyPalette & {
    /** Presets prontos, indexados pelo nome. */
    presets: Record<PresetName, PaletteColors>;
    /** Nomes dos presets disponiveis. */
    readonly names: PresetName[];
    /** Paleta em uso, ou `null` antes da primeira aplicacao. */
    readonly current: ResolvedPalette | null;
    /** Opcoes usadas na ultima aplicacao. */
    readonly options: PaletteOptions | null;
    /** Aplica a paleta salva, ou o padrao quando nao ha nada salvo. */
    init: typeof initPalette;
    /** Garante que as variaveis existam, sem sobrescrever o que ja foi aplicado. */
    ensure: typeof ensurePalette;
    /** Volta ao preset padrao e apaga a escolha salva. */
    reset(): ResolvedPalette;
    /** Troca apenas o preset, mantendo raio e fonte atuais. */
    use(name: PresetName): ResolvedPalette;
    /** Escala de tons de uma cor qualquer. */
    scale: typeof colorScale;
    /** Preto ou branco, conforme o melhor contraste WCAG sobre a cor. */
    contrastText: typeof contrastText;
    /** Razao de contraste WCAG entre duas cores. */
    contrastRatio: typeof contrastRatio;
    /** Luminancia relativa WCAG de uma cor. */
    luminance(color: string | RgbColor): number;
    /** Conversores expostos para quem quiser gerar cores derivadas. */
    convert: {
        parseColor: typeof parseColor;
        rgbToOklch: typeof rgbToOklch;
        oklchToRgb: typeof oklchToRgb;
        toHex: typeof toHex;
        toRgba: typeof toRgba;
    };
};

/**
 * @module router
 *
 * Roteador de aplicacao de pagina unica, sem nenhuma dependencia externa.
 *
 * Dois modos: `history`, que usa a History API e URLs limpas, e `hash`, que
 * guarda a rota depois do `#` e funciona ate abrindo o arquivo direto do disco.
 *
 * ```js
 * V.router({
 *   mode: 'history',
 *   base: '/',
 *   routes: {
 *     '/': { component: 'home', title: 'Inicio' },
 *     '/usuarios': { component: 'users' },
 *     '/usuarios/:id': { component: 'user-detail' },
 *     '/posts/:slug?': { view: '/partials/post.html' },
 *     '*': { component: 'not-found' }
 *   },
 *   beforeEach(to, from) { return true },
 *   afterEach(to, from) {}
 * })
 * ```
 *
 * ```html
 * <nav>
 *   <a v-link href="/">Inicio</a>
 *   <a v-link href="/usuarios">Usuarios</a>
 * </nav>
 * <main v-router-view>Carregando...</main>
 * ```
 */
/** Definicao de uma rota, associada a um padrao como `/usuarios/:id`. */
interface RouteRecord {
    /** Nome do componente registrado que sera montado dentro de `v-router-view`. */
    component?: string;
    /** URL de um HTML remoto carregado e inserido no lugar do componente. */
    view?: string;
    /** Titulo aplicado em `document.title` ao entrar na rota. */
    title?: string;
    /** Nome da rota, util para `$route.name` e para navegacao por nome. */
    name?: string;
    /** Dados livres da rota, disponiveis em `$route.meta`. */
    meta?: Record<string, unknown>;
    /** Redireciona para outro caminho assim que a rota casa. */
    redirect?: string;
    /** Guard exclusivo desta rota, executado antes do `beforeEach` global. */
    beforeEnter?: NavigationGuard;
}
/** Estado da rota atual. E o objeto exposto por `$route`. */
interface RouteLocation {
    /** Caminho sem query e sem hash, sempre comecando com barra. */
    path: string;
    /** Caminho completo, com query e hash. */
    fullPath: string;
    /** Parametros extraidos do padrao, como `{ id: '42' }`. */
    params: Record<string, string>;
    /** Query string ja convertida em objeto. */
    query: Record<string, string>;
    /** Ancora da URL, sem o `#`. */
    hash: string;
    /** Nome declarado na rota casada. */
    name: string;
    /** Metadados declarados na rota casada. */
    meta: Record<string, unknown>;
    /** Padrao que casou, como `/usuarios/:id`. `null` quando nada casou. */
    matched: string | null;
}
/**
 * Guard de navegacao. Devolva `false` para cancelar, uma string para
 * redirecionar, ou `true`, `undefined` ou nada para deixar seguir.
 */
type NavigationGuard = (to: RouteLocation, from: RouteLocation) => boolean | string | void | Promise<boolean | string | void>;
/** Hook executado depois que a navegacao foi concluida. */
type NavigationHook = (to: RouteLocation, from: RouteLocation) => void;
/**
 * Controle de rolagem. Devolva a posicao vertical desejada, ou `false` para
 * assumir a rolagem manualmente.
 */
type ScrollBehavior = (to: RouteLocation, from: RouteLocation, saved: number | null) => number | false | void;
interface RouterOptions {
    /** `history` usa URLs limpas, `hash` guarda a rota depois do `#`. */
    mode?: 'history' | 'hash';
    /** Prefixo comum de todas as rotas no modo `history`. Padrao `/`. */
    base?: string;
    /** Mapa de padrao para definicao de rota. */
    routes: Record<string, RouteRecord>;
    /** Guard global executado antes de cada navegacao. */
    beforeEach?: NavigationGuard;
    /** Hook global executado depois de cada navegacao. */
    afterEach?: NavigationHook;
    /** Classe aplicada por `v-link` quando a rota comeca com o destino. */
    linkActiveClass?: string;
    /** Classe aplicada por `v-link` quando a rota e exatamente o destino. */
    linkExactActiveClass?: string;
    /** Usa a View Transitions API na troca de pagina. Padrao `true`. */
    transition?: boolean;
    /** Modelo do titulo, com `%s` no lugar do titulo da rota. */
    titleTemplate?: string;
    /** Controle fino da rolagem apos cada navegacao. */
    scrollBehavior?: ScrollBehavior;
}
interface NavigateOptions {
    /** Substitui a entrada atual do historico em vez de empilhar uma nova. */
    replace?: boolean;
    /** Estado extra guardado na entrada do historico. */
    state?: Record<string, unknown>;
    /** Desliga a rolagem automatica desta navegacao. */
    scroll?: boolean;
    /** Navega mesmo quando o destino e igual a rota atual. */
    force?: boolean;
}
/**
 * Rota atual, reativa. Qualquer expressao que leia `$route` se atualiza sozinha
 * quando a navegacao acontece.
 */
declare const route: RouteLocation;
/**
 * Navega para um caminho sem recarregar a pagina.
 *
 * ```js
 * await V.navigate('/usuarios/42')
 * await V.navigate('/login', { replace: true })
 * ```
 *
 * @returns `true` quando a navegacao aconteceu, `false` quando um guard cancelou.
 */
declare function navigate(target: string, options?: NavigateOptions): Promise<boolean>;
interface RouterApi {
    (options: RouterOptions): RouterApi;
    /** Rota atual, reativa. */
    readonly current: RouteLocation;
    /** Empilha uma nova entrada no historico. */
    push(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Substitui a entrada atual do historico. */
    replace(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Alias de `push`, mesma funcao exposta em `V.navigate`. */
    navigate(target: string, options?: NavigateOptions): Promise<boolean>;
    /** Volta uma entrada no historico. */
    back(): void;
    /** Avanca uma entrada no historico. */
    forward(): void;
    /** Anda `delta` entradas no historico. */
    go(delta: number): void;
    /** Resolve um destino sem navegar. */
    resolve(target: string): RouteLocation;
    addRoute(pattern: string, record: RouteRecord): void;
    removeRoute(pattern: string): void;
    /** Padroes registrados, do mais especifico para o menos especifico. */
    patterns(): string[];
    /** Desliga os ouvintes de historico. */
    stop(): void;
    clearViewCache(url?: string): void;
    /** `true` depois que `V.router({...})` foi chamado. */
    readonly ready: boolean;
}
/**
 * Roteador da Voodoo. Chamado como funcao configura as rotas, e traz os
 * comandos de navegacao como metodos.
 *
 * ```js
 * V.router({ routes: { '/': { component: 'home' } } })
 * V.router.push('/sobre')
 * V.router.back()
 * ```
 */
declare const router: RouterApi;

/**
 * @module i18n
 *
 * Internacionalizacao reativa. Trocar o idioma nao recarrega a pagina: todo
 * texto que passou por `t()` e todo formatador de numero, moeda ou data se
 * atualiza sozinho, porque tudo le o mesmo estado reativo.
 *
 * ```js
 * V.i18n({
 *   locale: 'pt-BR',
 *   fallback: 'en',
 *   messages: {
 *     'pt-BR': { comum: { salvar: 'Salvar' }, itens: 'nenhum item | {n} item | {n} itens' },
 *     'en': { comum: { salvar: 'Save' } }
 *   }
 * })
 * ```
 *
 * ```html
 * <button v-t="comum.salvar"></button>
 * <span v-t="itens" v-t-params="{ n: carrinho.length }"></span>
 * <abbr v-t:title="comum.dica">?</abbr>
 * <button v-locale="en">English</button>
 * <span>{ $t('comum.salvar') } em { $locale }</span>
 * ```
 */
/** Arvore de mensagens de um idioma. Aceita aninhamento em qualquer nivel. */
interface MessageTree {
    [key: string]: string | MessageTree;
}
/** Valores usados na interpolacao de `{chave}`. */
type TranslateParams = Record<string, unknown> | number;
interface I18nOptions {
    /** Idioma inicial. Perde para o idioma salvo e para o detectado. */
    locale?: string;
    /** Idioma usado quando a chave nao existe no idioma atual. */
    fallback?: string;
    /** Mensagens por idioma. */
    messages?: Record<string, MessageTree>;
    /** Moeda padrao de `c()`. Cai em `config.currency`. */
    currency?: string;
    /** Guarda o idioma escolhido no localStorage. Padrao `true`. */
    persist?: boolean | string;
    /** Detecta o idioma do navegador quando nada foi salvo. Padrao `true`. */
    detect?: boolean;
    /** Modelo de URL para carregamento sob demanda, com `{locale}`. */
    loadPath?: string;
}
/**
 * Traduz uma chave no idioma atual.
 *
 * A busca tenta o idioma atual, depois idiomas parecidos, depois o fallback e,
 * se nada existir, devolve a propria chave, que sempre e melhor do que texto
 * vazio na tela.
 *
 * ```js
 * t('comum.salvar')              // 'Salvar'
 * t('ola', { nome: 'Ana' })      // 'Ola, Ana!'
 * t('itens', { n: 3 })           // '3 itens'
 * t('itens', 3)                  // atalho do mesmo caso
 * ```
 */
declare function t(key: string, params?: TranslateParams): string;
/** `true` quando a chave existe no idioma atual ou no fallback. */
declare function te(key: string, locale?: string): boolean;
/** Formata um numero no idioma atual. */
declare function n(value: number | string, options?: Intl.NumberFormatOptions): string;
/** Formata um valor como moeda no idioma atual. */
declare function c(value: number | string, currency?: string): string;
/** Formata uma data no idioma atual. Aceita preset ou mascara textual. */
declare function d(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions): string;
/** Tempo relativo no idioma atual, como `ha 5 minutos`. */
declare function rt(value: Date | string | number): string;
/** Idioma ativo. */
declare function getLocale(): string;
/** Mensagens de um idioma, ou do idioma atual quando nenhum for informado. */
declare function messagesOf(locale?: string): MessageTree;
/**
 * Adiciona mensagens a um idioma, mesclando com o que ja existe.
 * Retorna o proprio idioma, para encadear.
 */
declare function addMessages(locale: string, messages: MessageTree): string;
/**
 * Carrega mensagens sob demanda.
 *
 * ```js
 * await V.i18n.loadMessages('es', '/i18n/es.json')
 * await V.i18n.loadMessages('es', { comum: { salvar: 'Guardar' } })
 * ```
 */
declare function loadMessages(locale: string, source: string | MessageTree): Promise<void>;
/**
 * Troca o idioma ativo. A pagina inteira se atualiza na hora, sem recarregar.
 *
 * Quando `loadPath` foi configurado e o idioma ainda nao tem mensagens, o
 * arquivo e buscado em segundo plano e a promessa resolve quando ele chega.
 */
declare function setLocale(locale: string): Promise<void>;
/**
 * Escolhe o melhor idioma do navegador entre os que existem.
 * Devolve `null` quando nenhum idioma do navegador tem mensagens.
 */
declare function detectLocale(): string | null;
interface I18nApi {
    (options?: I18nOptions): I18nApi;
    /** Idioma ativo, reativo quando lido dentro de um efeito. */
    readonly locale: string;
    /** Idioma usado quando a chave nao existe no idioma atual. */
    readonly fallback: string;
    /** Idiomas com mensagens carregadas. */
    readonly locales: string[];
    t: typeof t;
    te: typeof te;
    n: typeof n;
    c: typeof c;
    d: typeof d;
    rt: typeof rt;
    setLocale: typeof setLocale;
    getLocale: typeof getLocale;
    addMessages: typeof addMessages;
    loadMessages: typeof loadMessages;
    messagesOf: typeof messagesOf;
    detectLocale: typeof detectLocale;
}
/**
 * O objeto i18n e uma funcao chamavel que tambem carrega a API. Os acessos
 * dinamicos sao copiados com getOwnPropertyDescriptors, o que mantem cada
 * getter vivo. Com Object.assign eles seriam executados uma unica vez e o
 * idioma ficaria congelado no valor inicial.
 */
declare const i18n: I18nApi;

/**
 * @module forms/validate
 *
 * Motor de validacao com registro extensivel de regras, mensagens em portugues
 * e apresentacao automatica dos erros no proprio HTML.
 *
 * ```html
 * <form v-submit="/api/users" v-validate>
 *   <input name="email" v-required v-email>
 *   <input name="cpf" v-cpf v-error-message="Informe um CPF real.">
 * </form>
 * ```
 */
/** Elementos que a validacao entende como campo de formulario. */
type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
/** Resultado de uma regra: `true` aprova, `false` reprova, texto reprova com mensagem. */
type ValidatorResult = boolean | string;
/** Funcao de uma regra. Recebe o valor em texto, o parametro e o proprio campo. */
type ValidatorFn = (value: string, param: string | undefined, el: FormField) => ValidatorResult | Promise<ValidatorResult>;
interface FieldValidationResult {
    valid: boolean;
    message?: string;
    rule?: string;
}
interface FormValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}
interface SerializeOptions {
    /** Forca a saida em `FormData`, mesmo sem arquivos. */
    formData?: boolean;
    /** Inclui campos desabilitados. Padrao `false`. */
    includeDisabled?: boolean;
    /** Remove espacos nas pontas dos textos. Padrao `true`. */
    trim?: boolean;
    /** Converte campos numericos para `number`. Padrao `true`. */
    numbers?: boolean;
}
/**
 * Registra uma regra de validacao e cria a directive `v-validate-<nome>`.
 *
 * ```js
 * V.validator('par', (value) => Number(value) % 2 === 0, 'Informe um numero par.')
 * ```
 */
declare function validator(name: string, fn: ValidatorFn, defaultMessage?: string): void;
/** Limpa todos os erros visiveis de um formulario. */
declare function clearErrors(form: HTMLElement): void;
/**
 * Aplica no HTML os erros vindos do servidor. Mensagens sem campo
 * correspondente aparecem em um resumo no topo do formulario.
 */
declare function showFormErrors(form: HTMLElement, errors: unknown): Record<string, string>;
/**
 * Atalho geral: valida um formulario inteiro ou um campo isolado, decidindo
 * pelo tipo do elemento recebido.
 *
 * ```js
 * await V.validate(document.forms[0])          // { valid, errors }
 * await V.validate(document.querySelector('#email'))  // { valid, message }
 * ```
 */
declare function validate(target: HTMLElement | FormField): Promise<FormValidationResult | FieldValidationResult>;
/**
 * Transforma o formulario em objeto JavaScript, respeitando nomes como
 * `user[endereco][rua]` e `tags[]`. Devolve `FormData` quando houver arquivo
 * selecionado ou quando `options.formData` for verdadeiro.
 */
declare function serializeForm(form: HTMLElement, options?: SerializeOptions): Record<string, unknown> | FormData;

/**
 * @module forms/mask
 *
 * Mascaras de digitacao que preservam a posicao do cursor, inclusive quando o
 * usuario edita o meio do texto ou apaga um separador.
 *
 * ```html
 * <input v-mask="cpf">
 * <input v-mask="(99) 99999-9999">
 * <input v-mask.unmask="cpf" v-model="form.cpf">
 * <input v-mask-currency="R$ " v-mask-decimals="2">
 * ```
 */
/** Funcao que formata um valor cru. Usada por mascaras dinamicas. */
type MaskResolver = (value: string) => string;
/** Uma mascara e um padrao de caracteres ou uma funcao de formatacao. */
type MaskPattern = string | MaskResolver;
/** Mascaras nomeadas disponiveis para `v-mask` e `applyMask`. */
declare const masks: Map<string, MaskPattern>;
/**
 * Registra uma mascara nomeada.
 *
 * ```js
 * V.registerMask('processo', '9999999-99.9999.9.99.9999')
 * V.registerMask('reverso', (v) => v.split('').reverse().join(''))
 * ```
 */
declare function registerMask(name: string, patternOrFn: MaskPattern): void;
interface CurrencyMaskOptions {
    /** Texto antes do numero. Padrao `R$ `. */
    prefix?: string;
    /** Texto depois do numero. */
    suffix?: string;
    /** Casas decimais. Padrao `2`. */
    decimals?: number;
    /** Separador decimal. Padrao `,`. */
    decimal?: string;
    /** Separador de milhar. Padrao `.`. */
    thousands?: string;
}
/**
 * Formata um valor como moeda, digitando da direita para a esquerda.
 *
 * ```js
 * V.maskCurrency('123456')  // 'R$ 1.234,56'
 * ```
 */
declare function maskCurrency(value: string, options?: CurrencyMaskOptions): string;
/** Formata porcentagem com duas casas, no mesmo estilo da moeda. */
declare function maskPercent(value: string, decimals?: number): string;
/**
 * Aplica uma mascara a um valor. O padrao pode ser o nome de uma mascara
 * registrada ou um padrao de caracteres.
 *
 * Tokens: `9` digito, `A` letra, `S` alfanumerico, `*` qualquer, `\` escape.
 *
 * ```js
 * V.applyMask('12345678901', 'cpf')      // '123.456.789-01'
 * V.applyMask('1234', '99-99')           // '12-34'
 * ```
 */
declare function applyMask(value: string, pattern: string): string;
/**
 * Remove a formatacao. Para mascaras numericas devolve o numero em texto,
 * pronto para virar `Number`.
 *
 * ```js
 * V.unmask('123.456.789-01')             // '12345678901'
 * V.unmask('R$ 1.234,56', 'currency')    // '1234.56'
 * ```
 */
declare function unmask(value: string, pattern?: string): string;
/**
 * Atalho publico das mascaras. Pode ser chamado como funcao e tambem carrega os
 * utilitarios do modulo.
 *
 * ```js
 * V.mask('12345678901', 'cpf')      // '123.456.789-01'
 * V.mask.register('placa', 'AAA9A99')
 * V.mask.currency('123456')         // 'R$ 1.234,56'
 * ```
 */
declare const mask: ((value: string, pattern: string) => string) & {
    apply: typeof applyMask;
    unmask: typeof unmask;
    register: typeof registerMask;
    currency: typeof maskCurrency;
    percent: typeof maskPercent;
    presets: Map<string, MaskPattern>;
};

/**
 * @module devtools/bus
 *
 * Barramento de eventos das devtools. Vive em um arquivo separado do inspetor
 * para continuar sendo tree shakeable: quem apenas reporta atividade paga
 * poucos bytes, e o painel visual so entra no pacote quando `xray()` e
 * realmente importado.
 *
 * Emitir sem nenhum ouvinte registrado custa uma busca em `Map` e nada mais,
 * entao qualquer modulo pode reportar atividade sem medo.
 *
 * ```ts
 * import { devtoolsBus } from '../devtools/bus';
 *
 * // Reportando uma requisicao de rede a partir de uma directive:
 * const inicio = performance.now();
 * const dados = await http.get('/api/usuarios');
 * devtoolsBus.emit('network', {
 *   method: 'GET',
 *   url: '/api/usuarios',
 *   status: 200,
 *   ok: true,
 *   duration: performance.now() - inicio,
 *   source: 'v-get',
 * });
 * ```
 */
/** Requisicao reportada para a aba Rede do inspetor. */
interface DevtoolsNetworkEvent {
    /** Metodo HTTP em maiusculas, como `GET` ou `POST`. */
    method: string;
    /** URL final da requisicao. */
    url: string;
    /** Codigo de status, quando a resposta chegou. */
    status?: number;
    /** `true` quando a resposta foi bem sucedida. */
    ok?: boolean;
    /** Duracao em milissegundos. */
    duration?: number;
    /** Mensagem de erro, quando a requisicao falhou. */
    error?: string;
    /** Quem disparou, como `v-get`, `http` ou `router`. */
    source?: string;
}
/** Evento de DOM disparado por uma directive, mostrado na aba Eventos. */
interface DevtoolsDomEvent {
    /** Nome do evento, como `click` ou `submit`. */
    type: string;
    /** Elemento que recebeu o evento. */
    el?: Element | null;
    /** Expressao ou detalhe associado, apenas para exibicao. */
    detail?: unknown;
    /** Quem reportou, como `v-on` ou `component.emit`. */
    source?: string;
}
/** Troca de rota reportada pelo roteador. */
interface DevtoolsNavigationEvent {
    from: string;
    to: string;
    /** `true` quando um guard cancelou a navegacao. */
    cancelled?: boolean;
    /** Padrao de rota casado, quando houver. */
    matched?: string | null;
}
/** Troca de idioma reportada pelo modulo de i18n. */
interface DevtoolsLocaleEvent {
    from: string;
    to: string;
}
/** Atualizacao reativa reportada manualmente por um modulo. */
interface DevtoolsUpdateEvent {
    el?: Element | null;
    /** Nome da chave que mudou, quando conhecido. */
    key?: string;
    source?: string;
}
/** Mapa de tipos de evento aceitos pelo barramento. */
interface DevtoolsEventMap {
    network: DevtoolsNetworkEvent;
    event: DevtoolsDomEvent;
    navigation: DevtoolsNavigationEvent;
    locale: DevtoolsLocaleEvent;
    update: DevtoolsUpdateEvent;
}
type DevtoolsEventType = keyof DevtoolsEventMap;
/**
 * Barramento simples de publicacao e assinatura usado pelas devtools.
 *
 * Para reportar uma requisicao de rede a partir de outro modulo, emita o tipo
 * `network` com `{ method, url, status, ok, duration, source }`. A aba Rede do
 * inspetor lista tudo que chegar por ai, mesmo quando a requisicao nao passou
 * pelo cliente `http` da Voodoo.
 */
declare const devtoolsBus: {
    /** Publica um evento. Sem ouvintes, a chamada e praticamente gratuita. */
    emit<K extends DevtoolsEventType>(type: K, data: DevtoolsEventMap[K]): void;
    /** Assina um tipo de evento. Devolve a funcao que cancela a assinatura. */
    on<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): () => void;
    /** Cancela uma assinatura especifica. */
    off<K extends DevtoolsEventType>(type: K, callback: (data: DevtoolsEventMap[K]) => void): void;
    /** Remove todos os ouvintes, de um tipo ou de todos. */
    clear(type?: DevtoolsEventType): void;
    /** Quantidade de ouvintes registrados em um tipo. */
    count(type: DevtoolsEventType): number;
};

/**
 * @module devtools/xray
 *
 * Inspetor visual de reatividade da Voodoo. Roda dentro da propria pagina, sem
 * extensao de navegador e sem servidor.
 *
 * Ligado, ele contorna todo elemento que tem directives, mostra um cartao com o
 * escopo daquele elemento, abre um painel com abas de estado, componentes,
 * stores, eventos, rede e desempenho, e faz o elemento piscar toda vez que um
 * efeito reativo escreve nele. Esse e o efeito raio-x: da para ver a
 * reatividade acontecendo.
 *
 * ```js
 * V.xray()            // liga e desliga
 * V.xray(true)        // forca ligar
 * ```
 *
 * O modulo nao registra nada ao ser importado. Nenhum listener, nenhum estilo e
 * nenhum timer existe antes da primeira chamada, entao ele e tree shakeable e
 * nao custa nada em producao.
 */

/**
 * Liga e desliga o inspetor visual de reatividade.
 *
 * ```js
 * V.xray()        // alterna
 * V.xray(true)    // liga
 * V.xray(false)   // desliga
 * ```
 *
 * A primeira chamada tambem instala o atalho `Ctrl+Shift+X`.
 *
 * @param force ligue ou desligue explicitamente. Sem argumento, alterna.
 * @returns o estado depois da chamada.
 */
declare function xray(force?: boolean): boolean;

/**
 * Voodoo.js
 * JavaScript feels like magic.
 *
 * Ponto de entrada para bundlers. Importar este modulo nao mexe no DOM: quem
 * inicializa a pagina e `browser.ts`, usado no build de CDN, ou uma chamada
 * explicita a `V.start()`.
 *
 * ```ts
 * import V from 'voodoojs'
 * V.start()
 * ```
 *
 * ```ts
 * import { reactive, http, toast } from 'voodoojs'
 * ```
 */

/**
 * `V` e ao mesmo tempo uma funcao e um objeto.
 *
 * ```js
 * V('#lista .item').addClass('ativo')   // colecao encadeavel
 * V.toast.success('Pronto')             // servicos
 * ```
 */
interface Voodoo extends Omit<typeof core, never> {
    (input?: unknown, context?: unknown): VoodooCollection;
}
declare const V: Voodoo;

export { V, type Voodoo, VoodooCollection, alert, animate, applyMask, charts, clearErrors, clipboard, confirm, V as default, devtoolsBus, dialog, easings, getLocale, hotkey, i18n, inView, mask, masks, modal, motionPresets, navigate, network, palette, prompt, registerMask, renderChart, route, router, screen, scrollProgress, serializeForm, setLocale, showFormErrors, spring, stagger, t, unmask, validate, validator, xray };
