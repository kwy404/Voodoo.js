import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import { core } from '../src/core';
import '../src/directives/forms';
import '../src/directives/ui';
import { validate, clearErrors } from '../src/forms/validate';
import '../src/forms/mask';

async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
  await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('tres v-if independentes', () => {
  it('cada bloco mantem a propria interpolacao viva', async () => {
    const data = reactive({ carregando: true, itens: [] as any[], busca: '' });
    const root = document.createElement('div');
    root.innerHTML = `
      <div v-if="carregando" class="a">carregando</div>
      <div v-if="!carregando && !itens.length" class="b">nada para "{ busca }"</div>
      <div v-if="!carregando && itens.length" class="c">{ itens.length } achados</div>`;
    document.body.appendChild(root);
    walk(root, new Scope(data));

    expect(root.querySelector('.a')).not.toBeNull();
    expect(root.querySelector('.b')).toBeNull();

    data.carregando = false;
    data.busca = 'ana';
    await settle();
    expect(root.querySelector('.b')!.textContent).toBe('nada para "ana"');

    data.busca = 'bia';
    await settle();
    expect(root.querySelector('.b')!.textContent).toBe('nada para "bia"');

    data.itens = [{ id: 1 }, { id: 2 }];
    await settle();
    expect(root.querySelector('.b')).toBeNull();
    expect(root.querySelector('.c')!.textContent).toBe('2 achados');
  });
});

describe('componente com mascara, validacao e refs', () => {
  it('mascara alimenta o v-model e o v-match resolve pelo id', async () => {
    core.component('teste-crud', {
      state: function (this: any) {
        return { form: { cpf: '', telefone: '', senha: '', confirmacao: '' } };
      },
      computed: {
        cpfLimpo: function (this: any) {
          return this.form.cpf.replace(/\D/g, '');
        },
      },
      methods: {
        preencher: function (this: any) {
          this.form.cpf = '529.982.247-25';
          this.form.telefone = '(11) 98888-7766';
        },
      },
    });

    const root = document.createElement('div');
    root.innerHTML = `
      <section v-component="teste-crud">
        <form v-ref="formulario" v-validate>
          <input name="cpf" type="text" v-model="form.cpf" v-mask="cpf" v-required v-cpf>
          <input name="telefone" type="text" v-model="form.telefone" v-mask="phone" v-required v-phone>
          <input id="t-senha" name="senha" type="password" v-model="form.senha" v-required v-minlength="8">
          <input id="t-conf" name="confirmacao" type="password" v-model="form.confirmacao" v-required v-match="#t-senha">
        </form>
        <p class="saida">{ form.cpf } / { form.telefone } / { cpfLimpo }</p>
      </section>`;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    await settle();

    const form = root.querySelector('form') as HTMLFormElement;
    const cpf = root.querySelector('[name="cpf"]') as HTMLInputElement;
    const tel = root.querySelector('[name="telefone"]') as HTMLInputElement;
    const senha = root.querySelector('#t-senha') as HTMLInputElement;
    const conf = root.querySelector('#t-conf') as HTMLInputElement;

    // Digitacao crua entra formatada e volta formatada para o estado.
    cpf.value = '52998224725';
    cpf.dispatchEvent(new Event('input', { bubbles: true }));
    tel.value = '11988887766';
    tel.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(cpf.value).toBe('529.982.247-25');
    expect(root.querySelector('.saida')!.textContent).toContain('529.982.247-25');
    expect(root.querySelector('.saida')!.textContent).toContain('(11) 98888-7766');

    // Formulario invalido: senha curta e confirmacao diferente.
    senha.value = '123';
    senha.dispatchEvent(new Event('input', { bubbles: true }));
    conf.value = '456';
    conf.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    const ruim = (await validate(form)) as any;
    expect(ruim.valid).toBe(false);
    expect(Object.keys(ruim.errors)).toContain('senha');
    expect(Object.keys(ruim.errors)).toContain('confirmacao');
    expect(form.querySelectorAll('.v-field-error').length).toBeGreaterThan(0);

    // Agora tudo certo.
    senha.value = 'segredo123';
    senha.dispatchEvent(new Event('input', { bubbles: true }));
    conf.value = 'segredo123';
    conf.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    const bom = (await validate(form)) as any;
    expect(bom.valid).toBe(true);

    clearErrors(form);
    expect(form.querySelectorAll('.v-field-error').length).toBe(0);
  });

  it('escrever no estado atravessa a mascara e o reset limpa o campo', async () => {
    core.component('teste-reset', {
      state: function () {
        return { cpf: '', telefone: '' };
      },
      methods: {
        preencher: function (this: any) {
          this.cpf = '390.533.447-05';
          this.telefone = '(21) 3344-5566';
        },
        limpar: function (this: any) {
          this.cpf = '';
          this.telefone = '';
        },
      },
    });

    const root = document.createElement('div');
    root.innerHTML = `
      <section v-component="teste-reset">
        <input class="c" type="text" v-model="cpf" v-mask="cpf">
        <input class="t" type="text" v-model="telefone" v-mask="phone">
        <button class="p" v-click="preencher()">p</button>
        <button class="l" v-click="limpar()">l</button>
      </section>`;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    await settle();

    (root.querySelector('.p') as HTMLElement).click();
    await settle();
    expect((root.querySelector('.c') as HTMLInputElement).value).toBe('390.533.447-05');
    expect((root.querySelector('.t') as HTMLInputElement).value).toBe('(21) 3344-5566');

    (root.querySelector('.l') as HTMLElement).click();
    await settle();
    expect((root.querySelector('.c') as HTMLInputElement).value).toBe('');
    expect((root.querySelector('.t') as HTMLInputElement).value).toBe('');
  });
});

