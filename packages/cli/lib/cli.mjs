/**
 * The commands behind `voodoo`. `bin/voodoo.mjs` checks the Node version and
 * calls `main()`, which returns the exit code instead of calling
 * `process.exit()`.
 *
 * That last part is not style. The old build command called `exit(1)` from a
 * `catch`, and `exit` ends the process on the spot, so the `finally` that was
 * meant to clean up never ran and the generated entry file was left behind
 * inside `node_modules/voodoojs`. Returning a code lets every cleanup happen.
 */

import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import process from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
export const packageRoot = resolve(here, '..');

const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));

/**
 * The single source of truth for every version the CLI writes or prints.
 *
 * The library and the CLI are released together with the same number (the
 * release script bumps both, and `npm run check:packaging` fails when they
 * drift), so the CLI's own version is the library version a new project should
 * load. Reading it here means a release never has to remember to edit a string
 * inside a template: the CDN pin used to be a literal in this file.
 */
export const VERSION = manifest.version;

/** The build a new project loads. The full one, because only it reads JSX. */
export const CDN_URL = `https://cdn.jsdelivr.net/npm/voodoojs@${VERSION}/dist/voodoo.full.min.js`;

/** Where `voodoo add` finds what it copies. Shipped inside this package. */
export const COMPONENTS_DIR = join(packageRoot, 'templates', 'components');

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/**
 * Terminal colors, no dependencies.
 *
 * Off when the output is not a terminal or `NO_COLOR` is set, so a log file or
 * a CI transcript does not fill up with escape codes.
 */
const useColor =
  Boolean(process.stdout.isTTY) && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb';
const paint = (code) => (useColor ? `\x1b[${code}m` : '');
const c = {
  reset: paint('0'),
  bold: paint('1'),
  dim: paint('2'),
  purple: paint('38;5;99'),
  green: paint('38;5;42'),
  yellow: paint('38;5;215'),
  red: paint('38;5;203'),
};

const out = (text = '') => process.stdout.write(`${text}\n`);
const err = (text = '') => process.stderr.write(`${text}\n`);

/** An error the user can act on: printed without a stack, exit code 1. */
class UsageError extends Error {}

const banner = `\n${c.purple}${c.bold}  Voodoo.js${c.reset} ${c.dim}JavaScript feels like magic.${c.reset}\n`;

/** A path as the user would type it: relative when it is below cwd, quoted when it has spaces. */
export function displayPath(target, from = process.cwd()) {
  const rel = relative(from, target);
  const shown = rel && !rel.startsWith('..') && !rel.includes(':') ? rel : target;
  return /\s/.test(shown) ? `"${shown}"` : shown;
}

// ---------------------------------------------------------------------------
// Modules for custom builds
// ---------------------------------------------------------------------------

/**
 * Modules that can be included in a custom build.
 * `required` marks what never leaves, because the rest depends on it.
 */
export const MODULES = [
  { id: 'core', label: 'Core and reactivity', entry: 'core.ts', required: true, description: 'Reactive proxy, effects, scope and walker' },
  { id: 'directives', label: 'Essential directives', entry: 'directives/core.ts', required: true, description: 'v-text, v-if, v-for, v-model, v-on, v-bind' },
  { id: 'dom', label: 'Chainable DOM', entry: 'dom/query.ts', description: 'V("#app").find(".item").addClass("active")' },
  { id: 'jsx', label: 'JSX in HTML', entry: 'jsx/index.ts', description: '{items.map((item) => (<li>{item}</li>))} in plain HTML' },
  { id: 'http', label: 'HTTP', entry: 'directives/http.ts', description: 'v-get, v-post, v-resource, http client' },
  { id: 'forms', label: 'Forms and validation', entry: 'directives/forms.ts', also: ['forms/validate.ts', 'forms/mask.ts'], description: 'v-submit, v-validate, masks' },
  { id: 'ui', label: 'Interface', entry: 'directives/ui.ts', also: ['ui/dialog.ts', 'ui/palette.ts'], description: 'modal, tabs, dropdown, tooltip, drawer, theme toggle' },
  { id: 'components', label: 'Ready-made components', entry: 'ui/components.ts', description: 'VButton, VCard, VInput, VSelect' },
  { id: 'toast', label: 'Notifications', entry: 'ui/toast.ts', description: 'V.toast.success and friends' },
  { id: 'motion', label: 'Animations', entry: 'motion/index.ts', description: 'v-motion, springs, stagger, scroll' },
  { id: 'charts', label: 'Charts', entry: 'charts/index.ts', description: 'v-chart in pure SVG' },
  { id: 'state', label: 'Advanced state', entry: 'directives/state.ts', description: 'v-persist, v-sync between tabs, undo' },
  { id: 'store', label: 'Global stores', entry: 'store/index.ts', description: '$store and shared state' },
  { id: 'storage', label: 'Storage', entry: 'storage/index.ts', description: 'localStorage, cookie, url, cache, theme' },
  { id: 'router', label: 'Router', entry: 'router/index.ts', description: 'routes in the browser, v-link, v-router-view' },
  { id: 'i18n', label: 'Languages', entry: 'i18n/index.ts', description: 'translations with v-t and $t' },
  { id: 'devtools', label: 'Xray inspector', entry: 'devtools/xray.ts', description: 'x-ray of reactivity on the page itself' },
  { id: 'utils', label: 'Utilities', entry: 'utils/index.ts', description: 'debounce, formatters, dates, currency' },
];

