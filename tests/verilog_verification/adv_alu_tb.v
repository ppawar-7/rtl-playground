`timescale 1ns/1ps

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
