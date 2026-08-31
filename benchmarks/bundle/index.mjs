/**
 * @module benchmarks/bundle
 *
 * Analise dos artefatos reais de `packages/voodoojs/dist`.
 *
 * Tres coisas:
 *   1. Tamanho por build: cru, gzip e brotli. Sem estimativa: os arquivos sao
 *      lidos do disco e comprimidos de verdade com o `zlib` do Node.
 *   2. Composicao por modulo, atribuida pelos sourcemaps `.map` que o tsup ja
 *      gera. Cada byte de saida e creditado ao arquivo de origem que o produziu.
 *   3. Tree-shaking: um app ESM que importa apenas `reactive` e `effect` e
 *      empacotado com o esbuild, e o resultado e inspecionado para ver se
 *      charts, router, ui e motion ficaram de fora.
 *
 * Rode `npm run build` antes: sem `dist` este modulo nao inventa numeros, ele
 * avisa que nao ha o que medir.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { distRoot, buildDir, repoRoot } from '../harness/paths.mjs';

const gzip = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const brotli = (buf) =>
  zlib.brotliCompressSync(buf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;

const kb = (n) => (n / 1024).toFixed(1);

/** Builds de navegador, na ordem em que interessam a quem escolhe um CDN. */
const BROWSER_BUILDS = [
  'voodoo.core.js',
  'voodoo.core.min.js',
  'voodoo.js',
  'voodoo.min.js',
  'voodoo.full.js',
  'voodoo.full.min.js',
];

const MODULE_BUILDS = [
  'index.js', 'index.cjs',
  'essential.js', 'essential.cjs',
  'reactivity.js', 'reactivity.cjs',
  'http.js', 'http.cjs',
  'utils.js', 'utils.cjs',
];

/** Agrupa um caminho de origem no modulo logico a que ele pertence. */
function moduleOf(source) {
  const norm = source.replace(/\\/g, '/');
  const m = norm.match(/src\/([^/]+)/);
  if (!m) return norm.includes('node_modules') ? 'node_modules' : 'outros';
  const dir = m[1];
  // Arquivos soltos na raiz de src sao pontos de entrada e cola.
  if (dir.endsWith('.ts')) return 'entradas (src/*.ts)';
  return dir;
}

/**
 * Atribui bytes de saida a arquivos de origem usando o sourcemap.
 *
 * O mapeamento e por segmento de VLQ: cada segmento diz "a partir desta coluna
 * da saida, o codigo veio deste arquivo". A largura de um segmento ate o
 * proximo e creditada ao arquivo dele. E uma aproximacao — segmentos nao cobrem
 * cada byte — mas e a mesma aproximacao que ferramentas como o
 * `source-map-explorer` usam, e o relatorio diz que e aproximada.
 */
function composition(jsFile) {
  const mapFile = jsFile + '.map';
  if (!fs.existsSync(mapFile)) return null;

  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const sources = map.sources ?? [];
  const linhas = fs.readFileSync(jsFile, 'utf8').split('\n');
  const porFonte = new Map();

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const decodeVLQ = (str) => {
    const out = [];
    let shift = 0;
    let value = 0;
    for (const ch of str) {
      const digit = B64.indexOf(ch);
      if (digit === -1) continue;
      const cont = digit & 32;
      value += (digit & 31) << shift;
      if (cont) {
        shift += 5;
      } else {
        const neg = value & 1;
        value >>= 1;
        out.push(neg ? -value : value);
        value = 0;
        shift = 0;
      }
    }
    return out;
  };

  let sourceIndex = 0;
  const grupos = (map.mappings ?? '').split(';');

  for (let linha = 0; linha < grupos.length; linha++) {
    const segmentos = grupos[linha].split(',').filter(Boolean);
    let colunaSaida = 0;
    const larguraLinha = (linhas[linha] ?? '').length;
    const pontos = [];

    for (const seg of segmentos) {
      const campos = decodeVLQ(seg);
      if (!campos.length) continue;
      colunaSaida += campos[0];
      if (campos.length >= 4) sourceIndex += campos[1];
      pontos.push({ coluna: colunaSaida, fonte: sources[sourceIndex] });
    }

    for (let i = 0; i < pontos.length; i++) {
      const inicio = pontos[i].coluna;
      const fim = i + 1 < pontos.length ? pontos[i + 1].coluna : larguraLinha;
      const bytes = Math.max(0, fim - inicio);
      const fonte = pontos[i].fonte;
      if (!fonte) continue;
      porFonte.set(fonte, (porFonte.get(fonte) ?? 0) + bytes);
    }
  }

  const porModulo = new Map();
  for (const [fonte, bytes] of porFonte) {
    const mod = moduleOf(fonte);
    porModulo.set(mod, (porModulo.get(mod) ?? 0) + bytes);
  }

  const total = [...porModulo.values()].reduce((a, b) => a + b, 0);
  const linhasOrdenadas = [...porModulo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mod, bytes]) => ({ module: mod, bytes, pct: total ? (bytes / total) * 100 : 0 }));

  return { total, modules: linhasOrdenadas, mappedSources: porFonte.size };
}

