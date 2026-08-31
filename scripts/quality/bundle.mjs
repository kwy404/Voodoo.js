/**
 * Bundle: o que o usuario final realmente baixa.
 *
 * Sete verificacoes sobre `dist/` e sobre os metadados de publicacao:
 *
 *   1. orcamento de tamanho, com o MESMO budget declarado em scripts/size.mjs
 *      (lido de la, nao copiado, para os dois nao divergirem em silencio);
 *   2. cada caminho de `exports`/`main`/`module`/`types`/`unpkg` existe em dist;
 *   3. todo `.js`/`.cjs` tem sourcemap parseavel e com `sourcesContent`;
 *   4. `npm pack --dry-run --json`: o que entra no tarball;
 *   5. `sideEffects`: cada glob declarado casa com algum arquivo real;
 *   6. duplicacao de codigo entre as saidas modulares que deveriam
 *      compartilhar chunks;
 *   7. o footer que publica `window.V` continua nos builds de CDN.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

import {
  DIST_DIR,
  PKG_DIR,
  ROOT,
  STATUS,
  fail,
  kb,
  note,
  read,
  readJson,
  rel,
  run as runCommand,
  sizesOf,
  walkFiles,
  warn,
} from './lib.mjs';

export const meta = { label: 'Bundle' };

const SIZE_SCRIPT = join(ROOT, 'scripts', 'size.mjs');

/** Le o orcamento declarado em scripts/size.mjs sem importar (nem editar) o arquivo. */
function readBudget() {
  const source = read(SIZE_SCRIPT);
  if (!source) return { budget: null, source: null };
  const match = source.match(/const\s+BUDGET\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return { budget: null, source: rel(SIZE_SCRIPT) };
  try {
    // O literal so contem chaves em aspas e numeros; JSON depois de normalizar.
    const json = match[1]
      .replace(/'/g, '"')
      .replace(/,(\s*})/g, '$1')
      .replace(/([{,]\s*)([A-Za-z_$][\w$.]*)(\s*:)/g, '$1"$2"$3');
    return { budget: JSON.parse(json), source: rel(SIZE_SCRIPT) };
  } catch {
    return { budget: null, source: rel(SIZE_SCRIPT) };
  }
}

// ---------------------------------------------------------------------------
// 1. Tamanho
// ---------------------------------------------------------------------------

function checkSizes(findings) {
  const { budget, source } = readBudget();
  const files = walkFiles(DIST_DIR, {
    filter: (f) => (f.endsWith('.js') || f.endsWith('.cjs')) && !f.endsWith('.map'),
  });

  const rows = [];
  for (const file of files) {
    const buffer = readFileSync(file);
    const sizes = sizesOf(buffer);
    const name = basename(file);
    const limit = budget?.[name];
    const over = limit != null && kb(sizes.gzip) > limit;
    rows.push({
      file: name,
      rawKb: kb(sizes.raw),
      gzipKb: kb(sizes.gzip),
      brotliKb: kb(sizes.brotli),
      budgetKb: limit ?? null,
      status: limit == null ? 'sem meta' : over ? 'ESTOUROU' : 'ok',
    });
    if (over) {
      findings.push(
        fail(`Bundle acima da meta de tamanho: ${name}`, {
          file: rel(file),
          expected: `<= ${limit} KB gzip (meta declarada em ${source})`,
          actual: `${kb(sizes.gzip)} KB gzip`,
        })
      );
    }
  }

  if (!budget) {
    findings.push(
      warn('Nao foi possivel ler o orcamento de tamanho de scripts/size.mjs', {
        file: source ?? 'scripts/size.mjs',
        expected: 'const BUDGET = { ... } parseavel',
        actual: 'nao encontrado; nenhum arquivo foi comparado a uma meta',
      })
    );
  }

  return { budgetSource: source, budget, rows };
}

// ---------------------------------------------------------------------------
// 2. exports / main / module / types
// ---------------------------------------------------------------------------

function collectDeclaredPaths(pkg) {
  const out = [];
  for (const field of ['main', 'module', 'types', 'unpkg', 'jsdelivr', 'browser']) {
    if (typeof pkg[field] === 'string') out.push({ where: field, path: pkg[field] });
  }
  const walkExports = (node, prefix) => {
    if (typeof node === 'string') {
      out.push({ where: `exports${prefix}`, path: node });
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      walkExports(value, `${prefix}["${key}"]`);
    }
  };
  walkExports(pkg.exports, '');
  return out;
}

function checkExports(pkg, findings) {
  const declared = collectDeclaredPaths(pkg);
  const checked = [];

  for (const entry of declared) {
    if (entry.path.includes('*')) {
      // Caminho com curinga: verifica so que o diretorio de destino existe.
      const dir = join(PKG_DIR, dirname(entry.path.replace(/\/\*.*$/, '/x')));
      const ok = existsSync(dir);
      checked.push({ ...entry, wildcard: true, exists: ok });
      if (!ok) {
        findings.push(
          fail(`Caminho curinga de exports aponta para diretorio inexistente`, {
            file: 'packages/voodoojs/package.json',
            expected: `${entry.where} -> diretorio existente para ${entry.path}`,
            actual: `${rel(dir)} nao existe`,
          })
        );
      }
      continue;
    }

    const target = join(PKG_DIR, entry.path);
    const ok = existsSync(target);
    checked.push({ ...entry, wildcard: false, exists: ok });
    if (!ok) {
      findings.push(
        fail(`Caminho declarado no package.json nao existe apos o build`, {
          file: 'packages/voodoojs/package.json',
          expected: `${entry.where} = "${entry.path}" apontando para arquivo existente`,
          actual: `${rel(target)} nao encontrado`,
        })
      );
    }
  }

  return checked;
}

// ---------------------------------------------------------------------------
// 3. Sourcemaps
// ---------------------------------------------------------------------------

function checkSourcemaps(findings) {
  const files = walkFiles(DIST_DIR, {
    filter: (f) => (f.endsWith('.js') || f.endsWith('.cjs')) && !f.endsWith('.map'),
  });

  const rows = [];
  const duplicatedUrl = [];

  for (const file of files) {
    const source = read(file) ?? '';
    const urlComments = [...source.matchAll(/\/\/#\s*sourceMappingURL=(\S+)/g)];
    const declared = urlComments[0] ?? null;
    const mapFile = declared ? join(dirname(file), declared[1]) : `${file}.map`;

    if (!declared) {
      findings.push(
        warn('Bundle sem comentario sourceMappingURL', {
          file: rel(file),
          expected: '//# sourceMappingURL=... no fim do arquivo',
          actual: 'ausente',
        })
      );
    } else if (urlComments.length > 1) {
      duplicatedUrl.push(basename(file));
    }

    if (!existsSync(mapFile)) {
      findings.push(
        fail('Sourcemap ausente', {
          file: rel(file),
          expected: `${basename(mapFile)} ao lado do bundle`,
          actual: 'arquivo nao encontrado',
        })
      );
      rows.push({ file: basename(file), map: null, ok: false });
      continue;
    }

    const map = readJson(mapFile);
    if (!map) {
      findings.push(
        fail('Sourcemap ilegivel', {
          file: rel(mapFile),
          expected: 'json valido',
          actual: 'nao pode ser parseado',
        })
      );
      rows.push({ file: basename(file), map: basename(mapFile), ok: false });
      continue;
    }

    const sources = map.sources ?? [];
    const contents = map.sourcesContent ?? [];
    const missingContent = sources.length > 0 && contents.filter((c) => c != null).length === 0;
    const partialContent =
      sources.length > 0 && contents.length > 0 && contents.length !== sources.length;

    if (missingContent) {
      findings.push(
        fail('Sourcemap sem sourcesContent: o passo a passo no navegador nao mostra o fonte', {
          file: rel(mapFile),
          expected: `sourcesContent com ${sources.length} entradas`,
          actual: 'sourcesContent vazio ou ausente',
        })
      );
    } else if (partialContent) {
      findings.push(
        warn('Sourcemap com sourcesContent incompleto', {
          file: rel(mapFile),
          expected: `${sources.length} entradas em sourcesContent`,
          actual: `${contents.length} entradas`,
        })
      );
    }

    // `mappings` vazio so e defeito quando ha fonte para mapear. Um barril de
    // reexportacao (`export { x } from './chunk-Y.js'`) nao tem codigo proprio:
    // o esbuild emite sources: [] e mappings: "" e esta certo.
    const isBarrel = sources.length === 0;
    if (!map.mappings && !isBarrel) {
      findings.push(
        fail('Sourcemap sem mappings', {
          file: rel(mapFile),
          expected: `campo mappings preenchido para ${sources.length} fontes`,
          actual: 'vazio: o depurador nao consegue voltar do bundle para o fonte',
        })
      );
    }

    rows.push({
      file: basename(file),
      map: basename(mapFile),
      sources: sources.length,
      sourcesContent: contents.length,
      barrel: isBarrel,
      ok: !missingContent && (isBarrel || Boolean(map.mappings)),
    });
  }

  // Um aviso so: e um unico defeito do build repetido em N arquivos, nao N
  // problemas independentes.
  if (duplicatedUrl.length) {
    findings.push(
      warn(`${duplicatedUrl.length} bundles com o comentario sourceMappingURL duplicado`, {
        file: `packages/voodoojs/dist/${duplicatedUrl[0]}`,
        expected: 'um unico //# sourceMappingURL por arquivo',
        actual:
          `a linha aparece duas vezes em: ${duplicatedUrl.join(', ')}. ` +
          'Inofensivo para o depurador (ele usa a ultima), mas indica que o passo de emissao ' +
          'do sourcemap roda duas vezes na configuracao do tsup.',
      })
    );
  }

  return { rows, duplicatedUrl };
}

// ---------------------------------------------------------------------------
// 4. npm pack
// ---------------------------------------------------------------------------

/** Arquivos que o tarball tem obrigatoriamente que conter. */
const MUST_SHIP = ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/voodoo.min.js'];
/** Padroes que nunca deveriam ser publicados. */
const MUST_NOT_SHIP = [/^src\//, /^test\//, /^tsconfig/, /^tsup\.config/, /\.tsbuildinfo$/];

function checkPack(pkg, findings) {
  const result = runCommand('npm', ['pack', '--dry-run', '--json'], { cwd: PKG_DIR, timeout: 180000 });
  const start = result.stdout.indexOf('[');
  let data = null;
  if (start >= 0) {
    try {
      data = JSON.parse(result.stdout.slice(start));
    } catch {
      data = null;
    }
  }

  if (!Array.isArray(data) || !data[0]) {
    findings.push(
      warn('npm pack --dry-run nao produziu json legivel', {
        file: 'packages/voodoojs/package.json',
        expected: 'lista de arquivos do tarball',
        actual: `exit ${result.code}: ${(result.stderr || result.stdout).trim().slice(0, 300)}`,
      })
    );
    return null;
  }

  const info = data[0];
  const paths = (info.files ?? []).map((f) => f.path.replace(/\\/g, '/'));

  for (const required of MUST_SHIP) {
    if (!paths.includes(required)) {
      findings.push(
        fail('Arquivo essencial fora do tarball publicado', {
          file: 'packages/voodoojs/package.json',
          expected: `${required} presente no npm pack`,
          actual: 'ausente',
        })
      );
    }
  }

  for (const path of paths) {
    for (const forbidden of MUST_NOT_SHIP) {
      if (forbidden.test(path)) {
        findings.push(
          warn('Arquivo de desenvolvimento no tarball publicado', {
            file: `packages/voodoojs/${path}`,
            expected: `nada casando com ${forbidden} em files`,
            actual: `${path} sera publicado`,
          })
        );
      }
    }
  }

  // `files` promete arquivos que precisam existir de fato.
  for (const entry of pkg.files ?? []) {
    const target = join(PKG_DIR, entry);
    if (existsSync(target)) continue;
    findings.push(
      warn(`"files" declara "${entry}", que nao existe no pacote`, {
        file: 'packages/voodoojs/package.json',
        expected: `packages/voodoojs/${entry} presente`,
        actual: 'ausente; o npm publica sem ele e nao avisa',
      })
    );
  }

  const mapBytes = (info.files ?? [])
    .filter((f) => f.path.endsWith('.map'))
    .reduce((sum, f) => sum + f.size, 0);

  return {
    filename: info.filename,
    tarballKb: kb(info.size),
    unpackedKb: kb(info.unpackedSize),
    entries: paths.length,
    sourcemapKb: kb(mapBytes),
    sourcemapShareOfUnpacked: `${((mapBytes / info.unpackedSize) * 100).toFixed(1)}%`,
    files: paths,
  };
}

// ---------------------------------------------------------------------------
// 5. sideEffects
// ---------------------------------------------------------------------------

function globToRegExp(glob) {
  const escaped = glob
    .replace(/^\.\//, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, ' ')
    .replace(/\*/g, '[^/]*')
    .replace(/ /g, '.*');
  return new RegExp(`^${escaped}$`);
}

function checkSideEffects(pkg, findings) {
  const declared = pkg.sideEffects;
  if (declared === undefined) {
    findings.push(
      warn('package.json nao declara sideEffects', {
        file: 'packages/voodoojs/package.json',
        expected: 'sideEffects: false ou lista de globs',
        actual: 'campo ausente; bundlers assumem que tudo tem efeito colateral e o tree shaking piora',
      })
    );
    return { declared: null, matched: [], unmatched: [] };
  }
  if (!Array.isArray(declared)) {
    return { declared, matched: [], unmatched: [] };
  }

  const all = walkFiles(PKG_DIR, {
    filter: (f) => /\.(ts|js|cjs|mjs)$/.test(f) && !f.endsWith('.map'),
    skipDirs: ['node_modules', '.git', 'test'],
  }).map((f) => rel(f).replace('packages/voodoojs/', ''));

  const matched = [];
  const unmatched = [];
  for (const glob of declared) {
    const re = globToRegExp(glob);
    const hits = all.filter((f) => re.test(f));
    if (hits.length) matched.push({ glob, files: hits.length });
    else unmatched.push(glob);
  }

  for (const glob of unmatched) {
    findings.push(
      warn(`Glob de sideEffects nao casa com nenhum arquivo: "${glob}"`, {
        file: 'packages/voodoojs/package.json',
        expected: 'todo glob de sideEffects aponta para arquivo existente',
        actual: 'entrada obsoleta; ou o arquivo sumiu, ou o padrao esta errado e o efeito colateral real nao esta protegido',
      })
    );
  }

  return { declared, matched, unmatched };
}

// ---------------------------------------------------------------------------
// 6. Duplicacao entre saidas modulares
// ---------------------------------------------------------------------------

/** Janela minima, em linhas normalizadas, para um trecho contar como duplicado. */
const DUP_WINDOW = 20;

function normalizeLines(source) {
  return source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 30 && !l.startsWith('//') && !l.startsWith('*'));
}

/**
 * Procura blocos identicos entre arquivos que deveriam compartilhar chunks.
 *
 * Os builds IIFE (voodoo.js, voodoo.core.js, voodoo.full.js) sao deliverables
 * independentes e repetir codigo entre eles e o esperado, entao ficam de fora.
 * O grupo que importa e o modular ESM: se o mesmo bloco aparece em index.js e
 * em reactivity.js, o tsup deixou de extrair um chunk e quem importa os dois
 * paga duas vezes.
 */
function checkDuplication(findings) {
  const groups = {
    esm: walkFiles(DIST_DIR, {
      filter: (f) =>
        f.endsWith('.js') &&
        !f.endsWith('.map') &&
        !basename(f).startsWith('voodoo.') &&
        !basename(f).includes('.min.'),
    }),
    cjs: walkFiles(DIST_DIR, {
      filter: (f) => f.endsWith('.cjs') && !f.endsWith('.map'),
    }),
  };

  const results = {};

  for (const [group, files] of Object.entries(groups)) {
    if (files.length < 2) {
      results[group] = { files: files.length, duplicatedBlocks: 0, duplicatedLines: 0, samples: [] };
      continue;
    }

    const index = new Map();
    for (const file of files) {
      const lines = normalizeLines(read(file) ?? '');
      for (let i = 0; i + DUP_WINDOW <= lines.length; i++) {
        const key = lines.slice(i, i + DUP_WINDOW).join('\n');
        let set = index.get(key);
        if (!set) index.set(key, (set = new Set()));
        set.add(basename(file));
      }
    }

    const dups = [];
    for (const [key, set] of index) {
      if (set.size < 2) continue;
      dups.push({ files: [...set].sort(), bytes: key.length, first: key.split('\n')[0].slice(0, 90) });
    }

    // Agrupa por conjunto de arquivos, para nao listar mil janelas do mesmo bloco.
    const byPair = new Map();
    for (const d of dups) {
      const key = d.files.join(' + ');
      const acc = byPair.get(key) ?? { files: d.files, windows: 0, sample: d.first };
      acc.windows++;
      byPair.set(key, acc);
    }

    const samples = [...byPair.values()].sort((a, b) => b.windows - a.windows).slice(0, 10);
    results[group] = {
      files: files.length,
      fileNames: files.map((f) => basename(f)),
      duplicatedBlocks: byPair.size,
      duplicatedWindows: dups.length,
      windowSize: DUP_WINDOW,
      samples,
    };

    if (group === 'esm' && byPair.size > 0) {
      for (const sample of samples) {
        findings.push(
          warn(
            `Codigo repetido entre saidas ESM que deveriam compartilhar chunk: ${sample.files.join(' e ')}`,
            {
              file: `packages/voodoojs/dist/${sample.files[0]}`,
              expected: 'trecho comum extraido para um chunk-*.js compartilhado',
              actual: `${sample.windows} janelas de ${DUP_WINDOW} linhas identicas; comeca em: ${sample.sample}`,
            }
          )
        );
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 7. Publicacao do global nos builds de CDN
// ---------------------------------------------------------------------------

const CDN_BUNDLES = [
  'voodoo.js',
  'voodoo.min.js',
  'voodoo.core.js',
  'voodoo.core.min.js',
  'voodoo.full.js',
  'voodoo.full.min.js',
];

function checkGlobalFooter(findings) {
  const rows = [];
  for (const name of CDN_BUNDLES) {
    const file = join(DIST_DIR, name);
    if (!existsSync(file)) {
      findings.push(
        fail('Bundle de CDN ausente', {
          file: rel(file),
          expected: 'arquivo gerado pelo build',
          actual: 'nao encontrado',
        })
      );
      rows.push({ file: name, exists: false, publishesGlobal: false });
      continue;
    }
    const source = read(file) ?? '';
    const ok = /window\.V\s*=/.test(source) && /window\.Voodoo\s*=/.test(source);
    if (!ok) {
      findings.push(
        fail('Bundle de CDN nao publica o global window.V', {
          file: rel(file),
          expected: 'window.V e window.Voodoo atribuidos no footer do IIFE',
          actual: 'atribuicao nao encontrada; a tag <script> nao daria acesso a API',
        })
      );
    }
    rows.push({ file: name, exists: true, publishesGlobal: ok });
  }
  return rows;
}

// ---------------------------------------------------------------------------

export async function run() {
  const findings = [];

  if (!existsSync(DIST_DIR) || walkFiles(DIST_DIR).length === 0) {
    return {
      status: STATUS.SKIP,
      summary: 'dist vazio',
      findings: [],
      details: { howToEnable: 'npm run build' },
    };
  }

  const pkg = readJson(join(PKG_DIR, 'package.json'));
  if (!pkg) {
    return {
      status: STATUS.FAIL,
      summary: 'package.json do pacote ilegivel',
      findings: [
        fail('package.json nao pode ser lido', { file: 'packages/voodoojs/package.json' }),
      ],
      details: {},
    };
  }

  const sizes = checkSizes(findings);
  const exportsCheck = checkExports(pkg, findings);
  const sourcemaps = checkSourcemaps(findings);
  const pack = checkPack(pkg, findings);
  const sideEffects = checkSideEffects(pkg, findings);
  const duplication = checkDuplication(findings);
  const cdn = checkGlobalFooter(findings);

  const failCount = findings.filter((f) => f.level === 'fail').length;
  const warnCount = findings.filter((f) => f.level === 'warn').length;
  const status = failCount ? STATUS.FAIL : warnCount ? STATUS.WARN : STATUS.PASS;

  const biggest = sizes.rows
    .filter((r) => r.budgetKb != null)
    .map((r) => `${r.file} ${r.gzipKb}/${r.budgetKb} KB`)
    .join(', ');

  return {
    status,
    summary:
      status === STATUS.PASS
        ? `${sizes.rows.length} artefatos, ${biggest || 'sem meta declarada'}`
        : `${failCount} falhas, ${warnCount} avisos`,
    findings,
    details: {
      sizes,
      declaredPaths: exportsCheck,
      sourcemaps,
      pack,
      sideEffects,
      duplication,
      cdnGlobals: cdn,
    },
  };
}
