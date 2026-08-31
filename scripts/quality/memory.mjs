/**
 * Memory: os testes de vazamento da suite.
 *
 * Procura arquivos de teste com `memory`, `memoria`, `leak` ou `vazamento` no
 * nome e le o resultado deles na execucao ja feita pelo Correctness. Se nenhum
 * existe, SKIP com a instrucao — nao da para afirmar que nao ha vazamento sem
 * um teste que tente provocar um.
 */

import { STATUS, fail, note, rel } from './lib.mjs';
import { statsFor } from './vitest-report.mjs';

export const meta = { label: 'Memory' };

const MEMORY_TEST = /[\\/][^\\/]*(memory|memoria|leak|vazamento)[^\\/]*\.test\.[cm]?[jt]sx?$/i;

const HOW_TO_ENABLE =
  'crie packages/voodoojs/test/memory.test.ts (ou *.leak.test.ts) exercitando ' +
  'walk/destroy, effectScope, listeners de v-on e stores em ciclos repetidos, ' +
  'verificando que WeakRef/FinalizationRegistry ou os contadores internos voltam a zero';

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
      summary: 'relatorio json do vitest indisponivel (ver Correctness)',
      findings: [],
      details: {},
    };
  }

  const stats = statsFor(result.data, (f) => MEMORY_TEST.test(f));

  if (!stats.files.length) {
    return {
      status: STATUS.SKIP,
      summary: 'nenhum teste de vazamento na suite',
      findings: [
        note('Nao existe teste de memoria; este check nao tem o que verificar', {
          expected: 'arquivo de teste casando com *memory*/*leak*/*vazamento*.test.ts',
          actual: 'nenhum encontrado em packages/voodoojs/test/',
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
        fail(`Teste de vazamento falhou: ${assertion.title}`, {
          file: rel(file.name),
          expected: 'sem vazamento',
          actual: (assertion.failureMessages ?? []).join('\n').split('\n').slice(0, 5).join('\n'),
        })
      );
    }
  }

  return {
    status: findings.length ? STATUS.FAIL : STATUS.PASS,
    summary: `${stats.passed}/${stats.total} em ${stats.files.length} arquivos de vazamento`,
    findings,
    details: { ...stats, files: stats.files.map(rel) },
  };
}
