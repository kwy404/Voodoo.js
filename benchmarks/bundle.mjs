/**
 * Analise de bundle isolada.
 *
 * ```
 * npm run build          # obrigatorio: le os arquivos reais de dist/
 * node benchmarks/bundle.mjs
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';
import { analyzeBundle } from './bundle/index.mjs';
import { captureEnv, envMarkdown } from './harness/env.mjs';
import { writeJSON } from './harness/report.mjs';
import { resultsDir, reportsDir, benchRoot } from './harness/paths.mjs';

const result = await analyzeBundle();
const env = captureEnv({ buildMode: 'packages/voodoojs/dist (tsup output)' });

fs.mkdirSync(reportsDir, { recursive: true });
const md = [
  '# Voodoo.js — Bundle Analysis',
  '',
  `Generated ${env.timestamp}.`,
  '',
  '## Environment',
  '',
  envMarkdown(env),
  '',
  result.markdown,
  '',
].join('\n');

const mdFile = path.join(reportsDir, 'bundle.md');
fs.writeFileSync(mdFile, md, 'utf8');
const jsonFile = writeJSON(path.join(resultsDir, 'bundle.json'), { env, ...result, markdown: undefined });

console.log(result.markdown);
console.log('\nwrote:');
console.log('  ' + path.relative(benchRoot, mdFile));
console.log('  ' + path.relative(benchRoot, jsonFile));
