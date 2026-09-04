import { handleError } from './chunk-PPT7RDKJ.js';
import { warn } from './chunk-YH3IDF6L.js';

/**
 * Voodoo.js v0.12.5
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/gpu/wgsl.ts
function stripWgslComments(source) {
  let out = "";
  let depth = 0;
  let line = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    if (line) {
      if (ch === "\n") {
        line = false;
        out += ch;
      } else out += " ";
      continue;
    }
    if (depth > 0) {
      if (ch === "/" && next === "*") {
        depth++;
        out += "  ";
        i++;
        continue;
      }
      if (ch === "*" && next === "/") {
        depth--;
        out += "  ";
        i++;
        continue;
      }
      out += ch === "\n" ? ch : " ";
      continue;
    }
    if (ch === "/" && next === "/") {
      line = true;
      out += "  ";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      depth = 1;
      out += "  ";
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}
var SCALAR_SIZE = { f32: 4, i32: 4, u32: 4, f16: 2, bool: 4 };
function roundUp(value, align) {
  if (align <= 0) return value;
  return Math.ceil(value / align) * align;
}
function splitGenerics(text) {
  const open = text.indexOf("<");
  if (open < 0) return { base: text.trim(), args: [] };
  const base = text.slice(0, open).trim();
  const inner = text.slice(open + 1, text.lastIndexOf(">"));
  return { base, args: splitTopLevel(inner) };
}
function splitTopLevel(text) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}
var UNKNOWN_TYPE = {
  text: "",
  kind: "unknown",
  scalar: "f32",
  size: 0,
  align: 1,
  components: 0
};
function describeWgslType(text, structs = {}) {
  const clean = text.trim();
  if (!clean) return { ...UNKNOWN_TYPE };
  if (clean in SCALAR_SIZE) {
    const size = SCALAR_SIZE[clean];
    return {
      text: clean,
      kind: "scalar",
      scalar: clean,
      size,
      align: size,
      components: 1
    };
  }
  const { base, args } = splitGenerics(clean);
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
    const scalar = args[0] ?? "f32";
    const unit = SCALAR_SIZE[scalar] ?? 4;
    return {
      text: clean,
      kind: "vector",
      scalar,
      size: n * unit,
      // vec3 aligns like vec4: the classic gotcha when writing offsets by hand.
      align: (n === 3 ? 4 : n) * unit,
      components: n
    };
  }
  const matrix = /^mat([234])x([234])$/.exec(base);
  if (matrix) {
    const columns = Number(matrix[1]);
    const rows = Number(matrix[2]);
    const scalar = args[0] ?? "f32";
    const column = describeWgslType(`vec${rows}<${scalar}>`, structs);
    return {
      text: clean,
      kind: "matrix",
      scalar,
      size: columns * column.align,
      align: column.align,
      components: columns * rows,
      columns,
      rows,
      stride: column.align
    };
  }
  if (base === "array") {
    const element = describeWgslType(args[0] ?? "f32", structs);
    const count = args[1] ? Number(args[1].replace(/[^\d]/g, "")) : 0;
    const stride = roundUp(roundUp(element.size, element.align), 16);
    return {
      text: clean,
      kind: "array",
      scalar: element.scalar,
      size: count > 0 ? stride * count : 0,
      align: Math.max(element.align, 16),
      components: count * element.components,
      stride,
      count,
      element
    };
  }
  const struct = structs[base];
  if (struct) {
    return {
      text: clean,
      kind: "struct",
      scalar: "f32",
      size: struct.size,
      align: struct.align,
      components: struct.fields.reduce((total, field) => total + field.type.components, 0),
      struct: base
    };
  }
  return { ...UNKNOWN_TYPE, text: clean };
}
function expandShort(letter) {
  if (letter === "i") return "i32";
  if (letter === "u") return "u32";
  if (letter === "h") return "f16";
  return "f32";
}
var STRUCT_RE = /\bstruct\s+([A-Za-z_]\w*)\s*\{([^}]*)\}/g;
var MEMBER_RE = /^(?:@\w+\s*(?:\([^)]*\)\s*)?)*([A-Za-z_]\w*)\s*:\s*([\s\S]+)$/;
function reflectStructs(source) {
  const bodies = [];
  STRUCT_RE.lastIndex = 0;
  let match;
  while ((match = STRUCT_RE.exec(source)) !== null) {
    bodies.push({ name: match[1], body: match[2] });
  }
  const structs = {};
  for (let pass = 0; pass < 3; pass++) {
    for (const { name, body } of bodies) {
      structs[name] = layoutStruct(name, body, structs);
    }
  }
  return structs;
}
function layoutStruct(name, body, structs) {
  const fields = [];
  let offset = 0;
  let align = 1;
  for (const raw of splitTopLevel(body.replace(/;/g, ","))) {
    const parsed = MEMBER_RE.exec(raw.trim());
    if (!parsed) continue;
    const type = describeWgslType(parsed[2], structs);
    if (type.kind === "unknown") continue;
    offset = roundUp(offset, type.align);
    fields.push({ name: parsed[1], type, offset });
    offset += type.size;
    align = Math.max(align, type.align);
  }
  const finalAlign = Math.max(align, 16);
  return { name, fields, align: finalAlign, size: roundUp(offset, finalAlign) };
}
var BINDING_RE = /@(?:group|binding)\s*\(\s*\d+\s*\)\s*@(?:group|binding)\s*\(\s*\d+\s*\)\s*var(?:\s*<([^>]*)>)?\s+([A-Za-z_]\w*)\s*:\s*([^;]+);/g;
var GROUP_RE = /@group\s*\(\s*(\d+)\s*\)/;
var BINDING_INDEX_RE = /@binding\s*\(\s*(\d+)\s*\)/;
function reflectBindings(source, structs) {
  const out = [];
  BINDING_RE.lastIndex = 0;
  let match;
  while ((match = BINDING_RE.exec(source)) !== null) {
    const head = match[0];
    const group = Number(GROUP_RE.exec(head)?.[1] ?? 0);
    const binding = Number(BINDING_INDEX_RE.exec(head)?.[1] ?? 0);
    const space = splitTopLevel(match[1] ?? "");
    const name = match[2];
    const typeText = match[3].trim();
    out.push(describeBinding(group, binding, space, name, typeText, structs));
  }
  return out.sort((a, b) => a.group - b.group || a.binding - b.binding);
}
function describeBinding(group, binding, space, name, typeText, structs) {
  const address = space[0] ?? "";
  const accessWord = space[1] ?? "";
  const access = accessWord === "read_write" ? "read-write" : accessWord === "write" ? "write" : "read";
  if (address === "uniform") {
    const { base } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: "uniform",
      typeText,
      access: "read",
      struct: structs[base]
    };
  }
  if (address === "storage") {
    const { base } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: "storage",
      typeText,
      access,
      struct: structs[base]
    };
  }
  if (typeText.startsWith("sampler")) {
    return {
      group,
      binding,
      name,
      kind: "sampler",
      typeText,
      access: "read",
      comparison: typeText.startsWith("sampler_comparison")
    };
  }
  if (typeText.startsWith("texture_storage")) {
    const { base, args } = splitGenerics(typeText);
    return {
      group,
      binding,
      name,
      kind: "storage-texture",
      typeText,
      access: (args[1] ?? "write") === "read_write" ? "read-write" : "write",
      viewDimension: base.replace("texture_storage_", ""),
      sampleType: args[0]
    };
  }
  if (typeText.startsWith("texture_")) {
    const { base, args } = splitGenerics(typeText);
    const dimension = base.replace("texture_multisampled_", "").replace("texture_depth_multisampled_", "").replace("texture_depth_", "").replace("texture_", "");
    const depth = base.includes("depth");
    const scalar = args[0] ?? "f32";
    return {
      group,
      binding,
      name,
      kind: "texture",
      typeText,
      access: "read",
      multisampled: base.includes("multisampled"),
      comparison: depth,
      viewDimension: dimension === "cube_array" ? "cube-array" : dimension.replace("_array", "-array"),
      sampleType: depth ? "depth" : scalar === "i32" ? "sint" : scalar === "u32" ? "uint" : "float"
    };
  }
  return { group, binding, name, kind: "unknown", typeText, access };
}
var ENTRY_RE = /@(vertex|fragment|compute)\s*((?:@\w+\s*(?:\([^)]*\)\s*)?)*)fn\s+([A-Za-z_]\w*)/g;
var WORKGROUP_RE = /@workgroup_size\s*\(([^)]*)\)/;
function reflectEntries(source) {
  const out = [];
  ENTRY_RE.lastIndex = 0;
  let match;
  while ((match = ENTRY_RE.exec(source)) !== null) {
    const stage = match[1];
    const entry = { stage, name: match[3] };
    if (stage === "compute") {
      const around = source.slice(Math.max(0, match.index - 120), match.index + match[0].length);
      const sizes = WORKGROUP_RE.exec(around)?.[1];
      const parts = sizes ? splitTopLevel(sizes).map((n) => Number(n) || 1) : [];
      entry.workgroupSize = [parts[0] ?? 1, parts[1] ?? 1, parts[2] ?? 1];
    }
    out.push(entry);
  }
  return out;
}
function reflectWgsl(source) {
  if (typeof source !== "string" || !source.trim()) {
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
    uniform: bindings.find((b) => b.kind === "uniform" && b.struct)
  };
}
function findEntry(reflection, stage) {
  return reflection.entries.find((entry) => entry.stage === stage);
}
function guessType(value) {
  if (typeof value === "number") return "f32";
  if (typeof value === "boolean") return "f32";
  if (typeof value === "string") return parseColor(value) ? "vec4<f32>" : null;
  if (Array.isArray(value)) {
    if (value.length >= 2 && value.length <= 4 && value.every((v) => typeof v === "number")) {
      return `vec${value.length}<f32>`;
    }
    if (value.length === 16) return "mat4x4<f32>";
    if (value.length === 9) return "mat3x3<f32>";
  }
  return null;
}
function inferStruct(values, name = "Uniforms") {
  const fields = [];
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
var HEX = /^#([0-9a-f]{3,8})$/i;
function parseColor(text) {
  const match = HEX.exec(text.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 3 || digits.length === 4) {
    digits = digits.split("").map((ch) => ch + ch).join("");
  }
  if (digits.length !== 6 && digits.length !== 8) return null;
  const value = parseInt(digits.slice(0, 6), 16);
  const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255, alpha];
}
function flattenValue(value, components) {
  if (typeof value === "number") {
    return new Array(components).fill(value);
  }
  if (typeof value === "boolean") return new Array(components).fill(value ? 1 : 0);
  if (typeof value === "string") {
    const color = parseColor(value);
    if (!color) return [];
    return color.slice(0, Math.max(1, components));
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      if (typeof item === "number") out.push(item);
      else if (typeof item === "boolean") out.push(item ? 1 : 0);
      else out.push(...flattenValue(item, 1));
    }
    return out;
  }
  if (value && typeof value === "object") {
    const record = value;
    const keys = ["x", "y", "z", "w"];
    const alt = ["r", "g", "b", "a"];
    const out = [];
    for (let i = 0; i < components; i++) {
      const found = record[keys[i]] ?? record[alt[i]];
      if (typeof found === "number") out.push(found);
    }
    return out;
  }
  return [];
}
function writeField(view, field, value) {
  const { type, offset } = field;
  const numbers = flattenValue(value, type.components);
  if (numbers.length === 0) return false;
  const little = true;
  const put = (at, n) => {
    if (at + 4 > view.byteLength) return;
    if (type.scalar === "i32") view.setInt32(at, Math.trunc(n), little);
    else if (type.scalar === "u32") view.setUint32(at, Math.max(0, Math.trunc(n)), little);
    else view.setFloat32(at, n, little);
  };
  if (type.kind === "matrix" && type.columns && type.rows && type.stride) {
    const unit2 = SCALAR_SIZE[type.scalar] ?? 4;
    for (let column = 0; column < type.columns; column++) {
      for (let row = 0; row < type.rows; row++) {
        const n = numbers[column * type.rows + row];
        if (n === void 0) continue;
        put(offset + column * type.stride + row * unit2, n);
      }
    }
    return true;
  }
  if (type.kind === "array" && type.element && type.stride) {
    const unit2 = SCALAR_SIZE[type.element.scalar] ?? 4;
    const per = Math.max(1, type.element.components);
    const total = type.count ?? Math.ceil(numbers.length / per);
    for (let i = 0; i < total; i++) {
      for (let c = 0; c < per; c++) {
        const n = numbers[i * per + c];
        if (n === void 0) continue;
        put(offset + i * type.stride + c * unit2, n);
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
function writeStruct(buffer, struct, values) {
  const view = new DataView(buffer);
  const written = [];
  for (const field of struct.fields) {
    if (!(field.name in values)) continue;
    const value = values[field.name];
    if (value === void 0 || value === null) continue;
    if (writeField(view, field, value)) written.push(field.name);
  }
  return written;
}
function packStruct(struct, values = {}) {
  const buffer = new ArrayBuffer(Math.max(16, struct.size));
  writeStruct(buffer, struct, values);
  return buffer;
}

// src/gpu/types.ts
var BUFFER_USAGE = {
  MAP_READ: 1,
  MAP_WRITE: 2,
  COPY_SRC: 4,
  COPY_DST: 8,
  UNIFORM: 64,
  STORAGE: 128
};
var TEXTURE_USAGE = {
  COPY_SRC: 1,
  COPY_DST: 2,
  TEXTURE_BINDING: 4,
  STORAGE_BINDING: 8,
  RENDER_ATTACHMENT: 16
};
var SHADER_STAGE = {
  VERTEX: 1,
  FRAGMENT: 2,
  COMPUTE: 4
};

// src/gpu/index.ts
function supported() {
  try {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  } catch {
    return false;
  }
}
function navigatorGpu() {
  if (!supported()) return null;
  return navigator.gpu;
}
async function init(options = {}) {
  const api = navigatorGpu();
  if (!api) return null;
  try {
    const adapter = await api.requestAdapter(
      options.powerPreference ? { powerPreference: options.powerPreference } : void 0
    );
    if (!adapter) return null;
    const features = (options.features ?? []).filter((name) => adapter.features.has(name));
    const device = await adapter.requestDevice({
      label: options.label ?? "voodoo",
      requiredFeatures: features,
      requiredLimits: options.limits
    });
    const format = api.getPreferredCanvasFormat?.() ?? "bgra8unorm";
    const gpu2 = {
      adapter,
      device,
      queue: device.queue,
      format,
      resources: /* @__PURE__ */ new Set(),
      destroyed: false
    };
    device.lost?.then((info) => {
      gpu2.destroyed = true;
      warn(`WebGPU device was lost (${info.reason}): ${info.message}`);
    }).catch(() => void 0);
    return gpu2;
  } catch (err) {
    warn(`WebGPU available but device failed to open: ${String(err)}`);
    return null;
  }
}
function live(gpu2) {
  return !!gpu2 && !gpu2.destroyed;
}
function track(gpu2, resource) {
  gpu2.resources.add(resource);
}
function untrack(gpu2, resource) {
  gpu2?.resources.delete(resource);
}
var sharedContext = null;
function shared(options) {
  if (!sharedContext) sharedContext = init(options);
  return sharedContext;
}
function resetShared() {
  sharedContext = null;
}
var NO_SURFACE = {
  canvas: null,
  format: "",
  width: 0,
  height: 0,
  view: () => null,
  resize: () => void 0,
  destroy: () => void 0
};
function surface(gpu2, canvas, options = {}) {
  if (!live(gpu2) || !canvas) return NO_SURFACE;
  const context = canvas.getContext("webgpu");
  if (!context) return NO_SURFACE;
  const [minDpr, maxDpr] = options.dpr ?? [1, 2];
  const format = options.format ?? gpu2.format;
  const alphaMode = options.alpha ? "premultiplied" : "opaque";
  const maxSize = gpu2.device.limits.maxTextureDimension2D || 4096;
  let width = 0;
  let height = 0;
  let observer = null;
  let alive = true;
  context.configure({ device: gpu2.device, format, alphaMode });
  const resize = () => {
    if (!alive) return;
    const ratio = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    const dpr = Math.min(Math.max(ratio, minDpr), maxDpr);
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || canvas.clientWidth || canvas.width || 300;
    const cssHeight = rect.height || canvas.clientHeight || canvas.height || 150;
    const next = {
      w: Math.max(1, Math.min(maxSize, Math.round(cssWidth * dpr))),
      h: Math.max(1, Math.min(maxSize, Math.round(cssHeight * dpr)))
    };
    if (next.w === width && next.h === height) return;
    width = next.w;
    height = next.h;
    canvas.width = width;
    canvas.height = height;
    context.configure({ device: gpu2.device, format, alphaMode });
  };
  resize();
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => resize());
    observer.observe(canvas);
  }
  const handle = {
    canvas,
    format,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    view() {
      if (!alive || !live(gpu2)) return null;
      try {
        return context.getCurrentTexture().createView();
      } catch (err) {
        handleError(err, "V.gpu.surface");
        return null;
      }
    },
    resize,
    destroy() {
      if (!alive) return;
      alive = false;
      observer?.disconnect();
      observer = null;
      try {
        context.unconfigure();
      } catch {
      }
      untrack(gpu2, handle);
    }
  };
  track(gpu2, handle);
  return handle;
}
var NO_TARGET = {
  texture: null,
  width: 0,
  height: 0,
  format: "",
  view: () => null,
  destroy: () => void 0
};
function target(gpu2, options) {
  if (!live(gpu2)) return NO_TARGET;
  const format = options.format ?? gpu2.format;
  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height));
  let texture = null;
  let view = null;
  try {
    texture = gpu2.device.createTexture({
      label: options.label ?? "voodoo-target",
      size: { width, height },
      format,
      usage: TEXTURE_USAGE.RENDER_ATTACHMENT | TEXTURE_USAGE.TEXTURE_BINDING | TEXTURE_USAGE.COPY_SRC
    });
    view = texture.createView();
  } catch (err) {
    handleError(err, "V.gpu.target");
    return NO_TARGET;
  }
  const handle = {
    texture,
    width,
    height,
    format,
    view: () => view,
    destroy() {
      if (!texture) return;
      texture.destroy();
      texture = null;
      view = null;
      untrack(gpu2, handle);
    }
  };
  track(gpu2, handle);
  return handle;
}
var EMPTY_STRUCT = { name: "Uniforms", fields: [], size: 0, align: 16 };
function noUniforms(struct = EMPTY_STRUCT) {
  return {
    struct,
    buffer: null,
    values: {},
    set: () => void 0,
    destroy: () => void 0
  };
}
function uniformsFromStruct(gpu2, struct, initial = {}, label = "voodoo-uniforms") {
  if (!live(gpu2) || struct.fields.length === 0) return noUniforms(struct);
  const bytes = packStruct(struct, initial);
  const values = { ...initial };
  let buffer = null;
  try {
    buffer = gpu2.device.createBuffer({
      label,
      size: bytes.byteLength,
      usage: BUFFER_USAGE.UNIFORM | BUFFER_USAGE.COPY_DST
    });
    gpu2.queue.writeBuffer(buffer, 0, bytes);
  } catch (err) {
    handleError(err, "V.gpu.uniforms");
    return noUniforms(struct);
  }
  const handle = {
    struct,
    get buffer() {
      return buffer;
    },
    values,
    set(next) {
      if (!buffer || !live(gpu2) || !next) return;
      const written = writeStruct(bytes, struct, next);
      if (written.length === 0) return;
      for (const name of written) values[name] = next[name];
      gpu2.queue.writeBuffer(buffer, 0, bytes);
    },
    destroy() {
      if (!buffer) return;
      buffer.destroy();
      buffer = null;
      untrack(gpu2, handle);
    }
  };
  track(gpu2, handle);
  return handle;
}
function uniforms(gpu2, initial = {}) {
  return uniformsFromStruct(gpu2, inferStruct(initial), initial);
}
function clock(_gpu) {
  let start = -1;
  let previous = -1;
  let time = 0;
  let delta = 0;
  let frame2 = 0;
  return {
    get time() {
      return time;
    },
    get delta() {
      return delta;
    },
    get frame() {
      return frame2;
    },
    tick(now) {
      const stamp = now ?? (typeof performance !== "undefined" ? performance.now() : Date.now());
      if (start < 0) {
        start = stamp;
        previous = stamp;
      }
      time = (stamp - start) / 1e3;
      delta = Math.min(0.25, Math.max(0, (stamp - previous) / 1e3));
      previous = stamp;
      frame2 += 1;
    },
    reset() {
      start = -1;
      previous = -1;
      time = 0;
      delta = 0;
      frame2 = 0;
    }
  };
}
var FULLSCREEN_VERTEX = `
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
function layoutEntries(bindings, visibility) {
  const entries = [];
  for (const binding of bindings) {
    if (binding.group !== 0) continue;
    const base = { binding: binding.binding, visibility };
    if (binding.kind === "uniform") {
      entries.push({ ...base, buffer: { type: "uniform" } });
    } else if (binding.kind === "storage") {
      entries.push({
        ...base,
        buffer: { type: binding.access === "read" ? "read-only-storage" : "storage" }
      });
    } else if (binding.kind === "sampler") {
      entries.push({ ...base, sampler: { type: binding.comparison ? "comparison" : "filtering" } });
    } else if (binding.kind === "texture") {
      entries.push({
        ...base,
        texture: {
          sampleType: binding.sampleType ?? "float",
          viewDimension: binding.viewDimension ?? "2d",
          multisampled: !!binding.multisampled
        }
      });
    } else if (binding.kind === "storage-texture") {
      entries.push({
        ...base,
        storageTexture: {
          access: binding.access === "read-write" ? "read-write" : "write-only",
          format: "rgba8unorm",
          viewDimension: binding.viewDimension ?? "2d"
        }
      });
    }
  }
  return entries;
}
function bindFromReflection(gpu2, reflection, visibility, initial, textures, label) {
  const bindings = reflection.bindings.filter((b) => b.group === 0);
  const uniformBinding = reflection.uniform;
  const uniformValues = uniformBinding?.struct ? uniformsFromStruct(gpu2, uniformBinding.struct, initial, `${label}-uniforms`) : noUniforms();
  if (bindings.length === 0) {
    return { layout: null, group: null, uniforms: uniformValues, sampler: null, fromReflection: false };
  }
  let layout = null;
  try {
    layout = gpu2.device.createBindGroupLayout({
      label: `${label}-layout`,
      entries: layoutEntries(bindings, visibility)
    });
  } catch (err) {
    warn(`shader reflection for "${label}" failed to build bind group layout: ${String(err)}`);
    return { layout: null, group: null, uniforms: uniformValues, sampler: null, fromReflection: false };
  }
  let sampler = null;
  const resources = [];
  for (const binding of bindings) {
    if (binding.kind === "uniform" && uniformValues.buffer) {
      resources.push({ binding: binding.binding, resource: { buffer: uniformValues.buffer } });
      continue;
    }
    if (binding.kind === "sampler") {
      sampler ?? (sampler = gpu2.device.createSampler({
        label: `${label}-sampler`,
        magFilter: "linear",
        minFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge"
      }));
      resources.push({ binding: binding.binding, resource: sampler });
      continue;
    }
    const view = textures[binding.name];
    if (view) {
      resources.push({ binding: binding.binding, resource: view });
      continue;
    }
    return { layout, group: null, uniforms: uniformValues, sampler, fromReflection: false };
  }
  try {
    const group = gpu2.device.createBindGroup({
      label: `${label}-group`,
      layout,
      entries: resources
    });
    return { layout, group, uniforms: uniformValues, sampler, fromReflection: true };
  } catch (err) {
    warn(`shader reflection for "${label}" failed to build bind group: ${String(err)}`);
    return { layout, group: null, uniforms: uniformValues, sampler, fromReflection: false };
  }
}
function reportCompilation(module, label, source) {
  if (typeof module.getCompilationInfo !== "function") return;
  const lines = source.split("\n");
  module.getCompilationInfo().then((info) => {
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length === 0) return;
    const detail = errors.map((m) => `  line ${m.lineNum}: ${m.message}
  > ${(lines[m.lineNum - 1] ?? "").trim()}`).join("\n");
    handleError(new Error(`shader "${label}" did not compile:
