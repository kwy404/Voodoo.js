/**
 * Memory: the suite's leak tests.
 *
 * Searches for test files with `memory`, `memoria`, `leak` or `vazamento` in the
 * name and reads their results from the execution already done by Correctness. If none
 * exist, SKIP with instructions. There is no way to assert there are no leaks without
 * a test that tries to cause one.
 */

import { STATUS, fail, note, rel } from './lib.mjs';
import { statsFor } from './vitest-report.mjs';

export const meta = { label: 'Memory' };

const MEMORY_TEST = /[\\/][^\\/]*(memory|memoria|leak|vazamento)[^\\/]*\.test\.[cm]?[jt]sx?$/i;

const HOW_TO_ENABLE =
  'create packages/voodoojs/test/memory.test.ts (or *.leak.test.ts) exercising ' +
  'walk/destroy, effectScope, v-on listeners and stores in repeated cycles, ' +
  'checking that WeakRef/FinalizationRegistry or internal counters return to zero';

export async function run(ctx) {
  const result = await ctx.vitest();

  if (!result.available) {
    return {
      status: STATUS.SKIP,
      summary: result.reason,
      findings: [],
      details: { howToEnable: 'npm install' },
    };
  }
  if (result.parseFailed) {
    return {
      status: STATUS.SKIP,
      summary: 'vitest json report unavailable (see Correctness)',
      findings: [],
      details: {},
    };
  }

  const stats = statsFor(result.data, (f) => MEMORY_TEST.test(f));

  if (!stats.files.length) {
    return {
      status: STATUS.SKIP,
      summary: 'no leak tests in the suite',
      findings: [
        note('There is no memory test; this check has nothing to verify', {
          expected: 'test file matching *memory*/*leak*/*vazamento*.test.ts',
          actual: 'none found in packages/voodoojs/test/',
        }),
      ],
      details: { howToEnable: HOW_TO_ENABLE, pattern: String(MEMORY_TEST) },
    };
  }

  const findings = [];
  for (const file of result.data.testResults ?? []) {
    if (!MEMORY_TEST.test(file.name)) continue;
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status !== 'failed') continue;
      findings.push(
        fail(`Leak test failed: ${assertion.title}`, {
          file: rel(file.name),
          expected: 'no leaks',
          actual: (assertion.failureMessages ?? []).join('\n').split('\n').slice(0, 5).join('\n'),
        })
      );
    }
  }

  return {
    status: findings.length ? STATUS.FAIL : STATUS.PASS,
    summary: `${stats.passed}/${stats.total} in ${stats.files.length} leak files`,
    findings,
    details: { ...stats, files: stats.files.map(rel) },
  };
}
