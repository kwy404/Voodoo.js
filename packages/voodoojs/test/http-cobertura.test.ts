import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, request, HttpError, clearCache, flushOfflineQueue } from '../src/http';
import { createResource, pick, extractMessage } from '../src/http/resource';

/**
 * Continuation of `http.test.ts`. This is where the paths the original test
 * does not visit live: interceptors and their removal, cache expiry, the
 * offline queue, upload, SSE, streaming, every `responseType`, a malformed
 * body and cancellation.
 *
 * The focus is branches, not lines: every `if`, `??` and `catch` that nobody
 * was exercising.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Synthetic response. The environment's `new Response` does not deliver `blob`,
 * `arrayBuffer` and `formData` reliably under jsdom, so the `responseType`
 * tests use an object with the same surface that `parseResponse` touches.
 */
function respostaFalsa(overrides: Partial<Record<string, unknown>> = {}): Response {
  return {
    status: 200,
    statusText: 'OK',
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn(async () => ({ tipo: 'json' })),
    text: vi.fn(async () => 'texto'),
    blob: vi.fn(async () => 'blob-falso'),
    arrayBuffer: vi.fn(async () => 'buffer-falso'),
    formData: vi.fn(async () => 'formdata-falso'),
    ...overrides,
  } as unknown as Response;
}

/** Streaming response that delivers the given chunks, one per read. */
function respostaStream(pedacos: string[]): Response {
  const codificador = new TextEncoder();
  let i = 0;
  return {
    status: 200,
    ok: true,
    headers: new Headers(),
    body: {
      getReader: () => ({
        read: async (): Promise<{ done: boolean; value?: Uint8Array }> =>
          i < pedacos.length
            ? { done: false, value: codificador.encode(pedacos[i++]) }
            : { done: true, value: undefined },
      }),
    },
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  http.setBaseURL('');
  clearCache();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  http.setBaseURL('');
  clearCache();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// URL assembly
// ---------------------------------------------------------------------------

describe('URL assembly with params', () => {
  it('drops null, undefined and empty text, but keeps zero and false', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/busca', {
      params: {
        q: 'x',
        nulo: null,
        indefinido: undefined,
        vazio: '',
        zero: 0,
        marcado: false,
      },
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/busca?q=x&zero=0&marcado=false');
  });

  it('with no useful pair it does not append the question mark', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/limpo', { params: { a: null, b: '' } });
    expect(fetchMock.mock.calls[0][0]).toBe('/limpo');
  });

  it('a baseURL with a trailing slash does not produce a double slash', async () => {
    http.setBaseURL('https://api.exemplo.com/');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('users');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.exemplo.com/users');
  });

  it('a URL starting with // is treated as absolute', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('//cdn.exemplo.com/logo.png');
    expect(fetchMock.mock.calls[0][0]).toBe('//cdn.exemplo.com/logo.png');
  });
});

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

describe('body preparation', () => {
  it('FormData goes as it is, with no manual Content-Type', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const form = new FormData();
    form.append('nome', 'Ana');
    await http.post('/x', form);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBe(form);
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('URLSearchParams and text also pass through untouched', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const params = new URLSearchParams({ a: '1' });
    await http.post('/a', params);
    expect(fetchMock.mock.calls[0][1].body).toBe(params);

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/b', 'texto puro');
    expect(fetchMock.mock.calls[1][1].body).toBe('texto puro');
  });

  it('Blob and ArrayBuffer pass through untouched', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const blob = new Blob(['abc']);
    await http.post('/blob', blob);
    expect(fetchMock.mock.calls[0][1].body).toBe(blob);

    fetchMock.mockResolvedValue(jsonResponse({}));
    const buffer = new ArrayBuffer(4);
    await http.post('/buffer', buffer);
    expect(fetchMock.mock.calls[1][1].body).toBe(buffer);
  });

  it('a Content-Type declared by the caller is respected', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', { a: 1 }, { headers: { 'Content-Type': 'application/ld+json' } });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/ld+json');
  });

  it('GET and HEAD never carry a body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request({ url: '/x', method: 'GET', body: { a: 1 } });
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.head('/y');
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].method).toBe('HEAD');
  });

  it('put and patch arrive with the right verb', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await http.put('/p', { a: 1 });
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');

    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await http.patch('/p', { a: 1 });
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
  });
});

