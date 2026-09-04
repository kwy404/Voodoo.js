/**
 * Classifies test files as unit or integration.
 *
 * The classification is purely structural: folder or suffix in the file name.
 * There is no guessing from content. If the project adopts none of the
 * conventions, the function returns empty lists and the caller reports SKIP instead
 * of guessing a division that does not exist in the repository.
 */

import { STATUS, note, rel } from './lib.mjs';
import { statsFor } from './vitest-report.mjs';

const UNIT_DIR = /[\\/](unit|unitarios)[\\/]/i;
const UNIT_NAME = /[\\/][^\\/]*\.unit\.test\.[cm]?[jt]sx?$/i;

const INTEGRATION_DIR = /[\\/](integration|integracao|e2e)[\\/]/i;
const INTEGRATION_NAME = /[\\/][^\\/]*\.(integration|integracao|int|e2e)\.test\.[cm]?[jt]sx?$/i;

export function isUnit(file) {
  return UNIT_DIR.test(file) || UNIT_NAME.test(file);
}

export function isIntegration(file) {
  return INTEGRATION_DIR.test(file) || INTEGRATION_NAME.test(file);
}

/**
 * Assembles the result of a suite subset check.
 *
 * @param kind    'unit' or 'integration', for text only
 * @param result  output from `ctx.vitest()`
 * @param match   classification predicate
 * @param hint    instructions on how to enable the separation
 */
export function subsetResult(kind, result, match, hint) {
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

  const stats = statsFor(result.data, match);
  const allFiles = (result.data.testResults ?? []).map((f) => f.name);

  if (stats.files.length === 0) {
    return {
      status: STATUS.SKIP,
      summary: `the suite does not mark ${kind} tests`,
      findings: [
        note(
          `No test file identifiable as "${kind}". The ${allFiles.length} files ` +
            `of the suite all live in packages/voodoojs/test/ without a folder or suffix that separates the ` +
            `layers, so this check has no way to assert anything and won't pretend it does.`,
          { expected: hint, actual: `${allFiles.length} files without classification` }
        ),
      ],
      details: {
        howToEnable: hint,
        allTestFiles: allFiles.map(rel),
        classified: 0,
      },
    };
  }

  const status = stats.failed > 0 ? STATUS.FAIL : STATUS.PASS;
  return {
    status,
    summary: `${stats.passed}/${stats.total} in ${stats.files.length} files`,
    findings: [],
    details: { ...stats, files: stats.files.map(rel) },
  };
}
