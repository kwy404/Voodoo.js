# Voodoo.js Quality Report

Gerado por `npm run quality -- --report`. Todo numero deste arquivo saiu da execucao descrita abaixo. Onde a ferramenta nao existia no ambiente, o resultado e `SKIP` com a instrucao de como habilitar — nunca um `PASS` de conveniencia.

## Execucao

| campo | valor |
| --- | --- |
| data | 2026-08-31T18:07:49.749Z |
| commit | `a2f86318e3df150658f9d8c0ed8addcccd98682d` (arvore de trabalho com alteracoes nao commitadas) |
| branch | `main` |
| pacote | voodoojs 0.1.0 |
| node | v24.16.0 |
| plataforma | win32 x64 |
| checks | 13 (5 PASS, 2 WARN, 2 FAIL, 4 SKIP) |

## Resumo

```
Voodoo.js Quality Report

  Correctness ........ PASS  (455/455 testes em 20 arquivos)
  Unit Tests ......... SKIP  (a suite nao marca testes de unidade)
  Integration ........ SKIP  (a suite nao marca testes de integracao)
  Browser Tests ...... SKIP  (no browser runner installed)
  TypeScript ......... PASS  (src ok + 9 usos da API tipados contra dist/*.d.ts)
  Security ........... PASS  (49 arquivos varridos, sem eval/Function, 16 excecoes de innerHTML revisadas, bundles compativeis com CSP)
  Accessibility ...... WARN  (8 findings em 7 de 11 componentes)
  Bundle ............. FAIL  (2 falhas, 2 avisos)
  Performance ........ SKIP  (22 medicoes, sem baseline para comparar)
  Memory ............. PASS  (23/23 em 1 arquivos de vazamento)
  API Compatibility .. PASS  (163 chaves em V, 156 exports, 257 directives, 40 magics)
  Docs ............... FAIL  (4 broken links)
  Dead Code .......... WARN  (21 mortos, 25 exports desnecessarios, 66 tipos (de 253 exports))
```

## Scorecard

**Nota geral: 5.3 / 10** (media simples das dimensoes abaixo)

| dimensao | status | nota | justificativa |
| --- | --- | --- | --- |
| Correctness | PASS | **8.0** | 455 de 455 testes passando em 20 arquivos<br>-2 cobertura nao medida: @vitest/coverage-v8 nao esta instalado, entao nao ha como dizer QUAL parte do codigo os testes tocam |
| Unit Tests | SKIP | **3.0** | a suite nao distingue teste unitario de teste de integracao, entao nao da para afirmar que a camada de unidade esta coberta |
| Integration | SKIP | **3.0** | nenhum teste marcado como integracao; a suite atual mistura as camadas num diretorio so |
| Browser Tests | SKIP | **1.0** | nenhuma verificacao em navegador real. O jsdom cobre estrutura de DOM, mas nao layout, foco real, eventos de ponteiro, CSS aplicado nem o comportamento do bundle de CDN carregado por <script> |
| TypeScript | PASS | **9.0** | src compila e 9 usos da API publica tipam contra os .d.ts de dist<br>-1 noUncheckedIndexedAccess: false em tsconfig.base.json — indexar array devolve T em vez de T \| undefined, e o compilador nao ajuda contra acesso fora do limite |
| Security | PASS | **9.0** | sem eval, sem new Function e sem setTimeout com string no fonte; allowedGlobals nao expoe window, document, fetch nem Function; nenhum bundle de dist contem chamada dinamica de compilacao<br>-1 os gates sao estaticos: nenhum teste tenta escapar do interpretador na pratica (fuzzing de expressao, prototype pollution via v-model, XSS via v-html com payload real) |
| Accessibility | WARN | **5.3** | 4 de 11 componentes sem lacuna no padrao WAI-ARIA<br>-3.2 8 lacunas de role, aria, foco ou teclado<br>-1.5 a analise e textual: nao mede contraste, ordem de leitura, nome acessivel calculado nem comportamento real de leitor de tela |
| Bundle | FAIL | **2.0** | voodoo.full.min.js: 127.48 KB de 125 KB; voodoo.min.js: 80.81 KB de 80 KB<br>Bundle acima da meta de tamanho: voodoo.full.min.js — 127.48 KB gzip<br>Bundle acima da meta de tamanho: voodoo.min.js — 80.81 KB gzip |
| Performance | SKIP | **3.0** | 22 medicoes existem em benchmarks/results/latest.json, mas nao ha baseline.json para comparar: da para ver o numero de hoje e nao da para detectar regressao |
| Memory | PASS | **8.0** | 23/23 testes de vazamento passando |
| API Compatibility | PASS | **8.0** | 163 chaves de V, 156 exports, 257 directives e 40 magics sob vigilancia, lidos do bundle real (metodo: runtime)<br>-2 o snapshot registra nome e forma (function, class, object), nao assinatura: trocar a ordem dos parametros de uma funcao passa despercebido |
| Docs | FAIL | **7.6** | 483 links relativos e 20 exemplos verificados<br>-1.4 4 links relativos quebrados<br>-1 a documentacao publicada em site/docs e HTML gerado; os links dentro dela nao passam por este check |
| Dead Code | WARN | **2.5** | 253 exports analisados em 49 arquivos<br>-4 21 exports sem nenhuma referencia: peso morto no bundle<br>-2 25 exports que so o proprio modulo usa (superficie publica inflada)<br>-1.32 66 tipos exportados que nao chegam a quem instala o pacote<br>-0.15 1 exports usados so pela suite de testes |

## Achados por check

### Correctness — PASS

455/455 testes em 20 arquivos

<details><summary>Evidencia coletada</summary>

```json
{
  "tests": 455,
  "passed": 455,
  "failed": 0,
  "skipped": 0,
  "files": 20
}
```

</details>

### Unit Tests — SKIP

a suite nao marca testes de unidade

<details><summary>Notas informativas</summary>

- Nenhum arquivo de teste identificavel como "unidade". Os 20 arquivos da suite vivem todos em packages/voodoojs/test/ sem pasta ou sufixo que separe as camadas, entao este check nao tem como afirmar nada e nao vai fingir que tem. — 20 arquivos sem classificacao

</details>

**Como habilitar:** mova os testes puros para packages/voodoojs/test/unit/ ou renomeie para *.unit.test.ts

<details><summary>Evidencia coletada</summary>

```json
{
  "howToEnable": "mova os testes puros para packages/voodoojs/test/unit/ ou renomeie para *.unit.test.ts",
  "allTestFiles": [
    "packages/voodoojs/test/acessibilidade.test.ts",
    "packages/voodoojs/test/app.test.ts",
    "packages/voodoojs/test/bind.test.ts",
    "packages/voodoojs/test/cleanup-contract.test.ts",
    "packages/voodoojs/test/devtools-widget.test.ts",
    "packages/voodoojs/test/directives.test.ts",
    "packages/voodoojs/test/expressoes-malformadas.test.ts",
    "packages/voodoojs/test/http.test.ts",
    "packages/voodoojs/test/interpolacao.test.ts",
    "packages/voodoojs/test/memoria.test.ts",
    "packages/voodoojs/test/parser.test.ts",
    "packages/voodoojs/test/reactivity.test.ts",
    "packages/voodoojs/test/regressao-ordem-montagem.test.ts",
    "packages/voodoojs/test/regressao.test.ts",
    "packages/voodoojs/test/security.test.ts",
    "packages/voodoojs/test/sound.test.ts",
    "packages/voodoojs/test/state.test.ts",
    "packages/voodoojs/test/ui.test.ts",
    "packages/voodoojs/test/utils.test.ts",
    "packages/voodoojs/test/xss.test.ts"
  ],
  "classified": 0
}
```

</details>

### Integration — SKIP

a suite nao marca testes de integracao

<details><summary>Notas informativas</summary>

- Nenhum arquivo de teste identificavel como "integracao". Os 20 arquivos da suite vivem todos em packages/voodoojs/test/ sem pasta ou sufixo que separe as camadas, entao este check nao tem como afirmar nada e nao vai fingir que tem. — 20 arquivos sem classificacao

</details>

**Como habilitar:** mova os testes que montam DOM + directives + http para packages/voodoojs/test/integration/ ou renomeie para *.integration.test.ts

<details><summary>Evidencia coletada</summary>

```json
{
  "howToEnable": "mova os testes que montam DOM + directives + http para packages/voodoojs/test/integration/ ou renomeie para *.integration.test.ts",
  "allTestFiles": [
    "packages/voodoojs/test/acessibilidade.test.ts",
    "packages/voodoojs/test/app.test.ts",
    "packages/voodoojs/test/bind.test.ts",
    "packages/voodoojs/test/cleanup-contract.test.ts",
    "packages/voodoojs/test/devtools-widget.test.ts",
    "packages/voodoojs/test/directives.test.ts",
    "packages/voodoojs/test/expressoes-malformadas.test.ts",
    "packages/voodoojs/test/http.test.ts",
    "packages/voodoojs/test/interpolacao.test.ts",
    "packages/voodoojs/test/memoria.test.ts",
    "packages/voodoojs/test/parser.test.ts",
    "packages/voodoojs/test/reactivity.test.ts",
    "packages/voodoojs/test/regressao-ordem-montagem.test.ts",
    "packages/voodoojs/test/regressao.test.ts",
    "packages/voodoojs/test/security.test.ts",
    "packages/voodoojs/test/sound.test.ts",
    "packages/voodoojs/test/state.test.ts",
    "packages/voodoojs/test/ui.test.ts",
    "packages/voodoojs/test/utils.test.ts",
    "packages/voodoojs/test/xss.test.ts"
  ],
  "classified": 0
}
```

