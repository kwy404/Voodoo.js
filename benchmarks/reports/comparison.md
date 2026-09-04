# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-04T22:12:55.645Z |
| Commit | 7bfb460 |
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
| voodoo | workspace | 429.2 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **56.71** | 163.38 | 53.6 | 1.00x | 30 |
| preact | **80.40** | 121.50 | 19.6 | 1.42x | 30 |
| solid \* | **80.73** | 86.61 | 4.6 | 1.42x | 30 |
| voodoo | **80.81** | 141.54 | 31.2 | 1.43x | 30 |
| react | **84.97** | 156.43 | 28.2 | 1.50x | 30 |
| vue | **89.66** | 120.72 | 18.9 | 1.58x | 30 |
| alpine | **166.03** | 274.77 | 24.1 | 2.93x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **80.81 ms**, **1.43x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (56.71 ms), preact (80.40 ms), solid (80.73 ms). Slower than Voodoo here: react (84.97 ms), vue (89.66 ms), alpine (166.03 ms).

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.82** | 0.99 | 9.2 | 0.11x | 30 |
| preact | **2.54** | 4.83 | 38.5 | 0.34x | 30 |
| react | **4.68** | 7.94 | 27.2 | 0.62x | 30 |
| vanilla | **7.51** | 11.25 | 64.2 | 1.00x | 30 |
| voodoo | **7.91** | 17.03 | 54.3 | 1.05x | 30 |
| vue | **11.90** | 13.55 | 12.4 | 1.59x | 30 |
| alpine | **104.98** | 130.16 | 17.6 | 13.99x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **7.91 ms**, **1.05x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.82 ms), preact (2.54 ms), react (4.68 ms), vanilla (7.51 ms). Slower than Voodoo here: vue (11.90 ms), alpine (104.98 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **23.83** | 70.66 | 56.1 | 0.74x | 30 |
| preact | **31.68** | 61.49 | 31.2 | 0.98x | 30 |
| vanilla | **32.39** | 86.71 | 59.1 | 1.00x | 30 |
| voodoo | **34.46** | 45.31 | 15.3 | 1.06x | 30 |
| vue | **34.98** | 60.33 | 38.9 | 1.08x | 30 |
| react | **37.15** | 56.43 | 33.1 | 1.15x | 30 |
| alpine | **37.67** | 118.05 | 63.2 | 1.16x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **34.46 ms**, **1.06x** the hand-written vanilla baseline. Faster than Voodoo here: solid (23.83 ms), preact (31.68 ms), vanilla (32.39 ms). Slower than Voodoo here: vue (34.98 ms), react (37.15 ms), alpine (37.67 ms).

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
