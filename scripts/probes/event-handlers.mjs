/**
 * Probe: event handlers, `@click` and friends.
 *
 *   node scripts/probes/event-handlers.mjs
 *
 * A handler is compiled differently from an interpolation. `runHandler` in
 * `directives/core.ts` parses the attribute, evaluates it in a throwaway child
 * scope that carries `$event`, `$el`, `$rawEvent` and `$detail`, and, when the
 * result is a function AND the expression was a bare name or a member access,
 * calls it with the event. Everything else about a handler (modifiers, target,
 * cleanup) lives in `bindEvent` next to it.
 *
 * This probe drives that path through a real (jsdom) DOM: it mounts HTML,
 * dispatches events and reads state back. Every case is written the way
 * someone would naturally write it in an attribute. A failure is not
 * automatically a bug; the report at the end separates bugs from gaps and
 * from things refused on purpose.
 *
 * Exits non-zero when any case is broken, so it can become a gate.
 */

import { JSDOM } from 'jsdom';

// ---------------------------------------------------------------------------
// A DOM before the library loads, because `dist/index.js` looks at `window`
// and `document` while it is being imported.
// ---------------------------------------------------------------------------

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const win = dom.window;

for (const name of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Text',
  'Comment',
  'DocumentFragment',
  'EventTarget',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'InputEvent',
  'UIEvent',
  'MutationObserver',
  'HTMLInputElement',
  'HTMLFormElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLTemplateElement',
  'HTMLButtonElement',
  'HTMLAnchorElement',
  'SVGElement',
  'ShadowRoot',
  'NodeFilter',
  'DOMParser',
  'XMLSerializer',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'location',
  'history',
  'localStorage',
  'sessionStorage',
  'CSS',
  'FormData',
  'Image',
  'Range',
  'Selection',
]) {
  if (!(name in globalThis) && win[name] !== undefined) globalThis[name] = win[name];
}

// Node has its own `Event`, `CustomEvent` and `navigator`. jsdom's
// `dispatchEvent` refuses an event that is not its own, so these must win.
for (const name of ['Event', 'CustomEvent', 'EventTarget', 'navigator']) {
  try {
    Object.defineProperty(globalThis, name, { value: win[name], configurable: true, writable: true });
  } catch {
    // Left as is when the runtime will not let go of it.
  }
}

const V = await import(new URL('../../packages/voodoojs/dist/index.js', import.meta.url).href);
const { walk, destroy, Scope, reactive, nextTick, store, rootScope, start, parse, evaluate, config } =
  V;

// The MutationObserver that unmounts removed elements is installed by `start`.
start(document.body);

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** Errors routed through `V.onError`, reset before every case. */
let errors = [];
V.default.onError((err, ctx) => errors.push({ err, ctx }));

/** Promise rejections nobody handled, reset before every case. */
let unhandled = [];
process.on('unhandledRejection', (reason) => unhandled.push(reason));

function mount(html, data = {}, scope) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  const state = scope ? scope.data : reactive(data);
  const s = scope ?? new Scope(state);
  walk(root, s);
  return { root, state, scope: s, q: (sel) => root.querySelector(sel), all: (sel) => [...root.querySelectorAll(sel)] };
}

