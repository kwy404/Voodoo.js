/**
 * @module parser/lexer
 *
 * Tokenizador do subconjunto de JavaScript aceito dentro de atributos `v-*`.
 *
 * A Voodoo nao usa `eval` nem `new Function`. Todo o texto de uma expressao
 * passa por este lexer, depois pelo parser e por fim por um interpretador de
 * arvore. Isso mantem a biblioteca compativel com Content Security Policy
 * restritiva, sem `unsafe-eval`.
 */

export type TokenType = 'num' | 'str' | 'tpl' | 'ident' | 'punct' | 'eof';

export interface TemplatePart {
  /** Trechos literais entre as interpolacoes. Sempre tem 1 item a mais que `exprs`. */
  quasis: string[];
  /** Codigo fonte de cada `${...}`. */
  exprs: string[];
}

export interface Token {
  type: TokenType;
  value: string;
  /** Valor ja convertido para numero ou string, quando aplicavel. */
  parsed?: number | string;
  tpl?: TemplatePart;
  start: number;
  end: number;
}

/** Erro de sintaxe com posicao dentro da expressao original. */
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

/** Operadores com mais de um caractere, do mais longo para o mais curto. */
const PUNCTUATORS = [
  '>>>=',
  '===',
  '!==',
  '**=',
  '...',
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
  '+',
  '-',
  '*',
  '/',
  '%',
  '!',
  '<',
  '>',
  '=',
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

// Aceita letras acentuadas em nomes de variaveis, util para codigo em portugues.
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
 * Converte uma expressao em uma lista de tokens.
 *
 * @throws {VoodooSyntaxError} quando encontra um caractere invalido.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    // Espacos em branco e quebras de linha.
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
      i++;
      continue;
    }

    // Comentarios de linha e de bloco.
    if (ch === '/' && source[i + 1] === '/') {
      while (i < len && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) throw new VoodooSyntaxError('Comentario de bloco nao fechado', source, i);
      i = end + 2;
      continue;
    }

    const start = i;

    // Numeros: decimal, hexadecimal, binario, notacao cientifica e separador _.
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
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError('Numero invalido', source, start);
      tokens.push({ type: 'num', value: raw, parsed, start, end: i });
      continue;
    }

    // Strings com aspas simples ou duplas.
    if (ch === '"' || ch === "'") {
      i++;
      let out = '';
      while (i < len && source[i] !== ch) {
        if (source[i] === '\\') {
          i++;
          const esc = source[i];
          if (esc === 'u') {
            if (source[i + 1] === '{') {
              const close = source.indexOf('}', i);
              out += String.fromCodePoint(parseInt(source.slice(i + 2, close), 16));
              i = close + 1;
            } else {
              out += String.fromCharCode(parseInt(source.slice(i + 1, i + 5), 16));
              i += 5;
            }
          } else if (esc === 'x') {
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
      if (i >= len) throw new VoodooSyntaxError('String nao fechada', source, start);
      i++; // aspas de fechamento
      tokens.push({ type: 'str', value: out, parsed: out, start, end: i });
      continue;
    }

    // Template literals com interpolacao.
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
              // Copia a string interna inteira para nao contar chaves dentro dela.
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
            throw new VoodooSyntaxError('Interpolacao de template nao fechada', source, start);
          i++; // fecha a chave
          exprs.push(expr);
          continue;
        }
        current += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError('Template literal nao fechado', source, start);
      i++; // crase final
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

    // Identificadores e palavras reservadas.
    if (isIdentStart(ch)) {
      let name = '';
      while (i < len && isIdentPart(source[i])) name += source[i++];
      tokens.push({ type: 'ident', value: name, start, end: i });
      continue;
    }

    // Operadores e pontuacao.
    let matched: string | undefined;
    for (const p of PUNCTUATORS) {
      if (source.startsWith(p, i)) {
        // `?.` seguido de digito e o operador ternario com numero, nao encadeamento opcional.
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

    throw new VoodooSyntaxError(`Caractere inesperado "${ch}"`, source, i);
  }

  tokens.push({ type: 'eof', value: '', start: len, end: len });
  return tokens;
}
