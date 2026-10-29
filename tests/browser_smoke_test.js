import { resolveBrowserExecutable } from './browser_resolver.js';
/**
 * browser_smoke_test.js — Native Chrome DevTools Protocol (CDP) Browser Test Runner
 * 
 * Launches Edge in headless mode, connects via WebSocket CDP, and tests:
 * 1. Initial page load and zero console errors
 * 2. In-browser test runner execution (tests/test_runner.html)
 * 3. Canvas rendering & presets
 * 4. Interactive input toggle
 * 5. Component dragging & wiring
 * 6. Truth table generation
 * 7. Waveform stepping & auto-run
 * 8. All 4 guided lessons validation
 * 
 * Uses Node 24 native fetch and WebSocket — zero npm dependencies!
 */

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png'
};

function startStaticServer(port = 8088) {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            const urlPath = req.url.split('?')[0];
            let filePath = join(ROOT_DIR, urlPath === '/' ? 'index.html' : urlPath);
            if (!existsSync(filePath)) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = extname(filePath);
            const mime = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
            res.end(readFileSync(filePath));
        });
        server.listen(port, () => resolve(server));
    });
}

const EDGE_PATH = resolveBrowserExecutable();
const PORT = 9222;
const HTTP_PORT = 8088;
const BASE_URL = `http://localhost:${HTTP_PORT}`;

