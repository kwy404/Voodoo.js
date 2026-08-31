/**
 * Baseline em JavaScript puro. Sem reatividade, sem diffing, sem abstracao.
 * Este e o teto: nenhum framework pode ser mais rapido que escrever o DOM na
 * mao, e a distancia ate aqui e o preco da abstracao.
 */

export const meta = { name: 'vanilla', version: 'n/a (hand-written)', production: true };

export function create(container) {
  let rows = [];
  let ul = null;
  const spans = []; // indice posicional: o acesso mais rapido possivel

  return {
    async mount() {
      ul = document.createElement('ul');
      container.appendChild(ul);
    },
    async setRows(next) {
      rows = next;
      ul.textContent = '';
      spans.length = 0;
      const frag = document.createDocumentFragment();
      for (const row of rows) {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = row.label;
        li.appendChild(span);
        frag.appendChild(li);
        spans.push(span);
      }
      ul.appendChild(frag);
    },
    async updateEvery10th() {
      for (let i = 0; i < rows.length; i += 10) {
        rows[i].label = rows[i].label + ' !!!';
        spans[i].textContent = rows[i].label;
      }
    },
    async clear() {
      rows = [];
      spans.length = 0;
      ul.textContent = '';
    },
    async unmount() {
      container.textContent = '';
    },
  };
}
