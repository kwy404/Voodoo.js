/**
 * @module gpu
 *
 * Camada WebGPU da Voodoo, no espirito do vgpu: funcoes soltas que recebem o
 * contexto como primeiro argumento, sem estado global escondido e sem classe
 * nenhuma para instanciar.
 *
 * ```js
 * const gpu = await V.gpu.init()
 * const tela = V.gpu.surface(gpu, canvas, { dpr: [1, 2] })
 * const ondas = V.gpu.effect(gpu, wgsl, { set: { speed: 1.4 } })
 * const parar = V.gpu.frameLoop(gpu, (frame) => frame.pass(tela, ondas))
 * ```
 *
 * A regra que manda em tudo: **nunca lancar quando nao existe WebGPU**.
 * `supported()` devolve `false`, `init()` devolve `null` e todo o resto aceita
 * `null` no lugar do contexto e vira operacao vazia. Uma pagina que usa GPU
 * para enfeite nao pode quebrar num navegador que ainda nao tem GPU.
 *
 * Os bindings do shader nao sao declarados a mao: `gpu/wgsl` le a fonte e monta
 * o bind group layout, o tamanho do buffer e o deslocamento de cada uniform.
 */

import { handleError } from '../reactivity';
import { avisar } from '../runtime/avisos';
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
// Contexto
// ---------------------------------------------------------------------------

/** Qualquer coisa que ocupa memoria na GPU e sabe se soltar. */
interface Disposable {
  destroy(): void;
}

/** Contexto devolvido por `init()`. E o primeiro argumento de tudo. */
export interface GpuContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  queue: GPUDevice['queue'];
  /** Formato preferido do canvas neste dispositivo. */
  format: GPUTextureFormat;
  /** Recursos abertos, para que `destroy(gpu)` nao esqueca nenhum. */
  readonly resources: Set<Disposable>;
  /** Vira `true` depois de `destroy(gpu)`. Toda operacao passa a ser vazia. */
  destroyed: boolean;
}

/** Opcoes de `init()`. */
export interface GpuInitOptions {
  /** Preferencia de adaptador: `low-power` economiza bateria. */
  powerPreference?: 'low-power' | 'high-performance';
  /** Recursos opcionais pedidos ao dispositivo. Os indisponiveis sao ignorados. */
  features?: string[];
  /** Limites minimos desejados. */
  limits?: Record<string, number>;
  label?: string;
}

/**
 * `true` quando o navegador expoe WebGPU. Nunca lanca, nem em Node, nem em
 * jsdom, nem em navegador antigo.
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
 * Abre o adaptador e o dispositivo.
 *
 * ```js
 * const gpu = await V.gpu.init()
 * if (!gpu) mostrarVersaoSemGpu()
 * ```
 *
 * @returns o contexto, ou `null` quando nao ha WebGPU ou o adaptador recusou
 */
export async function init(options: GpuInitOptions = {}): Promise<GpuContext | null> {
  const api = navigatorGpu();
  if (!api) return null;

  try {
    const adapter = await api.requestAdapter(
      options.powerPreference ? { powerPreference: options.powerPreference } : undefined
    );
    if (!adapter) return null;

    // Pedir um recurso que o adaptador nao tem faz `requestDevice` rejeitar,
    // entao a lista e filtrada antes em vez de deixar a promessa quebrar.
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

    // Perder o dispositivo (troca de GPU, aba suspensa) nao pode derrubar a
    // pagina: o contexto so passa a se comportar como se nunca tivesse existido.
    device.lost
      ?.then((info) => {
        gpu.destroyed = true;
        avisar(`o dispositivo WebGPU foi perdido (${info.reason}): ${info.message}`);
      })
      .catch(() => undefined);

    return gpu;
  } catch (err) {
    // Um adaptador que recusa e um caso previsto, nao um erro da aplicacao.
    avisar(`WebGPU disponivel mas o dispositivo nao abriu: ${String(err)}`);
    return null;
  }
}

/** `true` quando o contexto existe e ainda vale. */
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
// Contexto compartilhado
// ---------------------------------------------------------------------------