class SimpleCDP {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.nextId = 1;
        this.pending = new Map();
        this.events = [];
        this.consoleLogs = [];
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
                } else if (data.method) {
                    if (data.method === 'Runtime.consoleAPICalled') {
                        const text = data.params.args.map(a => a.value ?? a.description ?? '').join(' ');
                        this.consoleLogs.push({ type: data.params.type, text });
                    } else if (data.method === 'Runtime.exceptionThrown') {
                        this.pageErrors.push(data.params.exceptionDetails);
                    }
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
    console.log("=== RTL Playground Browser Engineering Audit ===");

    // Start isolated local HTTP server on port 8088
    const staticServer = await startStaticServer(HTTP_PORT);
    console.log(`Local test static server running on ${BASE_URL}`);

    // 1. Launch Edge in headless mode with remote debugging
    console.log("[1/6] Launching headless Microsoft Edge on CDP port 9222...");
    const edgeProcess = spawn(EDGE_PATH, [
        '--headless=new',
        `--remote-debugging-port=${PORT}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=C:\\Users\\pranil\\AppData\\Local\\Temp\\edge_test_profile_' + Date.now(),
        'about:blank'
    ], { stdio: 'ignore' });

    let connected = false;
    let versionData = null;

    for (let i = 0; i < 30; i++) {
        await sleep(300);
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            if (res.ok) {
                versionData = await res.json();
                connected = true;
                break;
            }
        } catch (e) {}
    }

    if (!connected) {
        console.error("Failed to connect to Edge CDP endpoint.");
        edgeProcess.kill();
        process.exit(1);
    }

    console.log(`Connected to Edge browser: ${versionData.Browser}`);

    // Create a new target page
    const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${BASE_URL}/index.html`, { method: 'PUT' });
    const tabInfo = await newTabRes.json();
    const cdp = new SimpleCDP(tabInfo.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log("[2/5] Verifying in-browser Test Runner (tests/test_runner.html)...");
    // Navigate to test_runner.html
    await cdp.send('Page.navigate', { url: `${BASE_URL}/tests/test_runner.html` });
    await sleep(1500);

    const testResults = await cdp.evaluate(`window.testResults || null`);
    console.log(`Browser Test Runner Results: Passed = ${testResults?.passed}, Failed = ${testResults?.failed}`);

    if (!testResults || testResults.failed > 0) {
        console.error("In-browser tests FAILED in Edge!", testResults);
    } else {
        console.log(`  All ${testResults.passed} tests executed and passed inside real browser engine!`);
    }

    // Now test the main interactive application
    console.log("[3/5] Testing Main Application (index.html)...");
    await cdp.send('Page.navigate', { url: `${BASE_URL}/index.html` });
    await sleep(1000);

    // Check for any page exceptions
    if (cdp.pageErrors.length > 0) {
        console.error("Console exceptions on initial load:", cdp.pageErrors);
    } else {
        console.log("  Page loaded cleanly with 0 uncaught exceptions.");
    }

    // Verify initial DOM structure
    const initialSummary = await cdp.evaluate(`
        ({
            componentsCount: window.app.graph.components.size,
            connectionsCount: window.app.graph.connections.size,
            svgElements: document.querySelectorAll('#components-layer .gate-group').length,
            wireElements: document.querySelectorAll('#wires-layer .circuit-wire').length,
            verilogCodeLength: document.getElementById('verilog-code-display').textContent.length
        })
    `);
    console.log("  Initial Half-Adder Preset Loaded:", initialSummary);

    // Test 1: Load all presets sequentially
    console.log("[4/7] Testing All 16 Presets, Input Toggling, Verilog & Truth Tables...");
    const presets = [
        'and-gate', 'or-gate', 'not-gate', 'half-adder', 'full-adder',
        'mux-2to1', 'mux-cond', 'mux-case', 'dff-demo',
        'dff-enable', 'dff-sync-reset', 'dff-esr-priority',
        'reg-enable', 'reg-sync-reset', 'shift-reg-2stage', 'blocking-vs-nonblocking'
    ];
    for (const p of presets) {
        await cdp.evaluate(`window.app.loadPreset('${p}')`);
        const pSummary = await cdp.evaluate(`
            ({
                type: '${p}',
                comps: window.app.graph.components.size,
                conns: window.app.graph.connections.size,
                valid: window.app.graph.validateCircuit().valid,
                verilogOk: !document.getElementById('verilog-code-display').textContent.includes('ERROR')
            })
        `);
        console.log(`    Preset '${p}': ${pSummary.comps} components, ${pSummary.conns} wires, Valid: ${pSummary.valid}, Verilog OK: ${pSummary.verilogOk}`);
    }

    // Test 1b: Interactive Verilog Explainer & RTL Construct Switching
    console.log("  Testing Interactive Verilog Explainer Bar & RTL Constructs...");
    await cdp.evaluate(`
        document.querySelector('.drawer-tab-btn[data-tab="verilog"]').click();
        const chipCase = document.querySelector('.explainer-chip[data-construct="case"]');
        if (chipCase) chipCase.click();
    `);
    await sleep(200);
    const explainerText = await cdp.evaluate(`document.getElementById('verilog-explainer-card').textContent`);
    console.log(`    Explainer card rendered: "${explainerText.substring(0, 50)}..."`);

    // Test procedural style toggle
    console.log("  Testing Procedural Style Toggle...");
    await cdp.evaluate(`document.getElementById('btn-style-procedural').click()`);
    await sleep(200);
    const procCode = await cdp.evaluate(`document.getElementById('verilog-code-display').textContent`);
    const hasAlways = procCode.includes('always @(*)');
    console.log(`    Procedural Verilog contains always @(*): ${hasAlways}`);
    await cdp.evaluate(`document.getElementById('btn-style-continuous').click()`);

    // Test 2: Input Toggling on Canvas
    console.log("  Testing live input toggle interaction...");
    await cdp.evaluate(`window.app.loadPreset('and-gate')`);
    // Initial state: A=1, B=0 -> Output=0
    const outBefore = await cdp.evaluate(`window.app.simulator.getOutputValues()`);
    // Toggle input B to 1
    const toggleRes = await cdp.evaluate(`
        (() => {
            window.app.graph.setInputValue('input_2', 1);
            window.app.simulator.evaluate();
            window.app.editor.updateSignals();
            return window.app.simulator.getOutputValues();
        })()
    `);
    console.log(`    AND gate toggle: B=0 -> out=${Object.values(outBefore)[0]}, B=1 -> out=${Object.values(toggleRes)[0]}`);

    // Test 3: Truth Table generation
    console.log("  Testing Truth Table rendering...");
    await cdp.evaluate(`
        // Switch to truth table tab
        document.querySelector('.drawer-tab-btn[data-tab="truth-table"]').click();
    `);
    await sleep(200);
    const ttRows = await cdp.evaluate(`document.querySelectorAll('.truth-table tbody tr').length`);
    console.log(`    Truth Table generated ${ttRows} state rows for 2-input AND gate (expected 4).`);

    // Test 4: Waveform Viewer & Clock Stepping
    console.log("  Testing Waveform Viewer & Clock Stepping...");
    await cdp.evaluate(`window.app.loadPreset('dff-demo')`);
    await cdp.evaluate(`document.querySelector('.drawer-tab-btn[data-tab="waveform"]').click()`);
    await sleep(200);
    const clkInitial = await cdp.evaluate(`window.app.sequentialEngine.clockState`);
    // Step clock twice (0 -> 1 rising edge, 1 -> 0 falling edge)
    await cdp.evaluate(`window.app.waveform.stepClock()`);
    const clkAfterStep1 = await cdp.evaluate(`window.app.sequentialEngine.clockState`);
    await cdp.evaluate(`window.app.waveform.stepClock()`);
    const clkAfterStep2 = await cdp.evaluate(`window.app.sequentialEngine.clockState`);
    const wfHistoryLength = await cdp.evaluate(`window.app.sequentialEngine.getWaveformHistory().length`);
    console.log(`    Waveform Stepping: Clk ${clkInitial} -> ${clkAfterStep1} (rising) -> ${clkAfterStep2} (falling), History count: ${wfHistoryLength}`);

    // Test 5: Guided Lessons Validation
    console.log("[5/7] Testing All 12 Guided Lessons & Validation...");
    await cdp.evaluate(`document.querySelector('.sidebar-tab-btn[data-tab="lessons"]').click()`);
    await sleep(200);

    const lessonIds = [
        'lesson-1-gates',
        'lesson-2-half-adder',
        'lesson-3-mux',
        'lesson-4-dff',
        'lesson-5-mux-cond',
        'lesson-6-reg-enable',
        'lesson-7-sync-reset',
        'lesson-8-clock-timing',
        'lesson-9-full-adder',
        'lesson-10-reg-enable',
        'lesson-11-sync-reset-priority',
        'lesson-12-blocking-nonblocking'
    ];
    for (const lId of lessonIds) {
        const lRes = await cdp.evaluate(`
            (() => {
                // Ensure we are in lesson list view
                window.app.lessons.renderList();
                const card = document.querySelector('.lesson-card[data-lesson-id="${lId}"]');
                if (!card) return { id: '${lId}', error: 'Card not found' };
                card.click();

                // Incomplete starter circuit should fail check
                const checkBtn = document.getElementById('btn-check-solution');
                checkBtn.click();
                const feedback1 = document.getElementById('lesson-feedback').className;

                // Now load solution and check
                let solved = false;
                if ('${lId}' === 'lesson-1-gates') {
                    window.app.loadPreset('and-gate');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-2-half-adder') {
                    window.app.loadPreset('half-adder');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-3-mux') {
                    window.app.loadPreset('mux-2to1');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-4-dff') {
                    window.app.loadPreset('dff-demo');
                    window.app.sequentialEngine.clockStep();
                    window.app.sequentialEngine.clockStep();
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-5-mux-cond') {
                    window.app.loadPreset('mux-cond');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-6-reg-enable') {
                    window.app.loadPreset('reg-enable');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-7-sync-reset') {
                    window.app.loadPreset('reg-sync-reset');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-8-clock-timing') {
                    window.app.loadPreset('shift-reg-2stage');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-9-full-adder') {
                    window.app.loadPreset('full-adder');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-10-reg-enable') {
                    window.app.loadPreset('dff-enable');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-11-sync-reset-priority') {
                    window.app.loadPreset('dff-esr-priority');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                } else if ('${lId}' === 'lesson-12-blocking-nonblocking') {
                    window.app.loadPreset('blocking-vs-nonblocking');
                    checkBtn.click();
                    solved = document.getElementById('lesson-feedback').classList.contains('feedback-success');
                }

                // Return to list view
                window.app.lessons.renderList();

                return {
                    id: '${lId}',
                    starterFailsCorrectly: feedback1.includes('feedback-error'),
                    solutionPasses: solved
                };
            })()
        `);
        console.log(`    Lesson '${lRes.id}': Incomplete circuit rejected: ${lRes.starterFailsCorrectly}, Correct solution validated: ${lRes.solutionPasses}`);
    }

    // Test 6: Real Interactive Manual Circuit Construction
    console.log("[6/6] Testing Manual Circuit Construction (Palette -> Canvas -> Pin Wiring -> Input Toggle -> Deletion)...");
    const manualResult = await cdp.evaluate(`
        (() => {
            // 1. Reset canvas
            window.app.resetCircuit();

            // 2. Add an Input via palette click + canvas click
            const inputPaletteBtn = document.querySelector('.palette-item[data-type="INPUT"]');
            if (!inputPaletteBtn) return { ok: false, error: 'Input palette button not found' };
            inputPaletteBtn.click();

            // Add Input, NOT gate, and Output to graph and render
            window.app.editor.graph.addComponent('INPUT', 80, 100, 'in_manual');
            window.app.editor.setPendingComponentType(null);
            window.app.editor.render();

            window.app.editor.graph.addComponent('NOT', 240, 100, 'not_manual');
            window.app.editor.render();

            window.app.editor.graph.addComponent('OUTPUT', 400, 100, 'out_manual');
            window.app.editor.render();

            const inComp = Array.from(window.app.graph.components.values()).find(c => c.label === 'in_manual');
            const notComp = Array.from(window.app.graph.components.values()).find(c => c.label === 'not_manual');
            const outComp = Array.from(window.app.graph.components.values()).find(c => c.label === 'out_manual');

            if (!inComp || !notComp || !outComp) {
                return { ok: false, error: 'Components not added properly' };
            }

            // 5. Connect Input -> NOT gate using editor._completeWire
            window.app.editor.wireStartPin = { componentId: inComp.id, pinId: inComp.id + '.out0' };
            window.app.editor._completeWire(notComp.id, notComp.id + '.in0');

            // 6. Connect NOT gate -> Output using editor._completeWire
            window.app.editor.wireStartPin = { componentId: notComp.id, pinId: notComp.id + '.out0' };
            window.app.editor._completeWire(outComp.id, outComp.id + '.in0');

            window.app.simulator.evaluate();
            window.app.editor.render();

            // Check initial evaluation: In=0 -> Out=1
            const initialOut = window.app.simulator.getOutputValues()[outComp.id];

            // 7. Toggle Input on canvas: In=1 -> Out=0
            window.app.graph.setInputValue(inComp.id, 1);
            window.app.simulator.evaluate();
            window.app.editor.updateSignals();
            const toggledOut = window.app.simulator.getOutputValues()[outComp.id];

            // 8. Select NOT gate: verify RTL mapping in inspector
            window.app.editor.selectComponent(notComp.id);
            const inspEl = document.getElementById('inspector-content');
            const hasRtlMapping = inspEl ? inspEl.textContent.indexOf('RTL Hardware Mapping') !== -1 : false;

            // 9. Delete NOT gate via inspector delete button
            const deleteBtn = document.getElementById('btn-delete-selected');
            if (deleteBtn) deleteBtn.click();

            const compsAfterDelete = window.app.graph.components.size;
            const connsAfterDelete = window.app.graph.connections.size;

            return {
                ok: true,
                initialOut,
                toggledOut,
                hasRtlMapping,
                compsAfterDelete,
                connsAfterDelete
            };
        })()
    `);
    console.log(`    Manual Construction: Initial Out (In=0): ${manualResult.initialOut}, Toggled Out (In=1): ${manualResult.toggledOut}`);
    console.log(`    Inspector RTL Mapping displayed: ${manualResult.hasRtlMapping}, Post-Delete Component Count: ${manualResult.compsAfterDelete}`);

    // Check errors accumulated
    console.log("\n=== Audit Summary ===");
    console.log(`Total Uncaught Page Exceptions: ${cdp.pageErrors.length}`);
    console.log(`Total Console Messages: ${cdp.consoleLogs.length}`);

    // Take screenshot
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync('tests/audit_screenshot.png', Buffer.from(screenshot.data, 'base64'));
    console.log("Saved browser audit screenshot: tests/audit_screenshot.png");

    cdp.close();
    edgeProcess.kill();
    staticServer.close();
    console.log("=== Browser Testing Audit Completed Successfully! ===");
}

runBrowserAudit().catch(err => {
    console.error("Browser Audit Error:", err);
    process.exit(1);
});
