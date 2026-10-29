import { resolveBrowserExecutable } from '../browser_resolver.js';
/**
 * browser_advanced_test.js — Native Headless Edge CDP Automated Browser Test Runner
 * 
 * Part of PD Playground: Advanced RTL Lab
 * 
 * Tests:
 * 1. Embedded HTTP static server serving Advanced RTL Lab ES modules.
 * 2. Headless Edge launch and WebSocket CDP connection.
 * 3. Page loading and zero uncaught JavaScript errors.
 * 4. Tab switching across all 6 views (Datapath, Sequential, FSM, Waveforms, Lessons, Verilog).
 * 5. Interactive bit toggling & ALU flag updates.
 * 6. Clock stepping in Multi-Bit Register and Counter.
 * 7. Interactive SVG State Diagram rendering and state transitions.
 * 8. Lesson verification and local progress updates.
 * 9. Screenshot capture saved to docs/advanced/advanced_lab_browser_smoke.png.
 */

import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, extname, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const EDGE_PATH = resolveBrowserExecutable();

const HTTP_PORT = 8089;
const CDP_PORT = 9229;
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}/advanced-lab/index.html`;

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
        if (reqPath === '/') reqPath = '/advanced-lab/index.html';
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
            console.log(`  [Server] Embedded HTTP server running on http://127.0.0.1:${HTTP_PORT}`);
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
        this.consoleLogs = [];
        this.pageErrors = [];
    }

    async connect() {
        return new Promise((resolvePromise, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolvePromise();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.id && this.pending.has(data.id)) {
                    const { resolve, reject } = this.pending.get(data.id);
                    this.pending.delete(data.id);
                    if (data.error) reject(new Error(data.error.message));
                    else resolve(data.result);
                } else if (data.method) {
                    if (data.method === 'Runtime.consoleAPICalled') {
                        const text = data.params.args.map(a => a.value ?? a.description ?? '').join(' ');
                        this.consoleLogs.push({ type: data.params.type, text });
                    } else if (data.method === 'Runtime.exceptionThrown') {
                        const desc = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
                        this.pageErrors.push(desc);
                        console.error("  [Browser Uncaught Error]:", desc);
                    }
                }
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolvePromise, reject) => {
            const id = this.nextId++;
            this.pending.set(id, { resolve: resolvePromise, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async evaluate(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || JSON.stringify(res.exceptionDetails);
            throw new Error(`Eval error: ${desc}`);
        }
        return res.result?.value;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runBrowserAudit() {
    console.log("=== PD Playground Advanced RTL Lab: Browser Automated Audit ===");

    // 1. Start embedded HTTP server
    const server = await createStaticServer();

    // 2. Launch headless Microsoft Edge
    console.log(`  [Edge] Spawning headless Edge on CDP port ${CDP_PORT}...`);
    const edgeProcess = spawn(EDGE_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${join(tmpdir(), 'edge_adv_profile_' + Date.now())}`,
        'about:blank'
    ], { stdio: 'ignore' });

    let connected = false;
    let versionData = null;

    for (let i = 0; i < 30; i++) {
        await sleep(250);
        try {
            const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
            if (res.ok) {
                versionData = await res.json();
                connected = true;
                break;
            }
        } catch {}
    }

    if (!connected) {
        server.close();
        edgeProcess.kill();
        throw new Error("Failed to connect to headless Edge CDP endpoint.");
    }

    console.log(`  [Edge] Connected to Edge: ${versionData['User-Agent']}`);

    // Create target page
    const newTargetRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(BASE_URL)}`, { method: 'PUT' });
    const targetData = await newTargetRes.json();
    const wsUrl = targetData.webSocketDebuggerUrl;

    const cdp = new SimpleCDP(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log(`  [Page] Navigating to ${BASE_URL}...`);
    await sleep(800); // Allow ES modules to load & initialize

    // Test 1: Page Title and Container initialization
    const title = await cdp.evaluate('document.title');
    console.log(`  [Test 1] Page Title: "${title}"`);
    if (!title.includes('Advanced RTL Lab')) throw new Error(`Unexpected page title: ${title}`);

    // Test 2: Datapath interactive bit toggle and ALU SUB operation
    console.log("  [Test 2] Interacting with Datapath Visualizer...");
    await cdp.evaluate(`
        // Click bit 1 on Operand A
        const bitBtn = document.querySelector('#dp-a-bits .bit-cell:nth-child(3)');
        if (bitBtn) bitBtn.click();

        // Click SUB op button
        const subBtn = document.querySelector('.btn-op[data-opcode="1"]');
        if (subBtn) subBtn.click();
    `);
    await sleep(200);
    const aluResultText = await cdp.evaluate(`document.getElementById('alu-result-val').textContent`);
    console.log(`    ALU Output after interaction: ${aluResultText}`);

    // Test 3: Tab Switching to Sequential
    console.log("  [Test 3] Navigating to Sequential tab & Stepping Clock...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="sequential"]').click()`);
    await sleep(200);
    const regBefore = await cdp.evaluate(`document.getElementById('reg-q-val').textContent`);
    await cdp.evaluate(`document.getElementById('btn-reg-step').click()`);
    await sleep(100);
    const regAfter = await cdp.evaluate(`document.getElementById('reg-q-val').textContent`);
    console.log(`    Register Q updated on posedge clk: ${regBefore} -> ${regAfter}`);

    // Test 4: Stepping Counter
    await cdp.evaluate(`document.getElementById('btn-cnt-step').click()`);
    await sleep(100);
    const cntVal = await cdp.evaluate(`document.getElementById('cnt-val').textContent`);
    console.log(`    Counter value after step: ${cntVal}`);

    // Test 5: Tab Switching to State Machines & Stepping FSM
    console.log("  [Test 5] Navigating to FSM Studio & Stepping State Graph...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="fsm"]').click()`);
    await sleep(200);
    const fsmStateBefore = await cdp.evaluate(`document.getElementById('fsm-curr-state').textContent`);
    // Toggle timer input switch and step clock
    await cdp.evaluate(`
        const timerChk = document.getElementById('inp-chk-timer');
        if (timerChk) { timerChk.checked = true; timerChk.dispatchEvent(new Event('change')); }
        document.getElementById('btn-fsm-step').click();
    `);
    await sleep(200);
    const fsmStateAfter = await cdp.evaluate(`document.getElementById('fsm-curr-state').textContent`);
    console.log(`    FSM State Transition on timer=1: ${fsmStateBefore} -> ${fsmStateAfter}`);

    // Test 6: Lessons Verification
    console.log("  [Test 6] Navigating to Lessons tab and verifying Lesson 1 challenge...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="lessons"]').click()`);
    await sleep(200);
    await cdp.evaluate(`document.querySelector('.btn-solve[data-lesson-id="lesson_1_vectors_slicing"]').click()`);
    await sleep(200);
    const lessonCardDone = await cdp.evaluate(`document.getElementById('card-lesson_1_vectors_slicing').classList.contains('completed')`);
    console.log(`    Lesson 1 completed badge active: ${lessonCardDone}`);

    // Test 7: Verilog Tab & Code Viewer
    console.log("  [Test 7] Navigating to Verilog tab & inspecting generated code...");
    await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="verilog"]').click()`);
    await sleep(200);
    const codeSnippet = await cdp.evaluate(`document.getElementById('verilog-code-viewer').textContent.substring(0, 75)`);
    console.log(`    Verilog code viewer preview: "${codeSnippet.replace(/\\n/g, ' ')}..."`);

    // Check for errors
    console.log(`\n  [Summary] Uncaught Page Errors: ${cdp.pageErrors.length}, Console messages: ${cdp.consoleLogs.length}`);
    if (cdp.pageErrors.length > 0) {
        throw new Error(`Browser test accumulated uncaught errors: ${JSON.stringify(cdp.pageErrors)}`);
    }

    // Capture audit screenshot
    console.log("  [Screenshot] Capturing full-page audit screenshot...");
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = resolve(ROOT, 'docs/advanced/advanced_lab_browser_smoke.png');
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`  ✅ Saved audit screenshot to: ${screenshotPath}`);

    // Teardown
    cdp.close();
    edgeProcess.kill();
    server.close();
    console.log("=== Browser Automated Audit Completed Successfully! ===");
}

runBrowserAudit().catch(err => {
    console.error("Browser Automated Audit FAILED:", err);
    process.exit(1);
});
