/**
 * build_site.js — Static Site Packaging Script for GitHub Pages
 * 
 * Part of PD Playground: Release Engineering & Artifact Hardening
 * 
 * Packages only the necessary static application files into _site/
 * for lean, secure GitHub Pages deployment.
 */

import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, '_site');

console.log('=== PD Playground: Building Static Site Artifact for GitHub Pages ===');
console.log(`Source Root: ${ROOT}`);
console.log(`Output Directory: ${DIST}`);

// 1. Clean previous build
if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
}
mkdirSync(DIST, { recursive: true });

// 2. Artifact file manifest
const ASSETS_TO_COPY = [
    { src: 'index.html', dest: 'index.html', isDir: false },
    { src: 'src', dest: 'src', isDir: true },
    { src: 'advanced-lab', dest: 'advanced-lab', isDir: true },
    { src: 'LICENSE', dest: 'LICENSE', isDir: false },
    { src: 'README.md', dest: 'README.md', isDir: false }
];

for (const item of ASSETS_TO_COPY) {
    const srcPath = resolve(ROOT, item.src);
    const destPath = resolve(DIST, item.dest);
    if (!existsSync(srcPath)) {
        throw new Error(`Required deployment asset missing: ${item.src}`);
    }
    cpSync(srcPath, destPath, { recursive: item.isDir });
    console.log(`  ✓ Packaged: ${item.src} -> _site/${item.dest}`);
}

// 3. Add .nojekyll to prevent GitHub Pages from bypassing files with underscores
writeFileSync(resolve(DIST, '.nojekyll'), '');
console.log('  ✓ Created: _site/.nojekyll (disables Jekyll static processing)');

// 4. Verify output integrity
const requiredOutputs = [
    resolve(DIST, 'index.html'),
    resolve(DIST, 'src/app.js'),
    resolve(DIST, 'src/styles/main.css'),
    resolve(DIST, 'src/engine/circuit_graph.js'),
    resolve(DIST, 'src/modules/lessons.js'),
    resolve(DIST, 'advanced-lab/index.html'),
    resolve(DIST, 'advanced-lab/app.js'),
    resolve(DIST, 'advanced-lab/styles/advanced.css'),
    resolve(DIST, 'advanced-lab/engine/vector_model.js'),
    resolve(DIST, 'advanced-lab/engine/fsm_engine.js'),
    resolve(DIST, 'advanced-lab/lessons/advanced_lessons.js')
];

for (const req of requiredOutputs) {
    if (!existsSync(req)) {
        throw new Error(`Build verification failed! Missing output file: ${req}`);
    }
}

// 5. Calculate total artifact metrics
function getDirStats(dir) {
    let count = 0;
    let size = 0;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            const sub = getDirStats(full);
            count += sub.count;
            size += sub.size;
        } else {
            count++;
            size += statSync(full).size;
        }
    }
    return { count, size };
}

const stats = getDirStats(DIST);
console.log(`\nArtifact summary: ${stats.count} files, ${(stats.size / 1024).toFixed(1)} KB total.`);
console.log('=== Static Site Artifact Built Successfully! ===\n');
