/**
 * @module parser/interpreter
 *
 * Interpretador da AST. Recebe um no e um escopo e devolve o valor.
 *
 * Seguranca: nao existe acesso implicito a `window`, `globalThis`, `document`,
 * `fetch` ou `eval`. Identificadores que nao estao no escopo sao procurados em
 * uma lista fechada de globais permitidos, configuravel pela aplicacao.
 */

import type { Node } from './parser';

/** Contrato minimo que um escopo precisa cumprir para ser avaliado. */
export interface EvalScope {
  /** Retorna o objeto que contem a chave, subindo a cadeia de escopos. */
  lookup(name: string): Record<string, any> | undefined;
  /** Le um valor da cadeia de escopos. */
  get(name: string): unknown;
  /** Escreve na cadeia de escopos, no dono da chave quando ele existir. */
  set(name: string, value: unknown): void;
  /** Cria um escopo filho com variaveis locais, usado por arrow functions e `v-for`. */
  child(vars: Record<string, unknown>): EvalScope;
}

/**
 * Globais liberados dentro de expressoes de template.
 *
 * Estende com `V.config.globals.Minha = valor`.
 */
export const allowedGlobals: Record<string, unknown> = {
  Math,
  JSON,
  Date,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Intl,
  RegExp,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  console,
};

/** Erro em tempo de execucao de uma expressao, com o texto original anexado. */
export class VoodooRuntimeError extends Error {
  constructor(
    message: string,
    public readonly expression?: string
  ) {
    super(expression ? `${message}\n\nExpressao: ${expression}` : message);
    this.name = 'VoodooRuntimeError';
  }
}

const SPREAD = Symbol('spread');

/**
 * Avalia um no da AST.
 *
 * @param node no gerado por `parse()`
 * @param scope escopo de leitura e escrita
 */
