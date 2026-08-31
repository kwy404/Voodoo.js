/**
 * TypeScript: tipos do codigo-fonte mais teste das definicoes publicadas.
 *
 * Duas coisas diferentes sao verificadas aqui:
 *
 * 1. `npm run typecheck` — o `tsc --noEmit` do pacote, sobre `src/**`.
 * 2. Type definition tests — um arquivo `.ts` gerado na hora que importa
 *    `voodoojs` mapeado para os `.d.ts` de `dist` e exercita a API publica.
 *    E o unico jeito de saber se o que foi PUBLICADO tipa, e nao apenas o que
 *    esta no fonte: `dts: true` do tsup pode perfeitamente emitir tipos
 *    quebrados a partir de um `src` que compila.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  DIST_DIR,
  PKG_DIR,
  ROOT,
  STATUS,
  fail,
  localBin,
  note,
  rel,
  run as runCommand,
  runNode,
  statusFromFindings,
  writeTemp,
} from './lib.mjs';

export const meta = { label: 'TypeScript' };

/**
 * Exercita a superficie publica pedida no contrato de qualidade. Cada `const`
 * anotada e uma assercao: se o `.d.ts` devolver outro tipo, o tsc reclama.
 */
const TYPE_TEST = `// Gerado por scripts/quality/typescript.mjs. Nao editar.
import V from 'voodoojs';

// --- reactive ---------------------------------------------------------------
const estado = V.reactive({ contador: 0, nome: 'voodoo', ativo: true });
const proximo: number = estado.contador + 1;
const nomeEmCaixaAlta: string = estado.nome.toUpperCase();

// --- ref --------------------------------------------------------------------
const contador = V.ref(0);
const valorDoRef: number = contador.value;
contador.value = valorDoRef + 1;

const texto = V.ref<string>('oi');
const tamanho: number = texto.value.length;

// --- computed ---------------------------------------------------------------
const dobro = V.computed(() => contador.value * 2);
const valorDoComputed: number = dobro.value;

// --- http.get ---------------------------------------------------------------
interface Usuario {
  id: number;
  nome: string;
}
async function carregarUsuarios(): Promise<string> {
  const usuarios = await V.http.get<Usuario[]>('/api/usuarios');
  const primeiro: Usuario = usuarios[0];
  return primeiro.nome;
}

// --- store ------------------------------------------------------------------
const carrinho = V.store('carrinho', {
  itens: [] as string[],
  adicionar(item: string) {
    this.itens.push(item);
  },
});
const quantidade: number = carrinho.itens.length;
carrinho.adicionar('cafe');

// --- component --------------------------------------------------------------
V.component('cartao-usuario', {
  props: ['nome'],
  state: (props) => ({ aberto: false, nome: String(props.nome ?? '') }),
  methods: {
    alternar() {
      this.aberto = !this.aberto;
    },
  },
  template: '<div class="cartao"><slot></slot></div>',
});

// --- directive --------------------------------------------------------------
V.directive('destaque', (el, binding) => {
  el.style.background = String(binding.value);
});

V.directive('foco', {
  mounted(el) {
    el.focus();
  },
});

// --- use --------------------------------------------------------------------
V.use((api) => {
  api.directive('plugado', (el: HTMLElement) => {
    el.dataset.plugado = 'sim';
  });
});

// --- colecao encadeavel (V como funcao) ------------------------------------
const colecao = V('#lista .item');
colecao.addClass('ativo');

export const resultado = {
  proximo,
  nomeEmCaixaAlta,
  valorDoRef,
  tamanho,
  valorDoComputed,
  quantidade,
  carregarUsuarios,
  colecao,
};
`;

const TYPE_TEST_TSCONFIG = (distDir) => ({
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    lib: ['ES2021', 'DOM', 'DOM.Iterable'],
    strict: true,
    noEmit: true,
    // Ligado de proposito: sem isso o tsc so olha o uso e nao acusa um `.d.ts`
    // internamente quebrado, que e justamente o que este teste quer pegar.
    skipLibCheck: false,
    esModuleInterop: true,
    forceConsistentCasingInFileNames: true,
    types: [],
    baseUrl: '.',
    paths: {
      // Aponta direto para os tipos publicados, nao para o src. Assim o teste
      // valida o artefato que o usuario final instala.
      voodoojs: [join(distDir, 'index.d.ts').replace(/\\/g, '/')],
      'voodoojs/*': [join(distDir, '*').replace(/\\/g, '/')],
    },
  },
  include: ['types.test.ts'],
});

