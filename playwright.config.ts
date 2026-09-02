import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser tests for Voodoo.js.
 *
 * The rest of the suite runs in jsdom, which is fine for tree shape and enough
 * for most of the framework. It is not enough for what this config exists to
 * cover: computed styles, real focus, real key events, node identity across a
 * reorder, and a Content-Security-Policy that a browser actually enforces.
 * jsdom has no CSP engine at all, so the project's headline security claim —
 * expressions evaluate without `unsafe-eval` — was until now only asserted by
 * grepping the source for `eval`.
 *
 * The tests load `packages/voodoojs/dist/voodoo.min.js` over HTTP from a local
 * server, exactly as a page including the CDN bundle would. Run `npm run build`
 * first; `npm run test:browser` does that for you.
 */

const PORT = Number(process.env.VOODOO_BROWSER_TEST_PORT || 5188);
const HOST = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './packages/voodoojs/test/browser',
  testMatch: /.*\.spec\.ts/,

  // Traces and other per-failure artifacts land inside node_modules, which the
  // repository already ignores, so a local run never leaves an untracked
  // directory behind for someone to accidentally commit.
  outputDir: './node_modules/.playwright/results',

  // Determinism over speed. A framework test that passes only when the machine
  // is fast is not a test, so nothing here is allowed to be retried into
  // passing and nothing is allowed to hang forever either.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },

  reporter: process.env.CI ? [['list'], ['github']] : [['list']],

  use: {
    baseURL: HOST,
    trace: 'retain-on-failure',
    // No screenshots or video: the assertions are about DOM and style values,
    // and artifacts would only add weight to CI.
    screenshot: 'off',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `node packages/voodoojs/test/browser/server.mjs ${PORT}`,
    url: `${HOST}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
