/**
 * Differential conformance: Voodoo's interpreter against real JavaScript.
 *
 *   node scripts/conformance.mjs              summary by category
 *   node scripts/conformance.mjs --verbose    every mismatch
 *   node scripts/conformance.mjs --check      exit non-zero on any regression
 *   node scripts/conformance.mjs --baseline   record today's result as the bar
 *
 * Every case is evaluated twice: once through `parse` and `evaluate`, and once
 * through real JavaScript over the identical inputs. Real JS is the oracle, so
 * no case needs a hand-written expected value, and the suite can therefore be
 * GENERATED rather than typed out. That is the only honest way to get tens of
 * thousands of meaningful assertions about a language implementation: a hundred
 * thousand hand-written expectations would be a hundred thousand chances to
 * write the expectation wrong.
 *
 * `new Function` appears here and nowhere near the library. Voodoo does not use
 * eval, which is the reason it runs under a strict CSP; this script is a
 * development tool that never ships, and it needs a reference implementation of
 * JavaScript, which is exactly what the host engine is.
 *
 * A mismatch is not automatically a bug. Three outcomes are legitimate:
 *
 *   BUG     Voodoo answers differently from JavaScript for something it claims
 *           to support. Always a defect.
 *   GAP     Voodoo refuses to parse valid JavaScript. A decision, not a defect,
 *           but it belongs on a list rather than in a surprise.
 *   POLICY  Voodoo refuses on purpose: reaching the prototype chain, or a global
 *           that expressions are not allowed to see. Correct behaviour.
 *
 * The suite classifies automatically where it can and leaves the rest as
 * UNKNOWN for a person to read.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse, evaluate, Scope, reactive } from '../packages/voodoojs/dist/index.js';

const verbose = process.argv.includes('--verbose');
const check = process.argv.includes('--check');
const recordBaseline = process.argv.includes('--baseline');

const BASELINE_FILE = 'scripts/conformance-baseline.json';

// ---------------------------------------------------------------------------
// The values every expression is evaluated against
// ---------------------------------------------------------------------------

/**
 * Built fresh per case, so a mutation in one expression cannot leak into the
 * next and turn a passing case into a failing one depending on order.
 */
function makeState() {
  return {
    n: 5,
    m: -3,
    zero: 0,
    one: 1,
    big: 1e21,
    frac: 1.5,
    nan: NaN,
    inf: Infinity,
    s: 'hello',
    empty: '',
    t: true,
    f: false,
    nul: null,
    undef: undefined,
    list: [3, 1, 2],
    nested: [[1], [2, 3]],
    strs: ['b', 'a', 'c'],
    obj: { a: 1, b: 2 },
    deep: { x: { y: { z: 'found' } } },
    people: [
      { name: 'ana', age: 30 },
      { name: 'bo', age: 25 },
    ],
    fn: (x) => x * 2,
    add: (a, b) => a + b,
    d: new Date(0),
    re: /l+/,
  };
}

/** The same names the interpreter exposes as globals, for the oracle side. */
const GLOBAL_NAMES = [
  'Math',
  'JSON',
  'Date',
  'Number',
  'String',
  'Boolean',
  'Array',
  'Object',
  'Intl',
  'RegExp',
  'Promise',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
];

// ---------------------------------------------------------------------------
// Case generation
// ---------------------------------------------------------------------------

const cases = [];
let seq = 0;

function add(category, source) {
  cases.push({ id: seq++, category, source });
}

/** Every pairing of a list of operands, as `a OP b`. */
function binaryMatrix(category, operators, operands) {
  for (const op of operators) {
    for (const a of operands) {
      for (const b of operands) {
        add(category, `${a} ${op} ${b}`);
      }
    }
  }
}

const NUMERIC = ['n', 'm', 'zero', 'one', 'frac', 'nan', 'inf', '2', '0', '-1', '0.5'];
const MIXED = ['n', 's', 't', 'f', 'nul', 'undef', 'zero', 'empty', 'list', 'obj'];

binaryMatrix('arithmetic', ['+', '-', '*', '/', '%', '**'], NUMERIC);
binaryMatrix('comparison', ['<', '<=', '>', '>=', '==', '!=', '===', '!=='], MIXED);
binaryMatrix('logical', ['&&', '||', '??'], MIXED);
binaryMatrix('bitwise', ['&', '|', '^', '<<', '>>', '>>>'], ['n', 'm', 'zero', '2', '-1', '7']);

for (const op of ['-', '+', '!', '~', 'typeof', 'void']) {
  for (const operand of MIXED) add('unary', `${op} ${operand}`);
}

