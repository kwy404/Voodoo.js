/**
 * Reconciliation benchmark: `v-for` on large lists.
 *
 * ```
 * node --expose-gc benchmarks/reconcile/run.mjs --out=before.json
 * node --expose-gc benchmarks/reconcile/run.mjs --src=benchmarks/.build/src-before --out=before.json
 * node benchmarks/reconcile/run.mjs --compare before.json after.json
 * node benchmarks/reconcile/run.mjs --quick            # fewer iterations, to iterate
 * node benchmarks/reconcile/run.mjs --only=remove      # substring filter on case ids
 * ```
 *
 * Two passes per case, and the order matters:
 *
 *  1. TIME, with the counters OFF. Instrumentation must never appear inside a
 *     measured number.
 *  2. COUNTERS, with them ON, over a handful of extra iterations. These say
 *     WHY a number moved: how many rows the reconciler looked at, how many
 *     writes went through a proxy, how many nodes it created, removed, moved.
 *
 * `--src` points at any copy of `packages/voodoojs/src`. That is what makes a
 * before/after honest: the same harness, the same machine, the same minute,
 * two source trees.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installDom } from '../harness/dom.mjs';
import { captureEnv, forceGC, gcAvailable } from '../harness/env.mjs';
import { summarize } from '../harness/stats.mjs';
import { repoRoot, buildDir, srcRoot, resultsDir } from '../harness/paths.mjs';
import buildCases from './cases.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const DEFAULT_ITERATIONS = 100;
const COUNTER_ITERATIONS = 3;
const WARMUP = 5;

/**
 * How long one case may spend collecting samples.
 *
 * A hundred samples is the right target and a terrible hard rule. Reversing
 * ten thousand rows on the old algorithm moves nearly every node, and jsdom
 * charges for each one against a ten-thousand-child parent: a single sample can
 * take minutes, and a hundred of them will not finish today. Sampling stops at
 * the budget with whatever it has, the count is reported next to every number,
 * and a case that ran short says so instead of quietly meaning less than the
 * one beside it.
 */
const BUDGET_MS = Number((process.argv.find((a) => a.startsWith('--budget=')) || '').slice(9)) || 45_000;

/**
 * Fewer than this and the spread means nothing, so the budget waits for them —
 * but only up to a point. Swapping two rows of ten thousand on the OLD
 * algorithm cascades into ten thousand `insertBefore` calls against a
 * ten-thousand-child parent, which jsdom charges for quadratically: one sample
 * runs for minutes, and "at least six" then means "at least half an hour". Past
 * the hard stop the case reports what it has and says how many that was.
 */
const MIN_SAMPLES = 3;
const HARD_STOP_MS = BUDGET_MS * 4;

// ---------------------------------------------------------------------------
// Building the module under test
// ---------------------------------------------------------------------------

/**
 * Compiles a bundle that exposes the public API AND the internal counters.
 *
 * The entry point is generated rather than committed because it has to import
 * from whichever `src` tree is being measured, and `--src` makes that a moving
 * target. `runtime/metrics` is deliberately absent from `src/index.ts` — the
 * counters are not public API — so the only way to reach them is an entry of
 * our own, which is exactly what `compileEntry` exists for.
 */
async function buildTarget(srcDir) {
  const esbuild = await import('esbuild');
  fs.mkdirSync(buildDir, { recursive: true });

  const abs = path.resolve(repoRoot, srcDir);
  if (!fs.existsSync(path.join(abs, 'index.ts'))) {
    throw new Error(`no index.ts under ${abs}`);
  }
  const hasMetrics = fs.existsSync(path.join(abs, 'runtime', 'metrics.ts'));

  const stamp = abs.replace(/[^a-z0-9]+/gi, '-').slice(-40);
  const entry = path.join(buildDir, `reconcile-entry-${stamp}.ts`);
  const outfile = path.join(buildDir, `reconcile-${stamp}.mjs`);

  const rel = (p) => {
    const r = path.relative(buildDir, p).replace(/\\/g, '/').replace(/\.ts$/, '');
    // A sibling directory comes back as "src-before/index", which esbuild reads
    // as a package name rather than as a path.
    return r.startsWith('.') ? r : './' + r;
  };
  const lines = [`export * from '${rel(path.join(abs, 'index.ts'))}';`];
  if (hasMetrics) {
    lines.push(`export * as metrics from '${rel(path.join(abs, 'runtime', 'metrics.ts'))}';`);
  } else {
    // A tree without the counters still measures time; the counter pass is
    // simply skipped and the report says so, rather than reporting zeroes as
    // though the algorithm had done no work.
    lines.push('export const metrics = null;');
  }
  fs.writeFileSync(entry, lines.join('\n'), 'utf8');

  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    outfile,
    sourcemap: false,
    minify: false,
    logLevel: 'silent',
  });

  return { file: outfile, hasMetrics, srcDir: abs, bytes: fs.statSync(outfile).size };
}

