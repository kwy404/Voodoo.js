/**
 * @module directives/gpu
 *
 * `v-shader`: um shader WebGPU rodando num `<canvas>` sem escrever JavaScript.
 *
 * ```html
 * <canvas v-shader="ondas.wgsl" :set="{ speed: velocidade, tint: cor }"></canvas>
 * <canvas v-shader="#meu-shader" v-shader.visible></canvas>
 * <script type="x-shader/wgsl" id="meu-shader"> ... </script>
 * ```
 *
 * O compromisso da directive e o mesmo do modulo `gpu`: sem WebGPU nada quebra.
 * O canvas ganha `data-gpu="unsupported"`, dispara `voodoo:gpu-unsupported` e o
 * conteudo que estava dentro dele aparece no lugar dele. Nenhum rAF e agendado,
 * nenhum observador fica aberto e o console so recebe um aviso em modo dev.
 */

import { handleError } from '../reactivity';
import { avisar, descreverElemento } from '../runtime/avisos';
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
// Origem do shader
// ---------------------------------------------------------------------------

/** De onde o texto do shader vem. */
export type ShaderSourceKind = 'inline' | 'selector' | 'url' | 'empty';

/**
 * Decide se o valor do atributo e WGSL escrito ali mesmo, um seletor de
 * elemento ou um endereco para buscar.
 *
 * A regra e por eliminacao: `#` so aparece em seletor, e WGSL sempre traz uma
 * declaracao ou uma chave. O que sobra e endereco, que e o caso mais comum.
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
 * Resolve o texto do shader.
 *
 * @returns o WGSL, ou string vazia quando a origem nao existe
 */
