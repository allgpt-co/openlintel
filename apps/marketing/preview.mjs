import process from 'node:process';
import console from 'node:console';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { config } from './config.mjs';

const root = resolve(
  process.env.MARKETING_OUT_DIR || fileURLToPath(new URL('../../docs', import.meta.url)),
);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};
const port = Number(process.env.PORT || 4173);
const server = createServer(async (request, response) => {
  // Preview servers are not a production publishing target.
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const requestUrl = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(requestUrl.pathname);
    if (config.base !== '/' && pathname === config.base.slice(0, -1)) {
      response.writeHead(301, { Location: config.base + requestUrl.search });
      response.end();
      return;
    }
    if (!pathname.startsWith(config.base)) throw new Error('Outside base path');
    if (pathname.endsWith('/index.html')) {
      response.writeHead(301, {
        Location: pathname.slice(0, -'index.html'.length) + requestUrl.search,
      });
      response.end();
      return;
    }
    let file = resolve(root, '.' + '/' + pathname.slice(config.base.length));
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Outside preview root');
    const info = await stat(file);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(301, { Location: pathname + '/' + requestUrl.search });
        response.end();
        return;
      }
      file = resolve(file, 'index.html');
    }
    let body = await readFile(file);
    const headers = {
      'Content-Type': mime[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    };
    if (
      /\btext\/|javascript|json|xml/.test(headers['Content-Type']) &&
      request.headers['accept-encoding']?.includes('gzip')
    ) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    let body;
    try {
      body = await readFile(resolve(root, '404.html'));
    } catch {
      body = Buffer.from('Page not found');
    }
    response.writeHead(404, {
      'Content-Type': body[0] === 60 ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': body.length,
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  }
}).listen(port, '0.0.0.0', () =>
  console.log(`OpenLintel preview: http://localhost:${server.address().port}${config.base}`),
);
