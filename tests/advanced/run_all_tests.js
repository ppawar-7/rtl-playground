/**
 * run_all_tests.js — Consolidated Master Test Suite Runner for Advanced RTL Lab
 * 
 * Part of PD Playground: Advanced RTL Lab
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const suites = [
    { name: 'Phase A: Vector Engine & Slicing', file: 'tests/advanced/test_vector.js' },
    { name: 'Phase B: Arithmetic, ALU & Yosys Checks', file: 'tests/advanced/test_arithmetic.js' },
    { name: 'Phase C: Sequential Registers & Counters', file: 'tests/advanced/test_sequential.js' },
    { name: 'Phase D: Finite State Machines & Yosys Checks', file: 'tests/advanced/test_fsm.js' },
    { name: 'Phase E: Curriculum & Lessons (10 Activities)', file: 'tests/advanced/test_curriculum.js' },
    { name: 'Phase F: Property-Based Randomized Tests (5,000+ checks)', file: 'tests/advanced/property_tests.js' },
    { name: 'Baseline Regression: Original RTL Playground Test Suite', file: 'tests/tests.js' }
];

console.log("===============================================================");
console.log("  PD Playground: Advanced RTL Lab — Consolidated Regression Suite");
console.log("===============================================================\n");

let allPassed = true;
const summary = [];

for (const suite of suites) {
    const fullPath = resolve(ROOT, suite.file);
    const start = Date.now();
    const res = spawnSync(process.execPath, [fullPath], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe'
    });
    const elapsed = Date.now() - start;

    if (res.status === 0) {
        console.log(`  ✅ [PASS] ${suite.name} (${elapsed}ms)`);
        summary.push({ name: suite.name, status: 'PASS', elapsed });
    } else {
        console.error(`  ❌ [FAIL] ${suite.name} (exited with code ${res.status})`);
        console.error(res.stderr || res.stdout);
        summary.push({ name: suite.name, status: 'FAIL', elapsed });
        allPassed = false;
    }
}

console.log("\n===============================================================");
console.log("  Consolidated Test Execution Summary");
console.log("===============================================================");
for (const s of summary) {
    const mark = s.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${mark} ${s.status.padEnd(6)} | ${s.name.padEnd(52)} | ${s.elapsed}ms`);
}
console.log("===============================================================");

if (allPassed) {
    console.log("  🚀 ALL 7 TEST SUITES PASSED CLEANLY WITH ZERO REGRESSIONS!");
    process.exit(0);
} else {
    console.error("  ❌ ONE OR MORE TEST SUITES FAILED!");
    process.exit(1);
}
