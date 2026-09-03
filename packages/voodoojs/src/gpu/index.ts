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

import { handleError } from '../reactivity';
import { warn } from '../runtime/avisos';
import {
  BUFFER_USAGE,
  SHADER_STAGE,
  TEXTURE_USAGE,
  type GPUAdapter,
  type GPUBindGroup,
  type GPUBindGroupLayout,
  type GPUBuffer,
  type GPUCanvasContext,
  type GPUCommandEncoder,
  type GPUComputePassEncoder,
  type GPUComputePipeline,
  type GPUDevice,
  type GPUNavigator,
  type GPURenderPassEncoder,
  type GPURenderPipeline,
  type GPUSampler,
  type GPUShaderModule,
  type GPUTexture,
  type GPUTextureFormat,
  type GPUTextureView,
} from './types';
import {
  findEntry,
  inferStruct,
  packStruct,
  reflectWgsl,
  writeStruct,
  type WgslBinding,
  type WgslReflection,
  type WgslStruct,
} from './wgsl';

export * from './wgsl';
export type * from './types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** Anything that occupies GPU memory and knows how to release itself. */
interface Disposable {
  destroy(): void;
}

/** Context returned by `init()`. It's the first argument to everything. */
export interface GpuContext {
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
export interface GpuInitOptions {
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
export function supported(): boolean {
  try {
    return typeof navigator !== 'undefined' && !!(navigator as unknown as { gpu?: unknown }).gpu;
  } catch {
    return false;
  }
}

function navigatorGpu(): GPUNavigator | null {
  if (!supported()) return null;
  return (navigator as unknown as { gpu: GPUNavigator }).gpu;
}

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
export async function init(options: GpuInitOptions = {}): Promise<GpuContext | null> {
  const api = navigatorGpu();
  if (!api) return null;

  try {
    const adapter = await api.requestAdapter(
      options.powerPreference ? { powerPreference: options.powerPreference } : undefined
    );
    if (!adapter) return null;

    // Requesting a feature the adapter doesn't have makes `requestDevice` reject,
    // so the list is filtered beforehand instead of letting the promise break.
    const features = (options.features ?? []).filter((name) => adapter.features.has(name));
    const device = await adapter.requestDevice({
      label: options.label ?? 'voodoo',
      requiredFeatures: features,
      requiredLimits: options.limits,
    });

    const format = api.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
    const gpu: GpuContext = {
      adapter,
      device,
      queue: device.queue,
      format,
      resources: new Set(),
      destroyed: false,
    };

    // Losing the device (GPU switch, suspended tab) can't break the page:
    // the context just starts behaving as if it never existed.
    device.lost
      ?.then((info) => {
        gpu.destroyed = true;
        warn(`WebGPU device was lost (${info.reason}): ${info.message}`);
      })
      .catch(() => undefined);

    return gpu;
  } catch (err) {
    // An adapter that refuses is an expected case, not an application error.
    warn(`WebGPU available but device failed to open: ${String(err)}`);
    return null;
  }
}

/** `true` when the context exists and is still valid. */
function live(gpu: GpuContext | null | undefined): gpu is GpuContext {
  return !!gpu && !gpu.destroyed;
}

function track(gpu: GpuContext, resource: Disposable): void {
  gpu.resources.add(resource);
}

function untrack(gpu: GpuContext | null, resource: Disposable): void {
  gpu?.resources.delete(resource);
}

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

let sharedContext: Promise<GpuContext | null> | null = null;

/**
 * Single context for the page, created on first call.
 *
 * One device per tab is enough: it's what the `v-shader` directive uses, so
 * ten canvases on the same page don't open ten devices.
 */
export function shared(options?: GpuInitOptions): Promise<GpuContext | null> {
  if (!sharedContext) sharedContext = init(options);
  return sharedContext;
}

/** Forgets the shared context. Used by `destroy()` and by tests. */
export function resetShared(): void {
  sharedContext = null;
}

// ---------------------------------------------------------------------------
// Drawing surface
// ---------------------------------------------------------------------------

/** Options for `surface()`. */
export interface GpuSurfaceOptions {
  /** Accepted range of `devicePixelRatio`, like `[1, 2]`. Default `[1, 2]`. */
  dpr?: [number, number];
  /** Canvas format. Default the device's preferred one. */
  format?: GPUTextureFormat;
  /** Makes the canvas transparent. Default `false`. */
  alpha?: boolean;
}

/** Canvas configured to receive frames from the GPU. */
export interface GpuSurface {
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

const NO_SURFACE: GpuSurface = {
  canvas: null,
  format: '',
  width: 0,
  height: 0,
  view: () => null,
  resize: () => undefined,
  destroy: () => undefined,
};

/**
 * Prepares a `<canvas>` to receive frames.
 *
 * The buffer size follows the CSS size multiplied by
 * `devicePixelRatio`, capped by the `dpr` range and the device's maximum texture size.
 * A `ResizeObserver` keeps this up to date automatically.
 */
export function surface(
  gpu: GpuContext | null,
  canvas: HTMLCanvasElement | null,
  options: GpuSurfaceOptions = {}
): GpuSurface {
  if (!live(gpu) || !canvas) return NO_SURFACE;

  const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext | null;
  if (!context) return NO_SURFACE;

  const [minDpr, maxDpr] = options.dpr ?? [1, 2];
  const format = options.format ?? gpu.format;
  const alphaMode = options.alpha ? 'premultiplied' : 'opaque';
  const maxSize = gpu.device.limits.maxTextureDimension2D || 4096;

  let width = 0;
  let height = 0;
  let observer: ResizeObserver | null = null;
  let alive = true;

  context.configure({ device: gpu.device, format, alphaMode });

  const resize = (): void => {
    if (!alive) return;
    const ratio = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    const dpr = Math.min(Math.max(ratio, minDpr), maxDpr);
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || canvas.clientWidth || canvas.width || 300;
    const cssHeight = rect.height || canvas.clientHeight || canvas.height || 150;

    const next = {
      w: Math.max(1, Math.min(maxSize, Math.round(cssWidth * dpr))),
      h: Math.max(1, Math.min(maxSize, Math.round(cssHeight * dpr))),
    };
    if (next.w === width && next.h === height) return;

    width = next.w;
    height = next.h;
    canvas.width = width;
    canvas.height = height;
    // Reconfiguring after resizing avoids a stretched frame.
    context.configure({ device: gpu.device, format, alphaMode });
  };

  resize();

  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => resize());
    observer.observe(canvas);
  }

