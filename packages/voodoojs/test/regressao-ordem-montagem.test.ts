/**
 * Regression: a component registered after the HTML, with an ancestor still to
 * be processed.
 *
 * The real case that exposed the problem: the CDN script loads with `defer`,
 * the application script registers the components on `DOMContentLoaded`, and
 * the Voodoo walk happens after that. In that window, `defineComponent` called
 * `mountPending`, which mounted the tag using `findScope(el.parentNode)`.
 * Because the parent's `v-data` had not been processed yet, the scope found
 * was the root, and the attributes written on the component tag stayed bound
 * to the wrong scope forever: the element came out marked as ready, and the
 * following walk went straight past it.
 *
 * Visible symptom: `@evento="alvo = $event"` on the component tag never wrote
 * into the parent's `v-data`.
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

describe('mount order of a component registered late', () => {
  it('binds the tag attributes to the parent scope, and not to the root', async () => {
    // The HTML arrives before the component exists, exactly as on a page
    // served by the server.
    document.body.innerHTML = `
      <div v-data="{ ultimo: 'nada' }">
        <placar-tardio :inicio="10" @mudou="ultimo = $event"></placar-tardio>
        <i id="saida">{ ultimo }</i>
      </div>
    `;

    // Registering now fires `mountPending` with the parent still unprocessed.
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

    // The main walk only happens afterwards, as on the real page.
    walk(document.body, rootScope);
    await nextTick();

    const el = document.querySelector('placar-tardio') as HTMLElement;
    expect(el).not.toBeNull();

    const instancia = getInstancia(el);
    expect(instancia).toBeTruthy();

    instancia.somar();
    await nextTick();

    // The event must have written into the parent's `v-data`.
    expect(document.querySelector('#saida')!.textContent).toBe('11');

    // And it must not have leaked into the root scope.
    expect('ultimo' in rootScope.data).toBe(false);
  });

  it('the reactive prop on the tag also sees the parent scope', async () => {
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

    // If the prop had been evaluated at the root, `base` would be undefined
    // and the default 0 would take its place.
    expect(document.querySelector('#valor')!.textContent).toBe('5');
  });

  it('still mounts when the parent has already been processed', async () => {
    // The other side of the coin: registering after the whole page has been
    // walked has to keep mounting straight away.
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

/** Retrieves the instance mounted on an element. */
function getInstancia(el: Element): any {
  return getScope(el)?.component;
}
