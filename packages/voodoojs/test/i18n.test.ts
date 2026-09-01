import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick, reactive } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import '../src/core';
import {
  addMessages,
  availableLocales,
  c,
  d,
  detectLocale,
  getLocale,
  i18n,
  loadMessages,
  messagesOf,
  n,
  rt,
  setLocale,
  t,
  te,
} from '../src/i18n';

/**
 * Cobertura do modulo de internacionalizacao, que nao tinha teste dedicado.
 *
 * O estado e um singleton do modulo, entao cada teste comeca por `preparar()`,
 * que apaga o armazenamento, devolve o idioma para `pt-BR` e recarrega apenas
 * as mensagens de que precisa. A chave de persistencia e restaurada com o nome
 * padrao sempre que um teste a desliga.
 */

const CHAVE_PADRAO = 'voodoo:locale';

/** Mensagens usadas na maioria dos testes. */
function mensagensBase(): Record<string, Record<string, unknown>> {
  return {
    'pt-BR': {
      comum: { salvar: 'Salvar', dica: 'Clique para salvar' },
      ola: 'Ola, {nome}!',
      itens: 'nenhum item | {n} item | {n} itens',
      duas: '{n} arquivo | {n} arquivos',
      so_pt: 'apenas em portugues',
    },
    en: {
      comum: { salvar: 'Save' },
      ola: 'Hello, {nome}!',
      itens: 'no items | {n} item | {n} items',
      so_en: 'english only',
    },
    'pt-PT': { comum: { salvar: 'Guardar' } },
    es: { 'comum.salvar': 'Guardar' },
  };
}

/** Reconfigura o modulo do zero, sem persistencia e sem deteccao. */
function preparar(extra: Record<string, unknown> = {}): void {
  localStorage.clear();
  i18n({
    persist: CHAVE_PADRAO,
    detect: false,
    locale: 'pt-BR',
    fallback: 'en',
    messages: mensagensBase(),
    ...extra,
  } as never);
  localStorage.clear();
}

function montar(html: string, dados: Record<string, unknown> = {}): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  walk(raiz, new Scope(reactive(dados)));
  montadas.push(raiz);
  return raiz;
}

const montadas: HTMLElement[] = [];