  const handle: GpuSurface = {
    canvas,
    format,
    get width(): number {
      return width;
    },
    get height(): number {
      return height;
    },
    view(): GPUTextureView | null {
      if (!alive || !live(gpu)) return null;
      try {
        return context.getCurrentTexture().createView();
      } catch (err) {
        handleError(err, 'V.gpu.surface');
        return null;
      }
    },
    resize,
    destroy(): void {
      if (!alive) return;
      alive = false;
      observer?.disconnect();
      observer = null;
      try {
        context.unconfigure();
      } catch {
        // Context already released by the browser. Nothing to do.
      }
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Off-screen target
// ---------------------------------------------------------------------------

/** Options for `target()`. */
export interface GpuTargetOptions {
  width: number;
  height: number;
  format?: GPUTextureFormat;
  label?: string;
}

/** Texture used as a render pass target, to chain effects. */
export interface GpuTarget {
  readonly texture: GPUTexture | null;
  readonly width: number;
  readonly height: number;
  readonly format: GPUTextureFormat;
  view(): GPUTextureView | null;
  destroy(): void;
}

const NO_TARGET: GpuTarget = {
  texture: null,
  width: 0,
  height: 0,
  format: '',
  view: () => null,
  destroy: () => undefined,
};

/** Creates a target texture for off-screen rendering. */
export function target(gpu: GpuContext | null, options: GpuTargetOptions): GpuTarget {
  if (!live(gpu)) return NO_TARGET;

  const format = options.format ?? gpu.format;
  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height));

  let texture: GPUTexture | null = null;
  let view: GPUTextureView | null = null;

  try {
    texture = gpu.device.createTexture({
      label: options.label ?? 'voodoo-target',
      size: { width, height },
      format,
      usage: TEXTURE_USAGE.RENDER_ATTACHMENT | TEXTURE_USAGE.TEXTURE_BINDING | TEXTURE_USAGE.COPY_SRC,
    });
    view = texture.createView();
  } catch (err) {
    handleError(err, 'V.gpu.target');
    return NO_TARGET;
  }

  const handle: GpuTarget = {
    texture,
    width,
    height,
    format,
    view: () => view,
    destroy(): void {
      if (!texture) return;
      texture.destroy();
      texture = null;
      view = null;
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Uniforms
// ---------------------------------------------------------------------------

/** Uniform buffer with known layout. */
export interface GpuUniforms {
  /** Layout in use, whether from reflection or initial values. */
  readonly struct: WgslStruct;
  readonly buffer: GPUBuffer | null;
  /** Last applied values. */
  readonly values: Record<string, unknown>;
  /** Updates the given fields and sends the buffer. */
  set(values: Record<string, unknown>): void;
  destroy(): void;
}

const EMPTY_STRUCT: WgslStruct = { name: 'Uniforms', fields: [], size: 0, align: 16 };

function noUniforms(struct: WgslStruct = EMPTY_STRUCT): GpuUniforms {
  return {
    struct,
    buffer: null,
    values: {},
    set: () => undefined,
    destroy: () => undefined,
  };
}

/** Cria o buffer a partir de um struct ja conhecido. */
function uniformsFromStruct(
  gpu: GpuContext | null,
  struct: WgslStruct,
  initial: Record<string, unknown> = {},
  label = 'voodoo-uniforms'
): GpuUniforms {
  if (!live(gpu) || struct.fields.length === 0) return noUniforms(struct);

  const bytes = packStruct(struct, initial);
  const values: Record<string, unknown> = { ...initial };
  let buffer: GPUBuffer | null = null;

  try {
    buffer = gpu.device.createBuffer({
      label,
      size: bytes.byteLength,
      usage: BUFFER_USAGE.UNIFORM | BUFFER_USAGE.COPY_DST,
    });
    gpu.queue.writeBuffer(buffer, 0, bytes);
  } catch (err) {
    handleError(err, 'V.gpu.uniforms');
    return noUniforms(struct);
  }

  const handle: GpuUniforms = {
    struct,
    get buffer(): GPUBuffer | null {
      return buffer;
    },
    values,
    set(next: Record<string, unknown>): void {
      if (!buffer || !live(gpu) || !next) return;
      // The local buffer is the source of truth: missing fields remain as they were,
      // so changing one uniform doesn't erase the others.
      const written = writeStruct(bytes, struct, next);
      if (written.length === 0) return;
      for (const name of written) values[name] = next[name];
      gpu.queue.writeBuffer(buffer, 0, bytes);
    },
    destroy(): void {
      if (!buffer) return;
      buffer.destroy();
      buffer = null;
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
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
export function uniforms(
  gpu: GpuContext | null,
  initial: Record<string, unknown> = {}
): GpuUniforms {
  return uniformsFromStruct(gpu, inferStruct(initial), initial);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

/** Time in the frame loop, in seconds. */
export interface GpuClock {
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
export function clock(_gpu?: GpuContext | null): GpuClock {
  let start = -1;
  let previous = -1;
  let time = 0;
  let delta = 0;
  let frame = 0;

  return {
    get time(): number {
      return time;
    },
    get delta(): number {
      return delta;
    },
    get frame(): number {
      return frame;
    },
    tick(now?: number): void {
      const stamp = now ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (start < 0) {
        start = stamp;
        previous = stamp;
      }
      time = (stamp - start) / 1000;
      // A limit on delta prevents returning to the tab after a minute from making
      // the simulation jump an absurd amount.
      delta = Math.min(0.25, Math.max(0, (stamp - previous) / 1000));
      previous = stamp;
      frame += 1;
    },
    reset(): void {
      start = -1;
      previous = -1;
      time = 0;
      delta = 0;
      frame = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Bind group montado pela reflexao
// ---------------------------------------------------------------------------

/**
 * Built-in vertex for `effect`: a triangle covering the whole screen.
 *
 * A large triangle is cheaper than two triangles forming a square,
 * because the GPU doesn't process the diagonal's pixels twice. The `uv` already comes
 * with Y axis pointing down, which is how everyone expects to read an image.
 */
const FULLSCREEN_VERTEX = `
struct VoodooFullscreenOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn voodooFullscreen(@builtin(vertex_index) indice: u32) -> VoodooFullscreenOut {
  var cantos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  let p = cantos[indice];
  var saida: VoodooFullscreenOut;
  saida.position = vec4<f32>(p, 0.0, 1.0);
  saida.uv = vec2<f32>((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5);
  return saida;
}
`;

/** Builds bind group layout entries from reflection. */
function layoutEntries(bindings: WgslBinding[], visibility: number): unknown[] {
  const entries: unknown[] = [];
  for (const binding of bindings) {
    if (binding.group !== 0) continue;
    const base = { binding: binding.binding, visibility };

    if (binding.kind === 'uniform') {
      entries.push({ ...base, buffer: { type: 'uniform' } });
    } else if (binding.kind === 'storage') {
      entries.push({
        ...base,
        buffer: { type: binding.access === 'read' ? 'read-only-storage' : 'storage' },
      });
    } else if (binding.kind === 'sampler') {
      entries.push({ ...base, sampler: { type: binding.comparison ? 'comparison' : 'filtering' } });
    } else if (binding.kind === 'texture') {
      entries.push({
        ...base,
        texture: {
          sampleType: binding.sampleType ?? 'float',
          viewDimension: binding.viewDimension ?? '2d',
          multisampled: !!binding.multisampled,
        },
      });
    } else if (binding.kind === 'storage-texture') {
      entries.push({
        ...base,
        storageTexture: {
          access: binding.access === 'read-write' ? 'read-write' : 'write-only',
          format: 'rgba8unorm',
          viewDimension: binding.viewDimension ?? '2d',
        },
      });
    }
  }
  return entries;
}

interface Bound {
  layout: GPUBindGroupLayout | null;
  group: GPUBindGroup | null;
  uniforms: GpuUniforms;
  sampler: GPUSampler | null;
  /** `true` when the layout came from reflection, `false` when it fell back to `auto`. */
  fromReflection: boolean;
}

/**
 * Builds the group 0 bind group from reflection.
 *
 * When reflection cannot make sense of the shader, the pipeline falls back to
 * WebGPU's own `auto` layout mode. Losing uniform inference is preferable to
 * refusing a shader the driver would have accepted without complaint.
 */
function bindFromReflection(
  gpu: GpuContext,
  reflection: WgslReflection,
  visibility: number,
  initial: Record<string, unknown>,
  textures: Record<string, GPUTextureView>,
  label: string
): Bound {
  const bindings = reflection.bindings.filter((b) => b.group === 0);
  const uniformBinding = reflection.uniform;
  const uniformValues = uniformBinding?.struct
    ? uniformsFromStruct(gpu, uniformBinding.struct, initial, `${label}-uniforms`)
    : noUniforms();

  if (bindings.length === 0) {
    return { layout: null, group: null, uniforms: uniformValues, sampler: null, fromReflection: false };
  }

  let layout: GPUBindGroupLayout | null = null;
  try {
    layout = gpu.device.createBindGroupLayout({
      label: `${label}-layout`,
      entries: layoutEntries(bindings, visibility),
    });
  } catch (err) {
    warn(`shader reflection for "${label}" failed to build bind group layout: ${String(err)}`);
    return { layout: null, group: null, uniforms: uniformValues, sampler: null, fromReflection: false };
  }

  let sampler: GPUSampler | null = null;
  const resources: unknown[] = [];

  for (const binding of bindings) {
    if (binding.kind === 'uniform' && uniformValues.buffer) {
      resources.push({ binding: binding.binding, resource: { buffer: uniformValues.buffer } });
      continue;
    }
    if (binding.kind === 'sampler') {
      sampler ??= gpu.device.createSampler({
        label: `${label}-sampler`,
        magFilter: 'linear',
        minFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
      });
      resources.push({ binding: binding.binding, resource: sampler });
      continue;
    }
    const view = textures[binding.name];
    if (view) {
      resources.push({ binding: binding.binding, resource: view });
      continue;
    }
    // No resource for this binding: without it the bind group cannot be created.
    return { layout, group: null, uniforms: uniformValues, sampler, fromReflection: false };
  }

  try {
    const group = gpu.device.createBindGroup({
      label: `${label}-group`,
      layout,
      entries: resources,
    });
    return { layout, group, uniforms: uniformValues, sampler, fromReflection: true };
  } catch (err) {
    warn(`shader reflection for "${label}" failed to build bind group: ${String(err)}`);
    return { layout, group: null, uniforms: uniformValues, sampler, fromReflection: false };
  }
}

/**
 * Fetches the compiler log and reports errors with the WGSL line.
 *
 * Runs after pipeline creation because a shader with errors still creates a module: it's
 * `getCompilationInfo` that tells the full story.
 */
function reportCompilation(module: GPUShaderModule, label: string, source: string): void {
  if (typeof module.getCompilationInfo !== 'function') return;
  const lines = source.split('\n');

  module
    .getCompilationInfo()
    .then((info) => {
      const errors = info.messages.filter((m) => m.type === 'error');
      if (errors.length === 0) return;
      const detail = errors
        .map((m) => `  line ${m.lineNum}: ${m.message}\n  > ${(lines[m.lineNum - 1] ?? '').trim()}`)
        .join('\n');
      handleError(new Error(`shader "${label}" did not compile:\n${detail}`), 'V.gpu shader');
    })
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Full-screen effect
// ---------------------------------------------------------------------------

/** Options for `effect()`. */
export interface GpuEffectOptions {
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
export interface GpuEffect {
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

function noEffect(reflection: WgslReflection): GpuEffect {
  return {
    reflection,
    ok: false,
    uniforms: noUniforms(),
    set: () => undefined,
    draw: () => undefined,
    destroy: () => undefined,
  };
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
export function effect(
  gpu: GpuContext | null,
  wgsl: string,
  options: GpuEffectOptions = {}
): GpuEffect {
  const reflection = reflectWgsl(wgsl);
  if (!live(gpu) || !wgsl) return noEffect(reflection);

  const label = options.label ?? 'voodoo-effect';
  const hasVertex = !!findEntry(reflection, 'vertex');
  const source = hasVertex ? wgsl : `${FULLSCREEN_VERTEX}\n${wgsl}`;
  const vertexEntry = hasVertex ? findEntry(reflection, 'vertex')!.name : 'voodooFullscreen';
  const fragmentEntry = options.entry ?? findEntry(reflection, 'fragment')?.name;

  if (!fragmentEntry) {
    warn(`shader "${label}" does not declare a @fragment function.`);
    return noEffect(reflection);
  }

  let module: GPUShaderModule;
  try {
    module = gpu.device.createShaderModule({ label, code: source });
  } catch (err) {
    handleError(err, 'V.gpu.effect');
    return noEffect(reflection);
  }
  reportCompilation(module, label, source);

  const bound = bindFromReflection(
    gpu,
    reflection,
    SHADER_STAGE.VERTEX | SHADER_STAGE.FRAGMENT,
    options.set ?? {},
    options.textures ?? {},
    label
  );

  const descriptor = {
    label,
    layout: 'auto' as unknown,
    vertex: { module, entryPoint: vertexEntry },
    fragment: {
      module,
      entryPoint: fragmentEntry,
      targets: [{ format: options.format ?? gpu.format }],
    },
    primitive: { topology: 'triangle-list' },
  };

  let pipeline: GPURenderPipeline | null = null;
  try {
    if (bound.fromReflection && bound.layout) {
      descriptor.layout = gpu.device.createPipelineLayout({
        label: `${label}-pipeline-layout`,
        bindGroupLayouts: [bound.layout],
      });
    }
    pipeline = gpu.device.createRenderPipeline(descriptor);
  } catch (err) {
    // Explicit layout rejected: WebGPU's `auto` mode may still work.
    try {
      descriptor.layout = 'auto';
      pipeline = gpu.device.createRenderPipeline(descriptor);
    } catch {
      handleError(err, 'V.gpu.effect');
      bound.uniforms.destroy();
      return noEffect(reflection);
    }
  }

  let alive = true;

  const handle: GpuEffect = {
    reflection,
    ok: true,
    uniforms: bound.uniforms,
    set(values: Record<string, unknown>): void {
      bound.uniforms.set(values);
    },
    draw(pass: GPURenderPassEncoder): void {
      if (!alive || !pipeline) return;
      pass.setPipeline(pipeline);
      if (bound.group) pass.setBindGroup(0, bound.group);
      pass.draw(3);
    },
    destroy(): void {
      if (!alive) return;
      alive = false;
      pipeline = null;
      bound.uniforms.destroy();
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/** Options for `compute()`. */
export interface GpuComputeOptions {
  set?: Record<string, unknown>;
  entry?: string;
  /** How many workgroups to dispatch. Default `[1, 1, 1]`. */
  workgroups?: [number, number?, number?];
  textures?: Record<string, GPUTextureView>;
  label?: string;
}

/** A compute shader ready to dispatch. */
export interface GpuCompute {
  readonly reflection: WgslReflection;
  readonly ok: boolean;
  readonly uniforms: GpuUniforms;
  set(values: Record<string, unknown>): void;
  /** Records the dispatch. Called by `frame.compute`. */
  dispatch(pass: GPUComputePassEncoder, workgroups?: [number, number?, number?]): void;
  destroy(): void;
}

function noCompute(reflection: WgslReflection): GpuCompute {
  return {
    reflection,
    ok: false,
    uniforms: noUniforms(),
    set: () => undefined,
    dispatch: () => undefined,
    destroy: () => undefined,
  };
}

/** Compiles a compute shader. */
export function compute(
  gpu: GpuContext | null,
  wgsl: string,
  options: GpuComputeOptions = {}
): GpuCompute {
  const reflection = reflectWgsl(wgsl);
  if (!live(gpu) || !wgsl) return noCompute(reflection);

  const label = options.label ?? 'voodoo-compute';
  const entry = options.entry ?? findEntry(reflection, 'compute')?.name;
  if (!entry) {
    warn(`shader "${label}" does not declare a @compute function.`);
    return noCompute(reflection);
  }

  let module: GPUShaderModule;
  try {
    module = gpu.device.createShaderModule({ label, code: wgsl });
  } catch (err) {
    handleError(err, 'V.gpu.compute');
    return noCompute(reflection);
  }
  reportCompilation(module, label, wgsl);

  const bound = bindFromReflection(
    gpu,
    reflection,
    SHADER_STAGE.COMPUTE,
    options.set ?? {},
    options.textures ?? {},
    label
  );

  const descriptor = {
    label,
    layout: 'auto' as unknown,
    compute: { module, entryPoint: entry },
  };

  let pipeline: GPUComputePipeline | null = null;
  try {
    if (bound.fromReflection && bound.layout) {
      descriptor.layout = gpu.device.createPipelineLayout({
        label: `${label}-pipeline-layout`,
        bindGroupLayouts: [bound.layout],
      });
    }
    pipeline = gpu.device.createComputePipeline(descriptor);
  } catch (err) {
    try {
      descriptor.layout = 'auto';
      pipeline = gpu.device.createComputePipeline(descriptor);
    } catch {
      handleError(err, 'V.gpu.compute');
      bound.uniforms.destroy();
      return noCompute(reflection);
    }
  }

  const default_ = options.workgroups ?? [1, 1, 1];
  let alive = true;

  const handle: GpuCompute = {
    reflection,
    ok: true,
    uniforms: bound.uniforms,
    set(values: Record<string, unknown>): void {
      bound.uniforms.set(values);
    },
    dispatch(pass: GPUComputePassEncoder, workgroups?: [number, number?, number?]): void {
      if (!alive || !pipeline) return;
      const [x, y, z] = workgroups ?? default_;
      pass.setPipeline(pipeline);
      if (bound.group) pass.setBindGroup(0, bound.group);
      pass.dispatchWorkgroups(Math.max(1, x), y ?? 1, z ?? 1);
    },
    destroy(): void {
      if (!alive) return;
      alive = false;
      pipeline = null;
      bound.uniforms.destroy();
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/** Target accepted by `frame.pass`. */
export type GpuPassTarget = GpuSurface | GpuTarget | null;

/** Clear color, like `[r, g, b, a]` from 0 to 1. */
export type GpuClearColor = [number, number, number, number];

/** The frame being built, delivered to the callback of `frame` and `frameLoop`. */
export interface GpuFrame {
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

const EMPTY_CLOCK = clock();

function noFrame(): GpuFrame {
  return {
    encoder: null,
    clock: EMPTY_CLOCK,
    clear: [0, 0, 0, 0],
    pass: () => undefined,
    compute: () => undefined,
  };
}

function buildFrame(gpu: GpuContext, encoder: GPUCommandEncoder, relogio: GpuClock): GpuFrame {
  const frameObj: GpuFrame = {
    encoder,
    clock: relogio,
    clear: [0, 0, 0, 0],
    pass(destino: GpuPassTarget, ...operacoes): void {
      const view = destino?.view() ?? null;
      if (!view) return;
      const [r, g, b, a] = frameObj.clear;
      let pass: GPURenderPassEncoder;
      try {
        pass = encoder.beginRenderPass({
          colorAttachments: [{ view, clearValue: { r, g, b, a }, loadOp: 'clear', storeOp: 'store' }],
        });
      } catch (err) {
        handleError(err, 'V.gpu.frame');
        return;
      }
      for (const operacao of operacoes) operacao?.draw(pass);
      pass.end();
    },
    compute(...operacoes): void {
      if (operacoes.length === 0) return;
      let pass: GPUComputePassEncoder;
      try {
        pass = encoder.beginComputePass();
      } catch (err) {
        handleError(err, 'V.gpu.frame');
        return;
      }
      for (const operacao of operacoes) operacao?.dispatch(pass);
      pass.end();
    },
  };
  void gpu;
  return frameObj;
}

/**
 * Records and submits a frame.
 *
 * ```js
 * V.gpu.frame(gpu, (frame) => frame.pass(tela, ondas))
 * ```
 */
export function frame(
  gpu: GpuContext | null,
  build: (frame: GpuFrame) => void,
  relogio: GpuClock = EMPTY_CLOCK
): void {
  if (!live(gpu)) {
    build(noFrame());
    return;
  }
  try {
    const encoder = gpu.device.createCommandEncoder({ label: 'voodoo-frame' });
    build(buildFrame(gpu, encoder, relogio));
    gpu.queue.submit([encoder.finish()]);
  } catch (err) {
    handleError(err, 'V.gpu.frame');
  }
}

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
export function frameLoop(
  gpu: GpuContext | null,
  build: (frame: GpuFrame) => void
): () => void {
  if (!live(gpu) || typeof requestAnimationFrame !== 'function') return () => undefined;

  const relogio = clock(gpu);
  let handle = 0;
  let running = true;

  const step = (now: number): void => {
    handle = 0;
    if (!running || !live(gpu)) return;
    relogio.tick(now);
    frame(gpu, build, relogio);
    if (running) handle = requestAnimationFrame(step);
  };

  handle = requestAnimationFrame(step);

  return (): void => {
    if (!running) return;
    running = false;
    if (handle) cancelAnimationFrame(handle);
    handle = 0;
  };
}

// ---------------------------------------------------------------------------
// End of life
// ---------------------------------------------------------------------------

/**
 * Releases everything the context opened and shuts down the device.
 *
 * Calling twice does no harm, and calling with `null` doesn't either.
 */
export function destroy(gpu: GpuContext | null): void {
  if (!gpu || gpu.destroyed) return;
  gpu.destroyed = true;

  for (const resource of [...gpu.resources]) {
    try {
      resource.destroy();
    } catch (err) {
      handleError(err, 'V.gpu.destroy');
    }
  }
  gpu.resources.clear();

  try {
    gpu.device.destroy();
  } catch {
    // Device already lost. That was the goal.
  }

  // If the shared context died, the next call opens another.
  sharedContext?.then((current) => {
    if (current === gpu) resetShared();
  });
}

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------

/**
 * Everything from the module grouped, to expose as `V.gpu` without clashing with names of
 * other modules, like the `effect` from reactivity.
 */
export const gpu = {
  supported,
  init,
  shared,
  surface,
  target,
  uniforms,
  clock,
  effect,
  compute,
  frame,
  frameLoop,
  destroy,
  /** WGSL reading, useful on its own for inspecting a shader. */
  reflect: reflectWgsl,
};
