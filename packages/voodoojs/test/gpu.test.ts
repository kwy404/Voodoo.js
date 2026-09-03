/**
 * GPU layer.
 *
 * The test environment is jsdom, which has no WebGPU at all. That is not a
 * problem: the two parts that break most in practice are WGSL reflection,
 * which is pure text, and the fallback path, which happens precisely when
 * there is no GPU. Both of them really run here.
 *
 * The path with a real GPU is declared and is skipped with a reason when the
 * environment has no adapter. Never faked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive, nextTick } from '../src/reactivity';
import { Scope } from '../src/runtime/scope';
import { walk, destroy } from '../src/runtime/walker';
import { config } from '../src/runtime/registry';
import {
  gpu,
  supported,
  init,
  surface,
  target,
  uniforms,
  clock,
  effect as gpuEffect,
  compute as gpuCompute,
  frame as gpuFrame,
  frameLoop,
  destroy as gpuDestroy,
  reflectWgsl,
  stripWgslComments,
  describeWgslType,
  splitTopLevel,
  inferStruct,
  packStruct,
  writeStruct,
  flattenValue,
  findEntry,
} from '../src/gpu';
import { classifyShaderSource, resolveShaderSource } from '../src/directives/gpu';

function montar(html: string, dados: Record<string, unknown> = {}) {
  const estado = reactive(dados);
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  walk(root, new Scope(estado));
  return { root, estado };
}

async function assentar(n = 3): Promise<void> {
  for (let i = 0; i < n; i++) await nextTick();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Absence of WebGPU
// ---------------------------------------------------------------------------

describe('environment without WebGPU', () => {
  it('supported() returns false without throwing', () => {
    expect(() => supported()).not.toThrow();
    expect(supported()).toBe(false);
  });

  it('init() returns null without throwing', async () => {
    await expect(init()).resolves.toBeNull();
    await expect(init({ powerPreference: 'low-power' })).resolves.toBeNull();
  });

  it('the whole API accepts null and turns into a no-op', () => {
    const canvas = document.createElement('canvas');

    const tela = surface(null, canvas);
    expect(tela.view()).toBeNull();
    expect(tela.width).toBe(0);

    const alvo = target(null, { width: 64, height: 64 });
    expect(alvo.texture).toBeNull();

    const u = uniforms(null, { time: 0 });
    expect(u.buffer).toBeNull();

    const efeito = gpuEffect(null, '@fragment fn f() {}');
    expect(efeito.ok).toBe(false);

    const calculo = gpuCompute(null, '@compute @workgroup_size(1) fn c() {}');
    expect(calculo.ok).toBe(false);

    expect(() => {
      tela.resize();
      u.set({ time: 1 });
      efeito.set({ time: 1 });
      calculo.set({ time: 1 });
      efeito.destroy();
      calculo.destroy();
      alvo.destroy();
      u.destroy();
      tela.destroy();
      gpuDestroy(null);
    }).not.toThrow();
  });

  it('frame still calls the callback, with a frame that does nothing', () => {
    let chamou = false;
    gpuFrame(null, (quadro) => {
      chamou = true;
      expect(quadro.encoder).toBeNull();
      quadro.pass(null);
      quadro.compute();
    });
    expect(chamou).toBe(true);
  });

  it('frameLoop schedules no rAF at all and returns a safe stop', () => {
    const espiao = vi.spyOn(globalThis, 'requestAnimationFrame');
    const parar = frameLoop(null, () => undefined);
    expect(espiao).not.toHaveBeenCalled();
    expect(() => parar()).not.toThrow();
  });

  it('the clock works without a GPU', () => {
    const relogio = clock();
    expect(relogio.frame).toBe(0);
    relogio.tick(1000);
    relogio.tick(1200);
    expect(relogio.frame).toBe(2);
    expect(relogio.time).toBeCloseTo(0.2, 5);
    expect(relogio.delta).toBeCloseTo(0.2, 5);
    relogio.reset();
    expect(relogio.frame).toBe(0);
  });

  it('the clock caps large delta jumps', () => {
    const relogio = clock();
    relogio.tick(0);
    relogio.tick(60_000);
    expect(relogio.delta).toBeLessThanOrEqual(0.25);
  });

  it('the V.gpu namespace exposes the combined API', () => {
    for (const nome of [
      'supported',
      'init',
      'surface',
      'target',
      'uniforms',
      'clock',
      'effect',
      'compute',
      'frame',
      'frameLoop',
      'destroy',
      'reflect',
    ]) {
      expect(typeof (gpu as Record<string, unknown>)[nome], nome).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// WGSL reflection
// ---------------------------------------------------------------------------

describe('WGSL reflection: cleaning up the source', () => {
  it('removes line and block comments without touching the line count', () => {
    const fonte = ['// primeiro', 'let a = 1; // fim', '/* bloco', '   ainda */', 'let b = 2;'].join(
      '\n'
    );
    const limpo = stripWgslComments(fonte);
    expect(limpo).not.toContain('primeiro');
    expect(limpo).not.toContain('bloco');
    expect(limpo).toContain('let a = 1;');
    expect(limpo).toContain('let b = 2;');
    expect(limpo.split('\n')).toHaveLength(fonte.split('\n').length);
  });

  it('understands a nested block comment, which WGSL allows', () => {
    const limpo = stripWgslComments('a /* um /* dois */ ainda */ b');
    expect(limpo).toContain('a');
    expect(limpo).toContain('b');
    expect(limpo).not.toContain('dois');
  });

  it('is not fooled by a binding written inside a comment', () => {
    const info = reflectWgsl(`
      // @group(0) @binding(9) var<uniform> falso: Uniforms;
      struct Uniforms { time: f32 };
      @group(0) @binding(0) var<uniform> u: Uniforms;
    `);
    expect(info.bindings).toHaveLength(1);
    expect(info.bindings[0].binding).toBe(0);
  });
});

