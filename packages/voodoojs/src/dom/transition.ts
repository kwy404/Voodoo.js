/**
 * @module dom/transition
 *
 * Transicoes de entrada e saida baseadas em classes CSS, no mesmo modelo do
 * Vue, porem sem componente wrapper: basta `v-transition` no elemento.
 *
 * Ciclo de entrada:
 *   `.{nome}-enter-from` aplicado, proximo quadro troca para `.{nome}-enter-to`,
 *   ambas com `.{nome}-enter-active`, removidas ao terminar a animacao.
 */

import { injectStyle } from './style';
import { device } from '../utils';

const BUILT_IN_CSS = `
.v-fade-enter-active,.v-fade-leave-active{transition:opacity .22s var(--v-ease,ease)}
.v-fade-enter-from,.v-fade-leave-to{opacity:0}

.v-scale-enter-active,.v-scale-leave-active{transition:opacity .22s var(--v-ease,ease),transform .22s var(--v-ease,ease)}
.v-scale-enter-from,.v-scale-leave-to{opacity:0;transform:scale(.94)}

.v-slide-enter-active,.v-slide-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-enter-from,.v-slide-leave-to{opacity:0;transform:translateY(-10px)}

.v-slide-up-enter-active,.v-slide-up-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-up-enter-from,.v-slide-up-leave-to{opacity:0;transform:translateY(14px)}

.v-slide-right-enter-active,.v-slide-right-leave-active{transition:opacity .24s var(--v-ease,ease),transform .24s var(--v-ease,ease)}
.v-slide-right-enter-from,.v-slide-right-leave-to{opacity:0;transform:translateX(24px)}

.v-blur-enter-active,.v-blur-leave-active{transition:opacity .3s ease,filter .3s ease}
.v-blur-enter-from,.v-blur-leave-to{opacity:0;filter:blur(8px)}

@media (prefers-reduced-motion: reduce){
  [class*="-enter-active"],[class*="-leave-active"]{transition-duration:.01ms !important}
}
`;

export interface TransitionClasses {
  enterFrom?: string;
  enterActive?: string;
  enterTo?: string;
  leaveFrom?: string;
  leaveActive?: string;
  leaveTo?: string;
}

export interface TransitionOptions extends TransitionClasses {
  /** Nome base das classes. Padrao `v-fade`. */
  name?: string;
  /** Duracao forcada em ms. Quando ausente, e lida do CSS computado. */
  duration?: number;
}

function classesFor(options: TransitionOptions): Required<TransitionClasses> {
  const name = options.name || 'v-fade';
  return {
    enterFrom: options.enterFrom || `${name}-enter-from`,
    enterActive: options.enterActive || `${name}-enter-active`,
    enterTo: options.enterTo || `${name}-enter-to`,
    leaveFrom: options.leaveFrom || `${name}-leave-from`,
    leaveActive: options.leaveActive || `${name}-leave-active`,
    leaveTo: options.leaveTo || `${name}-leave-to`,
  };
}

function addClasses(el: HTMLElement, list: string): void {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.add(cls);
}

function removeClasses(el: HTMLElement, list: string): void {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.remove(cls);
}

/** Le a duracao total declarada no CSS do elemento, em milissegundos. */
function readDuration(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const parse = (value: string): number =>
    Math.max(0, ...value.split(',').map((v) => parseFloat(v) * (v.includes('ms') ? 1 : 1000) || 0));
  return Math.max(
    parse(style.transitionDuration) + parse(style.transitionDelay),
    parse(style.animationDuration) + parse(style.animationDelay)
  );
}

function nextFrame(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

/** Executa a transicao de entrada e resolve quando ela termina. */
export function enter(el: HTMLElement, options: TransitionOptions = {}): Promise<void> {
  injectStyle('transitions', BUILT_IN_CSS);
  const c = classesFor(options);

  if (device.reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    addClasses(el, c.enterFrom);
    addClasses(el, c.enterActive);

    nextFrame(() => {
      removeClasses(el, c.enterFrom);
      addClasses(el, c.enterTo);

      const duration = options.duration ?? readDuration(el);
      const finish = (): void => {
        removeClasses(el, c.enterActive);
        removeClasses(el, c.enterTo);
        resolve();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}

/** Executa a transicao de saida e resolve quando ela termina. */
export function leave(el: HTMLElement, options: TransitionOptions = {}): Promise<void> {
  injectStyle('transitions', BUILT_IN_CSS);
  const c = classesFor(options);

  if (device.reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    addClasses(el, c.leaveFrom);
    addClasses(el, c.leaveActive);

    nextFrame(() => {
      removeClasses(el, c.leaveFrom);
      addClasses(el, c.leaveTo);

      const duration = options.duration ?? readDuration(el);
      const finish = (): void => {
        removeClasses(el, c.leaveActive);
        removeClasses(el, c.leaveTo);
        resolve();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}

/** Anima altura de 0 ate o conteudo. Usado por `v-collapse`. */
export function slideDown(el: HTMLElement, duration = 240): Promise<void> {
  return new Promise((resolve) => {
    el.style.removeProperty('display');
    if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    const target = el.scrollHeight;
    el.style.overflow = 'hidden';
    el.style.height = '0px';
    el.style.paddingTop = '0px';
    el.style.paddingBottom = '0px';
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.removeProperty('padding-top');
      el.style.removeProperty('padding-bottom');
      el.style.height = `${target}px`;
    });
    setTimeout(() => {
      el.style.removeProperty('height');
      el.style.removeProperty('overflow');
      el.style.removeProperty('transition');
      resolve();
    }, duration + 20);
  });
}

/** Anima altura ate zero e esconde o elemento. */
export function slideUp(el: HTMLElement, duration = 240): Promise<void> {
  return new Promise((resolve) => {
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = 'hidden';
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.height = '0px';
      el.style.paddingTop = '0px';
      el.style.paddingBottom = '0px';
    });
    setTimeout(() => {
      el.style.display = 'none';
      el.style.removeProperty('height');
      el.style.removeProperty('padding-top');
      el.style.removeProperty('padding-bottom');
      el.style.removeProperty('overflow');
      el.style.removeProperty('transition');
      resolve();
    }, duration + 20);
  });
}

/** Aparecimento com fade. */
export function fadeIn(el: HTMLElement, duration = 220): Promise<void> {
  return new Promise((resolve) => {
    el.style.opacity = '0';
    el.style.removeProperty('display');
    if (getComputedStyle(el).display === 'none') el.style.display = '';
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
    setTimeout(() => {
      el.style.removeProperty('transition');
      el.style.removeProperty('opacity');
      resolve();
    }, duration + 20);
  });
}

/** Desaparecimento com fade, terminando em `display:none`. */
export function fadeOut(el: HTMLElement, duration = 220): Promise<void> {
  return new Promise((resolve) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
      el.style.removeProperty('transition');
      el.style.removeProperty('opacity');
      resolve();
    }, duration + 20);
  });
}

/**
 * Transicoes suaves de layout usando a View Transitions API quando existir.
 * Em navegadores sem suporte, a funcao apenas executa a mudanca.
 */
export function viewTransition(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (typeof doc.startViewTransition === 'function' && !device.reducedMotion) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
