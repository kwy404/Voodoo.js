# Voodoo.js — Bundle Analysis

Generated 2026-08-31T18:14:21.329Z.

## Environment

| Field | Value |
| --- | --- |
| Timestamp | 2026-08-31T18:14:21.329Z |
| Voodoo version | 0.1.0 |
| Commit | 6232021 (working tree dirty) |
| Branch | main |
| OS | win32 10.0.19045 (x64) |
| CPU | Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz — 4 logical cores @ 3093 MHz |
| RAM | 16268 MB total, 6697 MB free at start |
| Node | v24.16.0 (V8 13.6.233.17-node.49) |
| jsdom | 25.0.1 |
| GC exposed | NO — heap numbers are advisory only |
| Build mode | packages/voodoojs/dist (tsup output) |
| Node flags | (none) |

### Build sizes (real files from `packages/voodoojs/dist`)

| Build | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `voodoo.core.js` | 264.6 KB | **63.5 KB** | 53.5 KB |
| `voodoo.core.min.js` | 127.3 KB | **44.1 KB** | 38.8 KB |
| `voodoo.js` | 483.9 KB | **112.7 KB** | 91.1 KB |
| `voodoo.min.js` | 249.7 KB | **80.8 KB** | 68.6 KB |
| `voodoo.full.js` | 749.9 KB | **170.8 KB** | 135.6 KB |
| `voodoo.full.min.js` | 421.9 KB | **127.5 KB** | 106.3 KB |

ESM / CJS entry points for bundlers:

| Build | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `index.js` | 250.8 KB | 58.0 KB | 49.1 KB |
| `index.cjs` | 697.3 KB | 166.0 KB | 132.7 KB |
| `essential.js` | 1.1 KB | 0.6 KB | 0.5 KB |
| `essential.cjs` | 442.9 KB | 108.3 KB | 88.0 KB |
| `reactivity.js` | 0.5 KB | 0.3 KB | 0.3 KB |
| `reactivity.cjs` | 19.3 KB | 5.2 KB | 4.6 KB |
| `http.js` | 0.2 KB | 0.2 KB | 0.1 KB |
| `http.cjs` | 14.3 KB | 4.4 KB | 3.9 KB |
| `utils.js` | 0.5 KB | 0.3 KB | 0.3 KB |
| `utils.cjs` | 12.5 KB | 3.9 KB | 3.5 KB |

### Composition by module

Attribution of `voodoo.full.js` (749.9 KB raw) to source modules, via its `.js.map` sourcemap, across 45 mapped source files. Segment-width attribution: approximate, and stated as such.

| Module | bytes | share |
| --- | ---: | ---: |
| `directives` | 171.0 KB | 23.5% |
| `ui` | 155.4 KB | 21.4% |
| `devtools` | 48.9 KB | 6.7% |
| `runtime` | 47.4 KB | 6.5% |
| `charts` | 44.8 KB | 6.2% |
| `forms` | 44.2 KB | 6.1% |
| `dom` | 41.8 KB | 5.7% |
| `motion` | 36.3 KB | 5.0% |
| `parser` | 26.3 KB | 3.6% |
| `reactivity` | 21.4 KB | 2.9% |
| `router` | 20.2 KB | 2.8% |
| `http` | 17.2 KB | 2.4% |
| `utils` | 13.0 KB | 1.8% |
| `sound` | 12.1 KB | 1.7% |
| `i18n` | 9.7 KB | 1.3% |
| `entradas (src/*.ts)` | 8.2 KB | 1.1% |
| `storage` | 6.8 KB | 0.9% |
| `store` | 2.2 KB | 0.3% |

### Tree-shaking test

Fixture: an ESM app that imports only `reactive` and `effect`, bundled and minified with the esbuild already in `node_modules`. Two import styles are tested, because they answer different questions.

| Fixture | import | raw | gzip | brotli |
| --- | --- | ---: | ---: | ---: |
| `main-entry` | `from 'voodoojs'` | 409.2 KB | **123.3 KB** | 102.8 KB |
| `subpath` | `from 'voodoojs/reactivity'` | 5.4 KB | **2.4 KB** | 2.2 KB |

Modules surviving in `main-entry`:

| Module | in bundle? | evidence |
| --- | :---: | --- |
| `charts` | **YES** | `sparkline`, `donut` |
| `router` | **YES** | `popstate`, `hashchange`, `pushState` |
| `ui (toast/modal/dialog)` | **YES** | `aria-modal` |
| `motion` | **YES** | `cubic-bezier` |
| `http` | **YES** | `XMLHttpRequest`, `application/json` |
| `directives` | **YES** | `v-cloak`, `else-if`, `prevent` |
| `parser` | **YES** | `Token inesperado`, `Chave de objeto invalida` |
| `i18n` | **YES** | `Intl.NumberFormat` |
| `forms/validation` | **YES** | `minlength`, `obrigatorio` |
| `devtools` | **YES** | `xray` |

Shaken out: **nothing**.
Still present: `charts`, `router`, `ui (toast/modal/dialog)`, `motion`, `http`, `directives`, `parser`, `i18n`, `forms/validation`, `devtools`.

Modules surviving in `subpath`:

| Module | in bundle? | evidence |
| --- | :---: | --- |
| `charts` | no | no marker string found |
| `router` | no | no marker string found |
| `ui (toast/modal/dialog)` | no | no marker string found |
| `motion` | no | no marker string found |
| `http` | no | no marker string found |
| `directives` | no | no marker string found |
| `parser` | no | no marker string found |
| `i18n` | no | no marker string found |
| `forms/validation` | no | no marker string found |
| `devtools` | no | no marker string found |

Shaken out: `charts`, `router`, `ui (toast/modal/dialog)`, `motion`, `http`, `directives`, `parser`, `i18n`, `forms/validation`, `devtools`.
Still present: nothing.

