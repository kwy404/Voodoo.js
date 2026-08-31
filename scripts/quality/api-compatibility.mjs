/**
 * API Compatibility: a superficie publica nao pode encolher sem alguem notar.
 *
 * Compara a foto atual da API (ver scripts/api-snapshot.mjs) com a foto
 * commitada em `packages/voodoojs/api-snapshot.json`.
 *
 *   remocao ou renomeacao .... FAIL  (quebra quem ja instalou)
 *   mudanca de forma ......... FAIL  (function virou objeto, classe virou funcao)
 *   adicao ................... PASS com nota
 *
 * Renomeacao aparece como uma remocao mais uma adicao — e por isso que remocao
 * e FAIL: e o unico sinal que temos de que um nome sumiu do contrato.
 */

import { STATUS, fail, note, rel } from './lib.mjs';
import {
  SNAPSHOT_PATH,
  collectSnapshot,
  diffSnapshots,
  readSnapshot,
  writeSnapshot,
} from '../api-snapshot.mjs';

export const meta = { label: 'API Compatibility' };

function countSurface(surface) {
  return {
    V: Object.keys(surface?.V ?? {}).length,
    exports: Object.keys(surface?.exports ?? {}).length,
    directives: (surface?.directives ?? []).length,
    magics: (surface?.magics ?? []).length,
    components: (surface?.components ?? []).length,
    allowedGlobals: (surface?.allowedGlobals ?? []).length,
  };
}

export async function run(ctx) {
  const current = await collectSnapshot();

  if (ctx.flags.update) {
    const previous = readSnapshot();
    writeSnapshot(current);
    const diff = previous ? diffSnapshots(previous, current) : { removed: [], added: [], changed: [] };
    return {
      status: STATUS.PASS,
      summary: `snapshot regravado (${diff.removed.length} removidos, ${diff.added.length} adicionados)`,
      findings: [
        note(`Snapshot atualizado a pedido de --update`, {
          file: rel(SNAPSHOT_PATH),
          actual: `metodo: ${current.method}`,
        }),
      ],
      details: { updated: true, diff, counts: countSurface(current.surface) },
    };
  }

  const previous = readSnapshot();
  if (!previous) {
    return {
      status: STATUS.SKIP,
      summary: 'sem snapshot commitado para comparar',
      findings: [
        note('Nao ha linha de base da API publica', {
          file: rel(SNAPSHOT_PATH),
          expected: 'packages/voodoojs/api-snapshot.json versionado',
          actual: 'ausente',
        }),
      ],
      details: {
        howToEnable: 'node scripts/api-snapshot.mjs --update && git add packages/voodoojs/api-snapshot.json',
        counts: countSurface(current.surface),
      },
    };
  }

  const findings = [];

  // Uma foto estatica comparada com uma de runtime produziria diferenca falsa.
  if (previous.method !== current.method) {
    findings.push(
      note('Snapshot commitado e o atual usam metodos de leitura diferentes', {
        file: rel(SNAPSHOT_PATH),
        expected: `metodo "${previous.method}"`,
        actual: `metodo "${current.method}"${
          current.runtimeFallbackReason ? ` (${current.runtimeFallbackReason})` : ''
        }`,
      })
    );
  }

  const diff = diffSnapshots(previous, current);

  for (const item of diff.removed) {
    findings.push(
      fail(`API publica removida: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        expected: `${item.kind} "${item.name}" continua exportado${item.was ? ` como ${item.was}` : ''}`,
        actual: 'ausente na build atual; qualquer codigo que use esse nome quebra',
      })
    );
  }

  for (const item of diff.changed) {
    findings.push(
      fail(`API publica mudou de forma: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        expected: `${item.name} continua sendo ${item.from}`,
        actual: `agora e ${item.to}`,
      })
    );
  }

  for (const item of diff.added) {
    findings.push(
      note(`API publica nova: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        actual: 'adicao e compativel; rode com --update para incorporar ao snapshot',
      })
    );
  }

  const broken = diff.removed.length + diff.changed.length;
  const status = broken ? STATUS.FAIL : STATUS.PASS;
  const counts = countSurface(current.surface);

  return {
    status,
    summary: broken
      ? `${diff.removed.length} removidos, ${diff.changed.length} com forma diferente`
      : diff.added.length
        ? `${diff.added.length} adicoes compativeis; ${counts.V} chaves em V`
        : `${counts.V} chaves em V, ${counts.exports} exports, ${counts.directives} directives, ${counts.magics} magics`,
    findings,
    details: {
      method: current.method,
      snapshot: rel(SNAPSHOT_PATH),
      counts,
      previousCounts: countSurface(previous.surface),
      diff,
      updateCommand: 'npm run quality -- --only=api-compatibility --update',
    },
  };
}
