import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick, reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { defineComponent } from '../src/runtime/component';
// The `core` injects the component mounter into the walker: without it
// `v-component` does not render, and `v-router-view` mounts an empty shell.
import '../src/core';
import {
  addRoute,
  clearViewCache,
  navigate,
  removeRoute,
  resolve,
  route,
  router,
  routePatterns,
  stopRouter,
  type NavigationGuard,
  type RouteRecord,
} from '../src/router';

/**
 * Coverage of the router, which had no dedicated test at all.
 *
 * The module state is global on purpose (there is one router per page), so
 * every test reconfigures everything from scratch with `configurar()` and puts
 * the URL back at the end. `popstate` is dispatched by hand, because jsdom does
 * not propagate the real history traversal synchronously.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lets the microtasks, the post-flush and the requestAnimationFrame finish. */
async function assentar(): Promise<void> {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
}

interface OpcoesTeste {
  url?: string;
  routes: Record<string, RouteRecord>;
  mode?: 'history' | 'hash';
  base?: string;
  beforeEach?: NavigationGuard;
  afterEach?: (to: unknown, from: unknown) => void;
  titleTemplate?: string;
  transition?: boolean;
  linkActiveClass?: string;
  linkExactActiveClass?: string;
  scrollBehavior?: (to: unknown, from: unknown, saved: number | null) => number | false | void;
}

/** Configures the router from a URL and waits for the initial route to land. */
async function configurar(opcoes: OpcoesTeste): Promise<void> {
  window.history.replaceState(null, '', opcoes.url ?? '/');
  router(opcoes as never);
  await assentar();
}

/** Fires popstate the way the browser would when going back to a URL. */
async function voltarPara(url: string, state: Record<string, unknown> | null = null): Promise<void> {
  window.history.replaceState(state, '', url);
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  await assentar();
}

/**
 * Roots mounted in the test. Clearing `document.body` is not enough: the effects
 * of the directives stay alive and keep reacting to `route`, and a
 * `v-router-view` from an earlier test would go and fetch HTML again in the
 * next one.
 */
const montadas: HTMLElement[] = [];

function montar(html: string, dados: Record<string, unknown> = {}): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  walk(raiz, new Scope(reactive(dados)));
  montadas.push(raiz);
  return raiz;
}

let rolarPara: ReturnType<typeof vi.fn>;
let posicao: number;

beforeEach(() => {
  for (const raiz of montadas.splice(0)) destroy(raiz);
  document.body.innerHTML = '';
  posicao = 0;
  rolarPara = vi.fn((_x: number, y: number) => {
    posicao = y;
  });
  // jsdom implements no scrolling: without the double every navigation would
  // print an error.
  window.scrollTo = rolarPara as unknown as typeof window.scrollTo;
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => posicao);
});

