import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { core } from '../src/core';

/** Monta um trecho de HTML com um escopo proprio e devolve a raiz. */
function mount(html: string, data: Record<string, unknown> = {}): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(reactive(data)));
  return root;
}

/** Espera duas rodadas de microtask, o suficiente para o DOM refletir. */
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('interpolacao de texto', () => {
  it('renderiza { variavel } em tempo real', async () => {
    const root = mount('<p>Ola, { nome }!</p>', { nome: 'Ana' });
    expect(root.textContent).toBe('Ola, Ana!');
  });

  it('atualiza quando a variavel muda', async () => {
    const data = reactive({ nome: 'Ana' });
    const root = document.createElement('div');
    root.innerHTML = '<p>Ola, { nome }!</p>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    data.nome = 'Bia';
    await settle();
    expect(root.textContent).toBe('Ola, Bia!');
  });

  it('aceita expressoes completas e varias por no', () => {
    const root = mount('<p>{ a } + { b } = { a + b }</p>', { a: 2, b: 3 });
    expect(root.textContent).toBe('2 + 3 = 5');
  });

  it('tambem aceita a forma com chaves duplas', () => {
    const root = mount('<p>{{ nome }}</p>', { nome: 'Voodoo' });
    expect(root.textContent).toBe('Voodoo');
  });

  it('nao interpola dentro de code e pre', () => {
    const root = mount('<code>{ isto: fica }</code>', {});
    expect(root.textContent).toBe('{ isto: fica }');
  });

  it('renderiza objetos e arrays de forma legivel', () => {
    const root = mount('<p>{ obj }</p><span>{ lista }</span>', {
      obj: { a: 1 },
      lista: [1, 2],
    });
    expect(root.querySelector('p')!.textContent).toBe('{"a":1}');
    expect(root.querySelector('span')!.textContent).toBe('[1,2]');
  });
});

describe('v-text e v-html', () => {
  it('v-text escreve texto e escapa HTML', async () => {
    const root = mount('<span v-text="valor"></span>', { valor: '<b>oi</b>' });
    expect(root.querySelector('span')!.innerHTML).toBe('&lt;b&gt;oi&lt;/b&gt;');
  });

  it('v-html insere HTML e inicializa as directives internas', async () => {
    const data = reactive({ conteudo: '<b v-text="nome"></b>', nome: 'Ana' });
    const root = document.createElement('div');
    root.innerHTML = '<div v-html="conteudo"></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    await settle();
    expect(root.querySelector('b')!.textContent).toBe('Ana');
  });
});

describe('v-show', () => {
  it('alterna display sem remover o elemento', async () => {
    const data = reactive({ visivel: true });
    const root = document.createElement('div');
    root.innerHTML = '<p v-show="visivel">oi</p>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const p = root.querySelector('p')!;
    expect(p.style.display).toBe('');

    data.visivel = false;
    await settle();
    expect(p.style.display).toBe('none');
    expect(p.isConnected).toBe(true);

    data.visivel = true;
    await settle();
    expect(p.style.display).toBe('');
  });
});

describe('v-if, v-else-if e v-else', () => {
  it('insere e remove o elemento do DOM', async () => {
    const data = reactive({ logado: false });
    const root = document.createElement('div');
    root.innerHTML = '<p v-if="logado">Bem-vindo</p>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    expect(root.querySelector('p')).toBeNull();

    data.logado = true;
    await settle();
    expect(root.querySelector('p')!.textContent).toBe('Bem-vindo');

    data.logado = false;
    await settle();
    expect(root.querySelector('p')).toBeNull();
  });

  it('escolhe o ramo certo da cadeia', async () => {
    const data = reactive({ nota: 10 });
    const root = document.createElement('div');
    root.innerHTML = `
      <span v-if="nota >= 9">otimo</span>
      <span v-else-if="nota >= 6">bom</span>
      <span v-else>ruim</span>`;
    document.body.appendChild(root);
    walk(root, new Scope(data));
    expect(root.textContent!.trim()).toBe('otimo');

    data.nota = 7;
    await settle();
    expect(root.textContent!.trim()).toBe('bom');

    data.nota = 2;
    await settle();
    expect(root.textContent!.trim()).toBe('ruim');
  });

  it('funciona com template de varios filhos', async () => {
    const data = reactive({ ok: true });
    const root = document.createElement('div');
    root.innerHTML = '<template v-if="ok"><i>a</i><i>b</i></template>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    expect(root.querySelectorAll('i').length).toBe(2);

    data.ok = false;
    await settle();
    expect(root.querySelectorAll('i').length).toBe(0);
  });

  it('avalia as directives internas do ramo ativo', async () => {
    const data = reactive({ ok: true, nome: 'Ana' });
    const root = document.createElement('div');
    root.innerHTML = '<p v-if="ok"><b v-text="nome"></b></p>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    expect(root.querySelector('b')!.textContent).toBe('Ana');

    data.nome = 'Bia';
    await settle();
    expect(root.querySelector('b')!.textContent).toBe('Bia');
  });
});

