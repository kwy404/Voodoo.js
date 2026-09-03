/**
 * Regression: the router threw where the History API is refused.
 *
 * Reported as issue #2, on the documentation's own router example. Those live
 * examples run inside an `about:srcdoc` iframe, which has an opaque origin, and
 * a document with an opaque origin throws `SecurityError` from `pushState` for
 * any URL at all — including one that only changes the hash:
 *
 *   SecurityError: Failed to execute 'pushState' on 'History': A history state
 *   object with URL '.../docs/guia/srcdoc' cannot be created in a document with
 *   origin 'https://kwy404.github.io' and URL 'about:srcdoc'.
 *
 * The call was unconditional in both modes, so the first navigation threw and
 * the example never changed page. The same happens in any sandboxed iframe
 * without `allow-same-origin`.
 *
 * Navigation does not need the History API. In hash mode the hash is written
 * directly, which an opaque document does allow. In history mode the address
 * bar simply stays behind, which is a worse URL rather than a broken page.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/core';
import { route, router, stopRouter } from '../src/router';
import { destroy, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';

/** The exact refusal an opaque-origin document raises. */
function refuseHistory(): { pushes: number; replaces: number } {
  const counts = { pushes: 0, replaces: 0 };

  const deny = (kind: 'pushes' | 'replaces') => () => {
    counts[kind]++;
    const error = new Error(
      "Failed to execute 'pushState' on 'History': A history state object with URL " +
        "'about:srcdoc' cannot be created in a document with an opaque origin."
    );
    error.name = 'SecurityError';
    throw error;
  };

  vi.spyOn(window.history, 'pushState').mockImplementation(deny('pushes'));
  vi.spyOn(window.history, 'replaceState').mockImplementation(deny('replaces'));
  return counts;
}

/** Mounts the three-page example the documentation shows. */
async function mountExample(
  mode: 'hash' | 'history',
  afterEach?: (to: { path: string }) => void
): Promise<HTMLElement> {
  const host = document.createElement('div');
  host.innerHTML = `
    <nav>
      <a v-link href="${mode === 'hash' ? '#/' : '/'}">Home</a>
      <a v-link href="${mode === 'hash' ? '#/about' : '/about'}">About</a>
    </nav>
    <main v-router-view>Loading...</main>
  `;
  document.body.appendChild(host);

  router({
    mode,
    afterEach: afterEach as never,
    routes: {
      '/': { component: 'page-home', title: 'Home' },
      '/about': { component: 'page-about', title: 'About' },
    },
  });

  walk(host, rootScope);
  await nextTick();
  return host;
}

beforeEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
});

afterEach(() => {
  stopRouter();
  vi.restoreAllMocks();
  destroy(document.body);
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('hash mode where the History API is refused', () => {
  it('starting the router does not throw', async () => {
    refuseHistory();
    await expect(mountExample('hash')).resolves.toBeTruthy();
  });

  it('navigating still changes the route', async () => {
    refuseHistory();
    await mountExample('hash');

    await router.push('/about');
    await nextTick();

    expect(route.path).toBe('/about');
  });

  it('and writes the hash itself, so the URL still follows', async () => {
    refuseHistory();
    await mountExample('hash');

    await router.push('/about');
    await nextTick();

    expect(window.location.hash).toContain('/about');
  });

  it('does not navigate twice from its own hash write', async () => {
    refuseHistory();
    const seen: string[] = [];
    await mountExample('hash', (to) => seen.push(to.path));

    await router.push('/about');
    await nextTick();
    await nextTick();

    // One navigation, not one plus the hashchange it caused.
    expect(seen.filter((path) => path === '/about')).toHaveLength(1);
  });

  it('stops asking once the document has refused', async () => {
    const counts = refuseHistory();
    await mountExample('hash');

    await router.push('/about');
    await router.push('/');
    await router.push('/about');
    await nextTick();

    // The refusal belongs to the document, so it is asked once and remembered.
    expect(counts.pushes + counts.replaces).toBeLessThanOrEqual(2);
  });
});

describe('history mode where the History API is refused', () => {
  it('the route still resolves, even though the address cannot change', async () => {
    refuseHistory();
    await mountExample('history');

    await router.push('/about');
    await nextTick();

    expect(route.path).toBe('/about');
  });
});

describe('with a working History API, nothing changed', () => {
  it('hash mode still uses pushState', async () => {
    const push = vi.spyOn(window.history, 'pushState');
    await mountExample('hash');

    await router.push('/about');
    await nextTick();

    expect(push).toHaveBeenCalled();
    expect(route.path).toBe('/about');
  });

  it('a real error is not swallowed as a refusal', async () => {
    // Only SecurityError means "this document will not allow it". Anything else
    // is a bug that must not be hidden behind a fallback.
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {
      throw new TypeError('something genuinely broken');
    });
    await mountExample('hash');

    await expect(router.push('/about')).rejects.toThrow('something genuinely broken');
  });
});
