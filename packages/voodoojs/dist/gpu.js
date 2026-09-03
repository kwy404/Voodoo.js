import { supported, clock, shared, gpu, surface, effect, frameLoop, frame } from './chunk-JZIYRIY6.js';
export { clock, compute, describeWgslType, destroy, effect, findEntry, flattenValue, frame, frameLoop, gpu, inferStruct, init, packStruct, reflectBindings, reflectEntries, reflectStructs, reflectWgsl, resetShared, shared, splitTopLevel, stripWgslComments, supported, surface, target, uniforms, writeField, writeStruct } from './chunk-JZIYRIY6.js';
import { http } from './chunk-PQZEVFVZ.js';
import { originalAttributes, destroy } from './chunk-PHMBDPWH.js';
import { handleError } from './chunk-NNU6WOOU.js';
import { warn, describeElement } from './chunk-A2UOVQBP.js';
import './chunk-234ZLC6W.js';
import { defineDirective } from './chunk-5777LJVW.js';
import './chunk-E27NRARW.js';

/**
 * Voodoo.js v0.4.6
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/directives/gpu.ts
function classifyShaderSource(text) {
  const value = text.trim();
  if (!value) return "empty";
  if (value.startsWith("#")) return "selector";
  if (/@(?:vertex|fragment|compute)\b/.test(value)) return "inline";
  if (/\bfn\s+[A-Za-z_]/.test(value)) return "inline";
  if (value.includes("{") || value.includes("\n")) return "inline";
  return "url";
}
async function resolveShaderSource(text) {
  const value = text.trim();
  const kind = classifyShaderSource(value);
  if (kind === "empty") return "";
  if (kind === "inline") return value;
  if (kind === "selector") {
    if (typeof document === "undefined") return "";
    let target3 = null;
    try {
      target3 = document.querySelector(value);
    } catch {
      target3 = null;
    }
    if (!target3) {
      warn(`v-shader did not find the element "${value}" with the shader source.`);
      return "";
    }
    return target3.textContent ?? "";
  }
  try {
    const response = await http.get(value, { responseType: "text" });
    return typeof response === "string" ? response : "";
  } catch (err) {
    handleError(err, `v-shader when fetching "${value}"`);
    return "";
  }
}
function revealFallback(el, mount) {
  if (!el.firstChild || typeof document === "undefined") return () => void 0;
  const substitute = document.createElement("div");
  substitute.setAttribute("data-gpu-fallback", "");
  while (el.firstChild) substitute.appendChild(el.firstChild);
  el.parentNode?.insertBefore(substitute, el.nextSibling);
  const previousDisplay = el.style.display;
  el.style.display = "none";
  mount(substitute);
  return () => {
    destroy(substitute);
    while (substitute.firstChild) el.appendChild(substitute.firstChild);
    substitute.remove();
    if (previousDisplay) el.style.display = previousDisplay;
    else el.style.removeProperty("display");
  };
}
function noSupport(el, reason, mount) {
  el.setAttribute("data-gpu", "unsupported");
  el.dispatchEvent(
    new CustomEvent("voodoo:gpu-unsupported", { bubbles: true, detail: { reason, el } })
  );
  warn(
    `v-shader at ${describeElement(el)} did not run: ${reason}. The content inside the <canvas> was used as a fallback. Listen to voodoo:gpu-unsupported to offer something else.`
  );
  return revealFallback(el, mount);
}
function expressionOfSet(el) {
  const attributes = originalAttributes(el);
  for (const name of [":set", "v-bind:set", "data-v-bind:set"]) {
    const value = attributes.get(name);
    if (value) return value;
  }
  const own = el.getAttribute("v-shader-set") ?? el.getAttribute("data-v-shader-set");
  return own || null;
}
function dprRange(el) {
  const raw = el.getAttribute("v-shader-dpr") ?? el.getAttribute("data-v-shader-dpr");
  if (!raw) return [1, 2];
  const parts = raw.split(",").map((n) => parseFloat(n.trim()));
  const min = Number.isFinite(parts[0]) ? parts[0] : 1;
  const max = Number.isFinite(parts[1]) ? parts[1] : Math.max(min, 2);
  return [Math.max(0.5, min), Math.max(min, max)];
}
var AUTOMATIC_UNIFORMS = ["time", "delta", "frame", "resolution"];
defineDirective("shader", (ctx) => {
  const { el, expression, modifiers, evaluate, effect: effect2, cleanup, scope, walk } = ctx;
  const mountOn = (node) => walk(node, scope);
  if (typeof HTMLCanvasElement === "undefined" || !(el instanceof HTMLCanvasElement)) {
    warn(
      `v-shader needs a <canvas>, but was used on ${describeElement(el)}. Change the tag to <canvas> so the shader has somewhere to draw.`
    );
    return;
  }
  const canvas = el;
  let canceled = false;
  cleanup(() => {
    canceled = true;
    canvas.removeAttribute("data-gpu");
  });
  if (!supported()) {
    const restore = noSupport(canvas, "this browser does not have WebGPU", mountOn);
    cleanup(restore);
    return;
  }
  const setExpr = expressionOfSet(canvas);
  let values = {};
  let apply = null;
  if (setExpr) {
    effect2(() => {
      const read = evaluate(setExpr);
      values = read && typeof read === "object" ? read : {};
      apply?.(values);
    });
  }
  const pausedExpr = canvas.getAttribute("v-shader-paused") ?? canvas.getAttribute("data-v-shader-paused");
  let paused = !!modifiers.paused;
  let visible = !modifiers.visible;
  let surface_obj = null;
  let effect_obj = null;
  let stopLoop = null;
  let singleFrame = 0;
  let observer_obj = null;
  let restoreFallback = null;
  let automaticList = [];
  const clock_obj = clock();
  cleanup(() => {
    stopLoop?.();
    stopLoop = null;
    observer_obj?.disconnect();
    observer_obj = null;
    if (singleFrame) cancelAnimationFrame(singleFrame);
    singleFrame = 0;
    effect_obj?.destroy();
    effect_obj = null;
    surface_obj?.destroy();
    surface_obj = null;
    apply = null;
    restoreFallback?.();
    restoreFallback = null;
  });
  const feedClock = () => {
    if (!effect_obj || automaticList.length === 0) return;
    const package_data = {
      time: clock_obj.time,
      delta: clock_obj.delta,
      frame: clock_obj.frame,
      resolution: [surface_obj?.width ?? 0, surface_obj?.height ?? 0]
    };
    const uniforms2 = {};
    for (const name of automaticList) uniforms2[name] = package_data[name];
    effect_obj.set(uniforms2);
  };
  const draw = (gpu2) => {
    feedClock();
    frame(gpu2, (frame2) => frame2.pass(surface_obj, effect_obj));
  };
  const isRunning = () => !!stopLoop;
  const syncLoop = (gpu2) => {
    if (canceled || !effect_obj) return;
    const shouldRun = !paused && visible && !modifiers.once;
    if (shouldRun && !isRunning()) {
      stopLoop = frameLoop(gpu2, (frame2) => {
        clock_obj.tick();
        feedClock();
        frame2.pass(surface_obj, effect_obj);
      });
      canvas.setAttribute("data-gpu", "ready");
      return;
    }
    if (!shouldRun && isRunning()) {
      stopLoop?.();
      stopLoop = null;
      canvas.setAttribute("data-gpu", "paused");
    }
  };
  const mount = (gpu2, source) => {
    surface_obj = surface(gpu2, canvas, { dpr: dprRange(canvas), alpha: true });
    effect_obj = effect(gpu2, source, {
      set: values,
      format: surface_obj.format || void 0,
      label: `v-shader ${describeElement(canvas)}`
    });
    if (!effect_obj.ok) {
      canvas.setAttribute("data-gpu", "error");
      effect_obj.destroy();
      effect_obj = null;
      surface_obj.destroy();
      surface_obj = null;
      return;
    }
    apply = (v) => effect_obj?.set(v);
    const fields = effect_obj.reflection.uniform?.struct?.fields ?? [];
    automaticList = AUTOMATIC_UNIFORMS.filter((name) => fields.some((f) => f.name === name));
    if (pausedExpr) {
      effect2(() => {
        paused = !!evaluate(pausedExpr);
        syncLoop(gpu2);
      });
    }
    if (modifiers.visible && typeof IntersectionObserver !== "undefined") {
      observer_obj = new IntersectionObserver((entries) => {
        for (const entry of entries) visible = entry.isIntersecting;
        syncLoop(gpu2);
      });
      observer_obj.observe(canvas);
    } else {
      visible = true;
    }
    if (modifiers.once) {
      singleFrame = requestAnimationFrame(() => {
        singleFrame = 0;
        if (canceled) return;
        clock_obj.tick();
        draw(gpu2);
        canvas.setAttribute("data-gpu", "ready");
      });
      return;
    }
    canvas.setAttribute("data-gpu", "ready");
    syncLoop(gpu2);
  };
  canvas.setAttribute("data-gpu", "loading");
  void (async () => {
    const source = await resolveShaderSource(expression);
    if (canceled) return;
    if (!source) {
      canvas.setAttribute("data-gpu", "error");
      restoreFallback = revealFallback(canvas, mountOn);
      return;
    }
    const gpu2 = await shared();
    if (canceled) return;
    if (!gpu2) {
      restoreFallback = noSupport(canvas, "the WebGPU adapter did not open", mountOn);
      return;
    }
    try {
      mount(gpu2, source);
    } catch (err) {
      canvas.setAttribute("data-gpu", "error");
      handleError(err, `v-shader at ${describeElement(canvas)}`);
    }
  })();
});

// src/gpu/plugin.ts
var voodooGpu = {
  name: "gpu",
  install(V) {
    if (!V.gpu) V.gpu = gpu;
  }
};
var target2 = globalThis.V;
if (target2 && typeof target2 === "object" && !target2.gpu) target2.gpu = gpu;
var plugin_default = voodooGpu;

export { classifyShaderSource, plugin_default as default, resolveShaderSource, voodooGpu };
//# sourceMappingURL=gpu.js.map
//# sourceMappingURL=gpu.js.map