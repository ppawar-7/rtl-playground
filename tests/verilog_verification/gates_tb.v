`timescale 1ns / 1ps

module gates_tb;
    reg a;
    reg b;
    wire y_and;
    wire y_or;
    wire y_xor;
    wire y_nand;
    wire y_nor;
    wire y_not;

    integer errors = 0;

    gates_module uut (
        .a(a),
        .b(b),
        .y_and(y_and),
        .y_or(y_or),
        .y_xor(y_xor),
        .y_nand(y_nand),
        .y_nor(y_nor),
        .y_not(y_not)
    );

    initial begin
        $display("--- Starting Gates Testbench ---");
        
        // Vectors: a, b
        a = 0; b = 0; #10;
        check(0, 0, 0, 1, 1, 1, "A=0, B=0");

        a = 0; b = 1; #10;
        check(0, 1, 1, 1, 0, 1, "A=0, B=1");

        a = 1; b = 0; #10;
        check(0, 1, 1, 1, 0, 0, "A=1, B=0");

        a = 1; b = 1; #10;
        check(1, 1, 0, 0, 0, 0, "A=1, B=1");

        if (errors == 0) begin
            $display("ALL 4 TRUTH TABLE COMBINATIONS PASSED FOR ALL GATES.");
        end else begin
            $display("GATES TESTBENCH FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end

    task check;
        input exp_and, exp_or, exp_xor, exp_nand, exp_nor, exp_not;
        input [127:0] label;
        begin
            if (y_and !== exp_and || y_or !== exp_or || y_xor !== exp_xor ||
                y_nand !== exp_nand || y_nor !== exp_nor || y_not !== exp_not) begin
                $display("ERROR at %s: got and=%b or=%b xor=%b nand=%b nor=%b not=%b",
                         label, y_and, y_or, y_xor, y_nand, y_nor, y_not);
                errors = errors + 1;
            end else begin
                $display("PASS at %s: and=%b or=%b xor=%b nand=%b nor=%b not=%b",
                         label, y_and, y_or, y_xor, y_nand, y_nor, y_not);
            end
        end
    endtask
endmodule
