`timescale 1ns / 1ps

module shift_reg_tb;
    reg clk;
    reg d_in;
    wire q1;
    wire q2;
    integer errors = 0;

    shift_reg_module uut (
        .clk(clk),
        .d_in(d_in),
        .q1(q1),
        .q2(q2)
    );

    always #5 clk = ~clk;

    initial begin
        $display("--- Starting Shift Register Testbench ---");
        clk = 0;
        d_in = 0;
        #12;

        // Cycle 1: Shift in 1
        d_in = 1;
        #10; // Posedge 1
        // DFF1 gets 1, DFF2 gets pre-edge DFF1 (0)
        if (q1 !== 1 || q2 !== 0) begin
            $display("ERROR at Cycle 1: expected q1=1, q2=0; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 1: q1=1, q2=0 (nonblocking shift confirmed)");
        end

        // Cycle 2: Shift in 0
        d_in = 0;
        #10; // Posedge 2
        // DFF1 gets 0, DFF2 gets previous DFF1 (1)
        if (q1 !== 0 || q2 !== 1) begin
            $display("ERROR at Cycle 2: expected q1=0, q2=1; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 2: q1=0, q2=1 (1 shifted into stage 2)");
        end

        // Cycle 3: Shift in 0
        d_in = 0;
        #10; // Posedge 3
        if (q1 !== 0 || q2 !== 0) begin
            $display("ERROR at Cycle 3: expected q1=0, q2=0; got q1=%b, q2=%b", q1, q2);
            errors = errors + 1;
        end else begin
            $display("PASS Cycle 3: q1=0, q2=0 (1 shifted out)");
        end

        if (errors == 0) begin
            $display("2-STAGE SHIFT REGISTER CYCLE-ACCURATE TIMING VERIFIED.");
        end else begin
            $display("SHIFT REGISTER FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
