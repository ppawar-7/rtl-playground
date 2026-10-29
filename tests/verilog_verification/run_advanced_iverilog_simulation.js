/**
 * run_advanced_iverilog_simulation.js — Advanced RTL Lab Icarus Verilog Simulation
 * 
 * Part of PD Playground: Full RTL Integration & Verification Closure
 * 
 * Simulates all 6 Advanced RTL Lab synthesizable Verilog modules and self-checking
 * testbenches using @veriflow/iverilog-wasm (WASM event-driven HDL simulator).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from '@veriflow/iverilog-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

const suites = [
    { name: 'adv_rca', desc: '4-Bit Ripple-Carry Adder (Full Carry Chain Propagation)' },
    { name: 'adv_alu', desc: '4-Bit Educational ALU (Arithmetic, Logic, Shift & Status Flags)' },
    { name: 'adv_reg', desc: '4-Bit Multi-Bit Register (Clock Enable & Sync Reset Priority)' },
    { name: 'adv_counter', desc: '4-Bit Modulo Counter (Up/Down Counting & Terminal Count)' },
    { name: 'adv_shift', desc: '4-Bit Universal Shift Register (SISO / SIPO / PISO / Hold)' },
    { name: 'adv_fsm', desc: 'Finite State Machine (Deterministic 2-Process Traffic Controller)' }
];

console.log("================================================================================");
console.log("   PD Playground — Advanced RTL Lab: Icarus Verilog Functional Simulation");
console.log("   Engine: Icarus Verilog WebAssembly (@veriflow/iverilog-wasm)");
console.log("================================================================================\n");

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of suites) {
    const vPath = resolve(__dirname, `${suite.name}.v`);
    const tbPath = resolve(__dirname, `${suite.name}_tb.v`);

    const vCode = readFileSync(vPath, 'utf8');
    const tbCode = readFileSync(tbPath, 'utf8');

    console.log(`▶ Running Suite: ${suite.name} — ${suite.desc}`);

    const res = await simulate({
        sources: [`${suite.name}.v`, `${suite.name}_tb.v`],
        files: [
            { path: `${suite.name}.v`, data: vCode },
            { path: `${suite.name}_tb.v`, data: tbCode }
        ]
    });

    if (res.success && res.exitCode === 0 && !res.stdout.includes('ERROR') && !res.stdout.includes('FAIL')) {
        console.log(`  ✅ PASSED (${res.timings?.run || 0}ms simulation)`);
        const lines = res.stdout.trim().split('\n');
        for (const line of lines) {
            if (line.includes('PASS') || line.includes('PASSED') || line.includes('VERIFIED')) {
                console.log(`     ${line}`);
            }
        }
        passedSuites++;
    } else {
        console.error(`  ❌ FAILED (Exit Code: ${res.exitCode})`);
        if (res.stdout) console.log(`     Output:\n${res.stdout}`);
        if (res.stderr) console.error(`     Error Log:\n${res.stderr}`);
        failedSuites++;
    }
    console.log("");
}

console.log("================================================================================");
console.log(`   Simulation Summary: ${passedSuites}/${totalSuites} Passed, ${failedSuites} Failed`);
console.log("================================================================================");

if (failedSuites > 0) process.exit(1);
