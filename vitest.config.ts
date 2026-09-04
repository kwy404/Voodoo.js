import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/**/test/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['packages/voodoojs/src/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      /**
       * The thresholds cover only the core: parser, reactivity, runtime, DOM and
       * HTTP. A single global target would not help here, because large and less
       * critical modules (ready-made UI, graphics, sound) would pull the average down
       * and force fixing a number that the core passes easily.
       *
       * What matters is `branches`. High line coverage with low branch coverage means
       * the happy path was visited and the rest of the `if` never ran, which is exactly
       * where defects live.
       *
       * The values come from measurement on 2026-08-31, rounded down a few points.
       * The slack is there so the gate catches real regression instead of firing at every
       * refactoring that moves two lines. When raising a number here, raise the test
       * that supports it together.
       *
       * Measured: parser 85.40 branches / 85.17 lines, reactivity 81.47 / 85.69,
       * runtime 80.50 / 82.33, dom 51.59 / 36.40, http 76.19 / 65.59.
       */
      thresholds: {
        '**/packages/voodoojs/src/parser/**': {
          branches: 82,
          statements: 82,
          lines: 82,
        },
        '**/packages/voodoojs/src/reactivity/**': {
          branches: 78,
          statements: 82,
          lines: 82,
        },
        '**/packages/voodoojs/src/runtime/**': {
          branches: 77,
          statements: 79,
          lines: 79,
        },
        // `dom` came up from the worst level of the core to full coverage. Measured
        // 100/100 branches and lines; the threshold sits just below, with margin
        // for the instrumentation's own noise.
        '**/packages/voodoojs/src/dom/**': {
          branches: 95,
          statements: 95,
          lines: 95,
        },
        '**/packages/voodoojs/src/http/**': {
          branches: 88,
          statements: 90,
          lines: 90,
        },
        '**/packages/voodoojs/src/forms/**': {
          branches: 85,
          statements: 88,
          lines: 88,
        },
        '**/packages/voodoojs/src/router/**': {
          branches: 88,
          statements: 95,
          lines: 95,
        },
        '**/packages/voodoojs/src/i18n/**': {
          branches: 90,
          statements: 95,
          lines: 95,
        },
      },
    },
  },
});
