/**
 * Regression: what an expression attribute accepts.
 *
 * Three things were reported broken and are fixed here:
 *
 *   - `@click="a++, b++"`. The parser's own comment promised `;` or `,` as
 *     top-level separators, but only `;` was consumed, so the comma failed with
 *     an "unexpected token".
 *   - `(() => { count = 42 })()`. Arrow bodies could only be a single
 *     expression, so a block body was read as an object literal and the `=`
 *     inside it made no sense.
 *   - `(function () { count = 42 })()`. Function expressions did not exist.
 *
 * And one thing that is NOT a bug: expressions cannot reach `window`. That is
 * the sandbox, and the tests below pin the supported way to expose a global.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../src/core';
import { parse } from '../src/parser/parser';
import { evaluate, allowedGlobals } from '../src/parser/interpreter';
import { destroy, walk } from '../src/runtime/walker';
import { rootScope } from '../src/runtime/scope';
import { Scope } from '../src/runtime/scope';
import { nextTick } from '../src/reactivity';

/** Evaluates an expression against a plain scope. */
function run(source: string, data: Record<string, unknown> = {}): unknown {
  return evaluate(parse(source), new Scope(data));
}

/** Clicks a button whose handler is the given expression, returns the state. */
async function click(handler: string, data = '{ n: 0, out: "" }'): Promise<string> {
  const host = document.createElement('div');
  host.setAttribute('v-data', data);
  host.innerHTML = `<button @click="${handler.replace(/"/g, '&quot;')}">b</button><i>{ n }|{ out }</i>`;
  document.body.appendChild(host);
  walk(host, rootScope);
  await nextTick();
  host.querySelector('button')!.click();
  await nextTick();
  return host.querySelector('i')!.textContent ?? '';
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  destroy(document.body);
  document.body.innerHTML = '';
  delete allowedGlobals.helper;
});

describe('several statements in one attribute', () => {
  it('separated by a semicolon', async () => {
    expect(await click('n++; out = "ok"')).toBe('1|ok');
  });

  it('separated by a comma', async () => {
    expect(await click('n++, out = "ok"')).toBe('1|ok');
  });

  it('mixing both separators', async () => {
    expect(await click('n++, out = "a"; n++')).toBe('2|a');
  });

  it('a trailing separator is harmless', async () => {
    expect(await click('n++;')).toBe('1|');
  });
});

describe('self-invoking functions', () => {
  it('classic function expression', async () => {
    expect(await click('(function () { n = 42 })()')).toBe('42|');
  });

  it('named function expression', async () => {
    expect(await click('(function tick() { n = 7 })()')).toBe('7|');
  });

  it('arrow with a block body', async () => {
    expect(await click('(() => { n = 42 })()')).toBe('42|');
  });

  it('arrow with an expression body', async () => {
    expect(await click('(() => n = 9)()')).toBe('9|');
  });

  it('a block body runs every statement and yields the last', () => {
    expect(run('(() => { 1; 2; 3 })()')).toBe(3);
  });

  it('an empty block yields undefined', () => {
    expect(run('(() => {})()')).toBeUndefined();
  });

  it('arguments still reach a function expression', () => {
    expect(run('(function (a, b) { a + b })(2, 3)')).toBe(5);
  });

  it('returning an object still needs parentheses, as in JavaScript', () => {
    expect(run('(() => ({ a: 1 }))()')).toEqual({ a: 1 });
  });

  it('a block body does not swallow a following statement', async () => {
    expect(await click('(() => { n = 5 })(); out = "depois"')).toBe('5|depois');
  });
});

describe('callbacks keep working', () => {
  it('an arrow passed to a native method', () => {
    expect(run('list.map(x => x * 2)', { list: [1, 2] })).toEqual([2, 4]);
  });

  it('an arrow with a block passed to a native method', () => {
    expect(run('list.map(x => { x * 3 })', { list: [1, 2] })).toEqual([3, 6]);
  });
});

describe('reaching outside the page', () => {
  it('window stays unreachable, which is the sandbox working', () => {
    expect(() => run('window.location')).toThrow();
    expect(run('typeof window')).toBe('undefined');
  });

  it('an unknown name says how to expose it, instead of blaming the call', () => {
    expect(() => run('helper()')).toThrow(/was not found.*V\.config\.globals/s);
  });

  it('a registered global is callable', () => {
    allowedGlobals.helper = () => 'called';
    expect(run('helper()')).toBe('called');
  });

  it('a name in scope shadows nothing and just works', () => {
    expect(run('helper()', { helper: () => 'scoped' })).toBe('scoped');
  });
});

