/**
 * The keyboard shortcut that opens the reactivity inspector.
 *
 * Two separate bugs are pinned here, and the second is the one that mattered.
 *
 * The combination kept colliding with something. `Ctrl+Shift+X` closes the tab
 * in Opera. `Alt+Shift+V` replaced it and was worse: Alt+Shift is the Windows
 * keyboard layout switcher, so on a machine with more than one layout the
 * operating system takes the keys before the page ever sees them.
 *
 * But the real defect was that none of it ran. `enableXrayShortcut` was only
 * ever called from inside `xray()`, so the listener existed only after somebody
 * had already opened the inspector by some other means. On an ordinary page,
 * including this project's own site, pressing the documented keys did nothing,
 * because nothing had ever been listening. Choosing a better combination would
 * have changed nothing at all.
 *
 * So the test that earns its place is the one that presses the keys on a page
 * that never asked for devtools.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrap } from '../src/bootstrap';
import { config } from '../src/runtime/registry';
import { isXrayEnabled, xray } from '../src/devtools/xray';
import { enableXrayShortcut } from '../src/devtools/xray';

/** Presses a physical key, the way a keyboard reports it. */
function press(code: string, modifiers: Partial<KeyboardEventInit> = {}): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      code,
      key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    })
  );
}

const CTRL_SHIFT = { ctrlKey: true, shiftKey: true };

/**
 * Waits for `bootstrap` to have run its deferred boot.
 *
 * `whenReady` does not fire on the next macrotask: it waits for the document to
 * stop changing, which takes several turns of its own loop. A single
 * `setTimeout(0)` was not enough, and the tests that appeared to pass with one
 * were passing on a listener installed by an EARLIER test in the same file,
 * which is the kind of green that means nothing.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * A minimal stand-in for the assembled `V`.
 *
 * `bootstrap` only reaches for `start`, `enableXrayShortcut` and optionally
 * `devtoolsWidget`, so a real build is not needed and would drag the whole
 * library into a test about one listener.
 */
function fakeV(): Record<string, unknown> {
  return {
    start() {},
    enableXrayShortcut,
    version: 'test',
  };
}

describe('the inspector shortcut', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    config.devtools = false;
    config.xrayShortcut = 'ctrl+shift+f2';
    if (isXrayEnabled()) xray(false);
  });

  afterEach(() => {
    if (isXrayEnabled()) xray(false);
    config.xrayShortcut = 'ctrl+shift+f2';
    config.devtools = false;
  });

  it('opens the inspector on a page that never asked for devtools', async () => {
    // The regression. `data-devtools` is absent and `config.devtools` is false,
    // which is every ordinary page.
    bootstrap(fakeV());
    await settle();

    expect(config.devtools).toBe(false);
    expect(isXrayEnabled()).toBe(false);

    press('F2', CTRL_SHIFT);

    expect(isXrayEnabled()).toBe(true);
  });

  it('toggles back off on a second press', async () => {
    bootstrap(fakeV());
    await settle();

    press('F2', CTRL_SHIFT);
    expect(isXrayEnabled()).toBe(true);

    press('F2', CTRL_SHIFT);
    expect(isXrayEnabled()).toBe(false);
  });

  it('ignores the retired combinations', async () => {
    bootstrap(fakeV());
    await settle();

    // Ctrl+Shift+X, which Opera uses to close the tab.
    press('KeyX', CTRL_SHIFT);
    expect(isXrayEnabled()).toBe(false);

    // Alt+Shift+V, which Windows uses to switch keyboard layout.
    press('KeyV', { altKey: true, shiftKey: true });
    expect(isXrayEnabled()).toBe(false);
  });

  it('ignores the key without its modifiers', async () => {
    bootstrap(fakeV());
    await settle();

    press('F2');
    expect(isXrayEnabled()).toBe(false);

    press('F2', { ctrlKey: true });
    expect(isXrayEnabled()).toBe(false);

    press('F2', { shiftKey: true });
    expect(isXrayEnabled()).toBe(false);
  });

  it('does not fire when an extra modifier is held', async () => {
    bootstrap(fakeV());
    await settle();

    // Ctrl+Alt+Shift+F2 is a different chord, and on layouts where Ctrl+Alt is
    // AltGr it is one the user did not mean to press.
    press('F2', { ...CTRL_SHIFT, altKey: true });
    expect(isXrayEnabled()).toBe(false);
  });

  it('honours a shortcut chosen through the script tag', async () => {
    const script = document.createElement('script');
    script.src = 'voodoo.full.min.js';
    script.setAttribute('data-xray-shortcut', 'alt+shift+d');
    document.head.appendChild(script);

    bootstrap(fakeV());
    await settle();

    expect(config.xrayShortcut).toBe('alt+shift+d');

    press('F2', CTRL_SHIFT);
    expect(isXrayEnabled()).toBe(false);

    press('KeyD', { altKey: true, shiftKey: true });
    expect(isXrayEnabled()).toBe(true);
  });

  it('installs nothing when the shortcut is turned off', async () => {
    const script = document.createElement('script');
    script.src = 'voodoo.full.min.js';
    script.setAttribute('data-xray-shortcut', 'false');
    document.head.appendChild(script);

    bootstrap(fakeV());
    await settle();

    expect(config.xrayShortcut).toBe(false);

    press('F2', CTRL_SHIFT);
    expect(isXrayEnabled()).toBe(false);
  });

  it('matches the physical key, not the character the layout produces', async () => {
    bootstrap(fakeV());
    await settle();

    // A layout that composes something else for this key still reports
    // `code: 'F2'`. Matching `event.key` alone is what breaks on non-US
    // keyboards, which is half the reason the previous default failed.
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'F2',
        key: 'Dead',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
    );

    expect(isXrayEnabled()).toBe(true);
  });
});
