/**
 * Static file server for the real-browser test suite.
 *
 * It exists instead of `scripts/serve.mjs` for one reason: these tests need
 * response headers, and a plain file server has no way to send them. Two
 * mounts, one of which is header-bearing:
 *
 *   /fixtures/<file>   test pages, no special headers
 *   /csp/<file>        the same pages, served under a strict
 *                      Content-Security-Policy with no 'unsafe-eval' and no
 *                      'unsafe-inline' for scripts
 *   /dist/<file>       the real built bundles from packages/voodoojs/dist
 *
 * Everything is read from disk on every request, so a rebuild of `dist` is
 * picked up without restarting. Nothing here reaches the network, and the
 * server refuses any path that escapes its two roots.
 *
 * Usage:
 *   node packages/voodoojs/test/browser/server.mjs [port]
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const FIXTURES = join(HERE, 'fixtures');
const DIST = resolve(HERE, '..', '..', 'dist');

const DEFAULT_PORT = 5188;

/**
 * The policy the CSP test runs under.
 *
 * `script-src 'self'` is the whole point: it forbids `eval`, `new Function`,
 * `setTimeout('code')` and inline `<script>`. A framework that compiles
 * expressions into functions cannot evaluate a single template under it.
 * `object-src` and `base-uri` are there so the policy is a policy someone
 * would actually ship, not a single directive written for the test.
 *
 * `style-src` keeps 'unsafe-inline' on purpose. Voodoo injects a `<style>`
 * element and writes `element.style.display`, which is inline styling and has
 * nothing to do with the claim under test. Tightening it here would make the
 * test fail for a reason it is not about.
 */
const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resolves a request path to a file, or `null` if it is not under a mount. */
function resolveRequest(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^[\\/]+/, '');
  const [mount, ...rest] = clean.split(/[\\/]/);
  const tail = rest.join(sep);

  if (mount === 'fixtures') return { root: FIXTURES, file: join(FIXTURES, tail), csp: false };
  if (mount === 'csp') return { root: FIXTURES, file: join(FIXTURES, tail), csp: true };
  if (mount === 'dist') return { root: DIST, file: join(DIST, tail), csp: false };
  return null;
}

export function createFixtureServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }).end('ok');
      return;
    }

    const target = resolveRequest(url.pathname);
    if (!target) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Unknown mount');
      return;
    }

    // A resolved path that left its root means the request tried to climb out.
    const file = resolve(target.file);
    if (file !== target.root && !file.startsWith(target.root + sep)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('Forbidden');
      return;
    }

    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    const headers = {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      // Tests must see the file that is on disk right now, never a cached one.
      'cache-control': 'no-store',
    };
    if (target.csp) headers['content-security-policy'] = STRICT_CSP;

    res.writeHead(200, headers).end(await readFile(file));
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const port = Number(process.argv[2] || process.env.VOODOO_BROWSER_TEST_PORT || DEFAULT_PORT);
  createFixtureServer().listen(port, '127.0.0.1', () => {
    console.log(`Voodoo browser-test fixtures on http://127.0.0.1:${port}/`);
  });
}

export { DEFAULT_PORT, STRICT_CSP };
