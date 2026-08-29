'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * Voodoo.js v0.1.0
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
  EffectScope: () => exports.EffectScope,
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
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
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
          "Loop infinito de atualizacao detectado. Um efeito reativo esta se disparando de novo sem parar. Verifique se alguma expressao escreve em um estado que ela mesma le."
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
  console.error(`[Voodoo] erro em ${context}:`, err);
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
  return new exports.EffectScope(detached);
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
  const isMapOrSet = target instanceof Map || target instanceof Set || target instanceof WeakMap || target instanceof WeakSet;
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
function isRef(r2) {
  return !!(r2 && r2.__v_isRef === true);
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
  const onInvalidate = (c2) => {
    cleanupFn = c2;
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
var resolvedPromise, queue, postQueue, isFlushing, isFlushPending, flushPromise, RECURSION_LIMIT, errorHandler, activeEffect, shouldTrack, trackStack, effectId, ReactiveEffect, activeScope; exports.EffectScope = void 0; var ITERATE_KEY, targetMap, TriggerType, RAW, IS_REACTIVE, SKIP, reactiveMap, arrayInstrumentations, NON_REACTIVE, baseHandlers, collectionHandlers, RefImpl, ComputedRefImpl;
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
        __publicField(this, "fn", fn);
        __publicField(this, "id", effectId++);
        __publicField(this, "active", true);
        __publicField(this, "deps", []);
        __publicField(this, "parent");
        __publicField(this, "scheduler");
        __publicField(this, "onStop");
        /** Callbacks de limpeza registrados pelo proprio efeito. */
        __publicField(this, "cleanups", []);
        this.scheduler = options?.scheduler;
        this.onStop = options?.onStop;
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
      /** Registra uma funcao chamada antes da proxima execucao e ao parar. */
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
    exports.EffectScope = class {
      constructor(detached = false) {
        __publicField(this, "effects", []);
        __publicField(this, "cleanups", []);
        __publicField(this, "children", []);
        __publicField(this, "active", true);
        __publicField(this, "parent");
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
        for (const c2 of this.children) c2.stop();
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
        else warn("computed e somente leitura quando nao ha setter.");
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
    priority: options.priority ?? exports.PRIORITY.DEFAULT,
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
exports.config = void 0; var directives; exports.PRIORITY = void 0; var components, installedPlugins;
var init_registry = __esm({
  "src/runtime/registry.ts"() {
    exports.config = {
      prefix: "v-",
      autoStart: true,
      autoDiscover: true,
      root: null,
      devtools: false,
      baseURL: "",
      globals: {},
      locale: typeof navigator !== "undefined" ? navigator.language || "pt-BR" : "pt-BR",
      currency: "BRL",
      injectStyles: true,
      cleanAttributes: true
    };
    directives = /* @__PURE__ */ new Map();
    exports.PRIORITY = {
      IGNORE: 100,
      FOR: 90,
      IF: 80,
      DATA: 70,
      COMPONENT: 65,
      REF: 60,
      MODEL: 40,
      BIND: 30,
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
  if (!exports.config.injectStyles) return;
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
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "<",
  ">",
  "=",
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
      if (end === -1) throw new VoodooSyntaxError("Comentario de bloco nao fechado", source, i);
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
      if (Number.isNaN(parsed)) throw new VoodooSyntaxError("Numero invalido", source, start2);
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
              out += String.fromCodePoint(parseInt(source.slice(i + 2, close), 16));
              i = close + 1;
            } else {
              out += String.fromCharCode(parseInt(source.slice(i + 1, i + 5), 16));
              i += 5;
            }
          } else if (esc === "x") {
            out += String.fromCharCode(parseInt(source.slice(i + 1, i + 3), 16));
            i += 3;
          } else {
            out += ESCAPES[esc] ?? esc;
            i++;
          }
        } else {
          out += source[i++];
        }
      }
      if (i >= len) throw new VoodooSyntaxError("String nao fechada", source, start2);
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
            const c2 = source[i];
            if (c2 === "{") depth++;
            else if (c2 === "}") {
              depth--;
              if (depth === 0) break;
            } else if (c2 === '"' || c2 === "'" || c2 === "`") {
              const quote = c2;
              expr += source[i++];
              while (i < len && source[i] !== quote) {
                if (source[i] === "\\") expr += source[i++];
                expr += source[i++];
              }
            }
            expr += source[i++];
          }
          if (depth !== 0)
            throw new VoodooSyntaxError("Interpolacao de template nao fechada", source, start2);
          i++;
          exprs.push(expr);
          continue;
        }
        current2 += source[i++];
      }
      if (i >= len) throw new VoodooSyntaxError("Template literal nao fechado", source, start2);
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
    throw new VoodooSyntaxError(`Caractere inesperado "${ch}"`, source, i);
  }
  tokens.push({ type: "eof", value: "", start: len, end: len });
  return tokens;
}

// src/parser/parser.ts
var BINARY_PRECEDENCE = {
  "??": 1,
  "||": 2,
  "&&": 3,
  "==": 6,
  "!=": 6,
  "===": 6,
  "!==": 6,
  "<": 7,
  ">": 7,
  "<=": 7,
  ">=": 7,
  in: 7,
  instanceof: 7,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "%": 10,
  "**": 11
};
var ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??="]);
var UNARY_OPS = /* @__PURE__ */ new Set(["!", "-", "+", "typeof", "void"]);
var LITERALS = {
  true: true,
  false: false,
  null: null,
  undefined: void 0
};
var Parser = class {
  constructor(tokens, source) {
    __publicField(this, "tokens", tokens);
    __publicField(this, "source", source);
    __publicField(this, "pos", 0);
  }
  peek(offset = 0) {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  next() {
    return this.tokens[this.pos++];
  }
  isPunct(value, offset = 0) {
    const t2 = this.peek(offset);
    return t2.type === "punct" && t2.value === value;
  }
  isIdent(value, offset = 0) {
    const t2 = this.peek(offset);
    return t2.type === "ident" && t2.value === value;
  }
  expect(value) {
    if (!this.isPunct(value)) {
      const t2 = this.peek();
      throw new VoodooSyntaxError(
        `Esperava "${value}" mas encontrou "${t2.value || "fim da expressao"}"`,
        this.source,
        t2.start
      );
    }
    return this.next();
  }
  /** Ponto de entrada: uma ou mais expressoes separadas por `;` ou `,` no topo. */
  parseProgram() {
    const body = [];
    while (this.peek().type !== "eof") {
      body.push(this.parseExpression());
      while (this.isPunct(";")) this.next();
    }
    if (body.length === 0) return { t: "lit", v: void 0 };
    if (body.length === 1) return body[0];
    return { t: "seq", body };
  }
  parseExpression() {
    return this.parseAssignment();
  }
  parseAssignment() {
    if (this.peek().type === "ident" && this.isPunct("=>", 1)) {
      const param = this.next().value;
      this.next();
      return { t: "arrow", params: [param], body: this.parseAssignment() };
    }
    if (this.isPunct("(")) {
      const arrow = this.tryParseParenArrow();
      if (arrow) return arrow;
    }
    const left = this.parseConditional();
    const t2 = this.peek();
    if (t2.type === "punct" && ASSIGN_OPS.has(t2.value)) {
      if (left.t !== "id" && left.t !== "member") {
        throw new VoodooSyntaxError("Alvo de atribuicao invalido", this.source, t2.start);
      }
      this.next();
      const value = this.parseAssignment();
      return { t: "assign", op: t2.value, target: left, value };
    }
    return left;
  }
  /**
   * Tenta ler `( params ) =>`. Se o que vem depois do parentese de fechamento
   * nao for `=>`, volta a posicao original e deixa o caminho normal seguir.
   */
  tryParseParenArrow() {
    const start2 = this.pos;
    let depth = 0;
    let i = this.pos;
    for (; i < this.tokens.length; i++) {
      const t2 = this.tokens[i];
      if (t2.type === "punct" && t2.value === "(") depth++;
      else if (t2.type === "punct" && t2.value === ")") {
        depth--;
        if (depth === 0) break;
      } else if (t2.type === "eof") break;
    }
    const after = this.tokens[i + 1];
    if (!after || after.type !== "punct" || after.value !== "=>") return null;
    this.next();
    const params = [];
    while (!this.isPunct(")")) {
      const t2 = this.next();
      if (t2.type !== "ident") {
        this.pos = start2;
        return null;
      }
      params.push(t2.value);
      if (this.isPunct(",")) this.next();
    }
    this.expect(")");
    this.expect("=>");
    return { t: "arrow", params, body: this.parseAssignment() };
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
    let left = this.parseUnary();
    for (; ; ) {
      const t2 = this.peek();
      const op = t2.value;
      const isOperator = t2.type === "punct" && op in BINARY_PRECEDENCE || t2.type === "ident" && (op === "in" || op === "instanceof");
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
    const t2 = this.peek();
    if ((t2.type === "punct" || t2.type === "ident") && UNARY_OPS.has(t2.value)) {
      this.next();
      return { t: "unary", op: t2.value, a: this.parseUnary() };
    }
    if (t2.type === "punct" && (t2.value === "++" || t2.value === "--")) {
      this.next();
      const arg = this.parseUnary();
      return { t: "update", op: t2.value, a: arg, prefix: true };
    }
    let expr = this.parseCallMember();
    const post = this.peek();
    if (post.type === "punct" && (post.value === "++" || post.value === "--")) {
      this.next();
      expr = { t: "update", op: post.value, a: expr, prefix: false };
    }
    return expr;
  }
  parseCallMember() {
    let expr = this.parsePrimary();
    for (; ; ) {
      if (this.isPunct(".")) {
        this.next();
        const prop = this.next();
        if (prop.type !== "ident") {
          throw new VoodooSyntaxError("Nome de propriedade invalido", this.source, prop.start);
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
            throw new VoodooSyntaxError("Nome de propriedade invalido", this.source, prop.start);
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
    const t2 = this.peek();
    if (t2.type === "num" || t2.type === "str") {
      this.next();
      return { t: "lit", v: t2.parsed };
    }
    if (t2.type === "tpl") {
      this.next();
      const part = t2.tpl;
      return {
        t: "tpl",
        quasis: part.quasis,
        exprs: part.exprs.map((src) => parse(src))
      };
    }
    if (t2.type === "ident") {
      if (t2.value in LITERALS) {
        this.next();
        return { t: "lit", v: LITERALS[t2.value] };
      }
      this.next();
      return { t: "id", n: t2.value };
    }
    if (t2.type === "punct") {
      if (t2.value === "(") {
        this.next();
        const expr = this.parseExpression();
        this.expect(")");
        return expr;
      }
      if (t2.value === "[") return this.parseArrayLiteral();
      if (t2.value === "{") return this.parseObjectLiteral();
    }
    throw new VoodooSyntaxError(
      `Token inesperado "${t2.value || "fim da expressao"}"`,
      this.source,
      t2.start
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
        const keyToken = this.next();
        if (keyToken.type !== "ident" && keyToken.type !== "str" && keyToken.type !== "num") {
          throw new VoodooSyntaxError("Chave de objeto invalida", this.source, keyToken.start);
        }
        const key = String(keyToken.parsed ?? keyToken.value);
        if (this.isPunct(":")) {
          this.next();
          props.push({ key, value: this.parseAssignment() });
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
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(source, node);
  return node;
}
function clearParseCache() {
  cache.clear();
}

// src/parser/interpreter.ts
var allowedGlobals = {
  Math,
  JSON,
  Date,
  Number,
  String,
  Boolean,
  Array,
  Object,
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

Expressao: ${expression}` : message);
    __publicField(this, "expression", expression);
    this.name = "VoodooRuntimeError";
  }
};
var SPREAD = /* @__PURE__ */ Symbol("spread");
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
          `Nao foi possivel ler "${describeKey(node, scope)}" de ${obj === null ? "null" : "undefined"}`
        );
      }
      const key = node.computed ? evaluate(node.p, scope) : node.p.v;
      return obj[key];
    }
    case "call": {
      let thisArg;
      let fn;
      if (node.callee.t === "member") {
        const obj = evaluate(node.callee.o, scope);
        if (obj == null) {
          if (node.callee.opt || node.opt) return void 0;
          throw new VoodooRuntimeError(
            `Nao foi possivel chamar "${describeKey(node.callee, scope)}" de ${obj === null ? "null" : "undefined"}`
          );
        }
        const key = node.callee.computed ? evaluate(node.callee.p, scope) : node.callee.p.v;
        thisArg = obj;
        fn = obj[key];
      } else if (node.callee.t === "id") {
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
        throw new VoodooRuntimeError(`"${name}" nao e uma funcao`);
      }
      return fn.apply(thisArg, evalArgs(node.args, scope));
    }
    case "unary": {
      if (node.op === "...") return { [SPREAD]: evaluate(node.a, scope) };
      if (node.op === "typeof") {
        if (node.a.t === "id") {
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
        case "void":
          return void 0;
      }
      throw new VoodooRuntimeError(`Operador unario nao suportado: ${node.op}`);
    }
    case "update": {
      const old = Number(evaluate(node.a, scope));
      const updated = node.op === "++" ? old + 1 : old - 1;
      assign(node.a, updated, scope);
      return node.prefix ? updated : old;
    }
    case "bin": {
      const l = evaluate(node.l, scope);
      const r2 = evaluate(node.r, scope);
      switch (node.op) {
        case "+":
          return l + r2;
        case "-":
          return l - r2;
        case "*":
          return l * r2;
        case "/":
          return l / r2;
        case "%":
          return l % r2;
        case "**":
          return l ** r2;
        case "==":
          return l == r2;
        case "!=":
          return l != r2;
        case "===":
          return l === r2;
        case "!==":
          return l !== r2;
        case "<":
          return l < r2;
        case ">":
          return l > r2;
        case "<=":
          return l <= r2;
        case ">=":
          return l >= r2;
        case "in":
          return l in r2;
        case "instanceof":
          return l instanceof r2;
      }
      throw new VoodooRuntimeError(`Operador nao suportado: ${node.op}`);
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
            throw new VoodooRuntimeError(`Atribuicao nao suportada: ${node.op}`);
        }
      }
      assign(node.target, value, scope);
      return value;
    }
    case "arrow": {
      const params = node.params;
      const body = node.body;
      return (...args) => {
        const vars = {};
        for (let i = 0; i < params.length; i++) vars[params[i]] = args[i];
        return evaluate(body, scope.child(vars));
      };
    }
    case "obj": {
      const out = {};
      for (const prop of node.props) {
        if (prop.spread) {
          Object.assign(out, evaluate(prop.spread, scope));
        } else {
          const key = prop.key !== null ? prop.key : String(evaluate(prop.keyExpr, scope));
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
    case "seq": {
      let last;
      for (const stmt of node.body) last = evaluate(stmt, scope);
      return last;
    }
  }
  throw new VoodooRuntimeError(`No desconhecido: ${node.t}`);
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
    scope.set(target.n, value);
    return;
  }
  if (target.t === "member") {
    const obj = evaluate(target.o, scope);
    if (obj == null) {
      throw new VoodooRuntimeError("Nao foi possivel escrever em null ou undefined");
    }
    const key = target.computed ? evaluate(target.p, scope) : target.p.v;
    obj[key] = value;
    return;
  }
  throw new VoodooRuntimeError("Alvo de atribuicao invalido");
}
function describeKey(node, scope) {
  if (node.t === "member") {
    return node.computed ? String(evaluate(node.p, scope)) : String(node.p.v);
  }
  if (node.t === "id") return node.n;
  return "valor";
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
  constructor(data2 = {}, parent = null, el = null) {
    /** Dados proprios deste escopo, normalmente um proxy reativo. */
    __publicField(this, "data");
    __publicField(this, "parent");
    /** Elemento que criou o escopo. Usado por `$el` e `$refs`. */
    __publicField(this, "el");
    /** Referencias declaradas com `v-ref` dentro deste escopo. */
    __publicField(this, "refs", {});
    /** Instancia de componente, quando este escopo pertence a um. */
    __publicField(this, "component", null);
    __publicField(this, "magicCache", null);
    this.data = data2;
    this.parent = parent;
    this.el = el;
  }
  /** Escopo raiz da cadeia. */
  get root() {
    let s = this;
    while (s.parent) s = s.parent;
    return s;
  }
  /** Escopo de componente mais proximo, subindo a cadeia. */
  get owner() {
    let s = this;
    while (s) {
      if (s.component) return s;
      s = s.parent;
    }
    return null;
  }
  /** Conjunto de refs visiveis, mesclando os escopos ancestrais. */
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
  /** Cria um escopo filho reativo, usado por `v-data` e por `v-for`. */
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
function getEffectScopes(node) {
  return nodeEffectScopes.get(node) ?? [];
}
var remocoesIgnoradas = /* @__PURE__ */ new WeakSet();
function removeQuietly(node) {
  remocoesIgnoradas.add(node);
  node.remove();
}
function addCleanup(node, fn) {
  let list = nodeCleanups.get(node);
  if (!list) nodeCleanups.set(node, list = []);
  list.push(fn);
}
function destroy(node) {
  if (node.nodeType === 1) {
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child.nodeType === 1 || child.nodeType === 3) destroy(child);
    }
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
function parseAttribute(name, value) {
  const prefix = exports.config.prefix;
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
    const attrs = el.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const parsed = parseAttribute(attrs[i].name, attrs[i].value);
      if (parsed) {
        out.push(parsed);
        indexDirective(el, parsed.name);
      }
    }
  }
  if (out.length < 2) return out;
  return out.sort((a, b) => priorityOf(b) - priorityOf(a));
}
function priorityOf(attr2) {
  return directives.get(attr2.name)?.priority ?? 0;
}
var directiveIndex = /* @__PURE__ */ new Map();
function indexDirective(el, name) {
  let set2 = directiveIndex.get(name);
  if (!set2) directiveIndex.set(name, set2 = /* @__PURE__ */ new Set());
  set2.add(el);
}
function unindexElement(el) {
  for (const set2 of directiveIndex.values()) set2.delete(el);
}
function hasDirective(el, name) {
  if (directiveIndex.get(name)?.has(el)) return true;
  return el.hasAttribute(`${exports.config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
function queryDirective(root, name) {
  const out = [];
  const set2 = directiveIndex.get(name);
  const raiz = root;
  if (set2) {
    for (const el of set2) {
      if (!el.isConnected) continue;
      if (raiz.contains && raiz.contains(el) && el !== raiz) out.push(el);
    }
  }
  for (const el of Array.from(
    root.querySelectorAll(`[${exports.config.prefix}${name}],[data-v-${name}]`)
  )) {
    if (!out.includes(el)) out.push(el);
  }
  out.sort(
    (a, b) => a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  return out;
}
function closestDirective(el, name) {
  let atual = el;
  while (atual) {
    if (hasDirective(atual, name)) return atual;
    atual = atual.parentElement;
  }
  return null;
}
var attributeCache = /* @__PURE__ */ new WeakMap();
function isVoodooAttribute(name) {
  return name.startsWith(exports.config.prefix) || name.startsWith("data-v-") || name.charCodeAt(0) === 64 || name.charCodeAt(0) === 58 && name.length > 1;
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
  if (!exports.config.cleanAttributes) return;
  let map = attributeCache.get(el);
  if (!map) attributeCache.set(el, map = /* @__PURE__ */ new Map());
  const remover = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr2 = el.attributes[i];
    if (!isVoodooAttribute(attr2.name)) continue;
    map.set(attr2.name, attr2.value);
    remover.push(attr2.name);
  }
  for (const name of remover) el.removeAttribute(name);
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
    const n2 = attrs[i].name;
    if (n2.startsWith(exports.config.prefix) || n2.charCodeAt(0) === 64 || n2.charCodeAt(0) === 58 || n2.startsWith("data-v-")) {
      return true;
    }
  }
  return false;
}
function evaluateIn(expression, scope, context) {
  if (!expression) return void 0;
  try {
    return evaluate(parse(expression), scope);
  } catch (err) {
    handleError(err, context ? `${context} ("${expression}")` : `expressao "${expression}"`);
    return void 0;
  }
}
var skipChildren = /* @__PURE__ */ new WeakSet();
function markSkipChildren(el) {
  skipChildren.add(el);
}
function runDirective(el, attr2, scope) {
  const def = directives.get(attr2.name);
  if (!def) return;
  const scopeOwner = new exports.EffectScope(true);
  addCleanup(el, () => scopeOwner.stop());
  trackEffectScope(el, scopeOwner);
  const ctx = {
    el,
    scope,
    expression: attr2.expression,
    arg: attr2.arg,
    modifiers: attr2.modifiers,
    raw: attr2.raw,
    evaluate(expression) {
      return evaluateIn(expression ?? attr2.expression, scope, attr2.raw);
    },
    effect(fn) {
      scopeOwner.run(() => effect(fn, { scope: scopeOwner }));
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
  if (HTML_SKIP.has(el.tagName)) return;
  if (el.hasAttribute(`${exports.config.prefix}ignore`) || el.hasAttribute(`${exports.config.prefix}pre`)) {
    initialized.add(el);
    return;
  }
  let current2 = activeScope2;
  const attrs = collectDirectives(el);
  const tagComponent = el.hasAttribute(`${exports.config.prefix}component`) ? null : resolveComponentTag(el.tagName);
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
  let montouComponente = false;
  if (componentName && componentMounter) {
    const created = componentMounter(el, componentName, current2);
    if (created) {
      current2 = created;
      montouComponente = true;
      nodeScopes.set(el, current2);
    }
  } else if (dataAttr || componentAttr) {
    const raw = dataAttr ? evaluateIn(dataAttr.expression || "{}", current2, "v-data") : {};
    current2 = current2.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
    nodeScopes.set(el, current2);
  }
  const escopoDosAtributos = montouComponente ? activeScope2 : current2;
  for (const attr2 of attrs) {
    if (attr2.name === "data" || attr2.name === "component") continue;
    runDirective(el, attr2, escopoDosAtributos);
  }
  stripAttributes(el);
  if (!skipChildren.has(el)) walkChildren(el, current2);
}
function walkChildren(el, scope) {
  const children = el.childNodes;
  const list = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) list.push(child);
    else if (child.nodeType === 3) bindTextNode(child, scope);
  }
  for (const child of list) walk(child, nodeScopes.get(child) ?? scope);
}
var MUSTACHE = /\{\{([\s\S]+?)\}\}|\{([^{}\n]+?)\}/g;
var NO_INTERPOLATION = /* @__PURE__ */ new Set(["PRE", "CODE", "SCRIPT", "STYLE", "TEXTAREA"]);
function bindTextNode(node, scope) {
  const raw = node.textContent;
  if (!raw || raw.indexOf("{") === -1) return;
  if (initialized.has(node)) return;
  let ancestral = node.parentElement;
  while (ancestral) {
    if (NO_INTERPOLATION.has(ancestral.tagName)) return;
    if (ancestral.hasAttribute(`${exports.config.prefix}ignore`) || ancestral.hasAttribute(`${exports.config.prefix}pre`) || ancestral.hasAttribute("data-v-ignore") || ancestral.hasAttribute("data-v-pre")) {
      return;
    }
    ancestral = ancestral.parentElement;
  }
  const segments = [];
  let lastIndex = 0;
  MUSTACHE.lastIndex = 0;
  let match;
  while ((match = MUSTACHE.exec(raw)) !== null) {
    if (match.index > lastIndex) segments.push({ text: raw.slice(lastIndex, match.index) });
    const expression = (match[1] ?? match[2] ?? "").trim();
    if (expression) segments.push({ expression });
    lastIndex = match.index + match[0].length;
  }
  if (!segments.some((s) => s.expression)) return;
  if (lastIndex < raw.length) segments.push({ text: raw.slice(lastIndex) });
  initialized.add(node);
  const owner = new exports.EffectScope(true);
  addCleanup(node, () => owner.stop());
  trackEffectScope(node, owner);
  owner.run(
    () => effect(() => {
      let out = "";
      for (const segment of segments) {
        out += segment.text ?? stringify(evaluateIn(segment.expression, scope, "interpolacao"));
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
  const target = root ?? exports.config.root ?? document.body;
  if (!target) return;
  Object.assign(allowedGlobals, exports.config.globals);
  walk(target, rootScope);
  if (!started) {
    started = true;
    if (exports.config.autoDiscover) observeDOM(target);
    document.dispatchEvent(new CustomEvent("voodoo:ready", { detail: { root: target } }));
  }
}
function observeDOM(target) {
  if (typeof MutationObserver === "undefined") return;
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (let i = 0; i < mutation.removedNodes.length; i++) {
        const removed = mutation.removedNodes[i];
        if (remocoesIgnoradas.has(removed)) {
          remocoesIgnoradas.delete(removed);
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
  const semHifen = normalized.replace(/-/g, "");
  const seletores = [normalized, semHifen, `[${exports.config.prefix}component="${normalized}"]`];
  for (const seletor of seletores) {
    let encontrados;
    try {
      encontrados = Array.from(document.querySelectorAll(seletor));
    } catch {
      continue;
    }
    for (const el of encontrados) {
      if (getScope(el)?.component) continue;
      const escopo = findScope(el.parentNode);
      if (isInitialized(el)) {
        destroy(el);
        restoreAttributes(el);
      }
      walk(el, escopo);
    }
  }
}
function coerce(value, def) {
  if (!def || !def.type || def.type === "any") return value;
  if (value == null || value === "") return def.default ?? value;
  switch (def.type) {
    case "number": {
      const n2 = Number(value);
      return Number.isNaN(n2) ? def.default ?? value : n2;
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
  return name.replace(/-(\w)/g, (_, c2) => c2.toUpperCase());
}
function resolveProps(el, defs, parentScope, owner) {
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
      console.warn(`[Voodoo] prop obrigatoria ausente: "${key}"`);
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
    if (exports.config.devtools) {
      console.warn(`[Voodoo] componente "${name}" nao registrado, usando escopo inline.`);
    }
  }
  const owner = new exports.EffectScope(true);
  const defs = propDefinitions(definition);
  const props = resolveProps(el, defs, parentScope, owner);
  const stateFactory = definition.state ?? definition.data;
  let stateRaw = {};
  const instance = {};
  const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
  const scope = new Scope({}, scopeParent, el);
  scope.component = instance;
  try {
    stateRaw = stateFactory ? stateFactory.call(instance, props) ?? {} : {};
  } catch (err) {
    handleError(err, `state() do componente "${name}"`);
  }
  const dataAttr = el.getAttribute(`${exports.config.prefix}data`);
  if (dataAttr) {
    const extra = evaluateIn(dataAttr, parentScope, "v-data");
    if (extra && typeof extra === "object") Object.assign(stateRaw, extra);
  }
  const state2 = reactive(stateRaw);
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
      return state2[key];
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
      state2[key] = value;
      return true;
    },
    has(_t, key) {
      if (typeof key === "symbol") return false;
      const k = key;
      return k === "$refs" || k in special || k in computedRefs || k in methods || k in props || k in state2;
    },
    ownKeys() {
      return [
        .../* @__PURE__ */ new Set([
          ...Object.keys(state2),
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
          for (const key of Object.keys(state2)) void state2[key];
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

// src/runtime/magics.ts
init_reactivity();

// src/store/index.ts
init_reactivity();
var stores = /* @__PURE__ */ new Map();
var versao = ref(0);
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
  let initial = { ...definition };
  if (options.persist && typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(key);
      if (saved) Object.assign(initial, JSON.parse(saved));
    } catch {
    }
  }
  const created = reactive(initial);
  for (const [prop, value] of Object.entries(definition)) {
    if (typeof value === "function") {
      created[prop] = (...args) => value.apply(created, args);
    }
  }
  stores.set(name, created);
  versao.value++;
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
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "function") continue;
    out[key] = value;
  }
  return out;
}
var allStores = new Proxy(
  {},
  {
    get: (_t, key) => {
      void versao.value;
      return stores.get(key);
    },
    has: (_t, key) => {
      void versao.value;
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
  const c2 = globalThis.crypto;
  if (c2?.randomUUID) return c2.randomUUID();
  if (c2?.getRandomValues) {
    const bytes = c2.getRandomValues(new Uint8Array(16));
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r2 = Math.random() * 16 | 0;
    return (ch === "x" ? r2 : r2 & 3 | 8).toString(16);
  });
}
function uid(prefix = "v") {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}
function sleep(ms) {
  return new Promise((resolve3) => setTimeout(resolve3, ms));
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
    const now = Date.now();
    lastArgs = args;
    const remaining = wait2 - (now - last);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      last = now;
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
  const n2 = typeof value === "string" ? parseFloat(value) : value;
  if (n2 == null || Number.isNaN(n2)) return "";
  return new Intl.NumberFormat(options.locale ?? defaultLocale, {
    style: "currency",
    currency: options.currency ?? defaultCurrency
  }).format(n2);
}
function formatNumber(value, options = {}) {
  const n2 = typeof value === "string" ? parseFloat(value) : value;
  if (n2 == null || Number.isNaN(n2)) return "";
  const { locale, ...rest } = options;
  return new Intl.NumberFormat(locale ?? defaultLocale, rest).format(n2);
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
  const pad2 = (n2) => String(n2).padStart(2, "0");
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
  const n2 = Number(bytes);
  if (!n2 || Number.isNaN(n2)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(Math.abs(n2)) / Math.log(1024)), units.length - 1);
  return `${(n2 / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}
function formatPercent(value, decimals = 0, locale) {
  return new Intl.NumberFormat(locale ?? defaultLocale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
var device = {
  get touch() {
    return isBrowser && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  },
  get mobile() {
    return isBrowser && window.matchMedia("(max-width: 767px)").matches;
  },
  get tablet() {
    return isBrowser && window.matchMedia("(min-width: 768px) and (max-width: 1023px)").matches;
  },
  get desktop() {
    return isBrowser && window.matchMedia("(min-width: 1024px)").matches;
  },
  get online() {
    return !isBrowser || navigator.onLine;
  },
  get reducedMotion() {
    return isBrowser && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },
  get darkMode() {
    return isBrowser && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
  /** `true` quando o erro foi de rede, timeout ou cancelamento. */
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
  for (const item of list) {
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
      const remaining = readQueue();
      remaining.push(item);
      writeQueue(remaining);
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
  const attempts = (config2.retry ?? 0) + 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const signals = [controller.signal];
    if (config2.signal) signals.push(config2.signal);
    const timeoutId = config2.timeout && config2.timeout > 0 ? setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), config2.timeout) : null;
    try {
      const response = await fetch(url2, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? void 0 : body,
        credentials: config2.credentials,
        signal: signals.length > 1 && "any" in AbortSignal ? AbortSignal.any(signals) : controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
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
          `Requisicao falhou com status ${response.status}`,
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
  const message = lastError?.name === "TimeoutError" ? `Tempo esgotado apos ${config2.timeout}ms` : `Falha de rede ao acessar ${url2}`;
  const error = new HttpError(message, void 0, config2, lastError);
  for (const interceptor of errorInterceptors) interceptor(error);
  throw error;
}
function wait(ms) {
  return new Promise((resolve3) => setTimeout(resolve3, ms));
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
  /** Requisicao completa, com status e cabecalhos. */
  request,
  /** Envia arquivos com progresso real, usando XMLHttpRequest. */
  upload(url2, data2, options = {}) {
    return new Promise((resolve3, reject) => {
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
        if (xhr.status >= 200 && xhr.status < 300) resolve3(data3);
        else reject(new HttpError(`Upload falhou com status ${xhr.status}`));
      });
      xhr.addEventListener("error", () => reject(new HttpError("Falha de rede no upload")));
      xhr.addEventListener("abort", () => reject(new HttpError("Upload cancelado")));
      options.signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(data2);
    });
  },
  /** Server-Sent Events com reconexao automatica do proprio navegador. */
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
  /** Le uma resposta em streaming, linha a linha (NDJSON). */
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
  /** Define cabecalhos enviados em toda requisicao. */
  setHeader(name, value) {
    if (value === null) delete defaults.headers[name];
    else defaults.headers[name] = value;
  },
  /** Atalho para autenticacao por token. */
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
  element.setAttribute("aria-label", "Notificacoes");
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
        button.setAttribute("aria-label", "Fechar notificacao");
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
  /** Notificacao neutra. */
  (message, options = {}) => render({ ...normalize(message, "default"), ...options }),
  {
    success: (message, options = {}) => render({ ...normalize(message, "success"), ...options }),
    error: (message, options = {}) => render({ ...normalize(message, "error"), ...options }),
    warning: (message, options = {}) => render({ ...normalize(message, "warning"), ...options }),
    info: (message, options = {}) => render({ ...normalize(message, "info"), ...options }),
    loading: (message, options = {}) => render({ ...normalize(message, "loading"), duration: 0, ...options }),
    /**
     * Acompanha uma promessa: mostra carregando, depois sucesso ou erro.
     *
     * ```js
     * V.toast.promise(salvar(), {
     *   loading: 'Salvando...',
     *   success: (dados) => `Salvo com id ${dados.id}`,
     *   error: 'Nao foi possivel salvar'
     * })
     * ```
     */
    async promise(promise, messages2 = {}) {
      const handle = render({ title: messages2.loading ?? "Carregando...", type: "loading", duration: 0 });
      try {
        const value = await promise;
        handle.update({
          title: typeof messages2.success === "function" ? messages2.success(value) : messages2.success ?? "Pronto",
          type: "success",
          duration: settings.duration
        });
        return value;
      } catch (err) {
        handle.update({
          title: typeof messages2.error === "function" ? messages2.error(err) : messages2.error ?? "Algo deu errado",
          type: "error",
          duration: settings.duration
        });
        throw err;
      }
    },
    /** Fecha todas as notificacoes abertas. */
    clear() {
      for (const [position, element] of containers) {
        element.remove();
        containers.delete(position);
      }
    },
    /** Ajusta duracao, posicao e limite padrao. */
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
  /** Le um parametro da URL atual. */
  get(key, fallback) {
    if (typeof location === "undefined") return fallback;
    return new URLSearchParams(location.search).get(key) ?? fallback;
  },
  /** Le todos os parametros como objeto. */
  all() {
    if (typeof location === "undefined") return {};
    return Object.fromEntries(new URLSearchParams(location.search));
  },
  /** Escreve um parametro sem recarregar a pagina. */
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
  /** Aplica varios parametros de uma vez. */
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
  /** Guarda um valor. `ttl` em milissegundos, `0` significa sem expiracao. */
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
  /** Executa a funcao apenas quando o valor nao estiver em cache. */
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
var theme = {
  /** Tema escolhido pelo usuario, ou `system` quando nunca foi definido. */
  get current() {
    return storage.get(THEME_KEY) ?? "system";
  },
  /** Tema efetivamente aplicado, resolvendo `system`. */
  get resolved() {
    const value = this.current;
    if (value !== "system") return value;
    if (typeof matchMedia === "undefined") return "light";
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  },
  set(value) {
    storage.set(THEME_KEY, value);
    this.apply();
  },
  toggle() {
    const next = this.resolved === "dark" ? "light" : "dark";
    this.set(next);
    return next;
  },
  /** Escreve `data-theme` no elemento raiz e avisa a pagina. */
  apply() {
    if (typeof document === "undefined") return;
    const value = this.current;
    const root = document.documentElement;
    if (value === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", value);
    root.style.colorScheme = this.resolved;
    document.dispatchEvent(
      new CustomEvent("voodoo:theme", { detail: { theme: value, resolved: this.resolved } })
    );
  },
  /** Aplica o tema salvo assim que a pagina carrega. */
  init() {
    if (typeof document === "undefined") return;
    this.apply();
    matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
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
  /** Verifica uma media query arbitraria. */
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
  /** Tipo de conexao informado pelo navegador, quando disponivel. */
  type: "unknown",
  /** `true` quando o usuario pediu economia de dados. */
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
  /** Copia texto, com fallback para navegadores sem a API moderna. */
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
  /** Le o conteudo da area de transferencia, quando o usuario permitir. */
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
  const c2 = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve3) => {
    addClasses(el, c2.enterFrom);
    addClasses(el, c2.enterActive);
    nextFrame(() => {
      removeClasses(el, c2.enterFrom);
      addClasses(el, c2.enterTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c2.enterActive);
        removeClasses(el, c2.enterTo);
        resolve3();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function leave(el, options = {}) {
  injectStyle("transitions", BUILT_IN_CSS);
  const c2 = classesFor(options);
  if (device.reducedMotion) return Promise.resolve();
  return new Promise((resolve3) => {
    addClasses(el, c2.leaveFrom);
    addClasses(el, c2.leaveActive);
    nextFrame(() => {
      removeClasses(el, c2.leaveFrom);
      addClasses(el, c2.leaveTo);
      const duration = options.duration ?? readDuration(el);
      const finish = () => {
        removeClasses(el, c2.leaveActive);
        removeClasses(el, c2.leaveTo);
        resolve3();
      };
      if (duration <= 0) finish();
      else setTimeout(finish, duration + 20);
    });
  });
}
function slideDown(el, duration = 240) {
  return new Promise((resolve3) => {
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
      resolve3();
    }, duration + 20);
  });
}
function slideUp(el, duration = 240) {
  return new Promise((resolve3) => {
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
      resolve3();
    }, duration + 20);
  });
}
function fadeIn(el, duration = 220) {
  return new Promise((resolve3) => {
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
      resolve3();
    }, duration + 20);
  });
}
function fadeOut(el, duration = 220) {
  return new Promise((resolve3) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
      el.style.removeProperty("transition");
      el.style.removeProperty("opacity");
      resolve3();
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
    handleError(err, `atribuicao em "${expression}"`);
  }
}
function transitionOptions(el) {
  const p2 = exports.config.prefix;
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
    const primeiro = el.firstChild;
    if (primeiro && primeiro.nodeType === 3) markInitialized(primeiro);
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
    const p2 = exports.config.prefix;
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
    const anchor = document.createComment(exports.config.devtools ? ` v-if: ${expression} ` : "");
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
  { priority: exports.PRIORITY.IF, terminal: true }
);
function renderTemplate(source, anchor, scope) {
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
    parent.insertBefore(clone2, anchor);
    nodes.push(clone2);
    markNodeScope(clone2, scope);
    walk(clone2, scope);
  }
  return nodes;
}
defineDirective("else-if", () => void 0, { priority: exports.PRIORITY.IF, terminal: true });
defineDirective("else", () => void 0, { priority: exports.PRIORITY.IF, terminal: true });
var FOR_PATTERN = /^\s*\(?\s*([^)]*?)\s*\)?\s+(?:in|of)\s+(.+?)\s*$/;
defineDirective(
  "for",
  ({ el, scope, expression, effect: effect2 }) => {
    const match = FOR_PATTERN.exec(expression);
    if (!match) {
      handleError(
        new Error(`Sintaxe invalida em v-for="${expression}". Use "item in itens".`),
        "v-for"
      );
      return;
    }
    const aliases = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    const sourceExpression = match[2];
    const [itemAlias, indexAlias, thirdAlias] = aliases;
    const p2 = exports.config.prefix;
    const keyExpression = el.getAttribute(":key") || el.getAttribute(`${p2}bind:key`) || el.getAttribute(`${p2}key`);
    const anchor = document.createComment(exports.config.devtools ? ` v-for: ${expression} ` : "");
    el.parentNode?.insertBefore(anchor, el);
    const template = el.cloneNode(true);
    template.removeAttribute(`${p2}for`);
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
      entries.forEach((vars, index) => {
        const key = keyExpression ? evaluateIn(keyExpression, scope.child(vars), ":key") : `__index_${index}`;
        const existing = previous.get(key);
        if (existing && !used.has(key)) {
          used.add(key);
          for (const [name, value] of Object.entries(vars)) existing.data[name] = value;
          next.push(existing);
          return;
        }
        const childScope = scope.reactiveChild(vars);
        const nodes = renderTemplate(template, anchor, childScope);
        used.add(key);
        next.push({ key, scope: childScope, nodes, data: childScope.data });
      });
      for (const block2 of blocks) {
        if (used.has(block2.key) && next.includes(block2)) continue;
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
  { priority: exports.PRIORITY.FOR, terminal: true }
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
function applyBinding(el, name, value, asProp = false) {
  if (name === "class") return applyClass(el, value);
  if (name === "style") return applyStyle(el, value);
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
        for (const c2 of cls.split(/\s+/)) if (c2) out.add(c2);
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
    const name = prop.startsWith("--") ? prop : prop.replace(/[A-Z]/g, (c2) => `-${c2.toLowerCase()}`);
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
    effect2(() => {
      applyBinding(el, arg, ev(), asProp);
    });
  },
  { priority: exports.PRIORITY.BIND }
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
    handleError(err, `evento ${event.type} ("${expression}")`);
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
  /** Segurar pressionado. Duracao pela modificador, como `@hold.1s`. */
  hold(el, run, modifiers, cleanup) {
    const holdFor = parseDuration(
      typeof modifiers.duration === "string" && modifiers.duration || Object.keys(modifiers).find((m) => /^[\d.]+(ms|s)?$/.test(m)) || el.getAttribute(`${exports.config.prefix}hold-duration`) || 800,
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
  /** Clique em qualquer lugar fora do elemento. */
  outside(el, run, _modifiers, cleanup) {
    const handler = (event) => {
      if (!el.isConnected) return;
      if (el === event.target || el.contains(event.target)) return;
      run(event);
    };
    document.addEventListener("click", handler, true);
    cleanup(() => document.removeEventListener("click", handler, true));
  },
  /** Elemento entrou na area visivel. */
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
    const debounceMs = modifiers.debounce ? parseDuration(modifiers.debounce === true ? 250 : modifiers.debounce, 250) : el.getAttribute(`${exports.config.prefix}debounce`) ? parseDuration(el.getAttribute(`${exports.config.prefix}debounce`), 250) : 0;
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
          const n2 = value === "" ? null : Number(value);
          value = n2 === null || Number.isNaN(n2) ? value : n2;
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
  { priority: exports.PRIORITY.MODEL }
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
  { priority: exports.PRIORITY.INIT }
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
  { priority: exports.PRIORITY.REF }
);
defineDirective("effect", ({ effect: effect2, evaluate: ev }) => {
  effect2(() => {
    ev();
  });
});
defineDirective("watch", ({ el, expression, scope, effect: effect2 }) => {
  const modelExpression = el.getAttribute(`${exports.config.prefix}model`);
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
  el.removeAttribute(`${exports.config.prefix}cloak`);
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
      handleError(new Error(`Destino de v-teleport nao encontrado: ${selector}`), "v-teleport");
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
  { priority: exports.PRIORITY.DATA }
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
  defineDirective(name, () => void 0, { priority: exports.PRIORITY.TRANSITION });
}
defineDirective("data", () => void 0, { priority: exports.PRIORITY.DATA });
defineDirective("component", () => void 0, { priority: exports.PRIORITY.COMPONENT });

// src/directives/http.ts
init_reactivity();
init_registry();
var p = () => exports.config.prefix;
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
function pick(value, path) {
  if (!path) return value;
  let current2 = value;
  for (const part of path.split(".")) {
    if (current2 == null) return void 0;
    current2 = current2[part];
  }
  return current2;
}
function renderJSON(value, depth = 0) {
  if (value == null) return "";
  if (typeof value !== "object") return escapeHtml(String(value));
  if (Array.isArray(value)) {
    if (!value.length) return '<p class="v-json-empty">Nenhum resultado.</p>';
    const allObjects = value.every((item) => item && typeof item === "object" && !Array.isArray(item));
    if (allObjects && depth === 0) {
      const columns = Array.from(
        value.reduce((set2, item) => {
          for (const key of Object.keys(item)) set2.add(key);
          return set2;
        }, /* @__PURE__ */ new Set())
      );
      const head = columns.map((c2) => `<th>${escapeHtml(c2)}</th>`).join("");
      const body = value.map(
        (item) => `<tr>${columns.map((c2) => `<td>${renderJSON(item[c2], depth + 1)}</td>`).join("")}</tr>`
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
    handleError(new Error(`Template nao encontrado: ${selector}`), "v-template");
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
  const settings4 = readSettings(el, scope);
  const dialogoCuidaDaPergunta = directives.has(`confirm`);
  if (settings4.confirmMessage && !dialogoCuidaDaPergunta) {
    const confirmed = await askConfirmation(settings4.confirmMessage);
    if (!confirmed) return;
  }
  inFlight.get(el)?.abort();
  const controller = new AbortController();
  inFlight.set(el, controller);
  const target = settings4.target ?? el;
  const submitButton = el instanceof HTMLFormElement ? el.querySelector('[type="submit"], button:not([type])') : null;
  const startLoading = () => {
    el.classList.add(settings4.loadingClass);
    el.setAttribute("aria-busy", "true");
    if (settings4.loadingTarget) settings4.loadingTarget.style.removeProperty("display");
    if (settings4.disableWhileLoading) {
      const button = submitButton ?? el;
      if ("disabled" in button) button.disabled = true;
    }
  };
  const stopLoading = () => {
    el.classList.remove(settings4.loadingClass);
    el.removeAttribute("aria-busy");
    if (settings4.loadingTarget) settings4.loadingTarget.style.display = "none";
    if (settings4.disableWhileLoading) {
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
      headers: settings4.headers,
      timeout: settings4.timeout,
      retry: settings4.retry,
      cache: settings4.cacheMs || void 0,
      signal: controller.signal,
      offlineQueue: settings4.offlineQueue
    });
    const data2 = pick(response.data, settings4.jsonPath);
    if (settings4.storeAs) {
      scope.set(settings4.storeAs, data2);
    } else if (settings4.templateSelector) {
      renderWithTemplate(settings4.templateSelector, data2, scope, target);
    } else if (typeof data2 === "string") {
      swapContent(target, data2, settings4.swap, scope);
    } else if (data2 !== void 0 && data2 !== null) {
      injectJSONStyles();
      swapContent(target, renderJSON(data2), settings4.swap, scope);
    }
    if (settings4.toastSuccess) toast.success(settings4.toastSuccess);
    if (settings4.onSuccess) {
      callHandler(settings4.onSuccess, scope, el, { data: data2, response });
    }
    dispatch(el, "voodoo:success", { data: data2, response });
    if (settings4.scrollTo) {
      document.querySelector(settings4.scrollTo)?.scrollIntoView({ behavior: "smooth" });
    }
    if (settings4.redirect) {
      location.assign(settings4.redirect);
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
    const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err?.message ?? "Erro desconhecido";
    if (settings4.toastError) toast.error(settings4.toastError);
    else if (!settings4.onError) toast.error(message);
    if (settings4.onError) callHandler(settings4.onError, scope, el, { error: err, message });
    dispatch(el, "voodoo:error", { error: err, message });
    handleError(err, `requisicao ${method} ${options.url}`);
  } finally {
    stopLoading();
    inFlight.delete(el);
    if (settings4.onComplete) callHandler(settings4.onComplete, scope, el, {});
    dispatch(el, "voodoo:complete", {});
  }
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
function dispatch(el, type, detail) {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}
function callHandler(expression, scope, el, extra) {
  const local = scope.child({ $el: el, ...extra });
  const value = evaluateIn(expression, local, "callback HTTP");
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
    const resource = reactive({
      data: null,
      loading: false,
      error: null,
      loaded: false,
      async reload() {
        const url2 = resolveURL(urlExpression, scope);
        if (!url2) return;
        resource.loading = true;
        resource.error = null;
        try {
          const params = attr(el, "params") ? evaluateIn(attr(el, "params"), scope, "v-params") : void 0;
          const cacheMs = parseDuration(attr(el, "cache") ?? void 0, 0);
          const response = await http.request({
            url: url2,
            method: (attr(el, "method") || "GET").toUpperCase(),
            params,
            cache: cacheMs || void 0,
            retry: Number(attr(el, "retry") ?? 0),
            timeout: parseDuration(attr(el, "timeout") ?? void 0, http.defaults.timeout)
          });
          resource.data = pick(response.data, attr(el, "json-path"));
          resource.loaded = true;
          dispatch(el, "voodoo:success", { data: resource.data });
        } catch (err) {
          const message = err instanceof HttpError ? extractMessage(err) ?? err.message : err.message;
          resource.error = { name: "ResourceError", message };
          dispatch(el, "voodoo:error", { error: err, message });
        } finally {
          resource.loading = false;
        }
      },
      set(value) {
        resource.data = value;
      }
    });
    scope.set(name, resource);
    const pollEvery = parseDuration(attr(el, "poll") ?? void 0, 0);
    if (pollEvery > 0) {
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") void resource.reload();
      }, pollEvery);
      cleanup(() => clearInterval(timer));
    }
    if (!hasAttr2(el, "manual")) void resource.reload();
  },
  { priority: exports.PRIORITY.DATA }
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
  defineDirective(name, () => void 0, { priority: exports.PRIORITY.TRANSITION });
}

// src/core.ts
setComponentMounter(mountComponent);
setScopeMarker(markNodeScope);
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
      handleError(err, `evento "${name}"`);
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
    { priority: hooks.priority ?? exports.PRIORITY.DEFAULT }
  );
}
function data(values) {
  Object.assign(rootScope.data, values);
  return rootScope.data;
}
var version = "0.1.0";
var core = {
  // Utilitarios primeiro: nomes proprios da Voodoo podem sobrescrever.
  ...utils_exports,
  version,
  config: exports.config,
  // Reatividade
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
  EffectScope: exports.EffectScope,
  flushSync,
  // Estado
  data,
  store,
  stores: allStores,
  removeStore,
  storeNames,
  scope: rootScope,
  // Componentes e directives
  component: defineComponent,
  components,
  directive,
  directives,
  magic,
  magics,
  // Ciclo de vida do DOM
  start,
  walk,
  refresh,
  destroy,
  stopObserving,
  getScope,
  findScope,
  addCleanup,
  parseAttribute,
  // Expressoes
  parse,
  tokenize,
  evaluate,
  evaluateIn,
  stringify,
  clearParseCache,
  globals: allowedGlobals,
  // Servicos
  http,
  request,
  HttpError,
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
  // Animacao
  enter,
  leave,
  fadeIn,
  fadeOut,
  slideUp,
  slideDown,
  viewTransition,
  // Estilo
  injectStyle,
  ensureTokens,
  // Eventos globais
  on,
  once: onceEvent,
  off,
  emit,
  // Plugins
  use(plugin, options) {
    usePlugin(core, plugin, options);
  },
  /** Define o tratamento de erros da aplicacao inteira. */
  onError(handler) {
    setErrorHandler(handler);
  },
  /** Instancias de componente montadas, para inspecao. */
  instances,
  Scope,
  PRIORITY: exports.PRIORITY,
  VoodooSyntaxError,
  VoodooRuntimeError
};

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
    /** Quantidade de elementos da colecao. */
    __publicField(this, "length");
    /** Elementos da colecao, na ordem em que foram encontrados. */
    __publicField(this, "elements");
    this.elements = elements;
    this.length = elements.length;
    const indexed = this;
    for (let i = 0; i < elements.length; i++) indexed[i] = elements[i];
  }
  /** Permite `for (const el of query('.item'))`. */
  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }
  // -------------------------------------------------------------------------
  // Travessia
  // -------------------------------------------------------------------------
  /** Descendentes que casam com o seletor. */
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
  /** Ancestral mais proximo, incluindo o proprio elemento. */
  closest(selector) {
    const out = [];
    for (const el of this.elements) {
      const found = el.closest(selector);
      if (found) out.push(found);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Elemento pai de cada item, opcionalmente filtrado. */
  parent(selector) {
    const out = [];
    for (const el of this.elements) {
      const parent = el.parentElement;
      if (parent && (!selector || parent.matches(selector))) out.push(parent);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Todos os ancestrais, do mais proximo ao mais distante. */
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
  /** Filhos diretos, opcionalmente filtrados. */
  children(selector) {
    const out = [];
    for (const el of this.elements) {
      for (const child of Array.from(el.children)) {
        if (!selector || child.matches(selector)) out.push(child);
      }
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Irmaos, sem incluir os proprios elementos. */
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
  /** Proximo irmao de cada elemento. */
  next(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.nextElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Irmao anterior de cada elemento. */
  prev(selector) {
    const out = [];
    for (const el of this.elements) {
      const sibling = el.previousElementSibling;
      if (sibling && (!selector || sibling.matches(selector))) out.push(sibling);
    }
    return new _VoodooCollection(distinct(out));
  }
  /** Somente o primeiro elemento. */
  first() {
    return this.eq(0);
  }
  /** Somente o ultimo elemento. */
  last() {
    return this.eq(-1);
  }
  /** Elemento na posicao informada. Indices negativos contam do fim. */
  eq(index) {
    const position = index < 0 ? this.elements.length + index : index;
    const el = this.elements[position];
    return new _VoodooCollection(el ? [el] : []);
  }
  /** Mantem apenas os elementos que passam no filtro. */
  filter(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Remove da colecao os elementos que passam no filtro. */
  not(test) {
    const out = this.elements.filter(
      (el, index) => typeof test === "function" ? !test(el, index) : !el.matches(test)
    );
    return new _VoodooCollection(out);
  }
  /** Mantem os elementos que contem o descendente informado. */
  has(target) {
    const out = this.elements.filter(
      (el) => typeof target === "string" ? el.querySelector(target) !== null : el.contains(target)
    );
    return new _VoodooCollection(out);
  }
  /** Verifica se ao menos um elemento casa com o filtro. */
  is(test) {
    return this.elements.some(
      (el, index) => typeof test === "function" ? test(el, index) : el.matches(test)
    );
  }
  /** Projeta cada elemento em um valor e devolve um array comum. */
  map(fn) {
    return this.elements.map((el, index) => fn(el, index));
  }
  /** Percorre a colecao. Dentro da funcao, `this` e o elemento atual. */
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
  /** Copia dos elementos como array comum. */
  toArray() {
    return this.elements.slice();
  }
  /** Junta outros elementos a colecao, sem repetir. */
  add(input, context) {
    return new _VoodooCollection(distinct([...this.elements, ...resolve(input, context)]));
  }
  /** Recorte da colecao, com a mesma semantica de `Array.prototype.slice`. */
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
  /** Remove um ou varios atributos, separados por espaco. */
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
  /** Posicao do primeiro elemento em relacao ao documento. */
  offset() {
    const el = this.elements[0];
    if (!el) return { top: 0, left: 0 };
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, left: rect.left + window.scrollX };
  }
  /** Posicao do primeiro elemento em relacao ao ancestral posicionado. */
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
  /** Adiciona uma ou varias classes separadas por espaco. */
  addClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.add(...list);
    return this;
  }
  /** Remove uma ou varias classes separadas por espaco. */
  removeClass(value) {
    const list = names(value);
    if (list.length) for (const el of this.elements) el.classList.remove(...list);
    return this;
  }
  /** Alterna classes. O segundo argumento forca ligar ou desligar. */
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
  /** Verdadeiro quando algum elemento tem todas as classes informadas. */
  hasClass(value) {
    const list = names(value);
    if (!list.length) return false;
    return this.elements.some((el) => list.every((cls) => el.classList.contains(cls)));
  }
  // -------------------------------------------------------------------------
  // Manipulacao de DOM
  // -------------------------------------------------------------------------
  /**
   * Base de `append`, `prepend`, `before` e `after`. Quando a colecao tem mais
   * de um elemento, cada destino recebe uma copia e o ultimo fica com o
   * original, que e o comportamento esperado por quem vem do jQuery.
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
  /** Insere conteudo no fim de cada elemento. */
  append(content) {
    return this.insert(content, (el, node) => el.appendChild(node));
  }
  /** Insere conteudo no inicio de cada elemento. */
  prepend(content) {
    return this.insert(content, (el, node) => el.insertBefore(node, el.firstChild));
  }
  /** Insere conteudo antes de cada elemento. */
  before(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el));
  }
  /** Insere conteudo depois de cada elemento. */
  after(content) {
    return this.insert(content, (el, node) => el.parentNode?.insertBefore(node, el.nextSibling));
  }
  /** Move os elementos da colecao para dentro do destino. */
  appendTo(target) {
    const targets = resolve(target);
    for (let i = 0; i < targets.length; i++) {
      for (const el of this.elements) {
        targets[i].appendChild(i === targets.length - 1 ? el : el.cloneNode(true));
      }
    }
    return this;
  }
  /** Move os elementos da colecao para o inicio do destino. */
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
  /** Troca cada elemento pelo conteudo informado, desmontando o antigo. */
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
  /** Envolve cada elemento com o HTML ou elemento informado. */
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
  /** Remove o pai de cada elemento, mantendo os filhos no lugar. */
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
  /** Remove os elementos do documento e desmonta os efeitos reativos. */
  remove() {
    for (const el of this.elements) {
      destroy(el);
      el.remove();
    }
    return this;
  }
  /** Esvazia os elementos, desmontando o conteudo removido. */
  empty() {
    for (const el of this.elements) {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.replaceChildren();
    }
    return this;
  }
  /** Copia os elementos. A copia nasce sem directives inicializadas. */
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
   * Remove escutas registradas por `on`. Sem argumentos remove todas, com tipo
   * remove as daquele evento, e com seletor ou funcao afina ainda mais.
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
   * Dispara um evento. Eventos nativos com metodo proprio, como `click` e
   * `focus`, usam o metodo do elemento quando nao ha `detail`.
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
  /** Dispara um evento customizado que sobe pela arvore, no estilo componente. */
  emit(type, detail) {
    for (const el of this.elements) {
      const event = new CustomEvent(type, { detail, bubbles: true, cancelable: true });
      event.__voodoo = true;
      el.dispatchEvent(event);
    }
    return this;
  }
  // -------------------------------------------------------------------------
  // Visibilidade e animacao
  // -------------------------------------------------------------------------
  /** Mostra os elementos restaurando o display anterior. */
  show() {
    for (const el of this.elements) showElement(el);
    return this;
  }
  /** Esconde os elementos guardando o display atual. */
  hide() {
    for (const el of this.elements) hideElement(el);
    return this;
  }
  /** Alterna a visibilidade. O argumento forca mostrar ou esconder. */
  toggle(force) {
    for (const el of this.elements) {
      const visible = force === void 0 ? elementHidden(el) : force;
      if (visible) showElement(el);
      else hideElement(el);
    }
    return this;
  }
  /** Aparecimento com fade. */
  fadeIn(duration = 220) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void fadeIn(el, duration);
    }
    return this;
  }
  /** Desaparecimento com fade, terminando escondido. */
  fadeOut(duration = 220) {
    for (const el of this.elements) void fadeOut(el, duration);
    return this;
  }
  /** Recolhe a altura ate zero. */
  slideUp(duration = 240) {
    for (const el of this.elements) void slideUp(el, duration);
    return this;
  }
  /** Expande a altura ate o conteudo. */
  slideDown(duration = 240) {
    for (const el of this.elements) {
      el.removeAttribute("hidden");
      void slideDown(el, duration);
    }
    return this;
  }
  /** Alterna entre recolher e expandir. */
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
  /** Animacao pela Web Animations API. */
  animate(keyframes, options = 300) {
    for (const el of this.elements) {
      if (typeof el.animate !== "function") continue;
      el.animate(keyframes, options);
    }
    return this;
  }
  /** Rola a pagina ate o primeiro elemento. */
  scrollIntoView(options = { behavior: "smooth", block: "start" }) {
    this.elements[0]?.scrollIntoView(options);
    return this;
  }
  // -------------------------------------------------------------------------
  // Formulario
  // -------------------------------------------------------------------------
  /** Serializa os campos do primeiro elemento no formato de query string. */
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
   * Serializa os campos em um objeto. Nomes repetidos e nomes terminados em
   * `[]` viram array, caixas de selecao viram booleano e campos numericos viram
   * numero.
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
  /** Coloca o foco no primeiro elemento. */
  focus(options) {
    this.elements[0]?.focus(options);
    return this;
  }
  /** Tira o foco de todos os elementos. */
  blur() {
    for (const el of this.elements) el.blur();
    return this;
  }
  /** Seleciona o texto dos campos da colecao. */
  select() {
    for (const el of this.elements) {
      const field = el;
      if (typeof field.select === "function") field.select();
    }
    return this;
  }
  // -------------------------------------------------------------------------
  // Integracao com o runtime da Voodoo
  // -------------------------------------------------------------------------
  /**
   * Inicializa as directives dos elementos da colecao, herdando o escopo do pai.
   * Com `force`, desmonta antes para reiniciar do zero.
   */
  walk(force = false) {
    for (const el of this.elements) {
      if (force) destroy(el);
      walk(el, findScope(el.parentNode));
    }
    return this;
  }
  /** Desmonta efeitos, escutas e componentes, mantendo os elementos no DOM. */
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
  if (typeof document === "undefined") return;
  const run = () => {
    try {
      fn();
    } catch (err) {
      handleError(err, "V.ready");
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
    return;
  }
  void Promise.resolve().then(run);
}
function fromHtml(html) {
  return new VoodooCollection(parseHtml(html));
}

// src/router/index.ts
init_reactivity();
init_registry();

// src/devtools/bus.ts
var listeners = /* @__PURE__ */ new Map();
var devtoolsBus = {
  /** Publica um evento. Sem ouvintes, a chamada e praticamente gratuita. */
  emit(type, data2) {
    const set2 = listeners.get(type);
    if (!set2 || set2.size === 0) return;
    for (const listener of [...set2]) {
      try {
        listener(data2);
      } catch (err) {
        console.error("[Voodoo] erro em ouvinte de devtools:", err);
      }
    }
  },
  /** Assina um tipo de evento. Devolve a funcao que cancela a assinatura. */
  on(type, callback) {
    let set2 = listeners.get(type);
    if (!set2) listeners.set(type, set2 = /* @__PURE__ */ new Set());
    set2.add(callback);
    return () => {
      set2?.delete(callback);
    };
  },
  /** Cancela uma assinatura especifica. */
  off(type, callback) {
    listeners.get(type)?.delete(callback);
  },
  /** Remove todos os ouvintes, de um tipo ou de todos. */
  clear(type) {
    if (type) listeners.delete(type);
    else listeners.clear();
  },
  /** Quantidade de ouvintes registrados em um tipo. */
  count(type) {
    return listeners.get(type)?.size ?? 0;
  }
};

// src/router/index.ts
var settings2 = {
  mode: "history",
  base: "/",
  beforeEach: null,
  afterEach: null,
  linkActiveClass: "v-link-active",
  linkExactActiveClass: "v-link-exact-active",
  transition: true,
  titleTemplate: "%s",
  scrollBehavior: null
};
var HISTORY_KEY = "__voodooRoute";
var MAX_REDIRECTS = 10;
var compiled = [];
var scrollPositions = /* @__PURE__ */ new Map();
var viewCache = /* @__PURE__ */ new Map();
var currentKey = "inicial";
var listening = false;
var configured = false;
function emptyLocation() {
  return {
    path: "/",
    fullPath: "/",
    params: {},
    query: {},
    hash: "",
    name: "",
    meta: {},
    matched: null
  };
}
var route = reactive(emptyLocation());
function normalizePath(path) {
  let out = path || "/";
  if (!out.startsWith("/")) out = `/${out}`;
  out = out.replace(/\/{2,}/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}
function parseQuery(search) {
  const out = {};
  if (!search) return out;
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
function stringifyQuery(query2) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query2)) {
    if (value === void 0 || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}
function splitTarget(target) {
  let rest = target || "/";
  let hash = "";
  const hashIndex = rest.indexOf("#");
  if (hashIndex > -1) {
    hash = rest.slice(hashIndex + 1);
    rest = rest.slice(0, hashIndex);
  }
  let query2 = {};
  const queryIndex = rest.indexOf("?");
  if (queryIndex > -1) {
    query2 = parseQuery(rest.slice(queryIndex + 1));
    rest = rest.slice(0, queryIndex);
  }
  return { path: normalizePath(rest), query: query2, hash };
}
function stripBase(pathname) {
  const base = settings2.base.replace(/\/$/, "");
  if (!base || base === "") return pathname;
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}
function readLocation() {
  if (typeof window === "undefined") return { path: "/", query: {}, hash: "" };
  if (settings2.mode === "hash") {
    return splitTarget(window.location.hash.slice(1) || "/");
  }
  return {
    path: normalizePath(stripBase(window.location.pathname)),
    query: parseQuery(window.location.search),
    hash: window.location.hash.slice(1)
  };
}
function fullPathOf(path, query2, hash) {
  const qs = stringifyQuery(query2);
  return `${path}${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
}
function buildUrl(location2) {
  const suffix = fullPathOf(location2.path, location2.query, location2.hash);
  if (settings2.mode === "hash") {
    const { pathname, search } = window.location;
    return `${pathname}${search}#${suffix}`;
  }
  const base = settings2.base === "/" ? "" : settings2.base.replace(/\/$/, "");
  return `${base}${suffix}` || "/";
}
function compileRoute(pattern, record) {
  const clean = pattern === "*" ? "*" : normalizePath(pattern);
  const raw = clean === "*" ? ["*"] : clean.split("/").filter(Boolean);
  const segments = [];
  let score = raw.length * 10;
  for (const piece of raw) {
    if (piece === "*" || piece === "**") {
      segments.push({ type: "wildcard", value: "*", optional: true });
      score -= 30;
      continue;
    }
    if (piece.startsWith(":")) {
      const optional = piece.endsWith("?");
      const name = piece.slice(1, optional ? -1 : void 0);
      segments.push({ type: "param", value: name, optional });
      score += optional ? 1 : 2;
      continue;
    }
    segments.push({ type: "static", value: piece, optional: false });
    score += 4;
  }
  return { pattern: clean, segments, score, record };
}
function matchSegments(segments, parts) {
  const params = {};
  let index = 0;
  for (const segment of segments) {
    if (segment.type === "wildcard") {
      params["*"] = parts.slice(index).map(decodeSafe).join("/");
      return params;
    }
    if (index >= parts.length) {
      if (segment.optional) continue;
      return null;
    }
    const part = parts[index];
    if (segment.type === "static") {
      if (decodeSafe(part) !== segment.value) return null;
      index++;
      continue;
    }
    params[segment.value] = decodeSafe(part);
    index++;
  }
  return index === parts.length ? params : null;
}
function decodeSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function matchRoute(path) {
  const parts = path.split("/").filter(Boolean);
  let best = null;
  for (const candidate of compiled) {
    const params = matchSegments(candidate.segments, parts);
    if (!params) continue;
    if (!best || candidate.score > best.route.score) best = { route: candidate, params };
  }
  return best;
}
function findRecord(pattern) {
  if (!pattern) return null;
  return compiled.find((item) => item.pattern === pattern)?.record ?? null;
}
function resolve2(target) {
  const { path, query: query2, hash } = splitTarget(target);
  return locationFor(path, query2, hash);
}
function locationFor(path, query2, hash) {
  const found = matchRoute(path);
  return {
    path,
    fullPath: fullPathOf(path, query2, hash),
    params: found ? found.params : {},
    query: query2,
    hash,
    name: found?.route.record.name ?? "",
    meta: found?.route.record.meta ?? {},
    matched: found ? found.route.pattern : null
  };
}
function snapshot() {
  return {
    path: route.path,
    fullPath: route.fullPath,
    params: { ...route.params },
    query: { ...route.query },
    hash: route.hash,
    name: route.name,
    meta: route.meta,
    matched: route.matched
  };
}
function applyLocation(location2) {
  route.path = location2.path;
  route.fullPath = location2.fullPath;
  route.params = location2.params;
  route.query = location2.query;
  route.hash = location2.hash;
  route.name = location2.name;
  route.meta = location2.meta;
  route.matched = location2.matched;
  const record = findRecord(location2.matched);
  if (record?.title && typeof document !== "undefined") {
    document.title = settings2.titleTemplate.includes("%s") ? settings2.titleTemplate.replace("%s", record.title) : record.title;
  }
}
async function runGuards(to, from) {
  const record = findRecord(to.matched);
  if (record?.redirect) return record.redirect;
  if (record?.beforeEnter) {
    const verdict = await record.beforeEnter(to, from);
    if (verdict === false) return false;
    if (typeof verdict === "string") return verdict;
  }
  if (settings2.beforeEach) {
    const verdict = await settings2.beforeEach(to, from);
    if (verdict === false) return false;
    if (typeof verdict === "string") return verdict;
  }
  return true;
}
function saveScroll() {
  if (typeof window === "undefined") return;
  scrollPositions.set(currentKey, window.scrollY);
}
function scheduleScroll(to, from, saved) {
  if (typeof window === "undefined") return;
  queuePostFlush(() => {
    requestAnimationFrame(() => {
      const moveTo = (top2) => {
        if (Math.abs(window.scrollY - top2) > 1) window.scrollTo(0, top2);
      };
      if (settings2.scrollBehavior) {
        const custom = settings2.scrollBehavior(to, from, saved);
        if (custom === false) return;
        if (typeof custom === "number") {
          moveTo(custom);
          return;
        }
      }
      if (to.hash) {
        const anchor = document.getElementById(to.hash) ?? (/^[\w-]+$/.test(to.hash) ? document.querySelector(`[name="${to.hash}"]`) : null);
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      moveTo(saved ?? 0);
    });
  });
}
async function navigate(target, options = {}) {
  if (typeof window === "undefined") return false;
  startListening();
  const from = snapshot();
  let destination = resolve2(target);
  if (!options.force && destination.fullPath === from.fullPath) return true;
  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn(`Router: excesso de redirecionamentos ao navegar para "${target}".`);
      return false;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) {
      devtoolsBus.emit("navigation", {
        from: from.fullPath,
        to: destination.fullPath,
        cancelled: true,
        matched: destination.matched
      });
      return false;
    }
    if (typeof verdict === "string") {
      destination = resolve2(verdict);
      continue;
    }
    break;
  }
  saveScroll();
  const key = uid("rota");
  const historyState = { ...options.state ?? {}, [HISTORY_KEY]: key };
  const url2 = buildUrl(destination);
  if (options.replace) window.history.replaceState(historyState, "", url2);
  else window.history.pushState(historyState, "", url2);
  currentKey = key;
  applyLocation(destination);
  if (options.scroll !== false) scheduleScroll(destination, from, null);
  settings2.afterEach?.(snapshot(), from);
  devtoolsBus.emit("navigation", {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched
  });
  return true;
}
async function onHistoryChange(event) {
  const { path, query: query2, hash } = readLocation();
  const destination = locationFor(path, query2, hash);
  const from = snapshot();
  if (destination.fullPath === from.fullPath) return;
  const verdict = await runGuards(destination, from);
  if (verdict === false) {
    window.history.replaceState(
      { [HISTORY_KEY]: currentKey },
      "",
      buildUrl(from)
    );
    devtoolsBus.emit("navigation", {
      from: from.fullPath,
      to: destination.fullPath,
      cancelled: true,
      matched: destination.matched
    });
    return;
  }
  if (typeof verdict === "string") {
    void navigate(verdict, { replace: true });
    return;
  }
  saveScroll();
  const state2 = event.state;
  const key = state2 && state2[HISTORY_KEY] || uid("rota");
  currentKey = key;
  applyLocation(destination);
  scheduleScroll(destination, from, scrollPositions.get(key) ?? 0);
  settings2.afterEach?.(snapshot(), from);
  devtoolsBus.emit("navigation", {
    from: from.fullPath,
    to: destination.fullPath,
    matched: destination.matched
  });
}
function historyListener(event) {
  void onHistoryChange(event);
}
function startListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  window.addEventListener("popstate", historyListener);
  if (settings2.mode === "hash") window.addEventListener("hashchange", historyListener);
  window.addEventListener("beforeunload", saveScroll);
}
function stopRouter() {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("popstate", historyListener);
  window.removeEventListener("hashchange", historyListener);
  window.removeEventListener("beforeunload", saveScroll);
}
async function enterInitialRoute() {
  if (typeof window === "undefined") return;
  const { path, query: query2, hash } = readLocation();
  const from = snapshot();
  let destination = locationFor(path, query2, hash);
  for (let redirects = 0; ; redirects++) {
    if (redirects > MAX_REDIRECTS) {
      warn("Router: excesso de redirecionamentos na rota inicial.");
      return;
    }
    const verdict = await runGuards(destination, from);
    if (verdict === false) return;
    if (typeof verdict === "string") {
      destination = resolve2(verdict);
      continue;
    }
    break;
  }
  currentKey = uid("rota");
  window.history.replaceState({ [HISTORY_KEY]: currentKey }, "", buildUrl(destination));
  applyLocation(destination);
  if (destination.hash) scheduleScroll(destination, from, null);
  settings2.afterEach?.(snapshot(), from);
}
function addRoute(pattern, record) {
  const compiledRoute = compileRoute(pattern, record);
  const index = compiled.findIndex((item) => item.pattern === compiledRoute.pattern);
  if (index > -1) compiled.splice(index, 1, compiledRoute);
  else compiled.push(compiledRoute);
}
function removeRoute(pattern) {
  const clean = pattern === "*" ? "*" : normalizePath(pattern);
  const index = compiled.findIndex((item) => item.pattern === clean);
  if (index > -1) compiled.splice(index, 1);
}
function routePatterns() {
  return [...compiled].sort((a, b) => b.score - a.score).map((item) => item.pattern);
}
function clearViewCache(url2) {
  if (url2) viewCache.delete(url2);
  else viewCache.clear();
}
function configureRouter(options) {
  settings2.mode = options.mode ?? "history";
  settings2.base = normalizePath(options.base ?? "/");
  settings2.beforeEach = options.beforeEach ?? null;
  settings2.afterEach = options.afterEach ?? null;
  settings2.linkActiveClass = options.linkActiveClass ?? "v-link-active";
  settings2.linkExactActiveClass = options.linkExactActiveClass ?? "v-link-exact-active";
  settings2.transition = options.transition ?? true;
  settings2.titleTemplate = options.titleTemplate ?? "%s";
  settings2.scrollBehavior = options.scrollBehavior ?? null;
  compiled.length = 0;
  for (const [pattern, record] of Object.entries(options.routes ?? {})) {
    compiled.push(compileRoute(pattern, record));
  }
  configured = true;
  startListening();
  void enterInitialRoute();
  return router;
}
var router = Object.assign(configureRouter, {
  get current() {
    return route;
  },
  push: (target, options = {}) => navigate(target, options),
  replace: (target, options = {}) => navigate(target, { ...options, replace: true }),
  navigate,
  back: () => {
    if (typeof window !== "undefined") window.history.back();
  },
  forward: () => {
    if (typeof window !== "undefined") window.history.forward();
  },
  go: (delta) => {
    if (typeof window !== "undefined") window.history.go(delta);
  },
  resolve: resolve2,
  addRoute,
  removeRoute,
  patterns: routePatterns,
  stop: stopRouter,
  clearViewCache,
  get ready() {
    return configured;
  }
});
magic("$route", () => route);
magic("$router", () => router);
async function loadView(url2) {
  const cached = viewCache.get(url2);
  if (cached !== void 0) return cached;
  const html = await http.get(url2, { responseType: "text" });
  const text = typeof html === "string" ? html : String(html ?? "");
  viewCache.set(url2, text);
  return text;
}
function paramsSignature(params) {
  const keys = Object.keys(params).sort();
  return keys.map((key) => `${key}=${params[key]}`).join("&");
}
defineDirective(
  "router-view",
  ({ el, scope, modifiers, effect: effect2, cleanup }) => {
    markSkipChildren(el);
    const fallbackHtml = el.innerHTML;
    const useTransition = settings2.transition && !modifiers["no-transition"];
    let token = 0;
    const unmount = () => {
      for (const child of Array.from(el.childNodes)) destroy(child);
      el.textContent = "";
    };
    const mount = (record, html) => {
      unmount();
      if (record?.component) {
        const host = document.createElement("div");
        host.setAttribute(`${exports.config.prefix}component`, record.component);
        host.className = "v-router-page";
        el.appendChild(host);
        walk(host, scope);
        return;
      }
      el.innerHTML = html ?? fallbackHtml;
      for (const child of Array.from(el.childNodes)) walk(child, scope);
    };
    const render2 = async (record, current2) => {
      let html = null;
      if (record?.view) {
        el.classList.add("v-router-loading");
        try {
          html = await loadView(record.view);
        } catch (err) {
          handleError(err, `v-router-view ao carregar "${record.view}"`);
          html = "";
        } finally {
          el.classList.remove("v-router-loading");
        }
        if (current2 !== token) return;
      }
      if (useTransition) viewTransition(() => mount(record, html));
      else mount(record, html);
    };
    effect2(() => {
      const matched = route.matched;
      void paramsSignature(route.params);
      const record = findRecord(matched);
      void render2(record, ++token);
    });
    cleanup(() => {
      token++;
      unmount();
    });
  },
  { priority: exports.PRIORITY.DEFAULT }
);
var EXTERNAL_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;
function isExternalHref(href) {
  if (!href) return true;
  if (href.startsWith("//")) return true;
  if (EXTERNAL_PROTOCOL.test(href)) return true;
  return false;
}
function linkTarget(el, expression, evaluate2) {
  const raw = expression.trim();
  if (raw) {
    if (raw.startsWith("/") || raw.startsWith("#")) return raw;
    const value = evaluate2(raw);
    if (typeof value === "string" && value) return value;
    return raw;
  }
  const href = el.getAttribute("href") ?? "";
  if (settings2.mode === "hash" && href.startsWith("#")) return href.slice(1) || "/";
  return href;
}
function isActivePath(target, exact) {
  const { path } = splitTarget(target);
  if (path === "/" || exact) return route.path === path;
  return route.path === path || route.path.startsWith(`${path}/`);
}
defineDirective("link", ({ el, expression, modifiers, effect: effect2, cleanup, evaluate: evaluate2 }) => {
  const anchor = el;
  const onClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const target = anchor.getAttribute("target");
    if (target && target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    if ((anchor.getAttribute("rel") ?? "").split(/\s+/).includes("external")) return;
    const destination = linkTarget(el, expression, evaluate2);
    if (!destination) return;
    if (isExternalHref(destination)) return;
    if (settings2.mode !== "hash" && destination.startsWith("#")) return;
    event.preventDefault();
    void navigate(destination, {
      replace: !!modifiers.replace,
      scroll: modifiers["no-scroll"] ? false : void 0
    });
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
  effect2(() => {
    const destination = linkTarget(el, expression, evaluate2);
    if (!destination || isExternalHref(destination)) return;
    const exact = isActivePath(destination, true);
    const active = exact || isActivePath(destination, false);
    el.classList.toggle(settings2.linkActiveClass, active);
    el.classList.toggle(settings2.linkExactActiveClass, exact);
    if (exact) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
});
defineDirective("route-active", ({ el, expression, arg, modifiers, effect: effect2, evaluate: evaluate2 }) => {
  const className = arg || "active";
  effect2(() => {
    const raw = expression.trim();
    const target = raw.startsWith("/") || !raw ? raw : evaluate2(raw) ?? raw;
    const active = target ? isActivePath(String(target), !!modifiers.exact) : false;
    el.classList.toggle(className, active);
  });
});

// src/i18n/index.ts
init_reactivity();
init_registry();
var STORAGE_KEY = "voodoo:locale";
var state = reactive({
  locale: exports.config.locale || "pt-BR",
  fallback: "en",
  currency: exports.config.currency || "BRL",
  messages: {}
});
var persistKey = STORAGE_KEY;
var loadPath = "";
var loading = /* @__PURE__ */ new Map();
function lookupMessage(locale, key) {
  const tree = state.messages[locale];
  if (!tree) return null;
  const flat = tree[key];
  if (typeof flat === "string") return flat;
  let current2 = tree;
  for (const part of key.split(".")) {
    if (current2 == null || typeof current2 === "string") return null;
    current2 = current2[part];
  }
  return typeof current2 === "string" ? current2 : null;
}
function candidateLocales(locale) {
  const out = [locale];
  const short = locale.split("-")[0];
  if (short && short !== locale) out.push(short);
  for (const available of Object.keys(state.messages)) {
    if (available !== locale && available.split("-")[0] === short) out.push(available);
  }
  return out;
}
var pluralRulesCache = /* @__PURE__ */ new Map();
function pluralCategory(locale, count) {
  try {
    let rules2 = pluralRulesCache.get(locale);
    if (!rules2) pluralRulesCache.set(locale, rules2 = new Intl.PluralRules(locale));
    return rules2.select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}
var CATEGORY_ORDER = ["zero", "one", "two", "few", "many", "other"];
function choosePlural(forms, count, locale) {
  if (forms.length <= 1) return forms[0] ?? "";
  const category = pluralCategory(locale, count);
  if (forms.length === 2) return category === "one" ? forms[0] : forms[1];
  if (forms.length === 3) {
    if (count === 0) return forms[0];
    return category === "one" ? forms[1] : forms[2];
  }
  const index = CATEGORY_ORDER.indexOf(category);
  return forms[Math.min(index < 0 ? forms.length - 1 : index, forms.length - 1)];
}
var PLACEHOLDER = /\{\s*([\w.$-]+)\s*\}/g;
function interpolate(message, params) {
  if (message.indexOf("{") === -1) return message;
  return message.replace(PLACEHOLDER, (whole, name) => {
    const value = params[name];
    if (value === void 0 || value === null) return whole;
    return String(value);
  });
}
function normalizeParams(params) {
  if (params == null) return {};
  if (typeof params === "number") return { n: params };
  return params;
}
function t(key, params) {
  if (!key) return "";
  const values = normalizeParams(params);
  const locale = state.locale;
  let message = null;
  for (const candidate of candidateLocales(locale)) {
    message = lookupMessage(candidate, key);
    if (message !== null) break;
  }
  if (message === null && state.fallback && state.fallback !== locale) {
    for (const candidate of candidateLocales(state.fallback)) {
      message = lookupMessage(candidate, key);
      if (message !== null) break;
    }
  }
  if (message === null) return key;
  if (message.includes("|")) {
    const count = Number(values.n ?? values.count ?? 0);
    const forms = message.split("|").map((form) => form.trim());
    message = choosePlural(forms, Number.isNaN(count) ? 0 : count, locale);
  }
  return interpolate(message, values);
}
function te(key, locale) {
  const target = locale ?? state.locale;
  for (const candidate of candidateLocales(target)) {
    if (lookupMessage(candidate, key) !== null) return true;
  }
  if (state.fallback && state.fallback !== target) {
    for (const candidate of candidateLocales(state.fallback)) {
      if (lookupMessage(candidate, key) !== null) return true;
    }
  }
  return false;
}
function n(value, options = {}) {
  return formatNumber(value, { ...options, locale: state.locale });
}
function c(value, currency) {
  return formatCurrency(value, { locale: state.locale, currency: currency ?? state.currency });
}
function d(value, format = "short") {
  return formatDate(value, format, state.locale);
}
function rt(value) {
  return relativeTime(value, state.locale);
}
function getLocale() {
  return state.locale;
}
function messagesOf(locale) {
  return state.messages[locale ?? state.locale] ?? {};
}
function addMessages(locale, messages2) {
  const current2 = state.messages[locale];
  if (current2) merge(current2, messages2);
  else state.messages[locale] = messages2;
  return locale;
}
async function loadMessages(locale, source) {
  if (typeof source !== "string") {
    addMessages(locale, source);
    return;
  }
  const pending = loading.get(locale);
  if (pending) return pending;
  const task = http.get(source, { responseType: "json" }).then((data2) => {
    if (data2 && typeof data2 === "object") addMessages(locale, data2);
  }).catch((err) => {
    handleError(err, `i18n ao carregar "${source}"`);
  }).finally(() => {
    loading.delete(locale);
  });
  loading.set(locale, task);
  return task;
}
function setLocale(locale) {
  const target = locale?.trim();
  if (!target || target === state.locale) return Promise.resolve();
  const previous = state.locale;
  state.locale = target;
  state.currency = state.currency || exports.config.currency;
  exports.config.locale = target;
  setFormatDefaults(target, state.currency);
  if (persistKey) storage.set(persistKey, target);
  if (typeof document !== "undefined") document.documentElement.lang = target;
  devtoolsBus.emit("locale", { from: previous, to: target });
  if (!state.messages[target] && loadPath) {
    return loadMessages(target, loadPath.replace("{locale}", target));
  }
  return Promise.resolve();
}
function detectLocale() {
  if (typeof navigator === "undefined") return null;
  const available = Object.keys(state.messages);
  if (!available.length) return null;
  const preferred = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
  for (const wanted of preferred) {
    if (!wanted) continue;
    const exact = available.find((item) => item.toLowerCase() === wanted.toLowerCase());
    if (exact) return exact;
    const short = wanted.split("-")[0].toLowerCase();
    const partial = available.find((item) => item.split("-")[0].toLowerCase() === short);
    if (partial) return partial;
  }
  return null;
}
function configureI18n(options = {}) {
  if (options.messages) {
    for (const [locale, messages2] of Object.entries(options.messages)) {
      addMessages(locale, messages2);
    }
  }
  state.fallback = options.fallback ?? state.fallback;
  state.currency = options.currency ?? exports.config.currency ?? state.currency;
  loadPath = options.loadPath ?? loadPath;
  if (options.persist === false) persistKey = null;
  else if (typeof options.persist === "string") persistKey = options.persist;
  const saved = persistKey ? storage.get(persistKey) : void 0;
  const detected = options.detect === false ? null : detectLocale();
  const chosen = saved || detected || options.locale || state.locale || state.fallback;
  state.locale = chosen;
  exports.config.locale = chosen;
  setFormatDefaults(chosen, state.currency);
  if (typeof document !== "undefined") document.documentElement.lang = chosen;
  if (!state.messages[chosen] && loadPath) {
    void loadMessages(chosen, loadPath.replace("{locale}", chosen));
  }
  return i18n;
}
var i18nDinamicos = {
  get locale() {
    return state.locale;
  },
  get fallback() {
    return state.fallback;
  },
  get locales() {
    return Object.keys(state.messages);
  },
  t,
  te,
  n,
  c,
  d,
  rt,
  setLocale,
  getLocale,
  addMessages,
  loadMessages,
  messagesOf,
  detectLocale
};
var i18n = Object.defineProperties(
  configureI18n,
  Object.getOwnPropertyDescriptors(i18nDinamicos)
);
magic("$t", () => t);
magic("$locale", () => state.locale);
magic("$i18n", () => i18n);
magic("$n", () => n);
magic("$c", () => c);
magic("$d", () => d);
magic("$rt", () => rt);
var LITERAL_KEY = /^[A-Za-z_$][\w$-]*(\.[A-Za-z_$][\w$-]*)*$/;
function resolveKey(expression, evaluate2) {
  const raw = expression.trim();
  if (!raw) return "";
  if (LITERAL_KEY.test(raw)) return raw;
  const value = evaluate2(raw);
  return typeof value === "string" ? value : raw;
}
function readParams(el, evaluate2) {
  const attr2 = readAttr(el, `${exports.config.prefix}t-params`) ?? readAttr(el, "data-v-t-params");
  if (!attr2) return {};
  const value = evaluate2(attr2);
  return value && typeof value === "object" ? value : {};
}
defineDirective("t", ({ el, arg, expression, effect: effect2, evaluate: evaluate2 }) => {
  effect2(() => {
    const key = resolveKey(expression, evaluate2);
    if (!key) return;
    const text = t(key, readParams(el, evaluate2));
    if (arg) el.setAttribute(arg, text);
    else if (el.textContent !== text) el.textContent = text;
  });
});
defineDirective("t-params", () => void 0);
defineDirective("locale", ({ el, expression, effect: effect2, cleanup, evaluate: evaluate2 }) => {
  const target = () => {
    const raw = expression.trim();
    if (!raw) return "";
    if (/^[A-Za-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/.test(raw)) return raw.replace("_", "-");
    const value = evaluate2(raw);
    return typeof value === "string" ? value : raw;
  };
  const onClick = () => {
    const locale = target();
    if (locale) void setLocale(locale);
  };
  el.addEventListener("click", onClick);
  cleanup(() => el.removeEventListener("click", onClick));
  effect2(() => {
    el.classList.toggle("v-locale-active", target() === state.locale);
  });
});

// src/directives/ui.ts
init_reactivity();
init_registry();
init_style();

// src/directives/shared.ts
init_style();
init_registry();
var optionValues = /* @__PURE__ */ new WeakMap();
function attrOf(el, name) {
  return readAttr(el, `${exports.config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function hasAttrOf(el, name) {
  return hasAttr(el, `${exports.config.prefix}${name}`) || hasAttr(el, `data-v-${name}`);
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
    { priority: exports.PRIORITY.BIND }
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
  const step = () => {
    if (!session2 || session2.keyboard) return;
    autoScroll();
    scrollFrame = requestAnimationFrame(step);
  };
  scrollFrame = requestAnimationFrame(step);
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
      announce(`Item movido para a posicao ${newIndex + 1} de ${itemsOf(list).length}`);
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
    announce("Item solto na area de destino");
  }
  dispatch2(current2.item, "voodoo:drag-end", { item: current2.item, data: current2.data });
  teardown(current2);
}
function cancelDrag() {
  const current2 = session2;
  if (!current2) return;
  restorePosition(current2);
  dispatch2(current2.item, "voodoo:drag-cancel", { item: current2.item });
  announce("Arraste cancelado");
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
  const onPointerMove2 = (event) => {
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
    window.removeEventListener("pointermove", onPointerMove2);
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
    window.addEventListener("pointermove", onPointerMove2, { passive: false });
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
    announce(`Posicao ${target + 1} de ${siblings.length}`);
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
    announce(`Movido para a lista ${lists.indexOf(next) + 1} de ${lists.length}`);
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
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", "Lista reordenavel");
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
        announce("Item solto");
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
      announce("Item pego. Use as setas para mover e espaco para soltar.");
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
    el.setAttribute("aria-roledescription", "item arrastavel");
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
  const highlight2 = () => {
    targets.forEach((target, index) => target.classList.toggle("v-drop-over", index === cursor));
    const active = targets[cursor];
    if (!active || !session2) return;
    session2.overDrop = active;
    if (!device.reducedMotion) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    else active.scrollIntoView({ block: "nearest" });
    announce(active.getAttribute("aria-label") || `Destino ${cursor + 1} de ${targets.length}`);
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
      if (targets.length) highlight2();
      else announce("Nenhum destino disponivel");
      return;
    }
    if (!session2 || session2.item !== el || !targets.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      cursor = (cursor + 1) % targets.length;
      highlight2();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      cursor = (cursor - 1 + targets.length) % targets.length;
      highlight2();
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
  const isOpen = () => className ? target.classList.contains(className) : !isHidden(target);
  const sync = () => {
    el.setAttribute("aria-expanded", String(isOpen()));
  };
  const onClick = (event) => {
    event.preventDefault();
    if (className) target.classList.toggle(className);
    else if (isHidden(target)) showElement2(target, animated);
    else hideElement2(target, animated);
    sync();
    dispatch2(el, "voodoo:toggle", { target, open: isOpen() });
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
  /** Atualiza `aria-expanded` dos gatilhos e avisa quem observa. */
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
    /** Lugar original do painel, para devolver quando a directive e desmontada. */
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
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = (current2 + step + items.length) % items.length;
        items[current2 === -1 && step === -1 ? items.length - 1 : next].focus();
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
  /** Itens navegaveis pelas setas, apenas no modo menu. */
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
  /** Remove listeners e devolve o painel para onde ele estava. */
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
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!popup.open) popup.show();
    const items = popup.items();
    if (items.length) items[event.key === "ArrowDown" ? 0 : items.length - 1].focus();
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
  el.addEventListener("mouseenter", schedule);
  el.addEventListener("focusin", open);
  el.addEventListener("mouseleave", close);
  el.addEventListener("focusout", close);
  el.addEventListener("keydown", onEscape);
  cleanup(() => {
    close();
    el.removeEventListener("mouseenter", schedule);
    el.removeEventListener("focusin", open);
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
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current2 + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current2 - 1 + tabs.length) % tabs.length;
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
    const state2 = (attrOf(item, "accordion-item") || "").trim().toLowerCase();
    if (state2 !== "open" && state2 !== "true") panel.style.display = "none";
    const controller = collapseOf(panel);
    controller.triggers.add(header);
    controller.sync();
    header.classList.add("v-accordion-header", "v-focus-ring");
    if (!header.hasAttribute("role")) header.setAttribute("role", "button");
    if (!header.hasAttribute("tabindex")) header.setAttribute("tabindex", "0");
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
    /** Marca o lugar de origem do painel enquanto ele fica no corpo do documento. */
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
  }
  /** Mantem `aria-expanded` dos gatilhos em dia. */
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
    lockScroll();
    requestAnimationFrame(() => {
      this.backdrop?.classList.add("v-in");
      this.panel.classList.add("v-open");
    });
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
    el.setAttribute("aria-label", "Fechar");
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
      el.setAttribute("aria-label", dark ? "Mudar para tema claro" : "Mudar para tema escuro");
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
  { priority: exports.PRIORITY.INIT }
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
  let loading2 = false;
  const release = () => {
    loading2 = false;
  };
  const run = () => {
    if (loading2) return;
    loading2 = true;
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
  const apply = (loading2) => {
    el.classList.toggle("v-skeleton", loading2);
    if (loading2) el.setAttribute("aria-busy", "true");
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
  const label = readOption(el, "copy-label") || (ok ? "Copiado!" : "Nao foi possivel copiar");
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
  frame.setAttribute("title", "Impressao");
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
      const step = event.shiftKey ? 4 : 16;
      const rect = el.getBoundingClientRect();
      let handled = true;
      if (event.key === "ArrowRight" && direction !== "bottom") el.style.width = `${rect.width + step}px`;
      else if (event.key === "ArrowLeft" && direction !== "bottom") el.style.width = `${Math.max(32, rect.width - step)}px`;
      else if (event.key === "ArrowDown" && direction !== "right") el.style.height = `${rect.height + step}px`;
      else if (event.key === "ArrowUp" && direction !== "right") el.style.height = `${Math.max(32, rect.height - step)}px`;
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
    handle.setAttribute("aria-label", "Redimensionar");
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
  overlay.setAttribute("aria-label", "Paleta de comandos");
  const box = document.createElement("div");
  box.className = "v-command-box";
  const input = document.createElement("input");
  input.className = "v-command-input";
  input.type = "search";
  input.placeholder = "Buscar comando...";
  input.setAttribute("aria-label", "Buscar comando");
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
  const close = () => {
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
      empty.textContent = "Nenhum comando encontrado";
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
      active.scrollIntoView({ block: "nearest" });
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
  required: "Preencha este campo.",
  email: "Informe um e-mail valido.",
  url: "Informe uma URL valida.",
  number: "Informe um numero valido.",
  integer: "Informe um numero inteiro.",
  decimal: "Informe um numero decimal valido.",
  alpha: "Use apenas letras.",
  alphanumeric: "Use apenas letras e numeros.",
  minlength: "Use no minimo {param} caracteres.",
  maxlength: "Use no maximo {param} caracteres.",
  min: "O valor minimo e {param}.",
  max: "O valor maximo e {param}.",
  between: "Informe um valor entre {min} e {max}.",
  match: "Os campos nao conferem.",
  regex: "O formato informado nao e valido.",
  date: "Informe uma data valida.",
  after: "A data precisa ser posterior a {param}.",
  before: "A data precisa ser anterior a {param}.",
  accepted: "E preciso marcar esta opcao para continuar.",
  same: "Os valores precisam ser iguais.",
  different: "Os valores precisam ser diferentes.",
  in: "Escolha uma das opcoes permitidas.",
  notin: "Este valor nao e permitido.",
  phone: "Informe um telefone valido com DDD.",
  cpf: "CPF invalido.",
  cnpj: "CNPJ invalido.",
  cep: "CEP invalido.",
  creditcard: "Numero de cartao invalido.",
  strongpassword: "Use {param} caracteres ou mais, com maiuscula, minuscula, numero e simbolo.",
  unique: "Este valor ja esta em uso.",
  invalid: "Valor invalido."
};
function formatMessage(template, data2) {
  const param = data2.param ?? "";
  const parts = param.split(",");
  const replacements = {
    param,
    field: data2.field ?? "campo",
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
  return readAttr(el, `${exports.config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
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
  return el.name || el.id || `campo-${el.tagName.toLowerCase()}`;
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
  return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || "campo";
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
  const flags2 = readDirectiveAttr(el, "regex-flags") ?? "";
  try {
    return new RegExp(param, flags2).test(value);
  } catch {
    warn(`Expressao regular invalida em ${exports.config.prefix}regex: ${param}`);
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
  if (attrName.startsWith(exports.config.prefix)) body = attrName.slice(exports.config.prefix.length);
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
    warn(`Destino de ${exports.config.prefix}error-target nao encontrado: ${selector}`);
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
      warn(`Regra "${rule.name}" falhou ao executar`, err);
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
    warn(`${exports.config.prefix}validate so funciona em input, select ou textarea.`);
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
  if (el.tagName === "FORM" || el.hasAttribute(`${exports.config.prefix}submit`)) {
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
  let state2 = formStates.get(host);
  if (!state2) {
    state2 = createState();
    formStates.set(host, state2);
  }
  return state2;
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
    (name) => hasAttr(el, `${exports.config.prefix}${name}`) || hasAttr(el, `data-v-${name}`)
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
        `${exports.config.prefix}${name} precisa de um elemento com ${exports.config.prefix}submit, ${exports.config.prefix}upload, ${exports.config.prefix}dropzone ou ${exports.config.prefix}autosave.`
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
  (value) => value && !HTTP_METHODS.includes(value.trim().toUpperCase()) ? `${exports.config.prefix}method recebeu um verbo desconhecido: ${value}` : null
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
    warn(`Elemento de ${exports.config.prefix}loading nao encontrado: ${expression}`);
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
      const value = evaluateIn(expression.trim(), scope, `${exports.config.prefix}submit`);
      return value == null ? whole : String(value);
    });
  }
  const base = exports.config.baseURL;
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
  const { host, form, state: state2 } = ctx;
  state2.loading = on2;
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
  const result = evaluateIn(expression, local, `${exports.config.prefix}${option}`);
  if (typeof result === "function") {
    result.call(ctx.scope.data, payload, response);
  }
}
function swapContent2(ctx, data2) {
  const selector = readOption2(ctx.host, "target");
  if (!selector || typeof data2 !== "string") return;
  const target = document.querySelector(selector);
  if (!target) {
    warn(`Destino de ${exports.config.prefix}target nao encontrado: ${selector}`);
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
      warn(`Modo desconhecido em ${exports.config.prefix}swap: ${mode}`);
      return;
  }
  for (const node of nodes) if (node.nodeType === 1) walk(node, scope);
}
function handleSuccess(ctx, data2, status) {
  const { state: state2, form, host } = ctx;
  state2.success = true;
  state2.errors = {};
  state2.data = data2;
  state2.status = status;
  state2.dirty = false;
  state2.message = messageFrom(data2);
  swapContent2(ctx, data2);
  if (hasOption(host, "reset-success") && form.tagName === "FORM") {
    form.reset();
    clearErrors(form);
  }
  const successToast = readOption2(host, "toast-success");
  if (successToast !== null) {
    toast.success(successToast || state2.message || "Tudo certo!");
  }
  runCallback(ctx, "on-success", data2, { status });
  emit2(form, "voodoo:success", { data: data2, status, form, state: state2 });
  const redirect = readOption2(host, "redirect");
  if (redirect !== null && typeof window !== "undefined") {
    const fromServer = data2 && typeof data2 === "object" ? data2.redirect ?? data2.url : null;
    const local = ctx.scope.child({ $data: data2, $form: state2 });
    const url2 = redirect ? resolveUrl(redirect, local) : String(fromServer ?? "");
    if (url2) window.location.assign(url2);
  }
}
function handleFailure(ctx, error) {
  const { state: state2, form, host } = ctx;
  const httpError = error instanceof HttpError ? error : new HttpError(error instanceof Error ? error.message : String(error));
  const data2 = httpError.response?.data ?? null;
  state2.success = false;
  state2.data = data2;
  state2.status = httpError.status;
  state2.message = messageFrom(data2) || httpError.message;
  const serverErrors = normalizeErrors(data2);
  if (httpError.status === 422 || Object.keys(serverErrors).length > 0) {
    state2.errors = showFormErrors(form, data2);
    focusFirstError(form);
  }
  const errorToast = readOption2(host, "toast-error");
  if (errorToast !== null) {
    toast.error(errorToast || messageFrom(data2) || "Nao foi possivel enviar o formulario.");
  }
  runCallback(ctx, "on-error", data2, httpError);
  emit2(form, "voodoo:error", {
    error: httpError,
    data: data2,
    status: httpError.status,
    form,
    state: state2
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
  const { host, form, state: state2, scope } = ctx;
  if (state2.loading) return;
  const confirmMessage = readOption2(host, "confirm");
  if (confirmMessage !== null && typeof window !== "undefined") {
    if (!window.confirm(confirmMessage || "Confirma esta acao?")) return;
  }
  if (isValidatedForm(form)) {
    clearErrors(form);
    const result = await validateForm(form);
    state2.errors = result.errors;
    if (!result.valid) {
      focusFirstError(form);
      emit2(form, "voodoo:invalid", { errors: result.errors, form, state: state2 });
      return;
    }
  }
  const method = (readOption2(host, "method") || form.getAttribute("method") || "POST").trim().toUpperCase();
  const url2 = resolveUrl(rawUrl, scope) || (form.tagName === "FORM" ? form.action : "") || (typeof location !== "undefined" ? location.href : "");
  const payload = serializeForm(form, { formData: hasOption(host, "form-data") });
  const readOnly = method === "GET" || method === "HEAD";
  setLoading(ctx, true);
  state2.success = false;
  state2.progress = 0;
  emit2(form, "voodoo:submit", { url: url2, method, form, state: state2 });
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
    const state2 = ensureFormState(form);
    const formScope = scope.child({ $form: state2 }, form);
    scopeStates.set(formScope, state2);
    scopeStates.set(scope, state2);
    markNodeScope(form, formScope);
    for (const child of Array.from(form.childNodes)) {
      if (child.nodeType === 1) markNodeScope(child, formScope);
    }
    const ctx = { host: form, form, scope: formScope, state: state2 };
    const onSubmit = (event) => {
      event.preventDefault();
      void sendForm(ctx, expression);
    };
    const onFieldValidated = (event) => {
      const detail = event.detail;
      if (!detail || !detail.field) return;
      const next = { ...state2.errors };
      if (detail.valid) delete next[detail.field];
      else next[detail.field] = detail.message ?? "";
      state2.errors = next;
    };
    form.addEventListener("submit", onSubmit);
    form.addEventListener("voodoo:field-validated", onFieldValidated);
    cleanup(() => {
      formStates.delete(form);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("voodoo:field-validated", onFieldValidated);
    });
  },
  { priority: exports.PRIORITY.DATA - 1 }
);
function progressElement(host) {
  const selector = readOption2(host, "progress");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`Barra de ${exports.config.prefix}progress nao encontrada: ${selector}`);
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
function paintProgress(target, percent, state2) {
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
  if (state2) target.setAttribute("data-state", state2);
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
  const { state: state2, form, host } = ctx;
  const url2 = resolveUrl(rawUrl, ctx.scope);
  if (!url2) {
    warn(`${exports.config.prefix}upload precisa da URL de destino.`);
    return;
  }
  const bar = progressElement(host);
  const data2 = buildFileData(host, files, fieldName);
  setLoading(ctx, true);
  state2.success = false;
  state2.progress = 0;
  paintProgress(bar, 0, "loading");
  emit2(form, "voodoo:upload", { url: url2, files, form, state: state2 });
  let ok = false;
  try {
    const method = (readOption2(host, "method") || "POST").trim().toUpperCase();
    const response = await http.upload(url2, data2, {
      method: method === "PUT" || method === "PATCH" ? method : "POST",
      onProgress: (percent) => {
        state2.progress = percent;
        paintProgress(bar, percent, "loading");
        emit2(form, "voodoo:progress", { percent, form, state: state2 });
      }
    });
    ok = true;
    state2.progress = 100;
    paintProgress(bar, 100, "done");
    handleSuccess(ctx, response, 200);
  } catch (err) {
    paintProgress(bar, state2.progress, "error");
    handleFailure(ctx, err);
  } finally {
    setLoading(ctx, false);
    handleComplete(ctx, ok);
  }
}
defineDirective("upload", ({ el, scope, expression, cleanup }) => {
  const input = el;
  if (input.tagName !== "INPUT" || (input.getAttribute("type") || "").toLowerCase() !== "file") {
    warn(`${exports.config.prefix}upload precisa de um <input type="file">.`);
    return;
  }
  ensureStyles2();
  const form = input.closest("form") ?? input;
  const state2 = ensureFormState(form);
  const ctx = { host: input, form, scope, state: state2 };
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
  if (!el.textContent?.trim()) el.textContent = "Arraste arquivos aqui ou clique para escolher";
  const form = el.closest("form") ?? el;
  const state2 = ensureFormState(form);
  const ctx = { host: el, form, scope, state: state2 };
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
      if (!state2.success) el.classList.add("v-dropzone-error");
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
  saving: "Salvando...",
  saved: "Alteracoes salvas",
  error: "Nao foi possivel salvar"
};
function autosaveStatusElement(host) {
  const selector = readOption2(host, "autosave-status");
  if (selector) {
    const found = document.querySelector(selector);
    if (found) return found;
    warn(`Elemento de ${exports.config.prefix}autosave-status nao encontrado: ${selector}`);
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
  const state2 = ensureFormState(form);
  const ctx = { host: form, form, scope, state: state2 };
  const status = autosaveStatusElement(form);
  const rawDelay = (typeof modifiers.delay === "string" ? modifiers.delay : null) ?? Object.keys(modifiers).find((name) => /^[\d.]+(ms|s|m)?$/.test(name)) ?? readOption2(form, "autosave-delay") ?? 1e3;
  const delay = parseDuration(rawDelay, 1e3);
  const save = async () => {
    const url2 = resolveUrl(expression, scope);
    if (!url2) {
      warn(`${exports.config.prefix}autosave precisa da URL de destino.`);
      return;
    }
    if (state2.loading) return;
    state2.saving = true;
    paintAutosave(status, "saving");
    const method = (readOption2(form, "method") || "POST").trim().toUpperCase();
    try {
      const response = await request({
        url: url2,
        method,
        body: serializeForm(form, { formData: hasOption(form, "form-data") })
      });
      state2.data = response.data;
      state2.status = response.status;
      state2.dirty = false;
      state2.success = true;
      paintAutosave(status, "saved");
      runCallback(ctx, "on-success", response.data, { status: response.status });
      emit2(form, "voodoo:autosave", { data: response.data, status: response.status, form, state: state2 });
    } catch (err) {
      paintAutosave(status, "error");
      handleFailure(ctx, err);
    } finally {
      state2.saving = false;
    }
  };
  const schedule = debounce(() => {
    void save();
  }, delay);
  const onChange = () => {
    state2.dirty = true;
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
  const state2 = ensureFormState(form);
  const message = expression.trim() || "Existem alteracoes que ainda nao foram salvas.";
  const onChange = () => {
    state2.dirty = true;
  };
  const onClean = () => {
    state2.dirty = false;
  };
  const onBeforeUnload = (event) => {
    if (!state2.dirty || state2.loading) return;
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
  { priority: exports.PRIORITY.DATA - 1 }
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
  { priority: exports.PRIORITY.DATA - 1 }
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
      const snapshot2 = snapshots[position];
      for (const [prop, value] of Object.entries(snapshot2)) {
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
  { priority: exports.PRIORITY.DATA - 1 }
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
var contexto = null;
var volumeGeral = 0.35;
var silenciado = false;
var carregouPreferencia = false;
var CHAVE_VOLUME = "voodoo:sound:volume";
var CHAVE_SILENCIO = "voodoo:sound:muted";
function carregarPreferencia() {
  if (carregouPreferencia) return;
  carregouPreferencia = true;
  const salvo = storage.get(CHAVE_VOLUME);
  if (typeof salvo === "number" && salvo >= 0 && salvo <= 1) volumeGeral = salvo;
  const mudo = storage.get(CHAVE_SILENCIO);
  if (typeof mudo === "boolean") silenciado = mudo;
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches && storage.get(CHAVE_VOLUME) === void 0) {
    volumeGeral = 0.18;
  }
}
function obterContexto() {
  if (typeof window === "undefined") return null;
  if (contexto) {
    if (contexto.state === "suspended") void contexto.resume();
    return contexto;
  }
  const Construtor = window.AudioContext ?? window.webkitAudioContext;
  if (!Construtor) return null;
  try {
    contexto = new Construtor();
    return contexto;
  } catch {
    return null;
  }
}
function tocarCamada(ctx, camada, volumeDoEfeito) {
  const inicio = ctx.currentTime + (camada.atraso ?? 0);
  const fim = inicio + camada.duracao;
  const oscilador = ctx.createOscillator();
  oscilador.type = camada.forma ?? "sine";
  oscilador.frequency.setValueAtTime(camada.frequencia, inicio);
  if (camada.ate !== void 0 && camada.ate !== camada.frequencia) {
    oscilador.frequency.exponentialRampToValueAtTime(Math.max(1, camada.ate), fim);
  }
  const ganho = ctx.createGain();
  const pico = volumeGeral * volumeDoEfeito * (camada.volume ?? 1);
  const ataque = camada.ataque ?? 8e-3;
  ganho.gain.setValueAtTime(1e-4, inicio);
  ganho.gain.exponentialRampToValueAtTime(Math.max(1e-4, pico), inicio + ataque);
  ganho.gain.exponentialRampToValueAtTime(1e-4, fim);
  oscilador.connect(ganho);
  ganho.connect(ctx.destination);
  oscilador.start(inicio);
  oscilador.stop(fim + 0.02);
}
var efeitos = {
  /** Toque seco de confirmacao, para botoes comuns. */
  click: {
    volume: 0.5,
    camadas: [{ frequencia: 660, ate: 440, duracao: 0.06, forma: "triangle" }]
  },
  /** Estalo curto e agudo, bom para alternar algo. */
  pop: {
    volume: 0.5,
    camadas: [{ frequencia: 880, ate: 1320, duracao: 0.07, forma: "sine" }]
  },
  /** Roce leve, para passar o mouse por cima. */
  hover: {
    volume: 0.22,
    camadas: [{ frequencia: 1200, duracao: 0.035, forma: "sine" }]
  },
  /** Duas notas subindo, para dar certo. */
  success: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 783.99, duracao: 0.18, forma: "sine", atraso: 0.09 }
    ]
  },
  /** Tres notas subindo, para conclusao de fluxo. */
  complete: {
    volume: 0.6,
    camadas: [
      { frequencia: 523.25, duracao: 0.1, forma: "sine" },
      { frequencia: 659.25, duracao: 0.1, forma: "sine", atraso: 0.09 },
      { frequencia: 1046.5, duracao: 0.22, forma: "sine", atraso: 0.18 }
    ]
  },
  /** Duas notas descendo, para erro. */
  error: {
    volume: 0.6,
    camadas: [
      { frequencia: 392, duracao: 0.12, forma: "square", volume: 0.5 },
      { frequencia: 261.63, duracao: 0.24, forma: "square", volume: 0.5, atraso: 0.1 }
    ]
  },
  /** Aviso curto de atencao. */
  warning: {
    volume: 0.55,
    camadas: [
      { frequencia: 587.33, duracao: 0.1, forma: "triangle" },
      { frequencia: 587.33, duracao: 0.14, forma: "triangle", atraso: 0.14 }
    ]
  },
  /** Sino discreto, para notificacao que chega. */
  notify: {
    volume: 0.5,
    camadas: [
      { frequencia: 987.77, duracao: 0.14, forma: "sine" },
      { frequencia: 1318.51, duracao: 0.3, forma: "sine", atraso: 0.08, volume: 0.6 }
    ]
  },
  /** Toque bem curto para digitacao. */
  type: {
    volume: 0.18,
    camadas: [{ frequencia: 2200, duracao: 0.018, forma: "square" }]
  },
  /** Deslizar de abertura, para painel, gaveta e modal. */
  open: {
    volume: 0.4,
    camadas: [{ frequencia: 330, ate: 660, duracao: 0.14, forma: "sine" }]
  },
  /** Deslizar de fechamento. */
  close: {
    volume: 0.4,
    camadas: [{ frequencia: 660, ate: 330, duracao: 0.14, forma: "sine" }]
  },
  /** Recusa curta, para acao bloqueada. */
  deny: {
    volume: 0.5,
    camadas: [
      { frequencia: 220, duracao: 0.08, forma: "square", volume: 0.5 },
      { frequencia: 180, duracao: 0.12, forma: "square", volume: 0.5, atraso: 0.07 }
    ]
  },
  /** Moeda, para pontuacao e recompensa. */
  coin: {
    volume: 0.45,
    camadas: [
      { frequencia: 987.77, duracao: 0.06, forma: "square" },
      { frequencia: 1318.51, duracao: 0.16, forma: "square", atraso: 0.05 }
    ]
  },
  /** Passagem de nivel, mais festiva. */
  levelup: {
    volume: 0.55,
    camadas: [
      { frequencia: 523.25, duracao: 0.08, forma: "square" },
      { frequencia: 659.25, duracao: 0.08, forma: "square", atraso: 0.07 },
      { frequencia: 783.99, duracao: 0.08, forma: "square", atraso: 0.14 },
      { frequencia: 1046.5, duracao: 0.26, forma: "square", atraso: 0.21 }
    ]
  },
  /** Batida grave, para arrastar e soltar. */
  drop: {
    volume: 0.5,
    camadas: [{ frequencia: 180, ate: 90, duracao: 0.12, forma: "triangle" }]
  }
};
var NOTAS = {
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
  // Nomes em ingles, para quem prefere.
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  g: 392,
  a: 440,
  b: 493.88
};
function frequenciaDaNota(nome) {
  const limpo = String(nome).trim().toLowerCase();
  const casamento = /^([a-z]+#?)(\d)?$/.exec(limpo);
  if (!casamento) return null;
  const base = NOTAS[casamento[1]];
  if (base === void 0) return null;
  const oitava = casamento[2] ? Number(casamento[2]) : 4;
  return base * 2 ** (oitava - 4);
}
var arquivos = /* @__PURE__ */ new Map();
function tocarArquivo(url2, volume) {
  let elemento = arquivos.get(url2);
  if (!elemento) {
    elemento = new Audio(url2);
    elemento.preload = "auto";
    arquivos.set(url2, elemento);
  }
  elemento.volume = Math.max(0, Math.min(1, volumeGeral * volume));
  elemento.currentTime = 0;
  void elemento.play().catch(() => {
  });
}
function pareceCaminho(valor) {
  return /^(https?:)?\/\//.test(valor) || /^[./]/.test(valor) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(valor);
}
var sound = {
  /**
   * Toca um efeito pelo nome, ou um arquivo pelo caminho.
   *
   * ```js
   * V.sound.play('success')
   * V.sound.play('/audio/ding.mp3')
   * V.sound.play('click', { volume: 0.5 })
   * ```
   */
  play(nome, opcoes = {}) {
    carregarPreferencia();
    if (silenciado || !nome) return;
    const valor = String(nome).trim();
    const volume = opcoes.volume ?? 1;
    if (pareceCaminho(valor)) {
      tocarArquivo(valor, volume);
      return;
    }
    const efeito = efeitos[valor];
    if (!efeito) {
      const frequencia = frequenciaDaNota(valor);
      if (frequencia !== null) this.tone(frequencia, 200, { volume });
      return;
    }
    const ctx = obterContexto();
    if (!ctx) return;
    const tom = opcoes.tom ?? 1;
    const volumeDoEfeito = (efeito.volume ?? 1) * volume;
    for (const camada of efeito.camadas) {
      tocarCamada(
        ctx,
        tom === 1 ? camada : {
          ...camada,
          frequencia: camada.frequencia * tom,
          ate: camada.ate === void 0 ? void 0 : camada.ate * tom
        },
        volumeDoEfeito
      );
    }
  },
  /**
   * Toca uma frequencia pura.
   *
   * ```js
   * V.sound.tone(440, 300)
   * ```
   *
   * @param frequencia hertz
   * @param duracao milissegundos
   */
  tone(frequencia, duracao = 200, opcoes = {}) {
    carregarPreferencia();
    if (silenciado) return;
    const ctx = obterContexto();
    if (!ctx) return;
    tocarCamada(
      ctx,
      { frequencia, duracao: duracao / 1e3, forma: opcoes.forma ?? "sine" },
      opcoes.volume ?? 0.5
    );
  },
  /**
   * Toca uma nota pelo nome.
   *
   * ```js
   * V.sound.note('la', 300)
   * V.sound.note('do5', 200)
   * ```
   */
  note(nome, duracao = 250, opcoes = {}) {
    const frequencia = frequenciaDaNota(nome);
    if (frequencia === null) return;
    this.tone(frequencia, duracao, opcoes);
  },
  /**
   * Toca uma sequencia de notas.
   *
   * ```js
   * V.sound.melody(['do', 'mi', 'sol', 'do5'], 140)
   * ```
   *
   * @param notas nomes de nota, ou frequencias em hertz
   * @param intervalo milissegundos entre uma nota e a seguinte
   */
  melody(notas, intervalo = 150, opcoes = {}) {
    carregarPreferencia();
    if (silenciado) return;
    notas.forEach((nota, indice) => {
      const frequencia = typeof nota === "number" ? nota : frequenciaDaNota(nota);
      if (frequencia === null) return;
      setTimeout(() => this.tone(frequencia, intervalo * 1.6, opcoes), indice * intervalo);
    });
  },
  /**
   * Le ou ajusta o volume geral, de 0 a 1. A escolha fica guardada.
   *
   * ```js
   * V.sound.volume()      // le
   * V.sound.volume(0.6)   // ajusta
   * ```
   */
  volume(valor) {
    carregarPreferencia();
    if (valor === void 0) return volumeGeral;
    volumeGeral = Math.max(0, Math.min(1, valor));
    storage.set(CHAVE_VOLUME, volumeGeral);
    return volumeGeral;
  },
  /** Silencia. Passe `false` para voltar a tocar. */
  mute(valor = true) {
    carregarPreferencia();
    silenciado = valor;
    storage.set(CHAVE_SILENCIO, silenciado);
  },
  /** Volta a tocar. */
  unmute() {
    this.mute(false);
  },
  /** Alterna entre silencio e som, e devolve o novo estado. */
  toggle() {
    carregarPreferencia();
    this.mute(!silenciado);
    return silenciado;
  },
  /** `true` quando esta silenciado. */
  get muted() {
    carregarPreferencia();
    return silenciado;
  },
  /** Nomes de todos os efeitos disponiveis. */
  get names() {
    return Object.keys(efeitos);
  },
  /**
   * Registra um efeito proprio.
   *
   * ```js
   * V.sound.define('meuAviso', {
   *   volume: 0.5,
   *   camadas: [
   *     { frequencia: 700, duracao: 0.1 },
   *     { frequencia: 900, duracao: 0.2, atraso: 0.08 }
   *   ]
   * })
   * ```
   */
  define(nome, efeito) {
    efeitos[nome] = efeito;
  },
  /** Carrega um arquivo antes da hora, para nao atrasar no primeiro toque. */
  preload(...urls) {
    for (const url2 of urls) {
      if (arquivos.has(url2)) continue;
      const elemento = new Audio(url2);
      elemento.preload = "auto";
      arquivos.set(url2, elemento);
    }
  }
};
defineDirective("sound", ({ el, arg, expression, modifiers, scope, cleanup, evaluate: evaluate2 }) => {
  const evento = arg || "click";
  const resolver = () => {
    const bruto = expression.trim();
    if (!bruto) return "click";
    if (efeitos[bruto] || pareceCaminho(bruto) || frequenciaDaNota(bruto) !== null) return bruto;
    const valor = evaluate2();
    return typeof valor === "string" ? valor : bruto;
  };
  const volume = modifiers.volume !== void 0 ? Number(modifiers.volume) : void 0;
  const tocar = () => {
    sound.play(resolver(), volume === void 0 ? {} : { volume });
  };
  el.addEventListener(evento, tocar);
  cleanup(() => el.removeEventListener(evento, tocar));
});
defineDirective("mute", ({ el, cleanup }) => {
  const sincronizar = () => {
    const mudo = sound.muted;
    el.setAttribute("aria-pressed", String(mudo));
    el.classList.toggle("v-muted", mudo);
  };
  const alternar = () => {
    sound.toggle();
    sincronizar();
    if (!sound.muted) sound.play("pop");
  };
  el.addEventListener("click", alternar);
  sincronizar();
  cleanup(() => el.removeEventListener("click", alternar));
});
magic("$sound", () => sound);

// src/motion/index.ts
init_reactivity();
init_registry();
function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return device.reducedMotion;
}
var frameCallbacks = /* @__PURE__ */ new Set();
var frameHandle = 0;
function runFrame(now) {
  frameHandle = 0;
  const pending = Array.from(frameCallbacks);
  for (const callback of pending) {
    if (frameCallbacks.has(callback)) callback(now);
  }
  if (frameCallbacks.size > 0) frameHandle = requestAnimationFrame(runFrame);
}
function addFrame(callback) {
  if (typeof requestAnimationFrame !== "function") return;
  frameCallbacks.add(callback);
  if (!frameHandle) frameHandle = requestAnimationFrame(runFrame);
}
function removeFrame(callback) {
  frameCallbacks.delete(callback);
  if (frameCallbacks.size === 0 && frameHandle) {
    cancelAnimationFrame(frameHandle);
    frameHandle = 0;
  }
}
var MAX_DURATION = 12e3;
function backIn(t2) {
  return t2 * t2 * (2.70158 * t2 - 1.70158);
}
var easings = {
  /** Progresso constante. */
  linear(t2) {
    return t2;
  },
  /** Comeca devagar e acelera. */
  easeIn(t2) {
    return t2 * t2 * t2;
  },
  /** Comeca rapido e desacelera. A escolha padrao para entradas. */
  easeOut(t2) {
    return 1 - Math.pow(1 - t2, 3);
  },
  /** Acelera no comeco e freia no fim. */
  easeInOut(t2) {
    return t2 < 0.5 ? 4 * t2 * t2 * t2 : 1 - Math.pow(-2 * t2 + 2, 3) / 2;
  },
  /** Passa do alvo e volta, dando um leve exagero no fim. */
  easeOutBack(t2) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t2 - 1, 3) + c1 * Math.pow(t2 - 1, 2);
  },
  /** Freada muito longa, boa para entradas grandes. */
  easeOutExpo(t2) {
    return t2 >= 1 ? 1 : 1 - Math.pow(2, -10 * t2);
  },
  /** Recua um pouco antes de avancar, como quem toma impulso. */
  anticipate(t2) {
    const doubled = t2 * 2;
    if (doubled < 1) return 0.5 * backIn(doubled);
    return 0.5 * (2 - Math.pow(2, -10 * (doubled - 1)));
  },
  /** Quica ao chegar no alvo. */
  bounce(t2) {
    const n1 = 7.5625;
    const d1 = 2.75;
    let time = t2;
    if (time < 1 / d1) return n1 * time * time;
    if (time < 2 / d1) {
      time -= 1.5 / d1;
      return n1 * time * time + 0.75;
    }
    if (time < 2.5 / d1) {
      time -= 2.25 / d1;
      return n1 * time * time + 0.9375;
    }
    time -= 2.625 / d1;
    return n1 * time * time + 0.984375;
  }
};
function resolveEasing(easing) {
  if (typeof easing === "function") return easing;
  if (typeof easing === "string") {
    const found = easings[easing];
    if (found) return found;
  }
  return easings.easeOut;
}
var TRANSFORM_DEFAULTS = {
  x: 0,
  y: 0,
  z: 0,
  parallax: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  skewX: 0,
  skewY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1
};
var TRANSFORM_UNITS = {
  x: "px",
  y: "px",
  z: "px",
  parallax: "px",
  rotate: "deg",
  rotateX: "deg",
  rotateY: "deg",
  skewX: "deg",
  skewY: "deg",
  scale: "",
  scaleX: "",
  scaleY: ""
};
var TRANSFORM_ALIASES = {
  translateX: "x",
  translateY: "y",
  translateZ: "z",
  rotateZ: "rotate"
};
var FILTER_DEFAULTS = {
  blur: 0,
  brightness: 1,
  saturate: 1,
  grayscale: 0,
  contrast: 1
};
var FILTER_UNITS = {
  blur: "px",
  brightness: "",
  saturate: "",
  grayscale: "",
  contrast: ""
};
var UNITLESS2 = /* @__PURE__ */ new Set([
  "opacity",
  "z-index",
  "font-weight",
  "line-height",
  "flex-grow",
  "flex-shrink",
  "order",
  "zoom",
  "fill-opacity",
  "stroke-opacity",
  "stroke-width",
  "stroke-dashoffset",
  "stroke-dasharray"
]);
var transformState = /* @__PURE__ */ new WeakMap();
var filterState = /* @__PURE__ */ new WeakMap();
function getTransformState(el) {
  let state2 = transformState.get(el);
  if (!state2) {
    state2 = { ...TRANSFORM_DEFAULTS };
    transformState.set(el, state2);
  }
  return state2;
}
function getFilterState(el) {
  let state2 = filterState.get(el);
  if (!state2) {
    state2 = { ...FILTER_DEFAULTS };
    filterState.set(el, state2);
  }
  return state2;
}
function round(value) {
  return Math.round(value * 1e3) / 1e3;
}
function applyTransform(el) {
  const state2 = transformState.get(el);
  if (!state2) return;
  const parts = [];
  const y = state2.y + state2.parallax;
  if (state2.x || y || state2.z) {
    parts.push(`translate3d(${round(state2.x)}px, ${round(y)}px, ${round(state2.z)}px)`);
  }
  if (state2.rotateX) parts.push(`rotateX(${round(state2.rotateX)}deg)`);
  if (state2.rotateY) parts.push(`rotateY(${round(state2.rotateY)}deg)`);
  if (state2.rotate) parts.push(`rotate(${round(state2.rotate)}deg)`);
  if (state2.skewX || state2.skewY) {
    parts.push(`skew(${round(state2.skewX)}deg, ${round(state2.skewY)}deg)`);
  }
  const scaleX = state2.scale * state2.scaleX;
  const scaleY = state2.scale * state2.scaleY;
  if (scaleX !== 1 || scaleY !== 1) parts.push(`scale(${round(scaleX)}, ${round(scaleY)})`);
  if (parts.length > 0) el.style.transform = parts.join(" ");
  else el.style.removeProperty("transform");
}
function applyFilter(el) {
  const state2 = filterState.get(el);
  if (!state2) return;
  const parts = [];
  if (state2.blur) parts.push(`blur(${round(state2.blur)}px)`);
  if (state2.brightness !== 1) parts.push(`brightness(${round(state2.brightness)})`);
  if (state2.saturate !== 1) parts.push(`saturate(${round(state2.saturate)})`);
  if (state2.grayscale) parts.push(`grayscale(${round(state2.grayscale)})`);
  if (state2.contrast !== 1) parts.push(`contrast(${round(state2.contrast)})`);
  if (parts.length > 0) el.style.filter = parts.join(" ");
  else el.style.removeProperty("filter");
}
var NUMBER_UNIT = /^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;
var HEX_COLOR = /^#([0-9a-f]{3,8})$/i;
function isColorValue(value) {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return text === "transparent" || HEX_COLOR.test(text) || text.startsWith("rgb") || text.startsWith("hsl");
}
function hslToRgb(hue, saturation, lightness) {
  const h2 = (hue % 360 + 360) % 360;
  const c2 = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c2 * (1 - Math.abs(h2 / 60 % 2 - 1));
  const m = lightness - c2 / 2;
  let rgb;
  if (h2 < 60) rgb = [c2, x, 0];
  else if (h2 < 120) rgb = [x, c2, 0];
  else if (h2 < 180) rgb = [0, c2, x];
  else if (h2 < 240) rgb = [0, x, c2];
  else if (h2 < 300) rgb = [x, 0, c2];
  else rgb = [c2, 0, x];
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255)
  ];
}
function parseColor(input) {
  const text = input.trim().toLowerCase();
  if (text === "transparent") return [0, 0, 0, 0];
  const hex = HEX_COLOR.exec(text);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split("").map((ch) => ch + ch).join("");
    }
    const value = parseInt(digits.slice(0, 6), 16);
    const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return [value >> 16 & 255, value >> 8 & 255, value & 255, alpha];
  }
  const tokens = text.match(/-?(?:\d+\.?\d*|\.\d+)%?/g) ?? [];
  const at = (index, scale) => {
    const raw = tokens[index] ?? "0";
    const amount = parseFloat(raw);
    return raw.endsWith("%") ? amount / 100 * scale : amount;
  };
  if (text.startsWith("hsl")) {
    const ratio = (index) => {
      const raw = tokens[index] ?? "0";
      const amount = parseFloat(raw);
      return raw.endsWith("%") || amount > 1 ? amount / 100 : amount;
    };
    const rgb = hslToRgb(parseFloat(tokens[0] ?? "0"), ratio(1), ratio(2));
    return [rgb[0], rgb[1], rgb[2], tokens.length > 3 ? at(3, 1) : 1];
  }
  return [at(0, 255), at(1, 255), at(2, 255), tokens.length > 3 ? at(3, 1) : 1];
}
function formatRgba(color) {
  const alpha = Math.max(0, Math.min(1, color[3]));
  return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${round(alpha)})`;
}
function kebabCase(name) {
  if (name.startsWith("--")) return name;
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
function readCurrent(el, kind, prop, cssName) {
  if (kind === "transform") return getTransformState(el)[prop];
  if (kind === "filter") return getFilterState(el)[prop];
  if (typeof getComputedStyle !== "function") return el.style.getPropertyValue(cssName).trim();
  const computed2 = getComputedStyle(el).getPropertyValue(cssName);
  return computed2 ? computed2.trim() : "";
}
function buildTrack(el, name, spec) {
  const prop = TRANSFORM_ALIASES[name] ?? name;
  const kind = prop in TRANSFORM_DEFAULTS ? "transform" : prop in FILTER_DEFAULTS ? "filter" : "style";
  const cssName = kind === "style" ? kebabCase(prop) : prop;
  const fallbackUnit = kind === "transform" ? TRANSFORM_UNITS[prop] : kind === "filter" ? FILTER_UNITS[prop] : UNITLESS2.has(cssName) ? "" : "px";
  const pair = Array.isArray(spec) ? [spec[0], spec[1]] : [readCurrent(el, kind, prop, cssName), spec];
  const track2 = {
    kind,
    prop,
    cssName,
    mode: "number",
    unit: fallbackUnit,
    from: 0,
    to: 0,
    fromColor: [0, 0, 0, 1],
    toColor: [0, 0, 0, 1],
    fromText: String(pair[0]),
    toText: String(pair[1])
  };
  if (isColorValue(pair[0]) || isColorValue(pair[1])) {
    if (kind !== "style") return null;
    track2.mode = "color";
    track2.fromColor = isColorValue(pair[0]) ? parseColor(String(pair[0])) : [0, 0, 0, 0];
    track2.toColor = isColorValue(pair[1]) ? parseColor(String(pair[1])) : [0, 0, 0, 0];
    return track2;
  }
  const from = readNumeric(pair[0], fallbackUnit);
  const to = readNumeric(pair[1], fallbackUnit);
  if (!from || !to) {
    if (kind !== "style") return null;
    track2.mode = "discrete";
    return track2;
  }
  track2.from = from.value;
  track2.to = to.value;
  track2.unit = to.unit || from.unit || fallbackUnit;
  return track2;
}
function readNumeric(value, fallbackUnit) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, unit: fallbackUnit } : null;
  }
  const match = NUMBER_UNIT.exec(value.trim());
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2] || fallbackUnit };
}
function applyTracks(el, tracks, progress) {
  let touchedTransform = false;
  let touchedFilter = false;
  for (const track2 of tracks) {
    if (track2.kind === "transform") {
      getTransformState(el)[track2.prop] = track2.from + (track2.to - track2.from) * progress;
      touchedTransform = true;
      continue;
    }
    if (track2.kind === "filter") {
      getFilterState(el)[track2.prop] = track2.from + (track2.to - track2.from) * progress;
      touchedFilter = true;
      continue;
    }
    if (track2.mode === "color") {
      const mixed = [
        track2.fromColor[0] + (track2.toColor[0] - track2.fromColor[0]) * progress,
        track2.fromColor[1] + (track2.toColor[1] - track2.fromColor[1]) * progress,
        track2.fromColor[2] + (track2.toColor[2] - track2.fromColor[2]) * progress,
        track2.fromColor[3] + (track2.toColor[3] - track2.fromColor[3]) * progress
      ];
      el.style.setProperty(track2.cssName, formatRgba(mixed));
      continue;
    }
    if (track2.mode === "discrete") {
      el.style.setProperty(track2.cssName, progress >= 1 ? track2.toText : track2.fromText);
      continue;
    }
    const value = track2.from + (track2.to - track2.from) * progress;
    el.style.setProperty(track2.cssName, `${round(value)}${track2.unit}`);
  }
  if (touchedTransform) applyTransform(el);
  if (touchedFilter) applyFilter(el);
}
function buildTracks(el, keyframes) {
  const tracks = [];
  for (const [name, spec] of Object.entries(keyframes)) {
    if (spec === void 0 || spec === null) continue;
    const track2 = buildTrack(el, name, spec);
    if (track2) tracks.push(track2);
  }
  return tracks;
}
function applyInitial(target, keyframes) {
  for (const el of resolveTargets(target)) {
    applyTracks(el, buildTracks(el, keyframes), 0);
  }
}
function captureState(el, keyframes) {
  const out = {};
  for (const name of Object.keys(keyframes)) {
    const prop = TRANSFORM_ALIASES[name] ?? name;
    const kind = prop in TRANSFORM_DEFAULTS ? "transform" : prop in FILTER_DEFAULTS ? "filter" : "style";
    out[name] = readCurrent(el, kind, prop, kind === "style" ? kebabCase(prop) : prop);
  }
  return out;
}
function isMotionElement(value) {
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return true;
  return typeof SVGElement !== "undefined" && value instanceof SVGElement;
}
function resolveTargets(target) {
  if (!target) return [];
  if (typeof target === "string") {
    if (typeof document === "undefined") return [];
    return Array.from(document.querySelectorAll(target)).filter(isMotionElement);
  }
  if (isMotionElement(target)) return [target];
  const list = target;
  if (typeof list.length !== "number") return [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (isMotionElement(item)) out.push(item);
  }
  return out;
}
function instantControl(onStop) {
  return {
    finished: Promise.resolve(),
    stop() {
    }
  };
}
function animateOne(el, keyframes, options) {
  const tracks = buildTracks(el, keyframes);
  if (prefersReducedMotion() && !options.force) {
    applyTracks(el, tracks, 1);
    options.onUpdate?.(1);
    options.onComplete?.();
    return instantControl();
  }
  const duration = Math.max(0, options.duration ?? 400);
  const delay = Math.max(0, options.delay ?? 0);
  const ease = resolveEasing(options.easing);
  const repeat = Math.max(0, Math.floor(options.repeat ?? 0));
  const repeatType = options.repeatType ?? "loop";
  const springConfig = options.spring === true ? {} : options.spring ? options.spring : null;
  let settle;
  const finished = new Promise((resolve3) => {
    settle = resolve3;
  });
  let running = true;
  let startedAt = -1;
  let previous = -1;
  let springPosition = 0;
  let springVelocity = springConfig?.velocity ?? 0;
  function frame(now) {
    if (!running) return;
    if (startedAt < 0) {
      startedAt = now;
      previous = now;
    }
    const elapsed = now - startedAt - delay;
    if (elapsed < 0) return;
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;
    if (elapsed > MAX_DURATION) {
      complete(1);
      return;
    }
    if (springConfig) {
      const stiffness = springConfig.stiffness ?? 170;
      const damping = springConfig.damping ?? 26;
      const mass = springConfig.mass ?? 1;
      const steps = Math.max(1, Math.round(delta));
      const step = delta / steps / 1e3;
      for (let i = 0; i < steps; i++) {
        const acceleration = (-stiffness * (springPosition - 1) - damping * springVelocity) / mass;
        springVelocity += acceleration * step;
        springPosition += springVelocity * step;
      }
      const restDelta = springConfig.restDelta ?? 1e-3;
      const restSpeed = springConfig.restSpeed ?? 0.01;
      if (Math.abs(1 - springPosition) < restDelta && Math.abs(springVelocity) < restSpeed) {
        complete(1);
        return;
      }
      applyTracks(el, tracks, springPosition);
      options.onUpdate?.(springPosition);
      return;
    }
    if (duration === 0) {
      complete(1);
      return;
    }
    const total = repeat + 1;
    let iteration = Math.floor(elapsed / duration);
    let local = (elapsed - iteration * duration) / duration;
    let last = false;
    if (iteration >= total) {
      iteration = total - 1;
      local = 1;
      last = true;
    }
    let progress;
    if (iteration % 2 === 1 && repeatType === "reverse") progress = ease(1 - local);
    else if (iteration % 2 === 1 && repeatType === "mirror") progress = 1 - ease(local);
    else progress = ease(local);
    if (last) {
      complete(progress);
      return;
    }
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
  }
  function complete(progress) {
    if (!running) return;
    running = false;
    removeFrame(frame);
    applyTracks(el, tracks, progress);
    options.onUpdate?.(progress);
    settle();
    options.onComplete?.();
  }
  applyTracks(el, tracks, springConfig ? springPosition : ease(0));
  addFrame(frame);
  return {
    finished,
    stop() {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    }
  };
}
function animate(target, keyframes, options = {}) {
  const elements = resolveTargets(target);
  if (elements.length === 0) return instantControl();
  if (elements.length === 1) return animateOne(elements[0], keyframes, options);
  const controls = elements.map((el) => animateOne(el, keyframes, options));
  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => void 0),
    stop() {
      for (const control of controls) control.stop();
    }
  };
}
function spring(from, to, options = {}) {
  if (prefersReducedMotion()) {
    options.onUpdate?.(to);
    options.onComplete?.();
    return instantControl();
  }
  const stiffness = options.stiffness ?? 170;
  const damping = options.damping ?? 26;
  const mass = options.mass ?? 1;
  const range = Math.abs(to - from) || 1;
  const restDelta = options.restDelta ?? range * 1e-3;
  const restSpeed = options.restSpeed ?? range * 0.01;
  let position = from;
  let velocity = options.velocity ?? 0;
  let running = true;
  let previous = -1;
  let elapsed = 0;
  let settle;
  const finished = new Promise((resolve3) => {
    settle = resolve3;
  });
  function frame(now) {
    if (!running) return;
    if (previous < 0) {
      previous = now;
      options.onUpdate?.(position);
      return;
    }
    const delta = Math.min(64, Math.max(0, now - previous));
    previous = now;
    elapsed += delta;
    const steps = Math.max(1, Math.round(delta));
    const step = delta / steps / 1e3;
    for (let i = 0; i < steps; i++) {
      const acceleration = (-stiffness * (position - to) - damping * velocity) / mass;
      velocity += acceleration * step;
      position += velocity * step;
    }
    const rested = Math.abs(to - position) < restDelta && Math.abs(velocity) < restSpeed;
    if (rested || elapsed > MAX_DURATION) {
      running = false;
      removeFrame(frame);
      position = to;
      options.onUpdate?.(to);
      settle();
      options.onComplete?.();
      return;
    }
    options.onUpdate?.(position);
  }
  addFrame(frame);
  return {
    finished,
    stop() {
      if (!running) return;
      running = false;
      removeFrame(frame);
      settle();
    }
  };
}
function staggerDelay(index, total, step, from) {
  if (from === "last") return (total - 1 - index) * step;
  if (from === "center") return Math.abs(index - (total - 1) / 2) * step;
  return index * step;
}
function stagger(targets, keyframes, options = {}) {
  const elements = resolveTargets(targets);
  if (elements.length === 0) return instantControl();
  const step = options.delay ?? 60;
  const start2 = options.start ?? 0;
  const from = options.from ?? "first";
  const controls = elements.map(
    (el, index) => animateOne(el, keyframes, {
      ...options,
      delay: start2 + staggerDelay(index, elements.length, step, from)
    })
  );
  return {
    finished: Promise.all(controls.map((control) => control.finished)).then(() => void 0),
    stop() {
      for (const control of controls) control.stop();
    }
  };
}
function thresholdOf(amount) {
  if (amount === "all") return 0.99;
  if (amount === "any") return 0;
  if (typeof amount === "number") return Math.max(0, Math.min(1, amount));
  return 0.25;
}
function inView(el, callback, options = {}) {
  const once2 = options.once ?? true;
  let leaveHandler;
  if (typeof IntersectionObserver === "undefined") {
    leaveHandler = callback({
      target: el,
      isIntersecting: true,
      intersectionRatio: 1
    });
    return () => {
      if (typeof leaveHandler === "function") leaveHandler();
    };
  }
  const observer3 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          leaveHandler = callback(entry);
          if (once2) observer3.disconnect();
        } else if (typeof leaveHandler === "function") {
          leaveHandler();
          leaveHandler = void 0;
        }
      }
    },
    {
      root: options.root ?? null,
      rootMargin: options.margin ?? "0px",
      threshold: thresholdOf(options.amount)
    }
  );
  observer3.observe(el);
  return () => {
    observer3.disconnect();
    if (typeof leaveHandler === "function") leaveHandler();
  };
}
function scrollProgress(el, callback) {
  let stopped = false;
  let queued = false;
  if (typeof window === "undefined") {
    callback(0);
    return () => {
      stopped = true;
    };
  }
  const measure = () => {
    queued = false;
    if (stopped) return;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const span = viewport + rect.height || 1;
    const raw = (viewport - rect.top) / span;
    callback(Math.max(0, Math.min(1, raw)));
  };
  const schedule = () => {
    if (queued || stopped) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  measure();
  return () => {
    stopped = true;
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}
var fadeIn2 = { opacity: [0, 1], duration: 420, easing: "easeOut" };
var fadeUp = {
  opacity: [0, 1],
  y: [24, 0],
  duration: 520,
  easing: "easeOutExpo"
};
var fadeDown = {
  opacity: [0, 1],
  y: [-24, 0],
  duration: 520,
  easing: "easeOutExpo"
};
var scaleIn = {
  opacity: [0, 1],
  scale: [0.92, 1],
  duration: 460,
  easing: "easeOutBack"
};
var slideLeft = {
  opacity: [0, 1],
  x: [36, 0],
  duration: 500,
  easing: "easeOutExpo"
};
var slideRight = {
  opacity: [0, 1],
  x: [-36, 0],
  duration: 500,
  easing: "easeOutExpo"
};
var pop = {
  opacity: [0, 1],
  scale: [0.6, 1],
  spring: { stiffness: 420, damping: 18 }
};
var blurIn = {
  opacity: [0, 1],
  blur: [10, 0],
  duration: 560,
  easing: "easeOut"
};
var flip = {
  opacity: [0, 1],
  rotateX: [-80, 0],
  duration: 620,
  easing: "easeOutBack"
};
var motionPresets = {
  fadeIn: fadeIn2,
  fadeUp,
  fadeDown,
  scaleIn,
  slideLeft,
  slideRight,
  pop,
  blurIn,
  flip
};
var OPTION_KEYS = /* @__PURE__ */ new Set([
  "duration",
  "delay",
  "easing",
  "spring",
  "repeat",
  "repeatType",
  "force",
  "from",
  "start",
  "onUpdate",
  "onComplete"
]);
function splitVariant(variant) {
  const keyframes = {};
  const options = {};
  for (const [key, value] of Object.entries(variant)) {
    if (value === void 0 || value === null) continue;
    if (OPTION_KEYS.has(key)) options[key] = value;
    else keyframes[key] = value;
  }
  return { keyframes, options };
}
function looksLikeExpression(text) {
  const value = text.trim();
  if (!value) return false;
  if (/^['"`]/.test(value)) return true;
  if (/^[[{(]/.test(value)) return true;
  return /^[$A-Za-z_][\w$]*(?:\.[$A-Za-z_][\w$]*|\[[^\]]*\])*$/.test(value);
}
function resolveVariant(expression, evaluate2) {
  const text = expression.trim();
  if (!text) return null;
  if (motionPresets[text]) return motionPresets[text];
  if (!looksLikeExpression(text)) return null;
  const value = evaluate2();
  if (typeof value === "string" && motionPresets[value]) return motionPresets[value];
  if (value && typeof value === "object") return value;
  return null;
}
function readAttr2(el, name) {
  return el.getAttribute(`${exports.config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
}
function hasAttr3(el, name) {
  return el.hasAttribute(`${exports.config.prefix}${name}`) || el.hasAttribute(`data-v-${name}`);
}
var staggerSetups = /* @__PURE__ */ new WeakMap();
function readStaggerFrom(el) {
  const raw = readAttr2(el, "motion-stagger-from");
  if (raw === "last" || raw === "center") return raw;
  return "first";
}
function isStaggerChild(el) {
  return hasAttr3(el, "motion") || hasAttr3(el, "motion-scroll");
}
function inheritedStaggerDelay(el) {
  const parent = el.parentElement;
  if (!parent) return 0;
  let setup = staggerSetups.get(parent);
  if (!setup) {
    const raw = readAttr2(parent, "motion-stagger");
    if (raw === null) return 0;
    setup = { step: parseDuration(raw, 60), from: readStaggerFrom(parent) };
  }
  const siblings = Array.from(parent.children).filter(isStaggerChild);
  const index = siblings.indexOf(el);
  if (index < 0) return 0;
  return staggerDelay(index, siblings.length, setup.step, setup.from);
}
defineDirective("motion", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion nao reconheceu a variante "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;
  const control = animate(el, keyframes, options);
  cleanup(() => control.stop());
});
defineDirective("motion-scroll", ({ el, expression, evaluate: evaluate2, modifiers, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-scroll nao reconheceu a variante "${expression}".`);
    return;
  }
  const { keyframes, options } = splitVariant(variant);
  const extra = inheritedStaggerDelay(el);
  if (extra > 0) options.delay = (options.delay ?? 0) + extra;
  const once2 = !modifiers.repeat;
  const amountAttr = readAttr2(el, "motion-scroll-amount");
  const amount = amountAttr === null ? 0.25 : parseFloat(amountAttr) || 0;
  if (!prefersReducedMotion()) applyInitial(el, keyframes);
  let control = null;
  const stopWatching = inView(
    el,
    () => {
      control?.stop();
      control = animate(el, keyframes, options);
      if (once2) return void 0;
      return () => {
        control?.stop();
        if (!prefersReducedMotion()) applyInitial(el, keyframes);
      };
    },
    { once: once2, amount, margin: readAttr2(el, "motion-scroll-margin") ?? "0px" }
  );
  cleanup(() => {
    stopWatching();
    control?.stop();
  });
});
defineDirective(
  "motion-stagger",
  ({ el, expression, evaluate: evaluate2 }) => {
    const value = evaluate2();
    const step = typeof value === "number" && Number.isFinite(value) ? value : parseDuration(expression, 60);
    staggerSetups.set(el, { step, from: readStaggerFrom(el) });
  },
  { priority: exports.PRIORITY.BIND }
);
function bindInteraction(el, variant, enterEvents, leaveEvents, defaults2, cleanup) {
  const { keyframes, options } = splitVariant(variant);
  const merged = { ...defaults2, ...options };
  let base = null;
  let control = null;
  const goTo = (frames) => {
    control?.stop();
    control = animate(el, frames, merged);
  };
  const onEnter = () => {
    if (!base) base = captureState(el, keyframes);
    goTo(keyframes);
  };
  const onLeave = () => {
    if (!base) return;
    goTo(base);
  };
  for (const name of enterEvents) el.addEventListener(name, onEnter);
  for (const name of leaveEvents) el.addEventListener(name, onLeave);
  cleanup(() => {
    for (const name of enterEvents) el.removeEventListener(name, onEnter);
    for (const name of leaveEvents) el.removeEventListener(name, onLeave);
    control?.stop();
  });
}
defineDirective("motion-hover", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-hover nao reconheceu a variante "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ["mouseenter", "focusin"],
    ["mouseleave", "focusout"],
    { duration: 220, easing: "easeOut" },
    cleanup
  );
});
defineDirective("motion-tap", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  const variant = resolveVariant(expression, evaluate2);
  if (!variant) {
    warn(`v-motion-tap nao reconheceu a variante "${expression}".`);
    return;
  }
  bindInteraction(
    el,
    variant,
    ["pointerdown"],
    ["pointerup", "pointercancel", "pointerleave", "blur"],
    { duration: 140, easing: "easeOut" },
    cleanup
  );
});
defineDirective("parallax", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  if (prefersReducedMotion() || typeof window === "undefined") return;
  const value = evaluate2();
  const factor = typeof value === "number" && Number.isFinite(value) ? value : parseFloat(expression) || 0.3;
  el.style.willChange = "transform";
  let queued = false;
  const measure = () => {
    queued = false;
    const rect = el.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight || 1;
    const center = rect.top + rect.height / 2;
    getTransformState(el).parallax = (viewport / 2 - center) * factor;
    applyTransform(el);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  measure();
  cleanup(() => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    getTransformState(el).parallax = 0;
    applyTransform(el);
    el.style.removeProperty("will-change");
  });
});
var flipEntries = /* @__PURE__ */ new Map();
var flipObserver = null;
var flipQueued = false;
function scheduleFlipPass() {
  if (flipQueued || typeof requestAnimationFrame !== "function") return;
  flipQueued = true;
  requestAnimationFrame(runFlipPass);
}
function runFlipPass() {
  flipQueued = false;
  for (const entry of flipEntries.values()) {
    if (!entry.el.isConnected || entry.animating) continue;
    const next = entry.el.getBoundingClientRect();
    const previous = entry.rect;
    entry.rect = next;
    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    const sx = next.width > 0 ? previous.width / next.width : 1;
    const sy = next.height > 0 ? previous.height / next.height : 1;
    const moved = Math.abs(dx) >= 1 || Math.abs(dy) >= 1;
    const resized = Math.abs(sx - 1) >= 0.01 || Math.abs(sy - 1) >= 0.01;
    if (!moved && !resized) continue;
    entry.animating = true;
    entry.control?.stop();
    entry.control = animate(
      entry.el,
      { x: [dx, 0], y: [dy, 0], scaleX: [sx, 1], scaleY: [sy, 1] },
      entry.options
    );
    entry.control.finished.then(() => {
      entry.animating = false;
      if (entry.el.isConnected) entry.rect = entry.el.getBoundingClientRect();
    });
  }
}
function ensureFlipWatcher() {
  if (flipObserver || typeof MutationObserver === "undefined") return;
  const root = exports.config.root ?? document.body;
  if (!root) return;
  flipObserver = new MutationObserver(scheduleFlipPass);
  flipObserver.observe(root, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleFlipPass);
}
defineDirective("flip", ({ el, expression, evaluate: evaluate2, cleanup }) => {
  if (typeof document === "undefined") return;
  const variant = resolveVariant(expression, evaluate2);
  const options = variant ? splitVariant(variant).options : {};
  if (options.duration === void 0 && options.spring === void 0) {
    options.spring = { stiffness: 340, damping: 34 };
  }
  ensureFlipWatcher();
  flipEntries.set(el, {
    el,
    rect: el.getBoundingClientRect(),
    options,
    control: null,
    animating: false
  });
  cleanup(() => {
    flipEntries.get(el)?.control?.stop();
    flipEntries.delete(el);
  });
});
function countFormatter(format, decimals) {
  const numberOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  if (format === "currency") {
    numberOptions.style = "currency";
    numberOptions.currency = exports.config.currency;
  }
  const formatter = new Intl.NumberFormat(exports.config.locale, numberOptions);
  if (format === "percent") return (value) => `${formatter.format(value)}%`;
  return (value) => formatter.format(value);
}
defineDirective("count", ({ el, evaluate: evaluate2, effect: effect2, cleanup }) => {
  const duration = parseDuration(readAttr2(el, "count-duration") ?? void 0, 1400);
  const decimals = Math.max(0, Math.min(6, parseInt(readAttr2(el, "count-decimals") ?? "0", 10) || 0));
  const format = readAttr2(el, "count-format") ?? "number";
  const prefix = readAttr2(el, "count-prefix") ?? "";
  const suffix = readAttr2(el, "count-suffix") ?? "";
  const formatter = countFormatter(format, decimals);
  let current2 = 0;
  let control = null;
  effect2(() => {
    const raw = Number(evaluate2());
    const target = Number.isFinite(raw) ? raw : 0;
    const start2 = current2;
    control?.stop();
    control = animate(
      el,
      {},
      {
        duration,
        easing: "easeOutExpo",
        onUpdate(progress) {
          current2 = start2 + (target - start2) * progress;
          el.textContent = `${prefix}${formatter(current2)}${suffix}`;
        }
      }
    );
  });
  cleanup(() => control?.stop());
});
defineDirective("typewriter", ({ el, expression, evaluate: evaluate2, effect: effect2, cleanup }) => {
  const speed = parseDuration(readAttr2(el, "typewriter-speed") ?? void 0, 45);
  const dynamic = looksLikeExpression(expression);
  let control = null;
  effect2(() => {
    const text = dynamic ? String(evaluate2() ?? "") : expression;
    control?.stop();
    el.textContent = "";
    if (!text) return;
    let shown = -1;
    control = animate(
      el,
      {},
      {
        duration: Math.max(1, text.length * speed),
        easing: "linear",
        onUpdate(progress) {
          const count = Math.round(progress * text.length);
          if (count === shown) return;
          shown = count;
          el.textContent = text.slice(0, count);
        }
      }
    );
  });
  cleanup(() => control?.stop());
});

// src/charts/index.ts
init_style();
init_registry();
function prefersReducedMotion2() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return device.reducedMotion;
}
var CHART_COLORS = [
  "#6D3BF5",
  "#FF3D8B",
  "#2ED9A5",
  "#FFB35C",
  "#9B7BFF",
  "#FF4D4D",
  "#14111F",
  "#3BB6F5"
];
var CSS4 = `
.v-chart{position:relative;display:block;width:100%;color:var(--v-text,#14111F);
  font:500 12px/1.35 var(--v-font-sans,system-ui,-apple-system,'Segoe UI',sans-serif)}
.v-chart-svg{display:block;width:100%;overflow:visible;touch-action:pan-y}
.v-chart-grid{stroke:var(--v-border,#E6E0F0);stroke-width:1;shape-rendering:crispEdges}
.v-chart-axis{fill:var(--v-text-muted,#6B6580);font-size:11px}
.v-chart-empty{fill:var(--v-text-muted,#6B6580);font-size:13px}
.v-chart-line{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.v-chart-area{stroke:none}
.v-chart-point{stroke:var(--v-surface,#fff);stroke-width:2}
.v-chart-value{fill:var(--v-text,#14111F);font-size:11px;font-weight:600}
.v-chart-center{fill:var(--v-text,#14111F);font-size:20px;font-weight:700}
.v-chart-center-sub{fill:var(--v-text-muted,#6B6580);font-size:11px;font-weight:500}
.v-chart-track{fill:none;stroke:var(--v-border,#E6E0F0)}
.v-chart-radar-web{fill:none;stroke:var(--v-border,#E6E0F0);stroke-width:1}
.v-chart-radar-area{stroke-width:2}

.v-chart-legend{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;margin-top:10px}
.v-chart-key{display:inline-flex;align-items:center;gap:6px;padding:3px 6px;border:0;cursor:pointer;
  background:none;color:inherit;font:inherit;border-radius:var(--v-radius-sm,8px)}
.v-chart-key:hover{background:var(--v-surface-2,#FBF7F2)}
.v-chart-key:focus-visible{outline:2px solid var(--v-primary,#6D3BF5);outline-offset:2px}
.v-chart-key[aria-pressed="false"]{opacity:.42;text-decoration:line-through}
.v-chart-dot{width:10px;height:10px;border-radius:3px;flex:0 0 auto}

.v-chart-tip{position:absolute;left:0;top:0;pointer-events:none;z-index:var(--v-z-tooltip,1200);
  transform:translate(-50%,calc(-100% - 12px));background:var(--v-surface,#fff);color:var(--v-text,#14111F);
  border:1px solid var(--v-border,#E6E0F0);border-radius:var(--v-radius-sm,8px);
  box-shadow:var(--v-shadow,0 10px 30px rgba(20,17,31,.14));padding:8px 10px;min-width:96px;
  font-size:12px;line-height:1.4;white-space:nowrap}
.v-chart-tip-title{font-weight:700;margin-bottom:4px}
.v-chart-tip-row{display:flex;align-items:center;gap:6px}
.v-chart-tip-row b{margin-left:auto;font-variant-numeric:tabular-nums}

.v-chart-animate .v-chart-line{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-line{stroke-dashoffset:1}
.v-chart-animate .v-chart-area,.v-chart-animate .v-chart-point,.v-chart-animate .v-chart-value{transition:opacity .5s ease}
.v-chart-animate:not(.v-chart-in) .v-chart-area,
.v-chart-animate:not(.v-chart-in) .v-chart-point,
.v-chart-animate:not(.v-chart-in) .v-chart-value{opacity:0}
.v-chart-animate .v-chart-bar{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-bar{transform:scaleY(0)}
.v-chart-animate .v-chart-barh{transition:transform .55s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-barh{transform:scaleX(0)}
.v-chart-animate .v-chart-slice{transition:opacity .4s ease,transform .5s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-slice{opacity:0;transform:scale(.86)}
.v-chart-ring{stroke-dashoffset:var(--v-ring-offset,0)}
.v-chart-animate .v-chart-ring{transition:stroke-dashoffset .9s var(--v-ease,ease)}
.v-chart-animate:not(.v-chart-in) .v-chart-ring{stroke-dashoffset:var(--v-ring-full,0)}

@media (prefers-reduced-motion: reduce){
  .v-chart *{transition:none !important}
}
`;
function r(value) {
  return Math.round(value * 100) / 100;
}
function toNumber2(value) {
  const n2 = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n2) ? n2 : 0;
}
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
var formatterCache = /* @__PURE__ */ new Map();
function numberFormatter(key, options) {
  const cacheKey2 = `${exports.config.locale}|${exports.config.currency}|${key}`;
  let formatter = formatterCache.get(cacheKey2);
  if (!formatter) {
    formatter = new Intl.NumberFormat(exports.config.locale, options);
    formatterCache.set(cacheKey2, formatter);
  }
  return formatter;
}
function formatChartValue(value, format = "number") {
  if (!Number.isFinite(value)) return "";
  if (format === "currency") {
    return numberFormatter("currency", {
      style: "currency",
      currency: exports.config.currency,
      maximumFractionDigits: 2
    }).format(value);
  }
  const plain = numberFormatter("number", { maximumFractionDigits: 2 }).format(value);
  return format === "percent" ? `${plain}%` : plain;
}
function isSeriesInput(value) {
  return !!value && typeof value === "object" && Array.isArray(value.data);
}
function labelAt(labels2, index) {
  const label = labels2[index];
  return label === void 0 || label === "" ? `#${index + 1}` : label;
}
function normalize2(options, type) {
  const palette2 = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const fromOptions = Array.isArray(options.labels);
  const labels2 = fromOptions ? options.labels.map((label) => String(label)) : [];
  const series = [];
  const raw = options.data;
  const singleName = options.name ?? "Valor";
  if (typeof raw === "number") {
    series.push({ name: singleName, values: [raw], xs: null, color: palette2[0] });
  } else if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "number") {
      series.push({
        name: singleName,
        values: raw.map(toNumber2),
        xs: null,
        color: palette2[0]
      });
    } else if (isSeriesInput(first)) {
      raw.forEach((entry, index) => {
        series.push({
          name: entry.name || `Serie ${index + 1}`,
          values: (entry.data || []).map(toNumber2),
          xs: null,
          color: entry.color || palette2[index % palette2.length]
        });
      });
    } else {
      const points = raw;
      const values = [];
      const xs = [];
      let hasX = false;
      points.forEach((point, index) => {
        values.push(toNumber2(point.value !== void 0 ? point.value : point.y));
        if (typeof point.x === "number") {
          hasX = true;
          xs.push(point.x);
        } else {
          xs.push(index);
        }
        if (!fromOptions && point.label !== void 0) labels2[index] = String(point.label);
      });
      series.push({ name: singleName, values, xs: hasX ? xs : null, color: palette2[0] });
    }
  }
  const categorical = type === "pie" || type === "donut";
  if (categorical) {
    for (let i = 0; i < (series[0]?.values.length ?? 0); i++) {
      if (labels2[i] === void 0) labels2[i] = labelAt(labels2, i);
    }
  }
  return { series, labels: labels2, categorical };
}
function buildLegend(dataset, palette2) {
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return [];
    return first.values.map((_, index) => ({
      key: labelAt(dataset.labels, index),
      name: labelAt(dataset.labels, index),
      color: palette2[index % palette2.length]
    }));
  }
  return dataset.series.map((entry) => ({ key: entry.name, name: entry.name, color: entry.color }));
}
function applyHidden(dataset, hidden, palette2) {
  if (hidden.size === 0) return dataset;
  if (dataset.categorical) {
    const first = dataset.series[0];
    if (!first) return dataset;
    const values = [];
    const labels2 = [];
    const colors = [];
    first.values.forEach((value, index) => {
      const key = labelAt(dataset.labels, index);
      if (hidden.has(key)) return;
      values.push(value);
      labels2.push(key);
      colors.push(palette2[index % palette2.length]);
    });
    return {
      series: [{ ...first, values, xs: null, color: colors[0] ?? first.color }],
      labels: labels2,
      categorical: true
    };
  }
  return {
    series: dataset.series.filter((entry) => !hidden.has(entry.name)),
    labels: dataset.labels,
    categorical: false
  };
}
function niceNumber(range, round2) {
  const safe = Math.abs(range) || 1;
  const exponent = Math.floor(Math.log10(safe));
  const fraction = safe / Math.pow(10, exponent);
  let nice;
  if (round2) {
    if (fraction < 1.5) nice = 1;
    else if (fraction < 3) nice = 2;
    else if (fraction < 7) nice = 5;
    else nice = 10;
  } else {
    if (fraction <= 1) nice = 1;
    else if (fraction <= 2) nice = 2;
    else if (fraction <= 5) nice = 5;
    else nice = 10;
  }
  return nice * Math.pow(10, exponent);
}
function niceScale(min, max, count = 5) {
  if (min === max) {
    const spread = Math.abs(min) || 1;
    return niceScale(min - spread * 0.5, max + spread * 0.5, count);
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / Math.max(1, count - 1), true);
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(step)) + 2));
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = niceMin; value <= niceMax + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return { min: niceMin, max: niceMax, ticks };
}
function extentOf(dataset, options, stacked, baselineZero) {
  let min = Infinity;
  let max = -Infinity;
  if (stacked) {
    let length = 0;
    for (const entry of dataset.series) length = Math.max(length, entry.values.length);
    for (let i = 0; i < length; i++) {
      let positive = 0;
      let negative = 0;
      for (const entry of dataset.series) {
        const value = toNumber2(entry.values[i]);
        if (value >= 0) positive += value;
        else negative += value;
      }
      min = Math.min(min, negative);
      max = Math.max(max, positive);
    }
  } else {
    for (const entry of dataset.series) {
      for (const value of entry.values) {
        if (!Number.isFinite(value)) continue;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (baselineZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (options.min !== void 0) min = options.min;
  if (options.max !== void 0) max = options.max;
  if (min === max) max = min + (Math.abs(min) || 1);
  return { min, max };
}
function straightPath(points) {
  if (points.length === 0) return "";
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${r(points[i][0])} ${r(points[i][1])}`);
  }
  return parts.join(" ");
}
function smoothPath(points) {
  if (points.length < 3) return straightPath(points);
  const parts = [`M ${r(points[0][0])} ${r(points[0][1])}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    parts.push(`C ${r(c1x)} ${r(c1y)}, ${r(c2x)} ${r(c2y)}, ${r(p2[0])} ${r(p2[1])}`);
  }
  return parts.join(" ");
}
function linePath(points, smooth) {
  return smooth ? smoothPath(points) : straightPath(points);
}
function polar(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}
function arcPath(cx, cy, radius, inner, start2, end) {
  const large = end - start2 > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, radius, start2);
  const [x2, y2] = polar(cx, cy, radius, end);
  if (inner <= 0) {
    return `M ${r(cx)} ${r(cy)} L ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} Z`;
  }
  const [ix1, iy1] = polar(cx, cy, inner, start2);
  const [ix2, iy2] = polar(cx, cy, inner, end);
  return `M ${r(x1)} ${r(y1)} A ${r(radius)} ${r(radius)} 0 ${large} 1 ${r(x2)} ${r(y2)} L ${r(ix2)} ${r(iy2)} A ${r(inner)} ${r(inner)} 0 ${large} 0 ${r(ix1)} ${r(iy1)} Z`;
}
var AXIS_FONT = 7;
function longestLabelWidth(texts) {
  let longest = 0;
  for (const text of texts) longest = Math.max(longest, text.length);
  return longest * AXIS_FONT + 12;
}
function buildFrame(ctx, settings4) {
  const { options, dataset, width, height } = ctx;
  const extent = extentOf(dataset, options, settings4.stacked, settings4.baselineZero);
  const scale = options.min !== void 0 && options.max !== void 0 ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) } : niceScale(extent.min, extent.max, 5);
  const tickTexts = scale.ticks.map((tick) => formatChartValue(tick, ctx.format));
  const showGrid = options.showGrid !== false && !settings4.bare;
  const hasLabels = dataset.labels.length > 0 && !settings4.bare;
  const top2 = settings4.bare ? 3 : 16;
  const right = settings4.bare ? 3 : 16;
  const left = settings4.bare ? 3 : showGrid ? clamp(longestLabelWidth(tickTexts), 32, 140) : 8;
  const bottom = settings4.bare ? 3 : hasLabels ? 26 : 10;
  const innerW = Math.max(1, width - left - right);
  const innerH = Math.max(1, height - top2 - bottom);
  const span = scale.max - scale.min || 1;
  const y = (value) => top2 + innerH * (1 - (value - scale.min) / span);
  let grid = "";
  if (showGrid) {
    const lines = [];
    scale.ticks.forEach((tick, index) => {
      const py = r(y(tick));
      lines.push(`<line class="v-chart-grid" x1="${r(left)}" y1="${py}" x2="${r(left + innerW)}" y2="${py}"/>`);
      lines.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${py + 4}" text-anchor="end">${escapeHtml(tickTexts[index])}</text>`
      );
    });
    grid = `<g>${lines.join("")}</g>`;
  }
  return { left, top: top2, innerW, innerH, min: scale.min, max: scale.max, ticks: scale.ticks, y, grid };
}
function evenTicks(min, max, count) {
  const step = (max - min) / Math.max(1, count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) ticks.push(Number((min + step * i).toFixed(6)));
  return ticks;
}
function categoryAxis(labels2, count, xAt, baseline, innerW) {
  if (labels2.length === 0 || count === 0) return "";
  const maxLabels = Math.max(1, Math.floor(innerW / 56));
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const parts = [];
  for (let i = 0; i < count; i += step) {
    const text = labels2[i];
    if (text === void 0 || text === "") continue;
    parts.push(
      `<text class="v-chart-axis" x="${r(xAt(i))}" y="${r(baseline)}" text-anchor="middle">${escapeHtml(text)}</text>`
    );
  }
  return parts.join("");
}
function seriesLength(dataset) {
  let length = dataset.labels.length;
  for (const entry of dataset.series) length = Math.max(length, entry.values.length);
  return length;
}
function emptyChart(ctx) {
  return `<text class="v-chart-empty" x="${r(ctx.width / 2)}" y="${r(ctx.height / 2)}" text-anchor="middle">Sem dados</text>`;
}
function titleTag(label, value, format) {
  return `<title>${escapeHtml(label)}: ${escapeHtml(formatChartValue(value, format))}</title>`;
}
function seriesSummary(entry, format) {
  if (entry.values.length === 0) return entry.name;
  let min = Infinity;
  let max = -Infinity;
  for (const value of entry.values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const first = entry.values[0];
  const last = entry.values[entry.values.length - 1];
  return `${entry.name}: de ${formatChartValue(first, format)} a ${formatChartValue(last, format)}, minimo ${formatChartValue(min, format)}, maximo ${formatChartValue(max, format)}`;
}
function renderLine(ctx) {
  const bare = ctx.type === "sparkline";
  const filled = ctx.type === "area";
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked: false, baselineZero: filled, bare });
  const xAt = (index) => count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1);
  const smooth = ctx.options.smooth === true;
  const parts = [frame.grid];
  const baseY = frame.y(clamp(0, frame.min, frame.max));
  for (const entry of ctx.dataset.series) {
    const points = [];
    for (let i = 0; i < count; i++) points.push([xAt(i), frame.y(toNumber2(entry.values[i]))]);
    if (points.length === 0) continue;
    const path = linePath(points, smooth);
    if (filled) {
      const area = `${path} L ${r(points[points.length - 1][0])} ${r(baseY)} L ${r(points[0][0])} ${r(baseY)} Z`;
      parts.push(`<path class="v-chart-area" d="${area}" fill="${escapeHtml(entry.color)}" fill-opacity="0.16"/>`);
    }
    const dash = ctx.animated ? ' pathLength="1" stroke-dasharray="1"' : "";
    parts.push(
      `<path class="v-chart-line" d="${path}" stroke="${escapeHtml(entry.color)}"${dash}><title>${escapeHtml(seriesSummary(entry, ctx.format))}</title></path>`
    );
    if (!bare && count <= 40) {
      points.forEach((point, index) => {
        parts.push(
          `<circle class="v-chart-point" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber2(entry.values[index]), ctx.format) + "</circle>"
        );
      });
    }
    if (ctx.options.showValues && !bare) {
      points.forEach((point, index) => {
        parts.push(
          `<text class="v-chart-value" x="${r(point[0])}" y="${r(point[1] - 10)}" text-anchor="middle">${escapeHtml(formatChartValue(toNumber2(entry.values[index]), ctx.format))}</text>`
        );
      });
    }
  }
  if (!bare) {
    parts.push(
      categoryAxis(ctx.dataset.labels, count, xAt, frame.top + frame.innerH + 18, frame.innerW)
    );
  }
  collectBandHits(ctx, count, xAt, (index) => {
    let top2 = Infinity;
    for (const entry of ctx.dataset.series) top2 = Math.min(top2, frame.y(toNumber2(entry.values[index])));
    return Number.isFinite(top2) ? top2 : frame.top;
  });
  return parts.join("");
}
function collectBandHits(ctx, count, xAt, yAt) {
  for (let i = 0; i < count; i++) {
    ctx.hits.push({
      x: xAt(i),
      y: yAt(i),
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber2(entry.values[i])
      }))
    });
  }
}
function renderBars(ctx) {
  const stacked = ctx.type === "stacked";
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked, baselineZero: true, bare: false });
  const band = frame.innerW / count;
  const groups = stacked ? 1 : Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 18);
  const barW = Math.max(2, (band - gap) / groups);
  const baseY = frame.y(clamp(0, frame.min, frame.max));
  const radius = Math.min(4, barW / 2);
  const parts = [frame.grid];
  const bandCenter = (index) => frame.left + band * index + band / 2;
  for (let i = 0; i < count; i++) {
    let positive = 0;
    let negative = 0;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber2(entry.values[i]);
      let top2;
      let bottom;
      let x;
      if (stacked) {
        const start2 = value >= 0 ? positive : negative;
        const end = start2 + value;
        if (value >= 0) positive = end;
        else negative = end;
        top2 = Math.min(frame.y(start2), frame.y(end));
        bottom = Math.max(frame.y(start2), frame.y(end));
        x = frame.left + band * i + gap / 2;
      } else {
        top2 = Math.min(frame.y(value), baseY);
        bottom = Math.max(frame.y(value), baseY);
        x = frame.left + band * i + gap / 2 + seriesIndex * barW;
      }
      const width = stacked ? Math.max(2, band - gap) : barW * 0.86;
      const height = Math.max(value === 0 ? 0 : 1, bottom - top2);
      parts.push(
        `<rect class="v-chart-bar" x="${r(x)}" y="${r(top2)}" width="${r(width)}" height="${r(height)}" rx="${r(radius)}" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(x + width / 2)}px ${r(baseY)}px;transition-delay:${i * 30}ms">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) + "</rect>"
      );
      if (ctx.options.showValues && !stacked) {
        parts.push(
          `<text class="v-chart-value" x="${r(x + width / 2)}" y="${r(top2 - 6)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });
  }
  parts.push(
    categoryAxis(ctx.dataset.labels, count, bandCenter, frame.top + frame.innerH + 18, frame.innerW)
  );
  collectBandHits(ctx, count, bandCenter, (index) => {
    if (stacked) {
      let total = 0;
      for (const entry of ctx.dataset.series) total += Math.max(0, toNumber2(entry.values[index]));
      return frame.y(total);
    }
    let top2 = baseY;
    for (const entry of ctx.dataset.series) top2 = Math.min(top2, frame.y(toNumber2(entry.values[index])));
    return top2;
  });
  return parts.join("");
}
function renderColumns(ctx) {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const scale = ctx.options.min !== void 0 && ctx.options.max !== void 0 ? { min: extent.min, max: extent.max, ticks: evenTicks(extent.min, extent.max, 5) } : niceScale(extent.min, extent.max, 5);
  const labelWidth = clamp(
    longestLabelWidth(ctx.dataset.labels.length > 0 ? ctx.dataset.labels : [""]),
    24,
    ctx.width * 0.4
  );
  const left = ctx.dataset.labels.length > 0 ? labelWidth : 12;
  const top2 = 12;
  const bottom = ctx.options.showGrid === false ? 12 : 26;
  const innerW = Math.max(1, ctx.width - left - 20);
  const innerH = Math.max(1, ctx.height - top2 - bottom);
  const span = scale.max - scale.min || 1;
  const x = (value) => left + innerW * (value - scale.min) / span;
  const baseX = x(clamp(0, scale.min, scale.max));
  const band = innerH / count;
  const groups = Math.max(1, ctx.dataset.series.length);
  const gap = Math.min(band * 0.3, 16);
  const barH = Math.max(2, (band - gap) / groups);
  const parts = [];
  if (ctx.options.showGrid !== false) {
    for (const tick of scale.ticks) {
      const px = r(x(tick));
      parts.push(`<line class="v-chart-grid" x1="${px}" y1="${r(top2)}" x2="${px}" y2="${r(top2 + innerH)}"/>`);
      parts.push(
        `<text class="v-chart-axis" x="${px}" y="${r(top2 + innerH + 16)}" text-anchor="middle">${escapeHtml(formatChartValue(tick, ctx.format))}</text>`
      );
    }
  }
  for (let i = 0; i < count; i++) {
    const label = ctx.dataset.labels[i];
    if (label) {
      parts.push(
        `<text class="v-chart-axis" x="${r(left - 8)}" y="${r(top2 + band * i + band / 2 + 4)}" text-anchor="end">${escapeHtml(label)}</text>`
      );
    }
    let tipX = baseX;
    ctx.dataset.series.forEach((entry, seriesIndex) => {
      const value = toNumber2(entry.values[i]);
      const start2 = Math.min(x(value), baseX);
      tipX = Math.max(tipX, x(value));
      const width = Math.max(value === 0 ? 0 : 1, Math.abs(x(value) - baseX));
      const y = top2 + band * i + gap / 2 + seriesIndex * barH;
      parts.push(
        `<rect class="v-chart-barh" x="${r(start2)}" y="${r(y)}" width="${r(width)}" height="${r(barH * 0.86)}" rx="${r(Math.min(4, barH / 2))}" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(baseX)}px ${r(y + barH / 2)}px;transition-delay:${i * 30}ms">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, i)}`, value, ctx.format) + "</rect>"
      );
      if (ctx.options.showValues) {
        parts.push(
          `<text class="v-chart-value" x="${r(start2 + width + 6)}" y="${r(y + barH * 0.6)}">${escapeHtml(formatChartValue(value, ctx.format))}</text>`
        );
      }
    });
    ctx.hits.push({
      x: tipX,
      y: top2 + band * i + band / 2,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber2(entry.values[i])
      }))
    });
  }
  return parts.join("");
}
function renderPie(ctx) {
  const first = ctx.dataset.series[0];
  if (!first || first.values.length === 0) return emptyChart(ctx);
  const donut = ctx.type === "donut";
  const values = first.values.map((value) => Math.max(0, toNumber2(value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return emptyChart(ctx);
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(12, Math.min(ctx.width, ctx.height) / 2 - 14);
  const inner = donut ? radius * 0.62 : 0;
  const origin = `transform-origin:${r(cx)}px ${r(cy)}px`;
  const parts = [];
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    const sweep = value / total * Math.PI * 2;
    const color = ctx.palette[index % ctx.palette.length];
    const label = labelAt(ctx.dataset.labels, index);
    const full = sweep >= Math.PI * 2 - 1e-6;
    const shape = full ? donut ? `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r((radius + inner) / 2)}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${r(radius - inner)}" style="${origin}">` : `<circle class="v-chart-slice" data-hit="${index}" cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}" fill="${escapeHtml(color)}" style="${origin}">` : `<path class="v-chart-slice" data-hit="${index}" d="${arcPath(cx, cy, radius, inner, angle, angle + sweep)}" fill="${escapeHtml(color)}" style="${origin};transition-delay:${index * 45}ms">`;
    parts.push(`${shape}${titleTag(label, value, ctx.format)}${full ? "</circle>" : "</path>"}`);
    const mid = angle + sweep / 2;
    const [hx, hy] = polar(cx, cy, (radius + inner) / 2, mid);
    ctx.hits.push({
      x: hx,
      y: hy,
      title: label,
      rows: [{ name: label, color, value }]
    });
    if (ctx.options.showValues && sweep > 0.3) {
      const [tx, ty] = polar(cx, cy, donut ? (radius + inner) / 2 : radius * 0.68, mid);
      const share = Math.round(value / total * 100);
      parts.push(
        `<text class="v-chart-value" x="${r(tx)}" y="${r(ty + 4)}" text-anchor="middle">${share}%</text>`
      );
    }
    angle += sweep;
  });
  if (donut) {
    parts.push(
      `<text class="v-chart-center" x="${r(cx)}" y="${r(cy + 2)}" text-anchor="middle">${escapeHtml(formatChartValue(total, ctx.format))}</text>`,
      `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 20)}" text-anchor="middle">Total</text>`
    );
  }
  return parts.join("");
}
function renderRadar(ctx) {
  const axes = seriesLength(ctx.dataset);
  if (axes < 3) return emptyChart(ctx);
  const extent = extentOf(ctx.dataset, ctx.options, false, true);
  const max = extent.max || 1;
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(20, Math.min(ctx.width, ctx.height) / 2 - 28);
  const angleAt = (index) => -Math.PI / 2 + Math.PI * 2 * index / axes;
  const parts = [];
  for (let ring = 1; ring <= 4; ring++) {
    const points = [];
    for (let i = 0; i < axes; i++) points.push(polar(cx, cy, radius * ring / 4, angleAt(i)));
    parts.push(
      `<polygon class="v-chart-radar-web" points="${points.map((p2) => `${r(p2[0])},${r(p2[1])}`).join(" ")}"/>`
    );
  }
  for (let i = 0; i < axes; i++) {
    const [ax, ay] = polar(cx, cy, radius, angleAt(i));
    parts.push(`<line class="v-chart-grid" x1="${r(cx)}" y1="${r(cy)}" x2="${r(ax)}" y2="${r(ay)}"/>`);
    const label = ctx.dataset.labels[i];
    if (label) {
      const [lx, ly] = polar(cx, cy, radius + 14, angleAt(i));
      const anchor = Math.abs(lx - cx) < 4 ? "middle" : lx > cx ? "start" : "end";
      parts.push(
        `<text class="v-chart-axis" x="${r(lx)}" y="${r(ly + 4)}" text-anchor="${anchor}">${escapeHtml(label)}</text>`
      );
    }
  }
  for (const entry of ctx.dataset.series) {
    const points = [];
    for (let i = 0; i < axes; i++) {
      const value = clamp(toNumber2(entry.values[i]) / max, 0, 1);
      points.push(polar(cx, cy, radius * value, angleAt(i)));
    }
    parts.push(
      `<polygon class="v-chart-radar-area v-chart-slice" points="${points.map((p2) => `${r(p2[0])},${r(p2[1])}`).join(" ")}" fill="${escapeHtml(entry.color)}" fill-opacity="0.22" stroke="${escapeHtml(entry.color)}" style="transform-origin:${r(cx)}px ${r(cy)}px"/>`
    );
    points.forEach((point, index) => {
      parts.push(
        `<circle class="v-chart-point" data-hit="${index}" cx="${r(point[0])}" cy="${r(point[1])}" r="3.5" fill="${escapeHtml(entry.color)}">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber2(entry.values[index]), ctx.format) + "</circle>"
      );
    });
  }
  for (let i = 0; i < axes; i++) {
    const [hx, hy] = polar(cx, cy, radius * 0.7, angleAt(i));
    ctx.hits.push({
      x: hx,
      y: hy,
      title: labelAt(ctx.dataset.labels, i),
      rows: ctx.dataset.series.map((entry) => ({
        name: entry.name,
        color: entry.color,
        value: toNumber2(entry.values[i])
      }))
    });
  }
  return parts.join("");
}
function renderScatter(ctx) {
  const count = seriesLength(ctx.dataset);
  if (count === 0) return emptyChart(ctx);
  const frame = buildFrame(ctx, { stacked: false, baselineZero: false, bare: false });
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const entry of ctx.dataset.series) {
    const xs = entry.xs;
    if (!xs) continue;
    for (const value of xs) {
      xMin = Math.min(xMin, value);
      xMax = Math.max(xMax, value);
    }
  }
  const useOwnX = Number.isFinite(xMin) && Number.isFinite(xMax) && xMax > xMin;
  const xAt = (entry, index) => {
    if (useOwnX && entry.xs) {
      return frame.left + frame.innerW * (entry.xs[index] - xMin) / (xMax - xMin);
    }
    return count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1);
  };
  const parts = [frame.grid];
  let hitIndex = 0;
  for (const entry of ctx.dataset.series) {
    entry.values.forEach((value, index) => {
      const px = xAt(entry, index);
      const py = frame.y(toNumber2(value));
      parts.push(
        `<circle class="v-chart-point v-chart-slice" data-hit="${hitIndex}" cx="${r(px)}" cy="${r(py)}" r="4.5" fill="${escapeHtml(entry.color)}" style="transform-origin:${r(px)}px ${r(py)}px">` + titleTag(`${entry.name} ${labelAt(ctx.dataset.labels, index)}`, toNumber2(value), ctx.format) + "</circle>"
      );
      ctx.hits.push({
        x: px,
        y: py,
        title: labelAt(ctx.dataset.labels, index),
        rows: [{ name: entry.name, color: entry.color, value: toNumber2(value) }]
      });
      hitIndex++;
    });
  }
  if (!useOwnX) {
    parts.push(
      categoryAxis(
        ctx.dataset.labels,
        count,
        (index) => count <= 1 ? frame.left + frame.innerW / 2 : frame.left + frame.innerW * index / (count - 1),
        frame.top + frame.innerH + 18,
        frame.innerW
      )
    );
  }
  return parts.join("");
}
function renderProgress(ctx) {
  const first = ctx.dataset.series[0];
  const value = first ? toNumber2(first.values[0]) : 0;
  const max = ctx.options.max ?? 100;
  const min = ctx.options.min ?? 0;
  const ratio = clamp((value - min) / (max - min || 1), 0, 1);
  const cx = ctx.width / 2;
  const cy = ctx.height / 2;
  const radius = Math.max(16, Math.min(ctx.width, ctx.height) / 2 - 16);
  const stroke = Math.max(8, radius * 0.2);
  const ringRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const offset = circumference * (1 - ratio);
  const color = ctx.palette[0];
  ctx.hits.push({
    x: cx,
    y: cy - ringRadius,
    title: first?.name ?? "Progresso",
    rows: [{ name: first?.name ?? "Progresso", color, value }]
  });
  return `<circle class="v-chart-track" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" stroke-width="${r(stroke)}"/><circle class="v-chart-ring" data-hit="0" cx="${r(cx)}" cy="${r(cy)}" r="${r(ringRadius)}" fill="none" stroke="${escapeHtml(color)}" stroke-width="${r(stroke)}" stroke-linecap="round" stroke-dasharray="${r(circumference)}" style="--v-ring-full:${r(circumference)};--v-ring-offset:${r(offset)};transform:rotate(-90deg);transform-origin:${r(cx)}px ${r(cy)}px">` + titleTag(first?.name ?? "Progresso", value, ctx.format) + `</circle><text class="v-chart-center" x="${r(cx)}" y="${r(cy + 4)}" text-anchor="middle">${Math.round(ratio * 100)}%</text>` + (first ? `<text class="v-chart-center-sub" x="${r(cx)}" y="${r(cy + 22)}" text-anchor="middle">${escapeHtml(formatChartValue(value, ctx.format))}</text>` : "");
}
var SHAPE_HIT = /* @__PURE__ */ new Set(["pie", "donut", "scatter", "progress", "radar"]);
function defaultHeight(type) {
  if (type === "sparkline") return 56;
  if (type === "pie" || type === "donut" || type === "progress" || type === "radar") return 260;
  return 260;
}
function legendVisible(options, dataset) {
  if (options.showLegend === false) return false;
  if (options.showLegend === true) return true;
  return dataset.categorical || dataset.series.length > 1;
}
var TYPE_NAMES = {
  line: "de linha",
  area: "de area",
  bar: "de barras",
  column: "de barras horizontais",
  stacked: "de barras empilhadas",
  pie: "de pizza",
  donut: "de rosca",
  sparkline: "de tendencia",
  radar: "de radar",
  scatter: "de dispersao",
  progress: "de progresso"
};
function describe(type, dataset, format) {
  if (dataset.series.length === 0) return "Grafico sem dados.";
  const plural = dataset.series.length === 1 ? "serie" : "series";
  const parts = [`Grafico ${TYPE_NAMES[type]} com ${dataset.series.length} ${plural}.`];
  for (const entry of dataset.series) {
    if (entry.values.length === 0) continue;
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    for (const value of entry.values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    const average = sum / entry.values.length;
    parts.push(
      `${entry.name}: ${entry.values.length} pontos, minimo ${formatChartValue(min, format)}, maximo ${formatChartValue(max, format)}, media ${formatChartValue(average, format)}.`
    );
  }
  return parts.join(" ");
}
function renderBody(ctx) {
  switch (ctx.type) {
    case "bar":
    case "stacked":
      return renderBars(ctx);
    case "column":
      return renderColumns(ctx);
    case "pie":
    case "donut":
      return renderPie(ctx);
    case "radar":
      return renderRadar(ctx);
    case "scatter":
      return renderScatter(ctx);
    case "progress":
      return renderProgress(ctx);
    default:
      return renderLine(ctx);
  }
}
function legendHtml(items, hidden) {
  if (items.length === 0) return "";
  const buttons = items.map((item) => {
    const off2 = hidden.has(item.key);
    return `<button type="button" class="v-chart-key" data-key="${escapeHtml(item.key)}" aria-pressed="${off2 ? "false" : "true"}"><span class="v-chart-dot" style="background:${escapeHtml(item.color)}"></span>${escapeHtml(item.name)}</button>`;
  });
  return `<div class="v-chart-legend">${buttons.join("")}</div>`;
}
function draw(state2) {
  const el = state2.el;
  const options = state2.options;
  const type = options.type ?? "line";
  const palette2 = options.colors && options.colors.length > 0 ? options.colors : CHART_COLORS;
  const format = options.format ?? "number";
  const width = Math.max(160, Math.round(el.clientWidth || options.width || 640));
  const height = Math.max(48, Math.round(options.height ?? defaultHeight(type)));
  state2.lastWidth = width;
  state2.viewWidth = width;
  state2.viewHeight = height;
  const full = normalize2(options, type);
  const legend = buildLegend(full, palette2);
  const dataset = applyHidden(full, state2.hidden, palette2);
  const animated = options.animate !== false && !prefersReducedMotion2();
  state2.hits = [];
  state2.shapeHits = SHAPE_HIT.has(type);
  state2.hitAxis = type === "column" ? "y" : "x";
  const ctx = {
    type,
    options,
    dataset,
    palette: palette2,
    width,
    height,
    animated,
    format,
    hits: state2.hits
  };
  const body = renderBody(ctx);
  const label = describe(type, dataset, format);
  el.classList.add("v-chart");
  el.classList.toggle("v-chart-animate", animated);
  el.classList.remove("v-chart-in");
  const html = [
    `<svg class="v-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" `,
    `style="height:${height}px" role="img" aria-label="${escapeHtml(label)}">`,
    body,
    "</svg>"
  ];
  if (legendVisible(options, full)) html.push(legendHtml(legend, state2.hidden));
  if (options.tooltip !== false) html.push('<div class="v-chart-tip" hidden></div>');
  el.innerHTML = html.join("");
  if (animated && typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.add("v-chart-in"));
    });
  }
}
function tooltipHtml(hit, format) {
  const rows = hit.rows.map(
    (row) => `<div class="v-chart-tip-row"><span class="v-chart-dot" style="background:${escapeHtml(row.color)}"></span>${escapeHtml(row.name)}<b>${escapeHtml(formatChartValue(row.value, format))}</b></div>`
  );
  return `<div class="v-chart-tip-title">${escapeHtml(hit.title)}</div>${rows.join("")}`;
}
function hideTooltip(state2) {
  const tip = state2.el.querySelector(".v-chart-tip");
  if (tip) tip.hidden = true;
}
function showTooltip(state2, event) {
  if (state2.options.tooltip === false || state2.hits.length === 0) return;
  const tip = state2.el.querySelector(".v-chart-tip");
  const svg = state2.el.querySelector("svg");
  if (!tip || !svg) return;
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  let hit;
  if (state2.shapeHits) {
    const target = event.target;
    const node = target && typeof target.closest === "function" ? target.closest("[data-hit]") : null;
    const index = node ? Number(node.getAttribute("data-hit")) : -1;
    if (index >= 0) hit = state2.hits[index];
  } else if (state2.hitAxis === "y") {
    const py = (event.clientY - rect.top) / rect.height * state2.viewHeight;
    let best = Infinity;
    for (const candidate of state2.hits) {
      const distance = Math.abs(candidate.y - py);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  } else {
    const px = (event.clientX - rect.left) / rect.width * state2.viewWidth;
    let best = Infinity;
    for (const candidate of state2.hits) {
      const distance = Math.abs(candidate.x - px);
      if (distance < best) {
        best = distance;
        hit = candidate;
      }
    }
  }
  if (!hit) {
    hideTooltip(state2);
    return;
  }
  const container2 = state2.el.getBoundingClientRect();
  tip.innerHTML = tooltipHtml(hit, state2.options.format ?? "number");
  tip.style.left = `${rect.left - container2.left + hit.x / state2.viewWidth * rect.width}px`;
  tip.style.top = `${rect.top - container2.top + hit.y / state2.viewHeight * rect.height}px`;
  tip.hidden = false;
}
function attachEvents(state2) {
  const el = state2.el;
  const onClick = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const key = target.closest("[data-key]")?.getAttribute("data-key");
    if (key === null || key === void 0) return;
    if (state2.hidden.has(key)) state2.hidden.delete(key);
    else state2.hidden.add(key);
    draw(state2);
  };
  const onMove = (event) => showTooltip(state2, event);
  const onLeave = () => hideTooltip(state2);
  el.addEventListener("click", onClick);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  state2.teardown.push(() => {
    el.removeEventListener("click", onClick);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  });
}
function observeResize(state2) {
  if (typeof ResizeObserver === "undefined") return;
  const observer3 = new ResizeObserver(() => {
    const width = Math.round(state2.el.clientWidth);
    if (width === 0 || width === state2.lastWidth) return;
    if (state2.frame) cancelAnimationFrame(state2.frame);
    state2.frame = requestAnimationFrame(() => {
      state2.frame = 0;
      draw(state2);
    });
  });
  observer3.observe(state2.el);
  state2.observer = observer3;
}
function renderChart(el, options) {
  ensureTokens();
  injectStyle("charts", CSS4);
  const state2 = {
    el,
    options: { ...options },
    hidden: /* @__PURE__ */ new Set(),
    hits: [],
    shapeHits: false,
    hitAxis: "x",
    viewWidth: 1,
    viewHeight: 1,
    lastWidth: 0,
    observer: null,
    frame: 0,
    teardown: []
  };
  attachEvents(state2);
  draw(state2);
  observeResize(state2);
  return {
    el,
    get options() {
      return state2.options;
    },
    update(next) {
      Object.assign(state2.options, next);
      draw(state2);
    },
    destroy() {
      if (state2.frame) cancelAnimationFrame(state2.frame);
      state2.frame = 0;
      state2.observer?.disconnect();
      state2.observer = null;
      for (const off2 of state2.teardown) off2();
      state2.teardown.length = 0;
      el.classList.remove("v-chart", "v-chart-animate", "v-chart-in");
      el.innerHTML = "";
    }
  };
}
function readOption3(el, name) {
  return readAttr(el, `${exports.config.prefix}${name}`) ?? readAttr(el, `data-v-${name}`);
}
function parseBool(raw, fallback) {
  if (raw === null) return fallback;
  if (raw === "" || raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}
function directiveOptions(el, value) {
  const isOptionsObject = !!value && typeof value === "object" && !Array.isArray(value) && "data" in value;
  const options = isOptionsObject ? { ...value } : { data: value ?? [] };
  const type = readOption3(el, "chart-type");
  if (type) options.type = type;
  if (!options.type) options.type = "line";
  const height = readOption3(el, "chart-height");
  if (height) options.height = parseFloat(height) || options.height;
  const format = readOption3(el, "chart-format");
  if (format) options.format = format;
  const colors = readOption3(el, "chart-colors");
  if (colors) {
    options.colors = colors.split(",").map((color) => color.trim()).filter(Boolean);
  }
  const max = readOption3(el, "chart-max");
  if (max !== null && max !== "") options.max = parseFloat(max);
  const min = readOption3(el, "chart-min");
  if (min !== null && min !== "") options.min = parseFloat(min);
  const smooth = readOption3(el, "chart-smooth");
  if (smooth !== null) options.smooth = parseBool(smooth, true);
  const grid = readOption3(el, "chart-grid");
  if (grid !== null) options.showGrid = parseBool(grid, true);
  const legend = readOption3(el, "chart-legend");
  if (legend !== null) options.showLegend = parseBool(legend, true);
  const values = readOption3(el, "chart-values");
  if (values !== null) options.showValues = parseBool(values, true);
  const tooltip = readOption3(el, "chart-tooltip");
  if (tooltip !== null) options.tooltip = parseBool(tooltip, true);
  const animateAttr = readOption3(el, "chart-animate");
  if (animateAttr !== null) options.animate = parseBool(animateAttr, true);
  return options;
}
function touchDeep(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 3) return 1;
  let count = 0;
  if (Array.isArray(value)) {
    for (const item of value) count += touchDeep(item, depth + 1);
    return count;
  }
  for (const item of Object.values(value)) {
    count += touchDeep(item, depth + 1);
  }
  return count;
}
defineDirective("chart", ({ el, evaluate: evaluate2, effect: effect2, cleanup }) => {
  let instance = null;
  effect2(() => {
    const value = evaluate2();
    touchDeep(value);
    const options = directiveOptions(el, value);
    if (instance) instance.update(options);
    else instance = renderChart(el, options);
  });
  cleanup(() => {
    instance?.destroy();
    instance = null;
  });
});
var charts = {
  render: renderChart,
  format: formatChartValue,
  colors: CHART_COLORS
};

// src/ui/components.ts
init_reactivity();
init_registry();
init_style();

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
function hslToRgb2(h2, s, l) {
  const hue = (h2 % 360 + 360) % 360;
  const sat = clamp2(s / 100, 0, 1);
  const lig = clamp2(l / 100, 0, 1);
  const c2 = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c2 * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = lig - c2 / 2;
  const sector = Math.floor(hue / 60) % 6;
  const table = [
    [c2, x, 0],
    [x, c2, 0],
    [0, c2, x],
    [0, x, c2],
    [x, 0, c2],
    [c2, 0, x]
  ];
  const [r2, g, b] = table[sector];
  return { r: Math.round((r2 + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function parseColor2(input) {
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
    const [r2, g, b] = numbers(rgb[1]);
    if (r2 === void 0 || g === void 0 || b === void 0) return null;
    return { r: clamp2(r2, 0, 255), g: clamp2(g, 0, 255), b: clamp2(b, 0, 255) };
  }
  const hsl = HSL_FUNCTION.exec(text);
  if (hsl) {
    const [h2, s, l] = numbers(hsl[1]);
    if (h2 === void 0 || s === void 0 || l === void 0) return null;
    return hslToRgb2(h2, s, l);
  }
  return null;
}
function clamp2(value, min, max) {
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
  const r2 = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const lms1 = 0.4122214708 * r2 + 0.5363325363 * g + 0.0514459929 * b;
  const lms2 = 0.2119034982 * r2 + 0.6806995451 * g + 0.1073969566 * b;
  const lms3 = 0.0883024619 * r2 + 0.2817188376 * g + 0.6299787005 * b;
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
  const c2 = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h2 = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h2 < 0) h2 += 360;
  return { l: lab.l, c: c2, h: c2 < 1e-5 ? 0 : h2 };
}
function oklchToRaw(color) {
  const rad = color.h * Math.PI / 180;
  return oklabToRaw({ l: color.l, a: Math.cos(rad) * color.c, b: Math.sin(rad) * color.c });
}
function oklchToRgb(color) {
  let chroma = Math.max(0, color.c);
  for (let i = 0; i < 32; i++) {
    const raw = oklchToRaw({ l: clamp2(color.l, 0, 1), c: chroma, h: color.h });
    if (raw.r >= -1e-3 && raw.r <= 1.001 && raw.g >= -1e-3 && raw.g <= 1.001 && raw.b >= -1e-3 && raw.b <= 1.001) {
      return {
        r: Math.round(clamp2(raw.r, 0, 1) * 255),
        g: Math.round(clamp2(raw.g, 0, 1) * 255),
        b: Math.round(clamp2(raw.b, 0, 1) * 255)
      };
    }
    chroma *= 0.92;
  }
  const gray = oklchToRaw({ l: clamp2(color.l, 0, 1), c: 0, h: color.h });
  return {
    r: Math.round(clamp2(gray.r, 0, 1) * 255),
    g: Math.round(clamp2(gray.g, 0, 1) * 255),
    b: Math.round(clamp2(gray.b, 0, 1) * 255)
  };
}
function pad(value) {
  return clamp2(Math.round(value), 0, 255).toString(16).padStart(2, "0");
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
  const first = typeof a === "string" ? parseColor2(a) : a;
  const second = typeof b === "string" ? parseColor2(b) : b;
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
  const base = typeof color === "string" ? parseColor2(color) : color;
  if (!base) return "#ffffff";
  return contrastRatio(base, WHITE) >= contrastRatio(base, BLACK) ? "#ffffff" : "#000000";
}
var SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
var LIGHT_L = [0.973, 0.941, 0.889, 0.819, 0.732, 0.638, 0.558, 0.478, 0.399, 0.327];
var LIGHT_C = [0.14, 0.26, 0.46, 0.68, 0.88, 1, 0.97, 0.89, 0.78, 0.65];
var DARK_L = [0.244, 0.286, 0.343, 0.408, 0.484, 0.588, 0.668, 0.748, 0.836, 0.928];
var DARK_C = [0.3, 0.42, 0.6, 0.78, 0.92, 1, 0.92, 0.78, 0.57, 0.33];
function colorScale(color, dark = false) {
  const rgb = typeof color === "string" ? parseColor2(color) ?? BLACK : color;
  const base = rgbToOklch(rgb);
  const lightness = dark ? DARK_L : LIGHT_L;
  const chroma = dark ? DARK_C : LIGHT_C;
  const out = {};
  SCALE_STEPS.forEach((step, index) => {
    out[String(step)] = oklchToHex({
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
var STORAGE_KEY2 = "voodoo:palette";
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
  const round2 = (n2) => `${Math.round(n2 * 1e3) / 1e3}${unit}`;
  return {
    "--v-radius": round2(value),
    "--v-radius-sm": round2(Math.max(value * 0.55, 0)),
    "--v-radius-lg": round2(value * 1.5),
    "--v-radius-xl": round2(value * 2),
    "--v-radius-full": "999px"
  };
}
function buildTheme(colors, dark) {
  const vars = {};
  const scales = {};
  const contrast = {};
  for (const role of ROLES) {
    const rgb = parseColor2(colors[role]) ?? BLACK;
    const base = rgbToOklch(rgb);
    const scale = colorScale(rgb, dark);
    scales[role] = scale;
    for (const step of SCALE_STEPS) {
      vars[`--v-${role}-${step}`] = scale[String(step)];
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
  const neutralRgb = parseColor2(colors.neutral ?? colors.primary) ?? BLACK;
  const hue = rgbToOklch(neutralRgb).h;
  const neutral = (l, c2) => oklchToHex({ l, c: c2, h: hue });
  const neutralScale = {};
  SCALE_STEPS.forEach((step, index) => {
    const lightnessList = dark ? DARK_L : LIGHT_L;
    neutralScale[String(step)] = neutral(lightnessList[index], 0.012);
    vars[`--v-neutral-${step}`] = neutralScale[String(step)];
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
  contrast.surface = contrastText(parseColor2(vars["--v-surface"]) ?? WHITE);
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
    if (parseColor2(colors[role])) continue;
    console.warn(`[Voodoo] cor invalida em palette.${role}: "${colors[role]}". Usando o preset.`);
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
  if (!exports.config.injectStyles) return;
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
    "/* Paleta gerada por V.palette(). Nao edite a mao. */",
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
    storage.set(STORAGE_KEY2, saved);
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
  const saved = storage.get(STORAGE_KEY2);
  const options = saved && typeof saved === "object" ? { ...saved, persist: false } : { persist: false };
  return applyPalette(options);
}
function ensurePalette() {
  if (current) return;
  initPalette();
}
var palette = Object.assign(applyPalette, {
  /** Presets prontos, indexados pelo nome. */
  presets,
  /** Nomes dos presets disponiveis. */
  get names() {
    return Object.keys(presets);
  },
  /** Paleta em uso, ou `null` antes da primeira aplicacao. */
  get current() {
    return current;
  },
  /** Opcoes usadas na ultima aplicacao. */
  get options() {
    return currentOptions;
  },
  /** Aplica a paleta salva, ou o padrao quando nao ha nada salvo. */
  init: initPalette,
  /** Garante que as variaveis existam, sem sobrescrever o que ja foi aplicado. */
  ensure: ensurePalette,
  /** Volta ao preset padrao e apaga a escolha salva. */
  reset() {
    storage.remove(STORAGE_KEY2);
    return applyPalette({ persist: false });
  },
  /** Troca apenas o preset, mantendo raio e fonte atuais. */
  use(name) {
    return applyPalette({ ...currentOptions ?? {}, preset: name, primary: void 0, accent: void 0 });
  },
  /** Escala de tons de uma cor qualquer. */
  scale: colorScale,
  /** Preto ou branco, conforme o melhor contraste WCAG sobre a cor. */
  contrastText,
  /** Razao de contraste WCAG entre duas cores. */
  contrastRatio,
  /** Luminancia relativa WCAG de uma cor. */
  luminance(color) {
    const rgb = typeof color === "string" ? parseColor2(color) : color;
    return rgb ? relativeLuminance(rgb) : 0;
  },
  /** Conversores expostos para quem quiser gerar cores derivadas. */
  convert: { parseColor: parseColor2, rgbToOklch, oklchToRgb, toHex, toRgba }
});

// src/ui/components.ts
function flag(value) {
  if (value === true) return true;
  if (value === false || value === null || value === void 0) return false;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  return text === "" || text === "true" || text === "1" || text === "sim" || text === "yes";
}
function flags(...names2) {
  const out = {};
  for (const name of names2) {
    const key = `is${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    out[key] = function() {
      return flag(this[name]);
    };
  }
  return out;
}
var BOOL = { type: "any", default: false };
var TEXT = { type: "string", default: "" };
function fromOuterScope(instance, raw) {
  if (raw == null || typeof raw !== "string") return raw;
  const text = raw.trim();
  if (!text) return null;
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  const head = text.split(/[.[(]/)[0].trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(head)) return null;
  const parent = instance.$scope?.parent;
  if (!parent || !parent.has(head)) return null;
  return evaluateIn(text, parent, "atributo de lista");
}
function splitList(text) {
  return String(text).split(",").map((part) => part.trim()).filter(Boolean);
}
function hostModel(instance, model) {
  const el = instance.$el;
  Object.defineProperty(el, "value", {
    configurable: true,
    enumerable: false,
    get: model.get,
    set: model.set
  });
}
function notify(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
var ICON_PATHS = {
  check: '<path d="m5 12.5 4.4 4.4L19 7.6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  "chevron-down": '<path d="m6 9.5 6 6 6-6"/>',
  "chevron-up": '<path d="m6 14.5 6-6 6 6"/>',
  "chevron-left": '<path d="m14.5 6-6 6 6 6"/>',
  "chevron-right": '<path d="m9.5 6 6 6-6 6"/>',
  "arrow-up": '<path d="M12 19V5M6 11l6-6 6 6"/>',
  "arrow-down": '<path d="M12 5v14M6 13l6 6 6-6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20a7.4 7.4 0 0 1 14.4 0"/>',
  users: '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.4 19.5a6.4 6.4 0 0 1 12.2 0M16 5.6a3.2 3.2 0 0 1 0 5.9M17.4 14.4a6.4 6.4 0 0 1 3.2 5.1"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2.4"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  eye: '<path d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  "eye-off": '<path d="M4 4l16 16M9.9 6.2A9.3 9.3 0 0 1 12 6c5.6 0 9.4 6 9.4 6a17 17 0 0 1-3.3 3.9M6.3 8.2A17 17 0 0 0 2.6 12S6.4 18 12 18c1 0 1.9-.2 2.7-.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 1.8"/>',
  star: '<path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8z"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 7.6v.2"/>',
  alert: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.5v5M12 16.4v.2"/>',
  warning: '<path d="M12 4.4 2.8 19.6h18.4z"/><path d="M12 10v3.8M12 16.9v.2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7M6.6 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.8-12"/>',
  edit: '<path d="M4.5 19.5h4l10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14 6.5 17.5 10"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.2"/><path d="M15.5 5.5A1.5 1.5 0 0 0 14 4H6a2 2 0 0 0-2 2v8a1.5 1.5 0 0 0 1.5 1.5"/>',
  download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M4.5 19.5h15"/>',
  upload: '<path d="M12 20V8.5M7.5 12.5 12 8l4.5 4.5M4.5 4.5h15"/>',
  settings: '<circle cx="12" cy="12" r="3.1"/><path d="M19.6 14.4a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.15 16.9l.06-.06a1.7 1.7 0 0 0 .34-1.87A1.7 1.7 0 0 0 3 13.94H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.08 4.08l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.3 1z"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.6 20.5v-6h4.8v6"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5.2-2 6.5-2 6.5h16S18 14.2 18 9"/><path d="M13.7 19.5a2 2 0 0 1-3.4 0"/>',
  filter: '<path d="M4 5.5h16l-6.2 7.3v5.3l-3.6 2v-7.3z"/>',
  external: '<path d="M14 4.5h5.5V10M19 5l-8 8"/><path d="M18 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V7.5A1.5 1.5 0 0 1 6 6h4.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-13.7-4.8L4 8.4"/><path d="M4 4.5v4h4M4 13a8 8 0 0 0 13.7 4.8L20 15.6"/><path d="M20 19.5v-4h-4"/>',
  folder: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h3.7l2 2.4h7.3A1.5 1.5 0 0 1 20 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  file: '<path d="M13.5 4H7a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9z"/><path d="M13.5 4v5h5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2.2"/><circle cx="9" cy="10" r="1.7"/><path d="m5 17 4.6-4.3 3.4 3 2.6-2.3L19 17"/>',
  link: '<path d="M10.6 13.4a3.6 3.6 0 0 0 5.1 0l2.4-2.4a3.6 3.6 0 0 0-5.1-5.1l-1.3 1.3"/><path d="M13.4 10.6a3.6 3.6 0 0 0-5.1 0l-2.4 2.4a3.6 3.6 0 0 0 5.1 5.1l1.3-1.3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  more: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  logout: '<path d="M14.5 8V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h7a1.5 1.5 0 0 0 1.5-1.5v-2"/><path d="M9.5 12h10.5M16.5 8.5 20 12l-3.5 3.5"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2.4"/><path d="M3 10h18"/>',
  chart: '<path d="M4.5 19.5h15"/><path d="M7.5 19.5V11M12 19.5V5.5M16.5 19.5v-6"/>',
  box: '<path d="M20 8.6 12 4 4 8.6v6.8L12 20l8-4.6z"/><path d="m4 8.6 8 4.6 8-4.6M12 13.2V20"/>',
  inbox: '<path d="M4 13.5h4l1.4 2.4h5.2l1.4-2.4h4"/><path d="M4.6 13.5 7 5.6A1.5 1.5 0 0 1 8.5 4.5h7A1.5 1.5 0 0 1 17 5.6l2.4 7.9V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18z"/>'
};
function iconSvg(name) {
  const key = String(name ?? "").trim();
  if (!key) return "";
  const body = ICON_PATHS[key];
  if (!body) return "";
  return `<svg class="v-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
var CSS5 = `
.v-ic{width:1em;height:1em;flex:none}
.v-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v-native-hidden{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;
  border:0;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0)}
@keyframes v-spin{to{transform:rotate(360deg)}}
@keyframes v-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes v-shimmer{0%{background-position:-180% 0}100%{background-position:180% 0}}
@keyframes v-indeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}

/* ------------------------------------------------------------------ botao */
.v-btn{appearance:none;-webkit-appearance:none;position:relative;display:inline-flex;
  align-items:center;justify-content:center;gap:8px;vertical-align:middle;white-space:nowrap;
  font-family:var(--v-font-sans);font-weight:600;line-height:1;text-decoration:none;
  border:1px solid transparent;border-radius:var(--v-radius-sm);cursor:pointer;
  transition:background-color .15s var(--v-ease),border-color .15s var(--v-ease),
    color .15s var(--v-ease),box-shadow .15s var(--v-ease),transform .08s var(--v-ease)}
.v-btn:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-btn:active:not([disabled]){transform:translateY(1px)}
.v-btn[disabled]{cursor:not-allowed;opacity:.58}
.v-btn[data-block="true"]{width:100%;display:flex}
.v-btn[data-rounded="true"]{border-radius:var(--v-radius-full)}
.v-btn-label{display:inline-flex;align-items:center}
.v-btn-label:empty{display:none}

.v-btn[data-size="sm"]{min-height:32px;padding:0 12px;font-size:13px;gap:6px}
.v-btn[data-size="md"]{min-height:40px;padding:0 16px;font-size:14px}
.v-btn[data-size="lg"]{min-height:46px;padding:0 20px;font-size:15px}
.v-btn[data-size="xl"]{min-height:54px;padding:0 26px;font-size:16px}
.v-btn .v-ic{font-size:1.15em}

.v-btn[data-variant="primary"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-btn[data-variant="primary"]:hover:not([disabled]){background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-btn[data-variant="primary"]:active:not([disabled]){background:var(--v-primary-active);border-color:var(--v-primary-active);color:var(--v-primary-contrast-active)}
.v-btn[data-variant="accent"]{background:var(--v-accent);border-color:var(--v-accent);color:var(--v-accent-contrast)}
.v-btn[data-variant="accent"]:hover:not([disabled]){background:var(--v-accent-hover);border-color:var(--v-accent-hover);color:var(--v-accent-contrast-hover)}
.v-btn[data-variant="success"]{background:var(--v-success);border-color:var(--v-success);color:var(--v-success-contrast)}
.v-btn[data-variant="success"]:hover:not([disabled]){background:var(--v-success-hover);border-color:var(--v-success-hover);color:var(--v-success-contrast-hover)}
.v-btn[data-variant="warning"]{background:var(--v-warning);border-color:var(--v-warning);color:var(--v-warning-contrast)}
.v-btn[data-variant="warning"]:hover:not([disabled]){background:var(--v-warning-hover);border-color:var(--v-warning-hover);color:var(--v-warning-contrast-hover)}
.v-btn[data-variant="danger"]{background:var(--v-danger);border-color:var(--v-danger);color:var(--v-danger-contrast)}
.v-btn[data-variant="danger"]:hover:not([disabled]){background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-btn[data-variant="secondary"]{background:var(--v-surface-3);border-color:var(--v-border);color:var(--v-text)}
.v-btn[data-variant="secondary"]:hover:not([disabled]){background:var(--v-surface-2);border-color:var(--v-border-strong);color:var(--v-text)}
.v-btn[data-variant="outline"]{background:transparent;border-color:var(--v-primary-border);color:var(--v-primary-soft-text)}
.v-btn[data-variant="outline"]:hover:not([disabled]){background:var(--v-primary-soft);border-color:var(--v-primary);color:var(--v-primary-soft-text)}
.v-btn[data-variant="ghost"]{background:transparent;border-color:transparent;color:var(--v-text-muted)}
.v-btn[data-variant="ghost"]:hover:not([disabled]){background:var(--v-surface-3);color:var(--v-text)}
.v-btn[data-variant="link"]{background:transparent;border-color:transparent;color:var(--v-primary);padding:0 4px;min-height:auto}
.v-btn[data-variant="link"]:hover:not([disabled]){color:var(--v-primary-hover);text-decoration:underline}

.v-btn-spin{width:1em;height:1em;border-radius:50%;border:2px solid currentColor;
  border-top-color:transparent;animation:v-spin .7s linear infinite;flex:none}

/* ------------------------------------------------------- botao de icone */
.v-icon-btn{appearance:none;-webkit-appearance:none;display:inline-grid;place-items:center;
  border:1px solid transparent;border-radius:var(--v-radius-sm);cursor:pointer;
  font-family:var(--v-font-sans);
  transition:background-color .15s var(--v-ease),border-color .15s var(--v-ease),color .15s var(--v-ease)}
.v-icon-btn:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-icon-btn[disabled]{cursor:not-allowed;opacity:.58}
.v-icon-btn[data-rounded="true"]{border-radius:var(--v-radius-full)}
.v-icon-btn[data-size="sm"]{width:30px;height:30px;font-size:15px}
.v-icon-btn[data-size="md"]{width:38px;height:38px;font-size:17px}
.v-icon-btn[data-size="lg"]{width:46px;height:46px;font-size:20px}
.v-icon-btn[data-variant="primary"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-icon-btn[data-variant="primary"]:hover:not([disabled]){background:var(--v-primary-hover);border-color:var(--v-primary-hover);color:var(--v-primary-contrast-hover)}
.v-icon-btn[data-variant="danger"]{background:var(--v-danger);border-color:var(--v-danger);color:var(--v-danger-contrast)}
.v-icon-btn[data-variant="danger"]:hover:not([disabled]){background:var(--v-danger-hover);border-color:var(--v-danger-hover);color:var(--v-danger-contrast-hover)}
.v-icon-btn[data-variant="secondary"]{background:var(--v-surface-3);border-color:var(--v-border);color:var(--v-text)}
.v-icon-btn[data-variant="secondary"]:hover:not([disabled]){background:var(--v-surface-2);border-color:var(--v-border-strong);color:var(--v-text)}
.v-icon-btn[data-variant="outline"]{background:transparent;border-color:var(--v-border-strong);color:var(--v-text)}
.v-icon-btn[data-variant="outline"]:hover:not([disabled]){background:var(--v-surface-3);border-color:var(--v-primary);color:var(--v-text)}
.v-icon-btn[data-variant="ghost"]{background:transparent;border-color:transparent;color:var(--v-text-muted)}
.v-icon-btn[data-variant="ghost"]:hover:not([disabled]){background:var(--v-surface-3);color:var(--v-text)}

/* ------------------------------------------------------------------ card */
.v-card{display:flex;flex-direction:column;background:var(--v-surface);color:var(--v-text);
  border:1px solid var(--v-border);border-radius:var(--v-radius);box-shadow:var(--v-shadow-sm);
  font-family:var(--v-font-sans);overflow:hidden;
  transition:box-shadow .18s var(--v-ease),border-color .18s var(--v-ease),transform .18s var(--v-ease)}
.v-card[data-hoverable="true"]:hover{box-shadow:var(--v-shadow);border-color:var(--v-border-strong);transform:translateY(-2px)}
.v-card-head{display:flex;gap:12px;align-items:flex-start;padding:18px 18px 0}
.v-card-icon{flex:none;width:36px;height:36px;display:grid;place-items:center;font-size:18px;
  border-radius:var(--v-radius-sm);background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-card-heading{flex:1;min-width:0}
.v-card-title{margin:0;font-size:15.5px;font-weight:650;line-height:1.35;color:var(--v-text)}
.v-card-sub{margin:4px 0 0;font-size:13.5px;line-height:1.5;color:var(--v-text-muted)}
.v-card-actions{flex:none;display:flex;gap:8px;align-items:center}
.v-card-actions:empty{display:none}
.v-card-body{padding:18px;font-size:14px;line-height:1.6;color:var(--v-text)}
.v-card-head+.v-card-body{padding-top:14px}
.v-card-body>:first-child{margin-top:0}
.v-card-body>:last-child{margin-bottom:0}
.v-card-body:empty{display:none}
.v-card-foot{padding:0 18px 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.v-card-foot:empty{display:none}
.v-card[data-padded="false"] .v-card-body{padding:0}

/* ------------------------------------------------------------ formulario */
.v-field{display:flex;flex-direction:column;gap:6px;font-family:var(--v-font-sans);min-width:0}
.v-label{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:600;
  line-height:1.3;color:var(--v-text)}
.v-label[data-size="sm"]{font-size:12.5px}
.v-label[data-size="lg"]{font-size:14px}
.v-req{color:var(--v-danger);font-weight:700}
.v-hint{margin:0;font-size:12.5px;line-height:1.45;color:var(--v-text-muted)}
.v-error-text{margin:0;font-size:12.5px;line-height:1.45;font-weight:600;color:var(--v-danger)}

.v-control{position:relative;display:flex;align-items:center;gap:8px;
  background:var(--v-surface);border:1px solid var(--v-border);border-radius:var(--v-radius-sm);
  transition:border-color .15s var(--v-ease),box-shadow .15s var(--v-ease),background-color .15s var(--v-ease)}
.v-control:focus-within{border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-field[data-error="true"] .v-control{border-color:var(--v-danger)}
.v-field[data-error="true"] .v-control:focus-within{box-shadow:0 0 0 3px var(--v-danger-ring)}
.v-field[data-disabled="true"] .v-control{background:var(--v-surface-3);opacity:.72}
.v-control-ic{flex:none;display:grid;place-items:center;font-size:16px;color:var(--v-text-soft);padding-left:11px}
.v-control-ic+.v-input,.v-control-ic+.v-textarea{padding-left:2px}
.v-control[data-size="sm"]{--v-control-h:34px;font-size:13px}
.v-control[data-size="md"]{--v-control-h:40px;font-size:14px}
.v-control[data-size="lg"]{--v-control-h:46px;font-size:15px}

.v-input,.v-textarea{appearance:none;-webkit-appearance:none;flex:1;min-width:0;width:100%;
  background:transparent;border:0;outline:none;font-family:inherit;font-size:inherit;
  line-height:1.45;color:var(--v-text);padding:0 12px;min-height:calc(var(--v-control-h,40px) - 2px)}
.v-textarea{padding:10px 12px;resize:vertical;min-height:96px}
.v-textarea[data-resize="none"]{resize:none}
.v-input::placeholder,.v-textarea::placeholder{color:var(--v-text-soft);opacity:1}
.v-input:disabled,.v-textarea:disabled{cursor:not-allowed;color:var(--v-text-muted)}
.v-input::-webkit-outer-spin-button,.v-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.v-input[type="number"]{-moz-appearance:textfield}
.v-affix{flex:none;display:grid;place-items:center;padding-right:10px;color:var(--v-text-soft);font-size:16px}
.v-clear{appearance:none;background:none;border:0;cursor:pointer;color:var(--v-text-soft);
  display:grid;place-items:center;width:22px;height:22px;border-radius:var(--v-radius-full);
  margin-right:8px;font-size:14px;flex:none}
.v-clear:hover{background:var(--v-surface-3);color:var(--v-text)}
.v-clear:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:1px}
.v-counter{font-size:12px;color:var(--v-text-soft);text-align:right}

/* ----------------------------------------------------------- combobox */
.v-select{position:relative;font-family:var(--v-font-sans)}
.v-select-trigger{appearance:none;-webkit-appearance:none;width:100%;display:flex;align-items:center;
  gap:8px;text-align:left;cursor:pointer;background:var(--v-surface);color:var(--v-text);
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);font-family:inherit;
  min-height:var(--v-control-h,40px);padding:0 10px 0 12px;font-size:14px;
  transition:border-color .15s var(--v-ease),box-shadow .15s var(--v-ease)}
.v-select-trigger[data-size="sm"]{--v-control-h:34px;font-size:13px}
.v-select-trigger[data-size="lg"]{--v-control-h:46px;font-size:15px}
.v-select-trigger:hover:not([disabled]){border-color:var(--v-border-strong)}
.v-select-trigger:focus-visible{outline:none;border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-select.is-open>.v-select-trigger{border-color:var(--v-primary);box-shadow:0 0 0 3px var(--v-focus-ring)}
.v-select-trigger[disabled]{cursor:not-allowed;background:var(--v-surface-3);color:var(--v-text-muted)}
.v-field[data-error="true"] .v-select-trigger{border-color:var(--v-danger)}
.v-select-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-select-value[data-placeholder="true"]{color:var(--v-text-soft)}
.v-select-arrow{flex:none;font-size:16px;color:var(--v-text-soft);transition:transform .18s var(--v-ease)}
.v-select.is-open .v-select-arrow{transform:rotate(180deg)}

.v-select-pop{position:absolute;z-index:var(--v-z-dropdown,900);top:calc(100% + 6px);left:0;right:0;
  background:var(--v-surface);border:1px solid var(--v-border);border-radius:var(--v-radius-sm);
  box-shadow:var(--v-shadow);overflow:hidden;display:flex;flex-direction:column;max-height:280px}
.v-select-search{padding:8px;border-bottom:1px solid var(--v-border);display:flex;align-items:center;gap:8px}
.v-select-input{appearance:none;-webkit-appearance:none;flex:1;min-width:0;background:var(--v-surface-2);
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);padding:7px 10px;
  font-family:inherit;font-size:13.5px;color:var(--v-text);outline:none}
.v-select-input:focus{border-color:var(--v-primary);box-shadow:0 0 0 2px var(--v-focus-ring)}
.v-select-input::placeholder{color:var(--v-text-soft)}
.v-select-list{list-style:none;margin:0;padding:5px;overflow-y:auto;overscroll-behavior:contain}
.v-select-opt{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--v-radius-sm);
  font-size:14px;line-height:1.35;color:var(--v-text);cursor:pointer;user-select:none}
.v-select-opt.is-active{background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-select-opt.is-selected{font-weight:600}
.v-select-opt.is-disabled{opacity:.45;cursor:not-allowed}
.v-select-check{flex:none;width:16px;height:16px;display:grid;place-items:center;
  color:var(--v-primary-soft-text);opacity:0}
.v-select-opt.is-selected .v-select-check{opacity:1}
.v-select-empty{padding:14px 10px;text-align:center;font-size:13.5px;color:var(--v-text-muted)}

/* -------------------------------------------- caixa, radio e interruptor */
.v-check{display:inline-flex;align-items:flex-start;gap:9px;cursor:pointer;
  font-family:var(--v-font-sans);font-size:14px;line-height:1.45;color:var(--v-text)}
.v-check[data-disabled="true"]{cursor:not-allowed;opacity:.6}
.v-check-slot{position:relative;flex:none;display:inline-flex;margin-top:1px}
.v-check-native{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;opacity:0;
  appearance:none;-webkit-appearance:none;cursor:inherit}
.v-check-box{width:19px;height:19px;display:grid;place-items:center;background:var(--v-surface);
  border:1.5px solid var(--v-border-strong);border-radius:5px;color:var(--v-primary-contrast);
  transition:background-color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-check[data-shape="round"] .v-check-box{border-radius:var(--v-radius-full)}
.v-check-box .v-ic{font-size:13px;opacity:0;transform:scale(.6);
  transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-check-native:checked+.v-check-box{background:var(--v-primary);border-color:var(--v-primary)}
.v-check-native:checked+.v-check-box .v-ic{opacity:1;transform:none}
.v-check-native:focus-visible+.v-check-box{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-check-native:disabled+.v-check-box{background:var(--v-surface-3);border-color:var(--v-border)}
.v-check[data-error="true"] .v-check-box{border-color:var(--v-danger)}
.v-check-text{min-width:0}
.v-check-desc{display:block;margin-top:2px;font-size:12.5px;color:var(--v-text-muted)}

.v-radio-dot{width:9px;height:9px;border-radius:var(--v-radius-full);background:var(--v-primary-contrast);
  opacity:0;transform:scale(.4);transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-check-native:checked+.v-check-box .v-radio-dot{opacity:1;transform:none}

.v-switch-track{width:40px;height:23px;border-radius:var(--v-radius-full);background:var(--v-border-strong);
  display:flex;align-items:center;padding:2px;transition:background-color .18s var(--v-ease)}
.v-switch-thumb{width:19px;height:19px;border-radius:var(--v-radius-full);background:var(--v-surface);
  box-shadow:var(--v-shadow-sm);transition:transform .18s var(--v-ease)}
.v-check-native:checked+.v-switch-track{background:var(--v-primary)}
.v-check-native:checked+.v-switch-track .v-switch-thumb{transform:translateX(17px)}
.v-check-native:focus-visible+.v-switch-track{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-check-native:disabled+.v-switch-track{opacity:.6}
.v-check[data-size="sm"] .v-switch-track{width:34px;height:20px}
.v-check[data-size="sm"] .v-switch-thumb{width:16px;height:16px}
.v-check[data-size="sm"] .v-check-native:checked+.v-switch-track .v-switch-thumb{transform:translateX(14px)}

/* --------------------------------------------------- selo, etiqueta, alerta */
.v-badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--v-font-sans);
  font-weight:600;line-height:1;border-radius:var(--v-radius-full);border:1px solid transparent;
  white-space:nowrap;vertical-align:middle}
.v-badge[data-size="sm"]{font-size:11px;padding:3px 8px}
.v-badge[data-size="md"]{font-size:12px;padding:4px 10px}
.v-badge[data-size="lg"]{font-size:13px;padding:6px 12px}
.v-badge-dot{width:6px;height:6px;border-radius:var(--v-radius-full);background:currentColor;flex:none}
.v-badge[data-variant="soft"][data-tone="neutral"]{background:var(--v-surface-3);color:var(--v-text-muted)}
.v-badge[data-variant="soft"][data-tone="primary"]{background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-badge[data-variant="soft"][data-tone="accent"]{background:var(--v-accent-soft);color:var(--v-accent-soft-text)}
.v-badge[data-variant="soft"][data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-badge[data-variant="soft"][data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text)}
.v-badge[data-variant="soft"][data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-badge[data-variant="soft"][data-tone="info"]{background:var(--v-info-soft);color:var(--v-info-soft-text)}
.v-badge[data-variant="solid"][data-tone="neutral"]{background:var(--v-text-muted);color:var(--v-surface)}
.v-badge[data-variant="solid"][data-tone="primary"]{background:var(--v-primary);color:var(--v-primary-contrast)}
.v-badge[data-variant="solid"][data-tone="accent"]{background:var(--v-accent);color:var(--v-accent-contrast)}
.v-badge[data-variant="solid"][data-tone="success"]{background:var(--v-success);color:var(--v-success-contrast)}
.v-badge[data-variant="solid"][data-tone="warning"]{background:var(--v-warning);color:var(--v-warning-contrast)}
.v-badge[data-variant="solid"][data-tone="danger"]{background:var(--v-danger);color:var(--v-danger-contrast)}
.v-badge[data-variant="solid"][data-tone="info"]{background:var(--v-info);color:var(--v-info-contrast)}
.v-badge[data-variant="outline"]{background:transparent}
.v-badge[data-variant="outline"][data-tone="neutral"]{border-color:var(--v-border-strong);color:var(--v-text-muted)}
.v-badge[data-variant="outline"][data-tone="primary"]{border-color:var(--v-primary-border);color:var(--v-primary-soft-text)}
.v-badge[data-variant="outline"][data-tone="accent"]{border-color:var(--v-accent-border);color:var(--v-accent-soft-text)}
.v-badge[data-variant="outline"][data-tone="success"]{border-color:var(--v-success-border);color:var(--v-success-soft-text)}
.v-badge[data-variant="outline"][data-tone="warning"]{border-color:var(--v-warning-border);color:var(--v-warning-soft-text)}
.v-badge[data-variant="outline"][data-tone="danger"]{border-color:var(--v-danger-border);color:var(--v-danger-soft-text)}
.v-badge[data-variant="outline"][data-tone="info"]{border-color:var(--v-info-border);color:var(--v-info-soft-text)}

.v-tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--v-font-sans);font-size:12.5px;
  font-weight:600;line-height:1;padding:5px 6px 5px 10px;border-radius:var(--v-radius-sm);
  border:1px solid transparent;vertical-align:middle}
.v-tag[data-closable="false"]{padding-right:10px}
.v-tag-close{appearance:none;background:none;border:0;cursor:pointer;color:inherit;opacity:.65;
  display:grid;place-items:center;width:18px;height:18px;border-radius:var(--v-radius-full);font-size:12px}
.v-tag-close:hover{opacity:1;background:rgba(0,0,0,.08)}
.v-tag-close:focus-visible{outline:2px solid currentColor;outline-offset:1px}

.v-alert{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:var(--v-radius);
  border:1px solid transparent;font-family:var(--v-font-sans);font-size:14px;line-height:1.55}
.v-alert-icon{flex:none;font-size:18px;margin-top:1px}
.v-alert-body{flex:1;min-width:0}
.v-alert-title{margin:0 0 3px;font-size:14.5px;font-weight:650;line-height:1.4}
.v-alert-text>:first-child{margin-top:0}
.v-alert-text>:last-child{margin-bottom:0}
.v-alert-close{appearance:none;background:none;border:0;cursor:pointer;color:inherit;opacity:.6;
  flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:var(--v-radius-sm);font-size:14px}
.v-alert-close:hover{opacity:1}
.v-alert-close:focus-visible{outline:2px solid currentColor;outline-offset:1px}
.v-alert[data-tone="info"]{background:var(--v-info-soft);color:var(--v-info-soft-text);border-color:var(--v-info-border)}
.v-alert[data-tone="primary"]{background:var(--v-primary-soft);color:var(--v-primary-soft-text);border-color:var(--v-primary-border)}
.v-alert[data-tone="success"]{background:var(--v-success-soft);color:var(--v-success-soft-text);border-color:var(--v-success-border)}
.v-alert[data-tone="warning"]{background:var(--v-warning-soft);color:var(--v-warning-soft-text);border-color:var(--v-warning-border)}
.v-alert[data-tone="danger"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text);border-color:var(--v-danger-border)}
.v-alert[data-tone="neutral"]{background:var(--v-surface-2);color:var(--v-text);border-color:var(--v-border)}

/* -------------------------------------------------------------- avatar */
.v-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;
  font-family:var(--v-font-sans);font-weight:650;overflow:hidden;flex:none;
  border-radius:var(--v-radius-full);background:var(--v-primary-soft);color:var(--v-primary-soft-text);
  user-select:none;vertical-align:middle}
.v-avatar[data-shape="square"]{border-radius:var(--v-radius-sm);overflow:visible}
.v-avatar[data-shape="square"] .v-avatar-img{border-radius:var(--v-radius-sm)}
.v-avatar[data-size="xs"]{width:24px;height:24px;font-size:10px}
.v-avatar[data-size="sm"]{width:32px;height:32px;font-size:12px}
.v-avatar[data-size="md"]{width:40px;height:40px;font-size:14px}
.v-avatar[data-size="lg"]{width:52px;height:52px;font-size:18px}
.v-avatar[data-size="xl"]{width:68px;height:68px;font-size:23px}
.v-avatar-img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
.v-avatar-status{position:absolute;right:0;bottom:0;width:28%;height:28%;border-radius:var(--v-radius-full);
  border:2px solid var(--v-surface);background:var(--v-text-soft)}
.v-avatar-status[data-status="online"]{background:var(--v-success)}
.v-avatar-status[data-status="busy"]{background:var(--v-danger)}
.v-avatar-status[data-status="away"]{background:var(--v-warning)}

/* ------------------------------------------------- spinner e esqueleto */
.v-spinner{display:inline-block;border-radius:50%;border-style:solid;border-color:var(--v-border);
  border-top-color:var(--v-primary);animation:v-spin .7s linear infinite;vertical-align:middle}
.v-spinner[data-tone="accent"]{border-top-color:var(--v-accent)}
.v-spinner[data-tone="success"]{border-top-color:var(--v-success)}
.v-spinner[data-tone="danger"]{border-top-color:var(--v-danger)}
.v-spinner[data-tone="current"]{border-color:currentColor;border-top-color:transparent;opacity:.65}
.v-spinner[data-size="sm"]{width:16px;height:16px;border-width:2px}
.v-spinner[data-size="md"]{width:22px;height:22px;border-width:2.5px}
.v-spinner[data-size="lg"]{width:32px;height:32px;border-width:3px}

.v-skeleton{display:block;background:var(--v-surface-3);border-radius:var(--v-radius-sm);
  background-image:linear-gradient(90deg,transparent 0%,var(--v-surface-2) 50%,transparent 100%);
  background-size:180% 100%;animation:v-shimmer 1.5s linear infinite}
.v-skeleton[data-circle="true"]{border-radius:var(--v-radius-full)}
.v-skeleton-stack{display:flex;flex-direction:column;gap:8px}

/* ------------------------------------------------------------- progresso */
.v-progress{font-family:var(--v-font-sans);display:flex;flex-direction:column;gap:6px}
.v-progress-head{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:var(--v-text-muted)}
.v-progress-value{font-weight:650;color:var(--v-text)}
.v-progress-track{position:relative;width:100%;background:var(--v-surface-3);border-radius:var(--v-radius-full);
  overflow:hidden}
.v-progress[data-size="sm"] .v-progress-track{height:5px}
.v-progress[data-size="md"] .v-progress-track{height:9px}
.v-progress[data-size="lg"] .v-progress-track{height:14px}
.v-progress-bar{height:100%;border-radius:inherit;background:var(--v-primary);
  transition:width .35s var(--v-ease)}
.v-progress[data-tone="accent"] .v-progress-bar{background:var(--v-accent)}
.v-progress[data-tone="success"] .v-progress-bar{background:var(--v-success)}
.v-progress[data-tone="warning"] .v-progress-bar{background:var(--v-warning)}
.v-progress[data-tone="danger"] .v-progress-bar{background:var(--v-danger)}
.v-progress[data-indeterminate="true"] .v-progress-bar{width:30% !important;animation:v-indeterminate 1.3s var(--v-ease) infinite}

/* ------------------------------------------------------------- divisor */
.v-divider{display:flex;align-items:center;gap:12px;color:var(--v-text-soft);
  font-family:var(--v-font-sans);font-size:12.5px;font-weight:600;margin:16px 0}
.v-divider::before,.v-divider::after{content:"";flex:1;height:1px;background:var(--v-border)}
.v-divider[data-label="false"]::after{display:none}
.v-divider[data-vertical="true"]{flex-direction:column;margin:0 16px;align-self:stretch;height:auto}
.v-divider[data-vertical="true"]::before,.v-divider[data-vertical="true"]::after{width:1px;height:auto;flex:1}

/* -------------------------------------------------------------- tabela */
.v-table-wrap{width:100%;overflow-x:auto;background:var(--v-surface);border:1px solid var(--v-border);
  border-radius:var(--v-radius);font-family:var(--v-font-sans)}
.v-table{width:100%;border-collapse:collapse;font-size:14px;color:var(--v-text)}
.v-table th,.v-table td{padding:11px 14px;text-align:left;border-bottom:1px solid var(--v-border);
  vertical-align:middle}
.v-table thead th{background:var(--v-surface-2);font-size:12.5px;font-weight:650;letter-spacing:.02em;
  text-transform:uppercase;color:var(--v-text-muted);white-space:nowrap;position:sticky;top:0;z-index:1}
.v-table tbody tr:last-child td{border-bottom:0}
.v-table[data-striped="true"] tbody tr:nth-child(even){background:var(--v-surface-2)}
.v-table[data-hover="true"] tbody tr:hover{background:var(--v-primary-soft)}
.v-table[data-dense="true"] th,.v-table[data-dense="true"] td{padding:7px 12px}
.v-th{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;margin:0;
  font:inherit;color:inherit;text-transform:inherit;letter-spacing:inherit}
.v-th[data-sortable="true"]{cursor:pointer}
.v-th[data-sortable="true"]:hover{color:var(--v-text)}
.v-th:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px;border-radius:4px}
.v-th-arrow{font-size:12px;opacity:0;transition:opacity .15s var(--v-ease)}
.v-th[aria-sort="ascending"] .v-th-arrow,.v-th[aria-sort="descending"] .v-th-arrow{opacity:1;color:var(--v-primary)}
.v-table-empty{text-align:center;color:var(--v-text-muted);padding:34px 14px;font-size:14px}

/* ---------------------------------------------------------- paginacao */
.v-pagination{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-family:var(--v-font-sans)}
.v-page{appearance:none;min-width:34px;height:34px;padding:0 9px;display:inline-grid;place-items:center;
  background:transparent;border:1px solid transparent;border-radius:var(--v-radius-sm);
  font-family:inherit;font-size:13.5px;font-weight:600;color:var(--v-text-muted);cursor:pointer;
  transition:background-color .14s var(--v-ease),color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-page:hover:not([disabled]):not([aria-current="page"]){background:var(--v-surface-3);color:var(--v-text)}
.v-page:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-page[disabled]{opacity:.4;cursor:not-allowed}
.v-page[aria-current="page"]{background:var(--v-primary);border-color:var(--v-primary);color:var(--v-primary-contrast)}
.v-page-gap{min-width:24px;text-align:center;color:var(--v-text-soft);user-select:none}

/* ----------------------------------------------------------- migalhas */
.v-breadcrumb{font-family:var(--v-font-sans);font-size:13.5px}
.v-breadcrumb-list{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0;padding:0}
.v-breadcrumb-item{display:inline-flex;align-items:center;gap:6px;color:var(--v-text-muted)}
.v-breadcrumb-item a{color:inherit;text-decoration:none;border-radius:4px}
.v-breadcrumb-item a:hover{color:var(--v-primary);text-decoration:underline}
.v-breadcrumb-item a:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-breadcrumb-item[aria-current="page"]{color:var(--v-text);font-weight:600}
.v-breadcrumb-sep{color:var(--v-text-soft);user-select:none}

/* ------------------------------------------------------------ metrica */
.v-stat{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;background:var(--v-surface);
  border:1px solid var(--v-border);border-radius:var(--v-radius);font-family:var(--v-font-sans)}
.v-stat-icon{flex:none;width:40px;height:40px;display:grid;place-items:center;font-size:19px;
  border-radius:var(--v-radius-sm);background:var(--v-primary-soft);color:var(--v-primary-soft-text)}
.v-stat-body{flex:1;min-width:0}
.v-stat-label{font-size:12.5px;font-weight:600;letter-spacing:.02em;text-transform:uppercase;
  color:var(--v-text-muted)}
.v-stat-value{margin-top:4px;font-size:26px;font-weight:700;line-height:1.15;color:var(--v-text);
  overflow-wrap:anywhere}
.v-stat-row{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}
.v-stat-delta{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:700;
  padding:2px 7px;border-radius:var(--v-radius-full)}
.v-stat-delta[data-dir="up"]{background:var(--v-success-soft);color:var(--v-success-soft-text)}
.v-stat-delta[data-dir="down"]{background:var(--v-danger-soft);color:var(--v-danger-soft-text)}
.v-stat-delta[data-dir="flat"]{background:var(--v-surface-3);color:var(--v-text-muted)}
.v-stat-hint{font-size:12.5px;color:var(--v-text-muted)}

/* ------------------------------------------------------- estado vazio */
.v-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;
  padding:44px 22px;font-family:var(--v-font-sans);color:var(--v-text)}
.v-empty-icon{width:58px;height:58px;display:grid;place-items:center;font-size:27px;
  border-radius:var(--v-radius-full);background:var(--v-surface-3);color:var(--v-text-soft)}
.v-empty-title{margin:0;font-size:16px;font-weight:650}
.v-empty-desc{margin:0;font-size:14px;line-height:1.55;color:var(--v-text-muted);max-width:46ch}
.v-empty-actions{margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.v-empty-actions:empty{display:none}

/* ----------------------------------------------------------- linha do tempo */
.v-timeline{list-style:none;margin:0;padding:0;font-family:var(--v-font-sans);
  display:flex;flex-direction:column}
.v-timeline-item{position:relative;display:flex;gap:14px;padding-bottom:20px}
.v-timeline-item:last-child{padding-bottom:0}
.v-timeline-rail{position:relative;flex:none;width:14px;display:flex;justify-content:center}
.v-timeline-dot{position:relative;z-index:1;width:12px;height:12px;margin-top:4px;
  border-radius:var(--v-radius-full);background:var(--v-primary);
  box-shadow:0 0 0 3px var(--v-primary-soft)}
.v-timeline-item[data-tone="success"] .v-timeline-dot{background:var(--v-success);box-shadow:0 0 0 3px var(--v-success-soft)}
.v-timeline-item[data-tone="warning"] .v-timeline-dot{background:var(--v-warning);box-shadow:0 0 0 3px var(--v-warning-soft)}
.v-timeline-item[data-tone="danger"] .v-timeline-dot{background:var(--v-danger);box-shadow:0 0 0 3px var(--v-danger-soft)}
.v-timeline-item[data-tone="muted"] .v-timeline-dot{background:var(--v-border-strong);box-shadow:0 0 0 3px var(--v-surface-3)}
.v-timeline-item:not(:last-child) .v-timeline-rail::after{content:"";position:absolute;top:14px;bottom:-20px;
  width:2px;background:var(--v-border)}
.v-timeline-body{flex:1;min-width:0;padding-bottom:2px}
.v-timeline-title{font-size:14px;font-weight:650;color:var(--v-text)}
.v-timeline-desc{margin:3px 0 0;font-size:13.5px;line-height:1.55;color:var(--v-text-muted)}
.v-timeline-time{display:block;margin-top:3px;font-size:12px;color:var(--v-text-soft)}

/* ---------------------------------------------------------------- passos */
.v-steps{display:flex;gap:0;font-family:var(--v-font-sans);list-style:none;margin:0;padding:0}
.v-steps[data-vertical="true"]{flex-direction:column;gap:4px}
.v-step{flex:1;display:flex;align-items:flex-start;gap:10px;min-width:0;position:relative;padding-right:12px}
.v-steps[data-vertical="true"] .v-step{padding:0 0 20px}
.v-step-mark{flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:var(--v-radius-full);
  font-size:13px;font-weight:700;background:var(--v-surface-3);color:var(--v-text-muted);
  border:1.5px solid transparent}
.v-step[data-state="current"] .v-step-mark{background:var(--v-primary);color:var(--v-primary-contrast)}
.v-step[data-state="done"] .v-step-mark{background:var(--v-success-soft);color:var(--v-success-soft-text);
  border-color:var(--v-success-border)}
.v-step-text{min-width:0;padding-top:4px}
.v-step-label{font-size:13.5px;font-weight:650;color:var(--v-text-muted);line-height:1.35}
.v-step[data-state="current"] .v-step-label,.v-step[data-state="done"] .v-step-label{color:var(--v-text)}
.v-step-line{position:absolute;left:28px;right:0;top:14px;height:2px;background:var(--v-border)}
.v-step[data-state="done"] .v-step-line{background:var(--v-success)}
.v-steps[data-vertical="true"] .v-step-line{left:13px;right:auto;top:30px;bottom:2px;width:2px;height:auto}
.v-step:last-child .v-step-line{display:none}

/* ------------------------------------------------------------ avaliacao */
.v-rating{display:inline-flex;align-items:center;gap:6px;font-family:var(--v-font-sans)}
.v-rating-stars{display:inline-flex;gap:2px}
.v-star{appearance:none;background:none;border:0;padding:2px;cursor:pointer;line-height:0;
  color:var(--v-border-strong);transition:color .13s var(--v-ease),transform .13s var(--v-ease)}
.v-star:hover:not([disabled]){transform:scale(1.12)}
.v-star:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px;border-radius:4px}
.v-star[data-on="true"]{color:var(--v-warning)}
.v-star[data-on="true"] .v-ic{fill:currentColor}
.v-star[disabled]{cursor:default}
.v-rating[data-size="sm"] .v-ic{font-size:15px}
.v-rating[data-size="md"] .v-ic{font-size:20px}
.v-rating[data-size="lg"] .v-ic{font-size:26px}
.v-rating-value{font-size:13px;font-weight:650;color:var(--v-text-muted)}

/* --------------------------------------------------------------- tooltip */
.v-tipwrap{position:relative;display:inline-flex}
.v-tip{position:absolute;z-index:var(--v-z-tooltip,1200);padding:6px 10px;border-radius:var(--v-radius-sm);
  background:var(--v-text);color:var(--v-surface);font-family:var(--v-font-sans);font-size:12.5px;
  font-weight:600;line-height:1.35;white-space:nowrap;pointer-events:none;opacity:0;
  transform:translateY(4px);transition:opacity .14s var(--v-ease),transform .14s var(--v-ease)}
.v-tip[data-placement="top"]{bottom:calc(100% + 8px);left:50%;translate:-50% 0}
.v-tip[data-placement="bottom"]{top:calc(100% + 8px);left:50%;translate:-50% 0}
.v-tip[data-placement="left"]{right:calc(100% + 8px);top:50%;translate:0 -50%}
.v-tip[data-placement="right"]{left:calc(100% + 8px);top:50%;translate:0 -50%}
.v-tipwrap:hover .v-tip,.v-tipwrap:focus-within .v-tip{opacity:1;transform:none}

/* ------------------------------------------------------------ codigo */
.v-code{position:relative;background:var(--v-surface-inset);border:1px solid var(--v-border);
  border-radius:var(--v-radius);overflow:hidden;font-family:var(--v-font-mono)}
.v-code-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 10px 8px 14px;background:var(--v-surface-2);border-bottom:1px solid var(--v-border);
  font-family:var(--v-font-sans);font-size:12.5px;color:var(--v-text-muted)}
.v-code-name{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-code-copy{appearance:none;display:inline-flex;align-items:center;gap:6px;background:transparent;
  border:1px solid var(--v-border);border-radius:var(--v-radius-sm);padding:4px 9px;cursor:pointer;
  font-family:inherit;font-size:12px;font-weight:650;color:var(--v-text-muted);flex:none;
  transition:background-color .14s var(--v-ease),color .14s var(--v-ease),border-color .14s var(--v-ease)}
.v-code-copy:hover{background:var(--v-surface-3);color:var(--v-text);border-color:var(--v-border-strong)}
.v-code-copy:focus-visible{outline:2px solid var(--v-focus-ring);outline-offset:2px}
.v-code-copy[data-copied="true"]{color:var(--v-success-soft-text);border-color:var(--v-success-border);
  background:var(--v-success-soft)}
.v-code-pre{margin:0;padding:14px;overflow-x:auto;font-size:13px;line-height:1.65;
  color:var(--v-text);tab-size:2}
.v-code[data-wrap="true"] .v-code-pre{white-space:pre-wrap;overflow-wrap:anywhere}
.v-code-pre code{font-family:inherit;background:none;padding:0}

@media (max-width:600px){
  .v-steps{flex-direction:column;gap:4px}
  .v-steps .v-step{padding:0 0 20px}
  .v-steps .v-step-line{left:13px;right:auto;top:30px;bottom:2px;width:2px;height:auto}
  .v-stat-value{font-size:22px}
}
@media (prefers-reduced-motion: reduce){
  .v-btn,.v-icon-btn,.v-card,.v-control,.v-select-trigger,.v-select-arrow,.v-check-box,
  .v-check-box .v-ic,.v-radio-dot,.v-switch-track,.v-switch-thumb,.v-progress-bar,.v-star,
  .v-tip,.v-page,.v-code-copy{transition:none}
  .v-skeleton,.v-spinner,.v-btn-spin{animation-duration:1.6s}
  .v-progress[data-indeterminate="true"] .v-progress-bar{animation-duration:2.4s}
}
`;
var stylesReady = false;
function ensureStyles3() {
  if (stylesReady) return;
  stylesReady = true;
  ensureTokens();
  ensurePalette();
  injectStyle("components", CSS5);
}
function register(name, definition) {
  const original = definition.beforeMount;
  definition.methods = {
    svgIcon: (value) => iconSvg(value),
    hasFlag: (value) => flag(value),
    ...definition.methods ?? {}
  };
  definition.beforeMount = function() {
    ensureStyles3();
    original?.call(this);
  };
  defineComponent(name, definition);
}
register("v-button", {
  props: {
    variant: { type: "string", default: "primary" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    iconRight: TEXT,
    type: { type: "string", default: "button" },
    loading: BOOL,
    disabled: BOOL,
    block: BOOL,
    rounded: BOOL,
    ariaLabel: TEXT
  },
  computed: {
    ...flags("loading", "disabled", "block", "rounded"),
    blocked() {
      return flag(this.disabled) || flag(this.loading);
    }
  },
  template: `
    <button class="v-btn" :type="type" :data-variant="variant" :data-size="size"
      :data-block="isBlock" :data-rounded="isRounded" :disabled="blocked"
      :aria-busy="isLoading" :aria-label="ariaLabel || null">
      <span class="v-btn-spin" v-if="isLoading" aria-hidden="true"></span>
      <span class="v-btn-ic" v-if="icon && !isLoading" v-html="svgIcon(icon)"></span>
      <span class="v-btn-label"><slot></slot></span>
      <span class="v-btn-ic" v-if="iconRight" v-html="svgIcon(iconRight)"></span>
    </button>
  `
});
register("v-icon-button", {
  props: {
    icon: { type: "string", default: "more" },
    label: TEXT,
    variant: { type: "string", default: "ghost" },
    size: { type: "string", default: "md" },
    type: { type: "string", default: "button" },
    disabled: BOOL,
    loading: BOOL,
    rounded: BOOL
  },
  computed: {
    ...flags("disabled", "loading", "rounded"),
    blocked() {
      return flag(this.disabled) || flag(this.loading);
    },
    accessibleName() {
      return this.label || this.icon || "A\xE7\xE3o";
    }
  },
  template: `
    <button class="v-icon-btn" :type="type" :data-variant="variant" :data-size="size"
      :data-rounded="isRounded" :disabled="blocked" :aria-label="accessibleName" :title="label || null">
      <span class="v-btn-spin" v-if="isLoading" aria-hidden="true"></span>
      <span v-if="!isLoading" v-html="svgIcon(icon)"></span>
    </button>
  `
});
register("v-card", {
  props: {
    title: TEXT,
    subtitle: TEXT,
    icon: TEXT,
    padded: { type: "any", default: true },
    hoverable: BOOL
  },
  computed: {
    ...flags("hoverable"),
    isPadded() {
      return this.padded === true || flag(this.padded);
    }
  },
  template: `
    <div class="v-card" :data-hoverable="isHoverable" :data-padded="isPadded">
      <div class="v-card-head" v-if="title || subtitle || icon">
        <span class="v-card-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
        <div class="v-card-heading">
          <h3 class="v-card-title" v-if="title" v-text="title"></h3>
          <p class="v-card-sub" v-if="subtitle" v-text="subtitle"></p>
        </div>
        <div class="v-card-actions"><slot name="actions"></slot></div>
      </div>
      <div class="v-card-body"><slot></slot></div>
      <div class="v-card-foot"><slot name="footer"></slot></div>
    </div>
  `
});
register("v-label", {
  props: {
    for: TEXT,
    size: { type: "string", default: "md" },
    required: BOOL
  },
  computed: { ...flags("required") },
  template: `
    <label class="v-label" :data-size="size" :for="for || null">
      <span><slot></slot></span>
      <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
    </label>
  `
});
register("v-field", {
  props: {
    label: TEXT,
    hint: TEXT,
    error: TEXT,
    for: TEXT,
    required: BOOL,
    disabled: BOOL
  },
  computed: { ...flags("required", "disabled") },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="for || null">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-field-control"><slot></slot></div>
      <p class="v-hint" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-input", {
  props: {
    label: TEXT,
    type: { type: "string", default: "text" },
    placeholder: TEXT,
    hint: TEXT,
    error: TEXT,
    value: TEXT,
    name: TEXT,
    id: TEXT,
    icon: TEXT,
    suffix: TEXT,
    size: { type: "string", default: "md" },
    autocomplete: TEXT,
    inputmode: TEXT,
    maxlength: TEXT,
    min: TEXT,
    max: TEXT,
    step: TEXT,
    required: BOOL,
    disabled: BOOL,
    readonly: BOOL,
    clearable: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-input-") };
  },
  computed: {
    ...flags("required", "disabled", "readonly", "clearable"),
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    }
  },
  methods: {
    clear() {
      this.value = "";
      notify(this.$el);
      this.emit("clear");
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.value,
      set: (next) => {
        this.value = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="fieldId">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-control" :data-size="size">
        <span class="v-control-ic" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
        <input class="v-input" :id="fieldId" :type="type" :name="name || null"
          :placeholder="placeholder || null" :autocomplete="autocomplete || null"
          :inputmode="inputmode || null" :maxlength="maxlength || null"
          :min="min || null" :max="max || null" :step="step || null"
          :required="isRequired" :disabled="isDisabled" :readonly="isReadonly"
          :aria-invalid="!!error" :aria-describedby="describedBy" v-model="value">
        <button type="button" class="v-clear" v-if="isClearable && value && !isDisabled"
          v-click="clear" aria-label="Limpar campo" v-html="svgIcon('x')"></button>
        <span class="v-affix" v-if="suffix" v-text="suffix"></span>
      </div>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-textarea", {
  props: {
    label: TEXT,
    placeholder: TEXT,
    hint: TEXT,
    error: TEXT,
    value: TEXT,
    name: TEXT,
    id: TEXT,
    rows: { type: "number", default: 4 },
    maxlength: TEXT,
    size: { type: "string", default: "md" },
    resize: { type: "string", default: "vertical" },
    required: BOOL,
    disabled: BOOL,
    readonly: BOOL,
    counter: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-textarea-") };
  },
  computed: {
    ...flags("required", "disabled", "readonly", "counter"),
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    },
    counterText() {
      const used = String(this.value ?? "").length;
      return this.maxlength ? `${used}/${this.maxlength}` : String(used);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.value,
      set: (next) => {
        this.value = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" v-if="label" :for="fieldId">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-control" :data-size="size">
        <textarea class="v-textarea" :id="fieldId" :name="name || null" :rows="rows"
          :placeholder="placeholder || null" :maxlength="maxlength || null"
          :data-resize="resize" :required="isRequired" :disabled="isDisabled" :readonly="isReadonly"
          :aria-invalid="!!error" :aria-describedby="describedBy" v-model="value"></textarea>
      </div>
      <p class="v-counter" v-if="isCounter" v-text="counterText"></p>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
function normalizeOptions(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? splitList(raw) : [];
  return list.map((item) => {
    if (item != null && typeof item === "object") {
      const source = item;
      const value = source.value ?? source.id ?? source.key ?? source.label ?? "";
      const label = source.label ?? source.text ?? source.name ?? source.title ?? value;
      return { value: String(value), label: String(label), disabled: flag(source.disabled) };
    }
    return { value: String(item), label: String(item), disabled: false };
  });
}
register("v-select", {
  inheritScope: true,
  props: {
    label: TEXT,
    placeholder: { type: "string", default: "Selecione" },
    searchPlaceholder: { type: "string", default: "Buscar..." },
    emptyText: { type: "string", default: "Nenhuma op\xE7\xE3o encontrada" },
    options: { type: "any", default: "" },
    value: { type: "any", default: "" },
    hint: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    size: { type: "string", default: "md" },
    multiple: BOOL,
    searchable: BOOL,
    clearable: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    const base = props.id || uid("v-select-");
    const initial = props.value;
    return {
      open: false,
      query: "",
      activeIndex: -1,
      selected: Array.isArray(initial) ? "" : initial == null ? "" : String(initial),
      selectedList: Array.isArray(initial) ? initial.map(String) : [],
      fieldId: base
    };
  },
  computed: {
    ...flags("multiple", "searchable", "clearable", "disabled", "required"),
    listId() {
      return `${this.fieldId}-list`;
    },
    labelId() {
      return `${this.fieldId}-label`;
    },
    hintId() {
      return `${this.fieldId}-hint`;
    },
    errorId() {
      return `${this.fieldId}-error`;
    },
    describedBy() {
      if (this.error) return this.errorId;
      if (this.hint) return this.hintId;
      return null;
    },
    allOptions() {
      return normalizeOptions(fromOuterScope(this, this.options) ?? this.options);
    },
    filtered() {
      const term = String(this.query ?? "").trim().toLowerCase();
      if (!term) return this.allOptions;
      return this.allOptions.filter(
        (option) => option.label.toLowerCase().includes(term)
      );
    },
    currentValue() {
      return flag(this.multiple) ? this.selectedList : this.selected;
    },
    hasSelection() {
      return flag(this.multiple) ? this.selectedList.length > 0 : this.selected !== "";
    },
    display() {
      if (!this.hasSelection) return this.placeholder;
      const labelOf = (value) => {
        const found = this.allOptions.find((option) => option.value === String(value));
        return found ? found.label : String(value);
      };
      if (flag(this.multiple)) return this.selectedList.map(labelOf).join(", ");
      return labelOf(this.selected);
    },
    activeId() {
      if (!this.open || this.activeIndex < 0) return null;
      if (this.activeIndex >= this.filtered.length) return null;
      return `${this.listId}-opt-${this.activeIndex}`;
    }
  },
  methods: {
    optionId(index) {
      return `${this.listId}-opt-${index}`;
    },
    isSelected(value) {
      if (flag(this.multiple)) return this.selectedList.indexOf(String(value)) > -1;
      return this.selected === String(value);
    },
    openList() {
      if (flag(this.disabled) || this.open) return;
      this.open = true;
      this.query = "";
      const index = this.filtered.findIndex((option) => this.isSelected(option.value));
      this.activeIndex = index > -1 ? index : 0;
      void nextTick(() => {
        const search = this.$refs.search;
        if (search) search.focus();
      });
    },
    closeList() {
      if (!this.open) return;
      this.open = false;
      this.activeIndex = -1;
    },
    closeAndFocus() {
      const wasOpen = this.open;
      this.closeList();
      if (!wasOpen) return;
      void nextTick(() => {
        const trigger2 = this.$refs.trigger;
        if (trigger2) trigger2.focus();
      });
    },
    toggleList() {
      if (this.open) this.closeAndFocus();
      else this.openList();
    },
    choose(option) {
      if (!option || option.disabled) return;
      if (flag(this.multiple)) {
        const list = [...this.selectedList];
        const index = list.indexOf(option.value);
        if (index > -1) list.splice(index, 1);
        else list.push(option.value);
        this.selectedList = list;
      } else {
        this.selected = option.value;
        this.closeAndFocus();
      }
      notify(this.$el);
      this.emit("change", this.currentValue);
    },
    clear() {
      this.selected = "";
      this.selectedList = [];
      notify(this.$el);
      this.emit("change", this.currentValue);
    },
    move(step) {
      const list = this.filtered;
      if (!list.length) return;
      let next = this.activeIndex + step;
      if (next < 0) next = list.length - 1;
      if (next >= list.length) next = 0;
      this.activeIndex = next;
    },
    onKey(event) {
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        this.closeAndFocus();
        return;
      }
      if (key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        if (!this.open) this.openList();
        else this.move(key === "ArrowDown" ? 1 : -1);
        return;
      }
      if (key === "Home" || key === "End") {
        if (!this.open) return;
        event.preventDefault();
        this.activeIndex = key === "Home" ? 0 : this.filtered.length - 1;
        return;
      }
      if (key === "Enter") {
        event.preventDefault();
        if (!this.open) this.openList();
        else this.choose(this.filtered[this.activeIndex]);
        return;
      }
      if (key === " " && !flag(this.searchable)) {
        event.preventDefault();
        this.toggleList();
        return;
      }
      if (key === "Tab" && this.open) this.closeList();
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.currentValue,
      set: (next) => {
        if (flag(this.multiple)) {
          this.selectedList = Array.isArray(next) ? next.map(String) : splitList(String(next ?? ""));
          return;
        }
        this.selected = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <div class="v-field" :data-error="!!error" :data-disabled="isDisabled">
      <label class="v-label" :id="labelId" v-if="label" v-click="openList">
        <span v-text="label"></span>
        <span class="v-req" v-if="isRequired" aria-hidden="true">*</span>
      </label>
      <div class="v-select" :class="{ 'is-open': open }" v-on:click.outside="closeList">
        <button type="button" class="v-select-trigger" :data-size="size" v-ref="trigger"
          :id="fieldId" :role="isSearchable ? 'button' : 'combobox'"
          aria-haspopup="listbox" :aria-expanded="open" :aria-controls="listId"
          :aria-labelledby="label ? labelId : null" :aria-describedby="describedBy"
          :aria-activedescendant="isSearchable ? null : activeId"
          :disabled="isDisabled" v-click="toggleList" v-keydown="onKey">
          <span class="v-select-value" :data-placeholder="!hasSelection" v-text="display"></span>
          <span class="v-clear" v-if="isClearable && hasSelection && !isDisabled"
            role="button" tabindex="0" aria-label="Limpar sele\xE7\xE3o"
            v-click.stop="clear" v-keydown.enter.stop="clear" v-html="svgIcon('x')"></span>
          <span class="v-select-arrow" aria-hidden="true" v-html="svgIcon('chevron-down')"></span>
        </button>
        <div class="v-select-pop" v-if="open">
          <div class="v-select-search" v-if="isSearchable">
            <input type="text" class="v-select-input" v-ref="search" v-model="query"
              role="combobox" aria-autocomplete="list" :aria-controls="listId"
              :aria-expanded="open" :aria-activedescendant="activeId"
              :placeholder="searchPlaceholder" aria-label="Buscar op\xE7\xE3o" v-keydown="onKey">
          </div>
          <ul class="v-select-list" :id="listId" role="listbox"
            :aria-multiselectable="isMultiple" :aria-labelledby="label ? labelId : null">
            <li v-for="(option, index) in filtered" :key="option.value" class="v-select-opt"
              :id="optionId(index)" role="option" :aria-selected="isSelected(option.value)"
              :aria-disabled="option.disabled"
              :class="{ 'is-active': index === activeIndex, 'is-selected': isSelected(option.value), 'is-disabled': option.disabled }"
              v-click="choose(option)" v-mouseenter="activeIndex = index">
              <span class="v-select-check" v-html="svgIcon('check')" aria-hidden="true"></span>
              <span v-text="option.label"></span>
            </li>
            <li class="v-select-empty" v-if="!filtered.length" v-text="emptyText"></li>
          </ul>
        </div>
      </div>
      <select class="v-native-hidden" tabindex="-1" aria-hidden="true" :name="name || null"
        :multiple="isMultiple" :required="isRequired" :disabled="isDisabled">
        <option v-for="option in allOptions" :key="option.value" :value="option.value"
          :selected="isSelected(option.value)" v-text="option.label"></option>
      </select>
      <p class="v-hint" :id="hintId" v-if="hint && !error" v-text="hint"></p>
      <p class="v-error-text" :id="errorId" v-if="error" role="alert" v-text="error"></p>
    </div>
  `
});
register("v-checkbox", {
  props: {
    label: TEXT,
    description: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    value: { type: "string", default: "on" },
    checked: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-check-") };
  },
  computed: {
    ...flags("checked", "disabled", "required")
  },
  methods: {
    onToggle(event) {
      const input = event.target;
      this.checked = input.checked;
      this.emit("change", input.checked);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => flag(this.checked),
      set: (next) => {
        this.checked = flag(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" :data-disabled="isDisabled" :data-error="!!error">
      <span class="v-check-slot">
        <input type="checkbox" class="v-check-native" :id="fieldId" :name="name || null"
          :value="value" :checked="isChecked" :disabled="isDisabled" :required="isRequired"
          :aria-invalid="!!error" v-input="onToggle">
        <span class="v-check-box" aria-hidden="true" v-html="svgIcon('check')"></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-radio", {
  props: {
    label: TEXT,
    description: TEXT,
    error: TEXT,
    name: TEXT,
    id: TEXT,
    value: { type: "string", default: "" },
    checked: BOOL,
    disabled: BOOL,
    required: BOOL
  },
  state(props) {
    return {
      fieldId: props.id || uid("v-radio-"),
      selected: flag(props.checked) ? String(props.value ?? "") : ""
    };
  },
  computed: {
    ...flags("disabled", "required"),
    isChecked() {
      return this.selected !== "" && this.selected === String(this.value ?? "");
    }
  },
  methods: {
    onPick() {
      this.selected = String(this.value ?? "");
      this.emit("change", this.selected);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.selected,
      set: (next) => {
        this.selected = next == null ? "" : String(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" data-shape="round"
      :data-disabled="isDisabled" :data-error="!!error">
      <span class="v-check-slot">
        <input type="radio" class="v-check-native" :id="fieldId" :name="name || null"
          :value="value" :checked="isChecked" :disabled="isDisabled" :required="isRequired"
          :aria-invalid="!!error" v-input="onPick">
        <span class="v-check-box" aria-hidden="true"><span class="v-radio-dot"></span></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-switch", {
  props: {
    label: TEXT,
    description: TEXT,
    name: TEXT,
    id: TEXT,
    size: { type: "string", default: "md" },
    checked: BOOL,
    disabled: BOOL
  },
  state(props) {
    return { fieldId: props.id || uid("v-switch-") };
  },
  computed: { ...flags("checked", "disabled") },
  methods: {
    onToggle(event) {
      const input = event.target;
      this.checked = input.checked;
      this.emit("change", input.checked);
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => flag(this.checked),
      set: (next) => {
        this.checked = flag(next);
      }
    });
  },
  template: `
    <label class="v-check" :for="fieldId" :data-size="size" :data-disabled="isDisabled">
      <span class="v-check-slot">
        <input type="checkbox" role="switch" class="v-check-native" :id="fieldId"
          :name="name || null" :checked="isChecked" :disabled="isDisabled"
          :aria-checked="isChecked" v-input="onToggle">
        <span class="v-switch-track" aria-hidden="true"><span class="v-switch-thumb"></span></span>
      </span>
      <span class="v-check-text">
        <slot></slot><span v-if="label" v-text="label"></span>
        <span class="v-check-desc" v-if="description" v-text="description"></span>
      </span>
    </label>
  `
});
register("v-badge", {
  props: {
    tone: { type: "string", default: "neutral" },
    variant: { type: "string", default: "soft" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    dot: BOOL
  },
  computed: { ...flags("dot") },
  template: `
    <span class="v-badge" :data-tone="tone" :data-variant="variant" :data-size="size">
      <span class="v-badge-dot" v-if="isDot" aria-hidden="true"></span>
      <span v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <span><slot></slot></span>
    </span>
  `
});
register("v-tag", {
  props: {
    tone: { type: "string", default: "neutral" },
    variant: { type: "string", default: "soft" },
    icon: TEXT,
    closable: BOOL,
    removeLabel: { type: "string", default: "Remover" }
  },
  computed: { ...flags("closable") },
  methods: {
    remove() {
      this.emit("remove", this.$el.textContent?.trim() ?? "");
    }
  },
  template: `
    <span class="v-tag v-badge" :data-tone="tone" :data-variant="variant" data-size="md"
      :data-closable="isClosable">
      <span v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <span><slot></slot></span>
      <button type="button" class="v-tag-close" v-if="isClosable" :aria-label="removeLabel"
        v-click="remove" v-html="svgIcon('x')"></button>
    </span>
  `
});
var ALERT_ICONS = {
  info: "info",
  primary: "info",
  success: "check",
  warning: "warning",
  danger: "alert",
  neutral: "info"
};
register("v-alert", {
  props: {
    tone: { type: "string", default: "info" },
    title: TEXT,
    icon: TEXT,
    closable: BOOL,
    closeLabel: { type: "string", default: "Fechar aviso" }
  },
  state() {
    return { visible: true };
  },
  computed: {
    ...flags("closable"),
    resolvedIcon() {
      if (this.icon === "none") return "";
      return this.icon || ALERT_ICONS[this.tone] || "info";
    },
    liveRole() {
      return this.tone === "danger" ? "alert" : "status";
    }
  },
  methods: {
    dismiss() {
      this.visible = false;
      this.emit("close");
    }
  },
  template: `
    <div class="v-alert" v-show="visible" :data-tone="tone" :role="liveRole">
      <span class="v-alert-icon" v-if="resolvedIcon" v-html="svgIcon(resolvedIcon)" aria-hidden="true"></span>
      <div class="v-alert-body">
        <p class="v-alert-title" v-if="title" v-text="title"></p>
        <div class="v-alert-text"><slot></slot></div>
      </div>
      <button type="button" class="v-alert-close" v-if="isClosable" :aria-label="closeLabel"
        v-click="dismiss" v-html="svgIcon('x')"></button>
    </div>
  `
});
var AVATAR_TONES = ["primary", "accent", "success", "warning", "danger", "info"];
register("v-avatar", {
  props: {
    name: TEXT,
    src: TEXT,
    alt: TEXT,
    size: { type: "string", default: "md" },
    shape: { type: "string", default: "circle" },
    status: TEXT
  },
  state() {
    return { failed: false };
  },
  computed: {
    initials() {
      const parts = String(this.name ?? "").trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return "?";
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },
    tone() {
      const text = String(this.name ?? "");
      let sum = 0;
      for (let i = 0; i < text.length; i++) sum = (sum + text.charCodeAt(i)) % 9973;
      return AVATAR_TONES[sum % AVATAR_TONES.length];
    },
    toneStyle() {
      return {
        background: `var(--v-${this.tone}-soft)`,
        color: `var(--v-${this.tone}-soft-text)`
      };
    },
    showImage() {
      return !!this.src && !this.failed;
    },
    imageAlt() {
      return this.alt || this.name || "Avatar";
    }
  },
  methods: {
    onError() {
      this.failed = true;
    }
  },
  template: `
    <span class="v-avatar" :data-size="size" :data-shape="shape" :style="toneStyle"
      :title="name || null">
      <img class="v-avatar-img" v-if="showImage" :src="src" :alt="imageAlt" v-on:error="onError">
      <span v-if="!showImage" aria-hidden="true" v-text="initials"></span>
      <span class="v-sr" v-if="!showImage && name" v-text="name"></span>
      <span class="v-avatar-status" v-if="status" :data-status="status"
        :aria-label="status" role="img"></span>
    </span>
  `
});
register("v-spinner", {
  props: {
    size: { type: "string", default: "md" },
    tone: { type: "string", default: "primary" },
    label: { type: "string", default: "Carregando" }
  },
  template: `
    <span class="v-spinner" :data-size="size" :data-tone="tone" role="status"
      :aria-label="label"></span>
  `
});
register("v-skeleton", {
  props: {
    width: { type: "string", default: "100%" },
    height: { type: "string", default: "14px" },
    radius: TEXT,
    lines: { type: "number", default: 1 },
    circle: BOOL
  },
  computed: {
    ...flags("circle"),
    count() {
      const value = Number(this.lines);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    },
    boxStyle() {
      const style = { width: this.width, height: this.height };
      if (this.radius) style.borderRadius = this.radius;
      if (flag(this.circle)) style.width = style.height = this.height;
      return style;
    },
    lastStyle() {
      return { ...this.boxStyle, width: "62%" };
    }
  },
  template: `
    <div class="v-skeleton-stack" role="status" aria-label="Carregando conte\xFAdo" aria-busy="true">
      <span class="v-skeleton" v-for="index in count" :key="index" :data-circle="isCircle"
        :style="index === count && count > 1 ? lastStyle : boxStyle"></span>
    </div>
  `
});
register("v-progress", {
  props: {
    value: { type: "number", default: 0 },
    max: { type: "number", default: 100 },
    tone: { type: "string", default: "primary" },
    size: { type: "string", default: "md" },
    label: TEXT,
    showValue: BOOL,
    indeterminate: BOOL
  },
  computed: {
    ...flags("showValue", "indeterminate"),
    percent() {
      const max = Number(this.max) || 100;
      const value = Number(this.value) || 0;
      const ratio = value / max * 100;
      return Math.min(100, Math.max(0, Math.round(ratio * 10) / 10));
    },
    barStyle() {
      return { width: `${this.percent}%` };
    },
    percentText() {
      return `${Math.round(this.percent)}%`;
    }
  },
  template: `
    <div class="v-progress" :data-tone="tone" :data-size="size" :data-indeterminate="isIndeterminate">
      <div class="v-progress-head" v-if="label || isShowValue">
        <span v-text="label"></span>
        <span class="v-progress-value" v-if="isShowValue" v-text="percentText"></span>
      </div>
      <div class="v-progress-track" role="progressbar" :aria-label="label || 'Progresso'"
        :aria-valuenow="isIndeterminate ? null : percent" aria-valuemin="0" aria-valuemax="100">
        <div class="v-progress-bar" :style="barStyle"></div>
      </div>
    </div>
  `
});
register("v-divider", {
  props: {
    label: TEXT,
    vertical: BOOL,
    spacing: TEXT
  },
  computed: {
    ...flags("vertical"),
    spacingStyle() {
      if (!this.spacing) return {};
      return flag(this.vertical) ? { margin: `0 ${this.spacing}` } : { margin: `${this.spacing} 0` };
    }
  },
  template: `
    <div class="v-divider" role="separator" :data-vertical="isVertical" :data-label="!!label"
      :aria-orientation="isVertical ? 'vertical' : 'horizontal'" :style="spacingStyle">
      <span v-if="label" v-text="label"></span>
    </div>
  `
});
function parseColumns(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        const key2 = String(source.key ?? source.field ?? source.name ?? "");
        return {
          key: key2,
          label: String(source.label ?? source.title ?? titleCase(key2)),
          align: String(source.align ?? "left"),
          sortable: source.sortable === void 0 ? true : flag(source.sortable)
        };
      }
      const key = String(item);
      return { key, label: titleCase(key), align: "left", sortable: true };
    });
  }
  if (typeof raw !== "string") return [];
  return splitList(raw).map((spec) => {
    const parts = spec.split(":").map((part) => part.trim());
    const key = parts[0];
    return {
      key,
      label: parts[1] || titleCase(key),
      align: parts[2] || "left",
      sortable: parts[3] !== "fixed"
    };
  });
}
register("v-table", {
  inheritScope: true,
  props: {
    columns: { type: "any", default: "" },
    rows: { type: "any", default: "" },
    empty: { type: "string", default: "Nenhum registro encontrado" },
    sortable: { type: "any", default: true },
    dense: BOOL,
    striped: BOOL,
    hover: { type: "any", default: true },
    caption: TEXT
  },
  state() {
    return { sortKey: "", sortDir: "asc" };
  },
  computed: {
    ...flags("dense", "striped"),
    isSortable() {
      return this.sortable === true || flag(this.sortable);
    },
    isHover() {
      return this.hover === true || flag(this.hover);
    },
    cols() {
      return parseColumns(fromOuterScope(this, this.columns) ?? this.columns);
    },
    allRows() {
      const source = fromOuterScope(this, this.rows) ?? this.rows;
      return Array.isArray(source) ? source : [];
    },
    sorted() {
      const key = this.sortKey;
      if (!key || !this.isSortable) return this.allRows;
      const factor = this.sortDir === "desc" ? -1 : 1;
      return [...this.allRows].sort((a, b) => {
        const left = get(a, key);
        const right = get(b, key);
        if (left == null && right == null) return 0;
        if (left == null) return -factor;
        if (right == null) return factor;
        if (typeof left === "number" && typeof right === "number") {
          return (left - right) * factor;
        }
        return String(left).localeCompare(String(right), exports.config.locale, { numeric: true }) * factor;
      });
    }
  },
  methods: {
    cell(row, column) {
      const value = get(row, column.key);
      if (value === null || value === void 0) return "";
      return String(value);
    },
    ariaSort(column) {
      if (!this.isSortable || !column.sortable) return null;
      if (this.sortKey !== column.key) return "none";
      return this.sortDir === "asc" ? "ascending" : "descending";
    },
    canSort(column) {
      return this.isSortable && column.sortable;
    },
    arrowFor(column) {
      if (this.sortKey !== column.key) return "chevron-down";
      return this.sortDir === "asc" ? "chevron-up" : "chevron-down";
    },
    toggleSort(column) {
      if (!this.canSort(column)) return;
      if (this.sortKey === column.key) {
        this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
      } else {
        this.sortKey = column.key;
        this.sortDir = "asc";
      }
      this.emit("sort", { key: this.sortKey, direction: this.sortDir });
    },
    alignStyle(column) {
      return { textAlign: column.align };
    }
  },
  template: `
    <div class="v-table-wrap">
      <table class="v-table" :data-dense="isDense" :data-striped="isStriped" :data-hover="isHover">
        <caption class="v-sr" v-if="caption" v-text="caption"></caption>
        <thead>
          <tr>
            <th v-for="column in cols" :key="column.key" :style="alignStyle(column)"
              scope="col" :aria-sort="ariaSort(column)">
              <button type="button" class="v-th" :data-sortable="canSort(column)"
                :aria-sort="ariaSort(column)" :disabled="!canSort(column)" v-click="toggleSort(column)">
                <span v-text="column.label"></span>
                <span class="v-th-arrow" v-if="canSort(column)" v-html="svgIcon(arrowFor(column))"></span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in sorted" :key="index">
            <td v-for="column in cols" :key="column.key" :style="alignStyle(column)"
              v-text="cell(row, column)"></td>
          </tr>
          <tr v-if="!sorted.length">
            <td class="v-table-empty" :colspan="cols.length || 1" v-text="empty"></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
});
register("v-pagination", {
  props: {
    page: { type: "number", default: 1 },
    pages: { type: "number", default: 1 },
    total: { type: "number", default: 0 },
    perPage: { type: "number", default: 10 },
    siblings: { type: "number", default: 1 },
    previousLabel: { type: "string", default: "Anterior" },
    nextLabel: { type: "string", default: "Pr\xF3xima" },
    ariaLabel: { type: "string", default: "Pagina\xE7\xE3o" }
  },
  computed: {
    lastPage() {
      const declared = Number(this.pages) || 0;
      if (declared > 0) return declared;
      const total = Number(this.total) || 0;
      const perPage = Number(this.perPage) || 10;
      return Math.max(1, Math.ceil(total / perPage));
    },
    currentPage() {
      const value = Number(this.page) || 1;
      return Math.min(Math.max(1, Math.round(value)), this.lastPage);
    },
    /** Numeros visiveis, com `0` marcando as reticencias. */
    items() {
      const last = this.lastPage;
      const current2 = this.currentPage;
      const siblings = Math.max(0, Number(this.siblings) || 0);
      const window2 = siblings * 2 + 5;
      if (last <= window2) return Array.from({ length: last }, (_, i) => i + 1);
      const out = [1];
      const start2 = Math.max(2, current2 - siblings);
      const end = Math.min(last - 1, current2 + siblings);
      if (start2 > 2) out.push(0);
      for (let page = start2; page <= end; page++) out.push(page);
      if (end < last - 1) out.push(0);
      out.push(last);
      return out;
    }
  },
  methods: {
    go(page) {
      const target = Math.min(Math.max(1, page), this.lastPage);
      if (target === this.currentPage) return;
      this.page = target;
      notify(this.$el);
      this.emit("change", target);
    },
    isCurrent(page) {
      return page === this.currentPage ? "page" : null;
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.currentPage,
      set: (next) => {
        const value = Number(next);
        this.page = Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
      }
    });
  },
  template: `
    <nav class="v-pagination" :aria-label="ariaLabel">
      <button type="button" class="v-page" :disabled="currentPage <= 1"
        :aria-label="previousLabel" v-click="go(currentPage - 1)" v-html="svgIcon('chevron-left')"></button>
      <template v-for="(item, index) in items" :key="index">
        <span class="v-page-gap" v-if="item === 0" aria-hidden="true">...</span>
        <button type="button" class="v-page" v-if="item !== 0" :aria-current="isCurrent(item)"
          :aria-label="'P\xE1gina ' + item" v-click="go(item)" v-text="item"></button>
      </template>
      <button type="button" class="v-page" :disabled="currentPage >= lastPage"
        :aria-label="nextLabel" v-click="go(currentPage + 1)" v-html="svgIcon('chevron-right')"></button>
    </nav>
  `
});
function parseCrumbs(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        return {
          label: String(source.label ?? source.text ?? source.title ?? ""),
          href: String(source.href ?? source.url ?? source.to ?? "")
        };
      }
      return { label: String(item), href: "" };
    });
  }
  if (typeof raw !== "string") return [];
  return splitList(raw).map((spec) => {
    const separator = spec.indexOf(":");
    if (separator === -1) return { label: spec, href: "" };
    return { label: spec.slice(0, separator).trim(), href: spec.slice(separator + 1).trim() };
  });
}
register("v-breadcrumb", {
  inheritScope: true,
  props: {
    items: { type: "any", default: "" },
    separator: { type: "string", default: "/" },
    ariaLabel: { type: "string", default: "Trilha de navega\xE7\xE3o" }
  },
  computed: {
    crumbs() {
      return parseCrumbs(fromOuterScope(this, this.items) ?? this.items);
    }
  },
  methods: {
    isLast(index) {
      return index === this.crumbs.length - 1;
    }
  },
  template: `
    <nav class="v-breadcrumb" :aria-label="ariaLabel">
      <ol class="v-breadcrumb-list">
        <li class="v-breadcrumb-item" v-for="(crumb, index) in crumbs" :key="index"
          :aria-current="isLast(index) ? 'page' : null">
          <a v-if="crumb.href && !isLast(index)" :href="crumb.href" v-text="crumb.label"></a>
          <span v-if="!crumb.href || isLast(index)" v-text="crumb.label"></span>
          <span class="v-breadcrumb-sep" v-if="!isLast(index)" aria-hidden="true" v-text="separator"></span>
        </li>
      </ol>
    </nav>
  `
});
register("v-stat", {
  props: {
    label: TEXT,
    value: TEXT,
    delta: { type: "any", default: "" },
    hint: TEXT,
    icon: TEXT,
    suffix: { type: "string", default: "%" },
    /** Quando `true`, uma variacao negativa e considerada positiva. */
    inverted: BOOL
  },
  computed: {
    ...flags("inverted"),
    deltaNumber() {
      if (this.delta === "" || this.delta === null || this.delta === void 0) return null;
      const value = Number(String(this.delta).replace(",", ".").replace("%", ""));
      return Number.isFinite(value) ? value : null;
    },
    hasDelta() {
      return this.deltaNumber !== null;
    },
    direction() {
      const value = this.deltaNumber;
      if (value === null || value === 0) return "flat";
      const positive = value > 0;
      const good = flag(this.inverted) ? !positive : positive;
      return good ? "up" : "down";
    },
    deltaIcon() {
      const value = this.deltaNumber;
      if (value === null || value === 0) return "minus";
      return value > 0 ? "arrow-up" : "arrow-down";
    },
    deltaText() {
      const value = this.deltaNumber;
      if (value === null) return "";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value}${this.suffix}`;
    }
  },
  template: `
    <div class="v-stat">
      <span class="v-stat-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <div class="v-stat-body">
        <div class="v-stat-label" v-text="label"></div>
        <div class="v-stat-value" v-text="value"></div>
        <div class="v-stat-row" v-if="hasDelta || hint">
          <span class="v-stat-delta" v-if="hasDelta" :data-dir="direction">
            <span v-html="svgIcon(deltaIcon)" aria-hidden="true"></span>
            <span v-text="deltaText"></span>
          </span>
          <span class="v-stat-hint" v-if="hint" v-text="hint"></span>
        </div>
        <div class="v-stat-row"><slot></slot></div>
      </div>
    </div>
  `
});
register("v-empty-state", {
  props: {
    icon: { type: "string", default: "inbox" },
    title: { type: "string", default: "Nada por aqui" },
    description: TEXT
  },
  template: `
    <div class="v-empty">
      <span class="v-empty-icon" v-if="icon" v-html="svgIcon(icon)" aria-hidden="true"></span>
      <h3 class="v-empty-title" v-text="title"></h3>
      <p class="v-empty-desc" v-if="description" v-text="description"></p>
      <div class="v-empty-actions"><slot></slot></div>
    </div>
  `
});
function parseTimeline(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item != null && typeof item === "object") {
        const source = item;
        return {
          title: String(source.title ?? source.label ?? ""),
          description: String(source.description ?? source.text ?? ""),
          time: String(source.time ?? source.date ?? ""),
          tone: String(source.tone ?? "primary")
        };
      }
      return { title: String(item), description: "", time: "", tone: "primary" };
    });
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const parts = entry.split("|").map((part) => part.trim());
    return {
      title: parts[0] ?? "",
      description: parts[1] ?? "",
      time: parts[2] ?? "",
      tone: parts[3] || "primary"
    };
  });
}
register("v-timeline", {
  inheritScope: true,
  props: {
    items: { type: "any", default: "" }
  },
  computed: {
    entries() {
      return parseTimeline(fromOuterScope(this, this.items) ?? this.items);
    }
  },
  template: `
    <ol class="v-timeline">
      <li class="v-timeline-item" v-for="(entry, index) in entries" :key="index" :data-tone="entry.tone">
        <span class="v-timeline-rail" aria-hidden="true"><span class="v-timeline-dot"></span></span>
        <div class="v-timeline-body">
          <div class="v-timeline-title" v-text="entry.title"></div>
          <p class="v-timeline-desc" v-if="entry.description" v-text="entry.description"></p>
          <time class="v-timeline-time" v-if="entry.time" v-text="entry.time"></time>
        </div>
      </li>
      <li class="v-timeline-item" v-if="!entries.length">
        <span class="v-timeline-rail" aria-hidden="true"><span class="v-timeline-dot"></span></span>
        <div class="v-timeline-body"><slot></slot></div>
      </li>
    </ol>
  `
});
register("v-steps", {
  inheritScope: true,
  props: {
    steps: { type: "any", default: "" },
    current: { type: "number", default: 0 },
    vertical: BOOL,
    ariaLabel: { type: "string", default: "Etapas" }
  },
  computed: {
    ...flags("vertical"),
    list() {
      const source = fromOuterScope(this, this.steps) ?? this.steps;
      if (Array.isArray(source)) {
        return source.map(
          (item) => item != null && typeof item === "object" ? String(item.label ?? item.title ?? "") : String(item)
        );
      }
      return typeof source === "string" ? splitList(source) : [];
    },
    currentIndex() {
      const value = Number(this.current);
      return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    }
  },
  methods: {
    stateOf(index) {
      if (index < this.currentIndex) return "done";
      if (index === this.currentIndex) return "current";
      return "todo";
    }
  },
  template: `
    <ol class="v-steps" :data-vertical="isVertical" :aria-label="ariaLabel">
      <li class="v-step" v-for="(step, index) in list" :key="index" :data-state="stateOf(index)"
        :aria-current="index === currentIndex ? 'step' : null">
        <span class="v-step-line" aria-hidden="true"></span>
        <span class="v-step-mark" aria-hidden="true">
          <span v-if="stateOf(index) === 'done'" v-html="svgIcon('check')"></span>
          <span v-if="stateOf(index) !== 'done'" v-text="index + 1"></span>
        </span>
        <span class="v-step-text"><span class="v-step-label" v-text="step"></span></span>
      </li>
    </ol>
  `
});
register("v-rating", {
  props: {
    value: { type: "number", default: 0 },
    max: { type: "number", default: 5 },
    size: { type: "string", default: "md" },
    label: { type: "string", default: "Avalia\xE7\xE3o" },
    readonly: BOOL,
    disabled: BOOL,
    showValue: BOOL,
    allowClear: { type: "any", default: true }
  },
  state() {
    return { hovered: 0 };
  },
  computed: {
    ...flags("readonly", "disabled", "showValue"),
    locked() {
      return flag(this.readonly) || flag(this.disabled);
    },
    total() {
      const value = Number(this.max);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
    },
    score() {
      const value = Number(this.value);
      return Number.isFinite(value) ? Math.min(Math.max(0, value), this.total) : 0;
    },
    shown() {
      return this.hovered > 0 ? this.hovered : this.score;
    },
    valueText() {
      return `${this.score} de ${this.total}`;
    }
  },
  methods: {
    isOn(index) {
      return index <= this.shown;
    },
    pick(index) {
      if (this.locked) return;
      const clears = this.allowClear === true || flag(this.allowClear);
      const next = clears && this.score === index ? 0 : index;
      this.value = next;
      this.hovered = 0;
      notify(this.$el);
      this.emit("change", next);
    },
    preview(index) {
      if (this.locked) return;
      this.hovered = index;
    },
    reset() {
      this.hovered = 0;
    },
    onKey(event) {
      if (this.locked) return;
      const key = event.key;
      if (key === "ArrowRight" || key === "ArrowUp") {
        event.preventDefault();
        this.pick(Math.min(this.total, this.score + 1));
      } else if (key === "ArrowLeft" || key === "ArrowDown") {
        event.preventDefault();
        this.pick(Math.max(0, this.score - 1));
      } else if (key === "Home") {
        event.preventDefault();
        this.pick(1);
      } else if (key === "End") {
        event.preventDefault();
        this.pick(this.total);
      }
    }
  },
  beforeMount() {
    hostModel(this, {
      get: () => this.score,
      set: (next) => {
        const value = Number(next);
        this.value = Number.isFinite(value) ? value : 0;
      }
    });
  },
  template: `
    <div class="v-rating" :data-size="size" role="slider" :aria-label="label"
      aria-valuemin="0" :aria-valuemax="total" :aria-valuenow="score" :aria-valuetext="valueText"
      :tabindex="locked ? -1 : 0" :aria-readonly="locked" v-keydown="onKey" v-mouseleave="reset">
      <span class="v-rating-stars">
        <button type="button" class="v-star" v-for="index in total" :key="index"
          :data-on="isOn(index)" :disabled="locked" :aria-label="index + ' de ' + total"
          :tabindex="-1" v-click="pick(index)" v-mouseenter="preview(index)"
          v-html="svgIcon('star')"></button>
      </span>
      <span class="v-rating-value" v-if="isShowValue" v-text="valueText"></span>
    </div>
  `
});
register("v-tooltip-button", {
  props: {
    tooltip: TEXT,
    placement: { type: "string", default: "top" },
    variant: { type: "string", default: "ghost" },
    size: { type: "string", default: "md" },
    icon: TEXT,
    type: { type: "string", default: "button" },
    disabled: BOOL,
    ariaLabel: TEXT
  },
  state() {
    return { tipId: uid("v-tip-") };
  },
  computed: {
    ...flags("disabled"),
    accessibleName() {
      return this.ariaLabel || null;
    }
  },
  template: `
    <span class="v-tipwrap">
      <button class="v-btn" :type="type" :data-variant="variant" :data-size="size"
        :disabled="isDisabled" :aria-describedby="tooltip ? tipId : null" :aria-label="accessibleName">
        <span class="v-btn-ic" v-if="icon" v-html="svgIcon(icon)"></span>
        <span class="v-btn-label"><slot></slot></span>
      </button>
      <span class="v-tip" v-if="tooltip" :id="tipId" role="tooltip"
        :data-placement="placement" v-text="tooltip"></span>
    </span>
  `
});
async function copyText2(text) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const holder = document.createElement("textarea");
    holder.value = text;
    holder.setAttribute("readonly", "");
    holder.style.position = "fixed";
    holder.style.opacity = "0";
    document.body.appendChild(holder);
    holder.select();
    const ok = document.execCommand("copy");
    holder.remove();
    return ok;
  } catch {
    return false;
  }
}
register("v-code-block", {
  props: {
    code: TEXT,
    language: TEXT,
    filename: TEXT,
    copyLabel: { type: "string", default: "Copiar" },
    copiedLabel: { type: "string", default: "Copiado" },
    wrap: BOOL
  },
  state() {
    return { copied: false };
  },
  computed: {
    ...flags("wrap"),
    header() {
      return this.filename || this.language || "";
    },
    buttonLabel() {
      return this.copied ? this.copiedLabel : this.copyLabel;
    },
    buttonIcon() {
      return this.copied ? "check" : "copy";
    }
  },
  methods: {
    async copy() {
      const holder = this.$refs.code;
      const text = this.code || holder?.textContent || "";
      const ok = await copyText2(String(text));
      if (!ok) return;
      this.copied = true;
      this.emit("copy", text);
      setTimeout(() => {
        this.copied = false;
      }, 1800);
    }
  },
  template: `
    <div class="v-code" :data-wrap="isWrap">
      <div class="v-code-head">
        <span class="v-code-name" v-text="header"></span>
        <button type="button" class="v-code-copy" :data-copied="copied"
          :aria-label="buttonLabel" v-click="copy">
          <span v-html="svgIcon(buttonIcon)" aria-hidden="true"></span>
          <span v-text="buttonLabel"></span>
        </button>
      </div>
      <pre class="v-code-pre"><code v-ref="code" :class="language ? 'language-' + language : null"
        v-text="code"><slot></slot></code></pre>
    </div>
  `
});

// src/ui/dialog.ts
init_style();
init_registry();
var labels = {
  confirm: "Confirmar",
  cancel: "Cancelar",
  ok: "OK",
  close: "Fechar",
  confirmQuestion: "Tem certeza?",
  required: "Preencha este campo."
};
var settings3 = {
  /** Duracao da animacao de entrada e saida, em milissegundos. */
  duration: 220,
  /** Tamanho padrao dos dialogos criados por `dialog()`. */
  size: "md"
};
var CSS6 = `
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
function ensureStyles4() {
  ensureTokens();
  ensurePalette();
  injectStyle("dialog", CSS6);
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
var listening2 = false;
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
function startListening2() {
  if (listening2) return;
  listening2 = true;
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("focusin", onFocusIn, true);
}
function stopListening() {
  if (!listening2) return;
  listening2 = false;
  document.removeEventListener("keydown", onKeydown, true);
  document.removeEventListener("focusin", onFocusIn, true);
}
function openDialog(request2) {
  ensureStyles4();
  const id = uid("v-dialog-");
  const duration = reducedMotion() ? 0 : settings3.duration;
  const root = document.createElement("div");
  root.className = "v-dialog-root";
  root.id = id;
  root.setAttribute("data-size", request2.size ?? settings3.size);
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
  const closed = new Promise((resolve3) => {
    resolveClosed = resolve3;
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
          if (source.hasAttribute(`${exports.config.prefix}modal-content`) || source.hasAttribute("data-v-modal-content")) {
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
  startListening2();
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
  /** Abre um elemento da pagina como modal. Aceita seletor ou o proprio elemento. */
  open(target, options = {}) {
    const element = resolveTarget2(target);
    if (!element) {
      console.warn(`[Voodoo] modal.open: alvo nao encontrado (${String(target)}).`);
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
  /** Fecha o modal indicado, ou o que estiver no topo da pilha. */
  close(target, result) {
    if (target === void 0) {
      top()?.handle.close(result);
      return;
    }
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    entry?.handle.close(result);
  },
  /** Fecha todos os dialogos abertos, do topo para a base. */
  closeAll(result) {
    for (const entry of [...stack].reverse()) entry.handle.close(result);
  },
  /** Abre se estiver fechado, fecha se estiver aberto. */
  toggle(target, options = {}) {
    const key = keyOf(target);
    const entry = key ? findByKey(key) : void 0;
    if (entry) {
      entry.handle.close(void 0);
      return null;
    }
    return this.open(target, options);
  },
  /** Informa se um modal especifico, ou qualquer um, esta aberto. */
  isOpen(target) {
    if (target === void 0) return stack.length > 0;
    const key = keyOf(target);
    return !!(key && findByKey(key));
  },
  /** Dialogos abertos, do mais antigo ao mais recente. */
  get opened() {
    return stack.map((entry) => entry.handle);
  },
  /** Quantidade de dialogos abertos. */
  get count() {
    return stack.length;
  },
  /** Ajusta duracao da animacao e tamanho padrao. */
  configure(options) {
    Object.assign(settings3, options);
  },
  /** Troca os textos padrao dos botoes. */
  labels(next) {
    Object.assign(labels, next);
    return labels;
  }
};
function dialog(options) {
  ensureStyles4();
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
  return new Promise((resolve3) => {
    const handle = openDialog({
      ...options,
      content: fragment,
      role: options.tone === "danger" ? "alertdialog" : "dialog",
      labelledBy: titleId,
      describedBy: descId,
      key: null,
      onClose(result) {
        options.onClose?.(result, handle);
        resolve3(result === void 0 ? null : result);
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
  ensureStyles4();
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
    ensureStyles4();
    if (!el.id) el.id = uid("v-modal-");
    if (!el.classList.contains("v-dialog-open")) el.setAttribute("hidden", "");
  },
  { priority: exports.PRIORITY.REF }
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
      const title = readAttr(el, `${exports.config.prefix}confirm-title`) ?? void 0;
      const confirmLabel = readAttr(el, `${exports.config.prefix}confirm-label`) ?? void 0;
      const cancelLabel = readAttr(el, `${exports.config.prefix}confirm-cancel`) ?? void 0;
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
  { priority: exports.PRIORITY.REF }
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
    warn(`${exports.config.prefix}${directive2} so funciona em input ou textarea.`);
    return null;
  }
  const input = el;
  const type = (input.getAttribute("type") || "text").toLowerCase();
  if (type === "number" || type === "range" || type === "date" || type === "color") {
    warn(`${exports.config.prefix}${directive2} nao combina com input type="${type}". Use type="text".`);
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
      warn(`${exports.config.prefix}mask precisa de um padrao ou do nome de uma mascara.`);
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
  { priority: exports.PRIORITY.MODEL + 5 }
);
defineDirective(
  "mask-currency",
  ({ el, expression, modifiers, cleanup }) => {
    const input = maskableInput(el, "mask-currency");
    if (!input) return;
    const attr2 = (name) => el.getAttribute(`${exports.config.prefix}${name}`) ?? el.getAttribute(`data-v-${name}`);
    const rawDecimals = (typeof modifiers.decimals === "string" ? modifiers.decimals : null) ?? attr2("mask-decimals");
    const decimals = rawDecimals !== null && rawDecimals !== "" ? Number(rawDecimals) : 2;
    const options = {
      prefix: modifiers.plain ? "" : expression.trim() || attr2("mask-prefix") || "R$ ",
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
  { priority: exports.PRIORITY.MODEL + 5 }
);

// src/devtools/xray.ts
init_registry();
init_style();
var FLASH_CLASS = "v-xray-flash";
var MAX_LOG = 200;
var MAX_OUTLINES = 400;
var enabled = false;
var shortcutInstalled = false;
var refs = null;
var activeTab = "estado";
var theme2 = "auto";
var eventLog = [];
var networkLog = [];
var patchedEffects = /* @__PURE__ */ new Map();
var flashing = /* @__PURE__ */ new Set();
var flashTimers = /* @__PURE__ */ new Map();
var outlined = [];
var requestStarts = /* @__PURE__ */ new WeakMap();
var metrics = {
  effects: 0,
  mutations: 0,
  effectsPerSecond: 0,
  updatesPerSecond: 0,
  history: []
};
var disposers = [];
var refreshTimer = 0;
var metricsTimer = 0;
var scanTimer = 0;
var frameRequest = 0;
var hoverTarget = null;
var XRAY_CSS = `
.v-xray-root{
  all: initial;
  --vx-accent:#6D3BF5;
  --vx-accent-2:#FF3D8B;
  --vx-bg:#ffffff;
  --vx-bg-2:#F6F3FC;
  --vx-text:#14111F;
  --vx-muted:#6B6580;
  --vx-border:#E6E0F0;
  --vx-shadow:0 12px 40px rgba(20,17,31,.22);
  position:fixed;
  inset:0;
  z-index:2147483000;
  pointer-events:none;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:12px;
  line-height:1.45;
  color:var(--vx-text);
  -webkit-font-smoothing:antialiased;
}
@media (prefers-color-scheme: dark){
  .v-xray-root:not([data-v-xray-theme="light"]){
    --vx-bg:#1C1830;
    --vx-bg-2:#14111F;
    --vx-text:#F4F1FB;
    --vx-muted:#A9A2C4;
    --vx-border:#332C50;
    --vx-shadow:0 12px 40px rgba(0,0,0,.55);
  }
}
.v-xray-root[data-v-xray-theme="dark"]{
  --vx-bg:#1C1830;
  --vx-bg-2:#14111F;
  --vx-text:#F4F1FB;
  --vx-muted:#A9A2C4;
  --vx-border:#332C50;
  --vx-shadow:0 12px 40px rgba(0,0,0,.55);
}
.v-xray-root *,.v-xray-root *::before,.v-xray-root *::after{
  box-sizing:border-box;
  margin:0;
  padding:0;
  border:0;
  outline:0;
  background:transparent;
  font:inherit;
  color:inherit;
  text-align:left;
  text-transform:none;
  letter-spacing:normal;
  list-style:none;
  text-decoration:none;
  min-width:0;
  float:none;
}
.v-xray-box{
  position:absolute;
  border:1px dashed rgba(109,59,245,.85);
  border-radius:4px;
  background:rgba(109,59,245,.06);
  pointer-events:none;
}
.v-xray-box[data-kind="component"]{
  border-color:rgba(46,217,165,.9);
  background:rgba(46,217,165,.07);
}
.v-xray-tag{
  position:absolute;
  top:-16px;
  left:-1px;
  max-width:280px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  padding:1px 5px;
  border-radius:4px;
  background:#6D3BF5;
  color:#fff;
  font-size:10px;
  font-weight:600;
}
.v-xray-box[data-kind="component"] .v-xray-tag{background:#159C77}
.v-xray-card{
  position:absolute;
  display:none;
  width:320px;
  max-height:60vh;
  overflow:auto;
  padding:10px 12px;
  border:1px solid var(--vx-border);
  border-radius:10px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:none;
}
.v-xray-card[data-open="1"]{display:block}
.v-xray-card-title{
  display:block;
  margin-bottom:6px;
  font-size:12px;
  font-weight:700;
  color:var(--vx-accent);
}
.v-xray-section{
  display:block;
  margin-top:8px;
  padding-top:6px;
  border-top:1px solid var(--vx-border);
  font-size:10px;
  font-weight:700;
  text-transform:uppercase;
  color:var(--vx-muted);
}
.v-xray-panel{
  position:absolute;
  right:16px;
  bottom:16px;
  display:flex;
  flex-direction:column;
  width:400px;
  max-width:calc(100vw - 32px);
  max-height:70vh;
  border:1px solid var(--vx-border);
  border-radius:12px;
  background:var(--vx-bg);
  box-shadow:var(--vx-shadow);
  pointer-events:auto;
  overflow:hidden;
}
.v-xray-header{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 10px;
  border-bottom:1px solid var(--vx-border);
  background:var(--vx-bg-2);
}
.v-xray-brand{
  flex:1;
  font-size:12px;
  font-weight:700;
  letter-spacing:.02em;
}
.v-xray-dot{
  display:inline-block;
  width:8px;
  height:8px;
  margin-right:6px;
  border-radius:50%;
  background:linear-gradient(135deg,#6D3BF5,#FF3D8B);
}
.v-xray-btn{
  padding:3px 8px;
  border:1px solid var(--vx-border);
  border-radius:6px;
  background:var(--vx-bg);
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-btn:hover{color:var(--vx-text);border-color:var(--vx-accent)}
.v-xray-tabs{
  display:flex;
  flex-wrap:wrap;
  gap:2px;
  padding:6px 8px;
  border-bottom:1px solid var(--vx-border);
}
.v-xray-tab{
  padding:3px 8px;
  border-radius:99px;
  color:var(--vx-muted);
  font-size:11px;
  cursor:pointer;
}
.v-xray-tab:hover{color:var(--vx-text)}
.v-xray-tab[data-active="1"]{
  background:var(--vx-accent);
  color:#fff;
  font-weight:600;
}
.v-xray-body{
  flex:1;
  overflow:auto;
  padding:8px 10px 12px;
}
.v-xray-status{
  padding:5px 10px;
  border-top:1px solid var(--vx-border);
  background:var(--vx-bg-2);
  color:var(--vx-muted);
  font-size:10px;
}
.v-xray-group{
  display:block;
  margin-bottom:8px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  overflow:hidden;
}
.v-xray-group-head{
  display:flex;
  align-items:center;
  gap:6px;
  padding:5px 8px;
  background:var(--vx-bg-2);
  font-size:11px;
  font-weight:600;
  cursor:pointer;
}
.v-xray-badge{
  padding:0 5px;
  border-radius:99px;
  background:var(--vx-accent);
  color:#fff;
  font-size:9px;
  font-weight:700;
}
.v-xray-badge[data-tone="alt"]{background:var(--vx-accent-2)}
.v-xray-badge[data-tone="mute"]{background:var(--vx-muted)}
.v-xray-rows{display:block;padding:4px 8px 6px}
.v-xray-row{
  display:flex;
  align-items:center;
  gap:6px;
  padding:2px 0;
}
.v-xray-key{
  flex:0 0 38%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  color:var(--vx-muted);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-val{
  flex:1;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
}
.v-xray-input{
  flex:1;
  padding:2px 5px;
  border:1px solid var(--vx-border);
  border-radius:5px;
  background:var(--vx-bg-2);
  color:var(--vx-text);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
  cursor:text;
}
.v-xray-input:focus{border-color:var(--vx-accent)}
.v-xray-input[data-error="1"]{border-color:#FF4D4D}
.v-xray-empty{
  display:block;
  padding:14px 4px;
  color:var(--vx-muted);
  text-align:center;
}
.v-xray-log{
  display:flex;
  gap:6px;
  padding:3px 4px;
  border-bottom:1px solid var(--vx-border);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:10px;
}
.v-xray-log-time{flex:0 0 58px;color:var(--vx-muted)}
.v-xray-log-main{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v-xray-ok{color:#159C77}
.v-xray-fail{color:#FF4D4D}
.v-xray-metric{
  display:flex;
  align-items:baseline;
  gap:8px;
  padding:4px 0;
}
.v-xray-metric-value{font-size:20px;font-weight:700;color:var(--vx-accent)}
.v-xray-chart{
  display:flex;
  align-items:flex-end;
  gap:2px;
  height:56px;
  margin-top:8px;
  padding:4px;
  border:1px solid var(--vx-border);
  border-radius:8px;
  background:var(--vx-bg-2);
}
.v-xray-bar{
  flex:1;
  min-height:2px;
  border-radius:2px 2px 0 0;
  background:linear-gradient(180deg,#FF3D8B,#6D3BF5);
}
.v-xray-hint{display:block;margin-top:6px;color:var(--vx-muted);font-size:10px}
@keyframes v-xray-pulse{
  0%{box-shadow:0 0 0 2px rgba(255,61,139,.95),0 0 16px rgba(255,61,139,.5)}
  100%{box-shadow:0 0 0 2px rgba(255,61,139,0),0 0 0 rgba(255,61,139,0)}
}
.${FLASH_CLASS}{animation:v-xray-pulse .45s ease-out}
@media (prefers-reduced-motion: reduce){
  .${FLASH_CLASS}{animation:none;outline:2px solid rgba(255,61,139,.9)}
}
@media (max-width: 640px){
  .v-xray-panel{right:8px;left:8px;width:auto;max-height:60vh}
}
`;
function h(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== void 0) el.textContent = text;
  return el;
}
function isXrayNode(node) {
  if (!node || !refs) return false;
  const el = node.nodeType === 1 ? node : node.parentElement;
  return !!el && refs.root.contains(el);
}
function describeElement(el) {
  if (!el) return "(sem elemento)";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}`;
}
function preview(value, max = 64) {
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  const type = typeof value;
  if (type === "function") return "funcao()";
  if (type === "string") return `"${truncate(value, max)}"`;
  if (type === "number" || type === "boolean") return String(value);
  if (type === "symbol") return String(value);
  if (typeof Element !== "undefined" && value instanceof Element) {
    return `<${value.tagName.toLowerCase()}>`;
  }
  try {
    return truncate(JSON.stringify(value) ?? String(value), max);
  } catch {
    return String(value);
  }
}
function editable(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}
function parseEdited(raw, previous) {
  if (typeof previous === "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
function timeLabel(at) {
  const date = new Date(at);
  const pad2 = (n2) => String(n2).padStart(2, "0");
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}
function collectEffects(scope, out) {
  for (const item of scope.effects) out.push(item);
  for (const child of scope.children) collectEffects(child, out);
}
function effectsOf(node) {
  const out = [];
  for (const scope of getEffectScopes(node)) collectEffects(scope, out);
  return out;
}
function countEffects(el) {
  let total = effectsOf(el).length;
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) total += effectsOf(child).length;
  }
  return total;
}
function flash(el) {
  if (!el || !enabled || isXrayNode(el)) return;
  const previous = flashTimers.get(el);
  if (previous) window.clearTimeout(previous);
  flashing.add(el);
  el.classList.add(FLASH_CLASS);
  const timer = window.setTimeout(() => {
    el.classList.remove(FLASH_CLASS);
    flashTimers.delete(el);
    window.setTimeout(() => flashing.delete(el), 0);
  }, 460);
  flashTimers.set(el, timer);
}
function instrument(node, owner) {
  for (const item of effectsOf(node)) {
    if (patchedEffects.has(item)) continue;
    const original = item.fn;
    patchedEffects.set(item, original);
    item.fn = () => {
      metrics.effects++;
      flash(owner);
      return original();
    };
  }
}
function restoreEffects() {
  for (const [item, original] of patchedEffects) item.fn = original;
  patchedEffects.clear();
}
function scanDocument() {
  if (!enabled || typeof document === "undefined") return;
  for (const [item] of patchedEffects) {
    if (!item.active) patchedEffects.delete(item);
  }
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  );
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === 1) {
      const el = node;
      if (refs && refs.root.contains(el)) {
        node = skipSubtree(walker);
        continue;
      }
      instrument(el, el);
    } else if (node.nodeType === 3 && node.parentElement) {
      instrument(node, node.parentElement);
    }
    node = walker.nextNode();
  }
  refreshOutlines();
}
function skipSubtree(walker) {
  const current2 = walker.currentNode;
  let next = walker.nextSibling();
  if (next) return next;
  let parent = walker.parentNode();
  while (parent) {
    next = walker.nextSibling();
    if (next) return next;
    parent = walker.parentNode();
  }
  walker.currentNode = current2;
  return null;
}
function inspectableElements() {
  const out = [];
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length && out.length < MAX_OUTLINES; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    if (!hasDirectives(el)) continue;
    out.push(el);
  }
  return out;
}
function directiveNames(el) {
  return collectDirectives(el).map(
    (attr2) => attr2.arg ? `${attr2.name}:${attr2.arg}` : attr2.name
  );
}
function refreshOutlines() {
  if (!enabled || !refs) return;
  const overlay = refs.overlay;
  overlay.textContent = "";
  outlined.length = 0;
  for (const el of inspectableElements()) {
    const box = h("div", "v-xray-box");
    const isComponent = !!getScope(el)?.component;
    box.dataset.kind = isComponent ? "component" : "directive";
    const label = h("span", "v-xray-tag", directiveNames(el).join(" "));
    box.appendChild(label);
    overlay.appendChild(box);
    outlined.push({ el, box });
  }
  positionOutlines();
}
function positionOutlines() {
  if (!enabled) return;
  for (const item of outlined) {
    if (!item.el.isConnected) {
      item.box.style.display = "none";
      continue;
    }
    const rect = item.el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      item.box.style.display = "none";
      continue;
    }
    item.box.style.display = "block";
    item.box.style.left = `${rect.left}px`;
    item.box.style.top = `${rect.top}px`;
    item.box.style.width = `${rect.width}px`;
    item.box.style.height = `${rect.height}px`;
  }
}
function scheduleReposition() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = 0;
    positionOutlines();
  });
}
function visibleVariables(scope, limit = 40) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  let current2 = scope;
  while (current2 && out.length < limit) {
    let keys = [];
    try {
      keys = Object.keys(current2.data);
    } catch {
      keys = [];
    }
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      let value;
      try {
        value = current2.data[key];
      } catch {
        value = "(erro de leitura)";
      }
      out.push([key, value]);
      if (out.length >= limit) break;
    }
    current2 = current2.parent;
  }
  return out;
}
function buildCard(el) {
  if (!refs) return;
  const card = refs.card;
  card.textContent = "";
  const scope = findScope(el);
  const owner = scope.owner?.component;
  card.appendChild(h("strong", "v-xray-card-title", describeElement(el)));
  card.appendChild(h("span", "v-xray-section", "Directives"));
  const names2 = collectDirectives(el);
  if (!names2.length) {
    card.appendChild(h("div", "v-xray-val", "nenhuma"));
  } else {
    for (const attr2 of names2) {
      const row = h("div", "v-xray-row");
      row.appendChild(h("span", "v-xray-key", attr2.raw));
      row.appendChild(h("span", "v-xray-val", attr2.expression || "(sem valor)"));
      card.appendChild(row);
    }
  }
  card.appendChild(h("span", "v-xray-section", "Componente"));
  card.appendChild(
    h("div", "v-xray-val", owner ? `${owner.$name} em ${describeElement(owner.$el)}` : "nenhum")
  );
  card.appendChild(h("span", "v-xray-section", "Escopo"));
  const variables = visibleVariables(scope);
  if (!variables.length) {
    card.appendChild(h("div", "v-xray-val", "escopo raiz vazio"));
  } else {
    for (const [key, value] of variables) {
      const row = h("div", "v-xray-row");
      row.appendChild(h("span", "v-xray-key", key));
      row.appendChild(h("span", "v-xray-val", preview(value)));
      card.appendChild(row);
    }
  }
  card.appendChild(h("span", "v-xray-section", "Reatividade"));
  card.appendChild(
    h("div", "v-xray-val", `${countEffects(el)} efeito(s) dependem deste elemento`)
  );
}
function positionCard(x, y) {
  if (!refs) return;
  const card = refs.card;
  const width = 320;
  const height = Math.min(card.scrollHeight || 200, window.innerHeight * 0.6);
  const left = x + 16 + width > window.innerWidth ? Math.max(8, x - width - 16) : x + 16;
  const top2 = y + 16 + height > window.innerHeight ? Math.max(8, y - height - 16) : y + 16;
  card.style.left = `${left}px`;
  card.style.top = `${top2}px`;
}
function onPointerMove(event) {
  if (!enabled || !refs) return;
  const target = event.target;
  if (!target || isXrayNode(target)) {
    refs.card.dataset.open = "0";
    hoverTarget = null;
    return;
  }
  let candidate = target;
  while (candidate && candidate !== document.body && !hasDirectives(candidate)) {
    candidate = candidate.parentElement;
  }
  if (!candidate || candidate === document.body) {
    refs.card.dataset.open = "0";
    hoverTarget = null;
    return;
  }
  if (candidate !== hoverTarget) {
    hoverTarget = candidate;
    buildCard(candidate);
  }
  refs.card.dataset.open = "1";
  positionCard(event.clientX, event.clientY);
}
function collectScopes() {
  const owners = /* @__PURE__ */ new Map();
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    const scope = getScope(el);
    if (scope) owners.set(el, scope);
  }
  const out = [];
  for (const [el, scope] of owners) {
    let depth = 0;
    let parent = el.parentElement;
    while (parent) {
      if (owners.has(parent)) depth++;
      parent = parent.parentElement;
    }
    out.push({ el, scope, depth });
  }
  return out;
}
function valueRow(key, value, commit) {
  const row = h("div", "v-xray-row");
  row.appendChild(h("span", "v-xray-key", key));
  if (typeof value === "function") {
    row.appendChild(h("span", "v-xray-val", "funcao()"));
    return row;
  }
  const input = h("input", "v-xray-input");
  input.type = "text";
  input.value = editable(value);
  input.spellcheck = false;
  input.addEventListener("change", () => {
    try {
      commit(parseEdited(input.value, value));
      input.dataset.error = "0";
    } catch {
      input.dataset.error = "1";
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
  });
  row.appendChild(input);
  return row;
}
function renderStateTab() {
  const frag = document.createDocumentFragment();
  const scopes = collectScopes();
  if (!scopes.length) {
    frag.appendChild(h("span", "v-xray-empty", "Nenhum escopo na pagina. Use v-data ou um componente."));
    return frag;
  }
  for (const entry of scopes) {
    const group = h("div", "v-xray-group");
    group.style.marginLeft = `${Math.min(entry.depth, 4) * 8}px`;
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", entry.scope.component ? "componente" : "escopo"));
    head.appendChild(h("span", void 0, describeElement(entry.el)));
    head.addEventListener("click", () => highlight(entry.el));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    let keys = [];
    try {
      keys = Object.keys(entry.scope.data);
    } catch {
      keys = [];
    }
    if (!keys.length) {
      rows.appendChild(h("span", "v-xray-empty", "sem variaveis"));
    } else {
      for (const key of keys) {
        let value;
        try {
          value = entry.scope.data[key];
        } catch {
          value = void 0;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            entry.scope.set(key, next);
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function renderComponentsTab() {
  const frag = document.createDocumentFragment();
  const list = [...instances];
  if (!list.length) {
    frag.appendChild(h("span", "v-xray-empty", "Nenhum componente montado."));
    return frag;
  }
  for (const instance of list) {
    const group = h("div", "v-xray-group");
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", instance.$name));
    head.appendChild(h("span", void 0, describeElement(instance.$el)));
    head.appendChild(
      h("span", "v-xray-badge", `${countEffects(instance.$el)} efeitos`)
    );
    head.lastChild.dataset.tone = "mute";
    head.addEventListener("click", () => highlight(instance.$el));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    const props = instance.$props ?? {};
    const propKeys = Object.keys(props);
    if (propKeys.length) {
      rows.appendChild(h("span", "v-xray-section", "Props"));
      for (const key of propKeys) {
        rows.appendChild(
          valueRow(key, props[key], (next) => {
            props[key] = next;
          })
        );
      }
    }
    const scope = instance.$scope;
    let stateKeys = [];
    try {
      stateKeys = Object.keys(scope.data).filter((key) => !propKeys.includes(key));
    } catch {
      stateKeys = [];
    }
    if (stateKeys.length) {
      rows.appendChild(h("span", "v-xray-section", "Estado"));
      for (const key of stateKeys) {
        let value;
        try {
          value = scope.data[key];
        } catch {
          value = void 0;
        }
        rows.appendChild(
          valueRow(key, value, (next) => {
            scope.set(key, next);
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function renderStoresTab() {
  const frag = document.createDocumentFragment();
  const names2 = storeNames();
  if (!names2.length) {
    frag.appendChild(h("span", "v-xray-empty", "Nenhum store global. Crie um com V.store()."));
    return frag;
  }
  for (const name of names2) {
    const data2 = allStores[name];
    const group = h("div", "v-xray-group");
    const head = h("div", "v-xray-group-head");
    head.appendChild(h("span", "v-xray-badge", "store"));
    head.firstChild.dataset.tone = "alt";
    head.appendChild(h("span", void 0, name));
    group.appendChild(head);
    const rows = h("div", "v-xray-rows");
    const keys = data2 ? Object.keys(data2) : [];
    if (!keys.length) {
      rows.appendChild(h("span", "v-xray-empty", "store vazio"));
    } else {
      for (const key of keys) {
        rows.appendChild(
          valueRow(key, data2[key], (next) => {
            data2[key] = next;
          })
        );
      }
    }
    group.appendChild(rows);
    frag.appendChild(group);
  }
  return frag;
}
function logLine(time, main, tail, tone) {
  const row = h("div", "v-xray-log");
  row.appendChild(h("span", "v-xray-log-time", time));
  row.appendChild(h("span", "v-xray-log-main", main));
  if (tail !== void 0) {
    const badge = h("span", tone === "fail" ? "v-xray-fail" : tone === "ok" ? "v-xray-ok" : void 0, tail);
    row.appendChild(badge);
  }
  return row;
}
function renderEventsTab() {
  const frag = document.createDocumentFragment();
  const clear = h("button", "v-xray-btn", "limpar log");
  clear.addEventListener("click", () => {
    eventLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);
  if (!eventLog.length) {
    frag.appendChild(h("span", "v-xray-empty", "Nenhum evento ainda. Interaja com a pagina."));
    return frag;
  }
  for (const entry of [...eventLog].reverse()) {
    frag.appendChild(
      logLine(timeLabel(entry.at), `${entry.type} em ${entry.target}`, entry.detail || entry.source)
    );
  }
  return frag;
}
function renderNetworkTab() {
  const frag = document.createDocumentFragment();
  const clear = h("button", "v-xray-btn", "limpar log");
  clear.addEventListener("click", () => {
    networkLog.length = 0;
    renderActiveTab();
  });
  frag.appendChild(clear);
  if (!networkLog.length) {
    frag.appendChild(
      h("span", "v-xray-empty", "Nenhuma requisicao. v-get, v-post e V.http aparecem aqui.")
    );
    return frag;
  }
  for (const entry of [...networkLog].reverse()) {
    frag.appendChild(
      logLine(
        timeLabel(entry.at),
        `${entry.method} ${entry.url}`,
        `${entry.status || "---"} ${Math.round(entry.duration)}ms`,
        entry.ok ? "ok" : "fail"
      )
    );
  }
  return frag;
}
function renderPerformanceTab() {
  const frag = document.createDocumentFragment();
  const updates = h("div", "v-xray-metric");
  updates.appendChild(h("span", "v-xray-metric-value", String(metrics.updatesPerSecond)));
  updates.appendChild(h("span", void 0, "atualizacoes de DOM por segundo"));
  frag.appendChild(updates);
  const effects = h("div", "v-xray-metric");
  effects.appendChild(h("span", "v-xray-metric-value", String(metrics.effectsPerSecond)));
  effects.appendChild(h("span", void 0, "efeitos reativos disparados por segundo"));
  frag.appendChild(effects);
  const total = h("div", "v-xray-metric");
  total.appendChild(h("span", "v-xray-metric-value", String(metrics.effects)));
  total.appendChild(h("span", void 0, "efeitos disparados desde que o raio-x ligou"));
  frag.appendChild(total);
  const chart = h("div", "v-xray-chart");
  const peak = Math.max(1, ...metrics.history.map((item) => Math.max(item.effects, item.updates)));
  for (const item of metrics.history) {
    const bar = h("div", "v-xray-bar");
    const value = Math.max(item.effects, item.updates);
    bar.style.height = `${Math.max(2, Math.round(value / peak * 46))}px`;
    bar.title = `${item.effects} efeitos, ${item.updates} atualizacoes`;
    chart.appendChild(bar);
  }
  frag.appendChild(chart);
  frag.appendChild(
    h("span", "v-xray-hint", `${patchedEffects.size} efeitos instrumentados, pico de ${peak} por segundo`)
  );
  return frag;
}
var TABS = [
  { id: "estado", label: "Estado" },
  { id: "componentes", label: "Componentes" },
  { id: "stores", label: "Stores" },
  { id: "eventos", label: "Eventos" },
  { id: "rede", label: "Rede" },
  { id: "desempenho", label: "Desempenho" }
];
function renderActiveTab() {
  if (!refs) return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && refs.body.contains(active)) return;
  refs.body.textContent = "";
  switch (activeTab) {
    case "estado":
      refs.body.appendChild(renderStateTab());
      break;
    case "componentes":
      refs.body.appendChild(renderComponentsTab());
      break;
    case "stores":
      refs.body.appendChild(renderStoresTab());
      break;
    case "eventos":
      refs.body.appendChild(renderEventsTab());
      break;
    case "rede":
      refs.body.appendChild(renderNetworkTab());
      break;
    case "desempenho":
      refs.body.appendChild(renderPerformanceTab());
      break;
  }
  for (const child of Array.from(refs.tabs.children)) {
    const tab = child;
    tab.dataset.active = tab.dataset.id === activeTab ? "1" : "0";
  }
  refs.status.textContent = `${outlined.length} elementos com directives, ${instances.size} componentes, ${patchedEffects.size} efeitos observados`;
}
function highlight(el) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  flash(el);
}
function buildPanel() {
  const root = h("div", "v-xray-root");
  root.setAttribute(`${exports.config.prefix}ignore`, "");
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Inspetor Voodoo x-ray");
  if (theme2 !== "auto") root.dataset.vXrayTheme = theme2;
  const overlay = h("div", "v-xray-overlay");
  root.appendChild(overlay);
  const card = h("div", "v-xray-card");
  card.dataset.open = "0";
  root.appendChild(card);
  const panel = h("div", "v-xray-panel");
  const header = h("div", "v-xray-header");
  const brand = h("div", "v-xray-brand");
  brand.appendChild(h("span", "v-xray-dot"));
  brand.appendChild(document.createTextNode("Voodoo x-ray"));
  header.appendChild(brand);
  const themeButton = h("button", "v-xray-btn", "tema");
  themeButton.addEventListener("click", () => {
    theme2 = theme2 === "auto" ? "dark" : theme2 === "dark" ? "light" : "auto";
    if (theme2 === "auto") delete root.dataset.vXrayTheme;
    else root.dataset.vXrayTheme = theme2;
  });
  header.appendChild(themeButton);
  const closeButton = h("button", "v-xray-btn", "fechar");
  closeButton.addEventListener("click", () => disableXray());
  header.appendChild(closeButton);
  panel.appendChild(header);
  const tabs = h("div", "v-xray-tabs");
  for (const tab of TABS) {
    const button = h("button", "v-xray-tab", tab.label);
    button.dataset.id = tab.id;
    button.dataset.active = tab.id === activeTab ? "1" : "0";
    button.addEventListener("click", () => {
      activeTab = tab.id;
      renderActiveTab();
    });
    tabs.appendChild(button);
  }
  panel.appendChild(tabs);
  const body = h("div", "v-xray-body");
  panel.appendChild(body);
  const status = h("div", "v-xray-status", "iniciando");
  panel.appendChild(status);
  root.appendChild(panel);
  document.body.appendChild(root);
  return { root, overlay, card, panel, tabs, body, status };
}
var BASE_EVENTS = [
  "click",
  "dblclick",
  "submit",
  "input",
  "change",
  "keydown",
  "keyup",
  "focus",
  "blur",
  "contextmenu",
  "drop",
  "paste"
];
function pushEvent(entry) {
  eventLog.push(entry);
  if (eventLog.length > MAX_LOG) eventLog.shift();
  if (activeTab === "eventos") renderActiveTab();
}
function pushNetwork(entry) {
  networkLog.push(entry);
  if (networkLog.length > MAX_LOG) networkLog.shift();
  if (activeTab === "rede") renderActiveTab();
}
function declaringElement(target, type) {
  let current2 = target;
  for (let depth = 0; current2 && depth < 6; depth++) {
    for (const attr2 of collectDirectives(current2)) {
      if (attr2.name === type) return current2;
      if (attr2.name === "on" && attr2.arg === type) return current2;
    }
    current2 = current2.parentElement;
  }
  return null;
}
function declaredEventNames() {
  const names2 = new Set(BASE_EVENTS);
  const all = document.body.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (refs && refs.root.contains(el)) continue;
    for (const attr2 of collectDirectives(el)) {
      if (attr2.name === "on" && attr2.arg) names2.add(attr2.arg);
    }
  }
  return [...names2];
}
function listenEvents() {
  const handler = (event) => {
    if (!enabled) return;
    const target = event.target;
    if (!target || target.nodeType !== 1 || isXrayNode(target)) return;
    const owner = declaringElement(target, event.type);
    const custom = event.__voodoo === true;
    if (!owner && !custom) return;
    pushEvent({
      at: Date.now(),
      type: event.type,
      target: describeElement(owner ?? target),
      detail: custom ? "emit de componente" : "",
      source: custom ? "component" : "v-on"
    });
  };
  for (const name of declaredEventNames()) {
    document.addEventListener(name, handler, true);
    disposers.push(() => document.removeEventListener(name, handler, true));
  }
  disposers.push(
    devtoolsBus.on("event", (data2) => {
      pushEvent({
        at: Date.now(),
        type: data2.type,
        target: describeElement(data2.el ?? null),
        detail: preview(data2.detail),
        source: data2.source ?? "bus"
      });
    })
  );
}
function listenNetwork() {
  disposers.push(
    http.interceptors.request.use((requestConfig) => {
      requestStarts.set(requestConfig, performance.now());
      return requestConfig;
    })
  );
  disposers.push(
    http.interceptors.response.use((response) => {
      const started2 = requestStarts.get(response.config) ?? performance.now();
      pushNetwork({
        at: Date.now(),
        method: (response.config.method ?? "GET").toUpperCase(),
        url: response.config.url,
        status: response.status,
        ok: response.ok,
        duration: performance.now() - started2,
        source: "http"
      });
      return response;
    })
  );
  disposers.push(
    http.interceptors.error.use((error) => {
      const requestConfig = error.config;
      const started2 = requestConfig ? requestStarts.get(requestConfig) ?? performance.now() : performance.now();
      pushNetwork({
        at: Date.now(),
        method: (requestConfig?.method ?? "GET").toUpperCase(),
        url: requestConfig?.url ?? "(desconhecida)",
        status: error.status,
        ok: false,
        duration: performance.now() - started2,
        source: "http"
      });
      return error;
    })
  );
  disposers.push(
    devtoolsBus.on("network", (data2) => {
      pushNetwork({
        at: Date.now(),
        method: (data2.method ?? "GET").toUpperCase(),
        url: data2.url,
        status: data2.status ?? 0,
        ok: data2.ok ?? !data2.error,
        duration: data2.duration ?? 0,
        source: data2.source ?? "bus"
      });
    })
  );
}
var observer2 = null;
function observeMutations() {
  observer2 = new MutationObserver((records) => {
    let structural = false;
    for (const record of records) {
      const target = record.target;
      if (isXrayNode(target)) continue;
      if (record.type === "attributes" && record.attributeName === "class" && target.nodeType === 1 && flashing.has(target)) {
        continue;
      }
      metrics.mutations++;
      if (record.type === "childList" && record.addedNodes.length) structural = true;
    }
    if (structural && !scanTimer) {
      scanTimer = window.setTimeout(() => {
        scanTimer = 0;
        scanDocument();
      }, 250);
    }
  });
  observer2.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
}
function startTimers() {
  metricsTimer = window.setInterval(() => {
    metrics.effectsPerSecond = metrics.effects - lastEffectCount;
    metrics.updatesPerSecond = metrics.mutations - lastMutationCount;
    lastEffectCount = metrics.effects;
    lastMutationCount = metrics.mutations;
    metrics.history.push({
      effects: metrics.effectsPerSecond,
      updates: metrics.updatesPerSecond
    });
    if (metrics.history.length > 40) metrics.history.shift();
    if (activeTab === "desempenho") renderActiveTab();
  }, 1e3);
  refreshTimer = window.setInterval(() => {
    positionOutlines();
    if (activeTab === "estado" || activeTab === "componentes" || activeTab === "stores") {
      renderActiveTab();
    }
  }, 700);
}
var lastEffectCount = 0;
var lastMutationCount = 0;
function enableXray() {
  if (enabled || typeof document === "undefined" || !document.body) return;
  enabled = true;
  ensureTokens();
  injectStyle("xray", XRAY_CSS);
  refs = buildPanel();
  activeTab = activeTab || "estado";
  metrics.effects = 0;
  metrics.mutations = 0;
  lastEffectCount = 0;
  lastMutationCount = 0;
  metrics.history.length = 0;
  scanDocument();
  listenEvents();
  listenNetwork();
  observeMutations();
  startTimers();
  const onScroll = () => scheduleReposition();
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onScroll);
  document.addEventListener("mousemove", onPointerMove, true);
  disposers.push(() => window.removeEventListener("scroll", onScroll, true));
  disposers.push(() => window.removeEventListener("resize", onScroll));
  disposers.push(() => document.removeEventListener("mousemove", onPointerMove, true));
  renderActiveTab();
}
function disableXray() {
  if (!enabled) return;
  enabled = false;
  for (const dispose of disposers.splice(0)) {
    try {
      dispose();
    } catch {
    }
  }
  observer2?.disconnect();
  observer2 = null;
  if (metricsTimer) window.clearInterval(metricsTimer);
  if (refreshTimer) window.clearInterval(refreshTimer);
  if (scanTimer) window.clearTimeout(scanTimer);
  if (frameRequest) cancelAnimationFrame(frameRequest);
  metricsTimer = refreshTimer = scanTimer = frameRequest = 0;
  for (const [el, timer] of flashTimers) {
    window.clearTimeout(timer);
    el.classList.remove(FLASH_CLASS);
  }
  flashTimers.clear();
  flashing.clear();
  restoreEffects();
  outlined.length = 0;
  hoverTarget = null;
  refs?.root.remove();
  refs = null;
}
function enableXrayShortcut() {
  if (shortcutInstalled || typeof document === "undefined") return;
  shortcutInstalled = true;
  document.addEventListener("keydown", (event) => {
    if (!event.ctrlKey || !event.shiftKey) return;
    if (event.key !== "X" && event.key !== "x") return;
    event.preventDefault();
    xray();
  });
}
function xray(force) {
  enableXrayShortcut();
  const next = force ?? !enabled;
  if (next) enableXray();
  else disableXray();
  return enabled;
}

// src/index.ts
init_reactivity();
init_registry();
init_style();
var V = ((input, context) => query(input, context));
Object.assign(V, core, {
  // DOM encadeavel
  query,
  ready,
  fromHtml,
  Collection: VoodooCollection,
  // Rotas
  router,
  route,
  navigate,
  resolveRoute: resolve2,
  // Idiomas
  i18n,
  t,
  setLocale,
  getLocale,
  // Dialogos
  modal,
  alert,
  confirm,
  prompt,
  dialog,
  // Formularios
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
  // Animacao
  animate,
  spring,
  stagger,
  inView,
  scrollProgress,
  motion: motionPresets,
  easings,
  // Graficos
  chart: renderChart,
  renderChart,
  charts,
  chartColors: CHART_COLORS,
  // Interface
  palette,
  hotkey,
  sound,
  // Ferramentas de inspecao
  xray,
  enableXrayShortcut,
  devtools: devtoolsBus,
  magic
});
var src_default = V;

exports.HttpError = HttpError;
exports.Scope = Scope;
exports.V = V;
exports.VoodooCollection = VoodooCollection;
exports.VoodooRuntimeError = VoodooRuntimeError;
exports.VoodooSyntaxError = VoodooSyntaxError;
exports.addCleanup = addCleanup;
exports.alert = alert;
exports.allStores = allStores;
exports.allowedGlobals = allowedGlobals;
exports.animate = animate;
exports.applyMask = applyMask;
exports.cache = cache2;
exports.capitalize = capitalize;
exports.charts = charts;
exports.chunk = chunk;
exports.clearErrors = clearErrors;
exports.clearParseCache = clearParseCache;
exports.clipboard = clipboard;
exports.clone = clone;
exports.computed = computed;
exports.confirm = confirm;
exports.cookie = cookie;
exports.debounce = debounce;
exports.default = src_default;
exports.defineComponent = defineComponent;
exports.defineDirective = defineDirective;
exports.destroy = destroy;
exports.device = device;
exports.devtoolsBus = devtoolsBus;
exports.dialog = dialog;
exports.easings = easings;
exports.effect = effect;
exports.effectScope = effectScope;
exports.ensureTokens = ensureTokens;
exports.enter = enter;
exports.escapeHtml = escapeHtml;
exports.evaluate = evaluate;
exports.fadeIn = fadeIn;
exports.fadeOut = fadeOut;
exports.findScope = findScope;
exports.flushSync = flushSync;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatFileSize = formatFileSize;
exports.formatNumber = formatNumber;
exports.formatPercent = formatPercent;
exports.fromHtml = fromHtml;
exports.get = get;
exports.getLocale = getLocale;
exports.getScope = getScope;
exports.groupBy = groupBy;
exports.hotkey = hotkey;
exports.http = http;
exports.i18n = i18n;
exports.inView = inView;
exports.injectStyle = injectStyle;
exports.instances = instances;
exports.isBrowser = isBrowser;
exports.isReactive = isReactive;
exports.leave = leave;
exports.magic = magic;
exports.magics = magics;
exports.markRaw = markRaw;
exports.mask = mask;
exports.masks = masks;
exports.memoize = memoize;
exports.merge = merge;
exports.modal = modal;
exports.motionPresets = motionPresets;
exports.mountComponent = mountComponent;
exports.navigate = navigate;
exports.network = network;
exports.nextTick = nextTick;
exports.once = once;
exports.palette = palette;
exports.parse = parse;
exports.parseDuration = parseDuration;
exports.prompt = prompt;
exports.query = query;
exports.random = random;
exports.reactive = reactive;
exports.ready = ready;
exports.ref = ref;
exports.refresh = refresh;
exports.registerMask = registerMask;
exports.relativeTime = relativeTime;
exports.removeStore = removeStore;
exports.renderChart = renderChart;
exports.request = request;
exports.rootScope = rootScope;
exports.route = route;
exports.router = router;
exports.sample = sample;
exports.screen = screen;
exports.scrollProgress = scrollProgress;
exports.serializeForm = serializeForm;
exports.session = session;
exports.set = set;
exports.setFormatDefaults = setFormatDefaults;
exports.setLocale = setLocale;
exports.shallowRef = shallowRef;
exports.showFormErrors = showFormErrors;
exports.sleep = sleep;
exports.slideDown = slideDown;
exports.slideUp = slideUp;
exports.slugify = slugify;
exports.sortBy = sortBy;
exports.sound = sound;
exports.soundEffects = efeitos;
exports.spring = spring;
exports.stagger = stagger;
exports.start = start;
exports.stop = stop;
exports.storage = storage;
exports.store = store;
exports.storeNames = storeNames;
exports.stringify = stringify;
exports.stripTags = stripTags;
exports.t = t;
exports.theme = theme;
exports.throttle = throttle;
exports.titleCase = titleCase;
exports.toRaw = toRaw;
exports.toast = toast;
exports.tokenize = tokenize;
exports.truncate = truncate;
exports.uid = uid;
exports.unique = unique;
exports.unmask = unmask;
exports.unref = unref;
exports.url = url;
exports.uuid = uuid;
exports.validate = validate;
exports.validator = validator;
exports.viewTransition = viewTransition;
exports.walk = walk;
exports.watch = watch;
exports.watchEffect = watchEffect;
exports.xray = xray;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map