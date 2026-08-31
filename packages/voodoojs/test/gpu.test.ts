/**
 * Camada GPU.
 *
 * O ambiente de teste e jsdom, que nao tem WebGPU nenhum. Isso nao e um
 * problema: as duas partes que mais quebram na pratica sao a reflexao de WGSL,
 * que e texto puro, e o caminho de fallback, que so acontece justamente quando
 * nao ha GPU. As duas rodam aqui de verdade.
 *
 * O caminho com GPU real fica declarado e e pulado com motivo quando o ambiente
 * nao tem adaptador. Nunca fingido.
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
// Ausencia de WebGPU
// ---------------------------------------------------------------------------

describe('ambiente sem WebGPU', () => {
  it('supported() devolve false sem lancar', () => {
    expect(() => supported()).not.toThrow();
    expect(supported()).toBe(false);
  });

  it('init() devolve null sem lancar', async () => {
    await expect(init()).resolves.toBeNull();
    await expect(init({ powerPreference: 'low-power' })).resolves.toBeNull();
  });

  it('toda a API aceita null e vira operacao vazia', () => {
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

  it('frame ainda chama o callback, com um quadro que nao faz nada', () => {
    let chamou = false;
    gpuFrame(null, (quadro) => {
      chamou = true;
      expect(quadro.encoder).toBeNull();
      quadro.pass(null);
      quadro.compute();
    });
    expect(chamou).toBe(true);
  });

  it('frameLoop nao agenda rAF nenhum e devolve um stop seguro', () => {
    const espiao = vi.spyOn(globalThis, 'requestAnimationFrame');
    const parar = frameLoop(null, () => undefined);
    expect(espiao).not.toHaveBeenCalled();
    expect(() => parar()).not.toThrow();
  });

  it('o relogio funciona sem GPU', () => {
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

  it('o relogio limita saltos grandes de delta', () => {
    const relogio = clock();
    relogio.tick(0);
    relogio.tick(60_000);
    expect(relogio.delta).toBeLessThanOrEqual(0.25);
  });

  it('o namespace V.gpu expoe a API combinada', () => {
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
// Reflexao de WGSL
// ---------------------------------------------------------------------------

describe('reflexao de WGSL: limpeza da fonte', () => {
  it('remove comentarios de linha e de bloco sem mexer na contagem de linhas', () => {
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

  it('entende comentario de bloco aninhado, que o WGSL permite', () => {
    const limpo = stripWgslComments('a /* um /* dois */ ainda */ b');
    expect(limpo).toContain('a');
    expect(limpo).toContain('b');
    expect(limpo).not.toContain('dois');
  });

  it('nao confunde binding escrito dentro de comentario', () => {
    const info = reflectWgsl(`
      // @group(0) @binding(9) var<uniform> falso: Uniforms;
      struct Uniforms { time: f32 };
      @group(0) @binding(0) var<uniform> u: Uniforms;
    `);
    expect(info.bindings).toHaveLength(1);
    expect(info.bindings[0].binding).toBe(0);
  });
});

