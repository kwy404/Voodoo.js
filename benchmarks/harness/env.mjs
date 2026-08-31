/**
 * @module benchmarks/harness/env
 *
 * Captura o ambiente da medicao. Todo resultado carrega este bloco: um numero
 * sem a maquina que o produziu nao serve para comparar nada.
 */

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { repoRoot } from './paths.mjs';

function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** `true` quando o processo foi iniciado com `--expose-gc`. */
export function gcAvailable() {
  return typeof globalThis.gc === 'function';
}

/** Forca uma coleta quando `--expose-gc` estiver ligado. Devolve se coletou. */
export function forceGC() {
  if (typeof globalThis.gc !== 'function') return false;
  globalThis.gc();
  return true;
}

export function captureEnv(extra = {}) {
  const cpus = os.cpus();
  const pkg = readJSON(path.join(repoRoot, 'packages', 'voodoojs', 'package.json'));
  const rootPkg = readJSON(path.join(repoRoot, 'package.json'));
  const jsdomPkg = readJSON(path.join(repoRoot, 'node_modules', 'jsdom', 'package.json'));

  return {
    timestamp: new Date().toISOString(),
    voodooVersion: pkg?.version ?? 'unknown',
    commit: git(['rev-parse', 'HEAD']),
    commitShort: git(['rev-parse', '--short', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: git(['status', '--porcelain']) ? true : false,
    node: process.version,
    v8: process.versions.v8,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpuModel: cpus[0]?.model?.trim() ?? 'unknown',
    cpuCores: cpus.length,
    cpuSpeedMHz: cpus[0]?.speed ?? null,
    totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemMB: Math.round(os.freemem() / 1024 / 1024),
    loadAvg: os.loadavg(),
    jsdom: jsdomPkg?.version ?? 'not installed',
    gcExposed: gcAvailable(),
    // O runner sempre mede a partir do codigo-fonte compilado na hora pelo
    // esbuild, e nao do `dist`. Assim a medicao nunca fica presa a um build
    // antigo. O modo aparece no relatorio para nao restar duvida.
    buildMode: extra.buildMode ?? 'esbuild-bundle(src/index.ts, esm, es2020, unminified)',
    nodeFlags: process.execArgv,
    monorepoVersion: rootPkg?.version ?? 'unknown',
    ...extra,
  };
}

/** Bloco de ambiente formatado em markdown. */
export function envMarkdown(env) {
  const rows = [
    ['Timestamp', env.timestamp],
    ['Voodoo version', env.voodooVersion],
    ['Commit', `${env.commitShort ?? '?'}${env.dirty ? ' (working tree dirty)' : ''}`],
    ['Branch', env.branch ?? '?'],
    ['OS', `${env.platform} (${env.arch})`],
    ['CPU', `${env.cpuModel} — ${env.cpuCores} logical cores @ ${env.cpuSpeedMHz} MHz`],
    ['RAM', `${env.totalMemMB} MB total, ${env.freeMemMB} MB free at start`],
    ['Node', `${env.node} (V8 ${env.v8})`],
    ['jsdom', env.jsdom],
    ['GC exposed', env.gcExposed ? 'yes (--expose-gc)' : 'NO — heap numbers are advisory only'],
    ['Build mode', env.buildMode],
    ['Node flags', env.nodeFlags.length ? env.nodeFlags.join(' ') : '(none)'],
  ];
  return ['| Field | Value |', '| --- | --- |', ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join('\n');
}
