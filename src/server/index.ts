import { createReadStream, existsSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { initPhysics } from '../shared/simulation';
import { BoatRoom } from './BoatRoom';
import { voyageStore, WORLD_VERSION } from './voyages';
import { PROTOCOL_VERSION, PHYSICS_VERSION } from '../shared/protocol';

await initPhysics();
voyageStore();
const root = resolve(process.env.BOAT_DIST_DIR ?? 'dist');
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' };
const server = new Server({
  transport: new WebSocketTransport({ maxPayload: 2048 }),
  greet: false,
  express: app => {
    app.use((req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ game: 'Bad at Boating', protocol: PROTOCOL_VERSION, physics: PHYSICS_VERSION, world: WORLD_VERSION, status: 'ready' }));
    return;
  }
  let pathname: string;
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('Invalid path'); return; }
  const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!path.startsWith(root + sep) || !existsSync(path) || !statSync(path).isFile()) { res.writeHead(404); res.end('Not found. Run npm run build first.'); return; }
  const cache = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  const security: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; worker-src blob:; img-src 'self' data:; font-src 'self'",
  };
  res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': cache, ...security });
  createReadStream(path).on('error', () => res.destroy()).pipe(res);
    });
  },
});
server.define('boat', BoatRoom);
const port = Number(process.env.PORT ?? 2567);
await server.listen(port, '0.0.0.0');
console.log(`Bad at Boating authority listening on port ${port}`);
