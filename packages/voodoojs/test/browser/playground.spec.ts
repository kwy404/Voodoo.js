/**
 * The embeddable runner in a real browser: the four presets doing their jobs
 * inside the sandbox, the sandbox actually holding, and errors reaching the
 * page that embeds it.
 *
 * Only a browser can answer these. jsdom has no opaque origins, so the claim
 * that the code cannot touch the page would pass there whether it held or not.
 */

import { test, expect } from './harness';
import type { FrameLocator, Page } from '@playwright/test';

declare global {
  interface Window {
    runner: { run(code?: string): void; setTheme(theme: string | null): void; errors: string[] };
    log: { errors: string[]; ready: number[] };
    secret: string;
    VoodooPlayground: { preset(id: string): { code: string } | undefined; createRunner: Function };
  }
}

/** Runs code in the fixture's runner and waits until that run has started. */
async function run(page: Page, code: string): Promise<FrameLocator> {
  await page.evaluate((source) => {
    window.log.errors = [];
    window.log.ready = [];
    window.runner.run(source);
  }, code);
  await page.waitForFunction(() => window.log.ready.length > 0);
  return page.frameLocator('#stage iframe');
}

async function runPreset(page: Page, id: string): Promise<FrameLocator> {
  await page.goto('/fixtures/playground.html');
  const code = await page.evaluate((name) => window.VoodooPlayground.preset(name)!.code, id);
  return run(page, code);
}

test.describe('presets', () => {
  test('counter counts, and Reset is only enabled when there is something to reset', async ({ page }) => {
    const frame = await runPreset(page, 'counter');
    const reset = frame.getByRole('button', { name: 'Reset' });

    await expect(frame.locator('strong')).toHaveText('0');
    await expect(reset).toBeDisabled();

    await frame.getByRole('button', { name: 'More' }).click();
    await frame.getByRole('button', { name: 'More' }).click();
    await expect(frame.locator('p').first()).toHaveText('2 clicks');
    await expect(reset).toBeEnabled();

    await reset.click();
    await expect(frame.locator('strong')).toHaveText('0');
    expect(await page.evaluate(() => window.log.errors)).toEqual([]);
  });

  test('todo adds, checks off, removes, and says so when the list is empty', async ({ page }) => {
    const frame = await runPreset(page, 'todo');
    const items = frame.locator('li');

    await expect(items).toHaveCount(2);
    await expect(frame.getByText('1 of 2 still open')).toBeVisible();

    await frame.getByLabel('New todo').fill('Write the tests');
    await frame.getByLabel('New todo').press('Enter');
    await expect(items).toHaveCount(3);
    await expect(items.nth(2)).toContainText('Write the tests');
    await expect(frame.getByLabel('New todo')).toHaveValue('');

    // A blank entry adds nothing.
    await frame.getByLabel('New todo').fill('   ');
    await frame.getByRole('button', { name: 'Add' }).click();
    await expect(items).toHaveCount(3);

    await items.nth(1).getByRole('checkbox').check();
    await expect(items.nth(1).locator('s')).toHaveText('Add a todo of your own');
    await expect(frame.getByText('1 of 3 still open')).toBeVisible();

    for (let i = 0; i < 3; i++) await items.first().getByRole('button', { name: 'Remove' }).click();
    await expect(items).toHaveCount(0);
    await expect(frame.getByText('Nothing left to do. Add something above.')).toBeVisible();
    expect(await page.evaluate(() => window.log.errors)).toEqual([]);
  });

  test('form refuses to submit until both fields pass, then welcomes', async ({ page }) => {
    const frame = await runPreset(page, 'form');
    const name = frame.locator('input[name="name"]');
    const email = frame.locator('input[name="email"]');
    const status = frame.getByRole('status');

    await frame.getByRole('button', { name: 'Create account' }).click();
    await expect(name).toHaveClass(/v-invalid/);
    await expect(email).toHaveClass(/v-invalid/);
    await expect(name).toBeFocused();
    await expect(status).toHaveCount(0);

    await name.fill('Ana');
    await expect(name).not.toHaveClass(/v-invalid/);
    await email.fill('not an email');
    await frame.getByRole('button', { name: 'Create account' }).click();
    await expect(email).toHaveClass(/v-invalid/);
    await expect(status).toHaveCount(0);

    await email.fill('ana@example.com');
    await frame.getByRole('button', { name: 'Create account' }).click();
    await expect(status).toContainText('Welcome, Ana!');
    expect(await page.evaluate(() => window.log.errors)).toEqual([]);
  });

  test.describe('fetch', () => {
    const API = 'https://jsonplaceholder.typicode.com/users';

    async function answer(page: Page, status: number, body: unknown): Promise<void> {
      // Registered after the harness's catch-all, so it wins. The frame has an
      // opaque origin, so the answer must allow any origin, as the real API does.
      await page.route(API, (route) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(body),
        })
      );
    }

    test('lists what the API returns', async ({ page }) => {
      await answer(page, 200, [
        { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' },
        { id: 2, name: 'Ervin Howell', email: 'ervin@example.com' },
      ]);
      const frame = await runPreset(page, 'fetch');

      await expect(frame.locator('li')).toHaveCount(2);
      await expect(frame.locator('li').first()).toHaveText('Leanne Graham, leanne@example.com');
      await expect(frame.getByRole('button', { name: 'Reload' })).toBeEnabled();
    });

    test('says when the API answers with nothing', async ({ page }) => {
      await answer(page, 200, []);
      const frame = await runPreset(page, 'fetch');
      await expect(frame.getByText('The API answered with no users.')).toBeVisible();
    });

    test.describe('when the request fails', () => {
      // The browser logs the failed request on the console, which is expected.
      test.use({ allowConsoleErrors: true });

      test('shows the error instead of an empty list', async ({ page }) => {
        await answer(page, 500, { message: 'Server on fire' });
        const frame = await runPreset(page, 'fetch');
        await expect(frame.getByRole('alert')).toContainText('Could not load the users');
        await expect(frame.locator('li')).toHaveCount(0);
      });
    });
  });
});

