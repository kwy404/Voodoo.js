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
  'v-stat': '<v-stat label="Revenue" value="R$ 12.480" trend="up"></v-stat>',
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

function card(name) {
  const meta = byName.get(name);
  if (!meta) return '';
  const demo = DEMOS[name] || `<${name}></${name}>`;
  const props = meta.props.length
    ? meta.props.map((p) => `<code class="prop">${p}</code>`).join(' ')
    : '<span class="none">no props</span>';

  return `
          <article class="comp" id="${name}">
            <header>
              <h3><code>&lt;${name}&gt;</code></h3>
              ${meta.slots ? '<span class="slot">accepts content</span>' : ''}
            </header>

            <div class="live">
${demo
  .split('\n')
  .map((l) => '              ' + l)
  .join('\n')}
            </div>

            <pre v-ignore><code>${escape(demo)}</code></pre>

            <p class="props">${props}</p>
          </article>`;
}

const sections = GROUPS.map(
  (g) => `
        <section>
          <div class="sec-head">
            <h2>${g.title}</h2>
            <span>${g.note}</span>
          </div>
          <div class="grid">${g.names.map(card).join('')}
          </div>
        </section>`
).join('');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>Components — Voodoo.js</title>
    <meta
      name="description"
      content="The ${components.length} ready-made components that ship with Voodoo.js, each one running on this page with the markup that produced it."
    />
    <link rel="icon" href="favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href="https://kwy404.github.io/Voodoo.js/components.html" />

    <style>
      :root {
        --ink: #16141c;
        --ink-soft: #57526a;
        --ink-faint: #8b8598;
        --bg: #ffffff;
        --bg-soft: #faf9fb;
        --bg-code: #f6f5f8;
        --line: #e7e4ec;
        --accent: #5b2ee5;
        --accent-soft: #f1ecfe;
        --font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial,
          sans-serif;
        --mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
        color-scheme: light;
      }

      @media (prefers-color-scheme: dark) {
        html:root:not([data-theme='light']) {
          --ink: #f2f0f6;
          --ink-soft: #b3adc2;
          --ink-faint: #837d93;
          --bg: #131118;
          --bg-soft: #191722;
          --bg-code: #1d1a26;
          --line: #2b2735;
          --accent: #a688ff;
          --accent-soft: #221c3a;
          color-scheme: dark;
        }
      }

      html:root[data-theme='dark'] {
        --ink: #f2f0f6;
        --ink-soft: #b3adc2;
        --ink-faint: #837d93;
        --bg: #131118;
        --bg-soft: #191722;
        --bg-code: #1d1a26;
        --line: #2b2735;
        --accent: #a688ff;
        --accent-soft: #221c3a;
        color-scheme: dark;
      }

      /* The library paints its own widgets from these. Without the mapping the
         cards come out in the library's default palette while the page is in
         this one, which is how dark controls end up on white paper. */
      html:root {
        --v-surface: var(--bg) !important;
        --v-surface-2: var(--bg-soft) !important;
        --v-border: var(--line) !important;
        --v-text: var(--ink) !important;
        --v-text-muted: var(--ink-faint) !important;
        --v-primary: var(--accent) !important;
      }

      * { box-sizing: border-box; }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font);
        font-size: 16px;
        line-height: 1.65;
        -webkit-font-smoothing: antialiased;
      }

      h1, h2, h3 { margin: 0; line-height: 1.15; letter-spacing: -0.02em; font-weight: 640; }
      p { margin: 0; }
      a { color: inherit; }

      .wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 24px; }

      .top {
        position: sticky; top: 0; z-index: 20;
        background: var(--bg); border-bottom: 1px solid var(--line);
      }
      .top-in { display: flex; align-items: center; gap: 18px; height: 60px; }
      .brand {
        display: flex; align-items: center; gap: 9px; font-weight: 680;
        font-size: 16.5px; letter-spacing: -0.02em; text-decoration: none; white-space: nowrap;
      }
      .brand svg { width: 24px; height: 24px; flex: none; }
      .top nav { display: flex; gap: 4px; margin-left: 6px; }
      .top nav a {
        padding: 6px 10px; border-radius: 7px; font-size: 14.5px;
        color: var(--ink-soft); text-decoration: none;
      }
      .top nav a:hover, .top nav a[aria-current='page'] { color: var(--ink); background: var(--bg-soft); }
      .top-end { margin-left: auto; }
      .icon-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 8px;
        background: transparent; color: var(--ink-soft); cursor: pointer;
      }
      .icon-btn:hover { color: var(--ink); border-color: var(--ink-faint); }

      header.page { padding: 58px 0 34px; }
      h1 { font-size: clamp(31px, 5vw, 44px); letter-spacing: -0.035em; font-weight: 700; }
      .lead { margin-top: 15px; font-size: 18px; color: var(--ink-soft); max-width: 38em; }

      .note {
        margin-top: 20px; padding: 13px 16px; border: 1px solid var(--line);
        border-left: 2px solid var(--accent); border-radius: 0 9px 9px 0;
        background: var(--bg-soft); font-size: 14.5px; color: var(--ink-soft); max-width: 62em;
      }
      .note code { font-family: var(--mono); font-size: 13px; }

      section { padding: 30px 0 6px; }
      .sec-head {
        display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
        border-top: 1px solid var(--line); padding-top: 28px;
      }
      h2 { font-size: 20px; }
      .sec-head span { font-size: 14px; color: var(--ink-faint); }

      .grid {
        margin-top: 20px; display: grid;
        grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px;
      }

      /* No overflow:hidden here. A select, a menu or a tooltip opens a panel
         that leaves the card, and clipping it cut the options off mid-list. The
         children that genuinely need clipping do it themselves. */
      .comp { border: 1px solid var(--line); border-radius: 11px; }
      .comp header { border-radius: 11px 11px 0 0; }
      .comp pre { border-radius: 0; }
      .comp header {
        display: flex; align-items: center; gap: 9px; padding: 10px 14px;
        border-bottom: 1px solid var(--line); background: var(--bg-soft);
      }
      .comp h3 { font-size: 14px; font-weight: 600; }
      .comp h3 code { font-family: var(--mono); font-size: 13px; color: var(--accent); }
      .slot {
        margin-left: auto; font-size: 11px; color: var(--ink-faint);
        border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; background: var(--bg);
      }

      .live {
        padding: 18px 14px; display: flex; flex-wrap: wrap; gap: 8px;
        align-items: center; min-height: 74px; position: relative; z-index: 1;
      }
      .comp:focus-within { position: relative; z-index: 5; }
      .live > * { max-width: 100%; }

      .comp pre {
        margin: 0; padding: 12px 14px; background: var(--bg-code);
        border-top: 1px solid var(--line); overflow-x: auto;
      }
      .comp pre code { font-family: var(--mono); font-size: 12.5px; line-height: 1.55; }

      .props {
        padding: 10px 14px; border-top: 1px solid var(--line);
        display: flex; flex-wrap: wrap; gap: 5px; font-size: 12px;
      }
      .prop {
        font-family: var(--mono); font-size: 11.5px; padding: 1px 6px;
        border-radius: 5px; background: var(--accent-soft); color: var(--accent);
      }
      .none { color: var(--ink-faint); }

      footer {
        margin-top: 48px; border-top: 1px solid var(--line); padding: 30px 0;
        font-size: 14px; color: var(--ink-soft);
      }
      .foot-in { display: flex; gap: 18px; flex-wrap: wrap; }

      .skip { position: absolute; left: -9999px; }
      .skip:focus {
        left: 12px; top: 12px; z-index: 60; background: var(--bg);
        padding: 9px 14px; border: 1px solid var(--accent); border-radius: 8px;
      }
      :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

      @media (max-width: 700px) {
        .top nav { display: none; }
        header.page { padding: 38px 0 24px; }
        .wrap { padding: 0 18px; }
        .grid { grid-template-columns: minmax(0, 1fr); }
      }
    </style>
  </head>

  <body>
    <a class="skip" href="#main">Skip to content</a>

    <div class="top">
      <div class="wrap top-in">
        <a class="brand" href="./">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M4 5h6.4l5.6 15.2L21.6 5H28L18.8 28h-5.6L4 5z" fill="currentColor" />
          </svg>
          Voodoo.js
        </a>

        <nav aria-label="Main">
          <a href="./">Home</a>
          <a href="docs/">Docs</a>
          <a href="playground.html">Playground</a>
          <a href="components.html" aria-current="page">Components</a>
          <a href="examples/">Examples</a>
        </nav>

        <div class="top-end">
          <button class="icon-btn" v-theme-toggle aria-label="Toggle dark mode">
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M13 9.2A5.4 5.4 0 0 1 6.8 3c0-.5.07-1 .2-1.4A5.6 5.6 0 1 0 14.4 9c-.44.13-.9.2-1.4.2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <main id="main">
      <div class="wrap">
        <header class="page">
          <h1>${components.length} components, already in the box</h1>
          <p class="lead">
            No install, no import, no registration. They are custom elements the library defines
            when it starts, so writing the tag is the whole usage.
          </p>
          <p class="note">
            Every component below is <strong>running on this page</strong>, rendered by the same
            <code>voodoo.full.min.js</code> the install section hands you. The code under each one
            is the markup that produced the thing above it, and the chips at the bottom are that
            component's real props, read out of the source rather than typed by hand.
          </p>
        </header>
${sections}
      </div>
    </main>

    <footer>
      <div class="wrap foot-in">
        <span>MIT licensed</span>
        <a href="./">Home</a>
        <a href="docs/">Docs</a>
        <a href="playground.html">Playground</a>
        <a href="https://github.com/kwy404/Voodoo.js">GitHub</a>
        <span style="margin-left: auto">Built with Voodoo.js 0.11.1</span>
      </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/voodoojs@0.11.1/dist/voodoo.full.min.js" defer></script>
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
