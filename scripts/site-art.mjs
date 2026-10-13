/**
 * Draws the site's arcane line art: four illustrations, each in a light and a
 * dark variant, and the icon sprite every page shares.
 *
 *   node scripts/site-art.mjs
 *
 * The illustrations are written as functions of a palette rather than as two
 * hand-kept copies, so the light and the dark file can never drift apart: a
 * line moved in one is moved in both. The output is committed, and the pages
 * swap the two variants with the site theme (`.when-light` and `.when-dark` in
 * site/assets/site.css).
 *
 * The icons are one sprite of <symbol>s drawn in currentColor, so they follow
 * the text colour around them and need no variants at all.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'site/assets/art';

const PALETTES = {
  light: {
    ink: '#2A2440',
    soft: '#8C82AE',
    purple: '#6D3BF5',
    lilac: '#9B7BFF',
    amber: '#E58A1F',
    glow: '#FFB35C',
    magenta: '#E0367A',
    mint: '#1FA67E',
    paper: '#FFFFFF',
    tint: '#F1ECFE',
    warm: '#FFF4E6',
  },
  dark: {
    ink: '#EDE4D8',
    soft: '#8E86A8',
    purple: '#A68BFF',
    lilac: '#C3B1FF',
    amber: '#FFB35C',
    glow: '#FFCF8F',
    magenta: '#FF6FA6',
    mint: '#45E0B0',
    paper: '#1D1830',
    tint: '#2A2148',
    warm: '#3A2A1C',
  },
};

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** A four point sparkle centred on (x, y). */
function sparkle(x, y, r, color, width = 2) {
  const k = r * 0.28;
  return (
    `<path d="M${x} ${y - r}C${x + k * 0.4} ${y - k} ${x + k} ${y - k * 0.4} ${x + r} ${y}` +
    `C${x + k} ${y + k * 0.4} ${x + k * 0.4} ${y + k} ${x} ${y + r}` +
    `C${x - k * 0.4} ${y + k} ${x - k} ${y + k * 0.4} ${x - r} ${y}` +
    `C${x - k} ${y - k * 0.4} ${x - k * 0.4} ${y - k} ${x} ${y - r}Z" ` +
    `fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`
  );
}

const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

function svg(viewBox, title, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}" ` +
    `fill="none" stroke-linecap="round" stroke-linejoin="round">\n<title>${title}</title>\n${body}\n</svg>\n`
  );
}

// ---------------------------------------------------------------------------
// The spell book: an open grimoire whose left page is a .html file.
// ---------------------------------------------------------------------------