afterEach(() => {
  stopRouter();
  clearViewCache();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

// ---------------------------------------------------------------------------
// Route matching
// ---------------------------------------------------------------------------

describe('route matching', () => {
  beforeEach(async () => {
    await configurar({
      routes: {
        '/': { component: 'home', name: 'inicio' },
        '/usuarios': { component: 'lista' },
        '/usuarios/novo': { component: 'novo' },
        '/usuarios/:id': { component: 'detalhe', name: 'usuario', meta: { privado: true } },
        '/posts/:slug?': { component: 'post' },
        '/arquivos/*': { component: 'arquivo' },
        '*': { component: 'nao-encontrado', name: '404' },
      },
    });
  });

  it('extracts params from the pattern', () => {
    const destino = resolve('/usuarios/42');
    expect(destino.matched).toBe('/usuarios/:id');
    expect(destino.params).toEqual({ id: '42' });
    expect(destino.name).toBe('usuario');
    expect(destino.meta).toEqual({ privado: true });
  });

  it('a static segment beats a parameter, even when declared after it', () => {
    expect(resolve('/usuarios/novo').matched).toBe('/usuarios/novo');
    expect(resolve('/usuarios/outra').matched).toBe('/usuarios/:id');
  });

  it('an optional parameter matches with and without the segment', () => {
    expect(resolve('/posts').matched).toBe('/posts/:slug?');
    expect(resolve('/posts').params).toEqual({});
    expect(resolve('/posts/ola-mundo').params).toEqual({ slug: 'ola-mundo' });
  });

  it('the wildcard captures the rest of the path', () => {
    const destino = resolve('/arquivos/fotos/2024/a.png');
    expect(destino.matched).toBe('/arquivos/*');
    expect(destino.params['*']).toBe('fotos/2024/a.png');
    expect(resolve('/arquivos').params['*']).toBe('');
  });

  it('whatever matches nothing falls into the lone wildcard', () => {
    const destino = resolve('/pagina/que/nao/existe');
    expect(destino.matched).toBe('*');
    expect(destino.name).toBe('404');
  });

  it('with no wildcard at all, the target ends up with no matched route', async () => {
    await configurar({ routes: { '/': { component: 'home' } } });
    const destino = resolve('/nada');
    expect(destino.matched).toBeNull();
    expect(destino.name).toBe('');
    expect(destino.meta).toEqual({});
  });

  it('splits query and hash apart and rebuilds the fullPath', () => {
    const destino = resolve('/usuarios/7?aba=dados&ordem=nome#topo');
    expect(destino.path).toBe('/usuarios/7');
    expect(destino.query).toEqual({ aba: 'dados', ordem: 'nome' });
    expect(destino.hash).toBe('topo');
    expect(destino.fullPath).toBe('/usuarios/7?aba=dados&ordem=nome#topo');
  });

  it('normalizes leftover slashes and a path with no leading slash', () => {
    expect(resolve('usuarios//7/').path).toBe('/usuarios/7');
    expect(resolve('').path).toBe('/');
    expect(resolve('/').path).toBe('/');
  });

  it('params come decoded, and an invalid sequence stays as it is', () => {
    expect(resolve('/usuarios/ana%20maria').params.id).toBe('ana maria');
    expect(resolve('/usuarios/100%').params.id).toBe('100%');
  });

  it('a path longer than the pattern does not match', () => {
    expect(resolve('/usuarios/7/extra').matched).toBe('*');
  });

  it('routePatterns lists from the most specific to the least', () => {
    const padroes = routePatterns();
    expect(padroes[padroes.length - 1]).toBe('*');
    expect(padroes.indexOf('/usuarios/novo')).toBeLessThan(padroes.indexOf('/usuarios/:id'));
  });
});

// ---------------------------------------------------------------------------
// addRoute and removeRoute
// ---------------------------------------------------------------------------

describe('addRoute and removeRoute', () => {
  beforeEach(async () => {
    await configurar({ routes: { '/': { component: 'home' } } });
  });

  it('addRoute registers and replaces under the same pattern', () => {
    addRoute('/sobre', { component: 'sobre', name: 'a' });
    expect(resolve('/sobre').name).toBe('a');

    addRoute('/sobre', { component: 'sobre', name: 'b' });
    expect(resolve('/sobre').name).toBe('b');
    expect(routePatterns().filter((p) => p === '/sobre')).toHaveLength(1);
  });

  it('removeRoute drops the pattern, accepting a non normalized form', () => {
    addRoute('/sobre', { component: 'sobre' });
    removeRoute('sobre//');
    expect(resolve('/sobre').matched).toBeNull();

    // Removing what does not exist changes nothing.
    removeRoute('/nunca-existiu');
    expect(routePatterns()).toEqual(['/']);
  });

  it('the wildcard can be registered and removed too', () => {
    addRoute('*', { component: 'nf' });
    expect(resolve('/qualquer').matched).toBe('*');
    removeRoute('*');
    expect(resolve('/qualquer').matched).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Navigation in history mode
// ---------------------------------------------------------------------------

describe('navigation in history mode', () => {
  beforeEach(async () => {
    await configurar({
      routes: {
        '/': { component: 'home', title: 'Inicio' },
        '/usuarios': { component: 'lista' },
        '/usuarios/:id': { component: 'detalhe', title: 'Usuario' },
      },
      titleTemplate: '%s | Voodoo',
    });
  });

  it('the initial route is applied and the title follows the template', () => {
    expect(route.path).toBe('/');
    expect(route.matched).toBe('/');
    expect(document.title).toBe('Inicio | Voodoo');
  });

  it('push changes the URL and the route, and pushes onto the history', async () => {
    expect(await router.push('/usuarios/7?aba=dados')).toBe(true);
    expect(route.path).toBe('/usuarios/7');
    expect(route.params).toEqual({ id: '7' });
    expect(route.query).toEqual({ aba: 'dados' });
    expect(window.location.pathname).toBe('/usuarios/7');
    expect(window.location.search).toBe('?aba=dados');
    expect(document.title).toBe('Usuario | Voodoo');
  });

  it('replace swaps the entry instead of pushing', async () => {
    const substituir = vi.spyOn(window.history, 'replaceState');
    const empilhar = vi.spyOn(window.history, 'pushState');

    await router.replace('/usuarios');
    expect(substituir).toHaveBeenCalled();
    expect(empilhar).not.toHaveBeenCalled();
  });

  it('navigating to the current route does nothing, unless force is given', async () => {
    const empilhar = vi.spyOn(window.history, 'pushState');
    expect(await router.push('/')).toBe(true);
    expect(empilhar).not.toHaveBeenCalled();

    expect(await router.push('/', { force: true })).toBe(true);
    expect(empilhar).toHaveBeenCalledTimes(1);
  });

  it('the extra state travels along in the history entry', async () => {
    await router.push('/usuarios', { state: { origem: 'menu' } });
    expect(window.history.state.origem).toBe('menu');
    expect(window.history.state.__voodooRoute).toBeTruthy();
  });

  it('a titleTemplate with no %s uses the plain title', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x', title: 'Pagina X' } },
      titleTemplate: 'fixo',
    });
    await router.push('/x');
    expect(document.title).toBe('Pagina X');
  });

  it('back, forward and go only hand off to the history', () => {
    const voltar = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const avancar = vi.spyOn(window.history, 'forward').mockImplementation(() => undefined);
    const ir = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);

    router.back();
    router.forward();
    router.go(-2);

    expect(voltar).toHaveBeenCalled();
    expect(avancar).toHaveBeenCalled();
    expect(ir).toHaveBeenCalledWith(-2);
  });

  /**
   * Regression: the API was built with `Object.assign`, which reads each getter
   * exactly once and copies the value. That made `V.router.ready` come up
   * `false` at module load and stay `false` forever, even after
   * `V.router({...})`.
   */
  it('router.ready turns true after the configuration', () => {
    expect(router.ready).toBe(true);
    expect(router.current).toBe(route);
  });
});

describe('base in history mode', () => {
  it('the prefix goes into the URL and comes back out of the route path', async () => {
    await configurar({
      url: '/app/usuarios',
      base: '/app',
      routes: { '/': { component: 'h' }, '/usuarios': { component: 'l' } },
    });

    expect(route.path).toBe('/usuarios');
    expect(window.location.pathname).toBe('/app/usuarios');

    await router.push('/');
    // The application root becomes `/app/`, and `stripBase` reads it back as `/`.
    expect(window.location.pathname).toBe('/app/');
    expect(route.path).toBe('/');
  });

  it('a URL outside the prefix stays as it is', async () => {
    await configurar({
      url: '/outro/lugar',
      base: '/app',
      routes: { '*': { component: 'nf' } },
    });
    expect(route.path).toBe('/outro/lugar');
  });
});

// ---------------------------------------------------------------------------
// Hash mode
// ---------------------------------------------------------------------------

describe('hash mode', () => {
  beforeEach(async () => {
    await configurar({
      url: '/pagina.html#/usuarios/9?aba=x',
      mode: 'hash',
      routes: {
        '/': { component: 'home' },
        '/usuarios/:id': { component: 'detalhe' },
        '/sobre': { component: 'sobre' },
      },
    });
  });

  it('reads the route after the # on entry', () => {
    expect(route.path).toBe('/usuarios/9');
    expect(route.params).toEqual({ id: '9' });
    expect(route.query).toEqual({ aba: 'x' });
  });

  it('with nothing after the # the route is the root', async () => {
    await configurar({ url: '/pagina.html', mode: 'hash', routes: { '/': { component: 'h' } } });
    expect(route.path).toBe('/');
  });

  it('navigating writes the target after the #, preserving the file path', async () => {
    await router.push('/sobre');
    expect(window.location.hash).toBe('#/sobre');
    expect(window.location.pathname).toBe('/pagina.html');
    expect(route.path).toBe('/sobre');
  });

  it('hashchange is handled as a navigation', async () => {
    window.history.replaceState(null, '', '/pagina.html#/sobre');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await assentar();
    expect(route.path).toBe('/sobre');
  });
});

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

describe('guards', () => {
  it('a synchronous beforeEach receives target and origin', async () => {
    const visto: Array<[string, string]> = [];
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      beforeEach: (to, from) => {
        visto.push([to.path, from.path]);
        return true;
      },
    });

    await router.push('/x');
    expect(visto[visto.length - 1]).toEqual(['/x', '/']);
  });

  it('an asynchronous beforeEach is awaited', async () => {
    const ordem: string[] = [];
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      beforeEach: async () => {
        await new Promise((r) => setTimeout(r, 5));
        ordem.push('guard');
        return true;
      },
    });

    await router.push('/x');
    ordem.push('depois');
    expect(ordem).toEqual(['guard', 'guard', 'depois']);
    expect(route.path).toBe('/x');
  });

  it('a guard that returns false cancels the navigation and leaves the URL alone', async () => {
    let liberar = true;
    await configurar({
      routes: { '/': { component: 'h' }, '/privado': { component: 'p' } },
      beforeEach: () => liberar,
    });

    liberar = false;
    expect(await router.push('/privado')).toBe(false);
    expect(route.path).toBe('/');
    expect(window.location.pathname).toBe('/');
  });

  it('a guard that returns a string redirects', async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/privado': { component: 'p' },
        '/login': { component: 'l' },
      },
      beforeEach: (to) => (to.path === '/privado' ? '/login' : true),
    });

    expect(await router.push('/privado')).toBe(true);
    expect(route.path).toBe('/login');
    expect(window.location.pathname).toBe('/login');
  });

  it('the beforeEnter of the route runs before the global one and can cancel', async () => {
    const ordem: string[] = [];
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/x': {
          component: 'x',
          beforeEnter: () => {
            ordem.push('rota');
            return false;
          },
        },
      },
      beforeEach: () => {
        ordem.push('global');
        return true;
      },
    });

    ordem.length = 0;
    expect(await router.push('/x')).toBe(false);
    expect(ordem).toEqual(['rota']);
  });

  it('beforeEnter can redirect too', async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/velho': { component: 'v', beforeEnter: () => '/novo' },
        '/novo': { component: 'n' },
      },
    });
    await router.push('/velho');
    expect(route.path).toBe('/novo');
  });

  it('an asynchronous beforeEnter that allows it lets the navigation through', async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/x': {
          component: 'x',
          beforeEnter: async () => {
            await new Promise((r) => setTimeout(r, 5));
          },
        },
      },
    });
    expect(await router.push('/x')).toBe(true);
    expect(route.path).toBe('/x');
  });

  it('a guard that cancels the initial route leaves the route as it was', async () => {
    await configurar({ routes: { '/': { component: 'h' } } });
    const antes = route.path;

    await configurar({
      url: '/bloqueado',
      routes: { '/': { component: 'h' }, '/bloqueado': { component: 'b' } },
      beforeEach: () => false,
    });
    expect(route.path).toBe(antes);
    expect(route.matched).not.toBe('/bloqueado');
  });

  it('afterEach runs after the navigation is complete', async () => {
    const chamadas: Array<[string, string]> = [];
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      afterEach: (to, from) => {
        chamadas.push([(to as { path: string }).path, (from as { path: string }).path]);
      },
    });

    await router.push('/x');
    expect(chamadas[chamadas.length - 1]).toEqual(['/x', '/']);
  });
});

