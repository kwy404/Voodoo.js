/**
 * Keeps the version and the asset cache keys honest across the site.
 *
 *   node scripts/stamp-version.mjs           apply
 *   node scripts/stamp-version.mjs --check    report drift, change nothing
 *
 * Three things drift, and each one cost a real bug before this existed.
 *
 * The version people read. The documentation announced 0.1.0 for five releases,
 * then 0.5.0 while the package was 0.6.0. `V.version` said 0.4.6 while being
 * 0.6.2, so the library misreported itself to anyone who asked.
 *
 * The CDN pin. It has to follow what is *published*, not what is built: a
 * bumped package.json means a tag that may not exist on the registry yet, and
 * pinning the site to one breaks every page at once.
 *
 * The asset cache keys. GitHub Pages serves with `max-age=600`, so an
 * unversioned URL is served from cache long after a deploy. The first version
 * of this script keyed them on the package version, which is wrong for a
 * different reason: site assets change *between* releases. docs.js was fixed
 * three times within 0.6.2 and kept the URL `?v=0.6.2` throughout, so nobody who
 * had already loaded the page ever received any of it. The key is a content
 * hash now: the URL changes exactly when the bytes do.
 *
 * Run it before committing anything that touches the site or the version.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';

const check = process.argv.includes('--check');

const pkg = JSON.parse(await readFile('packages/voodoojs/package.json', 'utf8'));
const { version } = pkg;
const minor = version.split('.').slice(0, 2).join('.');

// ---------------------------------------------------------------------------
// Is the minor line actually on the CDN?
// ---------------------------------------------------------------------------

/**
 * Asked rather than assumed. A network failure answers no, which leaves the pin
 * where it is: the safe direction, since a wrong pin breaks the whole site.
 */
async function cdnHasMinor() {
  try {
    const response = await fetch(
      `https://cdn.jsdelivr.net/npm/${pkg.name}@${minor}/dist/voodoo.min.js`,
      { method: 'HEAD' }
    );
    return response.ok;
  } catch {
    return false;
  }
}

const pinnable = await cdnHasMinor();

// ---------------------------------------------------------------------------
// Content hashes
// ---------------------------------------------------------------------------

const hashes = new Map();

/**
 * Eight hex characters of the file's SHA-256, or null when it is not there.
 *
 * Line endings are normalised first, and that is not cosmetic. The repository
 * is checked out with `core.autocrlf=true` and carries no `.gitattributes`, so
 * the same commit is CRLF on a Windows working copy and LF on the Linux CI
 * runner. Hashing the raw bytes therefore produced a different key per
 * platform: the site was stamped `docs.js?v=e7076219` from Windows, CI computed
 * `7f9b7283` for the identical commit, and `--check` reported all 44 files as
 * drifted on a tree where nothing had changed. Whoever stamped last won, and
 * the gate could never agree with the machine enforcing it.
 *
 * Everything hashed here is text: the site's own `.js` and `.css`, and the
 * built bundles. Normalising CRLF to LF makes the key describe the content
 * rather than the checkout it came from.
 */
async function contentKey(file) {
  const key = resolve(file);
  if (hashes.has(key)) return hashes.get(key);

  let hash = null;
  if (existsSync(key)) {
    const bytes = await readFile(key);
    const normalised = Buffer.from(bytes.toString('utf8').split('\r\n').join('\n'));
    hash = createHash('sha256').update(normalised).digest('hex').slice(0, 8);
  }
  hashes.set(key, hash);
  return hash;
}

// ---------------------------------------------------------------------------
// What gets rewritten
// ---------------------------------------------------------------------------

/**
 * Every local asset reference in a file, with the path it resolves to.
 *
 * Two shapes: `src`/`href` attributes naming something under assets/, and the
 * library bundle that docs.js loads through a relative path. Both may already
 * carry a key, which is replaced rather than appended.
 */