beforeEach(() => {
  for (const raiz of montadas.splice(0)) destroy(raiz);
  document.body.innerHTML = '';
  preparar();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Traducao
// ---------------------------------------------------------------------------

describe('traducao de mensagens', () => {
  it('le chave aninhada e chave achatada', () => {
    expect(t('comum.salvar')).toBe('Salvar');
    void setLocale('es');
    expect(t('comum.salvar')).toBe('Guardar');
  });

  it('chave vazia devolve texto vazio', () => {
    expect(t('')).toBe('');
    expect(t(undefined as unknown as string)).toBe('');
  });

  it('chave ausente degrada devolvendo a propria chave, sem lancar', () => {
    expect(() => t('nao.existe.em.lugar.nenhum')).not.toThrow();
    expect(t('nao.existe.em.lugar.nenhum')).toBe('nao.existe.em.lugar.nenhum');
    // Caminho que existe pela metade tambem devolve a chave.
    expect(t('comum.salvar.demais')).toBe('comum.salvar.demais');
    // Chave que aponta para um galho, e nao para um texto.
    expect(t('comum')).toBe('comum');
  });

  it('idioma sem nenhuma mensagem carregada nao quebra', () => {
    void setLocale('ja');
    expect(t('comum.salvar')).toBe('Save');
    expect(t('so_ja')).toBe('so_ja');
  });

  it('te responde se a chave existe, no idioma atual ou no informado', () => {
    expect(te('comum.salvar')).toBe(true);
    expect(te('nao.existe')).toBe(false);
    // `so_en` so existe no fallback, e isso ja conta como existir.
    expect(te('so_en')).toBe(true);
    expect(te('so_pt', 'pt-BR')).toBe(true);
    // Com `en` como alvo, o fallback tambem e `en`: nao ha segunda tentativa.
    expect(te('so_pt', 'en')).toBe(false);
    expect(te('nada', 'en')).toBe(false);
    expect(te('comum.salvar', 'pt-PT')).toBe(true);
  });
});

describe('fallback de idioma', () => {
  it('cai no idioma de reserva quando a chave falta', () => {
    preparar({ fallback: 'pt-BR' });
    void setLocale('en');
    // `comum.dica` so existe em pt-BR.
    expect(t('comum.dica')).toBe('Clique para salvar');
    expect(t('comum.salvar')).toBe('Save');
  });

  it('idioma parecido e tentado antes do fallback', () => {
    void setLocale('pt-PT');
    expect(t('comum.salvar')).toBe('Guardar');
    // `pt-PT` nao tem `ola`, mas o parente `pt-BR` tem.
    expect(t('ola', { nome: 'Ana' })).toBe('Ola, Ana!');
  });

  it('variante sem mensagens usa o idioma curto e os irmaos', () => {
    void setLocale('pt-AO');
    expect(['Salvar', 'Guardar']).toContain(t('comum.salvar'));
  });

  it('sem fallback util a chave volta como esta', () => {
    preparar({ fallback: '' });
    void setLocale('en');
    expect(t('so_pt')).toBe('so_pt');
  });

  it('fallback igual ao idioma atual nao e consultado duas vezes', () => {
    preparar({ fallback: 'pt-BR' });
    expect(t('nao.existe')).toBe('nao.existe');
    expect(te('nao.existe')).toBe(false);
  });

  it('i18n.fallback acompanha a configuracao', () => {
    expect(i18n.fallback).toBe('en');
    preparar({ fallback: 'es' });
    expect(i18n.fallback).toBe('es');
  });
});

// ---------------------------------------------------------------------------
// Interpolacao
// ---------------------------------------------------------------------------

describe('interpolacao', () => {
  it('troca os marcadores pelos valores', () => {
    expect(t('ola', { nome: 'Ana' })).toBe('Ola, Ana!');
  });

  it('marcador sem valor fica visivel em vez de sumir', () => {
    expect(t('ola')).toBe('Ola, {nome}!');
    expect(t('ola', { nome: null })).toBe('Ola, {nome}!');
    expect(t('ola', { nome: undefined })).toBe('Ola, {nome}!');
  });

  it('valores que nao sao texto sao convertidos', () => {
    addMessages('pt-BR', { misto: '{a} e {b}' });
    expect(t('misto', { a: 0, b: false })).toBe('0 e false');
  });

  it('mensagem sem marcador algum passa direto', () => {
    expect(t('comum.salvar', { nome: 'Ana' })).toBe('Salvar');
  });

  it('aceita espacos e pontos dentro do marcador', () => {
    addMessages('pt-BR', { espacado: '[{ nome }] [{a.b}]' });
    expect(t('espacado', { nome: 'Ana', 'a.b': 'x' })).toBe('[Ana] [x]');
  });
});

// ---------------------------------------------------------------------------
// Pluralizacao
// ---------------------------------------------------------------------------

describe('pluralizacao', () => {
  it('tres formas reservam a primeira para o zero', () => {
    expect(t('itens', 0)).toBe('nenhum item');
    expect(t('itens', 1)).toBe('1 item');
    expect(t('itens', 5)).toBe('5 itens');
  });

  it('duas formas seguem a categoria do idioma', () => {
    expect(t('duas', 1)).toBe('1 arquivo');
    expect(t('duas', 3)).toBe('3 arquivos');
    // Em portugues o zero e categoria `one`, ao contrario do ingles.
    expect(t('duas', 0)).toBe('0 arquivo');
    void setLocale('en');
    addMessages('en', { duas: '{n} file | {n} files' });
    expect(t('duas', 0)).toBe('0 files');
  });

  it('o numero pode vir em n ou em count', () => {
    expect(t('itens', { n: 2 })).toBe('2 itens');
    // `count` escolhe a forma, mas quem preenche `{n}` na mensagem e `n`.
    expect(t('itens', { count: 2 })).toBe('{n} itens');
    // Sem numero nenhum a contagem e zero.
    expect(t('itens')).toBe('nenhum item');
  });

  it('contagem ilegivel e tratada como zero', () => {
    expect(t('itens', { n: 'muitos' })).toBe('nenhum item');
  });

  it('forma unica com barra sobrando nao quebra', () => {
    addMessages('pt-BR', { unica: 'so isso |' });
    expect(t('unica', 1)).toBe('so isso');
    expect(t('unica', 5)).toBe('');
  });

  it('quatro ou mais formas usam a ordem oficial de categorias', () => {
    addMessages('ar', { dias: 'zero | um | dois | poucos | muitos | outros' });
    void setLocale('ar');
    expect(t('dias', 0)).toBe('zero');
    expect(t('dias', 1)).toBe('um');
    expect(t('dias', 2)).toBe('dois');
    expect(t('dias', 3)).toBe('poucos');
    expect(t('dias', 11)).toBe('muitos');
    expect(t('dias', 100)).toBe('outros');
  });

  it('idioma invalido cai na regra simples de singular e plural', () => {
    addMessages('nao-e-idioma-@', { p: 'um | varios' });
    void setLocale('nao-e-idioma-@');
    expect(t('p', 1)).toBe('um');
    expect(t('p', 7)).toBe('varios');
  });
});

// ---------------------------------------------------------------------------
// Troca de idioma
// ---------------------------------------------------------------------------

describe('troca de idioma em tempo de execucao', () => {
  it('setLocale muda o idioma, o config e o lang do documento', async () => {
    await setLocale('en');
    expect(getLocale()).toBe('en');
    expect(i18n.locale).toBe('en');
    expect(config.locale).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(t('comum.salvar')).toBe('Save');
  });

  it('trocar para o mesmo idioma, para vazio ou para nulo nao faz nada', async () => {
    await setLocale('en');
    const antes = document.documentElement.lang;

    await setLocale('en');
    await setLocale('   ');
    await setLocale(null as unknown as string);
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe(antes);
  });

  it('o idioma escolhido e guardado e volta na configuracao seguinte', async () => {
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBe('en');

    // Nova configuracao: o idioma salvo vence a opcao `locale`.
    i18n({ detect: false, locale: 'pt-BR', messages: mensagensBase() } as never);
    expect(getLocale()).toBe('en');
  });

  it('persist: false para de guardar', async () => {
    i18n({ persist: false, detect: false, locale: 'pt-BR' } as never);
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBeNull();
  });

  it('persist com nome proprio usa a outra chave', async () => {
    i18n({ persist: 'meu:idioma', detect: false, locale: 'pt-BR' } as never);
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem('meu:idioma')).toBe('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBeNull();
  });

  it('a leitura reativa de $locale acompanha a troca', async () => {
    const raiz = montar('<span>{ $locale }</span>');
    expect(raiz.textContent).toBe('pt-BR');

    await setLocale('en');
    await nextTick();
    expect(raiz.textContent).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

describe('registro de mensagens', () => {
  it('addMessages mescla com o que ja existe', () => {
    addMessages('pt-BR', { comum: { cancelar: 'Cancelar' }, novo: 'Novo' });
    expect(t('comum.salvar')).toBe('Salvar');
    expect(t('comum.cancelar')).toBe('Cancelar');
    expect(t('novo')).toBe('Novo');
  });

  it('addMessages cria o idioma quando ele nao existe e devolve o nome', () => {
    expect(addMessages('it', { ola: 'Ciao' })).toBe('it');
    expect(availableLocales()).toContain('it');
    expect(i18n.locales).toContain('it');
  });

  it('messagesOf devolve as mensagens do idioma pedido ou do atual', () => {
    expect((messagesOf() as Record<string, unknown>).so_pt).toBe('apenas em portugues');
    expect((messagesOf('en') as Record<string, unknown>).so_en).toBe('english only');
    expect(messagesOf('idioma-inexistente')).toEqual({});
  });
});

describe('carregamento sob demanda', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('objeto entra direto, sem tocar na rede', async () => {
    await loadMessages('de', { ola: 'Hallo' });
    expect(fetchMock).not.toHaveBeenCalled();
    void setLocale('de');
    expect(t('ola')).toBe('Hallo');
  });

  it('texto e tratado como URL de um JSON', async () => {
    fetchMock.mockResolvedValue(json({ ola: 'Bonjour' }));
    await loadMessages('fr', '/i18n/fr.json');
    expect(fetchMock.mock.calls[0][0]).toBe('/i18n/fr.json');
    void setLocale('fr');
    expect(t('ola')).toBe('Bonjour');
  });

  it('duas chamadas para o mesmo idioma compartilham a mesma busca', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ ola: 'Hej' })));
    const [a, b] = [loadMessages('sv', '/i18n/sv.json'), loadMessages('sv', '/i18n/sv.json')];
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Terminada a busca, uma nova chamada volta a consultar.
    await loadMessages('sv', '/i18n/sv.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resposta que nao e objeto e ignorada em silencio', async () => {
    fetchMock.mockResolvedValue(json('so um texto'));
    await loadMessages('nl', '/i18n/nl.json');
    expect(availableLocales()).not.toContain('nl');
  });

  it('falha de rede vira erro tratado, e nao promessa recusada', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('offline'));

    await expect(loadMessages('ru', '/i18n/ru.json')).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it('loadPath busca o arquivo do idioma ao trocar para ele', async () => {
    fetchMock.mockResolvedValue(json({ ola: 'Cześć' }));
    i18n({ detect: false, persist: false, loadPath: '/idiomas/{locale}.json' } as never);

    await setLocale('pl');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/idiomas/pl.json');
    expect(t('ola')).toBe('Cześć');
  });

  it('idioma que ja tem mensagens nao dispara busca nova', async () => {
    i18n({ detect: false, persist: false, loadPath: '/idiomas/{locale}.json' } as never);
    fetchMock.mockClear();

    await setLocale('en');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a configuracao inicial tambem busca quando o idioma escolhido nao tem mensagens', async () => {
    fetchMock.mockResolvedValue(json({ ola: 'Hei' }));
    i18n({
      detect: false,
      persist: false,
      locale: 'fi',
      loadPath: '/idiomas/{locale}.json',
    } as never);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/idiomas/fi.json');
  });
});

// ---------------------------------------------------------------------------
// Deteccao de idioma
// ---------------------------------------------------------------------------

describe('deteccao pelo navegador', () => {
  function idiomas(lista: string[] | undefined, unico = 'en-US'): void {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(lista as never);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(unico);
  }

  it('escolhe o idioma exato quando ele existe', () => {
    idiomas(['pt-PT', 'en']);
    expect(detectLocale()).toBe('pt-PT');
  });

  it('cai no parente quando so a variante curta bate', () => {
    idiomas(['pt-MZ', 'de']);
    expect(['pt-BR', 'pt-PT']).toContain(detectLocale());
  });

  it('sem nenhuma coincidencia devolve null', () => {
    idiomas(['ja-JP', 'ko']);
    expect(detectLocale()).toBeNull();
  });

  it('sem a lista usa navigator.language', () => {
    idiomas([], 'en');
    expect(detectLocale()).toBe('en');
    idiomas(undefined, 'EN');
    expect(detectLocale()).toBe('en');
  });

  it('entrada vazia na lista e pulada', () => {
    idiomas(['', 'en']);
    expect(detectLocale()).toBe('en');
  });

  it('sem nenhum idioma carregado nao ha o que detectar', () => {
    idiomas(['en']);
    const mensagens = messagesOf('en');
    expect(mensagens).toBeTruthy();
    // Um idioma que ninguem carregou nunca e escolhido.
    idiomas(['xx-YY']);
    expect(detectLocale()).toBeNull();
  });

  it('a deteccao entra na configuracao quando nada foi salvo', () => {
    idiomas(['en-US']);
    localStorage.clear();
    i18n({ persist: false, locale: 'pt-BR', messages: mensagensBase() } as never);
    expect(getLocale()).toBe('en');
  });

  it('detect: false ignora o navegador', () => {
    idiomas(['en-US']);
    localStorage.clear();
    i18n({ persist: false, detect: false, locale: 'pt-BR' } as never);
    expect(getLocale()).toBe('pt-BR');
  });
});

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

describe('formatadores locais', () => {
  it('n formata numero no idioma atual', () => {
    expect(n(1234.5)).toBe('1.234,5');
    void setLocale('en');
    expect(n(1234.5)).toBe('1,234.5');
  });

  it('c formata moeda, com a moeda padrao ou a informada', () => {
    expect(c(10)).toContain('10,00');
    expect(c(10, 'USD')).toContain('10,00');
  });

  it('d formata data com preset e com mascara', () => {
    const data = new Date(2024, 2, 15);
    expect(d(data, 'short')).toContain('2024');
    expect(d(data, 'DD/MM/YYYY')).toBe('15/03/2024');
  });

  it('rt devolve tempo relativo', () => {
    const agora = new Date(Date.now() - 60_000);
    expect(typeof rt(agora)).toBe('string');
    expect(rt(agora).length).toBeGreaterThan(0);
  });

  it('a moeda padrao pode ser trocada na configuracao', () => {
    i18n({ persist: false, detect: false, currency: 'USD' } as never);
    expect(c(10)).toContain('10,00');
  });
});

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

describe('directive v-t', () => {
  it('traduz o conteudo do elemento e reage a troca de idioma', async () => {
    const raiz = montar('<button v-t="comum.salvar"></button>');
    const botao = raiz.querySelector('button') as HTMLElement;
    expect(botao.textContent).toBe('Salvar');

    await setLocale('en');
    await nextTick();
    expect(botao.textContent).toBe('Save');
  });

  it('com argumento traduz um atributo', async () => {
    const raiz = montar('<abbr v-t:title="comum.dica">?</abbr>');
    expect((raiz.querySelector('abbr') as HTMLElement).getAttribute('title')).toBe(
      'Clique para salvar'
    );
  });

  it('expressao no lugar da chave e avaliada no escopo', () => {
    const raiz = montar('<span v-t="\'comum.\' + qual"></span>', { qual: 'salvar' });
    expect(raiz.textContent).toBe('Salvar');
  });

  it('expressao que nao devolve texto e usada como chave literal', () => {
    const raiz = montar('<span v-t="1 + 1"></span>');
    expect(raiz.textContent).toBe('1 + 1');
  });

  it('v-t-params alimenta a interpolacao e a pluralizacao', async () => {
    const raiz = montar('<span v-t="itens" v-t-params="{ n: carrinho }"></span>', { carrinho: 3 });
    expect(raiz.textContent).toBe('3 itens');
  });

  it('v-t-params que nao e objeto e ignorado', () => {
    const raiz = montar('<span v-t="itens" v-t-params="42"></span>');
    expect(raiz.textContent).toBe('nenhum item');
  });

  it('expressao vazia nao mexe no elemento', () => {
    const raiz = montar('<span v-t="">original</span>');
    expect(raiz.textContent).toBe('original');
  });
});

describe('directive v-locale', () => {
  it('o clique troca o idioma e marca o botao ativo', async () => {
    const raiz = montar('<button v-locale="en">EN</button><button v-locale="pt-BR">PT</button>');
    const [ingles, portugues] = Array.from(raiz.querySelectorAll('button'));

    expect(portugues.classList.contains('v-locale-active')).toBe(true);
    expect(ingles.classList.contains('v-locale-active')).toBe(false);

    ingles.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(getLocale()).toBe('en');
    expect(ingles.classList.contains('v-locale-active')).toBe(true);
    expect(portugues.classList.contains('v-locale-active')).toBe(false);
  });

  it('aceita sublinhado no lugar do hifen', async () => {
    const raiz = montar('<button v-locale="pt_PT"></button>');
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('pt-PT');
  });

  it('o idioma tambem pode vir de uma expressao', async () => {
    const raiz = montar('<button v-locale="escolhido"></button>', { escolhido: 'en' });
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('en');
  });

  it('expressao vazia nao troca nada', async () => {
    const raiz = montar('<button v-locale="  "></button>');
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('pt-BR');
  });

  it('a limpeza remove o ouvinte de clique', async () => {
    const raiz = montar('<button v-locale="en"></button>');
    const botao = raiz.querySelector('button') as HTMLElement;
    destroy(raiz);

    botao.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(getLocale()).toBe('pt-BR');
  });
});

describe('variaveis magicas', () => {
  it('$t, $n, $c, $d, $rt e $i18n estao disponiveis nas expressoes', () => {
    const raiz = montar(
      '<span>{ $t("comum.salvar") }</span>' +
        '<b>{ $n(1234.5) }</b>' +
        '<i>{ typeof $c === "function" }</i>' +
        '<u>{ typeof $d === "function" }</u>' +
        '<s>{ typeof $rt === "function" }</s>' +
        '<em>{ $i18n.locale }</em>'
    );
    expect(raiz.querySelector('span')?.textContent).toBe('Salvar');
    expect(raiz.querySelector('b')?.textContent).toBe('1.234,5');
    expect(raiz.querySelector('i')?.textContent).toBe('true');
    expect(raiz.querySelector('u')?.textContent).toBe('true');
    expect(raiz.querySelector('s')?.textContent).toBe('true');
    expect(raiz.querySelector('em')?.textContent).toBe('pt-BR');
  });

  it('a API tambem responde como metodos do proprio i18n', () => {
    expect(i18n.t('comum.salvar')).toBe('Salvar');
    expect(i18n.te('comum.salvar')).toBe(true);
    expect(i18n.getLocale()).toBe('pt-BR');
    expect(i18n.messagesOf('en')).toBeTruthy();
    expect(typeof i18n.detectLocale).toBe('function');
    // Chamar como funcao devolve a propria API, para encadear.
    expect(i18n({ persist: CHAVE_PADRAO, detect: false } as never)).toBe(i18n);
  });
});
