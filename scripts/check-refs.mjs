/**
 * Resolves every relative href/src under a folder and reports the dead ones.
 *
 *   node scripts/check-refs.mjs site
 *
 * Written after moving examples/ and design-system/ into site/: the move fixed
 * the paths that pointed at the site, and silently broke the eleven that climbed
 * out of it to reach a stylesheet. Nothing failed loudly — the pages just
 * rendered unstyled, which is the kind of breakage a link checker exists for.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = process.argv[2] ?? 'site';

let ok = 0;
const broken = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.html')) check(path);
  }
}

function check(file) {
  const html = readFileSync(file, 'utf8');
  // Only relative references that climb: those are the ones a folder move
  // breaks. Absolute URLs and same-directory names are someone else's problem.
  for (const match of html.matchAll(/(?:href|src)="((?:\.\.\/)+[^"#?]*)"/g)) {
    const target = resolve(dirname(file), match[1]);
    if (existsSync(target)) ok++;
    else broken.push({ file: file.replace(/\\/g, '/'), ref: match[1] });
  }
}

walk(root);

for (const { file, ref } of broken) {
  console.log(`  BROKEN  ${file}  ->  ${ref}`);
}

console.log('');
console.log(`${ok} relative references resolve, ${broken.length} broken`);

process.exit(broken.length ? 1 : 0);
