/**
 * Voodoo.js v0.12.1
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
"use strict";
var Voodoo = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
    var _a2;
    shouldTrack = (_a2 = trackStack.pop()) != null ? _a2 : true;
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
    if (!(options == null ? void 0 : options.lazy)) e.run();
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
        cleanupFn == null ? void 0 : cleanupFn();
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
      cleanupFn == null ? void 0 : cleanupFn();
      cleanupFn = void 0;
      fn(onInvalidate);
    });
    return () => {
      cleanupFn == null ? void 0 : cleanupFn();
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
      "use strict";
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
          var _a2;
          this.fn = fn;
          this.id = effectId++;
          this.active = true;
          this.queued = false;
          this.deps = [];
          this.parent = void 0;
          this.scheduler = options == null ? void 0 : options.scheduler;
          this.onStop = options == null ? void 0 : options.onStop;
          this.cleanups = [];
          const scope = (_a2 = options == null ? void 0 : options.scope) != null ? _a2 : activeScope;
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
          var _a2;
          if (!this.active) return;
          cleanupDeps(this);
          this.runCleanups();
          this.active = false;
          (_a2 = this.onStop) == null ? void 0 : _a2.call(this);
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
    var _a2, _b;
    directives.set(name, {
      name,
      setup,
      priority: (_a2 = options.priority) != null ? _a2 : PRIORITY.DEFAULT,
      terminal: (_b = options.terminal) != null ? _b : false
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
      "use strict";
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
      "use strict";
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

  // src/browser-minimo.ts
  var browser_minimo_exports = {};
  __export(browser_minimo_exports, {
    default: () => browser_minimo_default
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
    var _a2, _b;
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
              out += (_a2 = ESCAPES[esc]) != null ? _a2 : esc;
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
            current2 += (_b = ESCAPES[esc]) != null ? _b : esc;
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
      } catch (e) {
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
          const body = [this.parseExpression()];
          while (this.isPunct(",")) {
            this.next();
            if (this.isPunct(")")) {
              const stray = this.peek();
              throw new VoodooSyntaxError("Trailing comma in a group", this.source, stray.start);
            }
            body.push(this.parseExpression());
          }
          this.expect(")");
          return body.length === 1 ? body[0] : { t: "seq", body };
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
      var _a2;
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
          const key = String((_a2 = keyToken.parsed) != null ? _a2 : keyToken.value);
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
  var _a;
  var SafeObject = /* @__PURE__ */ Object.freeze({
    keys: Object.keys,
    values: Object.values,
    entries: Object.entries,
    fromEntries: Object.fromEntries,
    assign: Object.assign,
    is: Object.is,
    hasOwn: (_a = Object.hasOwn) != null ? _a : ((o, k) => Object.prototype.hasOwnProperty.call(o, k))
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
    var _a2, _b;
    switch (node.t) {
      case "lit":
        return node.v;
      case "tpl": {
        let out = (_a2 = node.quasis[0]) != null ? _a2 : "";
        for (let i = 0; i < node.exprs.length; i++) {
          out += stringify(evaluate(node.exprs[i], scope));
          out += (_b = node.quasis[i + 1]) != null ? _b : "";
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
        return l != null ? l : evaluate(node.r, scope);
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
      } catch (e) {
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
  var hooks = /* @__PURE__ */ new Map();
  function hook(name, getter) {
    hooks.set(name, getter);
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
        return this.magicContainer(name, magics);
      }
      if (hooks.has(name)) {
        return this.magicContainer(name, hooks);
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
      return new _Scope(vars, this, el != null ? el : this.el);
    }
    /** Create a reactive child scope, used by `v-data` and `v-for`. */
    reactiveChild(vars, el = null) {
      return new _Scope(reactive(vars), this, el != null ? el : this.el);
    }
    magicContainer(name, registry) {
      if (!this.magicCache) this.magicCache = /* @__PURE__ */ new Map();
      const cached = this.magicCache.get(name);
      if (cached) return cached;
      const getter = registry.get(name);
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
    var _a2, _b;
    return (_b = (_a2 = directives.get(attr2.name)) == null ? void 0 : _a2.priority) != null ? _b : 0;
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
    var _a2;
    const names2 = directiveNamesOf.get(el);
    if (!names2) return;
    for (const name of names2) (_a2 = directiveIndex.get(name)) == null ? void 0 : _a2.delete(el);
    directiveNamesOf.delete(el);
  }
  var attributeCache = /* @__PURE__ */ new WeakMap();
  function isVoodooAttribute(name) {
    return name.startsWith(config.prefix) || name.startsWith("data-v-") || name.charCodeAt(0) === 64 || name.charCodeAt(0) === 58 && name.length > 1;
  }
  function readAttr(el, name) {
    var _a2;
    const cached = (_a2 = attributeCache.get(el)) == null ? void 0 : _a2.get(name);
    if (cached !== void 0) return cached;
    return el.getAttribute(name);
  }
  function hasAttr(el, name) {
    const map = attributeCache.get(el);
    if (map == null ? void 0 : map.has(name)) return true;
    return el.hasAttribute(name);
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
      } catch (e) {
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
        warnInvalidExpression(el != null ? el : scope.el, context != null ? context : "expression", expression, err);
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
        return evaluateIn(expression != null ? expression : attr2.expression, scope, attr2.raw, el);
      },
      effect(fn) {
        const owner = ownerScope();
        const hosted = () => {
          const previous = hookHost;
          hookHost = el;
          try {
            fn();
          } finally {
            hookHost = previous;
          }
        };
        owner.run(() => effect(hosted, { scope: owner }));
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
    const activeScope2 = scope != null ? scope : findScope(node.parentNode);
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
    const previousHost = hookHost;
    hookHost = el;
    try {
      walkElementDirectives(el, attrs, tagComponent, current2);
    } finally {
      hookHost = previousHost;
    }
  }
  var hookHost = null;
  function currentHookHost() {
    return hookHost;
  }
  function createDataScope(expression, parent, el) {
    let ast = null;
    try {
      ast = parse(expression);
    } catch (e) {
      ast = null;
    }
    const plain = ast && ast.t === "obj" && ast.props.every(
      (p2) => !p2.spread && !p2.keyExpr
    );
    if (!plain) {
      const raw = evaluateIn(expression, parent, "v-data");
      return parent.reactiveChild(raw && typeof raw === "object" ? raw : {}, el);
    }
    const scope = parent.reactiveChild({}, el);
    const props = ast.props;
    for (const prop of props) {
      if (prop.key === null) continue;
      try {
        if (prop.getter) {
          const compute = evaluate(prop.value, scope);
          Object.defineProperty(scope.data, prop.key, {
            enumerable: true,
            configurable: true,
            get: () => compute.call(scope.data)
          });
        } else {
          scope.data[prop.key] = evaluate(prop.value, scope);
        }
      } catch (err) {
        if (inDevelopment()) warnInvalidExpression(el, expression, expression, err);
        else handleError(err, "v-data");
      }
    }
    return scope;
  }
  function walkElementDirectives(el, attrs, tagComponent, scope) {
    let current2 = scope;
    for (const attr2 of attrs) {
      const def = directives.get(attr2.name);
      if (def == null ? void 0 : def.terminal) {
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
      current2 = createDataScope(dataAttr ? dataAttr.expression || "{}" : "{}", current2, el);
      nodeScopes.set(el, current2);
    }
    const attributeScope = mountedComponent ? scope : current2;
    for (const attr2 of attrs) {
      if (attr2.name === "data" || attr2.name === "component") continue;
      runDirective(el, attr2, attributeScope);
    }
    stripAttributes(el);
    if (!skipChildren.has(el)) walkChildren(el, current2);
  }
  function walkChildren(el, scope) {
    var _a2;
    const list = [];
    for (let child = el.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 1) list.push(child);
      else if (child.nodeType === 3) bindTextNode(child, scope);
    }
    for (const child of list) walk(child, (_a2 = nodeScopes.get(child)) != null ? _a2 : scope);
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
    } catch (e) {
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
    } catch (e) {
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
    return alias != null ? alias : null;
  }
  var componentAliases = /* @__PURE__ */ new Map();
  var started = false;
  var observer = null;
  var startHooks = [];
  function runPhase(target, after) {
    for (const hook2 of startHooks) {
      try {
        hook2(target, after);
      } catch (error) {
        console.error("[Voodoo] a start hook failed", error);
      }
    }
  }
  function start(root) {
    var _a2;
    if (typeof document === "undefined") return;
    const target = (_a2 = root != null ? root : config.root) != null ? _a2 : document.body;
    if (!target) return;
    Object.assign(allowedGlobals, config.globals);
    runPhase(target, false);
    walk(target, rootScope);
    runPhase(target, true);
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
    observer == null ? void 0 : observer.disconnect();
    observer = null;
    started = false;
  }
  function refresh(root) {
    walk(root != null ? root : document.body, root ? findScope(root.parentNode) : rootScope);
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
    var _a2;
    if (typeof document === "undefined" || !document.body) return;
    const noHyphen = normalized.replace(/-/g, "");
    const selectors = [normalized, noHyphen, `[${config.prefix}component="${normalized}"]`];
    for (const selector of selectors) {
      let found;
      try {
        found = Array.from(document.querySelectorAll(selector));
      } catch (e) {
        continue;
      }
      for (const el of found) {
        if ((_a2 = getScope(el)) == null ? void 0 : _a2.component) continue;
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
    var _a2, _b;
    if (!def || !def.type || def.type === "any") return value;
    if (value == null || value === "") return (_a2 = def.default) != null ? _a2 : value;
    switch (def.type) {
      case "number": {
        const n = Number(value);
        return Number.isNaN(n) ? (_b = def.default) != null ? _b : value : n;
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
    var _a2;
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
        const target2 = (_a2 = lookup.get(parsed.arg.toLowerCase())) != null ? _a2 : camelize(parsed.arg);
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
      var _a2, _b;
      const slotName = node.nodeType === 1 ? (_a2 = node.getAttribute("slot")) != null ? _a2 : null : null;
      if (slotName) {
        node.removeAttribute("slot");
        const list = (_b = named.get(slotName)) != null ? _b : [];
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
    scopeMarker == null ? void 0 : scopeMarker(node, scope);
  }
  function mountComponent(el, name, parentScope) {
    var _a2, _b, _c, _d, _e, _f, _g, _h;
    const normalized = name ? normalizeComponentName(name) : "";
    const definition = normalized ? (_c = (_b = components.get(normalized)) != null ? _b : components.get((_a2 = componentAliases.get(normalized)) != null ? _a2 : "")) != null ? _c : {} : {};
    if (normalized && !components.has(normalized) && !componentAliases.has(normalized)) {
      warnUnknownComponent(el, name);
    }
    const owner = new EffectScope(true);
    const defs = propDefinitions(definition);
    const props = resolveProps(el, defs, parentScope, owner, normalized || "inline");
    if (!definition.state && definition.data) warnAlias("data()", "state()");
    if (definition.destroyed) warnAlias("destroyed()", "unmounted()");
    const stateFactory = (_d = definition.state) != null ? _d : definition.data;
    let stateRaw = {};
    const instance = {};
    const scopeParent = definition.inheritScope ? parentScope : parentScope.root;
    const scope = new Scope({}, scopeParent, el);
    scope.component = instance;
    try {
      stateRaw = stateFactory ? (_e = stateFactory.call(instance, props)) != null ? _e : {} : {};
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
        ([key, options]) => [key, options != null ? options : {}]
      );
      for (const [key, options] of requests) {
        const from = (_f = options.from) != null ? _f : key;
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
    const emit2 = (event, detail) => {
      const ev = new CustomEvent(event, { detail, bubbles: true, cancelable: true });
      ev.__voodoo = true;
      el.dispatchEvent(ev);
    };
    const special = {
      $el: el,
      $props: props,
      $name: normalized || "inline",
      $scope: scope,
      $parent: (_h = (_g = parentScope.owner) == null ? void 0 : _g.component) != null ? _h : null,
      emit: emit2,
      $emit: emit2,
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
    const hook2 = def[name];
    if (typeof hook2 !== "function") return;
    try {
      hook2.call(instance);
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
    var _a2;
    if (domVersion === domVersionAtPreviousStep) stepsWithoutChange++;
    else stepsWithoutChange = 0;
    domVersionAtPreviousStep = domVersion;
    const now_ = now();
    for (let i = queue2.length - 1; i >= 0; i--) {
      const task = queue2[i];
      let value = null;
      try {
        value = task.ready();
      } catch (e) {
        value = null;
      }
      if (value) {
        queue2.splice(i, 1);
        task.action(value);
        continue;
      }
      if (now_ - task.since > WAIT_LIMIT) {
        queue2.splice(i, 1);
        (_a2 = task.onGiveUp) == null ? void 0 : _a2.call(task);
      }
    }
    if (queue2.length) scheduleStep();
  }
  function enqueue(task) {
    let value = null;
    try {
      value = task.ready();
    } catch (e) {
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
      var _a2, _b;
      if (instance) return instance;
      container2 = el;
      originalHTML = el.innerHTML;
      Object.assign(allowedGlobals, config_.globalProperties);
      registerLocal();
      const definition = { ...root };
      if (Object.keys(provided).length) {
        const previous = definition.provide;
        definition.provide = () => ({
          ...typeof previous === "function" ? previous() : previous != null ? previous : {},
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
      instance = (_b = (_a2 = getScope(el)) == null ? void 0 : _a2.component) != null ? _b : null;
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
        var _a2;
        const normalized = normalizeComponentName(name2);
        if (definition === void 0) {
          return (_a2 = local && local[name2]) != null ? _a2 : components.get(normalized);
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
        directiveRegistrar == null ? void 0 : directiveRegistrar(name2, definition);
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
      } catch (e) {
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
          } catch (e) {
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
    var _a2;
    (_a2 = persistHandles.get(name)) == null ? void 0 : _a2();
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
    if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
    if (c == null ? void 0 : c.getRandomValues) {
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
      } catch (e) {
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
    const getKey = typeof key === "function" ? key : (item) => item == null ? void 0 : item[key];
    for (const item of list) {
      const k = String(getKey(item));
      (out[k] || (out[k] = [])).push(item);
    }
    return out;
  }
  function unique(list, key) {
    if (!key) return [...new Set(list)];
    const getKey = typeof key === "function" ? key : (item) => item == null ? void 0 : item[key];
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
    const getKey = typeof key === "function" ? key : (item) => item == null ? void 0 : item[key];
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
    return current2 != null ? current2 : fallback;
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
    const value = String(text != null ? text : "");
    if (value.length <= length) return value;
    return value.slice(0, Math.max(0, length - suffix.length)).trimEnd() + suffix;
  }
  function capitalize(text) {
    const value = String(text != null ? text : "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  function titleCase(text) {
    return String(text != null ? text : "").replace(/\w\S*/g, (word) => capitalize(word.toLowerCase()));
  }
  function escapeHtml(text) {
    return String(text != null ? text : "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function stripTags(html) {
    return String(html != null ? html : "").replace(/<\/?[^>]+(>|$)/g, "");
  }
  var defaultLocale = "pt-BR";
  var defaultCurrency = "BRL";
  function setFormatDefaults(locale, currency) {
    if (locale) defaultLocale = locale;
    if (currency) defaultCurrency = currency;
  }
  function formatCurrency(value, options = {}) {
    var _a2, _b;
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (n == null || Number.isNaN(n)) return "";
    return new Intl.NumberFormat((_a2 = options.locale) != null ? _a2 : defaultLocale, {
      style: "currency",
      currency: (_b = options.currency) != null ? _b : defaultCurrency
    }).format(n);
  }
  function formatNumber(value, options = {}) {
    const n = typeof value === "string" ? parseFloat(value) : value;
    if (n == null || Number.isNaN(n)) return "";
    const { locale, ...rest } = options;
    return new Intl.NumberFormat(locale != null ? locale : defaultLocale, rest).format(n);
  }
  function formatDate(value, format = "short", locale) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const loc = locale != null ? locale : defaultLocale;
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
    const rtf = new Intl.RelativeTimeFormat(locale != null ? locale : defaultLocale, { numeric: "auto" });
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
    return new Intl.NumberFormat(locale != null ? locale : defaultLocale, {
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
    } catch (e) {
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
      var _a2, _b;
      return (_b = (_a2 = this.response) == null ? void 0 : _a2.status) != null ? _b : 0;
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
    var _a2;
    return `${(_a2 = config2.method) != null ? _a2 : "GET"} ${buildURL(config2)}`;
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
    } catch (e) {
      return [];
    }
  }
  function writeQueue(list) {
    try {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(list));
    } catch (e) {
    }
  }
  function enqueueOffline(config2) {
    var _a2, _b;
    if (typeof localStorage === "undefined") return;
    const list = readQueue();
    list.push({
      url: buildURL(config2),
      method: (_a2 = config2.method) != null ? _a2 : "POST",
      body: config2.body,
      headers: (_b = config2.headers) != null ? _b : {},
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
      } catch (e) {
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
    var _a2;
    if (typeof document === "undefined") return null;
    const meta = document.querySelector(`meta[name="${defaults.csrfMeta}"]`);
    return (_a2 = meta == null ? void 0 : meta.getAttribute("content")) != null ? _a2 : null;
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
    var _a2;
    if (METODOS_SEGUROS.has(method)) return true;
    if (config2.retryUnsafe === true) return true;
    if (temChaveDeIdempotencia(headers)) return true;
    if (((_a2 = config2.retry) != null ? _a2 : 0) > 0) {
      warnOnce(
        `http:retry-unsafe:${method} ${url2}`,
        `retry ignored on ${method} ${url2}: retrying a method that changes state may apply the same operation twice if the response is lost in transit. Allow with retryUnsafe: true or send an Idempotency-Key header.`
      );
    }
    return false;
  }
  async function request(input) {
    var _a2, _b, _c, _d, _e;
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
    const method = ((_a2 = config2.method) != null ? _a2 : "GET").toUpperCase();
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
    const attempts = podeRepetir(method, config2, headers, url2) ? ((_b = config2.retry) != null ? _b : 0) + 1 : 1;
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
            await wait(((_c = config2.retryDelay) != null ? _c : 500) * 2 ** attempt);
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
        const aborted = (err == null ? void 0 : err.name) === "AbortError" && ((_d = config2.signal) == null ? void 0 : _d.aborted);
        if (aborted) break;
        if (attempt < attempts - 1) {
          await wait(((_e = config2.retryDelay) != null ? _e : 500) * 2 ** attempt);
          continue;
        }
      }
    }
    const message = (lastError == null ? void 0 : lastError.name) === "TimeoutError" ? `Timeout after ${config2.timeout}ms` : `Network failure accessing ${url2}`;
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
        var _a2, _b;
        const xhr = new XMLHttpRequest();
        const finalUrl = buildURL({ url: url2 });
        xhr.open((_a2 = options.method) != null ? _a2 : "POST", finalUrl);
        for (const [key, value] of Object.entries({ ...defaults.headers, ...options.headers })) {
          if (key.toLowerCase() === "content-type") continue;
          xhr.setRequestHeader(key, value);
        }
        const token = csrfToken();
        if (token) xhr.setRequestHeader(defaults.csrfHeader, token);
        xhr.upload.addEventListener("progress", (event) => {
          var _a3;
          if (!event.lengthComputable) return;
          (_a3 = options.onProgress) == null ? void 0 : _a3.call(
            options,
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
            } catch (e) {
            }
          }
          if (xhr.status >= 200 && xhr.status < 300) resolve2(data3);
          else reject(new HttpError(`Upload failed with status ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new HttpError("Network failure during upload")));
        xhr.addEventListener("abort", () => reject(new HttpError("Upload canceled")));
        (_b = options.signal) == null ? void 0 : _b.addEventListener("abort", () => xhr.abort());
        xhr.send(data2);
      });
    },
    /** Server-Sent Events with automatic reconnection by the browser. */
    sse(url2, handlers = {}) {
      const source = new EventSource(buildURL({ url: url2 }));
      source.addEventListener("message", (event) => {
        var _a2;
        let data2 = event.data;
        try {
          data2 = JSON.parse(event.data);
        } catch (e) {
        }
        (_a2 = handlers.message) == null ? void 0 : _a2.call(handlers, data2, event);
      });
      if (handlers.error) source.addEventListener("error", handlers.error);
      return source;
    },
    /** Read a streaming response line by line (NDJSON). */
    async stream(url2, onLine, options = {}) {
      var _a2;
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
        buffer = (_a2 = lines.pop()) != null ? _a2 : "";
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
    var _a2, _b, _c, _d;
    const position = (_a2 = options.position) != null ? _a2 : settings.position;
    const type = (_b = options.type) != null ? _b : "default";
    const duration = (_c = options.duration) != null ? _c : type === "loading" ? 0 : settings.duration;
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
        var _a3;
        element.remove();
        (_a3 = options.onClose) == null ? void 0 : _a3.call(options);
        if (!parent.children.length) {
          parent.remove();
          containers.delete(position);
        }
      }, 220);
    };
    const paint = (current2) => {
      var _a3, _b2, _c2, _d2;
      const currentType = (_a3 = current2.type) != null ? _a3 : type;
      element.setAttribute("data-type", currentType);
      if (current2.html) {
        element.innerHTML = current2.html;
      } else {
        element.textContent = "";
        const icon = document.createElement("span");
        icon.className = "v-toast-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = (_b2 = ICONS[currentType]) != null ? _b2 : "";
        element.appendChild(icon);
        const body = document.createElement("div");
        body.className = "v-toast-body";
        const title = document.createElement("div");
        title.className = "v-toast-title";
        title.textContent = (_c2 = current2.title) != null ? _c2 : "";
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
            var _a4;
            (_a4 = current2.action) == null ? void 0 : _a4.onClick();
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
      const currentDuration = (_d2 = current2.duration) != null ? _d2 : duration;
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
    while (parent.children.length > settings.max) (_d = parent.firstElementChild) == null ? void 0 : _d.remove();
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
        var _a3;
        paint({ ...options, ...next });
        if (next.duration !== void 0) schedule(next.duration);
        else if (((_a3 = next.type) != null ? _a3 : type) !== "loading") schedule(settings.duration);
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
      async promise(promise, messages = {}) {
        var _a2, _b, _c;
        const handle = render({ title: (_a2 = messages.loading) != null ? _a2 : "Loading...", type: "loading", duration: 0 });
        try {
          const value = await promise;
          handle.update({
            title: typeof messages.success === "function" ? messages.success(value) : (_b = messages.success) != null ? _b : "Done",
            type: "success",
            duration: settings.duration
          });
          return value;
        } catch (err) {
          handle.update({
            title: typeof messages.error === "function" ? messages.error(err) : (_c = messages.error) != null ? _c : "Something went wrong",
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
  init_reactivity();
  function createStorage(getStore, prefix = "") {
    const full = (key) => prefix + key;
    return {
      get(key, fallback) {
        var _a2;
        try {
          const raw = (_a2 = getStore()) == null ? void 0 : _a2.getItem(full(key));
          if (raw === null || raw === void 0) return fallback;
          try {
            return JSON.parse(raw);
          } catch (e) {
            return raw;
          }
        } catch (e) {
          return fallback;
        }
      },
      set(key, value) {
        var _a2;
        try {
          (_a2 = getStore()) == null ? void 0 : _a2.setItem(full(key), typeof value === "string" ? value : JSON.stringify(value));
          return true;
        } catch (e) {
          return false;
        }
      },
      remove(key) {
        var _a2;
        try {
          (_a2 = getStore()) == null ? void 0 : _a2.removeItem(full(key));
        } catch (e) {
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
        } catch (e) {
        }
      },
      has(key) {
        var _a2;
        try {
          return ((_a2 = getStore()) == null ? void 0 : _a2.getItem(full(key))) !== null;
        } catch (e) {
          return false;
        }
      },
      keys() {
        try {
          const store2 = getStore();
          if (!store2) return [];
          return Object.keys(store2).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length));
        } catch (e) {
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
      var _a2, _b;
      if (typeof document === "undefined") return;
      let text = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      if (options.expires !== void 0) {
        const date = typeof options.expires === "number" ? new Date(Date.now() + options.expires * 864e5) : options.expires;
        text += `; expires=${date.toUTCString()}`;
      }
      text += `; path=${(_a2 = options.path) != null ? _a2 : "/"}`;
      if (options.domain) text += `; domain=${options.domain}`;
      if (options.secure) text += "; secure";
      text += `; samesite=${(_b = options.sameSite) != null ? _b : "Lax"}`;
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
      var _a2;
      if (typeof location === "undefined") return fallback;
      return (_a2 = new URLSearchParams(location.search).get(key)) != null ? _a2 : fallback;
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
  var revision = ref(0);
  var theme = {
    /** Theme chosen by the user, or `system` when never set. */
    get current() {
      var _a2, _b;
      void revision.value;
      return (_b = (_a2 = storage.get(THEME_KEY)) != null ? _a2 : picked) != null ? _b : "system";
    },
    /** Theme effectively applied, resolving `system`. */
    get resolved() {
      const value = this.current;
      if (value !== "system") return value;
      if (typeof document !== "undefined") {
        const authored = document.documentElement.getAttribute("data-theme");
        if (authored === "light" || authored === "dark") return authored;
      }
      if (typeof matchMedia === "undefined") return "light";
      return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    set(value) {
      picked = value;
      storage.set(THEME_KEY, value);
      revision.value++;
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
      if (typeof MutationObserver !== "undefined") {
        new MutationObserver(() => {
          revision.value++;
        }).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"]
        });
      }
      if (typeof matchMedia === "undefined") return;
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        revision.value++;
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
    var _a2;
    if (typeof navigator === "undefined") return;
    network.online = navigator.onLine;
    const connection = navigator.connection;
    if (connection) {
      network.type = (_a2 = connection.effectiveType) != null ? _a2 : "unknown";
      network.saveData = !!connection.saveData;
      network.slow = connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
    }
  }
  var clipboard = {
    /** Copy text, with fallback for browsers without the modern API. */
    async copy(text) {
      var _a2;
      try {
        if ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {
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
      } catch (e) {
        return false;
      }
    },
    /** Read clipboard content, when the user allows. */
    async read() {
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        return "";
      }
    }
  };
  var installed = false;
  function installMagics() {
    var _a2, _b;
    if (installed) return;
    installed = true;
    magic("$el", (scope) => scope.el);
    magic("$refs", (scope) => scope.allRefs);
    magic("$data", (scope) => scope.data);
    magic("$root", (scope) => scope.root.data);
    magic("$parent", (scope) => {
      var _a3, _b2;
      return (_b2 = (_a3 = scope.parent) == null ? void 0 : _a3.data) != null ? _b2 : null;
    });
    magic("$self", (scope) => {
      var _a3, _b2;
      return (_b2 = (_a3 = scope.owner) == null ? void 0 : _a3.component) != null ? _b2 : scope.data;
    });
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
      var _a3;
      const target = (_a3 = scope.el) != null ? _a3 : document;
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
    (_b = (_a2 = navigator.connection) == null ? void 0 : _a2.addEventListener) == null ? void 0 : _b.call(
      _a2,
      "change",
      updateNetwork
    );
  }

  // src/hooks/index.ts
  init_reactivity();
  var tables = /* @__PURE__ */ new WeakMap();
  function tableFor(scope) {
    var _a2, _b, _c;
    const host = (_b = (_a2 = currentHookHost()) != null ? _a2 : scope.el) != null ? _b : scope;
    let table = tables.get(host);
    if (!table) {
      table = { slots: [], index: 0, scheduled: false, bound: false };
      tables.set(host, table);
    }
    const el = (_c = currentHookHost()) != null ? _c : scope.el;
    if (!table.bound && el) {
      table.bound = true;
      const owned = table;
      addCleanup(el, () => {
        for (const slot of owned.slots) {
          if (slot.dispose) slot.dispose();
          if (slot.runner) stop(slot.runner);
        }
        owned.slots.length = 0;
      });
    }
    if (!table.scheduled) {
      table.scheduled = true;
      const pending = table;
      queueMicrotask(() => {
        pending.index = 0;
        pending.scheduled = false;
      });
    }
    return table;
  }
  function nextSlot(scope, kind) {
    const table = tableFor(scope);
    const at = table.index++;
    let slot = table.slots[at];
    if (!slot || slot.kind !== kind) {
      if (slot) {
        if (slot.dispose) slot.dispose();
        if (slot.runner) stop(slot.runner);
      }
      slot = { kind, deps: null, value: void 0 };
      table.slots[at] = slot;
    }
    return slot;
  }
  function depsChanged(previous, next) {
    if (!previous || !next) return true;
    if (previous.length !== next.length) return true;
    for (let i = 0; i < next.length; i++) {
      if (!Object.is(previous[i], next[i])) return true;
    }
    return false;
  }
  function normalizeDeps(deps) {
    return Array.isArray(deps) ? deps.slice() : null;
  }
  function useState(scope, initial) {
    const slot = nextSlot(scope, "state");
    if (slot.value === void 0) slot.value = ref(initial);
    return slot.value;
  }
  function useEffect(scope, fn, deps) {
    const slot = nextSlot(scope, "effect");
    const next = normalizeDeps(deps);
    const runCleanup = () => {
      if (slot.dispose) {
        const dispose = slot.dispose;
        slot.dispose = void 0;
        dispose();
      }
    };
    if (next) {
      const first = slot.deps === null && !slot.runner;
      if (first || depsChanged(slot.deps, next)) {
        slot.deps = next;
        runCleanup();
        const result = fn();
        if (typeof result === "function") slot.dispose = result;
      }
      return;
    }
    if (slot.runner) return;
    slot.deps = null;
    slot.runner = effect(() => {
      runCleanup();
      const result = fn();
      if (typeof result === "function") slot.dispose = result;
    });
  }
  function useMemo(scope, fn, deps) {
    const slot = nextSlot(scope, "memo");
    const next = normalizeDeps(deps);
    if (!next) {
      if (!slot.value) slot.value = computed(fn);
      return slot.value;
    }
    if (!slot.value) {
      slot.value = ref(fn());
      slot.deps = next;
    } else if (depsChanged(slot.deps, next)) {
      slot.deps = next;
      slot.value.value = fn();
    }
    return slot.value;
  }
  function useRef(scope, initial) {
    const slot = nextSlot(scope, "ref");
    if (!slot.value) slot.value = markRaw({ current: initial });
    return slot.value;
  }
  function useContext(name, initial) {
    if (initial !== void 0 && !(name in allStores)) {
      store(name, initial);
    }
    return allStores[name];
  }
  function installHooks() {
    hook("useState", (scope) => (initial) => useState(scope, initial));
    hook(
      "useEffect",
      (scope) => (fn, deps) => useEffect(scope, fn, deps)
    );
    hook(
      "useMemo",
      (scope) => (fn, deps) => useMemo(scope, fn, deps)
    );
    hook("useRef", (scope) => (initial) => useRef(scope, initial));
    hook(
      "useContext",
      () => (name, initial) => useContext(name, initial)
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
    var _a2;
    const data2 = (_a2 = error.response) == null ? void 0 : _a2.data;
    if (!data2 || typeof data2 !== "object") return null;
    for (const key of ["message", "error", "detail", "msg"]) {
      const value = data2[key];
      if (typeof value === "string") return value;
    }
    return null;
  }
  function createResource(url2, options = {}) {
    const resolveUrl = () => typeof url2 === "function" ? url2() : url2;
    const resolveParams = () => typeof options.params === "function" ? options.params() : options.params;
    let controller = null;
    let timer = null;
    const resource = reactive({
      data: null,
      loading: false,
      error: null,
      loaded: false,
      async reload() {
        var _a2, _b, _c, _d, _e;
        const endereco = resolveUrl();
        if (!endereco) return;
        controller == null ? void 0 : controller.abort();
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
            retry: (_a2 = options.retry) != null ? _a2 : 0,
            timeout: (_b = options.timeout) != null ? _b : http.defaults.timeout,
            signal: atual.signal
          });
          if (atual.signal.aborted) return;
          resource.data = pick(response.data, options.jsonPath);
          resource.loaded = true;
          (_c = options.onSuccess) == null ? void 0 : _c.call(options, resource.data);
        } catch (err) {
          if (atual.signal.aborted) return;
          const message = err instanceof HttpError ? (_d = extractMessage(err)) != null ? _d : err.message : err.message;
          resource.error = { name: "ResourceError", message };
          (_e = options.onError) == null ? void 0 : _e.call(options, err, message);
        } finally {
          if (!atual.signal.aborted) resource.loading = false;
          if (controller === atual) controller = null;
        }
      },
      set(value) {
        resource.data = value;
      },
      stop() {
        controller == null ? void 0 : controller.abort();
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
        var _a2;
        removeClasses(el, c.enterFrom);
        addClasses(el, c.enterTo);
        const duration = (_a2 = options.duration) != null ? _a2 : readDuration(el);
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
        var _a2;
        removeClasses(el, c.leaveFrom);
        addClasses(el, c.leaveTo);
        const duration = (_a2 = options.duration) != null ? _a2 : readDuration(el);
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
      var _a2;
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
      (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(anchor, el);
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
      var _a2;
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
      (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(anchor, el);
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
        var _a3, _b, _c;
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
        if (batch.fragment.firstChild) (_a3 = anchor.parentNode) == null ? void 0 : _a3.insertBefore(batch.fragment, anchor);
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
            for (const node of block2.nodes) (_b = anchor.parentNode) == null ? void 0 : _b.insertBefore(node, cursor);
          }
          cursor = (_c = block2.nodes[0]) != null ? _c : cursor;
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
      void expression;
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
      var _a2, _b;
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
        { threshold: Number((_a2 = modifiers.threshold) != null ? _a2 : 0.1), rootMargin: String((_b = modifiers.margin) != null ? _b : "0px") }
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
    var _a2;
    const eventName = (_a2 = EVENT_ALIASES[rawEventName]) != null ? _a2 : rawEventName;
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
        var _a2, _b;
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
          value = modifiers.single ? (_b = (_a2 = input.files) == null ? void 0 : _a2[0]) != null ? _b : null : input.files;
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
      var _a2;
      const name = expression.trim();
      if (!name) return;
      const target = (_a2 = scope.owner) != null ? _a2 : scope;
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
    void effect2;
    const value = ev();
    if (value !== void 0) el.textContent = stringify(value);
  });
  defineDirective(
    "teleport",
    ({ el, expression, cleanup }) => {
      var _a2;
      const selector = expression.trim() || "body";
      const target = selector === "body" ? document.body : document.querySelector(selector);
      if (!target) {
        handleError(new Error(`v-teleport destination not found: ${selector}`), "v-teleport");
        return;
      }
      const placeholder = document.createComment(" v-teleport ");
      (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(placeholder, el);
      target.appendChild(el);
      cleanup(() => {
        var _a3;
        (_a3 = placeholder.parentNode) == null ? void 0 : _a3.insertBefore(el, placeholder);
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
    var _a2, _b, _c;
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
      cacheMs: parseDuration((_a2 = attr(el, "cache")) != null ? _a2 : void 0, 0),
      retry: Number((_b = attr(el, "retry")) != null ? _b : 0),
      timeout: parseDuration((_c = attr(el, "timeout")) != null ? _c : void 0, http.defaults.timeout),
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
    var _a2, _b;
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
        const before = new Set(Array.from((_b = (_a2 = target.parentElement) == null ? void 0 : _a2.childNodes) != null ? _b : []));
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
    var _a2, _b, _c, _d, _e;
    const { el, scope, method } = options;
    const settings2 = readSettings(el, scope);
    const dialogHandlesTheQuestion = directives.has(`confirm`);
    if (settings2.confirmMessage && !dialogHandlesTheQuestion) {
      const confirmed = await askConfirmation(settings2.confirmMessage);
      if (!confirmed) return;
    }
    (_a2 = inFlight.get(el)) == null ? void 0 : _a2.abort();
    const controller = new AbortController();
    inFlight.set(el, controller);
    const target = (_b = settings2.target) != null ? _b : el;
    const submitButton = el instanceof HTMLFormElement ? el.querySelector('[type="submit"], button:not([type])') : null;
    const startLoading = () => {
      el.classList.add(settings2.loadingClass);
      el.setAttribute("aria-busy", "true");
      if (settings2.loadingTarget) settings2.loadingTarget.style.removeProperty("display");
      if (settings2.disableWhileLoading) {
        const button = submitButton != null ? submitButton : el;
        if ("disabled" in button) button.disabled = true;
      }
    };
    const stopLoading = () => {
      el.classList.remove(settings2.loadingClass);
      el.removeAttribute("aria-busy");
      if (settings2.loadingTarget) settings2.loadingTarget.style.display = "none";
      if (settings2.disableWhileLoading) {
        const button = submitButton != null ? submitButton : el;
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
        headers: settings2.headers,
        timeout: settings2.timeout,
        retry: settings2.retry,
        cache: settings2.cacheMs || void 0,
        signal: controller.signal,
        offlineQueue: settings2.offlineQueue
      });
      const data2 = pick(response.data, settings2.jsonPath);
      if (settings2.storeAs) {
        scope.set(settings2.storeAs, data2);
      } else if (settings2.templateSelector) {
        renderWithTemplate(settings2.templateSelector, data2, scope, target);
      } else if (typeof data2 === "string") {
        swapContent(target, data2, settings2.swap, scope);
      } else if (data2 !== void 0 && data2 !== null) {
        injectJSONStyles();
        swapContent(target, renderJSON(data2), settings2.swap, scope);
      }
      if (settings2.toastSuccess) toast.success(settings2.toastSuccess);
      if (settings2.onSuccess) {
        callHandler(settings2.onSuccess, scope, el, { data: data2, response });
      }
      dispatch(el, "voodoo:success", { data: data2, response });
      if (settings2.scrollTo) {
        (_c = document.querySelector(settings2.scrollTo)) == null ? void 0 : _c.scrollIntoView({ behavior: "smooth" });
      }
      if (settings2.redirect) {
        location.assign(settings2.redirect);
      }
    } catch (err) {
      if ((err == null ? void 0 : err.name) === "AbortError") return;
      const message = err instanceof HttpError ? (_d = extractMessage(err)) != null ? _d : err.message : (_e = err == null ? void 0 : err.message) != null ? _e : "Unknown error";
      if (settings2.toastError) toast.error(settings2.toastError);
      else if (!settings2.onError) toast.error(message);
      if (settings2.onError) callHandler(settings2.onError, scope, el, { error: err, message });
      dispatch(el, "voodoo:error", { error: err, message });
      handleError(err, `request ${method} ${options.url}`);
    } finally {
      stopLoading();
      inFlight.delete(el);
      if (settings2.onComplete) callHandler(settings2.onComplete, scope, el, {});
      dispatch(el, "voodoo:complete", {});
    }
  }
  function dispatch(el, type, detail) {
    el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
  function callHandler(expression, scope, el, extra) {
    var _a2;
    const local = scope.child({ $el: el, ...extra });
    const value = evaluateIn(expression, local, "HTTP callback");
    if (typeof value === "function") value.call(scope.data, (_a2 = extra.data) != null ? _a2 : extra.error);
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
    var _a2, _b;
    const declared = attr(el, "trigger") || defaultTrigger(el);
    const [name, ...modifiers] = declared.split(/[.\s]+/);
    const pollEvery = parseDuration((_a2 = attr(el, "poll")) != null ? _a2 : void 0, 0);
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
    const delay = parseDuration((_b = attr(el, "debounce")) != null ? _b : void 0, 0);
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
      installTrigger({ el, scope, cleanup, run });
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
    var _a2, _b;
    const input = el;
    const url2 = resolveURL(expression, scope);
    const paramName = attr(el, "param") || input.getAttribute("name") || "q";
    const wait2 = parseDuration((_a2 = attr(el, "debounce")) != null ? _a2 : void 0, 300);
    const minLength = Number((_b = attr(el, "min-length")) != null ? _b : 0);
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
      var _a2, _b, _c, _d;
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
        cache: parseDuration((_a2 = attr(el, "cache")) != null ? _a2 : void 0, 0) || void 0,
        retry: Number((_b = attr(el, "retry")) != null ? _b : 0),
        timeout: parseDuration((_c = attr(el, "timeout")) != null ? _c : void 0, http.defaults.timeout),
        jsonPath: attr(el, "json-path"),
        poll: parseDuration((_d = attr(el, "poll")) != null ? _d : void 0, 0),
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
  installHooks();
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
    var _a2;
    if (!handler) {
      eventBus.delete(name);
      return;
    }
    (_a2 = eventBus.get(name)) == null ? void 0 : _a2.delete(handler);
  }
  function directive(name, definition) {
    var _a2, _b;
    const hooks2 = typeof definition === "function" ? { mounted: definition, updated: definition } : definition;
    defineDirective(
      name,
      (ctx) => {
        var _a3, _b2;
        let oldValue;
        let mounted = false;
        const makeBinding = (value) => {
          var _a4, _b3;
          return {
            el: ctx.el,
            value,
            oldValue,
            arg: ctx.arg,
            modifiers: ctx.modifiers,
            expression: ctx.expression,
            scope: ctx.scope,
            instance: (_b3 = (_a4 = ctx.scope.owner) == null ? void 0 : _a4.component) != null ? _b3 : null
          };
        };
        const initial = hooks2.raw ? ctx.expression : ctx.evaluate();
        (_a3 = hooks2.created) == null ? void 0 : _a3.call(hooks2, ctx.el, makeBinding(initial));
        (_b2 = hooks2.beforeMount) == null ? void 0 : _b2.call(hooks2, ctx.el, makeBinding(initial));
        ctx.effect(() => {
          var _a4, _b3;
          const value = hooks2.raw ? ctx.expression : ctx.evaluate();
          if (!mounted) {
            mounted = true;
            oldValue = value;
            (_a4 = hooks2.mounted) == null ? void 0 : _a4.call(hooks2, ctx.el, makeBinding(value));
            return;
          }
          if (value === oldValue) return;
          const binding = makeBinding(value);
          (_b3 = hooks2.updated) == null ? void 0 : _b3.call(hooks2, ctx.el, binding);
          oldValue = value;
        });
        ctx.cleanup(() => {
          var _a4, _b3;
          const binding = makeBinding(oldValue);
          (_a4 = hooks2.beforeUnmount) == null ? void 0 : _a4.call(hooks2, ctx.el, binding);
          (_b3 = hooks2.unmounted) == null ? void 0 : _b3.call(hooks2, ctx.el, binding);
        });
      },
      { priority: (_a2 = hooks2.priority) != null ? _a2 : PRIORITY.DEFAULT, terminal: (_b = hooks2.terminal) != null ? _b : false }
    );
  }
  function data(values) {
    Object.defineProperties(rootScope.data, Object.getOwnPropertyDescriptors(values));
    return rootScope.data;
  }
  var version2 = "0.12.1";
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
    return String(value != null ? value : "").split(/\s+/).filter(Boolean);
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
        } catch (e) {
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
      } catch (e) {
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
        } catch (e) {
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
      var _a2, _b;
      if (!rest.length) return (_b = (_a2 = this.elements[0]) == null ? void 0 : _a2.textContent) != null ? _b : "";
      const value = rest[0];
      const text = value == null ? "" : String(value);
      for (const el of this.elements) {
        for (const child of Array.from(el.childNodes)) destroy(child);
        el.textContent = text;
      }
      return this;
    }
    html(...rest) {
      var _a2, _b;
      if (!rest.length) return (_b = (_a2 = this.elements[0]) == null ? void 0 : _a2.innerHTML) != null ? _b : "";
      const value = rest[0];
      const text = value == null ? "" : String(value);
      for (const el of this.elements) {
        for (const child of Array.from(el.childNodes)) destroy(child);
        el.innerHTML = text;
      }
      return this;
    }
    val(...rest) {
      var _a2;
      if (!rest.length) {
        const field = this.elements[0];
        if (!field) return "";
        const select = field;
        if (field.tagName === "SELECT" && select.multiple) {
          return Array.from(select.selectedOptions).map((option) => option.value);
        }
        if (field.type === "checkbox") return field.checked ? field.value || "on" : "";
        return (_a2 = field.value) != null ? _a2 : "";
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
      var _a2, _b;
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
      if (rest.length < 2) return (_b = (_a2 = this.elements[0]) == null ? void 0 : _a2.getAttribute(name)) != null ? _b : void 0;
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
            el.dataset[datasetKey(key2)] = typeof value2 === "string" ? value2 : JSON.stringify(value2 != null ? value2 : null);
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
        el.dataset[key] = typeof value === "string" ? value : JSON.stringify(value != null ? value : null);
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
      var _a2, _b;
      if (!rest.length) return (_b = (_a2 = this.elements[0]) == null ? void 0 : _a2.scrollTop) != null ? _b : 0;
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
      return this.insert(content, (el, node) => {
        var _a2;
        return (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(node, el);
      });
    }
    /** Inserts content after each element. */
    after(content) {
      return this.insert(content, (el, node) => {
        var _a2;
        return (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(node, el.nextSibling);
      });
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
      var _a2;
      for (const el of this.elements) {
        const model = resolve(wrapper)[0];
        if (!model) continue;
        const clone2 = model.cloneNode(true);
        (_a2 = el.parentNode) == null ? void 0 : _a2.insertBefore(clone2, el);
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
      var _a2;
      const delegated = typeof rest[0] === "string";
      const selector = delegated ? rest[0] : null;
      const handler = delegated ? rest[1] : rest[0];
      const options = (_a2 = delegated ? rest[2] : rest[1]) != null ? _a2 : {};
      if (typeof handler !== "function") return this;
      for (const el of this.elements) {
        for (const type of names(types)) {
          const wrapped = (event) => {
            if (!selector) {
              handler.call(el, event);
              return;
            }
            const start2 = event.target;
            const matched = start2 == null ? void 0 : start2.closest(selector);
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
      const wantedHandler = typeof selectorOrHandler === "function" ? selectorOrHandler : handler != null ? handler : null;
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
      var _a2;
      (_a2 = this.elements[0]) == null ? void 0 : _a2.scrollIntoView(options);
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
      var _a2, _b, _c, _d;
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
            out[key] = (_a2 = out[key]) != null ? _a2 : false;
            continue;
          }
          if (!field.checked) continue;
          value = field.value === "on" ? true : field.value;
        } else if (type === "radio") {
          if (!field.checked) continue;
          value = field.value;
        } else if (type === "file") {
          value = field.multiple ? Array.from((_b = field.files) != null ? _b : []) : (_d = (_c = field.files) == null ? void 0 : _c[0]) != null ? _d : null;
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
      var _a2;
      (_a2 = this.elements[0]) == null ? void 0 : _a2.focus(options);
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
          fn == null ? void 0 : fn();
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

  // src/minimo.ts
  var V = ((input, context) => query(input, context));
  Object.assign(V, core, {
    query,
    ready,
    fromHtml,
    Collection: VoodooCollection,
    magic
  });
  var minimo_default = V;

  // src/bootstrap.ts
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
    const text = String(input != null ? input : "").trim();
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
    var _a2;
    const rgb = typeof color === "string" ? (_a2 = parseColor(color)) != null ? _a2 : BLACK : color;
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
    const name = (font != null ? font : "").trim();
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
    var _a2, _b, _c, _d;
    const vars = {};
    const scales = {};
    const contrast = {};
    for (const role of ROLES) {
      const rgb = (_a2 = parseColor(colors[role])) != null ? _a2 : BLACK;
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
    const neutralRgb = (_c = parseColor((_b = colors.neutral) != null ? _b : colors.primary)) != null ? _c : BLACK;
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
    contrast.surface = contrastText((_d = parseColor(vars["--v-surface"])) != null ? _d : WHITE);
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
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
    const preset = (_a2 = presets[options.preset]) != null ? _a2 : presets.violeta;
    const colors = {
      primary: (_b = options.primary) != null ? _b : preset.primary,
      accent: (_c = options.accent) != null ? _c : preset.accent,
      success: (_d = options.success) != null ? _d : preset.success,
      warning: (_e = options.warning) != null ? _e : preset.warning,
      danger: (_f = options.danger) != null ? _f : preset.danger,
      info: (_g = options.info) != null ? _g : preset.info,
      neutral: (_h = options.neutral) != null ? _h : preset.neutral
    };
    for (const role of ROLES) {
      if (parseColor(colors[role])) continue;
      console.warn(`[Voodoo] invalid color in palette.${role}: "${colors[role]}". Using preset.`);
      colors[role] = preset[role];
    }
    return {
      colors,
      radius: (_i = options.radius) != null ? _i : "12px",
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
  function applySavedPalette() {
    return initPalette();
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
      return applyPalette({ ...currentOptions != null ? currentOptions : {}, preset: name, primary: void 0, accent: void 0 });
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

  // src/bootstrap.ts
  function readDevtoolsFlag(script) {
    if (window.VOODOO_DEVTOOLS === true) return true;
    for (const name of ["devtools", "data-devtools"]) {
      if (!script.hasAttribute(name)) continue;
      const value = script.getAttribute(name);
      return value === null || value === "" || value.toLowerCase() !== "false";
    }
    return false;
  }
  function readScriptOptions() {
    var _a2;
    if (typeof document === "undefined") return { manual: false };
    const script = (_a2 = document.currentScript) != null ? _a2 : document.querySelector('script[src*="voodoo"]');
    if (!script) return { manual: false };
    const manual = script.hasAttribute("data-manual") || script.hasAttribute("data-defer-init");
    const prefix = script.getAttribute("data-prefix");
    if (prefix) config.prefix = prefix;
    const baseURL = script.getAttribute("data-base-url");
    if (baseURL) config.baseURL = baseURL;
    const locale = script.getAttribute("data-locale");
    if (locale) config.locale = locale;
    if (readDevtoolsFlag(script)) config.devtools = true;
    const xrayShortcut = script.getAttribute("data-xray-shortcut");
    if (xrayShortcut !== null) {
      config.xrayShortcut = xrayShortcut === "false" || xrayShortcut === "" ? false : xrayShortcut;
    }
    if (script.hasAttribute("data-no-styles")) config.injectStyles = false;
    if (script.hasAttribute("data-no-observer")) config.autoDiscover = false;
    if (script.hasAttribute("data-keep-attributes")) config.cleanAttributes = false;
    return { manual };
  }
  function mountDevtools(V2) {
    if (typeof V2.devtoolsWidget === "function") {
      V2.devtoolsWidget(true);
      return;
    }
    console.info(
      "[Voodoo] devtools requested, but this build does not include the inspector. Use voodoo.full.min.js to get the widget and full devtools panel."
    );
  }
  function bootstrap(V2) {
    var _a2;
    if (typeof window === "undefined") return;
    const options = readScriptOptions();
    const globalScope = window;
    globalScope.V = V2;
    globalScope.Voodoo = V2;
    allowedGlobals.V = V2;
    allowedGlobals.Voodoo = V2;
    if (config.baseURL && ((_a2 = V2.http) == null ? void 0 : _a2.setBaseURL)) V2.http.setBaseURL(config.baseURL);
    if (options.manual || !config.autoStart) return;
    const boot = () => {
      theme.init();
      applySavedPalette();
      V2.start();
      if (typeof V2.enableXrayShortcut === "function") V2.enableXrayShortcut();
      if (config.devtools) mountDevtools(V2);
    };
    whenReady(boot);
  }

  // src/browser-minimo.ts
  bootstrap(minimo_default);
  var browser_minimo_default = minimo_default;
  return __toCommonJS(browser_minimo_exports);
})();
if(typeof window!=="undefined"){window.V=Voodoo.default||Voodoo;window.Voodoo=window.V;}
//# sourceMappingURL=voodoo.core.js.map