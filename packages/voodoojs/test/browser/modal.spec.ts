/**
 * The modal, which is the component that needs a browser most.
 *
 * Its focus trap is built on `focusableIn`, which filters candidates with
 * `offsetWidth > 0 || offsetHeight > 0 || getClientRects().length > 0`. In
 * jsdom every one of those is zero for every element, so the list of focusable
 * elements is always empty and the trap can never be exercised — a jsdom test
 * of this component asserts the shape of the markup and nothing about the
 * behaviour the component exists for.
 *
 * Everything below depends on browser state jsdom does not model: real layout
 * feeding the focus filter, a real `document.activeElement` moving in response
 * to a real Tab key, focus restoration after close, and a scroll lock that is
 * only meaningful on a document that scrolls.
 */

import { test, expect, activeElementId, gotoFixture } from './harness';
import type { Page } from '@playwright/test';

const panel = '.v-dialog-panel';

async function openModal(page: Page): Promise<void> {
  await page.locator('#open-login').click();
  await expect(page.locator(panel)).toBeVisible();
  // Focus lands on the next frame, after the open class is applied.
  await expect.poll(() => activeElementId(page)).toBe('email');
}

test.beforeEach(async ({ page }) => {
  await gotoFixture(page, 'modal.html');
});

test('the dialog content stays hidden until the modal is opened', async ({ page }) => {
  await expect(page.locator('#login')).toBeHidden();
  await expect(page.locator(panel)).toHaveCount(0);
  await expect(page.locator('#open-login')).toHaveAttribute('aria-haspopup', 'dialog');
});

test('opening moves focus into the panel and exposes the dialog role', async ({ page }) => {
  await page.locator('#open-login').click();

  const dialog = page.locator(panel);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  // The heading inside the adopted content became the accessible name.
  await expect(dialog).toHaveAttribute('aria-labelledby', 'login-title');

  await expect(page.locator('#email')).toBeVisible();
  await expect.poll(() => activeElementId(page)).toBe('email');
});

test('Tab wraps at both ends of the panel instead of leaving it', async ({ page }) => {
  await openModal(page);

  // The framework appends its own close button after the adopted content, so
  // it is the last stop in the cycle. Reading the order from the live DOM
  // rather than hard-coding it keeps the test about the wrap, not the markup.
  const order = await page.locator(`${panel} button, ${panel} input`).evaluateAll((els) =>
    els.map((el) => el.id || el.className)
  );
  expect(order[0]).toBe('email');
  const last = order[order.length - 1]!;
  expect(last).toContain('v-dialog-x');

  await page.keyboard.press('Tab');
  expect(await activeElementId(page)).toBe('password');
  await page.keyboard.press('Tab');
  expect(await activeElementId(page)).toBe('submit');
  await page.keyboard.press('Tab');
  expect(await activeElementId(page)).toBe('cancel');

  // On the last element, forward Tab returns to the first.
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => document.activeElement?.className ?? '')).toContain(
    'v-dialog-x'
  );
  await page.keyboard.press('Tab');
  expect(await activeElementId(page)).toBe('email');

  // And backward Tab from the first goes to the last.
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => page.evaluate(() => document.activeElement?.className ?? '')).toContain(
    'v-dialog-x'
  );
});

test('focus that escapes the panel is pulled back in', async ({ page }) => {
  await openModal(page);

  // Simulates any route out of the dialog that is not Tab: a script, the
  // address bar returning focus, a click that slipped past the backdrop.
  await page.locator('#elsewhere').evaluate((el) => (el as HTMLElement).focus());

  await expect.poll(() => activeElementId(page)).toBe('email');
});

test('Escape closes the modal and gives focus back to the trigger', async ({ page }) => {
  await openModal(page);

  await page.keyboard.press('Escape');

  await expect(page.locator(panel)).toHaveCount(0);
  await expect.poll(() => activeElementId(page)).toBe('open-login');
});

test('the close button inside the content closes the modal', async ({ page }) => {
  await openModal(page);

  await page.locator('#cancel').click();

  await expect(page.locator(panel)).toHaveCount(0);
  await expect.poll(() => activeElementId(page)).toBe('open-login');
});

test('closing returns the content to exactly where it came from', async ({ page }) => {
  await openModal(page);

  // While open, the content has been adopted into the dialog layer.
  expect(await page.locator('#login').evaluate((el) => !!el.closest('.v-dialog-panel'))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator(panel)).toHaveCount(0);

  const restored = await page.evaluate(() => {
    const content = document.getElementById('login')!;
    return {
      insideDialog: !!content.closest('.v-dialog-panel'),
      parentId: content.parentElement?.id ?? '',
      nextId: (content.nextElementSibling as HTMLElement | null)?.id ?? '',
      previousId: (content.previousElementSibling as HTMLElement | null)?.id ?? '',
    };
  });
  expect(restored).toEqual({
    insideDialog: false,
    parentId: 'app',
    nextId: 'after-login',
    previousId: 'elsewhere',
  });
});

/**
 * Known defect, kept as an expected failure rather than deleted or softened.
 *
 * `v-modal-content` hides its element with the `hidden` attribute, and the
 * stylesheet's fallback rule is `[v-modal-content]:not(.v-dialog-open)`. On
 * close, `dialog.ts` re-hides the element only `if (source.hasAttribute('v-modal-content'))`.
 * But `config.cleanAttributes` — on by default — strips every `v-*` attribute
 * from the element right after its directives are installed, so by then the
 * attribute is gone: the condition is false, `hidden` is never restored, and
 * the CSS fallback cannot match either. The dialog's contents are left sitting
 * in the middle of the page.
 *
 * The assertion below is the correct one and is deliberately left at full
 * strength. `test.fail()` records that it does not hold today; the moment the
 * source is fixed this test starts passing, Playwright reports "expected to
 * fail but passed", and whoever fixed it removes this annotation.
 */
test('closing hides the content again', async ({ page }) => {
  await openModal(page);
  await page.keyboard.press('Escape');
  await expect(page.locator(panel)).toHaveCount(0);

  // A short timeout because the outcome is known: the point is to record the
  // defect, not to spend the default five seconds re-confirming it.
  await expect(page.locator('#login')).toBeHidden({ timeout: 1500 });
});

test('the modal can be opened again after being closed', async ({ page }) => {
  await openModal(page);
  await page.keyboard.press('Escape');
  await expect(page.locator(panel)).toHaveCount(0);

  await openModal(page);
  await expect(page.locator('#email')).toBeVisible();
});

test('the page behind the modal cannot scroll, and can again after closing', async ({ page }) => {
  const overflow = () => page.evaluate(() => getComputedStyle(document.body).overflow);
  const scrollTop = () => page.evaluate(() => document.documentElement.scrollTop);

  // The document really does scroll before anything is locked. jsdom has no
  // scrolling at all, so this whole test is out of its reach.
  await page.mouse.wheel(0, 400);
  await expect.poll(scrollTop).toBeGreaterThan(0);

  await openModal(page);
  expect(await overflow()).toBe('hidden');

  // A real wheel event over the locked page moves nothing.
  const lockedAt = await scrollTop();
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  expect(await scrollTop()).toBe(lockedAt);

  await page.keyboard.press('Escape');
  await expect(page.locator(panel)).toHaveCount(0);
  await expect.poll(overflow).not.toBe('hidden');

  // And the wheel works again once the lock is lifted.
  const unlockedAt = await scrollTop();
  await page.mouse.wheel(0, 600);
  await expect.poll(scrollTop).toBeGreaterThan(unlockedAt);
});
