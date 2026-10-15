/**
 * Draws the seasonal art for the site: for each special date, Vudu in costume
 * (light and dark), a hanging garland for the hero (light and dark), and a
 * sprite of four line icons in the site's icon style.
 *
 *   node scripts/site-seasons-art.mjs
 *
 * Writes site/assets/seasons/<id>/{vudu-light,vudu-dark,accent-light,accent-dark,icons}.svg.
 * The costume is drawn over the regular mascot files, so a change to Vudu
 * reaches every season the next time this runs. The dark mascot keeps the
 * cream sticker rim of vudu-dark.svg, and the props get the same rim.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'site/assets/seasons';
const INK = '#1b1033';
const CREAM = '#FBF7F2';

const NAMES = {
  newyear: 'New Year', carnival: 'Carnival', easter: 'Easter', valentine: "Valentine's Day",
  junina: 'Festa Junina', halloween: 'Halloween', christmas: 'Christmas',
};

// ------------------------------------------------------------- helpers

const o = (width = 6) => `stroke="${INK}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;
const ellipsePath = (cx, cy, rx, ry) =>
  `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
const flake = (x, y, r, c) =>
  `<g stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M${x} ${y - r}V${y + r}M${x - r * 0.87} ${y - r / 2}L${x + r * 0.87} ${y + r / 2}M${x - r * 0.87} ${y + r / 2}L${x + r * 0.87} ${y - r / 2}"/></g>`;
const burst = (x, y, r, colors) => {
  let s = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = (x + Math.cos(a) * r * 0.35).toFixed(1), y1 = (y + Math.sin(a) * r * 0.35).toFixed(1);
    const x2 = (x + Math.cos(a) * r).toFixed(1), y2 = (y + Math.sin(a) * r).toFixed(1);
    const c = colors[i % colors.length];
    s += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`;
    s += `<circle cx="${(x + Math.cos(a) * (r + 9)).toFixed(1)}" cy="${(y + Math.sin(a) * (r + 9)).toFixed(1)}" r="4" fill="${c}"/>`;
  }
  return s;
};

// ------------------------------------------------------------- costumes

/** Each costume returns { back, front }: drawn behind and in front of Vudu. */
const COSTUME = {
  halloween: (dark) => ({
    back: '',
    front:
      // witch hat, tip curling to the right
      `<path d="M188 102 Q214 46 246 14 Q270 -2 306 16 Q284 22 276 44 L326 102 Z" fill="#2a1d45" ${o()}/>` +
      `<path d="M194 86 Q256 104 318 86 L324 100 Q256 120 188 100 Z" fill="#FFB35C" ${o()}/>` +
      `<ellipse cx="256" cy="106" rx="132" ry="24" fill="#2a1d45" ${o()}/>` +
      `<path d="M166 102 Q256 120 346 102" fill="none" stroke="${dark ? '#5b4a85' : '#4a3a6e'}" stroke-width="4" stroke-linecap="round"/>` +
      // carved pumpkin in the right hand
      `<rect x="388" y="378" width="10" height="20" rx="4" fill="#4F7A3A" ${o()}/>` +
      `<ellipse cx="370" cy="432" rx="28" ry="34" fill="#E8833A" ${o()}/>` +
      `<ellipse cx="414" cy="432" rx="28" ry="34" fill="#E8833A" ${o()}/>` +
      `<ellipse cx="392" cy="432" rx="26" ry="36" fill="#F09547" ${o()}/>` +
      `<path d="M372 422 l10 -12 l10 12 Z M402 422 l10 -12 l10 12 Z" fill="${INK}"/>` +
      `<path d="M370 440 Q392 462 414 440 l-6 6 l-6 -6 l-6 8 l-6 -8 l-6 6 Z" fill="${INK}"/>`,
  }),
  christmas: (dark) => ({
    back: flake(70, 140, 16, dark ? '#E9F1FF' : '#8FA5D6') + flake(452, 210, 12, dark ? '#E9F1FF' : '#8FA5D6') +
      flake(88, 320, 10, dark ? '#E9F1FF' : '#8FA5D6') + flake(440, 330, 14, dark ? '#E9F1FF' : '#8FA5D6'),
    front:
      // knit beanie with a cuff and a pompom
      `<path d="M158 140 Q160 66 256 62 Q352 66 354 140 Z" fill="#C8414B" ${o()}/>` +
      `<path d="M206 72 Q200 104 204 138 M256 64 V138 M306 72 Q312 104 308 138" fill="none" stroke="#A8323B" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="146" y="124" width="220" height="32" rx="16" fill="${CREAM}" ${o()}/>` +
      `<circle cx="256" cy="54" r="22" fill="${CREAM}" ${o()}/>` +
      // the scarf, with a tail
      `<path d="M192 320 Q256 350 320 320 L326 346 Q256 380 186 346 Z" fill="#C8414B" ${o()}/>` +
      `<path d="M282 350 L300 424 L272 428 L264 356 Z" fill="#C8414B" ${o()}/>` +
      `<path d="M226 336 L222 360 M290 336 L294 358 M276 400 L300 396" stroke="${CREAM}" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M276 428 v10 M286 427 v10 M296 426 v10" stroke="#C8414B" stroke-width="4" stroke-linecap="round"/>`,
  }),
  carnival: () => ({
    back:
      `<rect x="70" y="120" width="14" height="8" rx="2" fill="#FF3D8B" transform="rotate(24 77 124)"/>` +
      `<rect x="430" y="180" width="14" height="8" rx="2" fill="#2BB7A3" transform="rotate(-30 437 184)"/>` +
      `<rect x="96" y="300" width="14" height="8" rx="2" fill="#FFB35C" transform="rotate(40 103 304)"/>` +
      `<circle cx="452" cy="300" r="6" fill="#4C8DF6"/><circle cx="60" cy="220" r="5" fill="#7F57FA"/><circle cx="420" cy="90" r="5" fill="#FFB35C"/>`,
    front:
      // feathers on the right of the mask
      `<path d="M352 202 Q392 150 428 132 Q410 176 362 214 Z" fill="#FF3D8B" ${o()}/>` +
      `<path d="M358 210 Q408 182 446 182 Q414 214 364 222 Z" fill="#FFB35C" ${o()}/>` +
      // the mask, with holes for the eyes
      `<path fill-rule="evenodd" d="M144 214 Q158 178 206 184 Q240 188 256 204 Q272 188 306 184 Q354 178 368 214 Q374 254 330 260 Q290 264 256 238 Q222 264 182 260 Q138 254 144 214 Z ${ellipsePath(200, 222, 24, 28)} ${ellipsePath(312, 222, 24, 28)}" fill="#2BB7A3" ${o()}/>` +
      `<path d="M168 246 Q182 252 196 248 M316 248 Q330 252 344 246" stroke="#FFB35C" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<circle cx="256" cy="214" r="7" fill="#FFB35C" ${o(4)}/>`,
  }),
  easter: () => ({
    back: `<path d="M104 404 Q150 326 196 404" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M104 404 Q150 326 196 404" fill="none" stroke="#C08A4B" stroke-width="8" stroke-linecap="round"/>`,
    front:
      `<ellipse cx="124" cy="398" rx="15" ry="19" fill="#F5B8D0" ${o(5)}/>` +
      `<ellipse cx="176" cy="398" rx="15" ry="19" fill="#F8E39A" ${o(5)}/>` +
      `<ellipse cx="150" cy="390" rx="16" ry="21" fill="#BFD9F7" ${o(5)}/>` +
      `<path d="M136 388 l7 -5 l7 5 l7 -5 l7 5" fill="none" stroke="${CREAM}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M94 404 L206 404 L194 456 Q150 468 106 456 Z" fill="#C08A4B" ${o()}/>` +
      `<path d="M100 422 H200 M104 440 H196" stroke="#8A5A2B" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M124 406 V458 M150 406 V462 M176 406 V458" stroke="#8A5A2B" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`,
  }),
  valentine: () => ({
    back: `<path d="M360 390 Q404 300 432 172" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
    front:
      `<path d="M432 172 C376 130 388 74 432 98 C476 74 488 130 432 172 Z" fill="#E5486B" ${o()}/>` +
      `<ellipse cx="412" cy="108" rx="9" ry="13" fill="${CREAM}" opacity="0.7" transform="rotate(-30 412 108)"/>` +
      `<path d="M428 176 l4 -6 l4 6 Z" fill="#C93558" ${o(3)}/>` +
      `<path d="M96 150 C80 140 82 124 96 130 C110 124 112 140 96 150 Z" fill="#F27A97" ${o(4)}/>`,
  }),
  junina: () => ({
    back:
      // the bonfire at Vudu's feet, on the left
      `<path d="M62 476 L150 452 M62 452 L150 476" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="M62 476 L150 452 M62 452 L150 476" stroke="#8A5A2B" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M106 456 C82 444 84 414 98 398 C100 412 108 414 110 404 C116 388 108 376 112 364 C134 384 140 414 128 436 C136 432 138 424 138 418 C150 436 140 456 106 456 Z" fill="#FF8A3D" ${o(5)}/>` +
      `<path d="M106 452 C96 446 96 430 104 420 C108 430 114 428 116 422 C124 436 120 450 106 452 Z" fill="#FFD27A"/>`,
    front:
      // straw hat with a red band and a patch
      `<path d="M190 106 Q194 52 256 50 Q318 52 322 106 Z" fill="#E9C988" ${o()}/>` +
      `<path d="M192 92 Q256 104 320 92 L322 106 Q256 118 190 106 Z" fill="#C8414B" ${o(4)}/>` +
      `<ellipse cx="256" cy="110" rx="152" ry="28" fill="#E6C27A" ${o()}/>` +
      `<path d="M136 112 l10 4 M166 122 l10 3 M336 122 l10 -3 M366 112 l10 -4 M226 64 l8 6 M290 66 l-6 8" stroke="#B8914A" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="282" y="66" width="18" height="16" rx="3" fill="#7FB0D9" ${o(3)}/>`,
  }),
  newyear: () => ({
    back: burst(84, 96, 44, ['#FFB35C', '#FF6FA5', '#7FE0D0']) + burst(436, 74, 36, ['#9B7BFF', '#FFD27A', '#FF6FA5']) +
      burst(458, 262, 22, ['#7FE0D0', '#FFB35C']),
    front:
      // a party hat, tilted
      `<path d="M276 104 L324 18 L352 116 Z" fill="#2BB7A3" ${o()} />` +
      `<path d="M292 76 L332 86 M284 92 L342 104 M306 48 L326 54" stroke="#FFD27A" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="324" cy="16" r="12" fill="#FFB35C" ${o(5)}/>`,
  }),
};

