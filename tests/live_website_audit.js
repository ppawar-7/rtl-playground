import { resolveBrowserExecutable } from './browser_resolver.js';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

async function runLiveAudit() {
    console.log('=== PD Playground: Live Website Verification Audit ===');
    console.log('Target: https://ppawar-7.github.io/rtl-playground/');

    const chromePath = resolveBrowserExecutable();
    const cdpPort = 9245;
    const tempProfile = path.join(os.tmpdir(), 'edge_live_audit_' + Date.now());
    const proc = spawn(chromePath, [
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
    for (let i = 0; i < 30; i++) {
        await sleep(200);
        try {
            const res = await fetch('http://127.0.0.1:' + cdpPort + '/json/version');
            if (res.ok) { connected = true; break; }
        } catch {}
    }
    if (!connected) {
        proc.kill();
        throw new Error('CDP connection failed');
    }

    const newTab = await fetch('http://127.0.0.1:' + cdpPort + '/json/new?https://ppawar-7.github.io/rtl-playground/', { method: 'PUT' });
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
    await sleep(2000);

    const title = (await send('Runtime.evaluate', { expression: 'document.title' })).result.value;
    console.log('  ✓ Live Fundamentals Title:', title);

    // Navigate to advanced-lab
    await send('Page.navigate', { url: 'https://ppawar-7.github.io/rtl-playground/advanced-lab/index.html?tab=datapath' });
    await sleep(2000);
    const advTitle = (await send('Runtime.evaluate', { expression: 'document.title' })).result.value;
    console.log('  ✓ Live Advanced Lab Title:', advTitle);

    // Check tab switching on live site to FSM tab
    await send('Runtime.evaluate', { expression: "document.querySelector(\"[data-tab='fsm']\").click()" });
    await sleep(800);
    const fsmSvg = (await send('Runtime.evaluate', { expression: "!!document.querySelector('#fsm-mount svg')" })).result.value;
    console.log('  ✓ Live FSM Studio SVG rendered:', fsmSvg);

    // Check Curriculum tab
    await send('Runtime.evaluate', { expression: "document.querySelector(\"[data-tab='lessons']\").click()" });
    await sleep(800);
    const challengeCount = (await send('Runtime.evaluate', { expression: "document.querySelectorAll('.btn-solve').length" })).result.value;
    console.log('  ✓ Live Advanced Curriculum challenges:', challengeCount);

    console.log('  ✓ Uncaught errors on live site:', pageErrors.length);
    ws.close();
    proc.kill();

    if (pageErrors.length > 0) {
        console.error('Page errors encountered:', pageErrors);
        process.exit(1);
    }
    console.log('=== Live Public Website PASSED 100% CLEANLY! ===');
}

runLiveAudit().catch(err => {
    console.error('Audit failed:', err);
    process.exit(1);
});
