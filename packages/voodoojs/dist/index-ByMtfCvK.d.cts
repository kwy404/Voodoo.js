/**
 * @module gpu/types
 *
 * Tipos minimos do WebGPU, escritos a mao.
 *
 * O projeto nao aceita dependencias novas, entao `@webgpu/types` esta fora e o
 * `lib.dom` do TypeScript ainda nao descreve `navigator.gpu`. O que existe aqui
 * e apenas a fatia da API que o modulo realmente chama: descritores ficam como
 * `any` de proposito, porque copiar o schema inteiro so criaria uma segunda
 * fonte de verdade para manter em dia.
 *
 * As constantes de uso tambem sao locais. Em producao elas existem como globais
 * (`GPUBufferUsage` e companhia), mas em jsdom nao existem nenhuma, e o modulo
 * precisa ser importavel em ambiente sem GPU sem estourar na primeira linha.
 */
/** Nome de formato de textura, como `bgra8unorm`. */
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
/** Uma mensagem do compilador de WGSL. `lineNum` comeca em 1. */
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
 * Leitura de codigo WGSL para descobrir sozinho o que o shader precisa.
 *
 * A ideia veio do vgpu: quem escreve o shader ja declarou `@group`, `@binding`
 * e o `struct` dos uniforms la dentro. Repetir isso em JavaScript e trabalho
 * dobrado e uma chance a mais de os dois lados sairem do lugar. Entao o modulo
 * le a fonte e monta o bind group layout, o tamanho do buffer e o deslocamento
 * de cada campo a partir do proprio shader.
 *
 * Tudo aqui e funcao pura sobre texto: nao toca no DOM, nao precisa de GPU e
 * roda igual em jsdom. E por isso que esta e a parte mais testada do modulo.
 *
 * O que a reflexao cobre esta descrito em `docs/gpu.md`. Em resumo: `struct`
 * declarado no proprio arquivo, escalares, vetores, matrizes e arrays de tamanho
 * fixo, mais texturas, samplers e buffers de storage. Fica de fora: `@align`,
 * `@size`, `@location` de vertice, arrays sem tamanho dentro de uniform (que o
 * WGSL tambem proibe) e `type`/alias definidos pelo usuario.
 */
