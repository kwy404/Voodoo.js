/**
 * `:atributo` binds any attribute of any tag to the state. These tests cover
 * the cases people write most often day to day.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import '../src/core';

function montar(html: string, dados: Record<string, unknown>) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 3) {
  for (let i = 0; i < n; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe(':atributo on any tag', () => {
  it('the placeholder of an input changes with the state', async () => {
    const { root, estado } = montar('<input :placeholder="dica">', { dica: 'Escreva o nome' });
    const input = root.querySelector('input')!;
    expect(input.getAttribute('placeholder')).toBe('Escreva o nome');

    (estado as any).dica = 'Agora o e-mail';
    await settle();
    expect(input.getAttribute('placeholder')).toBe('Agora o e-mail');
  });

  it('accepts a full expression, not just a variable', async () => {
    const { root, estado } = montar(
      '<input :placeholder="\'Buscar entre \' + total + \' itens\'">',
      { total: 12 }
    );
    expect(root.querySelector('input')!.getAttribute('placeholder')).toBe('Buscar entre 12 itens');

    (estado as any).total = 40;
    await settle();
    expect(root.querySelector('input')!.getAttribute('placeholder')).toBe('Buscar entre 40 itens');
  });

  it('works with accessibility attributes and data attributes', async () => {
    const { root, estado } = montar(
      '<div :aria-label="rotulo" :data-estado="situacao" :title="dica"></div>',
      { rotulo: 'Menu', situacao: 'aberto', dica: 'Clique para fechar' }
    );
    const div = root.querySelector('div')!;
    expect(div.getAttribute('aria-label')).toBe('Menu');
    expect(div.getAttribute('data-estado')).toBe('aberto');
    expect(div.getAttribute('title')).toBe('Clique para fechar');

    (estado as any).situacao = 'fechado';
    await settle();
    expect(div.getAttribute('data-estado')).toBe('fechado');
  });

  it('binds media attributes and link attributes', async () => {
    const { root, estado } = montar(
      '<a :href="url" :target="alvo"><img :src="foto" :alt="descricao" :width="largura"></a>',
      { url: '/produto/1', alvo: '_blank', foto: '/a.jpg', descricao: 'Foto', largura: 200 }
    );
    expect(root.querySelector('a')!.getAttribute('href')).toBe('/produto/1');
    expect(root.querySelector('img')!.getAttribute('src')).toBe('/a.jpg');
    expect(root.querySelector('img')!.getAttribute('width')).toBe('200');

    (estado as any).foto = '/b.jpg';
    await settle();
    expect(root.querySelector('img')!.getAttribute('src')).toBe('/b.jpg');
  });

  it('a boolean attribute disappears when the value is false', async () => {
    const { root, estado } = montar(
      '<button :disabled="carregando"></button><input :readonly="travado"><details :open="aberto"></details>',
      { carregando: true, travado: true, aberto: true }
    );
    expect(root.querySelector('button')!.hasAttribute('disabled')).toBe(true);
    expect(root.querySelector('details')!.hasAttribute('open')).toBe(true);

    (estado as any).carregando = false;
    (estado as any).travado = false;
    (estado as any).aberto = false;
    await settle();
    expect(root.querySelector('button')!.hasAttribute('disabled')).toBe(false);
    expect(root.querySelector('input')!.hasAttribute('readonly')).toBe(false);
    expect(root.querySelector('details')!.hasAttribute('open')).toBe(false);
  });

  it('works on custom tags and on svg elements', async () => {
    const { root, estado } = montar(
      '<minha-tag :dado="valor"></minha-tag><svg><circle :r="raio" :fill="cor"></circle></svg>',
      { valor: 'x', raio: 10, cor: 'red' }
    );
    expect(root.querySelector('minha-tag')!.getAttribute('dado')).toBe('x');
    expect(root.querySelector('circle')!.getAttribute('r')).toBe('10');

    (estado as any).raio = 25;
    await settle();
    expect(root.querySelector('circle')!.getAttribute('r')).toBe('25');
  });

  it('v-bind with no argument applies a whole object', async () => {
    const { root } = montar('<input v-bind="atributos">', {
      atributos: { placeholder: 'Nome', maxlength: '10', 'aria-label': 'Campo de nome' },
    });
    const input = root.querySelector('input')!;
    expect(input.getAttribute('placeholder')).toBe('Nome');
    expect(input.getAttribute('maxlength')).toBe('10');
    expect(input.getAttribute('aria-label')).toBe('Campo de nome');
  });

  it('inside a v-for each item has its own value', async () => {
    const { root } = montar(
      '<input v-for="c in campos" :key="c.id" :placeholder="c.dica" :name="c.nome">',
      {
        campos: [
          { id: 1, dica: 'Seu nome', nome: 'nome' },
          { id: 2, dica: 'Seu e-mail', nome: 'email' },
        ],
      }
    );
    const inputs = root.querySelectorAll('input');
    expect(inputs[0].getAttribute('placeholder')).toBe('Seu nome');
    expect(inputs[1].getAttribute('placeholder')).toBe('Seu e-mail');
    expect(inputs[1].getAttribute('name')).toBe('email');
  });

  it('a leading dot writes to the property instead of the attribute', async () => {
    const { root } = montar('<input .value="texto">', { texto: 'direto na propriedade' });
    expect((root.querySelector('input') as HTMLInputElement).value).toBe('direto na propriedade');
  });
});