const click = (el, init = {}) => {
  const e = new win.MouseEvent('click', { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const key = (el, type, k, init = {}) => {
  const e = new win.KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const fire = (el, type, init = {}) => {
  const e = new win.Event(type, { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
};
const custom = (el, type, detail) => {
  const e = new win.CustomEvent(type, { bubbles: true, cancelable: true, detail });
  el.dispatchEvent(e);
  return e;
};
const settle = async () => {
  await nextTick();
  await nextTick();
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mounts, clicks `sel` `times` times, settles, and reads something back. */
function viaClick(html, data, read, { times = 1, sel = 'button' } = {}) {
  return async () => {
    const m = mount(html, data);
    for (let i = 0; i < times; i++) click(m.q(sel));
    await settle();
    return read(m);
  };
}

/** Parse and evaluate with no DOM, like scripts/probe-expressions.mjs. */
function pure(source, data = {}) {
  const scope = new Scope(reactive(data));
  return evaluate(parse(source), scope);
}

const CASES = [];
let group = '';
function section(name) {
  CASES.push({ section: name });
  group = name;
}
/**
 * @param name   short label
 * @param source what the person wrote, for the report
 * @param expected value `run` should produce
 * @param run    async function producing the actual value
 * @param note   printed when the case fails: what the failure means
 */
function probe(name, source, expected, run, note) {
  CASES.push({ group, name, source, expected, run, note });
}

// ===========================================================================
// Cases
// ===========================================================================

section('inline statements');

probe('postfix increment', '@click="count++"', 1,
  viaClick('<button @click="count++"></button>', { count: 0 }, (m) => m.state.count));
probe('prefix increment', '@click="++count"', 1,
  viaClick('<button @click="++count"></button>', { count: 0 }, (m) => m.state.count));
probe('decrement', '@click="count--"', 4,
  viaClick('<button @click="count--"></button>', { count: 5 }, (m) => m.state.count));
probe('compound +=', '@click="count += 2"', 2,
  viaClick('<button @click="count += 2"></button>', { count: 0 }, (m) => m.state.count));
probe('compound -=', '@click="count -= 2"', 3,
  viaClick('<button @click="count -= 2"></button>', { count: 5 }, (m) => m.state.count));
probe('compound *=', '@click="count *= 3"', 6,
  viaClick('<button @click="count *= 3"></button>', { count: 2 }, (m) => m.state.count));
probe('compound /=', '@click="count /= 2"', 3,
  viaClick('<button @click="count /= 2"></button>', { count: 6 }, (m) => m.state.count));
probe('compound %=', '@click="count %= 4"', 2,
  viaClick('<button @click="count %= 4"></button>', { count: 6 }, (m) => m.state.count));
probe('compound **=', '@click="count **= 2"', 9,
  viaClick('<button @click="count **= 2"></button>', { count: 3 }, (m) => m.state.count));
probe('logical ||=', '@click="name ||= \'anon\'"', 'anon',
  viaClick('<button @click="name ||= \'anon\'"></button>', { name: '' }, (m) => m.state.name));
probe('logical ??=', '@click="name ??= \'anon\'"', 'anon',
  viaClick('<button @click="name ??= \'anon\'"></button>', { name: null }, (m) => m.state.name));
probe('logical &&=', '@click="flag &&= false"', false,
  viaClick('<button @click="flag &&= false"></button>', { flag: true }, (m) => m.state.flag));
probe('plain assignment', '@click="count = 0"', 0,
  viaClick('<button @click="count = 0"></button>', { count: 5 }, (m) => m.state.count));
probe('assignment reading itself', '@click="count = count + 1"', 1,
  viaClick('<button @click="count = count + 1"></button>', { count: 0 }, (m) => m.state.count));
probe('toggle boolean', '@click="open = !open"', true,
  viaClick('<button @click="open = !open"></button>', { open: false }, (m) => m.state.open));
probe('string assignment', '@click="name = \'Ana\'"', 'Ana',
  viaClick('<button @click="name = \'Ana\'"></button>', { name: '' }, (m) => m.state.name));
probe('template literal assignment', '@click="text = `n=${count}`"', 'n=5',
  viaClick('<button @click="text = `n=${count}`"></button>', { count: 5, text: '' }, (m) => m.state.text));
probe('nested member increment', '@click="form.n++"', 1,
  viaClick('<button @click="form.n++"></button>', { form: { n: 0 } }, (m) => m.state.form.n));
probe('computed member assignment', '@click="list[0] = 9"', 9,
  viaClick('<button @click="list[0] = 9"></button>', { list: [1, 2] }, (m) => m.state.list[0]));
probe('array push updates the page', '@click="list.push(4)"', '4',
  viaClick('<button @click="list.push(4)"></button><p>{ list.length }</p>', { list: [1, 2, 3] }, (m) => m.q('p').textContent));
probe('filter with arrow', '@click="list = list.filter(x => x > 1)"', 2,
  viaClick('<button @click="list = list.filter(x => x > 1)"></button>', { list: [1, 2, 3] }, (m) => m.state.list.length));
probe('object spread reassignment', '@click="obj = { ...obj, b: 2 }"', 2,
  viaClick('<button @click="obj = { ...obj, b: 2 }"></button>', { obj: { a: 1 } }, (m) => m.state.obj.b));
probe('ternary with assignments', '@click="n > 2 ? n = 0 : n++"', 0,
  viaClick('<button @click="n > 2 ? n = 0 : n++"></button>', { n: 3 }, (m) => m.state.n));
probe('clamp with ternary', '@click="n = n >= 2 ? 0 : n + 1"', 0,
  viaClick('<button @click="n = n >= 2 ? 0 : n + 1"></button>', { n: 0 }, (m) => m.state.n, { times: 3 }));
probe('short-circuit call', '@click="n > 0 && bump()"', 1,
  viaClick('<button @click="n > 0 && bump()"></button>', { n: 1, hits: 0, bump() { this.hits++; } }, (m) => m.state.hits));
probe('in operator', '@click="has = \'a\' in obj"', true,
  viaClick('<button @click="has = \'a\' in obj"></button>', { obj: { a: 1 }, has: false }, (m) => m.state.has));
probe('line comment inside handler', '@click="count++ // bump"', 1,
  viaClick('<button @click="count++ // bump"></button>', { count: 0 }, (m) => m.state.count));
probe('HTML entities decode first', '@click="count &lt; 3 &amp;&amp; count++"', 1,
  viaClick('<button @click="count &lt; 3 &amp;&amp; count++"></button>', { count: 0 }, (m) => m.state.count));
probe('empty expression is harmless', '@click=""', 0,
  viaClick('<button @click=""></button>', {}, () => errors.length));
probe('whitespace expression is harmless', '@click="   "', 0,
  viaClick('<button @click="   "></button>', {}, () => errors.length));
probe('root scope via V.data', '@click="count++" with rootScope', 1, async () => {
  rootScope.data.rootCount = 0;
  const m = mount('<button @click="rootCount++"></button>', {}, rootScope);
  click(m.q('button'));
  await settle();
  return rootScope.data.rootCount;
});
probe('handler on the v-data element itself', '<div v-data="{n:0}" @click="n++">', '1',
  viaClick('<div v-data="{ n: 0 }" @click="n++"><p>{ n }</p></div>', {}, (m) => m.q('p').textContent, { sel: 'div' }));

section('writing to a name nobody declared');

probe('undeclared name inside v-data', '@click="msg = \'hi\'" then { msg }', 'hi',
  viaClick('<div v-data="{}"><button @click="msg = \'hi\'"></button><p>{ msg }</p></div>', {}, (m) => m.q('p').textContent),
  'the write lands on the throwaway $event scope and is lost');
probe('undeclared name with no v-data', '@click="msg = \'hi\'" then { msg }', 'hi',
  viaClick('<button @click="msg = \'hi\'"></button><p>{ msg }</p>', {}, (m) => m.q('p').textContent),
  'same: the throwaway scope swallows it');
probe('undeclared name inside v-for row', '@click="sel = item" then { sel }', 'b',
  viaClick('<div v-data="{ items: [\'a\',\'b\'] }"><ul><li v-for="item in items" @click="sel = item"></li></ul><p>{ sel }</p></div>', {},
    (m) => m.q('p').textContent, { sel: 'li:nth-child(2)' }),
  'same: the throwaway scope swallows it');

section('method call: by name, with parens, with arguments');

probe('bare name calls the function', '@click="inc"', 1,
  viaClick('<button @click="inc"></button>', { n: 0, inc() { this.n++; } }, (m) => m.state.n));
probe('bare name receives the event', '@click="track"', 'click',
  viaClick('<button @click="track"></button>', { last: '', track(e) { this.last = e && e.type; } }, (m) => m.state.last));
probe('bare name: this is the scope data', '@click="whoAmI"', true,
  viaClick('<button @click="whoAmI"></button>', { me: null, whoAmI() { this.me = this; } }, (m) => m.state.me === m.state));
probe('with parens calls with no args', '@click="inc()"', 0,
  viaClick('<button @click="inc()"></button>', { argc: -1, inc(...a) { this.argc = a.length; } }, (m) => m.state.argc));
probe('with $event argument', '@click="handle($event)"', 'click',
  viaClick('<button @click="handle($event)"></button>', { last: '', handle(e) { this.last = e.type; } }, (m) => m.state.last));
probe('with literal arguments', '@click="add(2, 3)"', 5,
  viaClick('<button @click="add(2, 3)"></button>', { sum: 0, add(a, b) { this.sum = a + b; } }, (m) => m.state.sum));
probe('with state argument', '@click="add(n, 1)"', 5,
  viaClick('<button @click="add(n, 1)"></button>', { n: 4, sum: 0, add(a, b) { this.sum = a + b; } }, (m) => m.state.sum));
probe('member call keeps this = object', '@click="user.greet()"', 'Ana',
  viaClick('<button @click="user.greet()"></button>', { user: { name: 'Ana', greet() { globalThis.__greeted = this && this.name; } } },
    () => globalThis.__greeted));
probe('member by name: who is this?', '@click="user.greet"', 'user',
  viaClick('<button @click="user.greet"></button>', { name: 'scope', user: { name: 'user', greet() { globalThis.__seen = this && this.name; } } },
    () => globalThis.__seen),
  'a member handler by name is called with this = scope data, not the object it was read from');
probe('computed member by name is called', '@click="handlers[\'a\']"', 1,
  viaClick('<button @click="handlers[\'a\']"></button>', { hits: 0, handlers: { a() { this.hits++; } } }, (m) => m.state.hits));
probe('real JS function via V.data root, called by name', '@click="save"', 1,
  viaClick('<button @click="save"></button>', { saved: 0, save() { this.saved++; } }, (m) => m.state.saved));
probe('function from an ancestor scope, by name', '@click="inc" inside nested v-data', 1,
  viaClick('<div v-data="{ x: 1 }"><button @click="inc"></button></div>', { n: 0, inc() { this.n++; } }, (m) => m.state.n),
  'this is the NEAREST scope data, so a real JS method using this.n writes to the wrong object');
probe('function from an ancestor scope, with parens', '@click="inc()" inside nested v-data', 1,
  viaClick('<div v-data="{ x: 1 }"><button @click="inc()"></button></div>', { n: 0, inc() { this.n++; } }, (m) => m.state.n));
probe('bare name that is a magic function', '@click="$log"', 'click', async () => {
  const m = mount('<button @click="$log"></button>', {});
  const orig = console.log;
  let logged = '';
  console.log = (_tag, e) => { logged = e && e.type; };
  try { click(m.q('button')); } finally { console.log = orig; }
  return logged;
});

section('v-data method shorthand');

probe('method writes sibling state by bare name', 'hi() { out = \'x\' }', 'x',
  viaClick('<div v-data="{ out: \'\', hi() { out = \'x\' } }"><button @click="hi()"></button><p>{ out }</p></div>', {}, (m) => m.q('p').textContent));
probe('method called by name', '@click="hi"', 'x',
  viaClick('<div v-data="{ out: \'\', hi() { out = \'x\' } }"><button @click="hi"></button><p>{ out }</p></div>', {}, (m) => m.q('p').textContent));
probe('method with parameter', 'add(t) { items.push(t) }', '2',
  viaClick('<div v-data="{ items: [\'a\'], add(t) { items.push(t) } }"><button @click="add(\'b\')"></button><p>{ items.length }</p></div>', {}, (m) => m.q('p').textContent));
probe('method receives the event by name', 'track(e) { last = e.type }', 'click',
  viaClick('<div v-data="{ last: \'\', track(e) { last = e.type } }"><button @click="track"></button><p>{ last }</p></div>', {}, (m) => m.q('p').textContent));
probe('method calling a sibling method', 'twice() { inc(); inc() }', '2',
  viaClick('<div v-data="{ n: 0, inc() { n++ }, twice() { inc(); inc() } }"><button @click="twice()"></button><p>{ n }</p></div>', {}, (m) => m.q('p').textContent));
probe('method returning a value', 'double() { return n * 2 }', '10',
  viaClick('<div v-data="{ n: 5, r: 0, double() { return n * 2 }, go() { r = double() } }"><button @click="go()"></button><p>{ r }</p></div>', {}, (m) => m.q('p').textContent));
probe('method using this.items (docs example)', 'add(t) { this.items.push(t) }', '2',
  viaClick('<div v-data="{ items: [\'a\'], add(t) { this.items.push(t) } }"><button @click="add(\'b\')"></button><p>{ items.length }</p></div>', {}, (m) => m.q('p').textContent),
  'docs/estado-e-stores.md:56 writes exactly this; `this` is not a name the interpreter knows');
probe('docs/en/state.md:75 double() { return this.n * 2 }', '{ double() }', '10', async () => {
  const m = mount('<div v-data="{ n: 5, double() { return this.n * 2 } }"><p>{ double() }</p></div>', {});
  return m.q('p').textContent;
}, 'documented example; `this` does not resolve inside the method body');
probe('docs/en/state.md:78 get count() { return this.items.length }', '{ count } after push', '2',
  viaClick('<div v-data="{ items: [1], get count() { return this.items.length } }"><button @click="items.push(2)"></button><p>{ count }</p></div>', {}, (m) => m.q('p').textContent),
  'documented example; same mechanism');
probe('method using this.n++ (Alpine habit)', 'inc() { this.n++ }', '1',
  viaClick('<div v-data="{ n: 0, inc() { this.n++ } }"><button @click="inc()"></button><p>{ n }</p></div>', {}, (m) => m.q('p').textContent),
  'every Alpine migration guide example writes this');
probe('method by name inside v-for row', '<li v-for ... @click="inc">', '1',
  viaClick('<div v-data="{ n: 0, items: [1, 2], inc() { n++ } }"><ul><li v-for="i in items" @click="inc"></li></ul><p>{ n }</p></div>', {},
    (m) => m.q('p').textContent, { sel: 'li' }),
  'this = the ROW scope data, so the method body cannot see its own siblings');
probe('method with parens inside v-for row', '<li v-for ... @click="inc()">', '1',
  viaClick('<div v-data="{ n: 0, items: [1, 2], inc() { n++ } }"><ul><li v-for="i in items" @click="inc()"></li></ul><p>{ n }</p></div>', {},
    (m) => m.q('p').textContent, { sel: 'li' }));
probe('method by name inside nested v-data', '<div v-data="{x:1}"><button @click="inc">', '1',
  viaClick('<div v-data="{ n: 0, inc() { n++ } }"><div v-data="{ x: 1 }"><button @click="inc"></button></div><p>{ n }</p></div>', {},
    (m) => m.q('p').textContent),
  'this = the INNER scope data, same mechanism as the v-for row');
probe('method by name, inner scope shadows a sibling', 'inner { n: 100 }, outer inc() { n++ }', '1 / 100',
  viaClick('<div v-data="{ n: 0, inc() { n++ } }"><div v-data="{ n: 100 }"><button @click="inc"></button><i>{ n }</i></div><p>{ n }</p></div>', {},
    (m) => `${m.q('p').textContent} / ${m.q('i').textContent}`),
  'the write lands on whichever scope the button sits in');
probe('$el inside a method called by name', 'hi() { tag = $el ? $el.tagName : \'null\' }', 'DIV',
  viaClick('<div v-data="{ tag: \'\', hi() { tag = $el ? $el.tagName : \'null\' } }"><button @click="hi"></button><p>{ tag }</p></div>', {}, (m) => m.q('p').textContent),
  'the method body runs in a scope layered on the PARENT of the v-data, whose element is not the v-data element');
probe('$refs inside a method', 'hi() { $refs.box.textContent = \'x\' }', 'x',
  viaClick('<div v-data="{ hi() { $refs.box.textContent = \'x\' } }"><i v-ref="box"></i><button @click="hi()"></button></div>', {}, (m) => m.q('i').textContent),
  'same scope layering: refs registered on the v-data scope are not in the chain the method sees');
probe('$store inside a method', 'hi() { $store.cart.n = 9 }', 9, async () => {
  store('cart', { n: 0 });
  const m = mount('<div v-data="{ hi() { $store.cart.n = 9 } }"><button @click="hi()"></button></div>', {});
  click(m.q('button'));
  return store('cart').n;
});
probe('arrow property closes over the outer scope', 'inc: () => n++', '1',
  viaClick('<div v-data="{ n: 0, inc: () => n++ }"><button @click="inc()"></button><p>{ n }</p></div>', {}, (m) => m.q('p').textContent),
  'documented: an arrow sees the scope where the object literal was written, which is OUTSIDE this v-data');

section('$event and the other magics');

probe('$event.target.value', '@input="name = $event.target.value"', 'Bia', async () => {
  const m = mount('<input @input="name = $event.target.value">', { name: '' });
  m.q('input').value = 'Bia';
  fire(m.q('input'), 'input');
  await settle();
  return m.state.name;
});
probe('$event.preventDefault() inline', '@click="$event.preventDefault()"', true, async () => {
  const m = mount('<a href="#x" @click="$event.preventDefault()">x</a>', {});
  return click(m.q('a')).defaultPrevented;
});
probe('$event.stopPropagation() inline', '@click="$event.stopPropagation()"', 0, async () => {
  const m = mount('<div @click="outer++"><button @click="$event.stopPropagation()"></button></div>', { outer: 0 });
  click(m.q('button'));
  return m.state.outer;
});
probe('$event.key', '@keydown="last = $event.key"', 'x', async () => {
  const m = mount('<input @keydown="last = $event.key">', { last: '' });
  key(m.q('input'), 'keydown', 'x');
  return m.state.last;
});
probe('$event.currentTarget === $el', '@click="same = $event.currentTarget === $el"', true,
  viaClick('<button @click="same = $event.currentTarget === $el"></button>', { same: false }, (m) => m.state.same));
probe('$el is the element with the handler', '@click="id = $el.dataset.id"', '42',
  viaClick('<div v-data="{ id: \'\' }"><button data-id="42" @click="id = $el.dataset.id"></button><p>{ id }</p></div>', {}, (m) => m.q('p').textContent));
probe('$el.classList.toggle', '@click="$el.classList.toggle(\'on\')"', true,
  viaClick('<button @click="$el.classList.toggle(\'on\')"></button>', {}, (m) => m.q('button').classList.contains('on')));
probe('$refs.input.focus()', '@click="$refs.name.focus()"', true,
  viaClick('<input v-ref="name"><button @click="$refs.name.focus()"></button>', {}, (m) => document.activeElement === m.q('input')));
probe('$refs write', '@click="$refs.box.textContent = \'hi\'"', 'hi',
  viaClick('<div v-ref="box"></div><button @click="$refs.box.textContent = \'hi\'"></button>', {}, (m) => m.q('div').textContent));
probe('$refs declared after the button', '<button @click="$refs.late...">...<i v-ref="late">', 'ok',
  viaClick('<button @click="$refs.late.textContent = \'ok\'"></button><i v-ref="late"></i>', {}, (m) => m.q('i').textContent));
probe('$store.x.n++', '@click="$store.cart.n++"', 1, async () => {
  store('cart', { n: 0, add(q) { this.n += q; } });
  const m = mount('<button @click="$store.cart.n++"></button>', {});
  click(m.q('button'));
  return store('cart').n;
});
probe('$store method keeps this', '@click="$store.cart.add(5)"', 6, async () => {
  const m = mount('<button @click="$store.cart.add(5)"></button>', {});
  click(m.q('button'));
  return store('cart').n;
});
probe('$store change updates the page', '{ $store.cart.n }', '7', async () => {
  const m = mount('<button @click="$store.cart.n++"></button><p>{ $store.cart.n }</p>', {});
  click(m.q('button'));
  await settle();
  return m.q('p').textContent;
});
probe('$data.count++ in a handler', '@click="$data.count++"', '1',
  viaClick('<div v-data="{ count: 0 }"><button @click="$data.count++"></button><p>{ count }</p></div>', {}, (m) => m.q('p').textContent),
  '$data resolves against the throwaway $event scope inside a handler');
probe('$data keys seen from a handler', '@click="keys = Object.keys($data)"', 'count,keys',
  viaClick('<div v-data="{ count: 0, keys: [] }"><button @click="keys = Object.keys($data)"></button><p>{ keys.join(\',\') }</p></div>', {}, (m) => m.q('p').textContent),
  'shows what $data really is inside a handler');
probe('$data in interpolation (control)', '{ Object.keys($data).join(",") }', 'count', async () => {
  const m = mount('<div v-data="{ count: 0 }"><p>{ Object.keys($data).join(",") }</p></div>', {});
  return m.q('p').textContent;
});
probe('$parent.n in a handler', '@click="seen = $parent.n"', '1',
  viaClick('<div v-data="{ n: 1 }"><div v-data="{ n: 2, seen: 0 }"><button @click="seen = $parent.n"></button><p>{ seen }</p></div></div>', {}, (m) => m.q('p').textContent),
  '$parent of the throwaway scope is the CURRENT v-data, not its parent');
probe('$parent.n in interpolation (control)', '{ $parent.n }', '1', async () => {
  const m = mount('<div v-data="{ n: 1 }"><div v-data="{ n: 2 }"><p>{ $parent.n }</p></div></div>', {});
  return m.q('p').textContent;
});
probe('$root.n++', '@click="$root.n++"', 1, async () => {
  rootScope.data.n = 0;
  const m = mount('<div v-data="{ x: 1 }"><button @click="$root.n++"></button></div>', {}, rootScope);
  click(m.q('button'));
  return rootScope.data.n;
});
probe('$dispatch heard on the v-data element (control)', '<div v-data @pick><button @click="$dispatch(\'pick\', ...)">', '7',
  viaClick('<div v-data="{ got: 0 }" @pick="got = $detail.id"><button @click="$dispatch(\'pick\', { id: 7 })"></button><p>{ got }</p></div>', {}, (m) => m.q('p').textContent));
probe('$dispatch heard by an ancestor below v-data', '<div v-data><section @pick><button @click="$dispatch(...)">', '7',
  viaClick('<div v-data="{ got: 0 }"><section @pick="got = $detail.id"><button @click="$dispatch(\'pick\', { id: 7 })"></button></section><p>{ got }</p></div>', {}, (m) => m.q('p').textContent),
  '$dispatch fires from scope.el (the v-data element), not from $el, so it never bubbles through <section>');
probe('$dispatch with no v-data ancestor', '<section @pick><button @click="$dispatch(...)">', 7,
  viaClick('<section @pick="got = $detail.id"><button @click="$dispatch(\'pick\', { id: 7 })"></button></section>', { got: 0 }, (m) => m.state.got),
  'the root scope has no element, so $dispatch fires on document and the section never hears it');
probe('$detail from a CustomEvent', '@saved="last = $detail.id"', 3, async () => {
  const m = mount('<div @saved="last = $detail.id"></div>', { last: 0 });
  custom(m.q('div'), 'saved', { id: 3 });
  return m.state.last;
});
probe('$rawEvent is the event', '@click="t = $rawEvent.type"', 'click',
  viaClick('<button @click="t = $rawEvent.type"></button>', { t: '' }, (m) => m.state.t));
probe('$nextTick inside a handler', '@click="n++; $nextTick(() => seen = $el.textContent)"', '1', async () => {
  const m = mount('<button @click="n++; $nextTick(() => seen = $el.textContent)">{ n }</button>', { n: 0, seen: '' });
  click(m.q('button'));
  await settle();
  await settle();
  return m.state.seen;
});
probe('console.log is reachable', '@click="console.log($event.type)"', 'click', async () => {
  const m = mount('<button @click="console.log($event.type)"></button>', {});
  const orig = console.log;
  let logged = '';
  console.log = (...a) => { logged = a.join(' '); };
  try { click(m.q('button')); } finally { console.log = orig; }
  return logged;
});
probe('$event inside an arrow inside the handler', '@click="list.forEach(x => types.push($event.type))"', 2,
  viaClick('<button @click="list.forEach(x => types.push($event.type))"></button>', { list: [1, 2], types: [] }, (m) => m.state.types.length));

section('several statements in one handler');

probe('semicolon separated', '@click="a++; b++"', '1,1',
  viaClick('<button @click="a++; b++"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('comma separated', '@click="a++, b++"', '1,1',
  viaClick('<button @click="a++, b++"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('trailing semicolon', '@click="a++; b++;"', '1,1',
  viaClick('<button @click="a++; b++;"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('newline separated', '@click="a++\\n b++"', '1,1',
  viaClick('<button @click="a++\n b++"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('no separator at all (quirk)', '@click="a++ b++"', '1,1',
  viaClick('<button @click="a++ b++"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`),
  'the top-level loop simply parses the next statement; JavaScript would reject this');
probe('docs example: push then reset', '@click="items.push(draft); draft = \'\'"', '2/',
  viaClick('<button @click="items.push(draft); draft = \'\'"></button>', { items: ['a'], draft: 'b' }, (m) => `${m.state.items.length}/${m.state.draft}`));
probe('parenthesised comma sequence', '@click="(a++, b++)"', '1,1',
  viaClick('<button @click="(a++, b++)"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`),
  'the comma is a statement separator only at the top level and in blocks, never an operator');
probe('if / else with semicolon before else', '@click="if (ok) a++; else b++"', '1,0',
  viaClick('<button @click="if (ok) a++; else b++"></button>', { ok: true, a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`),
  'the `;` ends the if statement; `else` is then read as an identifier and `b++` runs unconditionally');
probe('if / else with newline before else', '@click="if (ok) a++\\nelse b++"', '1,0',
  viaClick('<button @click="if (ok) a++\nelse b++"></button>', { ok: true, a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('if / else on one line, no semicolon', '@click="if (ok) a++ else b++"', '1,0',
  viaClick('<button @click="if (ok) a++ else b++"></button>', { ok: true, a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`));
probe('if / else with braces', '@click="if (n > 2) { n = 0 } else { n++ }"', 1,
  viaClick('<button @click="if (n > 2) { n = 0 } else { n++ }"></button>', { n: 0 }, (m) => m.state.n));
probe('if without else, false', '@click="if (n > 2) n = 0"', 0,
  viaClick('<button @click="if (n > 2) n = 0"></button>', { n: 0 }, (m) => m.state.n));
probe('statement after if', '@click="n++; if (n === 3) done = true"', true,
  viaClick('<button @click="n++; if (n === 3) done = true"></button>', { n: 0, done: false }, (m) => m.state.done, { times: 3 }));
probe('arrow with block body in handler', '@click="list.forEach(x => { total += x })"', 6,
  viaClick('<button @click="list.forEach(x => { total += x })"></button>', { list: [1, 2, 3], total: 0 }, (m) => m.state.total));
probe('statement inside if reads $event', '@click="if ($event.shiftKey) n += 10; else n++"', 10, async () => {
  const m = mount('<button @click="if ($event.shiftKey) n += 10; else n++"></button>', { n: 0 });
  click(m.q('button'), { shiftKey: true });
  return m.state.n;
});

section('expression that evaluates to a function');

probe('ternary picking a function is not called', '@click="big ? up : down"', 1,
  viaClick('<button @click="big ? up : down"></button>', { big: true, n: 0, up() { this.n++; }, down() { this.n--; } }, (m) => m.state.n),
  'only id and member nodes are auto-called; a cond node evaluating to a function is dropped');
probe('inline arrow is not called', '@click="() => n++"', 1,
  viaClick('<button @click="() => n++"></button>', { n: 0 }, (m) => m.state.n),
  'Vue calls an inline arrow with the event; here it is created and dropped');
probe('inline arrow with $event is not called', '@click="e => last = e.type"', 'click',
  viaClick('<button @click="e => last = e.type"></button>', { last: '' }, (m) => m.state.last),
  'same as above');
probe('function keyword is not called', '@click="function () { n++ }"', 1,
  viaClick('<button @click="function () { n++ }"></button>', { n: 0 }, (m) => m.state.n),
  'same as above');
probe('call returning a function is not called again (correct)', '@click="make()"', 0,
  viaClick('<button @click="make()"></button>', { n: 0, make() { return () => { this.n++; }; } }, (m) => m.state.n));
probe('logical || picking a function is not called', '@click="custom || fallback"', 1,
  viaClick('<button @click="custom || fallback"></button>', { custom: null, n: 0, fallback() { this.n++; } }, (m) => m.state.n),
  'same mechanism as the ternary');
probe('optional call', '@click="maybe?.()"', 0,
  viaClick('<button @click="maybe?.()"></button>', { maybe: null }, () => errors.length));

section('async work');

probe('promise then arrow writes state', '@click="load().then(r => data = r)"', 'loaded', async () => {
  const m = mount('<button @click="load().then(r => data = r)"></button>', { data: '', load: () => Promise.resolve('loaded') });
  click(m.q('button'));
  await sleep(5);
  return m.state.data;
});
probe('async method by name, this = data', '@click="fetchIt"', 1, async () => {
  const m = mount('<button @click="fetchIt"></button>', { v: 0, async fetchIt() { await sleep(1); this.v = 1; } });
  click(m.q('button'));
  await sleep(10);
  return m.state.v;
});
probe('async rejection reaches V.onError', '@click="failing()"', 1, async () => {
  const m = mount('<button @click="failing()"></button>', { failing: async () => { throw new Error('async boom'); } });
  click(m.q('button'));
  await sleep(10);
  return errors.length;
}, 'the returned promise is ignored: the rejection is unhandled and never reaches V.onError');
probe('async rejection is not an unhandled rejection', '@click="failing()"', 0, async () => {
  const m = mount('<button @click="failing()"></button>', { failing: async () => { throw new Error('async boom 2'); } });
  click(m.q('button'));
  await sleep(10);
  return unhandled.length;
}, 'same case, seen from the process');
probe('await is not a keyword: `await load()` still calls load', '@click="await load()"', 1,
  viaClick('<button @click="await load()"></button>', { calls: 0, load() { this.calls++; } }, (m) => m.state.calls),
  'await is read as an identifier; the call happens but nothing is awaited');
probe('`x = await load()` assigns undefined, silently', '@click="result = await load()"', 'error reported', async () => {
  const m = mount('<button @click="result = await load()"></button>', { result: 'untouched', load: () => Promise.resolve('v') });
  click(m.q('button'));
  await sleep(5);
  return errors.length ? 'error reported' : `silent, result=${String(m.state.result)}`;
}, 'docs say await is unsupported; refusing silently and assigning undefined is the failure mode');
probe('async arrow in handler', '@click="(async () => { n = 1 })()"', 1,
  viaClick('<button @click="(async () => { n = 1 })()"></button>', { n: 0 }, (m) => m.state.n),
  'parser: async arrows are not implemented');

section('a handler that throws');

probe('error routed to V.onError with context', '@click="boom()"', 'event click ("boom()") / kaboom',
  viaClick('<button @click="boom()"></button>', { boom() { throw new Error('kaboom'); } }, () => `${errors[0].ctx} / ${errors[0].err.message}`));
probe('page still alive after a throw', '@click="boom()" then another click', 2, async () => {
  const m = mount('<button @click="boom()"></button><i @click="n++"></i>', { n: 0, boom() { throw new Error('x'); } });
  click(m.q('button'));
  click(m.q('i'));
  click(m.q('button'));
  click(m.q('i'));
  return m.state.n;
});
probe('statements before the throw are kept', '@click="n++; boom(); n++"', 1,
  viaClick('<button @click="n++; boom(); n++"></button>', { n: 0, boom() { throw new Error('x'); } }, (m) => m.state.n));
probe('without V.onError the console gets it', '@click="boom()"', '[Voodoo] error in event click ("boom()"):', async () => {
  V.default.onError(null);
  const orig = console.error;
  let printed = '';
  console.error = (...a) => { printed = String(a[0]); };
  try {
    const m = mount('<button @click="boom()"></button>', { boom() { throw new Error('x'); } });
    click(m.q('button'));
  } finally {
    console.error = orig;
    V.default.onError((err, ctx) => errors.push({ err, ctx }));
  }
  return printed;
});
probe('syntax error is silent at mount time', '@click="count +"', 'reported at mount', async () => {
  config.devtools = true;
  const origWarn = console.warn;
  let warned = 0;
  console.warn = () => { warned++; };
  try {
    mount('<button @click="count +"></button>', { count: 0 });
  } finally {
    console.warn = origWarn;
    config.devtools = false;
  }
  return errors.length || warned ? 'reported at mount' : 'silent until the first click';
}, 'v-text with the same typo is reported at mount; a handler is parsed for the first time inside the click');
probe('same typo in v-text is reported at mount (control)', 'v-text="count +"', 'reported at mount', async () => {
  config.devtools = true;
  const origWarn = console.warn;
  let warned = 0;
  console.warn = () => { warned++; };
  try {
    mount('<p v-text="count +"></p>', { count: 0 });
  } finally {
    console.warn = origWarn;
    config.devtools = false;
  }
  return errors.length || warned ? 'reported at mount' : 'silent';
});
probe('same typo in an interpolation is left as literal text', '{ count + }', '{ count + }', async () => {
  const m = mount('<p>{ count + }</p>', { count: 0 });
  return m.q('p').textContent;
});
probe('syntax error surfaces on click', '@click="count +"', 'VoodooSyntaxError',
  viaClick('<button @click="count +"></button>', { count: 0 }, () => errors[0] && errors[0].err.name));
probe('read from undefined', '@click="obj.missing.x"', 'Could not read "x" from undefined',
  viaClick('<button @click="obj.missing.x"></button>', { obj: {} }, () => errors[0].err.message.split('\n')[0]));
probe('call of unknown name', '@click="missing()"', true,
  viaClick('<button @click="missing()"></button>', {}, () => /was not found/.test(errors[0].err.message)));
probe('bare unknown name warns in dev mode', '@click="sabe" (typo of save)', 'warns', async () => {
  config.devtools = true;
  const origWarn = console.warn;
  let warned = 0;
  console.warn = () => { warned++; };
  try {
    const m = mount('<button @click="sabe"></button>', { save() {} });
    click(m.q('button'));
  } finally {
    console.warn = origWarn;
    config.devtools = false;
  }
  return warned || errors.length ? 'warns' : 'silent';
}, 'a misspelled handler name evaluates to undefined and nothing happens anywhere');
probe('constructor is refused', '@click="constructor"', true,
  viaClick('<button @click="constructor"></button>', {}, () => /blocked/.test(errors[0].err.message)));
probe('$el.constructor is refused', '@click="$el.constructor"', true,
  viaClick('<button @click="$el.constructor"></button>', {}, () => /blocked/.test(errors[0].err.message)));
probe('__proto__ write is refused', '@click="obj.__proto__.x = 1"', true,
  viaClick('<button @click="obj.__proto__.x = 1"></button>', { obj: {} }, () => /blocked/.test(errors[0].err.message)));
probe('delete is not a keyword (silent no-op)', '@click="delete obj.a"', 'error reported',
  viaClick('<button @click="delete obj.a"></button>', { obj: { a: 1 } }, (m) => (errors.length ? 'error reported' : `silent, a=${m.state.obj.a}`)),
  'delete is read as an identifier, then obj.a is read and thrown away');

section('spellings: @, v-on:, data-v-on:, v-click, data-v-click');

probe('v-on:click', 'v-on:click="n++"', 1,
  viaClick('<button v-on:click="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('data-v-on:click', 'data-v-on:click="n++"', 1,
  viaClick('<button data-v-on:click="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('v-click shortcut', 'v-click="n++"', 1,
  viaClick('<button v-click="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('data-v-click shortcut', 'data-v-click="n++"', 1,
  viaClick('<button data-v-click="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('data-v-on:click.prevent', 'data-v-on:click.prevent="n++"', true, async () => {
  const m = mount('<a href="#" data-v-on:click.prevent="n++">x</a>', { n: 0 });
  return click(m.q('a')).defaultPrevented;
});
probe('v-click.prevent', 'v-click.prevent="n++"', true, async () => {
  const m = mount('<a href="#" v-click.prevent="n++">x</a>', { n: 0 });
  return click(m.q('a')).defaultPrevented;
});
probe('@click and @click.once on one element', '@click="a++" @click.once="b++"', '2,1',
  viaClick('<button @click="a++" @click.once="b++"></button>', { a: 0, b: 0 }, (m) => `${m.state.a},${m.state.b}`, { times: 2 }));
probe('custom event with colon', '@order:created="n = $detail"', 5, async () => {
  const m = mount('<div @order:created="n = $detail"></div>', { n: 0 });
  custom(m.q('div'), 'order:created', 5);
  return m.state.n;
});
probe('kebab custom event', '@save-done="n++"', 1, async () => {
  const m = mount('<div @save-done="n++"></div>', { n: 0 });
  custom(m.q('div'), 'save-done');
  return m.state.n;
});
probe('camelCase custom event (HTML lowercases it)', '@saveDone="n++" with dispatch "saveDone"', 1, async () => {
  const m = mount('<div @saveDone="n++"></div>', { n: 0 });
  custom(m.q('div'), 'saveDone');
  return m.state.n;
}, 'HTML attribute names are case-insensitive; Vue maps this, Voodoo listens for "savedone"');
probe('alias @tap -> click', '@tap="n++"', 1,
  viaClick('<button @tap="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('alias @hover -> mouseenter', '@hover="n++"', 1, async () => {
  const m = mount('<div @hover="n++"></div>', { n: 0 });
  fire(m.q('div'), 'mouseenter');
  return m.state.n;
});
probe('alias @type -> input', '@type="n++"', 1, async () => {
  const m = mount('<input @type="n++">', { n: 0 });
  fire(m.q('input'), 'input');
  return m.state.n;
});
probe('alias @submitform -> submit', '@submitform.prevent="n++"', '1/true', async () => {
  const m = mount('<form @submitform.prevent="n++"></form>', { n: 0 });
  const e = fire(m.q('form'), 'submit');
  return `${m.state.n}/${e.defaultPrevented}`;
});
probe('alias @enterkey fires only for Enter', '@enterkey="n++" with key "a"', 0, async () => {
  const m = mount('<input @enterkey="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'a');
  return m.state.n;
}, 'the alias maps to keydown with no key filter, so it fires for every key');
probe('alias @enterkey fires for Enter', '@enterkey="n++" with key "Enter"', 1, async () => {
  const m = mount('<input @enterkey="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'Enter');
  return m.state.n;
});
probe('v-on with object syntax', 'v-on="{ click: inc }"', 1,
  viaClick('<button v-on="{ click: inc }"></button>', { n: 0, inc() { this.n++; } }, (m) => m.state.n),
  'Vue object syntax; here the directive returns early with no arg and says nothing');

section('modifiers: event control');

probe('.prevent', '@click.prevent="n++"', true, async () => {
  const m = mount('<a href="#" @click.prevent="n++">x</a>', { n: 0 });
  return click(m.q('a')).defaultPrevented;
});
probe('.prevent with no expression', '@click.prevent', true, async () => {
  const m = mount('<a href="#" @click.prevent>x</a>', {});
  return click(m.q('a')).defaultPrevented;
});
probe('.stop', '@click.stop="n++"', '1,0', async () => {
  const m = mount('<div @click="outer++"><button @click.stop="n++"></button></div>', { n: 0, outer: 0 });
  click(m.q('button'));
  return `${m.state.n},${m.state.outer}`;
});
probe('.self ignores children', '@click.self="n++"', '0 then 1', async () => {
  const m = mount('<div class="overlay" @click.self="n++"><button></button></div>', { n: 0 });
  click(m.q('button'));
  const first = m.state.n;
  click(m.q('div'));
  return `${first} then ${m.state.n}`;
});
probe('.once', '@click.once="n++"', 1,
  viaClick('<button @click.once="n++"></button>', { n: 0 }, (m) => m.state.n, { times: 3 }));
probe('.capture runs before the child listener', '@click.capture="order.push(\'parent\')"', 'parent,child', async () => {
  const m = mount('<div @click.capture="order.push(\'parent\')"><button @click="order.push(\'child\')"></button></div>', { order: [] });
  click(m.q('button'));
  return m.state.order.join(',');
});
probe('.passive listener cannot prevent', '@click.passive.prevent="n++"', '1/false', async () => {
  const m = mount('<a href="#" @click.passive.prevent="n++">x</a>', { n: 0 });
  const e = click(m.q('a'));
  return `${m.state.n}/${e.defaultPrevented}`;
});
probe('.submit.prevent.stop on a form', '@submit.prevent.stop="n++"', '1/true/0', async () => {
  const m = mount('<div @submit="outer++"><form @submit.prevent.stop="n++"></form></div>', { n: 0, outer: 0 });
  const e = fire(m.q('form'), 'submit');
  return `${m.state.n}/${e.defaultPrevented}/${m.state.outer}`;
});
probe('.once.prevent', '@click.once.prevent="n++"', 'true/1', async () => {
  const m = mount('<a href="#" @click.once.prevent="n++">x</a>', { n: 0 });
  const e = click(m.q('a'));
  click(m.q('a'));
  return `${e.defaultPrevented}/${m.state.n}`;
});
probe('.self.stop', '@click.self.stop="n++"', '1,0', async () => {
  const m = mount('<div @click="outer++"><div class="x" @click.self.stop="n++"></div></div>', { n: 0, outer: 0 });
  click(m.q('.x'));
  return `${m.state.n},${m.state.outer}`;
});
probe('.prevent.debounce prevents immediately', '@click.prevent.debounce="n++"', true, async () => {
  const m = mount('<a href="#" @click.prevent.debounce="n++">x</a>', { n: 0 });
  return click(m.q('a')).defaultPrevented;
}, 'preventDefault runs inside the debounced function, 250ms after the browser already followed the link');
probe('.stop.debounce stops immediately', '@click.stop.debounce="n++"', 0, async () => {
  const m = mount('<div @click="outer++"><button @click.stop.debounce="n++"></button></div>', { n: 0, outer: 0 });
  click(m.q('button'));
  return m.state.outer;
}, 'same mechanism as .prevent.debounce');

section('modifiers: where to listen');

probe('.window', '@resize.window="n++"', 1, async () => {
  const m = mount('<div @resize.window="n++"></div>', { n: 0 });
  win.dispatchEvent(new win.Event('resize'));
  return m.state.n;
});
probe('.document', '@click.document="n++"', 1, async () => {
  const m = mount('<div @click.document="n++"></div>', { n: 0 });
  click(document.body);
  return m.state.n;
});
probe('.window.once', '@keydown.window.once="n++"', 1, async () => {
  const m = mount('<div @keydown.window.once="n++"></div>', { n: 0 });
  key(win.document.body, 'keydown', 'a');
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a' }));
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a' }));
  return m.state.n;
});
probe('.outside fires for clicks elsewhere', '@click.outside="n++"', 1, async () => {
  const m = mount('<div class="menu" @click.outside="n++"><button></button></div><i></i>', { n: 0 });
  click(m.q('i'));
  return m.state.n;
});
probe('.outside ignores clicks inside', '@click.outside="n++"', 0, async () => {
  const m = mount('<div class="menu" @click.outside="n++"><button></button></div>', { n: 0 });
  click(m.q('button'));
  click(m.q('.menu'));
  return m.state.n;
});
probe('@outside synthetic event', '@outside="n++"', '1 then 1', async () => {
  const m = mount('<div class="menu" @outside="n++"><button></button></div><i></i>', { n: 0 });
  click(m.q('i'));
  const first = m.state.n;
  click(m.q('button'));
  return `${first} then ${m.state.n}`;
});
probe('.scroll.window.passive mounts', '@scroll.window.passive="n++"', 1, async () => {
  const m = mount('<div @scroll.window.passive="n++"></div>', { n: 0 });
  win.dispatchEvent(new win.Event('scroll'));
  return m.state.n;
});
probe('docs example .keydown.escape.window', '@keydown.escape.window="n++"', '0 then 1', async () => {
  const m = mount('<div @keydown.escape.window="n++"></div>', { n: 0 });
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a' }));
  const first = m.state.n;
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
  return `${first} then ${m.state.n}`;
});

section('modifiers: keys');

const keyCase = (mod, hitKey, missKey, init = {}) => async () => {
  const m = mount(`<input @keydown.${mod}="n++">`, { n: 0 });
  if (missKey !== null) key(m.q('input'), 'keydown', missKey, init);
  const miss = m.state.n;
  key(m.q('input'), 'keydown', hitKey, init);
  return `${miss}/${m.state.n}`;
};
probe('.enter', '@keydown.enter', '0/1', keyCase('enter', 'Enter', 'a'));
probe('.esc', '@keydown.esc', '0/1', keyCase('esc', 'Escape', 'a'));
probe('.escape', '@keydown.escape', '0/1', keyCase('escape', 'Escape', 'a'));
probe('.space', '@keydown.space', '0/1', keyCase('space', ' ', 'a'));
probe('.tab', '@keydown.tab', '0/1', keyCase('tab', 'Tab', 'a'));
probe('.delete matches Backspace too', '@keydown.delete', '0/1', keyCase('delete', 'Backspace', 'a'));
probe('.backspace', '@keydown.backspace', '0/1', keyCase('backspace', 'Backspace', 'Delete'));
probe('.up', '@keydown.up', '0/1', keyCase('up', 'ArrowUp', 'ArrowDown'));
probe('.down', '@keydown.down', '0/1', keyCase('down', 'ArrowDown', 'ArrowUp'));
probe('.left', '@keydown.left', '0/1', keyCase('left', 'ArrowLeft', 'ArrowRight'));
probe('.right', '@keydown.right', '0/1', keyCase('right', 'ArrowRight', 'ArrowLeft'));
probe('.a single letter', '@keydown.a', '0/1', keyCase('a', 'a', 'b'));
probe('.a also matches capital A', '@keydown.a with key "A"', '0/1', keyCase('a', 'A', 'b'));
probe('.1 digit', '@keydown.1', '0/1', keyCase('1', '1', '2'));
probe('.enter.esc either key', '@keydown.enter.esc', '1/2', keyCase('enter.esc', 'Escape', 'Enter'));
probe('.ctrl.enter needs ctrl', '@keydown.ctrl.enter', '0/1', async () => {
  const m = mount('<input @keydown.ctrl.enter="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'Enter');
  const miss = m.state.n;
  key(m.q('input'), 'keydown', 'Enter', { ctrlKey: true });
  return `${miss}/${m.state.n}`;
});
probe('.shift.tab', '@keydown.shift.tab', '0/1', async () => {
  const m = mount('<input @keydown.shift.tab="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'Tab');
  const miss = m.state.n;
  key(m.q('input'), 'keydown', 'Tab', { shiftKey: true });
  return `${miss}/${m.state.n}`;
});
probe('.alt.s', '@keydown.alt.s', '0/1', async () => {
  const m = mount('<input @keydown.alt.s="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 's');
  const miss = m.state.n;
  key(m.q('input'), 'keydown', 's', { altKey: true });
  return `${miss}/${m.state.n}`;
});
probe('docs example .meta.k.window.prevent', '@keydown.meta.k.window.prevent="n++"', '0/1/true', async () => {
  const m = mount('<div @keydown.meta.k.window.prevent="n++"></div>', { n: 0 });
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'k', cancelable: true }));
  const miss = m.state.n;
  const e = new win.KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true });
  win.dispatchEvent(e);
  return `${miss}/${m.state.n}/${e.defaultPrevented}`;
});
probe('.ctrl.shift.z', '@keydown.ctrl.shift.z', '0/1', async () => {
  const m = mount('<input @keydown.ctrl.shift.z="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'z', { ctrlKey: true });
  const miss = m.state.n;
  key(m.q('input'), 'keydown', 'z', { ctrlKey: true, shiftKey: true });
  return `${miss}/${m.state.n}`;
});
probe('.home (unknown key name) must not match every key', '@keydown.home with key "a"', '0/1', keyCase('home', 'Home', 'a'),
  'a key modifier the table does not know is silently dropped, so the handler fires for every key');
probe('.arrow-up (Vue spelling)', '@keydown.arrow-up with key "a"', '0/1', keyCase('arrow-up', 'ArrowUp', 'a'),
  'same: unknown modifier becomes a wildcard');
probe('.f2 function key', '@keydown.f2 with key "a"', '0/1', keyCase('f2', 'F2', 'a'),
  'same: unknown modifier becomes a wildcard');
probe('.page-down', '@keydown.page-down with key "a"', '0/1', keyCase('page-down', 'PageDown', 'a'),
  'same: unknown modifier becomes a wildcard');
probe('.cmd (Alpine spelling) must not become a wildcard', '@keydown.cmd.k with plain "k"', '0/1', async () => {
  const m = mount('<input @keydown.cmd.k="n++">', { n: 0 });
  key(m.q('input'), 'keydown', 'k');
  const miss = m.state.n;
  key(m.q('input'), 'keydown', 'k', { metaKey: true });
  return `${miss}/${m.state.n}`;
}, 'docs say .cmd is not supported; silently ignoring it means the shortcut fires on a plain k');
probe('.click.ctrl needs ctrlKey on the mouse event', '@click.ctrl="n++"', '0/1', async () => {
  const m = mount('<button @click.ctrl="n++"></button>', { n: 0 });
  click(m.q('button'));
  const miss = m.state.n;
  click(m.q('button'), { ctrlKey: true });
  return `${miss}/${m.state.n}`;
}, 'system modifiers are only checked when the event is a KeyboardEvent; Vue checks them on mouse events too');
probe('.click.shift for multi-select', '@click.shift="n++"', '0/1', async () => {
  const m = mount('<button @click.shift="n++"></button>', { n: 0 });
  click(m.q('button'));
  const miss = m.state.n;
  click(m.q('button'), { shiftKey: true });
  return `${miss}/${m.state.n}`;
}, 'same mechanism as .click.ctrl');
probe('.enter.prevent.stop', '@keydown.enter.prevent.stop="n++"', '1/true/0', async () => {
  const m = mount('<div @keydown="outer++"><input @keydown.enter.prevent.stop="n++"></div>', { n: 0, outer: 0 });
  const e = key(m.q('input'), 'keydown', 'Enter');
  return `${m.state.n}/${e.defaultPrevented}/${m.state.outer}`;
});
probe('key modifier on a mouse event is ignored', '@click.enter="n++"', 1,
  viaClick('<button @click.enter="n++"></button>', { n: 0 }, (m) => m.state.n));
probe('.keyup.enter (docs example)', '@keyup.enter="n++"', '0/1', async () => {
  const m = mount('<input @keyup.enter="n++">', { n: 0 });
  key(m.q('input'), 'keyup', 'a');
  const miss = m.state.n;
  key(m.q('input'), 'keyup', 'Enter');
  return `${miss}/${m.state.n}`;
});

section('modifiers: timing');

probe('.debounce waits 250ms', '@input.debounce="n++"', '0/0/1', async () => {
  const m = mount('<input @input.debounce="n++">', { n: 0 });
  fire(m.q('input'), 'input');
  fire(m.q('input'), 'input');
  const now = m.state.n;
  await sleep(120);
  const mid = m.state.n;
  await sleep(200);
  return `${now}/${mid}/${m.state.n}`;
});
probe('.debounce.500ms is documented as fixed 250ms', '@input.debounce.500ms="n++"', '0/1', async () => {
  const m = mount('<input @input.debounce.500ms="n++">', { n: 0 });
  fire(m.q('input'), 'input');
  const now = m.state.n;
  await sleep(320);
  return `${now}/${m.state.n}`;
}, 'the duration suffix is accepted by @hold but ignored here; docs say to debounce in the function');
probe('.throttle leading call', '@click.throttle="n++"', 1, async () => {
  const m = mount('<button @click.throttle="n++"></button>', { n: 0 });
  click(m.q('button'));
  click(m.q('button'));
  click(m.q('button'));
  return m.state.n;
});
probe('.throttle trailing call', '@click.throttle="n++" after 300ms', 2, async () => {
  const m = mount('<button @click.throttle="n++"></button>', { n: 0 });
  click(m.q('button'));
  click(m.q('button'));
  await sleep(320);
  return m.state.n;
});
probe('@hold.100ms fires after holding', '@hold.100ms="n++"', '0/1', async () => {
  const m = mount('<button @hold.100ms="n++"></button>', { n: 0 });
  fire(m.q('button'), 'pointerdown');
  const now = m.state.n;
  await sleep(160);
  return `${now}/${m.state.n}`;
});
probe('@hold released early does not fire', '@hold.100ms="n++"', 0, async () => {
  const m = mount('<button @hold.100ms="n++"></button>', { n: 0 });
  fire(m.q('button'), 'pointerdown');
  await sleep(30);
  fire(m.q('button'), 'pointerup');
  await sleep(150);
  return m.state.n;
});

section('inside v-for');

probe('argument from the row', '@click="remove(item.id)"', 2,
  viaClick('<ul><li v-for="item in items" @click="remove(item.id)"></li></ul>',
    { items: [{ id: 1 }, { id: 2 }, { id: 3 }], removed: 0, remove(id) { this.removed = id; } },
    (m) => m.state.removed, { sel: 'li:nth-child(2)' }));
probe('assign the row object', '@click="selected = item"', true,
  viaClick('<ul><li v-for="item in items" @click="selected = item"></li></ul>',
    { items: [{ id: 1 }, { id: 2 }], selected: null },
    (m) => m.state.selected === m.state.items[1], { sel: 'li:nth-child(2)' }));
probe('mutate the row object', '@click="item.done = !item.done"', 'true',
  viaClick('<ul><li v-for="item in items" @click="item.done = !item.done">{ item.done }</li></ul>',
    { items: [{ done: false }] },
    (m) => m.q('li').textContent, { sel: 'li' }));
probe('index alias', '@click="items.splice(index, 1)"', 'a,c',
  viaClick('<ul><li v-for="(item, index) in items" @click="items.splice(index, 1)"></li></ul>',
    { items: ['a', 'b', 'c'] },
    (m) => m.state.items.join(','), { sel: 'li:nth-child(2)' }));
probe('outer counter from a row', '@click="count++"', 1,
  viaClick('<ul><li v-for="item in items" @click="count++"></li></ul>', { items: [1, 2], count: 0 }, (m) => m.state.count, { sel: 'li' }));
probe('row keeps the right item after a removal', 'remove first, click new first', 'b removed', async () => {
  const m = mount('<ul><li v-for="item in items" :key="item" @click="last = item; items = items.filter(i => i !== item)"></li></ul>', { items: ['a', 'b', 'c'], last: '' });
  click(m.q('li'));
  await settle();
  click(m.q('li'));
  await settle();
  return `${m.state.last} removed`;
});
probe('reused row sees the updated item', 'reorder then click', 'c', async () => {
  const m = mount('<ul><li v-for="item in items" @click="last = item"></li></ul>', { items: ['a', 'b', 'c'], last: '' });
  m.state.items = ['c', 'b', 'a'];
  await settle();
  click(m.q('li'));
  await settle();
  return m.state.last;
});
probe('nested v-for arguments', '@click="pick(row, cell)"', '2:y',
  viaClick('<div v-for="row in rows"><span v-for="cell in row.cells" @click="pick(row.id, cell)"></span></div>',
    { rows: [{ id: 1, cells: ['x'] }, { id: 2, cells: ['x', 'y'] }], picked: '', pick(r, c) { this.picked = `${r}:${c}`; } },
    (m) => m.state.picked, { sel: 'div:nth-of-type(2) span:nth-child(2)' }));
probe('$event inside a row', '@click="last = item + $event.type"', 'bclick',
  viaClick('<ul><li v-for="item in items" @click="last = item + $event.type"></li></ul>', { items: ['a', 'b'], last: '' }, (m) => m.state.last, { sel: 'li:nth-child(2)' }));
probe('real JS method by name inside a row', '@click="remove" (this = ?)', 1,
  viaClick('<ul><li v-for="item in items" @click="remove"></li></ul>',
    { items: [1, 2], removed: 0, remove() { this.removed = 1; } },
    (m) => m.state.removed, { sel: 'li' }),
  'this is the row scope data ({ item }), so this.removed is written on the row, not the state');

section('cleanup when the element leaves');

probe('.window listener gone after v-if', '@click.window inside v-if', '1 then 1', async () => {
  const m = mount('<div v-if="show"><button @click.window="n++"></button></div>', { show: true, n: 0 });
  win.dispatchEvent(new win.Event('click'));
  const first = m.state.n;
  m.state.show = false;
  await settle();
  win.dispatchEvent(new win.Event('click'));
  return `${first} then ${m.state.n}`;
});
probe('.outside listener gone after v-if', '@click.outside inside v-if', '1 then 1', async () => {
  const m = mount('<div v-if="show"><div class="menu" @click.outside="n++"></div></div><i></i>', { show: true, n: 0 });
  click(m.q('i'));
  const first = m.state.n;
  m.state.show = false;
  await settle();
  click(m.q('i'));
  return `${first} then ${m.state.n}`;
});
probe('@outside synthetic gone after v-if', '@outside inside v-if', '1 then 1', async () => {
  const m = mount('<div v-if="show"><div class="menu" @outside="n++"></div></div><i></i>', { show: true, n: 0 });
  click(m.q('i'));
  const first = m.state.n;
  m.state.show = false;
  await settle();
  click(m.q('i'));
  return `${first} then ${m.state.n}`;
});
probe('.document listener gone after v-if', '@keydown.document inside v-if', '1 then 1', async () => {
  const m = mount('<div v-if="show"><i @keydown.document="n++"></i></div>', { show: true, n: 0 });
  key(document.body, 'keydown', 'a');
  const first = m.state.n;
  m.state.show = false;
  await settle();
  key(document.body, 'keydown', 'a');
  return `${first} then ${m.state.n}`;
});
probe('v-for rows release their window listeners', '@keydown.window in 3 rows, then 1 row', '3 then 4', async () => {
  const m = mount('<ul><li v-for="i in items" @keydown.window="n++"></li></ul>', { items: [1, 2, 3], n: 0 });
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a' }));
  const first = m.state.n;
  m.state.items = [1];
  await settle();
  win.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a' }));
  return `${first} then ${m.state.n}`;
});
probe('el.remove() is noticed by the observer', 'btn.remove(); window click', '1 then 1', async () => {
  const m = mount('<button @click.window="n++"></button>', { n: 0 });
  win.dispatchEvent(new win.Event('click'));
  const first = m.state.n;
  m.q('button').remove();
  await sleep(5);
  win.dispatchEvent(new win.Event('click'));
  return `${first} then ${m.state.n}`;
});
probe('destroy(el) removes the listener', 'destroy(root); window click', '1 then 1', async () => {
  const m = mount('<button @click.window="n++"></button>', { n: 0 });
  win.dispatchEvent(new win.Event('click'));
  const first = m.state.n;
  destroy(m.root);
  win.dispatchEvent(new win.Event('click'));
  return `${first} then ${m.state.n}`;
});
probe('element listener gone after destroy', 'destroy(root); click detached button', '1 then 1', async () => {
  const m = mount('<button @click="n++"></button>', { n: 0 });
  const btn = m.q('button');
  click(btn);
  const first = m.state.n;
  destroy(m.root);
  m.root.remove();
  click(btn);
  return `${first} then ${m.state.n}`;
});
probe('@hold timers released on removal', 'pointerdown, remove, wait', 0, async () => {
  const m = mount('<div v-if="show"><button @hold.100ms="n++"></button></div>', { show: true, n: 0 });
  fire(m.q('button'), 'pointerdown');
  m.state.show = false;
  await settle();
  await sleep(160);
  return m.state.n;
});

section('parser-level: the multi-statement story (no DOM)');

probe('top-level comma is a separator', 'n++, n', 6, () => pure('n++, n', { n: 5 }));
probe('top-level semicolon is a separator', 'n++; n', 6, () => pure('n++; n', { n: 5 }));
probe('block-body arrow accepts statements', '(() => { n++; n++ })(); n', 7, () => pure('(() => { n++; n++ })(); n', { n: 5 }));
probe('parenthesised comma', '(n++, n)', 6, () => pure('(n++, n)', { n: 5 }),
  'GAP: the comma operator does not exist inside parentheses');
probe('comma inside call arguments is still an argument separator', 'Math.max(1, 2)', 2, () => pure('Math.max(1, 2)'));
probe('new is an identifier, so Date is called as a function', 'new Date(0)', 'a Date', () => (pure('new Date(0)') instanceof Date ? 'a Date' : `a ${typeof pure('new Date(0)')}`),
  'explains the ground-truth mystery: `new X(...)` parses as the statements `new` and `X(...)`; Date() without new is a string');
probe('new parses as two statements', 'parse("new Date(0)").t', 'seq of [id new, call Date]', () => {
  const ast = parse('new Date(0)');
  return ast.t === 'seq' && ast.body[0].t === 'id' && ast.body[0].n === 'new' && ast.body[1].t === 'call'
    ? 'seq of [id new, call Date]'
    : ast.t;
}, 'not the BLOCKED_KEYS guard: the guard never fires; the string returned by Date(0) simply has no getTime');
probe('new Date(0).getTime() error text', 'new Date(0).getTime()', '"getTime" is not a function', () => {
  try { pure('new Date(0).getTime()'); return 'no error'; } catch (e) { return e.message.split('\n')[0]; }
});
probe('checkKey is not what breaks Date', '(Date.now() > 0) && typeof Date.now', 'function', () => pure('(Date.now() > 0) && typeof Date.now'));
probe('this is not a name', 'this', 'undefined', () => String(pure('this', { n: 1 })),
  'nothing in lexer, parser or interpreter knows `this`');
probe('return is an identifier (works by accident)', '(() => { return n * 2 })()', 10, () => pure('(() => { return n * 2 })()', { n: 5 }),
  'parses as the statements `return` and `n * 2`; the block yields its last value');

// ===========================================================================
// Runner
// ===========================================================================

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
  if (typeof v === 'string') return JSON.stringify(v);
  if (v instanceof Error) return `${v.name}: ${v.message.split('\n')[0]}`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

const rows = [];
for (const c of CASES) {
  if (c.section) {
    rows.push(c);
    continue;
  }
  errors = [];
  unhandled = [];
  document.body.innerHTML = '';
  let status;
  let detail = '';
  try {
    const got = await c.run();
    if (same(got, c.expected)) {
      status = 'ok';
    } else {
      status = 'WRONG';
      detail = `expected ${show(c.expected)}, got ${show(got)}`;
    }
  } catch (error) {
    status = 'THROWS';
    detail = String(error && error.message ? error.message : error).split('\n')[0].slice(0, 100);
  }
  rows.push({ ...c, status, detail });
}
// Let any late rejection from the last case surface before we count.
await sleep(10);

const cases = rows.filter((r) => !r.section);
const broken = cases.filter((r) => r.status !== 'ok');

for (const row of rows) {
  if (row.section) {
    console.log(`\n-- ${row.section}`);
    continue;
  }
  const mark = row.status === 'ok' ? '  ok    ' : `  ${row.status.padEnd(6)}`;
  console.log(`${mark}${row.name.padEnd(52)} ${row.source}`);
  if (row.detail) console.log(`${' '.repeat(10)}${row.detail}`);
  if (row.status !== 'ok' && row.note) console.log(`${' '.repeat(10)}-> ${row.note}`);
}

console.log('');
console.log(`${cases.length - broken.length} of ${cases.length} behave as expected, ${broken.length} do not`);

process.exit(broken.length ? 1 : 0);
