/**
 * Dead Code: exports nobody imports.
 *
 * Builds the import graph of `src/**` and looks for exported names that do not
 * appear in any `import { ... }` clause nor `export { ... } from`, and that
 * also do not leave through one of the public entry points.
 *
 * Two honest caveats about the method, both recorded in the result:
 *
 *   - the analysis is by name, not by module resolution. A name exported in
 *     two files and imported from one of them counts as used in both;
 *   - an export consumed only by the test suite is listed separately, because
 *     it is a different case: it is not dead code, it is API without a
 *     production consumer.
 *
 * That is why the result is WARN, and never FAIL: it is a list to review, not a
 * verdict. Confirm by hand before deleting anything.
 */

import { basename } from 'node:path';

import { SRC_DIR, STATUS, TEST_DIR, lineOf, read, rel, stripCommentsAndStrings, walkFiles, warn } from './lib.mjs';

export const meta = { label: 'Dead Code' };

/** Files whose exports are the public API by definition. */
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

/** Names exported by a file, with the line of the declaration. */
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

  // `export const { a, b } = ...` and `export const [a, b] = ...`
  for (const m of clean.matchAll(/\bexport\s+(?:const|let|var)\s*[{[]([^}\]]+)[}\]]/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(':').pop().trim().replace(/^\.\.\./, '');
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name, m.index, 'destructured');
    }
  }

  // `export { a, b as c }` without `from`: re-exports a local binding.
  for (const m of clean.matchAll(/\bexport\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default')
        add(name, m.index, 'reexport-local');
    }
  }

  return [...found.values()];
}

/** Everything a file consumes from other modules. */
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

/** Modules reached by `export *` or `import * as`, whose exports are public. */
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

  /** A module reached by `export *` has its whole surface published. */
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

      // Nobody imports it. What is left to find out is whether the module
      // itself uses it: if it does, the problem is the leftover `export`, not
      // the code. Saying "dead weight in the bundle" about a live function
      // would be telling someone to remove something that is in use.
      const uses = (clean.match(new RegExp(`\\b${entry.name}\\b`, 'g')) ?? []).length;
      if (uses > 1) internalOnly.push({ ...entry, file: relPath, localUses: uses - 1 });
      else dead.push({ ...entry, file: relPath });
    }
  }

  // An exported type with no consumer takes up no byte in the bundle: it is a
  // contract nobody uses, not dead code. These are two different problems, and
  // listing both in the same bucket of 100+ warnings only turns the list into
  // noise, so the types are grouped into a single warning and detailed in the
  // evidence.
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
