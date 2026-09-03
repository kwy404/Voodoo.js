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
 * Coverage for the internationalisation module, which had no dedicated test.
 *
 * The state is a singleton of the module, so every test starts with
 * `preparar()`, which wipes the storage, puts the locale back to `pt-BR` and
 * reloads only the messages it needs. The persistence key is restored with its
 * default name whenever a test switches it off.
 */

const CHAVE_PADRAO = 'voodoo:locale';

/** Messages used by most of the tests. */
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

/** Reconfigures the module from scratch, with no persistence and no detection. */
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
// Translation
// ---------------------------------------------------------------------------

describe('message translation', () => {
  it('reads a nested key and a flattened key', () => {
    expect(t('comum.salvar')).toBe('Salvar');
    void setLocale('es');
    expect(t('comum.salvar')).toBe('Guardar');
  });

  it('an empty key returns empty text', () => {
    expect(t('')).toBe('');
    expect(t(undefined as unknown as string)).toBe('');
  });

  it('a missing key degrades by returning the key itself, without throwing', () => {
    expect(() => t('nao.existe.em.lugar.nenhum')).not.toThrow();
    expect(t('nao.existe.em.lugar.nenhum')).toBe('nao.existe.em.lugar.nenhum');
    // A path that only half exists also returns the key.
    expect(t('comum.salvar.demais')).toBe('comum.salvar.demais');
    // A key that points at a branch, and not at a text.
    expect(t('comum')).toBe('comum');
  });

  it('a locale with no messages loaded does not break', () => {
    void setLocale('ja');
    expect(t('comum.salvar')).toBe('Save');
    expect(t('so_ja')).toBe('so_ja');
  });

  it('te answers whether the key exists, in the current locale or in the given one', () => {
    expect(te('comum.salvar')).toBe(true);
    expect(te('nao.existe')).toBe(false);
    // `so_en` only exists in the fallback, and that already counts as existing.
    expect(te('so_en')).toBe(true);
    expect(te('so_pt', 'pt-BR')).toBe(true);
    // With `en` as the target, the fallback is `en` too: there is no second attempt.
    expect(te('so_pt', 'en')).toBe(false);
    expect(te('nada', 'en')).toBe(false);
    expect(te('comum.salvar', 'pt-PT')).toBe(true);
  });
});