/**
 * Every source file a module brings in. `also` lists what the published builds
 * pull in next to the entry: `directives/ui.ts` alone has no dialogs, so a
 * custom build with "ui" had no `v-modal` and no `V.modal` although the menu
 * promised a modal.
 */
export function moduleFiles(module) {
  return [module.entry, ...(module.also ?? [])];
}

export const DEFAULT_MODULES = ['core', 'directives', 'dom', 'http', 'forms', 'ui', 'toast', 'store', 'storage', 'utils'];

export const FORMATS = ['iife', 'esm'];

/** Normalizes a selection: required modules first, in the order of `MODULES`, no repeats. */
export function resolveModules(ids) {
  const wanted = new Set(ids.map((id) => String(id).trim().toLowerCase()).filter(Boolean));
  const unknown = [...wanted].filter((id) => !MODULES.some((m) => m.id === id));
  if (unknown.length) {
    throw new UsageError(
      `Unknown module${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.\n` +
        `Available: ${MODULES.map((m) => m.id).join(', ')}`
    );
  }
  return MODULES.filter((m) => m.required || wanted.has(m.id)).map((m) => m.id);
}

/**
 * The source of the entry file esbuild bundles, resolved against the library root.
 *
 * It mirrors `src/browser.ts` rather than starting the page by hand. The first
 * version wired `window.V` and `V.start()` itself, which skipped everything the
 * official builds do in `bootstrap()`: the theme the visitor picked was never
 * restored, `data-manual` and the other script tag options were ignored, and
 * `V` was not callable even with the chainable DOM included. The IIFE footer is
 * the one `tsup.config.ts` uses; without it the bundle's own `var Voodoo`
 * replaced `window.Voodoo` with the module namespace.
 */
export function buildEntrySource(ids) {
  const chosen = resolveModules(ids);
  const optional = MODULES.filter((m) => !m.required && chosen.includes(m.id));
  const lines = [
    '/* Generated by "voodoo build". */',
    "import { core } from './src/core';",
    "import { bootstrap } from './src/bootstrap';",
  ];
  const namespaces = [];
  for (const m of optional) {
    moduleFiles(m).forEach((file, i) => {
      const name = i === 0 ? `mod_${m.id}` : `mod_${m.id}_${i}`;
      lines.push(`import * as ${name} from './src/${file.replace(/\.ts$/, '')}';`);
      namespaces.push(name);
    });
  }
  lines.push('');
  lines.push('const pick = (ns) => {');
  lines.push('  const out = {};');
  lines.push("  for (const key of Object.keys(ns)) if (key !== 'default') out[key] = ns[key];");
  lines.push('  return out;');
  lines.push('};');
  lines.push('');
  if (chosen.includes('dom')) {
    // `V('#list .item')` returns a collection, as in the published builds.
    lines.push('const V = (input, context) => mod_dom.query(input, context);');
  } else {
    lines.push('const V = {};');
  }
  const parts = ['core', ...namespaces.map((name) => `pick(${name})`)];
  lines.push(`Object.assign(V, ${parts.join(', ')});`);
  if (chosen.includes('dom')) lines.push('V.Collection = mod_dom.VoodooCollection;');
  lines.push('bootstrap(V);');
  lines.push('export default V;');
  lines.push('');
  return lines.join('\n');
}

