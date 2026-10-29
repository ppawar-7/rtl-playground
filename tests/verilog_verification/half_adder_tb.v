`timescale 1ns / 1ps

module half_adder_tb;
    reg a;
    reg b;
    wire sum;
    wire carry;
    integer errors = 0;

    half_adder_module uut (
        .a(a),
        .b(b),
        .sum(sum),
        .carry(carry)
    );

    initial begin
        $display("--- Starting Half Adder Testbench ---");

        a = 0; b = 0; #10;
        check(0, 0, "0+0=0");

        a = 0; b = 1; #10;
        check(1, 0, "0+1=1");

        a = 1; b = 0; #10;
        check(1, 0, "1+0=1");

        a = 1; b = 1; #10;
        check(0, 1, "1+1=2 (sum=0, carry=1)");

        if (errors == 0) begin
            $display("HALF ADDER TRUTH TABLE FULLY VERIFIED.");
        end else begin
            $display("HALF ADDER FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end

    task check;
        input exp_sum, exp_carry;
        input [127:0] label;
        begin
            if (sum !== exp_sum || carry !== exp_carry) begin
                $display("ERROR at %s: expected sum=%b, carry=%b; got sum=%b, carry=%b",
                         label, exp_sum, exp_carry, sum, carry);
                errors = errors + 1;
            end else begin
                $display("PASS at %s: sum=%b, carry=%b", label, sum, carry);
            end
        end
    endtask
endmodule
