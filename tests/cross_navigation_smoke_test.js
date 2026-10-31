import { resolveBrowserExecutable } from './browser_resolver.js';
/**
 * cross_navigation_smoke_test.js — End-to-End Cross-Platform Navigation Test
 * 
 * Part of PD Playground: Full RTL Integration & Verification Closure
 * 
 * Verifies seamless bi-directional navigation between:
 * 1. RTL Fundamentals (index.html)
 * 2. Advanced RTL Lab Datapaths & ALU (advanced-lab/index.html?tab=datapath)
 * 3. Sequential Systems & Counters (advanced-lab/index.html?tab=sequential)
 * 4. Finite State Machine Studio (advanced-lab/index.html?tab=fsm)
 * 5. Full 22-Lesson Unified Curriculum
 * 6. Return link to RTL Fundamentals
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EDGE_PATH = resolveBrowserExecutable();

const HTTP_PORT = 8092;
const CDP_PORT = 9235;
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}/index.html`;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png':  'image/png',
    '.svg':  'image/svg+xml'
};

function createStaticServer() {
    const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = resolve(ROOT, '.' + reqPath);

        if (!existsSync(filePath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`Not found: ${reqPath}`);
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
            res.end(`Server error: ${err.message}`);
        }
    });

    return new Promise((resolveServer) => {
        server.listen(HTTP_PORT, '127.0.0.1', () => {
            console.log(`  [Server] Embedded static server on http://127.0.0.1:${HTTP_PORT}`);
            resolveServer(server);
        });
    });
}

class SimpleCDP {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.nextId = 1;
        this.pending = new Map();
        this.pageErrors = [];
        this.consoleLogs = [];
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
                } else if (data.method === 'Runtime.consoleAPICalled') {
                    const text = data.params.args.map(a => a.value ?? a.description ?? '').join(' ');
                    this.consoleLogs.push({ type: data.params.type, text });
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
        const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (res.exceptionDetails) {
            throw new Error(`CDP Evaluate Error: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
        }
        return res.result?.value;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runNavigationAudit() {
    console.log("=== PD Playground: Cross-Platform Navigation Audit ===");
    const server = await createStaticServer();

    console.log(`  [Edge] Spawning headless Edge on CDP port ${CDP_PORT}...`);
    const tempProfile = join(tmpdir(), 'edge_nav_profile_' + Date.now());
    const edgeProcess = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${tempProfile}`,
        'about:blank'
    ], { stdio: 'ignore' });

    let connected = false;
    for (let i = 0; i < 50; i++) {
        await sleep(300);
        try {
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
            if (res.ok) { connected = true; break; }
        } catch {}
    }

    if (!connected) {
        server.close();
        edgeProcess.kill();
        throw new Error("Failed to connect to Edge CDP endpoint.");
    }

    const newTargetRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(BASE_URL)}`, { method: 'PUT' });
    const targetData = await newTargetRes.json();
    const cdp = new SimpleCDP(targetData.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log(`  [Page] Navigating to ${BASE_URL}...`);
    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(800);

    // Step 1: Verify RTL Fundamentals landing
    const title1 = await cdp.evaluate('document.title');
    console.log(`  [Step 1] Initial Title: "${title1}"`);
    if (!title1.includes('RTL Playground')) throw new Error('Failed to load RTL Playground landing page');

    // Step 2: Click platform nav link to Datapaths & ALU
    console.log("  [Step 2] Clicking 'Datapaths & ALU' navigation link...");
    await cdp.evaluate(`document.querySelector('.platform-nav-btn[href*=\"tab=datapath\"]').click()`);
    await sleep(800);

    const title2 = await cdp.evaluate('document.title');
    const currTab = await cdp.evaluate('window.app ? window.app.currentTab : "none"');
    console.log(`  [Step 2] Navigated to: "${title2}", Active Tab: "${currTab}"`);
    if (!title2.includes('Advanced RTL Lab')) throw new Error('Failed to navigate to Advanced RTL Lab');
    if (currTab !== 'datapath') throw new Error(`Expected active tab 'datapath', got '${currTab}'`);

    // Step 3: Switch to Sequential in Advanced Lab
    console.log("  [Step 3] Switching to 'Registers & Counters' tab...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab=\"sequential\"]').click()`);
    await sleep(200);
    const isSeqActive = await cdp.evaluate(`document.getElementById('tab-sequential').classList.contains('active')`);
    console.log(`  [Step 3] Sequential tab active: ${isSeqActive}`);
    if (!isSeqActive) throw new Error('Sequential tab failed to activate');

    // Step 4: Switch to FSM Studio
    console.log("  [Step 4] Switching to 'State Machines' (FSM Studio) tab...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab=\"fsm\"]').click()`);
    await sleep(200);
    const hasSvgGraph = await cdp.evaluate(`Boolean(document.querySelector('#fsm-mount svg'))`);
    console.log(`  [Step 4] FSM SVG State Diagram rendered: ${hasSvgGraph}`);
    if (!hasSvgGraph) throw new Error('FSM state diagram missing');

    // Step 5: Switch to Curriculum (22 Lessons)
    console.log("  [Step 5] Switching to 'Curriculum (24)' tab...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab=\"lessons\"]').click()`);
    await sleep(200);
    const advLessonCount = await cdp.evaluate(`document.querySelectorAll('.btn-solve').length`);
    console.log(`  [Step 5] Interactive Challenge count in curriculum view: ${advLessonCount}`);
    if (advLessonCount !== 12) throw new Error(`Expected 12 interactive challenges, found ${advLessonCount}`);

    // Step 6: Click back link to RTL Fundamentals
    console.log("  [Step 6] Clicking '← RTL Fundamentals' return link...");
    await cdp.evaluate(`document.querySelector('.nav-back-btn').click()`);
    await sleep(800);

    const titleBack = await cdp.evaluate('document.title');
    const hasCanvas = await cdp.evaluate(`Boolean(document.getElementById('circuit-svg'))`);
    console.log(`  [Step 6] Returned to: "${titleBack}", Canvas Present: ${hasCanvas}`);
    if (!titleBack.includes('RTL Playground') || !hasCanvas) throw new Error('Failed to return to RTL Fundamentals');

    // Audit summary
    console.log(`\n  [Summary] Uncaught Page Errors: ${cdp.pageErrors.length}, Console Logs: ${cdp.consoleLogs.length}`);
    if (cdp.pageErrors.length > 0) {
        throw new Error(`Accumulated errors during navigation: ${JSON.stringify(cdp.pageErrors)}`);
    }

    cdp.close();
    edgeProcess.kill();
    server.close();
    console.log("=== Cross-Platform Navigation Audit Completed Successfully! ===");
}

runNavigationAudit().catch(err => {
    console.error("Navigation Audit FAILED:", err);
    process.exit(1);
});
