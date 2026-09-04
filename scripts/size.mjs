/**
 * Measures the real size of every generated bundle: raw, gzipped and brotlied.
 * The project's targets live in `BUDGET`, and the script exits with an error
 * code as soon as one file goes over its limit.
 */

import { readdir, readFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'packages/voodoojs/dist';

/**
 * Targets in gzipped kilobytes.
 *
 * The values come from real measurement, with roughly 5% of headroom on top.
 * That headroom exists so the budget catches genuine growth instead of firing
 * on every new line: too tight, and all it teaches us is to raise the number.
 *
 * Revision of 2026-08-31. The essential build sat at 78.83 KB against a target
 * of 80, so 1.2 KB of headroom, and the full build at 123.28 against 125. In
 * that band any fix at all blew the ceiling. The expression evaluator's
 * security work (sandbox escape, prototype pollution, URL sanitising), the
 * development warnings and the devtools widget added +4.2% to the minimum
 * build, +2.3% to the essential and +3.0% to the full one. That growth was
 * accepted deliberately and the targets moved with it.
 *
 * Revision of 2026-09-02: core 46 -> 47. The performance pass spent the last of
 * this budget's headroom, landing core at exactly 46.00 against 46. The very
 * next change was a one-line accessibility fix -- `aria-atomic` on the toast
 * region, which the alert pattern requires because the body is replaced whole
 * on update -- and it pushed the build to 46.01. A budget with zero headroom is
 * not a budget, it is a tripwire: it was about to block a correct fix over ten
 * gzipped bytes. Raising to 47 restores about 2% of room, in line with the rule
 * stated above.
 *
 * Revision of 2026-09-04: core 47 -> 48. This one is not a tripwire story, it is
 * deliberate growth being paid for. Between 0.9.0 and 0.10.0 the expression
 * language gained `new`, `delete`, octal literals, the six bitwise operators and
 * the three shifts, `return`, and default, rest and destructured parameters.
 * That took the core from 46.03 to 47.01, and the differential suite records
 * what it bought: expressions that answer differently from JavaScript went from
 * 4 to 0, and valid JavaScript the parser refuses went from 234 to 3.
 *
 * The last ten bytes went to the `onStart` registry in `runtime/walker.ts`,
 * which is how the JSX module gets its two passes around the walk. Compacting
 * that registry from two arrays to one saved almost nothing, so the honest entry
 * is that the feature costs what it costs rather than that it was optimised
 * away.
 *
 * When you touch this, say why. Raising a target without a justification is the
 * same as having no target at all.
 */
const BUDGET = {
  'voodoo.core.min.js': 48,
  'voodoo.min.js': 85,
  'voodoo.full.min.js': 133,
};

function kb(bytes) {
  return (bytes / 1024).toFixed(2);
}

const files = await readdir(DIST).catch(() => []);
if (!files.length) {
  console.error('Nada em dist. Rode "npm run build" antes.');
  process.exit(1);
}

const rows = [];
let failed = false;

for (const name of files.sort()) {
  if (!name.endsWith('.js') && !name.endsWith('.cjs')) continue;
  if (name.endsWith('.map')) continue;

  const buffer = await readFile(join(DIST, name));
  const gzip = gzipSync(buffer, { level: 9 });
  const brotli = brotliCompressSync(buffer, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  });

  const limit = BUDGET[name];
  const gzipKb = Number(kb(gzip.length));
  const status = limit ? (gzipKb <= limit ? 'ok' : 'ESTOUROU') : '';
  if (limit && gzipKb > limit) failed = true;

  rows.push({
    arquivo: name,
    cru: `${kb(buffer.length)} KB`,
    gzip: `${gzipKb} KB`,
    brotli: `${kb(brotli.length)} KB`,
    meta: limit ? `${limit} KB` : '',
    status,
  });
}

console.table(rows);

if (failed) {
  console.error('\nA bundle is over its size budget.');
  process.exit(1);
}
console.log('\nEvery bundle is within its budget.');
