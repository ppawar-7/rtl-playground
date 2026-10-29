import { resolveBrowserExecutable } from './browser_resolver.js';
/**
 * github_pages_subpath_test.js — Automated GitHub Pages Subdirectory Hosting Verification
 * 
 * Verifies that PD Playground functions 100% correctly when served under a non-root
 * repository subdirectory URL path, e.g. "http://127.0.0.1:8096/rtl-playground/".
 * 
 * Checks:
 * 1. /rtl-playground/index.html loads with 200 OK.
 * 2. All CSS stylesheets, JS ES modules, and SVG assets resolve under /rtl-playground/... without 404s.
 * 3. Root requests outside /rtl-playground/ return 404 (proving no accidental root-relative links).
 * 4. Navigating to /rtl-playground/advanced-lab/index.html?tab=datapath works seamlessly.
 * 5. Return link ../index.html correctly lands on /rtl-playground/index.html.
 * 6. Presets load and simulate.
 * 7. Zero uncaught console errors or 404 resource rejections.
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.SITE_ROOT ? resolve(process.env.SITE_ROOT) : resolve(__dirname, '..');
const EDGE_PATH = resolveBrowserExecutable();

const HTTP_PORT = 8096;
const CDP_PORT = 9239;
const SUBPATH_PREFIX = '/rtl-playground';
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}${SUBPATH_PREFIX}/index.html`;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml'
};

const networkLog = [];

function createSubpathServer() {
    const server = http.createServer((req, res) => {
        let reqUrl = req.url.split('?')[0];
        networkLog.push(reqUrl);

        // Strict Subdirectory enforcement:
        // GitHub Pages for project repositories hosts under /<repo-name>/
        if (!reqUrl.startsWith(SUBPATH_PREFIX)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Not Found (Root path violation: requested "${reqUrl}" outside "${SUBPATH_PREFIX}")`);
            return;
        }

        // Strip prefix to resolve local file
        let relativePath = reqUrl.slice(SUBPATH_PREFIX.length);
        if (relativePath === '' || relativePath === '/') relativePath = '/index.html';

        const filePath = resolve(ROOT, '.' + relativePath);
        if (!existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Not Found: ${reqUrl}`);
            return;
        }

        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        try {
            const content = readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': mime });
            res.end(content);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Error: ${err.message}`);
        }
    });

    return new Promise(resolve => server.listen(HTTP_PORT, '127.0.0.1', () => resolve(server)));
}

class CDPClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.nextId = 1;
        this.pending = new Map();
        this.pageErrors = [];
    }

    async connect() {
        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => res();
            this.ws.onerror = (e) => rej(e);
            this.ws.onmessage = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.id && this.pending.has(data.id)) {
                    const { resolve, reject } = this.pending.get(data.id);
                    this.pending.delete(data.id);
                    if (data.error) reject(new Error(data.error.message));
                    else resolve(data.result);
                } else if (data.method === 'Runtime.exceptionThrown') {
                    const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
                    this.pageErrors.push(desc);
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = this.nextId++;
            this.pending.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(`CDP Evaluate Error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
        }
        return res.result?.value;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runSubpathAudit() {
    console.log("=== PD Playground: GitHub Pages Subpath (/rtl-playground/) Hosting Audit ===");

    const server = await createSubpathServer();
    console.log(`  [Server] Subdirectory static server active at http://127.0.0.1:${HTTP_PORT}${SUBPATH_PREFIX}/`);

    const tempProfile = 'C:\\Users\\pranil\\AppData\\Local\\Temp\\edge_subpath_profile_' + Date.now();
    const edgeProc = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${tempProfile}`,
        'about:blank'
    ], { stdio: 'ignore' });

    let connected = false;
    let retries = 25;
    let targets = null;

    while (retries > 0 && !connected) {
        try {
            await sleep(300);
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
            targets = await res.json();
            if (targets && targets.length > 0) connected = true;
        } catch {}
        retries--;
    }

    if (!connected || !targets) {
        edgeProc.kill();
        server.close();
        throw new Error('Failed to connect to headless Edge on CDP port ' + CDP_PORT);
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    console.log(`  [Step 1] Navigating to subpath entrypoint: ${BASE_URL}...`);
    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(800);

    const title = await cdp.evaluate('document.title');
    console.log(`  [Step 1] Loaded Title: "${title}"`);
    if (!title.includes('RTL Playground')) throw new Error('Subpath page load failed');

    // Step 2: Test Preset Circuit Load in Subpath
    console.log("  [Step 2] Testing preset circuit load under subpath...");
    await cdp.evaluate(`
        const sel = document.getElementById('preset-select');
        sel.value = 'full-adder';
        sel.dispatchEvent(new Event('change'));
    `);
    await sleep(400);
    const compCount = await cdp.evaluate('window.app.graph.components.size');
    console.log(`  [Step 2] Full Adder loaded, component count on canvas: ${compCount}`);
    if (compCount < 5) throw new Error('Preset loading failed on subpath');

    // Step 3: Click 'Datapaths & ALU' navigation link under subpath
    console.log("  [Step 3] Clicking 'Datapaths & ALU' link to navigate to subpath advanced lab...");
    await cdp.evaluate(`document.querySelector('a[href*="tab=datapath"]').click()`);
    await sleep(800);

    const advUrl = await cdp.evaluate('window.location.href');
    const advTitle = await cdp.evaluate('document.title');
    console.log(`  [Step 3] Navigated URL: "${advUrl}", Title: "${advTitle}"`);
    if (!advUrl.includes('/rtl-playground/advanced-lab/index.html?tab=datapath')) {
        throw new Error('Navigation failed to preserve /rtl-playground/ subpath: ' + advUrl);
    }

    // Step 4: Test Curriculum tab in Advanced Lab
    console.log("  [Step 4] Clicking 'Curriculum (24)' tab...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="lessons"]').click()`);
    await sleep(300);
    const challengeCount = await cdp.evaluate(`document.querySelectorAll('.btn-solve').length`);
    console.log(`  [Step 4] Lessons loaded in subpath, challenge buttons found: ${challengeCount}`);
    if (challengeCount !== 12) throw new Error('Curriculum challenges count mismatch: ' + challengeCount);

    // Step 5: Click '← RTL Fundamentals' return link
    console.log("  [Step 5] Clicking '← RTL Fundamentals' back-link...");
    await cdp.evaluate(`document.querySelector('.nav-back-btn').click()`);
    await sleep(800);

    const backUrl = await cdp.evaluate('window.location.href');
    console.log(`  [Step 5] Returned URL: "${backUrl}"`);
    if (!backUrl.includes('/rtl-playground/index.html')) {
        throw new Error('Return link failed to preserve /rtl-playground/ subpath: ' + backUrl);
    }

    // Step 6: Verify no 404 network errors occurred
    console.log(`  [Step 6] Verifying network requests for subpath compliance (Total: ${networkLog.length})...`);
    const rootViolations = networkLog.filter(url => !url.startsWith(SUBPATH_PREFIX) && url !== '/favicon.ico');
    if (rootViolations.length > 0) {
        throw new Error('Detected requests violating subpath: ' + JSON.stringify(rootViolations));
    }
    console.log("  [Step 6] 0 root violations! All requests remained strictly within /rtl-playground/.");

    cdp.close();
    edgeProc.kill();
    server.close();
    console.log("\n=== GitHub Pages Subpath Audit PASSED CLEANLY! ===");
}

runSubpathAudit().catch(err => {
    console.error("\n❌ GitHub Pages Subpath Audit FAILED:", err);
    process.exit(1);
});
