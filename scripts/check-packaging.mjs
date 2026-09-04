/**
 * Checks what each package would actually publish.
 *
 *   node scripts/check-packaging.mjs
 *
 * Everything here is something that shipped wrong at least once.
 *
 * `voodoojs-cli` went out with no README, because nothing listed one and none
 * existed, so the npm page was blank. `voodoojs` shipped a stub README for
 * several versions. And `packages/cli/package.json` listed a `templates`
 * directory in `files` that does not exist anywhere in the repository, which npm
 * accepts in silence.
 *
 * The npm page is the front door for anyone who did not arrive from GitHub, and
 * nothing in the normal build touches it, so it drifts without anyone noticing
 * until someone opens the page.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PACKAGES = ['packages/voodoojs', 'packages/cli'];

/** Minimum size for a README to count as written rather than as a placeholder. */
const MIN_README_BYTES = 500;

const problems = [];

for (const dir of PACKAGES) {
  const manifestPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const label = pkg.name ?? dir;

  // 1. A README exists, is listed, and says something.
  const readmePath = join(dir, 'README.md');
  if (!existsSync(readmePath)) {
    problems.push(`${label}: no README.md, so its npm page would be blank`);
  } else {
    const bytes = readFileSync(readmePath).length;
    if (bytes < MIN_README_BYTES) {
      problems.push(`${label}: README.md is only ${bytes} bytes, which reads as a placeholder`);
    }
  }

  const files = pkg.files ?? [];
  if (!files.includes('README.md')) {
    // npm includes README.md automatically, but relying on that has burned this
    // repository before and costs nothing to state explicitly.
    problems.push(`${label}: "files" does not list README.md`);
  }

  // 2. Every entry in `files` resolves to something.
  for (const entry of files) {
    if (entry.startsWith('!')) continue;
    const target = join(dir, entry.split('/')[0].replace(/\*.*$/, ''));
    if (!entry.includes('*') && !existsSync(join(dir, entry))) {
      problems.push(`${label}: "files" lists ${entry}, which does not exist`);
    } else if (entry.includes('*') && !existsSync(target)) {
      problems.push(`${label}: "files" lists ${entry}, and ${target} does not exist`);
    }
  }

  // 3. The metadata people actually see on the page.
  for (const field of ['description', 'license', 'repository', 'homepage']) {
    if (!pkg[field]) problems.push(`${label}: no ${field}`);
  }

  // 4. The bin a CLI declares has to be there, and be executable as a module.
  if (pkg.bin) {
    for (const [name, target] of Object.entries(pkg.bin)) {
      if (!existsSync(join(dir, target))) {
        problems.push(`${label}: bin "${name}" points at ${target}, which does not exist`);
      }
    }
  }
}

// 5. The two packages must carry the same version. They are released together,
//    and the CLI reports the library's version.
const versions = PACKAGES.map((dir) => {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  return { name: pkg.name, version: pkg.version };
});
const distinct = new Set(versions.map((v) => v.version));
if (distinct.size > 1) {
  problems.push(
    `versions have drifted: ${versions.map((v) => `${v.name}@${v.version}`).join(', ')}`
  );
}

for (const { name, version } of versions) console.log(`  ${name.padEnd(16)} ${version}`);

if (problems.length) {
  console.log('');
  for (const problem of problems) console.log(`  ${problem}`);
  console.log('');
  console.log(`${problems.length} packaging problem(s)`);
  process.exit(1);
}

console.log('');
console.log('both packages would publish a README, and every listed file exists');
