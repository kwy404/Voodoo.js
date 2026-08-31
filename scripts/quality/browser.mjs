/**
 * Browser Tests: smoke test do bundle de CDN num navegador real.
 *
 * Nao existe runner de navegador nas devDependencies do projeto, entao o
 * caminho normal hoje e SKIP. O check nao inventa um PASS: ele detecta se
 * Playwright ou Puppeteer estao instalados e, so nesse caso, sobe um navegador
 * de verdade, carrega `dist/voodoo.min.js` numa pagina e verifica que o
 * runtime monta, interpola, reage a evento e nao derruba o console.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { DIST_DIR, STATUS, fail, hasPackage, note, read, rel } from './lib.mjs';

export const meta = { label: 'Browser Tests' };

const BUNDLE = join(DIST_DIR, 'voodoo.min.js');

const HOW_TO_ENABLE =
  'instale um runner de navegador (npm i -D playwright && npx playwright install chromium, ' +
  'ou npm i -D puppeteer) e rode npm run quality de novo; este check passa a subir um ' +
  'Chromium de verdade contra dist/voodoo.min.js';

/** Pagina de smoke test: interpolacao, evento e directive de lista. */
function smokePage(bundleSource) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>voodoo smoke</title></head>
<body>
  <div id="app" v-data="{ nome: 'mundo', contador: 0, itens: ['a','b','c'] }">
    <p id="saudacao" v-text="'ola ' + nome"></p>
    <span id="interpolado">{{ contador }}</span>
    <button id="somar" v-on:click="contador++">mais</button>
    <ul><li v-for="item in itens" class="item" v-text="item"></li></ul>
  </div>
  <script>${bundleSource}<\/script>
</body></html>`;
}

/** Asserts rodados dentro da pagina. Devolve uma lista de falhas em texto. */
const PAGE_ASSERTIONS = `() => {
  const problemas = [];
  const V = window.V;
  if (!V) return ['window.V nao foi publicado pelo bundle'];
  if (typeof V.reactive !== 'function') problemas.push('V.reactive nao e funcao');
  if (typeof V.start !== 'function') problemas.push('V.start nao e funcao');

  const saudacao = document.getElementById('saudacao');
  if (!saudacao || saudacao.textContent !== 'ola mundo')
    problemas.push('v-text nao renderizou: esperado "ola mundo", obtido ' + JSON.stringify(saudacao && saudacao.textContent));

  const interpolado = document.getElementById('interpolado');
  if (!interpolado || interpolado.textContent.trim() !== '0')
    problemas.push('interpolacao nao renderizou: esperado "0", obtido ' + JSON.stringify(interpolado && interpolado.textContent));

  const itens = document.querySelectorAll('li.item');
  if (itens.length !== 3)
    problemas.push('v-for nao renderizou: esperado 3 itens, obtido ' + itens.length);

  document.getElementById('somar').click();
  return new Promise((resolve) => {
    setTimeout(() => {
      const depois = document.getElementById('interpolado').textContent.trim();
      if (depois !== '1')
        problemas.push('v-on nao atualizou o estado: esperado "1", obtido ' + JSON.stringify(depois));
      resolve(problemas);
    }, 60);
  });
}`;

async function loadRunner() {
  if (hasPackage('playwright')) {
    const mod = await import('playwright');
    return { name: 'playwright', mod };
  }
  if (hasPackage('playwright-core')) {
    const mod = await import('playwright-core');
    return { name: 'playwright-core', mod };
  }
  if (hasPackage('puppeteer')) {
    const mod = await import('puppeteer');
    return { name: 'puppeteer', mod: mod.default ?? mod };
  }
  if (hasPackage('puppeteer-core')) {
    const mod = await import('puppeteer-core');
    return { name: 'puppeteer-core', mod: mod.default ?? mod };
  }
  return null;
}

export async function run() {
  const runner = await loadRunner();
  if (!runner) {
    return {
      status: STATUS.SKIP,
      summary: 'no browser runner installed',
      findings: [],
      details: { howToEnable: HOW_TO_ENABLE, checked: ['playwright', 'puppeteer'] },
    };
  }

  if (!existsSync(BUNDLE)) {
    return {
      status: STATUS.FAIL,
      summary: 'bundle de CDN ausente',
      findings: [
        fail('O smoke test precisa do bundle gerado', {
          file: rel(BUNDLE),
          expected: 'arquivo existente',
          actual: 'nao encontrado; rode npm run build',
        }),
      ],
      details: { runner: runner.name },
    };
  }

  const source = read(BUNDLE);
  const html = smokePage(source);
  const consoleErrors = [];
  let browser;

  try {
    const isPlaywright = runner.name.startsWith('playwright');
    browser = isPlaywright
      ? await runner.mod.chromium.launch()
      : await runner.mod.launch({ args: ['--no-sandbox'] });

    const page = isPlaywright
      ? await (await browser.newContext()).newPage()
      : await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err && err.message)));

    await page.setContent(html, { waitUntil: 'load' });
    const problems = await page.evaluate(`(${PAGE_ASSERTIONS})()`);

    const findings = [
      ...problems.map((p) =>
        fail(`Smoke test do navegador falhou: ${p}`, { file: rel(BUNDLE) })
      ),
      ...consoleErrors.map((e) =>
        fail('Erro no console do navegador durante o smoke test', {
          file: rel(BUNDLE),
          expected: 'console limpo',
          actual: e,
        })
      ),
    ];

    const status = findings.length ? STATUS.FAIL : STATUS.PASS;
    return {
      status,
      summary:
        status === STATUS.PASS
          ? `smoke test ok em ${runner.name}`
          : `${findings.length} problemas em ${runner.name}`,
      findings,
      details: { runner: runner.name, bundle: rel(BUNDLE), consoleErrors },
    };
  } catch (err) {
    return {
      status: STATUS.FAIL,
      summary: `${runner.name} instalado mas o smoke test nao rodou`,
      findings: [
        fail('Falha ao subir o navegador', {
          expected: 'navegador iniciado',
          actual: String(err && err.message),
        }),
        note('Se faltam os binarios, rode: npx playwright install chromium'),
      ],
      details: { runner: runner.name },
    };
  } finally {
    try {
      await browser?.close();
    } catch {
      /* nada a fazer */
    }
  }
}
