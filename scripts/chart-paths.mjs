/**
 * Draws docs/media/reconcile-paths.svg from the path probe.
 *
 *   node benchmarks/reconcile/paths-probe.mjs --out=reconcile-paths.json
 *   node scripts/chart-paths.mjs
 *
 * A fast path that quietly falls back still passes every correctness test —
 * that is what makes it a fallback. This chart is the one place the fallbacks
 * are visible: every shape is labelled with the route it took and the number of
 * rows it looked at, including the shapes where the fast route does not apply
 * and the cost goes back to the length of the list.
 *
 * Publishing the failures alongside the wins is the point. A chart of only the
 * cases that went well is an advertisement.
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/reconcile-paths.json';
const TARGET = 'docs/media/reconcile-paths.svg';

const ACCENT = '#6D3BF5';
const GREY = '#b0abc2';
const INK = '#8b8b9e';
const FAINT = '#e4e1ee';
const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

const data = JSON.parse(await readFile(SOURCE, 'utf8'));

const W = 760;
const PAD_LEFT = 258;
const BAR_W = 300;
const ROW_H = 20;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const count = (v) => (v >= 1000 ? Math.round(v).toLocaleString('en-US') : String(v));

// Logarithmic: the same list goes from one row visited to twenty thousand, and
// on a linear axis the interesting half of this chart is invisible.
const maxLog = Math.log10(Math.max(...data.shapes.map((s) => s.itemsVisited), 1) + 1);
const width = (v) => Math.max(2, (Math.log10(v + 1) / maxLog) * BAR_W);

let y = 22;
const parts = [
  `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
    `Which route each edit took, and what it cost — 10.000 rows, logarithmic</text>`,
];
y += 15;
parts.push(
  `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
    `Purple: the mutation itself said what changed. Grey: the lists had to be compared. ` +
    `Rows visited by the reconciler, counted.</text>`
);
y += 12;

let group = null;
for (const shape of data.shapes) {
  if (shape.group !== group) {
    group = shape.group;
    y += 16;
    parts.push(
      `<text x="14" y="${y}" font-size="10.5" font-weight="700" fill="${INK}">${esc(group)}</text>`,
      `<line x1="14" y1="${y + 6}" x2="746" y2="${y + 6}" stroke="${FAINT}" stroke-width="1"/>`
    );
    y += 16;
  }

  const mutation = shape.path === 'mutation' || shape.path === 'unchanged';
  const w = width(shape.itemsVisited);
  parts.push(
    `<text x="${PAD_LEFT - 8}" y="${y + 10}" font-size="10.5" text-anchor="end" fill="${INK}">${esc(shape.name)}</text>`,
    `<rect x="${PAD_LEFT}" y="${y + 2}" width="${w.toFixed(1)}" height="10" rx="2" fill="${mutation ? ACCENT : GREY}"/>`,
    `<text x="${(PAD_LEFT + w + 8).toFixed(1)}" y="${y + 10}" font-size="10" ` +
      `fill="${mutation ? ACCENT : INK}" font-weight="${mutation ? 700 : 400}">` +
      `${count(shape.itemsVisited)}</text>`
  );
  y += ROW_H;
}

y += 14;
parts.push(
  `<text x="14" y="${y}" font-size="9.5" fill="${INK}" opacity="0.85">` +
    `Two edits at opposite ends of the list are described by one range that spans everything between ` +
    `them, so they cost what comparing would have cost. That limit is the single contiguous region, ` +
    `not the mutation log.</text>`
);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y + 10}" width="${W}" height="${y + 10}" ` +
  `font-family="${FONT}">${parts.join('')}</svg>`;

await writeFile(TARGET, svg);
console.log(`${TARGET} redrawn from ${SOURCE}`);
for (const shape of data.shapes) {
  console.log(`  ${shape.name.padEnd(34)} ${shape.path.padEnd(9)} ${count(shape.itemsVisited).padStart(8)} rows`);
}
