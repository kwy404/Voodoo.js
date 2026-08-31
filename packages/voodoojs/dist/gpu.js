import { supported, clock, shared, gpu, surface, effect, frameLoop, frame } from './chunk-TJZGGM5X.js';
export { clock, compute, describeWgslType, destroy, effect, findEntry, flattenValue, frame, frameLoop, gpu, inferStruct, init, packStruct, reflectBindings, reflectEntries, reflectStructs, reflectWgsl, resetShared, shared, splitTopLevel, stripWgslComments, supported, surface, target, uniforms, writeField, writeStruct } from './chunk-TJZGGM5X.js';
import { http } from './chunk-YGYL43X7.js';
import { originalAttributes, destroy } from './chunk-2RPELI6L.js';
import { handleError } from './chunk-QJCR6UKZ.js';
import { avisar, descreverElemento } from './chunk-S3U6BJNJ.js';
import './chunk-KCG2YK55.js';
import { defineDirective } from './chunk-ZVXMGOYP.js';
import './chunk-5I3A7PYT.js';

/**
 * Voodoo.js v0.3.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/directives/gpu.ts
function classifyShaderSource(text) {
  const valor = text.trim();
  if (!valor) return "empty";
  if (valor.startsWith("#")) return "selector";
  if (/@(?:vertex|fragment|compute)\b/.test(valor)) return "inline";
  if (/\bfn\s+[A-Za-z_]/.test(valor)) return "inline";
  if (valor.includes("{") || valor.includes("\n")) return "inline";
  return "url";
}
async function resolveShaderSource(text) {
  const valor = text.trim();
  const kind = classifyShaderSource(valor);
  if (kind === "empty") return "";
  if (kind === "inline") return valor;
  if (kind === "selector") {
    if (typeof document === "undefined") return "";
    let alvo2 = null;
    try {
      alvo2 = document.querySelector(valor);
    } catch {
      alvo2 = null;
    }
    if (!alvo2) {
      avisar(`v-shader nao encontrou o elemento "${valor}" com a fonte do shader.`);
      return "";
    }
    return alvo2.textContent ?? "";
  }
  try {
    const resposta = await http.get(valor, { responseType: "text" });
    return typeof resposta === "string" ? resposta : "";
  } catch (err) {
    handleError(err, `v-shader ao buscar "${valor}"`);
    return "";
  }
}
function revelarFallback(el, montar) {
  if (!el.firstChild || typeof document === "undefined") return () => void 0;
  const substituto = document.createElement("div");
  substituto.setAttribute("data-gpu-fallback", "");
  while (el.firstChild) substituto.appendChild(el.firstChild);
  el.parentNode?.insertBefore(substituto, el.nextSibling);
  const displayAnterior = el.style.display;
  el.style.display = "none";
  montar(substituto);
  return () => {
    destroy(substituto);
    while (substituto.firstChild) el.appendChild(substituto.firstChild);
    substituto.remove();
    if (displayAnterior) el.style.display = displayAnterior;
    else el.style.removeProperty("display");
  };
}
function semSuporte(el, motivo, montar) {
  el.setAttribute("data-gpu", "unsupported");
  el.dispatchEvent(
    new CustomEvent("voodoo:gpu-unsupported", { bubbles: true, detail: { motivo, el } })
  );
  avisar(
    `v-shader em ${descreverElemento(el)} nao rodou: ${motivo}. O conteudo dentro do <canvas> foi usado como alternativa. Escute voodoo:gpu-unsupported para oferecer outra coisa.`
  );
  return revelarFallback(el, montar);
}
function expressaoDeSet(el) {
  const atributos = originalAttributes(el);
  for (const nome of [":set", "v-bind:set", "data-v-bind:set"]) {
    const valor = atributos.get(nome);
    if (valor) return valor;
  }
  const proprio = el.getAttribute("v-shader-set") ?? el.getAttribute("data-v-shader-set");
  return proprio || null;
}
function faixaDpr(el) {
  const bruto = el.getAttribute("v-shader-dpr") ?? el.getAttribute("data-v-shader-dpr");
  if (!bruto) return [1, 2];
  const partes = bruto.split(",").map((n) => parseFloat(n.trim()));
  const min = Number.isFinite(partes[0]) ? partes[0] : 1;
  const max = Number.isFinite(partes[1]) ? partes[1] : Math.max(min, 2);
  return [Math.max(0.5, min), Math.max(min, max)];
}
var UNIFORMS_AUTOMATICOS = ["time", "delta", "frame", "resolution"];
defineDirective("shader", (ctx) => {
  const { el, expression, modifiers, evaluate, effect: effect2, cleanup, scope, walk } = ctx;
  const montarNo = (no) => walk(no, scope);
  if (typeof HTMLCanvasElement === "undefined" || !(el instanceof HTMLCanvasElement)) {
    avisar(
      `v-shader precisa de um <canvas>, mas foi usado em ${descreverElemento(el)}. Troque a tag por <canvas> para o shader ter onde desenhar.`
    );
    return;
  }
  const canvas = el;
  let cancelado = false;
  cleanup(() => {
    cancelado = true;
    canvas.removeAttribute("data-gpu");
  });
  if (!supported()) {
    const restaurar = semSuporte(canvas, "este navegador nao tem WebGPU", montarNo);
    cleanup(restaurar);
    return;
  }
  const setExpr = expressaoDeSet(canvas);
  let valores = {};
  let aplicar = null;
  if (setExpr) {
    effect2(() => {
      const lido = evaluate(setExpr);
      valores = lido && typeof lido === "object" ? lido : {};
      aplicar?.(valores);
    });
  }
  const pausedExpr = canvas.getAttribute("v-shader-paused") ?? canvas.getAttribute("data-v-shader-paused");
  let pausado = !!modifiers.paused;
  let visivel = !modifiers.visible;
  let tela = null;
  let efeito = null;
  let pararLaco = null;
  let quadroUnico = 0;
  let observador = null;
  let restaurarFallback = null;
  let automaticos = [];
  const relogio = clock();
  cleanup(() => {
    pararLaco?.();
    pararLaco = null;
    observador?.disconnect();
    observador = null;
    if (quadroUnico) cancelAnimationFrame(quadroUnico);
    quadroUnico = 0;
    efeito?.destroy();
    efeito = null;
    tela?.destroy();
    tela = null;
    aplicar = null;
    restaurarFallback?.();
    restaurarFallback = null;
  });
  const alimentarRelogio = () => {
    if (!efeito || automaticos.length === 0) return;
    const pacote = {
      time: relogio.time,
      delta: relogio.delta,
      frame: relogio.frame,
      resolution: [tela?.width ?? 0, tela?.height ?? 0]
    };
    const so = {};
    for (const nome of automaticos) so[nome] = pacote[nome];
    efeito.set(so);
  };
  const desenhar = (gpu2) => {
    alimentarRelogio();
    frame(gpu2, (quadro) => quadro.pass(tela, efeito));
  };
  const rodando = () => !!pararLaco;
  const sincronizarLaco = (gpu2) => {
    if (cancelado || !efeito) return;
    const deveRodar = !pausado && visivel && !modifiers.once;
    if (deveRodar && !rodando()) {
      pararLaco = frameLoop(gpu2, (quadro) => {
        relogio.tick();
        alimentarRelogio();
        quadro.pass(tela, efeito);
      });
      canvas.setAttribute("data-gpu", "ready");
      return;
    }
    if (!deveRodar && rodando()) {
      pararLaco?.();
      pararLaco = null;
      canvas.setAttribute("data-gpu", "paused");
    }
  };
  const montar = (gpu2, fonte) => {
    tela = surface(gpu2, canvas, { dpr: faixaDpr(canvas), alpha: true });
    efeito = effect(gpu2, fonte, {
      set: valores,
      format: tela.format || void 0,
      label: `v-shader ${descreverElemento(canvas)}`
    });
    if (!efeito.ok) {
      canvas.setAttribute("data-gpu", "error");
      efeito.destroy();
      efeito = null;
      tela.destroy();
      tela = null;
      return;
    }
    aplicar = (v) => efeito?.set(v);
    const campos = efeito.reflection.uniform?.struct?.fields ?? [];
    automaticos = UNIFORMS_AUTOMATICOS.filter((nome) => campos.some((f) => f.name === nome));
    if (pausedExpr) {
      effect2(() => {
        pausado = !!evaluate(pausedExpr);
        sincronizarLaco(gpu2);
      });
    }
    if (modifiers.visible && typeof IntersectionObserver !== "undefined") {
      observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) visivel = entrada.isIntersecting;
        sincronizarLaco(gpu2);
      });
      observador.observe(canvas);
    } else {
      visivel = true;
    }
    if (modifiers.once) {
      quadroUnico = requestAnimationFrame(() => {
        quadroUnico = 0;
        if (cancelado) return;
        relogio.tick();
        desenhar(gpu2);
        canvas.setAttribute("data-gpu", "ready");
      });
      return;
    }
    canvas.setAttribute("data-gpu", "ready");
    sincronizarLaco(gpu2);
  };
  canvas.setAttribute("data-gpu", "loading");
  void (async () => {
    const fonte = await resolveShaderSource(expression);
    if (cancelado) return;
    if (!fonte) {
      canvas.setAttribute("data-gpu", "error");
      restaurarFallback = revelarFallback(canvas, montarNo);
      return;
    }
    const gpu2 = await shared();
    if (cancelado) return;
    if (!gpu2) {
      restaurarFallback = semSuporte(canvas, "o adaptador WebGPU nao abriu", montarNo);
      return;
    }
    try {
      montar(gpu2, fonte);
    } catch (err) {
      canvas.setAttribute("data-gpu", "error");
      handleError(err, `v-shader em ${descreverElemento(canvas)}`);
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
var alvo = globalThis.V;
if (alvo && typeof alvo === "object" && !alvo.gpu) alvo.gpu = gpu;
var plugin_default = voodooGpu;

export { classifyShaderSource, plugin_default as default, resolveShaderSource, voodooGpu };
//# sourceMappingURL=gpu.js.map
//# sourceMappingURL=gpu.js.map