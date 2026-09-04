/**
 * Regression: importing the library repainted the host page.
 *
 * On boot the theme read the visitor's OPERATING SYSTEM preference and wrote
 * `color-scheme` onto `<html>`. That makes the browser render the background,
 * the scrollbars and every form control dark, across the whole document, for a
 * page that asked for none of it. Anyone adding the script to a light site on a
 * dark-mode machine watched their page turn dark.
 *
 * Worse, when nothing was stored it also called `removeAttribute('data-theme')`,
 * stripping a value the page author had written in their own markup.
 *
 * The rule now: the library touches the document only when the visitor actually
 * picked a theme.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/storage';
import { effect, stop, nextTick } from '../src/reactivity';

const root = () => document.documentElement;

/** Pretends the operating system is in light mode. */
function systemPrefersLight(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
}

/** Pretends the operating system is in dark mode. */
function systemPrefersDark(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('dark'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  localStorage.clear();
  root().removeAttribute('data-theme');
  root().style.removeProperty('color-scheme');
  systemPrefersDark();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  root().removeAttribute('data-theme');
  root().style.removeProperty('color-scheme');
});

describe('a page nobody configured', () => {
  it('is left alone even when the system is dark', () => {
    theme.init();
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });

  it('keeps a data-theme the page author wrote', () => {
    root().setAttribute('data-theme', 'light');
    theme.init();
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('reports the system preference without applying it', () => {
    // Reading is fine. Writing to someone else's document is not.
    expect(theme.resolved).toBe('dark');
    expect(theme.chosen).toBe(false);
    expect(root().style.colorScheme).toBe('');
  });
});

describe('once the visitor picks a theme', () => {
  it('dark is applied', () => {
    theme.set('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
  });

  it('light is applied even though the system is dark', () => {
    theme.set('light');
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(root().style.colorScheme).toBe('light');
  });

  it('choosing "system" is itself a choice, so it follows the system', () => {
    theme.set('system');
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('dark');
  });

  it('the choice survives a reload, which is the point of storing it', () => {
    theme.set('dark');
    root().removeAttribute('data-theme');
    root().style.removeProperty('color-scheme');

    theme.init();
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
  });

  it('toggle flips and keeps applying', () => {
    theme.set('light');
    expect(theme.toggle()).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });
});

describe('where localStorage is unavailable', () => {
  // A sandboxed iframe without allow-same-origin has an opaque origin, and every
  // localStorage access throws. `storage` swallows that, which is correct, but it
  // used to mean the visitor's choice was thrown away with it: nothing was
  // written, `chosen` stayed false, and `apply()` returned early. A
  // v-theme-toggle button inside such a frame did nothing, silently.
  function breakStorage(): void {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('SecurityError: storage is not available');
      },
      setItem() {
        throw new Error('SecurityError: storage is not available');
      },
      removeItem() {
        throw new Error('SecurityError: storage is not available');
      },
      clear() {},
      key: () => null,
      length: 0,
    });
  }

  it('an explicit choice still reaches the document', () => {
    breakStorage();
    theme.set('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
  });

  it('toggle keeps working, and keeps alternating', () => {
    breakStorage();
    theme.set('light');
    expect(theme.toggle()).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(theme.toggle()).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  // The in-memory choice is module state, which is right for a page (one page,
  // one decision) and awkward for a test file (many pages in one module). These
  // two need a module that has never been chosen on, so they load a fresh copy.
  it('a page nobody configured is still left alone', async () => {
    breakStorage();
    vi.resetModules();
    const fresh = await import('../src/storage');

    fresh.theme.init();
    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });

  it('reports the choice as made, even unpersisted', async () => {
    breakStorage();
    vi.resetModules();
    const fresh = await import('../src/storage');

    expect(fresh.theme.chosen).toBe(false);
    fresh.theme.set('dark');
    expect(fresh.theme.chosen).toBe(true);
    expect(fresh.theme.current).toBe('dark');
  });
});

describe('where matchMedia does not exist', () => {
  // `matchMedia?.()` reads as a guard and is not one. Optional chaining protects
  // against a null or undefined VALUE; an identifier that was never declared
  // still throws a ReferenceError when it is read. Older webviews and jsdom do
  // not define it, and init() took the whole library down there.
  //
  // Reproducing that needs the property GONE, not set to undefined. Stubbing it
  // as undefined makes `matchMedia?.()` behave perfectly well, which is why the
  // first version of this test passed against the bug.
  function removeMatchMedia(): void {
    delete (globalThis as Record<string, unknown>).matchMedia;
    delete (window as unknown as Record<string, unknown>).matchMedia;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('init does not throw', async () => {
    removeMatchMedia();
    vi.resetModules();
    const fresh = await import('../src/storage');

    expect(() => fresh.theme.init()).not.toThrow();
  });

  it('a stored choice is still applied without it', async () => {
    removeMatchMedia();
    vi.resetModules();
    const fresh = await import('../src/storage');

    fresh.theme.set('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('resolved falls back to light rather than throwing', async () => {
    removeMatchMedia();
    vi.resetModules();
    const fresh = await import('../src/storage');

    expect(fresh.theme.resolved).toBe('light');
  });
});

/**
 * Regression: `resolved` contradicted the screen.
 *
 * `apply()` correctly leaves an authored `data-theme` alone. But `resolved`
 * only ever consulted the stored choice and the operating system, so a page
 * written as light, opened on a machine set to dark, DISPLAYED light while
 * reporting "dark". The documentation's own theme page showed it: the shell
 * was light and the live example inside it announced, in the reader's face,
 * "You are on the dark theme."
 */
describe('resolved follows what the page is showing', () => {
  // The module keeps the last pick in a variable of its own, which survives
  // `localStorage.clear()`. Without putting it back to `system` these tests
  // read a choice made by an earlier test in this file and never reach the
  // branch under test.
  beforeEach(() => {
    theme.set('system');
    localStorage.clear();
    root().removeAttribute('data-theme');
  });

  it('reads an authored data-theme in preference to the system', () => {
    systemPrefersDark();
    root().setAttribute('data-theme', 'light');

    expect(theme.current).toBe('system');
    expect(theme.resolved).toBe('light');
  });

  it('works the other way round too', () => {
    systemPrefersLight();
    root().setAttribute('data-theme', 'dark');

    expect(theme.resolved).toBe('dark');
  });

  it('still falls back to the system when the page declares nothing', () => {
    systemPrefersDark();
    root().removeAttribute('data-theme');

    expect(theme.resolved).toBe('dark');
  });

  it('a real choice still beats the attribute', () => {
    systemPrefersDark();
    root().setAttribute('data-theme', 'dark');
    theme.set('light');

    expect(theme.resolved).toBe('light');
  });
});

/**
 * Regression: the text did not follow the theme.
 *
 * Everything the theme derives from is invisible to the Proxy — localStorage, a
 * module variable, an attribute, a media query — so `v-show="$theme.resolved
 * === 'dark'"` rendered once and then froze. On the documentation's theme page
 * that produced the reported symptom exactly: a light page with an example
 * inside it insisting "You are on the dark theme", and a second click needed
 * before anything moved.
 */
describe('an effect reading the theme re-runs when the theme changes', () => {
  beforeEach(() => {
    theme.set('system');
    localStorage.clear();
    root().removeAttribute('data-theme');
  });

  it('re-runs when the theme is set', async () => {
    systemPrefersLight();
    const seen: string[] = [];
    const runner = effect(() => seen.push(theme.resolved));

    expect(seen).toEqual(['light']);

    theme.set('dark');
    await nextTick();

    expect(seen).toEqual(['light', 'dark']);
    stop(runner);
  });

  it('re-runs when someone else writes data-theme on the root', async () => {
    systemPrefersLight();
    theme.init();

    const seen: string[] = [];
    const runner = effect(() => seen.push(theme.resolved));
    expect(seen).toEqual(['light']);

    // What the documentation shell does to an example frame.
    root().setAttribute('data-theme', 'dark');
    await nextTick();
    await nextTick();

    expect(seen[seen.length - 1]).toBe('dark');
    stop(runner);
  });
});

/**
 * Regression: the saved theme was never applied on a `data-manual` page.
 *
 * `theme.init()` lived inside the deferred `boot()` of `bootstrap`, which is
 * reached only after the `data-manual` / `autoStart` guard. A page that starts
 * the library itself therefore got its walker, its components and its toggle
 * button, and none of its visitor's theme.
 *
 * This project's own site is such a page: it loads the bundle with
 * `data-manual` so the dictionary is registered before the first render. The
 * symptom reported from it was exact. A visitor on a dark machine pressed the
 * toggle, the page went light, and every reload brought the dark page back --
 * `data-theme` was never written, so the page's own
 * `@media (prefers-color-scheme: dark)` block matched again. Then the first
 * press of the toggle read the stored `light` and flipped it to `dark`,
 * changing nothing on screen. Two themes, both dark, and a button that looked
 * broken.
 */
describe('a page that starts the library itself', () => {
  /** A `<script>` tag the way `readScriptOptions` finds it. */
  function scriptTag(...attributes: string[]): void {
    const script = document.createElement('script');
    script.src = 'voodoo.full.min.js';
    for (const name of attributes) script.setAttribute(name, '');
    document.head.appendChild(script);
  }

  /** `bootstrap` only reaches for `start` on the object it is handed. */
  const fakeV = (): Record<string, unknown> => ({ start() {} });

  beforeEach(() => {
    document.head.innerHTML = '';
    theme.set('system');
    localStorage.clear();
    root().removeAttribute('data-theme');
    root().style.removeProperty('color-scheme');
    systemPrefersDark();
  });

  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('gets the theme its visitor chose back', async () => {
    localStorage.setItem('voodoo:theme', 'light');
    scriptTag('data-manual');
    vi.resetModules();
    const { bootstrap } = await import('../src/bootstrap');

    bootstrap(fakeV());

    // The whole point: light survives a reload on a dark machine.
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(root().style.colorScheme).toBe('light');
  });

  it('the same for a visitor who chose dark', async () => {
    systemPrefersLight();
    localStorage.setItem('voodoo:theme', 'dark');
    scriptTag('data-defer-init');
    vi.resetModules();
    const { bootstrap } = await import('../src/bootstrap');

    bootstrap(fakeV());

    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().style.colorScheme).toBe('dark');
  });

  it('and an automatic page is not disturbed by the move', async () => {
    localStorage.setItem('voodoo:theme', 'light');
    scriptTag();
    vi.resetModules();
    const { bootstrap } = await import('../src/bootstrap');

    bootstrap(fakeV());

    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('still leaves a page alone when nobody picked anything', async () => {
    // Restoring a choice must not become "impose the operating system".
    scriptTag('data-manual');
    vi.resetModules();
    const { bootstrap } = await import('../src/bootstrap');

    bootstrap(fakeV());

    expect(root().getAttribute('data-theme')).toBeNull();
    expect(root().style.colorScheme).toBe('');
  });
});
