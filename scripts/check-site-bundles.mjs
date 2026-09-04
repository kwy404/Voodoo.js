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

/**
 * Line endings are normalised first, and that is not cosmetic.
 *
 * The repository is checked out with `core.autocrlf=true` and carries no
 * `.gitattributes`, so a bundle is CRLF in a Windows working copy and LF on the
 * Linux runner. CI also rebuilds `dist/` before this runs, which means it was
 * comparing a freshly built LF file against a committed CRLF one and reporting
 * drift on a tree where the bytes that matter were identical. The first release
 * after this gate went in failed on exactly that.
 *
 * `stamp-version.mjs` normalises for the same reason. The hash should describe
 * the content, not the checkout it came from.
 */
function digest(path) {
  const normalised = readFileSync(path, 'utf8').split('\r\n').join('\n');
  return createHash('sha256').update(normalised).digest('hex').slice(0, 12);
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

/**
 * The version baked into the bundle must be the version being released.
 *
 * `stamp-version.mjs` rewrites the constant in `src/core.ts` and the banner in
 * `tsup.config.ts`, so the build has to run AFTER stamping. Doing it the other
 * way round produces bundles that are correct in every way except that they
 * report the previous version — `V.version` lies, and the banner at the top of
 * the file lies with it.
 *
 * That is exactly what happened cutting 0.12.2: build, sync, stamp. Nothing
 * failed, every test passed, the release was tagged and the assets uploaded,
 * and the bundles inside said 0.12.1. Only a byte-level diff between two builds
 * gave it away. A released artifact that misreports its own version is the kind
 * of thing that wastes somebody's afternoon much later, so it is checked here.
 */
function embeddedVersion(path) {
  const text = readFileSync(path, 'utf8');
  const banner = text.match(/Voodoo\.js v(\d+\.\d+\.\d+)/);
  return banner ? banner[1] : null;
}

const expected = JSON.parse(readFileSync('packages/voodoojs/package.json', 'utf8')).version;
const mislabelled = [];

for (const name of BUNDLES) {
  const found = embeddedVersion(`packages/voodoojs/dist/${name}`);
  if (found && found !== expected) mislabelled.push({ name, found });
}

if (mislabelled.length) {
  console.error(`These bundles report a version they are not (package.json says ${expected}):`);
  for (const { name, found } of mislabelled) console.error(`  ${name} says ${found}`);
  console.error('\nStamp before building: node scripts/stamp-version.mjs && npm run build');
  process.exit(1);
}

if (!drifted.length) {
  console.log(`site bundles match dist (${BUNDLES.length} checked, all reporting ${expected})`);
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
