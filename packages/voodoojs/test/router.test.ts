import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick, reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { defineComponent } from '../src/runtime/component';
// O `core` injeta o montador de componentes no walker: sem ele `v-component`
// nao renderiza, e `v-router-view` monta uma casca vazia.
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
 * Cobertura do roteador, que nao tinha nenhum teste dedicado.
 *
 * O estado do modulo e global de proposito (existe um roteador por pagina),
 * entao cada teste reconfigura tudo do zero com `configurar()` e devolve a URL
 * ao final. O `popstate` e disparado a mao, porque o jsdom nao propaga a
 * travessia real do historico de forma sincrona.
 */

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

/** Deixa as microtarefas, o pos-flush e o requestAnimationFrame terminarem. */
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

/** Configura o roteador a partir de uma URL e espera a rota inicial entrar. */
async function configurar(opcoes: OpcoesTeste): Promise<void> {
  window.history.replaceState(null, '', opcoes.url ?? '/');
  router(opcoes as never);
  await assentar();
}

/** Dispara o popstate como o navegador faria ao voltar para uma URL. */
async function voltarPara(url: string, state: Record<string, unknown> | null = null): Promise<void> {
  window.history.replaceState(state, '', url);
  window.dispatchEvent(new PopStateEvent('popstate', { state }));
  await assentar();
}

