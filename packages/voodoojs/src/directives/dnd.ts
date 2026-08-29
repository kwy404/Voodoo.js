/**
 * @module directives/dnd
 *
 * Arrastar e soltar completo, construido sobre eventos de ponteiro. A Drag and
 * Drop API do HTML5 foi deixada de lado de proposito: ela nao funciona bem no
 * toque, nao deixa customizar a imagem arrastada e nao ajuda em listas
 * ordenaveis.
 *
 * ```html
 * <div v-dnd-group="kanban">
 *   <ul v-sortable v-sortable-group="kanban"> ... </ul>
 *   <ul v-sortable v-sortable-group="kanban"> ... </ul>
 * </div>
 *
 * <div v-draggable v-draggable-data="produto">Arraste</div>
 * <div v-droppable="adicionarAoCarrinho" v-droppable-accept=".produto">Solte aqui</div>
 * ```
 *
 * Tudo funciona com mouse, caneta, toque e teclado. O arraste pelo teclado usa
 * espaco para pegar e soltar, setas para mover e Escape para cancelar, com
 * anuncio em regiao `aria-live`.
 */

import { injectStyle, ensureTokens } from '../dom/style';
import { defineDirective } from '../runtime/registry';
import type { Scope } from '../runtime/scope';
import { evaluateIn } from '../runtime/walker';
import { device } from '../utils';
import { announce, callExpression, defineOption, dispatch, readOption } from './shared';

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const DND_CSS = `
.v-draggable,.v-sortable>*{-webkit-user-select:none;user-select:none}
.v-drag-handle{cursor:grab;touch-action:none}
.v-drag-handle:active{cursor:grabbing}

.v-dragging{opacity:.4;pointer-events:none;outline:2px dashed var(--v-primary,#6D3BF5);
  outline-offset:-2px;border-radius:var(--v-radius-sm,8px)}
.v-drag-ghost{position:fixed;top:0;left:0;margin:0;z-index:calc(var(--v-z-modal,1000) + 20);
  pointer-events:none;opacity:.95;box-sizing:border-box;
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  border-radius:var(--v-radius-sm,8px);transform-origin:top left;
  transition:transform .04s linear}
.v-drag-ghost.v-drag-invalid{opacity:.6;filter:grayscale(.6)}

.v-drop-over{outline:2px dashed var(--v-primary,#6D3BF5);outline-offset:2px;
  background:var(--v-surface-2,#FBF7F2)}
.v-drop-active{outline:1px dashed var(--v-border,#E6E0F0);outline-offset:2px}

.v-sortable{position:relative}
.v-grabbed{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}

@media (prefers-reduced-motion: reduce){
  .v-drag-ghost{transition:none !important}
}
`;

/** Garante os tokens e o CSS do arrastar e soltar. */
function ensureDnd(): void {
  ensureTokens();
  injectStyle('dnd', DND_CSS);
}

// ---------------------------------------------------------------------------
// Registros
// ---------------------------------------------------------------------------

interface SortableInfo {
  el: HTMLElement;
  group: string | null;
  handle: string | null;
}

interface DroppableInfo {
  el: HTMLElement;
  group: string | null;
  accept: string | null;
  expression: string;
  scope: Scope;
}

const sortableRegistry = new Map<HTMLElement, SortableInfo>();
const droppableRegistry = new Map<HTMLElement, DroppableInfo>();

/**
 * Descobre o grupo de um elemento: o proprio atributo quando existe, senao o
 * `v-dnd-group` do ancestral mais proximo.
 */
function groupOf(el: HTMLElement, own: string | null): string | null {
  if (own && own.trim()) return own.trim();
  const holder = el.closest('[data-v-dnd-group]') as HTMLElement | null;
  return holder?.getAttribute('data-v-dnd-group') || null;
}

/** Filhos diretos que podem ser arrastados dentro de uma lista. */
function itemsOf(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (child) => !child.classList.contains('v-drag-ghost')
  ) as HTMLElement[];
}

/** Identificador de um item, usado na ordem entregue pelos eventos. */
function itemKey(item: HTMLElement, index: number): string {
  return item.getAttribute('data-id') ?? (item.id || String(index));
}

/** Ordem atual de uma lista, em chaves estaveis. */
function orderOf(list: HTMLElement): string[] {
  return itemsOf(list).map((item, index) => itemKey(item, index));
}

