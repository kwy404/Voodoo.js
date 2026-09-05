/**
 * Draws the list-reconciliation charts straight from the benchmark results.
 *
 *   node scripts/chart-reconcile.mjs
 *
 * Three pictures, three different questions, one source of truth each:
 *
 *   docs/media/reconcile-before-after.svg   how long an edit takes, before and after
 *   docs/media/reconcile-work.svg           how many rows the reconciler looks at
 *   docs/media/reconcile-dom-ops.svg        how many nodes it creates, removes and moves
 *
 * Nothing here is typed in by hand. Re-run the benchmark, run this, and the
 * pictures cannot disagree with the tables beside them — which is exactly what
 * went wrong the last time a chart in this repository was hand-edited.
 */

import { readFile, writeFile } from 'node:fs/promises';

const BEFORE = 'benchmarks/results/reconcile-before.json';
const AFTER = 'benchmarks/results/reconcile-after.json';

const GREY = '#b0abc2';
const ACCENT = '#6D3BF5';
const INK = '#8b8b9e';
const FAINT = '#d8d5e4';

const FONT = 'ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif';

const before = JSON.parse(await readFile(BEFORE, 'utf8'));
const after = JSON.parse(await readFile(AFTER, 'utf8'));

const afterById = new Map(after.results.map((r) => [r.id, r]));
const pairs = before.results
  .map((b) => ({ id: b.id, name: b.name, n: b.n, before: b, after: afterById.get(b.id) }))
  .filter((p) => p.after);

/** Short labels: the chart has no room for "replace/remove-middle-of-10000". */
function short(id) {
  const [family, rest] = id.split('/');
  const name = rest
    .replace(/-of-10000$/, '')
    .replace(/-to-10000$/, ' → 10k')
    .replace(/-10000$/, ' 10k')
    .replace(/-1-/, ' 1 ')
    .replace(/-/g, ' ');
  return family === 'create' ? `create ${rest}` : `${name}  (${family})`;
}

function svg(width, height, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `width="${width}" height="${height}" font-family="${FONT}">${body}</svg>`
  );
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A number a person can read at a glance. */
function ms(v) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function count(v) {
  if (v >= 1000) return Math.round(v).toLocaleString('en-US');
  return String(Math.round(v * 10) / 10);
}

// ---------------------------------------------------------------------------
// 1. Time: before against after
// ---------------------------------------------------------------------------
//
// Each row is scaled to its OWN "before", because the scenarios span three
// orders of magnitude and one shared axis would leave every fast case as a
// hairline. The bar therefore reads as "how much of the old cost is left", and
// both absolute numbers are printed so nothing depends on reading the picture.
{
  const PAD_LEFT = 208;
  const BAR_W = 300;
  const ROW_H = 30;

  let y = 22;
  const parts = [
    `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
      `Time for one edit — bars scaled per row to the old cost</text>`,
  ];
  y += 15;
  parts.push(
    `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
      `median of ${pairs[0].before.iterations}+ samples, jsdom, ${esc(after.env.node)} — lower is better. ` +
      `Grey: before. Purple: after.</text>`
  );
  y += 20;

  for (const p of pairs) {
    const b = p.before.stats.median;
    const a = p.after.stats.median;
    const scale = Math.max(b, a);
    const wb = Math.max(1, (b / scale) * BAR_W);
    const wa = Math.max(1, (a / scale) * BAR_W);
    const speedup = b / a;

    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 13}" font-size="10.5" text-anchor="end" fill="${INK}">${esc(short(p.id))}</text>`,
      `<rect x="${PAD_LEFT}" y="${y}" width="${wb.toFixed(1)}" height="9" rx="2" fill="${GREY}"/>`,
      `<rect x="${PAD_LEFT}" y="${y + 11}" width="${wa.toFixed(1)}" height="9" rx="2" fill="${ACCENT}"/>`,
      `<text x="${(PAD_LEFT + Math.max(wb, wa) + 8).toFixed(1)}" y="${y + 8}" font-size="10" fill="${INK}">${ms(b)} ms</text>`,
      `<text x="${(PAD_LEFT + Math.max(wb, wa) + 8).toFixed(1)}" y="${y + 19}" font-size="10" font-weight="700" fill="${ACCENT}">` +
        `${ms(a)} ms  ${speedup >= 1.15 ? `· ${speedup.toFixed(1)}x` : ''}</text>`
    );
    y += ROW_H;
  }

  await writeFile('docs/media/reconcile-before-after.svg', svg(760, y + 10, parts.join('')));
  console.log('docs/media/reconcile-before-after.svg');
}

