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
import { execSync } from 'node:child_process';

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
 *
 * The EXACT version, not the minor line, and that distinction is the whole
 * point. This used to ask for `0.12` while the stamp writes `0.12.1`, so the
 * moment 0.12.0 was published every later patch passed a check it should have
 * failed: `0.12` resolved, the site was pinned to a `0.12.1` that did not exist
 * yet, and the pages served a 404 for their own library until somebody
 * published. The guard was written to prevent precisely that and was asking the
 * wrong question.
 */
async function cdnHasVersion() {
  try {
    const response = await fetch(
      `https://cdn.jsdelivr.net/npm/${pkg.name}@${version}/dist/voodoo.min.js`,
      { method: 'HEAD' }
    );
    return response.ok;
  } catch {
    return false;
  }
}

const pinnable = await cdnHasVersion();

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

/**
 * Files that ship inside the npm tarball.
 *
 * These pin unconditionally, and the reason is a chicken and egg the guard
 * below cannot see. Stamping happens during the release, when the version is
 * not on the registry yet, so `pinnable` is false and the README is left on the
 * previous line. That README is then published, and the npm page for 0.11.0
 * tells everybody to load 0.10. It was wrong on every release until somebody
 * opened the page and noticed.
 *
 * For a page served from GitHub Pages the guard is right: it goes live
 * immediately and must not point at a version the CDN cannot serve. For a file
 * that only becomes visible BY being published, the version is guaranteed to
 * exist by the time anyone reads it.
 */
const SHIPPED = ['packages/voodoojs/README.md', 'packages/cli/README.md'];

/** Rewrites one file, returning its new text. */
async function stamp(file, text) {
  let out = text;

  // The version people read.
  out = out.replace(/Voodoo\.js (\d+\.\d+\.\d+)/g, `Voodoo.js ${version}`);

  // The CDN pin, written as the EXACT version rather than the minor line.
  //
  // A minor range looks friendlier, since patches then arrive without an edit,
  // and it was the rule here until two things made it untenable.
  //
  // It hides the release. `voodoojs@0.11` is unchanged by 0.11.0, 0.11.1 and
  // everything after, so a reader opening the README or the npm page after a
  // fix cannot tell whether it landed, and neither could anyone here without
  // querying the registry.
  //
  // And it is slow where it matters most. jsDelivr caches a range at the edge
  // with `s-maxage=43200`, so a published fix takes twelve hours to reach the
  // site: 0.10.1 fixed the playground and the playground kept serving 0.10.0
  // until the cache was purged by hand. An exact version is a different URL,
  // which no stale range can shadow, and it is live the moment npm has it.
  //
  // The cost is that a page pinned this way does not pick up the next patch on
  // its own. For documentation that is the right trade: these pages are stamped
  // on every release anyway.
  const shipped = SHIPPED.includes(file.split('\\').join('/'));
  if (pinnable || shipped) {
    out = out.replace(/voodoojs@\d+\.\d+(?:\.\d+)?/g, `voodoojs@${version}`);
  }

  // Every CDN tag names the FULL build, pinned, on every CDN, whether or not it
  // already carried a version. This is correctness rather than preference.
  //
  // JSX lives only in the full build. A page that loads `voodoo.min.js`, the
  // essential one, and then shows `{items.map(x => (<li>{x}</li>))}` is showing
  // something that cannot work, and twenty-one CDN tags across the docs did
  // exactly that. Someone copying the tag from the installation page and the
  // example from the JSX page would get a page printing its own source back at
  // them, with nothing to explain why.
  //
  // The first version of this rule matched `voodoojs@<version>/dist/` only, so
  // it silently skipped every tag written WITHOUT a version — and those are
  // exactly the tags nobody had ever pinned. Twenty-three of them, across the
  // installation guide, the getting-started page, the issue template and the
  // example READMEs, still handed out the build JSX does not run in. Matching
  // the optional version rather than requiring it is the whole fix.
  //
  // The cost is real and is stated in the README rather than hidden: the full
  // build is 133 KB gzipped against 85 for the essential one. Anyone who does
  // not want JSX can drop `.full`, and the size table says so.
  out = out.replace(
    /(https:\/\/(?:cdn\.jsdelivr\.net\/npm|unpkg\.com)\/voodoojs)(@[\d.]+)?(\/dist\/)voodoo(?:\.core)?\.min\.js/g,
    (match, host, pinned, dist) => {
      // An unpinned tag resolves to whatever is latest, which is safe to leave
      // unpinned when the version in hand is not published yet.
      const at = pinnable || shipped ? `@${version}` : (pinned ?? '');
      return `${host}${at}${dist}voodoo.full.min.js`;
    }
  );

  // A documentation example that loads the library from a file, rather than
  // from a CDN, names the full build for the same reason the CDN tags do: it is
  // the build the JSX pages need, and somebody copying a script tag out of the
  // installation guide should not land on the one where JSX prints itself back.
  //
  // Scoped to docs/ and site/ deliberately. The browser test fixtures also load
  // `voodoo.min.js` from a script tag, and they mean it — they exercise the
  // essential build on purpose, and rewriting them would quietly stop testing it.
  const isDocumentation = /^(docs|site)[\\/]/.test(file);
  if (isDocumentation) {
    out = out.replace(/src="([^"]*?)voodoo\.min\.js(?:\?v=[\w.]+)?"/g, 'src="$1voodoo.full.min.js"');
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

/**
 * Every tracked file that could name a CDN version, found rather than listed.
 *
 * This used to be a hand-written list of four files, and a hand-written list is
 * always missing something. What it was missing, ten releases in: `SECURITY.md`
 * and four pages under `docs/` still told people to load `voodoojs@0.1.0`, and
 * `scripts/components-page.mjs`, which GENERATES `site/components.html`, was
 * stamped at `0.5` and quietly regenerated that page wrong every time it ran.
 *
 * Asking git which files exist cannot go stale the way a list does.
 *
 * `CHANGELOG.md` is excluded on purpose. Its older entries name the versions
 * they shipped with, and rewriting those would turn a record of what happened
 * into a claim that every release always shipped the current one.
 */
function trackedFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
  return out.filter(
    (file) =>
      /\.(md|html|js|mjs|ts)$/.test(file) &&
      !file.startsWith('packages/voodoojs/dist/') &&
      !file.startsWith('site/') && // already covered, with its asset hashes
      !file.endsWith('.map') &&
      file !== 'CHANGELOG.md' &&
      // The one file that must keep a literal version in prose: this one
      // explains why the pin is exact, using a real example.
      file !== 'scripts/stamp-version.mjs'
  );
}

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

for (const file of [...(await siteFiles()), ...trackedFiles()]) {
  // `git ls-files` lists what the index knows, which is not the same as what is
  // on disk: a file deleted but not yet committed is still tracked. The release
  // script writes `.release-notes.md`, uses it and removes it, so stamping
  // immediately after a release crashed on a path that no longer existed.
  if (!existsSync(file)) continue;
  const before = await readFile(file, 'utf8');
  const after = await stamp(file, before);
  if (after === before) continue;
  changed++;
  if (!check) await writeFile(file, after);
}

console.log(
  `version ${version} (CDN ${
    pinnable ? `pinned to ${version}` : `left alone: ${version} is not on the registry yet`
  })`
);
console.log(`${changed} file(s) ${check ? 'would change' : 'stamped'}`);

// As a gate: a release must not ship a page announcing the previous version, or
// an asset URL that no longer matches its content.
if (check && changed) process.exit(1);
