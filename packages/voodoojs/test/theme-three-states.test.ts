/**
 * The theme as three states: `system`, `light` and `dark`.
 *
 * Every case below was a way the dark mode broke on a real page:
 *
 * - a stored value that was not a theme name came straight back out of
 *   `current` and was written into `data-theme`;
 * - a visitor who never chose saw the toggle keep describing the theme the
 *   operating system had just left, because the button only listened for an
 *   event that a system change never fired;
 * - the button's own label was written once and never again, so it offered
 *   "Switch to dark theme" on a dark page;
 * - another tab, or a same-origin example frame, changed the choice and the
 *   page kept the old theme until it was reloaded;
 * - `init()` added a fresh set of listeners on every call;
 * - a page built from the ES modules never called `init()` at all, so the
 *   saved choice was not put back on reload.
 *
 * Each test that depends on the listeners loads a fresh copy of the modules,
 * because the listeners are attached once per page and a test file is many
 * pages in one module.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const root = (): HTMLElement => document.documentElement;

interface FakeQuery {
  matches: boolean;
  media: string;
  listeners: Array<() => void>;
  addEventListener?: (type: string, fn: () => void) => void;
  removeEventListener?: () => void;
  addListener?: (fn: () => void) => void;
  removeListener?: () => void;
}

/**
 * A `matchMedia` whose answer can be flipped, firing the listeners the way a
 * browser does when the operating system switches theme.
 */
function fakeSystem(dark: boolean, legacy = false) {
  const query: FakeQuery = { matches: dark, media: '(prefers-color-scheme: dark)', listeners: [] };
  if (legacy) {
    query.addListener = (fn) => query.listeners.push(fn);
    query.removeListener = () => {};
  } else {
    query.addEventListener = (_type, fn) => query.listeners.push(fn);
    query.removeEventListener = () => {};
  }
  vi.stubGlobal('matchMedia', (media: string) => {
    if (media.includes('dark')) return query;
    return { matches: false, media, addEventListener() {}, removeEventListener() {} };
  });
  return {
    query,
    switchTo(next: boolean): void {
      query.matches = next;
      for (const fn of query.listeners) fn();
    },
  };
}

async function freshStorage() {
  vi.resetModules();
  return import('../src/storage');
}

/** A fresh runtime with the UI directives registered, to mount markup with. */
async function freshRuntime() {
  vi.resetModules();
  const storage = await import('../src/storage');
  const reactivity = await import('../src/reactivity');
  const { walk } = await import('../src/runtime/walker');
  const { rootScope } = await import('../src/runtime/scope');
  await import('../src/directives/ui');
  const mount = (html: string): HTMLElement => {
    document.body.innerHTML = html;
    walk(document.body, rootScope);
    return document.body.firstElementChild as HTMLElement;
  };
  return { ...storage, nextTick: reactivity.nextTick, mount };
}

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute('data-theme');
  root().style.removeProperty('color-scheme');
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  root().removeAttribute('data-theme');
  root().style.removeProperty('color-scheme');
  document.body.innerHTML = '';
});

describe('the stored value', () => {
  it('reads the raw spelling the library writes', async () => {
    localStorage.setItem('voodoo:theme', 'dark');
    const { theme } = await freshStorage();
    expect(theme.current).toBe('dark');
    expect(theme.chosen).toBe(true);
  });

  it('reads the JSON spelling older builds wrote, and applies it', async () => {
    fakeSystem(false);
    localStorage.setItem('voodoo:theme', '"dark"');
    const { theme } = await freshStorage();
    theme.init();
    expect(theme.current).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('writes the raw spelling, so an inline head script can read it as is', async () => {
    const { theme } = await freshStorage();
    theme.set('light');
    expect(localStorage.getItem('voodoo:theme')).toBe('light');
    theme.set('system');
    expect(localStorage.getItem('voodoo:theme')).toBe('system');
  });

  it('ignores anything that is not a theme name', async () => {
    fakeSystem(true);
    localStorage.setItem('voodoo:theme', 'blue');
    const { theme } = await freshStorage();
    theme.init();
    expect(theme.current).toBe('system');
    expect(theme.chosen).toBe(false);
    expect(theme.resolved).toBe('dark');
    // Not written into the document, where no stylesheet would match it.
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });

  it('forgives case and stray spaces', async () => {
    localStorage.setItem('voodoo:theme', ' Dark ');
    const { theme } = await freshStorage();
    expect(theme.current).toBe('dark');
  });

  it('set() refuses an unknown name instead of storing it', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { theme } = await freshStorage();
    theme.set('dark');
    theme.set('sepia' as never);
    expect(theme.current).toBe('dark');
    expect(localStorage.getItem('voodoo:theme')).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(warning).toHaveBeenCalled();
  });

  it("this page's choice wins over a stale value it could not overwrite", async () => {
    // A full quota: reading works, writing throws.
    const real = localStorage;
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => real.getItem(key),
      setItem() {
        throw new Error('QuotaExceededError');
      },
      removeItem: (key: string) => real.removeItem(key),
      clear: () => real.clear(),
      key: () => null,
      length: 0,
    });
    real.setItem('voodoo:theme', 'light');
    const { theme } = await freshStorage();
    expect(theme.toggle()).toBe('dark');
    expect(theme.current).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(theme.toggle()).toBe('light');
  });
});

