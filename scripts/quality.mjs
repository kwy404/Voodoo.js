#!/usr/bin/env node
/**
 * Voodoo.js quality orchestrator.
 *
 *   node scripts/quality.mjs                      full report in terminal
 *   node scripts/quality.mjs --ci                 exit != 0 if there is any FAIL
 *   node scripts/quality.mjs --report             writes QUALITY_REPORT.md
 *   node scripts/quality.mjs --json               structured output
 *   node scripts/quality.mjs --only=docs,bundle   runs only these checks
 *   node scripts/quality.mjs --skip=browser       skips these
 *   node scripts/quality.mjs --only=api-compatibility --update
 *
 * The rule that governs this program: no false results. When the tool that would
 * support a check does not exist in the environment, the result is SKIP with
 * instructions on how to enable it, never a PASS. A green panel that lies is worse
 * than no panel, because it disappears with the question unanswered.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  ROOT,
  SRC_DIR,
  STATUS,
  cleanScratch,
  hasPackage,
  makeScratch,
  readJson,
  rel,
  run as runCommand,
  walkFiles,
} from './quality/lib.mjs';
import { runVitest } from './quality/vitest-report.mjs';
import { scoreAll } from './quality/scorecard.mjs';

// On Windows, calling `npm` requires `shell: true`, and Node 24 emits DEP0190 because
// of this with every call. There is no alternative (npm binaries are .cmd files)
// and the warning would pollute the report, so only this one is silenced. Any other
// warning continues to appear.
process.on('warning', (w) => {
  if (w.name === 'DeprecationWarning' && /shell option true/.test(w.message)) return;
  console.warn(`${w.name}: ${w.message}`);
});

// ---------------------------------------------------------------------------
// Check registry
// ---------------------------------------------------------------------------

/** Display order. The `label` is what appears in the table. */
const CHECKS = [
  { id: 'correctness', label: 'Correctness', module: './quality/correctness.mjs' },
  { id: 'unit', label: 'Unit Tests', module: './quality/unit.mjs' },
  { id: 'integration', label: 'Integration', module: './quality/integration.mjs' },
  { id: 'browser', label: 'Browser Tests', module: './quality/browser.mjs' },
  { id: 'typescript', label: 'TypeScript', module: './quality/typescript.mjs' },
  { id: 'security', label: 'Security', module: './quality/security.mjs' },
  { id: 'accessibility', label: 'Accessibility', module: './quality/accessibility.mjs' },
  { id: 'bundle', label: 'Bundle', module: './quality/bundle.mjs' },
  { id: 'performance', label: 'Performance', module: './quality/performance.mjs' },
  { id: 'memory', label: 'Memory', module: './quality/memory.mjs' },
  { id: 'api-compatibility', label: 'API Compatibility', module: './quality/api-compatibility.mjs' },
  { id: 'docs', label: 'Docs', module: './quality/docs.mjs' },
  { id: 'dead-code', label: 'Dead Code', module: './quality/dead-code.mjs' },
];

/** Width of the label column, counting dot padding. */
const LABEL_WIDTH = 20;

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const flags = {
    json: false,
    ci: false,
    report: false,
    update: false,
    only: null,
    skip: null,
    reportPath: join(ROOT, 'QUALITY_REPORT.md'),
  };

  for (const arg of argv) {
    if (arg === '--json') flags.json = true;
    else if (arg === '--ci') flags.ci = true;
    else if (arg === '--report') flags.report = true;
    else if (arg === '--update') flags.update = true;
    else if (arg.startsWith('--only=')) flags.only = arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--skip=')) flags.skip = arg.slice(7).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--report=')) {
      flags.report = true;
      flags.reportPath = join(ROOT, arg.slice(9));
    } else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg.startsWith('--')) flags.unknown = (flags.unknown ?? []).concat(arg);
  }

  return flags;
}

