/**
 * Minimal static server for opening the site, the demos and the brand gallery
 * with no dependencies at all.
 *
 * It assembles the same layout the Pages workflow publishes: `site/` is the
 * root, and the folders that workflow copies alongside it are mounted where it
 * puts them. Before this, a link written as `examples/` resolved to
 * `site/examples/` locally and 404'd, while the same link worked in production,
 * so the site could only be tested after deploying it.
 *
 * Usage:
 *   node scripts/serve.mjs            serves the assembled site on port 5173
 *   node scripts/serve.mjs 3000       picks the port
 *   node scripts/serve.mjs 3000 .     serves a raw folder instead, unassembled
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] || 5173);
const repoRoot = resolve('.');
const explicitRoot = process.argv[3] ? resolve(process.argv[3]) : null;
const rootDir = explicitRoot ?? join(repoRoot, 'site');

/**
 * Paths the Pages workflow copies into the published site. Keep this in step
 * with .github/workflows/pages.yml, or local and production disagree again.
 */
const MOUNTS = explicitRoot
  ? {}
  : {
      '/examples': join(repoRoot, 'examples'),
      '/design-system': join(repoRoot, 'design-system'),
      '/brand': join(repoRoot, 'brand'),
      '/packages': join(repoRoot, 'packages'),
    };

/** Resolves a request path against the mounts first, then the served root. */
function resolveRequest(pathname) {
  for (const [prefix, target] of Object.entries(MOUNTS)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return { base: target, rest: pathname.slice(prefix.length) || '/' };
    }
  }
  return { base: rootDir, rest: pathname };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const { base, rest } = resolveRequest(decodeURIComponent(url.pathname));
    let filePath = join(base, normalize(rest));

    // Impede sair da raiz servida.
    if (!filePath.startsWith(base)) {
      res.writeHead(403).end('Acesso negado');
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    if (!info) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1><p>Arquivo nao encontrado.</p>');
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end(`Erro: ${error.message}`);
  }
});

server.listen(port, () => {
  console.log(`Voodoo.js servindo ${rootDir}`);
  console.log(`  http://localhost:${port}/site/          landing page`);
  console.log(`  http://localhost:${port}/examples/      demos`);
  console.log(`  http://localhost:${port}/brand/preview.html`);
  console.log(`  http://localhost:${port}/design-system/`);
});
