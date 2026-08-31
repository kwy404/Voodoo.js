#!/usr/bin/env node
/**
 * Valida os links relativos da documentacao.
 *
 *   node scripts/check-links.mjs           relatorio legivel, exit != 0 se quebrado
 *   node scripts/check-links.mjs --json    o mesmo em json
 *
 * Verifica duas coisas para cada link relativo encontrado num `.md`:
 * o arquivo de destino existe, e a ancora (`#alguma-coisa`) existe no destino.
 *
 * A ancora e a metade que ninguem confere na mao e que quebra sozinha: basta
 * alguem reescrever um titulo em outro arquivo. Links externos ficam de fora de
 * proposito — validar `http` exigiria rede e transformaria um check
 * deterministico numa fonte de falha intermitente.
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, read, rel, walkFiles } from './quality/lib.mjs';

/** Onde procurar arquivos markdown. */
const SCAN = [
  { dir: ROOT, depth: 'flat', label: 'raiz' },
  { dir: join(ROOT, 'docs'), depth: 'deep', label: 'docs' },
  { dir: join(ROOT, 'site', 'docs'), depth: 'deep', label: 'site/docs' },
];

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Apaga trechos de codigo em linha, preservando o comprimento.
 *
 * Sem isso, uma tabela de migracao com `<a v-link href="/x">` numa celula de
 * codigo vira "link quebrado para /x", que e ruido puro.
 */
function stripInlineCode(source) {
  return source.replace(/(`{1,3})(?:(?!\1)[\s\S])*?\1/g, (m) =>
    m.replace(/[^\n]/g, ' ')
  );
}

/** Remove blocos de codigo cercados, para nao ler link nem titulo de exemplo. */
function stripFences(source) {
  const lines = source.split('\n');
  let fence = null;
  return lines
    .map((line) => {
      const m = /^\s*(`{3,}|~{3,})/.exec(line);
      if (m) {
        if (!fence) {
          fence = m[1][0];
          return '';
        }
        if (m[1][0] === fence) {
          fence = null;
          return '';
        }
      }
      return fence ? '' : line;
    })
    .join('\n');
}

