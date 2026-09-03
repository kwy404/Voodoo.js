/**
 * Drives `ajustarAltura` against a live example frame and fails if the height
 * climbs instead of settling.
 *
 *   node scripts/check-frame-height.mjs
 *
 * The bug this pins, reproduced in a browser on site/docs/guia/eventos.html:
 * clicking a counter that never changed size grew its card from 144px to 192px
 * over twelve clicks, and kept going for as long as anyone kept interacting.
 *
 * The mechanism is the difference between two measurements. The frame is a grid
 * item stretched by the code pane beside it, so the inner document's ROOT
 * element fills whatever height the frame was last given, and
 * `documentElement.scrollHeight` hands that number straight back. The BODY does
 * not: the stylesheet docs.js injects gives it `margin:0;padding:16px` and no
 * height, so it measures its own content and nothing else. Measured on that
 * page: body 108px, documentElement 192px, in a frame rendered at 192px.
 *
 * Taking `Math.max` of the two therefore read back the previous measurement,
 * added the 8px margin, and wrote a frame 8px taller. Every click, keystroke
 * and resize observation ran it again.
 *
 * No jsdom. jsdom has no layout, so `scrollHeight` there is whatever the mock
 * says regardless, and the echo that causes this bug cannot be expressed. A
 * plain object that models the echo explicitly is both simpler and a truer
 * stand-in.
 */

import { readFileSync } from 'node:fs';

const source = readFileSync('site/docs/assets/docs.js', 'utf8');
const match = source.match(/function ajustarAltura\(quadro\) \{[\s\S]*?\n {2}\}/);

if (!match) {
  console.error('could not find ajustarAltura in site/docs/assets/docs.js');
  process.exit(1);
}

// Wrapped in parentheses so eval yields the function rather than declaring it.
const ajustarAltura = eval(`(${match[0]})`);

/** The content's real height. Constant: nothing in the example changes size. */
const CONTENT = 108;

/** `.doc-exemplo__palco iframe { min-height: 8rem }`, which is 128px. */
const MIN_HEIGHT = 128;

const frame = {
  style: {
    _height: '',
    get height() {
      return this._height;
    },
    /**
     * Writing a height is recorded, but a write of `0px` does not shrink
     * anything.
     *
     * This is the part a naive mock gets wrong, and getting it wrong is what
     * made the first version of this file report `settles: yes` against the
     * very code that was growing the card in a browser. Collapsing the frame
     * before measuring cannot work here: the frame is a stretched grid item
     * whose row is sized by the code pane beside it, and it carries
     * `min-height: 8rem` besides. The browser confirmed it, on
     * site/docs/guia/eventos.html: after `style.height = '0px'`, `offsetHeight`
     * was still 192.
     *
     * So the rendered height only ever follows a real, non-zero write.
     */
    set height(value) {
      this._height = value;
      const pixels = parseInt(value, 10) || 0;
      if (pixels > 0) frame.rendered = Math.max(pixels, MIN_HEIGHT);
    },
  },

  /** What the browser actually shows. Starts at the CSS minimum. */
  rendered: MIN_HEIGHT,

  // Read through a getter, not captured up front. A real contentDocument is
  // live: the code holds one object across a style write and reads a fresh
  // layout afterwards. An earlier version of this file captured the heights
  // when the document was obtained, which made a broken fix look like it
  // worked.
  get contentDocument() {
    const host = this;
    return {
      body: {
        // Content-driven, so it never echoes the frame.
        get scrollHeight() {
          return CONTENT;
        },
      },
      documentElement: {
        // The echo. The root element fills the frame it was given.
        get scrollHeight() {
          return host.rendered;
        },
      },
    };
  },
};

const seen = [];
for (let i = 0; i < 20; i++) {
  ajustarAltura(frame);
  seen.push(frame.style.height);
}

const distinct = [...new Set(seen)];
const settles = distinct.length === 1;

console.log(`content height   : ${CONTENT}px, unchanging`);
console.log(`heights written  : ${distinct.join(', ')}`);
console.log(`settles          : ${settles ? 'yes' : `NO, it climbs (${seen[0]} to ${seen[seen.length - 1]})`}`);

if (!settles) {
  console.error('');
  console.error('The frame grows while its content does not. Measure the body,');
  console.error('never documentElement: the root element echoes the height the');
  console.error('frame was last given, so measuring it feeds the result back in.');
  process.exit(1);
}
