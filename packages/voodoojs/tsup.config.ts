import { defineConfig } from 'tsup';

const banner = `/**
 * Voodoo.js v0.4.3
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */`;

/** Publica o objeto global depois que o IIFE termina de avaliar. */
const globalFooter = {
  js: 'if(typeof window!=="undefined"){window.V=Voodoo.default||Voodoo;window.Voodoo=window.V;}',
};

export default defineConfig([
  // Builds modulares para bundlers: ESM, CJS e tipos, com tree shaking.
  {
    entry: {
      index: 'src/index.ts',
      essential: 'src/essential.ts',
      reactivity: 'src/reactivity/index.ts',
      http: 'src/http/index.ts',
      utils: 'src/utils/index.ts',
      // Camada WebGPU. Entrada propria porque ela custa cerca de 8 KB gzip e o
      // build completo nao tem essa folga no orcamento. Em ESM as partes comuns
      // saem em chunks compartilhados, entao o runtime continua sendo um so.
      gpu: 'src/gpu/plugin.ts',
      // Camada de tempo real. Mesma historia da GPU: dentro do build completo
      // ela levava o arquivo de 127.58 para 134.22 KB gzip, com teto de 133.
      // Entrada propria em vez de meta inflada.
      socket: 'src/socket/plugin.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    banner: { js: banner },
  },

  // Build minimo: reatividade, directives, componentes, DOM e requisicoes.
  {
    entry: { 'voodoo.core': 'src/browser-minimo.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },
  {
    entry: { 'voodoo.core.min': 'src/browser-minimo.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },

  // Build essencial para CDN. E o arquivo servido por padrao.
  {
    entry: { voodoo: 'src/browser-essential.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },
  {
    entry: { 'voodoo.min': 'src/browser-essential.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },

  // Build completo: soma graficos, animacoes, roteador, idiomas, inspetor e
  // a biblioteca de componentes prontos.
  {
    entry: { 'voodoo.full': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },
  {
    entry: { 'voodoo.full.min': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: globalFooter,
  },
]);
