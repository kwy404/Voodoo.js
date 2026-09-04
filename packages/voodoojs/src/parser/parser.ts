/**
 * @module parser/parser
 *
 * Pratt parser (operator precedence) that transforms tokens to AST.
 *
 * Supports the subset of JavaScript that makes sense within an attribute:
 * literals, identifiers, member access, function calls, unary and binary
 * operators, ternary, assignment, increment, objects, arrays, arrow functions,
 * template literals, spread, optional chaining and sequences with `;`.
 *
 * Does not support, by design decision: `function`, `class`, `new`, `delete`,
 * `import`, `await`, `for` loop, `while`, `try` and complex destructuring.
 * Attribute expressions should be short. Larger logic lives in methods.
 */

import { tokenize, VoodooSyntaxError, type Token } from './lexer';

// ---------------------------------------------------------------------------
// AST nodes
// ---------------------------------------------------------------------------

export type Node =
  | { t: 'lit'; v: string | number | boolean | null | undefined }
  | { t: 'tpl'; quasis: string[]; exprs: Node[] }
  | { t: 'id'; n: string }
  | { t: 'member'; o: Node; p: Node; computed: boolean; opt: boolean }
  | { t: 'call'; callee: Node; args: Node[]; opt: boolean }
  | { t: 'new'; callee: Node; args: Node[] }
  | { t: 'unary'; op: string; a: Node }
  | { t: 'update'; op: string; a: Node; prefix: boolean }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'logic'; op: string; l: Node; r: Node }
  | { t: 'cond'; test: Node; cons: Node; alt: Node }
  | { t: 'assign'; op: string; target: Node; value: Node }
  | { t: 'arrow'; params: Param[]; body: Node }
  | { t: 'method'; params: Param[]; body: Node }
  | { t: 'if'; test: Node; cons: Node; alt: Node | null }
  | { t: 'obj'; props: ObjectProperty[] }
  | { t: 'arr'; els: Array<Node | { spread: Node }> }
  | { t: 'seq'; body: Node[] };

export interface ObjectProperty {
  /** Fixed key name, or `null` when the key is computed. */
  key: string | null;
  keyExpr?: Node;
  value?: Node;
  spread?: Node;
  /** `true` for `{ get name() { ... } }`, evaluated on every read. */
  getter?: boolean;
}

/** Precedence of binary operators. Higher binds tighter. */
/**
 * Binding power, loosest first, matching JavaScript exactly.
 *
 * Only the ORDER matters. The values are compared against each other in
 * `parseBinaryInternal` and never used as absolute numbers, so the scale can be
 * renumbered freely; it was renumbered to fit the three bitwise levels, which
 * had nowhere to go between `&&` and equality on the old scale.
 *
 * The rung that surprises people is `&`, `^` and `|`: they bind LOOSER than
 * equality, so `a & b === c` is `a & (b === c)` and not `(a & b) === c`. That is
 * a genuine JavaScript wart, and copying it is the point. The conformance suite
 * checks these against the host engine rather than against this table, so a
 * plausible but wrong ordering here fails there.
 */
const BINARY_PRECEDENCE: Record<string, number> = {
  '??': 1,
  '||': 2,
  '&&': 3,
  '|': 4,
  '^': 5,
  '&': 6,
  '==': 7,
  '!=': 7,
  '===': 7,
  '!==': 7,
  '<': 8,
  '>': 8,
  '<=': 8,
  '>=': 8,
  in: 8,
  instanceof: 8,
  '<<': 9,
  '>>': 9,
  '>>>': 9,
  '+': 10,
  '-': 10,
  '*': 11,
  '/': 11,
  '%': 11,
  '**': 12,
};

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '&&=', '||=', '??=']);
/**
 * One parameter of an arrow function or an object method.
 *
 * Parameters used to be plain strings, which meant only the simplest form
 * worked. `((x = 1) => x)()`, `((...xs) => xs)(1, 2)` and
 * `people.map(({ name }) => name)` all failed to parse, and the last of those
 * is how anybody actually writes that line.
 *
 * `def` carries a default for every shape, because JavaScript allows one
 * wherever a binding appears, including inside a pattern.
 */
