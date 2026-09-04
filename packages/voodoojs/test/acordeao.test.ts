/**
 * Regression: an accordion whose headers are `v-collapse-toggle` buttons was
 * completely dead.
 *
 * Two handlers ran for one click. `v-collapse-toggle` puts a listener on the
 * button; `v-accordion` delegates clicks from its container. The button's
 * listener opened the panel, then the same click bubbled to the container and
 * the accordion's listener toggled it shut again. Nothing moved,
 * `aria-expanded` never changed, and there was no error to go on.
 *
 * The accordion still owns the single-open rule, so that has to keep working
 * once the double toggle is gone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import '../src/core';
import '../src/directives/ui';

function mount(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  walk(host, rootScope);
  return host;
}

const ACCORDION = `
  <div v-accordion v-accordion-single>
    <div v-accordion-item>
      <button id="t1" v-collapse-toggle="#p1">First</button>
      <div id="p1" v-collapse><p>one</p></div>
    </div>
    <div v-accordion-item>
      <button id="t2" v-collapse-toggle="#p2">Second</button>
      <div id="p2" v-collapse><p>two</p></div>
    </div>
  </div>`;

/**
 * Read from aria-expanded, not from display.
 *
 * Closing runs through a height animation unless the visitor asked for reduced
 * motion, and jsdom reports no such preference, so  is set when
 * the animation ends rather than when the click happens. aria-expanded is
 * written synchronously by the controller and is what a screen reader is told,
 * which makes it both the stabler assertion and the more meaningful one.
 */
/**
 * Read from `aria-expanded`, not from `display`.
 *
 * Closing runs through a height animation unless the visitor asked for reduced
 * motion, and jsdom reports no such preference, so `display: none` lands when
 * the animation finishes rather than when the click happens. `aria-expanded` is
 * written synchronously by the controller and is what a screen reader is told,
 * which makes it both the stabler assertion and the more meaningful one.
 */
const open = (id: string) =>
  document.querySelector(`[aria-controls="${id}"]`)!.getAttribute('aria-expanded') === 'true';

const aria = (id: string) => document.getElementById(id)!.getAttribute('aria-expanded');

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('an accordion built from collapse toggles', () => {
  it('starts with every panel closed', () => {
    mount(ACCORDION);
    expect(open('p1')).toBe(false);
    expect(open('p2')).toBe(false);
  });

  it('opens on the first click rather than cancelling itself out', () => {
    mount(ACCORDION);
    document.getElementById('t1')!.click();

    expect(open('p1')).toBe(true);
    expect(aria('t1')).toBe('true');
  });

  it('closes again on a second click', () => {
    mount(ACCORDION);
    const t1 = document.getElementById('t1')!;
    t1.click();
    t1.click();

    expect(open('p1')).toBe(false);
    expect(aria('t1')).toBe('false');
  });

  it('single mode closes the other panel', () => {
    mount(ACCORDION);
    document.getElementById('t1')!.click();
    expect(open('p1')).toBe(true);

    document.getElementById('t2')!.click();

    expect(open('p2')).toBe(true);
    expect(open('p1')).toBe(false);
  });
});

describe('a collapse toggle on its own still works', () => {
  it('toggles without an accordion around it', () => {
    mount('<button id="s" v-collapse-toggle="#sp">t</button><div id="sp" v-collapse><p>x</p></div>');
    const before = open('sp');

    document.getElementById('s')!.click();

    expect(open('sp')).toBe(!before);
  });
});