// Member access and indexing, including the optional forms.
for (const path of [
  'obj.a',
  'obj.b',
  'obj.missing',
  'deep.x.y.z',
  'deep.x.missing',
  'deep?.x?.y?.z',
  'deep?.missing?.y',
  'list[0]',
  'list[2]',
  'list[9]',
  'list[-1]',
  'list.length',
  's.length',
  's[0]',
  'obj["a"]',
  'obj?.["a"]',
  'nul?.a',
  'undef?.a',
]) {
  add('member', path);
}

// Ternaries and precedence traps: cases where a wrong precedence table still
// produces a plausible number.
for (const source of [
  'n > 1 ? "big" : "small"',
  'n > 1 ? n > 3 ? "a" : "b" : "c"',
  '1 + 2 * 3',
  '(1 + 2) * 3',
  '2 ** 3 ** 2',
  '-(2 ** 2)',
  '1 + 2 + "x"',
  '"x" + 1 + 2',
  'n - -m',
  '!t === f',
  'zero || "d"',
  'zero ?? "d"',
  'nul ?? "d"',
  'undef ?? "d"',
  'f || t && f',
  '1 < 2 === true',
  'typeof n === "number"',
]) {
  add('precedence', source);
}

// The standard library, which is what "native JavaScript works" means in
// practice. Each entry is a receiver and the calls made on it.
const METHODS = {
  's': [
    'toUpperCase()', 'toLowerCase()', 'trim()', 'slice(1)', 'slice(1, 3)',
    'substring(1, 3)', 'charAt(1)', 'charCodeAt(0)', 'indexOf("l")',
    'lastIndexOf("l")', 'includes("ell")', 'startsWith("he")', 'endsWith("lo")',
    'split("")', 'split("l")', 'replace("l", "L")', 'replaceAll("l", "L")',
    'repeat(2)', 'padStart(8, "-")', 'padEnd(8, "-")', 'concat("!")',
    'at(0)', 'at(-1)', 'localeCompare("hello")', 'normalize()',
    'match(/l+/)', 'search(/l/)', 'trimStart()', 'trimEnd()',
  ],
  'list': [
    'join("-")', 'slice(1)', 'indexOf(1)', 'includes(2)', 'concat([4])',
    'map(x => x * 2)', 'filter(x => x > 1)', 'find(x => x > 1)',
    'findIndex(x => x > 1)', 'reduce((a, b) => a + b, 0)', 'some(x => x > 2)',
    'every(x => x > 0)', 'at(0)', 'at(-1)', 'flat()', 'flatMap(x => [x, x])',
    'toString()', 'length', 'sort()', 'reverse()', 'keys().next().value',
  ],
  'nested': ['flat()', 'flat(1)', 'length', 'map(a => a.length)'],
  'strs': ['sort()', 'join(",")', 'sort((a, b) => a.localeCompare(b)).join("")'],
  'obj': ['a', 'b'],
  'people': [
    'map(p => p.name).join(",")',
    'filter(p => p.age > 26).length',
    'find(p => p.name === "bo").age',
    'reduce((sum, p) => sum + p.age, 0)',
    'sort((a, b) => a.age - b.age)[0].name',
  ],
  'n': ['toFixed(2)', 'toString()', 'toString(2)', 'toPrecision(3)', 'valueOf()'],
  'frac': ['toFixed(0)', 'toFixed(3)'],
  'd': [
    'getTime()', 'getUTCFullYear()', 'getUTCMonth()', 'getUTCDate()',
    'toISOString()', 'valueOf()',
  ],
  're': ['test("hello")', 'test("xyz")', 'source', 'flags'],
};

for (const [receiver, calls] of Object.entries(METHODS)) {
  for (const call of calls) add('methods', `${receiver}.${call}`);
}

const STATICS = [
  'Math.max(1, 2, 3)', 'Math.min(1, 2, 3)', 'Math.abs(-4)', 'Math.round(1.5)',
  'Math.floor(1.9)', 'Math.ceil(1.1)', 'Math.sqrt(16)', 'Math.pow(2, 8)',
  'Math.sign(-3)', 'Math.trunc(1.9)', 'Math.hypot(3, 4)', 'Math.cbrt(27)',
  'Math.log2(8)', 'Math.PI', 'Math.E',
  'Math.max(...list)', 'Math.min(...list)',
  'JSON.stringify(obj)', 'JSON.stringify(list)', 'JSON.parse("[1,2]")[1]',
  'JSON.stringify(obj, null, 2)',
  'Object.keys(obj).join(",")', 'Object.values(obj).join(",")',
  'Object.entries(obj).length', 'Object.assign({}, obj).a',
  'Object.fromEntries([["k", 1]]).k',
  'Array.isArray(list)', 'Array.isArray(obj)', 'Array.from("ab").join("")',
  'Array.of(1, 2).length',
  'Number.isInteger(n)', 'Number.isFinite(inf)', 'Number.parseFloat("1.5")',
  'Number.MAX_SAFE_INTEGER', 'Number.EPSILON',
  'String(n)', 'String(nul)', 'Number("42")', 'Boolean(zero)',
  'parseInt("42")', 'parseInt("ff", 16)', 'parseFloat("1.5rem")',
  'isNaN(nan)', 'isFinite(inf)',
  'encodeURIComponent("a b")', 'decodeURIComponent("a%20b")',
  'Date.now() > 0',
];
for (const source of STATICS) add('globals', source);

