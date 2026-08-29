/**
 * Voodoo.js v0.1.0
 * JavaScript feels like magic.
 * (c) 2026 Voodoo.js contributors. MIT License.
 */

// src/runtime/registry.ts
var config = {
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
var directives = /* @__PURE__ */ new Map();
var PRIORITY = {
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
function defineDirective(name, setup, options = {}) {
  directives.set(name, {
    name,
    setup,
    priority: options.priority ?? PRIORITY.DEFAULT,
    terminal: options.terminal ?? false
  });
}
var components = /* @__PURE__ */ new Map();
function normalizeComponentName(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}
var installedPlugins = /* @__PURE__ */ new Set();
function usePlugin(V, plugin, options) {
  if (installedPlugins.has(plugin)) return;
  installedPlugins.add(plugin);
  if (typeof plugin === "function") plugin(V, options);
  else plugin.install(V, options);
}

// src/dom/style.ts
var injected = /* @__PURE__ */ new Set();
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
var BASE_TOKENS = `
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
function ensureTokens() {
  injectStyle("tokens", BASE_TOKENS);
}

export { BASE_TOKENS, PRIORITY, components, config, defineDirective, directives, ensureTokens, injectStyle, normalizeComponentName, usePlugin };
//# sourceMappingURL=chunk-KQAVZ2II.js.map
//# sourceMappingURL=chunk-KQAVZ2II.js.map