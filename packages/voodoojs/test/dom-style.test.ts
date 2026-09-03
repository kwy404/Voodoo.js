/**
 * Tests for `dom/style`.
 *
 * The module keeps the ids it has already injected in a module scoped `Set`.
 * Since vitest isolates each test file, that `Set` starts out empty here and is
 * only affected by the tests in this file. Even so, each case uses an id of its
 * own so as not to depend on the order of execution.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BASE_TOKENS, ensureTokens, injectStyle } from '../src/dom/style';
import { config } from '../src/runtime/registry';

/** How many blocks with that id exist in the `head`. */
function blocos(id: string): number {
  return document.head.querySelectorAll(`style[data-voodoo="${id}"]`).length;
}

describe('injectStyle', () => {
  beforeEach(() => {
    document.head.querySelectorAll('style[data-voodoo]').forEach((el) => el.remove());
  });

  afterEach(() => {
    config.injectStyles = true;
    vi.unstubAllGlobals();
  });

  it('injects the block once and marks it with data-voodoo', () => {
    injectStyle('caso-basico', '.a{color:red}');
    expect(blocos('caso-basico')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="caso-basico"]') as HTMLStyleElement;
    expect(el.textContent).toBe('.a{color:red}');
  });

  it('does not duplicate on the second call, even with different CSS', () => {
    injectStyle('caso-duplo', '.a{color:red}');
    injectStyle('caso-duplo', '.a{color:blue}');
    injectStyle('caso-duplo', '.a{color:green}');
    expect(blocos('caso-duplo')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="caso-duplo"]') as HTMLStyleElement;
    // The first CSS wins: repeating the call is a no-op, not an update.
    expect(el.textContent).toBe('.a{color:red}');
  });

  it('different ids produce different blocks', () => {
    injectStyle('caso-a', '.a{}');
    injectStyle('caso-b', '.b{}');
    expect(blocos('caso-a')).toBe(1);
    expect(blocos('caso-b')).toBe(1);
  });

  it('respects config.injectStyles = false and does not mark the id as used', () => {
    config.injectStyles = false;
    injectStyle('caso-desligado', '.a{color:red}');
    expect(blocos('caso-desligado')).toBe(0);

    // The id never entered the registry, so turning the config back on injects again.
    config.injectStyles = true;
    injectStyle('caso-desligado', '.a{color:red}');
    expect(blocos('caso-desligado')).toBe(1);
  });

  it('does not throw when there is no document', () => {
    vi.stubGlobal('document', undefined);
    expect(() => injectStyle('caso-sem-document', '.a{}')).not.toThrow();
    vi.unstubAllGlobals();

    // It did not mark the id either: with the document back, the injection happens.
    injectStyle('caso-sem-document', '.a{}');
    expect(blocos('caso-sem-document')).toBe(1);
  });

  it('accepts empty CSS without breaking', () => {
    injectStyle('caso-vazio', '');
    expect(blocos('caso-vazio')).toBe(1);
  });
});

describe('ensureTokens', () => {
  it('inserts the tokens exactly once and with the content of BASE_TOKENS', () => {
    // Called several times on purpose: every UI component calls it before
    // drawing, so idempotence is the main contract of this function.
    ensureTokens();
    ensureTokens();
    ensureTokens();
    expect(blocos('tokens')).toBe(1);
    const el = document.head.querySelector('style[data-voodoo="tokens"]') as HTMLStyleElement;
    expect(el.textContent).toBe(BASE_TOKENS);
  });

  it('BASE_TOKENS carries the design system variables and the v-cloak rule', () => {
    expect(BASE_TOKENS).toContain('--v-primary:');
    expect(BASE_TOKENS).toContain('--v-surface:');
    expect(BASE_TOKENS).toContain('--v-z-modal:');
    expect(BASE_TOKENS).toContain('[v-cloak]{display:none !important}');
    // Dark theme by system preference and by explicit attribute.
    expect(BASE_TOKENS).toContain('prefers-color-scheme: dark');
    expect(BASE_TOKENS).toContain('[data-theme="dark"]');
  });
});
