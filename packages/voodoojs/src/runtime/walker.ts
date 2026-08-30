/**
 * @module runtime/walker
 *
 * Percorre o DOM, encontra atributos `v-*`, `:` e `@`, e liga cada um ao
 * sistema reativo. Este e o motor que faz o HTML virar aplicacao.
 *
 * Regras de ordem em um mesmo elemento:
 *   1. `v-ignore` e `v-pre` cancelam o processamento.
 *   2. Directives terminais (`v-for`, `v-if`) assumem o controle da subarvore.
 *   3. `v-data` e `v-component` criam o escopo usado pelo restante.
 *   4. As demais directives rodam por prioridade decrescente.
 *   5. Os filhos sao percorridos com o escopo resultante.
 */

import {
  effect as createEffect,
  EffectScope,
  handleError,
  queuePostFlush,
  warn,
} from '../reactivity';
import { evaluate, allowedGlobals, stringify as stringifyValue } from '../parser/interpreter';
import { parse } from '../parser/parser';
import { config, directives, components, type DirectiveContext } from './registry';
import { Scope, rootScope } from './scope';

// ---------------------------------------------------------------------------
// Estado por no
// ---------------------------------------------------------------------------

const nodeScopes = new WeakMap<Node, Scope>();
const nodeCleanups = new WeakMap<Node, Array<() => void>>();
const initialized = new WeakSet<Node>();
const nodeEffectScopes = new WeakMap<Node, EffectScope[]>();

/** Marca um elemento como ja processado. */
export function isInitialized(node: Node): boolean {
  return initialized.has(node);
}

/**
 * Marca um no como ja tratado, para o walker nunca descer nele.
 *
 * Usado nos modelos que o `v-if` guarda fora do documento. Sem esta marca, a
 * caminhada do elemento pai, que ja tinha a lista de filhos em maos, entraria
 * no modelo e inicializaria o `v-for` de dentro dele, corrompendo o modelo
 * para todas as renderizacoes seguintes.
 */
export function markInitialized(node: Node): void {
  initialized.add(node);
}

/** Escopo associado a um no, se houver. */
export function getScope(node: Node): Scope | undefined {
  return nodeScopes.get(node);
}

/** Escopo efetivo de um no, subindo pelos ancestrais. */
export function findScope(node: Node | null): Scope {
  let current: Node | null = node;
  while (current) {
    const scope = nodeScopes.get(current);
    if (scope) return scope;
    current = current.parentNode;
  }
  return rootScope;
}

/**
 * Guarda o escopo de efeitos criado para um no. Serve as devtools, que
 * precisam saber quantos efeitos reativos dependem de cada elemento.
 */
export function trackEffectScope(node: Node, scope: EffectScope): void {
  let list = nodeEffectScopes.get(node);
  if (!list) nodeEffectScopes.set(node, (list = []));
  list.push(scope);
}

/**
 * Escopos de efeito ligados a um no, um por directive mais um por texto
 * interpolado. Usado pelo inspetor `xray` para contar e instrumentar efeitos.
 */
export function getEffectScopes(node: Node): EffectScope[] {
  return nodeEffectScopes.get(node) ?? [];
}

/**
 * Nos que a propria Voodoo retira do documento de proposito, como o elemento
 * modelo de `v-for` e os ramos de `v-if`.
 *
 * Sem esta marca o MutationObserver enxergaria a remocao como saida de tela e
 * chamaria `destroy`, o que pararia justamente o efeito reativo que acabou de
 * ser criado para controlar a lista.
 */
const remocoesIgnoradas = new WeakSet<Node>();

/** Retira um no do documento sem que o observador trate como desmontagem. */
export function removeQuietly(node: ChildNode): void {
  remocoesIgnoradas.add(node);
  node.remove();
}
/** Registra uma funcao executada quando o no for removido do DOM. */
export function addCleanup(node: Node, fn: () => void): void {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, (list = []));
  list.push(fn);
}

/**
 * Desmonta um no e todos os descendentes: para efeitos, remove listeners e
 * dispara os hooks `beforeUnmount` e `unmounted`.
 */
