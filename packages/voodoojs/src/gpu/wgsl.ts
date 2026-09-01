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

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

/** Family of a WGSL type. */
export type WgslTypeKind = 'scalar' | 'vector' | 'matrix' | 'array' | 'struct' | 'unknown';

/** Description of a type, with size and alignment already resolved. */
export interface WgslType {
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
export interface WgslField {
  name: string;
  type: WgslType;
  /** Offset in bytes from the start of the struct. */
  offset: number;
}

/** Struct declared in the shader. */
export interface WgslStruct {
  name: string;
  fields: WgslField[];
  /** Total size, already rounded to alignment. */
  size: number;
  align: number;
}

/** Papel de um recurso ligado ao shader. */
export type WgslBindingKind =
  | 'uniform'
  | 'storage'
  | 'texture'
  | 'storage-texture'
  | 'sampler'
  | 'unknown';

/** Um `@group(x) @binding(y) var ...` encontrado na fonte. */
export interface WgslBinding {
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
export interface WgslEntry {
  stage: 'vertex' | 'fragment' | 'compute';
  name: string;
  /** Tamanho do workgroup, apenas para `@compute`. */
  workgroupSize?: [number, number, number];
}

/** Resultado completo da leitura de um shader. */
export interface WgslReflection {
  structs: Record<string, WgslStruct>;
  bindings: WgslBinding[];
  entries: WgslEntry[];
  /** Atalho para o primeiro binding de uniform encontrado. */
  uniform?: WgslBinding;
}

// ---------------------------------------------------------------------------
// Limpeza da fonte
// ---------------------------------------------------------------------------

/**
 * Removes line and block comments. WGSL allows nested blocks, so
 * counting is done with depth instead of a regex.
 *
 * Removed characters become spaces instead of disappearing, so the line number
 * still matches the original file in error messages.
 */
export function stripWgslComments(source: string): string {
  let out = '';
  let depth = 0;
  let line = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (line) {
      if (ch === '\n') {
        line = false;
        out += ch;
      } else out += ' ';
      continue;
    }

    if (depth > 0) {
      if (ch === '/' && next === '*') {
        depth++;
        out += '  ';
        i++;
        continue;
      }
      if (ch === '*' && next === '/') {
        depth--;
        out += '  ';
        i++;
        continue;
      }
      out += ch === '\n' ? ch : ' ';
      continue;
    }

    if (ch === '/' && next === '/') {
      line = true;
      out += '  ';
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      depth = 1;
      out += '  ';
      i++;
      continue;
    }
    out += ch;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Tipos e regras de layout
// ---------------------------------------------------------------------------

const SCALAR_SIZE: Record<string, number> = { f32: 4, i32: 4, u32: 4, f16: 2, bool: 4 };

/** Rounds `value` up to the next multiple of `align`. */
function roundUp(value: number, align: number): number {
  if (align <= 0) return value;
  return Math.ceil(value / align) * align;
}

/** Splits `vec3<f32>` into `vec3` and `f32`, respecting nesting. */
function splitGenerics(text: string): { base: string; args: string[] } {
  const open = text.indexOf('<');
  if (open < 0) return { base: text.trim(), args: [] };
  const base = text.slice(0, open).trim();
  const inner = text.slice(open + 1, text.lastIndexOf('>'));
  return { base, args: splitTopLevel(inner) };
}

/**
 * Splits by top-level commas. Without this `array<vec4<f32>, 8>` would be
 * cut in the middle of the generic.
 */
export function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '<' || ch === '(') depth++;
    else if (ch === '>' || ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const UNKNOWN_TYPE: WgslType = {
  text: '',
  kind: 'unknown',
  scalar: 'f32',
  size: 0,
  align: 1,
  components: 0,
};

/**
 * Describes a WGSL type with size and alignment.
 *
 * The rules followed are for the `uniform` address space, which is the module's
 * use case: struct aligned to 16 bytes and array stride also a multiple of 16.
 * For `storage` WGSL is more relaxed; the difference is documented.
 */
export function describeWgslType(
  text: string,
  structs: Record<string, WgslStruct> = {}
): WgslType {
  const clean = text.trim();
  if (!clean) return { ...UNKNOWN_TYPE };

  if (clean in SCALAR_SIZE) {
    const size = SCALAR_SIZE[clean];
    return {
      text: clean,
      kind: 'scalar',
      scalar: clean as WgslType['scalar'],
      size,
      align: size,
      components: 1,
    };
  }

  const { base, args } = splitGenerics(clean);

  // Short aliases of modern WGSL: `vec3f`, `vec2u`, `mat4x4f`.
  const shortVector = /^vec([234])([fiuh])$/.exec(base);
  if (shortVector) {
    return describeWgslType(`vec${shortVector[1]}<${expandShort(shortVector[2])}>`, structs);
  }
  const shortMatrix = /^mat([234])x([234])([fh])$/.exec(base);
  if (shortMatrix) {
    return describeWgslType(
      `mat${shortMatrix[1]}x${shortMatrix[2]}<${expandShort(shortMatrix[3])}>`,
      structs
    );
  }

  const vector = /^vec([234])$/.exec(base);
  if (vector) {
    const n = Number(vector[1]);
    const scalar = (args[0] ?? 'f32') as WgslType['scalar'];
    const unit = SCALAR_SIZE[scalar] ?? 4;
    return {
      text: clean,
      kind: 'vector',
      scalar,
      size: n * unit,
      // vec3 aligns like vec4: the classic gotcha when writing offsets by hand.
      align: (n === 3 ? 4 : n) * unit,
      components: n,
    };
  }

  const matrix = /^mat([234])x([234])$/.exec(base);
  if (matrix) {
    const columns = Number(matrix[1]);
    const rows = Number(matrix[2]);
    const scalar = (args[0] ?? 'f32') as WgslType['scalar'];
    const column = describeWgslType(`vec${rows}<${scalar}>`, structs);
    return {
      text: clean,
      kind: 'matrix',
      scalar,
      size: columns * column.align,
      align: column.align,
      components: columns * rows,
      columns,
      rows,
      stride: column.align,
    };
  }

  if (base === 'array') {
    const element = describeWgslType(args[0] ?? 'f32', structs);
    const count = args[1] ? Number(args[1].replace(/[^\d]/g, '')) : 0;
    // In the uniform address space, array stride is always a multiple of 16.
    const stride = roundUp(roundUp(element.size, element.align), 16);
    return {
      text: clean,
      kind: 'array',
      scalar: element.scalar,
      size: count > 0 ? stride * count : 0,
      align: Math.max(element.align, 16),
      components: count * element.components,
      stride,
      count,
      element,
    };
  }

  const struct = structs[base];
  if (struct) {
    return {
      text: clean,
      kind: 'struct',
      scalar: 'f32',
      size: struct.size,
      align: struct.align,
      components: struct.fields.reduce((total, field) => total + field.type.components, 0),
      struct: base,
    };
  }

  return { ...UNKNOWN_TYPE, text: clean };
}

function expandShort(letter: string): string {
  if (letter === 'i') return 'i32';
  if (letter === 'u') return 'u32';
  if (letter === 'h') return 'f16';
  return 'f32';
}

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

const STRUCT_RE = /\bstruct\s+([A-Za-z_]\w*)\s*\{([^}]*)\}/g;
const MEMBER_RE = /^(?:@\w+\s*(?:\([^)]*\)\s*)?)*([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/;

/**
 * Reads `struct`s from the source and calculates the offset of each field.
 *
 * Structs are resolved in multiple passes because one can reference another
 * that appears later in the file. Three passes cover any reasonable nesting
 * without becoming a dependency graph.
 */
export function reflectStructs(source: string): Record<string, WgslStruct> {
  const bodies: Array<{ name: string; body: string }> = [];
  STRUCT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STRUCT_RE.exec(source)) !== null) {
    bodies.push({ name: match[1], body: match[2] });
  }

  const structs: Record<string, WgslStruct> = {};
  for (let pass = 0; pass < 3; pass++) {
    for (const { name, body } of bodies) {
      structs[name] = layoutStruct(name, body, structs);
    }
  }
  return structs;
}

function layoutStruct(
  name: string,
  body: string,
  structs: Record<string, WgslStruct>
): WgslStruct {
  const fields: WgslField[] = [];
  let offset = 0;
  let align = 1;

  // Members can end with comma or semicolon; both are valid.
  for (const raw of splitTopLevel(body.replace(/;/g, ','))) {
    const parsed = MEMBER_RE.exec(raw.trim());
    if (!parsed) continue;
    const type = describeWgslType(parsed[2], structs);
    if (type.kind === 'unknown') continue;
    offset = roundUp(offset, type.align);
    fields.push({ name: parsed[1], type, offset });
    offset += type.size;
    align = Math.max(align, type.align);
  }

  // Struct in the uniform address space aligns to 16 bytes.
  const finalAlign = Math.max(align, 16);
  return { name, fields, align: finalAlign, size: roundUp(offset, finalAlign) };
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

const BINDING_RE =
  /@(?:group|binding)\s*\(\s*\d+\s*\)\s*@(?:group|binding)\s*\(\s*\d+\s*\)\s*var(?:\s*<([^>]*)>)?\s+([A-Za-z_]\w*)\s*:\s*([^;]+);/g;
const GROUP_RE = /@group\s*\(\s*(\d+)\s*\)/;
const BINDING_INDEX_RE = /@binding\s*\(\s*(\d+)\s*\)/;

/** Le os `@group @binding var ...` da fonte. */
export function reflectBindings(
  source: string,
  structs: Record<string, WgslStruct>
): WgslBinding[] {
  const out: WgslBinding[] = [];
  BINDING_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = BINDING_RE.exec(source)) !== null) {
    const head = match[0];
    const group = Number(GROUP_RE.exec(head)?.[1] ?? 0);
    const binding = Number(BINDING_INDEX_RE.exec(head)?.[1] ?? 0);
    const space = splitTopLevel(match[1] ?? '');
    const name = match[2];
    const typeText = match[3].trim();

    out.push(describeBinding(group, binding, space, name, typeText, structs));
  }