export function evaluate(node: Node, scope: EvalScope): any {
  switch (node.t) {
    case 'lit':
      return node.v;

    case 'tpl': {
      let out = node.quasis[0] ?? '';
      for (let i = 0; i < node.exprs.length; i++) {
        out += stringify(evaluate(node.exprs[i], scope));
        out += node.quasis[i + 1] ?? '';
      }
      return out;
    }

    case 'id': {
      const owner = scope.lookup(node.n);
      if (owner) return owner[node.n];
      if (node.n in allowedGlobals) return allowedGlobals[node.n];
      return undefined;
    }

    case 'member': {
      const obj = evaluate(node.o, scope);
      if (obj == null) {
        if (node.opt) return undefined;
        throw new VoodooRuntimeError(
          `Nao foi possivel ler "${describeKey(node, scope)}" de ${obj === null ? 'null' : 'undefined'}`
        );
      }
      const key = node.computed ? evaluate(node.p, scope) : (node.p as { v: string }).v;
      return (obj as any)[key as PropertyKey];
    }

    case 'call': {
      let thisArg: unknown;
      let fn: unknown;

      if (node.callee.t === 'member') {
        const obj = evaluate(node.callee.o, scope);
        if (obj == null) {
          if (node.callee.opt || node.opt) return undefined;
          throw new VoodooRuntimeError(
            `Nao foi possivel chamar "${describeKey(node.callee, scope)}" de ${
              obj === null ? 'null' : 'undefined'
            }`
          );
        }
        const key = node.callee.computed
          ? evaluate(node.callee.p, scope)
          : (node.callee.p as { v: string }).v;
        thisArg = obj;
        fn = (obj as any)[key as PropertyKey];
      } else if (node.callee.t === 'id') {
        const owner = scope.lookup(node.callee.n);
        if (owner) {
          thisArg = owner;
          fn = owner[node.callee.n];
        } else {
          fn = allowedGlobals[node.callee.n];
        }
      } else {
        fn = evaluate(node.callee, scope);
      }

      if (fn == null && node.opt) return undefined;
      if (typeof fn !== 'function') {
        const name = node.callee.t === 'id' ? node.callee.n : describeKey(node.callee, scope);
        throw new VoodooRuntimeError(`"${name}" nao e uma funcao`);
      }

      return (fn as Function).apply(thisArg, evalArgs(node.args, scope));
    }

    case 'unary': {
      if (node.op === '...') return { [SPREAD]: evaluate(node.a, scope) };
      if (node.op === 'typeof') {
        // typeof de identificador desconhecido nao pode lancar erro.
        if (node.a.t === 'id') {
          const owner = scope.lookup(node.a.n);
          const value = owner ? owner[node.a.n] : allowedGlobals[node.a.n];
          return typeof value;
        }
        return typeof evaluate(node.a, scope);
      }
      const v = evaluate(node.a, scope);
      switch (node.op) {
        case '!':
          return !v;
        case '-':
          return -(v as number);
        case '+':
          return +(v as number);
        case 'void':
          return undefined;
      }
      throw new VoodooRuntimeError(`Operador unario nao suportado: ${node.op}`);
    }

    case 'update': {
      const old = Number(evaluate(node.a, scope));
      const updated = node.op === '++' ? old + 1 : old - 1;
      assign(node.a, updated, scope);
      return node.prefix ? updated : old;
    }

    case 'bin': {
      const l = evaluate(node.l, scope);
      const r = evaluate(node.r, scope);
      switch (node.op) {
        case '+':
          return (l as number) + (r as number);
        case '-':
          return (l as number) - (r as number);
        case '*':
          return (l as number) * (r as number);
        case '/':
          return (l as number) / (r as number);
        case '%':
          return (l as number) % (r as number);
        case '**':
          return (l as number) ** (r as number);
        case '==':
          // eslint-disable-next-line eqeqeq
          return l == r;
        case '!=':
          // eslint-disable-next-line eqeqeq
          return l != r;
        case '===':
          return l === r;
        case '!==':
          return l !== r;
        case '<':
          return (l as number) < (r as number);
        case '>':
          return (l as number) > (r as number);
        case '<=':
          return (l as number) <= (r as number);
        case '>=':
          return (l as number) >= (r as number);
        case 'in':
          return (l as PropertyKey) in (r as object);
        case 'instanceof':
          return l instanceof (r as Function);
      }
      throw new VoodooRuntimeError(`Operador nao suportado: ${node.op}`);
    }

    case 'logic': {
      const l = evaluate(node.l, scope);
      if (node.op === '&&') return l ? evaluate(node.r, scope) : l;
      if (node.op === '||') return l ? l : evaluate(node.r, scope);
      return l ?? evaluate(node.r, scope);
    }

    case 'cond':
      return evaluate(node.test, scope) ? evaluate(node.cons, scope) : evaluate(node.alt, scope);

    case 'assign': {
      let value: unknown;
      if (node.op === '=') {
        value = evaluate(node.value, scope);
      } else if (node.op === '&&=' || node.op === '||=' || node.op === '??=') {
        const current = evaluate(node.target, scope);
        const shouldAssign =
          node.op === '&&=' ? !!current : node.op === '||=' ? !current : current == null;
        if (!shouldAssign) return current;
        value = evaluate(node.value, scope);
      } else {
        const current = evaluate(node.target, scope) as any;
        const operand = evaluate(node.value, scope) as any;
        switch (node.op) {
          case '+=':
            value = current + operand;
            break;
          case '-=':
            value = current - operand;
            break;
          case '*=':
            value = current * operand;
            break;
          case '/=':
            value = current / operand;
            break;
          case '%=':
            value = current % operand;
            break;
          case '**=':
            value = current ** operand;
            break;
          default:
            throw new VoodooRuntimeError(`Atribuicao nao suportada: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }

    case 'arrow': {
      const params = node.params;
      const body = node.body;
      return (...args: unknown[]) => {
        const vars: Record<string, unknown> = {};
        for (let i = 0; i < params.length; i++) vars[params[i]] = args[i];
        return evaluate(body, scope.child(vars));
      };
    }

    case 'obj': {
      const out: Record<string, unknown> = {};
      for (const prop of node.props) {
        if (prop.spread) {
          Object.assign(out, evaluate(prop.spread, scope) as object);
        } else {
          const key = prop.key !== null ? prop.key : String(evaluate(prop.keyExpr!, scope));
          out[key] = evaluate(prop.value!, scope);
        }
      }
      return out;
    }

    case 'arr': {
      const out: unknown[] = [];
      for (const el of node.els) {
        if (el && typeof el === 'object' && 'spread' in el) {
          out.push(...(evaluate(el.spread, scope) as unknown[]));
        } else {
          out.push(evaluate(el as Node, scope));
        }
      }
      return out;
    }

    case 'seq': {
      let last: unknown;
      for (const stmt of node.body) last = evaluate(stmt, scope);
      return last;
    }
  }

  throw new VoodooRuntimeError(`No desconhecido: ${(node as { t: string }).t}`);
}

function evalArgs(args: Node[], scope: EvalScope): unknown[] {
  const out: unknown[] = [];
  for (const arg of args) {
    const value = evaluate(arg, scope);
    if (value && typeof value === 'object' && SPREAD in (value as object)) {
      out.push(...((value as any)[SPREAD] as unknown[]));
    } else {
      out.push(value);
    }
  }
  return out;
}

/** Escreve em um identificador ou em um acesso a membro. */
function assign(target: Node, value: unknown, scope: EvalScope): void {
  if (target.t === 'id') {
    scope.set(target.n, value);
    return;
  }
  if (target.t === 'member') {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError('Nao foi possivel escrever em null ou undefined');
    }
    const key = target.computed ? evaluate(target.p, scope) : (target.p as { v: string }).v;
    (obj as any)[key as PropertyKey] = value;
    return;
  }
  throw new VoodooRuntimeError('Alvo de atribuicao invalido');
}

function describeKey(node: Node, scope: EvalScope): string {
  if (node.t === 'member') {
    return node.computed ? String(evaluate(node.p, scope)) : String((node.p as { v: string }).v);
  }
  if (node.t === 'id') return node.n;
  return 'valor';
}

/** Converte qualquer valor no texto que sera escrito no DOM. */
export function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
