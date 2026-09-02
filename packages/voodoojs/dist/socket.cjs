'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Voodoo.js v0.4.5
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
function warnOnce(key, message) {
  return;
}

// src/reactivity/index.ts
var resolvedPromise = /* @__PURE__ */ Promise.resolve();
var queue = [];
var postQueue = [];
var isFlushing = false;
var isFlushPending = false;
var RECURSION_LIMIT = 100;
function queueJob(job) {
  if (job.queued) return;
  job.queued = true;
  queue.push(job);
  queueFlush();
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
        warn2(
          "Infinite update loop detected. A reactive effect keeps triggering itself without ever settling. Check whether some expression writes to state that it also reads."
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
    for (const job of queue) job.queued = false;
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
  console.error(`[Voodoo] error in ${context}:`, err);
}
function warn2(msg, ...args) {
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
function track(target2, key) {
  if (!shouldTrack || !activeEffect) return;
  let depsMap = targetMap.get(target2);
  if (!depsMap) targetMap.set(target2, depsMap = /* @__PURE__ */ new Map());
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, dep = /* @__PURE__ */ new Set());
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target2, type, key, _newValue) {
  const depsMap = targetMap.get(target2);
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
    const isArr = Array.isArray(target2);
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
function reactive(target2) {
  if (!isObject(target2)) return target2;
  if (isReactive(target2)) return target2;
  if (!canObserve(target2)) return target2;
  const existing = reactiveMap.get(target2);
  if (existing) return existing;
  const isMapOrSet = target2 instanceof Map || target2 instanceof Set;
  const proxy = new Proxy(
    target2,
    isMapOrSet ? collectionHandlers : baseHandlers
  );
  reactiveMap.set(target2, proxy);
  return proxy;
}
var baseHandlers = {
  get(target2, key, receiver) {
    if (key === RAW) return target2;
    if (key === IS_REACTIVE) return true;
    const isArr = Array.isArray(target2);
    if (isArr && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target2, key, receiver);
    if (typeof key === "symbol") return res;
    track(target2, key);
    if (isRef(res)) return isArr && isIntegerKey(key) ? res : res.value;
    if (isObject(res)) return reactive(res);
    return res;
  },
  set(target2, key, value, receiver) {
    const oldValue = target2[key];
    value = toRaw(value);
    if (!Array.isArray(target2) && isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }
    const hadKey = Array.isArray(target2) && isIntegerKey(key) ? Number(key) < target2.length : Object.prototype.hasOwnProperty.call(target2, key);
    const result = Reflect.set(target2, key, value, receiver);
    if (target2 === toRaw(receiver)) {
      if (!hadKey) trigger(target2, "add" /* ADD */, key, value);
      else if (hasChanged(value, oldValue)) trigger(target2, "set" /* SET */, key, value);
    }
    return result;
  },
  deleteProperty(target2, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target2, key);
    const result = Reflect.deleteProperty(target2, key);
    if (result && hadKey) trigger(target2, "delete" /* DELETE */, key);
    return result;
  },
  has(target2, key) {
    const result = Reflect.has(target2, key);
    if (typeof key !== "symbol") track(target2, key);
    return result;
  },
  ownKeys(target2) {
    track(target2, Array.isArray(target2) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target2);
  }
};
var collectionHandlers = {
  get(target2, key, receiver) {
    if (key === RAW) return target2;
    if (key === IS_REACTIVE) return true;
    const raw = target2;
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
var DELIBERATELY_WITHHELD = /* @__PURE__ */ new Set([
  "eval",
  "Function",
  "window",
  "globalThis",
  "self",
  "top",
  "parent",
  "document",
  "fetch",
  "XMLHttpRequest",
  "importScripts",
  "require",
  "process",
  "Reflect",
  "Proxy",
  "WebAssembly",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
  "location",
  "history",
  "crypto",
  "Worker",
  "SharedWorker",
  "ServiceWorker"
]);
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

Expression: ${expression}` : message);
    __publicField(this, "expression", expression);
    this.name = "VoodooRuntimeError";
  }
};
var SPREAD = /* @__PURE__ */ Symbol("spread");
var BLOCKED_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function chaveBloqueada(key) {
  return typeof key === "string" && BLOCKED_KEYS.has(key);
}
function checkKey(key, expression) {
  if (chaveBloqueada(key)) {
    throw new VoodooRuntimeError(
      `Access blocked to "${String(key)}": template expressions cannot reach the prototype chain. Expose a method in state instead.`,
      expression
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
      checkKey(node.n);
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
          `Could not read "${describeKey(node, scope)}" from ${obj === null ? "null" : "undefined"}`
        );
      }
      const key = checkKey(
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
            `Could not call "${describeKey(node.callee, scope)}" from ${obj === null ? "null" : "undefined"}`
          );
        }
        const key = checkKey(
          node.callee.computed ? evaluate(node.callee.p, scope) : node.callee.p.v
        );
        thisArg = obj;
        fn = obj[key];
      } else if (node.callee.t === "id") {
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
      if (fn == null && node.opt) return void 0;
      if (typeof fn !== "function") {
        const name = node.callee.t === "id" ? node.callee.n : describeKey(node.callee, scope);
        if (node.callee.t === "id" && !scope.lookup(name) && !(name in allowedGlobals)) {
          if (DELIBERATELY_WITHHELD.has(name)) {
            throw new VoodooRuntimeError(
              `"${name}" is blocked. Expressions run in a sandbox without access to it.`
            );
          }
          throw new VoodooRuntimeError(
            `"${name}" was not found. Expressions cannot reach window: expose it with V.config.globals.${name} = ..., or put it in scope with V.data({ ${name} }).`
          );
        }
        throw new VoodooRuntimeError(`"${name}" is not a function`);
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
      throw new VoodooRuntimeError(`Unsupported unary operator: ${node.op}`);
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
      throw new VoodooRuntimeError(`Unsupported operator: ${node.op}`);
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
            throw new VoodooRuntimeError(`Unsupported assignment: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }
    case "if": {
      if (evaluate(node.test, scope)) return evaluate(node.cons, scope);
      return node.alt ? evaluate(node.alt, scope) : void 0;
    }
    case "method": {
      const methodParams = node.params;
      const methodBody = node.body;
      return function(...args) {
        const vars = {};
        for (let i = 0; i < methodParams.length; i++) vars[methodParams[i]] = args[i];
        const owner = this;
        const base = owner !== null && typeof owner === "object" ? scope.child(owner) : scope;
        return evaluate(methodBody, base.child(vars));
      };
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
          const key = checkKey(
            prop.key !== null ? prop.key : String(evaluate(prop.keyExpr, scope))
          );
          if (prop.getter) {
            const compute = evaluate(prop.value, scope);
            Object.defineProperty(out, key, {
              enumerable: true,
              configurable: true,
              get() {
                return compute.call(this);
              }
            });
            continue;
          }
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
  throw new VoodooRuntimeError(`Unknown node: ${node.t}`);
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
function assign(target2, value, scope) {
  if (target2.t === "id") {
    checkKey(target2.n);
    scope.set(target2.n, value);
    return;
  }
  if (target2.t === "member") {
    const obj = evaluate(target2.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError("Could not write to null or undefined");
    }
    const key = checkKey(
      target2.computed ? evaluate(target2.p, scope) : target2.p.v
    );
    obj[key] = value;
    return;
  }
  throw new VoodooRuntimeError("Invalid assignment target");
}
function describeKey(node, scope) {
  if (node.t === "member") {
    return node.computed ? String(evaluate(node.p, scope)) : String(node.p.v);
  }
  if (node.t === "id") return node.n;
  return "value";
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
      if (end === -1) throw new VoodooSyntaxError("Unclosed block comment", source, i);
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
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Invalid number", source, start);
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
                throw new VoodooSyntaxError("Unclosed Unicode escape", source, start);
              const digits = source.slice(i + 2, close);
              if (!/^[0-9a-fA-F]+$/.test(digits) || parseInt(digits, 16) > 1114111)
                throw new VoodooSyntaxError(
                  `Invalid Unicode escape "\\u{${digits}}"`,
                  source,
                  i - 1
                );
              out += String.fromCodePoint(parseInt(digits, 16));
              i = close + 1;
            } else {
              const digits = source.slice(i + 1, i + 5);
              if (!/^[0-9a-fA-F]{4}$/.test(digits))
                throw new VoodooSyntaxError(
                  "Invalid Unicode escape: \\u needs 4 hexadecimal digits",
                  source,
                  i - 1
                );
              out += String.fromCharCode(parseInt(digits, 16));
              i += 5;
            }
          } else if (esc === "x") {
            const digits = source.slice(i + 1, i + 3);
            if (!/^[0-9a-fA-F]{2}$/.test(digits))
              throw new VoodooSyntaxError(
                "Invalid hexadecimal escape: \\x needs 2 hexadecimal digits",
                source,
                i - 1
              );
            out += String.fromCharCode(parseInt(digits, 16));
            i += 3;
          } else {
            out += ESCAPES[esc] ?? esc;
            i++;
          }
        } else {
          out += source[i++];
        }
      }
      if (i >= len) throw new VoodooSyntaxError("Unclosed string", source, start);
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
            throw new VoodooSyntaxError("Unclosed template interpolation", source, start);
          i++;
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Unclosed template literal", source, start);
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
    throw new VoodooSyntaxError(`Unexpected character "${ch}"`, source, i);
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
        `Expected "${value}" but found "${t.value || "end of expression"}"`,
        this.source,
        t.start
      );
    }
    return this.next();
  }
  /** Entry point: one or more expressions separated by `;` or `,` at the top. */
  parseProgram() {
    const body = [];
    while (this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  /**
   * Parses the body of an arrow function.
   *
   * A `{` right after `=>` opens a block, as in JavaScript, and the block's
   * last value is what the arrow returns. Without this, the common
   * `(() => { count = 42 })()` failed to parse, because `{` was read as the
   * start of an object literal and `=` inside it made no sense.
   *
   * To return an object literal, wrap it in parentheses exactly as JavaScript
   * requires: `() => ({ a: 1 })`.
   */
  parseArrowBody() {
    if (!this.isPunct("{")) return this.parseAssignment();
    this.next();
    const body = [];
    while (!this.isPunct("}") && this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    this.expect("}");
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  /**
   * One statement. Only `if` needs its own form; everything else in this
   * language is an expression.
   */
  parseStatement() {
    if (this.peek().type === "ident" && this.peek().value === "if" && this.isPunct("(", 1)) {
      this.next();
      this.expect("(");
      const test = this.parseExpression();
      this.expect(")");
      const cons = this.parseBlockOrStatement();
      let alt = null;
      if (this.peek().type === "ident" && this.peek().value === "else") {
        this.next();
        alt = this.parseBlockOrStatement();
      }
      return { t: "if", test, cons, alt };
    }
    return this.parseExpression();
  }
  /** The body of an `if` or `else`, with or without braces. */
  parseBlockOrStatement() {
    if (!this.isPunct("{")) return this.parseStatement();
    this.next();
    const body = [];
    while (!this.isPunct("}") && this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    this.expect("}");
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  parseExpression() {
    return this.parseAssignment();
  }
  /** Raises recursion level and rejects expression when exceeding limit. */
  enterLevel() {
    if (++this.depth > MAX_DEPTH) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expression too deeply nested (limit of ${MAX_DEPTH} levels)`,
        this.source,
        t.start
      );
    }
  }
  parseAssignment() {
    this.enterLevel();
    const node = this.parseAssignmentInternal();
    this.depth--;
    return node;
  }
  parseAssignmentInternal() {
    if (this.peek().type === "ident" && this.isPunct("=>", 1)) {
      const param = this.next().value;
      this.next();
      return { t: "arrow", params: [param], body: this.parseArrowBody() };
    }
    if (this.isPunct("(")) {
      const arrow = this.tryParseParenArrow();
      if (arrow) return arrow;
    }
    const left = this.parseConditional();
    const t = this.peek();
    if (t.type === "punct" && ASSIGN_OPS.has(t.value)) {
      if (left.t !== "id" && left.t !== "member") {
        throw new VoodooSyntaxError("Invalid assignment target", this.source, t.start);
      }
      this.next();
      const value = this.parseAssignment();
      return { t: "assign", op: t.value, target: left, value };
    }
    return left;
  }
  /**
   * Tries to read `( params ) =>`. If what comes after the closing parenthesis
   * is not `=>`, returns to original position and lets normal parsing continue.
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
    return { t: "arrow", params, body: this.parseArrowBody() };
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
    this.enterLevel();
    const node = this.parseBinaryInternal(minPrec);
    this.depth--;
    return node;
  }
  parseBinaryInternal(minPrec) {
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
    this.enterLevel();
    const node = this.parseUnaryInternal();
    this.depth--;
    return node;
  }
  parseUnaryInternal() {
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
          throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
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
            throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
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
    if (t.type === "ident" && t.value === "function") {
      this.next();
      if (this.peek().type === "ident") this.next();
      this.expect("(");
      const params = [];
      while (!this.isPunct(")")) {
        const param = this.next();
        if (param.type !== "ident") {
          throw new VoodooSyntaxError("Expected a parameter name", this.source, param.start);
        }
        params.push(param.value);
        if (this.isPunct(",")) this.next();
      }
      this.expect(")");
      return { t: "arrow", params, body: this.parseArrowBody() };
    }
    if (t.type === "num" || t.type === "str") {
      this.next();
      return { t: "lit", v: t.parsed };
    }
    if (t.type === "tpl") {
      this.next();
      const part = t.tpl;
      if (templateDepth >= MAX_TEMPLATE_DEPTH) {
        throw new VoodooSyntaxError(
          `Template literal too deeply nested (limit of ${MAX_TEMPLATE_DEPTH} levels)`,
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
      `Unexpected token "${t.value || "end of expression"}"`,
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
        if (this.peek().type === "ident" && this.peek().value === "get" && this.peek(1).type === "ident" && this.isPunct("(", 2)) {
          this.next();
          const nameToken = this.next();
          this.expect("(");
          this.expect(")");
          props.push({
            key: String(nameToken.value),
            getter: true,
            value: { t: "method", params: [], body: this.parseArrowBody() }
          });
          if (this.isPunct(",")) this.next();
          continue;
        }
        const keyToken = this.next();
        if (keyToken.type !== "ident" && keyToken.type !== "str" && keyToken.type !== "num") {
          throw new VoodooSyntaxError("Invalid object key", this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(":")) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
        } else if (this.isPunct("(")) {
          this.next();
          const params = [];
          while (!this.isPunct(")")) {
            const param = this.next();
            if (param.type !== "ident") {
              throw new VoodooSyntaxError("Expected a parameter name", this.source, param.start);
            }
            params.push(param.value);
            if (this.isPunct(",")) this.next();
          }
          this.expect(")");
          props.push({ key, value: { t: "method", params, body: this.parseArrowBody() } });
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
  if (cache.size >= MAX_CACHE) evictOldest();
  cache.set(source, node);
  return node;
}
function evictOldest() {
  const alvo = Math.floor(MAX_CACHE / 2);
  let removidos = 0;
  for (const chave of cache.keys()) {
    cache.delete(chave);
    if (++removidos >= alvo) break;
  }
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
    handleError(err, context ? `${context} ("${expression}")` : `expression "${expression}"`);
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
  /** Publishes an event. With no listeners, the call is practically free. */
  emit(type, data) {
    const set = listeners.get(type);
    if (!set || set.size === 0) return;
    for (const listener of [...set]) {
      try {
        listener(data);
      } catch (err) {
        console.error("[Voodoo] error in devtools listener:", err);
      }
    }
  },
  /** Subscribes to an event type. Returns the function that unsubscribes. */
  on(type, callback) {
    let set = listeners.get(type);
    if (!set) listeners.set(type, set = /* @__PURE__ */ new Set());
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  },
  /** Cancels a specific subscription. */
  off(type, callback) {
    listeners.get(type)?.delete(callback);
  },
  /** Removes all listeners of a type or all listeners. */
  clear(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
  /** Number of listeners registered for a type. */
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
    const comma = body.indexOf(",", i);
    if (comma === -1) {
      return { type, namespace: body.slice(i) };
    }
    namespace = body.slice(i, comma);
    i = comma + 1;
  }
  let ack;
  const ackStart = i;
  while (i < body.length && body.charCodeAt(i) >= 48 && body.charCodeAt(i) <= 57) i++;
  if (i > ackStart) ack = Number(body.slice(ackStart, i));
  const rest = body.slice(i);
  return { type, namespace, ack, data: parseJson(rest) };
}
function decodeEngine(raw) {
  if (typeof raw !== "string" || !raw) return { kind: "unknown", raw: String(raw ?? "") };
  const code = raw[0];
  const body = raw.slice(1);
  switch (code) {
    case ENGINE.OPEN: {
      const data = parseJson(body);
      return {
        kind: "open",
        handshake: {
          sid: data?.sid ?? "",
          // Server values take precedence. The defaults here are from Engine.IO
          // v4 and only come into play if the handshake is incomplete.
          pingInterval: Number(data?.pingInterval) || 25e3,
          pingTimeout: Number(data?.pingTimeout) || 2e4,
          upgrades: data?.upgrades,
          maxPayload: data?.maxPayload
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
      const packet = decodeSocketIo(body);
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
  const pathname = `/${path.replace(/^\/+|\/+$/g, "")}/`;
  const query = "EIO=4&transport=websocket";
  try {
    const u = new URL(base);
    u.pathname = pathname;
    u.search = query;
    return u.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}${pathname}?${query}`;
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
function use(list, fn) {
  list.push(fn);
  return () => {
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
}
function apply(list, message) {
  let current = message;
  for (const fn of list) {
    if (!current) return null;
    const result = fn(current);
    if (result === null) return null;
    if (result) current = result;
  }
  return current;
}
var openConnections = /* @__PURE__ */ new Set();
function sameMember(a, b) {
  if (a === b) return true;
  const ida = a && typeof a === "object" ? a.id : a;
  const idb = b && typeof b === "object" ? b.id : b;
  return ida !== void 0 && ida === idb;
}
function resolveSocketURL(url, baseURL = defaults.baseURL) {
  let address = url || "/";
  if (baseURL && !/^(wss?|https?):\/\//i.test(address) && !address.startsWith("//")) {
    address = `${baseURL.replace(/\/$/, "")}/${address.replace(/^\//, "")}`;
  }
  if (/^wss?:\/\//i.test(address)) return address;
  if (/^https?:\/\//i.test(address)) return address.replace(/^http/i, "ws");
  if (typeof location === "undefined" || !location.host) return address;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}${address.startsWith("/") ? address : `/${address}`}`;
}
function constructor(options) {
  const chosen = options.WebSocket ?? defaults.WebSocket ?? globalThis.WebSocket;
  return typeof chosen === "function" ? chosen : null;
}
function socketSupported() {
  return constructor({}) !== null;
}
function createSocket(url, options = {}) {
  const opts = { ...defaults, ...options };
  const Impl = constructor(options);
  const base = resolveSocketURL(url, opts.baseURL);
  const socketIo = opts.transport === "socket.io";
  const address = socketIo ? engineURL(base, opts.path) : base;
  const state = reactive({
    state: "closed",
    connected: false,
    attempts: 0,
    queued: 0,
    error: null
  });
  const listeners2 = /* @__PURE__ */ new Map();
  const queue2 = [];
  const acks = /* @__PURE__ */ new Map();
  const rooms = /* @__PURE__ */ new Map();
  let ws = null;
  let nextAck = 1;
  let closedPurposefully = false;
  let handshake = null;
  let openedAt = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let watchdogTimer = null;
  function on(event, listener) {
    let set = listeners2.get(event);
    if (!set) listeners2.set(event, set = /* @__PURE__ */ new Set());
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }
  function once(event, listener) {
    const cancel = on(event, (data, ack) => {
      cancel();
      listener(data, ack);
    });
    return cancel;
  }
  function off(event, listener) {
    if (!event) {
      listeners2.clear();
      return;
    }
    if (!listener) {
      listeners2.delete(event);
      return;
    }
    listeners2.get(event)?.delete(listener);
  }
  function deliver(event, data, ack) {
    for (const name of event === "message" ? [event] : [event, "message"]) {
      const set = listeners2.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          console.error("[Voodoo] error in socket listener:", err);
        }
      }
    }
  }
  function changeState(newState) {
    if (state.state === newState) return;
    state.state = newState;
    state.connected = newState === "open";
    deliver(`state:${newState}`, newState);
  }
  function registerError(message) {
    state.error = message;
    deliver("error", message);
    devtoolsBus.emit("network", {
      method: "WS",
      url: address,
      ok: false,
      error: message,
      source: "socket"
    });
  }
  function stopTimers() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (watchdogTimer !== null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
  }
  function armWatchdog(ms) {
    if (watchdogTimer !== null) clearTimeout(watchdogTimer);
    watchdogTimer = null;
    if (!ms || ms <= 0) return;
    watchdogTimer = setTimeout(() => {
      watchdogTimer = null;
      registerError("connection unresponsive");
      tearDown();
    }, ms);
  }
  function silenceWindow() {
    if (socketIo) {
      const h = handshake;
      return h ? h.pingInterval + h.pingTimeout : 0;
    }
    return opts.heartbeat > 0 ? opts.heartbeat + opts.heartbeatTimeout : 0;
  }
  function markAlive() {
    armWatchdog(silenceWindow());
  }
  function startHeartbeat() {
    if (socketIo || opts.heartbeat <= 0) return;
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (opts.pingPayload == null) return;
      sendText(opts.pingPayload);
    }, opts.heartbeat);
  }
  function attemptDelay(n) {
    const raw = opts.reconnectDelay * 2 ** Math.max(0, n - 1);
    const cap = Math.min(raw, opts.reconnectMaxDelay);
    const deviation = cap * Math.min(Math.max(opts.jitter, 0), 1);
    return Math.max(0, Math.round(cap - deviation + Math.random() * deviation * 2));
  }
  function scheduleReconnect() {
    if (closedPurposefully || !opts.reconnect) {
      changeState("closed");
      return;
    }
    if (state.attempts >= opts.reconnectMaxAttempts) {
      registerError(`reconnection gave up after ${state.attempts} attempts`);
      changeState("closed");
      return;
    }
    state.attempts += 1;
    changeState("reconnecting");
    const delay = attemptDelay(state.attempts);
    deliver("reconnecting", { attempt: state.attempts, delay });
    if (reconnectTimer !== null) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (closedPurposefully) return;
      connect();
    }, delay);
  }
  function enqueue(text) {
    if (opts.queueLimit <= 0) return;
    if (queue2.length >= opts.queueLimit) {
      queue2.shift();
    }
    queue2.push(text);
    state.queued = queue2.length;
  }
  function drainQueue() {
    if (!queue2.length) return;
    const pending = queue2.splice(0, queue2.length);
    state.queued = 0;
    for (const text of pending) sendText(text);
  }
  function sendText(text) {
    if (ws && ws.readyState === 1 && (!socketIo || state.connected)) {
      try {
        ws.send(text);
        return true;
      } catch (err) {
        registerError(err?.message ?? "send failed");
        return false;
      }
    }
    enqueue(text);
    return false;
  }
  function emit(event, data, ack) {
    const message = apply(outgoingInterceptors, { event, data, url: address });
    if (!message) return false;
    devtoolsBus.emit("event", {
      type: `socket:${message.event}`,
      detail: message.data,
      source: "socket:out"
    });
    if (socketIo) {
      let num;
      if (ack) {
        num = nextAck++;
        acks.set(num, ack);
      }
      const args = message.data === void 0 ? [message.event] : [message.event, message.data];
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          ack: num,
          data: args
        })
      );
    }
    return sendText(
      opts.json ? JSON.stringify({ event: message.event, data: message.data }) : String(message.data ?? message.event)
    );
  }
  function send(data) {
    const message = apply(outgoingInterceptors, { event: "message", data, url: address });
    if (!message) return false;
    const payload = message.data;
    const text = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (socketIo) {
      return sendText(
        encodeSocketIo({
          type: SIO.EVENT,
          namespace: opts.namespace,
          data: ["message", payload]
        })
      );
    }
    return sendText(text);
  }
  function receive(event, data, raw, ack) {
    const message = apply(incomingInterceptors, {
      event,
      data,
      url: address,
      raw
    });
    if (!message) return;
    devtoolsBus.emit("event", {
      type: `socket:${message.event}`,
      detail: message.data,
      source: "socket:in"
    });
    routePresence(message.event, message.data);
    routeRoom(message.event, message.data, ack);
    deliver(message.event, message.data, ack);
  }
  function roomName(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const obj = data;
    const name = obj.room ?? obj.sala;
    return typeof name === "string" && name ? name : null;
  }
  function roomPayload(data) {
    const obj = data;
    if ("data" in obj) return obj.data;
    if ("dados" in obj) return obj.dados;
    return obj;
  }
  function deliverInRoom(room, event, data, ack) {
    for (const name of event === "message" ? [event] : [event, "message"]) {
      const set = room.listeners.get(name);
      if (!set) continue;
      for (const listener of [...set]) {
        try {
          listener(data, ack);
        } catch (err) {
          console.error("[Voodoo] error in room listener:", err);
        }
      }
    }
  }
  function routeRoom(event, data, ack) {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;
    if (event === opts.presenceEvent || event === opts.memberJoinEvent || event === opts.memberLeaveEvent) {
      return;
    }
    const payload = roomPayload(data);
    room.state.messages.push(payload);
    if (room.state.messages.length > room.buffer) {
      room.state.messages.splice(0, room.state.messages.length - room.buffer);
    }
    deliverInRoom(room, event, payload, ack);
  }
  function routePresence(event, data) {
    const name = roomName(data);
    if (!name) return;
    const room = rooms.get(name);
    if (!room) return;
    const obj = data;
    if (event === opts.presenceEvent) {
      const list = obj.members ?? obj.membros;
      if (Array.isArray(list)) room.state.members = [...list];
      return;
    }
    const member = obj.member ?? obj.membro ?? obj.id;
    if (member === void 0) return;
    if (event === opts.memberJoinEvent) {
      if (!room.state.members.some((m) => sameMember(m, member))) {
        room.state.members.push(member);
      }
      deliverInRoom(room, "entrou", member);
      return;
    }
    if (event === opts.memberLeaveEvent) {
      const i = room.state.members.findIndex((m) => sameMember(m, member));
      if (i > -1) room.state.members.splice(i, 1);
      deliverInRoom(room, "saiu", member);
    }
  }
  function requestJoin(room, name) {
    room.state.state = "joining";
    emit(opts.joinEvent, { room: name, private: room.private });
  }
  function rejoinRooms() {
    for (const [name, room] of rooms) {
      if (room.state.state === "left") continue;
      requestJoin(room, name);
    }
  }
  function join(name, config2 = {}) {
    const existing = rooms.get(name);
    if (existing && existing.state.state !== "left") return existing.public;
    const isPrivate = config2.privada ?? config2.private ?? false;
    const roomState = reactive({
      state: "joining",
      members: [],
      messages: []
    });
    const roomListeners = /* @__PURE__ */ new Map();
    const sendInRoom = (event, data, target2) => emit(event, target2 ? { room: name, to: target2, data } : { room: name, data });
    const public_ = {
      get name() {
        return name;
      },
      get private() {
        return isPrivate;
      },
      get privada() {
        return isPrivate;
      },
      get state() {
        return roomState.state;
      },
      get estado() {
        return roomState.state;
      },
      get members() {
        return roomState.members;
      },
      get membros() {
        return roomState.members;
      },
      get messages() {
        return roomState.messages;
      },
      get mensagens() {
        return roomState.messages;
      },
      on(event, listener) {
        let set = roomListeners.get(event);
        if (!set) roomListeners.set(event, set = /* @__PURE__ */ new Set());
        set.add(listener);
        return () => {
          set?.delete(listener);
        };
      },
      off(event, listener) {
        if (!event) roomListeners.clear();
        else if (!listener) roomListeners.delete(event);
        else roomListeners.get(event)?.delete(listener);
      },
      emit: (event, data) => sendInRoom(event, data),
      enviar: (event, data) => sendInRoom(event, data),
      to: (target2) => ({
        emit: (event, data) => sendInRoom(event, data, target2)
      }),
      leave: () => leave(name),
      sair: () => leave(name)
    };
    const internal = {
      public: public_,
      state: roomState,
      listeners: roomListeners,
      private: isPrivate,
      buffer: config2.buffer ?? opts.roomBuffer
    };
    rooms.set(name, internal);
    requestJoin(internal, name);
    if (state.connected) roomState.state = "joined";
    return public_;
  }
  function leave(name) {
    const room = rooms.get(name);
    if (!room) return;
    rooms.delete(name);
    room.state.state = "left";
    room.listeners.clear();
    room.state.members = [];
    if (state.connected) emit(opts.leaveEvent, { room: name });
  }
  function to(target2) {
    return {
      emit: (event, data) => emit(event, { to: target2, data })
    };
  }
  function receiveNative(raw) {
    if (typeof raw !== "string") {
      receive("message", raw);
      return;
    }
    if (opts.pongPayload != null && raw === opts.pongPayload) return;
    let payload = raw;
    if (opts.json) {
      const start = raw.trimStart()[0];
      if (start === "{" || start === "[") {
        try {
          payload = JSON.parse(raw);
        } catch {
        }
      }
    }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const obj = payload;
      const name = obj.event ?? obj.type;
      if (typeof name === "string" && name) {
        receive(name, "data" in obj ? obj.data : obj, raw);
        return;
      }
    }
    receive("message", payload, raw);
  }
  function receiveSocketIo(raw) {
    const packet = decodeEngine(raw);
    switch (packet.kind) {
      case "open":
        handshake = packet.handshake;
        sendHandshakeConnect();
        markAlive();
        return;
      case "ping":
        ws?.send(ENGINE.PONG);
        markAlive();
        return;
      case "pong":
      case "noop":
        markAlive();
        return;
      case "close":
        tearDown();
        return;
      case "message":
        break;
      default:
        markAlive();
        return;
    }
    const { packet: socketPacket } = packet;
    switch (socketPacket.type) {
      case SIO.CONNECT:
        confirmOpen();
        return;
      case SIO.CONNECT_ERROR: {
        const data = socketPacket.data;
        registerError(data?.message ?? "connection refused by server");
        tearDown();
        return;
      }
      case SIO.DISCONNECT:
        tearDown();
        return;
      case SIO.ACK: {
        const response = Array.isArray(socketPacket.data) ? socketPacket.data[0] : socketPacket.data;
        if (socketPacket.ack !== void 0) {
          const callback = acks.get(socketPacket.ack);
          acks.delete(socketPacket.ack);
          callback?.(response);
        }
        return;
      }
      case SIO.EVENT: {
        const args = Array.isArray(socketPacket.data) ? socketPacket.data : [];
        const name = typeof args[0] === "string" ? args[0] : "message";
        const payload = args.length > 2 ? args.slice(1) : args[1];
        let responder;
        if (socketPacket.ack !== void 0) {
          const num = socketPacket.ack;
          responder = (response) => {
            sendText(
              encodeSocketIo({
                type: SIO.ACK,
                namespace: opts.namespace,
                ack: num,
                data: [response]
              })
            );
          };
        }
        receive(name, payload, typeof raw === "string" ? raw : void 0, responder);
        return;
      }
      default:
        warnOnce(
          `socket-packet:${address}`,
          `Socket.IO packet type ${socketPacket.type} ignored: binary attachments are not implemented in this client.`
        );
    }
  }
  function sendHandshakeConnect() {
    ws?.send(
      encodeSocketIo({
        type: SIO.CONNECT,
        namespace: opts.namespace,
        data: options.auth ?? defaults.auth ?? void 0
      })
    );
  }
  function confirmOpen() {
    state.attempts = 0;
    state.error = null;
    openedAt = Date.now();
    changeState("open");
    startHeartbeat();
    markAlive();
    rejoinRooms();
    drainQueue();
    for (const room of rooms.values()) {
      if (room.state.state === "joining") room.state.state = "joined";
    }
    deliver("open", { url: address });
    devtoolsBus.emit("network", {
      method: "WS",
      url: address,
      status: 101,
      ok: true,
      source: "socket"
    });
  }
  function releaseWs() {
    const prev = ws;
    if (prev) {
      prev.onopen = null;
      prev.onclose = null;
      prev.onerror = null;
      prev.onmessage = null;
    }
    ws = null;
    return prev;
  }
  function tearDown() {
    const prev = releaseWs();
    handshake = null;
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (watchdogTimer !== null) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    state.connected = false;
    try {
      prev?.close();
    } catch {
    }
    deliver("close", { url: address });
    scheduleReconnect();
  }
  function connect() {
    if (!Impl) return;
    if (ws) return;
    changeState(state.attempts > 0 ? "reconnecting" : "connecting");
    let newWs;
    try {
      newWs = new Impl(address, opts.protocols);
    } catch (err) {
      registerError(err?.message ?? "failed to open connection");
      scheduleReconnect();
      return;
    }
    ws = newWs;
    newWs.onopen = () => {
      if (ws !== newWs) return;
      if (socketIo) markAlive();
      else confirmOpen();
    };
    newWs.onmessage = (event) => {
      if (ws !== newWs) return;
      markAlive();
      if (socketIo) receiveSocketIo(event?.data);
      else receiveNative(event?.data);
    };
    newWs.onerror = () => {
      if (ws !== newWs) return;
      registerError("connection failed");
    };
    newWs.onclose = (event) => {
      if (ws !== newWs) return;
      releaseWs();
      handshake = null;
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }
      state.connected = false;
      const detail = event;
      deliver("close", { url: address, code: detail?.code, reason: detail?.reason });
      devtoolsBus.emit("network", {
        method: "WS",
        url: address,
        status: detail?.code,
        ok: true,
        duration: openedAt ? Date.now() - openedAt : void 0,
        source: "socket"
      });
      scheduleReconnect();
    };
  }
  function openConnection() {
    closedPurposefully = false;
    if (!Impl) return;
    openConnections.add(instance);
    if (ws || reconnectTimer !== null) return;
    connect();
  }
  function closeConnection(code, reason) {
    closedPurposefully = true;
    stopTimers();
    changeState("closing");
    const prev = releaseWs();
    handshake = null;
    acks.clear();
    queue2.length = 0;
    state.queued = 0;
    state.attempts = 0;
    for (const [name, room] of rooms) {
      room.state.state = "left";
      room.listeners.clear();
      room.state.members = [];
      rooms.delete(name);
    }
    try {
      prev?.close(code, reason);
    } catch {
    }
    openConnections.delete(instance);
    changeState("closed");
    deliver("close", { url: address, code, reason });
  }
  const instance = {
    get url() {
      return address;
    },
    get state() {
      return state.state;
    },
    get connected() {
      return state.connected;
    },
    get attempts() {
      return state.attempts;
    },
    get queued() {
      return state.queued;
    },
    get error() {
      return state.error;
    },
    get raw() {
      return ws;
    },
    get rooms() {
      return [...rooms.values()].map((r) => r.public);
    },
    on,
    once,
    off,
    emit,
    send,
    open: openConnection,
    close: closeConnection,
    join,
    leave,
    to
  };
  if (!Impl) {
    state.error = "WebSocket unavailable in this environment";
    return instance;
  }
  if (!opts.manual) openConnection();
  else openConnections.add(instance);
  return instance;
}
var factory = ((url, options = {}) => createSocket(url, options));
Object.assign(factory, {
  defaults,
  interceptors: {
    incoming: { use: (fn) => use(incomingInterceptors, fn) },
    outgoing: { use: (fn) => use(outgoingInterceptors, fn) }
  },
  close() {
    for (const s of [...openConnections]) s.close();
  },
  supported: socketSupported,
  setWebSocket(impl) {
    defaults.WebSocket = impl;
  }
});
Object.defineProperty(factory, "open", {
  get: () => [...openConnections],
  enumerable: true
});
var socket = factory;

// src/directives/socket.ts
function aliasLegacy(view, pairs) {
  for (const [old, canonical] of pairs) {
    Object.defineProperty(view, old, {
      enumerable: false,
      configurable: true,
      get() {
        return view[canonical];
      },
      set(value) {
        view[canonical] = value;
      }
    });
  }
}
function attr(el, name) {
  return readAttr(el, `${config.prefix}${name}`);
}
var connections = /* @__PURE__ */ new WeakMap();
function closest(el, map) {
  let current = el;
  while (current) {
    const found = map.get(current);
    if (found) return found;
    current = current.parentElement;
  }
  return null;
}
function resolveText(expression, scope, context) {
  const text = expression.trim();
  if (!text) return "";
  if (/^[A-Za-z_$][\w$]*$/.test(text)) {
    const value2 = scope.has(text) ? scope.get(text) : void 0;
    return typeof value2 === "string" && value2 ? value2 : text;
  }
  if (/^(wss?|https?):\/\//i.test(text) || /^[\w:.\-/]+$/.test(text)) return text;
  const value = evaluateIn(text, scope, context);
  return typeof value === "string" && value ? value : text;
}
function dispatch(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
defineDirective(
  "socket",
  ({ el, scope, expression, modifiers, cleanup, effect: effect2 }) => {
    const name = attr(el, "socket-as") || "$socket";
    if (!socketSupported()) {
      el.setAttribute("data-socket", "unsupported");
      scope.set(
        name,
        reactive({
          connected: false,
          state: "closed",
          error: "WebSocket unavailable in this environment",
          attempts: 0,
          messages: [],
          send: () => false,
          open: () => void 0,
          close: () => void 0,
          socket: null
        })
      );
      dispatch(el, "voodoo:socket-unsupported", { url: expression });
      return;
    }
    const limit = Number(attr(el, "socket-buffer") ?? 50);
    const transport = attr(el, "socket-transport") || "ws";
    const reconnect = !modifiers["no-reconnect"] && modifiers.reconnect !== "false" && attr(el, "socket-reconnect") !== "false";
    const options = {
      transport: transport === "socket.io" ? "socket.io" : "ws",
      manual: !!modifiers.manual,
      reconnect
    };
    if (modifiers.json) options.json = modifiers.json !== "false";
    const path = attr(el, "socket-path");
    if (path) options.path = path;
    const heartbeat = attr(el, "socket-heartbeat");
    if (heartbeat !== null) options.heartbeat = parseDuration(heartbeat, 25e3);
    const s = createSocket(resolveText(expression, scope, "v-socket") || "/", options);
    connections.set(el, s);
    el.setAttribute("data-socket", "ready");
    function send(event, ...rest) {
      if (typeof event !== "string") return s.send(event);
      return rest.length ? s.emit(event, rest[0]) : s.emit(event);
    }
    const view = reactive({
      connected: s.connected,
      state: s.state,
      error: s.error,
      attempts: s.attempts,
      messages: [],
      send,
      open: () => s.open(),
      close: () => s.close(),
      socket: s
    });
    aliasLegacy(view, [
      ["conectado", "connected"],
      ["estado", "state"],
      ["mensagens", "messages"],
      ["erro", "error"],
      ["tentativas", "attempts"],
      ["enviar", "send"],
      ["abrir", "open"],
      ["fechar", "close"]
    ]);
    scope.set(name, view);
    effect2(() => {
      view.connected = s.connected;
      view.state = s.state;
      view.error = s.error;
      view.attempts = s.attempts;
    });
    const unsubscribe = [
      s.on("message", (data) => {
        view.messages.push(data);
        if (view.messages.length > limit) {
          view.messages.splice(0, view.messages.length - limit);
        }
      }),
      s.on("open", () => dispatch(el, "voodoo:socket-open", { url: s.url })),
      s.on("close", (d) => dispatch(el, "voodoo:socket-close", d)),
      s.on("error", (d) => dispatch(el, "voodoo:socket-error", d))
    ];
    cleanup(() => {
      for (const stop of unsubscribe) stop();
      s.off();
      s.close();
      connections.delete(el);
    });
  },
  { priority: PRIORITY.DATA }
);
defineDirective(
  "room",
  ({ el, scope, expression, modifiers, cleanup, effect: effect2 }) => {
    const s = closest(el, connections);
    if (!s) return;
    const roomName = resolveText(expression, scope, "v-room");
    if (!roomName) return;
    const room = s.join(roomName, {
      private: !!modifiers.private || !!modifiers.privada,
      buffer: Number(attr(el, "room-buffer") ?? 50)
    });
    const view = reactive({
      name: roomName,
      private: room.private,
      state: room.state,
      members: room.members,
      messages: room.messages,
      /** Sends to the room. With `to`, only to that recipient. */
      send: (event, data, to) => to ? room.to(to).emit(event, data) : room.emit(event, data),
      leave: () => room.leave(),
      room
    });
    aliasLegacy(view, [
      ["membros", "members"],
      ["mensagens", "messages"],
      ["estado", "state"],
      ["nome", "name"],
      ["privada", "private"],
      ["enviar", "send"],
      ["sair", "leave"]
    ]);
    scope.set(attr(el, "room-as") || "$room", view);
    effect2(() => {
      view.state = room.state;
      view.members = room.members;
      view.messages = room.messages;
    });
    const unsubscribe = [
      room.on("joined", (m) => dispatch(el, "voodoo:room-join", m)),
      room.on("left", (m) => dispatch(el, "voodoo:room-leave", m))
    ];
    cleanup(() => {
      for (const stop of unsubscribe) stop();
      room.off();
      room.leave();
    });
  },
  // After `v-socket`, so the connection exists when the room asks to join.
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("on-socket", ({ el, scope, arg, expression, cleanup }) => {
  if (!arg) return;
  const target2 = closest(el, connections);
  if (!target2) return;
  const unsubscribe = target2.on(arg, (data, ack) => {
    const local = scope.child({ $event: data, $ack: ack, $el: el });
    const value = evaluateIn(expression, local, `v-on-socket:${arg}`);
    if (typeof value === "function") value.call(scope.data, data);
  });
  cleanup(unsubscribe);
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
var target = globalThis.V;
if (target && typeof target === "object" && !target.socket) target.socket = socket;
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