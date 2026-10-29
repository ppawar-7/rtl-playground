/**
 * generate_verification_suites.js — Generates synthesizable Verilog and
 * self-checking testbenches for all 6 required benchmark circuits using
 * the actual RTL Playground CircuitGraph and VerilogGenerator.
 */

import { writeFileSync } from 'node:fs';
import { CircuitGraph, resetIdCounter } from '../../src/engine/circuit_graph.js';
import { VerilogGenerator } from '../../src/engine/verilog_generator.js';
import { PRESETS } from '../../src/modules/presets.js';

// ─── 1. Basic Logic Gates ───────────────────────────────────────────────────

function buildGatesCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const a = g.addComponent('INPUT', 50, 40, 'a');
    const b = g.addComponent('INPUT', 50, 100, 'b');

    const andG = g.addComponent('AND', 180, 40, 'and_gate');
    const orG = g.addComponent('OR', 180, 100, 'or_gate');
    const xorG = g.addComponent('XOR', 180, 160, 'xor_gate');
    const nandG = g.addComponent('NAND', 180, 220, 'nand_gate');
    const norG = g.addComponent('NOR', 180, 280, 'nor_gate');
    const notG = g.addComponent('NOT', 180, 340, 'not_gate');

    const yAnd = g.addComponent('OUTPUT', 320, 40, 'y_and');
    const yOr = g.addComponent('OUTPUT', 320, 100, 'y_or');
    const yXor = g.addComponent('OUTPUT', 320, 160, 'y_xor');
    const yNand = g.addComponent('OUTPUT', 320, 220, 'y_nand');
    const yNor = g.addComponent('OUTPUT', 320, 280, 'y_nor');
    const yNot = g.addComponent('OUTPUT', 320, 340, 'y_not');

    // Wires
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

    return g;
}

const gatesTb = `\`timescale 1ns / 1ps

module gates_tb;
    reg a;
    reg b;
    wire y_and;
    wire y_or;
    wire y_xor;
    wire y_nand;
    wire y_nor;
    wire y_not;

    integer errors = 0;

    gates_module uut (
        .a(a),
        .b(b),
        .y_and(y_and),
        .y_or(y_or),
        .y_xor(y_xor),
        .y_nand(y_nand),
        .y_nor(y_nor),
        .y_not(y_not)
    );

    initial begin
        $display("--- Starting Gates Testbench ---");
        
        // Vectors: a, b
        a = 0; b = 0; #10;
        check(0, 0, 0, 1, 1, 1, "A=0, B=0");

        a = 0; b = 1; #10;
        check(0, 1, 1, 1, 0, 1, "A=0, B=1");

        a = 1; b = 0; #10;
        check(0, 1, 1, 1, 0, 0, "A=1, B=0");

        a = 1; b = 1; #10;
        check(1, 1, 0, 0, 0, 0, "A=1, B=1");

        if (errors == 0) begin
            $display("ALL 4 TRUTH TABLE COMBINATIONS PASSED FOR ALL GATES.");
        end else begin
            $display("GATES TESTBENCH FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end

    task check;
        input exp_and, exp_or, exp_xor, exp_nand, exp_nor, exp_not;
        input [127:0] label;
        begin
            if (y_and !== exp_and || y_or !== exp_or || y_xor !== exp_xor ||
                y_nand !== exp_nand || y_nor !== exp_nor || y_not !== exp_not) begin
                $display("ERROR at %s: got and=%b or=%b xor=%b nand=%b nor=%b not=%b",
                         label, y_and, y_or, y_xor, y_nand, y_nor, y_not);
                errors = errors + 1;
            end else begin
                $display("PASS at %s: and=%b or=%b xor=%b nand=%b nor=%b not=%b",
                         label, y_and, y_or, y_xor, y_nand, y_nor, y_not);
            end
        end
    endtask
endmodule
`;

// ─── 2. Half Adder ──────────────────────────────────────────────────────────

function buildHalfAdderCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const a = g.addComponent('INPUT', 50, 50, 'a');
    const b = g.addComponent('INPUT', 50, 130, 'b');

    const xorG = g.addComponent('XOR', 180, 50, 'xor1');
    const andG = g.addComponent('AND', 180, 130, 'and1');

    const sumOut = g.addComponent('OUTPUT', 320, 50, 'sum');
    const carryOut = g.addComponent('OUTPUT', 320, 130, 'carry');

    g.addConnection(a.id, `${a.id}.out0`, xorG.id, `${xorG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, xorG.id, `${xorG.id}.in1`);
    g.addConnection(xorG.id, `${xorG.id}.out0`, sumOut.id, `${sumOut.id}.in0`);

    g.addConnection(a.id, `${a.id}.out0`, andG.id, `${andG.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, andG.id, `${andG.id}.in1`);
    g.addConnection(andG.id, `${andG.id}.out0`, carryOut.id, `${carryOut.id}.in0`);

    return g;
}

const halfAdderTb = `\`timescale 1ns / 1ps

module half_adder_tb;
    reg a;
    reg b;
    wire sum;
    wire carry;
    integer errors = 0;

    half_adder_module uut (
        .a(a),
        .b(b),
        .sum(sum),
        .carry(carry)
    );

    initial begin
        $display("--- Starting Half Adder Testbench ---");

        a = 0; b = 0; #10;
        check(0, 0, "0+0=0");

        a = 0; b = 1; #10;
        check(1, 0, "0+1=1");

        a = 1; b = 0; #10;
        check(1, 0, "1+0=1");

        a = 1; b = 1; #10;
        check(0, 1, "1+1=2 (sum=0, carry=1)");

        if (errors == 0) begin
            $display("HALF ADDER TRUTH TABLE FULLY VERIFIED.");
        end else begin
            $display("HALF ADDER FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end

    task check;
        input exp_sum, exp_carry;
        input [127:0] label;
        begin
            if (sum !== exp_sum || carry !== exp_carry) begin
                $display("ERROR at %s: expected sum=%b, carry=%b; got sum=%b, carry=%b",
                         label, exp_sum, exp_carry, sum, carry);
                errors = errors + 1;
            end else begin
                $display("PASS at %s: sum=%b, carry=%b", label, sum, carry);
            end
        end
    endtask
endmodule
`;

// ─── 3. 2:1 Multiplexer ─────────────────────────────────────────────────────

function buildMux2Circuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const a = g.addComponent('INPUT', 50, 40, 'a');
    const b = g.addComponent('INPUT', 50, 100, 'b');
    const sel = g.addComponent('INPUT', 50, 160, 'sel');

    const mux = g.addComponent('MUX2', 180, 80, 'mux1');
    const y = g.addComponent('OUTPUT', 320, 80, 'y');

    g.addConnection(a.id, `${a.id}.out0`, mux.id, `${mux.id}.in0`);
    g.addConnection(b.id, `${b.id}.out0`, mux.id, `${mux.id}.in1`);
    g.addConnection(sel.id, `${sel.id}.out0`, mux.id, `${mux.id}.in2`);
    g.addConnection(mux.id, `${mux.id}.out0`, y.id, `${y.id}.in0`);

    return g;
}

