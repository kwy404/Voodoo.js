import { reactive, handleError, EffectScope, effect } from './chunk-VJA45L6K.js';
import { emDesenvolvimento, avisarExpressaoInvalida, avisarDirectiveDesconhecida } from './chunk-F3SPSSE3.js';
import { config, directives, components } from './chunk-UNICRHSA.js';
import { __publicField } from './chunk-LUEWHAC4.js';

/**
 * Voodoo.js v0.2.1
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
              if (close === -1)
                throw new VoodooSyntaxError("Escape unicode nao fechado", source, start2);
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
      if (i >= len) throw new VoodooSyntaxError("String nao fechada", source, start2);
      i++;
      tokens.push({ type: "str", value: out, parsed: out, start: start2, end: i });
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
            throw new VoodooSyntaxError("Interpolacao de template nao fechada", source, start2);
          i++;
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Template literal nao fechado", source, start2);
      i++;
      quasis.push(current);
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
    for (const p of PUNCTUATORS) {
      if (source.startsWith(p, i)) {
        if (p === "?." && isDigit(source[i + 2])) continue;
        matched = p;
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
function clearParseCache() {
  cache.clear();
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

// src/runtime/scope.ts
var magics = /* @__PURE__ */ new Map();
function magic(name, getter) {
  magics.set(name.startsWith("$") ? name : `$${name}`, getter);
}
var Scope = class _Scope {
  constructor(data = {}, parent = null, el = null) {
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
    this.data = data;
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
    const container = {};
    Object.defineProperty(container, name, {
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
    this.magicCache.set(name, container);
    return container;
  }
};
var rootScope = new Scope(reactive({}));

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
  let current = node;
  while (current) {
    const scope = nodeScopes.get(current);
    if (scope) return scope;
    current = current.parentNode;
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
  const cache2 = attributeCache.get(el);
  if (cache2 && cache2.size) {
    for (const [name, value] of cache2) {
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
function priorityOf(attr) {
  return directives.get(attr.name)?.priority ?? 0;
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
    const attr = el.attributes[i];
    if (isVoodooAttribute(attr.name)) out.set(attr.name, attr.value);
  }
  return out;
}
function stripAttributes(el) {
  if (!config.cleanAttributes) return;
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, map = /* @__PURE__ */ new Map());
  const remover = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (!isVoodooAttribute(attr.name)) continue;
    map.set(attr.name, attr.value);
    remover.push(attr.name);
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
  const cache2 = attributeCache.get(el);
  if (cache2 && cache2.size) return true;
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
function runDirective(el, attr, scope) {
  const def = directives.get(attr.name);
  if (!def) {
    if (emDesenvolvimento() && attr.raw.startsWith(config.prefix)) {
      avisarDirectiveDesconhecida(el, attr.raw, attr.name);
    }
    return;
  }
  const scopeOwner = new EffectScope(true);
  addCleanup(el, () => scopeOwner.stop());
  trackEffectScope(el, scopeOwner);
  const ctx = {
    el,
    scope,
    expression: attr.expression,
    arg: attr.arg,
    modifiers: attr.modifiers,
    raw: attr.raw,
    evaluate(expression) {
      return evaluateIn(expression ?? attr.expression, scope, attr.raw, el);
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
    handleError(err, `directive ${attr.raw}`);
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
  let current = activeScope;
  const attrs = collectDirectives(el);
  const tagComponent = el.hasAttribute(`${config.prefix}component`) ? null : resolveComponentTag(el.tagName);
  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current);
    return;
  }
  initialized.add(el);
  for (const attr of attrs) {
    const def = directives.get(attr.name);
    if (def?.terminal) {
      runDirective(el, attr, current);
      return;
    }
  }
  const dataAttr = attrs.find((a) => a.name === "data");
  const componentAttr = attrs.find((a) => a.name === "component");
  const componentName = componentAttr ? componentAttr.expression || "" : tagComponent || "";
  let montouComponente = false;
  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current);
    if (created) {
      current = created;
      montouComponente = true;
      nodeScopes.set(el, current);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn(dataAttr.expression || "{}", current, "v-data") : {};
    current = current.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
    nodeScopes.set(el, current);
  }
  const escopoDosAtributos = montouComponente ? activeScope : current;
  for (const attr of attrs) {
    if (attr.name === "data" || attr.name === "component") continue;
    runDirective(el, attr, escopoDosAtributos);
  }
  stripAttributes(el);
  if (!skipChildren.has(el)) walkChildren(el, current);
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

export { Scope, VoodooRuntimeError, VoodooSyntaxError, addCleanup, allowedGlobals, clearParseCache, closestDirective, collectDirectives, componentAliases, destroy, evaluate, evaluateIn, findScope, getEffectScopes, getScope, hadDirectives, hasAttr, hasDirectives, isInitialized, magic, magics, markInitialized, markNodeScope, markSkipChildren, originalAttributes, parse, parseAttribute, queryDirective, readAttr, refresh, removeQuietly, restoreAttributes, rootScope, setComponentMounter, start, stopObserving, stringify, tokenize, walk };
//# sourceMappingURL=chunk-IW55VCGX.js.map
//# sourceMappingURL=chunk-IW55VCGX.js.map