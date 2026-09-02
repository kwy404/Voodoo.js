/**
 * @module dom/transition
 *
 * Entry and exit transitions based on CSS classes, in the same model as Vue,
 * but without a wrapper component: just use `v-transition` on the element.
 *
 * Entry cycle:
 *   `.{name}-enter-from` applied, next frame switches to `.{name}-enter-to`,
 *   both with `.{name}-enter-active`, removed when animation finishes.
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
  /** Base name of the classes. Default `v-fade`. */
  name?: string;
  /** Forced duration in ms. When absent, read from computed CSS. */
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

/** Reads the total duration declared in the element's CSS, in milliseconds. */
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

/** Executes the entry transition and resolves when it finishes. */
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

/** Executes the exit transition and resolves when it finishes. */
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

/** Animates height from 0 to content. Used by `v-collapse`. */
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

/** Animates height to zero and hides the element. */
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

/** Appearance with fade. */
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

/** Disappearance with fade, ending in `display:none`. */
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
 * Smooth layout transitions using the View Transitions API when available.
 * On browsers without support, the function just executes the change.
 */
export function viewTransition(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
  if (typeof doc.startViewTransition === 'function' && !device.reducedMotion) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
