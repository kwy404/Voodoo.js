/**
 * `v-for` reconciliation, checked by node identity in a real browser.
 *
 * jsdom can confirm that after a reorder the list *reads* correctly. It cannot
 * usefully confirm that the framework moved the existing nodes instead of
 * throwing them away and building new ones, because the observable difference
 * is browser state that jsdom does not carry: the text a user typed into an
 * unbound input, focus, selection, scroll position, a playing media element.
 * Those are precisely what a naive `innerHTML = ...` list destroys, and the
 * bug is invisible to every assertion that only looks at text.
 *
 * The identity probe is an expando written onto each `<li>` from outside the
 * framework. A reused node still carries it; a rebuilt node does not. The
 * "insert" test is the control that proves the probe can tell them apart.
 */

import { test, expect, gotoFixture } from './harness';
import type { Page } from '@playwright/test';

/** Writes a probe onto each row so a later read can tell reuse from rebuild. */
async function stampRows(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('#list .row').forEach((el, index) => {
      (el as HTMLElement & { __probe?: string }).__probe = `probe-${index}`;
    });
  });
}

/** Reads the probes in current document order; `null` means "new node". */
function readStamps(page: Page): Promise<Array<string | null>> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('#list .row')).map(
      (el) => (el as HTMLElement & { __probe?: string }).__probe ?? null
    )
  );
}

/** Reads the typed value of the unbound input in each row, in document order. */
function readNotes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>('#list .row .note')).map((el) => el.value)
  );
}

test.beforeEach(async ({ page }) => {
  await gotoFixture(page, 'list.html');
  await expect(page.locator('#list .row')).toHaveCount(4);
});

test('the keyed list renders one row per item, in order', async ({ page }) => {
  await expect(page.locator('#list .label')).toHaveText(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  await expect(page.locator('#count')).toHaveText('4');

  // Rows are stacked by the real layout engine, so document order and visual
  // order are the same thing here — something jsdom cannot state at all.
  const tops = await page.locator('#list .row').evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().top)
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  expect(new Set(tops).size).toBe(4);
});

test('reversing the array moves the existing nodes instead of rebuilding them', async ({ page }) => {
  await stampRows(page);

  await page.locator('#reverse').click();

  await expect(page.locator('#list .label')).toHaveText(['Delta', 'Charlie', 'Bravo', 'Alpha']);
  // Every node still carries its probe, and they appear in reversed order:
  // the four original elements were moved, not replaced.
  expect(await readStamps(page)).toEqual(['probe-3', 'probe-2', 'probe-1', 'probe-0']);
});

test('rotating the array reuses every node', async ({ page }) => {
  await stampRows(page);

  await page.locator('#rotate').click();

  await expect(page.locator('#list .label')).toHaveText(['Bravo', 'Charlie', 'Delta', 'Alpha']);
  expect(await readStamps(page)).toEqual(['probe-1', 'probe-2', 'probe-3', 'probe-0']);
});

test('text typed into an unbound input inside a row survives a reorder', async ({ page }) => {
  // Real typing: key events into the focused field, not a value assignment.
  await page.locator('#list .row[data-id="a"] .note').click();
  await page.keyboard.type('written in alpha');
  await page.locator('#list .row[data-id="c"] .note').click();
  await page.keyboard.type('written in charlie');

  expect(await readNotes(page)).toEqual(['written in alpha', '', 'written in charlie', '']);

  await page.locator('#reverse').click();
  await expect(page.locator('#list .label')).toHaveText(['Delta', 'Charlie', 'Bravo', 'Alpha']);

  // The text travelled with its row. If the list had been rebuilt, every field
  // would be empty here and the row order would still be correct — which is
  // why asserting on the labels alone would have missed it.
  expect(await readNotes(page)).toEqual(['', 'written in charlie', '', 'written in alpha']);

  await page.locator('#rotate').click();
  await expect(page.locator('#list .label')).toHaveText(['Charlie', 'Bravo', 'Alpha', 'Delta']);
  expect(await readNotes(page)).toEqual(['written in charlie', '', 'written in alpha', '']);
});

test('an inserted item is the only new node; the rest are reused', async ({ page }) => {
  // This is the control for the probe technique itself. If the probe could not
  // distinguish a fresh node from a reused one, this expectation — one `null`
  // among four surviving probes — could not hold.
  await stampRows(page);

  await page.locator('#insert-echo').click();

  await expect(page.locator('#list .label')).toHaveText([
    'Alpha',
    'Echo',
    'Bravo',
    'Charlie',
    'Delta',
  ]);
  expect(await readStamps(page)).toEqual(['probe-0', null, 'probe-1', 'probe-2', 'probe-3']);
});

test('removing an item drops only that row and keeps the others', async ({ page }) => {
  await page.locator('#list .row[data-id="d"] .note').click();
  await page.keyboard.type('delta note');
  await stampRows(page);

  await page.locator('#drop-bravo').click();

  await expect(page.locator('#list .label')).toHaveText(['Alpha', 'Charlie', 'Delta']);
  await expect(page.locator('#count')).toHaveText('3');
  expect(await readStamps(page)).toEqual(['probe-0', 'probe-2', 'probe-3']);
  expect(await readNotes(page)).toEqual(['', '', 'delta note']);
});

test('changing an item in place updates its text without replacing its node', async ({ page }) => {
  await stampRows(page);

  await page.locator('#rename-charlie').click();

  await expect(page.locator('#list .label')).toHaveText(['Alpha', 'Bravo', 'Changed', 'Delta']);
  // Same key, new object: the block is reused and only the scope value changes.
  expect(await readStamps(page)).toEqual(['probe-0', 'probe-1', 'probe-2', 'probe-3']);
});

test('emptying the array removes every row from the document', async ({ page }) => {
  await page.locator('#clear').click();

  await expect(page.locator('#list .row')).toHaveCount(0);
  await expect(page.locator('#count')).toHaveText('0');
  // No orphan left behind in the real DOM, only the framework's own anchor.
  expect(await page.locator('#list').evaluate((el) => el.querySelectorAll('*').length)).toBe(0);
});