/**
 * Marcas escolhidas por serem cadeias literais exclusivas de cada modulo.
 * Cadeias sobrevivem a minificacao; nomes de funcao nao sobrevivem, entao a
 * busca so usa nomes quando eles aparecem tambem como chave de objeto exportada.
 */
const MARCAS = [
  { module: 'charts', needles: ['sparkline', 'donut', 'polyline'] },
  { module: 'router', needles: ['popstate', 'hashchange', 'pushState'] },
  { module: 'ui (toast/modal/dialog)', needles: ['voodoo-toast', 'aria-modal', 'showModal'] },
  { module: 'motion', needles: ['cubic-bezier', 'transitionend', 'animationend'] },
  { module: 'http', needles: ['XMLHttpRequest', 'application/json'] },
  { module: 'directives', needles: ['v-cloak', 'else-if', 'prevent'] },
  { module: 'parser', needles: ['Token inesperado', 'Chave de objeto invalida'] },
  { module: 'i18n', needles: ['Intl.NumberFormat', 'pluralRules'] },
  { module: 'forms/validation', needles: ['minlength', 'obrigatorio'] },
  { module: 'devtools', needles: ['xray', 'data-voodoo-inspect'] },
];

/**
 * Empacota uma fixture ESM e reporta quais modulos sobreviveram.
 *
 * Duas fixtures importam. A do ponto de entrada principal (`voodoojs`) e a que
 * responde a pergunta que interessa: quem escreve `import { reactive } from
 * "voodoojs"` leva os graficos junto? A do subcaminho (`voodoojs/reactivity`)
 * mede o piso: o menor bundle possivel.
 */
async function shakeFixture(esbuild, nome, codigoFonte) {
  const entry = path.join(buildDir, `treeshake-${nome}.mjs`);
  const out = path.join(buildDir, `treeshake-${nome}.out.js`);
  fs.mkdirSync(buildDir, { recursive: true });
  fs.writeFileSync(entry, codigoFonte, 'utf8');

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    treeShaking: true,
    outfile: out,
    logLevel: 'silent',
    absWorkingDir: repoRoot,
  });

  const code = fs.readFileSync(out, 'utf8');
  const buf = Buffer.from(code);
  const presentes = MARCAS.map(({ module, needles }) => ({
    module,
    found: needles.filter((nd) => code.includes(nd)),
  }));

  return {
    fixture: nome,
    bytes: buf.length,
    gzip: gzip(buf),
    brotli: brotli(buf),
    modules: presentes,
    excluded: presentes.filter((p) => p.found.length === 0).map((p) => p.module),
    included: presentes.filter((p) => p.found.length > 0).map((p) => p.module),
  };
}

/**
 * Teste de tree-shaking real. Importa apenas `reactive` + `effect` e verifica
 * se charts, router, ui e motion ficaram DE FORA do bundle.
 */
async function treeShaking() {
  const esbuild = await import('esbuild');

  if (!fs.existsSync(path.join(distRoot, 'index.js'))) {
    return { ran: false, reason: '`dist/index.js` nao existe — rode `npm run build` primeiro' };
  }

  const corpo = [
    'const s = reactive({ n: 0 });',
    'let visto = 0;',
    'effect(() => { visto = s.n; });',
    's.n = 42;',
    '// globalThis impede que o proprio esbuild descarte tudo como codigo morto.',
    'globalThis.__resultado = visto;',
  ].join('\n');

  const fixtures = [];
  try {
    fixtures.push(
      await shakeFixture(esbuild, 'main-entry', `import { reactive, effect } from 'voodoojs';\n${corpo}`)
    );
  } catch (err) {
    fixtures.push({ fixture: 'main-entry', error: err?.message ?? String(err) });
  }
  try {
    fixtures.push(
      await shakeFixture(esbuild, 'subpath', `import { reactive, effect } from 'voodoojs/reactivity';\n${corpo}`)
    );
  } catch (err) {
    fixtures.push({ fixture: 'subpath', error: err?.message ?? String(err) });
  }

  return { ran: true, fixtures };
}

