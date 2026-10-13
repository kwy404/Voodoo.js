/**
 * The theme in a real browser: the cascade, a real `prefers-color-scheme`
 * that can change while the page is open, real storage events between tabs,
 * and a deferred bundle that runs after the first paint.
 *
 * jsdom has no media queries and no second tab, which is where the reported
 * dark mode bugs lived: a page that did not follow the system once it was
 * open, a toggle that kept describing the theme the system had left, and a
 * choice made in one tab that the others never saw.
 */

import { test, expect, computed, gotoFixture } from './harness';

const BLACK = 'rgb(0, 0, 0)';
const WHITE = 'rgb(255, 255, 255)';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
});

test('a saved dark theme is on the root before the bundle runs', async ({ page }) => {
  await gotoFixture(page, 'theme.html');
  await page.evaluate(() => localStorage.setItem('voodoo:theme', 'dark'));
  await gotoFixture(page, 'theme.html');

  expect(await page.evaluate(() => (window as any).__firstTheme)).toBe('dark');
  expect(await computed(page, 'body', 'background-color')).toBe(BLACK);
});

test('the JSON spelling written by older builds is read the same way', async ({ page }) => {
  await gotoFixture(page, 'theme.html');
  await page.evaluate(() => localStorage.setItem('voodoo:theme', '"dark"'));
  await gotoFixture(page, 'theme.html');

  expect(await page.evaluate(() => (window as any).__firstTheme)).toBe('dark');
  expect(await page.evaluate(() => (window as any).V.theme.current)).toBe('dark');
});

test('cycle walks system, light and dark, and the page follows', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoFixture(page, 'theme.html');
  await page.evaluate(() => localStorage.removeItem('voodoo:theme'));
  await gotoFixture(page, 'theme.html');

  const cycle = page.locator('#cycle');
  await expect(cycle).toHaveAttribute('data-voodoo-theme-mode', 'system');
  expect(await computed(page, 'body', 'background-color')).toBe(BLACK);

  await cycle.click();
  await expect(cycle).toHaveAttribute('data-voodoo-theme-mode', 'light');
  expect(await computed(page, 'body', 'background-color')).toBe(WHITE);

  await cycle.click();
  await expect(cycle).toHaveAttribute('data-voodoo-theme-mode', 'dark');
  expect(await computed(page, 'body', 'background-color')).toBe(BLACK);

  await cycle.click();
  await expect(cycle).toHaveAttribute('data-voodoo-theme-mode', 'system');
  expect(await page.evaluate(() => document.documentElement.hasAttribute('data-theme'))).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('voodoo:theme'))).toBe('system');
});

test('on system, a change of the operating system reaches the page and the buttons', async ({
  page,
}) => {
  await gotoFixture(page, 'theme.html');
  await page.locator('#pick-system').click();
  await expect(page.locator('#toggle')).toHaveAttribute('aria-pressed', 'false');

  await page.emulateMedia({ colorScheme: 'dark' });

  await expect(page.locator('#toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#toggle')).toHaveAttribute('aria-label', 'Switch to light theme');
  await expect(page.locator('#resolved')).toHaveText('dark');
  expect(await computed(page, 'body', 'background-color')).toBe(BLACK);
  expect(await page.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark');
});

test('a page nobody configured still updates its toggle when the system changes', async ({
  page,
}) => {
  await gotoFixture(page, 'theme.html');
  await page.evaluate(() => localStorage.removeItem('voodoo:theme'));
  await gotoFixture(page, 'theme.html');
  await expect(page.locator('#toggle')).toHaveAttribute('aria-pressed', 'false');

  await page.emulateMedia({ colorScheme: 'dark' });

  await expect(page.locator('#toggle')).toHaveAttribute('aria-pressed', 'true');
  // Still nothing written on a page nobody configured.
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBeNull();
});

test('a choice made in another tab reaches this one without a reload', async ({ page, context }) => {
  await gotoFixture(page, 'theme.html');
  await page.locator('#pick-system').click();

  const other = await context.newPage();
  await gotoFixture(other, 'theme.html');
  await other.locator('#pick-dark').click();

  await expect(page.locator('#pick-dark')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#resolved')).toHaveText('dark');
  expect(await computed(page, 'body', 'background-color')).toBe(BLACK);
  await other.close();
});