// ---------------------------------------------------------------------------
// Reading the response
// ---------------------------------------------------------------------------

describe('responseType', () => {
  it('each variant calls the matching reader', async () => {
    for (const [tipo, esperado] of [
      ['json', { tipo: 'json' }],
      ['text', 'texto'],
      ['blob', 'blob-falso'],
      ['arrayBuffer', 'buffer-falso'],
      ['formData', 'formdata-falso'],
    ] as const) {
      fetchMock.mockResolvedValueOnce(respostaFalsa());
      const dados = await http.get(`/${tipo}`, { responseType: tipo });
      expect(dados).toEqual(esperado);
    }
  });

  it('auto recognises the +json suffix', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"a":1}', { headers: { 'content-type': 'application/vnd.api+json' } })
    );
    expect(await http.get('/x')).toEqual({ a: 1 });
  });

  it('auto with an empty JSON body returns null instead of blowing up', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { headers: { 'content-type': 'application/json' } })
    );
    expect(await http.get('/vazio')).toBeNull();
  });

  it('malformed JSON becomes a network error, not a silent response', async () => {
    fetchMock.mockResolvedValue(
      new Response('{quebrado', { headers: { 'content-type': 'application/json' } })
    );
    await expect(http.get('/quebrado')).rejects.toBeInstanceOf(HttpError);
  });

  it('a response with no content-type falls back to text', async () => {
    fetchMock.mockResolvedValue(new Response('so texto'));
    expect(await http.get('/x')).toBe('so texto');
  });

  it('205 also returns null', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 205 }));
    const resposta = await request({ url: '/x', method: 'DELETE' });
    expect(resposta.data).toBeNull();
    expect(resposta.status).toBe(205);
  });
});

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

describe('default headers', () => {
  afterEach(() => {
    http.setHeader('X-Tenant', null);
    http.setToken(null);
  });

  it('setHeader sets and removes', async () => {
    http.setHeader('X-Tenant', 'acme');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Tenant']).toBe('acme');

    http.setHeader('X-Tenant', null);
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[1][1].headers['X-Tenant']).toBeUndefined();
  });

  it('setToken accepts another scheme and removes with null', async () => {
    http.setToken('abc', 'Token');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Token abc');

    http.setToken(null);
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('an X-Requested-With declared by the caller is not overwritten', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x', { headers: { 'X-Requested-With': 'proprio' } });
    expect(fetchMock.mock.calls[0][1].headers['X-Requested-With']).toBe('proprio');
  });
});

