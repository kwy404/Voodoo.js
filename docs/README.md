# Voodoo.js Documentation

> JavaScript feels like magic.

Voodoo.js is an HTML-first JavaScript framework: you build reactive applications directly in HTML.
Reactivity, components, requests, forms, validation, interface, animation, and charts come in the
box. No build step, no `eval`, no runtime dependencies.

This folder is the complete documentation. If you have never used the library, start with
[Introduction](introducao.md), then [Installation](instalacao.md) and
[Quick Start](inicio-rapido.md).

## Getting started

| Guide | What you learn |
| --- | --- |
| [Introduction](introducao.md) | What it is, who it's for, when not to use it, roadmap |
| [Installation](instalacao.md) | CDN, npm, download, which bundle to choose, script tag configuration |
| [Quick Start](inicio-rapido.md) | From blank HTML to first app, step by step |

## Fundamentals

| Guide | What you learn |
| --- | --- |
| [Reactivity](reatividade.md) | `reactive`, `ref`, `computed`, `watch`, `effect`, `nextTick` |
| [Expressions](expressoes.md) | The safe parser, what's accepted, allowed globals, CSP |
| [Directives](directives.md) | Complete reference of all directives |
| [Components](componentes.md) | Register, props, slots, `emit`, lifecycle, PascalCase tags |
| [State and stores](estado-e-stores.md) | `v-data`, scope, global store, `$store`, `v-persist`, `v-sync`, `v-history` |
| [Events](eventos.md) | `v-on`, shortcuts, modifiers, keys, synthetic events, hotkeys |

## Application

| Guide | What you learn |
| --- | --- |
| [HTTP](http.md) | `V.http` client and request directives, `v-resource` |
| [Forms](formularios.md) | `v-submit`, serialization, upload, dropzone, autosave |
| [Validation](validacao.md) | All rules, async validation, custom rules, messages |
| [Masks](mascaras.md) | All masks and how to create new ones |
| [Interface](interface.md) | Modal, drawer, tabs, dropdown, tooltip, accordion, command palette |
| [Drag and drop](arrastar-e-soltar.md) | `v-draggable`, `v-droppable`, `v-sortable`, groups, accessibility |

## Full build

The resources below come only in `voodoo.full.min.js` or a custom build.

| Guide | What you learn |
| --- | --- |
| [Ready-made components](componentes-prontos.md) | The 29 `V*` components and props for each |
| [Animations](animacoes.md) | `v-motion`, presets, spring, stagger, scroll, `v-count`, `v-typewriter` |
| [Charts](graficos.md) | `v-chart`, all types, options, reactivity |
| [Router](roteador.md) | Routes, parameters, guards, `v-link`, `v-router-view` |
| [Languages](idiomas.md) | i18n, `v-t`, pluralization, language switching |
| [WebSocket](websocket.md) | `V.socket`, public and private rooms, Socket.IO, `v-socket` and `v-room` |
| [GPU](gpu.md) | `V.gpu` over WebGPU and the `v-shader` directive |
| [Devtools](devtools.md) | The `xray` inspector and event bus |

## Reference and support

| Guide | What you learn |
| --- | --- |
| [Theme and palette](tema-e-paleta.md) | Light and dark theme, `V.palette`, CSS tokens |
| [Plugins](plugins.md) | `V.use`, custom directives, custom magics |
| [Utilities](utilitarios.md) | All utility functions with examples |
| [API](api.md) | Reference of the entire `V` object, grouped by area |
| [Security](seguranca.md) | Why no `eval`, CSP, XSS warning in `v-html` |
| [Performance](desempenho.md) | Granular updates, size, best practices |

## Migration

| Guide | What you learn |
| --- | --- |
| [Migrating from jQuery](migrando-do-jquery.md) | Side-by-side equivalence table |
| [Migrating from Alpine](migrando-do-alpine.md) | Side-by-side equivalence table |
| [Migrating from Vue](migrando-do-vue.md) | Side-by-side equivalence table |

## Community

| Guide | What you learn |
| --- | --- |
| [FAQ](perguntas-frequentes.md) | More than twenty direct answers |
| [Contributing](contribuindo.md) | How to run, test, build, and submit changes |

## Three things worth knowing before everything

1. **Interpolation uses single braces**: write `{ name }` in HTML. The double-brace form `{{ name }}`
   also works, for those coming from Vue.
2. **`v-*` attributes disappear from HTML after processing.** This is intentional and keeps the DOM
   clean in the inspector. Never write CSS that depends on selectors like `[v-tab]`.
3. **No `eval`.** Expressions go through a custom parser, so the library works with restrictive
   Content Security Policy, no `unsafe-eval`.

---

Next: [Introduction](introducao.md)
