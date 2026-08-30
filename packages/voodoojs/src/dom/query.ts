/**
 * @module dom/query
 *
 * Colecao encadeavel de elementos. A ideia e a mesma do jQuery: selecionar,
 * percorrer e manipular com poucas linhas. A diferenca esta na tipagem estrita,
 * na iteracao nativa com `for...of`, no zero de dependencias e na integracao com
 * o runtime da Voodoo: remover ou esvaziar elementos desmonta os efeitos
 * reativos ligados a eles, o que evita vazamento.
 *
 * ```js
 * V.query('.card')
 *   .addClass('ativo')
 *   .on('click', '.botao', function () { V.query(this).closest('.card').remove() })
 * ```
 */

import { handleError } from '../reactivity';
import { whenBodyReady } from '../runtime/boot';
import { destroy as destroyNode, findScope, walk as walkNode } from '../runtime/walker';
import {
  fadeIn as fadeInElement,
  fadeOut as fadeOutElement,
  slideDown as slideDownElement,
  slideUp as slideUpElement,
} from './transition';

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

/** Funcao executada quando o documento fica pronto. */
export type ReadyCallback = () => void;

/** Manipulador de evento. `this` aponta para o elemento que casou com o filtro. */
export type QueryEventHandler = (this: HTMLElement, event: Event) => unknown;

/** Tudo que `query()` aceita como entrada. */
export type QueryInput =
  | string
  | Node
  | Element
  | Document
  | DocumentFragment
  | ArrayLike<Node>
  | VoodooCollection
  | ReadyCallback
  | null
  | undefined;

/** Filtro aceito por `filter`, `not` e `is`. */
export type QueryFilter = string | ((el: HTMLElement, index: number) => boolean);

/** Coordenadas devolvidas por `offset` e `position`. */
export interface QueryPoint {
  top: number;
  left: number;
}

/** Valor aceito na escrita de atributos e propriedades simples. */
export type QueryValue = string | number | boolean | null;

// ---------------------------------------------------------------------------
// Auxiliares internos
// ---------------------------------------------------------------------------

/** Propriedades CSS que nao recebem `px` automaticamente. */
const UNITLESS = new Set([
  'animation-iteration-count',
  'aspect-ratio',
  'border-image-slice',
  'column-count',
  'flex',
  'flex-grow',
  'flex-shrink',
  'font-weight',
  'grid-area',
  'grid-column',
  'grid-row',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
]);

/** Converte `backgroundColor` em `background-color`. */
function kebab(property: string): string {
  if (property.startsWith('--')) return property;
  return property.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}

/** Remove repeticoes preservando a ordem de entrada. */
function distinct(list: HTMLElement[]): HTMLElement[] {
  if (list.length < 2) return list;
  return Array.from(new Set(list));
}

/** Divide uma lista de nomes separados por espaco. */
function names(value: string): string[] {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

/** Converte uma string de HTML nos elementos correspondentes. */
function parseHtml(html: string): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const out: HTMLElement[] = [];
  for (const child of Array.from(template.content.children)) out.push(child as HTMLElement);
  return out;
}

/** Detecta uma string que descreve HTML em vez de um seletor. */
function looksLikeHtml(text: string): boolean {
  return text.length > 2 && text.charCodeAt(0) === 60 /* < */ && text.endsWith('>');
}

/** Raizes onde o seletor sera aplicado. */
function contextRoots(context?: QueryInput): ParentNode[] {
  if (context == null) return typeof document === 'undefined' ? [] : [document];
  if (context instanceof VoodooCollection) return context.toArray();
  if (typeof context === 'string') return resolve(context);
  if (typeof context === 'function') return typeof document === 'undefined' ? [] : [document];
  const list = resolve(context);
  if (list.length) return list;
  return typeof document === 'undefined' ? [] : [document];
}

/** Normaliza qualquer entrada aceita em uma lista de elementos. */
function resolve(input: QueryInput, context?: QueryInput): HTMLElement[] {
  if (input == null) return [];

  if (typeof input === 'string') {
    const text = input.trim();
    if (!text) return [];
    if (looksLikeHtml(text)) return parseHtml(text);
    const out: HTMLElement[] = [];
    for (const root of contextRoots(context)) {
      try {
        for (const found of Array.from(root.querySelectorAll(text))) out.push(found as HTMLElement);
      } catch {
        // Seletor invalido devolve colecao vazia em vez de derrubar a pagina.
      }
    }
    return distinct(out);
  }

  if (input instanceof VoodooCollection) return input.toArray();

  if (typeof input === 'function') return [];

  const node = input as Node;
  if (typeof node.nodeType === 'number') {
    if (node.nodeType === 1) return [node as HTMLElement];
    if (node.nodeType === 9) {
      const doc = node as Document;
      return doc.documentElement ? [doc.documentElement] : [];
    }
    if (node.nodeType === 11) {
      return Array.from((node as DocumentFragment).children) as HTMLElement[];
    }
    return [];
  }

  const arrayLike = input as ArrayLike<Node>;
  if (typeof arrayLike.length === 'number') {
    const out: HTMLElement[] = [];
    for (let i = 0; i < arrayLike.length; i++) {
      const item = arrayLike[i];
      if (item && item.nodeType === 1) out.push(item as HTMLElement);
    }
    return distinct(out);
  }

  return [];
}