export function destroy(node: Node): void {
  if (node.nodeType === 1) {
    // Percorre os filhos antes, para desmontar de dentro para fora.
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.nodeType === 1 || child.nodeType === 3) destroy(child);
    }
  }
  const list = nodeCleanups.get(node);
  if (list) {
    nodeCleanups.delete(node);
    for (let i = list.length - 1; i >= 0; i--) {
      try {
        list[i]();
      } catch (err) {
        handleError(err, 'cleanup');
      }
    }
  }
  if (node.nodeType === 1) unindexElement(node as Element);
  nodeScopes.delete(node);
  nodeEffectScopes.delete(node);
  initialized.delete(node);
}

// ---------------------------------------------------------------------------
// Leitura de atributos
// ---------------------------------------------------------------------------

export interface ParsedAttribute {
  /** Nome do atributo como escrito no HTML. */
  raw: string;
  /** Nome da directive, sem prefixo, como `text`, `on`, `toast-success`. */
  name: string;
  /** Argumento apos os dois pontos, como `click` em `v-on:click`. */
  arg?: string;
  modifiers: Record<string, string | true>;
  /** Valor do atributo. */
  expression: string;
}

/**
 * Converte um atributo do HTML na descricao de uma directive.
 * Retorna `null` quando o atributo nao pertence a Voodoo.
 *
 * ```
 * v-on:click.prevent="save"  ->  { name:'on', arg:'click', modifiers:{prevent:true} }
 * :disabled="loading"        ->  { name:'bind', arg:'disabled' }
 * @submit.prevent="save"     ->  { name:'on', arg:'submit', modifiers:{prevent:true} }
 * ```
 */
export function parseAttribute(name: string, value: string): ParsedAttribute | null {
  const prefix = config.prefix;
  let body: string;

  if (name.startsWith('@')) {
    body = `on:${name.slice(1)}`;
  } else if (name.startsWith(':') && name.length > 1) {
    body = `bind:${name.slice(1)}`;
  } else if (name.startsWith('.') && name.length > 1) {
    // `.prop="x"` liga direto na propriedade do elemento.
    body = `bind:${name.slice(1)}.prop`;
  } else if (name.startsWith(prefix)) {
    body = name.slice(prefix.length);
  } else if (name.startsWith('data-v-')) {
    body = name.slice('data-v-'.length);
  } else {
    return null;
  }

  if (!body) return null;

  const parts = body.split('.');
  const head = parts.shift() as string;
  const modifiers: Record<string, string | true> = {};
  for (const mod of parts) {
    const eq = mod.indexOf('=');
    if (eq > -1) modifiers[mod.slice(0, eq)] = mod.slice(eq + 1);
    else modifiers[mod] = true;
  }

  const colon = head.indexOf(':');
  const directiveName = colon > -1 ? head.slice(0, colon) : head;
  const arg = colon > -1 ? head.slice(colon + 1) : undefined;

  return { raw: name, name: directiveName, arg, modifiers, expression: value };
}

/**
 * Lista as directives de um elemento, ja ordenadas por prioridade.
 *
 * Quando o elemento ja passou pela limpeza do HTML, a leitura vem do cache.
 * E o que permite remontar um elemento depois, por exemplo quando o componente
 * dele so foi registrado mais tarde. Repor os atributos no DOM nao serviria,
 * porque nomes como `@click` sao recusados por `setAttribute`.
 */
