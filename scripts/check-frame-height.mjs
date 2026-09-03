/**
 * Drives ajustarAltura against a frame whose content is a fixed height, and
 * reports whether the measured height settles or climbs.
 *
 * No jsdom: the function only reads `contentDocument` and writes
 * `style.height`, so a plain object is a truer stand-in than a DOM that brings
 * its own opinions about layout.
 *
 * The behaviour being pinned: a body fills its frame, so `scrollHeight` never
 * reports less than the height the frame was already given. Adding a margin to
 * that made every pass taller than the last, and the card grew on every click.
 */

import { readFileSync } from 'node:fs';

const source = readFileSync('site/docs/assets/docs.js', 'utf8');
const fn = source.match(/function ajustarAltura\(quadro\) \{[\s\S]*?\n {2}\}/)[0];

// Wrapped in parentheses so eval yields the function rather than declaring it.
const ajustarAltura = eval(`(${fn})`);

const CONTENT = 200;

// The height must be read when `scrollHeight` is accessed, not when the
// document object is obtained. A real contentDocument is live: code holds the
// same object across a style write and reads a fresh layout afterwards. My
// first version captured the height up front, which made the collapse look
// ineffective and the fix look broken when it was the mock that was wrong.
const frame = {
  style: { height: '' },
  get contentDocument() {
    return {
      body: {
        get scrollHeight() {
          const applied = parseInt(frame.style.height, 10) || 0;
          return Math.max(CONTENT, applied);
        },
      },
      documentElement: { get scrollHeight() { return 0; } },
    };
  },
};

const seen = [];
for (let i = 0; i < 6; i++) {
  ajustarAltura(frame);
  seen.push(frame.style.height);
}

const settles = new Set(seen).size === 1;
console.log('heights measured : ' + seen.join(' -> '));
console.log('settles          : ' + (settles ? 'yes' : 'NO, it climbs'));

process.exit(settles ? 0 : 1);
