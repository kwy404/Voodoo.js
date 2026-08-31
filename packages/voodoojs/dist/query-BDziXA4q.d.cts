import { HttpMethod, HttpDefaults, request, RequestInterceptor, ResponseInterceptor, ErrorInterceptor, clearCache, flushOfflineQueue, HttpError } from './http.cjs';
import { reactive, ref, shallowRef, computed, effect, watch, watchEffect, nextTick, toRaw, markRaw, unref, stop, effectScope, EffectScope, flushSync } from './reactivity.cjs';
import { parseDuration, DebouncedFunction, FormatOptions } from './utils.cjs';

/**
 * @module parser/lexer
 *
 * Tokenizador do subconjunto de JavaScript aceito dentro de atributos `v-*`.
 *
 * A Voodoo nao usa `eval` nem `new Function`. Todo o texto de uma expressao
 * passa por este lexer, depois pelo parser e por fim por um interpretador de
 * arvore. Isso mantem a biblioteca compativel com Content Security Policy
 * restritiva, sem `unsafe-eval`.
 */
type TokenType = 'num' | 'str' | 'tpl' | 'ident' | 'punct' | 'eof';
interface TemplatePart {
    /** Trechos literais entre as interpolacoes. Sempre tem 1 item a mais que `exprs`. */
    quasis: string[];
    /** Codigo fonte de cada `${...}`. */
    exprs: string[];
}
interface Token {
    type: TokenType;
    value: string;
    /** Valor ja convertido para numero ou string, quando aplicavel. */
    parsed?: number | string;
    tpl?: TemplatePart;
    start: number;
    end: number;
}
/** Erro de sintaxe com posicao dentro da expressao original. */
declare class VoodooSyntaxError extends Error {
    readonly source: string;
    readonly position: number;
    constructor(message: string, source: string, position: number);
}
/**
 * Converte uma expressao em uma lista de tokens.
 *
 * @throws {VoodooSyntaxError} quando encontra um caractere invalido.
 */
declare function tokenize(source: string): Token[];

/**
 * @module parser/parser
 *
 * Parser Pratt (precedencia de operadores) que transforma tokens em AST.
 *
 * Suporta o subconjunto de JavaScript que faz sentido dentro de um atributo:
 * literais, identificadores, acesso a membros, chamadas, operadores unarios e
 * binarios, ternario, atribuicao, incremento, objetos, arrays, arrow functions,
 * template literals, spread, encadeamento opcional e sequencias com `;`.
 *
 * Nao suporta, por decisao de projeto: `function`, `class`, `new`, `delete`,
 * `import`, `await`, laco `for`, `while`, `try` e desestruturacao complexa.
 * Expressoes de atributo devem ser curtas. Logica maior vive em metodos.
 */

type Node$1 = {
    t: 'lit';
    v: string | number | boolean | null | undefined;
} | {
    t: 'tpl';
    quasis: string[];
    exprs: Node$1[];
} | {
    t: 'id';
    n: string;
} | {
    t: 'member';
    o: Node$1;
    p: Node$1;
    computed: boolean;
    opt: boolean;
} | {
    t: 'call';
    callee: Node$1;
    args: Node$1[];
    opt: boolean;
} | {
    t: 'unary';
    op: string;
    a: Node$1;
} | {
    t: 'update';
    op: string;
    a: Node$1;
    prefix: boolean;
} | {
    t: 'bin';
    op: string;
    l: Node$1;
    r: Node$1;
} | {
    t: 'logic';
    op: string;
    l: Node$1;
    r: Node$1;
} | {
    t: 'cond';
    test: Node$1;
    cons: Node$1;
    alt: Node$1;
} | {
    t: 'assign';
    op: string;
    target: Node$1;
    value: Node$1;
} | {
    t: 'arrow';
    params: string[];
    body: Node$1;
} | {
    t: 'obj';
    props: ObjectProperty[];
} | {
    t: 'arr';
    els: Array<Node$1 | {
        spread: Node$1;
    }>;
} | {
    t: 'seq';
    body: Node$1[];
};
interface ObjectProperty {
    /** Nome fixo da chave, ou `null` quando a chave e computada. */
    key: string | null;
    keyExpr?: Node$1;
    value?: Node$1;
    spread?: Node$1;
}
/**
 * Converte texto em AST, com cache.
 *
 * ```js
 * parse('count + 1')
 * // { t: 'bin', op: '+', l: { t: 'id', n: 'count' }, r: { t: 'lit', v: 1 } }
 * ```
 */
declare function parse(source: string): Node$1;
/** Limpa o cache de expressoes. Usado em testes e no hot reload. */
declare function clearParseCache(): void;

/**
 * @module parser/interpreter
 *
 * Interpretador da AST. Recebe um no e um escopo e devolve o valor.
 *
 * Seguranca: nao existe acesso implicito a `window`, `globalThis`, `document`,
 * `fetch` ou `eval`. Identificadores que nao estao no escopo sao procurados em
 * uma lista fechada de globais permitidos, configuravel pela aplicacao.
 */

/** Contrato minimo que um escopo precisa cumprir para ser avaliado. */
interface EvalScope {
    /** Retorna o objeto que contem a chave, subindo a cadeia de escopos. */
    lookup(name: string): Record<string, any> | undefined;
    /** Le um valor da cadeia de escopos. */
    get(name: string): unknown;
    /** Escreve na cadeia de escopos, no dono da chave quando ele existir. */
    set(name: string, value: unknown): void;
    /** Cria um escopo filho com variaveis locais, usado por arrow functions e `v-for`. */
    child(vars: Record<string, unknown>): EvalScope;
}
declare const allowedGlobals: Record<string, unknown>;
/** Erro em tempo de execucao de uma expressao, com o texto original anexado. */
declare class VoodooRuntimeError extends Error {
    readonly expression?: string | undefined;
    constructor(message: string, expression?: string | undefined);
}
/**
 * Avalia um no da AST.
 *
 * @param node no gerado por `parse()`
 * @param scope escopo de leitura e escrita
 */
declare function evaluate(node: Node$1, scope: EvalScope): any;
/** Converte qualquer valor no texto que sera escrito no DOM. */
declare function stringify(value: unknown): string;

/**
 * @module runtime/scope
 *
 * Cadeia de escopos. Cada `v-data`, cada componente e cada iteracao de `v-for`
 * cria um escopo filho. A busca de um identificador sobe a cadeia ate a raiz e,
 * se nada for encontrado, cai nas variaveis magicas (`$store`, `$el`, ...).
 */

