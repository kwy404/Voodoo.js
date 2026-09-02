export { B as BUFFER_USAGE, G as GPUAdapter, a as GPUBindGroup, b as GPUBindGroupLayout, c as GPUBuffer, d as GPUCanvasContext, e as GPUCommandBuffer, f as GPUCommandEncoder, g as GPUCompilationInfo, h as GPUCompilationMessage, i as GPUComputePassEncoder, j as GPUComputePipeline, k as GPUDevice, l as GPUDeviceLostInfo, m as GPUNavigator, n as GPUPipelineLayout, o as GPUQueue, p as GPURenderPassEncoder, q as GPURenderPipeline, r as GPUSampler, s as GPUShaderModule, t as GPUTexture, u as GPUTextureFormat, v as GPUTextureView, w as GpuClearColor, x as GpuClock, y as GpuCompute, z as GpuComputeOptions, A as GpuContext, C as GpuEffect, D as GpuEffectOptions, E as GpuFrame, F as GpuInitOptions, H as GpuPassTarget, I as GpuSurface, J as GpuSurfaceOptions, K as GpuTarget, L as GpuTargetOptions, M as GpuUniforms, S as SHADER_STAGE, T as TEXTURE_USAGE, W as WgslBinding, N as WgslBindingKind, O as WgslEntry, P as WgslField, Q as WgslReflection, R as WgslStruct, U as WgslType, V as WgslTypeKind, X as clock, Y as compute, Z as describeWgslType, _ as destroy, $ as effect, a0 as findEntry, a1 as flattenValue, a2 as frame, a3 as frameLoop, a4 as gpu, a5 as inferStruct, a6 as init, a7 as packStruct, a8 as reflectBindings, a9 as reflectEntries, aa as reflectStructs, ab as reflectWgsl, ac as resetShared, ad as shared, ae as splitTopLevel, af as stripWgslComments, ag as supported, ah as surface, ai as target, aj as uniforms, ak as writeField, al as writeStruct } from './index-DIj3O4Ap.cjs';

/**
 * @module directives/gpu
 *
 * `v-shader`: a WebGPU shader running on a `<canvas>` without writing JavaScript.
 *
 * ```html
 * <canvas v-shader="waves.wgsl" :set="{ speed: velocity, tint: color }"></canvas>
 * <canvas v-shader="#my-shader" v-shader.visible></canvas>
 * <script type="x-shader/wgsl" id="my-shader"> ... </script>
 * ```
 *
 * The directive's commitment is the same as the `gpu` module: without WebGPU nothing breaks.
 * The canvas gets `data-gpu="unsupported"`, fires `voodoo:gpu-unsupported`, and the
 * content inside it appears in its place. No rAF is scheduled,
 * no observer stays open, and the console only gets a warning in dev mode.
 */
/** Where the shader text comes from. */
type ShaderSourceKind = 'inline' | 'selector' | 'url' | 'empty';
/**
 * Decides if the attribute value is WGSL written right there, an element
 * selector, or an address to fetch.
 *
 * The rule is by elimination: `#` only appears in selectors, and WGSL always has
 * a declaration or a key. What's left is an address, the most common case.
 */
declare function classifyShaderSource(text: string): ShaderSourceKind;
/**
 * Resolves the shader text.
 *
 * @returns the WGSL, or empty string when the source doesn't exist
 */
declare function resolveShaderSource(text: string): Promise<string>;

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

/**
 * Plugin in the format accepted by `V.use()`.
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
