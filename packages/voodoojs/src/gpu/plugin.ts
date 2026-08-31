/**
 * @module gpu/plugin
 *
 * Entrada separada da camada GPU.
 *
 * O modulo nao entra nos bundles de CDN por um motivo medido, nao por gosto:
 * ele custa cerca de 8 KB comprimidos, e o build completo tem 133 KB de teto.
 * WebGPU e recurso de nicho, entao quem paga por ele e quem usa.
 *
 * ```js
 * import V from 'voodoojs'
 * import 'voodoojs/dist/gpu.js'   // registra v-shader e liga V.gpu
 * ```
 *
 * Importar este arquivo tem dois efeitos: registra a directive `v-shader` e
 * deixa `V.gpu` disponivel. Nos builds ESM os dois lados compartilham o mesmo
 * runtime, porque as partes comuns saem em chunks compartilhados.
 */

// Efeito colateral: registra v-shader no registro de directives.
import '../directives/gpu';

import { gpu } from './index';

export { gpu };
export * from './index';
export { classifyShaderSource, resolveShaderSource } from '../directives/gpu';

/**
 * Plugin no formato aceito por `V.use()`.
 *
 * ```js
 * import { voodooGpu } from 'voodoojs/dist/gpu.js'
 * V.use(voodooGpu)
 * ```
 */
export const voodooGpu = {
  name: 'gpu',
  install(V: Record<string, unknown>): void {
    if (!V.gpu) V.gpu = gpu;
  },
};

// Quando o objeto global ja existe, ligar `V.gpu` sozinho evita um passo a mais
// de configuracao para quem so quer usar a directive.
const alvo = (globalThis as Record<string, any>).V;
if (alvo && typeof alvo === 'object' && !alvo.gpu) alvo.gpu = gpu;

export default voodooGpu;
