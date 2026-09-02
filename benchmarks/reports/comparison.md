# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-02T23:27:41.474Z |
| Commit | 977d58a |
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
| voodoo | workspace | 416.9 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **48.74** | 68.21 | 27.7 | 1.00x | 30 |
| preact | **91.62** | 131.75 | 23.6 | 1.88x | 30 |
| voodoo | **97.70** | 152.27 | 23.6 | 2.00x | 30 |
| react | **100.23** | 236.89 | 40.2 | 2.06x | 30 |
| vue | **110.56** | 194.10 | 30.6 | 2.27x | 30 |
| solid \* | **111.63** | 195.86 | 33.5 | 2.29x | 30 |
| alpine | **179.47** | 281.35 | 19.8 | 3.68x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **97.70 ms**, **2.00x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (48.74 ms), preact (91.62 ms). Slower than Voodoo here: react (100.23 ms), vue (110.56 ms), solid (111.63 ms), alpine (179.47 ms).

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.91** | 1.28 | 18.2 | 0.12x | 30 |
| preact | **2.59** | 3.49 | 87.8 | 0.34x | 30 |
| react | **4.63** | 6.55 | 26.2 | 0.62x | 30 |
| voodoo | **5.42** | 13.04 | 46.1 | 0.72x | 30 |
| vanilla | **7.52** | 17.77 | 37.9 | 1.00x | 30 |
| vue | **19.21** | 35.21 | 34.8 | 2.56x | 30 |
| alpine | **104.51** | 130.18 | 15.8 | 13.91x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **5.42 ms**, **0.72x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.91 ms), preact (2.59 ms), react (4.63 ms). Slower than Voodoo here: vanilla (7.52 ms), vue (19.21 ms), alpine (104.51 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **19.99** | 34.04 | 26.0 | 0.95x | 30 |
| vanilla | **21.06** | 26.92 | 25.1 | 1.00x | 30 |
| preact | **29.48** | 54.69 | 30.5 | 1.40x | 30 |
| voodoo | **30.44** | 39.72 | 12.4 | 1.44x | 30 |
| alpine | **31.39** | 42.23 | 17.6 | 1.49x | 30 |
| vue | **31.65** | 99.40 | 67.3 | 1.50x | 30 |
| react | **33.59** | 97.28 | 54.8 | 1.59x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **30.44 ms**, **1.44x** the hand-written vanilla baseline. Faster than Voodoo here: solid (19.99 ms), vanilla (21.06 ms), preact (29.48 ms). Slower than Voodoo here: alpine (31.39 ms), vue (31.65 ms), react (33.59 ms).

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
