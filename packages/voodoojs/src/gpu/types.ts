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
export type GPUTextureFormat = string;

export interface GPUBuffer {
  destroy(): void;
}

export interface GPUTextureView {
  readonly __textureView?: never;
}

export interface GPUTexture {
  createView(descriptor?: any): GPUTextureView;
  destroy(): void;
  readonly width: number;
  readonly height: number;
}

export interface GPUSampler {
  readonly __sampler?: never;
}

/** A WGSL compiler message. `lineNum` starts at 1. */
export interface GPUCompilationMessage {
  readonly message: string;
  readonly type: 'error' | 'warning' | 'info';
  readonly lineNum: number;
  readonly linePos: number;
}

export interface GPUCompilationInfo {
  readonly messages: readonly GPUCompilationMessage[];
}

export interface GPUShaderModule {
  getCompilationInfo?(): Promise<GPUCompilationInfo>;
}

export interface GPUBindGroupLayout {
  readonly __bindGroupLayout?: never;
}

export interface GPUBindGroup {
  readonly __bindGroup?: never;
}

export interface GPUPipelineLayout {
  readonly __pipelineLayout?: never;
}

export interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

export interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

export interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, group: GPUBindGroup | null): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  end(): void;
}

export interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  setBindGroup(index: number, group: GPUBindGroup | null): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  end(): void;
}

export interface GPUCommandBuffer {
  readonly __commandBuffer?: never;
}

export interface GPUCommandEncoder {
  beginRenderPass(descriptor: any): GPURenderPassEncoder;
  beginComputePass(descriptor?: any): GPUComputePassEncoder;
  finish(descriptor?: any): GPUCommandBuffer;
}

export interface GPUQueue {
  submit(buffers: GPUCommandBuffer[]): void;
  writeBuffer(
    buffer: GPUBuffer,
    bufferOffset: number,
    data: ArrayBuffer | ArrayBufferView,
    dataOffset?: number,
    size?: number
  ): void;
}

export interface GPUDeviceLostInfo {
  readonly reason: string;
  readonly message: string;
}

export interface GPUDevice {
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
  popErrorScope(): Promise<{ message: string } | null>;
  destroy(): void;
}

export interface GPUAdapter {
  readonly features: { has(name: string): boolean };
  readonly limits: Record<string, number>;
  readonly info?: Record<string, unknown>;
  requestDevice(descriptor?: any): Promise<GPUDevice>;
}

export interface GPUCanvasContext {
  configure(descriptor: any): void;
  unconfigure(): void;
  getCurrentTexture(): GPUTexture;
}

/** O objeto exposto em `navigator.gpu`. */
export interface GPUNavigator {
  requestAdapter(options?: any): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat?(): GPUTextureFormat;
}

/** Bits de `GPUBufferUsage`. */
export const BUFFER_USAGE = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
} as const;

/** Bits de `GPUTextureUsage`. */
export const TEXTURE_USAGE = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
} as const;

/** Bits de `GPUShaderStage`. */
export const SHADER_STAGE = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
} as const;
