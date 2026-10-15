/**
 * The site dictionaries must be complete in every language.
 *
 *   node scripts/check-site-i18n.mjs
 *
 * The home page and the lesson ship in English, Brazilian Portuguese, Spanish
 * and Korean. A key missing from one language does not fail anywhere: V.t
 * falls back to English, so the page quietly mixes two languages. This check
 * fails instead, when:
 *
 *   - a language lacks a key that English has, or has one English does not;
 *   - a translation drops or renames a {placeholder} that English uses;
 *   - a page asks for a key (v-t, v-t:attr, or V.t in the lesson script)
 *     that English does not define.
 */

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const LOCALES = ['en', 'pt-BR', 'es', 'ko'];
const PAGES = ['site/index.html', 'site/learn.html'];

/** Runs the dictionary files against a stub V and returns what they registered. */
function loadMessages() {
  let registered = null;
  const window = {};
  const V = {
    i18n: (opts) => {
      registered = opts.messages;
    },
    start() {},
    setLocale() {},
    getLocale: () => 'en',
  };
  window.V = V;
  const context = vm.createContext({
    window,
    V,
    document: { addEventListener() {}, querySelector: () => null, documentElement: { setAttribute() {} } },
  });
  for (const file of ['site/assets/learn-i18n.js', 'site/assets/i18n.js']) {
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
  if (!registered) throw new Error('assets/i18n.js did not call V.i18n');
  return registered;
}

function flatten(tree, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out[path] = String(value);
  }
  return out;
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const messages = loadMessages();
const flat = Object.fromEntries(LOCALES.map((l) => [l, flatten(messages[l] || {})]));
const english = flat.en;
const problems = [];

for (const locale of LOCALES.slice(1)) {
  const other = flat[locale];
  for (const key of Object.keys(english)) {
    if (!(key in other)) problems.push(`${locale}: missing ${key}`);
    else if (placeholders(english[key]) !== placeholders(other[key])) {
      problems.push(`${locale}: ${key} has placeholders {${placeholders(other[key])}}, English has {${placeholders(english[key])}}`);
    }
  }
  for (const key of Object.keys(other)) {
    if (!(key in english)) problems.push(`${locale}: ${key} is not in English`);
  }
}

// Keys the pages ask for.
const used = new Set();
for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/\sv-t(?::[\w-]+)?="([\w.]+)"/g)) used.add(`${page}: ${m[1]}`);
}
const learn = readFileSync('site/assets/learn.js', 'utf8');
for (const m of learn.matchAll(/\bt\('(learn\.[\w.]+)'/g)) used.add(`site/assets/learn.js: ${m[1]}`);
// The step texts are built from the step ids.
const steps = [...learn.matchAll(/id: '(s\d+)'/g)].map((m) => m[1]);
for (const id of steps) {
  for (const part of ['title', 'body', 'task', 'hint']) used.add(`site/assets/learn.js: learn.${id}.${part}`);
}
for (const entry of used) {
  const key = entry.slice(entry.indexOf(': ') + 2);
  if (!(key in english)) problems.push(`${entry} is not defined in English`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s) in the site dictionaries:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(
  `${Object.keys(english).length} keys in ${LOCALES.length} languages, ${used.size} uses on the pages, all present`
);
