/**
 * The Node version check, kept apart from the rest of the CLI on purpose.
 *
 * `bin/voodoo.mjs` imports this before anything else, so this file has to parse
 * on a Node too old to run the CLI itself. That is the whole point: an old Node
 * should get one sentence saying what to install, not a SyntaxError or an
 * `ERR_UNKNOWN_BUILTIN_MODULE` from deep inside a dependency.
 *
 * Plain functions with no imports, so the test can call them with any version.
 */

/**
 * The lowest major version an `engines.node` range accepts, or `null` when the
 * range is not the simple `>=N` form this package uses.
 */
export function minimumMajor(range) {
  const match = /^\s*>=\s*v?(\d+)/.exec(String(range || ''));
  return match ? Number(match[1]) : null;
}

/**
 * The message to show when `version` is older than `range` allows, or `null`
 * when it is fine.
 */
export function nodeProblem(version, range) {
  const minimum = minimumMajor(range);
  if (minimum === null) return null;
  const major = Number(String(version).replace(/^v/, '').split('.')[0]);
  if (!(major < minimum)) return null;
  return (
    'voodoojs-cli needs Node ' + minimum + ' or newer, and this is Node ' +
    String(version).replace(/^v/, '') + '. Install a current release from https://nodejs.org and run the command again.'
  );
}