const IIFE_FOOTER =
  'if(typeof window!=="undefined"){window.V=Voodoo.default||Voodoo;window.Voodoo=window.V;}';

// ---------------------------------------------------------------------------
// Finding the library
// ---------------------------------------------------------------------------

function readManifest(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Every place the voodoojs package could be, nearest first.
 *
 * Walks up from `start` the way Node resolves packages, so the command works
 * from a subfolder of a project and in a workspace whose `node_modules` sits at
 * the root. Then the folder next to this package: the workspace copy inside
 * the Voodoo.js repository, or a sibling install in the same `node_modules`.
 */
export function libraryCandidates(start = process.cwd()) {
  const found = [];
  let dir = resolve(start);
  for (;;) {
    found.push(join(dir, 'node_modules', 'voodoojs'));
    found.push(join(dir, 'packages', 'voodoojs'));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  found.push(resolve(packageRoot, '..', 'voodoojs'));
  return [...new Set(found)];
}

/**
 * The voodoojs package to work from, or `null`.
 *
 * `needSource` prefers a copy that carries `src/`, which `build` compiles from
 * and `info` measures. Any copy with a manifest named `voodoojs` counts
 * otherwise, so `info` can still report the bundle sizes from `dist/`.
 */
export function findLibrary(start = process.cwd(), { needSource = false } = {}) {
  const libraries = [];
  for (const root of libraryCandidates(start)) {
    const pkg = readManifest(root);
    if (!pkg || pkg.name !== 'voodoojs') continue;
    libraries.push({
      root,
      version: pkg.version,
      hasSource: existsSync(join(root, 'src', 'core.ts')),
      hasDist: existsSync(join(root, 'dist', 'voodoo.min.js')),
    });
  }
  if (!libraries.length) return null;
  if (needSource) return libraries.find((lib) => lib.hasSource) ?? libraries[0];
  return libraries.find((lib) => lib.hasSource || lib.hasDist) ?? libraries[0];
}

function versionNote(library) {
  if (!library.version || library.version === VERSION) return;
  out(
    `${c.yellow}voodoojs ${library.version} is installed and this is voodoojs-cli ${VERSION}.${c.reset} ` +
      `${c.dim}They are released together; install matching versions if anything looks off.${c.reset}`
  );
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

/**
 * The options each command accepts. `string` options take `--name=value` or
 * `--name value`; `boolean` ones also accept `--no-name`.
 */
const COMMAND_OPTIONS = {
  init: { force: 'boolean' },
  build: { modules: 'string', all: 'boolean', out: 'string', minify: 'boolean', format: 'string' },
  add: { force: 'boolean' },
  info: {},
};

const COMMAND_ARGS = { init: 1, build: 0, add: 1, info: 0 };

/**
 * Splits the arguments into the command, its positionals and its options.
 *
 * The old parser only looked at what came after the command and treated every
 * non-option as positional by index, so `voodoo init --help` created a folder
 * named `--help`, `--out dist/app.js` silently dropped the path, and
 * `--out=a=b.js` lost everything after the second `=`.
 */
export function parseArgs(argv) {
  const positionals = [];
  const options = {};
  const unknown = [];
  let command;
  let rest = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (rest || arg === '-' || !arg.startsWith('-')) {
      if (command === undefined && !rest) command = arg;
      else positionals.push(arg);
      continue;
    }
    if (arg === '--') {
      rest = true;
      continue;
    }
    if (arg === '-h' || arg === '--help') {
      options.help = true;
      continue;
    }
    if (arg === '-v' || arg === '-V' || arg === '--version') {
      options.version = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      unknown.push(arg);
      continue;
    }

    const eq = arg.indexOf('=');
    let name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    let value = eq === -1 ? undefined : arg.slice(eq + 1);
    const spec = COMMAND_OPTIONS[command] ?? {};

    if (spec[name] === undefined && name.startsWith('no-') && spec[name.slice(3)] === 'boolean') {
      name = name.slice(3);
      value = value === undefined ? 'false' : String(!/^(true|1|yes)$/i.test(value));
    }

    const type = spec[name];
    if (type === undefined) {
      unknown.push(eq === -1 ? arg : arg.slice(0, eq));
      continue;
    }
    if (type === 'boolean') {
      options[name] = value === undefined ? true : !/^(false|0|no)$/i.test(value);
      continue;
    }
    if (value === undefined) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) {
        throw new UsageError(`--${name} needs a value, as in --${name}=value.`);
      }
      value = next;
      i++;
    }
    options[name] = value;
  }

  return { command, positionals, options, unknown };
}

