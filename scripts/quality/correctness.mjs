/**
 * Correctness: the entire suite must pass.
 *
 * Runs `vitest run` for real and reads the json report. If vitest is not
 * installed, SKIP. If it runs but the report cannot be read, FAIL, because
 * then there is no way to assert anything about the test state.
 */

import { STATUS, fail, rel } from './lib.mjs';
import { failuresOf } from './vitest-report.mjs';

export const meta = { label: 'Correctness' };

export async function run(ctx) {
  const result = await ctx.vitest();

  if (!result.available) {
    return {
      status: STATUS.SKIP,
      summary: result.reason,
      findings: [],
      details: {
        howToEnable: 'npm install (vitest is already in devDependencies at the root)',
      },
    };
  }

  if (result.parseFailed) {
    return {
      status: STATUS.FAIL,
      summary: 'vitest ran but did not produce a readable json report',
      findings: [
        fail('The vitest json report cannot be read', {
          file: rel(result.outputFile),
          expected: 'valid json with testResults',
          actual: `exit code ${result.exitCode}; stderr: ${result.stderr.slice(0, 400) || '(empty)'}`,
        }),
      ],
      details: { exitCode: result.exitCode },
    };
  }

  const report = result.data;
  const failures = failuresOf(report);
  const findings = failures.map((f) =>
    fail(`Test failed: ${f.title}`, {
      file: rel(f.file),
      expected: 'test passing',
      actual: f.message || 'no message',
    })
  );

  const totals = {
    tests: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests + report.numTodoTests,
    files: report.testResults.length,
  };

  const status = totals.failed > 0 || result.exitCode !== 0 ? STATUS.FAIL : STATUS.PASS;
  const summary =
    status === STATUS.FAIL
      ? `${totals.failed} of ${totals.tests} tests failing`
      : `${totals.passed}/${totals.tests} tests in ${totals.files} files`;

  return { status, summary, findings, details: totals };
}
