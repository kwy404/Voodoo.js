#!/usr/bin/env node
/**
 * Linha de comando da Voodoo.js.
 *
 *   npx voodoo init          cria um projeto novo pronto para usar
 *   npx voodoo build         monta um bundle so com os modulos que voce escolher
 *   npx voodoo add <nome>    copia um componente para dentro do seu projeto
 *   npx voodoo info          mostra o que esta instalado e o tamanho de cada modulo
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

// Cores no terminal, sem dependencia.
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
 * Modulos que podem entrar em um build sob medida.
 * `required` marca o que nunca sai, porque o resto depende dele.
 */
const MODULES = [
  { id: 'core', label: 'Core e reatividade', entry: 'core.ts', required: true, descricao: 'Proxy reativo, efeitos, escopo e walker' },
  { id: 'directives', label: 'Directives essenciais', entry: 'directives/core.ts', required: true, descricao: 'v-text, v-if, v-for, v-model, v-on, v-bind' },
  { id: 'dom', label: 'DOM encadeavel', entry: 'dom/query.ts', descricao: 'V("#app").find(".item").addClass("ativo")' },
  { id: 'http', label: 'HTTP', entry: 'directives/http.ts', descricao: 'v-get, v-post, v-resource, cliente http' },
  { id: 'forms', label: 'Formularios e validacao', entry: 'directives/forms.ts', descricao: 'v-submit, v-validate, mascaras' },
  { id: 'ui', label: 'Interface', entry: 'directives/ui.ts', descricao: 'modal, abas, dropdown, tooltip, drawer' },
  { id: 'components', label: 'Componentes prontos', entry: 'ui/components.ts', descricao: 'VButton, VCard, VInput, VSelect' },
  { id: 'toast', label: 'Notificacoes', entry: 'ui/toast.ts', descricao: 'V.toast.success e amigos' },
  { id: 'motion', label: 'Animacoes', entry: 'motion/index.ts', descricao: 'v-motion, molas, stagger, scroll' },
  { id: 'charts', label: 'Graficos', entry: 'charts/index.ts', descricao: 'v-chart em SVG puro' },
  { id: 'state', label: 'Estado avancado', entry: 'directives/state.ts', descricao: 'v-persist, v-sync entre abas, desfazer' },
  { id: 'store', label: 'Stores globais', entry: 'store/index.ts', descricao: '$store e estado compartilhado' },
  { id: 'storage', label: 'Armazenamento', entry: 'storage/index.ts', descricao: 'localStorage, cookie, url, cache, tema' },
  { id: 'router', label: 'Roteador', entry: 'router/index.ts', descricao: 'rotas no navegador, v-link, v-router-view' },
  { id: 'i18n', label: 'Idiomas', entry: 'i18n/index.ts', descricao: 'traducoes com v-t e $t' },
  { id: 'devtools', label: 'Inspetor xray', entry: 'devtools/xray.ts', descricao: 'raio-x da reatividade na propria pagina' },
  { id: 'utils', label: 'Utilitarios', entry: 'utils/index.ts', descricao: 'debounce, formatadores, datas, moeda' },
];

const PADRAO = ['core', 'directives', 'dom', 'http', 'forms', 'ui', 'toast', 'store', 'storage', 'utils'];

function ajuda() {
  console.log(banner);
  console.log(`${c.bold}Comandos${c.reset}

  ${c.roxo}voodoo init${c.reset} ${c.dim}[pasta]${c.reset}      cria um projeto novo pronto para rodar
  ${c.roxo}voodoo build${c.reset}              monta um bundle sob medida
  ${c.roxo}voodoo add${c.reset} ${c.dim}<componente>${c.reset}   copia um componente para o seu projeto
  ${c.roxo}voodoo info${c.reset}               lista os modulos e o tamanho de cada um

${c.bold}Opcoes do build${c.reset}

  ${c.dim}--modules=core,http,ui${c.reset}    escolhe sem perguntar nada
  ${c.dim}--all${c.reset}                     inclui tudo
  ${c.dim}--out=caminho.js${c.reset}          arquivo de saida
  ${c.dim}--no-minify${c.reset}               mantem o codigo legivel
  ${c.dim}--format=iife|esm${c.reset}         formato do bundle

${c.bold}Exemplos${c.reset}

  ${c.dim}npx voodoo init minha-pagina${c.reset}
  ${c.dim}npx voodoo build --modules=core,directives,http,toast${c.reset}
  ${c.dim}npx voodoo add card${c.reset}
`);
}