</details>

### Browser Tests — SKIP

no browser runner installed

**Como habilitar:** instale um runner de navegador (npm i -D playwright && npx playwright install chromium, ou npm i -D puppeteer) e rode npm run quality de novo; este check passa a subir um Chromium de verdade contra dist/voodoo.min.js

<details><summary>Evidencia coletada</summary>

```json
{
  "howToEnable": "instale um runner de navegador (npm i -D playwright && npx playwright install chromium, ou npm i -D puppeteer) e rode npm run quality de novo; este check passa a subir um Chromium de verdade contra dist/voodoo.min.js",
  "checked": [
    "playwright",
    "puppeteer"
  ]
}
```

</details>

### TypeScript — PASS

src ok + 9 usos da API tipados contra dist/*.d.ts

<details><summary>Evidencia coletada</summary>

```json
{
  "source": {
    "command": "tsc -p packages/voodoojs/tsconfig.json --noEmit",
    "exitCode": 0,
    "errors": 0
  },
  "definitions": {
    "entry": "packages/voodoojs/dist/index.d.ts",
    "testFile": "gerado em tempo de execucao (scratch)/types.test.ts",
    "apiExercised": [
      "V.reactive",
      "V.ref",
      "V.computed",
      "V.http.get",
      "V.store",
      "V.component",
      "V.directive",
      "V.use",
      "V() (colecao)"
    ],
    "exitCode": 0,
    "errors": 0
  }
}
```

</details>

### Security — PASS

49 arquivos varridos, sem eval/Function, 16 excecoes de innerHTML revisadas, bundles compativeis com CSP

<details><summary>Notas informativas</summary>

- Excecao de innerHTML aceita: html.join('') (`packages/voodoojs/src/charts/index.ts:1348`) — SVG montado pelo proprio modulo de graficos a partir de numeros e rotulos escapados.
- Excecao de innerHTML aceita: tooltipHtml(hit, state.options.format ?? 'number') (`packages/voodoojs/src/charts/index.ts:1418`) — tooltip montado internamente pelo modulo de graficos.
- Excecao de innerHTML aceita: MARCA (`packages/voodoojs/src/devtools/launcher.ts:263`) — constante de SVG da marca, embutida no modulo.
- Excecao de innerHTML aceita: value == null ? '' : String(value) (`packages/voodoojs/src/directives/core.ts:99`) — v-html. O opt-in explicito do autor da pagina para injetar HTML, mesmo contrato do x-html do Alpine e do v-html do Vue. Documentado em docs/seguranca.md.
- Excecao de innerHTML aceita: data (`packages/voodoojs/src/directives/forms.ts:440`) — resposta HTML do proprio backend em <template> inerte antes de virar nos.
- Excecao de innerHTML aceita: html (`packages/voodoojs/src/directives/http.ts:160`) — troca hipermidia (v-get/v-post): o HTML vem do proprio backend da aplicacao, mesma origem de confianca do htmx.
- Excecao de innerHTML aceita: html (`packages/voodoojs/src/directives/http.ts:196`) — troca hipermidia (v-get/v-post): o HTML vem do proprio backend da aplicacao, mesma origem de confianca do htmx.
- Excecao de innerHTML aceita: html.trim() (`packages/voodoojs/src/dom/query.ts:113`) — parseHtml() em <template>: o template e inerte (nao executa script nem carrega recurso) e serve so para converter a string do proprio autor em nos.
- Excecao de innerHTML aceita: text (`packages/voodoojs/src/dom/query.ts:552`) — V(sel).html(valor): API imperativa equivalente ao v-html, chamada pelo autor.
- Excecao de innerHTML aceita: html ?? fallbackHtml (`packages/voodoojs/src/router/index.ts:886`) — pagina do roteador, vinda do backend da aplicacao ou de template do autor.
- Excecao de innerHTML aceita: htmlOriginal (`packages/voodoojs/src/runtime/app.ts:241`) — restaura no unmount o HTML capturado do proprio DOM inicial; nao ha dado externo.
- Excecao de innerHTML aceita: definition.template (`packages/voodoojs/src/runtime/component.ts:508`) — template do componente, escrito pelo autor no proprio codigo-fonte.
- Excecao de innerHTML aceita: ICONS.close (`packages/voodoojs/src/ui/dialog.ts:430`) — constante de SVG do proprio modulo.
- Excecao de innerHTML aceita: ICONS[iconName] (`packages/voodoojs/src/ui/dialog.ts:727`) — constante de SVG do proprio modulo, indexada por nome fechado.
- Excecao de innerHTML aceita: options.html (`packages/voodoojs/src/ui/dialog.ts:760`) — opcao html do dialogo: opt-in explicito de quem chama V.modal/V.dialog.
- Excecao de innerHTML aceita: current.html (`packages/voodoojs/src/ui/toast.ts:165`) — opcao html do toast: opt-in explicito de quem chama V.toast.

</details>

<details><summary>Evidencia coletada</summary>

```json
{
  "sourcePatterns": {
    "filesScanned": 49,
    "innerHtmlSites": 20,
    "allowlisted": [
      {
        "file": "packages/voodoojs/src/charts/index.ts",
        "line": 1348,
        "rhs": "html.join('')",
        "reason": "SVG montado pelo proprio modulo de graficos a partir de numeros e rotulos escapados."
      },
      {
        "file": "packages/voodoojs/src/charts/index.ts",
        "line": 1418,
        "rhs": "tooltipHtml(hit, state.options.format ?? 'number')",
        "reason": "tooltip montado internamente pelo modulo de graficos."
      },
      {
        "file": "packages/voodoojs/src/devtools/launcher.ts",
        "line": 263,
        "rhs": "MARCA",
        "reason": "constante de SVG da marca, embutida no modulo."
      },
      {
        "file": "packages/voodoojs/src/directives/core.ts",
        "line": 99,
        "rhs": "value == null ? '' : String(value)",
        "reason": "v-html. O opt-in explicito do autor da pagina para injetar HTML, mesmo contrato do x-html do Alpine e do v-html do Vue. Documentado em docs/seguranca.md."
      },
      {
        "file": "packages/voodoojs/src/directives/forms.ts",
        "line": 440,
        "rhs": "data",
        "reason": "resposta HTML do proprio backend em <template> inerte antes de virar nos."
      },
      {
        "file": "packages/voodoojs/src/directives/http.ts",
        "line": 160,
        "rhs": "html",
        "reason": "troca hipermidia (v-get/v-post): o HTML vem do proprio backend da aplicacao, mesma origem de confianca do htmx."
      },
      {
        "file": "packages/voodoojs/src/directives/http.ts",
        "line": 196,
        "rhs": "html",
        "reason": "troca hipermidia (v-get/v-post): o HTML vem do proprio backend da aplicacao, mesma origem de confianca do htmx."
      },
      {
        "file": "packages/voodoojs/src/dom/query.ts",
        "line": 113,
        "rhs": "html.trim()",
        "reason": "parseHtml() em <template>: o template e inerte (nao executa script nem carrega recurso) e serve so para converter a string do proprio autor em nos."
      },
      {
        "file": "packages/voodoojs/src/dom/query.ts",
        "line": 552,
        "rhs": "text",
        "reason": "V(sel).html(valor): API imperativa equivalente ao v-html, chamada pelo autor."
      },
      {
        "file": "packages/voodoojs/src/router/index.ts",
        "line": 886,
        "rhs": "html ?? fallbackHtml",
        "reason": "pagina do roteador, vinda do backend da aplicacao ou de template do autor."
      },
      {
        "file": "packages/voodoojs/src/runtime/app.ts",
        "line": 241,
        "rhs": "htmlOriginal",
        "reason": "restaura no unmount o HTML capturado do proprio DOM inicial; nao ha dado externo."
      },
      {
        "file": "packages/voodoojs/src/runtime/component.ts",
        "line": 508,
        "rhs": "definition.template",
        "reason": "template do componente, escrito pelo autor no proprio codigo-fonte."
      },
      {
        "file": "packages/voodoojs/src/ui/dialog.ts",
        "line": 430,
        "rhs": "ICONS.close",
        "reason": "constante de SVG do proprio modulo."
      },
      {
        "file": "packages/voodoojs/src/ui/dialog.ts",
        "line": 727,
        "rhs": "ICONS[iconName]",
        "reason": "constante de SVG do proprio modulo, indexada por nome fechado."
      },
      {
        "file": "packages/voodoojs/src/ui/dialog.ts",
        "line": 760,
        "rhs": "options.html",
        "reason": "opcao html do dialogo: opt-in explicito de quem chama V.modal/V.dialog."
      },
      {
        "file": "packages/voodoojs/src/ui/toast.ts",
        "line": 165,
        "rhs": "current.html",
        "reason": "opcao html do toast: opt-in explicito de quem chama V.toast."
      }
    ],
    "prohibited": [
      "eval",
      "new-function",
      "function-constructor",
      "settimeout-string"
    ]
  },
  "allowedGlobals": {
    "file": "packages/voodoojs/src/parser/interpreter.ts",
    "exposed": [
      "Math",
      "JSON",
      "Date",
      "Number",
      "String",
      "Boolean",
      "Array",
      "Object",
      "Intl",
      "RegExp",
      "Promise",
      "parseInt",
      "parseFloat",
      "isNaN",
      "isFinite",
      "encodeURIComponent",
      "decodeURIComponent",
      "console"
    ],
    "forbiddenChecked": [
      "window",
      "globalThis",
      "self",
      "top",
      "parent",
      "document",
      "fetch",
      "eval",
      "Function",
      "XMLHttpRequest",
      "WebSocket",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "navigator",
      "location",
      "history",
      "import",
      "require",
      "process",
      "Worker",
      "importScripts"
    ]
  },
  "csp": {
    "status": "PASS",
    "bundlesScanned": 23,
    "files": [
      "packages/voodoojs/dist/chunk-5V56KGIJ.js",
      "packages/voodoojs/dist/chunk-ABAHVFPX.js",
      "packages/voodoojs/dist/chunk-AOX35K2N.js",
      "packages/voodoojs/dist/chunk-ECGTKQCT.js",
      "packages/voodoojs/dist/chunk-UNO6H5ZW.js",
      "packages/voodoojs/dist/chunk-WCQZFFOE.js",
      "packages/voodoojs/dist/essential.cjs",
      "packages/voodoojs/dist/essential.js",
      "packages/voodoojs/dist/http.cjs",
      "packages/voodoojs/dist/http.js",
      "packages/voodoojs/dist/index.cjs",
      "packages/voodoojs/dist/index.js",
      "packages/voodoojs/dist/reactivity.cjs",
      "packages/voodoojs/dist/reactivity.js",
      "packages/voodoojs/dist/style-UJ5QAZRX.js",
      "packages/voodoojs/dist/utils.cjs",
      "packages/voodoojs/dist/utils.js",
      "packages/voodoojs/dist/voodoo.core.js",
      "packages/voodoojs/dist/voodoo.core.min.js",
      "packages/voodoojs/dist/voodoo.full.js",
      "packages/voodoojs/dist/voodoo.full.min.js",
      "packages/voodoojs/dist/voodoo.js",
      "packages/voodoojs/dist/voodoo.min.js"
    ]
  },
  "npmAudit": {
    "status": "PASS",
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    }
  }
}
```

</details>

### Accessibility — WARN

8 findings em 7 de 11 componentes

| nivel | onde | problema | esperado | obtido |
| --- | --- | --- | --- | --- |
| WARN | `packages/voodoojs/src/directives/ui.ts:1200` | drawer: falta aria: aria-labelledby | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | secao "v-drawer, v-drawer-content, v-drawer-close e v-offcanvas" nao emite aria: aria-labelledby |
| WARN | `packages/voodoojs/src/directives/ui.ts:1200` | drawer: falta prefers-reduced-motion | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | secao "v-drawer, v-drawer-content, v-drawer-close e v-offcanvas" nao emite prefers-reduced-motion |
| WARN | `packages/voodoojs/src/directives/ui.ts:710` | dropdown: falta teclado: Enter | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) | secao "v-dropdown, v-dropdown-menu e v-popover" nao emite teclado: Enter |
| WARN | `packages/voodoojs/src/directives/ui.ts:934` | tooltip: falta foco: focus() | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) | secao "v-tooltip" nao emite foco: focus() |
| WARN | `packages/voodoojs/src/directives/ui.ts:1020` | tabs: falta aria: aria-orientation | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | secao "v-tabs, v-tab e v-tab-panel" nao emite aria: aria-orientation |
| WARN | `packages/voodoojs/src/directives/ui.ts:1120` | accordion: falta aria: aria-expanded, aria-controls | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) | secao "v-accordion e v-accordion-item" nao emite aria: aria-expanded, aria-controls |
| WARN | `packages/voodoojs/src/directives/ui.ts:2172` | command palette: falta foco: focus trap | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) | secao "v-command e v-command-item" nao emite foco: focus trap |
| WARN | `packages/voodoojs/src/ui/toast.ts:1` | toast: falta aria: aria-atomic | padrao WAI-ARIA APG (https://www.w3.org/WAI/ARIA/apg/patterns/alert/) | secao "packages/voodoojs/src/ui/toast.ts" nao emite aria: aria-atomic |

<details><summary>Evidencia coletada</summary>

```json
{
  "method": "analise estatica de texto: roles, atributos aria-*, chamadas de foco, nomes de tecla e prefers-reduced-motion dentro da secao de cada componente",
  "limitation": "nao executa a pagina; nao mede contraste, ordem de leitura nem comportamento real de leitor de tela",
  "componentsWithoutGaps": 4,
  "components": [
    {
      "component": "modal",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "section": "packages/voodoojs/src/ui/dialog.ts",
      "line": 1,
      "has": {
        "roles": [
          "alert",
          "alertdialog",
          "danger",
          "dialog"
        ],
        "aria": [
          "aria-describedby",
          "aria-haspopup",
          "aria-hidden",
          "aria-invalid",
          "aria-label",
          "aria-labelledby",
          "aria-modal"
        ],
        "focus": [
          "devolve o foco",
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "Enter",
          "Escape",
          "Tab"
        ],
        "prefersReducedMotion": true
      },
      "missing": [],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    },
    {
      "component": "dialog",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "section": "packages/voodoojs/src/ui/dialog.ts",
      "line": 1,
      "has": {
        "roles": [
          "alert",
          "alertdialog",
          "danger",
          "dialog"
        ],
        "aria": [
          "aria-describedby",
          "aria-haspopup",
          "aria-hidden",
          "aria-invalid",
          "aria-label",
          "aria-labelledby",
          "aria-modal"
        ],
        "focus": [
          "devolve o foco",
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "Enter",
          "Escape",
          "Tab"
        ],
        "prefersReducedMotion": true
      },
      "missing": [],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/"
    },
    {
      "component": "drawer",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-drawer, v-drawer-content, v-drawer-close e v-offcanvas",
      "line": 1200,
      "has": {
        "roles": [
          "dialog"
        ],
        "aria": [
          "aria-controls",
          "aria-expanded",
          "aria-haspopup",
          "aria-label",
          "aria-modal"
        ],
        "focus": [
          "devolve o foco",
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "Escape",
          "Tab"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "aria: aria-labelledby",
        "prefers-reduced-motion"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    },
    {
      "component": "dropdown",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-dropdown, v-dropdown-menu e v-popover",
      "line": 710,
      "has": {
        "roles": [
          "dialog",
          "menu",
          "menuitem"
        ],
        "aria": [
          "aria-controls",
          "aria-expanded",
          "aria-haspopup"
        ],
        "focus": [
          "devolve o foco",
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "ArrowDown",
          "ArrowUp",
          "End",
          "Escape",
          "Home",
          "Tab"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "teclado: Enter"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/"
    },
    {
      "component": "popover",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-dropdown, v-dropdown-menu e v-popover",
      "line": 710,
      "has": {
        "roles": [
          "dialog",
          "menu",
          "menuitem"
        ],
        "aria": [
          "aria-controls",
          "aria-expanded",
          "aria-haspopup"
        ],
        "focus": [
          "devolve o foco",
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "ArrowDown",
          "ArrowUp",
          "End",
          "Escape",
          "Home",
          "Tab"
        ],
        "prefersReducedMotion": false
      },
      "missing": [],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/"
    },
    {
      "component": "tooltip",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-tooltip",
      "line": 934,
      "has": {
        "roles": [
          "tooltip"
        ],
        "aria": [
          "aria-describedby"
        ],
        "focus": [],
        "keys": [
          "Escape"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "foco: focus()"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/"
    },
    {
      "component": "tabs",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-tabs, v-tab e v-tab-panel",
      "line": 1020,
      "has": {
        "roles": [
          "tab",
          "tablist",
          "tabpanel"
        ],
        "aria": [
          "aria-controls",
          "aria-labelledby",
          "aria-selected"
        ],
        "focus": [
          "focus()",
          "tabindex"
        ],
        "keys": [
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "End",
          "Home"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "aria: aria-orientation"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/tabs/"
    },
    {
      "component": "accordion",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-accordion e v-accordion-item",
      "line": 1120,
      "has": {
        "roles": [
          "button"
        ],
        "aria": [],
        "focus": [
          "focus()",
          "tabindex"
        ],
        "keys": [
          "ArrowDown",
          "ArrowUp",
          "End",
          "Enter",
          "Home",
          "Space"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "aria: aria-expanded, aria-controls"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/accordion/"
    },
    {
      "component": "command palette",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "section": "v-command e v-command-item",
      "line": 2172,
      "has": {
        "roles": [
          "combobox",
          "dialog",
          "listbox",
          "option"
        ],
        "aria": [
          "aria-activedescendant",
          "aria-controls",
          "aria-expanded",
          "aria-keyshortcuts",
          "aria-label",
          "aria-modal",
          "aria-selected"
        ],
        "focus": [
          "devolve o foco",
          "focus()"
        ],
        "keys": [
          "ArrowDown",
          "ArrowUp",
          "Enter",
          "Escape",
          "Tab"
        ],
        "prefersReducedMotion": false
      },
      "missing": [
        "foco: focus trap"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/combobox/"
    },
    {
      "component": "toast",
      "file": "packages/voodoojs/src/ui/toast.ts",
      "section": "packages/voodoojs/src/ui/toast.ts",
      "line": 1,
      "has": {
        "roles": [
          "alert",
          "error",
          "region",
          "status"
        ],
        "aria": [
          "aria-hidden",
          "aria-label",
          "aria-live"
        ],
        "focus": [],
        "keys": [],
        "prefersReducedMotion": true
      },
      "missing": [
        "aria: aria-atomic"
      ],
      "apg": "https://www.w3.org/WAI/ARIA/apg/patterns/alert/"
    },
    {
      "component": "biblioteca de componentes",
      "file": "packages/voodoojs/src/ui/components.ts",
      "section": "packages/voodoojs/src/ui/components.ts",
      "line": 1,
      "has": {
        "roles": [
          "alert",
          "button",
          "combobox",
          "img",
          "isSearchable",
          "listbox",
          "liveRole",
          "option",
          "progressbar",
          "separator",
          "slider",
          "status",
          "switch",
          "tooltip"
        ],
        "aria": [
          "aria-activedescendant",
          "aria-autocomplete",
          "aria-busy",
          "aria-checked",
          "aria-controls",
          "aria-current",
          "aria-describedby",
          "aria-disabled",
          "aria-expanded",
          "aria-haspopup",
          "aria-hidden",
          "aria-invalid",
          "aria-label",
          "aria-labelledby",
          "aria-multiselectable",
          "aria-orientation",
          "aria-readonly",
          "aria-selected",
          "aria-sort",
          "aria-valuemax",
          "aria-valuemin",
          "aria-valuenow",
          "aria-valuetext"
        ],
        "focus": [
          "focus trap",
          "focus()",
          "tabindex"
        ],
        "keys": [
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "End",
          "Enter",
          "Escape",
          "Home",
          "Space",
          "Tab"
        ],
        "prefersReducedMotion": true
      },
      "missing": [],
      "apg": "https://www.w3.org/WAI/ARIA/apg/"
    }
  ]
}
```

</details>

### Bundle — FAIL

2 falhas, 2 avisos

| nivel | onde | problema | esperado | obtido |
| --- | --- | --- | --- | --- |
| FAIL | `packages/voodoojs/dist/voodoo.full.min.js` | Bundle acima da meta de tamanho: voodoo.full.min.js | <= 125 KB gzip (meta declarada em scripts/size.mjs) | 127.48 KB gzip |
| FAIL | `packages/voodoojs/dist/voodoo.min.js` | Bundle acima da meta de tamanho: voodoo.min.js | <= 80 KB gzip (meta declarada em scripts/size.mjs) | 80.81 KB gzip |
| WARN | `packages/voodoojs/dist/chunk-5V56KGIJ.js` | 17 bundles com o comentario sourceMappingURL duplicado | um unico //# sourceMappingURL por arquivo | a linha aparece duas vezes em: chunk-5V56KGIJ.js, chunk-ABAHVFPX.js, chunk-AOX35K2N.js, chunk-ECGTKQCT.js, chunk-UNO6H5ZW.js, chunk-WCQZFFOE.js, essential.cjs, essential.js, http.cjs, http.js, index.cjs, index.js, reactivity.cjs, reactivity.js, style-UJ5QAZRX.js, utils.cjs, utils.js. Inofensivo para |
| WARN | `packages/voodoojs/package.json` | "files" declara "README.md", que nao existe no pacote | packages/voodoojs/README.md presente | ausente; o npm publica sem ele e nao avisa |

<details><summary>Evidencia coletada</summary>

```json
{
  "sizes": {
    "budgetSource": "scripts/size.mjs",
    "budget": {
      "voodoo.min.js": 80,
      "voodoo.full.min.js": 125
    },
    "rows": [
      {
        "file": "chunk-5V56KGIJ.js",
        "rawKb": 0.66,
        "gzipKb": 0.37,
        "brotliKb": 0.3,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "chunk-ABAHVFPX.js",
        "rawKb": 18.41,
        "gzipKb": 4.96,
        "brotliKb": 4.46,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "chunk-AOX35K2N.js",
        "rawKb": 393.35,
        "gzipKb": 95.63,
        "brotliKb": 77.88,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "chunk-ECGTKQCT.js",
        "rawKb": 2.94,
        "gzipKb": 1.38,
        "brotliKb": 1.14,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "chunk-UNO6H5ZW.js",
        "rawKb": 12.9,
        "gzipKb": 4.03,
        "brotliKb": 3.58,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "chunk-WCQZFFOE.js",
        "rawKb": 13.46,
        "gzipKb": 4.18,
        "brotliKb": 3.67,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "essential.cjs",
        "rawKb": 442.92,
        "gzipKb": 108.29,
        "brotliKb": 87.96,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "essential.js",
        "rawKb": 1.12,
        "gzipKb": 0.56,
        "brotliKb": 0.45,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "http.cjs",
        "rawKb": 14.26,
        "gzipKb": 4.42,
        "brotliKb": 3.9,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "http.js",
        "rawKb": 0.21,
        "gzipKb": 0.17,
        "brotliKb": 0.13,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "index.cjs",
        "rawKb": 697.25,
        "gzipKb": 165.96,
        "brotliKb": 132.67,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "index.js",
        "rawKb": 250.84,
        "gzipKb": 58.05,
        "brotliKb": 49.11,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "reactivity.cjs",
        "rawKb": 19.31,
        "gzipKb": 5.15,
        "brotliKb": 4.64,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "reactivity.js",
        "rawKb": 0.5,
        "gzipKb": 0.31,
        "brotliKb": 0.26,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "style-UJ5QAZRX.js",
        "rawKb": 0.19,
        "gzipKb": 0.15,
        "brotliKb": 0.12,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "utils.cjs",
        "rawKb": 12.47,
        "gzipKb": 3.89,
        "brotliKb": 3.46,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "utils.js",
        "rawKb": 0.47,
        "gzipKb": 0.31,
        "brotliKb": 0.27,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "voodoo.core.js",
        "rawKb": 264.63,
        "gzipKb": 63.5,
        "brotliKb": 53.46,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "voodoo.core.min.js",
        "rawKb": 127.34,
        "gzipKb": 44.12,
        "brotliKb": 38.76,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "voodoo.full.js",
        "rawKb": 749.89,
        "gzipKb": 170.77,
        "brotliKb": 135.6,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "voodoo.full.min.js",
        "rawKb": 421.93,
        "gzipKb": 127.48,
        "brotliKb": 106.29,
        "budgetKb": 125,
        "status": "ESTOUROU"
      },
      {
        "file": "voodoo.js",
        "rawKb": 483.92,
        "gzipKb": 112.67,
        "brotliKb": 91.11,
        "budgetKb": null,
        "status": "sem meta"
      },
      {
        "file": "voodoo.min.js",
        "rawKb": 249.7,
        "gzipKb": 80.81,
        "brotliKb": 68.62,
        "budgetKb": 80,
        "status": "ESTOUROU"
      }
    ]
  },
  "declaredPaths": [
    {
      "where": "main",
      "path": "./dist/index.cjs",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "module",
      "path": "./dist/index.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "types",
      "path": "./dist/index.d.ts",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "unpkg",
      "path": "./dist/voodoo.min.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "jsdelivr",
      "path": "./dist/voodoo.min.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "browser",
      "path": "./dist/voodoo.min.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\".\"][\"types\"]",
      "path": "./dist/index.d.ts",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\".\"][\"import\"]",
      "path": "./dist/index.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\".\"][\"require\"]",
      "path": "./dist/index.cjs",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./reactivity\"][\"types\"]",
      "path": "./dist/reactivity.d.ts",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./reactivity\"][\"import\"]",
      "path": "./dist/reactivity.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./reactivity\"][\"require\"]",
      "path": "./dist/reactivity.cjs",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./http\"][\"types\"]",
      "path": "./dist/http.d.ts",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./http\"][\"import\"]",
      "path": "./dist/http.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./http\"][\"require\"]",
      "path": "./dist/http.cjs",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./utils\"][\"types\"]",
      "path": "./dist/utils.d.ts",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./utils\"][\"import\"]",
      "path": "./dist/utils.js",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./utils\"][\"require\"]",
      "path": "./dist/utils.cjs",
      "wildcard": false,
      "exists": true
    },
    {
      "where": "exports[\"./dist/*\"]",
      "path": "./dist/*",
      "wildcard": true,
      "exists": true
    },
    {
      "where": "exports[\"./package.json\"]",
      "path": "./package.json",
      "wildcard": false,
      "exists": true
    }
  ],
  "sourcemaps": {
    "rows": [
      {
        "file": "chunk-5V56KGIJ.js",
        "map": "chunk-5V56KGIJ.js.map",
        "sources": 0,
        "sourcesContent": 0,
        "barrel": true,
        "ok": true
      },
      {
        "file": "chunk-ABAHVFPX.js",
        "map": "chunk-ABAHVFPX.js.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "chunk-AOX35K2N.js",
        "map": "chunk-AOX35K2N.js.map",
        "sources": 29,
        "sourcesContent": 29,
        "barrel": false,
        "ok": true
      },
      {
        "file": "chunk-ECGTKQCT.js",
        "map": "chunk-ECGTKQCT.js.map",
        "sources": 2,
        "sourcesContent": 2,
        "barrel": false,
        "ok": true
      },
      {
        "file": "chunk-UNO6H5ZW.js",
        "map": "chunk-UNO6H5ZW.js.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "chunk-WCQZFFOE.js",
        "map": "chunk-WCQZFFOE.js.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "essential.cjs",
        "map": "essential.cjs.map",
        "sources": 35,
        "sourcesContent": 35,
        "barrel": false,
        "ok": true
      },
      {
        "file": "essential.js",
        "map": "essential.js.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "http.cjs",
        "map": "http.cjs.map",
        "sources": 2,
        "sourcesContent": 2,
        "barrel": false,
        "ok": true
      },
      {
        "file": "http.js",
        "map": "http.js.map",
        "sources": 0,
        "sourcesContent": 0,
        "barrel": true,
        "ok": true
      },
      {
        "file": "index.cjs",
        "map": "index.cjs.map",
        "sources": 43,
        "sourcesContent": 43,
        "barrel": false,
        "ok": true
      },
      {
        "file": "index.js",
        "map": "index.js.map",
        "sources": 9,
        "sourcesContent": 9,
        "barrel": false,
        "ok": true
      },
      {
        "file": "reactivity.cjs",
        "map": "reactivity.cjs.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "reactivity.js",
        "map": "reactivity.js.map",
        "sources": 0,
        "sourcesContent": 0,
        "barrel": true,
        "ok": true
      },
      {
        "file": "style-UJ5QAZRX.js",
        "map": "style-UJ5QAZRX.js.map",
        "sources": 0,
        "sourcesContent": 0,
        "barrel": true,
        "ok": true
      },
      {
        "file": "utils.cjs",
        "map": "utils.cjs.map",
        "sources": 1,
        "sourcesContent": 1,
        "barrel": false,
        "ok": true
      },
      {
        "file": "utils.js",
        "map": "utils.js.map",
        "sources": 0,
        "sourcesContent": 0,
        "barrel": true,
        "ok": true
      },
      {
        "file": "voodoo.core.js",
        "map": "voodoo.core.js.map",
        "sources": 28,
        "sourcesContent": 28,
        "barrel": false,
        "ok": true
      },
      {
        "file": "voodoo.core.min.js",
        "map": "voodoo.core.min.js.map",
        "sources": 28,
        "sourcesContent": 28,
        "barrel": false,
        "ok": true
      },
      {
        "file": "voodoo.full.js",
        "map": "voodoo.full.js.map",
        "sources": 45,
        "sourcesContent": 45,
        "barrel": false,
        "ok": true
      },
      {
        "file": "voodoo.full.min.js",
        "map": "voodoo.full.min.js.map",
        "sources": 45,
        "sourcesContent": 45,
        "barrel": false,
        "ok": true
      },
      {
        "file": "voodoo.js",
        "map": "voodoo.js.map",
        "sources": 37,
        "sourcesContent": 37,
        "barrel": false,
        "ok": true
      },
      {
        "file": "voodoo.min.js",
        "map": "voodoo.min.js.map",
        "sources": 37,
        "sourcesContent": 37,
        "barrel": false,
        "ok": true
      }
    ],
    "duplicatedUrl": [
      "chunk-5V56KGIJ.js",
      "chunk-ABAHVFPX.js",
      "chunk-AOX35K2N.js",
      "chunk-ECGTKQCT.js",
      "chunk-UNO6H5ZW.js",
      "chunk-WCQZFFOE.js",
      "essential.cjs",
      "essential.js",
      "http.cjs",
      "http.js",
      "index.cjs",
      "index.js",
      "reactivity.cjs",
      "reactivity.js",
      "style-UJ5QAZRX.js",
      "utils.cjs",
      "utils.js"
    ]
  },
  "pack": {
    "filename": "voodoojs-0.1.0.tgz",
    "tarballKb": 3740.67,
    "unpackedKb": 15387.38,
    "entries": 59,
    "sourcemapKb": 10926.9,
    "sourcemapShareOfUnpacked": "71.0%",
    "files": [
      "dist/chunk-5V56KGIJ.js",
      "dist/chunk-5V56KGIJ.js.map",
      "dist/chunk-ABAHVFPX.js",
      "dist/chunk-ABAHVFPX.js.map",
      "dist/chunk-AOX35K2N.js",
      "dist/chunk-AOX35K2N.js.map",
      "dist/chunk-ECGTKQCT.js",
      "dist/chunk-ECGTKQCT.js.map",
      "dist/chunk-UNO6H5ZW.js",
      "dist/chunk-UNO6H5ZW.js.map",
      "dist/chunk-WCQZFFOE.js",
      "dist/chunk-WCQZFFOE.js.map",
      "dist/essential.cjs",
      "dist/essential.cjs.map",
      "dist/essential.d.cts",
      "dist/essential.d.ts",
      "dist/essential.js",
      "dist/essential.js.map",
      "dist/http.cjs",
      "dist/http.cjs.map",
      "dist/http.d.cts",
      "dist/http.d.ts",
      "dist/http.js",
      "dist/http.js.map",
      "dist/index.cjs",
      "dist/index.cjs.map",
      "dist/index.d.cts",
      "dist/index.d.ts",
      "dist/index.js",
      "dist/index.js.map",
      "dist/query-CR2gaUCa.d.ts",
      "dist/query-mDo-njHI.d.cts",
      "dist/reactivity.cjs",
      "dist/reactivity.cjs.map",
      "dist/reactivity.d.cts",
      "dist/reactivity.d.ts",
      "dist/reactivity.js",
      "dist/reactivity.js.map",
      "dist/style-UJ5QAZRX.js",
      "dist/style-UJ5QAZRX.js.map",
      "dist/utils.cjs",
      "dist/utils.cjs.map",
      "dist/utils.d.cts",
      "dist/utils.d.ts",
      "dist/utils.js",
      "dist/utils.js.map",
      "dist/voodoo.core.js",
      "dist/voodoo.core.js.map",
      "dist/voodoo.core.min.js",
      "dist/voodoo.core.min.js.map",
      "dist/voodoo.full.js",
      "dist/voodoo.full.js.map",
      "dist/voodoo.full.min.js",
      "dist/voodoo.full.min.js.map",
      "dist/voodoo.js",
      "dist/voodoo.js.map",
      "dist/voodoo.min.js",
      "dist/voodoo.min.js.map",
      "package.json"
    ]
  },
  "sideEffects": {
    "declared": [
      "./src/index.ts",
      "./src/essential.ts",
      "./src/core.ts",
      "./src/browser.ts",
      "./src/browser-essential.ts",
      "./src/bootstrap.ts",
      "./src/directives/*.ts",
      "./src/motion/*.ts",
      "./src/charts/*.ts",
      "./src/ui/components.ts",
      "./src/router/*.ts",
      "./src/i18n/*.ts",
      "./src/runtime/magics.ts",
      "./dist/*.js",
      "./dist/*.cjs"
    ],
    "matched": [
      {
        "glob": "./src/index.ts",
        "files": 1
      },
      {
        "glob": "./src/essential.ts",
        "files": 1
      },
      {
        "glob": "./src/core.ts",
        "files": 1
      },
      {
        "glob": "./src/browser.ts",
        "files": 1
      },
      {
        "glob": "./src/browser-essential.ts",
        "files": 1
      },
      {
        "glob": "./src/bootstrap.ts",
        "files": 1
      },
      {
        "glob": "./src/directives/*.ts",
        "files": 7
      },
      {
        "glob": "./src/motion/*.ts",
        "files": 1
      },
      {
        "glob": "./src/charts/*.ts",
        "files": 1
      },
      {
        "glob": "./src/ui/components.ts",
        "files": 1
      },
      {
        "glob": "./src/router/*.ts",
        "files": 1
      },
      {
        "glob": "./src/i18n/*.ts",
        "files": 1
      },
      {
        "glob": "./src/runtime/magics.ts",
        "files": 1
      },
      {
        "glob": "./dist/*.js",
        "files": 18
      },
      {
        "glob": "./dist/*.cjs",
        "files": 5
      }
    ],
    "unmatched": []
  },
  "duplication": {
    "esm": {
      "files": 12,
      "fileNames": [
        "chunk-5V56KGIJ.js",
        "chunk-ABAHVFPX.js",
        "chunk-AOX35K2N.js",
        "chunk-ECGTKQCT.js",
        "chunk-UNO6H5ZW.js",
        "chunk-WCQZFFOE.js",
        "essential.js",
        "http.js",
        "index.js",
        "reactivity.js",
        "style-UJ5QAZRX.js",
        "utils.js"
      ],
      "duplicatedBlocks": 0,
      "duplicatedWindows": 0,
      "windowSize": 20,
      "samples": []
    },
    "cjs": {
      "files": 5,
      "fileNames": [
        "essential.cjs",
        "http.cjs",
        "index.cjs",
        "reactivity.cjs",
        "utils.cjs"
      ],
      "duplicatedBlocks": 4,
      "duplicatedWindows": 3094,
      "windowSize": 20,
      "samples": [
        {
          "files": [
            "essential.cjs",
            "index.cjs"
          ],
          "windows": 3049,
          "sample": "ITERATE_KEY: () => ITERATE_KEY,"
        },
        {
          "files": [
            "essential.cjs",
            "index.cjs",
            "reactivity.cjs"
          ],
          "windows": 27,
          "sample": "function computed(getterOrOptions) {"
        },
        {
          "files": [
            "essential.cjs",
            "utils.cjs"
          ],
          "windows": 17,
          "sample": "function random(min = 0, max = 1) {"
        },
        {
          "files": [
            "essential.cjs",
            "http.cjs",
            "index.cjs"
          ],
          "windows": 1,
          "sample": "headers: { ...defaults.headers, ...options.headers },"
        }
      ]
    }
  },
  "cdnGlobals": [
    {
      "file": "voodoo.js",
      "exists": true,
      "publishesGlobal": true
    },
    {
      "file": "voodoo.min.js",
      "exists": true,
      "publishesGlobal": true
    },
    {
      "file": "voodoo.core.js",
      "exists": true,
      "publishesGlobal": true
    },
    {
      "file": "voodoo.core.min.js",
      "exists": true,
      "publishesGlobal": true
    },
    {
      "file": "voodoo.full.js",
      "exists": true,
      "publishesGlobal": true
    },
    {
      "file": "voodoo.full.min.js",
      "exists": true,
      "publishesGlobal": true
    }
  ]
}
```

</details>

### Performance — SKIP

22 medicoes, sem baseline para comparar

<details><summary>Notas informativas</summary>

- Ha medicao mas nao ha baseline; nao da para dizer se melhorou ou piorou (`benchmarks/results/baseline.json`) — ausente

</details>

**Como habilitar:** copie benchmarks/results/latest.json para benchmarks/results/baseline.json num commit estavel

<details><summary>Evidencia coletada</summary>

```json
{
  "measurements": 22,
  "howToEnable": "copie benchmarks/results/latest.json para benchmarks/results/baseline.json num commit estavel",
  "latest": {
    "directives/v-text-mount-1000": {
      "value": 59.23675000004005,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 35.0% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    },
    "directives/interpolation-mount-1000": {
      "value": 45.10869999998249,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 59.2% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-show-toggle-1000": {
      "value": 8.3412000000244,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 62.3% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-if-toggle-100": {
      "value": 7.112849999917671,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "Cada ciclo destroi N nos e monta N nos: exercita destroy() e o indice de directives.; RSD 20.1% acima do alvo 8% depois de 40 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-if-toggle-1000": {
      "value": 125.92515000002459,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "Cada ciclo destroi N nos e monta N nos: exercita destroy() e o indice de directives.; RSD 35.2% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-if-toggle-5000": {
      "value": 853.970900000073,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "Cada ciclo destroi N nos e monta N nos: exercita destroy() e o indice de directives.; parou em 9 amostras pelo teto de tempo; RSD 14.7% acima do alvo 8% depois de 9 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-model-mount-1000": {
      "value": 50.659300000057556,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 32.7% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-model-input-1000": {
      "value": 23.31085000000894,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 27.7% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "directives/v-bind-many-attrs-500": {
      "value": 109.50780000002123,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 13.8% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "directives/event-modifiers-1000": {
      "value": 32.209000000031665,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 23.7% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "components/mount-10": {
      "value": 7.581750000012107,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 25.5% acima do alvo 8% depois de 40 amostras — NAO confiavel para portao de regressao"
    },
    "components/mount-100": {
      "value": 60.00459999998566,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 48.0% acima do alvo 8% depois de 40 amostras — NAO confiavel para portao de regressao"
    },
    "components/mount-500": {
      "value": 344.3157999998657,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 33.9% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    },
    "components/mount-1000": {
      "value": 547.2200999999186,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/update-500": {
      "value": 18.956550000002608,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 20.8% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "components/updated-hook-absent-200": {
      "value": 4.73589999997057,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 48.7% acima do alvo 8% depois de 20 amostras — NAO confiavel para portao de regressao"
    },
    "components/updated-hook-present-200": {
      "value": 13.665999999968335,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/unmount-500": {
      "value": 18.1624999998603,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/nested-200": {
      "value": 133.76760000013746,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/deep-tree-10": {
      "value": 0.34100000001490116,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/deep-tree-50": {
      "value": 0.885600000154227,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": true,
      "status": "ok",
      "notes": null
    },
    "components/deep-tree-200": {
      "value": 2.645600000047125,
      "higherIsBetter": false,
      "unit": "ms",
      "stable": false,
      "status": "ok",
      "notes": "RSD 14.7% acima do alvo 8% depois de 24 amostras — NAO confiavel para portao de regressao"
    }
  }
}
```

</details>

### Memory — PASS

23/23 em 1 arquivos de vazamento

<details><summary>Evidencia coletada</summary>

```json
{
  "files": [
    "packages/voodoojs/test/memoria.test.ts"
  ],
  "passed": 23,
  "failed": 0,
  "skipped": 0,
  "total": 23
}
```

</details>

### API Compatibility — PASS

163 chaves em V, 156 exports, 257 directives, 40 magics

<details><summary>Evidencia coletada</summary>

```json
{
  "method": "runtime",
  "snapshot": "packages/voodoojs/api-snapshot.json",
  "counts": {
    "V": 163,
    "exports": 156,
    "directives": 257,
    "magics": 40,
    "components": 29,
    "allowedGlobals": 18
  },
  "previousCounts": {
    "V": 163,
    "exports": 156,
    "directives": 257,
    "magics": 40,
    "components": 29,
    "allowedGlobals": 18
  },
  "diff": {
    "removed": [],
    "added": [],
    "changed": []
  },
  "updateCommand": "npm run quality -- --only=api-compatibility --update"
}
```

</details>

### Docs — FAIL

4 broken links

| nivel | onde | problema | esperado | obtido |
| --- | --- | --- | --- | --- |
| FAIL | `README.en.md:454` | Link quebrado (arquivo): benchmarks/README.md | benchmarks/README.md existente a partir de . | arquivo nao encontrado |
| FAIL | `README.en.md:455` | Link quebrado (arquivo): PERFORMANCE_REPORT.md | PERFORMANCE_REPORT.md existente a partir de . | arquivo nao encontrado |
| FAIL | `README.md:465` | Link quebrado (arquivo): benchmarks/README.md | benchmarks/README.md existente a partir de . | arquivo nao encontrado |
| FAIL | `README.md:466` | Link quebrado (arquivo): PERFORMANCE_REPORT.md | PERFORMANCE_REPORT.md existente a partir de . | arquivo nao encontrado |

<details><summary>Notas informativas</summary>

- site/docs nao tem markdown; a documentacao publicada e HTML gerado (`site/docs`) — links relativos dentro do HTML do site nao entram neste check

</details>

<details><summary>Evidencia coletada</summary>

```json
{
  "links": {
    "markdownFiles": 62,
    "relativeLinksChecked": 483,
    "externalSkipped": 19,
    "broken": [
      {
        "file": "README.en.md",
        "line": 454,
        "target": "benchmarks/README.md",
        "reason": "arquivo",
        "expected": "benchmarks/README.md existente a partir de .",
        "actual": "arquivo nao encontrado"
      },
      {
        "file": "README.en.md",
        "line": 455,
        "target": "PERFORMANCE_REPORT.md",
        "reason": "arquivo",
        "expected": "PERFORMANCE_REPORT.md existente a partir de .",
        "actual": "arquivo nao encontrado"
      },
      {
        "file": "README.md",
        "line": 465,
        "target": "benchmarks/README.md",
        "reason": "arquivo",
        "expected": "benchmarks/README.md existente a partir de .",
        "actual": "arquivo nao encontrado"
      },
      {
        "file": "README.md",
        "line": 466,
        "target": "PERFORMANCE_REPORT.md",
        "reason": "arquivo",
        "expected": "PERFORMANCE_REPORT.md existente a partir de .",
        "actual": "arquivo nao encontrado"
      }
    ]
  },
  "examples": {
    "parser": "esbuild",
    "readmes": [
      "README.en.md",
      "README.md"
    ],
    "blocksParsed": 20,
    "fragmentsSkipped": 0,
    "broken": 0,
    "byFile": {
      "README.en.md": {
        "js": 9,
        "html": 12,
        "broken": 0
      },
      "README.md": {
        "js": 9,
        "html": 12,
        "broken": 0
      }
    }
  },
  "siteDocsMarkdownFiles": 0
}
```

</details>

### Dead Code — WARN

21 mortos, 25 exports desnecessarios, 66 tipos (de 253 exports)

| nivel | onde | problema | esperado | obtido |
| --- | --- | --- | --- | --- |
| WARN | `packages/voodoojs/src/devtools/xray.ts:545` | Codigo morto: function countEffects nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/directives/dnd.ts:872` | Codigo morto: const DND_GROUP_ATTRIBUTE nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/directives/dnd.ts:875` | Codigo morto: function isDragging nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/directives/dnd.ts:880` | Codigo morto: function cancelDragging nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/directives/forms.ts:97` | Codigo morto: function getFormState nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/forms/validate.ts:111` | Codigo morto: function formatMessage nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/forms/validate.ts:172` | Codigo morto: function isFormField nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/forms/validate.ts:183` | Codigo morto: function fieldValue nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/forms/validate.ts:196` | Codigo morto: function fieldKey nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/forms/validate.ts:201` | Codigo morto: function fieldLabel nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/runtime/boot.ts:248` | Codigo morto: function stopBootLoop nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/runtime/walker.ts:465` | Codigo morto: function evaluateStrict nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/runtime/walker.ts:868` | Codigo morto: function onMounted nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/components.ts:2488` | Codigo morto: const componentNames nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/components.ts:2521` | Codigo morto: const iconNames nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/components.ts:2523` | Codigo morto: reexport-local ensureComponentStyles nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/dialog.ts:1149` | Codigo morto: reexport-local dialogLabels nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/palette.ts:230` | Codigo morto: function toRgba nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/palette.ts:266` | Codigo morto: function contrastText nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/palette.ts:299` | Codigo morto: function colorScale nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/ui/palette.ts:335` | Codigo morto: const presets nao e usado em lugar nenhum | nome importado por outro modulo, reexportado por index.ts/core.ts, ou usado no proprio arquivo | nenhuma referencia encontrada fora da propria declaracao; peso morto no bundle |
| WARN | `packages/voodoojs/src/directives/forms.ts:87` | Export desnecessario: function ensureFormState | sem a palavra export, ja que so o proprio modulo usa | usado 5x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/directives/forms.ts:183` | Export desnecessario: function hasOption | sem a palavra export, ja que so o proprio modulo usa | usado 4x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/directives/http.ts:134` | Export desnecessario: function swapContent | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/directives/http.ts:210` | Export desnecessario: function renderJSON | sem a palavra export, ja que so o proprio modulo usa | usado 4x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/directives/http.ts:294` | Export desnecessario: function runRequest | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/directives/ui.ts:2205` | Export desnecessario: function commandPalette | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/dom/style.ts:29` | Export desnecessario: const BASE_TOKENS | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/forms/mask.ts:118` | Export desnecessario: function maskCurrency | sem a palavra export, ja que so o proprio modulo usa | usado 4x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/forms/mask.ts:140` | Export desnecessario: function maskPercent | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/forms/validate.ts:134` | Export desnecessario: const rules | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/parser/interpreter.ts:77` | Export desnecessario: function chaveBloqueada | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/avisos.ts:42` | Export desnecessario: function avisarUmaVez | sem a palavra export, ja que so o proprio modulo usa | usado 3x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/walker.ts:78` | Export desnecessario: function trackEffectScope | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/walker.ts:266` | Export desnecessario: function hasDirective | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/walker.ts:321` | Export desnecessario: function isVoodooAttribute | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/walker.ts:803` | Export desnecessario: function bindTextNode | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/runtime/walker.ts:853` | Export desnecessario: function resolveComponentTag | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/components.ts:2523` | Export desnecessario: reexport-local iconSvg | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:83` | Export desnecessario: function parseColor | sem a palavra export, ja que so o proprio modulo usa | usado 4x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:181` | Export desnecessario: function rgbToOklch | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:199` | Export desnecessario: function oklchToRgb | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:225` | Export desnecessario: function toHex | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:243` | Export desnecessario: function relativeLuminance | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:248` | Export desnecessario: function contrastRatio | sem a palavra export, ja que so o proprio modulo usa | usado 2x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/ui/palette.ts:277` | Export desnecessario: const SCALE_STEPS | sem a palavra export, ja que so o proprio modulo usa | usado 1x dentro do proprio arquivo e por mais ninguem; o export so alarga a superficie e atrapalha o tree shaking |
| WARN | `packages/voodoojs/src/forms/validate.ts` | 7 tipos exportados sem nenhuma referencia | tipo publico reexportado por index.ts, ou declaracao removida | nao custam bytes no bundle. Concentrados em: packages/voodoojs/src/forms/validate.ts (3), packages/voodoojs/src/ui/palette.ts (2), packages/voodoojs/src/devtools/bus.ts (1), packages/voodoojs/src/ui/toast.ts (1) |
| WARN | `packages/voodoojs/src/ui/dialog.ts` | 59 tipos exportados que so o proprio modulo usa | tipo reexportado por index.ts se e publico, ou sem export se e interno | nao custam bytes no bundle. Concentrados em: packages/voodoojs/src/ui/dialog.ts (12), packages/voodoojs/src/devtools/bus.ts (7), packages/voodoojs/src/dom/query.ts (6), packages/voodoojs/src/ui/palette.ts (5), packages/voodoojs/src/forms/validate.ts (4) |
| WARN | `packages/voodoojs/src/runtime/avisos.ts:51` | Export usado apenas pelos testes: function limparAvisos | consumidor no proprio src, ou reexport publico | so a suite de testes importa esse nome |

<details><summary>Evidencia coletada</summary>

```json
{
  "method": "grafo de importacoes por nome sobre packages/voodoojs/src; pontos de entrada e modulos alcancados por export * ficam de fora",
  "limitation": "analise textual: nomes homonimos em modulos diferentes podem se encobrir. Confirme na mao antes de remover.",
  "filesScanned": 49,
  "totalExports": 253,
  "deadRuntime": [
    {
      "name": "countEffects",
      "line": 545,
      "kind": "function",
      "file": "packages/voodoojs/src/devtools/xray.ts"
    },
    {
      "name": "DND_GROUP_ATTRIBUTE",
      "line": 872,
      "kind": "const",
      "file": "packages/voodoojs/src/directives/dnd.ts"
    },
    {
      "name": "isDragging",
      "line": 875,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/dnd.ts"
    },
    {
      "name": "cancelDragging",
      "line": 880,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/dnd.ts"
    },
    {
      "name": "getFormState",
      "line": 97,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/forms.ts"
    },
    {
      "name": "formatMessage",
      "line": 111,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "isFormField",
      "line": 172,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "fieldValue",
      "line": 183,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "fieldKey",
      "line": 196,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "fieldLabel",
      "line": 201,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "stopBootLoop",
      "line": 248,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/boot.ts"
    },
    {
      "name": "evaluateStrict",
      "line": 465,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts"
    },
    {
      "name": "onMounted",
      "line": 868,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts"
    },
    {
      "name": "componentNames",
      "line": 2488,
      "kind": "const",
      "file": "packages/voodoojs/src/ui/components.ts"
    },
    {
      "name": "iconNames",
      "line": 2521,
      "kind": "const",
      "file": "packages/voodoojs/src/ui/components.ts"
    },
    {
      "name": "ensureComponentStyles",
      "line": 2523,
      "kind": "reexport-local",
      "file": "packages/voodoojs/src/ui/components.ts"
    },
    {
      "name": "dialogLabels",
      "line": 1149,
      "kind": "reexport-local",
      "file": "packages/voodoojs/src/ui/dialog.ts"
    },
    {
      "name": "toRgba",
      "line": 230,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts"
    },
    {
      "name": "contrastText",
      "line": 266,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts"
    },
    {
      "name": "colorScale",
      "line": 299,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts"
    },
    {
      "name": "presets",
      "line": 335,
      "kind": "const",
      "file": "packages/voodoojs/src/ui/palette.ts"
    }
  ],
  "exportedButInternalRuntime": [
    {
      "name": "ensureFormState",
      "line": 87,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/forms.ts",
      "localUses": 5
    },
    {
      "name": "hasOption",
      "line": 183,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/forms.ts",
      "localUses": 4
    },
    {
      "name": "swapContent",
      "line": 134,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/http.ts",
      "localUses": 2
    },
    {
      "name": "renderJSON",
      "line": 210,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/http.ts",
      "localUses": 4
    },
    {
      "name": "runRequest",
      "line": 294,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/http.ts",
      "localUses": 1
    },
    {
      "name": "commandPalette",
      "line": 2205,
      "kind": "function",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "localUses": 2
    },
    {
      "name": "BASE_TOKENS",
      "line": 29,
      "kind": "const",
      "file": "packages/voodoojs/src/dom/style.ts",
      "localUses": 1
    },
    {
      "name": "maskCurrency",
      "line": 118,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/mask.ts",
      "localUses": 4
    },
    {
      "name": "maskPercent",
      "line": 140,
      "kind": "function",
      "file": "packages/voodoojs/src/forms/mask.ts",
      "localUses": 2
    },
    {
      "name": "rules",
      "line": 134,
      "kind": "const",
      "file": "packages/voodoojs/src/forms/validate.ts",
      "localUses": 1
    },
    {
      "name": "chaveBloqueada",
      "line": 77,
      "kind": "function",
      "file": "packages/voodoojs/src/parser/interpreter.ts",
      "localUses": 2
    },
    {
      "name": "avisarUmaVez",
      "line": 42,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/avisos.ts",
      "localUses": 3
    },
    {
      "name": "trackEffectScope",
      "line": 78,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 2
    },
    {
      "name": "hasDirective",
      "line": 266,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 1
    },
    {
      "name": "isVoodooAttribute",
      "line": 321,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 2
    },
    {
      "name": "bindTextNode",
      "line": 803,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 2
    },
    {
      "name": "resolveComponentTag",
      "line": 853,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 1
    },
    {
      "name": "iconSvg",
      "line": 2523,
      "kind": "reexport-local",
      "file": "packages/voodoojs/src/ui/components.ts",
      "localUses": 2
    },
    {
      "name": "parseColor",
      "line": 83,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 4
    },
    {
      "name": "rgbToOklch",
      "line": 181,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 1
    },
    {
      "name": "oklchToRgb",
      "line": 199,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 1
    },
    {
      "name": "toHex",
      "line": 225,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 1
    },
    {
      "name": "relativeLuminance",
      "line": 243,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 2
    },
    {
      "name": "contrastRatio",
      "line": 248,
      "kind": "function",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 2
    },
    {
      "name": "SCALE_STEPS",
      "line": 277,
      "kind": "const",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 1
    }
  ],
  "deadTypes": [
    {
      "name": "DevtoolsBus",
      "line": 152,
      "kind": "type",
      "file": "packages/voodoojs/src/devtools/bus.ts"
    },
    {
      "name": "FieldValidationResult",
      "line": 46,
      "kind": "interface",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "FormValidationResult",
      "line": 52,
      "kind": "interface",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "SerializeOptions",
      "line": 57,
      "kind": "interface",
      "file": "packages/voodoojs/src/forms/validate.ts"
    },
    {
      "name": "PaletteOptions",
      "line": 383,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/palette.ts"
    },
    {
      "name": "ResolvedPalette",
      "line": 397,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/palette.ts"
    },
    {
      "name": "Toast",
      "line": 334,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/toast.ts"
    }
  ],
  "exportedButInternalTypes": [
    {
      "name": "DevtoolsNetworkEvent",
      "line": 30,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 1
    },
    {
      "name": "DevtoolsDomEvent",
      "line": 48,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 1
    },
    {
      "name": "DevtoolsNavigationEvent",
      "line": 60,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 1
    },
    {
      "name": "DevtoolsLocaleEvent",
      "line": 70,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 1
    },
    {
      "name": "DevtoolsUpdateEvent",
      "line": 76,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 1
    },
    {
      "name": "DevtoolsEventMap",
      "line": 84,
      "kind": "interface",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 5
    },
    {
      "name": "DevtoolsEventType",
      "line": 92,
      "kind": "type",
      "file": "packages/voodoojs/src/devtools/bus.ts",
      "localUses": 5
    },
    {
      "name": "FormState",
      "line": 47,
      "kind": "interface",
      "file": "packages/voodoojs/src/directives/forms.ts",
      "localUses": 8
    },
    {
      "name": "SwapMode",
      "line": 55,
      "kind": "type",
      "file": "packages/voodoojs/src/directives/http.ts",
      "localUses": 3
    },
    {
      "name": "HistoryController",
      "line": 142,
      "kind": "interface",
      "file": "packages/voodoojs/src/directives/state.ts",
      "localUses": 3
    },
    {
      "name": "FloatingPlacement",
      "line": 302,
      "kind": "type",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "localUses": 10
    },
    {
      "name": "HotkeyOptions",
      "line": 398,
      "kind": "interface",
      "file": "packages/voodoojs/src/directives/ui.ts",
      "localUses": 2
    },
    {
      "name": "ReadyCallback",
      "line": 32,
      "kind": "type",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 3
    },
    {
      "name": "QueryEventHandler",
      "line": 35,
      "kind": "type",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 10
    },
    {
      "name": "QueryInput",
      "line": 38,
      "kind": "type",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 17
    },
    {
      "name": "QueryFilter",
      "line": 51,
      "kind": "type",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 3
    },
    {
      "name": "QueryPoint",
      "line": 54,
      "kind": "interface",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 2
    },
    {
      "name": "QueryValue",
      "line": 60,
      "kind": "type",
      "file": "packages/voodoojs/src/dom/query.ts",
      "localUses": 4
    },
    {
      "name": "TransitionClasses",
      "line": 39,
      "kind": "interface",
      "file": "packages/voodoojs/src/dom/transition.ts",
      "localUses": 2
    },
    {
      "name": "MaskResolver",
      "line": 23,
      "kind": "type",
      "file": "packages/voodoojs/src/forms/mask.ts",
      "localUses": 2
    },
    {
      "name": "MaskPattern",
      "line": 26,
      "kind": "type",
      "file": "packages/voodoojs/src/forms/mask.ts",
      "localUses": 2
    },
    {
      "name": "CurrencyMaskOptions",
      "line": 98,
      "kind": "interface",
      "file": "packages/voodoojs/src/forms/mask.ts",
      "localUses": 2
    },
    {
      "name": "FormField",
      "line": 27,
      "kind": "type",
      "file": "packages/voodoojs/src/forms/validate.ts",
      "localUses": 7
    },
    {
      "name": "ValidatorResult",
      "line": 30,
      "kind": "type",
      "file": "packages/voodoojs/src/forms/validate.ts",
      "localUses": 2
    },
    {
      "name": "ValidatorFn",
      "line": 33,
      "kind": "type",
      "file": "packages/voodoojs/src/forms/validate.ts",
      "localUses": 2
    },
    {
      "name": "RuleDefinition",
      "line": 39,
      "kind": "interface",
      "file": "packages/voodoojs/src/forms/validate.ts",
      "localUses": 1
    },
    {
      "name": "ResourceOptions",
      "line": 21,
      "kind": "interface",
      "file": "packages/voodoojs/src/http/resource.ts",
      "localUses": 1
    },
    {
      "name": "Resource",
      "line": 47,
      "kind": "interface",
      "file": "packages/voodoojs/src/http/resource.ts",
      "localUses": 2
    },
    {
      "name": "TokenType",
      "line": 12,
      "kind": "type",
      "file": "packages/voodoojs/src/parser/lexer.ts",
      "localUses": 1
    },
    {
      "name": "TemplatePart",
      "line": 14,
      "kind": "interface",
      "file": "packages/voodoojs/src/parser/lexer.ts",
      "localUses": 1
    },
    {
      "name": "ObjectProperty",
      "line": 39,
      "kind": "interface",
      "file": "packages/voodoojs/src/parser/parser.ts",
      "localUses": 2
    },
    {
      "name": "AppOptions",
      "line": 47,
      "kind": "interface",
      "file": "packages/voodoojs/src/runtime/app.ts",
      "localUses": 2
    },
    {
      "name": "AppConfig",
      "line": 54,
      "kind": "interface",
      "file": "packages/voodoojs/src/runtime/app.ts",
      "localUses": 2
    },
    {
      "name": "DirectiveSetup",
      "line": 116,
      "kind": "type",
      "file": "packages/voodoojs/src/runtime/registry.ts",
      "localUses": 2
    },
    {
      "name": "DirectiveDefinition",
      "line": 118,
      "kind": "interface",
      "file": "packages/voodoojs/src/runtime/registry.ts",
      "localUses": 1
    },
    {
      "name": "RegisterDirectiveOptions",
      "line": 144,
      "kind": "interface",
      "file": "packages/voodoojs/src/runtime/registry.ts",
      "localUses": 1
    },
    {
      "name": "MagicGetter",
      "line": 12,
      "kind": "type",
      "file": "packages/voodoojs/src/runtime/scope.ts",
      "localUses": 2
    },
    {
      "name": "ParsedAttribute",
      "line": 148,
      "kind": "interface",
      "file": "packages/voodoojs/src/runtime/walker.ts",
      "localUses": 5
    },
    {
      "name": "DialogLabels",
      "line": 40,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 3
    },
    {
      "name": "DialogSize",
      "line": 192,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 2
    },
    {
      "name": "DialogTone",
      "line": 193,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 4
    },
    {
      "name": "DialogIcon",
      "line": 194,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 5
    },
    {
      "name": "ModalOptions",
      "line": 197,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 8
    },
    {
      "name": "DialogHandle",
      "line": 225,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 12
    },
    {
      "name": "DialogButton",
      "line": 665,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "DialogOptions",
      "line": 679,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "AlertOptions",
      "line": 822,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "ConfirmOptions",
      "line": 856,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "PromptType",
      "line": 895,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "PromptOptions",
      "line": 898,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/dialog.ts",
      "localUses": 1
    },
    {
      "name": "RgbColor",
      "line": 29,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 14
    },
    {
      "name": "OklchColor",
      "line": 36,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 4
    },
    {
      "name": "ColorScale",
      "line": 291,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 4
    },
    {
      "name": "PaletteColors",
      "line": 320,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 3
    },
    {
      "name": "PresetName",
      "line": 332,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/palette.ts",
      "localUses": 2
    },
    {
      "name": "ToastType",
      "line": 16,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/toast.ts",
      "localUses": 3
    },
    {
      "name": "ToastPosition",
      "line": 17,
      "kind": "type",
      "file": "packages/voodoojs/src/ui/toast.ts",
      "localUses": 4
    },
    {
      "name": "ToastOptions",
      "line": 25,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/toast.ts",
      "localUses": 18
    },
    {
      "name": "ToastHandle",
      "line": 41,
      "kind": "interface",
      "file": "packages/voodoojs/src/ui/toast.ts",
      "localUses": 7
    }
  ],
  "testOnly": [
    {
      "name": "limparAvisos",
      "line": 51,
      "kind": "function",
      "file": "packages/voodoojs/src/runtime/avisos.ts"
    }
  ]
}
```

</details>

## Como reproduzir

```bash
npm run quality              # relatorio no terminal
npm run quality -- --ci      # falha o build se houver FAIL
npm run quality -- --report  # regrava este arquivo
npm run quality -- --json    # saida estruturada
```
