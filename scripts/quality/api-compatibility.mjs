/**
 * API Compatibility: the public surface cannot shrink without someone noticing.
 *
 * Compares the current snapshot of the API (see scripts/api-snapshot.mjs) with the
 * committed snapshot in `packages/voodoojs/api-snapshot.json`.
 *
 *   removal or renaming .... FAIL  (breaks anyone who installed)
 *   shape change ........... FAIL  (function became object, class became function)
 *   addition ............... PASS with note
 *
 * Renaming appears as a removal plus an addition. That is why removal is FAIL:
 * it is the only signal we have that a name disappeared from the contract.
 */

import { STATUS, fail, note, rel } from './lib.mjs';
import {
  SNAPSHOT_PATH,
  collectSnapshot,
  diffSnapshots,
  readSnapshot,
  writeSnapshot,
} from '../api-snapshot.mjs';

export const meta = { label: 'API Compatibility' };

function countSurface(surface) {
  return {
    V: Object.keys(surface?.V ?? {}).length,
    exports: Object.keys(surface?.exports ?? {}).length,
    directives: (surface?.directives ?? []).length,
    magics: (surface?.magics ?? []).length,
    components: (surface?.components ?? []).length,
    allowedGlobals: (surface?.allowedGlobals ?? []).length,
  };
}

export async function run(ctx) {
  const current = await collectSnapshot();

  if (ctx.flags.update) {
    const previous = readSnapshot();
    writeSnapshot(current);
    const diff = previous ? diffSnapshots(previous, current) : { removed: [], added: [], changed: [] };
    return {
      status: STATUS.PASS,
      summary: `snapshot rewritten (${diff.removed.length} removed, ${diff.added.length} added)`,
      findings: [
        note(`Snapshot updated on request of --update`, {
          file: rel(SNAPSHOT_PATH),
          actual: `method: ${current.method}`,
        }),
      ],
      details: { updated: true, diff, counts: countSurface(current.surface) },
    };
  }

  const previous = readSnapshot();
  if (!previous) {
    return {
      status: STATUS.SKIP,
      summary: 'no committed snapshot to compare',
      findings: [
        note('There is no baseline for the public API', {
          file: rel(SNAPSHOT_PATH),
          expected: 'packages/voodoojs/api-snapshot.json versioned',
          actual: 'missing',
        }),
      ],
      details: {
        howToEnable: 'node scripts/api-snapshot.mjs --update && git add packages/voodoojs/api-snapshot.json',
        counts: countSurface(current.surface),
      },
    };
  }

  const findings = [];

  // A static snapshot compared with a runtime one would produce false difference.
  if (previous.method !== current.method) {
    findings.push(
      note('Committed and current snapshots use different reading methods', {
        file: rel(SNAPSHOT_PATH),
        expected: `method "${previous.method}"`,
        actual: `method "${current.method}"${
          current.runtimeFallbackReason ? ` (${current.runtimeFallbackReason})` : ''
        }`,
      })
    );
  }

  const diff = diffSnapshots(previous, current);

  for (const item of diff.removed) {
    findings.push(
      fail(`Public API removed: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        expected: `${item.kind} "${item.name}" continues exported${item.was ? ` as ${item.was}` : ''}`,
        actual: 'absent in current build; any code using this name breaks',
      })
    );
  }

  for (const item of diff.changed) {
    findings.push(
      fail(`Public API changed shape: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        expected: `${item.name} continues being ${item.from}`,
        actual: `now is ${item.to}`,
      })
    );
  }

  for (const item of diff.added) {
    findings.push(
      note(`New public API: ${item.kind} "${item.name}"`, {
        file: rel(SNAPSHOT_PATH),
        actual: 'addition is compatible; run with --update to incorporate into snapshot',
      })
    );
  }

  const broken = diff.removed.length + diff.changed.length;
  const status = broken ? STATUS.FAIL : STATUS.PASS;
  const counts = countSurface(current.surface);

  return {
    status,
    summary: broken
      ? `${diff.removed.length} removed, ${diff.changed.length} with different shape`
      : diff.added.length
        ? `${diff.added.length} compatible additions; ${counts.V} keys in V`
        : `${counts.V} keys in V, ${counts.exports} exports, ${counts.directives} directives, ${counts.magics} magics`,
    findings,
    details: {
      method: current.method,
      snapshot: rel(SNAPSHOT_PATH),
      counts,
      previousCounts: countSurface(previous.surface),
      diff,
      updateCommand: 'npm run quality -- --only=api-compatibility --update',
    },
  };
}