/** Converte conteudo aceito por `append` e amigos em nos prontos para inserir. */
function contentNodes(content: QueryInput): Node[] {
  if (content == null) return [];
  if (typeof content === 'string') {
    const text = content;
    if (looksLikeHtml(text.trim())) return parseHtml(text);
    return [document.createTextNode(text)];
  }
  if (content instanceof VoodooCollection) return content.toArray();
  if (typeof content === 'function') return [];
  const node = content as Node;
  if (typeof node.nodeType === 'number') return [node];
  const arrayLike = content as ArrayLike<Node>;
  if (typeof arrayLike.length === 'number') {
    const out: Node[] = [];
    for (let i = 0; i < arrayLike.length; i++) if (arrayLike[i]) out.push(arrayLike[i]);
    return out;
  }
  return [];
}

/** Aplica uma propriedade de estilo cuidando da unidade padrao. */
function setStyle(el: HTMLElement, property: string, value: string | number | null): void {
  const name = kebab(property);
  if (value === null || value === '') {
    el.style.removeProperty(name);
    return;
  }
  const text =
    typeof value === 'number' && !UNITLESS.has(name) && !name.startsWith('--')
      ? `${value}px`
      : String(value);
  el.style.setProperty(name, text);
}

/** Aplica varias propriedades de uma vez. */
function applyStyles(el: HTMLElement, values: Record<string, string | number | null>): void {
  for (const [property, value] of Object.entries(values)) setStyle(el, property, value);
}

/** Le um valor de `dataset` convertendo JSON, numero e booleano quando der. */
function parseDataValue(raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  if (raw === '') return '';
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const first = raw.charCodeAt(0);
  if (first === 123 /* { */ || first === 91 /* [ */ || first === 34 /* " */) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/** Converte `minha-chave` em `minhaChave`, o formato usado por `dataset`. */
function datasetKey(key: string): string {
  return key.replace(/-([a-z0-9])/g, (_all, ch: string) => ch.toUpperCase());
}

/** Display original guardado por `hide`, restaurado por `show`. */
const savedDisplay = new WeakMap<HTMLElement, string>();

/** Verifica se o elemento esta escondido no momento. */
function elementHidden(el: HTMLElement): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.style.display === 'none') return true;
  return !el.isConnected ? false : getComputedStyle(el).display === 'none';
}

/** Mostra um elemento restaurando o `display` anterior. */
function showElement(el: HTMLElement): void {
  el.removeAttribute('hidden');
  const previous = savedDisplay.get(el);
  if (previous !== undefined && previous !== 'none') el.style.display = previous;
  else el.style.removeProperty('display');
  if (el.isConnected && getComputedStyle(el).display === 'none') el.style.display = 'block';
}

/** Esconde um elemento guardando o `display` atual. */
function hideElement(el: HTMLElement): void {
  const current = el.style.display;
  if (current && current !== 'none') savedDisplay.set(el, current);
  el.style.display = 'none';
}

/** Controles de formulario considerados por `serialize`. */
const FORM_CONTROLS = 'input,select,textarea';

/** Le os pares nome e valor de um formulario ou de um trecho com campos. */
function formControls(el: HTMLElement): HTMLElement[] {
  if (el.matches(FORM_CONTROLS)) return [el];
  return Array.from(el.querySelectorAll<HTMLElement>(FORM_CONTROLS));
}

