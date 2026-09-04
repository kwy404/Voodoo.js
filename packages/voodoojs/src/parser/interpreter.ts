/**
 * @module parser/interpreter
 *
 * AST interpreter. Takes a node and a scope and returns the value.
 *
 * Security: there is no implicit access to `window`, `globalThis`, `document`,
 * `fetch` or `eval`. Identifiers not in scope are looked up in a closed list of
 * allowed globals, configurable by the application.
 */

import type { Node, Param } from './parser';

/** Minimum contract that a scope must fulfill to be evaluated. */
export interface EvalScope {
  /** Returns the object containing the key, walking up the scope chain. */
  lookup(name: string): Record<string, any> | undefined;
  /** Reads a value from the scope chain. */
  get(name: string): unknown;
  /** Writes to the scope chain, in the key owner when it exists. */
  set(name: string, value: unknown): void;
  /** Creates a child scope with local variables, used by arrow functions and `v-for`. */
  child(vars: Record<string, unknown>): EvalScope;
}

/**
 * Globals allowed within template expressions.
 *
 * Extend with `V.config.globals.MyLib = value`.
 */
/**
 * Safe subset of `Object`.
 *
 * The native `Object` cannot be fully exposed. Key blocking covers direct
 * access like `x.constructor`, but the reflective methods of `Object` itself
 * receive the target as an ARGUMENT, and arguments don't pass through that
 * blocking. The chain below would return `Function` and execute arbitrary code:
 *
 * ```js
 * Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object), 'constructor')
 *   .value('return this')()
 * ```
 *
 * The rule that closes this once and for all is not an ever-growing list of
 * prohibitions: it's inverting the pattern. A template expression can CALL
 * functionality; it doesn't receive tools to inspect the JavaScript runtime.
 * For this reason `getPrototypeOf`, `setPrototypeOf`,
 * `getOwnPropertyDescriptor`, `getOwnPropertyDescriptors`,
 * `getOwnPropertyNames`, `getOwnPropertySymbols`, `defineProperty`,
 * `defineProperties` and `create` are excluded.
 */
