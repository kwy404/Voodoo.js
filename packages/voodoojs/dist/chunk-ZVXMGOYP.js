/**
 * Voodoo.js v0.3.0
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
  cleanAttributes: true,
  sanitizeUrls: true
};
var directives = /* @__PURE__ */ new Map();
var PRIORITY = {
  IGNORE: 100,
  FOR: 90,
  IF: 80,
  DATA: 70,
  COMPONENT: 65,
  REF: 60,
  // O binding vem antes do modelo de proposito.
  //
  // `v-model` escreve o valor no campo, e `:min`, `:max` e `:step` mudam o que
  // o navegador aceita como valor. Na ordem contraria o campo recebia o valor
  // com as regras antigas ainda no lugar, e o proprio navegador arredondava ou
  // grampeava: `0.12` virava `0` enquanto o `step` anterior fosse `1`.
  BIND: 45,
  MODEL: 40,
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

export { PRIORITY, components, config, defineDirective, directives, normalizeComponentName, usePlugin };
//# sourceMappingURL=chunk-ZVXMGOYP.js.map
//# sourceMappingURL=chunk-ZVXMGOYP.js.map