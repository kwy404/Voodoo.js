/**
 * The header and the footer every page of the site shares, written once.
 *
 *   node scripts/site-chrome.mjs           rewrite the pages
 *   node scripts/site-chrome.mjs --check   fail if a page has drifted
 *
 * Each static page carries two pairs of markers, and everything between them
 * is owned by this file:
 *
 *   <!-- chrome:header -->  ...  <!-- /chrome:header -->
 *   <!-- chrome:footer -->  ...  <!-- /chrome:footer -->
 *
 * The example applications carry `chrome:credit` instead, a compact footer that
 * fits under a full screen app. The documentation builds the same header and
 * footer at runtime in docs/assets/docs.js, from the same links.
 *
 * Links are relative, resolved from each page's depth, because the site is
 * served from /Voodoo.js/ on GitHub Pages and an absolute path would escape it.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSION = JSON.parse(readFileSync('packages/voodoojs/package.json', 'utf8')).version;

export const PROJECTS = [
  { name: 'Monsoon', url: 'https://kwy404.github.io/monsoon/', repo: 'monsoon', blurb: 'Utility-first CSS with no build step' },
  { name: 'breakhound', url: 'https://kwy404.github.io/breakhound/', repo: 'breakhound', blurb: 'Find bugs in any JavaScript library automatically' },
  { name: 'vueleap', url: 'https://kwy404.github.io/vueleap/', repo: 'vueleap', blurb: 'Migrate Vue 2 to Vue 3 with one command' },
  { name: 'graphemely', url: 'https://kwy404.github.io/graphemely/', repo: 'graphemely', blurb: 'Emoji safe string functions' },
  { name: 'numberparrot', url: 'https://kwy404.github.io/numberparrot/', repo: 'numberparrot', blurb: 'Parse localized numbers and currency' },
  { name: 'edgegoat', url: 'https://kwy404.github.io/edgegoat/', repo: 'edgegoat', blurb: 'Edge case test inputs' },
  { name: 'cookieowl', url: 'https://kwy404.github.io/cookieowl/', repo: 'cookieowl', blurb: 'Cookie consent banner for LGPD and GDPR' },
  { name: 'installkite', url: 'https://kwy404.github.io/installkite/', repo: 'installkite', blurb: 'Make any website installable and offline capable' },
  { name: 'a11ymedic', url: 'https://kwy404.github.io/a11ymedic/', repo: 'a11ymedic', blurb: 'Accessibility checker that gives the exact fix' },
  { name: 'fontsketch', url: 'https://kwy404.github.io/fontsketch/', repo: 'fontsketch', blurb: 'Turn your handwriting into a font' },
  { name: 'kastor', url: 'https://kwy404.github.io/kastor/', repo: 'kastor', blurb: 'The TypeScript ORM for almost every database' },
];

export const GITHUB = 'https://github.com/kwy404/Voodoo.js';
export const NPM = 'https://www.npmjs.com/package/voodoojs';
export const AUTHOR_GITHUB = 'https://github.com/kwy404';
export const AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/alexandre-silva-173687256/';

/** The four sections of the site, in header order. */
export const SECTIONS = [
  { id: 'docs', href: 'docs/', label: 'Docs', key: 'nav.docs' },
  { id: 'playground', href: 'playground.html', label: 'Playground', key: 'nav.playground' },
  { id: 'components', href: 'components.html', label: 'Components', key: 'nav.components' },
  { id: 'examples', href: 'examples/', label: 'Examples', key: 'nav.examples' },
];

const icon = (p, name, cls = 'vd-icon') =>
  `<svg class="${cls}" aria-hidden="true"><use href="${p}assets/art/icons.svg#i-${name}"></use></svg>`;

/** `v-t="key"` on the translated home page, nothing elsewhere. */
const t = (on, key) => (on ? ` v-t="${key}"` : '');
const ta = (on, key) => (on ? ` v-t:aria-label="${key}"` : '');

/**
 * The header.
 *
 * `extra` is markup placed before the theme toggle (the home page puts its
 * search and language picker there). The theme toggle is v-theme-toggle.cycle,
 * so the page must load the library; the documentation shell, which does not,
 * implements the same button by hand.
 */
