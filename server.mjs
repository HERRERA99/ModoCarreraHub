import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const allowed = new Set(['index.html', 'styles.css', 'app.js', 'model.js', 'favicon.svg']);
const port = Number(process.env.PORT || 5173);
http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    if (!allowed.has(requested)) { res.writeHead(404); res.end('No encontrado'); return; }
    const content = await readFile(path.join(root, requested));
    res.writeHead(200, { 'Content-Type': types[path.extname(requested)], 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(500); res.end('No se pudo abrir el archivo.'); }
}).listen(port, '127.0.0.1', () => console.log(`Modo Carrera Hub: http://localhost:${port}`));
