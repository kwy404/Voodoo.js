/**
 * @module runtime/boot
 *
 * Voodoo's custom initialization scheduler.
 *
 * The library doesn't use `DOMContentLoaded` or `document.readyState` to know
 * when to start. Instead it maintains its own loop: at each step it asks whether
 * a task's condition is met, and executes those that are.
 *
 * The reason is simple. Browser load events answer the wrong question.
 * `DOMContentLoaded` says the parser finished, not that the tree we care about
 * exists. A page rendered by another script, a fragment inserted later, a
 * container that only appears on the second viewport: in all these cases the
 * event already passed, or will pass too early.
 *
 * The loop here answers the right question: "do I have what I need in the
 * document and has it stopped changing?". This applies both to automatic startup
 * and to `app.mount('#app')` called before `#app` exists.
 *
 * ```js
 * whenReady(() => V.start())                    // document stable
 * whenElement('#app', (el) => mount(el))        // element, whether it exists or not
 * ```
 */

/** Maximum time to wait before giving up. */
const WAIT_LIMIT = 10_000;

/** Consecutive steps without DOM changes to consider the tree stable. */
const STABLE_STEPS = 2;

interface Task {
  /** Returns the expected value, or `null` while it doesn't exist. */
  ready(): unknown;
  /** Receives the value returned by `ready`. */
  action(value: any): void;
  /** Called when the wait limit expires without the value appearing. */
  onGiveUp?(): void;
  /** Time when the task entered the queue. */
  since: number;
}

const queue: Task[] = [];

let observer: MutationObserver | null = null;
let domVersion = 0;
let domVersionAtPreviousStep = -1;
let stepsWithoutChange = 0;
let scheduled = false;

/** Monotonic clock when available, system time as fallback. */
function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/**
 * Counts changes in the document. It's the only signal the loop needs from the
 * browser, and it concerns the tree, not the load state.
 */
function observeChanges(): void {
  if (observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (!root) return;

  observer = new MutationObserver(() => {
    domVersion++;
  });
  observer.observe(root, { childList: true, subtree: true });
}

/** Marks a loop step. Microtask first, then frame, then timer. */
function scheduleStep(): void {
  if (scheduled) return;
  scheduled = true;

  const execute = (): void => {
    scheduled = false;
    step();
  };

  // The frame arrives after scripts with `defer`, which is exactly when we
  // want to check again. The timer covers background tabs where
  // `requestAnimationFrame` doesn't run.
  if (typeof requestAnimationFrame === 'function') {
    let fired = false;
    const one = (): void => {
      if (fired) return;
      fired = true;
      execute();
    };
    requestAnimationFrame(one);
    setTimeout(one, 32);
    return;
  }

  setTimeout(execute, 0);
}

/** One loop step: resolves what it can, reschedules while tasks remain. */
function step(): void {
  if (domVersion === domVersionAtPreviousStep) stepsWithoutChange++;
  else stepsWithoutChange = 0;
  domVersionAtPreviousStep = domVersion;

  const now_ = now();

  for (let i = queue.length - 1; i >= 0; i--) {
    const task = queue[i];
    let value: unknown = null;

    try {
      value = task.ready();
    } catch {
      value = null;
    }

    if (value) {
      queue.splice(i, 1);
      task.action(value);
      continue;
    }

    if (now_ - task.since > WAIT_LIMIT) {
      queue.splice(i, 1);
      task.onGiveUp?.();
    }
  }

  if (queue.length) scheduleStep();
}

/** Puts a task in the loop, trying to resolve immediately before waiting. */
function enqueue(task: Omit<Task, 'since'>): void {
  let value: unknown = null;
  try {
    value = task.ready();
  } catch {
    value = null;
  }

  if (value) {
    task.action(value);
    return;
  }

  observeChanges();
  queue.push({ ...task, since: now() });
  scheduleStep();
}

/** `true` when the body exists and the tree stopped growing. */
function documentStable(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  return stepsWithoutChange >= STABLE_STEPS;
}

/**
 * `true` when nothing changed in the document since the loop started looking.
 *
 * It's the signal that the page is no longer being constructed: an already-mounted
 * document, a test, a tab that finished loading long ago. In these cases waiting
 * for frames would just be a delay.
 */
function documentStopped(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  return domVersion === 0;
}

/**
 * Executes when the document has a body and stops changing.
 *
 * Replaces `DOMContentLoaded`. The practical difference appears in two cases:
 * a script without `defer` in `<head>`, where the body doesn't exist yet, and a
 * page rendered by another script, where the event already passed.
 */
export function whenReady(action: () => void): void {
  if (typeof document === 'undefined') return;

  enqueue({
    ready: () => (documentStable() ? document.body : null),
    action: () => action(),
    // Past the limit, start anyway: a page that never stops changing
    // still deserves to be initialized.
    onGiveUp: () => {
      if (document.body) action();
    },
  });
}

/**
 * Executes as soon as the document has a body, without waiting for the tree to stabilize.
 *
 * It's the criterion for `V.ready`: the caller wants a usable document, not a
 * guarantee that no other script will touch it later. When nothing changed since the
 * loop started looking, the call happens in the next microtask, with no frame cost.
 */
export function whenBodyReady(action: () => void): void {
  if (typeof document === 'undefined') return;

  if (documentStopped()) {
    void Promise.resolve().then(action);
    return;
  }

  enqueue({
    ready: () => (documentStable() ? document.body : null),
    action: () => action(),
    onGiveUp: () => {
      if (document.body) action();
    },
  });
}

/**
 * Resolves an element that may not exist yet.
 *
 * ```js
 * whenElement('#app', (el) => app.mount(el))
 * ```
 */
export function whenElement(
  target: string | Element,
  action: (el: Element) => void,
  onGiveUp?: () => void
): void {
  if (typeof target !== 'string') {
    action(target);
    return;
  }
  if (typeof document === 'undefined') return;

  enqueue({
    ready: () => document.querySelector(target),
    action: (el: Element) => action(el),
    onGiveUp,
  });
}

/** Promise resolved when the document is ready by the above criterion. */
export function ready(): Promise<void> {
  return new Promise((resolve) => whenReady(() => resolve()));
}

/** Stops the loop's observer. Used in tests and by `V.destroy()`. */
export function stopBootLoop(): void {
  observer?.disconnect();
  observer = null;
  queue.length = 0;
  scheduled = false;
  stepsWithoutChange = 0;
  domVersionAtPreviousStep = -1;
}