/** Detecta listas dispostas em linha, onde as setas horizontais fazem sentido. */
function isHorizontal(list: HTMLElement): boolean {
  const style = getComputedStyle(list);
  if (style.display.includes('flex')) return style.flexDirection.startsWith('row');
  if (style.display.includes('grid')) return style.gridAutoFlow.startsWith('column');
  return false;
}

// ---------------------------------------------------------------------------
// Sessao de arraste
// ---------------------------------------------------------------------------

interface DragSession {
  item: HTMLElement;
  /** `sort` reordena listas, `free` apenas entrega o item a uma area. */
  mode: 'sort' | 'free';
  data: unknown;
  group: string | null;
  axis: 'x' | 'y' | null;
  ghost: HTMLElement | null;
  pointerId: number;
  grabX: number;
  grabY: number;
  startParent: HTMLElement | null;
  startNext: Node | null;
  startList: HTMLElement | null;
  startIndex: number;
  overDrop: HTMLElement | null;
  overList: HTMLElement | null;
  keyboard: boolean;
  lastX: number;
  lastY: number;
}

let session: DragSession | null = null;
let scrollFrame = 0;

/** Cria o fantasma que acompanha o cursor. */
function createGhost(item: HTMLElement, rect: DOMRect): HTMLElement {
  const ghost = item.cloneNode(true) as HTMLElement;
  ghost.classList.add('v-drag-ghost');
  ghost.classList.remove('v-dragging', 'v-grabbed');
  ghost.removeAttribute('id');
  for (const node of Array.from(ghost.querySelectorAll('[id]'))) node.removeAttribute('id');
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ghost);
  return ghost;
}

/** Move o fantasma respeitando o eixo travado. */
function moveGhost(x: number, y: number): void {
  if (!session?.ghost) return;
  const left = session.axis === 'y' ? session.lastX : x;
  const top = session.axis === 'x' ? session.lastY : y;
  session.ghost.style.transform = `translate3d(${Math.round(left - session.grabX)}px, ${Math.round(
    top - session.grabY
  )}px, 0)`;
}

/** Container rolavel mais proximo, usado pela rolagem automatica. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const scrollableY =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight + 2;
    const scrollableX =
      (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
      current.scrollWidth > current.clientWidth + 2;
    if (scrollableY || scrollableX) return current;
    current = current.parentElement;
  }
  return null;
}

/** Rola o container ou a janela quando o cursor chega perto da borda. */
function autoScroll(): void {
  if (!session) return;
  const zone = 56;
  const speed = 16;
  const x = session.lastX;
  const y = session.lastY;

  const under = document.elementFromPoint(x, y) as HTMLElement | null;
  const container = scrollParent(under ?? session.overList);

  if (container) {
    const rect = container.getBoundingClientRect();
    if (y - rect.top < zone) container.scrollTop -= speed;
    else if (rect.bottom - y < zone) container.scrollTop += speed;
    if (x - rect.left < zone) container.scrollLeft -= speed;
    else if (rect.right - x < zone) container.scrollLeft += speed;
    return;
  }

  if (y < zone) window.scrollBy(0, -speed);
  else if (window.innerHeight - y < zone) window.scrollBy(0, speed);
  if (x < zone) window.scrollBy(-speed, 0);
  else if (window.innerWidth - x < zone) window.scrollBy(speed, 0);
}

function startScrollLoop(): void {
  const step = (): void => {
    if (!session || session.keyboard) return;
    autoScroll();
    scrollFrame = requestAnimationFrame(step);
  };
  scrollFrame = requestAnimationFrame(step);
}

function stopScrollLoop(): void {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
}

// ---------------------------------------------------------------------------
// Compatibilidade entre origem e destino
// ---------------------------------------------------------------------------

/** Verifica se uma lista aceita o item que esta sendo arrastado. */
function listAccepts(list: HTMLElement, current: DragSession): boolean {
  const info = sortableRegistry.get(list);
  if (!info) return false;
  if (list === current.startList) return true;
  if (!info.group || !current.group) return false;
  return info.group === current.group;
}

/** Verifica se uma area de soltura aceita o item que esta sendo arrastado. */
function dropAccepts(info: DroppableInfo, current: DragSession): boolean {
  if (info.accept && !current.item.matches(info.accept)) return false;
  if (info.group && info.group !== current.group) return false;
  return true;
}