// ------------------------------------------------------------- mascots

function inner(file) {
  const svg = readFileSync(file, 'utf8');
  return svg
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/, '')
    .replace(/<desc[^>]*>[\s\S]*?<\/desc>\s*/, '');
}

const RIM = `<style>.rim *{fill:none!important;stroke:${CREAM}!important;stroke-width:24px!important;stroke-linejoin:round;stroke-linecap:round}</style>`;

function mascot(id, dark) {
  const base = inner(`site/assets/brand/vudu/${dark ? 'vudu-dark' : 'vudu'}.svg`);
  const { back, front } = COSTUME[id](dark);
  const body = dark
    ? `${RIM}<g class="rim">${back}</g>${back}
${base}
<g class="rim">${front}</g>${front}`
    : `${back}
${base}
${front}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Vudu, the Voodoo.js mascot, dressed for ${NAMES[id]}">
${body}
</svg>
`;
}

// ------------------------------------------------------------- garlands

/** A point on the quadratic curve from a to b through control c. */
function at(a, c, b, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}

const HANG = {
  halloween: (x, y, i, dark) =>
    i % 2
      ? `<path d="M${x} ${y}v14" stroke="${dark ? '#8d80b0' : '#6b5a8c'}" stroke-width="1.5"/>` +
        `<path d="M${x} ${y + 22} q-8 -8 -20 -4 q6 4 6 10 q6 -4 14 2 q8 -6 14 -2 q0 -6 6 -10 q-12 -4 -20 4 Z" fill="${dark ? '#6a5a96' : '#2a1d45'}"/>`
      : `<path d="M${x} ${y}v8" stroke="${dark ? '#8d80b0' : '#6b5a8c'}" stroke-width="1.5"/>` +
        `<rect x="${x - 2}" y="${y + 6}" width="4" height="6" rx="1" fill="#4F7A3A"/>` +
        `<ellipse cx="${x}" cy="${y + 21}" rx="13" ry="11" fill="#E8833A"/><ellipse cx="${x}" cy="${y + 21}" rx="5" ry="11" fill="#F09547"/>`,
  christmas: (x, y, i) => {
    const c = ['#C8414B', '#FFB35C', '#2F8A63', '#8FA5D6'][i % 4];
    return `<rect x="${x - 4}" y="${y + 2}" width="8" height="6" rx="1.5" fill="#D9B45A"/><circle cx="${x}" cy="${y + 18}" r="11" fill="${c}"/>` +
      `<path d="M${x - 5} ${y + 13} a6 6 0 0 1 6 -3" stroke="#fff" stroke-opacity="0.6" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  },
  carnival: (x, y, i) => {
    const c = ['#7F57FA', '#FF3D8B', '#FFB35C', '#2BB7A3', '#4C8DF6'][i % 5];
    return `<path d="M${x} ${y} q8 10 0 20 q-8 10 0 20 q8 10 0 18" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="${x + 10}" y="${y + 16}" width="7" height="4" rx="1" fill="${c}" transform="rotate(30 ${x + 13} ${y + 18})"/>`;
  },
  easter: (x, y, i) => {
    const c = ['#F5B8D0', '#BFD9F7', '#F8E39A', '#C8EBC4'][i % 4];
    return `<path d="M${x} ${y}v8" stroke="#b9a7d6" stroke-width="1.5"/><ellipse cx="${x}" cy="${y + 22}" rx="10" ry="13" fill="${c}"/>` +
      `<path d="M${x - 9} ${y + 21} l4.5 -3 l4.5 3 l4.5 -3 l4.5 3" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round"/>`;
  },
  valentine: (x, y, i) => {
    const c = ['#E5486B', '#F27A97', '#C93558'][i % 3];
    return `<path d="M${x} ${y}v6" stroke="#d18aa0" stroke-width="1.5"/>` +
      `<path d="M${x} ${y + 26} c-14 -9 -11 -20 0 -15 c11 -5 14 6 0 15 Z" fill="${c}"/>`;
  },
  junina: (x, y, i) => {
    const c = ['#C8414B', '#FFB35C', '#2BB7A3', '#4C8DF6', '#7F57FA', '#FF6FA5'][i % 6];
    return `<path d="M${x - 12} ${y} L${x + 12} ${y} L${x + 12} ${y + 26} L${x} ${y + 18} L${x - 12} ${y + 26} Z" fill="${c}"/>`;
  },
  newyear: (x, y, i) => {
    const c = ['#FFB35C', '#9B7BFF', '#FF6FA5', '#7FE0D0'][i % 4];
    const len = 6 + (i % 3) * 5;
    return `<path d="M${x} ${y}v${len}" stroke="#b9a7d6" stroke-width="1.5"/>` +
      `<path d="M${x} ${y + len} l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 Z" fill="${c}"/>`;
  },
};

