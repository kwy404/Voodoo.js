/**
 * Rewrites the benchmark table on the landing page from the measurement.
 *
 *   node scripts/site-bench-table.mjs
 *
 * The table in `site/index.html` was typed by hand and drifted: it announced
 * 97.70 ms for create long after the README had been re-measured at 80.81, so
 * the two pages disagreed about the same run. The row order, the numbers and
 * the version label all come from `benchmarks/results/competitors.json` now,
 * for the same reason the charts do.
 *
 * The prose underneath is NOT generated. It is a reading of the numbers, and a
 * reading is something a person owes the reader — but it is printed here at the
 * end so whoever re-runs this can see immediately whether it still holds.
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/competitors.json';
const PAGE = 'site/index.html';

const LABEL = {
  vanilla: 'vanilla JS',
  voodoo: 'Voodoo.js',
  alpine: 'Alpine',
  vue: 'Vue',
  preact: 'Preact',
  react: 'React',
  solid: 'Solid',
};

const data = JSON.parse(await readFile(SOURCE, 'utf8'));
const pkg = JSON.parse(await readFile('packages/voodoojs/package.json', 'utf8'));

const median = (r) => (r.stats ?? r).median ?? (r.stats ?? r).mean ?? null;

/** create / update / clear, in the order the table's columns already stand. */
const COLUMNS = ['create', 'update', 'clear'].map((want) => {
  const scenario = data.scenarios.find((s) => s.label.toLowerCase().includes(want));
  if (!scenario) throw new Error(`no scenario matching "${want}"`);
  return scenario;
});

const frameworks = [...new Set(COLUMNS.flatMap((s) => s.results.map((r) => r.framework)))];

const rows = frameworks
  .map((key) => {
    const cells = COLUMNS.map((s) => {
      const hit = s.results.find((r) => r.framework === key);
      return hit && !hit.error ? median(hit) : null;
    });
    const version = COLUMNS.map((s) => s.results.find((r) => r.framework === key)?.version).find(Boolean);
    return {
      key,
      name: LABEL[key] ?? key,
      version: version && version !== 'n/a (hand-written)' && version !== 'workspace' ? version : null,
      cells,
    };
  })
  .filter((r) => r.cells.every((c) => c != null))
  // Sorted by the first column, which is what the page's reader compares first.
  .sort((a, b) => a.cells[0] - b.cells[0]);

const html = rows
  .map((row) => {
    const mine = row.key === 'voodoo';
    const name = mine ? `Voodoo.js ${pkg.version}` : row.version ? `${row.name} ${row.version}` : row.name;
    const cells = row.cells.map((v) => `                    <td class="num">${v.toFixed(2)}</td>`).join('\n');
    return `                  <tr${mine ? ' class="mine"' : ''}>\n                    <td>${name}</td>\n${cells}\n                  </tr>`;
  })
  .join('\n');

const page = await readFile(PAGE, 'utf8');
const CRLF = page.includes('\r\n');
const flat = page.replace(/\r\n/g, '\n');

const start = flat.indexOf('                <tbody>\n', flat.indexOf('bench.framework'));
const end = flat.indexOf('                </tbody>', start);
if (start < 0 || end < 0) {
  console.error('could not find the benchmark <tbody> on the landing page');
  process.exit(1);
}

const next =
  flat.slice(0, start) + '                <tbody>\n' + html + '\n' + flat.slice(end);

await writeFile(PAGE, CRLF ? next.replace(/\n/g, '\r\n') : next, 'utf8');

console.log(`${PAGE}: ${rows.length} rows rewritten from ${SOURCE}`);
console.log(`commit ${data.env.commit}, ${data.env.node}, jsdom ${data.env.jsdom}\n`);
console.log(`${'framework'.padEnd(18)} ${COLUMNS.map((s) => s.label.slice(0, 14).padStart(15)).join('')}`);
for (const row of rows) {
  console.log(`${row.name.padEnd(18)} ${row.cells.map((v) => v.toFixed(2).padStart(15)).join('')}`);
}

const mine = rows.findIndex((r) => r.key === 'voodoo');
console.log(
  `\nVoodoo is ${mine + 1} of ${rows.length} on ${COLUMNS[0].label}. ` +
    `Check the prose under the table still says something true.`
);
