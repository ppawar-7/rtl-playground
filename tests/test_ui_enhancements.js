import { resolveBrowserExecutable } from './browser_resolver.js';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json'
};

async function testUIEnhancements() {
    console.log('=== PD Playground: UI Enhancements & Beginner Guidance Audit ===');

    // 1. Static HTTP Server
    const server = http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
        const fullPath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const ext = path.extname(fullPath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(fullPath).pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    await new Promise(r => server.listen(8097, '127.0.0.1', r));
    const BASE_URL = 'http://127.0.0.1:8097/index.html';
    console.log('  [Server] Running on http://127.0.0.1:8097');

    // 2. Launch Browser
    const cdpPort = 9248;
    const tempProfile = path.join(os.tmpdir(), 'edge_ui_audit_' + Date.now());
    const browser = spawn(resolveBrowserExecutable(), [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=' + cdpPort,
        '--user-data-dir=' + tempProfile,
        'about:blank'
    ], { stdio: 'ignore' });

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let connected = false;
    for (let i = 0; i < 50; i++) {
        await sleep(200);
        try {
            const res = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
            if (res.ok) { connected = true; break; }
        } catch {}
    }
    if (!connected) throw new Error('Could not connect to CDP');

    const newTab = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${BASE_URL}`, { method: 'PUT' });
    const tabData = await newTab.json();
    const ws = new WebSocket(tabData.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    const pending = new Map();
    const pageErrors = [];
    ws.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.method === 'Runtime.exceptionThrown') {
            pageErrors.push(d.params.exceptionDetails);
        }
        if (d.id && pending.has(d.id)) {
            pending.get(d.id)(d.result);
            pending.delete(d.id);
        }
    };
    const send = (method, params = {}) => new Promise(res => {
        const id = msgId++;
        pending.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: BASE_URL });
    await sleep(1200);

    // Test 1: Audio Toggle
    const audioBefore = (await send('Runtime.evaluate', { expression: "document.getElementById('audio-toggle-icon').textContent" })).result.value;
    await send('Runtime.evaluate', { expression: "document.getElementById('btn-audio-toggle').click()" });
    const audioAfter = (await send('Runtime.evaluate', { expression: "document.getElementById('audio-toggle-icon').textContent" })).result.value;
    console.log(`  ✓ Audio toggle tested: ${audioBefore} -> ${audioAfter}`);
    if (audioBefore === audioAfter) throw new Error('Audio toggle failed to change state');

    // Test 2: Cheat Sheet Handbook Modal
    await send('Runtime.evaluate', { expression: "document.getElementById('btn-handbook').click()" });
    await sleep(300);
    const handbookVisible = (await send('Runtime.evaluate', { expression: "window.getComputedStyle(document.getElementById('handbook-modal')).display" })).result.value;
    console.log('  ✓ Handbook modal opened, display:', handbookVisible);
    if (handbookVisible !== 'flex') throw new Error('Handbook modal did not open as flex');

    // Test 2b: Switch Handbook Tab
    await send('Runtime.evaluate', { expression: "document.querySelector(\".handbook-tab-btn[data-tab='sequential']\").click()" });
    await sleep(200);
    const hasAirlock = (await send('Runtime.evaluate', { expression: "document.getElementById('handbook-content').textContent.includes('Airlock')" })).result.value;
    console.log('  ✓ Handbook sequential tab contains airlock analogy:', hasAirlock);
    if (!hasAirlock) throw new Error('Handbook failed to render sequential tab content');

    // Close Handbook
    await send('Runtime.evaluate', { expression: "document.getElementById('btn-handbook-close').click()" });
    await sleep(200);
    const handbookClosed = (await send('Runtime.evaluate', { expression: "document.getElementById('handbook-modal').style.display" })).result.value;
    console.log('  ✓ Handbook modal closed, display:', handbookClosed);

    // Test 3: Open Lesson 1 & Canvas Tutor Banner
    await send('Runtime.evaluate', { expression: "document.querySelector(\".sidebar-tab-btn[data-tab='lessons']\").click()" });
    await sleep(300);
    await send('Runtime.evaluate', { expression: "document.querySelector('.lesson-card').click()" });
    await sleep(500);

    const tutorVisible = (await send('Runtime.evaluate', { expression: "window.getComputedStyle(document.getElementById('canvas-tutor-banner')).display" })).result.value;
    const tutorLabel = (await send('Runtime.evaluate', { expression: "document.getElementById('tutor-step-label').textContent" })).result.value;
    console.log(`  ✓ Canvas Tutor Banner active: display=${tutorVisible}, label="${tutorLabel}"`);
    if (tutorVisible !== 'flex') throw new Error('Canvas tutor banner failed to display on lesson start');

    // Test 4: Palette Guide Highlight
    const andHighlighted = (await send('Runtime.evaluate', { expression: "document.querySelector(\".palette-item[data-type='AND']\").classList.contains('palette-guide-highlight')" })).result.value;
    console.log('  ✓ AND gate in palette automatically highlighted:', andHighlighted);
    if (!andHighlighted) throw new Error('Palette guide failed to highlight required AND gate');

    // Test 5: Interactive Concept Check Quiz
    const quizQuestion = (await send('Runtime.evaluate', { expression: "document.querySelector('.quiz-question')?.textContent" })).result.value;
    console.log('  ✓ Concept Check Quiz rendered:', quizQuestion);
    if (!quizQuestion) throw new Error('Concept check quiz question was not rendered');

    // Click the correct quiz option (0 - LOW)
    await send('Runtime.evaluate', { expression: "document.querySelector(\".quiz-opt-btn[data-opt-idx='0']\").click()" });
    await sleep(200);
    const isCorrect = (await send('Runtime.evaluate', { expression: "document.querySelector(\".quiz-opt-btn[data-opt-idx='0']\").classList.contains('correct')" })).result.value;
    const feedbackText = (await send('Runtime.evaluate', { expression: "document.getElementById('quiz-feedback-box').textContent" })).result.value;
    console.log('  ✓ Quiz answer validated:', isCorrect, '| Feedback:', feedbackText);
    if (!isCorrect) throw new Error('Quiz failed to mark correct option');

    console.log('  ✓ Uncaught Page Errors:', pageErrors.length);
    ws.close();
    browser.kill();
    server.close();

    if (pageErrors.length > 0) {
        console.error('Audit encountered page errors:', pageErrors);
        process.exit(1);
    }

    console.log('=== UI Enhancements & Beginner Guidance Audit PASSED 100%! ===');
}

testUIEnhancements().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