/**
 * Raizes montadas no teste. Limpar `document.body` nao basta: os efeitos das
 * directives continuam vivos e reagindo a `route`, e um `v-router-view` de um
 * teste anterior voltaria a buscar HTML no teste seguinte.
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
  // O jsdom nao implementa rolagem: sem o duble cada navegacao imprimiria erro.
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
// Casamento de rota
// ---------------------------------------------------------------------------

describe('casamento de rota', () => {
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

  it('extrai params do padrao', () => {
    const destino = resolve('/usuarios/42');
    expect(destino.matched).toBe('/usuarios/:id');
    expect(destino.params).toEqual({ id: '42' });
    expect(destino.name).toBe('usuario');
    expect(destino.meta).toEqual({ privado: true });
  });

  it('estatico vence parametro, mesmo declarado depois', () => {
    expect(resolve('/usuarios/novo').matched).toBe('/usuarios/novo');
    expect(resolve('/usuarios/outra').matched).toBe('/usuarios/:id');
  });

  it('parametro opcional casa com e sem o segmento', () => {
    expect(resolve('/posts').matched).toBe('/posts/:slug?');
    expect(resolve('/posts').params).toEqual({});
    expect(resolve('/posts/ola-mundo').params).toEqual({ slug: 'ola-mundo' });
  });

  it('curinga captura o resto do caminho', () => {
    const destino = resolve('/arquivos/fotos/2024/a.png');
    expect(destino.matched).toBe('/arquivos/*');
    expect(destino.params['*']).toBe('fotos/2024/a.png');
    expect(resolve('/arquivos').params['*']).toBe('');
  });

  it('nada que case cai no curinga solitario', () => {
    const destino = resolve('/pagina/que/nao/existe');
    expect(destino.matched).toBe('*');
    expect(destino.name).toBe('404');
  });

  it('sem curinga nenhum, o destino fica sem rota casada', async () => {
    await configurar({ routes: { '/': { component: 'home' } } });
    const destino = resolve('/nada');
    expect(destino.matched).toBeNull();
    expect(destino.name).toBe('');
    expect(destino.meta).toEqual({});
  });

  it('separa query e hash e remonta o fullPath', () => {
    const destino = resolve('/usuarios/7?aba=dados&ordem=nome#topo');
    expect(destino.path).toBe('/usuarios/7');
    expect(destino.query).toEqual({ aba: 'dados', ordem: 'nome' });
    expect(destino.hash).toBe('topo');
    expect(destino.fullPath).toBe('/usuarios/7?aba=dados&ordem=nome#topo');
  });

  it('normaliza barras sobrando e caminho sem barra inicial', () => {
    expect(resolve('usuarios//7/').path).toBe('/usuarios/7');
    expect(resolve('').path).toBe('/');
    expect(resolve('/').path).toBe('/');
  });

  it('params vem decodificados, e sequencia invalida fica como esta', () => {
    expect(resolve('/usuarios/ana%20maria').params.id).toBe('ana maria');
    expect(resolve('/usuarios/100%').params.id).toBe('100%');
  });

  it('caminho mais longo que o padrao nao casa', () => {
    expect(resolve('/usuarios/7/extra').matched).toBe('*');
  });

  it('routePatterns lista do mais especifico para o menos', () => {
    const padroes = routePatterns();
    expect(padroes[padroes.length - 1]).toBe('*');
    expect(padroes.indexOf('/usuarios/novo')).toBeLessThan(padroes.indexOf('/usuarios/:id'));
  });
});

// ---------------------------------------------------------------------------
// addRoute e removeRoute
// ---------------------------------------------------------------------------

describe('addRoute e removeRoute', () => {
  beforeEach(async () => {
    await configurar({ routes: { '/': { component: 'home' } } });
  });

  it('addRoute registra e substitui pelo mesmo padrao', () => {
    addRoute('/sobre', { component: 'sobre', name: 'a' });
    expect(resolve('/sobre').name).toBe('a');

    addRoute('/sobre', { component: 'sobre', name: 'b' });
    expect(resolve('/sobre').name).toBe('b');
    expect(routePatterns().filter((p) => p === '/sobre')).toHaveLength(1);
  });

  it('removeRoute tira o padrao, aceitando forma nao normalizada', () => {
    addRoute('/sobre', { component: 'sobre' });
    removeRoute('sobre//');
    expect(resolve('/sobre').matched).toBeNull();

    // Remover o que nao existe nao muda nada.
    removeRoute('/nunca-existiu');
    expect(routePatterns()).toEqual(['/']);
  });

  it('o curinga tambem pode ser registrado e removido', () => {
    addRoute('*', { component: 'nf' });
    expect(resolve('/qualquer').matched).toBe('*');
    removeRoute('*');
    expect(resolve('/qualquer').matched).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Navegacao no modo history
// ---------------------------------------------------------------------------

describe('navegacao no modo history', () => {
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

  it('a rota inicial e aplicada e o titulo segue o modelo', () => {
    expect(route.path).toBe('/');
    expect(route.matched).toBe('/');
    expect(document.title).toBe('Inicio | Voodoo');
  });

  it('push muda a URL, a rota e empilha no historico', async () => {
    expect(await router.push('/usuarios/7?aba=dados')).toBe(true);
    expect(route.path).toBe('/usuarios/7');
    expect(route.params).toEqual({ id: '7' });
    expect(route.query).toEqual({ aba: 'dados' });
    expect(window.location.pathname).toBe('/usuarios/7');
    expect(window.location.search).toBe('?aba=dados');
    expect(document.title).toBe('Usuario | Voodoo');
  });

  it('replace troca a entrada em vez de empilhar', async () => {
    const substituir = vi.spyOn(window.history, 'replaceState');
    const empilhar = vi.spyOn(window.history, 'pushState');

    await router.replace('/usuarios');
    expect(substituir).toHaveBeenCalled();
    expect(empilhar).not.toHaveBeenCalled();
  });

  it('navegar para a rota atual nao faz nada, salvo com force', async () => {
    const empilhar = vi.spyOn(window.history, 'pushState');
    expect(await router.push('/')).toBe(true);
    expect(empilhar).not.toHaveBeenCalled();

    expect(await router.push('/', { force: true })).toBe(true);
    expect(empilhar).toHaveBeenCalledTimes(1);
  });

  it('o estado extra vai junto na entrada do historico', async () => {
    await router.push('/usuarios', { state: { origem: 'menu' } });
    expect(window.history.state.origem).toBe('menu');
    expect(window.history.state.__voodooRoute).toBeTruthy();
  });

  it('titleTemplate sem %s usa o titulo puro', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x', title: 'Pagina X' } },
      titleTemplate: 'fixo',
    });
    await router.push('/x');
    expect(document.title).toBe('Pagina X');
  });

  it('back, forward e go apenas repassam para o historico', () => {
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
   * Regressao: a API era montada com `Object.assign`, que le cada getter uma
   * unica vez e copia o valor. Com isso `V.router.ready` nascia `false` no
   * carregamento do modulo e continuava `false` para sempre, mesmo depois de
   * `V.router({...})`.
   */
  it('router.ready fica verdadeiro depois da configuracao', () => {
    expect(router.ready).toBe(true);
    expect(router.current).toBe(route);
  });
});

