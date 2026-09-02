/**
 * @module gpu/types
 *
 * Minimal WebGPU types, hand-written.
 *
 * The project doesn't accept new dependencies, so `@webgpu/types` is out and
 * TypeScript's `lib.dom` still doesn't describe `navigator.gpu`. What's here
 * is only the slice of the API the module actually calls: descriptors stay as
 * `any` on purpose, because copying the entire schema would just create a second
 * source of truth to keep in sync.
 *
 * The usage constants are also local. In production they exist as globals
 * (`GPUBufferUsage` and company), but in jsdom they don't exist at all, and the module
 * needs to be importable in an environment without GPU without blowing up on the first line.
 */
/** Texture format name, like `bgra8unorm`. */
type GPUTextureFormat = string;
interface GPUBuffer {
    destroy(): void;
}
interface GPUTextureView {
    readonly __textureView?: never;
}
interface GPUTexture {
    createView(descriptor?: any): GPUTextureView;
    destroy(): void;
    readonly width: number;
    readonly height: number;
}
interface GPUSampler {
    readonly __sampler?: never;
}
/** A WGSL compiler message. `lineNum` starts at 1. */
interface GPUCompilationMessage {
    readonly message: string;
    readonly type: 'error' | 'warning' | 'info';
    readonly lineNum: number;
    readonly linePos: number;
}
interface GPUCompilationInfo {
    readonly messages: readonly GPUCompilationMessage[];
}
interface GPUShaderModule {
    getCompilationInfo?(): Promise<GPUCompilationInfo>;
}
interface GPUBindGroupLayout {
    readonly __bindGroupLayout?: never;
}
interface GPUBindGroup {
    readonly __bindGroup?: never;
}
interface GPUPipelineLayout {
    readonly __pipelineLayout?: never;
}
interface GPURenderPipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
}
interface GPUComputePipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
}
interface GPURenderPassEncoder {
    setPipeline(pipeline: GPURenderPipeline): void;
    setBindGroup(index: number, group: GPUBindGroup | null): void;
    draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
    end(): void;
}
interface GPUComputePassEncoder {
    setPipeline(pipeline: GPUComputePipeline): void;
    setBindGroup(index: number, group: GPUBindGroup | null): void;
    dispatchWorkgroups(x: number, y?: number, z?: number): void;
    end(): void;
}
interface GPUCommandBuffer {
    readonly __commandBuffer?: never;
}
interface GPUCommandEncoder {
    beginRenderPass(descriptor: any): GPURenderPassEncoder;
    beginComputePass(descriptor?: any): GPUComputePassEncoder;
    finish(descriptor?: any): GPUCommandBuffer;
}
interface GPUQueue {
    submit(buffers: GPUCommandBuffer[]): void;
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer | ArrayBufferView, dataOffset?: number, size?: number): void;
}
interface GPUDeviceLostInfo {
    readonly reason: string;
    readonly message: string;
}
interface GPUDevice {
    readonly queue: GPUQueue;
    readonly limits: Record<string, number>;
    readonly lost?: Promise<GPUDeviceLostInfo>;
    createBuffer(descriptor: any): GPUBuffer;
    createTexture(descriptor: any): GPUTexture;
    createSampler(descriptor?: any): GPUSampler;
    createShaderModule(descriptor: any): GPUShaderModule;
    createBindGroup(descriptor: any): GPUBindGroup;
    createBindGroupLayout(descriptor: any): GPUBindGroupLayout;
    createPipelineLayout(descriptor: any): GPUPipelineLayout;
    createRenderPipeline(descriptor: any): GPURenderPipeline;
    createComputePipeline(descriptor: any): GPUComputePipeline;
    createCommandEncoder(descriptor?: any): GPUCommandEncoder;
    pushErrorScope(filter: string): void;
    popErrorScope(): Promise<{
        message: string;
    } | null>;
    destroy(): void;
}
interface GPUAdapter {
    readonly features: {
        has(name: string): boolean;
    };
    readonly limits: Record<string, number>;
    readonly info?: Record<string, unknown>;
    requestDevice(descriptor?: any): Promise<GPUDevice>;
}
interface GPUCanvasContext {
    configure(descriptor: any): void;
    unconfigure(): void;
    getCurrentTexture(): GPUTexture;
}
/** O objeto exposto em `navigator.gpu`. */
interface GPUNavigator {
    requestAdapter(options?: any): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat?(): GPUTextureFormat;
}
/** Bits de `GPUBufferUsage`. */
declare const BUFFER_USAGE: {
    readonly MAP_READ: 1;
    readonly MAP_WRITE: 2;
    readonly COPY_SRC: 4;
    readonly COPY_DST: 8;
    readonly UNIFORM: 64;
    readonly STORAGE: 128;
};
/** Bits de `GPUTextureUsage`. */
declare const TEXTURE_USAGE: {
    readonly COPY_SRC: 1;
    readonly COPY_DST: 2;
    readonly TEXTURE_BINDING: 4;
    readonly STORAGE_BINDING: 8;
    readonly RENDER_ATTACHMENT: 16;
};
/** Bits de `GPUShaderStage`. */
declare const SHADER_STAGE: {
    readonly VERTEX: 1;
    readonly FRAGMENT: 2;
    readonly COMPUTE: 4;
};

