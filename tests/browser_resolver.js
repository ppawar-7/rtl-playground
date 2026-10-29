/**
 * browser_resolver.js — Cross-Platform Browser Executable Resolver
 * 
 * Part of PD Playground: Cross-Platform CI & Verification Hardening
 * 
 * Dynamically resolves Microsoft Edge or Google Chrome / Chromium
 * across Windows, Linux (Ubuntu CI runners), and macOS.
 */

import { existsSync } from 'node:fs';

export function resolveBrowserExecutable() {
    if (process.env.BROWSER_PATH && existsSync(process.env.BROWSER_PATH)) {
        return process.env.BROWSER_PATH;
    }

    const candidates = [
        // Windows Edge & Chrome
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        // Linux / GitHub Actions Ubuntu runners
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        // macOS
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    ];

    for (const p of candidates) {
        if (existsSync(p)) {
            return p;
        }
    }

    throw new Error(
        'No supported Chromium/Edge browser executable found.\n' +
        'Please install Chrome/Edge or set the BROWSER_PATH environment variable.\n' +
        `Checked paths:\n  - ${candidates.join('\n  - ')}`
    );
}
