'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Voodoo.js v0.9.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/reactivity/index.ts
var reactivity_exports = {};
__export(reactivity_exports, {
  EffectScope: () => EffectScope,
  ITERATE_KEY: () => ITERATE_KEY,
  ReactiveEffect: () => ReactiveEffect,
  TriggerType: () => TriggerType,
  computed: () => computed,
  effect: () => effect,
  effectScope: () => effectScope,
  enableTracking: () => enableTracking,
  flushSync: () => flushSync,
  getActiveEffect: () => getActiveEffect,
  getActiveScope: () => getActiveScope,
  handleError: () => handleError,
  hasChanged: () => hasChanged,
  isReactive: () => isReactive,
  isRef: () => isRef,
  markRaw: () => markRaw,
  nextTick: () => nextTick,
  pauseTracking: () => pauseTracking,
  queueJob: () => queueJob,
  queuePostFlush: () => queuePostFlush,
  reactive: () => reactive,
  ref: () => ref,
  resetTracking: () => resetTracking,
  setErrorHandler: () => setErrorHandler,
  shallowRef: () => shallowRef,
  stop: () => stop,
  toRaw: () => toRaw,
  track: () => track,
  trigger: () => trigger,
  unref: () => unref,
  warn: () => warn,
  watch: () => watch,
  watchEffect: () => watchEffect
});
function nextTick(fn) {
  const p2 = flushPromise || resolvedPromise;
  return fn ? p2.then(fn) : p2;
}
function queueJob(job) {
  if (job.queued) return;
  job.queued = true;
  queue.push(job);
  queueFlush();
}
function queuePostFlush(cb) {
  postQueue.push(cb);
  queueFlush();
}
function queueFlush() {
  if (isFlushing || isFlushPending) return;
  isFlushPending = true;
  flushPromise = resolvedPromise.then(flushJobs);
}
function flushJobs() {
  isFlushPending = false;
  isFlushing = true;
  const counts = /* @__PURE__ */ new Map();
  try {
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      if (!job.active) continue;
      const count = (counts.get(job) || 0) + 1;
      counts.set(job, count);
      if (count > RECURSION_LIMIT) {
        warn(
          "Infinite update loop detected. A reactive effect keeps triggering itself without ever settling. Check whether some expression writes to state that it also reads."
        );
        continue;
      }
      try {
        job.run();
      } catch (err) {
        handleError(err, "effect");
      }
    }
  } finally {
    for (const job of queue) job.queued = false;
    queue = [];
    isFlushing = false;
    const posts = postQueue;
    postQueue = [];
    for (const cb of posts) {
      try {
        cb();
      } catch (err) {
        handleError(err, "post-flush");
      }
    }
    if (queue.length || postQueue.length) {
      flushPromise = resolvedPromise.then(flushJobs);
      isFlushPending = true;
    } else {
      flushPromise = null;
    }
  }
}
function flushSync() {
  if (isFlushing) return;
  isFlushPending = false;
  flushJobs();
}
function setErrorHandler(fn) {
  errorHandler = fn;
}
function handleError(err, context) {
  if (errorHandler) {
    errorHandler(err, context);
    return;
  }
  console.error(`[Voodoo] error in ${context}:`, err);
}
function warn(msg, ...args) {
  console.warn(`[Voodoo] ${msg}`, ...args);
}
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}
function resetTracking() {
  shouldTrack = trackStack.pop() ?? true;
}
function getActiveEffect() {
  return activeEffect;
}
function cleanupDeps(effect2) {
  const { deps } = effect2;
  for (let i = 0; i < deps.length; i++) deps[i].delete(effect2);
  deps.length = 0;
}
function effect(fn, options) {
  const e = new ReactiveEffect(fn, options);
  if (!options?.lazy) e.run();
  const runner = (() => e.run());
  runner.effect = e;
  return runner;
}
function stop(runner) {
  if (runner instanceof ReactiveEffect) runner.stop();
  else runner.effect.stop();
}
function effectScope(detached = false) {
  return new EffectScope(detached);
}
function getActiveScope() {
  return activeScope;
}
function track(target, key) {
  if (!shouldTrack || !activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  let dep = depsMap.get(key);
  if (!dep) depsMap.set(key, dep = /* @__PURE__ */ new Set());
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target, type, key, _newValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effects = /* @__PURE__ */ new Set();
  const add = (dep) => {
    if (!dep) return;
    for (const e of dep) if (e !== activeEffect || type === "clear" /* CLEAR */) effects.add(e);
  };
  if (type === "clear" /* CLEAR */) {
    depsMap.forEach(add);
  } else {
    if (key !== void 0) add(depsMap.get(key));
    const isArr = Array.isArray(target);
    if (type === "add" /* ADD */) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
      else if (isIntegerKey(key)) add(depsMap.get("length"));
    } else if (type === "delete" /* DELETE */) {
      if (!isArr) add(depsMap.get(ITERATE_KEY));
    } else if (isArr && key === "length") {
      const newLen = Number(_newValue);
      depsMap.forEach((dep, k) => {
        if (k === "length" || typeof k !== "symbol" && Number(k) >= newLen) add(dep);
      });
    }
  }
  for (const e of effects) {
    if (e.scheduler) e.scheduler();
    else queueJob(e);
  }
}
function isIntegerKey(key) {
  return typeof key === "string" && key !== "NaN" && key[0] !== "-" && String(parseInt(key, 10)) === key;
}
function isObject(val) {
  return val !== null && typeof val === "object";
}
function canObserve(value) {
  if (!isObject(value)) return false;
  if (value[SKIP]) return false;
  if (Object.isFrozen(value)) return false;
  if (typeof Node !== "undefined" && value instanceof Node) return false;
  const tag = Object.prototype.toString.call(value).slice(8, -1);
  if (NON_REACTIVE.has(tag)) return false;
  return tag === "Object" || tag === "Array" || tag === "Map" || tag === "Set";
}
function markRaw(value) {
  Object.defineProperty(value, SKIP, { value: true, enumerable: false, configurable: true });
  return value;
}
function toRaw(observed) {
  const raw = observed && observed[RAW];
  return raw ? toRaw(raw) : observed;
}
function isReactive(value) {
  return !!(value && value[IS_REACTIVE]);
}
function reactive(target) {
  if (!isObject(target)) return target;
  if (isReactive(target)) return target;
  if (!canObserve(target)) return target;
  const existing = reactiveMap.get(target);
  if (existing) return existing;
  const isMapOrSet = target instanceof Map || target instanceof Set;
  const proxy = new Proxy(
    target,
    isMapOrSet ? collectionHandlers : baseHandlers
  );
  reactiveMap.set(target, proxy);
  return proxy;
}
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}
function isRef(r) {
  return !!(r && r.__v_isRef === true);
}
function maybeReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref2) {
  if (!shouldTrack || !activeEffect) return;
  if (!ref2.dep.has(activeEffect)) {
    ref2.dep.add(activeEffect);
    activeEffect.deps.push(ref2.dep);
  }
}
function triggerRefValue(ref2) {
  for (const e of [...ref2.dep]) {
    if (e.scheduler) e.scheduler();
    else queueJob(e);
  }
}
function ref(value) {
  return new RefImpl(value);
}
function shallowRef(value) {
  return new RefImpl(value, true);
}
function unref(value) {
  return isRef(value) ? value.value : value;
}
function computed(getterOrOptions) {
  const isFn = typeof getterOrOptions === "function";
  const getter = isFn ? getterOrOptions : getterOrOptions.get;
  const setter = isFn ? void 0 : getterOrOptions.set;
  return new ComputedRefImpl(getter, setter);
}
function watch(source, cb, options = {}) {
  const { immediate = false, deep = false, flush = "pre" } = options;
  let getter;
  if (isRef(source)) getter = () => source.value;
  else if (typeof source === "function") getter = source;
  else if (isReactive(source)) getter = () => traverse(source);
  else getter = () => source;
  if (deep) {
    const base = getter;
    getter = () => traverse(base());
  }
  let oldValue;
  let cleanupFn;
  const onInvalidate = (fn) => {
    cleanupFn = fn;
  };
  const job = () => {
    if (!runner.effect.active) return;
    const newValue = runner();
    if (deep || hasChanged(newValue, oldValue)) {
      cleanupFn?.();
      cleanupFn = void 0;
      cb(newValue, oldValue, onInvalidate);
      oldValue = newValue;
    }
  };
  const scheduler = flush === "sync" ? job : flush === "post" ? () => queuePostFlush(job) : () => queueJob(runner.effect);
  const runner = flush === "pre" ? effect(getter, {
    lazy: true,
    scheduler: () => queuePostFlush(job)
  }) : effect(getter, { lazy: true, scheduler });
  oldValue = runner();
  if (immediate) cb(oldValue, void 0, onInvalidate);
  return () => runner.effect.stop();
}
function watchEffect(fn) {
  let cleanupFn;
  const onInvalidate = (c) => {
    cleanupFn = c;
  };
  const runner = effect(() => {
    cleanupFn?.();
    cleanupFn = void 0;
    fn(onInvalidate);
  });
  return () => {
    cleanupFn?.();
    runner.effect.stop();
  };
}
function traverse(value, seen = /* @__PURE__ */ new Set()) {
  if (!isObject(value) || seen.has(value)) return value;
  seen.add(value);
  if (isRef(value)) traverse(value.value, seen);
  else if (Array.isArray(value)) for (const v of value) traverse(v, seen);
  else if (value instanceof Set || value instanceof Map)
    value.forEach((v) => traverse(v, seen));
  else for (const key of Object.keys(value)) traverse(value[key], seen);
  return value;
}
var resolvedPromise, queue, postQueue, isFlushing, isFlushPending, flushPromise, RECURSION_LIMIT, errorHandler, activeEffect, shouldTrack, trackStack, effectId, ReactiveEffect, activeScope, EffectScope, ITERATE_KEY, targetMap, TriggerType, RAW, IS_REACTIVE, SKIP, reactiveMap, arrayInstrumentations, NON_REACTIVE, baseHandlers, collectionHandlers, RefImpl, ComputedRefImpl;
var init_reactivity = __esm({
  "src/reactivity/index.ts"() {
    resolvedPromise = /* @__PURE__ */ Promise.resolve();
    queue = [];
    postQueue = [];
    isFlushing = false;
    isFlushPending = false;
    flushPromise = null;
    RECURSION_LIMIT = 100;
    errorHandler = null;
    shouldTrack = true;
    trackStack = [];
    effectId = 0;
    ReactiveEffect = class {
      constructor(fn, options) {
        this.fn = fn;
        this.id = effectId++;
        this.active = true;
        this.queued = false;
        this.deps = [];
        this.parent = void 0;
        this.scheduler = options?.scheduler;
        this.onStop = options?.onStop;
        this.cleanups = [];
        const scope = options?.scope ?? activeScope;
        if (scope) scope.effects.push(this);
      }
      run() {
        if (!this.active) return this.fn();
        let parent = activeEffect;
        while (parent) {
          if (parent === this) return void 0;
          parent = parent.parent;
        }
        this.runCleanups();
        try {
          this.parent = activeEffect;
          activeEffect = this;
          enableTracking();
          cleanupDeps(this);
          return this.fn();
        } finally {
          resetTracking();
          activeEffect = this.parent;
          this.parent = void 0;
        }
      }
      /** Registers a function called before the next run and on stop. */
      onInvalidate(fn) {
        this.cleanups.push(fn);
      }
      runCleanups() {
        if (!this.cleanups.length) return;
        const list = this.cleanups;
        this.cleanups = [];
        for (const fn of list) {
          try {
            fn();
          } catch (err) {
            handleError(err, "effect cleanup");
          }
        }
      }
      stop() {
        if (!this.active) return;
        cleanupDeps(this);
        this.runCleanups();
        this.active = false;
        this.onStop?.();
      }
    };
    EffectScope = class {
      constructor(detached = false) {
        this.effects = [];
        this.cleanups = [];
        this.children = [];
        this.active = true;
        this.parent = void 0;
        if (!detached && activeScope) {
          this.parent = activeScope;
          activeScope.children.push(this);
        }
      }
      run(fn) {
        if (!this.active) return void 0;
        const prev = activeScope;
        try {
          activeScope = this;
          return fn();
        } finally {
          activeScope = prev;
        }
      }
      onDispose(fn) {
        this.cleanups.push(fn);
      }
      stop() {
        if (!this.active) return;
        this.active = false;
        for (const e of this.effects) e.stop();
        for (const c of this.children) c.stop();
        for (const fn of this.cleanups) {
          try {
            fn();
          } catch (err) {
            handleError(err, "scope cleanup");
          }
        }
        this.effects.length = 0;
        this.children.length = 0;
        this.cleanups.length = 0;
        if (this.parent) {
          const i = this.parent.children.indexOf(this);
          if (i > -1) this.parent.children.splice(i, 1);
        }
      }
    };
    ITERATE_KEY = /* @__PURE__ */ Symbol("voodoo:iterate");
    targetMap = /* @__PURE__ */ new WeakMap();
    TriggerType = /* @__PURE__ */ ((TriggerType2) => {
      TriggerType2["SET"] = "set";
      TriggerType2["ADD"] = "add";
      TriggerType2["DELETE"] = "delete";
      TriggerType2["CLEAR"] = "clear";
      return TriggerType2;
    })(TriggerType || {});
    RAW = /* @__PURE__ */ Symbol("voodoo:raw");
    IS_REACTIVE = /* @__PURE__ */ Symbol("voodoo:isReactive");
    SKIP = /* @__PURE__ */ Symbol("voodoo:skip");
    reactiveMap = /* @__PURE__ */ new WeakMap();
    arrayInstrumentations = /* @__PURE__ */ (() => {
      const inst = {};
      for (const key of ["includes", "indexOf", "lastIndexOf"]) {
        inst[key] = function(...args) {
          const arr = toRaw(this);
          for (let i = 0; i < arr.length; i++) track(arr, String(i));
          const res = arr[key].apply(arr, args);
          if (res === -1 || res === false) {
            return arr[key].apply(arr, args.map(toRaw));
          }
          return res;
        };
      }
      for (const key of ["push", "pop", "shift", "unshift", "splice"]) {
        inst[key] = function(...args) {
          pauseTracking();
          try {
            return toRaw(this)[key].apply(this, args);
          } finally {
            resetTracking();
          }
        };
      }
      return inst;
    })();
    NON_REACTIVE = /* @__PURE__ */ new Set([
      "Date",
      "RegExp",
      "Promise",
      "Error",
      "File",
      "FileList",
      "Blob",
      "FormData",
      "URL",
      "URLSearchParams",
      "ArrayBuffer",
      "DataView"
    ]);
    baseHandlers = {
      get(target, key, receiver) {
        if (key === RAW) return target;
        if (key === IS_REACTIVE) return true;
        const isArr = Array.isArray(target);
        if (isArr && Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
          return Reflect.get(arrayInstrumentations, key, receiver);
        }
        const res = Reflect.get(target, key, receiver);
        if (typeof key === "symbol") return res;
        track(target, key);
        if (isRef(res)) return isArr && isIntegerKey(key) ? res : res.value;
        if (isObject(res)) return reactive(res);
        return res;
      },
      set(target, key, value, receiver) {
        const oldValue = target[key];
        value = toRaw(value);
        if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
        }
        const hadKey = Array.isArray(target) && isIntegerKey(key) ? Number(key) < target.length : Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.set(target, key, value, receiver);
        if (target === toRaw(receiver)) {
          if (!hadKey) trigger(target, "add" /* ADD */, key, value);
          else if (hasChanged(value, oldValue)) trigger(target, "set" /* SET */, key, value);
        }
        return result;
      },
      deleteProperty(target, key) {
        const hadKey = Object.prototype.hasOwnProperty.call(target, key);
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) trigger(target, "delete" /* DELETE */, key);
        return result;
      },
      has(target, key) {
        const result = Reflect.has(target, key);
        if (typeof key !== "symbol") track(target, key);
        return result;
      },
      ownKeys(target) {
        track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
        return Reflect.ownKeys(target);
      }
    };
    collectionHandlers = {
      get(target, key, receiver) {
        if (key === RAW) return target;
        if (key === IS_REACTIVE) return true;
        const raw = target;
        if (key === "size") {
          track(raw, ITERATE_KEY);
          return Reflect.get(raw, "size", raw);
        }
        const methods = {
          get(k) {
            track(raw, k);
            const v = raw.get(k);
            return isObject(v) ? reactive(v) : v;
          },
          has(k) {
            track(raw, k);
            return raw.has(k);
          },
          add(v) {
            v = toRaw(v);
            const had = raw.has(v);
            raw.add(v);
            if (!had) trigger(raw, "add" /* ADD */, v, v);
            return receiver;
          },
          set(k, v) {
            const had = raw.has(k);
            const old = raw.get(k);
            raw.set(k, toRaw(v));
            if (!had) trigger(raw, "add" /* ADD */, k, v);
            else if (hasChanged(v, old)) trigger(raw, "set" /* SET */, k, v);
            return receiver;
          },
          delete(k) {
            const had = raw.has(k);
            const res2 = raw.delete(k);
            if (had) trigger(raw, "delete" /* DELETE */, k);
            return res2;
          },
          clear() {
            const had = raw.size !== 0;
            const res2 = raw.clear();
            if (had) trigger(raw, "clear" /* CLEAR */);
            return res2;
          },
          forEach(cb, thisArg) {
            track(raw, ITERATE_KEY);
            return raw.forEach((v, k) => {
              cb.call(thisArg, isObject(v) ? reactive(v) : v, isObject(k) ? reactive(k) : k, receiver);
            });
          }
        };
        if (key in methods) return methods[key];
        if (key === Symbol.iterator || key === "keys" || key === "values" || key === "entries") {
          track(raw, ITERATE_KEY);
          const method = raw[key];
          return typeof method === "function" ? method.bind(raw) : method;
        }
        const res = Reflect.get(raw, key, raw);
        return typeof res === "function" ? res.bind(raw) : res;
      }
    };
    RefImpl = class {
      constructor(value, shallow = false) {
        __publicField(this, "shallow", shallow);
        __publicField(this, "__v_isRef", true);
        __publicField(this, "_value");
        __publicField(this, "_rawValue");
        __publicField(this, "dep", /* @__PURE__ */ new Set());
        this._rawValue = toRaw(value);
        this._value = shallow ? value : maybeReactive(value);
      }
      get value() {
        trackRefValue(this);
        return this._value;
      }
      set value(newVal) {
        const raw = toRaw(newVal);
        if (hasChanged(raw, this._rawValue)) {
          this._rawValue = raw;
          this._value = this.shallow ? newVal : maybeReactive(newVal);
          triggerRefValue(this);
        }
      }
    };
    ComputedRefImpl = class {
      constructor(getter, setter) {
        __publicField(this, "setter", setter);
        __publicField(this, "__v_isRef", true);
        __publicField(this, "_value");
        __publicField(this, "_dirty", true);
        __publicField(this, "effect");
        __publicField(this, "dep", /* @__PURE__ */ new Set());
        this.effect = new ReactiveEffect(getter, {
          scheduler: () => {
            if (!this._dirty) {
              this._dirty = true;
              triggerRefValue(this);
            }
          }
        });
      }
      get value() {
        trackRefValue(this);
        if (this._dirty) {
          this._dirty = false;
          this._value = this.effect.run();
        }
        return this._value;
      }
      set value(v) {
        if (this.setter) this.setter(v);
        else warn("computed is read-only when there is no setter.");
      }
      stop() {
        this.effect.stop();
      }
    };
  }
});

// src/runtime/registry.ts
function defineDirective(name, setup, options = {}) {
  directives.set(name, {
    name,
    setup,
    priority: options.priority ?? PRIORITY.DEFAULT,
    terminal: options.terminal ?? false
  });
}
function normalizeComponentName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}
function usePlugin(V2, plugin, options) {
  if (installedPlugins.has(plugin)) return;
  installedPlugins.add(plugin);
  if (typeof plugin === "function") plugin(V2, options);
  else plugin.install(V2, options);
}
var config, directives, PRIORITY, components, installedPlugins;
var init_registry = __esm({
  "src/runtime/registry.ts"() {
    config = {
      prefix: "v-",
      autoStart: true,
      autoDiscover: true,
      root: null,
      devtools: false,
      xrayShortcut: "ctrl+shift+f2",
      baseURL: "",
      globals: {},
      locale: typeof navigator !== "undefined" ? navigator.language || "pt-BR" : "pt-BR",
      currency: "BRL",
      injectStyles: true,
      cleanAttributes: true,
      sanitizeUrls: true
    };
    directives = /* @__PURE__ */ new Map();
    PRIORITY = {
      IGNORE: 100,
      FOR: 90,
      IF: 80,
      DATA: 70,
      COMPONENT: 65,
      REF: 60,
      // Binding comes before model on purpose.
      //
      // `v-model` writes the value to the field, and `:min`, `:max`, `:step` change
      // what the browser accepts as a value. In reverse order, the field would receive
      // the value with the old rules still in place, and the browser itself would round
      // or clamp: `0.12` would become `0` if the previous `step` was `1`.
      BIND: 45,
      MODEL: 40,
      DEFAULT: 0,
      INIT: -10,
      TRANSITION: -20
    };
    components = /* @__PURE__ */ new Map();
    installedPlugins = /* @__PURE__ */ new Set();
  }
});

// src/dom/style.ts
var style_exports = {};
__export(style_exports, {
  BASE_TOKENS: () => BASE_TOKENS,
  ensureTokens: () => ensureTokens,
  injectStyle: () => injectStyle
});
function injectStyle(id, css) {
  if (typeof document === "undefined") return;
  if (!config.injectStyles) return;
  if (injected.has(id)) return;
  injected.add(id);
  const style = document.createElement("style");
  style.setAttribute("data-voodoo", id);
  style.textContent = css;
  document.head.appendChild(style);
}
function ensureTokens() {
  injectStyle("tokens", BASE_TOKENS);
}
var injected, BASE_TOKENS;
var init_style = __esm({
  "src/dom/style.ts"() {
    init_registry();
    injected = /* @__PURE__ */ new Set();
    BASE_TOKENS = `
:root{
  --v-primary:#6D3BF5;
  --v-primary-hover:#5A2FD8;
  --v-primary-contrast:#fff;
  --v-accent:#FF3D8B;
  --v-success:#2ED9A5;
  --v-warning:#FFB35C;
  --v-danger:#FF4D4D;
  --v-info:#9B7BFF;
  --v-surface:#fff;
  --v-surface-2:#FBF7F2;
  --v-text:#14111F;
  --v-text-muted:#6B6580;
  --v-border:#E6E0F0;
  --v-radius:12px;
  --v-radius-sm:8px;
  --v-shadow:0 10px 30px rgba(20,17,31,.14);
  --v-z-modal:1000;
  --v-z-drawer:1000;
  --v-z-dropdown:900;
  --v-z-toast:1100;
  --v-z-tooltip:1200;
  --v-ease:cubic-bezier(.22,1,.36,1);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --v-surface:#1C1830;
    --v-surface-2:#14111F;
    --v-text:#F4F1FB;
    --v-text-muted:#A9A2C4;
    --v-border:#332C50;
    --v-shadow:0 10px 30px rgba(0,0,0,.45);
  }
}
:root[data-theme="dark"]{
  --v-surface:#1C1830;
  --v-surface-2:#14111F;
  --v-text:#F4F1FB;
  --v-text-muted:#A9A2C4;
  --v-border:#332C50;
  --v-shadow:0 10px 30px rgba(0,0,0,.45);
}
[v-cloak]{display:none !important}
`;
  }
});

// src/core.ts
init_reactivity();

// src/parser/lexer.ts
var VoodooSyntaxError = class extends Error {
  constructor(message, source, position) {
    const pointer = `${source}
${" ".repeat(Math.max(0, position))}^`;
    super(`${message}

${pointer}`);
    __publicField(this, "source", source);
    __publicField(this, "position", position);
    this.name = "VoodooSyntaxError";
  }
};
var PUNCTUATORS = [
  ">>>=",
  "===",
  "!==",
  "**=",
  "...",
  ">>>",
  "<<=",
  ">>=",
  "&&=",
  "||=",
  "??=",
  "?.",
  "=>",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "??",
  "**",
  "++",
  "--",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "<",
  ">",
  "=",
  "&",
  "|",
  "^",
  "~",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  ",",
  ".",
  "?",
  ":",
  ";"
];
var IDENT_START = /[A-Za-z_$À-￿]/;
var IDENT_PART = /[A-Za-z0-9_$À-￿]/;
function isIdentStart(ch) {
  return IDENT_START.test(ch);
}
function isIdentPart(ch) {
  return IDENT_PART.test(ch);
}
function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}
var ESCAPES = {
  n: "\n",
  t: "	",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0"
};
function tokenize(source) {
  const tokens = [];
  let i = 0;
  const len = source.length;
  while (i < len) {
    const ch = source[i];
    if (ch === " " || ch === "	" || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\v") {
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      while (i < len && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) throw new VoodooSyntaxError("Unclosed block comment", source, i);
      i = end + 2;
      continue;
    }
    const start2 = i;
    if (isDigit(ch) || ch === "." && isDigit(source[i + 1])) {
      let raw = "";
      if (ch === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        raw = "0x";
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) raw += source[i++];
      } else if (ch === "0" && (source[i + 1] === "b" || source[i + 1] === "B")) {
        raw = "0b";
        i += 2;
        while (i < len && /[01_]/.test(source[i])) raw += source[i++];
      } else if (ch === "0" && (source[i + 1] === "o" || source[i + 1] === "O")) {
        raw = "0o";
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) raw += source[i++];
      } else {
        while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        if (source[i] === ".") {
          raw += source[i++];
          while (i < len && /[0-9_]/.test(source[i])) raw += source[i++];
        }
        if (source[i] === "e" || source[i] === "E") {
          raw += source[i++];
          if (source[i] === "+" || source[i] === "-") raw += source[i++];
          while (i < len && isDigit(source[i])) raw += source[i++];
        }
      }
      const parsed = Number(raw.replace(/_/g, ""));
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Invalid number", source, start2);
      tokens.push({ type: "num", value: raw, parsed, start: start2, end: i });
      continue;
    }
    if (ch === '"' || ch === "'") {
      i++;
      let out = "";
      while (i < len && source[i] !== ch) {
        if (source[i] === "\\") {
          i++;
          const esc = source[i];
          if (esc === "u") {
            if (source[i + 1] === "{") {
              const close = source.indexOf("}", i);
              if (close === -1)
                throw new VoodooSyntaxError("Unclosed Unicode escape", source, start2);
              const digits = source.slice(i + 2, close);
              if (!/^[0-9a-fA-F]+$/.test(digits) || parseInt(digits, 16) > 1114111)
                throw new VoodooSyntaxError(
                  `Invalid Unicode escape "\\u{${digits}}"`,
                  source,
                  i - 1
                );
              out += String.fromCodePoint(parseInt(digits, 16));
              i = close + 1;
            } else {
              const digits = source.slice(i + 1, i + 5);
              if (!/^[0-9a-fA-F]{4}$/.test(digits))
                throw new VoodooSyntaxError(
                  "Invalid Unicode escape: \\u needs 4 hexadecimal digits",
                  source,
                  i - 1
                );
              out += String.fromCharCode(parseInt(digits, 16));
              i += 5;
            }
          } else if (esc === "x") {
            const digits = source.slice(i + 1, i + 3);
            if (!/^[0-9a-fA-F]{2}$/.test(digits))
              throw new VoodooSyntaxError(
                "Invalid hexadecimal escape: \\x needs 2 hexadecimal digits",
                source,
                i - 1
              );
            out += String.fromCharCode(parseInt(digits, 16));
            i += 3;
          } else {
            out += ESCAPES[esc] ?? esc;
            i++;
          }
        } else {
          out += source[i++];
        }
      }
      if (i >= len) throw new VoodooSyntaxError("Unclosed string", source, start2);
      i++;
      tokens.push({ type: "str", value: out, parsed: out, start: start2, end: i });
      continue;
    }
    if (ch === "`") {
      i++;
      const quasis = [];
      const exprs = [];
      let current2 = "";
      while (i < len && source[i] !== "`") {
        if (source[i] === "\\") {
          const esc = source[i + 1];
          current2 += ESCAPES[esc] ?? esc;
          i += 2;
          continue;
        }
        if (source[i] === "$" && source[i + 1] === "{") {
          quasis.push(current2);
          current2 = "";
          i += 2;
          let depth = 1;
          let expr = "";
          while (i < len) {
            const c = source[i];
            if (c === "{") depth++;
            else if (c === "}") {
              depth--;
              if (depth === 0) break;
            } else if (c === '"' || c === "'" || c === "`") {
              const quote = c;
              expr += source[i++];
              while (i < len && source[i] !== quote) {
                if (source[i] === "\\") expr += source[i++];
                expr += source[i++];
              }
            }
            expr += source[i++];
          }
          if (depth !== 0)
            throw new VoodooSyntaxError("Unclosed template interpolation", source, start2);
          i++;
          exprs.push(expr);
          continue;
        }
        current2 += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Unclosed template literal", source, start2);
      i++;
      quasis.push(current2);
      tokens.push({
        type: "tpl",
        value: source.slice(start2, i),
        tpl: { quasis, exprs },
        start: start2,
        end: i
      });
      continue;
    }
    if (isIdentStart(ch)) {
      let name = "";
      while (i < len && isIdentPart(source[i])) name += source[i++];
      tokens.push({ type: "ident", value: name, start: start2, end: i });
      continue;
    }
    let matched;
    for (const p2 of PUNCTUATORS) {
      if (source.startsWith(p2, i)) {
        if (p2 === "?." && isDigit(source[i + 2])) continue;
        matched = p2;
        break;
      }
    }
    if (matched) {
      i += matched.length;
      tokens.push({ type: "punct", value: matched, start: start2, end: i });
      continue;
    }
    throw new VoodooSyntaxError(`Unexpected character "${ch}"`, source, i);
  }
  tokens.push({ type: "eof", value: "", start: len, end: len });
  return tokens;
}

// src/parser/parser.ts
var BINARY_PRECEDENCE = {
  "??": 1,
  "||": 2,
  "&&": 3,
  "|": 4,
  "^": 5,
  "&": 6,
  "==": 7,
  "!=": 7,
  "===": 7,
  "!==": 7,
  "<": 8,
  ">": 8,
  "<=": 8,
  ">=": 8,
  in: 8,
  instanceof: 8,
  "<<": 9,
  ">>": 9,
  ">>>": 9,
  "+": 10,
  "-": 10,
  "*": 11,
  "/": 11,
  "%": 11,
  "**": 12
};
var ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??="]);
var UNARY_OPS = /* @__PURE__ */ new Set(["!", "-", "+", "~", "typeof", "void", "delete"]);
var LITERALS = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  true: true,
  false: false,
  null: null,
  undefined: void 0
});
var MAX_DEPTH = 1200;
var MAX_TEMPLATE_DEPTH = 32;
var templateDepth = 0;
var Parser = class {
  constructor(tokens, source) {
    __publicField(this, "tokens", tokens);
    __publicField(this, "source", source);
    __publicField(this, "pos", 0);
    __publicField(this, "depth", 0);
  }
  peek(offset = 0) {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  next() {
    return this.tokens[this.pos++];
  }
  isPunct(value, offset = 0) {
    const t = this.peek(offset);
    return t.type === "punct" && t.value === value;
  }
  isIdent(value, offset = 0) {
    const t = this.peek(offset);
    return t.type === "ident" && t.value === value;
  }
  expect(value) {
    if (!this.isPunct(value)) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expected "${value}" but found "${t.value || "end of expression"}"`,
        this.source,
        t.start
      );
    }
    return this.next();
  }
  /** Entry point: one or more expressions separated by `;` or `,` at the top. */
  parseProgram() {
    const body = [];
    while (this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  /**
   * Parses the body of an arrow function.
   *
   * A `{` right after `=>` opens a block, as in JavaScript, and the block's
   * last value is what the arrow returns. Without this, the common
   * `(() => { count = 42 })()` failed to parse, because `{` was read as the
   * start of an object literal and `=` inside it made no sense.
   *
   * To return an object literal, wrap it in parentheses exactly as JavaScript
   * requires: `() => ({ a: 1 })`.
   */
  parseArrowBody() {
    if (!this.isPunct("{")) return this.parseAssignment();
    this.next();
    const body = [];
    while (!this.isPunct("}") && this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    this.expect("}");
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  /**
   * One statement. Only `if` needs its own form; everything else in this
   * language is an expression.
   */
  parseStatement() {
    if (this.peek().type === "ident" && this.peek().value === "return") {
      this.next();
      if (this.isPunct(";") || this.isPunct(",") || this.isPunct("}") || this.peek().type === "eof") {
        return { t: "return", a: null };
      }
      return { t: "return", a: this.parseExpression() };
    }
    if (this.peek().type === "ident" && this.peek().value === "if" && this.isPunct("(", 1)) {
      this.next();
      this.expect("(");
      const test = this.parseExpression();
      this.expect(")");
      const cons = this.parseBlockOrStatement();
      let alt = null;
      if (this.peek().type === "ident" && this.peek().value === "else") {
        this.next();
        alt = this.parseBlockOrStatement();
      }
      return { t: "if", test, cons, alt };
    }
    return this.parseExpression();
  }
  /** The body of an `if` or `else`, with or without braces. */
  parseBlockOrStatement() {
    if (!this.isPunct("{")) return this.parseStatement();
    this.next();
    const body = [];
    while (!this.isPunct("}") && this.peek().type !== "eof") {
      body.push(this.parseStatement());
      while (this.isPunct(";") || this.isPunct(",")) this.next();
    }
    this.expect("}");
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  parseExpression() {
    return this.parseAssignment();
  }
  /** Raises recursion level and rejects expression when exceeding limit. */
  enterLevel() {
    if (++this.depth > MAX_DEPTH) {
      const t = this.peek();
      throw new VoodooSyntaxError(
        `Expression too deeply nested (limit of ${MAX_DEPTH} levels)`,
        this.source,
        t.start
      );
    }
  }
  parseAssignment() {
    this.enterLevel();
    const node = this.parseAssignmentInternal();
    this.depth--;
    return node;
  }
  parseAssignmentInternal() {
    if (this.peek().type === "ident" && this.isPunct("=>", 1)) {
      const param = this.next().value;
      this.next();
      return { t: "arrow", params: [{ kind: "id", name: param }], body: this.parseArrowBody() };
    }
    if (this.isPunct("(")) {
      const arrow = this.tryParseParenArrow();
      if (arrow) return arrow;
    }
    const left = this.parseConditional();
    const t = this.peek();
    if (t.type === "punct" && ASSIGN_OPS.has(t.value)) {
      if (left.t !== "id" && left.t !== "member") {
        throw new VoodooSyntaxError("Invalid assignment target", this.source, t.start);
      }
      this.next();
      const value = this.parseAssignment();
      return { t: "assign", op: t.value, target: left, value };
    }
    return left;
  }
  /**
   * Tries to read `( params ) =>`. If what comes after the closing parenthesis
   * is not `=>`, returns to original position and lets normal parsing continue.
   */
  tryParseParenArrow() {
    const start2 = this.pos;
    let depth = 0;
    let i = this.pos;
    for (; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === "punct" && t.value === "(") depth++;
      else if (t.type === "punct" && t.value === ")") {
        depth--;
        if (depth === 0) break;
      } else if (t.type === "eof") break;
    }
    const after = this.tokens[i + 1];
    if (!after || after.type !== "punct" || after.value !== "=>") return null;
    this.next();
    let params;
    try {
      params = this.parseParamList();
    } catch {
      this.pos = start2;
      return null;
    }
    this.expect("=>");
    return { t: "arrow", params, body: this.parseArrowBody() };
  }
  /** Parameters up to the closing parenthesis, which it consumes. */
  parseParamList() {
    const params = [];
    while (!this.isPunct(")")) {
      params.push(this.parseParam());
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect(")");
    return params;
  }
  /**
   * One binding: `x`, `x = 1`, `...xs`, `{ a, b: c = 2 }`, `[a, , b]`.
   *
   * Recursive, so a pattern nests to any depth the way JavaScript's does.
   */
  parseParam() {
    if (this.isPunct("...")) {
      this.next();
      const name = this.next();
      if (name.type !== "ident") {
        throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
      }
      return { kind: "rest", name: name.value };
    }
    let param;
    if (this.isPunct("{")) {
      this.next();
      const props = [];
      let rest;
      while (!this.isPunct("}")) {
        if (this.isPunct("...")) {
          this.next();
          const name = this.next();
          if (name.type !== "ident") {
            throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
          }
          rest = name.value;
        } else {
          const key = this.next();
          if (key.type !== "ident" && key.type !== "str") {
            throw new VoodooSyntaxError("Expected a property name", this.source, key.start);
          }
          const value = this.isPunct(":") ? (this.next(), this.parseParam()) : { kind: "id", name: key.value };
          if (this.isPunct("=")) {
            this.next();
            value.def = this.parseAssignment();
          }
          props.push({ key: String(key.value), value });
        }
        if (this.isPunct(",")) this.next();
        else break;
      }
      this.expect("}");
      param = { kind: "obj", props, rest };
    } else if (this.isPunct("[")) {
      this.next();
      const elements = [];
      let rest;
      while (!this.isPunct("]")) {
        if (this.isPunct(",")) {
          this.next();
          elements.push(null);
          continue;
        }
        if (this.isPunct("...")) {
          this.next();
          const name = this.next();
          if (name.type !== "ident") {
            throw new VoodooSyntaxError("Expected a name after ...", this.source, name.start);
          }
          rest = name.value;
        } else {
          elements.push(this.parseParam());
        }
        if (this.isPunct(",")) this.next();
        else break;
      }
      this.expect("]");
      param = { kind: "arr", elements, rest };
    } else {
      const name = this.next();
      if (name.type !== "ident") {
        throw new VoodooSyntaxError("Expected a parameter name", this.source, name.start);
      }
      param = { kind: "id", name: name.value };
    }
    if (this.isPunct("=")) {
      this.next();
      param.def = this.parseAssignment();
    }
    return param;
  }
  parseConditional() {
    const test = this.parseBinary(0);
    if (this.isPunct("?")) {
      this.next();
      const cons = this.parseAssignment();
      this.expect(":");
      const alt = this.parseAssignment();
      return { t: "cond", test, cons, alt };
    }
    return test;
  }
  parseBinary(minPrec) {
    this.enterLevel();
    const node = this.parseBinaryInternal(minPrec);
    this.depth--;
    return node;
  }
  parseBinaryInternal(minPrec) {
    let left = this.parseUnary();
    for (; ; ) {
      const t = this.peek();
      const op = t.value;
      const isOperator = t.type === "punct" && op in BINARY_PRECEDENCE || t.type === "ident" && (op === "in" || op === "instanceof");
      if (!isOperator) break;
      const prec = BINARY_PRECEDENCE[op];
      if (prec === void 0 || prec <= minPrec) break;
      this.next();
      const right = this.parseBinary(op === "**" ? prec - 1 : prec);
      const kind = op === "&&" || op === "||" || op === "??" ? "logic" : "bin";
      left = { t: kind, op, l: left, r: right };
    }
    return left;
  }
  parseUnary() {
    this.enterLevel();
    const node = this.parseUnaryInternal();
    this.depth--;
    return node;
  }
  parseUnaryInternal() {
    const t = this.peek();
    if ((t.type === "punct" || t.type === "ident") && UNARY_OPS.has(t.value)) {
      this.next();
      return { t: "unary", op: t.value, a: this.parseUnary() };
    }
    if (t.type === "punct" && (t.value === "++" || t.value === "--")) {
      this.next();
      const arg = this.parseUnary();
      return { t: "update", op: t.value, a: arg, prefix: true };
    }
    let expr = this.parseCallMember();
    const post = this.peek();
    if (post.type === "punct" && (post.value === "++" || post.value === "--")) {
      this.next();
      expr = { t: "update", op: post.value, a: expr, prefix: false };
    }
    return expr;
  }
  /**
   * `new X`, `new X(a, b)`, and `new a.b.C(x)`.
   *
   * `new` did not exist here, in the lexer, or in the interpreter. So
   * `new Date(0)` lexed as the identifier `new` followed by `Date(0)`, the
   * parser dropped the dangling identifier, and what ran was `Date(0)`. Called
   * without `new`, `Date` returns a STRING of the current time, so
   * `new Date(0)` produced today's date as text, `new Date(0) instanceof Date`
   * was false, and `new Date(0).getTime()` failed with "getTime is not a
   * function". Three wrong answers, none of them an error.
   *
   * The callee is parsed as a member chain WITHOUT consuming a call, because in
   * JavaScript the argument list binds to the `new`: `new a.b.C(x)` constructs
   * `a.b.C` with `x`, and never calls `a.b.C(x)` and constructs the result. The
   * trailing `(` is then read here, and anything after it, such as
   * `new Date(0).getTime()`, is left to the ordinary member loop below.
   */
  parseNew() {
    this.next();
    const callee = this.parseMemberOnly(this.parsePrimary());
    const args = this.isPunct("(") ? this.parseArguments() : [];
    return { t: "new", callee, args };
  }
  /**
   * Member access only: `.x`, `?.x` and `[x]`, stopping at a call.
   *
   * Used for a `new` callee, where the argument list belongs to the `new`
   * rather than to the expression it is constructing.
   */
  parseMemberOnly(start2) {
    let expr = start2;
    for (; ; ) {
      if (this.isPunct(".")) {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
        }
        expr = { t: "member", o: expr, p: { t: "lit", v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct("[")) {
        this.next();
        const p2 = this.parseExpression();
        this.expect("]");
        expr = { t: "member", o: expr, p: p2, computed: true, opt: false };
      } else {
        return expr;
      }
    }
  }
  parseCallMember() {
    let expr = this.isIdent("new") ? this.parseNew() : this.parsePrimary();
    for (; ; ) {
      if (this.isPunct(".")) {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
        }
        expr = { t: "member", o: expr, p: { t: "lit", v: prop.value }, computed: false, opt: false };
      } else if (this.isPunct("?.")) {
        this.next();
        if (this.isPunct("(")) {
          expr = { t: "call", callee: expr, args: this.parseArguments(), opt: true };
        } else if (this.isPunct("[")) {
          this.next();
          const p2 = this.parseExpression();
          this.expect("]");
          expr = { t: "member", o: expr, p: p2, computed: true, opt: true };
        } else {
          const prop = this.next();
          if (prop.type !== "ident") {
            throw new VoodooSyntaxError("Invalid property name", this.source, prop.start);
          }
          expr = {
            t: "member",
            o: expr,
            p: { t: "lit", v: prop.value },
            computed: false,
            opt: true
          };
        }
      } else if (this.isPunct("[")) {
        this.next();
        const p2 = this.parseExpression();
        this.expect("]");
        expr = { t: "member", o: expr, p: p2, computed: true, opt: false };
      } else if (this.isPunct("(")) {
        expr = { t: "call", callee: expr, args: this.parseArguments(), opt: false };
      } else {
        return expr;
      }
    }
  }
  parseArguments() {
    this.expect("(");
    const args = [];
    while (!this.isPunct(")")) {
      if (this.isPunct("...")) {
        this.next();
        args.push({ t: "unary", op: "...", a: this.parseAssignment() });
      } else {
        args.push(this.parseAssignment());
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect(")");
    return args;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.type === "ident" && t.value === "function") {
      this.next();
      if (this.peek().type === "ident") this.next();
      this.expect("(");
      const params = this.parseParamList();
      return { t: "arrow", params, body: this.parseArrowBody() };
    }
    if (t.type === "num" || t.type === "str") {
      this.next();
      return { t: "lit", v: t.parsed };
    }
    if (t.type === "tpl") {
      this.next();
      const part = t.tpl;
      if (templateDepth >= MAX_TEMPLATE_DEPTH) {
        throw new VoodooSyntaxError(
          `Template literal too deeply nested (limit of ${MAX_TEMPLATE_DEPTH} levels)`,
          this.source,
          t.start
        );
      }
      templateDepth++;
      try {
        return {
          t: "tpl",
          quasis: part.quasis,
          exprs: part.exprs.map((src) => parse(src))
        };
      } finally {
        templateDepth--;
      }
    }
    if (t.type === "ident") {
      if (t.value in LITERALS) {
        this.next();
        return { t: "lit", v: LITERALS[t.value] };
      }
      this.next();
      return { t: "id", n: t.value };
    }
    if (t.type === "punct") {
      if (t.value === "(") {
        this.next();
        const expr = this.parseExpression();
        this.expect(")");
        return expr;
      }
      if (t.value === "[") return this.parseArrayLiteral();
      if (t.value === "{") return this.parseObjectLiteral();
    }
    throw new VoodooSyntaxError(
      `Unexpected token "${t.value || "end of expression"}"`,
      this.source,
      t.start
    );
  }
  parseArrayLiteral() {
    this.expect("[");
    const els = [];
    while (!this.isPunct("]")) {
      if (this.isPunct("...")) {
        this.next();
        els.push({ spread: this.parseAssignment() });
      } else {
        els.push(this.parseAssignment());
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect("]");
    return { t: "arr", els };
  }
  parseObjectLiteral() {
    this.expect("{");
    const props = [];
    while (!this.isPunct("}")) {
      if (this.isPunct("...")) {
        this.next();
        props.push({ key: null, spread: this.parseAssignment() });
      } else if (this.isPunct("[")) {
        this.next();
        const keyExpr = this.parseAssignment();
        this.expect("]");
        this.expect(":");
        props.push({ key: null, keyExpr, value: this.parseAssignment() });
      } else {
        if (this.peek().type === "ident" && this.peek().value === "get" && this.peek(1).type === "ident" && this.isPunct("(", 2)) {
          this.next();
          const nameToken = this.next();
          this.expect("(");
          this.expect(")");
          props.push({
            key: String(nameToken.value),
            getter: true,
            value: { t: "method", params: [], body: this.parseArrowBody() }
          });
          if (this.isPunct(",")) this.next();
          continue;
        }
        const keyToken = this.next();
        if (keyToken.type !== "ident" && keyToken.type !== "str" && keyToken.type !== "num") {
          throw new VoodooSyntaxError("Invalid object key", this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(":")) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
        } else if (this.isPunct("(")) {
          this.next();
          const params = this.parseParamList();
          props.push({ key, value: { t: "method", params, body: this.parseArrowBody() } });
        } else {
          props.push({ key, value: { t: "id", n: key } });
        }
      }
      if (this.isPunct(",")) this.next();
      else break;
    }
    this.expect("}");
    return { t: "obj", props };
  }
};
var cache = /* @__PURE__ */ new Map();
var MAX_CACHE = 2e3;
function parse(source) {
  const cached = cache.get(source);
  if (cached) return cached;
  const node = new Parser(tokenize(source), source).parseProgram();
  if (cache.size >= MAX_CACHE) evictOldest();
  cache.set(source, node);
  return node;
}
function evictOldest() {
  const alvo = Math.floor(MAX_CACHE / 2);
  let removidos = 0;
  for (const chave of cache.keys()) {
    cache.delete(chave);
    if (++removidos >= alvo) break;
  }
}
function clearParseCache() {
  cache.clear();
}

// src/parser/interpreter.ts
var SafeObject = /* @__PURE__ */ Object.freeze({
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  assign: Object.assign,
  is: Object.is,
  hasOwn: Object.hasOwn ?? ((o, k) => Object.prototype.hasOwnProperty.call(o, k))
});
var DELIBERATELY_WITHHELD = /* @__PURE__ */ new Set([
  "eval",
  "Function",
  "window",
  "globalThis",
  "self",
  "top",
  "parent",
  "document",
  "fetch",
  "XMLHttpRequest",
  "importScripts",
  "require",
  "process",
  "Reflect",
  "Proxy",
  "WebAssembly",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
  "location",
  "history",
  "crypto",
  "Worker",
  "SharedWorker",
  "ServiceWorker"
]);
var allowedGlobals = {
  Math,
  JSON,
  Date,
  Number,
  String,
  Boolean,
  Array,
  Object: SafeObject,
  Intl,
  RegExp,
  Promise,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  console
};
var VoodooRuntimeError = class extends Error {
  constructor(message, expression) {
    super(expression ? `${message}

Expression: ${expression}` : message);
    __publicField(this, "expression", expression);
    this.name = "VoodooRuntimeError";
  }
};
var SPREAD = /* @__PURE__ */ Symbol("spread");
var ReturnSignal = class {
  constructor(value) {
    __publicField(this, "value", value);
  }
};
function unwrap(value) {
  return value instanceof ReturnSignal ? value.value : value;
}
var BLOCKED_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function chaveBloqueada(key) {
  return typeof key === "string" && BLOCKED_KEYS.has(key);
}
function checkKey(key, expression) {
  if (chaveBloqueada(key)) {
    throw new VoodooRuntimeError(
      `Access blocked to "${String(key)}": template expressions cannot reach the prototype chain. Expose a method in state instead.`,
      expression
    );
  }
  return key;
}
function evaluate(node, scope) {
  switch (node.t) {
    case "lit":
      return node.v;
    case "tpl": {
      let out = node.quasis[0] ?? "";
      for (let i = 0; i < node.exprs.length; i++) {
        out += stringify(evaluate(node.exprs[i], scope));
        out += node.quasis[i + 1] ?? "";
      }
      return out;
    }
    case "id": {
      checkKey(node.n);
      const owner = scope.lookup(node.n);
      if (owner) return owner[node.n];
      if (node.n in allowedGlobals) return allowedGlobals[node.n];
      return void 0;
    }
    case "member": {
      const obj = evaluate(node.o, scope);
      if (obj == null) {
        if (node.opt) return void 0;
        throw new VoodooRuntimeError(
          `Could not read "${describeKey(node, scope)}" from ${obj === null ? "null" : "undefined"}`
        );
      }
      const key = checkKey(
        node.computed ? evaluate(node.p, scope) : node.p.v
      );
      return obj[key];
    }
    case "new": {
      const target = evaluate(node.callee, scope);
      if (typeof target !== "function") {
        throw new VoodooRuntimeError(
          `Cannot construct ${stringify(target)}: it is not a constructor`
        );
      }
      if (target === Function) {
        throw new VoodooRuntimeError("Cannot construct Function: expressions never compile code");
      }
      const args = evalArgs(node.args, scope);
      return Reflect.construct(target, args);
    }
    case "call": {
      let thisArg;
      let fn;
      if (node.callee.t === "member") {
        const obj = evaluate(node.callee.o, scope);
        if (obj == null) {
          if (node.callee.opt || node.opt) return void 0;
          throw new VoodooRuntimeError(
            `Could not call "${describeKey(node.callee, scope)}" from ${obj === null ? "null" : "undefined"}`
          );
        }
        const key = checkKey(
          node.callee.computed ? evaluate(node.callee.p, scope) : node.callee.p.v
        );
        thisArg = obj;
        fn = obj[key];
      } else if (node.callee.t === "id") {
        checkKey(node.callee.n);
        const owner = scope.lookup(node.callee.n);
        if (owner) {
          thisArg = owner;
          fn = owner[node.callee.n];
        } else {
          fn = allowedGlobals[node.callee.n];
        }
      } else {
        fn = evaluate(node.callee, scope);
      }
      if (fn == null && node.opt) return void 0;
      if (typeof fn !== "function") {
        const name = node.callee.t === "id" ? node.callee.n : describeKey(node.callee, scope);
        if (node.callee.t === "id" && !scope.lookup(name) && !(name in allowedGlobals)) {
          if (DELIBERATELY_WITHHELD.has(name)) {
            throw new VoodooRuntimeError(
              `"${name}" is blocked. Expressions run in a sandbox without access to it.`
            );
          }
          throw new VoodooRuntimeError(
            `"${name}" was not found. Expressions cannot reach window: expose it with V.config.globals.${name} = ..., or put it in scope with V.data({ ${name} }).`
          );
        }
        throw new VoodooRuntimeError(`"${name}" is not a function`);
      }
      return fn.apply(thisArg, evalArgs(node.args, scope));
    }
    case "unary": {
      if (node.op === "...") return { [SPREAD]: evaluate(node.a, scope) };
      if (node.op === "delete") {
        if (node.a.t !== "member") {
          throw new VoodooRuntimeError(
            "delete needs a property, as in `delete user.name` or `delete list[0]`"
          );
        }
        const owner = evaluate(node.a.o, scope);
        if (owner == null) return true;
        const key = checkKey(
          node.a.computed ? evaluate(node.a.p, scope) : node.a.p.v
        );
        return delete owner[key];
      }
      if (node.op === "typeof") {
        if (node.a.t === "id") {
          if (chaveBloqueada(node.a.n)) return "undefined";
          const owner = scope.lookup(node.a.n);
          const value = owner ? owner[node.a.n] : allowedGlobals[node.a.n];
          return typeof value;
        }
        return typeof evaluate(node.a, scope);
      }
      const v = evaluate(node.a, scope);
      switch (node.op) {
        case "!":
          return !v;
        case "-":
          return -v;
        case "+":
          return +v;
        case "~":
          return ~v;
        case "void":
          return void 0;
      }
      throw new VoodooRuntimeError(`Unsupported unary operator: ${node.op}`);
    }
    case "update": {
      const old = Number(evaluate(node.a, scope));
      const updated = node.op === "++" ? old + 1 : old - 1;
      assign(node.a, updated, scope);
      return node.prefix ? updated : old;
    }
    case "bin": {
      const l = evaluate(node.l, scope);
      const r = evaluate(node.r, scope);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
        case "**":
          return l ** r;
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case "===":
          return l === r;
        case "!==":
          return l !== r;
        case "<":
          return l < r;
        case ">":
          return l > r;
        case "<=":
          return l <= r;
        case ">=":
          return l >= r;
        case "in":
          return l in r;
        case "instanceof":
          return l instanceof r;
        // The bitwise operators coerce through ToInt32, and `>>>` through
        // ToUint32, which is why the two shifts disagree for negatives:
        // `-1 >> 0` is -1 and `-1 >>> 0` is 4294967295. Applying the JavaScript
        // operator directly gets that for free; hand-rolling the coercion is
        // how an implementation ends up subtly wrong on exactly those cases.
        case "&":
          return l & r;
        case "|":
          return l | r;
        case "^":
          return l ^ r;
        case "<<":
          return l << r;
        case ">>":
          return l >> r;
        case ">>>":
          return l >>> r;
      }
      throw new VoodooRuntimeError(`Unsupported operator: ${node.op}`);
    }
    case "logic": {
      const l = evaluate(node.l, scope);
      if (node.op === "&&") return l ? evaluate(node.r, scope) : l;
      if (node.op === "||") return l ? l : evaluate(node.r, scope);
      return l ?? evaluate(node.r, scope);
    }
    case "cond":
      return evaluate(node.test, scope) ? evaluate(node.cons, scope) : evaluate(node.alt, scope);
    case "assign": {
      let value;
      if (node.op === "=") {
        value = evaluate(node.value, scope);
      } else if (node.op === "&&=" || node.op === "||=" || node.op === "??=") {
        const current2 = evaluate(node.target, scope);
        const shouldAssign = node.op === "&&=" ? !!current2 : node.op === "||=" ? !current2 : current2 == null;
        if (!shouldAssign) return current2;
        value = evaluate(node.value, scope);
      } else {
        const current2 = evaluate(node.target, scope);
        const operand = evaluate(node.value, scope);
        switch (node.op) {
          case "+=":
            value = current2 + operand;
            break;
          case "-=":
            value = current2 - operand;
            break;
          case "*=":
            value = current2 * operand;
            break;
          case "/=":
            value = current2 / operand;
            break;
          case "%=":
            value = current2 % operand;
            break;
          case "**=":
            value = current2 ** operand;
            break;
          default:
            throw new VoodooRuntimeError(`Unsupported assignment: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }
    case "if": {
      if (evaluate(node.test, scope)) return evaluate(node.cons, scope);
      return node.alt ? evaluate(node.alt, scope) : void 0;
    }
    case "method": {
      const methodParams = node.params;
      const methodBody = node.body;
      return function(...args) {
        const vars = bindParams(methodParams, args, scope);
        const owner = this;
        const base = owner !== null && typeof owner === "object" ? scope.child(owner) : scope;
        return unwrap(evaluate(methodBody, base.child(vars)));
      };
    }
    case "arrow": {
      const params = node.params;
      const body = node.body;
      return (...args) => unwrap(evaluate(body, scope.child(bindParams(params, args, scope))));
    }
    case "obj": {
      const out = {};
      for (const prop of node.props) {
        if (prop.spread) {
          Object.assign(out, evaluate(prop.spread, scope));
        } else {
          const key = checkKey(
            prop.key !== null ? prop.key : String(evaluate(prop.keyExpr, scope))
          );
          if (prop.getter) {
            const compute = evaluate(prop.value, scope);
            Object.defineProperty(out, key, {
              enumerable: true,
              configurable: true,
              get() {
                return compute.call(this);
              }
            });
            continue;
          }
          out[key] = evaluate(prop.value, scope);
        }
      }
      return out;
    }
    case "arr": {
      const out = [];
      for (const el of node.els) {
        if (el && typeof el === "object" && "spread" in el) {
          out.push(...evaluate(el.spread, scope));
        } else {
          out.push(evaluate(el, scope));
        }
      }
      return out;
    }
    case "return":
      return new ReturnSignal(node.a ? evaluate(node.a, scope) : void 0);
    case "seq": {
      let last;
      for (const stmt of node.body) {
        last = evaluate(stmt, scope);
        if (last instanceof ReturnSignal) return last;
      }
      return last;
    }
  }
  throw new VoodooRuntimeError(`Unknown node: ${node.t}`);
}
function bindParam(param, value, vars, scope) {
  if (param.kind === "rest") {
    vars[param.name] = value;
    return;
  }
  if (param.def !== void 0 && value === void 0) {
    value = evaluate(param.def, scope.child(vars));
  }
  if (param.kind === "id") {
    vars[param.name] = value;
    return;
  }
  if (param.kind === "obj") {
    if (value == null) {
      throw new VoodooRuntimeError(
        `Cannot destructure ${value === null ? "null" : "undefined"}`
      );
    }
    const taken = /* @__PURE__ */ new Set();
    for (const { key, value: inner } of param.props) {
      taken.add(key);
      bindParam(inner, value[checkKey(key)], vars, scope);
    }
    if (param.rest) {
      const rest = {};
      for (const key of Object.keys(value)) {
        if (!taken.has(key)) rest[key] = value[key];
      }
      vars[param.rest] = rest;
    }
    return;
  }
  const items = Array.isArray(value) ? value : Array.from(value);
  param.elements.forEach((element, index) => {
    if (element) bindParam(element, items[index], vars, scope);
  });
  if (param.rest) vars[param.rest] = items.slice(param.elements.length);
}
function bindParams(params, args, scope) {
  const vars = {};
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    bindParam(param, param.kind === "rest" ? args.slice(i) : args[i], vars, scope);
  }
  return vars;
}
function evalArgs(args, scope) {
  const out = [];
  for (const arg of args) {
    const value = evaluate(arg, scope);
    if (value && typeof value === "object" && SPREAD in value) {
      out.push(...value[SPREAD]);
    } else {
      out.push(value);
    }
  }
  return out;
}
function assign(target, value, scope) {
  if (target.t === "id") {
    checkKey(target.n);
    scope.set(target.n, value);
    return;
  }
  if (target.t === "member") {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError("Could not write to null or undefined");
    }
    const key = checkKey(
      target.computed ? evaluate(target.p, scope) : target.p.v
    );
    obj[key] = value;
    return;
  }
  throw new VoodooRuntimeError("Invalid assignment target");
}
function describeKey(node, scope) {
  if (node.t === "member") {
    return node.computed ? String(evaluate(node.p, scope)) : String(node.p.v);
  }
  if (node.t === "id") return node.n;
  return "value";
}
function stringify(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// src/core.ts
init_registry();

// src/runtime/scope.ts
init_reactivity();
var magics = /* @__PURE__ */ new Map();
function magic(name, getter) {
  magics.set(name.startsWith("$") ? name : `$${name}`, getter);
}
var Scope = class _Scope {
  // Assignment order matches the order the fields were declared in before, so
  // the properties are created in the same sequence they always were.
  constructor(data2 = {}, parent = null, el = null) {
    this.refs = {};
    this.component = null;
    this.provides = null;
    this.magicCache = null;
    this.data = data2;
    this.parent = parent;
    this.el = el;
  }
  /** Root scope of the chain. */
  get root() {
    let s = this;
    while (s.parent) s = s.parent;
    return s;
  }
  /** Look up a `provide` value by traveling up the scope chain. */
  inject(key, fallback) {
    let s = this;
    while (s) {
      if (s.provides && key in s.provides) return s.provides[key];
      s = s.parent;
    }
    return fallback;
  }
  /** Nearest component scope, traveling up the chain. */
  get owner() {
    let s = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }
  /** Set of visible refs, merging ancestor scopes. */
  get allRefs() {
    const chain = [];
    let s = this;
    while (s) {
      chain.unshift(s);
      s = s.parent;
    }
    const out = {};
    for (const scope of chain) Object.assign(out, scope.refs);
    return out;
  }
  lookup(name) {
    let s = this;
    while (s) {
      if (name in s.data) return s.data;
      s = s.parent;
    }
    if (name.charCodeAt(0) === 36 && magics.has(name)) {
      return this.magicContainer(name);
    }
    return void 0;
  }
  has(name) {
    return this.lookup(name) !== void 0;
  }
  get(name) {
    const owner = this.lookup(name);
    return owner ? owner[name] : void 0;
  }
  set(name, value) {
    let s = this;
    while (s) {
      if (name in s.data) {
        s.data[name] = value;
        return;
      }
      s = s.parent;
    }
    this.data[name] = value;
  }
  child(vars = {}, el = null) {
    return new _Scope(vars, this, el ?? this.el);
  }
  /** Create a reactive child scope, used by `v-data` and `v-for`. */
  reactiveChild(vars, el = null) {
    return new _Scope(reactive(vars), this, el ?? this.el);
  }
  magicContainer(name) {
    if (!this.magicCache) this.magicCache = /* @__PURE__ */ new Map();
    const cached = this.magicCache.get(name);
    if (cached) return cached;
    const getter = magics.get(name);
    const scope = this;
    const container2 = {};
    Object.defineProperty(container2, name, {
      get: () => getter(scope),
      set: (value) => {
        const target = getter(scope);
        if (target && typeof target === "object" && "set" in target) {
          target.set(value);
        }
      },
      enumerable: true,
      configurable: true
    });
    this.magicCache.set(name, container2);
    return container2;
  }
};
var rootScope = new Scope(reactive({}));

// src/runtime/walker.ts
init_reactivity();
init_registry();

// src/runtime/avisos.ts
init_registry();
function inDevelopment() {
  return config.devtools === true;
}
function describeElement(el) {
  if (!el) return "(no element)";
  let out = el.tagName.toLowerCase();
  if (el.id) out += `#${el.id}`;
  const classes = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean);
  if (classes.length) out += `.${classes.slice(0, 2).join(".")}`;
  return `<${out}>`;
}
function warn2(message) {
  if (!inDevelopment()) return;
  console.warn(`[Voodoo] ${message}`);
}
var alreadyWarned = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (!inDevelopment()) return;
  if (alreadyWarned.has(key)) return;
  alreadyWarned.add(key);
  console.warn(`[Voodoo] ${message}`);
}
var AUXILIARY_ATTRIBUTES = /* @__PURE__ */ new Set([
  "confirm-title",
  "confirm-label",
  "confirm-cancel",
  "hold-duration"
]);
function warnUnknownDirective(el, raw, name) {
  if (!inDevelopment()) return;
  if (AUXILIARY_ATTRIBUTES.has(name)) return;
  warnOnce(
    `unknown-directive:${name}`,
    `unknown directive "${raw}" at ${describeElement(el)}. No directive named "${name}" was registered. Check the spelling or register with V.directive("${name}", ...).`
  );
}
function warnUnknownComponent(el, name) {
  warnOnce(
    `unknown-component:${name}`,
    `component "${name}" not registered at ${describeElement(el)}. Register with V.component("${name}", { ... }) before using the tag, or remove the attribute to leave the element as plain HTML.`
  );
}
function warnInvalidExpression(el, raw, expression, err) {
  if (!inDevelopment()) return;
  const reason = err instanceof Error ? err.message.split("\n")[0] : String(err);
  warn2(
    `invalid expression in ${raw}="${expression}" on element ${describeElement(el)}.
Reason: ${reason}
Suggestion: attribute expressions accept a single value. If the logic spans more than one line, move it to a component method and call the method here.`
  );
}
function warnDuplicateKey(el, key, expression) {
  if (!inDevelopment()) return;
  warn2(
    `duplicate key "${String(key)}" in v-for="${expression}" on element ${describeElement(el)}. Two rows with the same key cause the list to reuse the wrong block when reordering. Use a unique key, like the item id.`
  );
}
function warnRequiredProp(el, component, prop) {
  if (!inDevelopment()) return;
  warn2(
    `required prop "${prop}" missing from component "${component}" at ${describeElement(el)}. Pass the value on the tag with ${prop}="..." for a fixed value or :${prop}="expression" for a state value.`
  );
}
function warnAlias(alias, canonical) {
  warnOnce(
    `alias:${alias}`,
    `"${alias}" is an alias for "${canonical}" and still works, but the official name is "${canonical}". Prefer "${canonical}" in new code.`
  );
}

// src/runtime/walker.ts
var nodeScopes = /* @__PURE__ */ new WeakMap();
var nodeCleanups = /* @__PURE__ */ new WeakMap();
var initialized = /* @__PURE__ */ new WeakSet();
var nodeEffectScopes = /* @__PURE__ */ new WeakMap();
function isInitialized(node) {
  return initialized.has(node);
}
function markInitialized(node) {
  initialized.add(node);
}
function getScope(node) {
  return nodeScopes.get(node);
}
function findScope(node) {
  let current2 = node;
  while (current2) {
    const scope = nodeScopes.get(current2);
    if (scope) return scope;
    current2 = current2.parentNode;
  }
  return rootScope;
}
function trackEffectScope(node, scope) {
  let list = nodeEffectScopes.get(node);
  if (!list) nodeEffectScopes.set(node, list = []);
  list.push(scope);
}
var ignoredRemovals = /* @__PURE__ */ new WeakSet();
function removeQuietly(node) {
  ignoredRemovals.add(node);
  node.remove();
}
function addCleanup(node, fn) {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, list = []);
  list.push(fn);
}
function destroy(node) {
  if (node.nodeType === 1) {
    const children = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1 || child.nodeType === 3) children.push(child);
    }
    for (let i = children.length - 1; i >= 0; i--) destroy(children[i]);
  }
  const list = nodeCleanups.get(node);
  if (list) {
    nodeCleanups.delete(node);
    for (let i = list.length - 1; i >= 0; i--) {
      try {
        list[i]();
      } catch (err) {
        handleError(err, "cleanup");
      }
    }
  }
  if (node.nodeType === 1) unindexElement(node);
  nodeScopes.delete(node);
  nodeEffectScopes.delete(node);
  initialized.delete(node);
}
var parsedAttributes = /* @__PURE__ */ new Map();
var MAX_PARSED_ATTRIBUTES = 4e3;
function parseAttribute(name, value) {
  const cacheKey2 = `${name}\0${value}`;
  const hit = parsedAttributes.get(cacheKey2);
  if (hit !== void 0) return hit;
  const parsed = parseAttributeUncached(name, value);
  if (parsedAttributes.size >= MAX_PARSED_ATTRIBUTES) parsedAttributes.clear();
  parsedAttributes.set(cacheKey2, parsed);
  return parsed;
}
function parseAttributeUncached(name, value) {
  const prefix = config.prefix;
  let body;
  if (name.startsWith("@")) {
    body = `on:${name.slice(1)}`;
  } else if (name.startsWith(":") && name.length > 1) {
    body = `bind:${name.slice(1)}`;
  } else if (name.startsWith(".") && name.length > 1) {
    body = `bind:${name.slice(1)}.prop`;
  } else if (name.startsWith(prefix)) {
    body = name.slice(prefix.length);
  } else if (name.startsWith("data-v-")) {
    body = name.slice("data-v-".length);
  } else {
    return null;
  }
  if (!body) return null;
  const parts = body.split(".");
  const head = parts.shift();
  const modifiers = {};
  for (const mod of parts) {
    const eq = mod.indexOf("=");
    if (eq > -1) modifiers[mod.slice(0, eq)] = mod.slice(eq + 1);
    else modifiers[mod] = true;
  }
  const colon = head.indexOf(":");
  const directiveName = colon > -1 ? head.slice(0, colon) : head;
  const arg = colon > -1 ? head.slice(colon + 1) : void 0;
  return { raw: name, name: directiveName, arg, modifiers, expression: value };
}
function collectDirectives(el) {
  const out = [];
  const cache3 = attributeCache.get(el);
  if (cache3 && cache3.size) {
    for (const [name, value] of cache3) {
      const parsed = parseAttribute(name, value);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  } else {
    const names2 = attributeNames(el);
    for (let i = 0; i < names2.length; i++) {
      const name = names2[i];
      if (!looksLikeDirective(name)) continue;
      const parsed = parseAttribute(name, el.getAttribute(name));
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  }
  if (out.length < 2) return out;
  return out.sort((a, b) => priorityOf(b) - priorityOf(a));
}
var canListAttributeNames = typeof Element !== "undefined" && !!Element.prototype.getAttributeNames;
function attributeNames(el) {
  if (canListAttributeNames) return el.getAttributeNames();
  return Array.from(el.attributes, (a) => a.name);
}
function looksLikeDirective(name) {
  return isVoodooAttribute(name) || name.charCodeAt(0) === 46 && name.length > 1;
}
function priorityOf(attr2) {
  return directives.get(attr2.name)?.priority ?? 0;
}
var directiveIndex = /* @__PURE__ */ new Map();
var directiveNamesOf = /* @__PURE__ */ new WeakMap();
function indexDirective(el, name) {
  let set2 = directiveIndex.get(name);
  if (!set2) directiveIndex.set(name, set2 = /* @__PURE__ */ new Set());
  set2.add(el);
  let names2 = directiveNamesOf.get(el);
  if (!names2) directiveNamesOf.set(el, names2 = /* @__PURE__ */ new Set());
  names2.add(name);
}
function unindexElement(el) {
  const names2 = directiveNamesOf.get(el);
  if (!names2) return;
  for (const name of names2) directiveIndex.get(name)?.delete(el);
  directiveNamesOf.delete(el);
}
function hasDirective(el, name) {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
function queryDirective(root, name) {
  const out = [];
  const set2 = directiveIndex.get(name);
  const root_ = root;
  if (set2) {
    for (const el of set2) {
      if (!el.isConnected) continue;
      if (root_.contains && root_.contains(el) && el !== root_) out.push(el);
    }
  }
  const seen = new Set(out);
  for (const el of Array.from(
    root.querySelectorAll(`[${config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (seen.has(el)) continue;
    seen.add(el);
    out.push(el);
  }
  out.sort(
    (a, b) => a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}
function closestDirective(el, name) {
  let current2 = el;
  while (current2) {
    if (hasDirective(current2, name)) return current2;
    current2 = current2.parentElement;
  }
  return null;
}
var attributeCache = /* @__PURE__ */ new WeakMap();
function isVoodooAttribute(name) {
  return name.startsWith(config.prefix) || name.startsWith("data-v-") || name.charCodeAt(0) === 64 || name.charCodeAt(0) === 58 && name.length > 1;
}
function readAttr(el, name) {
  const cached = attributeCache.get(el)?.get(name);
  if (cached !== void 0) return cached;
  return el.getAttribute(name);
}
function hasAttr(el, name) {
  const map = attributeCache.get(el);
  if (map?.has(name)) return true;
  return el.hasAttribute(name);
}
function originalAttributes(el) {
  const map = attributeCache.get(el);
  if (map) return new Map(map);
  const out = /* @__PURE__ */ new Map();
  for (let i = 0; i < el.attributes.length; i++) {
    const attr2 = el.attributes[i];
    if (isVoodooAttribute(attr2.name)) out.set(attr2.name, attr2.value);
  }
  return out;
}
function stripAttributes(el) {
  if (!config.cleanAttributes) return;
  const names2 = attributeNames(el);
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, map = /* @__PURE__ */ new Map());
  for (let i = 0; i < names2.length; i++) {
    const name = names2[i];
    if (!isVoodooAttribute(name)) continue;
    map.set(name, el.getAttribute(name));
    el.removeAttribute(name);
  }
}
function restoreAttributes(el) {
  const map = attributeCache.get(el);
  if (!map) return;
  for (const [name, value] of map) {
    if (el.hasAttribute(name)) continue;
    try {
      el.setAttribute(name, value);
    } catch {
    }
  }
}
function hasDirectives(el) {
  const attrs = el.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const n = attrs[i].name;
    if (n.startsWith(config.prefix) || n.charCodeAt(0) === 64 || n.charCodeAt(0) === 58 || n.startsWith("data-v-")) {
      return true;
    }
  }
  return false;
}
function evaluateIn(expression, scope, context, el) {
  if (!expression) return void 0;
  try {
    return evaluate(parse(expression), scope);
  } catch (err) {
    if (inDevelopment()) {
      warnInvalidExpression(el ?? scope.el, context ?? "expression", expression, err);
    }
    handleError(err, context ? `${context} ("${expression}")` : `expression "${expression}"`);
    return void 0;
  }
}
var skipChildren = /* @__PURE__ */ new WeakSet();
function markSkipChildren(el) {
  skipChildren.add(el);
}
function runDirective(el, attr2, scope) {
  const def = directives.get(attr2.name);
  if (!def) {
    if (inDevelopment() && attr2.raw.startsWith(config.prefix)) {
      warnUnknownDirective(el, attr2.raw, attr2.name);
    }
    return;
  }
  let scopeOwner = null;
  const ownerScope = () => {
    if (!scopeOwner) {
      const created = scopeOwner = new EffectScope(true);
      addCleanup(el, () => created.stop());
      trackEffectScope(el, created);
    }
    return scopeOwner;
  };
  const ctx = {
    el,
    scope,
    expression: attr2.expression,
    arg: attr2.arg,
    modifiers: attr2.modifiers,
    raw: attr2.raw,
    evaluate(expression) {
      return evaluateIn(expression ?? attr2.expression, scope, attr2.raw, el);
    },
    effect(fn) {
      const owner = ownerScope();
      owner.run(() => effect(fn, { scope: owner }));
    },
    cleanup(fn) {
      addCleanup(el, fn);
    },
    walk(node, childScope) {
      walk(node, childScope);
    }
  };
  try {
    def.setup(ctx);
  } catch (err) {
    handleError(err, `directive ${attr2.raw}`);
  }
}
var componentMounter = null;
function setComponentMounter(fn) {
  componentMounter = fn;
}
var HTML_SKIP = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
function walk(node, scope) {
  const activeScope2 = scope ?? findScope(node.parentNode);
  if (node.nodeType === 11) {
    const children = Array.from(node.childNodes);
    for (const child of children) walk(child, activeScope2);
    return;
  }
  if (node.nodeType === 3) {
    bindTextNode(node, activeScope2);
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node;
  if (initialized.has(el)) return;
  const tag = el.tagName;
  if (HTML_SKIP.has(tag)) return;
  if (el.hasAttribute(`${config.prefix}ignore`) || el.hasAttribute(`${config.prefix}pre`)) {
    initialized.add(el);
    return;
  }
  let current2 = activeScope2;
  const attrs = collectDirectives(el);
  const tagComponent = components.size === 0 && componentAliases.size === 0 ? null : el.hasAttribute(`${config.prefix}component`) ? null : resolveComponentTag(tag);
  if (attrs.length === 0 && !tagComponent) {
    walkChildren(el, current2);
    return;
  }
  initialized.add(el);
  for (const attr2 of attrs) {
    const def = directives.get(attr2.name);
    if (def?.terminal) {
      runDirective(el, attr2, current2);
      return;
    }
  }
  const dataAttr = attrs.find((a) => a.name === "data");
  const componentAttr = attrs.find((a) => a.name === "component");
  const componentName = componentAttr ? componentAttr.expression || "" : tagComponent || "";
  let mountedComponent = false;
  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current2);
    if (created) {
      current2 = created;
      mountedComponent = true;
      nodeScopes.set(el, current2);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn(dataAttr.expression || "{}", current2, "v-data") : {};
    current2 = current2.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
    nodeScopes.set(el, current2);
  }
  const attributeScope = mountedComponent ? activeScope2 : current2;
  for (const attr2 of attrs) {
    if (attr2.name === "data" || attr2.name === "component") continue;
    runDirective(el, attr2, attributeScope);
  }
  stripAttributes(el);
  if (!skipChildren.has(el)) walkChildren(el, current2);
}
function walkChildren(el, scope) {
  const list = [];
  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child, scope);
  }
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}
var EXPRESSION_LIMIT = 500;
var validExpressions = /* @__PURE__ */ new Map();
function looksLikeExpression(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const cached = validExpressions.get(trimmed);
  if (cached !== void 0) return cached;
  let valid = true;
  try {
    valid = parse(trimmed).t !== "seq";
  } catch {
    valid = false;
  }
  validExpressions.set(trimmed, valid);
  return valid;
}
function closeBrace(source, start2) {
  let level = 0;
  let quote = null;
  for (let i = start2; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") level++;
    else if (c === "}") {
      level--;
      if (level === 0) return i;
    }
  }
  return -1;
}
function sliceText(raw) {
  const segments = [];
  let literal = "";
  let i = 0;
  const saveLiteral = () => {
    if (literal) segments.push({ text: literal });
    literal = "";
  };
  while (i < raw.length) {
    const open = raw.indexOf("{", i);
    if (open === -1) {
      literal += raw.slice(i);
      break;
    }
    literal += raw.slice(i, open);
    const double = raw[open + 1] === "{";
    const close = double ? raw.indexOf("}}", open + 2) : closeBrace(raw, open);
    if (close === -1) {
      literal += raw[open];
      i = open + 1;
      continue;
    }
    const expression = double ? raw.slice(open + 2, close) : raw.slice(open + 1, close);
    const end = double ? close + 2 : close + 1;
    const fits = double || expression.length <= EXPRESSION_LIMIT;
    if (fits && looksLikeExpression(expression)) {
      saveLiteral();
      segments.push({
        expression: expression.trim(),
        raw: raw.slice(open, end),
        explicit: double
      });
      i = end;
      continue;
    }
    literal += raw[open];
    i = open + 1;
  }
  saveLiteral();
  return segments;
}
var NO_INTERPOLATION = /* @__PURE__ */ new Set(["PRE", "CODE", "SCRIPT", "STYLE", "TEXTAREA"]);
function keepsLiteral(segment, value, scope) {
  if (segment.explicit || segment.raw === void 0) return false;
  let node;
  try {
    node = parse(segment.expression);
  } catch {
    return true;
  }
  if (node.t === "lit") return true;
  if (value !== void 0) return false;
  if (node.t === "id") return scope.lookup(node.n) === void 0 && !(node.n in allowedGlobals);
  return false;
}
function bindTextNode(node, scope) {
  const raw = node.textContent;
  if (!raw || raw.indexOf("{") === -1) return;
  if (initialized.has(node)) return;
  let ancestor = node.parentElement;
  while (ancestor) {
    if (NO_INTERPOLATION.has(ancestor.tagName)) return;
    if (ancestor.hasAttribute(`${config.prefix}ignore`) || ancestor.hasAttribute(`${config.prefix}pre`) || ancestor.hasAttribute("data-v-ignore") || ancestor.hasAttribute("data-v-pre")) {
      return;
    }
    ancestor = ancestor.parentElement;
  }
  const segments = sliceText(raw);
  if (!segments.some((s) => s.expression)) return;
  initialized.add(node);
  const owner = new EffectScope(true);
  addCleanup(node, () => owner.stop());
  trackEffectScope(node, owner);
  owner.run(
    () => effect(() => {
      let out = "";
      for (const segment of segments) {
        if (segment.text !== void 0) {
          out += segment.text;
          continue;
        }
        const value = evaluateIn(segment.expression, scope, "interpolation");
        out += keepsLiteral(segment, value, scope) ? segment.raw : stringify(value);
      }
      if (node.textContent !== out) node.textContent = out;
    }, { scope: owner })
  );
}
function markNodeScope(node, scope) {
  nodeScopes.set(node, scope);
}
function resolveComponentTag(tagName) {
  const lower = tagName.toLowerCase();
  if (components.has(lower)) return lower;
  const alias = componentAliases.get(lower);
  return alias ?? null;
}
var componentAliases = /* @__PURE__ */ new Map();
var started = false;
var observer = null;
function start(root) {
  if (typeof document === "undefined") return;
  const target = root ?? config.root ?? document.body;
  if (!target) return;
  Object.assign(allowedGlobals, config.globals);
  walk(target, rootScope);
  if (!started) {
    started = true;
    if (config.autoDiscover) observeDOM(target);
    document.dispatchEvent(new CustomEvent("voodoo:ready", { detail: { root: target } }));
  }
}
function observeDOM(target) {
  if (typeof MutationObserver === "undefined") return;
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (let i = 0; i < mutation.removedNodes.length; i++) {
        const removed = mutation.removedNodes[i];
        if (ignoredRemovals.has(removed)) {
          ignoredRemovals.delete(removed);
          continue;
        }
        if (removed.nodeType === 1 && !removed.isConnected) destroy(removed);
      }
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const added = mutation.addedNodes[i];
        if (added.nodeType !== 1) continue;
        if (initialized.has(added)) continue;
        walk(added, findScope(added.parentNode));
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
}
function stopObserving() {
  observer?.disconnect();
  observer = null;
  started = false;
}
function refresh(root) {
  walk(root ?? document.body, root ? findScope(root.parentNode) : rootScope);
}

// src/runtime/component.ts
init_reactivity();
init_registry();
var instances = /* @__PURE__ */ new Set();
var injectedStyles = /* @__PURE__ */ new Set();
function defineComponent(name, definition) {
  const normalized = normalizeComponentName(name);
  components.set(normalized, definition);
  componentAliases.set(normalized.replace(/-/g, ""), normalized);
  mountPending(normalized);
}
function mountPending(normalized) {
  if (typeof document === "undefined" || !document.body) return;
  const noHyphen = normalized.replace(/-/g, "");
  const selectors = [normalized, noHyphen, `[${config.prefix}component="${normalized}"]`];
  for (const selector of selectors) {
    let found;
    try {
      found = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    for (const el of found) {
      if (getScope(el)?.component) continue;
      if (hasPendingAncestor(el)) continue;
      const scope = findScope(el.parentNode);
      if (isInitialized(el)) {
        destroy(el);
        restoreAttributes(el);
      }
      walk(el, scope);
    }
  }
}
function hasPendingAncestor(el) {
  let current2 = el.parentElement;
  while (current2 && current2 !== document.body) {
    if (hasDirectives(current2) && !isInitialized(current2)) return true;
    current2 = current2.parentElement;
  }
  return false;
}
function coerce(value, def) {
  if (!def || !def.type || def.type === "any") return value;
  if (value == null || value === "") return def.default ?? value;
  switch (def.type) {
    case "number": {
      const n = Number(value);
      return Number.isNaN(n) ? def.default ?? value : n;
    }
    case "boolean":
      return value === "" || value === "true" || value === true || value === "1";
    case "string":
      return String(value);
    case "array":
      return Array.isArray(value) ? value : [value];
    default:
      return value;
  }
}
function propDefinitions(def) {
  const out = {};
  if (Array.isArray(def.props)) {
    for (const name of def.props) out[name] = { type: "any" };
  } else if (def.props) {
    Object.assign(out, def.props);
  }
  return out;
}
function camelize(name) {
  return name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}
function resolveProps(el, defs, parentScope, owner, componentName) {
  const props = reactive({});
  const known = Object.keys(defs);
  const lookup = /* @__PURE__ */ new Map();
  for (const key of known) {
    lookup.set(key.toLowerCase(), key);
    lookup.set(normalizeComponentName(key), key);
    lookup.set(camelize(key).toLowerCase(), key);
  }
  for (const key of known) {
    if (defs[key].default !== void 0) props[key] = defs[key].default;
  }
  const attrs = Array.from(el.attributes);
  for (const attr2 of attrs) {
    const parsed = parseAttribute(attr2.name, attr2.value);
    if (parsed && parsed.name === "bind" && parsed.arg) {
      const target2 = lookup.get(parsed.arg.toLowerCase()) ?? camelize(parsed.arg);
      if (known.length && !lookup.has(parsed.arg.toLowerCase())) continue;
      owner.run(
        () => effect(() => {
          props[target2] = evaluateIn(parsed.expression, parentScope, `:${parsed.arg}`);
        })
      );
      continue;
    }
    if (parsed) continue;
    const target = lookup.get(attr2.name.toLowerCase());
    if (target) props[target] = coerce(attr2.value, defs[target]);
    else if (!known.length) props[camelize(attr2.name)] = attr2.value;
  }
  for (const key of known) {
    if (defs[key].required && props[key] === void 0) {
      warnRequiredProp(el, componentName, key);
    }
  }
  return props;
}
function applySlots(el, original, parentScope) {
  const slots = Array.from(el.querySelectorAll("slot"));
  if (!slots.length) return;
  const named = /* @__PURE__ */ new Map();
  const fallback = [];
  Array.from(original.childNodes).forEach((node) => {
    const slotName = node.nodeType === 1 ? node.getAttribute("slot") ?? null : null;
    if (slotName) {
      node.removeAttribute("slot");
      const list = named.get(slotName) ?? [];
      list.push(node);
      named.set(slotName, list);
    } else {
      fallback.push(node);
    }
  });
  for (const slot of slots) {
    const name = slot.getAttribute("name");
    const content = name ? named.get(name) : fallback;
    const frag = document.createDocumentFragment();
    if (content && content.length) {
      for (const node of content) frag.appendChild(node);
    } else {
      while (slot.firstChild) frag.appendChild(slot.firstChild);
    }
    Array.from(frag.childNodes).forEach((node) => {
      if (node.nodeType === 1) markScope(node, parentScope);
    });
    slot.replaceWith(frag);
  }
}
var scopeMarker = null;
function setScopeMarker(fn) {
  scopeMarker = fn;
}
function markScope(node, scope) {
  scopeMarker?.(node, scope);
}
function mountComponent(el, name, parentScope) {
  const normalized = name ? normalizeComponentName(name) : "";
  const definition = normalized ? components.get(normalized) ?? components.get(componentAliases.get(normalized) ?? "") ?? {} : {};
  if (normalized && !components.has(normalized) && !componentAliases.has(normalized)) {
    warnUnknownComponent(el, name);
  }
  const owner = new EffectScope(true);
  const defs = propDefinitions(definition);
  const props = resolveProps(el, defs, parentScope, owner, normalized || "inline");
  if (!definition.state && definition.data) warnAlias("data()", "state()");
  if (definition.destroyed) warnAlias("destroyed()", "unmounted()");
  const stateFactory = definition.state ?? definition.data;
  let stateRaw = {};
  const instance = {};
  const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
  const scope = new Scope({}, scopeParent, el);
  scope.component = instance;
  try {
    stateRaw = stateFactory ? stateFactory.call(instance, props) ?? {} : {};
  } catch (err) {
    handleError(err, `state() of component "${name}"`);
  }
  const dataAttr = el.getAttribute(`${config.prefix}data`);
  if (dataAttr) {
    const extra = evaluateIn(dataAttr, parentScope, "v-data");
    if (extra && typeof extra === "object") Object.assign(stateRaw, extra);
  }
  if (definition.provide) {
    try {
      const provided = typeof definition.provide === "function" ? definition.provide.call(instance) : definition.provide;
      if (provided && typeof provided === "object") {
        scope.provides = { ...provided };
      }
    } catch (err) {
      handleError(err, `provide() of component "${name}"`);
    }
  }
  if (definition.inject) {
    const requests = Array.isArray(definition.inject) ? definition.inject.map((key) => [key, { from: key }]) : Object.entries(definition.inject).map(
      ([key, options]) => [key, options ?? {}]
    );
    for (const [key, options] of requests) {
      const from = options.from ?? key;
      const value = parentScope.inject(from, options.default);
      if (!(key in stateRaw)) stateRaw[key] = value;
    }
  }
  const state = reactive(stateRaw);
  const computedRefs = {};
  if (definition.computed) {
    for (const [key, getter] of Object.entries(definition.computed)) {
      computedRefs[key] = computed(() => getter.call(instance));
    }
  }
  const methods = {};
  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      methods[key] = (...args) => fn.apply(instance, args);
    }
  }
  for (const [key, value] of Object.entries(definition)) {
    if (typeof value !== "function") continue;
    if (LIFECYCLE.has(key) || key === "state" || key === "data") continue;
    if (!(key in methods)) methods[key] = (...args) => value.apply(instance, args);
  }
  const emit3 = (event, detail) => {
    const ev = new CustomEvent(event, { detail, bubbles: true, cancelable: true });
    ev.__voodoo = true;
    el.dispatchEvent(ev);
  };
  const special = {
    $el: el,
    $props: props,
    $name: normalized || "inline",
    $scope: scope,
    $parent: parentScope.owner?.component ?? null,
    emit: emit3,
    $emit: emit3,
    $nextTick: (fn) => Promise.resolve().then(() => (init_reactivity(), reactivity_exports)).then((m) => m.nextTick(fn)),
    $watch: (source, cb) => watch(() => evaluateIn(source, scope), cb)
  };
  const handler = {
    get(_t, key) {
      if (typeof key === "symbol") return void 0;
      if (key === "$refs") return scope.allRefs;
      if (key in special) return special[key];
      if (key in computedRefs) return computedRefs[key].value;
      if (key in methods) return methods[key];
      if (key in props) return props[key];
      return state[key];
    },
    set(_t, key, value) {
      if (typeof key === "symbol") return true;
      if (key in computedRefs) {
        computedRefs[key].value = value;
        return true;
      }
      if (key in props) {
        props[key] = value;
        return true;
      }
      state[key] = value;
      return true;
    },
    has(_t, key) {
      if (typeof key === "symbol") return false;
      const k = key;
      return k === "$refs" || k in special || k in computedRefs || k in methods || k in props || k in state;
    },
    ownKeys() {
      return [
        .../* @__PURE__ */ new Set([
          ...Object.keys(state),
          ...Object.keys(props),
          ...Object.keys(methods),
          ...Object.keys(computedRefs)
        ])
      ];
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    }
  };
  const proxy = new Proxy(instance, handler);
  scope.data = proxy;
  Object.setPrototypeOf(instance, proxy);
  if (definition.watch) {
    for (const [key, cb] of Object.entries(definition.watch)) {
      owner.run(
        () => watch(
          () => proxy[key],
          (value, old) => cb.call(proxy, value, old)
        )
      );
    }
  }
  if (definition.style && !injectedStyles.has(normalized)) {
    injectedStyles.add(normalized);
    const tag = document.createElement("style");
    tag.setAttribute("data-voodoo-component", normalized);
    tag.textContent = definition.style;
    document.head.appendChild(tag);
  }
  callHook(definition, proxy, "beforeMount");
  if (definition.template) {
    const original = document.createDocumentFragment();
    while (el.firstChild) original.appendChild(el.firstChild);
    el.innerHTML = definition.template;
    applySlots(el, original, parentScope);
  }
  instances.add(proxy);
  queuePostFlush(() => {
    callHook(definition, proxy, "mounted");
    if (definition.updated) {
      owner.run(
        () => effect(() => {
          for (const key of Object.keys(state)) void state[key];
          callHook(definition, proxy, "updated");
        })
      );
    }
  });
  addCleanup(el, () => {
    callHook(definition, proxy, "beforeUnmount");
    owner.stop();
    instances.delete(proxy);
    callHook(definition, proxy, "unmounted");
    callHook(definition, proxy, "destroyed");
  });
  return scope;
}
var LIFECYCLE = /* @__PURE__ */ new Set([
  "beforeMount",
  "mounted",
  "updated",
  "beforeUnmount",
  "unmounted",
  "destroyed"
]);
function callHook(def, instance, name) {
  const hook = def[name];
  if (typeof hook !== "function") return;
  try {
    hook.call(instance);
  } catch (err) {
    handleError(err, `hook ${name}`);
  }
}

// src/runtime/app.ts
init_reactivity();
init_registry();

// src/runtime/boot.ts
var WAIT_LIMIT = 1e4;
var STABLE_STEPS = 2;
var queue2 = [];
var observer2 = null;
var domVersion = 0;
var domVersionAtPreviousStep = -1;
var stepsWithoutChange = 0;
var scheduled = false;
function now() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}
function observeChanges() {
  if (observer2 || typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (!root) return;
  observer2 = new MutationObserver(() => {
    domVersion++;
  });
  observer2.observe(root, { childList: true, subtree: true });
}
function scheduleStep() {
  if (scheduled) return;
  scheduled = true;
  const execute = () => {
    scheduled = false;
    step();
  };
  if (typeof requestAnimationFrame === "function") {
    let fired = false;
    const one = () => {
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
function step() {
  if (domVersion === domVersionAtPreviousStep) stepsWithoutChange++;
  else stepsWithoutChange = 0;
  domVersionAtPreviousStep = domVersion;
  const now_ = now();
  for (let i = queue2.length - 1; i >= 0; i--) {
    const task = queue2[i];
    let value = null;
    try {
      value = task.ready();
    } catch {
      value = null;
    }
    if (value) {
      queue2.splice(i, 1);
      task.action(value);
      continue;
    }
    if (now_ - task.since > WAIT_LIMIT) {
      queue2.splice(i, 1);
      task.onGiveUp?.();
    }
  }
  if (queue2.length) scheduleStep();
}
function enqueue(task) {
  let value = null;
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
  queue2.push({ ...task, since: now() });
  scheduleStep();
}
function documentStable() {
  if (typeof document === "undefined" || !document.body) return false;
  return stepsWithoutChange >= STABLE_STEPS;
}
function documentStopped() {
  if (typeof document === "undefined" || !document.body) return false;
  return domVersion === 0;
}
function whenReady(action) {
  if (typeof document === "undefined") return;
  enqueue({
    ready: () => documentStable() ? document.body : null,
    action: () => action(),
    // Past the limit, start anyway: a page that never stops changing
    // still deserves to be initialized.
    onGiveUp: () => {
      if (document.body) action();
    }
  });
}
function whenBodyReady(action) {
  if (typeof document === "undefined") return;
  if (documentStopped()) {
    void Promise.resolve().then(action);
    return;
  }
  enqueue({
    ready: () => documentStable() ? document.body : null,
    action: () => action(),
    onGiveUp: () => {
      if (document.body) action();
    }
  });
}
function whenElement(target, action, onGiveUp) {
  if (typeof target !== "string") {
    action(target);
    return;
  }
  if (typeof document === "undefined") return;
  enqueue({
    ready: () => document.querySelector(target),
    action: (el) => action(el),
    onGiveUp
  });
}

// src/runtime/app.ts
var counter = 0;
var directiveRegistrar = null;
function setDirectiveRegistrar(fn) {
  directiveRegistrar = fn;
}
function createApp(options = {}) {
  const name = `voodoo-app-${++counter}`;
  const { components: local, ...root } = options;
  const config_ = { globalProperties: {} };
  const provided = {};
  const registeredByThisApp = [];
  let container2 = null;
  let originalHTML = "";
  let instance = null;
  let waiting = [];
  function registerLocal() {
    if (!local) return;
    for (const [name2, definition] of Object.entries(local)) {
      const normalized = normalizeComponentName(name2);
      if (components.has(normalized)) continue;
      defineComponent(normalized, definition);
      registeredByThisApp.push(normalized);
    }
  }
  function mountOn(el) {
    if (instance) return instance;
    container2 = el;
    originalHTML = el.innerHTML;
    Object.assign(allowedGlobals, config_.globalProperties);
    registerLocal();
    const definition = { ...root };
    if (Object.keys(provided).length) {
      const previous = definition.provide;
      definition.provide = () => ({
        ...typeof previous === "function" ? previous() : previous ?? {},
        ...provided
      });
    }
    defineComponent(name, definition);
    el.setAttribute(`${config.prefix}component`, name);
    try {
      walk(el, rootScope);
    } catch (err) {
      handleError(err, `application mounting "${name}"`);
      return null;
    }
    instance = getScope(el)?.component ?? null;
    if (instance) {
      const queue3 = waiting;
      waiting = [];
      for (const resolver of queue3) resolver(instance);
    }
    return instance;
  }
  const app = {
    name,
    config: config_,
    get instance() {
      return instance;
    },
    get container() {
      return container2;
    },
    get isMounted() {
      return instance !== null;
    },
    component(name2, definition) {
      const normalized = normalizeComponentName(name2);
      if (definition === void 0) {
        return (local && local[name2]) ?? components.get(normalized);
      }
      if (local) local[name2] = definition;
      else options.components = { [name2]: definition };
      if (instance && !components.has(normalized)) {
        defineComponent(normalized, definition);
        registeredByThisApp.push(normalized);
      }
      return app;
    },
    directive(name2, definition) {
      directiveRegistrar?.(name2, definition);
      return app;
    },
    use(plugin, options2) {
      usePlugin(globalThis_V(), plugin, options2);
      return app;
    },
    provide(key, value) {
      provided[key] = value;
      return app;
    },
    mount(target) {
      if (instance) return instance;
      if (typeof target !== "string") return mountOn(target);
      let result = null;
      whenElement(
        target,
        (el) => {
          result = mountOn(el);
        },
        () => {
          console.warn(
            `[Voodoo] createApp().mount("${target}") did not find the element. The application remains unmounted.`
          );
        }
      );
      return result;
    },
    whenMounted() {
      if (instance) return Promise.resolve(instance);
      return new Promise((resolve2) => waiting.push(resolve2));
    },
    unmount() {
      if (!container2) return;
      destroy(container2);
      container2.removeAttribute(`${config.prefix}component`);
      container2.innerHTML = originalHTML;
      components.delete(name);
      for (const name2 of registeredByThisApp) components.delete(name2);
      registeredByThisApp.length = 0;
      instance = null;
      container2 = null;
    }
  };
  return app;
}
var objectV = null;
function setAppHost(V2) {
  objectV = V2;
}
function globalThis_V() {
  return objectV;
}

// src/runtime/magics.ts
init_reactivity();

// src/store/index.ts
init_reactivity();
var stores = /* @__PURE__ */ new Map();
var version = ref(0);
var persistHandles = /* @__PURE__ */ new Map();
function store(name, definition, options = {}) {
  const existing = stores.get(name);
  if (!definition) {
    if (!existing) {
      const created2 = reactive({});
      stores.set(name, created2);
      return created2;
    }
    return existing;
  }
  if (existing) {
    Object.assign(existing, definition);
    return existing;
  }
  const key = typeof options.persist === "string" ? options.persist : `voodoo:store:${name}`;
  const descriptors = Object.getOwnPropertyDescriptors(definition);
  const initial = Object.defineProperties({}, descriptors);
  if (options.persist && typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const [field, value] of Object.entries(parsed)) {
          if (descriptors[field] && !("value" in descriptors[field])) continue;
          initial[field] = value;
        }
      }
    } catch {
    }
  }
  const created = reactive(initial);
  for (const [prop, descriptor] of Object.entries(descriptors)) {
    const value = descriptor.value;
    if (typeof value === "function") {
      created[prop] = (...args) => value.apply(created, args);
    }
  }
  stores.set(name, created);
  version.value++;
  if (options.persist && typeof localStorage !== "undefined") {
    const stop2 = watch(
      created,
      () => {
        try {
          localStorage.setItem(key, JSON.stringify(stripFunctions(created)));
        } catch {
        }
      },
      { deep: true }
    );
    persistHandles.set(name, stop2);
  }
  return created;
}
function stripFunctions(source) {
  const out = {};
  const descriptors = Object.getOwnPropertyDescriptors(toRaw(source));
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "function") continue;
    if (descriptors[key] && !("value" in descriptors[key])) continue;
    out[key] = value;
  }
  return out;
}
var allStores = new Proxy(
  {},
  {
    get: (_t, key) => {
      void version.value;
      return stores.get(key);
    },
    has: (_t, key) => {
      void version.value;
      return stores.has(key);
    },
    ownKeys: () => [...stores.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true })
  }
);
function removeStore(name) {
  persistHandles.get(name)?.();
  persistHandles.delete(name);
  stores.delete(name);
}
function storeNames() {
  return [...stores.keys()];
}

// src/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  capitalize: () => capitalize,
  chunk: () => chunk,
  clone: () => clone,
  debounce: () => debounce,
  device: () => device,
  escapeHtml: () => escapeHtml,
  formatCurrency: () => formatCurrency,
  formatDate: () => formatDate,
  formatFileSize: () => formatFileSize,
  formatNumber: () => formatNumber,
  formatPercent: () => formatPercent,
  get: () => get,
  groupBy: () => groupBy,
  isBrowser: () => isBrowser,
  matchesMedia: () => matchesMedia,
  memoize: () => memoize,
  merge: () => merge,
  once: () => once,
  parseDuration: () => parseDuration,
  random: () => random,
  relativeTime: () => relativeTime,
  sample: () => sample,
  set: () => set,
  setFormatDefaults: () => setFormatDefaults,
  sleep: () => sleep,
  slugify: () => slugify,
  sortBy: () => sortBy,
  stripTags: () => stripTags,
  throttle: () => throttle,
  titleCase: () => titleCase,
  truncate: () => truncate,
  uid: () => uid,
  unique: () => unique,
  uuid: () => uuid
});
function uuid() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : r & 3 | 8).toString(16);
  });
}
function uid(prefix = "v") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
function parseDuration(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return value;
  const match = /^\s*([\d.]+)\s*(ms|s|m|h)?\s*$/i.exec(String(value));
  if (!match) return fallback;
  const amount = parseFloat(match[1]);
  switch ((match[2] || "ms").toLowerCase()) {
    case "s":
      return amount * 1e3;
    case "m":
      return amount * 6e4;
    case "h":
      return amount * 36e5;
    default:
      return amount;
  }
}
function debounce(fn, wait2 = 250, immediate = false) {
  let timer = null;
  let lastArgs = null;
  let lastThis;
  const debounced = function(...args) {
    lastArgs = args;
    lastThis = this;
    const callNow = immediate && timer === null;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate && lastArgs) fn.apply(lastThis, lastArgs);
    }, wait2);
    if (callNow) fn.apply(this, args);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };
  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn.apply(lastThis, lastArgs);
    }
  };
  return debounced;
}
function throttle(fn, wait2 = 250) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  const throttled = function(...args) {
    const now2 = Date.now();
    lastArgs = args;
    const remaining = wait2 - (now2 - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now2;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        if (lastArgs) fn.apply(this, lastArgs);
      }, remaining);
    }
  };
  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  throttled.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn.apply(null, lastArgs);
    }
  };
  return throttled;
}
function once(fn) {
  let called = false;
  let result;
  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache3 = /* @__PURE__ */ new Map();
  const memoized = function(...args) {
    const key = keyFn(...args);
    if (cache3.has(key)) return cache3.get(key);
    const value = fn.apply(this, args);
    cache3.set(key, value);
    return value;
  };
  memoized.cache = cache3;
  return memoized;
}
function clone(value) {
  if (value === null || typeof value !== "object") return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
    }
  }
  if (Array.isArray(value)) return value.map((v) => clone(v));
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, clone(v)]));
  if (value instanceof Set) return new Set([...value].map((v) => clone(v)));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = clone(v);
  return out;
}
function merge(target, ...sources) {
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      const current2 = target[key];
      if (value && typeof value === "object" && !Array.isArray(value) && current2 && typeof current2 === "object" && !Array.isArray(current2)) {
        target[key] = merge({ ...current2 }, value);
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}
function groupBy(list, key) {
  const out = {};
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  for (const item of list) {
    const k = String(getKey(item));
    (out[k] || (out[k] = [])).push(item);
  }
  return out;
}
function unique(list, key) {
  if (!key) return [...new Set(list)];
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of list) {
    const k = getKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}
function chunk(list, size = 10) {
  if (size < 1) return [list];
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
function sortBy(list, key, direction = "asc") {
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  const factor = direction === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const va = getKey(a);
    const vb = getKey(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb, void 0, { numeric: true }) * factor;
    }
    return (va > vb ? 1 : va < vb ? -1 : 0) * factor;
  });
}
function get(object, path, fallback) {
  const parts = path.split(".");
  let current2 = object;
  for (const part of parts) {
    if (current2 == null) return fallback;
    current2 = current2[part];
  }
  return current2 ?? fallback;
}
function set(object, path, value) {
  const parts = path.split(".");
  let current2 = object;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current2[key] !== "object" || current2[key] === null) {
      current2[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current2 = current2[key];
  }
  current2[parts[parts.length - 1]] = value;
}
function random(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}
function slugify(text, separator = "-") {
  return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`\\${separator}{2,}`, "g"), separator).replace(new RegExp(`^\\${separator}|\\${separator}$`, "g"), "");
}
function truncate(text, length = 100, suffix = "...") {
  const value = String(text ?? "");
  if (value.length <= length) return value;
  return value.slice(0, Math.max(0, length - suffix.length)).trimEnd() + suffix;
}
function capitalize(text) {
  const value = String(text ?? "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function titleCase(text) {
  return String(text ?? "").replace(/\w\S*/g, (word) => capitalize(word.toLowerCase()));
}
function escapeHtml(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function stripTags(html) {
  return String(html ?? "").replace(/<\/?[^>]+(>|$)/g, "");
}
var defaultLocale = "pt-BR";
var defaultCurrency = "BRL";
function setFormatDefaults(locale, currency) {
  if (locale) defaultLocale = locale;
  if (currency) defaultCurrency = currency;
}
function formatCurrency(value, options = {}) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "";
  return new Intl.NumberFormat(options.locale ?? defaultLocale, {
    style: "currency",
    currency: options.currency ?? defaultCurrency
  }).format(n);
}
function formatNumber(value, options = {}) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return "";
  const { locale, ...rest } = options;
  return new Intl.NumberFormat(locale ?? defaultLocale, rest).format(n);
}
function formatDate(value, format = "short", locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const loc = locale ?? defaultLocale;
  if (typeof format === "object") return new Intl.DateTimeFormat(loc, format).format(date);
  const presets2 = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    long: { day: "2-digit", month: "long", year: "numeric" },
    full: { dateStyle: "full" },
    time: { hour: "2-digit", minute: "2-digit" },
    datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
  };
  if (presets2[format]) return new Intl.DateTimeFormat(loc, presets2[format]).format(date);
  const pad2 = (n) => String(n).padStart(2, "0");
  return format.replace(/YYYY/g, String(date.getFullYear())).replace(/YY/g, String(date.getFullYear()).slice(-2)).replace(/MM/g, pad2(date.getMonth() + 1)).replace(/DD/g, pad2(date.getDate())).replace(/HH/g, pad2(date.getHours())).replace(/mm/g, pad2(date.getMinutes())).replace(/ss/g, pad2(date.getSeconds()));
}
function relativeTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const units = [
    ["year", 31536e6],
    ["month", 2592e6],
    ["week", 6048e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3]
  ];
  const rtf = new Intl.RelativeTimeFormat(locale ?? defaultLocale, { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "";
}
function formatFileSize(bytes, decimals = 1) {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(n)) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}
function formatPercent(value, decimals = 0, locale) {
  return new Intl.NumberFormat(locale ?? defaultLocale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
function matchesMedia(query2) {
  if (!isBrowser || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(query2).matches;
  } catch {
    return false;
  }
}
var device = {
  get touch() {
    return isBrowser && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  },
  get mobile() {
    return matchesMedia("(max-width: 767px)");
  },
  get tablet() {
    return matchesMedia("(min-width: 768px) and (max-width: 1023px)");
  },
  get desktop() {
    return matchesMedia("(min-width: 1024px)");
  },
  get online() {
    return !isBrowser || navigator.onLine;
  },
  get reducedMotion() {
    return matchesMedia("(prefers-reduced-motion: reduce)");
  },
  get darkMode() {
    return matchesMedia("(prefers-color-scheme: dark)");
  }
};

// src/http/index.ts
var HttpError = class extends Error {
  constructor(message, response, config2, cause) {
    super(message);
    __publicField(this, "response", response);
    __publicField(this, "config", config2);
    __publicField(this, "cause", cause);
    this.name = "HttpError";
  }
  get status() {
    return this.response?.status ?? 0;
  }
  /** `true` when error is network, timeout, or cancellation. */
  get isNetworkError() {
    return !this.response;
  }
};
var defaults = {
  baseURL: "",
  headers: { Accept: "application/json, text/html, */*" },
  timeout: 3e4,
  retry: 0,
  retryDelay: 500,
  credentials: "same-origin",
  csrfMeta: "csrf-token",
  csrfHeader: "X-CSRF-TOKEN"
};
var requestInterceptors = [];
var responseInterceptors = [];
var errorInterceptors = [];
var responseCache = /* @__PURE__ */ new Map();
function cacheKey(config2) {
  return `${config2.method ?? "GET"} ${buildURL(config2)}`;
}
function clearCache(pattern) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const test = typeof pattern === "string" ? (k) => k.includes(pattern) : (k) => pattern.test(k);
  for (const key of [...responseCache.keys()]) if (test(key)) responseCache.delete(key);
}
var OFFLINE_KEY = "voodoo:offline-queue";
function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(list) {
  try {
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
  } catch {
  }
}
function enqueueOffline(config2) {
  if (typeof localStorage === "undefined") return;
  const list = readQueue();
  list.push({
    url: buildURL(config2),
    method: config2.method ?? "POST",
    body: config2.body,
    headers: config2.headers ?? {},
    at: Date.now()
  });
  writeQueue(list);
}
async function flushOfflineQueue() {
  if (typeof localStorage === "undefined") return 0;
  const list = readQueue();
  if (!list.length) return 0;
  writeQueue([]);
  let sent = 0;
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    try {
      await request({
        url: item.url,
        method: item.method,
        body: item.body,
        headers: item.headers,
        offlineQueue: false
      });
      sent++;
    } catch {
      const newItems = readQueue();
      writeQueue([...list.slice(index), ...newItems]);
      break;
    }
  }
  return sent;
}
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushOfflineQueue();
  });
}
function buildURL(config2) {
  let url2 = config2.url;
  const base = defaults.baseURL;
  if (base && !/^https?:\/\//i.test(url2) && !url2.startsWith("//")) {
    url2 = `${base.replace(/\/$/, "")}/${url2.replace(/^\//, "")}`;
  }
  if (config2.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(config2.params)) {
      if (value == null || value === "") continue;
      search.append(key, String(value));
    }
    const query2 = search.toString();
    if (query2) url2 += (url2.includes("?") ? "&" : "?") + query2;
  }
  return url2;
}
function csrfToken() {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector(`meta[name="${defaults.csrfMeta}"]`);
  return meta?.getAttribute("content") ?? null;
}
function prepareBody(body, headers) {
  if (body == null) return void 0;
  if (typeof FormData !== "undefined" && body instanceof FormData || typeof Blob !== "undefined" && body instanceof Blob || typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams || typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer || typeof body === "string") {
    return body;
  }
  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return JSON.stringify(body);
}
async function parseResponse(response, type) {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers.get("content-type") || "";
  switch (type) {
    case "json":
      return response.json();
    case "text":
      return response.text();
    case "blob":
      return response.blob();
    case "arrayBuffer":
      return response.arrayBuffer();
    case "formData":
      return response.formData();
    default:
      if (contentType.includes("application/json") || contentType.includes("+json")) {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      }
      return response.text();
  }
}
var METODOS_SEGUROS = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
function temChaveDeIdempotencia(headers) {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "idempotency-key" && String(value).trim() !== "") return true;
  }
  return false;
}
function podeRepetir(method, config2, headers, url2) {
  if (METODOS_SEGUROS.has(method)) return true;
  if (config2.retryUnsafe === true) return true;
  if (temChaveDeIdempotencia(headers)) return true;
  if ((config2.retry ?? 0) > 0) {
    warnOnce(
      `http:retry-unsafe:${method} ${url2}`,
      `retry ignored on ${method} ${url2}: retrying a method that changes state may apply the same operation twice if the response is lost in transit. Allow with retryUnsafe: true or send an Idempotency-Key header.`
    );
  }
  return false;
}
async function request(input) {
  let config2 = {
    method: "GET",
    timeout: defaults.timeout,
    retry: defaults.retry,
    retryDelay: defaults.retryDelay,
    credentials: defaults.credentials,
    responseType: "auto",
    ...input,
    headers: { ...defaults.headers, ...input.headers }
  };
  for (const interceptor of requestInterceptors) {
    config2 = await interceptor(config2);
  }
  const method = (config2.method ?? "GET").toUpperCase();
  if (config2.cache && method === "GET") {
    const entry = responseCache.get(cacheKey(config2));
    if (entry && entry.expires > Date.now()) return entry.value;
  }
  if (config2.offlineQueue && typeof navigator !== "undefined" && navigator.onLine === false && method !== "GET") {
    enqueueOffline(config2);
    return {
      data: null,
      status: 0,
      statusText: "offline-queued",
      headers: new Headers(),
      ok: true,
      raw: new Response(null, { status: 202 }),
      config: config2
    };
  }
  const headers = { ...config2.headers };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token && !headers[defaults.csrfHeader]) headers[defaults.csrfHeader] = token;
  }
  headers["X-Requested-With"] || (headers["X-Requested-With"] = "XMLHttpRequest");
  const body = prepareBody(config2.body, headers);
  const url2 = buildURL(config2);
  const attempts = podeRepetir(method, config2, headers, url2) ? (config2.retry ?? 0) + 1 : 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const externo = config2.signal;
    let repassarAborto = null;
    if (externo) {
      if (externo.aborted) {
        controller.abort(externo.reason);
      } else {
        repassarAborto = () => controller.abort(externo.reason);
        externo.addEventListener("abort", repassarAborto, { once: true });
      }
    }
    const soltarSinal = () => {
      if (repassarAborto && externo) externo.removeEventListener("abort", repassarAborto);
      repassarAborto = null;
    };
    const timeoutId = config2.timeout && config2.timeout > 0 ? setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), config2.timeout) : null;
    try {
      const response = await fetch(url2, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? void 0 : body,
        credentials: config2.credentials,
        signal: controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      const data2 = await parseResponse(response, config2.responseType);
      let result = {
        data: data2,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        raw: response,
        config: config2
      };
      if (!response.ok) {
        if (response.status >= 500 && attempt < attempts - 1) {
          await wait((config2.retryDelay ?? 500) * 2 ** attempt);
          continue;
        }
        const error2 = new HttpError(
          `Request failed with status ${response.status}`,
          result,
          config2
        );
        for (const interceptor of errorInterceptors) interceptor(error2);
        throw error2;
      }
      for (const interceptor of responseInterceptors) {
        result = await interceptor(result);
      }
      if (config2.cache && method === "GET") {
        responseCache.set(cacheKey(config2), {
          expires: Date.now() + config2.cache,
          value: result
        });
      }
      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      soltarSinal();
      if (err instanceof HttpError) throw err;
      lastError = err;
      const aborted = err?.name === "AbortError" && config2.signal?.aborted;
      if (aborted) break;
      if (attempt < attempts - 1) {
        await wait((config2.retryDelay ?? 500) * 2 ** attempt);
        continue;
      }
    }
  }
  const message = lastError?.name === "TimeoutError" ? `Timeout after ${config2.timeout}ms` : `Network failure accessing ${url2}`;
  const error = new HttpError(message, void 0, config2, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}
function wait(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function shortcut(config2) {
  const response = await request(config2);
  return response.data;
}
var http = {
  defaults,
  get(url2, options = {}) {
    return shortcut({ ...options, url: url2, method: "GET" });
  },
  post(url2, body, options = {}) {
    return shortcut({ ...options, url: url2, method: "POST", body });
  },
  put(url2, body, options = {}) {
    return shortcut({ ...options, url: url2, method: "PUT", body });
  },
  patch(url2, body, options = {}) {
    return shortcut({ ...options, url: url2, method: "PATCH", body });
  },
  delete(url2, options = {}) {
    return shortcut({ ...options, url: url2, method: "DELETE" });
  },
  head(url2, options = {}) {
    return shortcut({ ...options, url: url2, method: "HEAD" });
  },
  /** Full request with status and headers. */
  request,
  /** Upload files with real progress using XMLHttpRequest. */
  upload(url2, data2, options = {}) {
    return new Promise((resolve2, reject) => {
      const xhr = new XMLHttpRequest();
      const finalUrl = buildURL({ url: url2 });
      xhr.open(options.method ?? "POST", finalUrl);
      for (const [key, value] of Object.entries({ ...defaults.headers, ...options.headers })) {
        if (key.toLowerCase() === "content-type") continue;
        xhr.setRequestHeader(key, value);
      }
      const token = csrfToken();
      if (token) xhr.setRequestHeader(defaults.csrfHeader, token);
      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        options.onProgress?.(
          Math.round(event.loaded / event.total * 100),
          event.loaded,
          event.total
        );
      });
      xhr.addEventListener("load", () => {
        const contentType = xhr.getResponseHeader("content-type") || "";
        let data3 = xhr.responseText;
        if (contentType.includes("json")) {
          try {
            data3 = JSON.parse(xhr.responseText);
          } catch {
          }
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve2(data3);
        else reject(new HttpError(`Upload failed with status ${xhr.status}`));
      });
      xhr.addEventListener("error", () => reject(new HttpError("Network failure during upload")));
      xhr.addEventListener("abort", () => reject(new HttpError("Upload canceled")));
      options.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(data2);
    });
  },
  /** Server-Sent Events with automatic reconnection by the browser. */
  sse(url2, handlers = {}) {
    const source = new EventSource(buildURL({ url: url2 }));
    source.addEventListener("message", (event) => {
      let data2 = event.data;
      try {
        data2 = JSON.parse(event.data);
      } catch {
      }
      handlers.message?.(data2, event);
    });
    if (handlers.error) source.addEventListener("error", handlers.error);
    return source;
  },
  /** Read a streaming response line by line (NDJSON). */
  async stream(url2, onLine, options = {}) {
    const response = await fetch(buildURL({ url: url2, params: options.params }), {
      headers: { ...defaults.headers, ...options.headers },
      signal: options.signal
    });
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onLine(line);
    }
    if (buffer.trim()) onLine(buffer);
  },
  interceptors: {
    request: {
      use(fn) {
        requestInterceptors.push(fn);
        return () => {
          const i = requestInterceptors.indexOf(fn);
          if (i > -1) requestInterceptors.splice(i, 1);
        };
      }
    },
    response: {
      use(fn) {
        responseInterceptors.push(fn);
        return () => {
          const i = responseInterceptors.indexOf(fn);
          if (i > -1) responseInterceptors.splice(i, 1);
        };
      }
    },
    error: {
      use(fn) {
        errorInterceptors.push(fn);
        return () => {
          const i = errorInterceptors.indexOf(fn);
          if (i > -1) errorInterceptors.splice(i, 1);
        };
      }
    }
  },
  /** Set headers sent on every request. */
  setHeader(name, value) {
    if (value === null) delete defaults.headers[name];
    else defaults.headers[name] = value;
  },
  /** Shortcut for token-based authentication. */
  setToken(token, scheme = "Bearer") {
    this.setHeader("Authorization", token ? `${scheme} ${token}` : null);
  },
  setBaseURL(url2) {
    defaults.baseURL = url2;
  },
  clearCache,
  flushOfflineQueue,
  parseDuration
};

// src/ui/toast.ts
init_style();
var CSS = `
.v-toaster{position:fixed;z-index:var(--v-z-toast,1100);display:flex;flex-direction:column;gap:10px;padding:16px;pointer-events:none;max-width:min(420px,calc(100vw - 32px))}
.v-toaster[data-pos^="top"]{top:0}
.v-toaster[data-pos^="bottom"]{bottom:0;flex-direction:column-reverse}
.v-toaster[data-pos$="right"]{right:0;align-items:flex-end}
.v-toaster[data-pos$="left"]{left:0;align-items:flex-start}
.v-toaster[data-pos$="center"]{left:50%;transform:translateX(-50%);align-items:center}

.v-toast{pointer-events:auto;position:relative;display:flex;gap:12px;align-items:flex-start;
  min-width:280px;max-width:100%;padding:14px 16px;border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  font:500 14px/1.45 var(--v-font-sans,system-ui,sans-serif);
  opacity:0;transform:translateY(-8px) scale(.98);
  transition:opacity .22s var(--v-ease,ease),transform .22s var(--v-ease,ease)}
.v-toaster[data-pos^="bottom"] .v-toast{transform:translateY(8px) scale(.98)}
.v-toast.v-in{opacity:1;transform:none}
.v-toast.v-out{opacity:0;transform:translateY(-8px) scale(.98)}

.v-toast-icon{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;
  font-size:12px;font-weight:700;color:#fff;margin-top:1px}
.v-toast-body{flex:1;min-width:0}
.v-toast-title{font-weight:650}
.v-toast-desc{margin-top:2px;font-weight:450;color:var(--v-text-muted,#6B6580);font-size:13px;overflow-wrap:anywhere}
.v-toast-action{flex:none;background:transparent;border:1px solid var(--v-border,#E6E0F0);
  border-radius:8px;padding:5px 10px;font:600 12px/1 inherit;color:var(--v-primary,#6D3BF5);cursor:pointer}
.v-toast-action:hover{background:var(--v-surface-2,#FBF7F2)}
.v-toast-close{flex:none;background:none;border:0;cursor:pointer;color:var(--v-text-muted,#6B6580);
  font-size:18px;line-height:1;padding:0 2px;opacity:.7}
.v-toast-close:hover{opacity:1}

.v-toast-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;transform-origin:left;
  border-radius:0 0 var(--v-radius,12px) var(--v-radius,12px);opacity:.55}
.v-toast:hover .v-toast-bar{animation-play-state:paused}
@keyframes v-toast-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}

.v-toast[data-type="success"] .v-toast-icon,.v-toast[data-type="success"] .v-toast-bar{background:var(--v-success,#2ED9A5)}
.v-toast[data-type="error"] .v-toast-icon,.v-toast[data-type="error"] .v-toast-bar{background:var(--v-danger,#FF4D4D)}
.v-toast[data-type="warning"] .v-toast-icon,.v-toast[data-type="warning"] .v-toast-bar{background:var(--v-warning,#FFB35C)}
.v-toast[data-type="info"] .v-toast-icon,.v-toast[data-type="info"] .v-toast-bar{background:var(--v-info,#9B7BFF)}
.v-toast[data-type="default"] .v-toast-icon,.v-toast[data-type="default"] .v-toast-bar{background:var(--v-primary,#6D3BF5)}
.v-toast[data-type="loading"] .v-toast-icon{background:transparent;border:2px solid var(--v-border,#E6E0F0);
  border-top-color:var(--v-primary,#6D3BF5);animation:v-spin .7s linear infinite}
@keyframes v-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.v-toast{transition:none}}
`;
var ICONS = {
  success: "ok",
  error: "!",
  warning: "!",
  info: "i",
  loading: "",
  default: ""
};
var containers = /* @__PURE__ */ new Map();
var settings = {
  duration: 4e3,
  position: "top-right",
  max: 6
};
function container(position) {
  ensureTokens();
  injectStyle("toast", CSS);
  let element = containers.get(position);
  if (element && element.isConnected) return element;
  element = document.createElement("div");
  element.className = "v-toaster";
  element.setAttribute("data-pos", position);
  element.setAttribute("role", "region");
  element.setAttribute("aria-label", "Notifications");
  document.body.appendChild(element);
  containers.set(position, element);
  return element;
}
function render(options) {
  const position = options.position ?? settings.position;
  const type = options.type ?? "default";
  const duration = options.duration ?? (type === "loading" ? 0 : settings.duration);
  const parent = container(position);
  const id = uid("toast-");
  const element = document.createElement("div");
  element.className = "v-toast";
  element.id = id;
  element.setAttribute("data-type", type);
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  element.setAttribute("aria-atomic", "true");
  let closed = false;
  let timer = null;
  const close = () => {
    if (closed) return;
    closed = true;
    if (timer) clearTimeout(timer);
    element.classList.add("v-out");
    element.classList.remove("v-in");
    setTimeout(() => {
      element.remove();
      options.onClose?.();
      if (!parent.children.length) {
        parent.remove();
        containers.delete(position);
      }
    }, 220);
  };
  const paint = (current2) => {
    const currentType = current2.type ?? type;
    element.setAttribute("data-type", currentType);
    if (current2.html) {
      element.innerHTML = current2.html;
    } else {
      element.textContent = "";
      const icon = document.createElement("span");
      icon.className = "v-toast-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ICONS[currentType] ?? "";
      element.appendChild(icon);
      const body = document.createElement("div");
      body.className = "v-toast-body";
      const title = document.createElement("div");
      title.className = "v-toast-title";
      title.textContent = current2.title ?? "";
      body.appendChild(title);
      if (current2.description) {
        const description = document.createElement("div");
        description.className = "v-toast-desc";
        description.textContent = current2.description;
        body.appendChild(description);
      }
      element.appendChild(body);
      if (current2.action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "v-toast-action";
        button.textContent = current2.action.label;
        button.addEventListener("click", () => {
          current2.action?.onClick();
          close();
        });
        element.appendChild(button);
      }
      if (current2.closable !== false && currentType !== "loading") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "v-toast-close";
        button.setAttribute("aria-label", "Close notification");
        button.innerHTML = "&times;";
        button.addEventListener("click", close);
        element.appendChild(button);
      }
    }
    const currentDuration = current2.duration ?? duration;
    if (currentDuration > 0) {
      const bar = document.createElement("div");
      bar.className = "v-toast-bar";
      bar.style.animation = `v-toast-bar ${currentDuration}ms linear forwards`;
      element.appendChild(bar);
    }
  };
  paint(options);
  parent.appendChild(element);
  requestAnimationFrame(() => element.classList.add("v-in"));
  while (parent.children.length > settings.max) parent.firstElementChild?.remove();
  const schedule = (ms) => {
    if (timer) clearTimeout(timer);
    if (ms > 0) timer = setTimeout(close, ms);
  };
  schedule(duration);
  element.addEventListener("mouseenter", () => {
    if (timer) clearTimeout(timer);
  });
  element.addEventListener("mouseleave", () => schedule(duration));
  return {
    id,
    close,
    update(next) {
      paint({ ...options, ...next });
      if (next.duration !== void 0) schedule(next.duration);
      else if ((next.type ?? type) !== "loading") schedule(settings.duration);
    }
  };
}
function normalize(input, type) {
  return typeof input === "string" ? { title: input, type } : { type, ...input };
}
var toast = Object.assign(
  /** Neutral notification. */
  (message, options = {}) => render({ ...normalize(message, "default"), ...options }),
  {
    success: (message, options = {}) => render({ ...normalize(message, "success"), ...options }),
    error: (message, options = {}) => render({ ...normalize(message, "error"), ...options }),
    warning: (message, options = {}) => render({ ...normalize(message, "warning"), ...options }),
    info: (message, options = {}) => render({ ...normalize(message, "info"), ...options }),
    loading: (message, options = {}) => render({ ...normalize(message, "loading"), duration: 0, ...options }),
    /**
     * Monitor a promise: show loading, then success or error.
     *
     * ```js
     * V.toast.promise(save(), {
     *   loading: 'Saving...',
     *   success: (data) => `Saved with id ${data.id}`,
     *   error: 'Failed to save'
     * })
     * ```
     */
    async promise(promise, messages2 = {}) {
      const handle = render({ title: messages2.loading ?? "Loading...", type: "loading", duration: 0 });
      try {
        const value = await promise;
        handle.update({
          title: typeof messages2.success === "function" ? messages2.success(value) : messages2.success ?? "Done",
          type: "success",
          duration: settings.duration
        });
        return value;
      } catch (err) {
        handle.update({
          title: typeof messages2.error === "function" ? messages2.error(err) : messages2.error ?? "Something went wrong",
          type: "error",
          duration: settings.duration
        });
        throw err;
      }
    },
    /** Close all open notifications. */
    clear() {
      for (const [position, element] of containers) {
        element.remove();
        containers.delete(position);
      }
    },
    /** Adjust default duration, position, and limit. */
    configure(options) {
      Object.assign(settings, options);
    },
    settings
  }
);

// src/storage/index.ts
function createStorage(getStore, prefix = "") {
  const full = (key) => prefix + key;
  return {
    get(key, fallback) {
      try {
        const raw = getStore()?.getItem(full(key));
        if (raw === null || raw === void 0) return fallback;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        getStore()?.setItem(full(key), typeof value === "string" ? value : JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getStore()?.removeItem(full(key));
      } catch {
      }
    },
    clear() {
      try {
        const store2 = getStore();
        if (!store2) return;
        if (!prefix) {
          store2.clear();
          return;
        }
        for (const key of Object.keys(store2)) {
          if (key.startsWith(prefix)) store2.removeItem(key);
        }
      } catch {
      }
    },
    has(key) {
      try {
        return getStore()?.getItem(full(key)) !== null;
      } catch {
        return false;
      }
    },
    keys() {
      try {
        const store2 = getStore();
        if (!store2) return [];
        return Object.keys(store2).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
      } catch {
        return [];
      }
    }
  };
}
var storage = createStorage(
  () => typeof localStorage !== "undefined" ? localStorage : void 0
);
var session = createStorage(
  () => typeof sessionStorage !== "undefined" ? sessionStorage : void 0
);
var cookie = {
  get(name) {
    if (typeof document === "undefined") return void 0;
    const target = `${encodeURIComponent(name)}=`;
    for (const part of document.cookie.split("; ")) {
      if (part.startsWith(target)) return decodeURIComponent(part.slice(target.length));
    }
    return void 0;
  },
  set(name, value, options = {}) {
    if (typeof document === "undefined") return;
    let text = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    if (options.expires !== void 0) {
      const date = typeof options.expires === "number" ? new Date(Date.now() + options.expires * 864e5) : options.expires;
      text += `; expires=${date.toUTCString()}`;
    }
    text += `; path=${options.path ?? "/"}`;
    if (options.domain) text += `; domain=${options.domain}`;
    if (options.secure) text += "; secure";
    text += `; samesite=${options.sameSite ?? "Lax"}`;
    document.cookie = text;
  },
  remove(name, options = {}) {
    this.set(name, "", { ...options, expires: -1 });
  },
  has(name) {
    return this.get(name) !== void 0;
  }
};
var url = {
  /** Reads a parameter from the current URL. */
  get(key, fallback) {
    if (typeof location === "undefined") return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },
  /** Reads all parameters as an object. */
  all() {
    if (typeof location === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },
  /** Writes a parameter without reloading the page. */
  set(key, value, replace = true) {
    if (typeof location === "undefined") return;
    const next = new URL(location.href);
    if (value === null || value === "") next.searchParams.delete(key);
    else next.searchParams.set(key, String(value));
    history[replace ? "replaceState" : "pushState"]({}, "", next.toString());
  },
  remove(key, replace = true) {
    this.set(key, null, replace);
  },
  /** Applies multiple parameters at once. */
  merge(params, replace = true) {
    if (typeof location === "undefined") return;
    const next = new URL(location.href);
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "") next.searchParams.delete(key);
      else next.searchParams.set(key, String(value));
    }
    history[replace ? "replaceState" : "pushState"]({}, "", next.toString());
  }
};
var memoryCache = /* @__PURE__ */ new Map();
var cache2 = {
  /** Stores a value. `ttl` in milliseconds, `0` means no expiration. */
  set(key, value, ttl = 0) {
    memoryCache.set(key, { value, expires: ttl > 0 ? Date.now() + ttl : Infinity });
    return value;
  },
  get(key, fallback) {
    const entry = memoryCache.get(key);
    if (!entry) return fallback;
    if (entry.expires < Date.now()) {
      memoryCache.delete(key);
      return fallback;
    }
    return entry.value;
  },
  has(key) {
    return this.get(key) !== void 0;
  },
  remove(key) {
    memoryCache.delete(key);
  },
  clear() {
    memoryCache.clear();
  },
  /** Executes the function only when the value is not in cache. */
  async remember(key, ttl, factory) {
    const hit = this.get(key);
    if (hit !== void 0) return hit;
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  },
  get size() {
    return memoryCache.size;
  }
};
var THEME_KEY = "voodoo:theme";
var picked = null;
var theme = {
  /** Theme chosen by the user, or `system` when never set. */
  get current() {
    return storage.get(THEME_KEY) ?? picked ?? "system";
  },
  /** Theme effectively applied, resolving `system`. */
  get resolved() {
    const value = this.current;
    if (value !== "system") return value;
    if (typeof matchMedia === "undefined") return "light";
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  set(value) {
    picked = value;
    storage.set(THEME_KEY, value);
    this.apply();
  },
  toggle() {
    const next = this.resolved === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
  /** `true` once the visitor has actually picked a theme. */
  get chosen() {
    return picked !== null || storage.get(THEME_KEY) != null;
  },
  /** Writes `data-theme` on the root element and notifies the page. */
  apply() {
    if (typeof document === "undefined") return;
    if (!this.chosen) return;
    const value = this.current;
    const root = document.documentElement;
    if (value === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", value);
    root.style.colorScheme = this.resolved;
    document.dispatchEvent(
      new CustomEvent("voodoo:theme", { detail: { theme: value, resolved: this.resolved } })
    );
  },
  /**
   * Applies the saved theme as soon as the page loads.
   *
   * Does nothing when the visitor never chose one, which is the common case on
   * a page that simply included the script.
   */
  init() {
    if (typeof document === "undefined") return;
    this.apply();
    if (typeof matchMedia === "undefined") return;
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this.current === "system") this.apply();
    });
  }
};

// src/runtime/magics.ts
var screen = reactive({
  width: 0,
  height: 0,
  mobile: false,
  tablet: false,
  desktop: false,
  portrait: false,
  landscape: false,
  /** Check an arbitrary media query. */
  matches(query2) {
    return typeof matchMedia !== "undefined" && matchMedia(query2).matches;
  }
});
function updateScreen() {
  if (typeof window === "undefined") return;
  screen.width = window.innerWidth;
  screen.height = window.innerHeight;
  screen.mobile = window.innerWidth < 768;
  screen.tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  screen.desktop = window.innerWidth >= 1024;
  screen.portrait = window.innerHeight >= window.innerWidth;
  screen.landscape = !screen.portrait;
}
var network = reactive({
  online: true,
  /** Connection type reported by the browser, when available. */
  type: "unknown",
  /** `true` when the user requested data saving mode. */
  saveData: false,
  slow: false
});
function updateNetwork() {
  if (typeof navigator === "undefined") return;
  network.online = navigator.onLine;
  const connection = navigator.connection;
  if (connection) {
    network.type = connection.effectiveType ?? "unknown";
    network.saveData = !!connection.saveData;
    network.slow = connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
  }
}
var clipboard = {
  /** Copy text, with fallback for browsers without the modern API. */
  async copy(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  },
  /** Read clipboard content, when the user allows. */
  async read() {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return "";
    }
  }
};
var installed = false;
function installMagics() {
  if (installed) return;
  installed = true;
  magic("$el", (scope) => scope.el);
  magic("$refs", (scope) => scope.allRefs);
  magic("$data", (scope) => scope.data);
  magic("$root", (scope) => scope.root.data);
  magic("$parent", (scope) => scope.parent?.data ?? null);
  magic("$self", (scope) => scope.owner?.component ?? scope.data);
  magic("$store", () => allStores);
  magic("$http", () => http);
  magic("$toast", () => toast);
  magic("$clipboard", () => clipboard);
  magic("$storage", () => storage);
  magic("$session", () => session);
  magic("$cookie", () => cookie);
  magic("$cache", () => cache2);
  magic("$url", () => url);
  magic("$theme", () => theme);
  magic("$device", () => device);
  magic("$screen", () => screen);
  magic("$network", () => network);
  magic("$nextTick", () => nextTick);
  magic(
    "$watch",
    (scope) => (expression, callback) => watch(() => evaluateIn(expression, scope, "$watch"), callback)
  );
  magic("$dispatch", (scope) => (name, detail) => {
    const target = scope.el ?? document;
    target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  });
  magic("$log", () => (...args) => {
    console.log("[Voodoo]", ...args);
  });
  if (typeof window === "undefined") return;
  updateScreen();
  updateNetwork();
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateScreen);
  });
  window.addEventListener("orientationchange", updateScreen);
  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  navigator.connection?.addEventListener?.(
    "change",
    updateNetwork
  );
}

// src/http/resource.ts
init_reactivity();
function pick(value, path) {
  if (!path) return value;
  let current2 = value;
  for (const part of path.split(".")) {
    if (current2 == null) return void 0;
    current2 = current2[part];
  }
  return current2;
}
function extractMessage(error) {
  const data2 = error.response?.data;
  if (!data2 || typeof data2 !== "object") return null;
  for (const key of ["message", "error", "detail", "msg"]) {
    const value = data2[key];
    if (typeof value === "string") return value;
  }
  return null;
}
function createResource(url2, options = {}) {
  const resolveUrl2 = () => typeof url2 === "function" ? url2() : url2;
  const resolveParams = () => typeof options.params === "function" ? options.params() : options.params;
  let controller = null;
  let timer = null;
  const resource = reactive({
    data: null,
    loading: false,
    error: null,
    loaded: false,
    async reload() {
      const endereco = resolveUrl2();
      if (!endereco) return;
      controller?.abort();
      const atual = controller = new AbortController();
      resource.loading = true;
      resource.error = null;
      try {
        const response = await http.request({
          url: endereco,
          method: (options.method || "GET").toUpperCase(),
          params: resolveParams(),
          headers: options.headers,
          cache: options.cache || void 0,
          retry: options.retry ?? 0,
          timeout: options.timeout ?? http.defaults.timeout,
          signal: atual.signal
        });
        if (atual.signal.aborted) return;
        resource.data = pick(response.data, options.jsonPath);
        resource.loaded = true;
        options.onSuccess?.(resource.data);
      } catch (err) {
        if (atual.signal.aborted) return;
        const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err.message;
        resource.error = { name: "ResourceError", message };
        options.onError?.(err, message);
      } finally {
        if (!atual.signal.aborted) resource.loading = false;
        if (controller === atual) controller = null;
      }
    },
    set(value) {
      resource.data = value;
    },
    stop() {
      controller?.abort();
      controller = null;
      resource.loading = false;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
  });
  if (options.poll && options.poll > 0) {
    timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void resource.reload();
      }
    }, options.poll);
  }
  if (!options.manual) void resource.reload();
  return resource;
}

// src/core.ts
init_style();

// src/dom/transition.ts
init_style();
var BUILT_IN_CSS = `
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
function classesFor(options) {
  const name = options.name || "v-fade";
  return {
    enterFrom: options.enterFrom || `${name}-enter-from`,
    enterActive: options.enterActive || `${name}-enter-active`,
    enterTo: options.enterTo || `${name}-enter-to`,
    leaveFrom: options.leaveFrom || `${name}-leave-from`,
    leaveActive: options.leaveActive || `${name}-leave-active`,
    leaveTo: options.leaveTo || `${name}-leave-to`
  };
}
function addClasses(el, list) {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.add(cls);
}
function removeClasses(el, list) {
  for (const cls of list.split(/\s+/).filter(Boolean)) el.classList.remove(cls);
}
function readDuration(el) {
  const style = getComputedStyle(el);
  const parse2 = (value) => Math.max(0, ...value.split(",").map((v) => parseFloat(v) * (v.includes("ms") ? 1 : 1e3) || 0));
  return Math.max(
    parse2(style.transitionDuration) + parse2(style.transitionDelay),
    parse2(style.animationDuration) + parse2(style.animationDelay)
  );
}
function nextFrame(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}
function enter(el, options = {}) {
  injectStyle("transitions", BUILT_IN_CSS);
  const c = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve2) => {
    addClasses(el, c.enterFrom);
    addClasses(el, c.enterActive);
    nextFrame(() => {
      removeClasses(el, c.enterFrom);
      addClasses(el, c.enterTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c.enterActive);
        removeClasses(el, c.enterTo);
        resolve2();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function leave(el, options = {}) {
  injectStyle("transitions", BUILT_IN_CSS);
  const c = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve2) => {
    addClasses(el, c.leaveFrom);
    addClasses(el, c.leaveActive);
    nextFrame(() => {
      removeClasses(el, c.leaveFrom);
      addClasses(el, c.leaveTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c.leaveActive);
        removeClasses(el, c.leaveTo);
        resolve2();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function slideDown(el, duration = 240) {
  return new Promise((resolve2) => {
    el.style.removeProperty("display");
    if (getComputedStyle(el).display === "none") el.style.display = "block";
    const target = el.scrollHeight;
    el.style.overflow = "hidden";
    el.style.height = "0px";
    el.style.paddingTop = "0px";
    el.style.paddingBottom = "0px";
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.removeProperty("padding-top");
      el.style.removeProperty("padding-bottom");
      el.style.height = `${target}px`;
    });
    setTimeout(() => {
      el.style.removeProperty("height");
      el.style.removeProperty("overflow");
      el.style.removeProperty("transition");
      resolve2();
    }, duration + 20);
  });
}
function slideUp(el, duration = 240) {
  return new Promise((resolve2) => {
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = "hidden";
    el.style.transition = `height ${duration}ms var(--v-ease, ease), padding ${duration}ms var(--v-ease, ease)`;
    requestAnimationFrame(() => {
      el.style.height = "0px";
      el.style.paddingTop = "0px";
      el.style.paddingBottom = "0px";
    });
    setTimeout(() => {
      el.style.display = "none";
      el.style.removeProperty("height");
      el.style.removeProperty("padding-top");
      el.style.removeProperty("padding-bottom");
      el.style.removeProperty("overflow");
      el.style.removeProperty("transition");
      resolve2();
    }, duration + 20);
  });
}
function fadeIn(el, duration = 220) {
  return new Promise((resolve2) => {
    el.style.opacity = "0";
    el.style.removeProperty("display");
    if (getComputedStyle(el).display === "none") el.style.display = "";
    el.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    setTimeout(() => {
      el.style.removeProperty("transition");
      el.style.removeProperty("opacity");
      resolve2();
    }, duration + 20);
  });
}
function fadeOut(el, duration = 220) {
  return new Promise((resolve2) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
      el.style.removeProperty("transition");
      el.style.removeProperty("opacity");
      resolve2();
    }, duration + 20);
  });
}
function viewTransition(update) {
  const doc = document;
  if (typeof doc.startViewTransition === "function" && !device.reducedMotion) {
    doc.startViewTransition(update);
  } else {
    update();
  }
}

// src/directives/core.ts
init_reactivity();
init_registry();
function setValue(expression, scope, value) {
  try {
    const target = parse(expression);
    const assignment = {
      t: "assign",
      op: "=",
      target,
      value: { t: "lit", v: value }
    };
    evaluate(assignment, scope);
  } catch (err) {
    handleError(err, `assignment in "${expression}"`);
  }
}
function transitionOptions(el) {
  const p2 = config.prefix;
  const has = el.hasAttribute(`${p2}transition`);
  const custom = el.hasAttribute(`${p2}enter-class`) || el.hasAttribute(`${p2}leave-class`) || el.hasAttribute(`${p2}enter-active-class`) || el.hasAttribute(`${p2}leave-active-class`);
  if (!has && !custom) return null;
  const name = el.getAttribute(`${p2}transition`) || "fade";
  return {
    name: name.startsWith("v-") ? name : `v-${name}`,
    enterFrom: el.getAttribute(`${p2}enter-class`) || void 0,
    enterActive: el.getAttribute(`${p2}enter-active-class`) || void 0,
    enterTo: el.getAttribute(`${p2}enter-to-class`) || void 0,
    leaveFrom: el.getAttribute(`${p2}leave-class`) || void 0,
    leaveActive: el.getAttribute(`${p2}leave-active-class`) || void 0,
    leaveTo: el.getAttribute(`${p2}leave-to-class`) || void 0,
    duration: el.hasAttribute(`${p2}duration`) ? parseDuration(el.getAttribute(`${p2}duration`)) : void 0
  };
}
defineDirective("text", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => {
    el.textContent = stringify(ev());
    const first = el.firstChild;
    if (first && first.nodeType === 3) markInitialized(first);
  });
});
defineDirective("html", (ctx) => {
  const { el, effect: effect2, evaluate: ev, scope } = ctx;
  markSkipChildren(el);
  effect2(() => {
    const value = ev();
    for (const child of Array.from(el.children)) destroy(child);
    el.innerHTML = value == null ? "" : String(value);
    for (const child of Array.from(el.children)) walk(child, scope);
  });
});
defineDirective("show", ({ el, effect: effect2, evaluate: ev }) => {
  const original = el.style.display === "none" ? "" : el.style.display;
  let first = true;
  const options = transitionOptions(el);
  effect2(() => {
    const visible = !!ev();
    if (first) {
      first = false;
      el.style.display = visible ? original : "none";
      return;
    }
    if (!options) {
      el.style.display = visible ? original : "none";
      return;
    }
    if (visible) {
      el.style.display = original;
      void enter(el, options);
    } else {
      void leave(el, options).then(() => {
        el.style.display = "none";
      });
    }
  });
});
defineDirective(
  "if",
  ({ el, scope, expression, effect: effect2 }) => {
    const p2 = config.prefix;
    const branches = [{ expression, template: el }];
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.hasAttribute(`${p2}else-if`)) {
        branches.push({
          expression: sibling.getAttribute(`${p2}else-if`) || "false",
          template: sibling
        });
        sibling = sibling.nextElementSibling;
      } else if (sibling.hasAttribute(`${p2}else`)) {
        branches.push({ expression: null, template: sibling });
        sibling = sibling.nextElementSibling;
        break;
      } else {
        break;
      }
    }
    const anchor = document.createComment(config.devtools ? ` v-if: ${expression} ` : "");
    el.parentNode?.insertBefore(anchor, el);
    for (const branch of branches) {
      removeQuietly(branch.template);
      branch.template.removeAttribute(`${p2}if`);
      branch.template.removeAttribute(`${p2}else-if`);
      branch.template.removeAttribute(`${p2}else`);
      markInitialized(branch.template);
    }
    const options = transitionOptions(el);
    let activeIndex = -1;
    let activeNodes = [];
    const removeActive = () => {
      const nodes = activeNodes;
      activeNodes = [];
      if (!nodes.length) return;
      const finish = () => {
        for (const node of nodes) {
          destroy(node);
          node.remove();
        }
      };
      if (options && nodes[0] instanceof HTMLElement) {
        void leave(nodes[0], options).then(finish);
      } else {
        finish();
      }
    };
    effect2(() => {
      let matched = -1;
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        if (branch.expression === null || evaluateIn(branch.expression, scope, "v-if")) {
          matched = i;
          break;
        }
      }
      if (matched === activeIndex) return;
      activeIndex = matched;
      removeActive();
      if (matched === -1) return;
      const source = branches[matched].template;
      const nodes = renderTemplate(source, anchor, scope);
      activeNodes = nodes;
      if (options && nodes[0] instanceof HTMLElement) void enter(nodes[0], options);
    });
    addCleanup(el, removeActive);
  },
  { priority: PRIORITY.IF, terminal: true }
);
function renderTemplate(source, anchor, scope, batch) {
  const parent = anchor.parentNode;
  if (!parent) return [];
  const nodes = [];
  if (source.tagName === "TEMPLATE") {
    const fragment = source.content.cloneNode(true);
    const children = Array.from(fragment.childNodes);
    parent.insertBefore(fragment, anchor);
    for (const node of children) {
      nodes.push(node);
      if (node.nodeType === 1) {
        markNodeScope(node, scope);
        walk(node, scope);
      }
    }
  } else {
    const clone2 = source.cloneNode(true);
    nodes.push(clone2);
    markNodeScope(clone2, scope);
    if (batch) {
      batch.fragment.appendChild(clone2);
      batch.pending.push([clone2, scope]);
    } else {
      parent.insertBefore(clone2, anchor);
      walk(clone2, scope);
    }
  }
  return nodes;
}
defineDirective("else-if", () => void 0, { priority: PRIORITY.IF, terminal: true });
defineDirective("else", () => void 0, { priority: PRIORITY.IF, terminal: true });
var FOR_PATTERN = /^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+?)\s*$/;
defineDirective(
  "for",
  ({ el, scope, expression, effect: effect2 }) => {
    const match = FOR_PATTERN.exec(expression);
    if (!match) {
      handleError(
        new Error(`Invalid syntax in v-for="${expression}". Use "item in items".`),
        "v-for"
      );
      return;
    }
    const aliases = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const sourceExpression = match[2];
    const [itemAlias, indexAlias, thirdAlias] = aliases;
    const p2 = config.prefix;
    const keyExpression = el.getAttribute(":key") || el.getAttribute(`${p2}bind:key`) || el.getAttribute(`${p2}key`);
    const anchor = document.createComment(config.devtools ? ` v-for: ${expression} ` : "");
    el.parentNode?.insertBefore(anchor, el);
    const template = el.cloneNode(true);
    template.removeAttribute(`${p2}for`);
    template.removeAttribute(":key");
    template.removeAttribute(`${p2}bind:key`);
    template.removeAttribute(`${p2}key`);
    removeQuietly(el);
    let blocks = [];
    const clearAll = () => {
      for (const block2 of blocks) {
        for (const node of block2.nodes) {
          destroy(node);
          node.remove();
        }
      }
      blocks = [];
    };
    addCleanup(anchor, clearAll);
    effect2(() => {
      const source = evaluateIn(sourceExpression, scope, "v-for");
      const entries = normalizeSource(source, itemAlias, indexAlias, thirdAlias);
      const previous = /* @__PURE__ */ new Map();
      for (const block2 of blocks) previous.set(block2.key, block2);
      const next = [];
      const used = /* @__PURE__ */ new Set();
      const batch = {
        fragment: document.createDocumentFragment(),
        pending: []
      };
      entries.forEach((vars, index) => {
        const key = keyExpression ? evaluateIn(keyExpression, scope.child(vars), ":key") : `__index_${index}`;
        if (keyExpression && used.has(key)) warnDuplicateKey(el, key, expression);
        const existing = previous.get(key);
        if (existing && !used.has(key)) {
          used.add(key);
          for (const [name, value] of Object.entries(vars)) existing.data[name] = value;
          next.push(existing);
          return;
        }
        const childScope = scope.reactiveChild(vars);
        const nodes = renderTemplate(template, anchor, childScope, batch);
        used.add(key);
        next.push({ key, scope: childScope, nodes, data: childScope.data });
      });
      if (batch.fragment.firstChild) anchor.parentNode?.insertBefore(batch.fragment, anchor);
      for (const [node, rowScope] of batch.pending) walk(node, rowScope);
      const reused = new Set(next);
      for (const block2 of blocks) {
        if (used.has(block2.key) && reused.has(block2)) continue;
        for (const node of block2.nodes) {
          destroy(node);
          node.remove();
        }
      }
      let cursor = anchor;
      for (let i = next.length - 1; i >= 0; i--) {
        const block2 = next[i];
        const last = block2.nodes[block2.nodes.length - 1];
        if (last && last.nextSibling !== cursor) {
          for (const node of block2.nodes) anchor.parentNode?.insertBefore(node, cursor);
        }
        cursor = block2.nodes[0] ?? cursor;
      }
      blocks = next;
    });
  },
  { priority: PRIORITY.FOR, terminal: true }
);
function normalizeSource(source, itemAlias, indexAlias, thirdAlias) {
  const out = [];
  if (Array.isArray(source)) {
    source.forEach((item, index) => {
      const vars = { [itemAlias]: item };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }
  if (typeof source === "number") {
    for (let i = 1; i <= source; i++) {
      const vars = { [itemAlias]: i };
      if (indexAlias) vars[indexAlias] = i - 1;
      out.push(vars);
    }
    return out;
  }
  if (typeof source === "string") {
    Array.from(source).forEach((ch, index) => {
      const vars = { [itemAlias]: ch };
      if (indexAlias) vars[indexAlias] = index;
      out.push(vars);
    });
    return out;
  }
  if (source && typeof source === "object") {
    const iterable = source instanceof Map ? Array.from(source.entries()) : source instanceof Set ? Array.from(source).map((v, i) => [i, v]) : Object.entries(source);
    iterable.forEach(([key, value], index) => {
      const vars = { [itemAlias]: value };
      if (indexAlias) vars[indexAlias] = key;
      if (thirdAlias) vars[thirdAlias] = index;
      out.push(vars);
    });
  }
  return out;
}
var BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set([
  "disabled",
  "checked",
  "readonly",
  "required",
  "selected",
  "hidden",
  "open",
  "multiple",
  "autofocus",
  "novalidate",
  "inert"
]);
var URL_ATTRIBUTES = /* @__PURE__ */ new Set([
  "href",
  "src",
  "action",
  "formaction",
  "xlink:href",
  "ping",
  "poster"
]);
var SCHEME_NOISE = /[\s\x00-\x1f]/g;
function isDangerousUrl(value) {
  const clean = value.replace(SCHEME_NOISE, "").toLowerCase();
  return clean.startsWith("javascript:") || clean.startsWith("vbscript:") || clean.startsWith("data:text/html") || clean.startsWith("data:application/xhtml");
}
function applyBinding(el, name, value, asProp = false, allowDangerous = false) {
  if (name === "class") return applyClass(el, value);
  if (name === "style") return applyStyle(el, value);
  if (config.sanitizeUrls && !allowDangerous && name === "srcdoc") {
    warn2(
      `:srcdoc refused in ${describeElement(el)}: the value becomes a document with active script inside the iframe, the same way v-html becomes markup. If the content is trusted, write :srcdoc.dangerous="..."; to turn off this protection on the entire application, set V.config.sanitizeUrls = false.`
    );
    el.removeAttribute(name);
    return;
  }
  if (config.sanitizeUrls && !asProp) {
    if (URL_ATTRIBUTES.has(name) && typeof value === "string" && isDangerousUrl(value)) {
      warn2(
        `value refused in :${name} of ${describeElement(el)}: "${value.slice(0, 60)}" uses a scheme that executes code. Use an http(s) or relative address. To turn off this protection, set V.config.sanitizeUrls = false.`
      );
      el.removeAttribute(name);
      return;
    }
    if (name.length > 2 && /^on[a-z]/.test(name)) {
      warn2(
        `attribute "${name}" refused in ${describeElement(el)}: linking event by attribute creates an inline handler. Use @${name.slice(2)}="..." instead.`
      );
      el.removeAttribute(name);
      return;
    }
  }
  if (asProp) {
    el[name] = value;
    return;
  }
  if (BOOLEAN_ATTRIBUTES.has(name)) {
    if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, "");
    if (name in el) el[name] = !!value;
    return;
  }
  if (name === "value" && "value" in el) {
    el.value = value == null ? "" : value;
    return;
  }
  if (value == null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? "" : String(value));
}
var baseClasses = /* @__PURE__ */ new WeakMap();
function applyClass(el, value) {
  let base = baseClasses.get(el);
  if (!base) {
    base = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    baseClasses.set(el, base);
  }
  const next = new Set(base);
  collectClasses(value, next);
  el.setAttribute("class", Array.from(next).join(" "));
  if (!el.getAttribute("class")) el.removeAttribute("class");
}
function collectClasses(value, out) {
  if (!value) return;
  if (typeof value === "string") {
    for (const cls of value.split(/\s+/)) if (cls) out.add(cls);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const [cls, active] of Object.entries(value)) {
      if (active) {
        for (const c of cls.split(/\s+/)) if (c) out.add(c);
      }
    }
  }
}
function applyStyle(el, value) {
  if (!value) return;
  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) applyStyle(el, item);
    return;
  }
  for (const [prop, raw] of Object.entries(value)) {
    if (raw == null || raw === false) {
      el.style.removeProperty(prop);
      continue;
    }
    const name = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const text = String(raw);
    if (name.startsWith("--")) el.style.setProperty(name, text);
    else el.style.setProperty(name, text);
  }
}
defineDirective(
  "bind",
  ({ el, arg, modifiers, effect: effect2, evaluate: ev, expression }) => {
    if (!arg) {
      effect2(() => {
        const values = ev();
        if (values && typeof values === "object") {
          for (const [name, value] of Object.entries(values)) applyBinding(el, name, value);
        }
      });
      return;
    }
    if (arg === "key") return;
    const asProp = !!modifiers.prop;
    const allowDangerous = !!modifiers.dangerous;
    effect2(() => {
      applyBinding(el, arg, ev(), asProp, allowDangerous);
    });
  },
  { priority: PRIORITY.BIND }
);
defineDirective("class", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => applyClass(el, ev()));
});
defineDirective("style", ({ el, effect: effect2, evaluate: ev }) => {
  effect2(() => applyStyle(el, ev()));
});
var KEY_ALIASES = {
  enter: ["Enter"],
  esc: ["Escape"],
  escape: ["Escape"],
  space: [" ", "Spacebar"],
  tab: ["Tab"],
  delete: ["Delete", "Backspace"],
  backspace: ["Backspace"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"]
};
var SYSTEM_MODIFIERS = ["ctrl", "shift", "alt", "meta"];
function runHandler(expression, scope, event, el) {
  const payload = event.detail;
  const isEmit = event.__voodoo === true;
  const local = scope.child({
    $event: isEmit ? payload : event,
    $rawEvent: event,
    $el: el,
    $detail: payload
  });
  try {
    const node = parse(expression);
    const value = evaluate(node, local);
    if (typeof value === "function" && (node.t === "id" || node.t === "member")) {
      value.call(scope.data, isEmit ? payload : event);
    }
  } catch (err) {
    handleError(err, `event ${event.type} ("${expression}")`);
  }
}
var EVENT_ALIASES = {
  hover: "mouseenter",
  unhover: "mouseleave",
  tap: "click",
  press: "pointerdown",
  release: "pointerup",
  rightclick: "contextmenu",
  enterkey: "keydown",
  type: "input",
  submitform: "submit"
};
var customEvents = {
  /** Hold pressed. Duration via modifier, like `@hold.1s`. */
  hold(el, run, modifiers, cleanup) {
    const holdFor = parseDuration(
      typeof modifiers.duration === "string" && modifiers.duration || Object.keys(modifiers).find((m) => /^[\d.]+(ms|s)?$/.test(m)) || el.getAttribute(`${config.prefix}hold-duration`) || 800,
      800
    );
    let timer = null;
    let fired = false;
    const start2 = (event) => {
      fired = false;
      el.classList.add("v-holding");
      el.style.setProperty("--v-hold-duration", `${holdFor}ms`);
      timer = setTimeout(() => {
        fired = true;
        el.classList.remove("v-holding");
        run(event);
      }, holdFor);
    };
    const stopHold = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      el.classList.remove("v-holding");
    };
    const swallowClick = (event) => {
      if (fired) {
        event.preventDefault();
        event.stopPropagation();
        fired = false;
      }
    };
    el.addEventListener("pointerdown", start2);
    el.addEventListener("pointerup", stopHold);
    el.addEventListener("pointerleave", stopHold);
    el.addEventListener("pointercancel", stopHold);
    el.addEventListener("click", swallowClick, true);
    cleanup(() => {
      stopHold();
      el.removeEventListener("pointerdown", start2);
      el.removeEventListener("pointerup", stopHold);
      el.removeEventListener("pointerleave", stopHold);
      el.removeEventListener("pointercancel", stopHold);
      el.removeEventListener("click", swallowClick, true);
    });
  },
  /** Click anywhere outside the element. */
  outside(el, run, _modifiers, cleanup) {
    const handler = (event) => {
      if (!el.isConnected) return;
      if (el === event.target || el.contains(event.target)) return;
      run(event);
    };
    document.addEventListener("click", handler, true);
    cleanup(() => document.removeEventListener("click", handler, true));
  },
  /** Element entered visible area. */
  visible(el, run, modifiers, cleanup) {
    if (typeof IntersectionObserver === "undefined") {
      run(new CustomEvent("visible"));
      return;
    }
    const observer3 = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(new CustomEvent("visible", { detail: entry }));
          if (modifiers.repeat !== true) observer3.unobserve(el);
        }
      },
      { threshold: Number(modifiers.threshold ?? 0.1), rootMargin: String(modifiers.margin ?? "0px") }
    );
    observer3.observe(el);
    cleanup(() => observer3.disconnect());
  }
};
for (const direction of ["left", "right", "up", "down"]) {
  customEvents[`swipe${direction}`] = (el, run, _modifiers, cleanup) => {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const down = (event) => {
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    };
    const up = (event) => {
      if (!tracking) return;
      tracking = false;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const threshold = 40;
      const matched = direction === "left" ? dx < -threshold && Math.abs(dx) > Math.abs(dy) : direction === "right" ? dx > threshold && Math.abs(dx) > Math.abs(dy) : direction === "up" ? dy < -threshold && Math.abs(dy) > Math.abs(dx) : dy > threshold && Math.abs(dy) > Math.abs(dx);
      if (matched) run(new CustomEvent(`swipe${direction}`, { detail: { dx, dy } }));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    cleanup(() => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    });
  };
}
function bindEvent(el, rawEventName, expression, scope, modifiers, cleanup) {
  const eventName = EVENT_ALIASES[rawEventName] ?? rawEventName;
  const custom = customEvents[rawEventName];
  if (custom) {
    custom(
      el,
      (event) => {
        if (modifiers.prevent) event.preventDefault();
        if (modifiers.stop) event.stopPropagation();
        runHandler(expression, scope, event, el);
      },
      modifiers,
      cleanup
    );
    return;
  }
  const target = modifiers.window ? window : modifiers.document ? document : modifiers.outside ? document : el;
  let handler = (event) => {
    if (modifiers.self && event.target !== el) return;
    if (modifiers.outside) {
      if (el === event.target || el.contains(event.target)) return;
      if (!el.isConnected) return;
    }
    if (event instanceof KeyboardEvent) {
      for (const mod of SYSTEM_MODIFIERS) {
        if (modifiers[mod] && !event[`${mod}Key`]) return;
      }
      const keyMods = Object.keys(modifiers).filter(
        (m) => m in KEY_ALIASES || /^[a-z0-9]$/.test(m)
      );
      if (keyMods.length) {
        const matched = keyMods.some((m) => {
          const aliases = KEY_ALIASES[m];
          if (aliases) return aliases.includes(event.key);
          return event.key.toLowerCase() === m;
        });
        if (!matched) return;
      }
    }
    if (modifiers.prevent) event.preventDefault();
    if (modifiers.stop) event.stopPropagation();
    runHandler(expression, scope, event, el);
  };
  const wait2 = modifiers.debounce;
  if (wait2 !== void 0) {
    handler = debounce(handler, parseDuration(wait2 === true ? 250 : wait2, 250));
  }
  const throttleWait = modifiers.throttle;
  if (throttleWait !== void 0) {
    handler = throttle(handler, parseDuration(throttleWait === true ? 250 : throttleWait, 250));
  }
  const options = {
    capture: !!modifiers.capture,
    once: !!modifiers.once,
    passive: !!modifiers.passive
  };
  target.addEventListener(eventName, handler, options);
  cleanup(() => target.removeEventListener(eventName, handler, options));
}
defineDirective("on", ({ el, arg, expression, scope, modifiers, cleanup }) => {
  if (!arg) return;
  bindEvent(el, arg, expression, scope, modifiers, cleanup);
});
var EVENT_SHORTCUTS = [
  "click",
  "dblclick",
  "input",
  "change",
  "keyup",
  "keydown",
  "keypress",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mousedown",
  "mouseup",
  "contextmenu",
  "wheel",
  "paste",
  "dragstart",
  "dragover",
  "dragleave",
  "drop"
];
for (const name of EVENT_SHORTCUTS) {
  defineDirective(name, ({ el, expression, scope, modifiers, cleanup }) => {
    bindEvent(el, name, expression, scope, modifiers, cleanup);
  });
}
defineDirective(
  "model",
  ({ el, expression, scope, modifiers, effect: effect2, cleanup }) => {
    const input = el;
    const tag = input.tagName;
    const type = (input.getAttribute("type") || "text").toLowerCase();
    const isCheckbox = tag === "INPUT" && type === "checkbox";
    const isRadio = tag === "INPUT" && type === "radio";
    const isSelect = tag === "SELECT";
    const isMultiSelect = isSelect && input.multiple;
    const isFile = tag === "INPUT" && type === "file";
    const isNumberInput = type === "number" || type === "range";
    const lazy = !!modifiers.lazy;
    const wantsNumber = !!modifiers.number || isNumberInput;
    const wantsTrim = !!modifiers.trim;
    const debounceMs = modifiers.debounce ? parseDuration(modifiers.debounce === true ? 250 : modifiers.debounce, 250) : el.getAttribute(`${config.prefix}debounce`) ? parseDuration(el.getAttribute(`${config.prefix}debounce`), 250) : 0;
    const eventName = lazy || isSelect || isCheckbox || isRadio || isFile ? "change" : "input";
    let onInput = () => {
      let value;
      if (isCheckbox) {
        const current2 = evaluateIn(expression, scope, "v-model");
        if (Array.isArray(current2)) {
          const itemValue = input.value;
          const list = [...current2];
          const index = list.indexOf(itemValue);
          if (input.checked && index === -1) list.push(itemValue);
          else if (!input.checked && index > -1) list.splice(index, 1);
          value = list;
        } else {
          value = input.checked;
        }
      } else if (isRadio) {
        if (!input.checked) return;
        value = input.value;
      } else if (isMultiSelect) {
        value = Array.from(input.selectedOptions).map(
          (option) => option.value
        );
      } else if (isFile) {
        value = modifiers.single ? input.files?.[0] ?? null : input.files;
      } else {
        value = input.value;
        if (wantsTrim && typeof value === "string") value = value.trim();
        if (wantsNumber && typeof value === "string") {
          const n = value === "" ? null : Number(value);
          value = n === null || Number.isNaN(n) ? value : n;
        }
      }
      setValue(expression, scope, value);
    };
    if (debounceMs > 0) onInput = debounce(onInput, debounceMs);
    input.addEventListener(eventName, onInput);
    cleanup(() => input.removeEventListener(eventName, onInput));
    effect2(() => {
      const value = evaluateIn(expression, scope, "v-model");
      if (isCheckbox) {
        input.checked = Array.isArray(value) ? value.includes(input.value) : !!value;
        return;
      }
      if (isRadio) {
        input.checked = String(value) === input.value;
        return;
      }
      if (isMultiSelect) {
        const list = Array.isArray(value) ? value.map(String) : [];
        for (const option of Array.from(input.options)) {
          option.selected = list.includes(option.value);
        }
        return;
      }
      if (isFile) return;
      const next = value == null ? "" : String(value);
      if (input.value !== next) input.value = next;
      if (isSelect && input.value !== next) {
        void nextTick(() => {
          if (input.value !== next) input.value = next;
        });
      }
    });
  },
  { priority: PRIORITY.MODEL }
);
defineDirective(
  "init",
  ({ el, expression, scope }) => {
    queuePostFlush(() => {
      const local = scope.child({ $el: el });
      const value = evaluateIn(expression, local, "v-init");
      if (typeof value === "function") value.call(scope.data);
    });
  },
  { priority: PRIORITY.INIT }
);
defineDirective(
  "ref",
  ({ el, expression, scope, cleanup }) => {
    const name = expression.trim();
    if (!name) return;
    const target = scope.owner ?? scope;
    target.refs[name] = el;
    cleanup(() => {
      if (target.refs[name] === el) delete target.refs[name];
    });
  },
  { priority: PRIORITY.REF }
);
defineDirective("effect", ({ effect: effect2, evaluate: ev }) => {
  effect2(() => {
    ev();
  });
});
defineDirective("watch", ({ el, expression, scope, effect: effect2 }) => {
  const modelExpression = el.getAttribute(`${config.prefix}model`);
  let previous;
  let first = true;
  effect2(() => {
    const value = modelExpression ? evaluateIn(modelExpression, scope, "v-watch") : evaluateIn(expression, scope, "v-watch");
    if (first) {
      first = false;
      previous = value;
      return;
    }
    if (value === previous) return;
    const old = previous;
    previous = value;
    if (modelExpression) {
      const local = scope.child({ $value: value, $old: old, $el: el });
      const result = evaluateIn(expression, local, "v-watch");
      if (typeof result === "function") result.call(scope.data, value, old);
    }
  });
});
defineDirective("cloak", ({ el }) => {
  el.removeAttribute(`${config.prefix}cloak`);
});
defineDirective("once", ({ el, effect: effect2, evaluate: ev }) => {
  const value = ev();
  if (value !== void 0) el.textContent = stringify(value);
});
defineDirective(
  "teleport",
  ({ el, expression, cleanup }) => {
    const selector = expression.trim() || "body";
    const target = selector === "body" ? document.body : document.querySelector(selector);
    if (!target) {
      handleError(new Error(`v-teleport destination not found: ${selector}`), "v-teleport");
      return;
    }
    const placeholder = document.createComment(" v-teleport ");
    el.parentNode?.insertBefore(placeholder, el);
    target.appendChild(el);
    cleanup(() => {
      placeholder.parentNode?.insertBefore(el, placeholder);
      placeholder.remove();
    });
  },
  { priority: PRIORITY.DATA }
);
for (const name of [
  "transition",
  "enter-class",
  "enter-active-class",
  "enter-to-class",
  "leave-class",
  "leave-active-class",
  "leave-to-class",
  "duration",
  "key",
  "slot",
  "ignore",
  "pre"
]) {
  defineDirective(name, () => void 0, { priority: PRIORITY.TRANSITION });
}
defineDirective("data", () => void 0, { priority: PRIORITY.DATA });
defineDirective("component", () => void 0, { priority: PRIORITY.COMPONENT });

// src/directives/http.ts
init_reactivity();
init_registry();
var p = () => config.prefix;
function attr(el, name) {
  return readAttr(el, `${p()}${name}`);
}
function hasAttr2(el, name) {
  return hasAttr(el, `${p()}${name}`);
}
function readSettings(el, scope) {
  const targetSelector = attr(el, "target");
  const loadingSelector = attr(el, "loading");
  let headers = {};
  const headersExpression = attr(el, "headers");
  if (headersExpression) {
    const parsed = evaluateIn(headersExpression, scope, "v-headers");
    if (parsed && typeof parsed === "object") headers = parsed;
  }
  return {
    target: targetSelector ? document.querySelector(targetSelector) : null,
    swap: attr(el, "swap") || "innerHTML",
    loadingTarget: loadingSelector ? document.querySelector(loadingSelector) : null,
    loadingClass: attr(el, "loading-class") || "v-loading",
    disableWhileLoading: hasAttr2(el, "disable-loading"),
    confirmMessage: attr(el, "confirm"),
    toastSuccess: attr(el, "toast-success"),
    toastError: attr(el, "toast-error"),
    onSuccess: attr(el, "on-success"),
    onError: attr(el, "on-error"),
    onComplete: attr(el, "on-complete"),
    cacheMs: parseDuration(attr(el, "cache") ?? void 0, 0),
    retry: Number(attr(el, "retry") ?? 0),
    timeout: parseDuration(attr(el, "timeout") ?? void 0, http.defaults.timeout),
    storeAs: attr(el, "as"),
    jsonPath: attr(el, "json-path"),
    templateSelector: attr(el, "template"),
    offlineQueue: hasAttr2(el, "offline-queue"),
    headers,
    redirect: attr(el, "redirect"),
    scrollTo: attr(el, "scroll-to")
  };
}
function swapContent(target, html, mode, scope) {
  const initialize = (nodes) => {
    for (const node of Array.from(nodes)) if (node.nodeType === 1) walk(node, scope);
  };
  switch (mode) {
    case "none":
      return;
    case "delete":
      destroy(target);
      target.remove();
      return;
    case "textContent":
      target.textContent = html;
      return;
    case "outerHTML":
    case "replace": {
      const template = document.createElement("template");
      template.innerHTML = html;
      const nodes = Array.from(template.content.childNodes);
      destroy(target);
      target.replaceWith(template.content);
      initialize(nodes);
      return;
    }
    case "beforebegin":
    case "afterbegin":
    case "beforeend":
    case "afterend": {
      const before = new Set(Array.from(target.parentElement?.childNodes ?? []));
      target.insertAdjacentHTML(mode, html);
      const parent = mode === "afterbegin" || mode === "beforeend" ? target : target.parentElement;
      if (parent) {
        for (const node of Array.from(parent.childNodes)) {
          if (node.nodeType === 1 && !before.has(node)) walk(node, scope);
        }
      }
      return;
    }
    case "append":
      target.insertAdjacentHTML("beforeend", html);
      initialize(target.childNodes);
      return;
    case "prepend":
      target.insertAdjacentHTML("afterbegin", html);
      initialize(target.childNodes);
      return;
    default: {
      for (const child of Array.from(target.children)) destroy(child);
      target.innerHTML = html;
      initialize(target.childNodes);
    }
  }
}
function renderJSON(value, depth = 0) {
  if (value == null) return "";
  if (typeof value !== "object") return escapeHtml(String(value));
  if (Array.isArray(value)) {
    if (!value.length) return '<p class="v-json-empty">No results.</p>';
    const allObjects = value.every((item) => item && typeof item === "object" && !Array.isArray(item));
    if (allObjects && depth === 0) {
      const columns = Array.from(
        value.reduce((set2, item) => {
          for (const key of Object.keys(item)) set2.add(key);
          return set2;
        }, /* @__PURE__ */ new Set())
      );
      const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
      const body = value.map(
        (item) => `<tr>${columns.map((c) => `<td>${renderJSON(item[c], depth + 1)}</td>`).join("")}</tr>`
      ).join("");
      return `<table class="v-json-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    return `<ul class="v-json-list">${value.map((item) => `<li>${renderJSON(item, depth + 1)}</li>`).join("")}</ul>`;
  }
  const entries = Object.entries(value);
  if (!entries.length) return "";
  return `<dl class="v-json-object">${entries.map(
    ([key, val]) => `<dt>${escapeHtml(key)}</dt><dd>${renderJSON(val, depth + 1)}</dd>`
  ).join("")}</dl>`;
}
function renderWithTemplate(selector, data2, scope, target) {
  const template = document.querySelector(selector);
  if (!template) {
    handleError(new Error(`Template not found: ${selector}`), "v-template");
    return;
  }
  for (const child of Array.from(target.children)) destroy(child);
  target.innerHTML = "";
  const items = Array.isArray(data2) ? data2 : [data2];
  for (const [index, item] of items.entries()) {
    const fragment = template.content.cloneNode(true);
    const nodes = Array.from(fragment.childNodes);
    target.appendChild(fragment);
    const itemScope = scope.reactiveChild({
      item,
      index,
      ...item && typeof item === "object" ? item : {}
    });
    for (const node of nodes) if (node.nodeType === 1) walk(node, itemScope);
  }
}
var inFlight = /* @__PURE__ */ new WeakMap();
async function runRequest(options) {
  const { el, scope, method } = options;
  const settings3 = readSettings(el, scope);
  const dialogHandlesTheQuestion = directives.has(`confirm`);
  if (settings3.confirmMessage && !dialogHandlesTheQuestion) {
    const confirmed = await askConfirmation(settings3.confirmMessage);
    if (!confirmed) return;
  }
  inFlight.get(el)?.abort();
  const controller = new AbortController();
  inFlight.set(el, controller);
  const target = settings3.target ?? el;
  const submitButton = el instanceof HTMLFormElement ? el.querySelector('[type="submit"], button:not([type])') : null;
  const startLoading = () => {
    el.classList.add(settings3.loadingClass);
    el.setAttribute("aria-busy", "true");
    if (settings3.loadingTarget) settings3.loadingTarget.style.removeProperty("display");
    if (settings3.disableWhileLoading) {
      const button = submitButton ?? el;
      if ("disabled" in button) button.disabled = true;
    }
  };
  const stopLoading = () => {
    el.classList.remove(settings3.loadingClass);
    el.removeAttribute("aria-busy");
    if (settings3.loadingTarget) settings3.loadingTarget.style.display = "none";
    if (settings3.disableWhileLoading) {
      const button = submitButton ?? el;
      if ("disabled" in button) button.disabled = false;
    }
  };
  startLoading();
  dispatch(el, "voodoo:before-request", { method, url: options.url });
  try {
    const response = await http.request({
      url: options.url,
      method,
      body: options.body,
      params: options.params,
      headers: settings3.headers,
      timeout: settings3.timeout,
      retry: settings3.retry,
      cache: settings3.cacheMs || void 0,
      signal: controller.signal,
      offlineQueue: settings3.offlineQueue
    });
    const data2 = pick(response.data, settings3.jsonPath);
    if (settings3.storeAs) {
      scope.set(settings3.storeAs, data2);
    } else if (settings3.templateSelector) {
      renderWithTemplate(settings3.templateSelector, data2, scope, target);
    } else if (typeof data2 === "string") {
      swapContent(target, data2, settings3.swap, scope);
    } else if (data2 !== void 0 && data2 !== null) {
      injectJSONStyles();
      swapContent(target, renderJSON(data2), settings3.swap, scope);
    }
    if (settings3.toastSuccess) toast.success(settings3.toastSuccess);
    if (settings3.onSuccess) {
      callHandler(settings3.onSuccess, scope, el, { data: data2, response });
    }
    dispatch(el, "voodoo:success", { data: data2, response });
    if (settings3.scrollTo) {
      document.querySelector(settings3.scrollTo)?.scrollIntoView({ behavior: "smooth" });
    }
    if (settings3.redirect) {
      location.assign(settings3.redirect);
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
    const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err?.message ?? "Unknown error";
    if (settings3.toastError) toast.error(settings3.toastError);
    else if (!settings3.onError) toast.error(message);
    if (settings3.onError) callHandler(settings3.onError, scope, el, { error: err, message });
    dispatch(el, "voodoo:error", { error: err, message });
    handleError(err, `request ${method} ${options.url}`);
  } finally {
    stopLoading();
    inFlight.delete(el);
    if (settings3.onComplete) callHandler(settings3.onComplete, scope, el, {});
    dispatch(el, "voodoo:complete", {});
  }
}
function dispatch(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
function callHandler(expression, scope, el, extra) {
  const local = scope.child({ $el: el, ...extra });
  const value = evaluateIn(expression, local, "HTTP callback");
  if (typeof value === "function") value.call(scope.data, extra.data ?? extra.error);
}
async function askConfirmation(message) {
  const global = globalThis.V;
  if (global && typeof global.confirm === "function" && global.confirm !== globalThis.confirm) {
    return !!await global.confirm(message);
  }
  return globalThis.confirm(message);
}
var jsonStylesInjected = false;
function injectJSONStyles() {
  if (jsonStylesInjected) return;
  jsonStylesInjected = true;
  void Promise.resolve().then(() => (init_style(), style_exports)).then(({ injectStyle: injectStyle2 }) => {
    injectStyle2(
      "json-render",
      `
.v-json-table{width:100%;border-collapse:collapse;font:14px/1.5 var(--v-font-sans,system-ui,sans-serif)}
.v-json-table th,.v-json-table td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--v-border,#E6E0F0);vertical-align:top}
.v-json-table th{font-weight:650;color:var(--v-text-muted,#6B6580);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.v-json-list{margin:0;padding-left:18px}
.v-json-object{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
.v-json-object dt{font-weight:600;color:var(--v-text-muted,#6B6580)}
.v-json-object dd{margin:0}
.v-json-empty{color:var(--v-text-muted,#6B6580);font-style:italic}
`
    );
  });
}
function defaultTrigger(el) {
  const tag = el.tagName;
  if (tag === "FORM") return "submit";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
    const type = el.type;
    return type === "button" || type === "submit" ? "click" : "change";
  }
  return "click";
}
function installTrigger({ el, cleanup, run }) {
  const declared = attr(el, "trigger") || defaultTrigger(el);
  const [name, ...modifiers] = declared.split(/[.\s]+/);
  const pollEvery = parseDuration(attr(el, "poll") ?? void 0, 0);
  if (pollEvery > 0) {
    run();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, pollEvery);
    cleanup(() => clearInterval(timer));
    return;
  }
  if (name === "load" || name === "ready") {
    run();
    return;
  }
  if (name === "visible" || name === "revealed") {
    if (typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const observer3 = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run();
          if (!modifiers.includes("repeat")) observer3.unobserve(el);
        }
      },
      { rootMargin: "80px" }
    );
    observer3.observe(el);
    cleanup(() => observer3.disconnect());
    return;
  }
  const once2 = modifiers.includes("once");
  const delay = parseDuration(attr(el, "debounce") ?? void 0, 0);
  let handler = (event) => {
    if (el.tagName === "FORM" || el.href) event.preventDefault();
    run(event);
  };
  if (delay > 0) handler = debounce(handler, delay);
  el.addEventListener(name, handler, { once: once2 });
  cleanup(() => el.removeEventListener(name, handler));
}
var VERBS = [
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["patch", "PATCH"],
  ["delete", "DELETE"]
];
for (const [name, method] of VERBS) {
  defineDirective(name, ({ el, scope, expression, cleanup }) => {
    const run = (event) => {
      const url2 = resolveURL(expression, scope);
      if (!url2) return;
      const bodyExpression = attr(el, "body") || attr(el, "data-body");
      const body = bodyExpression ? evaluateIn(bodyExpression, scope.child({ $event: event }), "v-body") : void 0;
      const paramsExpression = attr(el, "params");
      const params = paramsExpression ? evaluateIn(paramsExpression, scope, "v-params") : void 0;
      void runRequest({ el, scope, method, url: url2, body, params, event });
    };
    installTrigger({ el, cleanup, run });
  });
}
function resolveURL(expression, scope) {
  const trimmed = expression.trim();
  if (!trimmed) return "";
  const looksLiteral = /^[./#?]/.test(trimmed) || /^https?:\/\//i.test(trimmed) || /^[\w-]+\/[\w\-/.]*$/.test(trimmed);
  if (looksLiteral && !/[+`'"]|\$\{/.test(trimmed)) return trimmed;
  const value = evaluateIn(trimmed, scope, "URL");
  return typeof value === "string" ? value : trimmed;
}
defineDirective("load", ({ el, scope, expression }) => {
  const url2 = resolveURL(expression, scope);
  if (url2) void runRequest({ el, scope, method: "GET", url: url2 });
});
defineDirective("load-visible", ({ el, scope, cleanup, expression }) => {
  const url2 = resolveURL(expression, scope);
  if (!url2) return;
  if (typeof IntersectionObserver === "undefined") {
    void runRequest({ el, scope, method: "GET", url: url2 });
    return;
  }
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer3.unobserve(el);
        void runRequest({ el, scope, method: "GET", url: url2 });
      }
    },
    { rootMargin: "120px" }
  );
  observer3.observe(el);
  cleanup(() => observer3.disconnect());
});
defineDirective("search", ({ el, scope, expression, cleanup }) => {
  const input = el;
  const url2 = resolveURL(expression, scope);
  const paramName = attr(el, "param") || input.getAttribute("name") || "q";
  const wait2 = parseDuration(attr(el, "debounce") ?? void 0, 300);
  const minLength = Number(attr(el, "min-length") ?? 0);
  const run = debounce(() => {
    const value = input.value.trim();
    if (value.length < minLength) return;
    void runRequest({
      el,
      scope,
      method: "GET",
      url: url2,
      params: { [paramName]: value }
    });
  }, wait2);
  const handler = () => run();
  input.addEventListener("input", handler);
  cleanup(() => {
    input.removeEventListener("input", handler);
    run.cancel();
  });
});
defineDirective(
  "resource",
  ({ el, scope, expression, cleanup }) => {
    const separator = expression.indexOf(":");
    let name = attr(el, "as") || "resource";
    let urlExpression = expression.trim();
    if (separator > -1) {
      const head = expression.slice(0, separator).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(head)) {
        name = head;
        urlExpression = expression.slice(separator + 1).trim();
      }
    }
    const resource = createResource(() => resolveURL(urlExpression, scope), {
      method: (attr(el, "method") || "GET").toUpperCase(),
      params: () => attr(el, "params") ? evaluateIn(attr(el, "params"), scope, "v-params") : void 0,
      cache: parseDuration(attr(el, "cache") ?? void 0, 0) || void 0,
      retry: Number(attr(el, "retry") ?? 0),
      timeout: parseDuration(attr(el, "timeout") ?? void 0, http.defaults.timeout),
      jsonPath: attr(el, "json-path"),
      poll: parseDuration(attr(el, "poll") ?? void 0, 0),
      manual: hasAttr2(el, "manual"),
      onSuccess: (data2) => dispatch(el, "voodoo:success", { data: data2 }),
      onError: (err, message) => dispatch(el, "voodoo:error", { error: err, message })
    });
    scope.set(name, resource);
    cleanup(() => resource.stop());
  },
  { priority: PRIORITY.DATA }
);
for (const name of [
  "target",
  "swap",
  "trigger",
  "poll",
  "param",
  "params",
  "body",
  "data-body",
  "headers",
  "cache",
  "retry",
  "timeout",
  "as",
  "json-path",
  "template",
  "offline-queue",
  "min-length",
  "scroll-to",
  "manual",
  "debounce",
  "throttle",
  "indicator"
]) {
  defineDirective(name, () => void 0, { priority: PRIORITY.TRANSITION });
}

// src/core.ts
setComponentMounter(mountComponent);
setScopeMarker(markNodeScope);
setDirectiveRegistrar(directive);
installMagics();
var eventBus = /* @__PURE__ */ new Map();
function on(name, handler) {
  let set2 = eventBus.get(name);
  if (!set2) eventBus.set(name, set2 = /* @__PURE__ */ new Set());
  set2.add(handler);
  return () => set2.delete(handler);
}
function onceEvent(name, handler) {
  const off2 = on(name, (payload) => {
    off2();
    handler(payload);
  });
  return off2;
}
function emit(name, payload) {
  const set2 = eventBus.get(name);
  if (!set2) return;
  for (const handler of [...set2]) {
    try {
      handler(payload);
    } catch (err) {
      handleError(err, `event "${name}"`);
    }
  }
}
function off(name, handler) {
  if (!handler) {
    eventBus.delete(name);
    return;
  }
  eventBus.get(name)?.delete(handler);
}
function directive(name, definition) {
  const hooks = typeof definition === "function" ? { mounted: definition, updated: definition } : definition;
  defineDirective(
    name,
    (ctx) => {
      let oldValue;
      let mounted = false;
      const makeBinding = (value) => ({
        el: ctx.el,
        value,
        oldValue,
        arg: ctx.arg,
        modifiers: ctx.modifiers,
        expression: ctx.expression,
        scope: ctx.scope,
        instance: ctx.scope.owner?.component ?? null
      });
      const initial = hooks.raw ? ctx.expression : ctx.evaluate();
      hooks.created?.(ctx.el, makeBinding(initial));
      hooks.beforeMount?.(ctx.el, makeBinding(initial));
      ctx.effect(() => {
        const value = hooks.raw ? ctx.expression : ctx.evaluate();
        if (!mounted) {
          mounted = true;
          oldValue = value;
          hooks.mounted?.(ctx.el, makeBinding(value));
          return;
        }
        if (value === oldValue) return;
        const binding = makeBinding(value);
        hooks.updated?.(ctx.el, binding);
        oldValue = value;
      });
      ctx.cleanup(() => {
        const binding = makeBinding(oldValue);
        hooks.beforeUnmount?.(ctx.el, binding);
        hooks.unmounted?.(ctx.el, binding);
      });
    },
    { priority: hooks.priority ?? PRIORITY.DEFAULT, terminal: hooks.terminal ?? false }
  );
}
function data(values) {
  Object.defineProperties(rootScope.data, Object.getOwnPropertyDescriptors(values));
  return rootScope.data;
}
var version2 = "0.9.0";
var core = {
  // Utilities first: Voodoo's own names can override.
  ...utils_exports,
  version: version2,
  config,
  // Reactivity
  reactive,
  ref,
  shallowRef,
  computed,
  effect,
  watch,
  watchEffect,
  nextTick,
  toRaw,
  markRaw,
  unref,
  stop,
  effectScope,
  EffectScope,
  flushSync,
  // State
  data,
  store,
  stores: allStores,
  removeStore,
  storeNames,
  scope: rootScope,
  // Components and directives
  component: defineComponent,
  components,
  directive,
  directives,
  magic,
  magics,
  // Application mode
  createApp,
  // DOM lifecycle
  start,
  whenReady,
  whenElement,
  walk,
  refresh,
  destroy,
  stopObserving,
  getScope,
  findScope,
  addCleanup,
  parseAttribute,
  // Expressions
  parse,
  tokenize,
  evaluate,
  evaluateIn,
  stringify,
  clearParseCache,
  globals: allowedGlobals,
  // Services
  http,
  request,
  HttpError,
  /** Reactive resource via JavaScript, equivalent to `v-resource`. */
  resource: createResource,
  toast,
  storage,
  session,
  cookie,
  cache: cache2,
  url,
  theme,
  clipboard,
  screen,
  network,
  // Animation
  enter,
  leave,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  viewTransition,
  // Styling
  injectStyle,
  ensureTokens,
  // Global events
  on,
  once: onceEvent,
  off,
  emit,
  // Plugins
  use(plugin, options) {
    usePlugin(core, plugin, options);
  },
  /** Defines error handling for the entire application. */
  onError(handler) {
    setErrorHandler(handler);
  },
  /** Mounted component instances for inspection. */
  instances,
  Scope,
  PRIORITY,
  VoodooSyntaxError,
  VoodooRuntimeError
};
setAppHost(core);

// src/dom/query.ts
init_reactivity();
var UNITLESS = /* @__PURE__ */ new Set([
  "animation-iteration-count",
  "aspect-ratio",
  "border-image-slice",
  "column-count",
  "flex",
  "flex-grow",
  "flex-shrink",
  "font-weight",
  "grid-area",
  "grid-column",
  "grid-row",
  "line-height",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tab-size",
  "widows",
  "z-index",
  "zoom"
]);
function kebab(property) {
  if (property.startsWith("--")) return property;
  return property.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}
function distinct(list) {
  if (list.length < 2) return list;
  return Array.from(new Set(list));
}
function names(value) {
  return String(value ?? "").split(/\s+/).filter(Boolean);
}
function parseHtml(html) {
  if (typeof document === "undefined") return [];
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const out = [];
  for (const child of Array.from(template.content.children)) out.push(child);
  return out;
}
function looksLikeHtml(text) {
  return text.length > 2 && text.charCodeAt(0) === 60 && text.endsWith(">");
}
function contextRoots(context) {
  if (context == null) return typeof document === "undefined" ? [] : [document];
  if (context instanceof VoodooCollection) return context.toArray();
  if (typeof context === "string") return resolve(context);
  if (typeof context === "function") return typeof document === "undefined" ? [] : [document];
  const list = resolve(context);
  if (list.length) return list;
  return typeof document === "undefined" ? [] : [document];
}
function resolve(input, context) {
  if (input == null) return [];
  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return [];
    if (looksLikeHtml(text)) return parseHtml(text);
    const out = [];
    for (const root of contextRoots(context)) {
      try {
        for (const found of Array.from(root.querySelectorAll(text))) out.push(found);
      } catch {
      }
    }
    return distinct(out);
  }
  if (input instanceof VoodooCollection) return input.toArray();
  if (typeof input === "function") return [];
  const node = input;
  if (typeof node.nodeType === "number") {
    if (node.nodeType === 1) return [node];
    if (node.nodeType === 9) {
      const doc = node;
      return doc.documentElement ? [doc.documentElement] : [];
    }
    if (node.nodeType === 11) {
      return Array.from(node.children);
    }
    return [];
  }
  const arrayLike = input;
  if (typeof arrayLike.length === "number") {
    const out = [];
    for (let i = 0; i < arrayLike.length; i++) {
      const item = arrayLike[i];
      if (item && item.nodeType === 1) out.push(item);
    }
    return distinct(out);
  }
  return [];
}
function contentNodes(content) {
  if (content == null) return [];
  if (typeof content === "string") {
    const text = content;
    if (looksLikeHtml(text.trim())) return parseHtml(text);
    return [document.createTextNode(text)];
  }
  if (content instanceof VoodooCollection) return content.toArray();
  if (typeof content === "function") return [];
  const node = content;
  if (typeof node.nodeType === "number") return [node];
  const arrayLike = content;
  if (typeof arrayLike.length === "number") {
    const out = [];
    for (let i = 0; i < arrayLike.length; i++) if (arrayLike[i]) out.push(arrayLike[i]);
    return out;
  }
  return [];
}
function setStyle(el, property, value) {
  const name = kebab(property);
  if (value === null || value === "") {
    el.style.removeProperty(name);
    return;
  }
  const text = typeof value === "number" && !UNITLESS.has(name) && !name.startsWith("--") ? `${value}px` : String(value);
  el.style.setProperty(name, text);
}
function applyStyles(el, values) {
  for (const [property, value] of Object.entries(values)) setStyle(el, property, value);
}
function parseDataValue(raw) {
  if (raw === void 0) return void 0;
  if (raw === "") return "";
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const first = raw.charCodeAt(0);
  if (first === 123 || first === 91 || first === 34) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}
function datasetKey(key) {
  return key.replace(/-([a-z0-9])/g, (_all, ch) => ch.toUpperCase());
}
var savedDisplay = /* @__PURE__ */ new WeakMap();
function elementHidden(el) {
  if (el.hasAttribute("hidden")) return true;
  if (el.style.display === "none") return true;
  return !el.isConnected ? false : getComputedStyle(el).display === "none";
}
function showElement(el) {
  el.removeAttribute("hidden");
  const previous = savedDisplay.get(el);
  if (previous !== void 0 && previous !== "none") el.style.display = previous;
  else el.style.removeProperty("display");
  if (el.isConnected && getComputedStyle(el).display === "none") el.style.display = "block";
}
function hideElement(el) {
  const current2 = el.style.display;
  if (current2 && current2 !== "none") savedDisplay.set(el, current2);
  el.style.display = "none";
}
var FORM_CONTROLS = "input,select,textarea";
function formControls(el) {
  if (el.matches(FORM_CONTROLS)) return [el];
  return Array.from(el.querySelectorAll(FORM_CONTROLS));
}
function isSerializable(control) {
  const field = control;
  if (!field.name || field.disabled) return false;
  const type = (field.getAttribute("type") || "").toLowerCase();
  if (type === "file" || type === "submit" || type === "reset" || type === "button") return false;
  if ((type === "checkbox" || type === "radio") && !field.checked) return false;
  return true;
}
var eventStore = /* @__PURE__ */ new WeakMap();
function bindingsOf(el) {
  let list = eventStore.get(el);
  if (!list) eventStore.set(el, list = []);
  return list;
}
var VoodooCollection = class _VoodooCollection {
  constructor(elements = []) {
    /** Number of elements in the collection. */
    __publicField(this, "length");
    /** Elements of the collection, in the order they were found. */
    __publicField(this, "elements");
    this.elements = elements;
    this.length = elements.length;
    const indexed = this;
    for (let i = 0; i < elements.length; i++) indexed[i] = elements[i];
  }
  /** Enables `for (const el of query('.item'))`. */
  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }
  // -------------------------------------------------------------------------
  // Traversal
  // -------------------------------------------------------------------------
  /** Descendants that match the selector. */
  find(selector) {
    const out = [];
    for (const el of this.elements) {
      try {
        for (const found of Array.from(el.querySelectorAll(selector))) out.push(found);
      } catch {
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Nearest ancestor, including the element itself. */
  closest(selector) {
    const out = [];
    for (const el of this.elements) {
      const found = el.closest(selector);
      if (found) out.push(found);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Parent element of each item, optionally filtered. */
  parent(selector) {
    const out = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && (!selector || parent.matches(selector))) out.push(parent);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** All ancestors, from nearest to farthest. */
  parents(selector) {
    const out = [];
    for (const el of this.elements) {
      let current2 = el.parentElement;
      while (current2) {
        if (!selector || current2.matches(selector)) out.push(current2);
        current2 = current2.parentElement;
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Direct children, optionally filtered. */
  children(selector) {
    const out = [];
    for (const el of this.elements) {
      for (const child of Array.from(el.children)) {
        if (!selector || child.matches(selector)) out.push(child);
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Siblings, excluding the elements themselves. */
  siblings(selector) {
    const out = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (!parent) continue;
      for (const child of Array.from(parent.children)) {
        if (child === el) continue;
        if (!selector || child.matches(selector)) out.push(child);
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Next sibling of each element. */
  next(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.nextElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Previous sibling of each element. */
  prev(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.previousElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Only the first element. */
  first() {
    return this.eq(0);
  }
  /** Only the last element. */
  last() {
    return this.eq(-1);
  }
  /** Element at the specified position. Negative indices count from the end. */
  eq(index) {
    const position = index < 0 ? this.elements.length + index : index;
    const el = this.elements[position];
    return new _VoodooCollection(el ? [el] : []);
  }
  /** Keeps only elements that pass the filter. */
  filter(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Removes from the collection elements that pass the filter. */
  not(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? !test(el, index) : !el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Keeps elements that contain the specified descendant. */
  has(target) {
    const out = this.elements.filter(
      (el) => typeof target === "string" ? el.querySelector(target) !== null : el.contains(target)
    );
    return new _VoodooCollection(out);
  }
  /** Checks if at least one element matches the filter. */
  is(test) {
    return this.elements.some(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
  }
  /** Projects each element to a value and returns a regular array. */
  map(fn) {
    return this.elements.map((el, index) => fn(el, index));
  }
  /** Iterates over the collection. Inside the function, `this` is the current element. */
  each(fn) {
    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i];
      if (fn.call(el, el, i) === false) break;
    }
    return this;
  }
  get(...rest) {
    if (!rest.length) return this.toArray();
    const index = Number(rest[0]);
    return this.elements[index < 0 ? this.elements.length + index : index];
  }
  /** Copy of elements as a regular array. */
  toArray() {
    return this.elements.slice();
  }
  /** Joins other elements to the collection without duplication. */
  add(input, context) {
    return new _VoodooCollection(distinct([...this.elements, ...resolve(input, context)]));
  }
  /** Slice of the collection with the same semantics as `Array.prototype.slice`. */
  slice(start2, end) {
    return new _VoodooCollection(this.elements.slice(start2, end));
  }
  text(...rest) {
    if (!rest.length) return this.elements[0]?.textContent ?? "";
    const value = rest[0];
    const text = value == null ? "" : String(value);
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = text;
    }
    return this;
  }
  html(...rest) {
    if (!rest.length) return this.elements[0]?.innerHTML ?? "";
    const value = rest[0];
    const text = value == null ? "" : String(value);
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.innerHTML = text;
    }
    return this;
  }
  val(...rest) {
    if (!rest.length) {
      const field = this.elements[0];
      if (!field) return "";
      const select = field;
      if (field.tagName === "SELECT" && select.multiple) {
        return Array.from(select.selectedOptions).map((option) => option.value);
      }
      if (field.type === "checkbox") return field.checked ? field.value || "on" : "";
      return field.value ?? "";
    }
    const value = rest[0];
    for (const el of this.elements) {
      const field = el;
      const select = el;
      if (field.tagName === "SELECT" && select.multiple) {
        const wanted = (Array.isArray(value) ? value : [value]).map(String);
        for (const option of Array.from(select.options)) option.selected = wanted.includes(option.value);
        continue;
      }
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = Array.isArray(value) ? value.map(String).includes(field.value) : value === true || String(value) === field.value;
        continue;
      }
      field.value = value == null ? "" : String(value);
    }
    return this;
  }
  attr(...rest) {
    const first = rest[0];
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) {
        for (const [name2, value2] of Object.entries(first)) {
          if (value2 === null || value2 === false) el.removeAttribute(name2);
          else el.setAttribute(name2, value2 === true ? "" : String(value2));
        }
      }
      return this;
    }
    const name = String(first);
    if (rest.length < 2) return this.elements[0]?.getAttribute(name) ?? void 0;
    const value = rest[1];
    for (const el of this.elements) {
      if (value === null || value === false) el.removeAttribute(name);
      else el.setAttribute(name, value === true ? "" : String(value));
    }
    return this;
  }
  /** Removes one or more space-separated attributes. */
  removeAttr(name) {
    const list = names(name);
    for (const el of this.elements) for (const attribute of list) el.removeAttribute(attribute);
    return this;
  }
  prop(...rest) {
    const name = String(rest[0]);
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? el[name] : void 0;
    }
    for (const el of this.elements) el[name] = rest[1];
    return this;
  }
  data(...rest) {
    const first = rest[0];
    if (!rest.length) {
      const el = this.elements[0];
      if (!el) return {};
      const out = {};
      for (const [key2, raw] of Object.entries(el.dataset)) out[key2] = parseDataValue(raw);
      return out;
    }
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) {
        for (const [key2, value2] of Object.entries(first)) {
          el.dataset[datasetKey(key2)] = typeof value2 === "string" ? value2 : JSON.stringify(value2 ?? null);
        }
      }
      return this;
    }
    const key = datasetKey(String(first));
    if (rest.length < 2) {
      const el = this.elements[0];
      return el ? parseDataValue(el.dataset[key]) : void 0;
    }
    const value = rest[1];
    for (const el of this.elements) {
      el.dataset[key] = typeof value === "string" ? value : JSON.stringify(value ?? null);
    }
    return this;
  }
  css(...rest) {
    const first = rest[0];
    if (first !== null && typeof first === "object") {
      for (const el of this.elements) applyStyles(el, first);
      return this;
    }
    const property = String(first);
    if (rest.length < 2) {
      const el = this.elements[0];
      if (!el) return "";
      const name = kebab(property);
      const computed2 = el.isConnected ? getComputedStyle(el).getPropertyValue(name) : "";
      return (computed2 || el.style.getPropertyValue(name)).trim();
    }
    for (const el of this.elements) setStyle(el, property, rest[1]);
    return this;
  }
  width(...rest) {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().width : 0;
    }
    for (const el of this.elements) setStyle(el, "width", rest[0]);
    return this;
  }
  height(...rest) {
    if (!rest.length) {
      const el = this.elements[0];
      return el ? el.getBoundingClientRect().height : 0;
    }
    for (const el of this.elements) setStyle(el, "height", rest[0]);
    return this;
  }
  /** Position of the first element relative to the document. */
  offset() {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
  }
  /** Position of the first element relative to the positioned ancestor. */
  position() {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    return { top: el.offsetTop, left: el.offsetLeft };
  }
  scrollTop(...rest) {
    if (!rest.length) return this.elements[0]?.scrollTop ?? 0;
    const value = Number(rest[0]) || 0;
    for (const el of this.elements) el.scrollTop = value;
    return this;
  }
  // -------------------------------------------------------------------------
  // Classes
  // -------------------------------------------------------------------------
  /** Adds one or more space-separated classes. */
  addClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.add(...list);
    return this;
  }
  /** Removes one or more space-separated classes. */
  removeClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.remove(...list);
    return this;
  }
  /** Toggles classes. The second argument forces on or off. */
  toggleClass(value, force) {
    const list = names(value);
    for (const el of this.elements) {
      for (const cls of list) {
        if (force === void 0) el.classList.toggle(cls);
        else el.classList.toggle(cls, force);
      }
    }
    return this;
  }
  /** True when some element has all the specified classes. */
  hasClass(value) {
    const list = names(value);
    if (!list.length) return false;
    return this.elements.some((el) => list.every((cls) => el.classList.contains(cls)));
  }
  // -------------------------------------------------------------------------
  // DOM manipulation
  // -------------------------------------------------------------------------
  /**
   * Base of `append`, `prepend`, `before`, and `after`. When the collection has more
   * than one element, each destination receives a copy and the last gets the
   * original, which is the expected behavior for those coming from jQuery.
   */
  insert(content, place) {
    const total = this.elements.length;
    for (let i = 0; i < total; i++) {
      const el = this.elements[i];
      for (const node of contentNodes(content)) {
        place(el, i === total - 1 ? node : node.cloneNode(true));
      }
    }
    return this;
  }
  /** Inserts content at the end of each element. */
  append(content) {
    return this.insert(content, (el, node) => el.appendChild(node));
  }
  /** Inserts content at the beginning of each element. */
  prepend(content) {
    return this.insert(content, (el, node) => el.insertBefore(node, el.firstChild));
  }
  /** Inserts content before each element. */
  before(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el));
  }
  /** Inserts content after each element. */
  after(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el.nextSibling));
  }
  /** Moves the collection's elements into the target. */
  appendTo(target) {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      for (const el of this.elements) {
        targets[i].appendChild(i === targets.length - 1 ? el : el.cloneNode(true));
      }
    }
    return this;
  }
  /** Moves the collection's elements to the beginning of the target. */
  prependTo(target) {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      const parent = targets[i];
      const nodes = this.elements.map(
        (el) => i === targets.length - 1 ? el : el.cloneNode(true)
      );
      for (let j = nodes.length - 1; j >= 0; j--) parent.insertBefore(nodes[j], parent.firstChild);
    }
    return this;
  }
  /** Replaces each element with the provided content, unmounting the old one. */
  replaceWith(content) {
    for (const el of this.elements) {
      const parent = el.parentNode;
      if (!parent) continue;
      for (const node of contentNodes(content)) parent.insertBefore(node, el);
      destroy(el);
      el.remove();
    }
    return this;
  }
  /** Wraps each element with the provided HTML or element. */
  wrap(wrapper) {
    for (const el of this.elements) {
      const model = resolve(wrapper)[0];
      if (!model) continue;
      const clone2 = model.cloneNode(true);
      el.parentNode?.insertBefore(clone2, el);
      let deepest = clone2;
      while (deepest.firstElementChild) deepest = deepest.firstElementChild;
      deepest.appendChild(el);
    }
    return this;
  }
  /** Removes the parent of each element, keeping children in place. */
  unwrap() {
    const parents = /* @__PURE__ */ new Set();
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && parent !== document.body) parents.add(parent);
    }
    for (const parent of parents) {
      const grand = parent.parentNode;
      if (!grand) continue;
      while (parent.firstChild) grand.insertBefore(parent.firstChild, parent);
      destroy(parent);
      parent.remove();
    }
    return this;
  }
  /** Removes elements from the document and unmounts reactive effects. */
  remove() {
    for (const el of this.elements) {
      destroy(el);
      el.remove();
    }
    return this;
  }
  /** Empties elements, unmounting removed content. */
  empty() {
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.replaceChildren();
    }
    return this;
  }
  /** Clones elements. The clone starts without directives initialized. */
  clone(deep = true) {
    return new _VoodooCollection(this.elements.map((el) => el.cloneNode(deep)));
  }
  on(types, ...rest) {
    const delegated = typeof rest[0] === "string";
    const selector = delegated ? rest[0] : null;
    const handler = delegated ? rest[1] : rest[0];
    const options = (delegated ? rest[2] : rest[1]) ?? {};
    if (typeof handler !== "function") return this;
    for (const el of this.elements) {
      for (const type of names(types)) {
        const wrapped = (event) => {
          if (!selector) {
            handler.call(el, event);
            return;
          }
          const start2 = event.target;
          const matched = start2?.closest(selector);
          if (!matched || !el.contains(matched)) return;
          handler.call(matched, event);
        };
        el.addEventListener(type, wrapped, options);
        bindingsOf(el).push({ type, selector, handler, wrapped, options });
      }
    }
    return this;
  }
  /**
   * Removes listeners registered by `on`. Without arguments removes all, with type
   * removes those for that event, and with selector or function refines further.
   */
  off(types, selectorOrHandler, handler) {
    const wantedSelector = typeof selectorOrHandler === "string" ? selectorOrHandler : null;
    const wantedHandler = typeof selectorOrHandler === "function" ? selectorOrHandler : handler ?? null;
    const wantedTypes = types ? names(types) : null;
    for (const el of this.elements) {
      const list = eventStore.get(el);
      if (!list) continue;
      const keep = [];
      for (const binding of list) {
        const matchType = !wantedTypes || wantedTypes.includes(binding.type);
        const matchSelector = wantedSelector === null || binding.selector === wantedSelector;
        const matchHandler = wantedHandler === null || binding.handler === wantedHandler;
        if (matchType && matchSelector && matchHandler) {
          el.removeEventListener(binding.type, binding.wrapped, binding.options);
        } else {
          keep.push(binding);
        }
      }
      eventStore.set(el, keep);
    }
    return this;
  }
  once(types, ...rest) {
    const delegated = typeof rest[0] === "string";
    const selector = delegated ? rest[0] : null;
    const handler = delegated ? rest[1] : rest[0];
    if (typeof handler !== "function") return this;
    const self = this;
    const wrapper = function(event) {
      if (selector) self.off(types, selector, wrapper);
      else self.off(types, wrapper);
      return handler.call(this, event);
    };
    if (selector) return this.on(types, selector, wrapper);
    return this.on(types, wrapper);
  }
  /**
   * Dispatches an event. Native events with their own method, like `click` and
   * `focus`, use the element's method when there is no `detail`.
   */
  trigger(type, detail) {
    for (const el of this.elements) {
      if (detail === void 0 && typeof el[type] === "function") {
        el[type]();
        continue;
      }
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      event.__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }
  /** Dispatches a custom event that bubbles up the tree, component-style. */
  emit(type, detail) {
    for (const el of this.elements) {
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      event.__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }
  // -------------------------------------------------------------------------
  // Visibility and animation
  // -------------------------------------------------------------------------
  /** Shows elements by restoring their previous display value. */
  show() {
    for (const el of this.elements) showElement(el);
    return this;
  }
  /** Hides elements while saving their current display value. */
  hide() {
    for (const el of this.elements) hideElement(el);
    return this;
  }
  /** Toggles visibility. The argument forces show or hide. */
  toggle(force) {
    for (const el of this.elements) {
      const visible = force === void 0 ? elementHidden(el) : force;
      if (visible) showElement(el);
      else hideElement(el);
    }
    return this;
  }
  /** Appearance with fade. */
  fadeIn(duration = 220) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void fadeIn(el, duration);
    }
    return this;
  }
  /** Disappearance with fade, ending hidden. */
  fadeOut(duration = 220) {
    for (const el of this.elements) void fadeOut(el, duration);
    return this;
  }
  /** Collapses height to zero. */
  slideUp(duration = 240) {
    for (const el of this.elements) void slideUp(el, duration);
    return this;
  }
  /** Expands height to content. */
  slideDown(duration = 240) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void slideDown(el, duration);
    }
    return this;
  }
  /** Toggles between collapse and expand. */
  slideToggle(duration = 240) {
    for (const el of this.elements) {
      if (elementHidden(el)) {
        el.removeAttribute("hidden");
        void slideDown(el, duration);
      } else {
        void slideUp(el, duration);
      }
    }
    return this;
  }
  /** Animation via Web Animations API. */
  animate(keyframes, options = 300) {
    for (const el of this.elements) {
      if (typeof el.animate !== "function") continue;
      el.animate(keyframes, options);
    }
    return this;
  }
  /** Scrolls the page to the first element. */
  scrollIntoView(options = { behavior: "smooth", block: "start" }) {
    this.elements[0]?.scrollIntoView(options);
    return this;
  }
  // -------------------------------------------------------------------------
  // Form
  // -------------------------------------------------------------------------
  /** Serializes the first element's fields as a query string. */
  serialize() {
    const el = this.elements[0];
    if (!el) return "";
    const params = new URLSearchParams();
    for (const control of formControls(el)) {
      if (!isSerializable(control)) continue;
      const field = control;
      const select = control;
      if (field.tagName === "SELECT" && select.multiple) {
        for (const option of Array.from(select.selectedOptions)) params.append(field.name, option.value);
        continue;
      }
      params.append(field.name, field.value);
    }
    return params.toString();
  }
  /**
   * Serializes fields into an object. Repeated names and names ending in
   * `[]` become arrays, checkboxes become booleans, and numeric fields become numbers.
   */
  serializeObject() {
    const el = this.elements[0];
    const out = {};
    if (!el) return out;
    for (const control of formControls(el)) {
      const field = control;
      if (!field.name || field.disabled) continue;
      const type = (field.getAttribute("type") || "").toLowerCase();
      if (type === "submit" || type === "reset" || type === "button") continue;
      const isList = field.name.endsWith("[]");
      const key = isList ? field.name.slice(0, -2) : field.name;
      const select = control;
      let value;
      if (type === "checkbox") {
        if (!field.checked && !isList) {
          out[key] = out[key] ?? false;
          continue;
        }
        if (!field.checked) continue;
        value = field.value === "on" ? true : field.value;
      } else if (type === "radio") {
        if (!field.checked) continue;
        value = field.value;
      } else if (type === "file") {
        value = field.multiple ? Array.from(field.files ?? []) : field.files?.[0] ?? null;
      } else if (field.tagName === "SELECT" && select.multiple) {
        value = Array.from(select.selectedOptions).map((option) => option.value);
      } else if (type === "number" || type === "range") {
        value = field.value === "" ? null : Number(field.value);
      } else {
        value = field.value;
      }
      if (isList) {
        const current2 = out[key];
        if (Array.isArray(current2)) current2.push(value);
        else out[key] = [value];
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        const current2 = out[key];
        if (Array.isArray(current2)) current2.push(value);
        else if (current2 === void 0 || current2 === false) out[key] = value;
        else out[key] = [current2, value];
        continue;
      }
      out[key] = value;
    }
    return out;
  }
  /** Sets focus on the first element. */
  focus(options) {
    this.elements[0]?.focus(options);
    return this;
  }
  /** Removes focus from all elements. */
  blur() {
    for (const el of this.elements) el.blur();
    return this;
  }
  /** Selects the text of the collection's fields. */
  select() {
    for (const el of this.elements) {
      const field = el;
      if (typeof field.select === "function") field.select();
    }
    return this;
  }
  // -------------------------------------------------------------------------
  // Integration with Voodoo runtime
  // -------------------------------------------------------------------------
  /**
   * Initializes directives for the collection's elements, inheriting the parent's scope.
   * With `force`, unmounts first to restart from scratch.
   */
  walk(force = false) {
    for (const el of this.elements) {
      if (force) destroy(el);
      walk(el, findScope(el.parentNode));
    }
    return this;
  }
  /** Unmounts effects, listeners, and components while keeping elements in the DOM. */
  destroy() {
    for (const el of this.elements) destroy(el);
    return this;
  }
};
function query(input, context) {
  if (typeof input === "function") {
    ready(input);
    const root = typeof document !== "undefined" ? document.documentElement : null;
    return new VoodooCollection(root ? [root] : []);
  }
  return new VoodooCollection(resolve(input, context));
}
function ready(fn) {
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve2) => {
    whenBodyReady(() => {
      try {
        fn?.();
      } catch (err) {
        handleError(err, "V.ready");
      }
      resolve2();
    });
  });
}
function fromHtml(html) {
  return new VoodooCollection(parseHtml(html));
}

// src/directives/ui.ts
init_reactivity();
init_registry();
init_style();

// src/directives/shared.ts
init_style();
init_registry();
var optionValues = /* @__PURE__ */ new WeakMap();
function attrOf(el, name) {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function hasAttrOf(el, name) {
  return hasAttr(el, `${config.prefix}${name}`) || hasAttr(el, `data-v-${name}`);
}
function readOption(el, name) {
  const bag = optionValues.get(el);
  if (bag && name in bag) return bag[name];
  return attrOf(el, name);
}
function storeOption(el, name, value) {
  const bag = optionValues.get(el) ?? {};
  bag[name] = value;
  optionValues.set(el, bag);
}
function defineOption(name) {
  defineDirective(
    name,
    ({ el, expression }) => {
      storeOption(el, name, expression);
    },
    { priority: PRIORITY.BIND }
  );
}
function dispatch2(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
function callExpression(expression, scope, el, event, detail) {
  if (!expression.trim()) return void 0;
  const local = scope.child({ $el: el, $event: event ?? null, $detail: detail });
  const value = evaluateIn(expression, local, "directive de UI");
  if (typeof value === "function") {
    return value.call(scope.data, detail ?? event);
  }
  return value;
}
var LIVE_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;
var liveRegion = null;
function announce(message) {
  if (typeof document === "undefined") return;
  injectStyle("ui-live", LIVE_CSS);
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = document.createElement("div");
    liveRegion.className = "v-visually-hidden";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
  }
  const region = liveRegion;
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 40);
}
function ownedByDirective(root, childName, ownerName) {
  return queryDirective(root, childName).filter(
    (el) => closestDirective(el, ownerName) === root
  );
}

// src/directives/dnd.ts
init_style();
init_registry();
var DND_CSS = `
.v-draggable,.v-sortable>*{-webkit-user-select:none;user-select:none}
.v-drag-handle{cursor:grab;touch-action:none}
.v-drag-handle:active{cursor:grabbing}

.v-dragging{opacity:.4;pointer-events:none;outline:2px dashed var(--v-primary,#6D3BF5);
  outline-offset:-2px;border-radius:var(--v-radius-sm,8px)}
.v-drag-ghost{position:fixed;top:0;left:0;margin:0;z-index:calc(var(--v-z-modal,1000) + 20);
  pointer-events:none;opacity:.95;box-sizing:border-box;
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  border-radius:var(--v-radius-sm,8px);transform-origin:top left;
  transition:transform .04s linear}
.v-drag-ghost.v-drag-invalid{opacity:.6;filter:grayscale(.6)}

.v-drop-over{outline:2px dashed var(--v-primary,#6D3BF5);outline-offset:2px;
  background:var(--v-surface-2,#FBF7F2)}
.v-drop-active{outline:1px dashed var(--v-border,#E6E0F0);outline-offset:2px}

.v-sortable{position:relative}
.v-grabbed{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}

@media (prefers-reduced-motion: reduce){
  .v-drag-ghost{transition:none !important}
}
`;
function ensureDnd() {
  ensureTokens();
  injectStyle("dnd", DND_CSS);
}
var sortableRegistry = /* @__PURE__ */ new Map();
var droppableRegistry = /* @__PURE__ */ new Map();
function groupOf(el, own) {
  if (own && own.trim()) return own.trim();
  const holder = el.closest("[data-v-dnd-group]");
  return holder?.getAttribute("data-v-dnd-group") || null;
}
function itemsOf(list) {
  return Array.from(list.children).filter(
    (child) => !child.classList.contains("v-drag-ghost")
  );
}
function itemKey(item, index) {
  return item.getAttribute("data-id") ?? (item.id || String(index));
}
function orderOf(list) {
  return itemsOf(list).map((item, index) => itemKey(item, index));
}
function isHorizontal(list) {
  const style = getComputedStyle(list);
  if (style.display.includes("flex")) return style.flexDirection.startsWith("row");
  if (style.display.includes("grid")) return style.gridAutoFlow.startsWith("column");
  return false;
}
var session2 = null;
var scrollFrame = 0;
function createGhost(item, rect) {
  const ghost = item.cloneNode(true);
  ghost.classList.add("v-drag-ghost");
  ghost.classList.remove("v-dragging", "v-grabbed");
  ghost.removeAttribute("id");
  for (const node of Array.from(ghost.querySelectorAll("[id]"))) node.removeAttribute("id");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.setAttribute("aria-hidden", "true");
  document.body.appendChild(ghost);
  return ghost;
}
function moveGhost(x, y) {
  if (!session2?.ghost) return;
  const left = session2.axis === "y" ? session2.lastX : x;
  const top2 = session2.axis === "x" ? session2.lastY : y;
  session2.ghost.style.transform = `translate3d(${Math.round(left - session2.grabX)}px, ${Math.round(
    top2 - session2.grabY
  )}px, 0)`;
}
function scrollParent(el) {
  let current2 = el;
  while (current2 && current2 !== document.body && current2 !== document.documentElement) {
    const style = getComputedStyle(current2);
    const scrollableY = (style.overflowY === "auto" || style.overflowY === "scroll") && current2.scrollHeight > current2.clientHeight + 2;
    const scrollableX = (style.overflowX === "auto" || style.overflowX === "scroll") && current2.scrollWidth > current2.clientWidth + 2;
    if (scrollableY || scrollableX) return current2;
    current2 = current2.parentElement;
  }
  return null;
}
function autoScroll() {
  if (!session2) return;
  const zone = 56;
  const speed = 16;
  const x = session2.lastX;
  const y = session2.lastY;
  const under = document.elementFromPoint(x, y);
  const container2 = scrollParent(under ?? session2.overList);
  if (container2) {
    const rect = container2.getBoundingClientRect();
    if (y - rect.top < zone) container2.scrollTop -= speed;
    else if (rect.bottom - y < zone) container2.scrollTop += speed;
    if (x - rect.left < zone) container2.scrollLeft -= speed;
    else if (rect.right - x < zone) container2.scrollLeft += speed;
    return;
  }
  if (y < zone) window.scrollBy(0, -speed);
  else if (window.innerHeight - y < zone) window.scrollBy(0, speed);
  if (x < zone) window.scrollBy(-speed, 0);
  else if (window.innerWidth - x < zone) window.scrollBy(speed, 0);
}
function startScrollLoop() {
  const step2 = () => {
    if (!session2 || session2.keyboard) return;
    autoScroll();
    scrollFrame = requestAnimationFrame(step2);
  };
  scrollFrame = requestAnimationFrame(step2);
}
function stopScrollLoop() {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = 0;
}
function listAccepts(list, current2) {
  const info = sortableRegistry.get(list);
  if (!info) return false;
  if (list === current2.startList) return true;
  if (!info.group || !current2.group) return false;
  return info.group === current2.group;
}
function dropAccepts(info, current2) {
  if (info.accept && !current2.item.matches(info.accept)) return false;
  if (info.group && info.group !== current2.group) return false;
  return true;
}
function highlightTargets(current2, on2) {
  for (const info of droppableRegistry.values()) {
    info.el.classList.toggle("v-drop-active", on2 && dropAccepts(info, current2));
  }
  for (const info of sortableRegistry.values()) {
    info.el.classList.toggle("v-drop-active", on2 && listAccepts(info.el, current2));
  }
}
function placeInList(list, item, x, y) {
  const horizontal = isHorizontal(list);
  let reference = null;
  for (const child of itemsOf(list)) {
    if (child === item) continue;
    const rect = child.getBoundingClientRect();
    const middle = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const pointer = horizontal ? x : y;
    if (pointer < middle) {
      reference = child;
      break;
    }
  }
  if (reference) {
    if (item.nextElementSibling !== reference || item.parentElement !== list) {
      list.insertBefore(item, reference);
    }
    return;
  }
  if (list.lastElementChild !== item) list.appendChild(item);
}
function beginDrag(item, options) {
  ensureDnd();
  const rect = item.getBoundingClientRect();
  const list = options.mode === "sort" ? item.parentElement : null;
  session2 = {
    item,
    mode: options.mode,
    data: options.data,
    group: options.group,
    axis: options.axis,
    ghost: null,
    pointerId: options.pointerId,
    grabX: options.keyboard ? rect.width / 2 : options.x - rect.left,
    grabY: options.keyboard ? rect.height / 2 : options.y - rect.top,
    startParent: item.parentElement,
    startNext: item.nextSibling,
    startList: list,
    startIndex: list ? itemsOf(list).indexOf(item) : -1,
    overDrop: null,
    overList: list,
    keyboard: !!options.keyboard,
    lastX: options.x,
    lastY: options.y
  };
  item.classList.add("v-dragging");
  item.setAttribute("aria-grabbed", "true");
  if (!options.keyboard) {
    session2.ghost = createGhost(item, rect);
    moveGhost(options.x, options.y);
    startScrollLoop();
  } else {
    item.classList.add("v-grabbed");
  }
  highlightTargets(session2, true);
  document.addEventListener("keydown", onDragKeyDown, true);
  dispatch2(item, "voodoo:drag-start", { item, data: options.data, group: options.group });
}
function updateDrag(x, y) {
  if (!session2) return;
  session2.lastX = x;
  session2.lastY = y;
  moveGhost(x, y);
  const under = document.elementFromPoint(x, y);
  const list = under?.closest(".v-sortable") ?? null;
  const drop = under?.closest(".v-droppable") ?? null;
  if (session2.mode === "sort" && list && listAccepts(list, session2)) {
    if (session2.overList && session2.overList !== list) {
      session2.overList.classList.remove("v-drop-over");
    }
    session2.overList = list;
    list.classList.add("v-drop-over");
    placeInList(list, session2.item, x, y);
  } else if (session2.overList && !list) {
    session2.overList.classList.remove("v-drop-over");
  }
  const info = drop ? droppableRegistry.get(drop) : void 0;
  const valid = info ? dropAccepts(info, session2) : false;
  if (session2.overDrop && session2.overDrop !== drop) {
    session2.overDrop.classList.remove("v-drop-over");
    session2.overDrop = null;
  }
  if (drop && valid) {
    drop.classList.add("v-drop-over");
    session2.overDrop = drop;
  }
  session2.ghost?.classList.toggle("v-drag-invalid", !!drop && !valid);
}
function restorePosition(current2) {
  if (!current2.startParent) return;
  if (current2.startNext && current2.startNext.parentNode === current2.startParent) {
    current2.startParent.insertBefore(current2.item, current2.startNext);
  } else {
    current2.startParent.appendChild(current2.item);
  }
}
function teardown(current2) {
  current2.ghost?.remove();
  current2.item.classList.remove("v-dragging", "v-grabbed");
  current2.item.setAttribute("aria-grabbed", "false");
  current2.overDrop?.classList.remove("v-drop-over");
  current2.overList?.classList.remove("v-drop-over");
  highlightTargets(current2, false);
  stopScrollLoop();
  document.removeEventListener("keydown", onDragKeyDown, true);
  session2 = null;
}
function finishDrag() {
  const current2 = session2;
  if (!current2) return;
  const list = current2.item.parentElement;
  const newIndex = list ? itemsOf(list).indexOf(current2.item) : -1;
  const drop = current2.overDrop;
  const info = drop ? droppableRegistry.get(drop) : void 0;
  if (current2.mode === "sort" && list && sortableRegistry.has(list)) {
    const moved = list !== current2.startList || newIndex !== current2.startIndex;
    if (moved) {
      const detail = {
        item: current2.item,
        oldIndex: current2.startIndex,
        newIndex,
        from: current2.startList,
        to: list,
        order: orderOf(list)
      };
      dispatch2(list, "voodoo:sorted", detail);
      if (current2.startList && current2.startList !== list) {
        dispatch2(current2.startList, "voodoo:sorted", {
          ...detail,
          order: orderOf(current2.startList)
        });
      }
      announce(`Item moved to position ${newIndex + 1} of ${itemsOf(list).length}`);
    }
  }
  if (drop && info) {
    const detail = {
      item: current2.item,
      data: current2.data,
      from: current2.startList ?? current2.startParent,
      to: drop,
      index: newIndex
    };
    const event = new CustomEvent("voodoo:drop", { detail, bubbles: true });
    drop.dispatchEvent(event);
    callExpression(info.expression, info.scope, drop, event, detail);
    announce("Item dropped in drop zone");
  }
  dispatch2(current2.item, "voodoo:drag-end", { item: current2.item, data: current2.data });
  teardown(current2);
}
function cancelDrag() {
  const current2 = session2;
  if (!current2) return;
  restorePosition(current2);
  dispatch2(current2.item, "voodoo:drag-cancel", { item: current2.item });
  announce("Drag canceled");
  teardown(current2);
}
function onDragKeyDown(event) {
  if (!session2 || event.key !== "Escape") return;
  event.preventDefault();
  cancelDrag();
}
function installPointerDrag(root, options, cleanup) {
  let candidate = null;
  let pointerId = -1;
  let originX = 0;
  let originY = 0;
  let dragging = false;
  const onPointerMove = (event) => {
    if (event.pointerId !== pointerId) return;
    if (!dragging) {
      const distance = Math.hypot(event.clientX - originX, event.clientY - originY);
      if (distance < 4 || !candidate) return;
      dragging = true;
      beginDrag(candidate, {
        mode: options.mode,
        data: options.data(),
        group: options.group(),
        axis: options.axis(),
        pointerId,
        x: originX,
        y: originY
      });
    }
    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  };
  const stop2 = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    candidate = null;
    pointerId = -1;
    dragging = false;
  };
  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) return;
    if (dragging) finishDrag();
    stop2();
  };
  const onPointerCancel = () => {
    if (dragging) cancelDrag();
    stop2();
  };
  const onPointerDown = (event) => {
    if (event.button !== 0 || session2) return;
    const target = event.target;
    if (!target) return;
    if (target.closest('input,textarea,select,option,[contenteditable="true"]')) return;
    if (options.handle && !target.closest(options.handle)) return;
    const item = options.itemFrom(target);
    if (!item) return;
    candidate = item;
    pointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    dragging = false;
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
  };
  root.addEventListener("pointerdown", onPointerDown);
  cleanup(() => {
    root.removeEventListener("pointerdown", onPointerDown);
    if (dragging) cancelDrag();
    stop2();
  });
}
function listsInGroup(group) {
  if (!group) return [];
  return Array.from(sortableRegistry.values()).filter((info) => info.group === group).map((info) => info.el).sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
}
function keyboardMove(item, key) {
  if (!session2) return false;
  const list = item.parentElement;
  if (!list) return false;
  const horizontal = isHorizontal(list);
  const forward = key === "ArrowDown" || horizontal && key === "ArrowRight";
  const backward = key === "ArrowUp" || horizontal && key === "ArrowLeft";
  const siblings = itemsOf(list);
  const index = siblings.indexOf(item);
  if (forward || backward) {
    const target = index + (forward ? 1 : -1);
    if (target < 0 || target >= siblings.length) return false;
    if (forward) list.insertBefore(item, siblings[target].nextSibling);
    else list.insertBefore(item, siblings[target]);
    announce(`Position ${target + 1} of ${siblings.length}`);
    item.focus();
    return true;
  }
  if (!horizontal && (key === "ArrowLeft" || key === "ArrowRight")) {
    const lists = listsInGroup(session2.group);
    const position = lists.indexOf(list);
    if (position === -1) return false;
    const next = lists[position + (key === "ArrowRight" ? 1 : -1)];
    if (!next) return false;
    next.appendChild(item);
    announce(`Moved to list ${lists.indexOf(next) + 1} of ${lists.length}`);
    item.focus();
    return true;
  }
  return false;
}
function droppableTargets(current2) {
  return Array.from(droppableRegistry.values()).filter((info) => dropAccepts(info, current2)).map((info) => info.el);
}
defineDirective("dnd-group", ({ el, expression }) => {
  ensureDnd();
  const name = expression.trim() || "default";
  el.setAttribute("data-v-dnd-group", name);
  el.classList.add("v-dnd-group");
});
defineDirective("sortable", ({ el, expression, cleanup }) => {
  ensureDnd();
  el.classList.add("v-sortable");
  const handle = readOption(el, "sortable-handle") || expression.trim() || null;
  const info = {
    el,
    group: groupOf(el, readOption(el, "sortable-group")),
    handle
  };
  sortableRegistry.set(el, info);
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Sortable list");
  const prepare = (item) => {
    if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
    if (!item.hasAttribute("aria-grabbed")) item.setAttribute("aria-grabbed", "false");
    if (handle) item.querySelector(handle)?.classList.add("v-drag-handle");
    else item.classList.add("v-drag-handle");
  };
  for (const item of itemsOf(el)) prepare(item);
  const observer3 = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => {
    for (const item of itemsOf(el)) prepare(item);
  });
  observer3?.observe(el, { childList: true });
  installPointerDrag(
    el,
    {
      mode: "sort",
      handle,
      group: () => info.group,
      data: () => null,
      axis: () => null,
      itemFrom: (target) => {
        const item = itemsOf(el).find((child) => child === target || child.contains(target));
        return item ?? null;
      }
    },
    cleanup
  );
  const onKeyDown = (event) => {
    const target = event.target;
    if (!target) return;
    const item = itemsOf(el).find((child) => child === target || child.contains(target));
    if (!item) return;
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (session2 && session2.item === item) {
        finishDrag();
        announce("Item dropped");
        return;
      }
      if (session2) return;
      beginDrag(item, {
        mode: "sort",
        data: null,
        group: info.group,
        axis: null,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true
      });
      announce("Item grabbed. Use arrow keys to move and space to drop.");
      return;
    }
    if (!session2 || session2.item !== item) return;
    if (event.key.startsWith("Arrow")) {
      if (keyboardMove(item, event.key)) event.preventDefault();
    }
  };
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("keydown", onKeyDown);
    observer3?.disconnect();
    sortableRegistry.delete(el);
  });
});
defineOption("sortable-group");
defineOption("sortable-handle");
defineDirective("draggable", ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add("v-draggable");
  const handle = readOption(el, "draggable-handle") || null;
  const axisRaw = (readOption(el, "draggable-axis") || "").trim().toLowerCase();
  const axis = axisRaw === "x" || axisRaw === "y" ? axisRaw : null;
  const dataExpression = readOption(el, "draggable-data") || expression.trim();
  const group = groupOf(el, readOption(el, "draggable-group"));
  if (handle) el.querySelector(handle)?.classList.add("v-drag-handle");
  else el.classList.add("v-drag-handle");
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  el.setAttribute("aria-grabbed", "false");
  if (!el.hasAttribute("aria-roledescription")) {
    el.setAttribute("aria-roledescription", "draggable item");
  }
  const readData = () => dataExpression ? evaluateIn(dataExpression, scope, "v-draggable-data") : null;
  installPointerDrag(
    el,
    {
      mode: "free",
      handle,
      group: () => group,
      data: readData,
      axis: () => axis,
      itemFrom: () => el
    },
    cleanup
  );
  let targets = [];
  let cursor = 0;
  const highlight = () => {
    targets.forEach((target, index) => target.classList.toggle("v-drop-over", index === cursor));
    const active = targets[cursor];
    if (!active || !session2) return;
    session2.overDrop = active;
    if (!device.reducedMotion) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else active.scrollIntoView({ block: "nearest" });
    announce(active.getAttribute("aria-label") || `Target ${cursor + 1} of ${targets.length}`);
  };
  const onKeyDown = (event) => {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (session2 && session2.item === el) {
        finishDrag();
        targets = [];
        return;
      }
      if (session2) return;
      beginDrag(el, {
        mode: "free",
        data: readData(),
        group,
        axis,
        pointerId: -1,
        x: 0,
        y: 0,
        keyboard: true
      });
      targets = session2 ? droppableTargets(session2) : [];
      cursor = 0;
      if (targets.length) highlight();
      else announce("No targets available");
      return;
    }
    if (!session2 || session2.item !== el || !targets.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      cursor = (cursor + 1) % targets.length;
      highlight();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      cursor = (cursor - 1 + targets.length) % targets.length;
      highlight();
    }
  };
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("keydown", onKeyDown);
    for (const target of targets) target.classList.remove("v-drop-over");
  });
});
defineOption("draggable-handle");
defineOption("draggable-axis");
defineOption("draggable-data");
defineOption("draggable-group");
defineDirective("droppable", ({ el, expression, scope, cleanup }) => {
  ensureDnd();
  el.classList.add("v-droppable");
  const info = {
    el,
    group: groupOf(el, readOption(el, "droppable-group")),
    accept: readOption(el, "droppable-accept"),
    expression,
    scope
  };
  droppableRegistry.set(el, info);
  if (!el.hasAttribute("aria-dropeffect")) el.setAttribute("aria-dropeffect", "move");
  cleanup(() => {
    droppableRegistry.delete(el);
    el.classList.remove("v-drop-over", "v-drop-active");
  });
});
defineOption("droppable-accept");
defineOption("droppable-group");

// src/directives/ui.ts
var UI_CSS = `
.v-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v-focus-ring:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px;
  border-radius:var(--v-radius-sm,8px)}
.v-scroll-lock{overflow:hidden !important}

.v-tooltip,.v-popover{position:fixed;z-index:var(--v-z-tooltip,1200);opacity:0;
  transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-tooltip{max-width:min(280px,80vw);padding:6px 10px;border-radius:var(--v-radius-sm,8px);
  background:var(--v-text,#14111F);color:var(--v-surface,#fff);pointer-events:none;
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,sans-serif);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}
.v-tooltip[data-placement="top"]{transform:translateY(4px)}
.v-tooltip[data-placement="bottom"]{transform:translateY(-4px)}
.v-tooltip[data-placement="left"]{transform:translateX(4px)}
.v-tooltip[data-placement="right"]{transform:translateX(-4px)}
.v-tooltip.v-in,.v-popover.v-in{opacity:1;transform:none}
.v-popover{z-index:var(--v-z-dropdown,900);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));transform:translateY(-4px)}
.v-popover[hidden],.v-dropdown-menu[hidden]{display:none !important}

.v-dropdown-menu{position:fixed;z-index:var(--v-z-dropdown,900);min-width:180px;padding:6px;margin:0;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  opacity:0;transform:translateY(-4px);transition:opacity .14s var(--v-ease,ease),transform .14s var(--v-ease,ease)}
.v-dropdown-menu.v-in{opacity:1;transform:none}
.v-dropdown-menu [role="menuitem"]{display:block;width:100%;text-align:left;background:none;border:0;
  padding:8px 10px;border-radius:var(--v-radius-sm,8px);color:inherit;cursor:pointer;
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif);text-decoration:none}
.v-dropdown-menu [role="menuitem"]:hover,.v-dropdown-menu [role="menuitem"]:focus-visible{
  background:var(--v-surface-2,#FBF7F2);outline:none;color:var(--v-primary,#6D3BF5)}

.v-tab{cursor:pointer}
[role="tabpanel"][hidden]{display:none !important}

.v-accordion-header{display:flex;align-items:center;justify-content:space-between;gap:12px;
  width:100%;cursor:pointer;text-align:left}
.v-accordion-header::after{content:"";flex:none;width:8px;height:8px;border-right:2px solid currentColor;
  border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px);
  transition:transform .2s var(--v-ease,ease);opacity:.6}
.v-accordion-header[aria-expanded="true"]::after{transform:rotate(-135deg) translateY(-2px)}

.v-drawer-backdrop{position:fixed;inset:0;background:rgba(20,17,31,.45);opacity:0;
  z-index:var(--v-z-drawer,1000);transition:opacity .24s var(--v-ease,ease)}
.v-drawer-backdrop.v-in{opacity:1}
.v-drawer-panel{position:fixed;display:flex;flex-direction:column;overflow:auto;
  z-index:calc(var(--v-z-drawer,1000) + 1);background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));
  transition:transform .28s var(--v-ease,ease)}
.v-drawer-panel[hidden]{display:none !important}
.v-drawer-panel[data-side="left"]{top:0;left:0;height:100%;width:min(360px,86vw);transform:translateX(-100%)}
.v-drawer-panel[data-side="right"]{top:0;right:0;height:100%;width:min(360px,86vw);transform:translateX(100%)}
.v-drawer-panel[data-side="top"]{top:0;left:0;width:100%;max-height:86vh;transform:translateY(-100%)}
.v-drawer-panel[data-side="bottom"]{bottom:0;left:0;width:100%;max-height:86vh;transform:translateY(100%)}
.v-drawer-panel.v-open{transform:none}

.v-skeleton{position:relative;min-height:1em;border-radius:var(--v-radius-sm,8px);color:transparent !important;
  background:linear-gradient(90deg,var(--v-surface-2,#FBF7F2) 25%,var(--v-border,#E6E0F0) 37%,var(--v-surface-2,#FBF7F2) 63%);
  background-size:400% 100%;animation:v-skeleton-wave 1.4s ease infinite}
.v-skeleton>*{visibility:hidden}
@keyframes v-skeleton-wave{0%{background-position:100% 50%}100%{background-position:0 50%}}

.v-lazy{opacity:0;transition:opacity .35s var(--v-ease,ease)}
.v-lazy-loaded{opacity:1}
.v-lazy-failed{opacity:1;filter:grayscale(1)}

.v-copied,.v-copy-failed{position:relative}
.v-copied::after,.v-copy-failed::after{content:attr(data-v-copy-label);position:absolute;left:50%;
  bottom:calc(100% + 6px);transform:translateX(-50%);padding:5px 8px;border-radius:6px;white-space:nowrap;
  pointer-events:none;color:#0B1F1A;background:var(--v-success,#2ED9A5);
  font:600 11px/1 var(--v-font-sans,system-ui,sans-serif)}
.v-copy-failed::after{background:var(--v-danger,#FF4D4D);color:#fff}

.v-sticky{position:sticky;top:var(--v-sticky-offset,0px);z-index:5}
.v-stuck{box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14))}

.v-resizable{position:relative}
.v-resize-handle{position:absolute;background:transparent;touch-action:none;padding:0;border:0}
.v-resize-handle:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:-2px}
.v-resize-handle[data-dir="right"]{top:0;right:-3px;width:8px;height:100%;cursor:ew-resize}
.v-resize-handle[data-dir="bottom"]{left:0;bottom:-3px;height:8px;width:100%;cursor:ns-resize}
.v-resize-handle[data-dir="corner"]{right:-3px;bottom:-3px;width:14px;height:14px;cursor:nwse-resize}

.v-command{position:fixed;inset:0;z-index:var(--v-z-modal,1000);display:flex;justify-content:center;
  align-items:flex-start;padding:12vh 16px 16px;background:rgba(20,17,31,.45)}
.v-command-box{width:min(560px,100%);background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius,12px);box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));overflow:hidden}
.v-command-input{display:block;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--v-border,#E6E0F0);
  background:transparent;color:var(--v-text,#14111F);outline:none;
  font:500 15px/1.4 var(--v-font-sans,system-ui,sans-serif)}
.v-command-list{list-style:none;margin:0;padding:6px;max-height:min(46vh,340px);overflow:auto}
.v-command-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;
  border-radius:var(--v-radius-sm,8px);cursor:pointer;color:var(--v-text,#14111F);
  font:500 14px/1.35 var(--v-font-sans,system-ui,sans-serif)}
.v-command-option[aria-selected="true"]{background:var(--v-surface-2,#FBF7F2);color:var(--v-primary,#6D3BF5)}
.v-command-hint{color:var(--v-text-muted,#6B6580);font-size:12px}
.v-command-empty{padding:18px;text-align:center;color:var(--v-text-muted,#6B6580);
  font:500 14px/1.4 var(--v-font-sans,system-ui,sans-serif)}

@media (prefers-reduced-motion: reduce){
  .v-tooltip,.v-popover,.v-dropdown-menu,.v-drawer-panel,.v-drawer-backdrop,.v-lazy,.v-accordion-header::after{
    transition-duration:.01ms !important}
  .v-skeleton{animation-duration:.01ms !important}
}
`;
function ensureUi() {
  ensureTokens();
  injectStyle("ui", UI_CSS);
}
function resolveTarget(el, expression) {
  const text = expression.trim();
  if (text) {
    try {
      const found = document.querySelector(text);
      if (found) return found;
    } catch {
    }
  }
  return el.nextElementSibling ?? null;
}
function ensureId(el, prefix) {
  if (!el.id) el.id = uid(`${prefix}-`);
  return el.id;
}
var FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,object,embed,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function focusableIn(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0
  );
}
function trapTab(root, event) {
  const items = focusableIn(root);
  if (!items.length) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
function makeInteractive(el, cleanup) {
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "SUMMARY") {
    el.classList.add("v-focus-ring");
    return;
  }
  if (!el.hasAttribute("role")) el.setAttribute("role", "button");
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  el.classList.add("v-focus-ring");
  const onKey = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    el.click();
  };
  el.addEventListener("keydown", onKey);
  cleanup(() => el.removeEventListener("keydown", onKey));
}
var scrollLocks = 0;
var savedPaddingRight = "";
function lockScroll() {
  if (scrollLocks++ > 0) return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  savedPaddingRight = document.body.style.paddingRight;
  if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  document.body.classList.add("v-scroll-lock");
}
function unlockScroll() {
  if (scrollLocks === 0) return;
  if (--scrollLocks > 0) return;
  document.body.classList.remove("v-scroll-lock");
  document.body.style.paddingRight = savedPaddingRight;
}
function isHidden(el) {
  if (el.hasAttribute("hidden")) return true;
  if (el.style.display === "none") return true;
  return el.isConnected ? getComputedStyle(el).display === "none" : false;
}
function showElement2(el, animated = true) {
  el.removeAttribute("hidden");
  if (animated && !device.reducedMotion) {
    void fadeIn(el);
    return;
  }
  el.style.removeProperty("display");
  if (getComputedStyle(el).display === "none") el.style.display = "block";
}
function hideElement2(el, animated = true) {
  if (animated && !device.reducedMotion) {
    void fadeOut(el);
    return;
  }
  el.style.display = "none";
}
var OPPOSITE = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
};
function parsePlacement(value, fallback) {
  const text = (value || "").trim().toLowerCase();
  if (text === "top" || text === "bottom" || text === "left" || text === "right") return text;
  return fallback;
}
function placeFloating(anchor, floating, preferred, align = "center", gap = 8) {
  floating.style.position = "fixed";
  floating.style.left = "0px";
  floating.style.top = "0px";
  const a = anchor.getBoundingClientRect();
  const f = floating.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const room = {
    top: a.top,
    bottom: vh - a.bottom,
    left: a.left,
    right: vw - a.right
  };
  const need = {
    top: f.height + gap,
    bottom: f.height + gap,
    left: f.width + gap,
    right: f.width + gap
  };
  let side = preferred;
  if (room[side] < need[side]) {
    const other = OPPOSITE[side];
    if (room[other] >= need[other]) {
      side = other;
    } else {
      for (const key of Object.keys(room)) {
        if (room[key] - need[key] > room[side] - need[side]) side = key;
      }
    }
  }
  let top2 = 0;
  let left = 0;
  if (side === "top" || side === "bottom") {
    top2 = side === "top" ? a.top - f.height - gap : a.bottom + gap;
    left = align === "start" ? a.left : a.left + a.width / 2 - f.width / 2;
    if (align === "start" && left + f.width > vw - gap) left = a.right - f.width;
  } else {
    left = side === "left" ? a.left - f.width - gap : a.right + gap;
    top2 = align === "start" ? a.top : a.top + a.height / 2 - f.height / 2;
  }
  left = Math.min(Math.max(gap, left), Math.max(gap, vw - f.width - gap));
  top2 = Math.min(Math.max(gap, top2), Math.max(gap, vh - f.height - gap));
  floating.style.left = `${Math.round(left)}px`;
  floating.style.top = `${Math.round(top2)}px`;
  floating.setAttribute("data-placement", side);
  return side;
}
var hotkeyEntries = [];
var hotkeyListening = false;
var KEY_NAMES = {
  esc: "escape",
  space: " ",
  spacebar: " ",
  enter: "enter",
  ret: "enter",
  del: "delete",
  ins: "insert",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  plus: "+",
  minus: "-",
  comma: ",",
  period: ".",
  slash: "/",
  question: "?"
};
var IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
function parseCombo(text) {
  const parts = text.trim().toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const combo = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: "",
    hasModifier: false
  };
  for (const part of parts) {
    if (part === "ctrl" || part === "control") combo.ctrl = true;
    else if (part === "shift") combo.shift = true;
    else if (part === "alt" || part === "option") combo.alt = true;
    else if (part === "meta" || part === "cmd" || part === "command" || part === "super") combo.meta = true;
    else if (part === "mod") {
      if (IS_APPLE) combo.meta = true;
      else combo.ctrl = true;
    } else {
      combo.key = KEY_NAMES[part] ?? part;
    }
  }
  if (!combo.key) return null;
  combo.hasModifier = combo.ctrl || combo.alt || combo.meta;
  return combo;
}
function comboMatches(combo, event) {
  if (combo.ctrl !== event.ctrlKey) return false;
  if (combo.alt !== event.altKey) return false;
  if (combo.meta !== event.metaKey) return false;
  if (event.key.toLowerCase() !== combo.key) return false;
  const shiftImplied = combo.key.length === 1 && !/^[a-z0-9 ]$/.test(combo.key);
  if (shiftImplied) return combo.shift ? event.shiftKey : true;
  return combo.shift === event.shiftKey;
}
function isTypingTarget(target) {
  const el = target;
  if (!el || typeof el.tagName !== "string") return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return el.isContentEditable === true;
}
function ariaShortcut(combo) {
  const parts = [];
  if (combo.ctrl) parts.push("Control");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Meta");
  parts.push(combo.key === " " ? "Space" : combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join("+");
}
function onGlobalKeyDown(event) {
  if (event.defaultPrevented) return;
  const typing = isTypingTarget(event.target);
  for (const entry of [...hotkeyEntries]) {
    for (const combo of entry.combos) {
      if (!comboMatches(combo, event)) continue;
      if (typing && !entry.options.allowInInput && !combo.hasModifier) continue;
      if (entry.options.preventDefault !== false) event.preventDefault();
      entry.handler(event);
      break;
    }
  }
}
function hotkey(combo, handler, options = {}) {
  const combos = combo.split(",").map((part) => parseCombo(part)).filter((parsed) => parsed !== null);
  if (!combos.length || typeof document === "undefined") return () => void 0;
  const entry = { combos, handler, options };
  hotkeyEntries.push(entry);
  if (!hotkeyListening) {
    hotkeyListening = true;
    document.addEventListener("keydown", onGlobalKeyDown);
  }
  return () => {
    const index = hotkeyEntries.indexOf(entry);
    if (index > -1) hotkeyEntries.splice(index, 1);
  };
}
defineDirective("toggle", ({ el, expression, modifiers, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;
  const className = typeof modifiers.class === "string" ? modifiers.class : null;
  const animated = !modifiers.instant;
  el.setAttribute("aria-controls", ensureId(target, "v-toggle"));
  makeInteractive(el, cleanup);
  let aberto = className ? target.classList.contains(className) : !isHidden(target);
  const sync = () => {
    el.setAttribute("aria-expanded", String(aberto));
  };
  const onClick = (event) => {
    event.preventDefault();
    if (className) {
      target.classList.toggle(className);
      aberto = target.classList.contains(className);
    } else if (aberto) {
      hideElement2(target, animated);
      aberto = false;
    } else {
      showElement2(target, animated);
      aberto = true;
    }
    sync();
    dispatch2(el, "voodoo:toggle", { target, open: aberto });
  };
  sync();
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
var Collapse = class {
  constructor(panel) {
    __publicField(this, "panel");
    __publicField(this, "triggers", /* @__PURE__ */ new Set());
    __publicField(this, "listeners", /* @__PURE__ */ new Set());
    __publicField(this, "open");
    __publicField(this, "duration");
    this.panel = panel;
    this.duration = parseDuration(readOption(panel, "collapse-duration"), 240);
    const initial = (readOption(panel, "collapse") || "").trim().toLowerCase();
    this.open = initial === "open" || initial === "true" || !isHidden(panel);
    panel.classList.add("v-collapse-panel");
    ensureId(panel, "v-collapse");
    if (!this.open) panel.style.display = "none";
    this.sync();
  }
  /** Updates trigger's `aria-expanded` and notifies observers. */
  sync() {
    for (const trigger2 of this.triggers) {
      trigger2.setAttribute("aria-expanded", String(this.open));
      trigger2.setAttribute("aria-controls", this.panel.id);
    }
    for (const listener of this.listeners) listener(this.open);
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.panel.removeAttribute("hidden");
    if (device.reducedMotion) this.panel.style.removeProperty("display");
    else void slideDown(this.panel, this.duration);
    this.sync();
    dispatch2(this.panel, "voodoo:collapse", { open: true });
  }
  hide() {
    if (!this.open) return;
    this.open = false;
    if (device.reducedMotion) this.panel.style.display = "none";
    else void slideUp(this.panel, this.duration);
    this.sync();
    dispatch2(this.panel, "voodoo:collapse", { open: false });
  }
  toggle() {
    if (this.open) this.hide();
    else this.show();
  }
};
var collapses = /* @__PURE__ */ new WeakMap();
function collapseOf(panel) {
  let controller = collapses.get(panel);
  if (!controller) collapses.set(panel, controller = new Collapse(panel));
  return controller;
}
defineDirective("collapse", ({ el }) => {
  ensureUi();
  collapseOf(el);
});
defineDirective("collapse-toggle", ({ el, expression, cleanup }) => {
  ensureUi();
  const target = resolveTarget(el, expression);
  if (!target) return;
  const controller = collapseOf(target);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    controller.triggers.delete(el);
  });
});
defineOption("collapse-duration");
var Popup = class {
  constructor(trigger2, panel, kind) {
    __publicField(this, "trigger");
    __publicField(this, "panel");
    __publicField(this, "kind");
    __publicField(this, "placement");
    __publicField(this, "open", false);
    __publicField(this, "lastFocus", null);
    /** Original location of the panel, to restore when directive is unmounted. */
    __publicField(this, "homeParent");
    __publicField(this, "homeNext");
    __publicField(this, "reposition", () => {
      if (!this.open) return;
      placeFloating(this.trigger, this.panel, this.placement, this.kind === "menu" ? "start" : "center");
    });
    __publicField(this, "onDocumentPointerDown", (event) => {
      const target = event.target;
      if (!target) return;
      if (this.panel.contains(target) || this.trigger.contains(target)) return;
      this.hide();
    });
    __publicField(this, "onKeyDown", (event) => {
      if (!this.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.hide(true);
        return;
      }
      if (this.kind !== "menu") {
        if (event.key === "Tab") trapTab(this.panel, event);
        return;
      }
      const items = this.items();
      if (!items.length) return;
      const current2 = items.indexOf(document.activeElement);
      if (event.key === "Enter" || event.key === " ") {
        const item = items[current2];
        if (!item) return;
        event.preventDefault();
        this.hide(true);
        item.click();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step2 = event.key === "ArrowDown" ? 1 : -1;
        const next = (current2 + step2 + items.length) % items.length;
        items[current2 === -1 && step2 === -1 ? items.length - 1 : next].focus();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        items[0].focus();
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1].focus();
        return;
      }
      if (event.key === "Tab") this.hide();
    });
    this.trigger = trigger2;
    this.panel = panel;
    this.kind = kind;
    this.homeParent = panel.parentElement;
    this.homeNext = panel.nextSibling;
    this.placement = parsePlacement(
      readOption(trigger2, kind === "menu" ? "dropdown-position" : "popover-position"),
      "bottom"
    );
    ensureId(panel, kind === "menu" ? "v-menu" : "v-popover");
    panel.classList.add(kind === "menu" ? "v-dropdown-menu" : "v-popover");
    panel.hidden = true;
    if (kind === "menu") prepareMenu(panel);
    else panel.setAttribute("role", "dialog");
    trigger2.setAttribute("aria-haspopup", kind === "menu" ? "menu" : "dialog");
    trigger2.setAttribute("aria-controls", panel.id);
    trigger2.setAttribute("aria-expanded", "false");
  }
  /** Items navigable with arrow keys, menu mode only. */
  items() {
    return Array.from(this.panel.querySelectorAll('[role="menuitem"]'));
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement;
    if (this.panel.parentElement !== document.body) document.body.appendChild(this.panel);
    this.panel.hidden = false;
    this.reposition();
    requestAnimationFrame(() => this.panel.classList.add("v-in"));
    this.trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("resize", this.reposition);
    window.addEventListener("scroll", this.reposition, true);
    if (this.kind === "dialog") focusableIn(this.panel)[0]?.focus();
    dispatch2(this.trigger, "voodoo:popup", { open: true, panel: this.panel });
  }
  hide(restoreFocus = false) {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove("v-in");
    this.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("resize", this.reposition);
    window.removeEventListener("scroll", this.reposition, true);
    const finish = () => {
      if (!this.open) this.panel.hidden = true;
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 160);
    if (restoreFocus) (this.lastFocus ?? this.trigger).focus();
    dispatch2(this.trigger, "voodoo:popup", { open: false, panel: this.panel });
  }
  toggle() {
    if (this.open) this.hide(true);
    else this.show();
  }
  /** Removes listeners and returns the panel to its original location. */
  dispose() {
    this.hide();
    document.removeEventListener("pointerdown", this.onDocumentPointerDown, true);
    document.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("resize", this.reposition);
    window.removeEventListener("scroll", this.reposition, true);
    if (!this.homeParent || this.panel.parentElement === this.homeParent) return;
    if (this.homeNext && this.homeNext.parentNode === this.homeParent) {
      this.homeParent.insertBefore(this.panel, this.homeNext);
    } else {
      this.homeParent.appendChild(this.panel);
    }
  }
};
function prepareMenu(menu) {
  ensureUi();
  menu.classList.add("v-dropdown-menu");
  if (!menu.hasAttribute("role")) menu.setAttribute("role", "menu");
  for (const item of Array.from(menu.children)) {
    const child = item;
    if (child.hasAttribute("role")) continue;
    if (child.matches("a,button,[tabindex]")) {
      child.setAttribute("role", "menuitem");
      child.setAttribute("tabindex", "-1");
    }
  }
}
defineDirective("dropdown-menu", ({ el }) => {
  prepareMenu(el);
});
defineDirective("dropdown", ({ el, expression, cleanup }) => {
  ensureUi();
  const menu = resolveTarget(el, expression);
  if (!menu) return;
  const popup = new Popup(el, menu, "menu");
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    popup.toggle();
  };
  const onTriggerKey = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!popup.open) popup.show();
      const items = popup.items();
      if (items.length) items[event.key === "ArrowDown" ? 0 : items.length - 1].focus();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const alreadyActivated = event.defaultPrevented;
    event.preventDefault();
    if (!alreadyActivated) popup.toggle();
    if (popup.open) popup.items()[0]?.focus();
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onTriggerKey);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onTriggerKey);
    popup.dispose();
  });
});
defineDirective("popover", ({ el, expression, cleanup }) => {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;
  const popup = new Popup(el, panel, "dialog");
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    popup.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    popup.dispose();
  });
});
defineOption("dropdown-position");
defineOption("popover-position");
defineDirective("tooltip", ({ el, expression, cleanup }) => {
  ensureUi();
  const text = expression.trim();
  if (!text) return;
  const placement = parsePlacement(readOption(el, "tooltip-position"), "top");
  const delay = parseDuration(readOption(el, "tooltip-delay"), 200);
  const addedTabIndex = !el.hasAttribute("tabindex") && !el.hasAttribute("disabled") && !el.matches(FOCUSABLE);
  if (addedTabIndex) el.setAttribute("tabindex", "0");
  let bubble = null;
  let timer = null;
  const build = () => {
    const node = document.createElement("div");
    node.className = "v-tooltip";
    node.setAttribute("role", "tooltip");
    node.id = uid("v-tip-");
    node.textContent = text;
    document.body.appendChild(node);
    return node;
  };
  const reposition = () => {
    if (bubble) placeFloating(el, bubble, placement);
  };
  const open = () => {
    if (bubble) return;
    bubble = build();
    el.setAttribute("aria-describedby", bubble.id);
    reposition();
    requestAnimationFrame(() => bubble?.classList.add("v-in"));
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
  };
  const close = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!bubble) return;
    const node = bubble;
    bubble = null;
    el.removeAttribute("aria-describedby");
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    node.classList.remove("v-in");
    if (device.reducedMotion) node.remove();
    else setTimeout(() => node.remove(), 160);
  };
  const schedule = () => {
    if (timer || bubble) return;
    timer = setTimeout(() => {
      timer = null;
      open();
    }, delay);
  };
  const onEscape = (event) => {
    if (event.key === "Escape") close();
  };
  const onPointerDown = () => {
    if (addedTabIndex) el.focus();
  };
  el.addEventListener("mouseenter", schedule);
  el.addEventListener("focusin", open);
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("mouseleave", close);
  el.addEventListener("focusout", close);
  el.addEventListener("keydown", onEscape);
  cleanup(() => {
    close();
    if (addedTabIndex) el.removeAttribute("tabindex");
    el.removeEventListener("mouseenter", schedule);
    el.removeEventListener("focusin", open);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("mouseleave", close);
    el.removeEventListener("focusout", close);
    el.removeEventListener("keydown", onEscape);
  });
});
defineOption("tooltip-position");
defineOption("tooltip-delay");
defineDirective("tabs", ({ el, expression, cleanup }) => {
  ensureUi();
  const tabs = ownedByDirective(el, "tab", "tabs");
  const panels = ownedByDirective(el, "tab-panel", "tabs");
  if (!tabs.length) return;
  const idOf = (tab, index) => attrOf(tab, "tab") || String(index);
  const list = tabs[0].parentElement;
  if (list && !list.hasAttribute("role")) list.setAttribute("role", "tablist");
  const vertical = (list?.getAttribute("aria-orientation") || "").trim().toLowerCase() === "vertical";
  list?.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
  const urlKey = hasAttrOf(el, "tabs-url") ? attrOf(el, "tabs-url") || "tab" : null;
  tabs.forEach((tab, index) => {
    const id = idOf(tab, index);
    const panel = panels.find((item) => attrOf(item, "tab-panel") === id);
    tab.classList.add("v-tab", "v-focus-ring");
    tab.setAttribute("role", "tab");
    ensureId(tab, "v-tab");
    if (panel) {
      ensureId(panel, "v-panel");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      tab.setAttribute("aria-controls", panel.id);
    }
  });
  let activeId = "";
  const activate = (id, focusTab = false) => {
    if (!tabs.some((tab, index) => idOf(tab, index) === id)) return;
    activeId = id;
    tabs.forEach((tab, index) => {
      const selected = idOf(tab, index) === id;
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      tab.classList.toggle("v-active", selected);
      if (selected && focusTab) tab.focus();
    });
    for (const panel of panels) {
      panel.hidden = attrOf(panel, "tab-panel") !== id;
    }
    if (urlKey) url.set(urlKey, id);
    dispatch2(el, "voodoo:tab", { id });
  };
  const onClick = (event) => {
    const tab = closestDirective(event.target, "tab");
    if (!tab || !tabs.includes(tab)) return;
    event.preventDefault();
    activate(idOf(tab, tabs.indexOf(tab)));
  };
  const onKeyDown = (event) => {
    const tab = closestDirective(event.target, "tab");
    if (!tab || !tabs.includes(tab)) return;
    const current2 = tabs.indexOf(tab);
    const forward = vertical ? "ArrowDown" : "ArrowRight";
    const backward = vertical ? "ArrowUp" : "ArrowLeft";
    let next = -1;
    if (event.key === forward) next = (current2 + 1) % tabs.length;
    else if (event.key === backward) next = (current2 - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    activate(idOf(tabs[next], next), true);
  };
  const onPopState = () => {
    if (!urlKey) return;
    const wanted = url.get(urlKey);
    if (wanted && wanted !== activeId) activate(wanted);
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("popstate", onPopState);
  });
  const fromUrl = urlKey ? url.get(urlKey) : void 0;
  const initial = fromUrl || expression.trim() || idOf(tabs[0], 0);
  activate(initial);
  if (!activeId) activate(idOf(tabs[0], 0));
});
defineOption("tab");
defineOption("tab-panel");
defineOption("tabs-url");
defineDirective("accordion", ({ el, cleanup }) => {
  ensureUi();
  const items = ownedByDirective(el, "accordion-item", "accordion");
  if (!items.length) return;
  const single = hasAttrOf(el, "accordion-single");
  const headers = [];
  const controllers2 = [];
  for (const item of items) {
    const header = item.firstElementChild;
    const panel = item.lastElementChild;
    if (!header || !panel || header === panel) continue;
    const state = (attrOf(item, "accordion-item") || "").trim().toLowerCase();
    if (state !== "open" && state !== "true") panel.style.display = "none";
    const controller = collapseOf(panel);
    controller.triggers.add(header);
    controller.sync();
    header.classList.add("v-accordion-header", "v-focus-ring");
    if (!header.hasAttribute("role")) header.setAttribute("role", "button");
    if (!header.hasAttribute("tabindex")) header.setAttribute("tabindex", "0");
    ensureId(panel, "v-accordion-panel");
    header.setAttribute("aria-controls", panel.id);
    header.setAttribute("aria-expanded", String(controller.open));
    if (items.length <= 6 && !panel.hasAttribute("role")) {
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", ensureId(header, "v-accordion-header"));
    }
    headers.push(header);
    controllers2.push(controller);
  }
  const onClick = (event) => {
    const header = event.target?.closest(".v-accordion-header");
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;
    event.preventDefault();
    const controller = controllers2[index];
    if (single && !controller.open) {
      for (const other of controllers2) if (other !== controller) other.hide();
    }
    controller.toggle();
  };
  const onKeyDown = (event) => {
    const header = event.target?.closest(".v-accordion-header");
    if (!header) return;
    const index = headers.indexOf(header);
    if (index === -1) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      header.click();
      return;
    }
    let next = -1;
    if (event.key === "ArrowDown") next = (index + 1) % headers.length;
    else if (event.key === "ArrowUp") next = (index - 1 + headers.length) % headers.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = headers.length - 1;
    if (next === -1) return;
    event.preventDefault();
    headers[next].focus();
  };
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
  });
});
defineOption("accordion-item");
defineOption("accordion-single");
var Drawer = class {
  constructor(panel) {
    /** Marks the original location of the panel while it's in the document body. */
    __publicField(this, "origem", null);
    __publicField(this, "panel");
    __publicField(this, "triggers", /* @__PURE__ */ new Set());
    __publicField(this, "open", false);
    __publicField(this, "backdrop", null);
    __publicField(this, "lastFocus", null);
    __publicField(this, "onKeyDown", (event) => {
      if (!this.open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.hide();
        return;
      }
      if (event.key === "Tab") trapTab(this.panel, event);
    });
    __publicField(this, "onPointerDown", (event) => {
      const target = event.target;
      if (!target || this.panel.contains(target)) return;
      for (const trigger2 of this.triggers) if (trigger2.contains(target)) return;
      this.hide();
    });
    this.panel = panel;
    const side = (readOption(panel, "drawer-side") || "right").trim().toLowerCase();
    panel.classList.add("v-drawer-panel");
    panel.setAttribute("data-side", ["left", "right", "top", "bottom"].includes(side) ? side : "right");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    ensureId(panel, "v-drawer");
    panel.hidden = true;
    this.label();
  }
  /**
   * Gives the dialog an accessible name, which the WAI-ARIA dialog-modal
   * pattern requires: without one a screen reader announces "dialog" and
   * nothing else. A heading written inside the drawer becomes the label. An
   * `aria-label` or `aria-labelledby` already on the panel always wins, and
   * a drawer with no heading at all is left alone rather than mislabelled.
   *
   * Runs again on every open so a heading rendered after mount still counts.
   */
  label() {
    const panel = this.panel;
    if (panel.hasAttribute("aria-labelledby") || panel.hasAttribute("aria-label")) return;
    const heading = panel.querySelector("[data-drawer-title],h1,h2,h3,h4");
    if (!heading) return;
    panel.setAttribute("aria-labelledby", ensureId(heading, "v-drawer-title"));
  }
  /** Keeps trigger's `aria-expanded` up to date. */
  sync() {
    for (const trigger2 of this.triggers) {
      trigger2.setAttribute("aria-expanded", String(this.open));
      trigger2.setAttribute("aria-controls", this.panel.id);
      trigger2.setAttribute("aria-haspopup", "dialog");
    }
  }
  show() {
    if (this.open) return;
    this.open = true;
    this.lastFocus = document.activeElement;
    this.backdrop = document.createElement("div");
    this.backdrop.className = "v-drawer-backdrop";
    this.backdrop.addEventListener("click", () => this.hide());
    document.body.appendChild(this.backdrop);
    if (this.panel.parentElement !== document.body) {
      this.origem = document.createComment(" v-drawer ");
      this.panel.parentNode?.insertBefore(this.origem, this.panel);
      document.body.appendChild(this.panel);
    }
    this.panel.hidden = false;
    this.label();
    lockScroll();
    const settle = () => {
      this.backdrop?.classList.add("v-in");
      this.panel.classList.add("v-open");
    };
    if (device.reducedMotion) settle();
    else requestAnimationFrame(settle);
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("pointerdown", this.onPointerDown, true);
    (focusableIn(this.panel)[0] ?? this.panel).focus();
    this.sync();
    dispatch2(this.panel, "voodoo:drawer", { open: true });
  }
  hide() {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove("v-open");
    this.backdrop?.classList.remove("v-in");
    document.removeEventListener("keydown", this.onKeyDown, true);
    document.removeEventListener("pointerdown", this.onPointerDown, true);
    const finish = () => {
      if (this.open) return;
      this.panel.hidden = true;
      this.backdrop?.remove();
      this.backdrop = null;
      if (this.origem && this.origem.parentNode) {
        this.origem.parentNode.insertBefore(this.panel, this.origem);
        this.origem.remove();
        this.origem = null;
      }
    };
    if (device.reducedMotion) finish();
    else setTimeout(finish, 300);
    unlockScroll();
    this.lastFocus?.focus();
    this.sync();
    dispatch2(this.panel, "voodoo:drawer", { open: false });
  }
  toggle() {
    if (this.open) this.hide();
    else this.show();
  }
};
var drawers = /* @__PURE__ */ new WeakMap();
function drawerOf(panel) {
  let controller = drawers.get(panel);
  if (!controller) drawers.set(panel, controller = new Drawer(panel));
  return controller;
}
defineDirective("drawer-content", ({ el }) => {
  ensureUi();
  drawerOf(el);
});
function setupDrawerTrigger(el, expression, cleanup) {
  ensureUi();
  const panel = resolveTarget(el, expression);
  if (!panel) return;
  const controller = drawerOf(panel);
  controller.triggers.add(el);
  controller.sync();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    controller.toggle();
  };
  el.addEventListener("click", onClick);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    controller.triggers.delete(el);
  });
}
defineDirective("drawer", ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});
defineDirective("offcanvas", ({ el, expression, cleanup }) => {
  setupDrawerTrigger(el, expression, cleanup);
});
defineDirective("drawer-close", ({ el, expression, cleanup }) => {
  const panel = expression.trim() ? resolveTarget(el, expression) : el.closest(".v-drawer-panel") ?? closestDirective(el, "drawer-content");
  if (!panel) return;
  makeInteractive(el, cleanup);
  if (!el.hasAttribute("aria-label") && !el.textContent?.trim()) {
    el.setAttribute("aria-label", "Close");
  }
  const onClick = (event) => {
    event.preventDefault();
    drawerOf(panel).hide();
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("drawer-side");
defineDirective("theme-toggle", ({ el, cleanup }) => {
  makeInteractive(el, cleanup);
  const sync = () => {
    const dark = theme.resolved === "dark";
    el.setAttribute("aria-pressed", String(dark));
    el.dataset.vTheme = theme.resolved;
    if (!el.hasAttribute("aria-label")) {
      el.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    }
  };
  const onClick = (event) => {
    event.preventDefault();
    theme.toggle();
    sync();
  };
  const onThemeChange = () => sync();
  sync();
  el.addEventListener("click", onClick);
  document.addEventListener("voodoo:theme", onThemeChange);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    document.removeEventListener("voodoo:theme", onThemeChange);
  });
});
defineDirective(
  "focus",
  ({ el, expression, modifiers, effect: effect2, evaluate: evaluate2 }) => {
    const apply = () => {
      el.focus({ preventScroll: !!modifiers.quiet });
      const field = el;
      if (modifiers.select && typeof field.select === "function") field.select();
    };
    if (!expression.trim()) {
      queuePostFlush(apply);
      return;
    }
    effect2(() => {
      if (evaluate2()) queuePostFlush(apply);
    });
  },
  { priority: PRIORITY.INIT }
);
defineDirective("focus-trap", ({ el, expression, effect: effect2, evaluate: evaluate2, cleanup }) => {
  let active = !expression.trim();
  const onKeyDown = (event) => {
    if (!active || event.key !== "Tab") return;
    if (!el.isConnected) return;
    trapTab(el, event);
  };
  if (expression.trim()) {
    effect2(() => {
      const next = !!evaluate2();
      if (next && !active) queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
      active = next;
    });
  } else {
    queuePostFlush(() => (focusableIn(el)[0] ?? el).focus());
  }
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  document.addEventListener("keydown", onKeyDown, true);
  cleanup(() => document.removeEventListener("keydown", onKeyDown, true));
});
defineDirective("click-outside", ({ el, expression, scope, cleanup }) => {
  const onPointerDown = (event) => {
    if (!el.isConnected) return;
    const target = event.target;
    if (!target || el === target || el.contains(target)) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  cleanup(() => document.removeEventListener("pointerdown", onPointerDown, true));
});
defineDirective("escape", ({ el, expression, scope, cleanup }) => {
  const onKeyDown = (event) => {
    if (event.key !== "Escape" || !el.isConnected) return;
    callExpression(expression, scope, el, event);
  };
  document.addEventListener("keydown", onKeyDown);
  cleanup(() => document.removeEventListener("keydown", onKeyDown));
});
defineDirective("hotkey", ({ el, expression, modifiers, cleanup }) => {
  const combo = expression.trim();
  if (!combo) return;
  const off2 = hotkey(combo, () => el.click(), {
    allowInInput: !!modifiers.force,
    preventDefault: modifiers.default !== true
  });
  const parsed = parseCombo(combo.split(",")[0]);
  if (parsed && !el.hasAttribute("aria-keyshortcuts")) {
    el.setAttribute("aria-keyshortcuts", ariaShortcut(parsed));
  }
  cleanup(off2);
});
defineDirective("scroll-to", ({ el, expression, cleanup }) => {
  const onClick = (event) => {
    const selector = expression.trim() || el.getAttribute("href") || "";
    if (!selector) return;
    event.preventDefault();
    const offset = parseFloat(readOption(el, "scroll-offset") || "0") || 0;
    const behavior = device.reducedMotion ? "auto" : "smooth";
    if (selector === "top" || selector === "#top") {
      window.scrollTo({ top: 0, behavior });
      return;
    }
    if (selector === "bottom") {
      window.scrollTo({ top: document.body.scrollHeight, behavior });
      return;
    }
    let target = null;
    try {
      target = document.querySelector(selector);
    } catch {
      target = null;
    }
    if (!target) return;
    const top2 = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top2, behavior });
    const focusTarget = target;
    if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("scrollspy", ({ el, cleanup }) => {
  const links = Array.from(el.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;
  const activeClass = readOption(el, "scrollspy-class") || "v-active";
  const offset = parseFloat(readOption(el, "scroll-offset") || "0") || 0;
  const sections = links.map((link) => {
    const id = link.getAttribute("href") || "";
    const section = id.length > 1 ? document.querySelector(id) : null;
    return section ? { link, section } : null;
  }).filter((pair) => pair !== null);
  if (!sections.length) return;
  let current2 = null;
  const update = () => {
    let found = sections[0];
    for (const pair of sections) {
      if (pair.section.getBoundingClientRect().top - offset <= 8) found = pair;
    }
    if (found.link === current2) return;
    current2 = found.link;
    for (const pair of sections) {
      const active = pair.link === current2;
      pair.link.classList.toggle(activeClass, active);
      if (active) pair.link.setAttribute("aria-current", "true");
      else pair.link.removeAttribute("aria-current");
    }
    dispatch2(el, "voodoo:scrollspy", { id: found.section.id, link: found.link });
  };
  const onScroll = throttle(update, 100);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  queuePostFlush(update);
  cleanup(() => {
    onScroll.cancel();
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  });
});
defineOption("scroll-offset");
defineOption("scrollspy-class");
defineDirective("sticky", ({ el, expression, cleanup }) => {
  ensureUi();
  const offset = parseFloat(expression.trim() || readOption(el, "sticky-offset") || "0") || 0;
  el.classList.add("v-sticky");
  el.style.setProperty("--v-sticky-offset", `${offset}px`);
  if (typeof IntersectionObserver === "undefined") return;
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const stuck = entry.intersectionRatio < 1 && entry.boundingClientRect.top <= offset + 1;
        el.classList.toggle("v-stuck", stuck);
      }
    },
    { threshold: [1], rootMargin: `-${offset + 1}px 0px 0px 0px` }
  );
  observer3.observe(el);
  cleanup(() => observer3.disconnect());
});
defineOption("sticky-offset");
defineDirective("visible", ({ el, expression, scope, modifiers, cleanup }) => {
  const repeat = !!modifiers.repeat;
  const threshold = Number(modifiers.threshold ?? 0.1) || 0.1;
  const margin = typeof modifiers.margin === "string" ? modifiers.margin : "0px";
  if (typeof IntersectionObserver === "undefined") {
    callExpression(expression, scope, el, void 0, { visible: true });
    return;
  }
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callExpression(expression, scope, el, void 0, entry);
        if (!repeat) observer3.unobserve(el);
      }
    },
    { threshold, rootMargin: margin }
  );
  observer3.observe(el);
  cleanup(() => observer3.disconnect());
});
defineDirective("infinite-scroll", ({ el, expression, scope, cleanup }) => {
  const distance = readOption(el, "infinite-distance") || "200px";
  let loading = false;
  const release = () => {
    loading = false;
  };
  const run = () => {
    if (loading) return;
    loading = true;
    el.setAttribute("aria-busy", "true");
    const result = callExpression(expression, scope, el, void 0, { page: "next" });
    const done = () => {
      el.removeAttribute("aria-busy");
      setTimeout(release, 120);
    };
    if (result && typeof result.then === "function") {
      void result.then(done, done);
    } else {
      setTimeout(done, 300);
    }
  };
  if (typeof IntersectionObserver === "undefined") return;
  const sentinel = document.createElement("div");
  sentinel.className = "v-infinite-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "width:100%;height:1px;pointer-events:none";
  el.appendChild(sentinel);
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) run();
    },
    { rootMargin: `0px 0px ${distance} 0px` }
  );
  observer3.observe(sentinel);
  cleanup(() => {
    observer3.disconnect();
    sentinel.remove();
  });
});
defineOption("infinite-distance");
function setupLazy(el, source, cleanup, asBackground) {
  ensureUi();
  if (!source) return;
  el.classList.add("v-lazy");
  const apply = (href) => {
    if (asBackground) el.style.backgroundImage = `url("${href}")`;
    else el.src = href;
    el.classList.add("v-lazy-loaded");
  };
  const load = () => {
    const preload = new Image();
    preload.onload = () => apply(source);
    preload.onerror = () => {
      const fallback = readOption(el, "lazy-error");
      el.classList.add("v-lazy-failed");
      if (fallback) apply(fallback);
      else el.classList.add("v-lazy-loaded");
    };
    preload.src = source;
  };
  if (!asBackground && el.tagName === "IMG") {
    const image = el;
    if (!image.hasAttribute("loading")) image.loading = "lazy";
    if (!image.hasAttribute("decoding")) image.decoding = "async";
  }
  if (typeof IntersectionObserver === "undefined") {
    load();
    return;
  }
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer3.disconnect();
        load();
      }
    },
    { rootMargin: "200px" }
  );
  observer3.observe(el);
  cleanup(() => observer3.disconnect());
}
defineDirective("lazy-src", ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, false);
});
defineDirective("lazy-bg", ({ el, expression, cleanup }) => {
  setupLazy(el, expression.trim(), cleanup, true);
});
defineOption("lazy-error");
defineDirective("skeleton", ({ el, expression, effect: effect2, evaluate: evaluate2, cleanup }) => {
  ensureUi();
  const apply = (loading) => {
    el.classList.toggle("v-skeleton", loading);
    if (loading) el.setAttribute("aria-busy", "true");
    else el.removeAttribute("aria-busy");
  };
  if (expression.trim()) {
    effect2(() => apply(!!evaluate2()));
    return;
  }
  const hasContent = () => (el.textContent ?? "").trim().length > 0 || el.querySelector("img,svg,video,canvas") !== null;
  if (hasContent()) {
    apply(false);
    return;
  }
  apply(true);
  if (typeof MutationObserver === "undefined") return;
  const observer3 = new MutationObserver(() => {
    if (!hasContent()) return;
    apply(false);
    observer3.disconnect();
  });
  observer3.observe(el, { childList: true, subtree: true, characterData: true });
  cleanup(() => observer3.disconnect());
});
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
function flashCopied(el, ok) {
  ensureUi();
  const label = readOption(el, "copy-label") || (ok ? "Copied!" : "Could not copy");
  el.dataset.vCopyLabel = label;
  el.classList.add(ok ? "v-copied" : "v-copy-failed");
  announce(label);
  setTimeout(() => el.classList.remove("v-copied", "v-copy-failed"), 1600);
}
function copySource(el, expression) {
  const from = readOption(el, "copy-from");
  if (from) {
    const source = document.querySelector(from);
    if (source) {
      const field = source;
      if (typeof field.value === "string" && field.value) return field.value;
      return (source.textContent ?? "").trim();
    }
  }
  return expression.trim();
}
defineDirective("copy", ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const text = copySource(el, expression);
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:copy", { text, ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("copy-from", ({ el, expression, cleanup }) => {
  ensureUi();
  storeOption(el, "copy-from", expression);
  if (hasAttrOf(el, "copy")) return;
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const text = copySource(el, "");
    if (!text) return;
    void copyText(text).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:copy", { text, ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("copy-label");
function printElement(target, title) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Print");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"],style')).map((node) => node.outerHTML).join("\n");
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}</head><body>${target.outerHTML}</body></html>`;
  frame.addEventListener("load", () => {
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1e3);
  });
  document.body.appendChild(frame);
}
defineDirective("print", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const selector = expression.trim();
    const target = selector ? document.querySelector(selector) : null;
    if (!selector) {
      window.print();
      return;
    }
    if (target) printElement(target, document.title);
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineDirective("share", ({ el, expression, cleanup }) => {
  ensureUi();
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    event.preventDefault();
    const link = expression.trim() || readOption(el, "share-url") || location.href;
    const data2 = {
      title: readOption(el, "share-title") || document.title,
      url: link
    };
    const text = readOption(el, "share-text");
    if (text) data2.text = text;
    const nav = navigator;
    if (typeof nav.share === "function") {
      void nav.share(data2).then(
        () => dispatch2(el, "voodoo:share", { data: data2, method: "native" }),
        () => void 0
      );
      return;
    }
    void copyText(link).then((ok) => {
      flashCopied(el, ok);
      dispatch2(el, "voodoo:share", { data: data2, method: "clipboard", ok });
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("share-title");
defineOption("share-url");
defineOption("share-text");
defineDirective("fullscreen", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const target = expression.trim() ? document.querySelector(expression.trim()) ?? el : el;
  const sync = () => {
    el.setAttribute("aria-pressed", String(document.fullscreenElement === target));
  };
  const onClick = (event) => {
    event.preventDefault();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => void 0);
      return;
    }
    const legacy = target;
    if (typeof target.requestFullscreen === "function") {
      void target.requestFullscreen().catch(() => void 0);
    } else {
      legacy.webkitRequestFullscreen?.();
    }
  };
  sync();
  el.addEventListener("click", onClick);
  document.addEventListener("fullscreenchange", sync);
  cleanup(() => {
    el.removeEventListener("click", onClick);
    document.removeEventListener("fullscreenchange", sync);
  });
});
defineDirective("download", ({ el, expression, cleanup }) => {
  makeInteractive(el, cleanup);
  const onClick = (event) => {
    const href = expression.trim() || el.getAttribute("href") || "";
    if (!href) return;
    event.preventDefault();
    const link = document.createElement("a");
    link.href = href;
    link.rel = "noopener";
    link.download = readOption(el, "download-name") || "";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    dispatch2(el, "voodoo:download", { href, name: link.download });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
});
defineOption("download-name");
defineDirective("resizable", ({ el, expression, cleanup }) => {
  ensureUi();
  const mode = (expression.trim() || "both").toLowerCase();
  const horizontal = mode === "both" || mode === "horizontal";
  const vertical = mode === "both" || mode === "vertical";
  el.classList.add("v-resizable");
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  const handles = [];
  const directions = [];
  if (horizontal) directions.push("right");
  if (vertical) directions.push("bottom");
  if (horizontal && vertical) directions.push("corner");
  const startResize = (handle, direction) => {
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    const onMove = (event) => {
      if (direction !== "bottom") el.style.width = `${Math.max(32, startWidth + event.clientX - startX)}px`;
      if (direction !== "right") el.style.height = `${Math.max(32, startHeight + event.clientY - startY)}px`;
    };
    const onUp = (event) => {
      handle.releasePointerCapture?.(event.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      dispatch2(el, "voodoo:resized", {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      });
    };
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      handle.setPointerCapture?.(event.pointerId);
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });
    handle.addEventListener("keydown", (event) => {
      const step2 = event.shiftKey ? 4 : 16;
      const rect = el.getBoundingClientRect();
      let handled = true;
      if (event.key === "ArrowRight" && direction !== "bottom") el.style.width = `${rect.width + step2}px`;
      else if (event.key === "ArrowLeft" && direction !== "bottom") el.style.width = `${Math.max(32, rect.width - step2)}px`;
      else if (event.key === "ArrowDown" && direction !== "right") el.style.height = `${rect.height + step2}px`;
      else if (event.key === "ArrowUp" && direction !== "right") el.style.height = `${Math.max(32, rect.height - step2)}px`;
      else handled = false;
      if (!handled) return;
      event.preventDefault();
      dispatch2(el, "voodoo:resized", {
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height
      });
    });
  };
  for (const direction of directions) {
    const handle = document.createElement("div");
    handle.className = "v-resize-handle";
    handle.setAttribute("data-dir", direction);
    handle.setAttribute("role", "separator");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute(
      "aria-orientation",
      direction === "bottom" ? "horizontal" : "vertical"
    );
    handle.setAttribute("aria-label", "Resize");
    startResize(handle, direction);
    el.appendChild(handle);
    handles.push(handle);
  }
  cleanup(() => {
    for (const handle of handles) handle.remove();
  });
});
function normalizeSearch(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function collectCommands() {
  const out = [];
  for (const item of queryDirective(document, "command-item")) {
    const label = (attrOf(item, "command-item") || item.textContent || "").trim();
    if (!label) continue;
    if (item.closest("[hidden]")) continue;
    out.push({ label, hint: readOption(item, "command-hint") || "", el: item });
  }
  return out;
}
function commandPalette() {
  ensureUi();
  if (document.querySelector(".v-command")) return;
  const commands = collectCommands();
  const lastFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "v-command";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Command palette");
  overlay.tabIndex = -1;
  const box = document.createElement("div");
  box.className = "v-command-box";
  const input = document.createElement("input");
  input.className = "v-command-input";
  input.type = "search";
  input.placeholder = "Search command...";
  input.setAttribute("aria-label", "Search command");
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "true");
  input.setAttribute("autocomplete", "off");
  const list = document.createElement("ul");
  list.className = "v-command-list";
  list.id = uid("v-cmd-list-");
  list.setAttribute("role", "listbox");
  input.setAttribute("aria-controls", list.id);
  box.append(input, list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  lockScroll();
  let visible = commands;
  let cursor = 0;
  const keepFocusTrapped = (event) => {
    const target = event.target;
    if (!target || overlay.contains(target)) return;
    input.focus();
  };
  const close = () => {
    document.removeEventListener("focusin", keepFocusTrapped, true);
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
    unlockScroll();
    lastFocus?.focus();
  };
  const execute = () => {
    const option = visible[cursor];
    if (!option) return;
    close();
    option.el.click();
  };
  const render2 = () => {
    list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("li");
      empty.className = "v-command-empty";
      empty.textContent = "No command found";
      list.appendChild(empty);
      return;
    }
    visible.forEach((option, index) => {
      const row = document.createElement("li");
      row.className = "v-command-option";
      row.id = `${list.id}-${index}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === cursor));
      const label = document.createElement("span");
      label.textContent = option.label;
      row.appendChild(label);
      if (option.hint) {
        const hint = document.createElement("span");
        hint.className = "v-command-hint";
        hint.textContent = option.hint;
        row.appendChild(hint);
      }
      row.addEventListener("click", () => {
        cursor = index;
        execute();
      });
      row.addEventListener("pointermove", () => {
        if (cursor === index) return;
        cursor = index;
        render2();
      });
      list.appendChild(row);
    });
    const active = list.children[cursor];
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView?.({ block: "nearest" });
    }
  };
  const filter = () => {
    const term = normalizeSearch(input.value.trim());
    visible = term ? commands.filter((option) => normalizeSearch(`${option.label} ${option.hint}`).includes(term)) : commands;
    cursor = 0;
    render2();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      cursor = visible.length ? (cursor + 1) % visible.length : 0;
      render2();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      cursor = visible.length ? (cursor - 1 + visible.length) % visible.length : 0;
      render2();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      execute();
      return;
    }
    if (event.key === "Tab") trapTab(overlay, event);
  };
  overlay.addEventListener("pointerdown", (event) => {
    if (event.target === overlay) close();
  });
  input.addEventListener("input", filter);
  document.addEventListener("keydown", onKeyDown, true);
  render2();
  input.focus();
  document.addEventListener("focusin", keepFocusTrapped, true);
}
defineDirective("command", ({ el, expression, cleanup }) => {
  ensureUi();
  const combo = expression.trim() || readOption(el, "command-key") || "mod+k";
  const onClick = (event) => {
    event.preventDefault();
    commandPalette();
  };
  const off2 = hotkey(combo, () => commandPalette(), { allowInInput: true });
  const parsed = parseCombo(combo.split(",")[0]);
  if (parsed && !el.hasAttribute("aria-keyshortcuts")) {
    el.setAttribute("aria-keyshortcuts", ariaShortcut(parsed));
  }
  makeInteractive(el, cleanup);
  el.addEventListener("click", onClick);
  cleanup(() => {
    off2();
    el.removeEventListener("click", onClick);
  });
});
defineDirective("command-item", ({ el, expression }) => {
  storeOption(el, "command-item", expression);
  if (!el.hasAttribute("data-v-command-label") && expression.trim()) {
    el.setAttribute("data-v-command-label", expression.trim());
  }
});
defineOption("command-key");
defineOption("command-hint");
var IDLE_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
defineDirective("idle", ({ el, expression, scope, cleanup }) => {
  const after = parseDuration(readOption(el, "idle-after"), 6e4);
  let timer = null;
  let fired = false;
  const trigger2 = () => {
    fired = true;
    callExpression(expression, scope, el, void 0, { idle: true, after });
    dispatch2(el, "voodoo:idle", { after });
  };
  const reset = () => {
    if (timer) clearTimeout(timer);
    fired = false;
    timer = setTimeout(trigger2, after);
  };
  const onActivity = () => {
    if (fired) {
      reset();
      return;
    }
    reset();
  };
  for (const type of IDLE_EVENTS) {
    window.addEventListener(type, onActivity, { passive: true });
  }
  reset();
  cleanup(() => {
    if (timer) clearTimeout(timer);
    for (const type of IDLE_EVENTS) window.removeEventListener(type, onActivity);
  });
});
defineOption("idle-after");
function setupConnection(el, expression, scope, cleanup, wanted, immediate) {
  const handler = (event) => {
    callExpression(expression, scope, el, event, { online: navigator.onLine });
    dispatch2(el, `voodoo:${wanted}`, { online: navigator.onLine });
  };
  window.addEventListener(wanted, handler);
  cleanup(() => window.removeEventListener(wanted, handler));
  if (immediate && navigator.onLine === (wanted === "online")) queuePostFlush(() => handler());
}
defineDirective("online", ({ el, expression, scope, modifiers, cleanup }) => {
  setupConnection(el, expression, scope, cleanup, "online", !!modifiers.immediate);
});
defineDirective("offline", ({ el, expression, scope, modifiers, cleanup }) => {
  setupConnection(el, expression, scope, cleanup, "offline", modifiers["no-immediate"] !== true);
});

// src/directives/forms.ts
init_reactivity();
init_registry();
init_style();

// src/forms/validate.ts
init_reactivity();
init_registry();
init_style();
var messages = {
  required: "Please fill in this field.",
  email: "Enter a valid email address.",
  url: "Enter a valid URL.",
  number: "Enter a valid number.",
  integer: "Enter a whole number.",
  decimal: "Enter a valid decimal number.",
  alpha: "Use letters only.",
  alphanumeric: "Use letters and numbers only.",
  minlength: "Use at least {param} characters.",
  maxlength: "Use at most {param} characters.",
  min: "The smallest allowed value is {param}.",
  max: "The largest allowed value is {param}.",
  between: "Enter a value between {min} and {max}.",
  match: "The fields do not match.",
  regex: "That format is not valid.",
  date: "Enter a valid date.",
  after: "The date has to be later than {param}.",
  before: "The date has to be earlier than {param}.",
  accepted: "You have to tick this to continue.",
  same: "The values have to be the same.",
  different: "The values have to be different.",
  in: "Choose one of the allowed options.",
  notin: "That value is not allowed.",
  phone: "Enter a valid phone number, including the area code.",
  cpf: "Invalid CPF.",
  cnpj: "Invalid CNPJ.",
  cep: "Invalid postcode.",
  creditcard: "Invalid card number.",
  strongpassword: "Use {param} characters or more, with an upper case letter, a lower case letter, a number and a symbol.",
  unique: "That value is already taken.",
  invalid: "Invalid value."
};
function formatMessage(template, data2) {
  const param = data2.param ?? "";
  const parts = param.split(",");
  const replacements = {
    param,
    field: data2.field ?? "field",
    value: data2.value ?? "",
    min: (parts[0] ?? "").trim(),
    max: (parts[1] ?? parts[0] ?? "").trim()
  };
  return template.replace(
    /\{(\w+)\}/g,
    (whole, key) => key in replacements ? replacements[key] : whole
  );
}
var rules = /* @__PURE__ */ new Map();
function validator(name, fn, defaultMessage) {
  const key = name.toLowerCase();
  rules.set(key, { name: key, fn, message: defaultMessage });
  if (defaultMessage && !messages[key]) messages[key] = defaultMessage;
  defineDirective(`validate-${key}`, ({ el, cleanup }) => {
    bindFieldValidation(el, cleanup);
  });
}
function readDirectiveAttr(el, name) {
  return readAttr(el, `${config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function hasDirectiveAttr(el, name) {
  return readDirectiveAttr(el, name) !== null;
}
var FIELD_TAGS = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
var IGNORED_TYPES = /* @__PURE__ */ new Set(["submit", "button", "reset", "image"]);
function isFormField(el) {
  return !!el && typeof el === "object" && FIELD_TAGS.has(el.tagName ?? "");
}
function fieldType(el) {
  if (el.tagName === "SELECT") return "select";
  if (el.tagName === "TEXTAREA") return "textarea";
  return (el.getAttribute("type") || "text").toLowerCase();
}
function fieldValue(el) {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") {
    return el.checked ? el.value || "on" : "";
  }
  if (type === "file") {
    const files = el.files;
    return files && files.length ? String(files.length) : "";
  }
  return el.value ?? "";
}
function fieldKey(el) {
  return el.name || el.id || `field-${el.tagName.toLowerCase()}`;
}
function fieldLabel(el) {
  const custom = readDirectiveAttr(el, "label");
  if (custom) return custom;
  if (el.id && typeof document !== "undefined") {
    const label = document.querySelector(`label[for="${cssEscape(el.id)}"]`);
    const text = label?.textContent?.trim();
    if (text) return text.replace(/\s*\*$/, "");
  }
  const wrapper = el.closest("label");
  const wrapperText = wrapper?.textContent?.trim();
  if (wrapperText) return wrapperText.replace(/\s*\*$/, "");
  return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || "field";
}
function cssEscape(value) {
  const api = globalThis.CSS;
  if (api && typeof api.escape === "function") return api.escape(value);
  return value.replace(/["'\\\]\[]/g, "\\$&");
}
function findRelatedField(el, reference) {
  const ref2 = reference.trim();
  if (!ref2 || typeof document === "undefined") return null;
  const root = el.form ?? el.closest("form") ?? document;
  if (/^[#.[]/.test(ref2)) {
    const found = root.querySelector(ref2) ?? document.querySelector(ref2);
    return isFormField(found) ? found : null;
  }
  const byName = root.querySelector(`[name="${cssEscape(ref2)}"]`);
  if (isFormField(byName)) return byName;
  const byId = document.getElementById(ref2);
  return isFormField(byId) ? byId : null;
}
var RE_EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
var RE_INTEGER = /^-?\d+$/;
var RE_DECIMAL = /^-?\d+(?:[.,]\d+)?$/;
var RE_ALPHA = /^[A-Za-zÀ-ÖØ-öø-ɏ]+$/;
var RE_ALPHANUM = /^[A-Za-z0-9À-ÖØ-öø-ɏ]+$/;
function digitsOf(value) {
  return value.replace(/\D/g, "");
}
function toNumber(value) {
  return Number(String(value).replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
}
function isValidCPF(value) {
  const digits = digitsOf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let first = sum * 10 % 11;
  if (first === 10) first = 0;
  if (first !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  let second = sum * 10 % 11;
  if (second === 10) second = 0;
  return second === Number(digits[10]);
}
function isValidCNPJ(value) {
  const digits = digitsOf(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const check = (length) => {
    let position = length - 7;
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * position--;
      if (position < 2) position = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}
function isValidLuhn(value) {
  const digits = digitsOf(value);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let current2 = Number(digits[i]);
    if (double) {
      current2 *= 2;
      if (current2 > 9) current2 -= 9;
    }
    sum += current2;
    double = !double;
  }
  return sum % 10 === 0;
}
function isValidPhoneBR(value) {
  const digits = digitsOf(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (Number(digits.slice(0, 2)) < 11) return false;
  if (digits.length === 11 && digits[2] !== "9") return false;
  if (digits.length === 10 && Number(digits[2]) < 2) return false;
  return true;
}
function parseDateValue(value) {
  const text = value.trim();
  if (!text) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const ok = date.getFullYear() === Number(br[3]) && date.getMonth() === Number(br[2]) - 1;
    return ok && date.getDate() === Number(br[1]) ? date : null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const ok = date.getFullYear() === Number(iso[1]) && date.getMonth() === Number(iso[2]) - 1;
    return ok && date.getDate() === Number(iso[3]) ? date : null;
  }
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : new Date(time);
}
function referenceDate(param, el) {
  if (!param) return null;
  const key = param.trim().toLowerCase();
  if (key === "hoje" || key === "today" || key === "now" || key === "agora") return /* @__PURE__ */ new Date();
  const direct = parseDateValue(param);
  if (direct) return direct;
  const other = findRelatedField(el, param);
  return other ? parseDateValue(fieldValue(other)) : null;
}
validator("required", (value, _param, el) => {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") return el.checked;
  if (type === "file") {
    const files = el.files;
    return !!files && files.length > 0;
  }
  return value.trim().length > 0;
});
validator("email", (value) => RE_EMAIL.test(value.trim()));
validator("url", (value) => {
  const text = value.trim();
  if (!text) return false;
  try {
    const url2 = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
    return url2.hostname.includes(".") && !url2.hostname.endsWith(".");
  } catch {
    return false;
  }
});
validator("number", (value) => value.trim() !== "" && Number.isFinite(toNumber(value)));
validator("integer", (value) => RE_INTEGER.test(value.trim()));
validator("decimal", (value, param) => {
  const text = value.trim();
  if (!RE_DECIMAL.test(text)) return false;
  if (!param) return true;
  const places = Number(param);
  if (!Number.isFinite(places)) return true;
  const fraction = text.split(/[.,]/)[1] ?? "";
  return fraction.length <= places;
});
validator("alpha", (value) => RE_ALPHA.test(value.trim().replace(/\s+/g, "")));
validator("alphanumeric", (value) => RE_ALPHANUM.test(value.trim().replace(/\s+/g, "")));
validator("minlength", (value, param) => value.trim().length >= Number(param ?? 0));
validator("maxlength", (value, param) => value.trim().length <= Number(param ?? Infinity));
validator("min", (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith("date")) {
    const current2 = parseDateValue(value);
    return !current2 || current2.getTime() >= limit.getTime();
  }
  return toNumber(value) >= Number(param ?? 0);
});
validator("max", (value, param, el) => {
  const limit = referenceDate(param, el);
  if (limit && fieldType(el).startsWith("date")) {
    const current2 = parseDateValue(value);
    return !current2 || current2.getTime() <= limit.getTime();
  }
  return toNumber(value) <= Number(param ?? Infinity);
});
validator("between", (value, param) => {
  const [min, max] = (param ?? "").split(",").map((part) => Number(part.trim()));
  const current2 = toNumber(value);
  return Number.isFinite(current2) && current2 >= min && current2 <= max;
});
validator("match", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  if (!other) return true;
  return fieldValue(other) === value;
});
validator("same", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) === value;
});
validator("different", (value, param, el) => {
  if (!param) return true;
  const other = findRelatedField(el, param);
  return !other || fieldValue(other) !== value;
});
validator("regex", (value, param, el) => {
  if (!param) return true;
  const flags = readDirectiveAttr(el, "regex-flags") ?? "";
  try {
    return new RegExp(param, flags).test(value);
  } catch {
    warn(`Invalid regular expression in ${config.prefix}regex: ${param}`);
    return true;
  }
});
validator("date", (value) => parseDateValue(value) !== null);
validator("after", (value, param, el) => {
  const limit = referenceDate(param, el);
  const current2 = parseDateValue(value);
  if (!limit || !current2) return true;
  return current2.getTime() > limit.getTime();
});
validator("before", (value, param, el) => {
  const limit = referenceDate(param, el);
  const current2 = parseDateValue(value);
  if (!limit || !current2) return true;
  return current2.getTime() < limit.getTime();
});
validator("accepted", (value, _param, el) => {
  const type = fieldType(el);
  if (type === "checkbox" || type === "radio") return el.checked;
  return ["1", "true", "on", "yes", "sim"].includes(value.trim().toLowerCase());
});
validator(
  "in",
  (value, param) => (param ?? "").split(",").map((part) => part.trim()).includes(value.trim())
);
validator(
  "notin",
  (value, param) => !(param ?? "").split(",").map((part) => part.trim()).includes(value.trim())
);
validator("phone", (value) => isValidPhoneBR(value));
validator("cpf", (value) => isValidCPF(value));
validator("cnpj", (value) => isValidCNPJ(value));
validator("cep", (value) => digitsOf(value).length === 8);
validator("creditcard", (value) => isValidLuhn(value));
validator("strongpassword", (value, param) => {
  const min = Number(param) > 0 ? Number(param) : 8;
  const strong = value.length >= min && /[a-zà-ÿ]/.test(value) && /[A-ZÀ-ß]/.test(value) && /\d/.test(value) && /[^\w\s]/.test(value);
  return strong ? true : formatMessage(messages.strongpassword, { param: String(min) });
});
validator("unique", async (value, param, el) => {
  const url2 = param || readDirectiveAttr(el, "unique-url") || "";
  if (!url2 || !value.trim()) return true;
  try {
    const data2 = await http.get(url2, {
      params: { value, field: fieldKey(el) },
      timeout: 8e3
    });
    if (data2 && typeof data2 === "object" && "available" in data2) {
      return data2.available === true ? true : messages.unique;
    }
    return data2 ? messages.unique : true;
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 404) return true;
      if (err.status >= 400 && err.status < 500) return messages.unique;
    }
    return true;
  }
});
var RULE_ALIASES = {
  "strong-password": "strongpassword",
  "credit-card": "creditcard",
  "min-length": "minlength",
  "max-length": "maxlength",
  "not-in": "notin",
  "nao-vazio": "required",
  obrigatorio: "required"
};
var RUN_WHEN_EMPTY = /* @__PURE__ */ new Set(["required", "accepted"]);
function ruleNameFromAttribute(attrName) {
  let body = null;
  if (attrName.startsWith(config.prefix)) body = attrName.slice(config.prefix.length);
  else if (attrName.startsWith("data-v-")) body = attrName.slice(7);
  if (!body) return null;
  const dot = body.indexOf(".");
  if (dot > -1) body = body.slice(0, dot);
  if (body === "validate") return null;
  if (body.startsWith("validate-")) body = body.slice("validate-".length);
  const name = RULE_ALIASES[body] ?? body;
  return rules.has(name) ? name : null;
}
function fieldRules(el) {
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (name, param) => {
    if (seen.has(name) || !rules.has(name)) return;
    seen.add(name);
    found.push({ name, param });
  };
  for (const [attrName, attrValue] of originalAttributes(el)) {
    const name = ruleNameFromAttribute(attrName);
    if (!name) continue;
    if (attrValue.trim() === "false") {
      seen.add(name);
      continue;
    }
    push(name, attrValue);
  }
  const type = fieldType(el);
  if (el.hasAttribute("required")) push("required", "");
  if (type === "email") push("email", "");
  if (type === "url") push("url", "");
  if (type === "number" || type === "range") push("number", "");
  const minlength = el.getAttribute("minlength");
  if (minlength) push("minlength", minlength);
  const maxlength = el.getAttribute("maxlength");
  if (maxlength) push("maxlength", maxlength);
  const min = el.getAttribute("min");
  if (min) push("min", min);
  const max = el.getAttribute("max");
  if (max) push("max", max);
  const pattern = el.getAttribute("pattern");
  if (pattern) push("regex", pattern);
  found.sort((a, b) => a.name === "required" ? -1 : b.name === "required" ? 1 : 0);
  return found;
}
var CSS2 = `
.v-field-error{display:block;margin-top:6px;color:var(--v-danger,#FF4D4D);
  font:500 12.5px/1.45 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  animation:v-field-error-in .18s var(--v-ease,ease) both}
@keyframes v-field-error-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.v-invalid{border-color:var(--v-danger,#FF4D4D) !important}
.v-invalid:focus,.v-invalid:focus-visible{outline-color:var(--v-danger,#FF4D4D);
  box-shadow:0 0 0 3px color-mix(in srgb,var(--v-danger,#FF4D4D) 22%,transparent)}
.v-valid{border-color:var(--v-success,#2ED9A5)}
.v-form-error{margin:0 0 14px;padding:10px 14px;border-radius:var(--v-radius-sm,8px);
  background:color-mix(in srgb,var(--v-danger,#FF4D4D) 12%,var(--v-surface,#fff));
  border:1px solid var(--v-danger,#FF4D4D);color:var(--v-text,#14111F);
  font:500 13px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-form-error ul{margin:0;padding-left:18px}
@media (prefers-reduced-motion: reduce){.v-field-error{animation:none}}
`;
function ensureStyles() {
  ensureTokens();
  injectStyle("forms-validate", CSS2);
}
function errorHost(el) {
  const selector = readDirectiveAttr(el, "error-target");
  if (selector && typeof document !== "undefined") {
    const host = (el.form ?? el.closest("form"))?.querySelector(selector) ?? document.querySelector(selector);
    if (host) return { parent: host, anchor: null };
    warn(`Target for ${config.prefix}error-target not found: ${selector}`);
  }
  const parent = el.parentElement;
  return parent ? { parent, anchor: el } : null;
}
function findErrorElement(el) {
  const host = errorHost(el);
  if (!host) return null;
  if (host.anchor) {
    const next = host.anchor.nextElementSibling;
    return next && next.classList.contains("v-field-error") ? next : null;
  }
  return host.parent.querySelector(".v-field-error");
}
function showFieldError(el, message) {
  ensureStyles();
  el.classList.add("v-invalid");
  el.classList.remove("v-valid");
  el.setAttribute("aria-invalid", "true");
  let span = findErrorElement(el);
  if (!span) {
    const host = errorHost(el);
    if (!host) return;
    span = document.createElement("span");
    span.className = "v-field-error";
    span.id = el.id ? `${el.id}-error` : uid("v-error-");
    span.setAttribute("role", "alert");
    span.setAttribute("aria-live", "polite");
    if (host.anchor) host.anchor.insertAdjacentElement("afterend", span);
    else host.parent.appendChild(span);
  }
  span.textContent = message;
  const describedBy = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== span.id);
  describedBy.push(span.id);
  el.setAttribute("aria-describedby", describedBy.join(" "));
}
function clearFieldError(el, markValid = false) {
  el.classList.remove("v-invalid");
  el.classList.toggle("v-valid", markValid);
  el.removeAttribute("aria-invalid");
  const span = findErrorElement(el);
  if (span) {
    const remaining = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== span.id);
    if (remaining.length) el.setAttribute("aria-describedby", remaining.join(" "));
    else el.removeAttribute("aria-describedby");
    span.remove();
  }
}
function clearErrors(form) {
  for (const field of collectFields(form, false)) clearFieldError(field);
  for (const leftover of Array.from(form.querySelectorAll(".v-field-error"))) leftover.remove();
  const summary = form.querySelector(".v-form-error");
  if (summary) summary.remove();
  for (const marked of Array.from(form.querySelectorAll(".v-invalid, .v-valid"))) {
    marked.classList.remove("v-invalid", "v-valid");
    marked.removeAttribute("aria-invalid");
  }
}
function normalizeErrors(payload) {
  const out = {};
  if (!payload || typeof payload !== "object") return out;
  const source = payload;
  const bag = source.errors && typeof source.errors === "object" ? source.errors : source;
  for (const [key, value] of Object.entries(bag)) {
    if (key === "message" || key === "mensagem" || key === "errors") continue;
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") out[key] = value[0];
  }
  return out;
}
function findFieldByName(form, key) {
  const bracket = key.replace(/\.(\w+)/g, "[$1]");
  const candidates = [key, bracket, `${key}[]`, `${bracket}[]`];
  for (const candidate of candidates) {
    const found = form.querySelector(`[name="${cssEscape(candidate)}"]`);
    if (isFormField(found)) return found;
  }
  const byId = form.querySelector(`#${cssEscape(key)}`);
  return isFormField(byId) ? byId : null;
}
function showFormErrors(form, errors) {
  const normalized = normalizeErrors(errors);
  const orphans = [];
  for (const [key, message] of Object.entries(normalized)) {
    const field = findFieldByName(form, key);
    if (field) showFieldError(field, message);
    else orphans.push(message);
  }
  if (orphans.length) showFormSummary(form, orphans);
  return normalized;
}
function showFormSummary(form, list) {
  ensureStyles();
  let box = form.querySelector(".v-form-error");
  if (!box) {
    box = document.createElement("div");
    box.className = "v-form-error";
    box.setAttribute("role", "alert");
    form.prepend(box);
  }
  box.textContent = "";
  if (list.length === 1) {
    box.textContent = list[0];
    return;
  }
  const ul = document.createElement("ul");
  for (const message of list) {
    const li = document.createElement("li");
    li.textContent = message;
    ul.appendChild(li);
  }
  box.appendChild(ul);
}
function focusFirstError(form) {
  const field = form.querySelector(".v-invalid");
  if (!field) return false;
  try {
    field.focus({ preventScroll: true });
  } catch {
    field.focus();
  }
  const reduced = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof field.scrollIntoView === "function") {
    field.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }
  return true;
}
function collectFields(form, onlyWithRules = true) {
  const source = form.tagName === "FORM" ? Array.from(form.elements) : Array.from(form.querySelectorAll("input, select, textarea"));
  const out = [];
  for (const element of source) {
    if (!isFormField(element)) continue;
    if (element.disabled) continue;
    if (IGNORED_TYPES.has(fieldType(element))) continue;
    if (onlyWithRules && fieldRules(element).length === 0) continue;
    out.push(element);
  }
  return out;
}
async function validateField(el, options = {}) {
  if (!isFormField(el)) return { valid: true };
  const list = fieldRules(el);
  if (!list.length) {
    if (!options.silent) clearFieldError(el);
    return { valid: true };
  }
  const value = fieldValue(el);
  const custom = readDirectiveAttr(el, "error-message");
  const empty = value.trim() === "";
  for (const rule of list) {
    if (empty && !RUN_WHEN_EMPTY.has(rule.name)) continue;
    const definition = rules.get(rule.name);
    if (!definition) continue;
    let outcome;
    try {
      outcome = await definition.fn(value, rule.param || void 0, el);
    } catch (err) {
      warn(`Rule "${rule.name}" failed to execute`, err);
      continue;
    }
    if (outcome === true) continue;
    const template = custom ?? (typeof outcome === "string" ? outcome : messages[rule.name] ?? definition.message ?? messages.invalid);
    const message = formatMessage(template, {
      field: fieldLabel(el),
      param: rule.param,
      value
    });
    if (!options.silent) {
      showFieldError(el, message);
      emitFieldResult(el, { valid: false, message, rule: rule.name });
    }
    return { valid: false, message, rule: rule.name };
  }
  if (!options.silent) {
    clearFieldError(el, !empty);
    emitFieldResult(el, { valid: true });
  }
  return { valid: true };
}
function validate(target) {
  if (isFormField(target)) return validateField(target);
  return validateForm(target);
}
async function validateForm(form) {
  const fields = collectFields(form);
  const results = await Promise.all(fields.map((field) => validateField(field)));
  const errors = {};
  fields.forEach((field, index) => {
    const result = results[index];
    if (!result.valid) errors[fieldKey(field)] = result.message ?? messages.invalid;
  });
  return { valid: Object.keys(errors).length === 0, errors };
}
function emitFieldResult(el, result) {
  el.dispatchEvent(
    new CustomEvent("voodoo:field-validated", {
      bubbles: true,
      detail: { field: fieldKey(el), ...result }
    })
  );
}
function parseFieldName(name) {
  const start2 = name.indexOf("[");
  if (start2 === -1) return [name];
  const keys = [name.slice(0, start2)];
  const re = /\[([^\]]*)\]/g;
  let match;
  while ((match = re.exec(name)) !== null) keys.push(match[1]);
  return keys;
}
function assignPath(target, keys, value) {
  let node = target;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const last = i === keys.length - 1;
    const next = keys[i + 1];
    if (key === "") {
      if (!Array.isArray(node)) return;
      if (last) {
        node.push(value);
        return;
      }
      const container2 = next === "" ? [] : {};
      node.push(container2);
      node = container2;
      continue;
    }
    if (Array.isArray(node)) {
      const index = Number(key);
      if (!Number.isInteger(index)) return;
      if (last) {
        node[index] = value;
        return;
      }
      let child2 = node[index];
      if (child2 == null || typeof child2 !== "object") {
        child2 = next === "" || /^\d+$/.test(next ?? "") ? [] : {};
        node[index] = child2;
      }
      node = child2;
      continue;
    }
    if (last) {
      node[key] = value;
      return;
    }
    let child = node[key];
    if (child == null || typeof child !== "object") {
      child = next === "" || /^\d+$/.test(next ?? "") ? [] : {};
      node[key] = child;
    }
    node = child;
  }
}
function collectEntries(form, options) {
  const fields = collectFields(form, false);
  const entries = [];
  const checkboxCount = /* @__PURE__ */ new Map();
  for (const field of fields) {
    if (fieldType(field) === "checkbox" && field.name) {
      checkboxCount.set(field.name, (checkboxCount.get(field.name) ?? 0) + 1);
    }
  }
  const trim = options.trim !== false;
  const numbers2 = options.numbers !== false;
  for (const field of fields) {
    if (!field.name) continue;
    if (field.disabled && !options.includeDisabled) continue;
    const type = fieldType(field);
    if (type === "file") {
      const files = Array.from(field.files ?? []);
      if (!files.length) continue;
      const multiple = field.multiple || field.name.endsWith("[]");
      entries.push({ name: field.name, value: multiple ? files : files[0] });
      continue;
    }
    if (type === "checkbox") {
      const many = (checkboxCount.get(field.name) ?? 1) > 1 || field.name.endsWith("[]");
      if (many) {
        if (!field.checked) continue;
        const name = field.name.endsWith("[]") ? field.name : `${field.name}[]`;
        entries.push({ name, value: field.value || "on" });
      } else {
        entries.push({ name: field.name, value: field.checked });
      }
      continue;
    }
    if (type === "radio") {
      if (!field.checked) continue;
      entries.push({ name: field.name, value: field.value });
      continue;
    }
    if (field.tagName === "SELECT" && field.multiple) {
      const selected = Array.from(field.selectedOptions).map(
        (option) => option.value
      );
      const name = field.name.endsWith("[]") ? field.name : `${field.name}[]`;
      for (const value2 of selected) entries.push({ name, value: value2 });
      continue;
    }
    let value = field.value ?? "";
    if (trim && typeof value === "string") value = value.trim();
    if (numbers2 && (type === "number" || type === "range") && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) value = parsed;
    }
    entries.push({ name: field.name, value });
  }
  return entries;
}
function hasSelectedFile(form) {
  for (const field of collectFields(form, false)) {
    if (fieldType(field) !== "file") continue;
    const files = field.files;
    if (files && files.length) return true;
  }
  return false;
}
function appendToFormData(data2, name, value) {
  if (value instanceof File || typeof Blob !== "undefined" && value instanceof Blob) {
    data2.append(name, value);
    return;
  }
  if (Array.isArray(value)) {
    const listName = name.endsWith("[]") ? name : `${name}[]`;
    for (const item of value) appendToFormData(data2, listName, item);
    return;
  }
  if (typeof value === "boolean") {
    data2.append(name, value ? "1" : "0");
    return;
  }
  data2.append(name, value == null ? "" : String(value));
}
function serializeForm(form, options = {}) {
  const entries = collectEntries(form, options);
  if (options.formData || hasSelectedFile(form)) {
    const data2 = new FormData();
    for (const entry of entries) appendToFormData(data2, entry.name, entry.value);
    return data2;
  }
  const out = {};
  for (const entry of entries) assignPath(out, parseFieldName(entry.name), entry.value);
  return out;
}
var boundFields = /* @__PURE__ */ new WeakSet();
var erroredFields = /* @__PURE__ */ new WeakSet();
async function runFieldValidation(el) {
  const result = await validateField(el);
  if (result.valid) erroredFields.delete(el);
  else erroredFields.add(el);
}
function bindFieldValidation(el, cleanup) {
  if (!isFormField(el)) {
    warn(`${config.prefix}validate only works on input, select, or textarea.`);
    return;
  }
  if (boundFields.has(el)) return;
  boundFields.add(el);
  ensureStyles();
  const onBlur = () => {
    void runFieldValidation(el);
  };
  const onInput = () => {
    if (!erroredFields.has(el)) return;
    void runFieldValidation(el);
  };
  el.addEventListener("blur", onBlur);
  el.addEventListener("input", onInput);
  el.addEventListener("change", onBlur);
  cleanup(() => {
    boundFields.delete(el);
    erroredFields.delete(el);
    el.removeEventListener("blur", onBlur);
    el.removeEventListener("input", onInput);
    el.removeEventListener("change", onBlur);
  });
}
var validatedForms = /* @__PURE__ */ new WeakSet();
function isValidatedForm(form) {
  return validatedForms.has(form) || hasDirectiveAttr(form, "validate");
}
function setupFormValidation(form, cleanup) {
  validatedForms.add(form);
  ensureStyles();
  if (form.tagName === "FORM") form.noValidate = true;
  const onFocusOut = (event) => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (fieldRules(target).length === 0) return;
    void runFieldValidation(target);
  };
  const onInput = (event) => {
    const target = event.target;
    if (!isFormField(target) || boundFields.has(target)) return;
    if (!erroredFields.has(target)) return;
    void runFieldValidation(target);
  };
  form.addEventListener("focusout", onFocusOut);
  form.addEventListener("input", onInput);
  form.addEventListener("change", onFocusOut);
  cleanup(() => {
    validatedForms.delete(form);
    form.removeEventListener("focusout", onFocusOut);
    form.removeEventListener("input", onInput);
    form.removeEventListener("change", onFocusOut);
  });
}
defineDirective("validate", ({ el, cleanup }) => {
  if (el.tagName === "FORM" || el.hasAttribute(`${config.prefix}submit`)) {
    setupFormValidation(el, cleanup);
    return;
  }
  bindFieldValidation(el, cleanup);
});
var FIELD_DIRECTIVES = [
  "required",
  "email",
  "url",
  "number",
  "integer",
  "minlength",
  "maxlength",
  "min",
  "max",
  "match",
  "regex",
  "cpf",
  "cnpj",
  "cep",
  "phone",
  "date",
  "accepted",
  "strong-password"
];
for (const name of FIELD_DIRECTIVES) {
  defineDirective(name, ({ el, cleanup }) => {
    bindFieldValidation(el, cleanup);
  });
}
for (const name of ["error-message", "error-target", "regex-flags", "unique-url"]) {
  defineDirective(name, ({ el, cleanup }) => {
    if (!isFormField(el)) return;
    bindFieldValidation(el, cleanup);
  });
}

// src/directives/forms.ts
function createState() {
  return reactive({
    loading: false,
    saving: false,
    success: false,
    errors: {},
    message: "",
    data: null,
    status: 0,
    dirty: false,
    progress: 0
  });
}
var formStates = /* @__PURE__ */ new WeakMap();
var scopeStates = /* @__PURE__ */ new WeakMap();
var neutralState = createState();
function ensureFormState(host) {
  let state = formStates.get(host);
  if (!state) {
    state = createState();
    formStates.set(host, state);
  }
  return state;
}
function resolveFormState(scope) {
  let current2 = scope;
  while (current2) {
    const direct = scopeStates.get(current2);
    if (direct) return direct;
    const el = current2.el;
    if (el) {
      const owner = el.closest("form");
      const found = owner ? formStates.get(owner) : void 0;
      if (found) return found;
      const inner = el.querySelector("form");
      const nested = inner ? formStates.get(inner) : void 0;
      if (nested) return nested;
    }
    current2 = current2.parent;
  }
  if (typeof document !== "undefined") {
    for (const form of Array.from(document.forms)) {
      const found = formStates.get(form);
      if (found) return found;
    }
  }
  return neutralState;
}
magic("$form", (scope) => resolveFormState(scope));
var declaredOptions = /* @__PURE__ */ new WeakMap();
var REQUEST_DIRECTIVES = [
  "submit",
  "upload",
  "dropzone",
  "autosave",
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "load",
  "load-visible",
  "search",
  "resource"
];
function isRequestHost(el) {
  return REQUEST_DIRECTIVES.some(
    (name) => hasAttr(el, `${config.prefix}${name}`) || hasAttr(el, `data-v-${name}`)
  );
}
function readOption2(el, name) {
  const own = readDirectiveAttr(el, name);
  if (own !== null) return own;
  const owner = el.closest("form");
  if (owner && owner !== el) {
    const inherited = readDirectiveAttr(owner, name);
    if (inherited !== null) return inherited;
  }
  const cached = declaredOptions.get(el)?.[name] ?? (owner ? declaredOptions.get(owner)?.[name] : void 0);
  return cached ?? null;
}
function hasOption(el, name) {
  return readOption2(el, name) !== null;
}
function defineFormOption(name, validate2) {
  defineDirective(name, ({ el, expression }) => {
    const owner = el.closest("form") ?? el;
    const bag = declaredOptions.get(owner) ?? {};
    bag[name] = expression;
    declaredOptions.set(owner, bag);
    if (!isRequestHost(owner) && !isRequestHost(el)) {
      warn(
        `${config.prefix}${name} needs an element with ${config.prefix}submit, ${config.prefix}upload, ${config.prefix}dropzone, or ${config.prefix}autosave.`
      );
      return;
    }
    const problem = validate2?.(expression);
    if (problem) warn(problem);
  });
}
var HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
defineFormOption(
  "method",
  (value) => value && !HTTP_METHODS.includes(value.trim().toUpperCase()) ? `${config.prefix}method received an unknown verb: ${value}` : null
);
defineFormOption("redirect");
defineFormOption("reset-success");
defineFormOption("disable-loading");
defineFormOption("loading-class");
defineFormOption("on-success");
defineFormOption("on-error");
defineFormOption("on-complete");
defineFormOption("toast-success");
defineFormOption("toast-error");
defineFormOption("confirm");
defineFormOption("form-data");
defineDirective("loading", ({ el, expression }) => {
  const owner = el.closest("form") ?? el;
  const bag = declaredOptions.get(owner) ?? {};
  bag.loading = expression;
  declaredOptions.set(owner, bag);
  const target = loadingTarget(expression);
  if (!target) {
    warn(`${config.prefix}loading element not found: ${expression}`);
    return;
  }
  toggleLoadingTarget(target, false);
});
var CSS3 = `
form.v-loading{cursor:progress}
form.v-loading [type="submit"],form.v-loading button[disabled]{opacity:.6}
.v-progress{position:relative;overflow:hidden;width:100%;height:8px;margin-top:8px;
  border-radius:999px;background:var(--v-surface-2,#FBF7F2);border:1px solid var(--v-border,#E6E0F0)}
.v-progress-bar{display:block;height:100%;width:0;border-radius:999px;
  background:var(--v-primary,#6D3BF5);transition:width .18s var(--v-ease,ease)}
.v-progress[data-state="error"] .v-progress-bar{background:var(--v-danger,#FF4D4D)}
.v-progress[data-state="done"] .v-progress-bar{background:var(--v-success,#2ED9A5)}

.v-dropzone{display:grid;place-items:center;gap:6px;min-height:132px;padding:20px;cursor:pointer;
  border:2px dashed var(--v-border,#E6E0F0);border-radius:var(--v-radius,12px);
  background:var(--v-surface,#fff);color:var(--v-text-muted,#6B6580);text-align:center;
  font:500 14px/1.5 var(--v-font-sans,system-ui,-apple-system,sans-serif);
  transition:border-color .18s var(--v-ease,ease),background .18s var(--v-ease,ease)}
.v-dropzone:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-dropzone-over{border-color:var(--v-primary,#6D3BF5);
  background:color-mix(in srgb,var(--v-primary,#6D3BF5) 8%,var(--v-surface,#fff));
  color:var(--v-primary,#6D3BF5)}
.v-dropzone-busy{cursor:progress;opacity:.75}
.v-dropzone-error{border-color:var(--v-danger,#FF4D4D);color:var(--v-danger,#FF4D4D)}

.v-autosave-status{display:inline-flex;align-items:center;gap:6px;margin-top:8px;
  color:var(--v-text-muted,#6B6580);
  font:500 12.5px/1.4 var(--v-font-sans,system-ui,-apple-system,sans-serif)}
.v-autosave-status[data-state="saving"]{color:var(--v-info,#9B7BFF)}
.v-autosave-status[data-state="saved"]{color:var(--v-success,#2ED9A5)}
.v-autosave-status[data-state="error"]{color:var(--v-danger,#FF4D4D)}
@media (prefers-reduced-motion: reduce){.v-progress-bar,.v-dropzone{transition:none}}
`;
function ensureStyles2() {
  ensureTokens();
  injectStyle("forms-ajax", CSS3);
}
function emit2(el, name, detail) {
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
function resolveUrl(raw, scope) {
  let url2 = raw.trim();
  if (url2.includes("{")) {
    url2 = url2.replace(/\{([^{}]+)\}/g, (whole, expression) => {
      const value = evaluateIn(expression.trim(), scope, `${config.prefix}submit`);
      return value == null ? whole : String(value);
    });
  }
  const base = config.baseURL;
  if (base && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url2) && !url2.startsWith("//")) {
    url2 = `${base.replace(/\/$/, "")}/${url2.replace(/^\//, "")}`;
  }
  return url2;
}
function messageFrom(data2) {
  if (!data2 || typeof data2 !== "object") return "";
  const source = data2;
  const found = source.message ?? source.mensagem;
  return typeof found === "string" ? found : "";
}
function toParams(value, prefix = "", out = {}) {
  if (value == null) return out;
  if (Array.isArray(value)) {
    value.forEach((item, index) => toParams(item, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === "object" && !(value instanceof File)) {
    for (const [key, item] of Object.entries(value)) {
      toParams(item, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  if (prefix) out[prefix] = String(value);
  return out;
}
function submitButtons(form) {
  return Array.from(
    form.querySelectorAll(
      'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]'
    )
  );
}
function loadingTarget(selector) {
  if (!selector || typeof document === "undefined") return null;
  return document.querySelector(selector);
}
var originalDisplay = /* @__PURE__ */ new WeakMap();
function toggleLoadingTarget(target, visible) {
  if (visible) {
    target.hidden = false;
    target.style.display = originalDisplay.get(target) ?? "";
    target.removeAttribute("aria-hidden");
    return;
  }
  if (!originalDisplay.has(target)) {
    originalDisplay.set(target, target.style.display === "none" ? "" : target.style.display);
  }
  target.style.display = "none";
  target.setAttribute("aria-hidden", "true");
}
function setLoading(ctx, on2) {
  const { host, form, state } = ctx;
  state.loading = on2;
  form.classList.toggle("v-loading", on2);
  form.setAttribute("aria-busy", on2 ? "true" : "false");
  const extra = readOption2(host, "loading-class");
  if (extra) {
    for (const name of extra.split(/\s+/).filter(Boolean)) form.classList.toggle(name, on2);
  }
  if (hasOption(host, "disable-loading")) {
    for (const button of submitButtons(form)) button.disabled = on2;
  }
  const selector = readOption2(host, "loading");
  if (selector) {
    const target = loadingTarget(selector);
    if (target) toggleLoadingTarget(target, on2);
  }
}
function runCallback(ctx, option, payload, response) {
  const expression = readOption2(ctx.host, option);
  if (!expression) return;
  const local = ctx.scope.child({
    $data: payload,
    $response: response,
    $form: ctx.state,
    $el: ctx.host
  });
  const result = evaluateIn(expression, local, `${config.prefix}${option}`);
  if (typeof result === "function") {
    result.call(ctx.scope.data, payload, response);
  }
}
function swapContent2(ctx, data2) {
  const selector = readOption2(ctx.host, "target");
  if (!selector || typeof data2 !== "string") return;
  const target = document.querySelector(selector);
  if (!target) {
    warn(`${config.prefix}target destination not found: ${selector}`);
    return;
  }
  const mode = (readOption2(ctx.host, "swap") || "innerHTML").trim().toLowerCase();
  if (mode === "none") return;
  if (mode === "text") {
    target.textContent = data2;
    return;
  }
  const template = document.createElement("template");
  template.innerHTML = data2;
  const nodes = Array.from(template.content.childNodes);
  const scope = findScope(target);
  switch (mode) {
    case "inner":
    case "innerhtml":
      for (const child of Array.from(target.children)) destroy(child);
      target.textContent = "";
      target.append(...nodes);
      break;
    case "afterbegin":
    case "prepend":
      target.prepend(...nodes);
      break;
    case "beforeend":
    case "append":
      target.append(...nodes);
      break;
    case "beforebegin":
      target.before(...nodes);
      break;
    case "afterend":
      target.after(...nodes);
      break;
    case "outer":
    case "outerhtml":
    case "replace":
      destroy(target);
      target.replaceWith(...nodes);
      break;
    default:
      warn(`Unknown mode in ${config.prefix}swap: ${mode}`);
      return;
  }
  for (const node of nodes) if (node.nodeType === 1) walk(node, scope);
}
function handleSuccess(ctx, data2, status) {
  const { state, form, host } = ctx;
  state.success = true;
  state.errors = {};
  state.data = data2;
  state.status = status;
  state.dirty = false;
  state.message = messageFrom(data2);
  swapContent2(ctx, data2);
  if (hasOption(host, "reset-success") && form.tagName === "FORM") {
    form.reset();
    clearErrors(form);
  }
  const successToast = readOption2(host, "toast-success");
  if (successToast !== null) {
    toast.success(successToast || state.message || "All set!");
  }
  runCallback(ctx, "on-success", data2, { status });
  emit2(form, "voodoo:success", { data: data2, status, form, state });
  const redirect = readOption2(host, "redirect");
  if (redirect !== null && typeof window !== "undefined") {
    const fromServer = data2 && typeof data2 === "object" ? data2.redirect ?? data2.url : null;
    const local = ctx.scope.child({ $data: data2, $form: state });
    const url2 = redirect ? resolveUrl(redirect, local) : String(fromServer ?? "");
    if (url2) window.location.assign(url2);
  }
}
function handleFailure(ctx, error) {
  const { state, form, host } = ctx;
  const httpError = error instanceof HttpError ? error : new HttpError(error instanceof Error ? error.message : String(error));
  const data2 = httpError.response?.data ?? null;
  state.success = false;
  state.data = data2;
  state.status = httpError.status;
  state.message = messageFrom(data2) || httpError.message;
  const serverErrors = normalizeErrors(data2);
  if (httpError.status === 422 || Object.keys(serverErrors).length > 0) {
    state.errors = showFormErrors(form, data2);
    focusFirstError(form);
  }
  const errorToast = readOption2(host, "toast-error");
  if (errorToast !== null) {
    toast.error(errorToast || messageFrom(data2) || "Could not submit the form.");
  }
  runCallback(ctx, "on-error", data2, httpError);
  emit2(form, "voodoo:error", {
    error: httpError,
    data: data2,
    status: httpError.status,
    form,
    state
  });
}
function handleComplete(ctx, ok) {
  runCallback(ctx, "on-complete", ctx.state.data, { ok, status: ctx.state.status });
  emit2(ctx.form, "voodoo:complete", {
    ok,
    status: ctx.state.status,
    data: ctx.state.data,
    form: ctx.form,
    state: ctx.state
  });
}
async function sendForm(ctx, rawUrl) {
  const { host, form, state, scope } = ctx;
  if (state.loading) return;
  const confirmMessage = readOption2(host, "confirm");
  if (confirmMessage !== null && typeof window !== "undefined") {
    if (!window.confirm(confirmMessage || "Confirm this action?")) return;
  }
  if (isValidatedForm(form)) {
    clearErrors(form);
    const result = await validateForm(form);
    state.errors = result.errors;
    if (!result.valid) {
      focusFirstError(form);
      emit2(form, "voodoo:invalid", { errors: result.errors, form, state });
      return;
    }
  }
  const method = (readOption2(host, "method") || form.getAttribute("method") || "POST").trim().toUpperCase();
  const url2 = resolveUrl(rawUrl, scope) || (form.tagName === "FORM" ? form.action : "") || (typeof location !== "undefined" ? location.href : "");
  const payload = serializeForm(form, { formData: hasOption(host, "form-data") });
  const readOnly = method === "GET" || method === "HEAD";
  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  emit2(form, "voodoo:submit", { url: url2, method, form, state });
  let ok = false;
  try {
    const response = await request({
      url: url2,
      method,
      body: readOnly ? void 0 : payload,
      params: readOnly && !(payload instanceof FormData) ? toParams(payload) : void 0
    });
    ok = true;
    handleSuccess(ctx, response.data, response.status);
  } catch (err) {
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}
defineDirective(
  "submit",
  ({ el, scope, expression, cleanup }) => {
    ensureStyles2();
    const form = el;
    const state = ensureFormState(form);
    const formScope = scope.child({ $form: state }, form);
    scopeStates.set(formScope, state);
    scopeStates.set(scope, state);
    markNodeScope(form, formScope);
    for (const child of Array.from(form.childNodes)) {
      if (child.nodeType === 1) markNodeScope(child, formScope);
    }
    const ctx = { host: form, form, scope: formScope, state };
    const onSubmit = (event) => {
      event.preventDefault();
      void sendForm(ctx, expression);
    };
    const onFieldValidated = (event) => {
      const detail = event.detail;
      if (!detail || !detail.field) return;
      const next = { ...state.errors };
      if (detail.valid) delete next[detail.field];
      else next[detail.field] = detail.message ?? "";
      state.errors = next;
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("voodoo:field-validated", onFieldValidated);
    cleanup(() => {
      formStates.delete(form);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("voodoo:field-validated", onFieldValidated);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
function progressElement(host) {
  const selector = readOption2(host, "progress");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`${config.prefix}progress bar not found: ${selector}`);
    return null;
  }
  const existing = host.nextElementSibling;
  if (existing && existing.classList.contains("v-progress")) return existing;
  ensureStyles2();
  const bar = document.createElement("div");
  bar.className = "v-progress";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.innerHTML = '<span class="v-progress-bar"></span>';
  host.insertAdjacentElement("afterend", bar);
  return bar;
}
function paintProgress(target, percent, state) {
  if (!target) return;
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  if (target.tagName === "PROGRESS") {
    target.value = value;
    target.max = 100;
  } else {
    const bar = target.classList.contains("v-progress-bar") ? target : target.querySelector(".v-progress-bar, [data-progress-bar]");
    if (bar) bar.style.width = `${value}%`;
    else target.style.width = `${value}%`;
  }
  target.setAttribute("aria-valuenow", String(value));
  if (state) target.setAttribute("data-state", state);
  else target.removeAttribute("data-state");
}
function buildFileData(host, files, fieldName) {
  const data2 = new FormData();
  const multiple = files.length > 1 || fieldName.endsWith("[]");
  const name = multiple ? fieldName.endsWith("[]") ? fieldName : `${fieldName}[]` : fieldName;
  for (const file of files) data2.append(name, file);
  const owner = host.closest("form");
  if (owner) {
    const extra = serializeForm(owner, { formData: true });
    if (extra instanceof FormData) {
      for (const [key, value] of extra.entries()) {
        if (value instanceof File) continue;
        data2.append(key, value);
      }
    }
  }
  return data2;
}
async function sendFiles(ctx, rawUrl, files, fieldName) {
  if (!files.length || ctx.state.loading) return;
  const { state, form, host } = ctx;
  const url2 = resolveUrl(rawUrl, ctx.scope);
  if (!url2) {
    warn(`${config.prefix}upload needs a destination URL.`);
    return;
  }
  const bar = progressElement(host);
  const data2 = buildFileData(host, files, fieldName);
  setLoading(ctx, true);
  state.success = false;
  state.progress = 0;
  paintProgress(bar, 0, "loading");
  emit2(form, "voodoo:upload", { url: url2, files, form, state });
  let ok = false;
  try {
    const method = (readOption2(host, "method") || "POST").trim().toUpperCase();
    const response = await http.upload(url2, data2, {
      method: method === "PUT" || method === "PATCH" ? method : "POST",
      onProgress: (percent) => {
        state.progress = percent;
        paintProgress(bar, percent, "loading");
        emit2(form, "voodoo:progress", { percent, form, state });
      }
    });
    ok = true;
    state.progress = 100;
    paintProgress(bar, 100, "done");
    handleSuccess(ctx, response, 200);
  } catch (err) {
    paintProgress(bar, state.progress, "error");
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}
defineDirective("upload", ({ el, scope, expression, cleanup }) => {
  const input = el;
  if (input.tagName !== "INPUT" || (input.getAttribute("type") || "").toLowerCase() !== "file") {
    warn(`${config.prefix}upload needs an <input type="file">.`);
    return;
  }
  ensureStyles2();
  const form = input.closest("form") ?? input;
  const state = ensureFormState(form);
  const ctx = { host: input, form, scope, state };
  const onChange = () => {
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    void sendFiles(ctx, expression, files, input.name || "file");
  };
  input.addEventListener("change", onChange);
  cleanup(() => input.removeEventListener("change", onChange));
});
defineDirective("dropzone", ({ el, scope, expression, cleanup }) => {
  ensureStyles2();
  el.classList.add("v-dropzone");
  if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
  if (!el.hasAttribute("role")) el.setAttribute("role", "button");
  if (!el.textContent?.trim()) el.textContent = "Drag files here or click to choose";
  const form = el.closest("form") ?? el;
  const state = ensureFormState(form);
  const ctx = { host: el, form, scope, state };
  const fieldName = readOption2(el, "field") || "file";
  const picker = document.createElement("input");
  picker.type = "file";
  picker.hidden = true;
  picker.tabIndex = -1;
  if (el.hasAttribute("accept")) picker.accept = el.getAttribute("accept") ?? "";
  if (el.hasAttribute("multiple")) picker.multiple = true;
  el.appendChild(picker);
  const send = (files) => {
    if (!files.length) return;
    el.classList.add("v-dropzone-busy");
    el.classList.remove("v-dropzone-error");
    void sendFiles(ctx, expression, files, fieldName).finally(() => {
      el.classList.remove("v-dropzone-busy");
      if (!state.success) el.classList.add("v-dropzone-error");
    });
  };
  let depth = 0;
  const onDragEnter = (event) => {
    event.preventDefault();
    depth++;
    el.classList.add("v-dropzone-over");
  };
  const onDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) el.classList.remove("v-dropzone-over");
  };
  const onDrop = (event) => {
    event.preventDefault();
    depth = 0;
    el.classList.remove("v-dropzone-over");
    const files = Array.from(event.dataTransfer?.files ?? []);
    send(picker.multiple ? files : files.slice(0, 1));
  };
  const onClick = (event) => {
    if (event.target === picker) return;
    picker.click();
  };
  const onKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    picker.click();
  };
  const onPick = () => {
    const files = Array.from(picker.files ?? []);
    send(files);
    picker.value = "";
  };
  el.addEventListener("dragenter", onDragEnter);
  el.addEventListener("dragover", onDragOver);
  el.addEventListener("dragleave", onDragLeave);
  el.addEventListener("drop", onDrop);
  el.addEventListener("click", onClick);
  el.addEventListener("keydown", onKeyDown);
  picker.addEventListener("change", onPick);
  cleanup(() => {
    el.removeEventListener("dragenter", onDragEnter);
    el.removeEventListener("dragover", onDragOver);
    el.removeEventListener("dragleave", onDragLeave);
    el.removeEventListener("drop", onDrop);
    el.removeEventListener("click", onClick);
    el.removeEventListener("keydown", onKeyDown);
    picker.removeEventListener("change", onPick);
    picker.remove();
  });
});
var AUTOSAVE_TEXTS = {
  idle: "",
  saving: "Saving...",
  saved: "Changes saved",
  error: "Could not save"
};
function autosaveStatusElement(host) {
  const selector = readOption2(host, "autosave-status");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`${config.prefix}autosave-status element not found: ${selector}`);
  }
  const existing = host.querySelector(".v-autosave-status");
  if (existing) return existing;
  const status = document.createElement("span");
  status.className = "v-autosave-status";
  status.setAttribute("aria-live", "polite");
  host.appendChild(status);
  return status;
}
function paintAutosave(status, kind) {
  status.setAttribute("data-state", kind);
  status.textContent = AUTOSAVE_TEXTS[kind];
}
defineDirective("autosave", ({ el, scope, expression, modifiers, cleanup }) => {
  ensureStyles2();
  const form = el;
  const state = ensureFormState(form);
  const ctx = { host: form, form, scope, state };
  const status = autosaveStatusElement(form);
  const rawDelay = (typeof modifiers.delay === "string" ? modifiers.delay : null) ?? Object.keys(modifiers).find((name) => /^[\d.]+(ms|s|m)?$/.test(name)) ?? readOption2(form, "autosave-delay") ?? 1e3;
  const delay = parseDuration(rawDelay, 1e3);
  const save = async () => {
    const url2 = resolveUrl(expression, scope);
    if (!url2) {
      warn(`${config.prefix}autosave needs a destination URL.`);
      return;
    }
    if (state.loading) return;
    state.saving = true;
    paintAutosave(status, "saving");
    const method = (readOption2(form, "method") || "POST").trim().toUpperCase();
    try {
      const response = await request({
        url: url2,
        method,
        body: serializeForm(form, { formData: hasOption(form, "form-data") })
      });
      state.data = response.data;
      state.status = response.status;
      state.dirty = false;
      state.success = true;
      paintAutosave(status, "saved");
      runCallback(ctx, "on-success", response.data, { status: response.status });
      emit2(form, "voodoo:autosave", { data: response.data, status: response.status, form, state });
    } catch (err) {
      paintAutosave(status, "error");
      handleFailure(ctx, err);
    } finally {
      state.saving = false;
    }
  };
  const schedule = debounce(() => {
    void save();
  }, delay);
  const onChange = () => {
    state.dirty = true;
    schedule();
  };
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);
  cleanup(() => {
    schedule.cancel();
    form.removeEventListener("input", onChange);
    form.removeEventListener("change", onChange);
  });
});
defineDirective("guard", ({ el, expression, cleanup }) => {
  const form = (el.tagName === "FORM" ? el : el.closest("form")) ?? el;
  const state = ensureFormState(form);
  const message = expression.trim() || "There are unsaved changes.";
  const onChange = () => {
    state.dirty = true;
  };
  const onClean = () => {
    state.dirty = false;
  };
  const onBeforeUnload = (event) => {
    if (!state.dirty || state.loading) return;
    event.preventDefault();
    event.returnValue = message;
  };
  form.addEventListener("input", onChange);
  form.addEventListener("change", onChange);
  form.addEventListener("reset", onClean);
  form.addEventListener("voodoo:success", onClean);
  window.addEventListener("beforeunload", onBeforeUnload);
  cleanup(() => {
    form.removeEventListener("input", onChange);
    form.removeEventListener("change", onChange);
    form.removeEventListener("reset", onClean);
    form.removeEventListener("voodoo:success", onClean);
    window.removeEventListener("beforeunload", onBeforeUnload);
  });
});

// src/directives/state.ts
init_reactivity();
init_registry();
function serializable(source) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "function") continue;
    if (key.startsWith("$")) continue;
    try {
      JSON.stringify(value);
      out[key] = toRaw(value);
    } catch {
    }
  }
  return out;
}
function autoKey(el, prefix) {
  if (el.id) return `${prefix}:${location.pathname}:#${el.id}`;
  const path = [];
  let current2 = el;
  while (current2 && current2 !== document.body) {
    const parent = current2.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current2) : 0;
    path.unshift(`${current2.tagName.toLowerCase()}${index}`);
    current2 = parent;
  }
  return `${prefix}:${location.pathname}:${path.join(">")}`;
}
defineDirective(
  "persist",
  ({ el, scope, expression, cleanup }) => {
    const key = expression.trim() ? `voodoo:persist:${expression.trim()}` : autoKey(el, "voodoo:persist");
    const saved = storage.get(key);
    if (saved && typeof saved === "object") {
      for (const [prop, value] of Object.entries(saved)) {
        if (prop in scope.data) scope.data[prop] = value;
      }
    }
    const save = debounce(() => {
      storage.set(key, serializable(scope.data));
    }, 120);
    const stopWatching = watch(scope.data, () => save(), { deep: true });
    save();
    cleanup(() => {
      save.flush();
      stopWatching();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
defineDirective(
  "sync",
  ({ el, scope, expression, cleanup }) => {
    if (typeof BroadcastChannel === "undefined") return;
    const name = expression.trim() || autoKey(el, "voodoo:sync");
    const channel = new BroadcastChannel(name);
    const senderId = Math.random().toString(36).slice(2);
    let applyingRemote = false;
    const send = debounce(() => {
      if (applyingRemote) return;
      try {
        channel.postMessage({ from: senderId, state: serializable(scope.data) });
      } catch (err) {
        handleError(err, "v-sync");
      }
    }, 60);
    channel.addEventListener("message", (event) => {
      const payload = event.data;
      if (!payload || payload.from === senderId) return;
      applyingRemote = true;
      for (const [prop, value] of Object.entries(payload.state)) {
        if (prop in scope.data && scope.data[prop] !== value) scope.data[prop] = value;
      }
      queueMicrotask(() => {
        applyingRemote = false;
      });
    });
    const stopWatching = watch(scope.data, () => send(), { deep: true });
    cleanup(() => {
      stopWatching();
      channel.close();
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
var controllers = /* @__PURE__ */ new WeakMap();
function findController(el) {
  let current2 = el;
  while (current2) {
    const found = controllers.get(current2);
    if (found) return found;
    current2 = current2.parentElement;
  }
  return null;
}
defineDirective(
  "history",
  ({ el, scope, expression, cleanup }) => {
    const limit = Number(expression) || 50;
    const snapshots = [
      JSON.parse(JSON.stringify(serializable(scope.data)))
    ];
    let position = 0;
    let restoring = false;
    const controller = reactive({
      canUndo: false,
      canRedo: false,
      size: 1,
      undo() {
        if (position <= 0) return;
        position--;
        apply();
      },
      redo() {
        if (position >= snapshots.length - 1) return;
        position++;
        apply();
      },
      clear() {
        snapshots.length = 0;
        snapshots.push(JSON.parse(JSON.stringify(serializable(scope.data))));
        position = 0;
        sync();
      }
    });
    function sync() {
      controller.canUndo = position > 0;
      controller.canRedo = position < snapshots.length - 1;
      controller.size = snapshots.length;
    }
    function apply() {
      restoring = true;
      const snapshot = snapshots[position];
      for (const [prop, value] of Object.entries(snapshot)) {
        scope.data[prop] = JSON.parse(JSON.stringify(value));
      }
      sync();
      queueMicrotask(() => {
        restoring = false;
      });
    }
    const record = debounce(() => {
      if (restoring) return;
      const current2 = JSON.stringify(serializable(scope.data));
      if (current2 === JSON.stringify(snapshots[position])) return;
      snapshots.splice(position + 1);
      snapshots.push(JSON.parse(current2));
      if (snapshots.length > limit) snapshots.shift();
      position = snapshots.length - 1;
      sync();
    }, parseDuration(el.getAttribute("v-history-debounce") ?? void 0, 300));
    const stopWatching = watch(scope.data, () => record(), { deep: true });
    controllers.set(el, controller);
    scope.set("$history", controller);
    cleanup(() => {
      stopWatching();
      record.cancel();
      controllers.delete(el);
    });
  },
  { priority: PRIORITY.DATA - 1 }
);
defineDirective("undo", ({ el, cleanup }) => {
  const handler = () => findController(el)?.undo();
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective("redo", ({ el, cleanup }) => {
  const handler = () => findController(el)?.redo();
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective("storage", ({ el, expression, cleanup, scope }) => {
  const key = expression.trim();
  if (!key) return;
  const input = el;
  const saved = storage.get(`voodoo:field:${key}`);
  if (saved != null && "value" in input) input.value = String(saved);
  const handler = () => {
    storage.set(`voodoo:field:${key}`, input.value);
  };
  input.addEventListener("input", handler);
  cleanup(() => input.removeEventListener("input", handler));
});
magic("$history", (scope) => scope.el ? findController(scope.el) : null);

// src/sound/index.ts
init_registry();
var audioContext = null;
var masterVolume = 0.35;
var isMuted = false;
var hasLoadedPreference = false;
var VOLUME_KEY = "voodoo:sound:volume";
var MUTE_KEY = "voodoo:sound:muted";
function loadPreference() {
  if (hasLoadedPreference) return;
  hasLoadedPreference = true;
  const savedVolume = storage.get(VOLUME_KEY);
  if (typeof savedVolume === "number" && savedVolume >= 0 && savedVolume <= 1) masterVolume = savedVolume;
  const savedMute = storage.get(MUTE_KEY);
  if (typeof savedMute === "boolean") isMuted = savedMute;
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches && storage.get(VOLUME_KEY) === void 0) {
    masterVolume = 0.18;
  }
}
function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext) {
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  }
  const Constructor = window.AudioContext ?? window.webkitAudioContext;
  if (!Constructor) return null;
  try {
    audioContext = new Constructor();
    return audioContext;
  } catch {
    return null;
  }
}
function playLayer(ctx, layer, effectVolume) {
  const start2 = ctx.currentTime + (layer.atraso ?? 0);
  const end = start2 + layer.duracao;
  const oscillator = ctx.createOscillator();
  oscillator.type = layer.forma ?? "sine";
  oscillator.frequency.setValueAtTime(layer.frequencia, start2);
  if (layer.ate !== void 0 && layer.ate !== layer.frequencia) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, layer.ate), end);
  }
  const gain = ctx.createGain();
  const peak = masterVolume * effectVolume * (layer.volume ?? 1);
  const attack = layer.ataque ?? 8e-3;
  gain.gain.setValueAtTime(1e-4, start2);
  gain.gain.exponentialRampToValueAtTime(Math.max(1e-4, peak), start2 + attack);
  gain.gain.exponentialRampToValueAtTime(1e-4, end);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start2);
  oscillator.stop(end + 0.02);
}
var efeitos = {
  /** Dry confirmation tap, for common buttons. */
  click: {
    volume: 0.5,
    camadas: [{ frequencia: 660, ate: 440, duracao: 0.06, forma: "triangle" }]
  },
  /** Short, high-pitched pop, good for toggling. */
  pop: {
    volume: 0.5,
    camadas: [{ frequencia: 880, ate: 1320, duracao: 0.07, forma: "sine" }]
  },
  /** Gentle brush, for passing the mouse over. */
  hover: {
    volume: 0.22,
    camadas: [{ frequencia: 1200, duracao: 0.035, forma: "sine" }]
  },
  /** Two rising notes, for success. */
  success: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 783.99, duracao: 0.18, forma: "sine", atraso: 0.09 }
    ]
  },
  /** Three rising notes, for flow completion. */
  complete: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 659.25, duracao: 0.1, forma: "sine", atraso: 0.09 },
      { frequencia: 1046.5, duracao: 0.22, forma: "sine", atraso: 0.18 }
    ]
  },
  /** Two falling notes, for error. */
  error: {
    volume: 0.6,
    camadas: [
      { frequencia: 392, duracao: 0.12, forma: "square", volume: 0.5 },
      { frequencia: 261.63, duracao: 0.24, forma: "square", volume: 0.5, atraso: 0.1 }
    ]
  },
  /** Short warning alert. */
  warning: {
    volume: 0.55,
    camadas: [
      { frequencia: 587.33, duracao: 0.1, forma: "triangle" },
      { frequencia: 587.33, duracao: 0.14, forma: "triangle", atraso: 0.14 }
    ]
  },
  /** Discrete bell, for incoming notification. */
  notify: {
    volume: 0.5,
    camadas: [
      { frequencia: 987.77, duracao: 0.14, forma: "sine" },
      { frequencia: 1318.51, duracao: 0.3, forma: "sine", atraso: 0.08, volume: 0.6 }
    ]
  },
  /** Very short tap for typing. */
  type: {
    volume: 0.18,
    camadas: [{ frequencia: 2200, duracao: 0.018, forma: "square" }]
  },
  /** Slide up for opening a panel, drawer, or modal. */
  open: {
    volume: 0.4,
    camadas: [{ frequencia: 330, ate: 660, duracao: 0.14, forma: "sine" }]
  },
  /** Slide down for closing. */
  close: {
    volume: 0.4,
    camadas: [{ frequencia: 660, ate: 330, duracao: 0.14, forma: "sine" }]
  },
  /** Short denial, for blocked action. */
  deny: {
    volume: 0.5,
    camadas: [
      { frequencia: 220, duracao: 0.08, forma: "square", volume: 0.5 },
      { frequencia: 180, duracao: 0.12, forma: "square", volume: 0.5, atraso: 0.07 }
    ]
  },
  /** Coin, for score and reward. */
  coin: {
    volume: 0.45,
    camadas: [
      { frequencia: 987.77, duracao: 0.06, forma: "square" },
      { frequencia: 1318.51, duracao: 0.16, forma: "square", atraso: 0.05 }
    ]
  },
  /** Level up, more festive. */
  levelup: {
    volume: 0.55,
    camadas: [
      { frequencia: 523.25, duracao: 0.08, forma: "square" },
      { frequencia: 659.25, duracao: 0.08, forma: "square", atraso: 0.07 },
      { frequencia: 783.99, duracao: 0.08, forma: "square", atraso: 0.14 },
      { frequencia: 1046.5, duracao: 0.26, forma: "square", atraso: 0.21 }
    ]
  },
  /** Deep hit, for drag and drop. */
  drop: {
    volume: 0.5,
    camadas: [{ frequencia: 180, ate: 90, duracao: 0.12, forma: "triangle" }]
  }
};
var NOTES = {
  do: 261.63,
  "do#": 277.18,
  re: 293.66,
  "re#": 311.13,
  mi: 329.63,
  fa: 349.23,
  "fa#": 369.99,
  sol: 392,
  "sol#": 415.3,
  la: 440,
  "la#": 466.16,
  si: 493.88,
  // English names, for those who prefer.
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  g: 392,
  a: 440,
  b: 493.88
};
function getFrequencyForNote(name) {
  const clean = String(name).trim().toLowerCase();
  const match = /^([a-z]+#?)(\d)?$/.exec(clean);
  if (!match) return null;
  const base = NOTES[match[1]];
  if (base === void 0) return null;
  const octave = match[2] ? Number(match[2]) : 4;
  return base * 2 ** (octave - 4);
}
var audioFiles = /* @__PURE__ */ new Map();
function playAudioFile(url2, volume) {
  let element = audioFiles.get(url2);
  if (!element) {
    element = new Audio(url2);
    element.preload = "auto";
    audioFiles.set(url2, element);
  }
  element.volume = Math.max(0, Math.min(1, masterVolume * volume));
  element.currentTime = 0;
  void element.play().catch(() => {
  });
}
function looksLikePath(value) {
  return /^(https?:)?\/\//.test(value) || /^[./]/.test(value) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(value);
}
var sound = {
  /**
   * Plays an effect by name, or a file by path.
   *
   * ```js
   * V.sound.play('success')
   * V.sound.play('/audio/ding.mp3')
   * V.sound.play('click', { volume: 0.5 })
   * ```
   */
  play(name, options = {}) {
    loadPreference();
    if (isMuted || !name) return;
    const value = String(name).trim();
    const volume = options.volume ?? 1;
    if (looksLikePath(value)) {
      playAudioFile(value, volume);
      return;
    }
    const effect2 = efeitos[value];
    if (!effect2) {
      const frequency = getFrequencyForNote(value);
      if (frequency !== null) this.tone(frequency, 200, { volume });
      return;
    }
    const ctx = getAudioContext();
    if (!ctx) return;
    const pitch = options.tom ?? 1;
    const effectVolume = (effect2.volume ?? 1) * volume;
    for (const layer of effect2.camadas) {
      playLayer(
        ctx,
        pitch === 1 ? layer : {
          ...layer,
          frequencia: layer.frequencia * pitch,
          ate: layer.ate === void 0 ? void 0 : layer.ate * pitch
        },
        effectVolume
      );
    }
  },
  /**
   * Plays a pure frequency.
   *
   * ```js
   * V.sound.tone(440, 300)
   * ```
   *
   * @param frequency hertz
   * @param duration milliseconds
   */
  tone(frequency, duration = 200, options = {}) {
    loadPreference();
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playLayer(
      ctx,
      { frequencia: frequency, duracao: duration / 1e3, forma: options.forma ?? "sine" },
      options.volume ?? 0.5
    );
  },
  /**
   * Plays a note by name.
   *
   * ```js
   * V.sound.note('la', 300)
   * V.sound.note('do5', 200)
   * ```
   */
  note(name, duration = 250, options = {}) {
    const frequency = getFrequencyForNote(name);
    if (frequency === null) return;
    this.tone(frequency, duration, options);
  },
  /**
   * Plays a sequence of notes.
   *
   * ```js
   * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
   * ```
   *
   * @param notes note names, or frequencies in hertz
   * @param interval milliseconds between one note and the next
   */
  melody(notes, interval = 150, options = {}) {
    loadPreference();
    if (isMuted) return;
    notes.forEach((note, index) => {
      const frequency = typeof note === "number" ? note : getFrequencyForNote(note);
      if (frequency === null) return;
      setTimeout(() => this.tone(frequency, interval * 1.6, options), index * interval);
    });
  },
  /**
   * Reads or adjusts the master volume, from 0 to 1. The choice is saved.
   *
   * ```js
   * V.sound.volume()      // read
   * V.sound.volume(0.6)   // adjust
   * ```
   */
  volume(value) {
    loadPreference();
    if (value === void 0) return masterVolume;
    masterVolume = Math.max(0, Math.min(1, value));
    storage.set(VOLUME_KEY, masterVolume);
    return masterVolume;
  },
  /** Mutes sound. Pass `false` to unmute. */
  mute(value = true) {
    loadPreference();
    isMuted = value;
    storage.set(MUTE_KEY, isMuted);
  },
  /** Unmutes sound. */
  unmute() {
    this.mute(false);
  },
  /** Toggles between muted and unmuted, and returns the new state. */
  toggle() {
    loadPreference();
    this.mute(!isMuted);
    return isMuted;
  },
  /** `true` when muted. */
  get muted() {
    loadPreference();
    return isMuted;
  },
  /** Names of all available effects. */
  get names() {
    return Object.keys(efeitos);
  },
  /**
   * Registers a custom effect.
   *
   * ```js
   * V.sound.define('myWarning', {
   *   volume: 0.5,
   *   camadas: [
   *     { frequencia: 700, duracao: 0.1 },
   *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
   *   ]
   * })
   * ```
   */
  define(name, effect2) {
    efeitos[name] = effect2;
  },
  /** Preloads a file to avoid delay on first play. */
  preload(...urls) {
    for (const url2 of urls) {
      if (audioFiles.has(url2)) continue;
      const element = new Audio(url2);
      element.preload = "auto";
      audioFiles.set(url2, element);
    }
  }
};
defineDirective("sound", ({ el, arg, expression, modifiers, scope, cleanup, evaluate: evaluate2 }) => {
  const event = arg || "click";
  const resolve2 = () => {
    const raw = expression.trim();
    if (!raw) return "click";
    if (efeitos[raw] || looksLikePath(raw) || getFrequencyForNote(raw) !== null) return raw;
    const value = evaluate2();
    return typeof value === "string" ? value : raw;
  };
  const volume = modifiers.volume !== void 0 ? Number(modifiers.volume) : void 0;
  const play = () => {
    sound.play(resolve2(), volume === void 0 ? {} : { volume });
  };
  el.addEventListener(event, play);
  cleanup(() => el.removeEventListener(event, play));
});
defineDirective("mute", ({ el, cleanup }) => {
  const sync = () => {
    const isMuted2 = sound.muted;
    el.setAttribute("aria-pressed", String(isMuted2));
    el.classList.toggle("v-muted", isMuted2);
  };
  const toggle = () => {
    sound.toggle();
    sync();
    if (!sound.muted) sound.play("pop");
  };
  el.addEventListener("click", toggle);
  sync();
  cleanup(() => el.removeEventListener("click", toggle));
});
magic("$sound", () => sound);

// src/ui/dialog.ts
init_style();
init_registry();

// src/ui/palette.ts
init_style();
init_registry();
var HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])[0-9a-f]?$/i;
var HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i;
var RGB_FUNCTION = /^rgba?\(([^)]+)\)$/i;
var HSL_FUNCTION = /^hsla?\(([^)]+)\)$/i;
function numbers(body) {
  return body.split(/[\s,/]+/).map((part) => parseFloat(part)).filter((value) => !Number.isNaN(value));
}
function hslToRgb(h, s, l) {
  const hue = (h % 360 + 360) % 360;
  const sat = clamp(s / 100, 0, 1);
  const lig = clamp(l / 100, 0, 1);
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = lig - c / 2;
  const sector = Math.floor(hue / 60) % 6;
  const table = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x]
  ];
  const [r, g, b] = table[sector];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function parseColor(input) {
  const text = String(input ?? "").trim();
  if (!text) return null;
  const short = HEX_SHORT.exec(text);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16)
    };
  }
  const long = HEX_LONG.exec(text);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16)
    };
  }
  const rgb = RGB_FUNCTION.exec(text);
  if (rgb) {
    const [r, g, b] = numbers(rgb[1]);
    if (r === void 0 || g === void 0 || b === void 0) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) };
  }
  const hsl = HSL_FUNCTION.exec(text);
  if (hsl) {
    const [h, s, l] = numbers(hsl[1]);
    if (h === void 0 || s === void 0 || l === void 0) return null;
    return hslToRgb(h, s, l);
  }
  return null;
}
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function toLinear(channel) {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function toGamma(value) {
  const v = value <= 31308e-7 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return v;
}
function rgbToOklab(color) {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const lms1 = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lms2 = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lms3 = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(lms1);
  const m = Math.cbrt(lms2);
  const s = Math.cbrt(lms3);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}
function oklabToRaw(lab) {
  const l = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;
  return {
    r: toGamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    g: toGamma(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    b: toGamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3)
  };
}
function rgbToOklch(color) {
  const lab = rgbToOklab(color);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h: c < 1e-5 ? 0 : h };
}
function oklchToRaw(color) {
  const rad = color.h * Math.PI / 180;
  return oklabToRaw({ l: color.l, a: Math.cos(rad) * color.c, b: Math.sin(rad) * color.c });
}
function oklchToRgb(color) {
  let chroma = Math.max(0, color.c);
  for (let i = 0; i < 32; i++) {
    const raw = oklchToRaw({ l: clamp(color.l, 0, 1), c: chroma, h: color.h });
    if (raw.r >= -1e-3 && raw.r <= 1.001 && raw.g >= -1e-3 && raw.g <= 1.001 && raw.b >= -1e-3 && raw.b <= 1.001) {
      return {
        r: Math.round(clamp(raw.r, 0, 1) * 255),
        g: Math.round(clamp(raw.g, 0, 1) * 255),
        b: Math.round(clamp(raw.b, 0, 1) * 255)
      };
    }
    chroma *= 0.92;
  }
  const gray = oklchToRaw({ l: clamp(color.l, 0, 1), c: 0, h: color.h });
  return {
    r: Math.round(clamp(gray.r, 0, 1) * 255),
    g: Math.round(clamp(gray.g, 0, 1) * 255),
    b: Math.round(clamp(gray.b, 0, 1) * 255)
  };
}
function pad(value) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}
function toHex(color) {
  return `#${pad(color.r)}${pad(color.g)}${pad(color.b)}`;
}
function toRgba(color, alpha) {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${Number(alpha.toFixed(3))})`;
}
function oklchToHex(color) {
  return toHex(oklchToRgb(color));
}
function relativeLuminance(color) {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}
function contrastRatio(a, b) {
  const first = typeof a === "string" ? parseColor(a) : a;
  const second = typeof b === "string" ? parseColor(b) : b;
  if (!first || !second) return 1;
  const l1 = relativeLuminance(first);
  const l2 = relativeLuminance(second);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}
var WHITE = { r: 255, g: 255, b: 255 };
var BLACK = { r: 0, g: 0, b: 0 };
function contrastText(color) {
  const base = typeof color === "string" ? parseColor(color) : color;
  if (!base) return "#ffffff";
  return contrastRatio(base, WHITE) >= contrastRatio(base, BLACK) ? "#ffffff" : "#000000";
}
var SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
var LIGHT_L = [0.973, 0.941, 0.889, 0.819, 0.732, 0.638, 0.558, 0.478, 0.399, 0.327];
var LIGHT_C = [0.14, 0.26, 0.46, 0.68, 0.88, 1, 0.97, 0.89, 0.78, 0.65];
var DARK_L = [0.244, 0.286, 0.343, 0.408, 0.484, 0.588, 0.668, 0.748, 0.836, 0.928];
var DARK_C = [0.3, 0.42, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.57, 0.33];
function colorScale(color, dark = false) {
  const rgb = typeof color === "string" ? parseColor(color) ?? BLACK : color;
  const base = rgbToOklch(rgb);
  const lightness = dark ? DARK_L : LIGHT_L;
  const chroma = dark ? DARK_C : LIGHT_C;
  const out = {};
  SCALE_STEPS.forEach((step2, index) => {
    out[String(step2)] = oklchToHex({
      l: lightness[index],
      c: base.c * chroma[index],
      h: base.h
    });
  });
  return out;
}
var presets = {
  violeta: {
    primary: "#6D3BF5",
    accent: "#FF3D8B",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#E11D48",
    info: "#7C6BFF"
  },
  oceano: {
    primary: "#0E7BC4",
    accent: "#0FB5C9",
    success: "#0F9D6E",
    warning: "#D08700",
    danger: "#DC2F3E",
    info: "#3B82F6"
  },
  floresta: {
    primary: "#1F8A4C",
    accent: "#7FA80E",
    success: "#18A05A",
    warning: "#C97A0A",
    danger: "#C93A2E",
    info: "#2C8FA8"
  },
  poente: {
    primary: "#E4632A",
    accent: "#D62F63",
    success: "#3E9B52",
    warning: "#D99000",
    danger: "#D32F2F",
    info: "#B45FC0"
  },
  grafite: {
    primary: "#4C5A70",
    accent: "#2E7FD1",
    success: "#2F8F60",
    warning: "#B57A12",
    danger: "#C2453F",
    info: "#5B7A99"
  }
};
var ROLES = ["primary", "accent", "success", "warning", "danger", "info"];
var STORAGE_KEY = "voodoo:palette";
var STYLE_ID = "voodoo-palette";
var DEFAULT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
var DEFAULT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
function fontStack(font, fallback) {
  const name = (font ?? "").trim();
  if (!name) return fallback;
  if (name.includes(",")) return name;
  const quoted = /^['"]/.test(name) ? name : `'${name}'`;
  return `${quoted}, ${fallback}`;
}
var RADIUS_PATTERN = /^([\d.]+)(px|rem|em)$/;
function radiusScale(radius) {
  const text = (radius || "12px").trim();
  const match = RADIUS_PATTERN.exec(text);
  if (!match) {
    return {
      "--v-radius": text,
      "--v-radius-sm": `calc(${text} * 0.6)`,
      "--v-radius-lg": `calc(${text} * 1.5)`,
      "--v-radius-xl": `calc(${text} * 2)`,
      "--v-radius-full": "999px"
    };
  }
  const value = parseFloat(match[1]);
  const unit = match[2];
  const round = (n) => `${Math.round(n * 1e3) / 1e3}${unit}`;
  return {
    "--v-radius": round(value),
    "--v-radius-sm": round(Math.max(value * 0.55, 0)),
    "--v-radius-lg": round(value * 1.5),
    "--v-radius-xl": round(value * 2),
    "--v-radius-full": "999px"
  };
}
function buildTheme(colors, dark) {
  const vars = {};
  const scales = {};
  const contrast = {};
  for (const role of ROLES) {
    const rgb = parseColor(colors[role]) ?? BLACK;
    const base = rgbToOklch(rgb);
    const scale = colorScale(rgb, dark);
    scales[role] = scale;
    for (const step2 of SCALE_STEPS) {
      vars[`--v-${role}-${step2}`] = scale[String(step2)];
    }
    const main = dark ? { l: Math.max(base.l, 0.62), c: base.c * 0.95, h: base.h } : base;
    const hover = dark ? { l: Math.min(main.l + 0.07, 0.94), c: main.c * 0.95, h: main.h } : { l: Math.max(main.l - 0.055, 0.12), c: main.c, h: main.h };
    const active = dark ? { l: Math.min(main.l + 0.13, 0.97), c: main.c * 0.88, h: main.h } : { l: Math.max(main.l - 0.105, 0.1), c: main.c, h: main.h };
    const mainRgb = oklchToRgb(main);
    const hoverRgb = oklchToRgb(hover);
    const activeRgb = oklchToRgb(active);
    vars[`--v-${role}`] = dark ? toHex(mainRgb) : toHex(rgb);
    vars[`--v-${role}-hover`] = toHex(hoverRgb);
    vars[`--v-${role}-active`] = toHex(activeRgb);
    vars[`--v-${role}-contrast`] = contrastText(dark ? mainRgb : rgb);
    vars[`--v-${role}-contrast-hover`] = contrastText(hoverRgb);
    vars[`--v-${role}-contrast-active`] = contrastText(activeRgb);
    const soft = scale["50"];
    const softHover = scale["100"];
    const softText = dark ? scale["800"] : scale["700"];
    vars[`--v-${role}-soft`] = soft;
    vars[`--v-${role}-soft-hover`] = softHover;
    vars[`--v-${role}-soft-text`] = softText;
    vars[`--v-${role}-ring`] = toRgba(mainRgb, dark ? 0.45 : 0.32);
    vars[`--v-${role}-border`] = dark ? scale["300"] : scale["200"];
    contrast[role] = vars[`--v-${role}-contrast`];
  }
  const neutralRgb = parseColor(colors.neutral ?? colors.primary) ?? BLACK;
  const hue = rgbToOklch(neutralRgb).h;
  const neutral = (l, c) => oklchToHex({ l, c, h: hue });
  const neutralScale = {};
  SCALE_STEPS.forEach((step2, index) => {
    const lightnessList = dark ? DARK_L : LIGHT_L;
    neutralScale[String(step2)] = neutral(lightnessList[index], 0.012);
    vars[`--v-neutral-${step2}`] = neutralScale[String(step2)];
  });
  scales.neutral = neutralScale;
  if (dark) {
    vars["--v-surface"] = neutral(0.248, 0.021);
    vars["--v-surface-2"] = neutral(0.196, 0.021);
    vars["--v-surface-3"] = neutral(0.305, 0.024);
    vars["--v-surface-inset"] = neutral(0.17, 0.02);
    vars["--v-text"] = neutral(0.965, 8e-3);
    vars["--v-text-muted"] = neutral(0.748, 0.017);
    vars["--v-text-soft"] = neutral(0.63, 0.017);
    vars["--v-border"] = neutral(0.355, 0.023);
    vars["--v-border-strong"] = neutral(0.46, 0.026);
    vars["--v-overlay"] = "rgba(0, 0, 0, 0.62)";
    vars["--v-shadow-sm"] = "0 1px 2px rgba(0, 0, 0, 0.5)";
    vars["--v-shadow"] = "0 10px 30px rgba(0, 0, 0, 0.5)";
    vars["--v-shadow-lg"] = "0 24px 60px rgba(0, 0, 0, 0.62)";
  } else {
    const inkRgb = oklchToRgb({ l: 0.24, c: 0.028, h: hue });
    vars["--v-surface"] = neutral(1, 0);
    vars["--v-surface-2"] = neutral(0.981, 6e-3);
    vars["--v-surface-3"] = neutral(0.955, 9e-3);
    vars["--v-surface-inset"] = neutral(0.968, 8e-3);
    vars["--v-text"] = toHex(inkRgb);
    vars["--v-text-muted"] = neutral(0.53, 0.023);
    vars["--v-text-soft"] = neutral(0.655, 0.018);
    vars["--v-border"] = neutral(0.906, 0.012);
    vars["--v-border-strong"] = neutral(0.828, 0.016);
    vars["--v-overlay"] = toRgba(inkRgb, 0.45);
    vars["--v-shadow-sm"] = `0 1px 2px ${toRgba(inkRgb, 0.08)}`;
    vars["--v-shadow"] = `0 10px 30px ${toRgba(inkRgb, 0.14)}`;
    vars["--v-shadow-lg"] = `0 24px 60px ${toRgba(inkRgb, 0.2)}`;
  }
  vars["--v-focus-ring"] = vars["--v-primary-ring"];
  contrast.surface = contrastText(parseColor(vars["--v-surface"]) ?? WHITE);
  return { vars, scales, contrast };
}
function block(selector, vars) {
  const body = Object.entries(vars).map(([key, value]) => `  ${key}: ${value};`).join("\n");
  return `${selector} {
${body}
}`;
}
var current = null;
var currentOptions = null;
function resolveOptions(options) {
  const preset = presets[options.preset] ?? presets.violeta;
  const colors = {
    primary: options.primary ?? preset.primary,
    accent: options.accent ?? preset.accent,
    success: options.success ?? preset.success,
    warning: options.warning ?? preset.warning,
    danger: options.danger ?? preset.danger,
    info: options.info ?? preset.info,
    neutral: options.neutral ?? preset.neutral
  };
  for (const role of ROLES) {
    if (parseColor(colors[role])) continue;
    console.warn(`[Voodoo] invalid color in palette.${role}: "${colors[role]}". Using preset.`);
    colors[role] = preset[role];
  }
  return {
    colors,
    radius: options.radius ?? "12px",
    font: fontStack(options.font, DEFAULT_FONT),
    mono: fontStack(options.monoFont, DEFAULT_MONO)
  };
}
function writeStyle(css) {
  if (typeof document === "undefined") return;
  if (!config.injectStyles) return;
  ensureTokens();
  let element = document.getElementById(STYLE_ID);
  if (!element) {
    element = document.createElement("style");
    element.id = STYLE_ID;
    element.setAttribute("data-voodoo", "palette");
    document.head.appendChild(element);
  }
  element.textContent = css;
}
function applyPalette(options = {}) {
  const { colors, radius, font, mono } = resolveOptions(options);
  const light = buildTheme(colors, false);
  const dark = buildTheme(colors, true);
  const shared = {
    ...radiusScale(radius),
    "--v-font-sans": font,
    "--v-font-mono": mono
  };
  const css = [
    "/* Palette generated by V.palette(). Do not edit manually. */",
    block(":root", { ...shared, ...light.vars }),
    `@media (prefers-color-scheme: dark) {
${block(':root:not([data-theme="light"])', dark.vars)}
}`,
    block(':root[data-theme="dark"]', dark.vars)
  ].join("\n");
  writeStyle(css);
  const resolved = {
    colors,
    radius,
    font,
    monoFont: mono,
    light: light.scales,
    dark: dark.scales,
    contrast: light.contrast,
    css
  };
  current = resolved;
  currentOptions = { ...options };
  if (options.persist !== false && typeof document !== "undefined") {
    const saved = { ...options };
    delete saved.persist;
    storage.set(STORAGE_KEY, saved);
  }
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("voodoo:palette", { detail: resolved }));
  }
  return resolved;
}
var initialized2 = false;
function initPalette() {
  if (current && initialized2) return current;
  initialized2 = true;
  const saved = storage.get(STORAGE_KEY);
  const options = saved && typeof saved === "object" ? { ...saved, persist: false } : { persist: false };
  return applyPalette(options);
}
function ensurePalette() {
  if (current) return;
  initPalette();
}
var palette = Object.assign(applyPalette, {
  /** Ready-made presets, indexed by name. */
  presets,
  /** Names of available presets. */
  get names() {
    return Object.keys(presets);
  },
  /** Palette in use, or `null` before the first application. */
  get current() {
    return current;
  },
  /** Options used in the last application. */
  get options() {
    return currentOptions;
  },
  /** Apply the saved palette, or the default when there is nothing saved. */
  init: initPalette,
  /** Ensure variables exist, without overwriting what has already been applied. */
  ensure: ensurePalette,
  /** Return to the default preset and clear the saved choice. */
  reset() {
    storage.remove(STORAGE_KEY);
    return applyPalette({ persist: false });
  },
  /** Change only the preset, maintaining current radius and font. */
  use(name) {
    return applyPalette({ ...currentOptions ?? {}, preset: name, primary: void 0, accent: void 0 });
  },
  /** Scale of tones for any color. */
  scale: colorScale,
  /** Black or white, depending on the best WCAG contrast over the color. */
  contrastText,
  /** WCAG contrast ratio between two colors. */
  contrastRatio,
  /** WCAG relative luminance of a color. */
  luminance(color) {
    const rgb = typeof color === "string" ? parseColor(color) : color;
    return rgb ? relativeLuminance(rgb) : 0;
  },
  /** Converters exposed for those who want to generate derived colors. */
  convert: { parseColor, rgbToOklch, oklchToRgb, toHex, toRgba }
});

// src/ui/dialog.ts
var labels = {
  confirm: "Confirm",
  cancel: "Cancel",
  ok: "OK",
  close: "Close",
  confirmQuestion: "Are you sure?",
  required: "Please fill in this field."
};
var settings2 = {
  /** Duration of entrance and exit animation, in milliseconds. */
  duration: 220,
  /** Default size of dialogs created by `dialog()`. */
  size: "md"
};
var CSS4 = `
[v-modal-content]:not(.v-dialog-open),[data-v-modal-content]:not(.v-dialog-open){display:none}

.v-dialog-root{position:fixed;inset:0;z-index:calc(var(--v-z-modal,1000) + var(--v-dialog-layer,0));
  display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;
  overscroll-behavior:contain;font-family:var(--v-font-sans,system-ui,sans-serif)}
.v-dialog-root[data-position="top"]{align-items:flex-start;padding-top:min(12vh,96px)}

.v-dialog-backdrop{position:fixed;inset:0;background:var(--v-overlay,rgba(20,17,31,.45));
  opacity:0;transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-backdrop{opacity:1}
.v-dialog-root.is-closing>.v-dialog-backdrop{opacity:0}

.v-dialog-panel{position:relative;z-index:1;width:100%;max-width:var(--v-dialog-w,32rem);
  max-height:calc(100vh - 32px);display:flex;flex-direction:column;
  background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-lg,18px);
  box-shadow:var(--v-shadow-lg,0 24px 60px rgba(20,17,31,.2));
  opacity:0;transform:translateY(14px) scale(.975);
  transition:opacity var(--v-dialog-ms,220ms) var(--v-ease,ease),transform var(--v-dialog-ms,220ms) var(--v-ease,ease)}
.v-dialog-root.is-open>.v-dialog-panel{opacity:1;transform:none}
.v-dialog-root.is-closing>.v-dialog-panel{opacity:0;transform:translateY(10px) scale(.985)}
.v-dialog-panel:focus{outline:none}
.v-dialog-panel.is-plain{background:none;border:0;box-shadow:none}

.v-dialog-root[data-size="sm"]{--v-dialog-w:24rem}
.v-dialog-root[data-size="md"]{--v-dialog-w:32rem}
.v-dialog-root[data-size="lg"]{--v-dialog-w:46rem}
.v-dialog-root[data-size="xl"]{--v-dialog-w:64rem}
.v-dialog-root[data-size="full"]{--v-dialog-w:calc(100vw - 32px)}

.v-dialog-head{display:flex;gap:14px;align-items:flex-start;padding:22px 22px 0}
.v-dialog-icon{flex:none;width:38px;height:38px;border-radius:var(--v-radius-full,999px);
  display:grid;place-items:center;background:var(--v-primary-soft,#EEE9FF);color:var(--v-primary-soft-text,#4B21B8)}
.v-dialog-icon svg{width:20px;height:20px}
.v-dialog-icon[data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-dialog-icon[data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text)}
.v-dialog-icon[data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-dialog-heading{flex:1;min-width:0}
.v-dialog-title{margin:0;font-size:17px;font-weight:650;line-height:1.35;color:var(--v-text,#14111F)}
.v-dialog-desc{margin:6px 0 0;font-size:14px;line-height:1.55;color:var(--v-text-muted,#6B6580)}

.v-dialog-body{padding:16px 22px;overflow:auto;font-size:14px;line-height:1.6;color:var(--v-text,#14111F)}
.v-dialog-head+.v-dialog-body{padding-top:14px}
.v-dialog-body>p{margin:0 0 10px}
.v-dialog-body>p:last-child{margin-bottom:0}

.v-dialog-foot{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;padding:6px 22px 20px}

.v-dialog-x{position:absolute;top:12px;right:12px;width:32px;height:32px;display:grid;place-items:center;
  border:0;border-radius:var(--v-radius-sm,8px);background:transparent;color:var(--v-text-muted,#6B6580);
  cursor:pointer;transition:background .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dialog-x:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text,#14111F)}
.v-dialog-x:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dialog-x svg{width:16px;height:16px}

.v-dlg-btn{appearance:none;-webkit-appearance:none;display:inline-flex;align-items:center;justify-content:center;
  gap:8px;min-height:38px;padding:0 16px;border-radius:var(--v-radius-sm,8px);border:1px solid transparent;
  font-family:inherit;font-size:14px;font-weight:600;line-height:1;cursor:pointer;
  transition:background .15s var(--v-ease,ease),border-color .15s var(--v-ease,ease),color .15s var(--v-ease,ease)}
.v-dlg-btn:focus-visible{outline:2px solid var(--v-focus-ring,#6D3BF5);outline-offset:2px}
.v-dlg-btn[disabled]{opacity:.55;cursor:not-allowed}

.v-dlg-btn[data-variant="primary"]{background:var(--v-primary);color:var(--v-primary-contrast);border-color:var(--v-primary)}
.v-dlg-btn[data-variant="primary"]:hover{background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-dlg-btn[data-variant="danger"]{background:var(--v-danger);color:var(--v-danger-contrast);border-color:var(--v-danger)}
.v-dlg-btn[data-variant="danger"]:hover{background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-dlg-btn[data-variant="success"]{background:var(--v-success);color:var(--v-success-contrast);border-color:var(--v-success)}
.v-dlg-btn[data-variant="success"]:hover{background:var(--v-success-hover);border-color:var(--v-success-hover);color:var(--v-success-contrast-hover)}
.v-dlg-btn[data-variant="secondary"]{background:var(--v-surface);color:var(--v-text);border-color:var(--v-border-strong,#CFC6E4)}
.v-dlg-btn[data-variant="secondary"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}
.v-dlg-btn[data-variant="ghost"]{background:transparent;color:var(--v-text-muted);border-color:transparent}
.v-dlg-btn[data-variant="ghost"]:hover{background:var(--v-surface-3,#F1EDF7);color:var(--v-text)}

.v-dialog-field{display:flex;flex-direction:column;gap:6px}
.v-dialog-label{font-size:13px;font-weight:600;color:var(--v-text,#14111F)}
.v-dialog-input{appearance:none;-webkit-appearance:none;width:100%;min-height:40px;padding:9px 12px;
  font-family:inherit;font-size:14px;line-height:1.4;color:var(--v-text,#14111F);
  background:var(--v-surface,#fff);border:1px solid var(--v-border,#E6E0F0);
  border-radius:var(--v-radius-sm,8px);transition:border-color .15s var(--v-ease,ease),box-shadow .15s var(--v-ease,ease)}
textarea.v-dialog-input{min-height:96px;resize:vertical}
.v-dialog-input::placeholder{color:var(--v-text-soft,#9A93B4)}
.v-dialog-input:focus{outline:none;border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring,rgba(109,59,245,.32))}
.v-dialog-input[aria-invalid="true"]{border-color:var(--v-danger)}
.v-dialog-input[aria-invalid="true"]:focus{box-shadow:0 0 0 3px var(--v-danger-ring)}
.v-dialog-hint{font-size:12.5px;line-height:1.45;color:var(--v-text-muted,#6B6580)}
.v-dialog-error{font-size:12.5px;line-height:1.45;font-weight:600;color:var(--v-danger)}

@media (max-width:520px){
  .v-dialog-root{padding:12px}
  .v-dialog-foot{flex-direction:column-reverse}
  .v-dlg-btn{width:100%}
}
@media (prefers-reduced-motion: reduce){
  .v-dialog-backdrop,.v-dialog-panel{transition:none}
}
`;
function ensureStyles3() {
  ensureTokens();
  ensurePalette();
  injectStyle("dialog", CSS4);
}
var ICONS2 = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.2"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.2 12.3 2.6 2.6 5-5.2"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4.6 2.9 19.4h18.2z"/><path d="M12 10v4M12 17.2v.2"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.8.7-.8 1.3v.5M12 16.6v.2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};
var stack = [];
var byRoot = /* @__PURE__ */ new WeakMap();
var scrollLocks2 = 0;
var previousOverflow = "";
var previousPaddingRight = "";
function lockScroll2() {
  if (scrollLocks2++ > 0) return;
  const body = document.body;
  previousOverflow = body.style.overflow;
  previousPaddingRight = body.style.paddingRight;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (gap > 0) {
    const current2 = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current2 + gap}px`;
  }
}
function unlockScroll2() {
  if (scrollLocks2 === 0) return;
  if (--scrollLocks2 > 0) return;
  document.body.style.overflow = previousOverflow;
  document.body.style.paddingRight = previousPaddingRight;
}
var FOCUSABLE2 = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),iframe,object,embed,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
function focusableIn2(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE2)).filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}
function top() {
  return stack[stack.length - 1];
}
function reducedMotion() {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
var listening = false;
function onKeydown(event) {
  const entry = top();
  if (!entry) return;
  if (event.key === "Escape") {
    if (entry.options.closeOnEscape === false) return;
    event.preventDefault();
    entry.handle.close(void 0);
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusableIn2(entry.handle.panel);
  if (!items.length) {
    event.preventDefault();
    entry.handle.panel.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !entry.handle.panel.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
function onFocusIn(event) {
  const entry = top();
  if (!entry) return;
  const target = event.target;
  if (target && entry.handle.root.contains(target)) return;
  const items = focusableIn2(entry.handle.panel);
  (items[0] ?? entry.handle.panel).focus();
}
function startListening() {
  if (listening) return;
  listening = true;
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("focusin", onFocusIn, true);
}
function stopListening() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("keydown", onKeydown, true);
  document.removeEventListener("focusin", onFocusIn, true);
}
function openDialog(request2) {
  ensureStyles3();
  const id = uid("v-dialog-");
  const duration = reducedMotion() ? 0 : settings2.duration;
  const root = document.createElement("div");
  root.className = "v-dialog-root";
  root.id = id;
  root.setAttribute("data-size", request2.size ?? settings2.size);
  root.setAttribute("data-position", request2.position ?? "center");
  root.style.setProperty("--v-dialog-ms", `${duration}ms`);
  root.style.setProperty("--v-dialog-layer", String(stack.length * 2));
  const backdrop = document.createElement("div");
  backdrop.className = "v-dialog-backdrop";
  root.appendChild(backdrop);
  const panel = document.createElement("div");
  panel.className = "v-dialog-panel";
  if (request2.plain) panel.classList.add("is-plain");
  if (request2.className) panel.classList.add(...request2.className.split(/\s+/).filter(Boolean));
  panel.setAttribute("role", request2.role ?? "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.tabIndex = -1;
  if (request2.labelledBy) panel.setAttribute("aria-labelledby", request2.labelledBy);
  else if (request2.ariaLabel) panel.setAttribute("aria-label", request2.ariaLabel);
  if (request2.describedBy) panel.setAttribute("aria-describedby", request2.describedBy);
  root.appendChild(panel);
  const body = document.createElement("div");
  body.className = "v-dialog-body";
  if (request2.source) {
    const anchor = document.createComment(" v-modal ");
    request2.source.parentNode?.insertBefore(anchor, request2.source);
    sourceAnchors.set(request2.source, anchor);
    request2.source.classList.add("v-dialog-open");
    request2.source.removeAttribute("hidden");
    body.appendChild(request2.source);
  } else if (request2.content) {
    body.appendChild(request2.content);
  }
  panel.appendChild(body);
  if (request2.closable !== false) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "v-dialog-x";
    close.setAttribute("aria-label", labels.close);
    close.innerHTML = ICONS2.close;
    close.addEventListener("click", () => handle.close(void 0));
    panel.appendChild(close);
  }
  let settled = false;
  let resolveClosed = () => void 0;
  const closed = new Promise((resolve2) => {
    resolveClosed = resolve2;
  });
  const handle = {
    id,
    root,
    panel,
    body,
    key: request2.key ?? null,
    source: request2.source ?? null,
    closed,
    close(result) {
      if (settled) return;
      settled = true;
      const index = stack.findIndex((item) => item.handle === handle);
      if (index > -1) stack.splice(index, 1);
      byRoot.delete(root);
      if (entry.locked) unlockScroll2();
      if (!stack.length) stopListening();
      root.classList.remove("is-open");
      root.classList.add("is-closing");
      const finish = () => {
        const source = request2.source;
        if (source) {
          const anchor = sourceAnchors.get(source);
          source.classList.remove("v-dialog-open");
          if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(source, anchor);
            anchor.remove();
          } else {
            source.remove();
          }
          sourceAnchors.delete(source);
          if (hasDirective(source, "modal-content")) {
            source.setAttribute("hidden", "");
          }
        }
        root.remove();
        request2.onClose?.(result, handle);
        resolveClosed(result);
        if (request2.restoreFocus !== false) {
          const previous = entry.previousFocus;
          if (previous && typeof previous.focus === "function" && previous.isConnected) {
            previous.focus();
          }
        }
      };
      if (duration > 0) setTimeout(finish, duration);
      else finish();
    }
  };
  const entry = {
    handle,
    options: request2,
    previousFocus: document.activeElement,
    locked: request2.lockScroll !== false
  };
  backdrop.addEventListener("click", () => {
    if (request2.closeOnBackdrop === false) return;
    handle.close(void 0);
  });
  if (entry.locked) lockScroll2();
  stack.push(entry);
  byRoot.set(root, entry);
  startListening();
  document.body.appendChild(root);
  requestAnimationFrame(() => {
    root.classList.add("is-open");
    const target = resolveInitialFocus(request2, panel);
    target?.focus();
  });
  request2.onOpen?.(handle);
  return handle;
}
var sourceAnchors = /* @__PURE__ */ new WeakMap();
function resolveInitialFocus(request2, panel) {
  const wanted = request2.initialFocus;
  if (wanted instanceof HTMLElement) return wanted;
  if (typeof wanted === "string") {
    const found = panel.querySelector(wanted);
    if (found) return found;
  }
  const auto = panel.querySelector("[autofocus],[data-autofocus]");
  if (auto) return auto;
  const items = focusableIn2(panel);
  return items[0] ?? panel;
}
function resolveTarget2(target) {
  if (target instanceof HTMLElement) return target;
  const selector = String(target ?? "").trim();
  if (!selector) return null;
  const query2 = /^[\w-]+$/.test(selector) ? `#${selector}` : selector;
  return document.querySelector(query2);
}
function keyOf(target) {
  if (typeof target === "string") return target.trim() || null;
  return target.id ? `#${target.id}` : null;
}
function findByKey(key) {
  const normalized = /^[\w-]+$/.test(key) ? `#${key}` : key;
  return stack.find((entry) => {
    if (entry.handle.key === key || entry.handle.key === normalized) return true;
    const source = entry.handle.source;
    return !!source && source.matches?.(normalized);
  });
}
var modal = {
  /** Open a page element as a modal. Accepts a selector or the element itself. */
  open(target, options = {}) {
    const element = resolveTarget2(target);
    if (!element) {
      console.warn(`[Voodoo] modal.open: target not found (${String(target)}).`);
      return null;
    }
    const key = keyOf(target) ?? (element.id ? `#${element.id}` : null);
    const existing = key ? findByKey(key) : void 0;
    if (existing) return existing.handle;
    const heading = element.querySelector("[data-dialog-title],h1,h2,h3");
    if (heading && !heading.id) heading.id = uid("v-dialog-title-");
    return openDialog({
      ...options,
      source: element,
      key,
      labelledBy: heading?.id ?? null
    });
  },
  /** Close the indicated modal, or the one at the top of the stack. */
  close(target, result) {
    if (target === void 0) {
      top()?.handle.close(result);
      return;
    }
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    entry?.handle.close(result);
  },
  /** Close all open dialogs, from top to bottom. */
  closeAll(result) {
    for (const entry of [...stack].reverse()) entry.handle.close(result);
  },
  /** Open if closed, close if open. */
  toggle(target, options = {}) {
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    if (entry) {
      entry.handle.close(void 0);
      return null;
    }
    return this.open(target, options);
  },
  /** Check if a specific modal, or any, is open. */
  isOpen(target) {
    if (target === void 0) return stack.length > 0;
    const key = keyOf(target);
    return !!(key && findByKey(key));
  },
  /** Open dialogs, from oldest to newest. */
  get opened() {
    return stack.map((entry) => entry.handle);
  },
  /** Number of open dialogs. */
  get count() {
    return stack.length;
  },
  /** Adjust animation duration and default size. */
  configure(options) {
    Object.assign(settings2, options);
  },
  /** Change the default button texts. */
  labels(next) {
    Object.assign(labels, next);
    return labels;
  }
};
function dialog(options) {
  ensureStyles3();
  const fragment = document.createDocumentFragment();
  const titleId = options.title ? uid("v-dialog-title-") : null;
  const descId = options.description ? uid("v-dialog-desc-") : null;
  let head = null;
  if (options.title || options.description || options.icon) {
    head = document.createElement("div");
    head.className = "v-dialog-head";
    const iconName = options.icon && options.icon !== "none" ? options.icon : null;
    if (iconName && ICONS2[iconName]) {
      const icon = document.createElement("div");
      icon.className = "v-dialog-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("data-tone", options.tone ?? toneOfIcon(iconName));
      icon.innerHTML = ICONS2[iconName];
      head.appendChild(icon);
    }
    const heading = document.createElement("div");
    heading.className = "v-dialog-heading";
    if (options.title) {
      const title = document.createElement("h2");
      title.className = "v-dialog-title";
      title.id = titleId;
      title.textContent = options.title;
      heading.appendChild(title);
    }
    if (options.description) {
      const desc = document.createElement("p");
      desc.className = "v-dialog-desc";
      desc.id = descId;
      desc.textContent = options.description;
      heading.appendChild(desc);
    }
    head.appendChild(heading);
  }
  const content = document.createDocumentFragment();
  if (options.text) {
    for (const line of options.text.split("\n")) {
      const p2 = document.createElement("p");
      p2.textContent = line;
      content.appendChild(p2);
    }
  }
  if (options.html) {
    const holder = document.createElement("div");
    holder.innerHTML = options.html;
    while (holder.firstChild) content.appendChild(holder.firstChild);
  }
  if (options.node) content.appendChild(options.node);
  fragment.appendChild(content);
  const buttons = options.buttons ?? [
    { label: labels.ok, value: true, variant: "primary", autofocus: true }
  ];
  return new Promise((resolve2) => {
    const handle = openDialog({
      ...options,
      content: fragment,
      role: options.tone === "danger" ? "alertdialog" : "dialog",
      labelledBy: titleId,
      describedBy: descId,
      key: null,
      onClose(result) {
        options.onClose?.(result, handle);
        resolve2(result === void 0 ? null : result);
      }
    });
    if (head) handle.panel.insertBefore(head, handle.body);
    if (buttons.length) {
      const foot = document.createElement("div");
      foot.className = "v-dialog-foot";
      for (const button of buttons) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "v-dlg-btn";
        element.setAttribute("data-variant", button.variant ?? "secondary");
        element.textContent = button.label;
        if (button.autofocus) element.setAttribute("data-autofocus", "");
        element.addEventListener("click", () => {
          const outcome = button.onClick?.(handle);
          if (outcome === false) return;
          if (button.close === false) return;
          handle.close(button.value ?? null);
        });
        foot.appendChild(element);
      }
      handle.panel.appendChild(foot);
    }
    if (!handle.body.childNodes.length) handle.body.remove();
  });
}
function toneOfIcon(icon) {
  if (icon === "success" || icon === "warning" || icon === "danger") return icon;
  return "default";
}
function alert(message, options = {}) {
  return dialog({
    icon: "info",
    size: "sm",
    ...options,
    text: message,
    buttons: [
      {
        label: options.confirmLabel ?? labels.ok,
        value: true,
        variant: options.tone === "danger" ? "danger" : "primary",
        autofocus: true
      }
    ]
  }).then(() => void 0);
}
function confirm(message, options = {}) {
  const tone = options.danger ? "danger" : options.tone ?? "default";
  return dialog({
    icon: tone === "danger" ? "warning" : "question",
    size: "sm",
    ...options,
    tone,
    text: message,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: false, variant: "secondary" },
      {
        label: options.confirmLabel ?? labels.confirm,
        value: true,
        variant: tone === "danger" ? "danger" : "primary",
        autofocus: true
      }
    ]
  }).then((result) => result === true);
}
function prompt(label, options = {}) {
  ensureStyles3();
  const type = options.type ?? "text";
  const fieldId = uid("v-prompt-");
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const field = document.createElement("div");
  field.className = "v-dialog-field";
  const labelElement = document.createElement("label");
  labelElement.className = "v-dialog-label";
  labelElement.htmlFor = fieldId;
  labelElement.textContent = label;
  field.appendChild(labelElement);
  const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  input.className = "v-dialog-input";
  input.id = fieldId;
  if (input instanceof HTMLInputElement) input.type = type === "textarea" ? "text" : type;
  input.value = options.value ?? "";
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.required) input.required = true;
  input.setAttribute("data-autofocus", "");
  field.appendChild(input);
  if (options.hint) {
    const hint = document.createElement("p");
    hint.className = "v-dialog-hint";
    hint.id = hintId;
    hint.textContent = options.hint;
    field.appendChild(hint);
    input.setAttribute("aria-describedby", hintId);
  }
  const error = document.createElement("p");
  error.className = "v-dialog-error";
  error.id = errorId;
  error.hidden = true;
  error.setAttribute("role", "alert");
  field.appendChild(error);
  const readValue = () => type === "number" ? input.value.trim() : input.value;
  const check = (handle) => {
    const value = readValue();
    let message = null;
    if (options.required && !value.trim()) message = labels.required;
    else message = options.validate?.(value) ?? null;
    if (message) {
      error.textContent = message;
      error.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", errorId);
      input.focus();
      return false;
    }
    error.hidden = true;
    input.removeAttribute("aria-invalid");
    handle.close(value);
    return true;
  };
  let confirmHandle = null;
  const control = input;
  control.addEventListener("keydown", (event) => {
    const key = event;
    if (key.key !== "Enter") return;
    if (type === "textarea" && !key.ctrlKey && !key.metaKey) return;
    event.preventDefault();
    if (confirmHandle) check(confirmHandle);
  });
  return dialog({
    icon: "question",
    size: "sm",
    ...options,
    node: field,
    text: void 0,
    buttons: [
      { label: options.cancelLabel ?? labels.cancel, value: null, variant: "secondary" },
      {
        label: options.confirmLabel ?? labels.confirm,
        variant: "primary",
        close: false,
        onClick(handle) {
          confirmHandle = handle;
          check(handle);
          return false;
        }
      }
    ],
    onOpen(handle) {
      confirmHandle = handle;
      options.onOpen?.(handle);
    }
  }).then((result) => typeof result === "string" ? result : null);
}
defineDirective("modal", ({ el, expression, modifiers, cleanup }) => {
  const target = expression.trim();
  el.setAttribute("aria-haspopup", "dialog");
  const handler = (event) => {
    event.preventDefault();
    if (modifiers.close) {
      modal.close(target || void 0);
      return;
    }
    if (modifiers.toggle) {
      if (target) modal.toggle(target);
      return;
    }
    if (target) modal.open(target);
  };
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
defineDirective(
  "modal-content",
  ({ el }) => {
    ensureStyles3();
    if (!el.id) el.id = uid("v-modal-");
    if (!el.classList.contains("v-dialog-open")) el.setAttribute("hidden", "");
  },
  { priority: PRIORITY.REF }
);
defineDirective("modal-close", ({ el, expression, cleanup }) => {
  const handler = (event) => {
    event.preventDefault();
    const root = el.closest(".v-dialog-root");
    const entry = root ? byRoot.get(root) : void 0;
    if (entry) entry.handle.close(expression.trim() || void 0);
    else modal.close(void 0, expression.trim() || void 0);
  };
  el.addEventListener("click", handler);
  cleanup(() => el.removeEventListener("click", handler));
});
var replaying = false;
defineDirective(
  "confirm",
  ({ el, expression, modifiers, cleanup }) => {
    const message = expression.trim() || labels.confirmQuestion;
    const guard = (event) => {
      if (replaying) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const origin = event.target instanceof HTMLElement ? event.target : el;
      const title = readAttr(el, `${config.prefix}confirm-title`) ?? void 0;
      const confirmLabel = readAttr(el, `${config.prefix}confirm-label`) ?? void 0;
      const cancelLabel = readAttr(el, `${config.prefix}confirm-cancel`) ?? void 0;
      void confirm(message, {
        title,
        confirmLabel,
        cancelLabel,
        danger: !!modifiers.danger,
        size: "sm"
      }).then((ok) => {
        if (!ok) return;
        replaying = true;
        try {
          origin.click();
        } finally {
          replaying = false;
        }
      });
    };
    el.addEventListener("click", guard, true);
    cleanup(() => el.removeEventListener("click", guard, true));
  },
  { priority: PRIORITY.REF }
);
magic("$modal", () => modal);
magic("$dialog", () => dialog);
magic("$alert", () => alert);
magic("$confirm", () => confirm);
magic("$prompt", () => prompt);

// src/forms/mask.ts
init_reactivity();
init_registry();
var masks = /* @__PURE__ */ new Map();
function registerMask(name, patternOrFn) {
  masks.set(name.trim().toLowerCase(), patternOrFn);
}
var TOKENS = {
  "9": /\d/,
  A: /[A-Za-zÀ-ÖØ-öø-ÿ]/,
  S: /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/,
  "*": /[\s\S]/
};
var RELEVANT = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;
var RIGHT_TO_LEFT = /* @__PURE__ */ new Set(["currency", "percent"]);
function formatWithPattern(value, pattern) {
  let out = "";
  let index = 0;
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\") {
      const literal = pattern[++i];
      if (literal === void 0) break;
      if (index >= value.length) break;
      out += literal;
      continue;
    }
    const token = TOKENS[char];
    if (token) {
      while (index < value.length && !token.test(value[index])) index++;
      if (index >= value.length) break;
      out += value[index++];
      continue;
    }
    if (index >= value.length) break;
    if (value[index] === char) index++;
    out += char;
  }
  return out;
}
function maskCurrency(value, options = {}) {
  const decimals = Math.max(0, Math.trunc(options.decimals ?? 2));
  const decimal = options.decimal ?? ",";
  const thousands = options.thousands ?? ".";
  const prefix = options.prefix ?? "R$ ";
  const suffix = options.suffix ?? "";
  const text = String(value ?? "");
  const negative = text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  const padded = digits.padStart(decimals + 1, "0");
  const whole = decimals ? padded.slice(0, padded.length - decimals) : padded;
  const fraction = decimals ? padded.slice(padded.length - decimals) : "";
  const clean = whole.replace(/^0+(?=\d)/, "");
  const grouped = clean.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  return `${negative ? "-" : ""}${prefix}${grouped}${decimals ? decimal + fraction : ""}${suffix}`;
}
function maskPercent(value, decimals = 2) {
  return maskCurrency(value, { prefix: "", suffix: "%", decimals });
}
registerMask("cpf", "999.999.999-99");
registerMask("cnpj", "99.999.999/9999-99");
registerMask("cep", "99999-999");
registerMask("date", "99/99/9999");
registerMask("time", "99:99");
registerMask("datetime", "99/99/9999 99:99");
registerMask("cvv", "9999");
registerMask("cpfcnpj", (value) => {
  const digits = value.replace(/\D/g, "");
  return formatWithPattern(digits, digits.length <= 11 ? "999.999.999-99" : "99.999.999/9999-99");
});
registerMask("phone", (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return formatWithPattern(digits, digits.length <= 10 ? "(99) 9999-9999" : "(99) 99999-9999");
});
registerMask("currency", (value) => maskCurrency(value));
registerMask("percent", (value) => maskPercent(value));
registerMask("card", (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  if (/^3[47]/.test(digits)) return formatWithPattern(digits, "9999 999999 99999");
  if (digits.length > 16) return formatWithPattern(digits, "9999 9999 9999 9999 999");
  return formatWithPattern(digits, "9999 9999 9999 9999");
});
registerMask("plate", (value) => {
  const clean = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 7);
  const oldFormat = clean.length >= 5 && /\d/.test(clean[4]);
  return formatWithPattern(clean, oldFormat ? "AAA-9999" : "AAA9A99");
});
registerMask("hex", (value) => {
  const clean = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, 6);
  return clean ? `#${clean}` : "";
});
registerMask("ip", (value) => {
  const parts = value.replace(/[^\d.]/g, "").split(".").slice(0, 4);
  const groups = [];
  for (const part of parts) {
    if (part === "") {
      groups.push("");
      continue;
    }
    const clamped = Math.min(255, Number(part.slice(0, 3)));
    groups.push(String(clamped));
  }
  return groups.join(".");
});
function applyMask(value, pattern) {
  const text = value == null ? "" : String(value);
  if (!pattern) return text;
  const named = masks.get(pattern.trim().toLowerCase());
  if (typeof named === "function") return named(text);
  return formatWithPattern(text, typeof named === "string" ? named : pattern);
}
function unmask(value, pattern) {
  const text = value == null ? "" : String(value);
  const key = pattern ? pattern.trim().toLowerCase() : "";
  if (key && RIGHT_TO_LEFT.has(key)) {
    const negative = text.trim().startsWith("-");
    const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (!digits) return "";
    const padded = digits.padStart(3, "0");
    const numeric = `${padded.slice(0, padded.length - 2)}.${padded.slice(padded.length - 2)}`;
    return negative ? `-${numeric}` : numeric;
  }
  return text.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
}
var mask = Object.assign(
  (value, pattern) => applyMask(value, pattern),
  {
    apply: applyMask,
    unmask,
    register: registerMask,
    currency: maskCurrency,
    percent: maskPercent,
    presets: masks
  }
);
function isRelevant(char) {
  return char !== void 0 && RELEVANT.test(char);
}
function countRelevant(text, upTo) {
  let total = 0;
  const limit = Math.min(upTo, text.length);
  for (let i = 0; i < limit; i++) if (isRelevant(text[i])) total++;
  return total;
}
function caretForCount(text, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (!isRelevant(text[i])) continue;
    seen++;
    if (seen === count) return i + 1;
  }
  return text.length;
}
var masked = /* @__PURE__ */ new WeakSet();
function installMask(input, options, cleanup) {
  if (masked.has(input)) return;
  masked.add(input);
  const prototype = Object.getPrototypeOf(input);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value") ?? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const nativeGet = descriptor?.get;
  const nativeSet = descriptor?.set;
  const readRaw = () => nativeGet ? String(nativeGet.call(input)) : String(input.getAttribute("value") ?? "");
  const writeRaw = (value) => {
    if (nativeSet) nativeSet.call(input, value);
    else input.setAttribute("value", value);
  };
  const setCaret = (position) => {
    try {
      input.setSelectionRange(position, position);
    } catch {
    }
  };
  if (nativeGet && nativeSet) {
    Object.defineProperty(input, "value", {
      configurable: true,
      enumerable: true,
      get() {
        const current2 = String(nativeGet.call(input));
        return options.clean ? options.clean(current2) : current2;
      },
      set(next) {
        nativeSet.call(input, options.format(next == null ? "" : String(next)));
      }
    });
    cleanup(() => {
      const current2 = readRaw();
      Reflect.deleteProperty(input, "value");
      writeRaw(current2);
    });
  }
  const reformat = () => {
    const raw = readRaw();
    const caret = input.selectionStart ?? raw.length;
    const before = countRelevant(raw, caret);
    const formatted = options.format(raw);
    if (formatted !== raw) writeRaw(formatted);
    if (options.rightToLeft) setCaret(Math.max(0, formatted.length - (options.suffixLength ?? 0)));
    else setCaret(caretForCount(formatted, before));
  };
  const onInput = () => reformat();
  const onKeyDown = (event) => {
    if (event.key !== "Backspace") return;
    const start2 = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    if (start2 !== end || start2 === 0) return;
    const text = readRaw();
    if (isRelevant(text[start2 - 1])) return;
    let index = start2 - 1;
    while (index >= 0 && !isRelevant(text[index])) index--;
    event.preventDefault();
    if (index < 0) return;
    const next = text.slice(0, index) + text.slice(start2);
    const keep = countRelevant(next, index);
    writeRaw(options.format(next));
    setCaret(caretForCount(readRaw(), keep));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  cleanup(() => {
    masked.delete(input);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onKeyDown);
  });
  const initial = readRaw();
  if (initial) writeRaw(options.format(initial));
}
function maskableInput(el, directive2) {
  if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
    warn(`${config.prefix}${directive2} only works on input or textarea.`);
    return null;
  }
  const input = el;
  const type = (input.getAttribute("type") || "text").toLowerCase();
  if (type === "number" || type === "range" || type === "date" || type === "color") {
    warn(`${config.prefix}${directive2} doesn't work with input type="${type}". Use type="text".`);
    return null;
  }
  return input;
}
defineDirective(
  "mask",
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, "mask");
    if (!input) return;
    const pattern = expression.trim();
    if (!pattern) {
      warn(`${config.prefix}mask needs a pattern or mask name.`);
      return;
    }
    const key = pattern.toLowerCase();
    const wantsClean = !!modifiers.unmask || !!modifiers.raw;
    installMask(
      input,
      {
        format: (value) => applyMask(value, pattern),
        clean: wantsClean ? (value) => unmask(value, key) : void 0,
        rightToLeft: RIGHT_TO_LEFT.has(key),
        suffixLength: key === "percent" ? 1 : 0
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);
defineDirective(
  "mask-currency",
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, "mask-currency");
    if (!input) return;
    const attr2 = (name) => el.getAttribute(`${config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
    const rawDecimals = (typeof modifiers.decimals === "string" ? modifiers.decimals : null) ?? attr2("mask-decimals");
    const decimals = rawDecimals !== null && rawDecimals !== "" ? Number(rawDecimals) : 2;
    const prefixoDeclarado = expression.trim() ? expression : "";
    const options = {
      prefix: modifiers.plain ? "" : prefixoDeclarado || attr2("mask-prefix") || "R$ ",
      suffix: attr2("mask-suffix") ?? "",
      decimals: Number.isFinite(decimals) ? decimals : 2,
      decimal: modifiers.dot ? "." : ",",
      thousands: modifiers.dot ? "," : "."
    };
    const wantsClean = !!modifiers.unmask || !!modifiers.raw;
    const places = options.decimals ?? 2;
    installMask(
      input,
      {
        format: (value) => maskCurrency(value, options),
        clean: wantsClean ? (value) => {
          const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
          if (!digits) return "";
          if (places === 0) return digits;
          const padded = digits.padStart(places + 1, "0");
          const numeric = `${padded.slice(0, padded.length - places)}.${padded.slice(
            padded.length - places
          )}`;
          return value.trim().startsWith("-") ? `-${numeric}` : numeric;
        } : void 0,
        rightToLeft: true,
        suffixLength: (options.suffix ?? "").length
      },
      cleanup
    );
  },
  { priority: PRIORITY.MODEL + 5 }
);

// src/essential.ts
var V = ((input, context) => query(input, context));
Object.assign(V, core, {
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,
  modal,
  alert,
  confirm,
  prompt,
  dialog,
  validator,
  validate,
  validateForm: validate,
  serializeForm,
  messages,
  showFormErrors,
  showFieldError,
  clearErrors,
  mask,
  masks,
  applyMask,
  unmask,
  registerMask,
  palette,
  hotkey,
  sound,
  magic
});
var essential_default = V;

exports.V = V;
exports.default = essential_default;
//# sourceMappingURL=essential.cjs.map
//# sourceMappingURL=essential.cjs.map