/**
 * Reports source files whose comments are still in Portuguese.
 *
 *   node scripts/check-source-language.mjs           list them
 *   node scripts/check-source-language.mjs --check    fail if any remain
 *
 * The project made English canonical. A Portuguese comment is not a style
 * quibble: it is the difference between a contributor being able to read why a
 * line is the way it is, and having to guess.
 *
 * Detection is on accented words and Portuguese-only function words that no
 * English comment would contain. An earlier version of this check used
 * unaccented spellings and reported the whole tree clean while tsup.config.ts
 * was entirely Portuguese, so the words here are chosen to be unambiguous
 * rather than numerous.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MARKERS = [
  // Accented, and unmistakable.
  /[ãõçáéíóúâêôàü]/i,
  // Unaccented spellings that are still Portuguese-only.
  /\b(nao|entao|porque|proprio|propria|proprias|proprios|tambem|arquivo|arquivos|funcao|funcoes|valor|valores|retorna|elemento|elementos|escopo|atributo|atributos|tamanho|orcamento|entrada|saida|camada|historia|mesma|dentro|entao|cada|quando|onde|sobre|assim|todos|toda|todas|apenas|ainda|precisa|garante|evita|usa|feito|feita)\b/i,
];

/** A comment line, stripped of its marker. */
function comments(source) {
  const out = [];
  for (const line of source.split(/\r?\n/)) {
    const text = line.trim();
    if (text.startsWith('//')) out.push(text.slice(2));
    else if (text.startsWith('*') && !text.startsWith('*/')) out.push(text.slice(1));
    else if (text.startsWith('/*')) out.push(text.slice(2));
  }
  return out;
}

/**
 * A line is Portuguese when a marker fires and the line is not simply a URL, a
 * type name or a code fragment quoted inside prose.
 */
function portuguese(line) {
  const prose = line.replace(/`[^`]*`/g, ' ').replace(/https?:\/\/\S+/g, ' ');
  return MARKERS.some((marker) => marker.test(prose));
}

// Source only. `packages/voodoojs/dist` is committed on purpose, and its
// generated `.d.ts` files would otherwise be scanned, and would fail outright
// when a rebuild has renamed a content-hashed chunk that git still tracks.
const files = execSync(
  'git ls-files "packages/voodoojs/src/**/*.ts" "packages/voodoojs/test/**/*.ts" ' +
    '"packages/voodoojs/*.ts" "scripts/*.mjs" "*.ts"',
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(Boolean)
  .filter((file) => existsSync(file));

const rows = [];
for (const file of files) {
  const hits = comments(readFileSync(file, 'utf8')).filter(portuguese);
  if (hits.length) rows.push({ file, hits });
}

rows.sort((a, b) => b.hits.length - a.hits.length);

for (const row of rows) {
  console.log(`  ${row.file}  (${row.hits.length} line${row.hits.length === 1 ? '' : 's'})`);
  for (const hit of row.hits.slice(0, 3)) console.log(`      ${hit.trim().slice(0, 88)}`);
}

console.log('');
console.log(`${rows.length} of ${files.length} source files have Portuguese comments`);

if (process.argv.includes('--check') && rows.length) process.exit(1);