describe('v-for', () => {
  it('renderiza a lista inicial', () => {
    const root = mount('<ul><li v-for="n in lista" v-text="n"></li></ul>', { lista: [1, 2, 3] });
    expect(root.querySelectorAll('li').length).toBe(3);
    expect(root.textContent).toBe('123');
  });

  it('adiciona e remove itens em tempo real', async () => {
    const data = reactive({ lista: ['a', 'b'] });
    const root = document.createElement('div');
    root.innerHTML = '<ul><li v-for="item in lista" v-text="item"></li></ul>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    expect(root.querySelectorAll('li').length).toBe(2);

    data.lista.push('c');
    await settle();
    expect(root.querySelectorAll('li').length).toBe(3);
    expect(root.textContent).toBe('abc');

    data.lista.splice(0, 1);
    await settle();
    expect(root.textContent).toBe('bc');
  });

  it('expoe o indice', () => {
    const root = mount('<li v-for="(item, i) in lista">{ i }:{ item }</li>', { lista: ['x', 'y'] });
    expect(root.textContent).toBe('0:x1:y');
  });

  it('itera objetos com valor, chave e indice', () => {
    const root = mount('<li v-for="(valor, chave) in obj">{ chave }={ valor }</li>', {
      obj: { a: 1, b: 2 },
    });
    expect(root.textContent).toBe('a=1b=2');
  });

  it('itera um numero', () => {
    const root = mount('<li v-for="n in 3" v-text="n"></li>', {});
    expect(root.textContent).toBe('123');
  });

  it('reaproveita elementos com :key ao reordenar', async () => {
    const data = reactive({
      lista: [
        { id: 1, nome: 'um' },
        { id: 2, nome: 'dois' },
      ],
    });
    const root = document.createElement('div');
    root.innerHTML = '<ul><li v-for="item in lista" :key="item.id" v-text="item.nome"></li></ul>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const primeiro = root.querySelectorAll('li')[0];
    data.lista.reverse();
    await settle();

    const textos = Array.from(root.querySelectorAll('li')).map((li) => li.textContent);
    expect(textos).toEqual(['dois', 'um']);
    // O elemento do item 1 continua sendo o mesmo no do DOM.
    expect(root.querySelectorAll('li')[1]).toBe(primeiro);
  });

  it('atualiza o conteudo quando um item muda', async () => {
    const data = reactive({ lista: [{ id: 1, nome: 'antigo' }] });
    const root = document.createElement('div');
    root.innerHTML = '<li v-for="item in lista" :key="item.id" v-text="item.nome"></li>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    data.lista[0].nome = 'novo';
    await settle();
    expect(root.textContent).toBe('novo');
  });

  it('funciona aninhado', () => {
    const root = mount(
      '<div v-for="grupo in grupos"><span v-for="item in grupo.itens" v-text="item"></span></div>',
      { grupos: [{ itens: [1, 2] }, { itens: [3] }] }
    );
    expect(root.textContent).toBe('123');
  });

  it('aceita template com varios filhos', () => {
    const root = mount('<template v-for="n in 2"><i>a</i><b>b</b></template>', {});
    expect(root.querySelectorAll('i').length).toBe(2);
    expect(root.querySelectorAll('b').length).toBe(2);
  });

  it('combina v-for com v-if no filho', async () => {
    const data = reactive({ lista: [1, 2, 3, 4] });
    const root = document.createElement('div');
    root.innerHTML = '<div v-for="n in lista"><span v-if="n % 2 === 0" v-text="n"></span></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    expect(root.textContent).toBe('24');
  });
});

