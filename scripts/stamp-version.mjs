/**
 * Stamps the package version across the site.
 *
 *   node scripts/stamp-version.mjs          apply
 *   node scripts/stamp-version.mjs --check   report drift, change nothing
 *
 * Two problems, one cause: the version was written by hand in a dozen places.
 *
 * The visible one is drift. The documentation announced 0.1.0 for five releases,
 * then 0.5.0 while the package was 0.6.0, because nothing tied the number on the
 * page to the number in package.json.
 *
 * The invisible one is cache. GitHub Pages serves assets with `max-age=600` and
 * the pages asked for `assets/docs.js` with no version on it, so for ten minutes
 * after a deploy a returning reader kept whatever they had — including, once, a
 * docs.js that threw on every page. A version query makes a deploy invalidate
 * its own assets instead of asking people to hard-refresh.
 *
 * Run it after bumping package.json and before committing a release.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const check = process.argv.includes('--check');

const pkg = JSON.parse(await readFile('packages/voodoojs/package.json', 'utf8'));
const version = pkg.version;
const minor = version.split('.').slice(0, 2).join('.');

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
    // The published bundles carry their own version banner; leave them alone.
    if (/^voodoo(\.core|\.full)?(\.min)?\.js$/.test(entry.name)) continue;
    if (entry.name.endsWith('.min.js')) continue;
    out.push(path);
  }
  return out;
}

const EDITS = [
  {
    what: 'visible version',
    // "Voodoo.js 1.2.3" anywhere in prose, and the docs breadcrumb.
    find: /Voodoo\.js (\d+\.\d+\.\d+)/g,
    to: () => `Voodoo.js ${version}`,
  },
  // Deliberately NOT stamping the CDN pin. The version in package.json exists
  // the moment it is bumped; the version on npm exists only after someone runs
  // publish. Moving the pin with the bump would point the whole site at a tag
  // the registry does not have yet, and every page would fail to load its
  // library. The pin moves by hand, after the publish lands.
  {
    what: 'runtime cache key',
    // The documentation loads the library itself through docs.js, and that URL
    // had no version on it. GitHub Pages serves with max-age=600, so for ten
    // minutes after a deploy every live example kept running the previous
    // bundle — which is how a router bug that was already fixed carried on
    // being reported. Stamping assets/ and forgetting the runtime meant
    // stamping everything except the file that actually matters here.
    find: /((?:\.\.\/)*voodoo(?:\.core|\.full)?\.min\.js)(?:\?v=[\d.]+)?(?=['"])/g,
    to: (m, path) => `${path}?v=${version}`,
  },
  {
    what: 'asset cache key',
    // Local scripts and stylesheets only: a version query on a CDN URL would
    // defeat its own caching for no gain.
    //
    // The `(?:\.\.\/)*` matters more than it looks. Without it this matched
    // `assets/docs.js` and missed `../assets/docs.js`, so exactly one page — the
    // documentation index — got a cache key and the other 43 kept asking for the
    // unversioned URL and kept being served the stale copy. The bug it was
    // written to fix survived in every page except the one I happened to check.
    find: /(src|href)="((?:\.\.\/)*assets\/[\w.-]+\.(?:js|css))(?:\?v=[\d.]+)?"/g,
    to: (m, attr, path) => `${attr}="${path}?v=${version}"`,
  },
];

/**
 * Two version strings live outside site/, and both were written by hand.
 *
 * `src/core.ts` is the worse one: it is `V.version`, so the library reported
 * 0.4.6 to anyone who asked while actually being 0.6.2. The banner in
 * tsup.config.ts is the same drift in the file people read first when checking
 * which build they have.
 *
 * They are stamped rather than derived at build time on purpose: a real string
 * in the source works without a bundler, and `--check` is what stops it drifting.
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

let changed = 0;
const drift = [];

for (const { file, find, to } of SOURCE_EDITS) {
  const before = await readFile(file, 'utf8');
  const after = before.replace(find, (...args) => {
    const replacement = to(...args);
    if (replacement !== args[0]) drift.push({ file, what: 'source version', from: args[0], to: replacement });
    return replacement;
  });
  if (after === before) continue;
  changed++;
  if (!check) await writeFile(file, after);
}

for (const file of await siteFiles()) {
  const before = await readFile(file, 'utf8');
  let after = before;

  for (const edit of EDITS) {
    after = after.replace(edit.find, (...args) => {
      const replacement = edit.to(...args);
      if (replacement !== args[0]) drift.push({ file, what: edit.what, from: args[0], to: replacement });
      return replacement;
    });
  }

  if (after === before) continue;
  changed++;
  if (!check) await writeFile(file, after);
}

const byWhat = {};
for (const d of drift) byWhat[d.what] = (byWhat[d.what] ?? 0) + 1;

console.log(`version ${version} (CDN pinned to ${minor})`);
for (const [what, n] of Object.entries(byWhat)) console.log(`  ${what.padEnd(18)} ${n}`);
console.log(`\n${changed} file(s) ${check ? 'would change' : 'stamped'}`);

// In --check this is a gate: a release must not ship a page announcing the
// previous version.
if (check && changed) process.exit(1);