/**
 * @module gpu/wgsl
 *
 * Reading WGSL code to figure out what the shader needs on its own.
 *
 * The idea came from vgpu: whoever writes the shader already declared `@group`, `@binding`
 * and the uniforms `struct` inside it. Repeating this in JavaScript is double work
 * and one more chance for the two sides to get out of sync. So the module
 * reads the source and builds the bind group layout, buffer size and offset
 * of each field straight from the shader itself.
 *
 * Everything here is pure text functions: doesn't touch the DOM, doesn't need GPU and
 * runs the same in jsdom. That's why this is the most tested part of the module.
 *
 * What reflection covers is described in `docs/gpu.md`. In summary: `struct`
 * declared in the file itself, scalars, vectors, matrices and fixed-size arrays,
 * plus textures, samplers and storage buffers. Left out: `@align`,
 * `@size`, vertex `@location`, unsized arrays inside uniform (which
 * WGSL also forbids) and user-defined `type`/alias.
 */
/** Family of a WGSL type. */
type WgslTypeKind = 'scalar' | 'vector' | 'matrix' | 'array' | 'struct' | 'unknown';
/** Description of a type, with size and alignment already resolved. */
interface WgslType {
    /** Original text, like `vec3<f32>`. */
    text: string;
    kind: WgslTypeKind;
    /** Base scalar. `f32` for types with no clear scalar. */
    scalar: 'f32' | 'i32' | 'u32' | 'f16' | 'bool';
    /** Bytes occupied. */
    size: number;
    /** Required alignment, in bytes. */
    align: number;
    /** How many scalars the value has in total. `vec3<f32>` has 3. */
    components: number;
    /** Matrix columns. */
    columns?: number;
    /** Matrix rows, i.e., the size of each column. */
    rows?: number;
    /** Distance between array elements, or between matrix columns. */
    stride?: number;
    /** Number of elements in a fixed-size array. */
    count?: number;
    /** Type of an array element. */
    element?: WgslType;
    /** Struct name, when `kind` is `struct`. */
    struct?: string;
}
/** A struct field, with offset within the buffer. */
interface WgslField {
    name: string;
    type: WgslType;
    /** Offset in bytes from the start of the struct. */
    offset: number;
}
/** Struct declared in the shader. */
interface WgslStruct {
    name: string;
    fields: WgslField[];
    /** Total size, already rounded to alignment. */
    size: number;
    align: number;
}
/** Papel de um recurso ligado ao shader. */
type WgslBindingKind = 'uniform' | 'storage' | 'texture' | 'storage-texture' | 'sampler' | 'unknown';
/** Um `@group(x) @binding(y) var ...` encontrado na fonte. */
interface WgslBinding {
    group: number;
    binding: number;
    name: string;
    kind: WgslBindingKind;
    /** Texto do tipo, como `texture_2d<f32>`. */
    typeText: string;
    /** Acesso declarado em `var<storage, read_write>`. */
    access: 'read' | 'read-write' | 'write';
    /** Struct dos uniforms, quando o tipo aponta para um struct conhecido. */
    struct?: WgslStruct;
    /** `true` para `sampler_comparison` e texturas de profundidade. */
    comparison?: boolean;
    /** Dimensao da textura, como `2d`, `cube` ou `3d`. */
    viewDimension?: string;
    /** Tipo de amostragem da textura: `float`, `unfilterable-float`, `depth`... */
    sampleType?: string;
    multisampled?: boolean;
}
/** Um ponto de entrada declarado com `@vertex`, `@fragment` ou `@compute`. */
interface WgslEntry {
    stage: 'vertex' | 'fragment' | 'compute';
    name: string;
    /** Tamanho do workgroup, apenas para `@compute`. */
    workgroupSize?: [number, number, number];
}
/** Resultado completo da leitura de um shader. */
interface WgslReflection {
    structs: Record<string, WgslStruct>;
    bindings: WgslBinding[];
    entries: WgslEntry[];
    /** Atalho para o primeiro binding de uniform encontrado. */
    uniform?: WgslBinding;
}
/**
 * Removes line and block comments. WGSL allows nested blocks, so
 * counting is done with depth instead of a regex.
 *
 * Removed characters become spaces instead of disappearing, so the line number
 * still matches the original file in error messages.
 */
