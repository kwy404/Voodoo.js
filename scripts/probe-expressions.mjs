/**
 * Reports which JavaScript an expression can actually contain.
 *
 *   node scripts/probe-expressions.mjs
 *
 * Voodoo interprets expressions with its own lexer, parser and interpreter
 * rather than `eval`, which is what lets it run under a strict Content Security
 * Policy. The cost is that the supported language is whatever those three files
 * implement, and nothing in the repository says what that is. This probe finds
 * out by running expressions and recording what happens.
 *
 * Every case below is written the way someone would naturally write it in an
 * attribute. A failure here is not automatically a bug: some of it is
 * deliberately out of scope. But it should be a decision on a list, not a
 * surprise in someone's page.
 */

import { parse, evaluate, Scope, reactive } from '../packages/voodoojs/dist/index.js';

const CASES = [
  // ---- values and operators -------------------------------------------
  ['literal', '1 + 2', 3],
  ['string concat', '"a" + "b"', 'ab'],
  ['template literal', '`n is ${n}`', 'n is 5'],
  ['ternary', 'n > 1 ? "big" : "small"', 'big'],
  ['logical or', 'missing || "fallback"', 'fallback'],
  ['nullish', 'zero ?? "fallback"', 0],
  ['optional chaining', 'deep?.missing?.x', undefined],
  ['exponent', '2 ** 10', 1024],
  ['modulo', '7 % 3', 1],
  ['bitwise and', '6 & 3', 2],
  ['shift', '1 << 4', 16],
  ['comma sequence', '(1, 2, 3)', 3],
  ['typeof', 'typeof n', 'number'],
  ['in operator', '"n" in obj', false],
  ['instanceof', 'list instanceof Array', true],
  ['void', 'void 0', undefined],

  // ---- arrays and objects ---------------------------------------------
  ['array literal', '[1, 2, 3].length', 3],
  ['object literal', '({ a: 1 }).a', 1],
  ['computed key', '({ ["k" + 1]: 9 })["k1"]', 9],
  ['shorthand property', '({ n }).n', 5],
  ['array spread', '[...list, 4].length', 4],
  ['object spread', '({ ...obj, b: 2 }).a', 1],
  ['nested access', 'deep.a.b.c', 'found'],
  ['index access', 'list[1]', 2],

  // ---- functions -------------------------------------------------------
  ['arrow, expression body', '(() => 42)()', 42],
  ['arrow, block body', '(() => { return 7 })()', 7],
  ['arrow with param', '((x) => x * 2)(21)', 42],
  ['arrow, implicit param', 'list.map(x => x * 2)[2]', 6],
  ['arrow, two params', 'list.reduce((a, b) => a + b, 0)', 6],
  ['function keyword', '(function () { return 1 })()', 1],
  ['default parameter', '((x = 5) => x)()', 5],
  ['rest parameter', '((...xs) => xs.length)(1, 2, 3)', 3],
  ['destructured param', '(({ a }) => a)({ a: 1 })', 1],
  ['closure over scope', 'list.filter(x => x > n).length', 0],
  ['async arrow', '(async () => 1)() instanceof Promise', true],

  // ---- native methods ---------------------------------------------------
  ['Array.map', 'list.map(x => x + 1).join(",")', '2,3,4'],
  ['Array.filter', 'list.filter(x => x > 1).length', 2],
  ['Array.find', 'list.find(x => x === 2)', 2],
  ['Array.includes', 'list.includes(3)', true],
  ['Array.sort', '[3,1,2].sort((a,b) => a-b).join("")', '123'],
  ['Array.at', 'list.at(-1)', 3],
  ['Array.flat', '[[1],[2]].flat().length', 2],
  ['Object.keys', 'Object.keys(obj).length', 1],
  ['Object.entries', 'Object.entries(obj)[0][0]', 'a'],
  ['String.padStart', '"5".padStart(3, "0")', '005'],
  ['String.replaceAll', '"a-b-c".replaceAll("-", "+")', 'a+b+c'],
  ['Number.toFixed', '(1.005).toFixed(2)', '1.00'],
  ['Math.max spread', 'Math.max(...list)', 3],
  ['JSON round trip', 'JSON.parse(JSON.stringify(obj)).a', 1],
  ['Date', 'new Date(0).getUTCFullYear()', 1970],
  ['Intl available', 'typeof Intl', 'object'],
  ['Promise available', 'typeof Promise', 'function'],

  // ---- globals that should NOT be reachable ----------------------------
  ['window blocked', 'typeof window', 'undefined'],
  ['fetch blocked', 'typeof fetch', 'undefined'],
  ['eval blocked', 'typeof eval', 'undefined'],
  ['Function blocked', 'typeof Function', 'undefined'],
  ['globalThis blocked', 'typeof globalThis', 'undefined'],
  ['constructor blocked', '({}).constructor', undefined],

  // ---- statements people try in handlers -------------------------------
  ['assignment', '(n = 9, n)', 9],
  ['compound assign', '(n += 1, n)', 6],
  ['increment', '(n++, n)', 6],
  ['new operator', 'new Date(0).getTime()', 0],
  ['chained calls', 'list.map(x => x).filter(x => x > 2).length', 1],
  ['immediately nested arrow', '((f) => f(2))(x => x * 3)', 6],
];

/** A fresh scope for every case, so one mutation cannot leak into the next. */
function makeScope() {
  return new Scope(
    reactive({
      n: 5,
      zero: 0,
      list: [1, 2, 3],
      obj: { a: 1 },
      deep: { a: { b: { c: 'found' } } },
    })
  );
}

const rows = [];

for (const [name, source, expected] of CASES) {
  let status;
  let detail = '';
  try {
    const ast = parse(source);
    const got = evaluate(ast, makeScope());
    if (got === expected || (Number.isNaN(got) && Number.isNaN(expected))) {
      status = 'ok';
    } else {
      status = 'WRONG';
      detail = `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`;
    }
  } catch (error) {
    status = 'THROWS';
    detail = String(error.message).split('\n')[0].slice(0, 80);
  }
  rows.push({ name, source, status, detail });
}

const broken = rows.filter((r) => r.status !== 'ok');

for (const row of rows) {
  const mark = row.status === 'ok' ? '  ok    ' : `  ${row.status.padEnd(6)}`;
  console.log(`${mark}${row.name.padEnd(26)} ${row.source}`);
  if (row.detail) console.log(`${' '.repeat(10)}${row.detail}`);
}

console.log('');
console.log(`${rows.length - broken.length} of ${rows.length} supported, ${broken.length} not`);
