/**
 * The framework's headline security claim, proved by a browser that enforces it.
 *
 * Voodoo evaluates template expressions with its own lexer, parser and
 * tree-walking interpreter instead of compiling them into functions, so it is
 * meant to run under a Content-Security-Policy with no `'unsafe-eval'`. Until
 * now the only evidence for that was static: the quality gate greps `src` and
 * `dist` for `eval`, `new Function` and `setTimeout('...')`. A grep cannot see
 * a string reaching a compiler through an alias, through a bundled dependency,
 * or through a browser API that compiles on its behalf — and jsdom has no CSP
 * implementation whatsoever, so no jsdom test can close the gap either.
 *
 * These tests serve the fixture under
 *
 *     script-src 'self'
 *
 * with no `'unsafe-eval'` and no `'unsafe-inline'`, and let Chromium be the
 * judge. Two things keep the result from being vacuous:
 *
 *   1. `eval-probe.js` runs in the page's own script context and reports
 *      whether that context may compile a string. Under this policy it must
 *      report "refused"; on the unprotected mount it must report "allowed".
 *      A policy that was not actually applied fails the first half; a probe
 *      that is simply broken fails the second.
 *   2. Every policy violation the page reports is collected and asserted to be
 *      empty, so the framework cannot pass by having its violation silently
 *      swallowed somewhere.
 *
 * Note that `page.evaluate` would be the wrong tool for the probe: Playwright
 * injects it over the debugging protocol, which is exempt from CSP. Everything
 * that has to be governed by the policy is loaded as a same-origin file.
 */

import { test, expect, gotoFixture } from './harness';
import type { Page } from '@playwright/test';

interface EvalProbe {
  label: string;
  allowed: boolean;
  value: number | null;
  error: string | null;
}

/** Registers a violation collector before any page script runs. */
async function collectViolations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as any).__cspViolations.push({
        directive: (event as SecurityPolicyViolationEvent).effectiveDirective,
        blocked: (event as SecurityPolicyViolationEvent).blockedURI,
        sample: (event as SecurityPolicyViolationEvent).sample,
      });
    });
  });
}

const readProbe = (page: Page): Promise<EvalProbe[]> =>
  page.evaluate(() => (window as any).__evalProbe as EvalProbe[]);

const readViolations = (page: Page): Promise<unknown[]> =>
  page.evaluate(() => (window as any).__cspViolations ?? []);

