import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, request, HttpError } from '../src/http';
import { config } from '../src/runtime/registry';
import { clearWarnings } from '../src/runtime/avisos';

/** Builds a fake fetch response. */
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

describe('basic methods', () => {
  it('get returns the data already converted', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1, nome: 'Ana' }));
    const data = await http.get<{ nome: string }>('/api/users/1');
    expect(data.nome).toBe('Ana');
    expect(fetchMock).toHaveBeenCalledWith('/api/users/1', expect.objectContaining({ method: 'GET' }));
  });

  it('post sends JSON with the right header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await http.post('/api/users', { nome: 'Ana' });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"nome":"Ana"}');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('recognizes an HTML response as text', async () => {
    fetchMock.mockResolvedValue(textResponse('<p>oi</p>'));
    const data = await http.get<string>('/parcial.html');
    expect(data).toBe('<p>oi</p>');
  });

  it('handles a 204 with no body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const data = await http.delete('/api/users/1');
    expect(data).toBeNull();
  });
});

describe('query parameters', () => {
  it('assembles the query string', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await http.get('/api/produtos', { params: { q: 'caneca', pagina: 2, vazio: null } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/produtos?q=caneca&pagina=2');
  });

  it('preserves a query already present in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    await http.get('/api/produtos?ordem=nome', { params: { pagina: 1 } });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/produtos?ordem=nome&pagina=1');
  });
});

describe('baseURL', () => {
  it('applies the base to relative paths', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/users');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.exemplo.com/users');
  });

  it('does not touch absolute URLs', async () => {
    http.setBaseURL('https://api.exemplo.com');
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('https://outro.com/x');
    expect(fetchMock.mock.calls[0][0]).toBe('https://outro.com/x');
  });
});

describe('errors', () => {
  it('throws HttpError on a 4xx status', async () => {
    // Each call needs a fresh Response, because the body can only be read once.
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

  it('does not retry on a 4xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 422));
    await expect(request({ url: '/x', retry: 2 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on a 5xx and then gives up', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    await expect(request({ url: '/x', retry: 2, retryDelay: 1 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on a network failure and takes the second answer', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('falha de rede'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const data = await request({ url: '/x', retry: 1, retryDelay: 1 });
    expect(data.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('marks a network error when there is no response', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    try {
      await http.get('/x');
    } catch (err) {
      expect((err as HttpError).isNetworkError).toBe(true);
    }
  });
});

describe('retry only repeats what is safe to repeat', () => {
  beforeEach(() => {
    config.devtools = false;
    clearWarnings();
  });

  afterEach(() => {
    config.devtools = false;
  });

  it('GET retries on a 5xx', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    await expect(
      request({ url: '/leitura', method: 'GET', retry: 2, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('HEAD and OPTIONS retry as well', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 500)));
    await expect(
      request({ url: '/h', method: 'HEAD', retry: 1, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      request({ url: '/o', method: 'OPTIONS', retry: 1, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('POST does not retry on a network failure, even when retry was asked for', async () => {
    fetchMock.mockRejectedValue(new TypeError('falha de rede'));
    await expect(
      request({ url: '/pagamento', method: 'POST', body: { valor: 10 }, retry: 2, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('POST does not retry on a 5xx', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({}, 503)));
    await expect(
      request({ url: '/pagamento', method: 'POST', body: {}, retry: 2, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('PATCH, PUT and DELETE also demand an opt-in', async () => {
    for (const method of ['PATCH', 'PUT', 'DELETE'] as const) {
      fetchMock.mockClear();
      fetchMock.mockRejectedValue(new TypeError('falha de rede'));
      await expect(
        request({ url: `/r/${method}`, method, retry: 2, retryDelay: 1 })
      ).rejects.toBeInstanceOf(HttpError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it('POST with retryUnsafe retries', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('falha de rede'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const resposta = await request({
      url: '/pagamento',
      method: 'POST',
      body: {},
      retry: 1,
      retryDelay: 1,
      retryUnsafe: true,
    });
    expect(resposta.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('POST with an Idempotency-Key retries', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('falha de rede'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const resposta = await request({
      url: '/pagamento',
      method: 'POST',
      body: {},
      retry: 1,
      retryDelay: 1,
      headers: { 'Idempotency-Key': 'abc-123' },
    });
    expect(resposta.data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('an empty Idempotency-Key does not count as an opt-in', async () => {
    fetchMock.mockRejectedValue(new TypeError('falha de rede'));
    await expect(
      request({
        url: '/pagamento',
        method: 'POST',
        retry: 2,
        retryDelay: 1,
        headers: { 'idempotency-key': '  ' },
      })
    ).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('warns in dev mode when the retry is ignored', async () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('falha de rede'));
    await expect(
      request({ url: '/aviso-dev', method: 'POST', retry: 2, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    const texto = aviso.mock.calls.map((c) => String(c[0])).join('\n');
    expect(texto).toContain('retry ignored on POST');
    expect(texto).toContain('retryUnsafe');
    expect(texto).toContain('Idempotency-Key');
  });

  it('outside dev mode it prints nothing', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('falha de rede'));
    await expect(
      request({ url: '/sem-aviso', method: 'POST', retry: 2, retryDelay: 1 })
    ).rejects.toBeInstanceOf(HttpError);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('does not warn when the retry was never asked for', async () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new TypeError('falha de rede'));
    await expect(request({ url: '/quieto', method: 'POST' })).rejects.toBeInstanceOf(HttpError);
    expect(aviso).not.toHaveBeenCalled();
  });
});

describe('cache', () => {
  it('reuses the response while it is still in date', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ n: 1 }));
    await http.get('/api/cacheado', { cache: 5000 });
    await http.get('/api/cacheado', { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clearCache invalidates the entries', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ n: 1 })));
    await http.get('/api/cacheado', { cache: 5000 });
    http.clearCache();
    await http.get('/api/cacheado', { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache a POST', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({})));
    await http.post('/api/x', {}, { cache: 5000 });
    await http.post('/api/x', {}, { cache: 5000 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('interceptors', () => {
  it('a request interceptor changes the configuration', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    const remove = http.interceptors.request.use((config) => ({
      ...config,
      headers: { ...config.headers, 'X-Teste': '1' },
    }));

    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Teste']).toBe('1');
    remove();
  });

  it('a response interceptor transforms the data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ valor: 1 }));
    const remove = http.interceptors.response.use((response) => ({
      ...response,
      data: { valor: 99 },
    }));

    const data = await http.get<{ valor: number }>('/x');
    expect(data.valor).toBe(99);
    remove();
  });

  it('an error interceptor observes the failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const spy = vi.fn();
    const remove = http.interceptors.error.use(spy);

    await expect(request({ url: '/x', retry: 0 })).rejects.toThrow();
    expect(spy).toHaveBeenCalled();
    remove();
  });
});

describe('headers', () => {
  it('setToken adds Authorization', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    http.setToken('abc123');
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
    http.setToken(null);
  });

  it('sends X-Requested-With by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await http.get('/x');
    expect(fetchMock.mock.calls[0][1].headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('reads the CSRF token from the meta tag', async () => {
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
