/**
 * Regressions found by checking the documentation against the code.
 *
 * Each one is a promise the documentation made that the library did not keep:
 *
 * 1. A plugin's `install(V)` got the internal core, not the public `V`, so the
 *    services the entry point adds (`V.modal`, `V.router`, `V.i18n`, `V.validate`,
 *    `V.renderChart`) were missing inside it, and whatever it set never reached
 *    the global `V`.
 * 2. The socket and GPU entries link themselves onto an existing global `V`, but
 *    checked for an object, and `V` is a function with properties.
 * 3. `v-submit` prefixed `baseURL` and the HTTP client prefixed it again, so with
 *    `data-base-url="/api"` a form posting to `/users` reached `/api/api/users`.
 * 4. `v-history-debounce` was read with a literal `getAttribute`, which missed
 *    the attribute cache, a custom prefix and the `data-v-` spelling.
 * 5. `@click="increment"` called the method with `this` set to the clicked
 *    element's own scope, so a method from `V.data` used inside a nested
 *    `v-data` ran `this.count++` on a scope without `count` and made a NaN.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope, rootScope } from '../src/runtime/scope';
import { getScope, walk } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import { http } from '../src/http';
import V from '../src/index';

function mount(html: string, scope: Scope = new Scope(reactive({}))): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, scope);
  return root;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('a plugin is installed against the public V', () => {
  it('sees what the entry point added, and what it sets lands on V', () => {
    const seen: Record<string, string> = {};
    V.use({
      install(target: any) {
        for (const name of ['modal', 'router', 'i18n', 'validate', 'renderChart']) {
          seen[name] = typeof target[name];
        }
        target.docsPluginApi = { ping: () => 'pong' };
      },
    });

    for (const name of ['modal', 'router', 'i18n', 'validate', 'renderChart']) {
      expect(seen[name], name).not.toBe('undefined');
    }
    expect((V as any).docsPluginApi.ping()).toBe('pong');
  });

  it('the same through createApp().use()', () => {
    let received: unknown = null;
    V.createApp({}).use((target: unknown) => {
      received = target;
    });
    expect(received).toBe(V);
  });
});

describe('the socket and GPU entries link themselves onto a global V', () => {
  it('when V is a function, as it always is', async () => {
    const globalV = Object.assign(() => null, {}) as unknown as Record<string, unknown>;
    vi.stubGlobal('V', globalV);
    vi.resetModules();
    await import('../src/socket/plugin');
    await import('../src/gpu/plugin');
    expect(globalV.socket).toBeTruthy();
    expect(globalV.gpu).toBeTruthy();
  });
});

describe('v-submit and a base URL', () => {
  const previous = config.baseURL;

  afterEach(() => {
    config.baseURL = previous;
    http.setBaseURL('');
  });

  function respond(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('applies it once when both the config and the client carry it', async () => {
    // What the script-tag bootstrap does with data-base-url="/api".
    config.baseURL = '/api';
    http.setBaseURL('/api');
    const fetchMock = respond();

    const root = mount('<form v-submit="/users"><input name="n" value="a"><button>go</button></form>');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/users');
  });

  it('still applies the config one when the client has none', async () => {
    config.baseURL = '/api';
    const fetchMock = respond();

    const root = mount('<form v-submit="/users"><input name="n" value="a"><button>go</button></form>');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();

    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/users');
  });
});

describe('v-history-debounce', () => {
  async function stepsAfter(html: string, wait: number): Promise<number> {
    vi.useFakeTimers();
    const root = mount(html);
    const host = root.firstElementChild as HTMLElement;
    const scope = getScope(host)!;
    scope.data.n = 1;
    await nextTick();
    vi.advanceTimersByTime(wait);
    return (scope.get('$history') as { size: number }).size;
  }

  it('is honoured', async () => {
    expect(await stepsAfter('<div v-data="{ n: 0 }" v-history v-history-debounce="20"></div>', 30)).toBe(2);
  });

  it('is honoured in the data-v- spelling', async () => {
    expect(
      await stepsAfter('<div v-data="{ n: 0 }" v-history data-v-history-debounce="20"></div>', 30)
    ).toBe(2);
  });

  it('still waits for the default when it is absent', async () => {
    expect(await stepsAfter('<div v-data="{ n: 0 }" v-history></div>', 30)).toBe(1);
  });
});

describe('a handler named without parentheses', () => {
  it('runs with this set to the scope that owns it', async () => {
    V.data({
      docsCount: 0,
      docsIncrement(this: { docsCount: number }) {
        this.docsCount++;
      },
    });

    const root = mount('<div v-data="{ local: true }"><button @click="docsIncrement">+</button></div>', rootScope);
    const inner = getScope(root.firstElementChild as Element)!;
    (root.querySelector('button') as HTMLButtonElement).click();

    expect(rootScope.data.docsCount).toBe(1);
    expect('docsCount' in inner.data).toBe(false);
  });

  it('and with this set to the object for a method read from one', () => {
    const counter = reactive({
      value: 0,
      bump(this: { value: number }) {
        this.value++;
      },
    });
    const root = mount(
      '<div v-data="{}"><button @click="counter.bump">+</button></div>',
      new Scope(reactive({ counter }))
    );
    (root.querySelector('button') as HTMLButtonElement).click();
    expect(counter.value).toBe(1);
  });
});
