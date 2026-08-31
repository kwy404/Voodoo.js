/**
 * Accessibility: analise estatica dos componentes de interface.
 *
 * Nao existe axe-core aqui e nao vai existir: a regra do projeto e nao instalar
 * dependencia nova. O que da para fazer sem navegador, e que ja tem valor real,
 * e ler o codigo que constroi cada widget e conferir se ele emite o que o
 * WAI-ARIA Authoring Practices exige daquele padrao — roles, atributos de
 * estado, gerenciamento de foco, teclas e respeito a `prefers-reduced-motion`.
 *
 * O resultado e um relatorio por componente com o que TEM e o que FALTA. Cada
 * lacuna vira um WARN, nunca um FAIL: a ausencia de `aria-controls` num
 * accordion e divida tecnica, nao build quebrado. E um achado aqui e uma pista
 * para revisar o codigo, nao um veredito — a analise e textual e nao executa a
 * pagina, entao vale a leitura humana antes de mexer.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SRC_DIR, STATUS, note, read, rel, warn } from './lib.mjs';

export const meta = { label: 'Accessibility' };

const UI_DIRECTIVES = join(SRC_DIR, 'directives', 'ui.ts');
const DIALOG = join(SRC_DIR, 'ui', 'dialog.ts');
const TOAST = join(SRC_DIR, 'ui', 'toast.ts');
const COMPONENTS = join(SRC_DIR, 'ui', 'components.ts');

/**
 * Componentes analisados e o que se espera de cada um.
 *
 * `section` recorta o trecho do arquivo pelo cabecalho de secao (`// v-tabs...`)
 * quando existe; sem `section`, o arquivo inteiro e a regiao.
 */
const COMPONENTS_SPEC = [
  {
    name: 'modal',
    file: DIALOG,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    expect: {
      roles: ['dialog'],
      aria: ['aria-modal', 'aria-labelledby'],
      focus: ['focus()', 'focus trap', 'devolve o foco'],
      keys: ['Escape', 'Tab'],
      reducedMotion: true,
    },
  },
  {
    name: 'dialog',
    file: DIALOG,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/',
    expect: {
      roles: ['dialog'],
      aria: ['aria-labelledby', 'aria-describedby'],
      focus: ['focus()', 'focus trap'],
      keys: ['Escape', 'Tab'],
      reducedMotion: true,
    },
  },
  {
    name: 'drawer',
    file: UI_DIRECTIVES,
    section: /v-drawer/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    expect: {
      roles: ['dialog'],
      aria: ['aria-modal', 'aria-labelledby'],
      focus: ['focus()', 'focus trap', 'devolve o foco'],
      keys: ['Escape', 'Tab'],
      reducedMotion: true,
    },
  },
  {
    name: 'dropdown',
    file: UI_DIRECTIVES,
    section: /v-dropdown/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
    expect: {
      roles: ['menu', 'menuitem'],
      aria: ['aria-expanded', 'aria-haspopup'],
      focus: ['focus()'],
      keys: ['Escape', 'ArrowDown', 'ArrowUp', 'Enter', 'Home', 'End'],
      reducedMotion: false,
    },
  },
  {
    name: 'popover',
    file: UI_DIRECTIVES,
    section: /v-dropdown/, // mesma secao do arquivo
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
    expect: {
      roles: [],
      aria: ['aria-expanded', 'aria-controls'],
      focus: ['focus()'],
      keys: ['Escape'],
      reducedMotion: false,
    },
  },
  {
    name: 'tooltip',
    file: UI_DIRECTIVES,
    section: /v-tooltip/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/',
    expect: {
      roles: ['tooltip'],
      aria: ['aria-describedby'],
      focus: ['focus()'],
      keys: ['Escape'],
      reducedMotion: false,
    },
  },
  {
    name: 'tabs',
    file: UI_DIRECTIVES,
    section: /v-tabs/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
    expect: {
      roles: ['tablist', 'tab', 'tabpanel'],
      aria: ['aria-selected', 'aria-controls', 'aria-orientation'],
      focus: ['focus()', 'tabindex'],
      keys: ['ArrowRight', 'ArrowLeft', 'Home', 'End'],
      reducedMotion: false,
    },
  },
  {
    name: 'accordion',
    file: UI_DIRECTIVES,
    section: /v-accordion/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
    expect: {
      roles: ['button'],
      aria: ['aria-expanded', 'aria-controls'],
      focus: ['focus()'],
      keys: ['ArrowDown', 'ArrowUp', 'Home', 'End'],
      reducedMotion: false,
    },
  },
  {
    name: 'command palette',
    file: UI_DIRECTIVES,
    section: /v-command/,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
    expect: {
      roles: ['combobox', 'listbox', 'option'],
      aria: ['aria-expanded', 'aria-activedescendant', 'aria-selected', 'aria-controls'],
      focus: ['focus()', 'focus trap'],
      keys: ['Escape', 'ArrowDown', 'ArrowUp', 'Enter'],
      reducedMotion: false,
    },
  },
  {
    name: 'toast',
    file: TOAST,
    apg: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
    expect: {
      roles: ['status', 'alert'],
      aria: ['aria-live', 'aria-atomic', 'aria-label'],
      focus: [],
      keys: [],
      reducedMotion: true,
    },
  },
  {
    name: 'biblioteca de componentes',
    file: COMPONENTS,
    apg: 'https://www.w3.org/WAI/ARIA/apg/',
    expect: {
      roles: [],
      aria: ['aria-label', 'aria-invalid', 'aria-describedby', 'aria-disabled'],
      focus: ['focus()', 'tabindex'],
      keys: ['Enter'],
      reducedMotion: true,
    },
  },
];