describe('base no modo history', () => {
  it('o prefixo entra na URL e sai do caminho da rota', async () => {
    await configurar({
      url: '/app/usuarios',
      base: '/app',
      routes: { '/': { component: 'h' }, '/usuarios': { component: 'l' } },
    });

    expect(route.path).toBe('/usuarios');
    expect(window.location.pathname).toBe('/app/usuarios');

    await router.push('/');
    // A raiz da aplicacao vira `/app/`, e `stripBase` a le de volta como `/`.
    expect(window.location.pathname).toBe('/app/');
    expect(route.path).toBe('/');
  });

  it('URL fora do prefixo continua como esta', async () => {
    await configurar({
      url: '/outro/lugar',
      base: '/app',
      routes: { '*': { component: 'nf' } },
    });
    expect(route.path).toBe('/outro/lugar');
  });
});

// ---------------------------------------------------------------------------
// Modo hash
// ---------------------------------------------------------------------------

describe('modo hash', () => {
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

  it('le a rota depois do # na entrada', () => {
    expect(route.path).toBe('/usuarios/9');
    expect(route.params).toEqual({ id: '9' });
    expect(route.query).toEqual({ aba: 'x' });
  });

  it('sem nada depois do # a rota e a raiz', async () => {
    await configurar({ url: '/pagina.html', mode: 'hash', routes: { '/': { component: 'h' } } });
    expect(route.path).toBe('/');
  });

  it('navegar escreve o destino depois do #, preservando o caminho do arquivo', async () => {
    await router.push('/sobre');
    expect(window.location.hash).toBe('#/sobre');
    expect(window.location.pathname).toBe('/pagina.html');
    expect(route.path).toBe('/sobre');
  });

  it('hashchange e tratado como navegacao', async () => {
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
  it('beforeEach sincrono recebe destino e origem', async () => {
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

  it('beforeEach assincrono e aguardado', async () => {
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

  it('guard que devolve false cancela a navegacao e nao mexe na URL', async () => {
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

  it('guard que devolve string redireciona', async () => {
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

  it('beforeEnter da rota roda antes do global e pode cancelar', async () => {
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

  it('beforeEnter tambem pode redirecionar', async () => {
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

  it('beforeEnter assincrono que libera deixa passar', async () => {
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

  it('guard que cancela a rota inicial deixa a rota como estava', async () => {
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

  it('afterEach roda depois da navegacao concluida', async () => {
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

describe('redirect declarado na rota', () => {
  it('leva para o destino sem passar pela rota de origem', async () => {
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

  it('redirect tambem vale na rota inicial', async () => {
    await configurar({
      url: '/antigo',
      routes: { '/antigo': { redirect: '/novo' }, '/novo': { component: 'n' } },
    });
    expect(route.path).toBe('/novo');
  });

  it('ciclo de redirecionamento para e avisa em vez de travar', async () => {
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

  it('ciclo na rota inicial tambem e interrompido', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await configurar({
      url: '/a',
      routes: { '/a': { redirect: '/b' }, '/b': { redirect: '/a' } },
    });
    expect(String(aviso.mock.calls.at(-1)?.[0])).toContain('initial route');
  });
});

// ---------------------------------------------------------------------------
// Voltar e avancar
// ---------------------------------------------------------------------------

describe('popstate', () => {
  it('voltar aplica a rota da URL anterior', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
    });
    await router.push('/x');
    expect(route.path).toBe('/x');

    await voltarPara('/', { __voodooRoute: 'inicial' });
    expect(route.path).toBe('/');
  });

  it('popstate para a mesma rota nao faz nada', async () => {
    const chamadas: string[] = [];
    await configurar({
      routes: { '/': { component: 'h' } },
      afterEach: (to) => chamadas.push((to as { path: string }).path),
    });

    chamadas.length = 0;
    await voltarPara('/');
    expect(chamadas).toEqual([]);
  });

  it('guard que recusa devolve a URL anterior sem criar entrada nova', async () => {
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

  it('guard que redireciona no popstate navega para o destino', async () => {
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
// Rolagem
// ---------------------------------------------------------------------------

describe('rolagem', () => {
  it('rota nova volta ao topo', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 400;

    await router.push('/x');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('scroll: false desliga a rolagem daquela navegacao', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 400;

    await router.push('/x', { scroll: false });
    await assentar();
    expect(rolarPara).not.toHaveBeenCalled();
  });

  it('a posicao e guardada e restaurada ao voltar', async () => {
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

  it('voltar para uma entrada sem posicao guardada vai ao topo', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    await router.push('/x');
    await assentar();
    rolarPara.mockClear();

    posicao = 300;
    await voltarPara('/', { __voodooRoute: 'entrada-desconhecida' });
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('scrollBehavior proprio recebe a posicao guardada e decide o destino', async () => {
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

  it('scrollBehavior que devolve false assume a rolagem', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      scrollBehavior: () => false,
    });
    posicao = 500;

    await router.push('/x');
    await assentar();
    expect(rolarPara).not.toHaveBeenCalled();
  });

  it('scrollBehavior sem retorno cai no comportamento padrao', async () => {
    await configurar({
      routes: { '/': { component: 'h' }, '/x': { component: 'x' } },
      scrollBehavior: () => undefined,
    });
    posicao = 500;

    await router.push('/x');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('hash com ancora rola ate o elemento, por id ou por name', async () => {
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

  it('hash sem ancora correspondente volta ao topo', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    posicao = 300;

    // O texto tem caractere que quebraria o seletor, entao nem e consultado.
    await router.push('/x#nao existe');
    await assentar();
    expect(rolarPara).toHaveBeenCalledWith(0, 0);
  });

  it('a rota inicial com hash tambem rola ate a ancora', async () => {
    document.body.innerHTML = '<div id="inicio"></div>';
    const alvo = document.getElementById('inicio') as HTMLElement;
    alvo.scrollIntoView = vi.fn();

    await configurar({ url: '/#inicio', routes: { '/': { component: 'h' } } });
    await assentar();
    expect(alvo.scrollIntoView).toHaveBeenCalled();
  });

  it('nao rola quando a pagina ja esta na posicao pedida', async () => {
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

  it('monta o componente da rota casada', async () => {
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

  it('carrega o HTML remoto da rota com view e reaproveita o cache', async () => {
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

  it('falha ao carregar a view nao derruba a tela', async () => {
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

  it('sem rota casada volta o conteudo original', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    const raiz = montar('<main v-router-view>carregando...</main>');

    await router.push('/nao-existe');
    await assentar();
    expect((raiz.querySelector('main') as HTMLElement).textContent).toBe('carregando...');
  });

  it('a limpeza esvazia a area da rota', async () => {
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

  it('o modificador no-transition tambem monta', async () => {
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
   * Clica no link e devolve `true` quando a directive impediu o padrao.
   *
   * O ouvinte espiao entra depois do da directive, no mesmo alvo, entao ele ve
   * a decisao ja tomada e so entao impede o evento. Sem isso o jsdom tentaria
   * navegar de verdade nos casos em que o comportamento nativo e o esperado.
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

  it('o clique navega e o href nativo e impedido', async () => {
    const raiz = montar('<a v-link href="/usuarios">Usuarios</a>');
    const impedido = clicar(raiz.querySelector('a') as Element);
    await assentar();

    expect(impedido).toBe(true);
    expect(route.path).toBe('/usuarios');
  });

  it('a expressao vence o href, tanto literal quanto avaliada', async () => {
    const raiz = montar('<a v-link="\'/usuarios/\' + id" href="/errado"></a>', { id: 5 });
    clicar(raiz.querySelector('a') as Element);
    await assentar();
    expect(route.path).toBe('/usuarios/5');

    const literal = montar('<a v-link="/usuarios"></a>');
    clicar(literal.querySelector('a') as Element);
    await assentar();
    expect(route.path).toBe('/usuarios');
  });

  it('as classes de ativo acompanham a rota', async () => {
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
    // A raiz so fica ativa nela mesma.
    expect(home.classList.contains('v-link-active')).toBe(false);
    expect(lista.hasAttribute('aria-current')).toBe(false);
  });

  it('as classes de ativo podem ser trocadas na configuracao', async () => {
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

  it('clique com tecla modificadora ou botao secundario segue o padrao do navegador', async () => {
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

  it('target, download, rel external, dominio externo e href vazio ficam nativos', async () => {
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

  it('target="_self" continua sendo navegacao interna', async () => {
    const raiz = montar('<a v-link href="/usuarios" target="_self"></a>');
    expect(clicar(raiz.querySelector('a') as Element)).toBe(true);
    await assentar();
    expect(route.path).toBe('/usuarios');
  });

  it('clique ja impedido por outro tratador nao navega', async () => {
    const raiz = montar('<a v-link href="/usuarios"></a>');
    const a = raiz.querySelector('a') as Element;
    a.addEventListener('click', (e) => e.preventDefault(), { capture: true });

    clicar(a);
    await assentar();
    expect(route.path).toBe('/');
  });

  it('o modificador replace usa replaceState', async () => {
    const substituir = vi.spyOn(window.history, 'replaceState');
    const empilhar = vi.spyOn(window.history, 'pushState');
    const raiz = montar('<a v-link.replace href="/usuarios"></a>');

    clicar(raiz.querySelector('a') as Element);
    await assentar();
    expect(substituir).toHaveBeenCalled();
    expect(empilhar).not.toHaveBeenCalled();
  });

  it('no modo hash o href com # vira caminho de rota', async () => {
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

    // `#` sozinho vira a raiz.
    clicar(soHash);
    await assentar();
    expect(route.path).toBe('/');
  });

  it('a limpeza remove o ouvinte de clique', async () => {
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

  it('aplica a classe padrao quando a rota esta dentro do caminho', async () => {
    const raiz = montar('<li v-route-active="/usuarios"></li>');
    const li = raiz.querySelector('li') as HTMLElement;
    expect(li.classList.contains('active')).toBe(false);

    await router.push('/usuarios/7');
    await assentar();
    expect(li.classList.contains('active')).toBe(true);
  });

  it('o argumento troca a classe e o modificador exact restringe', async () => {
    const raiz = montar('<li v-route-active:destaque.exact="/usuarios"></li>');
    const li = raiz.querySelector('li') as HTMLElement;

    await router.push('/usuarios/7');
    await assentar();
    expect(li.classList.contains('destaque')).toBe(false);

    await router.push('/usuarios');
    await assentar();
    expect(li.classList.contains('destaque')).toBe(true);
  });

  it('o destino tambem pode vir de uma expressao, e vazio nunca ativa', async () => {
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
// Ciclo de vida dos ouvintes
// ---------------------------------------------------------------------------

describe('ouvintes do historico', () => {
  it('stop desliga o tratamento de popstate', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    await router.push('/x');

    router.stop();
    await voltarPara('/');
    expect(route.path).toBe('/x');

    // Parar duas vezes nao pode explodir.
    expect(() => router.stop()).not.toThrow();
  });

  it('navigate religa os ouvintes quando o roteador estava parado', async () => {
    await configurar({ routes: { '/': { component: 'h' }, '/x': { component: 'x' } } });
    router.stop();

    await navigate('/x');
    expect(route.path).toBe('/x');

    await voltarPara('/', { __voodooRoute: 'a' });
    expect(route.path).toBe('/');
  });
});
