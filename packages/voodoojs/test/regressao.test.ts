/**
 * Regression tests: each case here was born from a defect found while running
 * the library in a real browser. The comment on each block explains the
 * original symptom, so that the fix is not undone by accident.
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

describe('interpolation inside code blocks', () => {
  // Symptom: the landing page showed code examples and the library tried to
  // evaluate `{ n: 0 }` as an expression, filling the console with syntax errors.
  it('does not interpolate inside pre', () => {
    const root = mount('<pre>&lt;div v-data="{ n: 0 }"&gt;</pre>');
    expect(root.textContent).toContain('{ n: 0 }');
  });

  it('does not interpolate inside code', () => {
    const root = mount('<code>{ nome: "Vudu" }</code>');
    expect(root.textContent).toBe('{ nome: "Vudu" }');
  });

  it('does not interpolate when the code has syntax highlighting', () => {
    // With highlighting, the text sits inside a span, and the direct parent is
    // no longer the pre. The check has to climb through the ancestors.
    const root = mount('<pre><code><span class="tok">{ a: 1, b: 2 }</span></code></pre>');
    expect(root.textContent).toBe('{ a: 1, b: 2 }');
  });

  it('still interpolates outside code blocks', () => {
    const root = mount('<p>Valor: { n }</p>', { n: 7 });
    expect(root.textContent).toBe('Valor: 7');
  });
});

describe('scope of the attributes on a component tag', () => {
  // Symptom: `@salvo="ultimo = $event"` wrote inside the component instead of
  // into the state of whoever wrote the tag, so the parent never saw the value.
  it('evaluates in the scope of whoever wrote the tag', async () => {
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

  it('$event carries the emit payload and $rawEvent carries the raw event', async () => {
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

describe('component registered after the page has loaded', () => {
  // Symptom: with the library loaded from a CDN with defer, the application
  // script registers components after the first walk, and the tags sat still
  // on the screen without ever mounting.
  it('mounts the tags that were already on the page', async () => {
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

  it('keeps the listeners declared on the tag after the late mount', async () => {
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

describe('store created after rendering', () => {
  // Symptom: the screen read `$store.carrinho` before the store existed and it
  // never updated when the store was created.
  it('updates whoever was already reading the magic variable', async () => {
    const root = mount('<span v-text="$store.tardio ? $store.tardio.total : 0"></span>');
    expect(root.querySelector('span')!.textContent).toBe('0');

    core.store('tardio', { total: 99 });
    await settle();

    expect(root.querySelector('span')!.textContent).toBe('99');
  });
});

describe('attribute cleanup', () => {
  // Symptom: after the HTML was cleaned up, selectors such as `[v-tab]` stopped
  // matching and the interface directives stopped finding each other.
  it('the runtime index finds elements that have already been cleaned', async () => {
    const root = mount('<div><b v-text="a"></b><b v-text="b"></b></div>', { a: 1, b: 2 });
    await settle();

    expect(root.querySelectorAll('[v-text]').length).toBe(0);
    expect(queryDirective(root, 'text').length).toBe(2);
  });

  it('the original value is still readable through the cache', async () => {
    const root = mount('<div v-data="{ n: 1 }"><b v-text="n"></b></div>');
    await settle();

    const alvo = root.querySelector('b')!;
    expect(alvo.hasAttribute('v-text')).toBe(false);
    expect(readAttr(alvo, 'v-text')).toBe('n');
  });
});

describe('an internal removal does not tear down the effect', () => {
  // Symptom: when a v-for was created after the observer was already active,
  // the removal of the template element was read as leaving the screen and the
  // list effect was stopped right after being created.
  it('v-for keeps reacting when mounted inside a v-if', async () => {
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

describe('teardown', () => {
  it('destroy clears the directive index', async () => {
    const root = mount('<b v-text="x"></b>', { x: 1 });
    await settle();
    expect(queryDirective(document.body, 'text').length).toBeGreaterThan(0);

    destroy(root);
    root.remove();
    expect(queryDirective(document.body, 'text').length).toBe(0);
  });
});

describe('v-for inside conditional branches', () => {
  // Symptom: the list inside a v-else rendered once and then stopped.
  // Cause: the walk of the parent element already had the branch in its list of
  // children and stepped into it after the v-if had taken it out of the
  // document, which initialized the v-for inside the template itself and
  // corrupted it.
  it('the list keeps reacting after the branch is toggled', async () => {
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

  it('works in the middle of a chain with v-else-if', async () => {
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

  it('the stored template is not altered by the rendering', async () => {
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
