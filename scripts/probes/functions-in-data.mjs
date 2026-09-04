/**
 * Functions declared in `v-data`: every way a page might declare one, call one,
 * and expect the DOM to notice.
 *
 *   node scripts/probes/functions-in-data.mjs
 *
 * Builds on scripts/probe-expressions.mjs, which covers the expression language
 * in general. This probe covers one lens only: methods, arrows, `function`
 * expressions and getters written INSIDE the state object, and what happens when
 * they read, write, call each other, receive parameters, return values, get
 * passed around as callbacks, mutate arrays, or throw.
 *
 * Each case is built the way the walker builds a `v-data` scope (walker.ts,
 * step 2): the literal is evaluated in the parent scope, the result is wrapped
 * in `reactive()` and becomes `scope.data`. Steps run the way `runHandler`
 * (directives/core.ts) runs an `@click`, including its "a bare function name is
 * called" path. The final read is evaluated like an interpolation, twice: once
 * directly, and once inside an `effect()` created BEFORE the steps, which is
 * exactly how a text binding observes state. A case where the direct read is
 * right but the effect's view is stale is reported as STALE: the value changed
 * on an object the DOM is not watching.
 *
 * The `expect` column says what JavaScript does, or what the documentation
 * promises when it promises something. The `kind` column, filled in from
 * reading the source, says why Voodoo differs when it does:
 *
 *   BUG     it should work, and it does not, or gives a wrong answer
 *   GAP     valid JavaScript the language simply does not implement
 *   POLICY  refused on purpose, for CSP or prototype safety, or by a documented
 *           scope rule
 *
 * A case that differs from JavaScript and carries no kind is UNCLASSIFIED, and
 * a case that carries a kind but passes has a STALE TAG. Both are surprises.
 * The process exits non-zero when any BUG, GAP, unclassified difference or
 * stale tag remains: accepting a gap means retagging it POLICY with a reason.
 */

import {
  parse,
  evaluate,
  Scope,
  reactive,
  effect,
  flushSync,
  stringify,
  toRaw,
  magic,
  magics,
} from '../../packages/voodoojs/dist/index.js';

// The magic variables are registered by `installMagics()`, which the browser
// bundle runs at boot. Outside a browser the registry is empty, so the three
// scope magics this lens touches are registered here exactly as
// runtime/magics.ts registers them.
if (!magics.has('$data')) magic('$data', (scope) => scope.data);
if (!magics.has('$parent')) magic('$parent', (scope) => scope.parent?.data ?? null);
if (!magics.has('$root')) magic('$root', (scope) => scope.root.data);

// ---------------------------------------------------------------------------
// Harness: builds scopes the way the walker does, runs steps the way handlers do
// ---------------------------------------------------------------------------

/** A `v-data` scope, optionally nested inside another one. */
function make(data, outer) {
  const root = new Scope(reactive({}));
  const parentScope = outer ? root.reactiveChild(evaluate(parse(outer), root)) : root;
  const raw = evaluate(parse(data), parentScope);
  const scope = parentScope.reactiveChild(raw && typeof raw === 'object' ? raw : {});
  return { scope, state: scope.data, parent: parentScope, parentState: parentScope.data };
}

/** Mirrors `runHandler` in directives/core.ts, including the bare-name call. */
function handler(scope, source, locals = {}) {
  const local = scope.child({
    $event: null,
    $rawEvent: null,
    $el: null,
    $detail: undefined,
    ...locals,
  });
  const node = parse(source);
  const value = evaluate(node, local);
  if (typeof value === 'function' && (node.t === 'id' || node.t === 'member')) {
    return value.call(scope.data, locals.$event ?? null);
  }
  return value;
}

/** An interpolation: evaluated in the scope itself. */
function read(scope, source) {
  return evaluate(parse(source), scope);
}

const NOT_RUN = Symbol('not run');