const ASSET_PATTERNS = [
  /(?:src|href)="((?:\.\.\/)*assets\/[\w.-]+\.(?:js|css))(?:\?v=[\w.]+)?"/g,
  /((?:\.\.\/)+voodoo(?:\.core|\.full)?\.min\.js)(?:\?v=[\w.]+)?(?=['"])/g,
];

/** Rewrites one file, returning its new text. */
async function stamp(file, text) {
  let out = text;

  // The version people read.
  out = out.replace(/Voodoo\.js (\d+\.\d+\.\d+)/g, `Voodoo.js ${version}`);

  // The CDN pin, only when the registry has the line. An exact version stays
  // exact; a minor line stays a minor line.
  if (pinnable) {
    out = out.replace(/voodoojs@(\d+\.\d+(?:\.\d+)?)/g, (match, found) =>
      `voodoojs@${found.split('.').length === 3 ? version : minor}`
    );
  }

  // The asset cache keys. Async, so the matches are collected first.
  for (const pattern of ASSET_PATTERNS) {
    const jobs = [];
    out.replace(pattern, (match, path, offset) => {
      jobs.push({ match, path, offset });
      return match;
    });

    // Applied back to front, so earlier offsets stay valid.
    for (const job of jobs.reverse()) {
      // The library bundle is the exception to "resolve against the file".
      // docs.js names it relative to the documentation root at runtime, not to
      // its own folder, and the copy that ships is the freshly built one the
      // Pages workflow drops in — not the stale file sitting in site/. Hashing
      // what is actually deployed is the only key that means anything.
      const isRuntime = /voodoo(\.core|\.full)?\.min\.js$/.test(job.path);
      const target = isRuntime
        ? join('packages/voodoojs/dist', job.path.replace(/^(\.\.\/)+/, ''))
        : join(dirname(file), job.path);

      const key = await contentKey(target);
      if (!key) continue;
      const replacement = job.match.replace(
        new RegExp(`${job.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?v=[\\w.]+)?`),
        `${job.path}?v=${key}`
      );
      out = out.slice(0, job.offset) + replacement + out.slice(job.offset + job.match.length);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** Every .html and .js under site/, excluding the copied bundles. */
async function siteFiles(dir = 'site') {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await siteFiles(path)));
      continue;
    }
    if (!/\.(html|js)$/.test(entry.name)) continue;
    // The published bundles carry their own banner; they are not rewritten.
    if (/^voodoo(\.core|\.full)?(\.min)?\.js$/.test(entry.name)) continue;
    if (entry.name.endsWith('.min.js')) continue;
    out.push(path);
  }
  return out;
}

/**
 * Two version strings live in the source and were written by hand.
 *
 * `src/core.ts` is `V.version`, so its drift is visible to every consumer. The
 * banner in tsup.config.ts is the first thing anyone reads to identify a build.
 * They stay real strings rather than being injected at build time, so the value
 * is right without a bundler; `--check` is what stops them drifting.
 */
const SOURCE_EDITS = [
  {
    file: 'packages/voodoojs/src/core.ts',
    find: /export const version = '(\d+\.\d+\.\d+)';/,
    to: () => `export const version = '${version}';`,
  },
  {
    file: 'packages/voodoojs/tsup.config.ts',
    find: / \* Voodoo\.js v(\d+\.\d+\.\d+)/,
    to: () => ` * Voodoo.js v${version}`,
  },
];

const EXTRA_FILES = ['README.md', 'README.pt-BR.md', 'packages/voodoojs/README.md'];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

let changed = 0;

for (const { file, find, to } of SOURCE_EDITS) {
  const before = await readFile(file, 'utf8');
  const after = before.replace(find, to);
  if (after === before) continue;
  changed++;
  console.log(`  source version   ${file}`);
  if (!check) await writeFile(file, after);
}

for (const file of [...(await siteFiles()), ...EXTRA_FILES]) {
  const before = await readFile(file, 'utf8');
  const after = await stamp(file, before);
  if (after === before) continue;
  changed++;
  if (!check) await writeFile(file, after);
}

console.log(
  `version ${version} (CDN ${
    pinnable ? `pinned to ${minor}` : `left alone: ${minor} is not on the registry`
  })`
);
console.log(`${changed} file(s) ${check ? 'would change' : 'stamped'}`);

// As a gate: a release must not ship a page announcing the previous version, or
// an asset URL that no longer matches its content.
if (check && changed) process.exit(1);
