/**
 * The bundles served by the site must match the ones the build produced.
 *
 * `site/*.min.js` are copies, kept by hand, and nothing checked them. They had
 * drifted: the site was serving a build from an earlier session while `dist/`
 * held the current one, so a feature could pass every test, be committed, be
 * published, and still be missing from the documentation, the playground and
 * the landing page. It cost an afternoon of debugging a bug that did not exist.
 *
 *   node scripts/check-site-bundles.mjs           reports drift, exit 1
 *   node scripts/check-site-bundles.mjs --fix     copies dist over site
 */

import { readFileSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BUNDLES = ['voodoo.core.min.js', 'voodoo.min.js', 'voodoo.full.min.js'];
const fix = process.argv.includes('--fix');

function digest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12);
}

const drifted = [];
const missing = [];

for (const name of BUNDLES) {
  const built = `packages/voodoojs/dist/${name}`;
  const served = `site/${name}`;

  if (!existsSync(built)) {
    missing.push(`${built} — run npm run build first`);
    continue;
  }
  if (!existsSync(served)) {
    missing.push(served);
    continue;
  }
  if (digest(built) !== digest(served)) {
    drifted.push({ name, built: digest(built), served: digest(served) });
  }
}

if (missing.length) {
  console.error('Missing bundle(s):');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

if (!drifted.length) {
  console.log(`site bundles match dist (${BUNDLES.length} checked)`);
  process.exit(0);
}

if (fix) {
  for (const { name } of drifted) {
    copyFileSync(`packages/voodoojs/dist/${name}`, `site/${name}`);
    console.log(`copied ${name}`);
  }
  console.log(`${drifted.length} bundle(s) refreshed`);
  process.exit(0);
}

console.error('The site is serving bundles that are not the ones just built:');
for (const { name, built, served } of drifted) {
  console.error(`  ${name}  dist=${built}  site=${served}`);
}
console.error('\nRun: node scripts/check-site-bundles.mjs --fix');
process.exit(1);