describe('v-model com v-debounce e select com v-for', () => {
  it('atrasa a escrita no estado', async () => {
    const data = reactive({ busca: '' });
    const root = document.createElement('div');
    root.innerHTML = '<input class="b" v-model="busca" v-debounce="120">';
    document.body.appendChild(root);
    walk(root, new Scope(data));

    const campo = root.querySelector('.b') as HTMLInputElement;
    campo.value = 'ana';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(data.busca).toBe('');

    await new Promise((r) => setTimeout(r, 200));
    expect(data.busca).toBe('ana');
  });

  it('select com opcoes vindas de v-for aceita valor do estado', async () => {
    const data = reactive({
      perfil: '',
      perfis: [
        { valor: 'admin', rotulo: 'Administrador' },
        { valor: 'editor', rotulo: 'Editor' },
      ],
    });
    const root = document.createElement('div');
    root.innerHTML = `
      <select class="s" v-model="perfil">
        <option value="">Selecione</option>
        <option v-for="p in perfis" :key="p.valor" :value="p.valor">{ p.rotulo }</option>
      </select>`;
    document.body.appendChild(root);
    walk(root, new Scope(data));
    await settle();

    const select = root.querySelector('.s') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.value).toBe('');

    (data as any).perfil = 'editor';
    await settle();
    expect(select.value).toBe('editor');
  });
});

describe('refs, $el e alternador de tema', () => {
  it('metodo enxerga this.$refs e this.$el', async () => {
    let visto: any = null;
    core.component('teste-refs', {
      state: function () {
        return { pronto: false };
      },
      mounted: function (this: any) {
        this.$el.setAttribute('data-montado', 'sim');
      },
      methods: {
        olhar: function (this: any) {
          visto = this.$refs.formulario;
          this.pronto = true;
        },
      },
    });

    const root = document.createElement('div');
    root.innerHTML = `
      <section v-component="teste-refs">
        <form v-ref="formulario" v-validate><input name="x" v-required></form>
        <button class="b" v-click="olhar()">ok</button>
        <span class="e">{ pronto }</span>
      </section>`;
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    await settle();

    expect(root.querySelector('section')!.getAttribute('data-montado')).toBe('sim');
    (root.querySelector('.b') as HTMLElement).click();
    await settle();
    expect(visto).toBe(root.querySelector('form'));
    expect(root.querySelector('.e')!.textContent).toBe('true');
  });

  it('v-theme-toggle marca aria-pressed', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<button class="t" v-theme-toggle aria-pressed="false"><i>x</i></button>';
    document.body.appendChild(root);
    walk(root, new Scope(reactive({})));
    await settle();
    const botao = root.querySelector('.t') as HTMLElement;
    expect(botao.hasAttribute('aria-pressed')).toBe(true);
    const antes = botao.getAttribute('aria-pressed');
    botao.click();
    await settle();
    expect(botao.getAttribute('aria-pressed')).not.toBe(antes);
  });

  it('aria-hidden ligado por :aria-hidden acompanha o estado', async () => {
    const data = reactive({ aberto: false });
    const root = document.createElement('div');
    root.innerHTML = '<div class="d" aria-hidden="true" :aria-hidden="aberto ? \'false\' : \'true\'"></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    await settle();
    expect(root.querySelector('.d')!.getAttribute('aria-hidden')).toBe('true');
    data.aberto = true;
    await settle();
    expect(root.querySelector('.d')!.getAttribute('aria-hidden')).toBe('false');
  });
});
