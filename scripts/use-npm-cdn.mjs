/**
 * Points the examples and both READMEs at the npm-backed CDN.
 *
 * Run this ONCE, right after the first successful `npm publish`. Before that the
 * npm paths return 404, and pointing twelve working examples at a 404 would
 * replace them all with blank pages.
 *
 * Usage:
 *   node scripts/use-npm-cdn.mjs --check    see what would change, touch nothing
 *   node scripts/use-npm-cdn.mjs            apply
 *
 * It verifies the package actually resolves on the CDN before writing anything,
 * so running it early is safe: it refuses instead of breaking the examples.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const pkg = JSON.parse(await readFile(join(root, 'packages/voodoojs/package.json'), 'utf8'));
const { name, version } = pkg;

/** Pin to the minor line, so patch releases are picked up without another edit. */
const range = version.split('.').slice(0, 2).join('.');
const base = `https://cdn.jsdelivr.net/npm/${name}@${range}/dist`;

/** Refuses to run while the package is not actually on the CDN. */
async function cdnIsLive() {
  const url = `${base}/voodoo.min.js`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { ok: res.ok, status: res.status, url };
  } catch (err) {
    return { ok: false, status: String(err), url };
  }
}

/** Every HTML file under examples/, at any depth. */
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

const RELATIVE = /src="(?:\.\.\/)+packages\/voodoojs\/dist\/(voodoo(?:\.core|\.full)?\.min\.js)"/g;

let changed = 0;
let scanned = 0;

const live = await cdnIsLive();
if (!live.ok && !check) {
  console.error(`Refusing to rewrite: ${live.url} answered ${live.status}.`);
  console.error('Publish to npm first, then run this again.');
  process.exit(1);
}
if (!live.ok) {
  console.log(`Note: ${live.url} answers ${live.status}, so --check output is hypothetical.\n`);
}

for (const file of await htmlFiles(join(root, 'examples'))) {
  scanned++;
  const before = await readFile(file, 'utf8');
  const after = before.replace(RELATIVE, (_, bundle) => `src="${base}/${bundle}"`);
  if (after === before) continue;
  changed++;
  const rel = file.slice(root.length + 1).replace(/\\/g, '/');
  console.log(`${check ? 'would rewrite' : 'rewrote'}  ${rel}`);
  if (!check) await writeFile(file, after);
}

// The READMEs document the repository CDN as the path that "works right now".
// Once the package is published, npm is the path to lead with.
for (const readme of ['README.md', 'README.pt-BR.md']) {
  const path = join(root, readme);
  const before = await readFile(path, 'utf8');
  const after = before
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/voodoojs\/dist\//g, `${base}/`)
    .replace(/https:\/\/unpkg\.com\/voodoojs\/dist\//g, `https://unpkg.com/${name}@${range}/dist/`);
  if (after === before) continue;
  changed++;
  console.log(`${check ? 'would rewrite' : 'rewrote'}  ${readme}`);
  if (!check) await writeFile(path, after);
}

console.log(`\n${scanned} HTML files scanned, ${changed} files ${check ? 'would change' : 'changed'}.`);
console.log(`CDN base: ${base}`);
if (!check && changed) {
  console.log('\nNow re-check the docs links and open one example before committing:');
  console.log('  node scripts/check-links.mjs');
}
