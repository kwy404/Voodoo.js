'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Voodoo.js v0.2.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/reactivity/index.ts
var resolvedPromise = /* @__PURE__ */ Promise.resolve();
var queue = [];
var postQueue = [];
var isFlushing = false;
var isFlushPending = false;
var RECURSION_LIMIT = 100;
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}
function queueFlush() {
  if (isFlushing || isFlushPending) return;
  isFlushPending = true;
  resolvedPromise.then(flushJobs);
}
function flushJobs() {
  isFlushPending = false;
  isFlushing = true;
  const counts = /* @__PURE__ */ new Map();
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      if (!job.active) continue;
      const count = (counts.get(job) || 0) + 1;
      counts.set(job, count);
      if (count > RECURSION_LIMIT) {
        warn(
          "Loop infinito de atualizacao detectado. Um efeito reativo esta se disparando de novo sem parar. Verifique se alguma expressao escreve em um estado que ela mesma le."
        );
        continue;
      }
      try {
        job.run();
      } catch (err) {
        handleError(err, "effect");
      }
    }
  } finally {
    queue = [];
    isFlushing = false;
    const posts = postQueue;
    postQueue = [];
    for (const cb of posts) {
      try {
        cb();
      } catch (err) {
        handleError(err, "post-flush");
      }
    }
    if (queue.length || postQueue.length) {
      resolvedPromise.then(flushJobs);
      isFlushPending = true;
    }
  }
}
function handleError(err, context) {
  console.error(`[Voodoo] erro em ${context}:`, err);
}
function warn(msg, ...args) {
  console.warn(`[Voodoo] ${msg}`, ...args);
}
var activeEffect;
var shouldTrack = true;
var trackStack = [];
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function resetTracking() {
  shouldTrack = trackStack.pop() ?? true;
}
var ITERATE_KEY = /* @__PURE__ */ Symbol("voodoo:iterate");
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!shouldTrack || !activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, dep = /* @__PURE__ */ new Set());
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target, type, key, _newValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effects = /* @__PURE__ */ new Set();
  const add = (dep) => {
    if (!dep) return;
    for (const e of dep) if (e !== activeEffect || type === "clear" /* CLEAR */) effects.add(e);
  };
  if (type === "clear" /* CLEAR */) {
    depsMap.forEach(add);
  } else {
    if (key !== void 0) add(depsMap.get(key));
    const isArr = Array.isArray(target);
    if (type === "add" /* ADD */) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
      else if (isIntegerKey(key)) add(depsMap.get("length"));
    } else if (type === "delete" /* DELETE */) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
    } else if (isArr && key === "length") {
      const newLen = Number(_newValue);
      depsMap.forEach((dep, k) => {
        if (k === "length" || typeof k !== "symbol" && Number(k) >= newLen) add(dep);
      });
    }
  }
  for (const e of effects) {
    if (e.scheduler) e.scheduler();
    else queueJob(e);
  }
}
function isIntegerKey(key) {
  return typeof key === "string" && key !== "NaN" && key[0] !== "-" && String(parseInt(key, 10)) === key;
}
var RAW = /* @__PURE__ */ Symbol("voodoo:raw");
var IS_REACTIVE = /* @__PURE__ */ Symbol("voodoo:isReactive");
var SKIP = /* @__PURE__ */ Symbol("voodoo:skip");
var reactiveMap = /* @__PURE__ */ new WeakMap();
var arrayInstrumentations = /* @__PURE__ */ (() => {
  const inst = {};
  for (const key of ["includes", "indexOf", "lastIndexOf"]) {
    inst[key] = function(...args) {
      const arr = toRaw(this);
      for (let i = 0; i < arr.length; i++) track(arr, String(i));
      const res = arr[key].apply(arr, args);
      if (res === -1 || res === false) {
        return arr[key].apply(arr, args.map(toRaw));
      }
      return res;
    };
  }
  for (const key of ["push", "pop", "shift", "unshift", "splice"]) {
    inst[key] = function(...args) {
      pauseTracking();
      try {
        return toRaw(this)[key].apply(this, args);
      } finally {
        resetTracking();
      }
    };
  }
  return inst;
})();
function isObject(val) {
  return val !== null && typeof val === "object";
}
var NON_REACTIVE = /* @__PURE__ */ new Set([
  "Date",
  "RegExp",
  "Promise",
  "Error",
  "File",
  "FileList",
  "Blob",
  "FormData",
  "URL",
  "URLSearchParams",
  "ArrayBuffer",
  "DataView"
]);
function canObserve(value) {
  if (!isObject(value)) return false;
  if (value[SKIP]) return false;
  if (Object.isFrozen(value)) return false;
  if (typeof Node !== "undefined" && value instanceof Node) return false;
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  if (NON_REACTIVE.has(tag)) return false;
  return tag === "Object" || tag === "Array" || tag === "Map" || tag === "Set";
}
function toRaw(observed) {
  const raw = observed && observed[RAW];
  return raw ? toRaw(raw) : observed;
}
function isReactive(value) {
  return !!(value && value[IS_REACTIVE]);
}
function reactive(target) {
  if (!isObject(target)) return target;
  if (isReactive(target)) return target;
  if (!canObserve(target)) return target;
  const existing = reactiveMap.get(target);
  if (existing) return existing;
  const isMapOrSet = target instanceof Map || target instanceof Set;
  const proxy = new Proxy(
    target,
    isMapOrSet ? collectionHandlers : baseHandlers
  );
  reactiveMap.set(target, proxy);
  return proxy;
}
var baseHandlers = {
  get(target, key, receiver) {
    if (key === RAW) return target;
    if (key === IS_REACTIVE) return true;
    const isArr = Array.isArray(target);
    if (isArr && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target, key, receiver);
    if (typeof key === "symbol") return res;
    track(target, key);
    if (isRef(res)) return isArr && isIntegerKey(key) ? res : res.value;
    if (isObject(res)) return reactive(res);
    return res;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    value = toRaw(value);
    if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }
    const hadKey = Array.isArray(target) && isIntegerKey(key) ? Number(key) < target.length : Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.set(target, key, value, receiver);
    if (target === toRaw(receiver)) {
      if (!hadKey) trigger(target, "add" /* ADD */, key, value);
      else if (hasChanged(value, oldValue)) trigger(target, "set" /* SET */, key, value);
    }
    return result;
  },
  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) trigger(target, "delete" /* DELETE */, key);
    return result;
  },
  has(target, key) {
    const result = Reflect.has(target, key);
    if (typeof key !== "symbol") track(target, key);
    return result;
  },
  ownKeys(target) {
    track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
};
var collectionHandlers = {
  get(target, key, receiver) {
    if (key === RAW) return target;
    if (key === IS_REACTIVE) return true;
    const raw = target;
    if (key === "size") {
      track(raw, ITERATE_KEY);
      return Reflect.get(raw, "size", raw);
    }
    const methods = {
      get(k) {
        track(raw, k);
        const v = raw.get(k);
        return isObject(v) ? reactive(v) : v;
      },
      has(k) {
        track(raw, k);
        return raw.has(k);
      },
      add(v) {
        v = toRaw(v);
        const had = raw.has(v);
        raw.add(v);
        if (!had) trigger(raw, "add" /* ADD */, v, v);
        return receiver;
      },
      set(k, v) {
        const had = raw.has(k);
        const old = raw.get(k);
        raw.set(k, toRaw(v));
        if (!had) trigger(raw, "add" /* ADD */, k, v);
        else if (hasChanged(v, old)) trigger(raw, "set" /* SET */, k, v);
        return receiver;
      },
      delete(k) {
        const had = raw.has(k);
        const res2 = raw.delete(k);
        if (had) trigger(raw, "delete" /* DELETE */, k);
        return res2;
      },
      clear() {
        const had = raw.size !== 0;
        const res2 = raw.clear();
        if (had) trigger(raw, "clear" /* CLEAR */);
        return res2;
      },
      forEach(cb, thisArg) {
        track(raw, ITERATE_KEY);
        return raw.forEach((v, k) => {
          cb.call(thisArg, isObject(v) ? reactive(v) : v, isObject(k) ? reactive(k) : k, receiver);
        });
      }
    };
    if (key in methods) return methods[key];
    if (key === Symbol.iterator || key === "keys" || key === "values" || key === "entries") {
      track(raw, ITERATE_KEY);
      const method = raw[key];
      return typeof method === "function" ? method.bind(raw) : method;
    }
    const res = Reflect.get(raw, key, raw);
    return typeof res === "function" ? res.bind(raw) : res;
  }
};
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}
function isRef(r) {
  return !!(r && r.__v_isRef === true);
}

