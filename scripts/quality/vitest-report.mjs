/**
 * Runs the suite once and shares the result.
 *
 * `correctness`, `unit`, `integration` and `memory` look at the same execution,
 * so running vitest four times would be pure waste. The orchestrator keeps the
 * promise of this function in `ctx` and everyone waits for the same one.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, localBin, read, readJson, run, runNode, writeTemp } from './lib.mjs';

/** Path to the installed vitest entry point, or `null` if there is none. */
export function vitestEntry() {
  return (
    localBin('vitest/vitest.mjs') ||
    localBin('vitest/dist/cli.js') ||
    localBin('vitest/vitest.js') ||
    null
  );
}

/**
 * Runs `vitest run --reporter=json`.
 *
 * @returns object with `available`, `data` (json report) and raw output.
 */
export function runVitest(scratch) {
  const entry = vitestEntry();
  if (!entry) {
    return {
      available: false,
      reason: 'vitest is not installed in node_modules',
      data: null,
    };
  }

  const outputFile = join(scratch, 'vitest-report.json');
  const result = runNode([entry, 'run', '--reporter=json', `--outputFile=${outputFile}`], {
    cwd: ROOT,
    timeout: 15 * 60 * 1000,
  });

  const data = existsSync(outputFile) ? readJson(outputFile) : null;

  return {
    available: true,
    exitCode: result.code,
    stdout: result.stdout,
    stderr: result.stderr,
    outputFile,
    data,
    parseFailed: data == null,
  };
}

/** Extracts failures from a vitest json report, with file and message. */
export function failuresOf(report) {
  const out = [];
  for (const file of report?.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status !== 'failed') continue;
      out.push({
        file: file.name,
        title: [...(assertion.ancestorTitles ?? []), assertion.title].filter(Boolean).join(' > '),
        message: (assertion.failureMessages ?? []).join('\n').split('\n').slice(0, 6).join('\n'),
      });
    }
  }
  return out;
}

/** Statistics of a subset of test files. */
export function statsFor(report, predicate) {
  const files = (report?.testResults ?? []).filter((f) => predicate(f.name));
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const file of files) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'passed') passed++;
      else if (assertion.status === 'failed') failed++;
      else skipped++;
    }
  }
  return { files: files.map((f) => f.name), passed, failed, skipped, total: passed + failed + skipped };
}

export { read, writeTemp, run };