  // A ordem do arquivo nao importa para a GPU, mas importa para quem le o log.
  return out.sort((a, b) => a.group - b.group || a.binding - b.binding);
}

function describeBinding(
  group: number,
  binding: number,
  space: string[],
  name: string,
  typeText: string,
  structs: Record<string, WgslStruct>
): WgslBinding {
  const address = space[0] ?? '';
  const accessWord = space[1] ?? '';
  const access: WgslBinding['access'] =
    accessWord === 'read_write' ? 'read-write' : accessWord === 'write' ? 'write' : 'read';

  if (address === 'uniform') {
    const { base } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: 'uniform',
      typeText,
      access: 'read',
      struct: structs[base],
    };
  }

  if (address === 'storage') {
    const { base } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: 'storage',
      typeText,
      access,
      struct: structs[base],
    };
  }

  if (typeText.startsWith('sampler')) {
    return {
      group,
      binding,
      name,
      kind: 'sampler',
      typeText,
      access: 'read',
      comparison: typeText.startsWith('sampler_comparison'),
    };
  }

  if (typeText.startsWith('texture_storage')) {
    const { base, args } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: 'storage-texture',
      typeText,
      access: (args[1] ?? 'write') === 'read_write' ? 'read-write' : 'write',
      viewDimension: base.replace('texture_storage_', ''),
      sampleType: args[0],
    };
  }

  if (typeText.startsWith('texture_')) {
    const { base, args } = splitGenerics(typeText);
    const dimension = base
      .replace('texture_multisampled_', '')
      .replace('texture_depth_multisampled_', '')
      .replace('texture_depth_', '')
      .replace('texture_', '');
    const depth = base.includes('depth');
    const scalar = args[0] ?? 'f32';
    return {
      group,
      binding,
      name,
      kind: 'texture',
      typeText,
      access: 'read',
      multisampled: base.includes('multisampled'),
      comparison: depth,
      viewDimension: dimension === 'cube_array' ? 'cube-array' : dimension.replace('_array', '-array'),
      sampleType: depth ? 'depth' : scalar === 'i32' ? 'sint' : scalar === 'u32' ? 'uint' : 'float',
    };
  }

  return { group, binding, name, kind: 'unknown', typeText, access };
}

