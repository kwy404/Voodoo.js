/**
 * Draws docs/media/size-vs-speed.svg from the competitor benchmark.
 *
 *   node scripts/chart-size-speed.mjs
 *
 * The comparison table asks the reader to hold two columns in their head at
 * once — how fast, and how much you had to download to get it — and a table is
 * a bad instrument for that. Plotted against each other, the trade each project
 * made is the shape of the picture: bottom-left is small and quick, top-right
 * is neither.
 *
 * Voodoo lands far to the right and says so. It ships a router, an HTTP client,
 * forms, validation, a UI kit, charts and i18n in the same file, so it is being
 * weighed against libraries that ship a renderer. The chart is not an argument
 * that this is free; it is where the cost is.
 */

import { readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'benchmarks/results/competitors.json';
const TARGET = 'docs/media/size-vs-speed.svg';

const ACCENT = '#6D3BF5';
const GREY = '#8b8b9e';
const FAINT = '#e4e1ee';
const INK = '#8b8b9e';
const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

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
const median = (r) => (r.stats ?? r).median ?? (r.stats ?? r).mean ?? null;

const scenario = data.scenarios.find((s) => /update/i.test(s.label)) ?? data.scenarios[0];

const points = scenario.results
  .filter((r) => !r.error && median(r) != null && data.bundles[r.framework] && !data.bundles[r.framework].error)
  .map((r) => ({
    key: r.framework,
    name: LABEL[r.framework] ?? r.framework,
    ms: median(r),
    kb: data.bundles[r.framework].bytes / 1024,
  }));

const W = 760;
const H = 420;
const LEFT = 64;
const RIGHT = 26;
const TOP = 60;
const BOTTOM = 52;
const plotW = W - LEFT - RIGHT;
const plotH = H - TOP - BOTTOM;

// Size spans 0.6 KB to 440 KB, which is three decades: linear would pile six of
// the seven into the first pixel column.
const minKb = Math.min(...points.map((p) => p.kb));
const maxKb = Math.max(...points.map((p) => p.kb));
const loX = Math.log10(minKb / 1.6);
const hiX = Math.log10(maxKb * 1.6);
const x = (kb) => LEFT + ((Math.log10(kb) - loX) / (hiX - loX)) * plotW;

// Time is logarithmic for the same reason size is. Alpine takes 105 ms on the
// same work Solid does in 0.8, and on a linear axis that single point pushes
// the other six into one pixel row where the chart says nothing about any of
// them. Both axes are labelled as logarithmic.
const minMs = Math.min(...points.map((p) => p.ms));
const maxMs = Math.max(...points.map((p) => p.ms));
const loY = Math.log10(minMs / 1.7);
const hiY = Math.log10(maxMs * 1.7);
const y = (ms) => TOP + plotH - ((Math.log10(ms) - loY) / (hiY - loY)) * plotH;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const parts = [
  `<text x="14" y="24" font-size="12.5" font-weight="700" fill="${INK}">` +
    `What each project charges, and what it buys</text>`,
  `<text x="14" y="40" font-size="10.5" fill="${INK}">` +
    `${esc(scenario.label)} — median of ${data.env.samples} samples. ` +
    `Down is faster, left is smaller. Both axes are logarithmic.</text>`,
];

for (const value of [0.5, 1, 2, 5, 10, 25, 50, 100]) {
  if (Math.log10(value) < loY || Math.log10(value) > hiY) continue;
  const py = y(value);
  parts.push(
    `<line x1="${LEFT}" y1="${py.toFixed(1)}" x2="${LEFT + plotW}" y2="${py.toFixed(1)}" stroke="${FAINT}" stroke-width="1"/>`,
    `<text x="${LEFT - 8}" y="${(py + 3.5).toFixed(1)}" font-size="10" text-anchor="end" fill="${INK}">${value} ms</text>`
  );
}
parts.push(
  `<text x="16" y="${(TOP + plotH / 2).toFixed(1)}" font-size="10" fill="${INK}" ` +
    `transform="rotate(-90 16 ${(TOP + plotH / 2).toFixed(1)})" text-anchor="middle">update time</text>`
);

for (const kb of [1, 10, 100, 500]) {
  if (kb < minKb / 1.6 || kb > maxKb * 1.6) continue;
  const px = x(kb);
  parts.push(
    `<line x1="${px.toFixed(1)}" y1="${TOP}" x2="${px.toFixed(1)}" y2="${TOP + plotH}" stroke="${FAINT}" stroke-width="1"/>`,
    `<text x="${px.toFixed(1)}" y="${(TOP + plotH + 18).toFixed(1)}" font-size="10" text-anchor="middle" fill="${INK}">${kb} KB</text>`
  );
}
parts.push(
  `<text x="${(LEFT + plotW / 2).toFixed(1)}" y="${(TOP + plotH + 38).toFixed(1)}" font-size="10" ` +
    `text-anchor="middle" fill="${INK}">bundle, minified</text>`
);

for (const p of points) {
  const mine = p.key === 'voodoo';
  const px = x(p.kb);
  const py = y(p.ms);
  // Labels lean left once the point is far enough right to run off the edge.
  const flip = px > LEFT + plotW - 90;
  parts.push(
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${mine ? 7 : 5}" ` +
      `fill="${mine ? ACCENT : GREY}" ${mine ? '' : 'opacity="0.75"'}/>`,
    `<text x="${(px + (flip ? -12 : 12)).toFixed(1)}" y="${(py + 4).toFixed(1)}" font-size="10.5" ` +
      `text-anchor="${flip ? 'end' : 'start'}" fill="${mine ? ACCENT : INK}" font-weight="${mine ? 700 : 400}">` +
      `${esc(p.name)}</text>`,
    `<text x="${(px + (flip ? -12 : 12)).toFixed(1)}" y="${(py + 16).toFixed(1)}" font-size="9" ` +
      `text-anchor="${flip ? 'end' : 'start'}" fill="${INK}" opacity="0.8">` +
      `${p.kb.toFixed(0)} KB · ${p.ms.toFixed(2)} ms</text>`
  );
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" ` +
  `font-family="${FONT}">${parts.join('')}</svg>`;

await writeFile(TARGET, svg);
console.log(`${TARGET} redrawn from ${SOURCE} (${scenario.label})`);
for (const p of points.sort((a, b) => a.kb - b.kb)) {
  console.log(`  ${p.name.padEnd(12)} ${p.kb.toFixed(1).padStart(8)} KB   ${p.ms.toFixed(2).padStart(7)} ms`);
}
