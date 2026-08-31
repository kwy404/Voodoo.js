/**
 * Fuzz / property-based testing do parser.
 *
 * O parser e uma fronteira de seguranca: a Voodoo nao usa `eval` nem
 * `new Function`, entao todo texto de atributo passa por lexer -> parser ->
 * interpretador. Um teste de exemplo cobre o que alguem lembrou de escrever;
 * este arquivo cobre o que ninguem lembrou.
 *
 * A ideia nao e comparar valores, e verificar PROPRIEDADES que precisam valer
 * para qualquer entrada:
 *
 *   1. `parse()` sempre termina (nada de laco infinito).
 *   2. Aninhamento profundo termina com erro previsivel, nunca com `RangeError`
 *      cru de estouro de pilha.
 *   3. Entrada invalida sempre lanca `VoodooSyntaxError`, nunca `TypeError`
 *      ou outro erro generico do JavaScript.
 *   4. O cache e idempotente, inclusive no estouro de `MAX_CACHE`.
 *   5. Round-trip: expressao valida do subconjunto seguro avalia sem lancar.
 *
 * Tudo e deterministico. A semente e fixa, o gerador e um mulberry32 e nao ha
 * `Math.random` em lugar nenhum: uma falha se reproduz sempre igual.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse, clearParseCache } from '../src/parser/parser';
import { tokenize, VoodooSyntaxError } from '../src/parser/lexer';
import { evaluate } from '../src/parser/interpreter';
import { Scope } from '../src/runtime/scope';
import { reactive } from '../src/reactivity';
import {
  Aleatorio,
  casosGigantes,
  casosLimite,
  dadosControlados,
  geraExpressaoSegura,
  geraExpressaoValida,
  geraPrograma,
  muta,
} from './helpers/gerador-expressoes';

/** Semente fixa. Mudar este numero muda todo o corpus. */
const SEMENTE = 0xc0ffee;

/** Teto por expressao. Uma expressao curta que passe disso e um defeito. */
const LIMITE_MS = 1000;

/** Teto para as entradas gigantes, que legitimamente custam mais. */
const LIMITE_MS_GIGANTE = 4000;

interface Violacao {
  fonte: string;
  motivo: string;
}

function resumo(fonte: string): string {
  const curta = fonte.length > 80 ? `${fonte.slice(0, 80)}… (${fonte.length} chars)` : fonte;
  return JSON.stringify(curta);
}

/**
 * Analisa uma expressao e devolve a violacao de contrato, se houver.
 *
 * Contrato: ou `parse` devolve uma AST, ou lanca `VoodooSyntaxError`. Qualquer
 * outro erro (`TypeError`, `RangeError`, string solta) e bug. Estourar o tempo
 * tambem e bug.
 */
function verificaContrato(fonte: string, limiteMs = LIMITE_MS): Violacao | null {
  const inicio = Date.now();
  let no: unknown;
  let erro: unknown;
  try {
    no = parse(fonte);
  } catch (err) {
    erro = err;
  }
  const gasto = Date.now() - inicio;

  if (gasto > limiteMs) {
    return { fonte, motivo: `demorou ${gasto}ms (limite ${limiteMs}ms)` };
  }
  if (erro !== undefined) {
    if (!(erro instanceof VoodooSyntaxError)) {
      const nome = erro instanceof Error ? `${erro.name}: ${erro.message.split('\n')[0]}` : typeof erro;
      return { fonte, motivo: `lancou ${nome} em vez de VoodooSyntaxError` };
    }
    if (!erro.message || erro.message.length === 0) {
      return { fonte, motivo: 'VoodooSyntaxError sem mensagem' };
    }
    return null;
  }
  if (typeof no !== 'object' || no === null || typeof (no as { t?: unknown }).t !== 'string') {
    return { fonte, motivo: `devolveu AST invalida: ${String(no)}` };
  }
  return null;
}

function relata(violacoes: Violacao[]): void {
  if (violacoes.length === 0) return;
  const lista = violacoes
    .slice(0, 10)
    .map((v) => ` - ${resumo(v.fonte)} => ${v.motivo}`)
    .join('\n');
  throw new Error(`${violacoes.length} entrada(s) quebraram o contrato do parser:\n${lista}`);
}

