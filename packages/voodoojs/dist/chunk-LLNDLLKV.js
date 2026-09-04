import { __publicField } from './chunk-GXPNWCGE.js';

/**
 * Voodoo.js v0.12.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/reactivity/index.ts
var resolvedPromise = /* @__PURE__ */ Promise.resolve();
var queue = [];
var postQueue = [];
var isFlushing = false;
var isFlushPending = false;
var flushPromise = null;
var RECURSION_LIMIT = 100;
function nextTick(fn) {
  const p = flushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
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
var errorHandler = null;
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
var activeEffect;
var shouldTrack = true;
var trackStack = [];
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
var effectId = 0;
var ReactiveEffect = class {
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
var activeScope;
var EffectScope = class {
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
function effectScope(detached = false) {
  return new EffectScope(detached);
}
function getActiveScope() {
  return activeScope;
}
var ITERATE_KEY = /* @__PURE__ */ Symbol("voodoo:iterate");
var targetMap = /* @__PURE__ */ new WeakMap();
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
var TriggerType = /* @__PURE__ */ ((TriggerType2) => {
  TriggerType2["SET"] = "set";
  TriggerType2["ADD"] = "add";
  TriggerType2["DELETE"] = "delete";
  TriggerType2["CLEAR"] = "clear";
  return TriggerType2;
})(TriggerType || {});
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
var RAW = /* @__PURE__ */ Symbol("voodoo:raw");
var IS_REACTIVE = /* @__PURE__ */ Symbol("voodoo:isReactive");
var SKIP = /* @__PURE__ */ Symbol("voodoo:skip");
var reactiveMap = /* @__PURE__ */ new WeakMap();
var arrayInstrumentations = /* @__PURE__ */ (() => {
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
function isObject(val) {
  return val !== null && typeof val === "object";
}
var NON_REACTIVE = /* @__PURE__ */ new Set([
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
var baseHandlers = {
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
var collectionHandlers = {
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
function hasChanged(value, oldValue) {
  return !Object.is(value, oldValue);
}
function isRef(r) {
  return !!(r && r.__v_isRef === true);
}
var RefImpl = class {
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
var ComputedRefImpl = class {
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

export { EffectScope, ITERATE_KEY, ReactiveEffect, TriggerType, computed, effect, effectScope, enableTracking, flushSync, getActiveEffect, getActiveScope, handleError, hasChanged, isReactive, isRef, markRaw, nextTick, pauseTracking, queueJob, queuePostFlush, reactive, ref, resetTracking, setErrorHandler, shallowRef, stop, toRaw, track, trigger, unref, warn, watch, watchEffect };
//# sourceMappingURL=chunk-LLNDLLKV.js.map
//# sourceMappingURL=chunk-LLNDLLKV.js.map