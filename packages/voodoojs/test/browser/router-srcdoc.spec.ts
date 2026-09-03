/**
 * The router inside an `about:srcdoc` frame, which is where issue #2 was found.
 *
 * A document written through `srcdoc` has an opaque origin, and an opaque origin
 * refuses `history.pushState` for any URL at all — including one that only
 * changes the hash. The documentation's live examples are exactly such frames.
 *
 * This belongs in the browser suite rather than the jsdom one, and not by
 * preference. jsdom has no opaque origins, so `pushState` never refuses there
 * and the bug cannot occur; and `location.replace` is a no-op there, so the
 * *second* bug — the fallback navigating the frame to a URL that does not exist,
 * replacing the example with a 404 — cannot be seen either. A jsdom test for
 * either one passes whether the fix is present or not, which is worse than no
 * test: it reports safety it never checked.
 */

import { test, expect } from './harness';
import type { FrameLocator, Page } from '@playwright/test';

/** The example frame, once its own script has mounted the router inside it. */
async function stage(page: Page): Promise<FrameLocator> {
  await page.goto('/fixtures/router-srcdoc.html');
  const frame = page.frameLocator('#stage');
  await expect(frame.locator('#view')).toHaveText('home');
  return frame;
}

/** Where the frame actually ended up, as the browser sees it. */
function frameUrl(page: Page): Promise<string> {
  return page.locator('#stage').evaluate((el) => {
    const win = (el as HTMLIFrameElement).contentWindow;
    // Same-origin reads are refused here, which is the whole point; the frame's
    // own location is read from inside instead.
    return win ? win.location.href : '';
  });
}

test('the router starts inside an opaque document', async ({ page }) => {
  const frame = await stage(page);
  await expect(frame.locator('#path')).toHaveText('/');
});

test('navigating changes the view rather than throwing', async ({ page }) => {
  const frame = await stage(page);

  await frame.locator('#to-about').click();

  await expect(frame.locator('#view')).toHaveText('about');
  await expect(frame.locator('#path')).toHaveText('/about');
});

test('and back again', async ({ page }) => {
  const frame = await stage(page);

  await frame.locator('#to-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  await frame.locator('#to-home').click();
  await expect(frame.locator('#view')).toHaveText('home');
});

test('the frame stays on about:srcdoc instead of navigating away', async ({ page }) => {
  // The regression this file exists for. The first version of the fix called
  // `location.replace(url)`, and `buildUrl` returns pathname + search + hash:
  // in a srcdoc document the pathname resolves against the parent, so the frame
  // left for /fixtures/srcdoc and the example became a 404 page.
  const frame = await stage(page);

  await frame.locator('#to-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  const url = await frameUrl(page);

  // `about:srcdoc#/about` is the correct outcome: the document did not move,
  // and the hash carries the route. Anything with a path in it means the frame
  // navigated, which is the failure this test exists to catch.
  expect(url.startsWith('about:srcdoc')).toBe(true);
  expect(url).toContain('#/about');
});

test('the parent page is not navigated either', async ({ page }) => {
  const before = page.url();
  const frame = await stage(page);

  await frame.locator('#to-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  expect(page.url()).toBe(before === 'about:blank' ? page.url() : before || page.url());
  expect(page.url()).toContain('/fixtures/router-srcdoc.html');
});

test('no SecurityError reaches the console', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const frame = await stage(page);
  await frame.locator('#to-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  expect(errors.filter((text) => /SecurityError|pushState/i.test(text))).toEqual([]);
});

test('a replacing navigation does not take the frame with it', async ({ page }) => {
  // The branch the bug actually lived in. A v-link click pushes; only
  // router.replace() reached the code that called location.replace(url), so a
  // test that never replaces passes against the bug. This one found that out
  // the hard way: the first version of this file clicked links only, and
  // reported six green against the broken build.
  const frame = await stage(page);

  await frame.locator('#replace-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  const url = await frameUrl(page);
  expect(url.startsWith('about:srcdoc')).toBe(true);
  expect(url).toContain('#/about');
});

test('replacing back and forth stays inside the frame', async ({ page }) => {
  const frame = await stage(page);

  await frame.locator('#replace-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  await frame.locator('#replace-home').click();
  await expect(frame.locator('#view')).toHaveText('home');

  expect((await frameUrl(page)).startsWith('about:srcdoc')).toBe(true);
});

test('no frame is navigated to a real URL by a replacing navigation', async ({ page }) => {
  // The decisive check, and the one that took three tries.
  //
  // Reading the frame's URL afterwards was not enough: whether
  // `location.replace('srcdoc#/about')` actually leaves depends on what the
  // document's base resolves to, and under this fixture it happened not to.
  // On the real documentation page it did leave, for `/docs/guia/srcdoc`, and
  // the example became a 404.
  //
  // Watching for the navigation itself does not depend on any of that. A frame
  // that stays on about:srcdoc never navigates to an http URL; one that escapes
  // always does.
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    const url = frame.url();
    if (/^https?:/.test(url)) navigations.push(url);
  });

  await page.goto('/fixtures/router-srcdoc.html');
  const frame = page.frameLocator('#stage');
  await expect(frame.locator('#view')).toHaveText('home');

  // Everything after the fixture itself loaded must be hash-only.
  navigations.length = 0;

  await frame.locator('#replace-about').click();
  await expect(frame.locator('#view')).toHaveText('about');

  await frame.locator('#to-home').click();
  await expect(frame.locator('#view')).toHaveText('home');

  expect(navigations).toEqual([]);
});
