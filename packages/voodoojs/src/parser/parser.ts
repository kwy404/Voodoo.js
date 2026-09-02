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
  | { t: 'unary'; op: string; a: Node }
  | { t: 'update'; op: string; a: Node; prefix: boolean }
  | { t: 'bin'; op: string; l: Node; r: Node }
  | { t: 'logic'; op: string; l: Node; r: Node }
  | { t: 'cond'; test: Node; cons: Node; alt: Node }
  | { t: 'assign'; op: string; target: Node; value: Node }
  | { t: 'arrow'; params: string[]; body: Node }
  | { t: 'obj'; props: ObjectProperty[] }
  | { t: 'arr'; els: Array<Node | { spread: Node }> }
  | { t: 'seq'; body: Node[] };

export interface ObjectProperty {
  /** Fixed key name, or `null` when the key is computed. */
  key: string | null;
  keyExpr?: Node;
  value?: Node;
  spread?: Node;
}

/** Precedence of binary operators. Higher binds tighter. */
const BINARY_PRECEDENCE: Record<string, number> = {
  '??': 1,
  '||': 2,
  '&&': 3,
  '==': 6,
  '!=': 6,
  '===': 6,
  '!==': 6,
  '<': 7,
  '>': 7,
  '<=': 7,
  '>=': 7,
  in: 7,
  instanceof: 7,
  '+': 9,
  '-': 9,
  '*': 10,
  '/': 10,
  '%': 10,
  '**': 11,
};

const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '&&=', '||=', '??=']);
const UNARY_OPS = new Set(['!', '-', '+', 'typeof', 'void']);

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
      body.push(this.parseExpression());
      while (this.isPunct(';')) this.next();
    }
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
      return { t: 'arrow', params: [param], body: this.parseAssignment() };
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
    const params: string[] = [];
    while (!this.isPunct(')')) {
      const t = this.next();
      if (t.type !== 'ident') {
        this.pos = start;
        return null;
      }
      params.push(t.value);
      if (this.isPunct(',')) this.next();
    }
    this.expect(')');
    this.expect('=>');
    return { t: 'arrow', params, body: this.parseAssignment() };
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

  private parseCallMember(): Node {
    let expr = this.parsePrimary();

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
        const keyToken = this.next();
        if (keyToken.type !== 'ident' && keyToken.type !== 'str' && keyToken.type !== 'num') {
          throw new VoodooSyntaxError('Invalid object key', this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(':')) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
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
