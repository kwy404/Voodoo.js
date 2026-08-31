/**
 * Roda a suite uma unica vez e compartilha o resultado.
 *
 * `correctness`, `unit`, `integration` e `memory` olham para a mesma execucao,
 * entao rodar o vitest quatro vezes seria desperdicio puro. O orquestrador
 * guarda a promessa desta funcao em `ctx` e todo mundo espera pela mesma.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, localBin, read, readJson, run, runNode, writeTemp } from './lib.mjs';

/** Caminho do entry point do vitest instalado, ou `null` se nao houver. */
export function vitestEntry() {
  return (
    localBin('vitest/vitest.mjs') ||
    localBin('vitest/dist/cli.js') ||
    localBin('vitest/vitest.js') ||
    null
  );
}

/**
 * Executa `vitest run --reporter=json`.
 *
 * @returns objeto com `available`, `data` (relatorio json) e a saida crua.
 */
export function runVitest(scratch) {
  const entry = vitestEntry();
  if (!entry) {
    return {
      available: false,
      reason: 'vitest nao esta instalado em node_modules',
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

/** Extrai as falhas de um relatorio json do vitest, com arquivo e mensagem. */
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

/** Estatisticas de um subconjunto de arquivos de teste. */
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
