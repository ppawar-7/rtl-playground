/**
 * run_yosys_verification.js — Real HDL Synthesis & Elaboration Verification
 * 
 * Compiles and checks all 17 generated Verilog modules using Yosys AST parser,
 * RTLIL generator, hierarchy elaboration, and design check.
 */

import { readFileSync } from 'node:fs';
import { runYosys } from '@yowasp/yosys';

const modules = [
    // ─── Tier 1: Single-Bit RTL Fundamentals ───────────────────────────────────
    { name: 'gates', file: 'tests/verilog_verification/gates.v', top: 'gates_module' },
    { name: 'half_adder', file: 'tests/verilog_verification/half_adder.v', top: 'half_adder_module' },
    { name: 'mux2', file: 'tests/verilog_verification/mux2.v', top: 'mux2_module' },
    { name: 'dff', file: 'tests/verilog_verification/dff.v', top: 'dff_module' },
    { name: 'shift_reg', file: 'tests/verilog_verification/shift_reg.v', top: 'shift_reg_module' },
    { name: 'multi_dff', file: 'tests/verilog_verification/multi_dff.v', top: 'multi_dff_module' },
    { name: 'full_adder', file: 'tests/verilog_verification/full_adder.v', top: 'full_adder_module' },
    { name: 'dffe', file: 'tests/verilog_verification/dffe.v', top: 'dffe_module' },
    { name: 'dffsr', file: 'tests/verilog_verification/dffsr.v', top: 'dffsr_module' },
    { name: 'dffesr', file: 'tests/verilog_verification/dffesr.v', top: 'dffesr_module' },
    { name: 'mux_case', file: 'tests/verilog_verification/mux_case.v', top: 'mux_case_module' },

    // ─── Tier 2: Advanced RTL Systems & Multi-Bit Datapaths ───────────────────
    { name: 'adv_rca', file: 'tests/verilog_verification/adv_rca.v', top: 'adv_rca' },
    { name: 'adv_alu', file: 'tests/verilog_verification/adv_alu.v', top: 'adv_alu' },
    { name: 'adv_reg', file: 'tests/verilog_verification/adv_reg.v', top: 'adv_reg' },
    { name: 'adv_counter', file: 'tests/verilog_verification/adv_counter.v', top: 'adv_counter' },
    { name: 'adv_shift', file: 'tests/verilog_verification/adv_shift.v', top: 'adv_shift' },
    { name: 'adv_fsm', file: 'tests/verilog_verification/adv_fsm.v', top: 'adv_fsm' }
];

console.log("=== Running Real Verilog HDL Synthesis Verification via Yosys (17 Modules) ===");

let passed = 0;
let failed = 0;

for (const m of modules) {
    const code = readFileSync(m.file, 'utf8');
    const fileName = `${m.name}.v`;

    console.log(`\nVerifying ${m.name} (${fileName})...`);
    try {
        // Run Yosys: read_verilog -> hierarchy -> proc -> opt -> check -> stat
        const script = `
            read_verilog ${fileName};
            hierarchy -check -top ${m.top};
            proc;
            opt;
            check -assert;
            stat;
        `;

        const out = await runYosys(['-p', script], { [fileName]: code });
        console.log(`  ✅ ${m.name}: Synthesizable IEEE 1364 Verilog AST, Hierarchy, and Design Check PASSED.`);
        passed++;
    } catch (err) {
        console.error(`  ❌ ${m.name} FAILED:`, err);
        failed++;
    }
}

console.log("\n========================================");
console.log(`  Yosys Verification: ${passed}/${modules.length} PASSED, ${failed} FAILED`);
console.log("========================================");

if (failed > 0) process.exit(1);
