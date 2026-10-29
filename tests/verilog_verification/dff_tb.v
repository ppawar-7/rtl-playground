`timescale 1ns / 1ps

module dff_tb;
    reg clk;
    reg d;
    wire q;
    integer errors = 0;

    dff_module uut (
        .clk(clk),
        .d(d),
        .q(q)
    );

    // 10ns clock period
    always #5 clk = ~clk;

    initial begin
        $display("--- Starting DFF Testbench ---");
        clk = 0;
        d = 0;
        #12; // Wait past first rising edge

        // Test 1: Set D=1 before rising edge
        d = 1;
        #10; // Rising edge at 15ns
        if (q !== 1) begin
            $display("ERROR: Q should be 1 after posedge with D=1, got %b", q);
            errors = errors + 1;
        end else begin
            $display("PASS: Q correctly updated to 1 on posedge clk");
        end

        // Test 2: Change D=0 during clock high -> Q must hold 1
        d = 0;
        #3;
        if (q !== 1) begin
            $display("ERROR: Q changed prematurely when D changed during clock hold!");
            errors = errors + 1;
        end else begin
            $display("PASS: Q held 1 when D toggled without posedge clk");
        end

        // Test 3: Next rising edge samples D=0
        #7; // Rising edge at 25ns
        if (q !== 0) begin
            $display("ERROR: Q should be 0 after posedge with D=0, got %b", q);
            errors = errors + 1;
        end else begin
            $display("PASS: Q correctly updated to 0 on posedge clk");
        end

        if (errors == 0) begin
            $display("D FLIP-FLOP EDGE-TRIGGERED BEHAVIOR FULLY VERIFIED.");
        end else begin
            $display("DFF FAILED WITH %0d ERRORS.", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
