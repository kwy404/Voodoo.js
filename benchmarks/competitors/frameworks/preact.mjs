/**
 * Preact. `render()` chamado na mao e sincrono, entao nao ha espera a fazer.
 */

import { h, render } from 'preact';
import { version } from 'preact/package.json';

export const meta = { name: 'preact', version, production: true };

export function create(container) {
  let rows = [];
  let root = null;

  const view = () =>
    h(
      'ul',
      null,
      rows.map((row) => h('li', { key: row.id }, h('span', null, row.label)))
    );

  return {
    async mount() {
      root = document.createElement('div');
      container.appendChild(root);
      render(view(), root);
    },
    async setRows(next) {
      rows = next;
      render(view(), root);
    },
    async updateEvery10th() {
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      rows = [...rows];
      render(view(), root);
    },
    async clear() {
      rows = [];
      render(view(), root);
    },
    async unmount() {
      render(null, root);
      root.remove();
    },
  };
}