export type Param =
  | { kind: 'id'; name: string; def?: Node }
  | { kind: 'rest'; name: string }
  | { kind: 'obj'; props: Array<{ key: string; value: Param }>; rest?: string; def?: Node }
  | { kind: 'arr'; elements: Array<Param | null>; rest?: string; def?: Node };

const UNARY_OPS = new Set(['!', '-', '+', '~', 'typeof', 'void', 'delete']);

/**
 * Words that stand on their own.
 *
 * The object is created without a prototype on purpose. With a regular object,
 * `"constructor" in LITERALS` would be true by inheritance, and the identifier
 * `constructor` would become a literal with the value of `Object`, delivering
 * `Function` to any expression. The same went for `toString`, `valueOf` and
 * `__proto__`.
 */
const LITERALS: Record<string, string | number | boolean | null | undefined> =
  /* @__PURE__ */ Object.assign(Object.create(null) as Record<string, never>, {
    true: true,
    false: false,
    null: null,
    undefined: undefined,
  });

/**
 * Limit for nesting expressions.
 *
 * The parser is recursive. Without a limit, input like `((((...))))` with
 * thousands of levels would overflow the stack and leak a raw `RangeError`
 * ("Maximum call stack size exceeded") to whoever wrote the attribute. The
 * contract here is the opposite: absurd input must become VoodooSyntaxError
 * with a clear message. Each nesting level consumes three counter steps
 * (`parseAssignment`, `parseBinary` and `parseUnary`), so 1200 equals ~400
 * nested parentheses, well above any real attribute expression and well below
 * the point where the native stack runs out (~2500 levels).
 */
const MAX_DEPTH = 1200;

/**
 * Limit for nested templates (`` `${`${...}`}` ``).
 *
 * Each interpolation calls `parse` again, creating a new Parser with the
 * counter reset. Without a module-level counter, template nesting would escape
 * the limit above and stack overflow again.
 */
const MAX_TEMPLATE_DEPTH = 32;
let templateDepth = 0;