describe('reflexao de WGSL: tipos e layout', () => {
  it('separa genericos aninhados sem cortar no meio', () => {
    expect(splitTopLevel('vec4<f32>, 8')).toEqual(['vec4<f32>', '8']);
    expect(splitTopLevel('storage, read_write')).toEqual(['storage', 'read_write']);
  });

  it('escalares tem tamanho e alinhamento de 4 bytes', () => {
    expect(describeWgslType('f32')).toMatchObject({ size: 4, align: 4, components: 1 });
    expect(describeWgslType('u32')).toMatchObject({ size: 4, align: 4, scalar: 'u32' });
  });

  it('vec3 ocupa 12 bytes mas alinha em 16, que e a pegadinha classica', () => {
    expect(describeWgslType('vec2<f32>')).toMatchObject({ size: 8, align: 8 });
    expect(describeWgslType('vec3<f32>')).toMatchObject({ size: 12, align: 16, components: 3 });
    expect(describeWgslType('vec4<f32>')).toMatchObject({ size: 16, align: 16 });
  });

  it('aceita os apelidos curtos vec3f e mat4x4f', () => {
    expect(describeWgslType('vec3f')).toMatchObject({ size: 12, align: 16 });
    expect(describeWgslType('vec2u')).toMatchObject({ size: 8, align: 8, scalar: 'u32' });
    expect(describeWgslType('mat4x4f')).toMatchObject({ size: 64, align: 16 });
  });

  it('matrizes tem passo por coluna', () => {
    expect(describeWgslType('mat4x4<f32>')).toMatchObject({ size: 64, align: 16, stride: 16 });
    // mat3x3 tem colunas de vec3, que ocupam 16 bytes cada por causa do alinhamento.
    expect(describeWgslType('mat3x3<f32>')).toMatchObject({ size: 48, align: 16, stride: 16 });
    expect(describeWgslType('mat2x2<f32>')).toMatchObject({ size: 16, align: 8, stride: 8 });
  });

  it('arrays em uniform tem passo multiplo de 16', () => {
    expect(describeWgslType('array<f32, 4>')).toMatchObject({ stride: 16, size: 64, count: 4 });
    expect(describeWgslType('array<vec4<f32>, 3>')).toMatchObject({ stride: 16, size: 48 });
  });

  it('tipo desconhecido nao lanca, so devolve kind unknown', () => {
    expect(describeWgslType('BichoEstranho')).toMatchObject({ kind: 'unknown' });
    expect(describeWgslType('')).toMatchObject({ kind: 'unknown' });
  });
});