/** Marca visualmente todas as areas compativeis com o arraste atual. */
function highlightTargets(current: DragSession, on: boolean): void {
  for (const info of droppableRegistry.values()) {
    info.el.classList.toggle('v-drop-active', on && dropAccepts(info, current));
  }
  for (const info of sortableRegistry.values()) {
    info.el.classList.toggle('v-drop-active', on && listAccepts(info.el, current));
  }
}

/** Insere o item na posicao correspondente ao ponteiro dentro da lista. */
function placeInList(list: HTMLElement, item: HTMLElement, x: number, y: number): void {
  const horizontal = isHorizontal(list);
  let reference: HTMLElement | null = null;

  for (const child of itemsOf(list)) {
    if (child === item) continue;
    const rect = child.getBoundingClientRect();
    const middle = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const pointer = horizontal ? x : y;
    if (pointer < middle) {
      reference = child;
      break;
    }
  }

  if (reference) {
    if (item.nextElementSibling !== reference || item.parentElement !== list) {
      list.insertBefore(item, reference);
    }
    return;
  }
  if (list.lastElementChild !== item) list.appendChild(item);
}

// ---------------------------------------------------------------------------
// Ciclo do arraste
// ---------------------------------------------------------------------------

/** Monta a sessao e prepara o visual do arraste. */
function beginDrag(
  item: HTMLElement,
  options: {
    mode: 'sort' | 'free';
    data: unknown;
    group: string | null;
    axis: 'x' | 'y' | null;
    pointerId: number;
    x: number;
    y: number;
    keyboard?: boolean;
  }
): void {
  ensureDnd();
  const rect = item.getBoundingClientRect();
  const list = options.mode === 'sort' ? (item.parentElement as HTMLElement | null) : null;

  session = {
    item,
    mode: options.mode,
    data: options.data,
    group: options.group,
    axis: options.axis,
    ghost: null,
    pointerId: options.pointerId,
    grabX: options.keyboard ? rect.width / 2 : options.x - rect.left,
    grabY: options.keyboard ? rect.height / 2 : options.y - rect.top,
    startParent: item.parentElement,
    startNext: item.nextSibling,
    startList: list,
    startIndex: list ? itemsOf(list).indexOf(item) : -1,
    overDrop: null,
    overList: list,
    keyboard: !!options.keyboard,
    lastX: options.x,
    lastY: options.y,
  };

  item.classList.add('v-dragging');
  item.setAttribute('aria-grabbed', 'true');

  if (!options.keyboard) {
    session.ghost = createGhost(item, rect);
    moveGhost(options.x, options.y);
    startScrollLoop();
  } else {
    item.classList.add('v-grabbed');
  }

  highlightTargets(session, true);
  document.addEventListener('keydown', onDragKeyDown, true);
  dispatch(item, 'voodoo:drag-start', { item, data: options.data, group: options.group });
}

/** Atualiza destino e posicao durante o arraste com ponteiro. */
function updateDrag(x: number, y: number): void {
  if (!session) return;
  session.lastX = x;
  session.lastY = y;
  moveGhost(x, y);

  const under = document.elementFromPoint(x, y) as HTMLElement | null;
  const list = (under?.closest('.v-sortable') as HTMLElement | null) ?? null;
  const drop = (under?.closest('.v-droppable') as HTMLElement | null) ?? null;

  // Reordenacao dentro da lista, inclusive entre listas do mesmo grupo.
  if (session.mode === 'sort' && list && listAccepts(list, session)) {
    if (session.overList && session.overList !== list) {
      session.overList.classList.remove('v-drop-over');
    }
    session.overList = list;
    list.classList.add('v-drop-over');
    placeInList(list, session.item, x, y);
  } else if (session.overList && !list) {
    session.overList.classList.remove('v-drop-over');
  }

  const info = drop ? droppableRegistry.get(drop) : undefined;
  const valid = info ? dropAccepts(info, session) : false;

  if (session.overDrop && session.overDrop !== drop) {
    session.overDrop.classList.remove('v-drop-over');
    session.overDrop = null;
  }
  if (drop && valid) {
    drop.classList.add('v-drop-over');
    session.overDrop = drop;
  }
  session.ghost?.classList.toggle('v-drag-invalid', !!drop && !valid);
}

/** Devolve o item para a posicao onde o arraste comecou. */
function restorePosition(current: DragSession): void {
  if (!current.startParent) return;
  if (current.startNext && current.startNext.parentNode === current.startParent) {
    current.startParent.insertBefore(current.item, current.startNext);
  } else {
    current.startParent.appendChild(current.item);
  }
}