export function collectDirectives(el: Element): ParsedAttribute[] {
  const out: ParsedAttribute[] = [];
  const cache = attributeCache.get(el);

  if (cache && cache.size) {
    for (const [name, value] of cache) {
      const parsed = parseAttribute(name, value);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  } else {
    const attrs = el.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const parsed = parseAttribute(attrs[i].name, attrs[i].value);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  }

  if (out.length < 2) return out;
  return out.sort((a, b) => priorityOf(b) - priorityOf(a));
}

function priorityOf(attr: ParsedAttribute): number {
  return directives.get(attr.name)?.priority ?? 0;
}

/**
 * Indice de quais elementos declararam cada directive.
 *
 * Como os atributos `v-*` saem do HTML depois de processados, seletores CSS
 * como `[v-tab]` deixariam de funcionar. Este indice guarda a informacao no
 * runtime, entao as directives estruturais continuam se encontrando.
 */
const directiveIndex = new Map<string, Set<Element>>();

function indexDirective(el: Element, name: string): void {
  let set = directiveIndex.get(name);
  if (!set) directiveIndex.set(name, (set = new Set()));
  set.add(el);
}

function unindexElement(el: Element): void {
  for (const set of directiveIndex.values()) set.delete(el);
}

/** `true` quando o elemento declarou a directive, mesmo ja limpa do HTML. */
export function hasDirective(el: Element, name: string): boolean {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}

/**
 * Descendentes de `root` que declararam a directive informada, na ordem do
 * documento. Substitui `root.querySelectorAll("[v-nome]")`.
 */
export function queryDirective(root: ParentNode, name: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const set = directiveIndex.get(name);
  const raiz = root as Element;

  if (set) {
    for (const el of set) {
      if (!el.isConnected) continue;
      if (raiz.contains && raiz.contains(el) && el !== raiz) out.push(el as HTMLElement);
    }
  }

  // Elementos ainda nao processados continuam com o atributo no HTML.
  for (const el of Array.from(
    root.querySelectorAll(`[${config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (!out.includes(el as HTMLElement)) out.push(el as HTMLElement);
  }

  // Ordem do documento, para a navegacao por teclado ficar previsivel.
  out.sort((a, b) =>
    a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}

/** Ancestral mais proximo que declarou a directive, incluindo o proprio. */
export function closestDirective(el: Element | null, name: string): HTMLElement | null {
  let atual: Element | null = el;
  while (atual) {
    if (hasDirective(atual, name)) return atual as HTMLElement;
    atual = atual.parentElement;
  }
  return null;
}
// ---------------------------------------------------------------------------
// Limpeza dos atributos depois da renderizacao
// ---------------------------------------------------------------------------

/**
 * Valor original de cada atributo `v-*`, guardado antes de ele sair do HTML.
 * As directives continuam lendo pelo cache, entao o comportamento nao muda.
 */
const attributeCache = new WeakMap<Element, Map<string, string>>();

/** `true` quando o nome do atributo pertence a Voodoo. */
export function isVoodooAttribute(name: string): boolean {
  return (
    name.startsWith(config.prefix) ||
    name.startsWith('data-v-') ||
    name.charCodeAt(0) === 64 /* @ */ ||
    (name.charCodeAt(0) === 58 /* : */ && name.length > 1)
  );
}

/**
 * Le um atributo da Voodoo mesmo depois que ele foi retirado do HTML.
 *
 * Use esta funcao no lugar de `el.getAttribute` sempre que a leitura acontecer
 * depois da montagem, como dentro de um manipulador de evento ou de uma
 * requisicao repetida.
 */
export function readAttr(el: Element, name: string): string | null {
  const cached = attributeCache.get(el)?.get(name);
  if (cached !== undefined) return cached;
  return el.getAttribute(name);
}

/** Versao booleana de `readAttr`. */
export function hasAttr(el: Element, name: string): boolean {
  const map = attributeCache.get(el);
  if (map?.has(name)) return true;
  return el.hasAttribute(name);
}

/** Todos os atributos da Voodoo que o elemento declarou originalmente. */
export function originalAttributes(el: Element): Map<string, string> {
  const map = attributeCache.get(el);
  if (map) return new Map(map);
  const out = new Map<string, string>();
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (isVoodooAttribute(attr.name)) out.set(attr.name, attr.value);
  }
  return out;
}

/**
 * Guarda os atributos no cache e os retira do HTML, deixando a pagina limpa,
 * do mesmo jeito que um framework com compilador faria.
 * Controlado por `V.config.cleanAttributes`.
 */
function stripAttributes(el: Element): void {
  if (!config.cleanAttributes) return;

  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, (map = new Map()));

  const remover: string[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (!isVoodooAttribute(attr.name)) continue;
    map.set(attr.name, attr.value);
    remover.push(attr.name);
  }
  for (const name of remover) el.removeAttribute(name);
}

/**
 * Devolve ao HTML os atributos que a limpeza havia retirado.
 *
 * Serve para remontar um elemento, por exemplo quando um componente e
 * registrado depois que a pagina ja foi percorrida. Sem isso o elemento seria
 * percorrido de novo sem nenhum atributo para ler.
 */
export function restoreAttributes(el: Element): void {
  const map = attributeCache.get(el);
  if (!map) return;
  for (const [name, value] of map) {
    if (el.hasAttribute(name)) continue;
    // Nomes com arroba ou dois pontos sao recusados por `setAttribute`, e nem
    // precisam voltar: `collectDirectives` ja le do cache.
    try {
      el.setAttribute(name, value);
    } catch {
      // Silencio proposital: o cache continua sendo a fonte da verdade.
    }
  }
}
/** Verifica se o elemento tem qualquer atributo da Voodoo. */
export function hasDirectives(el: Element): boolean {
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const n = attrs[i].name;
    if (
      n.startsWith(config.prefix) ||
      n.charCodeAt(0) === 64 /* @ */ ||
      n.charCodeAt(0) === 58 /* : */ ||
      n.startsWith('data-v-')
    ) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Avaliacao de expressoes
// ---------------------------------------------------------------------------

/**
 * Avalia uma expressao no escopo informado. Erros sao reportados sem quebrar a
 * pagina, porque um atributo com problema nao deve derrubar o resto do app.
 */
export function evaluateIn<T = any>(expression: string, scope: Scope, context?: string): T {
  if (!expression) return undefined as T;
  try {
    return evaluate(parse(expression), scope) as T;
  } catch (err) {
    handleError(err, context ? `${context} ("${expression}")` : `expressao "${expression}"`);
    return undefined as T;
  }
}

/** Avalia uma expressao e propaga o erro. Usado onde a falha precisa aparecer. */
export function evaluateStrict<T = any>(expression: string, scope: Scope): T {
  return evaluate(parse(expression), scope) as T;
}

// ---------------------------------------------------------------------------
// Execucao de directives
// ---------------------------------------------------------------------------

/** Sinaliza que o walker nao deve descer nos filhos deste elemento. */
const skipChildren = new WeakSet<Element>();

export function markSkipChildren(el: Element): void {
  skipChildren.add(el);
}

function runDirective(el: HTMLElement, attr: ParsedAttribute, scope: Scope): void {
  const def = directives.get(attr.name);
  if (!def) return;

  const scopeOwner = new EffectScope(true);
  addCleanup(el, () => scopeOwner.stop());
  trackEffectScope(el, scopeOwner);

  const ctx: DirectiveContext = {
    el,
    scope,
    expression: attr.expression,
    arg: attr.arg,
    modifiers: attr.modifiers,
    raw: attr.raw,
    evaluate<T = any>(expression?: string): T {
      return evaluateIn<T>(expression ?? attr.expression, scope, attr.raw);
    },
    effect(fn: () => void): void {
      scopeOwner.run(() => createEffect(fn, { scope: scopeOwner }));
    },
    cleanup(fn: () => void): void {
      addCleanup(el, fn);
    },
    walk(node: Node, childScope: Scope): void {
      walk(node, childScope);
    },
  };

  try {
    def.setup(ctx);
  } catch (err) {
    handleError(err, `directive ${attr.raw}`);
  }
}

// ---------------------------------------------------------------------------
// Walker
// ---------------------------------------------------------------------------

/** Callback usado por `v-component` para montar componentes. Injetado depois. */
let componentMounter:
  | ((el: HTMLElement, name: string, scope: Scope) => Scope | null)
  | null = null;

export function setComponentMounter(
  fn: (el: HTMLElement, name: string, scope: Scope) => Scope | null
): void {
  componentMounter = fn;
}

/**
 * Tags que a Voodoo nunca percorre. `TEMPLATE` fica de fora da lista de
 * proposito: ele precisa aceitar `v-if` e `v-for`. O conteudo de um template
 * vive em `content`, entao `walkChildren` naturalmente nao desce nele.
 */
const HTML_SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

/**
 * Percorre um no aplicando as directives encontradas.
 *
 * @param node raiz do trecho a inicializar
 * @param scope escopo aplicado ao no. Quando ausente, e deduzido dos ancestrais.
 */
export function walk(node: Node, scope?: Scope): void {
  const activeScope = scope ?? findScope(node.parentNode);

  if (node.nodeType === 11 /* DocumentFragment */) {
    const children = Array.from(node.childNodes);
    for (const child of children) walk(child, activeScope);
    return;
  }

  if (node.nodeType === 3) {
    bindTextNode(node as Text, activeScope);
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as HTMLElement;

  if (initialized.has(el)) return;
  if (HTML_SKIP.has(el.tagName)) return;

  // `v-ignore` e `v-pre` desligam a Voodoo naquela subarvore.
  if (el.hasAttribute(`${config.prefix}ignore`) || el.hasAttribute(`${config.prefix}pre`)) {
    initialized.add(el);
    return;
  }

  let current = activeScope;
  const attrs = collectDirectives(el);
  const tagComponent = el.hasAttribute(`${config.prefix}component`)
    ? null
    : resolveComponentTag(el.tagName);

  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current);
    return;
  }

  initialized.add(el);

  // Passo 1: directives terminais assumem a subarvore inteira.
  for (const attr of attrs) {
    const def = directives.get(attr.name);
    if (def?.terminal) {
      runDirective(el, attr, current);
      return;
    }
  }

  // Passo 2: criacao de escopo por `v-data` ou componente.
  const dataAttr = attrs.find((a) => a.name === 'data');
  const componentAttr = attrs.find((a) => a.name === 'component');
  const componentName: string = componentAttr
    ? componentAttr.expression || ''
    : tagComponent || '';

  let montouComponente = false;

  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current);
    if (created) {
      current = created;
      montouComponente = true;
      nodeScopes.set(el, current);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn<Record<string, unknown>>(dataAttr.expression || '{}', current, 'v-data') : {};
    current = current.reactiveChild(raw && typeof raw === 'object' ? raw : {}, el);
    nodeScopes.set(el, current);
  }

  // Passo 3: demais directives, na ordem de prioridade.
  //
  // Atributos escritos na tag de um componente pertencem a quem escreveu a tag,
  // ou seja, ao escopo de fora. E o que faz `@salvo="ultimo = $event"` gravar no
  // estado do pai, e nao dentro do componente. O escopo criado pelo componente
  // vale para o conteudo interno, tratado no passo 5.
  const escopoDosAtributos = montouComponente ? activeScope : current;
  for (const attr of attrs) {
    if (attr.name === 'data' || attr.name === 'component') continue;
    runDirective(el, attr, escopoDosAtributos);
  }

  // Passo 4: tira os atributos `v-*` do HTML, que ja cumpriram o seu papel.
  // Os valores continuam disponiveis por `readAttr`.
  stripAttributes(el);

  // Passo 5: filhos.
  if (!skipChildren.has(el)) walkChildren(el, current);
}

function walkChildren(el: Element, scope: Scope): void {
  const children = el.childNodes;
  // Copia porque directives podem alterar a lista durante a caminhada.
  const list: Node[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child as Text, scope);
  }
  // Um no com escopo proprio ja definido (conteudo de slot, por exemplo)
  // mantem o escopo de origem em vez de herdar o do pai.
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}

// ---------------------------------------------------------------------------
// Interpolacao de texto com chaves duplas
// ---------------------------------------------------------------------------

/**
 * Tamanho maximo de uma interpolacao de chave simples.
 *
 * Existe para o caso patologico: uma pagina com uma chave solta no texto e
 * outra chave muito depois. Sem o teto, a varredura tentaria interpretar o
 * paragrafo inteiro como expressao.
 */
const LIMITE_EXPRESSAO = 500;

/** Cache de "isto e uma expressao valida?", por texto. */
const expressaoValida = new Map<string, boolean>();

/**
 * Decide se o texto entre chaves e mesmo uma expressao.
 *
 * A chave simples convive com texto escrito por gente, entao ela nao pode
 * engolir qualquer coisa entre `{` e `}`. O criterio e o unico honesto: tentar
 * analisar. O que o parser aceita vira interpolacao, o resto continua sendo
 * texto, exatamente como foi escrito.
 */
function pareceExpressao(texto: string): boolean {
  const limpo = texto.trim();
  if (!limpo) return false;

  const guardado = expressaoValida.get(limpo);
  if (guardado !== undefined) return guardado;

  let valida = true;
  try {
    // Uma interpolacao rende um valor so. O parser aceita varias instrucoes
    // seguidas, e e justamente esse caso que separa expressao de prosa:
    // `{ um texto qualquer }` analisa como tres identificadores em sequencia,
    // e continua sendo texto que alguem escreveu.
    valida = parse(limpo).t !== 'seq';
  } catch {
    valida = false;
  }
  expressaoValida.set(limpo, valida);
  return valida;
}

/**
 * Acha o `}` que fecha a chave aberta em `inicio`, contando os niveis e
 * pulando o conteudo de textos entre aspas.
 *
 * E o que permite `{ $t('itens', { n: total }) }`, com objeto dentro da
 * expressao, e tambem uma expressao quebrada em varias linhas.
 */
function fecharChave(fonte: string, inicio: number): number {
  let nivel = 0;
  let aspas: string | null = null;

  for (let i = inicio; i < fonte.length; i++) {
    const c = fonte[i];

    if (aspas) {
      if (c === '\\') i++;
      else if (c === aspas) aspas = null;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      aspas = c;
      continue;
    }
    if (c === '{') nivel++;
    else if (c === '}') {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

/**
 * Quebra o texto em pedacos literais e expressoes.
 *
 * Aceita as duas formas. A curta, `{ nome }`, e a padrao da Voodoo. A dupla,
 * `{{ nome }}`, existe para quem vem do Vue e para textos que precisam conter
 * chaves literais ao redor. As duas aceitam quebra de linha e objeto dentro da
 * expressao; o que nao analisa como expressao fica no texto, intacto.
 */
function fatiarTexto(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let literal = '';
  let i = 0;

  const guardarLiteral = (): void => {
    if (literal) segments.push({ text: literal });
    literal = '';
  };

  while (i < raw.length) {
    const abre = raw.indexOf('{', i);
    if (abre === -1) {
      literal += raw.slice(i);
      break;
    }

    literal += raw.slice(i, abre);

    const duplo = raw[abre + 1] === '{';
    const fecha = duplo ? raw.indexOf('}}', abre + 2) : fecharChave(raw, abre);

    if (fecha === -1) {
      literal += raw[abre];
      i = abre + 1;
      continue;
    }

    const expressao = duplo ? raw.slice(abre + 2, fecha) : raw.slice(abre + 1, fecha);
    const fim = duplo ? fecha + 2 : fecha + 1;

    const cabe = duplo || expressao.length <= LIMITE_EXPRESSAO;
    if (cabe && pareceExpressao(expressao)) {
      guardarLiteral();
      segments.push({ expression: expressao.trim() });
      i = fim;
      continue;
    }

    // Nao era expressao: a chave volta a ser um caractere qualquer.
    literal += raw[abre];
    i = abre + 1;
  }

  guardarLiteral();
  return segments;
}

/** Elementos onde chaves quase sempre sao codigo, nao interpolacao. */
const NO_INTERPOLATION = new Set(['PRE', 'CODE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

interface TextSegment {
  text?: string;
  expression?: string;
}

/**
 * Liga `{ expressao }` dentro de um no de texto ao estado reativo.
 *
 * ```html
 * <p>Ola, { nome }! Voce tem { itens.length } itens.</p>
 * ```
 */
export function bindTextNode(node: Text, scope: Scope): void {
  const raw = node.textContent;
  if (!raw || raw.indexOf('{') === -1) return;
  if (initialized.has(node)) return;

  // Sobe pelos ancestrais por dois motivos. Primeiro, um trecho de codigo com
  // destaque de sintaxe coloca o texto dentro de <span>, e o pai direto deixaria
  // de ser <pre>. Segundo, v-ignore e v-pre precisam valer para a subarvore
  // inteira, mesmo quando a caminhada entra por um filho, o que acontece quando
  // um script reescreve o conteudo de um bloco de codigo depois da montagem.
  let ancestral: Element | null = node.parentElement;
  while (ancestral) {
    if (NO_INTERPOLATION.has(ancestral.tagName)) return;
    if (
      ancestral.hasAttribute(`${config.prefix}ignore`) ||
      ancestral.hasAttribute(`${config.prefix}pre`) ||
      ancestral.hasAttribute('data-v-ignore') ||
      ancestral.hasAttribute('data-v-pre')
    ) {
      return;
    }
    ancestral = ancestral.parentElement;
  }

  const segments = fatiarTexto(raw);
  if (!segments.some((s) => s.expression)) return;

  initialized.add(node);

  const owner = new EffectScope(true);
  addCleanup(node, () => owner.stop());
  trackEffectScope(node, owner);

  owner.run(() =>
    createEffect(() => {
      let out = '';
      for (const segment of segments) {
        out += segment.text ?? stringifyValue(evaluateIn(segment.expression!, scope, 'interpolacao'));
      }
      if (node.textContent !== out) node.textContent = out;
    }, { scope: owner })
  );
}

/** Fixa o escopo de um no antes do walker chegar nele. */
export function markNodeScope(node: Node, scope: Scope): void {
  nodeScopes.set(node, scope);
}

/** Resolve `<UserCard>` e `<user-card>` para o nome registrado. */
export function resolveComponentTag(tagName: string): string | null {
  const lower = tagName.toLowerCase();
  if (components.has(lower)) return lower;
  const alias = componentAliases.get(lower);
  return alias ?? null;
}

/** Mapa de nomes sem hifen, para aceitar tags em PascalCase. */
export const componentAliases = new Map<string, string>();

// ---------------------------------------------------------------------------
// Hooks de ciclo de vida agendados
// ---------------------------------------------------------------------------

/** Executa depois que o DOM da rodada atual foi aplicado. */
export function onMounted(fn: () => void): void {
  queuePostFlush(fn);
}

// ---------------------------------------------------------------------------
// Inicializacao e observacao
// ---------------------------------------------------------------------------

let started = false;
let observer: MutationObserver | null = null;

/** Inicializa a Voodoo em uma raiz. Chamado automaticamente no navegador. */
export function start(root?: Element | Document): void {
  if (typeof document === 'undefined') return;
  const target = (root ?? config.root ?? document.body) as Element;
  if (!target) return;

  Object.assign(allowedGlobals, config.globals);

  walk(target, rootScope);

  if (!started) {
    started = true;
    if (config.autoDiscover) observeDOM(target);
    document.dispatchEvent(new CustomEvent('voodoo:ready', { detail: { root: target } }));
  }
}

/**
 * Observa insercoes e remocoes no DOM. Elementos criados depois do carregamento
 * ganham suas directives sem nenhuma chamada manual.
 */
function observeDOM(target: Element): void {
  if (typeof MutationObserver === 'undefined') return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (let i = 0; i < mutation.removedNodes.length; i++) {
        const removed = mutation.removedNodes[i];
        if (remocoesIgnoradas.has(removed)) {
          remocoesIgnoradas.delete(removed);
          continue;
        }
        if (removed.nodeType === 1 && !removed.isConnected) destroy(removed);
      }
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const added = mutation.addedNodes[i];
        if (added.nodeType !== 1) continue;
        if (initialized.has(added)) continue;
        walk(added, findScope(added.parentNode));
      }
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

/** Interrompe a observacao automatica do DOM. */
export function stopObserving(): void {
  observer?.disconnect();
  observer = null;
  started = false;
}

/** Reinicializa a Voodoo dentro de uma raiz, util em testes. */
export function refresh(root?: Element): void {
  walk(root ?? document.body, root ? findScope(root.parentNode) : rootScope);
}

export { rootScope, warn };
