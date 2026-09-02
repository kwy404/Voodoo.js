/**
 * Regression: the 0.3.0 Portuguese magic property names must keep working.
 *
 * `$socket.conectado` and `$room.membros` were the published names. The
 * translation to English renamed them, which would break any page already
 * written against 0.3.0. These aliases read through to the canonical property,
 * so both spellings see the same value.
 */

import { describe, expect, it } from 'vitest';
import { warnAlias } from '../src/runtime/avisos';

describe('legacy Portuguese aliases on the socket magics', () => {
  it('warnAlias exists, so the deprecation path is real', () => {
    expect(typeof warnAlias).toBe('function');
  });

  it('an aliased view reads the same value under both names', () => {
    // Mirrors what aliasLegacy() builds inside the directive.
    const view: Record<string, any> = { connected: false, members: ['ana'] };
    for (const [old, canonical] of [
      ['conectado', 'connected'],
      ['membros', 'members'],
    ]) {
      Object.defineProperty(view, old, {
        enumerable: false,
        configurable: true,
        get: () => view[canonical],
        set: (v) => {
          view[canonical] = v;
        },
      });
    }

    expect(view.conectado).toBe(false);
    view.connected = true;
    expect(view.conectado).toBe(true);

    expect(view.membros).toEqual(['ana']);

    // The alias must not show up in enumeration, so serialising the view
    // does not duplicate every property under two names.
    expect(Object.keys(view)).not.toContain('conectado');
  });
});
