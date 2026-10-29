/**
 * run_differential_simulation.js — Cross-Engine Differential Simulation
 * 
 * Executes identical vectors through:
 *  A. RTL Playground JavaScript Engine (LogicSimulator + SequentialEngine)
 *  B. Generated Verilog compiled and simulated with Icarus Verilog WASM
 * 
 * Compares combinational outputs, flip-flop state, clock edge updates,
 * clock enable behavior, and synchronous reset cycle-by-cycle.
 */

import { simulate } from '@veriflow/iverilog-wasm';
import { CircuitGraph, resetIdCounter } from '../../src/engine/circuit_graph.js';
import { LogicSimulator } from '../../src/engine/logic_simulator.js';
import { SequentialEngine } from '../../src/engine/sequential_engine.js';
import { VerilogGenerator } from '../../src/engine/verilog_generator.js';
import { PRESETS } from '../../src/modules/presets.js';

console.log("================================================================================");
console.log("   RTL Playground — Cross-Engine Differential Verification Suite");
console.log("   Comparing: JavaScript Engine  VS  Compiled Icarus Verilog (WASM)");
console.log("================================================================================\n");

let totalTests = 0;
let passedTests = 0;
let mismatches = [];

function assertDifferential(suiteName, vectorDesc, jsValue, vvpValue) {
    totalTests++;
    const match = (jsValue === vvpValue);
    if (!match) {
        mismatches.push({
            suite: suiteName,
            vector: vectorDesc,
            js: jsValue,
            vvp: vvpValue
        });
        console.error(`  ❌ MISMATCH in ${suiteName} [${vectorDesc}]: JS=${jsValue}, Verilog=${vvpValue}`);
    } else {
        passedTests++;
    }
}

// ─── 1. Basic Gates (4 vectors x 6 gates = 24 checks) ───────────────────────