/** Limpa classes, fantasma e listeners da sessao. */
function teardown(current: DragSession): void {
  current.ghost?.remove();
  current.item.classList.remove('v-dragging', 'v-grabbed');
  current.item.setAttribute('aria-grabbed', 'false');
  current.overDrop?.classList.remove('v-drop-over');
  current.overList?.classList.remove('v-drop-over');
  highlightTargets(current, false);
  stopScrollLoop();
  document.removeEventListener('keydown', onDragKeyDown, true);
  session = null;
}

/** Conclui o arraste, avisando lista e area de soltura envolvidas. */
function finishDrag(): void {
  const current = session;
  if (!current) return;

  const list = current.item.parentElement as HTMLElement | null;
  const newIndex = list ? itemsOf(list).indexOf(current.item) : -1;
  const drop = current.overDrop;
  const info = drop ? droppableRegistry.get(drop) : undefined;

  if (current.mode === 'sort' && list && sortableRegistry.has(list)) {
    const moved = list !== current.startList || newIndex !== current.startIndex;
    if (moved) {
      const detail = {
        item: current.item,
        oldIndex: current.startIndex,
        newIndex,
        from: current.startList,
        to: list,
        order: orderOf(list),
      };
      dispatch(list, 'voodoo:sorted', detail);
      if (current.startList && current.startList !== list) {
        dispatch(current.startList, 'voodoo:sorted', {
          ...detail,
          order: orderOf(current.startList),
        });
      }
      announce(`Item movido para a posicao ${newIndex + 1} de ${itemsOf(list).length}`);
    }
  }

  if (drop && info) {
    const detail = {
      item: current.item,
      data: current.data,
      from: current.startList ?? current.startParent,
      to: drop,
      index: newIndex,
    };
    const event = new CustomEvent('voodoo:drop', { detail, bubbles: true });
    drop.dispatchEvent(event);
    callExpression(info.expression, info.scope, drop, event, detail);
    announce('Item solto na area de destino');
  }

  dispatch(current.item, 'voodoo:drag-end', { item: current.item, data: current.data });
  teardown(current);
}

/** Cancela o arraste e devolve o item ao lugar de origem. */
function cancelDrag(): void {
  const current = session;
  if (!current) return;
  restorePosition(current);
  dispatch(current.item, 'voodoo:drag-cancel', { item: current.item });
  announce('Arraste cancelado');
  teardown(current);
}

function onDragKeyDown(event: KeyboardEvent): void {
  if (!session || event.key !== 'Escape') return;
  event.preventDefault();
  cancelDrag();
}

// ---------------------------------------------------------------------------
// Ponteiro: instalacao em um elemento arrastavel
// ---------------------------------------------------------------------------

interface PointerDragOptions {
  mode: 'sort' | 'free';
  /** Seletor da alca. Quando ausente, o proprio item e a alca. */
  handle: string | null;
  group: () => string | null;
  data: () => unknown;
  axis: () => 'x' | 'y' | null;
  /** Item real a partir do alvo do evento, usado pelas listas ordenaveis. */
  itemFrom: (target: HTMLElement) => HTMLElement | null;
}

/** Liga os eventos de ponteiro que iniciam e conduzem um arraste. */
function installPointerDrag(
  root: HTMLElement,
  options: PointerDragOptions,
  cleanup: (fn: () => void) => void
): void {
  let candidate: HTMLElement | null = null;
  let pointerId = -1;
  let originX = 0;
  let originY = 0;
  let dragging = false;

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;

    if (!dragging) {
      const distance = Math.hypot(event.clientX - originX, event.clientY - originY);
      if (distance < 4 || !candidate) return;
      dragging = true;
      beginDrag(candidate, {
        mode: options.mode,
        data: options.data(),
        group: options.group(),
        axis: options.axis(),
        pointerId,
        x: originX,
        y: originY,
      });
    }

    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  };

  const stop = (): void => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    candidate = null;
    pointerId = -1;
    dragging = false;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) return;
    if (dragging) finishDrag();
    stop();
  };

  const onPointerCancel = (): void => {
    if (dragging) cancelDrag();
    stop();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || session) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // Controles interativos continuam clicaveis dentro do item arrastavel.
    if (target.closest('input,textarea,select,option,[contenteditable="true"]')) return;
    if (options.handle && !target.closest(options.handle)) return;

    const item = options.itemFrom(target);
    if (!item) return;

    candidate = item;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    dragging = false;

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  };

  root.addEventListener('pointerdown', onPointerDown);
  cleanup(() => {
    root.removeEventListener('pointerdown', onPointerDown);
    if (dragging) cancelDrag();
    stop();
  });
}

