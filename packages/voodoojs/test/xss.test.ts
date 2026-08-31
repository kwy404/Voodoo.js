/**
 * Contrato de escape e injecao.
 *
 * A regra da biblioteca e simples: tudo que escreve texto escapa, e o unico
 * caminho que interpreta HTML e `v-html`, escolhido de proposito por quem
 * escreve o template. Estes testes fixam esse contrato nos dois sentidos, e
 * documentam o que acontece com atributos de URL e de evento.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import { limparAvisos } from '../src/runtime/avisos';
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
  limparAvisos();
});

describe('v-text escapa sempre', () => {
  it('nao interpreta HTML vindo do estado', () => {
    const { root } = montar('<p v-text="conteudo"></p>', { conteudo: PAYLOAD });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe(PAYLOAD);
    expect(p.querySelector('img')).toBeNull();
    expect(p.children.length).toBe(0);
  });

  it('continua escapando quando o valor muda depois', async () => {
    const { root, estado } = montar('<p v-text="c"></p>', { c: 'ola' });
    (estado as Record<string, unknown>).c = '<script>alert(1)</script>';
    await settle();
    const p = root.querySelector('p')!;
    expect(p.querySelector('script')).toBeNull();
    expect(p.textContent).toContain('<script>');
  });

  it('escapa tambem quando o valor e um objeto serializado', () => {
    const { root } = montar('<p v-text="o"></p>', { o: { html: PAYLOAD } });
    expect(root.querySelector('p')!.children.length).toBe(0);
  });
});

describe('interpolacao escapa sempre', () => {
  it('{ x } escreve texto, nunca HTML', () => {
    const { root } = montar('<p>{ conteudo }</p>', { conteudo: PAYLOAD });
    const p = root.querySelector('p')!;
    expect(p.textContent).toBe(PAYLOAD);
    expect(p.querySelector('img')).toBeNull();
  });

  it('{{ x }} escreve texto, nunca HTML', () => {
    const { root } = montar('<p>{{ conteudo }}</p>', { conteudo: PAYLOAD });
    expect(root.querySelector('p')!.querySelector('img')).toBeNull();
  });

  it('atualizacao reativa continua escapando', async () => {
    const { root, estado } = montar('<p>{ c }</p>', { c: 'ok' });
    (estado as Record<string, unknown>).c = '<b>negrito</b>';
    await settle();
    const p = root.querySelector('p')!;
    expect(p.querySelector('b')).toBeNull();
    expect(p.textContent).toBe('<b>negrito</b>');
  });
});

describe('v-html injeta HTML de proposito', () => {
  // Contrato documentado: `v-html` existe justamente para inserir markup. Quem
  // usa assume a responsabilidade pelo conteudo, do mesmo jeito que em qualquer
  // outro framework. O teste confirma o contrato para que ele nao mude sem
  // querer, nao para recomendar o uso com dado de terceiro.
  it('insere elementos de verdade', () => {
    const { root } = montar('<div v-html="c"></div>', { c: '<b class="x">oi</b>' });
    const div = root.querySelector('div')!;
    expect(div.querySelector('b.x')).not.toBeNull();
    expect(div.querySelector('b')!.textContent).toBe('oi');
  });

  it('troca o conteudo quando o estado muda', async () => {
    const { root, estado } = montar('<div v-html="c"></div>', { c: '<i>um</i>' });
    (estado as Record<string, unknown>).c = '<u>dois</u>';
    await settle();
    const div = root.querySelector('div')!;
    expect(div.querySelector('i')).toBeNull();
    expect(div.querySelector('u')!.textContent).toBe('dois');
  });

  it('o HTML inserido tambem ganha directives', async () => {
    const { root } = montar('<div v-html="c"></div>', { c: '<span v-text="nome"></span>', nome: 'Ana' });
    await settle();
    expect(root.querySelector('span')!.textContent).toBe('Ana');
  });
});

describe('atributos de URL recusam esquemas que executam codigo', () => {
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
    it(`:href recusa ${JSON.stringify(valor.slice(0, 24))}`, () => {
      const { root } = montar('<a :href="u">link</a>', { u: valor });
      expect(root.querySelector('a')!.hasAttribute('href')).toBe(false);
    });
  }

  it('recusa em :src, :action e :formaction tambem', () => {
    const { root } = montar(
      '<img :src="u"><form :action="u"></form><button :formaction="u"></button>',
      { u: 'javascript:alert(1)' }
    );
    expect(root.querySelector('img')!.hasAttribute('src')).toBe(false);
    expect(root.querySelector('form')!.hasAttribute('action')).toBe(false);
    expect(root.querySelector('button')!.hasAttribute('formaction')).toBe(false);
  });

  it('recusa em :xlink:href, usado dentro de SVG', () => {
    const { root } = montar('<a :xlink:href="u">x</a>', { u: 'javascript:alert(1)' });
    expect(root.querySelector('a')!.hasAttribute('xlink:href')).toBe(false);
  });

  it('a protecao tambem vale para o v-bind sem argumento', () => {
    const { root } = montar('<a v-bind="attrs">x</a>', {
      attrs: { href: 'javascript:alert(1)', title: 'ok' },
    });
    const a = root.querySelector('a')!;
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.getAttribute('title')).toBe('ok');
  });

  it('remove o atributo quando um valor bom vira um valor perigoso', async () => {
    const { root, estado } = montar('<a :href="u">x</a>', { u: '/inicio' });
    expect(root.querySelector('a')!.getAttribute('href')).toBe('/inicio');
    (estado as Record<string, unknown>).u = 'javascript:alert(1)';
    await settle();
    expect(root.querySelector('a')!.hasAttribute('href')).toBe(false);
  });

  it('enderecos normais passam sem alteracao', () => {
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

  it('V.config.sanitizeUrls = false devolve o comportamento antigo', () => {
    config.sanitizeUrls = false;
    try {
      const { root } = montar('<a :href="u">x</a>', { u: 'javascript:alert(1)' });
      expect(root.querySelector('a')!.getAttribute('href')).toBe('javascript:alert(1)');
    } finally {
      config.sanitizeUrls = true;
    }
  });
});

describe('atributos de evento nao podem ser ligados por :atributo', () => {
  // `:onerror="..."` viraria um manipulador embutido, que o navegador executa
  // como script. Eventos se declaram com `@evento`, que nunca cria atributo.
  it('recusa :onerror', () => {
    const { root } = montar('<img :onerror="c">', { c: 'window.__invadido = true' });
    expect(root.querySelector('img')!.hasAttribute('onerror')).toBe(false);
  });

  it('recusa :onclick e :onload', () => {
    const { root } = montar('<div :onclick="c"></div><img :onload="c">', { c: 'alert(1)' });
    expect(root.querySelector('div')!.hasAttribute('onclick')).toBe(false);
    expect(root.querySelector('img')!.hasAttribute('onload')).toBe(false);
  });

  it('@evento continua funcionando normalmente', () => {
    let cliques = 0;
    const { root } = montar('<button @click="contar()">x</button>', {
      contar: () => {
        cliques += 1;
      },
    });
    root.querySelector('button')!.click();
    expect(cliques).toBe(1);
  });

  it('atributos que apenas comecam com "on" no meio do nome passam', () => {
    const { root } = montar('<div :data-online="v"></div>', { v: 'sim' });
    expect(root.querySelector('div')!.getAttribute('data-online')).toBe('sim');
  });
});

describe(':srcdoc mantem o comportamento nativo', () => {
  // Documentado de proposito: `srcdoc` escreve um documento inteiro, do mesmo
  // jeito que `v-html` escreve markup. Nao ha bloqueio, e quem usa precisa
  // tratar o conteudo com o mesmo cuidado que trataria em `v-html`.
  it('o valor chega ao atributo como escrito', () => {
    const { root } = montar('<iframe :srcdoc="c"></iframe>', { c: '<p>ola</p>' });
    expect(root.querySelector('iframe')!.getAttribute('srcdoc')).toBe('<p>ola</p>');
  });
});

describe('avisos de recusa', () => {
  let aviso: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    config.devtools = true;
    limparAvisos();
    aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    config.devtools = false;
    aviso.mockRestore();
  });

  it('explica no console por que a URL foi recusada', () => {
    montar('<a :href="u">x</a>', { u: 'javascript:alert(1)' });
    const texto = aviso.mock.calls.map((c) => String(c[0])).join('\n');
    expect(texto).toContain('href');
    expect(texto).toContain('sanitizeUrls');
  });
});
