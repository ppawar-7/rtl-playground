`timescale 1ns / 1ps

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