let sharedContext: Promise<GpuContext | null> | null = null;

/**
 * Contexto unico da pagina, criado na primeira chamada.
 *
 * Um dispositivo por aba basta: e o que a directive `v-shader` usa, para que
 * dez canvas na mesma pagina nao abram dez dispositivos.
 */
export function shared(options?: GpuInitOptions): Promise<GpuContext | null> {
  if (!sharedContext) sharedContext = init(options);
  return sharedContext;
}

/** Esquece o contexto compartilhado. Usado por `destroy()` e pelos testes. */
export function resetShared(): void {
  sharedContext = null;
}

// ---------------------------------------------------------------------------
// Superficie de desenho
// ---------------------------------------------------------------------------

/** Opcoes de `surface()`. */
export interface GpuSurfaceOptions {
  /** Faixa aceita de `devicePixelRatio`, como `[1, 2]`. Padrao `[1, 2]`. */
  dpr?: [number, number];
  /** Formato do canvas. Padrao o preferido do dispositivo. */
  format?: GPUTextureFormat;
  /** Deixa o canvas transparente. Padrao `false`. */
  alpha?: boolean;
}

/** Canvas configurado para receber quadros da GPU. */
export interface GpuSurface {
  readonly canvas: HTMLCanvasElement | null;
  readonly format: GPUTextureFormat;
  readonly width: number;
  readonly height: number;
  /** View do quadro atual. `null` quando nao ha GPU. */
  view(): GPUTextureView | null;
  /** Remede o canvas e reconfigura o contexto. */
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
 * Prepara um `<canvas>` para receber quadros.
 *
 * O tamanho do buffer acompanha o tamanho em CSS multiplicado pelo
 * `devicePixelRatio`, limitado pela faixa de `dpr` e pelo maior tamanho de
 * textura do dispositivo. Um `ResizeObserver` mantem isso em dia sozinho.
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
    // Reconfigurar depois de mexer no tamanho evita um quadro esticado.
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
        // Contexto ja solto pelo navegador. Nada a fazer.
      }
      untrack(gpu, handle);
    },
  };

  track(gpu, handle);
  return handle;
}

// ---------------------------------------------------------------------------
// Alvo fora da tela
// ---------------------------------------------------------------------------

/** Opcoes de `target()`. */
export interface GpuTargetOptions {
  width: number;
  height: number;
  format?: GPUTextureFormat;
  label?: string;
}

/** Textura usada como destino de um passe, para encadear efeitos. */
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

/** Cria uma textura de destino, para renderizar fora da tela. */
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

/** Buffer de uniforms com layout conhecido. */
export interface GpuUniforms {
  /** Layout em uso, venha ele da reflexao ou dos valores iniciais. */
  readonly struct: WgslStruct;
  readonly buffer: GPUBuffer | null;
  /** Ultimos valores aplicados. */
  readonly values: Record<string, unknown>;
  /** Atualiza os campos informados e envia o buffer. */
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
      // O buffer local e a fonte da verdade: campos ausentes ficam como estavam,
      // entao mudar um uniform nao apaga os outros.
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
 * Cria um buffer de uniforms a partir dos valores iniciais.
 *
 * ```js
 * const u = V.gpu.uniforms(gpu, { time: 0, tint: '#ff3d8b' })
 * u.set({ time: 1.5 })
 * ```
 *
 * Sem shader para consultar, o layout vem da ordem das chaves do objeto. Quando
 * existe shader, `V.gpu.effect` prefere a reflexao, que nao depende de ninguem
 * lembrar a ordem certa.
 */
export function uniforms(
  gpu: GpuContext | null,
  initial: Record<string, unknown> = {}
): GpuUniforms {
  return uniformsFromStruct(gpu, inferStruct(initial), initial);
}

// ---------------------------------------------------------------------------
// Relogio
// ---------------------------------------------------------------------------

/** Tempo do laco de quadros, em segundos. */
export interface GpuClock {
  /** Segundos desde o primeiro quadro. */
  readonly time: number;
  /** Segundos desde o quadro anterior. */
  readonly delta: number;
  /** Numero do quadro atual, comecando em zero. */
  readonly frame: number;
  /** Avanca o relogio. O laco de quadros chama sozinho. */
  tick(now?: number): void;
  reset(): void;
}

/**
 * Cria um relogio. O contexto entra por simetria com o resto da API: o relogio
 * funciona igual com ou sem GPU, o que deixa a directive escrever um caminho so.
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
      // Um limite no delta evita que voltar para a aba depois de um minuto
      // faca a simulacao dar um salto absurdo.
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
 * Vertex embutido do `effect`: um triangulo que cobre a tela inteira.
 *
 * Um triangulo grande sai mais barato que dois triangulos formando um quadrado,
 * porque a GPU nao processa duas vezes os pixels da diagonal. A `uv` ja vem com
 * o eixo Y para baixo, que e como todo mundo espera ler uma imagem.
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

/** Monta as entradas de bind group layout a partir da reflexao. */
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
  /** `true` quando o layout veio da reflexao, `false` quando caiu no `auto`. */
  fromReflection: boolean;
}

