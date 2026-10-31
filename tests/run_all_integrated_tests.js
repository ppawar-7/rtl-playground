/**
 * run_all_integrated_tests.js — Master Test Suite Runner for Unified RTL Playground
 * 
 * Part of PD Playground: Autonomous Full RTL Integration & Verification Closure
 * 
 * Sequentially executes all verification suites across the platform:
 * 1. RTL Fundamentals & Phase 6 Unit Tests (49 tests)
 * 2. Advanced RTL Lab Consolidated Regression & Property Tests (7 suites, 5,000+ checks)
 * 3. Full Real HDL Synthesis & Elaboration Checks via Yosys (17 modules)
 * 4. Comprehensive Event-Driven Functional Simulation via Icarus Verilog WASM (17 testbenches)
 * 5. Full Cross-Engine Differential Verification (106 checks)
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const suites = [
    { name: 'RTL Fundamentals & Phase 6 Unit Tests', file: 'tests/tests.js' },
    { name: 'Beginner Experience & Micro-Steps Verification', file: 'tests/test_beginner_experience.js', isTestRunner: true },
    { name: 'Browser UI & Guided Experience Verification', file: 'tests/test_ui_enhancements.js' },
    { name: 'Advanced RTL Lab Regression & Property Tests', file: 'tests/advanced/run_all_tests.js' },
    { name: 'Full Yosys HDL Synthesis & AST Checks (17 modules)', file: 'tests/verilog_verification/run_yosys_verification.js' },
    { name: 'Icarus Verilog Functional Event-Driven Simulation (17 suites)', file: 'tests/verilog_verification/run_iverilog_simulation.js' },
    { name: 'Cross-Engine Differential Verification (106 checks)', file: 'tests/verilog_verification/run_differential_simulation.js' }
];

console.log("================================================================================");
console.log("   PD Playground: Master Consolidated Integration Regression Suite");
console.log("================================================================================\n");

let allPassed = true;
const summary = [];

for (const suite of suites) {
    const fullPath = resolve(ROOT, suite.file);
    console.log(`\n▶ Starting Suite: ${suite.name}...`);
    const start = Date.now();
    const args = suite.isTestRunner ? ['--test', fullPath] : [fullPath];
    const res = spawnSync(process.execPath, args, {
        cwd: ROOT,
        stdio: 'inherit'
    });
    const elapsed = Date.now() - start;

    if (res.status === 0) {
        summary.push({ name: suite.name, status: 'PASS', elapsed });
    } else {
        summary.push({ name: suite.name, status: 'FAIL', elapsed });
        allPassed = false;
    }
}

console.log("\n================================================================================");
console.log("   Consolidated Master Test Execution Summary");
console.log("================================================================================");
for (const s of summary) {
    const mark = s.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${mark} ${s.status.padEnd(6)} | ${s.name.padEnd(65)} | ${s.elapsed}ms`);
}
console.log("================================================================================");

if (allPassed) {
    console.log("  🚀 ALL CONSOLIDATED TEST SUITES PASSED CLEANLY WITH ZERO REGRESSIONS!");
    process.exit(0);
} else {
    console.error("  ❌ ONE OR MORE TEST SUITES FAILED!");
    process.exit(1);
}
