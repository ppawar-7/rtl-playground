/**
 * generate_advanced_verification_suites.js — Generates synthesizable Verilog and
 * self-checking testbenches for all 6 Advanced RTL Lab benchmark modules.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AdvancedVerilogGenerator } from '../../advanced-lab/engine/advanced_verilog.js';
import { FSMPresets } from '../../advanced-lab/engine/fsm_engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Ripple-Carry Adder (4-bit)
const rcaCode = AdvancedVerilogGenerator.generateRippleCarryAdder({ width: 4, moduleName: 'adv_rca' });
const rcaTb = `\`timescale 1ns/1ps

module adv_rca_tb;
    reg  [3:0] a, b;
    reg        cin;
    wire [3:0] sum;
    wire       cout;

    adv_rca #(.WIDTH(4)) uut (
        .a(a), .b(b), .cin(cin),
        .sum(sum), .cout(cout)
    );

    initial begin
        // Test 1: 0 + 0, cin=0
        a = 4'd0; b = 4'd0; cin = 1'b0; #10;
        if (sum !== 4'd0 || cout !== 1'b0) $fatal(1, "RCA FAIL 0+0");
        $display("PASS: 0 + 0 = %d, cout = %b", sum, cout);

        // Test 2: 5 + 3 = 8, cout=0
        a = 4'd5; b = 4'd3; cin = 1'b0; #10;
        if (sum !== 4'd8 || cout !== 1'b0) $fatal(1, "RCA FAIL 5+3");
        $display("PASS: 5 + 3 = %d, cout = %b", sum, cout);

        // Test 3: 7 + 8 = 15, cout=0
        a = 4'd7; b = 4'd8; cin = 1'b0; #10;
        if (sum !== 4'd15 || cout !== 1'b0) $fatal(1, "RCA FAIL 7+8");
        $display("PASS: 7 + 8 = %d, cout = %b", sum, cout);

        // Test 4: 15 + 1 = 0, cout=1 (Carry propagation through all 4 stages)
        a = 4'd15; b = 4'd1; cin = 1'b0; #10;
        if (sum !== 4'd0 || cout !== 1'b1) $fatal(1, "RCA FAIL 15+1");
        $display("PASS: 15 + 1 = %d, cout = %b (Full ripple rollover)", sum, cout);

        // Test 5: 15 + 15 + cin(1) = 31 -> sum=15, cout=1
        a = 4'd15; b = 4'd15; cin = 1'b1; #10;
        if (sum !== 4'd15 || cout !== 1'b1) $fatal(1, "RCA FAIL 15+15+1");
        $display("PASS: 15 + 15 + 1 = %d, cout = %b (Max addition with carry)", sum, cout);

        $display("ADVANCED RIPPLE-CARRY ADDER FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

// 2. Educational ALU (4-bit)
const aluCode = AdvancedVerilogGenerator.generateALU({ width: 4, moduleName: 'adv_alu' });
const aluTb = `\`timescale 1ns/1ps

module adv_alu_tb;
    reg  [3:0] a, b;
    reg  [3:0] opcode;
    reg        cin;
    wire [3:0] result;
    wire       flag_z, flag_c, flag_v, flag_n;

    adv_alu #(.WIDTH(4)) uut (
        .a(a), .b(b), .opcode(opcode), .cin(cin),
        .result(result), .flag_z(flag_z), .flag_c(flag_c), .flag_v(flag_v), .flag_n(flag_n)
    );

    initial begin
        // OP_ADD: 3 + 4 = 7
        opcode = 4'b0000; a = 4'd3; b = 4'd4; cin = 1'b0; #10;
        if (result !== 4'd7 || flag_z !== 1'b0 || flag_n !== 1'b0) $fatal(1, "ALU ADD fail");
        $display("PASS: ALU ADD: 3 + 4 = %d (Z=%b, C=%b, V=%b, N=%b)", result, flag_z, flag_c, flag_v, flag_n);

        // OP_ADD signed overflow: 7 + 1 = 8 (0111 + 0001 = 1000, overflow into negative)
        a = 4'd7; b = 4'd1; cin = 1'b0; #10;
        if (result !== 4'd8 || flag_v !== 1'b1 || flag_n !== 1'b1) $fatal(1, "ALU Overflow fail");
        $display("PASS: ALU ADD Overflow: 7 + 1 = 8 (V=%b, N=%b signed overflow confirmed)", flag_v, flag_n);

        // OP_SUB: 9 - 4 = 5
        opcode = 4'b0001; a = 4'd9; b = 4'd4; cin = 1'b0; #10;
        if (result !== 4'd5 || flag_z !== 1'b0) $fatal(1, "ALU SUB fail");
        $display("PASS: ALU SUB: 9 - 4 = %d", result);

        // OP_SUB producing Zero: 5 - 5 = 0
        a = 4'd5; b = 4'd5; cin = 1'b0; #10;
        if (result !== 4'd0 || flag_z !== 1'b1) $fatal(1, "ALU Zero flag fail");
        $display("PASS: ALU SUB Zero Flag: 5 - 5 = 0 (Z=%b)", flag_z);

        // OP_AND: 4'b1100 & 4'b1010 = 4'b1000
        opcode = 4'b0010; a = 4'b1100; b = 4'b1010; #10;
        if (result !== 4'b1000) $fatal(1, "ALU AND fail");
        $display("PASS: ALU AND: %b & %b = %b", a, b, result);

        // OP_OR: 4'b1100 | 4'b0011 = 4'b1111
        opcode = 4'b0011; a = 4'b1100; b = 4'b0011; #10;
        if (result !== 4'b1111) $fatal(1, "ALU OR fail");
        $display("PASS: ALU OR: %b | %b = %b", a, b, result);

        // OP_XOR: 4'b1100 ^ 4'b1010 = 4'b0110
        opcode = 4'b0100; a = 4'b1100; b = 4'b1010; #10;
        if (result !== 4'b0110) $fatal(1, "ALU XOR fail");
        $display("PASS: ALU XOR: %b ^ %b = %b", a, b, result);

        // OP_SHL: 4'b1010 << 1 = 4'b0100, flag_c = 1 (shifted out MSB)
        opcode = 4'b0110; a = 4'b1010; #10;
        if (result !== 4'b0100 || flag_c !== 1'b1) $fatal(1, "ALU SHL fail");
        $display("PASS: ALU SHL: 1010 << 1 = %b, C=%b", result, flag_c);

        $display("ADVANCED ALU ALL OPERATIONS AND FLAGS FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

// 3. Multi-Bit Register (4-bit with Enable and Sync Reset)
const regCode = AdvancedVerilogGenerator.generateRegister({ width: 4, moduleName: 'adv_reg' });
const regTb = `\`timescale 1ns/1ps

module adv_reg_tb;
    reg        clk, rst, en;
    reg  [3:0] d;
    wire [3:0] q;

    adv_reg #(.WIDTH(4)) uut (
        .clk(clk), .rst(rst), .en(en), .d(d), .q(q)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; en = 0; d = 4'h0;
        #12; // Clock edge 1: Synchronous Reset to 0
        rst = 0;
        if (q !== 4'h0) $fatal(1, "REG reset failed");
        $display("PASS: Register reset to 0: q = %h", q);

        // Load 4'hA with en=1
        en = 1; d = 4'hA; #10;
        if (q !== 4'hA) $fatal(1, "REG load 4'hA failed");
        $display("PASS: Register loaded data on posedge: q = %h", q);

        // Hold state with en=0, d=4'h5
        en = 0; d = 4'h5; #10;
        if (q !== 4'hA) $fatal(1, "REG retention failed");
        $display("PASS: Register held state with en=0: q = %h", q);

        // Reset priority over enable: rst=1, en=1, d=4'hF -> q becomes 0
        rst = 1; en = 1; d = 4'hF; #10;
        if (q !== 4'h0) $fatal(1, "REG reset priority failed");
        $display("PASS: Synchronous reset override verified: q = %h", q);

        $display("ADVANCED MULTI-BIT REGISTER FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

// 4. Modulo Counter (4-bit Modulo-16)
const counterCode = AdvancedVerilogGenerator.generateCounter({ width: 4, maxCount: 15, moduleName: 'adv_counter' });
const counterTb = `\`timescale 1ns/1ps

module adv_counter_tb;
    reg        clk, rst, en, up_down;
    wire [3:0] count;
    wire       terminal_count;

    adv_counter #(.WIDTH(4), .MODULO(16)) uut (
        .clk(clk), .rst(rst), .en(en), .up_down(up_down),
        .count(count), .terminal_count(terminal_count)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; en = 1; up_down = 1;
        #12; // Posedge 1: Reset to 0
        rst = 0;
        if (count !== 4'd0 || terminal_count !== 1'b0) $fatal(1, "Counter reset failed");
        $display("PASS: Counter reset to 0: count = %d, tc = %b", count, terminal_count);

        // Count up 5 cycles -> count = 5
        repeat (5) #10;
        if (count !== 4'd5) $fatal(1, "Counter count up failed");
        $display("PASS: Counter reached count = %d", count);

        // Count up remaining 10 cycles -> count = 15 (TC asserted)
        repeat (10) #10;
        if (count !== 4'd15 || terminal_count !== 1'b1) $fatal(1, "Counter TC failed");
        $display("PASS: Terminal count asserted at max modulus: count = %d, tc = %b", count, terminal_count);

        // Rollover to 0 on next posedge
        #10;
        if (count !== 4'd0 || terminal_count !== 1'b0) $fatal(1, "Counter rollover failed");
        $display("PASS: Modulo counter rollover to 0 verified: count = %d", count);

        // Count down 1 cycle -> wraps to 15
        up_down = 0; #10;
        if (count !== 4'd15) $fatal(1, "Counter down rollover failed");
        $display("PASS: Down-counting underflow rollover to 15 verified: count = %d", count);

        $display("ADVANCED MODULO COUNTER FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

// 5. Universal Shift Register (4-bit)
const shiftCode = AdvancedVerilogGenerator.generateShiftRegister({ width: 4, moduleName: 'adv_shift' });
const shiftTb = `\`timescale 1ns/1ps

module adv_shift_tb;
    reg        clk, rst;
    reg  [1:0] mode;
    reg        sin_msb, sin_lsb;
    reg  [3:0] parallel_d;
    wire [3:0] parallel_q;
    wire       sout_lsb, sout_msb;

    adv_shift #(.WIDTH(4)) uut (
        .clk(clk), .rst(rst), .mode(mode),
        .sin_msb(sin_msb), .sin_lsb(sin_lsb),
        .parallel_d(parallel_d), .parallel_q(parallel_q),
        .sout_lsb(sout_lsb), .sout_msb(sout_msb)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; mode = 2'b00; sin_msb = 0; sin_lsb = 0; parallel_d = 4'h0;
        #12; rst = 0;

        // Parallel load 4'b1011 (mode 11)
        mode = 2'b11; parallel_d = 4'b1011; #10;
        if (parallel_q !== 4'b1011) $fatal(1, "Shift load failed");
        $display("PASS: Parallel load 4'b1011: q = %b, sout_lsb = %b, sout_msb = %b", parallel_q, sout_lsb, sout_msb);

        // Shift Right with sin_msb = 0 (mode 01) -> 4'b0101, sout_lsb was 1
        mode = 2'b01; sin_msb = 1'b0; #10;
        if (parallel_q !== 4'b0101 || sout_lsb !== 1'b1) $fatal(1, "Shift right fail");
        $display("PASS: Shift right (sin=0): q = %b, sout_lsb = %b", parallel_q, sout_lsb);

        // Shift Right with sin_msb = 1 -> 4'b1010
        sin_msb = 1'b1; #10;
        if (parallel_q !== 4'b1010) $fatal(1, "Shift right with 1 fail");
        $display("PASS: Shift right (sin=1): q = %b", parallel_q);

        // Shift Left with sin_lsb = 1 (mode 10) -> 4'b0101
        mode = 2'b10; sin_lsb = 1'b1; #10;
        if (parallel_q !== 4'b0101) $fatal(1, "Shift left fail");
        $display("PASS: Shift left (sin=1): q = %b", parallel_q);

        // Hold mode (mode 00)
        mode = 2'b00; #10;
        if (parallel_q !== 4'b0101) $fatal(1, "Shift hold fail");
        $display("PASS: Shift register held state: q = %b", parallel_q);

        $display("ADVANCED UNIVERSAL SHIFT REGISTER FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

// 6. Finite State Machine (Traffic Light Controller)
const fsmModel = FSMPresets.trafficLight();
const fsmCode = AdvancedVerilogGenerator.generateFSM(fsmModel, 'adv_fsm');
const fsmTb = `\`timescale 1ns/1ps

module adv_fsm_tb;
    reg  clk, rst, timer;
    wire light_g, light_y, light_r;

    adv_fsm uut (
        .clk(clk), .rst(rst), .timer(timer),
        .light_g(light_g), .light_y(light_y), .light_r(light_r)
    );

    always #5 clk = ~clk;

    initial begin
        clk = 0; rst = 1; timer = 0;
        #12; // Posedge 1: Reset to STATE_RED
        rst = 0;
        if (light_r !== 1'b1 || light_g !== 1'b0 || light_y !== 1'b0) $fatal(1, "FSM reset failed");
        $display("PASS: FSM Reset to RED: R=%b, Y=%b, G=%b", light_r, light_y, light_g);

        // Timer=1 on RED -> Transition to GREEN
        timer = 1; #10;
        if (light_g !== 1'b1 || light_r !== 1'b0 || light_y !== 1'b0) $fatal(1, "FSM RED->GREEN fail");
        $display("PASS: FSM Transition RED -> GREEN (timer=1): G=%b", light_g);

        // Timer=0 on GREEN -> Hold GREEN
        timer = 0; #10;
        if (light_g !== 1'b1) $fatal(1, "FSM GREEN hold fail");
        $display("PASS: FSM GREEN held state (timer=0): G=%b", light_g);

        // Timer=1 on GREEN -> Transition to YELLOW
        timer = 1; #10;
        if (light_y !== 1'b1 || light_g !== 1'b0) $fatal(1, "FSM GREEN->YELLOW fail");
        $display("PASS: FSM Transition GREEN -> YELLOW (timer=1): Y=%b", light_y);

        // Timer=1 on YELLOW -> Transition to RED
        timer = 1; #10;
        if (light_r !== 1'b1 || light_y !== 1'b0) $fatal(1, "FSM YELLOW->RED fail");
        $display("PASS: FSM Transition YELLOW -> RED (timer=1): R=%b", light_r);

        $display("ADVANCED FSM TRAFFIC LIGHT CONTROLLER FULLY VERIFIED.");
        $finish;
    end
endmodule
`;

const files = [
    { name: 'adv_rca.v', code: rcaCode },
    { name: 'adv_rca_tb.v', code: rcaTb },
    { name: 'adv_alu.v', code: aluCode },
    { name: 'adv_alu_tb.v', code: aluTb },
    { name: 'adv_reg.v', code: regCode },
    { name: 'adv_reg_tb.v', code: regTb },
    { name: 'adv_counter.v', code: counterCode },
    { name: 'adv_counter_tb.v', code: counterTb },
    { name: 'adv_shift.v', code: shiftCode },
    { name: 'adv_shift_tb.v', code: shiftTb },
    { name: 'adv_fsm.v', code: fsmCode },
    { name: 'adv_fsm_tb.v', code: fsmTb }
];

for (const f of files) {
    const p = resolve(__dirname, f.name);
    writeFileSync(p, f.code, 'utf8');
    console.log(`Generated: ${f.name}`);
}

console.log("All 6 Advanced HDL verification suites generated successfully.");
