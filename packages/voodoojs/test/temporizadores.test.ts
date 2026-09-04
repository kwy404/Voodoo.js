/**
 * Timers inside expressions.
 *
 * `useEffect` shipped with cleanup as its headline and no way to register
 * anything that needs cleaning up: the documented example and the playground
 * sample both called `setInterval` and both failed with "setInterval was not
 * found" the moment anyone ran them. Timers are reachable now.
 *
 * The string form stays refused. `setTimeout('alert(1)', 0)` asks the browser
 * to compile that text, which is `eval` under another name, and the reason this
 * library works under a strict Content Security Policy is that it never does.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluate, allowedGlobals, VoodooRuntimeError } from '../src/parser/interpreter';
import { parse } from '../src/parser/parser';
import { Scope } from '../src/runtime/scope';
import { reactive } from '../src/reactivity';

function run(expression: string, data: Record<string, unknown> = {}): unknown {
  return evaluate(parse(expression), new Scope(reactive(data)));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('timers are reachable', () => {
  it('exposes the four an effect actually needs', () => {
    for (const name of ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']) {
      expect(typeof allowedGlobals[name]).toBe('function');
    }
  });

  it('setTimeout runs the callback', () => {
    const state = reactive({ hit: 0 });
    run('setTimeout(() => hit++, 10)', state);

    expect(state.hit).toBe(0);
    vi.advanceTimersByTime(10);
    expect(state.hit).toBe(1);
  });

  it('setInterval repeats, and clearInterval stops it', () => {
    const state = reactive({ n: 0, id: 0 });
    run('id = setInterval(() => n++, 100)', state);

    vi.advanceTimersByTime(350);
    expect(state.n).toBe(3);

    run('clearInterval(id)', state);
    vi.advanceTimersByTime(500);
    expect(state.n).toBe(3);
  });

  it('the whole useEffect shape from the documentation works', () => {
    // Exactly the example that was published broken.
    const state = reactive({ seconds: 0, running: true, stop: null as unknown });
    run('stop = setInterval(() => { if (running) seconds++ }, 1000)', state);

    vi.advanceTimersByTime(3000);
    expect(state.seconds).toBe(3);

    state.running = false;
    vi.advanceTimersByTime(2000);
    expect(state.seconds).toBe(3);

    run('clearInterval(stop)', state);
    vi.advanceTimersByTime(5000);
    expect(state.seconds).toBe(3);
  });
});

describe('the string form is refused', () => {
  it('setTimeout with a string throws rather than compiling it', () => {
    expect(() => run('setTimeout("globalThis.pwned = 1", 0)')).toThrow(VoodooRuntimeError);
    expect(() => run('setTimeout("globalThis.pwned = 1", 0)')).toThrow(/needs a function/);
  });

  it('setInterval with a string throws too', () => {
    expect(() => run('setInterval("globalThis.pwned = 1", 0)')).toThrow(/needs a function/);
  });

  it('and nothing was scheduled by the attempt', () => {
    try {
      run('setTimeout("globalThis.pwned = 1", 0)');
    } catch {
      /* expected */
    }
    vi.advanceTimersByTime(100);
    expect((globalThis as Record<string, unknown>).pwned).toBeUndefined();
  });
});