function garland(id, dark) {
  const line = dark ? '#8d80b0' : '#6b5a8c';
  const swags = [
    [[0, 6], [150, 50], [300, 14]],
    [[300, 14], [450, 50], [600, 6]],
    [[600, 6], [750, 50], [900, 14]],
    [[900, 14], [1050, 50], [1200, 6]],
  ];
  let path = '';
  let items = '';
  let n = 0;
  for (const [a, c, b] of swags) {
    path += `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]} `;
    for (const t of [0.2, 0.5, 0.8]) {
      const [x, y] = at(a, c, b, t);
      items += HANG[id](Math.round(x), Math.round(y), n++, dark);
    }
  }
  const string = id === 'christmas'
    ? `<path d="${path}" fill="none" stroke="${dark ? '#3f8a69' : '#2F6B4F'}" stroke-width="7" stroke-linecap="round"/>`
    : `<path d="${path}" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 68" width="1200" height="68" aria-hidden="true">
<g opacity="${dark ? 0.85 : 0.9}">${string}${items}</g>
</svg>
`;
}

// ------------------------------------------------------------- icons

const STAR = '<path d="m12 4 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.3l5-.7Z"/>';
const ICONS = {
  halloween: [
    '<path d="M12 7c-4.5 0-7.5 2.8-7.5 6.5S7.5 20 12 20s7.5-2.8 7.5-6.5S16.5 7 12 7Z"/><path d="M12 7c-2 0-3 3-3 6.5S10 20 12 20M12 7c2 0 3 3 3 6.5S14 20 12 20"/><path d="M12 7V4.5c0-.8.6-1.5 1.5-1.5"/>',
    '<path d="M2.5 9c2 0 3.5 1 4 2.5.8-1 2-1.2 3-.5L12 9l2.5 2c1-.7 2.2-.5 3 .5.5-1.5 2-2.5 4-2.5-1 2-1 4 0 6-1.8 0-3.2.6-4 1.8-.8-.8-2-1-3-.3L12 18l-2.5-1.5c-1-.7-2.2-.5-3 .3-.8-1.2-2.2-1.8-4-1.8 1-2 1-4 0-6Z"/>',
    '<path d="M3 18.5h18"/><path d="M6 18.5 11 5c.4-1 1.6-1.2 2.2-.3L15 8l-1.5.5L18 18.5"/><path d="M8 14.5h8"/>',
    '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5Z"/><path d="M10 11h.01M14 11h.01"/>',
  ],
  christmas: [
    '<path d="M12 3 7 10h3l-4 6h12l-4-6h3Z"/><path d="M12 16v4"/>',
    '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="m10 4.5 2 1.5 2-1.5M10 19.5l2-1.5 2 1.5"/>',
    '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9c2 0 5 0 5-1.5S13.5 6 12 9Z"/>',
    '<path d="M6 16h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v4Z"/><path d="M10.5 19a1.5 1.5 0 0 0 3 0"/><path d="M12 4v1.5"/>',
  ],
  carnival: [
    '<path d="M3 9c3-1.5 6-1 9 1 3-2 6-2.5 9-1 0 4-2 7-5 7-1.6 0-2.8-1-4-2.5C10.8 15 9.6 16 8 16c-3 0-5-3-5-7Z"/><path d="M7 11h2M15 11h2"/>',
    '<path d="M4 20 8 9l7 7Z"/><path d="M13 7l1-3M17 11l3-1M15 9l3-3"/><path d="M18.5 3.5h.01M20.5 7h.01M11 4h.01"/>',
    '<path d="M4 4c3 0 3 3 6 3s3-3 6-3 3 3 4 3"/><path d="M6 11c2 2 0 4 2 6s4 0 4 3"/><path d="M15 10c-1 3 2 4 1 7"/>',
    STAR,
  ],
  easter: [
    '<path d="M12 3c3.5 0 6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 2.5-10 6-10Z"/><path d="m6.5 12 2-1.5 2 1.5 1.5-1.5 1.5 1.5 2-1.5 2 1.5"/>',
    '<path d="M9 9V4.5a1.5 1.5 0 0 1 3 0V9M12 9V4.5a1.5 1.5 0 0 1 3 0V9"/><circle cx="12" cy="14.5" r="5.5"/><path d="M10.5 14h.01M13.5 14h.01M11 17h2"/>',
    '<path d="M4 11h16l-1.8 8a1.5 1.5 0 0 1-1.5 1.2H7.3A1.5 1.5 0 0 1 5.8 19Z"/><path d="M7 11a5 5 0 0 1 10 0"/><path d="M5 15h14"/>',
    '<circle cx="12" cy="9" r="2"/><path d="M12 7a2.3 2.3 0 1 1 1.8-3.5A2.3 2.3 0 1 1 14.8 9a2.3 2.3 0 1 1-2.8 3.3A2.3 2.3 0 1 1 9.2 9 2.3 2.3 0 1 1 10.2 5.4"/><path d="M12 12v9M12 17c-1.8-1.8-3.8-2-5-1.5"/>',
  ],
  valentine: [
    '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
    '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
    '<path d="M12 18s-5.5-3.3-5.5-7.2A3.2 3.2 0 0 1 12 9a3.2 3.2 0 0 1 5.5 1.8c0 3.9-5.5 7.2-5.5 7.2Z"/><path d="M3 21 9 15M15 9l6-6M17 3h4v4"/>',
    '<path d="M12 4c2.5 0 4.5 2 4.5 4.5S14.5 13 12 13s-4.5-2-4.5-4.5S9.5 4 12 4Z"/><path d="M12 7c1 .5 1.5 1.5 1 2.5"/><path d="M12 13v8M12 17c1.5-1.5 3.5-2 5-1.5-.5 1.5-2.5 2.5-5 1.5"/>',
  ],
  junina: [
    '<path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-7.5Z"/><path d="M4 20l16-3M20 20 4 17"/>',
    '<path d="M3 5c6 3 12 3 18 0"/><path d="m5 6 1.5 6L8 6.8M10.5 7.4 12 13l1.5-5.6M16 6.8l1.5 5.2L19 6"/>',
    '<path d="M2.5 16c0 1.5 4.3 3 9.5 3s9.5-1.5 9.5-3-2-2.3-4.5-2.7M7 13.3C4.5 13.7 2.5 14.5 2.5 16"/><path d="M7 14V9.5C7 7 9.2 5 12 5s5 2 5 4.5V14"/><path d="M7 11.5h10"/>',
    '<path d="M12 3c3 0 4.5 4 4.5 8.5S15 20 12 20s-4.5-4-4.5-8.5S9 3 12 3Z"/><path d="M10 7h4M9.5 10.5h5M9.5 14h5"/>',
  ],
  newyear: [
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/><circle cx="12" cy="12" r="1.5"/>',
    '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2"/><path d="M9 3h6"/>',
    '<path d="M8 3h8l-.8 6a3.2 3.2 0 0 1-6.4 0Z"/><path d="M12 12.2V20M8.5 20h7"/><path d="M8.6 6.5h6.8"/>',
    STAR,
  ],
};

function sprite(id) {
  const symbols = ICONS[id]
    .map(
      (body, i) =>
        `<symbol id="s-${i + 1}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">\n${symbols}\n</svg>\n`;
}

// ------------------------------------------------------------- write

let count = 0;
for (const id of Object.keys(COSTUME)) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const files = {
    'vudu-light.svg': mascot(id, false),
    'vudu-dark.svg': mascot(id, true),
    'accent-light.svg': garland(id, false),
    'accent-dark.svg': garland(id, true),
    'icons.svg': sprite(id),
  };
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(join(dir, name), text);
    count++;
  }
}
console.log(`${count} files in ${OUT}`);
