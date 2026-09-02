/**
 * Accessibility of UI components.
 *
 * The test here is observable behavior: correct ARIA role, focus going and
 * coming back to the right place, and keyboard working without mouse. A component
 * that only responds to clicks is not ready.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { modal } from '../src/ui/dialog';
import { commandPalette } from '../src/directives/ui';
import '../src/index';

function mount(html: string, data: Record<string, unknown> = {}) {
  const state = reactive(data);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(state));
  return { root, state };
}

async function settle(n = 4): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

/**
 * Wait for one animation frame. The initial focus of dialogs is applied inside
 * `requestAnimationFrame`, so waiting only for microtasks is not enough.
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Dispatch a key to the target, bubbling through the tree as in the browser. */
function key(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

/** Pretends the user asked for `prefers-reduced-motion: reduce`. */
function preferReducedMotion(): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

describe('modal', () => {
  const HTML = `
    <button id="abrir" v-modal="#painel">Abrir</button>
    <div id="painel" v-modal-content>
      <h2>Titulo do painel</h2>
      <button id="dentro">Acao</button>
    </div>`;

  afterEach(() => {
    modal.close();
  });

  it('trigger announces opening a dialog', () => {
    const { root } = mount(HTML);
    expect(root.querySelector('#abrir')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('opened panel has role="dialog" and aria-modal', async () => {
    mount(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
  });

  it('content title becomes the accessible label', async () => {
    mount(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    const dialog = document.querySelector('[role="dialog"]')!;
    const label = dialog.getAttribute('aria-labelledby');
    expect(label).toBeTruthy();
    expect(document.getElementById(label!)!.textContent).toContain('Titulo do painel');
  });

  it('focus enters dialog on open', async () => {
    mount(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();
    await nextFrame();

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Escape closes the dialog', async () => {
    mount(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    key(document, 'Escape');
    await settle();
    await new Promise((r) => setTimeout(r, 250));

    expect(modal.isOpen()).toBe(false);
  });

  it('focus returns to trigger on close', async () => {
    mount(HTML);
    const trigger = document.querySelector('#abrir') as HTMLElement;
    trigger.focus();
    trigger.click();
    await settle();

    modal.close();
    await settle();
    await new Promise((r) => setTimeout(r, 250));

    expect(document.activeElement).toBe(trigger);
  });

  it('Tab cycles within dialog instead of exiting', async () => {
    mount(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    await nextFrame();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    await settle();

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

describe('dropdown', () => {
  const HTML = `
    <button id="g" v-dropdown="#menu">Menu</button>
    <div id="menu">
      <button id="i1">Um</button>
      <button id="i2">Dois</button>
      <button id="i3">Tres</button>
    </div>`;

  // Wiping the body does not run directive cleanup, so a menu left open keeps
  // its document-level key listener alive and would swallow the arrow keys of
  // every test that follows. Escape closes whatever is still open.
  afterEach(() => {
    key(document, 'Escape');
  });

  it('trigger describes menu with aria-haspopup, aria-controls and aria-expanded', () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g')!;
    expect(g.getAttribute('aria-haspopup')).toBe('menu');
    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(g.getAttribute('aria-controls')).toBe('menu');
  });

  it('panel gets role="menu" and items get role="menuitem"', () => {
    const { root } = mount(HTML);
    void root;
    const menu = document.querySelector('#menu')!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.querySelectorAll('[role="menuitem"]').length).toBe(3);
  });

  it('aria-expanded tracks opening', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('true');
  });

  it('down arrow on trigger opens and focuses first item', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    key(g, 'ArrowDown');
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('arrows navigate between items', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    key(g, 'ArrowDown');
    await settle();

    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.id).toBe('i2');
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.id).toBe('i3');
    key(document.activeElement!, 'ArrowUp');
    expect(document.activeElement?.id).toBe('i2');
  });

  it('Home and End go to the ends', async () => {
    const { root } = mount(HTML);
    key(root.querySelector('#g') as HTMLElement, 'ArrowDown');
    await settle();

    key(document.activeElement!, 'End');
    expect(document.activeElement?.id).toBe('i3');
    key(document.activeElement!, 'Home');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('Escape closes and returns focus to trigger', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.focus();
    g.click();
    await settle();

    key(document, 'Escape');
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(g);
  });

  it('Enter on the trigger opens the menu and focuses the first item', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;

    const event = key(g, 'Enter');
    await settle();

    expect(event.defaultPrevented).toBe(true);
    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('Enter opens a trigger that is not a native button, only once', async () => {
    const { root } = mount(`
      <span id="g" v-dropdown="#menu">Menu</span>
      <div id="menu"><button id="i1">One</button><button id="i2">Two</button></div>`);
    const g = root.querySelector('#g') as HTMLElement;

    // `makeInteractive` turns Enter into a click on a span; the menu must end
    // up open, not toggled open and shut again by the same keystroke.
    key(g, 'Enter');
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('Enter on a focused item activates it and closes the menu', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    let clicks = 0;
    (root.querySelector('#i2') as HTMLElement).addEventListener('click', () => clicks++);

    g.focus();
    key(g, 'ArrowDown');
    await settle();
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.id).toBe('i2');

    key(document.activeElement!, 'Enter');
    await settle();

    expect(clicks).toBe(1);
    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(g);
  });

  it('Enter activates an item that is not a button either', async () => {
    const { root } = mount(`
      <button id="g" v-dropdown="#menu">Menu</button>
      <div id="menu"><div id="i1" tabindex="-1">One</div><div id="i2" tabindex="-1">Two</div></div>`);
    const g = root.querySelector('#g') as HTMLElement;
    let clicks = 0;
    (root.querySelector('#i1') as HTMLElement).addEventListener('click', () => clicks++);

    key(g, 'ArrowDown');
    await settle();
    expect(document.activeElement?.id).toBe('i1');

    key(document.activeElement!, 'Enter');
    await settle();

    expect(clicks).toBe(1);
    expect(g.getAttribute('aria-expanded')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

describe('tabs', () => {
  const HTML = `
    <div v-tabs="a">
      <div>
        <button v-tab="a">A</button>
        <button v-tab="b">B</button>
        <button v-tab="c">C</button>
      </div>
      <section v-tab-panel="a">Conteudo A</section>
      <section v-tab-panel="b">Conteudo B</section>
      <section v-tab-panel="c">Conteudo C</section>
    </div>`;

  it('list gets role="tablist" and each button gets role="tab"', () => {
    const { root } = mount(HTML);
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    expect(root.querySelectorAll('[role="tab"]').length).toBe(3);
  });

  it('each panel gets role="tabpanel" linked to its tab', () => {
    const { root } = mount(HTML);
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    expect(panels.length).toBe(3);
    for (const panel of panels) {
      const label = panel.getAttribute('aria-labelledby');
      expect(label).toBeTruthy();
      const tab = document.getElementById(label!)!;
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    }
  });

  it('aria-selected marks only the active tab', () => {
    const { root } = mount(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('only active tab is in the Tab order', () => {
    const { root } = mount(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('arrows switch tabs and move focus', () => {
    const { root } = mount(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    key(tabs[0], 'ArrowRight');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);

    key(tabs[1], 'ArrowLeft');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End and Home go to last and first tab', () => {
    const { root } = mount(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    key(tabs[0], 'End');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    key(tabs[2], 'Home');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('only active panel is visible', () => {
    const { root } = mount(HTML);
    const panels = Array.from(root.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];
    expect(panels.map((p) => p.hidden)).toEqual([false, true, true]);
  });

  const VERTICAL = `
    <div v-tabs="a">
      <div role="tablist" aria-orientation="vertical">
        <button v-tab="a">A</button>
        <button v-tab="b">B</button>
        <button v-tab="c">C</button>
      </div>
      <section v-tab-panel="a">Content A</section>
      <section v-tab-panel="b">Content B</section>
      <section v-tab-panel="c">Content C</section>
    </div>`;

  it('tablist declares aria-orientation, horizontal by default', () => {
    const { root } = mount(HTML);
    expect(root.querySelector('[role="tablist"]')!.getAttribute('aria-orientation')).toBe(
      'horizontal'
    );
  });

  it('an orientation written in the HTML is kept', () => {
    const { root } = mount(VERTICAL);
    expect(root.querySelector('[role="tablist"]')!.getAttribute('aria-orientation')).toBe(
      'vertical'
    );
  });

  it('horizontal tabs leave Up and Down to the page', () => {
    const { root } = mount(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    const event = key(tabs[0], 'ArrowDown');

    expect(event.defaultPrevented).toBe(false);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('a vertical tablist moves with Up and Down, not with Left and Right', () => {
    const { root } = mount(VERTICAL);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    key(tabs[0], 'ArrowDown');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);

    key(tabs[1], 'ArrowUp');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    const sideways = key(tabs[0], 'ArrowRight');
    expect(sideways.defaultPrevented).toBe(false);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// Accordion
// ---------------------------------------------------------------------------

describe('accordion', () => {
  const HTML = `
    <div v-accordion>
      <div v-accordion-item>
        <div id="h1">Primeiro</div>
        <div id="p1">Conteudo um</div>
      </div>
      <div v-accordion-item="open">
        <div id="h2">Segundo</div>
        <div id="p2">Conteudo dois</div>
      </div>
    </div>`;

  it('headers are keyboard accessible', () => {
    const { root } = mount(HTML);
    const h1 = root.querySelector('#h1')!;
    expect(h1.getAttribute('role')).toBe('button');
    expect(h1.getAttribute('tabindex')).toBe('0');
  });

  it('aria-expanded and aria-controls describe the panel', () => {
    const { root } = mount(HTML);
    const h1 = root.querySelector('#h1')!;
    expect(h1.getAttribute('aria-expanded')).toBe('false');
    expect(h1.getAttribute('aria-controls')).toBe(root.querySelector('#p1')!.id);

    const h2 = root.querySelector('#h2')!;
    expect(h2.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking header toggles aria-expanded', async () => {
    const { root } = mount(HTML);
    const h1 = root.querySelector('#h1') as HTMLElement;
    h1.click();
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('true');
  });

  it('Enter and space activate header as a button', async () => {
    const { root } = mount(HTML);
    const h1 = root.querySelector('#h1') as HTMLElement;

    key(h1, 'Enter');
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('true');

    key(h1, ' ');
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('false');
  });

  it('every header carries aria-expanded and aria-controls for its own panel', () => {
    const { root } = mount(HTML);
    const pairs: [HTMLElement, HTMLElement][] = [
      [root.querySelector('#h1') as HTMLElement, root.querySelector('#p1') as HTMLElement],
      [root.querySelector('#h2') as HTMLElement, root.querySelector('#p2') as HTMLElement],
    ];

    for (const [header, panel] of pairs) {
      expect(panel.id).toBeTruthy();
      expect(header.getAttribute('aria-controls')).toBe(panel.id);
      expect(header.hasAttribute('aria-expanded')).toBe(true);
    }
    expect(pairs.map(([header]) => header.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
  });

  it('each panel is a region labelled by its header', () => {
    const { root } = mount(HTML);
    const p1 = root.querySelector('#p1')!;
    const h1 = root.querySelector('#h1')!;

    expect(p1.getAttribute('role')).toBe('region');
    expect(h1.id).toBeTruthy();
    expect(p1.getAttribute('aria-labelledby')).toBe(h1.id);
  });

  it('past six panels the region landmarks are left off', () => {
    const items = Array.from(
      { length: 7 },
      (_, i) => `<div v-accordion-item><div id="h${i}">H${i}</div><div id="p${i}">C${i}</div></div>`
    ).join('');
    const { root } = mount(`<div v-accordion>${items}</div>`);

    expect(root.querySelector('#p0')!.hasAttribute('role')).toBe(false);
    // The header attributes are not part of that trade-off; they stay.
    expect(root.querySelector('#h0')!.getAttribute('aria-controls')).toBe(
      root.querySelector('#p0')!.id
    );
  });
});

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

describe('tooltip', () => {
  const HTML = '<button id="b" v-tooltip="Explicacao curta">Ajuda</button>';

  it('appears on focus, not just on hover', async () => {
    const { root } = mount(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();

    const balloon = document.querySelector('[role="tooltip"]');
    expect(balloon).not.toBeNull();
    expect(balloon!.textContent).toBe('Explicacao curta');
  });

  it('links balloon to trigger with aria-describedby', async () => {
    const { root } = mount(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();

    const described = b.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described!)!.getAttribute('role')).toBe('tooltip');
  });

  it('losing focus hides balloon and removes aria-describedby', async () => {
    const { root } = mount(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    b.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();

    expect(b.hasAttribute('aria-describedby')).toBe(false);
  });

  it('Escape closes open balloon', async () => {
    const { root } = mount(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(b.hasAttribute('aria-describedby')).toBe(true);

    key(b, 'Escape');
    await settle();
    expect(b.hasAttribute('aria-describedby')).toBe(false);
  });

  it('balloon disappears when element is destroyed', async () => {
    const { root } = mount(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();

    destroy(root);
    await settle();
    await new Promise((r) => setTimeout(r, 200));

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('a trigger that is not focusable joins the tab order and opens on focus()', async () => {
    const { root } = mount('<span id="hint" v-tooltip="Short explanation">?</span>');
    const span = root.querySelector('#hint') as HTMLElement;

    expect(span.getAttribute('tabindex')).toBe('0');

    span.focus();
    await settle();

    expect(document.activeElement).toBe(span);
    const balloon = document.querySelector('[role="tooltip"]');
    expect(balloon).not.toBeNull();
    expect(span.getAttribute('aria-describedby')).toBe(balloon!.id);
  });

  it('a native trigger keeps the tab order the author gave it', () => {
    const { root } = mount(
      '<button id="b" v-tooltip="Help">Help</button><a id="a" href="#x" v-tooltip="Help">x</a>'
    );
    expect(root.querySelector('#b')!.hasAttribute('tabindex')).toBe(false);
    expect(root.querySelector('#a')!.hasAttribute('tabindex')).toBe(false);
  });

  it('an explicit tabindex is not rewritten', () => {
    const { root } = mount('<span id="hint" tabindex="-1" v-tooltip="Short explanation">?</span>');
    expect(root.querySelector('#hint')!.getAttribute('tabindex')).toBe('-1');
  });

  it('a disabled control is not given a tabindex it cannot honour', () => {
    const { root } = mount('<button id="b" disabled v-tooltip="Why this is off">Save</button>');
    expect(root.querySelector('#b')!.hasAttribute('tabindex')).toBe(false);
  });

  it('a tap on a trigger with no hover reveals the balloon', async () => {
    const { root } = mount('<span id="hint" v-tooltip="Short explanation">?</span>');
    const span = root.querySelector('#hint') as HTMLElement;

    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await settle();

    expect(document.activeElement).toBe(span);
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
  });

  it('the added tabindex is removed when the element is destroyed', async () => {
    const { root } = mount('<span id="hint" v-tooltip="Short explanation">?</span>');
    const span = root.querySelector('#hint') as HTMLElement;
    expect(span.getAttribute('tabindex')).toBe('0');

    destroy(root);
    await settle();

    expect(span.hasAttribute('tabindex')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Drawer
// ---------------------------------------------------------------------------

describe('drawer', () => {
  const HTML = `
    <button id="g" v-drawer="#gaveta">Abrir</button>
    <aside id="gaveta" v-drawer-content>
      <button id="dentro">Acao</button>
    </aside>`;

  it('panel is a modal dialog', () => {
    const { root } = mount(HTML);
    const drawer = root.querySelector('#gaveta')!;
    expect(drawer.getAttribute('role')).toBe('dialog');
    expect(drawer.getAttribute('aria-modal')).toBe('true');
  });

  it('trigger describes what it controls', () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g')!;
    expect(g.getAttribute('aria-haspopup')).toBe('dialog');
    expect(g.getAttribute('aria-controls')).toBe('gaveta');
    expect(g.getAttribute('aria-expanded')).toBe('false');
  });

  it('opening moves focus inside and marks aria-expanded', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.click();
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('#gaveta')!.contains(document.activeElement)).toBe(true);
  });

  it('Escape closes and returns focus to trigger', async () => {
    const { root } = mount(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.focus();
    g.click();
    await settle();

    key(document, 'Escape');
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(g);
  });

  it('a heading inside the drawer becomes its accessible name', () => {
    const { root } = mount(`
      <button id="g" v-drawer="#titled">Open</button>
      <aside id="titled" v-drawer-content>
        <h2>Filters</h2>
        <button id="inside">Action</button>
      </aside>`);

    const panel = root.querySelector('#titled')!;
    const label = panel.getAttribute('aria-labelledby');
    expect(label).toBeTruthy();
    expect(document.getElementById(label!)!.textContent).toBe('Filters');
  });

  it('a name written by the author is never overwritten', () => {
    const { root } = mount(`
      <aside id="named" v-drawer-content aria-label="Cart"><h2>Filters</h2></aside>`);

    const panel = root.querySelector('#named')!;
    expect(panel.hasAttribute('aria-labelledby')).toBe(false);
    expect(panel.getAttribute('aria-label')).toBe('Cart');
  });

  it('a drawer with no heading is left unnamed rather than mislabelled', () => {
    const { root } = mount(HTML);
    expect(root.querySelector('#gaveta')!.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('with motion allowed the open state waits for the slide-in frame', async () => {
    const { root } = mount(HTML);
    (root.querySelector('#g') as HTMLElement).click();

    const panel = document.querySelector('#gaveta') as HTMLElement;
    expect(panel.classList.contains('v-open')).toBe(false);

    await nextFrame();
    expect(panel.classList.contains('v-open')).toBe(true);

    key(document, 'Escape');
    await settle();
  });

  it('prefers-reduced-motion opens the drawer in the same frame', async () => {
    preferReducedMotion();
    const { root } = mount(HTML);
    (root.querySelector('#g') as HTMLElement).click();

    const panel = document.querySelector('#gaveta') as HTMLElement;
    expect(panel.hidden).toBe(false);
    expect(panel.classList.contains('v-open')).toBe(true);
    expect(document.querySelector('.v-drawer-backdrop')!.classList.contains('v-in')).toBe(true);

    key(document, 'Escape');
    await settle();
    expect(panel.hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------

describe('command palette', () => {
  const HTML = `
    <button id="open">Commands</button>
    <button id="cmd" v-command-item="Save">Save</button>`;

  /** Opens the palette and hands back its input. */
  async function openPalette(): Promise<HTMLInputElement> {
    mount(HTML);
    commandPalette();
    await settle();
    return document.querySelector('.v-command-input') as HTMLInputElement;
  }

  it('focus starts in the search field', async () => {
    const input = await openPalette();
    expect(document.activeElement).toBe(input);

    key(document, 'Escape');
    await settle();
  });

  it('focus that escapes the palette is pulled back in', async () => {
    const outside = document.createElement('button');
    outside.id = 'outside';
    document.body.appendChild(outside);

    const input = await openPalette();
    outside.focus();

    expect(document.activeElement).toBe(input);
    expect(document.querySelector('.v-command')!.contains(document.activeElement)).toBe(true);

    key(document, 'Escape');
    await settle();
  });

  it('closing releases the trap so the page gets focus back', async () => {
    const outside = document.createElement('button');
    outside.id = 'outside';
    document.body.appendChild(outside);

    await openPalette();
    key(document, 'Escape');
    await settle();
    expect(document.querySelector('.v-command')).toBeNull();

    outside.focus();
    expect(document.activeElement).toBe(outside);
  });
});

// ---------------------------------------------------------------------------
// v-toggle e v-collapse
// ---------------------------------------------------------------------------

describe('toggle and collapse', () => {
  it('v-toggle describes target and maintains aria-expanded', async () => {
    const { root } = mount('<button id="g" v-toggle="#alvo">x</button><div id="alvo">c</div>');
    const g = root.querySelector('#g') as HTMLElement;

    expect(g.getAttribute('aria-controls')).toBe('alvo');
    expect(g.getAttribute('aria-expanded')).toBe('true');

    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('false');
  });

  it('v-collapse-toggle maintains aria-expanded and aria-controls', async () => {
    const { root } = mount(
      '<button id="g" v-collapse-toggle="#p">x</button><div id="p" v-collapse>c</div>'
    );
    const g = root.querySelector('#g') as HTMLElement;
    expect(g.getAttribute('aria-controls')).toBe(root.querySelector('#p')!.id);
    const before = g.getAttribute('aria-expanded');

    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).not.toBe(before);
  });
});
