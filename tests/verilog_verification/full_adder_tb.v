`timescale 1ns / 1ps

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
