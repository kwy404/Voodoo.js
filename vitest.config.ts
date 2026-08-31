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
       * Os limites cobrem so o nucleo: parser, reatividade, runtime, DOM e
       * HTTP. Uma meta global unica nao serviria de nada aqui, porque modulos
       * grandes e pouco criticos (UI pronta, graficos, som) puxariam a media
       * para baixo e obrigariam a fixar um numero que o nucleo passa dormindo.
       *
       * O que interessa e `branches`. Cobertura de linha alta com ramo baixo
       * quer dizer que o caminho feliz foi visitado e o resto do `if` nunca
       * rodou, que e exatamente onde os defeitos moram.
       *
       * Os valores saem da medicao de 2026-08-31, arredondados uns tres pontos
       * para baixo. A folga existe para o portao travar regressao de verdade em
       * vez de disparar a cada refatoracao que move duas linhas. Ao subir um
       * numero aqui, suba junto com o teste que o sustenta.
       *
       * Medido: parser 85.40 ramos / 85.17 linhas, reactivity 81.47 / 85.69,
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
        // O modulo `dom` e o mais fraco do nucleo hoje: a fachada encadeada de
        // `query.ts` tem muito metodo sem teste. O limite fixa o patamar atual
        // para nao piorar; o alvo declarado e subir junto com os testes.
        '**/packages/voodoojs/src/dom/**': {
          branches: 48,
          statements: 33,
          lines: 33,
        },
        '**/packages/voodoojs/src/http/**': {
          branches: 73,
          statements: 62,
          lines: 62,
        },
      },
    },
  },
});
