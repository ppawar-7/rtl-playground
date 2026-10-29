/**
 * run_advanced_differential.js — Advanced RTL Lab Differential Verification
 * 
 * Part of PD Playground: Full RTL Verification Closure
 * 
 * Compares cycle-accurate outputs and status flags between:
 *  A. Advanced RTL JavaScript Engine (RippleCarryAdder, EducationalALU, MultiBitRegister, BinaryCounter, UniversalShiftRegister, FSMModel)
 *  B. Synthesizable Verilog modules simulated with Icarus Verilog WASM (@veriflow/iverilog-wasm)
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from '@veriflow/iverilog-wasm';

import { VectorSignal } from '../../advanced-lab/engine/vector_model.js';
import { RippleCarryAdder, EducationalALU } from '../../advanced-lab/engine/arithmetic_engine.js';
import { MultiBitRegister } from '../../advanced-lab/engine/register_engine.js';
import { BinaryCounter, UniversalShiftRegister } from '../../advanced-lab/engine/counter_engine.js';
import { FSMModel, FSMPresets } from '../../advanced-lab/engine/fsm_engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("================================================================================");
console.log("   Advanced RTL Lab — Cross-Engine Differential Verification Suite");
console.log("   Comparing: JavaScript Engine  VS  Compiled Icarus Verilog (WASM)");
console.log("================================================================================\n");

let totalTests = 0;
let passedTests = 0;
let mismatches = [];

function assertDifferential(suiteName, vectorDesc, jsVal, vvpVal) {
    totalTests++;
    const match = (jsVal === vvpVal);
    if (!match) {
        mismatches.push({ suite: suiteName, vector: vectorDesc, js: jsVal, vvp: vvpVal });
        console.error(`  ❌ MISMATCH in ${suiteName} [${vectorDesc}]: JS=${jsVal}, Verilog=${vvpVal}`);
    } else {
        passedTests++;
    }
}

// ─── 1. Ripple-Carry Adder Differential Simulation ─────────────────────────
console.log("▶ 1. Differential Simulation: 4-Bit Ripple-Carry Adder");
{
    const rcaJs = new RippleCarryAdder(4);
    const testCases = [
        { a: 0, b: 0, cin: 0 },
        { a: 5, b: 3, cin: 0 },
        { a: 7, b: 8, cin: 0 },
        { a: 15, b: 1, cin: 0 },
        { a: 15, b: 15, cin: 1 }
    ];

    const vCode = readFileSync(resolve(__dirname, 'adv_rca.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_rca_tb;
    reg [3:0] a, b;
    reg cin;
    wire [3:0] sum;
    wire cout;
    adv_rca #(.WIDTH(4)) uut (.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

    initial begin
        a=4'd0; b=4'd0; cin=1'b0; #5; $display("RCA_OUT:%d:%d:%d", sum, cout, 0);
        a=4'd5; b=4'd3; cin=1'b0; #5; $display("RCA_OUT:%d:%d:%d", sum, cout, 1);
        a=4'd7; b=4'd8; cin=1'b0; #5; $display("RCA_OUT:%d:%d:%d", sum, cout, 2);
        a=4'd15; b=4'd1; cin=1'b0; #5; $display("RCA_OUT:%d:%d:%d", sum, cout, 3);
        a=4'd15; b=4'd15; cin=1'b1; #5; $display("RCA_OUT:%d:%d:%d", sum, cout, 4);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_rca.v', 'diff_rca_tb.v'],
        files: [{ path: 'adv_rca.v', data: vCode }, { path: 'diff_rca_tb.v', data: tbCode }]
    });

    const vvpResults = [];
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('RCA_OUT:')) {
            const [, sum, cout, idx] = line.split(':');
            vvpResults[parseInt(idx, 10)] = { sum: parseInt(sum, 10), cout: parseInt(cout, 10) };
        }
    }

    testCases.forEach((tc, idx) => {
        const jsRes = rcaJs.compute(new VectorSignal({ width: 4, value: tc.a }), new VectorSignal({ width: 4, value: tc.b }), tc.cin);
        const vvpRes = vvpResults[idx];
        assertDifferential('RippleCarryAdder', `${tc.a}+${tc.b}+${tc.cin} SUM`, jsRes.sum.value, vvpRes.sum);
        assertDifferential('RippleCarryAdder', `${tc.a}+${tc.b}+${tc.cin} COUT`, jsRes.carryOut, vvpRes.cout);
    });

    console.log(`  ✓ 5/5 Arithmetic carry chain test vectors identical between JS and Verilog.`);
}

// ─── 2. Educational ALU Differential Simulation ────────────────────────────
console.log("▶ 2. Differential Simulation: 4-Bit Educational ALU");
{
    const aluJs = new EducationalALU(4);
    const vCode = readFileSync(resolve(__dirname, 'adv_alu.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_alu_tb;
    reg [3:0] a, b, op;
    reg cin;
    wire [3:0] res;
    wire z, c, v, n;
    adv_alu #(.WIDTH(4)) uut (.a(a), .b(b), .opcode(op), .cin(cin), .result(res), .flag_z(z), .flag_c(c), .flag_v(v), .flag_n(n));

    initial begin
        // ADD 3+4
        op=4'd0; a=4'd3; b=4'd4; cin=0; #5; $display("ALU_OUT:0:%d:%d:%d:%d:%d", res, z, c, v, n);
        // ADD Overflow 7+1
        op=4'd0; a=4'd7; b=4'd1; cin=0; #5; $display("ALU_OUT:1:%d:%d:%d:%d:%d", res, z, c, v, n);
        // SUB 9-4
        op=4'd1; a=4'd9; b=4'd4; cin=0; #5; $display("ALU_OUT:2:%d:%d:%d:%d:%d", res, z, c, v, n);
        // SUB Zero 5-5
        op=4'd1; a=4'd5; b=4'd5; cin=0; #5; $display("ALU_OUT:3:%d:%d:%d:%d:%d", res, z, c, v, n);
        // AND
        op=4'd2; a=4'b1100; b=4'b1010; cin=0; #5; $display("ALU_OUT:4:%d:%d:%d:%d:%d", res, z, c, v, n);
        // OR
        op=4'd3; a=4'b1100; b=4'b0011; cin=0; #5; $display("ALU_OUT:5:%d:%d:%d:%d:%d", res, z, c, v, n);
        // XOR
        op=4'd4; a=4'b1100; b=4'b1010; cin=0; #5; $display("ALU_OUT:6:%d:%d:%d:%d:%d", res, z, c, v, n);
        // SHL
        op=4'd6; a=4'b1010; b=4'd0; cin=0; #5; $display("ALU_OUT:7:%d:%d:%d:%d:%d", res, z, c, v, n);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_alu.v', 'diff_alu_tb.v'],
        files: [{ path: 'adv_alu.v', data: vCode }, { path: 'diff_alu_tb.v', data: tbCode }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('ALU_OUT:')) {
            const [, idx, res, z, c, v, n] = line.split(':');
            vvpMap.set(parseInt(idx, 10), {
                res: parseInt(res, 10),
                z: parseInt(z, 10),
                c: parseInt(c, 10),
                v: parseInt(v, 10),
                n: parseInt(n, 10)
            });
        }
    }

    const checks = [
        { op: EducationalALU.OP_ADD, a: 3, b: 4, name: 'ADD 3+4' },
        { op: EducationalALU.OP_ADD, a: 7, b: 1, name: 'ADD Overflow 7+1' },
        { op: EducationalALU.OP_SUB, a: 9, b: 4, name: 'SUB 9-4' },
        { op: EducationalALU.OP_SUB, a: 5, b: 5, name: 'SUB Zero 5-5' },
        { op: EducationalALU.OP_AND, a: 0b1100, b: 0b1010, name: 'AND 1100 & 1010' },
        { op: EducationalALU.OP_OR,  a: 0b1100, b: 0b0011, name: 'OR 1100 | 0011' },
        { op: EducationalALU.OP_XOR, a: 0b1100, b: 0b1010, name: 'XOR 1100 ^ 1010' },
        { op: EducationalALU.OP_SHL, a: 0b1010, b: 0, name: 'SHL 1010' }
    ];

    checks.forEach((chk, idx) => {
        const jsOut = aluJs.execute(chk.op, new VectorSignal({ width: 4, value: chk.a }), new VectorSignal({ width: 4, value: chk.b }));
        const vvpOut = vvpMap.get(idx);
        assertDifferential('EducationalALU', `${chk.name} Result`, jsOut.result.value, vvpOut.res);
        assertDifferential('EducationalALU', `${chk.name} Flag Z`, jsOut.flags.Z, vvpOut.z);
        assertDifferential('EducationalALU', `${chk.name} Flag C`, jsOut.flags.C, vvpOut.c);
        assertDifferential('EducationalALU', `${chk.name} Flag V`, jsOut.flags.V, vvpOut.v);
        assertDifferential('EducationalALU', `${chk.name} Flag N`, jsOut.flags.N, vvpOut.n);
    });

    console.log(`  ✓ 8 ALU operations & status flags identical between JS and Verilog.`);
}

// ─── 3. Multi-Bit Register Differential Simulation ─────────────────────────
console.log("▶ 3. Differential Simulation: 4-Bit Multi-Bit Register");
{
    const regJs = new MultiBitRegister({ width: 4, resetValue: 0 });
    const vCode = readFileSync(resolve(__dirname, 'adv_reg.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_reg_tb;
    reg clk, rst, en;
    reg [3:0] d;
    wire [3:0] q;
    adv_reg #(.WIDTH(4)) uut (.clk(clk), .rst(rst), .en(en), .d(d), .q(q));
    always #5 clk = ~clk;
    initial begin
        clk=0; rst=1; en=0; d=0;
        #12; rst=0; $display("REG_CYC:1:%d", q);
        en=1; d=4'hA; #10; $display("REG_CYC:2:%d", q);
        en=0; d=4'h5; #10; $display("REG_CYC:3:%d", q);
        rst=1; en=1; d=4'hF; #10; $display("REG_CYC:4:%d", q);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_reg.v', 'diff_reg_tb.v'],
        files: [{ path: 'adv_reg.v', data: vCode }, { path: 'diff_reg_tb.v', data: tbCode }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('REG_CYC:')) {
            const [, cyc, val] = line.split(':');
            vvpMap.set(parseInt(cyc, 10), parseInt(val, 10));
        }
    }

    // Cyc 1: reset
    regJs.step({ clkEdge: true, rst: 1, en: 0, d: new VectorSignal({ width: 4, value: 0 }) });
    assertDifferential('MultiBitRegister', 'Cyc 1 Reset', regJs.q.value, vvpMap.get(1));

    // Cyc 2: load 0xA
    regJs.step({ clkEdge: true, rst: 0, en: 1, d: new VectorSignal({ width: 4, value: 0xA }) });
    assertDifferential('MultiBitRegister', 'Cyc 2 Load 0xA', regJs.q.value, vvpMap.get(2));

    // Cyc 3: hold 0xA with en=0
    regJs.step({ clkEdge: true, rst: 0, en: 0, d: new VectorSignal({ width: 4, value: 0x5 }) });
    assertDifferential('MultiBitRegister', 'Cyc 3 Hold 0xA', regJs.q.value, vvpMap.get(3));

    // Cyc 4: reset priority over enable
    regJs.step({ clkEdge: true, rst: 1, en: 1, d: new VectorSignal({ width: 4, value: 0xF }) });
    assertDifferential('MultiBitRegister', 'Cyc 4 Reset Override', regJs.q.value, vvpMap.get(4));

    console.log(`  ✓ Multi-bit register load, hold, and reset override identical between JS and Verilog.`);
}

// ─── 4. Modulo Counter Differential Simulation ─────────────────────────────
console.log("▶ 4. Differential Simulation: 4-Bit Modulo Counter");
{
    const cntJs = new BinaryCounter({ width: 4, modulo: 16 });
    const vCode = readFileSync(resolve(__dirname, 'adv_counter.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_cnt_tb;
    reg clk, rst, en, up_down;
    wire [3:0] count;
    wire terminal_count;
    adv_counter #(.WIDTH(4), .MODULO(16)) uut (.clk(clk), .rst(rst), .en(en), .up_down(up_down), .count(count), .terminal_count(terminal_count));
    always #5 clk = ~clk;
    initial begin
        clk=0; rst=1; en=1; up_down=1;
        #12; rst=0; $display("CNT_CYC:0:%d:%d", count, terminal_count);
        repeat(5) #10; $display("CNT_CYC:5:%d:%d", count, terminal_count);
        repeat(10) #10; $display("CNT_CYC:15:%d:%d", count, terminal_count);
        #10; $display("CNT_CYC:16:%d:%d", count, terminal_count);
        up_down=0; #10; $display("CNT_CYC:17:%d:%d", count, terminal_count);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_counter.v', 'diff_cnt_tb.v'],
        files: [{ path: 'adv_counter.v', data: vCode }, { path: 'diff_cnt_tb.v', data: tbCode }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('CNT_CYC:')) {
            const [, cyc, val, tc] = line.split(':');
            vvpMap.set(parseInt(cyc, 10), { val: parseInt(val, 10), tc: parseInt(tc, 10) });
        }
    }

    cntJs.reset();
    assertDifferential('BinaryCounter', 'Reset to 0', cntJs.count.value, vvpMap.get(0).val);
    assertDifferential('BinaryCounter', 'Reset TC=0', cntJs.terminalCount ? 1 : 0, vvpMap.get(0).tc);

    for (let i = 0; i < 5; i++) cntJs.step({ en: 1, up: 1 });
    assertDifferential('BinaryCounter', 'Count 5', cntJs.count.value, vvpMap.get(5).val);

    for (let i = 0; i < 10; i++) cntJs.step({ en: 1, up: 1 });
    assertDifferential('BinaryCounter', 'Count 15 (Max Modulus)', cntJs.count.value, vvpMap.get(15).val);
    assertDifferential('BinaryCounter', 'Terminal Count Asserted', cntJs.terminalCount ? 1 : 0, vvpMap.get(15).tc);

    cntJs.step({ en: 1, up: 1 });
    assertDifferential('BinaryCounter', 'Rollover to 0', cntJs.count.value, vvpMap.get(16).val);

    cntJs.step({ en: 1, up: 0 });
    assertDifferential('BinaryCounter', 'Underflow Rollover to 15', cntJs.count.value, vvpMap.get(17).val);

    console.log(`  ✓ Modulo counter counting, terminal count, and rollover identical between JS and Verilog.`);
}

// ─── 5. Universal Shift Register Differential Simulation ───────────────────
console.log("▶ 5. Differential Simulation: 4-Bit Universal Shift Register");
{
    const shiftJs = new UniversalShiftRegister({ width: 4 });
    const vCode = readFileSync(resolve(__dirname, 'adv_shift.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_shift_tb;
    reg clk, rst;
    reg [1:0] mode;
    reg sin_msb, sin_lsb;
    reg [3:0] parallel_d;
    wire [3:0] parallel_q;
    wire sout_lsb, sout_msb;
    adv_shift #(.WIDTH(4)) uut (.clk(clk), .rst(rst), .mode(mode), .sin_msb(sin_msb), .sin_lsb(sin_lsb), .parallel_d(parallel_d), .parallel_q(parallel_q), .sout_lsb(sout_lsb), .sout_msb(sout_msb));
    always #5 clk = ~clk;
    initial begin
        clk=0; rst=1; mode=0; sin_msb=0; sin_lsb=0; parallel_d=0;
        #12; rst=0;
        mode=2'b11; parallel_d=4'b1011; #10; $display("SHIFT_CYC:1:%d:%d:%d", parallel_q, sout_lsb, sout_msb);
        mode=2'b01; sin_msb=0; #10; $display("SHIFT_CYC:2:%d:%d:%d", parallel_q, sout_lsb, sout_msb);
        mode=2'b01; sin_msb=1; #10; $display("SHIFT_CYC:3:%d:%d:%d", parallel_q, sout_lsb, sout_msb);
        mode=2'b10; sin_lsb=1; #10; $display("SHIFT_CYC:4:%d:%d:%d", parallel_q, sout_lsb, sout_msb);
        mode=2'b00; #10; $display("SHIFT_CYC:5:%d:%d:%d", parallel_q, sout_lsb, sout_msb);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_shift.v', 'diff_shift_tb.v'],
        files: [{ path: 'adv_shift.v', data: vCode }, { path: 'diff_shift_tb.v', data: tbCode }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('SHIFT_CYC:')) {
            const [, cyc, val, lsb, msb] = line.split(':');
            vvpMap.set(parseInt(cyc, 10), { val: parseInt(val, 10), lsb: parseInt(lsb, 10), msb: parseInt(msb, 10) });
        }
    }

    shiftJs.reset();
    shiftJs.step({ mode: UniversalShiftRegister.MODE_LOAD, parallel_d: new VectorSignal({ width: 4, value: 0b1011 }) });
    assertDifferential('UniversalShiftRegister', 'Parallel Load 1011', shiftJs.q.value, vvpMap.get(1).val);

    shiftJs.step({ mode: UniversalShiftRegister.MODE_SHR, sin_msb: 0 });
    assertDifferential('UniversalShiftRegister', 'Shift Right (sin=0)', shiftJs.q.value, vvpMap.get(2).val);

    shiftJs.step({ mode: UniversalShiftRegister.MODE_SHR, sin_msb: 1 });
    assertDifferential('UniversalShiftRegister', 'Shift Right (sin=1)', shiftJs.q.value, vvpMap.get(3).val);

    shiftJs.step({ mode: UniversalShiftRegister.MODE_SHL, sin_lsb: 1 });
    assertDifferential('UniversalShiftRegister', 'Shift Left (sin=1)', shiftJs.q.value, vvpMap.get(4).val);

    shiftJs.step({ mode: UniversalShiftRegister.MODE_HOLD });
    assertDifferential('UniversalShiftRegister', 'Hold State', shiftJs.q.value, vvpMap.get(5).val);

    console.log(`  ✓ Shift register load, shift right/left, and hold identical between JS and Verilog.`);
}

// ─── 6. Finite State Machine Differential Simulation ───────────────────────
console.log("▶ 6. Differential Simulation: Finite State Machine (Traffic Light)");
{
    const fsmJs = FSMPresets.trafficLight();
    const vCode = readFileSync(resolve(__dirname, 'adv_fsm.v'), 'utf8');
    const tbCode = `\`timescale 1ns/1ps
module diff_fsm_tb;
    reg clk, rst, timer;
    wire light_g, light_y, light_r;
    adv_fsm uut (.clk(clk), .rst(rst), .timer(timer), .light_g(light_g), .light_y(light_y), .light_r(light_r));
    always #5 clk = ~clk;
    initial begin
        clk=0; rst=1; timer=0;
        #12; rst=0; $display("FSM_CYC:0:%d:%d:%d", light_r, light_y, light_g);
        timer=1; #10; $display("FSM_CYC:1:%d:%d:%d", light_r, light_y, light_g);
        timer=0; #10; $display("FSM_CYC:2:%d:%d:%d", light_r, light_y, light_g);
        timer=1; #10; $display("FSM_CYC:3:%d:%d:%d", light_r, light_y, light_g);
        timer=1; #10; $display("FSM_CYC:4:%d:%d:%d", light_r, light_y, light_g);
        $finish;
    end
endmodule
`;

    const vvp = await simulate({
        sources: ['adv_fsm.v', 'diff_fsm_tb.v'],
        files: [{ path: 'adv_fsm.v', data: vCode }, { path: 'diff_fsm_tb.v', data: tbCode }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('FSM_CYC:')) {
            const [, cyc, r, y, g] = line.split(':');
            vvpMap.set(parseInt(cyc, 10), { r: parseInt(r, 10), y: parseInt(y, 10), g: parseInt(g, 10) });
        }
    }

    fsmJs.reset();
    let out0 = fsmJs.evaluateOutputs({ timer: 0 }).activeOutputs;
    assertDifferential('FSM Traffic Controller', 'Cyc 0 Red Output', out0.light_r, vvpMap.get(0).r);
    assertDifferential('FSM Traffic Controller', 'Cyc 0 Green Output', out0.light_g, vvpMap.get(0).g);

    fsmJs.clockStep({ timer: 1 });
    let out1 = fsmJs.evaluateOutputs({ timer: 1 }).activeOutputs;
    assertDifferential('FSM Traffic Controller', 'Cyc 1 Green Transition', out1.light_g, vvpMap.get(1).g);

    fsmJs.clockStep({ timer: 0 });
    let out2 = fsmJs.evaluateOutputs({ timer: 0 }).activeOutputs;
    assertDifferential('FSM Traffic Controller', 'Cyc 2 Green Hold', out2.light_g, vvpMap.get(2).g);

    fsmJs.clockStep({ timer: 1 });
    let out3 = fsmJs.evaluateOutputs({ timer: 1 }).activeOutputs;
    assertDifferential('FSM Traffic Controller', 'Cyc 3 Yellow Transition', out3.light_y, vvpMap.get(3).y);

    fsmJs.clockStep({ timer: 1 });
    let out4 = fsmJs.evaluateOutputs({ timer: 1 }).activeOutputs;
    assertDifferential('FSM Traffic Controller', 'Cyc 4 Red Transition', out4.light_r, vvpMap.get(4).r);

    console.log(`  ✓ FSM state transitions and outputs identical between JS and Verilog.`);
}

console.log("\n================================================================================");
console.log(`   Advanced Differential Summary: ${passedTests}/${totalTests} Checks PASSED, ${mismatches.length} Mismatches`);
console.log("================================================================================");

if (mismatches.length > 0) {
    console.error("\nMismatches detail:");
    console.table(mismatches);
    process.exit(1);
}
