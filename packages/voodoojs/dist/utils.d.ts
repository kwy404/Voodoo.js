/**
 * @module utils
 *
 * Utilitarios puros. Nenhum deles toca no DOM, entao o modulo roda igual em
 * navegador, Node, Bun e Deno. Tudo aqui e tree shakeable.
 */
/** UUID v4. Usa `crypto.randomUUID` quando disponivel. */
declare function uuid(): string;
/** Identificador curto, util para ids de elementos. */
declare function uid(prefix?: string): string;
/** Pausa a execucao. `await V.sleep(500)`. */
declare function sleep(ms: number): Promise<void>;
/**
 * Converte `"300"`, `"300ms"`, `"1.5s"` e `"2m"` em milissegundos.
 * Aceita `null` porque a origem mais comum e `getAttribute`, que devolve null.
 */
declare function parseDuration(value: string | number | null | undefined, fallback?: number): number;
interface DebouncedFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
}
/**
 * Adia a execucao ate parar de ser chamada por `wait` ms.
 *
 * ```js
 * const buscar = V.debounce(fetchProdutos, 300)
 * ```
 */
declare function debounce<T extends (...args: any[]) => any>(fn: T, wait?: number, immediate?: boolean): DebouncedFunction<T>;
/** Limita a no maximo uma execucao a cada `wait` ms. */
declare function throttle<T extends (...args: any[]) => any>(fn: T, wait?: number): DebouncedFunction<T>;
/** Executa a funcao uma unica vez e memoriza o retorno. */
declare function once<T extends (...args: any[]) => any>(fn: T): T;
/** Cache de resultado por argumento. */
declare function memoize<T extends (...args: any[]) => any>(fn: T, keyFn?: (...args: Parameters<T>) => string): T & {
    cache: Map<string, ReturnType<T>>;
};
/** Copia profunda. Usa `structuredClone` quando existir. */
declare function clone<T>(value: T): T;
/** Mescla objetos em profundidade. Arrays sao substituidos, nao concatenados. */
declare function merge<T extends Record<string, any>>(target: T, ...sources: Array<Partial<T>>): T;
/** Agrupa por chave ou por funcao. */
declare function groupBy<T>(list: T[], key: string | ((item: T) => string | number)): Record<string, T[]>;
/** Remove duplicados. Aceita chave para objetos. */
declare function unique<T>(list: T[], key?: string | ((item: T) => unknown)): T[];
/** Divide em blocos de tamanho fixo. */
declare function chunk<T>(list: T[], size?: number): T[][];
/** Ordena por chave sem alterar o array original. */
declare function sortBy<T>(list: T[], key: string | ((item: T) => any), direction?: 'asc' | 'desc'): T[];
/** Le um caminho aninhado com seguranca: `get(obj, 'a.b.0.c')`. */
declare function get<T = unknown>(object: unknown, path: string, fallback?: T): T | undefined;
/** Escreve em um caminho aninhado, criando os objetos do meio. */
declare function set(object: Record<string, any>, path: string, value: unknown): void;
/** Numero aleatorio inteiro entre min e max, inclusive. */
declare function random(min?: number, max?: number): number;
/** Sorteia um item de uma lista. */
declare function sample<T>(list: T[]): T | undefined;
/** Converte texto em slug de URL, removendo acentos. */
declare function slugify(text: string, separator?: string): string;
/** Corta o texto respeitando o limite e adiciona reticencias. */
declare function truncate(text: string, length?: number, suffix?: string): string;
/** Primeira letra maiuscula. */
declare function capitalize(text: string): string;
/** Primeira letra de cada palavra em maiuscula. */
declare function titleCase(text: string): string;
/** Escapa caracteres perigosos para interpolar texto em HTML. */
declare function escapeHtml(text: string): string;
/** Remove todas as tags de um HTML, deixando somente o texto. */
declare function stripTags(html: string): string;
interface FormatOptions {
    locale?: string;
    currency?: string;
}
/** Define o locale e a moeda usados pelos formatadores. */
declare function setFormatDefaults(locale?: string, currency?: string): void;
/** Formata como moeda: `formatCurrency(1234.5)` devolve `R$ 1.234,50`. */
declare function formatCurrency(value: number | string, options?: FormatOptions): string;
/** Formata numero com separadores locais. */
declare function formatNumber(value: number | string, options?: Intl.NumberFormatOptions & FormatOptions): string;
/** Formata datas aceitando Date, timestamp ou string ISO. */
declare function formatDate(value: Date | string | number, format?: string | Intl.DateTimeFormatOptions, locale?: string): string;
/** Tempo relativo legivel: `ha 5 minutos`, `em 2 dias`. */
declare function relativeTime(value: Date | string | number, locale?: string): string;
/** Tamanho de arquivo legivel: `1.4 MB`. */
declare function formatFileSize(bytes: number, decimals?: number): string;
/** Percentual formatado. */
declare function formatPercent(value: number, decimals?: number, locale?: string): string;
/** `true` quando existe DOM disponivel. */
declare const isBrowser: boolean;
/**
 * Consulta uma media query com seguranca.
 *
 * `matchMedia` nao existe em todo lugar: falta no jsdom e em webviews antigas.
 * Sem esta guarda, ler `device.reducedMotion` lancava TypeError, e como as
 * directives de interface leem essa propriedade no meio de abrir e fechar
 * paineis, a excecao interrompia o metodo e deixava `aria-expanded` e o foco
 * no estado errado.
 */
declare function matchesMedia(query: string): boolean;
/** Informacoes do dispositivo, calculadas sob demanda. */
declare const device: {
    readonly touch: boolean;
    readonly mobile: boolean;
    readonly tablet: boolean;
    readonly desktop: boolean;
    readonly online: boolean;
    readonly reducedMotion: boolean;
    readonly darkMode: boolean;
};

export { type DebouncedFunction, type FormatOptions, capitalize, chunk, clone, debounce, device, escapeHtml, formatCurrency, formatDate, formatFileSize, formatNumber, formatPercent, get, groupBy, isBrowser, matchesMedia, memoize, merge, once, parseDuration, random, relativeTime, sample, set, setFormatDefaults, sleep, slugify, sortBy, stripTags, throttle, titleCase, truncate, uid, unique, uuid };
