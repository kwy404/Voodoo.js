/**
 * Voodoo.js v1.0.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */
"use strict";
var VoodooPlayground = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // src/playground/index.ts
  var playground_exports = {};
  __export(playground_exports, {
    CDN_RUNTIME: () => CDN_RUNTIME,
    DEFAULT_CSS: () => DEFAULT_CSS,
    DEFAULT_SANDBOX: () => DEFAULT_SANDBOX,
    createRunner: () => createRunner,
    defaultRuntime: () => defaultRuntime,
    preset: () => preset,
    presets: () => presets,
    previewDocument: () => previewDocument
  });

  // src/playground/presets.ts
  var counter = `<div v-data="{ count: 0 }">
  <h2>Counter</h2>
  <p><strong>{ count }</strong> { count === 1 ? 'click' : 'clicks' }</p>

  <button @click="count--">Less</button>
  <button @click="count++">More</button>
  <button @click="count = 0" :disabled="count === 0">Reset</button>

  <p v-show="count >= 10">Double digits. Keep going.</p>
</div>
`;
  var todo = `<div v-data="{
  draft: '',
  nextId: 3,
  todos: [
    { id: 1, text: 'Try the counter example', done: true },
    { id: 2, text: 'Add a todo of your own', done: false }
  ]
}">
  <h2>Todo list</h2>

  <form @submit.prevent="if (draft.trim()) { todos.push({ id: nextId++, text: draft.trim(), done: false }); draft = '' }">
    <input v-model="draft" placeholder="What needs doing?" aria-label="New todo">
    <button>Add</button>
  </form>

  <ul>
    <li v-for="todo in todos" :key="todo.id">
      <label>
        <input type="checkbox" v-model="todo.done">
        <s v-if="todo.done">{ todo.text }</s>
        <span v-else>{ todo.text }</span>
      </label>
      <button @click="todos.splice(todos.indexOf(todo), 1)">Remove</button>
    </li>
  </ul>

  <p v-if="todos.length === 0">Nothing left to do. Add something above.</p>
  <p v-else>{ todos.filter((t) => !t.done).length } of { todos.length } still open</p>
</div>
`;
  var form = `<form v-validate v-data="{ name: '', email: '', sent: false }" @submit.prevent="sent = true">
  <h2>Sign up</h2>

  <p>
    <label>Name<br>
      <input name="name" v-model="name" v-required v-minlength="2">
    </label>
  </p>
  <p>
    <label>Email<br>
      <input name="email" type="email" v-model="email" v-required v-email>
    </label>
  </p>

  <button>Create account</button>

  <p v-if="sent" role="status">
    Welcome, { name }! Nothing was sent anywhere: this form only checks its fields.
  </p>
</form>
`;
  var fetchUsers = `<div v-resource="users: https://jsonplaceholder.typicode.com/users">
  <h2>Users from an API</h2>
  <button @click="users.reload()" :disabled="users.loading">
    { users.loading ? 'Loading...' : 'Reload' }
  </button>

  <p v-if="users.error" role="alert">Could not load the users: { users.error.message }</p>
  <p v-else-if="!users.loaded">Loading...</p>
  <p v-else-if="users.data.length === 0">The API answered with no users.</p>
  <ul v-else>
    <li v-for="user in users.data" :key="user.id">
      <strong>{ user.name }</strong>, { user.email }
    </li>
  </ul>
</div>
`;
  var presets = [
    {
      id: "counter",
      title: "Counter",
      description: "State, events and a bound attribute, in one element.",
      code: counter
    },
    {
      id: "todo",
      title: "Todo list",
      description: "Add, check off and remove items, with a message when the list is empty.",
      code: todo
    },
    {
      id: "form",
      title: "Form with validation",
      description: "Rules written on the fields; the submit waits until every field passes.",
      code: form
    },
    {
      id: "fetch",
      title: "Fetching data",
      description: "A request with its loading, error and empty states, and a reload button.",
      code: fetchUsers
    }
  ];
  for (const entry of presets) Object.freeze(entry);
  Object.freeze(presets);
  function preset(id) {
    const wanted = String(id).trim().toLowerCase();
    return presets.find((p) => p.id === wanted);
  }

  // src/playground/index.ts
  var PINNED_RUNTIME = "https://cdn.jsdelivr.net/npm/voodoojs@1.0.0/dist/voodoo.full.min.js";
  var CDN_RUNTIME = true ? PINNED_RUNTIME.replace(/@[\d.]+\//, `@${"1.1.0"}/`) : PINNED_RUNTIME;
  var ownScript = typeof document !== "undefined" && document.currentScript ? document.currentScript.src || "" : "";
  function defaultRuntime(scriptUrl = ownScript) {
    const match = /^(.*\/)voodoo\.playground(?:\.min)?\.js(?:[?#].*)?$/.exec(scriptUrl);
    return match ? `${match[1]}voodoo.full.min.js` : CDN_RUNTIME;
  }
  var DEFAULT_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";
  var DEFAULT_CSS = ':root{color-scheme:light;--bg:#fff;--text:#14111f;--muted:#6b6580;--border:#d9d2e8;--accent:#6d3bf5;--danger:#c0264b}:root[data-theme="dark"]{color-scheme:dark;--bg:#14111f;--text:#f4f1fb;--muted:#a9a2c4;--border:#3a3358;--accent:#9b7bff;--danger:#ff7a93}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#14111f;--text:#f4f1fb;--muted:#a9a2c4;--border:#3a3358;--accent:#9b7bff;--danger:#ff7a93}}body{margin:0;padding:16px;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}h1,h2,h3{margin:0 0 .5em;line-height:1.2}button,input,select,textarea{font:inherit;color:inherit;background:transparent;padding:.4rem .75rem;border:1px solid var(--border);border-radius:.5rem}input[type=checkbox],input[type=radio]{padding:0;accent-color:var(--accent)}button{cursor:pointer}button:hover:not(:disabled){border-color:var(--accent)}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:2px solid var(--accent);outline-offset:2px}ul{padding-left:1.25rem}li{margin:.25rem 0}a{color:var(--accent)}s{color:var(--muted)}.v-invalid{border-color:var(--danger)}.v-error-message{color:var(--danger);font-size:.875em}';
  function attribute(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function themeName(value) {
    return value === "light" || value === "dark" ? value : null;
  }
  function bridgeScript(channel, run, runtime, showErrors) {
    const settings = JSON.stringify({ c: channel, r: run, u: runtime, s: showErrors });
    return "(function(){var S=" + settings.replace(/</g, "\\u003c") + ',root=document.documentElement,box=null,seen={},count=0,early=[];function post(m){try{parent.postMessage(m,"*")}catch(e){}}function report(msg){msg=String(msg||"Unknown error");if(seen[msg])return;seen[msg]=1;count++;post({voodooPlayground:S.c,run:S.r,type:"error",message:msg});if(!S.s)return;if(!document.body){early.push(msg);return;}show(msg);}function show(msg){if(!box){box=document.createElement("div");box.setAttribute("role","alert");box.setAttribute("data-playground-errors","");box.style.cssText="position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;max-height:45%;overflow:auto;padding:10px 12px;border-radius:8px;border:1px solid #c0264b;background:#fff0f3;color:#5c0b1f;font:13px/1.45 system-ui,sans-serif";var b=document.createElement("b");b.textContent="Something went wrong";box.appendChild(b);document.body.appendChild(box);}var p=document.createElement("pre");p.style.cssText="margin:4px 0 0;white-space:pre-wrap;font:12px/1.45 ui-monospace,monospace";p.textContent=msg;box.appendChild(p);}window.__voodooPlaygroundError=report;addEventListener("message",function(e){var d=e.data;if(e.source!==parent||!d||d.voodooPlayground!==S.c||d.type!=="theme")return;if(d.theme==="light"||d.theme==="dark"){root.setAttribute("data-theme",d.theme);root.style.colorScheme=d.theme;}else{root.removeAttribute("data-theme");root.style.colorScheme="";}});addEventListener("error",function(e){var t=e.target;if(t&&t!==window&&t.tagName){if(t.tagName==="SCRIPT")report("Could not load "+t.src);return;}report(e.message||(e.error&&e.error.message))},true);addEventListener("unhandledrejection",function(e){var r=e.reason;report(r&&r.message?r.message:r)});var ce=console.error;console.error=function(a,b){ce.apply(console,arguments);if(typeof a==="string"&&a.indexOf("[Voodoo]")===0)report(a.replace(/^\\[Voodoo\\]\\s*/,"")+(b&&b.message?" "+b.message:""))};addEventListener("DOMContentLoaded",function(){var V=window.V;while(early.length)show(early.shift());if(V&&typeof V.start==="function"){try{V.start()}catch(e){report(e&&e.message?e.message:e)}}else report("Voodoo.js did not load from "+S.u)});addEventListener("load",function(){post({voodooPlayground:S.c,run:S.r,type:"ready",errors:count})});})();';
  }
  function previewDocument(code, options = {}) {
    var _a, _b, _c, _d, _e;
    const runtime = options.runtime || defaultRuntime();
    const theme = themeName(options.theme);
    const css = (_a = options.css) != null ? _a : DEFAULT_CSS;
    const open = "<script";
    const close = "</script>";
    let head = '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + open + ">" + bridgeScript((_b = options.channel) != null ? _b : "", (_c = options.run) != null ? _c : 0, runtime, options.showErrors !== false) + close;
    for (const href of (_d = options.stylesheets) != null ? _d : []) head += `<link rel="stylesheet" href="${attribute(href)}">`;
    if (css) head += `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
    head += `${open} src="${attribute(runtime)}" data-manual>${close}`;
    for (const src of (_e = options.scripts) != null ? _e : []) head += `${open} src="${attribute(src)}">${close}`;
    const rootAttributes = ` lang="${attribute(options.lang || "en")}"` + (theme ? ` data-theme="${theme}" style="color-scheme:${theme}"` : "");
    return `<!doctype html><html${rootAttributes}><head>${head}</head><body>${String(code != null ? code : "")}</body></html>`;
  }
  var runners = 0;
  function resolveTarget(target) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) throw new Error(`VoodooPlayground: nothing matches ${String(target)}.`);
    return el;
  }
  function checkSandbox(tokens) {
    const list = tokens.split(/\s+/).filter(Boolean);
    if (list.includes("allow-same-origin")) {
      throw new Error(
        'VoodooPlayground: "allow-same-origin" would let the code read and change this page. Leave it out of the sandbox.'
      );
    }
    return list.join(" ");
  }
  function createRunner(target, options = {}) {
    var _a, _b, _c;
    const host = resolveTarget(target);
    const sandbox = checkSandbox((_a = options.sandbox) != null ? _a : DEFAULT_SANDBOX);
    const channel = `vp${++runners}-${Math.random().toString(36).slice(2, 10)}`;
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", sandbox);
    frame.setAttribute("title", options.title || "Live preview");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.style.cssText = "display:block;width:100%;height:100%;border:0;background:transparent";
    let theme = themeName(options.theme);
    let code = "";
    let run = 0;
    let errors = [];
    let destroyed = false;
    const runner = {
      frame,
      get code() {
        return code;
      },
      get errors() {
        return errors.slice();
      },
      run(next) {
        if (destroyed) return;
        if (typeof next === "string") code = next;
        run++;
        errors = [];
        frame.srcdoc = previewDocument(code, { ...options, theme, channel, run });
      },
      setTheme(next) {
        theme = themeName(next);
        const win = frame.contentWindow;
        if (win) win.postMessage({ voodooPlayground: channel, type: "theme", theme }, "*");
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        window.removeEventListener("message", onMessage);
        frame.remove();
      }
    };
    function onMessage(event) {
      var _a2, _b2, _c2;
      if (event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || data.voodooPlayground !== channel || data.run !== run) return;
      if (data.type === "error") {
        const message = String((_a2 = data.message) != null ? _a2 : "Unknown error").slice(0, 2e3);
        if (errors.includes(message)) return;
        errors.push(message);
        (_b2 = options.onError) == null ? void 0 : _b2.call(options, message, runner);
      } else if (data.type === "ready") {
        (_c2 = options.onReady) == null ? void 0 : _c2.call(options, errors.length, runner);
      }
    }
    window.addEventListener("message", onMessage);
    host.appendChild(frame);
    const first = (_c = options.code) != null ? _c : options.preset ? (_b = preset(options.preset)) == null ? void 0 : _b.code : void 0;
    if (options.preset && first === void 0) {
      runner.destroy();
      throw new Error(
        `VoodooPlayground: there is no preset named "${options.preset}". Available: ${presets.map((p) => p.id).join(", ")}.`
      );
    }
    if (first !== void 0) runner.run(first);
    return runner;
  }
  return __toCommonJS(playground_exports);
})();
//# sourceMappingURL=voodoo.playground.js.map