// src/runtime/registry.ts
var config = {
  prefix: "v-"};
var directives = /* @__PURE__ */ new Map();
var PRIORITY = {
  DATA: 70,
  DEFAULT: 0,
  TRANSITION: -20
};
function defineDirective(name, setup, options = {}) {
  directives.set(name, {
    name,
    setup,
    priority: options.priority ?? PRIORITY.DEFAULT,
    terminal: options.terminal ?? false
  });
}

// src/parser/interpreter.ts
var SafeObject = /* @__PURE__ */ Object.freeze({
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  assign: Object.assign,
  is: Object.is,
  hasOwn: Object.hasOwn ?? ((o, k) => Object.prototype.hasOwnProperty.call(o, k))
});
var allowedGlobals = {
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
  console
};
var VoodooRuntimeError = class extends Error {
  constructor(message, expression) {
    super(expression ? `${message}

Expressao: ${expression}` : message);
    __publicField(this, "expression", expression);
    this.name = "VoodooRuntimeError";
  }
};
var SPREAD = /* @__PURE__ */ Symbol("spread");
var CHAVES_BLOQUEADAS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function chaveBloqueada(key) {
  return typeof key === "string" && CHAVES_BLOQUEADAS.has(key);
}
function checarChave(key, expressao) {
  if (chaveBloqueada(key)) {
    throw new VoodooRuntimeError(
      `Acesso bloqueado a "${String(key)}": expressoes de template nao alcancam a cadeia de prototipos. Exponha um metodo no estado em vez disso.`,
      expressao
    );
  }
  return key;
}
function evaluate(node, scope) {
  switch (node.t) {
    case "lit":
      return node.v;
    case "tpl": {
      let out = node.quasis[0] ?? "";
      for (let i = 0; i < node.exprs.length; i++) {
        out += stringify(evaluate(node.exprs[i], scope));
        out += node.quasis[i + 1] ?? "";
      }
      return out;
    }
    case "id": {
      checarChave(node.n);
      const owner = scope.lookup(node.n);
      if (owner) return owner[node.n];
      if (node.n in allowedGlobals) return allowedGlobals[node.n];
      return void 0;
    }
    case "member": {
      const obj = evaluate(node.o, scope);
      if (obj == null) {
        if (node.opt) return void 0;
        throw new VoodooRuntimeError(
          `Nao foi possivel ler "${describeKey(node, scope)}" de ${obj === null ? "null" : "undefined"}`
        );
      }
      const key = checarChave(
        node.computed ? evaluate(node.p, scope) : node.p.v
      );
      return obj[key];
    }
    case "call": {
      let thisArg;
      let fn;
      if (node.callee.t === "member") {
        const obj = evaluate(node.callee.o, scope);
        if (obj == null) {
          if (node.callee.opt || node.opt) return void 0;
          throw new VoodooRuntimeError(
            `Nao foi possivel chamar "${describeKey(node.callee, scope)}" de ${obj === null ? "null" : "undefined"}`
          );
        }
        const key = checarChave(
          node.callee.computed ? evaluate(node.callee.p, scope) : node.callee.p.v
        );
        thisArg = obj;
        fn = obj[key];
      } else if (node.callee.t === "id") {
        checarChave(node.callee.n);
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
      if (fn == null && node.opt) return void 0;
      if (typeof fn !== "function") {
        const name = node.callee.t === "id" ? node.callee.n : describeKey(node.callee, scope);
        throw new VoodooRuntimeError(`"${name}" nao e uma funcao`);
      }
      return fn.apply(thisArg, evalArgs(node.args, scope));
    }
    case "unary": {
      if (node.op === "...") return { [SPREAD]: evaluate(node.a, scope) };
      if (node.op === "typeof") {
        if (node.a.t === "id") {
          if (chaveBloqueada(node.a.n)) return "undefined";
          const owner = scope.lookup(node.a.n);
          const value = owner ? owner[node.a.n] : allowedGlobals[node.a.n];
          return typeof value;
        }
        return typeof evaluate(node.a, scope);
      }
      const v = evaluate(node.a, scope);
      switch (node.op) {
        case "!":
          return !v;
        case "-":
          return -v;
        case "+":
          return +v;
        case "void":
          return void 0;
      }
      throw new VoodooRuntimeError(`Operador unario nao suportado: ${node.op}`);
    }
    case "update": {
      const old = Number(evaluate(node.a, scope));
      const updated = node.op === "++" ? old + 1 : old - 1;
      assign(node.a, updated, scope);
      return node.prefix ? updated : old;
    }
    case "bin": {
      const l = evaluate(node.l, scope);
      const r = evaluate(node.r, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
        case "**":
          return l ** r;
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case "===":
          return l === r;
        case "!==":
          return l !== r;
        case "<":
          return l < r;
        case ">":
          return l > r;
        case "<=":
          return l <= r;
        case ">=":
          return l >= r;
        case "in":
          return l in r;
        case "instanceof":
          return l instanceof r;
      }
      throw new VoodooRuntimeError(`Operador nao suportado: ${node.op}`);
    }
    case "logic": {
      const l = evaluate(node.l, scope);
      if (node.op === "&&") return l ? evaluate(node.r, scope) : l;
      if (node.op === "||") return l ? l : evaluate(node.r, scope);
      return l ?? evaluate(node.r, scope);
    }
    case "cond":
      return evaluate(node.test, scope) ? evaluate(node.cons, scope) : evaluate(node.alt, scope);
    case "assign": {
      let value;
      if (node.op === "=") {
        value = evaluate(node.value, scope);
      } else if (node.op === "&&=" || node.op === "||=" || node.op === "??=") {
        const current = evaluate(node.target, scope);
        const shouldAssign = node.op === "&&=" ? !!current : node.op === "||=" ? !current : current == null;
        if (!shouldAssign) return current;
        value = evaluate(node.value, scope);
      } else {
        const current = evaluate(node.target, scope);
        const operand = evaluate(node.value, scope);
        switch (node.op) {
          case "+=":
            value = current + operand;
            break;
          case "-=":
            value = current - operand;
            break;
          case "*=":
            value = current * operand;
            break;
          case "/=":
            value = current / operand;
            break;
          case "%=":
            value = current % operand;
            break;
          case "**=":
            value = current ** operand;
            break;
          default:
            throw new VoodooRuntimeError(`Atribuicao nao suportada: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }
    case "arrow": {
      const params = node.params;
      const body = node.body;
      return (...args) => {
        const vars = {};
        for (let i = 0; i < params.length; i++) vars[params[i]] = args[i];
        return evaluate(body, scope.child(vars));
      };
    }
    case "obj": {
      const out = {};
      for (const prop of node.props) {
        if (prop.spread) {
          Object.assign(out, evaluate(prop.spread, scope));
        } else {
          const key = checarChave(
            prop.key !== null ? prop.key : String(evaluate(prop.keyExpr, scope))
          );
          out[key] = evaluate(prop.value, scope);
        }
      }
      return out;
    }
    case "arr": {
      const out = [];
      for (const el of node.els) {
        if (el && typeof el === "object" && "spread" in el) {
          out.push(...evaluate(el.spread, scope));
        } else {
          out.push(evaluate(el, scope));
        }
      }
      return out;
    }
    case "seq": {
      let last;
      for (const stmt of node.body) last = evaluate(stmt, scope);
      return last;
    }
  }
  throw new VoodooRuntimeError(`No desconhecido: ${node.t}`);
}
function evalArgs(args, scope) {
  const out = [];
  for (const arg of args) {
    const value = evaluate(arg, scope);
    if (value && typeof value === "object" && SPREAD in value) {
      out.push(...value[SPREAD]);
    } else {
      out.push(value);
    }
  }
  return out;
}
function assign(target, value, scope) {
  if (target.t === "id") {
    checarChave(target.n);
    scope.set(target.n, value);
    return;
  }
  if (target.t === "member") {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError("Nao foi possivel escrever em null ou undefined");
    }
    const key = checarChave(
      target.computed ? evaluate(target.p, scope) : target.p.v
    );
    obj[key] = value;
    return;
  }
  throw new VoodooRuntimeError("Alvo de atribuicao invalido");
}
function describeKey(node, scope) {
  if (node.t === "member") {
    return node.computed ? String(evaluate(node.p, scope)) : String(node.p.v);
  }
  if (node.t === "id") return node.n;
  return "valor";
}
function stringify(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// src/parser/lexer.ts
var VoodooSyntaxError = class extends Error {
  constructor(message, source, position) {
    const pointer = `${source}
${" ".repeat(Math.max(0, position))}^`;
    super(`${message}

${pointer}`);
    __publicField(this, "source", source);
    __publicField(this, "position", position);
    this.name = "VoodooSyntaxError";
  }
};
var PUNCTUATORS = [
  ">>>=",
  "===",
  "!==",
  "**=",
  "...",
  "<<=",
  ">>=",
  "&&=",
  "||=",
  "??=",
  "?.",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "**",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "<",
  ">",
  "=",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  ",",
  ".",
  "?",
  ":",
  ";"
];
var IDENT_START = /[A-Za-z_$À-￿]/;
var IDENT_PART = /[A-Za-z0-9_$À-￿]/;
function isIdentStart(ch) {
  return IDENT_START.test(ch);
}
function isIdentPart(ch) {
  return IDENT_PART.test(ch);
}
function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}
var ESCAPES = {
  n: "\n",
  t: "	",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0"
};
function tokenize(source) {
  const tokens = [];
  let i = 0;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch === " " || ch === "	" || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\v") {
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < len && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) throw new VoodooSyntaxError("Comentario de bloco nao fechado", source, i);
      i = end + 2;
      continue;
    }
    const start = i;
    if (isDigit(ch) || ch === "." && isDigit(source[i + 1])) {
      let raw = "";
      if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        raw = "0x";
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) raw += source[i++];
      } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
        raw = "0b";
        i += 2;
        while (i < len && /[01_]/.test(source[i])) raw += source[i++];
      } else {
        while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        if (source[i] === ".") {
          raw += source[i++];
          while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        }
        if (source[i] === "e" || source[i] === "E") {
          raw += source[i++];
          if (source[i] === "+" || source[i] === "-") raw += source[i++];
          while (i < len && isDigit(source[i])) raw += source[i++];
        }
      }
      const parsed = Number(raw.replace(/_/g, ""));
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Numero invalido", source, start);
      tokens.push({ type: "num", value: raw, parsed, start, end: i });
      continue;
    }
    if (ch === '"' || ch === "'") {
      i++;
      let out = "";
      while (i < len && source[i] !== ch) {
        if (source[i] === "\\") {
          i++;
          const esc = source[i];
          if (esc === "u") {
            if (source[i + 1] === "{") {
              const close = source.indexOf("}", i);
              if (close === -1)
                throw new VoodooSyntaxError("Escape unicode nao fechado", source, start);
              const digitos = source.slice(i + 2, close);
              if (!/^[0-9a-fA-F]+$/.test(digitos) || parseInt(digitos, 16) > 1114111)
                throw new VoodooSyntaxError(
                  `Escape unicode invalido "\\u{${digitos}}"`,
                  source,
                  i - 1
                );
              out += String.fromCodePoint(parseInt(digitos, 16));
              i = close + 1;
            } else {
              const digitos = source.slice(i + 1, i + 5);
              if (!/^[0-9a-fA-F]{4}$/.test(digitos))
                throw new VoodooSyntaxError(
                  "Escape unicode invalido: \\u precisa de 4 digitos hexadecimais",
                  source,
                  i - 1
                );
              out += String.fromCharCode(parseInt(digitos, 16));
              i += 5;
            }
          } else if (esc === "x") {
            const digitos = source.slice(i + 1, i + 3);
            if (!/^[0-9a-fA-F]{2}$/.test(digitos))
              throw new VoodooSyntaxError(
                "Escape hexadecimal invalido: \\x precisa de 2 digitos hexadecimais",
                source,
                i - 1
              );
            out += String.fromCharCode(parseInt(digitos, 16));
            i += 3;
          } else {
            out += ESCAPES[esc] ?? esc;
            i++;
          }
        } else {
          out += source[i++];
        }
      }
      if (i >= len) throw new VoodooSyntaxError("String nao fechada", source, start);
      i++;
      tokens.push({ type: "str", value: out, parsed: out, start, end: i });
      continue;
    }
    if (ch === "`") {
      i++;
      const quasis = [];
      const exprs = [];
      let current = "";
      while (i < len && source[i] !== "`") {
        if (source[i] === "\\") {
          const esc = source[i + 1];
          current += ESCAPES[esc] ?? esc;
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          quasis.push(current);
          current = "";
          i += 2;
          let depth = 1;
          let expr = "";
          while (i < len) {
            const c = source[i];
            if (c === "{") depth++;
            else if (c === "}") {
              depth--;
              if (depth === 0) break;
            } else if (c === '"' || c === "'" || c === "`") {
              const quote = c;
              expr += source[i++];
              while (i < len && source[i] !== quote) {
                if (source[i] === "\\") expr += source[i++];
                expr += source[i++];
              }
            }
            expr += source[i++];
          }
          if (depth !== 0)
            throw new VoodooSyntaxError("Interpolacao de template nao fechada", source, start);
          i++;
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Template literal nao fechado", source, start);
      i++;
      quasis.push(current);
      tokens.push({
        type: "tpl",
        value: source.slice(start, i),
        tpl: { quasis, exprs },
        start,
        end: i
      });
      continue;
    }
    if (isIdentStart(ch)) {
      let name = "";
      while (i < len && isIdentPart(source[i])) name += source[i++];
      tokens.push({ type: "ident", value: name, start, end: i });
      continue;
    }
    let matched;
    for (const p of PUNCTUATORS) {
      if (source.startsWith(p, i)) {
        if (p === "?." && isDigit(source[i + 2])) continue;
        matched = p;
        break;
      }
    }
    if (matched) {
      i += matched.length;
      tokens.push({ type: "punct", value: matched, start, end: i });
      continue;
    }
    throw new VoodooSyntaxError(`Caractere inesperado "${ch}"`, source, i);
  }
  tokens.push({ type: "eof", value: "", start: len, end: len });
  return tokens;
}

// src/parser/parser.ts
var BINARY_PRECEDENCE = {
  "??": 1,
  "||": 2,
  "&&": 3,
  "==": 6,
  "!=": 6,
  "===": 6,
  "!==": 6,
  "<": 7,
  ">": 7,
  "<=": 7,
  ">=": 7,
  in: 7,
  instanceof: 7,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "%": 10,
  "**": 11
};
var ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??="]);
var UNARY_OPS = /* @__PURE__ */ new Set(["!", "-", "+", "typeof", "void"]);
var LITERALS = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  true: true,
  false: false,
  null: null,
  undefined: void 0
});
var MAX_DEPTH = 1200;
var MAX_TEMPLATE_DEPTH = 32;
var templateDepth = 0;
var Parser = class {
  constructor(tokens, source) {
    __publicField(this, "tokens", tokens);
    __publicField(this, "source", source);
    __publicField(this, "pos", 0);
    __publicField(this, "depth", 0);
  }
  peek(offset = 0) {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  next() {
    return this.tokens[this.pos++];
  }
  isPunct(value, offset = 0) {
    const t = this.peek(offset);
    return t.type === "punct" && t.value === value;
  }
  isIdent(value, offset = 0) {
    const t = this.peek(offset);
    return t.type === "ident" && t.value === value;
  }
  expect(value) {
    if (!this.isPunct(value)) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Esperava "${value}" mas encontrou "${t.value || "fim da expressao"}"`,
        this.source,
        t.start
      );
    }
    return this.next();
  }
  /** Ponto de entrada: uma ou mais expressoes separadas por `;` ou `,` no topo. */
  parseProgram() {
    const body = [];
    while (this.peek().type !== "eof") {
      body.push(this.parseExpression());
      while (this.isPunct(";")) this.next();
    }
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  parseExpression() {
    return this.parseAssignment();
  }
  /** Sobe um nivel de recursao e recusa a expressao quando passa do teto. */
  entrar() {
    if (++this.depth > MAX_DEPTH) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expressao aninhada demais (limite de ${MAX_DEPTH} niveis)`,
        this.source,
        t.start
      );
    }
  }
  parseAssignment() {
    this.entrar();
    const node = this.parseAssignmentInterno();
    this.depth--;
    return node;
  }
  parseAssignmentInterno() {
    if (this.peek().type === "ident" && this.isPunct("=>", 1)) {
      const param = this.next().value;
      this.next();
      return { t: "arrow", params: [param], body: this.parseAssignment() };
    }
    if (this.isPunct("(")) {
      const arrow = this.tryParseParenArrow();
      if (arrow) return arrow;
    }
    const left = this.parseConditional();
    const t = this.peek();
    if (t.type === "punct" && ASSIGN_OPS.has(t.value)) {
      if (left.t !== "id" && left.t !== "member") {
        throw new VoodooSyntaxError("Alvo de atribuicao invalido", this.source, t.start);
      }
      this.next();
      const value = this.parseAssignment();
      return { t: "assign", op: t.value, target: left, value };
    }
    return left;
  }
  /**
   * Tenta ler `( params ) =>`. Se o que vem depois do parentese de fechamento
   * nao for `=>`, volta a posicao original e deixa o caminho normal seguir.
   */
  tryParseParenArrow() {
    const start = this.pos;
    let depth = 0;
    let i = this.pos;
    for (; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === "punct" && t.value === "(") depth++;
      else if (t.type === "punct" && t.value === ")") {
        depth--;
        if (depth === 0) break;
      } else if (t.type === "eof") break;
    }
    const after = this.tokens[i + 1];
    if (!after || after.type !== "punct" || after.value !== "=>") return null;
    this.next();
    const params = [];
    while (!this.isPunct(")")) {
      const t = this.next();
      if (t.type !== "ident") {
        this.pos = start;
        return null;
      }
      params.push(t.value);
      if (this.isPunct(",")) this.next();
    }
    this.expect(")");
    this.expect("=>");
    return { t: "arrow", params, body: this.parseAssignment() };
  }
  parseConditional() {
    const test = this.parseBinary(0);
    if (this.isPunct("?")) {
      this.next();
      const cons = this.parseAssignment();
      this.expect(":");
      const alt = this.parseAssignment();
      return { t: "cond", test, cons, alt };
    }
    return test;
  }
  parseBinary(minPrec) {
    this.entrar();
    const node = this.parseBinarioInterno(minPrec);
    this.depth--;
    return node;
  }
  parseBinarioInterno(minPrec) {
    let left = this.parseUnary();
    for (; ; ) {
      const t = this.peek();
      const op = t.value;
      const isOperator = t.type === "punct" && op in BINARY_PRECEDENCE || t.type === "ident" && (op === "in" || op === "instanceof");
      if (!isOperator) break;
      const prec = BINARY_PRECEDENCE[op];
      if (prec === void 0 || prec <= minPrec) break;
      this.next();
      const right = this.parseBinary(op === "**" ? prec - 1 : prec);
      const kind = op === "&&" || op === "||" || op === "??" ? "logic" : "bin";
      left = { t: kind, op, l: left, r: right };
    }
    return left;
  }
  parseUnary() {
    this.entrar();
    const node = this.parseUnarioInterno();
    this.depth--;
    return node;
  }
  parseUnarioInterno() {
    const t = this.peek();
    if ((t.type === "punct" || t.type === "ident") && UNARY_OPS.has(t.value)) {
      this.next();
      return { t: "unary", op: t.value, a: this.parseUnary() };
    }
    if (t.type === "punct" && (t.value === "++" || t.value === "--")) {
      this.next();
      const arg = this.parseUnary();
      return { t: "update", op: t.value, a: arg, prefix: true };
    }
    let expr = this.parseCallMember();
    const post = this.peek();
    if (post.type === "punct" && (post.value === "++" || post.value === "--")) {
      this.next();
      expr = { t: "update", op: post.value, a: expr, prefix: false };
    }
    return expr;
  }
  parseCallMember() {
    let expr = this.parsePrimary();
    for (; ; ) {
      if (this.isPunct(".")) {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new VoodooSyntaxError("Nome de propriedade invalido", this.source, prop.start);
        }
        expr = { t: "member", o: expr, p: { t: "lit", v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct("?.")) {
        this.next();
        if (this.isPunct("(")) {
          expr = { t: "call", callee: expr, args: this.parseArguments(), opt: true };
        } else if (this.isPunct("[")) {
          this.next();
          const p = this.parseExpression();
          this.expect("]");
          expr = { t: "member", o: expr, p, computed: true, opt: true };
        } else {
          const prop = this.next();
          if (prop.type !== "ident") {
            throw new VoodooSyntaxError("Nome de propriedade invalido", this.source, prop.start);
          }
          expr = {
            t: "member",
            o: expr,
            p: { t: "lit", v: prop.value },
            computed: false,
            opt: true
          };
        }
      } else if (this.isPunct("[")) {
        this.next();
        const p = this.parseExpression();
        this.expect("]");
        expr = { t: "member", o: expr, p, computed: true, opt: false };
      } else if (this.isPunct("(")) {
        expr = { t: "call", callee: expr, args: this.parseArguments(), opt: false };
      } else {
        return expr;
      }
    }
  }
  parseArguments() {
    this.expect("(");
    const args = [];
    while (!this.isPunct(")")) {
      if (this.isPunct("...")) {
        this.next();
        args.push({ t: "unary", op: "...", a: this.parseAssignment() });
      } else {
        args.push(this.parseAssignment());
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect(")");
    return args;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.type === "num" || t.type === "str") {
      this.next();
      return { t: "lit", v: t.parsed };
    }
    if (t.type === "tpl") {
      this.next();
      const part = t.tpl;
      if (templateDepth >= MAX_TEMPLATE_DEPTH) {
        throw new VoodooSyntaxError(
          `Template literal aninhado demais (limite de ${MAX_TEMPLATE_DEPTH} niveis)`,
          this.source,
          t.start
        );
      }
      templateDepth++;
      try {
        return {
          t: "tpl",
          quasis: part.quasis,
          exprs: part.exprs.map((src) => parse(src))
        };
      } finally {
        templateDepth--;
      }
    }
    if (t.type === "ident") {
      if (t.value in LITERALS) {
        this.next();
        return { t: "lit", v: LITERALS[t.value] };
      }
      this.next();
      return { t: "id", n: t.value };
    }
    if (t.type === "punct") {
      if (t.value === "(") {
        this.next();
        const expr = this.parseExpression();
        this.expect(")");
        return expr;
      }
      if (t.value === "[") return this.parseArrayLiteral();
      if (t.value === "{") return this.parseObjectLiteral();
    }
    throw new VoodooSyntaxError(
      `Token inesperado "${t.value || "fim da expressao"}"`,
      this.source,
      t.start
    );
  }
  parseArrayLiteral() {
    this.expect("[");
    const els = [];
    while (!this.isPunct("]")) {
      if (this.isPunct("...")) {
        this.next();
        els.push({ spread: this.parseAssignment() });
      } else {
        els.push(this.parseAssignment());
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect("]");
    return { t: "arr", els };
  }
  parseObjectLiteral() {
    this.expect("{");
    const props = [];
    while (!this.isPunct("}")) {
      if (this.isPunct("...")) {
        this.next();
        props.push({ key: null, spread: this.parseAssignment() });
      } else if (this.isPunct("[")) {
        this.next();
        const keyExpr = this.parseAssignment();
        this.expect("]");
        this.expect(":");
        props.push({ key: null, keyExpr, value: this.parseAssignment() });
      } else {
        const keyToken = this.next();
        if (keyToken.type !== "ident" && keyToken.type !== "str" && keyToken.type !== "num") {
          throw new VoodooSyntaxError("Chave de objeto invalida", this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(":")) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
        } else {
          props.push({ key, value: { t: "id", n: key } });
        }
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect("}");
    return { t: "obj", props };
  }
};
var cache = /* @__PURE__ */ new Map();
var MAX_CACHE = 2e3;
function parse(source) {
  const cached = cache.get(source);
  if (cached) return cached;
  const node = new Parser(tokenize(source), source).parseProgram();
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(source, node);
  return node;
}
function avisarUmaVez(chave, mensagem) {
  return;
}

// src/runtime/walker.ts
var attributeCache = /* @__PURE__ */ new WeakMap();
function readAttr(el, name) {
  const cached = attributeCache.get(el)?.get(name);
  if (cached !== void 0) return cached;
  return el.getAttribute(name);
}
function evaluateIn(expression, scope, context, el) {
  if (!expression) return void 0;
  try {
    return evaluate(parse(expression), scope);
  } catch (err) {
    handleError(err, context ? `${context} ("${expression}")` : `expressao "${expression}"`);
    return void 0;
  }
}

// src/utils/index.ts
function parseDuration(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return value;
  const match = /^\s*([\d.]+)\s*(ms|s|m|h)?\s*$/i.exec(String(value));
  if (!match) return fallback;
  const amount = parseFloat(match[1]);
  switch ((match[2] || "ms").toLowerCase()) {
    case "s":
      return amount * 1e3;
    case "m":
      return amount * 6e4;
    case "h":
      return amount * 36e5;
    default:
      return amount;
  }
}

// src/devtools/bus.ts
var listeners = /* @__PURE__ */ new Map();
var devtoolsBus = {
  /** Publica um evento. Sem ouvintes, a chamada e praticamente gratuita. */
  emit(type, data) {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        listener(data);
      } catch (err) {
        console.error("[Voodoo] erro em ouvinte de devtools:", err);
      }
    }
  },
  /** Assina um tipo de evento. Devolve a funcao que cancela a assinatura. */
  on(type, callback) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, set = /* @__PURE__ */ new Set());
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  },
  /** Cancela uma assinatura especifica. */
  off(type, callback) {
    listeners.get(type)?.delete(callback);
  },
  /** Remove todos os ouvintes, de um tipo ou de todos. */
  clear(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
  /** Quantidade de ouvintes registrados em um tipo. */
  count(type) {
    return listeners.get(type)?.size ?? 0;
  }
};

// src/socket/protocol.ts
var ENGINE = {
  OPEN: "0",
  CLOSE: "1",
  PING: "2",
  PONG: "3",
  MESSAGE: "4",
  UPGRADE: "5",
  NOOP: "6"
};
var SIO = {
  CONNECT: 0,
  DISCONNECT: 1,
  EVENT: 2,
  ACK: 3,
  CONNECT_ERROR: 4,
  BINARY_EVENT: 5,
  BINARY_ACK: 6
};
function parseJson(text) {
  if (!text) return void 0;
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function decodeSocketIo(body) {
  if (!body) return null;
  const type = Number(body[0]);
  if (!Number.isInteger(type) || type < 0 || type > 6) return null;
  let i = 1;
  let namespace = "/";
  if (body[i] === "/") {
    const virgula = body.indexOf(",", i);
    if (virgula === -1) {
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, virgula);
    i = virgula + 1;
  }
  let ack;
  const inicioAck = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > inicioAck) ack = Number(body.slice(inicioAck, i));
  const resto = body.slice(i);
  return { type, namespace, ack, data: parseJson(resto) };
}
function decodeEngine(raw) {
  if (typeof raw !== "string" || !raw) return { kind: "unknown", raw: String(raw ?? "") };
  const codigo = raw[0];
  const corpo = raw.slice(1);
  switch (codigo) {
    case ENGINE.OPEN: {
      const dados = parseJson(corpo);
      return {
        kind: "open",
        handshake: {
          sid: dados?.sid ?? "",
          // Os valores do servidor mandam. Os padroes aqui sao os do Engine.IO
          // v4 e so entram em cena se o handshake vier incompleto.
          pingInterval: Number(dados?.pingInterval) || 25e3,
          pingTimeout: Number(dados?.pingTimeout) || 2e4,
          upgrades: dados?.upgrades,
          maxPayload: dados?.maxPayload
        }
      };
    }
    case ENGINE.CLOSE:
      return { kind: "close" };
    case ENGINE.PING:
      return { kind: "ping" };
    case ENGINE.PONG:
      return { kind: "pong" };
    case ENGINE.MESSAGE: {
      const packet = decodeSocketIo(corpo);
      return packet ? { kind: "message", packet } : { kind: "unknown", raw };
    }
    case ENGINE.NOOP:
      return { kind: "noop" };
    default:
      return { kind: "unknown", raw };
  }
}
function encodeSocketIo(packet) {
  let out = ENGINE.MESSAGE + String(packet.type);
  if (packet.namespace && packet.namespace !== "/") out += `${packet.namespace},`;
  if (packet.ack !== void 0) out += String(packet.ack);
  if (packet.data !== void 0) out += JSON.stringify(packet.data);
  return out;
}
function engineURL(base, path = "/socket.io/") {
  const caminho = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const consulta = "EIO=4&transport=websocket";
  try {
    const u = new URL(base);
    u.pathname = caminho;
    u.search = consulta;
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}${caminho}?${consulta}`;
  }
}

// src/socket/index.ts
var defaults = {
  baseURL: "",
  transport: "ws",
  reconnect: true,
  reconnectDelay: 500,
  reconnectMaxDelay: 3e4,
  reconnectMaxAttempts: Infinity,
  jitter: 0.3,
  heartbeat: 25e3,
  heartbeatTimeout: 1e4,
  pingPayload: "ping",
  pongPayload: "pong",
  queueLimit: 64,
  json: true,
  path: "/socket.io/",
  namespace: "/",
  auth: null,
  WebSocket: null,
  manual: false,
  joinEvent: "join",
  leaveEvent: "leave",
  presenceEvent: "room:members",
  memberJoinEvent: "room:joined",
  memberLeaveEvent: "room:left",
  roomBuffer: 50
};
var incomingInterceptors = [];
var outgoingInterceptors = [];
function usar(lista, fn) {
  lista.push(fn);
  return () => {
    const i = lista.indexOf(fn);
    if (i > -1) lista.splice(i, 1);
  };
}
function aplicar(lista, mensagem) {
  let atual = mensagem;
  for (const fn of lista) {
    if (!atual) return null;
    const resultado = fn(atual);
    if (resultado === null) return null;
    if (resultado) atual = resultado;
  }
  return atual;
}
var abertos = /* @__PURE__ */ new Set();
function mesmoMembro(a, b) {
  if (a === b) return true;
  const ida = a && typeof a === "object" ? a.id : a;
  const idb = b && typeof b === "object" ? b.id : b;
  return ida !== void 0 && ida === idb;
}
function resolveSocketURL(url, baseURL = defaults.baseURL) {
  let endereco = url || "/";
  if (baseURL && !/^(wss?|https?):\/\//i.test(endereco) && !endereco.startsWith("//")) {
    endereco = `${baseURL.replace(/\/$/, "")}/${endereco.replace(/^\//, "")}`;
  }
  if (/^wss?:\/\//i.test(endereco)) return endereco;
  if (/^https?:\/\//i.test(endereco)) return endereco.replace(/^http/i, "ws");
  if (typeof location === "undefined" || !location.host) return endereco;
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${location.host}${endereco.startsWith("/") ? endereco : `/${endereco}`}`;
}
function construtor(opcoes) {
  const escolhido = opcoes.WebSocket ?? defaults.WebSocket ?? globalThis.WebSocket;
  return typeof escolhido === "function" ? escolhido : null;
}
function socketSupported() {
  return construtor({}) !== null;
}
function createSocket(url, options = {}) {
  const opcoes = { ...defaults, ...options };
  const Impl = construtor(options);
  const base = resolveSocketURL(url, opcoes.baseURL);
  const socketIo = opcoes.transport === "socket.io";
  const endereco = socketIo ? engineURL(base, opcoes.path) : base;
  const estado = reactive({
    estado: "closed",
    conectado: false,
    tentativas: 0,
    enfileiradas: 0,
    erro: null
  });
  const ouvintes = /* @__PURE__ */ new Map();
  const fila = [];
  const acks = /* @__PURE__ */ new Map();
  const salas = /* @__PURE__ */ new Map();
  let ws = null;
  let proximoAck = 1;
  let fechadoDeProposito = false;
  let handshake = null;
  let abertoEm = 0;
  let timerReconexao = null;
  let timerHeartbeat = null;
  let timerVigilancia = null;
  function on(evento, ouvinte) {
    let conjunto = ouvintes.get(evento);
    if (!conjunto) ouvintes.set(evento, conjunto = /* @__PURE__ */ new Set());
    conjunto.add(ouvinte);
    return () => {
      conjunto?.delete(ouvinte);
    };
  }
  function once(evento, ouvinte) {
    const cancelar = on(evento, (dados, ack) => {
      cancelar();
      ouvinte(dados, ack);
    });
    return cancelar;
  }
  function off(evento, ouvinte) {
    if (!evento) {
      ouvintes.clear();
      return;
    }
    if (!ouvinte) {
      ouvintes.delete(evento);
      return;
    }
    ouvintes.get(evento)?.delete(ouvinte);
  }
  function entregar(evento, dados, ack) {
    for (const nome of evento === "message" ? [evento] : [evento, "message"]) {
      const conjunto = ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          console.error("[Voodoo] erro em ouvinte de socket:", err);
        }
      }
    }
  }
  function mudarEstado(novo) {
    if (estado.estado === novo) return;
    estado.estado = novo;
    estado.conectado = novo === "open";
    entregar(`state:${novo}`, novo);
  }
  function registrarErro(mensagem) {
    estado.erro = mensagem;
    entregar("error", mensagem);
    devtoolsBus.emit("network", {
      method: "WS",
      url: endereco,
      ok: false,
      error: mensagem,
      source: "socket"
    });
  }
  function pararTimers() {
    if (timerReconexao !== null) {
      clearTimeout(timerReconexao);
      timerReconexao = null;
    }
    if (timerHeartbeat !== null) {
      clearInterval(timerHeartbeat);
      timerHeartbeat = null;
    }
    if (timerVigilancia !== null) {
      clearTimeout(timerVigilancia);
      timerVigilancia = null;
    }
  }
  function armarVigilancia(ms) {
    if (timerVigilancia !== null) clearTimeout(timerVigilancia);
    timerVigilancia = null;
    if (!ms || ms <= 0) return;
    timerVigilancia = setTimeout(() => {
      timerVigilancia = null;
      registrarErro("conexao sem resposta");
      derrubar();
    }, ms);
  }
  function janelaDeSilencio() {
    if (socketIo) {
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opcoes.heartbeat > 0 ? opcoes.heartbeat + opcoes.heartbeatTimeout : 0;
  }
  function marcarVivo() {
    armarVigilancia(janelaDeSilencio());
  }
  function iniciarHeartbeat() {
    if (socketIo || opcoes.heartbeat <= 0) return;
    if (timerHeartbeat !== null) clearInterval(timerHeartbeat);
    timerHeartbeat = setInterval(() => {
      if (opcoes.pingPayload == null) return;
      enviarTexto(opcoes.pingPayload);
    }, opcoes.heartbeat);
  }
  function esperaDaTentativa(n) {
    const cru = opcoes.reconnectDelay * 2 ** Math.max(0, n - 1);
    const teto = Math.min(cru, opcoes.reconnectMaxDelay);
    const desvio = teto * Math.min(Math.max(opcoes.jitter, 0), 1);
    return Math.max(0, Math.round(teto - desvio + Math.random() * desvio * 2));
  }
  function agendarReconexao() {
    if (fechadoDeProposito || !opcoes.reconnect) {
      mudarEstado("closed");
      return;
    }
    if (estado.tentativas >= opcoes.reconnectMaxAttempts) {
      registrarErro(`reconexao desistiu apos ${estado.tentativas} tentativas`);
      mudarEstado("closed");
      return;
    }
    estado.tentativas += 1;
    mudarEstado("reconnecting");
    const espera = esperaDaTentativa(estado.tentativas);
    entregar("reconnecting", { attempt: estado.tentativas, delay: espera });
    if (timerReconexao !== null) clearTimeout(timerReconexao);
    timerReconexao = setTimeout(() => {
      timerReconexao = null;
      if (fechadoDeProposito) return;
      conectar();
    }, espera);
  }
  function enfileirar(texto) {
    if (opcoes.queueLimit <= 0) return;
    if (fila.length >= opcoes.queueLimit) {
      fila.shift();
    }
    fila.push(texto);
    estado.enfileiradas = fila.length;
  }
  function escoarFila() {
    if (!fila.length) return;
    const pendentes = fila.splice(0, fila.length);
    estado.enfileiradas = 0;
    for (const texto of pendentes) enviarTexto(texto);
  }
  function enviarTexto(texto) {
    if (ws && ws.readyState === 1 && (!socketIo || estado.conectado)) {
      try {
        ws.send(texto);
        return true;
      } catch (err) {
        registrarErro(err?.message ?? "falha ao enviar");
        return false;
      }
    }
    enfileirar(texto);
    return false;
  }
  function emit(evento, dados, ack) {
    const mensagem = aplicar(outgoingInterceptors, { event: evento, data: dados, url: endereco });
    if (!mensagem) return false;
    devtoolsBus.emit("event", {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: "socket:out"
    });
    if (socketIo) {
      let numero;
      if (ack) {
        numero = proximoAck++;
        acks.set(numero, ack);
      }
      const argumentos = mensagem.data === void 0 ? [mensagem.event] : [mensagem.event, mensagem.data];
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          ack: numero,
          data: argumentos
        })
      );
    }
    return enviarTexto(
      opcoes.json ? JSON.stringify({ event: mensagem.event, data: mensagem.data }) : String(mensagem.data ?? mensagem.event)
    );
  }
  function send(dados) {
    const mensagem = aplicar(outgoingInterceptors, { event: "message", data: dados, url: endereco });
    if (!mensagem) return false;
    const carga = mensagem.data;
    const texto = typeof carga === "string" ? carga : JSON.stringify(carga);
    if (socketIo) {
      return enviarTexto(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opcoes.namespace,
          data: ["message", carga]
        })
      );
    }
    return enviarTexto(texto);
  }
  function receber(evento, dados, cru, ack) {
    const mensagem = aplicar(incomingInterceptors, {
      event: evento,
      data: dados,
      url: endereco,
      raw: cru
    });
    if (!mensagem) return;
    devtoolsBus.emit("event", {
      type: `socket:${mensagem.event}`,
      detail: mensagem.data,
      source: "socket:in"
    });
    rotearPresenca(mensagem.event, mensagem.data);
    rotearSala(mensagem.event, mensagem.data, ack);
    entregar(mensagem.event, mensagem.data, ack);
  }
  function nomeDaSala(dados) {
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null;
    const objeto = dados;
    const nome = objeto.room ?? objeto.sala;
    return typeof nome === "string" && nome ? nome : null;
  }
  function cargaDaSala(dados) {
    const objeto = dados;
    if ("data" in objeto) return objeto.data;
    if ("dados" in objeto) return objeto.dados;
    return objeto;
  }
  function entregarNaSala(sala, evento, dados, ack) {
    for (const nome of evento === "message" ? [evento] : [evento, "message"]) {
      const conjunto = sala.ouvintes.get(nome);
      if (!conjunto) continue;
      for (const ouvinte of [...conjunto]) {
        try {
          ouvinte(dados, ack);
        } catch (err) {
          console.error("[Voodoo] erro em ouvinte de sala:", err);
        }
      }
    }
  }
  function rotearSala(evento, dados, ack) {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;
    if (evento === opcoes.presenceEvent || evento === opcoes.memberJoinEvent || evento === opcoes.memberLeaveEvent) {
      return;
    }
    const carga = cargaDaSala(dados);
    sala.estado.mensagens.push(carga);
    if (sala.estado.mensagens.length > sala.buffer) {
      sala.estado.mensagens.splice(0, sala.estado.mensagens.length - sala.buffer);
    }
    entregarNaSala(sala, evento, carga, ack);
  }
  function rotearPresenca(evento, dados) {
    const nome = nomeDaSala(dados);
    if (!nome) return;
    const sala = salas.get(nome);
    if (!sala) return;
    const objeto = dados;
    if (evento === opcoes.presenceEvent) {
      const lista = objeto.members ?? objeto.membros;
      if (Array.isArray(lista)) sala.estado.membros = [...lista];
      return;
    }
    const membro = objeto.member ?? objeto.membro ?? objeto.id;
    if (membro === void 0) return;
    if (evento === opcoes.memberJoinEvent) {
      if (!sala.estado.membros.some((m) => mesmoMembro(m, membro))) {
        sala.estado.membros.push(membro);
      }
      entregarNaSala(sala, "entrou", membro);
      return;
    }
    if (evento === opcoes.memberLeaveEvent) {
      const i = sala.estado.membros.findIndex((m) => mesmoMembro(m, membro));
      if (i > -1) sala.estado.membros.splice(i, 1);
      entregarNaSala(sala, "saiu", membro);
    }
  }
  function pedirEntrada(sala, nome) {
    sala.estado.estado = "joining";
    emit(opcoes.joinEvent, { room: nome, private: sala.privada });
  }
  function reentrarNasSalas() {
    for (const [nome, sala] of salas) {
      if (sala.estado.estado === "left") continue;
      pedirEntrada(sala, nome);
    }
  }
  function join(nome, config2 = {}) {
    const existente = salas.get(nome);
    if (existente && existente.estado.estado !== "left") return existente.publica;
    const privada = config2.privada ?? config2.private ?? false;
    const estadoSala = reactive({
      estado: "joining",
      membros: [],
      mensagens: []
    });
    const ouvintesSala = /* @__PURE__ */ new Map();
    const enviarNaSala = (evento, dados, destino) => emit(evento, destino ? { room: nome, to: destino, data: dados } : { room: nome, data: dados });
    const publica = {
      get name() {
        return nome;
      },
      get private() {
        return privada;
      },
      get privada() {
        return privada;
      },
      get state() {
        return estadoSala.estado;
      },
      get estado() {
        return estadoSala.estado;
      },
      get members() {
        return estadoSala.membros;
      },
      get membros() {
        return estadoSala.membros;
      },
      get messages() {
        return estadoSala.mensagens;
      },
      get mensagens() {
        return estadoSala.mensagens;
      },
      on(evento, ouvinte) {
        let conjunto = ouvintesSala.get(evento);
        if (!conjunto) ouvintesSala.set(evento, conjunto = /* @__PURE__ */ new Set());
        conjunto.add(ouvinte);
        return () => {
          conjunto?.delete(ouvinte);
        };
      },
      off(evento, ouvinte) {
        if (!evento) ouvintesSala.clear();
        else if (!ouvinte) ouvintesSala.delete(evento);
        else ouvintesSala.get(evento)?.delete(ouvinte);
      },
      emit: (evento, dados) => enviarNaSala(evento, dados),
      enviar: (evento, dados) => enviarNaSala(evento, dados),
      to: (destino) => ({
        emit: (evento, dados) => enviarNaSala(evento, dados, destino)
      }),
      leave: () => leave(nome),
      sair: () => leave(nome)
    };
    const interna = {
      publica,
      estado: estadoSala,
      ouvintes: ouvintesSala,
      privada,
      buffer: config2.buffer ?? opcoes.roomBuffer
    };
    salas.set(nome, interna);
    pedirEntrada(interna, nome);
    if (estado.conectado) estadoSala.estado = "joined";
    return publica;
  }
  function leave(nome) {
    const sala = salas.get(nome);
    if (!sala) return;
    salas.delete(nome);
    sala.estado.estado = "left";
    sala.ouvintes.clear();
    sala.estado.membros = [];
    if (estado.conectado) emit(opcoes.leaveEvent, { room: nome });
  }
  function to(destino) {
    return {
      emit: (evento, dados) => emit(evento, { to: destino, data: dados })
    };
  }
  function receberNativo(cru) {
    if (typeof cru !== "string") {
      receber("message", cru);
      return;
    }
    if (opcoes.pongPayload != null && cru === opcoes.pongPayload) return;
    let carga = cru;
    if (opcoes.json) {
      const inicio = cru.trimStart()[0];
      if (inicio === "{" || inicio === "[") {
        try {
          carga = JSON.parse(cru);
        } catch {
        }
      }
    }
    if (carga && typeof carga === "object" && !Array.isArray(carga)) {
      const objeto = carga;
      const nome = objeto.event ?? objeto.type;
      if (typeof nome === "string" && nome) {
        receber(nome, "data" in objeto ? objeto.data : objeto, cru);
        return;
      }
    }
    receber("message", carga, cru);
  }
  function receberSocketIo(cru) {
    const pacote = decodeEngine(cru);
    switch (pacote.kind) {
      case "open":
        handshake = pacote.handshake;
        enviarHandshakeConnect();
        marcarVivo();
        return;
      case "ping":
        ws?.send(ENGINE.PONG);
        marcarVivo();
        return;
      case "pong":
      case "noop":
        marcarVivo();
        return;
      case "close":
        derrubar();
        return;
      case "message":
        break;
      default:
        marcarVivo();
        return;
    }
    const { packet } = pacote;
    switch (packet.type) {
      case SIO.CONNECT:
        confirmarAbertura();
        return;
      case SIO.CONNECT_ERROR: {
        const dados = packet.data;
        registrarErro(dados?.message ?? "conexao recusada pelo servidor");
        derrubar();
        return;
      }
      case SIO.DISCONNECT:
        derrubar();
        return;
      case SIO.ACK: {
        const resposta = Array.isArray(packet.data) ? packet.data[0] : packet.data;
        if (packet.ack !== void 0) {
          const callback = acks.get(packet.ack);
          acks.delete(packet.ack);
          callback?.(resposta);
        }
        return;
      }
      case SIO.EVENT: {
        const argumentos = Array.isArray(packet.data) ? packet.data : [];
        const nome = typeof argumentos[0] === "string" ? argumentos[0] : "message";
        const carga = argumentos.length > 2 ? argumentos.slice(1) : argumentos[1];
        let responder;
        if (packet.ack !== void 0) {
          const numero = packet.ack;
          responder = (resposta) => {
            enviarTexto(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opcoes.namespace,
                ack: numero,
                data: [resposta]
              })
            );
          };
        }
        receber(nome, carga, typeof cru === "string" ? cru : void 0, responder);
        return;
      }
      default:
        avisarUmaVez(
          `socket-pacote:${endereco}`,
          `Pacote Socket.IO tipo ${packet.type} ignorado: anexos binarios nao estao implementados neste cliente.`
        );
    }
  }
  function enviarHandshakeConnect() {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opcoes.namespace,
        data: options.auth ?? defaults.auth ?? void 0
      })
    );
  }
  function confirmarAbertura() {
    estado.tentativas = 0;
    estado.erro = null;
    abertoEm = Date.now();
    mudarEstado("open");
    iniciarHeartbeat();
    marcarVivo();
    reentrarNasSalas();
    escoarFila();
    for (const sala of salas.values()) {
      if (sala.estado.estado === "joining") sala.estado.estado = "joined";
    }
    entregar("open", { url: endereco });
    devtoolsBus.emit("network", {
      method: "WS",
      url: endereco,
      status: 101,
      ok: true,
      source: "socket"
    });
  }
  function soltarWs() {
    const anterior = ws;
    if (anterior) {
      anterior.onopen = null;
      anterior.onclose = null;
      anterior.onerror = null;
      anterior.onmessage = null;
    }
    ws = null;
    return anterior;
  }
  function derrubar() {
    const anterior = soltarWs();
    handshake = null;
    if (timerHeartbeat !== null) {
      clearInterval(timerHeartbeat);
      timerHeartbeat = null;
    }
    if (timerVigilancia !== null) {
      clearTimeout(timerVigilancia);
      timerVigilancia = null;
    }
    estado.conectado = false;
    try {
      anterior?.close();
    } catch {
    }
    entregar("close", { url: endereco });
    agendarReconexao();
  }
  function conectar() {
    if (!Impl) return;
    if (ws) return;
    mudarEstado(estado.tentativas > 0 ? "reconnecting" : "connecting");
    let novo;
    try {
      novo = new Impl(endereco, opcoes.protocols);
    } catch (err) {
      registrarErro(err?.message ?? "falha ao abrir a conexao");
      agendarReconexao();
      return;
    }
    ws = novo;
    novo.onopen = () => {
      if (ws !== novo) return;
      if (socketIo) marcarVivo();
      else confirmarAbertura();
    };
    novo.onmessage = (evento) => {
      if (ws !== novo) return;
      marcarVivo();
      if (socketIo) receberSocketIo(evento?.data);
      else receberNativo(evento?.data);
    };
    novo.onerror = () => {
      if (ws !== novo) return;
      registrarErro("falha na conexao");
    };
    novo.onclose = (evento) => {
      if (ws !== novo) return;
      soltarWs();
      handshake = null;
      if (timerHeartbeat !== null) {
        clearInterval(timerHeartbeat);
        timerHeartbeat = null;
      }
      if (timerVigilancia !== null) {
        clearTimeout(timerVigilancia);
        timerVigilancia = null;
      }
      estado.conectado = false;
      const detalhe = evento;
      entregar("close", { url: endereco, code: detalhe?.code, reason: detalhe?.reason });
      devtoolsBus.emit("network", {
        method: "WS",
        url: endereco,
        status: detalhe?.code,
        ok: true,
        duration: abertoEm ? Date.now() - abertoEm : void 0,
        source: "socket"
      });
      agendarReconexao();
    };
  }
  function open() {
    fechadoDeProposito = false;
    if (!Impl) return;
    abertos.add(instancia);
    if (ws || timerReconexao !== null) return;
    conectar();
  }
  function close(code, reason) {
    fechadoDeProposito = true;
    pararTimers();
    mudarEstado("closing");
    const anterior = soltarWs();
    handshake = null;
    acks.clear();
    fila.length = 0;
    estado.enfileiradas = 0;
    estado.tentativas = 0;
    for (const [nome, sala] of salas) {
      sala.estado.estado = "left";
      sala.ouvintes.clear();
      sala.estado.membros = [];
      salas.delete(nome);
    }
    try {
      anterior?.close(code, reason);
    } catch {
    }
    abertos.delete(instancia);
    mudarEstado("closed");
    entregar("close", { url: endereco, code, reason });
  }
  const instancia = {
    get url() {
      return endereco;
    },
    get state() {
      return estado.estado;
    },
    get connected() {
      return estado.conectado;
    },
    get attempts() {
      return estado.tentativas;
    },
    get queued() {
      return estado.enfileiradas;
    },
    get error() {
      return estado.erro;
    },
    get raw() {
      return ws;
    },
    get rooms() {
      return [...salas.values()].map((s) => s.publica);
    },
    on,
    once,
    off,
    emit,
    send,
    open,
    close,
    join,
    leave,
    to
  };
  if (!Impl) {
    estado.erro = "WebSocket indisponivel neste ambiente";
    return instancia;
  }
  if (!opcoes.manual) open();
  else abertos.add(instancia);
  return instancia;
}
var fabrica = ((url, options = {}) => createSocket(url, options));
Object.assign(fabrica, {
  defaults,
  interceptors: {
    incoming: { use: (fn) => usar(incomingInterceptors, fn) },
    outgoing: { use: (fn) => usar(outgoingInterceptors, fn) }
  },
  close() {
    for (const s of [...abertos]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl) {
    defaults.WebSocket = impl;
  }
});
Object.defineProperty(fabrica, "open", {
  get: () => [...abertos],
  enumerable: true
});
var socket = fabrica;

// src/directives/socket.ts
function attr(el, nome) {
  return readAttr(el, `${config.prefix}${nome}`);
}
var conexoes = /* @__PURE__ */ new WeakMap();
var salasPorElemento = /* @__PURE__ */ new WeakMap();
function maisProximo(el, mapa) {
  let atual = el;
  while (atual) {
    const encontrado = mapa.get(atual);
    if (encontrado) return encontrado;
    atual = atual.parentElement;
  }
  return null;
}
function resolverTexto(expressao, scope, contexto) {
  const texto = expressao.trim();
  if (!texto) return "";
  if (/^[A-Za-z_$][\w$]*$/.test(texto)) {
    const valor2 = scope.has(texto) ? scope.get(texto) : void 0;
    return typeof valor2 === "string" && valor2 ? valor2 : texto;
  }
  if (/^(wss?|https?):\/\//i.test(texto) || /^[\w:.\-/]+$/.test(texto)) return texto;
  const valor = evaluateIn(texto, scope, contexto);
  return typeof valor === "string" && valor ? valor : texto;
}
function disparar(el, tipo, detalhe) {
  el.dispatchEvent(new CustomEvent(tipo, { detail: detalhe, bubbles: true }));
}
defineDirective(
  "socket",
  ({ el, scope, expression, modifiers, cleanup, effect: effect2 }) => {
    const nome = attr(el, "socket-as") || "$socket";
    if (!socketSupported()) {
      el.setAttribute("data-socket", "unsupported");
      scope.set(
        nome,
        reactive({
          conectado: false,
          estado: "closed",
          erro: "WebSocket indisponivel neste ambiente",
          tentativas: 0,
          mensagens: [],
          enviar: () => false,
          abrir: () => void 0,
          fechar: () => void 0,
          socket: null
        })
      );
      disparar(el, "voodoo:socket-unsupported", { url: expression });
      return;
    }
    const limite = Number(attr(el, "socket-buffer") ?? 50);
    const transporte = attr(el, "socket-transport") || "ws";
    const reconectar = !modifiers["no-reconnect"] && modifiers.reconnect !== "false" && attr(el, "socket-reconnect") !== "false";
    const opcoes = {
      transport: transporte === "socket.io" ? "socket.io" : "ws",
      manual: !!modifiers.manual,
      reconnect: reconectar
    };
    if (modifiers.json) opcoes.json = modifiers.json !== "false";
    const caminho = attr(el, "socket-path");
    if (caminho) opcoes.path = caminho;
    const batida = attr(el, "socket-heartbeat");
    if (batida !== null) opcoes.heartbeat = parseDuration(batida, 25e3);
    const s = createSocket(resolverTexto(expression, scope, "v-socket") || "/", opcoes);
    conexoes.set(el, s);
    el.setAttribute("data-socket", "ready");
    function enviar(evento, ...resto) {
      if (typeof evento !== "string") return s.send(evento);
      return resto.length ? s.emit(evento, resto[0]) : s.emit(evento);
    }
    const vista = reactive({
      conectado: s.connected,
      estado: s.state,
      erro: s.error,
      tentativas: s.attempts,
      mensagens: [],
      enviar,
      abrir: () => s.open(),
      fechar: () => s.close(),
      socket: s
    });
    scope.set(nome, vista);
    effect2(() => {
      vista.conectado = s.connected;
      vista.estado = s.state;
      vista.erro = s.error;
      vista.tentativas = s.attempts;
    });
    const cancelar = [
      s.on("message", (dados) => {
        vista.mensagens.push(dados);
        if (vista.mensagens.length > limite) {
          vista.mensagens.splice(0, vista.mensagens.length - limite);
        }
      }),
      s.on("open", () => disparar(el, "voodoo:socket-open", { url: s.url })),
      s.on("close", (d) => disparar(el, "voodoo:socket-close", d)),
      s.on("error", (d) => disparar(el, "voodoo:socket-error", d))
    ];
    cleanup(() => {
      for (const parar of cancelar) parar();
      s.off();
      s.close();
      conexoes.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);
defineDirective(
  "room",
  ({ el, scope, expression, modifiers, cleanup, effect: effect2 }) => {
    const s = maisProximo(el, conexoes);
    if (!s) return;
    const nomeSala = resolverTexto(expression, scope, "v-room");
    if (!nomeSala) return;
    const sala = s.join(nomeSala, {
      privada: !!modifiers.privada || !!modifiers.private,
      buffer: Number(attr(el, "room-buffer") ?? 50)
    });
    salasPorElemento.set(el, sala);
    const vista = reactive({
      nome: nomeSala,
      privada: sala.privada,
      estado: sala.estado,
      membros: sala.membros,
      mensagens: sala.mensagens,
      /** Envia para a sala. Com `para`, so para aquele destinatario. */
      enviar: (evento, dados, para) => para ? sala.to(para).emit(evento, dados) : sala.emit(evento, dados),
      sair: () => sala.leave(),
      sala
    });
    scope.set(attr(el, "room-as") || "$room", vista);
    effect2(() => {
      vista.estado = sala.estado;
      vista.membros = sala.membros;
      vista.mensagens = sala.mensagens;
    });
    const cancelar = [
      sala.on("entrou", (m) => disparar(el, "voodoo:room-join", m)),
      sala.on("saiu", (m) => disparar(el, "voodoo:room-leave", m))
    ];
    cleanup(() => {
      for (const parar of cancelar) parar();
      sala.off();
      sala.leave();
      salasPorElemento.delete(el);
    });
  },
  // Depois de `v-socket`, para a conexao ja existir quando a sala pedir entrada.
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("on-socket", ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const alvo2 = maisProximo(el, salasPorElemento) ?? maisProximo(el, conexoes);
  if (!alvo2) return;
  const cancelar = alvo2.on(arg, (dados, ack) => {
    const local = scope.child({ $event: dados, $ack: ack, $el: el });
    const valor = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof valor === "function") valor.call(scope.data, dados);
  });
  cleanup(cancelar);
});
for (const nome of [
  "socket-transport",
  "socket-as",
  "socket-buffer",
  "socket-path",
  "socket-heartbeat",
  "socket-reconnect",
  "room-as",
  "room-buffer"
]) {
  defineDirective(nome, () => void 0, { priority: PRIORITY.TRANSITION });
}

// src/socket/plugin.ts
var voodooSocket = {
  name: "socket",
  install(V) {
    if (!V.socket) V.socket = socket;
  }
};
var alvo = globalThis.V;
if (alvo && typeof alvo === "object" && !alvo.socket) alvo.socket = socket;
var plugin_default = voodooSocket;

exports.ENGINE = ENGINE;
exports.SIO = SIO;
exports.createSocket = createSocket;
exports.decodeEngine = decodeEngine;
exports.decodeSocketIo = decodeSocketIo;
exports.default = plugin_default;
exports.encodeSocketIo = encodeSocketIo;
exports.engineURL = engineURL;
exports.resolveSocketURL = resolveSocketURL;
exports.socket = socket;
exports.socketSupported = socketSupported;
exports.voodooSocket = voodooSocket;
//# sourceMappingURL=socket.cjs.map
//# sourceMappingURL=socket.cjs.map