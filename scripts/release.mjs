/**
 * Cuts a release, with the built bundles attached to it.
 *
 *   node scripts/release.mjs 0.9.0            do it
 *   node scripts/release.mjs 0.9.0 --dry-run  print the plan, change nothing
 *
 * This exists because the bundles kept not being attached. Releases v0.4.4
 * through v0.8.0 went out carrying nothing but GitHub's automatic source
 * archives, so anyone who wanted `voodoo.min.js` from a release page found only
 * a tarball of TypeScript. It was attached to v0.8.0 by hand, afterwards, which
 * is exactly the kind of step that gets skipped the next time someone is in a
 * hurry.
 *
 * The order matters and is the other reason this is a script:
 *
 *   1. bump both packages, which must not drift apart
 *   2. build, so the bundles match the version being tagged
 *   3. copy the bundles the site serves
 *   4. stamp, which rewrites the version people read and the asset cache keys
 *   5. run every gate BEFORE anything is published, because a tag cannot be
 *      taken back once someone has fetched it
 *   6. commit, tag, push
 *   7. create the release AND upload the six bundles
 *
 * It deliberately stops before `npm publish`. Publishing is the one step that
 * cannot be undone and it needs a person.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const version = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: node scripts/release.mjs <version> [--dry-run]');
  console.error('       version must look like 0.9.0');
  process.exit(1);
}

const PACKAGES = ['packages/voodoojs/package.json', 'packages/cli/package.json'];

/** The files a release page must carry. Anyone can then use a build without npm. */
const BUNDLES = [
  'packages/voodoojs/dist/voodoo.core.min.js',
  'packages/voodoojs/dist/voodoo.min.js',
  'packages/voodoojs/dist/voodoo.full.min.js',
  'packages/voodoojs/dist/voodoo.core.js',
  'packages/voodoojs/dist/voodoo.js',
  'packages/voodoojs/dist/voodoo.full.js',
];

/** Copied into site/, because the pages load them by relative path. */
const SITE_BUNDLES = [
  'voodoo.core.min.js',
  'voodoo.min.js',
  'voodoo.full.min.js',
];

const GATES = [
  ['tests', 'npm test'],
  ['types', 'npm run typecheck'],
  ['bundle size', 'node scripts/size.mjs'],
  ['version stamped', 'node scripts/stamp-version.mjs --check'],
  ['internal links', 'node scripts/check-links.mjs'],
  ['docs in English', 'node scripts/check-docs-language.mjs --check'],
  ['source in English', 'node scripts/check-source-language.mjs --check'],
  ['example frames', 'node scripts/check-frame-height.mjs'],
  ['packaging', 'node scripts/check-packaging.mjs'],
  ['lockfile in sync', 'npm ci --dry-run'],
];

