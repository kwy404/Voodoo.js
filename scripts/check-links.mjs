#!/usr/bin/env node
/**
 * Validates the relative links in the documentation.
 *
 *   node scripts/check-links.mjs           readable report, exit != 0 if broken
 *   node scripts/check-links.mjs --json    same as json
 *
 * Checks two things for each relative link found in a `.md`:
 * the target file exists, and the anchor (`#something`) exists in the target.
 *
 * The anchor is the half that nobody verifies by hand and breaks on its own: it only
 * takes someone rewriting a title in another file. External links are left out on
 * purpose — validating `http` would require network and turn a deterministic check
 * into a source of intermittent failure.
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, read, rel, walkFiles } from './quality/lib.mjs';

/** Where to search for markdown files. */
const SCAN = [
  { dir: ROOT, depth: 'flat', label: 'root' },
  { dir: join(ROOT, 'docs'), depth: 'deep', label: 'docs' },
  { dir: join(ROOT, 'site', 'docs'), depth: 'deep', label: 'site/docs' },
];

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Removes inline code snippets, preserving length.
 *
 * Without this, a migration table with `<a v-link href="/x">` in a code cell
 * becomes "broken link to /x", which is pure noise.
 */
function stripInlineCode(source) {
  return source.replace(/(`{1,3})(?:(?!\1)[\s\S])*?\1/g, (m) =>
    m.replace(/[^\n]/g, ' ')
  );
}

/** Removes fenced code blocks, to avoid reading links or example titles. */
function stripFences(source) {
  const lines = source.split('\n');
  let fence = null;
  return lines
    .map((line) => {
      const m = /^\s*(`{3,}|~{3,})/.exec(line);
      if (m) {
        if (!fence) {
          fence = m[1][0];
          return '';
        }
        if (m[1][0] === fence) {
          fence = null;
          return '';
        }
      }
      return fence ? '' : line;
    })
    .join('\n');
}

