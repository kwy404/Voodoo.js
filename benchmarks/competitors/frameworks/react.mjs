/**
 * React 19 em build de PRODUCAO. O `define` do esbuild fixa
 * `process.env.NODE_ENV = "production"` no empacotamento, e as condicoes de
 * resolucao incluem `production`, entao o que entra e o react.production.js.
 *
 * `flushSync` obriga a renderizacao a acontecer dentro da janela medida. Sem
 * ele o React adiaria o trabalho e o benchmark cronometraria o agendamento em
 * vez da renderizacao — comparando maca com laranja contra os frameworks
 * sincronos.
 */

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { version } from 'react/package.json';

export const meta = { name: 'react', version, production: true };

export function create(container) {
  let rows = [];
  let root = null;
  let host = null;

  const view = () =>
    createElement(
      'ul',
      null,
      rows.map((row) => createElement('li', { key: row.id }, createElement('span', null, row.label)))
    );

  return {
    async mount() {
      host = document.createElement('div');
      container.appendChild(host);
      root = createRoot(host);
      flushSync(() => root.render(view()));
    },
    async setRows(next) {
      rows = next;
      flushSync(() => root.render(view()));
    },
    async updateEvery10th() {
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      rows = [...rows];
      flushSync(() => root.render(view()));
    },
    async clear() {
      rows = [];
      flushSync(() => root.render(view()));
    },
    async unmount() {
      flushSync(() => root.unmount());
      host.remove();
    },
  };
}
