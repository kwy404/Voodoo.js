/**
 * The live-example frames in the documentation must not grow when used.
 *
 * Reported repeatedly: clicking anything inside an example made its card a
 * little taller, and it kept going. I fixed it twice from reasoning and a
 * hand-built mock, and both times it was still growing on the real page. This
 * measures the frame in a real browser instead, which is the only place the
 * feedback loop between the frame's height, the body that fills it and the
 * ResizeObserver watching that body actually exists.
 */

import { test, expect } from './harness';
import type { Page } from '@playwright/test';

/** Height of the first live-example frame, as laid out. */
function frameHeight(page: Page): Promise<number> {
  return page
    .locator('iframe[data-palco]')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/docs/guia/estado-e-escopo.html');
  await page.waitForSelector('iframe[data-palco]');
  // The frames size themselves on load and again on a timer.
  await page.waitForTimeout(900);
});

test('the frame settles instead of growing on every click', async ({ page }) => {
  const frame = page.frameLocator('iframe[data-palco]').first();
  const button = frame.locator('button').first();

  const settled = await frameHeight(page);
  const seen: number[] = [];

  for (let i = 0; i < 6; i++) {
    await button.click();
    await page.waitForTimeout(220);
    seen.push(await frameHeight(page));
  }

  // A little movement is legitimate: the example itself shows and hides a line,
  // so the content genuinely changes height. What must not happen is a ratchet.
  const biggest = Math.max(...seen);
  expect(
    biggest,
    `heights after each click: ${seen.join(', ')} (settled at ${settled})`
  ).toBeLessThan(settled + 80);
});

test('the frame does not grow while nothing happens', async ({ page }) => {
  const before = await frameHeight(page);
  await page.waitForTimeout(1500);
  const after = await frameHeight(page);

  expect(after).toBe(before);
});

test('resizing the page does not ratchet it either', async ({ page }) => {
  const before = await frameHeight(page);

  for (const width of [1100, 900, 1100, 900, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
  }

  const after = await frameHeight(page);
  expect(after).toBeLessThan(before + 80);
});