function same(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function show(v) {
  if (v instanceof Error) return `throws ${v.name}: ${String(v.message).split('\n')[0].slice(0, 90)}`;
  if (typeof v === 'function') return '[function]';
  if (typeof v === 'number' && Number.isNaN(v)) return 'NaN';
  if (v === undefined) return 'undefined';
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function describeExpect(exp) {
  if (typeof exp === 'function') return `(${exp.toString().replace(/\s+/g, ' ')})`;
  if (exp && typeof exp === 'object' && exp.throws) return `throws ${exp.throws}`;
  return show(exp);
}

function matches(exp, got) {
  if (exp && typeof exp === 'object' && exp.throws) {
    return got instanceof Error && exp.throws.test(got.message);
  }
  if (got instanceof Error) return false;
  if (typeof exp === 'function') return !!exp(got);
  return same(exp, got);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

/**
 * Fields:
 *   data     the `v-data` attribute, verbatim
 *   outer    an enclosing `v-data`, for scope-chain cases
 *   steps    handler expressions, run in order, as `@click` would
 *   locals   extra handler locals, as `$event` would be
 *   read     the interpolation checked after the steps
 *   text     compare `stringify(read)` instead, as a text binding would
 *   expect   a value, `{ throws: /re/ }`, or a predicate
 *   kind     BUG | GAP | POLICY, only for cases known to differ
 *   why      the mechanism, for the report
 *   custom   escape hatch: an (async) function receiving the harness
 */
const CASES = [
  // ==== A. method shorthand: sibling state by name ==========================
  { name: 'A01 counter: n++ twice', data: '{ n: 0, inc() { n++ } }', steps: ['inc()', 'inc()'], read: 'n', expect: 2 },
  { name: 'A02 compound assign', data: '{ n: 0, inc() { n += 5 } }', steps: ['inc()'], read: 'n', expect: 5 },
  { name: 'A03 plain assign', data: '{ n: 0, set() { n = 42 } }', steps: ['set()'], read: 'n', expect: 42 },
  { name: 'A04 implicit last value', data: '{ n: 3, double() { n * 2 } }', read: 'double()', expect: 6 },
  { name: 'A05 string write', data: "{ msg: '', hi() { msg = 'x' } }", steps: ['hi()'], read: 'msg', expect: 'x' },
  { name: 'A06 reads two siblings', data: '{ a: 1, b: 2, sum() { a + b } }', read: 'sum()', expect: 3 },
  { name: 'A07 several statements, value', data: '{ n: 0, go() { n = 1; n = n + 1; n * 10 } }', read: 'go()', expect: 20 },
  { name: 'A08 several statements, state', data: '{ n: 0, go() { n = 1; n = n + 1; n * 10 } }', steps: ['go()'], read: 'n', expect: 2 },
  { name: 'A09 if guard', data: '{ n: 0, inc() { if (n < 2) n++ } }', steps: ['inc()', 'inc()', 'inc()', 'inc()'], read: 'n', expect: 2 },
  { name: 'A10 if / else', data: "{ n: 0, s: '', go() { if (n > 0) s = 'pos'; else s = 'zero' } }", steps: ['go()'], read: 's', expect: 'zero' },
  { name: 'A11 if / else with blocks', data: "{ n: 5, s: '', go() { if (n > 3) { s = 'big'; n = 0 } else { s = 'small' } } }", steps: ['go()'], read: 's + n', expect: 'big0' },
  { name: 'A12 boolean result', data: '{ n: 1, ok() { n > 0 } }', read: 'ok()', expect: true },
  { name: 'A13 toggle three times', data: '{ open: false, toggle() { open = !open } }', steps: ['toggle()', 'toggle()', 'toggle()'], read: 'open', expect: true },
  { name: 'A14 template literal over state', data: "{ name: 'Ana', greet() { `hi ${name}` } }", read: 'greet()', expect: 'hi Ana' },
  { name: 'A15 string method chain', data: "{ name: ' ana ', title() { name.trim().toUpperCase() } }", read: 'title()', expect: 'ANA' },
  { name: 'A16 nested ++', data: '{ user: { age: 1 }, bump() { user.age++ } }', steps: ['bump()'], read: 'user.age', expect: 2 },
  { name: 'A17 nested write', data: "{ user: { name: 'a' }, rename() { user.name = 'b' } }", steps: ['rename()'], read: 'user.name', expect: 'b' },
  { name: 'A18 replace whole object', data: "{ user: { name: 'a' }, reset() { user = { name: 'z' } } }", steps: ['reset()'], read: 'user.name', expect: 'z' },
  { name: 'A19 newline-separated statements', data: '{ n: 0, f() {\n    n = 1\n    n = n + 1\n  } }', steps: ['f()'], read: 'n', expect: 2 },
  { name: 'A20 comment inside body', data: '{ n: 0, f() { // bump\n n++ } }', steps: ['f()'], read: 'n', expect: 1 },
  { name: 'A21 trailing semicolon', data: '{ n: 0, f() { n++; } }', steps: ['f()'], read: 'n', expect: 1 },
  { name: 'A22 -=', data: '{ n: 10, f() { n -= 3 } }', steps: ['f()'], read: 'n', expect: 7 },
  { name: 'A23 ??=', data: "{ s: null, f() { s ??= 'd' } }", steps: ['f()'], read: 's', expect: 'd' },
  { name: 'A24 **=', data: '{ n: 2, f() { n **= 3 } }', steps: ['f()'], read: 'n', expect: 8 },
  { name: 'A25 ternary result', data: '{ n: 2, f() { n > 1 ? "a" : "b" } }', read: 'f()', expect: 'a' },
  { name: 'A26 in and typeof', data: '{ o: { a: 1 }, has(k) { k in o && typeof o[k] } }', read: "has('a')", expect: 'number' },
  {
    name: 'A27 unknown name is silent',
    data: '{ f() { nothing } }',
    read: 'f()',
    expect: { throws: /nothing is not defined/ },
    kind: 'POLICY',
    why: 'interpreter.ts `id`: an unresolved identifier evaluates to undefined; there is no ReferenceError anywhere in the interpreter. A typo inside a method is invisible.',
  },

  // ==== B. `this` ============================================================
  {
    name: 'B01 this.n++ (docs promise it)',
    data: '{ n: 0, inc() { this.n++ } }',
    steps: ['inc()', 'inc()'],
    read: 'n',
    expect: 2,
    kind: 'GAP',
    why: 'lexer.ts has no keywords: `this` is an identifier, looked up in scope and allowedGlobals, found nowhere, so `this.n` is a read from undefined. docs/estado-e-stores.md:56 documents `this.items.push(text)` inside v-data.',
  },
  { name: 'B02 this.n read', data: '{ n: 3, double() { this.n * 2 } }', read: 'double()', expect: 6, kind: 'GAP', why: 'same: `this` is an unresolved identifier' },
  {
    name: 'B03 docs example verbatim',
    data: "{ items: [], add(text) { this.items.push(text) } }",
    steps: ["add('new')"],
    read: 'items.length',
    expect: 1,
    kind: 'GAP',
    why: 'docs/estado-e-stores.md:56, character for character',
  },
  { name: 'B04 typeof this', data: '{ n: 1, m() { typeof this } }', read: 'm()', expect: 'object', kind: 'GAP', why: '`typeof` of an unresolved identifier is "undefined"' },
  { name: 'B05 this at handler level', data: '{ n: 0 }', steps: ['this.n++'], read: 'n', expect: 1, kind: 'GAP', why: 'same identifier lookup, from the handler child scope' },
  { name: 'B06 this.n = value', data: '{ n: 0, m() { this.n = 5 } }', steps: ['m()'], read: 'n', expect: 5, kind: 'GAP', why: 'assign() to a member of undefined' },
  { name: 'B07 this inside arrow inside method', data: '{ n: 1, m() { [1, 2].map(x => this.n + x).join(",") } }', read: 'm()', expect: '2,3', kind: 'GAP', why: 'same' },
  {
    name: 'B08 getter with this (docs/en/state.md:78 form)',
    data: '{ items: [1], get count() { this.items.length } }',
    read: 'count',
    expect: 1,
    kind: 'GAP',
    why: 'getters run through the same `method` node; `this` is still an unresolved identifier inside the body even though the JS-level `this` IS the owner',
  },
  { name: 'B09 list.map(this.double)', data: '{ list: [1, 2], double(x) { x * 2 }, out() { list.map(this.double).join(",") } }', read: 'out()', expect: '2,4', kind: 'GAP', why: 'same' },

  // ==== C. arrow stored in state ============================================
  {
    name: 'C01 arrow cannot see sibling state',
    data: '{ n: 0, inc: () => { n++ } }',
    steps: ['inc()'],
    read: 'n',
    expect: { throws: /n is not defined/ },
    kind: 'POLICY',
    why: 'interpreter.ts `arrow`: closes over the scope where the literal was evaluated, i.e. OUTSIDE the object (the method-node comment explains this). `n` is unknown there, reads as undefined, and `n++` writes NaN into the arrow\'s own throwaway scope. JavaScript throws ReferenceError; Voodoo says nothing and the page never changes.',
  },
  {
    name: 'C02 where the lost write went',
    custom: ({ make, handler }) => {
      const { state, scope, parentState } = make('{ n: 0, inc: () => { n++ } }');
      handler(scope, 'inc()');
      return { n: state.n, parentHasN: 'n' in parentState, keys: Object.keys(toRaw(state)).join(',') };
    },
    expect: { n: 0, parentHasN: false, keys: 'n,inc' },
    why: 'documents C01: nothing lands on the state, nothing on the parent. The write is discarded with the arrow\'s local scope (Scope.set creates unknown keys in the CURRENT scope, which is the call frame).',
  },
  { name: 'C03 arrow with this.n', data: '{ n: 0, inc: () => this.n++ }', steps: ['inc()'], read: 'n', expect: { throws: /undefined/ }, why: 'JavaScript also throws here (arrow `this` is not the object); same outcome, different message' },
  { name: 'C04 arrow reads the outer scope', outer: '{ base: 10 }', data: '{ get10: () => base }', read: 'get10()', expect: 10 },
  { name: 'C05 arrow writes the outer scope', outer: '{ base: 10 }', data: '{ bump: () => { base++ } }', steps: ['bump()'], read: 'base', expect: 11 },
  { name: 'C06 arrow with a parameter', data: '{ f: x => x * 2 }', read: 'f(4)', expect: 8 },
  { name: 'C07 arrow as a callback', data: '{ list: [1, 2, 3], dbl: x => x * 2, out() { list.map(dbl).join(",") } }', read: 'out()', expect: '2,4,6' },
  { name: 'C08 arrow calling a sibling method', data: '{ n: 0, inc() { n++ }, go: () => inc() }', steps: ['go()'], read: 'n', expect: { throws: /inc is not defined/ }, kind: 'POLICY', why: 'same closure rule as C01: the arrow does not see `inc`. Voodoo throws too, but the message sends the reader to V.config.globals ("inc" was not found. Expressions cannot reach window) for a function that is two characters away in the same literal.' },

  // ==== D. `function` keyword in state ======================================
  {
    name: 'D01 function () { n++ } cannot see siblings',
    data: '{ n: 0, inc: function () { n++ } }',
    steps: ['inc()'],
    read: 'n',
    expect: { throws: /n is not defined/ },
    kind: 'POLICY',
    why: 'parser.ts parsePrimary: `function` produces the same node an arrow does ("there is no `this` to bind inside an expression"), so it closes over the outer scope like C01 and the increment is silently lost.',
  },
  {
    name: 'D02 function () { this.n++ } (valid JS)',
    data: '{ n: 0, inc: function () { this.n++ } }',
    steps: ['inc()'],
    read: 'n',
    expect: 1,
    kind: 'GAP',
    why: 'the only JavaScript spelling that makes a `function` expression reach its owner is `this`, and `this` does not exist (B01). Together with D01 there is NO way to write `inc: function () {...}` that touches sibling state; only the shorthand `inc() {...}` works.',
  },
  { name: 'D03 function with return', data: '{ f: function (x) { return x + 1 } }', read: 'f(1)', expect: 2 },
  { name: 'D04 named function expression', data: '{ f: function add(x) { return x + 1 } }', read: 'f(1)', expect: 2 },

  // ==== E. sibling method calls ==============================================
  { name: 'E01 one level', data: '{ n: 0, a() { b() }, b() { n = 9 } }', steps: ['a()'], read: 'n', expect: 9 },
  { name: 'E02 two levels', data: '{ n: 0, a() { b() }, b() { c() }, c() { n = 7 } }', steps: ['a()'], read: 'n', expect: 7 },
  { name: 'E03 sibling result used', data: '{ n: 2, sq() { n * n }, plus1() { sq() + 1 } }', read: 'plus1()', expect: 5 },
  { name: 'E04 sibling with arguments, twice', data: '{ n: 0, add(v) { n += v }, twice(v) { add(v); add(v) } }', steps: ['twice(3)'], read: 'n', expect: 6 },
  { name: 'E05 calls a method declared later', data: '{ a() { b() }, b() { 1 } }', read: 'a()', expect: 1 },
  { name: 'E06 arrow inside method calls sibling', data: '{ n: 0, bump() { n++ }, run() { [1, 2].forEach(x => bump()) } }', steps: ['run()'], read: 'n', expect: 2 },
  { name: 'E07 recursion', data: '{ fact(k) { k <= 1 ? 1 : k * fact(k - 1) } }', read: 'fact(5)', expect: 120 },
  { name: 'E08 mutual recursion', data: '{ even(k) { k === 0 ? true : odd(k - 1) }, odd(k) { k === 0 ? false : even(k - 1) } }', read: 'even(10)', expect: true },
  { name: 'E09 recursion writing state', data: '{ n: 0, count(k) { if (k > 0) { n++; count(k - 1) } } }', steps: ['count(4)'], read: 'n', expect: 4 },
  { name: 'E10 sibling result assigned to state', data: '{ n: 0, d() { 21 }, go() { n = d() * 2 } }', steps: ['go()'], read: 'n', expect: 42 },
  { name: 'E11 deep recursion (200)', data: '{ sum(k) { k === 0 ? 0 : k + sum(k - 1) } }', read: 'sum(200)', expect: 20100 },

  // ==== F. parameters =========================================================
  { name: 'F01 zero params', data: '{ f() { 1 } }', read: 'f()', expect: 1 },
  { name: 'F02 one param', data: '{ f(x) { x } }', read: 'f(7)', expect: 7 },
  { name: 'F03 three params', data: '{ f(a, b, c) { a + b + c } }', read: 'f(1, 2, 3)', expect: 6 },
  { name: 'F04 missing arg is undefined', data: '{ f(a, b) { b } }', read: 'f(1)', expect: undefined },
  { name: 'F05 extra args ignored', data: '{ f(a) { a } }', read: 'f(1, 2, 3)', expect: 1 },
  { name: 'F06 arg read from state', data: '{ n: 5, add(v) { n += v } }', steps: ['add(n)'], read: 'n', expect: 10 },
  { name: 'F07 arg is $event', data: "{ v: '', set(e) { v = e.target.value } }", steps: ['set($event)'], locals: { $event: { target: { value: 'typed' } } }, read: 'v', expect: 'typed' },
  { name: 'F08 arg is an object literal', data: '{ last: null, save(o) { last = o.id } }', steps: ['save({ id: 3 })'], read: 'last', expect: 3 },
  { name: 'F09 spread args', data: '{ f(a, b) { a + b } }', read: 'f(...[1, 2])', expect: 3 },
  { name: 'F10 param shadows state key', data: '{ n: 1, f(n) { n } }', read: 'f(9)', expect: 9 },
  { name: 'F11 assignment to shadowing param stays local', data: '{ n: 1, f(n) { n = 5 } }', steps: ['f(2)'], read: 'n', expect: 1 },
  { name: 'F12 param shadows sibling method', data: '{ g() { 1 }, f(g) { g } }', read: 'f(2)', expect: 2 },
  { name: 'F13 default parameter', data: '{ n: 0, inc(by = 1) { n += by } }', steps: ['inc()'], read: 'n', expect: 1, kind: 'GAP', why: 'parser.ts method shorthand: parameters must be bare identifiers ("Expected a parameter name")' },
  { name: 'F14 rest parameter', data: '{ f(...xs) { xs.length } }', read: 'f(1, 2, 3)', expect: 3, kind: 'GAP', why: 'same parameter rule' },
  { name: 'F15 destructured parameter', data: '{ f({ a }) { a } }', read: 'f({ a: 1 })', expect: 1, kind: 'GAP', why: 'same parameter rule' },
  { name: 'F16 arguments object', data: '{ f() { arguments.length } }', read: 'f(1, 2)', expect: 2, kind: 'GAP', why: '`arguments` is an unresolved identifier' },
  { name: 'F17 sibling method passed as argument', data: '{ apply(f, v) { f(v) }, dbl(x) { x * 2 }, run() { apply(dbl, 4) } }', read: 'run()', expect: 8 },
  { name: 'F18 string arg with a space', data: "{ s: '', set(v) { s = v } }", steps: ["set('a b')"], read: 's', expect: 'a b' },
  { name: 'F19 param in template literal', data: '{ f(name) { `hi ${name}` } }', read: "f('Bo')", expect: 'hi Bo' },
  { name: 'F20 v-for row value passed in', data: '{ picked: null, pick(item) { picked = item.id } }', steps: ['pick(item)'], locals: { item: { id: 7 } }, read: 'picked', expect: 7 },

  // ==== G. return values =====================================================
  { name: 'G01 number into text binding', data: '{ a: 2, b: 3, total() { a + b } }', read: 'total()', text: true, expect: '5' },
  { name: 'G02 empty body into text binding', data: '{ f() { } }', read: 'f()', text: true, expect: '' },
  { name: 'G03 object into text binding', data: '{ f() { ({ a: 1 }) } }', read: 'f()', text: true, expect: '{"a":1}' },
  { name: 'G04 array into text binding', data: '{ f() { [1, 2] } }', read: 'f()', text: true, expect: '[1,2]' },
  { name: 'G05 object for :class', data: '{ on: true, cls() { ({ active: on, off: !on }) } }', read: 'cls().active && !cls().off', expect: true },
  { name: 'G06 boolean for :disabled', data: '{ n: 0, empty() { n === 0 } }', read: 'empty()', expect: true },
  { name: 'G07 `return n * 2` as last statement', data: '{ n: 3, d() { return n * 2 } }', read: 'd()', expect: 6, why: 'works by accident: `return` is an identifier statement evaluating to undefined, and `n * 2` is the next statement' },
  {
    name: 'G08 return -1',
    data: '{ f() { return -1 } }',
    read: 'f()',
    expect: -1,
    kind: 'GAP',
    why: '`return` is not a keyword (lexer.ts has none), so `return -1` parses as the binary expression `return - 1`, i.e. `undefined - 1` = NaN. No error.',
  },
  { name: 'G09 return (n)', data: '{ n: 1, f() { return (n) } }', read: 'f()', expect: 1, kind: 'GAP', why: 'parses as the call `return(n)`; the error says "return" was not found... expose it with V.config.globals.return' },
  { name: 'G10 return [1, 2]', data: '{ f() { return [1, 2] } }', read: 'f().length', expect: 2, kind: 'GAP', why: 'parses as the member access `return[1, 2]` on undefined' },
  { name: 'G11 return { a: 1 }', data: '{ f() { return { a: 1 } } }', read: 'f().a', expect: 1, why: 'works by accident: `return` then an object literal statement' },
  { name: 'G12 early return inside if', data: "{ n: 5, f() { if (n > 3) return 'big'; 'small' } }", read: 'f()', expect: 'big', kind: 'GAP', why: '`return` is a statement of its own, so the `if` consumes only it; `\'big\'` and `\'small\'` both run and the last one wins' },
  { name: 'G13 bare return stops nothing', data: '{ n: 0, f() { return; n = 1 } }', steps: ['f()'], read: 'n', expect: 0, kind: 'GAP', why: 'execution continues past `return;`' },
  { name: 'G14 return string', data: "{ f() { return 'ok' } }", read: 'f()', expect: 'ok', why: 'works by accident' },
  { name: 'G15 return ternary', data: '{ n: 2, f() { return n > 1 ? "a" : "b" } }', read: 'f()', expect: 'a', why: 'works by accident' },
  { name: 'G16 return in both branches', data: "{ n: 0, f() { if (n) { return 'a' } else { return 'b' } } }", read: 'f()', expect: 'b', why: 'works by accident: each block\'s last value is the string' },
  { name: 'G17 return inside arrow callback', data: '{ list: [1, 2, 3], big() { list.filter(x => { return x > 1 }).length } }', read: 'big()', expect: 2, why: 'works by accident' },
  { name: 'G18 return !flag', data: '{ on: true, f() { return !on } }', read: 'f()', expect: false, why: 'works by accident: `!` is not a binary operator, so it starts a new statement' },
  { name: 'G19 return +n', data: '{ n: 4, f() { return +n } }', read: 'f()', expect: 4, kind: 'GAP', why: 'same as G08 with unary plus: `undefined + 4` = NaN' },
  { name: 'G20 return `tpl`', data: '{ n: 4, f() { return `n=${n}` } }', read: 'f()', expect: 'n=4', why: 'works by accident' },

  // ==== H. a method returning a function =====================================
  { name: 'H01 call the result', data: '{ mk() { x => x + 1 } }', read: 'mk()(2)', expect: 3 },
  { name: 'H02 result closes over state', data: '{ n: 5, mk() { x => x + n } }', read: 'mk()(2)', expect: 7 },
  {
    name: 'H03 result stays live after state changes',
    custom: ({ make }) => {
      const { state } = make('{ n: 5, mk() { () => n } }');
      const fn = state.mk();
      state.n = 10;
      return fn();
    },
    expect: 10,
  },
  {
    name: 'H04 result writes state',
    custom: ({ make }) => {
      const { state } = make('{ n: 0, mk() { () => { n++ } } }');
      const fn = state.mk();
      fn();
      fn();
      return state.n;
    },
    expect: 2,
  },
  { name: 'H05 curried twice', data: '{ mk() { () => () => 9 } }', read: 'mk()()()', expect: 9 },
  { name: 'H06 returned method-shorthand object', data: '{ mk() { ({ go() { 4 } }) } }', read: 'mk().go()', expect: 4 },
  {
    name: 'H07 sibling passed to a higher-order sibling',
    data: '{ k: 3, apply(f, v) { f(v) }, scale(x) { x * k }, run() { apply(scale, 4) } }',
    read: 'run()',
    expect: 12,
    kind: 'BUG',
    why: 'interpreter.ts `call`, id path: `f(v)` finds `f` in the call frame\'s vars and passes THAT object as `this`. The method node then layers its body on the vars object instead of on the state, and `k` is unreachable. Same mechanism as I03.',
  },

  // ==== I. methods used as callbacks =========================================
  { name: 'I01 list.map(double), no siblings needed', data: '{ list: [1, 2, 3], double(x) { x * 2 }, out() { list.map(double).join(",") } }', read: 'out()', expect: '2,4,6' },
  { name: 'I02 list.filter(ok), no siblings needed', data: '{ list: [1, 2, 3], ok(x) { x > 1 }, out() { list.filter(ok).length } }', read: 'out()', expect: 2 },
  {
    name: 'I03 list.map(scale) where scale reads a sibling',
    data: '{ k: 10, list: [1, 2], scale(x) { x * k }, out() { list.map(scale).join(",") } }',
    read: 'out()',
    expect: '10,20',
    kind: 'BUG',
    why: 'interpreter.ts `method`: when called without an object `this` (Array.prototype.map calls with undefined) the body falls back to the scope the literal was evaluated in, which is OUTSIDE the state. `k` resolves to undefined and the result is NaN. JavaScript would also lose `this` here, but in JavaScript the fix is `.bind(this)`, and there is no `this` to bind. The only working spelling is `list.map(x => scale(x))` (I05).',
  },
  {
    name: 'I04 list.forEach(add) where add writes a sibling',
    data: '{ n: 0, list: [1, 2, 3], add(x) { n += x }, run() { list.forEach(add) } }',
    steps: ['run()'],
    read: 'n',
    expect: 6,
    kind: 'BUG',
    why: 'same as I03, and worse: the writes to `n` land in a throwaway scope, nothing throws, the page shows 0',
  },
  { name: 'I05 the arrow wrapper works', data: '{ k: 10, list: [1, 2], scale(x) { x * k }, out() { list.map(x => scale(x)).join(",") } }', read: 'out()', expect: '10,20' },
  { name: 'I06 callback straight from the template', data: '{ list: [1, 2, 3], double(x) { x * 2 } }', read: 'list.map(double).join(",")', expect: '2,4,6' },
  { name: 'I07 template callback reading a sibling', data: '{ k: 10, list: [1, 2], scale(x) { x * k } }', read: 'list.map(scale).join(",")', expect: '10,20', kind: 'BUG', why: 'same as I03, from an interpolation' },
  { name: 'I08 sort comparator', data: '{ list: [3, 1, 2], cmp(a, b) { a - b }, s() { list.sort(cmp) } }', steps: ['s()'], read: 'list.join(",")', expect: '1,2,3' },
  { name: 'I09 reduce', data: '{ list: [1, 2, 3], sum(a, b) { a + b } }', read: 'list.reduce(sum, 0)', expect: 6 },
  { name: 'I10 find with a sibling threshold', data: '{ min: 2, list: [1, 2, 3], big(x) { x > min } }', read: 'list.find(big)', expect: 3, kind: 'BUG', why: 'same as I03' },
  { name: 'I11 forEach(inc) with no params', data: '{ n: 0, list: [1, 2], inc() { n++ }, run() { list.forEach(inc) } }', steps: ['run()'], read: 'n', expect: 2, kind: 'BUG', why: 'same as I04' },
  {
    name: 'I12 thisArg restores the siblings',
    data: '{ k: 10, list: [1, 2], scale(x) { x * k }, self() { $data }, out() { list.map(scale, $data).join(",") } }',
    read: 'out()',
    expect: '10,20',
    kind: 'BUG',
    why: 'would be the JavaScript workaround, but inside a method `$data` is the call frame (see O14), so the thisArg is the wrong object',
  },

  // ==== J. methods on nested objects ==========================================
  { name: 'J01 nested method writes nested sibling', data: "{ form: { name: '', submit() { name = 'x' } } }", steps: ['form.submit()'], read: 'form.name', expect: 'x' },
  { name: 'J02 nested method reads nested siblings', data: '{ form: { a: 1, b: 2, sum() { a + b } } }', read: 'form.sum()', expect: 3 },
  {
    name: 'J03 nested method writes a top-level key',
    data: '{ n: 0, form: { bump() { n++ } } }',
    steps: ['form.bump()'],
    read: 'n',
    expect: { throws: /n is not defined/ },
    kind: 'POLICY',
    why: 'the method sees its own object and the scope outside the literal, not the enclosing object (there is no lexical nesting). JavaScript would need `this` and it would be the wrong `this` too. Silent, like C01.',
  },
  { name: 'J04 nested method calls a top-level method', data: '{ n: 0, inc() { n++ }, form: { go() { inc() } } }', steps: ['form.go()'], read: 'n', expect: { throws: /inc/ }, why: 'throws in both, but Voodoo\'s message points at V.config.globals for a method two lines up' },
  { name: 'J05 two levels deep', data: '{ a: { b: { n: 0, inc() { n++ } } } }', steps: ['a.b.inc()'], read: 'a.b.n', expect: 1 },
  { name: 'J06 nested object replaced, new method works', data: '{ form: { n: 0, inc() { n++ } }, reset() { form = { n: 5, inc() { n += 10 } } } }', steps: ['reset()', 'form.inc()'], read: 'form.n', expect: 15 },
  { name: 'J07 optional call on null nested', data: '{ form: null }', steps: ['form?.submit?.()'], read: 'form', expect: null },
  {
    name: 'J08 bare member handler: @click="form.submit"',
    data: "{ form: { name: '', submit() { name = 'x' } } }",
    steps: ['form.submit'],
    read: 'form.name',
    expect: 'x',
    kind: 'BUG',
    why: 'directives/core.ts runHandler: a bare `id` or `member` that resolves to a function is called with `value.call(scope.data, ...)`, i.e. with the TOP-LEVEL state as `this`, not `form`. The method layers its body on the wrong object, `name` is not found there, and the write is lost. `@click="form.submit()"` (J01) works.',
  },
  { name: 'J09 bare id handler: @click="inc"', data: '{ n: 0, inc() { n++ } }', steps: ['inc'], read: 'n', expect: 1 },
  { name: 'J10 nested getter stays live', data: '{ cart: { items: [1, 2], get n() { items.length } } }', steps: ['cart.items.push(3)'], read: 'cart.n', expect: 3 },
  { name: 'J11 nested method via computed key', data: '{ o: { inc() { 5 } }, k: "inc" }', read: 'o[k]()', expect: 5 },
  { name: 'J12 method in an array', data: '{ fns: [x => x + 1, { go() { 2 } }] }', read: 'fns[0](1) + fns[1].go()', expect: 4 },

  // ==== K. getters ============================================================
  { name: 'K01 getter reads sibling', data: '{ a: 2, get d() { a * 2 } }', read: 'd', expect: 4 },
  { name: 'K02 getter stays live', data: '{ a: 2, get d() { a * 2 } }', steps: ['a = 5'], read: 'd', expect: 10 },
  { name: 'K03 getter over getter', data: '{ a: 1, get b() { a + 1 }, get c() { b * 10 } }', steps: ['a = 2'], read: 'c', expect: 30 },
  { name: 'K04 method reads getter', data: '{ a: 2, get d() { a * 2 }, m() { d + 1 } }', read: 'm()', expect: 5 },
  { name: 'K05 getter calls sibling method', data: '{ n: 3, sq() { n * n }, get t() { sq() + 1 } }', read: 't', expect: 10 },
  { name: 'K06 getter over array length, after pushes', data: '{ items: [], get count() { items.length }, add() { items.push(1) } }', steps: ['add()', 'add()'], read: 'count', expect: 2 },
  { name: 'K07 assigning to a getter throws', data: '{ a: 1, get d() { a } }', steps: ['d = 5'], stepMayThrow: true, read: 'd', expect: 1, why: 'JavaScript throws TypeError in strict mode; Voodoo throws a raw TypeError from the proxy trap ("trap returned falsish"), not a VoodooRuntimeError, and the state is untouched' },
  { name: 'K08 setter', data: '{ v0: 0, set v(x) { v0 = x } }', steps: ['v = 3'], read: 'v0', expect: 3, kind: 'GAP', why: 'parser.ts parseObjectLiteral: "Only a getter: a setter would need an assignment target the scope model has nowhere to put"' },
  { name: 'K09 getter is enumerable', custom: ({ make }) => Object.keys(make('{ a: 1, get d() { a } }').state).join(','), expect: 'a,d' },
  { name: 'K10 typeof getter value', data: '{ a: 1, get d() { a } }', read: 'typeof d', expect: 'number' },
  { name: 'K11 a key literally named get', data: '{ get: 1 }', read: 'get', expect: 1 },
  { name: 'K12 a method literally named get', data: '{ get() { 2 } }', read: 'get()', expect: 2 },
  { name: 'K13 getter that throws', data: '{ get bad() { nothing.x } }', read: 'bad', expect: { throws: /nothing|"x"/ } },
  { name: 'K14 getter over nested object', data: '{ user: { first: "A", last: "B" }, get full() { user.first + " " + user.last } }', steps: ['user.first = "Z"'], read: 'full', expect: 'Z B' },
  { name: 'K15 getter into text binding', data: '{ items: [1, 2], get count() { items.length } }', read: 'count', text: true, expect: '2' },
  { name: 'K16 getter with a parameter is rejected', data: '{ get d(x) { x } }', read: 'd', expect: { throws: /Expected "\)"/ }, why: 'JavaScript rejects it too' },

  // ==== L. mutating arrays from a method ======================================
  { name: 'L01 push', data: '{ list: [1], add() { list.push(2) } }', steps: ['add()'], read: 'list.join(",")', expect: '1,2' },
  { name: 'L02 pop', data: '{ list: [1, 2], rm() { list.pop() } }', steps: ['rm()'], read: 'list.join(",")', expect: '1' },
  { name: 'L03 splice', data: '{ list: [1, 2, 3], rm() { list.splice(1, 1) } }', steps: ['rm()'], read: 'list.join(",")', expect: '1,3' },
  { name: 'L04 sort in place', data: '{ list: [3, 1, 2], s() { list.sort((a, b) => a - b) } }', steps: ['s()'], read: 'list.join(",")', expect: '1,2,3' },
  { name: 'L05 reverse', data: '{ list: [1, 2, 3], r() { list.reverse() } }', steps: ['r()'], read: 'list.join(",")', expect: '3,2,1' },
  { name: 'L06 index assignment', data: '{ list: [1, 2], set() { list[0] = 9 } }', steps: ['set()'], read: 'list.join(",")', expect: '9,2' },
  { name: 'L07 length = 0', data: '{ list: [1, 2], clear() { list.length = 0 } }', steps: ['clear()'], read: 'list.length', expect: 0 },
  { name: 'L08 reassign with spread', data: '{ list: [1], add() { list = [...list, 2] } }', steps: ['add()'], read: 'list.join(",")', expect: '1,2' },
  { name: 'L09 unshift, push, shift', data: '{ list: [2], go() { list.unshift(1); list.push(3); list.shift() } }', steps: ['go()'], read: 'list.join(",")', expect: '2,3' },
  { name: 'L10 reassign with filter', data: '{ list: [1, 2, 3], rm() { list = list.filter(x => x !== 2) } }', steps: ['rm()'], read: 'list.join(",")', expect: '1,3' },
  { name: 'L11 push an object, then mutate it', data: '{ list: [], add() { list.push({ n: 1 }) }, bump() { list[0].n++ } }', steps: ['add()', 'bump()'], read: 'list[0].n', expect: 2 },
  { name: 'L12 push by parameter', data: '{ list: [], add(t) { list.push(t) } }', steps: ["add('a')", "add('b')"], read: 'list.length', expect: 2 },
  { name: 'L13 splice by parameter', data: '{ list: ["a", "b", "c"], rm(i) { list.splice(i, 1) } }', steps: ['rm(1)'], read: 'list.join("")', expect: 'ac' },
  { name: 'L14 delete a key', data: '{ user: { a: 1 }, rm() { delete user.a } }', steps: ['rm()'], read: 'user.a', expect: undefined, kind: 'GAP', why: 'parser.ts header lists `delete` as unsupported by design, but it does not fail: `delete` is an identifier statement and `user.a` a harmless read, so the method silently does nothing' },
  {
    name: 'L15 includes after push, as a binding',
    data: '{ list: [1], add() { list.push(2) }, has() { list.includes(2) } }',
    steps: ['add()'],
    read: 'has()',
    expect: true,
    kind: 'BUG',
    why: 'reactivity/index.ts arrayInstrumentations: `includes`, `indexOf` and `lastIndexOf` track every EXISTING index but not `length`, and a push triggers only the `length` dependency. A binding like :checked="selected.includes(id)" never re-runs after @click="selected.push(id)". The direct read is right, the effect is stale.',
  },
  {
    name: 'L18 the same hole in pure reactive(), no interpreter',
    custom: () => {
      const s = reactive({ list: [1] });
      let seen;
      const r = effect(() => {
        seen = s.list.includes(2);
      });
      s.list.push(2);
      flushSync();
      r.effect.stop();
      return seen;
    },
    expect: true,
    kind: 'BUG',
    why: 'same as L15, proved without the expression language in the loop',
  },
  {
    name: 'L19 indexOf has the same hole',
    custom: () => {
      const s = reactive({ list: [1] });
      let seen;
      const r = effect(() => {
        seen = s.list.indexOf(2);
      });
      s.list.push(2);
      flushSync();
      r.effect.stop();
      return seen;
    },
    expect: 1,
    kind: 'BUG',
    why: 'same instrumentation as includes',
  },
  { name: 'L20 some() after push is fine', data: '{ list: [1], add() { list.push(2) }, has() { list.some(x => x === 2) } }', steps: ['add()'], read: 'has()', expect: true, why: 'control: un-instrumented iteration reads `length` through the proxy and is tracked' },
  { name: 'L21 includes after reassign is fine', data: '{ list: [1], add() { list = [...list, 2] }, has() { list.includes(2) } }', steps: ['add()'], read: 'has()', expect: true, why: 'control: the binding depends on the `list` key itself, which the reassignment triggers' },
  { name: 'L22 includes after splice is fine', data: '{ list: [1, 2], rm() { list.splice(1, 1) }, has() { list.includes(2) } }', steps: ['rm()'], read: 'has()', expect: false, why: 'control: shrinking triggers every index at or past the new length, and includes tracked those' },
  { name: 'L16 find then write', data: '{ todos: [{ id: 1, done: false }], toggle(id) { todos.find(t => t.id === id).done = true } }', steps: ['toggle(1)'], read: 'todos[0].done', expect: true },
  { name: 'L17 push inside a loop callback', data: '{ list: [], fill() { [1, 2, 3].forEach(x => list.push(x * x)) } }', steps: ['fill()'], read: 'list.join(",")', expect: '1,4,9' },

  // ==== M. a method that throws, and friends ==================================
  { name: 'M01 read from undefined', data: '{ boom() { nothing.x } }', read: 'boom()', expect: { throws: /nothing|"x"/ }, why: 'through runHandler this becomes console.error("[Voodoo] error in event click (\\"boom()\\")") and the page keeps running; needs real DOM to see' },
  { name: 'M02 calling a number', data: '{ n: 1 }', read: 'n()', expect: { throws: /is not a function/ } },
  { name: 'M03 calling a method that does not exist', data: '{ n: 1 }', read: 'nope()', expect: { throws: /nope/ }, why: 'message says "nope" was not found. Expressions cannot reach window: expose it with V.config.globals.nope, which is advice for a global, not for a typo of a method' },
  { name: 'M04 throw new Error', data: "{ f() { throw new Error('x') } }", read: 'f()', expect: { throws: /^x/ }, kind: 'GAP', why: '`throw` and `new` are identifiers, `Error` is not in allowedGlobals; the error that surfaces is "Error" was not found' },
  { name: 'M05 error inside a callback', data: '{ list: [1], f() { list.map(x => x.y.z) } }', read: 'f()', expect: { throws: /"z"|'z'/ } },
  { name: 'M06 console reachable', data: '{ f() { typeof console.log } }', read: 'f()', expect: 'function' },
  { name: 'M07 setTimeout inside a method', data: '{ n: 0, f() { setTimeout(() => n++, 0) } }', read: 'typeof f()', expect: (v) => v === 'number' || v === 'object', kind: 'POLICY', why: 'interpreter.ts allowedGlobals has no timers; the message says setTimeout was not found and how to expose it' },
  {
    name: 'M08 Promise.then writes state',
    custom: async ({ make, handler }) => {
      const { state, scope } = make('{ n: 0, load() { Promise.resolve(5).then(v => { n = v }) } }');
      handler(scope, 'load()');
      await Promise.resolve();
      return state.n;
    },
    expect: 5,
  },
  {
    name: 'M09 await inside a method',
    custom: async ({ make, handler }) => {
      const { state, scope } = make('{ n: 0, load() { n = await Promise.resolve(5) } }');
      handler(scope, 'load()');
      await Promise.resolve();
      return state.n;
    },
    expect: 5,
    kind: 'GAP',
    why: '`await` is an identifier: `n = await` stores undefined, then `Promise.resolve(5)` runs and is dropped. Silent.',
  },
  { name: 'M10 async method shorthand', data: '{ async load() { 1 } }', read: 'load()', expect: 1, kind: 'GAP', why: 'parser.ts: `async` becomes a shorthand property, then `load` is an unexpected token' },
  { name: 'M11 partial writes before a throw stay', data: '{ n: 0, f() { n = 1; nothing.x; n = 2 } }', steps: ['f()'], stepMayThrow: true, read: 'n', expect: 1 },

  // ==== N. local variables inside a method ====================================
  { name: 'N01 const local', data: '{ n: 2, f() { const t = n * 2; t + 1 } }', read: 'f()', expect: 5, why: 'works by accident: `const` is an identifier statement and `t = ...` lands in the call frame' },
  { name: 'N02 let two locals', data: '{ f() { let a = 1, b = 2; a + b } }', read: 'f()', expect: 3, why: 'works by accident' },
  {
    name: 'N03 const shadowing a state key clobbers it',
    data: '{ n: 1, f() { const n = 99; n } }',
    steps: ['f()'],
    read: 'n',
    expect: 1,
    kind: 'GAP',
    why: '`const` is an identifier, so `n = 99` is a plain assignment; Scope.set walks up and finds the state key. A local that happens to share a name with state overwrites the state.',
  },
  { name: 'N04 let shadowing a state key clobbers it', data: '{ n: 0, f() { let n = 5; n++ } }', steps: ['f()'], read: 'n', expect: 0, kind: 'GAP', why: 'same as N03' },
  { name: 'N05 undeclared name does not become state', data: '{ f() { tmp = 5 } }', steps: ['f()'], read: 'typeof tmp', expect: 'undefined' },
  { name: 'N06 local visible to inner arrow', data: '{ f() { const k = 3; [1].map(x => x * k)[0] } }', read: 'f()', expect: 3 },
  {
    name: 'N07 local captured before a state write',
    custom: ({ make }) => {
      // Called once on purpose: the read itself writes `n`, so a second
      // evaluation (as the harness does for the effect) would capture 10.
      const { state } = make('{ n: 1, f() { const old = n; n = 10; old } }');
      return [state.f(), state.n];
    },
    expect: [1, 10],
  },

  // ==== O. reactivity identity and the scope chain ============================
  {
    name: 'O01 JS call, template read, raw read agree',
    custom: ({ make, read }) => {
      const { state, scope } = make('{ n: 0, inc() { n++ } }');
      state.inc();
      return [read(scope, 'n'), toRaw(state).n, state.n];
    },
    expect: [1, 1, 1],
  },
  {
    name: 'O02 template write, JS read',
    custom: ({ make, handler }) => {
      const { state, scope } = make('{ n: 0 }');
      handler(scope, 'n = 4');
      return state.n;
    },
    expect: 4,
  },
  {
    name: 'O03 one method call re-runs the effect once',
    custom: ({ make, handler, read }) => {
      const { state, scope } = make('{ n: 0, inc() { n++ } }');
      let runs = 0;
      const r = effect(() => {
        runs++;
        read(scope, 'n');
      });
      handler(scope, 'inc()');
      flushSync();
      r.effect.stop();
      return runs;
    },
    expect: 2,
  },
  { name: 'O04 same function through proxy and raw', custom: ({ make }) => { const { state } = make('{ inc() { 1 } }'); return state.inc === toRaw(state).inc; }, expect: true },
  { name: 'O05 typeof a method', data: '{ inc() { 1 } }', read: 'typeof inc', expect: 'function' },
  { name: 'O06 spread of outer state, then a method', outer: '{ base: { n: 0 } }', data: '{ ...base, inc() { n++ } }', steps: ['inc()'], read: 'n', expect: 1 },
  { name: 'O07 method writes a parent-scope key', outer: '{ count: 0 }', data: '{ inc() { count++ } }', steps: ['inc()'], read: 'count', expect: 1 },
  {
    name: 'O08 child key shadows parent key',
    custom: ({ make, handler }) => {
      const { state, scope, parentState } = make('{ n: 0, inc() { n++ } }', '{ n: 100 }');
      handler(scope, 'inc()');
      return [state.n, parentState.n];
    },
    expect: [1, 100],
  },
  { name: 'O09 child method calls parent method', outer: '{ pn: 0, pinc() { pn++ } }', data: '{ go() { pinc() } }', steps: ['go()'], read: 'pn', expect: 1 },
  {
    name: 'O10 real JS method with this (V.data escape hatch)',
    custom: ({ handler }) => {
      const state = reactive({
        n: 0,
        inc() {
          this.n++;
        },
      });
      const scope = new Scope(state);
      handler(scope, 'inc()');
      handler(scope, 'inc');
      return state.n;
    },
    expect: 2,
  },
  {
    name: 'O11 real JS getter with this stays live',
    custom: ({ read }) => {
      const state = reactive({
        items: [1],
        get count() {
          return this.items.length;
        },
      });
      const scope = new Scope(state);
      let seen;
      const r = effect(() => {
        seen = read(scope, 'count');
      });
      state.items.push(2);
      flushSync();
      r.effect.stop();
      return seen;
    },
    expect: 2,
  },
  { name: 'O12 real JS arrow in state (V.data)', custom: ({ handler }) => { const box = { n: 0 }; const state = reactive({ inc: () => box.n++ }); handler(new Scope(state), 'inc()'); return box.n; }, expect: 1 },
  { name: 'O13 $data in an interpolation', data: '{ n: 7 }', read: '$data.n', expect: 7 },
  {
    name: 'O14 $data inside a method',
    data: '{ n: 0, inc() { $data.n++ } }',
    steps: ['inc()'],
    read: 'n',
    expect: 1,
    kind: 'BUG',
    why: 'Scope.lookup resolves a magic on the scope it was CALLED on, and inside a method that is the call-frame scope whose data is the parameters object. docs/en/state.md:328 says $data is "the current scope\'s data object". Reading `$data.n` gives undefined and the increment writes NaN into the frame.',
  },
  { name: 'O15 $data at handler level', data: '{ n: 0 }', steps: ['$data.n++'], read: 'n', expect: 1, kind: 'BUG', why: 'same: runHandler evaluates in scope.child({ $event, $el, ... }), so $data is that locals object' },
  { name: 'O16 $parent inside a child method', outer: '{ pn: 0 }', data: '{ go() { $parent.pn++ } }', steps: ['go()'], read: 'pn', expect: 1, kind: 'BUG', why: 'same mechanism: from the call frame, $parent is the method\'s own state, so the write creates a NaN `pn` on the child instead of touching the parent' },
  { name: 'O17 $root inside a method', outer: '{ }', data: '{ go() { $root.hit = true } }', steps: ['go()'], read: '$root.hit', expect: true, why: '$root walks to the top from any scope, so it is the one scope magic that survives inside a method' },
  { name: 'O18 a method stored under a $-name', data: '{ n: 0, $inc() { n++ } }', steps: ['$inc()'], read: 'n', expect: 1 },

  // ==== P. the `new Date(0).getTime()` question ================================
  { name: 'P01 `new` is not a keyword', data: '{ }', read: 'typeof new', expect: { throws: /Unexpected/ }, kind: 'GAP', why: 'lexer.ts: `new` is an identifier; parser.ts header lists `new` as unsupported by design. It evaluates to undefined.' },
  { name: 'P02 what Date(0) alone returns', data: '{ }', read: 'typeof Date(0)', expect: 'string', why: 'JavaScript agrees: Date called as a function returns a string, ignoring its arguments' },
  { name: 'P03 new Date(0) is not a Date', data: '{ }', read: 'new Date(0) instanceof Date', expect: true, kind: 'GAP', why: '`new Date(0)` parses as two statements, `new` and `Date(0)`, so the value is the string from P02. That is why `.getTime()` is "not a function": there is no Date instance, and checkKey/BLOCKED_KEYS never enter into it.' },
  { name: 'P04 new Date(0).getTime()', data: '{ }', read: 'new Date(0).getTime()', expect: 0, kind: 'GAP', why: 'see P03' },
  {
    name: 'P05 methods on a real Date instance work',
    custom: ({ read }) => {
      const scope = new Scope(reactive({ d: new Date(0), f() { return this.d.getTime(); } }));
      return [read(scope, 'd.getTime()'), read(scope, 'd.getUTCFullYear()'), read(scope, 'f()')];
    },
    expect: [0, 1970, 0],
    why: 'proves the prototype guard is not the culprit: instance methods reached through the prototype chain are fine; only `constructor`, `prototype` and `__proto__` are blocked',
  },
  { name: 'P06 Date statics', data: '{ }', read: 'Date.now() > 0 && Date.UTC(1970, 0, 1)', expect: 0 },

  // ==== Q. other declaration forms ============================================
  { name: 'Q01 string-keyed method', custom: ({ make }) => make("{ 'my-fn'() { 1 } }").state['my-fn'](), expect: 1 },
  { name: 'Q02 computed-key method', data: "{ ['x' + 1]() { 1 } }", read: 'x1()', expect: 1, kind: 'GAP', why: 'parser.ts parseObjectLiteral: a computed key must be followed by `:`' },
  { name: 'Q03 method shadows an allowed global', data: '{ Math() { 1 } }', read: 'Math()', expect: 1 },
  { name: 'Q04 method named constructor', data: '{ constructor() { 1 } }', read: 'constructor()', expect: 1, kind: 'POLICY', why: 'interpreter.ts BLOCKED_KEYS: the name opens the prototype chain, refused on purpose' },
  { name: 'Q05 space before the parameter list', data: '{ n: 0, inc () { n++ }, }', steps: ['inc()'], read: 'n', expect: 1 },
  { name: 'Q06 method returning a sibling method by name', data: '{ a() { 1 }, pick() { a } }', read: 'pick()()', expect: 1 },
  { name: 'Q07 optional call on an existing method', data: '{ f() { 3 } }', read: 'f?.()', expect: 3 },
  { name: 'Q08 optional call on a missing name', data: '{ n: 0 }', read: 'missing?.()', expect: undefined },
  { name: 'Q09 IIFE in the initial state', data: '{ n: (() => 5)() }', read: 'n', expect: 5 },
  { name: 'Q10 method shorthand with trailing comma in params', data: '{ f(a, b,) { a + b } }', read: 'f(1, 2)', expect: 3 },
  { name: 'Q11 two methods, same name, last wins', data: '{ f() { 1 }, f() { 2 } }', read: 'f()', expect: 2 },
  { name: 'Q12 method next to a getter of the same base name', data: '{ n: 2, get sq() { n * n }, sqr() { sq } }', read: 'sqr()', expect: 4 },
  { name: 'B10 docs/en/state.md:71 says shorthand is a syntax error', data: '{ n: 0, double() { n * 2 } }', read: 'double()', expect: 0, why: 'it is not: the doc is stale (parser.ts accepts method shorthand and getters). Listed so the contradiction is on the record.' },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runCase(c) {
  const api = { make, handler, read, effect, flushSync, reactive, Scope, toRaw, stringify, evaluate, parse };
  const out = { name: c.name, kind: c.kind, why: c.why, source: c.data, steps: c.steps, readSrc: c.read };

  let got;
  let observed = NOT_RUN;

  try {
    if (c.custom) {
      got = await c.custom(api);
    } else {
      const { scope } = make(c.data, c.outer);
      const view = () => (c.text ? stringify(read(scope, c.read)) : read(scope, c.read));

      // The text binding, created before anything happens, as on a real page.
      const runner = effect(() => {
        try {
          observed = view();
        } catch (e) {
          observed = e;
        }
      });

      for (const step of c.steps ?? []) {
        try {
          handler(scope, step, c.locals);
        } catch (e) {
          if (!c.stepMayThrow) throw e;
        }
      }
      flushSync();
      runner.effect.stop();

      got = view();
    }
  } catch (e) {
    got = e;
  }

  out.got = got;
  out.observed = observed;

  const direct = matches(c.expect, got);
  // STALE is only meaningful when the direct read produced a value: when a
  // step or the read itself threw, the effect's view is not the point.
  const dom = got instanceof Error || observed === NOT_RUN || matches(c.expect, observed);

  if (direct && dom) out.status = 'ok';
  else if (direct && !dom) out.status = 'STALE';
  else if (got instanceof Error) out.status = 'THROWS';
  else if (c.expect && typeof c.expect === 'object' && c.expect.throws) out.status = 'NO-THROW';
  else out.status = 'WRONG';

  return out;
}

const rows = [];
for (const c of CASES) rows.push(await runCase(c));

let ok = 0;
const counts = { BUG: 0, GAP: 0, POLICY: 0, UNCLASSIFIED: 0, STALE_TAG: 0 };

for (const r of rows) {
  const passed = r.status === 'ok';
  let label;
  if (passed && r.kind) {
    label = 'STALE TAG';
    counts.STALE_TAG++;
  } else if (passed) {
    label = 'ok';
    ok++;
  } else {
    label = r.kind ?? 'UNCLASSIFIED';
    counts[label]++;
  }

  const status = passed ? 'ok    ' : r.status.padEnd(6);
  console.log(`  ${status} ${label.padEnd(12)} ${r.name}`);

  if (!passed || label === 'STALE TAG') {
    const c = CASES.find((x) => x.name === r.name);
    if (r.source) console.log(`${' '.repeat(22)}v-data="${r.source.replace(/\s*\n\s*/g, ' ')}"`);
    if (r.steps?.length) console.log(`${' '.repeat(22)}steps: ${r.steps.join(' ; ')}`);
    if (r.readSrc) console.log(`${' '.repeat(22)}read:  ${r.readSrc}`);
    console.log(`${' '.repeat(22)}expected ${describeExpect(c.expect)}, got ${show(r.got)}`);
    if (r.status === 'STALE') console.log(`${' '.repeat(22)}the effect saw ${show(r.observed)}: the DOM would not update`);
    if (r.why) console.log(`${' '.repeat(22)}why: ${r.why}`);
  }
}

console.log('');
console.log(
  `${ok} of ${rows.length} behave as JavaScript or the docs say; ` +
    `${counts.BUG} bugs, ${counts.GAP} gaps, ${counts.POLICY} policy differences, ` +
    `${counts.UNCLASSIFIED} unclassified, ${counts.STALE_TAG} stale tags`
);

const broken = counts.BUG + counts.GAP + counts.UNCLASSIFIED + counts.STALE_TAG;
process.exit(broken > 0 ? 1 : 0);