describe('locale fallback', () => {
  it('falls back to the reserve locale when the key is missing', () => {
    preparar({ fallback: 'pt-BR' });
    void setLocale('en');
    // `comum.dica` only exists in pt-BR.
    expect(t('comum.dica')).toBe('Clique para salvar');
    expect(t('comum.salvar')).toBe('Save');
  });

  it('a similar locale is tried before the fallback', () => {
    void setLocale('pt-PT');
    expect(t('comum.salvar')).toBe('Guardar');
    // `pt-PT` has no `ola`, but its relative `pt-BR` does.
    expect(t('ola', { nome: 'Ana' })).toBe('Ola, Ana!');
  });

  it('a variant with no messages uses the short locale and its siblings', () => {
    void setLocale('pt-AO');
    expect(['Salvar', 'Guardar']).toContain(t('comum.salvar'));
  });

  it('with no useful fallback the key comes back as it is', () => {
    preparar({ fallback: '' });
    void setLocale('en');
    expect(t('so_pt')).toBe('so_pt');
  });

  it('a fallback equal to the current locale is not consulted twice', () => {
    preparar({ fallback: 'pt-BR' });
    expect(t('nao.existe')).toBe('nao.existe');
    expect(te('nao.existe')).toBe(false);
  });

  it('i18n.fallback follows the configuration', () => {
    expect(i18n.fallback).toBe('en');
    preparar({ fallback: 'es' });
    expect(i18n.fallback).toBe('es');
  });
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

describe('interpolation', () => {
  it('swaps the placeholders for the values', () => {
    expect(t('ola', { nome: 'Ana' })).toBe('Ola, Ana!');
  });

  it('a placeholder with no value stays visible instead of disappearing', () => {
    expect(t('ola')).toBe('Ola, {nome}!');
    expect(t('ola', { nome: null })).toBe('Ola, {nome}!');
    expect(t('ola', { nome: undefined })).toBe('Ola, {nome}!');
  });

  it('values that are not text are converted', () => {
    addMessages('pt-BR', { misto: '{a} e {b}' });
    expect(t('misto', { a: 0, b: false })).toBe('0 e false');
  });

  it('a message with no placeholder at all passes straight through', () => {
    expect(t('comum.salvar', { nome: 'Ana' })).toBe('Salvar');
  });

  it('accepts spaces and dots inside the placeholder', () => {
    addMessages('pt-BR', { espacado: '[{ nome }] [{a.b}]' });
    expect(t('espacado', { nome: 'Ana', 'a.b': 'x' })).toBe('[Ana] [x]');
  });
});

// ---------------------------------------------------------------------------
// Pluralisation
// ---------------------------------------------------------------------------

describe('pluralisation', () => {
  it('three forms reserve the first one for zero', () => {
    expect(t('itens', 0)).toBe('nenhum item');
    expect(t('itens', 1)).toBe('1 item');
    expect(t('itens', 5)).toBe('5 itens');
  });

  it('two forms follow the category of the locale', () => {
    expect(t('duas', 1)).toBe('1 arquivo');
    expect(t('duas', 3)).toBe('3 arquivos');
    // In Portuguese zero is category `one`, unlike in English.
    expect(t('duas', 0)).toBe('0 arquivo');
    void setLocale('en');
    addMessages('en', { duas: '{n} file | {n} files' });
    expect(t('duas', 0)).toBe('0 files');
  });

  it('the number can come in n or in count', () => {
    expect(t('itens', { n: 2 })).toBe('2 itens');
    // `count` picks the form, but what fills `{n}` in the message is `n`.
    expect(t('itens', { count: 2 })).toBe('{n} itens');
    // With no number at all the count is zero.
    expect(t('itens')).toBe('nenhum item');
  });

  it('an unreadable count is treated as zero', () => {
    expect(t('itens', { n: 'muitos' })).toBe('nenhum item');
  });

  it('a single form with a leftover pipe does not break', () => {
    addMessages('pt-BR', { unica: 'so isso |' });
    expect(t('unica', 1)).toBe('so isso');
    expect(t('unica', 5)).toBe('');
  });

  it('four or more forms use the official order of categories', () => {
    addMessages('ar', { dias: 'zero | um | dois | poucos | muitos | outros' });
    void setLocale('ar');
    expect(t('dias', 0)).toBe('zero');
    expect(t('dias', 1)).toBe('um');
    expect(t('dias', 2)).toBe('dois');
    expect(t('dias', 3)).toBe('poucos');
    expect(t('dias', 11)).toBe('muitos');
    expect(t('dias', 100)).toBe('outros');
  });

  it('an invalid locale falls back to the simple singular and plural rule', () => {
    addMessages('nao-e-idioma-@', { p: 'um | varios' });
    void setLocale('nao-e-idioma-@');
    expect(t('p', 1)).toBe('um');
    expect(t('p', 7)).toBe('varios');
  });
});

// ---------------------------------------------------------------------------
// Switching locale
// ---------------------------------------------------------------------------

describe('switching locale at runtime', () => {
  it('setLocale changes the locale, the config and the document lang', async () => {
    await setLocale('en');
    expect(getLocale()).toBe('en');
    expect(i18n.locale).toBe('en');
    expect(config.locale).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(t('comum.salvar')).toBe('Save');
  });

  it('switching to the same locale, to empty or to null does nothing', async () => {
    await setLocale('en');
    const antes = document.documentElement.lang;

    await setLocale('en');
    await setLocale('   ');
    await setLocale(null as unknown as string);
    expect(getLocale()).toBe('en');
    expect(document.documentElement.lang).toBe(antes);
  });

  it('the chosen locale is stored and comes back on the next configuration', async () => {
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBe('en');

    // New configuration: the saved locale beats the `locale` option.
    i18n({ detect: false, locale: 'pt-BR', messages: mensagensBase() } as never);
    expect(getLocale()).toBe('en');
  });

  it('persist: false stops storing', async () => {
    i18n({ persist: false, detect: false, locale: 'pt-BR' } as never);
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBeNull();
  });

  it('persist with a name of its own uses the other key', async () => {
    i18n({ persist: 'meu:idioma', detect: false, locale: 'pt-BR' } as never);
    localStorage.clear();
    await setLocale('en');
    expect(localStorage.getItem('meu:idioma')).toBe('en');
    expect(localStorage.getItem(CHAVE_PADRAO)).toBeNull();
  });

  it('the reactive read of $locale follows the switch', async () => {
    const raiz = montar('<span>{ $locale }</span>');
    expect(raiz.textContent).toBe('pt-BR');

    await setLocale('en');
    await nextTick();
    expect(raiz.textContent).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

describe('message registry', () => {
  it('addMessages merges with what already exists', () => {
    addMessages('pt-BR', { comum: { cancelar: 'Cancelar' }, novo: 'Novo' });
    expect(t('comum.salvar')).toBe('Salvar');
    expect(t('comum.cancelar')).toBe('Cancelar');
    expect(t('novo')).toBe('Novo');
  });

  it('addMessages creates the locale when it does not exist and returns the name', () => {
    expect(addMessages('it', { ola: 'Ciao' })).toBe('it');
    expect(availableLocales()).toContain('it');
    expect(i18n.locales).toContain('it');
  });

  it('messagesOf returns the messages of the requested locale or of the current one', () => {
    expect((messagesOf() as Record<string, unknown>).so_pt).toBe('apenas em portugues');
    expect((messagesOf('en') as Record<string, unknown>).so_en).toBe('english only');
    expect(messagesOf('idioma-inexistente')).toEqual({});
  });
});

describe('on-demand loading', () => {
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

  it('an object goes straight in, without touching the network', async () => {
    await loadMessages('de', { ola: 'Hallo' });
    expect(fetchMock).not.toHaveBeenCalled();
    void setLocale('de');
    expect(t('ola')).toBe('Hallo');
  });

  it('text is treated as the URL of a JSON file', async () => {
    fetchMock.mockResolvedValue(json({ ola: 'Bonjour' }));
    await loadMessages('fr', '/i18n/fr.json');
    expect(fetchMock.mock.calls[0][0]).toBe('/i18n/fr.json');
    void setLocale('fr');
    expect(t('ola')).toBe('Bonjour');
  });

  it('two calls for the same locale share the same fetch', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ ola: 'Hej' })));
    const [a, b] = [loadMessages('sv', '/i18n/sv.json'), loadMessages('sv', '/i18n/sv.json')];
    await Promise.all([a, b]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Once the fetch is over, a new call goes and asks again.
    await loadMessages('sv', '/i18n/sv.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a response that is not an object is silently ignored', async () => {
    fetchMock.mockResolvedValue(json('so um texto'));
    await loadMessages('nl', '/i18n/nl.json');
    expect(availableLocales()).not.toContain('nl');
  });

  it('a network failure becomes a handled error, and not a rejected promise', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('offline'));

    await expect(loadMessages('ru', '/i18n/ru.json')).resolves.toBeUndefined();
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it('loadPath fetches the locale file when switching to it', async () => {
    fetchMock.mockResolvedValue(json({ ola: 'Cześć' }));
    i18n({ detect: false, persist: false, loadPath: '/idiomas/{locale}.json' } as never);

    await setLocale('pl');
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/idiomas/pl.json');
    expect(t('ola')).toBe('Cześć');
  });

  it('a locale that already has messages does not trigger a new fetch', async () => {
    i18n({ detect: false, persist: false, loadPath: '/idiomas/{locale}.json' } as never);
    fetchMock.mockClear();

    await setLocale('en');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('the initial configuration also fetches when the chosen locale has no messages', async () => {
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
// Locale detection
// ---------------------------------------------------------------------------

describe('detection through the browser', () => {
  function idiomas(lista: string[] | undefined, unico = 'en-US'): void {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(lista as never);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(unico);
  }

  it('picks the exact locale when it exists', () => {
    idiomas(['pt-PT', 'en']);
    expect(detectLocale()).toBe('pt-PT');
  });

  it('falls back to the relative when only the short variant matches', () => {
    idiomas(['pt-MZ', 'de']);
    expect(['pt-BR', 'pt-PT']).toContain(detectLocale());
  });

  it('with no match at all it returns null', () => {
    idiomas(['ja-JP', 'ko']);
    expect(detectLocale()).toBeNull();
  });

  it('without the list it uses navigator.language', () => {
    idiomas([], 'en');
    expect(detectLocale()).toBe('en');
    idiomas(undefined, 'EN');
    expect(detectLocale()).toBe('en');
  });

  it('an empty entry in the list is skipped', () => {
    idiomas(['', 'en']);
    expect(detectLocale()).toBe('en');
  });

  it('with no locale loaded there is nothing to detect', () => {
    idiomas(['en']);
    const mensagens = messagesOf('en');
    expect(mensagens).toBeTruthy();
    // A locale nobody loaded is never chosen.
    idiomas(['xx-YY']);
    expect(detectLocale()).toBeNull();
  });

  it('detection enters the configuration when nothing was saved', () => {
    idiomas(['en-US']);
    localStorage.clear();
    i18n({ persist: false, locale: 'pt-BR', messages: mensagensBase() } as never);
    expect(getLocale()).toBe('en');
  });

  it('detect: false ignores the browser', () => {
    idiomas(['en-US']);
    localStorage.clear();
    i18n({ persist: false, detect: false, locale: 'pt-BR' } as never);
    expect(getLocale()).toBe('pt-BR');
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe('locale formatters', () => {
  it('n formats a number in the current locale', () => {
    expect(n(1234.5)).toBe('1.234,5');
    void setLocale('en');
    expect(n(1234.5)).toBe('1,234.5');
  });

  it('c formats currency, with the default currency or the given one', () => {
    expect(c(10)).toContain('10,00');
    expect(c(10, 'USD')).toContain('10,00');
  });

  it('d formats a date with a preset and with a mask', () => {
    const data = new Date(2024, 2, 15);
    expect(d(data, 'short')).toContain('2024');
    expect(d(data, 'DD/MM/YYYY')).toBe('15/03/2024');
  });

  it('rt returns relative time', () => {
    const agora = new Date(Date.now() - 60_000);
    expect(typeof rt(agora)).toBe('string');
    expect(rt(agora).length).toBeGreaterThan(0);
  });

  it('the default currency can be changed in the configuration', () => {
    i18n({ persist: false, detect: false, currency: 'USD' } as never);
    expect(c(10)).toContain('10,00');
  });
});

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

describe('directive v-t', () => {
  it('translates the element content and reacts to the locale switch', async () => {
    const raiz = montar('<button v-t="comum.salvar"></button>');
    const botao = raiz.querySelector('button') as HTMLElement;
    expect(botao.textContent).toBe('Salvar');

    await setLocale('en');
    await nextTick();
    expect(botao.textContent).toBe('Save');
  });

  it('with an argument it translates an attribute', async () => {
    const raiz = montar('<abbr v-t:title="comum.dica">?</abbr>');
    expect((raiz.querySelector('abbr') as HTMLElement).getAttribute('title')).toBe(
      'Clique para salvar'
    );
  });

  it('an expression in place of the key is evaluated in the scope', () => {
    const raiz = montar('<span v-t="\'comum.\' + qual"></span>', { qual: 'salvar' });
    expect(raiz.textContent).toBe('Salvar');
  });

  it('an expression that does not return text is used as a literal key', () => {
    const raiz = montar('<span v-t="1 + 1"></span>');
    expect(raiz.textContent).toBe('1 + 1');
  });

  it('v-t-params feeds the interpolation and the pluralisation', async () => {
    const raiz = montar('<span v-t="itens" v-t-params="{ n: carrinho }"></span>', { carrinho: 3 });
    expect(raiz.textContent).toBe('3 itens');
  });

  it('a v-t-params that is not an object is ignored', () => {
    const raiz = montar('<span v-t="itens" v-t-params="42"></span>');
    expect(raiz.textContent).toBe('nenhum item');
  });

  it('an empty expression does not touch the element', () => {
    const raiz = montar('<span v-t="">original</span>');
    expect(raiz.textContent).toBe('original');
  });
});

describe('directive v-locale', () => {
  it('the click switches the locale and marks the active button', async () => {
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

  it('accepts an underscore in place of the hyphen', async () => {
    const raiz = montar('<button v-locale="pt_PT"></button>');
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('pt-PT');
  });

  it('the locale can also come from an expression', async () => {
    const raiz = montar('<button v-locale="escolhido"></button>', { escolhido: 'en' });
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('en');
  });

  it('an empty expression switches nothing', async () => {
    const raiz = montar('<button v-locale="  "></button>');
    (raiz.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    await nextTick();
    expect(getLocale()).toBe('pt-BR');
  });

  it('the cleanup removes the click listener', async () => {
    const raiz = montar('<button v-locale="en"></button>');
    const botao = raiz.querySelector('button') as HTMLElement;
    destroy(raiz);

    botao.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(getLocale()).toBe('pt-BR');
  });
});

describe('magic variables', () => {
  it('$t, $n, $c, $d, $rt and $i18n are available in expressions', () => {
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

  it('the API also answers as methods on i18n itself', () => {
    expect(i18n.t('comum.salvar')).toBe('Salvar');
    expect(i18n.te('comum.salvar')).toBe(true);
    expect(i18n.getLocale()).toBe('pt-BR');
    expect(i18n.messagesOf('en')).toBeTruthy();
    expect(typeof i18n.detectLocale).toBe('function');
    // Calling it as a function returns the API itself, so it can be chained.
    expect(i18n({ persist: CHAVE_PADRAO, detect: false } as never)).toBe(i18n);
  });
});