function spellBook(c) {
  const code = [
    [`<`, c.purple, `div `, c.ink, `v-data`, c.amber, `="{n:0}">`, c.soft],
    [`  <`, c.purple, `button `, c.ink, `@click`, c.amber, `="n++">`, c.soft],
    [`    cast`, c.ink],
    [`  </`, c.purple, `button>`, c.ink],
    [`  <`, c.purple, `p>`, c.ink, `{ n }`, c.magenta, `</`, c.purple, `p>`, c.ink],
    [`</`, c.purple, `div>`, c.ink],
  ];
  const lines = code
    .map((parts, i) => {
      let spans = '';
      for (let j = 0; j < parts.length; j += 2) {
        const text = parts[j].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        spans += `<tspan fill="${parts[j + 1]}">${text}</tspan>`;
      }
      return `<text x="58" y="${104 + i * 17}" font-family="${MONO}" font-size="9.2" xml:space="preserve">${spans}</text>`;
    })
    .join('\n');

  return svg(
    '0 0 360 270',
    'An open spell book whose left page holds HTML with Voodoo directives',
    [
      // The cover, behind the pages.
      `<path d="M38 74V224C96 216 148 220 180 236C212 220 264 216 322 224V74" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M30 82V232C92 224 146 228 180 244C214 228 268 224 330 232V82" stroke="${c.soft}" stroke-width="2" opacity=".7"/>`,
      // The pages.
      `<path d="M180 76C150 60 100 56 48 64V214C100 206 150 210 180 226Z" fill="${c.paper}" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M180 76C210 60 260 56 312 64V214C260 206 210 210 180 226Z" fill="${c.paper}" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M180 76V226" stroke="${c.ink}" stroke-width="2"/>`,
      // Page curl lines.
      `<path d="M58 222C104 214 150 218 176 230M184 230C210 218 256 214 302 222" stroke="${c.soft}" stroke-width="1.5"/>`,
      lines,
      // The right page: the result, a rune circle around the braces.
      `<circle cx="246" cy="132" r="38" stroke="${c.purple}" stroke-width="2"/>`,
      `<circle cx="246" cy="132" r="30" stroke="${c.lilac}" stroke-width="1.5" stroke-dasharray="2 5"/>`,
      `<path d="M238 116C232 116 232 120 232 125V128C232 130 230 132 227 132C230 132 232 134 232 136V139C232 144 232 148 238 148" stroke="${c.purple}" stroke-width="3"/>`,
      `<path d="M254 116C260 116 260 120 260 125V128C260 130 262 132 265 132C262 132 260 134 260 136V139C260 144 260 148 254 148" stroke="${c.purple}" stroke-width="3"/>`,
      `<path d="M212 186H280M220 198H272" stroke="${c.soft}" stroke-width="2"/>`,
      // The bookmark ribbon.
      `<path d="M276 220V252L284 244L292 252V218" fill="${c.warm}" stroke="${c.amber}" stroke-width="2"/>`,
      // Sparkles rising from the spine.
      `<path d="M180 70C176 52 186 40 182 24" stroke="${c.amber}" stroke-width="2" stroke-dasharray="1 7"/>`,
      sparkle(182, 18, 9, c.amber),
      sparkle(156, 40, 6, c.lilac),
      sparkle(210, 36, 5, c.glow, 1.8),
      dot(164, 22, 2, c.magenta),
      dot(200, 54, 1.8, c.amber),
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// The potions: three bottles labelled with directives.
// ---------------------------------------------------------------------------

function potions(c) {
  const label = (x, y, w, text) =>
    `<rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="20" rx="4" fill="${c.paper}" stroke="${c.ink}" stroke-width="2"/>` +
    `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="${MONO}" font-size="11" font-weight="600" fill="${c.purple}">${text}</text>`;

  return svg(
    '0 0 360 270',
    'Three potion bottles labelled v-data, v-model and v-for',
    [
      // Shelf.
      `<path d="M24 236H336" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M44 236V250M316 236V250" stroke="${c.soft}" stroke-width="2"/>`,
      // Round flask: v-data.
      `<path d="M78 236C50 236 38 214 38 196C38 172 56 154 72 150V122H96V150C112 154 130 172 130 196C130 214 118 236 90 236Z" fill="${c.paper}" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M44 196C64 188 80 204 100 196C112 191 120 192 124 194C124 214 112 230 90 230H78C58 230 44 216 44 196Z" fill="${c.tint}" stroke="${c.purple}" stroke-width="2"/>`,
      `<rect x="68" y="108" width="32" height="16" rx="4" fill="${c.warm}" stroke="${c.amber}" stroke-width="2"/>`,
      label(84, 172, 62, 'v-data'),
      dot(70, 210, 3, c.lilac),
      dot(98, 216, 2.2, c.lilac),
      // Tall bottle: v-model.
      `<path d="M166 236C156 236 152 230 152 222V128C152 118 160 112 170 108V86H194V108C204 112 212 118 212 128V222C212 230 208 236 198 236Z" fill="${c.paper}" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M158 160C172 152 188 168 206 160V222C206 226 202 230 198 230H166C162 230 158 226 158 222Z" fill="${c.warm}" stroke="${c.amber}" stroke-width="2"/>`,
      `<rect x="166" y="72" width="32" height="16" rx="4" fill="${c.tint}" stroke="${c.purple}" stroke-width="2"/>`,
      label(182, 132, 70, 'v-model'),
      `<path d="M172 196L182 186L192 196M172 210L182 200L192 210" stroke="${c.amber}" stroke-width="2"/>`,
      // Conical flask: v-for.
      `<path d="M258 120H286V158L318 222C322 230 318 236 308 236H236C226 236 222 230 226 222L258 158Z" fill="${c.paper}" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<path d="M242 190C258 182 274 198 302 190L314 220C316 226 312 230 306 230H238C232 230 228 226 230 220Z" fill="${c.tint}" stroke="${c.mint}" stroke-width="2"/>`,
      `<rect x="256" y="106" width="32" height="16" rx="4" fill="${c.warm}" stroke="${c.amber}" stroke-width="2"/>`,
      label(272, 168, 56, 'v-for'),
      `<path d="M252 212H262M268 212H278M284 212H294" stroke="${c.mint}" stroke-width="2.5"/>`,
      // Rising bubbles and sparkles.
      `<circle cx="84" cy="88" r="5" stroke="${c.lilac}" stroke-width="2"/>`,
      `<circle cx="74" cy="66" r="3" stroke="${c.lilac}" stroke-width="1.8"/>`,
      `<circle cx="182" cy="52" r="4" stroke="${c.amber}" stroke-width="2"/>`,
      `<circle cx="276" cy="86" r="4" stroke="${c.mint}" stroke-width="2"/>`,
      `<circle cx="286" cy="64" r="2.5" stroke="${c.mint}" stroke-width="1.6"/>`,
      sparkle(130, 82, 8, c.amber),
      sparkle(232, 52, 7, c.purple),
      sparkle(322, 112, 5, c.lilac, 1.8),
      dot(110, 112, 2, c.magenta),
      dot(222, 92, 1.8, c.amber),
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// The rune circle: curly braces bound inside a ring of runes.
// ---------------------------------------------------------------------------

function runeCircle(c) {
  const cx = 150;
  const cy = 150;
  const runes = [];
  const glyphs = [
    (x, y) => `M${x - 4} ${y - 6}L${x + 4} ${y + 6}M${x + 4} ${y - 6}L${x} ${y}`,
    (x, y) => `M${x} ${y - 7}V${y + 7}M${x - 5} ${y - 2}L${x} ${y - 7}L${x + 5} ${y - 2}`,
    (x, y) => `M${x - 5} ${y - 6}H${x + 5}L${x - 5} ${y + 6}H${x + 5}`,
    (x, y) => `M${x - 5} ${y + 6}L${x} ${y - 6}L${x + 5} ${y + 6}M${x - 3} ${y + 1}H${x + 3}`,
    (x, y) => `M${x - 5} ${y - 6}V${y + 6}M${x - 5} ${y}L${x + 5} ${y - 6}M${x - 5} ${y}L${x + 5} ${y + 6}`,
    (x, y) => `M${x} ${y - 7}L${x + 6} ${y}L${x} ${y + 7}L${x - 6} ${y}Z`,
  ];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 - Math.PI / 2;
    const x = +(cx + Math.cos(a) * 111).toFixed(1);
    const y = +(cy + Math.sin(a) * 111).toFixed(1);
    const rot = +((a * 180) / Math.PI + 90).toFixed(1);
    runes.push(
      `<path d="${glyphs[i % glyphs.length](x, y)}" transform="rotate(${rot} ${x} ${y})" stroke="${i % 3 === 0 ? c.amber : c.purple}" stroke-width="2"/>`
    );
  }
  const star = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    star.push([+(cx + Math.cos(a) * 92).toFixed(1), +(cy + Math.sin(a) * 92).toFixed(1)]);
  }
  const tri = (pts) => `M${pts.map((p) => p.join(' ')).join('L')}Z`;

  return svg(
    '0 0 300 300',
    'A ring of runes around a pair of curly braces',
    [
      `<circle cx="${cx}" cy="${cy}" r="130" stroke="${c.ink}" stroke-width="2.5"/>`,
      `<circle cx="${cx}" cy="${cy}" r="92" stroke="${c.ink}" stroke-width="2"/>`,
      `<circle cx="${cx}" cy="${cy}" r="138" stroke="${c.soft}" stroke-width="1.5" stroke-dasharray="1 6"/>`,
      runes.join('\n'),
      `<path d="${tri([star[0], star[2], star[4]])}" stroke="${c.lilac}" stroke-width="1.5"/>`,
      `<path d="${tri([star[1], star[3], star[5]])}" stroke="${c.lilac}" stroke-width="1.5"/>`,
      `<circle cx="${cx}" cy="${cy}" r="52" fill="${c.paper}" stroke="${c.purple}" stroke-width="2.5"/>`,
      // The braces, drawn rather than typed so they render the same anywhere.
      `<path d="M138 118C126 118 126 126 126 136V142C126 146 122 150 116 150C122 150 126 154 126 158V164C126 174 126 182 138 182" stroke="${c.purple}" stroke-width="5"/>`,
      `<path d="M162 118C174 118 174 126 174 136V142C174 146 178 150 184 150C178 150 174 154 174 158V164C174 174 174 182 162 182" stroke="${c.purple}" stroke-width="5"/>`,
      dot(150, 150, 4, c.amber),
      star.map(([x, y]) => dot(x, y, 3.2, c.amber)).join(''),
      sparkle(262, 40, 10, c.amber),
      sparkle(36, 252, 7, c.lilac),
      dot(46, 52, 2.2, c.magenta),
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// The wand and its trail.
// ---------------------------------------------------------------------------

function wand(c) {
  return svg(
    '0 0 360 220',
    'A wand leaving a trail of sparkles',
    [
      `<path d="M58 194L176 92" stroke="${c.ink}" stroke-width="9"/>`,
      `<path d="M58 194L176 92" stroke="${c.paper}" stroke-width="4"/>`,
      `<path d="M150 114L176 92" stroke="${c.amber}" stroke-width="9"/>`,
      `<path d="M74 180L84 171M92 165L100 158" stroke="${c.soft}" stroke-width="2"/>`,
      `<circle cx="182" cy="86" r="7" fill="${c.warm}" stroke="${c.amber}" stroke-width="2.5"/>`,
      // The trail: a loop that ends in the brightest star.
      `<path d="M190 78C214 54 250 44 268 64C284 82 262 104 246 92C228 78 250 40 292 36C314 34 330 44 336 58" stroke="${c.purple}" stroke-width="2.5" stroke-dasharray="2 8"/>`,
      `<path d="M188 92C220 98 236 120 226 146" stroke="${c.lilac}" stroke-width="2" stroke-dasharray="1 7"/>`,
      sparkle(336, 64, 12, c.amber),
      sparkle(268, 120, 8, c.purple),
      sparkle(214, 40, 7, c.lilac),
      sparkle(226, 156, 6, c.amber, 1.8),
      dot(304, 92, 2.5, c.magenta),
      dot(244, 30, 2, c.amber),
      dot(196, 58, 2, c.lilac),
      dot(300, 20, 1.8, c.lilac),
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// Icon sprite: 24 px, 1.75 stroke, round joins, currentColor.
// ---------------------------------------------------------------------------

const ICONS = {
  // Arcane set.
  wand: '<path d="M4 20 15 9"/><path d="m13.5 10.5 1.5-1.5"/><path d="M17 3v3M15.5 4.5h3M20 8v2M19 9h2M12 4v1.5"/>',
  book: '<path d="M12 6c-2-1.5-5-2-8-1.6V19c3-.4 6 0 8 1.6 2-1.6 5-2 8-1.6V4.4C17 4 14 4.5 12 6Z"/><path d="M12 6v14.6"/><path d="M7 9h2M7 12h2.5M15 9h2"/>',
  potion: '<path d="M9.5 3h5M10.5 3v4.2L6 15a4.5 4.5 0 0 0 4 6.5h4a4.5 4.5 0 0 0 4-6.5l-4.5-7.8V3"/><path d="M7.4 13.5c2-1 3.6 1 5.6 0 1.4-.7 2.6-.6 3.6 0"/>',
  rune: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5c-1.4 0-1.4.8-1.4 1.8v.4c0 .7-.5 1.3-1.2 1.3.7 0 1.2.6 1.2 1.3v.4c0 1 0 1.8 1.4 1.8M14 8.5c1.4 0 1.4.8 1.4 1.8v.4c0 .7.5 1.3 1.2 1.3-.7 0-1.2.6-1.2 1.3v.4c0 1 0 1.8-1.4 1.8"/>',
  sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z"/><path d="M19 16v4M17 18h4"/>',
  scroll: '<path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M9 9h4M9 12h4"/>',
  cauldron: '<path d="M4 10h16"/><path d="M5 10c0 5 2.5 9 7 9s7-4 7-9"/><path d="M7 19l-1 2M17 19l1 2"/><circle cx="10" cy="6" r="1.5"/><circle cx="14.5" cy="4.5" r="1"/>',
  crystal: '<circle cx="12" cy="10" r="6.5"/><path d="M7 20h10M8.5 16.5 7 20M15.5 16.5 17 20"/><path d="M9.5 8.5a3 3 0 0 1 2.5-2"/>',
  candle: '<path d="M9 21V11h6v10"/><path d="M7 21h10"/><path d="M12 11V8"/><path d="M12 3c1.6 1.6 1.6 3.4 0 5-1.6-1.6-1.6-3.4 0-5Z"/>',
  moonstar: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/><path d="M17 3v3M15.5 4.5h3"/>',
  pin: '<path d="M14.5 4.5 19.5 9.5"/><path d="m17 7-6.5 6.5"/><path d="M10.5 13.5 4 20"/><circle cx="17" cy="7" r="2.5"/>',
  braces: '<path d="M8 4C5.5 4 5.5 5.5 5.5 7.5v1.8C5.5 10.6 4.6 12 3 12c1.6 0 2.5 1.4 2.5 2.7v1.8c0 2 0 3.5 2.5 3.5M16 4c2.5 0 2.5 1.5 2.5 3.5v1.8c0 1.3.9 2.7 2.5 2.7-1.6 0-2.5 1.4-2.5 2.7v1.8c0 2 0 3.5-2.5 3.5"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4-5"/><path d="M7 13.5 6 12.8M12 9V8M17 13.5l1-.7"/>',
  // Interface set.
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  play: '<path d="M7 4.5v15l12-7.5Z"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  github:
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  npm: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/>',
};

function sprite() {
  const symbols = Object.entries(ICONS)
    .map(
      ([name, paths]) =>
        `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</symbol>`
    )
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols}\n</svg>\n`;
}

// ---------------------------------------------------------------------------

const ART = { 'spell-book': spellBook, potions, 'rune-circle': runeCircle, wand };

for (const [variant, palette] of Object.entries(PALETTES)) {
  mkdirSync(`${OUT}/${variant}`, { recursive: true });
  for (const [name, draw] of Object.entries(ART)) {
    writeFileSync(`${OUT}/${variant}/${name}.svg`, draw(palette));
  }
}
writeFileSync(`${OUT}/icons.svg`, sprite());
console.log(`${Object.keys(ART).length * 2} illustrations and ${Object.keys(ICONS).length} icons written to ${OUT}`);
