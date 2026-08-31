/**
 * Integration: o subconjunto da suite marcado como integracao.
 *
 * Marcacao aceita: pasta `test/integration/` (ou `e2e/`) ou sufixo
 * `*.integration.test.ts` / `*.e2e.test.ts`.
 */

import { isIntegration, subsetResult } from './test-taxonomy.mjs';

export const meta = { label: 'Integration' };

export async function run(ctx) {
  const result = await ctx.vitest();
  return subsetResult(
    'integracao',
    result,
    isIntegration,
    'mova os testes que montam DOM + directives + http para packages/voodoojs/test/integration/ ou renomeie para *.integration.test.ts'
  );
}
