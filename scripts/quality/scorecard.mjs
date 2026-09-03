/**
 * Scores from 0 to 10 per dimension, derived from the evidence collected.
 *
 * The rule that governs this file: a passing test is not worth a 10. Passing is
 * the floor, not the ceiling. A high score requires evidence that the dimension
 * was really exercised, with measured coverage, a real browser, a performance
 * measurement, and every deduction below cites the data that motivated it. No
 * score is typed in by hand: all of them come out of the `details` the checks
 * returned in this run.
 */

import { STATUS } from './lib.mjs';

const clamp = (n) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));

/** Helps build the score by deducting from a ceiling, always with the reason why. */
function build(start) {
  const reasons = [];
  let score = start;
  return {
    minus(points, reason) {
      if (points > 0) {
        score -= points;
        reasons.push(`-${points} ${reason}`);
      }
      return this;
    },
    plus(points, reason) {
      score += points;
      reasons.push(`+${points} ${reason}`);
      return this;
    },
    because(reason) {
      reasons.push(reason);
      return this;
    },
    done() {
      return { score: clamp(score), reasons };
    },
  };
}

const failCount = (r) => (r.findings ?? []).filter((f) => f.level === 'fail').length;
const warnCount = (r) => (r.findings ?? []).filter((f) => f.level === 'warn').length;

