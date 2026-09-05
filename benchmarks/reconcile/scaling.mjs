/**
 * How the cost of one edit grows with the size of the list.
 *
 *   node --expose-gc --max-old-space-size=8192 benchmarks/reconcile/scaling.mjs --out=scaling-after.json
 *   node --expose-gc --max-old-space-size=8192 benchmarks/reconcile/scaling.mjs --src=benchmarks/.build/src-before --out=scaling-before.json
 *
 * The main benchmark answers "how long does this take on ten thousand rows".
 * This one answers the question behind it: does the reconciler charge for the
 * rows it changed, or for the rows that happen to be sitting next to them?
 *
 * The same single-row edit is timed on lists from 1.000 to 50.000. A flat line
 * is O(1) in the size of the list; a straight rising line is O(n). Which line
 * an operation draws is the whole claim, and it is not something a single
 * measurement at one size can show.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installDom } from '../harness/dom.mjs';
import { captureEnv, forceGC } from '../harness/env.mjs';
import { summarize } from '../harness/stats.mjs';
import { repoRoot, buildDir, srcRoot, resultsDir } from '../harness/paths.mjs';
import { buildRows } from './cases.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const SIZES = [1000, 2000, 5000, 10000, 20000, 50000];
const TEMPLATE = `<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>`;

/** Fewer samples on the big lists; each one still has to build the list first. */
const samplesFor = (n) => (n >= 20000 ? 25 : n >= 10000 ? 40 : 60);

async function buildTarget(srcDir) {
  const esbuild = await import('esbuild');
  fs.mkdirSync(buildDir, { recursive: true });
  const abs = path.resolve(repoRoot, srcDir);
  const stamp = abs.replace(/[^a-z0-9]+/gi, '-').slice(-40);
  const entry = path.join(buildDir, `scaling-entry-${stamp}.ts`);
  const outfile = path.join(buildDir, `scaling-${stamp}.mjs`);
  let rel = path.relative(buildDir, path.join(abs, 'index.ts')).replace(/\\/g, '/').replace(/\.ts$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  fs.writeFileSync(entry, `export * from '${rel}';\n`, 'utf8');
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    outfile,
    minify: false,
    logLevel: 'silent',
  });
  return { file: outfile, srcDir: abs };
}

const srcDir = flag('src', srcRoot);
const target = await buildTarget(srcDir);

installDom();
const V = await import(pathToFileURL(target.file).href);
V.config.autoDiscover = false;

const mount = (rows) => {
  const root = document.createElement('div');
  root.innerHTML = TEMPLATE;
  document.body.appendChild(root);
  const state = V.reactive({ rows });
  V.walk(root, new V.Scope(state));
  V.flushSync();
  return { root, state };
};

/**
 * The four operations worth putting side by side.
 *
 * Each `apply` does exactly one thing and each `restore` undoes it, so the list
 * is the same size at the start of every sample. Anything that builds a payload
 * happens in `prepare`, outside the clock.
 */
const OPERATIONS = [
  {
    id: 'inplace/splice-remove-middle',
    label: 'remove 1 in the middle (in place)',
    prepare: () => null,
    apply: (ctx) => {
      ctx.removed = ctx.state.rows.splice(ctx.mid, 1)[0];
      V.flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.splice(ctx.mid, 0, ctx.removed);
      V.flushSync();
    },
  },
  {
    id: 'inplace/push',
    label: 'append 1 (in place)',
    prepare: () => null,
    apply: (ctx) => {
      ctx.state.rows.push(ctx.extra);
      V.flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows.pop();
      V.flushSync();
    },
  },
  {
    id: 'replace/remove-middle',
    label: 'remove 1 in the middle (new array)',
    prepare: (ctx) => {
      const next = ctx.base.slice();
      next.splice(ctx.mid, 1);
      return next;
    },
    apply: (ctx, next) => {
      ctx.state.rows = next;
      V.flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      V.flushSync();
    },
  },
  {
    id: 'replace/append',
    label: 'append 1 (new array)',
    prepare: (ctx) => ctx.base.concat([ctx.extra]),
    apply: (ctx, next) => {
      ctx.state.rows = next;
      V.flushSync();
    },
    restore: (ctx) => {
      ctx.state.rows = ctx.base;
      V.flushSync();
    },
  },
];

const points = [];

for (const n of SIZES) {
  for (const op of OPERATIONS) {
    const ctx = mount(buildRows(n));
    ctx.base = ctx.state.rows.slice();
    ctx.mid = n >> 1;
    ctx.extra = buildRows(1, 5, 9000001)[0];

    for (let i = 0; i < 5; i++) {
      op.apply(ctx, op.prepare(ctx));
      op.restore(ctx);
    }
    forceGC();

    const samples = new Array(samplesFor(n));
    for (let i = 0; i < samples.length; i++) {
      const payload = op.prepare(ctx);
      const t0 = process.hrtime.bigint();
      op.apply(ctx, payload);
      samples[i] = Number(process.hrtime.bigint() - t0) / 1e6;
      op.restore(ctx);
    }

    const got = ctx.root.querySelectorAll('li').length;
    if (got !== n) throw new Error(`${op.id} @ ${n}: list ended at ${got} rows`);

    V.destroy(ctx.root);
    ctx.root.remove();
    document.body.innerHTML = '';
    forceGC();

    const stats = summarize(samples);
    points.push({ op: op.id, label: op.label, n, median: stats.median, p95: stats.p95, samples: samples.length });
    console.log(
      `  ${op.id.padEnd(30)} n=${String(n).padStart(6)}  median ${stats.median.toFixed(3)} ms  p95 ${stats.p95.toFixed(3)}`
    );
  }
}

const out = flag('out');
if (out) {
  const file = path.isAbsolute(out) ? out : path.join(resultsDir, out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        schemaVersion: 1,
        kind: 'reconcile-scaling',
        env: captureEnv({ measuredSrc: path.relative(repoRoot, target.srcDir) || '.' }),
        sizes: SIZES,
        points,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nwritten: ${path.relative(repoRoot, file)}`);
}
