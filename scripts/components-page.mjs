/**
 * Extracts the ready-made components from the source and writes the gallery at
 * site/components.html.
 *
 *   node scripts/components-page.mjs
 *
 * The page is generated rather than hand-written for one reason: a hand-written
 * component gallery drifts. It lists a prop that was renamed, or misses one that
 * was added, and nobody notices because the page still looks fine. Here the
 * component names and their props come out of `register()` in
 * packages/voodoojs/src/ui/components.ts, so the page is wrong only if the
 * source is.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { header, footer } from './site-chrome.mjs';

const SOURCE = 'packages/voodoojs/src/ui/components.ts';
const TARGET = 'site/components.html';

const src = await readFile(SOURCE, 'utf8');

/** Every register('v-name', { ... }) block, with the text of its props object. */
function extract() {
  const out = [];
  const re = /register\('(v-[a-z-]+)',\s*\{/g;
  let match;

  while ((match = re.exec(src)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length - 1;

    // Walk braces to find the end of this registration.
    let depth = 0;
    let end = start;
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    const body = src.slice(start, end + 1);
    out.push({ name, props: propsOf(body), slots: /<slot\b/.test(body) });
  }
  return out;
}

/** Prop names declared in the `props: { ... }` object, in source order. */
function propsOf(body) {
  const at = body.indexOf('props: {');
  if (at < 0) return [];

  let depth = 0;
  let end = at + 7;
  for (let i = at + 7; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const block = body.slice(at + 8, end);
  const names = [];
  // Only top-level keys: a nested default object must not contribute names.
  let nest = 0;
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (nest === 0) {
      const key = trimmed.match(/^([a-zA-Z][\w]*)\s*:/);
      if (key) names.push(key[1]);
    }
    for (const ch of line) {
      if (ch === '{') nest++;
      else if (ch === '}') nest--;
    }
  }
  return names;
}

const components = extract();

/**
 * Hand-written demos, for the components whose markup needs saying.
 *
 * Two rules learned the hard way, both by looking at the rendered page:
 *
 * 1. Icon names come from ICON_PATHS in the source: check, x, plus, minus,
 *    search, user, users, mail, lock, eye, calendar, clock, star, info, alert,
 *    warning, trash, edit, copy, download, upload, settings, home, heart, bell,
 *    filter, external, refresh, folder, file, image, more, and a few others.
 *    Anything else makes iconSvg() return an empty string, so the button
 *    renders a blank span and looks broken. `+` and `close` are not names.
 *
 * 2. An array prop needs a scope to be evaluated in. Written bare, `:rows` is
 *    stringified and a nested array flattens: [['Ada','Engineer'],['Grace',
 *    'Admiral']] arrived as "Ada,Engineer,Grace,Admiral" and only the table
 *    headers rendered. Those demos wrap themselves in a v-data.
 */
const DEMOS = {
  'v-button':
    '<v-button variant="primary">Save</v-button>\n<v-button variant="ghost">Cancel</v-button>\n<v-button variant="primary" loading>Sending</v-button>',
  'v-icon-button':
    '<v-icon-button icon="plus" label="Add"></v-icon-button>\n' +
    '<v-icon-button icon="search" label="Search"></v-icon-button>\n' +
    '<v-icon-button icon="trash" label="Delete" variant="ghost"></v-icon-button>',
  'v-badge': '<v-badge tone="success">Active</v-badge>\n<v-badge tone="danger">Overdue</v-badge>',
  'v-tag': '<v-tag>design</v-tag>\n<v-tag closable>frontend</v-tag>',
  'v-alert':
    '<v-alert tone="info" title="Heads up">The library starts itself.</v-alert>',
  'v-card': '<v-card title="Plan" subtitle="Monthly">Everything included.</v-card>',
  'v-input': '<v-input label="Email" type="email" placeholder="you@example.com"></v-input>',
  'v-textarea': '<v-textarea label="Notes" rows="3"></v-textarea>',
  'v-select':
    '<div v-data="{ countries: [\'Brazil\', \'Portugal\', \'Japan\'] }">\n' +
    '  <v-select label="Country" :options="countries"></v-select>\n' +
    '</div>',
  'v-checkbox': '<v-checkbox label="Remember me"></v-checkbox>',
  'v-radio': '<v-radio name="plan" label="Monthly"></v-radio>',
  'v-switch': '<v-switch label="Notifications"></v-switch>',
  'v-field': '<v-field label="Name" hint="As it appears on your card"></v-field>',
  'v-label': '<v-label for="email">Email</v-label>',
  'v-avatar': '<v-avatar name="Ada Lovelace"></v-avatar>',
  'v-progress': '<v-progress value="70"></v-progress>',
  'v-spinner': '<v-spinner></v-spinner>',
  'v-skeleton': '<v-skeleton lines="3"></v-skeleton>',
  'v-divider': '<v-divider></v-divider>',
  'v-rating': '<v-rating value="4"></v-rating>',
  'v-stat': '<v-stat label="Revenue" value="12,480" trend="up"></v-stat>',
  'v-table':
    '<div v-data="{\n' +
    '  cols: [\'Name\', \'Role\'],\n' +
    '  people: [[\'Ada\', \'Engineer\'], [\'Grace\', \'Admiral\']]\n' +
    '}">\n' +
    '  <v-table :columns="cols" :rows="people"></v-table>\n' +
    '</div>',
  'v-pagination': '<v-pagination pages="8" value="3"></v-pagination>',
  'v-breadcrumb':
    '<div v-data="{ trail: [\'Home\', \'Docs\', \'Components\'] }">\n' +
    '  <v-breadcrumb :items="trail"></v-breadcrumb>\n' +
    '</div>',
  'v-steps':
    '<div v-data="{ stages: [\'Cart\', \'Address\', \'Payment\'] }">\n' +
    '  <v-steps :items="stages" value="1"></v-steps>\n' +
    '</div>',
  'v-timeline':
    '<div v-data="{ events: [\'Opened\', \'In review\', \'Merged\'] }">\n' +
    '  <v-timeline :items="events"></v-timeline>\n' +
    '</div>',
  'v-empty-state':
    '<v-empty-state title="Nothing here yet" text="Add your first item."></v-empty-state>',
  'v-code-block': '<v-code-block code="&lt;div v-data=&quot;{ n: 0 }&quot;&gt;"></v-code-block>',
  'v-tooltip-button':
    '<v-tooltip-button tip="Copies to the clipboard">Copy</v-tooltip-button>',
};

const GROUPS = [
  {
    title: 'Actions',
    note: 'Things a person presses.',
    names: ['v-button', 'v-icon-button', 'v-tooltip-button'],
  },
  {
    title: 'Form fields',
    note: 'Every one works with v-model, and with the validation directives.',
    names: ['v-input', 'v-textarea', 'v-select', 'v-checkbox', 'v-radio', 'v-switch', 'v-field', 'v-label'],
  },
  {
    title: 'Status',
    note: 'Telling the reader what is going on.',
    names: ['v-alert', 'v-badge', 'v-tag', 'v-progress', 'v-spinner', 'v-skeleton', 'v-rating'],
  },
  {
    title: 'Layout and data',
    note: 'Structure, and the shapes data arrives in.',
    names: ['v-card', 'v-table', 'v-stat', 'v-timeline', 'v-divider', 'v-empty-state', 'v-code-block', 'v-avatar'],
  },
  {
    title: 'Navigation',
    note: 'Getting around, and showing where you are.',
    names: ['v-breadcrumb', 'v-pagination', 'v-steps'],
  },
];

const byName = new Map(components.map((c) => [c.name, c]));

// A component missing from the groups above would silently vanish from the page.
const grouped = new Set(GROUPS.flatMap((g) => g.names));
const ungrouped = components.filter((c) => !grouped.has(c.name));
if (ungrouped.length) {
  GROUPS.push({
    title: 'Also registered',
    note: 'Present in the build, not yet placed in a section above.',
    names: ungrouped.map((c) => c.name),
  });
}

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const icon = (name, cls = 'vd-icon') =>
  `<svg class="${cls}" aria-hidden="true"><use href="assets/art/icons.svg#i-${name}"></use></svg>`;

/** One component: its tag, the live demo, the markup in a code frame, its props. */
function card(name) {
  const meta = byName.get(name);
  if (!meta) return '';
  const demo = DEMOS[name] || `<${name}></${name}>`;
  const props = meta.props.length
    ? meta.props.map((p) => `<span class="chip chip-sm chip-outline font-mono">${p}</span>`).join(' ')
    : '<span class="text-sm text-muted-foreground">no props</span>';

  return `
            <article class="card card-bordered vd-comp" id="${name}">
              <div class="card-body gap-4">
                <header class="flex flex-wrap items-center justify-between gap-2">
                  <h3 class="text-base font-semibold"><code class="vd-dname">&lt;${name}&gt;</code></h3>
                  ${meta.slots ? '<span class="badge badge-soft badge-accent">accepts content</span>' : ''}
                </header>

                <div class="vd-comp-live">
${demo
  .split('\n')
  .map((l) => '                  ' + l)
  .join('\n')}
                </div>

                <figure class="vframe">
                  <figcaption class="vframe-bar">
                    <span class="vframe-tab" data-lang="html">${icon('file')}${name}.html</span>
                    <button type="button" class="vframe-copy" v-copy-from="#code-${name}" aria-label="Copy the markup of ${name}">${icon('copy')}</button>
                  </figcaption>
<pre data-lang="html" v-ignore><code id="code-${name}">${escape(demo)}</code></pre>
                </figure>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Props</p>
                  <p class="mt-2 flex flex-wrap gap-1">${props}</p>
                </div>
              </div>
            </article>`;
}

const slug = (title) => title.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

const sections = GROUPS.map(
  (g) => `
          <section id="${slug(g.title)}" class="vd-comp" aria-labelledby="${slug(g.title)}-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <h2 id="${slug(g.title)}-title" class="text-2xl font-bold tracking-tight">${g.title}</h2>
              <span class="text-sm text-muted-foreground">${g.note}</span>
            </div>
            <div class="mt-6 grid gap-5 xl:grid-cols-2">${g.names.map(card).join('')}
            </div>
          </section>`
).join('\n');

const index = GROUPS.map(
  (g) => `
                <li>
                  <a class="block py-1 text-sm font-semibold text-foreground hover:text-primary" href="#${slug(g.title)}">${g.title}</a>
                  <ul class="mb-3 border-l border-border pl-3">${g.names
                    .filter((n) => byName.has(n))
                    .map((n) => `<li><a class="block py-0.5 font-mono text-xs text-muted-foreground hover:text-primary" href="#${n}">${n}</a></li>`)
                    .join('')}</ul>
                </li>`
).join('');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- The visitor's theme, before the first paint. Same key and values as
         V.theme (voodoo:theme: light, dark or system, raw or as JSON). This
         file is generated by scripts/components-page.mjs: edit that instead. -->
    <script>
      (function () {
        try {
          var t = localStorage.getItem('voodoo:theme');
          if (t && t.charAt(0) === '"') t = JSON.parse(t);
          var r = document.documentElement;
          if (t === 'light' || t === 'dark') {
            r.setAttribute('data-theme', t);
            r.style.colorScheme = t;
          } else if (t === 'system') {
            r.removeAttribute('data-theme');
          }
        } catch (e) {}
      })();
    </script>

    <title>Components: Voodoo.js</title>
    <meta
      name="description"
      content="The ready-made components that ship with Voodoo.js, each running on the page."
    />
    <meta name="theme-color" content="#6d3bf5" />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href="https://kwy404.github.io/Voodoo.js/components.html" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Components: Voodoo.js" />
    <meta property="og:description" content="The ready-made components that ship with Voodoo.js, each running on the page." />
    <meta property="og:url" content="https://kwy404.github.io/Voodoo.js/components.html" />
    <meta property="og:image" content="https://kwy404.github.io/Voodoo.js/assets/og.png" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/monsooncss@0.2.0/dist/monsoon.min.css" />
    <link rel="stylesheet" href="assets/site.css" />
    <style>
      /* The stage each component runs on: a quiet dotted field, so a component
         with no surface of its own (a divider, a spinner) still reads. */
      .vd-comp-live {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        min-height: 7rem;
        padding: 1.25rem;
        border: 1px dashed var(--border);
        border-radius: var(--m-radius-lg);
        background:
          radial-gradient(color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1.2px) 0 0 / 16px 16px,
          var(--surface-2);
      }
      .vd-comp-live > * {
        flex: 1 1 auto;
        min-width: 0;
      }
      .vd-comp-live > :is(v-button, v-icon-button, v-tooltip-button, v-badge, v-tag, v-avatar, v-spinner, v-label) {
        flex: 0 0 auto;
      }
      .vd-dname {
        display: inline-block;
        padding: 0.15rem 0.6rem;
        border-radius: var(--m-radius-md);
        background: color-mix(in oklab, var(--primary) 12%, transparent);
        color: var(--primary);
        font-family: var(--font-mono);
        font-size: 0.875rem;
      }
      .vd-comp {
        scroll-margin-top: 5.5rem;
      }
    </style>
  </head>

  <body>
    <div v-data>
<!-- chrome:header -->
${header({ current: 'components' })}
<!-- /chrome:header -->

      <main id="main">
        <section class="vd-aura relative overflow-hidden border-b border-border">
          <div class="vd-runes absolute inset-0 -z-10" aria-hidden="true"></div>
          <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:py-20 lg:grid-cols-12 lg:px-8">
            <div class="lg:col-span-8">
              <p class="vd-kicker">Built-in components</p>
              <h1 class="mt-3 text-4xl font-bold tracking-tight text-balance md:text-5xl">${components.length} components, already in the box</h1>
              <p class="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
                No install, no import, no registration. They are custom elements the library defines
                when it starts, so writing the tag is the whole usage.
              </p>
              <p class="mt-4 max-w-2xl text-sm text-muted-foreground text-pretty">
                Every component below is <strong class="text-foreground">running on this page</strong>,
                rendered by the same <code class="font-mono">voodoo.full.min.js</code> the install guide
                hands you. The code under each one is the markup that produced it, and the props are read
                out of the source rather than typed by hand.
              </p>
            </div>
            <div class="hidden justify-center lg:col-span-4 lg:flex">
              <img class="when-light w-full max-w-xs" src="assets/art/light/rune-circle.svg" alt="A ring of runes around a pair of curly braces" width="300" height="300" />
              <img class="when-dark w-full max-w-xs" src="assets/art/dark/rune-circle.svg" alt="A ring of runes around a pair of curly braces" width="300" height="300" />
            </div>
          </div>
        </section>

        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-12 lg:px-8">
          <nav class="hidden lg:col-span-3 lg:block" aria-label="Components on this page">
            <div class="sticky top-24">
              <p class="toc-title">On this page</p>
              <ul class="mt-3">${index}
              </ul>
            </div>
          </nav>
          <div class="space-y-16 lg:col-span-9">
${sections}
          </div>
        </div>
      </main>

<!-- chrome:footer -->
${footer()}
<!-- /chrome:footer -->
    </div>

    <script src="voodoo.full.min.js" defer></script>
  </body>
</html>
`;

await writeFile(TARGET, html);

console.log(`${TARGET} written from ${SOURCE}`);
console.log(`  ${components.length} components`);
console.log(`  ${components.filter((c) => c.props.length).length} with props`);
if (ungrouped.length) {
  console.log(`  ${ungrouped.length} not placed in a section: ${ungrouped.map((c) => c.name).join(', ')}`);
}
