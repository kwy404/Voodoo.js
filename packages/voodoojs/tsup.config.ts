import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

/**
 * The version being built, for the playground's default runtime URL. Read from
 * package.json rather than stamped, so a published file always names its own
 * release.
 */
const version: string = JSON.parse(readFileSync('package.json', 'utf8')).version;
const define = { __VOODOO_VERSION__: JSON.stringify(version) };

const banner = `/**
 * Voodoo.js v1.0.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */`;

/** Publishes the global object after the IIFE finishes evaluating. */
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
      // WebGPU layer. Separate entry because it costs about 8 KB gzip and the
      // full build does not have that slack in the budget. In ESM the common parts
      // go into shared chunks, so the runtime stays as one.
      gpu: 'src/gpu/plugin.ts',
      // Real-time layer. Same story as GPU: within the full build
      // it took the file from 127.58 to 134.22 KB gzip, with a ceiling of 133.
      // Separate entry instead of inflated metadata.
      socket: 'src/socket/plugin.ts',
      // The embeddable runner. It never loads the library itself; the frame does.
      playground: 'src/playground/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    banner: { js: banner },
    define,
  },

  // The runner for a script tag, as window.VoodooPlayground. Small and separate,
  // so no page pays for it unless it embeds an example.
  {
    entry: { 'voodoo.playground': 'src/playground/index.ts' },
    format: ['iife'],
    globalName: 'VoodooPlayground',
    outExtension: () => ({ js: '.js' }),
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    define,
  },
  {
    entry: { 'voodoo.playground.min': 'src/playground/index.ts' },
    format: ['iife'],
    globalName: 'VoodooPlayground',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2018',
    banner: { js: banner },
    define,
  },

  // Minimal build: reactivity, directives, components, DOM and requests.
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

  // Essential build for CDN. It's the file served by default.
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

  // Full build: includes graphics, animations, router, languages, inspector and
  // the ready-made component library.
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