/** Indica se o controle entra na serializacao padrao de formulario. */
function isSerializable(control: HTMLElement): boolean {
  const field = control as HTMLInputElement;
  if (!field.name || field.disabled) return false;
  const type = (field.getAttribute('type') || '').toLowerCase();
  if (type === 'file' || type === 'submit' || type === 'reset' || type === 'button') return false;
  if ((type === 'checkbox' || type === 'radio') && !field.checked) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Registro de eventos, necessario para `off` funcionar com delegacao
// ---------------------------------------------------------------------------

interface BoundEvent {
  type: string;
  selector: string | null;
  handler: QueryEventHandler;
  wrapped: EventListener;
  options: AddEventListenerOptions;
}

const eventStore = new WeakMap<HTMLElement, BoundEvent[]>();

function bindingsOf(el: HTMLElement): BoundEvent[] {
  let list = eventStore.get(el);
  if (!list) eventStore.set(el, (list = []));
  return list;
}

// ---------------------------------------------------------------------------
// A colecao
// ---------------------------------------------------------------------------

/**
 * Lista imutavel de elementos com metodos encadeaveis. Instancias sao criadas
 * por `query()`, nunca com `new` no codigo do usuario.
 */
export class VoodooCollection implements Iterable<HTMLElement> {
  /** Acesso indexado, como em `colecao[0]`. */
  [index: number]: HTMLElement;

  /** Quantidade de elementos da colecao. */
  readonly length: number;

  /** Elementos da colecao, na ordem em que foram encontrados. */
  readonly elements: HTMLElement[];

  constructor(elements: HTMLElement[] = []) {
    this.elements = elements;
    this.length = elements.length;
    const indexed = this as unknown as Record<number, HTMLElement>;
    for (let i = 0; i < elements.length; i++) indexed[i] = elements[i];
  }

  /** Permite `for (const el of query('.item'))`. */
  [Symbol.iterator](): Iterator<HTMLElement> {
    return this.elements[Symbol.iterator]();
  }

  // -------------------------------------------------------------------------
  // Travessia
  // -------------------------------------------------------------------------

  /** Descendentes que casam com o seletor. */
  find(selector: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      try {
        for (const found of Array.from(el.querySelectorAll(selector))) out.push(found as HTMLElement);
      } catch {
        // Seletor invalido nao interrompe a cadeia.
      }
    }
    return new VoodooCollection(distinct(out));
  }

  /** Ancestral mais proximo, incluindo o proprio elemento. */
  closest(selector: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      const found = el.closest(selector);
      if (found) out.push(found as HTMLElement);
    }
    return new VoodooCollection(distinct(out));
  }

  /** Elemento pai de cada item, opcionalmente filtrado. */
  parent(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && (!selector || parent.matches(selector))) out.push(parent);
    }
    return new VoodooCollection(distinct(out));
  }

  /** Todos os ancestrais, do mais proximo ao mais distante. */
  parents(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      let current = el.parentElement;
      while (current) {
        if (!selector || current.matches(selector)) out.push(current);
        current = current.parentElement;
      }
    }
    return new VoodooCollection(distinct(out));
  }

  /** Filhos diretos, opcionalmente filtrados. */
  children(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      for (const child of Array.from(el.children)) {
        if (!selector || child.matches(selector)) out.push(child as HTMLElement);
      }
    }
    return new VoodooCollection(distinct(out));
  }

  /** Irmaos, sem incluir os proprios elementos. */
  siblings(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (!parent) continue;
      for (const child of Array.from(parent.children)) {
        if (child === el) continue;
        if (!selector || child.matches(selector)) out.push(child as HTMLElement);
      }
    }
    return new VoodooCollection(distinct(out));
  }

  /** Proximo irmao de cada elemento. */
  next(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      const sibling = el.nextElementSibling as HTMLElement | null;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new VoodooCollection(distinct(out));
  }

  /** Irmao anterior de cada elemento. */
  prev(selector?: string): VoodooCollection {
    const out: HTMLElement[] = [];
    for (const el of this.elements) {
      const sibling = el.previousElementSibling as HTMLElement | null;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new VoodooCollection(distinct(out));
  }

  /** Somente o primeiro elemento. */
  first(): VoodooCollection {
    return this.eq(0);
  }

  /** Somente o ultimo elemento. */
  last(): VoodooCollection {
    return this.eq(-1);
  }

  /** Elemento na posicao informada. Indices negativos contam do fim. */
  eq(index: number): VoodooCollection {
    const position = index < 0 ? this.elements.length + index : index;
    const el = this.elements[position];
    return new VoodooCollection(el ? [el] : []);
  }

  /** Mantem apenas os elementos que passam no filtro. */
  filter(test: QueryFilter): VoodooCollection {
    const out = this.elements.filter((el, index) =>
      typeof test === 'function' ? test(el, index) : el.matches(test)
    );
    return new VoodooCollection(out);
  }

  /** Remove da colecao os elementos que passam no filtro. */
  not(test: QueryFilter): VoodooCollection {
    const out = this.elements.filter((el, index) =>
      typeof test === 'function' ? !test(el, index) : !el.matches(test)
    );
    return new VoodooCollection(out);
  }

  /** Mantem os elementos que contem o descendente informado. */
  has(target: string | Element): VoodooCollection {
    const out = this.elements.filter((el) =>
      typeof target === 'string' ? el.querySelector(target) !== null : el.contains(target)
    );
    return new VoodooCollection(out);
  }

  /** Verifica se ao menos um elemento casa com o filtro. */
  is(test: QueryFilter): boolean {
    return this.elements.some((el, index) =>
      typeof test === 'function' ? test(el, index) : el.matches(test)
    );
  }

  /** Projeta cada elemento em um valor e devolve um array comum. */
  map<T>(fn: (el: HTMLElement, index: number) => T): T[] {
    return this.elements.map((el, index) => fn(el, index));
  }

  /** Percorre a colecao. Dentro da funcao, `this` e o elemento atual. */
  each(fn: (this: HTMLElement, el: HTMLElement, index: number) => unknown): this {
    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];
      if (fn.call(el, el, i) === false) break;
    }
    return this;
  }

  /** Sem argumento devolve o array; com indice devolve um elemento. */
  get(): HTMLElement[];
  get(index: number): HTMLElement | undefined;
  get(...rest: unknown[]): HTMLElement[] | HTMLElement | undefined {
    if (!rest.length) return this.toArray();
    const index = Number(rest[0]);
    return this.elements[index < 0 ? this.elements.length + index : index];
  }

  /** Copia dos elementos como array comum. */
  toArray(): HTMLElement[] {
    return this.elements.slice();
  }

  /** Junta outros elementos a colecao, sem repetir. */
  add(input: QueryInput, context?: QueryInput): VoodooCollection {
    return new VoodooCollection(distinct([...this.elements, ...resolve(input, context)]));
  }

  /** Recorte da colecao, com a mesma semantica de `Array.prototype.slice`. */
  slice(start?: number, end?: number): VoodooCollection {
    return new VoodooCollection(this.elements.slice(start, end));
  }

  // -------------------------------------------------------------------------
  // Conteudo
  // -------------------------------------------------------------------------

  /** Le o texto do primeiro elemento ou escreve em todos. */
  text(): string;
  text(value: string | number | null): this;
  text(...rest: unknown[]): string | this {
    if (!rest.length) return this.elements[0]?.textContent ?? '';
    const value = rest[0];
    const text = value == null ? '' : String(value);
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroyNode(child);
      el.textContent = text;
    }
    return this;
  }

  /** Le o HTML interno do primeiro elemento ou escreve em todos. */
  html(): string;
  html(value: string | null): this;
  html(...rest: unknown[]): string | this {
    if (!rest.length) return this.elements[0]?.innerHTML ?? '';
    const value = rest[0];
    const text = value == null ? '' : String(value);
    for (const el of this.elements) {
      // Desmonta o conteudo antigo para nao deixar efeitos orfaos.
      for (const child of Array.from(el.childNodes)) destroyNode(child);
      el.innerHTML = text;
    }
    return this;
  }

  /** Le o valor do primeiro campo ou escreve em todos. */
  val(): string | string[];
  val(value: string | number | boolean | string[] | null): this;
  val(...rest: unknown[]): string | string[] | this {
    if (!rest.length) {
      const field = this.elements[0] as HTMLInputElement | undefined;
      if (!field) return '';
      const select = field as unknown as HTMLSelectElement;
      if (field.tagName === 'SELECT' && select.multiple) {
        return Array.from(select.selectedOptions).map((option) => option.value);
      }
      if (field.type === 'checkbox') return field.checked ? field.value || 'on' : '';
      return field.value ?? '';
    }

    const value = rest[0];
    for (const el of this.elements) {
      const field = el as HTMLInputElement;
      const select = el as unknown as HTMLSelectElement;
      if (field.tagName === 'SELECT' && select.multiple) {
        const wanted = (Array.isArray(value) ? value : [value]).map(String);
        for (const option of Array.from(select.options)) option.selected = wanted.includes(option.value);
        continue;
      }
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = Array.isArray(value)
          ? value.map(String).includes(field.value)
          : value === true || String(value) === field.value;
        continue;
      }
      field.value = value == null ? '' : String(value);
    }
    return this;
  }

  /** Le um atributo do primeiro elemento, ou escreve um ou varios. */
  attr(name: string): string | undefined;
  attr(name: string, value: QueryValue): this;
  attr(values: Record<string, QueryValue>): this;
  attr(...rest: unknown[]): string | undefined | this {
    const first = rest[0];
    if (first !== null && typeof first === 'object') {
      for (const el of this.elements) {
        for (const [name, value] of Object.entries(first as Record<string, QueryValue>)) {
          if (value === null || value === false) el.removeAttribute(name);
          else el.setAttribute(name, value === true ? '' : String(value));
        }
      }
      return this;
    }

    const name = String(first);
    if (rest.length < 2) return this.elements[0]?.getAttribute(name) ?? undefined;

    const value = rest[1] as QueryValue;
    for (const el of this.elements) {
      if (value === null || value === false) el.removeAttribute(name);
      else el.setAttribute(name, value === true ? '' : String(value));
    }
    return this;
  }

  /** Remove um ou varios atributos, separados por espaco. */
  removeAttr(name: string): this {
    const list = names(name);
    for (const el of this.elements) for (const attribute of list) el.removeAttribute(attribute);
    return this;
  }

  /** Le uma propriedade do primeiro elemento ou escreve em todos. */
  prop<T = unknown>(name: string): T | undefined;
  prop(name: string, value: unknown): this;
  prop(...rest: unknown[]): unknown {
    const name = String(rest[0]);
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? (el as unknown as Record<string, unknown>)[name] : undefined;
    }
    for (const el of this.elements) (el as unknown as Record<string, unknown>)[name] = rest[1];
    return this;
  }

  /**
   * Le e escreve em `dataset`. A leitura converte JSON, numero e booleano,
   * entao `data-config='{"a":1}'` volta como objeto de verdade.
   */
  data(): Record<string, unknown>;
  data(key: string): unknown;
  data(key: string, value: unknown): this;
  data(values: Record<string, unknown>): this;
  data(...rest: unknown[]): unknown {
    const first = rest[0];

    if (!rest.length) {
      const el = this.elements[0];
      if (!el) return {};
      const out: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(el.dataset)) out[key] = parseDataValue(raw);
      return out;
    }

    if (first !== null && typeof first === 'object') {
      for (const el of this.elements) {
        for (const [key, value] of Object.entries(first as Record<string, unknown>)) {
          el.dataset[datasetKey(key)] =
            typeof value === 'string' ? value : JSON.stringify(value ?? null);
        }
      }
      return this;
    }

    const key = datasetKey(String(first));
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? parseDataValue(el.dataset[key]) : undefined;
    }

    const value = rest[1];
    for (const el of this.elements) {
      el.dataset[key] = typeof value === 'string' ? value : JSON.stringify(value ?? null);
    }
    return this;
  }

  /** Le um estilo computado ou aplica um ou varios estilos. */
  css(property: string): string;
  css(property: string, value: string | number | null): this;
  css(values: Record<string, string | number | null>): this;
  css(...rest: unknown[]): string | this {
    const first = rest[0];
    if (first !== null && typeof first === 'object') {
      for (const el of this.elements) applyStyles(el, first as Record<string, string | number | null>);
      return this;
    }

    const property = String(first);
    if (rest.length < 2) {
      const el = this.elements[0];
      if (!el) return '';
      const name = kebab(property);
      const computed = el.isConnected ? getComputedStyle(el).getPropertyValue(name) : '';
      return (computed || el.style.getPropertyValue(name)).trim();
    }

    for (const el of this.elements) setStyle(el, property, rest[1] as string | number | null);
    return this;
  }

  /** Largura em pixels do primeiro elemento, ou escrita em todos. */
  width(): number;
  width(value: string | number): this;
  width(...rest: unknown[]): number | this {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().width : 0;
    }
    for (const el of this.elements) setStyle(el, 'width', rest[0] as string | number);
    return this;
  }

  /** Altura em pixels do primeiro elemento, ou escrita em todos. */
  height(): number;
  height(value: string | number): this;
  height(...rest: unknown[]): number | this {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().height : 0;
    }
    for (const el of this.elements) setStyle(el, 'height', rest[0] as string | number);
    return this;
  }

  /** Posicao do primeiro elemento em relacao ao documento. */
  offset(): QueryPoint {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
  }

  /** Posicao do primeiro elemento em relacao ao ancestral posicionado. */
  position(): QueryPoint {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    return { top: el.offsetTop, left: el.offsetLeft };
  }

  /** Le a rolagem vertical do primeiro elemento ou escreve em todos. */
  scrollTop(): number;
  scrollTop(value: number): this;
  scrollTop(...rest: unknown[]): number | this {
    if (!rest.length) return this.elements[0]?.scrollTop ?? 0;
    const value = Number(rest[0]) || 0;
    for (const el of this.elements) el.scrollTop = value;
    return this;
  }

  // -------------------------------------------------------------------------
  // Classes
  // -------------------------------------------------------------------------

  /** Adiciona uma ou varias classes separadas por espaco. */
  addClass(value: string): this {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.add(...list);
    return this;
  }

  /** Remove uma ou varias classes separadas por espaco. */
  removeClass(value: string): this {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.remove(...list);
    return this;
  }

  /** Alterna classes. O segundo argumento forca ligar ou desligar. */
  toggleClass(value: string, force?: boolean): this {
    const list = names(value);
    for (const el of this.elements) {
      for (const cls of list) {
        if (force === undefined) el.classList.toggle(cls);
        else el.classList.toggle(cls, force);
      }
    }
    return this;
  }

  /** Verdadeiro quando algum elemento tem todas as classes informadas. */
  hasClass(value: string): boolean {
    const list = names(value);
    if (!list.length) return false;
    return this.elements.some((el) => list.every((cls) => el.classList.contains(cls)));
  }

  // -------------------------------------------------------------------------
  // Manipulacao de DOM
  // -------------------------------------------------------------------------

  /**
   * Base de `append`, `prepend`, `before` e `after`. Quando a colecao tem mais
   * de um elemento, cada destino recebe uma copia e o ultimo fica com o
   * original, que e o comportamento esperado por quem vem do jQuery.
   */
  private insert(content: QueryInput, place: (el: HTMLElement, node: Node) => void): this {
    const total = this.elements.length;
    for (let i = 0; i < total; i++) {
      const el = this.elements[i];
      for (const node of contentNodes(content)) {
        place(el, i === total - 1 ? node : node.cloneNode(true));
      }
    }
    return this;
  }

  /** Insere conteudo no fim de cada elemento. */
  append(content: QueryInput): this {
    return this.insert(content, (el, node) => el.appendChild(node));
  }

  /** Insere conteudo no inicio de cada elemento. */
  prepend(content: QueryInput): this {
    return this.insert(content, (el, node) => el.insertBefore(node, el.firstChild));
  }

  /** Insere conteudo antes de cada elemento. */
  before(content: QueryInput): this {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el));
  }

  /** Insere conteudo depois de cada elemento. */
  after(content: QueryInput): this {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el.nextSibling));
  }

  /** Move os elementos da colecao para dentro do destino. */
  appendTo(target: QueryInput): this {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      for (const el of this.elements) {
        targets[i].appendChild(i === targets.length - 1 ? el : (el.cloneNode(true) as HTMLElement));
      }
    }
    return this;
  }

  /** Move os elementos da colecao para o inicio do destino. */
  prependTo(target: QueryInput): this {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      const parent = targets[i];
      const nodes = this.elements.map((el) =>
        i === targets.length - 1 ? el : (el.cloneNode(true) as HTMLElement)
      );
      for (let j = nodes.length - 1; j >= 0; j--) parent.insertBefore(nodes[j], parent.firstChild);
    }
    return this;
  }

  /** Troca cada elemento pelo conteudo informado, desmontando o antigo. */
  replaceWith(content: QueryInput): this {
    for (const el of this.elements) {
      const parent = el.parentNode;
      if (!parent) continue;
      for (const node of contentNodes(content)) parent.insertBefore(node, el);
      destroyNode(el);
      el.remove();
    }
    return this;
  }

  /** Envolve cada elemento com o HTML ou elemento informado. */
  wrap(wrapper: QueryInput): this {
    for (const el of this.elements) {
      const model = resolve(wrapper)[0];
      if (!model) continue;
      const clone = model.cloneNode(true) as HTMLElement;
      el.parentNode?.insertBefore(clone, el);
      let deepest: HTMLElement = clone;
      while (deepest.firstElementChild) deepest = deepest.firstElementChild as HTMLElement;
      deepest.appendChild(el);
    }
    return this;
  }

  /** Remove o pai de cada elemento, mantendo os filhos no lugar. */
  unwrap(): this {
    const parents = new Set<HTMLElement>();
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && parent !== document.body) parents.add(parent);
    }
    for (const parent of parents) {
      const grand = parent.parentNode;
      if (!grand) continue;
      while (parent.firstChild) grand.insertBefore(parent.firstChild, parent);
      destroyNode(parent);
      parent.remove();
    }
    return this;
  }

  /** Remove os elementos do documento e desmonta os efeitos reativos. */
  remove(): this {
    for (const el of this.elements) {
      destroyNode(el);
      el.remove();
    }
    return this;
  }

  /** Esvazia os elementos, desmontando o conteudo removido. */
  empty(): this {
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroyNode(child);
      el.replaceChildren();
    }
    return this;
  }

  /** Copia os elementos. A copia nasce sem directives inicializadas. */
  clone(deep = true): VoodooCollection {
    return new VoodooCollection(this.elements.map((el) => el.cloneNode(deep) as HTMLElement));
  }

  // -------------------------------------------------------------------------
  // Eventos
  // -------------------------------------------------------------------------

  /**
   * Escuta eventos. Com o segundo argumento em texto, usa delegacao:
   * `on('click', '.item', fn)` continua funcionando para itens criados depois.
   */
  on(types: string, handler: QueryEventHandler, options?: AddEventListenerOptions): this;
  on(
    types: string,
    selector: string,
    handler: QueryEventHandler,
    options?: AddEventListenerOptions
  ): this;
  on(types: string, ...rest: unknown[]): this {
    const delegated = typeof rest[0] === 'string';
    const selector = delegated ? (rest[0] as string) : null;
    const handler = (delegated ? rest[1] : rest[0]) as QueryEventHandler;
    const options = ((delegated ? rest[2] : rest[1]) as AddEventListenerOptions) ?? {};
    if (typeof handler !== 'function') return this;

    for (const el of this.elements) {
      for (const type of names(types)) {
        const wrapped: EventListener = (event: Event) => {
          if (!selector) {
            handler.call(el, event);
            return;
          }
          const start = event.target as Element | null;
          const matched = start?.closest(selector) as HTMLElement | null;
          if (!matched || !el.contains(matched)) return;
          handler.call(matched, event);
        };
        el.addEventListener(type, wrapped, options);
        bindingsOf(el).push({ type, selector, handler, wrapped, options });
      }
    }
    return this;
  }

  /**
   * Remove escutas registradas por `on`. Sem argumentos remove todas, com tipo
   * remove as daquele evento, e com seletor ou funcao afina ainda mais.
   */
  off(types?: string, selectorOrHandler?: string | QueryEventHandler, handler?: QueryEventHandler): this {
    const wantedSelector = typeof selectorOrHandler === 'string' ? selectorOrHandler : null;
    const wantedHandler =
      typeof selectorOrHandler === 'function' ? selectorOrHandler : handler ?? null;
    const wantedTypes = types ? names(types) : null;

    for (const el of this.elements) {
      const list = eventStore.get(el);
      if (!list) continue;
      const keep: BoundEvent[] = [];
      for (const binding of list) {
        const matchType = !wantedTypes || wantedTypes.includes(binding.type);
        const matchSelector = wantedSelector === null || binding.selector === wantedSelector;
        const matchHandler = wantedHandler === null || binding.handler === wantedHandler;
        if (matchType && matchSelector && matchHandler) {
          el.removeEventListener(binding.type, binding.wrapped, binding.options);
        } else {
          keep.push(binding);
        }
      }
      eventStore.set(el, keep);
    }
    return this;
  }

  /** Escuta uma unica vez. Aceita delegacao igual a `on`. */
  once(types: string, handler: QueryEventHandler): this;
  once(types: string, selector: string, handler: QueryEventHandler): this;
  once(types: string, ...rest: unknown[]): this {
    const delegated = typeof rest[0] === 'string';
    const selector = delegated ? (rest[0] as string) : null;
    const handler = (delegated ? rest[1] : rest[0]) as QueryEventHandler;
    if (typeof handler !== 'function') return this;

    const self = this;
    const wrapper: QueryEventHandler = function (this: HTMLElement, event: Event) {
      if (selector) self.off(types, selector, wrapper);
      else self.off(types, wrapper);
      return handler.call(this, event);
    };

    if (selector) return this.on(types, selector, wrapper);
    return this.on(types, wrapper);
  }

  /**
   * Dispara um evento. Eventos nativos com metodo proprio, como `click` e
   * `focus`, usam o metodo do elemento quando nao ha `detail`.
   */
  trigger(type: string, detail?: unknown): this {
    for (const el of this.elements) {
      if (detail === undefined && typeof (el as unknown as Record<string, unknown>)[type] === 'function') {
        (el as unknown as Record<string, () => void>)[type]();
        continue;
      }
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      (event as unknown as Record<string, unknown>).__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }

  /** Dispara um evento customizado que sobe pela arvore, no estilo componente. */
  emit(type: string, detail?: unknown): this {
    for (const el of this.elements) {
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      (event as unknown as Record<string, unknown>).__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }

  // -------------------------------------------------------------------------
  // Visibilidade e animacao
  // -------------------------------------------------------------------------

  /** Mostra os elementos restaurando o display anterior. */
  show(): this {
    for (const el of this.elements) showElement(el);
    return this;
  }

  /** Esconde os elementos guardando o display atual. */
  hide(): this {
    for (const el of this.elements) hideElement(el);
    return this;
  }

  /** Alterna a visibilidade. O argumento forca mostrar ou esconder. */
  toggle(force?: boolean): this {
    for (const el of this.elements) {
      const visible = force === undefined ? elementHidden(el) : force;
      if (visible) showElement(el);
      else hideElement(el);
    }
    return this;
  }

  /** Aparecimento com fade. */
  fadeIn(duration = 220): this {
    for (const el of this.elements) {
      el.removeAttribute('hidden');
      void fadeInElement(el, duration);
    }
    return this;
  }

  /** Desaparecimento com fade, terminando escondido. */
  fadeOut(duration = 220): this {
    for (const el of this.elements) void fadeOutElement(el, duration);
    return this;
  }

  /** Recolhe a altura ate zero. */
  slideUp(duration = 240): this {
    for (const el of this.elements) void slideUpElement(el, duration);
    return this;
  }

  /** Expande a altura ate o conteudo. */
  slideDown(duration = 240): this {
    for (const el of this.elements) {
      el.removeAttribute('hidden');
      void slideDownElement(el, duration);
    }
    return this;
  }

  /** Alterna entre recolher e expandir. */
  slideToggle(duration = 240): this {
    for (const el of this.elements) {
      if (elementHidden(el)) {
        el.removeAttribute('hidden');
        void slideDownElement(el, duration);
      } else {
        void slideUpElement(el, duration);
      }
    }
    return this;
  }

  /** Animacao pela Web Animations API. */
  animate(
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: number | KeyframeAnimationOptions = 300
  ): this {
    for (const el of this.elements) {
      if (typeof el.animate !== 'function') continue;
      el.animate(keyframes, options);
    }
    return this;
  }

  /** Rola a pagina ate o primeiro elemento. */
  scrollIntoView(options: boolean | ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' }): this {
    this.elements[0]?.scrollIntoView(options as ScrollIntoViewOptions);
    return this;
  }

  // -------------------------------------------------------------------------
  // Formulario
  // -------------------------------------------------------------------------

  /** Serializa os campos do primeiro elemento no formato de query string. */
  serialize(): string {
    const el = this.elements[0];
    if (!el) return '';
    const params = new URLSearchParams();
    for (const control of formControls(el)) {
      if (!isSerializable(control)) continue;
      const field = control as HTMLInputElement;
      const select = control as unknown as HTMLSelectElement;
      if (field.tagName === 'SELECT' && select.multiple) {
        for (const option of Array.from(select.selectedOptions)) params.append(field.name, option.value);
        continue;
      }
      params.append(field.name, field.value);
    }
    return params.toString();
  }

  /**
   * Serializa os campos em um objeto. Nomes repetidos e nomes terminados em
   * `[]` viram array, caixas de selecao viram booleano e campos numericos viram
   * numero.
   */
  serializeObject(): Record<string, unknown> {
    const el = this.elements[0];
    const out: Record<string, unknown> = {};
    if (!el) return out;

    for (const control of formControls(el)) {
      const field = control as HTMLInputElement;
      if (!field.name || field.disabled) continue;
      const type = (field.getAttribute('type') || '').toLowerCase();
      if (type === 'submit' || type === 'reset' || type === 'button') continue;

      const isList = field.name.endsWith('[]');
      const key = isList ? field.name.slice(0, -2) : field.name;
      const select = control as unknown as HTMLSelectElement;

      let value: unknown;
      if (type === 'checkbox') {
        if (!field.checked && !isList) {
          out[key] = out[key] ?? false;
          continue;
        }
        if (!field.checked) continue;
        value = field.value === 'on' ? true : field.value;
      } else if (type === 'radio') {
        if (!field.checked) continue;
        value = field.value;
      } else if (type === 'file') {
        value = field.multiple ? Array.from(field.files ?? []) : field.files?.[0] ?? null;
      } else if (field.tagName === 'SELECT' && select.multiple) {
        value = Array.from(select.selectedOptions).map((option) => option.value);
      } else if (type === 'number' || type === 'range') {
        value = field.value === '' ? null : Number(field.value);
      } else {
        value = field.value;
      }

      if (isList) {
        const current = out[key];
        if (Array.isArray(current)) current.push(value);
        else out[key] = [value];
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        const current = out[key];
        if (Array.isArray(current)) current.push(value);
        else if (current === undefined || current === false) out[key] = value;
        else out[key] = [current, value];
        continue;
      }
      out[key] = value;
    }
    return out;
  }

  /** Coloca o foco no primeiro elemento. */
  focus(options?: FocusOptions): this {
    this.elements[0]?.focus(options);
    return this;
  }

  /** Tira o foco de todos os elementos. */
  blur(): this {
    for (const el of this.elements) el.blur();
    return this;
  }

  /** Seleciona o texto dos campos da colecao. */
  select(): this {
    for (const el of this.elements) {
      const field = el as HTMLInputElement;
      if (typeof field.select === 'function') field.select();
    }
    return this;
  }

  // -------------------------------------------------------------------------
  // Integracao com o runtime da Voodoo
  // -------------------------------------------------------------------------

  /**
   * Inicializa as directives dos elementos da colecao, herdando o escopo do pai.
   * Com `force`, desmonta antes para reiniciar do zero.
   */
  walk(force = false): this {
    for (const el of this.elements) {
      if (force) destroyNode(el);
      walkNode(el, findScope(el.parentNode));
    }
    return this;
  }

  /** Desmonta efeitos, escutas e componentes, mantendo os elementos no DOM. */
  destroy(): this {
    for (const el of this.elements) destroyNode(el);
    return this;
  }
}

// ---------------------------------------------------------------------------
// API do modulo
// ---------------------------------------------------------------------------

/**
 * Cria uma colecao a partir de seletor CSS, elemento, lista de elementos,
 * string de HTML ou funcao.
 *
 * ```js
 * V.query('#lista li')          // seletor
 * V.query(document.body)        // elemento
 * V.query('<li>novo</li>')      // cria elementos
 * V.query(() => iniciar())      // equivale a V.ready
 * ```
 *
 * @param input seletor, no, lista, HTML ou funcao de inicializacao
 * @param context raiz opcional da busca, util para escopos locais
 */
export function query(input?: QueryInput, context?: QueryInput): VoodooCollection {
  if (typeof input === 'function') {
    ready(input as ReadyCallback);
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    return new VoodooCollection(root ? [root] : []);
  }
  return new VoodooCollection(resolve(input, context));
}

/**
 * Executa a funcao quando a Voodoo considerar o documento pronto, e devolve uma
 * promessa do mesmo momento. As duas escritas valem:
 *
 * ```js
 * V.ready(() => console.log('pronto'))
 * await V.ready()
 * ```
 *
 * Quem decide a hora e o agendador da propria biblioteca, que espera o corpo
 * existir e a arvore parar de crescer. Nada aqui escuta `DOMContentLoaded`.
 */
export function ready(fn?: ReadyCallback): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  return new Promise<void>((resolve) => {
    whenBodyReady(() => {
      try {
        fn?.();
      } catch (err) {
        handleError(err, 'V.ready');
      }
      resolve();
    });
  });
}

/** Cria elementos a partir de uma string de HTML, sem inseri-los no documento. */
export function fromHtml(html: string): VoodooCollection {
  return new VoodooCollection(parseHtml(html));
}
