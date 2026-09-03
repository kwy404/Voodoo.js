/**
 * Docs: links that lead somewhere and examples that compile.
 *
 * Two parts:
 *
 *   1. `scripts/check-links.mjs` over every `.md` in the root, in `docs/` and
 *      in `site/docs/`: the target file exists and the anchor exists.
 *   2. The ```js and ```html blocks in the README go through esbuild's parser.
 *      An example that does not even parse is a broken promise on the very
 *      first thing a person copies.
 *
 * A broken link and an example with a syntax error are both FAIL. There is no
 * middle ground: both are verifiable, deterministic and visible to whoever
 * arrives at the project.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, STATUS, fail, note, read, rel, walkFiles, warn } from './lib.mjs';
import { checkLinks } from '../check-links.mjs';

export const meta = { label: 'Docs' };

/** Fenced code blocks, with the language and the starting line. */
function fencedBlocks(source) {
  const lines = source.split('\n');
  const out = [];
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(`{3,})\s*([\w+-]*)/.exec(lines[i]);
    if (!m) continue;
    if (!open) {
      open = { fence: m[1], lang: (m[2] || '').toLowerCase(), start: i + 1, body: [] };
      continue;
    }
    if (m[1].length >= open.fence.length && !m[2]) {
      out.push({ ...open, body: lines.slice(open.start, i).join('\n') });
      open = null;
    }
  }
  return out;
}

/** Contents of each `<script>` in an html block. */
function inlineScripts(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue; // external script, there is no body
    if (/type\s*=\s*["'](?!module|text\/javascript|application\/javascript)/i.test(attrs)) continue;
    const offset = html.slice(0, m.index).split('\n').length - 1;
    out.push({ code: m[2], lineOffset: offset });
  }
  return out;
}

async function loadParser() {
  try {
    const esbuild = await import('esbuild');
    return {
      name: 'esbuild',
      parse(code, isModule) {
        esbuild.transformSync(code, {
          loader: 'ts',
          format: isModule ? 'esm' : undefined,
          sourcefile: 'exemplo.ts',
        });
      },
    };
  } catch {
    return null;
  }
}

/**
 * Trechos aceitos apesar de nao serem programa completo.
 *
 * Documentacao boa mostra fragmento: uma linha de configuracao, o corpo de um
 * objeto, um `...` indicando continuacao. Reprovar isso seria confundir estilo
 * com defeito.
 */
function isFragment(code) {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (/^[.…]{3}/m.test(trimmed) && trimmed.split('\n').length <= 3) return true;
  // Corpo de objeto solto: comeca com "chave:" e nao abre bloco antes.
  if (/^\s*[\w'"$-]+\s*:/.test(trimmed) && !/^\s*(const|let|var|function|class|import)/.test(trimmed))
    return true;
  return false;
}

export async function run() {
  const findings = [];

  // -------------------------------------------------------------------------
  // 1. Links
  // -------------------------------------------------------------------------
  const links = checkLinks();
  for (const broken of links.broken) {
    findings.push(
      fail(`Link quebrado (${broken.reason}): ${broken.target}`, {
        file: broken.file,
        line: broken.line,
        expected: broken.expected,
        actual: broken.actual,
      })
    );
  }

  // -------------------------------------------------------------------------
  // 2. Exemplos do README
  // -------------------------------------------------------------------------
  const parser = await loadParser();
  const readmes = walkFiles(ROOT, {
    filter: (f) => /[\\/]README(\.[\w-]+)?\.md$/i.test(f),
    skipDirs: ['node_modules', '.git', 'dist', 'docs', 'site', 'packages', 'examples'],
  }).filter((f) => rel(f).split('/').length === 1);

  const examples = { checked: 0, fragments: 0, broken: 0, byFile: {} };

  if (!parser) {
    findings.push(
      note('esbuild indisponivel: os exemplos do README nao foram validados', {
        expected: 'esbuild em node_modules (ja consta via tsup)',
        actual: 'import falhou',
      })
    );
  } else {
    for (const file of readmes) {
      const source = read(file);
      if (source == null) continue;
      const relPath = rel(file);
      examples.byFile[relPath] = { js: 0, html: 0, broken: 0 };

      for (const block of fencedBlocks(source)) {
        const isJs = ['js', 'javascript', 'ts', 'typescript', 'jsx'].includes(block.lang);
        const isHtml = ['html', 'htm'].includes(block.lang);
        if (!isJs && !isHtml) continue;

        const snippets = isJs
          ? [{ code: block.body, lineOffset: 0 }]
          : inlineScripts(block.body);

        if (isHtml) examples.byFile[relPath].html++;
        else examples.byFile[relPath].js++;

        for (const snippet of snippets) {
          if (isFragment(snippet.code)) {
            examples.fragments++;
            continue;
          }
          examples.checked++;
          const isModule = /^\s*(import|export)\s/m.test(snippet.code);
          try {
            parser.parse(snippet.code, isModule);
          } catch (err) {
            examples.broken++;
            examples.byFile[relPath].broken++;
            const detail = (err && (err.errors?.[0]?.text || err.message)) || String(err);
            const at = err?.errors?.[0]?.location;
            findings.push(
              fail(`Exemplo de ${isHtml ? 'html' : 'js'} nao compila`, {
                file: relPath,
                line: block.start + snippet.lineOffset + (at?.line ?? 1),
                expected: 'bloco de exemplo sintaticamente valido',
                actual: detail.split('\n')[0].slice(0, 200),
              })
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Nada de site/docs em markdown? Vale registrar, nao reprovar.
  // -------------------------------------------------------------------------
  const siteDocs = join(ROOT, 'site', 'docs');
  const siteMd = existsSync(siteDocs)
    ? walkFiles(siteDocs, { filter: (f) => f.toLowerCase().endsWith('.md') }).length
    : 0;
  if (existsSync(siteDocs) && siteMd === 0) {
    findings.push(
      note('site/docs nao tem markdown; a documentacao publicada e HTML gerado', {
        file: 'site/docs',
        actual: 'links relativos dentro do HTML do site nao entram neste check',
      })
    );
  }

  const failCount = findings.filter((f) => f.level === 'fail').length;
  const warnCount = findings.filter((f) => f.level === 'warn').length;
  const status = failCount ? STATUS.FAIL : warnCount ? STATUS.WARN : STATUS.PASS;

  const summaryParts = [];
  if (links.broken.length) summaryParts.push(`${links.broken.length} broken links`);
  if (examples.broken) summaryParts.push(`${examples.broken} exemplos quebrados`);

  return {
    status,
    summary: summaryParts.length
      ? summaryParts.join(', ')
      : `${links.checked} links e ${examples.checked} exemplos ok`,
    findings,
    details: {
      links: {
        markdownFiles: links.files.length,
        relativeLinksChecked: links.checked,
        externalSkipped: links.external,
        broken: links.broken,
      },
      examples: {
        parser: parser?.name ?? null,
        readmes: readmes.map(rel),
        blocksParsed: examples.checked,
        fragmentsSkipped: examples.fragments,
        broken: examples.broken,
        byFile: examples.byFile,
      },
      siteDocsMarkdownFiles: siteMd,
    },
  };
}