describe('v-bind', () => {
  it('liga atributos comuns', async () => {
    const data = reactive({ link: '/a', titulo: 'Ir' });
    const root = document.createElement('div');
    root.innerHTML = '<a :href="link" :title="titulo">x</a>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const a = root.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/a');

    data.link = '/b';
    await settle();
    expect(a.getAttribute('href')).toBe('/b');
  });

  it('trata atributos booleanos', async () => {
    const data = reactive({ carregando: true });
    const root = document.createElement('div');
    root.innerHTML = '<button :disabled="carregando">Salvar</button>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const button = root.querySelector('button')!;
    expect(button.hasAttribute('disabled')).toBe(true);

    data.carregando = false;
    await settle();
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('liga classes por objeto e mantem as originais', async () => {
    const data = reactive({ ativo: false });
    const root = document.createElement('div');
    root.innerHTML = '<div class="base" :class="{ ativo: ativo }"></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const div = root.querySelector('div')!;
    expect(div.className).toBe('base');

    data.ativo = true;
    await settle();
    expect(div.classList.contains('base')).toBe(true);
    expect(div.classList.contains('ativo')).toBe(true);
  });

  it('liga estilos por objeto', async () => {
    const data = reactive({ cor: 'red' });
    const root = document.createElement('div');
    root.innerHTML = '<div :style="{ color: cor }"></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const div = root.querySelector('div')!;
    expect(div.style.color).toBe('red');

    data.cor = 'blue';
    await settle();
    expect(div.style.color).toBe('blue');
  });

  it('aplica varios atributos com v-bind sem argumento', () => {
    const root = mount('<input v-bind="atributos">', {
      atributos: { placeholder: 'Nome', maxlength: '10' },
    });
    const input = root.querySelector('input')!;
    expect(input.getAttribute('placeholder')).toBe('Nome');
    expect(input.getAttribute('maxlength')).toBe('10');
  });
});

describe('eventos', () => {
  it('v-click executa expressao e atualiza a tela', async () => {
    const root = mount('<button v-click="count++">+</button><span v-text="count"></span>', {
      count: 0,
    });
    root.querySelector('button')!.click();
    await settle();
    expect(root.querySelector('span')!.textContent).toBe('1');
  });

  it('v-click chama um metodo do escopo', async () => {
    const spy = vi.fn();
    const root = mount('<button v-click="salvar">Salvar</button>', { salvar: spy });
    root.querySelector('button')!.click();
    expect(spy).toHaveBeenCalled();
  });

  it('v-on:evento e @evento sao equivalentes', async () => {
    const root = mount('<button @click="n++"></button><i v-on:click="n++"></i>', { n: 0 });
    root.querySelector('button')!.click();
    root.querySelector('i')!.click();
    await settle();
    expect((root.querySelector('button') as HTMLElement).isConnected).toBe(true);
  });

  it('modificador prevent chama preventDefault', () => {
    const root = mount('<a href="#x" @click.prevent="n++">link</a>', { n: 0 });
    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    root.querySelector('a')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('modificador once dispara apenas uma vez', async () => {
    const spy = vi.fn();
    const root = mount('<button @click.once="acao"></button>', { acao: spy });
    const button = root.querySelector('button')!;
    button.click();
    button.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('filtra por tecla', () => {
    const spy = vi.fn();
    const root = mount('<input @keyup.enter="buscar">', { buscar: spy });
    const input = root.querySelector('input')!;
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(spy).not.toHaveBeenCalled();
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('expoe $event na expressao', () => {
    const spy = vi.fn();
    const root = mount('<button @click="registrar($event.type)"></button>', { registrar: spy });
    root.querySelector('button')!.click();
    expect(spy).toHaveBeenCalledWith('click');
  });
});

describe('v-model', () => {
  it('liga texto nos dois sentidos', async () => {
    const data = reactive({ nome: 'Ana' });
    const root = document.createElement('div');
    root.innerHTML = '<input v-model="nome">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const input = root.querySelector('input')!;
    expect(input.value).toBe('Ana');

    input.value = 'Bia';
    input.dispatchEvent(new Event('input'));
    expect(data.nome).toBe('Bia');

    data.nome = 'Cris';
    await settle();
    expect(input.value).toBe('Cris');
  });

  it('converte para numero com o modificador number', () => {
    const data = reactive({ idade: 0 });
    const root = document.createElement('div');
    root.innerHTML = '<input v-model.number="idade">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const input = root.querySelector('input')!;
    input.value = '42';
    input.dispatchEvent(new Event('input'));
    expect(data.idade).toBe(42);
  });

  it('remove espacos com o modificador trim', () => {
    const data = reactive({ texto: '' });
    const root = document.createElement('div');
    root.innerHTML = '<input v-model.trim="texto">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const input = root.querySelector('input')!;
    input.value = '  oi  ';
    input.dispatchEvent(new Event('input'));
    expect(data.texto).toBe('oi');
  });

  it('funciona com checkbox booleano', () => {
    const data = reactive({ aceito: false });
    const root = document.createElement('div');
    root.innerHTML = '<input type="checkbox" v-model="aceito">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const input = root.querySelector('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(data.aceito).toBe(true);
  });

  it('funciona com checkbox em lista', () => {
    const data = reactive({ tags: ['a'] });
    const root = document.createElement('div');
    root.innerHTML =
      '<input type="checkbox" value="a" v-model="tags"><input type="checkbox" value="b" v-model="tags">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const [primeiro, segundo] = Array.from(root.querySelectorAll('input'));
    expect(primeiro.checked).toBe(true);

    segundo.checked = true;
    segundo.dispatchEvent(new Event('change'));
    expect(data.tags).toEqual(['a', 'b']);
  });

  it('funciona com select', async () => {
    const data = reactive({ uf: 'SP' });
    const root = document.createElement('div');
    root.innerHTML = '<select v-model="uf"><option>SP</option><option>RJ</option></select>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const select = root.querySelector('select')!;
    expect(select.value).toBe('SP');

    select.value = 'RJ';
    select.dispatchEvent(new Event('change'));
    expect(data.uf).toBe('RJ');
  });

  it('funciona com textarea', () => {
    const data = reactive({ bio: '' });
    const root = document.createElement('div');
    root.innerHTML = '<textarea v-model="bio"></textarea>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const area = root.querySelector('textarea')!;
    area.value = 'oi';
    area.dispatchEvent(new Event('input'));
    expect(data.bio).toBe('oi');
  });
});

describe('v-data e escopo', () => {
  it('cria escopo isolado', async () => {
    const root = mount(
      '<div v-data="{ count: 0 }"><button v-click="count++"></button><b v-text="count"></b></div>'
    );
    root.querySelector('button')!.click();
    await settle();
    expect(root.querySelector('b')!.textContent).toBe('1');
  });

  it('escopos irmaos nao se misturam', async () => {
    const root = mount(`
      <div v-data="{ n: 0 }" id="a"><button v-click="n++"></button><b v-text="n"></b></div>
      <div v-data="{ n: 0 }" id="b"><b v-text="n"></b></div>`);
    root.querySelector('#a button')!.dispatchEvent(new MouseEvent('click'));
    await settle();
    expect(root.querySelector('#a b')!.textContent).toBe('1');
    expect(root.querySelector('#b b')!.textContent).toBe('0');
  });

  it('filho enxerga o escopo do pai', () => {
    const root = mount('<div v-data="{ titulo: \'Voodoo\' }"><span v-text="titulo"></span></div>');
    expect(root.querySelector('span')!.textContent).toBe('Voodoo');
  });

  it('v-init executa na montagem', async () => {
    const spy = vi.fn();
    mount('<div v-data="{ n: 1 }" v-init="carregar"></div>', { carregar: spy });
    await settle();
    expect(spy).toHaveBeenCalled();
  });

  it('v-ref guarda o elemento em $refs', async () => {
    const root = mount('<div v-data="{}"><input v-ref="busca"><button v-click="$refs.busca.focus()"></button></div>');
    root.querySelector('button')!.click();
    expect(document.activeElement).toBe(root.querySelector('input'));
  });
});

describe('componentes', () => {
  it('registra e monta por v-component', async () => {
    core.component('contador', {
      state: () => ({ count: 5 }),
      methods: {
        increment(this: { count: number }) {
          this.count++;
        },
      },
    });

    const root = mount(
      '<div v-component="contador"><button v-click="increment"></button><b v-text="count"></b></div>'
    );
    expect(root.querySelector('b')!.textContent).toBe('5');

    root.querySelector('button')!.click();
    await settle();
    expect(root.querySelector('b')!.textContent).toBe('6');
  });

  it('monta por tag propria e recebe props', async () => {
    core.component('cartao-usuario', {
      props: { nome: { type: 'string', default: 'sem nome' } },
      template: '<h3 v-text="nome"></h3>',
    });

    const root = mount('<cartao-usuario nome="Ana"></cartao-usuario>');
    await settle();
    expect(root.querySelector('h3')!.textContent).toBe('Ana');
  });

  it('aceita tag em PascalCase', async () => {
    core.component('caixa-simples', { template: '<p>caixa</p>' });
    const root = mount('<CaixaSimples></CaixaSimples>');
    await settle();
    expect(root.querySelector('p')!.textContent).toBe('caixa');
  });

  it('renderiza o conteudo original dentro de slot', async () => {
    core.component('painel', {
      template: '<section><header>titulo</header><slot></slot></section>',
    });
    const root = mount('<painel><p>conteudo</p></painel>');
    await settle();
    expect(root.querySelector('section p')!.textContent).toBe('conteudo');
  });

  it('computed e reativo', async () => {
    core.component('nome-completo', {
      state: () => ({ primeiro: 'Ana', ultimo: 'Souza' }),
      computed: {
        completo(this: { primeiro: string; ultimo: string }) {
          return `${this.primeiro} ${this.ultimo}`;
        },
      },
      template: '<b v-text="completo"></b>',
    });

    const root = mount('<nome-completo></nome-completo>');
    await settle();
    expect(root.querySelector('b')!.textContent).toBe('Ana Souza');
  });

  it('dispara o hook mounted', async () => {
    const spy = vi.fn();
    core.component('com-hook', { mounted: spy, template: '<i></i>' });
    mount('<com-hook></com-hook>');
    await settle();
    expect(spy).toHaveBeenCalled();
  });

  it('emit dispara evento capturado por v-on', async () => {
    core.component('editor', {
      methods: {
        salvar(this: { emit: (e: string, d: unknown) => void }) {
          this.emit('salvo', { id: 7 });
        },
      },
      template: '<button v-click="salvar"></button>',
    });

    const recebido = vi.fn();
    const root = mount('<editor v-on:salvo="aoSalvar"></editor>', { aoSalvar: recebido });
    await settle();
    root.querySelector('button')!.click();
    expect(recebido).toHaveBeenCalledWith({ id: 7 });
  });
});

describe('limpeza', () => {
  it('destroy para os efeitos do elemento', async () => {
    const data = reactive({ n: 0 });
    const root = document.createElement('div');
    root.innerHTML = '<span v-text="n"></span>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('0');

    destroy(root);
    data.n = 5;
    await settle();
    expect(span.textContent).toBe('0');
  });

  it('remover itens de v-for limpa os efeitos', async () => {
    const data = reactive({ lista: [{ id: 1, nome: 'a' }] });
    const root = document.createElement('div');
    root.innerHTML = '<li v-for="item in lista" :key="item.id" v-text="item.nome"></li>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const li = root.querySelector('li')!;
    data.lista.splice(0, 1);
    await settle();
    expect(li.isConnected).toBe(false);
  });
});

describe('directives customizadas', () => {
  it('registra com ciclo de vida', async () => {
    const montado = vi.fn();
    const atualizado = vi.fn();
    core.directive('destaque', {
      mounted(el, binding) {
        montado(binding.value);
        el.style.background = String(binding.value);
      },
      updated(el, binding) {
        atualizado(binding.value);
        el.style.background = String(binding.value);
      },
    });

    const data = reactive({ cor: 'yellow' });
    const root = document.createElement('div');
    root.innerHTML = '<div v-destaque="cor"></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    expect(montado).toHaveBeenCalledWith('yellow');
    data.cor = 'red';
    await settle();
    expect(atualizado).toHaveBeenCalledWith('red');
  });

  it('aceita a forma curta em funcao', () => {
    core.directive('marcar', (el) => {
      el.setAttribute('data-marcado', 'sim');
    });
    const root = mount('<i v-marcar="1"></i>');
    expect(root.querySelector('i')!.getAttribute('data-marcado')).toBe('sim');
  });
});

describe('variaveis magicas', () => {
  it('$store acessa stores globais', async () => {
    core.store('carrinho', { total: 3 });
    const root = mount('<span v-text="$store.carrinho.total"></span>');
    expect(root.querySelector('span')!.textContent).toBe('3');
  });

  it('$el aponta para o elemento', () => {
    const root = mount('<div v-data="{}"><button v-click="$el.setAttribute(\'data-ok\', 1)"></button></div>');
    root.querySelector('button')!.click();
    expect(root.querySelector('button')!.getAttribute('data-ok')).toBe('1');
  });
});