beforeEach(() => {
  clearParseCache();
});

// ---------------------------------------------------------------------------
// 1 e 3: termina sempre, e erro sempre e VoodooSyntaxError
// ---------------------------------------------------------------------------

describe('fuzz: o parser termina e erra de forma previsivel', () => {
  it('2000 expressoes geradas pela gramatica', () => {
    const r = new Aleatorio(SEMENTE);
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 2000; i++) {
      const fonte = geraExpressaoValida(r, 1 + r.inteiro(5));
      const v = verificaContrato(fonte);
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('500 programas com varias expressoes separadas por ;', () => {
    const r = new Aleatorio(SEMENTE ^ 0x5eed);
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 500; i++) {
      const v = verificaContrato(geraPrograma(r, 1 + r.inteiro(4)));
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('3000 mutacoes destrutivas de expressoes validas', () => {
    const r = new Aleatorio(SEMENTE ^ 0xbadc0de);
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 3000; i++) {
      let fonte = geraExpressaoValida(r, 1 + r.inteiro(4));
      const rodadas = 1 + r.inteiro(3);
      for (let m = 0; m < rodadas; m++) fonte = muta(r, fonte);
      const v = verificaContrato(fonte);
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('1000 sequencias aleatorias de caracteres de pontuacao', () => {
    const r = new Aleatorio(SEMENTE ^ 0x1234);
    const alfabeto = `()[]{}<>+-*/%!?:;.,'"\`\\|&^~=$_ \n\t0123456789abz😀áΩ`;
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 1000; i++) {
      const n = 1 + r.inteiro(40);
      let fonte = '';
      for (let c = 0; c < n; c++) fonte += alfabeto[r.inteiro(alfabeto.length)];
      const v = verificaContrato(fonte);
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('casos limite escritos a mao', () => {
    const violacoes: Violacao[] = [];
    for (const fonte of casosLimite()) {
      const v = verificaContrato(fonte);
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('entradas gigantes terminam dentro do orcamento', () => {
    const violacoes: Violacao[] = [];
    for (const fonte of casosGigantes()) {
      const v = verificaContrato(fonte, LIMITE_MS_GIGANTE);
      if (v) violacoes.push(v);
    }
    relata(violacoes);
  });

  it('o lexer sozinho obedece ao mesmo contrato', () => {
    const r = new Aleatorio(SEMENTE ^ 0xfeed);
    const violacoes: Violacao[] = [];
    const corpus = [...casosLimite()];
    for (let i = 0; i < 500; i++) corpus.push(muta(r, geraExpressaoValida(r, 3)));
    for (const fonte of corpus) {
      try {
        tokenize(fonte);
      } catch (err) {
        if (!(err instanceof VoodooSyntaxError)) {
          violacoes.push({
            fonte,
            motivo: `tokenize lancou ${err instanceof Error ? err.name : typeof err}`,
          });
        }
      }
    }
    relata(violacoes);
  });
});

// ---------------------------------------------------------------------------
// 2: aninhamento profundo (regressoes encontradas pelo fuzz)
// ---------------------------------------------------------------------------

describe('fuzz: aninhamento profundo nao estoura a pilha', () => {
  // BUG ENCONTRADO PELO FUZZ: `((((...))))` com alguns milhares de niveis
  // vazava `RangeError: Maximum call stack size exceeded`, um erro cru do
  // motor, no lugar de um erro de sintaxe da Voodoo. Corrigido com o limite
  // MAX_DEPTH em src/parser/parser.ts.
  const profundos: Array<[string, string]> = [
    ['parenteses', `${'('.repeat(5000)}1${')'.repeat(5000)}`],
    ['arrays', `${'['.repeat(5000)}${']'.repeat(5000)}`],
    ['objetos', `${'{a:'.repeat(5000)}1${'}'.repeat(5000)}`],
    ['unarios', `${'!'.repeat(20000)}1`],
    ['ternarios', `${'a?1:'.repeat(20000)}2`],
    ['arrows', `${'x=>'.repeat(20000)}1`],
    ['exponenciacao', `${'2**'.repeat(20000)}2`],
    ['chamadas', `f${'('.repeat(5000)}1${')'.repeat(5000)}`],
    ['templates', `${'`${'.repeat(5000)}1${'}`'.repeat(5000)}`],
    ['spreads', `[${'...['.repeat(5000)}1${']'.repeat(5000)}]`],
  ];

  for (const [nome, fonte] of profundos) {
    it(`${nome} aninhados milhares de vezes viram VoodooSyntaxError`, () => {
      let erro: unknown;
      try {
        parse(fonte);
      } catch (err) {
        erro = err;
      }
      expect(erro).toBeInstanceOf(VoodooSyntaxError);
      expect(String((erro as Error).message)).toMatch(/aninhad/i);
    });
  }

  it('300 niveis de parenteses continuam validos', () => {
    // O limite existe para conter absurdo, nao para apertar o uso real.
    const fonte = `${'('.repeat(300)}1${')'.repeat(300)}`;
    expect(parse(fonte)).toEqual({ t: 'lit', v: 1 });
  });

  it('template aninhado de verdade continua funcionando', () => {
    expect(() => parse('`${`${`${a}`}`}`')).not.toThrow();
  });

  it('cadeia longa mas rasa nao esbarra no limite', () => {
    const soma = Array.from({ length: 5000 }, () => '1').join(' + ');
    expect(() => parse(soma)).not.toThrow();
    expect(() => parse(`a${'.b'.repeat(5000)}`)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 3: bugs pontuais achados pelo fuzz nos escapes do lexer
// ---------------------------------------------------------------------------

describe('escapes invalidos em string sao erro de sintaxe, nao RangeError', () => {
  // BUG ENCONTRADO PELO FUZZ: `String.fromCodePoint` lanca `RangeError` cru
  // para NaN e para valores acima de 0x10FFFF, e o lexer nao validava nada.
  const casos = [
    '"\\u{ZZ}"',
    '"\\u{}"',
    '"\\u{110000}"',
    '"\\u{FFFFFFFF}"',
    '"\\u{-1}"',
    '"\\uZZZZ"',
    '"\\u41"',
    '"\\xZZ"',
    '"\\x4"',
  ];
  for (const fonte of casos) {
    it(`recusa ${fonte}`, () => {
      expect(() => parse(fonte)).toThrow(VoodooSyntaxError);
    });
  }

  // BUG ENCONTRADO PELO FUZZ: sem o `}` o `indexOf` devolvia -1 e o lexer
  // fazia `i = close + 1`, voltando o cursor para o inicio da fonte e
  // reanalisando tudo com posicoes erradas.
  it('escape unicode sem chave de fechamento nao rebobina o cursor', () => {
    let erro: VoodooSyntaxError | undefined;
    try {
      tokenize('+"\\u{41ZZZ');
    } catch (err) {
      erro = err as VoodooSyntaxError;
    }
    expect(erro).toBeInstanceOf(VoodooSyntaxError);
    expect(erro!.message).toContain('nao fechado');
    // A posicao aponta para a string, nao para o comeco da expressao.
    expect(erro!.position).toBe(1);
  });

  // O fuzz gerou `++null` (dois `+` colados) e mostrou que o parser aceita
  // incremento sobre literal: a AST sai pronta e so o interpretador reclama,
  // com VoodooRuntimeError. O JavaScript recusa isso ainda na analise, e o
  // parser ja recusa `1 = 2` com "Alvo de atribuicao invalido". Falta a mesma
  // checagem em `++`/`--`. Nao mexi agora porque muda o momento do erro
  // (analise em vez de avaliacao) e o interpretador esta sendo editado em
  // paralelo; o erro atual continua tipado, entao nao ha vazamento de erro cru.
  it.todo('++ e -- sobre literal deveriam ser recusados ainda na analise');

  it('escapes validos continuam funcionando', () => {
    expect(parse('"\\u0041"')).toEqual({ t: 'lit', v: 'A' });
    expect(parse('"\\u{1F600}"')).toEqual({ t: 'lit', v: '😀' });
    expect(parse('"\\x41"')).toEqual({ t: 'lit', v: 'A' });
    expect(parse('"\\n\\t\\\\"')).toEqual({ t: 'lit', v: '\n\t\\' });
  });
});

// ---------------------------------------------------------------------------
// 4: idempotencia do cache
// ---------------------------------------------------------------------------

describe('fuzz: o cache e idempotente', () => {
  it('parse duas vezes devolve a mesma AST para 800 expressoes', () => {
    const r = new Aleatorio(SEMENTE ^ 0xcafe);
    for (let i = 0; i < 800; i++) {
      const fonte = geraExpressaoValida(r, 1 + r.inteiro(4));
      let primeiro: unknown;
      try {
        primeiro = parse(fonte);
      } catch {
        // Entrada invalida: tem que continuar invalida na segunda chamada.
        expect(() => parse(fonte)).toThrow(VoodooSyntaxError);
        continue;
      }
      const segundo = parse(fonte);
      expect(segundo).toBe(primeiro);
      expect(segundo).toEqual(primeiro);
    }
  });

  it('o estouro de MAX_CACHE nao muda o resultado de nenhuma expressao', () => {
    const referencia = parse('a.b + c');
    const copia = JSON.parse(JSON.stringify(referencia));
    // MAX_CACHE e 2000; 2600 expressoes distintas forcam a limpeza.
    for (let i = 0; i < 2600; i++) parse(`v${i} + ${i}`);
    const depois = parse('a.b + c');
    expect(JSON.parse(JSON.stringify(depois))).toEqual(copia);
    expect(parse('v0 + 0')).toEqual(parse('v0 + 0'));
  });

  it('a AST em cache nao e compartilhada entre fontes diferentes', () => {
    expect(parse('a + b')).not.toBe(parse('a + c'));
  });

  it('erro de sintaxe nao entra no cache', () => {
    expect(() => parse('a +')).toThrow(VoodooSyntaxError);
    expect(() => parse('a +')).toThrow(VoodooSyntaxError);
  });
});

// ---------------------------------------------------------------------------
// 5: round-trip com avaliacao
// ---------------------------------------------------------------------------

describe('fuzz: round-trip parse + avaliacao', () => {
  it('1000 expressoes do subconjunto seguro avaliam sem lancar', () => {
    const r = new Aleatorio(SEMENTE ^ 0xa11ce);
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 1000; i++) {
      const fonte = geraExpressaoSegura(r, 1 + r.inteiro(4));
      const escopo = new Scope(reactive(dadosControlados()));
      try {
        const valor = evaluate(parse(fonte), escopo);
        // Avaliar de novo com o mesmo escopo tem que dar o mesmo tipo.
        const outra = evaluate(parse(fonte), new Scope(reactive(dadosControlados())));
        if (typeof valor !== typeof outra) {
          violacoes.push({ fonte, motivo: `tipo instavel: ${typeof valor} vs ${typeof outra}` });
        }
      } catch (err) {
        violacoes.push({
          fonte,
          motivo: `avaliacao lancou ${err instanceof Error ? `${err.name}: ${err.message.split('\n')[0]}` : typeof err}`,
        });
      }
    }
    relata(violacoes);
  });

  it('avaliar qualquer expressao gerada so lanca Error de verdade', () => {
    const r = new Aleatorio(SEMENTE ^ 0xf00d);
    const violacoes: Violacao[] = [];
    for (let i = 0; i < 800; i++) {
      const fonte = geraExpressaoValida(r, 1 + r.inteiro(4));
      const escopo = new Scope(reactive(dadosControlados()));
      try {
        evaluate(parse(fonte), escopo);
      } catch (err) {
        if (!(err instanceof Error)) {
          violacoes.push({ fonte, motivo: `lancou nao-Error: ${typeof err}` });
        }
      }
    }
    relata(violacoes);
  });
});
