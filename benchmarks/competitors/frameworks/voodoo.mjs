/**
 * Voodoo.js em build de PRODUCAO e minificado, empacotado a partir de
 * `packages/voodoojs/src/index.ts` pelo mesmo esbuild que empacota os
 * concorrentes, com `process.env.NODE_ENV = "production"` e `minify: true`.
 */

import { reactive, Scope, walk, destroy, flushSync } from 'voodoojs-src';

export const meta = { name: 'voodoo', version: 'workspace', production: true };

const TEMPLATE = `<ul><li v-for="row in rows" :key="row.id"><span v-text="row.label"></span></li></ul>`;

export function create(container) {
  let state = null;
  let root = null;

  return {
    async mount() {
      root = document.createElement('div');
      root.innerHTML = TEMPLATE;
      container.appendChild(root);
      state = reactive({ rows: [] });
      walk(root, new Scope(state));
      flushSync();
    },
    async setRows(next) {
      state.rows = next;
      flushSync();
    },
    async updateEvery10th() {
      const rows = state.rows;
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      flushSync();
    },
    async clear() {
      state.rows = [];
      flushSync();
    },
    async unmount() {
      destroy(root);
      root.remove();
    },
  };
}
