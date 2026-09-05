/**
 * Draws docs/media/batteries.svg — what each project puts in the box.
 *
 *   node scripts/chart-batteries.mjs
 *
 * The size chart shows Voodoo as by far the largest bundle and stops there,
 * which is only half of a comparison. This is the other half: the thing being
 * weighed is not the same thing. React and Preact ship a renderer; a real
 * application then adds a router, a data layer, a form library and a UI kit,
 * and none of that is in the number the size chart plots.
 *
 * The matrix is not measured — it is a reading of what each project publishes,
 * and it mirrors the comparison table in the README so the two cannot drift
 * apart. "Ecosystem" means a well-known third-party package, not a bad answer;
 * for most teams it is the right one. It just is not the same as one download.
 */

import { writeFile } from 'node:fs/promises';

const TARGET = 'docs/media/batteries.svg';

const ACCENT = '#6D3BF5';
const GREY = '#b0abc2';
const INK = '#8b8b9e';
const FAINT = '#e4e1ee';
const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

const FRAMEWORKS = ['Voodoo.js', 'Alpine', 'Vue', 'React', 'Preact', 'Solid'];

/** 2 = in the box, 1 = a well-known package away, 0 = not a thing it does. */
const ROWS = [
  ['Reactive state', [2, 2, 2, 2, 2, 2]],
  ['Components', [2, 1, 2, 2, 2, 2]],
  ['Router', [2, 1, 1, 1, 1, 1]],
  ['HTTP client', [2, 1, 1, 1, 1, 1]],
  ['Forms + validation', [2, 1, 1, 1, 1, 1]],
  ['Input masks', [2, 1, 1, 1, 1, 1]],
  ['UI kit (toast, modal, tabs)', [2, 1, 1, 1, 1, 1]],
  ['Charts', [2, 1, 1, 1, 1, 1]],
  ['i18n', [2, 1, 1, 1, 1, 1]],
  ['Stores', [2, 1, 1, 1, 1, 1]],
  ['Animation / transitions', [2, 2, 2, 1, 1, 1]],
  ['Drag and drop', [2, 1, 1, 1, 1, 1]],
  ['WebSockets', [2, 1, 1, 1, 1, 1]],
  ['JSX with no build step', [2, 0, 0, 0, 0, 0]],
  ['Runs from a CDN tag', [2, 2, 2, 2, 2, 2]],
  ['Server-side rendering', [0, 0, 2, 2, 2, 2]],
];

const W = 760;
const PAD_LEFT = 196;
const COL_W = (W - PAD_LEFT - 24) / FRAMEWORKS.length;
const ROW_H = 22;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let y = 22;
const parts = [
  `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
    `What arrives with the download</text>`,
];
y += 15;
parts.push(
  `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
    `Filled: in the box. Hollow: one well-known package away. Empty: not something it sets out to do.</text>`
);
y += 24;

FRAMEWORKS.forEach((name, c) => {
  const cx = PAD_LEFT + c * COL_W + COL_W / 2;
  parts.push(
    `<text x="${cx.toFixed(1)}" y="${y}" font-size="10.5" text-anchor="middle" ` +
      `fill="${c === 0 ? ACCENT : INK}" font-weight="${c === 0 ? 700 : 400}">${esc(name)}</text>`
  );
});
y += 8;
parts.push(`<line x1="14" y1="${y}" x2="${W - 14}" y2="${y}" stroke="${FAINT}" stroke-width="1"/>`);
y += 16;

for (const [label, values] of ROWS) {
  parts.push(
    `<text x="${PAD_LEFT - 14}" y="${y + 4}" font-size="10.5" text-anchor="end" fill="${INK}">${esc(label)}</text>`
  );
  values.forEach((value, c) => {
    const cx = PAD_LEFT + c * COL_W + COL_W / 2;
    const colour = c === 0 ? ACCENT : GREY;
    if (value === 2) {
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${y}" r="5.5" fill="${colour}"/>`);
    } else if (value === 1) {
      parts.push(
        `<circle cx="${cx.toFixed(1)}" cy="${y}" r="5" fill="none" stroke="${colour}" stroke-width="1.6" opacity="0.8"/>`
      );
    } else {
      parts.push(
        `<line x1="${(cx - 4).toFixed(1)}" y1="${y}" x2="${(cx + 4).toFixed(1)}" y2="${y}" ` +
          `stroke="${FAINT}" stroke-width="2" stroke-linecap="round"/>`
      );
    }
  });
  y += ROW_H;
}

y += 8;
parts.push(
  `<text x="14" y="${y}" font-size="9.5" fill="${INK}" opacity="0.85">` +
    `Read together with the size chart, not instead of it. More in the box is more to download, and ` +
    `a team that wants a renderer and nothing else is right to pick a renderer.</text>`
);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y + 10}" width="${W}" height="${y + 10}" ` +
  `font-family="${FONT}">${parts.join('')}</svg>`;

await writeFile(TARGET, svg);
console.log(`${TARGET} written — ${ROWS.length} capabilities x ${FRAMEWORKS.length} projects`);
