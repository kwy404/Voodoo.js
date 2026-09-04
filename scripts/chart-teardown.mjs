/**
 * Draws docs/media/vfor-teardown.svg straight from the measurement.
 *
 * Same rule as scripts/chart-comparison.mjs: the JSON is the only source. The
 * previous version of this chart was hand-edited and had drifted from the run
 * it claimed to show, which is exactly the failure a generated picture cannot
 * have.
 *
 *   node --expose-gc scripts/measure-teardown.mjs   produces the JSON
 *   node scripts/chart-teardown.mjs                 draws it
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/teardown.json';
const TARGET = 'docs/media/vfor-teardown.svg';

const data = JSON.parse(await readFile(SOURCE, 'utf8'));

// Grey for the old behaviour, the accent for the current one. Two series only,
// so the palette carries the whole comparison and no legend is needed beyond
// the two words at the top.
const GREY = '#b0abc2';
const ACCENT = '#6D3BF5';
const INK = '#8b8b9e';

const PAD_LEFT = 92;
const BAR_W = 400;
const BAR_H = 13;
const GAP = 5;
const GROUP_GAP = 26;

const sizes = data.sizes.map(String);
const max = Math.max(...sizes.flatMap((n) => [data.before[n] ?? 0, data.after[n] ?? 0]));

let y = 20;
const parts = [];

parts.push(
  `<text x="${PAD_LEFT}" y="${y}" font-size="11" fill="${INK}">` +
    `kilobytes still held after destroy() - ${data.cycles} mount-and-destroy cycles, ` +
    `heap forced between samples - lower is better</text>`
);
y += 14;

parts.push(
  `<rect x="${PAD_LEFT}" y="${y}" width="9" height="9" rx="2" fill="${GREY}"/>`,
  `<text x="${PAD_LEFT + 14}" y="${y + 8}" font-size="11" fill="${INK}">before</text>`,
  `<rect x="${PAD_LEFT + 62}" y="${y}" width="9" height="9" rx="2" fill="${ACCENT}"/>`,
  `<text x="${PAD_LEFT + 76}" y="${y + 8}" font-size="11" font-weight="700" fill="${INK}">after</text>`
);
y += 26;

/** One labelled bar. */
function bar(value, colour, bold) {
  const width = Math.max(1.5, (value / max) * BAR_W);
  parts.push(
    `<rect x="${PAD_LEFT}" y="${y}" width="${width.toFixed(1)}" height="${BAR_H}" rx="2.5" fill="${colour}"/>`,
    `<text x="${(PAD_LEFT + width + 7).toFixed(1)}" y="${y + 10}" font-size="10.5" fill="${INK}" ` +
      `font-weight="${bold ? 700 : 400}">${value.toFixed(1)} KB</text>`
  );
  y += BAR_H + GAP;
}

for (const n of sizes) {
  const before = data.before[n] ?? 0;
  const after = data.after[n] ?? 0;

  parts.push(
    `<text x="${PAD_LEFT - 8}" y="${y + 19}" font-size="12" text-anchor="end" ` +
      `font-weight="700" fill="${INK}">${n} rows</text>`
  );

  bar(before, GREY, false);
  bar(after, ACCENT, true);

  // The multiple, which is the point of the chart and is hard to read off two
  // bars when one of them is a sliver.
  if (after > 0) {
    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 2}" font-size="10.5" text-anchor="end" fill="${INK}">` +
        `${Math.round(before / after)}x less</text>`
    );
  }

  y += GROUP_GAP;
}

parts.push(
  `<text x="${PAD_LEFT}" y="${y}" font-size="10.5" fill="${INK}">` +
    `Node ${data.node}, jsdom, commit ${data.commit}. The old figure grew with the list; ` +
    `the new one does not.</text>`
);

const height = y + 12;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${height}" width="760" height="${height}" ` +
  `font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif">` +
  parts.join('') +
  `</svg>`;

await writeFile(TARGET, svg);

console.log(`${TARGET} redrawn from ${SOURCE}`);
for (const n of sizes) {
  const b = data.before[n] ?? 0;
  const a = data.after[n] ?? 0;
  console.log(`  ${n.padStart(4)} rows  ${b.toFixed(1).padStart(8)} -> ${a.toFixed(1).padStart(6)} KB`);
}