/** Localiza a pasta do pacote voodoojs, seja no monorepo ou em node_modules. */
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
    console.log(`${c.vermelho}Nao encontrei o pacote voodoojs.${c.reset} Instale com: npm i voodoojs`);
    return;
  }

  console.log(`${c.dim}Fonte: ${fonte}${c.reset}\n`);
  const linhas = [];

  for (const modulo of MODULES) {
    const caminho = join(fonte, 'src', modulo.entry);
    let tamanho = '';
    try {
      const info = await stat(caminho);
      tamanho = `${(info.size / 1024).toFixed(1)} KB`;
    } catch {
      tamanho = 'ausente';
    }
    linhas.push({
      modulo: modulo.id,
      nome: modulo.label,
      fonte: tamanho,
      padrao: PADRAO.includes(modulo.id) ? 'sim' : '',
    });
  }
  console.table(linhas);

  const bundle = join(fonte, 'dist', 'voodoo.min.js');
  if (existsSync(bundle)) {
    const conteudo = await readFile(bundle);
    console.log(
      `\n${c.bold}Bundle completo${c.reset}: ${(conteudo.length / 1024).toFixed(1)} KB, ` +
        `${c.verde}${(gzipSync(conteudo, { level: 9 }).length / 1024).toFixed(1)} KB gzip${c.reset}`
    );
  }
}

async function comandoBuild(flags) {
  console.log(banner);
  const fonte = await acharFonte();
  if (!fonte) {
    console.error(`${c.vermelho}Nao encontrei o pacote voodoojs.${c.reset}`);
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

  // Garante os obrigatorios.
  for (const modulo of MODULES) {
    if (modulo.required && !escolhidos.includes(modulo.id)) escolhidos.unshift(modulo.id);
  }

  const validos = escolhidos.filter((id) => MODULES.some((m) => m.id === id));
  const desconhecidos = escolhidos.filter((id) => !MODULES.some((m) => m.id === id));
  if (desconhecidos.length) {
    console.log(`${c.amarelo}Ignorando modulo desconhecido: ${desconhecidos.join(', ')}${c.reset}`);
  }

  console.log(`\n${c.bold}Modulos incluidos${c.reset}: ${validos.join(', ')}\n`);

  // Monta o arquivo de entrada temporario.
  const linhas = [
    '/* Arquivo gerado por "voodoo build". Nao edite a mao. */',
    "import { core } from './src/core';",
  ];
  const extras = [];

  for (const id of validos) {
    const modulo = MODULES.find((m) => m.id === id);
    if (!modulo || modulo.required) continue;
    const caminho = `./src/${modulo.entry.replace(/\.ts$/, '')}`;
    if (!existsSync(join(fonte, 'src', modulo.entry))) {
      console.log(`${c.amarelo}Modulo "${id}" nao existe nesta versao, pulando.${c.reset}`);
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
        js: `/* Voodoo.js build sob medida: ${validos.join(', ')} */`,
      },
      metafile: true,
    });

    const conteudo = await readFile(saida);
    const gzip = gzipSync(conteudo, { level: 9 });

    console.log(`${c.verde}Pronto.${c.reset} ${saida}`);
    console.log(
      `  ${(conteudo.length / 1024).toFixed(1)} KB cru, ` +
        `${c.bold}${(gzip.length / 1024).toFixed(1)} KB gzip${c.reset}`
    );
    void resultado;
  } catch (erro) {
    console.error(`${c.vermelho}Falha no build:${c.reset} ${erro.message}`);
    exit(1);
  } finally {
    await writeFile(entrada, '', 'utf8').catch(() => {});
  }
}