// ---------------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------------

/** Listas do mesmo grupo, na ordem em que aparecem no documento. */
function listsInGroup(group: string | null): HTMLElement[] {
  if (!group) return [];
  return Array.from(sortableRegistry.values())
    .filter((info) => info.group === group)
    .map((info) => info.el)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

/** Move um item pego pelo teclado dentro da lista ou para a lista vizinha. */
function keyboardMove(item: HTMLElement, key: string): boolean {
  if (!session) return false;
  const list = item.parentElement as HTMLElement | null;
  if (!list) return false;

  const horizontal = isHorizontal(list);
  const forward = key === 'ArrowDown' || (horizontal && key === 'ArrowRight');
  const backward = key === 'ArrowUp' || (horizontal && key === 'ArrowLeft');
  const siblings = itemsOf(list);
  const index = siblings.indexOf(item);

  if (forward || backward) {
    const target = index + (forward ? 1 : -1);
    if (target < 0 || target >= siblings.length) return false;
    if (forward) list.insertBefore(item, siblings[target].nextSibling);
    else list.insertBefore(item, siblings[target]);
    announce(`Posicao ${target + 1} de ${siblings.length}`);
    item.focus();
    return true;
  }

  // Setas laterais em listas verticais trocam de coluna, util em quadros.
  if (!horizontal && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    const lists = listsInGroup(session.group);
    const position = lists.indexOf(list);
    if (position === -1) return false;
    const next = lists[position + (key === 'ArrowRight' ? 1 : -1)];
    if (!next) return false;
    next.appendChild(item);
    announce(`Movido para a lista ${lists.indexOf(next) + 1} de ${lists.length}`);
    item.focus();
    return true;
  }
  return false;
}

/** Areas de soltura compativeis, usadas na navegacao por teclado. */
function droppableTargets(current: DragSession): HTMLElement[] {
  return Array.from(droppableRegistry.values())
    .filter((info) => dropAccepts(info, current))
    .map((info) => info.el);
}

// ---------------------------------------------------------------------------
// v-dnd-group
// ---------------------------------------------------------------------------

defineDirective('dnd-group', ({ el, expression }) => {
  ensureDnd();
  const name = expression.trim() || 'default';
  el.setAttribute('data-v-dnd-group', name);
  el.classList.add('v-dnd-group');
});

// ---------------------------------------------------------------------------
// v-sortable
// ---------------------------------------------------------------------------

defineDirective('sortable', ({ el, expression, cleanup }) => {
  ensureDnd();
  el.classList.add('v-sortable');

  const handle = readOption(el, 'sortable-handle') || expression.trim() || null;
  const info: SortableInfo = {
    el,
    group: groupOf(el, readOption(el, 'sortable-group')),
    handle,
  };
  sortableRegistry.set(el, info);

  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Lista reordenavel');

  /** Prepara um item: foco por teclado, alca e estado ARIA. */
  const prepare = (item: HTMLElement): void => {
    if (!item.hasAttribute('tabindex')) item.setAttribute('tabindex', '0');
    if (!item.hasAttribute('aria-grabbed')) item.setAttribute('aria-grabbed', 'false');
    if (handle) item.querySelector<HTMLElement>(handle)?.classList.add('v-drag-handle');
    else item.classList.add('v-drag-handle');
  };

  for (const item of itemsOf(el)) prepare(item);

  const observer =
    typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(() => {
          for (const item of itemsOf(el)) prepare(item);
        });
  observer?.observe(el, { childList: true });

  installPointerDrag(
    el,
    {
      mode: 'sort',
      handle,
      group: () => info.group,
      data: () => null,
      axis: () => null,
      itemFrom: (target) => {
        const item = itemsOf(el).find((child) => child === target || child.contains(target));
        return item ?? null;
      },
    },
    cleanup
  );

  // Arraste pelo teclado: espaco pega e solta, setas movem, Escape cancela.
  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const item = itemsOf(el).find((child) => child === target || child.contains(target));
    if (!item) return;

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (session && session.item === item) {
        finishDrag();
        announce('Item solto');
        return;
      }
      if (session) return;
      beginDrag(item, {
        mode: 'sort',
        data: null,
        group: info.group,
        axis: null,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true,
      });
      announce('Item pego. Use as setas para mover e espaco para soltar.');
      return;
    }

    if (!session || session.item !== item) return;
    if (event.key.startsWith('Arrow')) {
      if (keyboardMove(item, event.key)) event.preventDefault();
    }
  };

  el.addEventListener('keydown', onKeyDown);
  cleanup(() => {
    el.removeEventListener('keydown', onKeyDown);
    observer?.disconnect();
    sortableRegistry.delete(el);
  });
});