/** Recorta a secao do arquivo delimitada pelos cabecalhos `// ----` da Voodoo. */
function sliceSection(source, sectionRe) {
  const lines = source.split('\n');
  const banners = [];
  for (let i = 0; i < lines.length; i++) {
    const isRule = /^\/\/ -{10,}\s*$/.test(lines[i]);
    if (!isRule) continue;
    const title = lines[i + 1];
    if (title && /^\/\/ \S/.test(title) && /^\/\/ -{10,}\s*$/.test(lines[i + 2] ?? '')) {
      banners.push({ index: i, line: i + 1, title: title.replace(/^\/\/\s*/, '').trim() });
    }
  }
  if (!banners.length) return null;

  const at = banners.findIndex((b) => sectionRe.test(b.title));
  if (at < 0) return null;

  const from = banners[at].index;
  const to = at + 1 < banners.length ? banners[at + 1].index : lines.length;
  return {
    text: lines.slice(from, to).join('\n'),
    startLine: banners[at].line + 1,
    endLine: to,
    title: banners[at].title,
  };
}

/** Sinais de acessibilidade encontrados num trecho de codigo. */
function scanSignals(text) {
  const roles = new Set();
  const addLiterals = (segment) => {
    for (const lit of segment.matchAll(/['"]([\w-]+)['"]/g)) roles.add(lit[1]);
  };
  // `setAttribute('role', ...)` — o valor costuma ser dinamico
  // (`type === 'error' ? 'alert' : 'status'`), entao coleta todo literal do
  // argumento em vez de exigir uma unica string.
  for (const m of text.matchAll(/setAttribute\(\s*['"]role['"]\s*,([^\n]*)/g)) addLiterals(m[1]);
  // `role?: 'dialog' | 'alertdialog'` e `role: cond ? 'a' : 'b'`
  for (const m of text.matchAll(/\brole\s*\??\s*:\s*([^;,\n}]*)/g)) addLiterals(m[1]);
  for (const m of text.matchAll(/\brole\s*=\s*["']([\w-]+)["']/g)) roles.add(m[1]);
  for (const m of text.matchAll(/\brole=\\?["']([\w-]+)/g)) roles.add(m[1]);

  const aria = new Set();
  for (const m of text.matchAll(/aria-[a-z]+/g)) aria.add(m[0]);

  const focus = new Set();
  if (/\.focus\s*\(/.test(text)) focus.add('focus()');
  if (/\.blur\s*\(/.test(text)) focus.add('blur()');
  if (/tabIndex|tabindex/.test(text)) focus.add('tabindex');
  if (/activeElement/.test(text)) focus.add('devolve o foco');
  if (/focus-?trap|trapFocus|focusTrap|focusaveis|focusables|FOCUSABLE|focaveis/i.test(text))
    focus.add('focus trap');

  const keys = new Set();
  const KEYNAMES = [
    'Escape',
    'Enter',
    'Tab',
    'ArrowDown',
    'ArrowUp',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ];
  for (const key of KEYNAMES) {
    if (new RegExp(`['"\`]${key}['"\`]`).test(text)) keys.add(key);
  }
  if (/===\s*['"] ['"]|['"]Space['"]|key\s*===\s*['"] ['"]/.test(text)) keys.add('Space');

  return {
    roles: [...roles].sort(),
    aria: [...aria].sort(),
    focus: [...focus].sort(),
    keys: [...keys].sort(),
    reducedMotion: /prefers-reduced-motion/.test(text),
  };
}

export async function run() {
  const findings = [];
  const report = [];
  let analyzed = 0;

  for (const spec of COMPONENTS_SPEC) {
    if (!existsSync(spec.file)) {
      findings.push(
        note(`Componente "${spec.name}" nao analisado: arquivo ausente`, {
          file: rel(spec.file),
        })
      );
      continue;
    }

    const source = read(spec.file);
    let region = { text: source, startLine: 1, title: rel(spec.file) };

    if (spec.section) {
      const sliced = sliceSection(source, spec.section);
      if (!sliced) {
        findings.push(
          note(
            `Componente "${spec.name}" nao analisado: a secao esperada nao foi encontrada no arquivo`,
            {
              file: rel(spec.file),
              expected: `cabecalho de secao casando com ${spec.section}`,
              actual: 'nenhum cabecalho correspondente',
            }
          )
        );
        continue;
      }
      region = sliced;
    }

    analyzed++;
    const signals = scanSignals(region.text);
    const missing = { roles: [], aria: [], focus: [], keys: [], reducedMotion: false };

    for (const role of spec.expect.roles) if (!signals.roles.includes(role)) missing.roles.push(role);
    for (const attr of spec.expect.aria) if (!signals.aria.includes(attr)) missing.aria.push(attr);
    for (const f of spec.expect.focus) if (!signals.focus.includes(f)) missing.focus.push(f);
    for (const k of spec.expect.keys) if (!signals.keys.includes(k)) missing.keys.push(k);
    if (spec.expect.reducedMotion && !signals.reducedMotion) missing.reducedMotion = true;

    const gaps = [];
    if (missing.roles.length) gaps.push(`role: ${missing.roles.join(', ')}`);
    if (missing.aria.length) gaps.push(`aria: ${missing.aria.join(', ')}`);
    if (missing.focus.length) gaps.push(`foco: ${missing.focus.join(', ')}`);
    if (missing.keys.length) gaps.push(`teclado: ${missing.keys.join(', ')}`);
    if (missing.reducedMotion) gaps.push('prefers-reduced-motion');

    for (const gap of gaps) {
      findings.push(
        warn(`${spec.name}: falta ${gap}`, {
          file: rel(spec.file),
          line: region.startLine,
          expected: `padrao WAI-ARIA APG (${spec.apg})`,
          actual: `secao "${region.title}" nao emite ${gap}`,
        })
      );
    }

    report.push({
      component: spec.name,
      file: rel(spec.file),
      section: region.title,
      line: region.startLine,
      has: {
        roles: signals.roles,
        aria: signals.aria,
        focus: signals.focus,
        keys: signals.keys,
        prefersReducedMotion: signals.reducedMotion,
      },
      missing: gaps,
      apg: spec.apg,
    });
  }

  const gapCount = findings.filter((f) => f.level === 'warn').length;
  const clean = report.filter((r) => r.missing.length === 0).length;

  return {
    status: gapCount ? STATUS.WARN : STATUS.PASS,
    summary:
      gapCount === 0
        ? `${analyzed} componentes sem lacunas`
        : `${gapCount} findings em ${analyzed - clean} de ${analyzed} componentes`,
    findings,
    details: {
      method:
        'analise estatica de texto: roles, atributos aria-*, chamadas de foco, nomes de tecla e prefers-reduced-motion dentro da secao de cada componente',
      limitation:
        'nao executa a pagina; nao mede contraste, ordem de leitura nem comportamento real de leitor de tela',
      componentsWithoutGaps: clean,
      components: report,
    },
  };
}