class Parser {
  private pos = 0;
  private depth = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly source: string
  ) {}

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private isPunct(value: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.type === 'punct' && t.value === value;
  }

  private isIdent(value: string, offset = 0): boolean {
    const t = this.peek(offset);
    return t.type === 'ident' && t.value === value;
  }

  private expect(value: string): Token {
    if (!this.isPunct(value)) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expected "${value}" but found "${t.value || 'end of expression'}"`,
        this.source,
        t.start
      );
    }
    return this.next();
  }

  /** Entry point: one or more expressions separated by `;` or `,` at the top. */
  parseProgram(): Node {
    const body: Node[] = [];
    while (this.peek().type !== 'eof') {
      body.push(this.parseStatement());
      // Both separators are accepted. `@click="a++; b++"` and
      // `@click="a++, b++"` are equally natural to write in an attribute, and
      // the comma used to fail with a confusing "unexpected token".
      while (this.isPunct(';') || this.isPunct(',')) this.next();
    }
    if (body.length === 0) return { t: 'lit', v: undefined };
    if (body.length === 1) return body[0];
    return { t: 'seq', body };
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
  private parseArrowBody(): Node {
    if (!this.isPunct('{')) return this.parseAssignment();

    this.next(); // {
    const body: Node[] = [];
    while (!this.isPunct('}') && this.peek().type !== 'eof') {
      body.push(this.parseStatement());
      while (this.isPunct(';') || this.isPunct(',')) this.next();
    }
    this.expect('}');

    if (body.length === 0) return { t: 'lit', v: undefined };
    if (body.length === 1) return body[0];
    return { t: 'seq', body };
  }

  /**
   * One statement. Only `if` needs its own form; everything else in this
   * language is an expression.
   */
  private parseStatement(): Node {
    if (this.peek().type === 'ident' && this.peek().value === 'if' && this.isPunct('(', 1)) {
      this.next(); // if
      this.expect('(');
      const test = this.parseExpression();
      this.expect(')');
      const cons = this.parseBlockOrStatement();
      let alt: Node | null = null;
      if (this.peek().type === 'ident' && this.peek().value === 'else') {
        this.next();
        alt = this.parseBlockOrStatement();
      }
      return { t: 'if', test, cons, alt };
    }
    return this.parseExpression();
  }

  /** The body of an `if` or `else`, with or without braces. */
  private parseBlockOrStatement(): Node {
    if (!this.isPunct('{')) return this.parseStatement();
    this.next();
    const body: Node[] = [];
    while (!this.isPunct('}') && this.peek().type !== 'eof') {
      body.push(this.parseStatement());
      while (this.isPunct(';') || this.isPunct(',')) this.next();
    }
    this.expect('}');
    if (body.length === 0) return { t: 'lit', v: undefined };
    if (body.length === 1) return body[0];
    return { t: 'seq', body };
  }

  parseExpression(): Node {
    return this.parseAssignment();
  }

  /** Raises recursion level and rejects expression when exceeding limit. */
  private enterLevel(): void {
    if (++this.depth > MAX_DEPTH) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expression too deeply nested (limit of ${MAX_DEPTH} levels)`,
        this.source,
        t.start
      );
    }
  }

  private parseAssignment(): Node {
    this.enterLevel();
    const node = this.parseAssignmentInternal();
    this.depth--;
    return node;
  }

  private parseAssignmentInternal(): Node {
    // Arrow function with single parameter without parentheses: `x => x * 2`
    if (this.peek().type === 'ident' && this.isPunct('=>', 1)) {
      const param = this.next().value;
      this.next(); // =>
      return { t: 'arrow', params: [{ kind: 'id', name: param }], body: this.parseArrowBody() };
    }

    // Arrow function with parentheses: `(a, b) => a + b`
    if (this.isPunct('(')) {
      const arrow = this.tryParseParenArrow();
      if (arrow) return arrow;
    }

    const left = this.parseConditional();
    const t = this.peek();
    if (t.type === 'punct' && ASSIGN_OPS.has(t.value)) {
      if (left.t !== 'id' && left.t !== 'member') {
        throw new VoodooSyntaxError('Invalid assignment target', this.source, t.start);
      }
      this.next();
      const value = this.parseAssignment();
      return { t: 'assign', op: t.value, target: left, value };
    }
    return left;
  }

  /**
   * Tries to read `( params ) =>`. If what comes after the closing parenthesis
   * is not `=>`, returns to original position and lets normal parsing continue.
   */
  private tryParseParenArrow(): Node | null {
    const start = this.pos;
    let depth = 0;
    let i = this.pos;
    for (; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === 'punct' && t.value === '(') depth++;
      else if (t.type === 'punct' && t.value === ')') {
        depth--;
        if (depth === 0) break;
      } else if (t.type === 'eof') break;
    }
    const after = this.tokens[i + 1];
    if (!after || after.type !== 'punct' || after.value !== '=>') return null;

    this.next(); // (
    let params: Param[];
    try {
      params = this.parseParamList();
    } catch {
      // Not a parameter list after all. The lookahead above only proved that a
      // `=>` follows the matching `)`, which `(a, b) => c` and `(a.b) => c`
      // both satisfy; only an attempt to read the contents as bindings can tell
      // them apart. Rewinding leaves ordinary expression parsing to produce the
      // error, which is the one that will make sense to the reader.
      this.pos = start;
      return null;
    }
    this.expect('=>');
    return { t: 'arrow', params, body: this.parseArrowBody() };
  }

  /** Parameters up to the closing parenthesis, which it consumes. */
  private parseParamList(): Param[] {
    const params: Param[] = [];
    while (!this.isPunct(')')) {
      params.push(this.parseParam());
      if (this.isPunct(',')) this.next();
      else break;
    }
    this.expect(')');
    return params;
  }

  /**
   * One binding: `x`, `x = 1`, `...xs`, `{ a, b: c = 2 }`, `[a, , b]`.
   *
   * Recursive, so a pattern nests to any depth the way JavaScript's does.
   */
  private parseParam(): Param {
    if (this.isPunct('...')) {
      this.next();
      const name = this.next();
      if (name.type !== 'ident') {
        throw new VoodooSyntaxError('Expected a name after ...', this.source, name.start);
      }
      return { kind: 'rest', name: name.value };
    }

    let param: Param;

    if (this.isPunct('{')) {
      this.next();
      const props: Array<{ key: string; value: Param }> = [];
      let rest: string | undefined;
      while (!this.isPunct('}')) {
        if (this.isPunct('...')) {
          this.next();
          const name = this.next();
          if (name.type !== 'ident') {
            throw new VoodooSyntaxError('Expected a name after ...', this.source, name.start);
          }
          rest = name.value;
        } else {
          const key = this.next();
          if (key.type !== 'ident' && key.type !== 'str') {
            throw new VoodooSyntaxError('Expected a property name', this.source, key.start);
          }
          // `{ a: b }` renames, `{ a }` binds under its own name.
          const value = this.isPunct(':')
            ? (this.next(), this.parseParam())
            : ({ kind: 'id', name: key.value } as Param);
          // `{ a = 1 }`, the default on the shorthand rather than on a rename.
          if (this.isPunct('=')) {
            this.next();
            (value as { def?: Node }).def = this.parseAssignment();
          }
          props.push({ key: String(key.value), value });
        }
        if (this.isPunct(',')) this.next();
        else break;
      }
      this.expect('}');
      param = { kind: 'obj', props, rest };
    } else if (this.isPunct('[')) {
      this.next();
      const elements: Array<Param | null> = [];
      let rest: string | undefined;
      while (!this.isPunct(']')) {
        if (this.isPunct(',')) {
          // A hole: `[, a]` skips the first element.
          this.next();
          elements.push(null);
          continue;
        }
        if (this.isPunct('...')) {
          this.next();
          const name = this.next();
          if (name.type !== 'ident') {
            throw new VoodooSyntaxError('Expected a name after ...', this.source, name.start);
          }
          rest = name.value;
        } else {
          elements.push(this.parseParam());
        }
        if (this.isPunct(',')) this.next();
        else break;
      }
      this.expect(']');
      param = { kind: 'arr', elements, rest };
    } else {
      const name = this.next();
      if (name.type !== 'ident') {
        throw new VoodooSyntaxError('Expected a parameter name', this.source, name.start);
      }
      param = { kind: 'id', name: name.value };
    }

    if (this.isPunct('=')) {
      this.next();
      param.def = this.parseAssignment();
    }
    return param;
  }

  private parseConditional(): Node {
    const test = this.parseBinary(0);
    if (this.isPunct('?')) {
      this.next();
      const cons = this.parseAssignment();
      this.expect(':');
      const alt = this.parseAssignment();
      return { t: 'cond', test, cons, alt };
    }
    return test;
  }

  private parseBinary(minPrec: number): Node {
    this.enterLevel();
    const node = this.parseBinaryInternal(minPrec);
    this.depth--;
    return node;
  }

  private parseBinaryInternal(minPrec: number): Node {
    let left = this.parseUnary();

    for (;;) {
      const t = this.peek();
      const op = t.value;
      const isOperator =
        (t.type === 'punct' && op in BINARY_PRECEDENCE) ||
        (t.type === 'ident' && (op === 'in' || op === 'instanceof'));
      if (!isOperator) break;

      const prec = BINARY_PRECEDENCE[op];
      if (prec === undefined || prec <= minPrec) break;

      this.next();
      // `**` associates right, others associate left.
      const right = this.parseBinary(op === '**' ? prec - 1 : prec);
      const kind = op === '&&' || op === '||' || op === '??' ? 'logic' : 'bin';
      left = { t: kind, op, l: left, r: right } as Node;
    }
    return left;
  }

  private parseUnary(): Node {
    this.enterLevel();
    const node = this.parseUnaryInternal();
    this.depth--;
    return node;
  }

  private parseUnaryInternal(): Node {
    const t = this.peek();

    if ((t.type === 'punct' || t.type === 'ident') && UNARY_OPS.has(t.value)) {
      // `-` and `+` as binary have already been handled; here they are prefixes.
      this.next();
      return { t: 'unary', op: t.value, a: this.parseUnary() };
    }

    if (t.type === 'punct' && (t.value === '++' || t.value === '--')) {
      this.next();
      const arg = this.parseUnary();
      return { t: 'update', op: t.value, a: arg, prefix: true };
    }

    let expr = this.parseCallMember();

    const post = this.peek();
    if (post.type === 'punct' && (post.value === '++' || post.value === '--')) {
      this.next();
      expr = { t: 'update', op: post.value, a: expr, prefix: false };
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
  private parseNew(): Node {
    this.next(); // `new`

    const callee = this.parseMemberOnly(this.parsePrimary());
    const args = this.isPunct('(') ? this.parseArguments() : [];

    return { t: 'new', callee, args } as Node;
  }

  /**
   * Member access only: `.x`, `?.x` and `[x]`, stopping at a call.
   *
   * Used for a `new` callee, where the argument list belongs to the `new`
   * rather than to the expression it is constructing.
   */
  private parseMemberOnly(start: Node): Node {
    let expr = start;
    for (;;) {
      if (this.isPunct('.')) {
        this.next();
        const prop = this.next();
        if (prop.type !== 'ident') {
          throw new VoodooSyntaxError('Invalid property name', this.source, prop.start);
        }
        expr = { t: 'member', o: expr, p: { t: 'lit', v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct('[')) {
        this.next();
        const p = this.parseExpression();
        this.expect(']');
        expr = { t: 'member', o: expr, p, computed: true, opt: false };
      } else {
        return expr;
      }
    }
  }

  private parseCallMember(): Node {
    let expr = this.isIdent('new') ? this.parseNew() : this.parsePrimary();

    for (;;) {
      if (this.isPunct('.')) {
        this.next();
        const prop = this.next();
        if (prop.type !== 'ident') {
          throw new VoodooSyntaxError('Invalid property name', this.source, prop.start);
        }
        expr = { t: 'member', o: expr, p: { t: 'lit', v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct('?.')) {
        this.next();
        if (this.isPunct('(')) {
          expr = { t: 'call', callee: expr, args: this.parseArguments(), opt: true };
        } else if (this.isPunct('[')) {
          this.next();
          const p = this.parseExpression();
          this.expect(']');
          expr = { t: 'member', o: expr, p, computed: true, opt: true };
        } else {
          const prop = this.next();
          if (prop.type !== 'ident') {
            throw new VoodooSyntaxError('Invalid property name', this.source, prop.start);
          }
          expr = {
            t: 'member',
            o: expr,
            p: { t: 'lit', v: prop.value },
            computed: false,
            opt: true,
          };
        }
      } else if (this.isPunct('[')) {
        this.next();
        const p = this.parseExpression();
        this.expect(']');
        expr = { t: 'member', o: expr, p, computed: true, opt: false };
      } else if (this.isPunct('(')) {
        expr = { t: 'call', callee: expr, args: this.parseArguments(), opt: false };
      } else {
        return expr;
      }
    }
  }

  private parseArguments(): Node[] {
    this.expect('(');
    const args: Node[] = [];
    while (!this.isPunct(')')) {
      if (this.isPunct('...')) {
        this.next();
        args.push({ t: 'unary', op: '...', a: this.parseAssignment() });
      } else {
        args.push(this.parseAssignment());
      }
      if (this.isPunct(',')) this.next();
      else break;
    }
    this.expect(')');
    return args;
  }

  private parsePrimary(): Node {
    const t = this.peek();

    // `function (a, b) { ... }` as an expression, which is what makes the
    // classic `(function () { ... })()` work. It produces the same node an
    // arrow does: there is no `this` to bind inside an expression, and no
    // `arguments`, so the two forms behave identically here. A name, as in
    // `function nome() {}`, is parsed and ignored, because there is nowhere
    // for it to be hoisted to.
    if (t.type === 'ident' && t.value === 'function') {
      this.next();
      if (this.peek().type === 'ident') this.next(); // optional name
      this.expect('(');
      const params = this.parseParamList();
      return { t: 'arrow', params, body: this.parseArrowBody() };
    }

    if (t.type === 'num' || t.type === 'str') {
      this.next();
      return { t: 'lit', v: t.parsed as string | number };
    }

    if (t.type === 'tpl') {
      this.next();
      const part = t.tpl!;
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
          t: 'tpl',
          quasis: part.quasis,
          exprs: part.exprs.map((src) => parse(src)),
        };
      } finally {
        templateDepth--;
      }
    }

    if (t.type === 'ident') {
      if (t.value in LITERALS) {
        this.next();
        return { t: 'lit', v: LITERALS[t.value] };
      }
      this.next();
      return { t: 'id', n: t.value };
    }

    if (t.type === 'punct') {
      if (t.value === '(') {
        this.next();
        const expr = this.parseExpression();
        this.expect(')');
        return expr;
      }
      if (t.value === '[') return this.parseArrayLiteral();
      if (t.value === '{') return this.parseObjectLiteral();
    }

    throw new VoodooSyntaxError(
      `Unexpected token "${t.value || 'end of expression'}"`,
      this.source,
      t.start
    );
  }

  private parseArrayLiteral(): Node {
    this.expect('[');
    const els: Array<Node | { spread: Node }> = [];
    while (!this.isPunct(']')) {
      if (this.isPunct('...')) {
        this.next();
        els.push({ spread: this.parseAssignment() });
      } else {
        els.push(this.parseAssignment());
      }
      if (this.isPunct(',')) this.next();
      else break;
    }
    this.expect(']');
    return { t: 'arr', els };
  }

  private parseObjectLiteral(): Node {
    this.expect('{');
    const props: ObjectProperty[] = [];

    while (!this.isPunct('}')) {
      if (this.isPunct('...')) {
        this.next();
        props.push({ key: null, spread: this.parseAssignment() });
      } else if (this.isPunct('[')) {
        this.next();
        const keyExpr = this.parseAssignment();
        this.expect(']');
        this.expect(':');
        props.push({ key: null, keyExpr, value: this.parseAssignment() });
      } else {
        // `{ get total() { ... } }`. Only a getter: a setter would need an
        // assignment target the scope model has nowhere to put.
        if (
          this.peek().type === 'ident' &&
          this.peek().value === 'get' &&
          this.peek(1).type === 'ident' &&
          this.isPunct('(', 2)
        ) {
          this.next(); // get
          const nameToken = this.next();
          this.expect('(');
          this.expect(')');
          props.push({
            key: String(nameToken.value),
            getter: true,
            value: { t: 'method', params: [], body: this.parseArrowBody() },
          });
          if (this.isPunct(',')) this.next();
          continue;
        }

        const keyToken = this.next();
        if (keyToken.type !== 'ident' && keyToken.type !== 'str' && keyToken.type !== 'num') {
          throw new VoodooSyntaxError('Invalid object key', this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(':')) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
        } else if (this.isPunct('(')) {
          // Method shorthand: `{ double() { return n * 2 } }`, which is the
          // form anyone coming from Vue reaches for first and which used to
          // fail with `Expected "}" but found "("`.
          //
          // It becomes the same node an arrow does. Inside `v-data` the state is
          // already in scope by name, so the body writes `n` rather than
          // `this.n`, and no `this` binding is needed.
          this.next();
          const params = this.parseParamList();
          props.push({ key, value: { t: 'method', params, body: this.parseArrowBody() } });
        } else {
          // Shorthand notation: `{ count }` is equivalent to `{ count: count }`.
          props.push({ key, value: { t: 'id', n: key } });
        }
      }
      if (this.isPunct(',')) this.next();
      else break;
    }

    this.expect('}');
    return { t: 'obj', props };
  }
}

/** AST cache by expression text. Each expression is parsed only once. */
const cache = new Map<string, Node>();
const MAX_CACHE = 2000;

/**
 * Converts text to AST, with caching.
 *
 * ```js
 * parse('count + 1')
 * // { t: 'bin', op: '+', l: { t: 'id', n: 'count' }, r: { t: 'lit', v: 1 } }
 * ```
 */
export function parse(source: string): Node {
  const cached = cache.get(source);
  if (cached) return cached;

  const node = new Parser(tokenize(source), source).parseProgram();

  if (cache.size >= MAX_CACHE) evictOldest();
  cache.set(source, node);
  return node;
}

/**
 * Discards the oldest half of the cache when it fills up.
 *
 * Before this was `cache.clear()`. A page that exceeded the limit would lose
 * everything at once, including expressions currently in use, and re-analyze
 * all of them from scratch. `Map` preserves insertion order, so removing the
 * oldest half keeps what came in last, which is what the page is using now.
 */
function evictOldest(): void {
  const alvo = Math.floor(MAX_CACHE / 2);
  let removidos = 0;
  for (const chave of cache.keys()) {
    cache.delete(chave);
    if (++removidos >= alvo) break;
  }
}

/** Clears the expression cache. Used in tests and hot reload. */
export function clearParseCache(): void {
  cache.clear();
}

export { VoodooSyntaxError };
