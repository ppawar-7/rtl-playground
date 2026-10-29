`timescale 1ns/1ps

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