describe('three states', () => {
  it('system is a choice that hands the page back to the operating system', async () => {
    fakeSystem(true);
    root().setAttribute('data-theme', 'light');
    const { theme } = await freshStorage();
    theme.set('system');
    expect(theme.current).toBe('system');
    expect(theme.chosen).toBe(true);
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(theme.resolved).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
  });

  it('cycle() walks system, light, dark and back', async () => {
    fakeSystem(false);
    const { theme } = await freshStorage();
    expect(theme.current).toBe('system');
    expect(theme.cycle()).toBe('light');
    expect(theme.cycle()).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(theme.cycle()).toBe('system');
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(theme.cycle()).toBe('light');
  });

  it('toggle() still switches between light and dark only', async () => {
    fakeSystem(true);
    const { theme } = await freshStorage();
    expect(theme.toggle()).toBe('light');
    expect(theme.toggle()).toBe('dark');
    expect(theme.current).toBe('dark');
  });
});

describe('the operating system changes while the page is open', () => {
  it('a visitor on system follows it, color-scheme included', async () => {
    const system = fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('system');
    expect(root().style.colorScheme).toBe('light');

    const seen: string[] = [];
    document.addEventListener('voodoo:theme', (e) => seen.push((e as CustomEvent).detail.resolved));
    system.switchTo(true);

    expect(theme.resolved).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(seen).toContain('dark');
  });

  it('a page nobody configured is told, and still not written to', async () => {
    const system = fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();

    const seen: string[] = [];
    const listener = (e: Event): void => {
      seen.push((e as CustomEvent).detail.resolved);
    };
    document.addEventListener('voodoo:theme', listener);
    system.switchTo(true);
    document.removeEventListener('voodoo:theme', listener);

    expect(seen).toEqual(['dark']);
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });

  it('an explicit choice is not moved by it', async () => {
    const system = fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('light');
    system.switchTo(true);
    expect(theme.resolved).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(root().style.colorScheme).toBe('light');
  });

  it('works on browsers that only have addListener', async () => {
    const system = fakeSystem(false, true);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('system');
    system.switchTo(true);
    expect(root().style.colorScheme).toBe('dark');
  });

  it('init() attaches its listeners once, however often it is called', async () => {
    const system = fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.init();
    theme.init();
    expect(system.query.listeners).toHaveLength(1);
  });

  it('init() still re-applies the saved choice on every call', async () => {
    fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('dark');
    root().removeAttribute('data-theme');
    theme.init();
    expect(root().getAttribute('data-theme')).toBe('dark');
  });
});

