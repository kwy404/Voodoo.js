/**
 * Shared plumbing for the real-browser suite.
 *
 * Three things every test in this folder gets for free:
 *
 * 1. **No network.** Every request that is not aimed at the local fixture
 *    server is aborted and recorded, and a test that triggered one fails. A
 *    browser suite that quietly depends on a CDN is a browser suite that fails
 *    on a plane, and worse, one whose green run means nothing.
 * 2. **A clean console.** Uncaught exceptions and `console.error` are collected
 *    and asserted empty at the end of the test. The framework swallowing an
 *    error into the console instead of into the DOM is exactly the kind of bug
 *    an assertion on rendered text would miss.
 * 3. **A real mount signal.** `gotoFixture` waits until the walker has run,
 *    detected by Voodoo's own attribute cleanup, so no test starts asserting
 *    against a page that has not booted yet.
 */

import { test as base, expect, type Page } from '@playwright/test';

export { expect };

interface VoodooFixtures {
  /** Set to `true` in a test that means to provoke an error on purpose. */
  allowConsoleErrors: boolean;
}

export const test = base.extend<VoodooFixtures>({
  allowConsoleErrors: [false, { option: true }],

  page: async ({ page, allowConsoleErrors, baseURL }, use) => {
    const consoleErrors: string[] = [];
    const offSite: string[] = [];

    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(`console.error: ${message.text()}`);
    });

    await page.route('**/*', (route) => {
      const url = route.request().url();
      const local = baseURL ? url.startsWith(baseURL) : false;
      if (local || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) {
        void route.continue();
        return;
      }
      offSite.push(url);
      void route.abort('blockedbyclient');
    });

    await use(page);

    expect(offSite, 'the fixture must not request anything off the local server').toEqual([]);
    if (!allowConsoleErrors) {
      expect(consoleErrors, 'the page must not throw or log an error').toEqual([]);
    }
  },
});

/**
 * Opens a fixture and waits for Voodoo to have walked it.
 *
 * The readiness signal is the framework's own: `config.cleanAttributes` strips
 * `v-*` attributes from an element once its directives are installed, so a root
 * that no longer carries `v-data` is a root the walker has finished. That is a
 * stronger signal than `load`, which fires while the boot loop is still
 * waiting for the tree to settle.
 *
 * @param page   the page to navigate
 * @param name   fixture file name, e.g. `'reactivity.html'`
 * @param mount  `'/fixtures'` (default) or `'/csp'` for the strict-policy mount
 */
export async function gotoFixture(
  page: Page,
  name: string,
  mount: '/fixtures' | '/csp' = '/fixtures'
): Promise<void> {
  await page.goto(`${mount}/${name}`);
  await page.waitForFunction(() => {
    const root = document.querySelector('[id="app"]');
    return !!root && !root.hasAttribute('v-data');
  });
}

/** Computed value of one CSS property, read from the browser's own cascade. */
export function computed(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(
    ([sel, prop]) => {
      const el = document.querySelector(sel!);
      if (!el) throw new Error(`no element matched ${sel}`);
      return getComputedStyle(el).getPropertyValue(prop!);
    },
    [selector, property] as const
  );
}

/** The `id` of the element that currently holds focus, or `''`. */
export function activeElementId(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.id ?? '');
}
