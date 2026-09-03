/**
 * Reports which documentation pages are still in Portuguese.
 *
 *   node scripts/check-docs-language.mjs           list them
 *   node scripts/check-docs-language.mjs --check    fail if any remain
 *
 * By content, not by the `lang` attribute. The attribute is set once and then
 * lies: eleven pages declared `lang="pt-BR"` while others had been translated
 * without the attribute being updated, so neither direction could be trusted.
 *
 * The project made English canonical for code, README and site. Documentation in
 * another language is not a cosmetic inconsistency: it decides who can adopt the
 * library and who can contribute to it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Function words, which appear at a stable rate in prose and are not shared
// between the two languages. Counting them is cruder than a real classifier and
// entirely sufficient to tell one language from the other.
const PORTUGUESE =
  /\b(você|voce|não|nao|então|entao|também|tambem|página|pagina|para|que|com|uma|dos|das|pelo|quando|porque|isso|aqui|ainda|apenas|cada|onde|sobre|entre|assim|todos|muito|seu|sua|mais|como|pode|ser|tem|faz|usa)\b/gi;

const ENGLISH =
  /\b(the|and|of|to|in|that|is|for|with|as|on|by|from|this|which|when|where|each|about|between|all|very|your|more|how|can|be|has|does|uses)\b/gi;

function pages(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) pages(path, out);
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

/** Visible prose only: script and style bodies would skew the count. */
function prose(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}

const rows = [];
for (const file of pages('site/docs')) {
  const text = prose(readFileSync(file, 'utf8'));
  const pt = (text.match(PORTUGUESE) ?? []).length;
  const en = (text.match(ENGLISH) ?? []).length;
  rows.push({
    file: file.split('\\').join('/').replace('site/docs/', ''),
    pt,
    en,
    portuguese: pt > en,
  });
}

const remaining = rows.filter((r) => r.portuguese);

for (const row of remaining) {
  console.log(`  ${row.file.padEnd(44)} pt=${String(row.pt).padStart(4)}  en=${String(row.en).padStart(4)}`);
}

console.log('');
console.log(`${remaining.length} of ${rows.length} documentation pages are still in Portuguese`);

if (process.argv.includes('--check') && remaining.length) process.exit(1);