test.describe('the sandbox', () => {
  test.use({ allowConsoleErrors: true });

  test('keeps the code away from the page that embeds it', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    const frame = await run(
      page,
      '<p id="out">waiting</p>' +
        '<script>' +
        'var seen = [];' +
        'try { seen.push("SECRET " + parent.secret) } catch (e) { seen.push("blocked") }' +
        'try { parent.document.title = "owned"; seen.push("WROTE TITLE") } catch (e) { seen.push("blocked") }' +
        'try { localStorage.setItem("k", "v"); seen.push("STORAGE") } catch (e) { seen.push("no storage") }' +
        'document.getElementById("out").textContent = seen.join(", ");' +
        '</script>'
    );

    await expect(frame.locator('#out')).toHaveText('blocked, blocked, no storage');
    expect(await page.title()).toBe('Embeddable playground');
  });

  test('runs the library in that opaque origin without an error of its own', async ({ page }) => {
    const frame = await runPreset(page, 'counter');
    await expect(frame.locator('strong')).toHaveText('0');
    expect(await page.evaluate(() => window.runner.errors)).toEqual([]);
  });

  test('is refused when asked to share the origin', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    const message = await page.evaluate(() => {
      try {
        window.VoodooPlayground.createRunner('#stage', { sandbox: 'allow-scripts allow-same-origin' });
        return 'created';
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(message).toContain('allow-same-origin');
  });
});

test.describe('errors and themes', () => {
  test.use({ allowConsoleErrors: true });

  test('reports a broken expression to the page and shows it in the frame', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    const frame = await run(page, '<div v-data="{ n: 1 }"><p>{ n.a.b }</p></div>');

    await expect.poll(() => page.evaluate(() => window.log.errors.length)).toBeGreaterThan(0);
    await expect(frame.locator('[data-playground-errors]')).toContainText('Something went wrong');
  });

  test('reports an exception thrown by the code', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    await run(page, '<script>throw new Error("from the example")</script>');
    await expect.poll(() => page.evaluate(() => window.log.errors.join(' '))).toContain(
      'from the example'
    );
  });

  test('says plainly when the library could not load', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    await page.evaluate(() => {
      window.runner = window.VoodooPlayground.createRunner('#stage', {
        runtime: '/dist/does-not-exist.js',
        onError: (m: string) => window.log.errors.push(m),
        onReady: (n: number) => window.log.ready.push(n),
      });
    });
    await run(page, '<p>hello</p>');
    const errors = await page.evaluate(() => window.log.errors.join(' | '));
    expect(errors).toContain('Voodoo.js did not load from /dist/does-not-exist.js');
  });

  test('switches the theme of a running example without running it again', async ({ page }) => {
    await page.goto('/fixtures/playground.html');
    const frame = await run(page, '<div v-data="{ n: 0 }"><button @click="n++">{ n }</button></div>');
    await frame.getByRole('button').click();
    await expect(frame.getByRole('button')).toHaveText('1');

    await page.evaluate(() => window.runner.setTheme('dark'));
    await expect(frame.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(frame.getByRole('button')).toHaveText('1');

    await page.evaluate(() => window.runner.setTheme(null));
    await expect(frame.locator('html')).not.toHaveAttribute('data-theme', /./);
  });
});

test('the bundle defaults to the CDN build of its own version', async ({ page }) => {
  await page.goto('/fixtures/playground.html');
  const [runtime, banner] = await page.evaluate(async () => [
    (window.VoodooPlayground as unknown as { CDN_RUNTIME: string }).CDN_RUNTIME,
    await fetch('/dist/voodoo.playground.min.js').then((r) => r.text()),
  ]);
  // The banner carries the version the build was stamped with.
  const version = /Voodoo\.js v(\d+\.\d+\.\d+)/.exec(banner)![1];
  expect(runtime).toBe(`https://cdn.jsdelivr.net/npm/voodoojs@${version}/dist/voodoo.full.min.js`);
});