/** Executa a analise e devolve os dados + o markdown pronto. */
export async function analyzeBundle() {
  if (!fs.existsSync(distRoot)) {
    return {
      ran: false,
      markdown:
        '**NOT RUN** — `packages/voodoojs/dist` does not exist. Run `npm run build` first.\n\n' +
        'No sizes are reported here rather than estimated.',
    };
  }

  const medir = (nome) => {
    const file = path.join(distRoot, nome);
    if (!fs.existsSync(file)) return null;
    const buf = fs.readFileSync(file);
    return { name: nome, raw: buf.length, gzip: gzip(buf), brotli: brotli(buf), file };
  };

  const browser = BROWSER_BUILDS.map(medir).filter(Boolean);
  const modules = MODULE_BUILDS.map(medir).filter(Boolean);
  const faltando = [...BROWSER_BUILDS, ...MODULE_BUILDS].filter(
    (n) => !fs.existsSync(path.join(distRoot, n))
  );

  const alvo = browser.find((b) => b.name === 'voodoo.full.js') ?? browser[0];
  const comp = alvo ? composition(alvo.file) : null;

  const shake = await treeShaking();

  // --- markdown ---
  const md = [];
  md.push('### Build sizes (real files from `packages/voodoojs/dist`)');
  md.push('');
  md.push('| Build | raw | gzip | brotli |');
  md.push('| --- | ---: | ---: | ---: |');
  for (const b of browser) {
    md.push(`| \`${b.name}\` | ${kb(b.raw)} KB | **${kb(b.gzip)} KB** | ${kb(b.brotli)} KB |`);
  }
  md.push('');
  md.push('ESM / CJS entry points for bundlers:');
  md.push('');
  md.push('| Build | raw | gzip | brotli |');
  md.push('| --- | ---: | ---: | ---: |');
  for (const b of modules) {
    md.push(`| \`${b.name}\` | ${kb(b.raw)} KB | ${kb(b.gzip)} KB | ${kb(b.brotli)} KB |`);
  }
  if (faltando.length) {
    md.push('');
    md.push(`Missing from \`dist\` (not measured): ${faltando.map((f) => `\`${f}\``).join(', ')}`);
  }
  md.push('');

  md.push('### Composition by module');
  md.push('');
  if (!comp) {
    md.push('**NOT MEASURED** — no sourcemap next to the analysed build.');
  } else {
    md.push(
      `Attribution of \`${alvo.name}\` (${kb(alvo.raw)} KB raw) to source modules, via its ` +
        `\`.js.map\` sourcemap, across ${comp.mappedSources} mapped source files. Segment-width ` +
        'attribution: approximate, and stated as such.'
    );
    md.push('');
    md.push('| Module | bytes | share |');
    md.push('| --- | ---: | ---: |');
    for (const m of comp.modules) {
      md.push(`| \`${m.module}\` | ${kb(m.bytes)} KB | ${m.pct.toFixed(1)}% |`);
    }
  }
  md.push('');

  md.push('### Tree-shaking test');
  md.push('');
  if (!shake.ran) {
    md.push(`**NOT RUN** — ${shake.reason}`);
  } else {
    md.push(
      'Fixture: an ESM app that imports only `reactive` and `effect`, bundled and minified with ' +
        'the esbuild already in `node_modules`. Two import styles are tested, because they answer ' +
        'different questions.'
    );
    md.push('');
    md.push('| Fixture | import | raw | gzip | brotli |');
    md.push('| --- | --- | ---: | ---: | ---: |');
    for (const f of shake.fixtures) {
      if (f.error) {
        md.push(`| \`${f.fixture}\` | — | **FAILED** | — | — |`);
        continue;
      }
      const imp = f.fixture === 'main-entry' ? "`from 'voodoojs'`" : "`from 'voodoojs/reactivity'`";
      md.push(`| \`${f.fixture}\` | ${imp} | ${kb(f.bytes)} KB | **${kb(f.gzip)} KB** | ${kb(f.brotli)} KB |`);
    }
    md.push('');
    for (const f of shake.fixtures) {
      if (f.error) {
        md.push(`**\`${f.fixture}\` failed to bundle:** ${f.error}`);
        md.push('');
        continue;
      }
      md.push(`Modules surviving in \`${f.fixture}\`:`);
      md.push('');
      md.push('| Module | in bundle? | evidence |');
      md.push('| --- | :---: | --- |');
      for (const m of f.modules) {
        md.push(
          `| \`${m.module}\` | ${m.found.length ? '**YES**' : 'no'} | ` +
            `${m.found.length ? m.found.map((x) => `\`${x}\``).join(', ') : 'no marker string found'} |`
        );
      }
      md.push('');
      md.push(`Shaken out: ${f.excluded.length ? f.excluded.map((m) => `\`${m}\``).join(', ') : '**nothing**'}.`);
      md.push(`Still present: ${f.included.length ? f.included.map((m) => `\`${m}\``).join(', ') : 'nothing'}.`);
      md.push('');
    }
  }

  return { ran: true, browser, modules, missing: faltando, composition: comp, treeShaking: shake, markdown: md.join('\n') };
}
