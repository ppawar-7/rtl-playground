`timescale 1ns / 1ps

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
