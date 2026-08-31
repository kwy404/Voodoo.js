/**
 * Acessibilidade dos componentes de interface.
 *
 * O teste aqui e o comportamento observavel: papel ARIA correto, foco indo e
 * voltando para o lugar certo, e teclado funcionando sem mouse. Um componente
 * que so responde a clique nao esta pronto.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { modal } from '../src/ui/dialog';
import '../src/index';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 4): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

/**
 * Espera um quadro de animacao. O foco inicial dos dialogos e aplicado dentro
 * de `requestAnimationFrame`, entao esperar so as microtasks nao basta.
 */
function proximoQuadro(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Envia uma tecla para o alvo, subindo pela arvore como no navegador. */
function tecla(alvo: EventTarget, key: string): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  alvo.dispatchEvent(evento);
  return evento;
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

  it('o gatilho anuncia que abre um dialogo', () => {
    const { root } = montar(HTML);
    expect(root.querySelector('#abrir')!.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('o painel aberto tem role="dialog" e aria-modal', async () => {
    montar(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    const dialogo = document.querySelector('[role="dialog"]');
    expect(dialogo).not.toBeNull();
    expect(dialogo!.getAttribute('aria-modal')).toBe('true');
  });

  it('o titulo do conteudo vira o rotulo acessivel', async () => {
    montar(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    const dialogo = document.querySelector('[role="dialog"]')!;
    const rotulo = dialogo.getAttribute('aria-labelledby');
    expect(rotulo).toBeTruthy();
    expect(document.getElementById(rotulo!)!.textContent).toContain('Titulo do painel');
  });

  it('o foco entra no dialogo ao abrir', async () => {
    montar(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();
    await proximoQuadro();

    const dialogo = document.querySelector('[role="dialog"]')!;
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });

  it('Escape fecha o dialogo', async () => {
    montar(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    tecla(document, 'Escape');
    await settle();
    await new Promise((r) => setTimeout(r, 250));

    expect(modal.isOpen()).toBe(false);
  });

  it('o foco volta para o gatilho ao fechar', async () => {
    montar(HTML);
    const gatilho = document.querySelector('#abrir') as HTMLElement;
    gatilho.focus();
    gatilho.click();
    await settle();

    modal.close();
    await settle();
    await new Promise((r) => setTimeout(r, 250));

    expect(document.activeElement).toBe(gatilho);
  });

  it('Tab circula dentro do dialogo em vez de sair', async () => {
    montar(HTML);
    (document.querySelector('#abrir') as HTMLElement).click();
    await settle();

    await proximoQuadro();
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(evento);
    await settle();

    const dialogo = document.querySelector('[role="dialog"]')!;
    expect(dialogo.contains(document.activeElement)).toBe(true);
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

  it('o gatilho descreve o menu com aria-haspopup, aria-controls e aria-expanded', () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g')!;
    expect(g.getAttribute('aria-haspopup')).toBe('menu');
    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(g.getAttribute('aria-controls')).toBe('menu');
  });

  it('o painel recebe role="menu" e os itens role="menuitem"', () => {
    const { root } = montar(HTML);
    void root;
    const menu = document.querySelector('#menu')!;
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.querySelectorAll('[role="menuitem"]').length).toBe(3);
  });

  it('aria-expanded acompanha a abertura', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('true');
  });

  it('a seta para baixo no gatilho abre e foca o primeiro item', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    tecla(g, 'ArrowDown');
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('as setas caminham entre os itens', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    tecla(g, 'ArrowDown');
    await settle();

    tecla(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.id).toBe('i2');
    tecla(document.activeElement!, 'ArrowDown');
    expect(document.activeElement?.id).toBe('i3');
    tecla(document.activeElement!, 'ArrowUp');
    expect(document.activeElement?.id).toBe('i2');
  });

  it('Home e End vao para as pontas', async () => {
    const { root } = montar(HTML);
    tecla(root.querySelector('#g') as HTMLElement, 'ArrowDown');
    await settle();

    tecla(document.activeElement!, 'End');
    expect(document.activeElement?.id).toBe('i3');
    tecla(document.activeElement!, 'Home');
    expect(document.activeElement?.id).toBe('i1');
  });

  it('Escape fecha e devolve o foco ao gatilho', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.focus();
    g.click();
    await settle();

    tecla(document, 'Escape');
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

  it('a lista recebe role="tablist" e cada botao role="tab"', () => {
    const { root } = montar(HTML);
    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    expect(root.querySelectorAll('[role="tab"]').length).toBe(3);
  });

  it('cada painel recebe role="tabpanel" ligado ao seu tab', () => {
    const { root } = montar(HTML);
    const paineis = Array.from(root.querySelectorAll('[role="tabpanel"]'));
    expect(paineis.length).toBe(3);
    for (const painel of paineis) {
      const rotulo = painel.getAttribute('aria-labelledby');
      expect(rotulo).toBeTruthy();
      const tab = document.getElementById(rotulo!)!;
      expect(tab.getAttribute('aria-controls')).toBe(painel.id);
    }
  });

  it('aria-selected marca apenas o tab ativo', () => {
    const { root } = montar(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('so o tab ativo fica no caminho do Tab', () => {
    const { root } = montar(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('as setas trocam de aba e levam o foco junto', () => {
    const { root } = montar(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    tecla(tabs[0], 'ArrowRight');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);

    tecla(tabs[1], 'ArrowLeft');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('End e Home vao para a ultima e a primeira aba', () => {
    const { root } = montar(HTML);
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')) as HTMLElement[];

    tecla(tabs[0], 'End');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    tecla(tabs[2], 'Home');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });

  it('somente o painel ativo fica visivel', () => {
    const { root } = montar(HTML);
    const paineis = Array.from(root.querySelectorAll('[role="tabpanel"]')) as HTMLElement[];
    expect(paineis.map((p) => p.hidden)).toEqual([false, true, true]);
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

  it('os cabecalhos ficam acionaveis pelo teclado', () => {
    const { root } = montar(HTML);
    const h1 = root.querySelector('#h1')!;
    expect(h1.getAttribute('role')).toBe('button');
    expect(h1.getAttribute('tabindex')).toBe('0');
  });

  it('aria-expanded e aria-controls descrevem o painel', () => {
    const { root } = montar(HTML);
    const h1 = root.querySelector('#h1')!;
    expect(h1.getAttribute('aria-expanded')).toBe('false');
    expect(h1.getAttribute('aria-controls')).toBe(root.querySelector('#p1')!.id);

    const h2 = root.querySelector('#h2')!;
    expect(h2.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicar no cabecalho vira o aria-expanded', async () => {
    const { root } = montar(HTML);
    const h1 = root.querySelector('#h1') as HTMLElement;
    h1.click();
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('true');
  });

  it('Enter e espaco acionam o cabecalho como um botao', async () => {
    const { root } = montar(HTML);
    const h1 = root.querySelector('#h1') as HTMLElement;

    tecla(h1, 'Enter');
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('true');

    tecla(h1, ' ');
    await settle();
    expect(h1.getAttribute('aria-expanded')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

describe('tooltip', () => {
  const HTML = '<button id="b" v-tooltip="Explicacao curta">Ajuda</button>';

  it('aparece ao receber foco, nao so no hover', async () => {
    const { root } = montar(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();

    const balao = document.querySelector('[role="tooltip"]');
    expect(balao).not.toBeNull();
    expect(balao!.textContent).toBe('Explicacao curta');
  });

  it('liga o balao ao gatilho com aria-describedby', async () => {
    const { root } = montar(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();

    const descrito = b.getAttribute('aria-describedby');
    expect(descrito).toBeTruthy();
    expect(document.getElementById(descrito!)!.getAttribute('role')).toBe('tooltip');
  });

  it('sair do foco esconde o balao e solta o aria-describedby', async () => {
    const { root } = montar(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    b.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await settle();

    expect(b.hasAttribute('aria-describedby')).toBe(false);
  });

  it('Escape fecha o balao aberto', async () => {
    const { root } = montar(HTML);
    const b = root.querySelector('#b') as HTMLElement;

    b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await settle();
    expect(b.hasAttribute('aria-describedby')).toBe(true);

    tecla(b, 'Escape');
    await settle();
    expect(b.hasAttribute('aria-describedby')).toBe(false);
  });

  it('o balao some quando o elemento e destruido', async () => {
    const { root } = montar(HTML);
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

  it('o painel e um dialogo modal', () => {
    const { root } = montar(HTML);
    const gaveta = root.querySelector('#gaveta')!;
    expect(gaveta.getAttribute('role')).toBe('dialog');
    expect(gaveta.getAttribute('aria-modal')).toBe('true');
  });

  it('o gatilho descreve o que controla', () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g')!;
    expect(g.getAttribute('aria-haspopup')).toBe('dialog');
    expect(g.getAttribute('aria-controls')).toBe('gaveta');
    expect(g.getAttribute('aria-expanded')).toBe('false');
  });

  it('abrir leva o foco para dentro e marca aria-expanded', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.click();
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('#gaveta')!.contains(document.activeElement)).toBe(true);
  });

  it('Escape fecha e devolve o foco ao gatilho', async () => {
    const { root } = montar(HTML);
    const g = root.querySelector('#g') as HTMLElement;
    g.focus();
    g.click();
    await settle();

    tecla(document, 'Escape');
    await settle();

    expect(g.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(g);
  });
});

// ---------------------------------------------------------------------------
// v-toggle e v-collapse
// ---------------------------------------------------------------------------

describe('toggle e collapse', () => {
  it('v-toggle descreve o alvo e mantem aria-expanded', async () => {
    const { root } = montar('<button id="g" v-toggle="#alvo">x</button><div id="alvo">c</div>');
    const g = root.querySelector('#g') as HTMLElement;

    expect(g.getAttribute('aria-controls')).toBe('alvo');
    expect(g.getAttribute('aria-expanded')).toBe('true');

    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).toBe('false');
  });

  it('v-collapse-toggle mantem aria-expanded e aria-controls', async () => {
    const { root } = montar(
      '<button id="g" v-collapse-toggle="#p">x</button><div id="p" v-collapse>c</div>'
    );
    const g = root.querySelector('#g') as HTMLElement;
    expect(g.getAttribute('aria-controls')).toBe(root.querySelector('#p')!.id);
    const antes = g.getAttribute('aria-expanded');

    g.click();
    await settle();
    expect(g.getAttribute('aria-expanded')).not.toBe(antes);
  });
});
