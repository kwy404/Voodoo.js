/**
 * Correctness: a suite inteira precisa passar.
 *
 * Roda `vitest run` de verdade e le o relatorio json. Se o vitest nao esta
 * instalado, SKIP. Se ele roda mas o relatorio nao pode ser lido, FAIL, porque
 * ai nao da para afirmar nada sobre o estado dos testes.
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
        howToEnable: 'npm install (o vitest ja consta em devDependencies da raiz)',
      },
    };
  }

  if (result.parseFailed) {
    return {
      status: STATUS.FAIL,
      summary: 'vitest rodou mas nao produziu relatorio json legivel',
      findings: [
        fail('O relatorio json do vitest nao pode ser lido', {
          file: rel(result.outputFile),
          expected: 'json valido com testResults',
          actual: `exit code ${result.exitCode}; stderr: ${result.stderr.slice(0, 400) || '(vazio)'}`,
        }),
      ],
      details: { exitCode: result.exitCode },
    };
  }

  const report = result.data;
  const failures = failuresOf(report);
  const findings = failures.map((f) =>
    fail(`Teste falhou: ${f.title}`, {
      file: rel(f.file),
      expected: 'teste passando',
      actual: f.message || 'sem mensagem',
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
      ? `${totals.failed} de ${totals.tests} testes falhando`
      : `${totals.passed}/${totals.tests} testes em ${totals.files} arquivos`;

  return { status, summary, findings, details: totals };
}