// ---------------------------------------------------------------------------
// help and version
// ---------------------------------------------------------------------------

function help() {
  out(banner);
  out(`${c.bold}Usage${c.reset}

  ${c.purple}voodoo init${c.reset} ${c.dim}[folder]${c.reset}       creates a new ready-to-run project
  ${c.purple}voodoo build${c.reset}               builds a custom bundle
  ${c.purple}voodoo add${c.reset} ${c.dim}<component>${c.reset}    copies a component into ./components
  ${c.purple}voodoo info${c.reset}                lists the modules and the size of each one

  ${c.dim}-h, --help${c.reset}                 shows this help
  ${c.dim}-v, --version${c.reset}              prints the version

${c.bold}init and add options${c.reset}

  ${c.dim}--force${c.reset}                    overwrites files that already exist

${c.bold}Build options${c.reset}

  ${c.dim}--modules=core,http,ui${c.reset}     chooses without asking anything
  ${c.dim}--all${c.reset}                      includes everything
  ${c.dim}--out=path.js${c.reset}              output file ${c.dim}(default voodoo.custom.min.js)${c.reset}
  ${c.dim}--no-minify${c.reset}                keeps the code readable
  ${c.dim}--format=iife|esm${c.reset}          bundle format ${c.dim}(default iife)${c.reset}

${c.bold}Components${c.reset}

  ${listComponents().join(', ') || 'none'}

${c.bold}Examples${c.reset}

  ${c.dim}npx voodoojs-cli init my-page${c.reset}
  ${c.dim}npx voodoojs-cli build --modules=core,directives,jsx,http,toast${c.reset}
  ${c.dim}npx voodoojs-cli add card${c.reset}
`);
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

/**
 * Runs in `<head>` before the first paint and gives the visitor back the theme
 * they picked, so a dark choice never flashes white while the library loads.
 *
 * It reads the key the library writes (`voodoo:theme`), raw or JSON encoded,
 * and writes what `V.theme.apply()` writes: `light` or `dark` set `data-theme`
 * on `<html>`, `system` removes it, and an unset key leaves the page alone so
 * the operating system decides.
 */
export const THEME_HEAD_SNIPPET = `<script>
    (function () {
      try {
        var saved = localStorage.getItem('voodoo:theme');
        try { saved = JSON.parse(saved); } catch (e) {}
        var root = document.documentElement;
        if (saved === 'light' || saved === 'dark') {
          root.setAttribute('data-theme', saved);
          root.style.colorScheme = saved;
        } else if (saved === 'system') {
          root.removeAttribute('data-theme');
        }
      } catch (e) {
        /* Private mode and opaque origins throw on localStorage. */
      }
    })();
  </script>`;

/** The page `voodoo init` writes. */
export function projectHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My app with Voodoo.js</title>
  ${THEME_HEAD_SNIPPET}
  <script src="${CDN_URL}" defer></script>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --text: #14111f;
      --muted: #6b6580;
      --border: #e6e0f0;
      --accent: #6d3bf5;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #14111f;
        --text: #f4f1fb;
        --muted: #a9a2c4;
        --border: #332c50;
        --accent: #9b7bff;
      }
    }
    :root[data-theme="dark"] {
      --bg: #14111f;
      --text: #f4f1fb;
      --muted: #a9a2c4;
      --border: #332c50;
      --accent: #9b7bff;
    }
    body {
      font-family: system-ui, sans-serif;
      max-width: 40rem;
      margin: 4rem auto;
      padding: 0 1rem;
      background: var(--bg);
      color: var(--text);
    }
    header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    button, input {
      font: inherit;
      color: inherit;
      background: transparent;
      padding: .5rem 1rem;
      border-radius: .5rem;
      border: 1px solid var(--border);
    }
    button { cursor: pointer; }
    button:hover { border-color: var(--accent); }
    .muted { color: var(--muted); }
  </style>
