/**
 * The embeddable runner, as far as jsdom can see it: the document it writes,
 * the sandbox it insists on, and which messages it believes.
 *
 * Running the code is a real-browser question (jsdom has no opaque origins and
 * does not execute srcdoc documents the way a browser does), so that half
 * lives in `test/browser/playground.spec.ts`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CDN_RUNTIME,
  DEFAULT_CSS,
  createRunner,
  defaultRuntime,
  preset,
  presets,
  previewDocument,
} from '../src/playground';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Parses a preview document the way the frame would. */
function parsed(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('previewDocument', () => {
  it('loads the runtime held by data-manual, after the bridge and before the code', () => {
    const html = previewDocument('<p id="code">hi</p>', { runtime: '/v.js' });
    const doc = parsed(html);
    const scripts = [...doc.querySelectorAll('script')];

    expect(scripts[0].hasAttribute('src')).toBe(false);
    expect(scripts[1].getAttribute('src')).toBe('/v.js');
    expect(scripts[1].hasAttribute('data-manual')).toBe(true);
    expect(doc.body.innerHTML).toBe('<p id="code">hi</p>');
  });

  it('starts the library only after the document has parsed', () => {
    const html = previewDocument('', { runtime: '/v.js' });
    expect(html).toContain('addEventListener("DOMContentLoaded"');
    expect(html).toContain('V.start()');
  });

  it('adds stylesheets and extra scripts in order', () => {
    const doc = parsed(
      previewDocument('', { runtime: '/v.js', stylesheets: ['/a.css', '/b.css'], scripts: ['/x.js'] })
    );
    expect([...doc.querySelectorAll('link')].map((l) => l.getAttribute('href'))).toEqual([
      '/a.css',
      '/b.css',
    ]);
    expect([...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'))).toEqual([
      '/v.js',
      '/x.js',
    ]);
  });

  it('escapes the URLs it writes into attributes', () => {
    const doc = parsed(previewDocument('', { runtime: '/v.js?a=1&b="><img src=x>' }));
    expect(doc.querySelector('img')).toBeNull();
    expect(doc.querySelector('script[src]')!.getAttribute('src')).toBe('/v.js?a=1&b="><img src=x>');
  });

  it('keeps custom CSS inside its style element', () => {
    const doc = parsed(previewDocument('', { css: 'p{color:red}</style><b id="out">x</b>' }));
    expect(doc.getElementById('out')).toBeNull();
    expect(doc.querySelector('style')!.textContent).toContain('p{color:red}');
  });

  it('ships a default stylesheet, and none when css is empty', () => {
    expect(parsed(previewDocument('')).querySelector('style')!.textContent).toBe(DEFAULT_CSS);
    expect(parsed(previewDocument('', { css: '' })).querySelector('style')).toBeNull();
  });

  it('forces a known theme and ignores anything else', () => {
    const dark = parsed(previewDocument('', { theme: 'dark' })).documentElement;
    expect(dark.getAttribute('data-theme')).toBe('dark');

    const other = parsed(previewDocument('', { theme: 'neon' as never })).documentElement;
    expect(other.hasAttribute('data-theme')).toBe(false);
  });

  it('cannot be broken out of through the settings it embeds', () => {
    const html = previewDocument('', { runtime: '/v.js</script><b id="out">x</b>' });
    const doc = parsed(html);
    expect(doc.getElementById('out')).toBeNull();
  });
});

describe('defaultRuntime', () => {
  it('uses the full build next to the playground script', () => {
    expect(defaultRuntime('https://cdn.example/lib/9.9.9/voodoo.playground.min.js')).toBe(
      'https://cdn.example/lib/9.9.9/voodoo.full.min.js'
    );
    expect(defaultRuntime('/site/voodoo.playground.js?v=abc')).toBe('/site/voodoo.full.min.js');
  });

  it('falls back to the pinned CDN build', () => {
    expect(defaultRuntime('')).toBe(CDN_RUNTIME);
    expect(defaultRuntime('https://example.com/app.js')).toBe(CDN_RUNTIME);
    // The source carries the stamped pin; the build replaces the version with
    // its own, which `test/browser/playground.spec.ts` sees in the bundle.
    expect(CDN_RUNTIME).toMatch(
      /^https:\/\/cdn\.jsdelivr\.net\/npm\/voodoojs@\d+\.\d+\.\d+\/dist\/voodoo\.full\.min\.js$/
    );
  });
});

describe('presets', () => {
  it('has the four starters, each with a title, a description and code', () => {
    expect(presets.map((p) => p.id)).toEqual(['counter', 'todo', 'form', 'fetch']);
    for (const p of presets) {
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.description.length).toBeGreaterThan(10);
      expect(p.code).toMatch(/v-data|v-resource/);
    }
  });

  it('finds one by id, forgiving case and spaces', () => {
    expect(preset(' Todo ')!.id).toBe('todo');
    expect(preset('nope')).toBeUndefined();
  });

  it('cannot be edited by one embed for the others', () => {
    expect(Object.isFrozen(presets)).toBe(true);
    expect(Object.isFrozen(presets[0])).toBe(true);
  });
});

