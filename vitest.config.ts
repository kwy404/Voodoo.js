import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/**/test/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['packages/voodoojs/src/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
});
