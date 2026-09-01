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

import { handleError, reactive, queuePostFlush, warn } from '../reactivity';
import { config, defineDirective, PRIORITY } from '../runtime/registry';
import { magic } from '../runtime/scope';
import type { Scope } from '../runtime/scope';
import { destroy, markSkipChildren, walk } from '../runtime/walker';
import { viewTransition } from '../dom/transition';
import { http } from '../http';
import { devtoolsBus } from '../devtools/bus';
import { uid } from '../utils';

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

/** Definicao de uma rota, associada a um padrao como `/usuarios/:id`. */
export interface RouteRecord {
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
export interface RouteLocation {
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
export type NavigationGuard = (
  to: RouteLocation,
  from: RouteLocation
) => boolean | string | void | Promise<boolean | string | void>;

/** Hook executado depois que a navegacao foi concluida. */
export type NavigationHook = (to: RouteLocation, from: RouteLocation) => void;

/**
 * Controle de rolagem. Devolva a posicao vertical desejada, ou `false` para
 * assumir a rolagem manualmente.
 */
export type ScrollBehavior = (
  to: RouteLocation,
  from: RouteLocation,
  saved: number | null
) => number | false | void;

export interface RouterOptions {
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

export interface NavigateOptions {
  /** Substitui a entrada atual do historico em vez de empilhar uma nova. */
  replace?: boolean;
  /** Estado extra guardado na entrada do historico. */
  state?: Record<string, unknown>;
  /** Desliga a rolagem automatica desta navegacao. */
  scroll?: boolean;
  /** Navega mesmo quando o destino e igual a rota atual. */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------

interface RouteSegment {
  type: 'static' | 'param' | 'wildcard';
  value: string;
  optional: boolean;
}

interface CompiledRoute {
  pattern: string;
  segments: RouteSegment[];
  score: number;
  record: RouteRecord;
}

interface RouterSettings {
  mode: 'history' | 'hash';
  base: string;
  beforeEach: NavigationGuard | null;
  afterEach: NavigationHook | null;
  linkActiveClass: string;
  linkExactActiveClass: string;
  transition: boolean;
  titleTemplate: string;
  scrollBehavior: ScrollBehavior | null;
}

const settings: RouterSettings = {
  mode: 'history',
  base: '/',
  beforeEach: null,
  afterEach: null,
  linkActiveClass: 'v-link-active',
  linkExactActiveClass: 'v-link-exact-active',
  transition: true,
  titleTemplate: '%s',
  scrollBehavior: null,
};

/** Chave usada para guardar a identidade da entrada no historico. */
const HISTORY_KEY = '__voodooRoute';

/** Limite de redirecionamentos encadeados, para nao travar a pagina. */
const MAX_REDIRECTS = 10;

const compiled: CompiledRoute[] = [];
const scrollPositions = new Map<string, number>();
const viewCache = new Map<string, string>();

let currentKey = 'inicial';
let listening = false;
let configured = false;

function emptyLocation(): RouteLocation {
  return {
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    name: '',
    meta: {},
    matched: null,
  };
}

/**
 * Rota atual, reativa. Qualquer expressao que leia `$route` se atualiza sozinha
 * quando a navegacao acontece.
 */
export const route: RouteLocation = reactive(emptyLocation());

// ---------------------------------------------------------------------------
// Analise e montagem de URLs
// ---------------------------------------------------------------------------

/** Normaliza o caminho: barra inicial, sem barras duplas, sem barra final. */
function normalizePath(path: string): string {
  let out = path || '/';
  if (!out.startsWith('/')) out = `/${out}`;
  out = out.replace(/\/{2,}/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!search) return out;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function stringifyQuery(query: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}

/** Separa um destino como `/posts/1?tab=x#topo` em caminho, query e hash. */
function splitTarget(target: string): {
  path: string;
  query: Record<string, string>;
  hash: string;
} {
  let rest = target || '/';
  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex > -1) {
    hash = rest.slice(hashIndex + 1);
    rest = rest.slice(0, hashIndex);
  }
  let query: Record<string, string> = {};
  const queryIndex = rest.indexOf('?');
  if (queryIndex > -1) {
    query = parseQuery(rest.slice(queryIndex + 1));
    rest = rest.slice(0, queryIndex);
  }
  return { path: normalizePath(rest), query, hash };
}

function stripBase(pathname: string): string {
  const base = settings.base.replace(/\/$/, '');
  if (!base || base === '') return pathname;
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

/** Le a URL do navegador de acordo com o modo configurado. */
function readLocation(): { path: string; query: Record<string, string>; hash: string } {
  if (typeof window === 'undefined') return { path: '/', query: {}, hash: '' };
  if (settings.mode === 'hash') {
    return splitTarget(window.location.hash.slice(1) || '/');
  }
  return {
    path: normalizePath(stripBase(window.location.pathname)),
    query: parseQuery(window.location.search),
    hash: window.location.hash.slice(1),
  };
}

function fullPathOf(path: string, query: Record<string, string>, hash: string): string {
  const qs = stringifyQuery(query);
  return `${path}${qs ? `?${qs}` : ''}${hash ? `#${hash}` : ''}`;
}

/** Monta a URL que sera escrita no historico. */
function buildUrl(location: RouteLocation): string {
  const suffix = fullPathOf(location.path, location.query, location.hash);
  if (settings.mode === 'hash') {
    const { pathname, search } = window.location;
    return `${pathname}${search}#${suffix}`;
  }
  const base = settings.base === '/' ? '' : settings.base.replace(/\/$/, '');
  return `${base}${suffix}` || '/';
}

// ---------------------------------------------------------------------------
// Compilacao e casamento de rotas
// ---------------------------------------------------------------------------

/**
 * Converte um padrao em segmentos e calcula a especificidade.
 *
 * Pesos por segmento: estatico vale mais que parametro, parametro vale mais que
 * opcional, e o curinga derruba a pontuacao para o fim da fila. Assim
 * `/usuarios/novo` sempre vence `/usuarios/:id`, e `*` so entra quando nada
 * mais casou.
 */
function compileRoute(pattern: string, record: RouteRecord): CompiledRoute {
  const clean = pattern === '*' ? '*' : normalizePath(pattern);
  const raw = clean === '*' ? ['*'] : clean.split('/').filter(Boolean);
  const segments: RouteSegment[] = [];
  let score = raw.length * 10;

  for (const piece of raw) {
    if (piece === '*' || piece === '**') {
      segments.push({ type: 'wildcard', value: '*', optional: true });
      score -= 30;
      continue;
    }
    if (piece.startsWith(':')) {
      const optional = piece.endsWith('?');
      const name = piece.slice(1, optional ? -1 : undefined);
      segments.push({ type: 'param', value: name, optional });
      score += optional ? 1 : 2;
      continue;
    }
    segments.push({ type: 'static', value: piece, optional: false });
    score += 4;
  }

  return { pattern: clean, segments, score, record };
}

/** Tenta casar um caminho com um padrao ja compilado. */
function matchSegments(
  segments: RouteSegment[],
  parts: string[]
): Record<string, string> | null {
  const params: Record<string, string> = {};
  let index = 0;

  for (const segment of segments) {
    if (segment.type === 'wildcard') {
      params['*'] = parts.slice(index).map(decodeSafe).join('/');
      return params;
    }
    if (index >= parts.length) {
      if (segment.optional) continue;
      return null;
    }
    const part = parts[index];
    if (segment.type === 'static') {
      if (decodeSafe(part) !== segment.value) return null;
      index++;
      continue;
    }
    params[segment.value] = decodeSafe(part);
    index++;
  }

  return index === parts.length ? params : null;
}

function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Procura a rota mais especifica que casa com o caminho. */
function matchRoute(path: string): { route: CompiledRoute; params: Record<string, string> } | null {
  const parts = path.split('/').filter(Boolean);
  let best: { route: CompiledRoute; params: Record<string, string> } | null = null;

  for (const candidate of compiled) {
    const params = matchSegments(candidate.segments, parts);
    if (!params) continue;
    if (!best || candidate.score > best.route.score) best = { route: candidate, params };
  }

  return best;
}

/** Devolve a definicao associada a um padrao ja casado. */
function findRecord(pattern: string | null): RouteRecord | null {
  if (!pattern) return null;
  return compiled.find((item) => item.pattern === pattern)?.record ?? null;
}

// ---------------------------------------------------------------------------
// Resolucao e aplicacao da rota
// ---------------------------------------------------------------------------

/**
 * Resolve um destino em uma rota completa, sem navegar.
 *
 * ```js
 * V.router.resolve('/usuarios/7').params.id // '7'
 * ```
 */
export function resolve(target: string): RouteLocation {
  const { path, query, hash } = splitTarget(target);
  return locationFor(path, query, hash);
}

function locationFor(
  path: string,
  query: Record<string, string>,
  hash: string
): RouteLocation {
  const found = matchRoute(path);
  return {
    path,
    fullPath: fullPathOf(path, query, hash),
    params: found ? found.params : {},
    query,
    hash,
    name: found?.route.record.name ?? '',
    meta: found?.route.record.meta ?? {},
    matched: found ? found.route.pattern : null,
  };
}

/** Copia simples da rota atual, entregue aos guards sem proxy reativo. */
function snapshot(): RouteLocation {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: { ...route.params },
    query: { ...route.query },
    hash: route.hash,
    name: route.name,
    meta: route.meta,
    matched: route.matched,
  };
}

function applyLocation(location: RouteLocation): void {
  route.path = location.path;
  route.fullPath = location.fullPath;
  route.params = location.params;
  route.query = location.query;
  route.hash = location.hash;
  route.name = location.name;
  route.meta = location.meta;
  route.matched = location.matched;

  const record = findRecord(location.matched);
  if (record?.title && typeof document !== 'undefined') {
    document.title = settings.titleTemplate.includes('%s')
      ? settings.titleTemplate.replace('%s', record.title)
      : record.title;
  }
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

async function runGuards(to: RouteLocation, from: RouteLocation): Promise<boolean | string> {
  const record = findRecord(to.matched);

  if (record?.redirect) return record.redirect;

  if (record?.beforeEnter) {
    const verdict = await record.beforeEnter(to, from);
    if (verdict === false) return false;
    if (typeof verdict === 'string') return verdict;
  }

  if (settings.beforeEach) {
    const verdict = await settings.beforeEach(to, from);
    if (verdict === false) return false;
    if (typeof verdict === 'string') return verdict;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Rolagem
// ---------------------------------------------------------------------------

function saveScroll(): void {
  if (typeof window === 'undefined') return;
  scrollPositions.set(currentKey, window.scrollY);
}

/**
 * Aplica a rolagem depois que a nova tela foi montada. Rota nova volta ao topo,
 * volta pelo historico restaura a posicao guardada e hash rola ate a ancora.
 */
function scheduleScroll(to: RouteLocation, from: RouteLocation, saved: number | null): void {
  if (typeof window === 'undefined') return;

  queuePostFlush(() => {
    requestAnimationFrame(() => {
      // Rolar para onde a pagina ja esta seria trabalho a toa.
      const moveTo = (top: number): void => {
        if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
      };

      if (settings.scrollBehavior) {
        const custom = settings.scrollBehavior(to, from, saved);
        if (custom === false) return;
        if (typeof custom === 'number') {
          moveTo(custom);
          return;
        }
      }

      if (to.hash) {
        // Nomes com caracteres estranhos quebrariam o seletor, entao o `name`
        // so e consultado quando o texto e simples.
        const anchor =
          document.getElementById(to.hash) ??
          (/^[\w-]+$/.test(to.hash) ? document.querySelector(`[name="${to.hash}"]`) : null);
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }

      moveTo(saved ?? 0);
    });
  });
}

// ---------------------------------------------------------------------------
// Navegacao
// ---------------------------------------------------------------------------

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
export async function navigate(target: string, options: NavigateOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  startListening();

  const from = snapshot();
  let destination = resolve(target);

  if (!options.force && destination.fullPath === from.fullPath) return true;

  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn(`Router: excesso de redirecionamentos ao navegar para "${target}".`);
      return false;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) {
      devtoolsBus.emit('navigation', {
        from: from.fullPath,
        to: destination.fullPath,
        cancelled: true,
        matched: destination.matched,
      });
      return false;
    }
    if (typeof verdict === 'string') {
      destination = resolve(verdict);
      continue;
    }
    break;
  }

  saveScroll();

  const key = uid('rota');
  const historyState = { ...(options.state ?? {}), [HISTORY_KEY]: key };
  const url = buildUrl(destination);
  if (options.replace) window.history.replaceState(historyState, '', url);
  else window.history.pushState(historyState, '', url);
  currentKey = key;

  applyLocation(destination);
  if (options.scroll !== false) scheduleScroll(destination, from, null);

  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit('navigation', {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched,
  });
  return true;
}

/** Trata `popstate` e `hashchange`, ou seja, os botoes de voltar e avancar. */
async function onHistoryChange(event: PopStateEvent | HashChangeEvent): Promise<void> {
  const { path, query, hash } = readLocation();
  const destination = locationFor(path, query, hash);
  const from = snapshot();
  if (destination.fullPath === from.fullPath) return;

  const verdict = await runGuards(destination, from);
  if (verdict === false) {
    // Guard recusou: devolve a URL anterior sem criar entrada nova.
    window.history.replaceState(
      { [HISTORY_KEY]: currentKey },
      '',
      buildUrl(from)
    );
    devtoolsBus.emit('navigation', {
      from: from.fullPath,
      to: destination.fullPath,
      cancelled: true,
      matched: destination.matched,
    });
    return;
  }
  if (typeof verdict === 'string') {
    void navigate(verdict, { replace: true });
    return;
  }

  saveScroll();
  const state = (event as PopStateEvent).state as Record<string, unknown> | null;
  const key = (state && (state[HISTORY_KEY] as string)) || uid('rota');
  currentKey = key;

  applyLocation(destination);
  scheduleScroll(destination, from, scrollPositions.get(key) ?? 0);
  settings.afterEach?.(snapshot(), from);
  devtoolsBus.emit('navigation', {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched,
  });
}

function historyListener(event: PopStateEvent | HashChangeEvent): void {
  void onHistoryChange(event);
}

/** Liga os ouvintes do historico uma unica vez. */
function startListening(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

  window.addEventListener('popstate', historyListener);
  if (settings.mode === 'hash') window.addEventListener('hashchange', historyListener);
  window.addEventListener('beforeunload', saveScroll);
}

/** Desliga os ouvintes do historico. Util em testes e ao trocar de app. */
export function stopRouter(): void {
  if (!listening || typeof window === 'undefined') return;
  listening = false;
  window.removeEventListener('popstate', historyListener);
  window.removeEventListener('hashchange', historyListener);
  window.removeEventListener('beforeunload', saveScroll);
}

/** Aplica a rota da URL atual, executando os guards da entrada inicial. */
async function enterInitialRoute(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { path, query, hash } = readLocation();
  const from = snapshot();
  let destination = locationFor(path, query, hash);

  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn('Router: excesso de redirecionamentos na rota inicial.');
      return;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) return;
    if (typeof verdict === 'string') {
      destination = resolve(verdict);
      continue;
    }
    break;
  }

