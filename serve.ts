// Local play-test server for LUMENWAKE (Node 22, standard library only): `node serve.ts`
// serves game/ at http://127.0.0.1:8096/ and nothing else. Loopback only, read-only, no caching.
// Another port for side-by-side previews: `PORT=8097 node serve.ts`.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 8096;
const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end('method not allowed');
    return;
  }
  let path: string;
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', `http://${HOST}`).pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(gameRoot, normalize(path)));
  if (!file.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let size = 0;
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`LUMENWAKE is being served at http://${HOST}:${PORT}/ (Ctrl+C to stop)`);
});
