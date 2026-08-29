/**
 * @module directives/shared
 *
 * Base comum das directives de interface. Vive em um modulo proprio para que
 * `directives/ui` e `directives/dnd` possam usar os mesmos auxiliares sem criar
 * dependencia circular entre eles.
 */

import { injectStyle } from '../dom/style';
import { defineDirective, PRIORITY, config } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import {
  evaluateIn,
  closestDirective,
  queryDirective,
  readAttr,
  hasAttr as hasCachedAttr,
} from '../runtime/walker';

// ---------------------------------------------------------------------------
// Leitura de atributos e registro de opcoes
// ---------------------------------------------------------------------------

const optionValues = new WeakMap<Element, Record<string, string>>();

/**
 * Le um atributo da Voodoo aceitando as grafias `v-nome` e `data-v-nome`.
 *
 * Consulta o cache do walker, entao continua devolvendo o valor original mesmo
 * depois que o atributo saiu do HTML pela limpeza automatica.
 */
export function attrOf(el: Element, name: string): string | null {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}

/** Verifica a presenca de um atributo da Voodoo, nas duas grafias. */
export function hasAttrOf(el: Element, name: string): boolean {
  return hasCachedAttr(el, `${config.prefix}${name}`) || hasCachedAttr(el, `data-v-${name}`);
}

/** Seletor CSS que casa com as duas grafias aceitas de um atributo. */
export function selectorFor(name: string): string {
  return `[${config.prefix}${name}],[data-v-${name}]`;
}

/** Le o valor de uma opcao, primeiro do registro e depois do atributo cru. */
export function readOption(el: Element, name: string): string | null {
  const bag = optionValues.get(el);
  if (bag && name in bag) return bag[name];
  return attrOf(el, name);
}

/** Guarda o valor de uma opcao lida diretamente por outra directive. */
export function storeOption(el: Element, name: string, value: string): void {
  const bag = optionValues.get(el) ?? {};
  bag[name] = value;
  optionValues.set(el, bag);
}

/**
 * Registra um atributo que existe apenas para configurar outra directive, como
 * `v-tooltip-position` ou `v-drawer-side`. O valor entra no registro de opcoes,
 * o que evita reler o DOM e deixa o atributo declarado no runtime.
 */
export function defineOption(name: string): void {
  defineDirective(
    name,
    ({ el, expression }) => {
      storeOption(el, name, expression);
    },
    { priority: PRIORITY.BIND }
  );
}

// ---------------------------------------------------------------------------
// Eventos e expressoes
// ---------------------------------------------------------------------------

/** Dispara um evento customizado que sobe pela arvore. */
export function dispatch(el: HTMLElement, type: string, detail: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

/**
 * Avalia a expressao de uma directive de interface e devolve o resultado.
 * Quando a expressao e apenas o nome de uma funcao, a funcao e chamada com o
 * detalhe, no mesmo estilo de `v-on`.
 *
 * @param expression texto do atributo
 * @param scope escopo ativo
 * @param el elemento que declarou a directive, exposto como `$el`
 * @param event evento de origem, exposto como `$event`
 * @param detail carga entregue a funcao e exposta como `$detail`
 */
export function callExpression(
  expression: string,
  scope: Scope,
  el: HTMLElement,
  event?: Event,
  detail?: unknown
): unknown {
  if (!expression.trim()) return undefined;
  const local = scope.child({ $el: el, $event: event ?? null, $detail: detail });
  const value = evaluateIn<unknown>(expression, local, 'directive de UI');
  if (typeof value === 'function') {
    return (value as (payload?: unknown) => unknown).call(scope.data, detail ?? event);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Anuncio para leitores de tela
// ---------------------------------------------------------------------------

const LIVE_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;

let liveRegion: HTMLElement | null = null;

/**
 * Anuncia uma mensagem curta em uma regiao `aria-live`. Usado pelas directives
 * que mudam a interface sem um texto visivel correspondente, como copiar,
 * reordenar e soltar itens.
 */
export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  injectStyle('ui-live', LIVE_CSS);

  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'v-visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }

  const region = liveRegion;
  region.textContent = '';
  // O texto entra em uma segunda etapa, senao leitores de tela ignoram
  // mensagens repetidas.
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}

/**
 * Descendentes de `root` que declararam `childName` e cujo dono mais proximo
 * com `ownerName` e o proprio `root`. Serve para abas dentro de abas.
 *
 * Usa o indice de directives do runtime, entao continua funcionando depois
 * que os atributos `v-*` saem do HTML.
 */
export function ownedByDirective(
  root: HTMLElement,
  childName: string,
  ownerName: string
): HTMLElement[] {
  return queryDirective(root, childName).filter(
    (el) => closestDirective(el, ownerName) === root
  );
}

export { closestDirective, queryDirective };