${detail}`), "V.gpu shader");
  }).catch(() => void 0);
}
function noEffect(reflection) {
  return {
    reflection,
    ok: false,
    uniforms: noUniforms(),
    set: () => void 0,
    draw: () => void 0,
    destroy: () => void 0
  };
}
function effect(gpu2, wgsl, options = {}) {
  const reflection = reflectWgsl(wgsl);
  if (!live(gpu2) || !wgsl) return noEffect(reflection);
  const label = options.label ?? "voodoo-effect";
  const hasVertex = !!findEntry(reflection, "vertex");
  const source = hasVertex ? wgsl : `${FULLSCREEN_VERTEX}
${wgsl}`;
  const vertexEntry = hasVertex ? findEntry(reflection, "vertex").name : "voodooFullscreen";
  const fragmentEntry = options.entry ?? findEntry(reflection, "fragment")?.name;
  if (!fragmentEntry) {
    warn(`shader "${label}" does not declare a @fragment function.`);
    return noEffect(reflection);
  }
  let module;
  try {
    module = gpu2.device.createShaderModule({ label, code: source });
  } catch (err) {
    handleError(err, "V.gpu.effect");
    return noEffect(reflection);
  }
  reportCompilation(module, label, source);
  const bound = bindFromReflection(
    gpu2,
    reflection,
    SHADER_STAGE.VERTEX | SHADER_STAGE.FRAGMENT,
    options.set ?? {},
    options.textures ?? {},
    label
  );
  const descriptor = {
    label,
    layout: "auto",
    vertex: { module, entryPoint: vertexEntry },
    fragment: {
      module,
      entryPoint: fragmentEntry,
      targets: [{ format: options.format ?? gpu2.format }]
    },
    primitive: { topology: "triangle-list" }
  };
  let pipeline = null;
  try {
    if (bound.fromReflection && bound.layout) {
      descriptor.layout = gpu2.device.createPipelineLayout({
        label: `${label}-pipeline-layout`,
        bindGroupLayouts: [bound.layout]
      });
    }
    pipeline = gpu2.device.createRenderPipeline(descriptor);
  } catch (err) {
    try {
      descriptor.layout = "auto";
      pipeline = gpu2.device.createRenderPipeline(descriptor);
    } catch {
      handleError(err, "V.gpu.effect");
      bound.uniforms.destroy();
      return noEffect(reflection);
    }
  }
  let alive = true;
  const handle = {
    reflection,
    ok: true,
    uniforms: bound.uniforms,
    set(values) {
      bound.uniforms.set(values);
    },
    draw(pass) {
      if (!alive || !pipeline) return;
      pass.setPipeline(pipeline);
      if (bound.group) pass.setBindGroup(0, bound.group);
      pass.draw(3);
    },
    destroy() {
      if (!alive) return;
      alive = false;
      pipeline = null;
      bound.uniforms.destroy();
      untrack(gpu2, handle);
    }
  };
  track(gpu2, handle);
  return handle;
}
function noCompute(reflection) {
  return {
    reflection,
    ok: false,
    uniforms: noUniforms(),
    set: () => void 0,
    dispatch: () => void 0,
    destroy: () => void 0
  };
}
function compute(gpu2, wgsl, options = {}) {
  const reflection = reflectWgsl(wgsl);
  if (!live(gpu2) || !wgsl) return noCompute(reflection);
  const label = options.label ?? "voodoo-compute";
  const entry = options.entry ?? findEntry(reflection, "compute")?.name;
  if (!entry) {
    warn(`shader "${label}" does not declare a @compute function.`);
    return noCompute(reflection);
  }
  let module;
  try {
    module = gpu2.device.createShaderModule({ label, code: wgsl });
  } catch (err) {
    handleError(err, "V.gpu.compute");
    return noCompute(reflection);
  }
  reportCompilation(module, label, wgsl);
  const bound = bindFromReflection(
    gpu2,
    reflection,
    SHADER_STAGE.COMPUTE,
    options.set ?? {},
    options.textures ?? {},
    label
  );
  const descriptor = {
    label,
    layout: "auto",
    compute: { module, entryPoint: entry }
  };
  let pipeline = null;
  try {
    if (bound.fromReflection && bound.layout) {
      descriptor.layout = gpu2.device.createPipelineLayout({
        label: `${label}-pipeline-layout`,
        bindGroupLayouts: [bound.layout]
      });
    }
    pipeline = gpu2.device.createComputePipeline(descriptor);
  } catch (err) {
    try {
      descriptor.layout = "auto";
      pipeline = gpu2.device.createComputePipeline(descriptor);
    } catch {
      handleError(err, "V.gpu.compute");
      bound.uniforms.destroy();
      return noCompute(reflection);
    }
  }
  const default_ = options.workgroups ?? [1, 1, 1];
  let alive = true;
  const handle = {
    reflection,
    ok: true,
    uniforms: bound.uniforms,
    set(values) {
      bound.uniforms.set(values);
    },
    dispatch(pass, workgroups) {
      if (!alive || !pipeline) return;
      const [x, y, z] = workgroups ?? default_;
      pass.setPipeline(pipeline);
      if (bound.group) pass.setBindGroup(0, bound.group);
      pass.dispatchWorkgroups(Math.max(1, x), y ?? 1, z ?? 1);
    },
    destroy() {
      if (!alive) return;
      alive = false;
      pipeline = null;
      bound.uniforms.destroy();
      untrack(gpu2, handle);
    }
  };
  track(gpu2, handle);
  return handle;
}
var EMPTY_CLOCK = clock();
function noFrame() {
  return {
    encoder: null,
    clock: EMPTY_CLOCK,
    clear: [0, 0, 0, 0],
    pass: () => void 0,
    compute: () => void 0
  };
}
function buildFrame(gpu2, encoder, relogio) {
  const frameObj = {
    encoder,
    clock: relogio,
    clear: [0, 0, 0, 0],
    pass(destino, ...operacoes) {
      const view = destino?.view() ?? null;
      if (!view) return;
      const [r, g, b, a] = frameObj.clear;
      let pass;
      try {
        pass = encoder.beginRenderPass({
          colorAttachments: [{ view, clearValue: { r, g, b, a }, loadOp: "clear", storeOp: "store" }]
        });
      } catch (err) {
        handleError(err, "V.gpu.frame");
        return;
      }
      for (const operacao of operacoes) operacao?.draw(pass);
      pass.end();
    },
    compute(...operacoes) {
      if (operacoes.length === 0) return;
      let pass;
      try {
        pass = encoder.beginComputePass();
      } catch (err) {
        handleError(err, "V.gpu.frame");
        return;
      }
      for (const operacao of operacoes) operacao?.dispatch(pass);
      pass.end();
    }
  };
  return frameObj;
}
function frame(gpu2, build, relogio = EMPTY_CLOCK) {
  if (!live(gpu2)) {
    build(noFrame());
    return;
  }
  try {
    const encoder = gpu2.device.createCommandEncoder({ label: "voodoo-frame" });
    build(buildFrame(gpu2, encoder, relogio));
    gpu2.queue.submit([encoder.finish()]);
  } catch (err) {
    handleError(err, "V.gpu.frame");
  }
}
function frameLoop(gpu2, build) {
  if (!live(gpu2) || typeof requestAnimationFrame !== "function") return () => void 0;
  const relogio = clock();
  let handle = 0;
  let running = true;
  const step = (now) => {
    handle = 0;
    if (!running || !live(gpu2)) return;
    relogio.tick(now);
    frame(gpu2, build, relogio);
    if (running) handle = requestAnimationFrame(step);
  };
  handle = requestAnimationFrame(step);
  return () => {
    if (!running) return;
    running = false;
    if (handle) cancelAnimationFrame(handle);
    handle = 0;
  };
}
function destroy(gpu2) {
  if (!gpu2 || gpu2.destroyed) return;
  gpu2.destroyed = true;
  for (const resource of [...gpu2.resources]) {
    try {
      resource.destroy();
    } catch (err) {
      handleError(err, "V.gpu.destroy");
    }
  }
  gpu2.resources.clear();
  try {
    gpu2.device.destroy();
  } catch {
  }
  sharedContext?.then((current) => {
    if (current === gpu2) resetShared();
  });
}
var gpu = {
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
  reflect: reflectWgsl
};

export { clock, compute, describeWgslType, destroy, effect, findEntry, flattenValue, frame, frameLoop, gpu, inferStruct, init, packStruct, reflectBindings, reflectEntries, reflectStructs, reflectWgsl, resetShared, shared, splitTopLevel, stripWgslComments, supported, surface, target, uniforms, writeField, writeStruct };
//# sourceMappingURL=chunk-JB72AX7G.js.map
//# sourceMappingURL=chunk-JB72AX7G.js.map