describe('redirect declared on the route', () => {
  it('takes you to the target without going through the origin route', async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/antigo': { redirect: '/novo' },
        '/novo': { component: 'n', name: 'novo' },
      },
    });

    expect(await router.push('/antigo')).toBe(true);
    expect(route.path).toBe('/novo');
    expect(route.name).toBe('novo');
    expect(window.location.pathname).toBe('/novo');
  });

  it('redirect holds on the initial route too', async () => {
    await configurar({
      url: '/antigo',
      routes: { '/antigo': { redirect: '/novo' }, '/novo': { component: 'n' } },
    });
    expect(route.path).toBe('/novo');
  });

  it('a redirect cycle stops and warns instead of hanging', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/a': { redirect: '/b' },
        '/b': { redirect: '/a' },
      },
    });

    expect(await router.push('/a')).toBe(false);
    expect(String(aviso.mock.calls.at(-1)?.[0])).toContain('too many redirects');
  });

  it('a cycle on the initial route is broken too', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await configurar({
      url: '/a',
      routes: { '/a': { redirect: '/b' }, '/b': { redirect: '/a' } },
    });
    expect(String(aviso.mock.calls.at(-1)?.[0])).toContain('initial route');
  });
});

// ---------------------------------------------------------------------------
// Back and forward
// ---------------------------------------------------------------------------

