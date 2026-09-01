import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, request, HttpError, clearCache, flushOfflineQueue } from '../src/http';
import { createResource, pick, extractMessage } from '../src/http/resource';

/**
 * Continuacao de `http.test.ts`. Aqui ficam os caminhos que o teste original
 * nao visita: interceptadores e sua remocao, expiracao de cache, fila offline,
 * upload, SSE, streaming, cada `responseType`, corpo malformado e cancelamento.
 *
 * O foco e ramo, nao linha: cada `if`, `??` e `catch` que ninguem exercitava.
 */

// ---------------------------------------------------------------------------
// Ajudantes
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Resposta sintetica. `new Response` do ambiente nao entrega `blob`,
 * `arrayBuffer` e `formData` de forma confiavel no jsdom, entao os testes de
 * `responseType` usam um objeto com a mesma superficie que `parseResponse` toca.
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

/** Resposta em streaming que entrega os pedacos informados, um por leitura. */
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
// Montagem de URL
// ---------------------------------------------------------------------------

describe('montagem de URL com params', () => {
  it('descarta nulo, indefinido e texto vazio, mas mantem zero e false', async () => {
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

  it('sem nenhum par util nao acrescenta o ponto de interrogacao', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/limpo', { params: { a: null, b: '' } });
    expect(fetchMock.mock.calls[0][0]).toBe('/limpo');
  });

  it('baseURL com barra final nao gera barra dupla', async () => {
    http.setBaseURL('https://api.exemplo.com/');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('users');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.exemplo.com/users');
  });

  it('URL iniciada por // e tratada como absoluta', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('//cdn.exemplo.com/logo.png');
    expect(fetchMock.mock.calls[0][0]).toBe('//cdn.exemplo.com/logo.png');
  });
});

// ---------------------------------------------------------------------------
// Corpo da requisicao
// ---------------------------------------------------------------------------

describe('preparacao do corpo', () => {
  it('FormData vai como esta, sem Content-Type manual', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const form = new FormData();
    form.append('nome', 'Ana');
    await http.post('/x', form);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBe(form);
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  it('URLSearchParams e texto tambem passam intactos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const params = new URLSearchParams({ a: '1' });
    await http.post('/a', params);
    expect(fetchMock.mock.calls[0][1].body).toBe(params);

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/b', 'texto puro');
    expect(fetchMock.mock.calls[1][1].body).toBe('texto puro');
  });

  it('Blob e ArrayBuffer passam intactos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const blob = new Blob(['abc']);
    await http.post('/blob', blob);
    expect(fetchMock.mock.calls[0][1].body).toBe(blob);

    fetchMock.mockResolvedValue(jsonResponse({}));
    const buffer = new ArrayBuffer(4);
    await http.post('/buffer', buffer);
    expect(fetchMock.mock.calls[1][1].body).toBe(buffer);
  });

  it('Content-Type declarado por quem chama e respeitado', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', { a: 1 }, { headers: { 'Content-Type': 'application/ld+json' } });
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/ld+json');
  });

  it('GET e HEAD nunca levam corpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await request({ url: '/x', method: 'GET', body: { a: 1 } });
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.head('/y');
    expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].method).toBe('HEAD');
  });

  it('put e patch chegam com o verbo certo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await http.put('/p', { a: 1 });
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');

    fetchMock.mockResolvedValue(jsonResponse({ ok: 1 }));
    await http.patch('/p', { a: 1 });
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH');
  });
});

// ---------------------------------------------------------------------------
// Leitura da resposta
// ---------------------------------------------------------------------------

describe('responseType', () => {
  it('cada variante chama o leitor correspondente', async () => {
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

  it('auto reconhece sufixo +json', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"a":1}', { headers: { 'content-type': 'application/vnd.api+json' } })
    );
    expect(await http.get('/x')).toEqual({ a: 1 });
  });

  it('auto com corpo JSON vazio devolve null em vez de estourar', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { headers: { 'content-type': 'application/json' } })
    );
    expect(await http.get('/vazio')).toBeNull();
  });

  it('JSON malformado vira erro de rede, nao resposta silenciosa', async () => {
    fetchMock.mockResolvedValue(
      new Response('{quebrado', { headers: { 'content-type': 'application/json' } })
    );
    await expect(http.get('/quebrado')).rejects.toBeInstanceOf(HttpError);
  });

  it('resposta sem content-type cai para texto', async () => {
    fetchMock.mockResolvedValue(new Response('so texto'));
    expect(await http.get('/x')).toBe('so texto');
  });

  it('205 tambem devolve null', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 205 }));
    const resposta = await request({ url: '/x', method: 'DELETE' });
    expect(resposta.data).toBeNull();
    expect(resposta.status).toBe(205);
  });
});