export function header({ prefix: p = '', current = '', i18n = false, extra = '' } = {}) {
  const links = (cls) =>
    SECTIONS.map(
      (s) =>
        `<a class="navbar-link${cls}" href="${p}${s.href}"${s.id === current ? ' aria-current="page"' : ''}${t(i18n, s.key)}>${s.label}</a>`
    ).join('\n      ');

  return `<a class="vd-skip btn btn-primary btn-sm" href="#main"${t(i18n, 'nav.skip')}>Skip to content</a>
<header class="navbar navbar-sticky navbar-blur px-4 lg:px-8">
  <div class="navbar-start">
    <a class="navbar-brand vd-brand" href="${p || './'}">
      <img src="${p}assets/brand/vudu/vudu-head.svg" width="32" height="32" alt="">
      <span>Voodoo<span class="text-primary">.js</span></span>
    </a>
  </div>
  <nav class="navbar-center navbar-nav" aria-label="Main"${ta(i18n, 'nav.main')}>
      ${links('')}
  </nav>
  <div class="navbar-end">
    ${extra}<button type="button" class="btn btn-ghost btn-sm btn-square vd-theme" v-theme-toggle.cycle aria-label="Change theme: system, light or dark"${ta(i18n, 'nav.theme')}>
      ${icon(p, 'monitor', 'vd-icon vd-theme-system')}
      ${icon(p, 'sun', 'vd-icon vd-theme-light')}
      ${icon(p, 'moon', 'vd-icon vd-theme-dark')}
    </button>
    <a class="btn btn-ghost btn-sm btn-square hidden sm:inline-flex" href="${GITHUB}" aria-label="Voodoo.js on GitHub">${icon(p, 'github')}</a>
    <details class="navbar-mobile">
      <summary class="navbar-burger" aria-label="Menu"${ta(i18n, 'nav.menu')}></summary>
      <nav class="navbar-mobile-panel" aria-label="Mobile">
      ${links('')}
      <a class="navbar-link" href="${GITHUB}">GitHub</a>
      </nav>
    </details>
  </div>
</header>`;
}

/** The full footer: brand, three link columns, credits. */
export function footer({ prefix: p = '', i18n = false } = {}) {
  const projects = PROJECTS.map(
    (x) =>
      `<li><a href="${x.url}" title="${x.blurb}"><img src="https://cdn.jsdelivr.net/gh/kwy404/${x.repo}@main/assets/mascot.svg" alt="" width="20" height="20" loading="lazy" decoding="async">${x.name}</a></li>`
  ).join('\n          ');

  return `<footer class="footer px-0">
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 lg:px-8">
  <div class="footer-grid md:grid-cols-4">
    <div class="footer-brand md:col-span-1">
      <a class="navbar-brand vd-brand text-foreground" href="${p || './'}">
        <img src="${p}assets/brand/vudu/vudu-head.svg" width="32" height="32" alt="">
        <span>Voodoo<span class="text-primary">.js</span></span>
      </a>
      <p${t(i18n, 'foot.tagline')}>JSX in plain HTML. No build step, one script tag.</p>
      <div class="footer-social">
        <a href="${GITHUB}" aria-label="Voodoo.js on GitHub">${icon(p, 'github')}</a>
        <a href="${NPM}" aria-label="voodoojs on npm">${icon(p, 'npm')}</a>
      </div>
    </div>
    <nav aria-label="Voodoo.js">
      <p class="footer-title">Voodoo.js</p>
      <ul class="footer-links">
        ${SECTIONS.map((s) => `<li><a href="${p}${s.href}"${t(i18n, s.key)}>${s.label}</a></li>`).join('\n        ')}
        <li><a href="${GITHUB}">GitHub</a></li>
        <li><a href="${NPM}">npm</a></li>
      </ul>
    </nav>
    <nav aria-label="Learn"${ta(i18n, 'foot.learn')}>
      <p class="footer-title"${t(i18n, 'foot.learn')}>Learn</p>
      <ul class="footer-links">
        <li><a href="${p}docs/guia/instalacao.html"${t(i18n, 'foot.install')}>Installation</a></li>
        <li><a href="${p}docs/guia/jsx.html"${t(i18n, 'foot.jsx')}>JSX in plain HTML</a></li>
        <li><a href="${p}docs/referencia/directives.html"${t(i18n, 'foot.directives')}>Directives</a></li>
        <li><a href="${p}docs/referencia/migracao-vue.html"${t(i18n, 'foot.migrate')}>Coming from Vue</a></li>
        <li><a href="${p}docs/referencia/perguntas-frequentes.html"${t(i18n, 'foot.faq')}>FAQ</a></li>
      </ul>
    </nav>
    <nav aria-label="More from kwy404"${ta(i18n, 'foot.more')}>
      <p class="footer-title"${t(i18n, 'foot.more')}>More from kwy404</p>
      <ul class="footer-links vd-projects">
          ${projects}
      </ul>
    </nav>
  </div>
  <div class="footer-bottom">
    <p><span${t(i18n, 'foot.madeBy')}>Made by</span> <a class="font-medium text-foreground hover:underline" href="${AUTHOR_GITHUB}" rel="me noopener">Alexandre Kohler</a> (<a class="hover:underline" href="${AUTHOR_GITHUB}" rel="me noopener">GitHub</a>, <a class="hover:underline" href="${AUTHOR_LINKEDIN}" rel="me noopener">LinkedIn</a>). <span${t(i18n, 'foot.mit')}>MIT licensed.</span> Voodoo.js ${VERSION}.</p>
    <p><span${t(i18n, 'foot.builtWith')}>Built with</span> <a class="font-medium text-foreground hover:underline" href="https://kwy404.github.io/monsoon/">Monsoon</a>. <span${t(i18n, 'foot.interactive')}>Interactive parts built with</span> <a class="font-medium text-foreground hover:underline" href="https://kwy404.github.io/Voodoo.js/">Voodoo.js</a>.</p>
  </div>
  </div>
</footer>`;
}

