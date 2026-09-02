/**
 * Browser Tests: runs the real-browser suite against the built CDN bundle.
 *
 * The suite lives in `packages/voodoojs/test/browser` and is driven by
 * Playwright, configured by `playwright.config.ts` at the root. It loads
 * `dist/voodoo.min.js` over HTTP into a real Chromium, exactly as a page
 * including the CDN script would, and covers what jsdom structurally cannot:
 * computed styles and layout, real focus movement and key events, node
 * identity across a `v-for` reorder, and a Content-Security-Policy the browser
 * actually enforces.
 *
 * This check never invents a result. When the runner is not installed, or its
 * browser binaries were never downloaded, the answer is SKIP with the command
 * that would enable it — never a PASS of convenience. It reports FAIL only for
 * a suite that ran and did not pass.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DIST_DIR, ROOT, STATUS, fail, hasPackage, note, rel, runNode, warn } from './lib.mjs';

export const meta = { label: 'Browser Tests' };

const BUNDLE = join(DIST_DIR, 'voodoo.min.js');
const CONFIG = join(ROOT, 'playwright.config.ts');
const SUITE_DIR = join(ROOT, 'packages', 'voodoojs', 'test', 'browser');
const CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

const HOW_TO_INSTALL =
  'npm i -D @playwright/test && npx playwright install chromium, then run npm run quality again';

const HOW_TO_DOWNLOAD =
  'npx playwright install chromium (or npm run test:browser:install) — the runner is installed ' +
  'but its browser binaries are not on this machine';

/** `true` when the run failed because the browser was never downloaded. */
function missingBrowser(output) {
  return /Executable doesn't exist|Please run the following command to download new browsers|npx playwright install/i.test(
    output
  );
}

/** Flattens Playwright's nested JSON report into one entry per test. */
function flatten(suite, trail = []) {
  const out = [];
  const path = suite.title ? [...trail, suite.title] : trail;

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      out.push({
        title: [...path, spec.title].filter(Boolean).join(' › '),
        status: test.status,
        results: test.results ?? [],
      });
    }
  }
  for (const child of suite.suites ?? []) out.push(...flatten(child, path));
  return out;
}

/** First error message a failed test produced, trimmed for the report. */
function firstError(entry) {
  for (const result of entry.results) {
    const message = result.error?.message ?? result.errors?.[0]?.message;
    // Playwright colours its messages; the report is plain text.
    if (message) return String(message).replace(/\[[0-9;]*m/g, '').split('\n').slice(0, 4).join(' ').trim();
  }
  return 'no error message in the report';
}

export async function run(ctx) {
  if (!hasPackage('@playwright/test') || !existsSync(CLI)) {
    return {
      status: STATUS.SKIP,
      summary: 'no browser runner installed',
      findings: [],
      details: { howToEnable: HOW_TO_INSTALL, checked: ['@playwright/test'] },
    };
  }

  if (!existsSync(CONFIG) || !existsSync(SUITE_DIR)) {
    return {
      status: STATUS.SKIP,
      summary: 'browser suite not present',
      findings: [],
      details: {
        howToEnable: `expected ${rel(CONFIG)} and ${rel(SUITE_DIR)}`,
      },
    };
  }

  if (!existsSync(BUNDLE)) {
    return {
      status: STATUS.FAIL,
      summary: 'CDN bundle missing',
      findings: [
        fail('The browser suite loads the built bundle and it is not there', {
          file: rel(BUNDLE),
          expected: 'existing file',
          actual: 'not found; run npm run build',
        }),
      ],
      details: {},
    };
  }

  const reportFile = join(ctx.scratch, 'playwright-report.json');
  const result = runNode([CLI, 'test', '--reporter=json'], {
    env: { PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile },
    timeout: 10 * 60 * 1000,
  });

  const output = `${result.stdout}\n${result.stderr}`;

  if (!existsSync(reportFile)) {
    if (missingBrowser(output)) {
      return {
        status: STATUS.SKIP,
        summary: 'browser binaries not downloaded',
        findings: [],
        details: { howToEnable: HOW_TO_DOWNLOAD },
      };
    }
    return {
      status: STATUS.FAIL,
      summary: 'the runner produced no report',
      findings: [
        fail('Playwright did not write a report', {
          expected: 'a json report from the run',
          actual: output.slice(0, 900) || 'no output',
        }),
      ],
      details: { exitCode: result.code },
    };
  }

  let report;
  try {
    report = JSON.parse(readFileSync(reportFile, 'utf8'));
  } catch (err) {
    return {
      status: STATUS.FAIL,
      summary: 'unreadable report',
      findings: [fail('Could not parse the json report', { actual: String(err && err.message) })],
      details: { exitCode: result.code },
    };
  }

  const stats = report.stats ?? {};
  const entries = (report.suites ?? []).flatMap((suite) => flatten(suite));
  const failed = entries.filter((entry) => entry.status === 'unexpected');
  const flaky = entries.filter((entry) => entry.status === 'flaky');
  // A test the suite marks as an expected failure: it pins a known defect with
  // the correct assertion, and turns into a failure here the day it starts
  // passing and the annotation is left behind.
  const expectedFailures = entries.filter(
    (entry) => entry.status === 'expected' && entry.results.some((r) => r.status === 'failed')
  );

  const findings = [
    ...failed.map((entry) =>
      fail(`Browser test failed: ${entry.title}`, {
        file: rel(SUITE_DIR),
        expected: 'passing',
        actual: firstError(entry),
      })
    ),
    ...flaky.map((entry) =>
      warn(`Browser test is flaky: ${entry.title}`, {
        file: rel(SUITE_DIR),
        expected: 'a deterministic result',
        actual: firstError(entry),
      })
    ),
    ...(report.errors ?? []).map((error) =>
      fail('The browser runner reported an error outside any test', {
        actual: String(error.message ?? error).slice(0, 500),
      })
    ),
  ];

  for (const entry of expectedFailures) {
    findings.push(
      note(`Known defect pinned by an expected failure: ${entry.title}`, {
        file: rel(SUITE_DIR),
        actual: firstError(entry),
      })
    );
  }

  const total = entries.length;
  if (!total) {
    return {
      status: STATUS.FAIL,
      summary: 'the suite ran no tests',
      findings: [
        fail('Playwright found no test to run', {
          file: rel(SUITE_DIR),
          expected: 'at least one spec',
          actual: 'zero tests collected',
        }),
      ],
      details: { exitCode: result.code },
    };
  }

  const status = failed.length || (report.errors ?? []).length
    ? STATUS.FAIL
    : flaky.length
      ? STATUS.WARN
      : STATUS.PASS;

  const specFiles = new Set(
    (report.suites ?? []).map((suite) => suite.file).filter(Boolean)
  );

  return {
    status,
    summary:
      status === STATUS.PASS
        ? `${stats.expected ?? total} tests in a real Chromium against ${rel(BUNDLE)}`
        : `${failed.length} failing, ${flaky.length} flaky of ${total} browser tests`,
    findings,
    details: {
      runner: '@playwright/test',
      bundle: rel(BUNDLE),
      suite: rel(SUITE_DIR),
      specFiles: [...specFiles].sort(),
      tests: total,
      passed: stats.expected ?? 0,
      failed: stats.unexpected ?? failed.length,
      flaky: stats.flaky ?? flaky.length,
      skipped: stats.skipped ?? 0,
      expectedFailures: expectedFailures.map((entry) => entry.title),
      durationMs: Math.round(stats.duration ?? 0),
      exitCode: result.code,
    },
  };
}