const SCORERS = {
  correctness(r, ctx) {
    if (r.status === STATUS.SKIP) return build(0).because('a suite nao rodou').done();
    if (r.status === STATUS.FAIL)
      return build(2).because(`${r.details?.failed ?? failCount(r)} testes falhando`).done();

    const b = build(10).because(
      `${r.details?.passed} de ${r.details?.tests} testes passando em ${r.details?.files} arquivos`
    );
    if (!ctx.coverage)
      b.minus(
        2,
        'cobertura nao medida: @vitest/coverage-v8 nao esta instalado, entao nao ha como dizer QUAL parte do codigo os testes tocam'
      );
    const density = (r.details?.tests ?? 0) / Math.max(1, ctx.sourceFileCount);
    if (density < 8)
      b.minus(
        1,
        `densidade baixa: ${(r.details?.tests ?? 0)} testes para ${ctx.sourceFileCount} arquivos de fonte (${density.toFixed(1)} por arquivo)`
      );
    return b.done();
  },

  unit(r) {
    if (r.status === STATUS.SKIP)
      return build(3)
        .because(
          'a suite nao distingue teste unitario de teste de integracao, entao nao da para afirmar que a camada de unidade esta coberta'
        )
        .done();
    if (r.status === STATUS.FAIL) return build(2).because('testes de unidade falhando').done();
    return build(8).because(`${r.details?.passed}/${r.details?.total} testes classificados como unidade`).done();
  },

  integration(r) {
    if (r.status === STATUS.SKIP)
      return build(3)
        .because(
          'nenhum teste marcado como integracao; a suite atual mistura as camadas num diretorio so'
        )
        .done();
    if (r.status === STATUS.FAIL) return build(2).because('testes de integracao falhando').done();
    return build(8).because(`${r.details?.passed}/${r.details?.total} testes de integracao`).done();
  },

  browser(r) {
    if (r.status === STATUS.SKIP)
      return build(1)
        .because(
          'nenhuma verificacao em navegador real. O jsdom cobre estrutura de DOM, mas nao layout, foco real, eventos de ponteiro, CSS aplicado nem o comportamento do bundle de CDN carregado por <script>'
        )
        .done();
    if (r.status === STATUS.FAIL) return build(2).because('smoke test do navegador falhou').done();
    return build(7)
      .because('smoke test em navegador real passa')
      .minus(0, 'cobre montagem, interpolacao, v-for e um evento; nao e uma suite de navegador')
      .done();
  },

  typescript(r, ctx) {
    if (r.status === STATUS.SKIP) return build(0).because('typescript indisponivel').done();
    if (r.status === STATUS.FAIL)
      return build(2).because(`${failCount(r)} erros de tipo`).done();
    const b = build(10).because(
      `src compila e ${r.details?.definitions?.apiExercised?.length ?? 0} usos da API publica tipam contra os .d.ts de dist`
    );
    if (ctx.tsconfig?.noUncheckedIndexedAccess === false)
      b.minus(
        1,
        'noUncheckedIndexedAccess: false em tsconfig.base.json — indexar array devolve T em vez de T | undefined, e o compilador nao ajuda contra acesso fora do limite'
      );
    return b.done();
  },

  security(r) {
    if (r.status === STATUS.FAIL) return build(1).because(`${failCount(r)} gates de seguranca quebrados`).done();
    const b = build(10).because(
      'sem eval, sem new Function e sem setTimeout com string no fonte; allowedGlobals nao expoe window, document, fetch nem Function; nenhum bundle de dist contem chamada dinamica de compilacao'
    );
    const warns = warnCount(r);
    if (warns) b.minus(Math.min(3, warns * 0.5), `${warns} atribuicoes a innerHTML fora da allowlist revisada`);
    if (r.details?.npmAudit?.status === STATUS.SKIP)
      b.minus(1, 'npm audit nao rodou nesta execucao, entao nao ha varredura de CVE nas dependencias de producao');
    b.minus(
      1,
      'os gates sao estaticos: nenhum teste tenta escapar do interpretador na pratica (fuzzing de expressao, prototype pollution via v-model, XSS via v-html com payload real)'
    );
    return b.done();
  },

  accessibility(r) {
    const total = r.details?.components?.length ?? 0;
    const clean = r.details?.componentsWithoutGaps ?? 0;
    if (!total) return build(0).because('nenhum componente analisado').done();
    const b = build(10).because(`${clean} de ${total} componentes sem lacuna no padrao WAI-ARIA`);
    const gaps = warnCount(r);
    if (gaps) b.minus(Math.min(6, gaps * 0.4), `${gaps} lacunas de role, aria, foco ou teclado`);
    b.minus(
      1.5,
      'a analise e textual: nao mede contraste, ordem de leitura, nome acessivel calculado nem comportamento real de leitor de tela'
    );
    return b.done();
  },

  bundle(r) {
    if (r.status === STATUS.SKIP) return build(0).because('dist ausente').done();

    const rows = (r.details?.sizes?.rows ?? []).filter((row) => row.budgetKb != null);
    const sizeLine = rows.length
      ? rows.map((row) => `${row.file}: ${row.gzipKb} KB de ${row.budgetKb} KB`).join('; ')
      : null;

    if (r.status === STATUS.FAIL) {
      const b = build(2);
      if (sizeLine) b.because(sizeLine);
      for (const f of (r.findings ?? []).filter((x) => x.level === 'fail'))
        b.because(`${f.message}${f.actual ? ` — ${f.actual}` : ''}`);
      return b.done();
    }

    const b = build(10);
    if (sizeLine) b.because(sizeLine);
    const warns = warnCount(r);
    if (warns) b.minus(Math.min(4, warns * 0.5), `${warns} avisos de empacotamento`);
    const share = parseFloat(r.details?.pack?.sourcemapShareOfUnpacked ?? '0');
    if (share > 50)
      b.minus(
        1,
        `sourcemaps sao ${r.details.pack.sourcemapShareOfUnpacked} do conteudo desempacotado do tarball (${r.details.pack.unpackedKb} KB)`
      );
    const semMeta = (r.details?.sizes?.rows ?? []).filter((row) => row.budgetKb == null).length;
    if (semMeta)
      b.minus(0.5, `${semMeta} artefatos publicados sem meta de tamanho declarada em scripts/size.mjs`);
    return b.done();
  },

  performance(r) {
    if (r.status === STATUS.SKIP) {
      // There are two different SKIPs and they are not worth the same score:
      // having no measurement at all is worse than having a measurement with
      // no baseline.
      const measured = r.details?.measurements ?? 0;
      if (measured)
        return build(3)
          .because(
            `${measured} medicoes existem em benchmarks/results/latest.json, mas nao ha baseline.json para comparar: da para ver o numero de hoje e nao da para detectar regressao`
          )
          .done();
      return build(0)
        .because(
          'nenhuma medicao de desempenho existe no repositorio. Sem benchmarks/results/latest.json nao ha o que comparar, e este relatorio nao inventa numero'
        )
        .done();
    }
    if (r.status === STATUS.FAIL) return build(2).because(`${failCount(r)} regressoes`).done();
    if (r.status === STATUS.WARN) return build(6).because(`${warnCount(r)} medicoes piorando`).done();
    return build(8)
      .because(`${r.details?.comparisons?.length ?? 0} medicoes dentro do orcamento`)
      .done();
  },

  memory(r) {
    if (r.status === STATUS.SKIP)
      return build(0)
        .because(
          'nao existe teste de vazamento. O framework cria effects, listeners e MutationObservers por elemento; sem um teste que monte e desmonte em ciclo, a ausencia de vazamento e so uma suposicao'
        )
        .done();
    if (r.status === STATUS.FAIL) return build(2).because('teste de vazamento falhando').done();
    return build(8).because(`${r.details?.passed}/${r.details?.total} testes de vazamento passando`).done();
  },

  'api-compatibility'(r) {
    if (r.status === STATUS.FAIL)
      return build(1).because(`${failCount(r)} quebras de compatibilidade`).done();
    if (r.status === STATUS.SKIP)
      return build(2).because('nao ha snapshot commitado; a API publica nao esta protegida').done();
    const c = r.details?.counts ?? {};
    return build(10)
      .because(
        `${c.V} chaves de V, ${c.exports} exports, ${c.directives} directives e ${c.magics} magics sob vigilancia, lidos do bundle real (metodo: ${r.details?.method})`
      )
      .minus(
        2,
        'o snapshot registra nome e forma (function, class, object), nao assinatura: trocar a ordem dos parametros de uma funcao passa despercebido'
      )
      .done();
  },

  docs(r) {
    const broken = r.details?.links?.broken?.length ?? 0;
    const examples = r.details?.examples ?? {};
    const b = build(10).because(
      `${r.details?.links?.relativeLinksChecked ?? 0} links relativos e ${examples.blocksParsed ?? 0} exemplos verificados`
    );
    if (broken) b.minus(Math.min(6, broken * 0.35), `${broken} links relativos quebrados`);
    if (examples.broken) b.minus(Math.min(3, examples.broken), `${examples.broken} exemplos do README nao compilam`);
    if (!r.details?.siteDocsMarkdownFiles)
      b.minus(1, 'a documentacao publicada em site/docs e HTML gerado; os links dentro dela nao passam por este check');
    return b.done();
  },

  'dead-code'(r) {
    const deadRuntime = r.details?.deadRuntime?.length ?? 0;
    const internal = r.details?.exportedButInternalRuntime?.length ?? 0;
    const types = (r.details?.deadTypes?.length ?? 0) + (r.details?.exportedButInternalTypes?.length ?? 0);
    const testOnly = r.details?.testOnly?.length ?? 0;
    const total = r.details?.totalExports ?? 0;
    const b = build(10).because(`${total} exports analisados em ${r.details?.filesScanned} arquivos`);
    if (deadRuntime)
      b.minus(Math.min(4, deadRuntime * 0.4), `${deadRuntime} exports sem nenhuma referencia: peso morto no bundle`);
    if (internal)
      b.minus(Math.min(2, internal * 0.1), `${internal} exports que so o proprio modulo usa (superficie publica inflada)`);
    if (types)
      b.minus(Math.min(1.5, types * 0.02), `${types} tipos exportados que nao chegam a quem instala o pacote`);
    if (testOnly) b.minus(Math.min(1, testOnly * 0.15), `${testOnly} exports usados so pela suite de testes`);
    return b.done();
  },
};

/** Default score when there is no specific rule for the check. */
function fallback(r) {
  const base = { PASS: 8, WARN: 5, SKIP: 2, FAIL: 1 }[r.status] ?? 5;
  return build(base).because(`derivado do status ${r.status}, sem regra especifica`).done();
}

/** Computes the score of each dimension and the overall average. */
export function scoreAll(results, ctx) {
  const rows = [];
  for (const entry of results) {
    const scorer = SCORERS[entry.id] ?? fallback;
    const { score, reasons } = scorer(entry.result, ctx);
    rows.push({ id: entry.id, label: entry.label, status: entry.result.status, score, reasons });
  }
  const overall = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + r.score, 0) / rows.length) * 10) / 10
    : 0;
  return { rows, overall };
}
