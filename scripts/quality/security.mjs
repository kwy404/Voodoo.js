/**
 * Security: gates automaticos sobre a promessa de seguranca da Voodoo.
 *
 * A Voodoo avalia expressoes com um interpretador de AST proprio justamente
 * para nao precisar de `eval` nem de `new Function`. Isso e o que permite rodar
 * sob uma CSP sem `unsafe-eval`. Esse tipo de promessa apodrece em silencio:
 * basta um atalho num PR apressado. Os gates abaixo existem para que a promessa
 * quebre um build, e nao a confianca de quem instalou o pacote.
 *
 * Quatro sub-checks:
 *   a) padroes proibidos em `src/**`, com allowlist explicita e revisada;
 *   b) `allowedGlobals` do interpretador nao pode expor o ambiente;
 *   c) compatibilidade com CSP: `dist/**` nao pode conter `eval`/`Function`;
 *   d) `npm audit --omit=dev` (SKIP quando nao ha rede).
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  DIST_DIR,
  SRC_DIR,
  STATUS,
  fail,
  lineOf,
  note,
  read,
  rel,
  run,
  stripCommentsAndStrings,
  walkFiles,
  warn,
  worstStatus,
} from './lib.mjs';

export const meta = { label: 'Security' };

// ---------------------------------------------------------------------------
// (a) Padroes proibidos
// ---------------------------------------------------------------------------

/**
 * Proibicoes duras. Nenhuma delas tem excecao valida neste projeto: a
 * existencia do interpretador de AST e exatamente o motivo pelo qual nenhuma
 * delas deveria aparecer.
 */
