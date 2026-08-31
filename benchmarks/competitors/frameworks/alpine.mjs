/**
 * Alpine.js. Usa `x-data` + `x-for` sobre um `<template>`, que e o caminho
 * idiomatico e o mesmo trabalho logico dos demais.
 *
 * Alpine agenda em microtask, entao cada operacao espera o flush antes de
 * devolver o controle. Sem essa espera o tempo medido excluiria justamente o
 * trabalho que se quer medir.
 */

import Alpine from 'alpinejs';
import { version } from 'alpinejs/package.json';

export const meta = { name: 'alpine', version, production: true };

/** Duas microtasks e uma macrotask: o suficiente para o scheduler do Alpine. */
const tick = () =>
  new Promise((resolve) => queueMicrotask(() => queueMicrotask(() => setTimeout(resolve, 0))));

let iniciado = false;

export function create(container) {
  let root = null;
  let data = null;

  return {
    async mount() {
      root = document.createElement('div');
      root.setAttribute('x-data', 'lista');
      root.innerHTML =
        '<ul><template x-for="row in rows" :key="row.id"><li><span x-text="row.label"></span></li></template></ul>';
      container.appendChild(root);

      if (!iniciado) {
        Alpine.data('lista', () => ({ rows: [] }));
        Alpine.start();
        iniciado = true;
      } else {
        Alpine.initTree(root);
      }
      await tick();
      data = Alpine.$data(root);
    },
    async setRows(next) {
      data.rows = next;
      await tick();
    },
    async updateEvery10th() {
      const rows = data.rows;
      for (let i = 0; i < rows.length; i += 10) rows[i].label = rows[i].label + ' !!!';
      await tick();
    },
    async clear() {
      data.rows = [];
      await tick();
    },
    async unmount() {
      Alpine.destroyTree(root);
      root.remove();
    },
  };
}
