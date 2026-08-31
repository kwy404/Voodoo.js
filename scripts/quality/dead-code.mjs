/**
 * Dead Code: exports que ninguem importa.
 *
 * Monta o grafo de importacoes de `src/**` e procura nomes exportados que nao
 * aparecem em nenhuma clausula `import { ... }` nem `export { ... } from`, e
 * que tambem nao saem por um dos pontos de entrada publicos.
 *
 * Duas ressalvas honestas sobre o metodo, ambas registradas no resultado:
 *
 *   - a analise e por nome, nao por resolucao de modulo. Um nome exportado em
 *     dois arquivos e importado de um deles conta como usado nos dois;
 *   - um export consumido so pela suite de testes aparece separado, porque e
 *     um caso diferente: nao e codigo morto, e API sem consumidor de producao.
 *
 * Por isso o resultado e WARN, e nunca FAIL: e uma lista para revisar, nao um
 * veredito. Confirme na mao antes de apagar qualquer coisa.
 */

import { basename } from 'node:path';

import { SRC_DIR, STATUS, TEST_DIR, lineOf, read, rel, stripCommentsAndStrings, walkFiles, warn } from './lib.mjs';

export const meta = { label: 'Dead Code' };

/** Arquivos cujos exports sao a API publica por definicao. */
const ENTRYPOINTS = new Set([
  'index.ts',
  'core.ts',
  'essential.ts',
  'minimo.ts',
  'browser.ts',
  'browser-essential.ts',
  'browser-minimo.ts',
  'bootstrap.ts',
]);

/** Nomes exportados por um arquivo, com a linha da declaracao. */
function exportsOf(source) {
  const clean = stripCommentsAndStrings(source);
  const found = new Map();

  const add = (name, index, kind) => {
    if (!name || found.has(name)) return;
    found.set(name, { name, line: lineOf(source, index), kind });
  };

  const decl =
    /\bexport\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(const|let|var|function\*?|class|interface|type|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g;
  for (const m of clean.matchAll(decl)) add(m[2], m.index, m[1].trim());

  // `export const { a, b } = ...` e `export const [a, b] = ...`
  for (const m of clean.matchAll(/\bexport\s+(?:const|let|var)\s*[{[]([^}\]]+)[}\]]/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(':').pop().trim().replace(/^\.\.\./, '');
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name, m.index, 'destructured');
    }
  }

  // `export { a, b as c }` sem `from`: reexporta binding local.
  for (const m of clean.matchAll(/\bexport\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default')
        add(name, m.index, 'reexport-local');
    }
  }

  return [...found.values()];
}

