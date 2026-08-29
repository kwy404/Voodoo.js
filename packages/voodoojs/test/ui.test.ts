import { describe, expect, it } from 'vitest';
import { query, ready, VoodooCollection } from '../src/dom/query';
import { hotkey } from '../src/directives/ui';
import { directives } from '../src/runtime/registry';
import { walk, queryDirective } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';

describe('smoke', () => {
  it('registra as directives de ui e dnd', () => {
    const nomes = [
      'toggle', 'collapse', 'collapse-toggle', 'dropdown', 'dropdown-menu', 'tooltip',
      'popover', 'tabs', 'tab', 'tab-panel', 'accordion', 'accordion-item', 'drawer',
      'drawer-content', 'drawer-close', 'offcanvas', 'theme-toggle', 'focus', 'focus-trap',
      'click-outside', 'escape', 'hotkey', 'scroll-to', 'scrollspy', 'sticky', 'visible',
      'infinite-scroll', 'lazy-src', 'lazy-bg', 'skeleton', 'copy', 'copy-from', 'print',
      'share', 'fullscreen', 'download', 'sortable', 'resizable', 'command', 'command-item',
      'idle', 'online', 'offline', 'draggable', 'droppable', 'dnd-group',
    ];
    for (const nome of nomes) expect(directives.has(nome), nome).toBe(true);
  });

  it('query monta colecao e manipula o DOM', () => {
    document.body.innerHTML = '<ul id="lista"><li class="i">a</li><li class="i">b</li></ul>';
    const itens = query('#lista .i');
    expect(itens.length).toBe(2);
    expect(itens instanceof VoodooCollection).toBe(true);
    expect([...itens].length).toBe(2);
    expect(itens[0].textContent).toBe('a');
    expect(itens.first().text()).toBe('a');
    itens.addClass('ativo forte');
    expect(itens.hasClass('ativo forte')).toBe(true);
    query('#lista').append('<li class="i">c</li>');
    expect(query('#lista .i').length).toBe(3);
    query('#lista .i').last().remove();
    expect(query('#lista .i').length).toBe(2);
  });

  it('query delega eventos e serializa formularios', () => {
    document.body.innerHTML =
      '<form id="f"><input name="nome" value="ana"><input type="checkbox" name="ok" checked>' +
      '<button type="button" class="b">ok</button></form>';
    let cliques = 0;
    query('#f').on('click', '.b', () => { cliques += 1; });
    (document.querySelector('.b') as HTMLElement).click();
    expect(cliques).toBe(1);
    query('#f').off('click');
    (document.querySelector('.b') as HTMLElement).click();
    expect(cliques).toBe(1);
    expect(query('#f').serialize()).toContain('nome=ana');
    expect(query('#f').serializeObject().nome).toBe('ana');
  });

  it('v-toggle e v-tabs funcionam so com HTML', () => {
    document.body.innerHTML =
      '<button id="t" v-toggle="#alvo">abrir</button><div id="alvo" style="display:none">oi</div>' +
      '<div v-tabs><div><button v-tab="a">A</button><button v-tab="b">B</button></div>' +
      '<section v-tab-panel="a">1</section><section v-tab-panel="b">2</section></div>';
    walk(document.body, rootScope);

    const botao = document.getElementById('t') as HTMLElement;
    expect(botao.getAttribute('aria-expanded')).toBe('false');

    const tabs = queryDirective(document, 'tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect((queryDirective(document, 'tab-panel')[1] as HTMLElement).hidden).toBe(true);
    (tabs[1] as HTMLElement).click();
    expect((queryDirective(document, 'tab-panel')[1] as HTMLElement).hidden).toBe(false);
  });

  it('hotkey dispara e pode ser removido', () => {
    let vezes = 0;
    const off = hotkey('ctrl+k', () => { vezes += 1; });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true }));
    expect(vezes).toBe(1);
    off();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true }));
    expect(vezes).toBe(1);
  });

  it('ready executa a funcao', async () => {
    let chamou = false;
    ready(() => { chamou = true; });
    await new Promise((r) => setTimeout(r, 0));
    expect(chamou).toBe(true);
  });
});
