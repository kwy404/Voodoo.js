/**
 * @module benchmarks/harness/kit
 * Utilidades compartilhadas pelas suites: montagem, contagem e conferencia.
 */

/**
 * Monta um trecho de HTML sob um escopo proprio e devolve a raiz.
 * Espelha exatamente o que a suite de testes faz, sem nenhum atalho.
 */
export function mount(V, html, data = {}) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  const state = V.reactive(data);
  V.walk(root, new V.Scope(state));
  V.flushSync();
  return { root, state };
}

/** Desmonta e devolve o corpo ao estado vazio. */
export function unmount(V, root) {
  if (!root) return;
  V.destroy(root);
  root.remove();
}

/** Aplica a fila pendente e espera o post-flush. */
export async function settle(V) {
  V.flushSync();
  await V.nextTick();
  await V.nextTick();
}

/** Conferencia: numero de elementos que casam com o seletor. */
export function expectCount(root, selector, expected) {
  const got = root.querySelectorAll(selector).length;
  if (got !== expected) return `esperava ${expected} nos de "${selector}", encontrou ${got}`;
  return true;
}

/** Conferencia: texto de um no especifico. */
export function expectText(root, selector, index, expected) {
  const nodes = root.querySelectorAll(selector);
  const node = nodes[index];
  if (!node) return `no ${index} de "${selector}" nao existe (total ${nodes.length})`;
  const got = node.textContent;
  if (got !== expected) return `texto do no ${index}: esperava "${expected}", encontrou "${got}"`;
  return true;
}

/** Junta varias conferencias; devolve a primeira falha ou `true`. */
export function all(...checks) {
  for (const c of checks) {
    const v = typeof c === 'function' ? c() : c;
    if (v !== true && v !== undefined) return v;
  }
  return true;
}

/** Dados de linha no formato do js-framework-benchmark. */
const ADJ = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
const COLOUR = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'white', 'black', 'orange'];
const NOUN = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];

/**
 * Gera linhas de forma DETERMINISTICA (gerador congruencial proprio).
 * Sem `Math.random`: duas execucoes precisam medir exatamente o mesmo trabalho.
 */
export function buildRows(count, seed = 1) {
  let s = seed >>> 0 || 1;
  const rand = (max) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s % max;
  };
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: i + 1,
      label: `${ADJ[rand(10)]} ${COLOUR[rand(10)]} ${NOUN[rand(10)]}`,
    };
  }
  return rows;
}

/** Escolhe o numero de amostras conforme o tamanho do caso. */
export function samplesFor(n) {
  if (n <= 100) return 40;
  if (n <= 1000) return 25;
  if (n <= 5000) return 10;
  return 6;
}

/**
 * Orcamento de tempo por caso. Casos grandes sao caros por natureza; o teto
 * existe para a suite inteira terminar, nao para esconder que sao lentos.
 */
export function budgetFor(n) {
  if (n <= 1000) return 20_000;
  if (n <= 5000) return 30_000;
  return 45_000;
}
