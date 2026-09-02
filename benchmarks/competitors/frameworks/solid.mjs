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
 *
 * O estado usa `createStore`, e nao `createSignal`, de proposito. Com um sinal
 * de objetos simples, mudar uma linha obriga a clonar o array inteiro e trocar
 * o sinal, o que desliga justamente a reatividade granular que e a razao de ser
 * do Solid: o `<For>` teria de reconciliar as mil linhas de novo. Com o store,
 * `setRows('lista', i, 'label', ...)` atinge so aquela linha, que e como um app
 * Solid de verdade escreveria. A versao anterior deste arquivo clonava tudo e
 * media o Solid no pior caminho possivel.
 */

import { For } from 'solid-js';
import { createStore } from 'solid-js/store';
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
  const [rows, setRows] = createStore({ lista: [] });
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
              return rows.lista;
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
      setRows('lista', next.map((r) => ({ ...r })));
    },
    async updateEvery10th() {
      // Atualizacao cirurgica: so as linhas alvo sao tocadas, e o `<For>` nao
      // reconcilia o resto.
      for (let i = 0; i < rows.lista.length; i += 10) {
        setRows('lista', i, 'label', (label) => label + ' !!!');
      }
    },
    async clear() {
      setRows('lista', []);
    },
    async unmount() {
      dispose?.();
      host.remove();
    },
  };
}