function run(command, { quiet = true } = {}) {
  if (dryRun) {
    console.log(`  would run: ${command}`);
    return '';
  }
  return execSync(command, { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' });
}

function step(title) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------

step(`Releasing ${version}${dryRun ? '  (dry run)' : ''}`);

const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (dirty && !dryRun) {
  console.error('\nThe working tree has uncommitted changes. Commit or stash first:');
  console.error(dirty.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

// The changelog has to describe this version before anything is tagged.
//
// 0.9.0 and 0.10.0 both went out with no entry at all: the file stopped at
// 0.8.0, and the release pages carried `--generate-notes`, which is a list of
// commit subjects and not an account of what changed. Somebody opening either
// page learned nothing. This is the same failure as the missing bundles, and it
// gets the same treatment, a gate rather than a good intention.
step('0. Changelog');
const changelog = readFileSync('CHANGELOG.md', 'utf8');

/**
 * The section for this version, which becomes the release notes.
 *
 * Validating that the section exists and then publishing `--generate-notes`
 * anyway was half a gate. The notes on v0.9.0, v0.10.0 and v0.10.1 were a list
 * of commit subjects, which is what the tool produces when you give it nothing,
 * and somebody opening the page to find out what changed learned nothing. The
 * changelog entry is already written by then; it just was not being used.
 */
function sectionFor(target) {
  const start = changelog.indexOf(`## [${target}]`);
  if (start < 0) return null;
  const rest = changelog.slice(start);
  const end = rest.indexOf('\n## [', 1);
  const body = end < 0 ? rest : rest.slice(0, end);
  // Drop the heading itself: the release already carries the version as a title.
  return body.slice(body.indexOf('\n') + 1).trim();
}

if (!changelog.includes(`## [${version}]`)) {
  console.error(`\nCHANGELOG.md has no "## [${version}]" section.`);
  console.error('Write it first. The release notes are generated from nothing otherwise,');
  console.error('and a list of commit subjects is not a description of the release.');
  process.exit(1);
}
if (changelog.includes('\0')) {
  // A NUL byte makes git treat the file as binary, so `grep` answers
  // "Binary file matches" instead of listing the versions, which is how two
  // missing entries went unnoticed.
  console.error('\nCHANGELOG.md contains a NUL byte, which makes git treat it as binary.');
  process.exit(1);
}
console.log(`  found the section for ${version}`);

step('1. Version');
for (const file of PACKAGES) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'));
  console.log(`  ${pkg.name}  ${pkg.version} -> ${version}`);
  if (!dryRun) {
    pkg.version = version;
    writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  }
}

step('2. Build');
run('npm run build');
console.log('  built');

step('3. Bundles the site serves');
for (const name of SITE_BUNDLES) {
  run(`cp packages/voodoojs/dist/${name} site/${name}`);
  console.log(`  site/${name}`);
}

step('4. Stamp the version and the asset cache keys');
const stamped = run('node scripts/stamp-version.mjs');
if (stamped) console.log(stamped.trim().split('\n').map((l) => `  ${l}`).join('\n'));

step('5. Lockfile');
run('npm install --package-lock-only');
console.log('  updated');

step('6. Gates');
let failed = 0;
for (const [name, command] of GATES) {
  if (dryRun) {
    console.log(`  would check: ${name}`);
    continue;
  }
  try {
    execSync(command, { stdio: 'pipe' });
    console.log(`  pass  ${name}`);
  } catch {
    console.log(`  FAIL  ${name}      (${command})`);
    failed++;
  }
}
if (failed) {
  console.error(`\n${failed} gate(s) failed. Nothing was tagged or pushed.`);
  console.error('The version bump and the build are on disk; fix, then run this again.');
  process.exit(1);
}

step('7. Commit, tag, push');
run('git add -A');
run(`git commit -m "${version}"`);
run(`git tag -a v${version} -m "${version}"`);
run('git push origin main --follow-tags');
console.log(`  v${version} pushed`);

step('8. GitHub release, with the bundles attached');
const missing = BUNDLES.filter((file) => !existsSync(file));
if (missing.length && !dryRun) {
  console.error('  These bundles do not exist, so the release would carry source only:');
  for (const file of missing) console.error(`    ${file}`);
  process.exit(1);
}

// The notes are the changelog section, with a pointer to the rest. Anything
// that did not fit a release page belongs in the file, and the reader should
// be told where the file is rather than left to guess.
const notes = [
  sectionFor(version) ?? '',
  '',
  '---',
  '',
  'Read more in the [CHANGELOG](https://github.com/kwy404/Voodoo.js/blob/main/CHANGELOG.md), ' +
    'or browse the [documentation](https://kwy404.github.io/Voodoo.js/docs/) and the ' +
    '[playground](https://kwy404.github.io/Voodoo.js/playground.html).',
  '',
].join('\n');

if (!dryRun) {
  writeFileSync('.release-notes.md', notes);
}
run(
  `gh release create v${version} --title "${version}" ` +
    `--notes-file .release-notes.md ${BUNDLES.join(' ')}`
);
if (!dryRun) unlinkSync('.release-notes.md');
console.log(`  ${BUNDLES.length} bundles attached`);

// ---------------------------------------------------------------------------

console.log(`
Done. Two things are left, both of which need a person.

  npm publish --workspace=voodoojs --access public
  npm publish --workspace=voodoojs-cli --access public

Publish the library first: the CLI depends on it.

Then run \`node scripts/stamp-version.mjs\` once more and commit. The CDN pin
only moves after the registry actually serves ${version.split('.').slice(0, 2).join('.')}, so until you publish, the
site correctly keeps pointing at the previous line.

Edit the release notes at:
  https://github.com/kwy404/Voodoo.js/releases/tag/v${version}
`);
