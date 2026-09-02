/**
 * @module gpu/plugin
 *
 * Separate entry for the GPU layer.
 *
 * The module doesn't go into CDN bundles for a measured reason, not a preference:
 * it costs around 8 KB compressed, and the complete build has a 133 KB ceiling.
 * WebGPU is a niche feature, so those who pay for it are those who use it.
 *
 * ```js
 * import V from 'voodoojs'
 * import 'voodoojs/dist/gpu.js'   // registers v-shader and sets up V.gpu
 * ```
 *
 * Importing this file has two effects: registers the `v-shader` directive and
 * makes `V.gpu` available. In ESM builds both sides share the same
 * runtime, because common parts go out in shared chunks.
 */

// Side effect: registers v-shader in the directives registry.
import '../directives/gpu';

import { gpu } from './index';

export { gpu };
export * from './index';
export { classifyShaderSource, resolveShaderSource } from '../directives/gpu';

/**
 * Plugin in the format accepted by `V.use()`.
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

// When the global object already exists, linking `V.gpu` alone avoids one more
// configuration step for those who just want to use the directive.
const target = (globalThis as Record<string, any>).V;
if (target && typeof target === 'object' && !target.gpu) target.gpu = gpu;

export default voodooGpu;
