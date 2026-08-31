# Voodoo.js Documentation (English)

> JavaScript feels like magic.

Voodoo.js is a JavaScript framework that puts the application in the HTML. Reactivity,
components, HTTP, forms, validation, UI and routing, driven by attributes, with no build
step, no `eval`, and no runtime dependencies.

```html
<script src="https://cdn.jsdelivr.net/npm/voodoojs/dist/voodoo.min.js" defer></script>

<div v-data="{ count: 0 }">
  <button @click="count++">Clicked { count } times</button>
</div>
```

That page is a complete application. There is nothing else to install.

---

## About this section

**The complete documentation is in Portuguese**, in [`docs/`](../) and on the
documentation site. It covers all 30 guides, including migration guides, the full directive
reference, charts, animation, drag and drop, internationalization and the devtools.

This English section is a deliberately focused subset: the guides you need to build a real
application, written directly against the source rather than translated from the Portuguese.
It is not a mirror of `docs/`, and it does not try to be.

If you read Portuguese, read [`docs/README.md`](../README.md) instead. It has more.

---

## Guides

### Start here

| Guide | What you learn |
| ----- | -------------- |
| [Getting started](getting-started.md) | Installation, the three bundles, your first application, configuration |

### Fundamentals

| Guide | What you learn |
| ----- | -------------- |
| [Reactivity](reactivity.md) | `reactive`, `ref`, `computed`, `watch`, `effect`, the scheduler, `nextTick` |
| [Directives](directives.md) | The attribute grammar, every core directive, modifiers, priorities |
| [Components](components.md) | Registration, props, slots, lifecycle, provide/inject, application mode |
| [State](state.md) | Scope chain, `v-data`, `V.data`, stores, persistence, cross-tab sync |

### Application

| Guide | What you learn |
| ----- | -------------- |
| [HTTP](http.md) | The `V.http` client, declarative request attributes, `v-resource`, interceptors |
| [Forms](forms.md) | `v-submit`, validation rules, masks, upload, serialization, `$form` |
| [Router](router.md) | Routes, parameters, guards, `v-link`, `v-router-view` (full build only) |

### Extending

| Guide | What you learn |
| ----- | -------------- |
| [Plugins](plugins.md) | Custom directives, magics, components, the plugin contract |
| [TypeScript](typescript.md) | Types, module entries, typing components, stores and directives |

### Reference

| Guide | What you learn |
| ----- | -------------- |
| [Security](security.md) | The expression sandbox, CSP, `v-html`, what you must sanitize |
| [API reference](api-reference.md) | Every symbol on `V`, grouped, with stability tiers |

---

## Project documents

These live at the repository root and are written in English.

| Document | Contents |
| -------- | -------- |
| [ARCHITECTURE.md](../../ARCHITECTURE.md) | Layers, the update path, walker lifecycle, module boundaries |
| [CONVENTIONS.md](../../CONVENTIONS.md) | Naming rules, stability tiers, deprecation policy, known API inconsistencies |
| [BROWSER_SUPPORT.md](../../BROWSER_SUPPORT.md) | Every browser API used, its fallback, and the support matrix |
| [SECURITY.md](../../SECURITY.md) | Vulnerability reporting and the full technical security model |
| [QUALITY.md](../../QUALITY.md) | The twelve quality dimensions and how they are measured |
| [ROADMAP.md](../../ROADMAP.md) | The path to 1.0, by theme |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Setup, tests, adding a directive, the release process |

---

## Portuguese documentation

The complete reference, in `docs/`:

**Getting started:** [introducao](../introducao.md) ·
[instalacao](../instalacao.md) · [inicio-rapido](../inicio-rapido.md)

**Fundamentals:** [reatividade](../reatividade.md) ·
[expressoes](../expressoes.md) · [directives](../directives.md) ·
[componentes](../componentes.md) · [estado-e-stores](../estado-e-stores.md) ·
[eventos](../eventos.md)

**Application:** [http](../http.md) · [formularios](../formularios.md) ·
[validacao](../validacao.md) · [mascaras](../mascaras.md) ·
[interface](../interface.md) · [arrastar-e-soltar](../arrastar-e-soltar.md)

**Full build:** [componentes-prontos](../componentes-prontos.md) ·
[animacoes](../animacoes.md) · [graficos](../graficos.md) ·
[roteador](../roteador.md) · [idiomas](../idiomas.md) · [devtools](../devtools.md)

**Reference:** [api](../api.md) · [seguranca](../seguranca.md) ·
[desempenho](../desempenho.md) · [performance](../performance.md) ·
[tema-e-paleta](../tema-e-paleta.md) · [utilitarios](../utilitarios.md) ·
[application-structure](../application-structure.md) ·
[plugin-spec](../plugin-spec.md) · [perguntas-frequentes](../perguntas-frequentes.md)

**Migration:** [migrando-do-alpine](../migrando-do-alpine.md) ·
[migrando-do-jquery](../migrando-do-jquery.md) · [migrando-do-vue](../migrando-do-vue.md)

---

## Version

This documentation describes `0.1.0`.

While the version is `0.x`, minor releases may contain breaking changes. See
[CONVENTIONS.md](../../CONVENTIONS.md) for the versioning policy and
[ROADMAP.md](../../ROADMAP.md) for what `1.0` means.

## License

MIT. See [LICENSE](../../LICENSE).
