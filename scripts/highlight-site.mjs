/**
 * Pre-renders every code sample on the site with Shiki, in the VS Code themes
 * Light+ and Dark+, so no page highlights code at runtime.
 *
 *   node scripts/highlight-site.mjs           rewrite the pages
 *   node scripts/highlight-site.mjs --check   fail if a page is not highlighted
 *
 * A sample is written by hand as
 *
 *   <pre data-lang="html"><code>&lt;div v-data="{ n: 0 }"&gt;...</code></pre>
 *
 * and comes out as the same <pre>, marked `data-shiki` and with the class
 * `shiki`, holding one span per token. Each token carries both colours as
 * custom properties (`--shiki-light`, `--shiki-dark`) and no colour of its own,
 * so site/assets/site.css and docs/assets/docs.css pick the one that matches
 * the site theme. The text is read back from the block on every run, which
 * makes the script idempotent, and the highlighted text is checked against the
 * source so a sample can never change while being coloured.
 *
 * Shiki is not a dependency of this repository. It is a local, optional tool:
 * the script looks for it in SHIKI_PATH, then in a sibling checkout, and the
 * output is committed, so CI and the published site never need it.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const check = process.argv.includes('--check');

const CANDIDATES = [
  process.env.SHIKI_PATH,
  '../graphemely/node_modules/shiki/dist/index.mjs',
  'node_modules/shiki/dist/index.mjs',
].filter(Boolean);

/** Pages scanned: every .html under site/, except the example applications. */
function pages(dir = 'site', out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The example apps are standalone programs whose <pre> blocks are UI.
      if (path.split(/[\\/]/).join('/').startsWith('site/examples/')) continue;
      if (entry.name === 'node_modules') continue;
      pages(path, out);
    } else if (entry.name.endsWith('.html')) out.push(path);
  }
  out.push('site/examples/index.html');
  return [...new Set(out)];
}

const LANGS = { html: 'html', js: 'javascript', javascript: 'javascript', ts: 'typescript', css: 'css', bash: 'bash', sh: 'bash', json: 'json' };

const BLOCK = /<pre\b([^>]*\bdata-lang="([\w-]+)"[^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/g;

const NAMED = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&', nbsp: ' ', middot: '·', hellip: '…', rarr: '→', larr: '←', times: '×' };

/** One pass, so `&amp;lt;` becomes `&lt;` and never `<`. */
function decode(html) {
  return html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === '#') {
      return String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
    }
    return NAMED[name] ?? match;
  });
}

const textOf = (html) => decode(html.replace(/<[^>]*>/g, ''));

function withShikiAttrs(attrs) {
  let out = attrs.replace(/\sdata-shiki\b(="[^"]*")?/g, '');
  if (/\sclass="/.test(out)) {
    out = out.replace(/\sclass="([^"]*)"/, (_, cls) => {
      const list = cls.split(/\s+/).filter((c) => c && c !== 'shiki');
      return ` class="${['shiki', ...list].join(' ')}"`;
    });
  } else {
    out += ' class="shiki"';
  }
  return `${out} data-shiki`;
}

async function loadShiki() {
  for (const candidate of CANDIDATES) {
    if (existsSync(candidate)) return import(pathToFileURL(candidate).href);
  }
  return null;
}

// Optional path prefixes narrow the run: `node scripts/highlight-site.mjs site/docs`.
const only = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((a) => a.split('\\').join('/'));
const files = pages().filter((f) => !only.length || only.some((o) => f.split('\\').join('/').startsWith(o)));

if (check) {
  // The check needs no Shiki: an unhighlighted block is one without the mark.
  let missing = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(BLOCK)) {
      if (LANGS[m[2]] && !/\sdata-shiki\b/.test(m[1])) {
        missing++;
        console.log(`  not highlighted: ${file} (${m[2]})`);
      }
    }
  }
  console.log(missing ? `${missing} block(s) not highlighted` : 'every code sample is highlighted');
  process.exit(missing ? 1 : 0);
}

const shiki = await loadShiki();
if (!shiki) {
  console.error('Shiki was not found. Set SHIKI_PATH to its dist/index.mjs.');
  process.exit(1);
}

const highlighter = await shiki.createHighlighter({
  themes: ['light-plus', 'dark-plus'],
  langs: [...new Set(Object.values(LANGS))],
});

let total = 0;
let written = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let count = 0;
  const after = before.replace(BLOCK, (match, preAttrs, lang, codeAttrs, inner) => {
    const grammar = LANGS[lang];
    if (!grammar) return match;
    // The working copy may be CRLF (core.autocrlf), Shiki speaks LF.
    const code = textOf(inner).replace(/\r\n/g, '\n').replace(/\n$/, '');
    const html = highlighter.codeToHtml(code, {
      lang: grammar,
      themes: { light: 'light-plus', dark: 'dark-plus' },
      defaultColor: false,
    });
    const body = /<code[^>]*>([\s\S]*)<\/code>/.exec(html)[1];
    if (textOf(body) !== code) throw new Error(`${file}: highlighted text differs from the source`);
    count++;
    return `<pre${withShikiAttrs(preAttrs)}><code${codeAttrs}>${body}</code></pre>`;
  });
  total += count;
  if (after !== before) {
    written++;
    writeFileSync(file, after);
  }
}
console.log(`${total} code samples highlighted, ${written} file(s) written`);