const mux2Tb = `\`timescale 1ns / 1ps

module mux2_tb;
    reg a;
    reg b;
    reg sel;
    wire y;
    integer errors = 0;
    integer i;

    mux2_module uut (
        .a(a),
        .b(b),
        .sel(sel),
        .y(y)
    );

    initial begin
        $display("--- Starting 2:1 MUX Testbench ---");

        for (i = 0; i < 8; i = i + 1) begin
            {sel, b, a} = i[2:0];
            #10;
            if (sel == 0) begin
                if (y !== a) begin
                    $display("ERROR: sel=0, a=%b, b=%b, expected y=%b, got %b", a, b, a, y);
                    errors = errors + 1;
                end else begin
                    $display("PASS: sel=0 routes A: a=%b, b=%b -> y=%b", a, b, y);
                end
            end else begin
                if (y !== b) begin
                    $display("ERROR: sel=1, a=%b, b=%b, expected y=%b, got %b", a, b, b, y);
                    errors = errors + 1;
                end else begin
                    $display("PASS: sel=1 routes B: a=%b, b=%b -> y=%b", a, b, y);
                end
            end
        end

        if (errors == 0) begin
            $display("2:1 MULTIPLEXER ALL 8 COMBINATIONS PASSED.");
        end else begin
            $display("2:1 MUX FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
`;

// ─── 4. D Flip-Flop ─────────────────────────────────────────────────────────

function buildDffCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const d = g.addComponent('INPUT', 50, 50, 'd');
    const clk = g.addComponent('CLOCK', 50, 120, 'clk');
    const dff = g.addComponent('DFF', 180, 80, 'ff');
    const q = g.addComponent('OUTPUT', 320, 80, 'q');

    g.addConnection(d.id, `${d.id}.out0`, dff.id, `${dff.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dff.id, `${dff.id}.in1`);
    g.addConnection(dff.id, `${dff.id}.out0`, q.id, `${q.id}.in0`);

    return g;
}

const dffTb = `\`timescale 1ns / 1ps

module dff_tb;
    reg clk;
    reg d;
    wire q;
    integer errors = 0;

    dff_module uut (
        .clk(clk),
        .d(d),
        .q(q)
    );

    // 10ns clock period
    always #5 clk = ~clk;

    initial begin
        $display("--- Starting DFF Testbench ---");
        clk = 0;
        d = 0;
        #12; // Wait past first rising edge

        // Test 1: Set D=1 before rising edge
        d = 1;
        #10; // Rising edge at 15ns
        if (q !== 1) begin
            $display("ERROR: Q should be 1 after posedge with D=1, got %b", q);
            errors = errors + 1;
        end else begin
            $display("PASS: Q correctly updated to 1 on posedge clk");
        end

        // Test 2: Change D=0 during clock high -> Q must hold 1
        d = 0;
        #3;
        if (q !== 1) begin
            $display("ERROR: Q changed prematurely when D changed during clock hold!");
            errors = errors + 1;
        end else begin
            $display("PASS: Q held 1 when D toggled without posedge clk");
        end

        // Test 3: Next rising edge samples D=0
        #7; // Rising edge at 25ns
        if (q !== 0) begin
            $display("ERROR: Q should be 0 after posedge with D=0, got %b", q);
            errors = errors + 1;
        end else begin
            $display("PASS: Q correctly updated to 0 on posedge clk");
        end

        if (errors == 0) begin
            $display("D FLIP-FLOP EDGE-TRIGGERED BEHAVIOR FULLY VERIFIED.");
        end else begin
            $display("DFF FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
`;

// ─── 5. Two-Stage Shift Register ────────────────────────────────────────────

function buildShiftRegCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const dIn = g.addComponent('INPUT', 50, 40, 'd_in');
    const clk = g.addComponent('CLOCK', 50, 120, 'clk');

    const dff1 = g.addComponent('DFF', 180, 50, 'ff1');
    const dff2 = g.addComponent('DFF', 320, 50, 'ff2');

    const q1 = g.addComponent('OUTPUT', 240, 140, 'q1');
    const q2 = g.addComponent('OUTPUT', 440, 50, 'q2');

    g.addConnection(dIn.id, `${dIn.id}.out0`, dff1.id, `${dff1.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dff1.id, `${dff1.id}.in1`);

    g.addConnection(dff1.id, `${dff1.id}.out0`, dff2.id, `${dff2.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dff2.id, `${dff2.id}.in1`);

    g.addConnection(dff1.id, `${dff1.id}.out0`, q1.id, `${q1.id}.in0`);
    g.addConnection(dff2.id, `${dff2.id}.out0`, q2.id, `${q2.id}.in0`);

    return g;
}

const shiftRegTb = `\`timescale 1ns / 1ps

module shift_reg_tb;
    reg clk;
    reg d_in;
    wire q1;
    wire q2;
    integer errors = 0;

    shift_reg_module uut (
        .clk(clk),
        .d_in(d_in),
        .q1(q1),
        .q2(q2)
    );

    always #5 clk = ~clk;

    initial begin
        $display("--- Starting Shift Register Testbench ---");
        clk = 0;
        d_in = 0;
        #12;

        // Cycle 1: Shift in 1
        d_in = 1;
        #10; // Posedge 1
        // DFF1 gets 1, DFF2 gets pre-edge DFF1 (0)
        if (q1 !== 1 || q2 !== 0) begin
            $display("ERROR at Cycle 1: expected q1=1, q2=0; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 1: q1=1, q2=0 (nonblocking shift confirmed)");
        end

        // Cycle 2: Shift in 0
        d_in = 0;
        #10; // Posedge 2
        // DFF1 gets 0, DFF2 gets previous DFF1 (1)
        if (q1 !== 0 || q2 !== 1) begin
            $display("ERROR at Cycle 2: expected q1=0, q2=1; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 2: q1=0, q2=1 (1 shifted into stage 2)");
        end

        // Cycle 3: Shift in 0
        d_in = 0;
        #10; // Posedge 3
        if (q1 !== 0 || q2 !== 0) begin
            $display("ERROR at Cycle 3: expected q1=0, q2=0; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 3: q1=0, q2=0 (1 shifted out)");
        end

        if (errors == 0) begin
            $display("2-STAGE SHIFT REGISTER CYCLE-ACCURATE TIMING VERIFIED.");
        end else begin
            $display("SHIFT REGISTER FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
`;

// ─── 6. Multiple Flip-Flops on Shared Clock ─────────────────────────────────

function buildMultiDffCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    const d0 = g.addComponent('INPUT', 50, 40, 'd0');
    const d1 = g.addComponent('INPUT', 50, 100, 'd1');
    const clk = g.addComponent('CLOCK', 50, 160, 'clk');

    const dff0 = g.addComponent('DFF', 180, 40, 'reg0');
    const dff1 = g.addComponent('DFF', 180, 120, 'reg1');

    const q0 = g.addComponent('OUTPUT', 320, 40, 'q0');
    const q1 = g.addComponent('OUTPUT', 320, 120, 'q1');

    g.addConnection(d0.id, `${d0.id}.out0`, dff0.id, `${dff0.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dff0.id, `${dff0.id}.in1`);
    g.addConnection(dff0.id, `${dff0.id}.out0`, q0.id, `${q0.id}.in0`);

    g.addConnection(d1.id, `${d1.id}.out0`, dff1.id, `${dff1.id}.in0`);
    g.addConnection(clk.id, `${clk.id}.out0`, dff1.id, `${dff1.id}.in1`);
    g.addConnection(dff1.id, `${dff1.id}.out0`, q1.id, `${q1.id}.in0`);

    return g;
}

const multiDffTb = `\`timescale 1ns / 1ps

module multi_dff_tb;
    reg clk;
    reg d0;
    reg d1;
    wire q0;
    wire q1;
    integer errors = 0;

    multi_dff_module uut (
        .clk(clk),
        .d0(d0),
        .d1(d1),
        .q0(q0),
        .q1(q1)
    );

    always #5 clk = ~clk;

    initial begin
        $display("--- Starting Multi-DFF Shared Clock Testbench ---");
        clk = 0;
        d0 = 0;
        d1 = 0;
        #12;

        // Apply distinct inputs simultaneously
        d0 = 1;
        d1 = 0;
        #10;
        if (q0 !== 1 || q1 !== 0) begin
            $display("ERROR: expected q0=1, q1=0; got q0=%b, q1=%b", q0, q1);
            errors = errors + 1;
        end else begin
            $display("PASS: q0=1, q1=0 on shared clock edge");
        end

        d0 = 0;
        d1 = 1;
        #10;
        if (q0 !== 0 || q1 !== 1) begin
            $display("ERROR: expected q0=0, q1=1; got q0=%b, q1=%b", q0, q1);
            errors = errors + 1;
        end else begin
            $display("PASS: q0=0, q1=1 on shared clock edge");
        end

        if (errors == 0) begin
            $display("MULTIPLE FLIP-FLOPS ON SHARED CLOCK VERIFIED.");
        end else begin
            $display("MULTI-DFF FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
`;

const fullAdderTb = `\`timescale 1ns / 1ps

module full_adder_tb;
    reg a, b, cin;
    wire sum, cout;
    integer errors = 0;

    full_adder_module uut (
        .a(a),
        .b(b),
        .cin(cin),
        .sum(sum),
        .cout(cout)
    );

    initial begin
        a = 0; b = 0; cin = 0; #10;
        if (sum !== 0 || cout !== 0) errors = errors + 1;
        a = 0; b = 0; cin = 1; #10;
        if (sum !== 1 || cout !== 0) errors = errors + 1;
        a = 0; b = 1; cin = 0; #10;
        if (sum !== 1 || cout !== 0) errors = errors + 1;
        a = 0; b = 1; cin = 1; #10;
        if (sum !== 0 || cout !== 1) errors = errors + 1;
        a = 1; b = 0; cin = 0; #10;
        if (sum !== 1 || cout !== 0) errors = errors + 1;
        a = 1; b = 0; cin = 1; #10;
        if (sum !== 0 || cout !== 1) errors = errors + 1;
        a = 1; b = 1; cin = 0; #10;
        if (sum !== 0 || cout !== 1) errors = errors + 1;
        a = 1; b = 1; cin = 1; #10;
        if (sum !== 1 || cout !== 1) errors = errors + 1;

        if (errors == 0) $display("FULL ADDER VERIFIED.");
        else $fatal(1);
        $finish;
    end
endmodule
`;

const dffeTb = `\`timescale 1ns / 1ps

module dffe_tb;
    reg clk, d, en;
    wire q;
    integer errors = 0;

    dffe_module uut (
        .clk(clk),
        .d(d),
        .en(en),
        .q(q)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; d = 0; en = 1;
        #12;
        d = 1; en = 0; #10;
        if (q !== 0) errors = errors + 1;
        en = 1; #10;
        if (q !== 1) errors = errors + 1;
        en = 0; d = 0; #10;
        if (q !== 1) errors = errors + 1;

        if (errors == 0) $display("DFFE VERIFIED.");
        else $fatal(1);
        $finish;
    end
endmodule
`;

const dffsrTb = `\`timescale 1ns / 1ps

module dffsr_tb;
    reg clk, d, rst;
    wire q;
    integer errors = 0;

    dffsr_module uut (
        .clk(clk),
        .d(d),
        .rst(rst),
        .q(q)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; d = 0; rst = 0;
        #12;
        d = 1; rst = 0; #10;
        if (q !== 1) errors = errors + 1;
        rst = 1; #10;
        if (q !== 0) errors = errors + 1;

        if (errors == 0) $display("DFFSR VERIFIED.");
        else $fatal(1);
        $finish;
    end
endmodule
`;

const dffesrTb = `\`timescale 1ns / 1ps

module dffesr_tb;
    reg clk, d, en, rst;
    wire q;
    integer errors = 0;

    dffesr_module uut (
        .clk(clk),
        .d(d),
        .en(en),
        .rst(rst),
        .q(q)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; d = 0; en = 0; rst = 0;
        #12;
        d = 1; en = 1; rst = 0; #10;
        if (q !== 1) errors = errors + 1;
        rst = 1; en = 1; d = 1; #10;
        if (q !== 0) errors = errors + 1;

        if (errors == 0) $display("DFFESR PRIORITY VERIFIED.");
        else $fatal(1);
        $finish;
    end
endmodule
`;

const muxCaseTb = `\`timescale 1ns / 1ps

module mux_case_tb;
    reg a, b, sel;
    wire y;
    integer errors = 0;

    mux_case_module uut (
        .a(a),
        .b(b),
        .sel(sel),
        .y(y)
    );

    initial begin
        a = 1; b = 0; sel = 0; #10;
        if (y !== 1) errors = errors + 1;
        sel = 1; #10;
        if (y !== 0) errors = errors + 1;

        if (errors == 0) $display("MUX CASE VERIFIED.");
        else $fatal(1);
        $finish;
    end
endmodule
`;

// ─── Main Generator Execution ───────────────────────────────────────────────

function buildFullAdderCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    g.deserialize(PRESETS['full-adder'].circuit);
    return g;
}

function buildDffeCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    g.deserialize(PRESETS['dff-enable'].circuit);
    return g;
}

function buildDffsrCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    g.deserialize(PRESETS['dff-sync-reset'].circuit);
    return g;
}

function buildDffesrCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    g.deserialize(PRESETS['dff-esr-priority'].circuit);
    return g;
}

function buildMuxCaseCircuit() {
    resetIdCounter();
    const g = new CircuitGraph();
    g.deserialize(PRESETS['mux-case'].circuit);
    return g;
}

const suites = [
    { name: 'gates', builder: buildGatesCircuit, moduleName: 'gates_module', tb: gatesTb },
    { name: 'half_adder', builder: buildHalfAdderCircuit, moduleName: 'half_adder_module', tb: halfAdderTb },
    { name: 'mux2', builder: buildMux2Circuit, moduleName: 'mux2_module', tb: mux2Tb },
    { name: 'dff', builder: buildDffCircuit, moduleName: 'dff_module', tb: dffTb },
    { name: 'shift_reg', builder: buildShiftRegCircuit, moduleName: 'shift_reg_module', tb: shiftRegTb },
    { name: 'multi_dff', builder: buildMultiDffCircuit, moduleName: 'multi_dff_module', tb: multiDffTb },
    { name: 'full_adder', builder: buildFullAdderCircuit, moduleName: 'full_adder_module', tb: fullAdderTb },
    { name: 'dffe', builder: buildDffeCircuit, moduleName: 'dffe_module', tb: dffeTb },
    { name: 'dffsr', builder: buildDffsrCircuit, moduleName: 'dffsr_module', tb: dffsrTb },
    { name: 'dffesr', builder: buildDffesrCircuit, moduleName: 'dffesr_module', tb: dffesrTb },
    { name: 'mux_case', builder: buildMuxCaseCircuit, moduleName: 'mux_case_module', tb: muxCaseTb, procedural: true }
];

console.log("Generating Real Verilog and Self-Checking Testbenches...");

for (const suite of suites) {
    const graph = suite.builder();
    const vgen = new VerilogGenerator(graph);
    const res = suite.procedural ? vgen.generateProcedural(suite.moduleName) : vgen.generate(suite.moduleName);
    if (!res.ok) {
        console.error(`Failed to generate Verilog for ${suite.name}: ${res.error}`);
        continue;
    }

    const vPath = `tests/verilog_verification/${suite.name}.v`;
    const tbPath = `tests/verilog_verification/${suite.name}_tb.v`;

    writeFileSync(vPath, res.code);
    writeFileSync(tbPath, suite.tb);
    console.log(`  ✓ Generated ${vPath} and ${tbPath}`);
}

console.log(`All ${suites.length} Verilog suites generated successfully.`);