// ---------------------------------------------------------------------------
// Running one case
// ---------------------------------------------------------------------------

function fail(id, message) {
  throw new Error(`${id}: ${message}`);
}

/** Median of a sample set, used only to decide how many counting rounds to run. */
function stats0(samples) {
  if (!samples.length) return 0;
  const asc = [...samples].sort((a, b) => a - b);
  return asc[Math.floor(asc.length / 2)];
}

/** One full cycle: prepare (untimed) -> apply (timed) -> verify -> restore. */
function cycle(c, ctx, timed) {
  const payload = c.prepare ? c.prepare(ctx) : null;
  // Cases that build or drop tens of thousands of jsdom nodes leave hundreds of
  // megabytes of garbage behind every iteration. Collecting it BEFORE the timer
  // starts is the difference between measuring the algorithm and measuring a
  // mark-compact that happened to land in the middle of the sample.
  if (timed && c.gcPerSample) forceGC();
  let ms = 0;
  if (timed) {
    const t0 = process.hrtime.bigint();
    c.apply(ctx, payload);
    ms = Number(process.hrtime.bigint() - t0) / 1e6;
  } else {
    c.apply(ctx, payload);
  }
  const ok = c.verify ? c.verify(ctx) : true;
  if (ok !== true) fail(c.id, ok);
  if (c.restore) c.restore(ctx);
  return ms;
}

function runCase(c, V, metricsApi, { quick }) {
  const iterations = Math.max(
    5,
    quick ? Math.round((c.iterations ?? DEFAULT_ITERATIONS) / 10) : (c.iterations ?? DEFAULT_ITERATIONS)
  );

  // --- pass 1: time, counters off ------------------------------------------
  if (metricsApi) metricsApi.setListMetrics(false);
  const ctx = c.setup();
  for (let i = 0; i < WARMUP; i++) cycle(c, ctx, false);
  forceGC();

  const samples = [];
  const started = Date.now();
  const deadline = started + BUDGET_MS;
  const hardStop = started + HARD_STOP_MS;
  for (let i = 0; i < iterations; i++) {
    samples.push(cycle(c, ctx, true));
    if (samples.length >= MIN_SAMPLES && Date.now() > deadline) break;
    if (Date.now() > hardStop) break;
  }
  const budgeted = samples.length < iterations;
  c.teardown?.(ctx);
  forceGC();

  // --- pass 2: counters, on a fresh list -----------------------------------
  let counters = null;
  if (metricsApi) {
    // One counting cycle is enough when a cycle is expensive: the counters are
    // exact, not sampled, so repeating them buys nothing but wall clock.
    const rounds = stats0(samples) > 250 ? 1 : COUNTER_ITERATIONS;
    const ctx2 = c.setup();
    cycle(c, ctx2, false); // warm, so first-run effects do not pollute the count
    metricsApi.setListMetrics(true);
    metricsApi.resetListMetrics();
    for (let i = 0; i < rounds; i++) cycle(c, ctx2, false);
    const raw = metricsApi.readListMetrics();
    metricsApi.setListMetrics(false);
    c.teardown?.(ctx2);

    // `restore` runs a reconciliation of its own, and it is not the operation
    // under test. Dividing by the number of full cycles keeps the counters on
    // the same scale as the timings: "per iteration", restore included, which
    // is stated rather than silently assumed.
    counters = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'on') continue;
      if (k === 'paths') {
        counters.paths = raw.paths;
        continue;
      }
      counters[k] = v / rounds;
    }
  }

  const stats = summarize(samples);
  return {
    id: c.id,
    name: c.name,
    group: c.group,
    n: c.n,
    notes: c.notes ?? null,
    iterations: samples.length,
    requested: iterations,
    budgeted,
    verified: true,
    stats,
    counters,
  };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const ms = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(3));
const num = (v) => (v === undefined || v === null ? '-' : v >= 1000 ? Math.round(v).toLocaleString('en-US') : String(Math.round(v * 100) / 100));

function consoleLine(r) {
  const s = r.stats;
  return (
    `  ${r.id.padEnd(42)} median ${ms(s.median).padStart(9)} ms` +
    `  p95 ${ms(s.p95).padStart(9)}` +
    `  min ${ms(s.min).padStart(9)}` +
    `  (n=${r.iterations}${r.budgeted ? ' budgeted' : ''}, rsd ${s.rsd.toFixed(1)}%)`
  );
}

function timingTable(results) {
  const head = ['| case | n | iters | median | p75 | p95 | min | max | rsd |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  const rows = results.map((r) => {
    const s = r.stats;
    return `| \`${r.id}\` | ${r.n} | ${r.iterations} | ${ms(s.median)} | ${ms(s.p75)} | ${ms(s.p95)} | ${ms(s.min)} | ${ms(s.max)} | ${s.rsd.toFixed(1)}% |`;
  });
  return [...head, ...rows].join('\n');
}