describe('WGSL reflection: types and layout', () => {
  it('splits nested generics without cutting through the middle', () => {
    expect(splitTopLevel('vec4<f32>, 8')).toEqual(['vec4<f32>', '8']);
    expect(splitTopLevel('storage, read_write')).toEqual(['storage', 'read_write']);
  });

  it('scalars have a size and an alignment of 4 bytes', () => {
    expect(describeWgslType('f32')).toMatchObject({ size: 4, align: 4, components: 1 });
    expect(describeWgslType('u32')).toMatchObject({ size: 4, align: 4, scalar: 'u32' });
  });

  it('vec3 takes 12 bytes but aligns to 16, which is the classic trap', () => {
    expect(describeWgslType('vec2<f32>')).toMatchObject({ size: 8, align: 8 });
    expect(describeWgslType('vec3<f32>')).toMatchObject({ size: 12, align: 16, components: 3 });
    expect(describeWgslType('vec4<f32>')).toMatchObject({ size: 16, align: 16 });
  });

  it('accepts the short aliases vec3f and mat4x4f', () => {
    expect(describeWgslType('vec3f')).toMatchObject({ size: 12, align: 16 });
    expect(describeWgslType('vec2u')).toMatchObject({ size: 8, align: 8, scalar: 'u32' });
    expect(describeWgslType('mat4x4f')).toMatchObject({ size: 64, align: 16 });
  });

  it('matrices have a per-column stride', () => {
    expect(describeWgslType('mat4x4<f32>')).toMatchObject({ size: 64, align: 16, stride: 16 });
    // mat3x3 has vec3 columns, and each of those takes 16 bytes because of the alignment.
    expect(describeWgslType('mat3x3<f32>')).toMatchObject({ size: 48, align: 16, stride: 16 });
    expect(describeWgslType('mat2x2<f32>')).toMatchObject({ size: 16, align: 8, stride: 8 });
  });

  it('arrays in uniform have a stride that is a multiple of 16', () => {
    expect(describeWgslType('array<f32, 4>')).toMatchObject({ stride: 16, size: 64, count: 4 });
    expect(describeWgslType('array<vec4<f32>, 3>')).toMatchObject({ stride: 16, size: 48 });
  });

  it('an unknown type does not throw, it just returns kind unknown', () => {
    expect(describeWgslType('BichoEstranho')).toMatchObject({ kind: 'unknown' });
    expect(describeWgslType('')).toMatchObject({ kind: 'unknown' });
  });
});