describe('popstate', () => {
  it('going back applies the route of the previous URL', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
    });
    await router.push('/x');
    expect(route.path).toBe('/x');

    await voltarPara('/', { __voodooRoute: 'inicial' });
    expect(route.path).toBe('/');
  });

  it('a popstate to the same route does nothing', async () => {
    const chamadas: string[] = [];
    await configurar({
      routes: { '/': { component: 'h' } },
      afterEach: (to) => chamadas.push((to as { path: string }).path),
    });

    chamadas.length = 0;
    await voltarPara('/');
    expect(chamadas).toEqual([]);
  });

  it('a guard that refuses puts the previous URL back without creating a new entry', async () => {
    let liberar = true;
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      beforeEach: () => liberar,
    });
    await router.push('/x');

    liberar = false;
    await voltarPara('/');
    expect(route.path).toBe('/x');
    expect(window.location.pathname).toBe('/x');
  });

  it('a guard that redirects on popstate navigates to the target', async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/x': { component: 'x' },
        '/login': { component: 'l' },
      },
      beforeEach: (to) => (to.path === '/' ? '/login' : true),
    });
    await router.push('/x');

    await voltarPara('/');
    expect(route.path).toBe('/login');
  });
});

// ---------------------------------------------------------------------------
// Scrolling
// ---------------------------------------------------------------------------

