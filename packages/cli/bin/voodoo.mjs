#!/usr/bin/env node
/**
 * Voodoo.js command-line interface.
 *
 *   npx voodoojs-cli init          creates a new ready-to-use project
 *   npx voodoojs-cli build         builds a custom bundle with the modules you choose
 *   npx voodoojs-cli add <nome>    copies a component into your project
 *   npx voodoojs-cli info          shows what is installed and the size of each module
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv, exit, cwd } from 'node:process';
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

// Terminal colors, no dependencies.
const c = {
  reset: '[0m',
  bold: '[1m',
  dim: '[2m',
  roxo: '[38;5;99m',
  magenta: '[38;5;205m',
  verde: '[38;5;42m',
  amarelo: '[38;5;215m',
  vermelho: '[38;5;203m',
};

const banner = `
${c.roxo}${c.bold}  Voodoo.js${c.reset} ${c.dim}JavaScript feels like magic.${c.reset}
`;

/**
 * Modules that can be included in a custom build.
 * `required` marks what never leaves, because the rest depends on it.
 */
const MODULES = [
  { id: 'core', label: 'Core and reactivity', entry: 'core.ts', required: true, descricao: 'Reactive proxy, effects, scope and walker' },
  { id: 'directives', label: 'Essential directives', entry: 'directives/core.ts', required: true, descricao: 'v-text, v-if, v-for, v-model, v-on, v-bind' },
  { id: 'dom', label: 'Chainable DOM', entry: 'dom/query.ts', descricao: 'V("#app").find(".item").addClass("active")' },
  { id: 'http', label: 'HTTP', entry: 'directives/http.ts', descricao: 'v-get, v-post, v-resource, http client' },
  { id: 'forms', label: 'Forms and validation', entry: 'directives/forms.ts', descricao: 'v-submit, v-validate, masks' },
  { id: 'ui', label: 'Interface', entry: 'directives/ui.ts', descricao: 'modal, tabs, dropdown, tooltip, drawer' },
  { id: 'components', label: 'Ready-made components', entry: 'ui/components.ts', descricao: 'VButton, VCard, VInput, VSelect' },
  { id: 'toast', label: 'Notifications', entry: 'ui/toast.ts', descricao: 'V.toast.success and friends' },
  { id: 'motion', label: 'Animations', entry: 'motion/index.ts', descricao: 'v-motion, springs, stagger, scroll' },
  { id: 'charts', label: 'Charts', entry: 'charts/index.ts', descricao: 'v-chart in pure SVG' },
  { id: 'state', label: 'Advanced state', entry: 'directives/state.ts', descricao: 'v-persist, v-sync between tabs, undo' },
  { id: 'store', label: 'Global stores', entry: 'store/index.ts', descricao: '$store and shared state' },
  { id: 'storage', label: 'Storage', entry: 'storage/index.ts', descricao: 'localStorage, cookie, url, cache, theme' },
  { id: 'router', label: 'Router', entry: 'router/index.ts', descricao: 'routes in the browser, v-link, v-router-view' },
  { id: 'i18n', label: 'Languages', entry: 'i18n/index.ts', descricao: 'translations with v-t and $t' },
  { id: 'devtools', label: 'Xray inspector', entry: 'devtools/xray.ts', descricao: 'x-ray of reactivity on the page itself' },
  { id: 'utils', label: 'Utilities', entry: 'utils/index.ts', descricao: 'debounce, formatters, dates, currency' },
];

const PADRAO = ['core', 'directives', 'dom', 'http', 'forms', 'ui', 'toast', 'store', 'storage', 'utils'];

function ajuda() {
  console.log(banner);
  console.log(`${c.bold}Commands${c.reset}

  ${c.roxo}voodoo init${c.reset} ${c.dim}[folder]${c.reset}      creates a new ready-to-run project
  ${c.roxo}voodoo build${c.reset}              builds a custom bundle
  ${c.roxo}voodoo add${c.reset} ${c.dim}<component>${c.reset}   copies a component to your project
  ${c.roxo}voodoo info${c.reset}               lists the modules and the size of each one

${c.bold}Build options${c.reset}

  ${c.dim}--modules=core,http,ui${c.reset}    chooses without asking anything
  ${c.dim}--all${c.reset}                     includes everything
  ${c.dim}--out=path.js${c.reset}             output file
  ${c.dim}--no-minify${c.reset}               keeps the code readable
  ${c.dim}--format=iife|esm${c.reset}         bundle format

${c.bold}Examples${c.reset}

  ${c.dim}npx voodoojs-cli init my-page${c.reset}
  ${c.dim}npx voodoojs-cli build --modules=core,directives,http,toast${c.reset}
  ${c.dim}npx voodoojs-cli add card${c.reset}
`);
}

/** Locates the voodoojs package folder, whether in the monorepo or in node_modules. */
async function acharFonte() {
  const candidatos = [
    resolve(packageRoot, '../voodoojs'),
    resolve(cwd(), 'node_modules/voodoojs'),
    resolve(cwd(), 'packages/voodoojs'),
  ];
  for (const caminho of candidatos) {
    if (existsSync(join(caminho, 'src', 'core.ts'))) return caminho;
    if (existsSync(join(caminho, 'dist', 'voodoo.min.js'))) return caminho;
  }
  return null;
}

