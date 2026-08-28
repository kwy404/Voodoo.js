/**
 * Mede o tamanho real dos bundles gerados, cru e comprimido com gzip e brotli.
 * As metas do projeto estao declaradas em `BUDGET` e o script termina com
 * codigo de erro quando algum arquivo estoura o limite.
 */

import { readdir, readFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'packages/voodoojs/dist';

/** Metas em kilobytes comprimidos com gzip. */
const BUDGET = {
  'voodoo.min.js': 60,
  'index.js': 60,
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
