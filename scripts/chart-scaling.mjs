/**
 * Draws docs/media/reconcile-scaling.svg from the scaling measurement.
 *
 *   node scripts/chart-scaling.mjs
 *
 * One question: does an edit cost what it changed, or what it sits next to?
 *
 * The same single-row edit is timed on lists from 1.000 to 50.000 rows. A flat
 * line is a cost that does not care how long the list is; a rising line is one
 * that does. That difference is the entire point of the mutation path, and no
 * single measurement at one size can show it — which is why this chart exists
 * separately from the before/after one.
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/reconcile-scaling.json';
const TARGET = 'docs/media/reconcile-scaling.svg';

const INK = '#8b8b9e';
const FAINT = '#e4e1ee';
const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

/** Purple for the paths that use the mutation, grey-blue for the ones that cannot. */
const SERIES = {
  'inplace/splice-remove-middle': { colour: '#6D3BF5', dash: '', label: 'remove 1 in the middle — in place' },
  'inplace/push': { colour: '#9B7BF7', dash: '', label: 'append 1 — in place' },
  'replace/remove-middle': { colour: '#8b8b9e', dash: '5 3', label: 'remove 1 in the middle — new array' },
  'replace/append': { colour: '#b0abc2', dash: '5 3', label: 'append 1 — new array' },
};

const data = JSON.parse(await readFile(SOURCE, 'utf8'));

const W = 760;
const H = 380;
const LEFT = 62;
const RIGHT = 292; // room for the legend
const TOP = 58;
const BOTTOM = 46;

const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;

const sizes = data.sizes;
const maxN = Math.max(...sizes);
const maxMs = Math.max(...data.points.map((p) => p.median));

/** A round number at or just above the largest sample, so the axis reads cleanly. */
function niceCeil(v) {
  const magnitude = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (magnitude * step >= v) return magnitude * step;
  }
  return magnitude * 10;
}

const yMax = niceCeil(maxMs);
const x = (n) => LEFT + (n / maxN) * plotW;
const y = (v) => TOP + plotH - (v / yMax) * plotH;

const parts = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

parts.push(
  `<text x="14" y="24" font-size="12.5" font-weight="700" fill="${INK}">` +
    `The cost of one edit, against the size of the list</text>`,
  `<text x="14" y="40" font-size="10.5" fill="${INK}">` +
    `median ms, jsdom, ${esc(data.env.node)} — flat means the list length does not matter</text>`
);

// Gridlines and the y axis.
const TICKS = 5;
for (let i = 0; i <= TICKS; i++) {
  const value = (yMax / TICKS) * i;
  const py = y(value);
  parts.push(
    `<line x1="${LEFT}" y1="${py.toFixed(1)}" x2="${LEFT + plotW}" y2="${py.toFixed(1)}" stroke="${FAINT}" stroke-width="1"/>`,
    `<text x="${LEFT - 8}" y="${(py + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="${INK}">` +
      `${value >= 10 ? value.toFixed(0) : value.toFixed(1)}</text>`
  );
}
parts.push(
  `<text x="14" y="${(TOP + plotH / 2).toFixed(1)}" font-size="10" fill="${INK}" ` +
    `transform="rotate(-90 14 ${(TOP + plotH / 2).toFixed(1)})" text-anchor="middle">milliseconds</text>`
);

// The x axis.
for (const n of sizes) {
  const px = x(n);
  parts.push(
    `<text x="${px.toFixed(1)}" y="${(TOP + plotH + 18).toFixed(1)}" font-size="10" text-anchor="middle" fill="${INK}">` +
      `${n >= 1000 ? n / 1000 + 'k' : n}</text>`
  );
}
parts.push(
  `<text x="${(LEFT + plotW / 2).toFixed(1)}" y="${(TOP + plotH + 36).toFixed(1)}" font-size="10" ` +
    `text-anchor="middle" fill="${INK}">rows in the list</text>`
);

// The lines.
let legendY = TOP + 6;
for (const [id, style] of Object.entries(SERIES)) {
  const points = data.points.filter((p) => p.op === id).sort((a, b) => a.n - b.n);
  if (!points.length) continue;

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.n).toFixed(1)} ${y(p.median).toFixed(1)}`).join(' ');
  parts.push(
    `<path d="${d}" fill="none" stroke="${style.colour}" stroke-width="2.2" ` +
      `${style.dash ? `stroke-dasharray="${style.dash}"` : ''} stroke-linejoin="round"/>`
  );
  for (const p of points) {
    parts.push(`<circle cx="${x(p.n).toFixed(1)}" cy="${y(p.median).toFixed(1)}" r="2.6" fill="${style.colour}"/>`);
  }

  const last = points[points.length - 1];
  parts.push(
    `<rect x="${LEFT + plotW + 22}" y="${legendY - 8}" width="16" height="3" rx="1.5" fill="${style.colour}"/>`,
    `<text x="${LEFT + plotW + 44}" y="${legendY - 3}" font-size="10.5" fill="${INK}">${esc(style.label)}</text>`,
    `<text x="${LEFT + plotW + 44}" y="${legendY + 11}" font-size="10.5" font-weight="700" fill="${style.colour}">` +
      `${last.median < 1 ? last.median.toFixed(3) : last.median.toFixed(2)} ms at ${last.n / 1000}k</text>`
  );
  legendY += 42;
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
  `font-family="${FONT}">${parts.join('')}</svg>`;

await writeFile(TARGET, svg);
console.log(`${TARGET} redrawn from ${SOURCE}`);

for (const [id, style] of Object.entries(SERIES)) {
  const points = data.points.filter((p) => p.op === id).sort((a, b) => a.n - b.n);
  if (points.length < 2) continue;
  const first = points[0];
  const last = points[points.length - 1];
  const growth = last.median / first.median;
  const sizeGrowth = last.n / first.n;
  console.log(
    `  ${style.label.padEnd(38)} n x${sizeGrowth} -> time x${growth.toFixed(1)}` +
      `   (${first.median.toFixed(3)} -> ${last.median.toFixed(3)} ms)`
  );
}