describe('reflexao de WGSL: structs', () => {
  const fonte = `
    struct Uniforms {
      time: f32,
      speed: f32,
      resolution: vec2<f32>,
      tint: vec3<f32>,
      frame: u32,
    };
  `;

  it('calcula o deslocamento de cada campo com o preenchimento certo', () => {
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

  it('aceita ponto e virgula como separador de membro', () => {
    const struct = reflectWgsl('struct U { a: f32; b: vec2<f32>; }').structs.U;
    expect(struct.fields.map((f) => f.name)).toEqual(['a', 'b']);
    expect(struct.fields[1].offset).toBe(8);
  });

  it('ignora atributos antes do nome do membro', () => {
    const struct = reflectWgsl(
      'struct Saida { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> }'
    ).structs.Saida;
    expect(struct.fields.map((f) => f.name)).toEqual(['pos', 'uv']);
  });

  it('matrizes e arrays entram no calculo do tamanho', () => {
    const struct = reflectWgsl(
      'struct M { model: mat4x4<f32>, normal: mat3x3<f32>, escala: f32 }'
    ).structs.M;
    expect(struct.fields.map((f) => f.offset)).toEqual([0, 64, 112]);
    expect(struct.size).toBe(128);

    const arr = reflectWgsl('struct A { pesos: array<f32, 4>, cor: vec4<f32> }').structs.A;
    expect(arr.fields.map((f) => f.offset)).toEqual([0, 64]);
    expect(arr.size).toBe(80);
  });

  it('struct que cita outro struct resolve nas passadas seguintes', () => {
    const info = reflectWgsl(`
      struct Externo { luz: Interno, extra: f32 };
      struct Interno { cor: vec3<f32>, forca: f32 };
    `);
    expect(info.structs.Interno.size).toBe(16);
    expect(info.structs.Externo.fields.map((f) => f.name)).toEqual(['luz', 'extra']);
    expect(info.structs.Externo.fields[1].offset).toBe(16);
  });
});

describe('reflexao de WGSL: bindings', () => {
  const fonte = `
    struct Uniforms { time: f32, tint: vec3<f32> };
    @group(0) @binding(0) var<uniform> u: Uniforms;
    @binding(1) @group(0) var amostra: sampler;
    @group(0) @binding(2) var textura: texture_2d<f32>;
    @group(1) @binding(0) var<storage, read_write> dados: array<vec4<f32>>;
  `;

  it('encontra todos os bindings e ordena por grupo e indice', () => {
    const info = reflectWgsl(fonte);
    expect(info.bindings.map((b) => `${b.group}:${b.binding}:${b.kind}`)).toEqual([
      '0:0:uniform',
      '0:1:sampler',
      '0:2:texture',
      '1:0:storage',
    ]);
  });

  it('aceita @binding antes de @group', () => {
    const info = reflectWgsl(fonte);
    const amostra = info.bindings.find((b) => b.name === 'amostra');
    expect(amostra).toMatchObject({ group: 0, binding: 1, kind: 'sampler' });
  });

  it('liga o binding de uniform ao struct declarado na fonte', () => {
    const info = reflectWgsl(fonte);
    expect(info.uniform?.name).toBe('u');
    expect(info.uniform?.struct?.fields.map((f) => f.name)).toEqual(['time', 'tint']);
    expect(info.uniform?.struct?.size).toBe(32);
  });

  it('descreve a textura com dimensao e tipo de amostragem', () => {
    const info = reflectWgsl(fonte);
    const textura = info.bindings.find((b) => b.name === 'textura');
    expect(textura).toMatchObject({ viewDimension: '2d', sampleType: 'float', multisampled: false });
  });

  it('le o acesso declarado no storage', () => {
    const info = reflectWgsl(fonte);
    expect(info.bindings.find((b) => b.name === 'dados')?.access).toBe('read-write');
    const so = reflectWgsl('@group(0) @binding(0) var<storage, read> x: array<f32>;');
    expect(so.bindings[0].access).toBe('read');
  });

  it('reconhece textura de profundidade e sampler de comparacao', () => {
    const info = reflectWgsl(`
      @group(0) @binding(0) var sombra: texture_depth_2d;
      @group(0) @binding(1) var comparador: sampler_comparison;
    `);
    expect(info.bindings[0]).toMatchObject({ kind: 'texture', sampleType: 'depth' });
    expect(info.bindings[1]).toMatchObject({ kind: 'sampler', comparison: true });
  });
});

describe('reflexao de WGSL: pontos de entrada', () => {
  it('encontra vertex, fragment e compute', () => {
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

  it('le workgroup_size escrito antes do @compute', () => {
    const info = reflectWgsl('@workgroup_size(16) @compute fn c() {}');
    expect(findEntry(info, 'compute')?.workgroupSize).toEqual([16, 1, 1]);
  });

  it('fonte vazia ou invalida devolve reflexao vazia, sem lancar', () => {
    expect(reflectWgsl('')).toEqual({ structs: {}, bindings: [], entries: [] });
    expect(() => reflectWgsl('}{ isto nao e wgsl @@@')).not.toThrow();
    expect(reflectWgsl(undefined as unknown as string).bindings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Escrita dos uniforms
// ---------------------------------------------------------------------------

describe('escrita dos uniforms no buffer', () => {
  const struct = reflectWgsl(
    'struct U { time: f32, speed: f32, resolution: vec2<f32>, tint: vec3<f32>, frame: u32 }'
  ).structs.U;

  it('escreve cada campo no deslocamento calculado', () => {
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

  it('aceita cor em hexadecimal como vetor', () => {
    const buffer = packStruct(struct, { tint: '#ff0080' });
    const view = new DataView(buffer);
    expect(view.getFloat32(16, true)).toBeCloseTo(1, 5);
    expect(view.getFloat32(20, true)).toBeCloseTo(0, 5);
    expect(view.getFloat32(24, true)).toBeCloseTo(128 / 255, 5);
  });

  it('um numero solto preenche o vetor inteiro', () => {
    expect(flattenValue(2, 3)).toEqual([2, 2, 2]);
    expect(flattenValue({ x: 1, y: 2 }, 2)).toEqual([1, 2]);
    expect(flattenValue('#f00', 3)).toEqual([1, 0, 0]);
    expect(flattenValue(null, 3)).toEqual([]);
  });

  it('campos ausentes ficam como estavam', () => {
    const buffer = packStruct(struct, { time: 9, speed: 3 });
    const escritos = writeStruct(buffer, struct, { time: 1 });
    expect(escritos).toEqual(['time']);
    const view = new DataView(buffer);
    expect(view.getFloat32(0, true)).toBe(1);
    expect(view.getFloat32(4, true)).toBe(3);
  });

  it('matriz escreve coluna a coluna, respeitando o preenchimento', () => {
    const m = reflectWgsl('struct M { normal: mat3x3<f32> }').structs.M;
    const buffer = packStruct(m, { normal: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    const view = new DataView(buffer);
    expect(view.getFloat32(0, true)).toBe(1);
    expect(view.getFloat32(8, true)).toBe(3);
    // Quarto float de cada coluna e preenchimento: a segunda coluna comeca em 16.
    expect(view.getFloat32(12, true)).toBe(0);
    expect(view.getFloat32(16, true)).toBe(4);
    expect(view.getFloat32(32, true)).toBe(7);
  });

  it('infere um layout a partir de valores JavaScript', () => {
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
// Origem do shader
// ---------------------------------------------------------------------------

describe('origem do shader', () => {
  it('classifica inline, seletor, url e vazio', () => {
    expect(classifyShaderSource('')).toBe('empty');
    expect(classifyShaderSource('   ')).toBe('empty');
    expect(classifyShaderSource('#meu-shader')).toBe('selector');
    expect(classifyShaderSource('ondas.wgsl')).toBe('url');
    expect(classifyShaderSource('/shaders/ondas.wgsl')).toBe('url');
    expect(classifyShaderSource('https://cdn.exemplo.com/a.wgsl')).toBe('url');
    expect(classifyShaderSource('@fragment fn f() -> @location(0) vec4<f32> {}')).toBe('inline');
    expect(classifyShaderSource('fn ruido(p: vec2<f32>) -> f32 { return 0.0; }')).toBe('inline');
  });

  it('devolve o proprio texto quando o WGSL esta no atributo', async () => {
    const fonte = '@fragment fn f() -> @location(0) vec4<f32> { return vec4<f32>(1.0); }';
    await expect(resolveShaderSource(fonte)).resolves.toBe(fonte);
  });

  it('le o conteudo de um <script> pelo seletor', async () => {
    const script = document.createElement('script');
    script.type = 'x-shader/wgsl';
    script.id = 'shader-de-teste';
    script.textContent = '@fragment fn f() {}';
    document.body.appendChild(script);

    await expect(resolveShaderSource('#shader-de-teste')).resolves.toBe('@fragment fn f() {}');
  });

  it('seletor que nao existe devolve vazio sem lancar', async () => {
    await expect(resolveShaderSource('#nao-existe')).resolves.toBe('');
    await expect(resolveShaderSource('#((invalido')).resolves.toBe('');
  });

  it('busca a URL com o cliente HTTP da Voodoo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('@fragment fn f() {}', { headers: { 'content-type': 'text/plain' } })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(resolveShaderSource('/shaders/ondas.wgsl')).resolves.toBe('@fragment fn f() {}');
    expect(fetchMock).toHaveBeenCalledWith('/shaders/ondas.wgsl', expect.objectContaining({ method: 'GET' }));
  });

  it('falha de rede vira string vazia, nao excecao', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    await expect(resolveShaderSource('/shaders/ausente.wgsl')).resolves.toBe('');
    // O problema e reportado, mas nunca sobe como excecao para a pagina.
    expect(erro).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// A directive v-shader sem WebGPU
// ---------------------------------------------------------------------------

describe('v-shader sem WebGPU', () => {
  it('marca data-gpu="unsupported" e dispara o evento', () => {
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

  it('o conteudo de dentro do canvas passa a aparecer', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>Sem GPU aqui</p></canvas>');
    const canvas = root.querySelector('canvas')!;
    const fallback = root.querySelector('[data-gpu-fallback]');

    expect(fallback).not.toBeNull();
    expect(fallback!.textContent).toBe('Sem GPU aqui');
    expect(canvas.firstChild).toBeNull();
    expect(canvas.style.display).toBe('none');
  });

  it('o fallback continua sendo HTML da Voodoo', async () => {
    const { root, estado } = montar('<canvas v-shader="ondas.wgsl">{{ recado }}</canvas>', {
      recado: 'instale um navegador com WebGPU',
    });
    const fallback = root.querySelector('[data-gpu-fallback]')!;
    expect(fallback.textContent).toBe('instale um navegador com WebGPU');

    (estado as Record<string, string>).recado = 'sem GPU por aqui';
    await assentar();
    expect(fallback.textContent).toBe('sem GPU por aqui');
  });

  it('canvas sem conteudo de alternativa continua visivel', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"></canvas>');
    const canvas = root.querySelector('canvas')!;
    expect(root.querySelector('[data-gpu-fallback]')).toBeNull();
    expect(canvas.style.display).toBe('');
    expect(canvas.getAttribute('data-gpu')).toBe('unsupported');
  });

  it('nao agenda rAF nem abre observador', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    expect(raf).not.toHaveBeenCalled();
  });

  it('nao busca a URL do shader quando nao ha GPU para rodar', () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    montar('<canvas v-shader="ondas.wgsl"></canvas>');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('avisa e desiste quando a directive nao esta num canvas', () => {
    config.devtools = true;
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { root } = montar('<div v-shader="ondas.wgsl"></div>');
    config.devtools = false;

    expect(aviso).toHaveBeenCalled();
    expect(root.querySelector('div')!.hasAttribute('data-gpu')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Contrato de limpeza
// ---------------------------------------------------------------------------

describe('v-shader e o contrato de limpeza', () => {
  it('destruir o elemento devolve o DOM ao estado original', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    const canvas = root.querySelector('canvas')!;

    expect(root.querySelector('[data-gpu-fallback]')).not.toBeNull();

    destroy(root);

    expect(root.querySelector('[data-gpu-fallback]')).toBeNull();
    expect(canvas.hasAttribute('data-gpu')).toBe(false);
    expect(canvas.style.display).toBe('');
    expect(canvas.querySelector('p')?.textContent).toBe('alternativa');
  });

  it('destruir duas vezes nao lanca', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"><p>alternativa</p></canvas>');
    expect(() => {
      destroy(root);
      destroy(root);
    }).not.toThrow();
  });

  it('o conteudo revelado para de reagir ao estado depois da destruicao', async () => {
    const { root, estado } = montar('<canvas v-shader="a.wgsl">{{ recado }}</canvas>', {
      recado: 'antes',
    });
    const canvas = root.querySelector('canvas')!;
    expect(root.querySelector('[data-gpu-fallback]')!.textContent).toBe('antes');

    destroy(root);
    // A limpeza devolve o texto para dentro do canvas, de onde ele saiu.
    expect(canvas.textContent).toBe('antes');

    (estado as Record<string, string>).recado = 'depois';
    await assentar();
    expect(canvas.textContent).toBe('antes');
  });

  it('destruir um canvas sem alternativa tambem limpa a marca', () => {
    const { root } = montar('<canvas v-shader="ondas.wgsl"></canvas>');
    const canvas = root.querySelector('canvas')!;
    destroy(root);
    expect(canvas.hasAttribute('data-gpu')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Caminho com GPU real
// ---------------------------------------------------------------------------

const temGpu = supported();
const motivo = 'sem adaptador WebGPU neste ambiente (jsdom nao tem navigator.gpu)';

describe.skipIf(!temGpu)(`caminho com GPU real ${temGpu ? '' : `- pulado: ${motivo}`}`, () => {
  const fonte = `
    struct Uniforms { time: f32, tint: vec3<f32> };
    @group(0) @binding(0) var<uniform> u: Uniforms;

    @fragment
    fn pintar(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
      return vec4<f32>(u.tint * abs(sin(u.time)) * uv.x, 1.0);
    }
  `;

  it('init abre o dispositivo e destroy solta tudo', async () => {
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

  it('compila um efeito de tela cheia e desenha num alvo', async () => {
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

  it('roda um shader de computacao', async () => {
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
