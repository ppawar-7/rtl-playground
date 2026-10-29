`timescale 1ns / 1ps

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