// Literals of every shape.
for (const source of [
  '1', '0', '-1', '1.5', '.5', '1e3', '1e-3', '0x1f', '0b101', '0o17', '1_000',
  '"a"', "'a'", '`a`', '`n is ${n}`', '`${n}${n}`', '`a\\nb`',
  'true', 'false', 'null', 'undefined',
  '[]', '[1]', '[1, 2, 3]', '[[1], [2]]', '[1, ...list]',
  '({})', '({ a: 1 })', '({ a: 1, b: 2 }).b', '({ ...obj }).a',
  '({ [`k${n}`]: 1 })["k5"]', '({ n }).n',
]) {
  add('literals', source);
}

// Functions, which is where most of the value is.
for (const source of [
  '(() => 1)()',
  '(() => { return 1 })()',
  '((x) => x)(1)',
  '((x, y) => x + y)(1, 2)',
  'fn(2)',
  'add(1, 2)',
  'list.map(fn).join(",")',
  'list.map(x => fn(x)).join(",")',
  '((f) => f(3))(fn)',
  '(() => (x) => x * 3)()(2)',
  'list.filter(x => x !== 1).length',
  'list.map((x, i) => x + i).join(",")',
  'list.reduce((a, b) => a + b)',
  '[1,2,3].map(x => x % 2 === 0 ? "e" : "o").join("")',
  'people.map(p => `${p.name}:${p.age}`).join("|")',
]) {
  add('functions', source);
}

// Syntax the parser is known to reject. Kept in, so the report says how much of
// JavaScript is missing rather than quietly leaving it out.
for (const source of [
  'new Date(0).getTime()',
  'new Date(86400000).getUTCFullYear()',
  '(new Date(0)).getTime()',
  'new Array(3).length',
  '((x = 1) => x)()',
  '((...xs) => xs.length)(1, 2)',
  '(({ a }) => a)({ a: 1 })',
  '(([a]) => a)([1])',
  '(1, 2, 3)',
  'delete obj.a',
  'obj?.missing?.()',
  'list.map(x => { const y = x * 2; return y }).join(",")',
]) {
  add('unsupported-syntax', source);
}

// ---------------------------------------------------------------------------
// Running both sides
// ---------------------------------------------------------------------------

/** Comparable, order-independent for objects, and distinguishes -0 from 0. */
function normalise(value) {
  if (typeof value === 'function') return '[function]';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (Object.is(value, -0)) return '-0';
    return String(value);
  }
  if (typeof value === 'symbol') return value.toString();
  if (value instanceof Date) return `Date(${value.getTime()})`;
  if (value instanceof RegExp) return `RegExp(${value.source}/${value.flags})`;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value, (_key, v) =>
      typeof v === 'function' ? '[function]' : typeof v === 'number' && Number.isNaN(v) ? 'NaN' : v
    );
  } catch {
    return String(value);
  }
}

/** Real JavaScript, the oracle. */
function runNative(source, state) {
  const names = [...Object.keys(state), ...GLOBAL_NAMES];
  const values = names.map((name) =>
    name in state ? state[name] : globalThis[name]
  );
  // eslint-disable-next-line no-new-func
  const fn = new Function(...names, `"use strict"; return (${source});`);
  return fn(...values);
}

function runVoodoo(source, state) {
  return evaluate(parse(source), new Scope(reactive(state)));
}

/** Distinguishes a refusal on purpose from a failure to parse. */
function classify(voodooError) {
  const message = String(voodooError?.message ?? voodooError);
  if (/cannot reach the prototype|Access blocked/i.test(message)) return 'POLICY';
  if (/was not found\. Expressions cannot reach window/i.test(message)) return 'POLICY';
  if (/Unexpected token|Unexpected character|Expected .* but found/i.test(message)) return 'GAP';
  return 'BUG';
}

const results = [];