// ---------------------------------------------------------------------------
// Pontos de entrada
// ---------------------------------------------------------------------------

const ENTRY_RE =
  /@(vertex|fragment|compute)\s*((?:@\w+\s*(?:\([^)]*\)\s*)?)*)fn\s+([A-Za-z_]\w*)/g;
const WORKGROUP_RE = /@workgroup_size\s*\(([^)]*)\)/;

/** Le os `@vertex`, `@fragment` e `@compute` da fonte. */
export function reflectEntries(source: string): WgslEntry[] {
  const out: WgslEntry[] = [];
  ENTRY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ENTRY_RE.exec(source)) !== null) {
    const stage = match[1] as WgslEntry['stage'];
    const entry: WgslEntry = { stage, name: match[3] };

    if (stage === 'compute') {
      // O `@workgroup_size` pode vir antes ou depois do `@compute`.
      const around = source.slice(Math.max(0, match.index - 120), match.index + match[0].length);
      const sizes = WORKGROUP_RE.exec(around)?.[1];
      const parts = sizes ? splitTopLevel(sizes).map((n) => Number(n) || 1) : [];
      entry.workgroupSize = [parts[0] ?? 1, parts[1] ?? 1, parts[2] ?? 1];
    }

    out.push(entry);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reflexao completa
// ---------------------------------------------------------------------------

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
export function reflectWgsl(source: string): WgslReflection {
  if (typeof source !== 'string' || !source.trim()) {
    return { structs: {}, bindings: [], entries: [] };
  }

  const clean = stripWgslComments(source);
  const structs = reflectStructs(clean);
  const bindings = reflectBindings(clean, structs);
  const entries = reflectEntries(clean);

  return {
    structs,
    bindings,
    entries,
    uniform: bindings.find((b) => b.kind === 'uniform' && b.struct),
  };
}

/** Procura o nome do ponto de entrada de um estagio. */
export function findEntry(reflection: WgslReflection, stage: WgslEntry['stage']): WgslEntry | undefined {
  return reflection.entries.find((entry) => entry.stage === stage);
}

// ---------------------------------------------------------------------------
// Layout inferido a partir de valores JavaScript
// ---------------------------------------------------------------------------

/** Descobre o tipo WGSL equivalente a um valor JavaScript. */
function guessType(value: unknown): string | null {
  if (typeof value === 'number') return 'f32';
  if (typeof value === 'boolean') return 'f32';
  if (typeof value === 'string') return parseColor(value) ? 'vec4<f32>' : null;
  if (Array.isArray(value)) {
    if (value.length >= 2 && value.length <= 4 && value.every((v) => typeof v === 'number')) {
      return `vec${value.length}<f32>`;
    }
    if (value.length === 16) return 'mat4x4<f32>';
    if (value.length === 9) return 'mat3x3<f32>';
  }
  return null;
}

/**
 * Monta um struct a partir de um objeto de valores, quando nao existe shader
 * para consultar. E o caminho de `V.gpu.uniforms(gpu, { ... })`.
 *
 * A ordem das chaves do objeto vira a ordem dos campos, entao o objeto precisa
 * espelhar o `struct` do shader. Quando existe shader, prefira sempre a
 * reflexao: ela nao depende de ninguem lembrar a ordem certa.
 */
export function inferStruct(values: Record<string, unknown>, name = 'Uniforms'): WgslStruct {
  const fields: WgslField[] = [];
  let offset = 0;
  let align = 1;

  for (const [key, value] of Object.entries(values)) {
    const text = guessType(value);
    if (!text) continue;
    const type = describeWgslType(text);
    offset = roundUp(offset, type.align);
    fields.push({ name: key, type, offset });
    offset += type.size;
    align = Math.max(align, type.align);
  }

  const finalAlign = Math.max(align, 16);
  return { name, fields, align: finalAlign, size: roundUp(offset, finalAlign) };
}

// ---------------------------------------------------------------------------
// Escrita dos valores no buffer
// ---------------------------------------------------------------------------

const HEX = /^#([0-9a-f]{3,8})$/i;

/** Le `#f0a`, `#ff00aa` e `#ff00aa80` como quatro canais de 0 a 1. */
function parseColor(text: string): [number, number, number, number] | null {
  const match = HEX.exec(text.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 3 || digits.length === 4) {
    digits = digits
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (digits.length !== 6 && digits.length !== 8) return null;
  const value = parseInt(digits.slice(0, 6), 16);
  const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, alpha];
}

/** Transforma um valor solto na lista de escalares que ele representa. */
export function flattenValue(value: unknown, components: number): number[] {
  if (typeof value === 'number') {
    // Um numero so preenche o vetor inteiro. `escala: 2` vira `vec3(2,2,2)`.
    return new Array(components).fill(value);
  }
  if (typeof value === 'boolean') return new Array(components).fill(value ? 1 : 0);

  if (typeof value === 'string') {
    const color = parseColor(value);
    if (!color) return [];
    return color.slice(0, Math.max(1, components));
  }

  if (Array.isArray(value)) {
    const out: number[] = [];
    for (const item of value) {
      if (typeof item === 'number') out.push(item);
      else if (typeof item === 'boolean') out.push(item ? 1 : 0);
      else out.push(...flattenValue(item, 1));
    }
    return out;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = ['x', 'y', 'z', 'w'];
    const alt = ['r', 'g', 'b', 'a'];
    const out: number[] = [];
    for (let i = 0; i < components; i++) {
      const found = record[keys[i]] ?? record[alt[i]];
      if (typeof found === 'number') out.push(found);
    }
    return out;
  }

  return [];
}

/** Escreve um campo no buffer, respeitando o passo entre colunas da matriz. */
export function writeField(view: DataView, field: WgslField, value: unknown): boolean {
  const { type, offset } = field;
  const numbers = flattenValue(value, type.components);
  if (numbers.length === 0) return false;

  const little = true;
  const put = (at: number, n: number): void => {
    if (at + 4 > view.byteLength) return;
    if (type.scalar === 'i32') view.setInt32(at, Math.trunc(n), little);
    else if (type.scalar === 'u32') view.setUint32(at, Math.max(0, Math.trunc(n)), little);
    else view.setFloat32(at, n, little);
  };

  // Matriz e array escrevem por bloco: entre uma coluna e outra ha preenchimento.
  if (type.kind === 'matrix' && type.columns && type.rows && type.stride) {
    const unit = SCALAR_SIZE[type.scalar] ?? 4;
    for (let column = 0; column < type.columns; column++) {
      for (let row = 0; row < type.rows; row++) {
        const n = numbers[column * type.rows + row];
        if (n === undefined) continue;
        put(offset + column * type.stride + row * unit, n);
      }
    }
    return true;
  }

  if (type.kind === 'array' && type.element && type.stride) {
    const unit = SCALAR_SIZE[type.element.scalar] ?? 4;
    const per = Math.max(1, type.element.components);
    const total = type.count ?? Math.ceil(numbers.length / per);
    for (let i = 0; i < total; i++) {
      for (let c = 0; c < per; c++) {
        const n = numbers[i * per + c];
        if (n === undefined) continue;
        put(offset + i * type.stride + c * unit, n);
      }
    }
    return true;
  }

  const unit = SCALAR_SIZE[type.scalar] ?? 4;
  for (let i = 0; i < Math.min(numbers.length, Math.max(1, type.components)); i++) {
    put(offset + i * unit, numbers[i]);
  }
  return true;
}

/**
 * Escreve um objeto de valores dentro de um buffer que segue o layout do
 * struct. Campos ausentes ficam como estavam, o que permite atualizar so o que
 * mudou sem reenviar o resto.
 *
 * @returns os nomes dos campos que foram realmente escritos
 */
export function writeStruct(
  buffer: ArrayBuffer,
  struct: WgslStruct,
  values: Record<string, unknown>
): string[] {
  const view = new DataView(buffer);
  const written: string[] = [];
  for (const field of struct.fields) {
    if (!(field.name in values)) continue;
    const value = values[field.name];
    if (value === undefined || value === null) continue;
    if (writeField(view, field, value)) written.push(field.name);
  }
  return written;
}

/** Cria o buffer do struct ja com os valores iniciais escritos. */
export function packStruct(struct: WgslStruct, values: Record<string, unknown> = {}): ArrayBuffer {
  const buffer = new ArrayBuffer(Math.max(16, struct.size));
  writeStruct(buffer, struct, values);
  return buffer;
}
