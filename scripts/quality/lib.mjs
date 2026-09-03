/**
 * Utilities shared by the quality checks.
 *
 * Nothing here invents a result: every function returns what it actually found
 * on disk, or what the child process actually printed. When a tool does not
 * exist in the environment, the caller receives `null` or a flag and decides to
 * report SKIP. That is deliberate: an honest SKIP is worth more than a
 * made-up PASS.
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

/** Monorepo root, deduced from the location of this file. */
export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const PKG_DIR = join(ROOT, 'packages', 'voodoojs');
export const SRC_DIR = join(PKG_DIR, 'src');
export const TEST_DIR = join(PKG_DIR, 'test');
export const DIST_DIR = join(PKG_DIR, 'dist');

export const STATUS = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL', SKIP: 'SKIP' };

/** The worst status among the ones given. FAIL > WARN > SKIP > PASS. */
export function worstStatus(list) {
  if (list.includes(STATUS.FAIL)) return STATUS.FAIL;
  if (list.includes(STATUS.WARN)) return STATUS.WARN;
  if (list.length && list.every((s) => s === STATUS.SKIP)) return STATUS.SKIP;
  return STATUS.PASS;
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

const IS_WIN = process.platform === 'win32';

/**
 * Runs a command and returns what it printed. Never throws: errors become
 * `code != 0` plus the text in `stderr`, so the check decides what to report.
 */
export function run(cmd, args = [], opts = {}) {
  // On Windows the npm binaries are `.cmd`, so we need a shell. With the shell
  // turned on, arguments containing spaces need to be quoted by hand (the
  // repository path may well live in "C:\Users\Fulano De Tal\...").
  // An absolute executable path does without the shell: spawn finds the file on
  // its own and we avoid the argument concatenation the shell would do.
  const isAbsoluteExe = /^[A-Za-z]:[\\/].*\.exe$/i.test(cmd) || cmd.startsWith('/');
  const shell = IS_WIN && !isAbsoluteExe;
  const quote = (a) => (/[\s"^&|<>()]/.test(a) && !a.startsWith('"') ? `"${a}"` : a);
  // The executable needs quotes too: `process.execPath` on Windows is
  // "C:\Program Files\nodejs\node.exe", and without quotes cmd tries to run
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

/** Runs a Node script with the same executable that is running the orchestrator. */
export function runNode(args, opts = {}) {
  return run(process.execPath, args, opts);
}

/** Path to a dependency's local binary, or `null` if it does not exist. */
export function localBin(relPath) {
  const p = join(ROOT, 'node_modules', ...relPath.split('/'));
  return existsSync(p) ? p : null;
}

/** `true` if the package is installed in the root node_modules. */
export function hasPackage(name) {
  return existsSync(join(ROOT, 'node_modules', ...name.split('/'), 'package.json'));
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** Recursive list of files, ignoring `node_modules`, `.git` and `dist`. */
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

/** Path relative to the root, always with forward slashes, for the report. */
export function rel(file) {
  return relative(ROOT, file).split(sep).join('/');
}

/** Line number (1-based) of an index inside the text. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/** Temporary directory for the run. Removed at the end by the orchestrator. */
export function makeScratch() {
  const dir = join(tmpdir(), `voodoo-quality-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function cleanScratch(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* better to leave junk in temp than to bring the report down */
  }
}

export function writeTemp(dir, name, content) {
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  return file;
}

// ---------------------------------------------------------------------------
// Sizes
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
// Code comments
// ---------------------------------------------------------------------------

/**
 * Replaces comments and string literals with spaces, preserving offsets.
 *
 * This keeps the security and dead code gates from flagging an occurrence that
 * only appears inside a comment or inside an error message.
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
// Findings
// ---------------------------------------------------------------------------

/**
 * A finding. `level` states the weight; `file`/`line` point to where;
 * `expected`/`actual` exist so the orchestrator can print "expected X, got Y".
 */
export function finding(level, message, extra = {}) {
  return { level, message, ...extra };
}

export const fail = (message, extra) => finding('fail', message, extra);
export const warn = (message, extra) => finding('warn', message, extra);
export const note = (message, extra) => finding('note', message, extra);

/** Status derived from a list of findings. */
export function statusFromFindings(findings, { emptyStatus = STATUS.PASS } = {}) {
  if (findings.some((f) => f.level === 'fail')) return STATUS.FAIL;
  if (findings.some((f) => f.level === 'warn')) return STATUS.WARN;
  return emptyStatus;
}

export { pathToFileURL, existsSync, join, dirname, resolve };
