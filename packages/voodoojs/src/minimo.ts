/**
 * Build minimo da Voodoo.js.
 *
 * Traz o que faz o HTML virar aplicacao: reatividade, o avaliador seguro de
 * expressoes, o motor de DOM, os componentes, todas as directives de estado e
 * renderizacao, os eventos, as requisicoes por atributo e a colecao encadeavel.
 *
 * Fica de fora: formularios com validacao e mascaras, componentes de interface,
 * arrastar e soltar, graficos, animacoes, roteador, idiomas, inspetor e a
 * biblioteca de componentes prontos. Para esses, use `voodoo.min.js` ou
 * `voodoo.full.min.js`.
 */

import { core } from './core';
import { query, ready, VoodooCollection, fromHtml } from './dom/query';
import { magic } from './runtime/scope';

export interface VoodooMinimo extends Omit<typeof core, never> {
  (input?: unknown, context?: unknown): VoodooCollection;
}

const V = ((input?: unknown, context?: unknown) =>
  query(input as never, context as never)) as unknown as VoodooMinimo;

Object.assign(V, core, {
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,
  magic,
});

export default V;
export { V };