declare function stripWgslComments(source: string): string;
/**
 * Splits by top-level commas. Without this `array<vec4<f32>, 8>` would be
 * cut in the middle of the generic.
 */
declare function splitTopLevel(text: string): string[];
/**
 * Describes a WGSL type with size and alignment.
 *
 * The rules followed are for the `uniform` address space, which is the module's
 * use case: struct aligned to 16 bytes and array stride also a multiple of 16.
 * For `storage` WGSL is more relaxed; the difference is documented.
 */
declare function describeWgslType(text: string, structs?: Record<string, WgslStruct>): WgslType;
/**
 * Reads `struct`s from the source and calculates the offset of each field.
 *
 * Structs are resolved in multiple passes because one can reference another
 * that appears later in the file. Three passes cover any reasonable nesting
 * without becoming a dependency graph.
 */
declare function reflectStructs(source: string): Record<string, WgslStruct>;
/** Le os `@group @binding var ...` da fonte. */
declare function reflectBindings(source: string, structs: Record<string, WgslStruct>): WgslBinding[];
/** Le os `@vertex`, `@fragment` e `@compute` da fonte. */
declare function reflectEntries(source: string): WgslEntry[];
/**
 * Le um shader inteiro e devolve tudo que o runtime precisa para monta-lo.
 *
 * ```js
 * const info = V.gpu.reflect(wgsl)
 * info.uniform.struct.fields  // [{ name: 'time', offset: 0, ... }]
 * ```
 *
 * A funcao nunca lanca: fonte vazia ou invalida devolve uma reflexao vazia, e
 * quem chama decide o que fazer. Um shader quebrado quem reprova e o driver,
 * com mensagem de erro muito melhor que a nossa.
 */
declare function reflectWgsl(source: string): WgslReflection;
/** Procura o nome do ponto de entrada de um estagio. */
declare function findEntry(reflection: WgslReflection, stage: WgslEntry['stage']): WgslEntry | undefined;
/**
 * Monta um struct a partir de um objeto de valores, quando nao existe shader
 * para consultar. E o caminho de `V.gpu.uniforms(gpu, { ... })`.
 *
 * A ordem das chaves do objeto vira a ordem dos campos, entao o objeto precisa
 * espelhar o `struct` do shader. Quando existe shader, prefira sempre a
 * reflexao: ela nao depende de ninguem lembrar a ordem certa.
 */
declare function inferStruct(values: Record<string, unknown>, name?: string): WgslStruct;
/** Transforma um valor solto na lista de escalares que ele representa. */
declare function flattenValue(value: unknown, components: number): number[];
/** Escreve um campo no buffer, respeitando o passo entre colunas da matriz. */
declare function writeField(view: DataView, field: WgslField, value: unknown): boolean;
/**
 * Escreve um objeto de valores dentro de um buffer que segue o layout do
 * struct. Campos ausentes ficam como estavam, o que permite atualizar so o que
 * mudou sem reenviar o resto.
 *
 * @returns os nomes dos campos que foram realmente escritos
 */
declare function writeStruct(buffer: ArrayBuffer, struct: WgslStruct, values: Record<string, unknown>): string[];
/** Cria o buffer do struct ja com os valores iniciais escritos. */
declare function packStruct(struct: WgslStruct, values?: Record<string, unknown>): ArrayBuffer;

