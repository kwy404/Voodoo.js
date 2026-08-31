/**
 * Unit Tests: o subconjunto da suite marcado como unitario.
 *
 * Marcacao aceita: pasta `test/unit/` ou sufixo `*.unit.test.ts`.
 */

import { isUnit, subsetResult } from './test-taxonomy.mjs';

export const meta = { label: 'Unit Tests' };

export async function run(ctx) {
  const result = await ctx.vitest();
  return subsetResult(
    'unidade',
    result,
    isUnit,
    'mova os testes puros para packages/voodoojs/test/unit/ ou renomeie para *.unit.test.ts'
  );
}
