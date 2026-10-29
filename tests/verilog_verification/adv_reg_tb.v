`timescale 1ns/1ps

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
