// @vitest-environment node
/**
 * The command line, exercised the way people run it: through the bin, in a
 * real folder whose path has a space in it, reading exit codes and the two
 * output streams separately.
 *
 * Every block here pins something that shipped broken. `add` had never copied
 * anything, `build` failed against the published package and left files inside
 * it, `--version` was an unknown command, and `init --help` created a folder
 * named `--help`.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

import {
  CDN_URL,
  COMPONENTS_DIR,
  EXAMPLES_DIR,
  MODULES,
  THEME_HEAD_SNIPPET,
  VERSION,
  buildEntrySource,
  findLibrary,
  listComponents,
  listExamples,
  moduleFiles,
  parseArgs,
  projectHtml,
  resolveModules,
} from '../lib/cli.mjs';
import { minimumMajor, nodeProblem } from '../lib/engine.mjs';

const CLI_ROOT = resolve(__dirname, '..');
const BIN = join(CLI_ROOT, 'bin', 'voodoo.mjs');
const LIBRARY_ROOT = resolve(CLI_ROOT, '..', 'voodoojs');
const manifest = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf8'));

let sandbox: string;

beforeAll(() => {
  // The space is the point: paths with spaces broke more than one CLI.
  sandbox = mkdtempSync(join(tmpdir(), 'voodoo cli '));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function fresh(name: string): string {
  const dir = join(sandbox, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function voodoo(args: string[], cwd: string = sandbox) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    input: '',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('Node version check', () => {
  it('reads the minimum from the engines range in package.json', () => {
    expect(minimumMajor(manifest.engines.node)).toBe(18);
    expect(minimumMajor('>= 20.1')).toBe(20);
    expect(minimumMajor('^18')).toBeNull();
  });

  it('explains what to install on an old Node, and stays quiet on a supported one', () => {
    const message = nodeProblem('16.20.2', '>=18');
    expect(message).toContain('Node 18 or newer');
    expect(message).toContain('16.20.2');
    expect(nodeProblem('v17.9.1', '>=18')).toContain('17.9.1');
    expect(nodeProblem('18.0.0', '>=18')).toBeNull();
    expect(nodeProblem(process.versions.node, manifest.engines.node)).toBeNull();
  });
});

describe('what ships', () => {
  it('keeps the shebang on its own LF line, so Linux and macOS can run the bin', () => {
    const bin = readFileSync(BIN, 'utf8');
    expect(bin.startsWith('#!/usr/bin/env node\n')).toBe(true);
    for (const file of [BIN, join(CLI_ROOT, 'lib', 'cli.mjs'), join(CLI_ROOT, 'lib', 'engine.mjs')]) {
      expect(readFileSync(file, 'utf8').includes('\r'), file).toBe(false);
    }
    expect(readFileSync(join(CLI_ROOT, '.gitattributes'), 'utf8')).toMatch(/eol=lf/);
  });

  it('lists every folder the CLI reads at runtime in "files", and each exists', () => {
    expect(manifest.files).toEqual(expect.arrayContaining(['bin', 'lib', 'templates', 'README.md']));
    for (const entry of manifest.files) expect(existsSync(join(CLI_ROOT, entry)), entry).toBe(true);
    expect(manifest.bin.voodoo).toBe('./bin/voodoo.mjs');
  });

  it('packs the library code and the component templates', () => {
    const output = execSync('npm pack --dry-run --json', { cwd: CLI_ROOT, encoding: 'utf8' });
    const files = JSON.parse(output.slice(output.indexOf('[')))[0].files.map((f: { path: string }) => f.path);
    expect(files).toEqual(
      expect.arrayContaining(['bin/voodoo.mjs', 'lib/cli.mjs', 'lib/engine.mjs', 'templates/components/card.html', 'templates/examples/todo.html', 'README.md'])
    );
    expect(files.some((f: string) => f.startsWith('test/'))).toBe(false);
  }, 60_000);

  it('depends on an esbuild without the dev server advisory (fixed in 0.25)', () => {
    const [major, minor] = manifest.dependencies.esbuild.replace(/^[^\d]*/, '').split('.').map(Number);
    expect(major > 0 || minor >= 25).toBe(true);
  });
});

