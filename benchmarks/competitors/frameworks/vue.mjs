/**
 * Vue 3 em build de producao. Usa funcao de render com `h()` em vez de template
 * compilado: e exatamente o que o compilador de template gera, e evita arrastar
 * o compilador de templates para dentro da comparacao de runtime.
 */

import { createApp, h, reactive, nextTick } from 'vue';
import { version } from 'vue/package.json';

export const meta = { name: 'vue', version, production: true };

export function create(container) {
  const state = reactive({ rows: [] });
  let app = null;
  let root = null;

  return {
    async mount() {
      root = document.createElement('div');
      container.appendChild(root);
      app = createApp({
        setup() {
          return () =>
            h(
              'ul',
              null,
              state.rows.map((row) => h('li', { key: row.id }, [h('span', null, row.label)]))
            );
        },
      });
      app.mount(root);
      await nextTick();
    },
    async setRows(next) {
      state.rows = next;
      await nextTick();
    },
    async updateEvery10th() {
      const rows = state.rows;
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      await nextTick();
    },
    async clear() {
      state.rows = [];
      await nextTick();
    },
    async unmount() {
      app.unmount();
      root.remove();
    },
  };
}
