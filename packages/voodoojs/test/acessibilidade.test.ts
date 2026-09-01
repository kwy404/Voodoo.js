/**
 * Accessibility of UI components.
 *
 * The test here is observable behavior: correct ARIA role, focus going and
 * coming back to the right place, and keyboard working without mouse. A component
 * that only responds to clicks is not ready.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { modal } from '../src/ui/dialog';
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

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
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