type MagicGetter = (scope: Scope) => unknown;
/** Registro global de variaveis magicas, preenchido pelos modulos. */
declare const magics: Map<string, MagicGetter>;
/** Registra uma variavel magica disponivel em qualquer expressao. */
declare function magic(name: string, getter: MagicGetter): void;
declare class Scope implements EvalScope {
    /** Dados proprios deste escopo, normalmente um proxy reativo. */
    data: Record<string, any>;
    parent: Scope | null;
    /** Elemento que criou o escopo. Usado por `$el` e `$refs`. */
    el: Element | null;
    /** Referencias declaradas com `v-ref` dentro deste escopo. */
    refs: Record<string, Element>;
    /** Instancia de componente, quando este escopo pertence a um. */
    component: any;
    /** Valores entregues por `provide`, visiveis para os escopos de baixo. */
    provides: Record<string, unknown> | null;
    private magicCache;
    constructor(data?: Record<string, any>, parent?: Scope | null, el?: Element | null);
    /** Escopo raiz da cadeia. */
    get root(): Scope;
    /** Procura um valor de `provide` subindo a cadeia de escopos. */
    inject<T = unknown>(key: string, fallback?: T): T | undefined;
    /** Escopo de componente mais proximo, subindo a cadeia. */
    get owner(): Scope | null;
    /** Conjunto de refs visiveis, mesclando os escopos ancestrais. */
    get allRefs(): Record<string, Element>;
    lookup(name: string): Record<string, any> | undefined;
    has(name: string): boolean;
    get(name: string): unknown;
    set(name: string, value: unknown): void;
    child(vars?: Record<string, unknown>, el?: Element | null): Scope;
    /** Cria um escopo filho reativo, usado por `v-data` e por `v-for`. */
    reactiveChild(vars: Record<string, unknown>, el?: Element | null): Scope;
    private magicContainer;
}
/**
 * Escopo raiz global, compartilhado por elementos sem `v-data`.
 * Os dados sao reativos, entao qualquer valor colocado aqui por `V.data()`
 * ou por `v-resource` atualiza a pagina sozinho.
 */
declare const rootScope: Scope;

/**
 * @module runtime/registry
 *
 * Registros globais: configuracao, directives, componentes e plugins.
 */

interface VoodooConfig {
    /** Prefixo dos atributos. Trocar para `data-v-` em HTML estritamente valido. */
    prefix: string;
    /** Inicializa o DOM automaticamente quando o script carrega. */
    autoStart: boolean;
    /** Observa o DOM com MutationObserver e inicializa novos elementos. */
    autoDiscover: boolean;
    /** Raiz observada. Por padrao `document.body`. */
    root: Element | null;
    /** Mostra avisos detalhados no console. */
    devtools: boolean;
    /** URL base das requisicoes disparadas por atributos. */
    baseURL: string;
    /** Globais liberados dentro das expressoes. */
    globals: Record<string, unknown>;
    /** Locale usado por formatadores de data, numero e moeda. */
    locale: string;
    /** Moeda padrao de `v-currency`. */
    currency: string;
    /** Injeta o CSS dos componentes de UI automaticamente. */
    injectStyles: boolean;
    /**
     * Retira os atributos `v-*` do HTML depois de processados, deixando o DOM
     * limpo no inspetor. Os valores continuam acessiveis internamente.
     */
    cleanAttributes: boolean;
    /**
     * Recusa `javascript:`, `vbscript:` e `data:text/html` em atributos que o
     * navegador navega, como `href`, `src`, `action` e `formaction`. Desligue
     * somente se a aplicacao precisar mesmo gerar esses esquemas.
     */
    sanitizeUrls: boolean;
}
declare const config: VoodooConfig;
interface DirectiveBinding<T = any> {
    el: HTMLElement;
    /** Valor ja avaliado da expressao. */
    value: T;
    oldValue: T | undefined;
    /** Argumento depois dos dois pontos, como `click` em `v-on:click`. */
    arg?: string;
    /** Modificadores depois dos pontos, como `.prevent.stop`. */
    modifiers: Record<string, string | true>;
    /** Texto original da expressao. */
    expression: string;
    scope: Scope;
    /** Instancia de componente mais proxima, quando existir. */
    instance: any;
}
/** Directive no formato de ciclo de vida, usado por `V.directive()`. */
interface DirectiveHooks<T = any> {
    created?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    beforeMount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    mounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    updated?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    beforeUnmount?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    unmounted?(el: HTMLElement, binding: DirectiveBinding<T>): void;
    /** Ordem de execucao. Maior roda primeiro. Padrao 0. */
    priority?: number;
    /** Quando `true`, a expressao nao e avaliada automaticamente. */
    raw?: boolean;
    /**
     * Assume a subarvore inteira, como fazem `v-if` e `v-for`: o walker nao desce
     * nos filhos, e quem decide o que fazer com eles e a propria directive.
     * Sem isto, um plugin nao consegue escrever uma directive estrutural.
     */
    terminal?: boolean;
}
/** Contexto entregue as directives internas, com controle fino de efeitos. */
interface DirectiveContext {
    el: HTMLElement;
    scope: Scope;
    /** Texto da expressao, exatamente como escrito no atributo. */
    expression: string;
    arg?: string;
    modifiers: Record<string, string | true>;
    /** Avalia a expressao do atributo, ou outra passada por parametro. */
    evaluate<T = any>(expression?: string): T;
    /** Cria um efeito reativo com limpeza ligada ao elemento. */
    effect(fn: () => void): void;
    /** Registra limpeza executada quando o elemento sai do DOM. */
    cleanup(fn: () => void): void;
    /** Percorre um subarvore aplicando as directives, usado por `v-if` e `v-for`. */
    walk(node: Node, scope: Scope): void;
    /** Nome completo do atributo, util para mensagens de erro. */
    raw: string;
}
type DirectiveSetup = (ctx: DirectiveContext) => void;
interface DirectiveDefinition {
    name: string;
    setup: DirectiveSetup;
    /** Maior roda primeiro. */
    priority: number;
    /** Impede que o walker desca nos filhos, como em `v-for` e `v-if`. */
    terminal: boolean;
}
/** Prioridades dos casos especiais. Valores maiores sao processados antes. */
declare const PRIORITY: {
    readonly IGNORE: 100;
    readonly FOR: 90;
    readonly IF: 80;
    readonly DATA: 70;
    readonly COMPONENT: 65;
    readonly REF: 60;
    readonly BIND: 45;
    readonly MODEL: 40;
    readonly DEFAULT: 0;
    readonly INIT: -10;
    readonly TRANSITION: -20;
};
interface RegisterDirectiveOptions {
    priority?: number;
    terminal?: boolean;
}
/** Registro interno, usado pelas directives nativas. */
declare function defineDirective(name: string, setup: DirectiveSetup, options?: RegisterDirectiveOptions): void;
interface ComponentDefinition {
    /** Estado inicial. Recebe as props ja resolvidas. */
    state?: (this: any, props: Record<string, any>) => Record<string, any>;
    /** Alias de `state`, para quem vem do Vue. */
    data?: (this: any, props: Record<string, any>) => Record<string, any>;
    /** Nomes das props aceitas, ou definicao com tipo e valor padrao. */
    props?: string[] | Record<string, PropDefinition>;
    methods?: Record<string, (this: any, ...args: any[]) => any>;
    computed?: Record<string, (this: any) => any>;
    watch?: Record<string, (this: any, value: any, oldValue: any) => void>;
    /** HTML do componente. Use `<slot>` para receber o conteudo original. */
    template?: string;
    /** CSS injetado uma unica vez quando o componente e usado. */
    style?: string;
    /** Herda o escopo do pai em vez de isolar. Padrao `false`. */
    inheritScope?: boolean;
    /** Valores entregues aos descendentes, lidos com `inject`. */
    provide?: Record<string, unknown> | ((this: any) => Record<string, unknown>);
    /** Valores buscados em um `provide` acima, disponiveis como estado. */
    inject?: string[] | Record<string, {
        from?: string;
        default?: unknown;
    }>;
    beforeMount?(this: any): void;
    mounted?(this: any): void;
    updated?(this: any): void;
    beforeUnmount?(this: any): void;
    destroyed?(this: any): void;
    unmounted?(this: any): void;
    [key: string]: any;
}
interface PropDefinition {
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
    default?: any;
    required?: boolean;
}
interface VoodooPlugin {
    name?: string;
    install(V: any, options?: Record<string, unknown>): void;
}

