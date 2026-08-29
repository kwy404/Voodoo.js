/**
 * Testes de regressao: cada caso aqui nasceu de um defeito encontrado rodando
 * a biblioteca em navegador de verdade. O comentario de cada bloco explica o
 * sintoma original, para que a correcao nao seja desfeita sem querer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy, queryDirective, readAttr } from '../src/runtime/walker';
import { core } from '../src/core';

function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

async function settle(vezes = 3): Promise<void> {
  for (let i = 0; i < vezes; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('interpolacao dentro de blocos de codigo', () => {
  // Sintoma: a landing mostrava exemplos de codigo e a biblioteca tentava
  // avaliar `{ n: 0 }` como expressao, enchendo o console de erro de sintaxe.
  it('nao interpola dentro de pre', () => {
    const root = mount('<pre>&lt;div v-data="{ n: 0 }"&gt;</pre>');
    expect(root.textContent).toContain('{ n: 0 }');
  });

  it('nao interpola dentro de code', () => {
    const root = mount('<code>{ nome: "Vudu" }</code>');
    expect(root.textContent).toBe('{ nome: "Vudu" }');
  });

  it('nao interpola quando o codigo tem destaque de sintaxe', () => {
    // Com realce, o texto fica dentro de um span, e o pai direto deixa de ser
    // o pre. A checagem precisa subir pelos ancestrais.
    const root = mount('<pre><code><span class="tok">{ a: 1, b: 2 }</span></code></pre>');
    expect(root.textContent).toBe('{ a: 1, b: 2 }');
  });

  it('continua interpolando fora de blocos de codigo', () => {
    const root = mount('<p>Valor: { n }</p>', { n: 7 });
    expect(root.textContent).toBe('Valor: 7');
  });
});

describe('escopo dos atributos na tag de um componente', () => {
  // Sintoma: `@salvo="ultimo = $event"` gravava dentro do componente em vez do
  // estado de quem escreveu a tag, entao o pai nunca via o valor.
  it('avalia no escopo de quem escreveu a tag', async () => {
    core.component('emissor-teste', {
      methods: {
        disparar(this: { emit: (e: string, d: unknown) => void }) {
          this.emit('pronto', 'valor-esperado');
        },
      },
      template: '<button v-click="disparar">ir</button>',
    });

    const root = mount(
      '<div v-data="{ recebido: \'\' }">' +
        '<emissor-teste @pronto="recebido = $event"></emissor-teste>' +
        '<b v-text="recebido"></b>' +
        '</div>'
    );
    await settle();

    root.querySelector('button')!.click();
    await settle();

    expect(root.querySelector('b')!.textContent).toBe('valor-esperado');
  });

  it('$event traz a carga do emit e $rawEvent traz o evento cru', async () => {
    core.component('emissor-carga', {
      methods: {
        disparar(this: { emit: (e: string, d: unknown) => void }) {
          this.emit('dados', { id: 42 });
        },
      },
      template: '<button v-click="disparar">ir</button>',
    });

    const recebido = vi.fn();
    const root = mount('<div v-data="{}"><emissor-carga @dados="guardar($event, $rawEvent)"></emissor-carga></div>', {
      guardar: recebido,
    });
    await settle();

    root.querySelector('button')!.click();
    await settle();

    const [carga, cru] = recebido.mock.calls[0];
    expect(carga).toEqual({ id: 42 });
    expect(cru).toBeInstanceOf(Event);
  });
});

describe('registro de componente depois do carregamento', () => {
  // Sintoma: com a biblioteca carregada por CDN com defer, o script da
  // aplicacao registra componentes depois da primeira varredura, e as tags
  // ficavam paradas na tela sem nunca montar.
  it('monta as tags que ja estavam na pagina', async () => {
    const root = mount('<div v-data="{}"><tardio-teste titulo="Oi"></tardio-teste></div>');
    await settle();
    expect(root.querySelector('h4')).toBeNull();

    core.component('tardio-teste', {
      props: { titulo: { type: 'string' } },
      template: '<h4 v-text="titulo"></h4>',
    });
    await settle();

    expect(root.querySelector('h4')!.textContent).toBe('Oi');
  });

  it('mantem os listeners declarados na tag apos a montagem tardia', async () => {
    const root = mount(
      '<div v-data="{ resultado: \'\' }">' +
        '<tardio-evento @avisou="resultado = $event"></tardio-evento>' +
        '<i v-text="resultado"></i>' +
        '</div>'
    );
    await settle();

    core.component('tardio-evento', {
      methods: {
        agir(this: { emit: (e: string, d: unknown) => void }) {
          this.emit('avisou', 'chegou');
        },
      },
      template: '<button v-click="agir">ir</button>',
    });
    await settle();

    root.querySelector('button')!.click();
    await settle();
    expect(root.querySelector('i')!.textContent).toBe('chegou');
  });
});

describe('store criado depois da renderizacao', () => {
  // Sintoma: a tela lia `$store.carrinho` antes do store existir e nunca
  // atualizava quando ele era criado.
  it('atualiza quem ja lia a variavel magica', async () => {
    const root = mount('<span v-text="$store.tardio ? $store.tardio.total : 0"></span>');
    expect(root.querySelector('span')!.textContent).toBe('0');

    core.store('tardio', { total: 99 });
    await settle();

    expect(root.querySelector('span')!.textContent).toBe('99');
  });
});

describe('limpeza dos atributos', () => {
  // Sintoma: apos a limpeza do HTML, seletores como `[v-tab]` deixavam de
  // casar e as directives de interface paravam de se encontrar.
  it('o indice do runtime encontra elementos ja limpos', async () => {
    const root = mount('<div><b v-text="a"></b><b v-text="b"></b></div>', { a: 1, b: 2 });
    await settle();

    expect(root.querySelectorAll('[v-text]').length).toBe(0);
    expect(queryDirective(root, 'text').length).toBe(2);
  });

  it('o valor original continua legivel pelo cache', async () => {
    const root = mount('<div v-data="{ n: 1 }"><b v-text="n"></b></div>');
    await settle();

    const alvo = root.querySelector('b')!;
    expect(alvo.hasAttribute('v-text')).toBe(false);
    expect(readAttr(alvo, 'v-text')).toBe('n');
  });
});

describe('remocao interna nao desmonta o efeito', () => {
  // Sintoma: quando um v-for era criado depois que o observador ja estava
  // ativo, a remocao do elemento modelo era lida como saida de tela e o
  // efeito da lista era parado logo apos ser criado.
  it('v-for continua reagindo quando montado dentro de v-if', async () => {
    const dados = reactive({ mostrar: false, itens: ['a'] });
    const root = document.createElement('div');
    root.innerHTML = '<div v-if="mostrar"><span v-for="i in itens" v-text="i"></span></div>';
    document.body.appendChild(root);
    walk(root, new Scope(dados));

    dados.mostrar = true;
    await settle();
    expect(root.querySelectorAll('span').length).toBe(1);

    dados.itens.push('b');
    await settle();
    expect(root.querySelectorAll('span').length).toBe(2);

    dados.itens.push('c');
    await settle();
    expect(root.querySelectorAll('span').length).toBe(3);
  });
});

describe('desmontagem', () => {
  it('destroy limpa o indice de directives', async () => {
    const root = mount('<b v-text="x"></b>', { x: 1 });
    await settle();
    expect(queryDirective(document.body, 'text').length).toBeGreaterThan(0);

    destroy(root);
    root.remove();
    expect(queryDirective(document.body, 'text').length).toBe(0);
  });
});

describe('v-for dentro de ramos condicionais', () => {
  // Sintoma: a lista dentro de um v-else renderizava uma vez e depois parava.
  // Causa: a caminhada do elemento pai ja tinha o ramo na lista de filhos e
  // entrava nele depois que o v-if o havia retirado do documento, o que
  // inicializava o v-for dentro do proprio modelo e o corrompia.
  it('a lista continua reagindo depois de alternar o ramo', async () => {
    const dados = reactive({ vazio: false, itens: ['a'] });
    const root = document.createElement('div');
    root.innerHTML =
      '<p v-if="vazio">nada</p>' + '<ul v-else><li v-for="i in itens" v-text="i"></li></ul>';
    document.body.appendChild(root);
    walk(root, new Scope(dados));
    await settle();
    expect(root.querySelectorAll('li').length).toBe(1);

    dados.itens.push('b');
    await settle();
    expect(root.querySelectorAll('li').length).toBe(2);

    dados.vazio = true;
    await settle();
    expect(root.querySelectorAll('li').length).toBe(0);

    dados.vazio = false;
    await settle();
    expect(root.querySelectorAll('li').length).toBe(2);

    dados.itens.push('c');
    await settle();
    expect(root.querySelectorAll('li').length).toBe(3);
  });

  it('funciona no meio de uma cadeia com v-else-if', async () => {
    const dados = reactive({ modo: 'lista', itens: ['x', 'y'] });
    const root = document.createElement('div');
    root.innerHTML =
      '<p v-if="modo === \'carregando\'">carregando</p>' +
      '<ul v-else-if="modo === \'lista\'"><li v-for="i in itens" v-text="i"></li></ul>' +
      '<p v-else>outro</p>';
    document.body.appendChild(root);
    walk(root, new Scope(dados));
    await settle();
    expect(root.querySelectorAll('li').length).toBe(2);

    dados.modo = 'carregando';
    await settle();
    dados.modo = 'lista';
    await settle();
    dados.itens.push('z');
    await settle();
    expect(root.querySelectorAll('li').length).toBe(3);
  });

  it('o modelo guardado nao e alterado pela renderizacao', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p v-if="off">a</p><ul v-else><li v-for="i in itens" v-text="i"></li></ul>';
    const original = root.querySelector('ul')!;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({ off: false, itens: ['um', 'dois'] })));
    await settle();

    expect(original.innerHTML).toContain('v-for');
    expect(original.querySelectorAll('li').length).toBe(1);
  });
});