describe('another tab or frame changes the choice', () => {
  it('the page follows it without a reload', async () => {
    fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('light');

    // What the browser does when another document on the origin writes.
    localStorage.setItem('voodoo:theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'voodoo:theme', newValue: 'dark' }));

    expect(theme.current).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('and the next toggle starts from the newer choice', async () => {
    fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('light');
    localStorage.setItem('voodoo:theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'voodoo:theme', newValue: 'dark' }));

    expect(theme.toggle()).toBe('light');
  });

  it('ignores other keys', async () => {
    fakeSystem(false);
    const { theme } = await freshStorage();
    theme.init();
    theme.set('light');
    localStorage.setItem('voodoo:theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'voodoo:locale', newValue: 'en' }));

    expect(theme.current).toBe('light');
  });
});

describe('v-theme-toggle', () => {
  it('by default switches light and dark, with a label that keeps up', async () => {
    fakeSystem(false);
    const { mount, theme } = await freshRuntime();
    const button = mount('<button v-theme-toggle></button>');

    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');

    button.click();
    expect(theme.current).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    // Written once and never again, this still said "Switch to dark theme".
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(button.dataset.voodooTheme).toBe('dark');
    expect(button.dataset.voodooThemeMode).toBe('dark');
  });

  it('keeps a label the author wrote', async () => {
    fakeSystem(false);
    const { mount } = await freshRuntime();
    const button = mount('<button v-theme-toggle aria-label="Theme"></button>');
    button.click();
    expect(button.getAttribute('aria-label')).toBe('Theme');
  });

  it('.cycle walks the three states', async () => {
    fakeSystem(true);
    const { mount, theme } = await freshRuntime();
    const button = mount('<button v-theme-toggle.cycle></button>');

    expect(button.dataset.voodooThemeMode).toBe('system');
    expect(button.hasAttribute('aria-pressed')).toBe(false);

    button.click();
    expect(theme.current).toBe('light');
    expect(button.dataset.voodooThemeMode).toBe('light');
    button.click();
    expect(theme.current).toBe('dark');
    button.click();
    expect(theme.current).toBe('system');
    expect(button.dataset.voodooThemeMode).toBe('system');
    expect(button.dataset.voodooTheme).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Theme: system. Change theme');
  });

  it('an argument picks that theme, and marks the button pressed while it holds', async () => {
    fakeSystem(false);
    const { mount, theme, nextTick } = await freshRuntime();
    document.body.innerHTML =
      '<div><button id="s" v-theme-toggle:system></button>' +
      '<button id="l" v-theme-toggle:light></button>' +
      '<button id="d" v-theme-toggle:dark></button></div>';
    mount(document.body.innerHTML);
    const button = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

    expect(button('s').getAttribute('aria-pressed')).toBe('true');
    button('d').click();
    await nextTick();
    expect(theme.current).toBe('dark');
    expect(button('d').getAttribute('aria-pressed')).toBe('true');
    expect(button('s').getAttribute('aria-pressed')).toBe('false');
    expect(button('l').getAttribute('aria-pressed')).toBe('false');

    button('s').click();
    await nextTick();
    expect(theme.current).toBe('system');
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(button('s').getAttribute('aria-pressed')).toBe('true');
  });

  it('follows a system change on a page nobody configured', async () => {
    const system = fakeSystem(false);
    const { mount, nextTick } = await freshRuntime();
    const button = mount('<button v-theme-toggle></button>');
    expect(button.getAttribute('aria-pressed')).toBe('false');

    system.switchTo(true);
    await nextTick();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
  });

  it('follows a choice made in another tab', async () => {
    fakeSystem(false);
    const { mount, nextTick } = await freshRuntime();
    const button = mount('<button v-theme-toggle></button>');

    localStorage.setItem('voodoo:theme', 'dark');
    window.dispatchEvent(new StorageEvent('storage', { key: 'voodoo:theme', newValue: 'dark' }));
    await nextTick();

    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('puts the saved choice back on a page built from the modules', async () => {
    // No bootstrap here, which is how an ES module build starts.
    fakeSystem(false);
    localStorage.setItem('voodoo:theme', 'dark');
    const { mount } = await freshRuntime();
    mount('<button v-theme-toggle></button>');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });
});

describe('a page built from the ES modules', () => {
  it('start() puts the saved choice back, with no toggle on the page', async () => {
    // The real-time chat example imports the modules and calls start() itself.
    // The script-tag bootstrap was the only caller of init(), so the page
    // opened in the other theme every time.
    fakeSystem(false);
    localStorage.setItem('voodoo:theme', 'dark');
    vi.resetModules();
    const { start } = await import('../src/runtime/walker');
    document.body.innerHTML = '<p>hello</p>';
    start();
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('start() still leaves a page nobody configured alone', async () => {
    fakeSystem(true);
    vi.resetModules();
    const { start } = await import('../src/runtime/walker');
    document.body.innerHTML = '<p>hello</p>';
    start();
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });
});

describe('the devtools widget', () => {
  it('follows an explicit page theme, not only the system', async () => {
    // A visitor who picked light on a dark machine got a dark widget on a
    // light page. jsdom has no cascade, so this reads the rules themselves.
    vi.resetModules();
    const { mountDevtoolsWidget, unmountDevtoolsWidget } = await import('../src/devtools/launcher');
    mountDevtoolsWidget();
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toContain(':root[data-theme="dark"] .v-devtools-widget');
    expect(css).toContain(':root:not([data-theme="light"]) .v-devtools-widget');
    unmountDevtoolsWidget();
  });
});
