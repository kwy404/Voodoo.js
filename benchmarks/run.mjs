/**
 * Executor principal dos benchmarks da Voodoo.js.
 *
 * ```
 * node benchmarks/run.mjs                  # tudo
 * node benchmarks/run.mjs core lists       # so estes grupos
 * node --expose-gc benchmarks/run.mjs      # com medicao de heap confiavel
 * node benchmarks/run.mjs --baseline       # grava tambem results/baseline.json
 * node benchmarks/run.mjs --quick          # menos amostras, para iterar
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';
import { installDom, loadVoodoo, buildBundle } from './harness/dom.mjs';
import { captureEnv, gcAvailable } from './harness/env.mjs';
import { runSuite, rate, curves } from './harness/runner.mjs';
import { persist, writeReport, consoleLine, toMarkdown } from './harness/report.mjs';
import { benchRoot, resultsDir } from './harness/paths.mjs';

const SUITES = {
  core: () => import('./core/index.mjs'),
  parser: () => import('./parser/index.mjs'),
  dom: () => import('./dom/index.mjs'),
  directives: () => import('./directives/index.mjs'),
  lists: () => import('./lists/index.mjs'),
  components: () => import('./components/index.mjs'),
  startup: () => import('./startup/index.mjs'),
  memory: () => import('./memory/index.mjs'),
  stress: () => import('./stress/index.mjs'),
  vanilla: () => import('./vanilla/index.mjs'),
};

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const wanted = argv.filter((a) => !a.startsWith('--'));

const quick = flags.has('--quick');
const asBaseline = flags.has('--baseline');
const suffix = asBaseline ? '-baseline' : '';

async function main() {
  const t0 = Date.now();

  console.log('Voodoo.js benchmarks');
  console.log('--------------------');
  const build = await buildBundle({ force: flags.has('--rebuild') });
  console.log(`bundle: ${(build.bytes / 1024).toFixed(1)} KB${build.rebuilt ? ` (rebuilt in ${build.buildMs.toFixed(0)} ms)` : ' (cached)'}`);
  console.log(`source: ${build.source}${build.sha ? ` @ ${build.sha.slice(0, 12)}` : ''}`);

  if (!gcAvailable()) {
    console.log('WARNING: running without --expose-gc. Heap numbers are advisory; use `node --expose-gc benchmarks/run.mjs`.');
  }

  installDom();
  const V = await loadVoodoo();
  // O observador global do DOM transformaria cada insercao de linha em trabalho
  // extra assincrono e tornaria a medicao nao-deterministica. As suites chamam
  // `walk()` explicitamente, que e o mesmo caminho de codigo que o observador
  // usaria. Isto esta documentado no README como limitacao conhecida.
  V.config.autoDiscover = false;

  const names = wanted.length ? wanted : Object.keys(SUITES);
  const unknown = names.filter((n) => !SUITES[n]);
  if (unknown.length) {
    console.error(`suite desconhecida: ${unknown.join(', ')}. Disponiveis: ${Object.keys(SUITES).join(', ')}`);
    process.exit(2);
  }

  let allCases = [];
  for (const name of names) {
    const mod = await SUITES[name]();
    const built = await mod.default(V);
    allCases.push(...built);
  }

  if (quick) {
    for (const c of allCases) {
      c.samples = Math.max(5, Math.round((c.samples ?? 30) / 4));
      c.warmup = Math.min(c.warmup ?? 5, 2);
    }
  }

  console.log(`running ${allCases.length} cases across ${names.length} suites\n`);

  const results = await runSuite(allCases, {
    onProgress: (r) => console.log(consoleLine(r)),
  });

  rate(results);
  const curveList = curves(results);

  const run = {
    schemaVersion: 1,
    env: captureEnv({
      bundleBytes: build.bytes,
      quick,
      suites: names,
      measuredSource: build.source,
      measuredSha: build.sha,
      sourceFallback: build.fallback ?? false,
      compileError: build.compileError ?? null,
      buildMode: `esbuild-bundle(${build.source}, src/index.ts, esm, es2020, unminified)`,
    }),
    wallMs: Date.now() - t0,
    results,
    curves: curveList,
  };

  const written = persist(run, { asBaseline, suffix });
  const report = writeReport(run, asBaseline ? 'baseline.md' : 'latest.md');

  console.log('\n--------------------');
  const bad = results.filter((r) => r.status !== 'ok');
  const unverified = results.filter((r) => r.status === 'ok' && !r.verified);
  console.log(`${results.length} cases, ${bad.length} failed/invalid, ${unverified.length} unverified`);
  if (curveList.length) {
    console.log('\ngrowth curves:');
    for (const c of curveList) {
      console.log(`  ${c.curve}: n x${c.nFactor?.toFixed(0)} -> time x${c.timeFactor?.toFixed(1)}  => ${c.complexity} (exp ${c.exponent?.toFixed(2)})`);
    }
  }
  console.log('\nwrote:');
  for (const f of written) console.log('  ' + path.relative(benchRoot, f));
  console.log('  ' + path.relative(benchRoot, report));

  if (bad.length) process.exitCode = flags.has('--ci') ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