describe('WGSL reflection: structs', () => {
  const fonte = `
    struct Uniforms {
      time: f32,
      speed: f32,
      resolution: vec2<f32>,
      tint: vec3<f32>,
      frame: u32,
    };
  `;

  it('computes the offset of each field with the right padding', () => {
    const struct = reflectWgsl(fonte).structs.Uniforms;
    expect(struct.fields.map((f) => [f.name, f.offset])).toEqual([
      ['time', 0],
      ['speed', 4],
      ['resolution', 8],
      ['tint', 16],
      ['frame', 28],
    ]);
    expect(struct.size).toBe(32);
    expect(struct.align).toBe(16);
  });

  it('accepts a semicolon as a member separator', () => {
    const struct = reflectWgsl('struct U { a: f32; b: vec2<f32>; }').structs.U;
    expect(struct.fields.map((f) => f.name)).toEqual(['a', 'b']);
    expect(struct.fields[1].offset).toBe(8);
  });

  it('ignores attributes before the member name', () => {
    const struct = reflectWgsl(
      'struct Saida { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }'
    ).structs.Saida;
    expect(struct.fields.map((f) => f.name)).toEqual(['pos', 'uv']);
  });

  it('matrices and arrays go into the size calculation', () => {
    const struct = reflectWgsl(
      'struct M { model: mat4x4<f32>, normal: mat3x3<f32>, escala: f32 }'
    ).structs.M;
    expect(struct.fields.map((f) => f.offset)).toEqual([0, 64, 112]);
    expect(struct.size).toBe(128);

    const arr = reflectWgsl('struct A { pesos: array<f32, 4>, cor: vec4<f32> }').structs.A;
    expect(arr.fields.map((f) => f.offset)).toEqual([0, 64]);
    expect(arr.size).toBe(80);
  });

  it('a struct that cites another struct resolves on the following passes', () => {
    const info = reflectWgsl(`
      struct Externo { luz: Interno, extra: f32 };
      struct Interno { cor: vec3<f32>, forca: f32 };
    `);
    expect(info.structs.Interno.size).toBe(16);
    expect(info.structs.Externo.fields.map((f) => f.name)).toEqual(['luz', 'extra']);
    expect(info.structs.Externo.fields[1].offset).toBe(16);
  });
});

describe('WGSL reflection: bindings', () => {
  const fonte = `
    struct Uniforms { time: f32, tint: vec3<f32> };
    @group(0) @binding(0) var<uniform> u: Uniforms;
    @binding(1) @group(0) var amostra: sampler;
    @group(0) @binding(2) var textura: texture_2d<f32>;
    @group(1) @binding(0) var<storage, read_write> dados: array<vec4<f32>>;
  `;

  it('finds every binding and orders them by group and index', () => {
    const info = reflectWgsl(fonte);
    expect(info.bindings.map((b) => `${b.group}:${b.binding}:${b.kind}`)).toEqual([
      '0:0:uniform',
      '0:1:sampler',
      '0:2:texture',
      '1:0:storage',
    ]);
  });

  it('accepts @binding before @group', () => {
    const info = reflectWgsl(fonte);
    const amostra = info.bindings.find((b) => b.name === 'amostra');
    expect(amostra).toMatchObject({ group: 0, binding: 1, kind: 'sampler' });
  });

  it('links the uniform binding to the struct declared in the source', () => {
    const info = reflectWgsl(fonte);
    expect(info.uniform?.name).toBe('u');
    expect(info.uniform?.struct?.fields.map((f) => f.name)).toEqual(['time', 'tint']);
    expect(info.uniform?.struct?.size).toBe(32);
  });

  it('describes the texture with its dimension and sample type', () => {
    const info = reflectWgsl(fonte);
    const textura = info.bindings.find((b) => b.name === 'textura');
    expect(textura).toMatchObject({ viewDimension: '2d', sampleType: 'float', multisampled: false });
  });

  it('reads the access declared on the storage', () => {
    const info = reflectWgsl(fonte);
    expect(info.bindings.find((b) => b.name === 'dados')?.access).toBe('read-write');
    const so = reflectWgsl('@group(0) @binding(0) var<storage, read> x: array<f32>;');
    expect(so.bindings[0].access).toBe('read');
  });

  it('recognises a depth texture and a comparison sampler', () => {
    const info = reflectWgsl(`
      @group(0) @binding(0) var sombra: texture_depth_2d;
      @group(0) @binding(1) var comparador: sampler_comparison;
    `);
    expect(info.bindings[0]).toMatchObject({ kind: 'texture', sampleType: 'depth' });
    expect(info.bindings[1]).toMatchObject({ kind: 'sampler', comparison: true });
  });
});

