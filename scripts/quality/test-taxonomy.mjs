/**
 * Classifica arquivos de teste em unitarios e de integracao.
 *
 * A classificacao e puramente estrutural: pasta ou sufixo no nome do arquivo.
 * Nao existe adivinhacao pelo conteudo. Se o projeto nao adota nenhuma das
 * convencoes, a funcao devolve listas vazias e quem chama reporta SKIP em vez
 * de chutar uma divisao que nao existe no repositorio.
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
 * Monta o resultado de um check de subconjunto da suite.
 *
 * @param kind    'unit' ou 'integration', so para o texto
 * @param result  saida de `ctx.vitest()`
 * @param match   predicado de classificacao
 * @param hint    instrucao de como habilitar a separacao
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
      summary: 'relatorio json do vitest indisponivel (ver Correctness)',
      findings: [],
      details: {},
    };
  }

  const stats = statsFor(result.data, match);
  const allFiles = (result.data.testResults ?? []).map((f) => f.name);

  if (stats.files.length === 0) {
    return {
      status: STATUS.SKIP,
      summary: `a suite nao marca testes de ${kind}`,
      findings: [
        note(
          `Nenhum arquivo de teste identificavel como "${kind}". Os ${allFiles.length} arquivos ` +
            `da suite vivem todos em packages/voodoojs/test/ sem pasta ou sufixo que separe as ` +
            `camadas, entao este check nao tem como afirmar nada e nao vai fingir que tem.`,
          { expected: hint, actual: `${allFiles.length} arquivos sem classificacao` }
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
    summary: `${stats.passed}/${stats.total} em ${stats.files.length} arquivos`,
    findings: [],
    details: { ...stats, files: stats.files.map(rel) },
  };
}