describe('scrolling', () => {
  it('a new route goes back to the top', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 400;

    await router.push('/x');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('scroll: false turns the scrolling off for that navigation', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 400;

    await router.push('/x', { scroll: false });
    await assentar();
    expect(rolarPara).not.toHaveBeenCalled();
  });

  it('the position is stored and restored on the way back', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    const chaveInicial = window.history.state.__voodooRoute as string;

    posicao = 250;
    await router.push('/x');
    await assentar();
    rolarPara.mockClear();

    posicao = 0;
    await voltarPara('/', { __voodooRoute: chaveInicial });
    expect(rolarPara).toHaveBeenCalledWith(0, 250);
  });

  it('going back to an entry with no stored position goes to the top', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    await router.push('/x');
    await assentar();
    rolarPara.mockClear();

    posicao = 300;
    await voltarPara('/', { __voodooRoute: 'entrada-desconhecida' });
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('a custom scrollBehavior receives the stored position and decides the target', async () => {
    const visto: Array<number | null> = [];
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      scrollBehavior: (_to, _from, guardada) => {
        visto.push(guardada);
        return 120;
      },
    });

    await router.push('/x');
    await assentar();
    expect(visto).toContain(null);
    expect(rolarPara).toHaveBeenCalledWith(0, 120);
  });

  it('a scrollBehavior that returns false takes the scrolling over', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      scrollBehavior: () => false,
    });
    posicao = 500;

    await router.push('/x');
    await assentar();
    expect(rolarPara).not.toHaveBeenCalled();
  });

  it('a scrollBehavior with no return falls back to the default behavior', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      scrollBehavior: () => undefined,
    });
    posicao = 500;

    await router.push('/x');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('a hash with an anchor scrolls to the element, by id or by name', async () => {
    document.body.innerHTML =
      '<div id="secao"></div><a name="rodape"></a><div id="com espaco"></div>';
    const porId = document.getElementById('secao') as HTMLElement;
    const porName = document.querySelector('[name="rodape"]') as HTMLElement;
    porId.scrollIntoView = vi.fn();
    porName.scrollIntoView = vi.fn();

    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });

    await router.push('/x#secao');
    await assentar();
    expect(porId.scrollIntoView).toHaveBeenCalled();

    await router.push('/x#rodape');
    await assentar();
    expect(porName.scrollIntoView).toHaveBeenCalled();
  });

  it('a hash with no matching anchor goes back to the top', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 300;

    // The text has a character that would break the selector, so it is never queried.
    await router.push('/x#nao existe');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('the initial route with a hash also scrolls to the anchor', async () => {
    document.body.innerHTML = '<div id="inicio"></div>';
    const alvo = document.getElementById('inicio') as HTMLElement;
    alvo.scrollIntoView = vi.fn();

    await configurar({ url: '/#inicio', routes: { '/': { component: 'h' } } });
    await assentar();
    expect(alvo.scrollIntoView).toHaveBeenCalled();
  });

  it('does not scroll when the page is already at the requested position', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 0;

    await router.push('/x');
    await assentar();
    expect(rolarPara).toHaveBeenCalledTimes(0);
  });
});