</head>
<body>

  <header>
    <h1>Hello, Voodoo</h1>
    <button v-theme-toggle>Toggle theme</button>
  </header>

  <main v-data="{ name: '', count: 0 }">

    <input v-model="name" placeholder="Write your name">
    <p>Hello, { name || 'stranger' }!</p>

    <button @click="count--">less</button>
    <strong>{ count }</strong>
    <button @click="count++">more</button>

    <p v-show="count > 5">You clicked a lot.</p>

    <h2>Next steps</h2>
    <ul>
      {['Edit index.html', 'Save it', 'Reload the browser'].map((step) => (
        <li>{step}</li>
      ))}
    </ul>
    <p class="muted">That list is JSX, running in a plain HTML file.</p>

  </main>

</body>
</html>
`;
}

function projectReadme() {
  return `# My app with Voodoo.js

Open \`index.html\` in the browser. No build needed, nothing to install.

To serve it locally:

\`\`\`bash
npx serve .
\`\`\`

The page loads Voodoo.js ${VERSION} from the CDN. The button in the header
switches between light and dark; the choice is saved in \`localStorage\` under
\`voodoo:theme\`, and the small script in \`<head>\` applies it before the first
paint.

Documentation: https://kwy404.github.io/Voodoo.js/docs/
`;
}

async function commandInit(folder, options) {
  out(banner);
  const target = resolve(process.cwd(), folder || 'my-voodoo-app');

  if (existsSync(target) && !statSync(target).isDirectory()) {
    throw new UsageError(`${displayPath(target)} already exists and is not a folder.`);
  }

  const files = [
    ['index.html', projectHtml()],
    ['README.md', projectReadme()],
  ];
  const existing = files.filter(([name]) => existsSync(join(target, name))).map(([name]) => name);
  if (existing.length && !options.force) {
    throw new UsageError(
      `${displayPath(target)} already has ${existing.join(' and ')}. ` +
        'Choose another folder, or pass --force to overwrite.'
    );
  }

  await mkdir(target, { recursive: true });
  for (const [name, content] of files) await writeFile(join(target, name), content, 'utf8');

  out(`${c.green}Project created in${c.reset} ${target}`);
  out('');
  if (resolve(process.cwd()) !== target) out(`  cd ${displayPath(target)}`);
  out('  open index.html in the browser, or serve the folder with: npx serve .');
  out('');
  return 0;
}

// ---------------------------------------------------------------------------
// add
// ---------------------------------------------------------------------------

export function listComponents() {
  // Synchronous on purpose: the help text lists the components too.
  if (!existsSync(COMPONENTS_DIR)) return [];
  return readdirSync(COMPONENTS_DIR)
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.replace(/\.html$/, ''))
    .sort();
}

async function commandAdd(name, options) {
  out(banner);
  const available = listComponents();
  const list = `Available: ${available.join(', ')}`;

  if (!name) {
    throw new UsageError(`Name the component to copy, as in: npx voodoojs-cli add card\n${list}`);
  }

  const wanted = name.toLowerCase().replace(/\.html$/, '');
  if (!available.includes(wanted)) {
    throw new UsageError(`There is no component named "${name}".\n${list}`);
  }

  const file = `${wanted}.html`;
  const content = await readFile(join(COMPONENTS_DIR, file), 'utf8');
  const folder = resolve(process.cwd(), 'components');
  const target = join(folder, file);

  if (existsSync(target) && !options.force) {
    throw new UsageError(
      `${displayPath(target)} already exists. Pass --force to overwrite it.`
    );
  }

  await mkdir(folder, { recursive: true });
  await writeFile(target, content, 'utf8');

  out(`${c.green}Copied to${c.reset} ${displayPath(target)}`);
  out(`${c.dim}The code is now yours. Paste it into a page that loads Voodoo.js and edit freely.${c.reset}`);
  return 0;
}

// ---------------------------------------------------------------------------
// info
// ---------------------------------------------------------------------------

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const BUNDLES = [
  { file: 'voodoo.core.min.js', label: 'minimal' },
  { file: 'voodoo.min.js', label: 'essential' },
  { file: 'voodoo.full.min.js', label: 'full, with JSX' },
];