/** Menu interativo de selecao de modulos. */
async function perguntarModulos() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log(`${c.bold}Escolha os modulos${c.reset} ${c.dim}(Enter aceita a selecao padrao)${c.reset}\n`);
  MODULES.forEach((modulo, i) => {
    const marcado = PADRAO.includes(modulo.id) || modulo.required ? `${c.verde}[x]${c.reset}` : '[ ]';
    const trava = modulo.required ? `${c.dim} obrigatorio${c.reset}` : '';
    console.log(
      `  ${String(i + 1).padStart(2)} ${marcado} ${c.bold}${modulo.label}${c.reset}${trava}\n` +
        `        ${c.dim}${modulo.descricao}${c.reset}`
    );
  });

  const resposta = await rl.question(
    `\n${c.roxo}Numeros separados por virgula, "tudo", ou Enter para o padrao:${c.reset} `
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
  const destino = resolve(cwd(), pasta || 'meu-app-voodoo');
  await mkdir(destino, { recursive: true });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meu app com Voodoo.js</title>
  <script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer><\/script>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
    button { font: inherit; padding: .5rem 1rem; border-radius: .5rem; border: 1px solid #ddd; cursor: pointer; }
  </style>
</head>
<body>

  <h1>Ola, Voodoo</h1>

  <div v-data="{ nome: '', count: 0 }">

    <input v-model="nome" placeholder="Escreva seu nome">
    <p>Ola, { nome || 'estranho' }!</p>

    <button @click="count--">menos</button>
    <strong>{ count }</strong>
    <button @click="count++">mais</button>

    <p v-show="count > 5">Voce clicou bastante.</p>

  </div>

</body>
</html>
`;

  await writeFile(join(destino, 'index.html'), html, 'utf8');
  await writeFile(
    join(destino, 'README.md'),
    `# Meu app com Voodoo.js\n\nAbra o \`index.html\` no navegador. Nao precisa de build, nao precisa instalar nada.\n\nPara servir localmente:\n\n\`\`\`bash\nnpx serve .\n\`\`\`\n`,
    'utf8'
  );

  console.log(`${c.verde}Projeto criado em${c.reset} ${destino}`);
  console.log(`${c.dim}Abra o index.html no navegador. Nao precisa de mais nada.${c.reset}`);
}

async function comandoAdd(nome) {
  console.log(banner);
  if (!nome) {
    console.log('Informe o componente. Exemplo: npx voodoo add card');
    return;
  }

  const fonte = await acharFonte();
  const pasta = fonte ? join(fonte, 'templates', 'components') : join(packageRoot, 'templates', 'components');

  if (!existsSync(pasta)) {
    console.log(`${c.amarelo}Nenhum componente disponivel nesta instalacao.${c.reset}`);
    return;
  }

  const arquivos = await readdir(pasta);
  const alvo = arquivos.find((f) => f.replace(/\.html$/, '') === nome.toLowerCase());

  if (!alvo) {
    console.log(`${c.vermelho}Componente "${nome}" nao encontrado.${c.reset}`);
    console.log(`Disponiveis: ${arquivos.map((f) => f.replace(/\.html$/, '')).join(', ')}`);
    return;
  }

  const conteudo = await readFile(join(pasta, alvo), 'utf8');
  const destino = resolve(cwd(), 'components');
  await mkdir(destino, { recursive: true });
  await writeFile(join(destino, alvo), conteudo, 'utf8');

  console.log(`${c.verde}Copiado para${c.reset} components/${alvo}`);
  console.log(`${c.dim}O codigo agora e seu. Edite a vontade.${c.reset}`);
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
    console.log(`${c.vermelho}Comando desconhecido: ${comando}${c.reset}`);
    ajuda();
    exit(1);
}
