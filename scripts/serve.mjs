/**
 * Servidor estatico minimo para abrir as demos, a landing page e a galeria da
 * marca sem precisar de nenhuma dependencia.
 *
 * Uso:
 *   node scripts/serve.mjs           serve a raiz do projeto na porta 5173
 *   node scripts/serve.mjs 3000      escolhe a porta
 *   node scripts/serve.mjs 3000 site serve apenas a pasta informada
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] || 5173);
const rootDir = resolve(process.argv[3] || '.');

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
    let filePath = join(rootDir, normalize(decodeURIComponent(url.pathname)));

    // Impede sair da raiz servida.
    if (!filePath.startsWith(rootDir)) {
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