describe('createRunner', () => {
  function host(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'demo';
    document.body.appendChild(el);
    return el;
  }

  it('puts a sandboxed frame without same-origin access in the target', () => {
    host();
    const runner = createRunner('#demo', { runtime: '/v.js' });
    const sandbox = runner.frame.getAttribute('sandbox')!.split(' ');

    expect(runner.frame.parentElement!.id).toBe('demo');
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    expect(runner.frame.getAttribute('title')).toBe('Live preview');
  });

  it('refuses a sandbox that would let the code reach the page', () => {
    host();
    expect(() => createRunner('#demo', { sandbox: 'allow-scripts allow-same-origin' })).toThrow(
      /allow-same-origin/
    );
  });

  it('says what is wrong with a missing target or an unknown preset', () => {
    expect(() => createRunner('#missing')).toThrow(/nothing matches #missing/);
    const el = host();
    expect(() => createRunner(el, { preset: 'chess' })).toThrow(/counter, todo, form, fetch/);
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('runs a preset or code straight away, and remembers the code', () => {
    host();
    const runner = createRunner('#demo', { runtime: '/v.js', preset: 'counter' });
    expect(runner.code).toBe(preset('counter')!.code);
    expect(runner.frame.srcdoc).toContain('v-data="{ count: 0 }"');

    runner.run('<p>new</p>');
    expect(runner.code).toBe('<p>new</p>');
    expect(runner.frame.srcdoc).toContain('<body><p>new</p></body>');
  });

  it('only believes messages from its own frame, for the current run', () => {
    host();
    const onError = vi.fn();
    const onReady = vi.fn();
    const runner = createRunner('#demo', { runtime: '/v.js', code: '', onError, onReady });
    const channel = /"c":"([^"]+)"/.exec(runner.frame.srcdoc)![1];
    const send = (data: unknown, source: Window | null = runner.frame.contentWindow) =>
      window.dispatchEvent(new MessageEvent('message', { data, source }));

    send({ voodooPlayground: channel, run: 1, type: 'error', message: 'boom' });
    send({ voodooPlayground: channel, run: 1, type: 'error', message: 'boom' });
    send({ voodooPlayground: 'someone-else', run: 1, type: 'error', message: 'spoof' });
    send({ voodooPlayground: channel, run: 0, type: 'error', message: 'stale' });
    send({ voodooPlayground: channel, run: 1, type: 'error', message: 'from the page' }, window);
    send({ voodooPlayground: channel, run: 1, type: 'ready', errors: 1 });

    expect(onError.mock.calls.map((c) => c[0])).toEqual(['boom']);
    expect(runner.errors).toEqual(['boom']);
    expect(onReady).toHaveBeenCalledWith(1, runner);

    runner.run();
    expect(runner.errors).toEqual([]);
    send({ voodooPlayground: channel, run: 1, type: 'error', message: 'old run' });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('removes the frame and stops listening when destroyed', () => {
    host();
    const onError = vi.fn();
    const runner = createRunner('#demo', { runtime: '/v.js', code: '', onError });
    const frameWindow = runner.frame.contentWindow;
    const channel = /"c":"([^"]+)"/.exec(runner.frame.srcdoc)![1];

    runner.destroy();
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { voodooPlayground: channel, run: 1, type: 'error', message: 'late' },
        source: frameWindow,
      })
    );

    expect(document.querySelector('iframe')).toBeNull();
    expect(onError).not.toHaveBeenCalled();
    runner.run('<p>ignored</p>');
    expect(runner.code).toBe('');
  });
});
