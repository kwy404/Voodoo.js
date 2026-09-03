/**
 * Regression: a chart ignored the height of the element it was drawn into.
 *
 * `draw()` measured the host for width (`el.clientWidth`) but not for height,
 * taking a per-type constant of 260px instead. So this:
 *
 *   <div v-chart="{ type: 'line', data: values }" style="height:150px"></div>
 *
 * produced a 260px SVG inside a 150px box, overflowing by 110px. Nothing clipped
 * it, because the host is `overflow: visible`, so a page with three stacked
 * charts drew all three on top of each other and the axis labels interleaved.
 *
 * The rule now matches width: an explicit `height` option wins, the element's
 * own height is the next answer, and the per-type default is the last resort for
 * a host that has no height of its own.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import '../src/charts';
import { destroy, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';

/** jsdom reports 0 for every box, so the host's height is stubbed explicitly. */
function hostWithHeight(px: number | null): HTMLElement {
  const host = document.createElement('div');
  Object.defineProperty(host, 'clientWidth', { value: 640, configurable: true });
  Object.defineProperty(host, 'clientHeight', { value: px ?? 0, configurable: true });
  return host;
}

/** Renders one chart and returns the height its SVG committed to. */
async function drawn(host: HTMLElement, expression: string): Promise<number> {
  host.setAttribute('v-chart', expression);
  document.body.appendChild(host);
  walk(host, rootScope);
  await nextTick();

  const svg = host.querySelector('svg');
  expect(svg, 'the chart should have rendered an svg').not.toBeNull();

  const box = svg!.getAttribute('viewBox');
  expect(box, 'the svg should carry a viewBox').toBeTruthy();
  return Number(box!.split(/\s+/)[3]);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  destroy(document.body);
  document.body.innerHTML = '';
});

describe('a chart fits the element it was given', () => {
  it('takes the host height rather than the built-in default', async () => {
    const height = await drawn(hostWithHeight(150), "{ type: 'line', data: [1, 2, 3] }");
    expect(height).toBe(150);
  });

  it('does not overflow a short host', async () => {
    const host = hostWithHeight(120);
    const height = await drawn(host, "{ type: 'bar', data: [4, 8, 2] }");
    expect(height).toBeLessThanOrEqual(host.clientHeight);
  });

  it('applies to round charts too', async () => {
    const height = await drawn(hostWithHeight(180), "{ type: 'donut', data: [3, 1, 2] }");
    expect(height).toBe(180);
  });
});

describe('the other two sources of height still work', () => {
  it('an explicit option outranks the element', async () => {
    // The author asked for 300 on a 150px box, so 300 is what they get.
    const height = await drawn(hostWithHeight(150), "{ type: 'line', data: [1, 2], height: 300 }");
    expect(height).toBe(300);
  });

  it('a host with no height of its own falls back to the default', async () => {
    const height = await drawn(hostWithHeight(null), "{ type: 'line', data: [1, 2, 3] }");
    expect(height).toBe(260);
  });

  it('a sparkline keeps its own smaller default', async () => {
    const height = await drawn(hostWithHeight(null), "{ type: 'sparkline', data: [1, 2, 3] }");
    expect(height).toBe(56);
  });

  it('an absurdly short host is still floored, not collapsed', async () => {
    const height = await drawn(hostWithHeight(4), "{ type: 'line', data: [1, 2] }");
    expect(height).toBe(48);
  });
});

describe('three charts stacked in one page', () => {
  it('each keeps to its own box', async () => {
    const heights = [150, 150, 180];
    const measured: number[] = [];

    for (const px of heights) {
      measured.push(await drawn(hostWithHeight(px), "{ type: 'line', data: [1, 2, 3] }"));
    }

    // Before the fix every one of these came back 260, which is precisely how
    // they ended up painted over each other.
    expect(measured).toEqual(heights);
  });
});
