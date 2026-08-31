export { B as BUFFER_USAGE, G as GPUAdapter, a as GPUBindGroup, b as GPUBindGroupLayout, c as GPUBuffer, d as GPUCanvasContext, e as GPUCommandBuffer, f as GPUCommandEncoder, g as GPUCompilationInfo, h as GPUCompilationMessage, i as GPUComputePassEncoder, j as GPUComputePipeline, k as GPUDevice, l as GPUDeviceLostInfo, m as GPUNavigator, n as GPUPipelineLayout, o as GPUQueue, p as GPURenderPassEncoder, q as GPURenderPipeline, r as GPUSampler, s as GPUShaderModule, t as GPUTexture, u as GPUTextureFormat, v as GPUTextureView, w as GpuClearColor, x as GpuClock, y as GpuCompute, z as GpuComputeOptions, A as GpuContext, C as GpuEffect, D as GpuEffectOptions, E as GpuFrame, F as GpuInitOptions, H as GpuPassTarget, I as GpuSurface, J as GpuSurfaceOptions, K as GpuTarget, L as GpuTargetOptions, M as GpuUniforms, S as SHADER_STAGE, T as TEXTURE_USAGE, W as WgslBinding, N as WgslBindingKind, O as WgslEntry, P as WgslField, Q as WgslReflection, R as WgslStruct, U as WgslType, V as WgslTypeKind, X as clock, Y as compute, Z as describeWgslType, _ as destroy, $ as effect, a0 as findEntry, a1 as flattenValue, a2 as frame, a3 as frameLoop, a4 as gpu, a5 as inferStruct, a6 as init, a7 as packStruct, a8 as reflectBindings, a9 as reflectEntries, aa as reflectStructs, ab as reflectWgsl, ac as resetShared, ad as shared, ae as splitTopLevel, af as stripWgslComments, ag as supported, ah as surface, ai as target, aj as uniforms, ak as writeField, al as writeStruct } from './index-ByMtfCvK.cjs';

/**
 * @module directives/gpu
 *
 * `v-shader`: um shader WebGPU rodando num `<canvas>` sem escrever JavaScript.
 *
 * ```html
 * <canvas v-shader="ondas.wgsl" :set="{ speed: velocidade, tint: cor }"></canvas>
 * <canvas v-shader="#meu-shader" v-shader.visible></canvas>
 * <script type="x-shader/wgsl" id="meu-shader"> ... </script>
 * ```
 *
 * O compromisso da directive e o mesmo do modulo `gpu`: sem WebGPU nada quebra.
 * O canvas ganha `data-gpu="unsupported"`, dispara `voodoo:gpu-unsupported` e o
 * conteudo que estava dentro dele aparece no lugar dele. Nenhum rAF e agendado,
 * nenhum observador fica aberto e o console so recebe um aviso em modo dev.
 */
/** De onde o texto do shader vem. */
type ShaderSourceKind = 'inline' | 'selector' | 'url' | 'empty';
/**
 * Decide se o valor do atributo e WGSL escrito ali mesmo, um seletor de
 * elemento ou um endereco para buscar.
 *
 * A regra e por eliminacao: `#` so aparece em seletor, e WGSL sempre traz uma
 * declaracao ou uma chave. O que sobra e endereco, que e o caso mais comum.
 */
declare function classifyShaderSource(text: string): ShaderSourceKind;
/**
 * Resolve o texto do shader.
 *
 * @returns o WGSL, ou string vazia quando a origem nao existe
 */
declare function resolveShaderSource(text: string): Promise<string>;

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

/**
 * Plugin no formato aceito por `V.use()`.
 *
 * ```js
 * import { voodooGpu } from 'voodoojs/dist/gpu.js'
 * V.use(voodooGpu)
 * ```
 */
declare const voodooGpu: {
    name: string;
    install(V: Record<string, unknown>): void;
};

export { classifyShaderSource, voodooGpu as default, resolveShaderSource, voodooGpu };