/**
 * @module gpu
 *
 * Voodoo's WebGPU layer, in the spirit of vgpu: loose functions that receive
 * context as the first argument, with no hidden global state and no classes
 * to instantiate.
 *
 * ```js
 * const gpu = await V.gpu.init()
 * const tela = V.gpu.surface(gpu, canvas, { dpr: [1, 2] })
 * const ondas = V.gpu.effect(gpu, wgsl, { set: { speed: 1.4 } })
 * const parar = V.gpu.frameLoop(gpu, (frame) => frame.pass(tela, ondas))
 * ```
 *
 * The rule that governs everything: **never throw when WebGPU doesn't exist**.
 * `supported()` returns `false`, `init()` returns `null` and everything else accepts
 * `null` in place of context and becomes a no-op. A page using GPU
 * for decoration can't break in a browser that doesn't have GPU yet.
 *
 * Shader bindings are not declared by hand: `gpu/wgsl` reads the source and builds
 * the bind group layout, buffer size and offset of each uniform.
 */

/** Anything that occupies GPU memory and knows how to release itself. */
interface Disposable {
    destroy(): void;
}
/** Context returned by `init()`. It's the first argument to everything. */
interface GpuContext {
    adapter: GPUAdapter;
    device: GPUDevice;
    queue: GPUDevice['queue'];
    /** Preferred canvas format on this device. */
    format: GPUTextureFormat;
    /** Open resources, so `destroy(gpu)` doesn't forget any. */
    readonly resources: Set<Disposable>;
    /** Becomes `true` after `destroy(gpu)`. All operations become no-ops. */
    destroyed: boolean;
}
/** Options for `init()`. */
interface GpuInitOptions {
    /** Adapter preference: `low-power` saves battery. */
    powerPreference?: 'low-power' | 'high-performance';
    /** Optional features requested from the device. Unavailable ones are ignored. */
    features?: string[];
    /** Desired minimum limits. */
    limits?: Record<string, number>;
    label?: string;
}
/**
 * `true` when the browser exposes WebGPU. Never throws, not in Node,
 * not in jsdom, not in old browsers.
 */
declare function supported(): boolean;
/**
 * Opens the adapter and device.
 *
 * ```js
 * const gpu = await V.gpu.init()
 * if (!gpu) mostrarVersaoSemGpu()
 * ```
 *
 * @returns the context, or `null` when there's no WebGPU or the adapter refused
 */
declare function init(options?: GpuInitOptions): Promise<GpuContext | null>;
/**
 * Single context for the page, created on first call.
 *
 * One device per tab is enough: it's what the `v-shader` directive uses, so
 * ten canvases on the same page don't open ten devices.
 */
declare function shared(options?: GpuInitOptions): Promise<GpuContext | null>;
/** Forgets the shared context. Used by `destroy()` and by tests. */
declare function resetShared(): void;
/** Options for `surface()`. */
interface GpuSurfaceOptions {
    /** Accepted range of `devicePixelRatio`, like `[1, 2]`. Default `[1, 2]`. */
    dpr?: [number, number];
    /** Canvas format. Default the device's preferred one. */
    format?: GPUTextureFormat;
    /** Makes the canvas transparent. Default `false`. */
    alpha?: boolean;
}
/** Canvas configured to receive frames from the GPU. */
interface GpuSurface {
    readonly canvas: HTMLCanvasElement | null;
    readonly format: GPUTextureFormat;
    readonly width: number;
    readonly height: number;
    /** View of the current frame. `null` when there's no GPU. */
    view(): GPUTextureView | null;
    /** Remeasures the canvas and reconfigures the context. */
    resize(): void;
    destroy(): void;
}
/**
 * Prepares a `<canvas>` to receive frames.
 *
 * The buffer size follows the CSS size multiplied by
 * `devicePixelRatio`, capped by the `dpr` range and the device's maximum texture size.
 * A `ResizeObserver` keeps this up to date automatically.
 */