const HARD_PATTERNS = [
  {
    id: 'eval',
    re: /(?<![.\w$])eval\s*\(/g,
    why: 'a Voodoo interpreta AST; eval quebraria a compatibilidade com CSP sem unsafe-eval',
  },
  {
    id: 'new-function',
    re: /new\s+Function\s*\(/g,
    why: 'new Function e eval com outro nome; mesma quebra de CSP',
  },
  {
    id: 'function-constructor',
    re: /(?<![.\w$])Function\s*\(\s*['"`]/g,
    why: 'Function("...") compila string em codigo, igual a eval',
  },
  {
    id: 'settimeout-string',
    re: /set(?:Timeout|Interval)\s*\(\s*['"`]/g,
    why: 'setTimeout com string usa o mesmo compilador de eval',
  },
];

/** `.innerHTML =` e `.innerHTML +=`, revisado caso a caso. */
const INNERHTML_RE = /\.innerHTML\s*\+?=(?!=)/g;

/**
 * Excecoes revisadas de `innerHTML`.
 *
 * A chave e o par (arquivo, expressao do lado direito ja normalizada). Se o
 * codigo mudar, a entrada deixa de casar e o gate volta a acusar — que e o
 * comportamento desejado: mudou, revisa de novo.
 */
const INNERHTML_ALLOWLIST = [
  {
    file: 'packages/voodoojs/src/directives/core.ts',
    rhs: "value == null ? '' : String(value)",
    reason:
      'v-html. O opt-in explicito do autor da pagina para injetar HTML, mesmo contrato do x-html do Alpine e do v-html do Vue. Documentado em docs/seguranca.md.',
  },
  {
    file: 'packages/voodoojs/src/dom/query.ts',
    rhs: 'text',
    reason: 'V(sel).html(valor): API imperativa equivalente ao v-html, chamada pelo autor.',
  },
  {
    file: 'packages/voodoojs/src/dom/query.ts',
    rhs: 'html.trim()',
    reason:
      'parseHtml() em <template>: o template e inerte (nao executa script nem carrega recurso) e serve so para converter a string do proprio autor em nos.',
  },
  {
    file: 'packages/voodoojs/src/directives/http.ts',
    rhs: 'html',
    reason:
      'troca hipermidia (v-get/v-post): o HTML vem do proprio backend da aplicacao, mesma origem de confianca do htmx.',
  },
  {
    file: 'packages/voodoojs/src/directives/forms.ts',
    rhs: 'data',
    reason: 'resposta HTML do proprio backend em <template> inerte antes de virar nos.',
  },
  {
    file: 'packages/voodoojs/src/runtime/component.ts',
    rhs: 'definition.template',
    reason: 'template do componente, escrito pelo autor no proprio codigo-fonte.',
  },
  {
    file: 'packages/voodoojs/src/runtime/app.ts',
    rhs: 'htmlOriginal',
    reason: 'restaura no unmount o HTML capturado do proprio DOM inicial; nao ha dado externo.',
  },
  {
    file: 'packages/voodoojs/src/router/index.ts',
    rhs: 'html ?? fallbackHtml',
    reason: 'pagina do roteador, vinda do backend da aplicacao ou de template do autor.',
  },
  {
    file: 'packages/voodoojs/src/ui/dialog.ts',
    rhs: 'options.html',
    reason: 'opcao html do dialogo: opt-in explicito de quem chama V.modal/V.dialog.',
  },
  {
    file: 'packages/voodoojs/src/ui/dialog.ts',
    rhs: 'ICONS.close',
    reason: 'constante de SVG do proprio modulo.',
  },
  {
    file: 'packages/voodoojs/src/ui/dialog.ts',
    rhs: 'ICONS[iconName]',
    reason: 'constante de SVG do proprio modulo, indexada por nome fechado.',
  },
  {
    file: 'packages/voodoojs/src/ui/toast.ts',
    rhs: 'current.html',
    reason: 'opcao html do toast: opt-in explicito de quem chama V.toast.',
  },
  {
    file: 'packages/voodoojs/src/charts/index.ts',
    rhs: "html.join('')",
    reason: 'SVG montado pelo proprio modulo de graficos a partir de numeros e rotulos escapados.',
  },
  {
    file: 'packages/voodoojs/src/charts/index.ts',
    rhs: "tooltipHtml(hit, state.options.format ?? 'number')",
    reason: 'tooltip montado internamente pelo modulo de graficos.',
  },
  {
    file: 'packages/voodoojs/src/devtools/launcher.ts',
    rhs: 'MARCA',
    reason: 'constante de SVG da marca, embutida no modulo.',
  },
];

/** Extrai a expressao a direita de um `=`, ate o fim do comando. */
function rhsAt(source, eqIndex) {
  let i = eqIndex;
  let depth = 0;
  let out = '';
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += source[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) {
      if (depth === 0) break;
      depth--;
    }
    if (depth === 0 && (ch === ';' || ch === '\n')) break;
    out += ch;
    i++;
  }
  return out.trim().replace(/\s+/g, ' ');
}

/** `true` se o lado direito e feito so de literais (nenhum identificador). */
function isLiteralOnly(rhs) {
  const semStrings = stripCommentsAndStrings(rhs);
  return !/[A-Za-z_$]/.test(semStrings);
}

function checkSourcePatterns() {
  const findings = [];
  const exceptions = [];
  const files = walkFiles(SRC_DIR, { filter: (f) => /\.(ts|tsx|js|mjs)$/.test(f) });
  let innerHtmlSites = 0;

  for (const file of files) {
    const raw = read(file);
    if (raw == null) continue;
    const stripped = stripCommentsAndStrings(raw);
    const relPath = rel(file);

    for (const pattern of HARD_PATTERNS) {
      pattern.re.lastIndex = 0;
      let m;
      while ((m = pattern.re.exec(stripped))) {
        const line = lineOf(raw, m.index);
        findings.push(
          fail(`Padrao proibido "${pattern.id}" no codigo-fonte`, {
            file: relPath,
            line,
            expected: `nenhuma ocorrencia (${pattern.why})`,
            actual: raw.split('\n')[line - 1]?.trim().slice(0, 160) ?? m[0],
          })
        );
      }
    }

    INNERHTML_RE.lastIndex = 0;
    let m;
    while ((m = INNERHTML_RE.exec(stripped))) {
      innerHtmlSites++;
      const eqIndex = m.index + m[0].length;
      const rhs = rhsAt(raw, eqIndex);
      const line = lineOf(raw, m.index);

      if (isLiteralOnly(rhs)) continue; // literal constante, sem dado externo

      const allowed = INNERHTML_ALLOWLIST.find((e) => e.file === relPath && e.rhs === rhs);
      if (allowed) {
        exceptions.push({ file: relPath, line, rhs, reason: allowed.reason });
        continue;
      }

      findings.push(
        warn('Atribuicao a innerHTML sem sanitizacao obvia e fora da allowlist', {
          file: relPath,
          line,
          expected:
            'literal constante, ou entrada revisada em INNERHTML_ALLOWLIST de scripts/quality/security.mjs',
          actual: `innerHTML = ${rhs}`,
        })
      );
    }
  }

  return { findings, exceptions, filesScanned: files.length, innerHtmlSites };
}

// ---------------------------------------------------------------------------
// (b) allowedGlobals
// ---------------------------------------------------------------------------

/** Nomes que dariam ao autor de uma expressao acesso ao ambiente do host. */
const FORBIDDEN_GLOBALS = [
  'window',
  'globalThis',
  'self',
  'top',
  'parent',
  'document',
  'fetch',
  'eval',
  'Function',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'navigator',
  'location',
  'history',
  'import',
  'require',
  'process',
  'Worker',
  'importScripts',
];

function checkAllowedGlobals() {
  const file = join(SRC_DIR, 'parser', 'interpreter.ts');
  if (!existsSync(file)) {
    return {
      findings: [
        fail('Nao foi possivel auditar allowedGlobals', {
          file: rel(file),
          expected: 'arquivo do interpretador presente',
          actual: 'ausente',
        }),
      ],
      globals: [],
    };
  }

  const raw = read(file);
  const start = raw.indexOf('allowedGlobals');
  const braceStart = raw.indexOf('{', start);
  let depth = 0;
  let end = braceStart;
  for (; end < raw.length; end++) {
    if (raw[end] === '{') depth++;
    else if (raw[end] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const block = raw.slice(braceStart + 1, end);
  const clean = stripCommentsAndStrings(block);

  const globals = [];
  for (const part of clean.split(',')) {
    const name = part.split(':')[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) globals.push(name);
  }

  const findings = [];
  for (const forbidden of FORBIDDEN_GLOBALS) {
    if (!globals.includes(forbidden)) continue;
    const line = lineOf(raw, braceStart + 1 + clean.indexOf(forbidden));
    findings.push(
      fail(`allowedGlobals expoe "${forbidden}" as expressoes do HTML`, {
        file: rel(file),
        line,
        expected: `"${forbidden}" fora de allowedGlobals`,
        actual: `"${forbidden}" acessivel de dentro de qualquer atributo v-*`,
      })
    );
  }

  return { findings, globals, file: rel(file) };
}

// ---------------------------------------------------------------------------
// (c) Compatibilidade com CSP
// ---------------------------------------------------------------------------

const CSP_PATTERNS = [
  { id: 'eval', re: /(?<![.\w$])eval\s*\(/g },
  { id: 'new Function', re: /new\s+Function\s*\(/g },
  { id: 'Function("...")', re: /(?<![.\w$])Function\s*\(\s*['"`]/g },
];

function checkCsp() {
  if (!existsSync(DIST_DIR)) {
    return {
      status: STATUS.SKIP,
      findings: [],
      details: { reason: 'dist ausente; rode npm run build' },
    };
  }

  const bundles = walkFiles(DIST_DIR, {
    filter: (f) => /\.(js|cjs)$/.test(f) && !f.endsWith('.map'),
  });

  if (!bundles.length) {
    return {
      status: STATUS.SKIP,
      findings: [],
      details: { reason: 'nenhum bundle em dist; rode npm run build' },
    };
  }

  const findings = [];
  for (const file of bundles) {
    const raw = read(file);
    if (raw == null) continue;
    for (const pattern of CSP_PATTERNS) {
      pattern.re.lastIndex = 0;
      const m = pattern.re.exec(raw);
      if (!m) continue;
      findings.push(
        fail(`Bundle incompativel com CSP sem unsafe-eval: contem ${pattern.id}`, {
          file: rel(file),
          line: lineOf(raw, m.index),
          expected: 'nenhuma chamada dinamica de compilacao no artefato publicado',
          actual: raw.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' '),
        })
      );
    }
  }

  return {
    status: findings.length ? STATUS.FAIL : STATUS.PASS,
    findings,
    details: { bundlesScanned: bundles.length, files: bundles.map(rel) },
  };
}

// ---------------------------------------------------------------------------
// (d) npm audit
// ---------------------------------------------------------------------------

function checkAudit() {
  const result = run('npm', ['audit', '--omit=dev', '--json'], { timeout: 120000 });
  const text = `${result.stdout}\n${result.stderr}`;

  let data = null;
  const jsonStart = result.stdout.indexOf('{');
  if (jsonStart >= 0) {
    try {
      data = JSON.parse(result.stdout.slice(jsonStart));
    } catch {
      data = null;
    }
  }

  const offline =
    /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|network|offline|ERR_SOCKET|EPROTO|registry\.npmjs\.org/i.test(
      text
    ) && !data;

  if (offline || (!data && result.code !== 0)) {
    return {
      status: STATUS.SKIP,
      findings: [],
      details: {
        reason: offline ? 'sem acesso a rede para consultar o registro npm' : 'npm audit nao produziu json',
        howToEnable: 'rode com rede disponivel: npm audit --omit=dev',
        exitCode: result.code,
      },
    };
  }

  if (data?.error) {
    return {
      status: STATUS.SKIP,
      findings: [],
      details: { reason: data.error.summary ?? 'npm audit indisponivel' },
    };
  }

  const auditMeta = data?.metadata?.vulnerabilities ?? {};
  const findings = [];
  for (const [name, info] of Object.entries(data?.vulnerabilities ?? {})) {
    const severity = info.severity;
    const level = severity === 'critical' || severity === 'high' ? 'fail' : 'warn';
    findings.push(
      (level === 'fail' ? fail : warn)(
        `Dependencia de producao vulneravel: ${name} (${severity})`,
        {
          file: 'package-lock.json',
          expected: 'nenhuma vulnerabilidade conhecida em dependencias de producao',
          actual: `${severity}: ${(info.via ?? [])
            .map((v) => (typeof v === 'string' ? v : v.title))
            .filter(Boolean)
            .join('; ')
            .slice(0, 200)}`,
        }
      )
    );
  }

  return {
    status: findings.some((f) => f.level === 'fail')
      ? STATUS.FAIL
      : findings.length
        ? STATUS.WARN
        : STATUS.PASS,
    findings,
    details: { vulnerabilities: auditMeta },
  };
}

// ---------------------------------------------------------------------------

async function runCheck() {
  const patterns = checkSourcePatterns();
  const globals = checkAllowedGlobals();
  const csp = checkCsp();
  const audit = checkAudit();

  const findings = [
    ...patterns.findings,
    ...globals.findings,
    ...csp.findings,
    ...audit.findings,
    ...patterns.exceptions.map((e) =>
      note(`Excecao de innerHTML aceita: ${e.rhs}`, {
        file: e.file,
        line: e.line,
        actual: e.reason,
      })
    ),
  ];

  const subStatuses = [
    patterns.findings.some((f) => f.level === 'fail')
      ? STATUS.FAIL
      : patterns.findings.length
        ? STATUS.WARN
        : STATUS.PASS,
    globals.findings.length ? STATUS.FAIL : STATUS.PASS,
    csp.status,
    audit.status,
  ];

  const status = worstStatus(subStatuses);

  const parts = [];
  parts.push(`${patterns.filesScanned} arquivos varridos`);
  parts.push('sem eval/Function');
  parts.push(`${patterns.exceptions.length} excecoes de innerHTML revisadas`);
  if (csp.status === STATUS.PASS) parts.push('bundles compativeis com CSP');
  if (audit.status === STATUS.SKIP) parts.push('npm audit SKIP');

  const failCount = findings.filter((f) => f.level === 'fail').length;
  const warnCount = findings.filter((f) => f.level === 'warn').length;

  return {
    status,
    summary:
      status === STATUS.PASS
        ? parts.join(', ')
        : `${failCount} falhas, ${warnCount} avisos`,
    findings,
    details: {
      sourcePatterns: {
        filesScanned: patterns.filesScanned,
        innerHtmlSites: patterns.innerHtmlSites,
        allowlisted: patterns.exceptions,
        prohibited: HARD_PATTERNS.map((p) => p.id),
      },
      allowedGlobals: {
        file: globals.file,
        exposed: globals.globals,
        forbiddenChecked: FORBIDDEN_GLOBALS,
      },
      csp: { status: csp.status, ...csp.details },
      npmAudit: { status: audit.status, ...audit.details },
    },
  };
}

export { runCheck as run };
