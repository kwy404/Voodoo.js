/**
 * @module runtime/metrics
 *
 * Counters for the list reconciler.
 *
 * Time alone does not say why a list got faster: a number can drop because the
 * algorithm stopped doing work, or because the machine was less busy. These
 * counters say which. They answer "how many rows did the reconciler actually
 * look at", "how many writes went through a reactive proxy", "how many nodes
 * were created, removed or moved" — the quantities the algorithm is supposed to
 * be reducing.
 *
 * Off by default, and not reachable from the public API. Every increment sits
 * behind `metrics.on`, a single property read on a monomorphic object; with the
 * flag down the branch is never taken and the counters stay untouched. The
 * benchmark measures time with the flag DOWN and collects counters in a second
 * pass with it UP, so instrumentation never appears inside a measured number.
 */

export interface ListMetrics {
  /** Instrumentation is active. Left `false` in every normal build. */
  on: boolean;

  /** Rows the reconciler touched at all, for any reason. */
  itemsVisited: number;
  /** Times a row's `:key` was computed. */
  keyEvaluations: number;
  /** Rows compared by the prefix scan. */
  prefixScanned: number;
  /** Rows compared by the suffix scan. */
  suffixScanned: number;
  /** Rows that went through the general keyed path (map + moves). */
  middleReconciled: number;

  /** `Scope` objects created. One per new row. */
  scopeAllocations: number;
  /** Writes into a row's reactive data proxy. */
  proxyWrites: number;
  /** Arrays, Maps and Sets allocated per reconciliation pass. */
  arrayAllocations: number;
  /** Lookups into the key -> index/block structure. */
  keyMapLookups: number;

  /** Row templates cloned into the document. */
  domCreates: number;
  /** Rows taken out of the document. */
  domRemoves: number;
  /** `insertBefore` calls that relocated an already-placed row. */
  domMoves: number;
  /** `insertBefore` calls that dropped a fragment of freshly built rows. */
  domInserts: number;

  /** Times the longest-increasing-subsequence pass ran. */
  lisRuns: number;
  /** Elements fed to that pass. */
  lisElements: number;

  /** Reconciliation passes, by the path that handled them. */
  paths: Record<string, number>;
}

function blank(): ListMetrics {
  return {
    on: false,
    itemsVisited: 0,
    keyEvaluations: 0,
    prefixScanned: 0,
    suffixScanned: 0,
    middleReconciled: 0,
    scopeAllocations: 0,
    proxyWrites: 0,
    arrayAllocations: 0,
    keyMapLookups: 0,
    domCreates: 0,
    domRemoves: 0,
    domMoves: 0,
    domInserts: 0,
    lisRuns: 0,
    lisElements: 0,
    paths: {},
  };
}

/** The live counters. Read and reset by the benchmark, written by `v-for`. */
export const metrics: ListMetrics = /* @__PURE__ */ blank();

/** Turns counting on or off. Returns the previous state. */
export function setListMetrics(on: boolean): boolean {
  const was = metrics.on;
  metrics.on = on;
  return was;
}

/** Zeroes every counter, keeping the on/off state. */
export function resetListMetrics(): void {
  const on = metrics.on;
  const fresh = blank();
  fresh.on = on;
  Object.assign(metrics, fresh);
}

/** Snapshot of the counters, safe to keep after a reset. */
export function readListMetrics(): ListMetrics {
  return { ...metrics, paths: { ...metrics.paths } };
}

/** Records which reconciliation path handled a pass. */
export function countPath(name: string): void {
  metrics.paths[name] = (metrics.paths[name] || 0) + 1;
}
