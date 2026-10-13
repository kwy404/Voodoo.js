import { reactive, ref, warn, handleError, EffectScope, effect } from './chunk-HFGBXDJZ.js';
import { inDevelopment, warnInvalidExpression, warnUnknownDirective } from './chunk-IHL3M2A2.js';
import { config, directives, components } from './chunk-WM5AQ4SD.js';
import { __publicField } from './chunk-I7ECQM6Y.js';

/**
 * Voodoo.js v1.0.0
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
  ">>>",
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
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "<",
  ">",
  "=",
  "&",
  "|",
  "^",
  "~",
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
      } else if (ch === "0" && (source[i + 1] === "o" || source[i + 1] === "O")) {
        raw = "0o";
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) raw += source[i++];
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
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Invalid number", source, start2);
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
                throw new VoodooSyntaxError("Unclosed Unicode escape", source, start2);
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
      if (i >= len) throw new VoodooSyntaxError("Unclosed string", source, start2);
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
            throw new VoodooSyntaxError("Unclosed template interpolation", source, start2);
          i++;
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Unclosed template literal", source, start2);
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
  "|": 4,
  "^": 5,
  "&": 6,
  "==": 7,
  "!=": 7,
  "===": 7,
  "!==": 7,
  "<": 8,
  ">": 8,
  "<=": 8,
  ">=": 8,
  in: 8,
  instanceof: 8,
  "<<": 9,
  ">>": 9,
  ">>>": 9,
  "+": 10,
  "-": 10,
  "*": 11,
  "/": 11,
  "%": 11,
  "**": 12
};
var ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??="]);
var UNARY_OPS = /* @__PURE__ */ new Set(["!", "-", "+", "~", "typeof", "void", "delete"]);
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
    if (this.peek().type === "ident" && this.peek().value === "return") {
      this.next();
      if (this.isPunct(";") || this.isPunct(",") || this.isPunct("}") || this.peek().type === "eof") {
        return { t: "return", a: null };
      }
      return { t: "return", a: this.parseExpression() };
    }
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
      return { t: "arrow", params: [{ kind: "id", name: param }], body: this.parseArrowBody() };
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
    let params;
    try {
      params = this.parseParamList();
    } catch {
      this.pos = start2;
      return null;
    }
    this.expect("=>");
    return { t: "arrow", params, body: this.parseArrowBody() };
  }
  /** Parameters up to the closing parenthesis, which it consumes. */
  parseParamList() {
    const params = [];
    while (!this.isPunct(")")) {
      params.push(this.parseParam());
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect(")");
    return params;
  }
  /**
   * One binding: `x`, `x = 1`, `...xs`, `{ a, b: c = 2 }`, `[a, , b]`.
   *
   * Recursive, so a pattern nests to any depth the way JavaScript's does.
   */
  parseParam() {
    if (this.isPunct("...")) {
      this.next();
      const name = this.next();
      if (name.type !== "ident") {
        throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
      }
      return { kind: "rest", name: name.value };
    }
    let param;
    if (this.isPunct("{")) {
      this.next();
      const props = [];
      let rest;
      while (!this.isPunct("}")) {
        if (this.isPunct("...")) {
          this.next();
          const name = this.next();
          if (name.type !== "ident") {
            throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
          }
          rest = name.value;
        } else {
          const key = this.next();
          if (key.type !== "ident" && key.type !== "str") {
            throw new VoodooSyntaxError("Expected a property name", this.source, key.start);
          }
          const value = this.isPunct(":") ? (this.next(), this.parseParam()) : { kind: "id", name: key.value };
          if (this.isPunct("=")) {
            this.next();
            value.def = this.parseAssignment();
          }
          props.push({ key: String(key.value), value });
        }
        if (this.isPunct(",")) this.next();
        else break;
      }
      this.expect("}");
      param = { kind: "obj", props, rest };
    } else if (this.isPunct("[")) {
      this.next();
      const elements = [];
      let rest;
      while (!this.isPunct("]")) {
        if (this.isPunct(",")) {
          this.next();
          elements.push(null);
          continue;
        }
        if (this.isPunct("...")) {
          this.next();
          const name = this.next();
          if (name.type !== "ident") {
            throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
          }
          rest = name.value;
        } else {
          elements.push(this.parseParam());
        }
        if (this.isPunct(",")) this.next();
        else break;
      }
      this.expect("]");
      param = { kind: "arr", elements, rest };
    } else {
      const name = this.next();
      if (name.type !== "ident") {
        throw new VoodooSyntaxError("Expected a parameter name", this.source, name.start);
      }
      param = { kind: "id", name: name.value };
    }
    if (this.isPunct("=")) {
      this.next();
      param.def = this.parseAssignment();
    }
    return param;
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
  /**
   * `new X`, `new X(a, b)`, and `new a.b.C(x)`.
   *
   * `new` did not exist here, in the lexer, or in the interpreter. So
   * `new Date(0)` lexed as the identifier `new` followed by `Date(0)`, the
   * parser dropped the dangling identifier, and what ran was `Date(0)`. Called
   * without `new`, `Date` returns a STRING of the current time, so
   * `new Date(0)` produced today's date as text, `new Date(0) instanceof Date`
   * was false, and `new Date(0).getTime()` failed with "getTime is not a
   * function". Three wrong answers, none of them an error.
   *
   * The callee is parsed as a member chain WITHOUT consuming a call, because in
   * JavaScript the argument list binds to the `new`: `new a.b.C(x)` constructs
   * `a.b.C` with `x`, and never calls `a.b.C(x)` and constructs the result. The
   * trailing `(` is then read here, and anything after it, such as
   * `new Date(0).getTime()`, is left to the ordinary member loop below.
   */
  parseNew() {
    this.next();
    const callee = this.parseMemberOnly(this.parsePrimary());
    const args = this.isPunct("(") ? this.parseArguments() : [];
    return { t: "new", callee, args };
  }
  /**
   * Member access only: `.x`, `?.x` and `[x]`, stopping at a call.
   *
   * Used for a `new` callee, where the argument list belongs to the `new`
   * rather than to the expression it is constructing.
   */
  parseMemberOnly(start2) {
    let expr = start2;
    for (; ; ) {
      if (this.isPunct(".")) {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
        }
        expr = { t: "member", o: expr, p: { t: "lit", v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct("[")) {
        this.next();
        const p = this.parseExpression();
        this.expect("]");
        expr = { t: "member", o: expr, p, computed: true, opt: false };
      } else {
        return expr;
      }
    }
  }
  parseCallMember() {
    let expr = this.isIdent("new") ? this.parseNew() : this.parsePrimary();
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
      const params = this.parseParamList();
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
        const body = [this.parseExpression()];
        while (this.isPunct(",")) {
          this.next();
          if (this.isPunct(")")) {
            const stray = this.peek();
            throw new VoodooSyntaxError("Trailing comma in a group", this.source, stray.start);
          }
          body.push(this.parseExpression());
        }
        this.expect(")");
        return body.length === 1 ? body[0] : { t: "seq", body };
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
          const params = this.parseParamList();
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
function guardedTimer(name) {
  return function(handler, timeout, ...rest) {
    if (typeof handler !== "function") {
      throw new VoodooRuntimeError(
        `${name} needs a function. Passing a string would compile it, which this library never does.`
      );
    }
    const timer = globalThis[name];
    return timer(handler, timeout, ...rest);
  };
}
function forwardGlobal(name) {
  return function(...args) {
    const fn = globalThis[name];
    return fn(...args);
  };
}
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
  console,
  ...typeof setTimeout !== "undefined" ? {
    setTimeout: guardedTimer("setTimeout"),
    setInterval: guardedTimer("setInterval"),
    clearTimeout: forwardGlobal("clearTimeout"),
    clearInterval: forwardGlobal("clearInterval")
  } : {},
  ...typeof requestAnimationFrame !== "undefined" ? {
    requestAnimationFrame: forwardGlobal("requestAnimationFrame"),
    cancelAnimationFrame: forwardGlobal("cancelAnimationFrame")
  } : {}
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
var ReturnSignal = class {
  constructor(value) {
    __publicField(this, "value", value);
  }
};
function unwrap(value) {
  return value instanceof ReturnSignal ? value.value : value;
}
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
    case "new": {
      const target = evaluate(node.callee, scope);
      if (typeof target !== "function") {
        throw new VoodooRuntimeError(
          `Cannot construct ${stringify(target)}: it is not a constructor`
        );
      }
      if (target === Function) {
        throw new VoodooRuntimeError("Cannot construct Function: expressions never compile code");
      }
      const args = evalArgs(node.args, scope);
      return Reflect.construct(target, args);
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
      if (node.op === "delete") {
        if (node.a.t !== "member") {
          throw new VoodooRuntimeError(
            "delete needs a property, as in `delete user.name` or `delete list[0]`"
          );
        }
        const owner = evaluate(node.a.o, scope);
        if (owner == null) return true;
        const key = checkKey(
          node.a.computed ? evaluate(node.a.p, scope) : node.a.p.v
        );
        return delete owner[key];
      }
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
        case "~":
          return ~v;
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
        // The bitwise operators coerce through ToInt32, and `>>>` through
        // ToUint32, which is why the two shifts disagree for negatives:
        // `-1 >> 0` is -1 and `-1 >>> 0` is 4294967295. Applying the JavaScript
        // operator directly gets that for free; hand-rolling the coercion is
        // how an implementation ends up subtly wrong on exactly those cases.
        case "&":
          return l & r;
        case "|":
          return l | r;
        case "^":
          return l ^ r;
        case "<<":
          return l << r;
        case ">>":
          return l >> r;
        case ">>>":
          return l >>> r;
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
        const vars = bindParams(methodParams, args, scope);
        const owner = this;
        const base = owner !== null && typeof owner === "object" ? scope.child(owner) : scope;
        return unwrap(evaluate(methodBody, base.child(vars)));
      };
    }
    case "arrow": {
      const params = node.params;
      const body = node.body;
      return (...args) => unwrap(evaluate(body, scope.child(bindParams(params, args, scope))));
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
    case "return":
      return new ReturnSignal(node.a ? evaluate(node.a, scope) : void 0);
    case "seq": {
      let last;
      for (const stmt of node.body) {
        last = evaluate(stmt, scope);
        if (last instanceof ReturnSignal) return last;
      }
      return last;
    }
  }
  throw new VoodooRuntimeError(`Unknown node: ${node.t}`);
}
function bindParam(param, value, vars, scope) {
  if (param.kind === "rest") {
    vars[param.name] = value;
    return;
  }
  if (param.def !== void 0 && value === void 0) {
    value = evaluate(param.def, scope.child(vars));
  }
  if (param.kind === "id") {
    vars[param.name] = value;
    return;
  }
  if (param.kind === "obj") {
    if (value == null) {
      throw new VoodooRuntimeError(
        `Cannot destructure ${value === null ? "null" : "undefined"}`
      );
    }
    const taken = /* @__PURE__ */ new Set();
    for (const { key, value: inner } of param.props) {
      taken.add(key);
      bindParam(inner, value[checkKey(key)], vars, scope);
    }
    if (param.rest) {
      const rest = {};
      for (const key of Object.keys(value)) {
        if (!taken.has(key)) rest[key] = value[key];
      }
      vars[param.rest] = rest;
    }
    return;
  }
  const items = Array.isArray(value) ? value : Array.from(value);
  param.elements.forEach((element, index) => {
    if (element) bindParam(element, items[index], vars, scope);
  });
  if (param.rest) vars[param.rest] = items.slice(param.elements.length);
}
function bindParams(params, args, scope) {
  const vars = {};
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    bindParam(param, param.kind === "rest" ? args.slice(i) : args[i], vars, scope);
  }
  return vars;
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
    checkKey(target.n);
    scope.set(target.n, value);
    return;
  }
  if (target.t === "member") {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError("Could not write to null or undefined");
    }
    const key = checkKey(
      target.computed ? evaluate(target.p, scope) : target.p.v
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

// src/runtime/scope.ts
var magics = /* @__PURE__ */ new Map();
function magic(name, getter) {
  magics.set(name.startsWith("$") ? name : `$${name}`, getter);
}
var hooks = /* @__PURE__ */ new Map();
function hook(name, getter) {
  hooks.set(name, getter);
}
var Scope = class _Scope {
  // Assignment order matches the order the fields were declared in before, so
  // the properties are created in the same sequence they always were.
  constructor(data = {}, parent = null, el = null) {
    this.refs = {};
    this.component = null;
    this.provides = null;
    this.magicCache = null;
    this.data = data;
    this.parent = parent;
    this.el = el;
  }
  /** Root scope of the chain. */
  get root() {
    let s = this;
    while (s.parent) s = s.parent;
    return s;
  }
  /** Look up a `provide` value by traveling up the scope chain. */
  inject(key, fallback) {
    let s = this;
    while (s) {
      if (s.provides && key in s.provides) return s.provides[key];
      s = s.parent;
    }
    return fallback;
  }
  /** Nearest component scope, traveling up the chain. */
  get owner() {
    let s = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }
  /** Set of visible refs, merging ancestor scopes. */
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
      return this.magicContainer(name, magics);
    }
    if (hooks.has(name)) {
      return this.magicContainer(name, hooks);
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
  /** Create a reactive child scope, used by `v-data` and `v-for`. */
  reactiveChild(vars, el = null) {
    return new _Scope(reactive(vars), this, el ?? this.el);
  }
  magicContainer(name, registry) {
    if (!this.magicCache) this.magicCache = /* @__PURE__ */ new Map();
    const cached = this.magicCache.get(name);
    if (cached) return cached;
    const getter = registry.get(name);
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
        const store = getStore();
        if (!store) return;
        if (!prefix) {
          store.clear();
          return;
        }
        for (const key of Object.keys(store)) {
          if (key.startsWith(prefix)) store.removeItem(key);
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
        const store = getStore();
        if (!store) return [];
        return Object.keys(store).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
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
  /** Reads a parameter from the current URL. */
  get(key, fallback) {
    if (typeof location === "undefined") return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },
  /** Reads all parameters as an object. */
  all() {
    if (typeof location === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },
  /** Writes a parameter without reloading the page. */
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
  /** Applies multiple parameters at once. */
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
  /** Stores a value. `ttl` in milliseconds, `0` means no expiration. */
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
  /** Executes the function only when the value is not in cache. */
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
var THEME_MODES = ["system", "light", "dark"];
function asTheme(value) {
  const name = typeof value === "string" ? value.trim().toLowerCase() : value;
  return THEME_MODES.includes(name) ? name : null;
}
function storedTheme() {
  return asTheme(storage.get(THEME_KEY));
}
var picked = null;
var listening = false;
var revision = ref(0);
function notifyTheme() {
  revision.value++;
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("voodoo:theme", { detail: { theme: theme.current, resolved: theme.resolved } })
  );
}
var theme = {
  /** Theme chosen by the user, or `system` when never set. */
  get current() {
    void revision.value;
    return picked ?? storedTheme() ?? "system";
  },
  /** Theme effectively applied, resolving `system`. */
  get resolved() {
    const value = this.current;
    if (value !== "system") return value;
    if (typeof document !== "undefined") {
      const authored = document.documentElement.getAttribute("data-theme");
      if (authored === "light" || authored === "dark") return authored;
    }
    if (typeof matchMedia === "undefined") return "light";
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  /**
   * Picks a theme and remembers it: `light`, `dark`, or `system` to follow the
   * operating system again, including its changes while the page is open.
   */
  set(value) {
    const next = asTheme(value);
    if (!next) {
      warn(`theme.set() expects 'light', 'dark' or 'system', got ${String(value)}.`);
      return;
    }
    picked = next;
    storage.set(THEME_KEY, next);
    revision.value++;
    this.apply();
  },
  /** Switches between light and dark, whatever the current one came from. */
  toggle() {
    const next = this.resolved === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
  /** Walks the three states in turn: system, light, dark, and back to system. */
  cycle() {
    const next = THEME_MODES[(THEME_MODES.indexOf(this.current) + 1) % THEME_MODES.length];
    this.set(next);
    return next;
  },
  /** `true` once the visitor has actually picked a theme. */
  get chosen() {
    void revision.value;
    return picked !== null || storedTheme() !== null;
  },
  /** Writes `data-theme` on the root element and notifies the page. */
  apply() {
    if (typeof document === "undefined") return;
    if (!this.chosen) return;
    const value = this.current;
    const root = document.documentElement;
    if (value === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", value);
    root.style.colorScheme = this.resolved;
    notifyTheme();
  },
  /**
   * Applies the saved theme as soon as the page loads, and keeps following it.
   *
   * Does nothing to the document when the visitor never chose one, which is
   * the common case on a page that simply included the script. Safe to call
   * more than once: the listeners are attached the first time only. Before
   * that, every call added another set, and a page that called it next to the
   * bootstrap ran each theme change twice.
   */
  init() {
    if (typeof document === "undefined") return;
    this.apply();
    if (listening) return;
    listening = true;
    if (typeof MutationObserver !== "undefined") {
      new MutationObserver(() => {
        revision.value++;
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });
    }
    if (typeof addEventListener !== "undefined") {
      addEventListener("storage", (event) => {
        if (event.key !== THEME_KEY && event.key !== null) return;
        picked = storedTheme();
        if (picked) this.apply();
        else notifyTheme();
      });
    }
    if (typeof matchMedia === "undefined") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (this.current !== "system") return;
      if (this.chosen) this.apply();
      else notifyTheme();
    };
    if (query.addEventListener) query.addEventListener("change", onSystemChange);
    else query.addListener?.(onSystemChange);
  }
};
function watchTheme() {
  if (!listening) theme.init();
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
var ignoredRemovals = /* @__PURE__ */ new WeakSet();
var detachedTemplates = /* @__PURE__ */ new WeakMap();
function removeQuietly(node) {
  ignoredRemovals.add(node);
  const parent = node.parentNode;
  if (parent) {
    let kept = detachedTemplates.get(parent);
    if (!kept) detachedTemplates.set(parent, kept = /* @__PURE__ */ new Set());
    kept.add(node);
  }
  node.remove();
}
function addCleanup(node, fn) {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, list = []);
  list.push(fn);
}
function destroy(node) {
  if (node.nodeType === 1) {
    const children = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 || child.nodeType === 3) children.push(child);
    }
    for (let i = children.length - 1; i >= 0; i--) destroy(children[i]);
  }
  const detached = detachedTemplates.get(node);
  if (detached) {
    detachedTemplates.delete(node);
    for (const template of detached) destroy(template);
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
var parsedAttributes = /* @__PURE__ */ new Map();
var MAX_PARSED_ATTRIBUTES = 4e3;
function parseAttribute(name, value) {
  const cacheKey = `${name}\0${value}`;
  const hit = parsedAttributes.get(cacheKey);
  if (hit !== void 0) return hit;
  const parsed = parseAttributeUncached(name, value);
  if (parsedAttributes.size >= MAX_PARSED_ATTRIBUTES) parsedAttributes.clear();
  parsedAttributes.set(cacheKey, parsed);
  return parsed;
}
function parseAttributeUncached(name, value) {
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
    const names = attributeNames(el);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (!looksLikeDirective(name)) continue;
      const parsed = parseAttribute(name, el.getAttribute(name));
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  }
  if (out.length < 2) return out;
  return out.sort((a, b) => priorityOf(b) - priorityOf(a));
}
var canListAttributeNames = typeof Element !== "undefined" && !!Element.prototype.getAttributeNames;
function attributeNames(el) {
  if (canListAttributeNames) return el.getAttributeNames();
  return Array.from(el.attributes, (a) => a.name);
}
function looksLikeDirective(name) {
  return isVoodooAttribute(name) || name.charCodeAt(0) === 46 && name.length > 1;
}
function priorityOf(attr) {
  return directives.get(attr.name)?.priority ?? 0;
}
var directiveIndex = /* @__PURE__ */ new Map();
var directiveNamesOf = /* @__PURE__ */ new WeakMap();
function indexDirective(el, name) {
  let set = directiveIndex.get(name);
  if (!set) directiveIndex.set(name, set = /* @__PURE__ */ new Set());
  set.add(el);
  let names = directiveNamesOf.get(el);
  if (!names) directiveNamesOf.set(el, names = /* @__PURE__ */ new Set());
  names.add(name);
}
function unindexElement(el) {
  const names = directiveNamesOf.get(el);
  if (!names) return;
  for (const name of names) directiveIndex.get(name)?.delete(el);
  directiveNamesOf.delete(el);
}
function hasDirective(el, name) {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
function queryDirective(root, name) {
  const out = [];
  const set = directiveIndex.get(name);
  const root_ = root;
  if (set) {
    for (const el of set) {
      if (!el.isConnected) continue;
      if (root_.contains && root_.contains(el) && el !== root_) out.push(el);
    }
  }
  const seen = new Set(out);
  for (const el of Array.from(
    root.querySelectorAll(`[${config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (seen.has(el)) continue;
    seen.add(el);
    out.push(el);
  }
  out.sort(
    (a, b) => a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}
function closestDirective(el, name) {
  let current = el;
  while (current) {
    if (hasDirective(current, name)) return current;
    current = current.parentElement;
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
  const names = attributeNames(el);
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, map = /* @__PURE__ */ new Map());
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!isVoodooAttribute(name)) continue;
    map.set(name, el.getAttribute(name));
    el.removeAttribute(name);
  }
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
    if (inDevelopment()) {
      warnInvalidExpression(el ?? scope.el, context ?? "expression", expression, err);
    }
    handleError(err, context ? `${context} ("${expression}")` : `expression "${expression}"`);
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
    if (inDevelopment() && attr.raw.startsWith(config.prefix)) {
      warnUnknownDirective(el, attr.raw, attr.name);
    }
    return;
  }
  let scopeOwner = null;
  const ownerScope = () => {
    if (!scopeOwner) {
      const created = scopeOwner = new EffectScope(true);
      addCleanup(el, () => created.stop());
      trackEffectScope(el, created);
    }
    return scopeOwner;
  };
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
      const owner = ownerScope();
      const hosted = () => {
        const previous = hookHost;
        hookHost = el;
        try {
          fn();
        } finally {
          hookHost = previous;
        }
      };
      owner.run(() => effect(hosted, { scope: owner }));
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
  const tag = el.tagName;
  if (HTML_SKIP.has(tag)) return;
  if (el.hasAttribute(`${config.prefix}ignore`) || el.hasAttribute(`${config.prefix}pre`)) {
    initialized.add(el);
    return;
  }
  let current = activeScope;
  const attrs = collectDirectives(el);
  const tagComponent = components.size === 0 && componentAliases.size === 0 ? null : el.hasAttribute(`${config.prefix}component`) ? null : resolveComponentTag(tag);
  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current);
    return;
  }
  initialized.add(el);
  const previousHost = hookHost;
  hookHost = el;
  try {
    walkElementDirectives(el, attrs, tagComponent, current);
  } finally {
    hookHost = previousHost;
  }
}
var hookHost = null;
function currentHookHost() {
  return hookHost;
}
function createDataScope(expression, parent, el) {
  let ast = null;
  try {
    ast = parse(expression);
  } catch {
    ast = null;
  }
  const plain = ast && ast.t === "obj" && ast.props.every(
    (p) => !p.spread && !p.keyExpr
  );
  if (!plain) {
    const raw = evaluateIn(expression, parent, "v-data");
    return parent.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
  }
  const scope = parent.reactiveChild({}, el);
  const props = ast.props;
  for (const prop of props) {
    if (prop.key === null) continue;
    try {
      if (prop.getter) {
        const compute = evaluate(prop.value, scope);
        Object.defineProperty(scope.data, prop.key, {
          enumerable: true,
          configurable: true,
          get: () => compute.call(scope.data)
        });
      } else {
        scope.data[prop.key] = evaluate(prop.value, scope);
      }
    } catch (err) {
      if (inDevelopment()) warnInvalidExpression(el, expression, expression, err);
      else handleError(err, "v-data");
    }
  }
  return scope;
}
function walkElementDirectives(el, attrs, tagComponent, scope) {
  let current = scope;
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
  let mountedComponent = false;
  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current);
    if (created) {
      current = created;
      mountedComponent = true;
      nodeScopes.set(el, current);
    }
  } else if (dataAttr || componentAttr) {
    current = createDataScope(dataAttr ? dataAttr.expression || "{}" : "{}", current, el);
    nodeScopes.set(el, current);
  }
  const attributeScope = mountedComponent ? scope : current;
  for (const attr of attrs) {
    if (attr.name === "data" || attr.name === "component") continue;
    runDirective(el, attr, attributeScope);
  }
  stripAttributes(el);
  if (!skipChildren.has(el)) walkChildren(el, current);
}
function walkChildren(el, scope) {
  const list = [];
  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child, scope);
  }
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}
var EXPRESSION_LIMIT = 500;
var validExpressions = /* @__PURE__ */ new Map();
function looksLikeExpression(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cached = validExpressions.get(trimmed);
  if (cached !== void 0) return cached;
  let valid = true;
  try {
    valid = parse(trimmed).t !== "seq";
  } catch {
    valid = false;
  }
  validExpressions.set(trimmed, valid);
  return valid;
}
function closeBrace(source, start2) {
  let level = 0;
  let quote = null;
  for (let i = start2; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") level++;
    else if (c === "}") {
      level--;
      if (level === 0) return i;
    }
  }
  return -1;
}
function sliceText(raw) {
  const segments = [];
  let literal = "";
  let i = 0;
  const saveLiteral = () => {
    if (literal) segments.push({ text: literal });
    literal = "";
  };
  while (i < raw.length) {
    const open = raw.indexOf("{", i);
    if (open === -1) {
      literal += raw.slice(i);
      break;
    }
    literal += raw.slice(i, open);
    const double = raw[open + 1] === "{";
    const close = double ? raw.indexOf("}}", open + 2) : closeBrace(raw, open);
    if (close === -1) {
      literal += raw[open];
      i = open + 1;
      continue;
    }
    const expression = double ? raw.slice(open + 2, close) : raw.slice(open + 1, close);
    const end = double ? close + 2 : close + 1;
    const fits = double || expression.length <= EXPRESSION_LIMIT;
    if (fits && looksLikeExpression(expression)) {
      saveLiteral();
      segments.push({
        expression: expression.trim(),
        raw: raw.slice(open, end),
        explicit: double
      });
      i = end;
      continue;
    }
    literal += raw[open];
    i = open + 1;
  }
  saveLiteral();
  return segments;
}
var NO_INTERPOLATION = /* @__PURE__ */ new Set(["PRE", "CODE", "SCRIPT", "STYLE", "TEXTAREA"]);
function keepsLiteral(segment, value, scope) {
  if (segment.explicit || segment.raw === void 0) return false;
  let node;
  try {
    node = parse(segment.expression);
  } catch {
    return true;
  }
  if (node.t === "lit") return true;
  if (value !== void 0) return false;
  if (node.t === "id") return scope.lookup(node.n) === void 0 && !(node.n in allowedGlobals);
  return false;
}
function bindTextNode(node, scope) {
  const raw = node.textContent;
  if (!raw || raw.indexOf("{") === -1) return;
  if (initialized.has(node)) return;
  let ancestor = node.parentElement;
  while (ancestor) {
    if (NO_INTERPOLATION.has(ancestor.tagName)) return;
    if (ancestor.hasAttribute(`${config.prefix}ignore`) || ancestor.hasAttribute(`${config.prefix}pre`) || ancestor.hasAttribute("data-v-ignore") || ancestor.hasAttribute("data-v-pre")) {
      return;
    }
    ancestor = ancestor.parentElement;
  }
  const segments = sliceText(raw);
  if (!segments.some((s) => s.expression)) return;
  initialized.add(node);
  const owner = new EffectScope(true);
  addCleanup(node, () => owner.stop());
  trackEffectScope(node, owner);
  owner.run(
    () => effect(() => {
      let out = "";
      for (const segment of segments) {
        if (segment.text !== void 0) {
          out += segment.text;
          continue;
        }
        const value = evaluateIn(segment.expression, scope, "interpolation");
        out += keepsLiteral(segment, value, scope) ? segment.raw : stringify(value);
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
var startHooks = [];
function onStart(hook2) {
  startHooks.push(hook2);
}
function runPhase(target, after) {
  for (const hook2 of startHooks) {
    try {
      hook2(target, after);
    } catch (error) {
      console.error("[Voodoo] a start hook failed", error);
    }
  }
}
function start(root) {
  if (typeof document === "undefined") return;
  const target = root ?? config.root ?? document.body;
  if (!target) return;
  Object.assign(allowedGlobals, config.globals);
  runPhase(target, false);
  walk(target, rootScope);
  runPhase(target, true);
  if (!started) {
    started = true;
    watchTheme();
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
        if (ignoredRemovals.has(removed)) {
          ignoredRemovals.delete(removed);
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

export { Scope, VoodooRuntimeError, VoodooSyntaxError, addCleanup, allowedGlobals, cache2 as cache, clearParseCache, closestDirective, collectDirectives, componentAliases, cookie, currentHookHost, destroy, evaluate, evaluateIn, findScope, getEffectScopes, getScope, hadDirectives, hasAttr, hasDirective, hasDirectives, hook, hooks, isInitialized, magic, magics, markInitialized, markNodeScope, markSkipChildren, onStart, originalAttributes, parse, parseAttribute, queryDirective, readAttr, refresh, removeQuietly, restoreAttributes, rootScope, session, setComponentMounter, start, stopObserving, storage, stringify, theme, tokenize, unwrap, url, walk, watchTheme };
//# sourceMappingURL=chunk-5KUKRKGS.js.map
//# sourceMappingURL=chunk-5KUKRKGS.js.map