/**
 * Regression: `v-if` and `v-for` leaked everything they had ever rendered.
 *
 * Both take their element out of the document and keep it as the thing they
 * clone from. The cleanup for that element — the effect scope `runDirective`
 * registered on it, plus the directive's own — is keyed by that element in
 * `nodeCleanups`. `destroy()` walks live children only, so once detached the
 * element was unreachable: its effect scope was never stopped and it held the
 * template, every rendered block, and every node inside them.
 *
 * Measured before the fix, sixty mount-and-destroy cycles with the heap forced
 * between samples: a plain `v-text` element returned to zero, `v-if` retained
 * 21.9 KB per cycle and a hundred-row `v-for` retained 772 KB per cycle. The
 * project's own memory benchmark could not finish — it exhausted a 3.8 GB heap
 * and took the rest of the suite down with it.
 *
 * Heap size is too noisy to assert on, so this measures the thing that actually
 * went wrong: whether the effect scope belonging to the detached template is
 * stopped when its parent is destroyed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { reactive, flushSync } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy, getEffectScopes } from '../src/runtime/walker';
import '../src/core';

/**
 * Mounts, and hands back the nodes as they were BEFORE the walk.
 *
 * This ordering is the entire test. `v-if` and `v-for` detach their element
 * during the walk, so anything collected afterwards cannot include the template
 * — which is exactly why the leak went unnoticed, and why a first version of
 * this file passed against the unfixed code. Holding references from before the
 * walk is the only way to ask whether the detached template's scope was ever
 * stopped.
 */
function mount(
  html: string,
  data: Record<string, unknown>
): { root: HTMLElement; nodes: Node[] } {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);

  const nodes = collect(root);
  walk(root, new Scope(reactive(data)));
  flushSync();

  return { root, nodes };
}

/**
 * Every effect scope the directives created, whether or not its element is
 * still in the document.
 *
 * The detached template is the whole point, so it cannot be found by walking
 * the tree. It is reached through the anchor's siblings instead: `v-if` and
 * `v-for` both leave a comment where their element used to be, and the template
 * itself is remembered by the walker.
 */
function liveScopes(nodes: Node[]): number {
  let active = 0;
  for (const node of nodes) {
    for (const scope of getEffectScopes(node)) {
      if (scope.active) active++;
    }
  }
  return active;
}

/** Every element the walk touched, including ones later detached. */
function collect(root: Node, out: Node[] = []): Node[] {
  out.push(root);
  for (let child = root.firstChild; child; child = child.nextSibling) collect(child, out);
  return out;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a destroyed subtree stops the effects of its detached templates', () => {
  it('v-for: the template scope is not left running', () => {
    const { root, nodes: seen } = mount(
      '<ul><li v-for="r in rows" :key="r.id"><span v-text="r.label"></span></li></ul>',
      { rows: [{ id: 1, label: 'a' }, { id: 2, label: 'b' }] }
    );
    expect(liveScopes(seen)).toBeGreaterThan(0);

    destroy(root);

    expect(liveScopes(seen)).toBe(0);
  });

  it('v-if: the branch template scope is not left running', () => {
    const { root, nodes: seen } = mount('<div><p v-if="on" v-text="msg"></p></div>', { on: true, msg: 'hi' });
    expect(liveScopes(seen)).toBeGreaterThan(0);

    destroy(root);

    expect(liveScopes(seen)).toBe(0);
  });

  it('destroying twice is harmless', () => {
    const { root } = mount('<ul><li v-for="n in list" v-text="n"></li></ul>', { list: [1, 2, 3] });

    destroy(root);
    expect(() => destroy(root)).not.toThrow();
  });

  it('the list still renders and updates before it is destroyed', () => {
    const data = reactive({ list: [1, 2, 3] });
    const root = document.createElement('div');
    root.innerHTML = '<ul><li v-for="n in list" v-text="n"></li></ul>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    flushSync();

    expect(root.querySelectorAll('li')).toHaveLength(3);

    data.list.push(4);
    flushSync();
    expect(root.querySelectorAll('li')).toHaveLength(4);

    data.list.splice(0, 2);
    flushSync();
    expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['3', '4']);
  });

  it('v-if still toggles both ways after the change', () => {
    const data = reactive({ on: false });
    const root = document.createElement('div');
    root.innerHTML = '<div><p v-if="on">yes</p><p v-else>no</p></div>';
    document.body.appendChild(root);
    walk(root, new Scope(data));
    flushSync();

    expect(root.textContent).toContain('no');

    data.on = true;
    flushSync();
    expect(root.textContent).toContain('yes');

    data.on = false;
    flushSync();
    expect(root.textContent).toContain('no');
  });
});