  currentKey = uid('rota');
  window.history.replaceState({ [HISTORY_KEY]: currentKey }, '', buildUrl(destination));
  applyLocation(destination);
  if (destination.hash) scheduleScroll(destination, from, null);
  settings.afterEach?.(snapshot(), from);
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/** Registra ou substitui uma rota depois da configuracao inicial. */
export function addRoute(pattern: string, record: RouteRecord): void {
  const compiledRoute = compileRoute(pattern, record);
  const index = compiled.findIndex((item) => item.pattern === compiledRoute.pattern);
  if (index > -1) compiled.splice(index, 1, compiledRoute);
  else compiled.push(compiledRoute);
}

/** Remove uma rota pelo padrao. */
export function removeRoute(pattern: string): void {
  const clean = pattern === '*' ? '*' : normalizePath(pattern);
  const index = compiled.findIndex((item) => item.pattern === clean);
  if (index > -1) compiled.splice(index, 1);
}

/** Lista os padroes registrados, do mais especifico para o menos especifico. */
export function routePatterns(): string[] {
  return [...compiled].sort((a, b) => b.score - a.score).map((item) => item.pattern);
}

/** Limpa o cache de HTML remoto usado pelas rotas com `view`. */
export function clearViewCache(url?: string): void {
  if (url) viewCache.delete(url);
  else viewCache.clear();
}

function configureRouter(options: RouterOptions): RouterApi {
  settings.mode = options.mode ?? 'history';
  settings.base = normalizePath(options.base ?? '/');
  settings.beforeEach = options.beforeEach ?? null;
  settings.afterEach = options.afterEach ?? null;
  settings.linkActiveClass = options.linkActiveClass ?? 'v-link-active';
  settings.linkExactActiveClass = options.linkExactActiveClass ?? 'v-link-exact-active';
  settings.transition = options.transition ?? true;
  settings.titleTemplate = options.titleTemplate ?? '%s';
  settings.scrollBehavior = options.scrollBehavior ?? null;

  compiled.length = 0;
  for (const [pattern, record] of Object.entries(options.routes ?? {})) {
    compiled.push(compileRoute(pattern, record));
  }

  configured = true;
  startListening();
  void enterInitialRoute();
  return router;
}

export interface RouterApi {
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
/**
 * Os membros entram por `defineProperties`, e nao por `Object.assign`, porque
 * `Object.assign` le cada getter uma unica vez e copia o valor. Com ele
 * `V.router.ready` ficava preso no `false` do carregamento do modulo e nunca
 * mudava, mesmo depois de `V.router({...})`. E a mesma armadilha que o modulo
 * de i18n ja documenta.
 */
const membrosDoRouter = {
  get current(): RouteLocation {
    return route;
  },
  push: (target: string, options: NavigateOptions = {}) => navigate(target, options),
  replace: (target: string, options: NavigateOptions = {}) =>
    navigate(target, { ...options, replace: true }),
  navigate,
  back: (): void => {
    if (typeof window !== 'undefined') window.history.back();
  },
  forward: (): void => {
    if (typeof window !== 'undefined') window.history.forward();
  },
  go: (delta: number): void => {
    if (typeof window !== 'undefined') window.history.go(delta);
  },
  resolve,
  addRoute,
  removeRoute,
  patterns: routePatterns,
  stop: stopRouter,
  clearViewCache,
  get ready(): boolean {
    return configured;
  },
};

export const router: RouterApi = Object.defineProperties(
  configureRouter,
  Object.getOwnPropertyDescriptors(membrosDoRouter)
) as unknown as RouterApi;

// ---------------------------------------------------------------------------
// Variaveis magicas
// ---------------------------------------------------------------------------

magic('$route', () => route);
magic('$router', () => router);

// ---------------------------------------------------------------------------
// v-router-view
// ---------------------------------------------------------------------------

/** Carrega e memoriza o HTML de uma rota declarada com `view`. */
async function loadView(url: string): Promise<string> {
  const cached = viewCache.get(url);
  if (cached !== undefined) return cached;
  const html = await http.get<string>(url, { responseType: 'text' });
  const text = typeof html === 'string' ? html : String(html ?? '');
  viewCache.set(url, text);
  return text;
}

/** Assinatura dos parametros, usada para detectar troca de `/usuarios/:id`. */
function paramsSignature(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join('&');
}

/**
 * `v-router-view` renderiza a rota atual.
 *
 * Rota com `component` monta o componente registrado. Rota com `view` busca o
 * HTML remoto e o insere ja com as directives ligadas. O conteudo original do
 * elemento fica guardado e volta quando nenhuma rota casa.
 *
 * ```html
 * <main v-router-view>Carregando...</main>
 * <main v-router-view.no-transition></main>
 * ```
 */
defineDirective(
  'router-view',
  ({ el, scope, modifiers, effect, cleanup }) => {
    markSkipChildren(el);

    const fallbackHtml = el.innerHTML;
    const useTransition = settings.transition && !modifiers['no-transition'];
    let token = 0;

    const unmount = (): void => {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = '';
    };

    const mount = (record: RouteRecord | null, html: string | null): void => {
      unmount();
      if (record?.component) {
        const host = document.createElement('div');
        host.setAttribute(`${config.prefix}component`, record.component);
        host.className = 'v-router-page';
        el.appendChild(host);
        walk(host, scope as Scope);
        return;
      }
      el.innerHTML = html ?? fallbackHtml;
      for (const child of Array.from(el.childNodes)) walk(child, scope as Scope);
    };

    const render = async (record: RouteRecord | null, current: number): Promise<void> => {
      let html: string | null = null;

      if (record?.view) {
        el.classList.add('v-router-loading');
        try {
          html = await loadView(record.view);
        } catch (err) {
          handleError(err, `v-router-view ao carregar "${record.view}"`);
          html = '';
        } finally {
          el.classList.remove('v-router-loading');
        }
        if (current !== token) return;
      }

      if (useTransition) viewTransition(() => mount(record, html));
      else mount(record, html);
    };

    effect(() => {
      // Le a rota casada e os parametros para reagir as duas mudancas.
      const matched = route.matched;
      void paramsSignature(route.params);
      const record = findRecord(matched);
      void render(record, ++token);
    });

    cleanup(() => {
      token++;
      unmount();
    });
  },
  { priority: PRIORITY.DEFAULT }
);

// ---------------------------------------------------------------------------
// v-link
// ---------------------------------------------------------------------------

const EXTERNAL_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

/** Decide se um href deve ficar com o comportamento nativo do navegador. */
function isExternalHref(href: string): boolean {
  if (!href) return true;
  if (href.startsWith('//')) return true;
  if (EXTERNAL_PROTOCOL.test(href)) return true;
  return false;
}

/** Le o destino declarado em `v-link`, aceitando href, texto ou expressao. */
function linkTarget(el: HTMLElement, expression: string, evaluate: <T>(e?: string) => T): string {
  const raw = expression.trim();
  if (raw) {
    // Caminho literal como `/sobre` nao e uma expressao valida, entao vale como texto.
    if (raw.startsWith('/') || raw.startsWith('#')) return raw;
    const value = evaluate<unknown>(raw);
    if (typeof value === 'string' && value) return value;
    return raw;
  }
  const href = el.getAttribute('href') ?? '';
  if (settings.mode === 'hash' && href.startsWith('#')) return href.slice(1) || '/';
  return href;
}

/** `true` quando a rota atual esta dentro do destino informado. */
function isActivePath(target: string, exact: boolean): boolean {
  const { path } = splitTarget(target);
  // A raiz so fica ativa nela mesma, senao ficaria ativa em todas as telas.
  if (path === '/' || exact) return route.path === path;
  return route.path === path || route.path.startsWith(`${path}/`);
}

/**
 * `v-link` transforma qualquer `<a href>` em navegacao interna.
 *
 * Cliques com ctrl, cmd, shift ou alt, cliques que nao sejam com o botao
 * principal, links com `target`, com `download`, com `rel="external"` e links
 * para outro dominio continuam com o comportamento nativo.
 *
 * ```html
 * <a v-link href="/usuarios">Usuarios</a>
 * <a v-link="'/usuarios/' + user.id">Detalhe</a>
 * <a v-link.replace href="/login">Entrar</a>
 * ```
 */
defineDirective('link', ({ el, expression, modifiers, effect, cleanup, evaluate }) => {
  const anchor = el as HTMLAnchorElement;

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === 'number' && event.button !== 0) return;

    const target = anchor.getAttribute('target');
    if (target && target !== '_self') return;
    if (anchor.hasAttribute('download')) return;
    if ((anchor.getAttribute('rel') ?? '').split(/\s+/).includes('external')) return;

    const destination = linkTarget(el, expression, evaluate);
    if (!destination) return;
    if (isExternalHref(destination)) return;
    if (settings.mode !== 'hash' && destination.startsWith('#')) return;

    event.preventDefault();
    void navigate(destination, {
      replace: !!modifiers.replace,
      scroll: modifiers['no-scroll'] ? false : undefined,
    });
  };

  el.addEventListener('click', onClick);
  cleanup(() => el.removeEventListener('click', onClick));

  effect(() => {
    const destination = linkTarget(el, expression, evaluate);
    if (!destination || isExternalHref(destination)) return;

    const exact = isActivePath(destination, true);
    const active = exact || isActivePath(destination, false);

    el.classList.toggle(settings.linkActiveClass, active);
    el.classList.toggle(settings.linkExactActiveClass, exact);
    if (exact) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
});

// ---------------------------------------------------------------------------
// v-route-active
// ---------------------------------------------------------------------------

/**
 * `v-route-active` aplica uma classe quando a rota atual casa com o caminho.
 *
 * ```html
 * <li v-route-active="/usuarios">Usuarios</li>
 * <li v-route-active:destaque.exact="/">Inicio</li>
 * ```
 */
defineDirective('route-active', ({ el, expression, arg, modifiers, effect, evaluate }) => {
  const className = arg || 'active';

  effect(() => {
    const raw = expression.trim();
    const target =
      raw.startsWith('/') || !raw ? raw : (evaluate<string>(raw) ?? raw);
    const active = target ? isActivePath(String(target), !!modifiers.exact) : false;
    el.classList.toggle(className, active);
  });
});