export async function resolveShaderSource(text: string): Promise<string> {
  const valor = text.trim();
  const kind = classifyShaderSource(valor);

  if (kind === 'empty') return '';
  if (kind === 'inline') return valor;

  if (kind === 'selector') {
    if (typeof document === 'undefined') return '';
    let alvo: Element | null = null;
    try {
      alvo = document.querySelector(valor);
    } catch {
      // Seletor invalido. Tratado como shader ausente, sem derrubar a pagina.
      alvo = null;
    }
    if (!alvo) {
      avisar(`v-shader nao encontrou o elemento "${valor}" com a fonte do shader.`);
      return '';
    }
    return alvo.textContent ?? '';
  }

  try {
    const resposta = await http.get<string>(valor, { responseType: 'text' });
    return typeof resposta === 'string' ? resposta : '';
  } catch (err) {
    handleError(err, `v-shader ao buscar "${valor}"`);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Fallback sem WebGPU
// ---------------------------------------------------------------------------

/**
 * Revela o conteudo que estava dentro do `<canvas>`.
 *
 * O navegador so mostra os filhos de um canvas quando nao sabe desenhar canvas
 * nenhum, e nao e esse o caso aqui: o canvas funciona, o que falta e WebGPU.
 * Entao os filhos sao movidos para um irmao e o canvas sai de cena.
 *
 * @returns funcao que devolve o DOM ao estado original
 */
function revelarFallback(el: HTMLCanvasElement, montar: (no: Node) => void): () => void {
  if (!el.firstChild || typeof document === 'undefined') return () => undefined;

  const substituto = document.createElement('div');
  substituto.setAttribute('data-gpu-fallback', '');
  while (el.firstChild) substituto.appendChild(el.firstChild);
  el.parentNode?.insertBefore(substituto, el.nextSibling);

  const displayAnterior = el.style.display;
  el.style.display = 'none';

  // O conteudo revelado continua sendo HTML da Voodoo: interpolacao e
  // directives ali dentro precisam funcionar como funcionariam no lugar antigo.
  montar(substituto);

  return (): void => {
    destruirNo(substituto);
    while (substituto.firstChild) el.appendChild(substituto.firstChild);
    substituto.remove();
    if (displayAnterior) el.style.display = displayAnterior;
    else el.style.removeProperty('display');
  };
}

/** Marca o canvas, avisa a pagina e revela o fallback. */
function semSuporte(
  el: HTMLCanvasElement,
  motivo: string,
  montar: (no: Node) => void
): () => void {
  el.setAttribute('data-gpu', 'unsupported');
  el.dispatchEvent(
    new CustomEvent('voodoo:gpu-unsupported', { bubbles: true, detail: { motivo, el } })
  );
  avisar(
    `v-shader em ${descreverElemento(el)} nao rodou: ${motivo}. ` +
      'O conteudo dentro do <canvas> foi usado como alternativa. ' +
      'Escute voodoo:gpu-unsupported para oferecer outra coisa.'
  );
  return revelarFallback(el, montar);
}

// ---------------------------------------------------------------------------
// Leitura dos atributos auxiliares
// ---------------------------------------------------------------------------

/** Procura a expressao de `:set`, aceitando as tres grafias equivalentes. */
function expressaoDeSet(el: Element): string | null {
  const atributos = originalAttributes(el);
  for (const nome of [':set', 'v-bind:set', 'data-v-bind:set']) {
    const valor = atributos.get(nome);
    if (valor) return valor;
  }
  const proprio = el.getAttribute('v-shader-set') ?? el.getAttribute('data-v-shader-set');
  return proprio || null;
}

/** Le `v-shader-dpr="1,2"`. */
function faixaDpr(el: Element): [number, number] {
  const bruto = el.getAttribute('v-shader-dpr') ?? el.getAttribute('data-v-shader-dpr');
  if (!bruto) return [1, 2];
  const partes = bruto.split(',').map((n) => parseFloat(n.trim()));
  const min = Number.isFinite(partes[0]) ? partes[0] : 1;
  const max = Number.isFinite(partes[1]) ? partes[1] : Math.max(min, 2);
  return [Math.max(0.5, min), Math.max(min, max)];
}

// ---------------------------------------------------------------------------
// A directive
// ---------------------------------------------------------------------------

/** Uniforms que a Voodoo alimenta sozinha, quando o shader os declara. */
const UNIFORMS_AUTOMATICOS = ['time', 'delta', 'frame', 'resolution'];

defineDirective('shader', (ctx) => {
  const { el, expression, modifiers, evaluate, effect, cleanup, scope, walk } = ctx;

  const montarNo = (no: Node): void => walk(no, scope);

  if (typeof HTMLCanvasElement === 'undefined' || !(el instanceof HTMLCanvasElement)) {
    avisar(
      `v-shader precisa de um <canvas>, mas foi usado em ${descreverElemento(el)}. ` +
        'Troque a tag por <canvas> para o shader ter onde desenhar.'
    );
    return;
  }

  const canvas = el;
  let cancelado = false;
  cleanup(() => {
    cancelado = true;
  });

  if (!supported()) {
    const restaurar = semSuporte(canvas, 'este navegador nao tem WebGPU', montarNo);
    cleanup(restaurar);
    return;
  }

  // Valores vindos de `:set`. Ficam guardados desde antes do pipeline existir,
  // entao o primeiro quadro ja nasce com os uniforms certos.
  const setExpr = expressaoDeSet(canvas);
  let valores: Record<string, unknown> = {};
  let aplicar: ((v: Record<string, unknown>) => void) | null = null;

  if (setExpr) {
    effect(() => {
      const lido = evaluate<unknown>(setExpr);
      valores = lido && typeof lido === 'object' ? (lido as Record<string, unknown>) : {};
      // Trocar um uniform nao recria pipeline nenhum: so reescreve o buffer.
      aplicar?.(valores);
    });
  }

  // `.paused` comeca parado; `v-shader-paused` deixa o estado decidir.
  const pausedExpr =
    canvas.getAttribute('v-shader-paused') ?? canvas.getAttribute('data-v-shader-paused');
  let pausado = !!modifiers.paused;
  let visivel = !modifiers.visible;

  let tela: GpuSurface | null = null;
  let efeito: GpuEffect | null = null;
  let pararLaco: (() => void) | null = null;
  let quadroUnico = 0;
  let observador: IntersectionObserver | null = null;
  let restaurarFallback: (() => void) | null = null;
  let automaticos: string[] = [];

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
    canvas.removeAttribute('data-gpu');
  });

  /** Entrega `time`, `delta`, `frame` e `resolution` aos shaders que pedirem. */
  const alimentarRelogio = (): void => {
    if (!efeito || automaticos.length === 0) return;
    const pacote: Record<string, unknown> = {
      time: relogio.time,
      delta: relogio.delta,
      frame: relogio.frame,
      resolution: [tela?.width ?? 0, tela?.height ?? 0],
    };
    const so: Record<string, unknown> = {};
    for (const nome of automaticos) so[nome] = pacote[nome];
    efeito.set(so);
  };

  const desenhar = (gpu: GpuContext): void => {
    alimentarRelogio();
    gravarQuadro(gpu, (quadro) => quadro.pass(tela, efeito));
  };

  const rodando = (): boolean => !!pararLaco;

  const sincronizarLaco = (gpu: GpuContext): void => {
    if (cancelado || !efeito) return;
    const deveRodar = !pausado && visivel && !modifiers.once;

    if (deveRodar && !rodando()) {
      pararLaco = frameLoop(gpu, (quadro) => {
        // O relogio proprio nao zera quando o laco pausa e volta, entao a
        // animacao continua de onde parou em vez de dar um salto.
        relogio.tick();
        alimentarRelogio();
        quadro.pass(tela, efeito);
      });
      canvas.setAttribute('data-gpu', 'ready');
      return;
    }

    if (!deveRodar && rodando()) {
      pararLaco?.();
      pararLaco = null;
      canvas.setAttribute('data-gpu', 'paused');
    }
  };

  const montar = (gpu: GpuContext, fonte: string): void => {
    tela = surface(gpu, canvas, { dpr: faixaDpr(canvas), alpha: true });
    efeito = criarEffect(gpu, fonte, {
      set: valores,
      format: tela.format || undefined,
      label: `v-shader ${descreverElemento(canvas)}`,
    });

    if (!efeito.ok) {
      canvas.setAttribute('data-gpu', 'error');
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
      effect(() => {
        pausado = !!evaluate<unknown>(pausedExpr);
        sincronizarLaco(gpu);
      });
    }

    if (modifiers.visible && typeof IntersectionObserver !== 'undefined') {
      observador = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) visivel = entrada.isIntersecting;
        sincronizarLaco(gpu);
      });
      observador.observe(canvas);
    } else {
      visivel = true;
    }

    if (modifiers.once) {
      // Um quadro so, depois do primeiro rAF, para o canvas ja ter medida.
      quadroUnico = requestAnimationFrame(() => {
        quadroUnico = 0;
        if (cancelado) return;
        relogio.tick();
        desenhar(gpu);
        canvas.setAttribute('data-gpu', 'ready');
      });
      return;
    }

    canvas.setAttribute('data-gpu', 'ready');
    sincronizarLaco(gpu);
  };

  canvas.setAttribute('data-gpu', 'loading');

  void (async (): Promise<void> => {
    const fonte = await resolveShaderSource(expression);
    if (cancelado) return;
    if (!fonte) {
      canvas.setAttribute('data-gpu', 'error');
      restaurarFallback = revelarFallback(canvas, montarNo);
      return;
    }

    const gpu = await shared();
    if (cancelado) return;
    if (!gpu) {
      restaurarFallback = semSuporte(canvas, 'o adaptador WebGPU nao abriu', montarNo);
      return;
    }

    try {
      montar(gpu, fonte);
    } catch (err) {
      canvas.setAttribute('data-gpu', 'error');
      handleError(err, `v-shader em ${descreverElemento(canvas)}`);
    }
  })();
});