/**
 * The compact credit under an example application. These pages are full screen
 * apps styled by the repository design system, not by Monsoon, so the credit
 * carries its own few lines of CSS rather than the site stylesheet.
 */
export function credit({ prefix: p = '' } = {}) {
  const projects = PROJECTS.map((x) => `<a href="${x.url}" title="${x.blurb}">${x.name}</a>`).join('\n    ');
  return `<footer class="vd-credit">
  <p>Made by <a href="${AUTHOR_GITHUB}" rel="me noopener">Alexandre Kohler</a> (<a href="${AUTHOR_GITHUB}" rel="me noopener">GitHub</a>, <a href="${AUTHOR_LINKEDIN}" rel="me noopener">LinkedIn</a>). Interactive parts built with <a href="https://kwy404.github.io/Voodoo.js/">Voodoo.js</a>. The site around it is built with <a href="https://kwy404.github.io/monsoon/">Monsoon</a>. <a href="${p}examples/">All examples</a></p>
  <nav class="vd-credit__projects" aria-label="More from kwy404">
    <span>More from kwy404:</span>
    ${projects}
  </nav>
</footer>
<style>
  .vd-credit { padding: 16px; text-align: center; font: 13px/1.6 ui-sans-serif, system-ui, sans-serif; opacity: 0.85; }
  .vd-credit a { color: inherit; }
  .vd-credit p { margin: 0; }
  .vd-credit__projects { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; margin-top: 6px; }
  .vd-credit__projects span { font-weight: 600; }
</style>`;
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/** Pages with the full chrome, and the section each belongs to. */
const PAGES = [
  { file: 'site/index.html', current: '', i18n: true, home: true },
  { file: 'site/playground.html', current: 'playground' },
  { file: 'site/components.html', current: 'components' },
  { file: 'site/examples/index.html', current: 'examples' },
  { file: 'site/404.html', current: '' },
];

/** The search button and language picker that only the home page carries. */
export const HOME_EXTRA = `<button type="button" class="btn btn-outline btn-sm hidden lg:inline-flex gap-2 text-muted-foreground" v-command="mod+k" aria-label="Search, Ctrl plus K" v-t:aria-label="nav.searchAria">
      <svg class="vd-icon" aria-hidden="true"><use href="assets/art/icons.svg#i-search"></use></svg>
      <span v-t="nav.search">Search</span>
      <kbd class="kbd kbd-xs">Ctrl K</kbd>
    </button>
    <select class="vd-lang" aria-label="Language" v-t:aria-label="nav.language">
      <option value="en">EN</option>
      <option value="pt-BR">PT</option>
      <option value="es">ES</option>
      <option value="ko">KO</option>
    </select>
    `;

function prefixFor(file) {
  const depth = relative('site', dirname(file)).split(/[\\/]/).filter(Boolean).length;
  return '../'.repeat(depth);
}

function replaceBlock(text, name, html) {
  const re = new RegExp(`(<!-- chrome:${name} -->)[\\s\\S]*?(<!-- /chrome:${name} -->)`);
  if (!re.test(text)) return null;
  return text.replace(re, (_, open, close) => `${open}\n${html}\n${close}`);
}

/** Example applications: every index.html under site/examples/ except the index itself. */
function exampleApps(dir = 'site/examples', out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) exampleApps(path, out);
    else if (entry.name === 'index.html' && dir !== 'site/examples') out.push(path);
  }
  return out;
}

export function apply(check = false) {
  let changed = 0;
  const visit = (file, edit) => {
    if (!existsSync(file)) return;
    const before = readFileSync(file, 'utf8');
    const after = edit(before);
    if (after == null || after === before) return;
    changed++;
    console.log(`  ${check ? 'drifted' : 'wrote'}  ${file}`);
    if (!check) writeFileSync(file, after);
  };

  for (const page of PAGES) {
    const prefix = prefixFor(page.file);
    visit(page.file, (text) => {
      let out = text;
      out = replaceBlock(out, 'header', header({ prefix, current: page.current, i18n: page.i18n, extra: page.home ? HOME_EXTRA : '' })) ?? out;
      out = replaceBlock(out, 'footer', footer({ prefix, i18n: page.i18n })) ?? out;
      return out;
    });
  }
  // Standalone pages styled by their own stylesheets get the compact credit too.
  for (const file of [...exampleApps(), 'site/design-system/index.html', 'site/promo/index.html']) {
    visit(file, (text) => replaceBlock(text, 'credit', credit({ prefix: prefixFor(file) })) ?? text);
  }
  return changed;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const check = process.argv.includes('--check');
  const changed = apply(check);
  console.log(`${changed} page(s) ${check ? 'out of date' : 'updated'}`);
  if (check && changed) process.exit(1);
}
