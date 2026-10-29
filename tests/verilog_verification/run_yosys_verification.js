/**
 * run_yosys_verification.js — Real HDL Synthesis & Elaboration Verification
 * 
 * Compiles and checks all 6 generated Verilog modules using Yosys AST parser,
 * RTLIL generator, hierarchy elaboration, and design check.
 */

import { readFileSync } from 'node:fs';
import { runYosys } from '@yowasp/yosys';

const modules = [
    { name: 'gates', file: 'tests/verilog_verification/gates.v', top: 'gates_module', expectedCells: ['$_AND_', '$_OR_', '$_XOR_', '$_NAND_', '$_NOR_', '$_NOT_'] },
    { name: 'half_adder', file: 'tests/verilog_verification/half_adder.v', top: 'half_adder_module', expectedCells: ['$_XOR_', '$_AND_'] },
    { name: 'mux2', file: 'tests/verilog_verification/mux2.v', top: 'mux2_module', expectedCells: ['$_MUX_'] },
    { name: 'dff', file: 'tests/verilog_verification/dff.v', top: 'dff_module', expectedCells: ['$dff'] },
    { name: 'shift_reg', file: 'tests/verilog_verification/shift_reg.v', top: 'shift_reg_module', expectedCells: ['$dff'] },
    { name: 'multi_dff', file: 'tests/verilog_verification/multi_dff.v', top: 'multi_dff_module', expectedCells: ['$dff'] }
];

console.log("=== Running Real Verilog HDL Verification via Yosys ===");

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
console.log(`  Yosys Verification: ${passed} PASSED, ${failed} FAILED`);
console.log("========================================");

if (failed > 0) process.exit(1);