const SafeObject = /* @__PURE__ */ Object.freeze({
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  assign: Object.assign,
  is: Object.is,
  hasOwn:
    (Object as unknown as { hasOwn?: (o: object, k: PropertyKey) => boolean }).hasOwn ??
    ((o: object, k: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(o, k)),
});

/**
 * Names the sandbox refuses on purpose.
 *
 * They exist only to shape the error message: nothing here is reachable either
 * way. The point is not to answer "it was not found, expose it with
 * V.config.globals" for a name nobody should be exposing, which would be
 * instructions for undoing the sandbox.
 */
const DELIBERATELY_WITHHELD = /* @__PURE__ */ new Set([
  'eval',
  'Function',
  'window',
  'globalThis',
  'self',
  'top',
  'parent',
  'document',
  'fetch',
  'XMLHttpRequest',
  'importScripts',
  'require',
  'process',
  'Reflect',
  'Proxy',
  'WebAssembly',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'location',
  'history',
  'crypto',
  'Worker',
  'SharedWorker',
  'ServiceWorker',
]);

/**
 * Timers, with the string form refused.
 *
 * `setTimeout('alert(1)', 0)` is `eval` wearing a different hat: the browser
 * compiles that string and runs it. This library's whole claim is that no
 * expression is ever compiled, and it holds under a strict Content Security
 * Policy precisely because that never happens. Handing out the raw timer would
 * have opened the one door everything else keeps shut.
 *
 * The callback form is a different thing entirely — the function comes from the
 * interpreter and can only do what any other expression can do.
 *
 * They are here because `useEffect` without them is a hook you cannot use.
 * Cleanup exists for timers and listeners; a `useEffect` that can register
 * neither is a demonstration rather than a feature, and it shipped that way:
 * the documented example and the playground sample both called `setInterval`
 * and both failed with "setInterval was not found" the moment anyone ran them.
 */
function guardedTimer(name: 'setTimeout' | 'setInterval') {
  return function (handler: unknown, timeout?: number, ...rest: unknown[]) {
    if (typeof handler !== 'function') {
      throw new VoodooRuntimeError(
        `${name} needs a function. Passing a string would compile it, which this library never does.`
      );
    }
    // Looked up now rather than captured when this module loaded. Whoever owns
    // the global at call time wins, which is what anything that replaces a
    // timer expects: fake timers in a test, a polyfill, an instrumented page.
    // Holding the original meant those were silently bypassed.
    const timer = (globalThis as Record<string, any>)[name];
    return timer(handler, timeout, ...rest);
  };
}

/** Same reasoning as `guardedTimer`: resolve the global when it is called. */
function forwardGlobal(name: string) {
  return function (...args: unknown[]) {
    const fn = (globalThis as Record<string, any>)[name];
    return fn(...args);
  };
}

export const allowedGlobals: Record<string, unknown> = {
  Math,
  JSON,
  Date,
  Number,
  String,
  Boolean,
  Array,
  Object: SafeObject,
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

  ...(typeof setTimeout !== 'undefined'
    ? {
        setTimeout: guardedTimer('setTimeout'),
        setInterval: guardedTimer('setInterval'),
        clearTimeout: forwardGlobal('clearTimeout'),
        clearInterval: forwardGlobal('clearInterval'),
      }
    : {}),
  ...(typeof requestAnimationFrame !== 'undefined'
    ? {
        requestAnimationFrame: forwardGlobal('requestAnimationFrame'),
        cancelAnimationFrame: forwardGlobal('cancelAnimationFrame'),
      }
    : {}),
};

/** Runtime error for an expression, with original text attached. */
export class VoodooRuntimeError extends Error {
  constructor(
    message: string,
    public readonly expression?: string
  ) {
    super(expression ? `${message}\n\nExpression: ${expression}` : message);
    this.name = 'VoodooRuntimeError';
  }
}

const SPREAD = Symbol('spread');

/**
 * Carries the value of a `return` up to the function that owns it.
 *
 * A class rather than a thrown exception, because several `evaluate` call sites
 * catch and swallow errors on purpose so that one broken attribute cannot take
 * a page down, and a `return` would have been swallowed with them. It is
 * unwrapped in `callFunction`, which is the only place a function body ends.
 */
class ReturnSignal {
  constructor(readonly value: unknown) {}
}

/** Unwraps a body's result, so a `return` never escapes its own function. */
export function unwrap(value: unknown): unknown {
  return value instanceof ReturnSignal ? value.value : value;
}

/**
 * Keys that open the prototype chain and are thus outside the reach of
 * template expressions.
 *
 * Reading `constructor` was enough to escape the interpreter: `({}).constructor`
 * returns `Object`, and `Object.constructor` returns `Function`, that is
 * `constructor.constructor("return this")()` was `eval` through the back door,
 * with access to `window`, `document` and `fetch`. Writing to `__proto__` or
 * `prototype` pollutes `Object.prototype` and contaminates the entire page.
 */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** `true` when the key reaches the prototype chain. */
export function chaveBloqueada(key: unknown): boolean {
  return typeof key === 'string' && BLOCKED_KEYS.has(key);
}

/** Rejects the key when it reaches the prototype chain. */
function checkKey(key: unknown, expression?: string): PropertyKey {
  if (chaveBloqueada(key)) {
    throw new VoodooRuntimeError(
      `Access blocked to "${String(key)}": template expressions cannot reach ` +
        'the prototype chain. Expose a method in state instead.',
      expression
    );
  }
  return key as PropertyKey;
}

/**
 * Evaluates an AST node.
 *
 * @param node node generated by `parse()`
 * @param scope read and write scope
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
      // `constructor` and friends exist on any object by inheritance, so
      // `name in data` would find them even without anything declared.
      checkKey(node.n);
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
          `Could not read "${describeKey(node, scope)}" from ${obj === null ? 'null' : 'undefined'}`
        );
      }
      const key = checkKey(
        node.computed ? evaluate(node.p, scope) : (node.p as { v: string }).v
      );
      return (obj as any)[key];
    }

    case 'new': {
      // The constructor is resolved the same way any other value is, so `new`
      // reaches exactly what an expression could already reach and not one name
      // more: something in scope, or something in `allowedGlobals`. It is not a
      // second door into the page.
      const target = evaluate(node.callee, scope);

      if (typeof target !== 'function') {
        throw new VoodooRuntimeError(
          `Cannot construct ${stringify(target)}: it is not a constructor`
        );
      }

      // `Function` would turn `new` into `eval` by another name, which is the
      // one thing this library promises it cannot do. It is not in
      // `allowedGlobals`, so this is defence in depth rather than the only
      // guard, and it stays because a future addition to that list must not
      // silently open this route.
      if (target === Function) {
        throw new VoodooRuntimeError('Cannot construct Function: expressions never compile code');
      }

      const args = evalArgs(node.args, scope);
      return Reflect.construct(target as new (...a: unknown[]) => unknown, args);
    }

    case 'call': {
      let thisArg: unknown;
      let fn: unknown;

      if (node.callee.t === 'member') {
        const obj = evaluate(node.callee.o, scope);
        if (obj == null) {
          if (node.callee.opt || node.opt) return undefined;
          throw new VoodooRuntimeError(
            `Could not call "${describeKey(node.callee, scope)}" from ${
              obj === null ? 'null' : 'undefined'
            }`
          );
        }
        const key = checkKey(
          node.callee.computed
            ? evaluate(node.callee.p, scope)
            : (node.callee.p as { v: string }).v
        );
        thisArg = obj;
        fn = (obj as any)[key];
      } else if (node.callee.t === 'id') {
        checkKey(node.callee.n);
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

        // A bare name that resolves nowhere is almost always a global the page
        // defined and never exposed, not a typo. Saying "is not a function"
        // sends people hunting for a bug in their own code, when the answer is
        // that expressions cannot reach `window` by design and the name has to
        // be handed over explicitly.
        if (node.callee.t === 'id' && !scope.lookup(name) && !(name in allowedGlobals)) {
          // Except for the names that are withheld on purpose. Telling someone
          // how to hand `eval` to a template would be advice that undoes the
          // sandbox, so those get told they are blocked and nothing else.
          if (DELIBERATELY_WITHHELD.has(name)) {
            throw new VoodooRuntimeError(
              `"${name}" is blocked. Expressions run in a sandbox without access to it.`
            );
          }
          throw new VoodooRuntimeError(
            `"${name}" was not found. Expressions cannot reach window: expose it with ` +
              `V.config.globals.${name} = ..., or put it in scope with V.data({ ${name} }).`
          );
        }

        throw new VoodooRuntimeError(`"${name}" is not a function`);
      }

      return (fn as Function).apply(thisArg, evalArgs(node.args, scope));
    }

    case 'unary': {
      if (node.op === '...') return { [SPREAD]: evaluate(node.a, scope) };
      // `delete` needs the member expression itself, not its value, so it is
      // handled before the operand is evaluated.
      //
      // It used to be dropped by the parser, which left the bare member behind:
      // `delete obj.a` evaluated to `1`, the value of `obj.a`, instead of
      // `true`, and deleted nothing. Reactivity comes for free here because the
      // reactive proxy already implements `deleteProperty` and notifies from
      // it, so a `v-for` over the object re-renders the way it does after an
      // assignment.
      if (node.op === 'delete') {
        if (node.a.t !== 'member') {
          // `delete x` on a plain variable is a no-op in strict mode and a
          // SyntaxError in a module. Refusing it is clearer than returning a
          // value that means nothing.
          throw new VoodooRuntimeError(
            'delete needs a property, as in `delete user.name` or `delete list[0]`'
          );
        }
        const owner = evaluate(node.a.o, scope);
        if (owner == null) return true;
        const key = checkKey(
          node.a.computed ? evaluate(node.a.p, scope) : (node.a.p as { v: string }).v
        );
        return delete (owner as any)[key];
      }

      if (node.op === 'typeof') {
        // typeof of unknown identifier cannot throw error.
        if (node.a.t === 'id') {
          // Blocked key never leaks, not even through `typeof`.
          if (chaveBloqueada(node.a.n)) return 'undefined';
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
        case '~':
          return ~(v as number);
        case 'void':
          return undefined;
      }
      throw new VoodooRuntimeError(`Unsupported unary operator: ${node.op}`);
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

        // The bitwise operators coerce through ToInt32, and `>>>` through
        // ToUint32, which is why the two shifts disagree for negatives:
        // `-1 >> 0` is -1 and `-1 >>> 0` is 4294967295. Applying the JavaScript
        // operator directly gets that for free; hand-rolling the coercion is
        // how an implementation ends up subtly wrong on exactly those cases.
        case '&':
          return (l as number) & (r as number);
        case '|':
          return (l as number) | (r as number);
        case '^':
          return (l as number) ^ (r as number);
        case '<<':
          return (l as number) << (r as number);
        case '>>':
          return (l as number) >> (r as number);
        case '>>>':
          return (l as number) >>> (r as number);
      }
      throw new VoodooRuntimeError(`Unsupported operator: ${node.op}`);
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
            throw new VoodooRuntimeError(`Unsupported assignment: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }

    case 'if': {
      // A statement, so it yields the value of whichever branch ran, and
      // undefined when the condition is false and there is no `else`.
      if (evaluate(node.test, scope)) return evaluate(node.cons, scope);
      return node.alt ? evaluate(node.alt, scope) : undefined;
    }

    case 'method': {
      // A method must see the object it belongs to.
      //
      // An arrow closes over the scope where it was written, and for
      // `v-data="{ out: '', hi() { out = 'x' } }"` that is the scope OUTSIDE
      // the one this very object is about to create. Writing `out` there
      // created a stray variable on the parent instead of touching the state
      // next to it, and the interpolation never changed.
      //
      // Calling `hi()` passes the owning object as `this`, so the body is
      // evaluated in a scope layered on top of it: reads find the sibling
      // state, and writes land on the same reactive object the DOM observes.
      const methodParams = node.params;
      const methodBody = node.body;
      return function (this: unknown, ...args: unknown[]): unknown {
        const vars = bindParams(methodParams, args, scope);
        const owner = this;
        const base =
          owner !== null && typeof owner === 'object'
            ? scope.child(owner as Record<string, unknown>)
            : scope;
        return unwrap(evaluate(methodBody, base.child(vars)));
      };
    }

    case 'arrow': {
      const params = node.params;
      const body = node.body;
      return (...args: unknown[]) =>
        unwrap(evaluate(body, scope.child(bindParams(params, args, scope))));
    }

    case 'obj': {
      const out: Record<string, unknown> = {};
      for (const prop of node.props) {
        if (prop.spread) {
          Object.assign(out, evaluate(prop.spread, scope) as object);
        } else {
          // `{ __proto__: ... }` would change the prototype of the object created here.
          const key = checkKey(
            prop.key !== null ? prop.key : String(evaluate(prop.keyExpr!, scope))
          ) as string;

          if (prop.getter) {
            // Defined as a real accessor, so it recomputes on every read and
            // the reactive proxy tracks whatever the body touches. Assigning
            // the result once instead would freeze a derived value, which is
            // the same trap `V.store` and `V.data` fell into.
            const compute = evaluate(prop.value!, scope) as () => unknown;
            Object.defineProperty(out, key, {
              enumerable: true,
              configurable: true,
              get() {
                return compute.call(this);
              },
            });
            continue;
          }

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

    case 'return':
      // Wrapped rather than thrown. An exception would be caught by the
      // `evaluate` call sites that deliberately swallow errors, and a `return`
      // is not an error. The wrapper travels up through `seq` and `if` and is
      // unwrapped at the function boundary, in `callFunction`.
      return new ReturnSignal(node.a ? evaluate(node.a, scope) : undefined);

    case 'seq': {
      let last: unknown;
      for (const stmt of node.body) {
        last = evaluate(stmt, scope);
        // Everything after a `return` in the same block is dead.
        if (last instanceof ReturnSignal) return last;
      }
      return last;
    }
  }

  throw new VoodooRuntimeError(`Unknown node: ${(node as { t: string }).t}`);
}

/**
 * Binds one parameter pattern to one argument, writing into `vars`.
 *
 * Recursive, because a pattern nests: `({ a: [b = 1] }) => b` is three levels of
 * this function. Defaults apply on `undefined` only, not on any falsy value,
 * which is what JavaScript does and is the difference between `f(0)` binding 0
 * and binding the default.
 */
function bindParam(
  param: Param,
  value: unknown,
  vars: Record<string, unknown>,
  scope: EvalScope
): void {
  if (param.kind === 'rest') {
    vars[param.name] = value;
    return;
  }

  if (param.def !== undefined && value === undefined) {
    // The default is an expression and may read earlier parameters, so it is
    // evaluated in a scope that already has them.
    value = evaluate(param.def, scope.child(vars));
  }

  if (param.kind === 'id') {
    vars[param.name] = value;
    return;
  }

  if (param.kind === 'obj') {
    if (value == null) {
      throw new VoodooRuntimeError(
        `Cannot destructure ${value === null ? 'null' : 'undefined'}`
      );
    }
    const taken = new Set<string>();
    for (const { key, value: inner } of param.props) {
      taken.add(key);
      bindParam(inner, (value as any)[checkKey(key)], vars, scope);
    }
    if (param.rest) {
      const rest: Record<string, unknown> = {};
      for (const key of Object.keys(value as object)) {
        if (!taken.has(key)) rest[key] = (value as any)[key];
      }
      vars[param.rest] = rest;
    }
    return;
  }

  // An array pattern reads by index, so it works on anything indexable, and
  // spreads once for the rest element rather than per position.
  const items = Array.isArray(value) ? value : Array.from(value as Iterable<unknown>);
  param.elements.forEach((element, index) => {
    if (element) bindParam(element, items[index], vars, scope);
  });
  if (param.rest) vars[param.rest] = items.slice(param.elements.length);
}

/** Binds a whole parameter list to the arguments a call supplied. */
function bindParams(
  params: Param[],
  args: unknown[],
  scope: EvalScope
): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    // A rest parameter takes everything from its position onward, and is only
    // ever last.
    bindParam(param, param.kind === 'rest' ? args.slice(i) : args[i], vars, scope);
  }
  return vars;
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

/** Writes to an identifier or member access. */
function assign(target: Node, value: unknown, scope: EvalScope): void {
  if (target.t === 'id') {
    checkKey(target.n);
    scope.set(target.n, value);
    return;
  }
  if (target.t === 'member') {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError('Could not write to null or undefined');
    }
    // `x.__proto__.anything = 1` would pollute `Object.prototype` for the entire page.
    const key = checkKey(
      target.computed ? evaluate(target.p, scope) : (target.p as { v: string }).v
    );
    (obj as any)[key] = value;
    return;
  }
  throw new VoodooRuntimeError('Invalid assignment target');
}

function describeKey(node: Node, scope: EvalScope): string {
  if (node.t === 'member') {
    return node.computed ? String(evaluate(node.p, scope)) : String((node.p as { v: string }).v);
  }
  if (node.t === 'id') return node.n;
  return 'value';
}

/** Converts any value to text that will be written to the DOM. */
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