console.log("▶ 1. Differential Simulation: Basic Logic Gates");
{
    const g = new CircuitGraph();
    resetIdCounter();
    const a = g.addComponent('INPUT', 50, 40, 'a');
    const b = g.addComponent('INPUT', 50, 100, 'b');

    const andG = g.addComponent('AND', 180, 40, 'and_g');
    const orG = g.addComponent('OR', 180, 100, 'or_g');
    const xorG = g.addComponent('XOR', 180, 160, 'xor_g');
    const nandG = g.addComponent('NAND', 180, 220, 'nand_g');
    const norG = g.addComponent('NOR', 180, 280, 'nor_g');
    const notG = g.addComponent('NOT', 180, 340, 'not_g');

    const yAnd = g.addComponent('OUTPUT', 320, 40, 'y_and');
    const yOr = g.addComponent('OUTPUT', 320, 100, 'y_or');
    const yXor = g.addComponent('OUTPUT', 320, 160, 'y_xor');
    const yNand = g.addComponent('OUTPUT', 320, 220, 'y_nand');
    const yNor = g.addComponent('OUTPUT', 320, 280, 'y_nor');
    const yNot = g.addComponent('OUTPUT', 320, 340, 'y_not');

    g.addConnection(a.id, `${a.id}.out0`, andG.id, `${andG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, andG.id, `${andG.id}.in1`);
    g.addConnection(andG.id, `${andG.id}.out0`, yAnd.id, `${yAnd.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, orG.id, `${orG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, orG.id, `${orG.id}.in1`);
    g.addConnection(orG.id, `${orG.id}.out0`, yOr.id, `${yOr.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, xorG.id, `${xorG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, xorG.id, `${xorG.id}.in1`);
    g.addConnection(xorG.id, `${xorG.id}.out0`, yXor.id, `${yXor.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, nandG.id, `${nandG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, nandG.id, `${nandG.id}.in1`);
    g.addConnection(nandG.id, `${nandG.id}.out0`, yNand.id, `${yNand.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, norG.id, `${norG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, norG.id, `${norG.id}.in1`);
    g.addConnection(norG.id, `${norG.id}.out0`, yNor.id, `${yNor.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, notG.id, `${notG.id}.in0`);
    g.addConnection(notG.id, `${notG.id}.out0`, yNot.id, `${yNot.id}.in0`);

    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('gates_module');

    const sim = new LogicSimulator(g);

    // Verilog testbench that outputs machine-readable tags: OUT:a,b:y_and,y_or,y_xor,y_nand,y_nor,y_not
    const tb = `
\`timescale 1ns/1ps
module tb;
    reg a, b;
    wire y_and, y_or, y_xor, y_nand, y_nor, y_not;
    gates_module uut (a, b, y_and, y_or, y_xor, y_nand, y_nor, y_not);
    initial begin
        a=0; b=0; #10; $display("VEC:0,0:%b,%b,%b,%b,%b,%b", y_and, y_or, y_xor, y_nand, y_nor, y_not);
        a=0; b=1; #10; $display("VEC:0,1:%b,%b,%b,%b,%b,%b", y_and, y_or, y_xor, y_nand, y_nor, y_not);
        a=1; b=0; #10; $display("VEC:1,0:%b,%b,%b,%b,%b,%b", y_and, y_or, y_xor, y_nand, y_nor, y_not);
        a=1; b=1; #10; $display("VEC:1,1:%b,%b,%b,%b,%b,%b", y_and, y_or, y_xor, y_nand, y_nor, y_not);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['gates.v', 'tb.v'],
        files: [{ path: 'gates.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('VEC:')) {
            const [, ab, outs] = line.split(':');
            vvpMap.set(ab, outs.split(',').map(x => parseInt(x, 10)));
        }
    }

    const testVectors = [
        [0, 0], [0, 1], [1, 0], [1, 1]
    ];
    for (const [va, vb] of testVectors) {
        const jsEval = sim.evaluateWithInputs({ [a.id]: va, [b.id]: vb });
        const jsOuts = [
            jsEval.outputs[yAnd.id],
            jsEval.outputs[yOr.id],
            jsEval.outputs[yXor.id],
            jsEval.outputs[yNand.id],
            jsEval.outputs[yNor.id],
            jsEval.outputs[yNot.id]
        ];
        const vvpOuts = vvpMap.get(`${va},${vb}`);
        assertDifferential('Basic Gates', `A=${va},B=${vb}`, jsOuts.join(','), vvpOuts.join(','));
    }
    console.log(`  ✓ 4/4 truth table vectors identical between JS and Verilog simulation.`);
}

// ─── 2. Half Adder (4 vectors x 2 outputs = 8 checks) ───────────────────────

console.log("\n▶ 2. Differential Simulation: 1-Bit Half Adder");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['half-adder'].circuit);
    const sim = new LogicSimulator(g);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('half_adder_module');

    const inA = Array.from(g.components.values()).find(c => c.label === 'A');
    const inB = Array.from(g.components.values()).find(c => c.label === 'B');
    const sumOut = Array.from(g.components.values()).find(c => c.label === 'SUM');
    const carryOut = Array.from(g.components.values()).find(c => c.label === 'CARRY');

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg a, b;
    wire sum, carry;
    half_adder_module uut (a, b, sum, carry);
    initial begin
        a=0; b=0; #10; $display("VEC:0,0:%b,%b", sum, carry);
        a=0; b=1; #10; $display("VEC:0,1:%b,%b", sum, carry);
        a=1; b=0; #10; $display("VEC:1,0:%b,%b", sum, carry);
        a=1; b=1; #10; $display("VEC:1,1:%b,%b", sum, carry);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['ha.v', 'tb.v'],
        files: [{ path: 'ha.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('VEC:')) {
            const [, ab, outs] = line.split(':');
            vvpMap.set(ab, outs.split(',').map(x => parseInt(x, 10)));
        }
    }

    for (let aVal = 0; aVal <= 1; aVal++) {
        for (let bVal = 0; bVal <= 1; bVal++) {
            const jsRes = sim.evaluateWithInputs({ [inA.id]: aVal, [inB.id]: bVal });
            const jsOut = `${jsRes.outputs[sumOut.id]},${jsRes.outputs[carryOut.id]}`;
            const vvpOut = vvpMap.get(`${aVal},${bVal}`).join(',');
            assertDifferential('Half Adder', `A=${aVal},B=${bVal}`, jsOut, vvpOut);
        }
    }
    console.log(`  ✓ 4/4 arithmetic vectors identical between JS and Verilog simulation.`);
}

// ─── 3. 2:1 Multiplexer (8 input combinations) ──────────────────────────────

console.log("\n▶ 3. Differential Simulation: 2:1 Multiplexer");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['mux-2to1'].circuit);
    const sim = new LogicSimulator(g);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('mux2_module');

    const inA = Array.from(g.components.values()).find(c => c.label === 'A');
    const inB = Array.from(g.components.values()).find(c => c.label === 'B');
    const inSel = Array.from(g.components.values()).find(c => c.label === 'Sel');
    const outY = Array.from(g.components.values()).find(c => c.label === 'Y');

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg a, b, sel;
    wire y;
    mux2_module uut (a, b, sel, y);
    integer i;
    initial begin
        for (i=0; i<8; i=i+1) begin
            {sel, b, a} = i[2:0];
            #10;
            $display("VEC:%0d,%0d,%0d:%b", a, b, sel, y);
        end
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['mux.v', 'tb.v'],
        files: [{ path: 'mux.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('VEC:')) {
            const [, abs, out] = line.split(':');
            vvpMap.set(abs, parseInt(out, 10));
        }
    }

    for (let s = 0; s <= 1; s++) {
        for (let b = 0; b <= 1; b++) {
            for (let a = 0; a <= 1; a++) {
                const jsRes = sim.evaluateWithInputs({ [inA.id]: a, [inB.id]: b, [inSel.id]: s });
                const jsY = jsRes.outputs[outY.id];
                const vvpY = vvpMap.get(`${a},${b},${s}`);
                assertDifferential('MUX2', `A=${a},B=${b},Sel=${s}`, jsY, vvpY);
            }
        }
    }
    console.log(`  ✓ 8/8 selection vectors identical between JS and Verilog simulation.`);
}

// ─── 4. Sequential D Flip-Flop (State Retention & Clock Edge) ───────────────

console.log("\n▶ 4. Differential Simulation: D Flip-Flop Sequential Engine");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['dff-demo'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('dff_module');

    const inD = Array.from(g.components.values()).find(c => c.label === 'D');
    const dffComp = g.getDFFComponents()[0];

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg clk, d;
    wire q;
    dff_module uut (clk, d, q);
    initial begin
        clk = 0; d = 0;
        #5;  // Initial low
        d = 1; #5;  // Set D=1 before edge
        clk = 1; #5; // Posedge 1
        $display("CYCLE:1:%b", q);
        clk = 0; #5; // Falling edge
        d = 0; #3;  // Change D to 0 during hold
        $display("HOLD:1:%b", q);
        #2;
        clk = 1; #5; // Posedge 2 (samples D=0)
        $display("CYCLE:2:%b", q);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['dff.v', 'tb.v'],
        files: [{ path: 'dff.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpCycles = {};
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('CYCLE:') || line.startsWith('HOLD:')) {
            const [tag, val] = line.split(':').slice(0, 2).concat(line.split(':')[2]);
            const key = line.substring(0, line.lastIndexOf(':'));
            vvpCycles[key] = parseInt(line.split(':').pop(), 10);
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Cycle 1: D=1 -> Posedge
    g.setInputValue(inD.id, 1);
    sim.evaluate();
    seq.clockStep(); // 0 -> 1 (Posedge)
    const jsQ1 = seq.getDFFState(dffComp.id).Q;
    assertDifferential('DFF', 'Posedge 1 (D=1)', jsQ1, vvpCycles['CYCLE:1']);

    // Hold: Clock falling edge, change D=0 -> Q must retain 1
    seq.clockStep(); // 1 -> 0
    g.setInputValue(inD.id, 0);
    sim.evaluate();
    const jsQHold = seq.getDFFState(dffComp.id).Q;
    assertDifferential('DFF', 'Hold State during D Toggle', jsQHold, vvpCycles['HOLD:1']);

    // Cycle 2: Posedge -> Q becomes 0
    seq.clockStep(); // 0 -> 1 (Posedge 2)
    const jsQ2 = seq.getDFFState(dffComp.id).Q;
    assertDifferential('DFF', 'Posedge 2 (D=0)', jsQ2, vvpCycles['CYCLE:2']);

    console.log(`  ✓ Sequential edge-triggering and state retention identical across JS and Verilog.`);
}

// ─── 5. Pipelined 2-Stage Shift Register ────────────────────────────────────

console.log("\n▶ 5. Differential Simulation: 2-Stage Shift Register Pipeline");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['shift-reg-2stage'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('shift_reg_module');

    const inD = Array.from(g.components.values()).find(c => c.label === 'D');
    const dffs = g.getDFFComponents();

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg clk, d;
    wire q1, q2;
    shift_reg_module uut (clk, d, q1, q2);
    initial begin
        // Match JS engine's power-on default (Q=0)
        uut.dff1_q = 0;
        uut.dff2_q = 0;
        clk = 0; d = 0; #5;
        // Cycle 1: shift in 1
        d = 1; #5;
        clk = 1; #5; $display("CYC:1:%b,%b", q1, q2);
        clk = 0; #5;
        // Cycle 2: shift in 0
        d = 0; #5;
        clk = 1; #5; $display("CYC:2:%b,%b", q1, q2);
        clk = 0; #5;
        // Cycle 3: shift in 0
        d = 0; #5;
        clk = 1; #5; $display("CYC:3:%b,%b", q1, q2);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['shift.v', 'tb.v'],
        files: [{ path: 'shift.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('CYC:')) {
            const [, cyc, outs] = line.split(':');
            vvpMap.set(cyc, outs.split(',').map(x => parseInt(x, 10)));
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Cycle 1: D=1
    g.setInputValue(inD.id, 1);
    sim.evaluate();
    seq.clockStep();
    const jsCyc1 = `${seq.getDFFState(dffs[0].id).Q},${seq.getDFFState(dffs[1].id).Q}`;
    assertDifferential('Shift Register', 'Cycle 1 (D=1)', jsCyc1, vvpMap.get('1').join(','));
    seq.clockStep();

    // Cycle 2: D=0
    g.setInputValue(inD.id, 0);
    sim.evaluate();
    seq.clockStep();
    const jsCyc2 = `${seq.getDFFState(dffs[0].id).Q},${seq.getDFFState(dffs[1].id).Q}`;
    assertDifferential('Shift Register', 'Cycle 2 (D=0)', jsCyc2, vvpMap.get('2').join(','));
    seq.clockStep();

    // Cycle 3: D=0
    g.setInputValue(inD.id, 0);
    sim.evaluate();
    seq.clockStep();
    const jsCyc3 = `${seq.getDFFState(dffs[0].id).Q},${seq.getDFFState(dffs[1].id).Q}`;
    assertDifferential('Shift Register', 'Cycle 3 (D=0)', jsCyc3, vvpMap.get('3').join(','));

    console.log(`  ✓ 3-cycle pipeline propagation identical between JS nonblocking update and Verilog.`);
}

// ─── 6. Register with Clock Enable ──────────────────────────────────────────

console.log("\n▶ 6. Differential Simulation: Register with Clock Enable (Recirculating MUX)");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['reg-enable'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('reg_enable_module');

    const inD = Array.from(g.components.values()).find(c => c.label === 'D');
    const inEn = Array.from(g.components.values()).find(c => c.label === 'EN');
    const dffComp = g.getDFFComponents()[0];

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg clk, d, en;
    wire q;
    reg_enable_module uut (clk, d, en, q);
    initial begin
        // Match JS engine's power-on default (Q=0)
        uut.dff_q = 0;
        clk = 0; d = 1; en = 0; #5;
        // Posedge 1 with EN=0 -> Must hold 0
        clk = 1; #5; $display("EN_CYC:1:%b", q);
        clk = 0; #5;
        // Posedge 2 with EN=1, D=1 -> Must load 1
        en = 1; d = 1; #5;
        clk = 1; #5; $display("EN_CYC:2:%b", q);
        clk = 0; #5;
        // Posedge 3 with EN=0, D=0 -> Must hold 1
        en = 0; d = 0; #5;
        clk = 1; #5; $display("EN_CYC:3:%b", q);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['en.v', 'tb.v'],
        files: [{ path: 'en.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('EN_CYC:')) {
            const [, cyc, val] = line.split(':');
            vvpMap.set(cyc, parseInt(val, 10));
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Step 1: EN=0, D=1 -> Clock Step
    g.setInputValue(inD.id, 1);
    g.setInputValue(inEn.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Clock Enable', 'Cycle 1 (EN=0, D=1, hold 0)', seq.getDFFState(dffComp.id).Q, vvpMap.get('1'));
    seq.clockStep();

    // Step 2: EN=1, D=1 -> Clock Step
    g.setInputValue(inEn.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Clock Enable', 'Cycle 2 (EN=1, D=1, load 1)', seq.getDFFState(dffComp.id).Q, vvpMap.get('2'));
    seq.clockStep();

    // Step 3: EN=0, D=0 -> Clock Step
    g.setInputValue(inEn.id, 0);
    g.setInputValue(inD.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Clock Enable', 'Cycle 3 (EN=0, D=0, hold 1)', seq.getDFFState(dffComp.id).Q, vvpMap.get('3'));

    console.log(`  ✓ Clock enable data recirculation identical between JS and Verilog simulation.`);
}

// ─── 7. Register with Synchronous Reset ──────────────────────────────────────

console.log("\n▶ 7. Differential Simulation: Register with Synchronous Reset");
{
    const g = new CircuitGraph();
    g.deserialize(PRESETS['reg-sync-reset'].circuit);
    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('reg_sync_reset_module');

    const inD = Array.from(g.components.values()).find(c => c.label === 'D');
    const inRst = Array.from(g.components.values()).find(c => c.label === 'RST');
    const dffComp = g.getDFFComponents()[0];

    const tb = `
\`timescale 1ns/1ps
module tb;
    reg clk, d, rst;
    wire q;
    reg_sync_reset_module uut (clk, d, rst, q);
    initial begin
        clk = 0; d = 1; rst = 0; #5;
        // Posedge 1 with RST=0, D=1 -> Load 1
        clk = 1; #5; $display("RST_CYC:1:%b", q);
        clk = 0; #5;
        // Posedge 2 with RST=1, D=1 -> Synchronous Clear to 0
        rst = 1; d = 1; #5;
        clk = 1; #5; $display("RST_CYC:2:%b", q);
        clk = 0; #5;
        // Posedge 3 with RST=0, D=1 -> Reload 1
        rst = 0; d = 1; #5;
        clk = 1; #5; $display("RST_CYC:3:%b", q);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['rst.v', 'tb.v'],
        files: [{ path: 'rst.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('RST_CYC:')) {
            const [, cyc, val] = line.split(':');
            vvpMap.set(cyc, parseInt(val, 10));
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Cycle 1: RST=0, D=1 -> Load 1
    g.setInputValue(inRst.id, 0);
    g.setInputValue(inD.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Sync Reset', 'Cycle 1 (RST=0, D=1, load 1)', seq.getDFFState(dffComp.id).Q, vvpMap.get('1'));
    seq.clockStep();

    // Cycle 2: RST=1, D=1 -> Synchronous Reset
    g.setInputValue(inRst.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Sync Reset', 'Cycle 2 (RST=1, D=1, sync reset 0)', seq.getDFFState(dffComp.id).Q, vvpMap.get('2'));
    seq.clockStep();

    // Cycle 3: RST=0, D=1 -> Normal load resumes
    g.setInputValue(inRst.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Sync Reset', 'Cycle 3 (RST=0, D=1, reload 1)', seq.getDFFState(dffComp.id).Q, vvpMap.get('3'));

    console.log(`  ✓ Synchronous reset behavior identical between JS and Verilog simulation.`);
}

// ─── 8. Native DFFE Differential Simulation ──────────────────────────────────

console.log("▶ 8. Differential Simulation: Native DFFE (Clock Enable)");
{
    const g = new CircuitGraph();
    resetIdCounter();
    const clk = g.addComponent('CLOCK', 50, 150, 'clk');
    const din = g.addComponent('INPUT', 50, 50, 'din');
    const en = g.addComponent('INPUT', 50, 100, 'en');
    const dffe = g.addComponent('DFFE', 200, 50, 'dffe_reg');
    const out = g.addComponent('OUTPUT', 350, 50, 'q_out');

    g.addConnection(clk.id, `${clk.id}.out0`, dffe.id, `${dffe.id}.in1`);
    g.addConnection(din.id, `${din.id}.out0`, dffe.id, `${dffe.id}.in0`);
    g.addConnection(en.id, `${en.id}.out0`, dffe.id, `${dffe.id}.in2`);
    g.addConnection(dffe.id, `${dffe.id}.out0`, out.id, `${out.id}.in0`);

    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('native_dffe_diff');

    const tb = `
\`timescale 1ns / 1ps
module tb;
    reg clk, din, en;
    wire q_out;
    native_dffe_diff uut (.clk(clk), .din(din), .en(en), .q_out(q_out));
    initial begin
        clk = 0; din = 1; en = 1; #5;
        // Cycle 1: EN=1, DIN=1 -> Load 1
        clk = 1; #5; $display("DFFE_CYC:1:%b", q_out);
        clk = 0; #5;
        // Cycle 2: EN=0, DIN=0 -> Hold 1
        din = 0; en = 0; #5;
        clk = 1; #5; $display("DFFE_CYC:2:%b", q_out);
        clk = 0; #5;
        // Cycle 3: EN=1, DIN=0 -> Update to 0
        en = 1; #5;
        clk = 1; #5; $display("DFFE_CYC:3:%b", q_out);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['dffe.v', 'tb.v'],
        files: [{ path: 'dffe.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('DFFE_CYC:')) {
            const [, cyc, val] = line.split(':');
            vvpMap.set(cyc, parseInt(val, 10));
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Cycle 1: EN=1, DIN=1
    g.setInputValue(din.id, 1);
    g.setInputValue(en.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFE', 'Cycle 1 (EN=1, DIN=1, load 1)', seq.getDFFState(dffe.id).Q, vvpMap.get('1'));
    seq.clockStep();

    // Cycle 2: EN=0, DIN=0
    g.setInputValue(din.id, 0);
    g.setInputValue(en.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFE', 'Cycle 2 (EN=0, DIN=0, hold 1)', seq.getDFFState(dffe.id).Q, vvpMap.get('2'));
    seq.clockStep();

    // Cycle 3: EN=1, DIN=0
    g.setInputValue(en.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFE', 'Cycle 3 (EN=1, DIN=0, load 0)', seq.getDFFState(dffe.id).Q, vvpMap.get('3'));

    console.log(`  ✓ Native DFFE behavior identical between JS and Verilog simulation.`);
}

// ─── 9. Native DFFESR Priority Differential Simulation ────────────────────────

console.log("▶ 9. Differential Simulation: Native DFFESR (Reset Priority over Enable)");
{
    const g = new CircuitGraph();
    resetIdCounter();
    const clk = g.addComponent('CLOCK', 50, 150, 'clk');
    const din = g.addComponent('INPUT', 50, 50, 'din');
    const en = g.addComponent('INPUT', 50, 100, 'en');
    const rst = g.addComponent('INPUT', 50, 200, 'rst');
    const dffesr = g.addComponent('DFFESR', 200, 100, 'esr_reg');
    const out = g.addComponent('OUTPUT', 350, 100, 'q_out');

    g.addConnection(clk.id, `${clk.id}.out0`, dffesr.id, `${dffesr.id}.in1`);
    g.addConnection(din.id, `${din.id}.out0`, dffesr.id, `${dffesr.id}.in0`);
    g.addConnection(en.id, `${en.id}.out0`, dffesr.id, `${dffesr.id}.in2`);
    g.addConnection(rst.id, `${rst.id}.out0`, dffesr.id, `${dffesr.id}.in3`);
    g.addConnection(dffesr.id, `${dffesr.id}.out0`, out.id, `${out.id}.in0`);

    const sim = new LogicSimulator(g);
    const seq = new SequentialEngine(g, sim);
    const vgen = new VerilogGenerator(g);
    const vRes = vgen.generate('native_dffesr_diff');

    const tb = `
\`timescale 1ns / 1ps
module tb;
    reg clk, din, en, rst;
    wire q_out;
    native_dffesr_diff uut (.clk(clk), .din(din), .en(en), .rst(rst), .q_out(q_out));
    initial begin
        clk = 0; din = 1; en = 1; rst = 0; #5;
        // Cycle 1: EN=1, RST=0, DIN=1 -> Load 1
        clk = 1; #5; $display("ESR_CYC:1:%b", q_out);
        clk = 0; #5;
        // Cycle 2: Both RST=1 AND EN=1, DIN=1 -> RST overrides EN -> Q=0
        rst = 1; en = 1; din = 1; #5;
        clk = 1; #5; $display("ESR_CYC:2:%b", q_out);
        clk = 0; #5;
        // Cycle 3: RST=0, EN=0, DIN=1 -> Retain 0
        rst = 0; en = 0; din = 1; #5;
        clk = 1; #5; $display("ESR_CYC:3:%b", q_out);
        $finish;
    end
endmodule
    `;

    const vvp = await simulate({
        sources: ['esr.v', 'tb.v'],
        files: [{ path: 'esr.v', data: vRes.code }, { path: 'tb.v', data: tb }]
    });

    const vvpMap = new Map();
    for (const line of vvp.stdout.split('\n')) {
        if (line.startsWith('ESR_CYC:')) {
            const [, cyc, val] = line.split(':');
            vvpMap.set(cyc, parseInt(val, 10));
        }
    }

    seq.reset();
    seq.initializeDFFs();

    // Cycle 1: EN=1, RST=0, DIN=1
    g.setInputValue(din.id, 1);
    g.setInputValue(en.id, 1);
    g.setInputValue(rst.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFESR', 'Cycle 1 (EN=1, RST=0, DIN=1, load 1)', seq.getDFFState(dffesr.id).Q, vvpMap.get('1'));
    seq.clockStep();

    // Cycle 2: RST=1, EN=1, DIN=1 (Priority test)
    g.setInputValue(rst.id, 1);
    g.setInputValue(en.id, 1);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFESR', 'Cycle 2 (RST=1 dominates EN=1, reset 0)', seq.getDFFState(dffesr.id).Q, vvpMap.get('2'));
    seq.clockStep();

    // Cycle 3: RST=0, EN=0, DIN=1 (Retain 0)
    g.setInputValue(rst.id, 0);
    g.setInputValue(en.id, 0);
    sim.evaluate();
    seq.clockStep();
    assertDifferential('Native DFFESR', 'Cycle 3 (RST=0, EN=0, hold 0)', seq.getDFFState(dffesr.id).Q, vvpMap.get('3'));

    console.log(`  ✓ Native DFFESR priority behavior identical between JS and Verilog simulation.`);
}

console.log("\n================================================================================");
console.log(`   Differential Summary: ${passedTests}/${totalTests} Checks PASSED, ${mismatches.length} Mismatches`);
console.log("================================================================================");

if (mismatches.length > 0) {
    console.error("\nMismatches detail:");
    console.table(mismatches);
    process.exit(1);
}