async function comandoInfo() {
  console.log(banner);
  const fonte = await acharFonte();
  if (!fonte) {
    console.log(`${c.vermelho}I could not find the voodoojs package.${c.reset} Install with: npm i voodoojs`);
    return;
  }

  console.log(`${c.dim}Source: ${fonte}${c.reset}\n`);
  const linhas = [];

  for (const modulo of MODULES) {
    const caminho = join(fonte, 'src', modulo.entry);
    let tamanho = '';
    try {
      const info = await stat(caminho);
      tamanho = `${(info.size / 1024).toFixed(1)} KB`;
    } catch {
      tamanho = 'missing';
    }
    // These keys are user-facing: console.table draws them as the column
    // headings, so they are output, not identifiers.
    linhas.push({
      module: modulo.id,
      name: modulo.label,
      source: tamanho,
      default: PADRAO.includes(modulo.id) ? 'yes' : '',
    });
  }
  console.table(linhas);

  const bundle = join(fonte, 'dist', 'voodoo.min.js');
  if (existsSync(bundle)) {
    const conteudo = await readFile(bundle);
    console.log(
      `\n${c.bold}Complete bundle${c.reset}: ${(conteudo.length / 1024).toFixed(1)} KB, ` +
        `${c.verde}${(gzipSync(conteudo, { level: 9 }).length / 1024).toFixed(1)} KB gzip${c.reset}`
    );
  }
}

async function comandoBuild(flags) {
  console.log(banner);
  const fonte = await acharFonte();
  if (!fonte) {
    console.error(`${c.vermelho}I could not find the voodoojs package.${c.reset}`);
    exit(1);
  }

  let escolhidos;

  if (flags.all) {
    escolhidos = MODULES.map((m) => m.id);
  } else if (flags.modules) {
    escolhidos = String(flags.modules).split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    escolhidos = await perguntarModulos();
  }

  // Ensures the required ones.
  for (const modulo of MODULES) {
    if (modulo.required && !escolhidos.includes(modulo.id)) escolhidos.unshift(modulo.id);
  }

  const validos = escolhidos.filter((id) => MODULES.some((m) => m.id === id));
  const desconhecidos = escolhidos.filter((id) => !MODULES.some((m) => m.id === id));
  if (desconhecidos.length) {
    console.log(`${c.amarelo}Ignoring unknown module: ${desconhecidos.join(', ')}${c.reset}`);
  }

  console.log(`\n${c.bold}Included modules${c.reset}: ${validos.join(', ')}\n`);

  // Builds the temporary entry file.
  const linhas = [
    '/* File generated by "voodoo build". Do not edit by hand. */',
    "import { core } from './src/core';",
  ];
  const extras = [];

  for (const id of validos) {
    const modulo = MODULES.find((m) => m.id === id);
    if (!modulo || modulo.required) continue;
    const caminho = `./src/${modulo.entry.replace(/\.ts$/, '')}`;
    if (!existsSync(join(fonte, 'src', modulo.entry))) {
      console.log(`${c.amarelo}Module "${id}" does not exist in this version, skipping.${c.reset}`);
      continue;
    }
    if (modulo.entry.startsWith('directives/')) {
      linhas.push(`import '${caminho}';`);
    } else {
      const alias = `mod_${id}`;
      linhas.push(`import * as ${alias} from '${caminho}';`);
      extras.push(alias);
    }
  }

  linhas.push('');
  linhas.push(`const V = Object.assign(core, ${extras.length ? extras.join(', ') : '{}'});`);
  linhas.push('if (typeof window !== "undefined") {');
  linhas.push('  window.V = V; window.Voodoo = V;');
  linhas.push('  if (document.readyState === "loading") {');
  linhas.push('    document.addEventListener("DOMContentLoaded", () => V.start(), { once: true });');
  linhas.push('  } else { V.start(); }');
  linhas.push('}');
  linhas.push('export default V;');

  const entrada = join(fonte, '.voodoo-custom-entry.ts');
  await writeFile(entrada, linhas.join('\n'), 'utf8');

  const saida = resolve(cwd(), flags.out || 'voodoo.custom.min.js');
  const minify = flags['no-minify'] !== true;
  const format = flags.format || 'iife';

  try {
    const esbuild = await import('esbuild');
    const resultado = await esbuild.build({
      entryPoints: [entrada],
      bundle: true,
      minify,
      format,
      globalName: format === 'iife' ? 'Voodoo' : undefined,
      target: 'es2018',
      outfile: saida,
      sourcemap: true,
      legalComments: 'none',
      banner: {
        js: `/* Voodoo.js custom build: ${validos.join(', ')} */`,
      },
      metafile: true,
    });

    const conteudo = await readFile(saida);
    const gzip = gzipSync(conteudo, { level: 9 });

    console.log(`${c.verde}Done.${c.reset} ${saida}`);
    console.log(
      `  ${(conteudo.length / 1024).toFixed(1)} KB raw, ` +
        `${c.bold}${(gzip.length / 1024).toFixed(1)} KB gzip${c.reset}`
    );
    void resultado;
  } catch (erro) {
    console.error(`${c.vermelho}Build failed:${c.reset} ${erro.message}`);
    exit(1);
  } finally {
    await writeFile(entrada, '', 'utf8').catch(() => {});
  }
}

