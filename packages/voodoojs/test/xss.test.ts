/**
 * The escaping and injection contract.
 *
 * The library's rule is simple: everything that writes text escapes it, and the
 * only path that interprets HTML is `v-html`, chosen on purpose by whoever
 * writes the template. These tests pin that contract down in both directions,
 * and document what happens with URL attributes and event attributes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import { clearWarnings } from '../src/runtime/avisos';
import '../src/core';

const PAYLOAD = '<img src=x onerror="window.__invadido = true">';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function settle(n = 3): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
  delete (window as Record<string, unknown>).__invadido;
  clearWarnings();
});

describe('v-text always escapes', () => {
  it('does not interpret HTML coming from the state', () => {
    const { root } = montar('<p v-text="conteudo"></p>', { conteudo: PAYLOAD });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe(PAYLOAD);
    expect(p.querySelector('img')).toBeNull();
    expect(p.children.length).toBe(0);
  });

  it('keeps escaping when the value changes later', async () => {
    const { root, estado } = montar('<p v-text="c"></p>', { c: 'ola' });
    (estado as Record<string, unknown>).c = '<script>alert(1)</script>';
    await settle();
    const p = root.querySelector('p')!;
    expect(p.querySelector('script')).toBeNull();
    expect(p.textContent).toContain('<script>');
  });

  it('escapes as well when the value is a serialized object', () => {
    const { root } = montar('<p v-text="o"></p>', { o: { html: PAYLOAD } });
    expect(root.querySelector('p')!.children.length).toBe(0);
  });
});

describe('interpolation always escapes', () => {
  it('{ x } writes text, never HTML', () => {
    const { root } = montar('<p>{ conteudo }</p>', { conteudo: PAYLOAD });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe(PAYLOAD);
    expect(p.querySelector('img')).toBeNull();
  });

  it('{{ x }} writes text, never HTML', () => {
    const { root } = montar('<p>{{ conteudo }}</p>', { conteudo: PAYLOAD });
    expect(root.querySelector('p')!.querySelector('img')).toBeNull();
  });

  it('a reactive update keeps escaping', async () => {
    const { root, estado } = montar('<p>{ c }</p>', { c: 'ok' });
    (estado as Record<string, unknown>).c = '<b>negrito</b>';
    await settle();
    const p = root.querySelector('p')!;
    expect(p.querySelector('b')).toBeNull();
    expect(p.textContent).toBe('<b>negrito</b>');
  });
});

describe('v-html injects HTML on purpose', () => {
  // Documented contract: `v-html` exists precisely to insert markup. Whoever
  // uses it takes responsibility for the content, the same way as in any other
  // framework. The test confirms the contract so that it does not change by
  // accident, not to recommend using it with third-party data.
  it('inserts real elements', () => {
    const { root } = montar('<div v-html="c"></div>', { c: '<b class="x">oi</b>' });
    const div = root.querySelector('div')!;
    expect(div.querySelector('b.x')).not.toBeNull();
    expect(div.querySelector('b')!.textContent).toBe('oi');
  });

  it('swaps the content when the state changes', async () => {
    const { root, estado } = montar('<div v-html="c"></div>', { c: '<i>um</i>' });
    (estado as Record<string, unknown>).c = '<u>dois</u>';
    await settle();
    const div = root.querySelector('div')!;
    expect(div.querySelector('i')).toBeNull();
    expect(div.querySelector('u')!.textContent).toBe('dois');
  });

  it('the inserted HTML gets directives too', async () => {
    const { root } = montar('<div v-html="c"></div>', { c: '<span v-text="nome"></span>', nome: 'Ana' });
    await settle();
    expect(root.querySelector('span')!.textContent).toBe('Ana');
  });
});

describe('URL attributes refuse schemes that run code', () => {
  const perigosos = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '  javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  ];

  for (const valor of perigosos) {
    it(`:href refuses ${JSON.stringify(valor.slice(0, 24))}`, () => {
      const { root } = montar('<a :href="u">link</a>', { u: valor });
      expect(root.querySelector('a')!.hasAttribute('href')).toBe(false);
    });
  }

  it('refuses on :src, :action and :formaction as well', () => {
    const { root } = montar(
      '<img :src="u"><form :action="u"></form><button :formaction="u"></button>',
      { u: 'javascript:alert(1)' }
    );
    expect(root.querySelector('img')!.hasAttribute('src')).toBe(false);
    expect(root.querySelector('form')!.hasAttribute('action')).toBe(false);
    expect(root.querySelector('button')!.hasAttribute('formaction')).toBe(false);
  });

  it('refuses on :xlink:href, used inside SVG', () => {
    const { root } = montar('<a :xlink:href="u">x</a>', { u: 'javascript:alert(1)' });
    expect(root.querySelector('a')!.hasAttribute('xlink:href')).toBe(false);
  });

  it('the protection also holds for v-bind with no argument', () => {
    const { root } = montar('<a v-bind="attrs">x</a>', {
      attrs: { href: 'javascript:alert(1)', title: 'ok' },
    });
    const a = root.querySelector('a')!;
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.getAttribute('title')).toBe('ok');
  });

  it('removes the attribute when a good value turns into a dangerous one', async () => {
    const { root, estado } = montar('<a :href="u">x</a>', { u: '/inicio' });
    expect(root.querySelector('a')!.getAttribute('href')).toBe('/inicio');
    (estado as Record<string, unknown>).u = 'javascript:alert(1)';
    await settle();
    expect(root.querySelector('a')!.hasAttribute('href')).toBe(false);
  });

  it('ordinary addresses pass through unchanged', () => {
    const bons = [
      '/pagina',
      './rel',
      '#ancora',
      'https://exemplo.com/a?b=1',
      'http://exemplo.com',
      'mailto:a@b.com',
      'tel:+5511999999999',
      'data:image/png;base64,iVBORw0KGgo=',
    ];
    for (const u of bons) {
      document.body.innerHTML = '';
      const { root } = montar('<a :href="u">x</a>', { u });
      expect(root.querySelector('a')!.getAttribute('href'), u).toBe(u);
    }
  });

  it('V.config.sanitizeUrls = false brings back the old behaviour', () => {
    config.sanitizeUrls = false;
    try {
      const { root } = montar('<a :href="u">x</a>', { u: 'javascript:alert(1)' });
      expect(root.querySelector('a')!.getAttribute('href')).toBe('javascript:alert(1)');
    } finally {
      config.sanitizeUrls = true;
    }
  });
});

describe('event attributes cannot be bound through :attribute', () => {
  // `:onerror="..."` would become an inline handler, which the browser runs as
  // a script. Events are declared with `@event`, which never creates an
  // attribute.
  it('refuses :onerror', () => {
    const { root } = montar('<img :onerror="c">', { c: 'window.__invadido = true' });
    expect(root.querySelector('img')!.hasAttribute('onerror')).toBe(false);
  });

  it('refuses :onclick and :onload', () => {
    const { root } = montar('<div :onclick="c"></div><img :onload="c">', { c: 'alert(1)' });
    expect(root.querySelector('div')!.hasAttribute('onclick')).toBe(false);
    expect(root.querySelector('img')!.hasAttribute('onload')).toBe(false);
  });

  it('@event keeps working normally', () => {
    let cliques = 0;
    const { root } = montar('<button @click="contar()">x</button>', {
      contar: () => {
        cliques += 1;
      },
    });
    root.querySelector('button')!.click();
    expect(cliques).toBe(1);
  });

  it('attributes that merely contain "on" in the middle of the name pass', () => {
    const { root } = montar('<div :data-online="v"></div>', { v: 'sim' });
    expect(root.querySelector('div')!.getAttribute('data-online')).toBe('sim');
  });
});

describe(':srcdoc demands an explicit form', () => {
  // `srcdoc` writes a whole document with live script, the same way `v-html`
  // writes markup. The difference is that it looked like an ordinary bind, with
  // nothing in the template announcing the danger. Now the danger has a name.
  it('refuses the ordinary bind', () => {
    const { root } = montar('<iframe :srcdoc="c"></iframe>', { c: '<p>ola</p>' });
    expect(root.querySelector('iframe')!.hasAttribute('srcdoc')).toBe(false);
  });

  it('refuses through the property path as well', () => {
    const { root } = montar('<iframe :srcdoc.prop="c"></iframe>', { c: '<p>ola</p>' });
    expect((root.querySelector('iframe') as HTMLIFrameElement).srcdoc || '').toBe('');
  });

  it('refuses inside v-bind with an object', () => {
    const { root } = montar('<iframe v-bind="attrs"></iframe>', {
      attrs: { srcdoc: '<p>ola</p>' },
    });
    expect(root.querySelector('iframe')!.hasAttribute('srcdoc')).toBe(false);
  });

  it('accepts it with the .dangerous modifier', () => {
    const { root } = montar('<iframe :srcdoc.dangerous="c"></iframe>', { c: '<p>ola</p>' });
    expect(root.querySelector('iframe')!.getAttribute('srcdoc')).toBe('<p>ola</p>');
  });

  it('accepts it when sanitizeUrls is switched off', () => {
    config.sanitizeUrls = false;
    try {
      const { root } = montar('<iframe :srcdoc="c"></iframe>', { c: '<p>ola</p>' });
      expect(root.querySelector('iframe')!.getAttribute('srcdoc')).toBe('<p>ola</p>');
    } finally {
      config.sanitizeUrls = true;
    }
  });

  it('explains in the console why it refused', () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      montar('<iframe :srcdoc="c"></iframe>', { c: '<p>ola</p>' });
      const texto = aviso.mock.calls.map((c) => String(c[0])).join('\n');
      expect(texto).toContain('srcdoc');
      expect(texto).toContain('dangerous');
    } finally {
      aviso.mockRestore();
      config.devtools = false;
    }
  });
});

describe('refusal warnings', () => {
  let aviso: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    config.devtools = true;
    clearWarnings();
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    config.devtools = false;
    aviso.mockRestore();
  });

  it('explains in the console why the URL was refused', () => {
    montar('<a :href="u">x</a>', { u: 'javascript:alert(1)' });
    const texto = aviso.mock.calls.map((c) => String(c[0])).join('\n');
    expect(texto).toContain('href');
    expect(texto).toContain('sanitizeUrls');
  });
});
