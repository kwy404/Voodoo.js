/**
 * @module parser/lexer
 *
 * Tokenizer for the JavaScript subset accepted within `v-*` attributes.
 *
 * Voodoo does not use `eval` or `new Function`. All expression text
 * goes through this lexer, then the parser, and finally through a tree
 * interpreter. This keeps the library compatible with restrictive Content
 * Security Policy, without `unsafe-eval`.
 */

export type TokenType = 'num' | 'str' | 'tpl' | 'ident' | 'punct' | 'eof';

export interface TemplatePart {
  /** Literal chunks between interpolations. Always has 1 more item than `exprs`. */
  quasis: string[];
  /** Source code of each `${...}`. */
  exprs: string[];
}

export interface Token {
  type: TokenType;
  value: string;
  /** Value already converted to number or string, when applicable. */
  parsed?: number | string;
  tpl?: TemplatePart;
  start: number;
  end: number;
}

/** Syntax error with position within the original expression. */
export class VoodooSyntaxError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly position: number
  ) {
    const pointer = `${source}\n${' '.repeat(Math.max(0, position))}^`;
    super(`${message}\n\n${pointer}`);
    this.name = 'VoodooSyntaxError';
  }
}

/**
 * Multi-character operators, longest first.
 *
 * The order is the whole algorithm: `matchPunctuator` returns the first entry
 * that matches, so `>>>=` has to be tried before `>>>`, which has to be tried
 * before `>>`, which has to be tried before `>`. Put a short one early and the
 * long one becomes unreachable.
 *
 * The compound assignments `<<=`, `>>=` and `>>>=` were here from the start
 * while the plain `<<`, `>>` and `>>>` were not, so `x <<= 1` lexed and
 * `1 << 4` did not: the lexer matched `<`, then met a second `<` it had no rule
 * for and reported "Unexpected token". The bitwise operators were 216 of the
 * 234 expressions the conformance suite found that JavaScript accepts and this
 * parser refused.
 */
const PUNCTUATORS = [
  '>>>=',
  '===',
  '!==',
  '**=',
  '...',
  '>>>',
  '<<=',
  '>>=',
  '&&=',
  '||=',
  '??=',
  '?.',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '**',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '!',
  '<',
  '>',
  '=',
  '&',
  '|',
  '^',
  '~',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  ',',
  '.',
  '?',
  ':',
  ';',
];

// Accepts accented letters in variable names, useful for Portuguese code.
const IDENT_START = /[A-Za-z_$À-￿]/;
const IDENT_PART = /[A-Za-z0-9_$À-￿]/;

function isIdentStart(ch: string): boolean {
  return IDENT_START.test(ch);
}

