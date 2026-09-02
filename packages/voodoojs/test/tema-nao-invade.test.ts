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
