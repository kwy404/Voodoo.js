# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-02T00:37:58.448Z |
| Commit | a38022c |
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
| voodoo | workspace | 411.9 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **40.09** | 45.51 | 9.6 | 1.00x | 30 |
| preact | **75.78** | 100.01 | 14.9 | 1.89x | 30 |
| vue | **83.06** | 90.82 | 6.0 | 2.07x | 30 |
| react | **91.38** | 207.31 | 41.5 | 2.28x | 30 |
| solid \* | **98.75** | 184.26 | 30.6 | 2.46x | 30 |
| alpine | **162.28** | 174.94 | 4.4 | 4.05x | 30 |
| voodoo | **183.01** | 225.30 | 9.2 | 4.57x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **183.01 ms**, **4.57x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (40.09 ms), preact (75.78 ms), vue (83.06 ms), react (91.38 ms), solid (98.75 ms), alpine (162.28 ms). 

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.86** | 0.96 | 7.2 | 0.13x | 30 |
| preact | **2.71** | 4.18 | 29.4 | 0.40x | 30 |
| react | **4.63** | 5.04 | 6.9 | 0.69x | 30 |
| vanilla | **6.70** | 7.19 | 6.7 | 1.00x | 30 |
| voodoo | **12.21** | 13.79 | 27.1 | 1.82x | 30 |
| vue | **14.66** | 40.26 | 58.7 | 2.19x | 30 |
| alpine | **94.93** | 117.64 | 14.3 | 14.17x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **12.21 ms**, **1.82x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.86 ms), preact (2.71 ms), react (4.63 ms), vanilla (6.70 ms). Slower than Voodoo here: vue (14.66 ms), alpine (94.93 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **18.60** | 20.25 | 11.9 | 0.92x | 30 |
| vanilla | **20.31** | 22.24 | 9.4 | 1.00x | 30 |
| alpine | **23.98** | 33.40 | 21.4 | 1.18x | 30 |
| preact | **26.65** | 28.46 | 5.5 | 1.31x | 30 |
| vue | **28.61** | 31.42 | 17.8 | 1.41x | 30 |
| react | **30.39** | 31.99 | 7.2 | 1.50x | 30 |
| voodoo | **30.77** | 37.97 | 10.4 | 1.51x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **30.77 ms**, **1.51x** the hand-written vanilla baseline. Faster than Voodoo here: solid (18.60 ms), vanilla (20.31 ms), alpine (23.98 ms), preact (26.65 ms), vue (28.61 ms), react (30.39 ms). 

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
