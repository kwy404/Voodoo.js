import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, request, HttpError } from '../src/http';

/** Cria uma resposta falsa de fetch. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/html' } });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  http.setBaseURL('');
  http.clearCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('metodos basicos', () => {
  it('get devolve os dados ja convertidos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, nome: 'Ana' }));
    const data = await http.get<{ nome: string }>('/api/users/1');
    expect(data.nome).toBe('Ana');
    expect(fetchMock).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({ method: 'GET' }));
  });

  it('post envia JSON com o cabecalho correto', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.post('/api/users', { nome: 'Ana' });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"nome":"Ana"}');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('reconhece resposta HTML como texto', async () => {
    fetchMock.mockResolvedValue(textResponse('<p>oi</p>'));
    const data = await http.get<string>('/parcial.html');
    expect(data).toBe('<p>oi</p>');
  });

  it('trata 204 sem corpo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const data = await http.delete('/api/users/1');
    expect(data).toBeNull();
  });
});

describe('parametros de query', () => {
  it('monta a query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await http.get('/api/produtos', { params: { q: 'caneca', pagina: 2, vazio: null } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/produtos?q=caneca&pagina=2');
  });

  it('preserva query ja existente na URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await http.get('/api/produtos?ordem=nome', { params: { pagina: 1 } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/produtos?ordem=nome&pagina=1');
  });
});

describe('baseURL', () => {
  it('aplica a base em caminhos relativos', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/users');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.exemplo.com/users');
  });

  it('nao mexe em URLs absolutas', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('https://outro.com/x');
    expect(fetchMock.mock.calls[0][0]).toBe('https://outro.com/x');
  });
});

describe('erros', () => {
  it('lanca HttpError em status 4xx', async () => {
    // Cada chamada precisa de uma Response nova, porque o corpo so pode ser lido uma vez.
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ message: 'Nao encontrado' }, 404)));
    await expect(http.get('/api/x')).rejects.toBeInstanceOf(HttpError);

    try {
      await http.get('/api/x');
    } catch (err) {
      const error = err as HttpError<{ message: string }>;
      expect(error.status).toBe(404);
      expect(error.response?.data.message).toBe('Nao encontrado');
      expect(error.isNetworkError).toBe(false);
    }
  });

  it('nao repete tentativa em 4xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 422));
    await expect(request({ url: '/x', retry: 2 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('repete tentativa em 5xx e depois desiste', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    await expect(request({ url: '/x', retry: 2, retryDelay: 1 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('repete tentativa em falha de rede e aceita a segunda', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('falha de rede'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const data = await request({ url: '/x', retry: 1, retryDelay: 1 });
    expect(data.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('marca erro de rede quando nao ha resposta', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    try {
      await http.get('/x');
    } catch (err) {
      expect((err as HttpError).isNetworkError).toBe(true);
    }
  });
});

describe('cache', () => {
  it('reaproveita a resposta dentro do prazo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    await http.get('/api/cacheado', { cache: 5000 });
    await http.get('/api/cacheado', { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clearCache invalida as entradas', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ n: 1 })));
    await http.get('/api/cacheado', { cache: 5000 });
    http.clearCache();
    await http.get('/api/cacheado', { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('nao guarda cache de POST', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.post('/api/x', {}, { cache: 5000 });
    await http.post('/api/x', {}, { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('interceptadores', () => {
  it('interceptador de requisicao altera a configuracao', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const remove = http.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, 'X-Teste': '1' },
    }));

    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Teste']).toBe('1');
    remove();
  });

  it('interceptador de resposta transforma os dados', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ valor: 1 }));
    const remove = http.interceptors.response.use((response) => ({
      ...response,
      data: { valor: 99 },
    }));

    const data = await http.get<{ valor: number }>('/x');
    expect(data.valor).toBe(99);
    remove();
  });

  it('interceptador de erro observa a falha', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const spy = vi.fn();
    const remove = http.interceptors.error.use(spy);

    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(spy).toHaveBeenCalled();
    remove();
  });
});

describe('cabecalhos', () => {
  it('setToken adiciona Authorization', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    http.setToken('abc123');
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
    http.setToken(null);
  });

  it('envia X-Requested-With por padrao', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('le o token CSRF da meta tag', async () => {
    const meta = document.createElement('meta');
    meta.name = 'csrf-token';
    meta.content = 'token-secreto';
    document.head.appendChild(meta);

    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.post('/x', {});
    expect(fetchMock.mock.calls[0][1].headers['X-CSRF-TOKEN']).toBe('token-secreto');
    meta.remove();
  });
});