/** Slug in GitHub style: lowercase, punctuation removed, spaces become hyphens. */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** All reachable anchors in a markdown file. */
export function anchorsOf(source) {
  const body = stripFences(source);
  const anchors = new Set();
  const seen = new Map();

  for (const line of body.split('\n')) {
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const base = slugify(m[2]);
    if (!base) continue;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  // Explicit anchors in embedded HTML.
  for (const m of source.matchAll(/<[^>]+\bid\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  for (const m of source.matchAll(/<a[^>]+\bname\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);

  return anchors;
}

/** Anchors from an HTML file: any `id=`. */
function htmlAnchors(source) {
  const anchors = new Set();
  for (const m of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  for (const m of source.matchAll(/\bname\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  return anchors;
}

/** Extracts links from a markdown, with the source line. */
function linksOf(source) {
  const body = stripInlineCode(stripFences(source));
  const lines = body.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // [text](target "title")
    for (const m of line.matchAll(/\[(?:[^\][]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // [id]: target
    const def = /^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/.exec(line);
    if (def) out.push({ target: def[1], line: i + 1, raw: line.trim().slice(0, 100) });
    // <a href="target">
    for (const m of line.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // <img src="target">
    for (const m of line.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // ![alt](target)
    for (const m of line.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?\s*\)/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
  }

  return out;
}

/** Resolves a link's path, accepting the forms that GitHub accepts. */
function resolveTarget(fromFile, target) {
  // Link starting with "/" is relative to the repository root, not the file.
  const base = target.startsWith('/') ? ROOT : dirname(fromFile);
  if (target.startsWith('/')) target = target.replace(/^\/+/, '');
  const candidates = [
    resolve(base, target),
    resolve(base, `${target}.md`),
    resolve(base, target, 'README.md'),
    resolve(base, target, 'index.md'),
    resolve(base, target, 'index.html'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      if (statSync(candidate).isDirectory()) continue;
    } catch {
      continue;
    }
    return candidate;
  }
  // Directory without index is still a valid navigation target on GitHub.
  const asDir = resolve(base, target);
  if (existsSync(asDir)) {
    try {
      if (statSync(asDir).isDirectory()) return asDir;
    } catch {
      /* continue */
    }
  }
  return null;
}

/** Runs the complete validation. Returns `{ checked, broken, files }`. */
export function checkLinks() {
  const files = [];
  for (const scan of SCAN) {
    if (!existsSync(scan.dir)) continue;
    const found = walkFiles(scan.dir, {
      filter: (f) => f.toLowerCase().endsWith('.md'),
      skipDirs: ['node_modules', '.git', 'dist'],
    });
    for (const file of found) {
      if (scan.depth === 'flat' && dirname(file) !== scan.dir) continue;
      if (!files.includes(file)) files.push(file);
    }
  }

  const anchorCache = new Map();
  const anchorsFor = (file) => {
    if (anchorCache.has(file)) return anchorCache.get(file);
    const source = read(file) ?? '';
    const anchors = file.toLowerCase().endsWith('.md') ? anchorsOf(source) : htmlAnchors(source);
    anchorCache.set(file, anchors);
    return anchors;
  };

  const broken = [];
  let checked = 0;
  let external = 0;

  for (const file of files) {
    const source = read(file);
    if (source == null) continue;
    const selfAnchors = anchorsFor(file);

    for (const link of linksOf(source)) {
      const target = link.target.trim();
      if (!target) continue;
      if (EXTERNAL.test(target)) {
        external++;
        continue;
      }
      if (target.startsWith('{{') || target.includes('${')) continue; // template

      checked++;
      const hashAt = target.indexOf('#');
      const pathPart = hashAt < 0 ? target : target.slice(0, hashAt);
      const anchor = hashAt < 0 ? '' : decodeURIComponent(target.slice(hashAt + 1));

      // Link anchor-only: validate against the file itself.
      if (!pathPart) {
        if (anchor && !selfAnchors.has(anchor)) {
          broken.push({
            file: rel(file),
            line: link.line,
            target,
            reason: 'anchor',
            expected: `heading generating #${anchor} in this file`,
            actual: `no heading with that slug (${selfAnchors.size} anchors in file)`,
          });
        }
        continue;
      }

      const resolved = resolveTarget(file, decodeURIComponent(pathPart));
      if (!resolved) {
        broken.push({
          file: rel(file),
          line: link.line,
          target,
          reason: 'file',
          expected: `${pathPart} existing from ${rel(dirname(file)) || '.'}`,
          actual: 'file not found',
        });
        continue;
      }

      if (!anchor) continue;

      let isDir = false;
      try {
        isDir = statSync(resolved).isDirectory();
      } catch {
        /* continue */
      }
      if (isDir) continue;

      // Anchor only makes sense in a navigable document. In .svg or .png, "#..."
      // is GitHub's own syntax (#gh-dark-mode-only) or an SVG fragment.
      if (!/\.(md|markdown|html?)$/i.test(resolved)) continue;

      const targetAnchors = anchorsFor(resolved);
      if (!targetAnchors.has(anchor)) {
        broken.push({
          file: rel(file),
          line: link.line,
          target,
          reason: 'anchor',
          expected: `#${anchor} in ${rel(resolved)}`,
          actual: `${rel(resolved)} does not have that slug (${targetAnchors.size} anchors available)`,
        });
      }
    }
  }

  return { files: files.map(rel), checked, external, broken };
}

// ---------------------------------------------------------------------------

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const result = checkLinks();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `${result.checked} relative links in ${result.files.length} markdown files ` +
        `(${result.external} external ignored).`
    );
    if (!result.broken.length) {
      console.log('No broken links.');
    } else {
      console.log(`\n${result.broken.length} broken links:\n`);
      for (const b of result.broken) {
        console.log(`  ${b.file}:${b.line}  ->  ${b.target}`);
        console.log(`      expected: ${b.expected}`);
        console.log(`      actual:   ${b.actual}\n`);
      }
    }
  }
  process.exit(result.broken.length ? 1 : 0);
}
