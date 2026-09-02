# Voodoo.js — Framework Comparison

All frameworks were bundled **production + minified** (`NODE_ENV=production`, esbuild `minify: true`) and run in the same process, on the same machine, against the same jsdom document, back to back.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-09-02T01:57:28.324Z |
| Commit | fbc1d34 |
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
| voodoo | workspace | 412.4 KB |
| alpine | 3.17.1 | 55.2 KB |
| vue | 3.5.42 | 62.5 KB |
| preact | 10.29.8 | 10.7 KB |
| react | 19.2.8 | 189.3 KB |
| solid | 1.9.15 | 16.7 KB |

## create 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| vanilla | **41.59** | 47.11 | 8.4 | 1.00x | 30 |
| preact | **78.29** | 99.56 | 11.5 | 1.88x | 30 |
| vue | **81.88** | 92.41 | 7.2 | 1.97x | 30 |
| solid \* | **85.58** | 96.09 | 7.5 | 2.06x | 30 |
| react | **85.89** | 122.84 | 14.5 | 2.07x | 30 |
| voodoo | **119.55** | 140.72 | 8.0 | 2.87x | 30 |
| alpine | **169.71** | 292.09 | 30.7 | 4.08x | 30 |

In the create 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **119.55 ms**, **2.87x** the hand-written vanilla baseline. Faster than Voodoo here: vanilla (41.59 ms), preact (78.29 ms), vue (81.88 ms), solid (85.58 ms), react (85.89 ms). Slower than Voodoo here: alpine (169.71 ms).

## update every 10th of 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **0.91** | 0.97 | 4.2 | 0.14x | 30 |
| preact | **2.19** | 2.77 | 14.7 | 0.33x | 30 |
| react | **4.46** | 5.97 | 55.8 | 0.68x | 30 |
| voodoo | **4.82** | 12.42 | 49.1 | 0.73x | 30 |
| vanilla | **6.60** | 7.11 | 15.2 | 1.00x | 30 |
| vue | **13.91** | 17.09 | 19.9 | 2.11x | 30 |
| alpine | **90.64** | 115.40 | 14.1 | 13.73x | 30 |

In the update every 10th of 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **4.82 ms**, **0.73x** the hand-written vanilla baseline. Faster than Voodoo here: solid (0.91 ms), preact (2.19 ms), react (4.46 ms). Slower than Voodoo here: vanilla (6.60 ms), vue (13.91 ms), alpine (90.64 ms).

## clear 1000 rows

| Framework | median (ms) | p95 (ms) | CV % | vs vanilla | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| solid \* | **18.89** | 23.67 | 13.8 | 0.96x | 30 |
| vanilla | **19.63** | 22.62 | 16.2 | 1.00x | 30 |
| alpine | **27.31** | 35.88 | 20.0 | 1.39x | 30 |
| preact | **27.65** | 29.94 | 6.2 | 1.41x | 30 |
| vue | **29.35** | 32.50 | 5.7 | 1.50x | 30 |
| react | **30.60** | 33.17 | 7.3 | 1.56x | 30 |
| voodoo | **31.16** | 39.41 | 10.9 | 1.59x | 30 |

In the clear 1000 rows benchmark, Intel(R) Core(TM) i5-4440 CPU @ 3.10GHz, jsdom 25.0.1, Node v24.16.0, 30 samples: Voodoo.js median **31.16 ms**, **1.59x** the hand-written vanilla baseline. Faster than Voodoo here: solid (18.89 ms), vanilla (19.63 ms), alpine (27.31 ms), preact (27.65 ms), vue (29.35 ms), react (30.60 ms). 

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
