/**
 * Regression: a failed copy announced "Copied!".
 *
 * `v-copy` showed its confirmation through `data-v-copy-label`. `data-v-` is
 * the valid-HTML spelling of `v-`, so that attribute is also where the author's
 * own `v-copy-label` option is read from. After one successful copy the label
 * written for it was read back as the author's option, and every later copy
 * showed "Copied!" whatever happened, including when the clipboard refused.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import '../src/directives/ui';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  walk(document.body, rootScope);
  return document.body.firstElementChild as HTMLElement;
}

/** The clipboard answers `results` in order: true copies, false refuses. */
function clipboardAnswering(...results: boolean[]): void {
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: {
      writeText: () => (results.shift() ? Promise.resolve() : Promise.reject(new Error('denied'))),
    },
  });
  // The fallback path must fail too, or a refused clipboard still copies.
  (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
}

/** Waits for the click handler's promise chain to settle. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('v-copy confirmation', () => {
  it('says the copy failed after an earlier one succeeded', async () => {
    clipboardAnswering(true, false);
    const button = mount(`<button v-copy="'hello'"></button>`);

    button.click();
    await settle();
    expect(button.getAttribute('data-voodoo-copy-label')).toBe('Copied!');

    button.click();
    await settle();
    expect(button.getAttribute('data-voodoo-copy-label')).toBe('Could not copy');
    expect(button.classList.contains('v-copy-failed')).toBe(true);
  });

  it('leaves the option namespace alone', async () => {
    clipboardAnswering(true);
    const button = mount(`<button v-copy="'hello'"></button>`);
    button.click();
    await settle();
    expect(button.hasAttribute('data-v-copy-label')).toBe(false);
  });

  it('still shows a label the author chose', async () => {
    clipboardAnswering(true);
    const button = mount(`<button v-copy="'hello'" v-copy-label="Done"></button>`);
    button.click();
    await settle();
    expect(button.getAttribute('data-voodoo-copy-label')).toBe('Done');
  });
});