declare function surface(gpu: GpuContext | null, canvas: HTMLCanvasElement | null, options?: GpuSurfaceOptions): GpuSurface;
/** Options for `target()`. */
interface GpuTargetOptions {
    width: number;
    height: number;
    format?: GPUTextureFormat;
    label?: string;
}
/** Texture used as a render pass target, to chain effects. */
interface GpuTarget {
    readonly texture: GPUTexture | null;
    readonly width: number;
    readonly height: number;
    readonly format: GPUTextureFormat;
    view(): GPUTextureView | null;
    destroy(): void;
}
/** Creates a target texture for off-screen rendering. */
declare function target(gpu: GpuContext | null, options: GpuTargetOptions): GpuTarget;
/** Uniform buffer with known layout. */
interface GpuUniforms {
    /** Layout in use, whether from reflection or initial values. */
    readonly struct: WgslStruct;
    readonly buffer: GPUBuffer | null;
    /** Last applied values. */
    readonly values: Record<string, unknown>;
    /** Updates the given fields and sends the buffer. */
    set(values: Record<string, unknown>): void;
    destroy(): void;
}
/**
 * Creates a uniform buffer from initial values.
 *
 * ```js
 * const u = V.gpu.uniforms(gpu, { time: 0, tint: '#ff3d8b' })
 * u.set({ time: 1.5 })
 * ```
 *
 * Without a shader to consult, the layout comes from the object's key order. When
 * there's a shader, `V.gpu.effect` prefers reflection, which doesn't depend on anyone
 * remembering the right order.
 */
declare function uniforms(gpu: GpuContext | null, initial?: Record<string, unknown>): GpuUniforms;
/** Time in the frame loop, in seconds. */
interface GpuClock {
    /** Seconds since the first frame. */
    readonly time: number;
    /** Seconds since the previous frame. */
    readonly delta: number;
    /** Current frame number, starting at zero. */
    readonly frame: number;
    /** Advances the clock. The frame loop calls it automatically. */
    tick(now?: number): void;
    reset(): void;
}
/**
 * Creates a clock. The context comes in for symmetry with the rest of the API: the clock
 * works the same with or without GPU, so the directive can write one path.
 */
declare function clock(_gpu?: GpuContext | null): GpuClock;
/** Options for `effect()`. */
interface GpuEffectOptions {
    /** Initial uniform values. */
    set?: Record<string, unknown>;
    /** Name of `@fragment`. Default the first found in the source. */
    entry?: string;
    /** Destination format. Default the canvas's preferred format. */
    format?: GPUTextureFormat;
    /** Views bound to texture bindings, by variable name in WGSL. */
    textures?: Record<string, GPUTextureView>;
    label?: string;
}
/** A full-screen shader ready to draw. */
interface GpuEffect {
    /** What reflection found in the source. Works even without GPU. */
    readonly reflection: WgslReflection;
    /** `false` when the pipeline didn't come up. Drawing becomes a no-op. */
    readonly ok: boolean;
    readonly uniforms: GpuUniforms;
    /** Updates uniforms without recreating the pipeline. */
    set(values: Record<string, unknown>): void;
    /** Records the draw commands. Called by `frame.pass`. */
    draw(pass: GPURenderPassEncoder): void;
    destroy(): void;
}
/**
 * Compiles a full-screen shader.
 *
 * When the source doesn't bring `@vertex`, Voodoo adds a triangle covering
 * the screen and delivers `@location(0) uv` to the fragment. Writing just the `@fragment` is
 * the common case, and what the `v-shader` directive expects.
 *
 * ```js
 * const efeito = V.gpu.effect(gpu, wgsl, { set: { speed: 1.2 } })
 * efeito.set({ speed: 2 })   // doesn't recompile anything
 * ```
 */
declare function effect(gpu: GpuContext | null, wgsl: string, options?: GpuEffectOptions): GpuEffect;
/** Options for `compute()`. */
interface GpuComputeOptions {
    set?: Record<string, unknown>;
    entry?: string;
    /** How many workgroups to dispatch. Default `[1, 1, 1]`. */
    workgroups?: [number, number?, number?];
    textures?: Record<string, GPUTextureView>;
    label?: string;
}
/** A compute shader ready to dispatch. */
interface GpuCompute {
    readonly reflection: WgslReflection;
    readonly ok: boolean;
    readonly uniforms: GpuUniforms;
    set(values: Record<string, unknown>): void;
    /** Records the dispatch. Called by `frame.compute`. */
    dispatch(pass: GPUComputePassEncoder, workgroups?: [number, number?, number?]): void;
    destroy(): void;
}
/** Compiles a compute shader. */
declare function compute(gpu: GpuContext | null, wgsl: string, options?: GpuComputeOptions): GpuCompute;
/** Target accepted by `frame.pass`. */
type GpuPassTarget = GpuSurface | GpuTarget | null;
/** Clear color, like `[r, g, b, a]` from 0 to 1. */
type GpuClearColor = [number, number, number, number];
/** The frame being built, delivered to the callback of `frame` and `frameLoop`. */
interface GpuFrame {
    readonly encoder: GPUCommandEncoder | null;
    /** Loop clock. Outside the loop, always marks frame zero. */
    readonly clock: GpuClock;
    /** Opens a render pass on the target and executes effects in order. */
    pass(destino: GpuPassTarget, ...operacoes: Array<GpuEffect | null | undefined>): void;
    /** Opens a compute pass and dispatches operations in order. */
    compute(...operacoes: Array<GpuCompute | null | undefined>): void;
    /** Color used when clearing the target. Default transparent. */
    clear: GpuClearColor;
}
/**
 * Records and submits a frame.
 *
 * ```js
 * V.gpu.frame(gpu, (frame) => frame.pass(tela, ondas))
 * ```
 */
