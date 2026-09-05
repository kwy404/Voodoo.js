# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-05T02:09:33.129Z |
| Commit | 1ac153f |
| CPU | Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz (4 logical cores) |
| RAM | 16268 MB |
| OS | win32 10.0.19045 |
| Node | v24.16.0 |
| DOM | jsdom 25.0.1 (**not a real browser** — see caveats) |
| Rows | 1000 |
| Samples | 30 (after 6 warm-up) |
| GC control | yes (--expose-gc) |

## Versions

| Framework | version | minified bundle |
| --- | --- | ---: |
| vanilla | n/a (hand-written) | 0.6 KB |
| voodoo | workspace | 435.2 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **39.51** | 43.26 | 7.9 | 1.00x | 30 |
| preact | **71.03** | 96.27 | 39.5 | 1.80x | 30 |
| voodoo | **77.47** | 128.31 | 25.0 | 1.96x | 30 |
| vue | **78.72** | 140.67 | 35.3 | 1.99x | 30 |
| solid \* | **80.13** | 87.31 | 5.4 | 2.03x | 30 |
| react | **81.22** | 86.45 | 3.7 | 2.06x | 30 |
| alpine | **157.06** | 200.57 | 12.1 | 3.98x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **77.47 ms**, **1.96x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (39.51 ms), preact (71.03 ms). Slower than Voodoo here: vue (78.72 ms), solid (80.13 ms), react (81.22 ms), alpine (157.06 ms).

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.90** | 1.15 | 12.3 | 0.14x | 30 |
| preact | **2.73** | 4.98 | 134.5 | 0.41x | 30 |
| react | **4.65** | 6.55 | 17.3 | 0.70x | 30 |
| voodoo | **4.69** | 9.50 | 50.7 | 0.71x | 30 |
| vanilla | **6.65** | 7.13 | 10.4 | 1.00x | 30 |
| vue | **14.29** | 21.27 | 51.3 | 2.15x | 30 |
| alpine | **111.29** | 242.86 | 53.3 | 16.73x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **4.69 ms**, **0.71x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.90 ms), preact (2.73 ms), react (4.65 ms). Slower than Voodoo here: vanilla (6.65 ms), vue (14.29 ms), alpine (111.29 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **20.04** | 21.66 | 60.1 | 1.00x | 30 |
| solid \* | **21.85** | 23.87 | 7.4 | 1.09x | 30 |
| voodoo | **30.14** | 32.05 | 3.2 | 1.50x | 30 |
| preact | **30.68** | 33.14 | 4.6 | 1.53x | 30 |
| alpine | **32.76** | 46.49 | 19.1 | 1.63x | 30 |
| vue | **32.84** | 35.14 | 5.4 | 1.64x | 30 |
| react | **33.55** | 35.95 | 6.1 | 1.67x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **30.14 ms**, **1.50x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (20.04 ms), solid (21.85 ms). Slower than Voodoo here: preact (30.68 ms), alpine (32.76 ms), vue (32.84 ms), react (33.55 ms).

## Caveats — read before quoting any of this

- **jsdom is not a browser.** It has no layout, no paint, no compositor. Numbers here measure
  JavaScript and DOM-API work only. Real browser ranking can differ, sometimes a lot.
- **Same logical work, verified.** After every scenario each framework's DOM is reduced to the
  list of `<li>` text contents and compared against the vanilla baseline. Any framework that
  produced different output is excluded from that scenario rather than credited with a fast time.
- **Synchronous flushing is forced** where a framework would otherwise defer work (React
  `flushSync`, Vue `nextTick`, Alpine microtask drain). Without this the comparison would time
  scheduling instead of rendering.
- Frameworks marked \* carry a caveat listed in the Versions table source; see
  `benchmarks/competitors/frameworks/*.mjs` for exactly what each fixture does.
- This is a **list-rendering** comparison. It says nothing about routing, forms, SSR, ecosystem,
  or developer experience.