/** Interactive module selection menu. */
async function perguntarModulos() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log(`${c.bold}Choose the modules${c.reset} ${c.dim}(Enter accepts the default selection)${c.reset}\n`);
  MODULES.forEach((modulo, i) => {
    const marcado = PADRAO.includes(modulo.id) || modulo.required ? `${c.verde}[x]${c.reset}` : '[ ]';
    const trava = modulo.required ? `${c.dim} required${c.reset}` : '';
    console.log(
      `  ${String(i + 1).padStart(2)} ${marcado} ${c.bold}${modulo.label}${c.reset}${trava}\n` +
        `        ${c.dim}${modulo.descricao}${c.reset}`
    );
  });

  const resposta = await rl.question(
    `\n${c.roxo}Numbers separated by comma, "all", or Enter for the default:${c.reset} `
  );
  rl.close();

  const texto = resposta.trim().toLowerCase();
  if (!texto) return [...PADRAO];
  if (texto === 'tudo' || texto === 'all') return MODULES.map((m) => m.id);

  return texto
    .split(',')
    .map((parte) => Number(parte.trim()))
    .filter((n) => n >= 1 && n <= MODULES.length)
    .map((n) => MODULES[n - 1].id);
}

async function comandoInit(pasta) {
  console.log(banner);
  const destino = resolve(cwd(), pasta || 'my-voodoo-app');
  await mkdir(destino, { recursive: true });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My app with Voodoo.js</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer><\/script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
    button { font: inherit; padding: .5rem 1rem; border-radius: .5rem; border: 1px solid #ddd; cursor: pointer; }
  </style>
</head>
<body>

  <h1>Hello, Voodoo</h1>

  <div v-data="{ nome: '', count: 0 }">

    <input v-model="nome" placeholder="Write your name">
    <p>Hello, { nome || 'stranger' }!</p>

    <button @click="count--">less</button>
    <strong>{ count }</strong>
    <button @click="count++">more</button>

    <p v-show="count > 5">You clicked a lot.</p>

  </div>

</body>
</html>
`;

  await writeFile(join(destino, 'index.html'), html, 'utf8');
  await writeFile(
    join(destino, 'README.md'),
    `# My app with Voodoo.js\n\nOpen the \`index.html\` in the browser. No build needed, nothing to install.\n\nTo serve locally:\n\n\`\`\`bash\nnpx serve .\n\`\`\`\n`,
    'utf8'
  );

  console.log(`${c.verde}Project created in${c.reset} ${destino}`);
  console.log(`${c.dim}Open index.html in the browser. Nothing else is needed.${c.reset}`);
}

async function comandoAdd(nome) {
  console.log(banner);
  if (!nome) {
    console.log('Provide the component. Example: npx voodoojs-cli add card');
    return;
  }

  const fonte = await acharFonte();
  const pasta = fonte ? join(fonte, 'templates', 'components') : join(packageRoot, 'templates', 'components');

  if (!existsSync(pasta)) {
    console.log(`${c.amarelo}No components available in this installation.${c.reset}`);
    return;
  }

  const arquivos = await readdir(pasta);
  const alvo = arquivos.find((f) => f.replace(/\.html$/, '') === nome.toLowerCase());

  if (!alvo) {
    console.log(`${c.vermelho}Component "${nome}" not found.${c.reset}`);
    console.log(`Available: ${arquivos.map((f) => f.replace(/\.html$/, '')).join(', ')}`);
    return;
  }

  const conteudo = await readFile(join(pasta, alvo), 'utf8');
  const destino = resolve(cwd(), 'components');
  await mkdir(destino, { recursive: true });
  await writeFile(join(destino, alvo), conteudo, 'utf8');

  console.log(`${c.verde}Copied to${c.reset} components/${alvo}`);
  console.log(`${c.dim}The code is now yours. Edit freely.${c.reset}`);
}

// ---------------------------------------------------------------------------

const args = argv.slice(2);
const comando = args[0];
const flags = {};

for (const arg of args.slice(1)) {
  if (!arg.startsWith('--')) continue;
  const [chave, valor] = arg.slice(2).split('=');
  flags[chave] = valor === undefined ? true : valor;
}

switch (comando) {
  case 'build':
    await comandoBuild(flags);
    break;
  case 'init':
    await comandoInit(args[1]);
    break;
  case 'add':
    await comandoAdd(args[1]);
    break;
  case 'info':
    await comandoInfo();
    break;
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    ajuda();
    break;
  default:
    console.log(`${c.vermelho}Unknown command: ${comando}${c.reset}`);
    ajuda();
    exit(1);
}