test.describe('under a policy with no unsafe-eval', () => {
  test.beforeEach(async ({ page }) => {
    await collectViolations(page);
  });

  // Chromium logs its refusal to the console even though the probe catches the
  // exception, and that refusal is the expected outcome here.
  test.describe('enforcement control', () => {
    test.use({ allowConsoleErrors: true });

    test('the policy is really on the response and really enforced', async ({ page }) => {
      const response = await page.goto('/csp/probe.html');
      const header = response?.headers()['content-security-policy'] ?? '';

      // Read the script-src directive itself rather than substring-matching
      // the whole header, so a stray 'unsafe-eval' added to any directive
      // cannot hide behind another one.
      const directives = new Map(
        header
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const [name, ...values] = part.split(/\s+/);
            return [name!, values] as const;
          })
      );

      expect(directives.get('script-src')).toEqual(["'self'"]);
      expect(header).not.toContain('unsafe-eval');

      // The page's own script context is refused permission to compile a
      // string. This is the check that makes every other assertion in this
      // file mean something.
      const probe = await readProbe(page);
      expect(probe.map((entry) => entry.label)).toEqual(['new Function', 'eval']);
      for (const entry of probe) {
        expect(entry.allowed, `${entry.label} must be refused under this policy`).toBe(false);
        expect(entry.error).toMatch(/unsafe-eval|Content Security Policy/i);
      }

      // And the browser reported it as a script-src violation, not something else.
      const violations = (await readViolations(page)) as Array<{ directive: string }>;
      expect(violations.length).toBeGreaterThan(0);
      for (const violation of violations) expect(violation.directive).toBe('script-src');
    });
  });

  test('every kind of expression still evaluates', async ({ page }) => {
    await gotoFixture(page, 'csp.html', '/csp');

    await expect(page.locator('#sum')).toHaveText('5');
    await expect(page.locator('#name')).toHaveText('Ada Lovelace');
    await expect(page.locator('#upper')).toHaveText('LOVELACE');
    await expect(page.locator('#ternary')).toHaveText('many');
    await expect(page.locator('#computed')).toHaveText('Ada');
    await expect(page.locator('#cheap')).toHaveText('10|25');
    await expect(page.locator('#total')).toHaveText('130');
    await expect(page.locator('#nested')).toHaveText('20');
    await expect(page.locator('#conditional-else')).toHaveText('four or fewer');

    await expect(page.locator('#list .price')).toHaveText([
      '0: 10',
      '1: 25',
      '2: 40',
      '3: 55',
    ]);

    expect(await readViolations(page)).toEqual([]);
  });

  test('event handlers, bindings and v-model still run', async ({ page }) => {
    await gotoFixture(page, 'csp.html', '/csp');

    await page.locator('#bump').click();
    await page.locator('#bump').click();
    await page.locator('#bump').click();
    await expect(page.locator('#sum')).toHaveText('8');
    await expect(page.locator('#conditional')).toHaveText('over four');

    await page.locator('#raise').click();
    await expect(page.locator('#cheap')).toHaveText('10|25|40|55');

    await page.locator('#dark').click();
    await expect(page.locator('#theme-out')).toHaveText('dark');
    await expect(page.locator('#theme-out')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#theme-out')).toHaveClass(/is-dark/);

    await page.locator('#typed').fill('');
    await page.locator('#typed').click();
    await page.keyboard.type('Grace');
    await expect(page.locator('#typed-out')).toHaveText('Grace');
    await expect(page.locator('#name')).toHaveText('Grace Lovelace');

    expect(await readViolations(page)).toEqual([]);
  });

  test('the framework raises no violation of any directive while it works', async ({ page }) => {
    await gotoFixture(page, 'csp.html', '/csp');

    await page.locator('#bump').click();
    await page.locator('#dark').click();
    await page.locator('#raise').click();
    await expect(page.locator('#sum')).toHaveText('6');

    // Includes style-src, img-src and connect-src, not only script-src: a
    // framework that injects a stylesheet or fires a request from a template
    // would be caught here too.
    expect(await readViolations(page)).toEqual([]);
  });
});

test.describe('without a policy', () => {
  // The negative control. The probe is only evidence if it can also come back
  // positive, so the same file, served without the header, must report that
  // compiling a string is allowed. Chromium's refusal logs a console error on
  // the protected mount; here nothing is refused, so nothing is logged.
  test('the same probe reports that compiling a string is allowed', async ({ page }) => {
    const response = await page.goto('/fixtures/probe.html');
    expect(response?.headers()['content-security-policy']).toBeUndefined();

    const probe = await readProbe(page);
    expect(probe).toHaveLength(2);
    for (const entry of probe) {
      expect(entry.allowed, `${entry.label} should be permitted with no policy`).toBe(true);
      expect(entry.value).toBe(42);
    }
  });

  test('the page renders identically with and without the policy', async ({ page }) => {
    const snapshot = async (mount: '/fixtures' | '/csp'): Promise<string[]> => {
      await gotoFixture(page, 'csp.html', mount);
      return page.locator('#sum, #name, #cheap, #total, #nested').allTextContents();
    };

    const withoutPolicy = await snapshot('/fixtures');
    const withPolicy = await snapshot('/csp');

    expect(withPolicy).toEqual(withoutPolicy);
    expect(withPolicy).toEqual(['5', 'Ada Lovelace', '10|25', '130', '20']);
  });
});