describe('arguments', () => {
  it('prints the version for --version, -v and "version"', () => {
    for (const flag of ['--version', '-v', 'version']) {
      const run = voodoo([flag]);
      expect(run.code, flag).toBe(0);
      expect(run.stdout.trim()).toBe(manifest.version);
    }
    expect(VERSION).toBe(manifest.version);
  });

  it('prints help with exit code 0, and lists the components', () => {
    const run = voodoo(['--help']);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('voodoo init');
    expect(run.stdout).toContain('card');
  });

  it('fails an unknown command on stderr with exit code 1', () => {
    const run = voodoo(['bogus']);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('Unknown command: bogus');
    expect(run.stdout).toBe('');
  });

  it('shows help for "init --help" instead of creating a folder named --help', () => {
    const dir = fresh('help-flag');
    const run = voodoo(['init', '--help'], dir);
    expect(run.code).toBe(0);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('rejects unknown options and extra arguments', () => {
    const dir = fresh('bad-args');
    expect(voodoo(['init', '--bogus'], dir).code).toBe(1);
    const extra = voodoo(['init', 'my', 'app'], dir);
    expect(extra.code).toBe(1);
    expect(extra.stderr).toContain('Quote a path');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('parses values with "=", with a space, and negated booleans', () => {
    expect(parseArgs(['build', '--out', 'dist/app.js']).options.out).toBe('dist/app.js');
    expect(parseArgs(['build', '--out=a=b.js']).options.out).toBe('a=b.js');
    expect(parseArgs(['build', '--no-minify']).options.minify).toBe(false);
    expect(parseArgs(['build', '--minify=false']).options.minify).toBe(false);
    expect(parseArgs(['build', '--all']).options.all).toBe(true);
    expect(parseArgs(['init', '--', '--weird-name']).positionals).toEqual(['--weird-name']);
    expect(parseArgs(['init', '--nope']).unknown).toEqual(['--nope']);
    expect(() => parseArgs(['build', '--out'])).toThrow(/needs a value/);
  });
});

describe('voodoo init', () => {
  it('creates a project in a folder with spaces, pinned to this release', () => {
    const run = voodoo(['init', 'my app']);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('cd "my app"');

    const html = readFileSync(join(sandbox, 'my app', 'index.html'), 'utf8');
    expect(html).toContain(`<script src="${CDN_URL}" defer></script>`);
    expect(CDN_URL).toBe(`https://cdn.jsdelivr.net/npm/voodoojs@${manifest.version}/dist/voodoo.full.min.js`);
    expect(html).toContain('v-theme-toggle');
    expect(readFileSync(join(sandbox, 'my app', 'README.md'), 'utf8')).toContain(manifest.version);
  });

  it('puts the theme snippet in <head>, before the library loads', () => {
    const html = projectHtml();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(THEME_HEAD_SNIPPET);
    expect(head.indexOf(THEME_HEAD_SNIPPET)).toBeLessThan(head.indexOf(CDN_URL));
    // Dark tokens for both routes: the operating system and an explicit choice.
    expect(html).toContain(':root:not([data-theme="light"])');
    expect(html).toContain(':root[data-theme="dark"]');
  });

  it('refuses to overwrite an existing project unless --force is given', () => {
    const dir = fresh('existing');
    writeFileSync(join(dir, 'index.html'), 'mine');
    const run = voodoo(['init', '.'], dir);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('--force');
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe('mine');

    expect(voodoo(['init', '.', '--force'], dir).code).toBe(0);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('Hello, Voodoo');
  });

  it('fails clearly when the target is a file', () => {
    const dir = fresh('file-target');
    writeFileSync(join(dir, 'taken'), '');
    const run = voodoo(['init', 'taken'], dir);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('not a folder');
  });
});

describe('voodoo init --example', () => {
  it('offers the four starters', () => {
    expect(listExamples()).toEqual(['counter', 'fetch', 'form', 'todo']);
    expect(voodoo(['--help']).stdout).toContain('--example=todo');
  });

  it('starts the page from the example, keeping the theme and the pinned library', () => {
    const run = voodoo(['init', 'my todos', '--example=Todo']);
    expect(run.code).toBe(0);

    const html = readFileSync(join(sandbox, 'my todos', 'index.html'), 'utf8');
    const main = html.slice(html.indexOf('<main>'), html.indexOf('</main>'));
    expect(main).toContain('    <h2>Todo list</h2>');
    expect(main).toContain('v-for="todo in todos"');
    expect(main).not.toContain('Write your name');
    expect(html).toContain(THEME_HEAD_SNIPPET);
    expect(html).toContain(`<script src="${CDN_URL}" defer></script>`);
    expect(readFileSync(join(sandbox, 'my todos', 'README.md'), 'utf8')).toContain('--example=todo');
  });

  it('names the examples when the one asked for does not exist, and writes nothing', () => {
    const dir = fresh('bad-example');
    const run = voodoo(['init', '.', '--example', 'chess'], dir);
    expect(run.code).toBe(1);
    expect(run.stderr).toContain('There is no example named "chess"');
    expect(run.stderr).toContain('counter, fetch, form, todo');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('ships the same code as the library presets', async () => {
    const { presets } = await import('../../voodoojs/src/playground/presets');
    for (const preset of presets) {
      const file = readFileSync(join(EXAMPLES_DIR, `${preset.id}.html`), 'utf8');
      expect(file.split('\r\n').join('\n'), preset.id).toBe(preset.code);
    }
    expect(listExamples()).toEqual(presets.map((p) => p.id).sort());
  });

  it('keeps the welcome page when no example is given', () => {
    expect(projectHtml()).toContain('Write your name');
    expect(projectHtml('<p>hi</p>')).toContain('<main>\n\n    <p>hi</p>\n\n  </main>');
  });
});

describe('the theme head snippet', () => {
  /** Runs the snippet in a page whose localStorage holds `stored`. */
  function apply(stored: string | null, authored?: string) {
    const dom = new JSDOM(
      `<!doctype html><html${authored ? ` data-theme="${authored}"` : ''}><head></head><body></body></html>`,
      { url: 'http://localhost/', runScripts: 'outside-only' }
    );
    if (stored !== null) dom.window.localStorage.setItem('voodoo:theme', stored);
    const code = THEME_HEAD_SNIPPET.replace(/^<script>/, '').replace(/<\/script>$/, '');
    dom.window.eval(code);
    return dom.window.document.documentElement;
  }

  it('applies light and dark, raw or JSON encoded', () => {
    expect(apply('dark').getAttribute('data-theme')).toBe('dark');
    expect(apply('"dark"').getAttribute('data-theme')).toBe('dark');
    expect(apply('light').getAttribute('data-theme')).toBe('light');
    expect(apply('"light"').getAttribute('data-theme')).toBe('light');
    expect(apply('dark').style.colorScheme).toBe('dark');
  });

  it('removes the attribute for system, and leaves the page alone otherwise', () => {
    expect(apply('system', 'dark').hasAttribute('data-theme')).toBe(false);
    expect(apply('"system"', 'dark').hasAttribute('data-theme')).toBe(false);
    expect(apply(null, 'dark').getAttribute('data-theme')).toBe('dark');
    expect(apply('purple', 'light').getAttribute('data-theme')).toBe('light');
    expect(apply(null).hasAttribute('data-theme')).toBe(false);
  });
});

describe('voodoo add', () => {
  it('ships components to copy', () => {
    expect(listComponents()).toEqual(
      expect.arrayContaining(['accordion', 'card', 'drawer', 'dropdown', 'modal', 'tabs', 'theme-toggle'])
    );
  });

  it('copies a component, case-insensitively, and will not overwrite without --force', () => {
    const dir = fresh('add');
    const run = voodoo(['add', 'Card'], dir);
    expect(run.code).toBe(0);
    const copied = join(dir, 'components', 'card.html');
    expect(readFileSync(copied, 'utf8')).toBe(readFileSync(join(COMPONENTS_DIR, 'card.html'), 'utf8'));

    writeFileSync(copied, 'edited');
    const again = voodoo(['add', 'card'], dir);
    expect(again.code).toBe(1);
    expect(readFileSync(copied, 'utf8')).toBe('edited');
    expect(voodoo(['add', 'card', '--force'], dir).code).toBe(0);
    expect(readFileSync(copied, 'utf8')).not.toBe('edited');
  });

  it('fails with the list of components when the name is missing or unknown', () => {
    const dir = fresh('add-errors');
    for (const args of [['add'], ['add', 'nope'], ['add', '../package']]) {
      const run = voodoo(args, dir);
      expect(run.code, args.join(' ')).toBe(1);
      expect(run.stderr).toContain('Available: accordion');
    }
    expect(existsSync(join(dir, 'components'))).toBe(false);
  });

  it('uses only attributes the library knows', () => {
    // Every `v-*` name a template uses has to appear in the library source,
    // either as a registered directive or as an attribute a directive reads.
    const source: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name.endsWith('.ts')) source.push(readFileSync(path, 'utf8'));
      }
    };
    walk(join(LIBRARY_ROOT, 'src'));
    const all = source.join('\n');

    for (const name of listComponents()) {
      const html = readFileSync(join(COMPONENTS_DIR, `${name}.html`), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      for (const [, attribute] of html.matchAll(/\sv-([a-z-]+)/g)) {
        const known = all.includes(`'${attribute}'`) || all.includes(`v-${attribute}`);
        expect(known, `${name}: v-${attribute}`).toBe(true);
      }
    }
  });

  it('carries no version pin of its own', () => {
    for (const name of listComponents()) {
      expect(readFileSync(join(COMPONENTS_DIR, `${name}.html`), 'utf8')).not.toMatch(/voodoojs@/);
    }
  });
});

describe('voodoo build', () => {
  it('names only modules whose files exist in the library source', () => {
    for (const module of MODULES) {
      for (const file of moduleFiles(module)) {
        expect(existsSync(join(LIBRARY_ROOT, 'src', file)), `${module.id}: ${file}`).toBe(true);
      }
    }
  });

  it('adds the required modules and rejects unknown ones', () => {
    expect(resolveModules(['http'])).toEqual(['core', 'directives', 'http']);
    expect(() => resolveModules(['core', 'nope'])).toThrow(/Unknown module: nope/);
  });

  it('starts the page through bootstrap, like the published builds', () => {
    const entry = buildEntrySource(['dom', 'ui']);
    expect(entry).toContain("import { bootstrap } from './src/bootstrap';");
    expect(entry).toContain('bootstrap(V);');
    expect(entry).toContain("from './src/ui/dialog'");
    expect(entry).toContain('const V = (input, context) => mod_dom.query(input, context);');
    expect(buildEntrySource([])).toContain('const V = {};');
  });

  it('rejects a bad format, an empty or unknown module list, and a missing terminal', () => {
    const dir = fresh('build-errors');
    expect(voodoo(['build', '--format=cjs'], dir).stderr).toContain('--format must be iife or esm');
    expect(voodoo(['build', '--modules='], dir).code).toBe(1);
    const unknown = voodoo(['build', '--modules=core,nope'], dir);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain('Unknown module: nope');
    const noTty = voodoo(['build'], dir);
    expect(noTty.code).toBe(1);
    expect(noTty.stderr).toContain('--modules');
    expect(readdirSync(dir)).toEqual([]);
  });

  it('builds a bundle that runs, without writing into the library folder', async () => {
    const dir = fresh('build');
    const run = voodoo(['build', '--modules=core,directives,dom,jsx', '--out', 'out dir/app.js'], dir);
    expect(run.stderr).toBe('');
    expect(run.code).toBe(0);
    expect(readdirSync(LIBRARY_ROOT).filter((f) => f.includes('custom-entry'))).toEqual([]);

    const bundle = readFileSync(join(dir, 'out dir', 'app.js'), 'utf8');
    expect(existsSync(join(dir, 'out dir', 'app.js.map'))).toBe(true);

    const dom = new JSDOM(
      `<!doctype html><html><body>
        <div v-data="{ n: 2 }"><span id="t" v-text="n * 21"></span></div>
        <ul id="list">
          {['a', 'b'].map((x) => (
            <li>{x}</li>
          ))}
        </ul>
      </body></html>`,
      { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true }
    );
    const { window } = dom;
    window.eval(bundle);
    for (let i = 0; i < 50 && window.document.querySelector('#t')!.textContent !== '42'; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(window.document.querySelector('#t')!.textContent).toBe('42');
    expect(window.document.querySelectorAll('#list li')).toHaveLength(2);
    const V = (window as unknown as { V: any; Voodoo: unknown }).V;
    expect(typeof V).toBe('function');
    expect((window as unknown as { Voodoo: unknown }).Voodoo).toBe(V);
    expect(V('#list li').length).toBe(2);
    window.close();
  }, 60_000);
});

describe('finding the library', () => {
  it('walks up from a subfolder and prefers a copy with its source', () => {
    const project = fresh('project');
    const installed = join(project, 'node_modules', 'voodoojs');
    mkdirSync(join(installed, 'dist'), { recursive: true });
    writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: 'voodoojs', version: '0.0.1' }));
    writeFileSync(join(installed, 'dist', 'voodoo.min.js'), '');
    const nested = join(project, 'src', 'pages');
    mkdirSync(nested, { recursive: true });

    const nearest = findLibrary(nested);
    expect(nearest.root).toBe(installed);
    expect(nearest.hasSource).toBe(false);

    // `build` needs the source; the workspace copy next to the CLI has it.
    const withSource = findLibrary(nested, { needSource: true });
    expect(withSource.hasSource).toBe(true);
  });

  it('reports module sizes and the published bundles', () => {
    const run = voodoo(['info'], CLI_ROOT);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain('voodoo.full.min.js');
    expect(run.stdout).toContain('jsx');
  });
});
