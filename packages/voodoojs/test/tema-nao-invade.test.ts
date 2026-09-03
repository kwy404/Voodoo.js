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

const root = () => document.documentElement;

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
