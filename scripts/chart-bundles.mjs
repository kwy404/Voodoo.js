/**
 * Draws docs/media/bundle-sizes.svg from the committed builds and the
 * competitor benchmark's own bundles.
 *
 *   node scripts/chart-bundles.mjs
 *
 * Voodoo ships three builds and the comparison table only ever shows the
 * largest, which is the fair number for a page that wants JSX and is a
 * misleading one for a page that does not. This chart puts all three next to
 * the frameworks they would actually be chosen against.
 *
 * The competitor sizes come from `benchmarks/results/competitors.json`, which
 * bundles each framework the same way — production, minified, one file — rather
 * than quoting whatever number each project's README prefers. Voodoo's come
 * from the files in `dist/`, measured here, so the chart cannot claim a size
 * the repository does not actually contain.
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const COMPETITORS = 'benchmarks/results/competitors.json';
const TARGET = 'docs/media/bundle-sizes.svg';

const GREY = '#b0abc2';
const ACCENT = '#6D3BF5';
const ACCENT_SOFT = '#9B7BF7';
const INK = '#8b8b9e';
const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

const OURS = [
  ['packages/voodoojs/dist/voodoo.core.min.js', 'Voodoo core', 'directives, reactivity, components'],
  ['packages/voodoojs/dist/voodoo.min.js', 'Voodoo', 'core + http, forms, router, UI'],
  ['packages/voodoojs/dist/voodoo.full.min.js', 'Voodoo full', 'everything, including JSX in HTML'],
];

const LABEL = {
  vanilla: 'vanilla JS',
  alpine: 'Alpine',
  vue: 'Vue',
  preact: 'Preact',
  react: 'React',
  solid: 'Solid',
};

const kb = (bytes) => (bytes / 1024).toFixed(1);

const rows = [];

for (const [file, name, note] of OURS) {
  const bytes = await readFile(file);
  await stat(file);
  rows.push({
    name,
    note,
    mine: true,
    min: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  });
}

const data = JSON.parse(await readFile(COMPETITORS, 'utf8'));
for (const [key, info] of Object.entries(data.bundles)) {
  if (key === 'voodoo' || info.error) continue;
  rows.push({
    name: `${LABEL[key] ?? key}${info.version && info.version !== 'n/a (hand-written)' ? ` ${info.version}` : ''}`,
    note: null,
    mine: false,
    min: info.bytes,
    gzip: null,
    brotli: null,
  });
}

rows.sort((a, b) => a.min - b.min);

const W = 760;
const PAD_LEFT = 150;
const BAR_W = 380;
const ROW_H = 34;

const max = Math.max(...rows.map((r) => r.min));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let y = 22;
const parts = [
  `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
    `Bundle size — production, minified, one file each</text>`,
];
y += 15;
parts.push(
  `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
    `Every framework bundled the same way rather than quoted from its own README. ` +
    `Voodoo's gzip and brotli in brackets.</text>`
);
y += 22;

for (const row of rows) {
  const width = Math.max(1.5, (row.min / max) * BAR_W);
  const colour = row.mine ? (row.name === 'Voodoo full' ? ACCENT : ACCENT_SOFT) : GREY;

  parts.push(
    `<text x="${PAD_LEFT - 8}" y="${y + 10}" font-size="10.5" text-anchor="end" fill="${INK}" ` +
      `font-weight="${row.mine ? 700 : 400}">${esc(row.name)}</text>`,
    `<rect x="${PAD_LEFT}" y="${y}" width="${width.toFixed(1)}" height="13" rx="2.5" fill="${colour}"/>`,
    `<text x="${(PAD_LEFT + width + 8).toFixed(1)}" y="${y + 10}" font-size="10.5" fill="${INK}" ` +
      `font-weight="${row.mine ? 700 : 400}">${kb(row.min)} KB` +
      `${row.gzip ? ` <tspan fill="${INK}" font-weight="400">(${kb(row.gzip)} gzip · ${kb(row.brotli)} br)</tspan>` : ''}</text>`
  );

  if (row.note) {
    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 22}" font-size="9" text-anchor="end" fill="${INK}" opacity="0.75">${esc(row.note)}</text>`
    );
  }
  y += ROW_H;
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y + 8}" width="${W}" height="${y + 8}" ` +
  `font-family="${FONT}">${parts.join('')}</svg>`;

await writeFile(TARGET, svg);
console.log(`${TARGET} redrawn`);
for (const row of rows) {
  console.log(
    `  ${row.name.padEnd(20)} ${kb(row.min).padStart(8)} KB` +
      (row.gzip ? `  ${kb(row.gzip).padStart(7)} gzip  ${kb(row.brotli).padStart(7)} brotli` : '')
  );
}
