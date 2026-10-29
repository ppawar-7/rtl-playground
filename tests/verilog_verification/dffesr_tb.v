`timescale 1ns / 1ps

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