describe('the error message does not undo the sandbox', () => {
  const dangerous = ['eval', 'Function', 'fetch', 'localStorage', 'Reflect'];

  for (const name of dangerous) {
    it(`${name} is reported as blocked, with no instructions to expose it`, () => {
      let message = '';
      try {
        run(`${name}()`);
      } catch (err) {
        message = (err as Error).message;
      }
      expect(message).toContain('is blocked');
      // Telling someone how to hand `eval` to a template would be advice for
      // dismantling the sandbox.
      expect(message).not.toContain('V.config.globals');
    });
  }

  it('an ordinary unknown name still gets the helpful hint', () => {
    let message = '';
    try {
      run('meuHelper()');
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('V.config.globals');
  });
});

describe('method shorthand in an object literal', () => {
  it('a method can be declared and called', async () => {
    const host = document.createElement('div');
    host.setAttribute('v-data', '{ out: "", hi() { out = "oi" } }');
    host.innerHTML = '<button @click="hi()">b</button><i>{ out }</i>';
    document.body.appendChild(host);
    walk(host, rootScope);
    await nextTick();
    host.querySelector('button')!.click();
    await nextTick();
    expect(host.querySelector('i')!.textContent).toBe('oi');
  });

  it('the method reads and writes the surrounding state by name', async () => {
    // Inside `v-data` the state is already in scope, so the body says `n`
    // rather than `this.n`. That is the shape the framework encourages.
    const host = document.createElement('div');
    host.setAttribute('v-data', '{ n: 2, double() { n = n * 2 } }');
    host.innerHTML = '<button @click="double()">b</button><i>{ n }</i>';
    document.body.appendChild(host);
    walk(host, rootScope);
    await nextTick();
    host.querySelector('button')!.click();
    await nextTick();
    expect(host.querySelector('i')!.textContent).toBe('4');
  });

  it('takes parameters', () => {
    expect(run('({ sum(a, b) { a + b } }).sum(2, 3)')).toBe(5);
  });

  it('sits alongside ordinary properties and shorthand', () => {
    const obj = run('({ a: 1, b, greet() { "hi" } })', { b: 2 }) as Record<string, unknown>;
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    expect(typeof obj.greet).toBe('function');
    expect((obj.greet as () => unknown)()).toBe('hi');
  });

  it('still accepts the explicit forms', () => {
    expect(typeof (run('({ f: () => 1 })') as Record<string, unknown>).f).toBe('function');
    expect(typeof (run('({ f: function () { 1 } })') as Record<string, unknown>).f).toBe('function');
  });
});

describe('if statements', () => {
  it('runs the branch and yields its value', () => {
    expect(run('if (n > 1) { r = 9 } ; r', { n: 2, r: 0 })).toBe(9);
  });

  it('takes the else branch', () => {
    expect(run('if (n > 5) { r = 1 } else { r = 2 } ; r', { n: 2, r: 0 })).toBe(2);
  });

  it('yields undefined when false and there is no else', () => {
    expect(run('if (false) { 1 }')).toBeUndefined();
  });

  it('works without braces', () => {
    expect(run('if (true) 7')).toBe(7);
  });

  it('chains else if', () => {
    expect(run('if (n === 1) { "um" } else if (n === 2) { "dois" } else { "outro" }', { n: 2 })).toBe(
      'dois'
    );
  });

  it('runs inside an event handler', async () => {
    expect(await click('if (n === 0) { n = 5 } else { n = 1 }')).toBe('5|');
  });

  it('a bare name called `if` is still an ordinary identifier', () => {
    // The statement form is only taken when a `(` follows, so this stays data.
    expect(run('ifs', { ifs: 3 })).toBe(3);
  });
});

describe('getters in object literals', () => {
  it('computes on read', () => {
    expect(run('({ a: 2, get double() { 4 } }).double')).toBe(4);
  });

  it('reads sibling state through this', () => {
    expect(run('({ n: 3, get double() { n * 2 } }).double')).toBe(6);
  });

  it('recomputes rather than freezing the first value', () => {
    // The trap V.store and V.data both fell into: reading once and storing the
    // result turns a derived value into a constant.
    const obj = run('({ n: 1, get double() { n * 2 } })') as { n: number; double: number };
    expect(obj.double).toBe(2);
    obj.n = 5;
    expect(obj.double).toBe(10);
  });

  it('is enumerable, so spreading still sees it', () => {
    expect(Object.keys(run('({ a: 1, get b() { 2 } })') as object)).toEqual(['a', 'b']);
  });

  it('a property literally named get still works', () => {
    expect((run('({ get: 1 })') as Record<string, unknown>).get).toBe(1);
  });
});
