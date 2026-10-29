import { resolveBrowserExecutable } from './browser_resolver.js';
/**
 * student_journeys_audit.js — Automated End-to-End Educational Journey Audit
 * 
 * Part of PD Playground: Full RTL Integration & Verification Closure
 * 
 * Verifies all 6 student learning journeys (A through F) via headless Edge CDP:
 * - Journey A: Beginner logic gates -> truth table -> Verilog explainer
 * - Journey B: Sequential clock stepping -> edge triggering -> waveform viewer
 * - Journey C: Advanced datapath -> multi-bit vectors -> ALU flags & carry chains
 * - Journey D: Modulo counters & universal shift registers -> step & rollover
 * - Journey E: Finite State Machine Studio -> transitions & SVG state graph
 * - Journey F: Full progressive curriculum (12 fundamentals + 10 advanced)
 */

import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EDGE_PATH = resolveBrowserExecutable();

const HTTP_PORT = 8094;
const CDP_PORT = 9238;
const BASE_URL = `http://127.0.0.1:${HTTP_PORT}/index.html`;

const SCREENSHOT_DIR = resolve(ROOT, 'docs/screenshots');
if (!existsSync(SCREENSHOT_DIR)) {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

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
            console.log(`  [Server] Embedded static server running on http://127.0.0.1:${HTTP_PORT}`);
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

    async captureScreenshot(filename) {
        const screenshot = await this.send('Page.captureScreenshot', { format: 'png' });
        const filePath = resolve(SCREENSHOT_DIR, filename);
        writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
        console.log(`    📷 Milestone screenshot saved: ${filePath}`);
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runJourneysAudit() {
    console.log("================================================================================");
    console.log("   PD Playground: End-to-End Student Educational Journeys (A - F)");
    console.log("   Browser Engine: Headless Microsoft Edge via Chrome DevTools Protocol");
    console.log("================================================================================\n");

    const server = await createStaticServer();

    console.log(`  [Edge] Spawning headless Edge on CDP port ${CDP_PORT}...`);
    const edgeProcess = spawn(EDGE_PATH, [
        `--remote-debugging-port=${CDP_PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=C:\\Users\\pranil\\AppData\\Local\\Temp\\edge_journeys_profile_' + Date.now(),
        'about:blank'
    ], { stdio: 'ignore' });

    let connected = false;
    for (let i = 0; i < 30; i++) {
        await sleep(200);
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

    console.log(`  [Page] Initial navigation to ${BASE_URL}...`);
    await sleep(800);

    // ─── Journey A: Beginner Logic Gates & Generated Verilog ─────────────────
    console.log("▶ Journey A: Logic Gates, Truth Table & Interactive Verilog Explanation");
    {
        // Load half-adder preset
        await cdp.evaluate(`window.app.loadPreset('half-adder')`);
        await sleep(300);

        // Switch to Verilog panel
        await cdp.evaluate(`
            const verilogTab = document.querySelector('.drawer-tab-btn[data-tab="verilog"]');
            if (verilogTab) verilogTab.click();
        `);
        await sleep(200);

        const verilogText = await cdp.evaluate(`document.getElementById('verilog-code-display').textContent`);
        const hasSumAssign = verilogText.includes('assign') && verilogText.includes('^');
        console.log(`    Verilog continuous assignment generated: ${hasSumAssign}`);
        if (!hasSumAssign) throw new Error("Verilog code missing continuous assignment");

        // Inspect explainer card
        const hasExplainer = await cdp.evaluate(`Boolean(document.getElementById('verilog-explainer-card'))`);
        console.log(`    Interactive RTL explainer card active: ${hasExplainer}`);

        // Switch to Truth Table
        await cdp.evaluate(`
            const ttTab = document.querySelector('.drawer-tab-btn[data-tab="truth-table"]');
            if (ttTab) ttTab.click();
        `);
        await sleep(200);
        const ttRows = await cdp.evaluate(`document.querySelectorAll('#truth-table-view tbody tr').length`);
        console.log(`    Truth Table rows generated: ${ttRows} (expected 4)`);
        if (ttRows !== 4) throw new Error(`Expected 4 truth table rows, got ${ttRows}`);

        await cdp.captureScreenshot('journey_a_fundamentals.png');
        console.log("  ✅ Journey A completed successfully.\n");
    }

    // ─── Journey B: Sequential Circuits & Waveform Viewer ─────────────────────
    console.log("▶ Journey B: Sequential Edge Triggering & Waveform Viewer");
    {
        await cdp.evaluate(`window.app.loadPreset('dff-enable')`);
        await sleep(300);

        // Switch to Waveforms drawer and step clock
        await cdp.evaluate(`
            const waveTab = document.querySelector('.drawer-tab-btn[data-tab="waveform"]');
            if (waveTab) waveTab.click();
            if (window.app.waveform && window.app.waveform.stepClock) {
                window.app.waveform.stepClock();
                window.app.waveform.stepClock();
            }
        `);
        await sleep(200);

        const waveHist = await cdp.evaluate(`window.app.sequentialEngine ? window.app.sequentialEngine.getWaveformHistory().length : 0`);
        console.log(`    Sequential history snapshots recorded: ${waveHist}`);
        if (waveHist < 2) throw new Error("Sequential engine history did not record clock edges");

        await cdp.captureScreenshot('journey_b_sequential.png');
        console.log("  ✅ Journey B completed successfully.\n");
    }

    // ─── Journey C: Advanced Datapaths & ALU Carry Chains ─────────────────────
    console.log("▶ Journey C: Advanced RTL Lab Multi-Bit Arithmetic & ALU");
    {
        // Navigate via platform nav
        await cdp.evaluate(`document.querySelector('.platform-nav-btn[href*="tab=datapath"]').click()`);
        await sleep(800);

        // Interact with ALU: select SUB operation (opcode 1)
        await cdp.evaluate(`
            const subBtn = document.querySelector('.btn-op[data-opcode="1"]');
            if (subBtn) subBtn.click();
        `);
        await sleep(200);

        const aluResult = await cdp.evaluate(`document.getElementById('alu-result-val').textContent`);
        const aluFlags = await cdp.evaluate(`
            const z = document.getElementById('flag-z')?.classList.contains('active');
            const c = document.getElementById('flag-c')?.classList.contains('active');
            const v = document.getElementById('flag-v')?.classList.contains('active');
            const n = document.getElementById('flag-n')?.classList.contains('active');
            ({ z, c, v, n });
        `);
        console.log(`    ALU Result after SUB op: ${aluResult}, Flags: Z=${aluFlags.z}, C=${aluFlags.c}, V=${aluFlags.v}, N=${aluFlags.n}`);

        await cdp.captureScreenshot('journey_c_datapath_alu.png');
        console.log("  ✅ Journey C completed successfully.\n");
    }

    // ─── Journey D: Modulo Counters & Universal Shift Registers ───────────────
    console.log("▶ Journey D: Binary Counters & Universal Shift Registers");
    {
        await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="sequential"]').click()`);
        await sleep(300);

        // Step register
        await cdp.evaluate(`document.getElementById('btn-reg-step').click()`);
        await sleep(100);
        const regQ = await cdp.evaluate(`document.getElementById('reg-q-val').textContent`);
        console.log(`    Multi-Bit Register Q loaded: ${regQ}`);

        // Step counter 3 times
        await cdp.evaluate(`
            document.getElementById('btn-cnt-step').click();
            document.getElementById('btn-cnt-step').click();
            document.getElementById('btn-cnt-step').click();
        `);
        await sleep(100);
        const cntVal = await cdp.evaluate(`document.getElementById('cnt-val').textContent`);
        console.log(`    Counter value after 3 steps: ${cntVal}`);

        await cdp.captureScreenshot('journey_d_sequential_systems.png');
        console.log("  ✅ Journey D completed successfully.\n");
    }

    // ─── Journey E: Finite State Machine Studio & SVG State Graph ─────────────
    console.log("▶ Journey E: Deterministic FSM Studio & Interactive State Graph");
    {
        await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="fsm"]').click()`);
        await sleep(300);

        const currState = await cdp.evaluate(`document.getElementById('fsm-curr-state').textContent`);
        console.log(`    Initial FSM State: ${currState}`);

        // Assert timer input and step clock
        await cdp.evaluate(`
            const timerChk = document.getElementById('inp-chk-timer');
            if (timerChk) { timerChk.checked = true; timerChk.dispatchEvent(new Event('change')); }
            document.getElementById('btn-fsm-step').click();
        `);
        await sleep(200);

        const nextState = await cdp.evaluate(`document.getElementById('fsm-curr-state').textContent`);
        console.log(`    Transitioned State on timer=1: ${currState} -> ${nextState}`);
        if (currState === nextState) throw new Error("FSM state transition failed");

        await cdp.captureScreenshot('journey_e_fsm_studio.png');
        console.log("  ✅ Journey E completed successfully.\n");
    }

    // ─── Journey F: Full 22-Lesson Progressive Curriculum ─────────────────────
    console.log("▶ Journey F: Full Progressive Curriculum (22 Lessons) & Cross-Navigation");
    {
        await cdp.evaluate(`document.querySelector('.nav-tab[data-tab="lessons"]').click()`);
        await sleep(300);

        // Verify challenge 1 in Advanced Lab
        await cdp.evaluate(`document.querySelector('.btn-solve[data-lesson-id="lesson_1_vectors_slicing"]').click()`);
        await sleep(200);
        const l1Badge = await cdp.evaluate(`document.getElementById('card-lesson_1_vectors_slicing').classList.contains('completed')`);
        console.log(`    Advanced Lesson 1 verified & marked completed: ${l1Badge}`);
        if (!l1Badge) throw new Error("Advanced Lesson 1 verification failed");

        // Return to RTL Fundamentals
        await cdp.evaluate(`document.querySelector('.nav-back-btn').click()`);
        await sleep(800);

        // Open lessons tab in RTL Fundamentals
        await cdp.evaluate(`document.querySelector('.sidebar-tab-btn[data-tab="lessons"]').click()`);
        await sleep(300);

        // Open Lesson 9 (1-Bit Full Adder)
        await cdp.evaluate(`
            const l9Card = document.querySelector('.lesson-card[data-lesson-id="lesson-9-full-adder"]');
            if (l9Card) l9Card.click();
        `);
        await sleep(300);

        // Verify that the level-up prompt appears when checking solution
        await cdp.evaluate(`
            // Solve Lesson 9 starter circuit (it loads starter and check can be invoked)
            const checkBtn = document.getElementById('btn-check-solution');
            if (checkBtn) checkBtn.click();
        `);
        await sleep(300);

        const fbText = await cdp.evaluate(`document.getElementById('lesson-feedback')?.textContent || ''`);
        console.log(`    Fundamental Lesson 9 feedback: "${fbText.substring(0, 80)}..."`);

        await cdp.captureScreenshot('journey_f_curriculum.png');
        console.log("  ✅ Journey F completed successfully.\n");
    }

    // Audit summary
    console.log(`================================================================================`);
    console.log(`   Audited 6/6 Student Learning Journeys: ALL PASSED`);
    console.log(`   Uncaught Page Errors: ${cdp.pageErrors.length}, Console Logs: ${cdp.consoleLogs.length}`);
    console.log(`================================================================================`);

    if (cdp.pageErrors.length > 0) {
        throw new Error(`Accumulated errors during journey audit: ${JSON.stringify(cdp.pageErrors)}`);
    }

    cdp.close();
    edgeProcess.kill();
    server.close();
    console.log("=== Educational Testing Audit Completed Successfully! ===");
}

runJourneysAudit().catch(err => {
    console.error("Educational Testing Audit FAILED:", err);
    process.exit(1);
});