function isIdentPart(ch: string): boolean {
  return IDENT_PART.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/**
 * Converts an expression to a list of tokens.
 *
 * @throws {VoodooSyntaxError} when it encounters an invalid character.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    // Whitespace and line breaks.
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
      i++;
      continue;
    }

    // Line and block comments.
    if (ch === '/' && source[i + 1] === '/') {
      while (i < len && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) throw new VoodooSyntaxError('Unclosed block comment', source, i);
      i = end + 2;
      continue;
    }

    const start = i;

    // Numbers: decimal, hexadecimal, binary, scientific notation and _ separator.
    if (isDigit(ch) || (ch === '.' && isDigit(source[i + 1]))) {
      let raw = '';
      if (ch === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        raw = '0x';
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) raw += source[i++];
      } else if (ch === '0' && (source[i + 1] === 'b' || source[i + 1] === 'B')) {
        raw = '0b';
        i += 2;
        while (i < len && /[01_]/.test(source[i])) raw += source[i++];
      } else if (ch === '0' && (source[i + 1] === 'o' || source[i + 1] === 'O')) {
        // Octal was the one radix missing, and it failed quietly rather than
        // loudly: `0o17` fell through to the branch below, which read `0`,
        // stopped at the `o`, and left `o17` behind as an identifier. The
        // expression evaluated to `undefined` instead of 15, with no error.
        raw = '0o';
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) raw += source[i++];
      } else {
        while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        if (source[i] === '.') {
          raw += source[i++];
          while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        }
        if (source[i] === 'e' || source[i] === 'E') {
          raw += source[i++];
          if (source[i] === '+' || source[i] === '-') raw += source[i++];
          while (i < len && isDigit(source[i])) raw += source[i++];
        }
      }
      const parsed = Number(raw.replace(/_/g, ''));
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError('Invalid number', source, start);
      tokens.push({ type: 'num', value: raw, parsed, start, end: i });
      continue;
    }

    // Strings with single or double quotes.
    if (ch === '"' || ch === "'") {
      i++;
      let out = '';
      while (i < len && source[i] !== ch) {
        if (source[i] === '\\') {
          i++;
          const esc = source[i];
          if (esc === 'u') {
            if (source[i + 1] === '{') {
              // Without the `}` the `indexOf` returns -1, and the old code did
              // `i = close + 1`, that is, it moved the cursor to the beginning of
              // the source and re-analyzed everything with wrong positions.
              const close = source.indexOf('}', i);
              if (close === -1)
                throw new VoodooSyntaxError('Unclosed Unicode escape', source, start);
              const digits = source.slice(i + 2, close);
              // `String.fromCodePoint` throws raw RangeError for NaN and for
              // values above 0x10FFFF. Validating here keeps the contract that
              // every invalid input becomes VoodooSyntaxError.
              if (!/^[0-9a-fA-F]+$/.test(digits) || parseInt(digits, 16) > 0x10ffff)
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
                  'Invalid Unicode escape: \\u needs 4 hexadecimal digits',
                  source,
                  i - 1
                );
              out += String.fromCharCode(parseInt(digits, 16));
              i += 5;
            }
          } else if (esc === 'x') {
            const digits = source.slice(i + 1, i + 3);
            if (!/^[0-9a-fA-F]{2}$/.test(digits))
              throw new VoodooSyntaxError(
                'Invalid hexadecimal escape: \\x needs 2 hexadecimal digits',
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
      if (i >= len) throw new VoodooSyntaxError('Unclosed string', source, start);
      i++; // closing quote
      tokens.push({ type: 'str', value: out, parsed: out, start, end: i });
      continue;
    }

    // Template literals with interpolation.
    if (ch === '`') {
      i++;
      const quasis: string[] = [];
      const exprs: string[] = [];
      let current = '';
      while (i < len && source[i] !== '`') {
        if (source[i] === '\\') {
          const esc = source[i + 1];
          current += ESCAPES[esc] ?? esc;
          i += 2;
          continue;
        }
        if (source[i] === '$' && source[i + 1] === '{') {
          quasis.push(current);
          current = '';
          i += 2;
          let depth = 1;
          let expr = '';
          while (i < len) {
            const c = source[i];
            if (c === '{') depth++;
            else if (c === '}') {
              depth--;
              if (depth === 0) break;
            } else if (c === '"' || c === "'" || c === '`') {
              // Copies the entire inner string to not count braces inside it.
              const quote = c;
              expr += source[i++];
              while (i < len && source[i] !== quote) {
                if (source[i] === '\\') expr += source[i++];
                expr += source[i++];
              }
            }
            expr += source[i++];
          }
          if (depth !== 0)
            throw new VoodooSyntaxError('Unclosed template interpolation', source, start);
          i++; // close brace
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError('Unclosed template literal', source, start);
      i++; // closing backtick
      quasis.push(current);
      tokens.push({
        type: 'tpl',
        value: source.slice(start, i),
        tpl: { quasis, exprs },
        start,
        end: i,
      });
      continue;
    }

    // Identifiers and reserved words.
    if (isIdentStart(ch)) {
      let name = '';
      while (i < len && isIdentPart(source[i])) name += source[i++];
      tokens.push({ type: 'ident', value: name, start, end: i });
      continue;
    }

    // Operators and punctuation.
    let matched: string | undefined;
    for (const p of PUNCTUATORS) {
      if (source.startsWith(p, i)) {
        // `?.` followed by digit is the ternary operator with number, not optional chaining.
        if (p === '?.' && isDigit(source[i + 2])) continue;
        matched = p;
        break;
      }
    }
    if (matched) {
      i += matched.length;
      tokens.push({ type: 'punct', value: matched, start, end: i });
      continue;
    }

    throw new VoodooSyntaxError(`Unexpected character "${ch}"`, source, i);
  }

  tokens.push({ type: 'eof', value: '', start: len, end: len });
  return tokens;
}