/**
 * Monta o bind group do grupo 0 a partir da reflexao.
 *
 * Quando a reflexao nao da conta do shader, o pipeline volta para o modo `auto`
 * do proprio WebGPU. E preferivel perder a inferencia dos uniforms a recusar um
 * shader que o driver aceitaria sem reclamar.
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
    avisar(`a reflexao do shader "${label}" nao montou o bind group layout: ${String(err)}`);
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
    // Falta recurso para este binding: sem ele o bind group nao pode ser criado.
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
    avisar(`a reflexao do shader "${label}" nao montou o bind group: ${String(err)}`);
    return { layout, group: null, uniforms: uniformValues, sampler, fromReflection: false };
  }
}

/**
 * Pede o log do compilador e reporta os erros com a linha do WGSL.
 *
 * Roda depois do pipeline porque um shader com erro ainda cria um modulo: e o
 * `getCompilationInfo` que conta a historia inteira.
 */
function reportCompilation(module: GPUShaderModule, label: string, source: string): void {
  if (typeof module.getCompilationInfo !== 'function') return;
  const linhas = source.split('\n');

  module
    .getCompilationInfo()
    .then((info) => {
      const erros = info.messages.filter((m) => m.type === 'error');
      if (erros.length === 0) return;
      const detalhe = erros
        .map((m) => `  linha ${m.lineNum}: ${m.message}\n  > ${(linhas[m.lineNum - 1] ?? '').trim()}`)
        .join('\n');
      handleError(new Error(`shader "${label}" nao compilou:\n${detalhe}`), 'V.gpu shader');
    })
    .catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Efeito de tela cheia
// ---------------------------------------------------------------------------

/** Opcoes de `effect()`. */
export interface GpuEffectOptions {
  /** Valores iniciais dos uniforms. */
  set?: Record<string, unknown>;
  /** Nome do `@fragment`. Padrao o primeiro encontrado na fonte. */
  entry?: string;
  /** Formato do destino. Padrao o formato preferido do canvas. */
  format?: GPUTextureFormat;
  /** Views ligadas aos bindings de textura, por nome da variavel no WGSL. */
  textures?: Record<string, GPUTextureView>;
  label?: string;
}

/** Um shader de tela cheia pronto para desenhar. */
export interface GpuEffect {
  /** O que a reflexao encontrou na fonte. Funciona mesmo sem GPU. */
  readonly reflection: WgslReflection;
  /** `false` quando o pipeline nao subiu. Desenhar vira operacao vazia. */
  readonly ok: boolean;
  readonly uniforms: GpuUniforms;
  /** Atualiza uniforms sem recriar o pipeline. */
  set(values: Record<string, unknown>): void;
  /** Grava os comandos de desenho. Chamado por `frame.pass`. */
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
 * Compila um shader de tela cheia.
 *
 * Quando a fonte nao traz `@vertex`, a Voodoo acrescenta um triangulo que cobre
 * a tela e entrega `@location(0) uv` ao fragmento. Escrever so o `@fragment` e o
 * caso comum, e e o que a directive `v-shader` espera.
 *
 * ```js
 * const efeito = V.gpu.effect(gpu, wgsl, { set: { speed: 1.2 } })
 * efeito.set({ speed: 2 })   // nao recompila nada
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
  const temVertex = !!findEntry(reflection, 'vertex');
  const source = temVertex ? wgsl : `${FULLSCREEN_VERTEX}\n${wgsl}`;
  const vertexEntry = temVertex ? findEntry(reflection, 'vertex')!.name : 'voodooFullscreen';
  const fragmentEntry = options.entry ?? findEntry(reflection, 'fragment')?.name;

  if (!fragmentEntry) {
    avisar(`o shader "${label}" nao declara nenhuma funcao @fragment.`);
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
    // Layout explicito recusado: o modo `auto` do WebGPU ainda pode dar conta.
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
// Computacao
// ---------------------------------------------------------------------------

/** Opcoes de `compute()`. */
export interface GpuComputeOptions {
  set?: Record<string, unknown>;
  entry?: string;
  /** Quantos workgroups despachar. Padrao `[1, 1, 1]`. */
  workgroups?: [number, number?, number?];
  textures?: Record<string, GPUTextureView>;
  label?: string;
}

/** Um shader de computacao pronto para despachar. */
export interface GpuCompute {
  readonly reflection: WgslReflection;
  readonly ok: boolean;
  readonly uniforms: GpuUniforms;
  set(values: Record<string, unknown>): void;
  /** Grava o despacho. Chamado por `frame.compute`. */
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

/** Compila um shader de computacao. */
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
    avisar(`o shader "${label}" nao declara nenhuma funcao @compute.`);
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

  const padrao = options.workgroups ?? [1, 1, 1];
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
      const [x, y, z] = workgroups ?? padrao;
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
// Quadros
// ---------------------------------------------------------------------------

/** Destino aceito por `frame.pass`. */
export type GpuPassTarget = GpuSurface | GpuTarget | null;

/** Cor de limpeza, como `[r, g, b, a]` de 0 a 1. */
export type GpuClearColor = [number, number, number, number];

/** O quadro em construcao, entregue ao callback de `frame` e `frameLoop`. */
export interface GpuFrame {
  readonly encoder: GPUCommandEncoder | null;
  /** Relogio do laco. Fora do laco, marca sempre o quadro zero. */
  readonly clock: GpuClock;
  /** Abre um passe de renderizacao no destino e executa os efeitos em ordem. */
  pass(destino: GpuPassTarget, ...operacoes: Array<GpuEffect | null | undefined>): void;
  /** Abre um passe de computacao e despacha as operacoes em ordem. */
  compute(...operacoes: Array<GpuCompute | null | undefined>): void;
  /** Cor usada ao limpar o destino. Padrao transparente. */
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
 * Grava e envia um quadro.
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
 * Laco de quadros com `requestAnimationFrame`.
 *
 * ```js
 * const parar = V.gpu.frameLoop(gpu, (frame) => {
 *   ondas.set({ time: frame.clock.time })
 *   frame.pass(tela, ondas)
 * })
 * ```
 *
 * @returns funcao que encerra o laco. Sem GPU, o laco nem comeca.
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
// Fim de vida
// ---------------------------------------------------------------------------

/**
 * Solta tudo que o contexto abriu e encerra o dispositivo.
 *
 * Chamar duas vezes nao faz mal, e chamar com `null` tambem nao.
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
    // Dispositivo ja perdido. O objetivo era exatamente este.
  }

  // Se o contexto compartilhado morreu, a proxima chamada abre outro.
  sharedContext?.then((atual) => {
    if (atual === gpu) resetShared();
  });
}

// ---------------------------------------------------------------------------
// Namespace
// ---------------------------------------------------------------------------

/**
 * Tudo do modulo reunido, para expor como `V.gpu` sem colidir com nomes de
 * outros modulos, como o `effect` da reatividade.
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
  /** Leitura de WGSL, util sozinha para inspecionar um shader. */
  reflect: reflectWgsl,
};