/**
 * @module runtime/component
 *
 * Modelo de componentes. Um componente da Voodoo e um escopo com estado,
 * metodos, computados, watchers, props, slots e ciclo de vida, montado sobre um
 * elemento existente. Nao existe passo de compilacao.
 *
 * Tres formas de uso:
 *
 * ```html
 * <div v-component="counter"></div>          <!-- registrado -->
 * <counter></counter>                        <!-- tag propria -->
 * <Counter start="10"></Counter>             <!-- tag em PascalCase -->
 * ```
 */

interface ComponentInstance {
    $el: HTMLElement;
    $props: Record<string, any>;
    $refs: Record<string, Element>;
    $scope: Scope;
    $parent: ComponentInstance | null;
    $name: string;
    emit(event: string, detail?: unknown): void;
    [key: string]: any;
}
/** Componentes ja montados, para inspecao pelas devtools. */
declare const instances: Set<ComponentInstance>;
/**
 * Registra um componente.
 *
 * ```js
 * V.component('counter', {
 *   props: { start: { type: 'number', default: 0 } },
 *   state(props) { return { count: props.start } },
 *   computed: { dobro() { return this.count * 2 } },
 *   methods: { increment() { this.count++ } },
 *   template: `
 *     <button v-click="increment" v-text="count"></button>
 *     <small v-text="dobro"></small>
 *   `,
 *   mounted() { console.log('montado') }
 * })
 * ```
 */
declare function defineComponent(name: string, definition: ComponentDefinition): void;
/**
 * Monta um componente sobre um elemento e devolve o escopo resultante.
 * Chamado pelo walker quando encontra `v-component` ou uma tag registrada.
 */
declare function mountComponent(el: HTMLElement, name: string, parentScope: Scope): Scope | null;

/**
 * @module storage
 *
 * Acesso uniforme a localStorage, sessionStorage, cookies, query string e a um
 * cache em memoria com expiracao. Todas as leituras e escritas sao seguras: em
 * modo privado, com cota cheia ou fora do navegador, as chamadas nao lancam.
 */
