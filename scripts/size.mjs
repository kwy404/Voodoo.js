/**
 * Mede o tamanho real dos bundles gerados, cru e comprimido com gzip e brotli.
 * As metas do projeto estao declaradas em `BUDGET` e o script termina com
 * codigo de erro quando algum arquivo estoura o limite.
 */

import { readdir, readFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'packages/voodoojs/dist';

/**
 * Metas em kilobytes comprimidos com gzip.
 *
 * Os valores saem da medicao real, com cerca de 5% de folga por cima. A folga
 * existe para o orcamento pegar crescimento de verdade em vez de disparar a
 * cada linha nova: apertado demais, ele so ensina a gente a levantar o numero.
 *
 * Revisao de 2026-08-31. O build essencial estava a 78.83 KB com meta de 80, ou
 * seja, 1.2 KB de folga, e o completo a 123.28 com meta de 125. Nessa faixa
 * qualquer correcao estourava o teto. As correcoes de seguranca do avaliador de
 * expressoes (fuga de sandbox, poluicao de prototipo, saneamento de URL), os
 * avisos de desenvolvimento e o widget de devtools somaram +4.2% no minimo,
 * +2.3% no essencial e +3.0% no completo. O crescimento foi aceito de proposito
 * e as metas subiram junto.
 *
 * Ao mexer aqui, diga por que. Levantar a meta sem justificativa e o mesmo que
 * nao ter meta nenhuma.
 */
const BUDGET = {
  'voodoo.core.min.js': 46,
  'voodoo.min.js': 85,
  'voodoo.full.min.js': 133,
};

function kb(bytes) {
  return (bytes / 1024).toFixed(2);
}

const files = await readdir(DIST).catch(() => []);
if (!files.length) {
  console.error('Nada em dist. Rode "npm run build" antes.');
  process.exit(1);
}

const rows = [];
let failed = false;

for (const name of files.sort()) {
  if (!name.endsWith('.js') && !name.endsWith('.cjs')) continue;
  if (name.endsWith('.map')) continue;

  const buffer = await readFile(join(DIST, name));
  const gzip = gzipSync(buffer, { level: 9 });
  const brotli = brotliCompressSync(buffer, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  });

  const limit = BUDGET[name];
  const gzipKb = Number(kb(gzip.length));
  const status = limit ? (gzipKb <= limit ? 'ok' : 'ESTOUROU') : '';
  if (limit && gzipKb > limit) failed = true;

  rows.push({
    arquivo: name,
    cru: `${kb(buffer.length)} KB`,
    gzip: `${gzipKb} KB`,
    brotli: `${kb(brotli.length)} KB`,
    meta: limit ? `${limit} KB` : '',
    status,
  });
}

console.table(rows);

if (failed) {
  console.error('\nAlgum bundle passou da meta de tamanho.');
  process.exit(1);
}
console.log('\nTodos os bundles estao dentro da meta.');