function selectChecks(flags) {
  let list = CHECKS;
  if (flags.only) {
    const wanted = new Set(flags.only);
    list = list.filter((c) => wanted.has(c.id));
  }
  if (flags.skip) {
    const unwanted = new Set(flags.skip);
    list = list.filter((c) => !unwanted.has(c.id));
  }
  return list;
}

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

function makeContext(flags) {
  const scratch = makeScratch();
  let vitestPromise = null;

  return {
    root: ROOT,
    scratch,
    flags,
    /** Runs the suite once, no matter how many checks need it. */
    vitest() {
      if (!vitestPromise) vitestPromise = Promise.resolve().then(() => runVitest(scratch));
      return vitestPromise;
    },
    coverage: hasPackage('@vitest/coverage-v8') || hasPackage('@vitest/coverage-istanbul'),
    sourceFileCount: walkFiles(SRC_DIR, { filter: (f) => /\.tsx?$/.test(f) }).length,
    tsconfig: readJson(join(ROOT, 'tsconfig.base.json'))?.compilerOptions ?? {},
  };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

async function runCheck(check, ctx) {
  const startedAt = Date.now();
  try {
    const mod = await import(check.module);
    const result = await mod.run(ctx);
    return {
      ...check,
      label: mod.meta?.label ?? check.label,
      durationMs: Date.now() - startedAt,
      result: {
        status: result.status ?? STATUS.FAIL,
        summary: result.summary ?? '',
        findings: result.findings ?? [],
        details: result.details ?? {},
      },
    };
  } catch (err) {
    return {
      ...check,
      durationMs: Date.now() - startedAt,
      result: {
        status: STATUS.FAIL,
        summary: 'the check itself broke',
        findings: [
          {
            level: 'fail',
            message: `The check "${check.id}" threw an exception`,
            file: check.module,
            expected: 'execution without error',
            actual: `${err && err.message}\n${(err && err.stack) || ''}`.slice(0, 900),
          },
        ],
        details: {},
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Terminal output
// ---------------------------------------------------------------------------

function tableLine(label, result) {
  const dots = '.'.repeat(Math.max(1, LABEL_WIDTH - label.length - 1));
  const detail = result.summary ? `  (${result.summary})` : '';
  return `  ${label} ${dots} ${result.status}${detail}`;
}

function describeFinding(finding) {
  const lines = [];
  const where = finding.file
    ? `${finding.file}${finding.line ? `:${finding.line}` : ''}${finding.column ? `:${finding.column}` : ''}`
    : null;
  lines.push(`  - ${finding.message}`);
  if (where) lines.push(`      where:    ${where}`);
  if (finding.expected) lines.push(`      expected: ${finding.expected}`);
  if (finding.actual) {
    const actual = String(finding.actual).split('\n');
    lines.push(`      actual:   ${actual[0]}`);
    for (const extra of actual.slice(1, 6)) lines.push(`                ${extra}`);
  }
  return lines.join('\n');
}

function printReport(results, ctx) {
  const out = [];
  out.push('');
  out.push('Voodoo.js Quality Report');
  out.push('');
  for (const entry of results) out.push(tableLine(entry.label, entry.result));
  out.push('');

  for (const entry of results) {
    const problems = entry.result.findings.filter((f) => f.level === 'fail' || f.level === 'warn');
    if (!problems.length) continue;
    const fails = problems.filter((f) => f.level === 'fail').length;
    const warns = problems.length - fails;
    out.push(`${entry.label} — ${fails} FAIL, ${warns} WARN`);
    for (const finding of problems) out.push(describeFinding(finding));
    out.push('');
  }

  const skipped = results.filter((e) => e.result.status === STATUS.SKIP);
  if (skipped.length) {
    out.push('SKIP: what is missing to enable');
    for (const entry of skipped) {
      const how = entry.result.details?.howToEnable;
      out.push(`  - ${entry.label}: ${entry.result.summary}`);
      if (how) out.push(`      enable: ${how}`);
    }
    out.push('');
  }

  const { rows, overall } = scoreAll(results, ctx);
  out.push(`Overall score: ${overall.toFixed(1)}/10`);
  for (const row of rows) {
    out.push(`  ${row.label.padEnd(LABEL_WIDTH - 2)} ${row.score.toFixed(1)}`);
  }
  out.push('');

  console.log(out.join('\n'));
}

// ---------------------------------------------------------------------------
// QUALITY_REPORT.md
// ---------------------------------------------------------------------------

function gitInfo() {
  const sha = runCommand('git', ['rev-parse', 'HEAD']).stdout.trim();
  const shortSha = runCommand('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();
  const branch = runCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  const dirty = runCommand('git', ['status', '--porcelain']).stdout.trim().length > 0;
  return { sha, shortSha, branch, dirty };
}

function mdEscape(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function findingsTable(findings) {
  const rows = findings.filter((f) => f.level === 'fail' || f.level === 'warn');
  if (!rows.length) return null;
  const out = ['| level | where | issue | expected | actual |', '| --- | --- | --- | --- | --- |'];
  for (const f of rows) {
    const where = f.file ? `\`${f.file}${f.line ? `:${f.line}` : ''}\`` : '—';
    out.push(
      `| ${f.level.toUpperCase()} | ${where} | ${mdEscape(f.message)} | ${mdEscape(f.expected ?? '—')} | ${mdEscape(
        String(f.actual ?? '—').slice(0, 300)
      )} |`
    );
  }
  return out.join('\n');
}

function buildMarkdown(results, ctx) {
  const git = gitInfo();
  const { rows, overall } = scoreAll(results, ctx);
  const pkg = readJson(join(ROOT, 'packages', 'voodoojs', 'package.json')) ?? {};

  const counts = {
    PASS: results.filter((r) => r.result.status === STATUS.PASS).length,
    WARN: results.filter((r) => r.result.status === STATUS.WARN).length,
    FAIL: results.filter((r) => r.result.status === STATUS.FAIL).length,
    SKIP: results.filter((r) => r.result.status === STATUS.SKIP).length,
  };

  const md = [];
  md.push('# Voodoo.js Quality Report');
  md.push('');
  md.push(
    'Generated by `npm run quality -- --report`. Every number in this file came from the execution ' +
      'described below. Where the tool did not exist in the environment, the result is `SKIP` with ' +
      'instructions on how to enable it, never a convenience `PASS`.'
  );
  md.push('');

  md.push('## Execution');
  md.push('');
  md.push('| field | value |');
  md.push('| --- | --- |');
  md.push(`| date | ${new Date().toISOString()} |`);
  md.push(`| commit | \`${git.sha}\`${git.dirty ? ' (working tree with uncommitted changes)' : ''} |`);
  md.push(`| branch | \`${git.branch}\` |`);
  md.push(`| package | ${pkg.name ?? 'voodoojs'} ${pkg.version ?? ''} |`);
  md.push(`| node | ${process.version} |`);
  md.push(`| platform | ${process.platform} ${process.arch} |`);
  md.push(`| checks | ${results.length} (${counts.PASS} PASS, ${counts.WARN} WARN, ${counts.FAIL} FAIL, ${counts.SKIP} SKIP) |`);
  md.push('');

  md.push('## Summary');
  md.push('');
  md.push('```');
  md.push('Voodoo.js Quality Report');
  md.push('');
  for (const entry of results) md.push(tableLine(entry.label, entry.result));
  md.push('```');
  md.push('');

  md.push('## Scorecard');
  md.push('');
  md.push(`**Overall score: ${overall.toFixed(1)} / 10** (simple average of the dimensions below)`);
  md.push('');
  md.push('| dimension | status | score | justification |');
  md.push('| --- | --- | --- | --- |');
  for (const row of rows) {
    md.push(
      `| ${row.label} | ${row.status} | **${row.score.toFixed(1)}** | ${row.reasons
        .map(mdEscape)
        .join('<br>')} |`
    );
  }
  md.push('');

  md.push('## Findings by check');
  md.push('');
  for (const entry of results) {
    md.push(`### ${entry.label} — ${entry.result.status}`);
    md.push('');
    if (entry.result.summary) md.push(`${entry.result.summary}`);
    md.push('');

    const table = findingsTable(entry.result.findings);
    if (table) {
      md.push(table);
      md.push('');
    }

    const notes = entry.result.findings.filter((f) => f.level === 'note');
    if (notes.length) {
      md.push('<details><summary>Informational notes</summary>');
      md.push('');
      for (const n of notes) {
        const where = n.file ? ` (\`${n.file}${n.line ? `:${n.line}` : ''}\`)` : '';
        md.push(`- ${n.message}${where}${n.actual ? ` — ${n.actual}` : ''}`);
      }
      md.push('');
      md.push('</details>');
      md.push('');
    }

    if (entry.result.status === STATUS.SKIP && entry.result.details?.howToEnable) {
      md.push(`**How to enable:** ${entry.result.details.howToEnable}`);
      md.push('');
    }

    if (entry.result.details && Object.keys(entry.result.details).length) {
      md.push('<details><summary>Collected evidence</summary>');
      md.push('');
      md.push('```json');
      md.push(JSON.stringify(entry.result.details, null, 2).slice(0, 20000));
      md.push('```');
      md.push('');
      md.push('</details>');
      md.push('');
    }
  }

  md.push('## How to reproduce');
  md.push('');
  md.push('```bash');
  md.push('npm run quality              # report in terminal');
  md.push('npm run quality -- --ci      # fail the build if there is any FAIL');
  md.push('npm run quality -- --report  # rewrite this file');
  md.push('npm run quality -- --json    # structured output');
  md.push('```');
  md.push('');

  return md.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
Voodoo.js Quality — check orchestrator

  node scripts/quality.mjs [options]

  --json                structured json output
  --only=a,b            run only these checks
  --skip=a,b            skip these checks
  --ci                  exit code != 0 when there is any FAIL
  --report              writes QUALITY_REPORT.md at root
  --report=PATH         write the report to another path
  --update              rewrite the API snapshot (use with --only=api-compatibility)

  checks: ${CHECKS.map((c) => c.id).join(', ')}
`);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    return 0;
  }
  if (flags.unknown?.length) {
    console.error(`Unknown flag: ${flags.unknown.join(', ')}\nUse --help.`);
    return 2;
  }

  const selected = selectChecks(flags);
  if (!selected.length) {
    console.error('No checks selected. Use --help to see the list.');
    return 2;
  }

  const ctx = makeContext(flags);
  const results = [];

  try {
    for (const check of selected) {
      results.push(await runCheck(check, ctx));
    }

    if (flags.report) {
      writeFileSync(flags.reportPath, buildMarkdown(results, ctx), 'utf8');
    }

    if (flags.json) {
      const { rows, overall } = scoreAll(results, ctx);
      console.log(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            node: process.version,
            platform: `${process.platform} ${process.arch}`,
            git: gitInfo(),
            overallScore: overall,
            checks: results.map((entry) => ({
              id: entry.id,
              label: entry.label,
              status: entry.result.status,
              summary: entry.result.summary,
              durationMs: entry.durationMs,
              findings: entry.result.findings,
              details: entry.result.details,
              score: rows.find((r) => r.id === entry.id)?.score ?? null,
            })),
          },
          null,
          2
        )
      );
    } else {
      printReport(results, ctx);
      if (flags.report) console.log(`Report written to ${rel(flags.reportPath)}\n`);
    }

    const failed = results.filter((entry) => entry.result.status === STATUS.FAIL);
    return failed.length ? 1 : 0;
  } finally {
    cleanScratch(ctx.scratch);
  }
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  process.exitCode = await main();
}

export { CHECKS, main };
