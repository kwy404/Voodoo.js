/**
 * Two-way binding driven by real user input.
 *
 * jsdom exercises `v-model` by assigning `input.value` and dispatching a
 * synthetic `input` event — the test writes the event the framework is
 * listening for, which is close to assuming the answer. Here the browser
 * produces the events: `keyboard.type` sends keydown/keypress/input/keyup per
 * character, `check()` performs a hit-tested click that flips `checked` and
 * fires `change`, and `selectOption` drives the native select. Native controls
 * also behave in ways jsdom approximates: a checkbox click toggling `checked`
 * before the listener runs, `<select multiple>` maintaining `selectedOptions`,
 * and a `type="number"` field rejecting characters that are not a number.
 */

import { test, expect, gotoFixture } from './harness';

test.beforeEach(async ({ page }) => {
  await gotoFixture(page, 'forms.html');
});

test('typing into a text input writes through to state and back out to bindings', async ({
  page,
}) => {
  await expect(page.locator('#name-out')).toHaveText('');

  await page.locator('#name').click();
  await page.keyboard.type('Grace');

  await expect(page.locator('#name-out')).toHaveText('Grace');

  // Backspace is a real key, and the binding must follow the deletion too.
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#name-out')).toHaveText('Gra');
});

test('a textarea binds the same way as an input', async ({ page }) => {
  await expect(page.locator('#bio')).toHaveValue('start');

  await page.locator('#bio').fill('');
  await page.locator('#bio').click();
  await page.keyboard.type('two lines');

  await expect(page.locator('#bio-out')).toHaveText('two lines');
});

test('a single select binds the chosen option', async ({ page }) => {
  // The initial state must have driven the native selection, not just the text.
  await expect(page.locator('#colour')).toHaveValue('green');
  await expect(page.locator('#colour-out')).toHaveText('green');

  await page.locator('#colour').selectOption('blue');

  await expect(page.locator('#colour-out')).toHaveText('blue');
  await expect(page.locator('#colour')).toHaveValue('blue');
});

test('a multiple select binds the whole selection as an array', async ({ page }) => {
  await expect(page.locator('#palette-out')).toHaveText('red');

  await page.locator('#palette').selectOption(['red', 'blue']);

  await expect(page.locator('#palette-out')).toHaveText('red,blue');

  const selected = await page
    .locator('#palette')
    .evaluate((el) => Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.value));
  expect(selected).toEqual(['red', 'blue']);
});

test('a boolean checkbox binds its checked state', async ({ page }) => {
  await expect(page.locator('#subscribed')).not.toBeChecked();
  await expect(page.locator('#subscribed-out')).toHaveText('no');

  await page.locator('#subscribed').check();

  await expect(page.locator('#subscribed')).toBeChecked();
  await expect(page.locator('#subscribed-out')).toHaveText('yes');

  await page.locator('#subscribed').uncheck();

  await expect(page.locator('#subscribed-out')).toHaveText('no');
});

test('a group of checkboxes bound to one array adds and removes values', async ({ page }) => {
  await expect(page.locator('#tag-news')).toBeChecked();
  await expect(page.locator('#tag-offers')).not.toBeChecked();
  await expect(page.locator('#tags-out')).toHaveText('news');

  await page.locator('#tag-offers').check();
  await expect(page.locator('#tags-out')).toHaveText('news,offers');

  await page.locator('#tag-events').check();
  await expect(page.locator('#tags-out')).toHaveText('news,offers,events');

  await page.locator('#tag-news').uncheck();
  await expect(page.locator('#tags-out')).toHaveText('offers,events');
  await expect(page.locator('#tag-news')).not.toBeChecked();
});

test('a radio group binds the selected value', async ({ page }) => {
  await expect(page.locator('#plan-free')).toBeChecked();
  await expect(page.locator('#plan-out')).toHaveText('free');

  await page.locator('#plan-pro').check();

  await expect(page.locator('#plan-out')).toHaveText('pro');
  await expect(page.locator('#plan-free')).not.toBeChecked();
});

test('a number input yields a number, not the string the DOM holds', async ({ page }) => {
  await expect(page.locator('#quantity-type')).toHaveText('number');
  await expect(page.locator('#quantity-total')).toHaveText('6');

  await page.locator('#quantity').fill('');
  await page.locator('#quantity').click();
  await page.keyboard.type('12');

  await expect(page.locator('#quantity-out')).toHaveText('12');
  await expect(page.locator('#quantity-type')).toHaveText('number');
  // The arithmetic is the point: a string would have produced '121212'.
  await expect(page.locator('#quantity-total')).toHaveText('36');
});

test('assigning state from a handler pushes every control back into sync', async ({ page }) => {
  await page.locator('#fill').click();

  await expect(page.locator('#name')).toHaveValue('Ada');
  await expect(page.locator('#bio')).toHaveValue('from state');
  await expect(page.locator('#colour')).toHaveValue('blue');
  await expect(page.locator('#subscribed')).toBeChecked();
  await expect(page.locator('#tag-news')).not.toBeChecked();
  await expect(page.locator('#tag-offers')).toBeChecked();
  await expect(page.locator('#tag-events')).toBeChecked();
  await expect(page.locator('#plan-pro')).toBeChecked();
  await expect(page.locator('#quantity')).toHaveValue('7');

  const palette = await page
    .locator('#palette')
    .evaluate((el) => Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.value));
  expect(palette).toEqual(['green', 'blue']);
});
