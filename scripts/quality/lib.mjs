/**
 * Utilitarios compartilhados pelos checks de qualidade.
 *
 * Nada aqui inventa resultado: toda funcao devolve o que realmente encontrou no
 * disco ou o que o processo filho realmente imprimiu. Quando uma ferramenta nao
 * existe no ambiente, quem chama recebe `null` ou uma flag e decide reportar
 * SKIP. Isso e proposital: um SKIP honesto vale mais que um PASS inventado.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

/** Raiz do monorepo, deduzida a partir da localizacao deste arquivo. */
export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const PKG_DIR = join(ROOT, 'packages', 'voodoojs');
export const SRC_DIR = join(PKG_DIR, 'src');
export const TEST_DIR = join(PKG_DIR, 'test');
export const DIST_DIR = join(PKG_DIR, 'dist');

export const STATUS = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP' };

/** Pior status entre os informados. FAIL > WARN > SKIP > PASS. */
export function worstStatus(list) {
  if (list.includes(STATUS.FAIL)) return STATUS.FAIL;
  if (list.includes(STATUS.WARN)) return STATUS.WARN;
  if (list.length && list.every((s) => s === STATUS.SKIP)) return STATUS.SKIP;
  return STATUS.PASS;
}

// ---------------------------------------------------------------------------
// Processos
// ---------------------------------------------------------------------------

const IS_WIN = process.platform === 'win32';

/**
 * Roda um comando e devolve o que ele imprimiu. Nunca lanca: erros viram
 * `code != 0` mais o texto em `stderr`, para o check decidir o que reportar.
 */
export function run(cmd, args = [], opts = {}) {
  // No Windows os binarios de npm sao `.cmd`, entao precisamos de shell. Com
  // shell ligado os argumentos com espaco precisam de aspas na mao (o caminho
  // do repositorio pode muito bem morar em "C:\Users\Fulano De Tal\...").
  // Caminho absoluto de executavel dispensa shell: o spawn acha o arquivo
  // sozinho e evitamos a concatenacao de argumentos que o shell faria.
  const isAbsoluteExe = /^[A-Za-z]:[\\/].*\.exe$/i.test(cmd) || cmd.startsWith('/');
  const shell = IS_WIN && !isAbsoluteExe;
  const quote = (a) => (/[\s"^&|<>()]/.test(a) && !a.startsWith('"') ? `"${a}"` : a);
  // O executavel tambem precisa de aspas: `process.execPath` no Windows e
  // "C:\Program Files\nodejs\node.exe", e sem aspas o cmd tenta rodar
  // "C:\Program".
  const finalCmd = shell ? quote(cmd) : cmd;
  const finalArgs = shell ? args.map(quote) : args;
  let res;
  try {
    res = spawnSync(finalCmd, finalArgs, {
      cwd: opts.cwd ?? ROOT,
      encoding: 'utf8',
      shell,
      maxBuffer: 128 * 1024 * 1024,
      timeout: opts.timeout ?? 15 * 60 * 1000,
      env: { ...process.env, ...(opts.env || {}) },
    });
  } catch (err) {
    return { code: 1, stdout: '', stderr: String(err && err.message), spawnFailed: true };
  }
  return {
    code: res.status ?? 1,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    spawnFailed: Boolean(res.error),
    errorMessage: res.error ? String(res.error.message) : '',
  };
}

/** Roda um script Node com o mesmo executavel que esta rodando o orquestrador. */
export function runNode(args, opts = {}) {
  return run(process.execPath, args, opts);
}

/** Caminho do binario local de uma dependencia, ou `null` se ela nao existe. */
export function localBin(relPath) {
  const p = join(ROOT, 'node_modules', ...relPath.split('/'));
  return existsSync(p) ? p : null;
}

/** `true` se o pacote esta instalado em node_modules da raiz. */
export function hasPackage(name) {
  return existsSync(join(ROOT, 'node_modules', ...name.split('/'), 'package.json'));
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

/** Lista recursiva de arquivos, ignorando `node_modules`, `.git` e `dist`. */
export function walkFiles(dir, { filter, skipDirs = ['node_modules', '.git'] } = {}) {
  const out = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        if (!filter || filter(full)) out.push(full);
      }
    }
  }
  return out.sort();
}

export function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function readJson(file) {
  const raw = read(file);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Caminho relativo a raiz, sempre com barras normais, para o relatorio. */
export function rel(file) {
  return relative(ROOT, file).split(sep).join('/');
}

/** Numero da linha (1-based) de um indice dentro do texto. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/** Diretorio temporario da execucao. Removido no fim pelo orquestrador. */
export function makeScratch() {
  const dir = join(tmpdir(), `voodoo-quality-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanScratch(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* melhor deixar lixo no temp do que derrubar o relatorio */
  }
}

export function writeTemp(dir, name, content) {
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  return file;
}

// ---------------------------------------------------------------------------
// Tamanhos
// ---------------------------------------------------------------------------

export function sizesOf(buffer) {
  return {
    raw: buffer.length,
    gzip: gzipSync(buffer, { level: 9 }).length,
    brotli: brotliCompressSync(buffer, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
      .length,
  };
}

export function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

// ---------------------------------------------------------------------------
// Comentarios de codigo
// ---------------------------------------------------------------------------

/**
 * Substitui comentarios e literais de string por espacos, preservando offsets.
 *
 * Serve para os gates de seguranca e de codigo morto nao acusarem uma
 * ocorrencia que so aparece dentro de um comentario ou de uma mensagem de erro.
 */
export function stripCommentsAndStrings(source) {
  const out = source.split('');
  const n = source.length;
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }
    if (ch === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      blank(i, Math.min(j + 2, n));
      i = j + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === ch) break;
        j++;
      }
      blank(i + 1, j);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join('');
}

// ---------------------------------------------------------------------------
// Achados
// ---------------------------------------------------------------------------

/**
 * Um achado. `level` diz o peso; `file`/`line` apontam onde; `expected`/`actual`
 * existem para o orquestrador conseguir imprimir "esperado X, obtido Y".
 */
export function finding(level, message, extra = {}) {
  return { level, message, ...extra };
}

export const fail = (message, extra) => finding('fail', message, extra);
export const warn = (message, extra) => finding('warn', message, extra);
export const note = (message, extra) => finding('note', message, extra);

/** Status derivado de uma lista de achados. */
export function statusFromFindings(findings, { emptyStatus = STATUS.PASS } = {}) {
  if (findings.some((f) => f.level === 'fail')) return STATUS.FAIL;
  if (findings.some((f) => f.level === 'warn')) return STATUS.WARN;
  return emptyStatus;
}

export { pathToFileURL, existsSync, join, dirname, resolve };
