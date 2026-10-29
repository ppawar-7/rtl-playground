/**
 * run_iverilog_simulation.js — Functional Verilog Simulation Execution
 * 
 * Compiles and simulates all benchmark Verilog modules and self-checking
 * testbenches using Icarus Verilog WebAssembly (@veriflow/iverilog-wasm).
 * Evaluates real event-driven simulation results and assertion outputs.
 */

import { readFileSync } from 'node:fs';
import { simulate } from '@veriflow/iverilog-wasm';

const suites = [
    { name: 'gates', desc: 'Basic Logic Gates (AND, OR, NOT, NAND, NOR, XOR)' },
    { name: 'half_adder', desc: '1-Bit Half Adder (SUM, CARRY)' },
    { name: 'full_adder', desc: '1-Bit Full Adder (SUM, COUT across all 8 vectors)' },
    { name: 'mux2', desc: '2:1 Multiplexer (Sel ? B : A continuous assign)' },
    { name: 'mux_case', desc: '2:1 Multiplexer (Procedural case statement)' },
    { name: 'dff', desc: 'D Flip-Flop (Edge-Triggered State Retention)' },
    { name: 'dffe', desc: 'DFF with Clock Enable (Recirculation Hold on EN=0)' },
    { name: 'dffsr', desc: 'DFF with Synchronous Reset (Posedge Clear)' },
    { name: 'dffesr', desc: 'DFF with Clock Enable & Reset (Reset Priority)' },
    { name: 'shift_reg', desc: '2-Stage Shift Register (Nonblocking Pipeline)' },
    { name: 'multi_dff', desc: 'Multiple Flip-Flops on Shared Clock' }
];

console.log("================================================================================");
console.log("   RTL Playground — Icarus Verilog Functional Testbench Simulation");
console.log("   Engine: Icarus Verilog (WASM ivlpp + ivl + vvp)");
console.log("================================================================================\n");

let totalSuites = suites.length;
let passedSuites = 0;
let failedSuites = 0;

for (const suite of suites) {
    const vPath = `tests/verilog_verification/${suite.name}.v`;
    const tbPath = `tests/verilog_verification/${suite.name}_tb.v`;

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

    if (res.success && res.exitCode === 0 && !res.stdout.includes('ERROR') && !res.stdout.includes('FAILED')) {
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