// ---------------------------------------------------------------------------
// v-router-view
// ---------------------------------------------------------------------------

describe('v-router-view', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  function html(texto: string): Response {
    return new Response(texto, { status: 200, headers: { 'content-type': 'text/html' } });
  }

  it('mounts the component of the matched route', async () => {
    defineComponent('pagina-x', { template: '<p>conteudo x</p>' });
    await configurar({
      routes: { '/': { component: 'home' }, '/x': { component: 'pagina-x' } },
    });

    const raiz = montar('<main v-router-view>vazio</main>');
    await router.push('/x');
    await assentar();

    const main = raiz.querySelector('main') as HTMLElement;
    expect(main.querySelector('.v-router-page')).not.toBeNull();
    expect(main.textContent).toContain('conteudo x');
  });

  it('loads the remote HTML of a route with view and reuses the cache', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(html('<p>remoto</p>')));
    await configurar({
      routes: { '/': { component: 'h' }, '/parcial': { view: '/parciais/a.html' } },
    });

    const raiz = montar('<main v-router-view>vazio</main>');
    await router.push('/parcial');
    await assentar();
    expect((raiz.querySelector('main') as HTMLElement).innerHTML).toContain('remoto');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await router.push('/');
    await assentar();
    await router.push('/parcial');
    await assentar();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearViewCache('/parciais/a.html');
    await router.push('/');
    await assentar();
    await router.push('/parcial');
    await assentar();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a failure to load the view does not bring the screen down', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('offline')));
    await configurar({
      routes: { '/': { component: 'h' }, '/parcial': { view: '/parciais/a.html' } },
    });

    const raiz = montar('<main v-router-view>vazio</main>');
    await router.push('/parcial');
    await assentar();

    const main = raiz.querySelector('main') as HTMLElement;
    expect(main.classList.contains('v-router-loading')).toBe(false);
    expect(main.innerHTML).toBe('');
    erro.mockRestore();
  });

  it('with no matched route the original content comes back', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    const raiz = montar('<main v-router-view>carregando...</main>');

    await router.push('/nao-existe');
    await assentar();
    expect((raiz.querySelector('main') as HTMLElement).textContent).toBe('carregando...');
  });

  it('the cleanup empties the route area', async () => {
    defineComponent('pagina-y', { template: '<p>y</p>' });
    await configurar({ routes: { '/': { component: 'h' }, '/y': { component: 'pagina-y' } } });

    const raiz = montar('<main v-router-view></main>');
    await router.push('/y');
    await assentar();
    const main = raiz.querySelector('main') as HTMLElement;
    expect(main.textContent).toContain('y');

    destroy(raiz);
    expect(main.textContent).toBe('');
  });

  it('the no-transition modifier mounts too', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(html('<p>sem transicao</p>')));
    await configurar({
      transition: false,
      routes: { '/': { component: 'h' }, '/p': { view: '/p.html' } },
    });

    const raiz = montar('<main v-router-view.no-transition></main>');
    await router.push('/p');
    await assentar();
    expect((raiz.querySelector('main') as HTMLElement).textContent).toContain('sem transicao');
  });
});

