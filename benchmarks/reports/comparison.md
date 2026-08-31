# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-08-31T18:23:41.230Z |
| Commit | f3320f1 |
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
| voodoo | workspace | 410.0 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 13.0 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **43.76** | 48.49 | 9.5 | 1.00x | 30 |
| solid \* | **90.09** | 198.36 | 43.8 | 2.06x | 30 |
| react | **109.72** | 150.05 | 18.3 | 2.51x | 30 |
| preact | **131.79** | 276.45 | 39.5 | 3.01x | 30 |
| vue | **136.91** | 366.12 | 59.9 | 3.13x | 30 |
| alpine | **174.68** | 278.39 | 20.2 | 3.99x | 30 |
| voodoo | **222.83** | 535.82 | 41.0 | 5.09x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **222.83 ms**, **5.09x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (43.76 ms), solid (90.09 ms), react (109.72 ms), preact (131.79 ms), vue (136.91 ms), alpine (174.68 ms). 

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| preact | **2.89** | 9.08 | 67.3 | 0.37x | 30 |
| react | **5.09** | 10.98 | 45.1 | 0.64x | 30 |
| voodoo | **5.78** | 7.67 | 14.8 | 0.73x | 30 |
| vanilla | **7.89** | 10.09 | 12.1 | 1.00x | 30 |
| vue | **18.30** | 38.49 | 46.3 | 2.32x | 30 |
| alpine | **99.13** | 147.27 | 48.2 | 12.56x | 30 |
| solid \* | **512.95** | 664.43 | 25.6 | 64.98x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **5.78 ms**, **0.73x** the hand-written vanilla baseline. Faster than Voodoo here: preact (2.89 ms), react (5.09 ms). Slower than Voodoo here: vanilla (7.89 ms), vue (18.30 ms), alpine (99.13 ms), solid (512.95 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **22.26** | 59.83 | 54.4 | 1.00x | 30 |
| solid \* | **23.54** | 40.01 | 28.7 | 1.06x | 30 |
| vue | **29.40** | 32.90 | 8.2 | 1.32x | 30 |
| preact | **29.45** | 46.36 | 33.8 | 1.32x | 30 |
| alpine | **31.34** | 42.75 | 25.4 | 1.41x | 30 |
| react | **34.48** | 59.33 | 29.7 | 1.55x | 30 |
| voodoo | **92.93** | 103.64 | 16.8 | 4.17x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **92.93 ms**, **4.17x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (22.26 ms), solid (23.54 ms), vue (29.40 ms), preact (29.45 ms), alpine (31.34 ms), react (34.48 ms). 

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
