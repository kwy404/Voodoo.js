/**
 * @module directives/gpu
 *
 * `v-shader`: a WebGPU shader running on a `<canvas>` without writing JavaScript.
 *
 * ```html
 * <canvas v-shader="waves.wgsl" :set="{ speed: velocity, tint: color }"></canvas>
 * <canvas v-shader="#my-shader" v-shader.visible></canvas>
 * <script type="x-shader/wgsl" id="my-shader"> ... </script>
 * ```
 *
 * The directive's commitment is the same as the `gpu` module: without WebGPU nothing breaks.
 * The canvas gets `data-gpu="unsupported"`, fires `voodoo:gpu-unsupported`, and the
 * content inside it appears in its place. No rAF is scheduled,
 * no observer stays open, and the console only gets a warning in dev mode.
 */

import { handleError } from '../reactivity';
import { warn, describeElement } from '../runtime/avisos';
import { defineDirective } from '../runtime/registry';
import { destroy as destruirNo, originalAttributes } from '../runtime/walker';
import { http } from '../http';
import {
  clock,
  effect as criarEffect,
  frame as gravarQuadro,
  frameLoop,
  shared,
  supported,
  surface,
  type GpuContext,
  type GpuEffect,
  type GpuSurface,
} from '../gpu';

// ---------------------------------------------------------------------------
// Shader source
// ---------------------------------------------------------------------------

/** Where the shader text comes from. */
export type ShaderSourceKind = 'inline' | 'selector' | 'url' | 'empty';

/**
 * Decides if the attribute value is WGSL written right there, an element
 * selector, or an address to fetch.
 *
 * The rule is by elimination: `#` only appears in selectors, and WGSL always has
 * a declaration or a key. What's left is an address, the most common case.
 */
export function classifyShaderSource(text: string): ShaderSourceKind {
  const valor = text.trim();
  if (!valor) return 'empty';
  if (valor.startsWith('#')) return 'selector';
  if (/@(?:vertex|fragment|compute)\b/.test(valor)) return 'inline';
  if (/\bfn\s+[A-Za-z_]/.test(valor)) return 'inline';
  if (valor.includes('{') || valor.includes('\n')) return 'inline';
  return 'url';
}

/**
 * Resolves the shader text.
 *
 * @returns the WGSL, or empty string when the source doesn't exist
 */
