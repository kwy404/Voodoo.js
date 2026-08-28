import { defineConfig } from 'tsup';

const banner = `/**
 * Voodoo.js v0.1.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */`;

export default defineConfig([
  // Builds modulares para bundlers (ESM + CJS + tipos, com tree shaking).
  {
    entry: {
      index: 'src/index.ts',
      reactivity: 'src/reactivity/index.ts',
      http: 'src/http/index.ts',
      utils: 'src/utils/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    banner: { js: banner },
  },
  // Build de navegador (CDN): global `V` e `Voodoo`, com auto init.
  {
    entry: { voodoo: 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: {
      js: 'if(typeof window!=="undefined"){window.V=Voodoo.default||Voodoo;window.Voodoo=window.V;}',
    },
  },
  {
    entry: { 'voodoo.min': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Voodoo',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    footer: {
      js: 'if(typeof window!=="undefined"){window.V=Voodoo.default||Voodoo;window.Voodoo=window.V;}',
    },
  },
]);
