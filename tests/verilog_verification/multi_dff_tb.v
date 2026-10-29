`timescale 1ns / 1ps

module multi_dff_tb;
    reg clk;
    reg d0;
    reg d1;
    wire q0;
    wire q1;
    integer errors = 0;

    multi_dff_module uut (
        .clk(clk),
        .d0(d0),
        .d1(d1),
        .q0(q0),
        .q1(q1)
    );

    always #5 clk = ~clk;

    initial begin
        $display("--- Starting Multi-DFF Shared Clock Testbench ---");
        clk = 0;
        d0 = 0;
        d1 = 0;
        #12;

        // Apply distinct inputs simultaneously
        d0 = 1;
        d1 = 0;
        #10;
        if (q0 !== 1 || q1 !== 0) begin
            $display("ERROR: expected q0=1, q1=0; got q0=%b, q1=%b", q0, q1);
            errors = errors + 1;
        end else begin
            $display("PASS: q0=1, q1=0 on shared clock edge");
        end

        d0 = 0;
        d1 = 1;
        #10;
        if (q0 !== 0 || q1 !== 1) begin
            $display("ERROR: expected q0=0, q1=1; got q0=%b, q1=%b", q0, q1);
            errors = errors + 1;
        end else begin
            $display("PASS: q0=0, q1=1 on shared clock edge");
        end

        if (errors == 0) begin
            $display("MULTIPLE FLIP-FLOPS ON SHARED CLOCK VERIFIED.");
        end else begin
            $display("MULTI-DFF FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