export async function resolveShaderSource(text: string): Promise<string> {
  const valor = text.trim();
  const kind = classifyShaderSource(valor);

  if (kind === 'empty') return '';
  if (kind === 'inline') return valor;

  if (kind === 'selector') {
    if (typeof document === 'undefined') return '';
    let target: Element | null = null;
    try {
      target = document.querySelector(valor);
    } catch {
      // Invalid selector. Treated as missing shader, without breaking the page.
      target = null;
    }
    if (!target) {
      warn(`v-shader did not find the element "${valor}" with the shader source.`);
      return '';
    }
    return target.textContent ?? '';
  }

  try {
    const response = await http.get<string>(valor, { responseType: 'text' });
    return typeof response === 'string' ? response : '';
  } catch (err) {
    handleError(err, `v-shader when fetching "${valor}"`);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Fallback without WebGPU
// ---------------------------------------------------------------------------

/**
 * Reveals the content that was inside the `<canvas>`.
 *
 * The browser only shows canvas children when it can't draw any canvas,
 * and that's not the case here: the canvas works, what's missing is WebGPU.
 * So the children are moved to a sibling and the canvas disappears.
 *
 * @returns function that restores the DOM to its original state
 */
function revealFallback(el: HTMLCanvasElement, mount: (node: Node) => void): () => void {
  if (!el.firstChild || typeof document === 'undefined') return () => undefined;

  const substitute = document.createElement('div');
  substitute.setAttribute('data-gpu-fallback', '');
  while (el.firstChild) substitute.appendChild(el.firstChild);
  el.parentNode?.insertBefore(substitute, el.nextSibling);

  const previousDisplay = el.style.display;
  el.style.display = 'none';

  // The revealed content is still Voodoo HTML: interpolation and
  // directives inside need to work as they would in the old place.
  mount(substitute);

  return (): void => {
    destruirNo(substitute);
    while (substitute.firstChild) el.appendChild(substitute.firstChild);
    substitute.remove();
    if (previousDisplay) el.style.display = previousDisplay;
    else el.style.removeProperty('display');
  };
}

/** Marks the canvas, warns the page, and reveals the fallback. */
function noSupport(
  el: HTMLCanvasElement,
  reason: string,
  mount: (node: Node) => void
): () => void {
  el.setAttribute('data-gpu', 'unsupported');
  el.dispatchEvent(
    new CustomEvent('voodoo:gpu-unsupported', { bubbles: true, detail: { reason, el } })
  );
  warn(
    `v-shader at ${describeElement(el)} did not run: ${reason}. ` +
      'The content inside the <canvas> was used as a fallback. ' +
      'Listen to voodoo:gpu-unsupported to offer something else.'
  );
  return revealFallback(el, mount);
}

// ---------------------------------------------------------------------------
// Reading auxiliary attributes
// ---------------------------------------------------------------------------

/** Looks for the `:set` expression, accepting the three equivalent spellings. */
function expressionOfSet(el: Element): string | null {
  const atributos = originalAttributes(el);
  for (const nome of [':set', 'v-bind:set', 'data-v-bind:set']) {
    const valor = atributos.get(nome);
    if (valor) return valor;
  }
  const proprio = el.getAttribute('v-shader-set') ?? el.getAttribute('data-v-shader-set');
  return proprio || null;
}

/** Reads `v-shader-dpr="1,2"`. */
function dprRange(el: Element): [number, number] {
  const raw = el.getAttribute('v-shader-dpr') ?? el.getAttribute('data-v-shader-dpr');
  if (!raw) return [1, 2];
  const parts = raw.split(',').map((n) => parseFloat(n.trim()));
  const min = Number.isFinite(parts[0]) ? parts[0] : 1;
  const max = Number.isFinite(parts[1]) ? parts[1] : Math.max(min, 2);
  return [Math.max(0.5, min), Math.max(min, max)];
}

// ---------------------------------------------------------------------------
// The directive
// ---------------------------------------------------------------------------

/** Uniforms that Voodoo feeds on its own, when the shader declares them. */
const AUTOMATIC_UNIFORMS = ['time', 'delta', 'frame', 'resolution'];

defineDirective('shader', (ctx) => {
  const { el, expression, modifiers, evaluate, effect, cleanup, scope, walk } = ctx;

  const mountOn = (node: Node): void => walk(node, scope);

  if (typeof HTMLCanvasElement === 'undefined' || !(el instanceof HTMLCanvasElement)) {
    warn(
      `v-shader needs a <canvas>, but was used on ${describeElement(el)}. ` +
        'Change the tag to <canvas> so the shader has somewhere to draw.'
    );
    return;
  }

  const canvas = el;
  let canceled = false;
  // Registered first, and therefore runs last: works for the GPU path,
  // for the fallback, and for the shader that didn't even compile.
  cleanup(() => {
    canceled = true;
    canvas.removeAttribute('data-gpu');
  });

  if (!supported()) {
    const restore = noSupport(canvas, 'this browser does not have WebGPU', mountOn);
    cleanup(restore);
    return;
  }

  // Values from `:set`. They stay saved before the pipeline exists,
  // so the first frame is born with the correct uniforms.
  const setExpr = expressionOfSet(canvas);
  let values: Record<string, unknown> = {};
  let apply: ((v: Record<string, unknown>) => void) | null = null;

  if (setExpr) {
    effect(() => {
      const read = evaluate<unknown>(setExpr);
      values = read && typeof read === 'object' ? (read as Record<string, unknown>) : {};
      // Changing a uniform doesn't recreate any pipeline: just rewrites the buffer.
      apply?.(values);
    });
  }

  // `.paused` starts paused; `v-shader-paused` lets state decide.
  const pausedExpr =
    canvas.getAttribute('v-shader-paused') ?? canvas.getAttribute('data-v-shader-paused');
  let paused = !!modifiers.paused;
  let visible = !modifiers.visible;

  let surface_obj: GpuSurface | null = null;
  let effect_obj: GpuEffect | null = null;
  let stopLoop: (() => void) | null = null;
  let singleFrame = 0;
  let observer_obj: IntersectionObserver | null = null;
  let restoreFallback: (() => void) | null = null;
  let automaticList: string[] = [];

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

  /** Delivers `time`, `delta`, `frame`, and `resolution` to requesting shaders. */
  const feedClock = (): void => {
    if (!effect_obj || automaticList.length === 0) return;
    const package_data: Record<string, unknown> = {
      time: clock_obj.time,
      delta: clock_obj.delta,
      frame: clock_obj.frame,
      resolution: [surface_obj?.width ?? 0, surface_obj?.height ?? 0],
    };
    const uniforms: Record<string, unknown> = {};
    for (const name of automaticList) uniforms[name] = package_data[name];
    effect_obj.set(uniforms);
  };

  const draw = (gpu: GpuContext): void => {
    feedClock();
    gravarQuadro(gpu, (frame) => frame.pass(surface_obj, effect_obj));
  };

  const isRunning = (): boolean => !!stopLoop;

  const syncLoop = (gpu: GpuContext): void => {
    if (canceled || !effect_obj) return;
    const shouldRun = !paused && visible && !modifiers.once;

    if (shouldRun && !isRunning()) {
      stopLoop = frameLoop(gpu, (frame) => {
        // The own clock doesn't reset when the loop pauses and resumes, so the
        // animation continues from where it paused instead of jumping.
        clock_obj.tick();
        feedClock();
        frame.pass(surface_obj, effect_obj);
      });
      canvas.setAttribute('data-gpu', 'ready');
      return;
    }

    if (!shouldRun && isRunning()) {
      stopLoop?.();
      stopLoop = null;
      canvas.setAttribute('data-gpu', 'paused');
    }
  };

  const mount = (gpu: GpuContext, source: string): void => {
    surface_obj = surface(gpu, canvas, { dpr: dprRange(canvas), alpha: true });
    effect_obj = criarEffect(gpu, source, {
      set: values,
      format: surface_obj.format || undefined,
      label: `v-shader ${describeElement(canvas)}`,
    });

    if (!effect_obj.ok) {
      canvas.setAttribute('data-gpu', 'error');
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
      effect(() => {
        paused = !!evaluate<unknown>(pausedExpr);
        syncLoop(gpu);
      });
    }

    if (modifiers.visible && typeof IntersectionObserver !== 'undefined') {
      observer_obj = new IntersectionObserver((entries) => {
        for (const entry of entries) visible = entry.isIntersecting;
        syncLoop(gpu);
      });
      observer_obj.observe(canvas);
    } else {
      visible = true;
    }

    if (modifiers.once) {
      // One frame only, after the first rAF, so the canvas has a size.
      singleFrame = requestAnimationFrame(() => {
        singleFrame = 0;
        if (canceled) return;
        clock_obj.tick();
        draw(gpu);
        canvas.setAttribute('data-gpu', 'ready');
      });
      return;
    }

    canvas.setAttribute('data-gpu', 'ready');
    syncLoop(gpu);
  };

  canvas.setAttribute('data-gpu', 'loading');

  void (async (): Promise<void> => {
    const source = await resolveShaderSource(expression);
    if (canceled) return;
    if (!source) {
      canvas.setAttribute('data-gpu', 'error');
      restoreFallback = revealFallback(canvas, mountOn);
      return;
    }

    const gpu = await shared();
    if (canceled) return;
    if (!gpu) {
      restoreFallback = noSupport(canvas, 'the WebGPU adapter did not open', mountOn);
      return;
    }

    try {
      mount(gpu, source);
    } catch (err) {
      canvas.setAttribute('data-gpu', 'error');
      handleError(err, `v-shader at ${describeElement(canvas)}`);
    }
  })();
});
