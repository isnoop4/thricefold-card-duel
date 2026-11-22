// A tiny static server for game/ (Node standard library only): `node tools/serve-game.mjs [port]`
// serves the game on http://127.0.0.1:<port>/ exactly as any static host would, so it can be played
// and photographed locally. It refuses every path outside game/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('../game', import.meta.url)));

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/** Starts the server on `port` (0 picks a free one) and resolves with it once it listens. */
export function serveGame(port = 8080) {
  const server = createServer(async (request, response) => {
    let pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(gameRoot, normalize(pathname)));
    if (!file.startsWith(gameRoot + sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end('not found');
    }
  });
  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => done(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await serveGame(Number(process.argv[2] ?? 8080));
  console.log(`Thricefold is on http://127.0.0.1:${server.address().port}/`);
}