async function commandInfo() {
  out(banner);
  const library = findLibrary(process.cwd(), { needSource: true });
  if (!library) {
    throw new UsageError('voodoojs is not installed here. Install it with: npm install voodoojs');
  }

  out(`${c.dim}voodoojs ${library.version ?? '?'} at ${library.root}${c.reset}`);
  out(`${c.dim}voodoojs-cli ${VERSION}${c.reset}\n`);
  versionNote(library);

  if (library.hasSource) {
    const rows = [];
    for (const module of MODULES) {
      let size;
      try {
        let bytes = 0;
        for (const file of moduleFiles(module)) bytes += (await stat(join(library.root, 'src', file))).size;
        size = kb(bytes);
      } catch {
        size = 'missing';
      }
      // These keys are user-facing: console.table draws them as the column
      // headings, so they are output, not identifiers.
      rows.push({
        module: module.id,
        name: module.label,
        source: size,
        default: DEFAULT_MODULES.includes(module.id) ? 'yes' : '',
      });
    }
    console.table(rows);
  } else {
    out(
      `${c.dim}This copy of voodoojs ships only its built files, so the size of each module ` +
        `is not available. The published bundles:${c.reset}`
    );
  }

  out('');
  for (const bundle of BUNDLES) {
    const path = join(library.root, 'dist', bundle.file);
    if (!existsSync(path)) continue;
    const content = await readFile(path);
    out(
      `  ${bundle.file.padEnd(20)} ${kb(content.length).padStart(9)} raw, ` +
        `${c.green}${kb(gzipSync(content, { level: 9 }).length).padStart(8)} gzip${c.reset}  ${c.dim}${bundle.label}${c.reset}`
    );
  }
  return 0;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

/**
 * Interactive module selection menu.
 *
 * Only with a terminal on stdin. Without one, `rl.question()` never settled:
 * the process ended on an unsettled top-level await with no message, which is
 * what a CI job running `voodoo build` without `--modules` got.
 */
async function askModules() {
  if (!process.stdin.isTTY) {
    throw new UsageError(
      'Choose the modules with --modules=core,directives,... or --all. ' +
        'The interactive menu needs a terminal.'
    );
  }

  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  out(`${c.bold}Choose the modules${c.reset} ${c.dim}(Enter accepts the default selection)${c.reset}\n`);
  MODULES.forEach((module, i) => {
    const checked = DEFAULT_MODULES.includes(module.id) || module.required ? `${c.green}[x]${c.reset}` : '[ ]';
    const lock = module.required ? `${c.dim} required${c.reset}` : '';
    out(
      `  ${String(i + 1).padStart(2)} ${checked} ${c.bold}${module.label}${c.reset}${lock}\n` +
        `        ${c.dim}${module.description}${c.reset}`
    );
  });

  const answer = await new Promise((resolveAnswer) => {
    let answered = false;
    rl.on('close', () => {
      if (!answered) resolveAnswer(null);
    });
    // Ctrl+C at the prompt. Without a listener, readline only pauses the
    // input and the question is left hanging.
    rl.on('SIGINT', () => rl.close());
    rl.question(
      `\n${c.purple}Numbers or names separated by comma, "all", or Enter for the default:${c.reset} `,
      (text) => {
        answered = true;
        rl.close();
        resolveAnswer(text);
      }
    );
  });

  if (answer === null) throw new UsageError('Cancelled.');

  const text = answer.trim().toLowerCase();
  if (!text) return [...DEFAULT_MODULES];
  if (text === 'all') return MODULES.map((m) => m.id);

  const ids = [];
  const ignored = [];
  for (const part of text.split(',').map((s) => s.trim()).filter(Boolean)) {
    const n = Number(part);
    if (Number.isInteger(n) && n >= 1 && n <= MODULES.length) ids.push(MODULES[n - 1].id);
    else if (MODULES.some((m) => m.id === part)) ids.push(part);
    else ignored.push(part);
  }
  if (ignored.length) out(`${c.yellow}Ignoring: ${ignored.join(', ')}${c.reset}`);
  return ids;
}

async function commandBuild(options) {
  out(banner);

  const format = options.format ?? 'iife';
  if (!FORMATS.includes(format)) {
    throw new UsageError(`--format must be ${FORMATS.join(' or ')}, not "${format}".`);
  }
  if (options.modules !== undefined && !String(options.modules).trim()) {
    throw new UsageError('--modules is empty. Name at least one, as in --modules=core,directives');
  }

  const library = findLibrary(process.cwd(), { needSource: true });
  if (!library) {
    throw new UsageError(
      'voodoojs is not installed here. "build" compiles the library, so install it first: npm install voodoojs'
    );
  }
  if (!library.hasSource) {
    throw new UsageError(
      `The voodoojs package at ${library.root} has no src/ folder, and "build" compiles from the source.\n` +
        'Use a voodoojs release that ships its source, or run the command inside a clone of the ' +
        'Voodoo.js repository (https://github.com/kwy404/Voodoo.js).'
    );
  }
  versionNote(library);

  let chosen;
  if (options.all) chosen = MODULES.map((m) => m.id);
  else if (options.modules !== undefined) chosen = String(options.modules).split(',');
  else chosen = await askModules();

  const modules = resolveModules(chosen);
  const missing = modules.filter(
    (id) => !moduleFiles(MODULES.find((m) => m.id === id)).every((file) => existsSync(join(library.root, 'src', file)))
  );
  if (missing.length) {
    throw new UsageError(
      `voodoojs ${library.version ?? ''} has no ${missing.join(', ')} module. Install a matching version.`
    );
  }

  out(`${c.bold}Included modules${c.reset}: ${modules.join(', ')}\n`);

  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    throw new UsageError('esbuild is missing. Reinstall voodoojs-cli, which depends on it.');
  }

  const outfile = resolve(process.cwd(), options.out || 'voodoo.custom.min.js');
  const minify = options.minify !== false;

  try {
    // The entry is handed over through stdin instead of being written to disk.
    // It used to be written INTO the library folder, which means into
    // `node_modules/voodoojs`: a read-only or shared install failed outright,
    // and every run left a stray `.voodoo-custom-entry.ts` behind.
    await esbuild.build({
      stdin: {
        contents: buildEntrySource(modules),
        resolveDir: library.root,
        sourcefile: 'voodoo-custom-entry.ts',
        loader: 'ts',
      },
      bundle: true,
      minify,
      format,
      globalName: format === 'iife' ? 'Voodoo' : undefined,
      target: 'es2018',
      outfile,
      sourcemap: true,
      legalComments: 'none',
      logLevel: 'silent',
      banner: { js: `/* Voodoo.js ${library.version ?? VERSION} custom build: ${modules.join(', ')} */` },
      footer: format === 'iife' ? { js: IIFE_FOOTER } : undefined,
    });
  } catch (error) {
    const details = (error.errors ?? [])
      .map((e) => `  ${e.text}${e.location ? ` (${e.location.file}:${e.location.line})` : ''}`)
      .join('\n');
    err(`${c.red}Build failed.${c.reset}`);
    err(details || error.message);
    return 1;
  }

  const content = await readFile(outfile);
  out(`${c.green}Done.${c.reset} ${displayPath(outfile)}`);
  out(`  ${kb(content.length)} raw, ${c.bold}${kb(gzipSync(content, { level: 9 }).length)} gzip${c.reset}`);
  return 0;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

/** Runs the CLI and returns the exit code. */
export async function main(argv) {
  // `voodoo info | head` closes the pipe early. That is the reader being done,
  // not a failure, and it used to end in an unhandled EPIPE stack trace.
  process.stdout.on('error', (error) => {
    if (error.code === 'EPIPE') process.exit(0);
    throw error;
  });

  try {
    const { command, positionals, options, unknown } = parseArgs(argv);

    if (options.version || command === 'version') {
      out(VERSION);
      return 0;
    }
    if (options.help || command === undefined || command === 'help') {
      help();
      return 0;
    }
    if (!(command in COMMAND_OPTIONS)) {
      err(`${c.red}Unknown command: ${command}${c.reset}`);
      err('Run "voodoo --help" to see the commands.');
      return 1;
    }
    if (unknown.length) {
      throw new UsageError(
        `Unknown option${unknown.length > 1 ? 's' : ''} for "voodoo ${command}": ${unknown.join(', ')}. ` +
          'Run "voodoo --help" to see them.'
      );
    }
    if (positionals.length > COMMAND_ARGS[command]) {
      throw new UsageError(
        `Too many arguments for "voodoo ${command}": ${positionals.join(' ')}. ` +
          'Quote a path that contains spaces.'
      );
    }

    switch (command) {
      case 'init':
        return await commandInit(positionals[0], options);
      case 'add':
        return await commandAdd(positionals[0], options);
      case 'info':
        return await commandInfo();
      case 'build':
        return await commandBuild(options);
    }
    return 1;
  } catch (error) {
    if (error instanceof UsageError) {
      err(`${c.red}${error.message}${c.reset}`);
      return 1;
    }
    throw error;
  }
}