/** Tudo que um arquivo consome de outros modulos. */
function consumptionOf(source) {
  const clean = stripCommentsAndStrings(source);
  const names = new Set();
  let namespaceImport = false;
  let starReexport = false;

  // import { a, b as c } from '...'  /  import type { X } from '...'
  for (const m of clean.matchAll(/\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  // export { a, b as c } from '...'
  for (const m of clean.matchAll(/\bexport\s*\{([^}]*)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  if (/\bimport\s+\*\s+as\s+[\w$]+\s+from/.test(clean)) namespaceImport = true;
  if (/\bexport\s+\*\s+(?:as\s+[\w$]+\s+)?from/.test(clean)) starReexport = true;

  return { names, namespaceImport, starReexport };
}

/** Modulos alcancados por `export *` ou `import * as`, cujos exports sao publicos. */
function wildcardTargets(source) {
  const clean = stripCommentsAndStrings(source);
  const out = new Set();
  for (const m of source.matchAll(/\b(?:export\s+\*(?:\s+as\s+[\w$]+)?|import\s+\*\s+as\s+[\w$]+)\s+from\s*['"]([^'"]+)['"]/g)) {
    out.add(m[1]);
  }
  void clean;
  return out;
}

export async function run() {
  const srcFiles = walkFiles(SRC_DIR, { filter: (f) => /\.tsx?$/.test(f) });
  const testFiles = walkFiles(TEST_DIR, { filter: (f) => /\.tsx?$/.test(f) });

  const srcConsumed = new Set();
  const testConsumed = new Set();
  const wildcardModules = new Set();

  for (const file of srcFiles) {
    const source = read(file) ?? '';
    const { names } = consumptionOf(source);
    for (const name of names) srcConsumed.add(name);
    for (const target of wildcardTargets(source)) wildcardModules.add(target);
  }

  for (const file of testFiles) {
    const source = read(file) ?? '';
    const { names } = consumptionOf(source);
    for (const name of names) testConsumed.add(name);
  }

  /** Um modulo alcancado por `export *` tem toda a superficie publicada. */
  const isWildcardPublished = (file) => {
    const relPath = rel(file);
    for (const target of wildcardModules) {
      const normalized = target.replace(/^\.{1,2}\//, '').replace(/\/index$/, '');
      if (!normalized) continue;
      if (relPath.includes(`/${normalized}.ts`) || relPath.includes(`/${normalized}/index.ts`))
        return true;
    }
    return false;
  };

  const dead = [];
  const internalOnly = [];
  const testOnly = [];
  let totalExports = 0;

  for (const file of srcFiles) {
    const name = basename(file);
    if (ENTRYPOINTS.has(name)) continue;
    if (isWildcardPublished(file)) continue;

    const source = read(file) ?? '';
    const clean = stripCommentsAndStrings(source);
    const relPath = rel(file);

    for (const entry of exportsOf(source)) {
      totalExports++;
      if (srcConsumed.has(entry.name)) continue;
      if (testConsumed.has(entry.name)) {
        testOnly.push({ ...entry, file: relPath });
        continue;
      }

      // Ninguem importa. Falta saber se o proprio modulo usa: se usa, o
      // problema e o `export` sobrando, e nao o codigo. Dizer "peso morto no
      // bundle" para uma funcao viva seria mandar remover algo em uso.
      const uses = (clean.match(new RegExp(`\\b${entry.name}\\b`, 'g')) ?? []).length;
      if (uses > 1) internalOnly.push({ ...entry, file: relPath, localUses: uses - 1 });
      else dead.push({ ...entry, file: relPath });
    }
  }

  // Tipo exportado e sem consumidor nao ocupa byte no bundle: e um contrato
  // que ninguem usa, nao codigo morto. Sao dois problemas diferentes e listar
  // os dois no mesmo balde de 100+ avisos so faz a lista virar ruido, entao os
  // tipos ficam agrupados num aviso so e detalhados na evidencia.
  const TYPE_KINDS = new Set(['interface', 'type', 'enum']);
  const isType = (e) => TYPE_KINDS.has(e.kind);

  const deadRuntime = dead.filter((e) => !isType(e));
  const deadTypes = dead.filter(isType);
  const internalRuntime = internalOnly.filter((e) => !isType(e));
  const internalTypes = internalOnly.filter(isType);

  const findings = [];

  for (const entry of deadRuntime) {
    findings.push(
      warn(`Codigo morto: ${entry.kind} ${entry.name} nao e usado em lugar nenhum`, {
        file: entry.file,
        line: entry.line,
        expected: 'nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo',
        actual: 'nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle',
      })
    );
  }

  for (const entry of internalRuntime) {
    findings.push(
      warn(`Export desnecessario: ${entry.kind} ${entry.name}`, {
        file: entry.file,
        line: entry.line,
        expected: 'sem a palavra export, ja que so o proprio modulo usa',
        actual: `usado ${entry.localUses}x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking`,
      })
    );
  }

  const summarizeTypes = (list, message, expectation) => {
    if (!list.length) return;
    const byFile = new Map();
    for (const entry of list) byFile.set(entry.file, (byFile.get(entry.file) ?? 0) + 1);
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    findings.push(
      warn(`${list.length} ${message}`, {
        file: top[0]?.[0],
        expected: expectation,
        actual: `nao custam bytes no bundle. Concentrados em: ${top
          .map(([f, n]) => `${f} (${n})`)
          .join(', ')}`,
      })
    );
  };

  summarizeTypes(
    deadTypes,
    'tipos exportados sem nenhuma referencia',
    'tipo publico reexportado por index.ts, ou declaracao removida'
  );
  summarizeTypes(
    internalTypes,
    'tipos exportados que so o proprio modulo usa',
    'tipo reexportado por index.ts se e publico, ou sem export se e interno'
  );

  for (const entry of testOnly) {
    findings.push(
      warn(`Export usado apenas pelos testes: ${entry.kind} ${entry.name}`, {
        file: entry.file,
        line: entry.line,
        expected: 'consumidor no proprio src, ou reexport publico',
        actual: 'so a suite de testes importa esse nome',
      })
    );
  }

  const summary = findings.length
    ? `${deadRuntime.length} mortos, ${internalRuntime.length} exports desnecessarios, ` +
      `${deadTypes.length + internalTypes.length} tipos (de ${totalExports} exports)`
    : `${totalExports} exports, todos com consumidor`;

  return {
    status: findings.length ? STATUS.WARN : STATUS.PASS,
    summary,
    findings,
    details: {
      method:
        'grafo de importacoes por nome sobre packages/voodoojs/src; pontos de entrada e modulos alcancados por export * ficam de fora',
      limitation:
        'analise textual: nomes homonimos em modulos diferentes podem se encobrir. Confirme na mao antes de remover.',
      filesScanned: srcFiles.length,
      totalExports,
      deadRuntime,
      exportedButInternalRuntime: internalRuntime,
      deadTypes,
      exportedButInternalTypes: internalTypes,
      testOnly,
    },
  };
}
