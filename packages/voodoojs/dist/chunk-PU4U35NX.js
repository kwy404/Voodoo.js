import { reactive, ref, handleError, nextTick, queuePostFlush, warn, watch, toRaw, EffectScope, effect, flushSync, effectScope, stop, unref, markRaw, watchEffect, computed, shallowRef, setErrorHandler } from './chunk-ABAHVFPX.js';
import { http, HttpError, request } from './chunk-WCQZFFOE.js';
import { parseDuration, debounce, utils_exports, throttle, uid, device, escapeHtml } from './chunk-UNO6H5ZW.js';
import { defineDirective, config, PRIORITY, directives, injectStyle, ensureTokens, components, normalizeComponentName, usePlugin } from './chunk-ZS5ZW7GU.js';
import { __publicField } from './chunk-5V56KGIJ.js';

/**
 * Voodoo.js v0.1.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

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
    const start2 = i;
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
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Numero invalido", source, start2);
      tokens.push({ type: "num", value: raw, parsed, start: start2, end: i });
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
              out += String.fromCodePoint(parseInt(source.slice(i + 2, close), 16));
              i = close + 1;
            } else {
              out += String.fromCharCode(parseInt(source.slice(i + 1, i + 5), 16));
              i += 5;
            }
          } else if (esc === "x") {
            out += String.fromCharCode(parseInt(source.slice(i + 1, i + 3), 16));
            i += 3;
          } else {
            out += ESCAPES[esc] ?? esc;
            i++;
          }
        } else {
          out += source[i++];
        }
      }
      if (i >= len) throw new VoodooSyntaxError("String nao fechada", source, start2);
      i++;
      tokens.push({ type: "str", value: out, parsed: out, start: start2, end: i });
      continue;
    }
    if (ch === "`") {
      i++;
      const quasis = [];
      const exprs = [];
      let current2 = "";
      while (i < len && source[i] !== "`") {
        if (source[i] === "\\") {
          const esc = source[i + 1];
          current2 += ESCAPES[esc] ?? esc;
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          quasis.push(current2);
          current2 = "";
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
            throw new VoodooSyntaxError("Interpolacao de template nao fechada", source, start2);
          i++;
          exprs.push(expr);
          continue;
        }
        current2 += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Template literal nao fechado", source, start2);
      i++;
      quasis.push(current2);
      tokens.push({
        type: "tpl",
        value: source.slice(start2, i),
        tpl: { quasis, exprs },
        start: start2,
        end: i
      });
      continue;
    }
    if (isIdentStart(ch)) {
      let name = "";
      while (i < len && isIdentPart(source[i])) name += source[i++];
      tokens.push({ type: "ident", value: name, start: start2, end: i });
      continue;
    }
    let matched;
    for (const p2 of PUNCTUATORS) {
      if (source.startsWith(p2, i)) {
        if (p2 === "?." && isDigit(source[i + 2])) continue;
        matched = p2;
        break;
      }
    }
    if (matched) {
      i += matched.length;
      tokens.push({ type: "punct", value: matched, start: start2, end: i });
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
var Parser = class {
  constructor(tokens, source) {
    __publicField(this, "tokens", tokens);
    __publicField(this, "source", source);
    __publicField(this, "pos", 0);
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
  parseAssignment() {
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
    const start2 = this.pos;
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
        this.pos = start2;
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
          const p2 = this.parseExpression();
          this.expect("]");
          expr = { t: "member", o: expr, p: p2, computed: true, opt: true };
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
        const p2 = this.parseExpression();
        this.expect("]");
        expr = { t: "member", o: expr, p: p2, computed: true, opt: false };
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
      return {
        t: "tpl",
        quasis: part.quasis,
        exprs: part.exprs.map((src) => parse(src))
      };
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
function clearParseCache() {
  cache.clear();
}

// src/parser/interpreter.ts
var allowedGlobals = {
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
        const current2 = evaluate(node.target, scope);
        const shouldAssign = node.op === "&&=" ? !!current2 : node.op === "||=" ? !current2 : current2 == null;
        if (!shouldAssign) return current2;
        value = evaluate(node.value, scope);
      } else {
        const current2 = evaluate(node.target, scope);
        const operand = evaluate(node.value, scope);
        switch (node.op) {
          case "+=":
            value = current2 + operand;
            break;
          case "-=":
            value = current2 - operand;
            break;
          case "*=":
            value = current2 * operand;
            break;
          case "/=":
            value = current2 / operand;
            break;
          case "%=":
            value = current2 % operand;
            break;
          case "**=":
            value = current2 ** operand;
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

// src/runtime/scope.ts
var magics = /* @__PURE__ */ new Map();
function magic(name, getter) {
  magics.set(name.startsWith("$") ? name : `$${name}`, getter);
}
var Scope = class _Scope {
  constructor(data2 = {}, parent = null, el = null) {
    /** Dados proprios deste escopo, normalmente um proxy reativo. */
    __publicField(this, "data");
    __publicField(this, "parent");
    /** Elemento que criou o escopo. Usado por `$el` e `$refs`. */
    __publicField(this, "el");
    /** Referencias declaradas com `v-ref` dentro deste escopo. */
    __publicField(this, "refs", {});
    /** Instancia de componente, quando este escopo pertence a um. */
    __publicField(this, "component", null);
    /** Valores entregues por `provide`, visiveis para os escopos de baixo. */
    __publicField(this, "provides", null);
    __publicField(this, "magicCache", null);
    this.data = data2;
    this.parent = parent;
    this.el = el;
  }
  /** Escopo raiz da cadeia. */
  get root() {
    let s = this;
    while (s.parent) s = s.parent;
    return s;
  }
  /** Procura um valor de `provide` subindo a cadeia de escopos. */
  inject(key, fallback) {
    let s = this;
    while (s) {
      if (s.provides && key in s.provides) return s.provides[key];
      s = s.parent;
    }
    return fallback;
  }
  /** Escopo de componente mais proximo, subindo a cadeia. */
  get owner() {
    let s = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }
  /** Conjunto de refs visiveis, mesclando os escopos ancestrais. */
  get allRefs() {
    const chain = [];
    let s = this;
    while (s) {
      chain.unshift(s);
      s = s.parent;
    }
    const out = {};
    for (const scope of chain) Object.assign(out, scope.refs);
    return out;
  }
  lookup(name) {
    let s = this;
    while (s) {
      if (name in s.data) return s.data;
      s = s.parent;
    }
    if (name.charCodeAt(0) === 36 && magics.has(name)) {
      return this.magicContainer(name);
    }
    return void 0;
  }
  has(name) {
    return this.lookup(name) !== void 0;
  }
  get(name) {
    const owner = this.lookup(name);
    return owner ? owner[name] : void 0;
  }
  set(name, value) {
    let s = this;
    while (s) {
      if (name in s.data) {
        s.data[name] = value;
        return;
      }
      s = s.parent;
    }
    this.data[name] = value;
  }
  child(vars = {}, el = null) {
    return new _Scope(vars, this, el ?? this.el);
  }
  /** Cria um escopo filho reativo, usado por `v-data` e por `v-for`. */
  reactiveChild(vars, el = null) {
    return new _Scope(reactive(vars), this, el ?? this.el);
  }
  magicContainer(name) {
    if (!this.magicCache) this.magicCache = /* @__PURE__ */ new Map();
    const cached = this.magicCache.get(name);
    if (cached) return cached;
    const getter = magics.get(name);
    const scope = this;
    const container2 = {};
    Object.defineProperty(container2, name, {
      get: () => getter(scope),
      set: (value) => {
        const target = getter(scope);
        if (target && typeof target === "object" && "set" in target) {
          target.set(value);
        }
      },
      enumerable: true,
      configurable: true
    });
    this.magicCache.set(name, container2);
    return container2;
  }
};
var rootScope = new Scope(reactive({}));

// src/runtime/avisos.ts
function emDesenvolvimento() {
  return config.devtools === true;
}
function descreverElemento(el) {
  if (!el) return "(sem elemento)";
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join(".")}`;
  return `<${out}>`;
}
function avisar(mensagem) {
  if (!emDesenvolvimento()) return;
  console.warn(`[Voodoo] ${mensagem}`);
}
var jaAvisado = /* @__PURE__ */ new Set();
function avisarUmaVez(chave, mensagem) {
  if (!emDesenvolvimento()) return;
  if (jaAvisado.has(chave)) return;
  jaAvisado.add(chave);
  console.warn(`[Voodoo] ${mensagem}`);
}
var ATRIBUTOS_AUXILIARES = /* @__PURE__ */ new Set([
  "confirm-title",
  "confirm-label",
  "confirm-cancel",
  "hold-duration"
]);
function avisarDirectiveDesconhecida(el, raw, nome) {
  if (!emDesenvolvimento()) return;
  if (ATRIBUTOS_AUXILIARES.has(nome)) return;
  avisarUmaVez(
    `directive-desconhecida:${nome}`,
    `directive desconhecida "${raw}" em ${descreverElemento(el)}. Nenhuma directive chamada "${nome}" foi registrada. Verifique a grafia ou registre com V.directive("${nome}", ...).`
  );
}
function avisarComponenteDesconhecido(el, nome) {
  avisarUmaVez(
    `componente-desconhecido:${nome}`,
    `componente "${nome}" nao registrado em ${descreverElemento(el)}. Registre com V.component("${nome}", { ... }) antes de usar a tag, ou remova o atributo para deixar o elemento como HTML comum.`
  );
}
function avisarExpressaoInvalida(el, raw, expressao, err) {
  if (!emDesenvolvimento()) return;
  const motivo = err instanceof Error ? err.message.split("\n")[0] : String(err);
  avisar(
    `expressao invalida em ${raw}="${expressao}" no elemento ${descreverElemento(el)}.
Motivo: ${motivo}
Sugestao: expressoes de atributo aceitam um valor so. Se a logica for maior que uma linha, mova para um metodo do componente e chame o metodo aqui.`
  );
}
function avisarChaveDuplicada(el, chave, expressao) {
  if (!emDesenvolvimento()) return;
  avisar(
    `chave duplicada "${String(chave)}" em v-for="${expressao}" no elemento ${descreverElemento(el)}. Duas linhas com a mesma chave fazem a lista reaproveitar o bloco errado ao reordenar. Use uma chave unica, como o id do item.`
  );
}
function avisarPropObrigatoria(el, componente, prop) {
  if (!emDesenvolvimento()) return;
  avisar(
    `prop obrigatoria "${prop}" ausente no componente "${componente}" em ${descreverElemento(el)}. Passe o valor na tag, com ${prop}="..." para um texto fixo ou :${prop}="expressao" para um valor do estado.`
  );
}
function avisarAlias(alias, canonico) {
  avisarUmaVez(
    `alias:${alias}`,
    `"${alias}" e um apelido de "${canonico}" e continua funcionando, mas o nome oficial e "${canonico}". Prefira "${canonico}" em codigo novo.`
  );
}

// src/runtime/walker.ts
var nodeScopes = /* @__PURE__ */ new WeakMap();
var nodeCleanups = /* @__PURE__ */ new WeakMap();
var initialized = /* @__PURE__ */ new WeakSet();
var nodeEffectScopes = /* @__PURE__ */ new WeakMap();
function isInitialized(node) {
  return initialized.has(node);
}
function markInitialized(node) {
  initialized.add(node);
}
function getScope(node) {
  return nodeScopes.get(node);
}
function findScope(node) {
  let current2 = node;
  while (current2) {
    const scope = nodeScopes.get(current2);
    if (scope) return scope;
    current2 = current2.parentNode;
  }
  return rootScope;
}
function trackEffectScope(node, scope) {
  let list = nodeEffectScopes.get(node);
  if (!list) nodeEffectScopes.set(node, list = []);
  list.push(scope);
}
function getEffectScopes(node) {
  return nodeEffectScopes.get(node) ?? [];
}
var remocoesIgnoradas = /* @__PURE__ */ new WeakSet();
function removeQuietly(node) {
  remocoesIgnoradas.add(node);
  node.remove();
}
function addCleanup(node, fn) {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, list = []);
  list.push(fn);
}
function destroy(node) {
  if (node.nodeType === 1) {
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
        handleError(err, "cleanup");
      }
    }
  }
  if (node.nodeType === 1) unindexElement(node);
  nodeScopes.delete(node);
  nodeEffectScopes.delete(node);
  initialized.delete(node);
}
function parseAttribute(name, value) {
  const prefix = config.prefix;
  let body;
  if (name.startsWith("@")) {
    body = `on:${name.slice(1)}`;
  } else if (name.startsWith(":") && name.length > 1) {
    body = `bind:${name.slice(1)}`;
  } else if (name.startsWith(".") && name.length > 1) {
    body = `bind:${name.slice(1)}.prop`;
  } else if (name.startsWith(prefix)) {
    body = name.slice(prefix.length);
  } else if (name.startsWith("data-v-")) {
    body = name.slice("data-v-".length);
  } else {
    return null;
  }
  if (!body) return null;
  const parts = body.split(".");
  const head = parts.shift();
  const modifiers = {};
  for (const mod of parts) {
    const eq = mod.indexOf("=");
    if (eq > -1) modifiers[mod.slice(0, eq)] = mod.slice(eq + 1);
    else modifiers[mod] = true;
  }
  const colon = head.indexOf(":");
  const directiveName = colon > -1 ? head.slice(0, colon) : head;
  const arg = colon > -1 ? head.slice(colon + 1) : void 0;
  return { raw: name, name: directiveName, arg, modifiers, expression: value };
}
function collectDirectives(el) {
  const out = [];
  const cache3 = attributeCache.get(el);
  if (cache3 && cache3.size) {
    for (const [name, value] of cache3) {
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
function priorityOf(attr2) {
  return directives.get(attr2.name)?.priority ?? 0;
}
var directiveIndex = /* @__PURE__ */ new Map();
function indexDirective(el, name) {
  let set = directiveIndex.get(name);
  if (!set) directiveIndex.set(name, set = /* @__PURE__ */ new Set());
  set.add(el);
}
function unindexElement(el) {
  for (const set of directiveIndex.values()) set.delete(el);
}
function hasDirective(el, name) {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
function queryDirective(root, name) {
  const out = [];
  const set = directiveIndex.get(name);
  const raiz = root;
  if (set) {
    for (const el of set) {
      if (!el.isConnected) continue;
      if (raiz.contains && raiz.contains(el) && el !== raiz) out.push(el);
    }
  }
  for (const el of Array.from(
    root.querySelectorAll(`[${config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (!out.includes(el)) out.push(el);
  }
  out.sort(
    (a, b) => a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}
function closestDirective(el, name) {
  let atual = el;
  while (atual) {
    if (hasDirective(atual, name)) return atual;
    atual = atual.parentElement;
  }
  return null;
}
var attributeCache = /* @__PURE__ */ new WeakMap();
function isVoodooAttribute(name) {
  return name.startsWith(config.prefix) || name.startsWith("data-v-") || name.charCodeAt(0) === 64 || name.charCodeAt(0) === 58 && name.length > 1;
}
function readAttr(el, name) {
  const cached = attributeCache.get(el)?.get(name);
  if (cached !== void 0) return cached;
  return el.getAttribute(name);
}
function hasAttr(el, name) {
  const map = attributeCache.get(el);
  if (map?.has(name)) return true;
  return el.hasAttribute(name);
}
function originalAttributes(el) {
  const map = attributeCache.get(el);
  if (map) return new Map(map);
  const out = /* @__PURE__ */ new Map();
  for (let i = 0; i < el.attributes.length; i++) {
    const attr2 = el.attributes[i];
    if (isVoodooAttribute(attr2.name)) out.set(attr2.name, attr2.value);
  }
  return out;
}
function stripAttributes(el) {
  if (!config.cleanAttributes) return;
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, map = /* @__PURE__ */ new Map());
  const remover = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr2 = el.attributes[i];
    if (!isVoodooAttribute(attr2.name)) continue;
    map.set(attr2.name, attr2.value);
    remover.push(attr2.name);
  }
  for (const name of remover) el.removeAttribute(name);
}
function restoreAttributes(el) {
  const map = attributeCache.get(el);
  if (!map) return;
  for (const [name, value] of map) {
    if (el.hasAttribute(name)) continue;
    try {
      el.setAttribute(name, value);
    } catch {
    }
  }
}
function hadDirectives(el) {
  const cache3 = attributeCache.get(el);
  if (cache3 && cache3.size) return true;
  return hasDirectives(el);
}
function hasDirectives(el) {
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const n = attrs[i].name;
    if (n.startsWith(config.prefix) || n.charCodeAt(0) === 64 || n.charCodeAt(0) === 58 || n.startsWith("data-v-")) {
      return true;
    }
  }
  return false;
}
function evaluateIn(expression, scope, context, el) {
  if (!expression) return void 0;
  try {
    return evaluate(parse(expression), scope);
  } catch (err) {
    if (emDesenvolvimento()) {
      avisarExpressaoInvalida(el ?? scope.el, context ?? "expressao", expression, err);
    }
    handleError(err, context ? `${context} ("${expression}")` : `expressao "${expression}"`);
    return void 0;
  }
}
var skipChildren = /* @__PURE__ */ new WeakSet();
function markSkipChildren(el) {
  skipChildren.add(el);
}
function runDirective(el, attr2, scope) {
  const def = directives.get(attr2.name);
  if (!def) {
    if (emDesenvolvimento() && attr2.raw.startsWith(config.prefix)) {
      avisarDirectiveDesconhecida(el, attr2.raw, attr2.name);
    }
    return;
  }
  const scopeOwner = new EffectScope(true);
  addCleanup(el, () => scopeOwner.stop());
  trackEffectScope(el, scopeOwner);
  const ctx = {
    el,
    scope,
    expression: attr2.expression,
    arg: attr2.arg,
    modifiers: attr2.modifiers,
    raw: attr2.raw,
    evaluate(expression) {
      return evaluateIn(expression ?? attr2.expression, scope, attr2.raw, el);
    },
    effect(fn) {
      scopeOwner.run(() => effect(fn, { scope: scopeOwner }));
    },
    cleanup(fn) {
      addCleanup(el, fn);
    },
    walk(node, childScope) {
      walk(node, childScope);
    }
  };
  try {
    def.setup(ctx);
  } catch (err) {
    handleError(err, `directive ${attr2.raw}`);
  }
}
var componentMounter = null;
function setComponentMounter(fn) {
  componentMounter = fn;
}
var HTML_SKIP = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
function walk(node, scope) {
  const activeScope = scope ?? findScope(node.parentNode);
  if (node.nodeType === 11) {
    const children = Array.from(node.childNodes);
    for (const child of children) walk(child, activeScope);
    return;
  }
  if (node.nodeType === 3) {
    bindTextNode(node, activeScope);
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node;
  if (initialized.has(el)) return;
  if (HTML_SKIP.has(el.tagName)) return;
  if (el.hasAttribute(`${config.prefix}ignore`) || el.hasAttribute(`${config.prefix}pre`)) {
    initialized.add(el);
    return;
  }
  let current2 = activeScope;
  const attrs = collectDirectives(el);
  const tagComponent = el.hasAttribute(`${config.prefix}component`) ? null : resolveComponentTag(el.tagName);
  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current2);
    return;
  }
  initialized.add(el);
  for (const attr2 of attrs) {
    const def = directives.get(attr2.name);
    if (def?.terminal) {
      runDirective(el, attr2, current2);
      return;
    }
  }
  const dataAttr = attrs.find((a) => a.name === "data");
  const componentAttr = attrs.find((a) => a.name === "component");
  const componentName = componentAttr ? componentAttr.expression || "" : tagComponent || "";
  let montouComponente = false;
  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current2);
    if (created) {
      current2 = created;
      montouComponente = true;
      nodeScopes.set(el, current2);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn(dataAttr.expression || "{}", current2, "v-data") : {};
    current2 = current2.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
    nodeScopes.set(el, current2);
  }
  const escopoDosAtributos = montouComponente ? activeScope : current2;
  for (const attr2 of attrs) {
    if (attr2.name === "data" || attr2.name === "component") continue;
    runDirective(el, attr2, escopoDosAtributos);
  }
  stripAttributes(el);
  if (!skipChildren.has(el)) walkChildren(el, current2);
}
function walkChildren(el, scope) {
  const children = el.childNodes;
  const list = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child, scope);
  }
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}
var LIMITE_EXPRESSAO = 500;
var expressaoValida = /* @__PURE__ */ new Map();
function pareceExpressao(texto) {
  const limpo = texto.trim();
  if (!limpo) return false;
  const guardado = expressaoValida.get(limpo);
  if (guardado !== void 0) return guardado;
  let valida = true;
  try {
    valida = parse(limpo).t !== "seq";
  } catch {
    valida = false;
  }
  expressaoValida.set(limpo, valida);
  return valida;
}
function fecharChave(fonte, inicio) {
  let nivel = 0;
  let aspas = null;
  for (let i = inicio; i < fonte.length; i++) {
    const c = fonte[i];
    if (aspas) {
      if (c === "\\") i++;
      else if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      aspas = c;
      continue;
    }
    if (c === "{") nivel++;
    else if (c === "}") {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return -1;
}
function fatiarTexto(raw) {
  const segments = [];
  let literal = "";
  let i = 0;
  const guardarLiteral = () => {
    if (literal) segments.push({ text: literal });
    literal = "";
  };
  while (i < raw.length) {
    const abre = raw.indexOf("{", i);
    if (abre === -1) {
      literal += raw.slice(i);
      break;
    }
    literal += raw.slice(i, abre);
    const duplo = raw[abre + 1] === "{";
    const fecha = duplo ? raw.indexOf("}}", abre + 2) : fecharChave(raw, abre);
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
    literal += raw[abre];
    i = abre + 1;
  }
  guardarLiteral();
  return segments;
}
var NO_INTERPOLATION = /* @__PURE__ */ new Set(["PRE", "CODE", "SCRIPT", "STYLE", "TEXTAREA"]);
function bindTextNode(node, scope) {
  const raw = node.textContent;
  if (!raw || raw.indexOf("{") === -1) return;
  if (initialized.has(node)) return;
  let ancestral = node.parentElement;
  while (ancestral) {
    if (NO_INTERPOLATION.has(ancestral.tagName)) return;
    if (ancestral.hasAttribute(`${config.prefix}ignore`) || ancestral.hasAttribute(`${config.prefix}pre`) || ancestral.hasAttribute("data-v-ignore") || ancestral.hasAttribute("data-v-pre")) {
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
  owner.run(
    () => effect(() => {
      let out = "";
      for (const segment of segments) {
        out += segment.text ?? stringify(evaluateIn(segment.expression, scope, "interpolacao"));
      }
      if (node.textContent !== out) node.textContent = out;
    }, { scope: owner })
  );
}
function markNodeScope(node, scope) {
  nodeScopes.set(node, scope);
}
function resolveComponentTag(tagName) {
  const lower = tagName.toLowerCase();
  if (components.has(lower)) return lower;
  const alias = componentAliases.get(lower);
  return alias ?? null;
}
var componentAliases = /* @__PURE__ */ new Map();
var started = false;
var observer = null;
function start(root) {
  if (typeof document === "undefined") return;
  const target = root ?? config.root ?? document.body;
  if (!target) return;
  Object.assign(allowedGlobals, config.globals);
  walk(target, rootScope);
  if (!started) {
    started = true;
    if (config.autoDiscover) observeDOM(target);
    document.dispatchEvent(new CustomEvent("voodoo:ready", { detail: { root: target } }));
  }
}
function observeDOM(target) {
  if (typeof MutationObserver === "undefined") return;
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
function stopObserving() {
  observer?.disconnect();
  observer = null;
  started = false;
}
function refresh(root) {
  walk(root ?? document.body, root ? findScope(root.parentNode) : rootScope);
}

// src/runtime/component.ts
var instances = /* @__PURE__ */ new Set();
var injectedStyles = /* @__PURE__ */ new Set();
function defineComponent(name, definition) {
  const normalized = normalizeComponentName(name);
  components.set(normalized, definition);
  componentAliases.set(normalized.replace(/-/g, ""), normalized);
  mountPending(normalized);
}
function mountPending(normalized) {
  if (typeof document === "undefined" || !document.body) return;
  const semHifen = normalized.replace(/-/g, "");
  const seletores = [normalized, semHifen, `[${config.prefix}component="${normalized}"]`];
  for (const seletor of seletores) {
    let encontrados;
    try {
      encontrados = Array.from(document.querySelectorAll(seletor));
    } catch {
      continue;
    }
    for (const el of encontrados) {
      if (getScope(el)?.component) continue;
      if (temAncestralPendente(el)) continue;
      const escopo = findScope(el.parentNode);
      if (isInitialized(el)) {
        destroy(el);
        restoreAttributes(el);
      }
      walk(el, escopo);
    }
  }
}
function temAncestralPendente(el) {
  let atual = el.parentElement;
  while (atual && atual !== document.body) {
    if (hasDirectives(atual) && !isInitialized(atual)) return true;
    atual = atual.parentElement;
  }
  return false;
}
function coerce(value, def) {
  if (!def || !def.type || def.type === "any") return value;
  if (value == null || value === "") return def.default ?? value;
  switch (def.type) {
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? def.default ?? value : n;
    }
    case "boolean":
      return value === "" || value === "true" || value === true || value === "1";
    case "string":
      return String(value);
    case "array":
      return Array.isArray(value) ? value : [value];
    default:
      return value;
  }
}
function propDefinitions(def) {
  const out = {};
  if (Array.isArray(def.props)) {
    for (const name of def.props) out[name] = { type: "any" };
  } else if (def.props) {
    Object.assign(out, def.props);
  }
  return out;
}
function camelize(name) {
  return name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}
function resolveProps(el, defs, parentScope, owner, nomeDoComponente) {
  const props = reactive({});
  const known = Object.keys(defs);
  const lookup = /* @__PURE__ */ new Map();
  for (const key of known) {
    lookup.set(key.toLowerCase(), key);
    lookup.set(normalizeComponentName(key), key);
    lookup.set(camelize(key).toLowerCase(), key);
  }
  for (const key of known) {
    if (defs[key].default !== void 0) props[key] = defs[key].default;
  }
  const attrs = Array.from(el.attributes);
  for (const attr2 of attrs) {
    const parsed = parseAttribute(attr2.name, attr2.value);
    if (parsed && parsed.name === "bind" && parsed.arg) {
      const target2 = lookup.get(parsed.arg.toLowerCase()) ?? camelize(parsed.arg);
      if (known.length && !lookup.has(parsed.arg.toLowerCase())) continue;
      owner.run(
        () => effect(() => {
          props[target2] = evaluateIn(parsed.expression, parentScope, `:${parsed.arg}`);
        })
      );
      continue;
    }
    if (parsed) continue;
    const target = lookup.get(attr2.name.toLowerCase());
    if (target) props[target] = coerce(attr2.value, defs[target]);
    else if (!known.length) props[camelize(attr2.name)] = attr2.value;
  }
  for (const key of known) {
    if (defs[key].required && props[key] === void 0) {
      avisarPropObrigatoria(el, nomeDoComponente, key);
    }
  }
  return props;
}
function applySlots(el, original, parentScope) {
  const slots = Array.from(el.querySelectorAll("slot"));
  if (!slots.length) return;
  const named = /* @__PURE__ */ new Map();
  const fallback = [];
  Array.from(original.childNodes).forEach((node) => {
    const slotName = node.nodeType === 1 ? node.getAttribute("slot") ?? null : null;
    if (slotName) {
      node.removeAttribute("slot");
      const list = named.get(slotName) ?? [];
      list.push(node);
      named.set(slotName, list);
    } else {
      fallback.push(node);
    }
  });
  for (const slot of slots) {
    const name = slot.getAttribute("name");
    const content = name ? named.get(name) : fallback;
    const frag = document.createDocumentFragment();
    if (content && content.length) {
      for (const node of content) frag.appendChild(node);
    } else {
      while (slot.firstChild) frag.appendChild(slot.firstChild);
    }
    Array.from(frag.childNodes).forEach((node) => {
      if (node.nodeType === 1) markScope(node, parentScope);
    });
    slot.replaceWith(frag);
  }
}
var scopeMarker = null;
function setScopeMarker(fn) {
  scopeMarker = fn;
}
function markScope(node, scope) {
  scopeMarker?.(node, scope);
}
function mountComponent(el, name, parentScope) {
  const normalized = name ? normalizeComponentName(name) : "";
  const definition = normalized ? components.get(normalized) ?? components.get(componentAliases.get(normalized) ?? "") ?? {} : {};
  if (normalized && !components.has(normalized) && !componentAliases.has(normalized)) {
    avisarComponenteDesconhecido(el, name);
  }
  const owner = new EffectScope(true);
  const defs = propDefinitions(definition);
  const props = resolveProps(el, defs, parentScope, owner, normalized || "inline");
  if (!definition.state && definition.data) avisarAlias("data()", "state()");
  if (definition.destroyed) avisarAlias("destroyed()", "unmounted()");
  const stateFactory = definition.state ?? definition.data;
  let stateRaw = {};
  const instance = {};
  const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
  const scope = new Scope({}, scopeParent, el);
  scope.component = instance;
  try {
    stateRaw = stateFactory ? stateFactory.call(instance, props) ?? {} : {};
  } catch (err) {
    handleError(err, `state() do componente "${name}"`);
  }
  const dataAttr = el.getAttribute(`${config.prefix}data`);
  if (dataAttr) {
    const extra = evaluateIn(dataAttr, parentScope, "v-data");
    if (extra && typeof extra === "object") Object.assign(stateRaw, extra);
  }
  if (definition.provide) {
    try {
      const fornecidos = typeof definition.provide === "function" ? definition.provide.call(instance) : definition.provide;
      if (fornecidos && typeof fornecidos === "object") {
        scope.provides = { ...fornecidos };
      }
    } catch (err) {
      handleError(err, `provide() do componente "${name}"`);
    }
  }
  if (definition.inject) {
    const pedidos = Array.isArray(definition.inject) ? definition.inject.map((chave) => [chave, { from: chave }]) : Object.entries(definition.inject).map(
      ([chave, opcoes]) => [chave, opcoes ?? {}]
    );
    for (const [chave, opcoes] of pedidos) {
      const de = opcoes.from ?? chave;
      const valor = parentScope.inject(de, opcoes.default);
      if (!(chave in stateRaw)) stateRaw[chave] = valor;
    }
  }
  const state = reactive(stateRaw);
  const computedRefs = {};
  if (definition.computed) {
    for (const [key, getter] of Object.entries(definition.computed)) {
      computedRefs[key] = computed(() => getter.call(instance));
    }
  }
  const methods = {};
  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      methods[key] = (...args) => fn.apply(instance, args);
    }
  }
  for (const [key, value] of Object.entries(definition)) {
    if (typeof value !== "function") continue;
    if (LIFECYCLE.has(key) || key === "state" || key === "data") continue;
    if (!(key in methods)) methods[key] = (...args) => value.apply(instance, args);
  }
  const emit3 = (event, detail) => {
    const ev = new CustomEvent(event, { detail, bubbles: true, cancelable: true });
    ev.__voodoo = true;
    el.dispatchEvent(ev);
  };
  const special = {
    $el: el,
    $props: props,
    $name: normalized || "inline",
    $scope: scope,
    $parent: parentScope.owner?.component ?? null,
    emit: emit3,
    $emit: emit3,
    $nextTick: (fn) => import('./reactivity.js').then((m) => m.nextTick(fn)),
    $watch: (source, cb) => watch(() => evaluateIn(source, scope), cb)
  };
  const handler = {
    get(_t, key) {
      if (typeof key === "symbol") return void 0;
      if (key === "$refs") return scope.allRefs;
      if (key in special) return special[key];
      if (key in computedRefs) return computedRefs[key].value;
      if (key in methods) return methods[key];
      if (key in props) return props[key];
      return state[key];
    },
    set(_t, key, value) {
      if (typeof key === "symbol") return true;
      if (key in computedRefs) {
        computedRefs[key].value = value;
        return true;
      }
      if (key in props) {
        props[key] = value;
        return true;
      }
      state[key] = value;
      return true;
    },
    has(_t, key) {
      if (typeof key === "symbol") return false;
      const k = key;
      return k === "$refs" || k in special || k in computedRefs || k in methods || k in props || k in state;
    },
    ownKeys() {
      return [
        .../* @__PURE__ */ new Set([
          ...Object.keys(state),
          ...Object.keys(props),
          ...Object.keys(methods),
          ...Object.keys(computedRefs)
        ])
      ];
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    }
  };
  const proxy = new Proxy(instance, handler);
  scope.data = proxy;
  Object.setPrototypeOf(instance, proxy);
  if (definition.watch) {
    for (const [key, cb] of Object.entries(definition.watch)) {
      owner.run(
        () => watch(
          () => proxy[key],
          (value, old) => cb.call(proxy, value, old)
        )
      );
    }
  }
  if (definition.style && !injectedStyles.has(normalized)) {
    injectedStyles.add(normalized);
    const tag = document.createElement("style");
    tag.setAttribute("data-voodoo-component", normalized);
    tag.textContent = definition.style;
    document.head.appendChild(tag);
  }
  callHook(definition, proxy, "beforeMount");
  if (definition.template) {
    const original = document.createDocumentFragment();
    while (el.firstChild) original.appendChild(el.firstChild);
    el.innerHTML = definition.template;
    applySlots(el, original, parentScope);
  }
  instances.add(proxy);
  queuePostFlush(() => {
    callHook(definition, proxy, "mounted");
    if (definition.updated) {
      owner.run(
        () => effect(() => {
          for (const key of Object.keys(state)) void state[key];
          callHook(definition, proxy, "updated");
        })
      );
    }
  });
  addCleanup(el, () => {
    callHook(definition, proxy, "beforeUnmount");
    owner.stop();
    instances.delete(proxy);
    callHook(definition, proxy, "unmounted");
    callHook(definition, proxy, "destroyed");
  });
  return scope;
}
var LIFECYCLE = /* @__PURE__ */ new Set([
  "beforeMount",
  "mounted",
  "updated",
  "beforeUnmount",
  "unmounted",
  "destroyed"
]);
function callHook(def, instance, name) {
  const hook = def[name];
  if (typeof hook !== "function") return;
  try {
    hook.call(instance);
  } catch (err) {
    handleError(err, `hook ${name}`);
  }
}

// src/runtime/boot.ts
var LIMITE_ESPERA = 1e4;
var PASSOS_ESTAVEIS = 2;
var fila = [];
var observador = null;
var versaoDoDom = 0;
var versaoNoPassoAnterior = -1;
var passosSemMudanca = 0;
var agendado = false;
function agora() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}
function observarMudancas() {
  if (observador || typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }
  const raiz = document.documentElement;
  if (!raiz) return;
  observador = new MutationObserver(() => {
    versaoDoDom++;
  });
  observador.observe(raiz, { childList: true, subtree: true });
}
function agendarPasso() {
  if (agendado) return;
  agendado = true;
  const executar = () => {
    agendado = false;
    passo();
  };
  if (typeof requestAnimationFrame === "function") {
    let disparado = false;
    const uma = () => {
      if (disparado) return;
      disparado = true;
      executar();
    };
    requestAnimationFrame(uma);
    setTimeout(uma, 32);
    return;
  }
  setTimeout(executar, 0);
}
function passo() {
  if (versaoDoDom === versaoNoPassoAnterior) passosSemMudanca++;
  else passosSemMudanca = 0;
  versaoNoPassoAnterior = versaoDoDom;
  const instante = agora();
  for (let i = fila.length - 1; i >= 0; i--) {
    const tarefa = fila[i];
    let valor = null;
    try {
      valor = tarefa.pronto();
    } catch {
      valor = null;
    }
    if (valor) {
      fila.splice(i, 1);
      tarefa.acao(valor);
      continue;
    }
    if (instante - tarefa.desde > LIMITE_ESPERA) {
      fila.splice(i, 1);
      tarefa.aoDesistir?.();
    }
  }
  if (fila.length) agendarPasso();
}
function enfileirar(tarefa) {
  let valor = null;
  try {
    valor = tarefa.pronto();
  } catch {
    valor = null;
  }
  if (valor) {
    tarefa.acao(valor);
    return;
  }
  observarMudancas();
  fila.push({ ...tarefa, desde: agora() });
  agendarPasso();
}
function documentoEstavel() {
  if (typeof document === "undefined" || !document.body) return false;
  return passosSemMudanca >= PASSOS_ESTAVEIS;
}
function documentoParado() {
  if (typeof document === "undefined" || !document.body) return false;
  return versaoDoDom === 0;
}
function whenReady(acao) {
  if (typeof document === "undefined") return;
  enfileirar({
    pronto: () => documentoEstavel() ? document.body : null,
    acao: () => acao(),
    // Passado o limite, comeca assim mesmo: uma pagina que nunca para de mudar
    // ainda merece ser inicializada.
    aoDesistir: () => {
      if (document.body) acao();
    }
  });
}
function whenBodyReady(acao) {
  if (typeof document === "undefined") return;
  if (documentoParado()) {
    void Promise.resolve().then(acao);
    return;
  }
  enfileirar({
    pronto: () => documentoEstavel() ? document.body : null,
    acao: () => acao(),
    aoDesistir: () => {
      if (document.body) acao();
    }
  });
}
function whenElement(alvo, acao, aoDesistir) {
  if (typeof alvo !== "string") {
    acao(alvo);
    return;
  }
  if (typeof document === "undefined") return;
  enfileirar({
    pronto: () => document.querySelector(alvo),
    acao: (el) => acao(el),
    aoDesistir
  });
}
function ready() {
  return new Promise((resolve2) => whenReady(() => resolve2()));
}

// src/runtime/app.ts
var contador = 0;
var directiveRegistrar = null;
function setDirectiveRegistrar(fn) {
  directiveRegistrar = fn;
}
function createApp(options = {}) {
  const name = `voodoo-app-${++contador}`;
  const { components: locais, ...raiz } = options;
  const config_ = { globalProperties: {} };
  const providos = {};
  const registradosPorEsteApp = [];
  let container2 = null;
  let htmlOriginal = "";
  let instancia = null;
  let esperando = [];
  function registrarLocais() {
    if (!locais) return;
    for (const [nome, definicao] of Object.entries(locais)) {
      const normalizado = normalizeComponentName(nome);
      if (components.has(normalizado)) continue;
      defineComponent(normalizado, definicao);
      registradosPorEsteApp.push(normalizado);
    }
  }
  function montarEm(el) {
    if (instancia) return instancia;
    container2 = el;
    htmlOriginal = el.innerHTML;
    Object.assign(allowedGlobals, config_.globalProperties);
    registrarLocais();
    const definicao = { ...raiz };
    if (Object.keys(providos).length) {
      const anterior = definicao.provide;
      definicao.provide = () => ({
        ...typeof anterior === "function" ? anterior() : anterior ?? {},
        ...providos
      });
    }
    defineComponent(name, definicao);
    el.setAttribute(`${config.prefix}component`, name);
    try {
      walk(el, rootScope);
    } catch (err) {
      handleError(err, `montagem da aplicacao "${name}"`);
      return null;
    }
    instancia = getScope(el)?.component ?? null;
    if (instancia) {
      const fila2 = esperando;
      esperando = [];
      for (const resolver of fila2) resolver(instancia);
    }
    return instancia;
  }
  const app = {
    name,
    config: config_,
    get instance() {
      return instancia;
    },
    get container() {
      return container2;
    },
    get isMounted() {
      return instancia !== null;
    },
    component(nome, definicao) {
      const normalizado = normalizeComponentName(nome);
      if (definicao === void 0) {
        return (locais && locais[nome]) ?? components.get(normalizado);
      }
      if (locais) locais[nome] = definicao;
      else options.components = { [nome]: definicao };
      if (instancia && !components.has(normalizado)) {
        defineComponent(normalizado, definicao);
        registradosPorEsteApp.push(normalizado);
      }
      return app;
    },
    directive(nome, definicao) {
      directiveRegistrar?.(nome, definicao);
      return app;
    },
    use(plugin, opcoes) {
      usePlugin(globalThis_V(), plugin, opcoes);
      return app;
    },
    provide(chave, valor) {
      providos[chave] = valor;
      return app;
    },
    mount(alvo) {
      if (instancia) return instancia;
      if (typeof alvo !== "string") return montarEm(alvo);
      let resultado = null;
      whenElement(
        alvo,
        (el) => {
          resultado = montarEm(el);
        },
        () => {
          console.warn(
            `[Voodoo] createApp().mount("${alvo}") nao encontrou o elemento. A aplicacao continua sem montar.`
          );
        }
      );
      return resultado;
    },
    whenMounted() {
      if (instancia) return Promise.resolve(instancia);
      return new Promise((resolve2) => esperando.push(resolve2));
    },
    unmount() {
      if (!container2) return;
      destroy(container2);
      container2.removeAttribute(`${config.prefix}component`);
      container2.innerHTML = htmlOriginal;
      components.delete(name);
      for (const nome of registradosPorEsteApp) components.delete(nome);
      registradosPorEsteApp.length = 0;
      instancia = null;
      container2 = null;
    }
  };
  return app;
}
var objetoV = null;
function setAppHost(V) {
  objetoV = V;
}
function globalThis_V() {
  return objetoV;
}

// src/store/index.ts
var stores = /* @__PURE__ */ new Map();
var versao = ref(0);
var persistHandles = /* @__PURE__ */ new Map();
function store(name, definition, options = {}) {
  const existing = stores.get(name);
  if (!definition) {
    if (!existing) {
      const created2 = reactive({});
      stores.set(name, created2);
      return created2;
    }
    return existing;
  }
  if (existing) {
    Object.assign(existing, definition);
    return existing;
  }
  const key = typeof options.persist === "string" ? options.persist : `voodoo:store:${name}`;
  const descritores = Object.getOwnPropertyDescriptors(definition);
  const initial = Object.defineProperties({}, descritores);
  if (options.persist && typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const salvo = JSON.parse(saved);
        for (const [chave, valor] of Object.entries(salvo)) {
          if (descritores[chave] && !("value" in descritores[chave])) continue;
          initial[chave] = valor;
        }
      }
    } catch {
    }
  }
  const created = reactive(initial);
  for (const [prop, descritor] of Object.entries(descritores)) {
    const value = descritor.value;
    if (typeof value === "function") {
      created[prop] = (...args) => value.apply(created, args);
    }
  }
  stores.set(name, created);
  versao.value++;
  if (options.persist && typeof localStorage !== "undefined") {
    const stop2 = watch(
      created,
      () => {
        try {
          localStorage.setItem(key, JSON.stringify(stripFunctions(created)));
        } catch {
        }
      },
      { deep: true }
    );
    persistHandles.set(name, stop2);
  }
  return created;
}
function stripFunctions(source) {
  const out = {};
  const descritores = Object.getOwnPropertyDescriptors(toRaw(source));
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "function") continue;
    if (descritores[key] && !("value" in descritores[key])) continue;
    out[key] = value;
  }
  return out;
}
var allStores = new Proxy(
  {},
  {
    get: (_t, key) => {
      void versao.value;
      return stores.get(key);
    },
    has: (_t, key) => {
      void versao.value;
      return stores.has(key);
    },
    ownKeys: () => [...stores.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  }
);
function removeStore(name) {
  persistHandles.get(name)?.();
  persistHandles.delete(name);
  stores.delete(name);
}
function storeNames() {
  return [...stores.keys()];
}

// src/ui/toast.ts
var CSS = `
.v-toaster{position:fixed;z-index:var(--v-z-toast,1100);display:flex;flex-direction:column;gap:10px;padding:16px;pointer-events:none;max-width:min(420px,calc(100vw - 32px))}
.v-toaster[data-pos^="top"]{top:0}
.v-toaster[data-pos^="bottom"]{bottom:0;flex-direction:column-reverse}
.v-toaster[data-pos$="right"]{right:0;align-items:flex-end}
.v-toaster[data-pos$="left"]{left:0;align-items:flex-start}
.v-toaster[data-pos$="center"]{left:50%;transform:translateX(-50%);align-items:center}

.v-toast{pointer-events:auto;position:relative;display:flex;gap:12px;align-items:flex-start;
  min-width:280px;max-width:100%;padding:14px 16px;border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  font:500 14px/1.45 var(--v-font-sans,system-ui,sans-serif);
  opacity:0;transform:translateY(-8px) scale(.98);
  transition:opacity .22s var(--v-ease,ease),transform .22s var(--v-ease,ease)}
.v-toaster[data-pos^="bottom"] .v-toast{transform:translateY(8px) scale(.98)}
.v-toast.v-in{opacity:1;transform:none}
.v-toast.v-out{opacity:0;transform:translateY(-8px) scale(.98)}

.v-toast-icon{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;
  font-size:12px;font-weight:700;color:#fff;margin-top:1px}
.v-toast-body{flex:1;min-width:0}
.v-toast-title{font-weight:650}
.v-toast-desc{margin-top:2px;font-weight:450;color:var(--v-text-muted,#6B6580);font-size:13px;overflow-wrap:anywhere}
.v-toast-action{flex:none;background:transparent;border:1px solid var(--v-border,#E6E0F0);
  border-radius:8px;padding:5px 10px;font:600 12px/1 inherit;color:var(--v-primary,#6D3BF5);cursor:pointer}
.v-toast-action:hover{background:var(--v-surface-2,#FBF7F2)}
.v-toast-close{flex:none;background:none;border:0;cursor:pointer;color:var(--v-text-muted,#6B6580);
  font-size:18px;line-height:1;padding:0 2px;opacity:.7}
.v-toast-close:hover{opacity:1}

.v-toast-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;transform-origin:left;
  border-radius:0 0 var(--v-radius,12px) var(--v-radius,12px);opacity:.55}
.v-toast:hover .v-toast-bar{animation-play-state:paused}
@keyframes v-toast-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}

.v-toast[data-type="success"] .v-toast-icon,.v-toast[data-type="success"] .v-toast-bar{background:var(--v-success,#2ED9A5)}
.v-toast[data-type="error"] .v-toast-icon,.v-toast[data-type="error"] .v-toast-bar{background:var(--v-danger,#FF4D4D)}
.v-toast[data-type="warning"] .v-toast-icon,.v-toast[data-type="warning"] .v-toast-bar{background:var(--v-warning,#FFB35C)}
.v-toast[data-type="info"] .v-toast-icon,.v-toast[data-type="info"] .v-toast-bar{background:var(--v-info,#9B7BFF)}
.v-toast[data-type="default"] .v-toast-icon,.v-toast[data-type="default"] .v-toast-bar{background:var(--v-primary,#6D3BF5)}
.v-toast[data-type="loading"] .v-toast-icon{background:transparent;border:2px solid var(--v-border,#E6E0F0);
  border-top-color:var(--v-primary,#6D3BF5);animation:v-spin .7s linear infinite}
@keyframes v-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.v-toast{transition:none}}
`;
var ICONS = {
  success: "ok",
  error: "!",
  warning: "!",
  info: "i",
  loading: "",
  default: ""
};
var containers = /* @__PURE__ */ new Map();
var settings = {
  duration: 4e3,
  position: "top-right",
  max: 6
};
function container(position) {
  ensureTokens();
  injectStyle("toast", CSS);
  let element = containers.get(position);
  if (element && element.isConnected) return element;
  element = document.createElement("div");
  element.className = "v-toaster";
  element.setAttribute("data-pos", position);
  element.setAttribute("role", "region");
  element.setAttribute("aria-label", "Notificacoes");
  document.body.appendChild(element);
  containers.set(position, element);
  return element;
}
function render(options) {
  const position = options.position ?? settings.position;
  const type = options.type ?? "default";
  const duration = options.duration ?? (type === "loading" ? 0 : settings.duration);
  const parent = container(position);
  const id = uid("toast-");
  const element = document.createElement("div");
  element.className = "v-toast";
  element.id = id;
  element.setAttribute("data-type", type);
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  let closed = false;
  let timer = null;
  const close = () => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    element.classList.add("v-out");
    element.classList.remove("v-in");
    setTimeout(() => {
      element.remove();
      options.onClose?.();
      if (!parent.children.length) {
        parent.remove();
        containers.delete(position);
      }
    }, 220);
  };
  const paint = (current2) => {
    const currentType = current2.type ?? type;
    element.setAttribute("data-type", currentType);
    if (current2.html) {
      element.innerHTML = current2.html;
    } else {
      element.textContent = "";
      const icon = document.createElement("span");
      icon.className = "v-toast-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ICONS[currentType] ?? "";
      element.appendChild(icon);
      const body = document.createElement("div");
      body.className = "v-toast-body";
      const title = document.createElement("div");
      title.className = "v-toast-title";
      title.textContent = current2.title ?? "";
      body.appendChild(title);
      if (current2.description) {
        const description = document.createElement("div");
        description.className = "v-toast-desc";
        description.textContent = current2.description;
        body.appendChild(description);
      }
      element.appendChild(body);
      if (current2.action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "v-toast-action";
        button.textContent = current2.action.label;
        button.addEventListener("click", () => {
          current2.action?.onClick();
          close();
        });
        element.appendChild(button);
      }
      if (current2.closable !== false && currentType !== "loading") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "v-toast-close";
        button.setAttribute("aria-label", "Fechar notificacao");
        button.innerHTML = "&times;";
        button.addEventListener("click", close);
        element.appendChild(button);
      }
    }
    const currentDuration = current2.duration ?? duration;
    if (currentDuration > 0) {
      const bar = document.createElement("div");
      bar.className = "v-toast-bar";
      bar.style.animation = `v-toast-bar ${currentDuration}ms linear forwards`;
      element.appendChild(bar);
    }
  };
  paint(options);
  parent.appendChild(element);
  requestAnimationFrame(() => element.classList.add("v-in"));
  while (parent.children.length > settings.max) parent.firstElementChild?.remove();
  const schedule = (ms) => {
    if (timer) clearTimeout(timer);
    if (ms > 0) timer = setTimeout(close, ms);
  };
  schedule(duration);
  element.addEventListener("mouseenter", () => {
    if (timer) clearTimeout(timer);
  });
  element.addEventListener("mouseleave", () => schedule(duration));
  return {
    id,
    close,
    update(next) {
      paint({ ...options, ...next });
      if (next.duration !== void 0) schedule(next.duration);
      else if ((next.type ?? type) !== "loading") schedule(settings.duration);
    }
  };
}
function normalize(input, type) {
  return typeof input === "string" ? { title: input, type } : { type, ...input };
}
var toast = Object.assign(
  /** Notificacao neutra. */
  (message, options = {}) => render({ ...normalize(message, "default"), ...options }),
  {
    success: (message, options = {}) => render({ ...normalize(message, "success"), ...options }),
    error: (message, options = {}) => render({ ...normalize(message, "error"), ...options }),
    warning: (message, options = {}) => render({ ...normalize(message, "warning"), ...options }),
    info: (message, options = {}) => render({ ...normalize(message, "info"), ...options }),
    loading: (message, options = {}) => render({ ...normalize(message, "loading"), duration: 0, ...options }),
    /**
     * Acompanha uma promessa: mostra carregando, depois sucesso ou erro.
     *
     * ```js
     * V.toast.promise(salvar(), {
     *   loading: 'Salvando...',
     *   success: (dados) => `Salvo com id ${dados.id}`,
     *   error: 'Nao foi possivel salvar'
     * })
     * ```
     */
    async promise(promise, messages2 = {}) {
      const handle = render({ title: messages2.loading ?? "Carregando...", type: "loading", duration: 0 });
      try {
        const value = await promise;
        handle.update({
          title: typeof messages2.success === "function" ? messages2.success(value) : messages2.success ?? "Pronto",
          type: "success",
          duration: settings.duration
        });
        return value;
      } catch (err) {
        handle.update({
          title: typeof messages2.error === "function" ? messages2.error(err) : messages2.error ?? "Algo deu errado",
          type: "error",
          duration: settings.duration
        });
        throw err;
      }
    },
    /** Fecha todas as notificacoes abertas. */
    clear() {
      for (const [position, element] of containers) {
        element.remove();
        containers.delete(position);
      }
    },
    /** Ajusta duracao, posicao e limite padrao. */
    configure(options) {
      Object.assign(settings, options);
    },
    settings
  }
);

// src/storage/index.ts
function createStorage(getStore, prefix = "") {
  const full = (key) => prefix + key;
  return {
    get(key, fallback) {
      try {
        const raw = getStore()?.getItem(full(key));
        if (raw === null || raw === void 0) return fallback;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getStore()?.setItem(full(key), typeof value === "string" ? value : JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getStore()?.removeItem(full(key));
      } catch {
      }
    },
    clear() {
      try {
        const store2 = getStore();
        if (!store2) return;
        if (!prefix) {
          store2.clear();
          return;
        }
        for (const key of Object.keys(store2)) {
          if (key.startsWith(prefix)) store2.removeItem(key);
        }
      } catch {
      }
    },
    has(key) {
      try {
        return getStore()?.getItem(full(key)) !== null;
      } catch {
        return false;
      }
    },
    keys() {
      try {
        const store2 = getStore();
        if (!store2) return [];
        return Object.keys(store2).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
      } catch {
        return [];
      }
    }
  };
}
var storage = createStorage(
  () => typeof localStorage !== "undefined" ? localStorage : void 0
);
var session = createStorage(
  () => typeof sessionStorage !== "undefined" ? sessionStorage : void 0
);
var cookie = {
  get(name) {
    if (typeof document === "undefined") return void 0;
    const target = `${encodeURIComponent(name)}=`;
    for (const part of document.cookie.split("; ")) {
      if (part.startsWith(target)) return decodeURIComponent(part.slice(target.length));
    }
    return void 0;
  },
  set(name, value, options = {}) {
    if (typeof document === "undefined") return;
    let text = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (options.expires !== void 0) {
      const date = typeof options.expires === "number" ? new Date(Date.now() + options.expires * 864e5) : options.expires;
      text += `; expires=${date.toUTCString()}`;
    }
    text += `; path=${options.path ?? "/"}`;
    if (options.domain) text += `; domain=${options.domain}`;
    if (options.secure) text += "; secure";
    text += `; samesite=${options.sameSite ?? "Lax"}`;
    document.cookie = text;
  },
  remove(name, options = {}) {
    this.set(name, "", { ...options, expires: -1 });
  },
  has(name) {
    return this.get(name) !== void 0;
  }
};
var url = {
  /** Le um parametro da URL atual. */
  get(key, fallback) {
    if (typeof location === "undefined") return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },
  /** Le todos os parametros como objeto. */
  all() {
    if (typeof location === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },
  /** Escreve um parametro sem recarregar a pagina. */
  set(key, value, replace = true) {
    if (typeof location === "undefined") return;
    const next = new URL(location.href);
    if (value === null || value === "") next.searchParams.delete(key);
    else next.searchParams.set(key, String(value));
    history[replace ? "replaceState" : "pushState"]({}, "", next.toString());
  },
  remove(key, replace = true) {
    this.set(key, null, replace);
  },
  /** Aplica varios parametros de uma vez. */
  merge(params, replace = true) {
    if (typeof location === "undefined") return;
    const next = new URL(location.href);
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") next.searchParams.delete(key);
      else next.searchParams.set(key, String(value));
    }
    history[replace ? "replaceState" : "pushState"]({}, "", next.toString());
  }
};
var memoryCache = /* @__PURE__ */ new Map();
var cache2 = {
  /** Guarda um valor. `ttl` em milissegundos, `0` significa sem expiracao. */
  set(key, value, ttl = 0) {
    memoryCache.set(key, { value, expires: ttl > 0 ? Date.now() + ttl : Infinity });
    return value;
  },
  get(key, fallback) {
    const entry = memoryCache.get(key);
    if (!entry) return fallback;
    if (entry.expires < Date.now()) {
      memoryCache.delete(key);
      return fallback;
    }
    return entry.value;
  },
  has(key) {
    return this.get(key) !== void 0;
  },
  remove(key) {
    memoryCache.delete(key);
  },
  clear() {
    memoryCache.clear();
  },
  /** Executa a funcao apenas quando o valor nao estiver em cache. */
  async remember(key, ttl, factory) {
    const hit = this.get(key);
    if (hit !== void 0) return hit;
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  },
  get size() {
    return memoryCache.size;
  }
};
var THEME_KEY = "voodoo:theme";
var theme = {
  /** Tema escolhido pelo usuario, ou `system` quando nunca foi definido. */
  get current() {
    return storage.get(THEME_KEY) ?? "system";
  },
  /** Tema efetivamente aplicado, resolvendo `system`. */
  get resolved() {
    const value = this.current;
    if (value !== "system") return value;
    if (typeof matchMedia === "undefined") return "light";
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  set(value) {
    storage.set(THEME_KEY, value);
    this.apply();
  },
  toggle() {
    const next = this.resolved === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
  /** Escreve `data-theme` no elemento raiz e avisa a pagina. */
  apply() {
    if (typeof document === "undefined") return;
    const value = this.current;
    const root = document.documentElement;
    if (value === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", value);
    root.style.colorScheme = this.resolved;
    document.dispatchEvent(
      new CustomEvent("voodoo:theme", { detail: { theme: value, resolved: this.resolved } })
    );
  },
  /** Aplica o tema salvo assim que a pagina carrega. */
  init() {
    if (typeof document === "undefined") return;
    this.apply();
    matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.current === "system") this.apply();
    });
  }
};

// src/runtime/magics.ts
var screen = reactive({
  width: 0,
  height: 0,
  mobile: false,
  tablet: false,
  desktop: false,
  portrait: false,
  landscape: false,
  /** Verifica uma media query arbitraria. */
  matches(query2) {
    return typeof matchMedia !== "undefined" && matchMedia(query2).matches;
  }
});
function updateScreen() {
  if (typeof window === "undefined") return;
  screen.width = window.innerWidth;
  screen.height = window.innerHeight;
  screen.mobile = window.innerWidth < 768;
  screen.tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  screen.desktop = window.innerWidth >= 1024;
  screen.portrait = window.innerHeight >= window.innerWidth;
  screen.landscape = !screen.portrait;
}
var network = reactive({
  online: true,
  /** Tipo de conexao informado pelo navegador, quando disponivel. */
  type: "unknown",
  /** `true` quando o usuario pediu economia de dados. */
  saveData: false,
  slow: false
});
function updateNetwork() {
  if (typeof navigator === "undefined") return;
  network.online = navigator.onLine;
  const connection = navigator.connection;
  if (connection) {
    network.type = connection.effectiveType ?? "unknown";
    network.saveData = !!connection.saveData;
    network.slow = connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
  }
}
var clipboard = {
  /** Copia texto, com fallback para navegadores sem a API moderna. */
  async copy(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  },
  /** Le o conteudo da area de transferencia, quando o usuario permitir. */
  async read() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  }
};
var installed = false;
function installMagics() {
  if (installed) return;
  installed = true;
  magic("$el", (scope) => scope.el);
  magic("$refs", (scope) => scope.allRefs);
  magic("$data", (scope) => scope.data);
  magic("$root", (scope) => scope.root.data);
  magic("$parent", (scope) => scope.parent?.data ?? null);
  magic("$self", (scope) => scope.owner?.component ?? scope.data);
  magic("$store", () => allStores);
  magic("$http", () => http);
  magic("$toast", () => toast);
  magic("$clipboard", () => clipboard);
  magic("$storage", () => storage);
  magic("$session", () => session);
  magic("$cookie", () => cookie);
  magic("$cache", () => cache2);
  magic("$url", () => url);
  magic("$theme", () => theme);
  magic("$device", () => device);
  magic("$screen", () => screen);
  magic("$network", () => network);
  magic("$nextTick", () => nextTick);
  magic(
    "$watch",
    (scope) => (expression, callback) => watch(() => evaluateIn(expression, scope, "$watch"), callback)
  );
  magic("$dispatch", (scope) => (name, detail) => {
    const target = scope.el ?? document;
    target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  });
  magic("$log", () => (...args) => {
    console.log("[Voodoo]", ...args);
  });
  if (typeof window === "undefined") return;
  updateScreen();
  updateNetwork();
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateScreen);
  });
  window.addEventListener("orientationchange", updateScreen);
  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  navigator.connection?.addEventListener?.(
    "change",
    updateNetwork
  );
}

// src/http/resource.ts
function pick(value, path) {
  if (!path) return value;
  let current2 = value;
  for (const part of path.split(".")) {
    if (current2 == null) return void 0;
    current2 = current2[part];
  }
  return current2;
}
function extractMessage(error) {
  const data2 = error.response?.data;
  if (!data2 || typeof data2 !== "object") return null;
  for (const key of ["message", "error", "detail", "msg"]) {
    const value = data2[key];
    if (typeof value === "string") return value;
  }
  return null;
}
function createResource(url2, options = {}) {
  const resolveUrl2 = () => typeof url2 === "function" ? url2() : url2;
  const resolveParams = () => typeof options.params === "function" ? options.params() : options.params;
  let controller = null;
  let timer = null;
  const resource = reactive({
    data: null,
    loading: false,
    error: null,
    loaded: false,
    async reload() {
      const endereco = resolveUrl2();
      if (!endereco) return;
      controller?.abort();
      const atual = controller = new AbortController();
      resource.loading = true;
      resource.error = null;
      try {
        const response = await http.request({
          url: endereco,
          method: (options.method || "GET").toUpperCase(),
          params: resolveParams(),
          headers: options.headers,
          cache: options.cache || void 0,
          retry: options.retry ?? 0,
          timeout: options.timeout ?? http.defaults.timeout,
          signal: atual.signal
        });
        if (atual.signal.aborted) return;
        resource.data = pick(response.data, options.jsonPath);
        resource.loaded = true;
        options.onSuccess?.(resource.data);
      } catch (err) {
        if (atual.signal.aborted) return;
        const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err.message;
        resource.error = { name: "ResourceError", message };
        options.onError?.(err, message);
      } finally {
        if (!atual.signal.aborted) resource.loading = false;
        if (controller === atual) controller = null;
      }
    },
    set(value) {
      resource.data = value;
    },
    stop() {
      controller?.abort();
      controller = null;
      resource.loading = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
  });
  if (options.poll && options.poll > 0) {
    timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void resource.reload();
      }
    }, options.poll);
  }
  if (!options.manual) void resource.reload();
  return resource;
}

// src/dom/transition.ts
var BUILT_IN_CSS = `
.v-fade-enter-active,.v-fade-leave-active{transition:opacity .22s var(--v-ease,ease)}
.v-fade-enter-from,.v-fade-leave-to{opacity:0}

.v-scale-enter-active,.v-scale-leave-active{transition:opacity .22s var(--v-ease,ease),transform .22s var(--v-ease,ease)}
.v-scale-enter-from,.v-scale-leave-to{opacity:0;transform:scale(.94)}

.v-slide-enter-active,.v-slide-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-enter-from,.v-slide-leave-to{opacity:0;transform:translateY(-10px)}

.v-slide-up-enter-active,.v-slide-up-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-up-enter-from,.v-slide-up-leave-to{opacity:0;transform:translateY(14px)}

.v-slide-right-enter-active,.v-slide-right-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-right-enter-from,.v-slide-right-leave-to{opacity:0;transform:translateX(24px)}

.v-blur-enter-active,.v-blur-leave-active{transition:opacity .3s ease,filter .3s ease}
.v-blur-enter-from,.v-blur-leave-to{opacity:0;filter:blur(8px)}

@media (prefers-reduced-motion: reduce){
  [class*="-enter-active"],[class*="-leave-active"]{transition-duration:.01ms !important}
}
`;
function classesFor(options) {
  const name = options.name || "v-fade";
  return {
    enterFrom: options.enterFrom || `${name}-enter-from`,
    enterActive: options.enterActive || `${name}-enter-active`,
    enterTo: options.enterTo || `${name}-enter-to`,
    leaveFrom: options.leaveFrom || `${name}-leave-from`,
    leaveActive: options.leaveActive || `${name}-leave-active`,
    leaveTo: options.leaveTo || `${name}-leave-to`
  };
}
function addClasses(el, list) {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.add(cls);
}
function removeClasses(el, list) {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.remove(cls);
}
function readDuration(el) {
  const style = getComputedStyle(el);
  const parse2 = (value) => Math.max(0, ...value.split(",").map((v) => parseFloat(v) * (v.includes("ms") ? 1 : 1e3) || 0));
  return Math.max(
    parse2(style.transitionDuration) + parse2(style.transitionDelay),
    parse2(style.animationDuration) + parse2(style.animationDelay)
  );
}
function nextFrame(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}
function enter(el, options = {}) {
  injectStyle("transitions", BUILT_IN_CSS);
  const c = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve2) => {
    addClasses(el, c.enterFrom);
    addClasses(el, c.enterActive);
    nextFrame(() => {
      removeClasses(el, c.enterFrom);
      addClasses(el, c.enterTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c.enterActive);
        removeClasses(el, c.enterTo);
        resolve2();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function leave(el, options = {}) {
  injectStyle("transitions", BUILT_IN_CSS);
  const c = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve2) => {
    addClasses(el, c.leaveFrom);
    addClasses(el, c.leaveActive);
    nextFrame(() => {
      removeClasses(el, c.leaveFrom);
      addClasses(el, c.leaveTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c.leaveActive);
        removeClasses(el, c.leaveTo);
        resolve2();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function slideDown(el, duration = 240) {
  return new Promise((resolve2) => {
    el.style.removeProperty("display");
    if (getComputedStyle(el).display === "none") el.style.display = "block";
    const target = el.scrollHeight;
    el.style.overflow = "hidden";
    el.style.height = "0px";
    el.style.paddingTop = "0px";
    el.style.paddingBottom = "0px";
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.removeProperty("padding-top");
      el.style.removeProperty("padding-bottom");
      el.style.height = `${target}px`;
    });
    setTimeout(() => {
      el.style.removeProperty("height");
      el.style.removeProperty("overflow");
      el.style.removeProperty("transition");
      resolve2();
    }, duration + 20);
  });
}
function slideUp(el, duration = 240) {
  return new Promise((resolve2) => {
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = "hidden";
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.height = "0px";
      el.style.paddingTop = "0px";
      el.style.paddingBottom = "0px";
    });
    setTimeout(() => {
      el.style.display = "none";
      el.style.removeProperty("height");
      el.style.removeProperty("padding-top");
      el.style.removeProperty("padding-bottom");
      el.style.removeProperty("overflow");
      el.style.removeProperty("transition");
      resolve2();
    }, duration + 20);
  });
}
function fadeIn(el, duration = 220) {
  return new Promise((resolve2) => {
    el.style.opacity = "0";
    el.style.removeProperty("display");
    if (getComputedStyle(el).display === "none") el.style.display = "";
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.removeProperty("transition");
      el.style.removeProperty("opacity");
      resolve2();
    }, duration + 20);
  });
}
function fadeOut(el, duration = 220) {
  return new Promise((resolve2) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
      el.style.removeProperty("transition");
      el.style.removeProperty("opacity");
      resolve2();
    }, duration + 20);
  });
}
function viewTransition(update) {
  const doc = document;
  if (typeof doc.startViewTransition === "function" && !device.reducedMotion) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

// src/directives/core.ts
function setValue(expression, scope, value) {
  try {
    const target = parse(expression);
    const assignment = {
      t: "assign",
      op: "=",
      target,
      value: { t: "lit", v: value }
    };
    evaluate(assignment, scope);
  } catch (err) {
    handleError(err, `atribuicao em "${expression}"`);
  }
}
function transitionOptions(el) {
  const p2 = config.prefix;
  const has = el.hasAttribute(`${p2}transition`);
  const custom = el.hasAttribute(`${p2}enter-class`) || el.hasAttribute(`${p2}leave-class`) || el.hasAttribute(`${p2}enter-active-class`) || el.hasAttribute(`${p2}leave-active-class`);
  if (!has && !custom) return null;
  const name = el.getAttribute(`${p2}transition`) || "fade";
  return {
    name: name.startsWith("v-") ? name : `v-${name}`,
    enterFrom: el.getAttribute(`${p2}enter-class`) || void 0,
    enterActive: el.getAttribute(`${p2}enter-active-class`) || void 0,
    enterTo: el.getAttribute(`${p2}enter-to-class`) || void 0,
    leaveFrom: el.getAttribute(`${p2}leave-class`) || void 0,
    leaveActive: el.getAttribute(`${p2}leave-active-class`) || void 0,
    leaveTo: el.getAttribute(`${p2}leave-to-class`) || void 0,
    duration: el.hasAttribute(`${p2}duration`) ? parseDuration(el.getAttribute(`${p2}duration`)) : void 0
  };
}
defineDirective("text", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => {
    el.textContent = stringify(ev());
    const primeiro = el.firstChild;
    if (primeiro && primeiro.nodeType === 3) markInitialized(primeiro);
  });
});
defineDirective("html", (ctx) => {
  const { el, effect: effect2, evaluate: ev, scope } = ctx;
  markSkipChildren(el);
  effect2(() => {
    const value = ev();
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? "" : String(value);
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});
defineDirective("show", ({ el, effect: effect2, evaluate: ev }) => {
  const original = el.style.display === "none" ? "" : el.style.display;
  let first = true;
  const options = transitionOptions(el);
  effect2(() => {
    const visible = !!ev();
    if (first) {
      first = false;
      el.style.display = visible ? original : "none";
      return;
    }
    if (!options) {
      el.style.display = visible ? original : "none";
      return;
    }
    if (visible) {
      el.style.display = original;
      void enter(el, options);
    } else {
      void leave(el, options).then(() => {
        el.style.display = "none";
      });
    }
  });
});
defineDirective(
  "if",
  ({ el, scope, expression, effect: effect2 }) => {
    const p2 = config.prefix;
    const branches = [{ expression, template: el }];
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.hasAttribute(`${p2}else-if`)) {
        branches.push({
          expression: sibling.getAttribute(`${p2}else-if`) || "false",
          template: sibling
        });
        sibling = sibling.nextElementSibling;
      } else if (sibling.hasAttribute(`${p2}else`)) {
        branches.push({ expression: null, template: sibling });
        sibling = sibling.nextElementSibling;
        break;
      } else {
        break;
      }
    }
    const anchor = document.createComment(config.devtools ? ` v-if: ${expression} ` : "");
    el.parentNode?.insertBefore(anchor, el);
    for (const branch of branches) {
      removeQuietly(branch.template);
      branch.template.removeAttribute(`${p2}if`);
      branch.template.removeAttribute(`${p2}else-if`);
      branch.template.removeAttribute(`${p2}else`);
      markInitialized(branch.template);
    }
    const options = transitionOptions(el);
    let activeIndex = -1;
    let activeNodes = [];
    const removeActive = () => {
      const nodes = activeNodes;
      activeNodes = [];
      if (!nodes.length) return;
      const finish = () => {
        for (const node of nodes) {
          destroy(node);
          node.remove();
        }
      };
      if (options && nodes[0] instanceof HTMLElement) {
        void leave(nodes[0], options).then(finish);
      } else {
        finish();
      }
    };
    effect2(() => {
      let matched = -1;
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (branch.expression === null || evaluateIn(branch.expression, scope, "v-if")) {
          matched = i;
          break;
        }
      }
      if (matched === activeIndex) return;
      activeIndex = matched;
      removeActive();
      if (matched === -1) return;
      const source = branches[matched].template;
      const nodes = renderTemplate(source, anchor, scope);
      activeNodes = nodes;
      if (options && nodes[0] instanceof HTMLElement) void enter(nodes[0], options);
    });
    addCleanup(el, removeActive);
  },
  { priority: PRIORITY.IF, terminal: true }
);
function renderTemplate(source, anchor, scope) {
  const parent = anchor.parentNode;
  if (!parent) return [];
  const nodes = [];
  if (source.tagName === "TEMPLATE") {
    const fragment = source.content.cloneNode(true);
    const children = Array.from(fragment.childNodes);
    parent.insertBefore(fragment, anchor);
    for (const node of children) {
      nodes.push(node);
      if (node.nodeType === 1) {
        markNodeScope(node, scope);
        walk(node, scope);
      }
    }
  } else {
    const clone = source.cloneNode(true);
    parent.insertBefore(clone, anchor);
    nodes.push(clone);
    markNodeScope(clone, scope);
    walk(clone, scope);
  }
  return nodes;
}
defineDirective("else-if", () => void 0, { priority: PRIORITY.IF, terminal: true });
defineDirective("else", () => void 0, { priority: PRIORITY.IF, terminal: true });
var FOR_PATTERN = /^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+?)\s*$/;
defineDirective(
  "for",
  ({ el, scope, expression, effect: effect2 }) => {
    const match = FOR_PATTERN.exec(expression);
    if (!match) {
      handleError(
        new Error(`Sintaxe invalida em v-for="${expression}". Use "item in itens".`),
        "v-for"
      );
      return;
    }
    const aliases = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const sourceExpression = match[2];
    const [itemAlias, indexAlias, thirdAlias] = aliases;
    const p2 = config.prefix;
    const keyExpression = el.getAttribute(":key") || el.getAttribute(`${p2}bind:key`) || el.getAttribute(`${p2}key`);
    const anchor = document.createComment(config.devtools ? ` v-for: ${expression} ` : "");
    el.parentNode?.insertBefore(anchor, el);
    const template = el.cloneNode(true);
    template.removeAttribute(`${p2}for`);
    removeQuietly(el);
    let blocks = [];
    const clearAll = () => {
      for (const block2 of blocks) {
        for (const node of block2.nodes) {
          destroy(node);
          node.remove();
        }
      }
      blocks = [];
    };
    addCleanup(anchor, clearAll);
    effect2(() => {
      const source = evaluateIn(sourceExpression, scope, "v-for");
      const entries = normalizeSource(source, itemAlias, indexAlias, thirdAlias);
      const previous = /* @__PURE__ */ new Map();
      for (const block2 of blocks) previous.set(block2.key, block2);
      const next = [];
      const used = /* @__PURE__ */ new Set();
      entries.forEach((vars, index) => {
        const key = keyExpression ? evaluateIn(keyExpression, scope.child(vars), ":key") : `__index_${index}`;
        if (keyExpression && used.has(key)) avisarChaveDuplicada(el, key, expression);
        const existing = previous.get(key);
        if (existing && !used.has(key)) {
          used.add(key);
          for (const [name, value] of Object.entries(vars)) existing.data[name] = value;
          next.push(existing);
          return;
        }
        const childScope = scope.reactiveChild(vars);
        const nodes = renderTemplate(template, anchor, childScope);
        used.add(key);
        next.push({ key, scope: childScope, nodes, data: childScope.data });
      });
      for (const block2 of blocks) {
        if (used.has(block2.key) && next.includes(block2)) continue;
        for (const node of block2.nodes) {
          destroy(node);
          node.remove();
        }
      }
      let cursor = anchor;
      for (let i = next.length - 1; i >= 0; i--) {
        const block2 = next[i];
        const last = block2.nodes[block2.nodes.length - 1];
        if (last && last.nextSibling !== cursor) {
          for (const node of block2.nodes) anchor.parentNode?.insertBefore(node, cursor);
        }
        cursor = block2.nodes[0] ?? cursor;
      }
      blocks = next;
    });
  },
  { priority: PRIORITY.FOR, terminal: true }
);
function normalizeSource(source, itemAlias, indexAlias, thirdAlias) {
  const out = [];
  if (Array.isArray(source)) {
    source.forEach((item, index) => {
      const vars = { [itemAlias]: item };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }
  if (typeof source === "number") {
    for (let i = 1; i <= source; i++) {
      const vars = { [itemAlias]: i };
      if (indexAlias) vars[indexAlias] = i - 1;
      out.push(vars);
    }
    return out;
  }
  if (typeof source === "string") {
    Array.from(source).forEach((ch, index) => {
      const vars = { [itemAlias]: ch };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }
  if (source && typeof source === "object") {
    const iterable = source instanceof Map ? Array.from(source.entries()) : source instanceof Set ? Array.from(source).map((v, i) => [i, v]) : Object.entries(source);
    iterable.forEach(([key, value], index) => {
      const vars = { [itemAlias]: value };
      if (indexAlias) vars[indexAlias] = key;
      if (thirdAlias) vars[thirdAlias] = index;
      out.push(vars);
    });
  }
  return out;
}
var BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set([
  "disabled",
  "checked",
  "readonly",
  "required",
  "selected",
  "hidden",
  "open",
  "multiple",
  "autofocus",
  "novalidate",
  "inert"
]);
var ATRIBUTOS_DE_URL = /* @__PURE__ */ new Set([
  "href",
  "src",
  "action",
  "formaction",
  "xlink:href",
  "ping",
  "poster"
]);
var RUIDO_DE_ESQUEMA = /[\s\x00-\x1f]/g;
function urlPerigosa(valor) {
  const limpo = valor.replace(RUIDO_DE_ESQUEMA, "").toLowerCase();
  return limpo.startsWith("javascript:") || limpo.startsWith("vbscript:") || limpo.startsWith("data:text/html") || limpo.startsWith("data:application/xhtml");
}
function applyBinding(el, name, value, asProp = false) {
  if (name === "class") return applyClass(el, value);
  if (name === "style") return applyStyle(el, value);
  if (config.sanitizeUrls && !asProp) {
    if (ATRIBUTOS_DE_URL.has(name) && typeof value === "string" && urlPerigosa(value)) {
      avisar(
        `valor recusado em :${name} de ${descreverElemento(el)}: "${value.slice(0, 60)}" usa um esquema que executa codigo. Use um endereco http(s) ou relativo. Para desligar esta protecao, defina V.config.sanitizeUrls = false.`
      );
      el.removeAttribute(name);
      return;
    }
    if (name.length > 2 && /^on[a-z]/.test(name)) {
      avisar(
        `atributo "${name}" recusado em ${descreverElemento(el)}: ligar evento por atributo cria um manipulador embutido. Use @${name.slice(2)}="..." no lugar.`
      );
      el.removeAttribute(name);
      return;
    }
  }
  if (asProp) {
    el[name] = value;
    return;
  }
  if (BOOLEAN_ATTRIBUTES.has(name)) {
    if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, "");
    if (name in el) el[name] = !!value;
    return;
  }
  if (name === "value" && "value" in el) {
    el.value = value == null ? "" : value;
    return;
  }
  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? "" : String(value));
}
var baseClasses = /* @__PURE__ */ new WeakMap();
function applyClass(el, value) {
  let base = baseClasses.get(el);
  if (!base) {
    base = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    baseClasses.set(el, base);
  }
  const next = new Set(base);
  collectClasses(value, next);
  el.setAttribute("class", Array.from(next).join(" "));
  if (!el.getAttribute("class")) el.removeAttribute("class");
}
function collectClasses(value, out) {
  if (!value) return;
  if (typeof value === "string") {
    for (const cls of value.split(/\s+/)) if (cls) out.add(cls);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const [cls, active] of Object.entries(value)) {
      if (active) {
        for (const c of cls.split(/\s+/)) if (c) out.add(c);
      }
    }
  }
}
function applyStyle(el, value) {
  if (!value) return;
  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) applyStyle(el, item);
    return;
  }
  for (const [prop, raw] of Object.entries(value)) {
    if (raw == null || raw === false) {
      el.style.removeProperty(prop);
      continue;
    }
    const name = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const text = String(raw);
    if (name.startsWith("--")) el.style.setProperty(name, text);
    else el.style.setProperty(name, text);
  }
}
defineDirective(
  "bind",
  ({ el, arg, modifiers, effect: effect2, evaluate: ev, expression }) => {
    if (!arg) {
      effect2(() => {
        const values = ev();
        if (values && typeof values === "object") {
          for (const [name, value] of Object.entries(values)) applyBinding(el, name, value);
        }
      });
      return;
    }
    if (arg === "key") return;
    const asProp = !!modifiers.prop;
    effect2(() => {
      applyBinding(el, arg, ev(), asProp);
    });
  },
  { priority: PRIORITY.BIND }
);
defineDirective("class", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => applyClass(el, ev()));
});
defineDirective("style", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => applyStyle(el, ev()));
});
var KEY_ALIASES = {
  enter: ["Enter"],
  esc: ["Escape"],
  escape: ["Escape"],
  space: [" ", "Spacebar"],
  tab: ["Tab"],
  delete: ["Delete", "Backspace"],
  backspace: ["Backspace"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"]
};
var SYSTEM_MODIFIERS = ["ctrl", "shift", "alt", "meta"];
function runHandler(expression, scope, event, el) {
  const payload = event.detail;
  const isEmit = event.__voodoo === true;
  const local = scope.child({
    $event: isEmit ? payload : event,
    $rawEvent: event,
    $el: el,
    $detail: payload
  });
  try {
    const node = parse(expression);
    const value = evaluate(node, local);
    if (typeof value === "function" && (node.t === "id" || node.t === "member")) {
      value.call(scope.data, isEmit ? payload : event);
    }
  } catch (err) {
    handleError(err, `evento ${event.type} ("${expression}")`);
  }
}
var EVENT_ALIASES = {
  hover: "mouseenter",
  unhover: "mouseleave",
  tap: "click",
  press: "pointerdown",
  release: "pointerup",
  rightclick: "contextmenu",
  enterkey: "keydown",
  type: "input",
  submitform: "submit"
};
var customEvents = {
  /** Segurar pressionado. Duracao pela modificador, como `@hold.1s`. */
  hold(el, run, modifiers, cleanup) {
    const holdFor = parseDuration(
      typeof modifiers.duration === "string" && modifiers.duration || Object.keys(modifiers).find((m) => /^[\d.]+(ms|s)?$/.test(m)) || el.getAttribute(`${config.prefix}hold-duration`) || 800,
      800
    );
    let timer = null;
    let fired = false;
    const start2 = (event) => {
      fired = false;
      el.classList.add("v-holding");
      el.style.setProperty("--v-hold-duration", `${holdFor}ms`);
      timer = setTimeout(() => {
        fired = true;
        el.classList.remove("v-holding");
        run(event);
      }, holdFor);
    };
    const stopHold = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      el.classList.remove("v-holding");
    };
    const swallowClick = (event) => {
      if (fired) {
        event.preventDefault();
        event.stopPropagation();
        fired = false;
      }
    };
    el.addEventListener("pointerdown", start2);
    el.addEventListener("pointerup", stopHold);
    el.addEventListener("pointerleave", stopHold);
    el.addEventListener("pointercancel", stopHold);
    el.addEventListener("click", swallowClick, true);
    cleanup(() => {
      stopHold();
      el.removeEventListener("pointerdown", start2);
      el.removeEventListener("pointerup", stopHold);
      el.removeEventListener("pointerleave", stopHold);
      el.removeEventListener("pointercancel", stopHold);
      el.removeEventListener("click", swallowClick, true);
    });
  },
  /** Clique em qualquer lugar fora do elemento. */
  outside(el, run, _modifiers, cleanup) {
    const handler = (event) => {
      if (!el.isConnected) return;
      if (el === event.target || el.contains(event.target)) return;
      run(event);
    };
    document.addEventListener("click", handler, true);
    cleanup(() => document.removeEventListener("click", handler, true));
  },
  /** Elemento entrou na area visivel. */
  visible(el, run, modifiers, cleanup) {
    if (typeof IntersectionObserver === "undefined") {
      run(new CustomEvent("visible"));
      return;
    }
    const observer2 = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(new CustomEvent("visible", { detail: entry }));
          if (modifiers.repeat !== true) observer2.unobserve(el);
        }
      },
      { threshold: Number(modifiers.threshold ?? 0.1), rootMargin: String(modifiers.margin ?? "0px") }
    );
    observer2.observe(el);
    cleanup(() => observer2.disconnect());
  }
};
for (const direction of ["left", "right", "up", "down"]) {
  customEvents[`swipe${direction}`] = (el, run, _modifiers, cleanup) => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const down = (event) => {
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    };
    const up = (event) => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const threshold = 40;
      const matched = direction === "left" ? dx < -threshold && Math.abs(dx) > Math.abs(dy) : direction === "right" ? dx > threshold && Math.abs(dx) > Math.abs(dy) : direction === "up" ? dy < -threshold && Math.abs(dy) > Math.abs(dx) : dy > threshold && Math.abs(dy) > Math.abs(dx);
      if (matched) run(new CustomEvent(`swipe${direction}`, { detail: { dx, dy } }));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    cleanup(() => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    });
  };
}
function bindEvent(el, rawEventName, expression, scope, modifiers, cleanup) {
  const eventName = EVENT_ALIASES[rawEventName] ?? rawEventName;
  const custom = customEvents[rawEventName];
  if (custom) {
    custom(
      el,
      (event) => {
        if (modifiers.prevent) event.preventDefault();
        if (modifiers.stop) event.stopPropagation();
        runHandler(expression, scope, event, el);
      },
      modifiers,
      cleanup
    );
    return;
  }
  const target = modifiers.window ? window : modifiers.document ? document : modifiers.outside ? document : el;
  let handler = (event) => {
    if (modifiers.self && event.target !== el) return;
    if (modifiers.outside) {
      if (el === event.target || el.contains(event.target)) return;
      if (!el.isConnected) return;
    }
    if (event instanceof KeyboardEvent) {
      for (const mod of SYSTEM_MODIFIERS) {
        if (modifiers[mod] && !event[`${mod}Key`]) return;
      }
      const keyMods = Object.keys(modifiers).filter(
        (m) => m in KEY_ALIASES || /^[a-z0-9]$/.test(m)
      );
      if (keyMods.length) {
        const matched = keyMods.some((m) => {
          const aliases = KEY_ALIASES[m];
          if (aliases) return aliases.includes(event.key);
          return event.key.toLowerCase() === m;
        });
        if (!matched) return;
      }
    }
    if (modifiers.prevent) event.preventDefault();
    if (modifiers.stop) event.stopPropagation();
    runHandler(expression, scope, event, el);
  };
  const wait = modifiers.debounce;
  if (wait !== void 0) {
    handler = debounce(handler, parseDuration(wait === true ? 250 : wait, 250));
  }
  const throttleWait = modifiers.throttle;
  if (throttleWait !== void 0) {
    handler = throttle(handler, parseDuration(throttleWait === true ? 250 : throttleWait, 250));
  }
  const options = {
    capture: !!modifiers.capture,
    once: !!modifiers.once,
    passive: !!modifiers.passive
  };
  target.addEventListener(eventName, handler, options);
  cleanup(() => target.removeEventListener(eventName, handler, options));
}
defineDirective("on", ({ el, arg, expression, scope, modifiers, cleanup }) => {
  if (!arg) return;
  bindEvent(el, arg, expression, scope, modifiers, cleanup);
});
var EVENT_SHORTCUTS = [
  "click",
  "dblclick",
  "input",
  "change",
  "keyup",
  "keydown",
  "keypress",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mousedown",
  "mouseup",
  "contextmenu",
  "wheel",
  "paste",
  "dragstart",
  "dragover",
  "dragleave",
  "drop"
];
for (const name of EVENT_SHORTCUTS) {
  defineDirective(name, ({ el, expression, scope, modifiers, cleanup }) => {
    bindEvent(el, name, expression, scope, modifiers, cleanup);
  });
}
defineDirective(
  "model",
  ({ el, expression, scope, modifiers, effect: effect2, cleanup }) => {
    const input = el;
    const tag = input.tagName;
    const type = (input.getAttribute("type") || "text").toLowerCase();
    const isCheckbox = tag === "INPUT" && type === "checkbox";
    const isRadio = tag === "INPUT" && type === "radio";
    const isSelect = tag === "SELECT";
    const isMultiSelect = isSelect && input.multiple;
    const isFile = tag === "INPUT" && type === "file";
    const isNumberInput = type === "number" || type === "range";
    const lazy = !!modifiers.lazy;
    const wantsNumber = !!modifiers.number || isNumberInput;
    const wantsTrim = !!modifiers.trim;
    const debounceMs = modifiers.debounce ? parseDuration(modifiers.debounce === true ? 250 : modifiers.debounce, 250) : el.getAttribute(`${config.prefix}debounce`) ? parseDuration(el.getAttribute(`${config.prefix}debounce`), 250) : 0;
    const eventName = lazy || isSelect || isCheckbox || isRadio || isFile ? "change" : "input";
    let onInput = () => {
      let value;
      if (isCheckbox) {
        const current2 = evaluateIn(expression, scope, "v-model");
        if (Array.isArray(current2)) {
          const itemValue = input.value;
          const list = [...current2];
          const index = list.indexOf(itemValue);
          if (input.checked && index === -1) list.push(itemValue);
          else if (!input.checked && index > -1) list.splice(index, 1);
          value = list;
        } else {
          value = input.checked;
        }
      } else if (isRadio) {
        if (!input.checked) return;
        value = input.value;
      } else if (isMultiSelect) {
        value = Array.from(input.selectedOptions).map(
          (option) => option.value
        );
      } else if (isFile) {
        value = modifiers.single ? input.files?.[0] ?? null : input.files;
      } else {
        value = input.value;
        if (wantsTrim && typeof value === "string") value = value.trim();
        if (wantsNumber && typeof value === "string") {
          const n = value === "" ? null : Number(value);
          value = n === null || Number.isNaN(n) ? value : n;
        }
      }
      setValue(expression, scope, value);
    };
    if (debounceMs > 0) onInput = debounce(onInput, debounceMs);
    input.addEventListener(eventName, onInput);
    cleanup(() => input.removeEventListener(eventName, onInput));
    effect2(() => {
      const value = evaluateIn(expression, scope, "v-model");
      if (isCheckbox) {
        input.checked = Array.isArray(value) ? value.includes(input.value) : !!value;
        return;
      }
      if (isRadio) {
        input.checked = String(value) === input.value;
        return;
      }
      if (isMultiSelect) {
        const list = Array.isArray(value) ? value.map(String) : [];
        for (const option of Array.from(input.options)) {
          option.selected = list.includes(option.value);
        }
        return;
      }
      if (isFile) return;
      const next = value == null ? "" : String(value);
      if (input.value !== next) input.value = next;
      if (isSelect && input.value !== next) {
        void nextTick(() => {
          if (input.value !== next) input.value = next;
        });
      }
    });
  },
  { priority: PRIORITY.MODEL }
);
defineDirective(
  "init",
  ({ el, expression, scope }) => {
    queuePostFlush(() => {
      const local = scope.child({ $el: el });
      const value = evaluateIn(expression, local, "v-init");
      if (typeof value === "function") value.call(scope.data);
    });
  },
  { priority: PRIORITY.INIT }
);
defineDirective(
  "ref",
  ({ el, expression, scope, cleanup }) => {
    const name = expression.trim();
    if (!name) return;
    const target = scope.owner ?? scope;
    target.refs[name] = el;
    cleanup(() => {
      if (target.refs[name] === el) delete target.refs[name];
    });
  },
  { priority: PRIORITY.REF }
);
defineDirective("effect", ({ effect: effect2, evaluate: ev }) => {
  effect2(() => {
    ev();
  });
});
defineDirective("watch", ({ el, expression, scope, effect: effect2 }) => {
  const modelExpression = el.getAttribute(`${config.prefix}model`);
  let previous;
  let first = true;
  effect2(() => {
    const value = modelExpression ? evaluateIn(modelExpression, scope, "v-watch") : evaluateIn(expression, scope, "v-watch");
    if (first) {
      first = false;
      previous = value;
      return;
    }
    if (value === previous) return;
    const old = previous;
    previous = value;
    if (modelExpression) {
      const local = scope.child({ $value: value, $old: old, $el: el });
      const result = evaluateIn(expression, local, "v-watch");
      if (typeof result === "function") result.call(scope.data, value, old);
    }
  });
});
defineDirective("cloak", ({ el }) => {
  el.removeAttribute(`${config.prefix}cloak`);
});
defineDirective("once", ({ el, effect: effect2, evaluate: ev }) => {
  const value = ev();
  if (value !== void 0) el.textContent = stringify(value);
});
defineDirective(
  "teleport",
  ({ el, expression, cleanup }) => {
    const selector = expression.trim() || "body";
    const target = selector === "body" ? document.body : document.querySelector(selector);
    if (!target) {
      handleError(new Error(`Destino de v-teleport nao encontrado: ${selector}`), "v-teleport");
      return;
    }
    const placeholder = document.createComment(" v-teleport ");
    el.parentNode?.insertBefore(placeholder, el);
    target.appendChild(el);
    cleanup(() => {
      placeholder.parentNode?.insertBefore(el, placeholder);
      placeholder.remove();
    });
  },
  { priority: PRIORITY.DATA }
);
for (const name of [
  "transition",
  "enter-class",
  "enter-active-class",
  "enter-to-class",
  "leave-class",
  "leave-active-class",
  "leave-to-class",
  "duration",
  "key",
  "slot",
  "ignore",
  "pre"
]) {
  defineDirective(name, () => void 0, { priority: PRIORITY.TRANSITION });
}
defineDirective("data", () => void 0, { priority: PRIORITY.DATA });
defineDirective("component", () => void 0, { priority: PRIORITY.COMPONENT });

// src/directives/http.ts
var p = () => config.prefix;
function attr(el, name) {
  return readAttr(el, `${p()}${name}`);
}
function hasAttr2(el, name) {
  return hasAttr(el, `${p()}${name}`);
}
function readSettings(el, scope) {
  const targetSelector = attr(el, "target");
  const loadingSelector = attr(el, "loading");
  let headers = {};
  const headersExpression = attr(el, "headers");
  if (headersExpression) {
    const parsed = evaluateIn(headersExpression, scope, "v-headers");
    if (parsed && typeof parsed === "object") headers = parsed;
  }
  return {
    target: targetSelector ? document.querySelector(targetSelector) : null,
    swap: attr(el, "swap") || "innerHTML",
    loadingTarget: loadingSelector ? document.querySelector(loadingSelector) : null,
    loadingClass: attr(el, "loading-class") || "v-loading",
    disableWhileLoading: hasAttr2(el, "disable-loading"),
    confirmMessage: attr(el, "confirm"),
    toastSuccess: attr(el, "toast-success"),
    toastError: attr(el, "toast-error"),
    onSuccess: attr(el, "on-success"),
    onError: attr(el, "on-error"),
    onComplete: attr(el, "on-complete"),
    cacheMs: parseDuration(attr(el, "cache") ?? void 0, 0),
    retry: Number(attr(el, "retry") ?? 0),
    timeout: parseDuration(attr(el, "timeout") ?? void 0, http.defaults.timeout),
    storeAs: attr(el, "as"),
    jsonPath: attr(el, "json-path"),
    templateSelector: attr(el, "template"),
    offlineQueue: hasAttr2(el, "offline-queue"),
    headers,
    redirect: attr(el, "redirect"),
    scrollTo: attr(el, "scroll-to")
  };
}
function swapContent(target, html, mode, scope) {
  const initialize = (nodes) => {
    for (const node of Array.from(nodes)) if (node.nodeType === 1) walk(node, scope);
  };
  switch (mode) {
    case "none":
      return;
    case "delete":
      destroy(target);
      target.remove();
      return;
    case "textContent":
      target.textContent = html;
      return;
    case "outerHTML":
    case "replace": {
      const template = document.createElement("template");
      template.innerHTML = html;
      const nodes = Array.from(template.content.childNodes);
      destroy(target);
      target.replaceWith(template.content);
      initialize(nodes);
      return;
    }
    case "beforebegin":
    case "afterbegin":
    case "beforeend":
    case "afterend": {
      const before = new Set(Array.from(target.parentElement?.childNodes ?? []));
      target.insertAdjacentHTML(mode, html);
      const parent = mode === "afterbegin" || mode === "beforeend" ? target : target.parentElement;
      if (parent) {
        for (const node of Array.from(parent.childNodes)) {
          if (node.nodeType === 1 && !before.has(node)) walk(node, scope);
        }
      }
      return;
    }
    case "append":
      target.insertAdjacentHTML("beforeend", html);
      initialize(target.childNodes);
      return;
    case "prepend":
      target.insertAdjacentHTML("afterbegin", html);
      initialize(target.childNodes);
      return;
    default: {
      for (const child of Array.from(target.children)) destroy(child);
      target.innerHTML = html;
      initialize(target.childNodes);
    }
  }
}
function renderJSON(value, depth = 0) {
  if (value == null) return "";
  if (typeof value !== "object") return escapeHtml(String(value));
  if (Array.isArray(value)) {
    if (!value.length) return '<p class="v-json-empty">Nenhum resultado.</p>';
    const allObjects = value.every((item) => item && typeof item === "object" && !Array.isArray(item));
    if (allObjects && depth === 0) {
      const columns = Array.from(
        value.reduce((set, item) => {
          for (const key of Object.keys(item)) set.add(key);
          return set;
        }, /* @__PURE__ */ new Set())
      );
      const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
      const body = value.map(
        (item) => `<tr>${columns.map((c) => `<td>${renderJSON(item[c], depth + 1)}</td>`).join("")}</tr>`
      ).join("");
      return `<table class="v-json-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    return `<ul class="v-json-list">${value.map((item) => `<li>${renderJSON(item, depth + 1)}</li>`).join("")}</ul>`;
  }
  const entries = Object.entries(value);
  if (!entries.length) return "";
  return `<dl class="v-json-object">${entries.map(
    ([key, val]) => `<dt>${escapeHtml(key)}</dt><dd>${renderJSON(val, depth + 1)}</dd>`
  ).join("")}</dl>`;
}
function renderWithTemplate(selector, data2, scope, target) {
  const template = document.querySelector(selector);
  if (!template) {
    handleError(new Error(`Template nao encontrado: ${selector}`), "v-template");
    return;
  }
  for (const child of Array.from(target.children)) destroy(child);
  target.innerHTML = "";
  const items = Array.isArray(data2) ? data2 : [data2];
  for (const [index, item] of items.entries()) {
    const fragment = template.content.cloneNode(true);
    const nodes = Array.from(fragment.childNodes);
    target.appendChild(fragment);
    const itemScope = scope.reactiveChild({
      item,
      index,
      ...item && typeof item === "object" ? item : {}
    });
    for (const node of nodes) if (node.nodeType === 1) walk(node, itemScope);
  }
}
var inFlight = /* @__PURE__ */ new WeakMap();
async function runRequest(options) {
  const { el, scope, method } = options;
  const settings3 = readSettings(el, scope);
  const dialogoCuidaDaPergunta = directives.has(`confirm`);
  if (settings3.confirmMessage && !dialogoCuidaDaPergunta) {
    const confirmed = await askConfirmation(settings3.confirmMessage);
    if (!confirmed) return;
  }
  inFlight.get(el)?.abort();
  const controller = new AbortController();
  inFlight.set(el, controller);
  const target = settings3.target ?? el;
  const submitButton = el instanceof HTMLFormElement ? el.querySelector('[type="submit"], button:not([type])') : null;
  const startLoading = () => {
    el.classList.add(settings3.loadingClass);
    el.setAttribute("aria-busy", "true");
    if (settings3.loadingTarget) settings3.loadingTarget.style.removeProperty("display");
    if (settings3.disableWhileLoading) {
      const button = submitButton ?? el;
      if ("disabled" in button) button.disabled = true;
    }
  };
  const stopLoading = () => {
    el.classList.remove(settings3.loadingClass);
    el.removeAttribute("aria-busy");
    if (settings3.loadingTarget) settings3.loadingTarget.style.display = "none";
    if (settings3.disableWhileLoading) {
      const button = submitButton ?? el;
      if ("disabled" in button) button.disabled = false;
    }
  };
  startLoading();
  dispatch(el, "voodoo:before-request", { method, url: options.url });
  try {
    const response = await http.request({
      url: options.url,
      method,
      body: options.body,
      params: options.params,
      headers: settings3.headers,
      timeout: settings3.timeout,
      retry: settings3.retry,
      cache: settings3.cacheMs || void 0,
      signal: controller.signal,
      offlineQueue: settings3.offlineQueue
    });
    const data2 = pick(response.data, settings3.jsonPath);
    if (settings3.storeAs) {
      scope.set(settings3.storeAs, data2);
    } else if (settings3.templateSelector) {
      renderWithTemplate(settings3.templateSelector, data2, scope, target);
    } else if (typeof data2 === "string") {
      swapContent(target, data2, settings3.swap, scope);
    } else if (data2 !== void 0 && data2 !== null) {
      injectJSONStyles();
      swapContent(target, renderJSON(data2), settings3.swap, scope);
    }
    if (settings3.toastSuccess) toast.success(settings3.toastSuccess);
    if (settings3.onSuccess) {
      callHandler(settings3.onSuccess, scope, el, { data: data2, response });
    }
    dispatch(el, "voodoo:success", { data: data2, response });
    if (settings3.scrollTo) {
      document.querySelector(settings3.scrollTo)?.scrollIntoView({ behavior: "smooth" });
    }
    if (settings3.redirect) {
      location.assign(settings3.redirect);
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
    const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err?.message ?? "Erro desconhecido";
    if (settings3.toastError) toast.error(settings3.toastError);
    else if (!settings3.onError) toast.error(message);
    if (settings3.onError) callHandler(settings3.onError, scope, el, { error: err, message });
    dispatch(el, "voodoo:error", { error: err, message });
    handleError(err, `requisicao ${method} ${options.url}`);
  } finally {
    stopLoading();
    inFlight.delete(el);
    if (settings3.onComplete) callHandler(settings3.onComplete, scope, el, {});
    dispatch(el, "voodoo:complete", {});
  }
}
function dispatch(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
function callHandler(expression, scope, el, extra) {
  const local = scope.child({ $el: el, ...extra });
  const value = evaluateIn(expression, local, "callback HTTP");
  if (typeof value === "function") value.call(scope.data, extra.data ?? extra.error);
}
async function askConfirmation(message) {
  const global = globalThis.V;
  if (global && typeof global.confirm === "function" && global.confirm !== globalThis.confirm) {
    return !!await global.confirm(message);
  }
  return globalThis.confirm(message);
}
var jsonStylesInjected = false;
function injectJSONStyles() {
  if (jsonStylesInjected) return;
  jsonStylesInjected = true;
  void import('./style-AGREAIPL.js').then(({ injectStyle: injectStyle2 }) => {
    injectStyle2(
      "json-render",
      `
.v-json-table{width:100%;border-collapse:collapse;font:14px/1.5 var(--v-font-sans,system-ui,sans-serif)}
.v-json-table th,.v-json-table td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--v-border,#E6E0F0);vertical-align:top}
.v-json-table th{font-weight:650;color:var(--v-text-muted,#6B6580);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.v-json-list{margin:0;padding-left:18px}
.v-json-object{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
.v-json-object dt{font-weight:600;color:var(--v-text-muted,#6B6580)}
.v-json-object dd{margin:0}
.v-json-empty{color:var(--v-text-muted,#6B6580);font-style:italic}
`
    );
  });
}
function defaultTrigger(el) {
  const tag = el.tagName;
  if (tag === "FORM") return "submit";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    const type = el.type;
    return type === "button" || type === "submit" ? "click" : "change";
  }
  return "click";
}
function installTrigger({ el, cleanup, run }) {
  const declared = attr(el, "trigger") || defaultTrigger(el);
  const [name, ...modifiers] = declared.split(/[.\s]+/);
  const pollEvery = parseDuration(attr(el, "poll") ?? void 0, 0);
  if (pollEvery > 0) {
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, pollEvery);
    cleanup(() => clearInterval(timer));
    return;
  }
  if (name === "load" || name === "ready") {
    run();
    return;
  }
  if (name === "visible" || name === "revealed") {
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const observer2 = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run();
          if (!modifiers.includes("repeat")) observer2.unobserve(el);
        }
      },
      { rootMargin: "80px" }
    );
    observer2.observe(el);
    cleanup(() => observer2.disconnect());
    return;
  }
  const once = modifiers.includes("once");
  const delay = parseDuration(attr(el, "debounce") ?? void 0, 0);
  let handler = (event) => {
    if (el.tagName === "FORM" || el.href) event.preventDefault();
    run(event);
  };
  if (delay > 0) handler = debounce(handler, delay);
  el.addEventListener(name, handler, { once });
  cleanup(() => el.removeEventListener(name, handler));
}
var VERBS = [
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["patch", "PATCH"],
  ["delete", "DELETE"]
];
for (const [name, method] of VERBS) {
  defineDirective(name, ({ el, scope, expression, cleanup }) => {
    const run = (event) => {
      const url2 = resolveURL(expression, scope);
      if (!url2) return;
      const bodyExpression = attr(el, "body") || attr(el, "data-body");
      const body = bodyExpression ? evaluateIn(bodyExpression, scope.child({ $event: event }), "v-body") : void 0;
      const paramsExpression = attr(el, "params");
      const params = paramsExpression ? evaluateIn(paramsExpression, scope, "v-params") : void 0;
      void runRequest({ el, scope, method, url: url2, body, params, event });
    };
    installTrigger({ el, cleanup, run });
  });
}
function resolveURL(expression, scope) {
  const trimmed = expression.trim();
  if (!trimmed) return "";
  const looksLiteral = /^[./#?]/.test(trimmed) || /^https?:\/\//i.test(trimmed) || /^[\w-]+\/[\w\-/.]*$/.test(trimmed);
  if (looksLiteral && !/[+`'"]|\$\{/.test(trimmed)) return trimmed;
  const value = evaluateIn(trimmed, scope, "URL");
  return typeof value === "string" ? value : trimmed;
}
defineDirective("load", ({ el, scope, expression }) => {
  const url2 = resolveURL(expression, scope);
  if (url2) void runRequest({ el, scope, method: "GET", url: url2 });
});
defineDirective("load-visible", ({ el, scope, cleanup, expression }) => {
  const url2 = resolveURL(expression, scope);
  if (!url2) return;
  if (typeof IntersectionObserver === "undefined") {
    void runRequest({ el, scope, method: "GET", url: url2 });
    return;
  }
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer2.unobserve(el);
        void runRequest({ el, scope, method: "GET", url: url2 });
      }
    },
    { rootMargin: "120px" }
  );
  observer2.observe(el);
  cleanup(() => observer2.disconnect());
});
defineDirective("search", ({ el, scope, expression, cleanup }) => {
  const input = el;
  const url2 = resolveURL(expression, scope);
  const paramName = attr(el, "param") || input.getAttribute("name") || "q";
  const wait = parseDuration(attr(el, "debounce") ?? void 0, 300);
  const minLength = Number(attr(el, "min-length") ?? 0);
  const run = debounce(() => {
    const value = input.value.trim();
    if (value.length < minLength) return;
    void runRequest({
      el,
      scope,
      method: "GET",
      url: url2,
      params: { [paramName]: value }
    });
  }, wait);
  const handler = () => run();
  input.addEventListener("input", handler);
  cleanup(() => {
    input.removeEventListener("input", handler);
    run.cancel();
  });
});
defineDirective(
  "resource",
  ({ el, scope, expression, cleanup }) => {
    const separator = expression.indexOf(":");
    let name = attr(el, "as") || "resource";
    let urlExpression = expression.trim();
    if (separator > -1) {
      const head = expression.slice(0, separator).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(head)) {
        name = head;
        urlExpression = expression.slice(separator + 1).trim();
      }
    }
    const resource = createResource(() => resolveURL(urlExpression, scope), {
      method: (attr(el, "method") || "GET").toUpperCase(),
      params: () => attr(el, "params") ? evaluateIn(attr(el, "params"), scope, "v-params") : void 0,
      cache: parseDuration(attr(el, "cache") ?? void 0, 0) || void 0,
      retry: Number(attr(el, "retry") ?? 0),
      timeout: parseDuration(attr(el, "timeout") ?? void 0, http.defaults.timeout),
      jsonPath: attr(el, "json-path"),
      poll: parseDuration(attr(el, "poll") ?? void 0, 0),
      manual: hasAttr2(el, "manual"),
      onSuccess: (data2) => dispatch(el, "voodoo:success", { data: data2 }),
      onError: (err, message) => dispatch(el, "voodoo:error", { error: err, message })
    });
    scope.set(name, resource);
    cleanup(() => resource.stop());
  },
  { priority: PRIORITY.DATA }
);
for (const name of [
  "target",
  "swap",
  "trigger",
  "poll",
  "param",
  "params",
  "body",
  "data-body",
  "headers",
  "cache",
  "retry",
  "timeout",
  "as",
  "json-path",
  "template",
  "offline-queue",
  "min-length",
  "scroll-to",
  "manual",
  "debounce",
  "throttle",
  "indicator"
]) {
  defineDirective(name, () => void 0, { priority: PRIORITY.TRANSITION });
}

// src/core.ts
setComponentMounter(mountComponent);
setScopeMarker(markNodeScope);
setDirectiveRegistrar(directive);
installMagics();
var eventBus = /* @__PURE__ */ new Map();
function on(name, handler) {
  let set = eventBus.get(name);
  if (!set) eventBus.set(name, set = /* @__PURE__ */ new Set());
  set.add(handler);
  return () => set.delete(handler);
}
function onceEvent(name, handler) {
  const off2 = on(name, (payload) => {
    off2();
    handler(payload);
  });
  return off2;
}
function emit(name, payload) {
  const set = eventBus.get(name);
  if (!set) return;
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (err) {
      handleError(err, `evento "${name}"`);
    }
  }
}
function off(name, handler) {
  if (!handler) {
    eventBus.delete(name);
    return;
  }
  eventBus.get(name)?.delete(handler);
}
function directive(name, definition) {
  const hooks = typeof definition === "function" ? { mounted: definition, updated: definition } : definition;
  defineDirective(
    name,
    (ctx) => {
      let oldValue;
      let mounted = false;
      const makeBinding = (value) => ({
        el: ctx.el,
        value,
        oldValue,
        arg: ctx.arg,
        modifiers: ctx.modifiers,
        expression: ctx.expression,
        scope: ctx.scope,
        instance: ctx.scope.owner?.component ?? null
      });
      const initial = hooks.raw ? ctx.expression : ctx.evaluate();
      hooks.created?.(ctx.el, makeBinding(initial));
      hooks.beforeMount?.(ctx.el, makeBinding(initial));
      ctx.effect(() => {
        const value = hooks.raw ? ctx.expression : ctx.evaluate();
        if (!mounted) {
          mounted = true;
          oldValue = value;
          hooks.mounted?.(ctx.el, makeBinding(value));
          return;
        }
        if (value === oldValue) return;
        const binding = makeBinding(value);
        hooks.updated?.(ctx.el, binding);
        oldValue = value;
      });
      ctx.cleanup(() => {
        const binding = makeBinding(oldValue);
        hooks.beforeUnmount?.(ctx.el, binding);
        hooks.unmounted?.(ctx.el, binding);
      });
    },
    { priority: hooks.priority ?? PRIORITY.DEFAULT, terminal: hooks.terminal ?? false }
  );
}
function data(values) {
  Object.defineProperties(rootScope.data, Object.getOwnPropertyDescriptors(values));
  return rootScope.data;
}
var version = "0.1.0";
var core = {
  // Utilitarios primeiro: nomes proprios da Voodoo podem sobrescrever.
  ...utils_exports,
  version,
  config,
  // Reatividade
  reactive,
  ref,
  shallowRef,
  computed,
  effect,
  watch,
  watchEffect,
  nextTick,
  toRaw,
  markRaw,
  unref,
  stop,
  effectScope,
  EffectScope,
  flushSync,
  // Estado
  data,
  store,
  stores: allStores,
  removeStore,
  storeNames,
  scope: rootScope,
  // Componentes e directives
  component: defineComponent,
  components,
  directive,
  directives,
  magic,
  magics,
  // Modo aplicacao
  createApp,
  // Ciclo de vida do DOM
  start,
  whenReady,
  whenElement,
  walk,
  refresh,
  destroy,
  stopObserving,
  getScope,
  findScope,
  addCleanup,
  parseAttribute,
  // Expressoes
  parse,
  tokenize,
  evaluate,
  evaluateIn,
  stringify,
  clearParseCache,
  globals: allowedGlobals,
  // Servicos
  http,
  request,
  HttpError,
  /** Recurso reativo por JavaScript, equivalente a `v-resource`. */
  resource: createResource,
  toast,
  storage,
  session,
  cookie,
  cache: cache2,
  url,
  theme,
  clipboard,
  screen,
  network,
  // Animacao
  enter,
  leave,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  viewTransition,
  // Estilo
  injectStyle,
  ensureTokens,
  // Eventos globais
  on,
  once: onceEvent,
  off,
  emit,
  // Plugins
  use(plugin, options) {
    usePlugin(core, plugin, options);
  },
  /** Define o tratamento de erros da aplicacao inteira. */
  onError(handler) {
    setErrorHandler(handler);
  },
  /** Instancias de componente montadas, para inspecao. */
  instances,
  Scope,
  PRIORITY,
  VoodooSyntaxError,
  VoodooRuntimeError
};
setAppHost(core);

// src/dom/query.ts
var UNITLESS = /* @__PURE__ */ new Set([
  "animation-iteration-count",
  "aspect-ratio",
  "border-image-slice",
  "column-count",
  "flex",
  "flex-grow",
  "flex-shrink",
  "font-weight",
  "grid-area",
  "grid-column",
  "grid-row",
  "line-height",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tab-size",
  "widows",
  "z-index",
  "zoom"
]);
function kebab(property) {
  if (property.startsWith("--")) return property;
  return property.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}
function distinct(list) {
  if (list.length < 2) return list;
  return Array.from(new Set(list));
}
function names(value) {
  return String(value ?? "").split(/\s+/).filter(Boolean);
}
function parseHtml(html) {
  if (typeof document === "undefined") return [];
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const out = [];
  for (const child of Array.from(template.content.children)) out.push(child);
  return out;
}
function looksLikeHtml(text) {
  return text.length > 2 && text.charCodeAt(0) === 60 && text.endsWith(">");
}
function contextRoots(context) {
  if (context == null) return typeof document === "undefined" ? [] : [document];
  if (context instanceof VoodooCollection) return context.toArray();
  if (typeof context === "string") return resolve(context);
  if (typeof context === "function") return typeof document === "undefined" ? [] : [document];
  const list = resolve(context);
  if (list.length) return list;
  return typeof document === "undefined" ? [] : [document];
}
function resolve(input, context) {
  if (input == null) return [];
  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return [];
    if (looksLikeHtml(text)) return parseHtml(text);
    const out = [];
    for (const root of contextRoots(context)) {
      try {
        for (const found of Array.from(root.querySelectorAll(text))) out.push(found);
      } catch {
      }
    }
    return distinct(out);
  }
  if (input instanceof VoodooCollection) return input.toArray();
  if (typeof input === "function") return [];
  const node = input;
  if (typeof node.nodeType === "number") {
    if (node.nodeType === 1) return [node];
    if (node.nodeType === 9) {
      const doc = node;
      return doc.documentElement ? [doc.documentElement] : [];
    }
    if (node.nodeType === 11) {
      return Array.from(node.children);
    }
    return [];
  }
  const arrayLike = input;
  if (typeof arrayLike.length === "number") {
    const out = [];
    for (let i = 0; i < arrayLike.length; i++) {
      const item = arrayLike[i];
      if (item && item.nodeType === 1) out.push(item);
    }
    return distinct(out);
  }
  return [];
}
function contentNodes(content) {
  if (content == null) return [];
  if (typeof content === "string") {
    const text = content;
    if (looksLikeHtml(text.trim())) return parseHtml(text);
    return [document.createTextNode(text)];
  }
  if (content instanceof VoodooCollection) return content.toArray();
  if (typeof content === "function") return [];
  const node = content;
  if (typeof node.nodeType === "number") return [node];
  const arrayLike = content;
  if (typeof arrayLike.length === "number") {
    const out = [];
    for (let i = 0; i < arrayLike.length; i++) if (arrayLike[i]) out.push(arrayLike[i]);
    return out;
  }
  return [];
}
function setStyle(el, property, value) {
  const name = kebab(property);
  if (value === null || value === "") {
    el.style.removeProperty(name);
    return;
  }
  const text = typeof value === "number" && !UNITLESS.has(name) && !name.startsWith("--") ? `${value}px` : String(value);
  el.style.setProperty(name, text);
}
function applyStyles(el, values) {
  for (const [property, value] of Object.entries(values)) setStyle(el, property, value);
}
function parseDataValue(raw) {
  if (raw === void 0) return void 0;
  if (raw === "") return "";
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const first = raw.charCodeAt(0);
  if (first === 123 || first === 91 || first === 34) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
function datasetKey(key) {
  return key.replace(/-([a-z0-9])/g, (_all, ch) => ch.toUpperCase());
}
var savedDisplay = /* @__PURE__ */ new WeakMap();
function elementHidden(el) {
  if (el.hasAttribute("hidden")) return true;
  if (el.style.display === "none") return true;
  return !el.isConnected ? false : getComputedStyle(el).display === "none";
}
function showElement(el) {
  el.removeAttribute("hidden");
  const previous = savedDisplay.get(el);
  if (previous !== void 0 && previous !== "none") el.style.display = previous;
  else el.style.removeProperty("display");
  if (el.isConnected && getComputedStyle(el).display === "none") el.style.display = "block";
}
function hideElement(el) {
  const current2 = el.style.display;
  if (current2 && current2 !== "none") savedDisplay.set(el, current2);
  el.style.display = "none";
}
var FORM_CONTROLS = "input,select,textarea";
function formControls(el) {
  if (el.matches(FORM_CONTROLS)) return [el];
  return Array.from(el.querySelectorAll(FORM_CONTROLS));
}
function isSerializable(control) {
  const field = control;
  if (!field.name || field.disabled) return false;
  const type = (field.getAttribute("type") || "").toLowerCase();
  if (type === "file" || type === "submit" || type === "reset" || type === "button") return false;
  if ((type === "checkbox" || type === "radio") && !field.checked) return false;
  return true;
}
var eventStore = /* @__PURE__ */ new WeakMap();
function bindingsOf(el) {
  let list = eventStore.get(el);
  if (!list) eventStore.set(el, list = []);
  return list;
}
var VoodooCollection = class _VoodooCollection {
  constructor(elements = []) {
    /** Quantidade de elementos da colecao. */
    __publicField(this, "length");
    /** Elementos da colecao, na ordem em que foram encontrados. */
    __publicField(this, "elements");
    this.elements = elements;
    this.length = elements.length;
    const indexed = this;
    for (let i = 0; i < elements.length; i++) indexed[i] = elements[i];
  }
  /** Permite `for (const el of query('.item'))`. */
  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }
  // -------------------------------------------------------------------------
  // Travessia
  // -------------------------------------------------------------------------
  /** Descendentes que casam com o seletor. */
  find(selector) {
    const out = [];
    for (const el of this.elements) {
      try {
        for (const found of Array.from(el.querySelectorAll(selector))) out.push(found);
      } catch {
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Ancestral mais proximo, incluindo o proprio elemento. */
  closest(selector) {
    const out = [];
    for (const el of this.elements) {
      const found = el.closest(selector);
      if (found) out.push(found);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Elemento pai de cada item, opcionalmente filtrado. */
  parent(selector) {
    const out = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && (!selector || parent.matches(selector))) out.push(parent);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Todos os ancestrais, do mais proximo ao mais distante. */
  parents(selector) {
    const out = [];
    for (const el of this.elements) {
      let current2 = el.parentElement;
      while (current2) {
        if (!selector || current2.matches(selector)) out.push(current2);
        current2 = current2.parentElement;
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Filhos diretos, opcionalmente filtrados. */
  children(selector) {
    const out = [];
    for (const el of this.elements) {
      for (const child of Array.from(el.children)) {
        if (!selector || child.matches(selector)) out.push(child);
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Irmaos, sem incluir os proprios elementos. */
  siblings(selector) {
    const out = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (!parent) continue;
      for (const child of Array.from(parent.children)) {
        if (child === el) continue;
        if (!selector || child.matches(selector)) out.push(child);
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Proximo irmao de cada elemento. */
  next(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.nextElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Irmao anterior de cada elemento. */
  prev(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.previousElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Somente o primeiro elemento. */
  first() {
    return this.eq(0);
  }
  /** Somente o ultimo elemento. */
  last() {
    return this.eq(-1);
  }
  /** Elemento na posicao informada. Indices negativos contam do fim. */
  eq(index) {
    const position = index < 0 ? this.elements.length + index : index;
    const el = this.elements[position];
    return new _VoodooCollection(el ? [el] : []);
  }
  /** Mantem apenas os elementos que passam no filtro. */
  filter(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Remove da colecao os elementos que passam no filtro. */
  not(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? !test(el, index) : !el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Mantem os elementos que contem o descendente informado. */
  has(target) {
    const out = this.elements.filter(
      (el) => typeof target === "string" ? el.querySelector(target) !== null : el.contains(target)
    );
    return new _VoodooCollection(out);
  }
  /** Verifica se ao menos um elemento casa com o filtro. */
  is(test) {
    return this.elements.some(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
  }
  /** Projeta cada elemento em um valor e devolve um array comum. */
  map(fn) {
    return this.elements.map((el, index) => fn(el, index));
  }
  /** Percorre a colecao. Dentro da funcao, `this` e o elemento atual. */
  each(fn) {
    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];
      if (fn.call(el, el, i) === false) break;
    }
    return this;
  }
  get(...rest) {
    if (!rest.length) return this.toArray();
    const index = Number(rest[0]);
    return this.elements[index < 0 ? this.elements.length + index : index];
  }
  /** Copia dos elementos como array comum. */
  toArray() {
    return this.elements.slice();
  }
  /** Junta outros elementos a colecao, sem repetir. */
  add(input, context) {
    return new _VoodooCollection(distinct([...this.elements, ...resolve(input, context)]));
  }
  /** Recorte da colecao, com a mesma semantica de `Array.prototype.slice`. */
  slice(start2, end) {
    return new _VoodooCollection(this.elements.slice(start2, end));
  }
  text(...rest) {
    if (!rest.length) return this.elements[0]?.textContent ?? "";
    const value = rest[0];
    const text = value == null ? "" : String(value);
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = text;
    }
    return this;
  }
  html(...rest) {
    if (!rest.length) return this.elements[0]?.innerHTML ?? "";
    const value = rest[0];
    const text = value == null ? "" : String(value);
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.innerHTML = text;
    }
    return this;
  }
  val(...rest) {
    if (!rest.length) {
      const field = this.elements[0];
      if (!field) return "";
      const select = field;
      if (field.tagName === "SELECT" && select.multiple) {
        return Array.from(select.selectedOptions).map((option) => option.value);
      }
      if (field.type === "checkbox") return field.checked ? field.value || "on" : "";
      return field.value ?? "";
    }
    const value = rest[0];
    for (const el of this.elements) {
      const field = el;
      const select = el;
      if (field.tagName === "SELECT" && select.multiple) {
        const wanted = (Array.isArray(value) ? value : [value]).map(String);
        for (const option of Array.from(select.options)) option.selected = wanted.includes(option.value);
        continue;
      }
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Array.isArray(value) ? value.map(String).includes(field.value) : value === true || String(value) === field.value;
        continue;
      }
      field.value = value == null ? "" : String(value);
    }
    return this;
  }
  attr(...rest) {
    const first = rest[0];
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) {
        for (const [name2, value2] of Object.entries(first)) {
          if (value2 === null || value2 === false) el.removeAttribute(name2);
          else el.setAttribute(name2, value2 === true ? "" : String(value2));
        }
      }
      return this;
    }
    const name = String(first);
    if (rest.length < 2) return this.elements[0]?.getAttribute(name) ?? void 0;
    const value = rest[1];
    for (const el of this.elements) {
      if (value === null || value === false) el.removeAttribute(name);
      else el.setAttribute(name, value === true ? "" : String(value));
    }
    return this;
  }
  /** Remove um ou varios atributos, separados por espaco. */
  removeAttr(name) {
    const list = names(name);
    for (const el of this.elements) for (const attribute of list) el.removeAttribute(attribute);
    return this;
  }
  prop(...rest) {
    const name = String(rest[0]);
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? el[name] : void 0;
    }
    for (const el of this.elements) el[name] = rest[1];
    return this;
  }
  data(...rest) {
    const first = rest[0];
    if (!rest.length) {
      const el = this.elements[0];
      if (!el) return {};
      const out = {};
      for (const [key2, raw] of Object.entries(el.dataset)) out[key2] = parseDataValue(raw);
      return out;
    }
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) {
        for (const [key2, value2] of Object.entries(first)) {
          el.dataset[datasetKey(key2)] = typeof value2 === "string" ? value2 : JSON.stringify(value2 ?? null);
        }
      }
      return this;
    }
    const key = datasetKey(String(first));
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? parseDataValue(el.dataset[key]) : void 0;
    }
    const value = rest[1];
    for (const el of this.elements) {
      el.dataset[key] = typeof value === "string" ? value : JSON.stringify(value ?? null);
    }
    return this;
  }
  css(...rest) {
    const first = rest[0];
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) applyStyles(el, first);
      return this;
    }
    const property = String(first);
    if (rest.length < 2) {
      const el = this.elements[0];
      if (!el) return "";
      const name = kebab(property);
      const computed2 = el.isConnected ? getComputedStyle(el).getPropertyValue(name) : "";
      return (computed2 || el.style.getPropertyValue(name)).trim();
    }
    for (const el of this.elements) setStyle(el, property, rest[1]);
    return this;
  }
  width(...rest) {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().width : 0;
    }
    for (const el of this.elements) setStyle(el, "width", rest[0]);
    return this;
  }
  height(...rest) {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().height : 0;
    }
    for (const el of this.elements) setStyle(el, "height", rest[0]);
    return this;
  }
  /** Posicao do primeiro elemento em relacao ao documento. */
  offset() {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
  }
  /** Posicao do primeiro elemento em relacao ao ancestral posicionado. */
  position() {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    return { top: el.offsetTop, left: el.offsetLeft };
  }
  scrollTop(...rest) {
    if (!rest.length) return this.elements[0]?.scrollTop ?? 0;
    const value = Number(rest[0]) || 0;
    for (const el of this.elements) el.scrollTop = value;
    return this;
  }
  // -------------------------------------------------------------------------
  // Classes
  // -------------------------------------------------------------------------
  /** Adiciona uma ou varias classes separadas por espaco. */
  addClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.add(...list);
    return this;
  }
  /** Remove uma ou varias classes separadas por espaco. */
  removeClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.remove(...list);
    return this;
  }
  /** Alterna classes. O segundo argumento forca ligar ou desligar. */
  toggleClass(value, force) {
    const list = names(value);
    for (const el of this.elements) {
      for (const cls of list) {
        if (force === void 0) el.classList.toggle(cls);
        else el.classList.toggle(cls, force);
      }
    }
    return this;
  }
  /** Verdadeiro quando algum elemento tem todas as classes informadas. */
  hasClass(value) {
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
  insert(content, place) {
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
  append(content) {
    return this.insert(content, (el, node) => el.appendChild(node));
  }
  /** Insere conteudo no inicio de cada elemento. */
  prepend(content) {
    return this.insert(content, (el, node) => el.insertBefore(node, el.firstChild));
  }
  /** Insere conteudo antes de cada elemento. */
  before(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el));
  }
  /** Insere conteudo depois de cada elemento. */
  after(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el.nextSibling));
  }
  /** Move os elementos da colecao para dentro do destino. */
  appendTo(target) {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      for (const el of this.elements) {
        targets[i].appendChild(i === targets.length - 1 ? el : el.cloneNode(true));
      }
    }
    return this;
  }
  /** Move os elementos da colecao para o inicio do destino. */
  prependTo(target) {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      const parent = targets[i];
      const nodes = this.elements.map(
        (el) => i === targets.length - 1 ? el : el.cloneNode(true)
      );
      for (let j = nodes.length - 1; j >= 0; j--) parent.insertBefore(nodes[j], parent.firstChild);
    }
    return this;
  }
  /** Troca cada elemento pelo conteudo informado, desmontando o antigo. */
  replaceWith(content) {
    for (const el of this.elements) {
      const parent = el.parentNode;
      if (!parent) continue;
      for (const node of contentNodes(content)) parent.insertBefore(node, el);
      destroy(el);
      el.remove();
    }
    return this;
  }
  /** Envolve cada elemento com o HTML ou elemento informado. */
  wrap(wrapper) {
    for (const el of this.elements) {
      const model = resolve(wrapper)[0];
      if (!model) continue;
      const clone = model.cloneNode(true);
      el.parentNode?.insertBefore(clone, el);
      let deepest = clone;
      while (deepest.firstElementChild) deepest = deepest.firstElementChild;
      deepest.appendChild(el);
    }
    return this;
  }
  /** Remove o pai de cada elemento, mantendo os filhos no lugar. */
  unwrap() {
    const parents = /* @__PURE__ */ new Set();
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && parent !== document.body) parents.add(parent);
    }
    for (const parent of parents) {
      const grand = parent.parentNode;
      if (!grand) continue;
      while (parent.firstChild) grand.insertBefore(parent.firstChild, parent);
      destroy(parent);
      parent.remove();
    }
    return this;
  }
  /** Remove os elementos do documento e desmonta os efeitos reativos. */
  remove() {
    for (const el of this.elements) {
      destroy(el);
      el.remove();
    }
    return this;
  }
  /** Esvazia os elementos, desmontando o conteudo removido. */
  empty() {
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.replaceChildren();
    }
    return this;
  }
  /** Copia os elementos. A copia nasce sem directives inicializadas. */
  clone(deep = true) {
    return new _VoodooCollection(this.elements.map((el) => el.cloneNode(deep)));
  }
  on(types, ...rest) {
    const delegated = typeof rest[0] === "string";
    const selector = delegated ? rest[0] : null;
    const handler = delegated ? rest[1] : rest[0];
    const options = (delegated ? rest[2] : rest[1]) ?? {};
    if (typeof handler !== "function") return this;
    for (const el of this.elements) {
      for (const type of names(types)) {
        const wrapped = (event) => {
          if (!selector) {
            handler.call(el, event);
            return;
          }
          const start2 = event.target;
          const matched = start2?.closest(selector);
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
  off(types, selectorOrHandler, handler) {
    const wantedSelector = typeof selectorOrHandler === "string" ? selectorOrHandler : null;
    const wantedHandler = typeof selectorOrHandler === "function" ? selectorOrHandler : handler ?? null;
    const wantedTypes = types ? names(types) : null;
    for (const el of this.elements) {
      const list = eventStore.get(el);
      if (!list) continue;
      const keep = [];
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
  once(types, ...rest) {
    const delegated = typeof rest[0] === "string";
    const selector = delegated ? rest[0] : null;
    const handler = delegated ? rest[1] : rest[0];
    if (typeof handler !== "function") return this;
    const self = this;
    const wrapper = function(event) {
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
  trigger(type, detail) {
    for (const el of this.elements) {
      if (detail === void 0 && typeof el[type] === "function") {
        el[type]();
        continue;
      }
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      event.__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }
  /** Dispara um evento customizado que sobe pela arvore, no estilo componente. */
  emit(type, detail) {
    for (const el of this.elements) {
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      event.__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }
  // -------------------------------------------------------------------------
  // Visibilidade e animacao
  // -------------------------------------------------------------------------
  /** Mostra os elementos restaurando o display anterior. */
  show() {
    for (const el of this.elements) showElement(el);
    return this;
  }
  /** Esconde os elementos guardando o display atual. */
  hide() {
    for (const el of this.elements) hideElement(el);
    return this;
  }
  /** Alterna a visibilidade. O argumento forca mostrar ou esconder. */
  toggle(force) {
    for (const el of this.elements) {
      const visible = force === void 0 ? elementHidden(el) : force;
      if (visible) showElement(el);
      else hideElement(el);
    }
    return this;
  }
  /** Aparecimento com fade. */
  fadeIn(duration = 220) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void fadeIn(el, duration);
    }
    return this;
  }
  /** Desaparecimento com fade, terminando escondido. */
  fadeOut(duration = 220) {
    for (const el of this.elements) void fadeOut(el, duration);
    return this;
  }
  /** Recolhe a altura ate zero. */
  slideUp(duration = 240) {
    for (const el of this.elements) void slideUp(el, duration);
    return this;
  }
  /** Expande a altura ate o conteudo. */
  slideDown(duration = 240) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void slideDown(el, duration);
    }
    return this;
  }
  /** Alterna entre recolher e expandir. */
  slideToggle(duration = 240) {
    for (const el of this.elements) {
      if (elementHidden(el)) {
        el.removeAttribute("hidden");
        void slideDown(el, duration);
      } else {
        void slideUp(el, duration);
      }
    }
    return this;
  }
  /** Animacao pela Web Animations API. */
  animate(keyframes, options = 300) {
    for (const el of this.elements) {
      if (typeof el.animate !== "function") continue;
      el.animate(keyframes, options);
    }
    return this;
  }
  /** Rola a pagina ate o primeiro elemento. */
  scrollIntoView(options = { behavior: "smooth", block: "start" }) {
    this.elements[0]?.scrollIntoView(options);
    return this;
  }
  // -------------------------------------------------------------------------
  // Formulario
  // -------------------------------------------------------------------------
  /** Serializa os campos do primeiro elemento no formato de query string. */
  serialize() {
    const el = this.elements[0];
    if (!el) return "";
    const params = new URLSearchParams();
    for (const control of formControls(el)) {
      if (!isSerializable(control)) continue;
      const field = control;
      const select = control;
      if (field.tagName === "SELECT" && select.multiple) {
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
  serializeObject() {
    const el = this.elements[0];
    const out = {};
    if (!el) return out;
    for (const control of formControls(el)) {
      const field = control;
      if (!field.name || field.disabled) continue;
      const type = (field.getAttribute("type") || "").toLowerCase();
      if (type === "submit" || type === "reset" || type === "button") continue;
      const isList = field.name.endsWith("[]");
      const key = isList ? field.name.slice(0, -2) : field.name;
      const select = control;
      let value;
      if (type === "checkbox") {
        if (!field.checked && !isList) {
          out[key] = out[key] ?? false;
          continue;
        }
        if (!field.checked) continue;
        value = field.value === "on" ? true : field.value;
      } else if (type === "radio") {
        if (!field.checked) continue;
        value = field.value;
      } else if (type === "file") {
        value = field.multiple ? Array.from(field.files ?? []) : field.files?.[0] ?? null;
      } else if (field.tagName === "SELECT" && select.multiple) {
        value = Array.from(select.selectedOptions).map((option) => option.value);
      } else if (type === "number" || type === "range") {
        value = field.value === "" ? null : Number(field.value);
      } else {
        value = field.value;
      }
      if (isList) {
        const current2 = out[key];
        if (Array.isArray(current2)) current2.push(value);
        else out[key] = [value];
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        const current2 = out[key];
        if (Array.isArray(current2)) current2.push(value);
        else if (current2 === void 0 || current2 === false) out[key] = value;
        else out[key] = [current2, value];
        continue;
      }
      out[key] = value;
    }
    return out;
  }
  /** Coloca o foco no primeiro elemento. */
  focus(options) {
    this.elements[0]?.focus(options);
    return this;
  }
  /** Tira o foco de todos os elementos. */
  blur() {
    for (const el of this.elements) el.blur();
    return this;
  }
  /** Seleciona o texto dos campos da colecao. */
  select() {
    for (const el of this.elements) {
      const field = el;
      if (typeof field.select === "function") field.select();
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
  walk(force = false) {
    for (const el of this.elements) {
      if (force) destroy(el);
      walk(el, findScope(el.parentNode));
    }
    return this;
  }
  /** Desmonta efeitos, escutas e componentes, mantendo os elementos no DOM. */
  destroy() {
    for (const el of this.elements) destroy(el);
    return this;
  }
};
function query(input, context) {
  if (typeof input === "function") {
    ready2(input);
    const root = typeof document !== "undefined" ? document.documentElement : null;
    return new VoodooCollection(root ? [root] : []);
  }
  return new VoodooCollection(resolve(input, context));
}
function ready2(fn) {
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve2) => {
    whenBodyReady(() => {
      try {
        fn?.();
      } catch (err) {
        handleError(err, "V.ready");
      }
      resolve2();
    });
  });
}
function fromHtml(html) {
  return new VoodooCollection(parseHtml(html));
}

// src/directives/shared.ts
var optionValues = /* @__PURE__ */ new WeakMap();
function attrOf(el, name) {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function hasAttrOf(el, name) {
  return hasAttr(el, `${config.prefix}${name}`) || hasAttr(el, `data-v-${name}`);
}
function readOption(el, name) {
  const bag = optionValues.get(el);
  if (bag && name in bag) return bag[name];
  return attrOf(el, name);
}
function storeOption(el, name, value) {
  const bag = optionValues.get(el) ?? {};
  bag[name] = value;
  optionValues.set(el, bag);
}
function defineOption(name) {
  defineDirective(
    name,
    ({ el, expression }) => {
      storeOption(el, name, expression);
    },
    { priority: PRIORITY.BIND }
  );
}
function dispatch2(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
function callExpression(expression, scope, el, event, detail) {
  if (!expression.trim()) return void 0;
  const local = scope.child({ $el: el, $event: event ?? null, $detail: detail });
  const value = evaluateIn(expression, local, "directive de UI");
  if (typeof value === "function") {
    return value.call(scope.data, detail ?? event);
  }
  return value;
}
var LIVE_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;
var liveRegion = null;
function announce(message) {
  if (typeof document === "undefined") return;
  injectStyle("ui-live", LIVE_CSS);
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement("div");
    liveRegion.className = "v-visually-hidden";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
  }
  const region = liveRegion;
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}
function ownedByDirective(root, childName, ownerName) {
  return queryDirective(root, childName).filter(
    (el) => closestDirective(el, ownerName) === root
  );
}

// src/directives/dnd.ts
var DND_CSS = `
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
function ensureDnd() {
  ensureTokens();
  injectStyle("dnd", DND_CSS);
}
var sortableRegistry = /* @__PURE__ */ new Map();
var droppableRegistry = /* @__PURE__ */ new Map();
function groupOf(el, own) {
  if (own && own.trim()) return own.trim();
  const holder = el.closest("[data-v-dnd-group]");
  return holder?.getAttribute("data-v-dnd-group") || null;
}
function itemsOf(list) {
  return Array.from(list.children).filter(
    (child) => !child.classList.contains("v-drag-ghost")
  );
}
function itemKey(item, index) {
  return item.getAttribute("data-id") ?? (item.id || String(index));
}
function orderOf(list) {
  return itemsOf(list).map((item, index) => itemKey(item, index));
}
function isHorizontal(list) {
  const style = getComputedStyle(list);
  if (style.display.includes("flex")) return style.flexDirection.startsWith("row");
  if (style.display.includes("grid")) return style.gridAutoFlow.startsWith("column");
  return false;
}
var session2 = null;
var scrollFrame = 0;
function createGhost(item, rect) {
  const ghost = item.cloneNode(true);
  ghost.classList.add("v-drag-ghost");
  ghost.classList.remove("v-dragging", "v-grabbed");
  ghost.removeAttribute("id");
  for (const node of Array.from(ghost.querySelectorAll("[id]"))) node.removeAttribute("id");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.setAttribute("aria-hidden", "true");
  document.body.appendChild(ghost);
  return ghost;
}
function moveGhost(x, y) {
  if (!session2?.ghost) return;
  const left = session2.axis === "y" ? session2.lastX : x;
  const top2 = session2.axis === "x" ? session2.lastY : y;
  session2.ghost.style.transform = `translate3d(${Math.round(left - session2.grabX)}px, ${Math.round(
    top2 - session2.grabY
  )}px, 0)`;
}
function scrollParent(el) {
  let current2 = el;
  while (current2 && current2 !== document.body && current2 !== document.documentElement) {
    const style = getComputedStyle(current2);
    const scrollableY = (style.overflowY === "auto" || style.overflowY === "scroll") && current2.scrollHeight > current2.clientHeight + 2;
    const scrollableX = (style.overflowX === "auto" || style.overflowX === "scroll") && current2.scrollWidth > current2.clientWidth + 2;
    if (scrollableY || scrollableX) return current2;
    current2 = current2.parentElement;
  }
  return null;
}
function autoScroll() {
  if (!session2) return;
  const zone = 56;
  const speed = 16;
  const x = session2.lastX;
  const y = session2.lastY;
  const under = document.elementFromPoint(x, y);
  const container2 = scrollParent(under ?? session2.overList);
  if (container2) {
    const rect = container2.getBoundingClientRect();
    if (y - rect.top < zone) container2.scrollTop -= speed;
    else if (rect.bottom - y < zone) container2.scrollTop += speed;
    if (x - rect.left < zone) container2.scrollLeft -= speed;
    else if (rect.right - x < zone) container2.scrollLeft += speed;
    return;
  }
  if (y < zone) window.scrollBy(0, -speed);
  else if (window.innerHeight - y < zone) window.scrollBy(0, speed);
  if (x < zone) window.scrollBy(-speed, 0);
  else if (window.innerWidth - x < zone) window.scrollBy(speed, 0);
}
function startScrollLoop() {
  const step = () => {
    if (!session2 || session2.keyboard) return;
    autoScroll();
    scrollFrame = requestAnimationFrame(step);
  };
  scrollFrame = requestAnimationFrame(step);
}
function stopScrollLoop() {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
}
function listAccepts(list, current2) {
  const info = sortableRegistry.get(list);
  if (!info) return false;
  if (list === current2.startList) return true;
  if (!info.group || !current2.group) return false;
  return info.group === current2.group;
}
function dropAccepts(info, current2) {
  if (info.accept && !current2.item.matches(info.accept)) return false;
  if (info.group && info.group !== current2.group) return false;
  return true;
}
function highlightTargets(current2, on2) {
  for (const info of droppableRegistry.values()) {
    info.el.classList.toggle("v-drop-active", on2 && dropAccepts(info, current2));
  }
  for (const info of sortableRegistry.values()) {
    info.el.classList.toggle("v-drop-active", on2 && listAccepts(info.el, current2));
  }
}
function placeInList(list, item, x, y) {
  const horizontal = isHorizontal(list);
  let reference = null;
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
function beginDrag(item, options) {
  ensureDnd();
  const rect = item.getBoundingClientRect();
  const list = options.mode === "sort" ? item.parentElement : null;
  session2 = {
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
    lastY: options.y
  };
  item.classList.add("v-dragging");
  item.setAttribute("aria-grabbed", "true");
  if (!options.keyboard) {
    session2.ghost = createGhost(item, rect);
    moveGhost(options.x, options.y);
    startScrollLoop();
  } else {
    item.classList.add("v-grabbed");
  }
  highlightTargets(session2, true);
  document.addEventListener("keydown", onDragKeyDown, true);
  dispatch2(item, "voodoo:drag-start", { item, data: options.data, group: options.group });
}
function updateDrag(x, y) {
  if (!session2) return;
  session2.lastX = x;
  session2.lastY = y;
  moveGhost(x, y);
  const under = document.elementFromPoint(x, y);
  const list = under?.closest(".v-sortable") ?? null;
  const drop = under?.closest(".v-droppable") ?? null;
  if (session2.mode === "sort" && list && listAccepts(list, session2)) {
    if (session2.overList && session2.overList !== list) {
      session2.overList.classList.remove("v-drop-over");
    }
    session2.overList = list;
    list.classList.add("v-drop-over");
    placeInList(list, session2.item, x, y);
  } else if (session2.overList && !list) {
    session2.overList.classList.remove("v-drop-over");
  }
  const info = drop ? droppableRegistry.get(drop) : void 0;
  const valid = info ? dropAccepts(info, session2) : false;
  if (session2.overDrop && session2.overDrop !== drop) {
    session2.overDrop.classList.remove("v-drop-over");
    session2.overDrop = null;
  }
  if (drop && valid) {
    drop.classList.add("v-drop-over");
    session2.overDrop = drop;
  }
  session2.ghost?.classList.toggle("v-drag-invalid", !!drop && !valid);
}
function restorePosition(current2) {
  if (!current2.startParent) return;
  if (current2.startNext && current2.startNext.parentNode === current2.startParent) {
    current2.startParent.insertBefore(current2.item, current2.startNext);
  } else {
    current2.startParent.appendChild(current2.item);
  }
}
function teardown(current2) {
  current2.ghost?.remove();
  current2.item.classList.remove("v-dragging", "v-grabbed");
  current2.item.setAttribute("aria-grabbed", "false");
  current2.overDrop?.classList.remove("v-drop-over");
  current2.overList?.classList.remove("v-drop-over");
  highlightTargets(current2, false);
  stopScrollLoop();
  document.removeEventListener("keydown", onDragKeyDown, true);
  session2 = null;
}
function finishDrag() {
  const current2 = session2;
  if (!current2) return;
  const list = current2.item.parentElement;
  const newIndex = list ? itemsOf(list).indexOf(current2.item) : -1;
  const drop = current2.overDrop;
  const info = drop ? droppableRegistry.get(drop) : void 0;
  if (current2.mode === "sort" && list && sortableRegistry.has(list)) {
    const moved = list !== current2.startList || newIndex !== current2.startIndex;
    if (moved) {
      const detail = {
        item: current2.item,
        oldIndex: current2.startIndex,
        newIndex,
        from: current2.startList,
        to: list,
        order: orderOf(list)
      };
      dispatch2(list, "voodoo:sorted", detail);
      if (current2.startList && current2.startList !== list) {
        dispatch2(current2.startList, "voodoo:sorted", {
          ...detail,
          order: orderOf(current2.startList)
        });
      }
      announce(`Item movido para a posicao ${newIndex + 1} de ${itemsOf(list).length}`);
    }
  }
  if (drop && info) {
    const detail = {
      item: current2.item,
      data: current2.data,
      from: current2.startList ?? current2.startParent,
      to: drop,
      index: newIndex
    };
    const event = new CustomEvent("voodoo:drop", { detail, bubbles: true });
    drop.dispatchEvent(event);
    callExpression(info.expression, info.scope, drop, event, detail);
    announce("Item solto na area de destino");
  }
  dispatch2(current2.item, "voodoo:drag-end", { item: current2.item, data: current2.data });
  teardown(current2);
}
function cancelDrag() {
  const current2 = session2;
  if (!current2) return;
  restorePosition(current2);
  dispatch2(current2.item, "voodoo:drag-cancel", { item: current2.item });
  announce("Arraste cancelado");
  teardown(current2);
}
function onDragKeyDown(event) {
  if (!session2 || event.key !== "Escape") return;
  event.preventDefault();
  cancelDrag();
}
function installPointerDrag(root, options, cleanup) {
  let candidate = null;
  let pointerId = -1;
  let originX = 0;
  let originY = 0;
  let dragging = false;
  const onPointerMove = (event) => {
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
        y: originY
      });
    }
    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  };
  const stop2 = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    candidate = null;
    pointerId = -1;
    dragging = false;
  };
  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) return;
    if (dragging) finishDrag();
    stop2();
  };
  const onPointerCancel = () => {
    if (dragging) cancelDrag();
    stop2();
  };
  const onPointerDown = (event) => {
    if (event.button !== 0 || session2) return;
    const target = event.target;
    if (!target) return;
    if (target.closest('input,textarea,select,option,[contenteditable="true"]')) return;
    if (options.handle && !target.closest(options.handle)) return;
    const item = options.itemFrom(target);
    if (!item) return;
    candidate = item;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    dragging = false;
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  };
  root.addEventListener("pointerdown", onPointerDown);
  cleanup(() => {
    root.removeEventListener("pointerdown", onPointerDown);
    if (dragging) cancelDrag();
    stop2();
  });
}
function listsInGroup(group) {
  if (!group) return [];
  return Array.from(sortableRegistry.values()).filter((info) => info.group === group).map((info) => info.el).sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
}
function keyboardMove(item, key) {
  if (!session2) return false;
  const list = item.parentElement;
  if (!list) return false;
  const horizontal = isHorizontal(list);
  const forward = key === "ArrowDown" || horizontal && key === "ArrowRight";
  const backward = key === "ArrowUp" || horizontal && key === "ArrowLeft";
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
  if (!horizontal && (key === "ArrowLeft" || key === "ArrowRight")) {
    const lists = listsInGroup(session2.group);
    const position = lists.indexOf(list);
    if (position === -1) return false;
    const next = lists[position + (key === "ArrowRight" ? 1 : -1)];
    if (!next) return false;
    next.appendChild(item);
    announce(`Movido para a lista ${lists.indexOf(next) + 1} de ${lists.length}`);
    item.focus();
    return true;
  }
  return false;
}
function droppableTargets(current2) {
  return Array.from(droppableRegistry.values()).filter((info) => dropAccepts(info, current2)).map((info) => info.el);
}
defineDirective("dnd-group", ({ el, expression }) => {
  ensureDnd();
  const name = expression.trim() || "default";
  el.setAttribute("data-v-dnd-group", name);
  el.classList.add("v-dnd-group");
});
defineDirective("sortable", ({ el, expression, cleanup }) => {
  ensureDnd();
  el.classList.add("v-sortable");
  const handle = readOption(el, "sortable-handle") || expression.trim() || null;
  const info = {
    el,
    group: groupOf(el, readOption(el, "sortable-group")),
    handle
  };
  sortableRegistry.set(el, info);
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Lista reordenavel");
  const prepare = (item) => {
    if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
    if (!item.hasAttribute("aria-grabbed")) item.setAttribute("aria-grabbed", "false");
    if (handle) item.querySelector(handle)?.classList.add("v-drag-handle");
    else item.classList.add("v-drag-handle");
  };
  for (const item of itemsOf(el)) prepare(item);
  const observer2 = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    for (const item of itemsOf(el)) prepare(item);
  });
  observer2?.observe(el, { childList: true });
  installPointerDrag(
    el,
    {
      mode: "sort",
      handle,
      group: () => info.group,
      data: () => null,
      axis: () => null,
      itemFrom: (target) => {
        const item = itemsOf(el).find((child) => child === target || child.contains(target));
        return item ?? null;
      }
    },
    cleanup
  );
  const onKeyDown = (event) => {
    const target = event.target;
    if (!target) return;
    const item = itemsOf(el).find((child) => child === target || child.contains(target));
    if (!item) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (session2 && session2.item === item) {
        finishDrag();
        announce("Item solto");
        return;
      }
      if (session2) return;
      beginDrag(item, {
        mode: "sort",
        data: null,
        group: info.group,
        axis: null,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true
      });
      announce("Item pego. Use as setas para mover e espaco para soltar.");
      return;
    }
    if (!session2 || session2.item !== item) return;
    if (event.key.startsWith("Arrow")) {
      if (keyboardMove(item, event.key)) event.preventDefault();
    }
  };
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("keydown", onKeyDown);
    observer2?.disconnect();
    sortableRegistry.delete(el);
  });
});
defineOption("sortable-group");
defineOption("sortable-handle");
defineDirective("draggable", ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add("v-draggable");
  const handle = readOption(el, "draggable-handle") || null;
  const axisRaw = (readOption(el, "draggable-axis") || "").trim().toLowerCase();
  const axis = axisRaw === "x" || axisRaw === "y" ? axisRaw : null;
  const dataExpression = readOption(el, "draggable-data") || expression.trim();
  const group = groupOf(el, readOption(el, "draggable-group"));
  if (handle) el.querySelector(handle)?.classList.add("v-drag-handle");
  else el.classList.add("v-drag-handle");
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  el.setAttribute("aria-grabbed", "false");
  if (!el.hasAttribute("aria-roledescription")) {
    el.setAttribute("aria-roledescription", "item arrastavel");
  }
  const readData = () => dataExpression ? evaluateIn(dataExpression, scope, "v-draggable-data") : null;
  installPointerDrag(
    el,
    {
      mode: "free",
      handle,
      group: () => group,
      data: readData,
      axis: () => axis,
      itemFrom: () => el
    },
    cleanup
  );
  let targets = [];
  let cursor = 0;
  const highlight = () => {
    targets.forEach((target, index) => target.classList.toggle("v-drop-over", index === cursor));
    const active = targets[cursor];
    if (!active || !session2) return;
    session2.overDrop = active;
    if (!device.reducedMotion) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else active.scrollIntoView({ block: "nearest" });
    announce(active.getAttribute("aria-label") || `Destino ${cursor + 1} de ${targets.length}`);
  };
  const onKeyDown = (event) => {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (session2 && session2.item === el) {
        finishDrag();
        targets = [];
        return;
      }
      if (session2) return;
      beginDrag(el, {
        mode: "free",
        data: readData(),
        group,
        axis,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true
      });
      targets = session2 ? droppableTargets(session2) : [];
      cursor = 0;
      if (targets.length) highlight();
      else announce("Nenhum destino disponivel");
      return;
    }
    if (!session2 || session2.item !== el || !targets.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      cursor = (cursor + 1) % targets.length;
      highlight();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      cursor = (cursor - 1 + targets.length) % targets.length;
      highlight();
    }
  };
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("keydown", onKeyDown);
    for (const target of targets) target.classList.remove("v-drop-over");
  });
});
defineOption("draggable-handle");
defineOption("draggable-axis");
defineOption("draggable-data");
defineOption("draggable-group");
defineDirective("droppable", ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add("v-droppable");
  const info = {
    el,
    group: groupOf(el, readOption(el, "droppable-group")),
    accept: readOption(el, "droppable-accept"),
    expression,
    scope
  };
  droppableRegistry.set(el, info);
  if (!el.hasAttribute("aria-dropeffect")) el.setAttribute("aria-dropeffect", "move");
  cleanup(() => {
    droppableRegistry.delete(el);
    el.classList.remove("v-drop-over", "v-drop-active");
  });
});
defineOption("droppable-accept");
defineOption("droppable-group");

// src/directives/ui.ts
var UI_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v-focus-ring:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px;
  border-radius:var(--v-radius-sm,8px)}
.v-scroll-lock{overflow:hidden !important}

.v-tooltip,.v-popover{position:fixed;z-index:var(--v-z-tooltip,1200);opacity:0;
  transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-tooltip{max-width:min(280px,80vw);padding:6px 10px;border-radius:var(--v-radius-sm,8px);
  background:var(--v-text,#14111F);color:var(--v-surface,#fff);pointer-events:none;
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,sans-serif);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}
.v-tooltip[data-placement="top"]{transform:translateY(4px)}
.v-tooltip[data-placement="bottom"]{transform:translateY(-4px)}
.v-tooltip[data-placement="left"]{transform:translateX(4px)}
.v-tooltip[data-placement="right"]{transform:translateX(-4px)}
.v-tooltip.v-in,.v-popover.v-in{opacity:1;transform:none}
.v-popover{z-index:var(--v-z-dropdown,900);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));transform:translateY(-4px)}
.v-popover[hidden],.v-dropdown-menu[hidden]{display:none !important}

.v-dropdown-menu{position:fixed;z-index:var(--v-z-dropdown,900);min-width:180px;padding:6px;margin:0;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  opacity:0;transform:translateY(-4px);transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-dropdown-menu.v-in{opacity:1;transform:none}
.v-dropdown-menu [role="menuitem"]{display:block;width:100%;text-align:left;background:none;border:0;
  padding:8px 10px;border-radius:var(--v-radius-sm,8px);color:inherit;cursor:pointer;
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif);text-decoration:none}
.v-dropdown-menu [role="menuitem"]:hover,.v-dropdown-menu [role="menuitem"]:focus-visible{
  background:var(--v-surface-2,#FBF7F2);outline:none;color:var(--v-primary,#6D3BF5)}

.v-tab{cursor:pointer}
[role="tabpanel"][hidden]{display:none !important}

.v-accordion-header{display:flex;align-items:center;justify-content:space-between;gap:12px;
  width:100%;cursor:pointer;text-align:left}
.v-accordion-header::after{content:"";flex:none;width:8px;height:8px;border-right:2px solid currentColor;
  border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px);
  transition:transform .2s var(--v-ease,ease);opacity:.6}
.v-accordion-header[aria-expanded="true"]::after{transform:rotate(-135deg) translateY(-2px)}

.v-drawer-backdrop{position:fixed;inset:0;background:rgba(20,17,31,.45);opacity:0;
  z-index:var(--v-z-drawer,1000);transition:opacity .24s var(--v-ease,ease)}
.v-drawer-backdrop.v-in{opacity:1}
.v-drawer-panel{position:fixed;display:flex;flex-direction:column;overflow:auto;
  z-index:calc(var(--v-z-drawer,1000) + 1);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  transition:transform .28s var(--v-ease,ease)}
.v-drawer-panel[hidden]{display:none !important}
.v-drawer-panel[data-side="left"]{top:0;left:0;height:100%;width:min(360px,86vw);transform:translateX(-100%)}
.v-drawer-panel[data-side="right"]{top:0;right:0;height:100%;width:min(360px,86vw);transform:translateX(100%)}
.v-drawer-panel[data-side="top"]{top:0;left:0;width:100%;max-height:86vh;transform:translateY(-100%)}
.v-drawer-panel[data-side="bottom"]{bottom:0;left:0;width:100%;max-height:86vh;transform:translateY(100%)}
.v-drawer-panel.v-open{transform:none}

.v-skeleton{position:relative;min-height:1em;border-radius:var(--v-radius-sm,8px);color:transparent !important;
  background:linear-gradient(90deg,var(--v-surface-2,#FBF7F2) 25%,var(--v-border,#E6E0F0) 37%,var(--v-surface-2,#FBF7F2) 63%);
  background-size:400% 100%;animation:v-skeleton-wave 1.4s ease infinite}
.v-skeleton>*{visibility:hidden}
@keyframes v-skeleton-wave{0%{background-position:100% 50%}100%{background-position:0 50%}}

.v-lazy{opacity:0;transition:opacity .35s var(--v-ease,ease)}
.v-lazy-loaded{opacity:1}
.v-lazy-failed{opacity:1;filter:grayscale(1)}

.v-copied,.v-copy-failed{position:relative}
.v-copied::after,.v-copy-failed::after{content:attr(data-v-copy-label);position:absolute;left:50%;
  bottom:calc(100% + 6px);transform:translateX(-50%);padding:5px 8px;border-radius:6px;white-space:nowrap;
  pointer-events:none;color:#0B1F1A;background:var(--v-success,#2ED9A5);
  font:600 11px/1 var(--v-font-sans,system-ui,sans-serif)}
.v-copy-failed::after{background:var(--v-danger,#FF4D4D);color:#fff}

.v-sticky{position:sticky;top:var(--v-sticky-offset,0px);z-index:5}
.v-stuck{box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}

.v-resizable{position:relative}
.v-resize-handle{position:absolute;background:transparent;touch-action:none;padding:0;border:0}
.v-resize-handle:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:-2px}
.v-resize-handle[data-dir="right"]{top:0;right:-3px;width:8px;height:100%;cursor:ew-resize}
.v-resize-handle[data-dir="bottom"]{left:0;bottom:-3px;height:8px;width:100%;cursor:ns-resize}
.v-resize-handle[data-dir="corner"]{right:-3px;bottom:-3px;width:14px;height:14px;cursor:nwse-resize}

.v-command{position:fixed;inset:0;z-index:var(--v-z-modal,1000);display:flex;justify-content:center;
  align-items:flex-start;padding:12vh 16px 16px;background:rgba(20,17,31,.45)}
.v-command-box{width:min(560px,100%);background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));overflow:hidden}
.v-command-input{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--v-border,#E6E0F0);
  background:transparent;color:var(--v-text,#14111F);outline:none;
  font:500 15px/1.4 var(--v-font-sans,system-ui,sans-serif)}
.v-command-list{list-style:none;margin:0;padding:6px;max-height:min(46vh,340px);overflow:auto}
.v-command-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;
  border-radius:var(--v-radius-sm,8px);cursor:pointer;color:var(--v-text,#14111F);
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif)}
.v-command-option[aria-selected="true"]{background:var(--v-surface-2,#FBF7F2);color:var(--v-primary,#6D3BF5)}
.v-command-hint{color:var(--v-text-muted,#6B6580);font-size:12px}
.v-command-empty{padding:18px;text-align:center;color:var(--v-text-muted,#6B6580);
  font:500 14px/1.4 var(--v-font-sans,system-ui,sans-serif)}

@media (prefers-reduced-motion: reduce){
  .v-tooltip,.v-popover,.v-dropdown-menu,.v-drawer-panel,.v-drawer-backdrop,.v-lazy,.v-accordion-header::after{
    transition-duration:.01ms !important}
  .v-skeleton{animation-duration:.01ms !important}
}
`;
function ensureUi() {
  ensureTokens();
  injectStyle("ui", UI_CSS);
}
function resolveTarget(el, expression) {
  const text = expression.trim();
  if (text) {
    try {
      const found = document.querySelector(text);
      if (found) return found;
    } catch {
    }
  }
  return el.nextElementSibling ?? null;
}
function ensureId(el, prefix) {
  if (!el.id) el.id = uid(`${prefix}-`);
  return el.id;
}
var FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,object,embed,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function focusableIn(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0
  );
}
function trapTab(root, event) {
  const items = focusableIn(root);
  if (!items.length) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
function makeInteractive(el, cleanup) {
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SUMMARY") {
    el.classList.add("v-focus-ring");
    return;
  }
  if (!el.hasAttribute("role")) el.setAttribute("role", "button");
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  el.classList.add("v-focus-ring");
  const onKey = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    el.click();
  };
  el.addEventListener("keydown", onKey);
  cleanup(() => el.removeEventListener("keydown", onKey));
}
var scrollLocks = 0;
var savedPaddingRight = "";
function lockScroll() {
  if (scrollLocks++ > 0) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  savedPaddingRight = document.body.style.paddingRight;
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  document.body.classList.add("v-scroll-lock");
}
function unlockScroll() {
  if (scrollLocks === 0) return;
  if (--scrollLocks > 0) return;
  document.body.classList.remove("v-scroll-lock");
  document.body.style.paddingRight = savedPaddingRight;
}
function isHidden(el) {
  if (el.hasAttribute("hidden")) return true;
  if (el.style.display === "none") return true;
  return el.isConnected ? getComputedStyle(el).display === "none" : false;
}
function showElement2(el, animated = true) {
  el.removeAttribute("hidden");
  if (animated && !device.reducedMotion) {
    void fadeIn(el);
    return;
  }
  el.style.removeProperty("display");
  if (getComputedStyle(el).display === "none") el.style.display = "block";
}
function hideElement2(el, animated = true) {
  if (animated && !device.reducedMotion) {
    void fadeOut(el);
    return;
  }
  el.style.display = "none";
}
var OPPOSITE = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};
function parsePlacement(value, fallback) {
  const text = (value || "").trim().toLowerCase();
  if (text === "top" || text === "bottom" || text === "left" || text === "right") return text;
  return fallback;
}
function placeFloating(anchor, floating, preferred, align = "center", gap = 8) {
  floating.style.position = "fixed";
  floating.style.left = "0px";
  floating.style.top = "0px";
  const a = anchor.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const room = {
    top: a.top,
    bottom: vh - a.bottom,
    left: a.left,
    right: vw - a.right
  };
  const need = {
    top: f.height + gap,
    bottom: f.height + gap,
    left: f.width + gap,
    right: f.width + gap
  };
  let side = preferred;
  if (room[side] < need[side]) {
    const other = OPPOSITE[side];
    if (room[other] >= need[other]) {
      side = other;
    } else {
      for (const key of Object.keys(room)) {
        if (room[key] - need[key] > room[side] - need[side]) side = key;
      }
    }
  }
  let top2 = 0;
  let left = 0;
  if (side === "top" || side === "bottom") {
    top2 = side === "top" ? a.top - f.height - gap : a.bottom + gap;
    left = align === "start" ? a.left : a.left + a.width / 2 - f.width / 2;
    if (align === "start" && left + f.width > vw - gap) left = a.right - f.width;
  } else {
    left = side === "left" ? a.left - f.width - gap : a.right + gap;
    top2 = align === "start" ? a.top : a.top + a.height / 2 - f.height / 2;
  }
  left = Math.min(Math.max(gap, left), Math.max(gap, vw - f.width - gap));
  top2 = Math.min(Math.max(gap, top2), Math.max(gap, vh - f.height - gap));
  floating.style.left = `${Math.round(left)}px`;
  floating.style.top = `${Math.round(top2)}px`;
  floating.setAttribute("data-placement", side);
  return side;
}
var hotkeyEntries = [];
var hotkeyListening = false;
var KEY_NAMES = {
  esc: "escape",
  space: " ",
  spacebar: " ",
  enter: "enter",
  ret: "enter",
  del: "delete",
  ins: "insert",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  plus: "+",
  minus: "-",
  comma: ",",
  period: ".",
  slash: "/",
  question: "?"
};
var IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
function parseCombo(text) {
  const parts = text.trim().toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const combo = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
    hasModifier: false
  };
  for (const part of parts) {
    if (part === "ctrl" || part === "control") combo.ctrl = true;
    else if (part === "shift") combo.shift = true;
    else if (part === "alt" || part === "option") combo.alt = true;
    else if (part === "meta" || part === "cmd" || part === "command" || part === "super") combo.meta = true;
    else if (part === "mod") {
      if (IS_APPLE) combo.meta = true;
      else combo.ctrl = true;
    } else {
      combo.key = KEY_NAMES[part] ?? part;
    }
  }
  if (!combo.key) return null;
  combo.hasModifier = combo.ctrl || combo.alt || combo.meta;
  return combo;
}
function comboMatches(combo, event) {
  if (combo.ctrl !== event.ctrlKey) return false;
  if (combo.alt !== event.altKey) return false;
  if (combo.meta !== event.metaKey) return false;
  if (event.key.toLowerCase() !== combo.key) return false;
  const shiftImplied = combo.key.length === 1 && !/^[a-z0-9 ]$/.test(combo.key);
  if (shiftImplied) return combo.shift ? event.shiftKey : true;
  return combo.shift === event.shiftKey;
}
function isTypingTarget(target) {
  const el = target;
  if (!el || typeof el.tagName !== "string") return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.isContentEditable === true;
}
function ariaShortcut(combo) {
  const parts = [];
  if (combo.ctrl) parts.push("Control");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Meta");
  parts.push(combo.key === " " ? "Space" : combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join("+");
}
function onGlobalKeyDown(event) {
  if (event.defaultPrevented) return;
  const typing = isTypingTarget(event.target);
  for (const entry of [...hotkeyEntries]) {
    for (const combo of entry.combos) {
      if (!comboMatches(combo, event)) continue;
      if (typing && !entry.options.allowInInput && !combo.hasModifier) continue;
      if (entry.options.preventDefault !== false) event.preventDefault();
      entry.handler(event);
      break;
    }
  }
}
function hotkey(combo, handler, options = {}) {
  const combos = combo.split(",").map((part) => parseCombo(part)).filter((parsed) => parsed !== null);
  if (!combos.length || typeof document === "undefined") return () => void 0;
  const entry = { combos, handler, options };
  hotkeyEntries.push(entry);
  if (!hotkeyListening) {
    hotkeyListening = true;
    document.addEventListener("keydown", onGlobalKeyDown);
  }
  return () => {
    const index = hotkeyEntries.indexOf(entry);
    if (index > -1) hotkeyEntries.splice(index, 1);
  };
}
defineDirective("toggle", ({ el, expression, modifiers, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;
  const className = typeof modifiers.class === "string" ? modifiers.class : null;
  const animated = !modifiers.instant;
  el.setAttribute("aria-controls", ensureId(target, "v-toggle"));
  makeInteractive(el, cleanup);
  let aberto = className ? target.classList.contains(className) : !isHidden(target);
  const sync = () => {
    el.setAttribute("aria-expanded", String(aberto));
  };
  const onClick = (event) => {
    event.preventDefault();
    if (className) {
      target.classList.toggle(className);
      aberto = target.classList.contains(className);
    } else if (aberto) {
      hideElement2(target, animated);
      aberto = false;
    } else {
      showElement2(target, animated);
      aberto = true;
    }
    sync();
    dispatch2(el, "voodoo:toggle", { target, open: aberto });
  };
  sync();
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
var Collapse = class {
  constructor(panel) {
    __publicField(this, "panel");
    __publicField(this, "triggers", /* @__PURE__ */ new Set());
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "open");
    __publicField(this, "duration");
    this.panel = panel;
    this.duration = parseDuration(readOption(panel, "collapse-duration"), 240);
    const initial = (readOption(panel, "collapse") || "").trim().toLowerCase();
    this.open = initial === "open" || initial === "true" || !isHidden(panel);
    panel.classList.add("v-collapse-panel");
    ensureId(panel, "v-collapse");
    if (!this.open) panel.style.display = "none";
    this.sync();
  }
  /** Atualiza `aria-expanded` dos gatilhos e avisa quem observa. */
  sync() {
    for (const trigger of this.triggers) {
      trigger.setAttribute("aria-expanded", String(this.open));
      trigger.setAttribute("aria-controls", this.panel.id);
    }
    for (const listener of this.listeners) listener(this.open);
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.panel.removeAttribute("hidden");
    if (device.reducedMotion) this.panel.style.removeProperty("display");
    else void slideDown(this.panel, this.duration);
    this.sync();
    dispatch2(this.panel, "voodoo:collapse", { open: true });
  }
  hide() {
    if (!this.open) return;
    this.open = false;
    if (device.reducedMotion) this.panel.style.display = "none";
    else void slideUp(this.panel, this.duration);
    this.sync();
    dispatch2(this.panel, "voodoo:collapse", { open: false });
  }
  toggle() {
    if (this.open) this.hide();
    else this.show();
  }
};
var collapses = /* @__PURE__ */ new WeakMap();
function collapseOf(panel) {
  let controller = collapses.get(panel);
  if (!controller) collapses.set(panel, controller = new Collapse(panel));
  return controller;
}
defineDirective("collapse", ({ el }) => {
  ensureUi();
  collapseOf(el);
});
defineDirective("collapse-toggle", ({ el, expression, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;
  const controller = collapseOf(target);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    controller.triggers.delete(el);
  });
});
defineOption("collapse-duration");
var Popup = class {
  constructor(trigger, panel, kind) {
    __publicField(this, "trigger");
    __publicField(this, "panel");
    __publicField(this, "kind");
    __publicField(this, "placement");
    __publicField(this, "open", false);
    __publicField(this, "lastFocus", null);
    /** Lugar original do painel, para devolver quando a directive e desmontada. */
    __publicField(this, "homeParent");
    __publicField(this, "homeNext");
    __publicField(this, "reposition", () => {
      if (!this.open) return;
      placeFloating(this.trigger, this.panel, this.placement, this.kind === "menu" ? "start" : "center");
    });
    __publicField(this, "onDocumentPointerDown", (event) => {
      const target = event.target;
      if (!target) return;
      if (this.panel.contains(target) || this.trigger.contains(target)) return;
      this.hide();
    });
    __publicField(this, "onKeyDown", (event) => {
      if (!this.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.hide(true);
        return;
      }
      if (this.kind !== "menu") {
        if (event.key === "Tab") trapTab(this.panel, event);
        return;
      }
      const items = this.items();
      if (!items.length) return;
      const current2 = items.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = (current2 + step + items.length) % items.length;
        items[current2 === -1 && step === -1 ? items.length - 1 : next].focus();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        items[0].focus();
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1].focus();
        return;
      }
      if (event.key === "Tab") this.hide();
    });
    this.trigger = trigger;
    this.panel = panel;
    this.kind = kind;
    this.homeParent = panel.parentElement;
    this.homeNext = panel.nextSibling;
    this.placement = parsePlacement(
      readOption(trigger, kind === "menu" ? "dropdown-position" : "popover-position"),
      "bottom"
    );
    ensureId(panel, kind === "menu" ? "v-menu" : "v-popover");
    panel.classList.add(kind === "menu" ? "v-dropdown-menu" : "v-popover");
    panel.hidden = true;
    if (kind === "menu") prepareMenu(panel);
    else panel.setAttribute("role", "dialog");
    trigger.setAttribute("aria-haspopup", kind === "menu" ? "menu" : "dialog");
    trigger.setAttribute("aria-controls", panel.id);
    trigger.setAttribute("aria-expanded", "false");
  }
  /** Itens navegaveis pelas setas, apenas no modo menu. */
  items() {
    return Array.from(this.panel.querySelectorAll('[role="menuitem"]'));
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement;
    if (this.panel.parentElement !== document.body) document.body.appendChild(this.panel);
    this.panel.hidden = false;
    this.reposition();
    requestAnimationFrame(() => this.panel.classList.add("v-in"));
    this.trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("resize", this.reposition);
    window.addEventListener("scroll", this.reposition, true);
    if (this.kind === "dialog") focusableIn(this.panel)[0]?.focus();
    dispatch2(this.trigger, "voodoo:popup", { open: true, panel: this.panel });
  }
  hide(restoreFocus = false) {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove("v-in");
    this.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("resize", this.reposition);
    window.removeEventListener("scroll", this.reposition, true);
    const finish = () => {
      if (!this.open) this.panel.hidden = true;
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 160);
    if (restoreFocus) (this.lastFocus ?? this.trigger).focus();
    dispatch2(this.trigger, "voodoo:popup", { open: false, panel: this.panel });
  }
  toggle() {
    if (this.open) this.hide(true);
    else this.show();
  }
  /** Remove listeners e devolve o painel para onde ele estava. */
  dispose() {
    this.hide();
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("resize", this.reposition);
    window.removeEventListener("scroll", this.reposition, true);
    if (!this.homeParent || this.panel.parentElement === this.homeParent) return;
    if (this.homeNext && this.homeNext.parentNode === this.homeParent) {
      this.homeParent.insertBefore(this.panel, this.homeNext);
    } else {
      this.homeParent.appendChild(this.panel);
    }
  }
};
function prepareMenu(menu) {
  ensureUi();
  menu.classList.add("v-dropdown-menu");
  if (!menu.hasAttribute("role")) menu.setAttribute("role", "menu");
  for (const item of Array.from(menu.children)) {
    const child = item;
    if (child.hasAttribute("role")) continue;
    if (child.matches("a,button,[tabindex]")) {
      child.setAttribute("role", "menuitem");
      child.setAttribute("tabindex", "-1");
    }
  }
}
defineDirective("dropdown-menu", ({ el }) => {
  prepareMenu(el);
});
defineDirective("dropdown", ({ el, expression, cleanup }) => {
  ensureUi();
  const menu = resolveTarget(el, expression);
  if (!menu) return;
  const popup = new Popup(el, menu, "menu");
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    popup.toggle();
  };
  const onTriggerKey = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!popup.open) popup.show();
    const items = popup.items();
    if (items.length) items[event.key === "ArrowDown" ? 0 : items.length - 1].focus();
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onTriggerKey);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onTriggerKey);
    popup.dispose();
  });
});
defineDirective("popover", ({ el, expression, cleanup }) => {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;
  const popup = new Popup(el, panel, "dialog");
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    popup.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    popup.dispose();
  });
});
defineOption("dropdown-position");
defineOption("popover-position");
defineDirective("tooltip", ({ el, expression, cleanup }) => {
  ensureUi();
  const text = expression.trim();
  if (!text) return;
  const placement = parsePlacement(readOption(el, "tooltip-position"), "top");
  const delay = parseDuration(readOption(el, "tooltip-delay"), 200);
  let bubble = null;
  let timer = null;
  const build = () => {
    const node = document.createElement("div");
    node.className = "v-tooltip";
    node.setAttribute("role", "tooltip");
    node.id = uid("v-tip-");
    node.textContent = text;
    document.body.appendChild(node);
    return node;
  };
  const reposition = () => {
    if (bubble) placeFloating(el, bubble, placement);
  };
  const open = () => {
    if (bubble) return;
    bubble = build();
    el.setAttribute("aria-describedby", bubble.id);
    reposition();
    requestAnimationFrame(() => bubble?.classList.add("v-in"));
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
  };
  const close = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!bubble) return;
    const node = bubble;
    bubble = null;
    el.removeAttribute("aria-describedby");
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    node.classList.remove("v-in");
    if (device.reducedMotion) node.remove();
    else setTimeout(() => node.remove(), 160);
  };
  const schedule = () => {
    if (timer || bubble) return;
    timer = setTimeout(() => {
      timer = null;
      open();
    }, delay);
  };
  const onEscape = (event) => {
    if (event.key === "Escape") close();
  };
  el.addEventListener("mouseenter", schedule);
  el.addEventListener("focusin", open);
  el.addEventListener("mouseleave", close);
  el.addEventListener("focusout", close);
  el.addEventListener("keydown", onEscape);
  cleanup(() => {
    close();
    el.removeEventListener("mouseenter", schedule);
    el.removeEventListener("focusin", open);
    el.removeEventListener("mouseleave", close);
    el.removeEventListener("focusout", close);
    el.removeEventListener("keydown", onEscape);
  });
});
defineOption("tooltip-position");
defineOption("tooltip-delay");
defineDirective("tabs", ({ el, expression, cleanup }) => {
  ensureUi();
  const tabs = ownedByDirective(el, "tab", "tabs");
  const panels = ownedByDirective(el, "tab-panel", "tabs");
  if (!tabs.length) return;
  const idOf = (tab, index) => attrOf(tab, "tab") || String(index);
  const list = tabs[0].parentElement;
  if (list && !list.hasAttribute("role")) list.setAttribute("role", "tablist");
  const urlKey = hasAttrOf(el, "tabs-url") ? attrOf(el, "tabs-url") || "tab" : null;
  tabs.forEach((tab, index) => {
    const id = idOf(tab, index);
    const panel = panels.find((item) => attrOf(item, "tab-panel") === id);
    tab.classList.add("v-tab", "v-focus-ring");
    tab.setAttribute("role", "tab");
    ensureId(tab, "v-tab");
    if (panel) {
      ensureId(panel, "v-panel");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      tab.setAttribute("aria-controls", panel.id);
    }
  });
  let activeId = "";
  const activate = (id, focusTab = false) => {
    if (!tabs.some((tab, index) => idOf(tab, index) === id)) return;
    activeId = id;
    tabs.forEach((tab, index) => {
      const selected = idOf(tab, index) === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      tab.classList.toggle("v-active", selected);
      if (selected && focusTab) tab.focus();
    });
    for (const panel of panels) {
      panel.hidden = attrOf(panel, "tab-panel") !== id;
    }
    if (urlKey) url.set(urlKey, id);
    dispatch2(el, "voodoo:tab", { id });
  };
  const onClick = (event) => {
    const tab = closestDirective(event.target, "tab");
    if (!tab || !tabs.includes(tab)) return;
    event.preventDefault();
    activate(idOf(tab, tabs.indexOf(tab)));
  };
  const onKeyDown = (event) => {
    const tab = closestDirective(event.target, "tab");
    if (!tab || !tabs.includes(tab)) return;
    const current2 = tabs.indexOf(tab);
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current2 + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current2 - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    activate(idOf(tabs[next], next), true);
  };
  const onPopState = () => {
    if (!urlKey) return;
    const wanted = url.get(urlKey);
    if (wanted && wanted !== activeId) activate(wanted);
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPopState);
  });
  const fromUrl = urlKey ? url.get(urlKey) : void 0;
  const initial = fromUrl || expression.trim() || idOf(tabs[0], 0);
  activate(initial);
  if (!activeId) activate(idOf(tabs[0], 0));
});
defineOption("tab");
defineOption("tab-panel");
defineOption("tabs-url");
defineDirective("accordion", ({ el, cleanup }) => {
  ensureUi();
  const items = ownedByDirective(el, "accordion-item", "accordion");
  if (!items.length) return;
  const single = hasAttrOf(el, "accordion-single");
  const headers = [];
  const controllers2 = [];
  for (const item of items) {
    const header = item.firstElementChild;
    const panel = item.lastElementChild;
    if (!header || !panel || header === panel) continue;
    const state = (attrOf(item, "accordion-item") || "").trim().toLowerCase();
    if (state !== "open" && state !== "true") panel.style.display = "none";
    const controller = collapseOf(panel);
    controller.triggers.add(header);
    controller.sync();
    header.classList.add("v-accordion-header", "v-focus-ring");
    if (!header.hasAttribute("role")) header.setAttribute("role", "button");
    if (!header.hasAttribute("tabindex")) header.setAttribute("tabindex", "0");
    headers.push(header);
    controllers2.push(controller);
  }
  const onClick = (event) => {
    const header = event.target?.closest(".v-accordion-header");
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;
    event.preventDefault();
    const controller = controllers2[index];
    if (single && !controller.open) {
      for (const other of controllers2) if (other !== controller) other.hide();
    }
    controller.toggle();
  };
  const onKeyDown = (event) => {
    const header = event.target?.closest(".v-accordion-header");
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      header.click();
      return;
    }
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % headers.length;
    else if (event.key === "ArrowUp") next = (index - 1 + headers.length) % headers.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = headers.length - 1;
    if (next === -1) return;
    event.preventDefault();
    headers[next].focus();
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
  });
});
defineOption("accordion-item");
defineOption("accordion-single");
var Drawer = class {
  constructor(panel) {
    /** Marca o lugar de origem do painel enquanto ele fica no corpo do documento. */
    __publicField(this, "origem", null);
    __publicField(this, "panel");
    __publicField(this, "triggers", /* @__PURE__ */ new Set());
    __publicField(this, "open", false);
    __publicField(this, "backdrop", null);
    __publicField(this, "lastFocus", null);
    __publicField(this, "onKeyDown", (event) => {
      if (!this.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.hide();
        return;
      }
      if (event.key === "Tab") trapTab(this.panel, event);
    });
    __publicField(this, "onPointerDown", (event) => {
      const target = event.target;
      if (!target || this.panel.contains(target)) return;
      for (const trigger of this.triggers) if (trigger.contains(target)) return;
      this.hide();
    });
    this.panel = panel;
    const side = (readOption(panel, "drawer-side") || "right").trim().toLowerCase();
    panel.classList.add("v-drawer-panel");
    panel.setAttribute("data-side", ["left", "right", "top", "bottom"].includes(side) ? side : "right");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    ensureId(panel, "v-drawer");
    panel.hidden = true;
  }
  /** Mantem `aria-expanded` dos gatilhos em dia. */
  sync() {
    for (const trigger of this.triggers) {
      trigger.setAttribute("aria-expanded", String(this.open));
      trigger.setAttribute("aria-controls", this.panel.id);
      trigger.setAttribute("aria-haspopup", "dialog");
    }
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement;
    this.backdrop = document.createElement("div");
    this.backdrop.className = "v-drawer-backdrop";
    this.backdrop.addEventListener("click", () => this.hide());
    document.body.appendChild(this.backdrop);
    if (this.panel.parentElement !== document.body) {
      this.origem = document.createComment(" v-drawer ");
      this.panel.parentNode?.insertBefore(this.origem, this.panel);
      document.body.appendChild(this.panel);
    }
    this.panel.hidden = false;
    lockScroll();
    requestAnimationFrame(() => {
      this.backdrop?.classList.add("v-in");
      this.panel.classList.add("v-open");
    });
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("pointerdown", this.onPointerDown, true);
    (focusableIn(this.panel)[0] ?? this.panel).focus();
    this.sync();
    dispatch2(this.panel, "voodoo:drawer", { open: true });
  }
  hide() {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove("v-open");
    this.backdrop?.classList.remove("v-in");
    document.removeEventListener("keydown", this.onKeyDown, true);
    document.removeEventListener("pointerdown", this.onPointerDown, true);
    const finish = () => {
      if (this.open) return;
      this.panel.hidden = true;
      this.backdrop?.remove();
      this.backdrop = null;
      if (this.origem && this.origem.parentNode) {
        this.origem.parentNode.insertBefore(this.panel, this.origem);
        this.origem.remove();
        this.origem = null;
      }
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 300);
    unlockScroll();
    this.lastFocus?.focus();
    this.sync();
    dispatch2(this.panel, "voodoo:drawer", { open: false });
  }
  toggle() {
    if (this.open) this.hide();
    else this.show();
  }
};
var drawers = /* @__PURE__ */ new WeakMap();
function drawerOf(panel) {
  let controller = drawers.get(panel);
  if (!controller) drawers.set(panel, controller = new Drawer(panel));
  return controller;
}
defineDirective("drawer-content", ({ el }) => {
  ensureUi();
  drawerOf(el);
});
function setupDrawerTrigger(el, expression, cleanup) {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;
  const controller = drawerOf(panel);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    controller.triggers.delete(el);
  });
}
defineDirective("drawer", ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});
defineDirective("offcanvas", ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});
defineDirective("drawer-close", ({ el, expression, cleanup }) => {
  const panel = expression.trim() ? resolveTarget(el, expression) : el.closest(".v-drawer-panel") ?? closestDirective(el, "drawer-content");
  if (!panel) return;
  makeInteractive(el, cleanup);
  if (!el.hasAttribute("aria-label") && !el.textContent?.trim()) {
    el.setAttribute("aria-label", "Fechar");
  }
  const onClick = (event) => {
    event.preventDefault();
    drawerOf(panel).hide();
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("drawer-side");
defineDirective("theme-toggle", ({ el, cleanup }) => {
  makeInteractive(el, cleanup);
  const sync = () => {
    const dark = theme.resolved === "dark";
    el.setAttribute("aria-pressed", String(dark));
    el.dataset.vTheme = theme.resolved;
    if (!el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", dark ? "Mudar para tema claro" : "Mudar para tema escuro");
    }
  };
  const onClick = (event) => {
    event.preventDefault();
    theme.toggle();
    sync();
  };
  const onThemeChange = () => sync();
  sync();
  el.addEventListener("click", onClick);
  document.addEventListener("voodoo:theme", onThemeChange);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    document.removeEventListener("voodoo:theme", onThemeChange);
  });
});
defineDirective(
  "focus",
  ({ el, expression, modifiers, effect: effect2, evaluate: evaluate2 }) => {
    const apply = () => {
      el.focus({ preventScroll: !!modifiers.quiet });
      const field = el;
      if (modifiers.select && typeof field.select === "function") field.select();
    };
    if (!expression.trim()) {
      queuePostFlush(apply);
      return;
    }
    effect2(() => {
      if (evaluate2()) queuePostFlush(apply);
    });
  },
  { priority: PRIORITY.INIT }
);
defineDirective("focus-trap", ({ el, expression, effect: effect2, evaluate: evaluate2, cleanup }) => {
  let active = !expression.trim();
  const onKeyDown = (event) => {
    if (!active || event.key !== "Tab") return;
    if (!el.isConnected) return;
    trapTab(el, event);
  };
  if (expression.trim()) {
    effect2(() => {
      const next = !!evaluate2();
      if (next && !active) queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
      active = next;
    });
  } else {
    queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
  }
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  document.addEventListener("keydown", onKeyDown, true);
  cleanup(() => document.removeEventListener("keydown", onKeyDown, true));
});
defineDirective("click-outside", ({ el, expression, scope, cleanup }) => {
  const onPointerDown = (event) => {
    if (!el.isConnected) return;
    const target = event.target;
    if (!target || el === target || el.contains(target)) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  cleanup(() => document.removeEventListener("pointerdown", onPointerDown, true));
});
defineDirective("escape", ({ el, expression, scope, cleanup }) => {
  const onKeyDown = (event) => {
    if (event.key !== "Escape" || !el.isConnected) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener("keydown", onKeyDown);
  cleanup(() => document.removeEventListener("keydown", onKeyDown));
});
defineDirective("hotkey", ({ el, expression, modifiers, cleanup }) => {
  const combo = expression.trim();
  if (!combo) return;
  const off2 = hotkey(combo, () => el.click(), {
    allowInInput: !!modifiers.force,
    preventDefault: modifiers.default !== true
  });
  const parsed = parseCombo(combo.split(",")[0]);
  if (parsed && !el.hasAttribute("aria-keyshortcuts")) {
    el.setAttribute("aria-keyshortcuts", ariaShortcut(parsed));
  }
  cleanup(off2);
});
defineDirective("scroll-to", ({ el, expression, cleanup }) => {
  const onClick = (event) => {
    const selector = expression.trim() || el.getAttribute("href") || "";
    if (!selector) return;
    event.preventDefault();
    const offset = parseFloat(readOption(el, "scroll-offset") || "0") || 0;
    const behavior = device.reducedMotion ? "auto" : "smooth";
    if (selector === "top" || selector === "#top") {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    if (selector === "bottom") {
      window.scrollTo({ top: document.body.scrollHeight, behavior });
      return;
    }
    let target = null;
    try {
      target = document.querySelector(selector);
    } catch {
      target = null;
    }
    if (!target) return;
    const top2 = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top2, behavior });
    const focusTarget = target;
    if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("scrollspy", ({ el, cleanup }) => {
  const links = Array.from(el.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;
  const activeClass = readOption(el, "scrollspy-class") || "v-active";
  const offset = parseFloat(readOption(el, "scroll-offset") || "0") || 0;
  const sections = links.map((link) => {
    const id = link.getAttribute("href") || "";
    const section = id.length > 1 ? document.querySelector(id) : null;
    return section ? { link, section } : null;
  }).filter((pair) => pair !== null);
  if (!sections.length) return;
  let current2 = null;
  const update = () => {
    let found = sections[0];
    for (const pair of sections) {
      if (pair.section.getBoundingClientRect().top - offset <= 8) found = pair;
    }
    if (found.link === current2) return;
    current2 = found.link;
    for (const pair of sections) {
      const active = pair.link === current2;
      pair.link.classList.toggle(activeClass, active);
      if (active) pair.link.setAttribute("aria-current", "true");
      else pair.link.removeAttribute("aria-current");
    }
    dispatch2(el, "voodoo:scrollspy", { id: found.section.id, link: found.link });
  };
  const onScroll = throttle(update, 100);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  queuePostFlush(update);
  cleanup(() => {
    onScroll.cancel();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  });
});
defineOption("scroll-offset");
defineOption("scrollspy-class");
defineDirective("sticky", ({ el, expression, cleanup }) => {
  ensureUi();
  const offset = parseFloat(expression.trim() || readOption(el, "sticky-offset") || "0") || 0;
  el.classList.add("v-sticky");
  el.style.setProperty("--v-sticky-offset", `${offset}px`);
  if (typeof IntersectionObserver === "undefined") return;
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const stuck = entry.intersectionRatio < 1 && entry.boundingClientRect.top <= offset + 1;
        el.classList.toggle("v-stuck", stuck);
      }
    },
    { threshold: [1], rootMargin: `-${offset + 1}px 0px 0px 0px` }
  );
  observer2.observe(el);
  cleanup(() => observer2.disconnect());
});
defineOption("sticky-offset");
defineDirective("visible", ({ el, expression, scope, modifiers, cleanup }) => {
  const repeat = !!modifiers.repeat;
  const threshold = Number(modifiers.threshold ?? 0.1) || 0.1;
  const margin = typeof modifiers.margin === "string" ? modifiers.margin : "0px";
  if (typeof IntersectionObserver === "undefined") {
    callExpression(expression, scope, el, void 0, { visible: true });
    return;
  }
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callExpression(expression, scope, el, void 0, entry);
        if (!repeat) observer2.unobserve(el);
      }
    },
    { threshold, rootMargin: margin }
  );
  observer2.observe(el);
  cleanup(() => observer2.disconnect());
});
defineDirective("infinite-scroll", ({ el, expression, scope, cleanup }) => {
  const distance = readOption(el, "infinite-distance") || "200px";
  let loading = false;
  const release = () => {
    loading = false;
  };
  const run = () => {
    if (loading) return;
    loading = true;
    el.setAttribute("aria-busy", "true");
    const result = callExpression(expression, scope, el, void 0, { page: "next" });
    const done = () => {
      el.removeAttribute("aria-busy");
      setTimeout(release, 120);
    };
    if (result && typeof result.then === "function") {
      void result.then(done, done);
    } else {
      setTimeout(done, 300);
    }
  };
  if (typeof IntersectionObserver === "undefined") return;
  const sentinel = document.createElement("div");
  sentinel.className = "v-infinite-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "width:100%;height:1px;pointer-events:none";
  el.appendChild(sentinel);
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) run();
    },
    { rootMargin: `0px 0px ${distance} 0px` }
  );
  observer2.observe(sentinel);
  cleanup(() => {
    observer2.disconnect();
    sentinel.remove();
  });
});
defineOption("infinite-distance");
function setupLazy(el, source, cleanup, asBackground) {
  ensureUi();
  if (!source) return;
  el.classList.add("v-lazy");
  const apply = (href) => {
    if (asBackground) el.style.backgroundImage = `url("${href}")`;
    else el.src = href;
    el.classList.add("v-lazy-loaded");
  };
  const load = () => {
    const preload = new Image();
    preload.onload = () => apply(source);
    preload.onerror = () => {
      const fallback = readOption(el, "lazy-error");
      el.classList.add("v-lazy-failed");
      if (fallback) apply(fallback);
      else el.classList.add("v-lazy-loaded");
    };
    preload.src = source;
  };
  if (!asBackground && el.tagName === "IMG") {
    const image = el;
    if (!image.hasAttribute("loading")) image.loading = "lazy";
    if (!image.hasAttribute("decoding")) image.decoding = "async";
  }
  if (typeof IntersectionObserver === "undefined") {
    load();
    return;
  }
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer2.disconnect();
        load();
      }
    },
    { rootMargin: "200px" }
  );
  observer2.observe(el);
  cleanup(() => observer2.disconnect());
}
defineDirective("lazy-src", ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, false);
});
defineDirective("lazy-bg", ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, true);
});
defineOption("lazy-error");
defineDirective("skeleton", ({ el, expression, effect: effect2, evaluate: evaluate2, cleanup }) => {
  ensureUi();
  const apply = (loading) => {
    el.classList.toggle("v-skeleton", loading);
    if (loading) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
  };
  if (expression.trim()) {
    effect2(() => apply(!!evaluate2()));
    return;
  }
  const hasContent = () => (el.textContent ?? "").trim().length > 0 || el.querySelector("img,svg,video,canvas") !== null;
  if (hasContent()) {
    apply(false);
    return;
  }
  apply(true);
  if (typeof MutationObserver === "undefined") return;
  const observer2 = new MutationObserver(() => {
    if (!hasContent()) return;
    apply(false);
    observer2.disconnect();
  });
  observer2.observe(el, { childList: true, subtree: true, characterData: true });
  cleanup(() => observer2.disconnect());
});
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
function flashCopied(el, ok) {
  ensureUi();
  const label = readOption(el, "copy-label") || (ok ? "Copiado!" : "Nao foi possivel copiar");
  el.dataset.vCopyLabel = label;
  el.classList.add(ok ? "v-copied" : "v-copy-failed");
  announce(label);
  setTimeout(() => el.classList.remove("v-copied", "v-copy-failed"), 1600);
}
function copySource(el, expression) {
  const from = readOption(el, "copy-from");
  if (from) {
    const source = document.querySelector(from);
    if (source) {
      const field = source;
      if (typeof field.value === "string" && field.value) return field.value;
      return (source.textContent ?? "").trim();
    }
  }
  return expression.trim();
}
defineDirective("copy", ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const text = copySource(el, expression);
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:copy", { text, ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("copy-from", ({ el, expression, cleanup }) => {
  ensureUi();
  storeOption(el, "copy-from", expression);
  if (hasAttrOf(el, "copy")) return;
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const text = copySource(el, "");
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:copy", { text, ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("copy-label");
function printElement(target, title) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Impressao");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map((node) => node.outerHTML).join("\n");
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}</head><body>${target.outerHTML}</body></html>`;
  frame.addEventListener("load", () => {
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1e3);
  });
  document.body.appendChild(frame);
}
defineDirective("print", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const selector = expression.trim();
    const target = selector ? document.querySelector(selector) : null;
    if (!selector) {
      window.print();
      return;
    }
    if (target) printElement(target, document.title);
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("share", ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const link = expression.trim() || readOption(el, "share-url") || location.href;
    const data2 = {
      title: readOption(el, "share-title") || document.title,
      url: link
    };
    const text = readOption(el, "share-text");
    if (text) data2.text = text;
    const nav = navigator;
    if (typeof nav.share === "function") {
      void nav.share(data2).then(
        () => dispatch2(el, "voodoo:share", { data: data2, method: "native" }),
        () => void 0
      );
      return;
    }
    void copyText(link).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:share", { data: data2, method: "clipboard", ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("share-title");
defineOption("share-url");
defineOption("share-text");
defineDirective("fullscreen", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const target = expression.trim() ? document.querySelector(expression.trim()) ?? el : el;
  const sync = () => {
    el.setAttribute("aria-pressed", String(document.fullscreenElement === target));
  };
  const onClick = (event) => {
    event.preventDefault();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => void 0);
      return;
    }
    const legacy = target;
    if (typeof target.requestFullscreen === "function") {
      void target.requestFullscreen().catch(() => void 0);
    } else {
      legacy.webkitRequestFullscreen?.();
    }
  };
  sync();
  el.addEventListener("click", onClick);
  document.addEventListener("fullscreenchange", sync);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    document.removeEventListener("fullscreenchange", sync);
  });
});
defineDirective("download", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    const href = expression.trim() || el.getAttribute("href") || "";
    if (!href) return;
    event.preventDefault();
    const link = document.createElement("a");
    link.href = href;
    link.rel = "noopener";
    link.download = readOption(el, "download-name") || "";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    dispatch2(el, "voodoo:download", { href, name: link.download });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("download-name");
defineDirective("resizable", ({ el, expression, cleanup }) => {
  ensureUi();
  const mode = (expression.trim() || "both").toLowerCase();
  const horizontal = mode === "both" || mode === "horizontal";
  const vertical = mode === "both" || mode === "vertical";
  el.classList.add("v-resizable");
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  const handles = [];
  const directions = [];
  if (horizontal) directions.push("right");
  if (vertical) directions.push("bottom");
  if (horizontal && vertical) directions.push("corner");
  const startResize = (handle, direction) => {
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    const onMove = (event) => {
      if (direction !== "bottom") el.style.width = `${Math.max(32, startWidth + event.clientX - startX)}px`;
      if (direction !== "right") el.style.height = `${Math.max(32, startHeight + event.clientY - startY)}px`;
    };
    const onUp = (event) => {
      handle.releasePointerCapture?.(event.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      dispatch2(el, "voodoo:resized", {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      });
    };
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      handle.setPointerCapture?.(event.pointerId);
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });
    handle.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 4 : 16;
      const rect = el.getBoundingClientRect();
      let handled = true;
      if (event.key === "ArrowRight" && direction !== "bottom") el.style.width = `${rect.width + step}px`;
      else if (event.key === "ArrowLeft" && direction !== "bottom") el.style.width = `${Math.max(32, rect.width - step)}px`;
      else if (event.key === "ArrowDown" && direction !== "right") el.style.height = `${rect.height + step}px`;
      else if (event.key === "ArrowUp" && direction !== "right") el.style.height = `${Math.max(32, rect.height - step)}px`;
      else handled = false;
      if (!handled) return;
      event.preventDefault();
      dispatch2(el, "voodoo:resized", {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      });
    });
  };
  for (const direction of directions) {
    const handle = document.createElement("div");
    handle.className = "v-resize-handle";
    handle.setAttribute("data-dir", direction);
    handle.setAttribute("role", "separator");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute(
      "aria-orientation",
      direction === "bottom" ? "horizontal" : "vertical"
    );
    handle.setAttribute("aria-label", "Redimensionar");
    startResize(handle, direction);
    el.appendChild(handle);
    handles.push(handle);
  }
  cleanup(() => {
    for (const handle of handles) handle.remove();
  });
});
function normalizeSearch(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function collectCommands() {
  const out = [];
  for (const item of queryDirective(document, "command-item")) {
    const label = (attrOf(item, "command-item") || item.textContent || "").trim();
    if (!label) continue;
    if (item.closest("[hidden]")) continue;
    out.push({ label, hint: readOption(item, "command-hint") || "", el: item });
  }
  return out;
}
function commandPalette() {
  ensureUi();
  if (document.querySelector(".v-command")) return;
  const commands = collectCommands();
  const lastFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "v-command";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Paleta de comandos");
  const box = document.createElement("div");
  box.className = "v-command-box";
  const input = document.createElement("input");
  input.className = "v-command-input";
  input.type = "search";
  input.placeholder = "Buscar comando...";
  input.setAttribute("aria-label", "Buscar comando");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("autocomplete", "off");
  const list = document.createElement("ul");
  list.className = "v-command-list";
  list.id = uid("v-cmd-list-");
  list.setAttribute("role", "listbox");
  input.setAttribute("aria-controls", list.id);
  box.append(input, list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  lockScroll();
  let visible = commands;
  let cursor = 0;
  const close = () => {
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
    unlockScroll();
    lastFocus?.focus();
  };
  const execute = () => {
    const option = visible[cursor];
    if (!option) return;
    close();
    option.el.click();
  };
  const render2 = () => {
    list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("li");
      empty.className = "v-command-empty";
      empty.textContent = "Nenhum comando encontrado";
      list.appendChild(empty);
      return;
    }
    visible.forEach((option, index) => {
      const row = document.createElement("li");
      row.className = "v-command-option";
      row.id = `${list.id}-${index}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === cursor));
      const label = document.createElement("span");
      label.textContent = option.label;
      row.appendChild(label);
      if (option.hint) {
        const hint = document.createElement("span");
        hint.className = "v-command-hint";
        hint.textContent = option.hint;
        row.appendChild(hint);
      }
      row.addEventListener("click", () => {
        cursor = index;
        execute();
      });
      row.addEventListener("pointermove", () => {
        if (cursor === index) return;
        cursor = index;
        render2();
      });
      list.appendChild(row);
    });
    const active = list.children[cursor];
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  };
  const filter = () => {
    const term = normalizeSearch(input.value.trim());
    visible = term ? commands.filter((option) => normalizeSearch(`${option.label} ${option.hint}`).includes(term)) : commands;
    cursor = 0;
    render2();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      cursor = visible.length ? (cursor + 1) % visible.length : 0;
      render2();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      cursor = visible.length ? (cursor - 1 + visible.length) % visible.length : 0;
      render2();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute();
      return;
    }
    if (event.key === "Tab") trapTab(overlay, event);
  };
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) close();
  });
  input.addEventListener("input", filter);
  document.addEventListener("keydown", onKeyDown, true);
  render2();
  input.focus();
}
defineDirective("command", ({ el, expression, cleanup }) => {
  ensureUi();
  const combo = expression.trim() || readOption(el, "command-key") || "mod+k";
  const onClick = (event) => {
    event.preventDefault();
    commandPalette();
  };
  const off2 = hotkey(combo, () => commandPalette(), { allowInInput: true });
  const parsed = parseCombo(combo.split(",")[0]);
  if (parsed && !el.hasAttribute("aria-keyshortcuts")) {
    el.setAttribute("aria-keyshortcuts", ariaShortcut(parsed));
  }
  makeInteractive(el, cleanup);
  el.addEventListener("click", onClick);
  cleanup(() => {
    off2();
    el.removeEventListener("click", onClick);
  });
});
defineDirective("command-item", ({ el, expression }) => {
  storeOption(el, "command-item", expression);
  if (!el.hasAttribute("data-v-command-label") && expression.trim()) {
    el.setAttribute("data-v-command-label", expression.trim());
  }
});
defineOption("command-key");
defineOption("command-hint");
var IDLE_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
defineDirective("idle", ({ el, expression, scope, cleanup }) => {
  const after = parseDuration(readOption(el, "idle-after"), 6e4);
  let timer = null;
  let fired = false;
  const trigger = () => {
    fired = true;
    callExpression(expression, scope, el, void 0, { idle: true, after });
    dispatch2(el, "voodoo:idle", { after });
  };
  const reset = () => {
    if (timer) clearTimeout(timer);
    fired = false;
    timer = setTimeout(trigger, after);
  };
  const onActivity = () => {
    if (fired) {
      reset();
      return;
    }
    reset();
  };
  for (const type of IDLE_EVENTS) {
    window.addEventListener(type, onActivity, { passive: true });
  }
  reset();
  cleanup(() => {
    if (timer) clearTimeout(timer);
    for (const type of IDLE_EVENTS) window.removeEventListener(type, onActivity);
  });
});
defineOption("idle-after");
function setupConnection(el, expression, scope, cleanup, wanted, immediate) {
  const handler = (event) => {
    callExpression(expression, scope, el, event, { online: navigator.onLine });
    dispatch2(el, `voodoo:${wanted}`, { online: navigator.onLine });
  };
  window.addEventListener(wanted, handler);
  cleanup(() => window.removeEventListener(wanted, handler));
  if (immediate && navigator.onLine === (wanted === "online")) queuePostFlush(() => handler());
}
defineDirective("online", ({ el, expression, scope, modifiers, cleanup }) => {
  setupConnection(el, expression, scope, cleanup, "online", !!modifiers.immediate);
});
defineDirective("offline", ({ el, expression, scope, modifiers, cleanup }) => {
  setupConnection(el, expression, scope, cleanup, "offline", modifiers["no-immediate"] !== true);
});

// src/forms/validate.ts
var messages = {
  required: "Preencha este campo.",
  email: "Informe um e-mail valido.",
  url: "Informe uma URL valida.",
  number: "Informe um numero valido.",
  integer: "Informe um numero inteiro.",
  decimal: "Informe um numero decimal valido.",
  alpha: "Use apenas letras.",
  alphanumeric: "Use apenas letras e numeros.",
  minlength: "Use no minimo {param} caracteres.",
  maxlength: "Use no maximo {param} caracteres.",
  min: "O valor minimo e {param}.",
  max: "O valor maximo e {param}.",
  between: "Informe um valor entre {min} e {max}.",
  match: "Os campos nao conferem.",
  regex: "O formato informado nao e valido.",
  date: "Informe uma data valida.",
  after: "A data precisa ser posterior a {param}.",
  before: "A data precisa ser anterior a {param}.",
  accepted: "E preciso marcar esta opcao para continuar.",
  same: "Os valores precisam ser iguais.",
  different: "Os valores precisam ser diferentes.",
  in: "Escolha uma das opcoes permitidas.",
  notin: "Este valor nao e permitido.",
  phone: "Informe um telefone valido com DDD.",
  cpf: "CPF invalido.",
  cnpj: "CNPJ invalido.",
  cep: "CEP invalido.",
  creditcard: "Numero de cartao invalido.",
  strongpassword: "Use {param} caracteres ou mais, com maiuscula, minuscula, numero e simbolo.",
  unique: "Este valor ja esta em uso.",
  invalid: "Valor invalido."
};
function formatMessage(template, data2) {
  const param = data2.param ?? "";
  const parts = param.split(",");
  const replacements = {
    param,
    field: data2.field ?? "campo",
    value: data2.value ?? "",
    min: (parts[0] ?? "").trim(),
    max: (parts[1] ?? parts[0] ?? "").trim()
  };
  return template.replace(
    /\{(\w+)\}/g,
    (whole, key) => key in replacements ? replacements[key] : whole
  );
}
var rules = /* @__PURE__ */ new Map();
function validator(name, fn, defaultMessage) {
  const key = name.toLowerCase();
  rules.set(key, { name: key, fn, message: defaultMessage });
  if (defaultMessage && !messages[key]) messages[key] = defaultMessage;
  defineDirective(`validate-${key}`, ({ el, cleanup }) => {
    bindFieldValidation(el, cleanup);
  });
}
function readDirectiveAttr(el, name) {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function hasDirectiveAttr(el, name) {
  return readDirectiveAttr(el, name) !== null;
}
var FIELD_TAGS = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
var IGNORED_TYPES = /* @__PURE__ */ new Set(["submit", "button", "reset", "image"]);
function isFormField(el) {
  return !!el && typeof el === "object" && FIELD_TAGS.has(el.tagName ?? "");
}
function fieldType(el) {
  if (el.tagName === "SELECT") return "select";
  if (el.tagName === "TEXTAREA") return "textarea";
  return (el.getAttribute("type") || "text").toLowerCase();
}
function fieldValue(el) {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") {
    return el.checked ? el.value || "on" : "";
  }
  if (type === "file") {
    const files = el.files;
    return files && files.length ? String(files.length) : "";
  }
  return el.value ?? "";
}
function fieldKey(el) {
  return el.name || el.id || `campo-${el.tagName.toLowerCase()}`;
}
function fieldLabel(el) {
  const custom = readDirectiveAttr(el, "label");
  if (custom) return custom;
  if (el.id && typeof document !== "undefined") {
    const label = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
    const text = label?.textContent?.trim();
    if (text) return text.replace(/\s*\*$/, "");
  }
  const wrapper = el.closest("label");
  const wrapperText = wrapper?.textContent?.trim();
  if (wrapperText) return wrapperText.replace(/\s*\*$/, "");
  return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || "campo";
}
function cssEscape(value) {
  const api = globalThis.CSS;
  if (api && typeof api.escape === "function") return api.escape(value);
  return value.replace(/["'\\\]\[]/g, "\\$&");
}
function findRelatedField(el, reference) {
  const ref2 = reference.trim();
  if (!ref2 || typeof document === "undefined") return null;
  const root = el.form ?? el.closest("form") ?? document;
  if (/^[#.[]/.test(ref2)) {
    const found = root.querySelector(ref2) ?? document.querySelector(ref2);
    return isFormField(found) ? found : null;
  }
  const byName = root.querySelector(`[name="${cssEscape(ref2)}"]`);
  if (isFormField(byName)) return byName;
  const byId = document.getElementById(ref2);
  return isFormField(byId) ? byId : null;
}
var RE_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
var RE_INTEGER = /^-?\d+$/;
var RE_DECIMAL = /^-?\d+(?:[.,]\d+)?$/;
var RE_ALPHA = /^[A-Za-zÀ-ÖØ-öø-ɏ]+$/;
var RE_ALPHANUM = /^[A-Za-z0-9À-ÖØ-öø-ɏ]+$/;
function digitsOf(value) {
  return value.replace(/\D/g, "");
}
function toNumber(value) {
  return Number(String(value).replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
}
function isValidCPF(value) {
  const digits = digitsOf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let first = sum * 10 % 11;
  if (first === 10) first = 0;
  if (first !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  let second = sum * 10 % 11;
  if (second === 10) second = 0;
  return second === Number(digits[10]);
}
function isValidCNPJ(value) {
  const digits = digitsOf(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const check = (length) => {
    let position = length - 7;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * position--;
      if (position < 2) position = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}
function isValidLuhn(value) {
  const digits = digitsOf(value);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let current2 = Number(digits[i]);
    if (double) {
      current2 *= 2;
      if (current2 > 9) current2 -= 9;
    }
    sum += current2;
    double = !double;
  }
  return sum % 10 === 0;
}
function isValidPhoneBR(value) {
  const digits = digitsOf(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (Number(digits.slice(0, 2)) < 11) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  if (digits.length === 10 && Number(digits[2]) < 2) return false;
  return true;
}
function parseDateValue(value) {
  const text = value.trim();
  if (!text) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const ok = date.getFullYear() === Number(br[3]) && date.getMonth() === Number(br[2]) - 1;
    return ok && date.getDate() === Number(br[1]) ? date : null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const ok = date.getFullYear() === Number(iso[1]) && date.getMonth() === Number(iso[2]) - 1;
    return ok && date.getDate() === Number(iso[3]) ? date : null;
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : new Date(time);
}
function referenceDate(param, el) {
  if (!param) return null;
  const key = param.trim().toLowerCase();
  if (key === "hoje" || key === "today" || key === "now" || key === "agora") return /* @__PURE__ */ new Date();
  const direct = parseDateValue(param);
  if (direct) return direct;
  const other = findRelatedField(el, param);
  return other ? parseDateValue(fieldValue(other)) : null;
}
validator("required", (value, _param, el) => {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") return el.checked;
  if (type === "file") {
    const files = el.files;
    return !!files && files.length > 0;
  }
  return value.trim().length > 0;
});
validator("email", (value) => RE_EMAIL.test(value.trim()));
validator("url", (value) => {
  const text = value.trim();
  if (!text) return false;
  try {
    const url2 = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return url2.hostname.includes(".") && !url2.hostname.endsWith(".");
  } catch {
    return false;
  }
});
validator("number", (value) => value.trim() !== "" && Number.isFinite(toNumber(value)));
validator("integer", (value) => RE_INTEGER.test(value.trim()));
validator("decimal", (value, param) => {
  const text = value.trim();
  if (!RE_DECIMAL.test(text)) return false;
  if (!param) return true;
  const places = Number(param);
  if (!Number.isFinite(places)) return true;
  const fraction = text.split(/[.,]/)[1] ?? "";
  return fraction.length <= places;
});
validator("alpha", (value) => RE_ALPHA.test(value.trim().replace(/\s+/g, "")));
validator("alphanumeric", (value) => RE_ALPHANUM.test(value.trim().replace(/\s+/g, "")));
validator("minlength", (value, param) => value.trim().length >= Number(param ?? 0));
validator("maxlength", (value, param) => value.trim().length <= Number(param ?? Infinity));
validator("min", (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith("date")) {
    const current2 = parseDateValue(value);
    return !current2 || current2.getTime() >= limit.getTime();
  }
  return toNumber(value) >= Number(param ?? 0);
});
validator("max", (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith("date")) {
    const current2 = parseDateValue(value);
    return !current2 || current2.getTime() <= limit.getTime();
  }
  return toNumber(value) <= Number(param ?? Infinity);
});
validator("between", (value, param) => {
  const [min, max] = (param ?? "").split(",").map((part) => Number(part.trim()));
  const current2 = toNumber(value);
  return Number.isFinite(current2) && current2 >= min && current2 <= max;
});
validator("match", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  if (!other) return true;
  return fieldValue(other) === value;
});
validator("same", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) === value;
});
validator("different", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) !== value;
});
validator("regex", (value, param, el) => {
  if (!param) return true;
  const flags = readDirectiveAttr(el, "regex-flags") ?? "";
  try {
    return new RegExp(param, flags).test(value);
  } catch {
    warn(`Expressao regular invalida em ${config.prefix}regex: ${param}`);
    return true;
  }
});
validator("date", (value) => parseDateValue(value) !== null);
validator("after", (value, param, el) => {
  const limit = referenceDate(param, el);
  const current2 = parseDateValue(value);
  if (!limit || !current2) return true;
  return current2.getTime() > limit.getTime();
});
validator("before", (value, param, el) => {
  const limit = referenceDate(param, el);
  const current2 = parseDateValue(value);
  if (!limit || !current2) return true;
  return current2.getTime() < limit.getTime();
});
validator("accepted", (value, _param, el) => {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") return el.checked;
  return ["1", "true", "on", "yes", "sim"].includes(value.trim().toLowerCase());
});
validator(
  "in",
  (value, param) => (param ?? "").split(",").map((part) => part.trim()).includes(value.trim())
);
validator(
  "notin",
  (value, param) => !(param ?? "").split(",").map((part) => part.trim()).includes(value.trim())
);
validator("phone", (value) => isValidPhoneBR(value));
validator("cpf", (value) => isValidCPF(value));
validator("cnpj", (value) => isValidCNPJ(value));
validator("cep", (value) => digitsOf(value).length === 8);
validator("creditcard", (value) => isValidLuhn(value));
validator("strongpassword", (value, param) => {
  const min = Number(param) > 0 ? Number(param) : 8;
  const strong = value.length >= min && /[a-zà-ÿ]/.test(value) && /[A-ZÀ-ß]/.test(value) && /\d/.test(value) && /[^\w\s]/.test(value);
  return strong ? true : formatMessage(messages.strongpassword, { param: String(min) });
});
validator("unique", async (value, param, el) => {
  const url2 = param || readDirectiveAttr(el, "unique-url") || "";
  if (!url2 || !value.trim()) return true;
  try {
    const data2 = await http.get(url2, {
      params: { value, field: fieldKey(el) },
      timeout: 8e3
    });
    if (data2 && typeof data2 === "object" && "available" in data2) {
      return data2.available === true ? true : messages.unique;
    }
    return data2 ? messages.unique : true;
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 404) return true;
      if (err.status >= 400 && err.status < 500) return messages.unique;
    }
    return true;
  }
});
var RULE_ALIASES = {
  "strong-password": "strongpassword",
  "credit-card": "creditcard",
  "min-length": "minlength",
  "max-length": "maxlength",
  "not-in": "notin",
  "nao-vazio": "required",
  obrigatorio: "required"
};
var RUN_WHEN_EMPTY = /* @__PURE__ */ new Set(["required", "accepted"]);
function ruleNameFromAttribute(attrName) {
  let body = null;
  if (attrName.startsWith(config.prefix)) body = attrName.slice(config.prefix.length);
  else if (attrName.startsWith("data-v-")) body = attrName.slice(7);
  if (!body) return null;
  const dot = body.indexOf(".");
  if (dot > -1) body = body.slice(0, dot);
  if (body === "validate") return null;
  if (body.startsWith("validate-")) body = body.slice("validate-".length);
  const name = RULE_ALIASES[body] ?? body;
  return rules.has(name) ? name : null;
}
function fieldRules(el) {
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (name, param) => {
    if (seen.has(name) || !rules.has(name)) return;
    seen.add(name);
    found.push({ name, param });
  };
  for (const [attrName, attrValue] of originalAttributes(el)) {
    const name = ruleNameFromAttribute(attrName);
    if (!name) continue;
    if (attrValue.trim() === "false") {
      seen.add(name);
      continue;
    }
    push(name, attrValue);
  }
  const type = fieldType(el);
  if (el.hasAttribute("required")) push("required", "");
  if (type === "email") push("email", "");
  if (type === "url") push("url", "");
  if (type === "number" || type === "range") push("number", "");
  const minlength = el.getAttribute("minlength");
  if (minlength) push("minlength", minlength);
  const maxlength = el.getAttribute("maxlength");
  if (maxlength) push("maxlength", maxlength);
  const min = el.getAttribute("min");
  if (min) push("min", min);
  const max = el.getAttribute("max");
  if (max) push("max", max);
  const pattern = el.getAttribute("pattern");
  if (pattern) push("regex", pattern);
  found.sort((a, b) => a.name === "required" ? -1 : b.name === "required" ? 1 : 0);
  return found;
}
var CSS2 = `
.v-field-error{display:block;margin-top:6px;color:var(--v-danger,#FF4D4D);
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  animation:v-field-error-in .18s var(--v-ease,ease) both}
@keyframes v-field-error-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.v-invalid{border-color:var(--v-danger,#FF4D4D) !important}
.v-invalid:focus,.v-invalid:focus-visible{outline-color:var(--v-danger,#FF4D4D);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--v-danger,#FF4D4D) 22%,transparent)}
.v-valid{border-color:var(--v-success,#2ED9A5)}
.v-form-error{margin:0 0 14px;padding:10px 14px;border-radius:var(--v-radius-sm,8px);
  background:color-mix(in srgb,var(--v-danger,#FF4D4D) 12%,var(--v-surface,#fff));
  border:1px solid var(--v-danger,#FF4D4D);color:var(--v-text,#14111F);
  font:500 13px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-form-error ul{margin:0;padding-left:18px}
@media (prefers-reduced-motion: reduce){.v-field-error{animation:none}}
`;
function ensureStyles() {
  ensureTokens();
  injectStyle("forms-validate", CSS2);
}
function errorHost(el) {
  const selector = readDirectiveAttr(el, "error-target");
  if (selector && typeof document !== "undefined") {
    const host = (el.form ?? el.closest("form"))?.querySelector(selector) ?? document.querySelector(selector);
    if (host) return { parent: host, anchor: null };
    warn(`Destino de ${config.prefix}error-target nao encontrado: ${selector}`);
  }
  const parent = el.parentElement;
  return parent ? { parent, anchor: el } : null;
}
function findErrorElement(el) {
  const host = errorHost(el);
  if (!host) return null;
  if (host.anchor) {
    const next = host.anchor.nextElementSibling;
    return next && next.classList.contains("v-field-error") ? next : null;
  }
  return host.parent.querySelector(".v-field-error");
}
function showFieldError(el, message) {
  ensureStyles();
  el.classList.add("v-invalid");
  el.classList.remove("v-valid");
  el.setAttribute("aria-invalid", "true");
  let span = findErrorElement(el);
  if (!span) {
    const host = errorHost(el);
    if (!host) return;
    span = document.createElement("span");
    span.className = "v-field-error";
    span.id = el.id ? `${el.id}-error` : uid("v-error-");
    span.setAttribute("role", "alert");
    span.setAttribute("aria-live", "polite");
    if (host.anchor) host.anchor.insertAdjacentElement("afterend", span);
    else host.parent.appendChild(span);
  }
  span.textContent = message;
  const describedBy = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== span.id);
  describedBy.push(span.id);
  el.setAttribute("aria-describedby", describedBy.join(" "));
}
function clearFieldError(el, markValid = false) {
  el.classList.remove("v-invalid");
  el.classList.toggle("v-valid", markValid);
  el.removeAttribute("aria-invalid");
  const span = findErrorElement(el);
  if (span) {
    const remaining = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== span.id);
    if (remaining.length) el.setAttribute("aria-describedby", remaining.join(" "));
    else el.removeAttribute("aria-describedby");
    span.remove();
  }
}
function clearErrors(form) {
  for (const field of collectFields(form, false)) clearFieldError(field);
  for (const leftover of Array.from(form.querySelectorAll(".v-field-error"))) leftover.remove();
  const summary = form.querySelector(".v-form-error");
  if (summary) summary.remove();
  for (const marked of Array.from(form.querySelectorAll(".v-invalid, .v-valid"))) {
    marked.classList.remove("v-invalid", "v-valid");
    marked.removeAttribute("aria-invalid");
  }
}
function normalizeErrors(payload) {
  const out = {};
  if (!payload || typeof payload !== "object") return out;
  const source = payload;
  const bag = source.errors && typeof source.errors === "object" ? source.errors : source;
  for (const [key, value] of Object.entries(bag)) {
    if (key === "message" || key === "mensagem" || key === "errors") continue;
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
  }
  return out;
}
function findFieldByName(form, key) {
  const bracket = key.replace(/\.(\w+)/g, "[$1]");
  const candidates = [key, bracket, `${key}[]`, `${bracket}[]`];
  for (const candidate of candidates) {
    const found = form.querySelector(`[name="${cssEscape(candidate)}"]`);
    if (isFormField(found)) return found;
  }
  const byId = form.querySelector(`#${cssEscape(key)}`);
  return isFormField(byId) ? byId : null;
}
function showFormErrors(form, errors) {
  const normalized = normalizeErrors(errors);
  const orphans = [];
  for (const [key, message] of Object.entries(normalized)) {
    const field = findFieldByName(form, key);
    if (field) showFieldError(field, message);
    else orphans.push(message);
  }
  if (orphans.length) showFormSummary(form, orphans);
  return normalized;
}
function showFormSummary(form, list) {
  ensureStyles();
  let box = form.querySelector(".v-form-error");
  if (!box) {
    box = document.createElement("div");
    box.className = "v-form-error";
    box.setAttribute("role", "alert");
    form.prepend(box);
  }
  box.textContent = "";
  if (list.length === 1) {
    box.textContent = list[0];
    return;
  }
  const ul = document.createElement("ul");
  for (const message of list) {
    const li = document.createElement("li");
    li.textContent = message;
    ul.appendChild(li);
  }
  box.appendChild(ul);
}
function focusFirstError(form) {
  const field = form.querySelector(".v-invalid");
  if (!field) return false;
  try {
    field.focus({ preventScroll: true });
  } catch {
    field.focus();
  }
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof field.scrollIntoView === "function") {
    field.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }
  return true;
}
function collectFields(form, onlyWithRules = true) {
  const source = form.tagName === "FORM" ? Array.from(form.elements) : Array.from(form.querySelectorAll("input, select, textarea"));
  const out = [];
  for (const element of source) {
    if (!isFormField(element)) continue;
    if (element.disabled) continue;
    if (IGNORED_TYPES.has(fieldType(element))) continue;
    if (onlyWithRules && fieldRules(element).length === 0) continue;
    out.push(element);
  }
  return out;
}
async function validateField(el, options = {}) {
  if (!isFormField(el)) return { valid: true };
  const list = fieldRules(el);
  if (!list.length) {
    if (!options.silent) clearFieldError(el);
    return { valid: true };
  }
  const value = fieldValue(el);
  const custom = readDirectiveAttr(el, "error-message");
  const empty = value.trim() === "";
  for (const rule of list) {
    if (empty && !RUN_WHEN_EMPTY.has(rule.name)) continue;
    const definition = rules.get(rule.name);
    if (!definition) continue;
    let outcome;
    try {
      outcome = await definition.fn(value, rule.param || void 0, el);
    } catch (err) {
      warn(`Regra "${rule.name}" falhou ao executar`, err);
      continue;
    }
    if (outcome === true) continue;
    const template = custom ?? (typeof outcome === "string" ? outcome : messages[rule.name] ?? definition.message ?? messages.invalid);
    const message = formatMessage(template, {
      field: fieldLabel(el),
      param: rule.param,
      value
    });
    if (!options.silent) {
      showFieldError(el, message);
      emitFieldResult(el, { valid: false, message, rule: rule.name });
    }
    return { valid: false, message, rule: rule.name };
  }
  if (!options.silent) {
    clearFieldError(el, !empty);
    emitFieldResult(el, { valid: true });
  }
  return { valid: true };
}
function validate(target) {
  if (isFormField(target)) return validateField(target);
  return validateForm(target);
}
async function validateForm(form) {
  const fields = collectFields(form);
  const results = await Promise.all(fields.map((field) => validateField(field)));
  const errors = {};
  fields.forEach((field, index) => {
    const result = results[index];
    if (!result.valid) errors[fieldKey(field)] = result.message ?? messages.invalid;
  });
  return { valid: Object.keys(errors).length === 0, errors };
}
function emitFieldResult(el, result) {
  el.dispatchEvent(
    new CustomEvent("voodoo:field-validated", {
      bubbles: true,
      detail: { field: fieldKey(el), ...result }
    })
  );
}
function parseFieldName(name) {
  const start2 = name.indexOf("[");
  if (start2 === -1) return [name];
  const keys = [name.slice(0, start2)];
  const re = /\[([^\]]*)\]/g;
  let match;
  while ((match = re.exec(name)) !== null) keys.push(match[1]);
  return keys;
}
function assignPath(target, keys, value) {
  let node = target;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const last = i === keys.length - 1;
    const next = keys[i + 1];
    if (key === "") {
      if (!Array.isArray(node)) return;
      if (last) {
        node.push(value);
        return;
      }
      const container2 = next === "" ? [] : {};
      node.push(container2);
      node = container2;
      continue;
    }
    if (Array.isArray(node)) {
      const index = Number(key);
      if (!Number.isInteger(index)) return;
      if (last) {
        node[index] = value;
        return;
      }
      let child2 = node[index];
      if (child2 == null || typeof child2 !== "object") {
        child2 = next === "" || /^\d+$/.test(next ?? "") ? [] : {};
        node[index] = child2;
      }
      node = child2;
      continue;
    }
    if (last) {
      node[key] = value;
      return;
    }
    let child = node[key];
    if (child == null || typeof child !== "object") {
      child = next === "" || /^\d+$/.test(next ?? "") ? [] : {};
      node[key] = child;
    }
    node = child;
  }
}
function collectEntries(form, options) {
  const fields = collectFields(form, false);
  const entries = [];
  const checkboxCount = /* @__PURE__ */ new Map();
  for (const field of fields) {
    if (fieldType(field) === "checkbox" && field.name) {
      checkboxCount.set(field.name, (checkboxCount.get(field.name) ?? 0) + 1);
    }
  }
  const trim = options.trim !== false;
  const numbers2 = options.numbers !== false;
  for (const field of fields) {
    if (!field.name) continue;
    if (field.disabled && !options.includeDisabled) continue;
    const type = fieldType(field);
    if (type === "file") {
      const files = Array.from(field.files ?? []);
      if (!files.length) continue;
      const multiple = field.multiple || field.name.endsWith("[]");
      entries.push({ name: field.name, value: multiple ? files : files[0] });
      continue;
    }
    if (type === "checkbox") {
      const many = (checkboxCount.get(field.name) ?? 1) > 1 || field.name.endsWith("[]");
      if (many) {
        if (!field.checked) continue;
        const name = field.name.endsWith("[]") ? field.name : `${field.name}[]`;
        entries.push({ name, value: field.value || "on" });
      } else {
        entries.push({ name: field.name, value: field.checked });
      }
      continue;
    }
    if (type === "radio") {
      if (!field.checked) continue;
      entries.push({ name: field.name, value: field.value });
      continue;
    }
    if (field.tagName === "SELECT" && field.multiple) {
      const selected = Array.from(field.selectedOptions).map(
        (option) => option.value
      );
      const name = field.name.endsWith("[]") ? field.name : `${field.name}[]`;
      for (const value2 of selected) entries.push({ name, value: value2 });
      continue;
    }
    let value = field.value ?? "";
    if (trim && typeof value === "string") value = value.trim();
    if (numbers2 && (type === "number" || type === "range") && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) value = parsed;
    }
    entries.push({ name: field.name, value });
  }
  return entries;
}
function hasSelectedFile(form) {
  for (const field of collectFields(form, false)) {
    if (fieldType(field) !== "file") continue;
    const files = field.files;
    if (files && files.length) return true;
  }
  return false;
}
function appendToFormData(data2, name, value) {
  if (value instanceof File || typeof Blob !== "undefined" && value instanceof Blob) {
    data2.append(name, value);
    return;
  }
  if (Array.isArray(value)) {
    const listName = name.endsWith("[]") ? name : `${name}[]`;
    for (const item of value) appendToFormData(data2, listName, item);
    return;
  }
  if (typeof value === "boolean") {
    data2.append(name, value ? "1" : "0");
    return;
  }
  data2.append(name, value == null ? "" : String(value));
}
function serializeForm(form, options = {}) {
  const entries = collectEntries(form, options);
  if (options.formData || hasSelectedFile(form)) {
    const data2 = new FormData();
    for (const entry of entries) appendToFormData(data2, entry.name, entry.value);
    return data2;
  }
  const out = {};
  for (const entry of entries) assignPath(out, parseFieldName(entry.name), entry.value);
  return out;
}
var boundFields = /* @__PURE__ */ new WeakSet();
var erroredFields = /* @__PURE__ */ new WeakSet();
async function runFieldValidation(el) {
  const result = await validateField(el);
  if (result.valid) erroredFields.delete(el);
  else erroredFields.add(el);
}
function bindFieldValidation(el, cleanup) {
  if (!isFormField(el)) {
    warn(`${config.prefix}validate so funciona em input, select ou textarea.`);
    return;
  }
  if (boundFields.has(el)) return;
  boundFields.add(el);
  ensureStyles();
  const onBlur = () => {
    void runFieldValidation(el);
  };
  const onInput = () => {
    if (!erroredFields.has(el)) return;
    void runFieldValidation(el);
  };
  el.addEventListener("blur", onBlur);
  el.addEventListener("input", onInput);
  el.addEventListener("change", onBlur);
  cleanup(() => {
    boundFields.delete(el);
    erroredFields.delete(el);
    el.removeEventListener("blur", onBlur);
    el.removeEventListener("input", onInput);
    el.removeEventListener("change", onBlur);
  });
}
var validatedForms = /* @__PURE__ */ new WeakSet();
function isValidatedForm(form) {
  return validatedForms.has(form) || hasDirectiveAttr(form, "validate");
}
function setupFormValidation(form, cleanup) {
  validatedForms.add(form);
  ensureStyles();
  if (form.tagName === "FORM") form.noValidate = true;
  const onFocusOut = (event) => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (fieldRules(target).length === 0) return;
    void runFieldValidation(target);
  };
  const onInput = (event) => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (!erroredFields.has(target)) return;
    void runFieldValidation(target);
  };
  form.addEventListener("focusout", onFocusOut);
  form.addEventListener("input", onInput);
  form.addEventListener("change", onFocusOut);
  cleanup(() => {
    validatedForms.delete(form);
    form.removeEventListener("focusout", onFocusOut);
    form.removeEventListener("input", onInput);
    form.removeEventListener("change", onFocusOut);
  });
}
defineDirective("validate", ({ el, cleanup }) => {
  if (el.tagName === "FORM" || el.hasAttribute(`${config.prefix}submit`)) {
    setupFormValidation(el, cleanup);
    return;
  }
  bindFieldValidation(el, cleanup);
});
var FIELD_DIRECTIVES = [
  "required",
  "email",
  "url",
  "number",
  "integer",
  "minlength",
  "maxlength",
  "min",
  "max",
  "match",
  "regex",
  "cpf",
  "cnpj",
  "cep",
  "phone",
  "date",
  "accepted",
  "strong-password"
];
for (const name of FIELD_DIRECTIVES) {
  defineDirective(name, ({ el, cleanup }) => {
    bindFieldValidation(el, cleanup);
  });
}
for (const name of ["error-message", "error-target", "regex-flags", "unique-url"]) {
  defineDirective(name, ({ el, cleanup }) => {
    if (!isFormField(el)) return;
    bindFieldValidation(el, cleanup);
  });
}

// src/directives/forms.ts
function createState() {
  return reactive({
    loading: false,
    saving: false,
    success: false,
    errors: {},
    message: "",
    data: null,
    status: 0,
    dirty: false,
    progress: 0
  });
}
var formStates = /* @__PURE__ */ new WeakMap();
var scopeStates = /* @__PURE__ */ new WeakMap();
var neutralState = createState();
function ensureFormState(host) {
  let state = formStates.get(host);
  if (!state) {
    state = createState();
    formStates.set(host, state);
  }
  return state;
}
function resolveFormState(scope) {
  let current2 = scope;
  while (current2) {
    const direct = scopeStates.get(current2);
    if (direct) return direct;
    const el = current2.el;
    if (el) {
      const owner = el.closest("form");
      const found = owner ? formStates.get(owner) : void 0;
      if (found) return found;
      const inner = el.querySelector("form");
      const nested = inner ? formStates.get(inner) : void 0;
      if (nested) return nested;
    }
    current2 = current2.parent;
  }
  if (typeof document !== "undefined") {
    for (const form of Array.from(document.forms)) {
      const found = formStates.get(form);
      if (found) return found;
    }
  }
  return neutralState;
}
magic("$form", (scope) => resolveFormState(scope));
var declaredOptions = /* @__PURE__ */ new WeakMap();
var REQUEST_DIRECTIVES = [
  "submit",
  "upload",
  "dropzone",
  "autosave",
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "load",
  "load-visible",
  "search",
  "resource"
];
function isRequestHost(el) {
  return REQUEST_DIRECTIVES.some(
    (name) => hasAttr(el, `${config.prefix}${name}`) || hasAttr(el, `data-v-${name}`)
  );
}
function readOption2(el, name) {
  const own = readDirectiveAttr(el, name);
  if (own !== null) return own;
  const owner = el.closest("form");
  if (owner && owner !== el) {
    const inherited = readDirectiveAttr(owner, name);
    if (inherited !== null) return inherited;
  }
  const cached = declaredOptions.get(el)?.[name] ?? (owner ? declaredOptions.get(owner)?.[name] : void 0);
  return cached ?? null;
}
function hasOption(el, name) {
  return readOption2(el, name) !== null;
}
function defineFormOption(name, validate2) {
  defineDirective(name, ({ el, expression }) => {
    const owner = el.closest("form") ?? el;
    const bag = declaredOptions.get(owner) ?? {};
    bag[name] = expression;
    declaredOptions.set(owner, bag);
    if (!isRequestHost(owner) && !isRequestHost(el)) {
      warn(
        `${config.prefix}${name} precisa de um elemento com ${config.prefix}submit, ${config.prefix}upload, ${config.prefix}dropzone ou ${config.prefix}autosave.`
      );
      return;
    }
    const problem = validate2?.(expression);
    if (problem) warn(problem);
  });
}
var HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
defineFormOption(
  "method",
  (value) => value && !HTTP_METHODS.includes(value.trim().toUpperCase()) ? `${config.prefix}method recebeu um verbo desconhecido: ${value}` : null
);
defineFormOption("redirect");
defineFormOption("reset-success");
defineFormOption("disable-loading");
defineFormOption("loading-class");
defineFormOption("on-success");
defineFormOption("on-error");
defineFormOption("on-complete");
defineFormOption("toast-success");
defineFormOption("toast-error");
defineFormOption("confirm");
defineFormOption("form-data");
defineDirective("loading", ({ el, expression }) => {
  const owner = el.closest("form") ?? el;
  const bag = declaredOptions.get(owner) ?? {};
  bag.loading = expression;
  declaredOptions.set(owner, bag);
  const target = loadingTarget(expression);
  if (!target) {
    warn(`Elemento de ${config.prefix}loading nao encontrado: ${expression}`);
    return;
  }
  toggleLoadingTarget(target, false);
});
var CSS3 = `
form.v-loading{cursor:progress}
form.v-loading [type="submit"],form.v-loading button[disabled]{opacity:.6}
.v-progress{position:relative;overflow:hidden;width:100%;height:8px;margin-top:8px;
  border-radius:999px;background:var(--v-surface-2,#FBF7F2);border:1px solid var(--v-border,#E6E0F0)}
.v-progress-bar{display:block;height:100%;width:0;border-radius:999px;
  background:var(--v-primary,#6D3BF5);transition:width .18s var(--v-ease,ease)}
.v-progress[data-state="error"] .v-progress-bar{background:var(--v-danger,#FF4D4D)}
.v-progress[data-state="done"] .v-progress-bar{background:var(--v-success,#2ED9A5)}

.v-dropzone{display:grid;place-items:center;gap:6px;min-height:132px;padding:20px;cursor:pointer;
  border:2px dashed var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text-muted,#6B6580);text-align:center;
  font:500 14px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  transition:border-color .18s var(--v-ease,ease),background .18s var(--v-ease,ease)}
.v-dropzone:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-dropzone-over{border-color:var(--v-primary,#6D3BF5);
  background:color-mix(in srgb,var(--v-primary,#6D3BF5) 8%,var(--v-surface,#fff));
  color:var(--v-primary,#6D3BF5)}
.v-dropzone-busy{cursor:progress;opacity:.75}
.v-dropzone-error{border-color:var(--v-danger,#FF4D4D);color:var(--v-danger,#FF4D4D)}

.v-autosave-status{display:inline-flex;align-items:center;gap:6px;margin-top:8px;
  color:var(--v-text-muted,#6B6580);
  font:500 12.5px/1.4 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-autosave-status[data-state="saving"]{color:var(--v-info,#9B7BFF)}
.v-autosave-status[data-state="saved"]{color:var(--v-success,#2ED9A5)}
.v-autosave-status[data-state="error"]{color:var(--v-danger,#FF4D4D)}
@media (prefers-reduced-motion: reduce){.v-progress-bar,.v-dropzone{transition:none}}
`;
function ensureStyles2() {
  ensureTokens();
  injectStyle("forms-ajax", CSS3);
}
function emit2(el, name, detail) {
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
function resolveUrl(raw, scope) {
  let url2 = raw.trim();
  if (url2.includes("{")) {
    url2 = url2.replace(/\{([^{}]+)\}/g, (whole, expression) => {
      const value = evaluateIn(expression.trim(), scope, `${config.prefix}submit`);
      return value == null ? whole : String(value);
    });
  }
  const base = config.baseURL;
  if (base && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url2) && !url2.startsWith("//")) {
    url2 = `${base.replace(/\/$/, "")}/${url2.replace(/^\//, "")}`;
  }
  return url2;
}
function messageFrom(data2) {
  if (!data2 || typeof data2 !== "object") return "";
  const source = data2;
  const found = source.message ?? source.mensagem;
  return typeof found === "string" ? found : "";
}
function toParams(value, prefix = "", out = {}) {
  if (value == null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => toParams(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === "object" && !(value instanceof File)) {
    for (const [key, item] of Object.entries(value)) {
      toParams(item, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = String(value);
  return out;
}
function submitButtons(form) {
  return Array.from(
    form.querySelectorAll(
      'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]'
    )
  );
}
function loadingTarget(selector) {
  if (!selector || typeof document === "undefined") return null;
  return document.querySelector(selector);
}
var originalDisplay = /* @__PURE__ */ new WeakMap();
function toggleLoadingTarget(target, visible) {
  if (visible) {
    target.hidden = false;
    target.style.display = originalDisplay.get(target) ?? "";
    target.removeAttribute("aria-hidden");
    return;
  }
  if (!originalDisplay.has(target)) {
    originalDisplay.set(target, target.style.display === "none" ? "" : target.style.display);
  }
  target.style.display = "none";
  target.setAttribute("aria-hidden", "true");
}
function setLoading(ctx, on2) {
  const { host, form, state } = ctx;
  state.loading = on2;
  form.classList.toggle("v-loading", on2);
  form.setAttribute("aria-busy", on2 ? "true" : "false");
  const extra = readOption2(host, "loading-class");
  if (extra) {
    for (const name of extra.split(/\s+/).filter(Boolean)) form.classList.toggle(name, on2);
  }
  if (hasOption(host, "disable-loading")) {
    for (const button of submitButtons(form)) button.disabled = on2;
  }
  const selector = readOption2(host, "loading");
  if (selector) {
    const target = loadingTarget(selector);
    if (target) toggleLoadingTarget(target, on2);
  }
}
function runCallback(ctx, option, payload, response) {
  const expression = readOption2(ctx.host, option);
  if (!expression) return;
  const local = ctx.scope.child({
    $data: payload,
    $response: response,
    $form: ctx.state,
    $el: ctx.host
  });
  const result = evaluateIn(expression, local, `${config.prefix}${option}`);
  if (typeof result === "function") {
    result.call(ctx.scope.data, payload, response);
  }
}
function swapContent2(ctx, data2) {
  const selector = readOption2(ctx.host, "target");
  if (!selector || typeof data2 !== "string") return;
  const target = document.querySelector(selector);
  if (!target) {
    warn(`Destino de ${config.prefix}target nao encontrado: ${selector}`);
    return;
  }
  const mode = (readOption2(ctx.host, "swap") || "innerHTML").trim().toLowerCase();
  if (mode === "none") return;
  if (mode === "text") {
    target.textContent = data2;
    return;
  }
  const template = document.createElement("template");
  template.innerHTML = data2;
  const nodes = Array.from(template.content.childNodes);
  const scope = findScope(target);
  switch (mode) {
    case "inner":
    case "innerhtml":
      for (const child of Array.from(target.children)) destroy(child);
      target.textContent = "";
      target.append(...nodes);
      break;
    case "afterbegin":
    case "prepend":
      target.prepend(...nodes);
      break;
    case "beforeend":
    case "append":
      target.append(...nodes);
      break;
    case "beforebegin":
      target.before(...nodes);
      break;
    case "afterend":
      target.after(...nodes);
      break;
    case "outer":
    case "outerhtml":
    case "replace":
      destroy(target);
      target.replaceWith(...nodes);
      break;
    default:
      warn(`Modo desconhecido em ${config.prefix}swap: ${mode}`);
      return;
  }
  for (const node of nodes) if (node.nodeType === 1) walk(node, scope);
}
function handleSuccess(ctx, data2, status) {
  const { state, form, host } = ctx;
  state.success = true;
  state.errors = {};
  state.data = data2;
  state.status = status;
  state.dirty = false;
  state.message = messageFrom(data2);
  swapContent2(ctx, data2);
  if (hasOption(host, "reset-success") && form.tagName === "FORM") {
    form.reset();
    clearErrors(form);
  }
  const successToast = readOption2(host, "toast-success");
  if (successToast !== null) {
    toast.success(successToast || state.message || "Tudo certo!");
  }
  runCallback(ctx, "on-success", data2, { status });
  emit2(form, "voodoo:success", { data: data2, status, form, state });
  const redirect = readOption2(host, "redirect");
  if (redirect !== null && typeof window !== "undefined") {
    const fromServer = data2 && typeof data2 === "object" ? data2.redirect ?? data2.url : null;
    const local = ctx.scope.child({ $data: data2, $form: state });
    const url2 = redirect ? resolveUrl(redirect, local) : String(fromServer ?? "");
    if (url2) window.location.assign(url2);
  }
}
function handleFailure(ctx, error) {
  const { state, form, host } = ctx;
  const httpError = error instanceof HttpError ? error : new HttpError(error instanceof Error ? error.message : String(error));
  const data2 = httpError.response?.data ?? null;
  state.success = false;
  state.data = data2;
  state.status = httpError.status;
  state.message = messageFrom(data2) || httpError.message;
  const serverErrors = normalizeErrors(data2);
  if (httpError.status === 422 || Object.keys(serverErrors).length > 0) {
    state.errors = showFormErrors(form, data2);
    focusFirstError(form);
  }
  const errorToast = readOption2(host, "toast-error");
  if (errorToast !== null) {
    toast.error(errorToast || messageFrom(data2) || "Nao foi possivel enviar o formulario.");
  }
  runCallback(ctx, "on-error", data2, httpError);
  emit2(form, "voodoo:error", {
    error: httpError,
    data: data2,
    status: httpError.status,
    form,
    state
  });
}
function handleComplete(ctx, ok) {
  runCallback(ctx, "on-complete", ctx.state.data, { ok, status: ctx.state.status });
  emit2(ctx.form, "voodoo:complete", {
    ok,
    status: ctx.state.status,
    data: ctx.state.data,
    form: ctx.form,
    state: ctx.state
  });
}
async function sendForm(ctx, rawUrl) {
  const { host, form, state, scope } = ctx;
  if (state.loading) return;
  const confirmMessage = readOption2(host, "confirm");
  if (confirmMessage !== null && typeof window !== "undefined") {
    if (!window.confirm(confirmMessage || "Confirma esta acao?")) return;
  }
  if (isValidatedForm(form)) {
    clearErrors(form);
    const result = await validateForm(form);
    state.errors = result.errors;
    if (!result.valid) {
      focusFirstError(form);
      emit2(form, "voodoo:invalid", { errors: result.errors, form, state });
      return;
    }
  }
  const method = (readOption2(host, "method") || form.getAttribute("method") || "POST").trim().toUpperCase();
  const url2 = resolveUrl(rawUrl, scope) || (form.tagName === "FORM" ? form.action : "") || (typeof location !== "undefined" ? location.href : "");
  const payload = serializeForm(form, { formData: hasOption(host, "form-data") });
  const readOnly = method === "GET" || method === "HEAD";
  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  emit2(form, "voodoo:submit", { url: url2, method, form, state });
  let ok = false;
  try {
    const response = await request({
      url: url2,
      method,
      body: readOnly ? void 0 : payload,
      params: readOnly && !(payload instanceof FormData) ? toParams(payload) : void 0
    });
    ok = true;
    handleSuccess(ctx, response.data, response.status);
  } catch (err) {
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}
defineDirective(
  "submit",
  ({ el, scope, expression, cleanup }) => {
    ensureStyles2();
    const form = el;
    const state = ensureFormState(form);
    const formScope = scope.child({ $form: state }, form);
    scopeStates.set(formScope, state);
    scopeStates.set(scope, state);
    markNodeScope(form, formScope);
    for (const child of Array.from(form.childNodes)) {
      if (child.nodeType === 1) markNodeScope(child, formScope);
    }
    const ctx = { host: form, form, scope: formScope, state };
    const onSubmit = (event) => {
      event.preventDefault();
      void sendForm(ctx, expression);
    };
    const onFieldValidated = (event) => {
      const detail = event.detail;
      if (!detail || !detail.field) return;
      const next = { ...state.errors };
      if (detail.valid) delete next[detail.field];
      else next[detail.field] = detail.message ?? "";
      state.errors = next;
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("voodoo:field-validated", onFieldValidated);
    cleanup(() => {
      formStates.delete(form);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("voodoo:field-validated", onFieldValidated);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
function progressElement(host) {
  const selector = readOption2(host, "progress");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`Barra de ${config.prefix}progress nao encontrada: ${selector}`);
    return null;
  }
  const existing = host.nextElementSibling;
  if (existing && existing.classList.contains("v-progress")) return existing;
  ensureStyles2();
  const bar = document.createElement("div");
  bar.className = "v-progress";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.innerHTML = '<span class="v-progress-bar"></span>';
  host.insertAdjacentElement("afterend", bar);
  return bar;
}
function paintProgress(target, percent, state) {
  if (!target) return;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  if (target.tagName === "PROGRESS") {
    target.value = value;
    target.max = 100;
  } else {
    const bar = target.classList.contains("v-progress-bar") ? target : target.querySelector(".v-progress-bar, [data-progress-bar]");
    if (bar) bar.style.width = `${value}%`;
    else target.style.width = `${value}%`;
  }
  target.setAttribute("aria-valuenow", String(value));
  if (state) target.setAttribute("data-state", state);
  else target.removeAttribute("data-state");
}
function buildFileData(host, files, fieldName) {
  const data2 = new FormData();
  const multiple = files.length > 1 || fieldName.endsWith("[]");
  const name = multiple ? fieldName.endsWith("[]") ? fieldName : `${fieldName}[]` : fieldName;
  for (const file of files) data2.append(name, file);
  const owner = host.closest("form");
  if (owner) {
    const extra = serializeForm(owner, { formData: true });
    if (extra instanceof FormData) {
      for (const [key, value] of extra.entries()) {
        if (value instanceof File) continue;
        data2.append(key, value);
      }
    }
  }
  return data2;
}
async function sendFiles(ctx, rawUrl, files, fieldName) {
  if (!files.length || ctx.state.loading) return;
  const { state, form, host } = ctx;
  const url2 = resolveUrl(rawUrl, ctx.scope);
  if (!url2) {
    warn(`${config.prefix}upload precisa da URL de destino.`);
    return;
  }
  const bar = progressElement(host);
  const data2 = buildFileData(host, files, fieldName);
  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  paintProgress(bar, 0, "loading");
  emit2(form, "voodoo:upload", { url: url2, files, form, state });
  let ok = false;
  try {
    const method = (readOption2(host, "method") || "POST").trim().toUpperCase();
    const response = await http.upload(url2, data2, {
      method: method === "PUT" || method === "PATCH" ? method : "POST",
      onProgress: (percent) => {
        state.progress = percent;
        paintProgress(bar, percent, "loading");
        emit2(form, "voodoo:progress", { percent, form, state });
      }
    });
    ok = true;
    state.progress = 100;
    paintProgress(bar, 100, "done");
    handleSuccess(ctx, response, 200);
  } catch (err) {
    paintProgress(bar, state.progress, "error");
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}
defineDirective("upload", ({ el, scope, expression, cleanup }) => {
  const input = el;
  if (input.tagName !== "INPUT" || (input.getAttribute("type") || "").toLowerCase() !== "file") {
    warn(`${config.prefix}upload precisa de um <input type="file">.`);
    return;
  }
  ensureStyles2();
  const form = input.closest("form") ?? input;
  const state = ensureFormState(form);
  const ctx = { host: input, form, scope, state };
  const onChange = () => {
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    void sendFiles(ctx, expression, files, input.name || "file");
  };
  input.addEventListener("change", onChange);
  cleanup(() => input.removeEventListener("change", onChange));
});
defineDirective("dropzone", ({ el, scope, expression, cleanup }) => {
  ensureStyles2();
  el.classList.add("v-dropzone");
  if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  if (!el.hasAttribute("role")) el.setAttribute("role", "button");
  if (!el.textContent?.trim()) el.textContent = "Arraste arquivos aqui ou clique para escolher";
  const form = el.closest("form") ?? el;
  const state = ensureFormState(form);
  const ctx = { host: el, form, scope, state };
  const fieldName = readOption2(el, "field") || "file";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.hidden = true;
  picker.tabIndex = -1;
  if (el.hasAttribute("accept")) picker.accept = el.getAttribute("accept") ?? "";
  if (el.hasAttribute("multiple")) picker.multiple = true;
  el.appendChild(picker);
  const send = (files) => {
    if (!files.length) return;
    el.classList.add("v-dropzone-busy");
    el.classList.remove("v-dropzone-error");
    void sendFiles(ctx, expression, files, fieldName).finally(() => {
      el.classList.remove("v-dropzone-busy");
      if (!state.success) el.classList.add("v-dropzone-error");
    });
  };
  let depth = 0;
  const onDragEnter = (event) => {
    event.preventDefault();
    depth++;
    el.classList.add("v-dropzone-over");
  };
  const onDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) el.classList.remove("v-dropzone-over");
  };
  const onDrop = (event) => {
    event.preventDefault();
    depth = 0;
    el.classList.remove("v-dropzone-over");
    const files = Array.from(event.dataTransfer?.files ?? []);
    send(picker.multiple ? files : files.slice(0, 1));
  };
  const onClick = (event) => {
    if (event.target === picker) return;
    picker.click();
  };
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    picker.click();
  };
  const onPick = () => {
    const files = Array.from(picker.files ?? []);
    send(files);
    picker.value = "";
  };
  el.addEventListener("dragenter", onDragEnter);
  el.addEventListener("dragover", onDragOver);
  el.addEventListener("dragleave", onDragLeave);
  el.addEventListener("drop", onDrop);
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  picker.addEventListener("change", onPick);
  cleanup(() => {
    el.removeEventListener("dragenter", onDragEnter);
    el.removeEventListener("dragover", onDragOver);
    el.removeEventListener("dragleave", onDragLeave);
    el.removeEventListener("drop", onDrop);
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
    picker.removeEventListener("change", onPick);
    picker.remove();
  });
});
var AUTOSAVE_TEXTS = {
  idle: "",
  saving: "Salvando...",
  saved: "Alteracoes salvas",
  error: "Nao foi possivel salvar"
};
function autosaveStatusElement(host) {
  const selector = readOption2(host, "autosave-status");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`Elemento de ${config.prefix}autosave-status nao encontrado: ${selector}`);
  }
  const existing = host.querySelector(".v-autosave-status");
  if (existing) return existing;
  const status = document.createElement("span");
  status.className = "v-autosave-status";
  status.setAttribute("aria-live", "polite");
  host.appendChild(status);
  return status;
}
function paintAutosave(status, kind) {
  status.setAttribute("data-state", kind);
  status.textContent = AUTOSAVE_TEXTS[kind];
}
defineDirective("autosave", ({ el, scope, expression, modifiers, cleanup }) => {
  ensureStyles2();
  const form = el;
  const state = ensureFormState(form);
  const ctx = { host: form, form, scope, state };
  const status = autosaveStatusElement(form);
  const rawDelay = (typeof modifiers.delay === "string" ? modifiers.delay : null) ?? Object.keys(modifiers).find((name) => /^[\d.]+(ms|s|m)?$/.test(name)) ?? readOption2(form, "autosave-delay") ?? 1e3;
  const delay = parseDuration(rawDelay, 1e3);
  const save = async () => {
    const url2 = resolveUrl(expression, scope);
    if (!url2) {
      warn(`${config.prefix}autosave precisa da URL de destino.`);
      return;
    }
    if (state.loading) return;
    state.saving = true;
    paintAutosave(status, "saving");
    const method = (readOption2(form, "method") || "POST").trim().toUpperCase();
    try {
      const response = await request({
        url: url2,
        method,
        body: serializeForm(form, { formData: hasOption(form, "form-data") })
      });
      state.data = response.data;
      state.status = response.status;
      state.dirty = false;
      state.success = true;
      paintAutosave(status, "saved");
      runCallback(ctx, "on-success", response.data, { status: response.status });
      emit2(form, "voodoo:autosave", { data: response.data, status: response.status, form, state });
    } catch (err) {
      paintAutosave(status, "error");
      handleFailure(ctx, err);
    } finally {
      state.saving = false;
    }
  };
  const schedule = debounce(() => {
    void save();
  }, delay);
  const onChange = () => {
    state.dirty = true;
    schedule();
  };
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);
  cleanup(() => {
    schedule.cancel();
    form.removeEventListener("input", onChange);
    form.removeEventListener("change", onChange);
  });
});
defineDirective("guard", ({ el, expression, cleanup }) => {
  const form = (el.tagName === "FORM" ? el : el.closest("form")) ?? el;
  const state = ensureFormState(form);
  const message = expression.trim() || "Existem alteracoes que ainda nao foram salvas.";
  const onChange = () => {
    state.dirty = true;
  };
  const onClean = () => {
    state.dirty = false;
  };
  const onBeforeUnload = (event) => {
    if (!state.dirty || state.loading) return;
    event.preventDefault();
    event.returnValue = message;
  };
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);
  form.addEventListener("reset", onClean);
  form.addEventListener("voodoo:success", onClean);
  window.addEventListener("beforeunload", onBeforeUnload);
  cleanup(() => {
    form.removeEventListener("input", onChange);
    form.removeEventListener("change", onChange);
    form.removeEventListener("reset", onClean);
    form.removeEventListener("voodoo:success", onClean);
    window.removeEventListener("beforeunload", onBeforeUnload);
  });
});

// src/directives/state.ts
function serializable(source) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "function") continue;
    if (key.startsWith("$")) continue;
    try {
      JSON.stringify(value);
      out[key] = toRaw(value);
    } catch {
    }
  }
  return out;
}
function autoKey(el, prefix) {
  if (el.id) return `${prefix}:${location.pathname}:#${el.id}`;
  const path = [];
  let current2 = el;
  while (current2 && current2 !== document.body) {
    const parent = current2.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current2) : 0;
    path.unshift(`${current2.tagName.toLowerCase()}${index}`);
    current2 = parent;
  }
  return `${prefix}:${location.pathname}:${path.join(">")}`;
}
defineDirective(
  "persist",
  ({ el, scope, expression, cleanup }) => {
    const key = expression.trim() ? `voodoo:persist:${expression.trim()}` : autoKey(el, "voodoo:persist");
    const saved = storage.get(key);
    if (saved && typeof saved === "object") {
      for (const [prop, value] of Object.entries(saved)) {
        if (prop in scope.data) scope.data[prop] = value;
      }
    }
    const save = debounce(() => {
      storage.set(key, serializable(scope.data));
    }, 120);
    const stopWatching = watch(scope.data, () => save(), { deep: true });
    save();
    cleanup(() => {
      save.flush();
      stopWatching();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
defineDirective(
  "sync",
  ({ el, scope, expression, cleanup }) => {
    if (typeof BroadcastChannel === "undefined") return;
    const name = expression.trim() || autoKey(el, "voodoo:sync");
    const channel = new BroadcastChannel(name);
    const senderId = Math.random().toString(36).slice(2);
    let applyingRemote = false;
    const send = debounce(() => {
      if (applyingRemote) return;
      try {
        channel.postMessage({ from: senderId, state: serializable(scope.data) });
      } catch (err) {
        handleError(err, "v-sync");
      }
    }, 60);
    channel.addEventListener("message", (event) => {
      const payload = event.data;
      if (!payload || payload.from === senderId) return;
      applyingRemote = true;
      for (const [prop, value] of Object.entries(payload.state)) {
        if (prop in scope.data && scope.data[prop] !== value) scope.data[prop] = value;
      }
      queueMicrotask(() => {
        applyingRemote = false;
      });
    });
    const stopWatching = watch(scope.data, () => send(), { deep: true });
    cleanup(() => {
      stopWatching();
      channel.close();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
var controllers = /* @__PURE__ */ new WeakMap();
function findController(el) {
  let current2 = el;
  while (current2) {
    const found = controllers.get(current2);
    if (found) return found;
    current2 = current2.parentElement;
  }
  return null;
}
defineDirective(
  "history",
  ({ el, scope, expression, cleanup }) => {
    const limit = Number(expression) || 50;
    const snapshots = [
      JSON.parse(JSON.stringify(serializable(scope.data)))
    ];
    let position = 0;
    let restoring = false;
    const controller = reactive({
      canUndo: false,
      canRedo: false,
      size: 1,
      undo() {
        if (position <= 0) return;
        position--;
        apply();
      },
      redo() {
        if (position >= snapshots.length - 1) return;
        position++;
        apply();
      },
      clear() {
        snapshots.length = 0;
        snapshots.push(JSON.parse(JSON.stringify(serializable(scope.data))));
        position = 0;
        sync();
      }
    });
    function sync() {
      controller.canUndo = position > 0;
      controller.canRedo = position < snapshots.length - 1;
      controller.size = snapshots.length;
    }
    function apply() {
      restoring = true;
      const snapshot = snapshots[position];
      for (const [prop, value] of Object.entries(snapshot)) {
        scope.data[prop] = JSON.parse(JSON.stringify(value));
      }
      sync();
      queueMicrotask(() => {
        restoring = false;
      });
    }
    const record = debounce(() => {
      if (restoring) return;
      const current2 = JSON.stringify(serializable(scope.data));
      if (current2 === JSON.stringify(snapshots[position])) return;
      snapshots.splice(position + 1);
      snapshots.push(JSON.parse(current2));
      if (snapshots.length > limit) snapshots.shift();
      position = snapshots.length - 1;
      sync();
    }, parseDuration(el.getAttribute("v-history-debounce") ?? void 0, 300));
    const stopWatching = watch(scope.data, () => record(), { deep: true });
    controllers.set(el, controller);
    scope.set("$history", controller);
    cleanup(() => {
      stopWatching();
      record.cancel();
      controllers.delete(el);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("undo", ({ el, cleanup }) => {
  const handler = () => findController(el)?.undo();
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective("redo", ({ el, cleanup }) => {
  const handler = () => findController(el)?.redo();
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective("storage", ({ el, expression, cleanup, scope }) => {
  const key = expression.trim();
  if (!key) return;
  const input = el;
  const saved = storage.get(`voodoo:field:${key}`);
  if (saved != null && "value" in input) input.value = String(saved);
  const handler = () => {
    storage.set(`voodoo:field:${key}`, input.value);
  };
  input.addEventListener("input", handler);
  cleanup(() => input.removeEventListener("input", handler));
});
magic("$history", (scope) => scope.el ? findController(scope.el) : null);

// src/sound/index.ts
var contexto = null;
var volumeGeral = 0.35;
var silenciado = false;
var carregouPreferencia = false;
var CHAVE_VOLUME = "voodoo:sound:volume";
var CHAVE_SILENCIO = "voodoo:sound:muted";
function carregarPreferencia() {
  if (carregouPreferencia) return;
  carregouPreferencia = true;
  const salvo = storage.get(CHAVE_VOLUME);
  if (typeof salvo === "number" && salvo >= 0 && salvo <= 1) volumeGeral = salvo;
  const mudo = storage.get(CHAVE_SILENCIO);
  if (typeof mudo === "boolean") silenciado = mudo;
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches && storage.get(CHAVE_VOLUME) === void 0) {
    volumeGeral = 0.18;
  }
}
function obterContexto() {
  if (typeof window === "undefined") return null;
  if (contexto) {
    if (contexto.state === "suspended") void contexto.resume();
    return contexto;
  }
  const Construtor = window.AudioContext ?? window.webkitAudioContext;
  if (!Construtor) return null;
  try {
    contexto = new Construtor();
    return contexto;
  } catch {
    return null;
  }
}
function tocarCamada(ctx, camada, volumeDoEfeito) {
  const inicio = ctx.currentTime + (camada.atraso ?? 0);
  const fim = inicio + camada.duracao;
  const oscilador = ctx.createOscillator();
  oscilador.type = camada.forma ?? "sine";
  oscilador.frequency.setValueAtTime(camada.frequencia, inicio);
  if (camada.ate !== void 0 && camada.ate !== camada.frequencia) {
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(1, camada.ate), fim);
  }
  const ganho = ctx.createGain();
  const pico = volumeGeral * volumeDoEfeito * (camada.volume ?? 1);
  const ataque = camada.ataque ?? 8e-3;
  ganho.gain.setValueAtTime(1e-4, inicio);
  ganho.gain.exponentialRampToValueAtTime(Math.max(1e-4, pico), inicio + ataque);
  ganho.gain.exponentialRampToValueAtTime(1e-4, fim);
  oscilador.connect(ganho);
  ganho.connect(ctx.destination);
  oscilador.start(inicio);
  oscilador.stop(fim + 0.02);
}
var efeitos = {
  /** Toque seco de confirmacao, para botoes comuns. */
  click: {
    volume: 0.5,
    camadas: [{ frequencia: 660, ate: 440, duracao: 0.06, forma: "triangle" }]
  },
  /** Estalo curto e agudo, bom para alternar algo. */
  pop: {
    volume: 0.5,
    camadas: [{ frequencia: 880, ate: 1320, duracao: 0.07, forma: "sine" }]
  },
  /** Roce leve, para passar o mouse por cima. */
  hover: {
    volume: 0.22,
    camadas: [{ frequencia: 1200, duracao: 0.035, forma: "sine" }]
  },
  /** Duas notas subindo, para dar certo. */
  success: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 783.99, duracao: 0.18, forma: "sine", atraso: 0.09 }
    ]
  },
  /** Tres notas subindo, para conclusao de fluxo. */
  complete: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 659.25, duracao: 0.1, forma: "sine", atraso: 0.09 },
      { frequencia: 1046.5, duracao: 0.22, forma: "sine", atraso: 0.18 }
    ]
  },
  /** Duas notas descendo, para erro. */
  error: {
    volume: 0.6,
    camadas: [
      { frequencia: 392, duracao: 0.12, forma: "square", volume: 0.5 },
      { frequencia: 261.63, duracao: 0.24, forma: "square", volume: 0.5, atraso: 0.1 }
    ]
  },
  /** Aviso curto de atencao. */
  warning: {
    volume: 0.55,
    camadas: [
      { frequencia: 587.33, duracao: 0.1, forma: "triangle" },
      { frequencia: 587.33, duracao: 0.14, forma: "triangle", atraso: 0.14 }
    ]
  },
  /** Sino discreto, para notificacao que chega. */
  notify: {
    volume: 0.5,
    camadas: [
      { frequencia: 987.77, duracao: 0.14, forma: "sine" },
      { frequencia: 1318.51, duracao: 0.3, forma: "sine", atraso: 0.08, volume: 0.6 }
    ]
  },
  /** Toque bem curto para digitacao. */
  type: {
    volume: 0.18,
    camadas: [{ frequencia: 2200, duracao: 0.018, forma: "square" }]
  },
  /** Deslizar de abertura, para painel, gaveta e modal. */
  open: {
    volume: 0.4,
    camadas: [{ frequencia: 330, ate: 660, duracao: 0.14, forma: "sine" }]
  },
  /** Deslizar de fechamento. */
  close: {
    volume: 0.4,
    camadas: [{ frequencia: 660, ate: 330, duracao: 0.14, forma: "sine" }]
  },
  /** Recusa curta, para acao bloqueada. */
  deny: {
    volume: 0.5,
    camadas: [
      { frequencia: 220, duracao: 0.08, forma: "square", volume: 0.5 },
      { frequencia: 180, duracao: 0.12, forma: "square", volume: 0.5, atraso: 0.07 }
    ]
  },
  /** Moeda, para pontuacao e recompensa. */
  coin: {
    volume: 0.45,
    camadas: [
      { frequencia: 987.77, duracao: 0.06, forma: "square" },
      { frequencia: 1318.51, duracao: 0.16, forma: "square", atraso: 0.05 }
    ]
  },
  /** Passagem de nivel, mais festiva. */
  levelup: {
    volume: 0.55,
    camadas: [
      { frequencia: 523.25, duracao: 0.08, forma: "square" },
      { frequencia: 659.25, duracao: 0.08, forma: "square", atraso: 0.07 },
      { frequencia: 783.99, duracao: 0.08, forma: "square", atraso: 0.14 },
      { frequencia: 1046.5, duracao: 0.26, forma: "square", atraso: 0.21 }
    ]
  },
  /** Batida grave, para arrastar e soltar. */
  drop: {
    volume: 0.5,
    camadas: [{ frequencia: 180, ate: 90, duracao: 0.12, forma: "triangle" }]
  }
};
var NOTAS = {
  do: 261.63,
  "do#": 277.18,
  re: 293.66,
  "re#": 311.13,
  mi: 329.63,
  fa: 349.23,
  "fa#": 369.99,
  sol: 392,
  "sol#": 415.3,
  la: 440,
  "la#": 466.16,
  si: 493.88,
  // Nomes em ingles, para quem prefere.
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  g: 392,
  a: 440,
  b: 493.88
};
function frequenciaDaNota(nome) {
  const limpo = String(nome).trim().toLowerCase();
  const casamento = /^([a-z]+#?)(\d)?$/.exec(limpo);
  if (!casamento) return null;
  const base = NOTAS[casamento[1]];
  if (base === void 0) return null;
  const oitava = casamento[2] ? Number(casamento[2]) : 4;
  return base * 2 ** (oitava - 4);
}
var arquivos = /* @__PURE__ */ new Map();
function tocarArquivo(url2, volume) {
  let elemento = arquivos.get(url2);
  if (!elemento) {
    elemento = new Audio(url2);
    elemento.preload = "auto";
    arquivos.set(url2, elemento);
  }
  elemento.volume = Math.max(0, Math.min(1, volumeGeral * volume));
  elemento.currentTime = 0;
  void elemento.play().catch(() => {
  });
}
function pareceCaminho(valor) {
  return /^(https?:)?\/\//.test(valor) || /^[./]/.test(valor) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(valor);
}
var sound = {
  /**
   * Toca um efeito pelo nome, ou um arquivo pelo caminho.
   *
   * ```js
   * V.sound.play('success')
   * V.sound.play('/audio/ding.mp3')
   * V.sound.play('click', { volume: 0.5 })
   * ```
   */
  play(nome, opcoes = {}) {
    carregarPreferencia();
    if (silenciado || !nome) return;
    const valor = String(nome).trim();
    const volume = opcoes.volume ?? 1;
    if (pareceCaminho(valor)) {
      tocarArquivo(valor, volume);
      return;
    }
    const efeito = efeitos[valor];
    if (!efeito) {
      const frequencia = frequenciaDaNota(valor);
      if (frequencia !== null) this.tone(frequencia, 200, { volume });
      return;
    }
    const ctx = obterContexto();
    if (!ctx) return;
    const tom = opcoes.tom ?? 1;
    const volumeDoEfeito = (efeito.volume ?? 1) * volume;
    for (const camada of efeito.camadas) {
      tocarCamada(
        ctx,
        tom === 1 ? camada : {
          ...camada,
          frequencia: camada.frequencia * tom,
          ate: camada.ate === void 0 ? void 0 : camada.ate * tom
        },
        volumeDoEfeito
      );
    }
  },
  /**
   * Toca uma frequencia pura.
   *
   * ```js
   * V.sound.tone(440, 300)
   * ```
   *
   * @param frequencia hertz
   * @param duracao milissegundos
   */
  tone(frequencia, duracao = 200, opcoes = {}) {
    carregarPreferencia();
    if (silenciado) return;
    const ctx = obterContexto();
    if (!ctx) return;
    tocarCamada(
      ctx,
      { frequencia, duracao: duracao / 1e3, forma: opcoes.forma ?? "sine" },
      opcoes.volume ?? 0.5
    );
  },
  /**
   * Toca uma nota pelo nome.
   *
   * ```js
   * V.sound.note('la', 300)
   * V.sound.note('do5', 200)
   * ```
   */
  note(nome, duracao = 250, opcoes = {}) {
    const frequencia = frequenciaDaNota(nome);
    if (frequencia === null) return;
    this.tone(frequencia, duracao, opcoes);
  },
  /**
   * Toca uma sequencia de notas.
   *
   * ```js
   * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
   * ```
   *
   * @param notas nomes de nota, ou frequencias em hertz
   * @param intervalo milissegundos entre uma nota e a seguinte
   */
  melody(notas, intervalo = 150, opcoes = {}) {
    carregarPreferencia();
    if (silenciado) return;
    notas.forEach((nota, indice) => {
      const frequencia = typeof nota === "number" ? nota : frequenciaDaNota(nota);
      if (frequencia === null) return;
      setTimeout(() => this.tone(frequencia, intervalo * 1.6, opcoes), indice * intervalo);
    });
  },
  /**
   * Le ou ajusta o volume geral, de 0 a 1. A escolha fica guardada.
   *
   * ```js
   * V.sound.volume()      // le
   * V.sound.volume(0.6)   // ajusta
   * ```
   */
  volume(valor) {
    carregarPreferencia();
    if (valor === void 0) return volumeGeral;
    volumeGeral = Math.max(0, Math.min(1, valor));
    storage.set(CHAVE_VOLUME, volumeGeral);
    return volumeGeral;
  },
  /** Silencia. Passe `false` para voltar a tocar. */
  mute(valor = true) {
    carregarPreferencia();
    silenciado = valor;
    storage.set(CHAVE_SILENCIO, silenciado);
  },
  /** Volta a tocar. */
  unmute() {
    this.mute(false);
  },
  /** Alterna entre silencio e som, e devolve o novo estado. */
  toggle() {
    carregarPreferencia();
    this.mute(!silenciado);
    return silenciado;
  },
  /** `true` quando esta silenciado. */
  get muted() {
    carregarPreferencia();
    return silenciado;
  },
  /** Nomes de todos os efeitos disponiveis. */
  get names() {
    return Object.keys(efeitos);
  },
  /**
   * Registra um efeito proprio.
   *
   * ```js
   * V.sound.define('meuAviso', {
   *   volume: 0.5,
   *   camadas: [
   *     { frequencia: 700, duracao: 0.1 },
   *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
   *   ]
   * })
   * ```
   */
  define(nome, efeito) {
    efeitos[nome] = efeito;
  },
  /** Carrega um arquivo antes da hora, para nao atrasar no primeiro toque. */
  preload(...urls) {
    for (const url2 of urls) {
      if (arquivos.has(url2)) continue;
      const elemento = new Audio(url2);
      elemento.preload = "auto";
      arquivos.set(url2, elemento);
    }
  }
};
defineDirective("sound", ({ el, arg, expression, modifiers, scope, cleanup, evaluate: evaluate2 }) => {
  const evento = arg || "click";
  const resolver = () => {
    const bruto = expression.trim();
    if (!bruto) return "click";
    if (efeitos[bruto] || pareceCaminho(bruto) || frequenciaDaNota(bruto) !== null) return bruto;
    const valor = evaluate2();
    return typeof valor === "string" ? valor : bruto;
  };
  const volume = modifiers.volume !== void 0 ? Number(modifiers.volume) : void 0;
  const tocar = () => {
    sound.play(resolver(), volume === void 0 ? {} : { volume });
  };
  el.addEventListener(evento, tocar);
  cleanup(() => el.removeEventListener(evento, tocar));
});
defineDirective("mute", ({ el, cleanup }) => {
  const sincronizar = () => {
    const mudo = sound.muted;
    el.setAttribute("aria-pressed", String(mudo));
    el.classList.toggle("v-muted", mudo);
  };
  const alternar = () => {
    sound.toggle();
    sincronizar();
    if (!sound.muted) sound.play("pop");
  };
  el.addEventListener("click", alternar);
  sincronizar();
  cleanup(() => el.removeEventListener("click", alternar));
});
magic("$sound", () => sound);

// src/ui/palette.ts
var HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]?$/i;
var HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i;
var RGB_FUNCTION = /^rgba?\(([^)]+)\)$/i;
var HSL_FUNCTION = /^hsla?\(([^)]+)\)$/i;
function numbers(body) {
  return body.split(/[\s,/]+/).map((part) => parseFloat(part)).filter((value) => !Number.isNaN(value));
}
function hslToRgb(h, s, l) {
  const hue = (h % 360 + 360) % 360;
  const sat = clamp(s / 100, 0, 1);
  const lig = clamp(l / 100, 0, 1);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = lig - c / 2;
  const sector = Math.floor(hue / 60) % 6;
  const table = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x]
  ];
  const [r, g, b] = table[sector];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function parseColor(input) {
  const text = String(input ?? "").trim();
  if (!text) return null;
  const short = HEX_SHORT.exec(text);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16)
    };
  }
  const long = HEX_LONG.exec(text);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16)
    };
  }
  const rgb = RGB_FUNCTION.exec(text);
  if (rgb) {
    const [r, g, b] = numbers(rgb[1]);
    if (r === void 0 || g === void 0 || b === void 0) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) };
  }
  const hsl = HSL_FUNCTION.exec(text);
  if (hsl) {
    const [h, s, l] = numbers(hsl[1]);
    if (h === void 0 || s === void 0 || l === void 0) return null;
    return hslToRgb(h, s, l);
  }
  return null;
}
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function toLinear(channel) {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function toGamma(value) {
  const v = value <= 31308e-7 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return v;
}
function rgbToOklab(color) {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const lms1 = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lms2 = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lms3 = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(lms1);
  const m = Math.cbrt(lms2);
  const s = Math.cbrt(lms3);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}
function oklabToRaw(lab) {
  const l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;
  return {
    r: toGamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: toGamma(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: toGamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)
  };
}
function rgbToOklch(color) {
  const lab = rgbToOklab(color);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h: c < 1e-5 ? 0 : h };
}
function oklchToRaw(color) {
  const rad = color.h * Math.PI / 180;
  return oklabToRaw({ l: color.l, a: Math.cos(rad) * color.c, b: Math.sin(rad) * color.c });
}
function oklchToRgb(color) {
  let chroma = Math.max(0, color.c);
  for (let i = 0; i < 32; i++) {
    const raw = oklchToRaw({ l: clamp(color.l, 0, 1), c: chroma, h: color.h });
    if (raw.r >= -1e-3 && raw.r <= 1.001 && raw.g >= -1e-3 && raw.g <= 1.001 && raw.b >= -1e-3 && raw.b <= 1.001) {
      return {
        r: Math.round(clamp(raw.r, 0, 1) * 255),
        g: Math.round(clamp(raw.g, 0, 1) * 255),
        b: Math.round(clamp(raw.b, 0, 1) * 255)
      };
    }
    chroma *= 0.92;
  }
  const gray = oklchToRaw({ l: clamp(color.l, 0, 1), c: 0, h: color.h });
  return {
    r: Math.round(clamp(gray.r, 0, 1) * 255),
    g: Math.round(clamp(gray.g, 0, 1) * 255),
    b: Math.round(clamp(gray.b, 0, 1) * 255)
  };
}
function pad(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}
function toHex(color) {
  return `#${pad(color.r)}${pad(color.g)}${pad(color.b)}`;
}
function toRgba(color, alpha) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(alpha.toFixed(3))})`;
}
function oklchToHex(color) {
  return toHex(oklchToRgb(color));
}
function relativeLuminance(color) {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}
function contrastRatio(a, b) {
  const first = typeof a === "string" ? parseColor(a) : a;
  const second = typeof b === "string" ? parseColor(b) : b;
  if (!first || !second) return 1;
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}
var WHITE = { r: 255, g: 255, b: 255 };
var BLACK = { r: 0, g: 0, b: 0 };
function contrastText(color) {
  const base = typeof color === "string" ? parseColor(color) : color;
  if (!base) return "#ffffff";
  return contrastRatio(base, WHITE) >= contrastRatio(base, BLACK) ? "#ffffff" : "#000000";
}
var SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
var LIGHT_L = [0.973, 0.941, 0.889, 0.819, 0.732, 0.638, 0.558, 0.478, 0.399, 0.327];
var LIGHT_C = [0.14, 0.26, 0.46, 0.68, 0.88, 1, 0.97, 0.89, 0.78, 0.65];
var DARK_L = [0.244, 0.286, 0.343, 0.408, 0.484, 0.588, 0.668, 0.748, 0.836, 0.928];
var DARK_C = [0.3, 0.42, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.57, 0.33];
function colorScale(color, dark = false) {
  const rgb = typeof color === "string" ? parseColor(color) ?? BLACK : color;
  const base = rgbToOklch(rgb);
  const lightness = dark ? DARK_L : LIGHT_L;
  const chroma = dark ? DARK_C : LIGHT_C;
  const out = {};
  SCALE_STEPS.forEach((step, index) => {
    out[String(step)] = oklchToHex({
      l: lightness[index],
      c: base.c * chroma[index],
      h: base.h
    });
  });
  return out;
}
var presets = {
  violeta: {
    primary: "#6D3BF5",
    accent: "#FF3D8B",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#E11D48",
    info: "#7C6BFF"
  },
  oceano: {
    primary: "#0E7BC4",
    accent: "#0FB5C9",
    success: "#0F9D6E",
    warning: "#D08700",
    danger: "#DC2F3E",
    info: "#3B82F6"
  },
  floresta: {
    primary: "#1F8A4C",
    accent: "#7FA80E",
    success: "#18A05A",
    warning: "#C97A0A",
    danger: "#C93A2E",
    info: "#2C8FA8"
  },
  poente: {
    primary: "#E4632A",
    accent: "#D62F63",
    success: "#3E9B52",
    warning: "#D99000",
    danger: "#D32F2F",
    info: "#B45FC0"
  },
  grafite: {
    primary: "#4C5A70",
    accent: "#2E7FD1",
    success: "#2F8F60",
    warning: "#B57A12",
    danger: "#C2453F",
    info: "#5B7A99"
  }
};
var ROLES = ["primary", "accent", "success", "warning", "danger", "info"];
var STORAGE_KEY = "voodoo:palette";
var STYLE_ID = "voodoo-palette";
var DEFAULT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
var DEFAULT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
function fontStack(font, fallback) {
  const name = (font ?? "").trim();
  if (!name) return fallback;
  if (name.includes(",")) return name;
  const quoted = /^['"]/.test(name) ? name : `'${name}'`;
  return `${quoted}, ${fallback}`;
}
var RADIUS_PATTERN = /^([\d.]+)(px|rem|em)$/;
function radiusScale(radius) {
  const text = (radius || "12px").trim();
  const match = RADIUS_PATTERN.exec(text);
  if (!match) {
    return {
      "--v-radius": text,
      "--v-radius-sm": `calc(${text} * 0.6)`,
      "--v-radius-lg": `calc(${text} * 1.5)`,
      "--v-radius-xl": `calc(${text} * 2)`,
      "--v-radius-full": "999px"
    };
  }
  const value = parseFloat(match[1]);
  const unit = match[2];
  const round = (n) => `${Math.round(n * 1e3) / 1e3}${unit}`;
  return {
    "--v-radius": round(value),
    "--v-radius-sm": round(Math.max(value * 0.55, 0)),
    "--v-radius-lg": round(value * 1.5),
    "--v-radius-xl": round(value * 2),
    "--v-radius-full": "999px"
  };
}
function buildTheme(colors, dark) {
  const vars = {};
  const scales = {};
  const contrast = {};
  for (const role of ROLES) {
    const rgb = parseColor(colors[role]) ?? BLACK;
    const base = rgbToOklch(rgb);
    const scale = colorScale(rgb, dark);
    scales[role] = scale;
    for (const step of SCALE_STEPS) {
      vars[`--v-${role}-${step}`] = scale[String(step)];
    }
    const main = dark ? { l: Math.max(base.l, 0.62), c: base.c * 0.95, h: base.h } : base;
    const hover = dark ? { l: Math.min(main.l + 0.07, 0.94), c: main.c * 0.95, h: main.h } : { l: Math.max(main.l - 0.055, 0.12), c: main.c, h: main.h };
    const active = dark ? { l: Math.min(main.l + 0.13, 0.97), c: main.c * 0.88, h: main.h } : { l: Math.max(main.l - 0.105, 0.1), c: main.c, h: main.h };
    const mainRgb = oklchToRgb(main);
    const hoverRgb = oklchToRgb(hover);
    const activeRgb = oklchToRgb(active);
    vars[`--v-${role}`] = dark ? toHex(mainRgb) : toHex(rgb);
    vars[`--v-${role}-hover`] = toHex(hoverRgb);
    vars[`--v-${role}-active`] = toHex(activeRgb);
    vars[`--v-${role}-contrast`] = contrastText(dark ? mainRgb : rgb);
    vars[`--v-${role}-contrast-hover`] = contrastText(hoverRgb);
    vars[`--v-${role}-contrast-active`] = contrastText(activeRgb);
    const soft = scale["50"];
    const softHover = scale["100"];
    const softText = dark ? scale["800"] : scale["700"];
    vars[`--v-${role}-soft`] = soft;
    vars[`--v-${role}-soft-hover`] = softHover;
    vars[`--v-${role}-soft-text`] = softText;
    vars[`--v-${role}-ring`] = toRgba(mainRgb, dark ? 0.45 : 0.32);
    vars[`--v-${role}-border`] = dark ? scale["300"] : scale["200"];
    contrast[role] = vars[`--v-${role}-contrast`];
  }
  const neutralRgb = parseColor(colors.neutral ?? colors.primary) ?? BLACK;
  const hue = rgbToOklch(neutralRgb).h;
  const neutral = (l, c) => oklchToHex({ l, c, h: hue });
  const neutralScale = {};
  SCALE_STEPS.forEach((step, index) => {
    const lightnessList = dark ? DARK_L : LIGHT_L;
    neutralScale[String(step)] = neutral(lightnessList[index], 0.012);
    vars[`--v-neutral-${step}`] = neutralScale[String(step)];
  });
  scales.neutral = neutralScale;
  if (dark) {
    vars["--v-surface"] = neutral(0.248, 0.021);
    vars["--v-surface-2"] = neutral(0.196, 0.021);
    vars["--v-surface-3"] = neutral(0.305, 0.024);
    vars["--v-surface-inset"] = neutral(0.17, 0.02);
    vars["--v-text"] = neutral(0.965, 8e-3);
    vars["--v-text-muted"] = neutral(0.748, 0.017);
    vars["--v-text-soft"] = neutral(0.63, 0.017);
    vars["--v-border"] = neutral(0.355, 0.023);
    vars["--v-border-strong"] = neutral(0.46, 0.026);
    vars["--v-overlay"] = "rgba(0, 0, 0, 0.62)";
    vars["--v-shadow-sm"] = "0 1px 2px rgba(0, 0, 0, 0.5)";
    vars["--v-shadow"] = "0 10px 30px rgba(0, 0, 0, 0.5)";
    vars["--v-shadow-lg"] = "0 24px 60px rgba(0, 0, 0, 0.62)";
  } else {
    const inkRgb = oklchToRgb({ l: 0.24, c: 0.028, h: hue });
    vars["--v-surface"] = neutral(1, 0);
    vars["--v-surface-2"] = neutral(0.981, 6e-3);
    vars["--v-surface-3"] = neutral(0.955, 9e-3);
    vars["--v-surface-inset"] = neutral(0.968, 8e-3);
    vars["--v-text"] = toHex(inkRgb);
    vars["--v-text-muted"] = neutral(0.53, 0.023);
    vars["--v-text-soft"] = neutral(0.655, 0.018);
    vars["--v-border"] = neutral(0.906, 0.012);
    vars["--v-border-strong"] = neutral(0.828, 0.016);
    vars["--v-overlay"] = toRgba(inkRgb, 0.45);
    vars["--v-shadow-sm"] = `0 1px 2px ${toRgba(inkRgb, 0.08)}`;
    vars["--v-shadow"] = `0 10px 30px ${toRgba(inkRgb, 0.14)}`;
    vars["--v-shadow-lg"] = `0 24px 60px ${toRgba(inkRgb, 0.2)}`;
  }
  vars["--v-focus-ring"] = vars["--v-primary-ring"];
  contrast.surface = contrastText(parseColor(vars["--v-surface"]) ?? WHITE);
  return { vars, scales, contrast };
}
function block(selector, vars) {
  const body = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`).join("\n");
  return `${selector} {
${body}
}`;
}
var current = null;
var currentOptions = null;
function resolveOptions(options) {
  const preset = presets[options.preset] ?? presets.violeta;
  const colors = {
    primary: options.primary ?? preset.primary,
    accent: options.accent ?? preset.accent,
    success: options.success ?? preset.success,
    warning: options.warning ?? preset.warning,
    danger: options.danger ?? preset.danger,
    info: options.info ?? preset.info,
    neutral: options.neutral ?? preset.neutral
  };
  for (const role of ROLES) {
    if (parseColor(colors[role])) continue;
    console.warn(`[Voodoo] cor invalida em palette.${role}: "${colors[role]}". Usando o preset.`);
    colors[role] = preset[role];
  }
  return {
    colors,
    radius: options.radius ?? "12px",
    font: fontStack(options.font, DEFAULT_FONT),
    mono: fontStack(options.monoFont, DEFAULT_MONO)
  };
}
function writeStyle(css) {
  if (typeof document === "undefined") return;
  if (!config.injectStyles) return;
  ensureTokens();
  let element = document.getElementById(STYLE_ID);
  if (!element) {
    element = document.createElement("style");
    element.id = STYLE_ID;
    element.setAttribute("data-voodoo", "palette");
    document.head.appendChild(element);
  }
  element.textContent = css;
}
function applyPalette(options = {}) {
  const { colors, radius, font, mono } = resolveOptions(options);
  const light = buildTheme(colors, false);
  const dark = buildTheme(colors, true);
  const shared = {
    ...radiusScale(radius),
    "--v-font-sans": font,
    "--v-font-mono": mono
  };
  const css = [
    "/* Paleta gerada por V.palette(). Nao edite a mao. */",
    block(":root", { ...shared, ...light.vars }),
    `@media (prefers-color-scheme: dark) {
${block(':root:not([data-theme="light"])', dark.vars)}
}`,
    block(':root[data-theme="dark"]', dark.vars)
  ].join("\n");
  writeStyle(css);
  const resolved = {
    colors,
    radius,
    font,
    monoFont: mono,
    light: light.scales,
    dark: dark.scales,
    contrast: light.contrast,
    css
  };
  current = resolved;
  currentOptions = { ...options };
  if (options.persist !== false && typeof document !== "undefined") {
    const saved = { ...options };
    delete saved.persist;
    storage.set(STORAGE_KEY, saved);
  }
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("voodoo:palette", { detail: resolved }));
  }
  return resolved;
}
var initialized2 = false;
function initPalette() {
  if (current && initialized2) return current;
  initialized2 = true;
  const saved = storage.get(STORAGE_KEY);
  const options = saved && typeof saved === "object" ? { ...saved, persist: false } : { persist: false };
  return applyPalette(options);
}
function ensurePalette() {
  if (current) return;
  initPalette();
}
var palette = Object.assign(applyPalette, {
  /** Presets prontos, indexados pelo nome. */
  presets,
  /** Nomes dos presets disponiveis. */
  get names() {
    return Object.keys(presets);
  },
  /** Paleta em uso, ou `null` antes da primeira aplicacao. */
  get current() {
    return current;
  },
  /** Opcoes usadas na ultima aplicacao. */
  get options() {
    return currentOptions;
  },
  /** Aplica a paleta salva, ou o padrao quando nao ha nada salvo. */
  init: initPalette,
  /** Garante que as variaveis existam, sem sobrescrever o que ja foi aplicado. */
  ensure: ensurePalette,
  /** Volta ao preset padrao e apaga a escolha salva. */
  reset() {
    storage.remove(STORAGE_KEY);
    return applyPalette({ persist: false });
  },
  /** Troca apenas o preset, mantendo raio e fonte atuais. */
  use(name) {
    return applyPalette({ ...currentOptions ?? {}, preset: name, primary: void 0, accent: void 0 });
  },
  /** Escala de tons de uma cor qualquer. */
  scale: colorScale,
  /** Preto ou branco, conforme o melhor contraste WCAG sobre a cor. */
  contrastText,
  /** Razao de contraste WCAG entre duas cores. */
  contrastRatio,
  /** Luminancia relativa WCAG de uma cor. */
  luminance(color) {
    const rgb = typeof color === "string" ? parseColor(color) : color;
    return rgb ? relativeLuminance(rgb) : 0;
  },
  /** Conversores expostos para quem quiser gerar cores derivadas. */
  convert: { parseColor, rgbToOklch, oklchToRgb, toHex, toRgba }
});

// src/ui/dialog.ts
var labels = {
  confirm: "Confirmar",
  cancel: "Cancelar",
  ok: "OK",
  close: "Fechar",
  confirmQuestion: "Tem certeza?",
  required: "Preencha este campo."
};
var settings2 = {
  /** Duracao da animacao de entrada e saida, em milissegundos. */
  duration: 220,
  /** Tamanho padrao dos dialogos criados por `dialog()`. */
  size: "md"
};
var CSS4 = `
[v-modal-content]:not(.v-dialog-open),[data-v-modal-content]:not(.v-dialog-open){display:none}

.v-dialog-root{position:fixed;inset:0;z-index:calc(var(--v-z-modal,1000) + var(--v-dialog-layer,0));
  display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;
  overscroll-behavior:contain;font-family:var(--v-font-sans,system-ui,sans-serif)}
.v-dialog-root[data-position="top"]{align-items:flex-start;padding-top:min(12vh,96px)}

.v-dialog-backdrop{position:fixed;inset:0;background:var(--v-overlay,rgba(20,17,31,.45));
  opacity:0;transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-backdrop{opacity:1}
.v-dialog-root.is-closing>.v-dialog-backdrop{opacity:0}

.v-dialog-panel{position:relative;z-index:1;width:100%;max-width:var(--v-dialog-w,32rem);
  max-height:calc(100vh - 32px);display:flex;flex-direction:column;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-lg,18px);
  box-shadow:var(--v-shadow-lg,0 24px 60px rgba(20,17,31,.2));
  opacity:0;transform:translateY(14px) scale(.975);
  transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease),transform var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-panel{opacity:1;transform:none}
.v-dialog-root.is-closing>.v-dialog-panel{opacity:0;transform:translateY(10px) scale(.985)}
.v-dialog-panel:focus{outline:none}
.v-dialog-panel.is-plain{background:none;border:0;box-shadow:none}

.v-dialog-root[data-size="sm"]{--v-dialog-w:24rem}
.v-dialog-root[data-size="md"]{--v-dialog-w:32rem}
.v-dialog-root[data-size="lg"]{--v-dialog-w:46rem}
.v-dialog-root[data-size="xl"]{--v-dialog-w:64rem}
.v-dialog-root[data-size="full"]{--v-dialog-w:calc(100vw - 32px)}

.v-dialog-head{display:flex;gap:14px;align-items:flex-start;padding:22px 22px 0}
.v-dialog-icon{flex:none;width:38px;height:38px;border-radius:var(--v-radius-full,999px);
  display:grid;place-items:center;background:var(--v-primary-soft,#EEE9FF);color:var(--v-primary-soft-text,#4B21B8)}
.v-dialog-icon svg{width:20px;height:20px}
.v-dialog-icon[data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-dialog-icon[data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text)}
.v-dialog-icon[data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-dialog-heading{flex:1;min-width:0}
.v-dialog-title{margin:0;font-size:17px;font-weight:650;line-height:1.35;color:var(--v-text,#14111F)}
.v-dialog-desc{margin:6px 0 0;font-size:14px;line-height:1.55;color:var(--v-text-muted,#6B6580)}

.v-dialog-body{padding:16px 22px;overflow:auto;font-size:14px;line-height:1.6;color:var(--v-text,#14111F)}
.v-dialog-head+.v-dialog-body{padding-top:14px}
.v-dialog-body>p{margin:0 0 10px}
.v-dialog-body>p:last-child{margin-bottom:0}

.v-dialog-foot{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding:6px 22px 20px}

.v-dialog-x{position:absolute;top:12px;right:12px;width:32px;height:32px;display:grid;place-items:center;
  border:0;border-radius:var(--v-radius-sm,8px);background:transparent;color:var(--v-text-muted,#6B6580);
  cursor:pointer;transition:background .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dialog-x:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text,#14111F)}
.v-dialog-x:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dialog-x svg{width:16px;height:16px}

.v-dlg-btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;
  gap:8px;min-height:38px;padding:0 16px;border-radius:var(--v-radius-sm,8px);border:1px solid transparent;
  font-family:inherit;font-size:14px;font-weight:600;line-height:1;cursor:pointer;
  transition:background .15s var(--v-ease,ease),border-color .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dlg-btn:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dlg-btn[disabled]{opacity:.55;cursor:not-allowed}

.v-dlg-btn[data-variant="primary"]{background:var(--v-primary);color:var(--v-primary-contrast);border-color:var(--v-primary)}
.v-dlg-btn[data-variant="primary"]:hover{background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-dlg-btn[data-variant="danger"]{background:var(--v-danger);color:var(--v-danger-contrast);border-color:var(--v-danger)}
.v-dlg-btn[data-variant="danger"]:hover{background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-dlg-btn[data-variant="success"]{background:var(--v-success);color:var(--v-success-contrast);border-color:var(--v-success)}
.v-dlg-btn[data-variant="success"]:hover{background:var(--v-success-hover);border-color:var(--v-success-hover);color:var(--v-success-contrast-hover)}
.v-dlg-btn[data-variant="secondary"]{background:var(--v-surface);color:var(--v-text);border-color:var(--v-border-strong,#CFC6E4)}
.v-dlg-btn[data-variant="secondary"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}
.v-dlg-btn[data-variant="ghost"]{background:transparent;color:var(--v-text-muted);border-color:transparent}
.v-dlg-btn[data-variant="ghost"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}

.v-dialog-field{display:flex;flex-direction:column;gap:6px}
.v-dialog-label{font-size:13px;font-weight:600;color:var(--v-text,#14111F)}
.v-dialog-input{appearance:none;-webkit-appearance:none;width:100%;min-height:40px;padding:9px 12px;
  font-family:inherit;font-size:14px;line-height:1.4;color:var(--v-text,#14111F);
  background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius-sm,8px);transition:border-color .15s var(--v-ease,ease),box-shadow .15s var(--v-ease,ease)}
textarea.v-dialog-input{min-height:96px;resize:vertical}
.v-dialog-input::placeholder{color:var(--v-text-soft,#9A93B4)}
.v-dialog-input:focus{outline:none;border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring,rgba(109,59,245,.32))}
.v-dialog-input[aria-invalid="true"]{border-color:var(--v-danger)}
.v-dialog-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px var(--v-danger-ring)}
.v-dialog-hint{font-size:12.5px;line-height:1.45;color:var(--v-text-muted,#6B6580)}
.v-dialog-error{font-size:12.5px;line-height:1.45;font-weight:600;color:var(--v-danger)}

@media (max-width:520px){
  .v-dialog-root{padding:12px}
  .v-dialog-foot{flex-direction:column-reverse}
  .v-dlg-btn{width:100%}
}
@media (prefers-reduced-motion: reduce){
  .v-dialog-backdrop,.v-dialog-panel{transition:none}
}
`;
function ensureStyles3() {
  ensureTokens();
  ensurePalette();
  injectStyle("dialog", CSS4);
}
var ICONS2 = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.2 12.3 2.6 2.6 5-5.2"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.6 2.9 19.4h18.2z"/><path d="M12 10v4M12 17.2v.2"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.8.7-.8 1.3v.5M12 16.6v.2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};
var stack = [];
var byRoot = /* @__PURE__ */ new WeakMap();
var scrollLocks2 = 0;
var previousOverflow = "";
var previousPaddingRight = "";
function lockScroll2() {
  if (scrollLocks2++ > 0) return;
  const body = document.body;
  previousOverflow = body.style.overflow;
  previousPaddingRight = body.style.paddingRight;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (gap > 0) {
    const current2 = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current2 + gap}px`;
  }
}
function unlockScroll2() {
  if (scrollLocks2 === 0) return;
  if (--scrollLocks2 > 0) return;
  document.body.style.overflow = previousOverflow;
  document.body.style.paddingRight = previousPaddingRight;
}
var FOCUSABLE2 = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,object,embed,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function focusableIn2(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE2)).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}
function top() {
  return stack[stack.length - 1];
}
function reducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
var listening = false;
function onKeydown(event) {
  const entry = top();
  if (!entry) return;
  if (event.key === "Escape") {
    if (entry.options.closeOnEscape === false) return;
    event.preventDefault();
    entry.handle.close(void 0);
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusableIn2(entry.handle.panel);
  if (!items.length) {
    event.preventDefault();
    entry.handle.panel.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !entry.handle.panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
function onFocusIn(event) {
  const entry = top();
  if (!entry) return;
  const target = event.target;
  if (target && entry.handle.root.contains(target)) return;
  const items = focusableIn2(entry.handle.panel);
  (items[0] ?? entry.handle.panel).focus();
}
function startListening() {
  if (listening) return;
  listening = true;
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("focusin", onFocusIn, true);
}
function stopListening() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("keydown", onKeydown, true);
  document.removeEventListener("focusin", onFocusIn, true);
}
function openDialog(request2) {
  ensureStyles3();
  const id = uid("v-dialog-");
  const duration = reducedMotion() ? 0 : settings2.duration;
  const root = document.createElement("div");
  root.className = "v-dialog-root";
  root.id = id;
  root.setAttribute("data-size", request2.size ?? settings2.size);
  root.setAttribute("data-position", request2.position ?? "center");
  root.style.setProperty("--v-dialog-ms", `${duration}ms`);
  root.style.setProperty("--v-dialog-layer", String(stack.length * 2));
  const backdrop = document.createElement("div");
  backdrop.className = "v-dialog-backdrop";
  root.appendChild(backdrop);
  const panel = document.createElement("div");
  panel.className = "v-dialog-panel";
  if (request2.plain) panel.classList.add("is-plain");
  if (request2.className) panel.classList.add(...request2.className.split(/\s+/).filter(Boolean));
  panel.setAttribute("role", request2.role ?? "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.tabIndex = -1;
  if (request2.labelledBy) panel.setAttribute("aria-labelledby", request2.labelledBy);
  else if (request2.ariaLabel) panel.setAttribute("aria-label", request2.ariaLabel);
  if (request2.describedBy) panel.setAttribute("aria-describedby", request2.describedBy);
  root.appendChild(panel);
  const body = document.createElement("div");
  body.className = "v-dialog-body";
  if (request2.source) {
    const anchor = document.createComment(" v-modal ");
    request2.source.parentNode?.insertBefore(anchor, request2.source);
    sourceAnchors.set(request2.source, anchor);
    request2.source.classList.add("v-dialog-open");
    request2.source.removeAttribute("hidden");
    body.appendChild(request2.source);
  } else if (request2.content) {
    body.appendChild(request2.content);
  }
  panel.appendChild(body);
  if (request2.closable !== false) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "v-dialog-x";
    close.setAttribute("aria-label", labels.close);
    close.innerHTML = ICONS2.close;
    close.addEventListener("click", () => handle.close(void 0));
    panel.appendChild(close);
  }
  let settled = false;
  let resolveClosed = () => void 0;
  const closed = new Promise((resolve2) => {
    resolveClosed = resolve2;
  });
  const handle = {
    id,
    root,
    panel,
    body,
    key: request2.key ?? null,
    source: request2.source ?? null,
    closed,
    close(result) {
      if (settled) return;
      settled = true;
      const index = stack.findIndex((item) => item.handle === handle);
      if (index > -1) stack.splice(index, 1);
      byRoot.delete(root);
      if (entry.locked) unlockScroll2();
      if (!stack.length) stopListening();
      root.classList.remove("is-open");
      root.classList.add("is-closing");
      const finish = () => {
        const source = request2.source;
        if (source) {
          const anchor = sourceAnchors.get(source);
          source.classList.remove("v-dialog-open");
          if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(source, anchor);
            anchor.remove();
          } else {
            source.remove();
          }
          sourceAnchors.delete(source);
          if (source.hasAttribute(`${config.prefix}modal-content`) || source.hasAttribute("data-v-modal-content")) {
            source.setAttribute("hidden", "");
          }
        }
        root.remove();
        request2.onClose?.(result, handle);
        resolveClosed(result);
        if (request2.restoreFocus !== false) {
          const previous = entry.previousFocus;
          if (previous && typeof previous.focus === "function" && previous.isConnected) {
            previous.focus();
          }
        }
      };
      if (duration > 0) setTimeout(finish, duration);
      else finish();
    }
  };
  const entry = {
    handle,
    options: request2,
    previousFocus: document.activeElement,
    locked: request2.lockScroll !== false
  };
  backdrop.addEventListener("click", () => {
    if (request2.closeOnBackdrop === false) return;
    handle.close(void 0);
  });
  if (entry.locked) lockScroll2();
  stack.push(entry);
  byRoot.set(root, entry);
  startListening();
  document.body.appendChild(root);
  requestAnimationFrame(() => {
    root.classList.add("is-open");
    const target = resolveInitialFocus(request2, panel);
    target?.focus();
  });
  request2.onOpen?.(handle);
  return handle;
}
var sourceAnchors = /* @__PURE__ */ new WeakMap();
function resolveInitialFocus(request2, panel) {
  const wanted = request2.initialFocus;
  if (wanted instanceof HTMLElement) return wanted;
  if (typeof wanted === "string") {
    const found = panel.querySelector(wanted);
    if (found) return found;
  }
  const auto = panel.querySelector("[autofocus],[data-autofocus]");
  if (auto) return auto;
  const items = focusableIn2(panel);
  return items[0] ?? panel;
}
function resolveTarget2(target) {
  if (target instanceof HTMLElement) return target;
  const selector = String(target ?? "").trim();
  if (!selector) return null;
  const query2 = /^[\w-]+$/.test(selector) ? `#${selector}` : selector;
  return document.querySelector(query2);
}
function keyOf(target) {
  if (typeof target === "string") return target.trim() || null;
  return target.id ? `#${target.id}` : null;
}
function findByKey(key) {
  const normalized = /^[\w-]+$/.test(key) ? `#${key}` : key;
  return stack.find((entry) => {
    if (entry.handle.key === key || entry.handle.key === normalized) return true;
    const source = entry.handle.source;
    return !!source && source.matches?.(normalized);
  });
}
var modal = {
  /** Abre um elemento da pagina como modal. Aceita seletor ou o proprio elemento. */
  open(target, options = {}) {
    const element = resolveTarget2(target);
    if (!element) {
      console.warn(`[Voodoo] modal.open: alvo nao encontrado (${String(target)}).`);
      return null;
    }
    const key = keyOf(target) ?? (element.id ? `#${element.id}` : null);
    const existing = key ? findByKey(key) : void 0;
    if (existing) return existing.handle;
    const heading = element.querySelector("[data-dialog-title],h1,h2,h3");
    if (heading && !heading.id) heading.id = uid("v-dialog-title-");
    return openDialog({
      ...options,
      source: element,
      key,
      labelledBy: heading?.id ?? null
    });
  },
  /** Fecha o modal indicado, ou o que estiver no topo da pilha. */
  close(target, result) {
    if (target === void 0) {
      top()?.handle.close(result);
      return;
    }
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    entry?.handle.close(result);
  },
  /** Fecha todos os dialogos abertos, do topo para a base. */
  closeAll(result) {
    for (const entry of [...stack].reverse()) entry.handle.close(result);
  },
  /** Abre se estiver fechado, fecha se estiver aberto. */
  toggle(target, options = {}) {
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    if (entry) {
      entry.handle.close(void 0);
      return null;
    }
    return this.open(target, options);
  },
  /** Informa se um modal especifico, ou qualquer um, esta aberto. */
  isOpen(target) {
    if (target === void 0) return stack.length > 0;
    const key = keyOf(target);
    return !!(key && findByKey(key));
  },
  /** Dialogos abertos, do mais antigo ao mais recente. */
  get opened() {
    return stack.map((entry) => entry.handle);
  },
  /** Quantidade de dialogos abertos. */
  get count() {
    return stack.length;
  },
  /** Ajusta duracao da animacao e tamanho padrao. */
  configure(options) {
    Object.assign(settings2, options);
  },
  /** Troca os textos padrao dos botoes. */
  labels(next) {
    Object.assign(labels, next);
    return labels;
  }
};
function dialog(options) {
  ensureStyles3();
  const fragment = document.createDocumentFragment();
  const titleId = options.title ? uid("v-dialog-title-") : null;
  const descId = options.description ? uid("v-dialog-desc-") : null;
  let head = null;
  if (options.title || options.description || options.icon) {
    head = document.createElement("div");
    head.className = "v-dialog-head";
    const iconName = options.icon && options.icon !== "none" ? options.icon : null;
    if (iconName && ICONS2[iconName]) {
      const icon = document.createElement("div");
      icon.className = "v-dialog-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("data-tone", options.tone ?? toneOfIcon(iconName));
      icon.innerHTML = ICONS2[iconName];
      head.appendChild(icon);
    }
    const heading = document.createElement("div");
    heading.className = "v-dialog-heading";
    if (options.title) {
      const title = document.createElement("h2");
      title.className = "v-dialog-title";
      title.id = titleId;
      title.textContent = options.title;
      heading.appendChild(title);
    }
    if (options.description) {
      const desc = document.createElement("p");
      desc.className = "v-dialog-desc";
      desc.id = descId;
      desc.textContent = options.description;
      heading.appendChild(desc);
    }
    head.appendChild(heading);
  }
  const content = document.createDocumentFragment();
  if (options.text) {
    for (const line of options.text.split("\n")) {
      const p2 = document.createElement("p");
      p2.textContent = line;
      content.appendChild(p2);
    }
  }
  if (options.html) {
    const holder = document.createElement("div");
    holder.innerHTML = options.html;
    while (holder.firstChild) content.appendChild(holder.firstChild);
  }
  if (options.node) content.appendChild(options.node);
  fragment.appendChild(content);
  const buttons = options.buttons ?? [
    { label: labels.ok, value: true, variant: "primary", autofocus: true }
  ];
  return new Promise((resolve2) => {
    const handle = openDialog({
      ...options,
      content: fragment,
      role: options.tone === "danger" ? "alertdialog" : "dialog",
      labelledBy: titleId,
      describedBy: descId,
      key: null,
      onClose(result) {
        options.onClose?.(result, handle);
        resolve2(result === void 0 ? null : result);
      }
    });
    if (head) handle.panel.insertBefore(head, handle.body);
    if (buttons.length) {
      const foot = document.createElement("div");
      foot.className = "v-dialog-foot";
      for (const button of buttons) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "v-dlg-btn";
        element.setAttribute("data-variant", button.variant ?? "secondary");
        element.textContent = button.label;
        if (button.autofocus) element.setAttribute("data-autofocus", "");
        element.addEventListener("click", () => {
          const outcome = button.onClick?.(handle);
          if (outcome === false) return;
          if (button.close === false) return;
          handle.close(button.value ?? null);
        });
        foot.appendChild(element);
      }
      handle.panel.appendChild(foot);
    }
    if (!handle.body.childNodes.length) handle.body.remove();
  });
}
function toneOfIcon(icon) {
  if (icon === "success" || icon === "warning" || icon === "danger") return icon;
  return "default";
}
function alert(message, options = {}) {
  return dialog({
    icon: "info",
    size: "sm",
    ...options,
    text: message,
    buttons: [
      {
        label: options.confirmLabel ?? labels.ok,
        value: true,
        variant: options.tone === "danger" ? "danger" : "primary",
        autofocus: true
      }
    ]
  }).then(() => void 0);
}
function confirm(message, options = {}) {
  const tone = options.danger ? "danger" : options.tone ?? "default";
  return dialog({
    icon: tone === "danger" ? "warning" : "question",
    size: "sm",
    ...options,
    tone,
    text: message,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: false, variant: "secondary" },
      {
        label: options.confirmLabel ?? labels.confirm,
        value: true,
        variant: tone === "danger" ? "danger" : "primary",
        autofocus: true
      }
    ]
  }).then((result) => result === true);
}
function prompt(label, options = {}) {
  ensureStyles3();
  const type = options.type ?? "text";
  const fieldId = uid("v-prompt-");
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const field = document.createElement("div");
  field.className = "v-dialog-field";
  const labelElement = document.createElement("label");
  labelElement.className = "v-dialog-label";
  labelElement.htmlFor = fieldId;
  labelElement.textContent = label;
  field.appendChild(labelElement);
  const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  input.className = "v-dialog-input";
  input.id = fieldId;
  if (input instanceof HTMLInputElement) input.type = type === "textarea" ? "text" : type;
  input.value = options.value ?? "";
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.required) input.required = true;
  input.setAttribute("data-autofocus", "");
  field.appendChild(input);
  if (options.hint) {
    const hint = document.createElement("p");
    hint.className = "v-dialog-hint";
    hint.id = hintId;
    hint.textContent = options.hint;
    field.appendChild(hint);
    input.setAttribute("aria-describedby", hintId);
  }
  const error = document.createElement("p");
  error.className = "v-dialog-error";
  error.id = errorId;
  error.hidden = true;
  error.setAttribute("role", "alert");
  field.appendChild(error);
  const readValue = () => type === "number" ? input.value.trim() : input.value;
  const check = (handle) => {
    const value = readValue();
    let message = null;
    if (options.required && !value.trim()) message = labels.required;
    else message = options.validate?.(value) ?? null;
    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorId);
      input.focus();
      return false;
    }
    error.hidden = true;
    input.removeAttribute("aria-invalid");
    handle.close(value);
    return true;
  };
  let confirmHandle = null;
  const control = input;
  control.addEventListener("keydown", (event) => {
    const key = event;
    if (key.key !== "Enter") return;
    if (type === "textarea" && !key.ctrlKey && !key.metaKey) return;
    event.preventDefault();
    if (confirmHandle) check(confirmHandle);
  });
  return dialog({
    icon: "question",
    size: "sm",
    ...options,
    node: field,
    text: void 0,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: null, variant: "secondary" },
      {
        label: options.confirmLabel ?? labels.confirm,
        variant: "primary",
        close: false,
        onClick(handle) {
          confirmHandle = handle;
          check(handle);
          return false;
        }
      }
    ],
    onOpen(handle) {
      confirmHandle = handle;
      options.onOpen?.(handle);
    }
  }).then((result) => typeof result === "string" ? result : null);
}
defineDirective("modal", ({ el, expression, modifiers, cleanup }) => {
  const target = expression.trim();
  el.setAttribute("aria-haspopup", "dialog");
  const handler = (event) => {
    event.preventDefault();
    if (modifiers.close) {
      modal.close(target || void 0);
      return;
    }
    if (modifiers.toggle) {
      if (target) modal.toggle(target);
      return;
    }
    if (target) modal.open(target);
  };
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective(
  "modal-content",
  ({ el }) => {
    ensureStyles3();
    if (!el.id) el.id = uid("v-modal-");
    if (!el.classList.contains("v-dialog-open")) el.setAttribute("hidden", "");
  },
  { priority: PRIORITY.REF }
);
defineDirective("modal-close", ({ el, expression, cleanup }) => {
  const handler = (event) => {
    event.preventDefault();
    const root = el.closest(".v-dialog-root");
    const entry = root ? byRoot.get(root) : void 0;
    if (entry) entry.handle.close(expression.trim() || void 0);
    else modal.close(void 0, expression.trim() || void 0);
  };
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
var replaying = false;
defineDirective(
  "confirm",
  ({ el, expression, modifiers, cleanup }) => {
    const message = expression.trim() || labels.confirmQuestion;
    const guard = (event) => {
      if (replaying) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const origin = event.target instanceof HTMLElement ? event.target : el;
      const title = readAttr(el, `${config.prefix}confirm-title`) ?? void 0;
      const confirmLabel = readAttr(el, `${config.prefix}confirm-label`) ?? void 0;
      const cancelLabel = readAttr(el, `${config.prefix}confirm-cancel`) ?? void 0;
      void confirm(message, {
        title,
        confirmLabel,
        cancelLabel,
        danger: !!modifiers.danger,
        size: "sm"
      }).then((ok) => {
        if (!ok) return;
        replaying = true;
        try {
          origin.click();
        } finally {
          replaying = false;
        }
      });
    };
    el.addEventListener("click", guard, true);
    cleanup(() => el.removeEventListener("click", guard, true));
  },
  { priority: PRIORITY.REF }
);
magic("$modal", () => modal);
magic("$dialog", () => dialog);
magic("$alert", () => alert);
magic("$confirm", () => confirm);
magic("$prompt", () => prompt);

// src/forms/mask.ts
var masks = /* @__PURE__ */ new Map();
function registerMask(name, patternOrFn) {
  masks.set(name.trim().toLowerCase(), patternOrFn);
}
var TOKENS = {
  "9": /\d/,
  A: /[A-Za-zÀ-ÖØ-öø-ÿ]/,
  S: /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/,
  "*": /[\s\S]/
};
var RELEVANT = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;
var RIGHT_TO_LEFT = /* @__PURE__ */ new Set(["currency", "percent"]);
function formatWithPattern(value, pattern) {
  let out = "";
  let index = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\") {
      const literal = pattern[++i];
      if (literal === void 0) break;
      if (index >= value.length) break;
      out += literal;
      continue;
    }
    const token = TOKENS[char];
    if (token) {
      while (index < value.length && !token.test(value[index])) index++;
      if (index >= value.length) break;
      out += value[index++];
      continue;
    }
    if (index >= value.length) break;
    if (value[index] === char) index++;
    out += char;
  }
  return out;
}
function maskCurrency(value, options = {}) {
  const decimals = Math.max(0, Math.trunc(options.decimals ?? 2));
  const decimal = options.decimal ?? ",";
  const thousands = options.thousands ?? ".";
  const prefix = options.prefix ?? "R$ ";
  const suffix = options.suffix ?? "";
  const text = String(value ?? "");
  const negative = text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  const padded = digits.padStart(decimals + 1, "0");
  const whole = decimals ? padded.slice(0, padded.length - decimals) : padded;
  const fraction = decimals ? padded.slice(padded.length - decimals) : "";
  const clean = whole.replace(/^0+(?=\d)/, "");
  const grouped = clean.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${negative ? "-" : ""}${prefix}${grouped}${decimals ? decimal + fraction : ""}${suffix}`;
}
function maskPercent(value, decimals = 2) {
  return maskCurrency(value, { prefix: "", suffix: "%", decimals });
}
registerMask("cpf", "999.999.999-99");
registerMask("cnpj", "99.999.999/9999-99");
registerMask("cep", "99999-999");
registerMask("date", "99/99/9999");
registerMask("time", "99:99");
registerMask("datetime", "99/99/9999 99:99");
registerMask("cvv", "9999");
registerMask("cpfcnpj", (value) => {
  const digits = value.replace(/\D/g, "");
  return formatWithPattern(digits, digits.length <= 11 ? "999.999.999-99" : "99.999.999/9999-99");
});
registerMask("phone", (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return formatWithPattern(digits, digits.length <= 10 ? "(99) 9999-9999" : "(99) 99999-9999");
});
registerMask("currency", (value) => maskCurrency(value));
registerMask("percent", (value) => maskPercent(value));
registerMask("card", (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  if (/^3[47]/.test(digits)) return formatWithPattern(digits, "9999 999999 99999");
  if (digits.length > 16) return formatWithPattern(digits, "9999 9999 9999 9999 999");
  return formatWithPattern(digits, "9999 9999 9999 9999");
});
registerMask("plate", (value) => {
  const clean = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 7);
  const oldFormat = clean.length >= 5 && /\d/.test(clean[4]);
  return formatWithPattern(clean, oldFormat ? "AAA-9999" : "AAA9A99");
});
registerMask("hex", (value) => {
  const clean = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 6);
  return clean ? `#${clean}` : "";
});
registerMask("ip", (value) => {
  const parts = value.replace(/[^\d.]/g, "").split(".").slice(0, 4);
  const groups = [];
  for (const part of parts) {
    if (part === "") {
      groups.push("");
      continue;
    }
    const clamped = Math.min(255, Number(part.slice(0, 3)));
    groups.push(String(clamped));
  }
  return groups.join(".");
});
function applyMask(value, pattern) {
  const text = value == null ? "" : String(value);
  if (!pattern) return text;
  const named = masks.get(pattern.trim().toLowerCase());
  if (typeof named === "function") return named(text);
  return formatWithPattern(text, typeof named === "string" ? named : pattern);
}
function unmask(value, pattern) {
  const text = value == null ? "" : String(value);
  const key = pattern ? pattern.trim().toLowerCase() : "";
  if (key && RIGHT_TO_LEFT.has(key)) {
    const negative = text.trim().startsWith("-");
    const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (!digits) return "";
    const padded = digits.padStart(3, "0");
    const numeric = `${padded.slice(0, padded.length - 2)}.${padded.slice(padded.length - 2)}`;
    return negative ? `-${numeric}` : numeric;
  }
  return text.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
}
var mask = Object.assign(
  (value, pattern) => applyMask(value, pattern),
  {
    apply: applyMask,
    unmask,
    register: registerMask,
    currency: maskCurrency,
    percent: maskPercent,
    presets: masks
  }
);
function isRelevant(char) {
  return char !== void 0 && RELEVANT.test(char);
}
function countRelevant(text, upTo) {
  let total = 0;
  const limit = Math.min(upTo, text.length);
  for (let i = 0; i < limit; i++) if (isRelevant(text[i])) total++;
  return total;
}
function caretForCount(text, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isRelevant(text[i])) continue;
    seen++;
    if (seen === count) return i + 1;
  }
  return text.length;
}
var masked = /* @__PURE__ */ new WeakSet();
function installMask(input, options, cleanup) {
  if (masked.has(input)) return;
  masked.add(input);
  const prototype = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value") ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const nativeGet = descriptor?.get;
  const nativeSet = descriptor?.set;
  const readRaw = () => nativeGet ? String(nativeGet.call(input)) : String(input.getAttribute("value") ?? "");
  const writeRaw = (value) => {
    if (nativeSet) nativeSet.call(input, value);
    else input.setAttribute("value", value);
  };
  const setCaret = (position) => {
    try {
      input.setSelectionRange(position, position);
    } catch {
    }
  };
  if (nativeGet && nativeSet) {
    Object.defineProperty(input, "value", {
      configurable: true,
      enumerable: true,
      get() {
        const current2 = String(nativeGet.call(input));
        return options.clean ? options.clean(current2) : current2;
      },
      set(next) {
        nativeSet.call(input, options.format(next == null ? "" : String(next)));
      }
    });
    cleanup(() => {
      const current2 = readRaw();
      Reflect.deleteProperty(input, "value");
      writeRaw(current2);
    });
  }
  const reformat = () => {
    const raw = readRaw();
    const caret = input.selectionStart ?? raw.length;
    const before = countRelevant(raw, caret);
    const formatted = options.format(raw);
    if (formatted !== raw) writeRaw(formatted);
    if (options.rightToLeft) setCaret(Math.max(0, formatted.length - (options.suffixLength ?? 0)));
    else setCaret(caretForCount(formatted, before));
  };
  const onInput = () => reformat();
  const onKeyDown = (event) => {
    if (event.key !== "Backspace") return;
    const start2 = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start2 !== end || start2 === 0) return;
    const text = readRaw();
    if (isRelevant(text[start2 - 1])) return;
    let index = start2 - 1;
    while (index >= 0 && !isRelevant(text[index])) index--;
    event.preventDefault();
    if (index < 0) return;
    const next = text.slice(0, index) + text.slice(start2);
    const keep = countRelevant(next, index);
    writeRaw(options.format(next));
    setCaret(caretForCount(readRaw(), keep));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    masked.delete(input);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onKeyDown);
  });
  const initial = readRaw();
  if (initial) writeRaw(options.format(initial));
}
function maskableInput(el, directive2) {
  if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
    warn(`${config.prefix}${directive2} so funciona em input ou textarea.`);
    return null;
  }
  const input = el;
  const type = (input.getAttribute("type") || "text").toLowerCase();
  if (type === "number" || type === "range" || type === "date" || type === "color") {
    warn(`${config.prefix}${directive2} nao combina com input type="${type}". Use type="text".`);
    return null;
  }
  return input;
}
defineDirective(
  "mask",
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, "mask");
    if (!input) return;
    const pattern = expression.trim();
    if (!pattern) {
      warn(`${config.prefix}mask precisa de um padrao ou do nome de uma mascara.`);
      return;
    }
    const key = pattern.toLowerCase();
    const wantsClean = !!modifiers.unmask || !!modifiers.raw;
    installMask(
      input,
      {
        format: (value) => applyMask(value, pattern),
        clean: wantsClean ? (value) => unmask(value, key) : void 0,
        rightToLeft: RIGHT_TO_LEFT.has(key),
        suffixLength: key === "percent" ? 1 : 0
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);
defineDirective(
  "mask-currency",
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, "mask-currency");
    if (!input) return;
    const attr2 = (name) => el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
    const rawDecimals = (typeof modifiers.decimals === "string" ? modifiers.decimals : null) ?? attr2("mask-decimals");
    const decimals = rawDecimals !== null && rawDecimals !== "" ? Number(rawDecimals) : 2;
    const options = {
      prefix: modifiers.plain ? "" : expression.trim() || attr2("mask-prefix") || "R$ ",
      suffix: attr2("mask-suffix") ?? "",
      decimals: Number.isFinite(decimals) ? decimals : 2,
      decimal: modifiers.dot ? "." : ",",
      thousands: modifiers.dot ? "," : "."
    };
    const wantsClean = !!modifiers.unmask || !!modifiers.raw;
    const places = options.decimals ?? 2;
    installMask(
      input,
      {
        format: (value) => maskCurrency(value, options),
        clean: wantsClean ? (value) => {
          const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
          if (!digits) return "";
          if (places === 0) return digits;
          const padded = digits.padStart(places + 1, "0");
          const numeric = `${padded.slice(0, padded.length - places)}.${padded.slice(
            padded.length - places
          )}`;
          return value.trim().startsWith("-") ? `-${numeric}` : numeric;
        } : void 0,
        rightToLeft: true,
        suffixLength: (options.suffix ?? "").length
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);

export { Scope, VoodooCollection, VoodooRuntimeError, VoodooSyntaxError, addCleanup, alert, allStores, allowedGlobals, applyMask, avisarAlias, cache2 as cache, clearErrors, clearParseCache, clipboard, collectDirectives, confirm, cookie, core, createApp, createResource, defineComponent, destroy, dialog, efeitos, ensurePalette, enter, evaluate, evaluateIn, fadeIn, fadeOut, findScope, fromHtml, getEffectScopes, getScope, hadDirectives, hotkey, instances, leave, magic, magics, markSkipChildren, mask, masks, messages, modal, mountComponent, network, palette, parse, prompt, query, readAttr, ready, ready2, refresh, registerMask, removeStore, rootScope, screen, serializeForm, session, showFieldError, showFormErrors, slideDown, slideUp, sound, start, storage, store, storeNames, stringify, theme, toast, tokenize, unmask, url, validate, validator, viewTransition, walk, whenElement, whenReady };
//# sourceMappingURL=chunk-PU4U35NX.js.map
//# sourceMappingURL=chunk-PU4U35NX.js.map