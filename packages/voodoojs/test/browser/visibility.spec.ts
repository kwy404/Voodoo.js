/**
 * `v-show` and `v-if` measured against the browser's own cascade and layout.
 *
 * jsdom has no layout engine and only a partial `getComputedStyle`, so the
 * jsdom suite can do little more than read back the inline style string the
 * framework just wrote — it confirms the assignment, not the effect. Two real
 * defects live in that gap:
 *
 *   - a `v-show` that "restores" an element with `display: block` instead of
 *     the empty string silently destroys any layout the stylesheet gave it,
 *     turning a flex row into a stack;
 *   - a hidden element that still occupies space, because the page's own CSS
 *     wins over what the framework wrote.
 *
 * Both are visible here, and neither is visible in jsdom.
 */

import { test, expect, computed, gotoFixture } from './harness';
import type { Page } from '@playwright/test';

/** Height the element actually occupies, straight from the layout engine. */
function measuredHeight(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((el) => el.getBoundingClientRect().height);
}

test.beforeEach(async ({ page }) => {
  await gotoFixture(page, 'visibility.html');
});

test('v-show hides an element and gives back the display its stylesheet asked for', async ({
  page,
}) => {
  expect(await computed(page, '#panel', 'display')).toBe('flex');
  await expect(page.locator('#panel')).toBeVisible();

  await page.locator('#toggle-open').click();

  expect(await computed(page, '#panel', 'display')).toBe('none');
  await expect(page.locator('#panel')).toBeHidden();

  await page.locator('#toggle-open').click();

  // The regression this guards: `display: block` here would read as "visible"
  // to any structural assertion while quietly breaking the flex row.
  expect(await computed(page, '#panel', 'display')).toBe('flex');
  await expect(page.locator('#panel')).toBeVisible();

  // And the flex layout really is back: the two children sit side by side.
  const boxes = await page
    .locator('#panel > span')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
  expect(boxes).toHaveLength(2);
  expect(boxes[0]!.top).toBe(boxes[1]!.top);
  expect(boxes[0]!.left).toBeLessThan(boxes[1]!.left);
});

test('an element hidden by v-show stops taking up space', async ({ page }) => {
  expect(await measuredHeight(page, '#stack')).toBe(100);

  await page.locator('#toggle-open').click();

  // Only the second row is left; a hidden-but-still-laid-out element would
  // keep the container at 100.
  expect(await measuredHeight(page, '#stack')).toBe(50);
  expect(await measuredHeight(page, '#measured-one')).toBe(0);

  await page.locator('#toggle-open').click();
  expect(await measuredHeight(page, '#stack')).toBe(100);
});

test('v-show takes back an inline display:none used to avoid a flash', async ({ page }) => {
  // The element ships hidden in the HTML so nothing shows before the framework
  // mounts. v-show must both keep it hidden on the first pass and be able to
  // lift the inline value later, letting the cascade decide the display.
  expect(await computed(page, '#inline-hidden', 'display')).toBe('none');
  await expect(page.locator('#inline-hidden')).toBeHidden();

  await page.locator('#toggle-revealed').click();

  await expect(page.locator('#inline-hidden')).toBeVisible();
  expect(await computed(page, '#inline-hidden', 'display')).toBe('block');
  expect(await measuredHeight(page, '#inline-hidden')).toBe(30);

  await page.locator('#toggle-revealed').click();
  expect(await computed(page, '#inline-hidden', 'display')).toBe('none');
});

test('v-if adds and removes the element from the document, not just from view', async ({
  page,
}) => {
  await expect(page.locator('#branch-ready')).toBeVisible();
  await expect(page.locator('#branch-loading')).toHaveCount(0);
  await expect(page.locator('#branch-error')).toHaveCount(0);

  await page.locator('#set-loading').click();

  await expect(page.locator('#branch-loading')).toBeVisible();
  await expect(page.locator('#branch-ready')).toHaveCount(0);

  await page.locator('#set-error').click();

  await expect(page.locator('#branch-error')).toBeVisible();
  await expect(page.locator('#branch-loading')).toHaveCount(0);
  await expect(page.locator('#branch-ready')).toHaveCount(0);

  await page.locator('#set-ready').click();

  await expect(page.locator('#branch-ready')).toBeVisible();
  await expect(page.locator('#branch-error')).toHaveCount(0);
});

test('exactly one v-if branch exists at a time', async ({ page }) => {
  for (const button of ['#set-loading', '#set-error', '#set-ready', '#set-loading']) {
    await page.locator(button).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelectorAll('#branch-loading, #branch-error, #branch-ready').length
        )
      )
      .toBe(1);
  }
});