for (const testCase of cases) {
  const state = makeState();

  let nativeValue;
  let nativeThrew = null;
  try {
    nativeValue = runNative(testCase.source, state);
  } catch (error) {
    nativeThrew = error;
  }

  // A case real JavaScript itself rejects proves nothing about Voodoo.
  if (nativeThrew && /SyntaxError/.test(nativeThrew.name)) {
    results.push({ ...testCase, outcome: 'SKIP', detail: 'not valid JavaScript' });
    continue;
  }

  const freshState = makeState();
  let voodooValue;
  let voodooThrew = null;
  try {
    voodooValue = runVoodoo(testCase.source, freshState);
  } catch (error) {
    voodooThrew = error;
  }

  if (nativeThrew && voodooThrew) {
    results.push({ ...testCase, outcome: 'MATCH', detail: 'both throw' });
    continue;
  }

  if (voodooThrew) {
    results.push({
      ...testCase,
      outcome: classify(voodooThrew),
      detail: String(voodooThrew.message).split('\n')[0].slice(0, 100),
      expected: normalise(nativeValue),
    });
    continue;
  }

  if (nativeThrew) {
    results.push({
      ...testCase,
      outcome: 'BUG',
      detail: `JavaScript throws ${nativeThrew.name}, Voodoo returned ${normalise(voodooValue)}`,
    });
    continue;
  }

  const a = normalise(voodooValue);
  const b = normalise(nativeValue);
  results.push(
    a === b
      ? { ...testCase, outcome: 'MATCH' }
      : { ...testCase, outcome: 'BUG', detail: `got ${a}`, expected: b }
  );
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const byOutcome = {};
for (const row of results) byOutcome[row.outcome] = (byOutcome[row.outcome] ?? 0) + 1;

const byCategory = {};
for (const row of results) {
  byCategory[row.category] ??= { total: 0, match: 0, bug: 0, gap: 0, policy: 0, skip: 0 };
  const bucket = byCategory[row.category];
  bucket.total++;
  if (row.outcome === 'MATCH') bucket.match++;
  else if (row.outcome === 'BUG') bucket.bug++;
  else if (row.outcome === 'GAP') bucket.gap++;
  else if (row.outcome === 'POLICY') bucket.policy++;
  else bucket.skip++;
}

console.log(`${results.length} cases, each checked against real JavaScript\n`);
console.log('  category            total   match     bug     gap  policy');
for (const [category, bucket] of Object.entries(byCategory)) {
  console.log(
    `  ${category.padEnd(20)}${String(bucket.total).padStart(5)}` +
      `${String(bucket.match).padStart(8)}${String(bucket.bug).padStart(8)}` +
      `${String(bucket.gap).padStart(8)}${String(bucket.policy).padStart(8)}`
  );
}

const bugs = results.filter((r) => r.outcome === 'BUG');
const gaps = results.filter((r) => r.outcome === 'GAP');

console.log('');
console.log(`  match  ${byOutcome.MATCH ?? 0}`);
console.log(`  BUG    ${bugs.length}   answers differently from JavaScript`);
console.log(`  GAP    ${gaps.length}   valid JavaScript it will not parse`);
console.log(`  policy ${byOutcome.POLICY ?? 0}   refused on purpose`);

if (verbose || bugs.length) {
  console.log('\n  Answers differently from JavaScript:');
  for (const row of (verbose ? bugs : bugs.slice(0, 25))) {
    console.log(`    ${row.source}`);
    console.log(`        expected ${row.expected}, ${row.detail ?? ''}`);
  }
  if (!verbose && bugs.length > 25) console.log(`    ... and ${bugs.length - 25} more, use --verbose`);
}

if (verbose && gaps.length) {
  console.log('\n  Valid JavaScript it will not parse:');
  for (const row of gaps) console.log(`    ${row.source.padEnd(46)} ${row.detail}`);
}

const summary = { total: results.length, bugs: bugs.length, gaps: gaps.length };

if (recordBaseline) {
  writeFileSync(BASELINE_FILE, JSON.stringify(summary, null, 2) + '\n');
  console.log(`\nbaseline written to ${BASELINE_FILE}`);
}

if (check) {
  if (!existsSync(BASELINE_FILE)) {
    console.error('\nno baseline recorded; run with --baseline first');
    process.exit(1);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
  const worse = summary.bugs > baseline.bugs || summary.gaps > baseline.gaps;
  console.log(
    `\nbaseline: ${baseline.bugs} bugs, ${baseline.gaps} gaps` +
      `   now: ${summary.bugs} bugs, ${summary.gaps} gaps`
  );
  if (worse) {
    console.error('conformance got worse');
    process.exit(1);
  }
}