// ---------------------------------------------------------------------------
// v-link
// ---------------------------------------------------------------------------

describe('v-link', () => {
  beforeEach(async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/usuarios': { component: 'l' },
        '/usuarios/:id': { component: 'd' },
      },
    });
  });

  /**
   * Clicks the link and returns `true` when the directive prevented the default.
   *
   * The spy listener goes in after the one from the directive, on the same
   * target, so it sees the decision already taken and only then prevents the
   * event. Without that jsdom would try to navigate for real in the cases where
   * the native behavior is the one expected.
   */
  function clicar(el: Element, init: MouseEventInit = {}): boolean {
    let impedido = false;
    const espiao = (evento: Event): void => {
      impedido = evento.defaultPrevented;
      evento.preventDefault();
    };
    el.addEventListener('click', espiao);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    el.removeEventListener('click', espiao);
    return impedido;
  }

  it('the click navigates and the native href is prevented', async () => {
    const raiz = montar('<a v-link href="/usuarios">Usuarios</a>');
    const impedido = clicar(raiz.querySelector('a') as Element);
    await assentar();

    expect(impedido).toBe(true);
    expect(route.path).toBe('/usuarios');
  });

  it('the expression beats the href, both literal and evaluated', async () => {
    const raiz = montar('<a v-link="\'/usuarios/\' + id" href="/errado"></a>', { id: 5 });
    clicar(raiz.querySelector('a') as Element);
    await assentar();
    expect(route.path).toBe('/usuarios/5');

    const literal = montar('<a v-link="/usuarios"></a>');
    clicar(literal.querySelector('a') as Element);
    await assentar();
    expect(route.path).toBe('/usuarios');
  });

  it('the active classes follow the route', async () => {
    const raiz = montar(
      '<a v-link href="/usuarios">L</a><a v-link href="/">Home</a>' +
        '<a v-link href="/usuarios/7">D</a>'
    );
    const [lista, home, detalhe] = Array.from(raiz.querySelectorAll('a'));

    await router.push('/usuarios/7');
    await assentar();

    expect(lista.classList.contains('v-link-active')).toBe(true);
    expect(lista.classList.contains('v-link-exact-active')).toBe(false);
    expect(detalhe.classList.contains('v-link-exact-active')).toBe(true);
    expect(detalhe.getAttribute('aria-current')).toBe('page');
    // The root is only active on itself.
    expect(home.classList.contains('v-link-active')).toBe(false);
    expect(lista.hasAttribute('aria-current')).toBe(false);
  });

  it('the active classes can be swapped in the configuration', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      linkActiveClass: 'ativo',
      linkExactActiveClass: 'ativo-exato',
    });
    const raiz = montar('<a v-link href="/x"></a>');
    await router.push('/x');
    await assentar();

    const a = raiz.querySelector('a') as HTMLElement;
    expect(a.classList.contains('ativo')).toBe(true);
    expect(a.classList.contains('ativo-exato')).toBe(true);
  });

  it('a click with a modifier key or secondary button follows the browser default', async () => {
    const raiz = montar('<a v-link href="/usuarios"></a>');
    const a = raiz.querySelector('a') as Element;

    for (const init of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      expect(clicar(a, init), JSON.stringify(init)).toBe(false);
    }
    await assentar();
    expect(route.path).toBe('/');
  });

  it('target, download, rel external, an external domain and empty href stay native', async () => {
    const raiz = montar(
      '<a v-link href="/a" target="_blank"></a>' +
        '<a v-link href="/b" download></a>' +
        '<a v-link href="/c" rel="noopener external"></a>' +
        '<a v-link href="https://outro.com"></a>' +
        '<a v-link href="//cdn.com/x"></a>' +
        '<a v-link href=""></a>' +
        '<a v-link href="#ancora"></a>'
    );

    for (const a of Array.from(raiz.querySelectorAll('a'))) {
      expect(clicar(a), a.outerHTML).toBe(false);
    }
    await assentar();
    expect(route.path).toBe('/');
  });

  it('target="_self" is still internal navigation', async () => {
    const raiz = montar('<a v-link href="/usuarios" target="_self"></a>');
    expect(clicar(raiz.querySelector('a') as Element)).toBe(true);
    await assentar();
    expect(route.path).toBe('/usuarios');
  });

  it('a click already prevented by another handler does not navigate', async () => {
    const raiz = montar('<a v-link href="/usuarios"></a>');
    const a = raiz.querySelector('a') as Element;
    a.addEventListener('click', (e) => e.preventDefault(), { capture: true });

    clicar(a);
    await assentar();
    expect(route.path).toBe('/');
  });

  it('the replace modifier uses replaceState', async () => {
    const substituir = vi.spyOn(window.history, 'replaceState');
    const empilhar = vi.spyOn(window.history, 'pushState');
    const raiz = montar('<a v-link.replace href="/usuarios"></a>');

    clicar(raiz.querySelector('a') as Element);
    await assentar();
    expect(substituir).toHaveBeenCalled();
    expect(empilhar).not.toHaveBeenCalled();
  });

  it('in hash mode an href with # becomes a route path', async () => {
    await configurar({
      url: '/p.html#/',
      mode: 'hash',
      routes: { '/': { component: 'h' }, '/sobre': { component: 's' } },
    });
    const raiz = montar('<a v-link href="#/sobre"></a><a v-link href="#"></a>');
    const [comRota, soHash] = Array.from(raiz.querySelectorAll('a'));

    clicar(comRota);
    await assentar();
    expect(route.path).toBe('/sobre');

    // `#` on its own becomes the root.
    clicar(soHash);
    await assentar();
    expect(route.path).toBe('/');
  });

  it('the cleanup removes the click listener', async () => {
    const raiz = montar('<a v-link href="/usuarios"></a>');
    const a = raiz.querySelector('a') as Element;
    destroy(raiz);

    clicar(a);
    await assentar();
    expect(route.path).toBe('/');
  });
});

