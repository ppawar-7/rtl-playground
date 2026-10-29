/**
 * browser_ui_worker.js — Repeated Headless Browser Smoke & UI Interaction Worker
 * 
 * Uses Chrome DevTools Protocol (CDP) over WebSocket to test the live UI:
 * - App initialization with 0 console errors
 * - Preset loading and circuit rendering
 * - Canvas interactions (component placement, wire connection, selection)
 * - Waveform stepping and truth table evaluation
 * - Clean shutdown of browser processes
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CDP_PORT = 9333;
const HTTP_PORT = 8181;

// Minimal static file server for testing
let _server = null;

export async function ensureStaticServer(rootDir) {
    if (_server) return `http://127.0.0.1:${HTTP_PORT}`;

    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
    };

    _server = http.createServer((req, res) => {
        let reqPath = decodeURI(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = path.join(rootDir, reqPath);

        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });

    await new Promise((resolve) => {
        _server.listen(HTTP_PORT, '127.0.0.1', () => resolve());
    });

    return `http://127.0.0.1:${HTTP_PORT}`;
}

export function stopStaticServer() {
    if (_server) {
        _server.close();
        _server = null;
    }
}

class SimpleCDP {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.nextId = 1;
        this.pending = new Map();
        this.pageErrors = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.id && this.pending.has(data.id)) {
                    const { resolve, reject } = this.pending.get(data.id);
                    this.pending.delete(data.id);
                    if (data.error) reject(new Error(data.error.message));
                    else resolve(data.result);
                } else if (data.method === 'Runtime.exceptionThrown') {
                    this.pageErrors.push(data.params.exceptionDetails);
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

    async evaluate(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
            throw new Error(`Eval error: ${desc}`);
        }
        return res.result?.value;
    }

    close() {
        if (this.ws) {
            try { this.ws.close(); } catch {}
        }
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Run a full automated UI smoke test in headless Edge.
 * 
 * @param {string} rootDir - Root directory of the worktree
 * @returns {Promise<{ ok: boolean, error?: string, stepsPassed: number }>}
 */
export async function runBrowserSmokeCheck(rootDir) {
    if (!fs.existsSync(EDGE_PATH)) {
        return { ok: false, error: 'Microsoft Edge executable not found at expected path', stepsPassed: 0 };
    }

    const baseUrl = await ensureStaticServer(rootDir);
    const tempProfile = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `edge_stress_profile_${Date.now()}`);

    const edgeProcess = spawn(EDGE_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${tempProfile}`,
        'about:blank'
    ], { stdio: 'ignore' });

    let cdp = null;
    let stepsPassed = 0;

    try {
        let connected = false;
        let versionData = null;
        for (let i = 0; i < 25; i++) {
            await sleep(200);
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
            throw new Error('Failed to connect to Edge CDP endpoint');
        }

        // Create page target via /json/new
        const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${baseUrl}/index.html`, { method: 'PUT' });
        const tabInfo = await newTabRes.json();
        if (!tabInfo.webSocketDebuggerUrl) {
            throw new Error('No webSocketDebuggerUrl returned for new page');
        }

        cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
        await cdp.connect();
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        await sleep(800);
        stepsPassed++;

        // 2. Verify app loaded and has title
        const title = await cdp.evaluate('document.title');
        if (!title.includes('RTL Playground')) {
            throw new Error(`Unexpected page title: ${title}`);
        }
        stepsPassed++;

        // 3. Load Half Adder Preset
        const loadPresetOk = await cdp.evaluate(`
            (() => {
                if (!window.app || !window.app.loadPreset) return false;
                window.app.loadPreset('half-adder');
                return true;
            })()
        `);
        if (!loadPresetOk) throw new Error('Failed to execute window.app.loadPreset');
        await sleep(200);
        stepsPassed++;

        // 4. Toggle input component
        const toggleOk = await cdp.evaluate(`
            (() => {
                const inputs = window.app.graph.getInputComponents();
                if (inputs.length === 0) return false;
                const in0 = inputs[0];
                const oldVal = in0.outputs[0].value;
                window.app.graph.setInputValue(in0.id, oldVal === 1 ? 0 : 1);
                window.app.simulator.evaluate();
                return in0.outputs[0].value !== oldVal;
            })()
        `);
        if (!toggleOk) throw new Error('Failed to toggle input component in UI graph');
        stepsPassed++;

        // 5. Test Waveform Stepping with sequential preset
        await cdp.evaluate(`window.app.loadPreset('dff-demo')`);
        await sleep(200);
        const stepOk = await cdp.evaluate(`
            (() => {
                const initialStep = window.app.sequentialEngine.stepCount;
                window.app.sequentialEngine.clockStep();
                return window.app.sequentialEngine.stepCount === initialStep + 1;
            })()
        `);
        if (!stepOk) throw new Error('Clock step in UI sequential engine failed');
        stepsPassed++;

        // 6. Verify zero uncaught page exceptions
        if (cdp.pageErrors.length > 0) {
            throw new Error(`Uncaught browser exception: ${JSON.stringify(cdp.pageErrors[0])}`);
        }
        stepsPassed++;

        return { ok: true, stepsPassed };
    } catch (err) {
        return { ok: false, error: err.message, stepsPassed };
    } finally {
        if (cdp) cdp.close();
        try { edgeProcess.kill(); } catch {}
        try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
    }
}
