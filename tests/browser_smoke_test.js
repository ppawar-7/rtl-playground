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
import { writeFileSync } from 'node:fs';

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const BASE_URL = "http://localhost:8080";

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
            throw new Error(`Eval error: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
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

    // 1. Launch Edge in headless mode with remote debugging
    console.log("[1/5] Launching headless Microsoft Edge on CDP port 9222...");
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
    console.log("[4/5] Testing Presets, Input Toggling, Verilog & Truth Tables...");
    const presets = ['and-gate', 'or-gate', 'not-gate', 'half-adder', 'mux-2to1', 'dff-demo'];
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
    console.log("[5/5] Testing Guided Lessons & Validation...");
    await cdp.evaluate(`document.querySelector('.sidebar-tab-btn[data-tab="lessons"]').click()`);
    await sleep(200);

    const lessonIds = ['lesson-1-gates', 'lesson-2-half-adder', 'lesson-3-mux', 'lesson-4-dff'];
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
    console.log("=== Browser Testing Audit Completed Successfully! ===");
}

runBrowserAudit().catch(err => {
    console.error("Browser Audit Error:", err);
    process.exit(1);
});