declare function frame(gpu: GpuContext | null, build: (frame: GpuFrame) => void, relogio?: GpuClock): void;
/**
 * Frame loop with `requestAnimationFrame`.
 *
 * ```js
 * const parar = V.gpu.frameLoop(gpu, (frame) => {
 *   ondas.set({ time: frame.clock.time })
 *   frame.pass(tela, ondas)
 * })
 * ```
 *
 * @returns function that stops the loop. Without GPU, the loop never starts.
 */
declare function frameLoop(gpu: GpuContext | null, build: (frame: GpuFrame) => void): () => void;
/**
 * Releases everything the context opened and shuts down the device.
 *
 * Calling twice does no harm, and calling with `null` doesn't either.
 */
declare function destroy(gpu: GpuContext | null): void;
/**
 * Everything from the module grouped, to expose as `V.gpu` without clashing with names of
 * other modules, like the `effect` from reactivity.
 */
declare const gpu: {
    supported: typeof supported;
    init: typeof init;
    shared: typeof shared;
    surface: typeof surface;
    target: typeof target;
    uniforms: typeof uniforms;
    clock: typeof clock;
    effect: typeof effect;
    compute: typeof compute;
    frame: typeof frame;
    frameLoop: typeof frameLoop;
    destroy: typeof destroy;
    /** WGSL reading, useful on its own for inspecting a shader. */
    reflect: typeof reflectWgsl;
};

export { effect as $, type GpuContext as A, BUFFER_USAGE as B, type GpuEffect as C, type GpuEffectOptions as D, type GpuFrame as E, type GpuInitOptions as F, type GPUAdapter as G, type GpuPassTarget as H, type GpuSurface as I, type GpuSurfaceOptions as J, type GpuTarget as K, type GpuTargetOptions as L, type GpuUniforms as M, type WgslBindingKind as N, type WgslEntry as O, type WgslField as P, type WgslReflection as Q, type WgslStruct as R, SHADER_STAGE as S, TEXTURE_USAGE as T, type WgslType as U, type WgslTypeKind as V, type WgslBinding as W, clock as X, compute as Y, describeWgslType as Z, destroy as _, type GPUBindGroup as a, findEntry as a0, flattenValue as a1, frame as a2, frameLoop as a3, gpu as a4, inferStruct as a5, init as a6, packStruct as a7, reflectBindings as a8, reflectEntries as a9, reflectStructs as aa, reflectWgsl as ab, resetShared as ac, shared as ad, splitTopLevel as ae, stripWgslComments as af, supported as ag, surface as ah, target as ai, uniforms as aj, writeField as ak, writeStruct as al, type GPUBindGroupLayout as b, type GPUBuffer as c, type GPUCanvasContext as d, type GPUCommandBuffer as e, type GPUCommandEncoder as f, type GPUCompilationInfo as g, type GPUCompilationMessage as h, type GPUComputePassEncoder as i, type GPUComputePipeline as j, type GPUDevice as k, type GPUDeviceLostInfo as l, type GPUNavigator as m, type GPUPipelineLayout as n, type GPUQueue as o, type GPURenderPassEncoder as p, type GPURenderPipeline as q, type GPUSampler as r, type GPUShaderModule as s, type GPUTexture as t, type GPUTextureFormat as u, type GPUTextureView as v, type GpuClearColor as w, type GpuClock as x, type GpuCompute as y, type GpuComputeOptions as z };