const COUNTER_COLUMNS = [
  ['itemsVisited', 'visited'],
  ['keyEvaluations', 'keyEvals'],
  ['proxyWrites', 'proxyWr'],
  ['scopeAllocations', 'scopes'],
  ['arrayAllocations', 'allocs'],
  ['keyMapLookups', 'mapGets'],
  ['domCreates', 'create'],
  ['domRemoves', 'remove'],
  ['domMoves', 'move'],
];

function counterTable(results) {
  const head = [
    `| case | ${COUNTER_COLUMNS.map(([, l]) => l).join(' | ')} | paths |`,
    `| --- | ${COUNTER_COLUMNS.map(() => '---:').join(' | ')} | --- |`,
  ];
  const rows = results
    .filter((r) => r.counters)
    .map((r) => {
      const cells = COUNTER_COLUMNS.map(([k]) => num(r.counters[k]));
      const paths = Object.entries(r.counters.paths || {})
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
      return `| \`${r.id}\` | ${cells.join(' | ')} | ${paths || '-'} |`;
    });
  return [...head, ...rows].join('\n');
}

function compare(beforeFile, afterFile) {
  const a = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
  const b = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
  const byId = new Map(b.results.map((r) => [r.id, r]));

  const lines = [
    '| case | before (median) | after (median) | speedup | time saved |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  const counterLines = [
    '| case | itemsVisited | proxyWrites | allocations | keyMapLookups |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const before of a.results) {
    const after = byId.get(before.id);
    if (!after) continue;
    const bm = before.stats.median;
    const am = after.stats.median;
    const speedup = bm / am;
    const saved = ((bm - am) / bm) * 100;
    lines.push(
      `| \`${before.id}\` | ${ms(bm)} ms | ${ms(am)} ms | **${speedup.toFixed(2)}x** | ${saved >= 0 ? '' : '+'}${(-saved).toFixed(0) === '0' ? '0' : (saved).toFixed(0)}% |`
    );
    if (before.counters && after.counters) {
      const cell = (k) => `${num(before.counters[k])} -> ${num(after.counters[k])}`;
      counterLines.push(
        `| \`${before.id}\` | ${cell('itemsVisited')} | ${cell('proxyWrites')} | ${cell('arrayAllocations')} | ${cell('keyMapLookups')} |`
      );
    }
  }

  console.log('\n## Time\n');
  console.log(lines.join('\n'));
  console.log('\n## Work done\n');
  console.log(counterLines.join('\n'));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (has('compare') || argv[0] === '--compare') {
    const files = argv.filter((a) => !a.startsWith('--'));
    if (files.length !== 2) {
      console.error('usage: --compare <before.json> <after.json>');
      process.exit(2);
    }
    compare(files[0], files[1]);
    return;
  }

  const srcDir = flag('src', srcRoot);
  const quick = has('quick');
  const only = flag('only');

  console.log('Voodoo.js — list reconciliation benchmark');
  console.log('----------------------------------------');
  const target = await buildTarget(srcDir);
  console.log(`source:  ${path.relative(repoRoot, target.srcDir) || '.'}`);
  console.log(`bundle:  ${(target.bytes / 1024).toFixed(1)} KB`);
  console.log(`counters: ${target.hasMetrics ? 'available' : 'NOT AVAILABLE in this tree — timings only'}`);
  if (!gcAvailable()) console.log('WARNING: no --expose-gc; GC pauses land inside samples.');

  installDom();
  const V = await import(pathToFileURL(target.file).href);
  V.config.autoDiscover = false;

  const metricsApi = target.hasMetrics ? V.metrics : null;
  let cases = buildCases(V);
  if (only) cases = cases.filter((c) => c.id.includes(only));
  console.log(`\nrunning ${cases.length} cases\n`);

  const results = [];
  for (const c of cases) {
    const r = runCase(c, V, metricsApi, { quick });
    results.push(r);
    console.log(consoleLine(r));
    document.body.innerHTML = '';
    forceGC();
  }

  const run = {
    schemaVersion: 1,
    kind: 'reconcile',
    env: captureEnv({ measuredSrc: path.relative(repoRoot, target.srcDir) || '.', quick, counters: target.hasMetrics }),
    results,
  };

  const out = flag('out');
  if (out) {
    const file = path.isAbsolute(out) ? out : path.join(resultsDir, out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(run, null, 2), 'utf8');
    console.log(`\nwritten: ${path.relative(repoRoot, file)}`);
  }

  console.log('\n## Timings\n');
  console.log(timingTable(results));
  if (target.hasMetrics) {
    console.log('\n## Work per iteration (counters)\n');
    console.log(counterTable(results));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
