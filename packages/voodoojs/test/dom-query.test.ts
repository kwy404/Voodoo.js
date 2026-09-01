/**
 * Testes de `dom/query`, a colecao encadeavel.
 *
 * O foco esta nos ramos, nao nas linhas: cada `if`, cada `??`, cada ternario e
 * cada `catch` que o caminho feliz nunca visita. Por isso ha um bloco inteiro
 * so para colecao vazia (toda operacao precisa ser no-op segura), outro para
 * entradas malformadas e outro para elementos fora do documento.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromHtml, query, ready, VoodooCollection } from '../src/dom/query';
import { core } from '../src/core';

/** Marca `core` como usado: importar registra as directives que `walk` precisa. */
void core;

/** Monta o corpo do documento e devolve o primeiro elemento pedido. */
function montar(html: string): void {
  document.body.innerHTML = html;
}

/** Elemento solto, nunca inserido no documento. */
function solto(tag = 'div'): HTMLElement {
  return document.createElement(tag);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Construcao
// ---------------------------------------------------------------------------

describe('construcao da colecao', () => {
  it('aceita seletor CSS e expoe length, indice e iteracao', () => {
    montar('<ul id="l"><li class="i">a</li><li class="i">b</li></ul>');
    const itens = query('.i');
    expect(itens).toBeInstanceOf(VoodooCollection);
    expect(itens.length).toBe(2);
    expect(itens[0].textContent).toBe('a');
    expect(itens[1].textContent).toBe('b');
    expect([...itens].map((el) => el.textContent)).toEqual(['a', 'b']);
    expect(itens.elements.length).toBe(2);
    // `toArray` devolve copia: mexer nela nao mexe na colecao.
    const copia = itens.toArray();
    copia.pop();
    expect(itens.length).toBe(2);
  });

  it('aceita elemento, Document, DocumentFragment e no de texto', () => {
    montar('<div id="a"></div>');
    const el = document.getElementById('a') as HTMLElement;
    expect(query(el).length).toBe(1);
    // nodeType 9 devolve o documentElement.
    expect(query(document).get(0)).toBe(document.documentElement);
    const frag = document.createDocumentFragment();
    frag.appendChild(solto('span'));
    frag.appendChild(solto('span'));
    expect(query(frag).length).toBe(2);
    // No de texto nao e elemento: colecao vazia, sem erro.
    expect(query(document.createTextNode('oi')).length).toBe(0);
    expect(query(document.createComment('c')).length).toBe(0);
  });

  it('aceita NodeList, array, array-like com buracos e outra colecao', () => {
    montar('<p class="p">1</p><p class="p">2</p>');
    expect(query(document.querySelectorAll('.p')).length).toBe(2);
    const lista = Array.from(document.querySelectorAll<HTMLElement>('.p'));
    expect(query(lista).length).toBe(2);
    // Array-like com buraco e com no que nao e elemento.
    const bagunca = { length: 3, 0: lista[0], 1: null, 2: document.createTextNode('x') };
    expect(query(bagunca as unknown as ArrayLike<Node>).length).toBe(1);
    // Repetidos entram uma vez so.
    expect(query([lista[0], lista[0], lista[1]]).length).toBe(2);
    expect(query(query('.p')).length).toBe(2);
  });

  it('aceita string de HTML e cria os elementos sem inserir no documento', () => {
    const criado = query('<li class="novo">a</li><li class="novo">b</li>');
    expect(criado.length).toBe(2);
    expect(criado[0].isConnected).toBe(false);
    expect(document.querySelectorAll('.novo').length).toBe(0);
    // Espaco em volta e tolerado.
    expect(query('  <b>x</b>  ').length).toBe(1);
    // `<>` e curto demais para ser HTML e vira seletor invalido.
    expect(query('<>').length).toBe(0);
  });

  it('devolve colecao vazia para entradas nulas, vazias ou desconhecidas', () => {
    expect(query().length).toBe(0);
    expect(query(null).length).toBe(0);
    expect(query(undefined).length).toBe(0);
    expect(query('').length).toBe(0);
    expect(query('   ').length).toBe(0);
    expect(query({} as unknown as Node).length).toBe(0);
    expect(query(123 as unknown as Node).length).toBe(0);
    // Document sem documentElement (XML recem-criado) tambem devolve vazio.
    const xml = document.implementation.createDocument(null, null);
    expect(xml.documentElement).toBeNull();
    expect(query(xml as unknown as Document).length).toBe(0);
  });

  it('seletor invalido devolve colecao vazia em vez de lancar', () => {
    montar('<div class="a"></div>');
    expect(() => query(':::')).not.toThrow();
    expect(query(':::').length).toBe(0);
    expect(query('div:naoexiste(')).toHaveLength(0);
  });

  it('respeita o contexto de busca', () => {
    montar('<div id="a"><i class="x">1</i></div><div id="b"><i class="x">2</i></div>');
    const b = document.getElementById('b') as HTMLElement;
    expect(query('.x').length).toBe(2);
    expect(query('.x', '#b').length).toBe(1);
    expect(query('.x', '#b')[0].textContent).toBe('2');
    expect(query('.x', b).length).toBe(1);
    expect(query('.x', query('#a')).length).toBe(1);
    expect(query('.x', query('#a'))[0].textContent).toBe('1');
    // Contexto que nao resolve para nada cai de volta no documento inteiro.
    expect(query('.x', document.createTextNode('nada')).length).toBe(2);
    // Contexto funcao tambem significa documento inteiro.
    expect(query('.x', () => undefined).length).toBe(2);
    // Contexto so vale para seletor: com elemento na entrada ele e ignorado.
    expect(query(b, '#a').length).toBe(1);
  });

  it('fromHtml cria elementos soltos e ignora texto puro', () => {
    const c = fromHtml('<span>a</span><span>b</span>');
    expect(c.length).toBe(2);
    // `template.content.children` so enxerga elementos.
    expect(fromHtml('texto puro').length).toBe(0);
    expect(fromHtml('').length).toBe(0);
  });

  it('query com funcao agenda o ready e devolve o documentElement', async () => {
    let chamou = 0;
    const c = query(() => {
      chamou += 1;
    });
    expect(c.length).toBe(1);
    expect(c.get(0)).toBe(document.documentElement);
    await ready();
    expect(chamou).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Travessia
// ---------------------------------------------------------------------------

describe('travessia', () => {
  beforeEach(() => {
    montar(`
      <div id="raiz" class="caixa">
        <section id="s1" class="sec">
          <p class="t" id="p1">um</p>
          <p class="t" id="p2">dois</p>
          <span id="sp">tres</span>
        </section>
        <section id="s2" class="sec"><p class="t" id="p3">quatro</p></section>
      </div>`);
  });

  it('find desce a arvore, deduplica e engole seletor invalido', () => {
    expect(query('#raiz').find('.t').length).toBe(3);
    // Dois pontos de partida que compartilham descendentes: sem repeticao.
    expect(query('.sec').find('.t').length).toBe(3);
    expect(query('#raiz, #s1').find('#p1').length).toBe(1);
    expect(() => query('#raiz').find(':::')).not.toThrow();
    expect(query('#raiz').find(':::').length).toBe(0);
  });

  it('closest sobe ate o ancestral, incluindo o proprio elemento', () => {
    expect(query('#p1').closest('.sec').get(0)?.id).toBe('s1');
    expect(query('#p1').closest('.t').get(0)?.id).toBe('p1');
    // Dois filhos da mesma secao dao um ancestral so.
    expect(query('#p1, #p2').closest('.sec').length).toBe(1);
    expect(query('#p1').closest('.nao-existe').length).toBe(0);
  });

  it('parent e parents com e sem filtro', () => {
    expect(query('#p1').parent().get(0)?.id).toBe('s1');
    expect(query('#p1').parent('.sec').length).toBe(1);
    expect(query('#p1').parent('.nao-e').length).toBe(0);
    // O html nao tem pai elemento.
    expect(query(document.documentElement).parent().length).toBe(0);

    const todos = query('#p1').parents();
    expect(todos.map((el) => el.tagName)).toEqual(['SECTION', 'DIV', 'BODY', 'HTML']);
    expect(query('#p1').parents('.sec').length).toBe(1);
    expect(query('#p1, #p3').parents('.caixa').length).toBe(1);
  });

  it('children e siblings com e sem filtro', () => {
    expect(query('#s1').children().length).toBe(3);
    expect(query('#s1').children('.t').length).toBe(2);
    expect(query('#p1').children().length).toBe(0);

    expect(query('#p1').siblings().map((el) => el.id)).toEqual(['p2', 'sp']);
    expect(query('#p1').siblings('.t').map((el) => el.id)).toEqual(['p2']);
    // Elemento sem pai nao tem irmao.
    expect(query(solto()).siblings().length).toBe(0);
  });

  it('next e prev com e sem filtro', () => {
    expect(query('#p1').next().get(0)?.id).toBe('p2');
    expect(query('#p1').next('.t').length).toBe(1);
    expect(query('#p1').next('span').length).toBe(0);
    expect(query('#sp').next().length).toBe(0);

    expect(query('#p2').prev().get(0)?.id).toBe('p1');
    expect(query('#p2').prev('.t').length).toBe(1);
    expect(query('#p2').prev('span').length).toBe(0);
    expect(query('#p1').prev().length).toBe(0);
  });

  it('first, last e eq, inclusive com indice negativo e fora da faixa', () => {
    const t = query('.t');
    expect(t.first().get(0)?.id).toBe('p1');
    expect(t.last().get(0)?.id).toBe('p3');
    expect(t.eq(1).get(0)?.id).toBe('p2');
    expect(t.eq(-1).get(0)?.id).toBe('p3');
    expect(t.eq(-3).get(0)?.id).toBe('p1');
    expect(t.eq(9).length).toBe(0);
    expect(t.eq(-9).length).toBe(0);
  });

  it('filter, not, has e is aceitam seletor e funcao', () => {
    const t = query('.t');
    expect(t.filter('#p2').length).toBe(1);
    expect(t.filter((el, i) => i > 0).length).toBe(2);
    expect(t.not('#p2').length).toBe(2);
    expect(t.not((el) => el.id === 'p2').length).toBe(2);

    expect(query('.sec').has('#p3').length).toBe(1);
    expect(query('.sec').has(document.getElementById('p1') as Element).length).toBe(1);
    expect(query('.sec').has('.nao-existe').length).toBe(0);

    expect(t.is('#p2')).toBe(true);
    expect(t.is('.nao-existe')).toBe(false);
    expect(t.is((el) => el.id === 'p3')).toBe(true);
    expect(t.is((el, i) => i === 99)).toBe(false);
  });

  it('map, each com interrupcao, get, slice e add', () => {
    const t = query('.t');
    expect(t.map((el) => el.id)).toEqual(['p1', 'p2', 'p3']);

    const vistos: string[] = [];
    const retorno = t.each(function (el, i) {
      // `this` e o elemento, igual ao jQuery.
      expect(this).toBe(el);
      vistos.push(`${i}:${el.id}`);
      if (i === 1) return false;
      return undefined;
    });
    expect(vistos).toEqual(['0:p1', '1:p2']);
    expect(retorno).toBe(t);

    expect(t.get().length).toBe(3);
    expect(t.get(0)?.id).toBe('p1');
    expect(t.get(-1)?.id).toBe('p3');
    expect(t.get(99)).toBeUndefined();

    expect(t.slice(1).length).toBe(2);
    expect(t.slice(0, 1).length).toBe(1);
    expect(t.slice().length).toBe(3);

    expect(t.add('#sp').length).toBe(4);
    // Ja presente: nao duplica.
    expect(t.add('#p1').length).toBe(3);
    expect(t.add('<b>x</b>').length).toBe(4);
    expect(query('#p1').add('.t', '#s2').length).toBe(2);
    // Funcao nao vira elemento nenhum: a colecao fica igual.
    expect(t.add(() => undefined).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Conteudo, atributos, dados e estilos
// ---------------------------------------------------------------------------

describe('texto e html', () => {
  it('le do primeiro e escreve em todos', () => {
    montar('<div class="c">a</div><div class="c">b</div>');
    const c = query('.c');
    expect(c.text()).toBe('a');
    expect(c.html()).toBe('a');

    c.text('novo');
    expect(c.map((el) => el.textContent)).toEqual(['novo', 'novo']);
    c.text(7);
    expect(c.text()).toBe('7');
    c.text(null);
    expect(c.text()).toBe('');

    c.html('<b>x</b>');
    expect(c[0].innerHTML).toBe('<b>x</b>');
    expect(c.html()).toBe('<b>x</b>');
    c.html(null);
    expect(c.html()).toBe('');
  });

  it('escrever texto ou html descarta o conteudo antigo', () => {
    montar('<div id="d"><span id="antigo">a</span></div>');
    const antigo = document.getElementById('antigo') as HTMLElement;
    query('#d').html('<i>b</i>');
    expect(antigo.isConnected).toBe(false);
    expect(query('#d').find('i').length).toBe(1);
  });
});

describe('val', () => {
  it('le e escreve campos de texto', () => {
    montar('<input id="a" value="ana"><input id="b" value="bia">');
    expect(query('#a').val()).toBe('ana');
    query('input').val('nova');
    expect(query('#b').val()).toBe('nova');
    query('input').val(null);
    expect(query('#a').val()).toBe('');
    query('#a').val(12);
    expect(query('#a').val()).toBe('12');
    // Elemento sem `value` devolve string vazia.
    montar('<div id="d"></div>');
    expect(query('#d').val()).toBe('');
  });

  it('le e escreve checkbox e radio', () => {
    montar(
      '<input type="checkbox" id="c1" value="sim" checked>' +
        '<input type="checkbox" id="c2" value="nao">' +
        '<input type="checkbox" id="c3" checked>' +
        '<input type="radio" name="r" id="r1" value="a">' +
        '<input type="radio" name="r" id="r2" value="b">'
    );
    expect(query('#c1').val()).toBe('sim');
    expect(query('#c2').val()).toBe('');
    // Sem atributo `value` o navegador usa "on".
    expect(query('#c3').val()).toBe('on');
    // Com `value` vazio o fallback `|| 'on'` entra em acao.
    (document.getElementById('c3') as HTMLInputElement).value = '';
    expect(query('#c3').val()).toBe('on');

    query('#c2').val(true);
    expect((document.getElementById('c2') as HTMLInputElement).checked).toBe(true);
    query('#c2').val('nao');
    expect((document.getElementById('c2') as HTMLInputElement).checked).toBe(true);
    query('#c2').val('outro');
    expect((document.getElementById('c2') as HTMLInputElement).checked).toBe(false);
    query('#c1, #c2').val(['sim']);
    expect((document.getElementById('c1') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('c2') as HTMLInputElement).checked).toBe(false);

    query('[name=r]').val('b');
    expect((document.getElementById('r2') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('r1') as HTMLInputElement).checked).toBe(false);
  });

  it('le e escreve select simples e multiplo', () => {
    montar(
      '<select id="s"><option value="1">1</option><option value="2" selected>2</option></select>' +
        '<select id="m" multiple><option value="x">x</option><option value="y">y</option>' +
        '<option value="z">z</option></select>'
    );
    expect(query('#s').val()).toBe('2');
    query('#s').val('1');
    expect(query('#s').val()).toBe('1');

    expect(query('#m').val()).toEqual([]);
    query('#m').val(['x', 'z']);
    expect(query('#m').val()).toEqual(['x', 'z']);
    // Valor unico tambem funciona: vira lista de um item.
    query('#m').val('y');
    expect(query('#m').val()).toEqual(['y']);
  });
});

describe('attr, removeAttr e prop', () => {
  beforeEach(() => montar('<a id="a" href="#x" class="l">a</a><a id="b" class="l">b</a>'));

  it('le do primeiro e escreve em todos', () => {
    expect(query('.l').attr('id')).toBe('a');
    expect(query('.l').attr('nao-existe')).toBeUndefined();

    query('.l').attr('data-x', '1');
    expect(query('#b').attr('data-x')).toBe('1');
    query('.l').attr('data-n', 5);
    expect(query('#a').attr('data-n')).toBe('5');
    // `true` vira atributo booleano vazio.
    query('.l').attr('hidden', true);
    expect(query('#a').attr('hidden')).toBe('');
    // `null` e `false` removem.
    query('#a').attr('hidden', null);
    expect(query('#a').attr('hidden')).toBeUndefined();
    query('#b').attr('hidden', false);
    expect(query('#b').attr('hidden')).toBeUndefined();
  });

  it('aceita objeto com varios atributos de uma vez', () => {
    query('.l').attr({ 'data-a': '1', 'data-b': true, 'data-c': 2, href: null });
    expect(query('#a').attr('data-a')).toBe('1');
    expect(query('#a').attr('data-b')).toBe('');
    expect(query('#a').attr('data-c')).toBe('2');
    expect(query('#a').attr('href')).toBeUndefined();
    query('.l').attr({ 'data-a': false });
    expect(query('#a').attr('data-a')).toBeUndefined();
  });

  it('removeAttr aceita varios nomes separados por espaco', () => {
    query('.l').attr({ 'data-a': '1', 'data-b': '2' });
    query('.l').removeAttr('data-a data-b');
    expect(query('#a').attr('data-a')).toBeUndefined();
    expect(query('#b').attr('data-b')).toBeUndefined();
    // Nome vazio nao quebra.
    expect(() => query('.l').removeAttr('   ')).not.toThrow();
  });

  it('prop le e escreve propriedades reais do elemento', () => {
    expect(query('#a').prop('tagName')).toBe('A');
    query('.l').prop('tabIndex', 3);
    expect((document.getElementById('b') as HTMLElement).tabIndex).toBe(3);
    expect(query('.nao-existe').prop('tagName')).toBeUndefined();
  });
});

describe('data', () => {
  beforeEach(() =>
    montar(
      `<div id="d"
        data-conta="42" data-preco="-3.5" data-ativo="true" data-off="false"
        data-nulo="null" data-vazio="" data-nome="ana"
        data-config='{"a":1}' data-lista='[1,2]' data-txt='"oi"'
        data-quebrado='{isso nao e json' data-minha-chave="k"></div>`
    )
  );

  it('converte JSON, numero, booleano e null na leitura', () => {
    const d = query('#d');
    expect(d.data('conta')).toBe(42);
    expect(d.data('preco')).toBe(-3.5);
    expect(d.data('ativo')).toBe(true);
    expect(d.data('off')).toBe(false);
    expect(d.data('nulo')).toBeNull();
    expect(d.data('vazio')).toBe('');
    expect(d.data('nome')).toBe('ana');
    expect(d.data('config')).toEqual({ a: 1 });
    expect(d.data('lista')).toEqual([1, 2]);
    expect(d.data('txt')).toBe('oi');
    // JSON quebrado volta como texto cru em vez de derrubar a leitura.
    expect(d.data('quebrado')).toBe('{isso nao e json');
    expect(d.data('nao-existe')).toBeUndefined();
  });

  it('aceita chave em kebab-case e devolve o mapa inteiro', () => {
    const d = query('#d');
    expect(d.data('minha-chave')).toBe('k');
    expect(d.data('minhaChave')).toBe('k');
    const tudo = d.data() as Record<string, unknown>;
    expect(tudo.conta).toBe(42);
    expect(tudo.minhaChave).toBe('k');
    expect(tudo.config).toEqual({ a: 1 });
  });

  it('escreve chave a chave e por objeto', () => {
    const d = query('#d');
    d.data('texto', 'cru');
    expect((document.getElementById('d') as HTMLElement).dataset.texto).toBe('cru');
    d.data('obj', { a: 1 });
    expect(d.data('obj')).toEqual({ a: 1 });
    d.data('vazio2', undefined);
    // `undefined` e serializado como null, nao como a palavra "undefined".
    expect((document.getElementById('d') as HTMLElement).dataset.vazio2).toBe('null');
    d.data({ 'outra-chave': 9, texto2: 'x', nada: null, ausente: undefined });
    expect(d.data('outra-chave')).toBe(9);
    expect(d.data('texto2')).toBe('x');
    expect((document.getElementById('d') as HTMLElement).dataset.nada).toBe('null');
    expect((document.getElementById('d') as HTMLElement).dataset.ausente).toBe('null');
  });
});

describe('css, medidas e rolagem', () => {
  it('le estilo computado e cai no inline quando o elemento esta solto', () => {
    montar('<div id="d"></div>');
    const d = document.getElementById('d') as HTMLElement;
    d.style.color = 'red';
    expect(query('#d').css('color')).toBe('rgb(255, 0, 0)');
    // camelCase vira kebab.
    d.style.backgroundColor = 'blue';
    expect(query('#d').css('backgroundColor')).toBe('rgb(0, 0, 255)');

    const fora = solto();
    fora.style.color = 'green';
    // Sem estar no documento nao ha estilo computado: sobra o inline.
    expect(query(fora).css('color')).toBe('green');
    expect(query(fora).css('--nao-definido')).toBe('');
  });

  it('escreve estilo com e sem unidade automatica', () => {
    montar('<div class="c"></div><div class="c"></div>');
    const c = query('.c');
    c.css('width', 120);
    expect(c[0].style.width).toBe('120px');
    expect(c[1].style.width).toBe('120px');
    // Propriedades sem unidade nao ganham px.
    c.css('opacity', 0.5);
    expect(c[0].style.opacity).toBe('0.5');
    c.css('zIndex', 3);
    expect(c[0].style.zIndex).toBe('3');
    c.css('lineHeight', 2);
    expect(c[0].style.lineHeight).toBe('2');
    // Variavel CSS tambem escapa do px.
    c.css('--espaco', 4);
    expect(c[0].style.getPropertyValue('--espaco')).toBe('4');
    // Texto passa direto.
    c.css('height', '3rem');
    expect(c[0].style.height).toBe('3rem');
    // null e string vazia removem.
    c.css('width', null);
    expect(c[0].style.width).toBe('');
    c.css('height', '');
    expect(c[0].style.height).toBe('');
    // Objeto aplica varias.
    c.css({ color: 'red', margin: 8, padding: null });
    expect(c[0].style.color).toBe('red');
    expect(c[0].style.margin).toBe('8px');
  });

  it('width, height, offset, position e scrollTop', () => {
    montar('<div id="d"></div>');
    const d = query('#d');
    // jsdom nao faz layout: as medidas lidas sao zero, o que ja exercita o ramo.
    expect(d.width()).toBe(0);
    expect(d.height()).toBe(0);
    expect(d.offset()).toEqual({ top: 0, left: 0 });
    expect(d.position()).toEqual({ top: 0, left: 0 });

    d.width(50);
    d.height('4rem');
    expect(d[0].style.width).toBe('50px');
    expect(d[0].style.height).toBe('4rem');

    expect(d.scrollTop()).toBe(0);
    d.scrollTop(30);
    expect(d[0].scrollTop).toBe(30);
    // Valor invalido vira zero em vez de NaN.
    d.scrollTop('abc' as unknown as number);
    expect(d[0].scrollTop).toBe(0);
  });
});

describe('classes', () => {
  beforeEach(() => montar('<div class="c a"></div><div class="c"></div>'));

  it('addClass, removeClass, toggleClass e hasClass', () => {
    const c = query('.c');
    c.addClass('x y');
    expect(c[0].classList.contains('x')).toBe(true);
    expect(c[1].classList.contains('y')).toBe(true);
    expect(c.hasClass('x y')).toBe(true);
    expect(c.hasClass('x z')).toBe(false);
    // `a` so existe no primeiro: `some` basta.
    expect(c.hasClass('a')).toBe(true);

    c.removeClass('x');
    expect(c.hasClass('x')).toBe(false);

    c.toggleClass('t');
    expect(c[0].classList.contains('t')).toBe(true);
    c.toggleClass('t');
    expect(c[0].classList.contains('t')).toBe(false);
    // Forcado: liga mesmo em quem ja estava desligado e nao alterna de volta.
    c.toggleClass('f', true);
    c.toggleClass('f', true);
    expect(c[0].classList.contains('f')).toBe(true);
    c.toggleClass('f', false);
    expect(c[0].classList.contains('f')).toBe(false);
  });

  it('nome vazio ou so espacos e no-op', () => {
    const c = query('.c');
    const antes = c[0].className;
    expect(() => c.addClass('   ').removeClass('').toggleClass('  ')).not.toThrow();
    expect(c[0].className).toBe(antes);
    expect(c.hasClass('')).toBe(false);
    expect(c.hasClass('   ')).toBe(false);
    // Guarda contra chamada sem tipagem vinda de JavaScript puro.
    expect(() => c.addClass(undefined as unknown as string)).not.toThrow();
    expect(c[0].className).toBe(antes);
  });
});

// ---------------------------------------------------------------------------
// Insercao e remocao
// ---------------------------------------------------------------------------

describe('insercao de conteudo', () => {
  it('append e prepend aceitam html, texto, no, colecao, lista e nulo', () => {
    montar('<div id="d">meio</div>');
    const d = query('#d');
    d.append('<b>fim</b>');
    d.prepend('<i>ini</i>');
    expect(d[0].innerHTML).toBe('<i>ini</i>meio<b>fim</b>');

    d.append(' texto');
    expect(d[0].textContent).toContain(' texto');

    d.append(solto('u'));
    expect(d.find('u').length).toBe(1);

    d.append(fromHtml('<em>a</em><em>b</em>'));
    expect(d.find('em').length).toBe(2);

    d.append([solto('s'), solto('s')]);
    expect(d.find('s').length).toBe(2);

    // Entradas que nao viram no nenhum sao no-op.
    const antes = d[0].innerHTML;
    d.append(null);
    d.append(undefined);
    d.append(() => undefined);
    d.append({} as unknown as Node);
    d.append([null as unknown as Node]);
    expect(d[0].innerHTML).toBe(antes);
  });

  it('com varios destinos o ultimo fica com o original e os demais com copias', () => {
    montar('<div class="box"></div><div class="box"></div>');
    const no = solto('span');
    no.id = 'unico';
    query('.box').append(no);
    const caixas = document.querySelectorAll('.box');
    expect(caixas[0].querySelector('span')).not.toBe(no);
    expect(caixas[1].querySelector('span')).toBe(no);
  });

  it('before e after inserem ao lado, e ignoram elemento sem pai', () => {
    montar('<div id="p"><span id="alvo">x</span></div>');
    query('#alvo').before('<b id="antes">a</b>');
    query('#alvo').after('<b id="depois">d</b>');
    expect((document.getElementById('p') as HTMLElement).innerHTML).toBe(
      '<b id="antes">a</b><span id="alvo">x</span><b id="depois">d</b>'
    );
    const orfao = solto();
    expect(() => query(orfao).before('<i></i>').after('<i></i>')).not.toThrow();
    expect(orfao.parentNode).toBeNull();
  });

  it('appendTo e prependTo movem para o destino, clonando quando ha varios', () => {
    montar('<div class="alvo"></div><div class="alvo"></div><span id="mover">m</span>');
    const mover = document.getElementById('mover') as HTMLElement;
    query('#mover').appendTo('.alvo');
    const alvos = document.querySelectorAll('.alvo');
    expect(alvos[0].querySelector('span')).not.toBe(mover);
    expect(alvos[1].querySelector('span')).toBe(mover);

    montar('<div class="alvo"><b>fixo</b></div><div class="alvo"><b>fixo</b></div>' +
      '<span class="mv">1</span><span class="mv">2</span>');
    query('.mv').prependTo('.alvo');
    const primeiro = document.querySelectorAll('.alvo')[0];
    expect(primeiro.children[0].textContent).toBe('1');
    expect(primeiro.children[1].textContent).toBe('2');
    expect(primeiro.children[2].textContent).toBe('fixo');

    // Destino inexistente: nada acontece e nada quebra.
    expect(() => query('.mv').appendTo('.nao-existe')).not.toThrow();
  });

  it('replaceWith troca o elemento e ignora quem nao tem pai', () => {
    montar('<div id="p"><span id="velho">v</span></div>');
    query('#velho').replaceWith('<b id="novo">n</b>');
    expect(document.getElementById('velho')).toBeNull();
    expect(document.getElementById('novo')).not.toBeNull();

    const orfao = solto();
    expect(() => query(orfao).replaceWith('<i></i>')).not.toThrow();
  });

  it('wrap envolve cada elemento e desce ate o no mais interno', () => {
    montar('<div id="p"><span class="a">1</span><span class="a">2</span></div>');
    query('.a').wrap('<div class="capa"><em class="dentro"></em></div>');
    expect(document.querySelectorAll('.capa').length).toBe(2);
    expect(document.querySelectorAll('.capa .dentro .a').length).toBe(2);
    // Wrapper que nao resolve para elemento nenhum e no-op.
    montar('<span id="s">x</span>');
    expect(() => query('#s').wrap('')).not.toThrow();
    expect((document.getElementById('s') as HTMLElement).parentElement).toBe(document.body);
  });

  it('unwrap remove o pai, mas nunca o body nem um pai solto', () => {
    montar('<div id="avo"><div class="capa"><span id="filho">f</span></div></div>');
    query('#filho').unwrap();
    expect(document.querySelector('.capa')).toBeNull();
    expect((document.getElementById('filho') as HTMLElement).parentElement?.id).toBe('avo');

    // Filho direto do body: o body nunca e removido.
    montar('<span id="direto">d</span>');
    query('#direto').unwrap();
    expect(document.getElementById('direto')).not.toBeNull();

    // Pai solto no ar nao tem avo para receber os filhos: no-op.
    const pai = solto();
    const filho = solto('span');
    pai.appendChild(filho);
    expect(() => query(filho).unwrap()).not.toThrow();
    expect(filho.parentElement).toBe(pai);
  });

  it('remove, empty e clone', () => {
    montar('<div id="d"><span class="f">1</span><span class="f">2</span></div>');
    const c = query('.f').clone();
    expect(c.length).toBe(2);
    expect(c[0].isConnected).toBe(false);
    expect(c[0]).not.toBe(query('.f')[0]);
    // Copia rasa perde os filhos.
    expect(query('#d').clone(false)[0].children.length).toBe(0);
    expect(query('#d').clone()[0].children.length).toBe(2);

    query('#d').empty();
    expect((document.getElementById('d') as HTMLElement).children.length).toBe(0);
    expect(document.querySelectorAll('.f').length).toBe(0);

    query('#d').remove();
    expect(document.getElementById('d')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

describe('eventos', () => {
  beforeEach(() =>
    montar('<div id="pai"><button class="b" id="b1">1</button><button class="b" id="b2">2</button>' +
      '<span id="outro">o</span></div>')
  );

  it('on escuta direto, com this no elemento e varios tipos de uma vez', () => {
    const vistos: string[] = [];
    query('.b').on('click focus', function (ev) {
      vistos.push(`${ev.type}:${this.id}`);
    });
    (document.getElementById('b1') as HTMLElement).click();
    (document.getElementById('b2') as HTMLElement).focus();
    expect(vistos).toEqual(['click:b1', 'focus:b2']);
  });

  it('on com seletor delega e so dispara para descendentes que casam', () => {
    const vistos: string[] = [];
    query('#pai').on('click', '.b', function () {
      vistos.push(this.id);
    });
    (document.getElementById('b1') as HTMLElement).click();
    // Alvo que nao casa com o seletor nao dispara.
    (document.getElementById('outro') as HTMLElement).click();
    expect(vistos).toEqual(['b1']);

    // Botao criado depois tambem e atendido: e o ponto da delegacao.
    query('#pai').append('<button class="b" id="b3">3</button>');
    (document.getElementById('b3') as HTMLElement).click();
    expect(vistos).toEqual(['b1', 'b3']);
    query('#pai').off();
  });

  it('delegacao ignora o casamento que esta fora do elemento escutado', () => {
    montar('<div id="fora" class="alvo"><div id="dentro"><b id="clique">c</b></div></div>');
    let chamou = 0;
    // `.alvo` e ancestral de `#dentro`, entao `closest` acha mas nao esta dentro.
    query('#dentro').on('click', '.alvo', () => {
      chamou += 1;
    });
    (document.getElementById('clique') as HTMLElement).click();
    expect(chamou).toBe(0);
    query('#dentro').off();
  });

  it('on ignora handler que nao e funcao', () => {
    const c = query('.b');
    expect(c.on('click', undefined as unknown as () => void)).toBe(c);
    expect(c.on('click', '.b', undefined as unknown as () => void)).toBe(c);
    expect(c.once('click', undefined as unknown as () => void)).toBe(c);
  });

  it('off remove tudo, por tipo, por seletor e por funcao', () => {
    let a = 0;
    let b = 0;
    const fnA = (): void => {
      a += 1;
    };
    const fnB = (): void => {
      b += 1;
    };
    const alvo = query('#pai');
    alvo.on('click', fnA);
    alvo.on('click', fnB);
    alvo.on('mouseover', fnA);
    alvo.on('click', '.b', fnA);

    // Por funcao e sem seletor: `off` casa com qualquer seletor, entao saem
    // tanto a escuta direta de fnA quanto a delegada com a mesma funcao.
    alvo.off('click', fnA);
    (document.getElementById('b1') as HTMLElement).click();
    expect(a).toBe(0);
    expect(b).toBe(1);

    // Por tipo.
    alvo.off('click');
    (document.getElementById('b1') as HTMLElement).click();
    expect(b).toBe(1);

    // Ainda resta o mouseover.
    (document.getElementById('pai') as HTMLElement).dispatchEvent(new Event('mouseover'));
    expect(a).toBe(1);

    // Sem argumento remove todas.
    alvo.off();
    (document.getElementById('pai') as HTMLElement).dispatchEvent(new Event('mouseover'));
    expect(a).toBe(1);

    // Elemento sem nada registrado: no-op.
    expect(() => query('#outro').off('click')).not.toThrow();
  });

  it('off por seletor so atinge as escutas delegadas daquele seletor', () => {
    let direto = 0;
    let delegado = 0;
    const alvo = query('#pai');
    alvo.on('click', () => {
      direto += 1;
    });
    alvo.on('click', '.b', () => {
      delegado += 1;
    });
    alvo.off('click', '.b');
    (document.getElementById('b1') as HTMLElement).click();
    expect(delegado).toBe(0);
    expect(direto).toBe(1);
    alvo.off();
  });

  it('once dispara uma vez, com e sem delegacao', () => {
    let n = 0;
    query('#pai').once('click', () => {
      n += 1;
    });
    (document.getElementById('pai') as HTMLElement).click();
    (document.getElementById('pai') as HTMLElement).click();
    expect(n).toBe(1);

    let m = 0;
    query('#pai').once('click', '.b', () => {
      m += 1;
    });
    (document.getElementById('b1') as HTMLElement).click();
    (document.getElementById('b2') as HTMLElement).click();
    expect(m).toBe(1);
    query('#pai').off();
  });

  it('trigger usa o metodo nativo quando existe e CustomEvent quando nao', () => {
    let cliques = 0;
    let ultimo: Event | null = null;
    query('#b1').on('click', (ev) => {
      cliques += 1;
      ultimo = ev;
    });
    // Sem detail vai pelo metodo nativo `el.click()`, que gera um MouseEvent.
    query('#b1').trigger('click');
    expect(cliques).toBe(1);
    expect(ultimo).toBeInstanceOf(MouseEvent);
    expect(ultimo).not.toBeInstanceOf(CustomEvent);

    // Com detail vira CustomEvent marcado como interno da Voodoo.
    query('#b1').trigger('click', { n: 7 });
    expect(cliques).toBe(2);
    expect(ultimo).toBeInstanceOf(CustomEvent);
    expect((ultimo as unknown as CustomEvent).detail).toEqual({ n: 7 });
    expect((ultimo as unknown as Record<string, unknown>).__voodoo).toBe(true);

    let custom: unknown = null;
    query('#pai').on('meu-evento', (ev) => {
      custom = (ev as CustomEvent).detail;
    });
    query('#b1').trigger('meu-evento', 'oi');
    expect(custom).toBe('oi');
    query('#b1').off();
    query('#pai').off();
  });

  it('emit sempre sobe pela arvore como CustomEvent', () => {
    const recebidos: unknown[] = [];
    query('#pai').on('aviso', (ev) => recebidos.push((ev as CustomEvent).detail));
    query('.b').emit('aviso', 1);
    expect(recebidos).toEqual([1, 1]);
    // Sem detail tambem funciona, sem cair no metodo nativo.
    query('#b1').emit('aviso');
    expect(recebidos.length).toBe(3);
    query('#pai').off();
  });
});

// ---------------------------------------------------------------------------
// Visibilidade
// ---------------------------------------------------------------------------

describe('show, hide e toggle', () => {
  it('hide guarda o display inline e show devolve', () => {
    montar('<div id="d" style="display:flex">x</div>');
    const d = query('#d');
    d.hide();
    expect(d[0].style.display).toBe('none');
    d.show();
    expect(d[0].style.display).toBe('flex');
  });

  it('sem display inline, show apenas limpa a propriedade', () => {
    montar('<div id="d">x</div>');
    const d = query('#d');
    d.hide();
    expect(d[0].style.display).toBe('none');
    d.show();
    expect(d[0].style.display).toBe('');
  });

  it('show forca display block quando o CSS esconde o elemento', () => {
    // `script` nasce com `display:none` na folha padrao do documento.
    montar('<script id="s"></script>');
    const s = query('#s');
    s.show();
    expect(s[0].style.display).toBe('block');
  });

  it('show remove o atributo hidden', () => {
    montar('<div id="d" hidden>x</div>');
    query('#d').show();
    expect(query('#d').attr('hidden')).toBeUndefined();
  });

  it('toggle alterna e o argumento forca o estado', () => {
    montar('<div id="d">x</div>');
    const d = query('#d');
    d.toggle();
    expect(d[0].style.display).toBe('none');
    d.toggle();
    expect(d[0].style.display).toBe('');
    d.toggle(false);
    expect(d[0].style.display).toBe('none');
    d.toggle(true);
    expect(d[0].style.display).toBe('');
  });

  it('toggle considera escondido o que tem atributo hidden ou display none do CSS', () => {
    montar('<div id="a" hidden>a</div><script id="b"></script>');
    query('#a').toggle();
    expect(query('#a').attr('hidden')).toBeUndefined();
    query('#b').toggle();
    expect(query('#b')[0].style.display).toBe('block');
  });

  it('elemento solto do documento e tratado como visivel', () => {
    const fora = solto();
    query(fora).toggle();
    // Considerado visivel, entao alternar esconde.
    expect(fora.style.display).toBe('none');
    query(fora).show();
    expect(fora.style.display).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Animacoes da colecao
// ---------------------------------------------------------------------------

describe('animacoes da colecao', () => {
  const rafOriginal = globalThis.requestAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 0) as unknown as number) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = rafOriginal;
    vi.useRealTimers();
  });

  it('fadeIn e fadeOut atravessam a colecao inteira e nao deixam timer', async () => {
    montar('<div class="c" hidden>a</div><div class="c">b</div>');
    const c = query('.c');
    expect(c.fadeIn(10)).toBe(c);
    expect(c[0].hasAttribute('hidden')).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect(vi.getTimerCount()).toBe(0);

    expect(c.fadeOut(10)).toBe(c);
    await vi.advanceTimersByTimeAsync(200);
    expect(c[0].style.display).toBe('none');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('slideUp, slideDown e slideToggle percorrem a colecao', async () => {
    montar('<div class="c" hidden>a</div><script class="c"></script><div class="c">b</div>');
    const c = query('.c');
    expect(c.slideDown(10)).toBe(c);
    expect(c[0].hasAttribute('hidden')).toBe(false);
    await vi.advanceTimersByTimeAsync(200);

    expect(c.slideUp(10)).toBe(c);
    await vi.advanceTimersByTimeAsync(200);
    expect(c[0].style.display).toBe('none');

    // Metade escondida, metade visivel: cobre os dois lados do slideToggle.
    montar('<div id="vis">a</div><div id="esc" style="display:none">b</div>');
    query('#vis, #esc').slideToggle(10);
    await vi.advanceTimersByTimeAsync(200);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('animate so chama a Web Animations API onde ela existe', () => {
    montar('<div class="c"></div><div class="c"></div>');
    const c = query('.c');
    const espia = vi.fn();
    (c[0] as unknown as Record<string, unknown>).animate = espia;
    // jsdom nao implementa `animate`: o segundo elemento cai no `continue`.
    expect((c[1] as unknown as Record<string, unknown>).animate).toBeUndefined();
    expect(() => c.animate([{ opacity: 0 }, { opacity: 1 }])).not.toThrow();
    expect(espia).toHaveBeenCalledTimes(1);
    c.animate([{ opacity: 0 }], { duration: 10 });
    expect(espia).toHaveBeenCalledTimes(2);
  });

  it('scrollIntoView atinge apenas o primeiro elemento', () => {
    montar('<div class="c"></div><div class="c"></div>');
    const espia = vi.fn();
    // jsdom nao traz `scrollIntoView`; o metodo e emprestado so para o teste.
    (Element.prototype as unknown as Record<string, unknown>).scrollIntoView = espia;
    try {
      query('.c').scrollIntoView();
      expect(espia).toHaveBeenCalledTimes(1);
      query('.c').scrollIntoView({ block: 'end' });
      expect(espia).toHaveBeenLastCalledWith({ block: 'end' });
      // Colecao vazia nao chama nada.
      query('.nao-existe').scrollIntoView();
      expect(espia).toHaveBeenCalledTimes(2);
    } finally {
      delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    }
  });
});

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

describe('serialize', () => {
  beforeEach(() =>
    montar(
      `<form id="f">
        <input name="nome" value="ana">
        <input value="sem-nome">
        <input name="desligado" value="x" disabled>
        <input type="file" name="arquivo">
        <input type="submit" name="enviar" value="Enviar">
        <input type="reset" name="limpar" value="Limpar">
        <input type="button" name="botao" value="B">
        <input type="checkbox" name="ok" value="1" checked>
        <input type="checkbox" name="nao" value="1">
        <input type="radio" name="r" value="a" checked>
        <input type="radio" name="r" value="b">
        <select name="s"><option value="1">1</option><option value="2" selected>2</option></select>
        <select name="m" multiple><option value="x" selected>x</option>
          <option value="y" selected>y</option><option value="z">z</option></select>
        <textarea name="t">texto</textarea>
      </form>`
    )
  );

  it('monta a query string ignorando campos que nao contam', () => {
    const s = query('#f').serialize();
    const pares = new URLSearchParams(s);
    expect(pares.get('nome')).toBe('ana');
    expect(pares.get('ok')).toBe('1');
    expect(pares.get('r')).toBe('a');
    expect(pares.get('s')).toBe('2');
    expect(pares.getAll('m')).toEqual(['x', 'y']);
    expect(pares.get('t')).toBe('texto');
    // Sem nome, desligado, arquivo, submit, reset, button e checkbox solto.
    expect(pares.has('desligado')).toBe(false);
    expect(pares.has('arquivo')).toBe(false);
    expect(pares.has('enviar')).toBe(false);
    expect(pares.has('limpar')).toBe(false);
    expect(pares.has('botao')).toBe(false);
    expect(pares.has('nao')).toBe(false);
  });

  it('serializa tambem quando a colecao ja e o proprio campo', () => {
    expect(query('input[name=nome]').serialize()).toBe('nome=ana');
  });

  it('serialize de colecao vazia e string vazia', () => {
    expect(query('.nao-existe').serialize()).toBe('');
  });
});

describe('serializeObject', () => {
  it('converte tipos, agrupa repetidos e trata checkbox solto', () => {
    montar(
      `<form id="f">
        <input name="nome" value="ana">
        <input type="number" name="idade" value="30">
        <input type="number" name="vazio" value="">
        <input type="range" name="nivel" value="7">
        <input type="checkbox" name="aceite" checked>
        <input type="checkbox" name="marcado" value="sim" checked>
        <input type="checkbox" name="solto" value="1">
        <input type="radio" name="cor" value="azul" checked>
        <input type="radio" name="cor" value="verde">
        <input type="file" name="unico">
        <input type="file" name="varios" multiple>
        <select name="multi" multiple><option value="a" selected>a</option>
          <option value="b">b</option></select>
        <input type="submit" name="enviar" value="E">
        <input name="semNome0" value="ok">
        <input value="ignorado">
        <input name="off" value="x" disabled>
      </form>`
    );
    const o = query('#f').serializeObject();
    expect(o.nome).toBe('ana');
    expect(o.idade).toBe(30);
    expect(o.vazio).toBeNull();
    expect(o.nivel).toBe(7);
    // Checkbox sem `value` vira booleano.
    expect(o.aceite).toBe(true);
    expect(o.marcado).toBe('sim');
    // Checkbox desmarcado e registrado como false.
    expect(o.solto).toBe(false);
    expect(o.cor).toBe('azul');
    expect(o.unico).toBeNull();
    expect(o.varios).toEqual([]);
    expect(o.multi).toEqual(['a']);
    expect(o.semNome0).toBe('ok');
    expect(o.enviar).toBeUndefined();
    expect(o.off).toBeUndefined();
  });

  it('nomes terminados em [] e nomes repetidos viram lista', () => {
    montar(
      `<form id="f">
        <input name="tags[]" value="a">
        <input name="tags[]" value="b">
        <input type="checkbox" name="opcoes[]" value="1" checked>
        <input type="checkbox" name="opcoes[]" value="2">
        <input type="checkbox" name="opcoes[]" value="3" checked>
        <input name="cor" value="azul">
        <input name="cor" value="verde">
        <input name="cor" value="rosa">
        <input type="checkbox" name="flag" value="1">
        <input type="checkbox" name="flag" value="2" checked>
      </form>`
    );
    const o = query('#f').serializeObject();
    expect(o['tags']).toEqual(['a', 'b']);
    // O desmarcado nao entra na lista.
    expect(o['opcoes']).toEqual(['1', '3']);
    expect(o['cor']).toEqual(['azul', 'verde', 'rosa']);
    // O primeiro gravou `false`; o marcado seguinte substitui em vez de virar par.
    expect(o['flag']).toBe('2');
  });

  it('campo de arquivo com conteudo devolve o File ou a lista', () => {
    montar('<form id="f"><input type="file" name="um"><input type="file" name="muitos" multiple></form>');
    const a = new File(['a'], 'a.txt');
    const b = new File(['b'], 'b.txt');
    // jsdom deixa `files` sempre nulo; injetar a lista cobre o lado preenchido
    // do `?.` e do `??` que a leitura usa.
    Object.defineProperty(document.querySelector('[name=um]'), 'files', { value: [a] });
    Object.defineProperty(document.querySelector('[name=muitos]'), 'files', { value: [a, b] });
    const o = query('#f').serializeObject();
    expect(o.um).toBe(a);
    expect(o.muitos).toEqual([a, b]);

    // Lista existente porem vazia: o campo simples volta como null.
    montar('<form id="g"><input type="file" name="um"><input type="file" name="nulo" multiple></form>');
    Object.defineProperty(document.querySelector('[name=um]'), 'files', { value: [] });
    // `files` nulo e o que aparece em webview antiga: precisa virar lista vazia.
    Object.defineProperty(document.querySelector('[name=nulo]'), 'files', { value: null });
    const g = query('#g').serializeObject();
    expect(g.um).toBeNull();
    expect(g.nulo).toEqual([]);
  });

  it('colecao vazia devolve objeto vazio', () => {
    expect(query('.nao-existe').serializeObject()).toEqual({});
  });
});

describe('focus, blur e select', () => {
  it('focus atinge o primeiro, blur e select percorrem a colecao', () => {
    montar('<input id="a" value="texto"><input id="b" value="outro"><div id="d"></div>');
    query('#a, #b').focus();
    expect(document.activeElement?.id).toBe('a');
    // `select` so existe em campo de texto; a div e ignorada sem erro.
    expect(() => query('#a, #b, #d').select()).not.toThrow();
    query('#a, #b').blur();
    expect(document.activeElement?.id).not.toBe('a');
  });
});

// ---------------------------------------------------------------------------
// Integracao com o runtime
// ---------------------------------------------------------------------------

describe('walk e destroy', () => {
  it('walk inicializa as directives dos elementos da colecao', () => {
    montar('<div id="host"><span v-text="\'oi\'"></span></div>');
    query('#host').walk();
    expect(query('#host span').text()).toBe('oi');
  });

  it('walk com force desmonta antes de reiniciar', () => {
    montar('<div id="host"><span v-text="\'oi\'"></span></div>');
    query('#host').walk();
    expect(() => query('#host').walk(true)).not.toThrow();
    expect(query('#host span').text()).toBe('oi');
  });

  it('destroy desmonta sem tirar o elemento do documento', () => {
    montar('<div id="host"><span v-text="\'oi\'"></span></div>');
    query('#host').walk();
    expect(query('#host').destroy()).toBeInstanceOf(VoodooCollection);
    expect(document.getElementById('host')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Colecao vazia: toda operacao precisa ser no-op segura
// ---------------------------------------------------------------------------

describe('colecao vazia', () => {
  it('encadear sobre resultado vazio nunca lanca e nunca produz elemento', () => {
    montar('<div id="a"></div>');
    const vazia = query('.nao-existe');
    expect(vazia.length).toBe(0);

    const encadeada = vazia
      .find('.x')
      .closest('.y')
      .parent()
      .parents()
      .children()
      .siblings()
      .next()
      .prev()
      .first()
      .last()
      .eq(0)
      .filter('.z')
      .not('.z')
      .has('.z')
      .add('.tambem-nao-existe')
      .slice(0, 1);
    expect(encadeada.length).toBe(0);
  });

  it('leituras devolvem valores neutros', () => {
    const vazia = query('.nao-existe');
    expect(vazia.text()).toBe('');
    expect(vazia.html()).toBe('');
    expect(vazia.val()).toBe('');
    expect(vazia.attr('x')).toBeUndefined();
    expect(vazia.prop('x')).toBeUndefined();
    expect(vazia.data()).toEqual({});
    expect(vazia.data('x')).toBeUndefined();
    expect(vazia.css('color')).toBe('');
    expect(vazia.width()).toBe(0);
    expect(vazia.height()).toBe(0);
    expect(vazia.offset()).toEqual({ top: 0, left: 0 });
    expect(vazia.position()).toEqual({ top: 0, left: 0 });
    expect(vazia.scrollTop()).toBe(0);
    expect(vazia.hasClass('a')).toBe(false);
    expect(vazia.is('.a')).toBe(false);
    expect(vazia.map((el) => el)).toEqual([]);
    expect(vazia.get()).toEqual([]);
    expect(vazia.get(0)).toBeUndefined();
    expect(vazia.toArray()).toEqual([]);
    expect([...vazia]).toEqual([]);
  });

  it('escritas e efeitos colaterais sao no-op', () => {
    const vazia = query('.nao-existe');
    expect(() => {
      vazia
        .text('a')
        .html('<b></b>')
        .val('x')
        .attr('a', '1')
        .attr({ b: '2' })
        .removeAttr('a')
        .prop('p', 1)
        .data('k', 1)
        .data({ k2: 2 })
        .css('color', 'red')
        .css({ margin: 1 })
        .width(10)
        .height(10)
        .scrollTop(5)
        .addClass('a')
        .removeClass('a')
        .toggleClass('a')
        .append('<i></i>')
        .prepend('<i></i>')
        .before('<i></i>')
        .after('<i></i>')
        .appendTo('body')
        .prependTo('body')
        .replaceWith('<i></i>')
        .wrap('<div></div>')
        .unwrap()
        .empty()
        .remove()
        .on('click', () => undefined)
        .once('click', () => undefined)
        .off()
        .trigger('click')
        .emit('x')
        .show()
        .hide()
        .toggle()
        .animate([{ opacity: 1 }])
        .scrollIntoView()
        .focus()
        .blur()
        .select()
        .each(() => undefined)
        .walk()
        .destroy();
    }).not.toThrow();
    expect(vazia.clone().length).toBe(0);
    expect(vazia.serialize()).toBe('');
    expect(vazia.serializeObject()).toEqual({});
    // Nada foi parar no documento.
    expect(document.body.querySelectorAll('i').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Elemento fora do documento
// ---------------------------------------------------------------------------

describe('elemento desconectado do documento', () => {
  it('aceita as mesmas operacoes de um elemento montado', () => {
    const fora = solto();
    fora.className = 'solto';
    const c = query(fora);
    c.addClass('novo').attr('data-x', '1').css('color', 'red').text('oi').append('<b>b</b>');
    expect(fora.classList.contains('novo')).toBe(true);
    expect(fora.getAttribute('data-x')).toBe('1');
    expect(fora.textContent).toBe('oib');
    expect(c.find('b').length).toBe(1);
    expect(c.parent().length).toBe(0);
    expect(c.parents().length).toBe(0);
    expect(c.closest('.solto').length).toBe(1);
    expect(c.width()).toBe(0);
    // `remove` em quem ja esta fora nao quebra.
    expect(() => c.remove()).not.toThrow();
  });

  it('eventos funcionam mesmo sem estar no documento', () => {
    const fora = solto('button');
    let n = 0;
    query(fora).on('click', () => {
      n += 1;
    });
    fora.click();
    expect(n).toBe(1);
    query(fora).off();
    fora.click();
    expect(n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ready
// ---------------------------------------------------------------------------

describe('ready', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolve sem funcao e executa a funcao passada', async () => {
    await expect(ready()).resolves.toBeUndefined();
    let n = 0;
    await ready(() => {
      n += 1;
    });
    expect(n).toBe(1);
  });

  it('erro dentro do callback e reportado e nao derruba a promessa', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      ready(() => {
        throw new Error('falha proposital');
      })
    ).resolves.toBeUndefined();
    expect(espia).toHaveBeenCalled();
    espia.mockRestore();
  });

  it('sem document resolve na hora e query devolve colecao vazia', async () => {
    vi.stubGlobal('document', undefined);
    try {
      await expect(ready()).resolves.toBeUndefined();
      expect(query('.qualquer').length).toBe(0);
      expect(query('<b>x</b>').length).toBe(0);
      expect(query(() => undefined).length).toBe(0);
      expect(fromHtml('<b>x</b>').length).toBe(0);
      // Sem document nao existe raiz padrao para o contexto cair de volta.
      expect(query('.qualquer', () => undefined).length).toBe(0);
      expect(query('.qualquer', {} as unknown as Node).length).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