/** Slug no estilo do GitHub: minusculas, pontuacao fora, espacos viram hifen. */
export function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Todas as ancoras alcancaveis num arquivo markdown. */
export function anchorsOf(source) {
  const body = stripFences(source);
  const anchors = new Set();
  const seen = new Map();

  for (const line of body.split('\n')) {
    const m = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const base = slugify(m[2]);
    if (!base) continue;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  // Ancoras explicitas em HTML embutido.
  for (const m of source.matchAll(/<[^>]+\bid\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  for (const m of source.matchAll(/<a[^>]+\bname\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);

  return anchors;
}

/** Ancoras de um arquivo HTML: qualquer `id=`. */
function htmlAnchors(source) {
  const anchors = new Set();
  for (const m of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  for (const m of source.matchAll(/\bname\s*=\s*["']([^"']+)["']/g)) anchors.add(m[1]);
  return anchors;
}

/** Extrai os links de um markdown, com a linha de origem. */
function linksOf(source) {
  const body = stripInlineCode(stripFences(source));
  const lines = body.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // [texto](destino "titulo")
    for (const m of line.matchAll(/\[(?:[^\][]|\[[^\]]*\])*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // [id]: destino
    const def = /^\s{0,3}\[[^\]]+\]:\s*<?([^\s>]+)>?/.exec(line);
    if (def) out.push({ target: def[1], line: i + 1, raw: line.trim().slice(0, 100) });
    // <a href="destino">
    for (const m of line.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["']/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // <img src="destino">
    for (const m of line.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
    // ![alt](destino)
    for (const m of line.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?\s*\)/g)) {
      out.push({ target: m[1], line: i + 1, raw: m[0].slice(0, 100) });
    }
  }

  return out;
}

/** Resolve o caminho de um link, aceitando as formas que o GitHub aceita. */
function resolveTarget(fromFile, target) {
  // Link comecando com "/" e relativo a raiz do repositorio, nao ao arquivo.
  const base = target.startsWith('/') ? ROOT : dirname(fromFile);
  if (target.startsWith('/')) target = target.replace(/^\/+/, '');
  const candidates = [
    resolve(base, target),
    resolve(base, `${target}.md`),
    resolve(base, target, 'README.md'),
    resolve(base, target, 'index.md'),
    resolve(base, target, 'index.html'),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      if (statSync(candidate).isDirectory()) continue;
    } catch {
      continue;
    }
    return candidate;
  }
  // Diretorio sem indice ainda e um destino valido para navegacao no GitHub.
  const asDir = resolve(base, target);
  if (existsSync(asDir)) {
    try {
      if (statSync(asDir).isDirectory()) return asDir;
    } catch {
      /* segue */
    }
  }
  return null;
}

/** Roda a validacao completa. Devolve `{ checked, broken, files }`. */
export function checkLinks() {
  const files = [];
  for (const scan of SCAN) {
    if (!existsSync(scan.dir)) continue;
    const found = walkFiles(scan.dir, {
      filter: (f) => f.toLowerCase().endsWith('.md'),
      skipDirs: ['node_modules', '.git', 'dist'],
    });
    for (const file of found) {
      if (scan.depth === 'flat' && dirname(file) !== scan.dir) continue;
      if (!files.includes(file)) files.push(file);
    }
  }

  const anchorCache = new Map();
  const anchorsFor = (file) => {
    if (anchorCache.has(file)) return anchorCache.get(file);
    const source = read(file) ?? '';
    const anchors = file.toLowerCase().endsWith('.md') ? anchorsOf(source) : htmlAnchors(source);
    anchorCache.set(file, anchors);
    return anchors;
  };

  const broken = [];
  let checked = 0;
  let external = 0;

  for (const file of files) {
    const source = read(file);
    if (source == null) continue;
    const selfAnchors = anchorsFor(file);

    for (const link of linksOf(source)) {
      const target = link.target.trim();
      if (!target) continue;
      if (EXTERNAL.test(target)) {
        external++;
        continue;
      }
      if (target.startsWith('{{') || target.includes('${')) continue; // template

      checked++;
      const hashAt = target.indexOf('#');
      const pathPart = hashAt < 0 ? target : target.slice(0, hashAt);
      const anchor = hashAt < 0 ? '' : decodeURIComponent(target.slice(hashAt + 1));

      // Link so de ancora: valida contra o proprio arquivo.
      if (!pathPart) {
        if (anchor && !selfAnchors.has(anchor)) {
          broken.push({
            file: rel(file),
            line: link.line,
            target,
            reason: 'ancora',
            expected: `titulo gerando #${anchor} neste arquivo`,
            actual: `nenhum titulo com esse slug (${selfAnchors.size} ancoras no arquivo)`,
          });
        }
        continue;
      }

      const resolved = resolveTarget(file, decodeURIComponent(pathPart));
      if (!resolved) {
        broken.push({
          file: rel(file),
          line: link.line,
          target,
          reason: 'arquivo',
          expected: `${pathPart} existente a partir de ${rel(dirname(file)) || '.'}`,
          actual: 'arquivo nao encontrado',
        });
        continue;
      }

      if (!anchor) continue;

      let isDir = false;
      try {
        isDir = statSync(resolved).isDirectory();
      } catch {
        /* segue */
      }
      if (isDir) continue;

      // Ancora so faz sentido em documento navegavel. Num .svg ou .png o "#..."
      // e sintaxe do proprio GitHub (#gh-dark-mode-only) ou um fragmento SVG.
      if (!/\.(md|markdown|html?)$/i.test(resolved)) continue;

      const targetAnchors = anchorsFor(resolved);
      if (!targetAnchors.has(anchor)) {
        broken.push({
          file: rel(file),
          line: link.line,
          target,
          reason: 'ancora',
          expected: `#${anchor} em ${rel(resolved)}`,
          actual: `${rel(resolved)} nao tem esse slug (${targetAnchors.size} ancoras disponiveis)`,
        });
      }
    }
  }

  return { files: files.map(rel), checked, external, broken };
}

// ---------------------------------------------------------------------------

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  const result = checkLinks();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `${result.checked} links relativos em ${result.files.length} arquivos markdown ` +
        `(${result.external} externos ignorados).`
    );
    if (!result.broken.length) {
      console.log('Nenhum link quebrado.');
    } else {
      console.log(`\n${result.broken.length} links quebrados:\n`);
      for (const b of result.broken) {
        console.log(`  ${b.file}:${b.line}  ->  ${b.target}`);
        console.log(`      esperado: ${b.expected}`);
        console.log(`      obtido:   ${b.actual}\n`);
      }
    }
  }
  process.exit(result.broken.length ? 1 : 0);
}
