`timescale 1ns / 1ps

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