describe('CSRF token', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'segredo';
    document.head.appendChild(meta);
  });

  afterEach(() => meta.remove());

  it('does not go on GET or on HEAD', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBeUndefined();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.head('/x');
    expect(fetchMock.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBeUndefined();
  });

  it('a value declared by the caller beats the one on the meta tag', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', {}, { headers: { 'X-CSRF-TOKEN': 'manual' } });
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBe('manual');
  });

  it('a meta with no content attribute does not add the header', async () => {
    meta.removeAttribute('content');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', {});
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

describe('cache with expiry', () => {
  it('after the deadline the request is made again', async () => {
    const agora = vi.spyOn(Date, 'now');
    agora.mockReturnValue(1_000);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ n: 1 })));

    await http.get('/expira', { cache: 100 });
    agora.mockReturnValue(1_050);
    await http.get('/expira', { cache: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Exactly at the limit the entry already counts as expired.
    agora.mockReturnValue(1_100);
    await http.get('/expira', { cache: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('the key includes the params, so a different query does not reuse it', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.get('/itens', { cache: 5_000, params: { p: 1 } });
    await http.get('/itens', { cache: 5_000, params: { p: 2 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearCache with text erases only what contains the fragment', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.get('/api/users', { cache: 5_000 });
    await http.get('/api/posts', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clearCache('/api/users');
    await http.get('/api/users', { cache: 5_000 });
    await http.get('/api/posts', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clearCache with a regex erases the whole group that matches', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.get('/api/v1/a', { cache: 5_000 });
    await http.get('/api/v2/b', { cache: 5_000 });
    await http.get('/outro/c', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    clearCache(/\/api\/v\d\//);
    await http.get('/api/v1/a', { cache: 5_000 });
    await http.get('/api/v2/b', { cache: 5_000 });
    await http.get('/outro/c', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('an error response does not enter the cache', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 404)));
    await expect(http.get('/faltando', { cache: 5_000 })).rejects.toBeInstanceOf(HttpError);
    await expect(http.get('/faltando', { cache: 5_000 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------

describe('interceptors', () => {
  it('a request interceptor can be async and runs in a chain', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const soltarA = http.interceptors.request.use(async (config) => ({
      ...config,
      headers: { ...config.headers, 'X-A': '1' },
    }));
    const soltarB = http.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, 'X-B': '2' },
    }));

    await http.get('/x');
    const enviados = fetchMock.mock.calls[0][1].headers;
    expect(enviados['X-A']).toBe('1');
    expect(enviados['X-B']).toBe('2');

    soltarA();
    soltarB();
  });

  it('removing the request interceptor stops it being applied', async () => {
    const soltar = http.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, 'X-Ida': '1' },
    }));
    soltar();
    // Removing it twice must neither blow up nor take another one off the list.
    soltar();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Ida']).toBeUndefined();
  });

  it('removing the response interceptor stops it transforming', async () => {
    const soltar = http.interceptors.response.use((resposta) => ({
      ...resposta,
      data: { trocado: true },
    }));
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ original: true })));
    expect(await http.get('/x')).toEqual({ trocado: true });

    soltar();
    soltar();
    expect(await http.get('/x')).toEqual({ original: true });
  });

  it('removing the error interceptor stops it observing', async () => {
    const espiao = vi.fn();
    const soltar = http.interceptors.error.use(espiao);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));

    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(espiao).toHaveBeenCalledTimes(1);

    soltar();
    soltar();
    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(espiao).toHaveBeenCalledTimes(1);
  });

  it('the error interceptor also sees a network failure, with no response', async () => {
    const vistos: HttpError[] = [];
    const soltar = http.interceptors.error.use((err) => {
      vistos.push(err);
    });
    fetchMock.mockRejectedValue(new TypeError('offline'));

    await expect(http.get('/x')).rejects.toBeInstanceOf(HttpError);
    expect(vistos).toHaveLength(1);
    expect(vistos[0].isNetworkError).toBe(true);
    expect(vistos[0].status).toBe(0);
    soltar();
  });

  it('the response interceptor only runs on the success path', async () => {
    const espiao = vi.fn((resposta) => resposta);
    const soltar = http.interceptors.response.use(espiao);
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(espiao).not.toHaveBeenCalled();
    soltar();
  });
});

// ---------------------------------------------------------------------------
// Timeout and cancellation
// ---------------------------------------------------------------------------

describe('timeout and cancellation', () => {
  /** A fetch that only finishes when the signal is aborted, like the real one. */
  function fetchPendente(): void {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const sinal = init.signal as AbortSignal | undefined;
          const recusar = (): void => {
            reject(sinal?.reason ?? new DOMException('abort', 'AbortError'));
          };
          if (sinal?.aborted) {
            recusar();
            return;
          }
          sinal?.addEventListener('abort', recusar);
        })
    );
  }

  it('running out of time produces a timed-out message', async () => {
    fetchPendente();
    try {
      await request({ url: '/lento', timeout: 10, retry: 0 });
      expect.unreachable('deveria ter falhado');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).message).toBe('Timeout after 10ms');
      expect((err as HttpError).isNetworkError).toBe(true);
    }
  });

  it('a zero timeout switches the clock off', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const resposta = await request({ url: '/x', timeout: 0 });
    expect(resposta.data).toEqual({ ok: true });
  });

  it('an external signal already aborted does not even get to try again', async () => {
    fetchPendente();
    const controle = new AbortController();
    controle.abort();

    await expect(
      request({ url: '/x', signal: controle.signal, retry: 3, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    // A single fetch: the external abort interrupts the retry loop.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborting mid-request interrupts straight away', async () => {
    fetchPendente();
    const controle = new AbortController();
    const promessa = request({ url: '/x', signal: controle.signal, retry: 2, retryDelay: 1 });
    controle.abort();

    await expect(promessa).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a finished request releases the listener on the external signal', async () => {
    const controle = new AbortController();
    const soltar = vi.spyOn(controle.signal, 'removeEventListener');
    fetchMock.mockResolvedValue(jsonResponse({}));

    await request({ url: '/x', signal: controle.signal });
    expect(soltar).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// Offline queue
// ---------------------------------------------------------------------------

describe('offline queue', () => {
  const CHAVE = 'voodoo:offline-queue';
  let online: ReturnType<typeof vi.spyOn>;

  function ficarOffline(): void {
    online.mockReturnValue(false);
  }

  beforeEach(() => {
    online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('offline stores the request and returns a synthetic response', async () => {
    ficarOffline();
    const resposta = await request({
      url: '/api/notas',
      method: 'POST',
      body: { texto: 'oi' },
      offlineQueue: true,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resposta.status).toBe(0);
    expect(resposta.statusText).toBe('offline-queued');
    expect(resposta.ok).toBe(true);

    const fila = JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    expect(fila).toHaveLength(1);
    expect(fila[0].url).toBe('/api/notas');
    expect(fila[0].method).toBe('POST');
  });

  it('an offline GET does not enter the queue, it goes straight to the network', async () => {
    ficarOffline();
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.get('/api/notas', { offlineQueue: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHAVE)).toBeNull();
  });

  it('normal online ignores the queue', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.post('/api/notas', { a: 1 }, { offlineQueue: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('flushing the queue resends everything in order and empties it', async () => {
    ficarOffline();
    await request({ url: '/a', method: 'POST', body: { i: 1 }, offlineQueue: true });
    await request({ url: '/b', method: 'PUT', body: { i: 2 }, offlineQueue: true });

    online.mockReturnValue(true);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    expect(await flushOfflineQueue()).toBe(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/a', '/b']);
    expect(JSON.parse(localStorage.getItem(CHAVE) ?? '[]')).toEqual([]);
  });

  it('an empty queue flushes zero without touching the network', async () => {
    expect(await flushOfflineQueue()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('corrupted content in storage does not bring the flush down', async () => {
    localStorage.setItem(CHAVE, '{isso nao e json');
    expect(await flushOfflineQueue()).toBe(0);
  });

  /**
   * Regression: before, a failure on the first item put only that item back in
   * the queue, and the items after it, which were never even attempted,
   * disappeared for good. Because the flush starts by writing an empty queue,
   * everything that came after the item that failed was silently lost.
   */
  it('a failure in the middle puts back the item that failed and the ones still pending', async () => {
    ficarOffline();
    await request({ url: '/a', method: 'POST', body: { i: 1 }, offlineQueue: true });
    await request({ url: '/b', method: 'POST', body: { i: 2 }, offlineQueue: true });
    await request({ url: '/c', method: 'POST', body: { i: 3 }, offlineQueue: true });

    online.mockReturnValue(true);
    fetchMock.mockImplementation((url: string) =>
      url === '/b'
        ? Promise.reject(new TypeError('caiu'))
        : Promise.resolve(jsonResponse({ ok: true }))
    );

    expect(await flushOfflineQueue()).toBe(1);
    const restante = JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as Array<{ url: string }>;
    expect(restante.map((item) => item.url)).toEqual(['/b', '/c']);
  });

  it('storage blocked on write does not propagate an exception', async () => {
    ficarOffline();
    const gravar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    await expect(
      request({ url: '/a', method: 'POST', body: {}, offlineQueue: true })
    ).resolves.toMatchObject({ statusText: 'offline-queued' });
    gravar.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

interface OuvintesFalsos {
  [tipo: string]: Array<(evento: unknown) => void>;
}

class XHRFalso {
  static ultimo: XHRFalso | null = null;

  status = 200;
  responseText = '';
  metodo = '';
  url = '';
  enviado: unknown = null;
  abortado = false;
  cabecalhos: Record<string, string> = {};
  respostaCabecalhos: Record<string, string> = { 'content-type': 'application/json' };

  private ouvintes: OuvintesFalsos = {};
  private ouvintesUpload: OuvintesFalsos = {};

  upload = {
    addEventListener: (tipo: string, fn: (evento: unknown) => void): void => {
      (this.ouvintesUpload[tipo] ??= []).push(fn);
    },
  };

  constructor() {
    XHRFalso.ultimo = this;
  }

  open(metodo: string, url: string): void {
    this.metodo = metodo;
    this.url = url;
  }

  setRequestHeader(nome: string, valor: string): void {
    this.cabecalhos[nome] = valor;
  }

  getResponseHeader(nome: string): string | null {
    return this.respostaCabecalhos[nome.toLowerCase()] ?? null;
  }

  addEventListener(tipo: string, fn: (evento: unknown) => void): void {
    (this.ouvintes[tipo] ??= []).push(fn);
  }

  send(corpo: unknown): void {
    this.enviado = corpo;
  }

  abort(): void {
    this.abortado = true;
    this.emitir('abort');
  }

  emitir(tipo: string, evento: unknown = {}): void {
    for (const fn of this.ouvintes[tipo] ?? []) fn(evento);
  }

  emitirProgresso(evento: unknown): void {
    for (const fn of this.ouvintesUpload.progress ?? []) fn(evento);
  }
}

describe('upload', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    XHRFalso.ultimo = null;
    globalThis.XMLHttpRequest = XHRFalso as unknown as typeof XMLHttpRequest;
    meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'segredo';
    document.head.appendChild(meta);
  });

  afterEach(() => meta.remove());

  it('sends the FormData, the CSRF and never the Content-Type', async () => {
    http.setBaseURL('https://api.exemplo.com');
    const dados = new FormData();
    const promessa = http.upload('/arquivos', dados, {
      headers: { 'Content-Type': 'multipart/form-data', 'X-Extra': 'sim' },
    });

    const xhr = XHRFalso.ultimo!;
    expect(xhr.metodo).toBe('POST');
    expect(xhr.url).toBe('https://api.exemplo.com/arquivos');
    expect(xhr.enviado).toBe(dados);
    expect(xhr.cabecalhos['Content-Type']).toBeUndefined();
    expect(xhr.cabecalhos['X-Extra']).toBe('sim');
    expect(xhr.cabecalhos['X-CSRF-TOKEN']).toBe('segredo');

    xhr.responseText = '{"id":1}';
    xhr.emitir('load');
    expect(await promessa).toEqual({ id: 1 });
  });

  it('reports progress only when the size is known', async () => {
    const progresso = vi.fn();
    const promessa = http.upload('/arquivos', new FormData(), {
      method: 'PUT',
      onProgress: progresso,
    });

    const xhr = XHRFalso.ultimo!;
    expect(xhr.metodo).toBe('PUT');

    xhr.emitirProgresso({ lengthComputable: false, loaded: 5, total: 10 });
    expect(progresso).not.toHaveBeenCalled();

    xhr.emitirProgresso({ lengthComputable: true, loaded: 25, total: 100 });
    expect(progresso).toHaveBeenCalledWith(25, 25, 100);

    xhr.responseText = '{}';
    xhr.emitir('load');
    await promessa;
  });

  it('a response with no JSON stays as text, and broken JSON too', async () => {
    const primeiro = http.upload('/a', new FormData());
    const xhrA = XHRFalso.ultimo!;
    xhrA.respostaCabecalhos = { 'content-type': 'text/plain' };
    xhrA.responseText = 'pronto';
    xhrA.emitir('load');
    expect(await primeiro).toBe('pronto');

    const segundo = http.upload('/b', new FormData());
    const xhrB = XHRFalso.ultimo!;
    xhrB.responseText = '{quebrado';
    xhrB.emitir('load');
    expect(await segundo).toBe('{quebrado');
  });

  it('a status outside the success range becomes an HttpError', async () => {
    const promessa = http.upload('/a', new FormData());
    const xhr = XHRFalso.ultimo!;
    xhr.status = 413;
    xhr.responseText = '{}';
    xhr.emitir('load');
    await expect(promessa).rejects.toThrow('Upload failed with status 413');
  });

  it('a network failure becomes an HttpError', async () => {
    const promessa = http.upload('/a', new FormData());
    XHRFalso.ultimo!.emitir('error');
    await expect(promessa).rejects.toThrow('Network failure during upload');
  });

  it('the signal cancels the send', async () => {
    const controle = new AbortController();
    const promessa = http.upload('/a', new FormData(), { signal: controle.signal });
    controle.abort();

    expect(XHRFalso.ultimo!.abortado).toBe(true);
    await expect(promessa).rejects.toThrow('Upload canceled');
  });
});

// ---------------------------------------------------------------------------
// SSE
// ---------------------------------------------------------------------------

class EventSourceFalso {
  static ultimo: EventSourceFalso | null = null;
  private ouvintes: OuvintesFalsos = {};

  constructor(public url: string) {
    EventSourceFalso.ultimo = this;
  }

  addEventListener(tipo: string, fn: (evento: unknown) => void): void {
    (this.ouvintes[tipo] ??= []).push(fn);
  }

  emitir(tipo: string, evento: unknown): void {
    for (const fn of this.ouvintes[tipo] ?? []) fn(evento);
  }

  contar(tipo: string): number {
    return (this.ouvintes[tipo] ?? []).length;
  }
}

describe('sse', () => {
  beforeEach(() => {
    EventSourceFalso.ultimo = null;
    (globalThis as { EventSource?: unknown }).EventSource =
      EventSourceFalso as unknown as typeof EventSource;
  });

  it('opens on the URL with the baseURL applied and converts the JSON', () => {
    http.setBaseURL('https://api.exemplo.com');
    const mensagens: unknown[] = [];
    const fonte = http.sse('/eventos', { message: (dados) => mensagens.push(dados) });

    const falso = fonte as unknown as EventSourceFalso;
    expect(falso.url).toBe('https://api.exemplo.com/eventos');

    falso.emitir('message', { data: '{"tick":1}' });
    expect(mensagens).toEqual([{ tick: 1 }]);
  });

  it('text that is not JSON arrives raw', () => {
    const mensagens: unknown[] = [];
    const fonte = http.sse('/eventos', { message: (dados) => mensagens.push(dados) });
    (fonte as unknown as EventSourceFalso).emitir('message', { data: 'ping' });
    expect(mensagens).toEqual(['ping']);
  });

  it('with no handlers nothing breaks, and the error one is only wired when it exists', () => {
    const semErro = http.sse('/a') as unknown as EventSourceFalso;
    expect(() => semErro.emitir('message', { data: 'x' })).not.toThrow();
    expect(semErro.contar('error')).toBe(0);

    const aoErrar = vi.fn();
    const comErro = http.sse('/b', { error: aoErrar }) as unknown as EventSourceFalso;
    expect(comErro.contar('error')).toBe(1);
    comErro.emitir('error', new Event('error'));
    expect(aoErrar).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Streaming NDJSON
// ---------------------------------------------------------------------------

describe('stream NDJSON', () => {
  it('joins the line split across two chunks', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['{"a":1}\n{"b":', '2}\n{"c":3}']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });

  it('blank lines are discarded and the final leftover is delivered', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['um\n\n   \ndois\n', 'tres']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['um', 'dois', 'tres']);
  });

  it('a final leftover of only whitespace does not become a line', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['um\n   ']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['um']);
  });

  it('a response with no body finishes without calling the callback', async () => {
    const aoLer = vi.fn();
    fetchMock.mockResolvedValue({ body: null } as unknown as Response);

    await http.stream('/fluxo', aoLer);
    expect(aoLer).not.toHaveBeenCalled();
  });

  it('passes params, headers and the signal on', async () => {
    fetchMock.mockResolvedValue(respostaStream([]));
    const controle = new AbortController();

    await http.stream('/fluxo', () => undefined, {
      params: { desde: 10, vazio: null },
      headers: { 'X-Fluxo': '1' },
      signal: controle.signal,
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/fluxo?desde=10');
    expect(options.headers['X-Fluxo']).toBe('1');
    expect(options.signal).toBe(controle.signal);
  });
});

// ---------------------------------------------------------------------------
// Reactive resource
// ---------------------------------------------------------------------------

describe('reactive resource', () => {
  it('pick walks the path and returns undefined on a missing node', () => {
    expect(pick({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(pick({ a: 1 }, null)).toEqual({ a: 1 });
    expect(pick({ a: null }, 'a.b')).toBeUndefined();
    expect(pick(null, 'a')).toBeUndefined();
  });

  it('extractMessage looks for the usual keys of an error body', () => {
    const comErro = (data: unknown): HttpError =>
      new HttpError('x', { data } as never, undefined, undefined);

    expect(extractMessage(comErro({ message: 'a' }))).toBe('a');
    expect(extractMessage(comErro({ detail: 'b' }))).toBe('b');
    expect(extractMessage(comErro({ msg: 'c' }))).toBe('c');
    expect(extractMessage(comErro({ outro: 'd' }))).toBeNull();
    expect(extractMessage(comErro('texto'))).toBeNull();
    expect(extractMessage(new HttpError('x'))).toBeNull();
  });

  it('loads on its own, slices by jsonPath and announces the success', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ dados: { itens: [1, 2] } }));
    const aoAcertar = vi.fn();
    const recurso = createResource('/api/itens', { jsonPath: 'dados.itens', onSuccess: aoAcertar });

    await vi.waitFor(() => expect(recurso.loaded).toBe(true));
    expect(recurso.data).toEqual([1, 2]);
    expect(recurso.loading).toBe(false);
    expect(recurso.error).toBeNull();
    expect(aoAcertar).toHaveBeenCalledWith([1, 2]);
  });

  it('manual fires nothing until the reload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));
    const recurso = createResource('/api/x', { manual: true });
    expect(fetchMock).not.toHaveBeenCalled();

    await recurso.reload();
    expect(recurso.data).toEqual({ a: 1 });
  });

  it('an empty URL postpones the request', async () => {
    let alvo = '';
    const recurso = createResource(() => alvo, { manual: true });
    await recurso.reload();
    expect(fetchMock).not.toHaveBeenCalled();

    alvo = '/api/x';
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));
    await recurso.reload();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('params given as a function are re-evaluated on every call', async () => {
    let pagina = 1;
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([])));
    const recurso = createResource('/api/itens', {
      manual: true,
      params: () => ({ pagina }),
      method: 'post',
    });

    await recurso.reload();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/itens?pagina=1');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');

    pagina = 2;
    await recurso.reload();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/itens?pagina=2');
  });

  it('an API error becomes a readable message in the state', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ message: 'Sem permissao' }, 403))
    );
    const aoErrar = vi.fn();
    const recurso = createResource('/api/x', { manual: true, onError: aoErrar });

    await recurso.reload();
    expect(recurso.error?.message).toBe('Sem permissao');
    expect(recurso.loading).toBe(false);
    expect(recurso.loaded).toBe(false);
    expect(aoErrar).toHaveBeenCalledWith(expect.any(HttpError), 'Sem permissao');
  });

  it('an error with no useful body falls back to the HttpError message itself', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    const recurso = createResource('/api/x', { manual: true });
    await recurso.reload();
    expect(recurso.error?.message).toBe('Request failed with status 500');
  });

  it('set swaps the data without going to the network', async () => {
    const recurso = createResource<{ n: number }>('/api/x', { manual: true });
    recurso.set({ n: 9 });
    expect(recurso.data).toEqual({ n: 9 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stop cancels what was in flight and switches the loading flag off', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('abort', 'AbortError'))
          );
        })
    );

    const recurso = createResource('/api/x', { manual: true });
    const promessa = recurso.reload();
    expect(recurso.loading).toBe(true);

    recurso.stop();
    await promessa;
    expect(recurso.loading).toBe(false);
    expect(recurso.error).toBeNull();
  });

  it('a reload cancels the previous one, and the late response does not overwrite', async () => {
    let resolverPrimeiro: ((r: Response) => void) | null = null;
    fetchMock
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((resolve, reject) => {
            resolverPrimeiro = resolve;
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('abort', 'AbortError'))
            );
          })
      )
      .mockImplementationOnce(() => Promise.resolve(jsonResponse({ ordem: 'segunda' })));

    const recurso = createResource('/api/x', { manual: true });
    const primeira = recurso.reload();
    const segunda = recurso.reload();

    resolverPrimeiro?.(jsonResponse({ ordem: 'primeira' }));
    await Promise.all([primeira, segunda]);
    expect(recurso.data).toEqual({ ordem: 'segunda' });
  });

  it('poll repeats while the tab is visible and stops on stop', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ n: 1 })));
      const visivel = vi.spyOn(document, 'visibilityState', 'get');
      const recurso = createResource('/api/x', { manual: true, poll: 50 });

      visivel.mockReturnValue('hidden');
      vi.advanceTimersByTime(60);
      expect(fetchMock).not.toHaveBeenCalled();

      visivel.mockReturnValue('visible');
      vi.advanceTimersByTime(60);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      recurso.stop();
      vi.advanceTimersByTime(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