interface StorageAdapter {
    get<T = unknown>(key: string, fallback?: T): T | undefined;
    set(key: string, value: unknown): boolean;
    remove(key: string): void;
    clear(): void;
    has(key: string): boolean;
    keys(): string[];
}
/** `localStorage` com serializacao JSON automatica. */
declare const storage: StorageAdapter;
/** `sessionStorage` com serializacao JSON automatica. */
declare const session: StorageAdapter;
interface CookieOptions {
    /** Dias ate expirar, ou uma data. */
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
declare const cookie: {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
    remove(name: string, options?: CookieOptions): void;
    has(name: string): boolean;
};
declare const url: {
    /** Le um parametro da URL atual. */
    get(key: string, fallback?: string): string | undefined;
    /** Le todos os parametros como objeto. */
    all(): Record<string, string>;
    /** Escreve um parametro sem recarregar a pagina. */
    set(key: string, value: string | number | null, replace?: boolean): void;
    remove(key: string, replace?: boolean): void;
    /** Aplica varios parametros de uma vez. */
    merge(params: Record<string, string | number | null>, replace?: boolean): void;
};
declare const cache: {
    /** Guarda um valor. `ttl` em milissegundos, `0` significa sem expiracao. */
    set<T>(key: string, value: T, ttl?: number): T;
    get<T = unknown>(key: string, fallback?: T): T | undefined;
    has(key: string): boolean;
    remove(key: string): void;
    clear(): void;
    /** Executa a funcao apenas quando o valor nao estiver em cache. */
    remember<T>(key: string, ttl: number, factory: () => Promise<T> | T): Promise<T>;
    readonly size: number;
};
type ThemeName = 'light' | 'dark' | 'system';
declare const theme: {
    /** Tema escolhido pelo usuario, ou `system` quando nunca foi definido. */
    readonly current: ThemeName;
    /** Tema efetivamente aplicado, resolvendo `system`. */
    readonly resolved: "light" | "dark";
    set(value: ThemeName): void;
    toggle(): "light" | "dark";
    /** Escreve `data-theme` no elemento raiz e avisa a pagina. */
    apply(): void;
    /** Aplica o tema salvo assim que a pagina carrega. */
    init(): void;
};

/**
 * @module ui/toast
 *
 * Notificacoes temporarias. Sem dependencia, com fila, pausa ao passar o mouse,
 * barra de progresso, acao opcional e suporte a promessa.
 *
 * ```js
 * V.toast.success('Usuario salvo!')
 * V.toast.promise(salvar(), { loading: 'Salvando', success: 'Pronto', error: 'Falhou' })
 * ```
 */
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'default';
type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
interface ToastOptions {
    title?: string;
    description?: string;
    type?: ToastType;
    /** Milissegundos ate fechar. `0` mantem aberto ate o usuario fechar. */
    duration?: number;
    position?: ToastPosition;
    /** Botao de acao dentro da notificacao. */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Mostra o botao de fechar. */
    closable?: boolean;
    /** HTML customizado no lugar do conteudo padrao. Use com cuidado. */
    html?: string;
    onClose?: () => void;
}
interface ToastHandle {
    id: string;
    close(): void;
    update(options: Partial<ToastOptions>): void;
}
declare const settings: {
    duration: number;
    position: ToastPosition;
    max: number;
};
declare const toast: ((message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle) & {
    success: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    error: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    warning: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    info: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    loading: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
    /**
     * Acompanha uma promessa: mostra carregando, depois sucesso ou erro.
     *
     * ```js
     * V.toast.promise(salvar(), {
     *   loading: 'Salvando...',
     *   success: (dados) => `Salvo com id ${dados.id}`,
     *   error: 'Nao foi possivel salvar'
     * })
     * ```
     */
    promise<T>(promise: Promise<T>, messages?: {
        loading?: string;
        success?: string | ((value: T) => string);
        error?: string | ((error: unknown) => string);
    }): Promise<T>;
    /** Fecha todas as notificacoes abertas. */
    clear(): void;
    /** Ajusta duracao, posicao e limite padrao. */
    configure(options: Partial<typeof settings>): void;
    settings: {
        duration: number;
        position: ToastPosition;
        max: number;
    };
};

/**
 * @module runtime/walker
 *
 * Percorre o DOM, encontra atributos `v-*`, `:` e `@`, e liga cada um ao
 * sistema reativo. Este e o motor que faz o HTML virar aplicacao.
 *
 * Regras de ordem em um mesmo elemento:
 *   1. `v-ignore` e `v-pre` cancelam o processamento.
 *   2. Directives terminais (`v-for`, `v-if`) assumem o controle da subarvore.
 *   3. `v-data` e `v-component` criam o escopo usado pelo restante.
 *   4. As demais directives rodam por prioridade decrescente.
 *   5. Os filhos sao percorridos com o escopo resultante.
 */

/** Escopo associado a um no, se houver. */
declare function getScope(node: Node): Scope | undefined;
/** Escopo efetivo de um no, subindo pelos ancestrais. */
declare function findScope(node: Node | null): Scope;
/** Registra uma funcao executada quando o no for removido do DOM. */
declare function addCleanup(node: Node, fn: () => void): void;
/**
 * Desmonta um no e todos os descendentes: para efeitos, remove listeners e
 * dispara os hooks `beforeUnmount` e `unmounted`.
 */
declare function destroy(node: Node): void;
interface ParsedAttribute {
    /** Nome do atributo como escrito no HTML. */
    raw: string;
    /** Nome da directive, sem prefixo, como `text`, `on`, `toast-success`. */
    name: string;
    /** Argumento apos os dois pontos, como `click` em `v-on:click`. */
    arg?: string;
    modifiers: Record<string, string | true>;
    /** Valor do atributo. */
    expression: string;
}
/**
 * Converte um atributo do HTML na descricao de uma directive.
 * Retorna `null` quando o atributo nao pertence a Voodoo.
 *
 * ```
 * v-on:click.prevent="save"  ->  { name:'on', arg:'click', modifiers:{prevent:true} }
 * :disabled="loading"        ->  { name:'bind', arg:'disabled' }
 * @submit.prevent="save"     ->  { name:'on', arg:'submit', modifiers:{prevent:true} }
 * ```
 */
declare function parseAttribute(name: string, value: string): ParsedAttribute | null;
/**
 * Avalia uma expressao no escopo informado. Erros sao reportados sem quebrar a
 * pagina, porque um atributo com problema nao deve derrubar o resto do app.
 */
declare function evaluateIn<T = any>(expression: string, scope: Scope, context?: string, el?: Element | null): T;
/**
 * Percorre um no aplicando as directives encontradas.
 *
 * @param node raiz do trecho a inicializar
 * @param scope escopo aplicado ao no. Quando ausente, e deduzido dos ancestrais.
 */
declare function walk(node: Node, scope?: Scope): void;
/** Inicializa a Voodoo em uma raiz. Chamado automaticamente no navegador. */
declare function start(root?: Element | Document): void;
/** Interrompe a observacao automatica do DOM. */
declare function stopObserving(): void;
/** Reinicializa a Voodoo dentro de uma raiz, util em testes. */
declare function refresh(root?: Element): void;

/**
 * @module runtime/app
 *
 * Modo aplicacao: `createApp(...).mount('#app')`.
 *
 * O modo de sempre da Voodoo e ligar atributos a um HTML que ja existe. Este
 * modulo acrescenta o outro caminho, o do Vue e do React: a aplicacao inteira e
 * descrita em JavaScript, tem uma raiz propria e o HTML dela vem do template.
 *
 * ```js
 * const app = V.createApp({
 *   data: () => ({ n: 0 }),
 *   computed: { dobro() { return this.n * 2 } },
 *   methods: { somar() { this.n++ } },
 *   template: `
 *     <button @click="somar()">Cliques: { n }</button>
 *     <p>Dobro: { dobro }</p>
 *   `
 * })
 *
 * app.mount('#app')
 * ```
 *
 * Duas diferencas propositais em relacao ao Vue:
 *
 * 1. `mount` aceita um alvo que ainda nao existe. Nao existe corrida com o
 *    carregamento da pagina, porque quem espera e o agendador da propria
 *    Voodoo, e nao `DOMContentLoaded`.
 * 2. `unmount` devolve o container ao HTML original, em vez de deixa-lo vazio.
 */

interface AppOptions extends ComponentDefinition {
    /** Componentes visiveis apenas dentro desta aplicacao. */
    components?: Record<string, ComponentDefinition>;
    /** Valores entregues a arvore inteira, lidos com `inject`. */
    provide?: Record<string, unknown> | (() => Record<string, unknown>);
}
interface AppConfig {
    /** Valores liberados dentro das expressoes desta aplicacao. */
    globalProperties: Record<string, unknown>;
}
interface App {
    /** Nome interno do componente raiz, util em mensagens e no inspetor. */
    readonly name: string;
    readonly config: AppConfig;
    /** Instancia raiz, ou `null` enquanto a aplicacao nao montou. */
    readonly instance: ComponentInstance | null;
    /** Elemento que recebeu a aplicacao, ou `null`. */
    readonly container: Element | null;
    readonly isMounted: boolean;
    component(name: string): ComponentDefinition | undefined;
    component(name: string, definition: ComponentDefinition): App;
    directive(name: string, definition: unknown): App;
    use(plugin: VoodooPlugin | Function, options?: Record<string, unknown>): App;
    provide(key: string, value: unknown): App;
    /**
     * Monta a aplicacao. O alvo pode ser um seletor ou um elemento, e pode ainda
     * nao existir: nesse caso a montagem acontece assim que ele aparecer.
     */
    mount(target: string | Element): ComponentInstance | null;
    /** Promessa resolvida com a instancia raiz quando a montagem acontecer. */
    whenMounted(): Promise<ComponentInstance>;
    /** Desmonta e devolve o container ao conteudo original. */
    unmount(): void;
}
/**
 * Cria uma aplicacao. As opcoes sao as mesmas de um componente, mais
 * `components` e `provide`.
 */
declare function createApp(options?: AppOptions): App;

/**
 * @module runtime/boot
 *
 * Agendador de inicializacao proprio da Voodoo.
 *
 * A biblioteca nao usa `DOMContentLoaded` nem `document.readyState` para saber
 * quando comecar. Em vez disso ela mantem o proprio laco: a cada passo pergunta
 * se a condicao daquela tarefa ja vale, e executa as que valem.
 *
 * O motivo e simples. Os eventos de carregamento do navegador respondem a
 * pergunta errada. `DOMContentLoaded` diz que o parser terminou, e nao que a
 * arvore que interessa existe. Uma pagina renderizada por outro script, um
 * fragmento inserido depois, um container que so aparece na segunda tela: em
 * todos esses casos o evento ja passou, ou vai passar cedo demais.
 *
 * O laco daqui responde a pergunta certa: "o que eu preciso ja esta no
 * documento e parou de mudar?". Isso vale tanto para o inicio automatico quanto
 * para `app.mount('#app')` chamado antes de `#app` existir.
 *
 * ```js
 * whenReady(() => V.start())                    // documento estavel
 * whenElement('#app', (el) => montar(el))       // elemento, exista ele ou nao
 * ```
 */
/**
 * Executa quando o documento tiver corpo e parar de mudar.
 *
 * Substitui `DOMContentLoaded`. A diferenca pratica aparece em dois casos:
 * um script sem `defer` no `<head>`, onde o corpo ainda nao existe, e uma
 * pagina montada por outro script, onde o evento ja passou.
 */
declare function whenReady(acao: () => void): void;
/**
 * Resolve um elemento que pode ainda nao existir.
 *
 * ```js
 * whenElement('#app', (el) => app.mount(el))
 * ```
 */
declare function whenElement(alvo: string | Element, acao: (el: Element) => void, aoDesistir?: () => void): void;
/** Promessa resolvida quando o documento estiver pronto pelo criterio acima. */
declare function ready$1(): Promise<void>;

/**
 * @module http/resource
 *
 * Recurso reativo: uma requisicao com estado de carregamento, erro e dados
 * prontos para serem lidos direto no HTML.
 *
 * E o mesmo nucleo usado por `v-resource`. A directive apenas le a configuracao
 * dos atributos e chama esta funcao, entao o comportamento dos dois e sempre o
 * mesmo, sem logica duplicada.
 *
 * ```js
 * const produtos = V.resource('/api/produtos')
 * V.effect(() => console.log(produtos.loading, produtos.data))
 * await produtos.reload()
 * ```
 */

interface ResourceOptions {
    /** Verbo HTTP. Padrao `GET`. */
    method?: HttpMethod;
    /** Parametros de query. Uma funcao e reavaliada a cada requisicao. */
    params?: Record<string, string | number | boolean | null | undefined> | (() => Record<string, string | number | boolean | null | undefined> | undefined);
    /** Tempo de cache da resposta, em ms. */
    cache?: number;
    /** Tentativas extras em caso de falha. */
    retry?: number;
    /** Milissegundos ate abortar. */
    timeout?: number;
    headers?: Record<string, string>;
    /** Caminho dentro do JSON da resposta, como `dados.itens`. */
    jsonPath?: string | null;
    /** Nao dispara a primeira requisicao sozinho. */
    manual?: boolean;
    /** Repete a requisicao a cada N ms enquanto a aba estiver visivel. */
    poll?: number;
    /** Chamado depois de cada resposta bem sucedida. */
    onSuccess?(data: unknown): void;
    /** Chamado quando a requisicao falha, com a mensagem ja extraida. */
    onError?(err: unknown, message: string): void;
}
interface Resource<T = unknown> {
    /** Corpo da resposta, ja recortado por `jsonPath` quando houver. */
    data: T | null;
    /** `true` enquanto a requisicao esta em andamento. */
    loading: boolean;
    /** Erro da ultima tentativa, ou `null`. */
    error: (Error & {
        message: string;
    }) | null;
    /** `true` depois da primeira resposta bem sucedida. */
    loaded: boolean;
    /** Refaz a requisicao. */
    reload(): Promise<void>;
    /** Troca os dados localmente, util para atualizacao otimista. */
    set(value: T): void;
    /** Cancela a requisicao em andamento e para a repeticao automatica. */
    stop(): void;
}
/**
 * Cria um recurso reativo.
 *
 * @param url endereco fixo, ou funcao que devolve o endereco a cada chamada.
 *   Devolver vazio adia a requisicao, util enquanto um parametro nao existe.
 * @param options configuracao da requisicao e do ciclo de vida
 */
declare function createResource<T = unknown>(url: string | (() => string), options?: ResourceOptions): Resource<T>;

/**
 * @module store
 *
 * Estado global reativo. Um store e um objeto reativo nomeado, acessivel de
 * qualquer expressao pela variavel magica `$store`.
 *
 * ```js
 * V.store('carrinho', { itens: [], get total() { return this.itens.length } })
 * ```
 *
 * ```html
 * <span>{ $store.carrinho.total }</span>
 * <button v-click="$store.carrinho.itens.push(produto)">Adicionar</button>
 * ```
 */
type StoreDefinition = Record<string, any>;
interface StoreOptions {
    /** Salva o store no localStorage e restaura no proximo carregamento. */
    persist?: boolean | string;
}
/**
 * Cria ou recupera um store.
 *
 * Passando apenas o nome, devolve o store existente. Passando a definicao,
 * cria o store. Metodos declarados na definicao recebem `this` apontando para
 * o proprio store.
 */
declare function store<T extends StoreDefinition>(name: string, definition?: T, options?: StoreOptions): T;
/** Todos os stores registrados, usado por `$store` e pelas devtools. */
declare const allStores: Record<string, Record<string, any>>;
/** Remove um store e para a persistencia associada. */
declare function removeStore(name: string): void;
/** Lista os nomes dos stores existentes. */
declare function storeNames(): string[];

/**
 * @module dom/style
 *
 * Injecao de CSS sob demanda. Cada bloco entra no documento uma unica vez, so
 * quando o recurso correspondente e realmente usado, o que evita CSS morto.
 *
 * Todos os estilos usam variaveis CSS com valor padrao embutido. Se o projeto
 * carregar o design system da Voodoo, as cores seguem automaticamente o tema.
 */
/** Injeta um bloco de CSS identificado por `id`. Repetir a chamada nao duplica. */
declare function injectStyle(id: string, css: string): void;
/** Garante que os tokens estejam presentes antes de qualquer componente de UI. */
declare function ensureTokens(): void;

/**
 * @module dom/transition
 *
 * Transicoes de entrada e saida baseadas em classes CSS, no mesmo modelo do
 * Vue, porem sem componente wrapper: basta `v-transition` no elemento.
 *
 * Ciclo de entrada:
 *   `.{nome}-enter-from` aplicado, proximo quadro troca para `.{nome}-enter-to`,
 *   ambas com `.{nome}-enter-active`, removidas ao terminar a animacao.
 */
interface TransitionClasses {
    enterFrom?: string;
    enterActive?: string;
    enterTo?: string;
    leaveFrom?: string;
    leaveActive?: string;
    leaveTo?: string;
}
interface TransitionOptions extends TransitionClasses {
    /** Nome base das classes. Padrao `v-fade`. */
    name?: string;
    /** Duracao forcada em ms. Quando ausente, e lida do CSS computado. */
    duration?: number;
}
/** Executa a transicao de entrada e resolve quando ela termina. */
declare function enter(el: HTMLElement, options?: TransitionOptions): Promise<void>;
/** Executa a transicao de saida e resolve quando ela termina. */
declare function leave(el: HTMLElement, options?: TransitionOptions): Promise<void>;
/** Anima altura de 0 ate o conteudo. Usado por `v-collapse`. */
declare function slideDown(el: HTMLElement, duration?: number): Promise<void>;
/** Anima altura ate zero e esconde o elemento. */
declare function slideUp(el: HTMLElement, duration?: number): Promise<void>;
/** Aparecimento com fade. */
declare function fadeIn(el: HTMLElement, duration?: number): Promise<void>;
/** Desaparecimento com fade, terminando em `display:none`. */
declare function fadeOut(el: HTMLElement, duration?: number): Promise<void>;
/**
 * Transicoes suaves de layout usando a View Transitions API quando existir.
 * Em navegadores sem suporte, a funcao apenas executa a mudanca.
 */
declare function viewTransition(update: () => void): void;

type EventHandler = (payload?: any) => void;
/** Assina um evento global. Devolve a funcao que cancela a assinatura. */
declare function on(name: string, handler: EventHandler): () => void;
/** Assina um evento global apenas para a proxima ocorrencia. */
declare function onceEvent(name: string, handler: EventHandler): () => void;
/** Dispara um evento global. */
declare function emit(name: string, payload?: unknown): void;
declare function off(name: string, handler?: EventHandler): void;
/**
 * Registra uma directive personalizada.
 *
 * ```js
 * V.directive('highlight', {
 *   mounted(el, binding) { el.style.background = binding.value },
 *   updated(el, binding) { el.style.background = binding.value }
 * })
 * ```
 *
 * ```html
 * <div v-highlight="'yellow'">Destaque</div>
 * ```
 *
 * Tambem aceita uma funcao curta, chamada em `mounted` e em `updated`:
 *
 * ```js
 * V.directive('highlight', (el, binding) => { el.style.background = binding.value })
 * ```
 */
declare function directive<T = any>(name: string, definition: DirectiveHooks<T> | ((el: HTMLElement, binding: DirectiveBinding<T>) => void)): void;
/**
 * Coloca valores no escopo raiz, visiveis para qualquer expressao da pagina.
 *
 * ```js
 * V.data({ usuario: null, carregando: false })
 * ```
 */
declare function data<T extends Record<string, unknown>>(values: T): T;
/**
 * Nucleo da Voodoo. O objeto exportado tambem e chamavel: `V('#app')` devolve
 * uma colecao encadeavel de elementos.
 */
declare const core: {
    version: string;
    config: VoodooConfig;
    reactive: typeof reactive;
    ref: typeof ref;
    shallowRef: typeof shallowRef;
    computed: typeof computed;
    effect: typeof effect;
    watch: typeof watch;
    watchEffect: typeof watchEffect;
    nextTick: typeof nextTick;
    toRaw: typeof toRaw;
    markRaw: typeof markRaw;
    unref: typeof unref;
    stop: typeof stop;
    effectScope: typeof effectScope;
    EffectScope: typeof EffectScope;
    flushSync: typeof flushSync;
    data: typeof data;
    store: typeof store;
    stores: Record<string, Record<string, any>>;
    removeStore: typeof removeStore;
    storeNames: typeof storeNames;
    scope: Scope;
    component: typeof defineComponent;
    components: Map<string, ComponentDefinition>;
    directive: typeof directive;
    directives: Map<string, DirectiveDefinition>;
    magic: typeof magic;
    magics: Map<string, MagicGetter>;
    createApp: typeof createApp;
    start: typeof start;
    whenReady: typeof whenReady;
    whenElement: typeof whenElement;
    walk: typeof walk;
    refresh: typeof refresh;
    destroy: typeof destroy;
    stopObserving: typeof stopObserving;
    getScope: typeof getScope;
    findScope: typeof findScope;
    addCleanup: typeof addCleanup;
    parseAttribute: typeof parseAttribute;
    parse: typeof parse;
    tokenize: typeof tokenize;
    evaluate: typeof evaluate;
    evaluateIn: typeof evaluateIn;
    stringify: typeof stringify;
    clearParseCache: typeof clearParseCache;
    globals: Record<string, unknown>;
    http: {
        defaults: HttpDefaults;
        get<T = unknown>(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        post<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        put<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        patch<T = unknown>(url: string, body?: unknown, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        delete<T = unknown>(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<T>;
        head(url: string, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<unknown>;
        request: typeof request;
        upload<T = unknown>(url: string, data: FormData, options?: {
            method?: "POST" | "PUT" | "PATCH";
            headers?: Record<string, string>;
            onProgress?: (percent: number, loaded: number, total: number) => void;
            signal?: AbortSignal;
        }): Promise<T>;
        sse(url: string, handlers?: {
            message?: (data: unknown, event: MessageEvent) => void;
            error?: (e: Event) => void;
        }): EventSource;
        stream(url: string, onLine: (line: string) => void, options?: {
            params?: Record<string, string | number | boolean | null | undefined> | undefined;
            headers?: Record<string, string> | undefined;
            timeout?: number | undefined;
            retry?: number | undefined;
            retryDelay?: number | undefined;
            retryUnsafe?: boolean | undefined;
            cache?: number | undefined;
            signal?: AbortSignal | undefined;
            credentials?: RequestCredentials | undefined;
            responseType?: "auto" | "json" | "text" | "blob" | "arrayBuffer" | "formData" | undefined;
            onProgress?: ((loaded: number, total: number) => void) | undefined;
            offlineQueue?: boolean | undefined;
        }): Promise<void>;
        interceptors: {
            request: {
                use(fn: RequestInterceptor): () => void;
            };
            response: {
                use(fn: ResponseInterceptor): () => void;
            };
            error: {
                use(fn: ErrorInterceptor): () => void;
            };
        };
        setHeader(name: string, value: string | null): void;
        setToken(token: string | null, scheme?: string): void;
        setBaseURL(url: string): void;
        clearCache: typeof clearCache;
        flushOfflineQueue: typeof flushOfflineQueue;
        parseDuration: typeof parseDuration;
    };
    request: typeof request;
    HttpError: typeof HttpError;
    /** Recurso reativo por JavaScript, equivalente a `v-resource`. */
    resource: typeof createResource;
    toast: ((message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle) & {
        success: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        error: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        warning: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        info: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        loading: (message: string | ToastOptions, options?: Partial<ToastOptions>) => ToastHandle;
        promise<T>(promise: Promise<T>, messages?: {
            loading?: string;
            success?: string | ((value: T) => string);
            error?: string | ((error: unknown) => string);
        }): Promise<T>;
        clear(): void;
        configure(options: Partial<{
            duration: number;
            position: ToastPosition;
            max: number;
        }>): void;
        settings: {
            duration: number;
            position: ToastPosition;
            max: number;
        };
    };
    storage: StorageAdapter;
    session: StorageAdapter;
    cookie: {
        get(name: string): string | undefined;
        set(name: string, value: string, options?: CookieOptions): void;
        remove(name: string, options?: CookieOptions): void;
        has(name: string): boolean;
    };
    cache: {
        set<T>(key: string, value: T, ttl?: number): T;
        get<T = unknown>(key: string, fallback?: T): T | undefined;
        has(key: string): boolean;
        remove(key: string): void;
        clear(): void;
        remember<T>(key: string, ttl: number, factory: () => Promise<T> | T): Promise<T>;
        readonly size: number;
    };
    url: {
        get(key: string, fallback?: string): string | undefined;
        all(): Record<string, string>;
        set(key: string, value: string | number | null, replace?: boolean): void;
        remove(key: string, replace?: boolean): void;
        merge(params: Record<string, string | number | null>, replace?: boolean): void;
    };
    theme: {
        readonly current: ThemeName;
        readonly resolved: "light" | "dark";
        set(value: ThemeName): void;
        toggle(): "light" | "dark";
        apply(): void;
        init(): void;
    };
    clipboard: {
        copy(text: string): Promise<boolean>;
        read(): Promise<string>;
    };
    screen: {
        width: number;
        height: number;
        mobile: boolean;
        tablet: boolean;
        desktop: boolean;
        portrait: boolean;
        landscape: boolean;
        matches(query: string): boolean;
    };
    network: {
        online: boolean;
        type: string;
        saveData: boolean;
        slow: boolean;
    };
    enter: typeof enter;
    leave: typeof leave;
    fadeIn: typeof fadeIn;
    fadeOut: typeof fadeOut;
    slideUp: typeof slideUp;
    slideDown: typeof slideDown;
    viewTransition: typeof viewTransition;
    injectStyle: typeof injectStyle;
    ensureTokens: typeof ensureTokens;
    on: typeof on;
    once: typeof onceEvent;
    off: typeof off;
    emit: typeof emit;
    use(plugin: VoodooPlugin | ((V: any) => void), options?: Record<string, unknown>): void;
    /** Define o tratamento de erros da aplicacao inteira. */
    onError(handler: (err: unknown, context: string) => void): void;
    /** Instancias de componente montadas, para inspecao. */
    instances: Set<ComponentInstance>;
    Scope: typeof Scope;
    PRIORITY: {
        readonly IGNORE: 100;
        readonly FOR: 90;
        readonly IF: 80;
        readonly DATA: 70;
        readonly COMPONENT: 65;
        readonly REF: 60;
        readonly BIND: 45;
        readonly MODEL: 40;
        readonly DEFAULT: 0;
        readonly INIT: -10;
        readonly TRANSITION: -20;
    };
    VoodooSyntaxError: typeof VoodooSyntaxError;
    VoodooRuntimeError: typeof VoodooRuntimeError;
    uuid(): string;
    uid(prefix?: string): string;
    sleep(ms: number): Promise<void>;
    parseDuration(value: string | number | null | undefined, fallback?: number): number;
    debounce<T extends (...args: any[]) => any>(fn: T, wait?: number, immediate?: boolean): DebouncedFunction<T>;
    throttle<T extends (...args: any[]) => any>(fn: T, wait?: number): DebouncedFunction<T>;
    memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T & {
        cache: Map<string, ReturnType<T>>;
    };
    clone<T>(value: T): T;
    merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T;
    groupBy<T>(list: T[], key: string | ((item: T) => string | number)): Record<string, T[]>;
    unique<T>(list: T[], key?: string | ((item: T) => unknown)): T[];
    chunk<T>(list: T[], size?: number): T[][];
    sortBy<T>(list: T[], key: string | ((item: T) => any), direction?: "asc" | "desc"): T[];
    get<T = unknown>(object: unknown, path: string, fallback?: T): T | undefined;
    set(object: Record<string, any>, path: string, value: unknown): void;
    random(min?: number, max?: number): number;
    sample<T>(list: T[]): T | undefined;
    slugify(text: string, separator?: string): string;
    truncate(text: string, length?: number, suffix?: string): string;
    capitalize(text: string): string;
    titleCase(text: string): string;
    escapeHtml(text: string): string;
    stripTags(html: string): string;
    setFormatDefaults(locale?: string, currency?: string): void;
    formatCurrency(value: number | string, options?: FormatOptions): string;
    formatNumber(value: number | string, options?: Intl.NumberFormatOptions & FormatOptions): string;
    formatDate(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions, locale?: string): string;
    relativeTime(value: Date | string | number, locale?: string): string;
    formatFileSize(bytes: number, decimals?: number): string;
    formatPercent(value: number, decimals?: number, locale?: string): string;
    matchesMedia(query: string): boolean;
    isBrowser: boolean;
    device: {
        readonly touch: boolean;
        readonly mobile: boolean;
        readonly tablet: boolean;
        readonly desktop: boolean;
        readonly online: boolean;
        readonly reducedMotion: boolean;
        readonly darkMode: boolean;
    };
};

/**
 * @module dom/query
 *
 * Colecao encadeavel de elementos. A ideia e a mesma do jQuery: selecionar,
 * percorrer e manipular com poucas linhas. A diferenca esta na tipagem estrita,
 * na iteracao nativa com `for...of`, no zero de dependencias e na integracao com
 * o runtime da Voodoo: remover ou esvaziar elementos desmonta os efeitos
 * reativos ligados a eles, o que evita vazamento.
 *
 * ```js
 * V.query('.card')
 *   .addClass('ativo')
 *   .on('click', '.botao', function () { V.query(this).closest('.card').remove() })
 * ```
 */
/** Funcao executada quando o documento fica pronto. */
type ReadyCallback = () => void;
/** Manipulador de evento. `this` aponta para o elemento que casou com o filtro. */
type QueryEventHandler = (this: HTMLElement, event: Event) => unknown;
/** Tudo que `query()` aceita como entrada. */
type QueryInput = string | Node | Element | Document | DocumentFragment | ArrayLike<Node> | VoodooCollection | ReadyCallback | null | undefined;
/** Filtro aceito por `filter`, `not` e `is`. */
type QueryFilter = string | ((el: HTMLElement, index: number) => boolean);
/** Coordenadas devolvidas por `offset` e `position`. */
interface QueryPoint {
    top: number;
    left: number;
}
/** Valor aceito na escrita de atributos e propriedades simples. */
type QueryValue = string | number | boolean | null;
/**
 * Lista imutavel de elementos com metodos encadeaveis. Instancias sao criadas
 * por `query()`, nunca com `new` no codigo do usuario.
 */
declare class VoodooCollection implements Iterable<HTMLElement> {
    /** Acesso indexado, como em `colecao[0]`. */
    [index: number]: HTMLElement;
    /** Quantidade de elementos da colecao. */
    readonly length: number;
    /** Elementos da colecao, na ordem em que foram encontrados. */
    readonly elements: HTMLElement[];
    constructor(elements?: HTMLElement[]);
    /** Permite `for (const el of query('.item'))`. */
    [Symbol.iterator](): Iterator<HTMLElement>;
    /** Descendentes que casam com o seletor. */
    find(selector: string): VoodooCollection;
    /** Ancestral mais proximo, incluindo o proprio elemento. */
    closest(selector: string): VoodooCollection;
    /** Elemento pai de cada item, opcionalmente filtrado. */
    parent(selector?: string): VoodooCollection;
    /** Todos os ancestrais, do mais proximo ao mais distante. */
    parents(selector?: string): VoodooCollection;
    /** Filhos diretos, opcionalmente filtrados. */
    children(selector?: string): VoodooCollection;
    /** Irmaos, sem incluir os proprios elementos. */
    siblings(selector?: string): VoodooCollection;
    /** Proximo irmao de cada elemento. */
    next(selector?: string): VoodooCollection;
    /** Irmao anterior de cada elemento. */
    prev(selector?: string): VoodooCollection;
    /** Somente o primeiro elemento. */
    first(): VoodooCollection;
    /** Somente o ultimo elemento. */
    last(): VoodooCollection;
    /** Elemento na posicao informada. Indices negativos contam do fim. */
    eq(index: number): VoodooCollection;
    /** Mantem apenas os elementos que passam no filtro. */
    filter(test: QueryFilter): VoodooCollection;
    /** Remove da colecao os elementos que passam no filtro. */
    not(test: QueryFilter): VoodooCollection;
    /** Mantem os elementos que contem o descendente informado. */
    has(target: string | Element): VoodooCollection;
    /** Verifica se ao menos um elemento casa com o filtro. */
    is(test: QueryFilter): boolean;
    /** Projeta cada elemento em um valor e devolve um array comum. */
    map<T>(fn: (el: HTMLElement, index: number) => T): T[];
    /** Percorre a colecao. Dentro da funcao, `this` e o elemento atual. */
    each(fn: (this: HTMLElement, el: HTMLElement, index: number) => unknown): this;
    /** Sem argumento devolve o array; com indice devolve um elemento. */
    get(): HTMLElement[];
    get(index: number): HTMLElement | undefined;
    /** Copia dos elementos como array comum. */
    toArray(): HTMLElement[];
    /** Junta outros elementos a colecao, sem repetir. */
    add(input: QueryInput, context?: QueryInput): VoodooCollection;
    /** Recorte da colecao, com a mesma semantica de `Array.prototype.slice`. */
    slice(start?: number, end?: number): VoodooCollection;
    /** Le o texto do primeiro elemento ou escreve em todos. */
    text(): string;
    text(value: string | number | null): this;
    /** Le o HTML interno do primeiro elemento ou escreve em todos. */
    html(): string;
    html(value: string | null): this;
    /** Le o valor do primeiro campo ou escreve em todos. */
    val(): string | string[];
    val(value: string | number | boolean | string[] | null): this;
    /** Le um atributo do primeiro elemento, ou escreve um ou varios. */
    attr(name: string): string | undefined;
    attr(name: string, value: QueryValue): this;
    attr(values: Record<string, QueryValue>): this;
    /** Remove um ou varios atributos, separados por espaco. */
    removeAttr(name: string): this;
    /** Le uma propriedade do primeiro elemento ou escreve em todos. */
    prop<T = unknown>(name: string): T | undefined;
    prop(name: string, value: unknown): this;
    /**
     * Le e escreve em `dataset`. A leitura converte JSON, numero e booleano,
     * entao `data-config='{"a":1}'` volta como objeto de verdade.
     */
    data(): Record<string, unknown>;
    data(key: string): unknown;
    data(key: string, value: unknown): this;
    data(values: Record<string, unknown>): this;
    /** Le um estilo computado ou aplica um ou varios estilos. */
    css(property: string): string;
    css(property: string, value: string | number | null): this;
    css(values: Record<string, string | number | null>): this;
    /** Largura em pixels do primeiro elemento, ou escrita em todos. */
    width(): number;
    width(value: string | number): this;
    /** Altura em pixels do primeiro elemento, ou escrita em todos. */
    height(): number;
    height(value: string | number): this;
    /** Posicao do primeiro elemento em relacao ao documento. */
    offset(): QueryPoint;
    /** Posicao do primeiro elemento em relacao ao ancestral posicionado. */
    position(): QueryPoint;
    /** Le a rolagem vertical do primeiro elemento ou escreve em todos. */
    scrollTop(): number;
    scrollTop(value: number): this;
    /** Adiciona uma ou varias classes separadas por espaco. */
    addClass(value: string): this;
    /** Remove uma ou varias classes separadas por espaco. */
    removeClass(value: string): this;
    /** Alterna classes. O segundo argumento forca ligar ou desligar. */
    toggleClass(value: string, force?: boolean): this;
    /** Verdadeiro quando algum elemento tem todas as classes informadas. */
    hasClass(value: string): boolean;
    /**
     * Base de `append`, `prepend`, `before` e `after`. Quando a colecao tem mais
     * de um elemento, cada destino recebe uma copia e o ultimo fica com o
     * original, que e o comportamento esperado por quem vem do jQuery.
     */
    private insert;
    /** Insere conteudo no fim de cada elemento. */
    append(content: QueryInput): this;
    /** Insere conteudo no inicio de cada elemento. */
    prepend(content: QueryInput): this;
    /** Insere conteudo antes de cada elemento. */
    before(content: QueryInput): this;
    /** Insere conteudo depois de cada elemento. */
    after(content: QueryInput): this;
    /** Move os elementos da colecao para dentro do destino. */
    appendTo(target: QueryInput): this;
    /** Move os elementos da colecao para o inicio do destino. */
    prependTo(target: QueryInput): this;
    /** Troca cada elemento pelo conteudo informado, desmontando o antigo. */
    replaceWith(content: QueryInput): this;
    /** Envolve cada elemento com o HTML ou elemento informado. */
    wrap(wrapper: QueryInput): this;
    /** Remove o pai de cada elemento, mantendo os filhos no lugar. */
    unwrap(): this;
    /** Remove os elementos do documento e desmonta os efeitos reativos. */
    remove(): this;
    /** Esvazia os elementos, desmontando o conteudo removido. */
    empty(): this;
    /** Copia os elementos. A copia nasce sem directives inicializadas. */
    clone(deep?: boolean): VoodooCollection;
    /**
     * Escuta eventos. Com o segundo argumento em texto, usa delegacao:
     * `on('click', '.item', fn)` continua funcionando para itens criados depois.
     */
    on(types: string, handler: QueryEventHandler, options?: AddEventListenerOptions): this;
    on(types: string, selector: string, handler: QueryEventHandler, options?: AddEventListenerOptions): this;
    /**
     * Remove escutas registradas por `on`. Sem argumentos remove todas, com tipo
     * remove as daquele evento, e com seletor ou funcao afina ainda mais.
     */
    off(types?: string, selectorOrHandler?: string | QueryEventHandler, handler?: QueryEventHandler): this;
    /** Escuta uma unica vez. Aceita delegacao igual a `on`. */
    once(types: string, handler: QueryEventHandler): this;
    once(types: string, selector: string, handler: QueryEventHandler): this;
    /**
     * Dispara um evento. Eventos nativos com metodo proprio, como `click` e
     * `focus`, usam o metodo do elemento quando nao ha `detail`.
     */
    trigger(type: string, detail?: unknown): this;
    /** Dispara um evento customizado que sobe pela arvore, no estilo componente. */
    emit(type: string, detail?: unknown): this;
    /** Mostra os elementos restaurando o display anterior. */
    show(): this;
    /** Esconde os elementos guardando o display atual. */
    hide(): this;
    /** Alterna a visibilidade. O argumento forca mostrar ou esconder. */
    toggle(force?: boolean): this;
    /** Aparecimento com fade. */
    fadeIn(duration?: number): this;
    /** Desaparecimento com fade, terminando escondido. */
    fadeOut(duration?: number): this;
    /** Recolhe a altura ate zero. */
    slideUp(duration?: number): this;
    /** Expande a altura ate o conteudo. */
    slideDown(duration?: number): this;
    /** Alterna entre recolher e expandir. */
    slideToggle(duration?: number): this;
    /** Animacao pela Web Animations API. */
    animate(keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: number | KeyframeAnimationOptions): this;
    /** Rola a pagina ate o primeiro elemento. */
    scrollIntoView(options?: boolean | ScrollIntoViewOptions): this;
    /** Serializa os campos do primeiro elemento no formato de query string. */
    serialize(): string;
    /**
     * Serializa os campos em um objeto. Nomes repetidos e nomes terminados em
     * `[]` viram array, caixas de selecao viram booleano e campos numericos viram
     * numero.
     */
    serializeObject(): Record<string, unknown>;
    /** Coloca o foco no primeiro elemento. */
    focus(options?: FocusOptions): this;
    /** Tira o foco de todos os elementos. */
    blur(): this;
    /** Seleciona o texto dos campos da colecao. */
    select(): this;
    /**
     * Inicializa as directives dos elementos da colecao, herdando o escopo do pai.
     * Com `force`, desmonta antes para reiniciar do zero.
     */
    walk(force?: boolean): this;
    /** Desmonta efeitos, escutas e componentes, mantendo os elementos no DOM. */
    destroy(): this;
}
/**
 * Cria uma colecao a partir de seletor CSS, elemento, lista de elementos,
 * string de HTML ou funcao.
 *
 * ```js
 * V.query('#lista li')          // seletor
 * V.query(document.body)        // elemento
 * V.query('<li>novo</li>')      // cria elementos
 * V.query(() => iniciar())      // equivale a V.ready
 * ```
 *
 * @param input seletor, no, lista, HTML ou funcao de inicializacao
 * @param context raiz opcional da busca, util para escopos locais
 */
declare function query(input?: QueryInput, context?: QueryInput): VoodooCollection;
/**
 * Executa a funcao quando a Voodoo considerar o documento pronto, e devolve uma
 * promessa do mesmo momento. As duas escritas valem:
 *
 * ```js
 * V.ready(() => console.log('pronto'))
 * await V.ready()
 * ```
 *
 * Quem decide a hora e o agendador da propria biblioteca, que espera o corpo
 * existir e a arvore parar de crescer. Nada aqui escuta `DOMContentLoaded`.
 */
declare function ready(fn?: ReadyCallback): Promise<void>;
/** Cria elementos a partir de uma string de HTML, sem inseri-los no documento. */
declare function fromHtml(html: string): VoodooCollection;

export { store as $, type App as A, findScope as B, type ComponentDefinition as C, type DirectiveBinding as D, fromHtml as E, getScope as F, injectStyle as G, instances as H, leave as I, magic as J, magics as K, mountComponent as L, parse as M, query as N, ready as O, PRIORITY as P, refresh as Q, type Resource as R, Scope as S, removeStore as T, rootScope as U, VoodooCollection as V, session as W, slideDown as X, slideUp as Y, start as Z, storage as _, type AppOptions as a, storeNames as a0, stringify as a1, theme as a2, toast as a3, tokenize as a4, url as a5, viewTransition as a6, walk as a7, whenElement as a8, whenReady as a9, type DirectiveHooks as b, core as c, type ResourceOptions as d, type VoodooConfig as e, type VoodooPlugin as f, VoodooRuntimeError as g, VoodooSyntaxError as h, addCleanup as i, allStores as j, allowedGlobals as k, cache as l, clearParseCache as m, config as n, cookie as o, createApp as p, createResource as q, defineComponent as r, defineDirective as s, destroy as t, ready$1 as u, ensureTokens as v, enter as w, evaluate as x, fadeIn as y, fadeOut as z };
