/**
 * Regressao: componente registrado depois do HTML, com ancestral ainda por
 * processar.
 *
 * O caso real que revelou o problema: o script do CDN carrega com `defer`, o
 * script da aplicacao registra os componentes em `DOMContentLoaded`, e a
 * caminhada da Voodoo acontece depois disso. Nesse intervalo,
 * `defineComponent` chamava `mountPending`, que montava a tag usando
 * `findScope(el.parentNode)`. Como o `v-data` do pai ainda nao tinha sido
 * processado, o escopo encontrado era a raiz, e os atributos escritos na tag
 * do componente ficavam ligados ao escopo errado para sempre: o elemento saia
 * marcado como pronto, e a caminhada seguinte passava direto por ele.
 *
 * Sintoma visivel: `@evento="alvo = $event"` na tag do componente nunca
 * escrevia no `v-data` do pai.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent } from '../src/runtime/component';
import { components } from '../src/runtime/registry';
import { destroy, getScope, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';
import '../src/core';

beforeEach(() => {
  document.body.innerHTML = '';
  for (const chave of Object.keys(rootScope.data)) delete rootScope.data[chave];
});

afterEach(() => {
  destroy(document.body);
  document.body.innerHTML = '';
  components.delete('placar-tardio');
  components.delete('placar-cedo');
});

describe('ordem de montagem de componente registrado tarde', () => {
  it('liga os atributos da tag ao escopo do pai, e nao a raiz', async () => {
    // O HTML chega antes do componente existir, exatamente como numa pagina
    // servida pelo servidor.
    document.body.innerHTML = `
      <div v-data="{ ultimo: 'nada' }">
        <placar-tardio :inicio="10" @mudou="ultimo = $event"></placar-tardio>
        <i id="saida">{ ultimo }</i>
      </div>
    `;

    // Registrar agora dispara `mountPending` com o pai ainda por processar.
    defineComponent('placar-tardio', {
      props: { inicio: { type: 'number', default: 0 } },
      state(props) {
        return { valor: props.inicio };
      },
      methods: {
        somar() {
          this.valor++;
          this.emit('mudou', this.valor);
        },
      },
      template: `<span id="valor">{ valor }</span>`,
    });

    // A caminhada principal so acontece depois, como na pagina real.
    walk(document.body, rootScope);
    await nextTick();

    const el = document.querySelector('placar-tardio') as HTMLElement;
    expect(el).not.toBeNull();

    const instancia = getInstancia(el);
    expect(instancia).toBeTruthy();

    instancia.somar();
    await nextTick();

    // O evento precisa ter escrito no `v-data` do pai.
    expect(document.querySelector('#saida')!.textContent).toBe('11');

    // E nao pode ter vazado para o escopo raiz.
    expect('ultimo' in rootScope.data).toBe(false);
  });

  it('a prop reativa da tag tambem enxerga o escopo do pai', async () => {
    document.body.innerHTML = `
      <div v-data="{ base: 5 }">
        <placar-tardio :inicio="base"></placar-tardio>
      </div>
    `;

    defineComponent('placar-tardio', {
      props: { inicio: { type: 'number', default: 0 } },
      state(props) {
        return { valor: props.inicio };
      },
      template: `<span id="valor">{ valor }</span>`,
    });

    walk(document.body, rootScope);
    await nextTick();

    // Se a prop tivesse sido avaliada na raiz, `base` seria undefined e o
    // padrao 0 entraria no lugar.
    expect(document.querySelector('#valor')!.textContent).toBe('5');
  });

  it('continua montando quando o pai ja foi processado', async () => {
    // O outro lado da moeda: registrar depois de a pagina inteira ter sido
    // percorrida precisa continuar montando na hora.
    document.body.innerHTML = `
      <div v-data="{ ultimo: 'nada' }">
        <placar-cedo @mudou="ultimo = $event"></placar-cedo>
        <i id="saida2">{ ultimo }</i>
      </div>
    `;

    walk(document.body, rootScope);
    await nextTick();

    defineComponent('placar-cedo', {
      state() {
        return { valor: 1 };
      },
      methods: {
        somar() {
          this.valor++;
          this.emit('mudou', this.valor);
        },
      },
      template: `<span>{ valor }</span>`,
    });
    await nextTick();

    const el = document.querySelector('placar-cedo') as HTMLElement;
    const instancia = getInstancia(el);
    expect(instancia).toBeTruthy();

    instancia.somar();
    await nextTick();

    expect(document.querySelector('#saida2')!.textContent).toBe('2');
  });
});

/** Recupera a instancia montada sobre um elemento. */
function getInstancia(el: Element): any {
  return getScope(el)?.component;
}
