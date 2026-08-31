/**
 * Solid.js sem JSX.
 *
 * O compilador do Solid transforma JSX exatamente nestas chamadas de
 * `solid-js/web`: `template()` para clonar o no, `insert()` para ligar a
 * reatividade. Escrever a saida do compilador na mao percorre o mesmo caminho
 * de runtime que um app real com JSX percorreria.
 *
 * Nota de honestidade: por nao passar pelo compilador, este fixture nao recebe
 * as otimizacoes de compilacao do Solid. O numero aqui e um piso do que o Solid
 * faz, e o relatorio diz isso.
 */

import { createSignal, For } from 'solid-js';
import { render, template, insert, createComponent } from 'solid-js/web';
import { version } from 'solid-js/package.json';

export const meta = {
  name: 'solid',
  version,
  production: true,
  caveat:
    'sem compilador JSX: monta na mao as chamadas (template/insert/createComponent + <For>) ' +
    'que o compilador do Solid emitiria para o mesmo JSX',
};

const ulTpl = template('<ul></ul>');
const linhaTpl = template('<li><span></span></li>');

export function create(container) {
  const [rows, setRows] = createSignal([]);
  let dispose = null;
  let host = null;

  return {
    async mount() {
      host = document.createElement('div');
      container.appendChild(host);
      dispose = render(() => {
        const ul = ulTpl();
        // `<For>` e a reconciliacao keyed do Solid — o mesmo caminho que o JSX
        // `<For each={rows()}>` percorre. Sem ele o fixture recriaria a lista
        // inteira a cada sinal, e o numero nao representaria o Solid.
        insert(
          ul,
          createComponent(For, {
            get each() {
              return rows();
            },
            children: (row) => {
              const li = linhaTpl();
              insert(li.firstChild, () => row.label);
              return li;
            },
          })
        );
        return ul;
      }, host);
    },
    async setRows(next) {
      setRows(next.map((r) => ({ ...r })));
    },
    async updateEvery10th() {
      const atuais = rows().map((r) => ({ ...r }));
      for (let i = 0; i < atuais.length; i += 10) atuais[i].label = atuais[i].label + ' !!!';
      setRows(atuais);
    },
    async clear() {
      setRows([]);
    },
    async unmount() {
      dispose?.();
      host.remove();
    },
  };
}