// ---------------------------------------------------------------------------
// 2. Work: how many rows the reconciler actually looks at
// ---------------------------------------------------------------------------
//
// Logarithmic, and it has to be: the same edit goes from twenty thousand rows
// visited to three. On a linear axis the second bar does not exist.
{
  const shown = pairs.filter((p) => p.before.counters && p.after.counters && p.before.group !== 'create');
  const rows = shown.length ? shown : pairs;

  const PAD_LEFT = 208;
  const BAR_W = 300;
  const ROW_H = 30;
  // `keyEvaluations` rather than `itemsVisited`: the two implementations count
  // "rows visited" differently — the old one never counted the rows it walked
  // again to remove or to place — while "times a key was computed" means the
  // same thing in both, which is what a before/after chart requires.
  const maxLog = Math.log10(
    Math.max(...rows.map((p) => Math.max(p.before.counters.keyEvaluations, p.after.counters.keyEvaluations, 1))) + 1
  );
  const width = (v) => Math.max(1.5, (Math.log10(v + 1) / maxLog) * BAR_W);

  let y = 22;
  const parts = [
    `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
      `Times a row's :key was computed, per edit — logarithmic</text>`,
  ];
  y += 15;
  parts.push(
    `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
      `Counted, not timed. Two reconciliations per iteration: the edit and undoing it. Grey: before. Purple: after.</text>`
  );
  y += 20;

  for (const p of rows) {
    const b = p.before.counters.keyEvaluations;
    const a = p.after.counters.keyEvaluations;
    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 13}" font-size="10.5" text-anchor="end" fill="${INK}">${esc(short(p.id))}</text>`,
      `<rect x="${PAD_LEFT}" y="${y}" width="${width(b).toFixed(1)}" height="9" rx="2" fill="${GREY}"/>`,
      `<rect x="${PAD_LEFT}" y="${y + 11}" width="${width(a).toFixed(1)}" height="9" rx="2" fill="${ACCENT}"/>`,
      `<text x="${(PAD_LEFT + Math.max(width(b), width(a)) + 8).toFixed(1)}" y="${y + 8}" font-size="10" fill="${INK}">${count(b)}</text>`,
      `<text x="${(PAD_LEFT + Math.max(width(b), width(a)) + 8).toFixed(1)}" y="${y + 19}" font-size="10" font-weight="700" fill="${ACCENT}">${count(a)}</text>`
    );
    y += ROW_H;
  }

  await writeFile('docs/media/reconcile-work.svg', svg(760, y + 10, parts.join('')));
  console.log('docs/media/reconcile-work.svg');
}

// ---------------------------------------------------------------------------
// 3. DOM operations per edit
// ---------------------------------------------------------------------------
//
// The interesting column is `move`. A reconciler that reuses every element can
// still be slow if it drags them all across the list to get there, and this is
// the number that says whether it does.
{
  const rows = pairs.filter((p) => p.after.counters && p.before.group !== 'create');

  const PAD_LEFT = 208;
  const COL_W = 92;
  const ROW_H = 21;
  const COLUMNS = [
    ['domCreates', 'created'],
    ['domRemoves', 'removed'],
    ['domMoves', 'moved'],
  ];

  let y = 22;
  const parts = [
    `<text x="14" y="${y}" font-size="12.5" font-weight="700" fill="${INK}">` +
      `Nodes created, removed and moved per edit</text>`,
  ];
  y += 15;
  parts.push(
    `<text x="14" y="${y}" font-size="10.5" fill="${INK}">` +
      `After the change. Two reconciliations per iteration: the edit and undoing it. ` +
      `A move is an element that was already in the document being put somewhere else.</text>`
  );
  y += 22;

  COLUMNS.forEach(([, label], c) => {
    parts.push(
      `<text x="${PAD_LEFT + c * COL_W + COL_W - 10}" y="${y}" font-size="10.5" font-weight="700" ` +
        `text-anchor="end" fill="${INK}">${label}</text>`
    );
  });
  y += 6;
  parts.push(`<line x1="14" y1="${y}" x2="746" y2="${y}" stroke="${FAINT}" stroke-width="1"/>`);
  y += 8;

  for (const p of rows) {
    parts.push(
      `<text x="${PAD_LEFT - 8}" y="${y + 10}" font-size="10.5" text-anchor="end" fill="${INK}">${esc(short(p.id))}</text>`
    );
    COLUMNS.forEach(([key], c) => {
      const v = p.after.counters[key];
      parts.push(
        `<text x="${PAD_LEFT + c * COL_W + COL_W - 10}" y="${y + 10}" font-size="10.5" text-anchor="end" ` +
          `fill="${v > 0 ? ACCENT : INK}" font-weight="${v > 0 ? 700 : 400}">${count(v)}</text>`
      );
    });
    y += ROW_H;
  }

  await writeFile('docs/media/reconcile-dom-ops.svg', svg(760, y + 10, parts.join('')));
  console.log('docs/media/reconcile-dom-ops.svg');
}

// ---------------------------------------------------------------------------
// A short summary on stdout, so a run that produced nonsense is visible
// ---------------------------------------------------------------------------
console.log('');
for (const p of pairs) {
  const b = p.before.stats.median;
  const a = p.after.stats.median;
  console.log(
    `  ${p.id.padEnd(40)} ${ms(b).padStart(9)} -> ${ms(a).padStart(9)} ms   ${(b / a).toFixed(2)}x`
  );
}
