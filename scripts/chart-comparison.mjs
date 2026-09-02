/**
 * Draws docs/media/framework-comparison.svg straight from the benchmark result.
 *
 * The chart used to be hand-edited, which meant it drifted from the numbers it
 * claimed to show every time the benchmark was re-run. Now the JSON is the only
 * source: re-run the benchmark, run this, and the picture cannot disagree with
 * the table beside it.
 *
 * Usage: node scripts/chart-comparison.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/competitors.json';
const TARGET = 'docs/media/framework-comparison.svg';

/** Reads the median of a scenario, whichever key the runner used for it. */
function median(result) {
  const stats = result.stats ?? result;
  return stats.median ?? stats.p50 ?? stats.mean ?? null;
}

const data = JSON.parse(await readFile(SOURCE, 'utf8'));

/** Pretty names, so the chart does not print bare package ids. */
const LABEL = {
  vanilla: 'vanilla JS',
  voodoo: 'Voodoo.js',
  alpine: 'Alpine',
  vue: 'Vue',
  preact: 'Preact',
  react: 'React',
  solid: 'Solid',
};

// Neutral grey for every framework, one accent for ours. A chart that colours
// each bar differently invites the reader to hunt for meaning in the palette.
const GREY = '#b0abc2';
const ACCENT = '#6D3BF5';
const INK = '#8b8b9e';

const PAD_LEFT = 92;
const BAR_W = 380;
const ROW_H = 20;
const BAR_H = 13;

let y = 20;
const parts = [];

parts.push(
  `<text x="${PAD_LEFT}" y="${y}" font-size="11" fill="${INK}">` +
    `${data.env.rows.toLocaleString('en-US')} rows - median ms of ${data.env.samples} samples ` +
    `- production+minified - jsdom - lower is better</text>`
);
y += 16;

for (const scenario of data.scenarios) {
  const rows = scenario.results
    .filter((r) => !r.error && median(r) != null)
    .map((r) => ({ name: r.framework, value: median(r) }))
    .sort((a, b) => a.value - b.value);

  if (!rows.length) continue;

  const max = Math.max(...rows.map((r) => r.value));

  parts.push(
    `<text x="${PAD_LEFT}" y="${y}" font-size="13" font-weight="700" fill="${INK}">${scenario.label}</text>`
  );
  y += 30;

  for (const row of rows) {
    const mine = row.name === 'voodoo';
    const width = Math.max(1, (row.value / max) * BAR_W);
    const label = LABEL[row.name] ?? row.name;

    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 9}" font-size="11" text-anchor="end" fill="${INK}" ` +
        `font-weight="${mine ? 700 : 400}">${label}</text>`,
      `<rect x="${PAD_LEFT}" y="${y}" width="${width.toFixed(1)}" height="${BAR_H}" rx="2.5" ` +
        `fill="${mine ? ACCENT : GREY}"/>`,
      `<text x="${(PAD_LEFT + width + 7).toFixed(1)}" y="${y + 10}" font-size="10.5" fill="${INK}" ` +
        `font-weight="${mine ? 700 : 400}">${row.value.toFixed(2)}</text>`
    );
    y += ROW_H;
  }

  y += 22;
}

const height = y + 8;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${height}" width="760" height="${height}" ` +
  `font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">` +
  parts.join('') +
  `</svg>`;

await writeFile(TARGET, svg);

console.log(`${TARGET} redrawn from ${SOURCE}`);
console.log(`commit ${data.env.commit}, ${data.env.node}, jsdom ${data.env.jsdom}`);
for (const scenario of data.scenarios) {
  const mine = scenario.results.find((r) => r.framework === 'voodoo');
  const ranked = scenario.results
    .filter((r) => !r.error && median(r) != null)
    .sort((a, b) => median(a) - median(b));
  const place = ranked.findIndex((r) => r.framework === 'voodoo') + 1;
  console.log(
    `  ${scenario.label.padEnd(24)} voodoo ${median(mine).toFixed(2)} ms — ${place} of ${ranked.length}`
  );
}
