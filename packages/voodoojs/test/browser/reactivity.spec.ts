/**
 * End-to-end reactivity in a real browser.
 *
 * What this adds over the jsdom suite: the click is a real one, dispatched by
 * the browser's input pipeline onto a hit-tested element, not a synthetic
 * `el.click()`. It only lands if the button is actually in the layout, visible
 * and not covered — three properties jsdom cannot evaluate because it has no
 * layout engine. The bundle under test is the minified IIFE served over HTTP,
 * the same file a page including the CDN script would get, rather than the
 * TypeScript sources compiled on the fly by vitest.
 */

import { test, expect, computed, gotoFixture } from './harness';

test.beforeEach(async ({ page }) => {
  await gotoFixture(page, 'reactivity.html');
});

test('the bundle publishes the global object and mounts the page', async ({ page }) => {
  const shape = await page.evaluate(() => ({
    hasV: typeof (window as any).V,
    hasAlias: (window as any).Voodoo === (window as any).V,
    start: typeof (window as any).V?.start,
    reactive: typeof (window as any).V?.reactive,
  }));

  expect(shape).toEqual({ hasV: 'function', hasAlias: true, start: 'function', reactive: 'function' });

  // Mounting also strips the directive attributes from the HTML.
  await expect(page.locator('#app')).not.toHaveAttribute('v-data', /.*/);
});

test('a real click updates every binding that depends on the changed value', async ({ page }) => {
  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#doubled')).toHaveText('0');
  await expect(page.locator('#parity')).toHaveText('even');

  await page.locator('#increment').click();

  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('#doubled')).toHaveText('2');
  await expect(page.locator('#parity')).toHaveText('odd');

  await page.locator('#add-five').click();

  await expect(page.locator('#count')).toHaveText('6');
  await expect(page.locator('#doubled')).toHaveText('12');
  await expect(page.locator('#parity')).toHaveText('even');
});

test('interpolation keeps the prose around the expression', async ({ page }) => {
  await expect(page.locator('#greeting')).toHaveText('Hello, World!');
  await page.locator('#rename').click();
  await expect(page.locator('#greeting')).toHaveText('Hello, Voodoo!');
});

test('a bound class and a bound style reach the browser cascade', async ({ page }) => {
  // `:class` — asserted through the class list and through the computed layout
  // it produces, so the test fails if the attribute is written but never
  // applied.
  await expect(page.locator('#badge')).not.toHaveClass(/is-high/);
  await expect(page.locator('#badge')).toHaveAttribute('data-count', '0');
  expect(await computed(page, '#bar', 'width')).toBe('0px');

  await page.locator('#add-five').click();

  await expect(page.locator('#badge')).toHaveClass(/is-high/);
  await expect(page.locator('#badge')).toHaveAttribute('data-count', '5');
  // 5 * 10 px, measured by the browser after layout — not read back from the
  // inline style string.
  expect(await computed(page, '#bar', 'width')).toBe('50px');
});

test('mutating an array through a handler re-renders the list it feeds', async ({ page }) => {
  await expect(page.locator('.log-entry')).toHaveCount(0);

  await page.locator('#track').click();
  await page.locator('#track').click();
  await page.locator('#track').click();

  await expect(page.locator('.log-entry')).toHaveCount(3);
  await expect(page.locator('.log-entry')).toHaveText(['click 0', 'click 1', 'click 2']);
});

test('a handler that assigns several values applies all of them', async ({ page }) => {
  await page.locator('#increment').click();
  await page.locator('#rename').click();
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('#greeting')).toHaveText('Hello, Voodoo!');

  await page.locator('#reset').click();

  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#greeting')).toHaveText('Hello, World!');
});
