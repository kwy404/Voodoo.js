# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-02T01:24:00.263Z |
| Commit | a93404d |
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
| voodoo | workspace | 412.1 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **47.19** | 128.77 | 50.3 | 1.00x | 30 |
| preact | **72.18** | 128.65 | 40.9 | 1.53x | 30 |
| vue | **81.44** | 96.28 | 8.1 | 1.73x | 30 |
| react | **84.04** | 97.77 | 28.6 | 1.78x | 30 |
| solid \* | **86.37** | 93.06 | 5.1 | 1.83x | 30 |
| voodoo | **117.62** | 140.86 | 12.7 | 2.49x | 30 |
| alpine | **173.52** | 262.17 | 21.2 | 3.68x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **117.62 ms**, **2.49x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (47.19 ms), preact (72.18 ms), vue (81.44 ms), react (84.04 ms), solid (86.37 ms). Slower than Voodoo here: alpine (173.52 ms).

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.90** | 1.12 | 17.1 | 0.14x | 30 |
| preact | **2.56** | 10.70 | 102.4 | 0.39x | 30 |
| react | **4.96** | 10.23 | 37.1 | 0.75x | 30 |
| vanilla | **6.59** | 9.42 | 17.3 | 1.00x | 30 |
| voodoo | **6.63** | 14.75 | 45.7 | 1.01x | 30 |
| vue | **14.17** | 14.82 | 12.6 | 2.15x | 30 |
| alpine | **90.18** | 112.49 | 14.0 | 13.68x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **6.63 ms**, **1.01x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.90 ms), preact (2.56 ms), react (4.96 ms), vanilla (6.59 ms). Slower than Voodoo here: vue (14.17 ms), alpine (90.18 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **19.33** | 26.63 | 19.8 | 0.94x | 30 |
| vanilla | **20.48** | 22.08 | 8.9 | 1.00x | 30 |
| alpine | **27.99** | 33.19 | 17.0 | 1.37x | 30 |
| preact | **29.64** | 53.19 | 26.1 | 1.45x | 30 |
| vue | **31.89** | 74.73 | 46.4 | 1.56x | 30 |
| react | **32.65** | 47.45 | 43.9 | 1.59x | 30 |
| voodoo | **33.04** | 38.46 | 8.9 | 1.61x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **33.04 ms**, **1.61x** the hand-written vanilla baseline. Faster than Voodoo here: solid (19.33 ms), vanilla (20.48 ms), alpine (27.99 ms), preact (29.64 ms), vue (31.89 ms), react (32.65 ms). 

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