defineOption('sortable-group');
defineOption('sortable-handle');

// ---------------------------------------------------------------------------
// v-draggable
// ---------------------------------------------------------------------------

defineDirective('draggable', ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add('v-draggable');

  const handle = readOption(el, 'draggable-handle') || null;
  const axisRaw = (readOption(el, 'draggable-axis') || '').trim().toLowerCase();
  const axis = axisRaw === 'x' || axisRaw === 'y' ? (axisRaw as 'x' | 'y') : null;
  const dataExpression = readOption(el, 'draggable-data') || expression.trim();
  const group = groupOf(el, readOption(el, 'draggable-group'));

  if (handle) el.querySelector<HTMLElement>(handle)?.classList.add('v-drag-handle');
  else el.classList.add('v-drag-handle');

  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.setAttribute('aria-grabbed', 'false');
  if (!el.hasAttribute('aria-roledescription')) {
    el.setAttribute('aria-roledescription', 'item arrastavel');
  }

  const readData = (): unknown =>
    dataExpression ? evaluateIn<unknown>(dataExpression, scope, 'v-draggable-data') : null;

  installPointerDrag(
    el,
    {
      mode: 'free',
      handle,
      group: () => group,
      data: readData,
      axis: () => axis,
      itemFrom: () => el,
    },
    cleanup
  );

  // Pelo teclado: espaco pega, setas percorrem os destinos, espaco solta.
  let targets: HTMLElement[] = [];
  let cursor = 0;

  const highlight = (): void => {
    targets.forEach((target, index) => target.classList.toggle('v-drop-over', index === cursor));
    const active = targets[cursor];
    if (!active || !session) return;
    session.overDrop = active;
    if (!device.reducedMotion) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    else active.scrollIntoView({ block: 'nearest' });
    announce(active.getAttribute('aria-label') || `Destino ${cursor + 1} de ${targets.length}`);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (session && session.item === el) {
        finishDrag();
        targets = [];
        return;
      }
      if (session) return;
      beginDrag(el, {
        mode: 'free',
        data: readData(),
        group,
        axis,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true,
      });
      targets = session ? droppableTargets(session) : [];
      cursor = 0;
      if (targets.length) highlight();
      else announce('Nenhum destino disponivel');
      return;
    }

    if (!session || session.item !== el || !targets.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      cursor = (cursor + 1) % targets.length;
      highlight();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      cursor = (cursor - 1 + targets.length) % targets.length;
      highlight();
    }
  };

  el.addEventListener('keydown', onKeyDown);
  cleanup(() => {
    el.removeEventListener('keydown', onKeyDown);
    for (const target of targets) target.classList.remove('v-drop-over');
  });
});

defineOption('draggable-handle');
defineOption('draggable-axis');
defineOption('draggable-data');
defineOption('draggable-group');

// ---------------------------------------------------------------------------
// v-droppable
// ---------------------------------------------------------------------------

defineDirective('droppable', ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add('v-droppable');

  const info: DroppableInfo = {
    el,
    group: groupOf(el, readOption(el, 'droppable-group')),
    accept: readOption(el, 'droppable-accept'),
    expression,
    scope,
  };
  droppableRegistry.set(el, info);

  if (!el.hasAttribute('aria-dropeffect')) el.setAttribute('aria-dropeffect', 'move');

  cleanup(() => {
    droppableRegistry.delete(el);
    el.classList.remove('v-drop-over', 'v-drop-active');
  });
});

defineOption('droppable-accept');
defineOption('droppable-group');

/** Nome do atributo lido por `v-dnd-group`, exportado para documentacao. */
export const DND_GROUP_ATTRIBUTE = 'data-v-dnd-group';

/** Indica se existe um arraste em andamento. Util em testes e integracoes. */
export function isDragging(): boolean {
  return session !== null;
}

/** Cancela o arraste em andamento, se houver. */
export function cancelDragging(): void {
  cancelDrag();
}