// ---------------------------------------------------------------------------
// v-route-active
// ---------------------------------------------------------------------------

describe('v-route-active', () => {
  beforeEach(async () => {
    await configurar({
      routes: {
        '/': { component: 'h' },
        '/usuarios': { component: 'l' },
        '/usuarios/:id': { component: 'd' },
      },
    });
  });

  it('applies the default class when the route is inside the path', async () => {
    const raiz = montar('<li v-route-active="/usuarios"></li>');
    const li = raiz.querySelector('li') as HTMLElement;
    expect(li.classList.contains('active')).toBe(false);

    await router.push('/usuarios/7');
    await assentar();
    expect(li.classList.contains('active')).toBe(true);
  });

  it('the argument swaps the class and the exact modifier narrows it', async () => {
    const raiz = montar('<li v-route-active:destaque.exact="/usuarios"></li>');
    const li = raiz.querySelector('li') as HTMLElement;

    await router.push('/usuarios/7');
    await assentar();
    expect(li.classList.contains('destaque')).toBe(false);

    await router.push('/usuarios');
    await assentar();
    expect(li.classList.contains('destaque')).toBe(true);
  });

  it('the target can also come from an expression, and empty never activates', async () => {
    const raiz = montar('<li v-route-active="alvo"></li><li v-route-active=""></li>', {
      alvo: '/usuarios',
    });
    const [porExpressao, vazio] = Array.from(raiz.querySelectorAll('li'));

    await router.push('/usuarios');
    await assentar();
    expect(porExpressao.classList.contains('active')).toBe(true);
    expect(vazio.classList.contains('active')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Listener lifecycle
// ---------------------------------------------------------------------------

describe('history listeners', () => {
  it('stop turns the popstate handling off', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    await router.push('/x');

    router.stop();
    await voltarPara('/');
    expect(route.path).toBe('/x');

    // Stopping twice must not blow up.
    expect(() => router.stop()).not.toThrow();
  });

  it('navigate wires the listeners back up when the router was stopped', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    router.stop();

    await navigate('/x');
    expect(route.path).toBe('/x');

    await voltarPara('/', { __voodooRoute: 'a' });
    expect(route.path).toBe('/');
  });
});
