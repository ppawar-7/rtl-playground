import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8085;
const ROOT = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + reqPath);
        return;
    }

    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*'
    });
    res.end(fs.readFileSync(filePath));
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`PD Playground Server running at http://localhost:${PORT}/`);
    console.log(`RTL Fundamentals:  http://localhost:${PORT}/index.html`);
    console.log(`Advanced RTL Lab:  http://localhost:${PORT}/advanced-lab/index.html`);
});