describe('WGSL reflection: entry points', () => {
  it('finds vertex, fragment and compute', () => {
    const info = reflectWgsl(`
      @vertex fn vs() -> @builtin(position) vec4<f32> { return vec4<f32>(0.0); }
      @fragment fn pintar() -> @location(0) vec4<f32> { return vec4<f32>(1.0); }
      @compute @workgroup_size(8, 4) fn passo() {}
    `);
    expect(info.entries.map((e) => `${e.stage}:${e.name}`)).toEqual([
      'vertex:vs',
      'fragment:pintar',
      'compute:passo',
    ]);
    expect(findEntry(info, 'compute')?.workgroupSize).toEqual([8, 4, 1]);
  });

  it('reads a workgroup_size written before the @compute', () => {
    const info = reflectWgsl('@workgroup_size(16) @compute fn c() {}');
    expect(findEntry(info, 'compute')?.workgroupSize).toEqual([16, 1, 1]);
  });

  it('an empty or invalid source returns an empty reflection, without throwing', () => {
    expect(reflectWgsl('')).toEqual({ structs: {}, bindings: [], entries: [] });
    expect(() => reflectWgsl('}{ isto nao e wgsl @@@')).not.toThrow();
    expect(reflectWgsl(undefined as unknown as string).bindings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Writing the uniforms
// ---------------------------------------------------------------------------

describe('writing the uniforms into the buffer', () => {
  const struct = reflectWgsl(
    'struct U { time: f32, speed: f32, resolution: vec2<f32>, tint: vec3<f32>, frame: u32 }'
  ).structs.U;

  it('writes each field at the computed offset', () => {
    const buffer = packStruct(struct, {
      time: 1.5,
      speed: 2,
      resolution: [800, 600],
      tint: [1, 0, 0.5],
      frame: 7,
    });
    const view = new DataView(buffer);
    expect(view.getFloat32(0, true)).toBe(1.5);
    expect(view.getFloat32(4, true)).toBe(2);
    expect(view.getFloat32(8, true)).toBe(800);
    expect(view.getFloat32(12, true)).toBe(600);
    expect(view.getFloat32(16, true)).toBe(1);
    expect(view.getFloat32(24, true)).toBe(0.5);
    expect(view.getUint32(28, true)).toBe(7);
    expect(buffer.byteLength).toBe(32);
  });

  it('accepts a hexadecimal colour as a vector', () => {
    const buffer = packStruct(struct, { tint: '#ff0080' });
    const view = new DataView(buffer);
    expect(view.getFloat32(16, true)).toBeCloseTo(1, 5);
    expect(view.getFloat32(20, true)).toBeCloseTo(0, 5);
    expect(view.getFloat32(24, true)).toBeCloseTo(128 / 255, 5);
  });

  it('a single loose number fills the whole vector', () => {
    expect(flattenValue(2, 3)).toEqual([2, 2, 2]);
    expect(flattenValue({ x: 1, y: 2 }, 2)).toEqual([1, 2]);
    expect(flattenValue('#f00', 3)).toEqual([1, 0, 0]);
    expect(flattenValue(null, 3)).toEqual([]);
  });

  it('missing fields stay as they were', () => {
    const buffer = packStruct(struct, { time: 9, speed: 3 });
    const escritos = writeStruct(buffer, struct, { time: 1 });
    expect(escritos).toEqual(['time']);
    const view = new DataView(buffer);
    expect(view.getFloat32(0, true)).toBe(1);
    expect(view.getFloat32(4, true)).toBe(3);
  });

  it('a matrix writes column by column, respecting the padding', () => {
    const m = reflectWgsl('struct M { normal: mat3x3<f32> }').structs.M;
    const buffer = packStruct(m, { normal: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    const view = new DataView(buffer);
    expect(view.getFloat32(0, true)).toBe(1);
    expect(view.getFloat32(8, true)).toBe(3);
    // The fourth float of each column is padding: the second column starts at 16.
    expect(view.getFloat32(12, true)).toBe(0);
    expect(view.getFloat32(16, true)).toBe(4);
    expect(view.getFloat32(32, true)).toBe(7);
  });

  it('infers a layout from JavaScript values', () => {
    const inferido = inferStruct({ time: 0, resolution: [0, 0], tint: '#fff', ignorado: {} });
    expect(inferido.fields.map((f) => [f.name, f.type.text, f.offset])).toEqual([
      ['time', 'f32', 0],
      ['resolution', 'vec2<f32>', 8],
      ['tint', 'vec4<f32>', 16],
    ]);
    expect(inferido.size).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Shader source
// ---------------------------------------------------------------------------

describe('shader source', () => {
  it('classifies inline, selector, url and empty', () => {
    expect(classifyShaderSource('')).toBe('empty');
    expect(classifyShaderSource('   ')).toBe('empty');
    expect(classifyShaderSource('#meu-shader')).toBe('selector');
    expect(classifyShaderSource('ondas.wgsl')).toBe('url');
    expect(classifyShaderSource('/shaders/ondas.wgsl')).toBe('url');
    expect(classifyShaderSource('https://cdn.exemplo.com/a.wgsl')).toBe('url');
    expect(classifyShaderSource('@fragment fn f() -> @location(0) vec4<f32> {}')).toBe('inline');
    expect(classifyShaderSource('fn ruido(p: vec2<f32>) -> f32 { return 0.0; }')).toBe('inline');
  });

  it('returns the text itself when the WGSL is in the attribute', async () => {
    const fonte = '@fragment fn f() -> @location(0) vec4<f32> { return vec4<f32>(1.0); }';
    await expect(resolveShaderSource(fonte)).resolves.toBe(fonte);
  });

  it('reads the content of a <script> through the selector', async () => {
    const script = document.createElement('script');
    script.type = 'x-shader/wgsl';
    script.id = 'shader-de-teste';
    script.textContent = '@fragment fn f() {}';
    document.body.appendChild(script);

    await expect(resolveShaderSource('#shader-de-teste')).resolves.toBe('@fragment fn f() {}');
  });

  it('a selector that does not exist returns empty without throwing', async () => {
    await expect(resolveShaderSource('#nao-existe')).resolves.toBe('');
    await expect(resolveShaderSource('#((invalido')).resolves.toBe('');
  });

  it('fetches the URL with the Voodoo HTTP client', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('@fragment fn f() {}', { headers: { 'content-type': 'text/plain' } })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveShaderSource('/shaders/ondas.wgsl')).resolves.toBe('@fragment fn f() {}');
    expect(fetchMock).toHaveBeenCalledWith('/shaders/ondas.wgsl', expect.objectContaining({ method: 'GET' }));
  });

  it('a network failure becomes an empty string, not an exception', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    await expect(resolveShaderSource('/shaders/ausente.wgsl')).resolves.toBe('');
    // The problem is reported, but it never rises as an exception to the page.
    expect(erro).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The v-shader directive without WebGPU
// ---------------------------------------------------------------------------

describe('v-shader without WebGPU', () => {
  it('marks data-gpu="unsupported" and fires the event', () => {
    const eventos: CustomEvent[] = [];
    const ouvinte = (e: Event): void => {
      eventos.push(e as CustomEvent);
    };
    document.addEventListener('voodoo:gpu-unsupported', ouvinte);

    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>Sem GPU aqui</p></canvas>');
    document.removeEventListener('voodoo:gpu-unsupported', ouvinte);

    const canvas = root.querySelector('canvas')!;
    expect(canvas.getAttribute('data-gpu')).toBe('unsupported');
    expect(eventos).toHaveLength(1);
    expect(eventos[0].detail.el).toBe(canvas);
  });

  it('the content inside the canvas starts showing', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>Sem GPU aqui</p></canvas>');
    const canvas = root.querySelector('canvas')!;
    const fallback = root.querySelector('[data-gpu-fallback]');

    expect(fallback).not.toBeNull();
    expect(fallback!.textContent).toBe('Sem GPU aqui');
    expect(canvas.firstChild).toBeNull();
    expect(canvas.style.display).toBe('none');
  });

  it('the fallback is still Voodoo HTML', async () => {
    const { root, estado } = montar('<canvas v-shader="ondas.wgsl">{{ recado }}</canvas>', {
      recado: 'instale um navegador com WebGPU',
    });
    const fallback = root.querySelector('[data-gpu-fallback]')!;
    expect(fallback.textContent).toBe('instale um navegador com WebGPU');

    (estado as Record<string, string>).recado = 'sem GPU por aqui';
    await assentar();
    expect(fallback.textContent).toBe('sem GPU por aqui');
  });

  it('a canvas with no fallback content stays visible', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"></canvas>');
    const canvas = root.querySelector('canvas')!;
    expect(root.querySelector('[data-gpu-fallback]')).toBeNull();
    expect(canvas.style.display).toBe('');
    expect(canvas.getAttribute('data-gpu')).toBe('unsupported');
  });

  it('schedules no rAF and opens no observer', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    expect(raf).not.toHaveBeenCalled();
  });

  it('does not fetch the shader URL when there is no GPU to run it on', () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    montar('<canvas v-shader="ondas.wgsl"></canvas>');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('warns and gives up when the directive is not on a canvas', () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { root } = montar('<div v-shader="ondas.wgsl"></div>');
    config.devtools = false;

    expect(aviso).toHaveBeenCalled();
    expect(root.querySelector('div')!.hasAttribute('data-gpu')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cleanup contract
// ---------------------------------------------------------------------------

describe('v-shader and the cleanup contract', () => {
  it('destroying the element returns the DOM to its original state', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    const canvas = root.querySelector('canvas')!;

    expect(root.querySelector('[data-gpu-fallback]')).not.toBeNull();

    destroy(root);

    expect(root.querySelector('[data-gpu-fallback]')).toBeNull();
    expect(canvas.hasAttribute('data-gpu')).toBe(false);
    expect(canvas.style.display).toBe('');
    expect(canvas.querySelector('p')?.textContent).toBe('alternativa');
  });

  it('destroying twice does not throw', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    expect(() => {
      destroy(root);
      destroy(root);
    }).not.toThrow();
  });

  it('the revealed content stops reacting to the state after the destruction', async () => {
    const { root, estado } = montar('<canvas v-shader="a.wgsl">{{ recado }}</canvas>', {
      recado: 'antes',
    });
    const canvas = root.querySelector('canvas')!;
    expect(root.querySelector('[data-gpu-fallback]')!.textContent).toBe('antes');

    destroy(root);
    // The cleanup puts the text back inside the canvas, where it came from.
    expect(canvas.textContent).toBe('antes');

    (estado as Record<string, string>).recado = 'depois';
    await assentar();
    expect(canvas.textContent).toBe('antes');
  });

  it('destroying a canvas with no fallback also clears the marker', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"></canvas>');
    const canvas = root.querySelector('canvas')!;
    destroy(root);
    expect(canvas.hasAttribute('data-gpu')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Path with a real GPU
// ---------------------------------------------------------------------------

const temGpu = supported();
const motivo = 'no WebGPU adapter in this environment (jsdom has no navigator.gpu)';

describe.skipIf(!temGpu)(`path with a real GPU ${temGpu ? '' : `- skipped: ${motivo}`}`, () => {
  const fonte = `
    struct Uniforms { time: f32, tint: vec3<f32> };
    @group(0) @binding(0) var<uniform> u: Uniforms;

    @fragment
    fn pintar(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
      return vec4<f32>(u.tint * abs(sin(u.time)) * uv.x, 1.0);
    }
  `;

  it('init opens the device and destroy releases everything', async () => {
    const contexto = await init();
    expect(contexto).not.toBeNull();
    if (!contexto) return;

    const alvo = target(contexto, { width: 32, height: 32 });
    expect(alvo.texture).not.toBeNull();
    expect(contexto.resources.size).toBeGreaterThan(0);

    gpuDestroy(contexto);
    expect(contexto.resources.size).toBe(0);
    expect(contexto.destroyed).toBe(true);
  });

  it('compiles a full-screen effect and draws into a target', async () => {
    const contexto = await init();
    if (!contexto) return;

    const alvo = target(contexto, { width: 64, height: 64 });
    const efeito = gpuEffect(contexto, fonte, {
      set: { time: 0.5, tint: '#ff3d8b' },
      format: alvo.format,
    });

    expect(efeito.ok).toBe(true);
    expect(efeito.uniforms.struct.size).toBe(32);
    expect(() => efeito.set({ time: 1.25 })).not.toThrow();
    expect(() => gpuFrame(contexto, (q) => q.pass(alvo, efeito))).not.toThrow();

    gpuDestroy(contexto);
  });

  it('runs a compute shader', async () => {
    const contexto = await init();
    if (!contexto) return;

    const calculo = gpuCompute(
      contexto,
      `
      struct Args { fator: f32 };
      @group(0) @binding(0) var<uniform> args: Args;
      @compute @workgroup_size(1)
      fn passo() { let x = args.fator; }
      `,
      { set: { fator: 2 }, workgroups: [1, 1, 1] }
    );

    expect(calculo.ok).toBe(true);
    expect(() => gpuFrame(contexto, (q) => q.compute(calculo))).not.toThrow();
    gpuDestroy(contexto);
  });
});