/** Converte a saida do tsc em achados com arquivo, linha e mensagem. */
function parseTscOutput(output, label) {
  const findings = [];
  const seen = new Set();
  const re = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.*)$/gm;
  let match;
  while ((match = re.exec(output))) {
    const key = match[0];
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push(
      fail(`${label}: ${match[5]} ${match[6]}`, {
        file: match[1].trim(),
        line: Number(match[2]),
        column: Number(match[3]),
        expected: 'compilacao sem erro de tipo',
        actual: `${match[5]}: ${match[6]}`,
      })
    );
  }
  return findings;
}

function tscBin() {
  return localBin('typescript/bin/tsc');
}

export async function run(ctx) {
  const findings = [];
  const details = {};

  const tsc = tscBin();
  if (!tsc) {
    return {
      status: STATUS.SKIP,
      summary: 'typescript nao esta instalado',
      findings: [],
      details: { howToEnable: 'npm install' },
    };
  }

  // -------------------------------------------------------------------------
  // 1. Tipos do codigo-fonte
  // -------------------------------------------------------------------------
  const srcCheck = runNode([tsc, '-p', join(PKG_DIR, 'tsconfig.json'), '--noEmit'], { cwd: ROOT });
  const srcOutput = `${srcCheck.stdout}\n${srcCheck.stderr}`;
  const srcFindings = parseTscOutput(srcOutput, 'src');
  findings.push(...srcFindings);
  details.source = {
    command: 'tsc -p packages/voodoojs/tsconfig.json --noEmit',
    exitCode: srcCheck.code,
    errors: srcFindings.length,
  };

  if (srcCheck.code !== 0 && srcFindings.length === 0) {
    findings.push(
      fail('tsc terminou com erro mas nenhuma diagnostico foi reconhecido', {
        file: 'packages/voodoojs/tsconfig.json',
        expected: 'exit code 0',
        actual: `exit code ${srcCheck.code}: ${srcOutput.trim().slice(0, 500)}`,
      })
    );
  }

  // -------------------------------------------------------------------------
  // 2. Type definition tests contra os .d.ts publicados
  // -------------------------------------------------------------------------
  const typesEntry = join(DIST_DIR, 'index.d.ts');

  if (!existsSync(typesEntry)) {
    const build = runCommand('npm', ['run', 'build'], { cwd: ROOT, timeout: 15 * 60 * 1000 });
    details.autoBuild = { ran: true, exitCode: build.code };
    if (!existsSync(typesEntry)) {
      findings.push(
        fail('Nao ha declaracoes publicadas para testar', {
          file: rel(typesEntry),
          expected: 'dist/index.d.ts gerado pelo build',
          actual: `ausente mesmo apos npm run build (exit ${build.code})`,
        })
      );
      return {
        status: STATUS.FAIL,
        summary: 'dist/index.d.ts ausente',
        findings,
        details,
      };
    }
  }

  const tempDir = join(ctx.scratch, 'typetest');
  mkdirSync(tempDir, { recursive: true });
  const testFile = writeTemp(tempDir, 'types.test.ts', TYPE_TEST);
  const tsconfigFile = writeTemp(
    tempDir,
    'tsconfig.json',
    JSON.stringify(TYPE_TEST_TSCONFIG(DIST_DIR), null, 2)
  );

  const dtsCheck = runNode([tsc, '-p', tsconfigFile, '--noEmit'], { cwd: tempDir });
  const dtsOutput = `${dtsCheck.stdout}\n${dtsCheck.stderr}`;
  const dtsFindings = parseTscOutput(dtsOutput, 'dist/*.d.ts');

  findings.push(...dtsFindings);
  details.definitions = {
    entry: rel(typesEntry),
    testFile: 'gerado em tempo de execucao (scratch)/types.test.ts',
    apiExercised: [
      'V.reactive',
      'V.ref',
      'V.computed',
      'V.http.get',
      'V.store',
      'V.component',
      'V.directive',
      'V.use',
      'V() (colecao)',
    ],
    exitCode: dtsCheck.code,
    errors: dtsFindings.length,
  };

  if (dtsCheck.code !== 0 && dtsFindings.length === 0) {
    findings.push(
      fail('O teste de definicoes falhou sem diagnostico reconhecivel', {
        file: rel(testFile),
        expected: 'exit code 0',
        actual: `exit code ${dtsCheck.code}: ${dtsOutput.trim().slice(0, 500)}`,
      })
    );
  }

  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* o scratch inteiro some no fim */
  }

  const status = statusFromFindings(findings);
  const summary =
    status === STATUS.PASS
      ? `src ok + ${details.definitions.apiExercised.length} usos da API tipados contra dist/*.d.ts`
      : `${findings.filter((f) => f.level === 'fail').length} erros de tipo`;

  return { status, summary, findings, details };
}