/** Familia de um tipo WGSL. */
type WgslTypeKind = 'scalar' | 'vector' | 'matrix' | 'array' | 'struct' | 'unknown';
/** Descricao de um tipo, com o tamanho e o alinhamento ja resolvidos. */
interface WgslType {
    /** Texto original, como `vec3<f32>`. */
    text: string;
    kind: WgslTypeKind;
    /** Escalar de base. `f32` para tipos sem escalar claro. */
    scalar: 'f32' | 'i32' | 'u32' | 'f16' | 'bool';
    /** Bytes ocupados. */
    size: number;
    /** Alinhamento exigido, em bytes. */
    align: number;
    /** Quantos escalares o valor tem ao todo. `vec3<f32>` tem 3. */
    components: number;
    /** Colunas da matriz. */
    columns?: number;
    /** Linhas da matriz, ou seja, o tamanho de cada coluna. */
    rows?: number;
    /** Distancia entre elementos de um array, ou entre colunas de uma matriz. */
    stride?: number;
    /** Quantidade de elementos de um array de tamanho fixo. */
    count?: number;
    /** Tipo do elemento de um array. */
    element?: WgslType;
    /** Nome do struct, quando `kind` e `struct`. */
    struct?: string;
}
/** Um campo de struct, com o deslocamento dentro do buffer. */
interface WgslField {
    name: string;
    type: WgslType;
    /** Deslocamento em bytes a partir do inicio do struct. */
    offset: number;
}
/** Struct declarado no shader. */
interface WgslStruct {
    name: string;
    fields: WgslField[];
    /** Tamanho total, ja arredondado para o alinhamento. */
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
 * Remove comentarios de linha e de bloco. O WGSL permite bloco aninhado, entao
 * a contagem e feita com profundidade em vez de uma expressao regular.
 *
 * Os caracteres removidos viram espaco em vez de sumirem, para que o numero da
 * linha continue batendo com o arquivo original nas mensagens de erro.
 */
declare function stripWgslComments(source: string): string;
/**
 * Divide por virgulas de primeiro nivel. Sem isso `array<vec4<f32>, 8>` seria
 * cortado no meio do generico.
 */
declare function splitTopLevel(text: string): string[];
/**
 * Descreve um tipo WGSL com tamanho e alinhamento.
 *
 * As regras seguidas sao as do endereco `uniform`, que e o caso de uso do
 * modulo: struct alinhado a 16 bytes e passo de array tambem multiplo de 16.
 * Para `storage` o WGSL e mais frouxo; a diferenca esta documentada.
 */
declare function describeWgslType(text: string, structs?: Record<string, WgslStruct>): WgslType;
/**
 * Le os `struct` da fonte e calcula o deslocamento de cada campo.
 *
 * Structs sao resolvidos em varias passadas porque um pode citar outro que
 * aparece depois no arquivo. Tres passadas cobrem qualquer aninhamento razoavel
 * sem virar um grafo de dependencias.
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

/** Qualquer coisa que ocupa memoria na GPU e sabe se soltar. */
interface Disposable {
    destroy(): void;
}
/** Contexto devolvido por `init()`. E o primeiro argumento de tudo. */
interface GpuContext {
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
interface GpuInitOptions {
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
declare function supported(): boolean;
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
declare function init(options?: GpuInitOptions): Promise<GpuContext | null>;
/**
 * Contexto unico da pagina, criado na primeira chamada.
 *
 * Um dispositivo por aba basta: e o que a directive `v-shader` usa, para que
 * dez canvas na mesma pagina nao abram dez dispositivos.
 */
declare function shared(options?: GpuInitOptions): Promise<GpuContext | null>;
/** Esquece o contexto compartilhado. Usado por `destroy()` e pelos testes. */
declare function resetShared(): void;
/** Opcoes de `surface()`. */
interface GpuSurfaceOptions {
    /** Faixa aceita de `devicePixelRatio`, como `[1, 2]`. Padrao `[1, 2]`. */
    dpr?: [number, number];
    /** Formato do canvas. Padrao o preferido do dispositivo. */
    format?: GPUTextureFormat;
    /** Deixa o canvas transparente. Padrao `false`. */
    alpha?: boolean;
}
/** Canvas configurado para receber quadros da GPU. */
interface GpuSurface {
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
/**
 * Prepara um `<canvas>` para receber quadros.
 *
 * O tamanho do buffer acompanha o tamanho em CSS multiplicado pelo
 * `devicePixelRatio`, limitado pela faixa de `dpr` e pelo maior tamanho de
 * textura do dispositivo. Um `ResizeObserver` mantem isso em dia sozinho.
 */
declare function surface(gpu: GpuContext | null, canvas: HTMLCanvasElement | null, options?: GpuSurfaceOptions): GpuSurface;
/** Opcoes de `target()`. */
interface GpuTargetOptions {
    width: number;
    height: number;
    format?: GPUTextureFormat;
    label?: string;
}
/** Textura usada como destino de um passe, para encadear efeitos. */
interface GpuTarget {
    readonly texture: GPUTexture | null;
    readonly width: number;
    readonly height: number;
    readonly format: GPUTextureFormat;
    view(): GPUTextureView | null;
    destroy(): void;
}
/** Cria uma textura de destino, para renderizar fora da tela. */
declare function target(gpu: GpuContext | null, options: GpuTargetOptions): GpuTarget;
/** Buffer de uniforms com layout conhecido. */
interface GpuUniforms {
    /** Layout em uso, venha ele da reflexao ou dos valores iniciais. */
    readonly struct: WgslStruct;
    readonly buffer: GPUBuffer | null;
    /** Ultimos valores aplicados. */
    readonly values: Record<string, unknown>;
    /** Atualiza os campos informados e envia o buffer. */
    set(values: Record<string, unknown>): void;
    destroy(): void;
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
declare function uniforms(gpu: GpuContext | null, initial?: Record<string, unknown>): GpuUniforms;
/** Tempo do laco de quadros, em segundos. */
interface GpuClock {
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
declare function clock(_gpu?: GpuContext | null): GpuClock;
/** Opcoes de `effect()`. */
interface GpuEffectOptions {
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
interface GpuEffect {
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
declare function effect(gpu: GpuContext | null, wgsl: string, options?: GpuEffectOptions): GpuEffect;
/** Opcoes de `compute()`. */
interface GpuComputeOptions {
    set?: Record<string, unknown>;
    entry?: string;
    /** Quantos workgroups despachar. Padrao `[1, 1, 1]`. */
    workgroups?: [number, number?, number?];
    textures?: Record<string, GPUTextureView>;
    label?: string;
}
/** Um shader de computacao pronto para despachar. */
interface GpuCompute {
    readonly reflection: WgslReflection;
    readonly ok: boolean;
    readonly uniforms: GpuUniforms;
    set(values: Record<string, unknown>): void;
    /** Grava o despacho. Chamado por `frame.compute`. */
    dispatch(pass: GPUComputePassEncoder, workgroups?: [number, number?, number?]): void;
    destroy(): void;
}
/** Compila um shader de computacao. */
declare function compute(gpu: GpuContext | null, wgsl: string, options?: GpuComputeOptions): GpuCompute;
/** Destino aceito por `frame.pass`. */
type GpuPassTarget = GpuSurface | GpuTarget | null;
/** Cor de limpeza, como `[r, g, b, a]` de 0 a 1. */
type GpuClearColor = [number, number, number, number];
/** O quadro em construcao, entregue ao callback de `frame` e `frameLoop`. */
interface GpuFrame {
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
/**
 * Grava e envia um quadro.
 *
 * ```js
 * V.gpu.frame(gpu, (frame) => frame.pass(tela, ondas))
 * ```
 */
declare function frame(gpu: GpuContext | null, build: (frame: GpuFrame) => void, relogio?: GpuClock): void;
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
declare function frameLoop(gpu: GpuContext | null, build: (frame: GpuFrame) => void): () => void;
/**
 * Solta tudo que o contexto abriu e encerra o dispositivo.
 *
 * Chamar duas vezes nao faz mal, e chamar com `null` tambem nao.
 */
declare function destroy(gpu: GpuContext | null): void;
/**
 * Tudo do modulo reunido, para expor como `V.gpu` sem colidir com nomes de
 * outros modulos, como o `effect` da reatividade.
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
    /** Leitura de WGSL, util sozinha para inspecionar um shader. */
    reflect: typeof reflectWgsl;
};

export { effect as $, type GpuContext as A, BUFFER_USAGE as B, type GpuEffect as C, type GpuEffectOptions as D, type GpuFrame as E, type GpuInitOptions as F, type GPUAdapter as G, type GpuPassTarget as H, type GpuSurface as I, type GpuSurfaceOptions as J, type GpuTarget as K, type GpuTargetOptions as L, type GpuUniforms as M, type WgslBindingKind as N, type WgslEntry as O, type WgslField as P, type WgslReflection as Q, type WgslStruct as R, SHADER_STAGE as S, TEXTURE_USAGE as T, type WgslType as U, type WgslTypeKind as V, type WgslBinding as W, clock as X, compute as Y, describeWgslType as Z, destroy as _, type GPUBindGroup as a, findEntry as a0, flattenValue as a1, frame as a2, frameLoop as a3, gpu as a4, inferStruct as a5, init as a6, packStruct as a7, reflectBindings as a8, reflectEntries as a9, reflectStructs as aa, reflectWgsl as ab, resetShared as ac, shared as ad, splitTopLevel as ae, stripWgslComments as af, supported as ag, surface as ah, target as ai, uniforms as aj, writeField as ak, writeStruct as al, type GPUBindGroupLayout as b, type GPUBuffer as c, type GPUCanvasContext as d, type GPUCommandBuffer as e, type GPUCommandEncoder as f, type GPUCompilationInfo as g, type GPUCompilationMessage as h, type GPUComputePassEncoder as i, type GPUComputePipeline as j, type GPUDevice as k, type GPUDeviceLostInfo as l, type GPUNavigator as m, type GPUPipelineLayout as n, type GPUQueue as o, type GPURenderPassEncoder as p, type GPURenderPipeline as q, type GPUSampler as r, type GPUShaderModule as s, type GPUTexture as t, type GPUTextureFormat as u, type GPUTextureView as v, type GpuClearColor as w, type GpuClock as x, type GpuCompute as y, type GpuComputeOptions as z };