// ---------------------------------------------------------------------------
// Cabecalhos
// ---------------------------------------------------------------------------

describe('cabecalhos padrao', () => {
  afterEach(() => {
    http.setHeader('X-Tenant', null);
    http.setToken(null);
  });

  it('setHeader define e remove', async () => {
    http.setHeader('X-Tenant', 'acme');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Tenant']).toBe('acme');

    http.setHeader('X-Tenant', null);
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[1][1].headers['X-Tenant']).toBeUndefined();
  });

  it('setToken aceita outro esquema e remove com null', async () => {
    http.setToken('abc', 'Token');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Token abc');

    http.setToken(null);
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('X-Requested-With declarado por quem chama nao e sobrescrito', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x', { headers: { 'X-Requested-With': 'proprio' } });
    expect(fetchMock.mock.calls[0][1].headers['X-Requested-With']).toBe('proprio');
  });
});

describe('token CSRF', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'segredo';
    document.head.appendChild(meta);
  });

  afterEach(() => meta.remove());

  it('nao vai em GET nem em HEAD', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBeUndefined();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.head('/x');
    expect(fetchMock.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBeUndefined();
  });

  it('valor declarado por quem chama vence o da meta', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', {}, { headers: { 'X-CSRF-TOKEN': 'manual' } });
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBe('manual');
  });

  it('meta sem atributo content nao adiciona o cabecalho', async () => {
    meta.removeAttribute('content');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', {});
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

describe('cache com expiracao', () => {
  it('depois do prazo a requisicao e refeita', async () => {
    const agora = vi.spyOn(Date, 'now');
    agora.mockReturnValue(1_000);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ n: 1 })));

    await http.get('/expira', { cache: 100 });
    agora.mockReturnValue(1_050);
    await http.get('/expira', { cache: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Exatamente no limite a entrada ja vale como vencida.
    agora.mockReturnValue(1_100);
    await http.get('/expira', { cache: 100 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a chave inclui os params, entao query diferente nao reaproveita', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.get('/itens', { cache: 5_000, params: { p: 1 } });
    await http.get('/itens', { cache: 5_000, params: { p: 2 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clearCache com texto apaga so o que contem o trecho', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.get('/api/users', { cache: 5_000 });
    await http.get('/api/posts', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clearCache('/api/users');
    await http.get('/api/users', { cache: 5_000 });
    await http.get('/api/posts', { cache: 5_000 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clearCache com regex apaga todo o grupo que casar', async () => {
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

  it('resposta de erro nao entra no cache', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 404)));
    await expect(http.get('/faltando', { cache: 5_000 })).rejects.toBeInstanceOf(HttpError);
    await expect(http.get('/faltando', { cache: 5_000 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Interceptadores
// ---------------------------------------------------------------------------

describe('interceptadores', () => {
  it('interceptador de requisicao pode ser assincrono e roda em cadeia', async () => {
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

  it('remover o interceptador de requisicao para de aplicar', async () => {
    const soltar = http.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, 'X-Ida': '1' },
    }));
    soltar();
    // Remover duas vezes nao pode explodir nem tirar outro da lista.
    soltar();

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Ida']).toBeUndefined();
  });

  it('remover o interceptador de resposta para de transformar', async () => {
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

  it('remover o interceptador de erro para de observar', async () => {
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

  it('o interceptador de erro tambem ve falha de rede, sem resposta', async () => {
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

  it('o interceptador de resposta so roda no caminho de sucesso', async () => {
    const espiao = vi.fn((resposta) => resposta);
    const soltar = http.interceptors.response.use(espiao);
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(espiao).not.toHaveBeenCalled();
    soltar();
  });
});

// ---------------------------------------------------------------------------
// Timeout e cancelamento
// ---------------------------------------------------------------------------

describe('timeout e cancelamento', () => {
  /** fetch que so termina quando o sinal for abortado, como o de verdade. */
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

  it('estourar o tempo produz mensagem de tempo esgotado', async () => {
    fetchPendente();
    try {
      await request({ url: '/lento', timeout: 10, retry: 0 });
      expect.unreachable('deveria ter falhado');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).message).toBe('Tempo esgotado apos 10ms');
      expect((err as HttpError).isNetworkError).toBe(true);
    }
  });

  it('timeout zero desliga o relogio', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    const resposta = await request({ url: '/x', timeout: 0 });
    expect(resposta.data).toEqual({ ok: true });
  });

  it('sinal externo ja abortado nem chega a tentar de novo', async () => {
    fetchPendente();
    const controle = new AbortController();
    controle.abort();

    await expect(
      request({ url: '/x', signal: controle.signal, retry: 3, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    // Um unico fetch: o aborto externo interrompe o laco de tentativas.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('abortar no meio da requisicao interrompe na hora', async () => {
    fetchPendente();
    const controle = new AbortController();
    const promessa = request({ url: '/x', signal: controle.signal, retry: 2, retryDelay: 1 });
    controle.abort();

    await expect(promessa).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requisicao concluida solta o ouvinte do sinal externo', async () => {
    const controle = new AbortController();
    const soltar = vi.spyOn(controle.signal, 'removeEventListener');
    fetchMock.mockResolvedValue(jsonResponse({}));

    await request({ url: '/x', signal: controle.signal });
    expect(soltar).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// Fila offline
// ---------------------------------------------------------------------------

describe('fila offline', () => {
  const CHAVE = 'voodoo:offline-queue';
  let online: ReturnType<typeof vi.spyOn>;

  function ficarOffline(): void {
    online.mockReturnValue(false);
  }

  beforeEach(() => {
    online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('offline guarda a requisicao e devolve resposta sintetica', async () => {
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

  it('GET offline nao entra na fila, vai direto para a rede', async () => {
    ficarOffline();
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.get('/api/notas', { offlineQueue: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHAVE)).toBeNull();
  });

  it('online normal ignora a fila', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.post('/api/notas', { a: 1 }, { offlineQueue: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('escoar a fila reenvia tudo em ordem e a esvazia', async () => {
    ficarOffline();
    await request({ url: '/a', method: 'POST', body: { i: 1 }, offlineQueue: true });
    await request({ url: '/b', method: 'PUT', body: { i: 2 }, offlineQueue: true });

    online.mockReturnValue(true);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    expect(await flushOfflineQueue()).toBe(2);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/a', '/b']);
    expect(JSON.parse(localStorage.getItem(CHAVE) ?? '[]')).toEqual([]);
  });

  it('fila vazia escoa zero sem tocar na rede', async () => {
    expect(await flushOfflineQueue()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('conteudo corrompido no armazenamento nao derruba o escoamento', async () => {
    localStorage.setItem(CHAVE, '{isso nao e json');
    expect(await flushOfflineQueue()).toBe(0);
  });

  /**
   * Regressao: antes, a falha no primeiro item devolvia apenas ele para a fila
   * e os itens seguintes, que nem chegaram a ser tentados, sumiam para sempre.
   * Como o escoamento comeca gravando uma fila vazia, tudo que estava depois do
   * item que falhou era perdido de forma silenciosa.
   */
  it('falha no meio devolve o item que falhou e tambem os que faltavam', async () => {
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

  it('armazenamento bloqueado na escrita nao propaga excecao', async () => {
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

  it('envia o FormData, o CSRF e nunca o Content-Type', async () => {
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

  it('informa o progresso somente quando o tamanho e conhecido', async () => {
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

  it('resposta sem JSON fica como texto, e JSON quebrado tambem', async () => {
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

  it('status fora da faixa de sucesso vira HttpError', async () => {
    const promessa = http.upload('/a', new FormData());
    const xhr = XHRFalso.ultimo!;
    xhr.status = 413;
    xhr.responseText = '{}';
    xhr.emitir('load');
    await expect(promessa).rejects.toThrow('Upload falhou com status 413');
  });

  it('falha de rede vira HttpError', async () => {
    const promessa = http.upload('/a', new FormData());
    XHRFalso.ultimo!.emitir('error');
    await expect(promessa).rejects.toThrow('Falha de rede no upload');
  });

  it('o sinal cancela o envio', async () => {
    const controle = new AbortController();
    const promessa = http.upload('/a', new FormData(), { signal: controle.signal });
    controle.abort();

    expect(XHRFalso.ultimo!.abortado).toBe(true);
    await expect(promessa).rejects.toThrow('Upload cancelado');
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

  it('abre na URL com baseURL aplicada e converte o JSON', () => {
    http.setBaseURL('https://api.exemplo.com');
    const mensagens: unknown[] = [];
    const fonte = http.sse('/eventos', { message: (dados) => mensagens.push(dados) });

    const falso = fonte as unknown as EventSourceFalso;
    expect(falso.url).toBe('https://api.exemplo.com/eventos');

    falso.emitir('message', { data: '{"tick":1}' });
    expect(mensagens).toEqual([{ tick: 1 }]);
  });

  it('texto que nao e JSON chega puro', () => {
    const mensagens: unknown[] = [];
    const fonte = http.sse('/eventos', { message: (dados) => mensagens.push(dados) });
    (fonte as unknown as EventSourceFalso).emitir('message', { data: 'ping' });
    expect(mensagens).toEqual(['ping']);
  });

  it('sem handlers nada quebra, e o de erro so e ligado quando existe', () => {
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
  it('junta a linha partida entre dois chunks', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['{"a":1}\n{"b":', '2}\n{"c":3}']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });

  it('linhas em branco sao descartadas e a sobra final e entregue', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['um\n\n   \ndois\n', 'tres']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['um', 'dois', 'tres']);
  });

  it('sobra final so de espaco nao vira linha', async () => {
    const linhas: string[] = [];
    fetchMock.mockResolvedValue(respostaStream(['um\n   ']));

    await http.stream('/fluxo', (linha) => linhas.push(linha));
    expect(linhas).toEqual(['um']);
  });

  it('resposta sem corpo termina sem chamar o callback', async () => {
    const aoLer = vi.fn();
    fetchMock.mockResolvedValue({ body: null } as unknown as Response);

    await http.stream('/fluxo', aoLer);
    expect(aoLer).not.toHaveBeenCalled();
  });

  it('repassa params, headers e o sinal', async () => {
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
// Recurso reativo
// ---------------------------------------------------------------------------

describe('recurso reativo', () => {
  it('pick anda pelo caminho e devolve undefined em no faltando', () => {
    expect(pick({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(pick({ a: 1 }, null)).toEqual({ a: 1 });
    expect(pick({ a: null }, 'a.b')).toBeUndefined();
    expect(pick(null, 'a')).toBeUndefined();
  });

  it('extractMessage procura as chaves usuais do corpo de erro', () => {
    const comErro = (data: unknown): HttpError =>
      new HttpError('x', { data } as never, undefined, undefined);

    expect(extractMessage(comErro({ message: 'a' }))).toBe('a');
    expect(extractMessage(comErro({ detail: 'b' }))).toBe('b');
    expect(extractMessage(comErro({ msg: 'c' }))).toBe('c');
    expect(extractMessage(comErro({ outro: 'd' }))).toBeNull();
    expect(extractMessage(comErro('texto'))).toBeNull();
    expect(extractMessage(new HttpError('x'))).toBeNull();
  });

  it('carrega sozinho, recorta por jsonPath e avisa o sucesso', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ dados: { itens: [1, 2] } }));
    const aoAcertar = vi.fn();
    const recurso = createResource('/api/itens', { jsonPath: 'dados.itens', onSuccess: aoAcertar });

    await vi.waitFor(() => expect(recurso.loaded).toBe(true));
    expect(recurso.data).toEqual([1, 2]);
    expect(recurso.loading).toBe(false);
    expect(recurso.error).toBeNull();
    expect(aoAcertar).toHaveBeenCalledWith([1, 2]);
  });

  it('manual nao dispara nada ate o reload', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));
    const recurso = createResource('/api/x', { manual: true });
    expect(fetchMock).not.toHaveBeenCalled();

    await recurso.reload();
    expect(recurso.data).toEqual({ a: 1 });
  });

  it('URL vazia adia a requisicao', async () => {
    let alvo = '';
    const recurso = createResource(() => alvo, { manual: true });
    await recurso.reload();
    expect(fetchMock).not.toHaveBeenCalled();

    alvo = '/api/x';
    fetchMock.mockResolvedValue(jsonResponse({ a: 1 }));
    await recurso.reload();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('params em funcao sao reavaliados a cada chamada', async () => {
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

  it('erro da API vira mensagem legivel no estado', async () => {
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

  it('erro sem corpo util cai na mensagem do proprio HttpError', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    const recurso = createResource('/api/x', { manual: true });
    await recurso.reload();
    expect(recurso.error?.message).toBe('Requisicao falhou com status 500');
  });

  it('set troca os dados sem ir a rede', async () => {
    const recurso = createResource<{ n: number }>('/api/x', { manual: true });
    recurso.set({ n: 9 });
    expect(recurso.data).toEqual({ n: 9 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stop cancela o que estava em andamento e desliga o carregando', async () => {
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

  it('um reload cancela o anterior, e a resposta atrasada nao sobrescreve', async () => {
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

  it('poll repete enquanto a aba esta visivel e para no stop', async () => {
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
